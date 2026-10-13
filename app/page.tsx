import Workspace from './workspace';
import {requireChatGPTUser} from './chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Home(){const user=await requireChatGPTUser('/');return <Workspace user={user.fullName??user.email??'Farm owner'}/>;}
