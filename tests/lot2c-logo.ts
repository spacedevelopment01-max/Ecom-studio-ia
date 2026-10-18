/** Vectorisation des lettrages FRAISE / ONDE (PNG transparents du kit) en vrais SVG : tracé par couleur,
 * versions couleur, monochrome, inverse (fond sombre) et favicon, sans image matricielle encodée.
 * Les logos sont des propositions montrées à Thomas, pas des marques validées : rien n'est figé dans le dépôt,
 * tout est produit à partir du kit au moment de la composition. */
import sharp from "sharp";
// @ts-expect-error — module sans types
import ImageTracer from "imagetracerjs";

export type LogoColor = { name: string; hex: string };
export type VectorLogo = { color: string; mono: string; inverse: string; favicon: string; faviconPng: Buffer; width: number; height: number; colors: LogoColor[]; coverage: number };

const hex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const dist = (a: number[], b: number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

/** Trace un masque noir sur blanc (RGBA) et renvoie les tracés des zones noires. */
function tracePaths(data: Uint8Array | Buffer, width: number, height: number): string {
  const svg: string = ImageTracer.imagedataToSVG({ width, height, data }, { numberofcolors: 2, colorsampling: 0, pal: [{ r: 0, g: 0, b: 0, a: 255 }, { r: 255, g: 255, b: 255, a: 255 }], ltres: 0.6, qtres: 0.6, pathomit: 10, roundcoords: 1, blurradius: 0, viewbox: true, desc: false });
  return [...svg.matchAll(/<path fill="rgb\(0,0,0\)"[^>]*\sd="([^"]+)"/g)].map((m) => m[1].trim()).join(" ").replace(/\s+/g, " ");
}

/**
 * @param png     logo PNG transparent
 * @param palette couleurs attendues (nom + hex) : chaque pixel opaque rejoint la plus proche
 * @param faviconBox zone du symbole à isoler pour le favicon, en fractions [x0,y0,x1,y1] du logo recadré
 */
export async function vectorizeLogo(png: Buffer, palette: LogoColor[], faviconBox: [number, number, number, number]): Promise<VectorLogo> {
  const trimmed = await sharp(png).ensureAlpha().trim({ threshold: 8 }).toBuffer();
  const { data, info } = await sharp(trimmed).resize({ width: 1600, withoutEnlargement: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, n = W * H;
  const targets = palette.map((c) => [parseInt(c.hex.slice(1, 3), 16), parseInt(c.hex.slice(3, 5), 16), parseInt(c.hex.slice(5, 7), 16)]);
  const masks = palette.map(() => Buffer.alloc(n * 4, 255)), all = Buffer.alloc(n * 4, 255);
  const sums = palette.map(() => [0, 0, 0, 0]);
  let opaque = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4, a = data[o + 3];
    if (a < 110) continue;
    opaque++;
    const px = [data[o], data[o + 1], data[o + 2]];
    let best = 0, bd = Infinity;
    targets.forEach((t, k) => { const d = dist(px, t); if (d < bd) { bd = d; best = k; } });
    masks[best][o] = masks[best][o + 1] = masks[best][o + 2] = 0;
    all[o] = all[o + 1] = all[o + 2] = 0;
    const s = sums[best]; s[0] += px[0]; s[1] += px[1]; s[2] += px[2]; s[3]++;
  }
  // Teintes réellement mesurées (moyenne des pixels de chaque couche) : le SVG reprend la couleur du PNG, pas une valeur devinée.
  const colors = palette.map((c, k) => ({ name: c.name, hex: sums[k][3] ? hex(sums[k][0] / sums[k][3], sums[k][1] / sums[k][3], sums[k][2] / sums[k][3]) : c.hex }));
  const layers = masks.map((m) => tracePaths(m, W, H)).map((d, k) => ({ d, color: colors[k].hex })).filter((l) => l.d);
  const union = tracePaths(all, W, H);
  const body = (fills: (k: number) => string) => layers.map((l, k) => `<path fill="${fills(k)}" fill-rule="evenodd" d="${l.d}"/>`).join("");
  const wrap = (inner: string, vb = `0 0 ${W} ${H}`, extra = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${extra}>${inner}</svg>`;
  const color = wrap(body((k) => layers[k].color));
  const mono = wrap(`<path fill="currentColor" fill-rule="evenodd" d="${union}"/>`);
  const inverse = wrap(`<path fill="#ffffff" fill-rule="evenodd" d="${union}"/>`);
  // Favicon : le symbole seul, recadré sur la zone indiquée puis mis au carré avec une marge de protection.
  const [fx0, fy0, fx1, fy1] = faviconBox;
  const bx = Math.round(fx0 * W), by = Math.round(fy0 * H), bw = Math.round((fx1 - fx0) * W), bh = Math.round((fy1 - fy0) * H);
  const side = Math.max(bw, bh), pad = Math.round(side * 0.12);
  const vx = bx - Math.round((side - bw) / 2) - pad, vy = by - Math.round((side - bh) / 2) - pad, vs = side + pad * 2;
  const favicon = wrap(`<clipPath id="c"><rect x="${bx}" y="${by}" width="${bw}" height="${bh}"/></clipPath><g clip-path="url(#c)">${body((k) => layers[k].color)}</g>`, `${vx} ${vy} ${vs} ${vs}`);
  const faviconPng = await sharp(Buffer.from(favicon)).resize(180, 180).png().toBuffer();
  return { color, mono, inverse, favicon, faviconPng, width: W, height: H, colors, coverage: opaque / n };
}
