/**
 * Composition publicitaire (Ads V2) : une photographie (Image Engine V2, le produit réel y figure quand il a été mis
 * en scène) + une typographie de marque traitée en titre d'affiche + une hiérarchie nette (logo, accroche, ligne
 * secondaire, bouton) + des zones de sécurité par plateforme.
 *
 * Six compositions réellement différentes (direction artistique : art.ts), chacune RECONSTRUITE pour chaque format
 * (carré, portrait, story, paysage) — pas un recadrage : colonne de texte, tailles, marges, place du produit et du
 * bouton changent avec le format.
 *  - editorial : photo plein cadre, voile directionnel teinté, logo, titre, ligne, bouton (marques premium) ;
 *  - poster : titre centré en haut, ligne espacée, bouton en bas sur les formats hauts (affiche) ;
 *  - panel : panneau de marque (logo, filet, titre, ligne, bouton) + photo (services, maisons sobres) ;
 *  - band : grand aplat arrondi de couleur franche, titre très gras (marques énergiques) ;
 *  - frame : photo sombre, surtitre et filet d'accent, titre, ligne en capitales espacées (ateliers, automobile) ;
 *  - typographic : sans photo, aplat de marque (jamais une image inventée).
 *
 * La création est un DOCUMENT EN CALQUES (src/lib/ad-doc), rendu par le moteur commun à l'éditeur et à l'export :
 * textes nets et modifiables par le client sans IA. Mesures calculées sur le document (taille minimale, contraste
 * réel, part de texte, zones de sécurité, chevauchements) : la barrière s'en sert sans payer de contrôle.
 */
import { createCanvas, loadImage } from "@napi-rs/canvas";
import sharp from "sharp";
import { contrast, ensureContrast, isDark, mix, onColor } from "../color";
import { ensureFonts } from "../media/fonts";
import type { Palette, Typo } from "../media/compose";
import { layoutText, renderDoc, type RenderEnv } from "../ad-doc/render";
import { docMetrics, renderDocToBuffer, serverFont } from "../ad-doc/server";
import { DOC_VERSION, type AdDocument, type ButtonLayer, type ImageLayer, type Layer, type ShapeLayer, type TextLayer } from "../ad-doc/types";
import { nearestWeight, toAdLayout, type AdArt, type AdLayout } from "./art";
import type { FormatSpec, VisualConcept } from "./types";

export type ComposeInput = {
  format: FormatSpec;
  layout: VisualConcept["layout"] | AdLayout;
  palette: Palette;
  typo: Typo;
  brand: string;
  headline: string;
  /** Ligne secondaire courte (« Café en grains • Torréfaction artisanale »), uniquement des faits confirmés. */
  subline?: string | null;
  /** Surtitre (catégorie, métier) des compositions « cadre ». */
  eyebrow?: string | null;
  cta: string;
  background: Buffer | null;
  product: Buffer | null;
  logo?: Buffer | null;
  /** Version claire du logo (posée sur une photo sombre). */
  logoLight?: Buffer | null;
  art?: AdArt | null;
  /** Assets de la bibliothèque correspondant aux images (le document y fait référence). */
  ids?: { background?: string | null; product?: string | null; logo?: string | null; logoLight?: string | null };
  conceptId?: string | null;
};

export type ComposeMetrics = { minFontPx: number; textContrast: number; textShare: number; safeOverflow: boolean; productOverlap: boolean; textOverlap?: boolean; headlineLines: number };

type Box = { x: number; y: number; w: number; h: number };
type Cls = "land" | "square" | "portrait" | "story";
const STRETCH = { h: "stretch", v: "stretch" } as const;

function avgColor(ctx: any, b: Box, W: number, H: number): string {
  const x = Math.max(0, Math.min(W - 1, Math.round(b.x)));
  const y = Math.max(0, Math.min(H - 1, Math.round(b.y)));
  const d = ctx.getImageData(x, y, Math.max(1, Math.min(Math.round(b.w), W - x)), Math.max(1, Math.min(Math.round(b.h), H - y))).data;
  let r = 0, g = 0, bl = 0, n = 0;
  for (let i = 0; i < d.length; i += 32) ((r += d[i]), (g += d[i + 1]), (bl += d[i + 2]), n++);
  return `#${[r, g, bl].map((v) => Math.round(v / Math.max(1, n)).toString(16).padStart(2, "0")).join("")}`;
}

