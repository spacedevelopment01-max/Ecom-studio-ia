/** #277 : sondes indépendantes des contrats croisés. Cognition simulée, vrais moteurs/SQL/versions, zéro réseau. */
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import sharp from 'sharp';
import {account,project,sender} from './conversation209-fixtures';
import {serviceProfile,serviceSpec} from './fixtures';
import {currentTheme,saveThemeVersion} from '@/lib/projects';
import {openProjectConversation,conversationView} from '@/lib/orchestrator/conversation';
import {ownedConversation,metaOf} from '@/lib/orchestrator/conversation/store';
import {quoteThemeChange,confirmThemeChange,runThemeChange,themeChangeReceipt,quoteThemeUndo} from '@/lib/orchestrator/conversation/theme-tool-execution';
import {quoteNativeExport,confirmNativeExport,runNativeExport,currentSiteSource} from '@/lib/orchestrator/conversation/export-tool-execution';
import {compositionContext} from '@/lib/theme/composition/server';
import {readPrestations,savePrestations} from '@/lib/contenus/prestations';
import {createAppointment} from '@/lib/salon/booking';
import {salonBlocks} from '@/lib/theme/atelier-nuance';
import {AN_SERVICES,AN_STAFF,AN_HOURS} from './atelier-nuance-fixtures';
import {createRealisation,setRealisationStatus,listRealisations} from '@/lib/contenus/realisations';
import {addCategory,createItem,setItemStatus,listCarte} from '@/lib/contenus/carte';
import {ensureSiteTables} from '@/lib/sites/store';
import {ensureNotifyTables} from '@/lib/sites/notify';
import {ensureMaintenanceTables} from '@/lib/sites/maintenance';
import {customDomains} from '@/lib/sites/domains';
import {saveAsset} from '@/lib/library';
import {claimNext,completeJob,JobContext} from '@/lib/jobs';
import {all,one,run,id,tx} from '@/lib/db';
import {balance} from '@/lib/billing';
import type {ThemeSpec} from '@/lib/theme/spec';
import type {ThemeToolPlan} from '@/lib/orchestrator/conversation/theme-tool-contract';
import type {CompositionPlan} from '@/lib/theme/composition/contract';

beforeEach(()=>{vi.spyOn(Date,'now').mockReturnValue(Date.UTC(2026,9,23,10));for(const flag of ['STUDIO_CONVERSATION_LOT_A','STUDIO_CONVERSATION_AI','STUDIO_CONVERSATION_SPECIALISTS','STUDIO_CONVERSATION_TOOLS','STUDIO_CONVERSATION_THEME_TOOLS','STUDIO_CONVERSATION_COMPOSITION','STUDIO_CONVERSATION_EXPORTS'])vi.stubEnv(flag,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('277 : aucun fournisseur ni réseau');}));});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();vi.unstubAllGlobals();});
async function fixture(direction:string){
 const u=await account(),pid=project(u,'services'),c=openProjectConversation(u,pid),send=sender(u,c.id);
 const spec=JSON.parse(JSON.stringify(serviceSpec(direction as never,'fr',serviceProfile)).replace(/"es-(hero|scene-\d)\.jpg"/g,'""')) as ThemeSpec;
 saveThemeVersion(pid,spec,'Entreprise fictive de contre-vérification','user');
 return{u,pid,c,send};
}
type Fixture=Awaited<ReturnType<typeof fixture>>;
function propose(f:Fixture,plan:ThemeToolPlan|CompositionPlan){
 const c=ownedConversation(f.u,f.c.id),m=metaOf(c),v=conversationView(f.u,f.c.id),rid=id();
 m.intelligence={lastReceiptId:rid,sourceRevision:c.revision,sourceProjectRevision:v.projectRevision,lastReply:{message:'[SIMULATION] Proposition à confirmer, aucune exécution.',status:'answer',business:null,businessEvidence:null,question:null,proposedChanges:[],knowledgeSourceIds:[],proposedTools:['tool'in plan?'theme.edit':'theme.compose'],...('tool'in plan?{themePlan:plan}:{compositionPlan:plan}),actionsExecuted:false}};
 run('UPDATE agent_conversations SET state_json=? WHERE id=?',JSON.stringify(m),c.id);
 return quoteThemeChange(f.u,f.c.id,{action:'quote',revision:v.revision,projectRevision:v.projectRevision!,proposalReceiptId:rid});
}
function confirm(f:Fixture,qid:string){return confirmThemeChange(f.u,f.c.id,{action:'confirm',quoteId:qid,confirmation:true,requestId:id()});}
async function finishTheme(){const j=claimNext(['agent.theme.change'])!;expect(j).toBeTruthy();const result=await runThemeChange(new JobContext(j));completeJob(j.id,result);return result;}
async function realization(f:Fixture){
 const photo=await saveAsset({projectId:f.pid,userId:f.u.id,data:await sharp({create:{width:300,height:200,channels:3,background:'#48665c'}}).png().toBuffer(),name:'preuve-technique.png',mime:'image/png',origin:'upload',status:'approved'});
 const r=createRealisation(f.pid,{title:'Assemblage de bibliothèque fictif',summary:'Étagères ajustées dans la base isolée.',photos:[{assetId:photo.id,alt:'Illustration technique de recette'}]});setRealisationStatus(f.pid,r.id,'published');return r;
}

