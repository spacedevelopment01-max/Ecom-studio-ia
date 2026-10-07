/**
 * Pistes créatives de logo et leurs mises en situation (planche de présentation « comme en agence ») :
 * logo en couleur sur blanc, en blanc sur la couleur de la marque, en noir et blanc, avatar rond de profil
 * (Instagram, TikTok), favicon dans un onglet à taille réelle, en-tête de la boutique sur téléphone et
 * étiquette simple. La même planche sert au contrôle « directeur de création » de l'IA et au client.
 */
import { createCanvas, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import sharp from "sharp";
import { contrast, ensureContrast, isDark, mix, onColor } from "../color";
import { font } from "./fonts";
import { drawSymbol, logoPng, type LogoSpec, type SymbolKind } from "./logo";
import { drawCustomSymbol, symbolPng, type CustomSymbol } from "./logo-symbol";
import { C } from "../i18n-server";

export type RouteKey = "produit" | "concept" | "typo";
export type PaletteRole = "primary" | "secondary" | "accent" | "light" | "dark";
export const ROUTE_KEYS: RouteKey[] = ["produit", "concept", "typo"];

/** Couleurs d'une piste : encre du logo, accent du symbole, fond de couleur (logo en blanc), fond doux. */
export type RouteColors = { ink: string; accent: string; ground: string; tint: string };

export type RouteCriterion = "originality" | "memorability" | "relevance" | "simplicity" | "smallSizes" | "coherence" | "distinctiveness";
export const ROUTE_CRITERIA: RouteCriterion[] = ["originality", "memorability", "relevance", "simplicity", "smallSizes", "coherence", "distinctiveness"];

/** Grille du directeur de création (notes de 0 à 10) et défauts rédhibitoires. */
export type RouteReview = {
  scores: Record<RouteCriterion, number>;
  cliche: boolean;
  resemblesKnownBrand: boolean;
  /** Monogramme : se lit-il comme les lettres voulues ? (null : sans objet) */
  readsAsLetters: boolean | null;
  issues: string[];
  fix: string;
};

export type CreativeRoute = {
  key: RouteKey;
  /** Nom du concept (« Le halo », « Pli d'origine »…). */
  name: string;
  /** « Pourquoi ce logo » : deux phrases pour le client. */
  why: string;
  /** ai : piste conçue et dessinée par l'IA puis validée ; local : version construite par le studio, sans IA. */
  source: "ai" | "local";
  markKind: "ai-symbol" | "ai-monogram" | "silhouette" | "monogram" | "library" | "letter";
  mark: CustomSymbol | null;
  library?: SymbolKind;
  heading: string;
  headingWeight: number;
  body: string;
  case: LogoSpec["case"];
  tracking: number;
  composition: "horizontal" | "stacked" | "emblem" | "wordmark";
  /** Logotype : point final dessiné en couleur d'accent. */
  dot?: boolean;
  colors: RouteColors;
  /** Rôles de la palette de la marque d'où viennent les couleurs. */
  roles?: { ink: PaletteRole; accent: PaletteRole; ground: PaletteRole; tint: PaletteRole };
  /** Palette propre à la piste (chaque piste a sa dominante) ; choisie, elle devient celle de la marque. */
  palette?: { primary: string; secondary: string; accent: string; light: string; dark: string };
  review?: RouteReview | null;
  /**
   * Verdict de la barrière de qualité : FINAL (proposition de l'IA contrôlée) ou PROVISIONAL (version du studio,
   * remplacement technique : jamais présentée comme une création validée).
   */
  gate?: { verdict: "FINAL" | "PROVISIONAL"; score: number | null; reason: string; checkId?: string | null; provisional?: { use: "auto" | "manual"; label: "placeholder" | "needs_improvement" } };
  notes: string[];
};

/** Logo principal d'une piste (couleur sur blanc). */
export function routeLogoSpec(r: CreativeRoute, brand: { name: string; tagline?: string }, override: Partial<LogoSpec> = {}): LogoSpec {
  const layout: LogoSpec["layout"] = r.composition === "horizontal" ? "lockup" : r.composition === "stacked" ? "vertical" : r.composition === "emblem" ? "badge" : "wordmark";
  const framed = r.markKind === "monogram" || r.markKind === "ai-monogram";
  return {
    name: brand.name,
    tagline: layout === "badge" || layout === "vertical" ? brand.tagline : undefined,
    family: r.heading,
    weight: r.headingWeight,
    case: r.case,
    tracking: r.tracking,
    layout,
    emblem: "none",
    symbol: r.library,
    custom: r.mark ?? undefined,
    color: r.colors.ink,
    accent: r.colors.accent,
    taglineFamily: r.body,
    markFrame: !framed,
    dot: layout === "wordmark" && !!r.dot,
    ...override,
  };
}

/** Version horizontale (en-tête du site) : un emblème ou une composition empilée passe en symbole + nom. */
export function routeWebSpec(r: CreativeRoute, brand: { name: string }, override: Partial<LogoSpec> = {}): LogoSpec {
  const s = routeLogoSpec(r, brand, override);
  return s.layout === "badge" || s.layout === "vertical" ? { ...s, layout: "lockup", tagline: undefined } : s;
}

/** Symbole de la piste dans un carré (symbole sur mesure, symbole de bibliothèque). */
export function drawRouteMark(ctx: SKRSContext2D, r: CreativeRoute, x: number, y: number, s: number, color: string, accent?: string) {
  if (r.mark) return drawCustomSymbol(ctx, r.mark, x, y, s, color, accent ?? color);
  if (r.library) return drawSymbol(ctx, r.library, x + s * 0.08, y + s * 0.08, s * 0.84, accent ?? color);
}

/** Marque en PNG carré (fond transparent ou plein). */
export async function routeMarkPng(r: CreativeRoute, size: number, color: string, accent?: string, background?: string): Promise<Buffer> {
  if (r.mark) return symbolPng(r.mark, size, color, accent ?? color, background);
  const c = createCanvas(size, size);
  const ctx = c.getContext("2d");
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
  }
  drawRouteMark(ctx, r, 0, 0, size, color, accent);
  return c.encode("png");
}

