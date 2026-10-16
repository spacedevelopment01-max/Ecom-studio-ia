/**
 * ÉTAPE 2 LOCALE (choix du propriétaire, gratuite) : sur la PHOTO créée par l'IA sans aucun texte (Qwen-Image), le
 * studio pose lui-même les textes exacts, le bouton et le vrai logo, en suivant le guide du moteur d'images :
 *  - tailles en px pour 1 080 px de large (accroche 72–112, titre secondaire 48–68, bouton 36–48), deux familles de
 *    police (titres / textes de la marque), deux ou trois niveaux ;
 *  - marges 60–90 px ; texte dans la ZONE CALME de la photo (mesurée), jamais sur le produit ; zone choisie selon la
 *    composition de la direction artistique (asymétrique → côté, éditoriale/centrée → haut ou bas) ;
 *  - contraste ≥ 4,5:1 mesuré sur la photo ; sinon dégradé doux local (jamais une bande pleine) ;
 *  - un seul accent (le bouton) ; le vrai logo du projet (version claire sur fond sombre), petit, dans le coin opposé.
 * Le résultat est un document à calques (modifiable dans l'éditeur visuel) : texte exact par construction.
 */
import { contrast } from "../color";
import type { Project } from "../projects";
import type { AdDocument, ButtonLayer, ImageLayer, Layer, ShapeLayer, TextLayer } from "../ad-doc/types";
import { DOC_VERSION } from "../ad-doc/types";
import { photoZones, type PhotoZones } from "../ads-v2/compose";
import { posterFormat, type PosterAspect } from "../ads-v2/poster";
import { brandTypo, palette } from "../engine/images";
import { loadImageGuide, type ImageCreativeGuide, type ImagePurpose } from "./image-guide";

export type Side = "top" | "bottom" | "left" | "right";
export type TextOnPhotoInput = {
  photo: Buffer;
  photoAssetId: string;
  aspect: PosterAspect;
  purpose: ImagePurpose;
  texts: { hook: string; secondary?: string | null; cta?: string | null };
  /** Composition de la direction artistique (oriente le choix de la zone du texte). */
  composition?: string;
  logo?: { assetId: string; data: Buffer; light?: { assetId: string; data: Buffer } | null } | null;
  guide?: ImageCreativeGuide;
};

const base = (id: string, role: Layer["role"], name: string, x: number, y: number, w: number, h: number): Omit<Layer, "kind"> & { id: string } =>
  ({ id, role, name, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), rotation: 0, opacity: 1, visible: true, locked: false, anchor: { h: "stretch", v: "stretch" } }) as never;

/** Côtés préférés selon la composition (le plus calme l'emporte ensuite). */
function preferred(composition = ""): Side[] {
  if (/asym|diagonal/i.test(composition)) return ["left", "right", "top", "bottom"];
  if (/centr|éditorial|editorial|nature morte/i.test(composition)) return ["top", "bottom", "left", "right"];
  return ["top", "bottom", "left", "right"];
}

/** Zone calme : la moins chargée, avec une petite préférence pour l'ordre de la composition. */
export function pickSide(z: PhotoZones, composition?: string): Side {
  const order = preferred(composition);
  return order.map((s, k) => ({ s, score: z[s].busy * (1 + k * 0.08) })).sort((a, b) => a.score - b.score)[0].s;
}

/**
 * Place libre de chaque côté : profondeur (0-1 de la hauteur ou de la largeur) depuis le bord jusqu'au premier détail
 * (le produit, un objet). Le texte n'est posé que dans cette place libre : jamais sur le produit.
 */
