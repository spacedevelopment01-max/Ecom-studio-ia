/**
 * Les cinq scénarios du benchmark Vidéo V2, avec fournisseurs SIMULÉS (aucun appel, aucune dépense) : chaque scénario
 * produit une vidéo cohérente avec son intention, son langage visuel et sa durée ; les vidéos diffèrent d'un projet
 * à l'autre (accroche, plans, procédés). Aucun traitement propre à un scénario n'existe dans le moteur.
 */
import { describe, expect, it } from "vitest";

describe("Benchmark Vidéo V2 — 5 scénarios simulés", async () => {
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { runVideoEngineV2 } = await import("@/lib/video-v2/engine");
  const { latestVideo } = await import("@/lib/video-v2/store");
  const { timeline } = await import("@/lib/video-v2/doc");
  const { seedImageFixture, seedCutout } = await import("./image-v2-fixtures");
  const { mockVideoDeps } = await import("./video-v2-mock");
  const { SCENARIO_ASK, SCENARIO_FIXTURE, VIDEO_SCENARIOS } = await import("./video-v2-fixtures");
  const u = await createUser(`v2b-${Date.now()}@test.fr`, "motdepasse-test", "V");
  const runs: Record<string, any> = {};

  const expected: Record<string, { kind: RegExp; language: string; aspect: string; durationS: number }> = {
    A: { kind: /company_presentation|trade_video/, language: "craft_documentary", aspect: "16:9", durationS: 30 },
    B: { kind: /video_ad/, language: "premium_soft", aspect: "9:16", durationS: 15 },
    C: { kind: /product_demo/, language: "tech_precise", aspect: "1:1", durationS: 30 },
    D: { kind: /social_content|video_ad|lifestyle/, language: "food_warm", aspect: "9:16", durationS: 15 },
    E: { kind: /explainer/, language: "digital_explainer", aspect: "16:9", durationS: 45 },
  };

  for (const sc of VIDEO_SCENARIOS) {
    it(`scénario ${sc} (${SCENARIO_FIXTURE[sc]}) : intention, langage visuel, durée, vidéo rendue, barrière`, async () => {
      const p = loadProject(seedImageFixture(u.id, SCENARIO_FIXTURE[sc]));
      if (p.business === "products" && SCENARIO_FIXTURE[sc] !== "saas") await seedCutout(u.id, p.id);
      const { deps, log } = mockVideoDeps({ userId: u.id, projectId: p.id, voice: true });
      const r = await runWithLang({ ui: "fr", content: "fr" }, () => runVideoEngineV2(null, p.id, { ask: SCENARIO_ASK[sc], approveGeneration: true, renderScale: 0.15, fps: 6 }, deps));
      const e = expected[sc];
      expect(r.intent.kind).toMatch(e.kind);
      expect(r.strategy.style.language).toBe(e.language);
      expect(r.intent.aspect).toBe(e.aspect);
      const doc = latestVideo(p.id, r.docKey!)!.doc;
      expect(Math.abs(timeline(doc).total - e.durationS)).toBeLessThanOrEqual(Math.max(1.5, e.durationS * 0.1));
      expect(r.videoAssetId).toBeTruthy();
      expect(r.verdict).toBe("FINAL");
      // Services : aucun produit montré ; logiciel : animation d'interface, pas de génération inutile.
      if (p.business === "services") expect(r.shots.some((s) => s.showsProduct)).toBe(false);
      if (sc === "E") {
        expect(r.shots.some((s) => s.method === "ui_animation")).toBe(true);
        expect(log.clips).toHaveLength(0);
      }
      // Aucune affirmation inventée : chaque preuve vient des faits confirmés.
      expect(r.script.issues.filter((x) => /non confirm/.test(x))).toEqual([]);
      runs[sc] = { hook: r.strategy.hook, methods: r.shots.map((s) => s.method).join(","), music: r.strategy.style.music, camera: r.strategy.style.camera };
    }, 240_000);
  }

  it("diversité : accroches et langages différents d'un projet à l'autre", () => {
    const hooks = Object.values(runs).map((x) => x.hook);
    expect(new Set(hooks).size).toBe(hooks.length);
    expect(new Set(Object.values(runs).map((x) => x.camera)).size).toBe(Object.keys(runs).length);
  });
});
