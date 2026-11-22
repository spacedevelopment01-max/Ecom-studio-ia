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
import { ficheDuFil, ficheOf, notesDuProjet } from "./fiche";
import { apresValidation, refusVerrou } from "./verrous";
import { marqueCoupee, marqueOuArretee } from "./tools/identity";
import { SINA_BRAND_JOB } from "./brand-chain";
import { dessinCoupe, ouArrete } from "./dessin/tools";
import { SINA_DESSIN_JOB } from "./dessin/job";
import { z } from "zod";
import { HttpError, type User } from "../auth";
import { one, all, json, run as sql, id as newId, tx } from "../db";
import { budgetPctTu } from "../ai/budget-pct";
import { balance } from "../billing";
import { activityGaps, COMPANY_FIELDS } from "./activity";
import { loadSiteCopy } from "./mockup-code/copy";
import { loadMockupSet } from "./mockup-code/mockup-set";
import { enqueue, getJob, type JobContext } from "../jobs";
import { llmJson, type LlmCall, type LlmImage } from "../ai/llm";
import { withTrace, CostCapReached } from "../ai/trace";
import { requirePlan } from "../plan-gates";
import { L } from "../i18n-server";
import { getJsonSetting } from "../settings";
import { allTools, getTool, isSensitive, toolCatalog, toolEntry, toolVisible, type ToolScope } from "./registry";
import { noterTravail, prixJuste } from "./travaux";
import { defautsDuMessage, noteDeControle } from "./controle-message";
import { conversationSettings, keyMoment, momentDeLEtape, REPLY_REVIEW_SYSTEM, ReplyReviewSchema, replyReviewPrompt, reviewNote, routedCatalog, routedStep, shouldReview, type KeyMoment } from "./conversation";
import { loadWordingRules, wordingPromptLine } from "../client-wording";
import type { AgentTool, ToolContext, ToolResult } from "./types";
import { planOfProject } from "../plan-gates";
import { routeCountFor } from "./brand-routes";
import { authorizedBudget, addMessage, createRun, debutDuFil, FIL_MAX, filDeConversation, messagesDepuis, messagesDuClientAvant, getRun, lastMessages, pendingOf, recordChanges, runByRequest, activeRun, updateRun, type PendingAction, type SynaRun, type SynaMessage } from "./store";
import { budgetState, jobSpentMicro, replyAllowanceMicro, trackJob, authorizeBudgetPct, DEFAULT_BUDGET_PCT } from "./budget";
import { attachmentsOf, attachmentImages, describeAttachment, journeyImages } from "./attachments";
import { projectSnapshot } from "./snapshot";
import { SYNA_SYSTEM } from "./prompt";
import { JOURNEY_STEPS, stepReady, currentStep, guideDeLEtape, journeyContext, journeyOf, PHASES, phaseOf, phaseStatus, updateJourney } from "./journey";
import { anglesViewOf } from "./angles";
import { sinaModels } from "./models";
import { carteActiviteAJour, ECRITURES_DE_L_ACTIVITE } from "./tools/activity";
import { LOGO_STYLE_LABEL, fontFace, groundPresentation, type Identity } from "./identities";
import { chosenRoute } from "./logos";
import { BOARD_OBJECT_LABEL, SIGN_KIND_LABEL, type Board, type BoardImage } from "./brand-board";
import { safeWordmark } from "./brand-routes";
import { drawWordmark, type DrawnWordmark } from "./brand-wordmark";
import { mixIdentity } from "./tools/identity";
import { createdPosts } from "./tools/posts";
import { assetUrl } from "../library";

export const MAX_STEPS = 12;
const MAX_ACTIONS = 8;

export const StepSchema = z.object({
  message: z.string().max(8000).default(""),
  actions: z.array(z.object({ tool: z.string().min(1).max(80), args: z.record(z.string(), z.unknown()).default({}), why: z.string().max(400).optional() })).max(MAX_ACTIONS).default([]),
  question: z.object({ text: z.string().min(1).max(4000), choices: z.array(z.string().max(200)).max(8).optional() }).nullable().optional(),
  done: z.boolean().default(false),
  /** Champ de la fiche de départ demandé par la question (étape 0), ou « confirm » pour le résumé. */
  askField: z.string().max(20).optional(),
});
export type StepOutput = z.infer<typeof StepSchema>;

/** Dépendances remplaçables par les tests (jamais par le client). */
export type AgentDeps = { reason?: (call: LlmCall) => Promise<StepOutput>; /** La relectrice des réponses (essais sans IA : seulement si le test la fournit). */ review?: (call: LlmCall) => Promise<unknown> };

/** Nombre exact d'identités du client (son forfait), dit par SINA au lieu de « deux à quatre ». */
function identityCountOf(pid: string | null): number | undefined {
  if (!pid) return undefined;
  try { return routeCountFor(planOfProject(pid)); } catch { return undefined; }
}
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
  // Vérification et création de la demande d'un seul tenant : deux onglets ne lancent jamais deux demandes à la fois.
  const created = tx(() => {
    const prior = runByRequest(cid, input.requestId);
    if (prior) return { run: prior, fresh: false };
    const current = activeRun(cid);
    // Une création tourne en arrière-plan (ses identités, sa marque…) : le client peut continuer à parler à SINA, qui
    // en profite pour avancer sur la suite ; le résultat de la création arrivera dans le fil dès qu'il sera prêt.
    const background = current?.status === "waiting_jobs";
    if (current && !background && current.status !== "waiting_confirmation") throw new HttpError(409, L("SINA travaille encore sur ta demande précédente. Attends sa réponse ou arrête-la.", "SINA is still working on your previous request. Wait or stop it."), "syna_busy");
    if (current && !background) { updateRun(current.id, { status: "cancelled", pending_json: null }); addMessage(cid, "event", { kind: "pending_dropped", runId: current.id }, current.id); }
    const attachments = (input.attachmentIds ?? []).filter((aid) => attachmentsOf(cid).some((a) => a.id === aid));
    const run = createRun({ conversationId: cid, userId: user.id, projectId: c.project_id, requestId: input.requestId });
    addMessage(cid, "user", { text: input.text, attachments }, run.id);
    return { run, fresh: true };
  });
  if (!created.fresh) return created.run;
  if (authorizedBudget(cid) == null) { try { authorizeBudgetPct(user.id, c.project_id, cid, DEFAULT_BUDGET_PCT); } catch { /* budget non mesurable : accord demandé */ } }
  schedule(created.run);
  return getRun(created.run.id)!;
}

/**
 * Reprise de l'exécution. Les créations natives attendues ne sont PAS des dépendances bloquantes : une création en
 * échec doit aussi réveiller SINA pour qu'elle l'explique et propose la suite. La tâche de reprise relit leur état.
 */
function schedule(r: SynaRun, waitFor: string[] = [], delayMs = 0) {
  if (getRun(r.id)?.status === "cancelled") return; // arrêtée par le client : rien ne la relance
  const job = enqueue({ userId: r.user_id, projectId: r.project_id, type: "syna.agent", label: L("SINA travaille", "SINA is working"), payload: { runId: r.id }, maxAttempts: 2, runAt: delayMs ? Date.now() + delayMs : undefined, idempotencyKey: `syna:${r.id}:${r.step}:${newId()}` });
  trackJob(r.conversation_id, r.id, job.id, "agent");
  updateRun(r.id, { job_id: job.id, status: waitFor.length ? "waiting_jobs" : "queued", waiting_jobs: JSON.stringify(waitFor) });
}

const ACTIVE_JOB = ["queued", "running", "paused"];
/** Une AUTRE demande du même fil est-elle en train de s'exécuter (réponse de SINA à un message envoyé pendant une création) ? */
const otherRunBusy = (r: SynaRun) => !!one("SELECT 1 FROM syna_runs WHERE conversation_id=? AND id<>? AND status IN ('queued','running')", r.conversation_id, r.id);
/** Une création lancée par une autre demande du fil tourne-t-elle encore en arrière-plan ? */
const backgroundCreation = (r: SynaRun) => !!one("SELECT 1 FROM syna_runs WHERE conversation_id=? AND id<>? AND status='waiting_jobs'", r.conversation_id, r.id);
/**
 * Accueil dessiné arrêté en route : SINA lit ICI où il s'est arrêté et comment le reprendre (essai réel du 20 novembre
 * 2026 : elle se fiait à une vieille notice, a d'abord dit la reprise impossible, puis « je ne sais pas où ça s'est
 * arrêté », alors que c'était noté).
 */
