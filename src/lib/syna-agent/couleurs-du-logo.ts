/**
 * LE LOGO D'ABORD : LES COULEURS TIRÉES DU LOGO (méthode des graphistes, 24 novembre 2026, plan accepté par le chef
 * d'orchestre). Le logo fini est fait avant la direction artistique ; ses couleurs deviennent celles de la marque.
 *
 * Par le code, gratuit, à partir du logo DÉTOURÉ (fond retiré par le Studio) : 4 groupes de couleurs au plus, le
 * presque-blanc écarté.
 *  - foncé : la couleur la plus sombre qui se lit sur blanc (contraste ≥ 4,5) ;
 *  - marque : la couleur vive la plus présente ;
 *  - accent : une deuxième teinte vraiment différente, sinon la couleur de marque ;
 *  - surface et clair : des teintes claires de la marque, ou le blanc pur ;
 *  - un logo d'une seule couleur : son encre plus des neutres.
 * Ces couleurs sont imposées à l'étape direction, et le code les remet si le modèle les change (`remettreLesCouleursDuLogo`).
 * Les corrections de contraste du Studio passent après, comme avant. Les couleurs du client ne vont JAMAIS au
 * dessinateur (ni recherche, ni finalisation) : elles n'entrent dans rien de ce fichier.
 */
import sharp from "sharp";
import { contrast, hexToRgb, hsl, hslToHex, mix, rgbToHex, sameColor, type RGB } from "../color";

export type PaletteDuLogo = { dark: string; primary: string; secondary: string; accent: string; light: string };
export type CouleursDuLogo = { palette: PaletteDuLogo; groupes: { hex: string; part: number }[]; uneSeuleCouleur: boolean };

/** Presque-blanc : écarté (le fond, les reflets). */
const presqueBlanc = ([r, g, b]: RGB) => Math.min(r, g, b) >= 232 && Math.max(r, g, b) - Math.min(r, g, b) <= 18;
const dist2 = (a: RGB, b: RGB) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
/** Une couleur « vive » : assez saturée et ni trop sombre ni trop claire. */
const vive = (hex: string) => { const [, s, l] = hsl(hex); return s >= 0.28 && l >= 0.18 && l <= 0.82; };
/** Écart de teinte en degrés (0 à 180). */
const ecartDeTeinte = (a: string, b: string) => { const d = Math.abs(hsl(a)[0] - hsl(b)[0]) % 360; return d > 180 ? 360 - d : d; };
/** Deux couleurs vraiment différentes : une autre teinte (30° au moins) entre deux couleurs vives, ou très éloignées. */
const vraimentDifferentes = (a: string, b: string) => (vive(a) && vive(b) ? ecartDeTeinte(a, b) >= 30 : dist2(hexToRgb(a), hexToRgb(b)) >= 110 ** 2);

/** Les groupes de couleurs d'un logo détouré (k-moyennes, 4 au plus), du plus présent au moins présent. */
export async function groupesDeCouleurs(png: Buffer, max = 4): Promise<{ hex: string; part: number }[]> {
  const { data, info } = await sharp(png).ensureAlpha().resize(256, 256, { fit: "inside", withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true });
  const px: RGB[] = [];
  for (let i = 0; i < info.width * info.height; i++) {
    if (data[i * 4 + 3] < 128) continue;
    const c: RGB = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
    if (!presqueBlanc(c)) px.push(c);
  }
  if (!px.length) return [];
  // Départ : la couleur la plus présente, puis chaque fois la plus éloignée des centres déjà pris.
  const centres: RGB[] = [px[0]];
  while (centres.length < max) {
    let best = -1, bestD = 0;
    for (let i = 0; i < px.length; i += 7) { const d = Math.min(...centres.map((c) => dist2(c, px[i]))); if (d > bestD) { bestD = d; best = i; } }
    if (best < 0 || bestD < 40 ** 2) break;
    centres.push(px[best]);
  }
  let groupes = centres.map(() => ({ sum: [0, 0, 0], n: 0 }));
  for (let it = 0; it < 8; it++) {
    groupes = centres.map(() => ({ sum: [0, 0, 0], n: 0 }));
    for (const p of px) {
      let k = 0, kd = Infinity;
      for (let j = 0; j < centres.length; j++) { const d = dist2(centres[j], p); if (d < kd) { kd = d; k = j; } }
      const g = groupes[k]; g.sum[0] += p[0]; g.sum[1] += p[1]; g.sum[2] += p[2]; g.n++;
    }
    groupes.forEach((g, j) => { if (g.n) centres[j] = [g.sum[0] / g.n, g.sum[1] / g.n, g.sum[2] / g.n]; });
  }
  const out = centres.map((c, j) => ({ hex: rgbToHex(c), part: groupes[j].n / px.length })).filter((g) => g.part >= 0.02).sort((a, b) => b.part - a.part);
  // Deux groupes de la même couleur (un dégradé coupé en deux) : réunis.
  const reunis: { hex: string; part: number }[] = [];
  for (const g of out) { const m = reunis.find((r) => dist2(hexToRgb(r.hex), hexToRgb(g.hex)) < 28 ** 2); if (m) m.part += g.part; else reunis.push({ ...g }); }
  return reunis;
}

