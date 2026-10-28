import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
export async function mountModel(host,url,root){
 let renderer,controls,observer,object,draco,disposed=false;
 const loading=root.querySelector('.model-loading');
 const dispose=()=>{disposed=true;observer?.disconnect();controls?.dispose();renderer?.setAnimationLoop(null);object?.traverse(o=>{if(o.isMesh){o.geometry.dispose();[o.material].flat().forEach(m=>{m.map?.dispose();m.dispose();});}});renderer?.dispose();renderer?.domElement.remove();};
 root.cleanupModel=dispose;
 try{
  renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0xe7eef2);host.append(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Interactive Rivaz bridge reconstruction');
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,10000);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.92;
  draco=new DRACOLoader().setDecoderPath('/vendor/three/examples/jsm/libs/draco/gltf/');
  const data=await new GLTFLoader().setDRACOLoader(draco).loadAsync(url,e=>{if(e.total&&loading)loading.textContent=`Loading model · ${Math.round(100*e.loaded/e.total)}%`;});object=data.scene;draco.dispose();
  if(disposed||!host.isConnected){dispose();return;}
  object.rotation.x=-Math.PI/2;object.updateMatrixWorld(true);let box=new THREE.Box3().setFromObject(object);object.position.sub(box.getCenter(new THREE.Vector3()));scene.add(object);box=new THREE.Box3().setFromObject(object);const radius=box.getSize(new THREE.Vector3()).length()/2;camera.near=radius/1000;camera.far=radius*100;controls.minDistance=radius*.025;controls.maxDistance=radius*9;
  let count=0;object.traverse(o=>{if(!o.isMesh)return;count+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;const material=m=>new THREE.MeshBasicMaterial({map:m.map,color:m.color,side:THREE.DoubleSide});o.material=Array.isArray(o.material)?o.material.map(material):material(o.material);});
  function resize(){const b=host.getBoundingClientRect();if(!b.width||!b.height)return;renderer.setSize(b.width,b.height);camera.aspect=b.width/b.height;camera.updateProjectionMatrix();}
  function reset(top=false){const a=Math.min(THREE.MathUtils.degToRad(camera.fov/2),Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect));const distance=radius/Math.sin(a)*.88;controls.target.set(0,0,0);camera.position.copy((top?new THREE.Vector3(0,1,.001):new THREE.Vector3(.15,1,1.05)).normalize().multiplyScalar(distance));controls.update();}
  observer=new ResizeObserver(resize);observer.observe(host);resize();reset();loading.hidden=true;root.querySelector('[data-model-status]').textContent=`${Math.round(count).toLocaleString()} triangles`;
  root.querySelectorAll('[data-model-action]').forEach(b=>{b.disabled=false;b.onclick=()=>{if(b.dataset.modelAction==='reset')reset();if(b.dataset.modelAction==='top')reset(true);if(b.dataset.modelAction==='wire'){const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);object.traverse(o=>{if(o.isMesh)[o.material].flat().forEach(m=>m.wireframe=on);});}};});
  renderer.setAnimationLoop(()=>{if(!document.hidden&&host.isConnected){controls.update();renderer.render(scene,camera);}});
 }catch(e){draco?.dispose();console.error(e);if(loading){loading.hidden=false;loading.textContent='The 3D model could not load. Try the map view or reload the page.';}}
}
