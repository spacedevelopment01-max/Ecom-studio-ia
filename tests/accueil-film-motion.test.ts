/**
 * Film d'entrée de l'accueil : film motion design avec voix off, en français (film-motion) et en anglais
 * (film-motion.en, choisi par M() selon la langue). Image de partage assortie à la langue. Le bouton « Avec le son »
 * reste disponible, la lecture automatique reste muette.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const page = fs.readFileSync(path.join(ROOT, "src/app/page.tsx"), "utf8");
const media = fs.readFileSync(path.join(ROOT, "src/components/home/home-media.tsx"), "utf8");

describe("film d'entrée de l'accueil", () => {
  it("film-motion en français, film-motion.en en anglais, avec leurs descriptions « avec voix off »", () => {
    expect(page).toContain('<HeroFilm src={M("/explainers/film-motion.mp4")} poster={M("/explainers/film-motion.jpg")}');
    expect(page).toContain('T("Film explicatif avec voix off : comment fonctionne E-COM STUDIO IA, de la photo à la publication", "Explainer film with voice-over: how E-COM STUDIO IA works, from photo to publication")');
    // M() passe à la version « .en » quand elle existe : les deux versions doivent être là.
    expect(page).toMatch(/const M = \(src: string\) => \{\s*if \(lang !== "en"\) return src;/);
    for (const f of ["film-motion.mp4", "film-motion.jpg", "film-motion.en.mp4", "film-motion.en.jpg"]) expect(fs.existsSync(path.join(ROOT, "public/explainers", f)), f).toBe(true);
    // Plus d'ancien film sans voix à l'entrée de l'accueil.
    expect(page).not.toContain("film-court");
    expect(page).not.toContain("without voice-over");
  });

  it("image de partage : affiche du film dans chaque langue", () => {
    expect(page).toContain('const shareImage = lang === "en" ? "/explainers/film-motion.en.jpg" : "/explainers/film-motion.jpg";');
    expect(page).toContain("images: [shareImage]");
  });

  it("lecture automatique muette, bouton « Avec le son » qui active le son", () => {
    expect(media).toContain("muted={!sound}");
    expect(media).toMatch(/const withSound = \(\) => \{[\s\S]*?v\.muted = false;[\s\S]*?setSound\(true\);/);
    expect(media).toContain('t("Avec le son", "With sound")');
  });
});
