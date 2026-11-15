/**
 * Dessins des planches de marque de SINA (retour du propriétaire du 12 novembre 2026, après l'essai réel : « ce que tu
 * as fait toi était mieux […] beaucoup plus d'icônes, d'images »). La directrice artistique DESSINE en code, comme
 * les planches faites à la main : une scène, des objets, des morceaux, des dégradés, des lueurs.
 *
 * Un dessin arrive en SVG écrit par un modèle : il n'est JAMAIS affiché tel quel. Il passe par une liste blanche
 * stricte (formes, groupes, dégradés, découpes, flou) et devient un arbre de données sûr ; l'écran le redessine avec
 * les composants du Studio. Tout le reste est refusé : texte, police, image, lien, style, script, animation,
 * événement, référence extérieure. Un dessin refusé est simplement absent : la planche garde sa forme sans lui.
 */
import { z } from "zod";

export type ArtNode = { t: string; a: Record<string, string>; c?: ArtNode[] };
/** Dessin sûr : cadre [x, y, largeur, hauteur] et arbre de formes. */
export type Art = { box: [number, number, number, number]; nodes: ArtNode[] };

export const MAX_ART_CHARS = 16_000;
export const MAX_ART_NODES = 160;
const MAX_DEPTH = 8;

const num = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const numPct = /^[+-]?(?:\d+\.?\d*|\.\d+)%?$/;
const numList = /^[\d\s,.+\-eE]+$/;
const pathData = /^[MmLlHhVvCcSsQqTtAaZz0-9eE+\-.,\s]+$/;
const idName = /^[A-Za-z][\w-]{0,31}$/;
const hexColor = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const ref = /^url\(#([A-Za-z][\w-]{0,31})\)$/;
const transform = /^(?:\s*(?:translate|rotate|scale|skewX|skewY|matrix)\(\s*[\d\s,.+\-eE]+\))+\s*$/;
const NAMED: Record<string, string> = { white: "#FFFFFF", black: "#000000", transparent: "none" };

type Check = (v: string) => string | null;
const isNum: Check = (v) => (num.test(v) && Math.abs(Number(v)) < 1e5 ? v : null);
const isNumPct: Check = (v) => (numPct.test(v) ? v : null);
const unit: Check = (v) => (num.test(v) && Number(v) >= 0 && Number(v) <= 1 ? v : numPct.test(v) && v.endsWith("%") ? v : null);
const paint: Check = (v) => { const s = NAMED[v.toLowerCase()] ?? v; return s === "none" || s === "currentColor" || hexColor.test(s) || ref.test(s) ? s : null; };
const oneOf = (...list: string[]): Check => (v) => (list.includes(v) ? v : null);
const PAINT: Record<string, Check> = {
  fill: paint, stroke: paint, "stroke-width": isNum, "stroke-linecap": oneOf("butt", "round", "square"), "stroke-linejoin": oneOf("miter", "round", "bevel"),
  "stroke-dasharray": (v) => (numList.test(v) ? v : null), opacity: unit, "fill-opacity": unit, "stroke-opacity": unit, "fill-rule": oneOf("nonzero", "evenodd"), "clip-rule": oneOf("nonzero", "evenodd"),
  transform: (v) => (transform.test(v) ? v.trim() : null), "clip-path": (v) => (ref.test(v) ? v : null), filter: (v) => (ref.test(v) ? v : null),
};
const GRAD: Record<string, Check> = { id: (v) => (idName.test(v) ? v : null), gradientUnits: oneOf("userSpaceOnUse", "objectBoundingBox"), gradientTransform: (v) => (transform.test(v) ? v.trim() : null), spreadMethod: oneOf("pad", "reflect", "repeat") };
/** Liste blanche : chaque balise permise et, pour chacune, ses attributs permis avec leur contrôle. */
const TAGS: Record<string, Record<string, Check>> = {
  g: PAINT,
  path: { ...PAINT, d: (v) => (pathData.test(v) && v.length <= 4000 ? v.trim() : null) },
  circle: { ...PAINT, cx: isNum, cy: isNum, r: isNum },
  ellipse: { ...PAINT, cx: isNum, cy: isNum, rx: isNum, ry: isNum },
  rect: { ...PAINT, x: isNum, y: isNum, width: isNum, height: isNum, rx: isNum, ry: isNum },
  line: { ...PAINT, x1: isNum, y1: isNum, x2: isNum, y2: isNum },
  polygon: { ...PAINT, points: (v) => (numList.test(v) ? v.trim() : null) },
  polyline: { ...PAINT, points: (v) => (numList.test(v) ? v.trim() : null) },
  defs: {},
  linearGradient: { ...GRAD, x1: isNumPct, y1: isNumPct, x2: isNumPct, y2: isNumPct },
  radialGradient: { ...GRAD, cx: isNumPct, cy: isNumPct, r: isNumPct, fx: isNumPct, fy: isNumPct },
  stop: { offset: unit, "stop-color": (v) => { const s = NAMED[v.toLowerCase()] ?? v; return hexColor.test(s) ? s : null; }, "stop-opacity": unit },
  clipPath: { id: (v) => (idName.test(v) ? v : null) },
  filter: { id: (v) => (idName.test(v) ? v : null), x: isNumPct, y: isNumPct, width: isNumPct, height: isNumPct },
  feGaussianBlur: { stdDeviation: (v) => (/^\d+\.?\d*(?:\s+\d+\.?\d*)?$/.test(v) ? v : null) },
};
/** Où chaque balise a le droit de se trouver (une découpe ne contient que des formes, un dégradé que ses arrêts…). */
const SHAPES = ["path", "circle", "ellipse", "rect", "line", "polygon", "polyline"];
const CHILDREN: Record<string, string[]> = {
  svg: ["g", "defs", ...SHAPES], g: ["g", ...SHAPES], defs: ["linearGradient", "radialGradient", "clipPath", "filter"],
  linearGradient: ["stop"], radialGradient: ["stop"], clipPath: SHAPES, filter: ["feGaussianBlur"],
};
/** Attributs sans effet qu'un modèle écrit par habitude : retirés sans refuser le dessin. */
const IGNORED = new Set(["xmlns", "xmlns:xlink", "version", "role", "aria-label", "aria-hidden", "width", "height", "preserveAspectRatio", "focusable"]);

export type ArtResult = { ok: true; art: Art } | { ok: false; reason: string };

/** Contrôle d'une balise et de ses attributs (liste blanche) ; rend ses attributs nettoyés, ou la raison du refus. */
function cleanAttrs(tag: string, raw: Record<string, string>): Record<string, string> | string {
  const allowed = TAGS[tag], out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (tag === "svg" && IGNORED.has(k)) continue;
    const check = allowed[k];
    if (!check) return `attribut « ${k} » interdit sur <${tag}>`;
    const clean = check(String(v).trim());
    if (clean == null) return `valeur refusée pour « ${k} » sur <${tag}>`;
    out[k] = clean;
  }
  return out;
}

