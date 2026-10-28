const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,assets=path.resolve(root,'../outputs/rivaz-bridge');
const assetNames=new Set(['rivaz-3d-model.glb','rivaz-map.tif','rivaz-point-cloud.laz','processing-report.pdf','bridge-closeup.png','bridge-source.jpg','map-preview.png','processing-summary.json']);
const publicNames=new Set(['index.html','styles.css','app.js']);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.glb':'model/gltf-binary','.pdf':'application/pdf','.tif':'image/tiff','.laz':'application/octet-stream'};
http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}
 let base=root,rel=pathname.slice(1)||'index.html';
 if(pathname.startsWith('/assets/')){base=assets;rel=pathname.slice(8);if(!assetNames.has(rel)){res.writeHead(404).end();return;}}
 else if(!publicNames.has(rel)&&!rel.startsWith('node_modules/three/')){res.writeHead(404).end();return;}
 const file=path.resolve(base,rel);if(!file.startsWith(base+path.sep)){res.writeHead(403).end();return;}
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404).end('File not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});if(req.method==='HEAD'){res.end();return;}const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);});
}).listen(Number(process.env.PORT||8765),'127.0.0.1',()=>console.log(`pmspace.ai bridge workspace: http://127.0.0.1:${process.env.PORT||8765}`));
