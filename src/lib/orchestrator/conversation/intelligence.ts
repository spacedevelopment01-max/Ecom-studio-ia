/** Dialogue cognitif : devis exact → accord → worker natif → reçu ; aucun SDK, wallet ou moteur parallèle. */
import { z } from 'zod';
import { HttpError, type User } from '../../auth';
import { all, id, json, now, one, run, tx } from '../../db';
import { stableHash } from '../../brain/hash';
import { assertCanSpend } from '../../billing';
import { budgetPctOf } from '../../ai/budget-pct';
import { assertAiAllowed, runForUser } from '../../ai/access';
import { callCostBoundMicro, estimateCallMicro, llmJson, routeLlm, strictTextQuoteInput, textProviderReady, withSelectedStrategy, type LlmCall } from '../../ai/llm';
import { withTrace } from '../../ai/trace';
import { activeProviderKey, requirePrice } from '../../ai/config';
import { pendingSubscriptions, projectAccountKey, runForPendingSubscription } from '../../project-billing';
import { enqueue, type Job, type JobContext } from '../../jobs';
import { requirePlan } from '../../plan-gates';
import { L } from '../../i18n-server';
import { currentBrief, metaOf, ownedConversation } from './store';
import { assertBriefWritable, saveBrief } from './tools';
import { COGNITIVE_SYSTEM, cognitiveContext } from './intelligence-context';
import { CognitiveReplySchema, type CognitiveReply, type IntelligenceView } from './intelligence-contract';
import type { ConversationRow } from './contract';

