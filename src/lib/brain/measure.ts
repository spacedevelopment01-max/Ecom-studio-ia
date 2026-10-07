/**
 * Project Brain 2C — quel moteur reçoit quel scope, et mesure « avant / après » (diagnostic, aucun appel à l'IA).
 *
 * AVANT : la vue legacy que le moteur recevait jusqu'en 2.1 (legacyView du scope legacy du moteur).
 * APRÈS : la vue explicite du scope (brainView). Les tailles sont en caractères du contexte stable.
 */
import type { Project } from "../projects";
import { brainSnapshot } from "./snapshot";
import { legacyView, type LegacyScope } from "./facade";
import { brainItems, contextFor, type Scope } from "./views";

export type EngineScope = { engine: string; scope: Exclude<Scope, "all">; legacy: LegacyScope | null; calls: string[] };

/** Table de migration 2C (source de vérité des tests et du rapport). legacy null = aucun contexte projet avant. */
export const ENGINE_SCOPES: EngineScope[] = [
  { engine: "logo", scope: "logo", legacy: "brand", calls: ["aiCreativeRoutes", "aiCreativeRedraw", "full-logo briefs"] },
  { engine: "image", scope: "image", legacy: "images", calls: ["aiImageBrief"] },
  { engine: "stock", scope: "stock", legacy: null, calls: ["stockQueries (service-media)", "topicQueries (service-media)", "universeQueries (stock-universe)"] },
  { engine: "theme", scope: "theme", legacy: "shop", calls: ["aiDesignHome", "aiThemeChat", "aiRepairOps", "aiReviewHome", "custom-theme (×2)"] },
  { engine: "shop_copy", scope: "shop_copy", legacy: "shop", calls: ["aiShopCopy"] },
  { engine: "seo", scope: "seo", legacy: "shop", calls: ["(aucun moteur SEO dédié : seo.title / seo.description écrits par aiShopCopy, méta des articles par le blog)"] },
  { engine: "blog", scope: "blog", legacy: "all", calls: ["blog topics", "blog writing"] },
  { engine: "social", scope: "social", legacy: "social", calls: ["aiSocialPlan", "aiSocialRepair", "aiRewritePost", "aiSocialVoice", "aiServiceTips (legacy images)"] },
  { engine: "advertising", scope: "advertising", legacy: "social", calls: ["draftAds"] },
  { engine: "video", scope: "video", legacy: "video", calls: ["aiVideoPlan", "aiUgcScript"] },
  { engine: "qc", scope: "qc", legacy: "all", calls: ["aiQcText (legacy all)", "aiCopyReview (legacy shop)", "aiSocialReview (legacy social)", "aiCraftReview (legacy social / video)"] },
  { engine: "brand", scope: "brand", legacy: "brand", calls: ["aiBrand"] },
];

export type EngineMeasure = {
  engine: string;
  scope: string;
  legacy: string | null;
  oldChars: number;
  newChars: number;
  reductionPct: number | null;
  sectionsIncluded: string[];
  sectionsExcluded: string[];
  itemsExcluded: string[];
  itemsAdded: string[];
  softBudget: number;
  softBudgetExceeded: boolean;
  hardCeilingReached: boolean;
  criticalDropped: string[];
  dropped: string[];
};

/** Mesure de chaque moteur pour un projet (avant = vue legacy du moteur, après = scope explicite). */
export function measureEngines(p: Project): EngineMeasure[] {
  const s = brainSnapshot(p);
  const items = new Map(brainItems(s).map((x) => [x.id, x]));
  return ENGINE_SCOPES.map((e) => {
    const v = contextFor(s, e.scope);
    const old = e.legacy ? legacyView(p, e.legacy) : null;
    const oldIds = new Set(old?.kept ?? []);
    const newIds = new Set(v.kept);
    const excluded = [...oldIds].filter((x) => !newIds.has(x));
    const added = [...newIds].filter((x) => !oldIds.has(x));
    return {
      engine: e.engine,
      scope: e.scope,
      legacy: old?.label ?? null,
      oldChars: old?.chars ?? 0,
      newChars: v.chars,
      reductionPct: old?.chars ? Math.round((1 - v.chars / old.chars) * 1000) / 10 : null,
      sectionsIncluded: v.sections,
      sectionsExcluded: [...new Set(excluded.map((x) => items.get(x)?.section ?? "?"))].filter((sec) => !v.sections.includes(sec)),
      itemsExcluded: excluded,
      itemsAdded: added,
      softBudget: v.softBudget,
      softBudgetExceeded: v.budgetExceeded,
      hardCeilingReached: v.hardCeilingReached,
      criticalDropped: v.criticalDropped,
      dropped: v.dropped,
    };
  });
}
