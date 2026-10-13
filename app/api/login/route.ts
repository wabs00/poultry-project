import {NextResponse} from 'next/server';
import {configured,allowLogin,verifyPassword,newSession,COOKIE,secureCookie,sameOrigin} from '../../../server/auth.mjs';
export const runtime='nodejs';
export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:'Foreign-origin requests are not allowed.'},{status:403});
  if(!configured())return NextResponse.json({error:'Owner login is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD_HASH in the server settings.'},{status:503});
  if(Number(request.headers.get('content-length')||0)>4096)return NextResponse.json({error:'Login request too large.'},{status:413});
  try{
    if(!allowLogin())return NextResponse.json({error:'Too many login attempts. Wait five minutes.'},{status:429});
    const reader=request.body?.getReader();if(!reader)return NextResponse.json({error:'Invalid login request.'},{status:400});
    let bytes=0,text='';const decoder=new TextDecoder();try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>4096){await reader.cancel();return NextResponse.json({error:'Login request too large.'},{status:413});}text+=decoder.decode(value,{stream:true});}}finally{reader.releaseLock();}
    const input=JSON.parse(text+decoder.decode());const valid=await verifyPassword(input.password,process.env.ADMIN_PASSWORD_HASH);
    if(input.username!==process.env.ADMIN_USERNAME||!valid)return NextResponse.json({error:'Username or password is incorrect.'},{status:401});
    const response=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});response.cookies.set(COOKIE,newSession(input.username),{httpOnly:true,secure:secureCookie(),sameSite:'strict',path:'/',maxAge:7*86400});return response;
  }catch{return NextResponse.json({error:'Unable to sign in. Check the server configuration.'},{status:400});}
}
