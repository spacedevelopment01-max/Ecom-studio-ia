/**
 * Boucle d'agent SINA (#492). Un message du client lance une exécution (tâche de fond reprenable) :
 *   1. le modèle relit le fil complet (ses propres réponses, les décisions, les résultats d'outils, les pièces jointes) ;
 *   2. il choisit des outils du registre commun et leurs arguments ;
 *   3. le serveur valide, applique droits / budget autorisé / accord des actions sensibles, exécute la fonction native
 *      et relit l'effet (changements vérifiés) ;
 *   4. le modèle voit les résultats et continue (plusieurs étapes), pose une question, ou conclut.
 * Les créations natives longues (images, vidéos, thème…) suspendent l'exécution ; une tâche de reprise dépendante
 * repart quand elles sont terminées. Aucune règle par formulation : le choix appartient au modèle.
 */
import { z } from "zod";
import { HttpError, type User } from "../auth";
import { one, all, json, run as sql, id as newId } from "../db";
import { enqueue, getJob, type JobContext } from "../jobs";
import { llmJson, type LlmCall, type LlmImage } from "../ai/llm";
import { withTrace, CostCapReached } from "../ai/trace";
import { requirePlan } from "../plan-gates";
import { L } from "../i18n-server";
import { getJsonSetting } from "../settings";
import { allTools, getTool, isSensitive, toolCatalog } from "./registry";
import type { AgentTool, ToolContext, ToolResult } from "./types";
import { authorizedBudget, addMessage, createRun, getRun, lastMessages, pendingOf, recordChanges, runByRequest, activeRun, updateRun, type PendingAction, type SynaRun, type SynaMessage } from "./store";
import { budgetState, jobSpentMicro, trackJob, authorizeBudgetPct, DEFAULT_BUDGET_PCT } from "./budget";
import { attachmentsOf, attachmentImages, describeAttachment } from "./attachments";
import { projectSnapshot } from "./snapshot";
import { SYNA_SYSTEM } from "./prompt";
import { JOURNEY_STEPS, READY_STEPS, currentStep, journeyContext, journeyOf } from "./journey";
import { localDecision } from "./local-step";

export const MAX_STEPS = 12;
const MAX_ACTIONS = 8;

export const StepSchema = z.object({
  message: z.string().max(8000).default(""),
  actions: z.array(z.object({ tool: z.string().min(1).max(80), args: z.record(z.string(), z.unknown()).default({}), why: z.string().max(400).optional() })).max(MAX_ACTIONS).default([]),
  question: z.object({ text: z.string().min(1).max(1200), choices: z.array(z.string().max(200)).max(8).optional() }).nullable().optional(),
  done: z.boolean().default(false),
  /** Champ de la fiche de départ demandé par la question (étape 0), ou « confirm » pour le résumé. */
  askField: z.string().max(20).optional(),
});
export type StepOutput = z.infer<typeof StepSchema>;

/** Dépendances remplaçables par les tests (jamais par le client). */
export type AgentDeps = { reason?: (call: LlmCall) => Promise<StepOutput> };

const userOf = (uid: string) => one<User>("SELECT * FROM users WHERE id=?", uid)!;
const conversationOf = (cid: string) => one<{ id: string; user_id: string; project_id: string | null }>("SELECT id,user_id,project_id FROM agent_conversations WHERE id=?", cid);

function toolContext(user: User, r: SynaRun): ToolContext {
  return {
    user, projectId: r.project_id, conversationId: r.conversation_id, runId: r.id,
    attachment: (aid) => {
      const a = attachmentsOf(r.conversation_id).find((x) => x.id === aid);
      return a ? { id: a.id, kind: a.kind, name: a.name, path: a.path, assetId: a.assetId, analysis: a.analysis } : null;
    },
  };
}

