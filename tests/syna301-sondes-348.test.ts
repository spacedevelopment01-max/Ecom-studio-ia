/**
 * #301 vague 2 — sondes des phrases réelles sur la convergence #348, gardées comme garde-fous permanents.
 *
 * 1. Seize phrases qu'un client écrit vraiment (site, sections, pages, thème, SEO, horaires, prestations, calendrier,
 *    stock), envoyées à SINA sur un projet de services avec une section désignée : quelle que soit la réponse (carte
 *    gratuite, précision demandée ou réflexion sur devis), RIEN n'est écrit sans accord explicite et AUCUN appel IA
 *    n'a lieu. Le relevé exact (quelle phrase donne quelle carte) est écrit dans PROBE_OUT si la variable est fournie :
 *    c'est la preuve des actions SINA absentes transmise à Codex. Il n'est pas figé ici, pour que chaque nouveau
 *    contrat de Codex le fasse évoluer sans casser ce test.
 *    Le même relevé est fait sur le moteur local natif de l'onglet Boutique (localFirst, section désignée) : il montre
 *    ce que le Studio sait déjà faire gratuitement et que SINA n'atteint pas encore (« moteur local d'abord »).
 * 2. « Agrandis le titre » sur chaque création du moteur V2 (outils simulés) : la réponse est soit une proposition
 *    gratuite, soit un refus explicite 422 ; jamais une écriture avant l'accord.
 *
 * Fournisseurs refusés (fetch interdit), comptes fictifs, base de test isolée.
 */
import {beforeEach,expect,it,vi} from 'vitest';
import fs from 'node:fs';
import sharp from 'sharp';

const auth=vi.hoisted(()=>({user:null as unknown}));
vi.mock('@/lib/auth',async original=>({...await original<Record<string,unknown>>(),requireUser:async()=>auth.user,currentUser:async()=>auth.user}));

import {localSiteFixture} from './conversation284-b1-fixtures';
import {account,project} from './conversation209-fixtures';
import {seedImageFixture,seedCutout} from './image-v2-fixtures';
import {mockAdDeps} from './ads-v2-mock';
import {submitConversation,conversationView,openProjectConversation} from '@/lib/orchestrator/conversation';
import {submitContext} from '@/lib/orchestrator/conversation/context-session';
import {emptyInput} from '@/lib/orchestrator/conversation/store';
import {initialize} from '@/lib/preparation/engine';
import {createProjectWithSubscription} from '@/lib/project-billing';
import {runAdEngineV2} from '@/lib/ads-v2/engine';
import {runWithLang} from '@/lib/i18n-server';
import {saveAsset,getAsset,assetData} from '@/lib/library';
import {latestDoc} from '@/lib/ad-doc/store';
import {localAdEdit} from '@/lib/ad-doc/local-edit';
import {applyOps as applyAdOps} from '@/lib/ad-doc/ops';
import {currentTheme,loadProject,saveServices} from '@/lib/projects';
import {emptyServiceProfile} from '@/lib/project-types';
import {POST} from '@/app/api/studio-agent/conversations/[cid]/ad-documents/route';
import {all,id,one} from '@/lib/db';
import {localFirst} from '@/lib/engine/local-first';

const FLAGS=['LOT_A','AI','CONTEXT','LOCAL_SITE','FILES','BUSINESS_CONTENT','SITE_REQUESTS','PROMPTS','AD_DOCUMENT_LOCAL','SPECIALISTS','TOOLS','SERVICE_PROFILE'];
beforeEach(()=>{for(const k of FLAGS)vi.stubEnv('STUDIO_CONVERSATION_'+k,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('fournisseur interdit');}));});
const aiCalls=()=>one<{n:number}>('SELECT COUNT(*) n FROM ai_calls')!.n;
const record=(name:string,data:unknown)=>{if(process.env.PROBE_OUT)fs.writeFileSync(`${process.env.PROBE_OUT}-${name}.json`,JSON.stringify(data,null,1)+'\n');};

export const PHRASES:[string,string][]=[
 ['C05 titre (B1)','Remplace le titre de cette section par « Titre sondé »'],
 ['C05 couleur du titre','Mets le titre de cette section en rouge'],
 ['C05 couleur principale','Change la couleur principale du site en #1e3a8a'],
 ['C07 masquer section','Masque cette section'],
 ['C07 supprimer section','Supprime cette section'],
 ['C07 ajouter section','Ajoute une section FAQ après cette section'],
 ['C07 ajouter page','Ajoute une page « Nos garanties »'],
 ['C05 bouton','Remplace le texte du bouton de cette section par « Demander un devis »'],
 ['C05 image','Remplace l’image de cette section par la photo de l’atelier'],
 ['C05 annuler','Annule la dernière retouche du site'],
 ['C06 thème','Choisis le thème Rive pour mon site'],
 ['C15 SEO','Remplace le titre SEO de la page d’accueil par « Aménagement de vans à Lyon »'],
 ['C22 horaires','Change les horaires du mardi : 9 h – 18 h'],
 ['C21 prestation','Renomme cette prestation en « Aménagement complet »'],
 ['C16 calendrier','Déplace ma prochaine publication au 12 novembre'],
 ['C12 stock','Mets le stock de ce produit à 12'],
];

