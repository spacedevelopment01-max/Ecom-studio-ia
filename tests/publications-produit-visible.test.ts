/**
 * Publications d'une boutique dont le détourage a été refusé et qui n'a pas de photo en situation : la moitié des
 * publications montrent quand même le vrai produit (packshot, photo d'origine) au lieu d'une photo libre sans lui.
 */
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/llm", async (orig) => ({ ...(await orig<typeof import("@/lib/ai/llm")>()), llmConfigured: () => false }));
// Photo libre (paysage) trouvée pour chaque publication : enregistrée comme photo de banque d'images.
vi.mock("@/lib/engine/service-media", async (orig) => {
  const real = await orig<typeof import("@/lib/engine/service-media")>();
  return {
    ...real,
    bestAdPhoto: async (base: { userId: string; projectId: string }, _p: unknown, o: { key: string }) => {
      const { saveAsset } = await import("@/lib/library");
      const data = await sharp({ create: { width: 1200, height: 1500, channels: 3, background: "#3d5a3a" } }).jpeg().toBuffer();
      return saveAsset({ projectId: base.projectId, userId: base.userId, data, name: `${o.key}.jpg`, mime: "image/jpeg", role: "ambiance", folderKey: "images.scenes", origin: "import", meta: { stock: { source: "pixabay" } } });
    },
  };
});
beforeEach(() => vi.stubGlobal("fetch", async () => new Response("{}", { status: 404 })));
afterEach(() => vi.unstubAllGlobals());

describe("Publications : le vrai produit reste visible sans détourage", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject } = await import("@/lib/projects");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { saveAsset, getAsset, assetMeta } = await import("@/lib/library");
  const { localRender } = await import("@/lib/social-v2/deps");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const { run } = await import("@/lib/db");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  it("au moins une publication sur trois (attendu : une sur deux) a le produit en fond, jamais toutes des paysages", async () => {
    const u = await createUser(`prodvis${Date.now()}@test.fr`, "motdepasse-test", "P");
    const pid = await seedThemeScenario(u.id, "cosmetic");
    grantProjectPlan(pid, "vendre");
    const packshot = await sharp({ create: { width: 1200, height: 1500, channels: 3, background: "#e9e6e1" } })
      .composite([{ input: await sharp({ create: { width: 300, height: 800, channels: 3, background: "#7f9a7a" } }).png().toBuffer(), left: 450, top: 350 }])
      .jpeg()
      .toBuffer();
    // Cas réel (démonstration Cime) : aucune image du produit à part la photo d'origine, détourage refusé.
    run("UPDATE assets SET deleted_at = ? WHERE project_id = ? AND kind = 'image'", Date.now(), pid);
    // Photo d'origine sur fond uni (aucune photo « en situation ») et aucun détourage validé.
    await saveAsset({ projectId: pid, userId: u.id, data: packshot, name: "produit.jpg", mime: "image/jpeg", role: "original", folderKey: "product", origin: "upload", meta: { triage: { plain: 1, kind: "packshot" } } });
    const p = loadProject(pid);
    p.business = "products";
    let withProduct = 0;
    const N = 12;
    for (let i = 0; i < N; i++) {
      const post = { id: `pv-gourde-${i}`, network: "instagram", format: "feed", title: "La gourde du quotidien", caption: "", pillar: null, objective: null, headline: "La gourde du quotidien", scheduled_at: null };
      const r = await fr(() => localRender(p, post));
      const bg = assetMeta<any>(getAsset(r.assetId!)!).poster.backgroundAssetId;
      const a = bg ? getAsset(bg) : null;
      // Fond = une vraie photo du produit (photo d'origine, packshot, mise en scène), pas une photo libre.
      if (a && ["original", "packshot", "scene", "lifestyle", "detail"].includes(a.role ?? "") && !assetMeta<any>(a).stock) withProduct++;
    }
    expect(withProduct).toBeGreaterThanOrEqual(Math.ceil(N / 3));
    expect(withProduct).toBeLessThan(N);
  }, 120_000);
});
