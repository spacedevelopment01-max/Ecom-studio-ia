/**
 * LE STUDIO PHOTO QUI GARDE LE VRAI PRODUIT (22 novembre 2026, recherche 08, point 6 ; engagements 2 et 8).
 *
 * Aucun outil ne garantit par écrit que le produit reste intact, ni Google ni OpenAI (recherche 08, 2.1) ; le texte de
 * l'étiquette est le premier à casser. Et les lignes directrices européennes du 5 novembre 2026 rangent parmi les
 * hypertrucages à signaler une image de produit qui le montre « plus beau qu'en vrai » ; changer le décor ne l'est pas.
 * D'où, PAR LE CODE et sans aucun appel payant :
 *  1. la photo du téléphone est d'abord jugée (taille, lumière, netteté, produit coupé) ; si elle ne suffit pas, une
 *     phrase dit comment la refaire, plutôt que de payer des images ;
 *  2. la méthode : un produit avec étiquette, logo ou texte est TOUJOURS posé tel quel (détouré, pixels inchangés) sur une
 *     scène créée par OpenAI (`image-v2/deps.ts`, `compositeProduct`) ; seul un produit sans texte peut être refait en
 *     entier par OpenAI ;
 *  3. une image refaite est comparée au détourage d'origine (forme, proportions, couleur) : un produit qui a changé est
 *     dit raté et n'est pas montré.
 * ÉTEINT tant que le propriétaire n'a pas dit oui (réglage `suivi.studioPhoto`) : le moteur des images n'appelle pas
 * encore ce contrôle. Point à lui soumettre : coller le vrai produit sur une scène d'OpenAI tient « images créées par
 * OpenAI » pour la scène, mais le produit reste la photo du client (c'est ce que veut « jamais déformé »).
 */
import sharp from "sharp";
import { L } from "../i18n-server";

export type Jugement = { ok: boolean; defauts: ("petite" | "sombre" | "brulee" | "floue" | "coupee")[]; conseil: string | null; mesures: { largeur: number; hauteur: number; lumiere: number; nettete: number } };

/** Seuils (mesurés sur des photos de téléphone ordinaires ; à affiner sur les vraies photos des clients). */
export const SEUILS = { cote: 800, sombre: 55, brule: 225, nettete: 60 } as const;

/** La netteté : variance du laplacien sur l'image en gris réduite à 512 px (plus c'est bas, plus c'est flou). */
async function nettete(img: Buffer): Promise<number> {
  const { data, info } = await sharp(img).greyscale().resize(512, 512, { fit: "inside" }).raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  let n = 0, s = 0, s2 = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const v = data[i - w] + data[i + w] + data[i - 1] + data[i + 1] - 4 * data[i];
    s += v; s2 += v * v; n++;
  }
  return n ? s2 / n - (s / n) ** 2 : 0;
}

