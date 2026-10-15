/**
 * Premières publications faites entièrement par l'IA : les N premières publications en image d'un calendrier ont un
 * visuel créé par l'IA (le vrai produit en référence), même quand la bibliothèque a déjà des photos ; les autres
 * restent gratuites. Sans IA (forfait Découverte) ou sans accord, rien n'est payé. Les vidéos ne sont pas concernées.
 */
import { describe, expect, it } from "vitest";

describe("Publications entièrement faites par l'IA (création du projet)", async () => {
  const { createUser } = await import("@/lib/auth");
  const { run } = await import("@/lib/db");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { createPlanV2 } = await import("@/lib/social-v2/planner");
  const { estimateProduction, produceBatch, postsOfPlan, aiImageIds } = await import("@/lib/social-v2/production");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { mockSocialDeps } = await import("./social-v2-mock");
  const { FIRST_AI_POSTS } = await import("@/lib/engine/pipeline");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const start = () => new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);

  async function project() {
    const u = await createUser(`pia-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'active', plan = 'dominer' WHERE user_id = ?", u.id);
    syncAllowance(u.id);
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const r = fr(() => createPlanV2(p, { startDate: start(), days: 7, perDay: 1, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }], formatMix: { image: 100 } }));
    return { p, ids: postsOfPlan(r.planId) };
  }

  it("10 publications par l'IA (Qwen) à la création (règle du propriétaire)", () => expect(FIRST_AI_POSTS).toBe(10));

  it("les 3 premières publications en image : visuel IA (payant, plafonné) ; les autres gratuites", async () => {
    const { p, ids } = await project();
    const { deps, log } = mockSocialDeps({ aiActive: true, cost: 100_000 });
    const est = estimateProduction(p, ids, deps, { allowPaid: true, aiImages: 3 });
    expect(est.paid).toBe(3);
    expect(est.lines.filter((l) => l.method === "ai_post")).toHaveLength(3);
    const res = await produceBatch(p, ids, deps, { allowPaid: true, maxCostEur: 0.3, approvedEstimateMicro: 300_000, aiImages: 3 });
    expect(log.image).toBe(3);
    expect(log.paid).toBe(3);
    expect(res.spentMicro).toBe(300_000);
    expect(res.byMethod.image_v2).toBe(3);
    expect(res.produced).toBe(ids.length);
  });

  it("sans IA ou sans accord : aucune dépense, tout en rendu gratuit", async () => {
    const { p, ids } = await project();
    const off = mockSocialDeps({ aiActive: false });
    const r1 = await produceBatch(p, ids.slice(0, 3), off.deps, { allowPaid: true, maxCostEur: 1, approvedEstimateMicro: 300_000, aiImages: 3 });
    expect(r1.spentMicro).toBe(0);
    expect(off.log.paid).toBe(0);
    const on = mockSocialDeps({ aiActive: true });
    const r2 = await produceBatch(p, ids.slice(3), on.deps, { allowPaid: true, maxCostEur: 1, approvedEstimateMicro: null, aiImages: 3 });
    expect(r2.spentMicro).toBe(0);
    expect(on.log.paid).toBe(0);
  });

  it("image IA refusée par le contrôle : rendu gratuit à la place, mais le coût payé reste compté", async () => {
    const { p, ids } = await project();
    const { deps } = mockSocialDeps({ aiActive: true, cost: 100_000 });
    const refused = { ...deps, image: async () => ({ assetId: null, costMicro: 227_000, by: "image_v2" as const, note: "aucune image validée par Image Engine V2" }) };
    const res = await produceBatch(p, ids.slice(0, 1), refused, { allowPaid: true, maxCostEur: 1, approvedEstimateMicro: 343_000, aiImages: 1 });
    expect(res.produced).toBe(1);
    expect(res.spentMicro).toBe(227_000);
    expect(res.notes.join(" ")).toMatch(/aucune image validée/);
  });

  it("les vidéos ne comptent pas parmi les publications en image", () => {
    const rows = [{ id: "a", format: "reel" }, { id: "b", format: "image" }, { id: "c", format: "carousel" }, { id: "d", format: "story" }, { id: "e", format: "image" }];
    expect([...aiImageIds(rows, 3)]).toEqual(["b", "c", "d"]);
    expect(aiImageIds(rows, 0).size).toBe(0);
  });
});
