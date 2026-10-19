/** Native chain quote, isolated fixtures only. No provider/network or credits consumed. */
import fs from 'node:fs';import path from 'node:path';
const dir=process.env.DATA_DIR??'';if(!path.basename(dir).startsWith('ecs-test-video-mission-'))throw Error('Dossier isolé requis');
globalThis.fetch=async()=>{throw Error('Aucun fournisseur autorisé');};
const {ui}=JSON.parse(fs.readFileSync(path.join(dir,'private-ui.json'),'utf8'));
const {loadProject}=await import('../src/lib/projects');const {sceneChainQuote}=await import('../src/lib/video-v2/chain-quote');
const {SCENE_VIDEO_MODEL}=await import('../src/lib/video-v2/three-scenes');const {mediaRouteFor}=await import('../src/lib/ai/media-providers');const {routeFor}=await import('../src/lib/ai/config');
const {all}=await import('../src/lib/db');
const p=loadProject(ui.find((x:any)=>x.slug==='produit-publicitaire').pid);
const quote=sceneChainQuote(p,{as:'ad',scenes:4,totalS:20,aspect:'9:16'});
const evidence={date:new Date().toISOString(),configuration:'Isolated configured fixture; production configuration unknown',reference:'Correct ONDE black/green pack and logo unavailable here; no ONDE created, no blue poster used',providerCalls:all('SELECT id FROM ai_calls').length,quote,routes:{scenario:routeFor('copywriting'),quality:routeFor('quality_control'),image:mediaRouteFor('social_image',{references:1,text:false}),video:{provider:'alibaba',model:SCENE_VIDEO_MODEL}},budget:{subscription:'40% of paid subscription HT',topup:'50% of paid topup HT',remainingAndNativeReservationsApply:true,creerAiClips:false},costsActuallyCharged:0};
fs.writeFileSync(path.join(dir,'public','chain-quote.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({firstMicro:quote.firstMicro,oneSceneRetakeMicro:quote.oneSceneRetakeMicro,maximumMicro:quote.maximumMicro,providerCalls:evidence.providerCalls,allowed:quote.allowed}));
