/**
 * Le mélange, réglage de base des vidéos (rapport 09 du 22 novembre 2026, points 2, 3 et 10).
 *
 *  - Le PLAN SÛR est au centre : la vraie photo du produit détourée, posée en calque fixe avec son ombre de contact sur
 *    un décor (ambiance de la marque déjà créée par OpenAI, sinon les couleurs de la marque), le mouvement venant de la
 *    caméra au montage. Rien ne peut déformer le produit ni changer son étiquette.
 *  - UN SEUL plan animé par IA par vidéo, quand il apporte quelque chose (l'accroche en priorité, sinon la
 *    démonstration), avec le modèle animé RÉGLÉ dans l'administration (Images & Vidéos › « Vidéos produit »). Le modèle
 *    sera choisi par le propriétaire après l'essai comparatif (point 1) : tant qu'aucun n'est réglé explicitement, la
 *    vidéo reste faite de plans sûrs (aucune dépense de vidéo).
 *  - Un plan animé refusé par le contrôle est remplacé par le plan sûr, jamais montré, et rendu au client (le Studio
 *    garde à sa charge ce qu'il refait pour sa qualité).
 */
import { usageSettings } from "../ai/media-routing";
import { mediaModel } from "../ai/media-models";
import type { Shot } from "./types";

/** Nombre de plans animés par IA dans une vidéo du mélange. */
export const MIX_ANIMATED_SHOTS = 1;

/**
 * Modèle animé du mélange : celui réglé EXPLICITEMENT pour « Vidéos produit » dans l'administration (jamais un modèle
 * hérité ou choisi tout seul). null : aucun réglé, la vidéo reste en plans sûrs.
 */
export function mixAnimatedModel(): { provider: string; model: string } | null {
  const v = usageSettings().product_video?.primary;
  if (!v) return null;
  const [provider, ...rest] = v.split(":");
  const model = rest.join(":");
  const m = mediaModel(provider, model);
  return m && m.kind === "video" && m.caps.imageToVideo ? { provider, model } : null;
}

/**
 * Plan qui reçoit l'animation : l'accroche si elle montre le produit (le produit en action dans les 2 premières
 * secondes, guide de TikTok), sinon la première démonstration. Jamais la preuve, la conclusion ni la carte de fin.
 */
export function animatedShotId(storyboard: Pick<Shot, "id" | "part" | "showsProduct" | "character">[]): string | null {
  const ok = storyboard.filter((s) => !s.character && s.part !== "cta" && s.part !== "proof" && s.part !== "conclusion");
  return (ok.find((s) => s.part === "hook" && s.showsProduct) ?? ok.find((s) => s.part === "demonstration") ?? ok.find((s) => s.part === "hook") ?? null)?.id ?? null;
}

/** Mouvement de caméra du plan sûr : jamais figé (un plan fixe devient une avancée lente). */
export const safeCamera = (camera: Shot["camera"]): Shot["camera"] => (camera === "static" || camera === "handheld" || camera === "orbit" ? "push_in" : camera);
