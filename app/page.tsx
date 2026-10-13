import Workspace from './workspace';
import {requireOwner} from './owner-auth';
export const dynamic='force-dynamic';
export default async function Home(){const owner=await requireOwner();return <Workspace user={owner}/>;}
