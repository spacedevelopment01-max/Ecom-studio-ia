/**
 * Composition publicitaire (Ads V2) : une image (Image Engine V2) + le produit réel (pixels d'origine) + une
 * typographie de marque, une hiérarchie nette (marque, accroche, bouton), des zones de sécurité par plateforme.
 * Mesures rendues avec la création (taille de police minimale, contraste du texte, part de texte, débordement des
 * zones de sécurité, chevauchement du produit) : la barrière s'en sert sans payer de contrôle.
 */
import { createCanvas, loadImage, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import { contrast, ensureContrast, isDark, mix, onColor } from "../color";
import { ensureFonts, font } from "../media/fonts";
import { drawButton, drawLines, drawProduct, fitText, type Palette, type Typo } from "../media/compose";
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
};

export type ComposeMetrics = { minFontPx: number; textContrast: number; textShare: number; safeOverflow: boolean; productOverlap: boolean; headlineLines: number };

type Box = { x: number; y: number; w: number; h: number };
const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

function avgColor(ctx: SKRSContext2D, b: Box, W: number, H: number): string {
  const x = Math.max(0, Math.round(b.x));
  const y = Math.max(0, Math.round(b.y));
  const d = ctx.getImageData(x, y, Math.max(1, Math.min(Math.round(b.w), W - x)), Math.max(1, Math.min(Math.round(b.h), H - y))).data;
  let r = 0, g = 0, bl = 0, n = 0;
  for (let i = 0; i < d.length; i += 32) ((r += d[i]), (g += d[i + 1]), (bl += d[i + 2]), n++);
  return `#${[r, g, bl].map((v) => Math.round(v / Math.max(1, n)).toString(16).padStart(2, "0")).join("")}`;
}

function cover(ctx: SKRSContext2D, img: Image, b: Box) {
  const s = Math.max(b.w / img.width, b.h / img.height);
  const w = img.width * s;
  const h = img.height * s;
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x, b.y, b.w, b.h);
  ctx.clip();
  ctx.drawImage(img as any, b.x + (b.w - w) / 2, b.y + (b.h - h) / 2, w, h);
  ctx.restore();
}