const rgba = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
};
const base = (id: string, name: string, role: Layer["role"], b: Box, anchor: Layer["anchor"]) => ({ id, name, role, ...b, rotation: 0, opacity: 1, visible: true, locked: false, anchor });
const img = (id: string, name: string, role: Layer["role"], b: Box, assetId: string, fit: ImageLayer["fit"], anchor: Layer["anchor"], extra: Partial<ImageLayer> = {}): ImageLayer => ({ ...base(id, name, role, b, anchor), kind: "image", assetId, fit, crop: null, radius: 0, shadow: null, ...extra });
const shape = (id: string, name: string, role: Layer["role"], b: Box, fill: ShapeLayer["fill"], anchor: Layer["anchor"], extra: Partial<ShapeLayer> = {}): ShapeLayer => ({ ...base(id, name, role, b, anchor), kind: "shape", shape: "rect", fill, stroke: null, radius: 0, shadow: null, ...extra });
/** Voile en dégradé teinté de la couleur sombre de la marque (plus naturel qu'un noir pur), trois paliers. */
const veil = (angle: number, tint: string, alpha: number) => ({ type: "linear" as const, angle, stops: [{ offset: 0, color: rgba(tint, alpha) }, { offset: 0.55, color: rgba(tint, alpha * 0.55) }, { offset: 1, color: rgba(tint, 0) }] });


/**
 * Lecture de la photo telle qu'elle sera cadrée (remplissage du format) : agitation (contours) et luminosité des
 * deux moitiés gauche/droite et haut/bas. Le texte va sur la zone la plus calme — jamais sur le sujet — et une zone
 * claire et calme garde sa lumière (texte foncé, voile léger) au lieu d'être assombrie.
 */
