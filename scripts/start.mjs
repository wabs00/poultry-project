import {spawn} from 'node:child_process';
import {configured} from '../server/auth.mjs';
import {database} from '../server/database.mjs';
if(!configured())throw Error('Set ADMIN_USERNAME and ADMIN_PASSWORD_HASH before starting. Run npm run password to generate a password hash.');
if(process.env.RENDER==='true'&&process.env.COOKIE_SECURE==='false')throw Error('Secure cookies must remain enabled on Render.');
database();
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','0.0.0.0','--port',process.env.PORT||'8050'],{stdio:'inherit',env:process.env});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
