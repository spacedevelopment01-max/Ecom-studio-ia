/**
 * Compositions d'images à partir du détourage réel du produit : packshots,
 * mises en scène de studio, bannières, visuels sociaux et publicitaires.
 * Le produit est toujours dessiné à partir de ses pixels d'origine ; les
 * textes sont composés typographiquement (nets, orthographe contrôlée).
 */
import { createCanvas, loadImage, type Canvas, type Image, type SKRSContext2D } from "@napi-rs/canvas";
import { contrast, ensureContrast, hsl, isDark, mix, onColor, withLightness } from "../color";
import { ensureFonts, font } from "./fonts";

export type Palette = { primary: string; secondary: string; accent: string; light: string; dark: string };
export type Typo = { heading: string; body: string; headingWeight?: number; uppercase?: boolean };

export type Format = { w: number; h: number; label: string };
export const FORMATS = {
  square: { w: 1080, h: 1080, label: "1:1" },
  portrait: { w: 1080, h: 1350, label: "4:5" },
  story: { w: 1080, h: 1920, label: "9:16" },
  landscape: { w: 1920, h: 1080, label: "16:9" },
  banner: { w: 2400, h: 1200, label: "2:1" },
  pin: { w: 1000, h: 1500, label: "2:3" },
  product: { w: 1600, h: 2000, label: "4:5 HD" },
  packshot: { w: 2000, h: 2000, label: "1:1 HD" },
} satisfies Record<string, Format>;
export type FormatId = keyof typeof FORMATS;

export async function img(buf: Buffer): Promise<Image> {
  return loadImage(buf);
}

function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// ---------------------------------------------------------------- fonds

function grain(ctx: SKRSContext2D, w: number, h: number, amount = 0.035, seed = 7) {
  const r = rng(seed);
  const n = createCanvas(256, 256);
  const nc = n.getContext("2d");
  const id = nc.createImageData(256, 256);
  for (let i = 0; i < id.data.length; i += 4) {
    const v = Math.floor(r() * 255);
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
    id.data[i + 3] = 255;
  }
  nc.putImageData(id, 0, 0);
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.globalCompositeOperation = "overlay";
  const pat = ctx.createPattern(n as any, "repeat")!;
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function studioBackdrop(ctx: SKRSContext2D, w: number, h: number, base: string, horizon = 0.68) {
  // Mur + sol avec raccord doux (cyclo), lumière principale en haut à gauche.
  const wall = ctx.createLinearGradient(0, 0, 0, h * horizon);
  wall.addColorStop(0, withLightness(base, Math.min(0.97, hsl(base)[2] + 0.05)));
  wall.addColorStop(1, base);
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, w, h);
  const floor = ctx.createLinearGradient(0, h * (horizon - 0.08), 0, h);
  floor.addColorStop(0, base);
  floor.addColorStop(1, withLightness(base, Math.max(0.05, hsl(base)[2] - 0.08)));
  ctx.fillStyle = floor;
  ctx.fillRect(0, h * (horizon - 0.08), w, h);
  const light = ctx.createRadialGradient(w * 0.28, h * 0.2, 0, w * 0.28, h * 0.2, Math.max(w, h) * 0.9);
  light.addColorStop(0, "rgba(255,255,255,0.32)");
  light.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, w, h);
  const vign = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.8);
  vign.addColorStop(0, "rgba(0,0,0,0)");
  vign.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, w, h);
}

