/**
 * Goût du propriétaire (17 novembre 2026, devant le site d'essai sur son téléphone) : « Les boutons sont coupés en bas,
 * jamais au grand jamais ». L'ombre d'un bouton « à ombre » dépassait sous sa section et la section suivante la
 * recouvrait. Règle de la feuille : le bouton passe au-dessus de ce qui suit et garde sa place en bas.
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("bouton à ombre : jamais coupé", () => {
  const css = fs.readFileSync("public/sections/tenue.css", "utf8");
  it("le bouton à ombre passe au-dessus de la section suivante", () => {
    expect(css).toMatch(/\.ctw\[data-tn-bouton="ombre"\] \.tn \.tn-bt\{position:relative;z-index:1\}/);
  });
  it("un bouton à ombre qui finit sa section garde de la place sous lui", () => {
    expect(css).toMatch(/\.ctw\[data-tn-bouton="ombre"\] \.tn>\.tn-bt:last-child[^{]*\{margin-bottom:8px\}/);
  });
  it("aucune feuille ne retire cette place ni ne remet le bouton sous la suite", () => {
    for (const f of fs.readdirSync("public/sections").filter((x) => /^tenue.*\.css$/.test(x))) {
      const c = fs.readFileSync(`public/sections/${f}`, "utf8");
      expect(c, f).not.toMatch(/data-tn-bouton="ombre"\][^{}]*\.tn-bt[^{}]*\{[^}]*z-index:\s*(-|0[;}])/);
    }
  });
});
