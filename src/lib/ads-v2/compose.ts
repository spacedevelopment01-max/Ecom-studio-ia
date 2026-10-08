/**
 * Composition publicitaire (Ads V2) : une image (Image Engine V2) + le produit réel (pixels d'origine) + une
 * typographie de marque, une hiérarchie nette (marque, accroche, bouton), des zones de sécurité par plateforme.
 *
 * La création est construite comme un DOCUMENT EN CALQUES (src/lib/ad-doc) — fond, image, voile, produit, marque,
 * accroche, bouton, logo — puis rendue par le moteur commun à l'éditeur et à l'export : la publicité reste
 * entièrement modifiable par le client (texte, image, formes, position, couleurs…) sans aucun appel d'IA.
 * Mesures calculées sur le document (taille de police minimale, contraste réel, part de texte, zones de sécurité,
 * chevauchement du produit) : la barrière s'en sert sans payer de contrôle.
 */
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { contrast, ensureContrast, isDark, mix, onColor } from "../color";
import { ensureFonts } from "../media/fonts";
import type { Palette, Typo } from "../media/compose";
import { layoutText, renderDoc, type RenderEnv } from "../ad-doc/render";
import { docMetrics, renderDocToBuffer, serverFont } from "../ad-doc/server";
import { DOC_VERSION, type AdDocument, type ImageLayer, type Layer, type ShapeLayer, type TextLayer } from "../ad-doc/types";
import type { FormatSpec, VisualConcept } from "./types";

export type ComposeInput = {
  format: FormatSpec;
  layout: VisualConcept["layout"];
  palette: Palette;
  typo: Typo;
  brand: string;
  headline: string;
  cta: string;
  background: Buffer | null;
  product: Buffer | null;
  logo?: Buffer | null;
  /** Assets de la bibliothèque correspondant aux images (le document y fait référence). */
  ids?: { background?: string | null; product?: string | null; logo?: string | null };
  conceptId?: string | null;
};

export type ComposeMetrics = { minFontPx: number; textContrast: number; textShare: number; safeOverflow: boolean; productOverlap: boolean; headlineLines: number };

type Box = { x: number; y: number; w: number; h: number };
const STRETCH = { h: "stretch", v: "stretch" } as const;

function avgColor(ctx: any, b: Box, W: number, H: number): string {
  const x = Math.max(0, Math.round(b.x));
  const y = Math.max(0, Math.round(b.y));
  const d = ctx.getImageData(x, y, Math.max(1, Math.min(Math.round(b.w), W - x)), Math.max(1, Math.min(Math.round(b.h), H - y))).data;
  let r = 0, g = 0, bl = 0, n = 0;
  for (let i = 0; i < d.length; i += 32) ((r += d[i]), (g += d[i + 1]), (bl += d[i + 2]), n++);
  return `#${[r, g, bl].map((v) => Math.round(v / Math.max(1, n)).toString(16).padStart(2, "0")).join("")}`;
}

const base = (id: string, name: string, role: Layer["role"], b: Box, anchor: Layer["anchor"]) => ({ id, name, role, ...b, rotation: 0, opacity: 1, visible: true, locked: false, anchor });
const img = (id: string, name: string, role: Layer["role"], b: Box, assetId: string, fit: ImageLayer["fit"], anchor: Layer["anchor"], extra: Partial<ImageLayer> = {}): ImageLayer => ({ ...base(id, name, role, b, anchor), kind: "image", assetId, fit, crop: null, radius: 0, shadow: null, ...extra });
const rect = (id: string, name: string, role: Layer["role"], b: Box, fill: ShapeLayer["fill"], anchor: Layer["anchor"]): ShapeLayer => ({ ...base(id, name, role, b, anchor), kind: "shape", shape: "rect", fill, stroke: null, radius: 0, shadow: null });
const scrim = (angle: number, alpha: number) => ({ type: "linear" as const, angle, stops: [{ offset: 0, color: `rgba(0,0,0,${alpha})` }, { offset: 1, color: "rgba(0,0,0,0)" }] });

