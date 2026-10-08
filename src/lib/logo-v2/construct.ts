/**
 * Construction hybride (Logo V2) : un territoire devient un logo PROPRE et maîtrisé.
 *  - typographie : vraie police du studio, texte converti en tracés vectoriels → le nom est EXACT (accents compris),
 *    aucune lettre inventée, aucune baseline ajoutée ;
 *  - symbole : dessin vectoriel de l'IA nettoyé (liste blanche) et testé en petite taille, ou image de l'IA d'images
 *    vectorisée — jamais une image matricielle présentée comme un logo vectoriel ; à défaut, monogramme construit ;
 *  - composition, proportions, couleurs : construites par le code (fond transparent, SVG, déclinaisons possibles).
 */
import fs from "node:fs";
import opentype from "opentype.js";
import sharp from "sharp";
import { contrast } from "../color";
import { canvasFamily, fontFile } from "../media/fonts";
import { logoPng, type LogoSpec } from "../media/logo";
import { buildMonogram } from "../media/monogram";
import { fitSymbol, sanitizeSymbolSvg, symbolLegibility, type CustomSymbol } from "../media/logo-symbol";
import { STYLE_FONTS, WEIGHT, nearestWeight } from "./territories";
import type { BrandBrief, Candidate, Territory } from "./types";

const TRACKING = { tight: 0, normal: 0.04, wide: 0.16 } as const;

/** Glyphes absents de la police (le nom serait rendu faux) : la famille est alors écartée. */
export function missingGlyphs(text: string, family: string, weight: number): string[] {
  try {
    const f = opentype.parse(fs.readFileSync(fontFile(family, weight)).buffer as ArrayBuffer);
    return [...new Set([...text].filter((ch) => ch.trim() && f.charToGlyphIndex(ch) === 0))];
  } catch {
    return [];
  }
}

/** Polices du style, dans l'ordre, capables d'écrire le nom exact. */
export function fontsFor(t: Territory, brief: BrandBrief): string[] {
  if (brief.fontsLocked) return [canvasFamily(brief.fontsLocked.heading)];
  return STYLE_FONTS[t.typography.style].filter((f) => !missingGlyphs(brief.name, f, nearestWeight(f, WEIGHT[t.typography.weight])).length);
}

/** Couleurs du territoire, lisibles en impression sur blanc (contraste ≥ 4,5 pour l'encre). */
export function territoryColors(t: Territory, brief: BrandBrief) {
  let ink = brief.palette[t.colorRole.ink];
  if (contrast(ink, "#FFFFFF") < 4.5) ink = contrast(brief.palette.dark, "#FFFFFF") >= 4.5 ? brief.palette.dark : "#1A1A1A";
  const accent = brief.palette[t.colorRole.accent];
  return { ink, accent: contrast(accent, "#FFFFFF") < 1.6 ? ink : accent };
}

const LAYOUT: Record<Territory["composition"], LogoSpec["layout"]> = { horizontal: "lockup", stacked: "vertical", badge: "badge", wordmark_only: "wordmark" };

export type SymbolInput = { symbol: CustomSymbol; source: Candidate["symbolSource"] } | null;

/** Symbole venant de l'IA (SVG) : nettoyé, recadré, lisible en petit — sinon refusé avec la raison. */
export function cleanSymbol(svg: string, accent: string): { ok: true; symbol: CustomSymbol } | { ok: false; reason: string } {
  const c = sanitizeSymbolSvg(svg, { accent });
  if (!c.ok) return { ok: false, reason: `SVG refusé : ${c.reason}` };
  const sym = fitSymbol(c.symbol, 0.06);
  const leg = symbolLegibility(sym);
  return leg.ok ? { ok: true, symbol: sym } : { ok: false, reason: `illisible en petit : ${leg.issues.join(" ; ")}` };
}

