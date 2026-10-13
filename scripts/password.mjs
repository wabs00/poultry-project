import {hashPassword} from '../server/auth.mjs';
if(!process.stdin.isTTY)throw Error('Run this command in an interactive terminal.');
process.stdout.write('Choose an owner password (at least 12 characters; hidden): ');
process.stdin.setRawMode(true);process.stdin.setEncoding('utf8');process.stdin.resume();let password='';
process.stdin.on('data',async chunk=>{for(const char of chunk){if(char==='\u0003')process.exit(1);if(char==='\r'||char==='\n'){process.stdin.setRawMode(false);process.stdin.pause();if(password.length<12){console.error('\nUse at least 12 characters.');process.exit(1);}console.log('\nADMIN_PASSWORD_HASH='+await hashPassword(password));password='';process.exit(0);}else if(char==='\u007f'||char==='\b')password=password.slice(0,-1);else password+=char;}});