it('tables à la demande : création annulée puis nouvelle utilisation, sans état prêt périmé',async()=>{
 const u=await account(),pid=project(u,'services');
 const operations=[()=>listCarte(pid),()=>listRealisations(pid),()=>ensureSiteTables(),()=>ensureNotifyTables(),()=>ensureMaintenanceTables(),()=>customDomains(pid)];
 for(const operation of operations){expect(()=>tx(()=>{operation();throw Error('annulation volontaire 277');})).toThrow('annulation volontaire 277');expect(()=>operation()).not.toThrow();}
 expect(all('SELECT id FROM ai_calls WHERE project_id=?',pid)).toHaveLength(0);
});

it('C1 : modification de carte après accord détectée au worker malgré une version de thème inchangée',async()=>{
 const f=await fixture('table-saison'),cat=addCategory(f.pid,'Petites assiettes'),item=createItem(f.pid,{categoryId:cat.id,name:'Assiette de légumes fictive',price:12});setItemStatus(f.pid,item.id,'published');
 const cur=currentTheme(f.pid)!,before=currentSiteSource(f.pid,cur.version.id),v=conversationView(f.u,f.c.id),credit=balance(f.u.id);
 const q=quoteNativeExport(f.u,f.c.id,{action:'quote',revision:v.revision,projectRevision:v.projectRevision!,versionId:cur.version.id,platform:'wix',requestNew:false});expect(q.kind).toBe('quote');if(q.kind!=='quote')throw Error('devis requis');
 confirmNativeExport(f.u,f.c.id,{action:'confirm',quoteId:q.quote.id,confirmation:true,requestId:id()});
 setItemStatus(f.pid,item.id,'withdrawn');
 expect(currentTheme(f.pid)!.version.id).toBe(cur.version.id);expect(currentSiteSource(f.pid,cur.version.id).sourceDigest).not.toBe(before.sourceDigest);
 const job=claimNext(['agent.theme.export'])!;await expect(runNativeExport(new JobContext(job))).rejects.toThrow(/catalogue|données|Site/);
 expect(all("SELECT id FROM assets WHERE project_id=? AND role='theme-export'",f.pid)).toHaveLength(0);expect(balance(f.u.id)).toEqual(credit);expect(all('SELECT id FROM ai_calls WHERE project_id=?',f.pid)).toHaveLength(0);
});

it('P1 : une réalisation publiée après accord bloque aussi la retouche au worker avant toute fausse version',async()=>{
 const f=await fixture('atelier'),replacement='Une bibliothèque ajustée à votre pièce.';await f.send({action:'message',text:`Remplace le titre de la galerie par « ${replacement} ».`});
 const cur=currentTheme(f.pid)!,sid=cur.spec.templates.index.order.find(s=>cur.spec.templates.index.sections[s].type==='portfolio')!;expect(sid).toBeTruthy();
 const q=propose(f,{tool:'theme.edit',versionId:cur.version.id,summary:'Titre exact de la galerie',ops:[{op:'set_setting',template:'index',section:sid,key:'heading',value:replacement}]});confirm(f,q.id);await realization(f);
 const job=claimNext(['agent.theme.change'])!;await expect(runThemeChange(new JobContext(job))).rejects.toMatchObject({status:409,code:'agent_theme_business_content'});
 expect(currentTheme(f.pid)!.version.id).toBe(cur.version.id);expect(themeChangeReceipt(f.u,f.c.id,q.id).delivered).toBe(false);expect(all('SELECT id FROM ai_calls WHERE project_id=?',f.pid)).toHaveLength(0);
});

