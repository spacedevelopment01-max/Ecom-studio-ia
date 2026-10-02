/**
 * Logos vectoriels : rendus par Skia puis exportés en SVG avec le texte
 * converti en tracés — le fichier s'affiche à l'identique partout, sans
 * dépendre des polices installées. Variantes : logotype, empilé,
 * monogramme, emblème.
 */
import { createCanvas, SvgExportFlag, type SKRSContext2D } from "@napi-rs/canvas";
import sharp from "sharp";
import { ensureFonts, font } from "./fonts";

export type LogoSpec = {
  name: string;
  tagline?: string;
  family: string;
  weight: number;
  italic?: boolean;
  case: "upper" | "title" | "lower" | "asis";
  tracking: number; // en em (0 à 0,4)
  layout: "wordmark" | "stacked" | "monogram" | "emblem";
  emblem: "none" | "circle" | "arch" | "line" | "diamond";
  monogram?: string;
  color: string;
};

function applyCase(s: string, c: LogoSpec["case"]) {
  if (c === "upper") return s.toLocaleUpperCase("fr-FR");
  if (c === "lower") return s.toLocaleLowerCase("fr-FR");
  if (c === "title") return s.replace(/\p{L}+/gu, (w) => w[0].toLocaleUpperCase("fr-FR") + w.slice(1));
  return s;
}

type Draw = (ctx: SKRSContext2D) => void;

function measure(text: string, family: string, weight: number, size: number, trackingEm: number, italic = false) {
  ensureFonts();
  const c = createCanvas(10, 10).getContext("2d");
  c.font = font(family, weight, size, italic);
  (c as any).letterSpacing = `${trackingEm * size}px`;
  const m = c.measureText(text);
  // L'interlettrage s'ajoute aussi après la dernière lettre : on le retire.
  return { width: m.width - (text.length ? trackingEm * size : 0), ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent };
}

function text(ctx: SKRSContext2D, s: string, x: number, y: number, family: string, weight: number, size: number, trackingEm: number, color: string, italic = false) {
  ctx.font = font(family, weight, size, italic);
  (ctx as any).letterSpacing = `${trackingEm * size}px`;
  ctx.fillStyle = color;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillText(s, x, y);
}

function render(width: number, height: number, draw: Draw) {
  const W = Math.ceil(width);
  const H = Math.ceil(height);
  const svgCanvas = createCanvas(W, H, SvgExportFlag.ConvertTextToPaths);
  draw(svgCanvas.getContext("2d"));
  const svg = svgCanvas.getContent().toString("utf8");
  return { svg, width: W, height: H, draw };
}

