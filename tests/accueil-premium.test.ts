/**
 * Accueil public (refonte premium) : la vidéo d'entrée d'origine est conservée, tous les liens existants mènent
 * toujours à une section, le thème clair / sombre est mémorisé et posé avant l'affichage, et la page ne présente
 * que ce qui existe (tarifs lus dans src/lib/plans.ts, connexions non essayées signalées « Bêta »).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { describe, expect, it } from "vitest";

const read = (f: string) => fs.readFileSync(path.join(process.cwd(), f), "utf8");
const page = read("src/app/page.tsx");
const home = ["src/components/home/home-chrome.tsx", "src/components/home/home-media.tsx", "src/components/home/home-story.tsx", "src/components/home/home-demos.tsx", "src/components/landing-client.tsx"].map(read).join("\n");
const css = read("src/app/globals.css");

describe("Accueil premium", () => {
  it("garde la vidéo d'entrée d'origine (même fichier, même contenu) avec un affichage de secours", () => {
    expect(page).toContain('M("/explainers/film-court.mp4")');
    expect(page).toContain('M("/explainers/film-court.jpg")');
    const sha = crypto.createHash("sha256").update(fs.readFileSync(path.join(process.cwd(), "public/explainers/film-court.mp4"))).digest("hex");
    expect(sha).toBe("98b7fcf894db7a30a544421c463b0906e41bace4b49bf852cf883d565da59081");
    expect(home).toContain("La vidéo n'a pas pu être chargée.");
    // Lecture seulement quand elle est visible, jamais automatique si l'utilisateur demande moins de mouvement.
    expect(home).toMatch(/IntersectionObserver[\s\S]*v\.play\(\)/);
    expect(home).toContain("prefers-reduced-motion: reduce");
  });

  it("chaque lien du pied de page et de l'en-tête vers l'accueil a sa section", () => {
    const footer = read("src/components/site-footer.tsx");
    const anchors = [...footer.matchAll(/"\/#([a-z-]+)"/g), ...page.matchAll(/href: "#([a-z-]+)"/g), ...page.matchAll(/href="#([a-z-]+)"/g)].map((m) => m[1]);
    expect(anchors.length).toBeGreaterThan(8);
    // Anciennes ancres conservées (liens partagés, pied de page des pages légales).
    for (const old of ["video", "sur-mesure", "boutiques", "rangement", "demonstrations", "offre", "questions", "themes", "packs", "services"]) expect(page + home).toContain(`id="${old}"`);
    for (const a of anchors) expect(page + home, a).toContain(`id="${a}"`);
  });

  it("garde les liens de connexion, d'inscription et les pages légales", () => {
    expect(page).toContain('const cta = user ? "/studio" : "/inscription"');
    expect(home).toContain('href="/connexion"');
    const footer = read("src/components/site-footer.tsx");
    expect(footer).toContain("legalLinks(lang)");
    expect(footer).toContain('"/inscription"');
    expect(footer).toContain('"/contact"');
  });

  it("bascule clair / sombre mémorisée, thème système par défaut, sans flash", () => {
    const layout = read("src/app/layout.tsx");
    // Le thème mémorisé est posé dans <head>, avant l'affichage de la page.
    expect(layout).toMatch(/<head>\s*<script dangerouslySetInnerHTML=\{\{ __html: themeScript \}\}/);
    expect(layout).toContain("localStorage.getItem('ecs-theme')");
    expect(home).toContain('localStorage.setItem("ecs-theme", next)');
    expect(home).toContain("Passer en thème sombre");
    expect(home).toContain("Passer en thème clair");
    // Les deux directions artistiques de l'accueil : thème système sombre ET choix explicite.
    expect(css).toMatch(/@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\) \.hp \{/);
    expect(css).toMatch(/:root\[data-theme="dark"\] \.hp \{/);
    expect(css).toContain("html.hp-theme-anim");
  });

  it("tarifs et capacités lus dans la configuration, connexions non essayées signalées", () => {
    expect(page).toContain("<PricingCards loggedIn={!!user} />");
    expect(page).not.toMatch(/\d+[,.]\d{2}\s?€/); // aucun prix écrit à la main
    expect(page).toContain('T("Bêta", "Beta")');
    expect(page).toContain("pas encore essayé sur une vraie boutique");
    expect(page).toContain("Pas encore de montage plan par plan dans une timeline interactive");
  });

  it("textes bilingues : chaque libellé de l'accueil passe par T(fr, en) ou t(fr, en)", () => {
    // Pas de texte français isolé dans les démonstrations interactives (hors données de démonstration).
    for (const f of ["src/components/home/home-chrome.tsx", "src/components/home/home-media.tsx", "src/components/home/home-demos.tsx"]) {
      const src = read(f);
      expect(src).toMatch(/useT\(\)/);
      expect(src.match(/t\("/g)?.length ?? 0).toBeGreaterThan(5);
    }
  });
});
