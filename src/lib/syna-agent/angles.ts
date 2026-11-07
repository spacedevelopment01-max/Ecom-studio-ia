/**
 * Étape 4 du parcours SINA (#492) : 5 ANGLES MARKETING (recherche web, places de marché exclues, sources réelles,
 * preuves à confirmer), puis le choix du client.
 *
 * Le moteur existe déjà (Pilote : analyse de la fiche puis recherche « research/generate » ; stratégie marketing :
 * activation de l'angle). Ce module l'enchaîne pour le parcours, comme un automate qu'on rappelle après chaque tâche :
 * fiche à analyser → questions éventuelles au client → fiche validée (le client a confirmé son résumé à l'étape 0) →
 * recherche → angles affichés → choix du client. Aucune étape n'est payée deux fois : chaque appel reprend où on en est.
 */
import { all } from "../db";
import { L } from "../i18n-server";
import { loadProject } from "../projects";
import { approve, editBrief, queuePreparation } from "../preparation/engine";
import { stateOf } from "../preparation/store";
import { analyzed } from "../preparation/understanding";
import { createQuote, quoteOf } from "../preparation/quote";
import { webSearchQuoteMicro } from "../ai/web-search";
import { activateStrategy, getStrategyState, prepareStrategyChange, proposeStrategies, stageStrategyModule } from "../marketing-strategy";

export type SinaAngle = {
  id: string; title: string; audience: string; motivation: string; message: string; emotion: string;
  proofsToConfirm: string[]; arguments: string[]; sources: { title: string; url: string }[];
  /** Format du propriétaire (guide du 7 novembre 2026) : objectif, pourquoi, récit, scènes, publication, appel. */
  goal: string; why: string; story: string; show: string; organicExample: string; cta: string;
};
export type SinaAngles = { list: SinaAngle[]; recommendedId: string | null; recommendation: string; sourceCount: number; at: number };

/** Où en est l'étape 4 (lecture seule, sans frais). */
export type AnglesPhase =
  | { kind: "analyze" } // la fiche du client doit être comprise par l'IA (payant)
  | { kind: "questions"; questions: { id: string; question: string; required: boolean }[]; missing: string[] }
  | { kind: "approve_brief" } // fiche comprise et complète : à valider (gratuit)
  | { kind: "research" } // recherche web et 5 angles (payant)
  | { kind: "running" } // une préparation tourne déjà
  | { kind: "ready"; angles: SinaAngles };

const s = (v: unknown, max = 400) => String(v ?? "").trim().slice(0, max);

export function anglesPhase(projectId: string, running = false): AnglesPhase {
  if (running) return { kind: "running" };
  const st = stateOf(projectId);
  const brief: any = (st?.stages as any)?.brief;
  if (!st || !brief) return { kind: "analyze" };
  if (brief.status !== "approved") {
    const b = brief.data;
    if (!analyzed(b)) return { kind: "analyze" };
    const questions = (b.profile?.questions ?? []).filter((q: any) => q.required && !q.answer && !q.later).map((q: any) => ({ id: q.id, question: q.question, required: true }));
    if (questions.length || b.missing?.length) return { kind: "questions", questions, missing: b.missing ?? [] };
    return { kind: "approve_brief" };
  }
  const r: any = (st.stages as any).research;
  if (!r?.data?.angles?.length || r.status === "stale") return { kind: "research" };
  return { kind: "ready", angles: anglesOf(r.data) };
}

