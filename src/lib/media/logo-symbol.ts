/**
 * Symbole de logo sur mesure (sans service externe) :
 *  - nettoyage strict d'un pictogramme SVG proposé par l'IA (liste blanche d'éléments et d'attributs,
 *    taille, nombre de formes, couleurs, épaisseur des traits) : tout ce qui sort du cadre est refusé ;
 *  - symbole tiré de la silhouette réelle du produit (détourage validé) : contour lissé, simplifié,
 *    épaissi là où il serait trop fin, centré, en aplat ;
 *  - contrôle de lisibilité à petite taille (16 et 32 px) et rendu matriciel du symbole.
 * Le symbole est stocké sous une forme normalisée (tracés + ton principal ou accent), jamais le SVG brut.
 */
import { createCanvas, Path2D, type SKRSContext2D } from "@napi-rs/canvas";
import sharp from "sharp";

export type SymbolShape = {
  /** Tracé au format SVG (commandes M, L, C, Q, A, Z…), dans le repère de `viewBox`. */
  d: string;
  /** Aplat ou trait. */
  paint: "fill" | "stroke";
  /** Couleur principale du logo, ou accent de la palette (une seule forme au plus). */
  tone: "main" | "accent";
  /** Épaisseur du trait, dans le repère de `viewBox`. */
  width?: number;
  rule?: "nonzero" | "evenodd";
};

export type CustomSymbol = {
  /** ai : dessiné par l'IA ; silhouette : tirée du détourage ; monogram : monogramme construit localement. */
  source: "ai" | "silhouette" | "monogram";
  /** Carré [x, y, côté] centré sur le dessin. */
  viewBox: [number, number, number];
  shapes: SymbolShape[];
};

// ---------------------------------------------------------------- nettoyage du SVG de l'IA

export type SanitizeResult = { ok: true; symbol: CustomSymbol } | { ok: false; reason: string };

