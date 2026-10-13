import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {applyCommand,emptyFarm,demoFarm,type Farm} from '../../core';
import {parseStoredFarm} from '../../storage';
export const dynamic='force-dynamic';
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
async function latest(owner:string){return await env.DB!.prepare('SELECT revision, payload FROM farm_revisions WHERE owner = ? ORDER BY revision DESC LIMIT 1').bind(owner).first<{revision:number;payload:string}>();}
async function readEntry(request:Request){
  if(!request.body)return '';
  const reader=request.body.getReader(),decoder=new TextDecoder();let size=0,text='';
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>20000){await reader.cancel();return null;}text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}finally{reader.releaseLock();}
}
export async function GET(request:Request){
  const owner=(await getChatGPTUser())?.userId;if(!owner)return json({error:'Please sign in to open your farm.'},401);
  if(!env.DB)return json({error:'Database binding is unavailable.'},503);
  try{
    if(new URL(request.url).searchParams.get('audit')==='1'){const events=await env.DB.prepare('SELECT revision, action, created FROM farm_revisions WHERE owner=? ORDER BY revision DESC LIMIT 100').bind(owner).all();return json({events:events.results});}
    const row=await latest(owner);return json({revision:row?.revision??0,farm:row?parseStoredFarm(row.payload):emptyFarm()});
  }catch(error){console.error('Workspace read failed',error instanceof Error?error.name:'unknown');return json({error:'Unable to load farm records right now. Please retry.'},503);}
}
export async function POST(request:Request){
  const owner=(await getChatGPTUser())?.userId;if(!owner)return json({error:'Please sign in to save records.'},401);
  if(!env.DB)return json({error:'Database binding is unavailable.'},503);
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Foreign-origin requests are not allowed.'},403);
  if(Number(request.headers.get('content-length')??0)>20000)return json({error:'Entry is too large.'},413);
  let phase:'request'|'storage'|'validation'='request';
  try{
    const text=await readEntry(request);if(text===null)return json({error:'Entry is too large.'},413);
    const input=JSON.parse(text);if(!input||typeof input!=='object'||Array.isArray(input)||!Number.isInteger(input.revision)||input.revision<0||typeof input.kind!=='string'||!input.values||typeof input.values!=='object'||Array.isArray(input.values))return json({error:'Invalid workspace command.'},400);
    phase='storage';const row=await latest(owner),revision=row?.revision??0;
    if(input.revision!==revision)return json({error:'Another update was saved. Refresh and try again.'},409);
    const previous:Farm=row?parseStoredFarm(row.payload):emptyFarm();
    phase='validation';let farm:Farm;
    if(input.kind==='demo'){if(previous.flocks.length||previous.stock.length||previous.daily.length||previous.sales.length||previous.tasks.length||previous.expenses.length||previous.health.length)throw Error('Demo data can only be loaded into an empty workspace.');farm=demoFarm();}
    else farm=applyCommand(previous,input);
    const payload=JSON.stringify(farm);if(new TextEncoder().encode(payload).length>1_000_000)return json({error:'Workspace storage limit reached. Export your records before expanding.'},422);
    phase='storage';const result=await env.DB.prepare('INSERT INTO farm_revisions (owner, revision, payload, action, created) SELECT ?, ?, ?, ?, ? WHERE COALESCE((SELECT MAX(revision) FROM farm_revisions WHERE owner=?),0)=? RETURNING revision').bind(owner,revision+1,payload,input.kind.slice(0,40),new Date().toISOString(),owner,revision).all();
    if(!result.results.length)return json({error:'Another update was saved. Refresh and try again.'},409);
    return json({revision:revision+1,farm});
  }catch(error){
    const message=error instanceof Error?error.message:'Invalid entry.';
    if(phase==='request')return json({error:'Invalid JSON entry.'},400);
    if(phase==='validation')return json({error:message},422);
    if(/UNIQUE constraint/.test(message))return json({error:'Another update was saved. Refresh and try again.'},409);
    console.error('Workspace save failed',error instanceof Error?error.name:'unknown');return json({error:'Unable to save right now. Please retry.'},503);
  }
}
