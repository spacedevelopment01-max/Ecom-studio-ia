/**
 * Retouche LOCALISÉE d'une image de maquette (demande du propriétaire du 8 novembre, sur l'accueil téléphone de
 * Brindi : « pourquoi ça change tout le thème ? Je veux cette maquette avec le journal corrigé et sans le bouton tout
 * en haut ; on ne doit pas refaire les maquettes autant de fois, attention à modifier que les détails demandés »).
 *
 * 1) Un modèle de lecture rapide repère chaque zone demandée sur l'image (en % de la largeur et de la hauteur) et lit
 *    ses textes ; 2) le modèle des maquettes reçoit l'image et la demande, zones situées (sans masque : essai réel, il
 *    voyait les zones masquées comme des rectangles noirs) ; 3) le Studio recolle ces seules zones sur l'image
 *    d'origine : tout le reste reste identique au pixel près. Une zone rendue noire ou vide est refusée.
 */
import sharp from "sharp";
import { z } from "zod";
import { jsonCallMaxMicro, type LlmCall } from "../../ai/llm";
import { CHECK_MODEL } from "./check";

export type EditChange = { zone: string; change: string };
export type Box = { left: number; top: number; right: number; bottom: number };

export const LocateSchema = z.object({
  zones: z.array(z.object({
    n: z.number().int().min(1).max(8),
    found: z.boolean(),
    /** Bords de la zone en pourcentage de la largeur (left, right) et de la hauteur (top, bottom) de l'image. */
    left: z.number().min(0).max(100), top: z.number().min(0).max(100), right: z.number().min(0).max(100), bottom: z.number().min(0).max(100),
    /** Textes lisibles dans la zone, mot pour mot. */
    texts: z.array(z.string().max(200)).max(20),
  })).max(8),
}).strict();
export type Locate = z.infer<typeof LocateSchema>;

const LOCATE_OUTPUT_TOKENS = 2000;
export function locateMaxMicro(): number {
  return jsonCallMaxMicro(CHECK_MODEL.provider, CHECK_MODEL.model, 6000, LOCATE_OUTPUT_TOKENS, LOCATE_OUTPUT_TOKENS, CHECK_MODEL.effort)?.maxMicro ?? 20_000;
}

export function locateCall(base: Pick<LlmCall, "userId" | "projectId" | "jobId" | "usageKey">, image: Buffer, changes: EditChange[]): LlmCall {
  return {
    ...base, task: "quality_control", promptKey: "syna-mockup-locate-1",
    system: "Tu repères des zones sur une image de maquette de site web, avec précision, et tu lis leurs textes mot pour mot. Tu réponds en JSON.",
    prompt: [
      "Pour chaque zone ci-dessous, donne le rectangle qui l'entoure ENTIÈREMENT (titre, cartes, boutons et fond de la partie compris, sans déborder sur les parties voisines), en pourcentage : left et right de la largeur de l'image, top et bottom de sa hauteur (0 = bord gauche ou haut, 100 = bord droit ou bas). Si la page est montrée en plusieurs bandes côte à côte, le rectangle reste dans la bande de la zone. found = false si la zone n'existe pas sur l'image.",
      ...changes.map((c, i) => `Zone ${i + 1} : ${c.zone}.`),
      "texts : les textes lisibles dans chaque zone, mot pour mot.",
    ].join("\n"),
    images: [{ data: image, label: "maquette" }],
    maxTokens: LOCATE_OUTPUT_TOKENS, maxOutputTokens: LOCATE_OUTPUT_TOKENS,
    routing: { difficulty: "standard", prefer: CHECK_MODEL },
  } as LlmCall;
}

/** Rectangles en pixels, élargis d'une petite marge (les bords repérés ne sont jamais exacts), dans l'image. */
export function boxesOf(l: Locate, count: number, w: number, h: number, margin = { x: 1, y: 0 }): (Box | null)[] {
  return Array.from({ length: count }, (_, i) => {
    const z = l.zones.find((x) => x.n === i + 1);
    if (!z || !z.found || z.right <= z.left || z.bottom <= z.top) return null;
    const px = (v: number, max: number) => Math.round(Math.min(max, Math.max(0, (v / 100) * max)));
    // Aucune marge en hauteur (essais réels : 1,2 % puis 0,6 % mordaient sur le logo au-dessus et sur le titre de la
    // partie suivante) ; en largeur, la marge tombe sur le fond autour des bandes.
    return { left: px(z.left - margin.x, w), right: px(z.right + margin.x, w), top: px(z.top - margin.y, h), bottom: px(z.bottom + margin.y, h) };
  });
}

