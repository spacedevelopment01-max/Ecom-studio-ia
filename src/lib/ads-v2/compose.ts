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
import { nearestWeight, toAdLayout, TREATMENT_FILTER, treatmentsFor, type AdArt, type AdLayout, type AdVariant, type LogoPlacement, type Treatment } from "./art";
import type { FormatSpec, VisualConcept } from "./types";
import { buildTemplateDocument, isTemplateLayout } from "./library";

export type ComposeInput = {
  format: FormatSpec;
  /** Composition du moteur, ou modèle de la bibliothèque (« tpl:<id> »). */
  layout: VisualConcept["layout"] | AdLayout | `tpl:${string}`;
  palette: Palette;
  typo: Typo;
  brand: string;
  headline: string;
  /** Ligne secondaire courte (« Café en grains • Torréfaction artisanale »), uniquement des faits confirmés. */
  subline?: string | null;
  /** Surtitre (catégorie, métier) des compositions « cadre ». */
  eyebrow?: string | null;
  cta: string;
  /** Atouts confirmés du produit ou prestations (listes à puces, légendes des modèles « produit »). */
  features?: string[] | null;
  background: Buffer | null;
  product: Buffer | null;
  logo?: Buffer | null;
  /** Version claire du logo (posée sur une photo sombre). */
  logoLight?: Buffer | null;
  art?: AdArt | null;
  /** Assets de la bibliothèque correspondant aux images (le document y fait référence). */
  ids?: { background?: string | null; product?: string | null; logo?: string | null; logoLight?: string | null };
  conceptId?: string | null;
  /** Variante (traitement de la photo, place du logo) : deux créations d'un projet ne se ressemblent pas. */
  variant?: AdVariant | null;
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

/**
 * Point d'intérêt de la photo cadrée (zone la plus détaillée hors de la zone du texte) : la loupe de la composition
 * « détail » en montre un agrandissement. Coordonnées 0-1 dans le cadre.
 */
export async function subjectPoint(buf: Buffer, W: number, H: number, avoid: "left" | "right" | "top"): Promise<{ u: number; v: number }> {
  const gh = 40;
  const gw = Math.max(8, Math.round((gh * W) / H));
  const { data } = await sharp(buf).rotate().resize(gw, gh, { fit: "cover" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const at = (x: number, y: number) => data[Math.min(gh - 1, y) * gw + Math.min(gw - 1, x)] / 255;
  const n = 6;
  let best = { u: avoid === "left" ? 0.72 : avoid === "right" ? 0.28 : 0.5, v: avoid === "top" ? 0.72 : 0.5, e: -1 };
  for (let cy = 0; cy < n; cy++)
    for (let cx = 0; cx < n; cx++) {
      const u = (cx + 0.5) / n;
      const v = (cy + 0.5) / n;
      if ((avoid === "left" && u < 0.5) || (avoid === "right" && u > 0.5) || (avoid === "top" && v < 0.5) || u < 0.12 || u > 0.88 || v < 0.12 || v > 0.88) continue;
      let e = 0;
      const x0 = Math.floor((cx * gw) / n);
      const y0 = Math.floor((cy * gh) / n);
      for (let y = y0; y < Math.floor(((cy + 1) * gh) / n); y++) for (let x = x0; x < Math.floor(((cx + 1) * gw) / n); x++) e += Math.abs(at(x, y) - at(x + 1, y)) + Math.abs(at(x, y) - at(x, y + 1));
      if (e > best.e) best = { u, v, e };
    }
  return { u: best.u, v: best.v };
}

/** Construit le document en calques d'une création (géométrie, polices, couleurs garanties lisibles). */
/**
 * Un espace réservé (« [À compléter : …] ») se relit dans le texte de la publication ; il ne s'imprime jamais sur
 * l'image. Un titre qui n'est qu'un espace réservé est remplacé par le nom de la marque.
 */
const PLACEHOLDER = /\[(?:À|A) compléter[^\]]*\]?|\[To complete[^\]]*\]?/gi;
export function noPlaceholders(i: ComposeInput): ComposeInput {
  const clean = (x: string | null | undefined) => (x == null ? x : x.replace(PLACEHOLDER, "").replace(/\s{2,}/g, " ").replace(/^[\s:·—-]+|[\s:·—-]+$/g, "").trim());
  const headline = clean(i.headline) || i.brand;
  return { ...i, headline, subline: clean(i.subline) || null, eyebrow: clean(i.eyebrow) || null, features: i.features ? i.features.map((f) => clean(f) ?? "").filter(Boolean) : i.features };
}

export async function buildAdDocument(raw: ComposeInput): Promise<{ doc: AdDocument; images: RenderEnv["images"] }> {
  const i = noPlaceholders(raw);
  if (isTemplateLayout(i.layout)) return buildTemplateDocument(i, i.layout.slice(4));
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
  const layout: AdLayout = bgId ? (["typographic", "band"].includes(toAdLayout(i.layout as string)) ? "editorial" : toAdLayout(i.layout as string)) : "typographic";
  const zones = bgId && i.background ? await photoZones(i.background, W, H).catch(() => null) : null;
  const layers: Layer[] = [];
  const U = cls === "land" ? H : W;
  // Traitement de la photo (étalonnage d'affiche, bichromie de la marque) : la photo est travaillée, pas seulement posée.
  const treatment: Treatment = i.variant?.treatment ?? treatmentsFor(layout, art.style)[0];
  const fx: Partial<ImageLayer> = treatment === "duotone" ? { filter: TREATMENT_FILTER.duotone, duotone: { dark: mix(mix(isDark(pal.dark) ? pal.dark : "#1A1A1A", pal.primary, 0.35), "#000000", 0.2), light: mix(isDark(pal.light) ? "#F6F3EE" : pal.light, pal.accent, 0.45) } } : TREATMENT_FILTER[treatment] ? { filter: TREATMENT_FILTER[treatment] } : {};
  const bgImg = bgId ? images.get(bgId)! : null;
  /** Recadrage qui aligne un calque posé en `b` sur la photo plein cadre (verre dépoli : le flou prolonge la photo). */
  const aligned = (b: Box): ImageLayer["crop"] => {
    if (!bgImg) return null;
    const s = Math.max(W / bgImg.width, H / bgImg.height);
    const ox = (W - bgImg.width * s) / 2;
    const oy = (H - bgImg.height * s) / 2;
    return { x: (b.x - ox) / (bgImg.width * s), y: (b.y - oy) / (bgImg.height * s), w: b.w / (bgImg.width * s), h: b.h / (bgImg.height * s) };
  };
  let textRight = false;
  let glass: { img: ImageLayer; tint: ShapeLayer; pad: number } | null = null;
  let card: Box | null = null;

  // ------------------------------------------------------------------ 1. fond, photo, voile, colonne de texte
  let col: Box;
  let align: TextLayer["align"] = "left";
  let panelColor: string | null = null;
  let productZone: Box;
  let ctaAtBottom = false;
  let titleK: number; // taille du titre en fraction de U
  const photo = (b: Box, anchor: Layer["anchor"]) => {
    layers.push(img("bg-photo", "Photo", "background", b, bgId!, "cover", anchor, fx));
    // Ambiance sombre : vignette (les bords s'assombrissent, le regard va au centre).
    if (treatment === "moody") layers.push(shape("vignette", "Vignette", "decor", b, { type: "radial", angle: 0, stops: [{ offset: 0.45, color: "rgba(0,0,0,0)" }, { offset: 1, color: "rgba(0,0,0,0.55)" }] }, anchor));
  };
  if (layout === "editorial" || layout === "detail") {
    photo({ x: 0, y: 0, w: W, h: H }, STRETCH);
    if (cls === "land" || cls === "square") {
      // Texte du côté le plus calme de la photo (le sujet reste visible de l'autre côté).
      const right = !prodId && !!zones && zones.right.busy < zones.left.busy * 0.8;
      textRight = right;
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
  } else if (layout === "glass") {
    // Verre dépoli : le texte dans une carte qui floute la photo (la photo continue dessous, adoucie).
    photo({ x: 0, y: 0, w: W, h: H }, STRETCH);
    const wide = cls === "land";
    const right = wide && !!zones && zones.right.busy < zones.left.busy * 0.8;
    const z = zones ? (wide ? (right ? zones.right : zones.left) : zones.bottom) : null;
    const darkGlass = !z || z.lum < 0.58;
    const cb: Box = wide ? { x: right ? W - m.side - W * 0.44 : m.side, y: m.top, w: W * 0.44, h: H - m.top - m.bottom } : { x: m.side, y: H * (cls === "square" ? 0.36 : 0.44), w: W - m.side * 2, h: H * (cls === "square" ? 0.64 : 0.56) - m.bottom };
    const R = Math.round(U * 0.035);
    const gi = img("glass", "Verre", "decor", cb, bgId!, "cover", wide ? { h: right ? "right" : "left", v: "stretch" } : { h: "stretch", v: "bottom" }, { crop: aligned(cb), radius: R, filter: `blur(${Math.round(U * 0.028)}px) saturate(1.15)` });
    const gt = shape("glass-tint", "Teinte du verre", "decor", cb, darkGlass ? rgba(isDark(pal.dark) ? pal.dark : "#141414", 0.42) : "rgba(255,255,255,0.52)", gi.anchor, { radius: R, stroke: { color: darkGlass ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.7)", width: Math.max(2, Math.round(U * 0.002)) }, shadow: { color: "rgba(0,0,0,0.22)", blur: Math.round(U * 0.04), x: 0, y: Math.round(U * 0.012) } });
    layers.push(gi, gt);
    const pad = Math.round(U * (wide ? 0.06 : 0.055));
    glass = { img: gi, tint: gt, pad };
    col = { x: cb.x + pad, y: cb.y + pad, w: cb.w - pad * 2, h: cb.h - pad * 2 };
    productZone = wide ? (right ? { x: W * 0.06, y: H * 0.14, w: W * 0.4, h: H * 0.8 } : { x: W * 0.54, y: H * 0.14, w: W * 0.4, h: H * 0.8 }) : { x: W * 0.18, y: m.top, w: W * 0.64, h: cb.y - m.top - H * 0.02 };
    titleK = cls === "land" ? 0.1 : cls === "square" ? 0.08 : cls === "portrait" ? 0.088 : 0.098;
  } else if (layout === "bigtype") {
    // Titre géant en capitales sur la photo traitée (bichromie de la marque, noir et blanc) : l'affiche qui arrête le pouce.
    photo({ x: 0, y: 0, w: W, h: H }, STRETCH);
    layers.push(shape("scrim", "Voile", "scrim", { x: 0, y: H * (cls === "land" ? 0.1 : 0.3), w: W, h: H * (cls === "land" ? 0.9 : 0.7) }, veil(270, isDark(pal.dark) ? pal.dark : "#111111", 0.84), { h: "stretch", v: "bottom" }));
    col = { x: m.side, y: m.top, w: cls === "land" ? W * 0.74 : W - m.side * 2, h: H - m.top - m.bottom };
    productZone = cls === "land" ? { x: W * 0.62, y: H * 0.1, w: W * 0.34, h: H * 0.6 } : { x: W * 0.2, y: H * 0.12, w: W * 0.6, h: H * 0.36 };
    titleK = cls === "land" ? 0.17 : cls === "square" ? 0.15 : cls === "portrait" ? 0.155 : 0.165;
  } else if (layout === "capsule" || layout === "tilt") {
    // Photo dans une forme (capsule cerclée ; carte inclinée sur un aplat en diagonale et sa pastille), sur la couleur de la marque.
    const wide = cls === "land" || cls === "square";
    const bgc = layout === "capsule" ? (isDark(pal.primary) || satOf(pal.primary) > 0.35 ? pal.primary : isDark(pal.dark) ? pal.dark : "#1A1A1A") : isDark(pal.light) ? "#F6F3EE" : pal.light;
    panelColor = bgc;
    layers.push(shape("bg-fill", "Fond", "background", { x: 0, y: 0, w: W, h: H }, { type: "radial", angle: 0, stops: [{ offset: 0, color: mix(bgc, "#FFFFFF", 0.08) }, { offset: 1, color: mix(bgc, "#000000", 0.1) }] }, STRETCH));
    const anc: Layer["anchor"] = wide ? { h: "right", v: "middle" } : { h: "center", v: "top" };
    let pic: Box;
    if (layout === "capsule") {
      pic = cls === "land" ? { x: W * 0.6, y: H * 0.08, w: W * 0.31, h: H * 0.84 } : cls === "square" ? { x: W * 0.56, y: H * 0.08, w: W * 0.37, h: H * 0.84 } : { x: W * 0.2, y: m.top, w: W * 0.6, h: H * (cls === "story" ? 0.32 : 0.4) };
      const R = Math.min(pic.w, pic.h) / 2;
      layers.push(shape("ring", "Contour", "decor", { x: pic.x + U * 0.035, y: pic.y + U * (wide ? -0.02 : 0.03), w: pic.w, h: pic.h }, null, anc, { radius: R, stroke: { color: ensureContrast(pal.accent, bgc, 2.2), width: Math.max(3, Math.round(U * 0.005)) } }));
      layers.push(img("bg-photo", "Photo", "image", pic, bgId!, "cover", anc, { radius: R, ...fx }));
      col = wide ? { x: m.side, y: m.top, w: pic.x - m.side - U * 0.08, h: H - m.top - m.bottom } : { x: m.side, y: pic.y + pic.h + H * 0.05, w: W - m.side * 2, h: H - m.bottom - (pic.y + pic.h + H * 0.05) };
      if (!wide) align = "center";
    } else {
      pic = cls === "land" ? { x: W * 0.55, y: H * 0.13, w: W * 0.37, h: H * 0.74 } : cls === "square" ? { x: W * 0.5, y: H * 0.14, w: W * 0.42, h: H * 0.62 } : { x: W * 0.14, y: m.top + H * 0.015, w: W * 0.72, h: H * (cls === "story" ? 0.3 : 0.37) };
      const vivid = [pal.primary, pal.accent, pal.secondary].sort((a, b) => satOf(b) - satOf(a))[0];
      const blockC = contrast(vivid, bgc) >= 1.6 ? vivid : pal.primary;
      layers.push(shape("block", "Aplat", "decor", { x: pic.x + pic.w * 0.22, y: pic.y + pic.h * 0.34, w: pic.w * 0.98, h: pic.h * 0.78 }, blockC, anc, { rotation: 7 }));
      const bd = Math.round(U * 0.016);
      layers.push(shape("card", "Cadre", "decor", { x: pic.x - bd, y: pic.y - bd, w: pic.w + bd * 2, h: pic.h + bd * 2 }, "#FFFFFF", anc, { rotation: -3, radius: Math.round(U * 0.008), shadow: { color: "rgba(0,0,0,0.26)", blur: Math.round(U * 0.04), x: 0, y: Math.round(U * 0.016) } }));
      layers.push(img("bg-photo", "Photo", "image", pic, bgId!, "cover", anc, { rotation: -3, ...fx }));
      card = pic;
      col = wide ? { x: m.side, y: m.top, w: pic.x - m.side - U * 0.09, h: H - m.top - m.bottom } : { x: m.side, y: pic.y + pic.h + H * 0.065, w: W - m.side * 2, h: H - m.bottom - (pic.y + pic.h + H * 0.065) };
    }
    productZone = { x: pic.x + pic.w * 0.1, y: pic.y + pic.h * 0.1, w: pic.w * 0.8, h: pic.h * 0.86 };
    titleK = cls === "land" ? 0.105 : cls === "square" ? 0.078 : cls === "portrait" ? 0.088 : 0.098;
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
  } else if (layout === "lower") {
    // Bas de page : la photo respire en haut, texte en bas sur un dégradé de la couleur sombre de la marque.
    photo({ x: 0, y: 0, w: W, h: H }, STRETCH);
    const sh = H * (cls === "land" ? 0.78 : 0.62);
    layers.push(shape("scrim", "Voile", "scrim", { x: 0, y: H - sh, w: W, h: sh }, veil(270, pal.dark, 0.8), { h: "stretch", v: "bottom" }));
    col = { x: m.side, y: H - sh + H * 0.12, w: cls === "land" ? W * 0.62 : W - m.side * 2, h: sh - H * 0.12 - m.bottom };
    productZone = cls === "land" ? { x: W * 0.62, y: H * 0.1, w: W * 0.34, h: H * 0.8 } : { x: W * 0.18, y: m.top, w: W * 0.64, h: H - sh - m.top + H * 0.08 };
    titleK = cls === "land" ? 0.12 : cls === "square" ? 0.1 : cls === "portrait" ? 0.105 : 0.115;
  } else if (layout === "corner") {
    // Coin (« Changez la lumière. ») : texte élégant et plus petit dans le coin calme de la photo.
    photo({ x: 0, y: 0, w: W, h: H }, STRETCH);
    const wide = cls === "land" || cls === "square";
    const right = wide && !!zones && zones.right.busy <= zones.left.busy;
    const z = zones ? (wide ? (right ? zones.right : zones.left) : zones.top) : null;
    const airy = !!z && z.lum > 0.62 && z.busy < 0.09;
    const vw = W * (wide ? 0.7 : 1);
    const vh = wide ? H : H * 0.55;
    layers.push(shape("scrim", "Voile", "scrim", { x: right ? W - vw : 0, y: 0, w: vw, h: vh }, airy ? veil(wide ? (right ? 180 : 0) : 90, pal.light, 0.45) : veil(wide ? (right ? 180 : 0) : 90, pal.dark, 0.66), wide ? { h: right ? "right" : "left", v: "stretch" } : { h: "stretch", v: "top" }));
    const cw = W * (cls === "land" ? 0.42 : wide ? 0.54 : 0.84);
    col = { x: right ? W - m.side - cw : m.side, y: m.top + (wide ? H * 0.04 : 0), w: cw, h: (wide ? H * 0.72 : H * 0.48) - m.top };
    productZone = wide ? (right ? { x: W * 0.06, y: H * 0.2, w: W * 0.4, h: H * 0.74 } : { x: W * 0.54, y: H * 0.2, w: W * 0.4, h: H * 0.74 }) : { x: W * 0.15, y: H * 0.5, w: W * 0.7, h: H * 0.44 - m.bottom * 0.5 };
    titleK = cls === "land" ? 0.105 : cls === "square" ? 0.085 : cls === "portrait" ? 0.09 : 0.1;
  } else if (layout === "panel") {
    panelColor = isDark(pal.light) ? "#F6F3EE" : pal.light;
    let panel: Box;
    let pic: Box;
    if (cls === "land") ((panel = { x: 0, y: 0, w: W * 0.4, h: H }), (pic = { x: W * 0.4, y: 0, w: W * 0.6, h: H }));
    else if (cls === "square") ((panel = { x: 0, y: 0, w: W * 0.47, h: H }), (pic = { x: W * 0.47, y: 0, w: W * 0.53, h: H }));
    else ((panel = { x: 0, y: 0, w: W, h: H * (cls === "story" ? 0.52 : 0.48) }), (pic = { x: 0, y: H * (cls === "story" ? 0.52 : 0.48), w: W, h: H * (cls === "story" ? 0.48 : 0.52) }));
    layers.push(shape("panel", "Panneau", "shape", panel, panelColor, cls === "land" || cls === "square" ? { h: "left", v: "stretch" } : { h: "stretch", v: "top" }));
    layers.push(img("bg-photo", "Photo", "image", pic, bgId!, "cover", cls === "land" || cls === "square" ? { h: "right", v: "stretch" } : { h: "stretch", v: "bottom" }, fx));
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

  // Loupe (« détail ») : un agrandissement cerclé de la zone la plus détaillée de la photo, posé à l'opposé du sujet.
  if (layout === "detail" && bgImg && !prodId) {
    const wide = cls === "land" || cls === "square";
    const pt = await subjectPoint(i.background!, W, H, wide ? (textRight ? "right" : "left") : "top").catch(() => ({ u: 0.7, v: 0.7 }));
    const d = Math.round(cls === "land" ? H * 0.5 : cls === "square" ? W * 0.36 : W * 0.42);
    const lx = wide ? (textRight ? m.side + W * 0.02 : W - m.side - d - W * 0.02) : pt.u > 0.5 ? m.side : W - m.side - d;
    const box: Box = { x: lx, y: H - m.bottom - d - (wide ? H * 0.02 : 0), w: d, h: d };
    const s = Math.max(W / bgImg.width, H / bgImg.height);
    const vw = W / s;
    const vh = H / s;
    const cs = Math.min(vw, vh) / 2.4;
    const sx = Math.max(0, Math.min(bgImg.width - cs, (bgImg.width - vw) / 2 + pt.u * vw - cs / 2));
    const sy = Math.max(0, Math.min(bgImg.height - cs, (bgImg.height - vh) / 2 + pt.v * vh - cs / 2));
    const ring = Math.max(6, Math.round(U * 0.01));
    const anc: Layer["anchor"] = { h: lx > W / 2 ? "right" : "left", v: "bottom" };
    layers.push(shape("detail-ring", "Contour de la loupe", "decor", { x: box.x - ring, y: box.y - ring, w: d + ring * 2, h: d + ring * 2 }, isDark(pal.light) ? "#FFFFFF" : pal.light, anc, { shape: "ellipse", shadow: { color: "rgba(0,0,0,0.3)", blur: Math.round(U * 0.03), x: 0, y: Math.round(U * 0.01) } }));
    layers.push(img("detail", "Détail", "image", box, bgId!, "cover", anc, { radius: d / 2, crop: { x: sx / bgImg.width, y: sy / bgImg.height, w: cs / bgImg.width, h: cs / bgImg.height }, ...fx }));
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
  const logoH = Math.round(cls === "land" ? H * 0.11 : cls === "story" ? W * 0.105 : W * 0.09);
  const useLight = darkUnder && logoLightId && layout !== "panel" && layout !== "band";
  const lid = useLight ? logoLightId : logoId;
  // Place du logo : colonne (par défaut), coin opposé au texte, ou signature au pied (titres posés en bas).
  const logoMode: LogoPlacement = logoId && i.variant?.logo && i.variant.logo !== "column" && ["editorial", "detail", "lower", "bigtype", "corner"].includes(layout) && !(i.variant.logo === "foot" && !["lower", "bigtype"].includes(layout)) ? i.variant.logo : "column";
  if (logoMode !== "column") {
    // Posé plus bas, une fois le bouton placé (le logo ne doit jamais le toucher).
    if (logoMode === "corner" && !["lower", "bigtype"].includes(layout) && cls !== "land" && cls !== "square") y += logoH + U * 0.05;
  } else if (layout === "frame") {
    // Cadre : le surtitre porte le nom ; le logo, s'il existe, signe la création en bas à droite.
    if (lid) {
      const lg = images.get(lid)!;
      const lh0 = logoH * 0.8;
      const lw = Math.min((lg.width / lg.height) * lh0, W * 0.36);
      const lh = (lg.height / lg.width) * lw;
      layers.push(img("logo", "Logo", "logo", { x: W - m.side - lw, y: H - m.bottom - lh, w: lw, h: lh }, lid, "contain", { h: "right", v: "bottom" }));
    }
  } else if (lid) {
    const lg = images.get(lid)!;
    const lw = Math.min((lg.width / lg.height) * logoH, W * (cls === "land" ? 0.3 : 0.5));
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
  const heavyTitle = layout === "band" || layout === "bigtype" || (layout === "poster" && art.style === "bold");
  const tFamily = heavyTitle ? art.display : art.heading;
  const tWeight = heavyTitle ? art.displayWeight : art.headingWeight;
  const tSize = Math.round(U * titleK);
  const subSize = Math.round(Math.max(U * (cls === "land" ? 0.042 : 0.034), 24));
  const subRoom = i.subline ? subSize * 2.6 + U * 0.025 : 0;
  const roomBottom = ctaAtBottom ? ctaBottomY - U * 0.06 : Math.min(col.y + col.h - bh, ctaBottomY) - U * 0.045 - subRoom;
  const title: TextLayer = { ...base("title", "Titre", "title", { x: col.x, y, w: col.w, h: Math.max(tSize * 1.2, roomBottom - y - (ctaAtBottom ? subRoom : 0)) }, anchorText), kind: "text", text: i.headline, font: { family: tFamily, weight: tWeight, size: tSize, italic: false }, color: ink, align, lineHeight: layout === "bigtype" ? 0.92 : heavyTitle ? 0.98 : 1.02, letterSpacing: heavyTitle ? -Math.round(tSize * 0.02) : -Math.round(tSize * 0.01), uppercase: layout === "bigtype" || (art.uppercase && layout !== "editorial"), autoFit: { minSize: Math.round(tSize * 0.55) }, shadow: null, balance: true };
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
  const btn: ButtonLayer = { ...base("cta", "Bouton", "cta", { x: xFor(bw), y: by, w: bw, h: bh }, { h: align === "center" ? "center" : "left", v: ctaAtBottom ? "bottom" : "top" }), kind: "button", text: label, font: { family: art.body, weight: 600, size: ctaSize, italic: false }, fill: fillOk, color: btnText, radius: layout === "bigtype" ? 0 : layout === "tilt" ? Math.round(bh * 0.12) : art.cta === "pill" || ["poster", "editorial", "band", "capsule", "glass"].includes(layout) ? bh / 2 : Math.round(bh * 0.16), stroke: null, shadow: ["poster", "frame", "tilt", "bigtype"].includes(layout) ? { color: "rgba(0,0,0,0.28)", blur: Math.round(bh * 0.4), x: 0, y: Math.round(bh * 0.12) } : null };
  layers.push(btn);
  // Bas de page : le bloc de texte est posé au bas de l'image (au-dessus de la marge), pas en haut du dégradé.
  if (layout === "lower") {
    const moving = layers.filter((l) => ["brand", "logo", "title", "subline", "cta", "rule", "eyebrow"].includes(l.id));
    const bottom = Math.max(...moving.map((l) => l.y + l.h));
    const dy = Math.max(0, H - m.bottom - bottom);
    for (const l of moving) l.y += dy;
  }
  // Loupe : jamais sur le texte ni le bouton (formats hauts) ; elle descend sous eux, réduite au besoin.
  {
    const lp = layers.find((l): l is ImageLayer => l.id === "detail" && l.kind === "image");
    const rg = layers.find((l) => l.id === "detail-ring");
    if (lp && rg && (cls === "portrait" || cls === "story")) {
      const texts = layers.filter((l) => ["title", "subline", "cta"].includes(l.id));
      const minY = Math.max(...texts.map((l) => l.y + l.h)) + U * 0.05;
      if (lp.y < minY) {
        const ring = lp.x - rg.x;
        const d = Math.max(U * 0.24, Math.min(lp.w, H - m.top * 0.4 - minY));
        lp.x = lp.x > W / 2 ? W - m.side - d : m.side;
        Object.assign(lp, { y: minY, w: d, h: d, radius: d / 2 });
        Object.assign(rg, { x: lp.x - ring, y: minY - ring, w: d + ring * 2, h: d + ring * 2 });
      }
    }
  }
  // Titre géant : le titre, la ligne et le bouton descendent en bas ; le logo reste en haut.
  if (layout === "bigtype") {
    const moving = layers.filter((l) => ["title", "subline", "cta"].includes(l.id));
    const dy = Math.max(0, H - m.bottom - Math.max(...moving.map((l) => l.y + l.h)));
    for (const l of moving) l.y += dy;
  }
  // Verre dépoli : la carte épouse son contenu (posée en bas, ou centrée sur un format paysage).
  if (glass) {
    const content = layers.filter((l) => ["brand", "logo", "title", "subline", "cta"].includes(l.id));
    const top = Math.min(...content.map((l) => l.y));
    const bottom = Math.max(...content.map((l) => l.y + l.h));
    const ch = bottom - top + glass.pad * 2;
    const cy = cls === "land" ? (H - ch) / 2 : H - m.bottom - ch;
    for (const l of content) l.y += cy + glass.pad - top;
    for (const l of [glass.img, glass.tint]) ((l.y = cy), (l.h = ch));
    glass.img.crop = aligned(glass.img);
  }
  // Pastille (carte inclinée) : un mot court du métier ou de la ligne, en cercle tourné, au coin de la photo.
  if (layout === "tilt" && card) {
    const segs = (i.subline ?? "").split(/\s+[•·|]\s+/).map((x) => x.trim()).filter(Boolean);
    const word = [i.eyebrow?.trim() ?? "", segs[0] ?? ""].find((x) => x && x.length <= 20) ?? "";
    if (word) {
      const d = Math.round(U * (cls === "land" ? 0.26 : 0.2));
      const wide = cls === "land" || cls === "square";
      const cx = Math.min(W - m.side - d / 2, card.x + card.w - d * (wide ? 0.2 : 0.35));
      const cy = wide ? Math.max(m.top + d / 2, card.y + d * 0.1) : card.y + card.h - d * 0.15;
      const vivid = [pal.accent, pal.secondary, pal.primary].sort((a, b) => satOf(b) - satOf(a))[0];
      const sf = contrast(vivid, "#FFFFFF") >= 1.4 ? vivid : pal.dark;
      layers.push(shape("sticker", "Pastille", "decor", { x: cx - d / 2, y: cy - d / 2, w: d, h: d }, sf, { h: "right", v: "top" }, { shape: "ellipse", rotation: 10, shadow: { color: "rgba(0,0,0,0.22)", blur: Math.round(d * 0.12), x: 0, y: Math.round(d * 0.04) } }));
      const ss = Math.max(22, Math.round(d * 0.12));
      const st: TextLayer = { ...base("sticker-text", "Texte de la pastille", "body", { x: cx - d * 0.36, y: cy - ss * 1.2, w: d * 0.72, h: ss * 2.4 }, { h: "right", v: "top" }), kind: "text", text: word, font: { family: art.body, weight: 700, size: ss, italic: false }, color: bestInk(sf), align: "center", lineHeight: 1.1, letterSpacing: Math.round(ss * 0.06), uppercase: true, autoFit: { minSize: 22 }, shadow: null, rotation: 10, balance: true };
      const lt = layoutText(ctx, st, { font: serverFont });
      st.h = Math.ceil(lt.lines.length * lt.size * st.lineHeight);
      st.y = cy - st.h / 2;
      layers.push(st);
    }
  }
  // Logo hors colonne : coin opposé au texte, ou signature au pied à droite (jamais sur le bouton).
  if (logoMode !== "column" && logoId) {
    const lg0 = images.get(logoId)!;
    const lw = Math.min((lg0.width / lg0.height) * logoH, W * (cls === "land" ? 0.3 : 0.44));
    const lh = (lg0.height / lg0.width) * lw;
    const wide = cls === "land" || cls === "square";
    // Formats larges : le coin opposé tomberait sur le sujet de la photo ; le logo signe le pied du côté du texte.
    const right = wide && !["lower", "bigtype"].includes(layout) ? textRight : true;
    let at: Box = { x: right ? W - m.side - lw : m.side, y: m.top, w: lw, h: lh };
    if (wide && logoMode === "corner" && !["lower", "bigtype"].includes(layout)) {
      at = { x: textRight ? W - m.side - lw : m.side, y: H - m.bottom - lh, w: lw, h: lh };
      const hit = layers.some((l) => ["cta", "subline", "title"].includes(l.id) && l.y + l.h > at.y - U * 0.03);
      if (hit) at = { x: textRight ? m.side : W - m.side - lw, y: m.top, w: lw, h: lh };
    }
    if (logoMode === "foot") {
      at = { x: W - m.side - lw, y: H - m.bottom - lh, w: lw, h: lh };
      const hit = layers.some((l) => ["cta", "subline", "title"].includes(l.id) && l.x < at.x + at.w + U * 0.03 && l.x + l.w > at.x - U * 0.03 && l.y < at.y + at.h && l.y + l.h > at.y);
      if (hit) at = { x: W - m.side - lw, y: m.top, w: lw, h: lh };
    }
    const spot = isDark(avgColor(ctx, at, W, H));
    const id = spot && logoLightId ? logoLightId : logoId;
    const lg = images.get(id)!;
    const h2 = (lg.height / lg.width) * lw;
    layers.push(img("logo", "Logo", "logo", { ...at, h: h2, y: at.y === m.top ? at.y : H - m.bottom - h2 }, id, "contain", { h: at.x > W / 2 ? "right" : "left", v: at.y === m.top ? "top" : "bottom" }));
  }
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
  const recipe = { layout, art: art as unknown as Record<string, unknown>, palette: { ...pal }, typo: { heading: i.typo.heading, body: i.typo.body, ...(i.typo.headingWeight ? { headingWeight: i.typo.headingWeight } : {}), ...(i.typo.uppercase ? { uppercase: true } : {}) }, brand: i.brand, eyebrow: i.eyebrow ?? null, logo: logoId, logoLight: logoLightId, variant: { treatment, logo: logoMode } };
  return { doc: { ...pre, layers, meta: { ...pre.meta, recipe } }, images };
}

/** Calques posés par le moteur : un document qui n'a que ceux-là peut être recomposé dans un autre format. */
const ENGINE_LAYERS = new Set(["bg-photo", "bg-fill", "scrim", "panel", "band", "rule", "product", "logo", "brand", "eyebrow", "title", "subline", "cta", "cta-line", "vignette", "ring", "block", "card", "sticker", "sticker-text", "detail", "detail-ring", "glass", "glass-tint"]);

/**
 * Autre format (1:1, 4:5, 9:16, 1,91:1, 16:9…) : la création est RECOMPOSÉE avec sa recette (même composition,
 * mêmes images, textes actuels du client) — colonne, tailles, marges et place du produit refaites pour le format.
 * null si la création n'a pas de recette ou contient des calques ajoutés à la main (l'adaptation géométrique, qui
 * les conserve, prend alors le relais).
 */
export async function relayoutDoc(src: AdDocument, format: FormatSpec, load: (assetId: string) => Buffer | null): Promise<AdDocument | null> {
  return recomposeDoc(src, format, load);
}

/**
 * Même création dans une autre composition (modèle de la bibliothèque, schéma de couleurs, traitement de la
 * photo) : textes actuels du client, mêmes images, même format. null si la création n'a pas de recette.
 */
export async function restyleDoc(src: AdDocument, o: { layout?: string; variant?: AdVariant }, load: (assetId: string) => Buffer | null): Promise<AdDocument | null> {
  const r = src.meta.recipe;
  if (!r) return null;
  const format: FormatSpec = { platform: (src.format.platform ?? "meta_feed") as FormatSpec["platform"], aspect: src.format.aspect as FormatSpec["aspect"], width: src.width, height: src.height, label: src.format.aspect, safe: { top: src.safe.top / src.height, bottom: src.safe.bottom / src.height, side: src.safe.side / src.width } };
  return recomposeDoc(src, format, load, { layout: o.layout ?? r.layout, variant: { ...(r.variant as AdVariant | undefined), ...o.variant }, force: true });
}

async function recomposeDoc(src: AdDocument, format: FormatSpec, load: (assetId: string) => Buffer | null, over?: { layout: string; variant: AdVariant; force: boolean }): Promise<AdDocument | null> {
  const r = src.meta.recipe;
  const tpl = !!r && isTemplateLayout(r.layout);
  if (!r || (!over?.force && !tpl && src.layers.some((l) => !ENGINE_LAYERS.has(l.id)))) return null;
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
  // Photo de la création : celle du fond, sinon la photo d'un modèle (cadrée dans une forme).
  const bg = imgId("bg-photo") ?? (src.layers.find((l) => l.kind === "image" && l.role !== "logo" && l.role !== "product" && !!l.assetId) as { assetId: string } | undefined)?.assetId ?? null;
  const prod = imgId("product");
  const buf = (id: string | null) => (id ? load(id) : null);
  const { doc } = await buildAdDocument({
    format,
    layout: (over?.layout ?? r.layout) as AdLayout,
    palette: r.palette as Palette,
    typo: r.typo,
    art,
    brand: r.brand,
    headline: text("title") ?? r.brand,
    subline: text("subline"),
    eyebrow: (byId("eyebrow") && text("eyebrow")) || r.eyebrow,
    cta: cta || "OK",
    background: buf(bg),
    product: buf(prod),
    logo: buf(r.logo),
    logoLight: buf(r.logoLight),
    ids: { background: bg, product: prod, logo: r.logo, logoLight: r.logoLight },
    conceptId: src.meta.conceptId,
    variant: over?.variant ?? (r.variant as AdVariant | undefined) ?? null,
  });
  // Modèle de la bibliothèque : un calque ajouté ou modifié à la main qui n'existe pas dans la composition refaite
  // est gardé par l'adaptation géométrique (relayout refusé).
  if (!over?.force && tpl && src.layers.some((l) => l.userEdited && !doc.layers.some((n) => n.id === l.id))) return null;
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
