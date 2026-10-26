/**
 * FRAISE — article du journal et pages légales au téléphone (suivi #194, constat de Codex) : la marge de 260 unités de
 * l'ordinateur laissait 0 px au texte à 390 px. Le bloc téléphone redonne des marges de téléphone ; les règles
 * d'ordinateur restent celles de la maquette (rendu à 1440 px identique, vérifié par captures dans le suivi #194).
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";

const css = fs.readFileSync("theme-base/assets/fraise.css", "utf8");
/** Règles d'un sélecteur dans les blocs `@media (max-width: 749px)` (et hors de tout bloc si `media` est faux). */
function rules(selector: string, media: boolean): string[] {
  const out: string[] = [];
  const re = /@media \(max-width: 749px\) \{([\s\S]*?)\n\}/g;
  const blocks = media ? [...css.matchAll(re)].map((m) => m[1]) : [css.replace(re, "")];
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const b of blocks) for (const m of b.matchAll(new RegExp(`(?:^|\\n)\\s*${esc} \\{([^}]*)\\}`, "g"))) out.push(m[1]);
  return out;
}
const sidePadding = (decl: string) => {
  const m = decl.match(/padding:\s*calc\(([\d.]+) \* var\(--[um]\)\)\s+calc\(([\d.]+) \* var\(--[um]\)\)/);
  return m ? Number(m[2]) : null;
};

describe("FRAISE : article et pages légales lisibles au téléphone", () => {
  for (const sel of [".fg-article .fg-c", ".fg-legal .fg-c"]) {
    it(`${sel} : marges de téléphone (au plus 24 unités de 390) ; ordinateur inchangé (260 unités de 1440)`, () => {
      const mobile = rules(sel, true).map(sidePadding).filter((x): x is number => x !== null);
      expect(mobile.length).toBeGreaterThan(0);
      expect(Math.max(...mobile)).toBeLessThanOrEqual(24);
      const desktop = rules(sel, false).map(sidePadding).filter((x): x is number => x !== null);
      expect(desktop).toEqual([260]);
    });
  }
  it("titres et texte redimensionnés au téléphone", () => {
    for (const sel of [".fg-article__title", ".fg-legal__title", ".fg-article__body", ".fg-legal__body"]) {
      const sizes = rules(sel, true).flatMap((d) => [...d.matchAll(/font-size:\s*calc\(([\d.]+) \* var\(--m\)\)/g)].map((m) => Number(m[1])));
      expect(sizes.length, sel).toBeGreaterThan(0);
      expect(Math.max(...sizes), sel).toBeLessThanOrEqual(40);
    }
  });
});
