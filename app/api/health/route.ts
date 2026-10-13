import {configured} from '../../../server/auth.mjs';
import {database} from '../../../server/database.mjs';
export const dynamic='force-dynamic';
export async function GET(){try{database().prepare('SELECT 1').get();if(!configured())throw Error('configuration');return Response.json({status:'ok'},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({status:'not ready'},{status:503});}}
