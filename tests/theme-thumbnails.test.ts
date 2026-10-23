/**
 * Vignettes de la galerie (diagnostic du 22 octobre) : la vignette suivie de chaque thème doit montrer la démo actuelle.
 * Celle de TRAVERSE datait d'avant la réécriture et affichait encore « du café du matin », lu comme le texte de SILLON.
 * scripts/theme-thumbnails.ts note à côté de chaque vignette le titre d'ouverture photographié ; ce titre doit être celui
 * des textes actuels de la démo. Un texte d'ouverture modifié sans vignette refaite fait échouer ce contrôle.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const TRACKED: Record<string, string> = {
  sillon: "tests/sillon-fixtures.ts", noctil: "tests/noctil-traverse-fixtures.ts", traverse: "tests/traverse-fixtures.ts",
  heuren: "tests/heuren-alcove-fixtures.ts", rive: "tests/rive-fixtures.ts", alcove: "tests/heuren-alcove-fixtures.ts", "museau-club": "tests/museau-souple-fixtures.ts", souple: "tests/museau-souple-fixtures.ts",
};
// Texte des démos sans balises ni retours à la ligne, pour retrouver un titre composé de plusieurs réglages.
const flat = (s: string) => s.replace(/\\n|<br\s*\/?>/g, " ").replace(/\s+/g, " ").toLowerCase();

describe("vignettes suivies de la galerie des thèmes", () => {
  it.each(Object.entries(TRACKED))("%s : la vignette montre l'ouverture actuelle de la démo", (id, source) => {
    const dir = path.join("public", "theme-assets", id);
    expect(fs.existsSync(path.join(dir, "apercu-theme.jpg"))).toBe(true);
    const sidecar = JSON.parse(fs.readFileSync(path.join(dir, "apercu-theme.json"), "utf8")) as { h1: string };
    expect(sidecar.h1.length).toBeGreaterThan(8);
    const text = flat(fs.readFileSync(source, "utf8"));
    // Le titre peut être fait d'un titre et d'une suite accentuée : chaque morceau doit exister dans les textes actuels.
    const words = flat(sidecar.h1).split(/[,:]\s*/).map((w) => w.trim()).filter((w) => w.length > 3);
    for (const w of words) expect(text, `« ${w} » absent des textes actuels de ${id}`).toContain(w);
  });

  it("aucune vignette suivie n'affiche l'ancien titre « café » de TRAVERSE", () => {
    expect(fs.readFileSync(path.join("public", "theme-assets", "traverse", "apercu-theme.json"), "utf8")).not.toMatch(/café/i);
  });
});
