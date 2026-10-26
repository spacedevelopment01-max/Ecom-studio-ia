import {it,expect,vi} from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {tmpDir} from '@/lib/storage';
// Standalone mjs is intentionally runnable on the older checkout without app imports.
// @ts-expect-error standalone diagnostic has no application declaration dependency
import {describeModel,analyzeRoutingSettings,inspect} from '../scripts/inspect-routing-corrections.mjs';
it.each(['private-value','sk-test-private','https://unexpected.invalid/private','x\nprivate'])('ne révèle jamais une valeur inconnue : %s',value=>{
 expect(JSON.stringify(describeModel('alibaba',value))).not.toContain(value);
});
it('sépare les causes sans corriger implicitement la configuration',()=>{
 expect(describeModel('alibaba','qwen_image_3.0_pro')).toMatchObject({code:'NORMALIZATION_MATCH',publicCandidate:'qwen-image-3.0-pro',model:null});
 expect(describeModel('alibaba','"qwen-image-3.0-pro"')).toMatchObject({code:'JSON_QUOTED_PUBLIC_ID'});
 expect(describeModel('alibaba','alibaba:qwen-image-3.0-pro')).toMatchObject({code:'PROVIDER_PREFIX_IN_MODEL_FIELD'});
});
it('reproduit la seule parenté native social → publicité ; aucun héritage inventé pour scène',()=>{
 const settings={'ai.routes':{image_generation:{provider:'alibaba',model:'qwen-image-3.0-pro'}},'ai.media.usage':{product_image:{primary:'alibaba:private-product'},ad_visual:{primary:'alibaba:qwen_image_3.0_pro'}}};
 const before=JSON.stringify(settings),out=analyzeRoutingSettings(settings);
 expect(out.images.find((r:any)=>r.usage==='social_image')).toMatchObject({origin:'AD_VISUAL_PARENT',publicCandidate:'qwen-image-3.0-pro'});
 expect(out.images.find((r:any)=>r.usage==='scene')).toMatchObject({origin:'IMAGE_GENERATION_ROUTE_OR_DEFAULT',model:'qwen-image-3.0-pro'});
 expect(JSON.stringify(out)).not.toContain('private-product');expect(JSON.stringify(settings)).toBe(before);
});
it('lecture SQLite isolée uniquement, ignore les secrets et ne migre pas le schéma',()=>{
 const dir=tmpDir('routing-preview'),require=createRequire(import.meta.url),Database=require('better-sqlite3');
 try {
 fs.writeFileSync(path.join(dir,'package.json'),'{}');
 fs.symlinkSync(path.join(process.cwd(),'node_modules'),path.join(dir,'node_modules'));
 const databaseFile=path.join(dir,'test.db'),db=new Database(databaseFile);db.exec('CREATE TABLE settings(key TEXT,value TEXT,secret INTEGER)');
 db.prepare('INSERT INTO settings VALUES(?,?,?)').run('provider.openai.apiKey','secret-canary-not-to-read',1);
 db.prepare('INSERT INTO settings VALUES(?,?,?)').run('ai.routes',JSON.stringify({image_generation:{provider:'alibaba',model:'qwen-image-3.0-pro'}}),0);db.close();
 fs.writeFileSync(path.join(dir,'.env.local'),'DATABASE_FILE='+databaseFile+'\nOPENAI_API_KEY=not-to-export\n');
 fs.mkdirSync(path.join(dir,'.git')); // git failure remains closed; run in repository for a valid checkout ref
 const before=fs.readFileSync(databaseFile);
 const command=vi.spyOn(process,'cwd').mockReturnValue(dir);
 // inspect() requires a git checkout: initialize only the isolated fixture, never the user checkout.
 const {execFileSync}=require('node:child_process');execFileSync('git',['init','-q'],{cwd:dir});execFileSync('git',['-c','user.name=Fixture','-c','user.email=fixture@test.invalid','commit','--allow-empty','-qm','Fixture'],{cwd:dir});
 try{const result=inspect(dir);expect(JSON.stringify(result)).not.toMatch(/secret-canary|not-to-export/);expect(result.providerCalls).toBe(0);expect(fs.readFileSync(databaseFile)).toEqual(before);}finally{command.mockRestore();}
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
