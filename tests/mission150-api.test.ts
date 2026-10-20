/** Native routes with synthetic account/session; all network access refused. */
import {it,expect,vi,beforeEach,afterEach} from 'vitest';
let user:any=null;
vi.mock('@/lib/auth',async original=>({...await original<typeof import('@/lib/auth')>(),requireUser:async()=>user,currentUser:async()=>user}));
import {createUser} from '@/lib/auth';
import {id,now,one,run} from '@/lib/db';
import {grantProjectPlan} from '@/lib/project-subscriptions';
import {demoProject} from './demo-fixtures';
import {currentTheme,saveThemeVersion} from '@/lib/projects';
import {GET as theme} from '@/app/api/projects/[id]/theme/route';
import {POST as sections} from '@/app/api/projects/[id]/theme/sections/route';
import {POST as ops} from '@/app/api/projects/[id]/theme/ops/route';
import {POST as ads} from '@/app/api/projects/[id]/campaigns/v2/route';
import {GET as calls} from '@/app/api/calls/route';
import {runWithLang} from '@/lib/i18n-server';
beforeEach(()=>vi.stubGlobal('fetch',async()=>{throw new Error('No external network in mission150 tests');}));afterEach(()=>vi.unstubAllGlobals());
const ctx=(id:string)=>({params:Promise.resolve({id})}) as never;
const post=(b:any)=>new Request('http://localhost/test',{method:'POST',body:JSON.stringify(b),headers:{'content-type':'application/json'}});
const fr=<T,>(fn:()=>T)=>runWithLang({ui:'fr',content:'fr'},fn);
it.each(['creer','vendre','dominer'] as const)('%s : galerie native de la famille filtrée, thème existant conservé et modification permise',async plan=>{
 user=await createUser(`api150-${id()}@example.test`,'test-password-150','API isolée');const d=await fr(()=>demoProject(user.id,'fraise'));grantProjectPlan(d.pid,plan);if(!currentTheme(d.pid))saveThemeVersion(d.pid,d.spec,'Fixture native','user');
 const result=await fr(()=>theme(new Request('http://localhost/test'),ctx(d.pid)));expect(result.status).toBe(200);const data=await result.json();expect(data.library.filter((x:any)=>x.addable!==false)).toHaveLength(plan==='creer'?8:plan==='vendre'?12:20);
 const before=currentTheme(d.pid)!.version.number;
 const rejected=await fr(()=>sections(post({type:'fam:specialty.press',template:'index'}),ctx(d.pid)));expect(rejected.status).toBe(plan==='dominer'?200:402);
 if(plan!=='dominer')expect(currentTheme(d.pid)!.version.number).toBe(before);
 const accepted=await fr(()=>sections(post({type:'fam:specialty.faq',template:'index'}),ctx(d.pid)));expect(accepted.status).toBe(200);
 const spec=currentTheme(d.pid)!.spec;const sid=spec.templates.index.order.find(x=>spec.templates.index.sections[x].type==='cv-hero')!;
 const edited=await fr(()=>ops(post({ops:[{op:'set_setting',template:'index',section:sid,key:'heading',value:'Texte conservé de mon projet'}]}),ctx(d.pid)));expect(edited.status).toBe(200);expect(currentTheme(d.pid)!.spec.templates.index.sections[sid].settings.heading).toBe('Texte conservé de mon projet');
});
it('devis publicitaire et appel disponibles : refus avant fournisseur et isolation des comptes',async()=>{
 user=await createUser(`api150-quote-${id()}@example.test`,'test-password-150','API isolée');const d=await fr(()=>demoProject(user.id,'orbe'));grantProjectPlan(d.pid,'vendre');
 const response=await fr(()=>ads(post({action:'ai_quote'}),ctx(d.pid)));expect(response.status).toBe(402);expect((await response.json()).code).toBe('plan_upgrade');expect(one<{n:number}>('SELECT COUNT(*) n FROM ai_calls WHERE project_id=?',d.pid)?.n).toBe(0);
 const rdv=await fr(()=>calls());expect(rdv.status).toBe(200);const body=await rdv.json();expect(body.projects.find((p:any)=>p.id===d.pid)).toMatchObject({plan:'vendre',priceEur:30,state:'available'});expect(Array.isArray(body.slots)).toBe(true);expect(body.slots.every((s:any)=>s.startsAt>Date.now())).toBe(true);
 user=await createUser(`api150-foreign-${id()}@example.test`,'test-password-150','Compte distinct');expect((await fr(()=>ads(post({action:'ai_quote'}),ctx(d.pid)))).status).toBe(404);const own=await(await fr(()=>calls())).json();expect(own.projects).toEqual([]);
});
it.each(['creer','vendre','dominer'] as const)('%s : niveaux IA et création de pages appliqués sans modèle IA réel',async plan=>{
 user=await createUser(`api150-edition-${id()}@example.test`,'test-password-150','Édition isolée');const d=await fr(()=>demoProject(user.id,'fraise'));grantProjectPlan(d.pid,plan);if(!currentTheme(d.pid))saveThemeVersion(d.pid,d.spec,'Fixture native','user');
 const {assertThemeOperations}=await import('@/lib/theme/plan-access');const {assertPageModels}=await import('@/lib/plan-gates');const spec=currentTheme(d.pid)!.spec;
 const sid=spec.templates.index.order.find(x=>spec.templates.index.sections[x].type==='cv-hero')!;
 expect(()=>assertThemeOperations(d.pid,spec,[{op:'set_setting',template:'index',section:sid,key:'heading',value:'Ma demande exacte'}],true)).not.toThrow();
 const structural=()=>assertThemeOperations(d.pid,spec,[{op:'duplicate_section',template:'index',section:sid}],true);
 const custom=()=>assertThemeOperations(d.pid,spec,[{op:'custom_section',type:'es-custom-test',name:'Test',liquid:'test'}],true);
 if(plan==='creer'){expect(structural).toThrow(/avancée|structure/);expect(()=>assertPageModels(d.pid)).toThrow();}else{expect(structural).not.toThrow();expect(()=>assertPageModels(d.pid)).not.toThrow();}
 if(plan==='dominer')expect(custom).not.toThrow();else expect(custom).toThrow();
 const pageRoute=await import('@/app/api/projects/[id]/theme/pages/route');const pageInfo=await(await fr(()=>pageRoute.GET(new Request('http://localhost/test'),ctx(d.pid)))).json();expect(pageInfo.canUseModels).toBe(plan!=='creer');
});
it.each(['creer','vendre'] as const)('%s : demande de campagne ignorée avec raison dès le devis puis au worker, aucune création ni dépense',async plan=>{
 user=await createUser(`workflow150-${id()}@example.test`,'test-password-150','Workflow isolé');const d=await fr(()=>demoProject(user.id,'fraise'));grantProjectPlan(d.pid,plan);if(!currentTheme(d.pid))saveThemeVersion(d.pid,d.spec,'Fixture native','user');
 const wf=await import('@/lib/workflow');const {JobContext,getJob}=await import('@/lib/jobs');
 const prepared=await fr(()=>wf.prepareWorkflow(d.pid,user.id,'Prépare une campagne publicitaire',{aiActive:false}));
 expect(prepared.estimate.lines.find(l=>l.kind==='ad')).toMatchObject({mode:'skip',paid:false,estimateMicro:0});
 const started=wf.startWorkflow(prepared.id,{});const result=await fr(()=>wf.runWorkflow(new JobContext(getJob(started.jobId!)!)));
 expect(result.steps.find(s=>s.kind==='ad')).toMatchObject({status:'skipped'});expect(result.steps.find(s=>s.kind==='ad')?.reason).toMatch(/Dominer/);
 expect(one<{n:number}>('SELECT COUNT(*) n FROM ad_documents WHERE project_id=?',d.pid)?.n).toBe(0);expect(one<{n:number}>('SELECT COUNT(*) n FROM ai_calls WHERE project_id=?',d.pid)?.n).toBe(0);
});