it('phrases réelles : aucune écriture sans accord, aucun appel IA, relevé de la carte obtenue',async()=>{
 const out:unknown[]=[];
 for(const [op,text] of PHRASES){
  const f=await localSiteFixture('services');f.select();
  const before=currentTheme(f.pid)!.version.number,calls=aiCalls();
  let erreur:string|null=null;try{await submitConversation(f.u,f.c.id,f.message(text));}catch(e){erreur=String((e as Error).message).slice(0,160);}
  const v=conversationView(f.u,f.c.id);
  expect(currentTheme(f.pid)!.version.number,`${op} : écriture sans accord`).toBe(before);
  expect(aiCalls(),`${op} : appel IA`).toBe(calls);
  out.push({op,text,erreur,carteGratuite:v.localSite?{state:v.localSite.state,message:String(v.localSite.message).slice(0,160)}:null,seo:v.localSeo?{state:v.localSeo.state,message:String(v.localSeo.message).slice(0,120)}:null,pages:v.localPages?{state:v.localPages.state,message:String(v.localPages.message).slice(0,120)}:null,horaires:v.serviceProfile?{state:v.serviceProfile.state,message:String(v.serviceProfile.message).slice(0,120)}:null,reponse:String(v.message??'').slice(0,160),intelligence:v.intelligence?.state??null});
 }
 // La seule grammaire gratuite du site connue au relevé #348 (B1) reste disponible.
 expect(out[0]).toMatchObject({carteGratuite:{state:'proposed'}});
 record('phrases',out);
},240000);

it('moteur local natif (onglet Boutique, section désignée) sur les mêmes phrases : relevé, aucun appel IA',async()=>{
 const f=await localSiteFixture('services'),out:unknown[]=[];
 for(const [op,text] of PHRASES){
  const r=localFirst(f.cur.spec,text,{template:f.template,section:f.section} as never,[],'services',()=>null,null);
  out.push({op,text,natifGratuit:!!r&&(r.ops.length>0||r.revert||!!r.direction),ops:r?.ops.map(o=>o.op)??[],annulation:r?.revert??false,direction:r?.direction??null,reponse:r?.reply?.slice(0,160)??null});
 }
 expect(aiCalls()).toBe(0);
 record('natif',out);
},120000);