export function buildLogo(spec: LogoSpec) {
  const name = applyCase(spec.name.trim(), spec.case);
  const color = spec.color;
  const P = 36;
  const fam = spec.family;
  const wt = spec.weight;

  if (spec.layout === "monogram" || spec.layout === "emblem") {
    const letters = (spec.monogram || name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2)).toLocaleUpperCase("fr-FR");
    const box = 360;
    const size = letters.length > 1 ? 170 : 220;
    const m = measure(letters, fam, wt, size, 0.02, spec.italic);
    const frame = (ctx: SKRSContext2D, ox: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.beginPath();
      if (spec.emblem === "circle" || spec.emblem === "none") ctx.arc(ox + box / 2, box / 2, box / 2 - 8, 0, Math.PI * 2);
      if (spec.emblem === "arch") {
        ctx.moveTo(ox + 24, box - 12);
        ctx.lineTo(ox + 24, box / 2);
        ctx.arc(ox + box / 2, box / 2, box / 2 - 24, Math.PI, 0);
        ctx.lineTo(ox + box - 24, box - 12);
      }
      if (spec.emblem === "diamond") {
        ctx.moveTo(ox + box / 2, 10);
        ctx.lineTo(ox + box - 10, box / 2);
        ctx.lineTo(ox + box / 2, box - 10);
        ctx.lineTo(ox + 10, box / 2);
        ctx.closePath();
      }
      if (spec.emblem === "line") {
        ctx.moveTo(ox + 80, box - 70);
        ctx.lineTo(ox + box - 80, box - 70);
      }
      ctx.stroke();
    };
    const mono = (ctx: SKRSContext2D, ox: number) => text(ctx, letters, ox + (box - m.width) / 2, box / 2 + (m.ascent - m.descent) / 2, fam, wt, size, 0.02, color, spec.italic);
    if (spec.layout === "monogram") {
      return render(box, box, (ctx) => {
        frame(ctx, 0);
        mono(ctx, 0);
      });
    }
    const nameSize = 60;
    const nm = measure(name, fam, wt, nameSize, spec.tracking);
    const W = Math.max(box, nm.width) + P * 2;
    const H = box + 40 + nm.ascent + nm.descent + P;
    return render(W, H, (ctx) => {
      frame(ctx, (W - box) / 2);
      mono(ctx, (W - box) / 2);
      text(ctx, name, (W - nm.width) / 2, box + 40 + nm.ascent, fam, wt, nameSize, spec.tracking, color);
    });
  }

  const size = 120;
  if (spec.layout === "stacked") {
    const words = name.split(/\s+/).filter(Boolean);
    const lines = words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [name];
    const ms = lines.map((l) => measure(l, fam, wt, size, spec.tracking, spec.italic));
    const tagSize = 30;
    const tag = spec.tagline ? spec.tagline.toLocaleUpperCase("fr-FR") : "";
    const tm = tag ? measure(tag, "Jost", 500, tagSize, 0.24) : null;
    const W = Math.max(...ms.map((m) => m.width), tm?.width ?? 0) + P * 2;
    const lineGap = size * 1.02;
    const H = P + ms[0].ascent + lineGap * (lines.length - 1) + ms[ms.length - 1].descent + (tm ? tagSize * 2.4 : 0) + P;
    return render(W, H, (ctx) => {
      let y = P + ms[0].ascent;
      lines.forEach((l, i) => {
        text(ctx, l, (W - ms[i].width) / 2, y, fam, wt, size, spec.tracking, color, spec.italic);
        if (i < lines.length - 1) y += lineGap;
      });
      if (tm) text(ctx, tag, (W - tm.width) / 2, y + ms[ms.length - 1].descent + tagSize * 1.9, "Jost", 500, tagSize, 0.24, color);
    });
  }
  const m = measure(name, fam, wt, size, spec.tracking, spec.italic);
  const ruled = spec.emblem === "line";
  const W = m.width + P * 2;
  const H = P + m.ascent + m.descent + P + (ruled ? 26 : 0);
  return render(W, H, (ctx) => {
    text(ctx, name, P, P + m.ascent, fam, wt, size, spec.tracking, color, spec.italic);
    if (ruled) {
      ctx.fillStyle = color;
      ctx.fillRect(P, P + m.ascent + m.descent + 20, m.width, 5);
    }
  });
}

export function buildLogoSvg(spec: LogoSpec) {
  const b = buildLogo(spec);
  return { svg: b.svg, width: b.width, height: b.height };
}

/** Rendu matriciel net (dessiné directement par Skia). */
export async function logoPng(spec: LogoSpec, width: number): Promise<Buffer> {
  const built = buildLogo(spec);
  const scale = width / built.width;
  const c = createCanvas(Math.round(built.width * scale), Math.round(built.height * scale));
  const ctx = c.getContext("2d");
  ctx.scale(scale, scale);
  built.draw(ctx);
  return c.encode("png");
}

/** Ensemble livrable : logo principal (SVG + PNG), version claire, monogramme et favicon. */
export async function logoSet(spec: LogoSpec, lightColor = "#FFFFFF") {
  const monoSpec: LogoSpec = { ...spec, layout: "monogram", emblem: spec.emblem === "none" || spec.emblem === "line" ? "circle" : spec.emblem };
  const lightSpec = { ...spec, color: lightColor };
  return {
    mainSvg: buildLogo(spec).svg,
    mainPng: await logoPng(spec, 1200),
    lightSvg: buildLogo(lightSpec).svg,
    lightPng: await logoPng(lightSpec, 1200),
    monoSvg: buildLogo(monoSpec).svg,
    monoPng: await logoPng(monoSpec, 800),
    faviconPng: await sharp(await logoPng(monoSpec, 384)).resize(192, 192).png().toBuffer(),
  };
}
