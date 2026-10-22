import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/** Barre d'achat qui suit le défilement (issue #155) : compacte sur téléphone, zone du geste d'accueil respectée, boutons
 * flottants et avis « ajouté » au-dessus d'elle seulement quand elle est affichée. */
const css = fs.readFileSync(path.join(__dirname, "../theme-base/assets/theme.css"), "utf8");
const js = fs.readFileSync(path.join(__dirname, "../theme-base/assets/theme.js"), "utf8");

describe("barre d'achat mobile", () => {
  it("laisse la place à la zone du geste d'accueil (iPhone)", () => {
    expect(css).toMatch(/\.es-sticky-buy \{[^}]*padding: 10px 0 calc\(10px \+ env\(safe-area-inset-bottom, 0px\)\)/);
  });

  it("tient sur une ligne au téléphone : bouton à droite, pas en pleine largeur sous le nom", () => {
    const mobile = css.match(/@media \(max-width: 749px\) \{ \.es-sticky-buy \{[^\n]*/)?.[0] ?? "";
    expect(mobile).toContain(".es-sticky-buy .es-button { flex: 0 0 auto;");
    expect(mobile).not.toContain("grid-template-columns: 1fr");
    expect(css).not.toMatch(/\.es-sticky-buy \.es-button \{ flex: 1; \}/);
  });

  it("ne remonte les boutons flottants et l'avis « ajouté » que lorsque la barre est affichée, à sa hauteur mesurée", () => {
    expect(css).not.toContain(".has-sticky-buy .es-fab { bottom: 92px; }");
    expect(css).toContain(".sticky-buy-visible .es-fab { bottom: calc(var(--sticky-buy-h, 72px) + 14px); }");
    expect(css).toContain(".sticky-buy-visible .es-toast { bottom: calc(var(--sticky-buy-h, 72px) + 14px); }");
    expect(js).toContain("document.body.classList.toggle('sticky-buy-visible', show);");
    expect(js).toContain("setProperty('--sticky-buy-h', stickyBuy.offsetHeight + 'px')");
  });
});
