/**
 * Fenêtres du studio :
 *  - la recherche rapide s'affiche hors de l'en-tête (son flou d'arrière-plan confinait le fond sombre à la barre du
 *    haut) et se ferme avec Échap où que soit le curseur, d'un clic à côté ou par son bouton « Fermer » ;
 *  - l'éditeur de publication montre la publication complète (visuel entier, légende, hashtags) à côté du formulaire.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const src = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");

describe("Fenêtres du studio", () => {
  it("recherche rapide : portail vers le corps de la page, Échap global, bouton Fermer", () => {
    const s = src("src/components/studio/shell.tsx");
    const qs = s.slice(s.indexOf("function QuickSearch"), s.indexOf("function MobileNav"));
    expect(qs).toMatch(/createPortal\(/);
    expect(qs).toMatch(/document\.body/);
    expect(qs).toMatch(/document\.addEventListener\("keydown"/);
    expect(qs).toMatch(/data-quick-search-close/);
  });

  it("éditeur de publication : aperçu complet de la publication (visuel entier, légende, hashtags)", () => {
    const s = src("src/components/studio/social-studio.tsx");
    const preview = s.slice(s.indexOf("function PostPreview"), s.indexOf("function PostEditorV2"));
    expect(preview).toMatch(/object-contain/);
    expect(preview).not.toMatch(/object-cover/);
    expect(preview).toMatch(/caption/);
    expect(preview).toMatch(/hashtags/);
    const editor = s.slice(s.indexOf("function PostEditorV2"));
    expect(editor).toMatch(/<PostPreview media=\{f\.media\} caption=\{f\.caption\} hashtags=\{f\.hashtags\}/);
  });
});
