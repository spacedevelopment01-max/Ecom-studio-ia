/**
 * LE MODÈLE VIDÉO PAR DÉFAUT ET LE PRIX D'UNE VIDÉO (23 novembre 2026, « le moins cher qui suffit par défaut ») :
 *  - par défaut, Veo 3.1 Lite par Vertex, sans son ; Veo 3.0 n'est plus jamais pris, ni par défaut ni en secours ; les
 *    vidéos de l'API Gemini ne sont plus accordées ; un modèle accordé réglé dans l'administration reste respecté ;
 *  - sans clé Vertex : le plan sûr (vrai produit détouré, caméra au montage) remplace le plan animé, dit en clair, et le
 *    devis ne compte aucun plan animé ;
 *  - un modèle de 6 s compte 6 s (plus arrondi à 8) ;
 *  - l'image de départ entre au prix probable dans le prix, sa borne haute seulement dans « au plus » ;
 *  - l'image de départ et chaque plan sont relus par le modèle le plus fort, au niveau élevé.
 * Essais simulés : aucune clé réelle, `fetch` remplacé, aucun appel.
 */
vi.mock("@/lib/public-download", () => import("./public-download-double"));
import { beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
const keys = vi.hoisted(() => ({ off: new Set<string>() }));
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<any>()), activeProviderKey: (p: string) => (keys.off.has(p) ? null : "TEST NO REAL PROVIDER") }));
import { createUser } from "@/lib/auth";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import { getJsonSetting, setJsonSetting, setSetting } from "@/lib/settings";
import { loadProject } from "@/lib/projects";
import { MEDIA_MODELS, mediaModel, DEFAULT_VIDEO_MODEL } from "@/lib/ai/media-models";
import { mediaRouteFor, aiPostMaxMicro } from "@/lib/ai/media-providers";
import { rankMedia, usageNeed } from "@/lib/ai/media-routing";
import { DEFAULT_ROUTES, usdToEur } from "@/lib/ai/config";
import { aiPostImageProbableMicro, estimateTaskMicro, strongReviewMicro } from "@/lib/ai/estimate";
import { routeLlm } from "@/lib/ai/llm";
import { sceneGenerationRoute } from "@/lib/video-v2/scene-generation";
import { devisVideoGuidee } from "@/lib/video-v2/guided-quote";
import { runThreeScenes, planSurPhrase, sceneTiming, type ScenePlan } from "@/lib/video-v2/three-scenes";
import { approveVideoScenario, sceneApprovalRequest } from "@/lib/video-v2/approval";
import { videoShotReviewRequest, VIDEO_REVIEW_MODEL, VIDEO_REVIEW_UNITS } from "@/lib/video-v2/shot-review-request";
import { PHOTO_REVIEW_MODEL } from "@/lib/syna-agent/custom-theme/gallery";
import { TEXT_MODEL_BY_TIER } from "@/lib/orchestrator/policy";
import { MODELES_VIDEOS, modeleVideo, reglagesDuModele } from "@/lib/atelier/modeles-videos";
import { prixModeleVideo } from "@/lib/atelier/service";
import { seedCutout, seedImageFixture } from "./image-v2-fixtures";

const VEO_LITE = "vertex:veo-3.1-lite-generate-001";
const usage = (u: string, v: Record<string, unknown>) => setJsonSetting("ai.media.usage", { ...getJsonSetting<Record<string, unknown>>("ai.media.usage", {}), [u]: v });

beforeEach(() => {
  keys.off.clear();
  vi.stubGlobal("fetch", vi.fn(() => { throw Error("HTTP provider forbidden"); }));
  setJsonSetting("billing.markup", 1);
  setJsonSetting("ai.routes", {});
  setJsonSetting("ai.media.usage", {});
  setJsonSetting("ai.media.mode", {});
  setJsonSetting("ai.media.backup", {});
  setJsonSetting("ai.media.models", Object.fromEntries(MEDIA_MODELS.map((m) => [`${m.provider}:${m.model}`, { enabled: true, confirmedAt: Date.now() }])));
  setSetting("ai.prices.checkedAt", String(Date.now()));
});

async function projet() {
  const u = await createUser(`video-defaut-${crypto.randomUUID()}@example.invalid`, "synthetic-test-only", "Test");
  const pid = seedImageFixture(u.id, "cosmetic");
  grantProjectPlan(pid, "dominer");
  await seedCutout(u.id, pid);
  return loadProject(pid);
}
const devisDuModele = (p: ReturnType<typeof loadProject>, id: string) => {
  const m = modeleVideo(id)!;
  return devisVideoGuidee(p, { ...reglagesDuModele(m), subject: null, request: m.scene });
};

