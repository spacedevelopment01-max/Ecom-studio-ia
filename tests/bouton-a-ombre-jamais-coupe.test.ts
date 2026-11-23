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

/**
 * Même règle pour l'atelier embelli (23 novembre 2026) : sur téléphone comme sur ordinateur, aucun bouton de l'écran
 * n'a une hauteur fixe qui couperait son texte, aucun ne force une seule ligne, et le bouton doré « Créer » (avec son
 * ombre) n'est jamais dans un cadre qui le rogne. Contrôlé aussi sur les captures (ordinateur 1440 px, téléphone 390 px).
 */
describe("atelier : jamais un bouton coupé", () => {
  const src = fs.readFileSync("src/components/studio/tab-atelier.tsx", "utf8");
  it("les boutons du choix d'un modèle, des retouches et de la barre grandissent au lieu d'être coupés", () => {
    expect(src).toMatch(/const BOUTON_BARRE = "!h-auto min-h-11 !whitespace-normal py-2\.5 text-center leading-tight"/);
    expect(src.match(/className=\{BOUTON_BARRE\}|cx\(BOUTON_BARRE/g)?.length).toBeGreaterThanOrEqual(6);
    expect(src).not.toMatch(/whitespace-nowrap|\btruncate\b/);
  });
  it("le bouton doré « Créer » a une hauteur minimale, passe à la ligne, et la barre qui le porte ne rogne rien", () => {
    const creer = src.match(/className=\{cx\("atelier-or [^"]+"/)?.[0] ?? "";
    expect(creer).toContain("min-h-12");
    expect(creer).toContain("leading-tight");
    expect(creer).not.toMatch(/(^|\s|")h-\d/);
    const barre = src.match(/<div className="([^"]+)" data-atelier-barre=\{type\}>/)?.[1] ?? "";
    expect(barre).toContain("flex-wrap");
    expect(barre).not.toMatch(/overflow-(hidden|clip)/);
  });
  it("les petits boutons à icône du mur se voient en entier et sont nommés", () => {
    for (const cible of ["publication", "publicite", "site"]) expect(src).toMatch(new RegExp(`grid size-8 place-items-center[^\\n]*?data-atelier-poser="${cible}" title=`));
    expect(src).toContain('className={cx("flex shrink-0 gap-1.5", k > 0 && "self-end")}');
  });
});