export async function freeSpace(buf: Buffer, W: number, H: number): Promise<Record<Side, number>> {
  const sharp = (await import("sharp")).default;
  const gh = 64;
  const gw = Math.max(8, Math.round((gh * W) / H));
  const { data } = await sharp(buf).rotate().resize(gw, gh, { fit: "cover" }).greyscale().blur(0.6).raw().toBuffer({ resolveWithObject: true });
  const at = (x: number, y: number) => data[y * gw + x] / 255;
  const edge = (x: number, y: number) => (x + 1 < gw ? Math.abs(at(x, y) - at(x + 1, y)) : 0) + (y + 1 < gh ? Math.abs(at(x, y) - at(x, y + 1)) : 0);
  const busy = (cells: [number, number][]) => cells.filter(([x, y]) => edge(x, y) > 0.045).length / Math.max(1, cells.length);
  const row = (y: number) => Array.from({ length: gw }, (_, x) => [x, y] as [number, number]);
  const col = (x: number) => Array.from({ length: gh }, (_, y) => [x, y] as [number, number]);
  const depth = (n: number, cells: (k: number) => [number, number][]) => {
    let k = 0;
    while (k < n && busy(cells(k)) < 0.035) k++;
    return k / n;
  };
  return { top: depth(gh, (k) => row(k)), bottom: depth(gh, (k) => row(gh - 1 - k)), left: depth(gw, (k) => col(k)), right: depth(gw, (k) => col(gw - 1 - k)) };
}

/** Taille de l'accroche dans la plage du guide : plus le texte est long, plus elle se rapproche du minimum. */
export const hookPx = (text: string, g: ImageCreativeGuide) => (text.length <= 16 ? g.text.hook.max - 4 : text.length <= 28 ? Math.round((g.text.hook.min + g.text.hook.max) / 2) : g.text.hook.min + 6);

const toHex = (v: number) => Math.round(Math.max(0, Math.min(255, v * 255))).toString(16).padStart(2, "0");

