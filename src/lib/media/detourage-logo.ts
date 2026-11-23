/**
 * DÉTOURAGE DU LOGO PAR LE STUDIO (décision du propriétaire du 23 novembre 2026 : « fait moi un logo pour une marque de
 * bougies, tu donnes le nom de la marque et rien de plus » ; plus aucune consigne de fond au dessinateur). Le dessinateur
 * rend son logo sur le fond qu'il veut ; c'est le Studio qui le retire, sans IA et sans dépense :
 *
 * - fond déjà transparent : gardé ;
 * - fond UNI, de n'importe quelle couleur (blanc, crème, beige, une couleur franche, du noir) : la couleur du fond est
 *   retirée PARTOUT, y compris dans les creux des lettres fermées (« a », « o », « e ») : essai réel de Halo, la version
 *   claire pour fond sombre gardait l'intérieur du « a » et du « o » en blanc. Le bord des formes est adouci et sa couleur
 *   débarrassée de celle du fond (pas de liseré clair sur un fond sombre) ;
 * - fond qui n'est pas uni (texture, dégradé, photo, maquette) : le Studio ne sait pas le retirer proprement. Repli
 *   honnête : le logo n'est pas gardé (la raison est dite), il est redessiné avec la même demande, à la charge du Studio ;
 * - un logo devenu presque tout blanc une fois son fond retiré (lettres claires sur un fond foncé) disparaîtrait sur une
 *   page claire : ses parties claires prennent l'encre de la marque. Sa version claire pour fond sombre reste faite à part.
 *
 * Conséquence assumée : une partie du dessin exactement de la couleur du fond (des lettres blanches dans un badge sur fond
 * blanc) devient elle aussi transparente ; elle prend alors la couleur de la page, comme un logo « en réserve ».
 */
import sharp from "sharp";

/** Écart de couleur (sur 441) sous lequel un pixel est le fond ; au-delà de BORD, il est entièrement au dessin. */
const PRES = 30, BORD = 70;
/** Part des pixels du pourtour qui doivent avoir la couleur du fond pour qu'il soit dit uni. */
export const FOND_UNI_MIN = 0.9;

export type LogoDetoure =
  | { ok: true; png: Buffer; fond: "transparent" | "uni"; couleurDuFond: string | null; /** Ses parties claires ont pris l'encre de la marque. */ fonce: boolean }
  | { ok: false; raison: string };

const hex = (c: number[]) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
const lum = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

/** La couleur du pourtour (médiane) et la part des pixels du pourtour qui en sont proches. */
function pourtour(data: Buffer, w: number, h: number): { couleur: number[]; part: number; transparent: number } {
  const band = Math.max(2, Math.round(Math.min(w, h) * 0.02));
  const px: number[] = [];
  let transparent = 0, n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x >= band && x < w - band && y >= band && y < h - band) continue;
    const i = (y * w + x) * 4;
    n++;
    if (data[i + 3] < 16) { transparent++; continue; }
    px.push(i);
  }
  const med = (k: number) => { const v = px.map((i) => data[i + k]).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : 255; };
  const couleur = [med(0), med(1), med(2)];
  const proches = px.filter((i) => Math.hypot(data[i] - couleur[0], data[i + 1] - couleur[1], data[i + 2] - couleur[2]) < PRES).length;
  return { couleur, part: px.length ? proches / px.length : 1, transparent: n ? transparent / n : 0 };
}

/**
 * Retire la couleur `fond` de toute l'image (bords ET creux fermés), bord adouci, couleur du bord débarrassée du fond.
 * Seuls les pixels opaques sont touchés.
 */
export function retirerLaCouleur(data: Buffer, w: number, h: number, fond: number[]): void {
  const N = w * h, dist = (p: number) => Math.hypot(data[p * 4] - fond[0], data[p * 4 + 1] - fond[1], data[p * 4 + 2] - fond[2]);
  const retire = new Uint8Array(N);
  for (let p = 0; p < N; p++) if (data[p * 4 + 3] >= 16 && dist(p) < PRES) { retire[p] = 1; data[p * 4 + 3] = 0; }
  for (let p = 0; p < N; p++) {
    if (retire[p] || data[p * 4 + 3] < 16) continue;
    const x = p % w, y = (p - x) / w;
    const voisin = (x > 0 && retire[p - 1]) || (x < w - 1 && retire[p + 1]) || (y > 0 && retire[p - w]) || (y < h - 1 && retire[p + w]);
    if (!voisin) continue;
    const d = dist(p);
    if (d >= BORD) continue;
    const a = Math.max(0.05, (d - PRES) / (BORD - PRES)), i = p * 4;
    // Couleur du dessin sous le mélange : c = a·dessin + (1 − a)·fond.
    for (let k = 0; k < 3; k++) data[i + k] = Math.max(0, Math.min(255, Math.round((data[i + k] - (1 - a) * fond[k]) / a)));
    data[i + 3] = Math.round(data[i + 3] * a);
  }
}

/** Le logo sans fond, prêt pour une page claire, ou la raison honnête pour laquelle son fond ne peut pas être retiré. */
export async function detourerLeLogo(img: Buffer, o: { encre?: string | null } = {}): Promise<LogoDetoure> {
  let data: Buffer, w: number, h: number;
  try {
    const r = await sharp(img).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    data = Buffer.from(r.data); w = r.info.width; h = r.info.height;
  } catch { return { ok: false, raison: "l'image du logo ne se lit pas" }; }
  const t = pourtour(data, w, h);
  let fond: "transparent" | "uni", couleurDuFond: string | null = null;
  if (t.transparent >= FOND_UNI_MIN) {
    fond = "transparent";
    // Un blanc enfermé dans le dessin d'un logo déjà détouré depuis ses bords (les creux des lettres) est retiré aussi.
    retirerLaCouleur(data, w, h, [255, 255, 255]);
  } else if (t.transparent < 0.1 && t.part >= FOND_UNI_MIN) {
    fond = "uni"; couleurDuFond = hex(t.couleur);
    retirerLaCouleur(data, w, h, t.couleur);
  } else return { ok: false, raison: "son fond n'est pas uni (texture, dégradé ou décor) : je ne peux pas le retirer proprement" };
  // Ce qui reste du dessin.
  let opaque = 0, clair = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    opaque++;
    if (lum(data[i], data[i + 1], data[i + 2]) > 0.85) clair++;
  }
  if (opaque < 0.002 * w * h) return { ok: false, raison: "il ne reste presque rien du dessin une fois le fond retiré" };
  // Lettres claires sur un fond foncé : elles disparaîtraient sur une page claire ; elles prennent l'encre de la marque.
  const fonce = clair / opaque >= 0.6;
  if (fonce) {
    const e = /^#[0-9a-f]{6}$/i.test(o.encre ?? "") ? o.encre! : "#1A1A1A", ink = [1, 3, 5].map((k) => parseInt(e.slice(k, k + 2), 16));
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] >= 8 && lum(data[i], data[i + 1], data[i + 2]) > 0.6) { data[i] = ink[0]; data[i + 1] = ink[1]; data[i + 2] = ink[2]; }
  }
  const png = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  const trimmed = await sharp(png).trim({ threshold: 5 }).png().toBuffer().catch(() => png);
  const m = await sharp(trimmed).metadata();
  const pad = Math.round(Math.max(m.width ?? 0, m.height ?? 0) * 0.06) + 8;
  const fini = await sharp(trimmed).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return { ok: true, png: fini, fond, couleurDuFond, fonce };
}
