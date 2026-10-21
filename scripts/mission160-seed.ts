/** Isolated acceptance setup. Refuses existing studio data and all supplier calls. */
import fs from 'node:fs';
if(!process.env.DATA_DIR?.startsWith('/tmp/ecs160-'))throw Error('Only isolated mission160 data allowed');
globalThis.fetch=async()=>{throw Error('Supplier calls forbidden');};
const {clientFixture}=await import('../tests/mission154-fixtures');
const {run,now}=await import('../src/lib/db');
const {sha256}=await import('../src/lib/secrets');
const cases=[];
for(const services of [false,true]){
 const f=await clientFixture({services,copySource:"ai",strategy:null,brand:services?'L’Atelier des Gestes':'Maison Basalte'});
 const {saveAsset,assetData}=await import('../src/lib/library');await saveAsset({projectId:f.pid,userId:f.user.id,name:'simulation-amont.jpg',mime:'image/jpeg',data:assetData(f.assets[2]),role:'lifestyle',origin:'generated',meta:{simulation:true,provenance:'Fixture only; not a real supplier output'}});
 const {runContentEngineV2}=await import('../src/lib/seo-v2/engine');const {localOnlyDeps}=await import('../src/lib/seo-v2/deps');
 await runContentEngineV2(null,f.pid,{type:'home_page',lang:'fr'},localOnlyDeps());
 const {createPlanV2}=await import('../src/lib/social-v2/planner');const {loadProject}=await import('../src/lib/projects');
 createPlanV2(loadProject(f.pid),{startDate:new Date(Date.now()+86400000).toISOString().slice(0,10),days:2,perDay:1,timezone:'Europe/Paris',platforms:[{platform:'instagram'}],lang:'fr'});
 const token=crypto.randomUUID()+crypto.randomUUID();
 run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(token),f.user.id,now()+86400000,now());
 cases.push({projectId:f.pid,userId:f.user.id,token,services,direction:services?'rive':'traverse'});
}
fs.writeFileSync('/tmp/ecs160-ui-accounts.json',JSON.stringify(cases),{mode:0o600});
console.log('Two isolated projects prepared; no credentials or customer data exported.');
