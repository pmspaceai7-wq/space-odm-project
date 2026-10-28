import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,cp,rm} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function testServer(port,label){
 const results=resolve(root,'test-results');await mkdir(results,{recursive:true});const storage=await mkdtemp(resolve(results,label+'-'));
 await cp(resolve(root,'storage/demo'),resolve(storage,'demo'),{recursive:true});
 let child,logs='';const url=`http://127.0.0.1:${port}`;
 async function start(){child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(port),DEMO_MODE:'true',PUBLIC_ORIGIN:url,STORAGE_DIR:storage},stdio:['ignore','pipe','pipe']});child.stdout.on('data',b=>logs+=b);child.stderr.on('data',b=>logs+=b);for(let i=0;i<100;i++){try{const r=await fetch(url+'/api/config');if(r.ok)return;}catch{}if(child.exitCode!==null)throw Error(logs);await new Promise(r=>setTimeout(r,100));}throw Error('Test server did not start: '+logs);}
 async function stop(){if(child&&child.exitCode===null){await new Promise(resolve=>{child.once('exit',resolve);child.kill();});}}
 try{await start();}catch(error){await stop();throw error;}return {url,storage,restart:async()=>{await stop();await start();},close:async()=>{await stop();if(!storage.startsWith(results+sep))throw Error('Unexpected test directory');await rm(storage,{recursive:true,force:true});}};
}