/** Logo construit d'un territoire (police choisie, symbole fourni ou monogramme). */
export function buildCandidate(t: Territory, brief: BrandBrief, opts: { family: string; attempt: number; symbol: SymbolInput; change?: string | null; layout?: LogoSpec["layout"]; tracking?: number; weight?: number }): Candidate {
  const { ink, accent } = territoryColors(t, brief);
  const weight = opts.weight ?? nearestWeight(opts.family, WEIGHT[t.typography.weight]);
  const needsMark = t.markType !== "wordmark";
  let custom: CustomSymbol | undefined;
  let source: Candidate["symbolSource"] = "none";
  if (needsMark && opts.symbol && (t.markType === "symbol_wordmark" || t.markType === "abstract_mark" || t.markType === "emblem")) {
    custom = opts.symbol.symbol;
    source = opts.symbol.source;
  } else if (needsMark) {
    custom = buildMonogram(brief.name, { family: opts.family, weight: nearestWeight(opts.family, 800), frame: t.markType === "lettermark" ? "none" : t.composition === "badge" ? "disc" : "corner", tone: "main" }) ?? undefined;
    source = custom ? "monogram" : "none";
  }
  const layout = opts.layout ?? (needsMark && t.composition === "wordmark_only" ? "lockup" : LAYOUT[t.composition]);
  const spec: LogoSpec = {
    name: brief.name,
    family: opts.family,
    weight,
    case: t.typography.case,
    tracking: opts.tracking ?? TRACKING[t.typography.tracking],
    layout,
    emblem: layout === "badge" ? "circle" : "none",
    custom,
    color: ink,
    accent,
    markFrame: false,
    // Aucune signature : seul le nom exact figure dans le logo (une signature validée par le client viendra au choix).
    tagline: undefined,
  };
  return { territoryId: t.id, attempt: opts.attempt, spec, change: opts.change ?? null, symbolSource: source };
}

/** Texte que le logo affichera (casse appliquée par le rendu) : comparé à la lecture de la planche. */
export function expectedText(spec: Pick<LogoSpec, "name" | "case">): string {
  return spec.case === "upper" ? spec.name.toLocaleUpperCase("fr-FR") : spec.case === "lower" ? spec.name.toLocaleLowerCase("fr-FR") : spec.name;
}

/**
 * Planche de contrôle (comme en agence, AVANT tout mockup) : le logo sur fond neutre, en noir seul, en blanc sur fond
 * sombre, et en petite taille (64 px et 24 px). C'est elle que juge la barrière de qualité.
 */
export async function reviewBoard(spec: LogoSpec): Promise<Buffer> {
  const W = 1600;
  const cell = async (s: LogoSpec, w: number, bg: string, h: number) => {
    const png = await logoPng(s, w);
    const img = await sharp(png).resize({ width: Math.min(w, 700), height: h - 60, fit: "inside" }).png().toBuffer();
    return sharp({ create: { width: 780, height: h, channels: 4, background: bg } }).composite([{ input: img, gravity: "center" }]).png().toBuffer();
  };
  const mono = { ...spec, color: "#111111", accent: "#111111" };
  const white = { ...spec, color: "#FFFFFF", accent: "#FFFFFF" };
  const a = await cell(spec, 900, "#F4F3EF", 420);
  const b = await cell(mono, 900, "#FFFFFF", 420);
  const c = await cell(white, 900, "#16161A", 300);
  const small64 = await sharp(await logoPng(spec, 160)).resize({ width: 160, height: 64, fit: "inside" }).png().toBuffer();
  const small24 = await sharp(await logoPng(spec, 64)).resize({ width: 64, height: 24, fit: "inside" }).png().toBuffer();
  const d = await sharp({ create: { width: 780, height: 300, channels: 4, background: "#FFFFFF" } })
    .composite([
      { input: small64, left: 120, top: 110 },
      { input: small24, left: 420, top: 130 },
    ])
    .png()
    .toBuffer();
  return sharp({ create: { width: W, height: 760, channels: 4, background: "#DADAD6" } })
    .composite([
      { input: a, left: 13, top: 13 },
      { input: b, left: 807, top: 13 },
      { input: c, left: 13, top: 446 },
      { input: d, left: 807, top: 446 },
    ])
    .jpeg({ quality: 88 })
    .toBuffer();
}