export type PhotoZones = { left: Zone; right: Zone; top: Zone; bottom: Zone };
type Zone = { busy: number; lum: number };
export async function photoZones(buf: Buffer, W: number, H: number): Promise<PhotoZones> {
  const gh = 48;
  const gw = Math.max(8, Math.round((gh * W) / H));
  const { data } = await sharp(buf).rotate().resize(gw, gh, { fit: "cover" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const at = (x: number, y: number) => data[y * gw + x] / 255;
  const zone = (x0: number, x1: number, y0: number, y1: number): Zone => {
    let busy = 0;
    let lum = 0;
    let n = 0;
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        const v = at(x, y);
        lum += v;
        if (x + 1 < gw && y + 1 < gh) busy += Math.abs(v - at(x + 1, y)) + Math.abs(v - at(x, y + 1));
        n++;
      }
    return { busy: busy / Math.max(1, n), lum: lum / Math.max(1, n) };
  };
  const hw = Math.round(gw * 0.48);
  const hh = Math.round(gh * 0.5);
  return { left: zone(0, hw, 0, gh), right: zone(gw - hw, gw, 0, gh), top: zone(0, gw, 0, hh), bottom: zone(0, gw, gh - hh, gh) };
}

/** Construit le document en calques d'une création (géométrie, polices, couleurs garanties lisibles). */
export async function buildAdDocument(i: ComposeInput): Promise<{ doc: AdDocument; images: RenderEnv["images"] }> {
  ensureFonts();
  const { width: W, height: H } = i.format;
  const r = W / H;
  const cls: Cls = r >= 1.4 ? "land" : r > 0.9 ? "square" : r > 0.7 ? "portrait" : "story";
  const tallish = cls === "portrait" || cls === "story";
  const pal = i.palette;
  const art: AdArt = i.art ?? { style: "warm", heading: i.typo.heading, headingWeight: nearestWeight(i.typo.heading, Math.max(i.typo.headingWeight ?? 600, 600)), body: i.typo.body, display: i.typo.heading, displayWeight: nearestWeight(i.typo.heading, 800), uppercase: !!i.typo.uppercase, cta: "pill", arrow: true, cycle: ["editorial"] };
  // Marges : celles de la plateforme, jamais moins que l'air d'une composition soignée.
  const safe = { top: Math.round(H * i.format.safe.top), bottom: Math.round(H * i.format.safe.bottom), side: Math.round(W * i.format.safe.side) };
  const m = { top: Math.max(safe.top, Math.round(H * (cls === "land" ? 0.09 : 0.06))), bottom: Math.max(safe.bottom, Math.round(H * (cls === "land" ? 0.09 : 0.06))), side: Math.max(safe.side, Math.round(W * (cls === "land" ? 0.055 : 0.075))) };
  const images: RenderEnv["images"] = new Map();
  const bgId = i.background ? (i.ids?.background ?? "background") : null;
  const prodId = i.product ? (i.ids?.product ?? "product") : null;
  const logoId = i.logo ? (i.ids?.logo ?? "logo") : null;
  const logoLightId = i.logoLight ? (i.ids?.logoLight ?? "logo-light") : null;
  if (bgId) images.set(bgId, (await loadImage(i.background!)) as never);
  if (prodId) images.set(prodId, (await loadImage(i.product!)) as never);
  if (logoId) images.set(logoId, (await loadImage(i.logo!)) as never);
  if (logoLightId) images.set(logoLightId, (await loadImage(i.logoLight!)) as never);
  // Aplat « band » réservé aux créations sans photo : posé sur une photo, il en masquait le sujet.
  const layout: AdLayout = bgId ? (["typographic", "band"].includes(toAdLayout(i.layout)) ? "editorial" : toAdLayout(i.layout)) : "typographic";
  const zones = bgId && i.background ? await photoZones(i.background, W, H).catch(() => null) : null;
  const layers: Layer[] = [];
  const U = cls === "land" ? H : W;

  // ------------------------------------------------------------------ 1. fond, photo, voile, colonne de texte
  let col: Box;
  let align: TextLayer["align"] = "left";
  let panelColor: string | null = null;
  let productZone: Box;
  let ctaAtBottom = false;
  let titleK: number; // taille du titre en fraction de U
  const photo = (b: Box, anchor: Layer["anchor"]) => layers.push(img("bg-photo", "Photo", "background", b, bgId!, "cover", anchor));
  if (layout === "editorial") {
    photo({ x: 0, y: 0, w: W, h: H }, STRETCH);
    if (cls === "land" || cls === "square") {
      // Texte du côté le plus calme de la photo (le sujet reste visible de l'autre côté).
      const right = !prodId && !!zones && zones.right.busy < zones.left.busy * 0.8;
      const z = zones ? (right ? zones.right : zones.left) : null;
      // Zone claire et calme (intérieur lumineux, ciel, mur) : on garde sa lumière, texte foncé sous un voile léger.
      const airy = !!z && z.lum > 0.62 && z.busy < 0.09;
      const vw = W * (cls === "land" ? 0.66 : 0.78);
      layers.push(shape("scrim", "Voile", "scrim", { x: right ? W - vw : 0, y: 0, w: vw, h: H }, airy ? veil(right ? 180 : 0, pal.light, 0.5) : veil(right ? 180 : 0, pal.dark, 0.74), { h: right ? "right" : "left", v: "stretch" }));
      const cw = W * (cls === "land" ? 0.44 : 0.6);
      col = { x: right ? W - m.side - cw : m.side, y: m.top, w: cw, h: H - m.top - m.bottom };
      productZone = right ? { x: W * 0.04, y: H * 0.16, w: W * 0.42, h: H * 0.78 } : { x: W * 0.54, y: H * 0.16, w: W * 0.42, h: H * 0.78 };
    } else {
      const z = zones?.top ?? null;
      const airy = !!z && z.lum > 0.62 && z.busy < 0.09;
      layers.push(shape("scrim", "Voile", "scrim", { x: 0, y: 0, w: W, h: H * 0.62 }, airy ? veil(90, pal.light, 0.5) : veil(90, pal.dark, 0.72), { h: "stretch", v: "top" }));
      col = { x: m.side, y: m.top + H * (cls === "story" ? 0.04 : 0.01), w: W - m.side * 2, h: H * 0.5 };
      productZone = { x: W * 0.12, y: H * 0.5, w: W * 0.76, h: H * 0.44 - m.bottom * 0.4 };
    }
    titleK = cls === "land" ? 0.125 : cls === "square" ? 0.105 : cls === "portrait" ? 0.11 : 0.118;
  } else if (layout === "poster" || layout === "frame") {
    photo({ x: 0, y: 0, w: W, h: H }, STRETCH);
    const strong = layout === "frame" ? 0.86 : 0.68;
    if (cls === "land") {
      layers.push(shape("scrim", "Voile", "scrim", { x: 0, y: 0, w: W * 0.7, h: H }, veil(0, layout === "frame" ? "#000000" : pal.dark, strong), { h: "left", v: "stretch" }));
      col = { x: m.side, y: m.top, w: W * 0.5, h: H - m.top - m.bottom };
      productZone = { x: W * 0.56, y: H * 0.14, w: W * 0.4, h: H * 0.8 };
    } else {
      layers.push(shape("scrim", "Voile", "scrim", { x: 0, y: 0, w: W, h: H * (cls === "story" ? 0.56 : 0.62) }, veil(90, layout === "frame" ? "#000000" : pal.dark, strong), { h: "stretch", v: "top" }));
      col = { x: m.side, y: m.top + (cls === "story" ? H * 0.02 : 0), w: W - m.side * 2, h: H * 0.56 };
      productZone = { x: W * 0.1, y: H * (cls === "story" ? 0.45 : 0.48), w: W * 0.8, h: H * (cls === "story" ? 0.38 : 0.4) };
    }
    if (layout === "poster" && cls !== "land") align = "center";
    ctaAtBottom = layout === "poster" && tallish;
    if (ctaAtBottom) productZone = { ...productZone, h: productZone.h - H * 0.06 };
    titleK = layout === "poster" ? (cls === "land" ? 0.13 : cls === "square" ? 0.112 : cls === "portrait" ? 0.118 : 0.128) : cls === "land" ? 0.12 : cls === "square" ? 0.1 : 0.106;
  } else if (layout === "panel") {
    panelColor = isDark(pal.light) ? "#F6F3EE" : pal.light;
    let panel: Box;
    let pic: Box;
    if (cls === "land") ((panel = { x: 0, y: 0, w: W * 0.4, h: H }), (pic = { x: W * 0.4, y: 0, w: W * 0.6, h: H }));
    else if (cls === "square") ((panel = { x: 0, y: 0, w: W * 0.47, h: H }), (pic = { x: W * 0.47, y: 0, w: W * 0.53, h: H }));
    else ((panel = { x: 0, y: 0, w: W, h: H * (cls === "story" ? 0.52 : 0.48) }), (pic = { x: 0, y: H * (cls === "story" ? 0.52 : 0.48), w: W, h: H * (cls === "story" ? 0.48 : 0.52) }));
    layers.push(shape("panel", "Panneau", "shape", panel, panelColor, cls === "land" || cls === "square" ? { h: "left", v: "stretch" } : { h: "stretch", v: "top" }));
    layers.push(img("bg-photo", "Photo", "image", pic, bgId!, "cover", cls === "land" || cls === "square" ? { h: "right", v: "stretch" } : { h: "stretch", v: "bottom" }));
    const pad = Math.max(m.side, panel.w * 0.1);
    col = cls === "land" || cls === "square" ? { x: panel.x + pad, y: m.top, w: panel.w - pad * 2, h: H - m.top - m.bottom } : { x: m.side, y: m.top, w: W - m.side * 2, h: panel.h - m.top - H * 0.03 };
    align = "center";
    productZone = { x: pic.x + pic.w * 0.12, y: pic.y + pic.h * 0.12, w: pic.w * 0.76, h: pic.h * 0.8 - (cls === "land" || cls === "square" ? m.bottom * 0.5 : m.bottom) };
    titleK = cls === "land" ? 0.15 : cls === "square" ? 0.095 : cls === "portrait" ? 0.1 : 0.105;
  } else if (layout === "band") {
    photo({ x: 0, y: 0, w: W, h: H }, STRETCH);
    // Couleur franche : la plus vive des couleurs de marque, éclaircie si besoin (le titre très gras s'y pose en sombre).
    const vivid = [pal.accent, pal.secondary, pal.primary].sort((a, b) => satOf(b) - satOf(a))[0];
    // Teinte moyenne (ni texte clair ni texte foncé bien lisible) : éclaircie jusqu'à porter un titre sombre à 6:1.
    // Teinte gardée la plus proche possible : on essaie d'assombrir (titre clair) et d'éclaircir (titre sombre).
    const ok = (c: string) => Math.max(contrast("#111111", c), contrast("#FFFFFF", c)) >= 6;
    const walk = (to: string) => {
      let c = vivid;
      let k = 0;
      for (; k < 6 && !ok(c); k++) c = mix(c, to, 0.18);
      return { c, k };
    };
    const dk = walk("#000000");
    const lt = walk("#FFFFFF");
    const fill = ok(vivid) ? vivid : dk.k <= lt.k ? dk.c : lt.c;
    panelColor = fill;
    const e: Box = cls === "land" ? { x: -W * 0.16, y: -H * 0.56, w: W * 0.72, h: H * 1.56 } : cls === "square" ? { x: -W * 0.34, y: -H * 0.52, w: W * 1.14, h: H * 1.16 } : cls === "portrait" ? { x: -W * 0.42, y: -H * 0.5, w: W * 1.52, h: H * 1.16 } : { x: -W * 0.55, y: -H * 0.42, w: W * 1.85, h: H * 1.0 };
    layers.push(shape("band", "Aplat", "decor", e, fill, { h: "left", v: "top" }, { shape: "ellipse" }));
    col = cls === "land" ? { x: m.side, y: m.top, w: W * 0.44, h: H - m.top - m.bottom } : { x: m.side, y: m.top, w: W * (cls === "story" ? 0.84 : 0.66), h: e.y + e.h - m.top - H * 0.04 };
    productZone = cls === "land" ? { x: W * 0.56, y: H * 0.12, w: W * 0.4, h: H * 0.82 } : { x: W * 0.38, y: H * (cls === "story" ? 0.6 : 0.58), w: W * 0.58, h: H * (cls === "story" ? 0.32 : 0.38) - m.bottom * 0.3 };
    titleK = cls === "land" ? 0.125 : cls === "square" ? 0.112 : cls === "portrait" ? 0.118 : 0.13;
  } else {
    // Typographique (aucune image) : aplat dégradé de la couleur principale, texte centré.
    layers.push(shape("bg-fill", "Fond", "background", { x: 0, y: 0, w: W, h: H }, { type: "linear", angle: 90, stops: [{ offset: 0, color: pal.primary }, { offset: 1, color: mix(pal.primary, pal.dark, 0.4) }] }, STRETCH));
    align = "center";
    col = cls === "land" ? { x: W * 0.12, y: m.top, w: W * 0.76, h: H - m.top - m.bottom } : { x: m.side, y: m.top, w: W - m.side * 2, h: H * (prodId ? 0.42 : 0.8) };
    productZone = cls === "land" ? { x: W * 0.6, y: H * 0.2, w: W * 0.35, h: H * 0.72 } : { x: W * 0.15, y: H * 0.5, w: W * 0.7, h: H * 0.42 - m.bottom * 0.5 };
    if (prodId && cls === "land") ((col = { x: m.side, y: m.top, w: W * 0.5, h: H - m.top - m.bottom }), (align = "left"));
    ctaAtBottom = tallish && !prodId;
    titleK = cls === "land" ? 0.12 : cls === "square" ? 0.1 : 0.11;
  }

  // ------------------------------------------------------------------ 2. produit réel (pixels d'origine), hors texte
  if (prodId) {
    const p = images.get(prodId)!;
    const s = Math.min(productZone.w / p.width, productZone.h / p.height, 1.6);
    const pw = p.width * s;
    const ph = p.height * s;
    layers.push(img("product", "Produit", "product", { x: productZone.x + (productZone.w - pw) / 2, y: productZone.y + productZone.h - ph, w: pw, h: ph }, prodId, "contain", { h: "center", v: "bottom" }, { contactShadow: true }));
  }

  // ------------------------------------------------------------------ 3. couleur du texte (sur ce qui est dessiné dessous)
  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");
  const pre: AdDocument = { version: DOC_VERSION, width: W, height: H, background: pal.light, safe, format: { platform: i.format.platform, aspect: i.format.aspect }, layers, brand: { palette: { ...pal }, fonts: { heading: i.typo.heading, body: i.typo.body }, name: i.brand }, meta: { conceptId: i.conceptId ?? null, source: "engine", createdFrom: null } };
  renderDoc(ctx, pre, { font: serverFont, images });
  const under = panelColor && layout !== "band" ? panelColor : layout === "band" ? panelColor! : avgColor(ctx, { x: col.x, y: col.y, w: col.w, h: Math.min(col.h, H * 0.45) }, W, H);
  const darkUnder = isDark(under);
  // Texte : la plus lisible des deux encres de la marque (claire / sombre), puis ajustée pour 5,5:1 au moins.
  const lightInk = isDark(pal.light) ? "#FFFFFF" : pal.light;
  const darkInk = isDark(pal.dark) ? pal.dark : "#1A1A1A";
  const bestInk = (bg: string) => {
    const pick = contrast(lightInk, bg) >= contrast(darkInk, bg) ? lightInk : darkInk;
    const adj = ensureContrast(pick, bg, 5.5);
    if (contrast(adj, bg) >= 4.6) return adj;
    return contrast("#FFFFFF", bg) >= contrast("#111111", bg) ? "#FFFFFF" : "#111111";
  };
  const ink = bestInk(under);
  const ink2 = ink;

  // ------------------------------------------------------------------ 4. empilement : logo, surtitre, titre, ligne, bouton
  const anchorText: Layer["anchor"] = { h: align === "center" ? "center" : "left", v: "top" };
  let y = col.y;
  const xFor = (w: number) => (align === "center" ? col.x + (col.w - w) / 2 : col.x);
  // Logo (version claire sur fond sombre) ; sans logo, le nom de la marque en capitales espacées.
  const logoH = Math.round(cls === "land" ? H * 0.075 : cls === "story" ? W * 0.07 : W * 0.06);
  const useLight = darkUnder && logoLightId && layout !== "panel" && layout !== "band";
  const lid = useLight ? logoLightId : logoId;
  if (layout === "frame") {
    // Cadre : le surtitre porte le nom ; le logo, s'il existe, signe la création en bas à droite.
    if (lid) {
      const lg = images.get(lid)!;
      const lh0 = logoH * 0.8;
      const lw = Math.min((lg.width / lg.height) * lh0, W * 0.26);
      const lh = (lg.height / lg.width) * lw;
      layers.push(img("logo", "Logo", "logo", { x: W - m.side - lw, y: H - m.bottom - lh, w: lw, h: lh }, lid, "contain", { h: "right", v: "bottom" }));
    }
  } else if (lid) {
    const lg = images.get(lid)!;
    const lw = Math.min((lg.width / lg.height) * logoH, W * (cls === "land" ? 0.22 : 0.36));
    const lh = (lg.height / lg.width) * lw;
    layers.push(img("logo", "Logo", "logo", { x: xFor(lw), y, w: lw, h: lh }, lid, "contain", { h: align === "center" ? "center" : "left", v: "top" }));
    y += lh + U * (layout === "panel" ? 0.035 : 0.06);
  } else {
    const ws = Math.round(Math.max(U * 0.036, 24));
    const wordmark: TextLayer = { ...base("brand", "Marque", "body", { x: col.x, y, w: col.w, h: ws * 1.4 }, anchorText), kind: "text", text: i.brand, font: { family: art.heading, weight: art.headingWeight, size: ws, italic: false }, color: ink, align, lineHeight: 1.2, letterSpacing: Math.round(ws * 0.32), uppercase: true, autoFit: { minSize: 22 }, shadow: null };
    layers.push(wordmark);
    y += ws * 1.4 + U * 0.06;
  }
  if (layout === "panel") {
    // Filet d'accent sous le logo (signature des marques sobres).
    const rw = col.w * 0.22;
    layers.push(shape("rule", "Filet", "decor", { x: col.x + (col.w - rw) / 2, y, w: rw, h: Math.max(2, U * 0.003) }, ensureContrast(pal.accent, under, 2.2), anchorText, { shape: "line", stroke: { color: ensureContrast(pal.accent, under, 2.2), width: Math.max(2, Math.round(U * 0.003)) } }));
    y += U * 0.05;
  }
  if (layout === "frame") {
    const es = Math.round(Math.max(U * 0.024, 22));
    const label = (i.eyebrow || i.brand).trim();
    ctx.font = serverFont(art.body, 600, es, false);
    ctx.letterSpacing = `${Math.round(es * 0.22)}px`;
    const ew = Math.min(ctx.measureText(label.toUpperCase()).width + 4, col.w * 0.7);
    ctx.letterSpacing = "0px";
    layers.push({ ...base("eyebrow", "Surtitre", "body", { x: col.x, y, w: ew, h: es * 1.3 }, anchorText), kind: "text", text: label, font: { family: art.body, weight: 600, size: es, italic: false }, color: ink, align: "left", lineHeight: 1.2, letterSpacing: Math.round(es * 0.22), uppercase: true, autoFit: { minSize: 22 }, shadow: null });
    const lineX = col.x + ew + es;
    const lineW = Math.max(0, (cls === "land" ? col.x + col.w : W - m.side) - lineX);
    if (lineW > es * 2) layers.push(shape("rule", "Filet", "decor", { x: lineX, y: y + es * 0.55, w: lineW, h: 3 }, null, { h: "left", v: "top" }, { shape: "line", stroke: { color: ensureContrast(pal.accent, under, 3), width: 3 } }));
    y += es * 1.3 + U * 0.035;
  }

  // Bouton : mesuré d'abord (le titre s'arrête au-dessus de lui sur les formats hauts).
  const ctaSize = Math.round(Math.max(U * (cls === "land" ? 0.042 : cls === "story" ? 0.036 : 0.032), 24));
  const label = art.arrow ? `${i.cta}  →` : i.cta;
  ctx.font = serverFont(art.body, 600, ctaSize, false);
  const bw = Math.min(ctx.measureText(label).width + ctaSize * 3, col.w);
  const bh = Math.round(ctaSize * 2.5);
  const bottomLimit = layout === "panel" && (cls === "portrait" || cls === "story") ? col.y + col.h : H - m.bottom;
  const ctaBottomY = bottomLimit - bh;

  // Titre (accroche) : grand, graisse franche, interlignage serré, lignes équilibrées.
  // Affiche franche (style « bold ») : titre en capitales condensées de la police d'affiche (« Réveillez le goût. »).
  const heavyTitle = layout === "band" || (layout === "poster" && art.style === "bold");
  const tFamily = heavyTitle ? art.display : art.heading;
  const tWeight = heavyTitle ? art.displayWeight : art.headingWeight;
  const tSize = Math.round(U * titleK);
  const subSize = Math.round(Math.max(U * (cls === "land" ? 0.042 : 0.034), 24));
  const subRoom = i.subline ? subSize * 2.6 + U * 0.025 : 0;
  const roomBottom = ctaAtBottom ? ctaBottomY - U * 0.06 : Math.min(col.y + col.h - bh, ctaBottomY) - U * 0.045 - subRoom;
  const title: TextLayer = { ...base("title", "Titre", "title", { x: col.x, y, w: col.w, h: Math.max(tSize * 1.2, roomBottom - y - (ctaAtBottom ? subRoom : 0)) }, anchorText), kind: "text", text: i.headline, font: { family: tFamily, weight: tWeight, size: tSize, italic: false }, color: ink, align, lineHeight: heavyTitle ? 0.98 : 1.02, letterSpacing: heavyTitle ? -Math.round(tSize * 0.02) : -Math.round(tSize * 0.01), uppercase: art.uppercase && layout !== "editorial", autoFit: { minSize: Math.round(tSize * 0.55) }, shadow: null, balance: true };
  // Trois lignes au plus (quatre en story) : au-delà, le titre se lit comme un paragraphe ; la taille baisse d'abord.
  const maxLines = cls === "story" ? 4 : 3;
  while (title.font.size > tSize * 0.7 && layoutText(ctx, title, { font: serverFont }).lines.length > maxLines) title.font.size = Math.round(title.font.size * 0.94);
  title.autoFit = { minSize: Math.min(title.autoFit!.minSize, Math.round(title.font.size * 0.8)) };
  layers.push(title);
  const fitted = layoutText(ctx, title, { font: serverFont });
  title.h = Math.ceil(fitted.lines.length * fitted.size * title.lineHeight + fitted.size * 0.12);
  y = title.y + title.h + U * 0.035;

  if (i.subline?.trim()) {
    const spaced = layout === "poster" || layout === "frame";
    const sub: TextLayer = { ...base("subline", "Ligne", "subtitle", { x: col.x, y, w: col.w, h: subSize * 2.6 }, anchorText), kind: "text", text: i.subline.trim(), font: { family: art.body, weight: spaced ? 500 : 400, size: subSize, italic: false }, color: ink2, align, lineHeight: 1.25, letterSpacing: spaced ? Math.round(subSize * 0.12) : 0, uppercase: layout === "frame", autoFit: { minSize: 22 }, shadow: null, balance: true };
    // « Conception • Construction • Rénovation » : sur une ligne (taille réduite au besoin), jamais coupée dans un segment.
    if (/ [•·|] /.test(sub.text)) {
      sub.text = sub.text.split(/ ([•·|]) /).map((x, k) => (k % 2 ? ` ${x} ` : x.replace(/ /g, "\u00A0"))).join("");
      while (sub.font.size > Math.max(18, subSize * 0.68) && layoutText(ctx, sub, { font: serverFont }).lines.length > 1) sub.font.size = Math.round(sub.font.size * 0.95);
      sub.autoFit = { minSize: Math.min(22, sub.font.size) };
    }
    layers.push(sub);
    const fs = layoutText(ctx, sub, { font: serverFont });
    sub.h = Math.ceil(fs.lines.length * fs.size * sub.lineHeight);
    y = sub.y + sub.h;
  }

  // Bouton : couleur lisible (panneau : la couleur sombre de la marque ; ailleurs l'accent, ou une pilule claire).
  let fill: string;
  if (layout === "panel" || layout === "band") fill = ensureContrast(isDark(pal.dark) ? pal.dark : "#1A1A1A", under, 4.5);
  else if (layout === "typographic") fill = ensureContrast(pal.light, under, 3);
  else fill = contrast(pal.accent, under) >= 2.6 ? pal.accent : darkUnder ? ensureContrast(pal.light, under, 4.5) : ensureContrast(pal.dark, under, 4.5);
  const btnText0 = onColor(fill);
  const btnText = contrast(btnText0, fill) >= 4.6 ? btnText0 : isDark(fill) ? "#FFFFFF" : "#111111";
  const fillOk = contrast(btnText, fill) >= 4.6 ? fill : ensureContrast(fill, btnText, 4.6);
  const by = ctaAtBottom ? ctaBottomY : Math.min(y + U * (cls === "land" ? 0.06 : 0.045), ctaBottomY);
  const btn: ButtonLayer = { ...base("cta", "Bouton", "cta", { x: xFor(bw), y: by, w: bw, h: bh }, { h: align === "center" ? "center" : "left", v: ctaAtBottom ? "bottom" : "top" }), kind: "button", text: label, font: { family: art.body, weight: 600, size: ctaSize, italic: false }, fill: fillOk, color: btnText, radius: art.cta === "pill" || layout === "poster" || layout === "editorial" || layout === "band" ? bh / 2 : Math.round(bh * 0.16), stroke: null, shadow: layout === "poster" || layout === "frame" ? { color: "rgba(0,0,0,0.28)", blur: Math.round(bh * 0.4), x: 0, y: Math.round(bh * 0.12) } : null };
  layers.push(btn);
  // Lisibilité réelle : chaque texte posé sur la photo est mesuré sur ce qui est dessiné dessous ; si l'un d'eux
  // passe sous 4,6:1, le voile se renforce et s'étend (3 fois au plus) — jamais un texte illisible livré.
  const scrimLayer = layers.find((l): l is ShapeLayer => l.id === "scrim" && l.kind === "shape");
  for (let k = 0; scrimLayer && k < 3; k++) {
    const behind = layers.filter((l) => l.kind !== "text" && l.kind !== "button");
    ctx.clearRect(0, 0, W, H);
    renderDoc(ctx, { ...pre, layers: behind }, { font: serverFont, images });
    const worst = Math.min(...layers.filter((l): l is TextLayer => l.kind === "text").map((t) => contrast(t.color, avgColor(ctx, { x: t.x, y: t.y, w: t.w, h: t.h }, W, H))));
    if (worst >= 4.6) break;
    const f = scrimLayer.fill;
    if (f && typeof f !== "string") scrimLayer.fill = { ...f, stops: f.stops.map((st) => ({ ...st, color: st.color.replace(/,([0-9.]+)\)$/, (_m, a) => `,${Math.min(0.94, Number(a) * 1.3 + (st.offset < 1 ? 0.06 : 0)).toFixed(3)})`) })) };
    if (scrimLayer.anchor.v === "top") scrimLayer.h = Math.min(H, scrimLayer.h * 1.15);
    else scrimLayer.w = Math.min(W, scrimLayer.w * 1.12);
  }
  // Dernier filet : un texte encore sous 4,6:1 (bord d'aplat, zone claire de la photo) prend l'encre la plus lisible
  // sur ce qui est réellement sous lui.
  {
    const behind = layers.filter((l) => l.kind !== "text" && l.kind !== "button");
    ctx.clearRect(0, 0, W, H);
    renderDoc(ctx, { ...pre, layers: behind }, { font: serverFont, images });
    for (const t of layers.filter((l): l is TextLayer => l.kind === "text")) {
      const bg = avgColor(ctx, { x: t.x, y: t.y, w: t.w, h: t.h }, W, H);
      if (contrast(t.color, bg) < 4.6) t.color = bestInk(bg);
    }
  }
  const recipe = { layout, art: art as unknown as Record<string, unknown>, palette: { ...pal }, typo: { heading: i.typo.heading, body: i.typo.body, ...(i.typo.headingWeight ? { headingWeight: i.typo.headingWeight } : {}), ...(i.typo.uppercase ? { uppercase: true } : {}) }, brand: i.brand, eyebrow: i.eyebrow ?? null, logo: logoId, logoLight: logoLightId };
  return { doc: { ...pre, layers, meta: { ...pre.meta, recipe } }, images };
}