describe("le modèle vidéo par défaut", () => {
  it("par défaut : Veo 3.1 Lite par Vertex, sans son", () => {
    expect(`${DEFAULT_VIDEO_MODEL.provider}:${DEFAULT_VIDEO_MODEL.model}`).toBe(VEO_LITE);
    expect(mediaModel("vertex", "veo-3.1-lite-generate-001")).toMatchObject({ defaultFor: "primary", caps: { audio: false } });
    expect(`${DEFAULT_ROUTES.video_generation.provider}:${DEFAULT_ROUTES.video_generation.model}`).toBe(VEO_LITE);
    const r = mediaRouteFor("product_video", { imageToVideo: true, people: false });
    expect(r && `${r.provider}:${r.model}`).toBe(VEO_LITE);
    const s = sceneGenerationRoute("staged", 8, "9:16");
    expect(s.allowed && `${s.provider}:${s.model}`).toBe(VEO_LITE);
  });

  it("Veo 3.0 n'est jamais pris : ni par défaut, ni en secours, ni en automatique, ni réglé à la main", () => {
    const veo3 = mediaModel("google", "veo-3.0-generate-001")!;
    expect(veo3.defaultFor).toBeUndefined();
    expect(veo3.legacyDefault).toBeUndefined();
    // Seule la clé Google : aucun modèle vidéo (jamais l'ancien repli vers Veo 3.0).
    for (const p of ["vertex", "kling", "byteplus", "runware", "fal", "alibaba", "openai", "bfl"]) keys.off.add(p);
    expect(mediaRouteFor("product_video", { imageToVideo: true, people: false })).toBeNull();
    expect(mediaRouteFor("ugc_video", { people: true })).toBeNull();
    keys.off.clear();
    // Réglages qui choisissent une vidéo de l'API Gemini : ignorés (retour au défaut), jamais appelés.
    setJsonSetting("ai.routes", { video_generation: { provider: "google", model: "veo-3.0-generate-001" } });
    usage("product_video", { primary: "google:veo-3.0-generate-001", backup: "google:veo-3.0-fast-generate-001" });
    setJsonSetting("ai.media.backup", { video: "google:veo-3.0-generate-001" });
    const r = mediaRouteFor("product_video", { imageToVideo: true, people: false });
    expect(r && `${r.provider}:${r.model}`).toBe(VEO_LITE);
    keys.off.add("vertex");
    expect(mediaRouteFor("product_video", { imageToVideo: true, people: false })?.provider ?? null).not.toBe("google");
    // Mode automatique : les vidéos de l'API Gemini sont écartées.
    const ranked = rankMedia(usageNeed("product_video", { imageToVideo: true, people: false }));
    expect(ranked.filter((x) => x.model.provider === "google").every((x) => x.excluded)).toBe(true);
    expect(ranked.find((x) => !x.excluded)?.model.provider).not.toBe("google");
  });

  it("un modèle accordé réglé dans l'administration reste respecté", () => {
    usage("product_video", { primary: "kling:kling-4.0" });
    const r = mediaRouteFor("product_video", { imageToVideo: true, people: false });
    expect(r && `${r.provider}:${r.model}`).toBe("kling:kling-4.0");
  });
});

