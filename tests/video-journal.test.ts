/** Rapport 09, point 11 : journal de chaque création vidéo, signalement et retrait, « j'ai les droits sur cette photo ». */
import { describe, expect, it } from "vitest";

describe("journal des vidéos créées par l'IA", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { getAsset, saveAsset } = await import("@/lib/library");
  const { confirmPhotoRights, journalCreation, photoRightsAt, projectCreations, withdrawCreation } = await import("@/lib/video-v2/journal");
  const { runVideoEngineV2 } = await import("@/lib/video-v2/engine");
  const { seedImageFixture, seedCutout } = await import("./image-v2-fixtures");
  const { grantProjectPlan } = await import("./communication-choice-fixture");
  const { mockVideoDeps } = await import("./video-v2-mock");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, async () => fn());
  const u = await createUser(`journal-${Date.now()}@test.fr`, "motdepasse-test", "J");

  it("chaque plan est inscrit (qui, quel modèle, droits datés) ; un plan signalé est retiré tout de suite, la trace reste", async () => {
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    expect(photoRightsAt(p.id)).toBeNull();
    const at = confirmPhotoRights(p.id, u.id);
    expect(photoRightsAt(p.id)).toBe(at);
    const { mockMp4 } = await import("./video-v2-mock");
    const a = await saveAsset({ projectId: p.id, userId: u.id, data: mockMp4(1), name: "plan.mp4", mime: "video/mp4", role: "clip", origin: "generated" });
    const id = journalCreation({ projectId: p.id, userId: u.id, assetId: a.id, sourceAssetId: "photo-1", provider: "kling", model: "kling-4.0", prompt: "le flacon sur la table" });
    const row = projectCreations(p.id)[0];
    expect(row).toMatchObject({ id, user_id: u.id, provider: "kling", model: "kling-4.0", rights_confirmed_at: at, status: "ok" });
    expect(row.prompt_sha).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain("flacon");
    const w = withdrawCreation(p.id, id, { by: u.id, reason: "photo d'un tiers" });
    expect(w).toMatchObject({ status: "retire", report_reason: "photo d'un tiers", reported_by: u.id });
    expect(getAsset(a.id)!.deleted_at).toBeTruthy();
    // Un autre projet ne peut pas retirer ce plan.
    expect(withdrawCreation("autre-projet", id, { by: u.id, reason: "x" })).toBeNull();
  });

  it("sans « j'ai les droits sur cette photo », le moteur n'anime rien : plans sûrs seulement", async () => {
    const p = loadProject(seedImageFixture(u.id, "cosmetic"));
    grantProjectPlan(p.id, "dominer");
    await seedCutout(u.id, p.id);
    const { deps, log } = mockVideoDeps({ userId: u.id, projectId: p.id });
    const r = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Publicité Instagram" }, approveGeneration: true, render: false }, { ...deps, rightsChecked: false }));
    expect(log.clips).toHaveLength(0);
    expect(r.notes.join(" ")).toMatch(/droits sur les photos non confirmés/);
    confirmPhotoRights(p.id, u.id);
    const r2 = await fr(() => runVideoEngineV2(null, p.id, { ask: { text: "Publicité Instagram" }, approveGeneration: true, render: false }, { ...deps, rightsChecked: false }));
    expect(log.clips.length).toBeGreaterThan(0);
    // Chaque plan créé est au journal, avec la date de l'accord.
    const rows = projectCreations(p.id);
    expect(rows.length).toBe(log.clips.length);
    expect(rows.every((x) => x.rights_confirmed_at != null || x.source_asset_id == null)).toBe(true);
    expect(r2.notes.join(" ")).not.toMatch(/droits sur les photos non confirmés/);
  }, 120_000);
});
