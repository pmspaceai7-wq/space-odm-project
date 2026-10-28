import {DatabaseSync} from 'node:sqlite';
import {randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
export function hashPassword(password){const salt=randomBytes(16).toString('hex');return `${salt}:${scryptSync(password,salt,64).toString('hex')}`;}
export function verifyPassword(password,stored){const [salt,hash]=stored.split(':');const actual=scryptSync(password,salt,64);return timingSafeEqual(actual,Buffer.from(hash,'hex'));}
export function openDatabase(file,config){
 mkdirSync(dirname(file),{recursive:true});const db=new DatabaseSync(file);
 db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('inspector','reviewer')),password TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),csrf TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,name TEXT NOT NULL,location TEXT NOT NULL,description TEXT NOT NULL,created TEXT NOT NULL,bundle TEXT);
 CREATE TABLE IF NOT EXISTS members(project_id TEXT REFERENCES projects(id),user_id TEXT REFERENCES users(id),PRIMARY KEY(project_id,user_id));
 CREATE TABLE IF NOT EXISTS observations(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),author_id TEXT NOT NULL REFERENCES users(id),component TEXT NOT NULL,category TEXT NOT NULL,body TEXT NOT NULL,rect TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','submitted','accepted','rejected')),version INTEGER NOT NULL DEFAULT 1,created TEXT NOT NULL,updated TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,observation_id TEXT NOT NULL REFERENCES observations(id),actor_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,comment TEXT NOT NULL,created TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,project_id TEXT NOT NULL REFERENCES projects(id),author_id TEXT NOT NULL REFERENCES users(id),created TEXT NOT NULL,snapshot TEXT NOT NULL);
 `);
 const insert=db.prepare('INSERT OR IGNORE INTO users VALUES(?,?,?,?,?)');
 insert.run('inspector',config.inspectorEmail,'Demo inspector','inspector',hashPassword(config.inspectorPassword));
 insert.run('reviewer',config.adminEmail,'Review lead','reviewer',hashPassword(config.adminPassword));
 db.prepare('INSERT OR IGNORE INTO projects VALUES(?,?,?,?,?,?)').run('rivaz','Rivaz bridge','Rivaz, Switzerland','Road and railway crossings at Lake Geneva. Aerial survey courtesy of Pix4D.','2026-10-27T00:00:00.000Z','demo');
 for(const id of ['inspector','reviewer'])db.prepare('INSERT OR IGNORE INTO members VALUES(?,?)').run('rivaz',id);
 return db;
}
