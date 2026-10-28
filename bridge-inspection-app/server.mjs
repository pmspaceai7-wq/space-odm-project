import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {createReadStream,existsSync} from 'node:fs';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {openDatabase,verifyPassword} from './lib/db.mjs';
import {renderReport} from './lib/report.mjs';
const root=dirname(fileURLToPath(import.meta.url)),host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||8770);
const demo=process.env.DEMO_MODE!=='false';
if(demo&&!['127.0.0.1','::1','localhost'].includes(host))throw Error('Demo login is restricted to loopback. Set DEMO_MODE=false for a network deployment.');
if(!demo&&(!process.env.ADMIN_PASSWORD||!process.env.INSPECTOR_PASSWORD||process.env.ADMIN_PASSWORD.length<14||process.env.INSPECTOR_PASSWORD.length<14))throw Error('Set ADMIN_PASSWORD and INSPECTOR_PASSWORD with at least 14 characters.');
const storage=resolve(process.env.STORAGE_DIR||resolve(root,'storage'));
const db=openDatabase(resolve(storage,'inspection.sqlite'),{adminEmail:process.env.ADMIN_EMAIL||'reviewer@pmspace.local',inspectorEmail:process.env.INSPECTOR_EMAIL||'inspector@pmspace.local',adminPassword:process.env.ADMIN_PASSWORD||randomBytes(24).toString('hex'),inspectorPassword:process.env.INSPECTOR_PASSWORD||randomBytes(24).toString('hex')});
const origin=process.env.PUBLIC_ORIGIN||`http://${host}:${port}`;
const assetNames=new Set(['rivaz-3d-model.glb','rivaz-map.tif','rivaz-point-cloud.laz','processing-report.pdf','bridge-closeup.png','bridge-source.jpg','map-preview.png','processing-summary.json']);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary','.jpg':'image/jpeg','.png':'image/png','.pdf':'application/pdf','.tif':'image/tiff'};
const fail=(status,message)=>Object.assign(new Error(message),{status});
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const digest=s=>createHash('sha256').update(s).digest('hex');
async function body(req){let chunks=[],size=0;for await(const c of req){size+=c.length;if(size>65536)throw fail(413,'Request is too large.');chunks.push(c);}try{return JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{throw fail(400,'Invalid JSON.');}}
function text(v,name,max=2000){if(typeof v!=='string'||!v.trim()||v.trim().length>max)throw fail(400,`Provide a valid ${name}.`);return v.trim();}
function session(req){const cookie=req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('pm_session='))?.slice(11);if(!cookie)return null;return db.prepare('SELECT s.*,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE token=? AND expires>?').get(digest(cookie),Date.now());}
function signedIn(s){if(!s)throw fail(401,'Sign in to continue.');}
function project(s,id){signedIn(s);const p=db.prepare('SELECT p.* FROM projects p JOIN members m ON m.project_id=p.id WHERE p.id=? AND m.user_id=?').get(id,s.user_id);if(!p)throw fail(404,'Project not found.');return p;}
function requireCsrf(req,s){signedIn(s);if(req.headers['x-csrf-token']!==s.csrf)throw fail(403,'Invalid request token. Reload and try again.');}
function createSession(res,user){const token=randomBytes(32).toString('hex'),csrf=randomBytes(24).toString('hex');db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(digest(token),user.id,csrf,Date.now()+8*3600000);res.setHeader('Set-Cookie',`pm_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${process.env.COOKIE_SECURE==='true'?'; Secure':''}`);json(res,200,{user:{id:user.id,name:user.name,email:user.email,role:user.role},csrf,demo});}
function observations(id){return db.prepare('SELECT o.*,u.name author_name FROM observations o JOIN users u ON u.id=o.author_id WHERE project_id=? ORDER BY created DESC').all(id).map(o=>({...o,rect:JSON.parse(o.rect),events:db.prepare('SELECT e.action,e.comment,e.created,u.name actor_name FROM events e JOIN users u ON u.id=e.actor_id WHERE observation_id=? ORDER BY e.id').all(o.id)}));}
async function bundle(p){if(!p.bundle)return null;try{return JSON.parse(await readFile(resolve(storage,p.bundle,'processing-summary.json'),'utf8'));}catch{return null;}}
async function sendFile(req,res,file){let info;try{info=await stat(file);}catch{throw fail(404,'File not found.');}if(!info.isFile())throw fail(404,'File not found.');res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'private, no-cache'});if(req.method==='HEAD')return res.end();const stream=createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);}
const loginAttempts=new Map();
const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
 try{
  const url=new URL(req.url,origin),path=decodeURIComponent(url.pathname),method=req.method,s=session(req);
  if(!['GET','HEAD','POST'].includes(method))throw fail(405,'Method not allowed.');
  if(method==='POST'){
   if(req.headers.origin&&req.headers.origin!==origin)throw fail(403,'Request origin is not allowed.');
   if(!req.headers['content-type']?.startsWith('application/json'))throw fail(415,'Use application/json.');
  }
  if(path==='/api/config'&&method==='GET')return json(res,200,{demo,webodmUrl:process.env.WEBODM_URL||'http://localhost:8000/dashboard/'});
  if(path==='/api/demo-login'&&method==='POST'){
   if(!demo)throw fail(404,'Not found.');const data=await body(req);if(!['inspector','reviewer'].includes(data.role))throw fail(400,'Choose an available role.');return createSession(res,db.prepare('SELECT * FROM users WHERE id=?').get(data.role));
  }
  if(path==='/api/login'&&method==='POST'){
   const key=req.socket.remoteAddress,now=Date.now();for(const [ip,a]of loginAttempts)if(a.until<now)loginAttempts.delete(ip);const attempt=loginAttempts.get(key)||{count:0,until:now+600000};if(attempt.count>=10)throw fail(429,'Too many attempts. Try again in ten minutes.');const data=await body(req);const email=text(data.email,'email',254).toLowerCase();const password=text(data.password,'password',200);const user=db.prepare('SELECT * FROM users WHERE email=?').get(email);if(!user||!verifyPassword(password,user.password)){attempt.count++;loginAttempts.set(key,attempt);throw fail(401,'Email or password is incorrect.');}loginAttempts.delete(key);return createSession(res,user);
  }
  if(path.startsWith('/api/')||path.startsWith('/assets/')||path.startsWith('/reports/'))signedIn(s);
  if(method==='POST')requireCsrf(req,s);
  if(path==='/api/me'&&method==='GET')return json(res,200,{user:{id:s.user_id,name:s.name,email:s.email,role:s.role},csrf:s.csrf,demo});
  if(path==='/api/logout'&&method==='POST'){db.prepare('DELETE FROM sessions WHERE token=?').run(s.token);res.setHeader('Set-Cookie','pm_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});}
  if(path==='/api/projects'&&method==='GET'){
   const list=db.prepare('SELECT p.* FROM projects p JOIN members m ON m.project_id=p.id WHERE m.user_id=? ORDER BY p.created DESC').all(s.user_id);
   return json(res,200,await Promise.all(list.map(async p=>({...p,summary:await bundle(p),counts:db.prepare('SELECT status,count(*) count FROM observations WHERE project_id=? GROUP BY status').all(p.id)}))));
  }
  if(path==='/api/projects'&&method==='POST'){
   const d=await body(req),id=randomUUID(),now=new Date().toISOString();const name=text(d.name,'project name',120),location=text(d.location,'location',200),description=typeof d.description==='string'?d.description.trim().slice(0,2000):'';
   db.exec('BEGIN');try{db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,NULL)').run(id,name,location,description,now);db.prepare('INSERT INTO members VALUES(?,?)').run(id,s.user_id);for(const u of db.prepare("SELECT id FROM users WHERE role='reviewer' AND id<>?").all(s.user_id))db.prepare('INSERT INTO members VALUES(?,?)').run(id,u.id);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return json(res,201,{id});
  }
  let match=path.match(/^\/api\/projects\/([^/]+)$/);
  if(match&&method==='GET'){const p=project(s,match[1]);return json(res,200,{...p,summary:await bundle(p),observations:observations(p.id),reports:db.prepare('SELECT id,created FROM reports WHERE project_id=? ORDER BY created DESC').all(p.id)});}
  match=path.match(/^\/api\/projects\/([^/]+)\/observations$/);
  if(match&&method==='POST'){
   const p=project(s,match[1]);if(!await bundle(p))throw fail(409,'This project has no connected survey evidence.');const d=await body(req);if(!['Road bridge','Railway bridge','Surroundings'].includes(d.component))throw fail(400,'Invalid component.');if(!['General observation','Possible crack','Possible spalling','Possible corrosion','Coverage gap'].includes(d.category))throw fail(400,'Invalid observation category.');const r=d.rect;if(!r||!['x','y','w','h'].every(k=>typeof r[k]==='number'&&Number.isFinite(r[k]))||r.x<0||r.y<0||r.w<.005||r.h<.005||r.x+r.w>1.000001||r.y+r.h>1.000001)throw fail(400,'Draw a valid area inside the source photo.');const content=text(d.body,'observation'),id=randomUUID(),now=new Date().toISOString();db.prepare('INSERT INTO observations(id,project_id,author_id,component,category,body,rect,created,updated) VALUES(?,?,?,?,?,?,?,?,?)').run(id,p.id,s.user_id,d.component,d.category,content,JSON.stringify(r),now,now);return json(res,201,{id});
  }
  match=path.match(/^\/api\/observations\/([^/]+)\/(submit|review)$/);
  if(match&&method==='POST'){
   const o=db.prepare('SELECT * FROM observations WHERE id=?').get(match[1]);if(!o)throw fail(404,'Observation not found.');project(s,o.project_id);const d=await body(req);if(d.version!==o.version)throw fail(409,'This observation changed. Refresh before continuing.');let next,comment='';
   if(match[2]==='submit'){if(o.author_id!==s.user_id)throw fail(403,'Only the author can submit this observation.');if(o.status!=='draft')throw fail(409,'Only drafts can be submitted.');next='submitted';}
   else{if(s.role!=='reviewer')throw fail(403,'Reviewer access is required.');if(o.status!=='submitted')throw fail(409,'Only submitted observations can be reviewed.');if(!['accepted','rejected'].includes(d.decision))throw fail(400,'Choose accept or reject.');next=d.decision;comment=text(d.comment,'review comment');}
   const now=new Date().toISOString();db.exec('BEGIN');try{db.prepare('UPDATE observations SET status=?,version=version+1,updated=? WHERE id=?').run(next,now,o.id);db.prepare('INSERT INTO events(observation_id,actor_id,action,comment,created) VALUES(?,?,?,?,?)').run(o.id,s.user_id,next,comment,now);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return json(res,200,{ok:true,status:next});
  }
  match=path.match(/^\/api\/projects\/([^/]+)\/reports$/);
  if(match&&method==='POST'){
   const p=project(s,match[1]);if(s.role!=='reviewer')throw fail(403,'Reviewer access is required to issue reports.');const accepted=observations(p.id).filter(o=>o.status==='accepted').map(o=>({...o,review:o.events.findLast(e=>e.action==='accepted')}));if(!accepted.length)throw fail(409,'Accept at least one observation before issuing a report.');const id=randomUUID(),created=new Date().toISOString(),summary=await bundle(p);const snapshot={id,created,project:p,observations:accepted,task:summary?.task};db.prepare('INSERT INTO reports VALUES(?,?,?,?,?)').run(id,p.id,s.user_id,created,JSON.stringify(snapshot));return json(res,201,{id,url:`/reports/${id}`});
  }
  match=path.match(/^\/reports\/([^/]+)$/);
  if(match&&method==='GET'){const report=db.prepare('SELECT * FROM reports WHERE id=?').get(match[1]);if(!report)throw fail(404,'Report not found.');const p=project(s,report.project_id);const image=(await readFile(resolve(storage,p.bundle,'bridge-source.jpg'))).toString('base64');res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','private, no-store');if(url.searchParams.has('download'))res.setHeader('Content-Disposition',`attachment; filename="inspection-${report.id}.html"`);return res.end(renderReport(JSON.parse(report.snapshot),image));}
  match=path.match(/^\/assets\/([^/]+)\/([^/]+)$/);
  if(match&&['GET','HEAD'].includes(method)){const p=project(s,match[1]);if(!p.bundle||!assetNames.has(match[2]))throw fail(404,'Asset not found.');return await sendFile(req,res,resolve(storage,p.bundle,match[2]));}
  if(path.startsWith('/api/'))throw fail(404,'Endpoint not found.');
  if(!['GET','HEAD'].includes(method))throw fail(405,'Method not allowed.');
  let base=resolve(root,'public'),relative=path==='/'?'index.html':path.slice(1);
  if(path.startsWith('/vendor/three/')){base=resolve(root,'node_modules/three');relative=path.slice('/vendor/three/'.length);}
  const file=resolve(base,relative);if(!file.startsWith(base+sep))throw fail(404,'File not found.');return await sendFile(req,res,file);
 }catch(e){if(res.headersSent){res.destroy();return;}if(!e.status)console.error(e);json(res,e.status||500,{error:e.status?e.message:'The request could not be completed.'});}
});
server.listen(port,host,()=>console.log(`pmspace.ai: ${origin} | ${demo?'local demonstration':'password authentication'} | data: ${storage}`));
function shutdown(){server.close(()=>{db.close();process.exit(0);});}process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
