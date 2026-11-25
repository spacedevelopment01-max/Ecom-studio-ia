/**
 * LA PLANCHE ASSEMBLÉE PAR LE CODE (méthode des publications validée le 24 novembre 2026) : « La planche est une
 * présentation ; les publications sont des fichiers finaux. Dans la planche, elles sont posées par le code (fichiers
 * originaux réduits proportionnellement, même hauteur, ratios exacts, aucun recadrage), jamais redessinées par OpenAI. »
 *
 * `poserLaBande` pose les trois publications dans un rectangle donné d'une image (la planche en fichier aujourd'hui, la
 * case « 07 réseaux sociaux (1:1, 4:5, 9:16) » d'un futur gabarit fixe demain) ; `bandeEnFichier` en fait un fichier à
 * part. Gratuit, sans IA.
 */
import sharp from "sharp";
import { bandeDesPublications, type Rect } from "./bande-publications";

/** Une publication à poser : le fichier final, gardé tel quel. */
export type PublicationAPoser = { data: Buffer };

/** Les publications réduites à leur place, rapports exacts vérifiés (une image au rapport inexact est refusée). */
export async function publicationsPosees(publications: readonly PublicationAPoser[], rect: Rect, o: { ecart?: number } = {}): Promise<{ input: Buffer; left: number; top: number; w: number; h: number }[]> {
  const tailles = await Promise.all(publications.map(async (p) => { const m = await sharp(p.data).metadata(); return { w: m.width ?? 0, h: m.height ?? 0 }; }));
  if (tailles.some((t) => !t.w || !t.h)) throw new Error("Bande des publications : une image est illisible.");
  const places = bandeDesPublications(tailles, rect, o);
  if (places.length !== publications.length) throw new Error("Bande des publications : le rectangle est trop petit.");
  return Promise.all(places.map(async (pl, i) => {
    const t = tailles[i];
    // Rapport exact : la réduction ne déforme rien et ne coupe rien.
    if (pl.w * t.h !== pl.h * t.w) throw new Error(`Bande des publications : rapport non exact pour ${t.w}x${t.h}.`);
    const input = await sharp(publications[i].data).resize(pl.w, pl.h, { fit: "fill", kernel: "lanczos3" }).png().toBuffer();
    return { input, left: pl.x, top: pl.y, w: pl.w, h: pl.h };
  }));
}

/** Pose la bande dans `rect` d'une image existante (la planche en fichier) ; rend la nouvelle image en PNG. */
export async function poserLaBande(base: Buffer, publications: readonly PublicationAPoser[], rect: Rect, o: { ecart?: number } = {}): Promise<Buffer> {
  const posees = await publicationsPosees(publications, rect, o);
  return sharp(base).composite(posees.map(({ input, left, top }) => ({ input, left, top }))).png().toBuffer();
}

/** La bande seule, en fichier à part : les trois publications à même hauteur (`hauteur`, 560 par défaut), sur un fond doux. */
export async function bandeEnFichier(publications: readonly PublicationAPoser[], o: { hauteur?: number; ecart?: number; marge?: number; fond?: string } = {}): Promise<Buffer> {
  const H = o.hauteur ?? 560, ecart = o.ecart ?? 44, marge = o.marge ?? 32;
  const tailles = await Promise.all(publications.map(async (p) => { const m = await sharp(p.data).metadata(); return { w: m.width ?? 0, h: m.height ?? 0 }; }));
  const largeur = Math.ceil(tailles.reduce((s, t) => s + (H * t.w) / (t.h || 1), 0) + ecart * (publications.length - 1)) + marge * 2;
  const base = await sharp({ create: { width: largeur, height: H + marge * 2, channels: 3, background: o.fond ?? "#FCFBF8" } }).png().toBuffer();
  return poserLaBande(base, publications, { x: marge, y: marge, w: largeur - marge * 2, h: H }, { ecart });
}
