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

  it("trois cartes en image (Classique ; Moderne · Sport chic ; Moderne · Streetwear néon), aperçus présents dans le dépôt", () => {
    const cards = F.familyCards();
    expect(cards.map((c) => c.title)).toEqual(["Classique", "Moderne · Sport chic", "Moderne · Streetwear néon"]);
    for (const c of cards) expect(fs.existsSync(path.join(process.cwd(), "public", c.preview))).toBe(true);
    expect(cards.find((c) => c.family === "moderne")!.sections).toBe(26);
  });

  it("aucune section n'appartient aux deux familles, et la famille Moderne propose plusieurs choix par rôle", () => {
    const [classique, moderne] = F.SECTION_FAMILIES;
    const a = new Set(Object.values(classique.roles).flat());
    for (const s of Object.values(moderne.roles).flat()) expect(a.has(s)).toBe(false);
    expect(F.sectionInFamily("Ouverture « mot géant »", "moderne")).toBe(true);
    expect(F.sectionInFamily("Ouverture « mot géant »", "classique")).toBe(false);
    for (const role of ["ouverture", "produit vedette", "pied de page"]) expect(moderne.roles[role].length).toBeGreaterThanOrEqual(3);
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
});
