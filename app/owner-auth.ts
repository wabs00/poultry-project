import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {sessionUser,COOKIE} from '../server/auth.mjs';
export async function getOwner(){return sessionUser((await cookies()).get(COOKIE)?.value);}
export async function requireOwner(){const owner=await getOwner();if(!owner)redirect('/login');return owner;}
