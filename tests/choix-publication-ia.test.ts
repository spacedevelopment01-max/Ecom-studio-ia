/**
 * Visuel d'une publication (images finales 100 % IA) : pour un lot ET pour une seule publication, le client choisit
 *  - « Reprendre une image déjà créée par l'IA » (0 €, sinon la publication attend son visuel) ;
 *  - « Publication entièrement par l'IA » (prix affiché avant tout lancement).
 * Plus de mise en page du studio sur une photo. Le visuel peut être refait (l'ancien reste en bibliothèque).
 */
import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("Choix du visuel d'une publication (100 % IA)", async () => {
  const src = fs.readFileSync("src/components/studio/social-studio.tsx", "utf8") + fs.readFileSync("src/components/studio/visual-choice.tsx", "utf8") + fs.readFileSync("src/components/studio/social-create.tsx", "utf8");
  it("les deux options sont proposées (FR/EN), dans le lot et dans la fiche d'une publication ; plus de mise en page du studio", () => {
    for (const s of ["Reprendre une image déjà créée par l'IA", "Publication entièrement par l'IA", "Reuse an image already created by AI", "Post entirely by AI"]) expect(src).toContain(s);
    for (const s of ["Image gratuite, mise en page du studio", "Image par l'IA, le studio fait le reste", "Free image, studio layout"]) expect(src).not.toContain(s);
    // Lot des publications planifiées et publication seule (Publications › Publication image).
    expect(src).toContain('name="batch-image"');
    expect(src).toContain("<VisualChoice value={imageMode} onChange={setImageMode}");
    expect(src).toContain("<PostVisualMaker postId={p.id}");
    expect(src).toMatch(/action: "estimate", ids: \[postId\], replace: true, \.\.\.visualParams\(mode\)/);
  });
  it("chaque mode envoie les bons paramètres", async () => {
    const m = await import("@/lib/social-v2/visual-mode");
    expect(m.visualParams("free")).toEqual({ allowPaid: false });
    expect(m.visualParams("ai_image")).toEqual({ allowPaid: true, aiImages: 60 }); // ancien réglage : tout par l'IA
    expect(m.visualParams("ai_post")).toEqual({ allowPaid: true, aiImages: 60 });
  });

  const { createUser } = await import("@/lib/auth");
  const { run } = await import("@/lib/db");
  const { getSubscription, syncAllowance } = await import("@/lib/billing");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { createPlanV2 } = await import("@/lib/social-v2/planner");
  const { estimateProduction, produceBatch, postsOfPlan } = await import("@/lib/social-v2/production");
  const { seedImageFixture } = await import("./image-v2-fixtures");
  const { mockSocialDeps } = await import("./social-v2-mock");
  const start = () => new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  async function project() {
    const u = await createUser(`vis-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "V");
    getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'active', plan = 'dominer' WHERE user_id = ?", u.id);
    syncAllowance(u.id);
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    const r = runWithLang({ ui: "fr", content: "fr" }, () => createPlanV2(p, { startDate: start(), days: 3, perDay: 1, timezone: "Europe/Paris", platforms: [{ platform: "instagram" }], formatMix: { image: 100 } }));
    return { p, ids: postsOfPlan(r.planId) };
  }

  it("« tout par l'IA » : publication IA payante pour chaque publication en image, même avec une bibliothèque", async () => {
    const { p, ids } = await project();
    const { deps, log } = mockSocialDeps({ aiActive: true, cost: 100_000 });
    const est = estimateProduction(p, ids, deps, { allowPaid: true, aiImages: 60 });
    expect(est.lines.every((l) => l.method === "ai_post" && l.paid)).toBe(true);
    const res = await produceBatch(p, ids, deps, { allowPaid: true, maxCostEur: 5, approvedEstimateMicro: est.estimateMicro, aiImages: 60 });
    expect(log.aiPost).toBe(ids.length);
    expect(res.produced).toBe(ids.length);
  });

  it("refaire le visuel d'une publication : l'ancien est remplacé seulement si on le demande ; gratuit = image IA déjà validée", async () => {
    const { p, ids } = await project();
    const { deps } = mockSocialDeps({ aiActive: true, cost: 100_000 });
    const est = estimateProduction(p, ids.slice(0, 1), deps, { allowPaid: true, aiImages: 60 });
    await produceBatch(p, ids.slice(0, 1), deps, { allowPaid: true, maxCostEur: 2, approvedEstimateMicro: est.estimateMicro, aiImages: 60 });
    const { one } = await import("@/lib/db");
    const before = one<{ media: string }>("SELECT media FROM posts WHERE id = ?", ids[0])!.media;
    expect(before).not.toBe("[]");
    expect((await produceBatch(p, ids.slice(0, 1), deps, { allowPaid: false, maxCostEur: 0 })).produced).toBe(0);
    expect(estimateProduction(p, ids.slice(0, 1), deps, { allowPaid: false }).posts).toBe(0);
    expect(estimateProduction(p, ids.slice(0, 1), deps, { allowPaid: false, replace: true }).posts).toBe(1);
    // Gratuit : une image déjà créée par l'IA pour le projet est reprise (jamais une mise en page du studio).
    const r = await produceBatch(p, ids.slice(0, 1), deps, { allowPaid: false, maxCostEur: 0, replace: true });
    expect(r.produced).toBe(1);
  });
});