it('« Agrandis le titre » sur les créations du moteur V2 : proposition gratuite ou refus explicite, jamais d’écriture',async()=>{
 const out:Record<string,unknown>[]=[];
 // Même jeu que la sonde d'origine : 3 créations par lot, fil, story et les deux (18 créations brutes, aucune aménagée).
 for(const platforms of [['meta_feed'],['meta_story'],['meta_feed','meta_story']]){
  const u=await account();auth.user=u;
  const pid=createProjectWithSubscription(u.id,null,()=>{const p=seedImageFixture(u.id,'cosmetic');return{projectId:p,result:p};});
  const cutId=await seedCutout(u.id,pid),logoPng=await sharp({create:{width:400,height:120,channels:3,background:'#fff'}}).png().toBuffer();
  const logo=await saveAsset({projectId:pid,userId:u.id,data:logoPng,name:'logo.png',mime:'image/png',role:'logo',origin:'generated'});
  const {deps}=mockAdDeps({userId:u.id,projectId:pid,cutout:{id:cutId,data:assetData(getAsset(cutId)!)},logo:{id:logo.id,data:logoPng}});
  await runWithLang({ui:'fr',content:'fr'},()=>runAdEngineV2(null,pid,{count:3,platforms:platforms as never},deps));
  {const p=loadProject(pid);initialize(pid,{...emptyInput(),business:p.business,offerName:p.product.name,description:p.product.summary,services:p.services});}
  const c=openProjectConversation(u as never,pid),v=()=>conversationView(u as never,c.id);
  for(const d of all<{doc_key:string}>('SELECT DISTINCT doc_key FROM ad_documents WHERE project_id=?',pid)){
   const l=latestDoc(pid,d.doc_key);if(!l)continue;const titles=l.doc.layers.filter(x=>x.role==='title');
   if(titles.length!==1)continue;
   const versions=()=>one<{n:number}>('SELECT COUNT(*) n FROM ad_documents WHERE project_id=? AND doc_key=?',pid,d.doc_key)!.n,n0=versions();
   submitContext(u as never,c.id,{action:'select',revision:v().revision,requestId:id(),context:{projectId:pid,tab:'publicites',target:{kind:'ad-document-text',docKey:d.doc_key,layerId:titles[0].id,version:l.version.version}}});
   const r=await POST(new Request('http://localhost/x',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json'},body:JSON.stringify({action:'propose',revision:v().revision,projectRevision:v().projectRevision,docKey:d.doc_key,layerId:titles[0].id,expectedVersion:l.version.version,operation:'title-larger'})}),{params:Promise.resolve({cid:c.id})});
   const body=await r.json() as {state?:string;error?:string;nativeEffects?:{field:string;layerId?:string;property?:string;secondary?:boolean}[]};
   expect([200,422]).toContain(r.status);
   if(r.status===422)expect(body.error).toMatch(/calque|cadre|alternative/i);
   expect(versions(),'écriture avant l’accord').toBe(n0);
   // Résultat du moteur natif : calques réellement modifiés, annonce avant accord, chevauchements texte / bouton.
   const edit=localAdEdit(l.doc,'agrandis le titre'),after=edit.local?applyAdOps(l.doc,edit.ops):l.doc;
   const moved=after.layers.filter(x=>{const o=l.doc.layers.find(y=>y.id===x.id)!;return JSON.stringify(o)!==JSON.stringify(x);});
   const announced=new Set((body.nativeEffects??[]).map(e=>e.layerId??titles[0].id));
   const secondaryOnlyY=moved.filter(x=>x.id!==titles[0].id).every(x=>{const o=l.doc.layers.find(y=>y.id===x.id)! as Record<string,unknown>;return Object.keys(x).every(k=>k==='y'||k==='userEdited'||JSON.stringify((x as Record<string,unknown>)[k])===JSON.stringify(o[k]));});
   const boxes=after.layers.filter(x=>x.visible&&(x.kind==='text'||x.kind==='button')),hit=(a:{x:number;y:number;w:number;h:number},b:{x:number;y:number;w:number;h:number})=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
   const overlapsBefore=new Set<string>(),overlapsAfter:string[]=[];
   for(const [i,a] of l.doc.layers.filter(x=>x.visible&&(x.kind==='text'||x.kind==='button')).entries())for(const b of l.doc.layers.filter(x=>x.visible&&(x.kind==='text'||x.kind==='button')).slice(i+1))if(hit(a,b))overlapsBefore.add(a.id+'|'+b.id);
   for(const [i,a] of boxes.entries())for(const b of boxes.slice(i+1))if(hit(a,b)&&!overlapsBefore.has(a.id+'|'+b.id))overlapsAfter.push(`${a.name??a.id}/${b.name??b.id}`);
   if(r.status===200){expect(moved.every(x=>announced.has(x.id)),'calque modifié non annoncé avant accord').toBe(true);expect(secondaryOnlyY,'un calque secondaire change autre chose que sa position verticale').toBe(true);}
   out.push({platforms,doc:d.doc_key,status:r.status,result:body.state??body.error??'',calquesModifies:moved.map(x=>`${x.name??x.id}${x.id===titles[0].id?' (titre)':' (y)'}`),annonces:[...announced].length,nouveauxChevauchements:overlapsAfter});
  }
 }
 expect(out.length).toBeGreaterThan(0);
 expect(aiCalls()).toBe(0);
 record('publicite',out);
},300000);

it('horaires depuis leur écran naturel (Activité) : phrase d’origine et phrase exacte documentée, aucune écriture sans accord',async()=>{
 const out:unknown[]=[];
 for(const [label,text] of [['C22 horaires (phrase d’origine, écran Activité)',PHRASES.find(([op])=>op==='C22 horaires')![1]],['C22 horaires (phrase exacte du contrat #355, hors des 16)','Remplace les horaires du profil d’activité par « Mardi 10–18 »']]){
  const u=await account(),pid=project(u,'services'),c=openProjectConversation(u,pid);saveServices(pid,{...emptyServiceProfile(),hours:'Lundi 09–17'});
  const before=loadProject(pid).services.hours,v=conversationView(u,c.id);let erreur:string|null=null;
  try{await submitConversation(u,c.id,{action:'message',revision:v.revision,projectRevision:v.projectRevision,requestId:id(),text,context:{tab:'produit',target:null}} as never);}catch(e){erreur=String((e as Error).message).slice(0,160);}
  const after=conversationView(u,c.id);
  expect(loadProject(pid).services.hours,`${label} : écriture sans accord`).toBe(before);
  out.push({op:label,text,erreur,carte:after.serviceProfile?{state:after.serviceProfile.state,message:String(after.serviceProfile.message).slice(0,160)}:null,reponse:String(after.message??'').slice(0,160),intelligence:after.intelligence?.state??null});
 }
 expect(aiCalls()).toBe(0);
 record('horaires',out);
},120000);