/** Les références internes (dégradé, découpe, flou) pointent toutes vers un élément défini dans le dessin. */
function refsOk(nodes: ArtNode[]): boolean {
  const ids = new Set<string>(), used: string[] = [];
  const walk = (n: ArtNode) => { if (n.a.id) ids.add(n.a.id); for (const v of Object.values(n.a)) { const m = ref.exec(v); if (m) used.push(m[1]); } n.c?.forEach(walk); };
  nodes.forEach(walk);
  return used.every((u) => ids.has(u));
}

/**
 * Dessin SVG écrit par un modèle → dessin sûr. Refusé en entier au moindre écart (jamais « réparé » en devinant) :
 * balise ou attribut hors liste, texte, style, lien, événement, référence qui ne mène nulle part, dessin trop lourd.
 */
export function sanitizeArt(input: string): ArtResult {
  const no = (reason: string): ArtResult => ({ ok: false, reason });
  if (typeof input !== "string" || !input.trim()) return no("dessin vide");
  let src = input.trim().replace(/^```(?:svg|xml)?\s*/i, "").replace(/```\s*$/, "").trim().replace(/^<\?xml[^?>]*\?>\s*/i, "");
  if (src.length > MAX_ART_CHARS) return no(`dessin trop lourd (${src.length} caractères, ${MAX_ART_CHARS} au plus)`);
  if (/<!|<\?|&[#\w]+;|\]\]>/.test(src)) return no("commentaire, déclaration ou entité interdits");
  const TAG = /<\s*(\/)?\s*([A-Za-z][\w:-]*)((?:\s+[\w:-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/)?\s*>/g;
  const root: ArtNode = { t: "svg", a: {}, c: [] };
  const stack: ArtNode[] = [];
  let last = 0, count = 0, opened = false, closed = false, box: Art["box"] | null = null;
  for (let m = TAG.exec(src); m; m = TAG.exec(src)) {
    if (src.slice(last, m.index).trim()) return no("texte interdit dans un dessin");
    last = TAG.lastIndex;
    const [, closing, tag, attrText, selfClosing] = m;
    if (closed) return no("contenu après la fin du dessin");
    if (closing) {
      const top = stack.pop();
      if (!top || top.t !== tag) return no(`balise </${tag}> mal fermée`);
      if (!stack.length) closed = true;
      continue;
    }
    const raw: Record<string, string> = {};
    for (const a of attrText.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) { if (a[1] in raw) return no(`attribut « ${a[1]} » écrit deux fois`); raw[a[1]] = a[2] ?? a[3] ?? ""; }
    if (!opened) {
      if (tag !== "svg") return no("le dessin doit commencer par <svg>");
      const vb = String(raw.viewBox ?? "").trim().split(/[\s,]+/).map(Number);
      if (vb.length !== 4 || vb.some((n) => !Number.isFinite(n)) || vb[2] <= 0 || vb[3] <= 0 || vb.some((n) => Math.abs(n) > 1e4)) return no("viewBox manquante ou invalide");
      box = [vb[0], vb[1], vb[2], vb[3]];
      for (const k of Object.keys(raw)) if (k !== "viewBox" && !IGNORED.has(k)) return no(`attribut « ${k} » interdit sur <svg>`);
      opened = true;
      if (selfClosing) return no("dessin vide");
      stack.push(root);
      continue;
    }
    const parent = stack[stack.length - 1];
    if (!parent) return no("contenu hors du dessin");
    if (!TAGS[tag]) return no(`balise <${tag}> interdite`);
    if (!CHILDREN[parent.t]?.includes(tag)) return no(`<${tag}> interdit dans <${parent.t}>`);
    if (++count > MAX_ART_NODES) return no(`dessin trop chargé (${MAX_ART_NODES} formes au plus)`);
    if (stack.length >= MAX_DEPTH) return no("dessin trop imbriqué");
    const attrs = cleanAttrs(tag, raw);
    if (typeof attrs === "string") return no(attrs);
    const node: ArtNode = { t: tag, a: attrs };
    (parent.c ??= []).push(node);
    if (!selfClosing) { if (!CHILDREN[tag]) return no(`<${tag}> ne contient rien`); stack.push(node); }
  }
  if (src.slice(last).trim()) return no("texte interdit dans un dessin");
  if (!opened || !closed || stack.length || !box) return no("dessin incomplet");
  const nodes = root.c ?? [];
  if (!nodes.some((n) => n.t !== "defs")) return no("dessin vide");
  if (!refsOk(nodes)) return no("référence vers un élément absent du dessin");
  return { ok: true, art: { box, nodes } };
}

/** Un dessin déjà rangé est-il toujours conforme à la liste blanche ? (relecture de données enregistrées) */
export function isSafeArt(v: unknown): v is Art {
  const art = v as Art;
  if (!art || typeof art !== "object" || !Array.isArray(art.box) || art.box.length !== 4 || art.box.some((n) => typeof n !== "number" || !Number.isFinite(n)) || art.box[2] <= 0 || art.box[3] <= 0 || !Array.isArray(art.nodes)) return false;
  let count = 0;
  const ok = (n: ArtNode, parent: string, depth: number): boolean => {
    if (!n || typeof n !== "object" || typeof n.t !== "string" || !TAGS[n.t] || !CHILDREN[parent]?.includes(n.t) || ++count > MAX_ART_NODES || depth > MAX_DEPTH) return false;
    if (!n.a || typeof n.a !== "object" || Object.keys(n).some((k) => !["t", "a", "c"].includes(k))) return false;
    const clean = cleanAttrs(n.t, Object.fromEntries(Object.entries(n.a).map(([k, x]) => [k, String(x)])));
    if (typeof clean === "string" || Object.entries(clean).some(([k, x]) => n.a[k] !== x)) return false;
    if (n.c !== undefined && (!Array.isArray(n.c) || !CHILDREN[n.t] || !n.c.every((c) => ok(c, n.t, depth + 1)))) return false;
    return true;
  };
  return art.nodes.every((n) => ok(n, "svg", 1)) && art.nodes.some((n) => n.t !== "defs") && refsOk(art.nodes);
}

export const ArtSchema = z.custom<Art>(isSafeArt, { message: "dessin non conforme à la liste blanche" });

/** Références internes préfixées : deux dessins de la même page n'ont jamais deux éléments du même nom. */
export function prefixRefs(a: Record<string, string>, prefix: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(a)) out[k] = k === "id" ? `${prefix}${v}` : v.replace(ref, (_m, id: string) => `url(#${prefix}${id})`);
  return out;
}

/** SVG d'un dessin sûr, réécrit par le Studio (images de contrôle, logo de secours). */
export function artSvg(art: Art, o: { prefix?: string; width?: number; color?: string } = {}): string {
  const prefix = o.prefix ?? "a";
  const node = (n: ArtNode): string => {
    const attrs = Object.entries(prefixRefs(n.a, prefix)).map(([k, v]) => ` ${k}="${v}"`).join("");
    return n.c?.length ? `<${n.t}${attrs}>${n.c.map(node).join("")}</${n.t}>` : `<${n.t}${attrs}/>`;
  };
  const [x, y, w, h] = art.box;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}"${o.width ? ` width="${o.width}" height="${Math.round((o.width * h) / w)}"` : ""}${o.color ? ` color="${o.color}"` : ""}>${art.nodes.map(node).join("")}</svg>`;
}
