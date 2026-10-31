/** A2 : vraies données/routes/versions, aucune IA réelle ni copie du DOM. */
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const jar=vi.hoisted(()=>({token:''}));
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>jar.token?{value:jar.token}:undefined,set:()=>{},delete:()=>{}})}));
import * as route from '@/app/api/studio-agent/conversations/[cid]/context/route';
import * as themeRoute from '@/app/api/studio-agent/conversations/[cid]/theme-tools/route';
import {account,project,sender,emptySpend} from './conversation209-fixtures';
import {historicalProject,businessFingerprints} from './conversation284-fixtures';
import {seedAgentUiSite} from '../scripts/agent211-ui-fixtures';
import {openProjectConversation,conversationView,submitConversation} from '@/lib/orchestrator/conversation';
import {ownedConversation,metaOf} from '@/lib/orchestrator/conversation/store';
import {contextView,submitContext,checkedContextPin} from '@/lib/orchestrator/conversation/context-session';
import {resolveActiveContext} from '@/lib/orchestrator/conversation/active-context';
import {ActiveContextSchema,contextFromNativePreview} from '@/lib/orchestrator/conversation/active-context-contract';
import {themeToolContext} from '@/lib/orchestrator/conversation/theme-tool-context';
import {currentTheme,saveThemeVersion} from '@/lib/projects';
import {stateOf} from '@/lib/preparation/store';
import {id,now,one,run,all} from '@/lib/db';
import {sha256} from '@/lib/secrets';
import {quoteThemeChange,confirmThemeChange,runThemeChange} from '@/lib/orchestrator/conversation/theme-tool-execution';
import {claimNext,JobContext,completeJob} from '@/lib/jobs';
import type {ActiveContext} from '@/lib/orchestrator/conversation/active-context-contract';
import type {ThemeToolPlan} from '@/lib/orchestrator/conversation/theme-tool-contract';

