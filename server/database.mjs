import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
let connection;
export function database(){
  if(connection)return connection;
  const path=resolve(process.env.DATABASE_PATH||'./data/poultry.sqlite');
  if(process.env.RENDER==='true' && !path.startsWith('/var/data/'))throw Error('Render requires DATABASE_PATH on the persistent disk at /var/data.');
  mkdirSync(dirname(path),{recursive:true});
  connection=new DatabaseSync(path);
  connection.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS farm_revisions(owner TEXT NOT NULL,revision INTEGER NOT NULL,payload TEXT NOT NULL,action TEXT NOT NULL,created TEXT NOT NULL,PRIMARY KEY(owner,revision));
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,username TEXT NOT NULL,credential TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS login_limit(id INTEGER PRIMARY KEY CHECK(id=1),attempts INTEGER NOT NULL,window INTEGER NOT NULL);
  `);
  return connection;
}
export function latest(owner){return database().prepare('SELECT revision,payload FROM farm_revisions WHERE owner=? ORDER BY revision DESC LIMIT 1').get(owner);}
export function saveRevision(owner,revision,payload,action){
  return database().prepare('INSERT INTO farm_revisions(owner,revision,payload,action,created) SELECT ?,?,?,?,? WHERE COALESCE((SELECT MAX(revision) FROM farm_revisions WHERE owner=?),0)=? RETURNING revision').get(owner,revision+1,payload,action,new Date().toISOString(),owner,revision);
}
export function audit(owner){return database().prepare('SELECT revision,action,created FROM farm_revisions WHERE owner=? ORDER BY revision DESC LIMIT 100').all(owner);}