/** Avatar rond (profil Instagram, TikTok) : la marque en blanc sur la couleur de la piste, dans le cercle utile. */
export function drawAvatar(ctx: SKRSContext2D, r: CreativeRoute, cx: number, cy: number, radius: number, brandName: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = r.colors.ground;
  ctx.fill();
  ctx.clip();
  const on = onColor(r.colors.ground);
  const hasMark = !!(r.mark || r.library);
  if (hasMark) {
    // Un contenant (disque, arche) remplit déjà l'avatar : un peu plus petit qu'un pictogramme libre.
    const k = r.markKind === "monogram" || r.markKind === "ai-monogram" ? 1.06 : 1.08;
    const s = radius * k;
    drawRouteMark(ctx, r, cx - s / 2, cy - s / 2, s, on, on);
  } else {
    const letter = [...brandName.trim()][0]?.toLocaleUpperCase("fr-FR") ?? "";
    ctx.font = font(r.heading, r.headingWeight, radius);
    ctx.fillStyle = on;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, cx, cy + radius * 0.05);
  }
  ctx.restore();
}

/** Logo d'une seule teinte (blanc sur couleur, noir et blanc). */
export async function logoImage(spec: LogoSpec, width: number): Promise<Image> {
  return loadImage(await logoPng(spec, width));
}

