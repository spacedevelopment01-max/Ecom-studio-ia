/**
 * Symbole de logo sur mesure : SVG de l'IA nettoyé (tout SVG malveillant ou hors règles refusé), lisibilité à
 * petite taille, repli sur la silhouette du produit puis sur la bibliothèque, proposition par défaut et favicon.
 */
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";
import { fitSymbol, sanitizeSymbolSvg, silhouetteSymbol, symbolLegibility, symbolPng, type CustomSymbol } from "@/lib/media/logo-symbol";
import { designSymbol, type SymbolAi, type SymbolCheck } from "@/lib/engine/logo-symbol";
import { logoSet } from "@/lib/media/logo";
import { logoProposals } from "@/lib/engine/identity";
import { localBrand } from "@/lib/engine/local";
import { emptyProduct } from "@/lib/project-types";
import { logoSymbolPassed } from "@/lib/ai/tasks";

const ACCENT = "#C25B78";
const GOOD = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="22" y="6" width="17" height="40" rx="8.5" fill="currentColor"/>
  <rect x="61" y="6" width="17" height="40" rx="8.5" fill="currentColor"/>
  <circle cx="50" cy="60" r="30" fill="none" stroke="${ACCENT}" stroke-width="13"/>
</svg>`;

const wrap = (inner: string, vb = "0 0 100 100") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>`;
const DISC = `<circle cx="50" cy="50" r="40"/>`;

