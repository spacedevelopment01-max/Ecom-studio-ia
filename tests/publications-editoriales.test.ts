import { grantProjectPlan } from "./communication-choice-fixture";
/** Actual engine/SQLite/files; deterministic providers. No creative quality or live social delivery claimed. */
import { describe,it,expect } from 'vitest';
import sharp from 'sharp';
import { createUser } from '@/lib/auth';
import { loadProject } from '@/lib/projects';
import { seedImageFixture } from './image-v2-fixtures';
import { saveAsset,getAsset,assetMeta } from '@/lib/library';
import { one,run } from '@/lib/db';
import { campaignConcept,campaignVerdict } from './publication-fixtures';
import { designPostWithAi,type AiPostDeps } from '@/lib/social-v2/ai-post';
import { creativeContract,creativeInstruction,type Editorial } from '@/lib/social-v2/creative-contract';
import type { PostBrief,SocialDeps } from '@/lib/social-v2/deps';
import { createOnePost,quoteOne } from '@/lib/social-v2/single';
import { estimateProduction,produceBatch } from '@/lib/social-v2/production';
import { checkPost } from '@/lib/social-v2/quality';
import { runAdEngineV2 } from '@/lib/ads-v2/engine';
import { duplicatePostInFormat } from '@/lib/social-v2/post-format';
import { editPostV2 } from '@/lib/social-v2/engine';
import { redoRequest } from '@/lib/media/ai-image-variants';
const base:PostBrief={id:'purpose-test',network:'instagram',format:'image',title:'Entretenir le matériel',headline:'Entretenir le matériel',caption:'Débrancher avant le nettoyage.\n\nUtiliser un chiffon sec.',pillar:'conseils',objective:'educate',scheduled_at:null};
async function setup(kind:'hightech'|'artisan'='hightech') {
 const u=await createUser(`editorial-${crypto.randomUUID()}@test.invalid`,'motdepasse-test','Test');const p=loadProject(seedImageFixture(u.id,kind));if(p.business==='services')grantProjectPlan(p.id,"dominer");
 const bytes=await sharp({create:{width:1080,height:1350,channels:3,background:'#245466'}}).png().toBuffer();
 const ref=await saveAsset({userId:u.id,projectId:p.id,data:bytes,name:'SIMULATION.png',mime:'image/png',role:'original',origin:'upload',status:'approved',meta:{simulation:true}});
 const prompts:string[]=[],contexts:any[]=[],paid:{key:string;cost:number}[]=[];
 const deps:AiPostDeps={
  copy:async(_p,post,fallback,key,_people,context)=>{paid.push({key,cost:10});contexts.push(context);return {...fallback,cta:context?.creative?.purpose==='ad'?'Découvrir':'',scene:'Illustration documentée du contenu et de ses étapes utiles',concept:{...campaignConcept(),composition:`${context?.creative?.purpose} ${context?.creative?.structure}: espaces pour les blocs ordonnés`,ctaStyle:'none'}};},
  generate:async(prompt,_a,_ref,key)=>{prompts.push(prompt);paid.push({key,cost:100});return bytes;},
  review:async(_i,_r,texts,key)=>{paid.push({key,cost:5});return {...campaignVerdict(),person:false,anatomyOk:true,productFaithful:true,textsExact:true,legible:true,score:9.2,transcribed:texts,issues:[],fix:''};},
  maxMicro:()=>100,conceptMaxMicro:()=>10,reviewMaxMicro:()=>5,spentMicro:prefix=>paid.filter(x=>x.key.startsWith(prefix)).reduce((n,x)=>n+x.cost,0),
 };
 return {p,ref,deps,prompts,contexts,paid};
}
describe('Publicité et organique : mêmes identité/sujet, intentions et structures distinctes — simulations',()=>{
 it('publicité conserve sa direction complète ; conseil, FAQ et checklist conservent leurs blocs sans CTA forcé',async()=>{
  const {p,ref,deps,prompts,contexts}=await setup();
  const advertising={audience:'Cyclistes',angle:'Détail de matière',benefit:'Fait confirmé',proof:'Fiche technique fournie',offer:'Aucune',direction:{layout:'diagonal',light:'latérale'},platform:'meta_feed'};
  const ad=await designPostWithAi(p,{...base,id:'ad',caption:'Message de campagne',advertising},{aspect:'4:5',reference:ref.id,maxCostEur:1,as:'ad'},deps);
  expect(ad.assetId).toBeTruthy();expect(contexts[0].creative.advertising).toEqual(advertising);expect(prompts[0]).toContain('advertisement');
  for(const structure of ['advice','faq','checklist'] as const){
   const editorial:Editorial={structure,role:structure,sources:[{label:'Notice fournie',text:'Débrancher et essuyer à sec',verified:true}],blocks:[{kind:structure==='faq'?'question':'tip',text:'Comment nettoyer ?'},{kind:structure==='faq'?'answer':'check',text:'Débrancher, puis utiliser un chiffon sec.'}]};
   const r=await designPostWithAi(p,{...base,id:structure,editorial},{aspect:'4:5',reference:null,maxCostEur:1},deps);
   expect(r.assetId).toBeTruthy();const m=assetMeta<any>(getAsset(r.assetId!)!);
   expect(m.finalImage.creative.purpose).toBe('organic');expect(m.finalImage.creative.caption).toBe(base.caption);expect(m.finalImage.creative.sources).toEqual(editorial.sources);
   expect(m.finalImage.brief.exactTexts.map((x:any)=>x.text)).toContain('Débrancher, puis utiliser un chiffon sec.');expect(m.aiPost.texts.cta).toBe('');
   expect(prompts.at(-1)).toContain(`(${structure})`);expect(prompts.at(-1)).toContain('Aucun produit héros obligatoire');expect(prompts.at(-1)).not.toContain('real campaign photography');
  }
  expect(creativeInstruction(creativeContract({...base,advertising},'ad'))).not.toBe(creativeInstruction(creativeContract(base,'organic')));
 });
 it('avis sans preuve/autorisation bloqué avant tout appel ; avis fourni exact et attribution immuables',async()=>{
  const {p,deps,paid}=await setup('artisan');
  const denied=await designPostWithAi(p,{...base,editorial:{structure:'quote'}},{aspect:'4:5',reference:null,maxCostEur:1},deps);
  expect(denied.assetId).toBeNull();expect(denied.note).toContain('Avis indisponible');expect(paid).toHaveLength(0);
  const quote='Le dossier est clair, et les étapes sont bien expliquées.';
  const editorial:Editorial={structure:'quote',testimonial:{quote,author:'Client test autorisé',source:'Retour écrit de test fourni par le client',verified:true,authorized:true}};
  const r=await designPostWithAi(p,{...base,id:'review',editorial},{aspect:'4:5',reference:null,maxCostEur:1},deps);
  expect(r.assetId).toBeTruthy();const m=assetMeta<any>(getAsset(r.assetId!)!);expect(m.finalImage.brief.exactTexts.map((x:any)=>x.text)).toEqual(expect.arrayContaining([quote,'Client test autorisé']));
  const redo=redoRequest(m,{aspect:'1:1',instruction:'Agrandir uniquement la typographie'});expect(redo.editorial!.testimonial!.quote).toBe(quote);expect(redo.caption).toBe(base.caption);expect(redo.as).toBe('post');
  const changed={...editorial,testimonial:{...editorial.testimonial!,authorized:false}};const bad=await designPostWithAi(p,{...base,id:'bad-review',editorial:changed},{aspect:'4:5',reference:null,maxCostEur:1},deps);expect(bad.assetId).toBeNull();
 });
 it('vrai carrousel de trois fichiers ordonnés, reprise sans paiement, métadonnées complètes et conservation des pages',async()=>{
  const {p,deps,paid,contexts}=await setup();const post={...base,format:'carousel',editorial:{structure:'tutorial' as const,steps:['Débrancher le matériel.','Essuyer avec un chiffon sec.','Ranger dans un endroit sec.']}};
  // Explicit steps replace caption-derived blocks in this case, so the sequence is unambiguous.
  post.caption='';
  const r=await designPostWithAi(p,post,{aspect:'4:5',reference:null,maxCostEur:1},deps);
  expect(r.assetIds).toHaveLength(3);expect(new Set(r.assetIds).size).toBe(3);expect(r.costMicro).toBe(345);
  for(const [i,aid] of r.assetIds!.entries()){const a=getAsset(aid)!;expect([a.width,a.height]).toEqual([1080,1350]);const m=assetMeta<any>(a);expect(m.carousel).toMatchObject({index:i+1,total:3,assetIds:r.assetIds});expect(m.finalImage.creative.series.index).toBe(i+1);expect(contexts[i].creative.series.pages).toHaveLength(3);}
  const count=paid.length;const again=await designPostWithAi(p,post,{aspect:'4:5',reference:null,maxCostEur:1},deps);expect(again.assetIds).toEqual(r.assetIds);expect(paid).toHaveLength(count);
 });
 it('carrousel refusé en partie conserve sa première page sans annoncer un carrousel complet',async()=>{
  const {p,deps}=await setup('artisan');let n=0;const review=deps.review;
  deps.review=async(...a)=>{const r=await review(...a);return ++n===1?r:{...r,fatal:['SIMULATION : bloc illisible'],issues:['bloc illisible'],fix:'Agrandir le texte',fixTarget:'layout'};};
  const r=await designPostWithAi(p,{...base,caption:'Première étape.\n\nDeuxième étape.',format:'carousel'},{aspect:'4:5',reference:null,maxCostEur:1},deps);
  expect(r.assetId).toBeNull();expect(r.partialAssetIds).toHaveLength(1);expect(getAsset(r.partialAssetIds![0])?.status).toBe('ready');expect(r.note).toContain('Carrousel incomplet');expect(r.costMicro).toBeGreaterThan(115);
 });
 it('création unitaire et lot : brief entier, devis par page, fichiers ordonnés, aperçu/reprise et aucune réutilisation hors sujet',async()=>{
  const {p,deps,contexts}=await setup('artisan');
  const editorial:Editorial={structure:'checklist',role:'Vérifications utiles',blocks:[{kind:'check',text:'Vérifier le support.'},{kind:'check',text:'Protéger les surfaces.'},{kind:'check',text:'Préparer les outils.'}],sources:[{label:'Procédure client',text:'Trois vérifications fournies',verified:true}]};
  const onePost=createOnePost(p,{kind:'carousel',date:'2026-11-04',time:'11:30',timezone:'UTC',platforms:[{platform:'instagram'}],headline:'Avant de commencer',caption:'Vérifier, protéger, préparer.',request:'Conserver la fin de la demande. '.repeat(30),editorial});
  run("UPDATE posts SET brief=json_set(brief,'$.roleIdea',?) WHERE id=?",'Expliquer les vérifications sans vendre',onePost.ids[0]);
  const social:SocialDeps={aiActive:true,estimate:()=>350,probable:()=>115,aiPost:(pp,post,o)=>designPostWithAi(pp,post,{aspect:'4:5',reference:null,maxCostEur:o.maxCostEur},deps),image:async()=>{throw Error('no fallback');},video:async()=>{throw Error('no video');},ad:async()=>{throw Error('no ad');},local:async()=>{throw Error('no local');},rewrite:async()=>{throw Error('no rewrite');}};
  const est=estimateProduction(p,onePost.ids,social,{allowPaid:true});expect(est.estimateMicro).toBe(345);expect(est.capMicro).toBe(1050);expect(quoteOne('carousel','ai_post',2,()=>115,3)).toBe(690);
  const out=await produceBatch(p,onePost.ids,social,{allowPaid:true,maxCostEur:1,approvedEstimateMicro:345});expect(out.produced).toBe(1);
  const row=one<any>('SELECT * FROM posts WHERE id=?',onePost.ids[0])!;const media=JSON.parse(row.media);expect(media).toHaveLength(3);expect(contexts[0].creative.editorialData.roleIdea).toBeDefined();expect(contexts[0].creative.request.length).toBeGreaterThan(600);expect(contexts[0].request.length).toBeGreaterThan(600);expect(contexts[0].creative.sources[0].label).toBe('Procédure client');
  run('UPDATE posts SET media=? WHERE id=?',JSON.stringify([media[0]]),row.id);expect(checkPost(p,row.id).codes).toContain('incomplete_carousel');
  run('UPDATE posts SET media=? WHERE id=?',JSON.stringify(media),row.id);expect(checkPost(p,row.id).codes).not.toContain('incomplete_carousel');
  const duplicated=await duplicatePostInFormat(p,row.id,'1:1');const copies=JSON.parse(one<any>('SELECT media FROM posts WHERE id=?',duplicated.id)!.media);expect(copies).toHaveLength(3);
  const preview=assetMeta<any>(getAsset(copies[0])!);expect(preview.finalImage).toBeUndefined();expect(redoRequest(preview,{aspect:'4:5'}).editorial?.blocks[0].text).toBe('Vérifier le support.');expect(getAsset(media[0])?.status).toBe('ready');
  const changed={...editorial,blocks:editorial.blocks!.map((b,i)=>i?b:{...b,text:'Vérification modifiée par le client.'})};editPostV2(p,row.id,{editorial:changed,title:'Nouveau titre exact'});
  expect(checkPost(p,row.id).codes).toContain('editorial_visual_stale');expect(JSON.parse(one<any>('SELECT brief FROM posts WHERE id=?',row.id)!.brief).headline).toBe('Nouveau titre exact');expect(getAsset(media[0])?.status).toBe('ready');
  const other=createOnePost(p,{kind:'image',date:'2026-11-05',time:'11:30',timezone:'UTC',platforms:[{platform:'instagram'}],headline:'Une FAQ différente',caption:'Un tout autre contenu',editorial:{structure:'faq'}});
  const free=await produceBatch(p,other.ids,social,{allowPaid:false,maxCostEur:0});expect(free.produced).toBe(0);expect(JSON.parse(one<any>('SELECT media FROM posts WHERE id=?',other.ids[0])!.media)).toEqual([]);
 });
 it('barrière calendrier : avis fourni utilisable, mais note ou quantité inventée toujours bloquée',async()=>{
  const {p}=await setup('artisan');const editorial:Editorial={structure:'quote',testimonial:{quote:'Les explications sont claires.',source:'Document fourni pour le test',verified:true,authorized:true}};
  const made=createOnePost(p,{kind:'image',date:'2026-11-12',time:'12:00',timezone:'UTC',platforms:[{platform:'instagram'}],headline:'Avis client',caption:'Les explications sont claires.',editorial});
  expect(checkPost(p,made.ids[0]).codes).not.toContain('invented_claim');
  editPostV2(p,made.ids[0],{caption:'Les explications sont claires. ★★★★★'});expect(checkPost(p,made.ids[0]).codes).toContain('invented_claim');
  editPostV2(p,made.ids[0],{caption:'200 avis clients satisfaits'});expect(checkPost(p,made.ids[0]).codes).toContain('invented_claim');
  editPostV2(p,made.ids[0],{caption:'Les explications sont claires.',editorial:{...editorial,testimonial:{...editorial.testimonial!,authorized:false}}});expect(checkPost(p,made.ids[0]).codes).toContain('editorial_evidence_missing');
 });
 it('conseil conçu par l’IA : des explications utiles, jamais seulement headline/subline/CTA',async()=>{
  const {p,deps}=await setup('artisan');const copy=deps.copy!;
  deps.copy=async(...a)=>({...await copy(...a)!,blocks:[{kind:'tip',text:'Comparer la préparation indiquée sur la notice fournie avant de choisir la finition.'}]} as any);
  const r=await designPostWithAi(p,{...base,id:'generated-blocks',caption:'',editorial:{structure:'advice',sources:[{label:'Notice de test',text:'La préparation dépend de la finition.',verified:true}]}},{aspect:'4:5',reference:null,maxCostEur:1},deps);
  expect(r.assetId).toBeTruthy();expect(assetMeta<any>(getAsset(r.assetId!)!).finalImage.editorialBlocks[0].text).toContain('notice fournie');
  deps.copy=async(...a)=>({...await copy(...a)!,blocks:[]} as any);
  const blocked=await designPostWithAi(p,{...base,id:'empty-advice',caption:'',editorial:{structure:'advice'}},{aspect:'4:5',reference:null,maxCostEur:1},deps);expect(blocked.assetId).toBeNull();expect(blocked.note).toContain('Contenu éditorial utile manquant');
 });
 it('worker : aucune publication complète ne se transforme en tâche terminée',async()=>{
  const {p}=await setup('artisan');const post=createOnePost(p,{kind:'image',date:'2026-11-09',time:'12:00',timezone:'UTC',platforms:[{platform:'instagram'}],caption:'Conseil fourni'});
  const {enqueue,JobContext}=await import('@/lib/jobs');const {handlers}=await import('../worker/handlers');
  const j=enqueue({userId:p.userId,projectId:p.id,type:'social.v2.produce',payload:{projectId:p.id,ids:post.ids,allowPaid:false,maxCostEur:0}});run("UPDATE jobs SET status='running' WHERE id=?",j.id);
  await expect(handlers['social.v2.produce'](new JobContext(one<any>('SELECT * FROM jobs WHERE id=?',j.id)!))).rejects.toThrow(/Aucune publication complète|No complete post/);
 });
 it('moteur publicitaire existant : insight, angle, direction, copie et plateforme atteignent finalAd',async()=>{
  const {p,ref}=await setup();const seen:any[]=[];
  grantProjectPlan(p.id,"dominer");
  await runAdEngineV2(null,p.id,{count:1,platforms:['meta_feed'],aspects:['4:5'],maxCostEur:1}, {
   canWrite:false,canReview:false,canGenerate:false,writeCopy:async()=>{throw Error('no LLM');},review:async()=>{throw Error('no LLM');},image:async()=>null,cutout:()=>null,logo:()=>null,
   finalAd:async input=>{seen.push(JSON.parse(input.campaignContext!));return {assetId:ref.id,costMicro:0};}
  });
  expect(seen.length).toBeGreaterThan(0);expect(seen[0].insight.brand).toBe(p.brand?.name);expect(seen[0].angle.material).toBeTruthy();expect(seen[0].direction.shot).toBeDefined();expect(seen[0].copy.primary).toBeTruthy();expect(seen[0].platform.platform).toBe('meta_feed');
 });
 it('CTA d’achat injecté dans un conseil organique refusé avant image ; offre organique explicite permise',async()=>{
  const {p,deps,prompts}=await setup();const copy=deps.copy!;deps.copy=async(...a)=>({...await copy(...a)!,cta:'Commander'} as any);
  const r=await designPostWithAi(p,base,{aspect:'4:5',reference:null,maxCostEur:1},deps);expect(r.assetId).toBeNull();expect(prompts).toHaveLength(0);
  const offer=await designPostWithAi(p,{...base,id:'offer',editorial:{structure:'offer'}},{aspect:'4:5',reference:null,maxCostEur:1},deps);expect(offer.assetId).toBeTruthy();
 });
});
