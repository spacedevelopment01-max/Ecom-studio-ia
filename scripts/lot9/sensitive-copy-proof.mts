/** Vérification des textes réellement rendus, avec données et médias fictifs ; aucun fournisseur. */
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
assert.ok(!process.env.DATA_DIR&&!process.env.DATABASE_FILE&&!process.env.STORAGE_DIR&&!process.env.APP_SECRET,'La recette refuse les sélecteurs et secrets préexistants');assert.ok(!fs.existsSync('.env')&&!fs.existsSync('.env.local'),'La recette refuse une configuration locale client');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'ecs-lot9-sensitive-'));process.env.DATA_DIR=root;process.env.THEME_DEMOS_AUTO='0';process.env.STOCK_OFFLINE='1';
const{clientFixture}=await import('../../tests/mission154-fixtures');const{buildShop}=await import('../../src/lib/engine/shop');const{currentTheme}=await import('../../src/lib/projects');const{getAsset}=await import('../../src/lib/library');const{compileTheme}=await import('../../src/lib/theme/compile');const{renderPage}=await import('../../src/lib/theme/render');const{all,db}=await import('../../src/lib/db');
const forbidden=/Fraise\s+Gummies|NOCTIL|gummies|m[ée]latonine|melatonin|posologie|2\s+gommes|69\s*€|69[,.]00|sommeil\s+r[ée]parateur|500\s+avis/i;
const results=[];
try{
 for(const direction of ['fraise','noctil','rive'] as const){
  const f=await clientFixture({services:direction==='rive',brand:direction==='fraise'?'Les Terres du Passage':direction==='noctil'?'Atelier des Marées':'La Manufacture du Geste'});await buildShop(null,f.pid,{direction,useAi:false});const spec=currentTheme(f.pid)!.spec,files=compileTheme(spec);
  assert.ok(Object.values(spec.files).every(id=>{const a=getAsset(id);return a?.project_id===f.pid&&a.user_id===f.user.id;}));
  const pages=['/',...(direction==='rive'?[]:['/products/'+spec.store.product.handle]),...spec.store.pages.map(p=>'/pages/'+p.handle)];const checked=[];
  for(const page of pages){const rendered=await renderPage({spec,base:'/preview/fixture/v/current',files,cart:[]},page,new URLSearchParams());assert.equal(rendered.status,200);const text=rendered.html.replace(/<script\b[\s\S]*?<\/script\s*>/gi,' ').replace(/<style\b[\s\S]*?<\/style\s*>/gi,' ').replace(/<[^>]*>/g,' ');assert.ok(!forbidden.test(text),`Contenu sensible de démo dans ${direction} ${page}`);assert.ok(!rendered.html.includes('theme-assets/noctil')&&!rendered.html.includes('theme-assets/fraise'));checked.push({page,status:rendered.status,sensitiveDemoCopyFound:false,demoMediaFound:false});}
  results.push({direction,simulatedClientInput:true,ownMediaOnly:true,pages:checked,aiCalls:all('SELECT id FROM ai_calls WHERE project_id=?',f.pid).length});
 }
 assert.equal(all('SELECT id FROM ai_calls').length,0);fs.writeFileSync('reports/lot9/separation-contenus.json',JSON.stringify({schema:'lot9-rendered-copy-1',codeCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),simulatedDataOnly:true,realProviderCalls:0,creativeQualityCertified:false,scope:'Visible text and own-media lineage, not a legal or factual certification of every claim',results},null,2)+'\n');console.log(JSON.stringify({projects:results.length,pages:results.reduce((n,r)=>n+r.pages.length,0),realProviderCalls:0,passed:true}));
}finally{db().close();assert.equal(path.dirname(root),os.tmpdir());fs.rmSync(root,{recursive:true,force:true});}
