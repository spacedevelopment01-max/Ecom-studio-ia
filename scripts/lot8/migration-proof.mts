/** Migration d'une base fictive du main audité ; deux démarrages et comparaison de toutes les anciennes lignes. */
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
const repo=process.cwd(),base='0a6aa1dd6dfa5932a5e42e027cef2a3335e74679',mode=process.argv[2];
if(!mode){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'ecs-lot8-migration-'));fs.symlinkSync(path.join(repo,'node_modules'),path.join(root,'node_modules'),'dir');const env={...process.env,DATA_DIR:root,APP_SECRET:crypto.randomBytes(32).toString('hex')};delete env.DATABASE_FILE;delete env.STORAGE_DIR;
 const source=execFileSync('git',['show',`${base}:src/lib/db.ts`],{encoding:'utf8'}).replace('from "./redact"',`from ${JSON.stringify(path.join(repo,'src/lib/redact'))}`);fs.writeFileSync(path.join(root,'old-db.ts'),source);
 for(const m of ['old','new','new'])execFileSync(process.execPath,['--import','tsx',path.join(repo,'scripts/lot8/migration-proof.mts'),m],{env,stdio:'pipe'});
 const result={schema:'lot8-migration-1',baseCommit:base,testedCodeCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),isolatedData:true,...JSON.parse(fs.readFileSync(path.join(root,'result.json'),'utf8'))};fs.mkdirSync('reports/lot8',{recursive:true});fs.writeFileSync('reports/lot8/migration.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}else{
 const root=process.env.DATA_DIR!;assert.ok(path.basename(root).startsWith('ecs-lot8-migration-'));const db=mode==='old'?await import(path.join(root,'old-db.ts')):await import('../../src/lib/db');const {run,all}=db;
 if(mode==='old'){
  run("INSERT INTO users(id,email,name,password_hash,created_at) VALUES('legacy-user','migration@example.test','Données fictives','not-a-password',1)");
  run("INSERT INTO projects(id,user_id,name,created_at,updated_at,product_json,brand_json) VALUES('legacy-project','legacy-user','Ancien projet conservé',1,1,?,?)",JSON.stringify({name:'Support de lecture',fullText:'Texte client intégral de recette'}),JSON.stringify({name:'Marque de recette',palette:['#102030']}));
  run("INSERT INTO memory(id,project_id,kind,key,value,status,source,created_at,updated_at) VALUES('angle-history','legacy-project','decision','marketing.strategy','Historique à préserver','confirmed','user',1,1)");
  run("INSERT INTO theme_versions(id,project_id,number,spec,summary,author,created_at) VALUES('legacy-version','legacy-project',1,?,'Composition historique','user',1)",JSON.stringify({sections:[{type:'hero',text:'Ancienne composition'}]}));
  fs.mkdirSync(path.join(root,'client-media'),{recursive:true});fs.writeFileSync(path.join(root,'client-media','original.txt'),'Média fictif original, ne pas modifier.');
  const snapshot=Object.fromEntries(all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").map((r:any)=>[r.name,all(`SELECT * FROM "${r.name}" ORDER BY rowid`)]));fs.writeFileSync(path.join(root,'snapshot.json'),JSON.stringify(snapshot));
 }else{
  const before=JSON.parse(fs.readFileSync(path.join(root,'snapshot.json'),'utf8'));for(const [table,rows] of Object.entries(before))assert.deepEqual(all(`SELECT * FROM "${table}" ORDER BY rowid`),rows,`Table modifiée ${table}`);
  const added=['checkout_intents','stripe_event_claims','billing_mutations','support_tickets','support_messages'];for(const table of added)assert.deepEqual(all(`SELECT * FROM "${table}"`),[]);assert.equal(fs.readFileSync(path.join(root,'client-media','original.txt'),'utf8'),'Média fictif original, ne pas modifier.');
  const previous=fs.existsSync(path.join(root,'result.json'))?JSON.parse(fs.readFileSync(path.join(root,'result.json'),'utf8')):{};fs.writeFileSync(path.join(root,'result.json'),JSON.stringify({oldTablesUnchanged:Object.keys(before).length,additiveTables:added,restarts:(previous.restarts??0)+1,projectTextBrandVersionAngleHistoryPreserved:true,mediaPreserved:true}));
 }
}