describe("le prix d'une vidéo", () => {
  it("6 s comptées 6 s avec Veo 3.1 Lite (plus arrondies à 8) ; un modèle de 5 s compte la durée la plus courte qui le couvre", async () => {
    const p = await projet();
    const offre = reglagesDuModele(modeleVideo("offre")!);
    expect(offre.totalS).toBe(6);
    expect(sceneTiming(offre.scenes, offre.totalS).clipS).toBe(6);
    const s = sceneGenerationRoute("staged", 6, "9:16");
    expect(s.allowed && s.seconds).toBe(6);
    expect(s.allowed && s.unitMicro).toBe(Math.round(6 * 0.03 * usdToEur() * 1e6));
    const q = devisDuModele(p, "cadeau");
    expect(q.generatedSeconds).toBe(8);
    // « Le produit qui tourne » (5 s) : la vidéo guidée dure au moins 6 s ; Veo 3.1 Lite fait 4, 6 ou 8 s → 6 s.
    expect(reglagesDuModele(modeleVideo("tourne")!).totalS).toBe(6);
    const tourne = devisDuModele(p, "tourne");
    expect(tourne.generatedSeconds).toBe(6);
    expect(tourne.steps.find((x) => x.id === "clips")!.unit).toMatch(/^6 generated seconds/);
  });

  it("l'image de départ au prix probable dans le prix ; sa borne haute seulement dans « au plus »", async () => {
    const p = await projet();
    const q = devisDuModele(p, "cadeau");
    expect(q.allowed).toBe(true);
    const images = q.steps.find((x) => x.id === "reference_images")!;
    const probable = aiPostImageProbableMicro(), borne = aiPostMaxMicro(1, true)!;
    expect(probable).toBeGreaterThan(0);
    expect(probable).toBeLessThan(borne);
    expect(images.count).toBe(1);
    expect(images.unitMicro).toBe(probable);
    expect(q.estimateMicro).toBe(q.steps.reduce((s, x) => s + x.totalMicro, 0));
    // La borne haute compte la réservation de l'image (et une scène refaite), jamais le prix probable.
    expect(q.capMicro).toBeGreaterThanOrEqual(q.estimateMicro - probable + borne);
  });

  it("relecture de l'image de départ et de chaque plan : le modèle le plus fort, au niveau élevé", async () => {
    const p = await projet();
    expect(VIDEO_REVIEW_MODEL).toEqual(PHOTO_REVIEW_MODEL);
    expect(VIDEO_REVIEW_MODEL).toEqual({ provider: "anthropic", model: TEXT_MODEL_BY_TIER.strong, effort: "high" });
    const call = videoShotReviewRequest(p, { userId: p.userId, projectId: p.id, jobId: null, usageKey: "essai" }, [{ data: Buffer.from("x") }], "plan");
    expect(call.routing?.prefer).toEqual(PHOTO_REVIEW_MODEL);
    expect(routeLlm(call)).toMatchObject({ provider: "anthropic", model: TEXT_MODEL_BY_TIER.strong, effort: "high" });
    const q = devisDuModele(p, "cadeau");
    const imageQc = q.steps.find((x) => x.id === "image_checks")!, clipQc = q.steps.find((x) => x.id === "clip_checks")!;
    expect(imageQc.unitMicro).toBe(strongReviewMicro(VIDEO_REVIEW_UNITS.image));
    expect(clipQc.unitMicro).toBe(strongReviewMicro(VIDEO_REVIEW_UNITS.clip));
    // Plus cher que l'ancienne relecture (Sonnet au niveau faible), aux mêmes jetons.
    expect(clipQc.unitMicro).toBeGreaterThan(estimateTaskMicro("quality_control", VIDEO_REVIEW_UNITS.clip));
    expect(q.routes.review).toEqual(VIDEO_REVIEW_MODEL);
  });

  it("sans clé Vertex : le plan sûr remplace le plan animé, dit en clair, et aucun plan animé n'est compté", async () => {
    const p = await projet();
    keys.off.add("vertex");
    const q = devisDuModele(p, "cadeau");
    expect(q.allowed).toBe(true);
    expect(q.safePlan).toBe(true);
    expect(q.planSur).toBe(planSurPhrase());
    for (const id of ["reference_images", "image_checks", "clips", "clip_checks"]) expect(q.steps.find((x) => x.id === id)!.totalMicro, id).toBe(0);
    expect(q.generatedSeconds).toBe(0);
    expect(q.routes.clip).toBeNull();
    expect(q.estimateMicro).toBe(q.scriptMicro + (q.steps.find((x) => x.id === "voice")?.totalMicro ?? 0));
    // L'atelier dit la même phrase sous le prix du modèle.
    expect(prixModeleVideo(p.userId, p, modeleVideo("cadeau")!)).toMatchObject({ planSur: planSurPhrase(), raison: null });
    for (const m of MODELES_VIDEOS.filter((x) => !x.sansIa)) expect(devisDuModele(p, m.id).safePlan, m.id).toBe(true);
  });

  it("une durée trop longue pour le modèle n'est jamais remplacée par le plan sûr : sa raison est dite", async () => {
    const p = await projet();
    const q = devisVideoGuidee(p, { as: "post", generation: "staged", aspect: "9:16", scenes: 1, totalS: 15, music: true, subject: null });
    expect(q.safePlan).toBe(false);
    expect(q.allowed).toBe(false);
    expect(q.reason).toMatch(/Durée de scène/);
  });

  it("sans clé Vertex : la vidéo se monte en plans sûrs, sans image ni plan créés par l'IA", async () => {
    const p = await projet();
    const calls = { keyframe: 0, clip: 0 };
    let rendered: any = null;
    const png = await sharp({ create: { width: 90, height: 160, channels: 3, background: "#224466" } }).png().toBuffer();
    keys.off.add("vertex");
    const req = { ...reglagesDuModele(modeleVideo("cadeau")!), music: false, subject: null, request: modeleVideo("cadeau")!.scene };
    const plan: ScenePlan = { scenes: [{ still: "Le produit emballé, un ruban, une carte blanche.", motion: "La caméra avance lentement.", title: "" }], line: "", cta: "" };
    await runThreeScenes(null, p.id, { ...req, approval: approveVideoScenario(p, sceneApprovalRequest(req), plan, 1_000_000).approval }, {
      animated: () => false,
      keyframe: async () => (calls.keyframe++, png),
      clip: async () => { calls.clip++; throw Error("aucun plan animé"); },
      stock: async () => null,
      spentMicro: () => 0,
      render: async (_p, _k, doc) => ((rendered = doc), "video-1"),
    });
    expect(calls).toEqual({ keyframe: 0, clip: 0 });
    const first = rendered.clips[0];
    expect(first.source.kind).toBe("doc");
    expect(first.source.camera).toBe("push_in");
    expect(first.source.doc.layers.some((l: any) => l.role === "product" && l.contactShadow)).toBe(true);
  });
});