/** Détourage synthétique : compagnon rond à deux oreilles, disque central d'une autre couleur (cas SOVA). */
async function bunnyCutout(): Promise<Buffer> {
  const c = createCanvas(600, 700);
  const x = c.getContext("2d");
  x.fillStyle = "#EBB8C0";
  x.beginPath();
  x.roundRect(130, 20, 90, 300, 45);
  x.roundRect(380, 20, 90, 300, 45);
  x.fill();
  x.beginPath();
  x.arc(300, 420, 260, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = "#EEEEEE";
  x.beginPath();
  x.arc(300, 430, 170, 0, Math.PI * 2);
  x.fill();
  return c.encode("png");
}

/** Détourage d'une canette : rectangle arrondi, silhouette banale. */
async function canCutout(): Promise<Buffer> {
  const c = createCanvas(300, 760);
  const x = c.getContext("2d");
  x.fillStyle = "#F2C230";
  x.beginPath();
  x.roundRect(20, 20, 260, 720, 30);
  x.fill();
  return c.encode("png");
}

const passing: SymbolCheck = { legible: true, evokesProduct: true, resemblesExistingLogo: false, score: 8, issues: [] };
function fakeAi(svgs: string[], checks: SymbolCheck[] = [passing]) {
  const calls = { draw: [] as (string | undefined)[], check: 0 };
  const ai: SymbolAi = {
    draw: async (feedback) => {
      calls.draw.push(feedback);
      const svg = svgs[Math.min(calls.draw.length - 1, svgs.length - 1)];
      return { concept: "Silhouette ronde aux deux oreilles du compagnon.", svg };
    },
    check: async () => checks[Math.min(calls.check++, checks.length - 1)],
    passed: logoSymbolPassed,
  };
  return { ai, calls };
}
const project = { product: { ...emptyProduct(), name: "Compagnon lapin", category: "Jouet" }, brand: null } as any;

describe("SVG de l'IA : nettoyage strict", () => {
  it("accepte un pictogramme conforme et n'en garde que des tracés normalisés", () => {
    const r = sanitizeSymbolSvg(GOOD, { accent: ACCENT });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.symbol.shapes).toHaveLength(3);
    expect(r.symbol.shapes.map((s) => s.tone)).toEqual(["main", "main", "accent"]);
    expect(r.symbol.shapes[2]).toMatchObject({ paint: "stroke", width: 13 });
    for (const s of r.symbol.shapes) expect(s.d).toMatch(/^M[0-9MLHVCAZ .-]+$/i);
    expect(symbolLegibility(fitSymbol(r.symbol)).ok).toBe(true);
  });

  const malicious: [string, string][] = [
    ["script", wrap(`${DISC}<script>alert(1)</script>`)],
    ["gestionnaire d'événement", wrap(`<circle cx="50" cy="50" r="40" onload="alert(1)"/>`)],
    ["image externe", wrap(`<image href="https://evil.example/x.png" width="100" height="100"/>`)],
    ["xlink", wrap(`<use xlink:href="#a"/>`)],
    ["texte", wrap(`<text x="10" y="50">SOVA</text>`)],
    ["texte nu", wrap(`${DISC}SOVA`)],
    ["style", wrap(`<circle cx="50" cy="50" r="40" style="fill:red"/>`)],
    ["balise style", wrap(`<style>@import url(https://evil.example/a.css);</style>${DISC}`)],
    ["dégradé url()", wrap(`<circle cx="50" cy="50" r="40" fill="url(#g)"/>`)],
    ["foreignObject", wrap(`<foreignObject width="100" height="100"><div>x</div></foreignObject>`)],
    ["entité / DOCTYPE", `<!DOCTYPE svg [<!ENTITY x "y">]>${wrap(DISC)}`],
    ["commentaire", wrap(`<!-- caché -->${DISC}`)],
    ["javascript:", wrap(`<a href="javascript:alert(1)">${DISC}</a>`)],
    ["transform", wrap(`<circle cx="50" cy="50" r="40" transform="scale(2)"/>`)],
    ["classe", wrap(`<circle cx="50" cy="50" r="40" class="x"/>`)],
    ["viewBox non carrée", wrap(DISC, "0 0 100 60")],
    ["viewBox absente", `<svg xmlns="http://www.w3.org/2000/svg">${DISC}</svg>`],
    ["trop de formes", wrap(`${DISC}${DISC}${DISC}${DISC}`)],
    ["trait fin", wrap(`<circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="1"/>`)],
    ["couleur hors palette", wrap(`<circle cx="50" cy="50" r="40" fill="#22CC22"/>`)],
    ["blanc", wrap(`<circle cx="50" cy="50" r="40" fill="#FFFFFF"/>`)],
    ["deux svg", wrap(DISC) + wrap(DISC)],
    ["svg imbriqué", wrap(`<svg viewBox="0 0 10 10">${DISC}</svg>`)],
    ["tracé exotique", wrap(`<path d="M10 10 L90 90 javascript"/>`)],
    ["coordonnées démesurées", wrap(`<circle cx="50" cy="50" r="99999999"/>`)],
    ["trop lourd", wrap(`<path d="M0 0${" L1 1".repeat(2000)}Z"/>`)],
    ["balise non fermée", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g>${DISC}</svg>`],
    ["vide", ""],
  ];
  for (const [what, svg] of malicious)
    it(`refuse : ${what}`, () => {
      const r = sanitizeSymbolSvg(svg, { accent: ACCENT });
      expect(r.ok, what).toBe(false);
    });

  it("refuse plus d'une forme d'accent sur un dessin monochrome", () => {
    const r = sanitizeSymbolSvg(wrap(`<circle cx="30" cy="50" r="15" fill="${ACCENT}"/><circle cx="70" cy="50" r="15" fill="${ACCENT}"/><rect x="10" y="80" width="80" height="12" fill="currentColor"/>`), { accent: ACCENT });
    expect(r.ok).toBe(false);
  });
});

describe("Lisibilité à petite taille", () => {
  it("refuse un dessin au trait trop fin ou trop petit dans son cadre", () => {
    const hair: CustomSymbol = { source: "ai", viewBox: [0, 0, 100], shapes: [{ d: "M10 50L90 50", paint: "stroke", tone: "main", width: 2 }] };
    expect(symbolLegibility(hair).ok).toBe(false);
    const tiny: CustomSymbol = { source: "ai", viewBox: [0, 0, 100], shapes: [{ d: "M45 45H55V55H45Z", paint: "fill", tone: "main" }] };
    expect(symbolLegibility(tiny).ok).toBe(false);
    // Recadré sur son dessin, le même carré remplit le cadre mais reste un pavé plein.
    expect(symbolLegibility(fitSymbol(tiny)).issues.join()).toMatch(/pavé/);
  });
});

describe("Silhouette du produit (repli sans IA)", () => {
  it("SOVA : contour lissé, symétrique, centré, en aplat, disque central gardé en réserve", async () => {
    const r = await silhouetteSymbol(await bunnyCutout());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.symbol.viewBox).toEqual([0, 0, 100]);
    expect(r.symbol.shapes).toHaveLength(1);
    expect(r.symbol.shapes[0]).toMatchObject({ paint: "fill", rule: "evenodd" });
    expect(r.symbol.shapes[0].d.match(/M/g)).toHaveLength(2); // contour + fenêtre
    expect(r.legibility.ok).toBe(true);
    // Centre de l'image à 64 px : la fenêtre (vide) ; haut des oreilles : encre des deux côtés, vide au milieu.
    const { data, info } = await sharp(await symbolPng(r.symbol, 64)).raw().toBuffer({ resolveWithObject: true });
    const a = (x: number, y: number) => data[(y * info.width + x) * 4 + 3];
    expect(a(32, 38)).toBeLessThan(40);
    expect(a(20, 8)).toBeGreaterThan(200);
    expect(a(44, 8)).toBeGreaterThan(200);
    expect(a(32, 8)).toBeLessThan(40);
  });

  it("refuse une silhouette banale (canette) : la bibliothèque prend le relais", async () => {
    const r = await silhouetteSymbol(await canCutout());
    expect(r.ok).toBe(false);
  });
});

describe("Choix du symbole : IA, puis silhouette, puis bibliothèque", () => {
  it("IA conforme et validée au contrôle visuel → symbole de l'IA", async () => {
    const { ai, calls } = fakeAi([GOOD]);
    const d = await designSymbol({ project, cutout: await bunnyCutout(), color: "#2B1D22", accent: ACCENT, ai });
    expect(d.symbol && d.source).toBe("ai");
    expect(calls.draw).toHaveLength(1);
  });

  it("SVG malveillant deux fois → refusé, nouvel essai guidé, puis silhouette", async () => {
    const evil = wrap(`${DISC}<script>fetch('https://evil.example')</script>`);
    const { ai, calls } = fakeAi([evil, evil]);
    const d = await designSymbol({ project, cutout: await bunnyCutout(), color: "#2B1D22", accent: ACCENT, ai });
    expect(calls.draw).toHaveLength(2);
    expect(calls.draw[1]).toMatch(/script/);
    expect(d.symbol && d.source).toBe("silhouette");
    expect(d.notes.join(" ")).toMatch(/SVG/);
    expect(JSON.stringify(d.symbol)).not.toMatch(/script|evil/);
  });

  it("symbole refusé au contrôle visuel (générique, ressemble à un logo) → jamais proposé", async () => {
    const generic: SymbolCheck = { legible: true, evokesProduct: false, resemblesExistingLogo: true, score: 5, issues: ["soleil générique"] };
    const { ai } = fakeAi([GOOD], [generic, generic, generic]);
    const d = await designSymbol({ project, cutout: null, color: "#2B1D22", accent: ACCENT, ai });
    expect(d.symbol).toBeNull();
    expect(d.notes.join(" ")).toMatch(/contrôle visuel/);
  });

  it("note insuffisante ou réponse du contrôle hors format → refus", () => {
    expect(logoSymbolPassed({ ...passing, score: 6 })).toBe(false);
    expect(logoSymbolPassed({ ...passing, legible: false })).toBe(false);
    expect(logoSymbolPassed(null)).toBe(false);
    expect(logoSymbolPassed(passing)).toBe(true);
  });

  it("IA en panne → silhouette ; sans IA ni silhouette exploitable → bibliothèque", async () => {
    const broken: SymbolAi = { draw: async () => { throw new Error("quota"); }, check: async () => passing, passed: logoSymbolPassed };
    const d1 = await designSymbol({ project, cutout: await bunnyCutout(), color: "#2B1D22", accent: ACCENT, ai: broken });
    expect(d1.symbol && d1.source).toBe("silhouette");
    const d2 = await designSymbol({ project, cutout: await canCutout(), color: "#2B1D22", accent: ACCENT, ai: null });
    expect(d2.symbol).toBeNull();
    const d3 = await designSymbol({ project, cutout: null, color: "#2B1D22", accent: ACCENT, ai: null });
    expect(d3.symbol).toBeNull();
  });
});

describe("Déclinaisons", () => {
  it("le symbole sur mesure remplace le symbole de bibliothèque (proposition et emblème)", async () => {
    const product = { ...emptyProduct(), name: "Compagnon lapin", sector: "enfants" as const, category: "Jouet" };
    const brand = localBrand(product, "SOVA").brand;
    const p = { product, brand, catalog: [], business: "products" } as any;
    const r = await silhouetteSymbol(await bunnyCutout());
    if (!r.ok) throw new Error(r.reason);
    const props = logoProposals(p, undefined, { symbol: r.symbol, concept: "Silhouette du compagnon.", source: "silhouette" });
    expect(props.map((x) => x.key)).toEqual(["logotype", "symbole", "embleme"]);
    expect(props[1].spec.custom).toBeTruthy();
    expect(props[2].spec.custom).toBeTruthy();
    expect(props[1].concept).toMatch(/Silhouette du compagnon/);
    const without = logoProposals(p);
    expect(without[1].spec.custom).toBeUndefined();
  });

  it("logo, marque réduite et favicon : le symbole remplit le favicon, aucun script dans le SVG", async () => {
    const r = await silhouetteSymbol(await bunnyCutout());
    if (!r.ok) throw new Error(r.reason);
    const set = await logoSet({ name: "SOVA", family: "Montserrat", weight: 700, case: "upper", tracking: 0.08, layout: "lockup", emblem: "none", symbol: "sun", custom: r.symbol, color: "#2B1D22", accent: ACCENT });
    expect(set.mainSvg).not.toMatch(/<script|href=/i);
    const fav = await sharp(set.faviconPng).resize(16, 16).raw().toBuffer({ resolveWithObject: true });
    let ink = 0;
    for (let i = 3; i < fav.data.length; i += 4) if (fav.data[i] > 128) ink++;
    // Le symbole occupe l'onglet (et pas un petit dessin perdu dans un cercle).
    expect(ink).toBeGreaterThan(256 * 0.2);
  });
});

describe("Graisse des polices du logo respectée partout", () => {
  const ink = async (png: Buffer) => {
    const { data, info } = await sharp(png).ensureAlpha().resize(600, null).raw().toBuffer({ resolveWithObject: true });
    let s = 0;
    for (let i = 3; i < data.length; i += 4) s += data[i];
    return s / 255 / (info.width * info.height);
  };
  const spec = (family: string, weight: number) => ({ name: "SOVA", family, weight, case: "upper" as const, tracking: 0.04, layout: "wordmark" as const, emblem: "none" as const, color: "#111111" });

  it("les fichiers de graisse sont trouvés même lancé depuis un autre dossier", async () => {
    const { findFontDir } = await import("@/lib/media/fonts");
    const spy = vi.spyOn(process, "cwd").mockReturnValue("/tmp");
    try {
      expect(fs.existsSync(path.join(findFontDir(), "Montserrat-800.ttf"))).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  for (const family of ["Montserrat", "Archivo"])
    it(`${family} 800 nettement plus gras que 400 (PNG et SVG exporté vectorisé)`, async () => {
      const { availableWeights } = await import("@/lib/media/fonts");
      expect(availableWeights(family)).toEqual(expect.arrayContaining([400, 800]));
      const { logoPng, buildLogoSvg } = await import("@/lib/media/logo");
      const thin = await ink(await logoPng(spec(family, 400), 600));
      const bold = await ink(await logoPng(spec(family, 800), 600));
      expect(bold / thin).toBeGreaterThan(1.35);
      // SVG autonome : texte converti en tracés (aucune police requise), graisse conservée au rendu.
      const s4 = buildLogoSvg(spec(family, 400)).svg, s8 = buildLogoSvg(spec(family, 800)).svg;
      expect(s8).not.toMatch(/<text|font-family/i);
      const r = (await ink(await sharp(Buffer.from(s8)).png().toBuffer())) / (await ink(await sharp(Buffer.from(s4)).png().toBuffer()));
      expect(r).toBeGreaterThan(1.35);
    });
});
