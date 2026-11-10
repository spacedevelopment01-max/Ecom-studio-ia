/**
 * Familles de sections (consigne du propriétaire du 9 novembre 2026) : SINA montre les familles au client EN IMAGE,
 * il choisit ; le thème et les maquettes n'utilisent ensuite que la famille choisie, jamais de mélange. Gratuit, sans IA.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

process.env.STUDIO_SYNA_AGENT = "1";

describe("SINA — familles de sections Classique et Moderne", async () => {
  const F = await import("@/lib/syna-agent/section-families");

  it("deux cartes en image : le client choisit seulement Classique ou Moderne (les styles ne sont que des exemples à ouvrir)", () => {
    const cards = F.familyCards();
    expect(cards.map((c) => c.title)).toEqual(["Classique", "Moderne"]);
    expect(cards[1].examples.map((x) => x.label)).toEqual(["Exemple Sport chic", "Exemple Streetwear néon"]);
    // aperçu en image de chaque famille entière (la carte Moderne montre ses deux exemples)
    expect(cards.map((c) => c.previews.length)).toEqual([1, 2]);
    for (const c of cards) for (const p of c.previews) expect(fs.existsSync(path.join(process.cwd(), "public", p))).toBe(true);
    for (const c of cards) expect(fs.existsSync(path.join(process.cwd(), "public", c.preview))).toBe(true);
    expect(cards.find((c) => c.family === "moderne")!.sections).toBe(51); // sans fausses urgences ni offres d'exemple (audit du 10 novembre 2026)
  });

  it("aucune section n'appartient aux deux familles, et la famille Moderne propose plusieurs choix par rôle", () => {
    const [classique, moderne] = F.SECTION_FAMILIES;
    const a = new Set(Object.values(classique.roles).flat());
    for (const s of Object.values(moderne.roles).flat()) expect(a.has(s)).toBe(false);
    expect(F.sectionInFamily("Ouverture « mot géant »", "moderne")).toBe(true);
    expect(F.sectionInFamily("Ouverture « mot géant »", "classique")).toBe(false);
    // Plusieurs choix par rôle ; « produit vedette » et « panier » en ont deux depuis le retrait du drop limité (faux
    // compte à rebours) et du panier néon (produits d'exemple écrits par son script), audit du 10 novembre 2026.
    for (const role of ["ouverture", "produits", "mise en avant", "confiance", "inscription", "pied de page"]) expect(moderne.roles[role].length).toBeGreaterThanOrEqual(3);
    for (const role of ["produit vedette", "panier"]) expect(moderne.roles[role].length).toBeGreaterThanOrEqual(2);
    expect(F.missingRoles("classique", ["en-tête", "ouverture"])).toEqual(["en-tête"]);
  });

  it("le choix est validé (style de la bonne famille) et enregistré dans les réglages du projet", async () => {
    expect(F.familyChoiceSchema.safeParse({ family: "classique", style: "streetwear-neon" }).success).toBe(false);
    expect(F.familyChoiceSchema.safeParse({ family: "moderne", style: "classique" }).success).toBe(false);
    expect(F.familyChoiceSchema.safeParse({ family: "moderne", style: "sport-chic" }).success).toBe(true);
    const { id, now, run } = await import("@/lib/db");
    const uid = id(), pid = id();
    run("INSERT INTO users (id, email, password_hash, created_at) VALUES (?,?,?,?)", uid, `fam-${uid}@exemple.fr`, "x", now());
    run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", pid, uid, "Famille", now(), now());
    expect(F.loadFamilyChoice(pid)).toBeNull();
    expect(F.familyBrief(null)).toEqual([]);
    const c = F.saveFamilyChoice(pid, { family: "moderne", style: "streetwear-neon" });
    expect(F.loadFamilyChoice(pid)).toMatchObject({ family: "moderne", style: "streetwear-neon" });
    const brief = F.familyBrief(c).join("\n");
    expect(brief).toContain("Moderne · Streetwear néon");
    expect(brief).toContain("Aucune section de la famille Classique");
  });

  it("images de la famille Moderne : même charte pour toutes les images, personnes seulement si autorisées", async () => {
    expect(F.familyArtUniverse(null, { people: true })).toBeNull();
    expect(F.familyArtUniverse({ family: "classique", style: "classique", chosenAt: 1 }, { people: true })).toBeNull();
    const night = F.familyArtUniverse({ family: "moderne", style: "streetwear-neon", chosenAt: 1 }, { people: true })!;
    expect(night.id).toBe("moderne-streetwear-neon");
    expect(night.idea).toContain("mannequins inventés");
    expect(F.familyArtUniverse({ family: "moderne", style: "sport-chic", chosenAt: 1 }, { people: false })!.idea).toContain("sans aucune personne");
    const C = await import("@/lib/syna-agent/mockup-code/code-mockup");
    const ph = { id: "nouvelle-1", description: "Une photo.", ratio: "4:5" };
    expect(C.codePhotoPrompt(ph, { name: "Rupture", logo: false, product: false })).toContain("aucune personne");
    const withPeople = C.codePhotoPrompt(ph, { name: "Rupture", logo: false, product: false, direction: night.style, people: true });
    expect(withPeople).toContain("mannequins inventés");
    expect(withPeople).toContain("Direction artistique de la marque");
    expect(withPeople).not.toContain("aucune personne");
    expect(F.familyBrief({ family: "moderne", style: "sport-chic", chosenAt: 1 }, { people: false }).join("\n")).toMatch(/PHOTOS NOUVELLES[^]*produit est entier/);
  });

  it("la consigne de la famille entre dans la maquette en code ; outils SINA gratuits au registre", async () => {
    const C = await import("@/lib/syna-agent/mockup-code/code-mockup");
    const { mockupPages } = await import("@/lib/syna-agent/mockup-code/pages");
    const base = { brand: { name: "Rupture", palette: { dark: "#0B0C0B", primary: "#D4F53C", secondary: "#F2F2EE", accent: "#FF3B5C", light: "#FFFFFF" } }, fonts: { heading: { family: "Anton", weight: 400 }, body: { family: "Space Grotesk", weights: [400] } }, logo: { file: "logo.png" }, direction: { name: "A", style: "s" }, copy: { seo: { title: "t", description: "d" }, sections: [] }, lines: [], phoneLines: [], photos: [], maxNew: 0 } as any;
    const home = mockupPages("products", "multi").find((p) => p.key === "home")!;
    const brief = F.familyBrief({ family: "moderne", style: "sport-chic", chosenAt: 1 });
    expect(C.codeMockupPrompt({ ...base, page: home, family: brief })).toContain("FAMILLE MODERNE");
    expect(C.codeMockupPrompt({ ...base, page: home })).not.toContain("FAMILLE");
    const { getTool } = await import("@/lib/syna-agent/registry");
    for (const n of ["theme.families", "theme.family"]) { const t = getTool(n)!; expect(t).toBeTruthy(); expect(t.estimate).toBeUndefined(); }
    expect(getTool("theme.family")!.args.safeParse({ family: "moderne", style: "streetwear-neon" }).success).toBe(true);
  });

  it("chaque style a sa démonstration complète à ouvrir en vrai (pages, panier, téléphone), photos présentes", async () => {
    const fs = await import("node:fs"), path = await import("node:path");
    const demos = F.familyCards().flatMap((c) => c.examples);
    expect(demos).toHaveLength(3);
    for (const c of demos) {
      expect(c.demo).toMatch(/^\/demo\/familles\/[a-z-]+\/index\.html$/);
      const dir = path.join(process.cwd(), "public", path.dirname(c.demo));
      const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
      expect(html).toContain('name="robots" content="noindex"');
      // toutes les photos citées, même sans le dossier (couleurs et gamme du bloc d'achat)
      const photos = [...new Set([...html.matchAll(/\b([a-z]{2}-[a-z0-9]+\.(?:webp|png|jpg))\b/g)].map((m) => m[1]))];
      expect(photos.length).toBeGreaterThan(10);
      for (const ph of photos) expect(fs.existsSync(path.join(dir, "photos", ph)), `${c.demo} → photos/${ph}`).toBe(true);
    }
  });
});
