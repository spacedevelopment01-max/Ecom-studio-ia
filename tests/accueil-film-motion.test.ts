/**
 * Film d'entrée de l'accueil : en français, le nouveau film motion design avec voix off (film-motion) ; en anglais,
 * l'ancien film sans voix (film-court.en) tant que la version anglaise du nouveau film n'existe pas. Le bouton
 * « Avec le son » reste disponible, la lecture automatique reste muette.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const page = fs.readFileSync(path.join(ROOT, "src/app/page.tsx"), "utf8");
const media = fs.readFileSync(path.join(ROOT, "src/components/home/home-media.tsx"), "utf8");

describe("film d'entrée de l'accueil", () => {
  it("le français montre film-motion avec sa description « avec voix off »", () => {
    expect(page).toContain('<HeroFilm src="/explainers/film-motion.mp4" poster="/explainers/film-motion.jpg"');
    expect(page).toContain("Film explicatif avec voix off : comment fonctionne E-COM STUDIO IA, de la photo à la publication");
    expect(page).not.toContain("Film explicatif sans voix");
    for (const f of ["film-motion.mp4", "film-motion.jpg"]) expect(fs.existsSync(path.join(ROOT, "public/explainers", f))).toBe(true);
  });

  it("l'anglais garde l'ancien film anglais, sans film français ni film-motion.en", () => {
    expect(page).toMatch(/lang === "en" \? \(\s*<HeroFilm src=\{M\("\/explainers\/film-court\.mp4"\)\} poster=\{M\("\/explainers\/film-court\.jpg"\)\}/);
    expect(page).toContain("Explainer film without voice-over: from photo to post in 7 steps");
    for (const f of ["film-court.en.mp4", "film-court.en.jpg"]) expect(fs.existsSync(path.join(ROOT, "public/explainers", f))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, "public/explainers/film-motion.en.mp4"))).toBe(false);
  });

  it("image de partage : affiche du film montré dans chaque langue", () => {
    expect(page).toContain('const shareImage = lang === "en" ? "/explainers/film-court.jpg" : "/explainers/film-motion.jpg";');
    expect(page).not.toContain('images: ["/explainers/film-court.jpg"]');
  });

  it("lecture automatique muette, bouton « Avec le son » qui active le son", () => {
    expect(media).toContain("muted={!sound}");
    expect(media).toMatch(/const withSound = \(\) => \{[\s\S]*?v\.muted = false;[\s\S]*?setSound\(true\);/);
    expect(media).toContain('t("Avec le son", "With sound")');
  });
});
