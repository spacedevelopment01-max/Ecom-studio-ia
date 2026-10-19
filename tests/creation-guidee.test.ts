import { campaignVerdict, campaignConcept, campaignCopy } from "./publication-fixtures";
/**
 * Création guidée (Publications et Publicités) : le client choisit le produit (principal ou du catalogue) ou le
 * service du projet, puis décrit librement le visuel. Le sujet est vérifié contre le projet, la photo de référence est
 * celle de CE produit, la demande du client passe dans la consigne de l'IA d'images, 3 essais au plus, puis la
 * version du studio (scène par l'IA sans texte + calques) prend le relais dans le plafond accepté.
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";

describe("Création guidée par produit ou service", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject, saveCatalog } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { one } = await import("@/lib/db");
  const { seedImageFixture, seedCutout } = await import("./image-v2-fixtures");
  const { subjectOptions, resolveSubject, MAIN_PRODUCT } = await import("@/lib/creative-subject");
  const { designPostWithAi } = await import("@/lib/social-v2/ai-post");
  const { createOnePost } = await import("@/lib/social-v2/single");
  const { produceBatch } = await import("@/lib/social-v2/production");
  const png = () => sharp({ create: { width: 1080, height: 1350, channels: 3, background: "#335544" } }).png().toBuffer();
  const ok = { ...campaignVerdict(), productFaithful: true, textsExact: true, legible: true, score: 9.2, issues: [] as string[], fix: "", person: false, anatomyOk: true };

  async function productProject() {
    const u = await createUser(`cg-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const pid = seedImageFixture(u.id, "hightech");
    const cut = await seedCutout(u.id, pid);
    const orig = await saveAsset({ projectId: pid, userId: u.id, data: await png(), name: "etui.png", mime: "image/png", role: "catalog-original", folderKey: "product.catalog", origin: "upload", status: "ready", meta: {} });
    saveCatalog(pid, [{ key: "etui", name: "Étui de voyage", category: "Accessoire", price: 1900, compareAt: null, description: "Étui rigide pour le casque.", features: [], originalAssetId: orig.id }]);
    return { u, p: loadProject(pid), cut, orig: orig.id };
  }

  it("propose le produit principal puis ceux du catalogue, chacun avec SA photo de référence", async () => {
    const { p, cut, orig } = await productProject();
    const opts = subjectOptions(p);
    expect(opts.map((o) => o.key)).toEqual([MAIN_PRODUCT, "etui"]);
    expect(opts[0].referenceAssetId).toBe(cut);
    expect(opts[1].referenceAssetId).toBe(orig);
    expect(resolveSubject(p, { kind: "product", key: "etui" })?.name).toBe("Étui de voyage");
    // Sujet inconnu : jamais un produit d'ailleurs, retour au produit principal.
    expect(resolveSubject(p, { kind: "product", key: "inconnu" })?.key).toBe(MAIN_PRODUCT);
  });

  it("projet de services : la liste montre les services, sans photo produit", async () => {
    const u = await createUser(`cgs-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const p = loadProject(seedImageFixture(u.id, "restaurant"));
    const opts = subjectOptions(p);
    expect(opts.map((o) => o.name)).toEqual(["Déjeuner du jour", "Dîner"]);
    expect(opts.every((o) => o.kind === "service" && o.referenceAssetId === null)).toBe(true);
  });

  it("le sujet et la demande du client sont gardés sur la publication et passent dans la consigne de l'IA", async () => {
    const { p, orig } = await productProject();
    const one1 = createOnePost(p, { kind: "image", date: "2030-01-10", time: "10:00", timezone: "Europe/Paris", platforms: [{ platform: "instagram" }], subject: { kind: "product", key: "etui" }, request: "l'étui posé sur un quai de gare au petit matin" });
    const brief = JSON.parse(one<{ brief: string }>("SELECT brief FROM posts WHERE id = ?", one1.ids[0])!.brief);
    expect(brief.subject).toEqual({ kind: "product", key: "etui" });
    expect(brief.request).toContain("quai de gare");
    const prompts: string[] = [];
    let spent = 0;
    const subject = resolveSubject(p, { kind: "product", key: "etui" });
    const r = await designPostWithAi(p, { id: one1.ids[0], network: "instagram", format: "image", title: "Partez serein", caption: "", pillar: null, objective: null, headline: "Partez serein", scheduled_at: null, subject: { kind: "product", key: "etui" }, request: brief.request }, { aspect: "4:5", maxCostEur: 1, reference: subject!.referenceAssetId, subject }, {
      copy: campaignCopy,
      generate: async (prompt) => (prompts.push(prompt), (spent += 40_000), png()),
      review: async (_i, _r, texts) => ({ ...ok, transcribed: texts }),
      spentMicro: () => spent,
      maxMicro: () => 40_000,
    });
    expect(r.assetId).toBeTruthy();
    expect(prompts[0]).toContain("Étui de voyage");
    expect(prompts[0]).toContain("quai de gare");
    expect(subject!.referenceAssetId).toBe(orig);
  });

  it("publicité guidée : enregistrée comme publicité (jamais reprise dans les publications)", async () => {
    const { p, cut } = await productProject();
    let spent = 0;
    const r = await designPostWithAi(p, { id: "pub-guidee", network: "meta", format: "image", title: "Le son net", caption: "", pillar: null, objective: "convert", headline: "Le son net", scheduled_at: null }, { aspect: "1:1", maxCostEur: 1, reference: cut, subject: resolveSubject(p, null), as: "ad" }, {
      copy: campaignCopy,
      generate: async () => ((spent += 40_000), png()),
      review: async (_i, _r, texts) => ({ ...ok, transcribed: texts }),
      spentMicro: () => spent,
      maxMicro: () => 40_000,
    });
    const a = one<{ role: string; meta: string }>("SELECT role, meta FROM assets WHERE id = ?", r.assetId!);
    expect(a?.role).toBe("ad");
    expect(JSON.parse(a!.meta).aiAd).toBe(true);
  });

  it("3 essais refusés : AUCUN gabarit ni affiche du studio à la place (toute image finale est créée par l'IA) ; le blocage est dit, le coût des essais reste compté", async () => {
    const { p } = await productProject();
    const one1 = createOnePost(p, { kind: "image", date: "2030-01-11", time: "10:00", timezone: "Europe/Paris", platforms: [{ platform: "instagram" }], subject: { kind: "product", key: MAIN_PRODUCT } });
    const calls: string[] = [];
    const deps = {
      aiActive: true,
      image: async () => (calls.push("image"), { assetId: (await saveAsset({ projectId: p.id, userId: p.userId, data: await png(), name: "affiche.png", mime: "image/png", role: "social", folderKey: "content.calendar", origin: "generated", status: "ready", meta: {} })).id, costMicro: 50_000, by: "image_v2" as const }),
      video: async () => ({ assetId: null, costMicro: 0, by: "video_v2" as const }),
      ad: async () => ({ assetId: null, costMicro: 0, by: "ads_v2" as const }),
      aiPost: async () => (calls.push("aiPost"), { assetId: null, costMicro: 120_000, by: "ai_post" as const, note: "refusé 3 fois" }),
      local: async () => (calls.push("local"), { assetId: null, costMicro: 0, by: "local" as const }),
      rewrite: async () => ({ title: "", caption: "", hashtags: [], costMicro: 0 }),
      estimate: (k: string) => (k === "ai_post" ? 150_000 : 50_000),
    };
    const res = await produceBatch(p, one1.ids, deps, { allowPaid: true, maxCostEur: 0.3, approvedEstimateMicro: 300_000, aiImages: 60 });
    expect(calls).toEqual(["aiPost"]);
    expect(res.produced).toBe(0);
    expect(res.skipped).toBe(1);
    expect(res.spentMicro).toBe(120_000);
    expect(res.notes.join(" ")).toMatch(/aucun gabarit/);
  });
});