/** Les 5 angles tels qu'on les montre au client : cible, motivation, accroche, émotion, preuves à confirmer, sources. */
export function anglesOf(d: any): SinaAngles {
  const byId = new Map<string, any>((d.sources ?? []).map((x: any) => [x.id, x]));
  const list: SinaAngle[] = (d.angles ?? []).map((a: any) => ({
    id: s(a.id, 40), title: s(a.title, 120), audience: s(a.audience), motivation: s(a.motivation), message: s(a.message), emotion: s(a.emotion, 120),
    proofsToConfirm: (a.proofsToConfirm ?? []).slice(0, 4).map((x: string) => s(x, 200)),
    arguments: (a.arguments ?? []).slice(0, 3).map((x: string) => s(x, 200)),
    goal: s(a.goal, 100), why: s(a.reason, 500), story: s(a.story ?? a.communicationChange ?? a.positioning, 700),
    show: s(a.show ?? a.visualDirection, 600), organicExample: s(a.organicExample, 400), cta: s(a.cta, 80),
    sources: (a.sourceIds ?? []).map((id: string) => byId.get(id)).filter((x: any) => x?.url).slice(0, 4).map((x: any) => ({ title: s(x.title || x.url, 120), url: s(x.url, 500) })),
  }));
  const used = (d.sources ?? []).filter((x: any) => x.status === "consulted" && x.relevance?.accepted !== false).length;
  return { list, recommendedId: d.recommendedId ?? null, recommendation: s(d.recommendation, 600), sourceCount: used, at: Date.now() };
}

/** Pourcentage lisible (« 8 % », « 4,5 % ») : jamais « 7.994748837209302 % » (essai réel du 7 novembre). */
export const pct = (x: number | null | undefined) => (x == null ? "?" : `${String(Math.round(x * 10) / 10).replace(".", ",")} %`);

/**
 * Dernier échec de la recherche (le Pilote le garde) avec ce qu'il a RÉELLEMENT coûté (appels enregistrés) : SINA ne
 * dit jamais « rien n'a été débité » sans ce chiffre (essai réel : la recherche web avait coûté 0,29 €).
 */
export function researchFailure(projectId: string): { message: string; costMicro: number } | null {
  const e: any = stateOf(projectId)?.error;
  if (!e || e.step !== "research") return null;
  const costMicro = e.jobId ? all<{ c: number | null }>("SELECT SUM(cost) c FROM ai_calls WHERE job_id=?", e.jobId)[0]?.c ?? 0 : 0;
  return { message: String(e.message ?? ""), costMicro };
}

/** Coût maximal de la prochaine étape payante (analyse de la fiche ou recherche), sans rien créer. */
export function anglesMaxMicro(projectId: string, redo?: string): number {
  const ph = anglesPhase(projectId);
  // Lire des angles prêts, poser des questions : gratuit (essai réel : le devis d'une recherche bloquait la lecture).
  if (ph.kind === "ready" && redo) return 1_000_000 + (webSearchQuoteMicro() ?? 0);
  if (ph.kind === "ready" || ph.kind === "questions" || ph.kind === "running") return 0;
  if (ph.kind === "analyze") {
    try { return (createQuote(projectId, "brief", "analyze") as any).capMicro ?? 1_000_000; } catch { return 1_000_000; }
  }
  return 1_000_000 + (webSearchQuoteMicro() ?? 0);
}

/**
 * Avance d'un cran. La fiche reprend d'abord le nom choisi à l'étape 1 (la recherche cherche les concurrents de CETTE
 * marque). Renvoie la tâche lancée, les questions à poser, ou les angles prêts.
 */
export function advanceAngles(projectId: string, redo?: string): { phase: AnglesPhase; jobId?: string; maxPct?: number } {
  const p = loadProject(projectId);
  let ph = anglesPhase(projectId);
  // Nouvelle proposition demandée par le client (ses mots) alors que des angles sont prêts : nouvelle recherche, avec sa
  // demande comme correction (le moteur l'exige pour un nouvel essai) ; les angles précédents restent conservés.
  if (ph.kind === "ready" && redo && redo.trim().length >= 8) return queue(projectId, "research", "generate", { kind: "research" }, redo.trim().slice(0, 1900));
  const st = () => stateOf(projectId)!;
  if (ph.kind === "analyze") {
    const input = (st().stages as any).brief.data.input;
    if (p.brand?.name && input.brandName !== p.brand.name) editBrief(projectId, st().revision, { ...input, brandName: p.brand.name, offerName: input.offerName?.replace(/\s*\(provisoire\)\s*$/, "") || input.offerName });
    return queue(projectId, "brief", "analyze", ph);
  }
  if (ph.kind === "approve_brief") {
    approve(projectId, st().revision, "brief", {} as any);
    ph = anglesPhase(projectId);
  }
  if (ph.kind === "research") {
    // Nouvel essai après un échec : le moteur exige de dire ce qu'il faut corriger (deux essais au plus pour les
    // mêmes données) — la raison de l'échec précédent, mot pour mot.
    const failed = researchFailure(projectId);
    return queue(projectId, "research", "generate", ph, failed ? L(`Nouvel essai après l'échec précédent : ${failed.message}`, `New attempt after: ${failed.message}`).slice(0, 1900) : undefined);
  }
  return { phase: ph };
}

