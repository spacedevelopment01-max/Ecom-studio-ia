/**
 * Barrière de qualité des médias (phase 1B) : une image refusée, à vérifier (contrôle en panne) ou provisoire n'est
 * jamais reprise automatiquement (boutique, publications, vidéos) ; photo libre hors métier refusée avant tout
 * usage ; nombre de photos regardées par l'IA plafonné ; un plan vidéo n'est FINAL que si ses 3 images ont été
 * réellement contrôlées, sans image inutilisable (1 mauvaise + 2 moyennes : refusé).
 */
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

let qcScene: (n: number) => any = () => ({ ok: true, score: 8, issues: [] });
let sceneCalls = 0;
vi.mock("@/lib/ai/llm", async (orig) => ({ ...(await orig<object>()), llmConfigured: () => true, llmJson: vi.fn(async () => ({ queries: ["plasterer at work"] })) }));
vi.mock("@/lib/ai/tasks", async (orig) => ({ ...(await orig<object>()), aiQcScene: vi.fn(async () => qcScene(sceneCalls++)) }));
const jpg = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#ccc" } }).jpeg().toBuffer();
let found: any[] = [];
vi.mock("@/lib/stock/photos", async (orig) => ({ ...(await orig<object>()), searchStock: async () => found, downloadStock: async () => jpg, stockCredit: () => "crédit" }));

const { createUser } = await import("@/lib/auth");
const { id, now, run } = await import("@/lib/db");
const { saveAsset } = await import("@/lib/library");
const { collectImages } = await import("@/lib/engine/shop");
const { usableByRole } = await import("@/lib/quality/usable");
const { firstOnTopic } = await import("@/lib/engine/service-media");
const { universePhotos } = await import("@/lib/engine/stock-universe");
const { clipDecision } = await import("@/lib/engine/videos");
const { decide } = await import("@/lib/quality/gate");
const { gateMeta } = await import("@/lib/quality/store");

async function project() {
  const u = await createUser(`media${Date.now()}${Math.random().toString(36).slice(2, 6)}@test.fr`, "motdepasse-test", "P");
  const pid = id();
  run(
    "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    pid, u.id, "Blanc", "ready", "shopify", JSON.stringify({ name: "Veilleuse", category: "veilleuse", facts: [], questions: [] }), "{}", JSON.stringify({ language: "fr" }), "[]", now(), now(),
  );
  return { pid, uid: u.id };
}
const img = (pid: string, uid: string, role: string, name: string, gate: object | null, status: "ready" | "review" | "rejected" | "approved" = "review") =>
  saveAsset({ projectId: pid, userId: uid, data: jpg, name, mime: "image/jpeg", role, origin: "generated", meta: gate ? { gate } : {}, status });

describe("réutilisation automatique des médias", () => {
  it("boutique et réserves (publications, vidéos) : jamais une image refusée, à vérifier ou fatale", async () => {
    const { pid, uid } = await project();
    const finalG = gateMeta(decide("image_lifestyle", { checker: "ai", score: 8.5 }), null);
    const retryG = gateMeta(decide("image_lifestyle", { checker: "ai", score: null, error: "délai dépassé" }), null);
    const rejG = gateMeta(decide("image_lifestyle", { checker: "ai", score: 3 }), null);
    const fatalG = gateMeta(decide("image_product", { checker: "ai", score: 9, codes: ["wrong_product"] }), null);
    const ok = await img(pid, uid, "lifestyle", "ok.jpg", finalG);
    await img(pid, uid, "lifestyle", "panne.jpg", retryG);
    await img(pid, uid, "lifestyle", "rate.jpg", rejG, "rejected");
    await img(pid, uid, "lifestyle", "fatal.jpg", fatalG, "approved");
    const { files } = collectImages(pid);
    expect(new Set(Object.values(files))).toEqual(new Set([ok.id]));
    expect(usableByRole(pid, "lifestyle").map((a) => a.id)).toEqual([ok.id]);
    // Scènes : la réserve des publications et du montage vidéo ne contient que des images utilisables.
    const scene = await img(pid, uid, "scene", "s-ok.jpg", gateMeta(decide("image_product", { checker: "ai", score: 8 }), null));
    await img(pid, uid, "scene", "s-rejet.jpg", rejG, "rejected");
    await img(pid, uid, "scene", "s-panne.jpg", retryG);
    expect(usableByRole(pid, "scene").map((a) => a.id)).toEqual([scene.id]);
  });
});