export const intelligenceEnabled = () => process.env.STUDIO_CONVERSATION_AI === '1';
export function assertIntelligenceEnabled() {
  if (!intelligenceEnabled()) throw new HttpError(404, L('Dialogue IA indisponible.', 'AI dialogue unavailable.'), 'conversation_ai_disabled');
}
type QuoteRow = { id: string; conversation_id: string; revision: number; project_revision: number | null; billing_key: string; plan_json: string; created_at: number; job_id: string | null };
type Plan = { call: LlmCall; hash: string; capMicro: number; estimateMicro: number; contextHash: string };
const expires = 15 * 60000;
function account(c: ConversationRow, user: User, selected?: string) {
  if (c.project_id) { requirePlan(user, c.project_id); return projectAccountKey(c.project_id); }
  const pending = pendingSubscriptions(user.id);
  if (!selected && pending.length !== 1) throw new HttpError(409, L('Choisissez l’abonnement qui finance ce dialogue.', 'Choose the subscription funding this dialogue.'), 'conversation_subscription_selection');
  const sub = pending.find(s => s.user_id === (selected ?? pending[0]?.user_id));
  if (!sub) throw new HttpError(402, L('Abonnement libre actif introuvable.', 'Active unbound subscription not found.'), 'subscription_required');
  return sub.user_id;
}
function scoped<T>(c: ConversationRow, userId: string, key: string, fn: () => T): T {
  return c.project_id ? fn() : runForPendingSubscription(userId, key, fn);
}
function makePlan(c: ConversationRow, user: User): Plan {
  const prepared = cognitiveContext(c);
  if (!c.revision || !prepared.sources.length) throw new HttpError(409, L('Décrivez votre projet ou posez votre question avant le devis.', 'Describe your project or ask a question before quoting.'));
  if (!textProviderReady()) throw new HttpError(409, L('Fournisseur de langage indisponible : le message reste conservé. Aucun raisonnement local ne remplace l’IA.', 'Language provider unavailable: your message is kept. Local reasoning does not replace AI.'), 'conversation_ai_unavailable');
  const call = withSelectedStrategy({ task: 'agent_conversation', userId: user.id, projectId: c.project_id, system: COGNITIVE_SYSTEM, context: prepared.serialized,
    prompt: 'Réponds à la dernière demande du client dans sources, en tenant compte du brief et de la question précédente. Respecte le contrat JSON et les faits cités.',
    maxTokens: 6000, maxOutputTokens: 6000, promptKey: 'central-conversation-B1', routing: { difficulty: 'complex' } });
  const route = routeLlm(call);
  if (route.mode !== 'llm' || route.tier !== 'strong') throw new HttpError(409, L('Aucun modèle du niveau requis n’est disponible. Le dialogue reste enregistré.', 'No model at the required level is available. The conversation is kept.'), 'conversation_ai_quality_route');
  if (!activeProviderKey(route.provider as Parameters<typeof activeProviderKey>[0])) throw new HttpError(409, L('Le fournisseur de cette route est indisponible. Aucun repli inférieur ni appel n’a été lancé.', 'The provider for this route is unavailable. No lower-quality fallback or request was started.'), 'conversation_ai_unavailable');
  requirePrice(route.provider, route.model);
  call.expectedRoute = { provider: route.provider, model: route.model, ...(route.effort ? { effort: route.effort } : {}) };
  const tokens = strictTextQuoteInput(call, CognitiveReplySchema);
  const cap = callCostBoundMicro(route.provider, route.model, tokens.maximumTokens, 6000, route.effort ?? null);
  const estimate = estimateCallMicro(route.provider, route.model, tokens.typicalTokens, 1200);
  if (cap == null || estimate == null || cap <= 0 || !Number.isSafeInteger(cap)) throw new HttpError(409, L('Tarif ou plafond inconnu : aucun appel autorisé.', 'Unknown price or bound: no request authorized.'), 'conversation_ai_price_missing');
  // strict:true dans le worker : UN appel, pas de réparation JSON ni allongement de sortie facturant.
  const hash = stableHash('cognitive-quote-B1', { call, cap, estimate, contextHash: prepared.fingerprint });
  return { call, hash, capMicro: cap, estimateMicro: estimate, contextHash: prepared.fingerprint };
}
export function createCognitiveQuote(user: User, cid: string, input: { revision: number; projectRevision: number | null; subscriptionKey?: string }) {
  assertIntelligenceEnabled();
  return tx(() => {
    const c = ownedConversation(user, cid), current = currentBrief(c);
    if (c.revision >= 999) throw new HttpError(409, 'conversation_limit');
    if (input.revision !== c.revision || input.projectRevision !== current.revision) throw new HttpError(409, L('Le contexte a changé : rechargez le dialogue.', 'Context changed: reload the conversation.'), 'conversation_quote_stale');
    if (metaOf(c).intelligence?.pendingJobId && activeJob(metaOf(c).intelligence!.pendingJobId!)) throw new HttpError(409, L('Une réponse est déjà en préparation.', 'A reply is already being prepared.'), 'conversation_ai_pending');
    const key = account(c, user, input.subscriptionKey);
    return scoped(c, user.id, key, () => {
      assertAiAllowed(user.id, c.project_id);
      const plan = makePlan(c, user); assertCanSpend(user.id, plan.capMicro, c.project_id);
      const estimatePct = budgetPctOf(user.id, plan.estimateMicro, c.project_id), maximumPct = budgetPctOf(user.id, plan.capMicro, c.project_id);
      if (estimatePct == null || maximumPct == null || !Number.isFinite(maximumPct)) throw new HttpError(409, 'conversation_budget_unavailable');
      const qid = id(), at = now();
      run('INSERT INTO agent_conversation_quotes(id,conversation_id,revision,project_revision,billing_key,plan_json,created_at) VALUES(?,?,?,?,?,?,?)', qid, cid, c.revision, current.revision, key, JSON.stringify(plan), at);
      return { id: qid, estimatePct, maximumPct, expiresAt: at + expires, confirmationRequired: true, maxCalls: 1, actionsExecuted: false };
    });
  });
}
function activeJob(jid: string) { return one<Job>("SELECT * FROM jobs WHERE id=? AND status IN ('queued','running','paused','blocked')", jid); }
function checkedQuote(user: User, cid: string, qid: string, refresh = true) {
  const c = ownedConversation(user, cid), q = one<QuoteRow>('SELECT * FROM agent_conversation_quotes WHERE id=? AND conversation_id=?', qid, cid);
  if (!q) throw new HttpError(404, L('Devis introuvable.', 'Quote not found.'));
  if (now() - q.created_at > expires || c.revision !== q.revision || currentBrief(c).revision !== q.project_revision) throw new HttpError(409, L('Ce devis a expiré ou son contexte a changé.', 'This quote expired or its context changed.'), 'conversation_quote_stale');
  const key = account(c, user, q.billing_key), saved = JSON.parse(q.plan_json) as Plan;
  if (key !== q.billing_key) throw new HttpError(409, 'conversation_billing_changed');
  if (refresh) scoped(c, user.id, key, () => {
    assertAiAllowed(user.id, c.project_id);
    if (makePlan(c, user).hash !== saved.hash) throw new HttpError(409, L('La route, le tarif ou la demande ont changé : actualisez le devis.', 'The route, price or request changed: refresh the quote.'), 'conversation_quote_changed');
    assertCanSpend(user.id, saved.capMicro, c.project_id);
  });
  return { c, q, plan: saved, key };
}
export function confirmCognitiveQuote(user: User, cid: string, qid: string, requestId: string) {
  assertIntelligenceEnabled();
  return tx(() => {
    // Une confirmation déjà acquise récupère son job même après expiration : jamais un deuxième appel.
    const c0 = ownedConversation(user, cid), q0 = one<QuoteRow>('SELECT * FROM agent_conversation_quotes WHERE id=? AND conversation_id=?', qid, cid);
    if (q0?.job_id) {
      const existing = one<Job>('SELECT * FROM jobs WHERE id=? AND user_id=? AND project_id IS ?', q0.job_id, user.id, c0.project_id);
      if (existing) return { jobId: existing.id, status: existing.status, reused: true };
      throw new HttpError(409, 'conversation_job_missing');
    }
    const { c, q, plan } = checkedQuote(user, cid, qid), m = metaOf(c);
    if (m.intelligence?.pendingJobId && activeJob(m.intelligence.pendingJobId)) throw new HttpError(409, 'conversation_ai_pending');
    const job = enqueue({ userId: user.id, projectId: c.project_id, type: 'agent.reason', label: L('Réponse de l’agent IA', 'AI assistant reply'), payload: { conversationId: cid, quoteId: q.id, requestId, costCapMicro: plan.capMicro }, idempotencyKey: `agent-reason:${q.id}`, maxAttempts: 1 });
    m.intelligence = { ...m.intelligence, pendingJobId: job.id };
    run('UPDATE agent_conversations SET state_json=?,updated_at=? WHERE id=?', JSON.stringify(m), now(), cid);
    run('UPDATE agent_conversation_quotes SET job_id=? WHERE id=? AND job_id IS NULL', job.id, q.id);
    return { jobId: job.id, status: job.status, reused: false };
  });
}

