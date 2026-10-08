/**
 * Scénarios du benchmark Video V2 (phase 7A) : utilisés par les tests (fournisseurs simulés) et par
 * scripts/benchmark-video-v2.ts (vrais fournisseurs, plus tard, dans le Codespace du propriétaire).
 *  A — Sébastien Blanc, plâtrier-peintre : présentation, scènes de métier ;
 *  B — cosmétique premium : publicité produit, packshot, fidélité ;
 *  C — high-tech : démonstration, caractéristiques confirmées ;
 *  D — restaurant : vidéo courte, ambiance et plats ;
 *  E — SaaS : vidéo explicative du logiciel.
 * Les projets sont ceux du benchmark Image V2 ; aucun traitement propre à un scénario dans le moteur.
 */
import type { ImageFixture } from "./image-v2-fixtures";
import type { VideoAsk } from "@/lib/video-v2/intent";

export const VIDEO_SCENARIOS = ["A", "B", "C", "D", "E"] as const;
export type VideoScenario = (typeof VIDEO_SCENARIOS)[number];

export const SCENARIO_FIXTURE: Record<VideoScenario, ImageFixture> = { A: "artisan", B: "cosmetic", C: "hightech", D: "restaurant", E: "saas" };

export const SCENARIO_ASK: Record<VideoScenario, VideoAsk> = {
  A: { text: "Vidéo de présentation de l'entreprise avec des scènes du métier, 30 secondes pour le site" },
  B: { text: "Publicité vidéo produit premium de 15 secondes pour Instagram" },
  C: { text: "Démonstration du produit de 30 secondes pour la page produit" },
  D: { text: "Vidéo courte de 15 secondes sur l'ambiance et les plats, pour Instagram" },
  E: { text: "Vidéo explicative du logiciel, 45 secondes pour le site" },
};

/** Le scénario accepte un identifiant (« B ») ou le nom du projet de référence (« cosmetic »). */
export function scenarioOf(x: string): VideoScenario | null {
  const up = x.toUpperCase();
  if ((VIDEO_SCENARIOS as readonly string[]).includes(up)) return up as VideoScenario;
  const hit = (Object.entries(SCENARIO_FIXTURE) as [VideoScenario, ImageFixture][]).find(([, f]) => f === x.toLowerCase());
  return hit ? hit[0] : null;
}