describe("photos libres du métier", () => {
  const photo = (n: number, alt: string) => ({ source: "pixabay" as const, id: String(n), url: `u${n}`, page: "", author: "", license: "Pixabay", width: 1, height: 1, alt });
  it("photo hors métier (mur nu) refusée par le contrôle ; la suivante, au niveau, est prise", async () => {
    const { pid, uid } = await project();
    sceneCalls = 0;
    qcScene = (n) => (n === 0 ? { ok: false, score: 3, issues: ["mur nu, aucun geste du métier"] } : { ok: true, score: 8, issues: [] });
    const pick = await firstOnTopic({ userId: uid, projectId: pid }, [photo(1, "wall, brick"), photo(2, "plasterer, trowel")], "plâtrier peintre", (ph) => `k:${ph.id}`, true);
    expect(pick?.photo.id).toBe("2");
    expect(pick?.decision.verdict).toBe("FINAL");
  });
  it("photo « à vérifier » (6/10) ou contrôle en panne : jamais prise", async () => {
    const { pid, uid } = await project();
    qcScene = () => ({ ok: true, score: 6, issues: ["cadrage moyen"] });
    expect(await firstOnTopic({ userId: uid, projectId: pid }, [photo(3, "plasterer")], "plâtrier", (ph) => `k:${ph.id}`, true)).toBeNull();
    qcScene = () => {
      throw new Error("vision indisponible");
    };
    expect(await firstOnTopic({ userId: uid, projectId: pid }, [photo(4, "plasterer")], "plâtrier", (ph) => `k:${ph.id}`, true)).toBeNull();
  });
  it("univers d'un produit : au plus 5 photos regardées par photo voulue, jamais le premier résultat sans contrôle", async () => {
    const { pid, uid } = await project();
    sceneCalls = 0;
    qcScene = () => ({ ok: false, score: 3, issues: ["hors sujet"] });
    found = Array.from({ length: 20 }, (_, i) => photo(100 + i, "night light bedroom"));
    const p: any = { id: pid, userId: uid, product: { name: "Veilleuse", category: "veilleuse", summary: "" }, brand: { audience: "" } };
    const got = await universePhotos({ userId: uid, projectId: pid }, p, 2);
    expect(got).toHaveLength(0);
    expect(sceneCalls).toBeLessThanOrEqual(10);
  });
});

describe("plans vidéo générés", () => {
  it("1 image inutilisable + 2 moyennes : refusé ; une panne : jamais FINAL ; une image non contrôlée : jamais FINAL", () => {
    expect(clipDecision({ scores: [3, 6, 6], bad: 1, wrong: false, issues: ["main déformée"], expected: 3 }).verdict).not.toBe("FINAL");
    expect(clipDecision({ scores: [8, 8], bad: 0, wrong: false, issues: [], error: "délai dépassé", expected: 3 }).verdict).not.toBe("FINAL");
    expect(clipDecision({ scores: [8, 8], bad: 0, wrong: false, issues: [], expected: 3 }).verdict).not.toBe("FINAL");
    expect(clipDecision({ scores: [9, 9, 9], bad: 0, wrong: true, issues: [], expected: 3 })).toMatchObject({ verdict: "REJECTED", fatal: true });
  });
  it("3 images réellement contrôlées, aucune mauvaise, moyenne ≥ 7 : FINAL", () => {
    expect(clipDecision({ scores: [7, 7.5, 8], bad: 0, wrong: false, issues: [], expected: 3 }).verdict).toBe("FINAL");
    expect(clipDecision({ scores: [6, 7, 7], bad: 0, wrong: false, issues: ["un peu flou"], expected: 3 }).verdict).not.toBe("FINAL");
  });
});
