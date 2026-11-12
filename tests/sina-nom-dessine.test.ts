/**
 * SINA — le nom dessiné en code (décision du propriétaire du 12 novembre 2026) : composé par le Studio avec la vraie
 * police de titres, en tracés, toujours exact à la lettre ; c'est aussi le logo de secours. Aucun appel d'IA.
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { FONT_FILES } from "@/lib/theme/render";
import { HEADING_ONLY } from "@/lib/syna-agent/identities";
import { drawWordmark, drawableHandle, missingLetters, wordmarkPng, wordmarkSvg } from "@/lib/syna-agent/brand-wordmark";
import { safeWordmark } from "@/lib/syna-agent/brand-routes";
import { sanitizeArt } from "@/lib/syna-agent/brand-art";
import { route, series } from "./sina-routes-fixtures";

const plain = { case: "asis" as const, tracking: 0, align: "gauche" as const, dot: false, symbolPlace: "gauche" as const };
const numbers = (d: string) => (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

describe("SINA — le nom dessiné en code", () => {
  it("les quatre routes d'essai : des tracés seuls, aucune coordonnée abîmée, aucun texte ni script", () => {
    for (const x of series(4)) {
      const w = drawWordmark(x.name, x.board.wordmark, x.fonts.heading);
      expect(w.shapes.length).toBeGreaterThan(0);
      for (const s of w.shapes) expect(s.d).toMatch(/^[MLHVCSQTAZmlhvcsqtaz0-9eE+\-., ]+$/);
      const svg = wordmarkSvg(w, { main: x.palette.dark, accent: x.palette.accent });
      expect(svg).not.toMatch(/NaN|<text|<script|font-family|href/);
      expect(w.width).toBeGreaterThan(w.height * 0.8);
      // Tout le dessin tient dans son cadre.
      const xs = w.shapes.flatMap((s) => numbers(s.d));
      expect(Math.max(...xs)).toBeLessThan(Math.max(w.width, w.height) + 1);
    }
  });

  it("toutes les polices du catalogue écrivent un nom accentué sans tracé abîmé (lettre par lettre)", () => {
    const failed: string[] = [];
    for (const [key, f] of Object.entries(FONT_FILES)) {
      const weight = Object.keys(f.files).map(Number).sort((a, b) => Math.abs(a - 700) - Math.abs(b - 700))[0];
      const handle = `${key}_n${String(weight)[0]}`;
      try {
        const w = drawWordmark("Lâche l'Été Éclat", { ...plain, case: "upper", tracking: 0.04 }, handle);
        if (!w.shapes.length || w.shapes.some((s) => /NaN/.test(s.d))) failed.push(handle);
      } catch (e) { failed.push(`${handle} (${(e as Error).message.slice(0, 40)})`); }
    }
    expect(failed).toEqual([]);
    expect(HEADING_ONLY.size).toBeGreaterThan(0);
  });

  it("la recette : capitales, mise en lignes, espacement, point final et petit signe", () => {
    const b = route("B");
    const stacked = drawWordmark(b.name, b.board.wordmark, b.fonts.heading);
    expect(stacked.text).toBe("LÂCHE LE\nMOR\nCEAU");
    const flat = drawWordmark(b.name, { ...b.board.wordmark, lines: undefined }, b.fonts.heading);
    expect(flat.text).toBe("LÂCHE LE MORCEAU");
    expect(stacked.height).toBeGreaterThan(flat.height * 2);
    expect(stacked.width).toBeLessThan(flat.width);
    const tight = drawWordmark("Solstice", plain, "inter_n7"), wide = drawWordmark("Solstice", { ...plain, tracking: 0.3 }, "inter_n7");
    expect(wide.width).toBeGreaterThan(tight.width * 1.3);
    const dot = drawWordmark("trempette", { ...plain, case: "lower", dot: true }, "fraunces_n8");
    expect(dot.shapes.filter((s) => s.tone === "accent")).toHaveLength(1);
    expect(drawWordmark("éclat de thé", { ...plain, case: "title" }, "inter_n7").text).toBe("Éclat de Thé");
    const symbol = { source: "ai" as const, viewBox: [0, 0, 100] as [number, number, number], shapes: [{ d: "M10 10H90V90H10Z", paint: "fill" as const, tone: "accent" as const }] };
    const left = drawWordmark("Solstice", { ...plain, symbol }, "inter_n7"), above = drawWordmark("Solstice", { ...plain, symbol, symbolPlace: "dessus" }, "inter_n7");
    expect(left.symbol!.x).toBeLessThan(left.width / 3);
    expect(left.width).toBeGreaterThan(tight.width + left.symbol!.size);
    expect(above.height).toBeGreaterThan(tight.height + above.symbol!.size);
    expect(wordmarkSvg(left, { main: "#111111", accent: "#FF0000" })).toMatch(/<svg x="[\d.]+" y="[\d.]+" width="[\d.]+" height="[\d.]+" viewBox="0 0 100 100"><path d="M10 10H90V90H10Z" fill="#FF0000"\/>/);
  });

  it("une police qui ne sait pas écrire une lettre du nom est remplacée par une police sûre, jamais par un carré vide", () => {
    expect(missingLetters("Été", "inter_n7")).toEqual([]);
    expect(missingLetters("日本", "inter_n7")).toEqual(["日", "本"]);
    expect(drawableHandle("Été", "playfair_display_n7")).toBe("playfair_display_n7");
    const h = drawableHandle("Été", "police_inconnue_n4");
    expect(["inter_n7", "dm_sans_n7", "playfair_display_n7"]).toContain(h);
    expect(drawWordmark("Été", plain, "police_inconnue_n4").family).toBe("Inter");
  });

  it("le même dessin devient une image nette (logo de secours), sur fond transparent ou coloré", async () => {
    const a = route("A");
    const w = drawWordmark(a.name, a.board.wordmark, a.fonts.heading);
    const png = await wordmarkPng(w, { main: a.palette.light, accent: a.palette.accent, background: a.palette.dark }, 1200);
    const meta = await sharp(png).metadata();
    expect(meta.format).toBe("png");
    expect(meta.width).toBe(1200);
    // Fond sombre et lettres claires : les deux couleurs sont bien dans l'image.
    const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
    let light = 0, dark = 0;
    for (let i = 0; i < data.length; i += info.channels) { const v = data[i] + data[i + 1] + data[i + 2]; if (v > 600) light++; else if (v < 200) dark++; }
    expect(light).toBeGreaterThan(1000);
    expect(dark).toBeGreaterThan(light);
    const clear = await sharp(await wordmarkPng(w, { main: "#000000", accent: "#000000" }, 600)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(clear.data[3]).toBe(0); // coin transparent
  });

  // ------------------------------------------------------------ gestes de lettrage (« la base des logos »)

  it("une ligne qui penche, un mot en couleur, une taille par ligne : des réglages, jamais d'autres lettres", () => {
    const base = drawWordmark("Lâche le Morceau", { ...plain, case: "upper", lines: ["LÂCHE LE", "MOR", "CEAU"] }, "archivo_black_n4");
    const w = drawWordmark("Lâche le Morceau", { ...plain, case: "upper", lines: ["LÂCHE LE", "MOR", "CEAU"], tilt: [0, 0, 5], accentWords: [2], scale: [1, 1.4, 1] }, "archivo_black_n4");
    expect(w.text).toBe(base.text);
    expect(w.shapes.filter((s) => s.transform).length).toBeGreaterThan(0);
    expect(w.shapes.find((s) => s.transform)!.transform).toMatch(/^rotate\(5 /);
    expect(w.shapes.some((s) => s.tone === "accent")).toBe(true);
    // La ligne penchée descend : le cadre lui fait de la place ; la ligne agrandie élargit le dessin.
    expect(w.height).toBeGreaterThan(base.height);
    expect(wordmarkSvg(w, { main: "#111111", accent: "#FF2E63" })).not.toMatch(/NaN|<text/);
  });

  it("le nom coupé par une ligne : le bas prend la couleur d'accent, par découpe (les lettres ne changent pas)", () => {
    const x = route("A");
    const w = drawWordmark(x.name, x.board.wordmark, x.fonts.heading);
    expect(w.cut!.y).toBeGreaterThan(0);
    expect(w.cut!.y).toBeLessThan(w.height);
    expect(w.cut!.wave).toMatch(/^M[\d. ]+Q/);
    const svg = wordmarkSvg(w, { main: "#F2F0FF", accent: "#FF8A5C" });
    expect(svg).toMatch(/clip-path="url\(#wm-haut\)"/);
    expect(svg).toMatch(/clip-path="url\(#wm-bas\)"/);
    expect(svg).toMatch(/fill="#FF8A5C"/);
  });

  it("une lettre remplacée par un dessin : elle n'est plus tracée, le dessin prend sa place ; les mots à la main s'enlèvent en petit", async () => {
    const x = route("B");
    const w = drawWordmark(x.name, x.board.wordmark, x.fonts.heading);
    expect(w.arts).toHaveLength(1);
    expect(w.arts![0].size).toBeGreaterThan(40);
    const without = drawWordmark(x.name, { ...x.board.wordmark, swap: undefined, note: undefined }, x.fonts.heading);
    const length = (d: typeof w) => d.shapes.filter((s) => s.part !== "note").reduce((n, s) => n + s.d.length, 0);
    expect(length(w)).toBeLessThan(length(without)); // le O n'est plus tracé
    // Mots à la main : des tracés marqués, et un cadre sans eux pour les petites tailles.
    expect(w.shapes.some((s) => s.part === "note")).toBe(true);
    expect(w.core!.height).toBeLessThan(w.height);
    const svg = wordmarkSvg(w, { main: x.palette.dark, accent: x.palette.primary });
    expect(svg).not.toMatch(/NaN|<text|<script|font-family|href/);
    const png = await wordmarkPng(w, { main: x.palette.dark, accent: x.palette.primary, background: "#FFE23D" }, 600);
    expect((await sharp(png).metadata()).width).toBe(600);
  });

  it("un geste qui vise une ligne, un mot ou une lettre absents du nom est retiré, jamais deviné", () => {
    const art = sanitizeArt('<svg viewBox="-12 -12 24 24"><circle r="10" fill="#FFE44D"/></svg>');
    if (!art.ok) throw new Error(art.reason);
    const w = safeWordmark({ ...plain, lines: ["Bain de", "Minuit"], scale: [1, 1.2, 0.8], tilt: [2, -2, 4], accentWords: [1, 1, 9], swap: { letter: 25, art: art.art } }, "Bain de Minuit");
    expect(w.scale).toEqual([1, 1.2]);
    expect(w.tilt).toEqual([2, -2]);
    expect(w.accentWords).toEqual([1]);
    expect(w.swap).toBeUndefined();
    // Seul un O sans accent se remplace par un dessin (un rond se lit « O ») : jamais un A, un i, un ô.
    expect(safeWordmark({ ...plain, swap: { letter: 4, art: art.art } }, "Tintamarre").swap).toBeUndefined();
    expect(safeWordmark({ ...plain, swap: { letter: 3, art: art.art } }, "Plein les Yeux").swap).toBeUndefined();
    expect(safeWordmark({ ...plain, swap: { letter: 8, art: art.art } }, "L'Eau Est Bonne").swap?.letter).toBe(9);
    expect(safeWordmark({ ...plain, swap: { letter: 1, art: art.art } }, "Morceaux Choisis").swap?.letter).toBe(1);
    expect(safeWordmark({ ...plain, swap: { letter: 1, art: art.art } }, "Côté Cour").swap).toBeUndefined();
    // Un nom écrit avec des capitales aux mots : les petits mots restent en minuscules.
    expect(drawWordmark("Plein les Yeux", { ...plain, case: "title" }, "nunito_n9").text).toBe("Plein les Yeux");
    expect(drawWordmark("l'eau est bonne", { ...plain, case: "title" }, "nunito_n9").text).toBe("L'Eau Est Bonne");
    expect(drawWordmark("lâche le morceau", { ...plain, case: "title" }, "nunito_n9").text).toBe("Lâche le Morceau");
    // Tous les mots en couleur d'accent : le geste ne dit plus rien, il est retiré.
    expect(safeWordmark({ ...plain, accentWords: [0, 1, 2] }, "Bain de Minuit").accentWords).toBeUndefined();
    // Une mise en lignes fausse emporte les réglages par ligne (ils n'ont plus de ligne à régler).
    expect(safeWordmark({ ...plain, lines: ["Bain", "Minuit"], tilt: [0, 5] }, "Bain de Minuit")).toMatchObject({ tilt: [0] });
  });
});