/** Ombres portées de fenêtre et de feuillage (lumière naturelle rasante). */
function gobo(ctx: SKRSContext2D, w: number, h: number, seed: number, strength = 0.16) {
  const r = rng(seed);
  const layer = createCanvas(w, h);
  const lc = layer.getContext("2d");
  lc.fillStyle = "#000";
  lc.save();
  lc.translate(w * 0.62, -h * 0.08);
  lc.rotate(0.38);
  const pw = w * 0.18, ph = h * 0.36, gap = w * 0.035;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) lc.fillRect(i * (pw + gap) - pw, j * (ph + gap), pw, ph);
  lc.restore();
  // Feuillage
  for (let i = 0; i < 14; i++) {
    const x = w * (0.02 + r() * 0.3), y = h * (0.02 + r() * 0.45), s = w * (0.03 + r() * 0.05);
    lc.save();
    lc.translate(x, y);
    lc.rotate(r() * Math.PI);
    lc.beginPath();
    lc.ellipse(0, 0, s, s * 0.38, 0, 0, Math.PI * 2);
    lc.fill();
    lc.restore();
  }
  // Inversion : on assombrit hors de la tache lumineuse.
  ctx.save();
  ctx.globalAlpha = strength;
  ctx.filter = `blur(${Math.round(w * 0.012)}px)`;
  ctx.drawImage(layer as any, 0, 0);
  ctx.restore();
}