const MAX_SVG_CHARS = 6000;
const MAX_SHAPES = 3;
const MAX_NUMBERS = 700;
const SHAPES = new Set(["path", "circle", "ellipse", "rect", "polygon", "polyline", "line"]);
const PAINT_ATTRS = new Set(["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "fill-rule"]);
const GEOMETRY: Record<string, string[]> = {
  path: ["d"],
  circle: ["cx", "cy", "r"],
  ellipse: ["cx", "cy", "rx", "ry"],
  rect: ["x", "y", "width", "height", "rx", "ry"],
  polygon: ["points"],
  polyline: ["points"],
  line: ["x1", "y1", "x2", "y2"],
};
/** Attributs sans effet, tolérés et ignorés. */
const IGNORED = new Set(["id", "xmlns", "version", "width", "height"]);
const NUM = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;
const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s+-]*$/;
const numbersIn = (s: string) => (s.match(/[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/gi) ?? []).map(Number);

function hexRgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const luminance = ([r, g, b]: [number, number, number]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

type Paint = { tone: "main" | "accent" } | "none";
function paintOf(v: string, accent?: string): Paint | { error: string } {
  const s = v.trim().toLowerCase();
  if (s === "none" || s === "transparent") return "none";
  if (s === "currentcolor" || s === "black") return { tone: "main" };
  const rgb = hexRgb(s);
  if (!rgb) return { error: `couleur non autorisée (${v.slice(0, 30)})` };
  const acc = accent ? hexRgb(accent) : null;
  if (acc && rgb.every((c, i) => Math.abs(c - acc[i]) <= 24)) return { tone: "accent" };
  if (luminance(rgb) <= 0.4) return { tone: "main" };
  return { error: `couleur hors palette (${s}) : utiliser currentColor ou l'accent ${accent ?? ""}`.trim() };
}

const f = (n: number) => String(Math.round(n * 100) / 100);
function ellipsePath(cx: number, cy: number, rx: number, ry: number) {
  return `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`;
}
function rectPath(x: number, y: number, w: number, h: number, rx: number, ry: number) {
  rx = Math.min(Math.max(0, rx), w / 2);
  ry = Math.min(Math.max(0, ry), h / 2);
  if (!rx || !ry) return `M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z`;
  return `M${f(x + rx)} ${f(y)}H${f(x + w - rx)}A${f(rx)} ${f(ry)} 0 0 1 ${f(x + w)} ${f(y + ry)}V${f(y + h - ry)}A${f(rx)} ${f(ry)} 0 0 1 ${f(x + w - rx)} ${f(y + h)}H${f(x + rx)}A${f(rx)} ${f(ry)} 0 0 1 ${f(x)} ${f(y + h - ry)}V${f(y + ry)}A${f(rx)} ${f(ry)} 0 0 1 ${f(x + rx)} ${f(y)}Z`;
}

/**
 * Valide et convertit un pictogramme SVG : un seul `<svg>` à viewBox carrée, des groupes `<g>` et
 * 1 à 3 formes simples ; aucun texte, police, image, script, lien, style, filtre, dégradé ni transformation.
 * Couleurs : `currentColor` (ou une couleur sombre) pour la couleur du logo, l'accent fourni pour une forme au plus.
 */
export function sanitizeSymbolSvg(input: string, opts: { accent?: string; maxShapes?: number } = {}): SanitizeResult {
  const maxShapes = Math.min(6, Math.max(1, opts.maxShapes ?? MAX_SHAPES));
  const no = (reason: string): SanitizeResult => ({ ok: false, reason });
  if (typeof input !== "string" || !input.trim()) return no("SVG vide");
  if (input.length > MAX_SVG_CHARS) return no(`SVG trop lourd (${input.length} caractères, ${MAX_SVG_CHARS} au plus)`);
  let src = input.trim().replace(/^```(?:svg|xml)?\s*/i, "").replace(/```\s*$/, "").trim();
  src = src.replace(/^<\?xml[^?>]*\?>\s*/i, "");
  if (/<!|<\?|&/.test(src)) return no("déclarations, commentaires ou entités interdits");
  if (/url\s*\(|javascript:|data:|href|@import|expression\s*\(/i.test(src)) return no("lien ou référence externe interdit");

  type Node = { name: string; attrs: Record<string, string>; parent: Node | null };
  const tag = /<\s*(\/)?\s*([A-Za-z][\w:.-]*)((?:\s+[A-Za-z_:][\w:.-]*\s*=\s*(?:"[^"<>]*"|'[^'<>]*'))*)\s*(\/)?\s*>/y;
  const attrRe = /([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  const stack: Node[] = [];
  const shapes: { node: Node }[] = [];
  let root: Node | null = null;
  let pos = 0;
  while (pos < src.length) {
    const lt = src.indexOf("<", pos);
    const between = src.slice(pos, lt < 0 ? src.length : lt);
    if (between.trim()) return no("texte interdit dans le symbole");
    if (lt < 0) break;
    tag.lastIndex = lt;
    const m = tag.exec(src);
    if (!m) return no("balise illisible");
    pos = tag.lastIndex;
    const [, closing, rawName, rawAttrs, selfClosing] = m;
    const name = rawName.toLowerCase();
    if (closing) {
      const top = stack.pop();
      if (!top || top.name !== name || rawAttrs.trim()) return no("structure SVG incorrecte");
      continue;
    }
    if (name !== "svg" && name !== "g" && !SHAPES.has(name)) return no(`élément interdit : <${name}>`);
    if (name === "svg" ? root || stack.length : !stack.length) return no("un seul élément <svg> racine attendu");
    const attrs: Record<string, string> = {};
    for (const a of rawAttrs.matchAll(attrRe)) {
      const k = a[1].toLowerCase();
      const v = a[2] ?? a[3] ?? "";
      if (k in attrs) return no(`attribut en double : ${k}`);
      attrs[k] = v;
    }
    for (const k of Object.keys(attrs)) {
      const allowed = (name === "svg" && k === "viewbox") || PAINT_ATTRS.has(k) || (GEOMETRY[name] ?? []).includes(k) || (IGNORED.has(k) && (k !== "width" && k !== "height" ? true : name === "svg"));
      if (!allowed) return no(`attribut interdit : ${k}${/^on/.test(k) ? " (script)" : ""}`);
      if (k === "xmlns" && attrs[k] !== "http://www.w3.org/2000/svg") return no("espace de noms inattendu");
    }
    const node: Node = { name, attrs, parent: stack[stack.length - 1] ?? null };
    if (name === "svg") root = node;
    if (SHAPES.has(name)) {
      shapes.push({ node });
      if (shapes.length > maxShapes) return no(`trop de formes (${maxShapes} au plus)`);
    }
    if (!selfClosing) {
      if (SHAPES.has(name) && src.slice(pos).match(/^\s*<\s*\/\s*([A-Za-z]+)\s*>/)?.[1]?.toLowerCase() !== name) return no("contenu interdit dans une forme");
      stack.push(node);
    }
    if (stack.length > 6) return no("imbrication trop profonde");
  }
  if (stack.length) return no("balise non fermée");
  if (!root) return no("élément <svg> absent");
  const vb = (root.attrs.viewbox ?? "").trim().split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some((n) => !Number.isFinite(n))) return no("viewBox absente ou illisible");
  const [vx, vy, vw, vh] = vb;
  if (vw <= 0 || vh <= 0 || vw > 10000 || Math.abs(vw - vh) > vw * 0.001) return no("viewBox non carrée");
  if (!shapes.length) return no("aucune forme");

  const inherit = (n: Node, k: string): string | undefined => (n.attrs[k] !== undefined ? n.attrs[k] : n.parent ? inherit(n.parent, k) : undefined);
  const num = (n: Node, k: string, def?: number): number => {
    const v = n.attrs[k];
    if (v === undefined) {
      if (def === undefined) throw new Error(`attribut ${k} manquant sur <${n.name}>`);
      return def;
    }
    if (!NUM.test(v.trim())) throw new Error(`valeur non numérique : ${k}`);
    const x = Number(v);
    if (Math.abs(x) > vw * 10 + Math.abs(vx) + Math.abs(vy)) throw new Error(`coordonnée hors cadre : ${k}`);
    return x;
  };
  const out: SymbolShape[] = [];
  let numbers = 0;
  try {
    for (const { node } of shapes) {
      let d: string;
      let closed = true;
      switch (node.name) {
        case "path": {
          d = (node.attrs.d ?? "").trim();
          if (!d || !PATH_DATA.test(d) || !/^[Mm]/.test(d)) throw new Error("tracé invalide");
          const ns = numbersIn(d);
          if (ns.some((x) => Math.abs(x) > vw * 10 + Math.abs(vx) + Math.abs(vy))) throw new Error("coordonnée hors cadre : d");
          numbers += ns.length;
          closed = /z\s*$/i.test(d);
          break;
        }
        case "circle": {
          const r = num(node, "r");
          if (r <= 0) throw new Error("rayon nul");
          d = ellipsePath(num(node, "cx", 0), num(node, "cy", 0), r, r);
          numbers += 3;
          break;
        }
        case "ellipse": {
          const rx = num(node, "rx"), ry = num(node, "ry");
          if (rx <= 0 || ry <= 0) throw new Error("rayon nul");
          d = ellipsePath(num(node, "cx", 0), num(node, "cy", 0), rx, ry);
          numbers += 4;
          break;
        }
        case "rect": {
          const w = num(node, "width"), h = num(node, "height");
          if (w <= 0 || h <= 0) throw new Error("rectangle vide");
          const rx = node.attrs.rx !== undefined ? num(node, "rx") : node.attrs.ry !== undefined ? num(node, "ry") : 0;
          const ry = node.attrs.ry !== undefined ? num(node, "ry") : rx;
          d = rectPath(num(node, "x", 0), num(node, "y", 0), w, h, rx, ry);
          numbers += 6;
          break;
        }
        case "polygon":
        case "polyline": {
          const pts = (node.attrs.points ?? "").trim();
          if (!/^[0-9eE.,\s+-]+$/.test(pts)) throw new Error("points invalides");
          const ns = numbersIn(pts);
          if (ns.length < 4 || ns.length % 2) throw new Error("points invalides");
          if (ns.some((x) => Math.abs(x) > vw * 10 + Math.abs(vx) + Math.abs(vy))) throw new Error("coordonnée hors cadre : points");
          d = `M${ns.slice(0, 2).map(f).join(" ")}` + Array.from({ length: ns.length / 2 - 1 }, (_, i) => `L${f(ns[2 + i * 2])} ${f(ns[3 + i * 2])}`).join("") + (node.name === "polygon" ? "Z" : "");
          closed = node.name === "polygon";
          numbers += ns.length;
          break;
        }
        default: {
          d = `M${f(num(node, "x1", 0))} ${f(num(node, "y1", 0))}L${f(num(node, "x2", 0))} ${f(num(node, "y2", 0))}`;
          closed = false;
          numbers += 4;
        }
      }
      if (numbers > MAX_NUMBERS) throw new Error("tracés trop détaillés pour un pictogramme");
      const fillV = inherit(node, "fill");
      const strokeV = inherit(node, "stroke");
      // Remplissage par défaut du SVG : noir (= couleur du logo) ; une ligne n'a jamais d'aplat.
      const fill = node.name === "line" ? "none" : paintOf(fillV ?? "currentColor", opts.accent);
      const stroke = paintOf(strokeV ?? "none", opts.accent);
      if (typeof fill === "object" && "error" in fill) throw new Error(fill.error);
      if (typeof stroke === "object" && "error" in stroke) throw new Error(stroke.error);
      const rule = inherit(node, "fill-rule") === "evenodd" ? "evenodd" : "nonzero";
      if (fill !== "none") out.push({ d, paint: "fill", tone: (fill as any).tone, rule });
      if (stroke !== "none") {
        const swRaw = inherit(node, "stroke-width") ?? "1";
        if (!NUM.test(swRaw.trim())) throw new Error("épaisseur de trait illisible");
        const sw = Number(swRaw);
        // Trait épais : au moins 6 % du côté, sinon il disparaît en favicon.
        if (sw < vw * 0.06) throw new Error(`trait trop fin (${f(sw)} pour un côté de ${f(vw)} : 6 % au moins)`);
        if (sw > vw * 0.3) throw new Error("trait trop épais");
        out.push({ d, paint: "stroke", tone: (stroke as any).tone, width: sw });
      }
      if (fill === "none" && stroke === "none") throw new Error("forme invisible");
      void closed;
    }
  } catch (e) {
    return no((e as Error).message);
  }
  // Monochrome (tout en couleur du logo ou tout en accent), ou une seule forme d'accent sur un dessin monochrome.
  const accents = new Set(out.filter((s) => s.tone === "accent").map((s) => s.d)).size;
  if (accents > 1 && out.some((s) => s.tone === "main")) return no("un seul élément d'accent permis");
  return { ok: true, symbol: { source: "ai", viewBox: [vx, vy, vw], shapes: out } };
}

// ---------------------------------------------------------------- rendu

/** Dessine le symbole dans le carré (x, y, s). */
export function drawCustomSymbol(ctx: SKRSContext2D, sym: CustomSymbol, x: number, y: number, s: number, color: string, accent?: string) {
  const [vx, vy, vw] = sym.viewBox;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / vw, s / vw);
  ctx.translate(-vx, -vy);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const sh of sym.shapes) {
    const p = new Path2D(sh.d);
    const c = sh.tone === "accent" && accent ? accent : color;
    if (sh.paint === "fill") {
      ctx.fillStyle = c;
      ctx.fill(p, sh.rule ?? "nonzero");
    } else {
      ctx.strokeStyle = c;
      ctx.lineWidth = sh.width ?? vw * 0.08;
      ctx.stroke(p);
    }
  }
  ctx.restore();
}

/** Symbole seul en PNG (fond transparent, ou fond plein). */
export async function symbolPng(sym: CustomSymbol, size: number, color = "#1A1A1A", accent?: string, background?: string): Promise<Buffer> {
  const c = createCanvas(size, size);
  const ctx = c.getContext("2d");
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
  }
  drawCustomSymbol(ctx, sym, 0, 0, size, color, accent);
  return c.encode("png");
}

/** Masque d'encre (alpha > 50 %) du symbole rendu à `size` px. */
function inkMask(sym: CustomSymbol, size: number): Uint8Array {
  const c = createCanvas(size, size);
  const ctx = c.getContext("2d");
  drawCustomSymbol(ctx, sym, 0, 0, size, "#000000", "#000000");
  const data = ctx.getImageData(0, 0, size, size).data;
  const m = new Uint8Array(size * size);
  for (let i = 0; i < m.length; i++) m[i] = data[i * 4 + 3] > 127 ? 1 : 0;
  return m;
}

/** Recadre la viewBox en carré centré sur le dessin réel, avec une marge (le symbole remplit son cadre). */
export function fitSymbol(sym: CustomSymbol, margin = 0.04): CustomSymbol {
  const N = 256;
  const big = { ...sym, viewBox: [sym.viewBox[0] - sym.viewBox[2], sym.viewBox[1] - sym.viewBox[2], sym.viewBox[2] * 3] as [number, number, number] };
  const m = inkMask(big, N);
  let x0 = N, y0 = N, x1 = -1, y1 = -1;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (m[y * N + x]) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (x1 < 0) return sym;
  const k = big.viewBox[2] / N;
  const bx = big.viewBox[0] + x0 * k, by = big.viewBox[1] + y0 * k, bw = (x1 - x0 + 1) * k, bh = (y1 - y0 + 1) * k;
  const side = Math.max(bw, bh) / (1 - margin * 2);
  return { ...sym, viewBox: [bx + bw / 2 - side / 2, by + bh / 2 - side / 2, side] };
}

// ---------------------------------------------------------------- lisibilité

export type Legibility = { ok: boolean; issues: string[]; metrics: { coverage: number; survival: number; parts32: number; fill: number; solidity: number; aspect: number } };

function components(m: Uint8Array, w: number, h: number, minArea = 1) {
  const lab = new Int32Array(w * h);
  const sizes: number[] = [];
  const st: number[] = [];
  for (let i = 0; i < m.length; i++) {
    if (!m[i] || lab[i]) continue;
    const id = sizes.length + 1;
    let n = 0;
    st.push(i);
    lab[i] = id;
    while (st.length) {
      const j = st.pop()!;
      n++;
      const x = j % w, y = (j / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const k = ny * w + nx;
        if (m[k] && !lab[k]) {
          lab[k] = id;
          st.push(k);
        }
      }
    }
    sizes.push(n);
  }
  return { lab, sizes, count: sizes.filter((s) => s >= minArea).length };
}

/** Distance (chanfrein 3-4, en pixels) de chaque pixel au plus proche pixel où `m` vaut `target`. */
function distanceTo(m: Uint8Array, w: number, h: number, target: 0 | 1): Float32Array {
  const INF = 1e9;
  const d = new Float32Array(w * h);
  for (let i = 0; i < d.length; i++) d[i] = m[i] === target ? 0 : INF;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!d[i]) continue;
    let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + 3);
    if (y > 0) {
      v = Math.min(v, d[i - w] + 3);
      if (x > 0) v = Math.min(v, d[i - w - 1] + 4);
      if (x < w - 1) v = Math.min(v, d[i - w + 1] + 4);
    }
    d[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    if (!d[i]) continue;
    let v = d[i];
    if (x < w - 1) v = Math.min(v, d[i + 1] + 3);
    if (y < h - 1) {
      v = Math.min(v, d[i + w] + 3);
      if (x < w - 1) v = Math.min(v, d[i + w + 1] + 4);
      if (x > 0) v = Math.min(v, d[i + w - 1] + 4);
    }
    d[i] = v;
  }
  for (let i = 0; i < d.length; i++) d[i] /= 3;
  return d;
}

/** Aire de l'enveloppe convexe (chaîne monotone) des pixels d'encre. */
function hullArea(m: Uint8Array, w: number, h: number) {
  const pts: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    let a = -1, b = -1;
    for (let x = 0; x < w; x++) if (m[y * w + x]) {
      if (a < 0) a = x;
      b = x;
    }
    if (a >= 0) pts.push([a, y], [b + 1, y], [a, y + 1], [b + 1, y + 1]);
  }
  if (pts.length < 3) return 0;
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [], upper: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)];
  let a = 0;
  for (let i = 0; i < hull.length; i++) {
    const [x1, y1] = hull[i], [x2, y2] = hull[(i + 1) % hull.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

/**
 * Lisible en favicon ? Encre suffisante mais pas un pavé, détails qui survivent à la réduction
 * (un trait de moins d'un demi-pixel à 16 px disparaît), peu de morceaux épars à 32 px, dessin qui remplit son cadre.
 */
export function symbolLegibility(sym: CustomSymbol): Legibility {
  const N = 128;
  const m = inkMask(sym, N);
  const ink = m.reduce((a, b) => a + b, 0);
  const coverage = ink / (N * N);
  // Survie à une érosion de 4 px à 128 px (= un demi-pixel à 16 px).
  const dist = distanceTo(m, N, N, 0);
  let kept = 0;
  for (let i = 0; i < dist.length; i++) if (m[i] && dist[i] > 4) kept++;
  const survival = ink ? kept / ink : 0;
  const m32 = inkMask(sym, 32);
  const parts32 = components(m32, 32, 32, 3).count;
  let x0 = N, y0 = N, x1 = -1, y1 = -1;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (m[y * N + x]) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  const fill = x1 < 0 ? 0 : Math.max(bw, bh) / N;
  const aspect = x1 < 0 ? 0 : Math.max(bw, bh) / Math.max(1, Math.min(bw, bh));
  const hull = hullArea(m, N, N);
  const solidity = hull ? ink / hull : 0;
  const issues: string[] = [];
  if (coverage < 0.1) issues.push("trop peu d'encre : le symbole disparaît en petit");
  if (coverage > 0.82) issues.push("pavé plein : aucune forme lisible");
  if (survival < 0.45) issues.push("traits ou détails trop fins pour 16 px");
  if (parts32 > 4) issues.push(`trop de morceaux séparés (${parts32}) à 32 px`);
  if (fill < 0.6) issues.push("dessin trop petit dans son cadre");
  if (aspect > 3) issues.push("forme trop allongée pour une icône carrée");
  const r = (n: number) => Math.round(n * 1000) / 1000;
  return { ok: !issues.length, issues, metrics: { coverage: r(coverage), survival: r(survival), parts32, fill: r(fill), solidity: r(solidity), aspect: r(aspect) } };
}

// ---------------------------------------------------------------- silhouette du produit

export type SilhouetteResult = { ok: true; symbol: CustomSymbol; legibility: Legibility } | { ok: false; reason: string; legibility?: Legibility };

/** Contour (carrés marchants) de la frontière d'un champ binaire lissé : polygone fermé en coordonnées pixel. */
function traceOuter(field: Float32Array, w: number, h: number, iso = 0.5): [number, number][] {
  // Suivi de contour de Moore sur le masque, puis position sous-pixel par interpolation du champ.
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && field[y * w + x] >= iso;
  let sx = -1, sy = -1;
  outer: for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (inside(x, y)) {
    sx = x;
    sy = y;
    break outer;
  }
  if (sx < 0) return [];
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const pts: [number, number][] = [];
  let cx = sx, cy = sy, dir = 6;
  const max = w * h * 4;
  for (let n = 0; n < max; n++) {
    pts.push([cx, cy]);
    let found = false;
    for (let k = 0; k < 8; k++) {
      const d = (dir + 6 + k) % 8;
      const nx = cx + dirs[d][0], ny = cy + dirs[d][1];
      if (inside(nx, ny)) {
        cx = nx;
        cy = ny;
        dir = d;
        found = true;
        break;
      }
    }
    if (!found || (cx === sx && cy === sy && pts.length > 2)) break;
  }
  return pts.map(([x, y]) => [x + 0.5, y + 0.5]);
}

/** Simplification de Ramer-Douglas-Peucker d'une ligne ouverte (extrémités gardées). */
function rdpOpen(pts: [number, number][], eps: number): [number, number][] {
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const st: [number, number][] = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop()!;
    const [x1, y1] = pts[a], [x2, y2] = pts[b];
    const L = Math.hypot(x2 - x1, y2 - y1) || 1;
    let best = -1, bd = 0;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((x2 - x1) * (y1 - pts[i][1]) - (x1 - pts[i][0]) * (y2 - y1)) / L;
      if (d > bd) {
        bd = d;
        best = i;
      }
    }
    if (bd > eps && best > 0) {
      keep[best] = 1;
      st.push([a, best], [best, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Simplification d'un polygone fermé : coupé en deux au point le plus éloigné du premier. */
function rdp(pts: [number, number][], eps: number): [number, number][] {
  if (pts.length < 4) return pts;
  let far = 0, fd = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > fd) {
      fd = d;
      far = i;
    }
  }
  const a = rdpOpen(pts.slice(0, far + 1), eps);
  const b = rdpOpen([...pts.slice(far), pts[0]], eps);
  return [...a, ...b.slice(1, -1)];
}

/** Rééchantillonne un contour fermé à pas régulier puis le lisse (moyenne gaussienne circulaire des positions). */
function smoothOutline(pts: [number, number][], step: number, sigma: number): [number, number][] {
  const res: [number, number][] = [];
  let acc = 0;
  res.push(pts[0]);
  for (let i = 1; i <= pts.length; i++) {
    const a = pts[i - 1], b = pts[i % pts.length];
    let seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let t0 = 0;
    while (acc + seg - t0 >= step) {
      const t = t0 + (step - acc);
      const k = t / (seg || 1);
      res.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]);
      t0 = t;
      acc = 0;
    }
    acc += seg - t0;
    seg = 0;
  }
  const n = res.length;
  const sg = sigma / step;
  const R = Math.max(1, Math.ceil(sg * 2.5));
  const wts = Array.from({ length: 2 * R + 1 }, (_, j) => Math.exp(-((j - R) ** 2) / (2 * sg * sg)));
  const tot = wts.reduce((x, y) => x + y, 0);
  return res.map((_, i) => {
    let x = 0, y = 0;
    for (let j = -R; j <= R; j++) {
      const p = res[(i + j + n) % n];
      x += p[0] * wts[j + R];
      y += p[1] * wts[j + R];
    }
    return [x / tot, y / tot] as [number, number];
  });
}

/** Contour fermé lissé en courbes de Bézier (Catmull-Rom centripète simplifiée). */
function smoothPath(pts: [number, number][], tension = 0.5): string {
  const n = pts.length;
  const P = (i: number) => pts[(i + n) % n];
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * tension * 2, p1[1] + ((p2[1] - p0[1]) / 6) * tension * 2];
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * tension * 2, p2[1] - ((p3[1] - p1[1]) / 6) * tension * 2];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
}

