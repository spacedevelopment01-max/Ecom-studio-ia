/**
 * Rendu serveur d'un document publicitaire (export PNG / JPEG, vignettes, contrôles) avec le MÊME moteur que
 * l'éditeur (render.ts), et contrôles de lisibilité et de débordement calculés sur le document lui-même.
 */
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { contrast } from "../color";
import { ensureFonts, font } from "../media/fonts";
import { layoutText, renderDoc, type RenderEnv } from "./render";
import type { AdDocument, Layer } from "./types";

export const serverFont: RenderEnv["font"] = (family, weight, size, italic) => font(family, weight, size, italic);

/** Images d'un document chargées depuis des tampons (asset → image). */
export async function loadDocImages(sources: Map<string, Buffer>): Promise<RenderEnv["images"]> {
  const out: RenderEnv["images"] = new Map();
  for (const [id, buf] of sources) out.set(id, (await loadImage(buf)) as never);
  return out;
}

export async function renderDocToBuffer(doc: AdDocument, images: RenderEnv["images"], format: "png" | "jpeg" = "jpeg"): Promise<Buffer> {
  ensureFonts();
  const c = createCanvas(doc.width, doc.height);
  const ctx = c.getContext("2d");
  renderDoc(ctx, doc, { font: serverFont, images });
  return format === "png" ? c.encode("png") : c.encode("jpeg", 92);
}

export type DocMetrics = { minFontPx: number; textContrast: number; textShare: number; safeOverflow: boolean; productOverlap: boolean; textOverlap: boolean; headlineLines: number; problems: { layerId: string; code: string; message: string }[] };

type Box = { x: number; y: number; w: number; h: number };
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

function avg(ctx: any, b: Box, W: number, H: number): string {
  const x = Math.max(0, Math.round(b.x));
  const y = Math.max(0, Math.round(b.y));
  const d = ctx.getImageData(x, y, Math.max(1, Math.min(Math.round(b.w), W - x)), Math.max(1, Math.min(Math.round(b.h), H - y))).data;
  let r = 0, g = 0, bl = 0, n = 0;
  for (let i = 0; i < d.length; i += 32) ((r += d[i]), (g += d[i + 1]), (bl += d[i + 2]), n++);
  return `#${[r, g, bl].map((v) => Math.round(v / Math.max(1, n)).toString(16).padStart(2, "0")).join("")}`;
}

/** Hauteur réellement occupée par un texte (lignes × interligne), pour les contrôles. */
function textBox(ctx: any, l: Extract<Layer, { kind: "text" }>): Box & { size: number; lines: number } {
  const { size, lines } = layoutText(ctx, l, { font: serverFont });
  return { x: l.x, y: l.y, w: l.w, h: lines.length * size * l.lineHeight, size, lines: lines.length };
}

/**
 * Contrôles d'un document (après chaque modification, gratuits) : taille minimale, contraste réel du texte sur ce
 * qui est dessiné dessous, part de texte, débordement des zones de sécurité, texte posé sur le produit.
 */
export function docMetrics(doc: AdDocument, images: RenderEnv["images"]): DocMetrics {
  ensureFonts();
  const W = doc.width;
  const H = doc.height;
  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");
  const problems: DocMetrics["problems"] = [];
  const visible = doc.layers.filter((l) => l.visible);
  const texts = visible.filter((l): l is Extract<Layer, { kind: "text" }> => l.kind === "text");
  const buttons = visible.filter((l): l is Extract<Layer, { kind: "button" }> => l.kind === "button");
  const product = visible.find((l) => l.role === "product");
  let minFont = 999;
  let minContrast = 21;
  let area = 0;
  let safeOverflow = false;
  let productOverlap = false;
  let headlineLines = 0;
  const drawn: { l: Layer; b: Box }[] = [];
  const inSafe = (b: Box) => b.y >= doc.safe.top - 1 && b.y + b.h <= H - doc.safe.bottom + 1 && b.x >= doc.safe.side - 1 && b.x + b.w <= W - doc.safe.side + 1;
  for (const l of [...texts, ...buttons]) {
    // Ce qui est sous le calque : tout ce qui est dessiné avant lui.
    const idx = doc.layers.indexOf(l);
    ctx.clearRect(0, 0, W, H);
    renderDoc(ctx, { ...doc, layers: doc.layers.slice(0, idx) }, { font: serverFont, images });
    const b: Box & { size: number; lines?: number } = l.kind === "text" ? textBox(ctx, l) : { x: l.x, y: l.y, w: l.w, h: l.h, size: l.font.size };
    if (l.role === "title" && "lines" in b) headlineLines = b.lines ?? 0;
    drawn.push({ l, b });
    const under = l.kind === "button" ? (typeof l.fill === "string" ? l.fill : l.fill.stops[0]?.color ?? "#000000") : avg(ctx, b, W, H);
    const cr = Math.round(contrast(l.color, under.slice(0, 7)) * 10) / 10;
    minContrast = Math.min(minContrast, cr);
    minFont = Math.min(minFont, b.size);
    area += b.w * b.h;
    if (cr < 4.5) problems.push({ layerId: l.id, code: "illegible", message: `contraste ${cr}:1 (4,5:1 au moins)` });
    if (b.size < 22) problems.push({ layerId: l.id, code: "illegible", message: `texte de ${b.size} px : trop petit sur mobile` });
    if (["title", "subtitle", "body", "cta"].includes(l.role) && !inSafe(b)) {
      safeOverflow = true;
      problems.push({ layerId: l.id, code: "safe_zone", message: "dans la zone recouverte par l'interface de la plateforme" });
    }
    if (product && overlap(b, product) > b.w * b.h * (l.kind === "button" ? 0.1 : 0.04)) {
      productOverlap = true;
      problems.push({ layerId: l.id, code: "product_overlap", message: "recouvre le produit" });
    }
  }
  // Un texte qui passe sous (ou sur) le bouton : illisible, même si chacun est lisible seul.
  for (const t of drawn.filter((d) => d.l.kind === "text"))
    for (const btn of drawn.filter((d) => d.l.kind === "button"))
      if (overlap(t.b, btn.b) > 0) problems.push({ layerId: t.l.id, code: "text_overlap", message: "chevauche le bouton" });
  return { minFontPx: minFont === 999 ? 0 : minFont, textContrast: minContrast, textShare: Math.round((area / (W * H)) * 100) / 100, safeOverflow, productOverlap, textOverlap: problems.some((x) => x.code === "text_overlap"), headlineLines, problems };
}
