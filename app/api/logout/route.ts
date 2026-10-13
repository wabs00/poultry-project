import {cookies} from 'next/headers';
import {NextResponse} from 'next/server';
import {revoke,COOKIE,sameOrigin,secureCookie} from '../../../server/auth.mjs';
export async function POST(request:Request){
  if(!sameOrigin(request))return NextResponse.json({error:'Foreign-origin requests are not allowed.'},{status:403});
  revoke((await cookies()).get(COOKIE)?.value);
  const response=NextResponse.json({ok:true});response.cookies.set(COOKIE,'',{httpOnly:true,secure:secureCookie(),sameSite:'strict',path:'/',maxAge:0});return response;
}