export async function textOnPhotoDoc(p: Project, i: TextOnPhotoInput): Promise<{ doc: AdDocument; side: Side; ink: string; scrim: boolean }> {
  const g = i.guide ?? loadImageGuide();
  const f = posterFormat(i.aspect);
  const W = f.width;
  const H = f.height;
  const s = W / 1080;
  const margin = Math.round(((g.layout.marginPx.min + g.layout.marginPx.max) / 2) * s);
  const pal = palette(p);
  const typo = brandTypo(p);
  const z = await photoZones(i.photo, W, H);
  const free = await freeSpace(i.photo, W, H);
  // Place nécessaire : bloc de texte (haut/bas) ou colonne de 42 % (côtés) ; le côté qui l'offre le mieux l'emporte,
  // la composition de la direction artistique départage.
  const needH = 0.36;
  const needW = 0.42;
  const order = preferred(i.composition);
  const side = order.map((sd, k) => ({ sd, fit: free[sd] / (sd === "left" || sd === "right" ? needW : needH) - k * 0.04 })).sort((a, b) => b.fit - a.fit)[0].sd;
  const room = free[side] / (side === "left" || side === "right" ? needW : needH);
  const zone = z[side];
  // Encre : sombre (charte) sur une zone claire, claire sur une zone sombre ; contraste mesuré contre le gris moyen.
  const zoneGrey = `#${toHex(zone.lum).repeat(3)}`;
  const dark = pal.dark;
  const light = pal.light && contrast(pal.light, dark) >= 4.5 ? pal.light : "#FFFFFF";
  const ink = contrast(dark, zoneGrey) >= contrast(light, zoneGrey) ? dark : light;
  // Place libre insuffisante (produit qui remplit le cadre) ou contraste faible : dégradé doux depuis le bord.
  const scrim = contrast(ink, zoneGrey) < g.colors.minContrast || room < 1;
  const purpose = g.purposes[i.purpose];
  const showSecondary = purpose.text === "full" && !!i.texts.secondary?.trim();
  const showCta = purpose.cta && !!i.texts.cta?.trim();
  // Place étroite : tailles ramenées vers le minimum du guide (jamais en dessous).
  const tight = room < 1;
  const hook = Math.round((tight ? g.text.hook.min + 4 : hookPx(i.texts.hook, g)) * s);
  const sec = Math.round(((g.text.secondary.min + g.text.secondary.max) / 2) * s);
  const ctaPx = Math.round(((g.text.cta.min + g.text.cta.max) / 2) * s);
  const vertical = side === "left" || side === "right";
  const boxW = vertical ? Math.max(W * 0.34, Math.min(W * 0.5, free[side] * W) - margin) : W - 2 * margin;
  const x0 = side === "right" ? W - margin - boxW : margin;
  const align: TextLayer["align"] = vertical ? "left" : /centr/i.test(i.composition ?? "") ? "center" : "left";
  const hookH = Math.round(hook * 1.08 * (i.texts.hook.length > 22 ? 3 : 2));
  const secH = showSecondary ? Math.round(sec * 1.25 * 2) : 0;
  const ctaH = showCta ? Math.round(ctaPx * 2.4) : 0;
  const gap = Math.round(28 * s);
  const blockH = hookH + (secH ? gap + secH : 0) + (ctaH ? gap * 1.4 + ctaH : 0);
  const y0 = side === "bottom" ? H - f.safe.bottom - margin - blockH : side === "top" ? f.safe.top + margin : Math.round((H - blockH) / 2);
  const layers: Layer[] = [];
  layers.push({ ...base("photo", "image", "Photo (IA)", 0, 0, W, H), kind: "image", assetId: i.photoAssetId, fit: "cover", crop: null, radius: 0, shadow: null } as ImageLayer);
  if (scrim) {
    // Dégradé doux du bord de la zone vers la photo (jamais une bande pleine).
    const tint = ink === dark ? (pal.light ?? "#FFFFFF") : (pal.dark ?? "#000000");
    // Opaque au bord de l'image, transparent vers le produit (rendu : 0° = gauche→droite, 90° = haut→bas).
    const angle = side === "top" ? 90 : side === "bottom" ? 270 : side === "left" ? 0 : 180;
    const sw = vertical ? W * 0.62 : W;
    const sh = vertical ? H : Math.min(H, blockH + margin * 3.2);
    const sx = side === "right" ? W - sw : 0;
    const sy = side === "bottom" ? H - sh : 0;
    layers.push({ ...base("scrim", "scrim", "Dégradé de lisibilité", sx, sy, sw, sh), kind: "shape", shape: "rect", fill: { type: "linear", angle, stops: [{ offset: 0, color: `${tint}D8` }, { offset: 0.55, color: `${tint}80` }, { offset: 1, color: `${tint}00` }] }, stroke: null, radius: 0, shadow: null } as ShapeLayer);
  }
  let y = y0;
  layers.push({ ...base("title", "title", "Accroche", x0, y, boxW, hookH), kind: "text", text: i.texts.hook.trim(), font: { family: typo.heading, weight: typo.headingWeight ?? 600, size: hook, italic: false }, color: ink, align, lineHeight: 1.04, letterSpacing: 0, uppercase: !!typo.uppercase, autoFit: { minSize: Math.round(g.text.hook.min * s) }, shadow: null, balance: true } as TextLayer);
  y += hookH;
  if (showSecondary) {
    y += gap;
    layers.push({ ...base("subtitle", "subtitle", "Titre secondaire", x0, y, boxW, secH), kind: "text", text: i.texts.secondary!.trim(), font: { family: typo.body, weight: 400, size: sec, italic: false }, color: ink, align, lineHeight: 1.2, letterSpacing: 0, uppercase: false, autoFit: { minSize: Math.round(g.text.secondary.min * s) }, shadow: null } as TextLayer);
    y += secH;
  }
  if (showCta) {
    y += Math.round(gap * 1.4);
    const label = i.texts.cta!.trim();
    const bw = Math.round(Math.min(boxW, ctaPx * 0.62 * label.length + ctaPx * 2.2));
    const bx = align === "center" ? x0 + (boxW - bw) / 2 : x0;
    const accent = pal.accent;
    const btnInk = contrast("#FFFFFF", accent) >= contrast(pal.dark, accent) ? "#FFFFFF" : pal.dark;
    layers.push({ ...base("cta", "cta", "Bouton", bx, y, bw, ctaH), kind: "button", text: label, font: { family: typo.body, weight: 600, size: ctaPx, italic: false }, fill: accent, color: btnInk, radius: Math.round(ctaH / 2), stroke: null, shadow: null } as ButtonLayer);
  }
  if (i.logo) {
    // Coin opposé au texte, petit (≈ 16 % de la largeur), version claire sur une zone sombre.
    const lw = Math.round(W * 0.16);
    const lh = lw;
    // Texte en haut → logo en bas à droite ; en bas → en haut à droite ; à gauche → en haut à droite ; à droite → en haut à gauche.
    const corner = side === "top" ? { h: "right", v: "bottom" } : side === "right" ? { h: "left", v: "top" } : { h: "right", v: "top" };
    const lx = corner.h === "right" ? W - margin - lw : margin;
    const ly = corner.v === "top" ? f.safe.top + Math.round(margin * 0.6) : H - f.safe.bottom - Math.round(margin * 0.6) - lh;
    const opposite: Side = corner.v === "top" ? "top" : "bottom";
    const zl = z[opposite as Side].lum;
    const use = zl < 0.45 && i.logo.light ? i.logo.light : i.logo;
    layers.push({ ...base("logo", "logo", "Logo", lx, ly, lw, lh), kind: "image", assetId: use.assetId, fit: "contain", crop: null, radius: 0, shadow: null } as ImageLayer);
  }
  const doc: AdDocument = {
    version: DOC_VERSION,
    width: W,
    height: H,
    background: pal.dark,
    safe: f.safe,
    format: { platform: f.platform, aspect: i.aspect },
    layers,
    brand: { palette: { dark: pal.dark, light: pal.light, primary: pal.primary, accent: pal.accent }, fonts: { heading: typo.heading, body: typo.body }, name: p.brand?.name ?? p.name },
    meta: { conceptId: null, source: "engine", createdFrom: i.photoAssetId },
  };
  return { doc, side, ink, scrim };
}

