/** Angles acquis fictifs : pas de fournisseur réel, de création ou d'activation. */
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {account,project,sender,emptySpend} from './conversation209-fixtures';
import {seedSourcedAnglesForTest} from './sourced-strategy-fixture';
import {openProjectConversation,conversationView,submitConversation,CommandSchema} from '@/lib/orchestrator/conversation';
import {ownedConversation,metaOf} from '@/lib/orchestrator/conversation/store';
import {strategyChoicesView,validateStrategyChoiceProposal} from '@/lib/orchestrator/conversation/strategy-choices';
import {cognitiveContext} from '@/lib/orchestrator/conversation/intelligence-context';
import {createCognitiveQuote,confirmCognitiveQuote,runCognitiveJob} from '@/lib/orchestrator/conversation/intelligence';
import {getStrategyState} from '@/lib/marketing-strategy';
import {saveProduct,loadProject} from '@/lib/projects';
import {emptyProduct} from '@/lib/project-types';
import {all,id,run,one,now} from '@/lib/db';
import {stateOf} from '@/lib/preparation/store';
import {balance} from '@/lib/billing';
import {claimNext,JobContext} from '@/lib/jobs';
import {studioOperationCatalogue} from '@/lib/orchestrator/conversation/studio-operations';
const fake=vi.hoisted(()=>({reply:{} as unknown,calls:0}));
vi.mock('@/lib/ai/config',async orig=>({...await orig() as object,activeProviderKey:()=> 'FAUX FOURNISSEUR SANS SECRET'}));
vi.mock('@/lib/ai/llm',async orig=>({...await orig() as object,llmJson:async()=>{fake.calls++;return fake.reply;}}));
beforeEach(()=>{for(const k of ['STUDIO_CONVERSATION_LOT_A','STUDIO_CONVERSATION_AI','STUDIO_CONVERSATION_CHOICES'])vi.stubEnv(k,'1');vi.stubGlobal('fetch',vi.fn(()=>{throw Error('Aucun réseau D7');}));fake.calls=0;});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
async function fixture(b:'products'|'services'='products',seed=true){const u=await account(),pid=project(u,b),early=seed?null:openProjectConversation(u,pid);saveProduct(pid,{...emptyProduct(),name:b==='products'?'Presse de reliure de recette':'Restauration de cadrans de recette',summary:b==='products'?'Presse manuelle pour assembler des cahiers, sans promesse de résultat.':'Entretien de cadrans confiés par les clients, sur devis.',category:b==='products'?'Reliure':'Horlogerie'});if(seed)seedSourcedAnglesForTest(pid);const c=early??openProjectConversation(u,pid),send=sender(u,c.id);return{u,pid,c,send};}
async function compare(f:Awaited<ReturnType<typeof fixture>>){return(await f.send({action:'compare-strategy-options'})).strategyChoices!.active!;}
const decision=(c:Awaited<ReturnType<typeof compare>>,angleId=c.options[1].id,kind='prefer',reason='Je préfère rendre les informations disponibles avant de choisir.')=>({action:'decide-strategy-option',comparisonId:c.id,version:c.version,angleId,decision:kind,reason});
describe('#211 D7 — comparer et choisir sans activation',()=>{
 it.each(['products','services']as const)('réutilise cinq options natives complètes et leur conseil, sans dépense ni nouvelle étape (%s)',async b=>{
  const f=await fixture(b),prep=structuredClone(stateOf(f.pid)),spend=emptySpend(),wallet=balance(f.u.id,f.pid),native=getStrategyState(f.pid),c=await compare(f);
  expect(c.options).toEqual(native.angles);expect(c.simulation).toBe(true);expect(c.marketSourcesVerified).toBe(false);expect(c.scope).toBe(b==='services'?'service_communication':'project');expect(c.recommendation).toEqual(native.recommendation);
  expect(new Set(c.options.map(a=>a.audience)).size).toBe(5);expect(c.options.every(a=>a.sources.length>0&&a.limits.length>0)).toBe(true);expect(stateOf(f.pid)).toEqual(prep);expect(emptySpend()).toEqual(spend);expect(balance(f.u.id,f.pid)).toEqual(wallet);expect(getStrategyState(f.pid).usedAngleIds).toEqual([]);expect(getStrategyState(f.pid).active).toBeNull();expect(fetch).not.toHaveBeenCalled();
 });
 it('conserve la préférence exacte, les refus et les raisons, puis restaure sans activer ni modifier la fiche',async()=>{
  const f=await fixture(),c=await compare(f),before=emptySpend(),prep=stateOf(f.pid),r='Conserver les questions encore ouvertes et le nom de ma marque.';let v=await f.send(decision(c,c.options[1].id,'prefer',r));expect(v.strategyChoices!.active!.preference.preferred).toMatchObject({comparisonId:c.id,version:c.version,angleId:c.options[1].id});
  v=await f.send(decision(c,c.options[1].id,'reject','Je veux comparer cette option avec les usages.'));expect(v.strategyChoices!.active!.preference.preferred).toBeNull();expect(v.strategyChoices!.active!.preference.rejected).toHaveLength(1);
  const last=v.strategyChoices!.decisions.at(-1)!;v=await f.send({action:'undo-strategy-preference',decisionId:last.id});expect(v.strategyChoices!.active!.preference.preferred?.angleId).toBe(c.options[1].id);expect(v.strategyChoices!.active!.preference.rejected).toEqual([]);expect(v.strategyChoices!.decisions).toHaveLength(3);expect(v.strategyChoices!.decisions[0].reason).toBe(r);expect(v.strategyChoices!.decisions[2].undoOf).toBe(last.id);
  expect(conversationView(f.u,f.c.id).strategyChoices).toEqual(v.strategyChoices);expect(cognitiveContext(ownedConversation(f.u,f.c.id)).sources.some(s=>s.text===r)).toBe(true);expect(stateOf(f.pid)).toEqual(prep);expect(emptySpend()).toEqual(before);expect(getStrategyState(f.pid).active).toBeNull();
 });
 it('compare deux options dans l’ordre exact sans tronquer le contenu et réutilise une comparaison identique',async()=>{
  const f=await fixture(),c=await compare(f),angleIds=[c.options[3].id,c.options[1].id];const subset=await f.send({action:'compare-strategy-options',angleIds,sourceComparisonId:c.id,sourceVersion:c.version}),s=subset.strategyChoices!.active!;expect(s.options).toEqual([c.options[3],c.options[1]]);expect(s.recommendation).toBeNull();expect(s.id).not.toBe(c.id);
  await f.send({action:'compare-strategy-options',angleIds,sourceComparisonId:s.id,sourceVersion:s.version});expect(conversationView(f.u,f.c.id).strategyChoices!.history).toHaveLength(2);expect(cognitiveContext(ownedConversation(f.u,f.c.id)).context.strategyComparisons!.active!.options).toEqual(s.options);const reopened=await f.send({action:'open-strategy-comparison',comparisonId:c.id});expect(reopened.strategyChoices!.active!.options).toEqual(c.options);expect(reopened.strategyChoices!.history).toHaveLength(2);
 });
 it('refuse les sources, identifiants et versions forgés, doublons et options étrangères',async()=>{
  const f=await fixture(),c=await compare(f),other=await fixture(),o=await compare(other);await expect(f.send({...decision(c),comparisonId:o.id})).rejects.toThrow('comparaison');await expect(f.send({...decision(c),version:'0'.repeat(64)})).rejects.toThrow('comparaison');await expect(f.send({...decision(c),angleId:'unknown'})).rejects.toThrow();
  await expect(f.send({action:'compare-strategy-options',angleIds:[c.options[0].id,c.options[0].id],sourceComparisonId:c.id,sourceVersion:c.version})).rejects.toThrow('distincts');await expect(f.send({action:'compare-strategy-options',angleIds:[c.options[0].id,c.options[1].id]})).rejects.toThrow('source');expect(CommandSchema.safeParse({...decision(c),revision:1,projectRevision:1,requestId:id(),activate:true}).success).toBe(false);
  expect(()=>strategyChoicesView({...ownedConversation(f.u,f.c.id),project_id:other.pid},metaOf(ownedConversation(f.u,f.c.id)))).toThrow();expect(()=>conversationView(other.u,f.c.id)).toThrow('introuvable');
 });
 it('rend un ancien choix historique sans le remplacer quand l’offre change ; annulation de mémoire encore possible',async()=>{
  const f=await fixture(),c=await compare(f);const v=await f.send(decision(c)),last=v.strategyChoices!.decisions.at(-1)!;saveProduct(f.pid,{...loadProject(f.pid).product,summary:'Une nouvelle description, sans reprendre les propositions précédentes.'});
  expect(conversationView(f.u,f.c.id).strategyChoices!.active).toMatchObject({id:c.id,version:c.version,isCurrent:false});await expect(f.send(decision(c))).rejects.toThrow('historique');expect((await f.send({action:'undo-strategy-preference',decisionId:last.id})).strategyChoices!.active!.preference.preferred).toBeNull();expect(conversationView(f.u,f.c.id).strategyChoices!.history[0].version).toBe(c.version);expect(getStrategyState(f.pid).active).toBeNull();
 });
 it('ne lance rien quand la recherche manque, que le budget est épuisé ou que la connexion fournisseur manque',async()=>{
  const f=await fixture('products',false),before=emptySpend();expect(conversationView(f.u,f.c.id).strategyChoices!.available).toBe(false);await expect(f.send({action:'compare-strategy-options'})).rejects.toThrow();expect(emptySpend()).toEqual(before);
  const acquired=await fixture();run('UPDATE wallets SET monthly_used=monthly_allowance,topup_balance=0');const cost=emptySpend();const c=await compare(acquired);await acquired.send(decision(c));expect(emptySpend()).toEqual(cost);expect(fetch).not.toHaveBeenCalled();
 });
 it('préserve l’idempotence et refuse un choix concurrent ou un abonnement annulé',async()=>{
  const f=await fixture(),c=await compare(f),view=conversationView(f.u,f.c.id),cmd={...decision(c),revision:view.revision,projectRevision:view.projectRevision,requestId:id()};const first=await submitConversation(f.u,f.c.id,cmd);expect(await submitConversation(f.u,f.c.id,cmd)).toEqual(first);expect(first.strategyChoices!.decisions).toHaveLength(1);
  await expect(submitConversation(f.u,f.c.id,{...cmd,requestId:id()})).rejects.toThrow('changé');await expect(f.send({action:'undo-strategy-preference',decisionId:id()})).rejects.toThrow('changé');run("UPDATE subscriptions SET status='canceled' WHERE project_id=?",f.pid);await expect(f.send(decision(c))).rejects.toThrow();
 });
 it('ferme le drapeau sans effacer la mémoire ni annoncer une comparaison générique raccordée',async()=>{
  const f=await fixture(),c=await compare(f),saved=metaOf(ownedConversation(f.u,f.c.id)).strategyChoices;expect(studioOperationCatalogue(f.pid,false).rows.find(r=>r.id==='strategy.compare')).toMatchObject({connectionEnabled:true,cost:'free'});expect(studioOperationCatalogue(f.pid,false).rows.find(r=>r.id==='proposal.compare')).toMatchObject({implementation:'absent_from_syna',connectionEnabled:false});vi.stubEnv('STUDIO_CONVERSATION_CHOICES','0');expect(conversationView(f.u,f.c.id).strategyChoices).toBeUndefined();expect(cognitiveContext(ownedConversation(f.u,f.c.id)).context.strategyComparisons).toBeUndefined();await expect(f.send(decision(c))).rejects.toThrow('désactivée');expect(metaOf(ownedConversation(f.u,f.c.id)).strategyChoices).toEqual(saved);
 });
 it('conserve l’historique sans troncature ; limite explicite de vingt comparaisons et cent décisions',async()=>{
  const f=await fixture(),c=await compare(f),row=ownedConversation(f.u,f.c.id),m=metaOf(row);m.strategyChoices!.decisions=Array.from({length:100},()=>({id:id(),at:now(),comparisonId:c.id,kind:'reject' as const,angleId:c.options[0].id,reason:'Fixture',reasonSource:'client' as const,before:{preferred:null,rejected:[]},after:{preferred:null,rejected:[]}}));run('UPDATE agent_conversations SET state_json=? WHERE id=?',JSON.stringify(m),f.c.id);await expect(f.send(decision(c))).rejects.toThrow('Limite');expect(metaOf(ownedConversation(f.u,f.c.id)).strategyChoices!.decisions).toHaveLength(100);
 });
 it('refuse une vingt-et-unième comparaison sans purger ses versions et refuse une source périmée',async()=>{
  const f=await fixture(),c=await compare(f),row=ownedConversation(f.u,f.c.id),m=metaOf(row);m.strategyChoices!.comparisons=Array.from({length:20},(_,i)=>({...structuredClone(c),id:i? id():c.id,version:i?'f'.repeat(64):c.version}));run('UPDATE agent_conversations SET state_json=? WHERE id=?',JSON.stringify(m),f.c.id);
  await expect(f.send({action:'compare-strategy-options',angleIds:[c.options[0].id,c.options[1].id],sourceComparisonId:c.id,sourceVersion:c.version})).rejects.toThrow('Vingt');expect(metaOf(ownedConversation(f.u,f.c.id)).strategyChoices!.comparisons).toHaveLength(20);
  saveProduct(f.pid,{...loadProject(f.pid).product,summary:'Autre contexte de recette.'});await expect(f.send({action:'compare-strategy-options',angleIds:[c.options[0].id,c.options[1].id],sourceComparisonId:c.id,sourceVersion:c.version})).rejects.toThrow('changé');
 });
 it('ne tronque pas les options trop longues et n’efface pas l’acquis après un refus de contexte',async()=>{
  const f=await fixture(),c=await compare(f),native=one<{angles_json:string}>('SELECT angles_json FROM marketing_strategy_sets WHERE project_id=?',f.pid)!,angles=JSON.parse(native.angles_json);angles[0].rationale='Texte fictif long '.repeat(10000);run('UPDATE marketing_strategy_sets SET angles_json=? WHERE project_id=?',JSON.stringify(angles),f.pid);
  await expect(f.send({action:'compare-strategy-options'})).rejects.toThrow('tronqué');expect(metaOf(ownedConversation(f.u,f.c.id)).strategyChoices!.comparisons).toHaveLength(1);expect(metaOf(ownedConversation(f.u,f.c.id)).strategyChoices!.comparisons[0].id).toBe(c.id);
 });
 it('conserve la dernière demande répétée sans la confondre avec une ancienne raison ou un autre message',async()=>{
  const f=await fixture(),c=await compare(f),text='Compare la première et la deuxième option, sans activer de stratégie.';await f.send({action:'message',text});await f.send({action:'message',text:'Conserve toutes les inconnues de mon projet.'});await f.send(decision(c));await f.send({action:'message',text});const ctx=cognitiveContext(ownedConversation(f.u,f.c.id));expect(ctx.context.lastClientRequest).toMatchObject({text,revision:conversationView(f.u,f.c.id).revision,action:'message'});expect(ctx.sources.find(s=>s.id===ctx.context.lastClientRequest!.sourceId)?.text).toBe(text);expect(ctx.context.strategyComparisons!.active!.options).toHaveLength(5);
 });
 it('une proposition IA référencée attend un accord distinct et reste une préférence, même après réponse libre',async()=>{
  const f=await fixture(),c=await compare(f),text='Garde la deuxième proposition pour notre discussion, sans activer la stratégie.';await f.send(decision(c,c.options[0].id,'prefer','Je garde les inconnues visibles.'));await f.send({action:'message',text});
  const context=cognitiveContext(ownedConversation(f.u,f.c.id));expect(context.sources.at(-1)?.text).toBe(text);const source=context.sources.find(s=>s.text===text)!;fake.reply={message:'[Fournisseur simulé] Je propose la deuxième approche, fondée sur les informations documentées ; aucune efficacité marketing n’est démontrée.',status:'answer',business:null,businessEvidence:null,question:null,proposedChanges:[],knowledgeSourceIds:[],proposedTools:[],actionsExecuted:false,strategyChoice:{comparisonId:c.id,version:c.version,angleId:c.options[1].id,sourceId:source.id,quote:text,reason:'Conseil simulé : cet angle met en avant les informations déjà documentées, avec les inconnues à vérifier.'}};
  const view=conversationView(f.u,f.c.id),q=createCognitiveQuote(f.u,f.c.id,{revision:view.revision,projectRevision:view.projectRevision}),job=confirmCognitiveQuote(f.u,f.c.id,q.id,id()),j=claimNext(['agent.reason'])!;expect(j.id).toBe(job.jobId);const result=await runCognitiveJob(new JobContext(j));run("UPDATE jobs SET status='done',result=?,finished_at=? WHERE id=?",JSON.stringify(result),now(),j.id);
  let v=conversationView(f.u,f.c.id);expect(v.strategyChoices!.decisions).toHaveLength(1);expect(fake.calls).toBe(1);expect(getStrategyState(f.pid).active).toBeNull();v=await f.send({action:'accept-strategy-preference',receiptId:j.id});expect(v.strategyChoices!.active!.preference.preferred?.angleId).toBe(c.options[1].id);expect(v.strategyChoices!.decisions.at(-1)!.reasonSource).toBe('provider_proposal_confirmed');expect(v.strategyChoices!.decisions.at(-1)!.proposalReceiptId).toBe(j.id);expect(getStrategyState(f.pid).usedAngleIds).toEqual([]);expect(fake.calls).toBe(1);
  await expect(f.send({action:'accept-strategy-preference',receiptId:j.id})).rejects.toThrow('actuelle');expect(()=>validateStrategyChoiceProposal({...JSON.parse(JSON.stringify(fake.reply)).strategyChoice,comparisonId:id()},ownedConversation(f.u,f.c.id),metaOf(ownedConversation(f.u,f.c.id)))).toThrow('comparaison');expect(all('SELECT id FROM theme_versions WHERE project_id=?',f.pid)).toHaveLength(0);
 });
});
