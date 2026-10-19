/**
 * Règle « images finales 100 % IA » (guide du moteur d'images) : petits outils partagés par les parcours.
 * Une image finale vient d'un modèle de génération ou d'édition d'images ; jamais d'un gabarit ni d'une photo de banque.
 */
import type { VisualKind } from "./types";

/** Type d'image V2 pour une demande de l'onglet Images (produit seul, mise en scène, bannière, ambiance, métier). */
export function imageV2Kind(services: boolean, kind: string): VisualKind {
  if (kind === "banner") return "banner";
  if (kind === "ambiance") return "ambiance";
  if (services) return "trade_photo";
  return kind === "packshot" ? "packshot" : "lifestyle";
}

/** Message unique quand l'IA manque : rien n'est créé à la place. */
export const NO_AI_IMAGES = { fr: "Images finales créées par l'IA : IA indisponible pour ce projet (forfait, budget ou fournisseur), aucune image créée — aucun gabarit ni photo de banque à la place.", en: "Final images are created by AI: AI unavailable for this project (plan, budget or provider), no image created — no template or stock photo instead." };

export const TEXT_IMAGE_KINDS = new Set(["social", "ad", "service", "tips", "quote", "info", "booking", "promo", "event", "new", "review", "question", "team", "closing"]);