function contain(ctx: SKRSContext2D, img: Image | null, x: number, y: number, w: number, h: number) {
  if (!img) return;
  const s = Math.min(w / img.width, h / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function rr(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, rad: number, fill?: string, stroke?: string, lw = 2) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, rad);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

/** Couleurs d'une piste rendues sûres : encre lisible sur blanc, blanc lisible sur le fond de couleur. */
export function safeColors(c: RouteColors): RouteColors {
  const ink = contrast(c.ink, "#FFFFFF") >= 7 ? c.ink : ensureContrast(c.ink, "#FFFFFF", 7);
  const accent = contrast(c.accent, "#FFFFFF") >= 3 ? c.accent : ensureContrast(c.accent, "#FFFFFF", 3);
  // Le logo en blanc sur la couleur doit rester net (grand format : 3:1 au moins, viser 4,5:1).
  const ground = contrast(c.ground, "#FFFFFF") >= 4.5 ? c.ground : ensureContrast(c.ground, "#FFFFFF", 4.5);
  const tint = isDark(c.tint) || contrast(c.tint, ink) < 7 ? mix(c.tint, "#FFFFFF", 0.7) : c.tint;
  return { ink, accent, ground, tint };
}

export type BoardInput = {
  route: CreativeRoute;
  brand: { name: string; tagline?: string };
  /** Produit détouré (en-tête de la boutique), facultatif. */
  product?: Buffer | null;
};

const LABEL = "#7A7670";

/**
 * Planche de présentation d'une piste (1200 × 1640) : logo, versions blanc sur couleur et noir et blanc,
 * avatar de profil, favicon à taille réelle, en-tête de boutique sur téléphone, étiquette.
 */
export async function routeBoard(inp: BoardInput): Promise<Buffer> {
  const r = inp.route;
  const col = r.colors;
  const W = 1200, H = 1640, M = 40, G = 24;
  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#EFEDE9";
  ctx.fillRect(0, 0, W, H);
  const label = (s: string, x: number, y: number, color = LABEL) => {
    ctx.font = font("Inter", 600, 15);
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(s.toLocaleUpperCase("fr-FR"), x, y);
  };
  const main = routeLogoSpec(r, inp.brand);
  const web = routeWebSpec(r, inp.brand);

  // 1 · Logo principal, couleur sur blanc.
  rr(ctx, M, M, W - M * 2, 500, 22, "#FFFFFF");
  contain(ctx, await logoImage(main, 1400), M + 120, M + 70, W - M * 2 - 240, 360);
  label(C("Couleur sur blanc", "Color on white"), M + 28, M + 500 - 26);

  // 2 · Blanc sur couleur, et noir et blanc.
  const y2 = M + 500 + G, hw = (W - M * 2 - G) / 2, h2 = 300;
  rr(ctx, M, y2, hw, h2, 22, col.ground);
  contain(ctx, await logoImage({ ...main, color: "#FFFFFF", accent: "#FFFFFF" }, 1000), M + 70, y2 + 50, hw - 140, h2 - 120);
  label(C("Blanc sur couleur", "White on color"), M + 28, y2 + h2 - 24, mix(col.ground, "#FFFFFF", 0.6));
  rr(ctx, M + hw + G, y2, hw, h2, 22, "#FFFFFF");
  contain(ctx, await logoImage({ ...main, color: "#000000", accent: "#000000" }, 1000), M + hw + G + 70, y2 + 50, hw - 140, h2 - 120);
  label(C("Noir et blanc", "Black and white"), M + hw + G + 28, y2 + h2 - 24);

  // 3 · Téléphone : en-tête de la boutique.
  const y3 = y2 + h2 + G;
  const pw = 360, ph = H - M - y3;
  rr(ctx, M, y3, pw, ph, 46, "#111111");
  const sx = M + 12, sy = y3 + 12, sw = pw - 24, sh = ph - 24;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(sx, sy, sw, sh, 36);
  ctx.clip();
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(sx, sy, sw, sh);
  // Barre d'état et en-tête.
  ctx.fillStyle = "#111111";
  ctx.font = font("Inter", 600, 15);
  ctx.textAlign = "left";
  ctx.fillText("9:41", sx + 26, sy + 32);
  const hy = sy + 52;
  ctx.strokeStyle = col.ink;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  for (const k of [0, 8, 16]) {
    ctx.beginPath();
    ctx.moveTo(sx + 22, hy + 18 + k);
    ctx.lineTo(sx + 44, hy + 18 + k);
    ctx.stroke();
  }
  // Panier
  ctx.beginPath();
  ctx.roundRect(sx + sw - 46, hy + 18, 22, 18, 3);
  ctx.moveTo(sx + sw - 41, hy + 18);
  ctx.arc(sx + sw - 35, hy + 18, 6, Math.PI, 0);
  ctx.stroke();
  contain(ctx, await logoImage(web, 700), sx + 64, hy + 4, sw - 128, 48);
  ctx.fillStyle = "#ECEAE6";
  ctx.fillRect(sx, hy + 66, sw, 1);
  // Bloc d'accueil.
  const by = hy + 67;
  ctx.fillStyle = col.tint;
  ctx.fillRect(sx, by, sw, sh - (by - sy));
  if (inp.product) {
    const img = await loadImage(await sharp(inp.product).resize(600, 600, { fit: "inside" }).png().toBuffer());
    contain(ctx, img, sx + 40, by + 26, sw - 80, 250);
  }
  ctx.fillStyle = col.ink;
  ctx.font = font(r.heading, r.headingWeight, 30);
  ctx.textAlign = "center";
  const headline = (inp.brand.tagline || inp.brand.name).replace(/[.\s]+$/, "");
  const words = headline.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > sw - 60 && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  lines.push(line);
  let ty = by + (inp.product ? 330 : 120);
  for (const l of lines.slice(0, 3)) {
    ctx.fillText(l, sx + sw / 2, ty);
    ty += 38;
  }
  rr(ctx, sx + 50, ty + 6, sw - 100, 52, 26, col.ground);
  ctx.fillStyle = onColor(col.ground);
  ctx.font = font(r.body, 600, 17);
  ctx.fillText(C("Découvrir", "Discover"), sx + sw / 2, ty + 38);
  ctx.restore();

  // 4 · Profil réseaux sociaux.
  const rx = M + pw + G, rw = W - M - rx;
  const ih = 300;
  rr(ctx, rx, y3, rw, ih, 22, "#FFFFFF");
  drawAvatar(ctx, r, rx + 110, y3 + 120, 76, inp.brand.name);
  // Anneau « story » discret autour de l'avatar.
  ctx.strokeStyle = mix(col.ground, "#FFFFFF", 0.35);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(rx + 110, y3 + 120, 86, 0, Math.PI * 2);
  ctx.stroke();
  const handle = `@${inp.brand.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "")}`;
  ctx.fillStyle = "#111111";
  ctx.font = font("Inter", 700, 24);
  ctx.textAlign = "left";
  ctx.fillText(handle, rx + 220, y3 + 92);
  // Compteurs : de simples barres grises (aucun chiffre inventé).
  for (const k of [0, 1, 2]) rr(ctx, rx + 220 + k * 120, y3 + 116, 96, 14, 7, "#E4E2DE");
  ctx.font = font(r.body, 500, 19);
  ctx.fillStyle = "#333333";
  if (inp.brand.tagline) ctx.fillText(inp.brand.tagline.slice(0, 48), rx + 220, y3 + 170);
  rr(ctx, rx + 220, y3 + 190, 180, 12, 6, "#ECEAE6");
  // Avatar TikTok (même cercle, plus petit) et marque réduite à 40 px.
  drawAvatar(ctx, r, rx + 110, y3 + 250, 26, inp.brand.name);
  ctx.font = font("Inter", 600, 16);
  ctx.fillStyle = "#111111";
  ctx.fillText(handle, rx + 150, y3 + 256);
  label(C("Profil Instagram · TikTok", "Instagram · TikTok profile"), rx + 400, y3 + ih - 24);

  // 5 · Favicon dans un onglet (taille réelle 16 px, puis agrandi).
  const fy = y3 + ih + G, fh = 170;
  rr(ctx, rx, fy, rw, fh, 22, "#FFFFFF");
  rr(ctx, rx + 24, fy + 30, 330, 44, 10, "#E8E6E2");
  const fav = await favicon(r, inp.brand.name, 16);
  ctx.drawImage(await loadImage(fav), rx + 40, fy + 44, 16, 16);
  ctx.fillStyle = "#222";
  ctx.font = font("Inter", 500, 15);
  ctx.fillText(inp.brand.name.slice(0, 24), rx + 66, fy + 57);
  const big = await sharp(fav).resize(80, 80, { kernel: "nearest" }).png().toBuffer();
  ctx.drawImage(await loadImage(big), rx + 380, fy + 22, 80, 80);
  const f32 = await sharp(await favicon(r, inp.brand.name, 32)).resize(80, 80, { kernel: "nearest" }).png().toBuffer();
  ctx.drawImage(await loadImage(f32), rx + 480, fy + 22, 80, 80);
  ctx.drawImage(await loadImage(await favicon(r, inp.brand.name, 32)), rx + 590, fy + 46, 32, 32);
  label(C("Favicon : onglet, 16 px agrandi, 32 px", "Favicon: tab, 16 px enlarged, 32 px"), rx + 24, fy + fh - 24);

  // 6 · Étiquette / emballage simple.
  const ly = fy + fh + G, lh = H - M - ly;
  rr(ctx, rx, ly, rw, lh, 22, mix(col.tint, "#D9D2C5", 0.35));
  const bw = rw * 0.5, bh = lh - 70;
  const bx = rx + (rw - bw) / 2, byy = ly + 26;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.18)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  rr(ctx, bx, byy, bw, bh, 14, "#FFFFFF");
  ctx.restore();
  ctx.fillStyle = col.ground;
  ctx.fillRect(bx, byy + bh - 26, bw, 26);
  contain(ctx, await logoImage(main.layout === "vertical" ? web : main, 900), bx + 30, byy + 20, bw - 60, bh - 80);
  label(C("Étiquette", "Label"), rx + 24, ly + lh - 18);
  return c.encode("png");
}

/** Favicon d'une piste : la marque seule, qui remplit l'icône (ou l'initiale si la piste n'a pas de symbole). */
export async function favicon(r: CreativeRoute, brandName: string, size: number): Promise<Buffer> {
  const S = 256;
  const c = createCanvas(S, S);
  const ctx = c.getContext("2d");
  if (r.mark || r.library) {
    const framed = r.markKind === "monogram" || r.markKind === "ai-monogram";
    const m = framed ? 4 : 10;
    drawRouteMark(ctx, r, m, m, S - m * 2, r.colors.ink, r.colors.accent);
  } else drawAvatar(ctx, r, S / 2, S / 2, S / 2, brandName);
  return sharp(await c.encode("png")).resize(size, size).png().toBuffer();
}