function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  const k = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let s = 0;
    for (let x = -r; x <= r; x++) s += src[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = s / k;
      s += src[y * w + Math.min(w - 1, x + r + 1)] - src[y * w + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = s / k;
      s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/** Contour lissé d'un champ (0–1) : flou, tracé au seuil 0,5, rééchantillonnage, lissage, simplification. */
function fieldToPath(field: Float32Array, w: number, h: number, side: number, blur: number): string | null {
  const f2 = boxBlur(boxBlur(boxBlur(field, w, h, blur), w, h, blur), w, h, blur);
  const outline = traceOuter(f2, w, h);
  if (outline.length < 12) return null;
  const smoothed = smoothOutline(outline, Math.max(1, side * 0.006), Math.max(1.5, side * 0.016));
  const simplified = rdp(smoothed, Math.max(0.35, side * 0.0022));
  if (simplified.length < 4) return null;
  // Presque un cercle (disque, hublot) : remplacé par un cercle exact, comme le tracerait un graphiste.
  const cx = smoothed.reduce((a, p) => a + p[0], 0) / smoothed.length;
  const cy = smoothed.reduce((a, p) => a + p[1], 0) / smoothed.length;
  const radii = smoothed.map((p) => Math.hypot(p[0] - cx, p[1] - cy));
  const mean = radii.reduce((a, b) => a + b, 0) / radii.length;
  const sd = Math.sqrt(radii.reduce((a, b) => a + (b - mean) ** 2, 0) / radii.length);
  if (mean > 0 && sd / mean < 0.035) return `M${f(cx - mean)} ${f(cy)}C${f(cx - mean)} ${f(cy - mean * 0.5523)} ${f(cx - mean * 0.5523)} ${f(cy - mean)} ${f(cx)} ${f(cy - mean)}C${f(cx + mean * 0.5523)} ${f(cy - mean)} ${f(cx + mean)} ${f(cy - mean * 0.5523)} ${f(cx + mean)} ${f(cy)}C${f(cx + mean)} ${f(cy + mean * 0.5523)} ${f(cx + mean * 0.5523)} ${f(cy + mean)} ${f(cx)} ${f(cy + mean)}C${f(cx - mean * 0.5523)} ${f(cy + mean)} ${f(cx - mean)} ${f(cy + mean * 0.5523)} ${f(cx - mean)} ${f(cy)}Z`;
  return smoothPath(simplified);
}

/** Applique x → (x - dx) * k, y → (y - dy) * k aux coordonnées d'un tracé fait de M, C et Z. */
const mapPath = (d: string, dx: number, dy: number, k: number) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, a, b) => `${f((Number(a) - dx) * k)} ${f((Number(b) - dy) * k)}`);

