/**
 * Monogramme construit localement (sans IA) : l'initiale de la marque, dessinée dans la police de la piste
 * puis convertie en tracés (jamais de texte ni de police dans le fichier), posée en réserve dans un contenant
 * géométrique (disque, arche, carré à un angle vif). Le résultat est un symbole normalisé (0–100) comme
 * ceux de l'IA ou de la silhouette : même rendu, mêmes contrôles de lisibilité.
 */
import { createCanvas, Path2D, SvgExportFlag } from "@napi-rs/canvas";
import { ensureFonts, font } from "./fonts";
import { fitSymbol, symbolLegibility, type CustomSymbol } from "./logo-symbol";

export type MonogramFrame = "disc" | "arch" | "corner" | "inversion" | "none";

const r2 = (n: number) => String(Math.round(n * 100) / 100);

/** Initiale à monogrammer : première lettre du premier mot qui n'est pas un mot d'habillage (« Maison », « Les »…). */
export function monogramLetter(name: string): string {
  const words = name.normalize("NFC").split(/[\s'’-]+/).filter(Boolean);
  const skip = /^(maison|atelier|les|le|la|the|studio|house|l|d)$/i;
  const w = words.find((x) => !skip.test(x) && /\p{L}/u.test(x)) ?? words[0] ?? "";
  const ch = [...w].find((c) => /\p{L}/u.test(c)) ?? "";
  return ch.toLocaleUpperCase("fr-FR");
}

/**
 * Contour vectoriel d'une lettre dans une famille du studio (tracé SVG absolu, M/L/Q/C/Z) et sa boîte d'encre.
 * Rendu en tracés par Skia, donc identique partout, sans police installée.
 */
export function glyphOutline(letter: string, family: string, weight: number): { d: string; box: [number, number, number, number] } | null {
  if (!letter) return null;
  ensureFonts();
  const S = 400;
  const c = createCanvas(S, S, SvgExportFlag.ConvertTextToPaths);
  const ctx = c.getContext("2d");
  ctx.font = font(family, weight, 260);
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(letter, 60, 300);
  const svg = c.getContent().toString("utf8");
  const ds = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1].trim()).filter(Boolean);
  const d = ds.join(" ");
  // Seules les commandes absolues attendues de Skia sont acceptées (sinon le recalage des coordonnées serait faux).
  if (!d || /[^MLQCZ0-9eE.,\s+-]/.test(d)) return null;
  const nums = (d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []).map(Number);
  if (nums.length < 6) return null;
  // Boîte d'encre mesurée au rendu (les points de contrôle des courbes débordent du dessin).
  const box = inkBox(d, S);
  return box ? { d, box } : null;
}

/** Boîte d'encre [x, y, largeur, hauteur] d'un tracé rendu dans un carré de côté S. */
function inkBox(d: string, S: number): [number, number, number, number] | null {
  const N = 400;
  const c = createCanvas(N, N);
  const ctx = c.getContext("2d");
  ctx.scale(N / S, N / S);
  ctx.fillStyle = "#000";
  ctx.fill(new Path2D(d));
  const data = ctx.getImageData(0, 0, N, N).data;
  let x0 = N, y0 = N, x1 = -1, y1 = -1;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (data[(y * N + x) * 4 + 3] > 100) {
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (x1 < 0) return null;
  const k = S / N;
  return [x0 * k, y0 * k, (x1 - x0 + 1) * k, (y1 - y0 + 1) * k];
}

/** Applique x → x * k + dx, y → y * k + dy à un tracé absolu fait de paires « x y ». */
function place(d: string, k: number, dx: number, dy: number) {
  return d.replace(/(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)[ ,](-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)/gi, (_, a, b) => `${r2(Number(a) * k + dx)} ${r2(Number(b) * k + dy)}`);
}

/** Contenants dessinés sur une grille de 100 (centre optique de la lettre en second). */
const FRAMES: Record<Exclude<MonogramFrame, "none">, { d: string; center: [number, number]; capH: number; maxW: number }> = {
  disc: { d: "M2 50A48 48 0 1 0 98 50A48 48 0 1 0 2 50Z", center: [50, 50], capH: 46, maxW: 56 },
  // Arche : haut en plein cintre, base droite (esprit vitrine, enseigne).
  arch: { d: "M12 98V46A38 38 0 0 1 88 46V98Z", center: [50, 61], capH: 42, maxW: 52 },
  // Carré aux angles arrondis, sauf l'angle bas droit, vif : le « détail » qui signe le contenant.
  corner: { d: "M24 4H76A20 20 0 0 1 96 24V96H24A20 20 0 0 1 4 76V24A20 20 0 0 1 24 4Z", center: [50, 51], capH: 46, maxW: 56 },
  // Inversion : un disque décalé que la lettre, plus grande, traverse — en réserve dedans, en plein dehors.
  inversion: { d: "M4 46A36 36 0 1 0 76 46A36 36 0 1 0 4 46Z", center: [58, 54], capH: 72, maxW: 66 },
};

/**
 * Monogramme : initiale en réserve dans le contenant (fill-rule evenodd), ou initiale seule (« none »).
 * Refusé (null) si la lettre est introuvable dans la police ou si le résultat est illisible en petit.
 */
export function buildMonogram(name: string, opts: { family: string; weight: number; frame: MonogramFrame; tone?: "main" | "accent"; dot?: boolean }): CustomSymbol | null {
  const letter = monogramLetter(name);
  const g = glyphOutline(letter, opts.family, opts.weight);
  if (!g) return null;
  const [gx, gy, gw, gh] = g.box;
  const tone = opts.tone ?? "main";
  let sym: CustomSymbol;
  if (opts.frame === "none") {
    // Initiale seule, éventuellement suivie du point d'accent du logotype (« L. »).
    const dr = opts.dot ? gh * 0.085 : 0;
    const dg = opts.dot ? gh * 0.07 : 0;
    const tw = gw + (opts.dot ? dg + dr * 2 : 0);
    const k = 84 / Math.max(tw, gh);
    const ox = 50 - (gx + tw / 2) * k, oy = 50 - (gy + gh / 2) * k;
    sym = { source: "monogram", viewBox: [0, 0, 100], shapes: [{ d: place(g.d, k, ox, oy), paint: "fill", tone, rule: "nonzero" }] };
    if (opts.dot) {
      const cx = (gx + gw + dg + dr) * k + ox, cy = (gy + gh - dr) * k + oy, rr = dr * k;
      sym.shapes.push({ d: `M${r2(cx - rr)} ${r2(cy)}A${r2(rr)} ${r2(rr)} 0 1 0 ${r2(cx + rr)} ${r2(cy)}A${r2(rr)} ${r2(rr)} 0 1 0 ${r2(cx - rr)} ${r2(cy)}Z`, paint: "fill", tone: "accent", rule: "nonzero" });
    }
  } else {
    const f = FRAMES[opts.frame];
    const k = Math.min(f.capH / gh, f.maxW / gw);
    const letterD = place(g.d, k, f.center[0] - (gx + gw / 2) * k, f.center[1] - (gy + gh / 2) * k);
    sym = { source: "monogram", viewBox: [0, 0, 100], shapes: [{ d: `${f.d} ${letterD}`, paint: "fill", tone, rule: "evenodd" }] };
  }
  const fitted = fitSymbol(sym, 0.02);
  return symbolLegibility(fitted).ok ? fitted : null;
}