function podium(ctx: SKRSContext2D, cx: number, baseY: number, rw: number, height: number, color: string) {
  const top = baseY - height;
  const side = ctx.createLinearGradient(cx - rw, 0, cx + rw, 0);
  side.addColorStop(0, withLightness(color, Math.max(0.05, hsl(color)[2] - 0.06)));
  side.addColorStop(0.35, withLightness(color, Math.min(0.97, hsl(color)[2] + 0.06)));
  side.addColorStop(1, withLightness(color, Math.max(0.05, hsl(color)[2] - 0.12)));
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.moveTo(cx - rw, top);
  ctx.lineTo(cx - rw, baseY);
  ctx.ellipse(cx, baseY, rw, rw * 0.16, 0, Math.PI, 0, true);
  ctx.lineTo(cx + rw, top);
  ctx.closePath();
  ctx.fill();
  const lid = ctx.createLinearGradient(cx - rw, top, cx + rw, top);
  lid.addColorStop(0, withLightness(color, Math.min(0.98, hsl(color)[2] + 0.1)));
  lid.addColorStop(1, withLightness(color, Math.min(0.95, hsl(color)[2] + 0.02)));
  ctx.fillStyle = lid;
  ctx.beginPath();
  ctx.ellipse(cx, top, rw, rw * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  return top;
}

function arch(ctx: SKRSContext2D, cx: number, bottom: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, bottom);
  ctx.lineTo(cx - w / 2, bottom - h + w / 2);
  ctx.arc(cx, bottom - h + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(cx + w / 2, bottom);
  ctx.closePath();
  ctx.fill();
}

// ---------------------------------------------------------------- produit

export type ProductPlacement = { cx: number; baseY: number; height: number; maxWidth?: number };

/**
 * Dessine le produit avec ombre de contact et ombre portée. Retourne le
 * cadre occupé (utile pour placer les textes sans chevauchement).
 */
export function drawProduct(ctx: SKRSContext2D, product: Image, p: ProductPlacement, opts: { shadow?: "soft" | "hard" | "none"; reflection?: boolean; shadowColor?: string; lightFrom?: "left" | "right" } = {}) {
  let ph = p.height;
  let pw = (product.width / product.height) * ph;
  if (p.maxWidth && pw > p.maxWidth) {
    pw = p.maxWidth;
    ph = (product.height / product.width) * pw;
  }
  const x = p.cx - pw / 2;
  const y = p.baseY - ph;
  const sc = opts.shadowColor ?? "rgba(20,14,10,";
  if (opts.shadow !== "none") {
    // Ombre portée (silhouette déformée et floutée).
    const dir = opts.lightFrom === "right" ? -1 : 1;
    const sil = createCanvas(Math.ceil(pw), Math.ceil(ph));
    const sctx = sil.getContext("2d");
    sctx.drawImage(product as any, 0, 0, pw, ph);
    sctx.globalCompositeOperation = "source-in";
    sctx.fillStyle = "#000";
    sctx.fillRect(0, 0, pw, ph);
    ctx.save();
    ctx.globalAlpha = opts.shadow === "hard" ? 0.22 : 0.1;
    ctx.filter = `blur(${Math.round(ph * (opts.shadow === "hard" ? 0.01 : 0.028))}px)`;
    // Projection au sol : x' = x - k·y, y' = base + 0,22·y (y < 0 au-dessus de la base).
    ctx.setTransform(1, 0, -dir * (opts.shadow === "hard" ? 0.5 : 0.32), opts.shadow === "hard" ? 0.16 : 0.1, p.cx, p.baseY);
    ctx.drawImage(sil as any, -pw / 2, -ph, pw, ph);
    ctx.restore();
    // Ombre de contact.
    const g = ctx.createRadialGradient(p.cx, p.baseY, 0, p.cx, p.baseY, pw * 0.62);
    g.addColorStop(0, `${sc}0.42)`);
    g.addColorStop(0.45, `${sc}0.16)`);
    g.addColorStop(1, `${sc}0)`);
    ctx.save();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(p.cx, p.baseY, pw * 0.62, pw * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  if (opts.reflection) {
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.translate(x, p.baseY);
    ctx.scale(1, -1);
    ctx.drawImage(product as any, 0, -ph, pw, ph);
    ctx.restore();
    const fade = ctx.createLinearGradient(0, p.baseY, 0, p.baseY + ph * 0.45);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    const f2 = ctx.createLinearGradient(0, p.baseY, 0, p.baseY + ph * 0.35);
    f2.addColorStop(0, "rgba(0,0,0,0.2)");
    f2.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = f2;
    ctx.fillRect(x - 10, p.baseY + 1, pw + 20, ph * 0.5);
    ctx.restore();
  }
  ctx.drawImage(product as any, x, y, pw, ph);
  return { x, y, w: pw, h: ph };
}

// ---------------------------------------------------------------- texte

export function wrapLines(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Taille de police maximale pour tenir dans la boîte (mobile : plancher de lisibilité). */
export function fitText(ctx: SKRSContext2D, text: string, family: string, weight: number, box: { w: number; h: number }, maxSize: number, minSize: number, lineHeight = 1.05, italic = false) {
  for (let size = maxSize; size >= minSize; size -= 2) {
    ctx.font = font(family, weight, size, italic);
    const lines = wrapLines(ctx, text, box.w);
    const tooWide = lines.some((l) => ctx.measureText(l).width > box.w);
    if (!tooWide && lines.length * size * lineHeight <= box.h) return { size, lines };
  }
  ctx.font = font(family, weight, minSize, italic);
  return { size: minSize, lines: wrapLines(ctx, text, box.w) };
}

export function drawLines(ctx: SKRSContext2D, lines: string[], x: number, y: number, size: number, lh: number, align: CanvasTextAlign = "left", tracking = 0) {
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  lines.forEach((l, i) => {
    if (tracking) (ctx as any).letterSpacing = `${tracking}px`;
    ctx.fillText(l, x, y + size + i * size * lh);
  });
  (ctx as any).letterSpacing = "0px";
  return y + lines.length * size * lh;
}

function pill(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawButton(ctx: SKRSContext2D, label: string, x: number, y: number, size: number, bg: string, fg: string, family: string, radius = 999, align: "left" | "center" = "left") {
  ctx.font = font(family, 600, size);
  const tw = ctx.measureText(label).width;
  const padX = size * 1.4, h = size * 2.6;
  const w = tw + padX * 2;
  const bx = align === "center" ? x - w / 2 : x;
  ctx.fillStyle = bg;
  pill(ctx, bx, y, w, h, Math.min(radius, h / 2));
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, bx + w / 2, y + h / 2 + size * 0.05);
  return { x: bx, y, w, h };
}

/**
 * Intérieur lumineux « vie quotidienne » : mur enduit chaud baigné de soleil, ombres de fenêtre et de feuillage,
 * plateau en pierre claire (travertin) avec profondeur de champ. Retourne la ligne de pose et le calque d'ombres
 * (réutilisé sur le produit pour l'intégrer à la même lumière).
 */
function everyday(ctx: SKRSContext2D, w: number, h: number, pal: Palette, seed: number): { baseY: number; shade: Canvas } {
  const r = rng(seed);
  const tableY = h * 0.68;
  // Mur : enduit chaud, plus clair côté fenêtre.
  const wall = mix("#E9DFD2", withLightness(pal.light, 0.88, 0.3), 0.25);
  const wg = ctx.createLinearGradient(0, 0, w, tableY);
  wg.addColorStop(0, mix(wall, "#FFF6E8", 0.5));
  wg.addColorStop(1, mix(wall, "#A8957F", 0.32));
  ctx.fillStyle = wg;
  ctx.fillRect(0, 0, w, tableY);
  // Grain d'enduit (bruit fin agrandi, très doux).
  const noise = (cw: number, ch: number, a: number) => {
    const n = createCanvas(cw, ch);
    const nc = n.getContext("2d");
    const img = nc.createImageData(cw, ch);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (r() - 0.5) * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255 * a;
    }
    nc.putImageData(img, 0, 0);
    return n;
  };
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.filter = `blur(${Math.round(w * 0.004)}px)`;
  ctx.drawImage(noise(Math.round(w / 6), Math.round(tableY / 6), 0.35) as any, 0, 0, w, tableY);
  ctx.restore();

  // Calque d'ombres : tout est ombre sauf la tache de soleil, découpée par les montants et le feuillage.
  const shade = createCanvas(w, h);
  const sc = shade.getContext("2d");
  sc.fillStyle = "#000";
  sc.fillRect(0, 0, w, h);
  sc.globalCompositeOperation = "destination-out";
  sc.beginPath();
  sc.moveTo(w * 0.18, -h * 0.05);
  sc.lineTo(w * 0.78, -h * 0.05);
  sc.lineTo(w * 1.08, h * 1.05);
  sc.lineTo(w * 0.42, h * 1.05);
  sc.closePath();
  sc.fill();
  sc.globalCompositeOperation = "source-over";
  sc.save();
  sc.transform(1, 0, 0.32, 1, 0, 0);
  sc.fillRect(w * 0.44, -h, w * 0.024, h * 3);
  sc.restore();
  sc.fillRect(-w, h * 0.33, w * 3, h * 0.022);
  // Feuillage : grappes de feuilles en amande sur une branche.
  for (let k = 0; k < 3; k++) {
    let bx = w * (0.1 + r() * 0.5), by = h * (r() * 0.15);
    const ang = 0.6 + r() * 0.8;
    for (let i = 0; i < 14; i++) {
      bx += Math.cos(ang) * w * 0.02;
      by += Math.sin(ang) * h * 0.022;
      for (const side of [-1, 1]) {
        sc.save();
        sc.translate(bx, by);
        sc.rotate(ang + side * (0.9 + r() * 0.4));
        const L = w * (0.035 + r() * 0.03);
        sc.beginPath();
        sc.moveTo(0, 0);
        sc.quadraticCurveTo(L * 0.5, -L * 0.28, L, 0);
        sc.quadraticCurveTo(L * 0.5, L * 0.28, 0, 0);
        sc.fill();
        sc.restore();
      }
    }
  }
  // Plateau en travertin : base claire, veines horizontales douces, pores, dégradé de profondeur.
  const stone = mix("#E3D2BC", pal.light, 0.12);
  const tg = ctx.createLinearGradient(0, tableY, 0, h);
  tg.addColorStop(0, mix(stone, "#C9B79F", 0.25));
  tg.addColorStop(0.25, stone);
  tg.addColorStop(1, mix(stone, "#8F7C66", 0.3));
  ctx.fillStyle = tg;
  ctx.fillRect(0, tableY, w, h - tableY);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, tableY, w, h - tableY);
  ctx.clip();
  ctx.globalCompositeOperation = "multiply";
  ctx.filter = `blur(${Math.round(h * 0.002)}px)`;
  for (let i = 0; i < 18; i++) {
    const y0 = tableY + (h - tableY) * r();
    ctx.fillStyle = `rgba(160,135,105,${0.08 + r() * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(w * r(), y0, w * (0.2 + r() * 0.5), h * (0.002 + r() * 0.004), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.filter = "none";
  for (let i = 0; i < 260; i++) {
    const y0 = tableY + (h - tableY) * Math.pow(r(), 0.7);
    const d = (y0 - tableY) / (h - tableY);
    ctx.fillStyle = `rgba(120,98,74,${0.04 + r() * 0.06})`;
    ctx.beginPath();
    ctx.ellipse(w * r(), y0, w * (0.002 + r() * 0.006) * (0.5 + d), h * 0.0012 * (0.5 + d), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Arête arrière du plateau : fine ligne d'ombre puis reflet.
  ctx.fillStyle = "rgba(70,50,32,0.22)";
  ctx.fillRect(0, tableY - h * 0.002, w, h * 0.004);
  ctx.fillStyle = "rgba(255,248,236,0.35)";
  ctx.fillRect(0, tableY + h * 0.002, w, h * 0.002);
  // Lumière naturelle douce venant de la gauche (sans ombres projetées artificielles).
  const soft = ctx.createLinearGradient(0, 0, w, 0);
  soft.addColorStop(0, "rgba(255,236,205,0.22)");
  soft.addColorStop(0.6, "rgba(255,236,205,0)");
  ctx.fillStyle = soft;
  ctx.fillRect(0, 0, w, h);
  // Vignette douce et chaleur générale.
  const vg = ctx.createRadialGradient(w * 0.45, h * 0.55, Math.min(w, h) * 0.35, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(48,30,14,0.3)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  return { baseY: tableY + (h - tableY) * 0.45, shade };
}

/** Intègre le produit à la lumière de la scène : soleil côté fenêtre, ombre de l'autre côté, ombres de feuillage. */
function lightProduct(ctx: SKRSContext2D, box: { x: number; y: number; w: number; h: number }, product: Image, shade: Canvas, w: number, h: number) {
  const L = createCanvas(w, h);
  const lc = L.getContext("2d");
  // Masque du produit.
  lc.drawImage(product as any, box.x, box.y, box.w, box.h);
  lc.globalCompositeOperation = "source-in";
  const g = lc.createLinearGradient(box.x, 0, box.x + box.w, 0);
  g.addColorStop(0, "rgba(255,228,180,0.35)");
  g.addColorStop(0.45, "rgba(255,228,180,0)");
  g.addColorStop(0.7, "rgba(40,24,12,0)");
  g.addColorStop(1, "rgba(40,24,12,0.32)");
  lc.fillStyle = g;
  lc.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.drawImage(L as any, 0, 0);
  ctx.restore();
}

// ---------------------------------------------------------------- recettes

export type SceneStyle = "studio" | "podium" | "arch" | "window" | "spotlight" | "split" | "color" | "everyday";
export const SCENE_STYLES: { id: SceneStyle; label: string }[] = [
  { id: "studio", label: "Studio doux" },
  { id: "podium", label: "Podium" },
  { id: "arch", label: "Arche" },
  { id: "window", label: "Lumière de fenêtre" },
  { id: "spotlight", label: "Projecteur sombre" },
  { id: "split", label: "Aplats de couleur" },
  { id: "color", label: "Fond de marque" },
  { id: "everyday", label: "Vie quotidienne" },
];

export type SceneInput = { product: Image; palette: Palette; style: SceneStyle; format: Format; productScale?: number; offsetX?: number; seed?: number; background?: Image | null; baseYRatio?: number };

/** Mise en scène de studio (sans texte). */
export async function renderScene(s: SceneInput): Promise<{ png: Buffer; productBox: { x: number; y: number; w: number; h: number } }> {
  ensureFonts();
  const { w, h } = s.format;
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d");
  const pal = s.palette;
  const light = withLightness(pal.light, Math.max(0.9, hsl(pal.light)[2]), 0.7);
  const scale = s.productScale ?? (s.style === "everyday" ? 0.46 : 0.62);
  const cx = w * (0.5 + (s.offsetX ?? 0));
  let baseY = h * 0.8;
  let shadow: "soft" | "hard" = "soft";
  let shadowColor = "rgba(20,14,10,";
  let everydayShade: Canvas | null = null;
  const ph = h / w > 1.6 ? h * scale : Math.min(h * scale, w * scale * 1.15);

  if (s.background) {
    // Décor généré (fournisseur d'image) : le produit réel est posé dessus.
    const bg = s.background;
    const r = Math.max(w / bg.width, h / bg.height);
    ctx.drawImage(bg as any, (w - bg.width * r) / 2, (h - bg.height * r) / 2, bg.width * r, bg.height * r);
    baseY = h * 0.82;
  } else {
    switch (s.style) {
      case "studio":
        studioBackdrop(ctx, w, h, light, 0.7);
        baseY = h * 0.8;
        break;
      case "podium": {
        studioBackdrop(ctx, w, h, mix(light, pal.secondary, 0.35), 0.62);
        const top = podium(ctx, cx, h * 0.9, Math.min(w * 0.3, ph * 0.55), h * 0.16, mix(pal.secondary, "#FFFFFF", 0.35));
        baseY = top + Math.min(w * 0.3, ph * 0.55) * 0.02;
        break;
      }
      case "arch": {
        ctx.fillStyle = mix(light, pal.secondary, 0.25);
        ctx.fillRect(0, 0, w, h);
        arch(ctx, cx, h * 0.84, Math.min(w * (Math.abs(s.offsetX ?? 0) > 0 ? 0.44 : 0.62), ph * 0.95), Math.min(h * 0.74, ph * 1.3), mix(pal.primary, light, 0.55));
        ctx.fillStyle = mix(pal.secondary, pal.dark, 0.12);
        ctx.fillRect(0, h * 0.84, w, h * 0.16);
        baseY = h * 0.86;
        break;
      }
      case "window": {
        studioBackdrop(ctx, w, h, mix(light, pal.secondary, 0.18), 0.7);
        gobo(ctx, w, h, s.seed ?? 11, 0.18);
        shadow = "hard";
        baseY = h * 0.82;
        break;
      }
      case "spotlight": {
        const dark = withLightness(pal.dark, 0.08, 0.6);
        ctx.fillStyle = dark;
        ctx.fillRect(0, 0, w, h);
        const spot = ctx.createRadialGradient(cx, h * 0.55, 0, cx, h * 0.55, Math.max(w, h) * 0.55);
        spot.addColorStop(0, withLightness(pal.dark, 0.28, 0.7));
        spot.addColorStop(1, dark);
        ctx.fillStyle = spot;
        ctx.fillRect(0, 0, w, h);
        const rim = ctx.createRadialGradient(cx, h * 0.82, 0, cx, h * 0.82, w * 0.45);
        rim.addColorStop(0, `${withLightness(pal.accent, 0.6, 1)}55`);
        rim.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = rim;
        ctx.fillRect(0, 0, w, h);
        shadowColor = "rgba(0,0,0,";
        baseY = h * 0.8;
        break;
      }
      case "split": {
        ctx.fillStyle = mix(light, pal.secondary, 0.4);
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = mix(pal.primary, light, 0.15);
        ctx.beginPath();
        ctx.moveTo(w * 0.58, 0);
        ctx.lineTo(w, 0);
        ctx.lineTo(w, h);
        ctx.lineTo(w * 0.38, h);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.06)";
        ctx.fillRect(0, h * 0.8, w, h * 0.2);
        baseY = h * 0.84;
        break;
      }
      case "everyday": {
        const e = everyday(ctx, w, h, pal, s.seed ?? 5);
        baseY = e.baseY;
        everydayShade = e.shade;
        shadow = "hard";
        shadowColor = "rgba(46,28,12,";
        break;
      }
      case "color": {
        const base = pal.primary;
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, withLightness(base, Math.min(0.75, hsl(base)[2] + 0.12)));
        g.addColorStop(1, withLightness(base, Math.max(0.12, hsl(base)[2] - 0.08)));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        shadowColor = isDark(base) ? "rgba(0,0,0," : "rgba(20,14,10,";
        baseY = h * 0.82;
        break;
      }
    }
  }
  if (s.baseYRatio) baseY = h * s.baseYRatio;
  const box = drawProduct(ctx, s.product, { cx, baseY, height: ph, maxWidth: w * 0.8 }, { shadow, shadowColor, reflection: s.style === "spotlight" });
  if (everydayShade) lightProduct(ctx, box, s.product, everydayShade, w, h);
  if (!s.background) grain(ctx, w, h, 0.03, s.seed ?? 3);
  return { png: await c.encode("png"), productBox: box };
}

/** Packshot e-commerce : fond blanc pur ou très clair, produit centré, ombre de contact. */
export async function renderPackshot(product: Image, opts: { background?: string; format?: Format } = {}) {
  const f = opts.format ?? FORMATS.packshot;
  const c = createCanvas(f.w, f.h);
  const ctx = c.getContext("2d");
  ctx.fillStyle = opts.background ?? "#FFFFFF";
  ctx.fillRect(0, 0, f.w, f.h);
  drawProduct(ctx, product, { cx: f.w / 2, baseY: f.h * 0.86, height: f.h * 0.74, maxWidth: f.w * 0.82 }, { shadow: "soft" });
  return c.encode("jpeg", 92);
}

export type Layout = "editorial" | "bold" | "minimal" | "centered" | "split";

export type CreativeInput = {
  product: Image;
  palette: Palette;
  typo: Typo;
  format: Format;
  layout: Layout;
  headline: string;
  subline?: string;
  cta?: string;
  brand: string;
  logo?: Image | null;
  scene?: SceneStyle;
  background?: Image | null;
  badge?: string;
  seed?: number;
};

/**
 * Visuel social ou publicitaire : scène + typographie composée. Les zones de
 * texte respectent des marges de sécurité (6 % des bords, 14 % en haut et
 * 20 % en bas pour les formats 9:16 où l'interface des réseaux recouvre).
 */
export async function renderCreative(input: CreativeInput): Promise<{ jpg: Buffer; safe: { top: number; bottom: number; side: number }; minFontPx: number }> {
  ensureFonts();
  const { w, h } = input.format;
  const isStory = h / w > 1.6;
  const safe = { side: Math.round(w * 0.07), top: Math.round(h * (isStory ? 0.13 : 0.07)), bottom: Math.round(h * (isStory ? 0.2 : 0.08)) };
  const pal = input.palette;
  const c = createCanvas(w, h);
  const ctx = c.getContext("2d");
  const textOnLeft = input.layout === "editorial" || input.layout === "split";
  const sceneStyle: SceneStyle = input.scene ?? (input.layout === "bold" ? "color" : input.layout === "minimal" ? "studio" : input.layout === "split" ? "split" : "arch");
  const productScale = isStory ? 0.46 : input.layout === "centered" ? 0.5 : 0.6;
  const offsetX = textOnLeft && !isStory ? 0.21 : 0;
  // En 9:16, le produit se pose au-dessus de la zone du bouton et de l'interface.
  const baseYRatio = isStory ? (h - safe.bottom - Math.max(w * 0.028, 26) * 4.2) / h : undefined;
  const scene = await renderScene({ product: input.product, palette: pal, style: sceneStyle, format: { ...input.format }, productScale, offsetX, seed: input.seed, background: input.background, baseYRatio });
  const sceneImg = await loadImage(scene.png);
  ctx.drawImage(sceneImg as any, 0, 0);

  // Couleur du texte selon le fond réel sous la zone de texte.
  const sample = (x: number, y: number, sw: number, sh: number) => {
    const d = ctx.getImageData(Math.max(0, x), Math.max(0, y), Math.max(1, Math.min(sw, w - x)), Math.max(1, Math.min(sh, h - y))).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 16) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    return `#${[r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("")}`;
  };
  const headFam = input.typo.heading;
  const bodyFam = input.typo.body;
  const hw = input.typo.headingWeight ?? 600;
  const headline = input.typo.uppercase ? input.headline.toUpperCase() : input.headline;
  let minFont = 999;

  let textBox: { x: number; y: number; w: number; h: number; align: CanvasTextAlign };
  if (isStory) textBox = { x: safe.side, y: safe.top, w: w - safe.side * 2, h: h * 0.2, align: input.layout === "editorial" ? "left" : "center" };
  else if (textOnLeft) textBox = { x: safe.side, y: safe.top + h * 0.06, w: w * 0.46, h: h * 0.5, align: "left" };
  else textBox = { x: safe.side, y: safe.top, w: w - safe.side * 2, h: h * 0.24, align: "center" };

  const bgUnder = sample(textBox.x, textBox.y, textBox.w, textBox.h);
  const textColor = ensureContrast(isDark(bgUnder) ? "#FFFFFF" : withLightness(pal.dark, 0.1), bgUnder, 4.5);
  const ax = textBox.align === "center" ? textBox.x + textBox.w / 2 : textBox.x;

  // Surtitre : nom de marque.
  ctx.fillStyle = textColor;
  const eyebrowSize = Math.round(Math.max(w * 0.022, 22));
  ctx.font = font(bodyFam, 600, eyebrowSize);
  (ctx as any).letterSpacing = `${Math.round(eyebrowSize * 0.18)}px`;
  ctx.textAlign = textBox.align;
  ctx.textBaseline = "top";
  ctx.fillText((input.badge || input.brand).toUpperCase(), ax, textBox.y);
  (ctx as any).letterSpacing = "0px";
  minFont = Math.min(minFont, eyebrowSize);

  const headTop = textBox.y + eyebrowSize * 2;
  const maxHead = Math.round(w * (isStory ? 0.12 : textOnLeft ? 0.075 : 0.085));
  const fitted = fitText(ctx, headline, headFam, hw, { w: textBox.w, h: textBox.h - eyebrowSize * 2.2 }, maxHead, Math.round(w * (isStory ? 0.06 : 0.042)), 1.04);
  ctx.font = font(headFam, hw, fitted.size);
  ctx.fillStyle = textColor;
  let yAfter = drawLines(ctx, fitted.lines, ax, headTop - fitted.size * 0.18, fitted.size, 1.04, textBox.align);
  minFont = Math.min(minFont, fitted.size);

  if (input.subline) {
    const subSize = Math.round(Math.max(w * 0.03, 26));
    ctx.font = font(bodyFam, 400, subSize);
    ctx.fillStyle = mix(textColor, bgUnder, 0.15);
    const lines = wrapLines(ctx, input.subline, textBox.w * 0.95).slice(0, 3);
    yAfter = drawLines(ctx, lines, ax, yAfter + subSize * 0.5, subSize, 1.3, textBox.align);
    minFont = Math.min(minFont, subSize);
  }

  if (input.cta) {
    const ctaSize = Math.round(Math.max(w * 0.028, 26));
    const accent = contrast(pal.accent, bgUnder) >= 3 ? pal.accent : ensureContrast(pal.dark, bgUnder, 4.5);
    const by = isStory ? h - safe.bottom - ctaSize * 2.6 : textOnLeft ? yAfter + ctaSize * 1.2 : h - safe.bottom - ctaSize * 2.6;
    drawButton(ctx, input.cta, isStory || !textOnLeft ? w / 2 : ax, by, ctaSize, accent, onColor(accent), bodyFam, 999, isStory || !textOnLeft ? "center" : "left");
    minFont = Math.min(minFont, ctaSize);
  }

  // Logo discret en bas à gauche (hors format story où le bas est réservé à l'interface).
  if (input.logo && !isStory) {
    const lh = Math.round(h * 0.045);
    const lw = (input.logo.width / input.logo.height) * lh;
    ctx.globalAlpha = 0.92;
    ctx.drawImage(input.logo as any, safe.side, h - safe.bottom - lh, Math.min(lw, w * 0.3), lh);
    ctx.globalAlpha = 1;
  }
  return { jpg: await c.encode("jpeg", 92), safe, minFontPx: minFont };
}

/** Bannière de boutique (sans texte : les textes sont dans le thème, modifiables). */
export async function renderBanner(product: Image, palette: Palette, style: SceneStyle, format: Format = FORMATS.banner, seed = 5, background?: Image | null) {
  const s = await renderScene({ product, palette, style, format, productScale: 0.66, offsetX: 0.18, seed, background });
  return sharpJpeg(s.png);
}

async function sharpJpeg(png: Buffer) {
  const sharp = (await import("sharp")).default;
  return sharp(png).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}