/**
 * Symbole tiré de la silhouette du produit détouré : plus grand objet seul, trous bouchés, parties trop fines
 * épaissies (lisibles à 16 px), rendu symétrique quand le produit l'est, contour lissé et simplifié, centré,
 * en aplat. Une grande fenêtre intérieure nettement distincte (écran, disque, hublot) est gardée en réserve.
 * Refusé quand la silhouette est banale (rectangle, disque, canette : rien de reconnaissable) ou illisible en petit.
 */
export async function silhouetteSymbol(cutoutPng: Buffer): Promise<SilhouetteResult> {
  const W = 320;
  const pad = 40;
  const { data, info } = await sharp(cutoutPng, { failOn: "none" })
    .ensureAlpha()
    .resize(W - pad * 2, W - pad * 2, { fit: "inside" })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const m = new Uint8Array(w * h);
  for (let i = 0; i < m.length; i++) m[i] = data[i * 4 + 3] > 127 ? 1 : 0;
  // Plus grand objet seul (les morceaux épars et un second objet sont ignorés).
  const comp = components(m, w, h);
  if (!comp.sizes.length) return { ok: false, reason: "détourage vide" };
  const main = comp.sizes.indexOf(Math.max(...comp.sizes)) + 1;
  for (let i = 0; i < m.length; i++) m[i] = comp.lab[i] === main ? 1 : 0;
  const solid = Uint8Array.from(m);
  // Trous bouchés : tout ce qui n'est pas relié au bord par le fond devient de l'encre.
  const bg = components(m.map((v) => 1 - v) as Uint8Array, w, h);
  const borderIds = new Set<number>();
  for (let x = 0; x < w; x++) borderIds.add(bg.lab[x]).add(bg.lab[(h - 1) * w + x]);
  for (let y = 0; y < h; y++) borderIds.add(bg.lab[y * w]).add(bg.lab[y * w + w - 1]);
  for (let i = 0; i < m.length; i++) if (!m[i] && !borderIds.has(bg.lab[i])) m[i] = 1;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) {
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  const side = Math.max(x1 - x0 + 1, y1 - y0 + 1);
  // Épaississement des parties fines : un trait doit garder ~1,3 px à 16 px.
  const minHalf = Math.max(2, (side / 16) * 0.65);
  const din = distanceTo(m, w, h, 0);
  const core = new Uint8Array(w * h);
  for (let i = 0; i < m.length; i++) core[i] = din[i] > minHalf ? 1 : 0;
  const dCore = distanceTo(core, w, h, 1);
  // Parties fines = silhouette moins son ouverture. Seuls les vrais membres (bras, anses, pieds : des morceaux
  // d'une certaine taille) sont regonflés ; les liserés des coins, eux, disparaissent au lissage.
  const thin = new Uint8Array(w * h);
  for (let i = 0; i < m.length; i++) thin[i] = m[i] && dCore[i] > minHalf ? 1 : 0;
  const inkArea = m.reduce((a, b) => a + b, 0);
  const tc = components(thin, w, h);
  const limbs = new Uint8Array(w * h);
  let anyLimb = false;
  for (let i = 0; i < m.length; i++) if (tc.lab[i] && tc.sizes[tc.lab[i] - 1] >= inkArea * 0.006) {
    limbs[i] = 1;
    anyLimb = true;
  }
  if (anyLimb) {
    const dl = distanceTo(limbs, w, h, 1);
    for (let i = 0; i < m.length; i++) if (dl[i] <= minHalf * 0.85) m[i] = 1;
  }

  // Fenêtre intérieure : grande zone compacte et uniforme (écran, disque, hublot) qui ne touche pas le contour.
  // Elle est creusée en réserve, avec un anneau assez épais pour rester lisible à 16 px.
  const din2 = distanceTo(m, w, h, 0);
  const region = new Int32Array(w * h);
  const regions: { area: number; edge: boolean }[] = [];
  const close = (i: number, j: number) => Math.max(Math.abs(data[i * 4] - data[j * 4]), Math.abs(data[i * 4 + 1] - data[j * 4 + 1]), Math.abs(data[i * 4 + 2] - data[j * 4 + 2])) <= 9;
  const near = (i: number, j: number) => Math.max(Math.abs(data[i * 4] - data[j * 4]), Math.abs(data[i * 4 + 1] - data[j * 4 + 1]), Math.abs(data[i * 4 + 2] - data[j * 4 + 2])) <= 26;
  for (let i = 0; i < m.length; i++) {
    if (!solid[i] || region[i]) continue;
    const id = regions.length + 1;
    const r0 = { area: 0, edge: false };
    const st = [i];
    region[i] = id;
    while (st.length) {
      const j = st.pop()!;
      r0.area++;
      if (din2[j] <= minHalf * 1.5) r0.edge = true;
      const x = j % w, y = (j / w) | 0;
      // Voisin proche ET resté proche de la couleur de départ (un fondu ne relie pas deux matières différentes).
      for (const k of [x > 0 ? j - 1 : -1, x < w - 1 ? j + 1 : -1, y > 0 ? j - w : -1, y < h - 1 ? j + w : -1]) if (k >= 0 && solid[k] && !region[k] && close(j, k) && near(i, k)) {
        region[k] = id;
        st.push(k);
      }
    }
    regions.push(r0);
  }
  let hole: Uint8Array | null = null;
  const order = regions.map((r0, i) => ({ ...r0, id: i + 1 })).filter((r0) => !r0.edge && r0.area >= inkArea * 0.06 && r0.area <= inkArea * 0.5).sort((p, q) => q.area - p.area);
  for (const r0 of order) {
    const cand = new Uint8Array(w * h);
    for (let i = 0; i < m.length; i++) cand[i] = region[i] === r0.id && din2[i] > minHalf * 2 ? 1 : 0;
    const area = cand.reduce((x, y) => x + y, 0);
    // Zone compacte (disque, écran) : pas une impression éparse, pas un reflet en croissant.
    if (area >= inkArea * 0.05 && area / Math.max(1, hullArea(cand, w, h)) >= 0.85) {
      hole = cand;
      break;
    }
  }

  // Produit symétrique (vu de face) : silhouette et fenêtre rendues parfaitement symétriques, comme un graphiste le ferait.
  let sx = 0, n = 0;
  for (let i = 0; i < m.length; i++) if (m[i]) {
    sx += i % w;
    n++;
  }
  const axis = sx / Math.max(1, n);
  const mirror = (src: Uint8Array, x: number, y: number) => {
    const mx = Math.round(2 * axis - x);
    return mx >= 0 && mx < w ? src[y * w + mx] : 0;
  };
  let inter = 0, uni = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const a = m[y * w + x], b = mirror(m, x, y);
    if (a && b) inter++;
    if (a || b) uni++;
  }
  const symmetric = uni > 0 && inter / uni >= 0.86;
  // Contour : union avec son miroir (aucun membre perdu) ; fenêtre : intersection (l'anneau garde son épaisseur).
  const toField = (src: Uint8Array, mode: "union" | "inter") => {
    const out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const a = src[y * w + x];
      out[y * w + x] = !symmetric ? a : mode === "union" ? Math.max(a, mirror(src, x, y)) : Math.min(a, mirror(src, x, y));
    }
    return out;
  };
  const blur = Math.max(2, Math.round(side * 0.016));
  const outer = fieldToPath(toField(m, "union"), w, h, side, blur);
  if (!outer) return { ok: false, reason: "contour introuvable" };
  const inner = hole ? fieldToPath(toField(hole, "inter"), w, h, side, blur) : null;
  const sym = fitSymbol({ source: "silhouette", viewBox: [0, 0, w], shapes: [{ d: outer + (inner ?? ""), paint: "fill", tone: "accent", rule: "evenodd" }] }, 0.06);
  // Normalisation des coordonnées sur 0–100 (fichiers légers, valeurs lisibles).
  const [vx, vy, vw] = sym.viewBox;
  const norm: CustomSymbol = { source: "silhouette", viewBox: [0, 0, 100], shapes: [{ ...sym.shapes[0], d: mapPath(sym.shapes[0].d, vx, vy, 100 / vw) }] };
  const leg = symbolLegibility(norm);
  if (!leg.ok) return { ok: false, reason: `silhouette illisible en petit : ${leg.issues.join(" ; ")}`, legibility: leg };
  // Silhouette banale : un rectangle, un disque ou une canette ne distinguent pas la marque (la solidité est
  // mesurée sans la fenêtre, qui ne rend pas un rectangle plus reconnaissable).
  const plain = symbolLegibility({ ...norm, shapes: [{ ...norm.shapes[0], d: norm.shapes[0].d.replace(/Z.*$/s, "Z") }] });
  if (plain.metrics.solidity > 0.94) return { ok: false, reason: "silhouette trop banale (forme pleine sans relief reconnaissable)", legibility: leg };
  return { ok: true, symbol: norm, legibility: leg };
}