beforeEach(()=>{jar.token='';for(const k of ['LOT_A','AI','CONTEXT','SPECIALISTS','TOOLS','THEME_TOOLS'])vi.stubEnv('STUDIO_CONVERSATION_'+k,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('A2 : réseau interdit');}));});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
async function fixture(business:'products'|'services'='products',historical=false){
 const f=historical?await historicalProject(business):await(async()=>{const u=await account(),pid=project(u,business),c=openProjectConversation(u,pid);await sender(u,c.id)({action:'message',text:'Description exacte de la recette A2'});await seedAgentUiSite(pid,business);return{u,pid};})();
 const c=openProjectConversation(f.u,f.pid),cur=currentTheme(f.pid)!,native=themeToolContext(f.pid);
 const text=native.targets!.find(t=>t.template==='index'&&t.fields.some(x=>x.key==='heading'))!;
 const image=native.targets!.find(t=>t.template==='index'&&t.fields.some(x=>x.type==='image_picker'&&x.nativeMedia?.assetId))!;
 const imageKey=image.fields.find(x=>x.type==='image_picker'&&x.nativeMedia?.assetId)!.key;
 const field=(key='heading',section=text.section):ActiveContext=>({projectId:f.pid,tab:'boutique',target:{kind:'theme-field',versionId:cur.version.id,template:'index',section,key,pagePath:'/'}});
 const selected=()=>contextView(f.u,c.id),select=(context:ActiveContext)=>submitContext(f.u,c.id,{action:'select',revision:selected().revision,requestId:id(),context});
 return{...f,c,cur,text,image,imageKey,field,selected,select};
}
function login(uid:string){jar.token=id();run('INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)',sha256(jar.token),uid,now()+3600000,now());}
const req=(data?:unknown,query='')=>new Request('http://localhost/api/context'+query,{method:data===undefined?'GET':'POST',headers:{origin:'http://localhost','content-type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});
const ctx=(cid:string)=>({params:Promise.resolve({cid})});

it.each(['products','services'] as const)('texte, image et section %s : sources natives exactes, aucun octet métier changé',async business=>{
 const f=await fixture(business,true),before=businessFingerprints(),spend=emptySpend();
 const text=f.select(f.field());expect(text.state).toBe('valid');expect(text.target).toMatchObject({kind:'theme-field',text:f.cur.spec.templates.index.sections[f.text.section].settings.heading,contentRead:true,canonical:{projectId:f.pid,provenance:'server_native_read',authorizationGranted:false}});
 const image=f.select(f.field(f.imageKey,f.image.section));expect(image.target).toMatchObject({kind:'theme-field',contentRead:false,media:{kind:'image',version:1}});
 const section=f.select({projectId:f.pid,tab:'boutique',target:{kind:'theme-section',versionId:f.cur.version.id,template:'index',section:f.text.section}});expect(section.state).toBe('valid');
 const v=conversationView(f.u,f.c.id);expect(v.activeContext?.presentation?.effects.readOnlyProject).toBe(true);expect(v.recovery?.actionsEnabled).toBe(false);expect(v.intelligence).toBeUndefined();expect(stateOf(f.pid)).toBeNull();expect(emptySpend()).toEqual(spend);expect(businessFingerprints()).toEqual(before);expect(fetch).not.toHaveBeenCalled();
});

it('adresse preview native, répertoire serveur et bloc : aucune URL/texte DOM utilisé comme preuve',async()=>{
 const f=await fixture();login(f.u.id);const directory=await route.GET(req(undefined,'?directory=1'),ctx(f.c.id));expect(directory.status).toBe(200);expect((await directory.json()).directory.versionId).toBe(f.cur.version.id);
 const native={projectId:f.pid,versionId:f.cur.version.id,pagePath:'/',template:'index',section:f.text.section,key:'heading'};
 const response=await route.POST(req({action:'select-preview',revision:f.selected().revision,requestId:id(),native}),ctx(f.c.id));expect(response.status).toBe(200);expect((await response.json()).target.text).toBe(f.cur.spec.templates.index.sections[f.text.section].settings.heading);
 for(const extra of [{text:'Faux texte client'},{src:'https://intrus.invalid/image'},{path:'h1:nth-child(1)'}])expect(()=>contextFromNativePreview({...native,...extra})).toThrow();
 const blockTarget=themeToolContext(f.pid).targets!.find(t=>t.template==='index'&&t.blocks.some(b=>b.fields.some(x=>['text','textarea','richtext'].includes(x.type))))!;
 expect(blockTarget).toBeDefined();const block=blockTarget.blocks.find(b=>b.fields.some(x=>['text','textarea','richtext'].includes(x.type)))!,field=block.fields.find(x=>['text','textarea','richtext'].includes(x.type))!;
 const resolved=resolveActiveContext(ownedConversation(f.u,f.c.id),{tab:'boutique',target:{kind:'theme-field',versionId:f.cur.version.id,template:'index',section:blockTarget.section,block:block.block,key:field.key,pagePath:'/'}});expect(resolved.kind).toBe('theme-field');expect('text'in resolved&&resolved.text).toBe(f.cur.spec.templates.index.sections[blockTarget.section].blocks![block.block].settings[field.key]);
});

it.each(['wrong-project','foreign-version','missing-field','wrong-page','unknown-object','ambiguous-field'] as const)('refuse %s sans fuite ni écriture',async kind=>{
 const f=await fixture(),other=await fixture(),selection=f.field();
 if(kind==='wrong-project')selection.projectId=other.pid;
 if(kind==='foreign-version'&&selection.target&&'versionId'in selection.target)selection.target.versionId=other.cur.version.id;
 if(kind==='missing-field'&&selection.target?.kind==='theme-field')selection.target.key='champ-inexistant';
 if(kind==='wrong-page'&&selection.target?.kind==='theme-field')selection.target.pagePath='https://intrus.invalid';
 const before=businessFingerprints(),revision=f.selected().revision;
 const context=kind==='unknown-object'?{...selection,target:{kind:'unconnected-post',id:'forged'}}:kind==='ambiguous-field'?{...selection,target:{...selection.target,text:'Titre sans clé',key:undefined}}:selection;
 expect(()=>submitContext(f.u,f.c.id,{action:'select',revision,requestId:id(),context})).toThrow();expect(f.selected().revision).toBe(revision);expect(businessFingerprints()).toEqual(before);
});

it('navigation et rechargement conservent la même cible valide ; clear est explicite',async()=>{
 const f=await fixture(),selected=f.select(f.field()),ref=selected.reference;
 const nav=submitContext(f.u,f.c.id,{action:'navigate',revision:selected.revision,requestId:id(),tab:'videos'});expect(nav.state).toBe('valid');expect(nav.activeTab).toBe('videos');expect(nav.reference).toBe(ref);expect(nav.selection).toEqual(selected.selection);
 const refreshed=conversationView(f.u,f.c.id);expect(refreshed.activeContext?.presentation?.reference).toBe(ref);
 const clear=submitContext(f.u,f.c.id,{action:'clear',revision:nav.revision,requestId:id()});expect(clear.state).toBe('empty');expect(clear.selection).toBeNull();
});

it('N→N+1 : conflit, contexte actualisé et reprise distincte avec accord ; ancien reçu sans réapplication',async()=>{
 const f=await fixture(),command={action:'select',revision:f.selected().revision,requestId:id(),context:f.field()},first=submitContext(f.u,f.c.id,command);
 const spec=structuredClone(f.cur.spec);spec.templates.index.sections[f.text.section].settings.heading='Titre manuel N+1';const next=saveThemeVersion(f.pid,spec,'Correction manuelle N+1','user'),before=businessFingerprints();
 const stale=f.selected();expect(stale.state).toBe('conflict');expect(stale.needsRevalidation).toBe(true);expect(stale.recovery?.action).toBe('revalidate');expect(stale.recovery?.current?.selection.target).toMatchObject({versionId:next.id});
 const replay=submitContext(f.u,f.c.id,command);expect(replay.receipt).toEqual(first.receipt);expect(replay.replayed).toBe(true);expect(replay.state).toBe('conflict');expect(f.selected().revision).toBe(first.revision);
 expect(()=>submitContext(f.u,f.c.id,{action:'revalidate',revision:first.revision,requestId:id(),expectedReference:first.reference,currentReference:f.selected().recovery?.current?.reference??'0000000000000000',confirmation:false})).toThrow();
 const approved=submitContext(f.u,f.c.id,{action:'revalidate',revision:first.revision,requestId:id(),expectedReference:first.reference,currentReference:f.selected().recovery?.current?.reference??'0000000000000000',confirmation:true});expect(approved.state).toBe('valid');expect(approved.target).toMatchObject({text:'Titre manuel N+1'});expect(approved.reference).not.toBe(first.reference);expect(businessFingerprints()).toEqual(before);
});

it('média changé sans nouvelle version thème : empreinte périmée ; média supprimé : resélection obligatoire',async()=>{
 const f=await fixture(),first=f.select(f.field(f.imageKey,f.image.section)),asset=one<{id:string}>('SELECT id FROM assets WHERE project_id=?',f.pid)!;
 run('UPDATE assets SET version=version+1 WHERE id=?',asset.id);expect(f.selected().state).toBe('conflict');expect(()=>checkedContextPin(ownedConversation(f.u,f.c.id))).toThrow('cible');
 run('UPDATE assets SET deleted_at=1 WHERE id=?',asset.id);const missing=f.selected();expect(missing.needsRevalidation).toBe(true);expect(missing.recovery?.action).toBe('reselect');expect(missing.recovery?.current).toBeNull();expect(missing.reference).toBe(first.reference);
});

it.each(['client','admin'] as const)('HTTP %s étranger refusé et forfait révoqué avant réessai',async role=>{
 const f=await fixture(),b=await account(),selected=f.select(f.field());run('UPDATE users SET role=? WHERE id=?',role,b.id);login(b.id);
 for(const r of [await route.GET(req(),ctx(f.c.id)),await route.POST(req({action:'clear',revision:selected.revision,requestId:id()}),ctx(f.c.id))]){expect(r.status).toBe(404);expect(await r.text()).not.toContain('heading');}
 login(f.u.id);run("UPDATE subscriptions SET status='canceled' WHERE project_id=?",f.pid);const before=businessFingerprints();expect((await route.GET(req(),ctx(f.c.id))).status).toBe(402);expect(businessFingerprints()).toEqual(before);
});

it('drapeau fermé, contexte forgé et conflit de requestId',async()=>{
 const f=await fixture();expect(ActiveContextSchema.safeParse({...f.field(),authorize:true}).success).toBe(false);const cmd={action:'select',revision:f.selected().revision,requestId:id(),context:f.field()};submitContext(f.u,f.c.id,cmd);
 expect(()=>submitContext(f.u,f.c.id,{...cmd,action:'clear',context:undefined})).toThrow();vi.stubEnv('STUDIO_CONVERSATION_CONTEXT','0');expect(()=>contextView(f.u,f.c.id)).toThrow('disabled');
});

async function prepare(f:Awaited<ReturnType<typeof fixture>>,text:string){
 await sender(f.u,f.c.id)({action:'message',text});const row=ownedConversation(f.u,f.c.id),m=metaOf(row),v=conversationView(f.u,f.c.id),receipt=id();
 const plan:ThemeToolPlan={tool:'theme.edit',versionId:currentTheme(f.pid)!.version.id,summary:'Proposition exacte de recette A2, aucune IA',ops:[{op:'set_setting',template:'index',section:f.text.section,key:'heading',value:text}]};
 m.intelligence={lastReceiptId:receipt,sourceRevision:row.revision,sourceProjectRevision:v.projectRevision,lastReply:{message:'Proposition fictive pour tester le moteur existant',status:'answer',business:null,businessEvidence:null,question:null,proposedChanges:[],knowledgeSourceIds:[],proposedTools:['theme.edit'],themePlan:plan,actionsExecuted:false}};run('UPDATE agent_conversations SET state_json=? WHERE id=?',JSON.stringify(m),row.id);
 const quote=()=>quoteThemeChange(f.u,f.c.id,{action:'quote',revision:row.revision,projectRevision:v.projectRevision!,proposalReceiptId:receipt});return{quote,plan};
}

it('deux actions préparées sur N : édition manuelle avant accord → 409 avec reprise, aucun job ni écriture',async()=>{
 const f=await fixture();f.select(f.field());const p=await prepare(f,'Titre exact de la demande A2'),a=p.quote(),b=p.quote();login(f.u.id);
 const spec=structuredClone(f.cur.spec);spec.templates.index.sections[f.text.section].settings.heading='Acquis manuel à préserver';saveThemeVersion(f.pid,spec,'Modification après les deux devis','user');const before=businessFingerprints();
 for(const q of [a,b]){const r=await themeRoute.POST(req({action:'confirm',quoteId:q.id,confirmation:true,requestId:id()}),ctx(f.c.id));expect(r.status).toBe(409);const error=await r.json();expect(error.code).toBe('conversation_target_conflict');expect(error.context.state).toBe('conflict');expect(error.actionRecovery).toEqual({required:'new-native-quote',reusePreviousConsent:false});}
 expect(businessFingerprints()).toEqual(before);expect(one<{n:number}>("SELECT COUNT(*) n FROM jobs WHERE project_id=?",f.pid)!.n).toBe(0);
});

it('worker relit la cible après accord ; après reprise un nouveau devis/accord applique une seule fois',async()=>{
 const f=await fixture();f.select(f.field());const p=await prepare(f,'Titre exact conservé de la recette'),q=p.quote();confirmThemeChange(f.u,f.c.id,{action:'confirm',quoteId:q.id,confirmation:true,requestId:id()});const job=claimNext(['agent.theme.change'])!;
 const spec=structuredClone(f.cur.spec);spec.templates.index.sections[f.text.section].settings.heading='Modification pendant la file';const next=saveThemeVersion(f.pid,spec,'N+1 dans la file','user');
 await expect(runThemeChange(new JobContext(job))).rejects.toMatchObject({code:'conversation_target_conflict'});expect(currentTheme(f.pid)!.version.id).toBe(next.id);
 const live=f.selected();submitContext(f.u,f.c.id,{action:'revalidate',revision:live.revision,requestId:id(),expectedReference:live.reference,currentReference:f.selected().recovery?.current?.reference??'0000000000000000',confirmation:true});
 const fresh=await prepare(f,'Titre exact après nouvelle relecture'),q2=fresh.quote(),requestId=id(),beforeCount=one<{n:number}>('SELECT COUNT(*) n FROM theme_versions WHERE project_id=?',f.pid)!.n;
 const approved=confirmThemeChange(f.u,f.c.id,{action:'confirm',quoteId:q2.id,confirmation:true,requestId});expect(confirmThemeChange(f.u,f.c.id,{action:'confirm',quoteId:q2.id,confirmation:true,requestId}).job?.id).toBe(approved.job?.id);
 const j2=claimNext(['agent.theme.change'])!;const result=await runThemeChange(new JobContext(j2));completeJob(j2.id,result);expect((await runThemeChange(new JobContext(j2))).versionId).toBe(result.versionId);expect(one<{n:number}>('SELECT COUNT(*) n FROM theme_versions WHERE project_id=?',f.pid)!.n).toBe(beforeCount+1);expect(one<{n:number}>('SELECT COUNT(*) n FROM ai_calls')!.n).toBe(0);
});

it('A1 avec sélection : édition, devis thème et cognition restent refusés, fil conservé',async()=>{
 const f=await fixture('services',true),before=businessFingerprints();f.select(f.field());const v=conversationView(f.u,f.c.id);
 expect(()=>ownedConversation(f.u,f.c.id)).toThrow('lecture seule');expect(()=>quoteThemeChange(f.u,f.c.id,{action:'quote',revision:v.revision,projectRevision:0,proposalReceiptId:'forged'})).toThrow('lecture seule');
 await expect(submitConversation(f.u,f.c.id,{action:'edit',field:'description',value:'écraser',revision:v.revision,projectRevision:null,requestId:id()})).rejects.toMatchObject({code:'conversation_existing_read_only'});
 await sender(f.u,f.c.id)({action:'message',text:'Message A1 conservé',context:{tab:'videos',target:null}});expect(f.selected().selection?.target).toMatchObject({kind:'theme-field'});expect(conversationView(f.u,f.c.id).history.length).toBe(2);expect(businessFingerprints()).toEqual(before);
});

it('texte natif trop long : référence entière, jamais de faux extrait tronqué',async()=>{
 const f=await fixture(),spec=structuredClone(f.cur.spec),text='Texte exact '.repeat(900);spec.templates.index.sections[f.text.section].settings.heading=text;const v=saveThemeVersion(f.pid,spec,'Texte long fictif','user'),selection=f.field();if(selection.target&&'versionId'in selection.target)selection.target.versionId=v.id;
 const r=f.select(selection);expect(r.target).toMatchObject({kind:'theme-field',contentRead:false,text:null,textReference:{characters:text.length,representation:'native_setting_not_dom'}});expect(r.target&&'textReference'in r.target&&r.target.textReference?.sha256).toMatch(/^[a-f0-9]{64}$/);
});

it('section supprimée et ancien repère : aucune substitution ou revalidation implicite',async()=>{
 const f=await fixture(),selected=f.select(f.field()),spec=structuredClone(f.cur.spec);delete spec.templates.index.sections[f.text.section];spec.templates.index.order=spec.templates.index.order.filter(s=>s!==f.text.section);saveThemeVersion(f.pid,spec,'Section retirée manuellement','user');const before=businessFingerprints();
 const live=f.selected();expect(live.needsRevalidation).toBe(true);expect(live.recovery?.action).toBe('reselect');expect(()=>submitContext(f.u,f.c.id,{action:'revalidate',revision:selected.revision,requestId:id(),expectedReference:selected.reference,currentReference:f.selected().recovery?.current?.reference??'0000000000000000',confirmation:true})).toThrow();expect(businessFingerprints()).toEqual(before);
});

it('proposition sur un autre champ et composition globale refusées avec une cible précise',async()=>{
 const f=await fixture();f.select(f.field());const prepared=await prepare(f,'Contenu exact demandé');const row=ownedConversation(f.u,f.c.id),m=metaOf(row);m.intelligence!.lastReply!.themePlan!.ops[0].key='subheading';run('UPDATE agent_conversations SET state_json=? WHERE id=?',JSON.stringify(m),row.id);const before=businessFingerprints();expect(prepared.quote).toThrow('champ ou l’objet');expect(businessFingerprints()).toEqual(before);
 m.intelligence!.lastReply!.compositionPlan={} as never;run('UPDATE agent_conversations SET state_json=? WHERE id=?',JSON.stringify(m),row.id);expect(prepared.quote).toThrow('composition globale');expect(businessFingerprints()).toEqual(before);
});

it('sélection obsolète et révision concurrente refusées avant toute nouvelle persistance',async()=>{
 const f=await fixture(),revision=f.selected().revision,selected=f.select(f.field()),before=businessFingerprints();expect(()=>submitContext(f.u,f.c.id,{action:'clear',revision,requestId:id()})).toThrow('conversation_conflict');expect(()=>submitContext(f.u,f.c.id,{action:'revalidate',revision:selected.revision,requestId:id(),expectedReference:'0000000000000000',currentReference:'0000000000000000',confirmation:true})).toThrow('revalidation_stale');expect(f.selected().reference).toBe(selected.reference);expect(businessFingerprints()).toEqual(before);
});

it('N+1 affiché puis N+2 manuel : la revalidation ne consent jamais silencieusement à N+2',async()=>{
 const f=await fixture(),selected=f.select(f.field()),spec=structuredClone(f.cur.spec);spec.templates.index.sections[f.text.section].settings.heading='Version N+1 affichée';saveThemeVersion(f.pid,spec,'N+1 fictif','user');const offered=f.selected().recovery!.current!;
 spec.templates.index.sections[f.text.section].settings.heading='Version N+2 non consentie';saveThemeVersion(f.pid,spec,'N+2 fictif','user');const before=businessFingerprints(),revision=f.selected().revision;
 expect(()=>submitContext(f.u,f.c.id,{action:'revalidate',revision,requestId:id(),expectedReference:selected.reference,currentReference:offered.reference,confirmation:true})).toThrow('cible');expect(f.selected().revision).toBe(revision);expect(businessFingerprints()).toEqual(before);expect(f.selected().state).toBe('conflict');
});
