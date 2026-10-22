/** Isolated native accounts for browser acceptance. No supplier, payment or real appointment. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const dir=process.env.DATA_DIR;
if(!dir||!path.basename(dir).startsWith('ecs-test-150-'))throw Error('Isolated DATA_DIR required');
globalThis.fetch=async()=>{throw Error('No external call in mission150 fixture');};
const {id,now,run}=await import('../../src/lib/db');
const {createUser}=await import('../../src/lib/auth');
const {grantProjectPlan}=await import('../../src/lib/project-subscriptions');
const {PLANS}=await import('../../src/lib/plans');
const {sha256}=await import('../../src/lib/secrets');
const file=path.join(dir,'browser-sessions-private.json');
if(process.argv[2]==='used'){
 const accounts=JSON.parse(fs.readFileSync(file,'utf8'));const a=accounts.find((a:any)=>a.plan==='dominer');
 const sid=id(),t=now();run('INSERT INTO call_slots(id,starts_at,ends_at,status,created_at) VALUES(?,?,?,?,?)',sid,t-86400000,t-86400000+3600000,'blocked',t);
 run("INSERT INTO call_bookings(id,slot_id,user_id,project_id,plan,price_cents,free,status,created_at,updated_at) VALUES(?,?,?,?,?,0,1,'done',?,?)",id(),sid,a.uid,a.pid,'dominer',t,t);
 console.log('Synthetic used-call history recorded; no slot offered, provider, payment or real booking.');
}else{
 if(fs.existsSync(file))throw Error('Existing fixture preserved; use a fresh isolated DATA_DIR');
 const accounts=[];
 for(const plan of ['creer','vendre','dominer'] as const){
  const u=await createUser(`forfait-${plan}@example.test`,'reception-forfaits-isolee-150',`Réception ${PLANS[plan].name.fr}`);run("UPDATE users SET role='client' WHERE id=?",u.id);
  const pid=id(),t=now();run('INSERT INTO projects(id,user_id,name,created_at,updated_at) VALUES(?,?,?,?,?)',pid,u.id,plan==='vendre'?'Reliure indépendante — test':'Objets du quotidien — test',t,t);grantProjectPlan(pid,plan);
  const token=crypto.randomBytes(32).toString('hex');run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(token),u.id,t+86400000,t);
  accounts.push({uid:u.id,pid,token,plan});
 }
 fs.writeFileSync(file,JSON.stringify(accounts),{mode:0o600});console.log('Three isolated accounts/project subscriptions ready. No provider or payment configured; zero appointment slots.');
}