/** Masque OpenAI : transparent = à repeindre (les zones), opaque ailleurs. */
export async function editMask(w: number, h: number, boxes: Box[]): Promise<Buffer> {
  const px = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) px[i * 4 + 3] = 255;
  for (const b of boxes) for (let y = b.top; y < b.bottom; y++) for (let x = b.left; x < b.right; x++) px[(y * w + x) * 4 + 3] = 0;
  return sharp(px, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

/** Recolle SEULEMENT les zones retouchées sur l'image d'origine : le reste reste identique au pixel près. */
export async function pasteZones(original: Buffer, edited: Buffer, boxes: Box[]): Promise<Buffer> {
  const meta = await sharp(original).metadata();
  const w = meta.width!, h = meta.height!;
  const ed = await sharp(edited).resize(w, h, { fit: "fill" }).png().toBuffer();
  const parts = await Promise.all(boxes.map(async (b) => ({ input: await sharp(ed).extract({ left: b.left, top: b.top, width: b.right - b.left, height: b.bottom - b.top }).png().toBuffer(), left: b.left, top: b.top })));
  return sharp(original).composite(parts).png().toBuffer();
}

const norm = (t: string) => t.toLocaleLowerCase("fr-FR").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
/** Textes lus dans une zone et présents mot pour mot dans les textes de la page (jamais une lecture approximative). */
export function exactTexts(read: string[], pageTexts: string[]): string[] {
  const all = pageTexts.map(norm);
  return read.map((t) => pageTexts[all.indexOf(norm(t))]).filter((t, i, a): t is string => !!t && a.indexOf(t) === i);
}

const pct = (v: number, max: number) => Math.round((v / max) * 100);
export function mockupEditPrompt(changes: EditChange[], keep: string[][], viewport: "desktop" | "phone", boxes: Box[] = [], size = { w: 1024, h: 1536 }): string {
  return [
    `Retouche d'une maquette de site web (version ${viewport === "phone" ? "téléphone" : "ordinateur"}) : l'image jointe est la maquette à reproduire À L'IDENTIQUE, même cadrage, mêmes bandes, mêmes positions, mêmes textes, mêmes photos, avec SEULEMENT les modifications ci-dessous, chacune à sa place exacte. Chaque partie modifiée garde exactement la même position et la même hauteur ; rien ne se décale, aucune autre partie ne change.`,
    ...changes.map((c, i) => { const b = boxes[i]; return `Modification ${i + 1}, dans ${c.zone}${b ? ` (zone située de ${pct(b.left, size.w)} % à ${pct(b.right, size.w)} % de la largeur de l'image et de ${pct(b.top, size.h)} % à ${pct(b.bottom, size.h)} % de sa hauteur)` : ""} : ${c.change}.${keep[i]?.length ? ` Textes de cette zone, écrits lettre pour lettre (sauf ceux que la modification retire) : ${keep[i].map((t) => `« ${t} »`).join(" ; ")}.` : ""}`; }),
    "Une partie modifiée garde sa hauteur si possible, avec la même marge intérieure qu'avant en haut et en bas ; si un élément ajouté ne tient pas, la partie s'allonge vers le bas et TOUTE la suite de la page descend d'autant, inchangée. Rien ne recouvre la partie voisine.",
    "Dans chaque partie modifiée, le même style que le reste de la page : mêmes couleurs, mêmes polices, mêmes tailles de texte, mêmes arrondis et ombres, mêmes photos quand elles restent. La zone se raccorde sans couture à ce qui l'entoure.",
    viewport === "phone" ? "Mise en page de téléphone : jamais trois éléments côte à côte ; boutons sur toute la largeur." : "",
    "Aucun autre texte, aucune lettre inventée, aucun logo en plus, aucune personne, aucune main.",
  ].filter(Boolean).join("\n");
}

/** Part de pixels presque noirs d'une zone (essai réel : zones rendues en rectangles noirs, jugées « sans défaut »). */
export async function blackShare(image: Buffer, b: Box): Promise<number> {
  const { data, info } = await sharp(image).extract({ left: b.left, top: b.top, width: b.right - b.left, height: b.bottom - b.top }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let n = 0;
  for (let i = 0; i < info.width * info.height; i++) if (data[i * 3] < 10 && data[i * 3 + 1] < 10 && data[i * 3 + 2] < 10) n++;
  return n / (info.width * info.height);
}

/** Textes que la demande RETIRE (« retire le bouton « X » ») : les seuls qui peuvent disparaître d'une zone. */
export function removedTexts(change: string, texts: string[]): string[] {
  const c = norm(change);
  return texts.filter((t) => { const i = c.indexOf(norm(t)); return i >= 0 && /\b(retir|supprim|enl[eè]v|ôt|efface)\w*[^.;]*$/.test(c.slice(0, i)); });
}

/**
 * Textes disparus d'une zone après la retouche (essai réel du 8 novembre : le bouton « Lis le journal » perdu en
 * réorganisant le journal, et le contrôle de mise en page n'avait rien vu) : ceux lus AVANT dans la zone, mot pour mot
 * dans les textes de la page, que la demande ne retire pas, et qu'on ne relit plus APRÈS.
 */
export function missingTexts(changes: EditChange[], before: string[][], after: Locate): string[] {
  return changes.flatMap((c, i) => {
    const expected = before[i].filter((t) => !removedTexts(c.change, [t]).length);
    const read = norm((after.zones.find((z) => z.n === i + 1)?.texts ?? []).join(" | "));
    return expected.filter((t) => !read.includes(norm(t)));
  });
}

/**
 * Bords de zone où le contenu retouché touche le bord (essai réel du 8 novembre : le bouton « Lis le journal » collé
 * au bas de la zone recouvrait le haut du titre « Tes questions »). Pour chaque bord, l'écart moyen entre la
 * retouche et l'original sur la ligne (ou la colonne) du bord : un raccord propre reste faible (≈ 6 mesuré), un
 * élément coupé est fort (≈ 109 mesuré). Renvoie les bords en défaut.
 */
export async function cutEdges(original: Buffer, edited: Buffer, b: Box, threshold = 30): Promise<("haut" | "bas" | "gauche" | "droite")[]> {
  const raw = async (img: Buffer) => sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const [o, e] = await Promise.all([raw(original), raw(edited)]);
  const w = o.info.width;
  const diff = (pts: [number, number][]) => pts.reduce((s, [x, y]) => { const i = (y * w + x) * 3; return s + Math.abs(o.data[i] - e.data[i]) + Math.abs(o.data[i + 1] - e.data[i + 1]) + Math.abs(o.data[i + 2] - e.data[i + 2]); }, 0) / (pts.length * 3);
  const row = (y: number) => Array.from({ length: b.right - b.left }, (_, k) => [b.left + k, y] as [number, number]);
  const col = (x: number) => Array.from({ length: b.bottom - b.top }, (_, k) => [x, b.top + k] as [number, number]);
  const out: ("haut" | "bas" | "gauche" | "droite")[] = [];
  if (diff(row(b.top)) > threshold) out.push("haut");
  if (diff(row(b.bottom - 1)) > threshold) out.push("bas");
  if (diff(col(b.left)) > threshold) out.push("gauche");
  if (diff(col(b.right - 1)) > threshold) out.push("droite");
  return out;
}

type Side = "haut" | "bas" | "gauche" | "droite";
/**
 * Ajuste une zone à la retouche : le repérage s'arrête souvent quelques pixels avant le vrai bord de la partie (essai
 * réel : bas repéré à 932 px, partie finie à 940). Chaque bord où la retouche diffère encore de l'original avance
 * (24 px au plus) tant qu'il ne recouvre que du FOND uni de l'original, jusqu'à un raccord propre (mêmes pixels, ou fond
 * uni des deux côtés) ; s'il bute sur du contenu de l'original (le titre de la partie voisine), le bord est en défaut :
 * recollée, la retouche recouvrirait ou couperait quelque chose.
 */
export async function fitBox(original: Buffer, edited: Buffer, b: Box, opts = { max: 24, threshold: 30, flat: 14 }): Promise<{ box: Box; cut: Side[] }> {
  const raw = async (img: Buffer) => sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const [o, e] = await Promise.all([raw(original), raw(edited)]);
  const W = o.info.width, H = o.info.height;
  const line = (horizontal: boolean, at: number, from: number, to: number) => Array.from({ length: Math.max(0, to - from) }, (_, k) => (horizontal ? [from + k, at] : [at, from + k]) as [number, number]);
  const diff = (pts: [number, number][]) => pts.reduce((s, [x, y]) => { const i = (y * W + x) * 3; return s + Math.abs(o.data[i] - e.data[i]) + Math.abs(o.data[i + 1] - e.data[i + 1]) + Math.abs(o.data[i + 2] - e.data[i + 2]); }, 0) / Math.max(1, pts.length * 3);
  const flat = (pts: [number, number][], img = o) => {
    const lum = pts.map(([x, y]) => { const i = (y * W + x) * 3; return (img.data[i] + img.data[i + 1] + img.data[i + 2]) / 3; });
    const m = lum.reduce((s, v) => s + v, 0) / Math.max(1, lum.length);
    return Math.sqrt(lum.reduce((s, v) => s + (v - m) ** 2, 0) / Math.max(1, lum.length)) < opts.flat;
  };
  const box = { ...b };
  const cut: Side[] = [];
  const grow = (side: Side) => {
    for (let k = 0; ; k++) {
      const edge = side === "haut" ? line(true, box.top, box.left, box.right) : side === "bas" ? line(true, box.bottom - 1, box.left, box.right) : side === "gauche" ? line(false, box.left, box.top, box.bottom) : line(false, box.right - 1, box.top, box.bottom);
      // Raccord propre : même pixels, ou fond uni des deux côtés (une limite nette entre deux fonds, comme entre deux parties).
      if (diff(edge) <= opts.threshold || (flat(edge, e) && flat(edge, o))) return;
      const next = side === "haut" ? box.top - 1 : side === "bas" ? box.bottom : side === "gauche" ? box.left - 1 : box.right;
      const inside = side === "haut" || side === "bas" ? next >= 0 && next < H : next >= 0 && next < W;
      const nextLine = side === "haut" || side === "bas" ? line(true, next, box.left, box.right) : line(false, next, box.top, box.bottom);
      if (k >= opts.max || !inside || !flat(nextLine)) { cut.push(side); return; }
      if (side === "haut") box.top--; else if (side === "bas") box.bottom++; else if (side === "gauche") box.left--; else box.right++;
    }
  };
  (["haut", "bas", "gauche", "droite"] as Side[]).forEach(grow);
  return { box, cut };
}

/**
 * Recolle les zones retouchées sur l'original (essai réel du 8 novembre : en empilant les trois articles du journal,
 * le modèle a dessiné le bouton « Lis le journal » SOUS la zone, coupé au recollage). Pour une zone dont la retouche
 * dépasse en bas : on cherche, plus bas dans la retouche, où reprend la partie suivante de l'original (mêmes pixels sur
 * 24 lignes) ; la partie retouchée prend la hauteur qu'il lui faut et la suite de SA bande descend d'autant, recopiée
 * de l'original au pixel près (l'image s'allonge). Une zone qui dépasse ailleurs, ou dont la suite n'est pas
 * retrouvée, est en défaut (rien n'est recollé pour elle).
 */
export async function composeEdit(original: Buffer, edited: Buffer, boxes: Box[]): Promise<{ image: Buffer; failed: { index: number; sides: string[] }[]; grown: number }> {
  const raw = async (img: Buffer) => sharp(img).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const e = await raw(edited);
  let c = await raw(original);
  const W = c.info.width;
  const failed: { index: number; sides: string[] }[] = [];
  let grown = 0;
  // Du bas vers le haut : allonger une bande ne déplace jamais une zone située plus haut.
  const order = boxes.map((b, i) => ({ b, i })).sort((x, y) => y.b.top - x.b.top);
  for (const { b, i } of order) {
    const cur = await sharp(c.data, { raw: c.info }).png().toBuffer();
    const fit = await fitBox(cur, edited, b);
    const box = fit.box;
    let shift = 0;
    if (fit.cut.length) {
      if (fit.cut.some((s) => s !== "bas")) { failed.push({ index: i, sides: fit.cut }); continue; }
      // Où reprend la suite de l'original dans la retouche ?
      const H = c.info.height, rows = 24, w = box.right - box.left;
      const blockDiff = (d: number) => {
        let s = 0;
        for (let y = 0; y < rows; y++) for (let x = 0; x < w; x++) {
          const io = ((box.bottom + y) * W + box.left + x) * 3, ie = ((box.bottom + d + y) * W + box.left + x) * 3;
          s += Math.abs(c.data[io] - e.data[ie]) + Math.abs(c.data[io + 1] - e.data[ie + 1]) + Math.abs(c.data[io + 2] - e.data[ie + 2]);
        }
        return s / (rows * w * 3);
      };
      let best: { d: number; m: number } | null = null;
      for (let d = 1; d <= 300 && box.bottom + d + rows <= e.info.height && box.bottom + rows <= H; d++) {
        const m = blockDiff(d);
        if (!best || m < best.m) best = { d, m };
        if (m < 12) break;
      }
      if (!best || best.m >= 20) { failed.push({ index: i, sides: ["bas"] }); continue; }
      shift = best.d;
    }
    const H = c.info.height, NH = H + shift;
    const out = Buffer.alloc(W * NH * 3);
    // Fond de la planche (coin bas gauche) pour la hauteur ajoutée hors de la bande.
    const bg = ((H - 2) * W + 2) * 3;
    for (let k = 0; k < W * NH; k++) { out[k * 3] = c.data[bg]; out[k * 3 + 1] = c.data[bg + 1]; out[k * 3 + 2] = c.data[bg + 2]; }
    c.data.copy(out, 0, 0, W * H * 3);
    for (let y = box.top; y < box.bottom + shift; y++) e.data.copy(out, (y * W + box.left) * 3, (y * W + box.left) * 3, (y * W + box.right) * 3);
    if (shift) for (let y = box.bottom; y < H; y++) c.data.copy(out, ((y + shift) * W + box.left) * 3, (y * W + box.left) * 3, (y * W + box.right) * 3);
    c = { data: out, info: { ...c.info, height: NH } };
    grown += shift;
  }
  return { image: await sharp(c.data, { raw: { width: W, height: c.info.height, channels: 3 } }).png().toBuffer(), failed, grown };
}

/** Demande de RETRAIT pur (« retire / supprime / enlève … ») : faite sans IA quand c'est possible (removeBand). */
export const isRemoval = (change: string) => /^\s*(?:retir|supprim|enl[eè]v|efface|ôte)\w*\b/i.test(change) || /\b(?:retirer|supprimer|enlever|effacer|ôter)\s+(?:ce|cette|ces|le|la|les|l')\b/i.test(change);

/**
 * Retrait d'un élément SANS IA (essai réel du 8 novembre : retirer le bandeau « La vraie pause » du contact ; la
 * retouche par l'IA remontait toute la page et a été refusée, payée pour rien). L'élément occupe une bande horizontale
 * de sa colonne : si, sur ces lignes, la colonne ne contient rien d'autre que du fond uni, ces lignes sont retirées et
 * la suite de la colonne remonte d'autant (recopiée au pixel près) ; le bas de la colonne est complété par le fond de
 * la planche. null si ce n'est pas possible proprement (autre contenu sur ces lignes).
 */
export async function removeBand(image: Buffer, b: Box): Promise<Buffer | null> {
  const { data, info } = await sharp(image).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const px = (x: number, y: number) => { const i = (y * W + x) * 3; return [data[i], data[i + 1], data[i + 2]]; };
  const same = (a: number[], c: number[], tol = 14) => Math.abs(a[0] - c[0]) <= tol && Math.abs(a[1] - c[1]) <= tol && Math.abs(a[2] - c[2]) <= tol;
  const page = px(2, H - 2);
  // Bords de la colonne : on s'écarte de la zone tant qu'on n'atteint pas le fond de la planche sur toutes ses lignes.
  const isPage = (x: number) => { for (let y = b.top; y < b.bottom; y++) if (!same(px(x, y), page)) return false; return true; };
  let left = b.left, right = b.right;
  while (left > 0 && !isPage(left - 1)) left--;
  while (right < W && !isPage(right)) right++;
  // Hors de la zone, sur ces lignes, la colonne ne doit contenir que du fond uni (celui des pixels juste au-dessus).
  // (bords de colonne adoucis tolérés : au plus 4 % de pixels écartés de la couleur médiane de la ligne).
  for (let y = b.top; y < b.bottom; y++) {
    const outside: number[][] = [];
    for (let x = left; x < right; x++) if (x < b.left || x >= b.right) outside.push(px(x, y));
    if (!outside.length) continue;
    const med = [0, 1, 2].map((c) => outside.map((p) => p[c]).sort((u, v) => u - v)[outside.length >> 1]);
    if (outside.filter((p) => !same(p, med)).length > Math.max(1, outside.length * 0.04)) return null;
  }
  const h = b.bottom - b.top, out = Buffer.from(data);
  for (let y = b.top; y < H; y++) for (let x = left; x < right; x++) {
    const o = (y * W + x) * 3, src = y + h < H ? ((y + h) * W + x) * 3 : -1;
    if (src >= 0) { out[o] = data[src]; out[o + 1] = data[src + 1]; out[o + 2] = data[src + 2]; } else { out[o] = page[0]; out[o + 1] = page[1]; out[o + 2] = page[2]; }
  }
  return sharp(out, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
}