export function intelligenceView(c: ConversationRow): IntelligenceView {
  const s = metaOf(c).intelligence, job = s?.pendingJobId ? one<Pick<Job, 'status' | 'message'>>('SELECT status,message FROM jobs WHERE id=? AND user_id=?', s.pendingJobId, c.user_id) : null;
  const state = job && ['queued','running','paused','blocked'].includes(job.status) ? 'running' : job?.status === 'failed' ? 'failed' : s?.sourceRevision != null && s.sourceRevision !== c.revision ? 'stale' : s?.lastReply ? 'reply' : c.revision ? 'requires_quote' : 'describe';
  return { available: intelligenceEnabled(), state, pendingJobId: s?.pendingJobId ?? null, reply: s?.lastReply ?? null, proposalId: s?.proposalId ?? null, sourceRevision: s?.sourceRevision ?? null,
    provenance: s?.lastReply ? process.env.NODE_ENV === 'test' ? 'simulation' : 'provider' : null, qualification: 'real_provider_not_tested',
    message: state === 'failed' ? L('La réponse a échoué. Vos acquis sont conservés ; aucune relance automatique payante.', 'The reply failed. Your work is kept; no automatic paid retry.') : state === 'running' ? L('Réponse en préparation, sauvegardée après fermeture.', 'Reply in progress, saved after closing.') : L('Réflexion IA sur devis et confirmation. Aucun outil métier n’est exécuté par cette réponse.', 'AI reasoning requires a quote and consent. No business tool is executed by this reply.') };
}

