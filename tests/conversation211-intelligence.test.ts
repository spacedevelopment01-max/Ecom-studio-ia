import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { account, project, sender } from './conversation209-fixtures';
import { openDraft, openProjectConversation, conversationView } from '@/lib/orchestrator/conversation';
import { confirmCognitiveQuote, createCognitiveQuote, runCognitiveJob } from '@/lib/orchestrator/conversation/intelligence';
import { CognitiveReplySchema, type CognitiveReply } from '@/lib/orchestrator/conversation/intelligence-contract';
import { all, id, now, one, run } from '@/lib/db';
import { claimNext, JobContext, type Job } from '@/lib/jobs';
import { currentBrief, ownedConversation } from '@/lib/orchestrator/conversation/store';
import { exportAccountData } from '@/lib/privacy';
import { balance } from '@/lib/billing';
import { setJsonSetting } from '@/lib/settings';
import { TEXT_MODEL_BY_TIER } from '@/lib/orchestrator/policy';
import { cognitiveContext } from '@/lib/orchestrator/conversation/intelligence-context';

const fake = vi.hoisted(() => ({ reply: null as unknown, calls: 0, fail: false }));
vi.mock('@/lib/ai/config', async orig => ({ ...(await orig() as object), activeProviderKey: () => 'FAUX FOURNISSEUR — AUCUN SECRET' }));
vi.mock('@/lib/ai/llm', async orig => ({ ...(await orig() as object), textProviderReady: () => !fake.fail,
  llmJson: async () => { fake.calls++; return fake.reply; } }));