async function salon(){
 const f=await fixture('atelier-nuance'),spec=structuredClone(currentTheme(f.pid)!.spec),sid=spec.groups.header.order.find(s=>spec.groups.header.sections[s].type==='an-salon')!,sec=spec.groups.header.sections[sid];
 const blocks=salonBlocks(AN_SERVICES.map(s=>({id:s.id,name:s.name,category:s.category,short:s.short,duration:s.duration,price:s.price,from:s.from})),AN_STAFF.map(m=>({id:m.id,name:m.name,initial:m.initial,title:m.title,skills:m.skills,days:m.days})));
 sec.blocks=Object.fromEntries(blocks.map((b,i)=>['b'+i,b]));sec.block_order=blocks.map((_,i)=>'b'+i);Object.assign(sec.settings,{booking_mode:'live',service_url:'https://studio.example.invalid/api/public/salon/x',hours_tue:AN_HOURS.tue,hours_wed:AN_HOURS.wed,hours_thu:AN_HOURS.thu,hours_fri:AN_HOURS.fri,hours_sat:AN_HOURS.sat});saveThemeVersion(f.pid,spec,'Horaires fictifs fournis','user');
 await f.send({action:'message',text:'Ajoute une section avec mes textes acquis sans changer les prestations ou les rendez-vous.'});
 const cur=currentTheme(f.pid)!,context=compositionContext(f.u,f.pid),copy=context.sources.find(s=>s.kind==='copy'&&s.scope==='home')!;expect(copy).toBeTruthy();
 const plan:CompositionPlan={schema:1,versionId:cur.version.id,mode:'hybrid',summary:'Texte acquis supplémentaire, réservation conservée',pages:[{template:'index',sections:[...cur.spec.templates.index.order.map(section=>({kind:'existing' as const,section,bindings:[],layout:[]})),{kind:'component',id:'information277',type:'rich-text',blocks:[{id:'titre277',type:'heading'}],layout:[],bindings:[{block:'titre277',key:'text',source:copy.id}]}]}]};
 return{...f,plan,initial:cur};
}
function serviceData(pid:string){const{versionId:_version,...data}=readPrestations(pid)!;return data;}
const booking={service:'coupe-brushing',staff:'camille',date:'2026-11-10',time:'14:00',firstName:'Julie',lastName:'Fictive',email:'julie@example.test',phone:'06 00 00 00 00',terms:true};
const bookingAt=Date.UTC(2026,9,23,10);
it('P5 : vraie réservation conservée après composition native, annulation et réouverture',async()=>{
 const f=await salon(),booked=createAppointment(f.pid,booking,bookingAt).appointment,before=serviceData(f.pid),saved=one('SELECT * FROM salon_appointments WHERE id=?',booked.id),q=propose(f,f.plan);
 confirm(f,q.id);await finishTheme();const receipt=themeChangeReceipt(f.u,f.c.id,q.id);expect(receipt.delivered).toBe(true);expect(serviceData(f.pid)).toEqual(before);expect(currentTheme(f.pid)!.spec.groups.header).toEqual(f.initial.spec.groups.header);
 expect(()=>createAppointment(f.pid,booking,bookingAt)).toThrow();
 const undo=quoteThemeUndo(f.u,f.c.id,{action:'quote-undo',receiptId:q.id,currentVersionId:receipt.version!.id});confirm(f,undo.id);await finishTheme();
 expect(currentTheme(f.pid)!.spec).toEqual(f.initial.spec);expect(serviceData(f.pid)).toEqual(before);expect(one('SELECT * FROM salon_appointments WHERE id=?',booked.id)).toEqual(saved);expect(()=>createAppointment(f.pid,booking,bookingAt)).toThrow();
 expect(createAppointment(f.pid,{...booking,time:'15:00',email:'autre@example.test'},bookingAt).appointment.id).not.toBe(booked.id);expect(conversationView(f.u,f.c.id).id).toBe(f.c.id);expect(all('SELECT id FROM ai_calls WHERE project_id=?',f.pid)).toHaveLength(0);
});

it('P5 : correction humaine des prestations pendant la file refuse la composition obsolète et reste intacte',async()=>{
 const f=await salon(),q=propose(f,f.plan);confirm(f,q.id);const edit=savePrestations(f.pid,{address:'8 rue Fictive de la Recette, Lyon'}),human=currentTheme(f.pid)!,job=claimNext(['agent.theme.change'])!;
 await expect(runThemeChange(new JobContext(job))).rejects.toThrow(/changé/);expect(currentTheme(f.pid)!.version.id).toBe(human.version.id);expect(readPrestations(f.pid)!.versionId).toBe(edit.versionId);expect(readPrestations(f.pid)!.address).toBe('8 rue Fictive de la Recette, Lyon');expect(themeChangeReceipt(f.u,f.c.id,q.id).delivered).toBe(false);
});
