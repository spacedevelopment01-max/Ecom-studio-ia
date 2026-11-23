/**
 * « METS MON PRODUIT DANS UNE SCÈNE » (rapport 10, point 3 et partie 4).
 *
 * La façon de faire, une seule : la vraie photo est détourée sur la machine du Studio (`media/cutout.ts`), la scène est
 * créée par OpenAI avec la photo en référence (lumière, ombre et taille placées par le modèle), puis contrôlée AVANT
 * d'être montrée : forme, proportions et couleur comparées au détourage d'origine (`suivi/studio-photo.ts`), et le
 * juge (le modèle le plus fort, une image à la fois, 8 sur 10 au moins) lit l'étiquette MOT À MOT contre la photo
 * d'origine. Une image ratée est dite ratée.
 *
 * EN ATTENTE DU PROPRIÉTAIRE, ÉTEINT : la méthode « vrais pixels reposés » (reposer les pixels du détourage à l'endroit
 * où le modèle a placé le produit, pour que l'étiquette soit celle de la photo au pixel près). Elle touche sa règle
 * « produit collé devant une photo floue », refusée, et son essai payant n'est pas accordé. Le code est prêt et essayé
 * sur des images simulées ; il ne s'allume que par le réglage `atelier.vraisPixels` (« 1 »), que seul le propriétaire
 * décide. Tant qu'il est éteint, l'image est celle d'OpenAI, contrôlée.
 */
import sharp from "sharp";

/** Réglage qui allumerait « vrais pixels reposés » : absent ou autre que « 1 » = éteint. */
export const REGLAGE_VRAIS_PIXELS = "atelier.vraisPixels";
export const vraisPixelsActifs = (lire: (k: string) => string | null): boolean => lire(REGLAGE_VRAIS_PIXELS) === "1";

/**
 * Ce que le juge lit sur toute image qui montre le vrai produit (ajouté à sa consigne de relecture, `image-v2/deps.ts`,
 * en anglais comme le reste de cette consigne) : l'étiquette lue MOT À MOT contre la photo d'origine. Une seule lettre,
 * un chiffre ou une contenance changée (test du 6 octobre 2026 : « 300 ml » devenu « 200 ml », « EFFECTIVE » devenu
 * « SFFECTIVE ») rend l'image ratée.
 */
export const JUGE_ETIQUETTE = "LABEL CHECK: read every word, number and unit printed on the REAL product reference, then on the image, WORD BY WORD. One changed, missing or added letter, digit or volume (e.g. \"300 ml\" shown as \"200 ml\", \"EFFECTIVE\" as \"SFFECTIVE\") means productAltered = true; quote the difference in issues.";

/** Boîte du produit dans une image (pixels), lue sur un masque de détourage (alpha > 128). */
export async function boiteProduit(maskPng: Buffer): Promise<{ x: number; y: number; w: number; h: number } | null> {
  const { data, info } = await sharp(maskPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * « Vrais pixels reposés » (ÉTEINT, en attente du propriétaire) : le détourage d'origine est reposé, à sa taille, dans
 * la boîte où le modèle a placé le produit (`placeMask` : le produit détouré de la scène créée), centré en bas (le
 * produit repose sur sa surface). L'ombre et la lumière créées par le modèle restent autour. Rend la scène finale.
 */
export async function reposerVraisPixels(scene: Buffer, cutoutPng: Buffer, placeMask: Buffer): Promise<Buffer> {
  const place = await boiteProduit(placeMask);
  if (!place) throw new Error("Le produit n'a pas été retrouvé dans la scène : rien n'est reposé.");
  const cut = await sharp(cutoutPng).ensureAlpha().trim({ threshold: 1 }).png().toBuffer();
  const cm = await sharp(cut).metadata();
  const k = Math.min(place.w / (cm.width ?? 1), place.h / (cm.height ?? 1));
  const w = Math.max(1, Math.round((cm.width ?? 1) * k)), h = Math.max(1, Math.round((cm.height ?? 1) * k));
  const pose = await sharp(cut).resize(w, h, { fit: "fill" }).png().toBuffer();
  const left = Math.round(place.x + (place.w - w) / 2), top = Math.round(place.y + place.h - h);
  return sharp(scene).composite([{ input: pose, left, top }]).png().toBuffer();
}
