/** D6 : état natif isolé, sans HTTP fournisseur, aucune qualification créative. */
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {account,project,sender,emptySpend} from './conversation209-fixtures';
import {openProjectConversation,conversationView,CommandSchema} from '@/lib/orchestrator/conversation';
import {ownedConversation,metaOf} from '@/lib/orchestrator/conversation/store';
import {captureStudioObservation} from '@/lib/orchestrator/conversation/studio-observation';
import {studioOperationCatalogue,STUDIO_OPERATIONS} from '@/lib/orchestrator/conversation/studio-operations';
import {cognitiveContext} from '@/lib/orchestrator/conversation/intelligence-context';
import {createCognitiveQuote,confirmCognitiveQuote} from '@/lib/orchestrator/conversation/intelligence';
import {all,id,run} from '@/lib/db';
import {enqueue} from '@/lib/jobs';
import {projectAccountKey} from '@/lib/project-billing';
import {stateOf,commitState} from '@/lib/preparation/store';
import fs from 'node:fs';
import {formatPct} from '@/lib/budget-pct';
import {createProduct} from '@/lib/products/catalog';
import {studioFailureDefinitions} from '@/lib/orchestrator/conversation/studio-failure-knowledge';
vi.mock('@/lib/ai/config',async original=>({...await original() as object,activeProviderKey:()=> 'FOURNISSEUR FICTIF SANS SECRET'}));
beforeEach(()=>{for(const key of ['STUDIO_CONVERSATION_LOT_A','STUDIO_CONVERSATION_AI','STUDIO_CONVERSATION_KNOWLEDGE'])vi.stubEnv(key,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Aucun HTTP D6');}));});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
async function fixture(business:'products'|'services'='products'){
 const u=await account(),pid=project(u,business),c=openProjectConversation(u,pid),send=sender(u,c.id);await send({action:'message',text:business==='products'?'Je propose des accessoires pour la réparation de vélos.':'Je propose un entretien de vitraux sur devis, sans engagement de délai.'});return{u,pid,c,send};
}
describe('#211 D6 — connaissance fondée et observations datées',()=>{
 it.each(['products','services']as const)('lit l’état natif, distingue droit/configuration/preuve et ne dépense rien (%s)',async business=>{
  const f=await fixture(business),before=emptySpend(),prep=structuredClone(stateOf(f.pid)),observed=captureStudioObservation(ownedConversation(f.u,f.c.id));
  expect(observed).toMatchObject({status:'project',projectId:f.pid,project:{business},plan:{id:'dominer'},providerTested:false,observationsAreClientConfirmedFacts:false});
  if(observed.status!=='project')throw Error('Project expected');expect(observed.plan?.rights.videos).toBe('advanced');expect(observed.budget.available).toBeGreaterThan(0);expect(formatPct(observed.budget.available!,'fr')).toBe(formatPct(100,'fr'));expect(observed.theme).toBeNull();expect(observed.jobs).toEqual([]);expect(observed.readingScope).toContain('metadata');
  expect(JSON.stringify(observed)).not.toContain('FOURNISSEUR FICTIF');expect(JSON.stringify(observed)).not.toContain('monthly_allowance');expect(emptySpend()).toEqual(before);expect(stateOf(f.pid)).toEqual(prep);expect(fetch).not.toHaveBeenCalled();
 });
 it('sépare le non-consommé du maximum réservé et reprend le seuil natif de pause',async()=>{
  const f=await fixture(),before=emptySpend();run('UPDATE wallets SET monthly_used=0,reserved=monthly_allowance,topup_balance=0,reserved_topup=0 WHERE user_id=?',projectAccountKey(f.pid));
  const o=captureStudioObservation(ownedConversation(f.u,f.c.id));if(o.status!=='project')throw Error('Project expected');expect(o.budget).toMatchObject({used:0,available:100,reserved:100,paused:false,pending:true,reservedIsMaximumNotSpent:true,remainingIsRecordedNotSpendable:true});expect(emptySpend()).toEqual(before);
 });
 it('bascule sur les crédits achetés sans additionner des pourcentages de bases différentes',async()=>{
  const f=await fixture();run('UPDATE wallets SET monthly_used=monthly_allowance,reserved=0,topup_balance=1000000,topup_period_used=1000000,reserved_topup=500000 WHERE user_id=?',projectAccountKey(f.pid));
  const o=captureStudioObservation(ownedConversation(f.u,f.c.id));if(o.status!=='project')throw Error('Project expected');expect(o.budget).toMatchObject({used:100,available:0,creditsAvailable:50,reserved:25,costBasis:'purchased_credits',paused:false,pending:false});expect(JSON.stringify(o)).not.toContain('1000000');expect(fetch).not.toHaveBeenCalled();
 });
 it('garde le relevé de la demande stable pendant que le solde et les jobs évoluent',async()=>{
  const f=await fixture(),c=ownedConversation(f.u,f.c.id),stored=structuredClone(metaOf(c).studioObservation),before=cognitiveContext(c),view=conversationView(f.u,f.c.id),q=createCognitiveQuote(f.u,f.c.id,{revision:view.revision,projectRevision:view.projectRevision});
  run('UPDATE wallets SET monthly_used=monthly_used+1000 WHERE user_id=?',projectAccountKey(f.pid));
  const live=conversationView(f.u,f.c.id).studioHelp!.observation;if(live.status!=='project'||stored?.status!=='project'||stored.budget.used===null||live.budget.used===null)throw Error('Project expected');expect(live.budget.used).toBeGreaterThan(stored.budget.used);expect(metaOf(ownedConversation(f.u,f.c.id)).studioObservation).toEqual(stored);expect(cognitiveContext(ownedConversation(f.u,f.c.id)).fingerprint).toBe(before.fingerprint);
  const confirmed=confirmCognitiveQuote(f.u,f.c.id,q.id,id());expect(confirmed.jobId).toBeTruthy();expect(cognitiveContext(ownedConversation(f.u,f.c.id)).fingerprint).toBe(before.fingerprint);expect(all('SELECT id FROM ai_calls WHERE project_id=?',f.pid)).toHaveLength(0);
 });
 it('un job terminé ou un résultat JSON ne devient pas une livraison vérifiée ; aucun message privé exporté',async()=>{
  const f=await fixture(),j=enqueue({userId:f.u.id,projectId:f.pid,type:'image.ai_post',label:'RECETTE',payload:{},maxAttempts:1});run("UPDATE jobs SET status='failed',progress=.15,error='FAKE_PRIVATE_MESSAGE_DO_NOT_EXPORT',checkpoint=?,result='{}' WHERE id=?",JSON.stringify({'ai-post':{code:'COPY_FACTS_REJECTED'}}),j.id);
  let s=captureStudioObservation(ownedConversation(f.u,f.c.id));if(s.status!=='project')throw Error('Project expected');expect(s.jobs[0]).toMatchObject({status:'failed',progress:.15,failureCode:'COPY_FACTS_REJECTED',resultRecorded:true,deliveryVerifiedByThisObservation:false});expect(s.failureDefinitions).toEqual([expect.objectContaining({code:'COPY_FACTS_REJECTED',kind:'quality',automaticRetry:false})]);expect(JSON.stringify(s)).not.toContain('FAKE_PRIVATE_MESSAGE');
  run("UPDATE jobs SET status='done',progress=1 WHERE id=?",j.id);s=captureStudioObservation(ownedConversation(f.u,f.c.id));if(s.status!=='project')throw Error('Project expected');expect(s.jobs[0]).toMatchObject({status:'done',failureCode:null,deliveryVerifiedByThisObservation:false});
 });
 it('compte le catalogue natif, indique les archives et isole les autres projets',async()=>{const f=await fixture(),other=await fixture();createProduct(f.pid,{title:'Plioir de recette'});createProduct(f.pid,{title:'Poinçon archivé de recette',status:'archived'});createProduct(other.pid,{title:'Autre projet'});const s=captureStudioObservation(ownedConversation(f.u,f.c.id));if(s.status!=='project')throw Error('Project expected');expect(s.counts.catalogueRowsIncludingArchived).toBe(2);expect(s.readingScope).toContain('includes archived');});
 it('annonce explicitement le périmètre des huit jobs, sans faire disparaître les anciens comme inexistants',async()=>{const f=await fixture();for(let n=0;n<10;n++)enqueue({userId:f.u.id,projectId:f.pid,type:'copy.build',label:'RECETTE',payload:{n},maxAttempts:1});const s=captureStudioObservation(ownedConversation(f.u,f.c.id));if(s.status!=='project')throw Error('Project expected');expect(s.jobs).toHaveLength(8);expect(s.jobCoverage).toMatchObject({limit:8,total:10});});
 it('n’invente pas une cause par mot-clé et sépare le plafond de création du solde mensuel',()=>{expect(studioFailureDefinitions(['BUDGET_MYSTERY'])).toEqual([]);const known=studioFailureDefinitions(['CREATIVE_CAP_BEFORE_COPY']);expect(known[0].kind).toBe('task_budget');expect(known[0].message[0]).toContain('ne prouve pas');for(const d of studioFailureDefinitions(['COPY_FACTS_REJECTED','CREATIVE_CAP_BEFORE_COPY']))expect(fs.readFileSync(d.source,'utf8')).toContain(d.code);});
 it('ne confond pas l’état d’un autre projet ou d’un autre compte',async()=>{
  const a=await fixture(),b=await fixture('services');run("UPDATE projects SET name='RECETTE PRIVÉE AUTRE COMPTE' WHERE id=?",b.pid);const c=ownedConversation(a.u,a.c.id);expect(()=>captureStudioObservation({...c,project_id:b.pid})).toThrow();expect(JSON.stringify(captureStudioObservation(c))).not.toContain('RECETTE PRIVÉE AUTRE COMPTE');
 });
 it('expose les vrais droits du forfait sans rendre un outil absent utilisable',async()=>{
  const f=await fixture();run("UPDATE subscriptions SET plan='creer' WHERE project_id=?",f.pid);run('UPDATE wallets SET monthly_used=monthly_allowance,topup_balance=0 WHERE user_id=?',projectAccountKey(f.pid));const s=captureStudioObservation(ownedConversation(f.u,f.c.id));if(s.status!=='project')throw Error('Project expected');expect(s.plan?.rights).toMatchObject({videos:'none',ugc:false,aiSections:false});expect(s.budget.paused).toBe(true);expect(s.budget.available).toBe(0);
  const video=studioOperationCatalogue(f.pid,true).rows.find(r=>r.id==='videos.generate')!;expect(video).toMatchObject({implementation:'absent_from_syna',connectionEnabled:false,availability:'not_connected_native_screen_only',nativeAvailability:'not_verified_for_this_project',cost:'unknown_not_quoted'});
 });
 it('explique le verrou natif de fiche sans conclure que tous les outils du Site sont interdits',async()=>{
  const f=await fixture(),s=stateOf(f.pid)!;commitState(f.pid,s.revision,current=>{current.stages.brief!.status='approved';});const c=ownedConversation(f.u,f.c.id),ctx=cognitiveContext(c),entry=ctx.knowledge.find(k=>k.id==='studio.brief-editability')!;
  expect(JSON.parse(entry.text)).toMatchObject({writable:false,scope:'native_preparation_fiche_only_not_all_site_and_media_operations',readOnlyReason:conversationView(f.u,f.c.id).readOnlyReason});expect(JSON.parse(entry.text).readOnlyReason).toBeTruthy();expect(fetch).not.toHaveBeenCalled();
 });
 it('indexe des opérations réelles et leurs sources, conserve les drapeaux fermés et signale la couverture partielle',async()=>{
  const f=await fixture(),cat=studioOperationCatalogue(f.pid,true);expect(cat.notExhaustive).toBe(true);expect(cat.rows.find(r=>r.id==='theme.original')).toMatchObject({nativeAvailability:'not_implemented',implementation:'absent_from_syna',connectionEnabled:false});const index=JSON.parse(cognitiveContext(ownedConversation(f.u,f.c.id)).knowledge.find(k=>k.id==='studio.operations')!.text);expect(index.rows.find((r:string[])=>r[0]==='theme.original')[index.columns.indexOf('nativeAvailability')]).toBe('not_implemented');expect(new Set(cat.rows.map(r=>r.id)).size).toBe(STUDIO_OPERATIONS.length);for(const row of cat.rows)expect(fs.existsSync(row.source),row.source).toBe(true);
  expect(cat.rows.find(r=>r.id==='theme.exact-edit')).toMatchObject({implementation:'implemented',connectionEnabled:false});vi.stubEnv('STUDIO_CONVERSATION_SPECIALISTS','1');vi.stubEnv('STUDIO_CONVERSATION_TOOLS','1');vi.stubEnv('STUDIO_CONVERSATION_THEME_TOOLS','1');expect(studioOperationCatalogue(f.pid,true).rows.find(r=>r.id==='theme.exact-edit')?.connectionEnabled).toBe(true);for(const row of cat.rows.filter(r=>r.sensitive))expect(row.connectionEnabled).toBe(false);
 });
 it('ne permet pas au client de forger le relevé, les droits ou une connaissance interne',async()=>{
  const f=await fixture(),v=conversationView(f.u,f.c.id);expect(CommandSchema.safeParse({action:'message',text:'Une question',revision:v.revision,projectRevision:v.projectRevision,requestId:id(),studioObservation:{budget:{available:1}}}).success).toBe(false);
  const ctx=cognitiveContext(ownedConversation(f.u,f.c.id));expect(ctx.knowledge.some(k=>k.id==='studio.observed-state')).toBe(true);expect(ctx.knowledge.some(k=>k.id==='studio.operations')).toBe(true);expect(ctx.sources.some(s=>s.text.includes('percentage_of_each_native_reserve'))).toBe(false);
 });
 it('reste fermé par défaut et conserve les relevés acquis sans les réinjecter lorsque désactivé',async()=>{
  const f=await fixture(),before=metaOf(ownedConversation(f.u,f.c.id)).studioObservation;vi.stubEnv('STUDIO_CONVERSATION_KNOWLEDGE','0');expect(conversationView(f.u,f.c.id).studioHelp).toBeUndefined();expect(cognitiveContext(ownedConversation(f.u,f.c.id)).knowledge.some(k=>k.id==='studio.observed-state')).toBe(false);expect(metaOf(ownedConversation(f.u,f.c.id)).studioObservation).toEqual(before);
 });
 it('ne recopie pas le catalogue vivant dans chaque parole enregistrée, tout en conservant le relevé de la demande',async()=>{const f=await fixture(),response=await f.send({action:'message',text:'Où en est ce projet ?'});expect(response.studioHelp).toBeUndefined();expect(conversationView(f.u,f.c.id).studioHelp?.observation.projectId).toBe(f.pid);const row=all<{response_json:string}>("SELECT response_json FROM agent_conversation_turns WHERE conversation_id=? ORDER BY revision DESC LIMIT 1",f.c.id)[0];expect(JSON.parse(row.response_json).studioHelp).toBeUndefined();expect(metaOf(ownedConversation(f.u,f.c.id)).studioObservation?.projectId).toBe(f.pid);});
});