/** Le produit touche-t-il le bord ? (lu sur le détourage : des pixels opaques sur le pourtour) */
export async function produitCoupe(cutoutPng: Buffer): Promise<boolean> {
  const { data, info } = await sharp(cutoutPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, a = (x: number, y: number) => data[(y * w + x) * 4 + 3];
  let bord = 0, total = 0;
  for (let x = 0; x < w; x++) { total += 2; if (a(x, 0) > 128) bord++; if (a(x, h - 1) > 128) bord++; }
  for (let y = 0; y < h; y++) { total += 2; if (a(0, y) > 128) bord++; if (a(w - 1, y) > 128) bord++; }
  return bord / total > 0.02;
}

/** Le jugement de la photo du téléphone ; un défaut donne un conseil en une phrase, jamais une image payée. */
export async function jugerPhoto(photo: Buffer, cutout?: Buffer | null): Promise<Jugement> {
  const meta = await sharp(photo).metadata();
  const largeur = meta.width ?? 0, hauteur = meta.height ?? 0;
  const stats = await sharp(photo).greyscale().stats();
  const lumiere = Math.round(stats.channels[0].mean);
  const net = Math.round(await nettete(photo));
  const defauts: Jugement["defauts"] = [];
  if (Math.min(largeur, hauteur) < SEUILS.cote) defauts.push("petite");
  if (lumiere < SEUILS.sombre) defauts.push("sombre");
  if (lumiere > SEUILS.brule) defauts.push("brulee");
  if (net < SEUILS.nettete) defauts.push("floue");
  if (cutout && (await produitCoupe(cutout))) defauts.push("coupee");
  const phrases: Record<Jugement["defauts"][number], string> = {
    petite: L("la photo est trop petite : prends-la avec l'appareil photo du téléphone, pas en capture d'écran", "the photo is too small: take it with the phone camera, not a screenshot"),
    sombre: L("elle manque de lumière : mets-toi près d'une fenêtre, en plein jour", "it lacks light: stand near a window, in daylight"),
    brulee: L("elle est trop claire : évite le soleil direct et le flash", "it's too bright: avoid direct sun and flash"),
    floue: L("elle est floue : tiens le téléphone des deux mains et touche l'écran sur le produit avant de prendre la photo", "it's blurry: hold the phone with both hands and tap the product before shooting"),
    coupee: L("le produit est coupé : recule d'un pas pour qu'il soit entier, avec un peu d'espace autour", "the product is cut off: step back so it's whole, with some space around it"),
  };
  return { ok: !defauts.length, defauts, conseil: defauts.length ? L(`Je préfère que tu refasses la photo : ${defauts.map((d) => phrases[d]).join(" ; ")}.`, `Please retake the photo: ${defauts.map((d) => phrases[d]).join("; ")}.`) : null, mesures: { largeur, hauteur, lumiere, nettete: net } };
}

export type Methode = "pose-tel-quel" | "refait-et-controle";
/** Un produit avec étiquette, logo ou texte est toujours posé tel quel ; seul un produit sans texte peut être refait. */
export const methodePhoto = (a: { texteSurProduit: boolean }): Methode => (a.texteSurProduit ? "pose-tel-quel" : "refait-et-controle");

/** Silhouette (masque) et couleur moyenne du produit, lues sur un détourage. */
async function empreinte(cutoutPng: Buffer) {
  const trimmed = await sharp(cutoutPng).ensureAlpha().trim({ threshold: 1 }).png().toBuffer().catch(() => cutoutPng);
  const m = await sharp(trimmed).metadata();
  const ratio = (m.width ?? 1) / (m.height ?? 1);
  const N = 96;
  const { data } = await sharp(trimmed).ensureAlpha().resize(N, N, { fit: "fill" }).raw().toBuffer({ resolveWithObject: true });
  const masque = new Uint8Array(N * N);
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < N * N; i++) if (data[i * 4 + 3] > 128) { masque[i] = 1; r += data[i * 4]; g += data[i * 4 + 1]; b += data[i * 4 + 2]; n++; }
  return { ratio, masque, couleur: n ? [r / n, g / n, b / n] : [0, 0, 0] };
}

/** Écart de couleur perçu (distance euclidienne pondérée, 0 à environ 765). */
const ecartCouleur = (a: number[], b: number[]) => Math.sqrt(2 * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + 3 * (a[2] - b[2]) ** 2);

export const TOLERANCE = { ratio: 0.08, recouvrement: 0.85, couleur: 45 } as const;

/**
 * Le contrôle de fidélité : le produit détouré de l'image refaite comparé au détourage d'origine. Proportions à 8 % près,
 * silhouette recouverte à 85 % au moins, couleur moyenne proche. Rend les écarts (vide : le produit est le même).
 */
export async function controleFidelite(origine: Buffer, rendu: Buffer): Promise<{ fidele: boolean; ecarts: string[] }> {
  const [a, b] = await Promise.all([empreinte(origine), empreinte(rendu)]);
  const ecarts: string[] = [];
  if (Math.abs(a.ratio - b.ratio) / a.ratio > TOLERANCE.ratio) ecarts.push(L("les proportions du produit ont changé", "the product's proportions changed"));
  let inter = 0, union = 0;
  for (let i = 0; i < a.masque.length; i++) { if (a.masque[i] && b.masque[i]) inter++; if (a.masque[i] || b.masque[i]) union++; }
  if (!union || inter / union < TOLERANCE.recouvrement) ecarts.push(L("la forme du produit a changé", "the product's shape changed"));
  if (ecartCouleur(a.couleur, b.couleur) > TOLERANCE.couleur) ecarts.push(L("la couleur du produit a changé", "the product's colour changed"));
  return { fidele: !ecarts.length, ecarts };
}