/**
 * Planche de contrôle du symbole (pour le contrôle visuel par l'IA) : grand sur fond clair, en version claire
 * sur fond sombre, puis à 32 et 16 px réels agrandis (pixels visibles) comme dans un onglet de navigateur.
 */
export async function symbolSheet(sym: CustomSymbol, color: string, accent?: string): Promise<Buffer> {
  const big = await symbolPng(sym, 360, color, accent, "#FFFFFF");
  const dark = await symbolPng(sym, 360, "#FFFFFF", "#FFFFFF", "#1B1B1F");
  const px = async (s: number) => sharp(await symbolPng(sym, s, color, accent, "#FFFFFF")).resize(176, 176, { kernel: "nearest" }).png().toBuffer();
  const tile = (input: Buffer, left: number, top: number) => ({ input, left, top });
  return sharp({ create: { width: 1180, height: 420, channels: 3, background: "#E9E9EC" } })
    .composite([tile(big, 30, 30), tile(dark, 410, 30), tile(await px(32), 800, 30), tile(await px(16), 800, 214), tile(await symbolPng(sym, 32, color, accent, "#FFFFFF"), 1010, 102), tile(await symbolPng(sym, 16, color, accent, "#FFFFFF"), 1018, 294)])
    .png()
    .toBuffer();
}