/** Une teinte claire de la couleur de marque (un fond de page doux), ou le blanc pur quand la marque est un gris. */
const teinteClaire = (hex: string, t: number) => (hsl(hex)[1] < 0.12 ? "#FFFFFF" : mix(hex, "#FFFFFF", t));

/** La palette de la marque tirée des groupes de couleurs du logo. */
export function paletteDesGroupes(groupes: { hex: string; part: number }[]): CouleursDuLogo {
  if (!groupes.length) return { palette: { dark: "#1A1A1A", primary: "#1A1A1A", secondary: "#F4F4F2", accent: "#1A1A1A", light: "#FFFFFF" }, groupes, uneSeuleCouleur: true };
  const parClarte = [...groupes].sort((a, b) => hsl(a.hex)[2] - hsl(b.hex)[2]);
  const lisible = parClarte.find((g) => contrast(g.hex, "#FFFFFF") >= 4.5)?.hex;
  // Aucune encre assez sombre : la plus sombre du logo, assombrie jusqu'à se lire sur blanc.
  const foncee = lisible ?? (() => { const [h, s] = hsl(parClarte[0].hex); for (let l = hsl(parClarte[0].hex)[2]; l > 0; l -= 0.04) { const c = hslToHex(h, s, l); if (contrast(c, "#FFFFFF") >= 4.5) return c; } return "#1A1A1A"; })();
  const differents = groupes.filter((g, i) => groupes.findIndex((x) => sameColor(x.hex, g.hex)) === i);
  if (differents.length === 1) {
    const encre = differents[0].hex;
    return { palette: { dark: foncee, primary: encre, secondary: "#F4F4F2", accent: encre, light: "#FFFFFF" }, groupes, uneSeuleCouleur: true };
  }
  const marque = groupes.find((g) => vive(g.hex))?.hex ?? groupes.find((g) => g.hex !== foncee)?.hex ?? groupes[0].hex;
  const accent = groupes.find((g) => g.hex !== marque && vraimentDifferentes(g.hex, marque) && !sameColor(g.hex, foncee))?.hex ?? marque;
  return { palette: { dark: foncee, primary: marque, secondary: teinteClaire(marque, 0.86), accent, light: teinteClaire(marque, 0.95) }, groupes, uneSeuleCouleur: false };
}

/** Les couleurs d'un logo détouré. */
export async function couleursDuLogo(pngDetoure: Buffer): Promise<CouleursDuLogo> {
  return paletteDesGroupes(await groupesDeCouleurs(pngDetoure));
}

/**
 * La palette rendue par la direction artistique, avec les couleurs du logo remises là où le modèle les a changées (le
 * logo l'emporte, décision du chef d'orchestre du 24 novembre 2026). `changes` : ce qui a été remis (dit dans les notes).
 */
export function remettreLesCouleursDuLogo<P extends PaletteDuLogo>(palette: P, logo: PaletteDuLogo): { palette: P; changes: string[] } {
  const changes: string[] = [];
  const out = { ...palette };
  for (const k of ["dark", "primary", "secondary", "accent", "light"] as const) {
    if (!sameColor(out[k], logo[k])) { changes.push(`${k} ${out[k]} remis à ${logo[k]} (couleur du logo)`); out[k] = logo[k] as P[typeof k]; }
  }
  return { palette: out, changes };
}

/** La ligne donnée à la direction artistique : les couleurs du logo, imposées. */
export const ligneDesCouleursDuLogo = (p: PaletteDuLogo) =>
  `Couleurs de la marque, tirées de son logo et IMPOSÉES (ne les change pas) : foncé ${p.dark}, couleur de marque ${p.primary}, surface ${p.secondary}, accent ${p.accent}, clair ${p.light}.`;

/** Deux identités d'une série avec la même police de titres (interdit) : les clés en double, sinon rien. */
export function memePoliceDeTitres(list: { key: string; fonts: { heading: string } }[]): string[] {
  const vu = new Map<string, string>(), doubles: string[] = [];
  for (const x of list) { const h = x.fonts.heading.replace(/_[ni]\d$/, ""); if (vu.has(h)) doubles.push(x.key); else vu.set(h, x.key); }
  return doubles;
}