function validateReply(reply: CognitiveReply, c: ConversationRow, context: ReturnType<typeof cognitiveContext>) {
  const evidence = (sourceId: string, quote: string, value?: string) => {
    const source = context.sources.find(s => s.id === sourceId);
    if (!source || !source.text.includes(quote) || value && !quote.includes(value)) throw new Error('conversation_unsupported_client_fact');
  };
  if (reply.business) {
    if (!reply.businessEvidence) throw new Error('conversation_business_evidence_missing');
    evidence(reply.businessEvidence.sourceId, reply.businessEvidence.quote);
  }
  for (const change of reply.proposedChanges) evidence(change.sourceId, change.quote, change.value);
  if (reply.knowledgeSourceIds.some(id => !context.knowledge.some(k => k.id === id))) throw new Error('conversation_unknown_knowledge_source');
  if (reply.question) {
    const answered = currentBrief(c).brief.profile.questions.find(q => q.id === reply.question!.id && (q.answer || q.later));
    if (answered) throw new Error('conversation_question_already_answered');
    if ((reply.question.field === 'target' && currentBrief(c).brief.input.target) || (reply.question.field === 'business' && ['client','existing'].includes(metaOf(c).businessSource))) throw new Error('conversation_field_already_known');
  }
}
/** Exécuté uniquement par le worker natif. Les tests remplacent le fournisseur, jamais le corps HTTP. */
export async function runCognitiveJob(ctx: JobContext) {
  assertIntelligenceEnabled();
  const input = z.object({ conversationId: z.string(), quoteId: z.string() }).passthrough().parse(ctx.payload);
  const user = one<User>('SELECT * FROM users WHERE id=?', ctx.job.user_id);
  if (!user) throw new HttpError(404, 'conversation_owner_missing');
  const receipt = await ctx.step('cognitive-reply', async () => {
    const owned = ownedConversation(user, input.conversationId);
    const savedQuote = one<QuoteRow>('SELECT * FROM agent_conversation_quotes WHERE id=? AND conversation_id=?', input.quoteId, owned.id);
    // Après une coupure entre reçu fournisseur et checkpoint, relire seulement le reçu acquis.
    // La vérification native du hash complet reste obligatoire ; acquiredOnly interdit un nouvel envoi.
    const acquired = !!one("SELECT 1 FROM ai_reservations WHERE job_id=? AND project_id IS ? AND task='agent_conversation' AND result IS NOT NULL AND status IN ('settled','reconciled')", ctx.job.id, owned.project_id);
    const { c, q, plan, key } = acquired && savedQuote
      ? { c: owned, q: savedQuote, plan: JSON.parse(savedQuote.plan_json) as Plan, key: account(owned, user, savedQuote.billing_key) }
      : checkedQuote(user, input.conversationId, input.quoteId);
    if (q.job_id !== ctx.job.id || c.project_id !== ctx.job.project_id) throw new HttpError(409, 'conversation_job_binding');
    ctx.progress(.15, L('Lecture du brief et de votre demande', 'Reading your brief and request'));
    return scoped(c, user.id, key, () => runForUser(user.id, () => scoped(c, user.id, key, () => withTrace({ jobId: ctx.job.id, projectId: c.project_id, step: 'conversation', costCapMicro: plan.capMicro }, async () => {
      const call = { ...plan.call, jobId: ctx.job.id, usageKey: `${ctx.job.id}:dialogue`, acquiredOnly: acquired };
      const raw = await llmJson(call, CognitiveReplySchema, { strict: true });
      const reply = CognitiveReplySchema.parse(raw); validateReply(reply, c, cognitiveContext(c));
      return { reply, sourceRevision: q.revision, projectRevision: q.project_revision, quoteId: q.id };
    })), 'normal', c.project_id));
  });
  return tx(() => {
    const c = ownedConversation(user, input.conversationId), m = metaOf(c);
    if (m.intelligence?.lastReceiptId === ctx.job.id) return { conversationId: c.id, revision: c.revision, reused: true, actionsExecuted: false };
    if (c.revision !== receipt.sourceRevision || currentBrief(c).revision !== receipt.projectRevision) {
      // Le checkpoint conserve la réponse acquise ; ne pas écraser une modification concurrente ni refaire l'appel.
      return { conversationId: c.id, status: 'stale', resultPreserved: true, actionsExecuted: false };
    }
    const { brief, revision } = currentBrief(c);
    if (receipt.reply.business && !['client','existing'].includes(m.businessSource)) {
      try { assertBriefWritable(c, user, revision); brief.input.business = receipt.reply.business; saveBrief(c, brief, user, revision); if (!c.project_id) m.draft = brief; m.business = receipt.reply.business; m.businessSource = 'ai'; }
      catch (e) { if (!(e instanceof HttpError)) throw e; }
    }
    const next = c.revision + 1;
    const businessChange = receipt.reply.business && m.business && receipt.reply.business !== m.business;
    m.intelligence = { ...m.intelligence, lastReply: receipt.reply, lastReceiptId: ctx.job.id, pendingJobId: undefined, sourceRevision: next, proposalId: receipt.reply.proposedChanges.length || businessChange ? id() : undefined,
      questionHistory: [...(m.intelligence?.questionHistory ?? []).filter(q => q.id !== receipt.reply.question?.id), ...(receipt.reply.question ? [receipt.reply.question] : [])].slice(-100) };
    run('UPDATE agent_conversations SET revision=?,state_json=?,updated_at=? WHERE id=? AND revision=?', next, JSON.stringify(m), now(), c.id, c.revision);
    run('INSERT INTO agent_conversation_turns(id,conversation_id,revision,request_id,request_hash,request_json,response_json,created_at) VALUES(?,?,?,?,?,?,?,?)', id(), c.id, next, `ai_${ctx.job.id}`, stableHash('cognitive-receipt', receipt), JSON.stringify({ action: 'agent-reply', quoteId: receipt.quoteId }), JSON.stringify({ message: receipt.reply.message, reply: receipt.reply, actionsExecuted: false }), now());
    ctx.progress(1, L('Réponse IA conservée ; vos validations restent nécessaires', 'AI reply saved; your approvals are still required'));
    return { conversationId: c.id, revision: next, actionsExecuted: false };
  });
}
