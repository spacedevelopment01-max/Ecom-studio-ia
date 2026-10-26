import {publicDownload} from "../public-download";
/**
 * Choix de LA meilleure photo libre (Pixabay d'abord) pour une publicité ou une publication : parmi les photos
 * pertinentes (description qui cite le produit ou le métier, ordre de rankStock), on regarde leurs vignettes et on
 * préfère celle qui fera la meilleure affiche :
 *  - une zone calme pour le texte (ciel, mur, fond flou), le sujet restant visible de l'autre côté ;
 *  - un cadrage proche du format (moins de recadrage, le sujet n'est pas coupé) ;
 *  - une définition suffisante pour le format, et une photo appréciée dans la banque (popularité).
 * La pertinence reste prioritaire : on ne réordonne que les premières candidates, jamais au profit d'une photo hors
 * sujet. Sans réseau (vignettes indisponibles), l'ordre de pertinence est gardé tel quel. Aucun appel à l'IA.
 */
import sharp from "sharp";
import type { StockPhoto } from "./photos";

const ratioOf = (aspect: string) => {
  const [w, h] = aspect.split(":").map(Number);
  return w > 0 && h > 0 ? w / h : 0.8;
};

type Fit = { calm: number; ok: boolean };

/** Agitation (contours) de la zone la plus calme où poser le texte, sur la vignette recadrée au format. */
async function calmOf(buf: Buffer, ratio: number): Promise<number> {
  const gh = 40;
  const gw = Math.max(8, Math.round(gh * ratio));
  const { data } = await sharp(buf).rotate().resize(gw, gh, { fit: "cover" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const busy = (x0: number, x1: number, y0: number, y1: number) => {
    let b = 0;
    let n = 0;
    for (let y = y0; y < y1 - 1; y++)
      for (let x = x0; x < x1 - 1; x++) {
        const v = data[y * gw + x];
        b += Math.abs(v - data[y * gw + x + 1]) + Math.abs(v - data[(y + 1) * gw + x]);
        n++;
      }
    return b / Math.max(1, n) / 255;
  };
  const hw = Math.round(gw * 0.48);
  const hh = Math.round(gh * 0.45);
  // Formats larges ou carrés : texte à gauche ou à droite ; formats hauts : texte en haut.
  return ratio > 0.9 ? Math.min(busy(0, hw, 0, gh), busy(gw - hw, gw, 0, gh)) : busy(0, gw, 0, hh);
}

async function fitOf(p: StockPhoto, ratio: number, fetcher: typeof fetch): Promise<Fit> {
  const src = p.thumb || p.url;
  try {
    const r = await fetcher(src, { headers: { "User-Agent": "E-COM-STUDIO-IA" }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return { calm: 1, ok: false };
    const buf = Buffer.from(await r.arrayBuffer());
    return { calm: await calmOf(buf, ratio), ok: true };
  } catch {
    return { calm: 1, ok: false };
  }
}

/** Note d'une candidate (plus haut = meilleure affiche). Exportée pour les tests. */
export function adFitScore(o: { index: number; total: number; calm: number; photoRatio: number; ratio: number; width: number; height: number; targetPx: number; popularity: number; maxPopularity: number }): number {
  const relevance = 1 - o.index / Math.max(1, o.total); // 1 → 0
  const calm = 1 - Math.min(1, o.calm / 0.12); // zone de texte nette = 1
  const crop = 1 - Math.min(1, Math.abs(Math.log(o.photoRatio / o.ratio)) / Math.log(2.2)); // même cadrage = 1
  const short = o.ratio >= 1 ? o.width : o.height;
  const definition = Math.min(1, short / o.targetPx);
  const liked = o.maxPopularity > 0 ? Math.sqrt(o.popularity / o.maxPopularity) : 0;
  return 1.4 * relevance + 1.2 * calm + 0.7 * crop + 0.4 * definition + 0.3 * liked;
}

/**
 * Réordonne les `top` premières candidates (pertinentes) pour une affiche au format `aspect`. Les suivantes gardent
 * leur ordre. `fetcher` : injectable pour les tests.
 */
export async function adFitOrder<T extends StockPhoto>(found: T[], aspect: string, opts: { top?: number; fetcher?: typeof fetch; targetPx?: number } = {}): Promise<T[]> {
  const top = Math.min(found.length, opts.top ?? 10);
  if (top < 2) return found;
  const ratio = ratioOf(aspect);
  const head = found.slice(0, top);
  const fits = await Promise.all(head.map((p) => fitOf(p, ratio, opts.fetcher ?? ((input)=>publicDownload(String(input),{maxBytes:5_000_000,accept:"image/*",timeoutMs:8000})))));
  // Aucune vignette lisible (hors ligne) : la pertinence décide seule.
  if (!fits.some((f) => f.ok)) return found;
  const maxPop = Math.max(0, ...head.map((p) => p.popularity ?? 0));
  const scored = head.map((p, index) => ({ p, s: adFitScore({ index, total: top, calm: fits[index].calm, photoRatio: p.width && p.height ? p.width / p.height : ratio, ratio, width: p.width || 0, height: p.height || 0, targetPx: opts.targetPx ?? 1080, popularity: p.popularity ?? 0, maxPopularity: maxPop }) }));
  scored.sort((a, b) => b.s - a.s);
  return [...scored.map((x) => x.p), ...found.slice(top)];
}
