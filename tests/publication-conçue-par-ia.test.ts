import { campaignVerdict, campaignConcept, campaignCopy } from "./publication-fixtures";
/**
 * Publication entièrement conçue par l'IA (scène, mise en page, textes, produit réel) : accroche de l'IA nettoyée
 * (rien d'inventé de chiffré), textes exacts et produit fidèle exigés par le contrôle, 3 essais au plus avec la
 * correction, plafond respecté, jamais sans photo du produit, coût payé toujours compté.
 */
import { describe, expect, it } from "vitest";
import sharp from "sharp";

describe("Publication conçue par l'IA", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { saveAsset } = await import("@/lib/library");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { designPostWithAi, cleanAiCopy, aiPostPrompt, aiPostAccepted, textsMatch } = await import("@/lib/social-v2/ai-post");
  const png = () => sharp({ create: { width: 1080, height: 1350, channels: 3, background: "#335544" } }).png().toBuffer();
  const post = { id: "post-ia-1", network: "instagram", format: "image", title: "750 ml", caption: "", pillar: "Produit", objective: "sell", headline: "750 ml", scheduled_at: null };
  type Rev = ReturnType<typeof campaignVerdict> & { transcribed?: string[]; person?: boolean; anatomyOk?: boolean; productFaithful: boolean; textsExact: boolean; legible: boolean; score: number; issues: string[]; fix: string };
  const ok: Rev = { ...campaignVerdict(), productFaithful: true, textsExact: true, legible: true, score: 9.2, issues: [], fix: "" };

  async function setup() {
    const u = await createUser(`pcia-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const ref = await saveAsset({ projectId: p.id, userId: u.id, data: await png(), name: "ref.png", mime: "image/png", role: "cutout", folderKey: "images.cutouts", origin: "generated", status: "approved", meta: {} });
    return { p, ref: ref.id };
  }
  function fakes(reviews: Rev[], costPerCall = 230_000) {
    const calls = { generate: 0, prompts: [] as string[], spent: 0 };
    return {
      calls,
      deps: {
        copy: async () => ({ headline: "Partez léger. Voyez grand.", subline: "La gourde Cime", cta: "Découvrir", scene: "mountain sunrise, product on a rock", concept:campaignConcept() }),
        generate: async (prompt: string) => (calls.generate++, calls.prompts.push(prompt), (calls.spent += costPerCall), png()),
        review: async (_img: Buffer, _ref: Buffer | null, texts: string[]) => { const r = reviews.shift() ?? ok; return { ...r, person: r.person ?? false, anatomyOk: r.anatomyOk ?? true, transcribed: r.transcribed ?? texts }; },
        spentMicro: () => calls.spent,
        maxMicro: () => costPerCall,
      },
    };
  }

  it("accepté au premier essai : la publication complète est enregistrée, accroche de l'IA écrite mot pour mot", async () => {
    const { p, ref } = await setup();
    const f = fakes([ok]);
    const r = await designPostWithAi(p, post, { aspect: "4:5", maxCostEur: 1, reference: ref }, f.deps);
    expect(r.assetId).toBeTruthy();
    expect(r.costMicro).toBe(230_000);
    expect(f.calls.prompts[0]).toContain('"Partez léger. Voyez grand."');
    expect(f.calls.prompts[0]).toContain("mountain sunrise");
  });

  it("texte faux puis corrigé : un seul nouvel essai, avec la correction demandée", async () => {
    const { p, ref } = await setup();
    const f = fakes([{ ...ok, textsExact: false, fix: "écrire ISOTHERME correctement" }, ok]);
    const r = await designPostWithAi(p, post, { aspect: "4:5", maxCostEur: 1, reference: ref }, f.deps);
    expect(r.assetId).toBeTruthy();
    expect(f.calls.generate).toBe(2);
    expect(f.calls.prompts[1]).toContain("ISOTHERME");
  });

  it("refusé trois fois (règle du propriétaire : 3 essais) : rien d'enregistré, mais les trois essais payés restent comptés", async () => {
    const { p, ref } = await setup();
    const bad = { ...ok, productFaithful: false };
    const f = fakes([bad, bad, bad]);
    const r = await designPostWithAi(p, post, { aspect: "4:5", maxCostEur: 1, reference: ref }, f.deps);
    expect(r.assetId).toBeNull();
    expect(f.calls.generate).toBe(3);
    expect(r.costMicro).toBe(690_000);
  });

  it("plafond : aucun appel au-delà ; sans photo du produit : rien n'est généré", async () => {
    const { p, ref } = await setup();
    const f = fakes([]);
    const capped = await designPostWithAi(p, post, { aspect: "4:5", maxCostEur: 0.1, reference: ref }, f.deps);
    expect(capped.assetId).toBeNull();
    expect(f.calls.generate).toBe(0);
    const none = await designPostWithAi(p, post, { aspect: "4:5", maxCostEur: 1, reference: null }, f.deps);
    expect(none.assetId).toBeNull();
    expect(f.calls.generate).toBe(0);
  });

  it("accroche : rien d'inventé de chiffré (prix, %, avis) ; contrôle exigeant", () => {
    const fb = { headline: "750 ml", subline: "Gourde", cta: "Découvrir", brand: "Cime" };
    const c = cleanAiCopy({ headline: "-30 % ce week-end", subline: "La meilleure gourde", cta: "Commander", scene: "the headphones resting around the neck of a stylish person, a confident supporter in the back" }, fb);
    expect(c.headline).toBe("750 ml");
    expect(c.subline).toBe("Gourde");
    expect(c.cta).toBe("Commander");
    expect(aiPostAccepted({ ...ok, person: false, anatomyOk: true, transcribed: [], score: 6.5 }, true)).toBe(false);
    expect(aiPostAccepted({ ...ok, person: true, anatomyOk: true, transcribed: [] }, true)).toBe(false);
    // Personnes autorisées par le client : acceptées si réalistes, refusées si l'anatomie est ratée.
    expect(aiPostAccepted({ ...ok, person: true, anatomyOk: true, transcribed: [] }, true, undefined, true)).toBe(true);
    expect(aiPostAccepted({ ...ok, person: true, anatomyOk: false, transcribed: [] }, true, undefined, true)).toBe(false);
    expect(cleanAiCopy({ headline: "Le son", subline: "", cta: "Découvrir", scene: "a smiling woman wearing the headphones at sunset" }, fb, true).scene).toMatch(/woman/);
    expect(c.scene).not.toMatch(/person|supporter|neck/i);
    expect(aiPostAccepted({ ...ok, person: false, anatomyOk: true, transcribed: [], legible: false }, true)).toBe(false);
  });

  it("orthographe vérifiée par le studio : « Découvrïr » refusé même si le contrôle dit « textes exacts »", async () => {
    const want = ["Le son, en beauté.", "Casque audio Sonore", "Découvrir", "Sonore"];
    expect(textsMatch(want, ["Le son,", "en beauté.", "Casque audio Sonore", "Découvrir", "Sonore"])).toBe(true);
    expect(textsMatch(want, ["Le son, en beauté.", "Casque audio Sonore", "Découvrïr", "Sonore"])).toBe(false);
    expect(textsMatch(want, [...want, "Livraison offerte"])).toBe(false);
    const { p, ref } = await setup();
    const typo = { ...ok, transcribed: ["Partez léger. Voyez grand.", "La gourde Cime", "Découvrïr"] };
    const f = fakes([typo, typo, typo]);
    const r = await designPostWithAi(p, post, { aspect: "4:5", maxCostEur: 1, reference: ref }, f.deps);
    expect(r.assetId).toBeNull();
    expect(f.calls.generate).toBe(3);
  });

  it("une reprise identique réutilise la version acceptée sans nouvel appel", async () => {
    const { p, ref } = await setup();
    const keys: string[] = [];
    let spent = 0;
    const deps = { copy:campaignCopy, generate: async (_pr: string, _a: string, _r: Buffer | null, key: string) => (keys.push(key), (spent += 230_000), png()), review: async (_i: Buffer, _r: Buffer | null, texts: string[]) => ({ ...ok, person: false, anatomyOk: true, transcribed: texts }), spentMicro: (prefix: string) => (keys.some((k) => k.startsWith(prefix)) ? keys.filter((k) => k.startsWith(prefix)).length * 230_000 : 0), maxMicro: () => 230_000 };
    await designPostWithAi(p, post, { aspect: "4:5", maxCostEur: 0.3, reference: ref }, deps as any);
    await new Promise((r) => setTimeout(r, 5));
    const second = await designPostWithAi(p, post, { aspect: "4:5", maxCostEur: 0.3, reference: ref }, deps as any);
    expect(second.assetId).toBeTruthy();
    expect(new Set(keys).size).toBe(1);
  });

  it("consigne : produit identique à la référence, aucun autre texte", async () => {
    const { p } = await setup();
    const t = aiPostPrompt(p, post, { aspect: "4:5", hasReference: true });
    expect(t).toMatch(/reproduce it EXACTLY/);
    expect(t).toMatch(/No other words/);
  });
});