/** Message du client : enregistré dans le fil, puis une exécution reprenable est mise en file. */
export function submitMessage(user: User, cid: string, input: { requestId: string; text: string; attachmentIds?: string[] }) {
  const c = conversationOf(cid);
  if (!c || c.user_id !== user.id) throw new HttpError(404, L("Conversation introuvable.", "Conversation not found."));
  if (c.project_id) requirePlan(user, c.project_id);
  const prior = runByRequest(cid, input.requestId);
  if (prior) return prior;
  const current = activeRun(cid);
  if (current && current.status !== "waiting_confirmation") throw new HttpError(409, L("SINA travaille encore sur ta demande précédente. Attends sa réponse ou arrête-la.", "SINA is still working on your previous request. Wait or stop it."), "syna_busy");
  if (current) { updateRun(current.id, { status: "cancelled", pending_json: null }); addMessage(cid, "event", { kind: "pending_dropped", runId: current.id }, current.id); }
  const attachments = (input.attachmentIds ?? []).filter((aid) => attachmentsOf(cid).some((a) => a.id === aid));
  if (authorizedBudget(cid) == null) { try { authorizeBudgetPct(user.id, c.project_id, cid, DEFAULT_BUDGET_PCT); } catch { /* budget non mesurable : accord demandé */ } }
  const r = createRun({ conversationId: cid, userId: user.id, projectId: c.project_id, requestId: input.requestId });
  addMessage(cid, "user", { text: input.text, attachments }, r.id);
  schedule(r);
  return getRun(r.id)!;
}

/**
 * Reprise de l'exécution. Les créations natives attendues ne sont PAS des dépendances bloquantes : une création en
 * échec doit aussi réveiller SINA pour qu'elle l'explique et propose la suite. La tâche de reprise relit leur état.
 */
function schedule(r: SynaRun, waitFor: string[] = [], delayMs = 0) {
  const job = enqueue({ userId: r.user_id, projectId: r.project_id, type: "syna.agent", label: L("SINA travaille", "SINA is working"), payload: { runId: r.id }, maxAttempts: 2, runAt: delayMs ? Date.now() + delayMs : undefined, idempotencyKey: `syna:${r.id}:${r.step}:${newId()}` });
  trackJob(r.conversation_id, r.id, job.id, "agent");
  updateRun(r.id, { job_id: job.id, status: waitFor.length ? "waiting_jobs" : "queued", waiting_jobs: JSON.stringify(waitFor) });
}

const ACTIVE_JOB = ["queued", "running", "paused"];
/** Attente courte dans la tâche de reprise, puis nouvelle reprise planifiée : aucune place de worker gardée longtemps. */
async function waitForJobs(jobs: string[], maxMs = 45_000) {
  const t0 = Date.now();
  for (;;) {
    if (!jobs.some((j) => ACTIVE_JOB.includes(getJob(j)?.status ?? ""))) return true;
    if (Date.now() - t0 > maxMs) return false;
    await new Promise((res) => setTimeout(res, 3000));
  }
}

/** Accord du client sur l'action en attente (sensible ou hors budget) : exécutée telle quelle, puis SINA continue. */
export function decidePending(user: User, cid: string, input: { pendingId: string; approve: boolean }) {
  const r = activeRun(cid);
  if (!r || r.user_id !== user.id || r.status !== "waiting_confirmation") throw new HttpError(409, L("Aucune action en attente d'accord.", "No action awaits your approval."));
  const p = pendingOf(r);
  if (!p || p.id !== input.pendingId) throw new HttpError(409, L("Cette proposition a changé. Relis la conversation.", "This proposal changed. Reload the conversation."));
  addMessage(cid, "event", { kind: input.approve ? "approved" : "declined", pendingId: p.id, tool: p.tool }, r.id);
  if (!input.approve) {
    addMessage(cid, "tool", { key: `pending:${p.id}`, tool: p.tool, ok: false, summary: L("Le client a refusé cette action. Rien n'a été modifié.", "The client declined this action. Nothing was changed.") }, r.id);
    updateRun(r.id, { pending_json: JSON.stringify({ ...p, declined: true }) });
  } else updateRun(r.id, { pending_json: JSON.stringify({ ...p, approved: true }) });
  schedule(getRun(r.id)!);
  return getRun(r.id)!;
}

