import { assertAnalysisRoute } from "./evidence";
import { analysisCostPlan } from "./inspect";
/** Devis local en % ; le garde-fou final reste la réservation native de chaque moteur. */
import { id, json, now, one } from "../db";
import { loadProject, remember } from "../projects";
import { aiActiveFor, assertAiAllowed } from "../ai/access";
import { aiAvailability } from "../ai/config";
import { textProviderReady } from "../ai/llm";
import { assertCanSpend } from "../billing";
import { budgetPctOf } from "../ai/budget-pct";
import { logoSeriesQuote } from "../logo-v2/quote";
import { requirePlan } from "../plan-gates";
import { HttpError } from "../auth";
import { mediaReusable, assertFresh, requestHash, type RunAction } from "./engine";
import { requireUpstream, stateOf } from "./store";
import type { Step } from "./types";
export type Quote = {
  id: string;
  step: Step;
  action: RunAction;
  slot?: string;
  revision: number;
  inputHash: string;
  capMicro: number;
  paid: boolean;
  createdAt: number;
};
export function createQuote(
  projectId: string,
  step: Step,
  action: RunAction,
  slot?: string,
) {
  if (
    (action === "collect" && step !== "media") ||
    (action === "logo" && step !== "brand") ||
    (action === "image" && (step !== "media" || !slot)) ||
    (action === "analyze" && step !== "brief") ||
    (action === "generate" && !["research", "brand", "content"].includes(step))
  )
    throw new HttpError(400, "Action incompatible avec cette étape.");
  requirePlan(null, projectId);
  const p = loadProject(projectId),
    s = stateOf(projectId);
  if (!s) throw new HttpError(409, "Parcours absent.");
  requireUpstream(s, step);
  assertFresh(projectId, s, step);
  if (
    step === "content" &&
    slot &&
    !s.stages.content?.data.pages.some(
      (x) => x.key === slot,
    )
  )
    throw new HttpError(400, "Page cible absente du plan validé.");
  if (
    action === "image" &&
    p.business === "products" &&
    !s.stages.brief?.data.input.photoIds.length
  )
    throw new HttpError(
      409,
      "Ajoutez une photo originale dans Produit, puis actualisez et validez les références de votre offre avant une création fidèle. Aucun appel n’a été lancé.",
    );
  const paid = !(action === "collect" && mediaReusable(projectId, s)) && (action === "logo" || action === "image" || action === "collect" || textProviderReady());
  if (["analyze", "generate"].includes(action) && !paid)
    throw new HttpError(
      409,
      "Fournisseur texte/vision indisponible. Étape en attente ; le brouillon et les choix restent conservés. Aucun résultat local ne remplace la livraison API.",
    );
  if (action === "analyze" && paid) assertAnalysisRoute(!!s.stages.brief?.data.input.photoIds.length);
  let capMicro = 0;
  let estimateMicro: number | null = null;
  if (paid) {
    if ((action === "image" || action === "logo") && !aiAvailability().image)
      throw new HttpError(
        409,
        "Fournisseur d’images indisponible. Votre projet et ses versions restent enregistrés ; aucun appel n’a été lancé.",
      );
    assertAiAllowed(p.userId, p.id);
    // Compréhension (#204) : plafond = pire cas réel de la demande (route, entrée, limites de sortie, reprises de
    // llmJson), plus jamais la formule des contenus ; estimation = un appel au déroulé habituel.
    const analysis = action === "analyze" ? analysisCostPlan(p, s.stages.brief!.data) : null;
    if (action === "analyze" && !analysis)
      throw new HttpError(409, "Le coût de cette analyse ne peut pas être encadré (tarif ou limites du modèle inconnus). Aucun appel n’a été lancé.");
    if (analysis) estimateMicro = analysis.estimateMicro;
    capMicro = analysis ? analysis.maxMicro :
      action === "logo"
        ? logoSeriesQuote().maxMicro
        : action === "image" || action === "collect"
          ? 2_000_000
          : ["research", "brand"].includes(step)
            ? 1_000_000
            : slot
              ? 600_000
              : Math.max(
                  2,
                  s.stages.content?.data.pages.length ??
                    p.services.services.length + 3,
                ) * 600_000 + 1_000_000;
    assertCanSpend(p.userId, capMicro, p.id);
  }
  const pct = paid ? budgetPctOf(p.userId, capMicro, p.id) : 0;
  const estimatePct = paid && estimateMicro != null ? budgetPctOf(p.userId, estimateMicro, p.id) : null;
  if (paid && (pct == null || !Number.isFinite(pct)))
    throw new HttpError(
      409,
      "Le coût ne peut pas être confirmé. Vérifiez l’abonnement du projet avant un nouvel essai.",
    );
  const q: Quote = {
    id: id(),
    step,
    action,
    slot,
    revision: s.revision,
    inputHash: requestHash(s, step, action, slot),
    capMicro,
    paid,
    createdAt: now(),
  };
  remember(projectId, {
    kind: "artifact",
    key: `preparation.quote.${q.id}`,
    value: JSON.stringify(q),
    source: "local",
  });
  return {
    id: q.id,
    paid,
    maxBudgetPct: pct,
    estimateBudgetPct: estimatePct,
    mode: paid ? "provider" : "local",
    note: paid
      ? estimatePct != null
        ? "Pris sur le budget IA inclus dans votre abonnement (aucun nouvel achat). L’estimation est la consommation habituelle ; le maximum ne peut pas être dépassé, reprises internes comprises. Seule la consommation constatée est retirée du budget ; aucune relance automatique en cas d’échec incertain."
        : "Plafond de cet essai, contrôles et reprises internes compris. Aucune relance automatique en cas d’échec incertain."
      : "Préparation locale gratuite, explicitement signalée ; aucune génération IA simulée.",
  };
}
export function quoteOf(projectId: string, quoteId: string): Quote {
  const q = json<Quote | null>(
    one<{ value: string }>(
      "SELECT value FROM memory WHERE project_id=? AND key=? AND kind='artifact'",
      projectId,
      `preparation.quote.${quoteId}`,
    )?.value,
    null,
  );
  const s = stateOf(projectId);
  if (
    !q ||
    !s ||
    now() - q.createdAt > 15 * 60000 ||
    s.revision !== q.revision ||
    q.inputHash !== requestHash(s, q.step, q.action, q.slot)
  )
    throw new HttpError(
      409,
      "Le devis n’est plus valable. Actualisez-le après vos modifications.",
    );
  return q;
}
