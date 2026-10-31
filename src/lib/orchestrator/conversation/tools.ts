/** Outils de conversation bornés : les moteurs, droits et devis existants restent autoritaires. */
import { HttpError, type User } from "../../auth";
import { one, json } from "../../db";
import { requirePlan } from "../../plan-gates";
import { applyFicheChange, briefMissing } from "../../preparation/fiche";
import { commitState, draft, stateOf } from "../../preparation/store";
import { createQuote } from "../../preparation/quote";
import type { Brief } from "../../preparation/types";
import { L } from "../../i18n-server";
import type { ActionCard, ConversationRow } from "./contract";

export function assertBriefWritable(c: ConversationRow, user: User, revision: number | null) {
  if (!c.project_id) return;
  requirePlan(user, c.project_id);
  const s = stateOf(c.project_id);
  if (!s || s.revision !== revision) throw new HttpError(409, L("La fiche a changé. Relisez-la avant de répondre.", "The brief changed. Read it again before answering."), "conversation_brief_conflict");
  // Ce premier lot ne transforme pas un projet déjà validé, ni une tâche en cours, en nouveau démarrage.
  if (s.pending || ["provider", "simulation"].includes(s.stages.brief?.data.provenance ?? "") || Object.values(s.stages).some(stage => stage?.status === "approved") || s.stages.research || s.stages.brand || s.stages.content || s.stages.media)
    throw new HttpError(409, L("Ce projet a déjà une préparation engagée ou validée. Modifiez-le dans le parcours existant ; vos acquis restent conservés.", "This project already has preparation in progress or approved. Edit it in the existing workflow; your acquired results are preserved."), "conversation_existing_progress");
}
export function saveBrief(c: ConversationRow, b: Brief, user: User, revision: number | null) {
  assertBriefWritable(c, user, revision);
  b.missing = briefMissing(b);
  if (!c.project_id) return;
  commitState(c.project_id, revision!, s => draft(s,"brief",structuredClone(b)));
}
export function writeFact(b: Brief, key: string, label: string, value: string) {
  applyFicheChange(b, { kind: "fact", key, label, topic: null, value });
}
export type NativeQuote = { id: string; estimateBudgetPct: number | null; maxBudgetPct: number | null };
/**
 * Adaptation réversible du contrat #208. Sur un main antérieur, le contrôle de la preuve rejette le devis
 * incomplet dans la transaction : aucun devis ancien n'est offert comme s'il incluait tout le contexte.
 */
export function nativeAnalysisQuote(projectId: string, correction = ""): NativeQuote {
  const q = Reflect.apply(createQuote, undefined, [projectId, "brief", "analyze", undefined, correction]) as NativeQuote;
  const saved = json<{ analysisFingerprint?: string; correction?: string }>(one<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND key=? AND kind='artifact'", projectId, `preparation.quote.${q.id}`)?.value, {});
  if (!saved.analysisFingerprint || (saved.correction ?? "") !== correction.trim()) throw new HttpError(409,
    L("Le devis lié au contexte complet doit être intégré et vérifié avant ce raccordement (#208). Aucun essai n’est lancé.", "The quote bound to the complete context must be integrated and checked before this connection (#208). No attempt is started."), "conversation_quote_dependency");
  return q;
}
export function quoteCard(q: NativeQuote): ActionCard {
  if (!q.id || q.estimateBudgetPct == null || !Number.isFinite(q.estimateBudgetPct) || q.estimateBudgetPct < 0 || q.maxBudgetPct == null || !Number.isFinite(q.maxBudgetPct) || q.maxBudgetPct < q.estimateBudgetPct)
    throw new HttpError(409, L("Devis incomplet : aucune dépense proposée.", "Incomplete quote: no spending proposed."), "conversation_quote_unavailable");
  return { kind: "action", tool: "understand-offer", state: "requires_confirmation", executed: false,
    message: L("Estimation native en % du budget IA. L’accord reste nécessaire ; l’exécution est fermée dans ce lot.", "Native estimate as % of the AI budget. Consent is still required; execution is closed in this lot."),
    quote: { id: q.id, estimatePct: q.estimateBudgetPct, maximumPct: q.maxBudgetPct, expiresAt: Date.now() + 15 * 60000, confirmationRequired: true, executionEnabled: false } };
}