export function stopRun(user: User, cid: string) {
  const r = activeRun(cid);
  if (!r || r.user_id !== user.id) return null;
  updateRun(r.id, { status: "cancelled", pending_json: null });
  if (r.job_id) sql("UPDATE jobs SET status='cancelled', updated_at=? WHERE id=? AND status IN ('queued','blocked')", Date.now(), r.job_id);
  addMessage(cid, "event", { kind: "stopped" }, r.id);
  return getRun(r.id);
}

/** Exécutée par le worker (`syna.agent`). */
export async function runAgentJob(ctx: JobContext, deps: AgentDeps = {}) {
  const { runId } = z.object({ runId: z.string() }).parse(json(ctx.job.payload, {}));
  return runAgent(runId, ctx.job.id, deps);
}

export async function runAgent(runId: string, jobId: string, deps: AgentDeps = {}) {
  let r = getRun(runId);
  if (!r || ["done", "failed", "cancelled"].includes(r.status)) return { runId, skipped: true };
  // Toute erreur, même avant la première étape (droits, forfait), clôt la demande et s'affiche dans le fil :
  // jamais une demande « en attente » pour toujours.
  let user: User, tctx: ReturnType<typeof toolContext>;
  try {
    user = userOf(r.user_id);
    if (r.project_id) requirePlan(user, r.project_id);
    updateRun(r.id, { status: "running", error: null });
    tctx = toolContext(user, r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    addMessage(r.conversation_id, "event", { kind: "error", message: clip(msg, 500) }, r.id);
    updateRun(runId, { status: "failed", error: clip(msg, 1000) as string });
    return { runId, failed: msg };
  }
  try {
    // 1. Résultats des créations natives attendues (images, vidéos, thème…).
    const waited = json<string[]>(r.waiting_jobs, []);
    if (waited.length && !(await waitForJobs(waited))) { schedule(r, waited, 10_000); return { runId, waiting: waited }; }
    if (waited.length) {
      const results = waited.map((jid) => { const j = getJob(jid); return { job: jid, type: j?.type, status: j?.status, message: j?.message, result: clip(j?.result ? json(j.result, j.result) : null, 1500), error: j?.error ? clip(j.error, 400) : undefined }; });
      addMessage(r.conversation_id, "tool", { key: `jobs:${r.step}`, tool: "jobs.wait", ok: results.every((x) => x.status === "done"), summary: L("Créations terminées : SINA les relit avant de conclure.", "Native creations finished: read them back before concluding."), data: results }, r.id);
      updateRun(r.id, { waiting_jobs: "[]" });
    }
    // 2. Action approuvée (ou refusée) par le client.
    const pending = pendingOf(r) as (PendingAction & { approved?: boolean; declined?: boolean }) | null;
    if (pending?.approved) {
      const t = getTool(pending.tool)!;
      const out = await execute(t, pending.args, tctx, `pending:${pending.id}`, r);
      updateRun(r.id, { pending_json: null });
      if (out.jobs?.length) return suspend(r, out.jobs);
    } else if (pending?.declined) updateRun(r.id, { pending_json: null });

    // 3. Étapes du modèle.
    for (;;) {
      r = getRun(runId)!;
      if (r.status === "cancelled") return { runId, cancelled: true };
      if (r.step >= MAX_STEPS) {
        addMessage(r.conversation_id, "assistant", { message: L(`J'ai enchaîné ${MAX_STEPS} étapes pour cette demande. Dites-moi si je continue.`, `I chained ${MAX_STEPS} steps for this request. Tell me if I should continue.`), actions: [], done: true }, r.id);
        updateRun(r.id, { status: "done" });
        return { runId, steps: r.step };
      }
      const step = r.step;
      updateRun(r.id, { step: step + 1 });
      let out: StepOutput;
      // Niveau gratuit : réponse simple à la question posée (étape 0) enregistrée par le moteur local, sans IA. Réglage
      // « syna.replies » : « personnalisées » (par défaut, choix du propriétaire) = le moteur local enregistre, puis
      // Claude Haiku rédige la réponse au client ; « locales » = le moteur local écrit aussi la réponse (0 €).
      const localFull = step === 0 ? localStepFor(r) : null;
      const personalized = getJsonSetting<string>("syna.replies", "personnalisees") !== "locales";
      const local = localFull && personalized ? { message: "", actions: localFull.actions, question: null, done: false } as StepOutput : localFull;
      if (local) out = local;
      else try {
        out = await reason(user, r, jobId, step, deps);
      } catch (e) {
        if (e instanceof CostCapReached) return askBudget(r, null);
        throw e;
      }
      addMessage(r.conversation_id, "assistant", { ...out, step, ...(local ? { local: true } : {}) }, r.id);
      if (!out.actions.length) {
        updateRun(r.id, { status: out.question ? "waiting_user" : "done" });
        return { runId, steps: step + 1 };
      }
      const launched: string[] = [];
      for (const [i, a] of out.actions.entries()) {
        const key = `${step}:${i}`;
        const t = getTool(a.tool);
        if (!t) { addMessage(r.conversation_id, "tool", { key, tool: a.tool, ok: false, summary: L("Outil inconnu : choisissez un outil du catalogue.", "Unknown tool: choose a tool from the catalogue.") }, r.id); continue; }
        const parsed = t.args.safeParse(a.args);
        if (!parsed.success) { addMessage(r.conversation_id, "tool", { key, tool: a.tool, ok: false, summary: L("Arguments invalides : ", "Invalid arguments: ") + parsed.error.issues.slice(0, 4).map((x) => `${x.path.join(".")}: ${x.message}`).join(" ; ") }, r.id); continue; }
        if (t.needsProject && !r.project_id) { addMessage(r.conversation_id, "tool", { key, tool: a.tool, ok: false, summary: L("Aucun projet n'est encore rattaché : créez d'abord le projet (outil project.create).", "No project yet: create it first (project.create).") }, r.id); continue; }
        // Accord explicite : actions sensibles, et dépenses au-delà du budget autorisé.
        if (isSensitive(t, parsed.data, tctx)) return askConfirmation(r, t, parsed.data, tctx, "sensitive");
        if (t.estimate) {
          // Un refus du moteur natif pendant le devis (étape préalable, droits, tarif) est un résultat d'outil : SINA
          // le lit et s'adapte (question au client, autre outil), l'exécution ne s'arrête pas.
          let est: Awaited<ReturnType<NonNullable<AgentTool["estimate"]>>>;
          try { est = await t.estimate(tctx, parsed.data); }
          catch (e) { addMessage(r.conversation_id, "tool", { key, tool: a.tool, args: parsed.data, ok: false, summary: L("Refus avant exécution : ", "Refused before running: ") + String(clip(e instanceof Error ? e.message : String(e), 600)) }, r.id); continue; }
          const b = budgetState(user.id, r.project_id, r.conversation_id);
          if (est.maxMicro > b.remainingMicro) return askConfirmation(r, t, parsed.data, tctx, "budget", est.maxMicro);
        }
        const res = await execute(t, parsed.data, tctx, key, r);
        // Un projet créé pendant l'exécution devient le projet de la suite (droits relus à chaque outil).
        const pid = conversationOf(r.conversation_id)?.project_id ?? null;
        if (pid !== r.project_id) { sql("UPDATE syna_runs SET project_id=? WHERE id=?", pid, r.id); r = getRun(runId)!; tctx.projectId = pid; }
        if (res.ambiguous) {
          addMessage(r.conversation_id, "assistant", { message: res.ambiguous.question, actions: [], question: { text: res.ambiguous.question, choices: res.ambiguous.choices }, done: false, step }, r.id);
          updateRun(r.id, { status: "waiting_user" });
          return { runId, waiting: "user" };
        }
        if (res.jobs?.length) launched.push(...res.jobs);
      }
      if (launched.length) return suspend(getRun(runId)!, launched);
      // Le moteur local a déjà écrit sa réponse (question suivante, résumé ou validation) : pas d'appel à l'IA ensuite,
      // sauf si une de ses actions a échoué (Claude reprend alors pour l'expliquer).
      if (local && !personalized) {
        const failed = all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE run_id=? AND role='tool'", r.id).some((m) => json<any>(m.content_json, {}).ok === false);
        if (!failed) { updateRun(r.id, { status: out.question ? "waiting_user" : "done" }); return { runId, steps: step + 1 }; }
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    addMessage(r!.conversation_id, "event", { kind: "error", message: clip(msg, 500) }, r!.id);
    updateRun(runId, { status: "failed", error: clip(msg, 1000) as string });
    throw e;
  }
}

function suspend(r: SynaRun, jobs: string[]) {
  for (const j of jobs) trackJob(r.conversation_id, r.id, j, "native");
  addMessage(r.conversation_id, "event", { kind: "waiting_jobs", jobs }, r.id);
  schedule(r, jobs);
  return { runId: r.id, waiting: jobs };
}

/** Exécution d'un outil : idempotente par clé (une reprise ne rejoue jamais une écriture acquise). */
async function execute(t: AgentTool, args: unknown, ctx: ToolContext, key: string, r: SynaRun): Promise<ToolResult> {
  const prior = all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND run_id=? AND role='tool'", r.conversation_id, r.id)
    .map((m) => json<any>(m.content_json, {})).find((m) => m.key === key && m.tool === t.name);
  if (prior) return prior.result ?? { ok: prior.ok, summary: prior.summary, data: prior.data, jobs: prior.jobs };
  if (t.needsProject && ctx.projectId) requirePlan(ctx.user, ctx.projectId);
  let res: ToolResult;
  try {
    res = await t.run(ctx, args);
  } catch (e) {
    const msg = e instanceof HttpError || e instanceof Error ? e.message : String(e);
    res = { ok: false, summary: L("Échec de l'outil : ", "Tool failed: ") + clip(msg, 600) };
  }
  if (res.changes?.length) recordChanges(r.conversation_id, r.id, t.name, res.changes);
  addMessage(r.conversation_id, "tool", { key, tool: t.name, args, ok: res.ok, summary: res.summary, data: clip(res.data, 6000), changes: res.changes, jobs: res.jobs, ambiguous: res.ambiguous }, r.id);
  return res;
}

async function askConfirmation(r: SynaRun, t: AgentTool, args: unknown, ctx: ToolContext, reason: "sensitive" | "budget", costMaxMicro?: number) {
  const preview = t.preview ? await t.preview(ctx, args) : `${t.name} ${JSON.stringify(args).slice(0, 600)}`;
  const p: PendingAction = { id: newId(), tool: t.name, args, reason, preview, costMaxMicro, createdAt: Date.now() };
  updateRun(r.id, { status: "waiting_confirmation", pending_json: JSON.stringify(p) });
  addMessage(r.conversation_id, "event", { kind: "confirmation", pending: p, budget: budgetState(r.user_id, r.project_id, r.conversation_id) }, r.id);
  return { runId: r.id, waiting: "confirmation" };
}

function askBudget(r: SynaRun, _x: null) {
  const p: PendingAction = { id: newId(), tool: "budget.raise", args: {}, reason: "budget", preview: L("Le budget autorisé pour SINA est atteint. Augmente-le pour qu'elle continue.", "SINA's authorised budget is used up. Raise it to continue."), createdAt: Date.now() };
  updateRun(r.id, { status: "waiting_confirmation", pending_json: JSON.stringify(p), step: Math.max(0, r.step - 1) });
  addMessage(r.conversation_id, "event", { kind: "confirmation", pending: p, budget: budgetState(r.user_id, r.project_id, r.conversation_id) }, r.id);
  return { runId: r.id, waiting: "budget" };
}

/** Décision du moteur local pour le message du client de cette demande, ou null (→ Claude). */
function localStepFor(r: SynaRun): StepOutput | null {
  const msgs = lastMessages(r.conversation_id, 60);
  const mine = msgs.filter((m) => m.runId === r.id && m.role === "user").pop();
  if (!mine) return null;
  const before = msgs.filter((m) => m.seq < mine.seq);
  const lastAssistant = [...before].reverse().find((m) => m.role === "assistant");
  const d = localDecision({
    journey: journeyOf(r.conversation_id), userText: String(mine.content?.text ?? ""), hasAttachments: !!mine.content?.attachments?.length,
    askField: (lastAssistant?.content?.askField as string | undefined) ?? null, hasProject: !!r.project_id, seq: mine.seq,
  });
  return d ? d.out : null;
}

/**
 * Modèle de chaque réponse (économie à qualité égale) : Claude Haiku 5.5, le moins cher, pour les échanges simples
 * (questions de départ, suivi, étape pas encore disponible) ; Claude Opus pour créer ou réfléchir (étapes créatives).
 */
export function modelFor(currentStepNumber: number): { provider: "anthropic"; model: string; effort?: string } | undefined {
  const simple = currentStepNumber === 0 || !READY_STEPS.includes(currentStepNumber);
  return simple ? { provider: "anthropic", model: "claude-haiku-5-5", effort: "low" } : undefined;
}

/** Un pas de raisonnement : fil complet + état du projet + pièces jointes (vision) → JSON d'actions. */
async function reason(user: User, r: SynaRun, jobId: string, step: number, deps: AgentDeps): Promise<StepOutput> {
  const history = lastMessages(r.conversation_id, 120);
  const images: LlmImage[] = step === 0 || newAttachmentSinceLastAssistant(history) ? attachmentImages(r.conversation_id, history) : [];
  const b = budgetState(user.id, r.project_id, r.conversation_id);
  const snapshot = r.project_id ? await projectSnapshot(toolContext(user, r)) : L("Aucun projet rattaché (brouillon). Pour agir sur un site ou une boutique, créez d'abord le projet avec project.create.", "No project linked yet (draft). Create it with project.create before acting.");
  const call: LlmCall = {
    task: "agent_conversation", userId: user.id, projectId: r.project_id, jobId,
    system: SYNA_SYSTEM, promptKey: "syna-agent-1",
    reference: `# Outils disponibles (registre commun)\n\n${toolCatalog(!!r.project_id)}`,
    context: `# Parcours de création (relu à cette étape)\n${journeyContext(journeyOf(r.conversation_id))}\n\n# État actuel du projet (relu à cette étape)\n${snapshot}\n\n# Budget autorisé pour SINA\nAutorisé : ${b.authorizedPct ?? 0} % du budget IA ; engagé : ${b.spentPct ?? 0} %. Au-delà, le serveur demande l'accord du client.\n\n# Pièces jointes du fil\n${attachmentsOf(r.conversation_id).map(describeAttachment).join("\n") || "aucune"}`,
    prompt: `# Fil de la conversation (le plus ancien d'abord ; vos propres réponses incluses)\n${serialize(history)}\n\nÉtape ${step + 1} de cette demande. Répondez avec l'objet JSON {message, actions, question, done}.`,
    images: images.length ? images : undefined,
    maxTokens: 12000, maxOutputTokens: 16000, usageKey: `syna:${r.id}:${step}`, routing: { difficulty: "complex", prefer: modelFor(currentStep(journeyOf(r.conversation_id))) },
  };
  if (deps.reason) return StepSchema.parse(await deps.reason(call));
  const cap = b.remainingMicro + jobSpentMicro(jobId);
  return withTrace({ jobId, projectId: r.project_id, step: "syna", costCapMicro: cap }, () => llmJson(call, StepSchema));
}

function newAttachmentSinceLastAssistant(h: SynaMessage[]) {
  for (let i = h.length - 1; i >= 0; i--) { if (h[i].role === "assistant") return false; if (h[i].role === "user" && h[i].content.attachments?.length) return true; }
  return false;
}

/** Fil lisible par le modèle : paroles exactes, réponses de SINA, résultats d'outils (tronqués), accords. */
export function serialize(h: SynaMessage[]): string {
  // Demande en cours : résultats complets ; demandes précédentes : résumés courts (moins de jetons relus à chaque étape).
  let lastUser = -1;
  h.forEach((m, i) => { if (m.role === "user") lastUser = i; });
  return h.map((m, i) => {
    const c = m.content, current = i > lastUser, dataMax = current ? 12000 : 300, argsMax = current ? 400 : 160;
    if (m.role === "user") return `[client #${m.seq}] ${c.text}${c.attachments?.length ? ` (pièces jointes : ${c.attachments.join(", ")})` : ""}`;
    if (m.role === "assistant") return `[SINA #${m.seq}] ${c.message}${c.actions?.length ? `\n  actions : ${c.actions.map((a: any) => `${a.tool} ${JSON.stringify(a.args)}`.slice(0, argsMax)).join(" | ")}` : ""}${c.question ? `\n  question : ${c.question.text}` : ""}`;
    if (m.role === "tool") return `[résultat ${c.tool} #${m.seq}] ${c.ok ? "OK" : "ÉCHEC"} — ${c.summary}${c.changes?.length ? `\n  changements vérifiés : ${c.changes.map((x: any) => `${x.module}/${x.object} : ${x.summary}${x.verified ? "" : " (non vérifié)"}`).join(" ; ")}` : ""}${c.data != null ? `\n  données : ${JSON.stringify(c.data).slice(0, dataMax)}` : ""}`;
    if (c.kind === "confirmation") return `[accord demandé #${m.seq}] ${c.pending?.tool} — ${c.pending?.reason}`;
    if (c.kind === "approved" || c.kind === "declined") return `[client : ${c.kind === "approved" ? "ACCORD" : "REFUS"} pour ${c.tool}]`;
    return `[événement ${c.kind}]`;
  }).join("\n");
}

function clip(v: unknown, max: number): unknown {
  if (v == null) return v;
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (s.length <= max) return v;
  return typeof v === "string" ? `${s.slice(0, max)}…` : { truncated: true, preview: s.slice(0, max) };
}

export function threadView(user: User, cid: string) {
  const c = conversationOf(cid);
  if (!c || c.user_id !== user.id) throw new HttpError(404, L("Conversation introuvable.", "Conversation not found."));
  const r = one<SynaRun>("SELECT * FROM syna_runs WHERE conversation_id=? ORDER BY created_at DESC LIMIT 1", cid) ?? null;
  return {
    conversationId: cid, projectId: c.project_id,
    messages: lastMessages(cid, 400),
    run: r ? { id: r.id, status: r.status, step: r.step, pending: pendingOf(r), error: r.error } : null,
    budget: budgetState(user.id, c.project_id, cid),
    attachments: attachmentsOf(cid).map((a) => ({ id: a.id, kind: a.kind, name: a.name, analysis: a.analysis })),
    tools: allTools().length,
    journey: (() => { const j = journeyOf(cid); return { current: currentStep(j), mode: j.mode, keep: j.keep, steps: JOURNEY_STEPS.map((s) => ({ n: s.n, fr: s.fr, en: s.en, status: j.steps[s.n]?.status ?? "todo", ready: READY_STEPS.includes(s.n) })) }; })(),
  };
}