export async function composeAd(i: ComposeInput): Promise<{ jpg: Buffer; metrics: ComposeMetrics }> {
  ensureFonts();
  const { width: W, height: H } = i.format;
  const safe = { top: Math.round(H * i.format.safe.top), bottom: Math.round(H * i.format.safe.bottom), side: Math.round(W * i.format.safe.side) };
  const c = createCanvas(W, H);
  const ctx = c.getContext("2d");
  const tall = H / W > 1.15;
  const wide = W / H > 1.3;
  const pal = i.palette;
  const bg = i.background ? await loadImage(i.background) : null;
  const prod = i.product ? await loadImage(i.product) : null;

  // 1. Fond et image (selon la mise en page).
  let textBox: Box;
  let align: CanvasTextAlign = "left";
  let productBox: Box | null = null;
  const field = pal.light;
  ctx.fillStyle = field;
  ctx.fillRect(0, 0, W, H);
  const layout = !bg && i.layout === "full_bleed" ? "typographic" : i.layout;
  if (layout === "full_bleed" && bg) {
    cover(ctx, bg, { x: 0, y: 0, w: W, h: H });
    // Voile progressif côté texte : lisibilité sans aplat lourd.
    const g = tall ? ctx.createLinearGradient(0, 0, 0, H * 0.5) : ctx.createLinearGradient(0, 0, W * 0.62, 0);
    g.addColorStop(0, "rgba(0,0,0,0.58)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    textBox = tall ? { x: safe.side, y: safe.top, w: W - safe.side * 2, h: H * 0.26 } : { x: safe.side, y: safe.top + H * 0.04, w: W * 0.5, h: H * 0.5 };
  } else if ((layout === "hero_left" || layout === "split") && bg) {
    if (tall) {
      cover(ctx, bg, { x: 0, y: 0, w: W, h: H * 0.62 });
      ctx.fillStyle = layout === "split" ? pal.dark : field;
      ctx.fillRect(0, H * 0.62, W, H * 0.38);
      textBox = { x: safe.side, y: H * 0.62 + H * 0.035, w: W - safe.side * 2, h: H * 0.38 - safe.bottom - H * 0.035 };
    } else {
      const split = wide ? 0.46 : 0.5;
      ctx.fillStyle = layout === "split" ? pal.dark : field;
      ctx.fillRect(0, 0, W * split, H);
      cover(ctx, bg, { x: W * split, y: 0, w: W * (1 - split), h: H });
      textBox = { x: safe.side, y: safe.top + H * 0.06, w: W * split - safe.side * 1.6, h: H - safe.top - safe.bottom - H * 0.08 };
    }
  } else {
    // Centré ou typographique : aplat de marque (ou image en fond), produit réel au centre.
    if (bg && layout === "hero_center") {
      cover(ctx, bg, { x: 0, y: 0, w: W, h: H });
      // Voile en haut (zone du texte) : lisible quelle que soit la photo.
      const g = ctx.createLinearGradient(0, 0, 0, H * 0.42);
      g.addColorStop(0, "rgba(0,0,0,0.55)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H * 0.42);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, layout === "typographic" ? pal.primary : field);
      g.addColorStop(1, layout === "typographic" ? mix(pal.primary, pal.dark, 0.35) : mix(field, pal.secondary, 0.5));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }
    align = "center";
    textBox = { x: safe.side, y: safe.top, w: W - safe.side * 2, h: H * (tall ? 0.24 : 0.26) };
  }

  // 2. Produit réel (pixels d'origine) : jamais redessiné, jamais sous le texte.
  if (prod) {
    const zone: Box = layout === "hero_left" || layout === "split" ? (tall ? { x: 0, y: 0, w: W, h: H * 0.62 } : { x: W * 0.5, y: 0, w: W * 0.5, h: H }) : { x: 0, y: textBox.y + textBox.h, w: W, h: H - (textBox.y + textBox.h) - safe.bottom - H * 0.12 };
    const hgt = Math.max(40, zone.h * 0.78);
    productBox = drawProduct(ctx, prod, { cx: zone.x + zone.w / 2, baseY: zone.y + zone.h * 0.92, height: hgt, maxWidth: zone.w * 0.78 }, { shadow: "soft" });
  }

  // 3. Texte : marque (surtitre), accroche, bouton — couleur choisie sur le fond réel, contraste garanti.
  const under = avgColor(ctx, textBox, W, H);
  // Marge : le fond réel varie sous le texte (photo) ; 5:1 visé pour garantir 4,5:1 partout.
  const ink = ensureContrast(isDark(under) ? "#FFFFFF" : pal.dark, under, 5);
  const ax = align === "center" ? textBox.x + textBox.w / 2 : textBox.x;
  const eyebrow = Math.round(Math.max(W * 0.022, 20));
  ctx.fillStyle = ink;
  ctx.font = font(i.typo.body, 600, eyebrow);
  (ctx as any).letterSpacing = `${Math.round(eyebrow * 0.16)}px`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(i.brand.toUpperCase(), ax, textBox.y);
  (ctx as any).letterSpacing = "0px";
  const weight = i.typo.headingWeight ?? 600;
  const headTop = textBox.y + eyebrow * 2;
  const room = { w: textBox.w, h: Math.max(eyebrow * 3, textBox.h - eyebrow * 2.2 - (tall || align === "center" ? 0 : eyebrow * 5)) };
  const fitted = fitText(ctx, i.headline, i.typo.heading, weight, room, Math.round(W * (tall ? 0.105 : wide ? 0.06 : 0.08)), Math.round(W * (tall ? 0.055 : 0.04)), 1.06);
  ctx.font = font(i.typo.heading, weight, fitted.size);
  ctx.fillStyle = ink;
  const yAfter = drawLines(ctx, fitted.lines, ax, headTop - fitted.size * 0.18, fitted.size, 1.06, align);
  const ctaSize = Math.round(Math.max(W * 0.026, 22));
  const accent = contrast(pal.accent, under) >= 3 ? pal.accent : ensureContrast(pal.dark, under, 4.5);
  const ctaY = align === "center" || tall ? H - safe.bottom - ctaSize * 2.8 : Math.min(yAfter + ctaSize * 1.4, H - safe.bottom - ctaSize * 2.8);
  const btn = drawButton(ctx, i.cta, align === "center" || (tall && layout !== "hero_left") ? W / 2 : ax, ctaY, ctaSize, accent, onColor(accent), i.typo.body, 999, align === "center" || (tall && layout !== "hero_left") ? "center" : "left");

  // 4. Logo discret (jamais dans la zone d'interface d'un format vertical).
  if (i.logo && !tall) {
    const lg = await loadImage(i.logo);
    const lh = Math.round(H * 0.045);
    const lw = Math.min((lg.width / lg.height) * lh, W * 0.28);
    ctx.globalAlpha = 0.92;
    ctx.drawImage(lg as any, W - safe.side - lw, H - safe.bottom - lh, lw, lh);
    ctx.globalAlpha = 1;
  }

  const textArea: Box = { x: textBox.x, y: textBox.y, w: textBox.w, h: Math.max(0, yAfter - textBox.y) };
  const headBox: Box = { x: textArea.x, y: headTop, w: textArea.w, h: yAfter - headTop };
  const btnBox: Box = { x: btn.x, y: btn.y, w: btn.w, h: btn.h };
  const inSafe = (b: Box) => b.y >= safe.top - 1 && b.y + b.h <= H - safe.bottom + 1 && b.x >= safe.side - 1 && b.x + b.w <= W - safe.side + 1;
  const metrics: ComposeMetrics = {
    minFontPx: Math.min(eyebrow, fitted.size, ctaSize),
    textContrast: Math.round(contrast(ink, under) * 10) / 10,
    textShare: Math.round(((textArea.w * textArea.h + btnBox.w * btnBox.h) / (W * H)) * 100) / 100,
    safeOverflow: !inSafe(headBox) || !inSafe(btnBox),
    productOverlap: !!productBox && (overlap(productBox, headBox) > headBox.w * headBox.h * 0.04 || overlap(productBox, btnBox) > btnBox.w * btnBox.h * 0.1),
    headlineLines: fitted.lines.length,
  };
  return { jpg: await c.encode("jpeg", 92), metrics };
}
