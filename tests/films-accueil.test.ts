/**
 * Petits films explicatifs de l'accueil (public/explainers) : chaque film et son affiche existent en français et en
 * anglais, avec une taille raisonnable, et la page qui les fabrique (scripts/explainers/explainers.html) ne montre
 * que des démos du manifeste, réparties entre produits et services, sans gabarit du studio ni image manquante.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "public", "explainers");
const PAGE = path.join(ROOT, "scripts", "explainers", "explainers.html");
const SCENES = ["hero", "photo", "themes", "chat", "formats", "cal"];
const html = fs.readFileSync(PAGE, "utf8");

/** Images d'une scène de la page (attributs src). */
function sceneImages(id: string): string[] {
  const start = html.indexOf(`<section class="scene" id="${id}">`);
  const end = html.indexOf("</section>", start);
  expect(start).toBeGreaterThan(-1);
  return [...html.slice(start, end).matchAll(/src="([^"]+)"/g)].map((m) => m[1]);
}

describe("films explicatifs de l'accueil", () => {
  it.each(SCENES.flatMap((s) => ["", ".en"].map((l) => [s, l])))("%s%s : vidéo et affiche présentes", (s, l) => {
    const mp4 = path.join(OUT, `${s}${l}.mp4`);
    const jpg = path.join(OUT, `${s}${l}.jpg`);
    expect(fs.existsSync(mp4)).toBe(true);
    expect(fs.existsSync(jpg)).toBe(true);
    expect(fs.statSync(mp4).size).toBeGreaterThan(50_000);
    expect(fs.statSync(mp4).size).toBeLessThan(3_000_000);
    expect(fs.statSync(jpg).size).toBeLessThan(400_000);
  });

  it("le film du haut de page existe en français et en anglais", () => {
    for (const f of ["film-court.mp4", "film-court.jpg", "film-court.en.mp4", "film-court.en.jpg"]) expect(fs.existsSync(path.join(OUT, f))).toBe(true);
  });

  it("chaque image utilisée existe et vient d'une démo du manifeste, sans gabarit", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "public", "demo", "manifest.json"), "utf8"));
    const demos = new Set<string>([...manifest.demos.map((d: { id: string }) => d.id), "directions"]);
    const all = SCENES.flatMap(sceneImages);
    expect(all.length).toBeGreaterThan(20);
    for (const src of all) {
      expect(fs.existsSync(path.resolve(path.dirname(PAGE), src)), src).toBe(true);
      expect(src, "gabarit du studio interdit").not.toMatch(/\/(post|ad|banner|social|detail)-\d/);
      const demo = src.match(/public\/demo\/([^/]+)\//)?.[1];
      if (demo) expect(demos.has(demo), src).toBe(true);
      else expect(src, "visuel ARVEN de référence").toMatch(/^\.\.\/film\/arven\//);
    }
    expect(html).not.toMatch(/ostral|chronographe/i);
  });

  it("répartition : une démo par film, deux services, la montre dans deux films au plus", () => {
    const demoOf = (id: string) => new Set(sceneImages(id).map((s) => s.match(/demo\/([^/]+)\//)?.[1] ?? "montre"));
    expect([...demoOf("photo")]).toEqual(["tribunes"]);
    expect([...demoOf("themes")]).toEqual(["directions"]);
    expect([...demoOf("chat")]).toEqual(["montre"]);
    expect([...demoOf("formats")]).toEqual(["fleuriste"]);
    expect([...demoOf("cal")]).toEqual(["paysagiste"]);
    expect([...demoOf("hero")].sort()).toEqual(["casque", "fleuriste", "montre"]);
    expect(SCENES.filter((s) => demoOf(s).has("montre")).length).toBeLessThanOrEqual(2);
  });
});
