/**
 * Vue d'administration du routage des modèles de texte : fournisseurs réellement disponibles, modèles compatibles,
 * tarif, effort accepté, usage recommandé, modèle principal et de secours par tâche, mode automatique ou manuel,
 * coûts observés par tâche. Lecture seule ; rien n'est appelé chez les fournisseurs.
 */
import { EUR } from "../billing";
import { routingPolicy } from "../orchestrator/policy";
import { observedStats, pickTextModel, pinnedTasks, routingMode, theoreticalCostMicro } from "../orchestrator/text-routing";
import { L } from "../i18n-server";
import { activeProviderKey, priceFor, routeFor, TASKS, type TaskId } from "./config";
import { modelAdmin, modelStatus, TEXT_MODELS, type TextModel } from "./text-models";

const eur = (micro: number | null) => (micro == null ? null : Math.round((micro / EUR) * 10_000) / 10_000);

export function textRoutingOverview() {
  const admin = modelAdmin();
  const providers = (["anthropic", "openai", "google"] as const).map((p) => ({ id: p, available: !!activeProviderKey(p) }));
  const models = TEXT_MODELS.map((m) => {
    const st = modelStatus(m, admin);
    return {
      key: st.key,
      provider: m.provider,
      model: m.model,
      label: m.label,
      tier: m.tier,
      vision: m.vision,
      effort: m.effort,
      limits: m.limits,
      verified: m.verified,
      source: m.source,
      use: L(m.use.fr, m.use.en),
      price: priceFor(m.provider, m.model),
      usable: st.usable,
      confirmed: st.confirmed,
      enabled: st.enabled,
      autoEligible: st.autoEligible,
      reasons: st.reasons,
    };
  });
  const policy = routingPolicy();
  const pinned = pinnedTasks();
  const label = (m: TextModel | null) => (m ? `${m.provider}:${m.model}` : null);
  const tasks = (Object.keys(TASKS) as TaskId[])
    .filter((t) => TASKS[t].kind === "llm")
    .map((t) => {
      const p = policy[t];
      const tier = p.tier === "local" ? "light" : p.tier;
      const pick = pickTextModel({ task: t, tier, vision: p.needs.includes("vision"), admin });
      const manual = routeFor(t);
      const stats = observedStats(t);
      return {
        task: t,
        label: TASKS[t].label,
        tier,
        effort: p.effort ?? null,
        pinned: pinned.includes(t),
        manual: { ...manual, estEur: eur(theoreticalCostMicro(t, manual)) },
        // Secours affiché seulement s'il est utilisable : son tarif est connu, la réservation couvre donc son coût.
        auto: pick ? { primary: label(pick.model), primaryEstEur: eur(theoreticalCostMicro(t, pick.model)), backup: label(pick.backup), backupEstEur: pick.backup ? eur(theoreticalCostMicro(t, pick.backup)) : null } : null,
        observed: Object.entries(stats).map(([key, s]) => ({ key, calls: s.calls, failures: s.failures, avgCostEur: eur(s.avgCostMicro), avgLatencyMs: s.avgLatencyMs, avgScore: s.avgScore })),
      };
    });
  return { mode: routingMode(), providers, models, tasks };
}