/** Rendu du document (même moteur que l'éditeur) + mesures de lisibilité ; dégradé ajouté si le contraste manque. */
export async function renderTextOnPhoto(p: Project, i: TextOnPhotoInput): Promise<{ jpg: Buffer; doc: AdDocument; metrics: { minFontPx: number; textContrast: number }; side: Side }> {
  const { loadDocImages, renderDocToBuffer, docMetrics } = await import("../ad-doc/server");
  const sources = new Map<string, Buffer>([[i.photoAssetId, i.photo]]);
  if (i.logo) {
    sources.set(i.logo.assetId, i.logo.data);
    if (i.logo.light) sources.set(i.logo.light.assetId, i.logo.light.data);
  }
  const images = await loadDocImages(sources);
  let { doc, side } = await textOnPhotoDoc(p, i);
  let m = docMetrics(doc, images);
  const g = i.guide ?? loadImageGuide();
  if (m.textContrast < g.colors.minContrast && !doc.layers.some((l) => l.role === "scrim")) {
    // Contraste mesuré trop faible sur le rendu : dégradé doux sous le texte, puis nouvelle mesure.
    const t = doc.layers.find((l) => l.role === "title")!;
    const tint = (doc.layers.find((l) => l.role === "title") as TextLayer).color === doc.brand.palette.dark ? (doc.brand.palette.light ?? "#FFFFFF") : (doc.brand.palette.dark ?? "#000000");
    const top = side === "top";
    const sh = Math.min(doc.height, (side === "bottom" ? doc.height - t.y : t.y + t.h * 3) + 80);
    doc = { ...doc, layers: [doc.layers[0], { ...base("scrim", "scrim", "Dégradé de lisibilité", 0, top ? 0 : doc.height - sh, doc.width, sh), kind: "shape", shape: "rect", fill: { type: "linear", angle: top ? 90 : 270, stops: [{ offset: 0, color: `${tint}D8` }, { offset: 0.55, color: `${tint}80` }, { offset: 1, color: `${tint}00` }] }, stroke: null, radius: 0, shadow: null } as ShapeLayer, ...doc.layers.slice(1)] };
    m = docMetrics(doc, images);
  }
  const jpg = await renderDocToBuffer(doc, images, "jpeg");
  return { jpg, doc, metrics: { minFontPx: m.minFontPx, textContrast: m.textContrast }, side };
}
