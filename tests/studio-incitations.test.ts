/**
 * Incitations du studio : étoiles qui scintillent sur « Choisir un forfait » (sans animation si l'utilisateur
 * réduit les animations), bandeau Découverte qui dit franchement que le rendu reste basique sans IA,
 * et aperçu de la boutique en plein écran (ordinateur, tablette, téléphone).
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

describe("incitations et aperçu plein écran", () => {
  it("« Choisir un forfait » : étoiles animées, coupées si les animations sont réduites", () => {
    const css = read("src/app/globals.css");
    expect(css).toMatch(/\.plan-sparkle svg \{ animation: plan-twinkle/);
    const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toMatch(/\.plan-sparkle svg, \.plan-sparkle::before, \.plan-sparkle::after \{ animation: none !important; \}/);
    expect(read("src/components/billing-client.tsx")).toContain('className="plan-sparkle ');
  });

  it("bandeau Découverte : rendu basique annoncé, lien vers les forfaits ; message technique seulement avec un forfait", () => {
    const src = read("src/components/studio/common.tsx");
    expect(src).toContain("le rendu final reste très basique");
    expect(src).toContain("the final result stays very basic");
    expect(src).toMatch(/href="\/studio\/compte#forfaits" className="plan-sparkle/);
    expect(src).toContain("if (!data.ai.llm && billing?.plan)");
  });

  it("aperçu de la boutique : bouton plein écran, sortie par Échap, même aperçu (pas de rechargement)", () => {
    const src = read("src/components/studio/tab-boutique.tsx");
    expect(src).toContain("data-preview-full");
    expect(src).toContain('e.key === "Escape" && setFull(false)');
    expect(src).toMatch(/full \? "fixed inset-0 z-\[80\] bg-paper"/);
  });
});
