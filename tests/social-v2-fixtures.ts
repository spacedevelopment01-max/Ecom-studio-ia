/**
 * Scénarios du benchmark Social V2 (phase 9A) — fournisseurs et comptes SIMULÉS dans les tests ; réels plus tard
 * (phase 9B) dans le Codespace du propriétaire via scripts/benchmark-social-v2.ts.
 *  A — Sébastien Blanc : 30 jours, 2/jour, plâtrier-peintre, sans fausses réalisations ni qualifications ;
 *  B — cosmétique premium : 30 jours, 3/jour, lifestyle, produit, conseils, vidéos ;
 *  C — high-tech : 15 jours, 2/jour, démonstrations et caractéristiques confirmées ;
 *  D — restaurant : 14 jours, 2/jour, menus et événements seulement s'ils sont confirmés ;
 *  E — SaaS : 30 jours, 1/jour, démonstrations, pédagogie, conversion.
 */
import type { ImageFixture } from "./image-v2-fixtures";
import type { Platform } from "@/lib/social-v2/platforms";
import type { FormatKind } from "@/lib/social-v2/planner";

export const SOCIAL_SCENARIOS = ["A", "B", "C", "D", "E"] as const;
export type SocialScenario = (typeof SOCIAL_SCENARIOS)[number];
export const SOCIAL_FIXTURE: Record<SocialScenario, ImageFixture> = { A: "artisan", B: "cosmetic", C: "hightech", D: "restaurant", E: "saas" };
export const SOCIAL_PLAN: Record<SocialScenario, { days: number; perDay: number; platforms: Platform[]; mix?: Partial<Record<FormatKind, number>>; archetype: string }> = {
  A: { days: 30, perDay: 2, platforms: ["facebook", "instagram"], archetype: "trade" },
  B: { days: 30, perDay: 3, platforms: ["instagram", "tiktok", "pinterest"], mix: { image: 35, carousel: 25, video: 40 }, archetype: "beauty" },
  C: { days: 15, perDay: 2, platforms: ["instagram", "youtube"], mix: { video: 50, image: 30, carousel: 20 }, archetype: "tech" },
  D: { days: 14, perDay: 2, platforms: ["instagram", "facebook"], archetype: "restaurant" },
  E: { days: 30, perDay: 1, platforms: ["linkedin", "facebook"], mix: { carousel: 40, video: 30, text: 30 }, archetype: "saas" },
};
export function socialScenarioOf(x: string): SocialScenario | null {
  const up = x.toUpperCase();
  if ((SOCIAL_SCENARIOS as readonly string[]).includes(up)) return up as SocialScenario;
  const hit = (Object.entries(SOCIAL_FIXTURE) as [SocialScenario, ImageFixture][]).find(([, f]) => f === x.toLowerCase());
  return hit ? hit[0] : null;
}