function queue(projectId: string, step: "brief" | "research", action: "analyze" | "generate", phase: AnglesPhase, correction?: string) {
  const created = createQuote(projectId, step, action, undefined, correction) as any;
  const q = quoteOf(projectId, created.id, correction) as any;
  const r: any = queuePreparation(projectId, stateOf(projectId)!.revision, step, action, { capMicro: q.capMicro, paid: q.paid, slot: q.slot, correction: q.correction, analysisFingerprint: q.analysisFingerprint });
  const jobId = r?.jobId ?? r?.job?.id ?? stateOf(projectId)?.pending?.jobId;
  return { phase, jobId, maxPct: created.maxBudgetPct };
}

/** Nombre d'angles que le forfait du client permet d'utiliser (1, 2 ou 5). */
export function angleLimit(projectId: string): number {
  return getStrategyState(projectId).limit || 1;
}

function activate(projectId: string, angleId: string, idempotencyKey: string) {
  const prep = prepareStrategyChange(projectId, angleId);
  for (const c of prep.contents.filter((c: any) => !c.aligned && !c.published)) stageStrategyModule(projectId, prep.id, c.module, { contentIds: [], retainedContentIds: [c.contentId] });
  activateStrategy(projectId, { angleId, preparationId: prep.id, idempotencyKey, confirmed: true, retainUnaligned: true });
}

/**
 * Choix du client, UN OU PLUSIEURS angles (demande du propriétaire du 7 novembre : « le client doit pouvoir en choisir
 * plusieurs ») : le PREMIER est l'angle principal (fil conducteur du site, stratégie active) ; les autres sont retenus
 * pour les publications et les publicités (un angle principal par contenu). Le forfait fixe le nombre d'angles.
 */
export function chooseAngles(projectId: string, angleIds: string[], idempotencyKey: string) {
  try { proposeStrategies(projectId); } catch { /* état déjà à jour */ }
  const [principal, ...others] = angleIds;
  // Les angles retenus en plus sont activés d'abord (ils comptent dans le forfait), l'angle principal en dernier : il
  // reste l'angle actif.
  for (const id of others) activate(projectId, id, `${idempotencyKey}-${id}`);
  activate(projectId, principal, `${idempotencyKey}-${principal}`);
  const s0 = stateOf(projectId)!;
  if ((s0.stages as any).research?.status !== "approved") approve(projectId, s0.revision, "research", { choiceId: principal } as any);
  const active = getStrategyState(projectId).active?.angleId ?? null;
  const approved = (stateOf(projectId)!.stages as any).research?.status === "approved";
  return { active, approved, ok: active === principal && approved };
}

/** Choix d'un seul angle (compatibilité). */
export function chooseAngle(projectId: string, angleId: string, idempotencyKey: string) {
  try { proposeStrategies(projectId); } catch { /* état déjà à jour */ }
  activate(projectId, angleId, idempotencyKey);
  const s0 = stateOf(projectId)!;
  if ((s0.stages as any).research?.status !== "approved") approve(projectId, s0.revision, "research", { choiceId: angleId } as any);
  const active = getStrategyState(projectId).active?.angleId ?? null;
  const approved = (stateOf(projectId)!.stages as any).research?.status === "approved";
  return { active, approved, ok: active === angleId && approved, message: L("Angle choisi.", "Angle chosen.") };
}