function repriseAccueil(projectId: string | null, results: { status?: string; type?: string }[]): string {
  if (!projectId) return "";
  // La marque arrêtée en route (21 novembre 2026, reprise d'Aplomb : 2,04 € payés, rien de gardé) : même façon de reprendre.
  const marque = results.some((x) => (x.status === "failed" || x.status === "cancelled") && x.type === SINA_BRAND_JOB) ? marqueCoupee(projectId) : null;
  const ligneMarque = marque ? ` Sa marque s'est arrêtée en route (${marqueOuArretee(marque.etapes)}) : pour la reprendre là, sans repayer ce qui est fait, ${marque.payload.finish ? "brand.finish" : "identity.propose"} avec relancer:true (une carte affiche le prix de ce qui reste). Ne dis jamais que la reprise est impossible.` : "";
  if (!results.some((x) => x.status === "failed" && x.type === SINA_DESSIN_JOB)) return ligneMarque;
  const c = dessinCoupe(projectId);
  return (c ? ` Son accueil s'est arrêté en route (${ouArrete(c.etapes)}) : pour le reprendre là, sans repayer ce qui est fait, site.dessiner avec relancer:true (une carte affiche le prix de ce qui reste). Ne dis jamais que la reprise est impossible ni que tu ne sais pas où il s'est arrêté.` : "") + ligneMarque;
}

