import {getOwner} from '../../owner-auth';
import {latest,saveRevision,audit} from '../../../server/database.mjs';
import {sameOrigin} from '../../../server/auth.mjs';
import {applyCommand,emptyFarm,demoFarm,type Farm} from '../../core';
import {parseStoredFarm} from '../../storage';
export const dynamic='force-dynamic';
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
async function readEntry(request:Request){
  if(!request.body)return '';
  const reader=request.body.getReader(),decoder=new TextDecoder();let size=0,text='';
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>20000){await reader.cancel();return null;}text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}finally{reader.releaseLock();}
}
export async function GET(request:Request){
  const owner=await getOwner();if(!owner)return json({error:'Please sign in to open your farm.'},401);
  try{
    if(new URL(request.url).searchParams.get('audit')==='1'){return json({events:audit(owner)});}
    const row=await latest(owner);return json({revision:row?.revision??0,farm:row?parseStoredFarm(row.payload):emptyFarm()});
  }catch(error){console.error('Workspace read failed',error instanceof Error?error.name:'unknown');return json({error:'Unable to load farm records right now. Please retry.'},503);}
}
export async function POST(request:Request){
  const owner=await getOwner();if(!owner)return json({error:'Please sign in to save records.'},401);
  if(!sameOrigin(request))return json({error:'Foreign-origin requests are not allowed.'},403);
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
    phase='storage';const result=saveRevision(owner,revision,payload,input.kind.slice(0,40));
    if(!result)return json({error:'Another update was saved. Refresh and try again.'},409);
    return json({revision:revision+1,farm});
  }catch(error){
    const message=error instanceof Error?error.message:'Invalid entry.';
    if(phase==='request')return json({error:'Invalid JSON entry.'},400);
    if(phase==='validation')return json({error:message},422);
    if(/UNIQUE constraint/.test(message))return json({error:'Another update was saved. Refresh and try again.'},409);
    console.error('Workspace save failed',error instanceof Error?error.name:'unknown');return json({error:'Unable to save right now. Please retry.'},503);
  }
}
