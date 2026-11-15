/**
 * Détails des thèmes du Studio au téléphone (demande du propriétaire du 9 novembre 2026 : « regarde tout ce genre de
 * détails et corrige avant que je les trouve ») : rien ne sort de l'écran, toute rangée qui dépasse glisse au doigt.
 * Contrôle complet fait sur les démos exportées des 15 thèmes (débordements, rangées glissées au doigt, boutons, liens) ;
 * ce test garde les corrections.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = (f: string) => fs.readFileSync(path.join(process.cwd(), "theme-base", "assets", f), "utf8");

describe("thèmes du Studio : détails au téléphone", () => {
  it("vignettes de la fiche produit : cinq tiennent dans la largeur, la sixième dépasse à moitié pour montrer que ça glisse", () => {
    const t = css("theme.css");
    const phone = t.slice(t.indexOf("@media (max-width: 989px)", t.indexOf(".es-product__thumbs")));
    expect(phone).toMatch(/\.es-product__thumb \{ width: calc\(\(100% - 32px\) \/ 5\); max-width: 72px; \}/);
    expect(phone).toMatch(/\.es-product \.es-product__thumbs:has\(> :nth-child\(6\)\) \.es-product__thumb \{ width: calc\(\(100% - 40px\) \/ 5\.5\); \}/);
  });

  it("PHASE : une ligne de titre plus longue que l'écran passe à la ligne (jamais coupée)", () => {
    expect(css("phase.css")).not.toMatch(/\.ph-hero \.ph-hero__title \.ph-ln \{ white-space: nowrap; \}/);
  });

  it("SILLON : titres de parties d'article ajustés à leur ligne, onglets Livraison / Suivi / Retours dans l'écran", () => {
    const js = fs.readFileSync(path.join(process.cwd(), "theme-base", "assets", "sillon.js"), "utf8");
    expect(js).toMatch(/function fitPartTitles\(\)/);
    expect(js).toMatch(/fitPartTitles\(\); window\.addEventListener\('resize', fitPartTitles\)/);
    // 20 + 128 + 102 + 118 + 2 écarts de 10 = 388 sur 390 (maquette téléphone)
    expect(css("sillon.css")).toMatch(/\.sv-info__tabs \{ display: flex; left: calc\(20 \* var\(--m\)\) !important; top: calc\(440 \* var\(--m\)\) !important; gap: calc\(10 \* var\(--m\)\); \}/);
  });
});
