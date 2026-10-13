import {scrypt,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
import {database} from './database.mjs';
const derive=promisify(scrypt);
export const COOKIE='poultry_session';
export const secureCookie=()=>process.env.COOKIE_SECURE!=='false';
export function configured(){return Boolean(process.env.ADMIN_USERNAME?.trim() && /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(process.env.ADMIN_PASSWORD_HASH||''));}
export async function hashPassword(password){
  const salt=randomBytes(16).toString('hex');
  const key=await derive(password,salt,64,{N:16384,r:8,p:1});
  return `scrypt$${salt}$${key.toString('hex')}`;
}
export async function verifyPassword(password,encoded){
  if(typeof password!=='string'||password.length>256||!/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(encoded||''))return false;
  const [,salt,value]=encoded.split('$');
  const key=await derive(password,salt,64,{N:16384,r:8,p:1});
  return timingSafeEqual(key,Buffer.from(value,'hex'));
}
const digest=value=>createHash('sha256').update(value).digest('hex');
export function newSession(username){
  const db=database(),now=Date.now();db.prepare('DELETE FROM sessions WHERE expires<?').run(now);
  const token=randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(digest(token),username,digest(process.env.ADMIN_PASSWORD_HASH),now+7*86400_000);
  return token;
}
export function sessionUser(token){
  if(!configured()||!token||!/^[a-f0-9]{64}$/.test(token))return null;
  const row=database().prepare('SELECT username,credential,expires FROM sessions WHERE token=?').get(digest(token));
  return row && row.expires>Date.now() && row.username===process.env.ADMIN_USERNAME && row.credential===digest(process.env.ADMIN_PASSWORD_HASH) ? row.username : null;
}
export function revoke(token){if(token)database().prepare('DELETE FROM sessions WHERE token=?').run(digest(token));}
export function allowLogin(now=Date.now()){
  const db=database();db.exec('BEGIN IMMEDIATE');
  try{let row=db.prepare('SELECT * FROM login_limit WHERE id=1').get();
    if(!row||now-row.window>300000){db.prepare('INSERT OR REPLACE INTO login_limit VALUES(1,1,?)').run(now);db.exec('COMMIT');return true;}
    if(row.attempts>=10){db.exec('COMMIT');return false;}
    db.prepare('UPDATE login_limit SET attempts=attempts+1 WHERE id=1').run();db.exec('COMMIT');return true;
  }catch(error){db.exec('ROLLBACK');throw error;}
}
export function sameOrigin(request){const origin=request.headers.get('origin');const url=new URL(request.url);const localHost=request.headers.get('host');const expected=process.env.APP_ORIGIN||process.env.RENDER_EXTERNAL_URL||(localHost?`${url.protocol}//${localHost}`:url.origin);return Boolean(origin && origin===new URL(expected).origin);}