beforeEach(() => { vi.stubEnv('STUDIO_CONVERSATION_LOT_A', '1'); vi.stubEnv('STUDIO_CONVERSATION_AI', '1'); fake.calls = 0; fake.fail = false; vi.stubGlobal('fetch', vi.fn(() => { throw Error('Réseau fournisseur interdit #211'); })); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const reply = (over: Partial<CognitiveReply> = {}): CognitiveReply => ({
  message: 'Votre activité est décrite. Qui souhaitez-vous atteindre en priorité ?', status: 'question', business: 'products',
  businessEvidence: { sourceId: 'brief.description', quote: "Je veux une marque de lampe pour chambre d'enfant" },
  question: { id: 'premiere-clientele', field: 'target', title: 'À qui souhaitez-vous vous adresser ?', why: 'La clientèle guide vos textes et le parcours.', multiple: true,
    choices: [{ id: 'parents', label: 'Parents' }, { id: 'decorateurs', label: 'Décorateurs' }, { id: 'other', label: 'Autre / préciser' }] },
  proposedChanges: [], knowledgeSourceIds: [], proposedTools: [], actionsExecuted: false, ...over,
});
async function initial(text = "Je veux une marque de lampe pour chambre d'enfant") {
  const user = await account(), c = openDraft(user), send = sender(user, c.id);
  await send({ action: 'message', text });
  return { user, cid: c.id, send };
}
function quote(user: Awaited<ReturnType<typeof account>>, cid: string) {
  const v = conversationView(user, cid);
  return createCognitiveQuote(user, cid, { revision: v.revision, projectRevision: v.projectRevision });
}
async function execute(user: Awaited<ReturnType<typeof account>>, cid: string) {
  const q = quote(user, cid), confirmed = confirmCognitiveQuote(user, cid, q.id, id());
  const claimed = claimNext(['agent.reason'])!;
  expect(claimed.id).toBe(confirmed.jobId);
  const result = await runCognitiveJob(new JobContext(claimed));
  run("UPDATE jobs SET status='done',result=?,finished_at=? WHERE id=?", JSON.stringify(result), now(), claimed.id);
  return { q, job: claimed, result };
}

describe('#211 lot B — vrai chemin IA, fournisseur SIMULÉ dans cette recette', () => {
  it('conserve le message exact sans compréhension locale ni appel implicite ; drapeau fermé par défaut', async () => {
    const { user, cid } = await initial();
    const v = conversationView(user, cid);
    expect(v.summary.description).toBe("Je veux une marque de lampe pour chambre d'enfant");
    expect(v.summary.business).toBeNull(); expect(v.summary.businessSource).toBe('unknown');
    expect(v.question).toBeNull(); expect(v.intelligence?.state).toBe('requires_quote'); expect(fake.calls).toBe(0);
    vi.stubEnv('STUDIO_CONVERSATION_AI', '0'); expect(() => quote(user, cid)).toThrow('Dialogue IA indisponible');
  });
  it('devis natif en % → consentement → worker → question contextuelle → réponse libre/multiple → reprise', async () => {
    const { user, cid, send } = await initial(); fake.reply = reply();
    const before = balance(user.id), result = await execute(user, cid);
    expect(result.q.maximumPct).toBeGreaterThanOrEqual(result.q.estimatePct!); expect(result.q.maxCalls).toBe(1);
    expect(result.q).not.toHaveProperty('capMicro'); expect(result.q).not.toHaveProperty('model');
    let v = conversationView(user, cid); expect(v.summary.business).toBe('products'); expect(v.summary.businessSource).toBe('ai');
    expect(v.intelligence?.provenance).toBe('simulation'); expect(v.intelligence?.reply?.question?.choices).toHaveLength(3);
    v = await send({ action: 'answer-ai', questionId: 'premiere-clientele', choices: ['parents','other'], text: 'Librairies spécialisées' });
    expect(v.summary.target).toBe('Parents ; Librairies spécialisées');
    expect(conversationView(user, cid).summary.target).toBe(v.summary.target);
    expect(fake.calls).toBe(1); expect(balance(user.id).used).toBe(before.used); // faux fournisseur : pas un coût réel mesuré
  });
  it('comprend les services apportés par le client, ne crée aucun véhicule ni panier', async () => {
    const text = 'J’aménage des fourgons apportés par les clients, je veux des devis et RDV';
    const { user, cid, send } = await initial(text);
    fake.reply = reply({ business: 'services', businessEvidence: { sourceId: 'brief.description', quote: text }, question: { id: 'parcours-contact', field: 'goals', title: 'Quel contact privilégier ?', why: 'Confirmer les deux parcours que vous avez indiqués.', multiple: true, choices: [{id:'quote',label:'Devis'}, {id:'booking',label:'Rendez-vous'}, {id:'other',label:'Autre'}] } });
    await execute(user, cid); let v = await send({ action:'answer-ai', questionId:'parcours-contact', choices:['quote','booking'] });
    expect(v.summary.business).toBe('services'); expect(v.summary.contactModes).toEqual(['quote','booking']); expect(v.tools.find(t=>t.id==='purchase')?.executionEnabled).toBe(false);
    expect(all('SELECT * FROM projects WHERE user_id=?',user.id)).toHaveLength(0);
  });
  it('conserve inconnu, Pourquoi, retour et correction sans nouvel appel', async () => {
    const { user,cid,send }=await initial(); fake.reply=reply(); await execute(user,cid);
    expect((await send({action:'explain'})).message).toContain('clientèle');
    let v=await send({action:'answer-ai',questionId:'premiere-clientele',unknown:true});
    expect(v.summary.unknown).toContain('À qui souhaitez-vous vous adresser ?');
    await send({action:'back-ai',questionId:'premiere-clientele'});
    v=await send({action:'answer-ai',questionId:'premiere-clientele',text:'Professionnels de la décoration'});
    expect(v.summary.target).toBe('Professionnels de la décoration'); expect(fake.calls).toBe(1);
  });
  it('refuse faux choix, outil forgé, statut exécuté et réponse hors contrat', async () => {
    expect(CognitiveReplySchema.safeParse({...reply(),actionsExecuted:true,publish:true}).success).toBe(false);
    const {user,cid,send}=await initial(); fake.reply=reply(); await execute(user,cid);
    await expect(send({action:'answer-ai',questionId:'premiere-clientele',choices:['admin']})).rejects.toThrow('choice');
    await expect(send({action:'execute',tool:'publish'})).rejects.toThrow();
  });
  it('aucun accès étranger, pas de devis/client ni export de contexte d’un autre compte', async () => {
    const a=await initial(), b=await initial('Je répare des horloges de gare');
    const q=quote(a.user,a.cid);
    expect(()=>quote(b.user,a.cid)).toThrow('introuvable');
    expect(()=>confirmCognitiveQuote(b.user,b.cid,q.id,id())).toThrow('introuvable');
    const exported=exportAccountData(a.user.id);
    expect(exported.tables.agent_conversation_quotes).toHaveLength(1);
    expect(JSON.stringify(exported)).not.toContain('horloges de gare');
    expect(JSON.stringify(exported.tables.agent_conversation_quotes)).not.toContain('capMicro');
  });
  it('ne double pas une confirmation ni l’exécution reprise du même job', async () => {
    const {user,cid}=await initial(); fake.reply=reply(); const {q,job}=await execute(user,cid);
    expect(confirmCognitiveQuote(user,cid,q.id,id()).jobId).toBe(job.id);
    const ctx=new JobContext(one<Job>('SELECT * FROM jobs WHERE id=?',job.id)!);
    expect((await runCognitiveJob(ctx)).reused).toBe(true); expect(fake.calls).toBe(1);
  });
  it('invalide un devis après correction et refuse un fournisseur indisponible sans repli local', async () => {
    const {user,cid,send}=await initial(); const q=quote(user,cid);
    await send({action:'edit',field:'constraints',value:'Aucun avis inventé'});
    expect(()=>confirmCognitiveQuote(user,cid,q.id,id())).toThrow('contexte');
    fake.fail=true; expect(()=>quote(user,cid)).toThrow('Fournisseur'); expect(fake.calls).toBe(0);
  });
  it('refuse des faits non cités et une question déjà résolue, sans régénération automatique', async () => {
    const {user,cid}=await initial(); fake.reply=reply({proposedChanges:[{field:'constraints',value:'garantie 50 ans',sourceId:'brief.description',quote:'garantie 50 ans'}]});
    await expect(execute(user,cid)).rejects.toThrow('unsupported'); expect(fake.calls).toBe(1);
    expect(conversationView(user,cid).summary.constraints).toBe('');
  });
  it('protège les modifications concurrentes et conserve la réponse acquise dans le checkpoint', async () => {
    const {user,cid,send}=await initial(); fake.reply=reply(); const q=quote(user,cid); const j=confirmCognitiveQuote(user,cid,q.id,id());
    await send({action:'edit',field:'target',value:'Architectes'});
    const claimed=claimNext(['agent.reason'])!;
    await expect(runCognitiveJob(new JobContext(claimed))).rejects.toThrow('contexte'); expect(fake.calls).toBe(0);
    expect(conversationView(user,cid).summary.target).toBe('Architectes');
  });
  it.each([
    ['Je fabrique des capteurs de ruches pour les apiculteurs professionnels.', 'products'],
    ['Je maintiens les pompes industrielles sur les sites des clients.', 'services'],
    ['I teach Japanese online and need appointments, no physical products.', 'services'],
    ['Je vends plusieurs encres et accessoires, chaque article a sa propre référence.', 'products'],
  ] as const)('conserve et restitue un cas nouveau : %s (fournisseur simulé)',async(text,business)=>{
    const {user,cid}=await initial(text);fake.reply=reply({business,businessEvidence:{sourceId:'brief.description',quote:text}});
    await execute(user,cid);const v=conversationView(user,cid);
    expect(v.summary.description).toBe(text);expect(v.summary.business).toBe(business);
    expect(currentBrief(ownedConversation(user,cid)).brief.input.business).toBe(business);
    expect(v.summary.approved).toBe(false);
  });
  it('une intention ambiguë garde le type inconnu ; aucun choix commercial imposé',async()=>{
    const {user,cid}=await initial('Je souhaite un studio autour du végétal, peut-être vendre ou conseiller.');
    fake.reply=reply({business:null,businessEvidence:null,question:{id:'nature-offre',field:'business',title:'Quelle activité souhaitez-vous proposer en premier ?',why:'Vente et conseil conduisent à des parcours différents.',multiple:false,choices:[{id:'products',label:'Vendre mes produits'},{id:'services',label:'Proposer une prestation'},{id:'other',label:'Autre / préciser'}]}});
    await execute(user,cid);expect(conversationView(user,cid).summary.business).toBeNull();
    expect(conversationView(user,cid).creation?.available).toBe(false);
  });
  it('un changement d’activité confirmé par le client prime et nécessite une nouvelle validation explicite',async()=>{
    const {user,cid,send}=await initial();await send({action:'answer',question:'business',choices:['products']});
    const correction='Finalement je ne vends rien, je propose des prestations de réparation.';
    await send({action:'message',text:correction});
    const source=cognitiveContext(ownedConversation(user,cid)).sources.find(s=>s.text===correction)!;
    fake.reply=reply({business:'services',businessEvidence:{sourceId:source.id,quote:correction},question:null,status:'summary'});
    await execute(user,cid);let v=conversationView(user,cid);expect(v.summary.business).toBe('products');
    expect(v.intelligence?.proposalId).toBeTruthy();
    v=await send({action:'accept-ai-changes',proposalId:v.intelligence!.proposalId!});
    expect(v.summary.business).toBe('services');expect(v.summary.businessSource).toBe('client');
  });
  it('ne perd pas une consigne ancienne quand l’historique transféré est limité',async()=>{
    const {user,cid,send}=await initial();
    await send({action:'message',text:'Ne jamais présenter une certification qui ne figure pas dans mes documents.'});
    for(let i=0;i<14;i++)await send({action:'message',text:`Question de fonctionnement numéro ${i}.`});
    const ctx=cognitiveContext(ownedConversation(user,cid));
    expect(ctx.sources.some(s=>s.text.startsWith('Ne jamais présenter une certification'))).toBe(true);
    expect(currentBrief(ownedConversation(user,cid)).brief.clientStatements).toHaveLength(15);
  });
  it('une réponse ne peut pas annoncer une action métier terminée sans reçu',()=>{
    for(const message of ['C’est fait.','Votre site a été créé.','I have published your store.'])expect(CognitiveReplySchema.safeParse(reply({message})).success).toBe(false);
  });
  it('bloque une route de niveau insuffisant au lieu de dégrader la cognition',async()=>{
    const {user,cid}=await initial();
    setJsonSetting('ai.routes',{agent_conversation:{provider:'anthropic',model:TEXT_MODEL_BY_TIER.light}});
    expect(()=>quote(user,cid)).toThrow('niveau requis');expect(fake.calls).toBe(0);setJsonSetting('ai.routes',{});
  });
  it('le budget révoqué entre devis et confirmation bloque avant création de tâche',async()=>{
    const {user,cid}=await initial(),q=quote(user,cid);
    run('UPDATE wallets SET monthly_used=monthly_allowance WHERE user_id=?',user.id);
    expect(()=>confirmCognitiveQuote(user,cid,q.id,id())).toThrow();
    expect(all("SELECT * FROM jobs WHERE type='agent.reason' AND user_id=?",user.id)).toHaveLength(0);expect(fake.calls).toBe(0);
  });
  it('le dialogue sur un projet avancé n’altère ni ses acquis ni ses droits',async()=>{
    const user=await account(),pid=project(user,'services');
    const {commitState,stateOf}=await import('@/lib/preparation/store');
    const c=openProjectConversation(user,pid),send=sender(user,c.id);
    await send({action:'message',text:'Je répare des instruments anciens.'});
    commitState(pid,stateOf(pid)!.revision,s=>{s.stages.brief!.status='approved';});
    const before=JSON.stringify(stateOf(pid));
    await send({action:'message',text:'Quels exports propose le Studio ?'});
    for(let i=0;i<13;i++)await send({action:'message',text:`Question conservée sur un projet protégé ${i}.`});
    expect(cognitiveContext(ownedConversation(user,c.id)).sources.some(s=>s.text==='Quels exports propose le Studio ?')).toBe(true);
    fake.reply=reply({business:null,businessEvidence:null,status:'answer',question:null,message:'Wix et Squarespace reçoivent un kit de reprise ; ce n’est pas un thème installable.',knowledgeSourceIds:['studio.exports']});
    await execute(user,c.id);
    expect(JSON.stringify(stateOf(pid))).toBe(before);expect(conversationView(user,c.id).intelligence?.reply?.knowledgeSourceIds).toEqual(['studio.exports']);
  });
  it('sauvegarde une correction ciblée seulement après acceptation, sans effacer les contraintes déjà acquises',async()=>{
    const {user,cid,send}=await initial();await send({action:'edit',field:'constraints',value:'Aucun avis inventé.'});
    const note='Aucune personne générée.';await send({action:'message',text:note});
    const source=cognitiveContext(ownedConversation(user,cid)).sources.find(s=>s.text===note)!;
    fake.reply=reply({proposedChanges:[{field:'constraints',value:note,sourceId:source.id,quote:note}]});
    await execute(user,cid);let v=conversationView(user,cid);expect(v.summary.constraints).toBe('Aucun avis inventé.');
    v=await send({action:'accept-ai-changes',proposalId:v.intelligence!.proposalId!});
    expect(v.summary.constraints).toBe('Aucun avis inventé.\nAucune personne générée.');expect(fake.calls).toBe(1);
  });
  it('Pourquoi et synthèse conservent une proposition inchangée sans obliger à repayer une réponse',async()=>{
    const {user,cid,send}=await initial(),note='Clientèle souhaitée : les décorateurs.';await send({action:'message',text:note});
    const source=cognitiveContext(ownedConversation(user,cid)).sources.find(s=>s.text===note)!;
    fake.reply=reply({proposedChanges:[{field:'target',value:'les décorateurs',sourceId:source.id,quote:note}]});await execute(user,cid);
    const proposal=conversationView(user,cid).intelligence!.proposalId!;await send({action:'explain'});await send({action:'summary'});
    const v=await send({action:'accept-ai-changes',proposalId:proposal});expect(v.summary.target).toBe('les décorateurs');expect(fake.calls).toBe(1);
  });
  it('une correction faite dans un autre écran rend la proposition périmée même si la conversation n’a pas changé',async()=>{
    const user=await account(),pid=project(user),c=openProjectConversation(user,pid),send=sender(user,c.id),text='Je fabrique des capteurs pour les apiculteurs.';await send({action:'message',text});
    fake.reply=reply({business:null,businessEvidence:null,question:null,status:'summary',proposedChanges:[{field:'target',value:'les apiculteurs',sourceId:'brief.description',quote:text}]});await execute(user,c.id);
    const proposal=conversationView(user,c.id).intelligence!.proposalId!;const{commitState,stateOf}=await import('@/lib/preparation/store');commitState(pid,stateOf(pid)!.revision,s=>{s.stages.brief!.data.input.target='Clientèle corrigée ailleurs';});
    expect(conversationView(user,c.id).intelligence?.state).toBe('stale');await expect(send({action:'accept-ai-changes',proposalId:proposal})).rejects.toMatchObject({code:'conversation_proposal_stale'});
    expect(conversationView(user,c.id).summary.target).toBe('Clientèle corrigée ailleurs');expect(fake.calls).toBe(1);
  });
  it('remettre une réponse à inconnu retire le fait actif, conserve l’histoire et ne demande aucun appel',async()=>{
    const{user,cid,send}=await initial();fake.reply=reply();await execute(user,cid);await send({action:'answer-ai',questionId:'premiere-clientele',choices:['parents']});await send({action:'back-ai',questionId:'premiere-clientele'});
    await send({action:'answer-ai',questionId:'premiere-clientele',unknown:true});const v=conversationView(user,cid);
    expect(v.summary.target).toBe('');expect(v.summary.facts.find(f=>f.key==='conversation.target')?.status).toBe('unknown');expect(v.summary.unknown).toContain('À qui souhaitez-vous vous adresser ?');
    expect(v.history.some(t=>(t.request as {clientAnswer?:string}).clientAnswer==='Parents')).toBe(true);expect(fake.calls).toBe(1);
  });
  it('une contrainte supplémentaire inconnue ne retire pas un interdit déjà confirmé',async()=>{
    const{user,cid,send}=await initial();await send({action:'edit',field:'constraints',value:'Aucun avis inventé.'});fake.reply=reply({question:{id:'autres-contraintes',field:'constraints',title:'Avez-vous d’autres contraintes ?',why:'Préserver vos consignes.',multiple:false,choices:[{id:'oui',label:'Oui'},{id:'other',label:'Autre'}]}});await execute(user,cid);
    await send({action:'answer-ai',questionId:'autres-contraintes',unknown:true});expect(conversationView(user,cid).summary.constraints).toBe('Aucun avis inventé.');
  });
  it('rattacher le même brouillon conserve sa proposition utilisable sans nouvel appel',async()=>{
    const{user,cid,send}=await initial(),text='Ma cible est les décorateurs.';await send({action:'message',text});const source=cognitiveContext(ownedConversation(user,cid)).sources.find(s=>s.text===text)!;
    fake.reply=reply({proposedChanges:[{field:'target',value:'les décorateurs',sourceId:source.id,quote:text}]});await execute(user,cid);const v=conversationView(user,cid),pid=project(user);openProjectConversation(user,pid,cid,v.revision);
    const saved=await send({action:'accept-ai-changes',proposalId:v.intelligence!.proposalId!});expect(saved.summary.target).toBe('les décorateurs');expect(fake.calls).toBe(1);
  });
});