const BACKGROUND_NOTE = "# Une création est en cours en arrière-plan\nTu as lancé une création pour lui : elle tourne en arrière-plan, et tu lui montreras le résultat dès qu'il sera prêt. Tu n'as rien à relancer : n'appelle AUCUN outil de création, et ne présente jamais un résultat que tu n'as pas encore. Il peut te parler pendant ce temps : réponds d'abord à ce qu'il dit. Puis profite de l'attente pour avancer sur la suite, UNE question à la fois, seulement sur ce qu'il n'a pas déjà dit et que lui seul sait : ce que ses angles, son activité et son site demanderont (ses produits ou ses prestations avec leurs prix, ses coordonnées, sa livraison ou sa zone, ses retours, ses horaires, ses preuves, ses réseaux). Note chaque réponse avec start.note, avec ses mots. S'il n'a pas envie de répondre maintenant, n'insiste pas : dis-lui simplement que tu le préviens dès que c'est prêt.\n\n";
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
  // Budget des réponses de SINA atteint : il se relève avec le réglage du budget, pas par un accord sur une action.
  if (input.approve && !getTool(p.tool)) throw new HttpError(409, L("Augmente le budget autorisé, puis demande à SINA de continuer.", "Raise the authorised budget, then ask SINA to continue."));
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
  // « Arrêter » arrête vraiment : la reprise de SINA et les créations attendues qui n'ont pas encore commencé (aucune
  // dépense) sont annulées ; une création déjà en cours se termine (son coût est engagé) et le fil le dit.
  const waited = json<string[]>(r.waiting_jobs, []);
  for (const j of [r.job_id, ...waited].filter(Boolean) as string[]) sql("UPDATE jobs SET status='cancelled', updated_at=? WHERE id=? AND status IN ('queued','blocked')", Date.now(), j);
  const running = waited.filter((j) => getJob(j)?.status === "running").length;
  addMessage(cid, "event", { kind: "stopped", ...(running ? { running } : {}) }, r.id);
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
    // Une demande qui attend une création reste « en attente » pendant qu'elle la surveille (le client peut parler).
    updateRun(r.id, { status: json<string[]>(r.waiting_jobs, []).length ? "waiting_jobs" : "running", error: null });
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
    // La création est finie, mais SINA répond en ce moment à un message du client : elle présente le résultat juste après.
    if (waited.length && otherRunBusy(r)) { schedule(r, waited, 4000); return { runId, waiting: waited }; }
    if (waited.length) updateRun(r.id, { status: "running" });
    if (waited.length) {
      // Coût RÉEL de chaque tâche (appels enregistrés), même en échec : SINA ne dit jamais « rien n'a été débité » sans ce
      // chiffre (essais réels du 7 novembre : deux recherches échouées avaient coûté 0,29 € et 0,95 €).
      // Le compte rendu entier de la création du site, donné une seule fois, ici (le contexte n'en garde que ce qui reste).
      const compteRendu = waited.some((jid) => getJob(jid)?.type === "syna.site" && getJob(jid)?.status === "done") ? journeyOf(r.conversation_id).site?.report ?? null : null;
      const results = waited.map((jid) => { const j = getJob(jid); const spent = one<{ c: number | null }>("SELECT SUM(cost) c FROM ai_calls WHERE job_id=?", jid)?.c ?? 0; return { job: jid, type: j?.type, status: j?.status, message: j?.message, result: clip(j?.result ? json(j.result, j.result) : null, 1500), error: j?.error ? clip(j.error, 400) : undefined, coutReel: j?.user_id ? budgetPctTu(j.user_id, spent, j.project_id) : null, coutReelMicro: spent }; });
      const failedSpent = results.filter((x) => x.status !== "done" && x.coutReelMicro > 0);
      addMessage(r.conversation_id, "tool", { key: `jobs:${r.step}`, tool: "jobs.wait", ok: results.every((x) => x.status === "done"), summary: failedSpent.length ? L(`Tâche terminée, avec un échec. Coût réellement dépensé par la tâche en échec : ${failedSpent.map((x) => x.coutReel).join(", ")}.`, "Finished with a failure.") : L("Tâche terminée : je relis le résultat.", "Task finished: reading the result."), ...(failedSpent.length ? { hint: `Dis au client ce coût réel ; ne dis jamais que rien n'a été débité.${results.some((x) => x.status === "failed" && x.type === "syna.site") ? " Pour relancer la création de son site là où elle s'est arrêtée, sans repayer ce qui était fait : site.create avec relancer:true (une carte affiche le prix de ce qui reste)." : ""}${repriseAccueil(r.project_id, results)}` } : {}), data: compteRendu ? { taches: results, compteRenduDuSite: compteRendu } : results }, r.id);
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
    // Le client a cliqué sur une partie de son site : le Studio lit lui-même la section (gratuit) avant la première
    // réflexion, comme si SINA l'avait demandée (audit de la conversation, 22 novembre 2026 : une réflexion de moins).
    if (r.step === 0) await prelireLaSection(r, tctx);

    // 3. Étapes du modèle.
    for (;;) {
      r = getRun(runId)!;
      if (r.status === "cancelled") return { runId, cancelled: true };
      if (r.step >= MAX_STEPS) {
        addMessage(r.conversation_id, "assistant", { message: L(`J'ai enchaîné ${MAX_STEPS} étapes pour cette demande. Dis-moi si je continue.`, `I chained ${MAX_STEPS} steps for this request. Tell me if I should continue.`), actions: [], done: true }, r.id);
        updateRun(r.id, { status: "done" });
        return { runId, steps: r.step };
      }
      const step = r.step;
      updateRun(r.id, { step: step + 1 });
      let out: StepOutput;
      try {
        out = await reason(user, r, jobId, step, deps);
      } catch (e) {
        if (e instanceof CostCapReached) return askBudget(r);
        throw e;
      }
      // Le nettoyage gratuit d'abord (une question répétée à la fin, une élision) : il ne fait jamais payer de réécriture.
      out = withoutRepeatedQuestion({ ...out, message: fixElision(out.message), ...(out.question ? { question: { ...out.question, text: fixElision(out.question.text) } } : {}) });
      // Contrôle gratuit des règles du propriétaire (une question à la fois pendant « faire connaissance », jamais
      // « C'est parti » avant l'accord sur la carte) : réécrit une fois avec la remarque (essais complets, Nadia).
      {
        const lance = all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND run_id=? AND role='tool'", r.conversation_id, r.id).some((m) => (json<any>(m.content_json, {}).jobs ?? []).length > 0);
        const motsCorriges = r.project_id ? (() => { try { return loadWordingRules(r.project_id!); } catch { return []; } })() : [];
        const regle = { etape: currentStep(journeyOf(r.conversation_id)), payant: (tool: string) => !!getTool(tool)?.estimate, lance, motsCorriges };
        const defauts = defautsDuMessage(out, regle);
        if (defauts.length) {
          try { out = await reason(user, r, jobId, step, deps, noteDeControle(defauts), ":controle"); } catch (e) { if (e instanceof CostCapReached) return askBudget(r); throw e; }
        }
      }
      // Moment qui compte (résultat à présenter, échec, client mécontent) : la réponse est relue avant de partir, après le
      // contrôle gratuit (la relectrice lit la version corrigée), et réécrite une fois si elle la refuse.
      let relu: "ok" | "repris" | null = null;
      ({ out, relu } = await reviewedReply(user, r, jobId, step, deps, out));
      if (out.question?.choices?.length && currentStep(journeyOf(r.conversation_id)) === 5) out = { ...out, question: withoutLaterForRequired(out.question) };
      // Un bouton est une réponse complète, cliquable telle quelle : jamais un gabarit à trous (essai réel du 7 novembre :
      // « Oui, sous [À compléter : délai] et à [À compléter : conditions] »).
      if (out.question?.choices?.length) out = { ...out, question: { ...out.question, choices: out.question.choices.filter((c) => !/\[[^\]]*\]|…\s*$|\.\.\.\s*$/.test(c)) } };
      // Étape 6 : les thèmes sont montrés tels qu'ils sont ; jamais « ton site déjà composé dans chacun » (essai réel).
      // « Je ne peux pas voir… » n'est retiré QUE si des images lui étaient jointes (sinon c'est honnête).
      if (currentStep(journeyOf(r.conversation_id)) === 6) out = { ...out, message: sawImages.get(r.id) ? withoutBlindClaim(withoutComposedClaim(out.message)) : withoutComposedClaim(out.message) };
      out = withoutRepeatedQuestion({ ...out, message: fixElision(out.message), ...(out.question ? { question: { ...out.question, text: fixElision(out.question.text) } } : {}) });
      addMessage(r.conversation_id, "assistant", { ...out, step, ...(relu ? { relu } : {}) }, r.id);
      if (!out.actions.length) {
        updateRun(r.id, { status: out.question ? "waiting_user" : "done" });
        return { runId, steps: step + 1 };
      }
      const launched: string[] = [];
      let stepFailed = false;
      for (const [i, a] of out.actions.entries()) {
        // Arrêtée pendant la réflexion de SINA : aucune action ne part après « Arrêter ».
        if (getRun(runId)?.status === "cancelled") return { runId, cancelled: true };
        const key = `${step}:${i}`;
        const t = toolVisible(a.tool, toolScope(r)) ? getTool(a.tool) : undefined;
        if (!t) { addMessage(r.conversation_id, "tool", { key, tool: a.tool, ok: false, internal: true, summary: L("Outil inconnu : choisis un outil du catalogue.", "Unknown tool: choose a tool from the catalogue.") }, r.id); continue; }
        const parsed = t.args.safeParse(a.args);
        if (!parsed.success) { addMessage(r.conversation_id, "tool", { key, tool: a.tool, ok: false, internal: true, summary: L("Arguments invalides : ", "Invalid arguments: ") + parsed.error.issues.slice(0, 4).map((x) => `${x.path.join(".")}: ${x.message}`).join(" ; ") + (toolScope(r).routed ? `\nNotice de l'outil :\n${toolEntry(t)}` : "") }, r.id); continue; }
        if (t.needsProject && !r.project_id) { addMessage(r.conversation_id, "tool", { key, tool: a.tool, ok: false, internal: true, summary: L("Aucun projet n'est encore rattaché : il sera créé dès que l'activité et l'offre sont connues.", "No project yet: it is created once the business and offer are known.") }, r.id); continue; }
        // Partie validée par le client : refusée AVANT le devis et la carte d'accord (aucune carte de dépense pour la refaire).
        const lock = refusVerrou(r.conversation_id, t.name);
        if (lock) { addMessage(r.conversation_id, "tool", { key, tool: a.tool, args: parsed.data, ...lock }, r.id); stepFailed = true; continue; }
        // Accord explicite : actions sensibles, et dépenses au-delà du budget autorisé.
        if (isSensitive(t, parsed.data, tctx)) return askConfirmation(r, t, parsed.data, tctx, "sensitive");
        if (t.estimate) {
          // Un refus du moteur natif pendant le devis (étape préalable, droits, tarif) est un résultat d'outil : SINA
          // le lit et s'adapte (question au client, autre outil), l'exécution ne s'arrête pas.
          let est: Awaited<ReturnType<NonNullable<AgentTool["estimate"]>>>;
          // Carte juste : le prix probable sur les coûts réellement mesurés des derniers travaux du même genre ; le plafond ne change pas.
          try { est = prixJuste(t.name, await t.estimate(tctx, parsed.data)); }
          catch (e) { addMessage(r.conversation_id, "tool", { key, tool: a.tool, args: parsed.data, ok: false, ...((e as { internal?: boolean } | null)?.internal === true ? { internal: true } : {}), summary: L("Refus avant exécution : ", "Refused before running: ") + String(clip(e instanceof Error ? e.message : String(e), (e as { internal?: boolean } | null)?.internal === true ? 1600 : 600)) }, r.id); continue; }
          // Règle du propriétaire : le prix d'abord, puis l'accord écrit du client, pour TOUTE dépense (audit du 10 novembre
          // 2026 : sous un budget autorisé d'office, les créations partaient sans carte). Une action gratuite (devis à 0, ex.
          // lire des angles prêts) ne demande jamais d'accord.
          // Le budget d'IA du mois doit couvrir le plafond AVANT la carte (essai réel du 18 novembre 2026 : une création de
          // site confirmée avec un budget presque épuisé s'est arrêtée en route, 4,48 € dépensés pour rien). Rien n'est
          // lancé ni payé ; SINA le dit au client, qui peut recharger l'IA de son projet.
          if (est.maxMicro > 0) {
            const manque = budgetInsuffisant(r.user_id, r.project_id, est.maxMicro);
            if (manque) { addMessage(r.conversation_id, "tool", { key, tool: a.tool, args: parsed.data, ok: false, summary: manque }, r.id); stepFailed = true; continue; }
            return askConfirmation(r, t, parsed.data, tctx, "cost", est.maxMicro, est);
          }
        }
        const res = await execute(t, parsed.data, tctx, key, r);
        if (!res.ok) stepFailed = true;
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
      // Une question est déjà posée et ses actions ont réussi : SINA attend la réponse du client, au lieu de repartir
      // pour un second tour et de reposer la même question.
      if (out.question && !stepFailed) { updateRun(r.id, { status: "waiting_user" }); return { runId, steps: step + 1 }; }
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
/**
 * Les pièces jointes, dans la partie qui change à chaque pas (audit du 22 novembre 2026) : celles du dernier message du
 * client décrites en entier, les plus anciennes en une ligne (leur identifiant et leur nom), au lieu de tout redécrire.
 */
export function piecesJointes(cid: string, history: SynaMessage[]): string {
  const toutes = attachmentsOf(cid);
  if (!toutes.length) return "aucune";
  const derniere = [...history].reverse().find((m) => m.role === "user");
  const neuves = new Set<string>((derniere?.content?.attachments ?? []).map(String));
  return toutes.map((a) => (neuves.has(a.id) ? describeAttachment(a) : `- ${a.id} : « ${a.name} »${a.assetId ? ` (asset ${a.assetId})` : ""}`)).join("\n");
}

/** Une image du parcours qui change souvent (gardée hors de la partie en mémoire). */
export const imageQuiChange = (label?: string) => /^(Thème sur mesure|Galerie produit|Maquette|Site codé|Accueil dessiné)/.test(label ?? "");

/** La section désignée par le client dans son message (« [Élément désigné · section s1234abcd … »), sinon null. */
export function sectionDesignee(text: string): string | null {
  return /^\[Élément désigné · section (s[0-9a-f]{8})\b/.exec(text.trim())?.[1] ?? null;
}

async function prelireLaSection(r: SynaRun, ctx: ToolContext): Promise<void> {
  if (!r.project_id) return;
  const dernier = lastMessages(r.conversation_id, 6).filter((m) => m.role === "user").at(-1);
  const uid = dernier ? sectionDesignee(String(dernier.content?.text ?? "")) : null;
  const t = uid ? getTool("custom.section") : null;
  if (!uid || !t) return;
  try { await execute(t, { uid }, ctx, `prelecture:${uid}`, r); } catch { /* SINA la lira elle-même */ }
}

async function execute(t: AgentTool, args: unknown, ctx: ToolContext, key: string, r: SynaRun): Promise<ToolResult> {
  const prior = all<{ content_json: string }>("SELECT content_json FROM syna_messages WHERE conversation_id=? AND run_id=? AND role='tool'", r.conversation_id, r.id)
    .map((m) => json<any>(m.content_json, {})).find((m) => m.key === key && m.tool === t.name);
  if (prior) return prior.result ?? { ok: prior.ok, summary: prior.summary, hint: prior.hint, data: prior.data, jobs: prior.jobs };
  if (t.needsProject && ctx.projectId) requirePlan(ctx.user, ctx.projectId);
  let res: ToolResult;
  // Une partie validée par le client est verrouillée : l'outil qui la referait est refusé avant de s'exécuter (le socle).
  const locked = refusVerrou(r.conversation_id, t.name);
  if (locked) res = locked;
  else try {
    res = await t.run(ctx, args);
  } catch (e) {
    const msg = e instanceof HttpError || e instanceof Error ? e.message : String(e);
    res = { ok: false, summary: L("Échec de l'outil : ", "Tool failed: ") + clip(msg, 600) };
  }
  // Après une validation réussie et confirmée par le parcours relu, le Studio pose le verrou lui-même.
  if (!locked) { try { apresValidation(r.conversation_id, t.name, res); } catch { /* registre illisible : rien n'est verrouillé */ } }
  if (res.changes?.length) recordChanges(r.conversation_id, r.id, t.name, res.changes);
  // Étape 5 : un enregistrement réussi remet la carte « Ton activité » à jour et dit ce qui manque encore (gratuit).
  if (res.ok && r.project_id && ECRITURES_DE_L_ACTIVITE.has(t.name)) { try { const carte = carteActiviteAJour(r.project_id, r.conversation_id); if (carte) res = { ...res, hint: [res.hint, carte].filter(Boolean).join(" ") }; } catch { /* la carte se refait avec activity.plan */ } }
  // Un travail payant lancé : noté avec son plafond (prix probable mesuré, coût par travail accepté).
  if (t.estimate && res.ok && res.jobs?.length) { try { noterTravail(t.name, res.jobs, { userId: r.user_id, projectId: r.project_id, conversationId: r.conversation_id }); } catch { /* le carnet ne bloque jamais un travail */ } }
  addMessage(r.conversation_id, "tool", { key, tool: t.name, args, ok: res.ok, summary: res.summary, ...(res.hint ? { hint: res.hint } : {}), ...(res.internal ? { internal: true } : {}), data: clip(res.data, t.name === "custom.section" ? 32000 : 6000), changes: res.changes, jobs: res.jobs, ambiguous: res.ambiguous }, r.id);
  return res;
}

/**
 * Texte de la carte d'accord (essai réel du 9 novembre 2026 : elle montrait « custom.build {…} » au client). Une action
 * se présente toujours en clair : ce qui sera fait, puis pour une dépense le coût probable et le plafond, en % du budget
 * IA du mois (jamais en euros, jamais le nom technique de l'outil).
 */
export async function confirmationText(t: AgentTool, args: unknown, ctx: ToolContext, userId: string, projectId: string | null, est?: { label: string; probableMicro?: number; maxMicro: number }): Promise<string> {
  const pct = (m: number) => budgetPctTu(userId, m, projectId);
  const price = est && est.maxMicro > 0 ? (est.probableMicro ? L(`Coût probable : ${pct(est.probableMicro)} ; au plus ${pct(est.maxMicro)}.`, `Likely cost: ${pct(est.probableMicro)}; at most ${pct(est.maxMicro)}.`) : L(`Au plus ${pct(est.maxMicro)}.`, `At most ${pct(est.maxMicro)}.`)) : "";
  const what = t.preview ? await t.preview(ctx, args) : est?.label ? est.label.charAt(0).toUpperCase() + est.label.slice(1) + "." : t.description.split(/(?<=[.:])\s/)[0];
  return [what, price].filter(Boolean).join("\n");
}

/**
 * Le budget d'IA restant du client ne couvre pas le plafond d'un travail payant : la phrase que SINA lit (en pourcentages,
 * jamais en euros), ou null s'il le couvre. Sans IA.
 */
export function budgetInsuffisant(userId: string, projectId: string | null, maxMicro: number): string | null {
  let b: ReturnType<typeof balance>;
  try { b = balance(userId, projectId); } catch { return null; }
  if (b.available >= maxMicro) return null;
  const pct = (m: number) => budgetPctTu(userId, m, projectId);
  const fin = new Date(b.periodEnd).toLocaleDateString(L("fr-FR", "en-GB"), { day: "numeric", month: "long" });
  return L(`Pas lancé, rien n'est payé : ce travail peut coûter jusqu'à ${pct(maxMicro)}, et il ne reste que ${pct(b.available)} pour ce mois. Dis-le simplement au client : il peut recharger l'IA de son projet (Mon compte), puis te redemander ; sinon, son budget repart le ${fin}.`,
    `Not started, nothing paid: this may cost up to ${pct(maxMicro)} and only ${pct(b.available)} is left this month. Tell the client: they can top up the project's AI (My account), or wait until ${fin}.`);
}

async function askConfirmation(r: SynaRun, t: AgentTool, args: unknown, ctx: ToolContext, reason: "sensitive" | "cost", costMaxMicro?: number, est?: { label: string; probableMicro?: number; maxMicro: number }) {
  const preview = await confirmationText(t, args, ctx, r.user_id, r.project_id, est);
  const p: PendingAction = { id: newId(), tool: t.name, args, reason, preview, costMaxMicro, createdAt: Date.now() };
  updateRun(r.id, { status: "waiting_confirmation", pending_json: JSON.stringify(p) });
  addMessage(r.conversation_id, "event", { kind: "confirmation", pending: p, budget: budgetState(r.user_id, r.project_id, r.conversation_id) }, r.id);
  return { runId: r.id, waiting: "confirmation" };
}

/**
 * Budget des réponses atteint juste après une création que le client a payée : SINA ne reste jamais muette sur un travail
 * payé. Sans IA (rien n'est dépensé), elle dit ce qui est fait, où le voir, et ce qui l'empêche d'en dire plus. Une seule
 * fois par demande.
 */
function reportWithoutAi(r: SynaRun) {
  const msgs = all<{ role: string; content_json: string }>("SELECT role, content_json FROM syna_messages WHERE conversation_id=? AND run_id=? ORDER BY seq", r.conversation_id, r.id).map((m) => ({ role: m.role, c: json<any>(m.content_json, {}) }));
  if (msgs.some((m) => m.role === "assistant" && m.c.sansIa)) return;
  const waits = msgs.filter((m) => m.role === "tool" && m.c.tool === "jobs.wait");
  const last = waits[waits.length - 1];
  // Rien de créé dans cette demande, ou SINA a déjà parlé depuis : rien à ajouter.
  if (!last || msgs.slice(msgs.indexOf(last) + 1).some((m) => m.role === "assistant")) return;
  const results = (Array.isArray(last.c.data) ? last.c.data : Array.isArray(last.c.data?.taches) ? last.c.data.taches : []) as { type?: string; status?: string; coutReel?: string | null }[];
  const done = results.length > 0 && results.every((x) => x.status === "done");
  const site = results.some((x) => x.type === "syna.site") ? (() => { try { return journeyOf(r.conversation_id).site?.report ?? null; } catch { return null; } })() : null;
  const what = site
    ? L(`Ton site est créé : ${site.pages.length} page(s), à regarder dans l'onglet Boutique, sur ordinateur et sur téléphone.${site.aCompleter.length ? ` Il y reste ${site.aCompleter.length} information(s) « À compléter », que je te demanderai.` : ""}`, "Your site is created: see the Boutique tab.")
    : done ? L("Ce que tu m'as demandé de créer est terminé et enregistré dans ton projet.", "What you asked me to create is finished and saved in your project.")
    : L(`La création s'est arrêtée avant la fin.${results.some((x) => x.coutReel) ? ` Ce qu'elle a réellement dépensé : ${results.map((x) => x.coutReel).filter(Boolean).join(", ")}.` : ""}`, "The creation stopped before the end.");
  addMessage(r.conversation_id, "assistant", { message: L(`${what} Le budget de mes réponses est atteint : je ne peux pas encore te présenter ce travail ni te dire ce que j'y reprendrais. Relève-le juste en dessous, et je te fais le compte rendu tout de suite.`, `${what} My reply budget is used up: raise it below and I will report on this work right away.`), actions: [], done: false, sansIa: true }, r.id);
}

function askBudget(r: SynaRun) {
  try { reportWithoutAi(r); } catch { /* le compte rendu sans IA ne bloque jamais la carte du budget */ }
  const p: PendingAction = { id: newId(), tool: "budget.raise", args: {}, reason: "budget", preview: L("Le budget autorisé pour SINA est atteint. Augmente-le pour qu'elle continue.", "SINA's authorised budget is used up. Raise it to continue."), createdAt: Date.now() };
  updateRun(r.id, { status: "waiting_confirmation", pending_json: JSON.stringify(p), step: Math.max(0, r.step - 1) });
  addMessage(r.conversation_id, "event", { kind: "confirmation", pending: p, budget: budgetState(r.user_id, r.project_id, r.conversation_id) }, r.id);
  return { runId: r.id, waiting: "budget" };
}

/**
 * La question va dans « question », jamais aussi à la fin de « message » (essai réel : le modèle la répétait, le client
 * la lisait deux fois). Une dernière phrase interrogative du message est retirée quand une question est posée.
 */
/** Part des mots (4 lettres et plus) d'une phrase qu'on retrouve dans l'autre. */
function overlap(a: string, b: string): number {
  const w = (t: string) => new Set(t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-z]{4,}/g) ?? []);
  const A = w(a), B = w(b);
  return A.size ? [...A].filter((x) => B.has(x)).length / A.size : 0;
}

/**
 * Étape 5 : jamais « Plus tard » sur une coordonnée OBLIGATOIRE du site (essai réel du 7 novembre : proposé pour la
 * livraison). La question est reconnue à ses mots (celle de COMPANY_FIELDS) ; téléphone et SIRET gardent le bouton.
 */
export function withoutLaterForRequired<Q extends { text: string; choices?: string[] }>(q: Q): Q {
  const field = COMPANY_FIELDS.map((f) => ({ f, o: overlap(q.text, f.question) })).sort((a, b) => b.o - a.o)[0];
  if (!field || field.o < 0.5 || !field.f.required) return q;
  const choices = (q.choices ?? []).filter((c) => !/^\s*(plus tard|later)\b/i.test(c));
  return { ...q, choices };
}

/**
 * Étape 6 (consigne du propriétaire) : les cartes montrent les démonstrations d'origine des thèmes, pas le site du
 * client. Une incise qui prétend le contraire (« avec ton site déjà composé dans chacun ») est retirée du message.
 */
export function withoutComposedClaim(message: string): string {
  return message
    .replace(/,?\s*(?:avec|et)\s+ton site\s+(?:déjà\s+)?(?:composé|intégré|mis en page|décliné)\s+dans\s+(?:chacun|chaque thème|chacun d'eux|ces thèmes)/gi, "")
    .replace(/\s+([.,;!?])/g, "$1").replace(/ {2,}/g, " ").trim();
}

/**
 * Étape 6 : les maquettes créées sont JOINTES à SINA. Essais réels du 8 novembre : « Je ne peux pas vérifier le rendu
 * ici : ouvre-le dans Fichiers », répété d'un message à l'autre alors que l'image lui était jointe. La phrase est
 * retirée (elle est fausse) ; la consigne lui demande de décrire ce qu'elle voit.
 */
export function withoutBlindClaim(message: string): string {
  const blind = /\bje ne (?:peux|pourrai|suis) pas (?:en mesure de )?(?:l[ea]s? |l'|les )?(?:voir|vérifier|confirmer|contrôler|décrire|regarder)\b[^.!?\n]*(?:rendu|image|maquette|à l'œil|visuel|changements|modifications|retouche|résultat)/i;
  const blind2 = /\bje ne (?:vois|lis|regarde) pas\b[^.!?\n]*(?:rendu|image|maquette|visuel)/i;
  return message.split(/(?<=[.!?])\s+/).filter((sentence) => !blind.test(sentence) && !blind2.test(sentence)).join(" ").replace(/ {2,}/g, " ").trim() || message;
}

export function withoutRepeatedQuestion(out: StepOutput): StepOutput {
  if (!out.question || !out.message) return out;
  // Le message s'arrête avant sa première phrase interrogative (et ce qui la suit), s'il reste quelque chose avant.
  let msg = out.message.trim();
  // Une dernière phrase qui ANNONCE la question (« Présente-moi ton produit en quelques phrases : ») la répète : retirée
  // quand elle reprend les mots de la question (essai réel du 7 novembre).
  // Phrases ET leurs séparateurs : les retours à la ligne (listes) sont gardés tels quels (essai réel du 7 novembre :
  // la liste des 6 produits recollée en une seule ligne).
  const sentencesOf = (t: string) => t.split(/((?<=[.!…])\s+)/);
  const withoutLast = (parts: string[]) => parts.slice(0, -2).join("").trim();
  const sentences = sentencesOf(msg);
  const last = sentences[sentences.length - 1] ?? "";
  // Une phrase finale en « : » juste avant la question l'annonce toujours (« Avant d'aller plus loin, as-tu déjà
  // quelque chose : ») : elle est retirée, la question suit.
  if (sentences.length > 1 && /[:：]\s*$/.test(last)) msg = withoutLast(sentences);
  // Phrases finales qui PARAPHRASENT la question (essai réel : les coordonnées demandées deux fois) : retirées tant que
  // la moitié de leurs mots se retrouvent dans la question ; la première phrase du message reste toujours.
  {
    let parts = sentencesOf(msg);
    while (parts.length > 1 && overlap(parts[parts.length - 1], out.question.text) >= 0.5) parts = sentencesOf(withoutLast(parts));
    // Une phrase d'annonce restée seule à la fin (« Une correction à faire : ») : retirée aussi (essai réel du 8 novembre).
    while (parts.length > 1 && /[:：]\s*$/.test(parts[parts.length - 1]) && parts.join("").trim() !== out.message.trim()) parts = sentencesOf(withoutLast(parts));
    msg = parts.join("").trim();
  }
  if (msg !== out.message.trim() && !msg.includes("?")) return { ...out, message: msg };
  const q = msg.indexOf("?");
  if (q < 0) return out;
  const before = msg.slice(0, q);
  const cut = Math.max(before.lastIndexOf(". "), before.lastIndexOf("! "), before.lastIndexOf("… "), before.lastIndexOf(": "), before.lastIndexOf("\n"));
  const kept = cut >= 0 ? msg.slice(0, cut + 1).trim() : "";
  return kept ? { ...out, message: kept } : out;
}

/** Outils proposés à ce fil : parcours de création en cours, anciennes maquettes du projet (voir toolVisible). */
function toolScope(r: SynaRun): ToolScope {
  const j = journeyOf(r.conversation_id);
  const legacy = r.project_id ? (() => { try { return !!loadMockupSet(r.project_id!); } catch { return false; } })() : false;
  // Conversation aiguillée : seulement pendant le parcours, à une étape qui a sa liste d'outils (voir conversation.ts).
  return { inJourney: !j.outside, legacyMockups: legacy, routed: !j.outside && conversationSettings().aiguillage && routedStep(currentStep(j)) };
}

/**
 * Modèle des réponses de SINA : le plus fort, à toutes les étapes et pour tous les forfaits (décision du propriétaire :
 * elle décide, conseille et juge, donc elle réfléchit avec le meilleur). Elle réfléchit plus longtemps quand elle
 * présente un résultat, explique un échec, répond à un client mécontent, ou juge un site qu'elle vient de monter.
 * Le modèle lui-même se règle à un seul endroit (models.ts).
 */
export function modelFor(_currentStepNumber: number, opts: { customTheme?: boolean; judge?: boolean; keyMoment?: KeyMoment | null } = {}): { provider: "anthropic"; model: string; effort?: string } {
  // Niveau ordinaire : celui du réglage (« moyen » par défaut) ; « élevé » aux moments forts et pour juger.
  const strong = sinaModels().strong;
  return { provider: strong.provider, model: strong.model, effort: opts.keyMoment || opts.judge ? "high" : strong.effort };
}

/** Action payante de chaque étape du parcours : son devis est donné à SINA (le même s'affiche sur la carte d'accord). */
const STEP_PAID_TOOL: Record<number, string> = { 1: "identity.propose", 4: "angles.propose" };

/**
 * Coût maximal de la prochaine action payante de l'étape en cours, en % du budget IA du client (règle du propriétaire :
 * toujours donner le prix avant une génération payante ; essai réel : les identités étaient proposées sans prix).
 */
export async function stepQuote(user: User, r: SynaRun): Promise<string> {
  const name = STEP_PAID_TOOL[currentStep(journeyOf(r.conversation_id))];
  const t = name ? getTool(name) : null;
  if (!t?.estimate || !r.project_id) return "";
  try {
    const est = prixJuste(name!, await t.estimate(toolContext(user, r), {} as never));
    if (!est.maxMicro) return "";
    // Coût probable annoncé quand l'outil le donne (étape 7 : le plafond au pire n'a pas de sens pour le client).
    if (est.probableMicro) return `\n\n# Prix de la prochaine action payante de l'étape\n${name} (${est.label}) : coût probable ${budgetPctTu(user.id, est.probableMicro, r.project_id)} ; plafond ${budgetPctTu(user.id, est.maxMicro, r.project_id)} (la tâche s'arrête et le dit si elle l'atteint). Le Studio montre ce prix au client sur la carte d'accord quand tu appelles l'outil ; tu peux le citer tel quel, sans jamais en inventer un autre.`;
    return `\n\n# Prix de la prochaine action payante de l'étape\n${name} (${est.label}) : au plus ${budgetPctTu(user.id, est.maxMicro, r.project_id)}. Le Studio montre ce prix au client sur la carte d'accord quand tu appelles l'outil ; tu peux le citer tel quel, sans jamais en inventer un autre.`;
  } catch { return ""; }
}

/**
 * Le moment de cette réflexion. Pendant « faire connaissance », rien n'a encore été créé : « je n'aime pas… » y parle
 * des goûts du client, pas d'un reproche (essai réel du lot 1 : une réponse sur ses goûts était relue comme une plainte).
 */
function momentOf(history: SynaMessage[], step: number): KeyMoment | null {
  const m = keyMoment(history);
  return m === "mecontent" && step === 0 ? null : m;
}

/** Outils dont le résultat se juge (thème conçu, monté, retouché, galerie, tâche finie) : effort élevé à l'étape 6. */
const JUDGE_TOOLS = /^(custom\.(concepts|concept|design|build|compose|edit|structure|photo|show|section)|gallery\.create|theme\.(brand|choose)|jobs\.wait)$/;
/** La réflexion en cours doit-elle concevoir ou juger (effort élevé), ou seulement poser une question / confirmer ? */
export function needsJudgement(history: { role: string; content?: any }[]): boolean {
  const last = history[history.length - 1];
  if (last?.role === "tool") return JUDGE_TOOLS.test(String(last.content?.tool ?? ""));
  const user = [...history].reverse().find((m) => m.role === "user");
  return /\[Élément désigné/.test(String(user?.content?.text ?? ""));
}

/** Demandes dont la dernière réflexion avait des images du parcours jointes (logos, planche, thème…). */
const sawImages = new Map<string, boolean>();

/** Un pas de raisonnement : fil complet + état du projet + pièces jointes (vision) → JSON d'actions. */
async function reason(user: User, r: SynaRun, jobId: string, step: number, deps: AgentDeps, note = "", cle = note ? ":reprise" : ""): Promise<StepOutput> {
  const history = filDeConversation(r.conversation_id, debutDuFilDeLEtape(r.conversation_id));
  const scope = toolScope(r), conv = conversationSettings();
  // Variété des réponses : les débuts de tes derniers messages, à ne pas reprendre.
  const openings = history.filter((m) => m.role === "assistant" && m.content?.message).slice(-4).map((m) => String(m.content.message).split(/\s+/).slice(0, 5).join(" "));
  // Les photos jointes par le client arrivent avec sa demande ; les images de ce qu'elle a déjà créé (logos, planche,
  // site) restent les mêmes d'un pas à l'autre : elles sont gardées en mémoire chez le fournisseur (22 novembre 2026).
  // Les images qui changent à chaque retouche ou disparaissent au bout de quelques minutes (captures du site, photos et
  // galerie récentes, maquettes, accueil dessiné) partent après le fil : en mémoire, chacune ferait réécrire tout le fil.
  const jointes: LlmImage[] = (step === 0 || newAttachmentSinceLastAssistant(history) ? attachmentImages(r.conversation_id, history) : []).slice(0, 12);
  const parcours: LlmImage[] = (await journeyImages(journeyOf(r.conversation_id), r.project_id).catch(() => [])).slice(0, 12 - jointes.length);
  const duParcours = parcours.filter((im) => !imageQuiChange(im.label));
  const images = [...jointes, ...parcours.filter((im) => imageQuiChange(im.label))];
  const guide = guideDeLEtape(journeyOf(r.conversation_id));
  const b = budgetState(user.id, r.project_id, r.conversation_id);
  const snapshot = r.project_id ? await projectSnapshot(toolContext(user, r)) : L("Aucun projet rattaché (brouillon) : il est créé dès que l'activité et l'offre du client sont connues (start.answer).", "No project linked yet (draft): it is created once the business and offer are known.");
  const choix = (() => { const j = journeyOf(r.conversation_id); return modelFor(currentStep(j), { customTheme: !!j.customChosenAt, judge: needsJudgement(history), keyMoment: conv.momentsForts ? momentOf(history, currentStep(j)) : null }); })();
  const call: LlmCall = {
    task: "agent_conversation", userId: user.id, projectId: r.project_id, jobId,
    // Mémoire d'une heure : un client qui réfléchit, ou une création en arrière-plan, ne fait plus tout repayer.
    memoireLongue: true,
    system: SYNA_SYSTEM, promptKey: "syna-agent-2",
    // La même liste d'outils avant et après la création du projet (relevé de Nadia, 22 novembre 2026 : la liste changeait à
    // la 2e réponse et toutes les notices étaient réécrites en mémoire) ; un outil qui demande un projet est refusé sans
    // rien payer tant qu'il n'existe pas.
    reference: scope.routed ? `# Outils du Studio (ceux de l'étape en entier, les autres en liste)\n\n${routedCatalog(true, scope, currentStep(journeyOf(r.conversation_id)), momentDeLEtape(journeyOf(r.conversation_id)))}${guide ? `\n\n# Consigne de l'étape en cours (la même à chaque pas de l'étape)\n${guide}` : ""}` : `# Outils disponibles (registre commun)\n\n${toolCatalog(!!r.project_id, scope)}`,
    context: `${backgroundCreation(r) ? BACKGROUND_NOTE : ""}# Parcours de création (relu à cette étape)\n${journeyContext(journeyOf(r.conversation_id), { identityCount: identityCountOf(r.project_id), notes: r.project_id ? notesDuProjet(r.project_id) : ficheOf(r.conversation_id).notes, fiche: ficheDuFil(r.conversation_id, r.project_id), guideAPart: scope.routed })}${openings.length ? `\nDébuts de tes derniers messages (commence autrement) : ${openings.map((o) => `« ${o}… »`).join(" ; ")}.` : ""}\n\n# État actuel du projet (relu à cette étape)\n${snapshot}\n\n# Budget de tes réponses\nAutorisé pour tes réponses : ${b.authorizedPct ?? 0} % du budget IA ; engagé au total dans ce fil : ${b.spentPct ?? 0} %. Chaque création payante passe en plus par la carte d'accord du client.${await stepQuote(user, r)}\n\n# Pièces jointes du fil\n${piecesJointes(r.conversation_id, history)}${resultatsDeLaDemande(history)}${note}`,
    // Le fil, un bloc par message, mis en mémoire chez le fournisseur (promptHead) : au pas suivant, il est repris.
    history: filEnBlocs(history, history[0] ? messagesDuClientAvant(r.conversation_id, history[0].seq) : []),
    prompt: `Étape ${step + 1} de cette demande. Réponds avec l'objet JSON {message, actions, question, done}.`,
    images: images.length ? images : undefined,
    imagesEnMemoire: duParcours.length ? duParcours : undefined,
    maxTokens: 12000, maxOutputTokens: 16000, usageKey: `syna:${r.id}:${step}${cle}`, routing: { difficulty: "complex", prefer: { ...choix, effort: sinaModels().strong.effort } },
    // L'effort des moments forts passe par un message dans la conversation : l'effort de la demande ne change plus et la
    // mémoire du fil reste (22 novembre 2026). Fonction refusée ou éteinte : l'effort passe dans la demande, comme avant.
    ...(choix.effort && choix.effort !== sinaModels().strong.effort ? { effortDuTour: choix.effort } : {}),
  };
  sawImages.set(r.id, [...images, ...duParcours].some((im) => /^(Logo|Planche|Identité|Marque du client|Maquette|Site codé|Thème sur mesure|Accueil dessiné)/.test(im.label ?? "")));
  if (deps.reason) return StepSchema.parse(await deps.reason(call));
  // Budget des réponses, plus le reste d'un accord donné sur la carte dans cette demande (pour en rendre compte).
  const cap = replyAllowanceMicro(user.id, r.project_id, r.conversation_id, r.id) + jobSpentMicro(jobId);
  // L'étape du parcours dans la trace : le coût de SINA se lit étape par étape (recherche 11, point 1).
  return withTrace({ jobId, projectId: r.project_id, step: `syna:etape-${currentStep(journeyOf(r.conversation_id))}`, costCapMicro: cap }, () => llmJson(call, StepSchema));
}

/**
 * La relectrice (carte des spécialistes, lot 3) : à un moment qui compte, une autre lit la réponse avant qu'elle parte.
 * Refusée : SINA la réécrit UNE fois avec ses remarques (jamais montrées au client) ; la réécriture n'est pas relue une
 * seconde fois (coût borné). Une relecture en panne, ou le budget des réponses atteint, ne bloque jamais la réponse.
 */
async function reviewedReply(user: User, r: SynaRun, jobId: string, step: number, deps: AgentDeps, draft: StepOutput): Promise<{ out: StepOutput; relu: "ok" | "repris" | null }> {
  // (Essais sans IA : seulement si le test fournit la relectrice.)
  if (!conversationSettings().relecture || (deps.reason && !deps.review)) return { out: draft, relu: null };
  const history = lastMessages(r.conversation_id, 120), moment = momentOf(history, currentStep(journeyOf(r.conversation_id)));
  if (!shouldReview(moment, draft)) return { out: draft, relu: null };
  try {
    let lastUser = -1;
    history.forEach((m, i) => { if (m.role === "user") lastUser = i; });
    const n = currentStep(journeyOf(r.conversation_id));
    const wording = r.project_id ? (() => { try { return wordingPromptLine(loadWordingRules(r.project_id!)); } catch { return ""; } })() : "";
    const call: LlmCall = {
      task: "quality_control", userId: user.id, projectId: r.project_id, jobId, system: REPLY_REVIEW_SYSTEM, promptKey: "syna-reply-review-1",
      // Les relectures sont espacées de plus de 5 minutes : une heure, sinon sa consigne serait réécrite à chaque fois.
      memoireLongue: true,
      prompt: replyReviewPrompt({ moment, step: n, stepLabel: JOURNEY_STEPS.find((s) => s.n === n)?.fr, client: String(history[lastUser]?.content?.text ?? ""), facts: serialize(history.slice(lastUser + 1)), draft, wording, quote: await stepQuote(user, r) }),
      maxTokens: 3000, maxOutputTokens: 6000, usageKey: `syna:${r.id}:${step}:relecture`, routing: { difficulty: "standard", prefer: { ...modelFor(0)!, effort: "medium" } },
    };
    const cap = replyAllowanceMicro(user.id, r.project_id, r.conversation_id, r.id) + jobSpentMicro(jobId);
    const review = ReplyReviewSchema.parse(deps.review ? await deps.review(call) : await withTrace({ jobId, projectId: r.project_id, step: "syna-relecture", costCapMicro: cap }, () => llmJson(call, ReplyReviewSchema)));
    if (review.verdict !== "reprendre" || !review.issues.length) return { out: draft, relu: "ok" };
    return { out: await reason(user, r, jobId, step, deps, reviewNote(draft, review.issues)), relu: "repris" };
  } catch { return { out: draft, relu: null }; }
}

function newAttachmentSinceLastAssistant(h: SynaMessage[]) {
  for (let i = h.length - 1; i >= 0; i--) { if (h[i].role === "assistant") return false; if (h[i].role === "user" && h[i].content.attachments?.length) return true; }
  return false;
}

/**
 * Le début du fil pour ce pas : le même pendant toute une étape. Il n'est recalculé qu'au changement d'étape (les notices
 * changent alors, la mémoire est réécrite de toute façon) ou au-delà de `FIL_MAX` messages.
 */
export function debutDuFilDeLEtape(cid: string): number {
  const j = journeyOf(cid), etape = currentStep(j);
  if (j.fil && j.fil.etape === etape && messagesDepuis(cid, j.fil.depuis) <= FIL_MAX) return j.fil.depuis;
  const depuis = debutDuFil(cid);
  updateJourney(cid, (x) => { x.fil = { depuis, etape }; });
  return depuis;
}

/** Fil lisible par le modèle : paroles exactes, réponses de SINA, résultats d'outils (tronqués), accords. */
export function serialize(h: SynaMessage[]): string {
  return serializeLines(h).join("\n");
}

/** Titre du fil, en tête de son premier bloc. */
export const FIL_TITRE = "# Fil de la conversation (le plus ancien d'abord ; tes propres réponses incluses)";
/**
 * Le fil en blocs pour la mise en mémoire : un bloc par message (le titre sur le premier). D'un pas à l'autre d'une
 * même demande, les blocs déjà envoyés restent identiques au caractère près et sont repris de mémoire.
 */
export function filEnBlocs(h: SynaMessage[], avant: SynaMessage[] = []): string[] {
  const lines = serializeLines(h);
  // Le début du fil n'est plus relu (fil très long) : un résumé à rubrique fixe le remplace, avec les mots du client.
  const coupe = avant.length ? `${DEBUT_COUPE}\n${avant.map((m) => `- [client #${m.seq}] ${String(m.content?.text ?? "").replace(/\s+/g, " ").slice(0, 200)}`).join("\n")}\n\n` : "";
  return lines.length ? lines.map((l, i) => i === 0 ? `${coupe}${FIL_TITRE}\n${l}` : l) : [`${coupe}${FIL_TITRE}\n(vide)`];
}
/** Rubrique du résumé du début du fil, quand il n'est plus relu. */
export const DEBUT_COUPE = "# Début de la conversation, qui n'est plus relu en entier\nCe qu'il t'a dit y est noté dans sa fiche (ci-dessous) ; voici, en bref, ce qu'il a écrit (ses mots) :";

/**
 * Un message s'écrit dans le fil UNE seule fois, au moment où il y entre, puis ne change plus jamais (22 novembre 2026,
 * demande du chef d'orchestre : réécrire le début d'une demande efface la mémoire du fournisseur, et peut la faire
 * refuser quand on lui renvoie des résultats d'outils). Les résultats d'outils y sont donc toujours courts ; ceux de la
 * demande en cours sont donnés en entier à part, dans la partie qui change à chaque pas (`resultatsDeLaDemande`).
 */
export const FIL_DONNEES_MAX = 300, FIL_ACTIONS_MAX = 160;
/** Taille d'un résultat de la demande en cours, donné en entier à part. */
export const DEMANDE_DONNEES_MAX = 12000;

function serializeLines(h: SynaMessage[]): string[] {
  return h.map((m) => ligneDuFil(m, FIL_DONNEES_MAX, FIL_ACTIONS_MAX));
}

/** Un message tel qu'il s'écrit : ne dépend que de lui-même, jamais de sa place dans le fil. */
function ligneDuFil(m: SynaMessage, dataMax: number, argsMax: number): string {
  const c = m.content;
  if (m.role === "user") return `[client #${m.seq}] ${c.text}${c.attachments?.length ? ` (pièces jointes : ${c.attachments.join(", ")})` : ""}`;
  if (m.role === "assistant") return `[SINA #${m.seq}] ${c.message}${c.actions?.length ? `\n  actions : ${c.actions.map((a: any) => `${a.tool} ${JSON.stringify(a.args)}`.slice(0, argsMax)).join(" | ")}` : ""}${c.question ? `\n  question : ${c.question.text}` : ""}`;
  if (m.role === "tool") return `[résultat ${c.tool} #${m.seq}] ${c.ok ? "OK" : "ÉCHEC"} — ${c.summary}${c.hint ? `\n  consigne (pour toi seule) : ${c.hint}` : ""}${c.changes?.length ? `\n  changements vérifiés : ${c.changes.map((x: any) => `${x.module}/${x.object} : ${x.summary}${x.verified ? "" : " (non vérifié)"}`).join(" ; ")}` : ""}${c.data != null ? `\n  données : ${JSON.stringify(c.data).slice(0, dataMax)}` : ""}`;
  if (c.kind === "confirmation") return `[accord demandé #${m.seq}] ${c.pending?.tool} — ${c.pending?.reason}`;
  if (c.kind === "approved" || c.kind === "declined") return `[client : ${c.kind === "approved" ? "ACCORD" : "REFUS"} pour ${c.tool}]`;
  return `[événement ${c.kind}]`;
}

/**
 * Les résultats d'outils de la demande en cours (depuis le dernier message du client), en entier, avec les actions qui
 * les ont lancés : donnés à part, après le point de mémoire. Vide quand aucun n'a été raccourci dans le fil.
 */
export function resultatsDeLaDemande(h: SynaMessage[]): string {
  let i = h.length - 1;
  while (i >= 0 && h[i].role !== "user") i--;
  const lignes = h.slice(i + 1).filter((m) => (m.role === "tool" && m.content?.data != null && JSON.stringify(m.content.data).length > FIL_DONNEES_MAX) || (m.role === "assistant" && m.content?.actions?.some((a: any) => `${a.tool} ${JSON.stringify(a.args)}`.length > FIL_ACTIONS_MAX)));
  // La section lue pour une retouche, en entier : SINA y recopie les passages exacts à changer.
  return lignes.length ? `\n\n# Résultats complets de cette demande (raccourcis dans le fil)\n${lignes.map((m) => ligneDuFil(m, m.content?.tool === "custom.section" ? 32000 : DEMANDE_DONNEES_MAX, 400)).join("\n")}` : "";
}

function clip(v: unknown, max: number): unknown {
  if (v == null) return v;
  const s = typeof v === "string" ? v : JSON.stringify(v);
  if (s.length <= max) return v;
  return typeof v === "string" ? `${s.slice(0, max)}…` : { truncated: true, preview: s.slice(0, max) };
}

const drawnNames = new Map<string, DrawnWordmark | null>();
/** Le nom dessiné d'une planche (tracés composés par le Studio), gardé en mémoire : le fil se relit souvent. */
function drawnName(x: Identity): DrawnWordmark | null {
  if (!x.board) return null;
  const key = JSON.stringify([x.name, x.fonts.heading, x.board.wordmark]);
  if (drawnNames.has(key)) return drawnNames.get(key)!;
  let drawn: DrawnWordmark | null = null;
  // Police illisible ou recette impossible : la planche écrit alors le nom dans la police de titres (jamais d'écran vide).
  try { drawn = drawWordmark(x.name, safeWordmark(x.board.wordmark, x.name), x.fonts.heading); } catch { drawn = null; }
  if (drawnNames.size > 300) drawnNames.clear();
  drawnNames.set(key, drawn);
  return drawn;
}
/** Images d'une planche : l'identifiant rangé devient une adresse interne du Studio (accès contrôlé par projet). */
function boardShots(i: NonNullable<Board["images"]>) {
  const shot = (v?: BoardImage | null) => (v ? { url: assetUrl({ id: v.id }), w: v.w, h: v.h } : null);
  return {
    ...(i.logo ? { logo: shot(i.logo)! } : {}), ...(i.hero ? { hero: shot(i.hero)! } : {}), ...(i.object ? { object: shot(i.object)! } : {}), ...(i.site ? { site: shot(i.site)! } : {}),
    ...(i.posts ? { posts: i.posts.map((v) => shot(v)) } : {}),
    ...(i.mark ? { mark: shot(i.mark)! } : {}), ...(i.markDark ? { markDark: shot(i.markDark)! } : {}), ...(i.signs ? { signs: shot(i.signs)! } : {}),
  };
}
/** Planche de marque d'une identité (routes du 12 novembre 2026) : couleurs d'affichage, nom dessiné, libellés. */
function boardOf(x: Identity) {
  if (!x.board) return {};
  return {
    look: groundPresentation(x.palette, x.ground, x.gradient), drawn: drawnName(x),
    board: { ...x.board, ...(x.board.images ? { images: boardShots(x.board.images) } : {}), signs: x.board.signs.map((s) => ({ ...s, kindLabel: L(SIGN_KIND_LABEL[s.kind].fr, SIGN_KIND_LABEL[s.kind].en) })), object: { ...x.board.object, label: L(BOARD_OBJECT_LABEL[x.board.object.kind].fr, BOARD_OBJECT_LABEL[x.board.object.kind].en) } },
  };
}
const cardOf = (x: Identity) => ({ ...x, logoStyleLabel: LOGO_STYLE_LABEL[x.logoStyle], faces: { heading: fontFace(x.fonts.heading), body: fontFace(x.fonts.body) }, ...boardOf(x) });
const PART_LABEL: Record<string, string> = { name: "le nom", slogan: "le slogan", palette: "les couleurs", fonts: "les polices", tone: "le ton", logo: "l'idée de logo" };
/** « Heure Dorée (B) avec les couleurs de Tour de Main (A) » ; vide quand le client a pris une identité telle quelle. */
export function mixLabel(list: Identity[], c: { key: string; mix: Partial<Record<string, string>> }): string {
  const nameOf = (k: string) => `${list.find((x) => x.key === k)?.name ?? k} (${k})`;
  const parts = Object.entries(c.mix).filter(([, k]) => k && k !== c.key).map(([part, k]) => `${PART_LABEL[part] ?? part} de ${nameOf(k!)}`);
  return parts.length ? `${nameOf(c.key)} avec ${parts.join(", ")}` : "";
}

/**
 * Élision oubliée par le modèle (« Je enregistre » → « J'enregistre ») : corrigée sans IA dans les réponses de SINA.
 * Le « h » n'est pas touché (h aspiré : « je hais »).
 */
export function fixElision(s: string): string {
  // Liste écrite sur une seule ligne (« … uniquement. - Produits : … - Prix : … », essai réel) : une ligne par élément.
  s = s.replace(/([.!?…])\s+-\s+(?=[A-ZÀ-Ý][^:\n]{0,40}\s?:)/g, "$1\n- ").replace(/ :\s+-\s+(?=[A-ZÀ-Ý][^:\n]{0,40}\s?:)/g, " :\n- ");
  // Seulement « je », « le », « ne », « que » (jamais « me » ou « se » : SINA répond aussi en anglais, « me and… »).
  // Un mot entier seulement (essai réel du 8 novembre : « le modèle OpenAI » devenu « modèl'OpenAI », la fin de
  // « modèle » prise pour l'article « le »).
  return s.replace(/(?<![\p{L}'’-])([JjLlNn]e|[Qq]ue) ([aeiouyéèêàâîôûAEIOUYÉÈÊÀÂÎÔÛ])/gu, (_m, w: string, v: string) => `${w.slice(0, -1)}'${v}`);
}

export function threadView(user: User, cid: string) {
  const c = conversationOf(cid);
  if (!c || c.user_id !== user.id) throw new HttpError(404, L("Conversation introuvable.", "Conversation not found."));
  // La demande montrée : celle que SINA exécute en ce moment ; sinon celle qui attend une création en arrière-plan ;
  // sinon la dernière. « background » : une création tourne, et le client peut quand même écrire.
  const latest = one<SynaRun>("SELECT * FROM syna_runs WHERE conversation_id=? ORDER BY created_at DESC LIMIT 1", cid) ?? null;
  const live = one<SynaRun>("SELECT * FROM syna_runs WHERE conversation_id=? AND status IN ('queued','running','waiting_confirmation') ORDER BY created_at DESC LIMIT 1", cid) ?? null;
  const waiting = one<SynaRun>("SELECT * FROM syna_runs WHERE conversation_id=? AND status='waiting_jobs' ORDER BY created_at DESC LIMIT 1", cid) ?? null;
  const r = live ?? waiting ?? latest;
  return {
    conversationId: cid, projectId: c.project_id,
    messages: lastMessages(cid, 400),
    run: r ? { id: r.id, status: r.status, step: r.step, pending: pendingOf(r), error: r.error } : null,
    background: !!waiting && !live,
    budget: budgetState(user.id, c.project_id, cid),
    attachments: attachmentsOf(cid).map((a) => ({ id: a.id, kind: a.kind, name: a.name, analysis: a.analysis })),
    tools: allTools().length,
    journey: (() => {
      const j = journeyOf(cid);
      return {
        // Le client voit neuf étapes ; « internal » garde le repère interne (0 à 13) pour le Studio.
        current: phaseOf(currentStep(j)).n, internal: currentStep(j), mode: j.mode, keep: j.keep,
        steps: PHASES.map((p) => ({ n: p.n, fr: p.fr, en: p.en, status: phaseStatus(j, p), ready: (p.steps as readonly number[]).some((n) => stepReady(n)) })),
        // Étape 1 : la dernière proposition d'identités (cartes du fil), avec les fichiers de leurs vraies polices.
        identities: j.identities ? {
          round: j.identities.round, issues: j.identities.issues, chosen: j.identityChoice ?? null,
          list: j.identities.list.map(cardOf), study: j.identities.study ?? null,
          // Identité retenue telle qu'enregistrée (mélange compris) : la carte « Ton identité » montre le vrai résultat.
          final: j.identityChoice ? { ...cardOf(chosenRoute(j) ?? mixIdentity(j.identities.list, j.identityChoice.key, j.identityChoice.mix as any, j.identityChoice.edits ?? {})), mixLabel: mixLabel(j.identities.list, j.identityChoice), finished: !!j.brandFinish?.at, finishIssues: j.brandFinish?.issues ?? [] } : null,
        } : null,
        // Le logo de la marque, adopté par la fin de marque (image servie par la bibliothèque du projet).
        logos: j.logos ? { round: j.logos.round, chosen: j.logoChoice?.source ?? null, list: j.logos.list.map((x) => ({ ...x, href: x.assetId ? assetUrl({ id: x.assetId }) : null })) } : null,
        // Étape 5 : le plan de l'activité.
        activity: j.activity ? { ...j.activity, gaps: activityGaps(j.activity), validated: j.steps[5]?.status === "done" } : null,
        // Étape 6 : cartes des thèmes (site du client composé dans chacun) et thème choisi.
        themes: j.themes ? { ...j.themes, chosen: j.themeChoice?.id ?? null } : null,
        families: j.families ?? null,
        // Étape 6, maquettes : textes écrits avant la maquette (montrés en entier au client).
        siteCopy: c.project_id ? (() => { const sc = loadSiteCopy(c.project_id!); return sc ? { pages: Object.fromEntries(Object.entries(sc.pages).map(([k, v]) => [k, v])) } : null; })() : null,
        // Étape 9 : le plan des publications (avec le doute éventuel de SINA) et les publications qui ont leur image.
        posts: j.posts ? { round: j.posts.round, judged: j.posts.judged, groups: j.posts.groups, created: c.project_id && j.posts.created ? createdPosts(c.project_id, j.posts.created.postIds).map((x) => ({ id: x.id, network: x.network, title: x.title, images: x.media.map((id) => assetUrl({ id })) })) : null } : null,
        // Étape des angles : les trois angles montrés (sûr, émotion, audacieux ; la réserve n'est pas un choix) et l'angle choisi.
        angles: anglesViewOf(j),
        // Étape 3 : l'image de marque (déclinaisons, planche, charte PDF), servie par la bibliothèque du projet.
        brandKit: j.brandKit ? {
          validated: j.steps[3]?.status === "done", notes: j.brandKit.notes,
          items: j.brandKit.items.map((x) => ({ ...x, href: assetUrl({ id: x.assetId }), ...(x.download ? { downloadHref: assetUrl({ id: x.assetId }, { download: true }) } : {}) })),
          board: j.brandKit.boardId ? assetUrl({ id: j.brandKit.boardId }) : null,
          book: j.brandKit.bookId ? assetUrl({ id: j.brandKit.bookId }) : null,
          pages: j.brandKit.pageIds.map((id) => assetUrl({ id }, { thumb: true })),
        } : null,
      };
    })(),
  };
}

