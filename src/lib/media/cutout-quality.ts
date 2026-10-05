/**
 * Mesures locales autour du détourage (aucun service externe) :
 *  - fond d'une photo : uni, dégradé doux ou chargé (tri des photos avant détourage, droit au détourage de secours) ;
 *  - contrôle d'un détourage : part du produit dans l'image, morceaux épars, contact avec les bords, contour
 *    incertain, trou au milieu du produit. Ces règles écartent les échecs grossiers ; le contrôle visuel par
 *    l'IA (quand elle est disponible) vient ensuite.
 */
import sharp from "sharp";
import type { CutoutReason } from "../cutout-reasons";

export type BgStats = {
  /** Part des pixels du bord proches de la couleur médiane du bord (0–1). */
  uniform: number;
  /** Part des pas sans saut de couleur le long du contour de l'image (fond uni ou dégradé doux). */
  smooth: number;
  /** Part des pixels du bord déjà transparents (photo déjà détourée). */
  transparent: number;
  color: [number, number, number];
  /** Fond uni ou dégradé doux : photo du produit seul, candidate au détourage. */
  plain: boolean;
  /** Fond réellement uni : le détourage de secours par couleur du fond est permis. */
  flat: boolean;
};

/** Couleur du fond et régularité du bord de la photo. */
export async function measureBackground(input: Buffer): Promise<BgStats> {
  const { data, info } = await sharp(input, { failOn: "none" }).rotate().resize(256, 256, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const b = Math.max(2, Math.round(Math.min(w, h) * 0.03));
  const band: number[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < b || y < b || x >= w - b || y >= h - b) band.push((y * w + x) * 4);
  const transparent = band.filter((i) => data[i + 3] < 16).length / band.length;
  const opaque = band.filter((i) => data[i + 3] >= 16);
  const med = (k: number) => {
    const v = opaque.map((i) => data[i + k]).sort((a, c) => a - c);
    return v.length ? v[v.length >> 1] : 255;
  };
  const color: [number, number, number] = [med(0), med(1), med(2)];
  const near = (i: number, c: number[], tol: number) => Math.abs(data[i] - c[0]) <= tol && Math.abs(data[i + 1] - c[1]) <= tol && Math.abs(data[i + 2] - c[2]) <= tol;
  const uniform = opaque.length ? opaque.filter((i) => near(i, color, 18)).length / opaque.length : 1;
  // Contour de l'image parcouru dans l'ordre : un dégradé avance par petits pas, un décor saute.
  const ring: number[] = [];
  for (let x = 0; x < w; x++) ring.push(x * 4);
  for (let y = 1; y < h; y++) ring.push((y * w + w - 1) * 4);
  for (let x = w - 2; x >= 0; x--) ring.push(((h - 1) * w + x) * 4);
  for (let y = h - 2; y > 0; y--) ring.push(y * w * 4);
  let calm = 0;
  for (let k = 1; k < ring.length; k++) {
    const i = ring[k], j = ring[k - 1];
    if (Math.max(Math.abs(data[i] - data[j]), Math.abs(data[i + 1] - data[j + 1]), Math.abs(data[i + 2] - data[j + 2])) <= 6) calm++;
  }
  const smooth = calm / Math.max(1, ring.length - 1);
  const plain = transparent >= 0.9 || uniform >= 0.85 || (smooth >= 0.93 && uniform >= 0.45);
  const flat = transparent >= 0.9 || (uniform >= 0.97 && smooth >= 0.95);
  return { uniform: round(uniform), smooth: round(smooth), transparent: round(transparent), color, plain, flat };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export type HoleStats = { area: number; match: number };

/**
 * Trous intérieurs d'un masque (zones transparentes qui ne touchent pas le bord de l'image) : surface et part
 * de leurs pixels d'origine identiques au fond (à `tol` près par canal). `rgb` : pixels d'origine, 3 canaux.
 */
export function interiorHoles(alpha: Uint8Array | Buffer, stride: number, rgb: Buffer, w: number, h: number, tol = 12): { holes: (HoleStats & { pixels: number[] })[]; bg: [number, number, number]; outside: Uint8Array } {
  const N = w * h;
  const transparent = (p: number) => alpha[p * stride + (stride - 1)] < 128;
  const outside = new Uint8Array(N);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop()!;
    if (outside[p] || !transparent(p)) continue;
    outside[p] = 1;
    const x = p % w;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (p >= w) stack.push(p - w);
    if (p < N - w) stack.push(p + w);
  }
  // Couleur du fond : médiane des pixels du fond qui bordent le produit (au plus près des trous possibles).
  const ring: number[] = [];
  for (let p = 0; p < N; p++) {
    if (!outside[p]) continue;
    const x = p % w;
    if ((x > 0 && !outside[p - 1] && !transparent(p - 1)) || (x < w - 1 && !outside[p + 1] && !transparent(p + 1)) || (p >= w && !outside[p - w] && !transparent(p - w)) || (p < N - w && !outside[p + w] && !transparent(p + w))) ring.push(p);
  }
  const src = ring.length >= 20 ? ring : Array.from(outside.keys()).filter((p) => outside[p]);
  const med = (k: number) => {
    const v = src.map((p) => rgb[p * 3 + k]).sort((a, c) => a - c);
    return v.length ? v[v.length >> 1] : 255;
  };
  const bg: [number, number, number] = [med(0), med(1), med(2)];
  const seen = new Uint8Array(N);
  const holes: (HoleStats & { pixels: number[] })[] = [];
  for (let start = 0; start < N; start++) {
    if (seen[start] || outside[start] || !transparent(start)) continue;
    const comp: number[] = [];
    const st = [start];
    let same = 0;
    while (st.length) {
      const p = st.pop()!;
      if (seen[p] || outside[p] || !transparent(p)) continue;
      seen[p] = 1;
      comp.push(p);
      if (Math.abs(rgb[p * 3] - bg[0]) <= tol && Math.abs(rgb[p * 3 + 1] - bg[1]) <= tol && Math.abs(rgb[p * 3 + 2] - bg[2]) <= tol) same++;
      const x = p % w;
      if (x > 0) st.push(p - 1);
      if (x < w - 1) st.push(p + 1);
      if (p >= w) st.push(p - w);
      if (p < N - w) st.push(p + w);
    }
    holes.push({ area: comp.length, match: same / comp.length, pixels: comp });
  }
  return { holes, bg, outside };
}

/**
 * Un trou intérieur est un vrai « jour » (anse d'une tasse, centre d'un anneau) seulement s'il montre le fond à
 * l'identique : au moins 80 % de ses pixels à moins de 12 du fond par canal ; un très grand trou (≥ 15 % de la
 * silhouette du produit) doit correspondre au fond presque partout (95 %).
 */
export function isTrueGap(hole: HoleStats, silhouette: number): boolean {
  const big = hole.area >= 0.15 * Math.max(1, silhouette);
  return hole.match >= (big ? 0.95 : 0.8);
}

export type LocalCheck = {
  ok: boolean;
  reasons: CutoutReason[];
  /** Note indicative sur 10. */
  score: number;
  metrics: { coverage: number; fragments: number; smallPieces: number; specks: number; strayShare: number; edgeShare: number; sidesTouched: number; uncertain: number; holeShare: number };
};

/**
 * Contrôle local d'un détourage, sur son masque replacé dans le cadre de la photo d'origine.
 * `cut` est le PNG recadré ; `bbox`/`sourceW`/`sourceH` situent ce recadrage dans la photo.
 * `original` (facultatif) permet de vérifier qu'un trou au milieu du produit montre vraiment le fond.
 */
export async function checkCutoutLocal(cut: { png: Buffer; bbox: { x: number; y: number; w: number; h: number }; sourceW: number; sourceH: number }, original?: Buffer): Promise<LocalCheck> {
  const S = 384 / Math.max(cut.sourceW, cut.sourceH);
  const W = Math.max(8, Math.round(cut.sourceW * S));
  const H = Math.max(8, Math.round(cut.sourceH * S));
  const left = Math.min(W - 1, Math.round(cut.bbox.x * S));
  const top = Math.min(H - 1, Math.round(cut.bbox.y * S));
  const cw = Math.max(1, Math.min(W - left, Math.round(cut.bbox.w * S)));
  const ch = Math.max(1, Math.min(H - top, Math.round(cut.bbox.h * S)));
  const placed = await sharp(cut.png).ensureAlpha().resize(cw, ch, { fit: "fill" }).png().toBuffer();
  const { data } = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: placed, left, top }])
    .raw()
    .toBuffer({ resolveWithObject: true });
  const N = W * H;
  const a = (p: number) => data[p * 4 + 3];
  let opaque = 0, soft = 0;
  for (let p = 0; p < N; p++) {
    const v = a(p);
    if (v >= 128) opaque++;
    if (v > 24 && v < 200) soft++;
  }
  const reasons: CutoutReason[] = [];
  const coverage = opaque / N;
  // Composantes opaques : la plus grande est le produit ; les autres, significatives, sont des morceaux épars.
  const seen = new Uint8Array(N);
  const sizes: number[] = [];
  for (let s = 0; s < N; s++) {
    if (seen[s] || a(s) < 128) continue;
    let n = 0;
    const st = [s];
    while (st.length) {
      const p = st.pop()!;
      if (seen[p] || a(p) < 128) continue;
      seen[p] = 1;
      n++;
      const x = p % W;
      if (x > 0) st.push(p - 1);
      if (x < W - 1) st.push(p + 1);
      if (p >= W) st.push(p - W);
      if (p < N - W) st.push(p + W);
    }
    sizes.push(n);
  }
  sizes.sort((x, y) => y - x);
  const minPiece = Math.max(6, N * 0.0012);
  const pieces = sizes.slice(1).filter((n) => n >= minPiece);
  // Petits morceaux à côté du produit (personnes au loin, pastilles, lettres) : un lot de produits semblables
  // (deux gants, trois canettes) donne au contraire des morceaux de taille comparable.
  const small = pieces.filter((n) => n < sizes[0] * 0.25).length;
  // Poussière de petits morceaux (lettres d'un texte, taches de décor) : trop nombreux pour être des détails du produit.
  const specks = sizes.slice(1).filter((n) => n >= Math.max(4, N * 0.0002)).length;
  const strayShare = opaque ? sizes.slice(1).reduce((s, n) => s + n, 0) / opaque : 0;
  // Contact avec les bords de l'image (produit coupé par le cadre, bras ou cou d'une personne).
  const side = (len: number, at: (i: number) => number) => {
    let n = 0;
    for (let i = 0; i < len; i++) if (a(at(i)) >= 128) n++;
    return n / len;
  };
  const sides = [side(W, (i) => i), side(W, (i) => (H - 1) * W + i), side(H, (i) => i * W), side(H, (i) => i * W + W - 1)];
  const edgeShare = (sides[0] * W + sides[1] * W + sides[2] * H + sides[3] * H) / (2 * (W + H));
  const sidesTouched = sides.filter((f) => f > 0.12).length;
  const uncertain = opaque ? soft / opaque : 1;
  // Trous au milieu du produit qui ne montrent pas le fond.
  let holeShare = 0;
  if (original && opaque) {
    const rgb = await sharp(original, { failOn: "none" }).rotate().resize(W, H, { fit: "fill" }).removeAlpha().raw().toBuffer();
    const { holes } = interiorHoles(data, 4, rgb, W, H);
    const silhouette = opaque + holes.reduce((s, x) => s + x.area, 0);
    holeShare = holes.filter((x) => !isTrueGap(x, silhouette)).reduce((s, x) => s + x.area, 0) / silhouette;
  }
  if (!opaque) reasons.push("empty");
  else if (coverage < 0.03) reasons.push("too_small");
  if (coverage > 0.92) reasons.push("too_large");
  if (pieces.length >= 6 || small >= 2 || specks >= 12 || (pieces.length >= 3 && strayShare > 0.3)) reasons.push("fragments");
  if (edgeShare > 0.18 || sidesTouched >= 2) reasons.push("cut_by_frame");
  if (uncertain > 0.3) reasons.push("ragged");
  if (holeShare > 0.04) reasons.push("hole");
  const score = Math.max(0, Math.min(10, Math.round((10 - reasons.length * 4 - Math.min(2, pieces.length * 0.4) - Math.min(2, edgeShare * 10) - Math.min(2, uncertain * 5)) * 10) / 10));
  return {
    ok: reasons.length === 0,
    reasons,
    score,
    metrics: { coverage: round(coverage), fragments: pieces.length, smallPieces: small, specks, strayShare: round(strayShare), edgeShare: round(edgeShare), sidesTouched, uncertain: round(uncertain), holeShare: round(holeShare) },
  };
}

/** Détourage posé sur fond blanc et sur fond sombre (contrôle visuel : restes de fond, bords, trous). */
export async function cutoutPreviews(png: Buffer, size = 768): Promise<{ white: Buffer; dark: Buffer }> {
  const fit = await sharp(png).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const on = (bg: { r: number; g: number; b: number }) => sharp({ create: { width: size, height: size, channels: 3, background: bg } }).composite([{ input: fit }]).jpeg({ quality: 88 }).toBuffer();
  return { white: await on({ r: 255, g: 255, b: 255 }), dark: await on({ r: 24, g: 26, b: 32 }) };
}