/** Calques posés par le moteur : un document qui n'a que ceux-là peut être recomposé dans un autre format. */
const ENGINE_LAYERS = new Set(["bg-photo", "bg-fill", "scrim", "panel", "band", "rule", "product", "logo", "brand", "eyebrow", "title", "subline", "cta"]);

/**
 * Autre format (1:1, 4:5, 9:16, 1,91:1, 16:9…) : la création est RECOMPOSÉE avec sa recette (même composition,
 * mêmes images, textes actuels du client) — colonne, tailles, marges et place du produit refaites pour le format.
 * null si la création n'a pas de recette ou contient des calques ajoutés à la main (l'adaptation géométrique, qui
 * les conserve, prend alors le relais).
 */
export async function relayoutDoc(src: AdDocument, format: FormatSpec, load: (assetId: string) => Buffer | null): Promise<AdDocument | null> {
  const r = src.meta.recipe;
  if (!r || src.layers.some((l) => !ENGINE_LAYERS.has(l.id))) return null;
  const byId = (id: string) => src.layers.find((l) => l.id === id);
  const text = (id: string) => {
    const l = byId(id);
    return l && (l.kind === "text" || l.kind === "button") ? l.text : null;
  };
  const imgId = (id: string) => {
    const l = byId(id);
    return l && l.kind === "image" ? l.assetId : null;
  };
  const art = r.art as unknown as AdArt;
  const cta = (text("cta") ?? "").replace(/\s+→$/, "");
  const bg = imgId("bg-photo");
  const prod = imgId("product");
  const buf = (id: string | null) => (id ? load(id) : null);
  const { doc } = await buildAdDocument({
    format,
    layout: r.layout as AdLayout,
    palette: r.palette as Palette,
    typo: r.typo,
    art,
    brand: r.brand,
    headline: text("title") ?? r.brand,
    subline: text("subline"),
    eyebrow: text("eyebrow") ?? r.eyebrow,
    cta: cta || "OK",
    background: buf(bg),
    product: buf(prod),
    logo: buf(r.logo),
    logoLight: buf(r.logoLight),
    ids: { background: bg, product: prod, logo: r.logo, logoLight: r.logoLight },
    conceptId: src.meta.conceptId,
  });
  return doc;
}

function satOf(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

export async function composeAd(i: ComposeInput): Promise<{ jpg: Buffer; metrics: ComposeMetrics; doc: AdDocument }> {
  const { doc, images } = await buildAdDocument(i);
  const jpg = await renderDocToBuffer(doc, images, "jpeg");
  const m = docMetrics(doc, images);
  return { jpg, metrics: { minFontPx: m.minFontPx, textContrast: m.textContrast, textShare: m.textShare, safeOverflow: m.safeOverflow, productOverlap: m.productOverlap, textOverlap: m.textOverlap, headlineLines: m.headlineLines }, doc };
}
