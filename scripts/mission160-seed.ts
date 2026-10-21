/** Isolated acceptance setup. Refuses existing studio data and all supplier calls. */
import fs from 'node:fs';
if(!process.env.DATA_DIR?.startsWith('/tmp/ecs160-'))throw Error('Only isolated mission160 data allowed');
globalThis.fetch=async()=>{throw Error('Supplier calls forbidden');};
const {clientFixture}=await import('../tests/mission154-fixtures');
const {run,now}=await import('../src/lib/db');
const {sha256}=await import('../src/lib/secrets');
const cases=[];
for(const services of [false,true]){
 const f=await clientFixture({services,strategy:null,brand:services?'L’Atelier des Gestes':'Maison Basalte'});
 const token=crypto.randomUUID()+crypto.randomUUID();
 run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(token),f.user.id,now()+86400000,now());
 cases.push({projectId:f.pid,userId:f.user.id,token,services,direction:services?'rive':'traverse'});
}
fs.writeFileSync('/tmp/ecs160-ui-accounts.json',JSON.stringify(cases),{mode:0o600});
console.log('Two isolated projects prepared; no credentials or customer data exported.');
