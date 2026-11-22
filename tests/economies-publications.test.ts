/**
 * Économies des publications et des publicités (audit du 22 novembre 2026), sans aucun appel réel : outils simulés.
 *  1. Le concept de l'image écrit par la stratège dans le plan accepté sert tel quel : aucun appel de rédaction.
 *  2. Un seul concept par idée de publicité, partagé par ses formats ; chaque format garde son image et sa relecture.
 *  3. La relecture des images est payée au prix du modèle le plus fort (règle du propriétaire).
 *  7. « Ta journée est prête » sans IA ; « le point du mois » : chiffres par le code, aucun appel si rien n'a changé.
 *  Et la fête des mères reportée quand le dernier dimanche de mai est la Pentecôte.
 */
import { afterEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { campaignConcept, campaignVerdict } from "./publication-fixtures";

describe("Économies des publications et des publicités", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { designPostWithAi, planConceptOf } = await import("@/lib/social-v2/ai-post");
  const fr = <T,>(fn: () => Promise<T> | T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const SIZES: Record<string, [number, number]> = { "4:5": [1080, 1350], "1:1": [1080, 1080], "9:16": [1080, 1920] };
  const png = (aspect = "4:5") => sharp({ create: { width: SIZES[aspect][0], height: SIZES[aspect][1], channels: 3, background: "#335544" } }).png().toBuffer();
  const ok = { ...campaignVerdict(), productFaithful: true, textsExact: true, legible: true, score: 9.3, issues: [] as string[], fix: "", person: false, anatomyOk: true };

  async function setup() {
    const u = await createUser(`eco-pub-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const ref = await saveAsset({ projectId: p.id, userId: u.id, data: await png(), name: "ref.png", mime: "image/png", role: "cutout", folderKey: "images.cutouts", origin: "generated", status: "approved", meta: {} });
    return { p, ref: ref.id };
  }
  /** Outils simulés : chaque clé payée coûte 100 000 micro-euros ; la dépense se lit par préfixe, comme le journal. */
  function fakes() {
    const paid: string[] = [], prompts: string[] = [];
    let copies = 0;
    return {
      paid, prompts, copies: () => copies,
      deps: {
        copy: async (_p: unknown, _post: unknown, fallback: any, key: string) => { copies++; paid.push(key); return { ...fallback, scene: "Documented subject in a specific setting with coherent side lighting", concept: campaignConcept() }; },
        generate: async (prompt: string, aspect: string, _r: Buffer | null, key: string) => { paid.push(key); prompts.push(prompt); return png(aspect); },
        review: async (_i: Buffer, _r: Buffer | null, texts: string[], key: string) => { paid.push(`${key}:check`); return { ...ok, transcribed: texts }; },
        spentMicro: (prefix: string) => paid.filter((k) => k.startsWith(prefix)).length * 100_000,
        maxMicro: () => 100_000,
        conceptMaxMicro: () => 100_000,
        reviewMaxMicro: () => 100_000,
      },
    };
  }

  it("1. le concept du plan accepté par le client sert tel quel : aucun appel de rédaction, son titre est celui de l'image", async () => {
    const { p, ref } = await setup();
    const f = fakes();
    const planConcept = { headline: "Sérum du soir : trois gestes simples", subline: "", cta: "Enregistre ce mémo", scene: "Vue de trois quarts : le flacon sur une tablette en pierre claire, lumière dorée du soir, la partie gauche reste calme pour le titre.", concept: { ...campaignConcept(), ctaStyle: "none" as const } };
    const post = { id: "plan-1", network: "instagram", format: "image", title: planConcept.headline, headline: planConcept.headline, caption: "Le soir, trois gestes suffisent.", pillar: "Un conseil", objective: "educate", scheduled_at: null, editorial: { structure: "advice" as const, blocks: [{ kind: "tip" as const, text: "Deux gouttes suffisent" }, { kind: "paragraph" as const, text: "Enregistre ce mémo" }] }, editorialData: { planConcept } };
    expect(planConceptOf(post)).toBeTruthy();
    const r = await fr(() => designPostWithAi(p, post, { aspect: "4:5", maxCostEur: 1, reference: ref }, f.deps as any));
    expect(r.assetId, r.note).toBeTruthy();
    expect(f.copies()).toBe(0);
    expect(f.prompts[0]).toContain("Sérum du soir : trois gestes simples");
    expect(f.prompts[0]).toContain("tablette en pierre claire");
    // Payé : une image et sa relecture, rien pour la rédaction.
    expect(r.costMicro).toBe(200_000);
    // Un plan d'avant (sans concept) garde le rédacteur.
    const g = fakes();
    const old = await fr(() => designPostWithAi(p, { ...post, id: "plan-ancien", editorialData: {} }, { aspect: "4:5", maxCostEur: 1, reference: ref }, g.deps as any));
    expect(old.assetId, old.note).toBeTruthy();
    expect(g.copies()).toBe(1);
  });

  it("2. publicité : un seul concept par idée, repris par ses autres formats ; chaque format a son image et sa relecture", async () => {
    const { p, ref } = await setup();
    const f = fakes();
    const share = { id: "idee-1", aspects: ["4:5", "1:1", "9:16"] as const };
    const base = { network: "instagram", format: "image", title: "Le soin du soir", headline: "Le soin du soir", caption: "", pillar: "demonstration", objective: "convert", scheduled_at: null };
    for (const aspect of share.aspects) {
      const r = await fr(() => designPostWithAi(p, { ...base, id: `ad-idee-1-${aspect.replace(":", "x")}`, request: `format ${aspect}` }, { aspect, as: "ad", maxCostEur: 1, reference: ref }, { ...f.deps, conceptShare: { id: share.id, aspects: [...share.aspects] } } as any));
      expect(r.assetId, `${aspect} ${r.note}`).toBeTruthy();
    }
    expect(f.copies()).toBe(1);
    expect(f.paid.filter((k) => k.endsWith(":image"))).toHaveLength(3);
    expect(f.paid.filter((k) => k.endsWith(":check"))).toHaveLength(3);
    // Une autre idée paie son propre concept.
    await fr(() => designPostWithAi(p, { ...base, id: "ad-idee-2-4x5", title: "Autre idée", headline: "Autre idée" }, { aspect: "4:5", as: "ad", maxCostEur: 1, reference: ref }, { ...f.deps, conceptShare: { id: "idee-2", aspects: [...share.aspects] } } as any));
    expect(f.copies()).toBe(2);
  });

  it("le plan des publications : la stratège écrit le concept, la reprise garde sa consigne, posts.create le transmet", async () => {
    const P = await import("@/lib/syna-agent/posts-plan");
    const { planConceptFor } = await import("@/lib/syna-agent/tools/posts");
    expect(P.POSTS_PLAN_SYSTEM).toMatch(/concept = l'image finie/);
    expect(P.POSTS_JUDGE_SYSTEM).toMatch(/Le concept de l'image/);
    const src = (await import("node:fs")).readFileSync("src/lib/syna-agent/posts-plan.ts", "utf8");
    expect(src).toContain('ask("fix", postsEducated(POSTS_PLAN_SYSTEM, "stratege")');
    expect(src).not.toContain("POSTS_FIX_SYSTEM");
    const g = { angleId: "a", subject: "conseil" as const, title: "Titre : promesse", points: [], cta: "Enregistre ce mémo", caption: "x".repeat(60), hashtags: ["#a"], visual: "v".repeat(60), look: "différent", product: null };
    expect(planConceptFor(g)).toBeNull();
    expect(planConceptFor({ ...g, concept: { ...campaignConcept(), ctaStyle: "none" } })).toMatchObject({ headline: "Titre : promesse", cta: "", scene: "v".repeat(60) });
    expect(planConceptFor({ ...g, concept: campaignConcept() })).toMatchObject({ cta: "Enregistre ce mémo" });
  });

  it("3. la relecture d'une image est comptée au prix du modèle le plus fort, au niveau élevé", async () => {
    const { IMAGE_REVIEW_MODEL, IMAGE_REVIEW_ROUTING, TEXT_MODEL_BY_TIER } = await import("@/lib/orchestrator/policy");
    const E = await import("@/lib/ai/estimate");
    expect(IMAGE_REVIEW_MODEL).toEqual({ provider: "anthropic", model: TEXT_MODEL_BY_TIER.strong, effort: "high" });
    expect(IMAGE_REVIEW_ROUTING.prefer).toBe(IMAGE_REVIEW_MODEL);
    expect(E.publicationReviewMicro({ input: 20000, output: 3000 })).toBeGreaterThan(E.estimateTaskMicro("quality_control", { input: 20000, output: 3000 }));
    const src = (await import("node:fs")).readFileSync("src/lib/ads-v2/deps.ts", "utf8");
    expect(src).toMatch(/promptKey: "ads-v2-review",[\s\S]{0,200}routing: IMAGE_REVIEW_ROUTING/);
  });

  describe("7. rendez-vous construits par le code", () => {
    const R = () => import("@/lib/syna-agent/rendez-vous");
    afterEach(async () => { delete (await R()).pointDuMoisDeps.ecrire; });

    it("« Ta journée est prête » : sans calendrier, le dit ; jamais d'appel à l'IA", async () => {
      const { p } = await setup();
      const j = await fr(async () => (await R()).journeePrete(p));
      expect(j).toMatchObject({ vide: true, aPublier: [] });
      expect(j.message).toMatch(/pas encore prêt/);
      expect((await import("node:fs")).readFileSync("src/lib/syna-agent/rendez-vous.ts", "utf8").split("/* ---------- Le point du mois")[0]).not.toMatch(/llm/);
    });

    it("« le point du mois » : chiffres comptés, un appel, puis aucun tant que rien ne change ; un nombre inventé est refusé", async () => {
      const r = await R();
      const { p } = await setup();
      let calls = 0;
      r.pointDuMoisDeps.ecrire = async (prompt) => { calls++; expect(prompt).toMatch(/personnes touchées : non disponible/); return { bilan: "Ce mois-ci, ton calendrier n'avait encore aucune publication prévue : on commence le mois prochain.", mieux: "", actions: ["Préparer le calendrier du mois", "Valider les trois premières publications", "Choisir l'heure où tu publies"] }; };
      const first = await fr(() => r.pointDuMois(p, "2026-10"));
      expect(first.appel).toBe(true);
      expect(first.chiffres.find((c) => c.cle === "visites")).toMatchObject({ valeur: null });
      const second = await fr(() => r.pointDuMois(p, "2026-10"));
      expect(second.appel).toBe(false);
      expect(calls).toBe(1);
      r.pointDuMoisDeps.ecrire = async () => ({ bilan: "Tu as touché 4 000 personnes ce mois-ci, un très bon début pour ta marque.", mieux: "", actions: ["Action une précise", "Action deux précise", "Action trois précise"] });
      await expect(fr(() => r.pointDuMois(p, "2026-09"))).rejects.toThrow(/nombres absents/);
      expect(r.nombresInventes("En 2026, 3 publications", [{ cle: "x", libelle: "x", valeur: 3 }], "2026-11")).toEqual([]);
    });
  });

  it("fête des mères : reportée au premier dimanche de juin quand le dernier de mai est la Pentecôte", async () => {
    const { mothersDayFr, easterSunday } = await import("@/lib/engine/social-quality");
    expect(easterSunday(2026).toISOString().slice(0, 10)).toBe("2026-04-05");
    expect(mothersDayFr(2026).toISOString().slice(0, 10)).toBe("2026-05-31");
    expect(mothersDayFr(2034).toISOString().slice(0, 10)).toBe("2034-06-04");
    expect(mothersDayFr(2039).toISOString().slice(0, 10)).toBe("2039-06-05");
  });
});
