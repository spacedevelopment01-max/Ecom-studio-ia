/**
 * Idées de prompts propres à chaque produit ou service (écrites à la création du projet) : une liste par usage
 * (publication / publicité, image / vidéo), jamais de personne ni de chiffre inventé, réécrites seulement si le projet
 * change (aucun jeton dépensé pour rien), et un produit ajouté ensuite reçoit ses idées du studio (gratuit).
 */
import { describe, expect, it } from "vitest";

describe("Idées de prompts par produit ou service", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject, saveCatalog } = await import("@/lib/projects");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { writePromptIdeas, readPromptIdeas, localIdeas, ideaAllowed, IDEA_SURFACES } = await import("@/lib/prompt-ideas");
  const { subjectOptions } = await import("@/lib/creative-subject");

  async function project(kind: "hightech" | "restaurant") {
    const u = await createUser(`ip-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    return loadProject(seedImageFixture(u.id, kind));
  }

  it("idées locales adaptées au produit : chaque usage a ses idées, sans personne", async () => {
    const p = await project("hightech");
    const ideas = localIdeas(p, subjectOptions(p)[0]);
    for (const k of IDEA_SURFACES) {
      expect(ideas[k].length).toBeGreaterThanOrEqual(2);
      for (const i of ideas[k]) {
        expect(i.prompt).toContain("Onde Pro");
        expect(i.prompt).toMatch(/Aucune personne|aucune personne/);
      }
    }
    // Produit high-tech : décors du secteur (studio sombre, néons, bureau…), pas une cuisine.
    expect(ideas.post_image.map((i) => i.prompt).join(" ")).not.toMatch(/cuisine/);
  });

  it("services : le métier montré par ses outils et ses résultats", async () => {
    const p = await project("restaurant");
    const ideas = localIdeas(p, subjectOptions(p)[0]);
    expect(ideas.ad_image.map((i) => i.prompt).join(" ")).toMatch(/outils|résultat|savoir-faire|lieu/);
  });

  it("idées de l'IA filtrées (personne, chiffres inventés) et écrites une seule fois tant que le projet ne change pas", async () => {
    const p = await project("hightech");
    let calls = 0;
    const writer = async () => {
      calls++;
      const good = { title: "Studio néon", prompt: "Onde Pro en lévitation dans un studio sombre, néons bleus. Aucune personne." };
      const bad = { title: "Promo", prompt: "Onde Pro à -30 % porté par une femme souriante dans la rue." };
      return { post_image: [good, good, bad], ad_image: [bad, bad], post_video: [good, good], ad_video: [good, good] };
    };
    const a = await writePromptIdeas(p, writer);
    expect(a.by).toBe("ai");
    const s = a.subjects[0];
    expect(s.ideas.post_image.every(ideaAllowed)).toBe(true);
    expect(s.ideas.post_image).toHaveLength(2);
    // Idées publicitaires de l'IA refusées (personne, pourcentage) : celles du studio sont gardées.
    expect(s.ideas.ad_image.every(ideaAllowed)).toBe(true);
    expect(s.ideas.ad_image[0].prompt).not.toMatch(/%/);
    await writePromptIdeas(p, writer);
    expect(calls).toBe(1);
  });

  it("produit ajouté au catalogue après la création : ses idées sont préparées par le studio", async () => {
    const p = await project("hightech");
    await writePromptIdeas(p, null);
    saveCatalog(p.id, [{ key: "etui", name: "Étui de voyage", category: "Accessoire", price: null, compareAt: null, description: "Étui rigide.", features: [], originalAssetId: null }]);
    const r = readPromptIdeas(loadProject(p.id));
    expect(r.subjects.map((x) => x.key)).toEqual(["main", "etui"]);
    expect(r.subjects[1].ideas.post_image[0].prompt).toContain("Étui de voyage");
  });
});