/** Construit le document en calques d'une création (géométrie, polices, couleurs garanties lisibles). */
export async function buildAdDocument(i: ComposeInput): Promise<{ doc: AdDocument; images: RenderEnv["images"] }> {
  ensureFonts();
  const { width: W, height: H } = i.format;
  const safe = { top: Math.round(H * i.format.safe.top), bottom: Math.round(H * i.format.safe.bottom), side: Math.round(W * i.format.safe.side) };
  const tall = H / W > 1.15;
  const wide = W / H > 1.3;
  const pal = i.palette;
  const images: RenderEnv["images"] = new Map();
  const bgId = i.background ? (i.ids?.background ?? "background") : null;
  const prodId = i.product ? (i.ids?.product ?? "product") : null;
  const logoId = i.logo ? (i.ids?.logo ?? "logo") : null;
  if (bgId) images.set(bgId, (await loadImage(i.background!)) as never);
  if (prodId) images.set(prodId, (await loadImage(i.product!)) as never);
  if (logoId) images.set(logoId, (await loadImage(i.logo!)) as never);
  const layers: Layer[] = [];
  const field = pal.light;
  const layout = !bgId && (i.layout === "full_bleed" || i.layout === "hero_left" || i.layout === "split") ? "typographic" : i.layout;
  let textBox: Box;
  let align: TextLayer["align"] = "left";

  // 1. Fond et image selon la mise en page.
  if (layout === "full_bleed" && bgId) {
    layers.push(img("bg-photo", "Photo", "background", { x: 0, y: 0, w: W, h: H }, bgId, "cover", STRETCH));
    layers.push(rect("scrim", "Voile", "scrim", tall ? { x: 0, y: 0, w: W, h: H * 0.5 } : { x: 0, y: 0, w: W * 0.62, h: H }, scrim(tall ? 90 : 0, 0.58), tall ? { h: "stretch", v: "top" } : { h: "left", v: "stretch" }));
    textBox = tall ? { x: safe.side, y: safe.top, w: W - safe.side * 2, h: H * 0.26 } : { x: safe.side, y: safe.top + H * 0.04, w: W * 0.5, h: H * 0.5 };
  } else if ((layout === "hero_left" || layout === "split") && bgId) {
    const panel = layout === "split" ? pal.dark : field;
    if (tall) {
      layers.push(img("bg-photo", "Photo", "image", { x: 0, y: 0, w: W, h: H * 0.62 }, bgId, "cover", { h: "stretch", v: "top" }));
      layers.push(rect("panel", "Panneau", "shape", { x: 0, y: H * 0.62, w: W, h: H * 0.38 }, panel, { h: "stretch", v: "bottom" }));
      textBox = { x: safe.side, y: H * 0.62 + H * 0.035, w: W - safe.side * 2, h: H * 0.38 - safe.bottom - H * 0.035 };
    } else {
      const split = wide ? 0.46 : 0.5;
      layers.push(rect("panel", "Panneau", "shape", { x: 0, y: 0, w: W * split, h: H }, panel, { h: "left", v: "stretch" }));
      layers.push(img("bg-photo", "Photo", "image", { x: W * split, y: 0, w: W * (1 - split), h: H }, bgId, "cover", { h: "right", v: "stretch" }));
      textBox = { x: safe.side, y: safe.top + H * 0.06, w: W * split - safe.side * 1.6, h: H - safe.top - safe.bottom - H * 0.08 };
    }
  } else {
    if (bgId && layout === "hero_center") {
      layers.push(img("bg-photo", "Photo", "background", { x: 0, y: 0, w: W, h: H }, bgId, "cover", STRETCH));
      layers.push(rect("scrim", "Voile", "scrim", { x: 0, y: 0, w: W, h: H * 0.42 }, scrim(90, 0.55), { h: "stretch", v: "top" }));
    } else {
      const top = layout === "typographic" ? pal.primary : field;
      const bottom = layout === "typographic" ? mix(pal.primary, pal.dark, 0.35) : mix(field, pal.secondary, 0.5);
      layers.push(rect("bg-fill", "Fond", "background", { x: 0, y: 0, w: W, h: H }, { type: "linear", angle: 90, stops: [{ offset: 0, color: top }, { offset: 1, color: bottom }] }, STRETCH));
    }
    align = "center";
    textBox = { x: safe.side, y: safe.top, w: W - safe.side * 2, h: H * (tall ? 0.24 : 0.26) };
  }

  // 2. Produit réel (pixels d'origine, « contain » : jamais coupé), jamais sous le texte.
  if (prodId) {
    const p = images.get(prodId)!;
    const zone: Box = layout === "hero_left" || layout === "split" ? (tall ? { x: 0, y: 0, w: W, h: H * 0.62 } : { x: W * 0.5, y: 0, w: W * 0.5, h: H }) : { x: 0, y: textBox.y + textBox.h, w: W, h: H - (textBox.y + textBox.h) - safe.bottom - H * 0.12 };
    const box = { x: zone.x + zone.w * 0.11, y: zone.y + zone.h * 0.14, w: zone.w * 0.78, h: zone.h * 0.78 };
    // Jamais agrandi au point d'être flou (1,6 × la résolution du détourage au plus).
    const s = Math.min(box.w / p.width, box.h / p.height, 1.6);
    const pw = p.width * s;
    const ph = p.height * s;
    layers.push(img("product", "Produit", "product", { x: box.x + (box.w - pw) / 2, y: box.y + box.h - ph, w: pw, h: ph }, prodId, "contain", { h: "center", v: "bottom" }, { contactShadow: true }));
  }

  // 3. Couleur du texte choisie sur ce qui est réellement dessiné dessous (contraste visé 5:1, 4,5:1 garanti).
  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");
  const pre: AdDocument = { version: DOC_VERSION, width: W, height: H, background: field, safe, format: { platform: i.format.platform, aspect: i.format.aspect }, layers, brand: { palette: { ...pal }, fonts: { heading: i.typo.heading, body: i.typo.body }, name: i.brand }, meta: { conceptId: i.conceptId ?? null, source: "engine", createdFrom: null } };
  renderDoc(ctx, pre, { font: serverFont, images });
  const under = avgColor(ctx, textBox, W, H);
  const ink = ensureContrast(isDark(under) ? "#FFFFFF" : pal.dark, under, 5);
  const eyebrow = Math.round(Math.max(W * 0.022, 20));
  const textAnchor: Layer["anchor"] = { h: align === "center" ? "center" : "left", v: tall && (layout === "hero_left" || layout === "split") ? "bottom" : "top" };
  layers.push({ ...base("brand", "Marque", "subtitle", { x: textBox.x, y: textBox.y, w: textBox.w, h: eyebrow * 1.3 }, textAnchor), kind: "text", text: i.brand, font: { family: i.typo.body, weight: 600, size: eyebrow, italic: false }, color: ink, align, lineHeight: 1.2, letterSpacing: Math.round(eyebrow * 0.16), uppercase: true, autoFit: null, shadow: null });
  const weight = i.typo.headingWeight ?? 600;
  const headTop = textBox.y + eyebrow * 2;
  const room = { w: textBox.w, h: Math.max(eyebrow * 3, textBox.h - eyebrow * 2.2 - (tall || align === "center" ? 0 : eyebrow * 5)) };
  const title: TextLayer = { ...base("title", "Titre", "title", { x: textBox.x, y: headTop, w: room.w, h: room.h }, textAnchor), kind: "text", text: i.headline, font: { family: i.typo.heading, weight, size: Math.round(W * (tall ? 0.105 : wide ? 0.06 : 0.08)), italic: false }, color: ink, align, lineHeight: 1.06, letterSpacing: 0, uppercase: !!i.typo.uppercase, autoFit: { minSize: Math.round(W * (tall ? 0.055 : 0.04)) }, shadow: null };
  layers.push(title);
  const fitted = layoutText(ctx, title, { font: serverFont });
  const titleBottom = title.y + fitted.lines.length * fitted.size * title.lineHeight;

  // 4. Bouton (couleur d'accent lisible), puis logo discret hors zone d'interface.
  const ctaSize = Math.round(Math.max(W * 0.026, 22));
  const accent0 = contrast(pal.accent, under) >= 3 ? pal.accent : ensureContrast(pal.dark, under, 4.5);
  // Libellé du bouton lisible : si le texte clair ou foncé n'atteint pas 4,5:1, c'est le fond du bouton qui s'ajuste.
  const btnText = onColor(accent0);
  const accent = contrast(btnText, accent0) >= 4.6 ? accent0 : ensureContrast(accent0, btnText, 4.6);
  ctx.font = serverFont(i.typo.body, 600, ctaSize, false);
  const bw = ctx.measureText(i.cta).width + ctaSize * 2.8;
  const bh = ctaSize * 2.6;
  const centered = align === "center" || (tall && layout !== "hero_left");
  const by = align === "center" || tall ? H - safe.bottom - ctaSize * 2.8 : Math.min(titleBottom + ctaSize * 1.4, H - safe.bottom - ctaSize * 2.8);
  const bx = centered ? W / 2 - bw / 2 : textBox.x;
  layers.push({ ...base("cta", "Bouton", "cta", { x: bx, y: by, w: bw, h: bh }, { h: centered ? "center" : "left", v: align === "center" || tall ? "bottom" : "top" }), kind: "button", text: i.cta, font: { family: i.typo.body, weight: 600, size: ctaSize, italic: false }, fill: accent, color: btnText, radius: bh / 2, stroke: null, shadow: null });
  if (logoId && !tall) {
    const lg = images.get(logoId)!;
    const lh = Math.round(H * 0.045);
    const lw = Math.min((lg.width / lg.height) * lh, W * 0.28);
    layers.push(img("logo", "Logo", "logo", { x: W - safe.side - lw, y: H - safe.bottom - lh, w: lw, h: lh }, logoId, "contain", { h: "right", v: "bottom" }, { opacity: 0.92 }));
  }
  return { doc: { ...pre, layers }, images };
}

export async function composeAd(i: ComposeInput): Promise<{ jpg: Buffer; metrics: ComposeMetrics; doc: AdDocument }> {
  const { doc, images } = await buildAdDocument(i);
  const jpg = await renderDocToBuffer(doc, images, "jpeg");
  const m = docMetrics(doc, images);
  return { jpg, metrics: { minFontPx: m.minFontPx, textContrast: m.textContrast, textShare: m.textShare, safeOverflow: m.safeOverflow, productOverlap: m.productOverlap, headlineLines: m.headlineLines }, doc };
}
