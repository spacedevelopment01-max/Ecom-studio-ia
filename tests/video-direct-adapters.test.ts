/**
 * Rapport 09, point 4 : adaptateurs vidéo en direct (Vertex, Kling, BytePlus) et Runware en secours. Faux réseau
 * seulement : aucun appel payant, aucune clé réelle (« fixture-…-not-secret »).
 */
import { it, expect, vi, afterEach, beforeEach, describe } from "vitest";
vi.mock("@/lib/public-download", () => import("./public-download-double"));
import sharp from "sharp";
import { createUser } from "@/lib/auth";
import { seedImageFixture } from "./image-v2-fixtures";
import { grantProjectPlan } from "./communication-choice-fixture";
import { one, run, all } from "@/lib/db";
import { setSetting, setJsonSetting } from "@/lib/settings";
import { runForUser } from "@/lib/ai/access";
import { directClip, mediaPoll, directBilledSeconds } from "@/lib/ai/media-providers";
import { byteplusStart, directRead, hashedEndUser, klingStart, runwareStart, vertexStart, vertexUrl, klingRead, byteplusRead, runwareRead, vertexRead } from "@/lib/ai/video-direct";
import { activeProviderKey } from "@/lib/ai/config";
import { mediaModel } from "@/lib/ai/media-models";
import { chooseProvider } from "@/lib/video-v2/providers";
import { alibabaBase, frankfurtBase } from "@/lib/ai/alibaba";

const keys = ["provider.vertex.apiKey", "provider.kling.apiKey", "provider.byteplus.apiKey", "provider.runware.apiKey", "provider.vertex.project", "provider.alibaba.region", "provider.alibaba.workspace", "provider.alibaba.endpoint", "ai.media.usage", "ai.media.models", "ai.prices"];
let previous: any[] = [], poll: number;
beforeEach(() => { previous = keys.map((k) => one("SELECT * FROM settings WHERE key=?", k)); poll = mediaPoll.directMs; mediaPoll.directMs = 1; });
afterEach(() => { vi.unstubAllGlobals(); mediaPoll.directMs = poll; keys.forEach((key, k) => { const r = previous[k]; if (r) run("INSERT INTO settings(key,value,secret,updated_at) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,secret=excluded.secret,updated_at=excluded.updated_at", r.key, r.value, r.secret, r.updated_at); else run("DELETE FROM settings WHERE key=?", key); }); });

const base = { model: "m", prompt: "Le flacon sur la table.", image: "AAAA", lastImage: "BBBB", aspect: "9:16" as const, seconds: 5, people: false };

describe("corps des demandes (documentation lue le 22 novembre 2026)", () => {
  it("Vertex : identifiants -001, durée toujours envoyée, personnes interdites sans accord, son coupé", () => {
    const r = vertexStart({ ...base, model: "veo-3.1-lite-generate-001", seconds: 6 }, "k", null) as any;
    expect(r.url).toBe("https://aiplatform.googleapis.com/v1/publishers/google/models/veo-3.1-lite-generate-001:predictLongRunning");
    expect(r.body.parameters).toMatchObject({ durationSeconds: 6, personGeneration: "disallow", generateAudio: false, aspectRatio: "9:16" });
    expect(r.body.instances[0].lastFrame).toEqual({ bytesBase64Encoded: "BBBB", mimeType: "image/jpeg" });
    expect(vertexUrl("veo-3.1-fast-generate-001", "mon-projet", "fetchPredictOperation")).toBe("https://us-central1-aiplatform.googleapis.com/v1/projects/mon-projet/locations/us-central1/publishers/google/models/veo-3.1-fast-generate-001:fetchPredictOperation");
    expect(vertexRead({ done: true, response: { videos: [{ bytesBase64Encoded: "Zm9v" }] } })).toMatchObject({ state: "done", videoBase64: "Zm9v" });
    expect(vertexRead({ done: false })).toEqual({ state: "running" });
  });
  it("Kling : la durée part toujours (sinon 10 s facturées), sans filigrane, image de fin sauf pour Flash", () => {
    const r = klingStart({ ...base, model: "kling-4.0", seconds: 4.2 }, "k") as any;
    expect(r.url).toBe("https://api-singapore.klingai.com/image-to-video/kling-4.0");
    expect(r.body.settings.duration).toBe(4);
    expect(r.body.options.watermark_info.enabled).toBe(false);
    expect(r.body.contents.map((c: any) => c.type)).toEqual(["prompt", "first_frame", "last_frame"]);
    expect((klingStart({ ...base, model: "kling-4.0-flash" }, "k") as any).body.contents.map((c: any) => c.type)).toEqual(["prompt", "first_frame"]);
    expect(klingRead({ code: 0, data: [{ status: "succeeded", outputs: [{ type: "video", url: "https://x/v.mp4" }] }] })).toMatchObject({ state: "done", videoUrl: "https://x/v.mp4" });
  });
  it("BytePlus : identifiant haché du client, son et filigrane coupés, brouillon seulement pour Seedance 2.5", () => {
    const end = hashedEndUser("utilisateur-1");
    expect(end).toMatch(/^[0-9a-f]{32}$/);
    expect(end).not.toContain("utilisateur");
    const r = byteplusStart({ ...base, model: "dreamina-seedance-2-0-mini-260615", endUser: end, draft: true }, "k") as any;
    expect(r.body).toMatchObject({ safety_identifier: end, generate_audio: false, watermark: false, duration: 5, resolution: "720p", return_last_frame: true });
    expect(r.body.draft).toBeUndefined();
    expect(r.body.content.map((c: any) => c.role ?? c.type)).toEqual(["text", "first_frame", "last_frame"]);
    const d = byteplusStart({ ...base, model: "dreamina-seedance-2-5-260628", draft: true }, "k") as any;
    expect(d.body).toMatchObject({ draft: true, resolution: "480p" });
    const f = byteplusStart({ ...base, model: "dreamina-seedance-2-5-260628", fromDraftTaskId: "t-1" }, "k") as any;
    expect(f.body.content).toEqual([{ type: "draft_task", draft_task: { id: "t-1" } }]);
    expect(byteplusRead({ status: "succeeded", content: { video_url: "https://x/v.mp4" } })).toMatchObject({ state: "done" });
    expect(byteplusRead({ status: "failed", error: { message: "modération" } })).toEqual({ state: "failed", message: "modération" });
  });
  it("Runware : tâche asynchrone avec coût exact ; personnes interdites pour Veo", () => {
    const r = runwareStart({ ...base, model: "google:veo@3.1-lite", seconds: 4 }, "k", "uuid-1") as any;
    expect(r.body[0]).toMatchObject({ taskType: "videoInference", taskUUID: "uuid-1", deliveryMethod: "async", includeCost: true, duration: 4, providerSettings: { google: { personGeneration: "disallow", generateAudio: false } } });
    expect(r.body[0].inputs.frameImages.map((f: any) => f.frame)).toEqual(["first", "last"]);
    expect(runwareRead({ data: [{ taskUUID: "uuid-1", videoURL: "https://x/v.mp4", cost: 0.12 }] })).toMatchObject({ state: "done", costUsd: 0.12 });
    expect(directRead("runware", { data: [] })).toEqual({ state: "running" });
  });
});

it("sans clé saisie, aucun fabricant en direct n'est choisi : le moteur garde ce qui marche aujourd'hui", () => {
  for (const p of ["vertex", "kling", "byteplus", "runware"] as const) { setSetting(`provider.${p}.apiKey`, null); expect(activeProviderKey(p)).toBeNull(); }
  const c = chooseProvider({ imageToVideo: true, people: false, nativeAudio: false, aspect: "9:16", durationS: 5 }, { available: (p) => !!activeProviderKey(p as never) });
  expect(["vertex", "kling", "byteplus", "runware"]).not.toContain(c?.provider);
  // Aucun de ces modèles n'est proposé pour une personne.
  expect(mediaModel("kling", "kling-4.0")?.caps.people).toBe(false);
  expect(mediaModel("kling", "kling-4.0")?.adminConfirm).toBe(true);
  expect(directBilledSeconds("vertex", "veo-3.1-lite-generate-001", 5)).toBe(6);
});

it("Alibaba à Francfort : adresse de l'espace de travail, sinon Singapour avec un avertissement", () => {
  expect(frankfurtBase("ws-123")).toBe("https://ws-123.eu-central-1.maas.aliyuncs.com/api/v1");
  setSetting("provider.alibaba.endpoint", null);
  setSetting("provider.alibaba.region", "eu");
  setSetting("provider.alibaba.workspace", null);
  expect(alibabaBase().problem).toMatch(/Francfort/);
  setSetting("provider.alibaba.workspace", "ws-123");
  expect(alibabaBase()).toEqual({ base: "https://ws-123.eu-central-1.maas.aliyuncs.com/api/v1", problem: null });
});

it.each([
  ["kling", "kling-4.0", 0.157],
  ["byteplus", "dreamina-seedance-2-0-mini-260615", 0.08],
  ["runware", "alibaba:wan@2.6-flash", 0.025],
] as const)("%s : réservation avant l'envoi, une seule tâche même en reprise, coût enregistré, vidéo copiée", async (provider, model, perSecond) => {
  const u = await createUser(`direct-${crypto.randomUUID()}@test.invalid`, "motdepasse-test", "Fixture"), projectId = seedImageFixture(u.id, "hightech");
  grantProjectPlan(projectId, "dominer");
  setSetting(`provider.${provider}.apiKey`, `fixture-${provider}-not-secret`);
  setJsonSetting("ai.media.usage", { product_video: { mode: "manual", primary: `${provider}:${model}`, backup: null } });
  setJsonSetting("ai.media.models", { [`${provider}:${model}`]: { confirmedAt: Date.now(), enabled: true } });
  setJsonSetting("ai.prices", { [`${provider}:${model}`]: { unit: "video_second", perSecond } });
  const image = await sharp({ create: { width: 64, height: 96, channels: 3, background: "#41392a" } }).jpeg().toBuffer();
  const posted: any[] = [];
  let polls = 0;
  const fetch = vi.fn(async (input: any, init: any) => {
    const url = String(input);
    if (url === "https://fixture.invalid/clip.mp4") return new Response(Buffer.from("SIMULATED CLIP BYTES"));
    const body = init?.body ? JSON.parse(init.body) : null;
    const isStart = provider === "runware" ? body?.[0]?.taskType === "videoInference" : init?.method === "POST";
    if (isStart) {
      expect(one<any>("SELECT status FROM ai_reservations WHERE project_id=?", projectId)?.status).toBe("held");
      posted.push(body);
      return provider === "kling" ? Response.json({ code: 0, data: { id: "k-1", status: "submitted" } }) : provider === "byteplus" ? Response.json({ id: "b-1" }) : Response.json({ data: [{ taskType: "videoInference", taskUUID: body[0].taskUUID }] });
    }
    polls++;
    if (polls === 1) return provider === "kling" ? Response.json({ code: 0, data: [{ status: "processing" }] }) : provider === "byteplus" ? Response.json({ id: "b-1", status: "running" }) : Response.json({ data: [] });
    return provider === "kling" ? Response.json({ code: 0, data: [{ status: "succeeded", outputs: [{ type: "video", url: "https://fixture.invalid/clip.mp4" }] }] }) : provider === "byteplus" ? Response.json({ id: "b-1", status: "succeeded", content: { video_url: "https://fixture.invalid/clip.mp4" } }) : Response.json({ data: [{ taskUUID: "x", videoURL: "https://fixture.invalid/clip.mp4", cost: 0.11 }] });
  });
  vi.stubGlobal("fetch", fetch);
  const ctx = { userId: u.id, projectId, usageKey: `direct-${provider}` };
  const go = () => runForUser(u.id, () => directClip(ctx, { provider, image, prompt: "Le flacon posé sur le bois.", aspect: "9:16", seconds: 5, model, usage: "product_video" }), "normal", projectId);
  const first = await go();
  const second = await go();
  expect(second).toEqual(first);
  expect(posted).toHaveLength(1);
  expect(all<any>("SELECT * FROM usage_events WHERE project_id=?", projectId)).toHaveLength(1);
  const call = all<any>("SELECT * FROM ai_calls WHERE project_id=?", projectId)[0];
  expect(call).toMatchObject({ provider, requested_model: model, status: "ok" });
  // Runware renvoie le coût exact : il est pris tel quel ; les autres sont estimés au tarif de l'administration.
  expect(call.estimated).toBe(provider === "runware" ? 0 : 1);
});

it("un refus du fabricant n'est pas facturé : la réservation est rendue", async () => {
  const u = await createUser(`direct-refus-${crypto.randomUUID()}@test.invalid`, "motdepasse-test", "Fixture"), projectId = seedImageFixture(u.id, "hightech");
  grantProjectPlan(projectId, "dominer");
  setSetting("provider.kling.apiKey", "fixture-kling-not-secret");
  setJsonSetting("ai.media.models", { "kling:kling-4.0": { confirmedAt: Date.now(), enabled: true } });
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ code: 1201, message: "invalid image" }), { status: 400 })));
  const image = await sharp({ create: { width: 64, height: 96, channels: 3, background: "#41392a" } }).jpeg().toBuffer();
  await expect(runForUser(u.id, () => directClip({ userId: u.id, projectId, usageKey: "refus" }, { provider: "kling", image, prompt: "x", aspect: "9:16", seconds: 5, model: "kling-4.0" }), "normal", projectId)).rejects.toThrow(/refusé/);
  expect(all<any>("SELECT * FROM usage_events WHERE project_id=?", projectId)).toHaveLength(0);
  expect(one<any>("SELECT status FROM ai_reservations WHERE project_id=?", projectId)?.status).toBe("released");
});

it("rapport 09, point 10 : un plan payé puis refusé au contrôle est rendu au client et passe à la charge du Studio", async () => {
  const { rendreAuClient } = await import("@/lib/billing");
  const { accountKeyFor } = await import("@/lib/project-billing");
  const u = await createUser(`direct-rendu-${crypto.randomUUID()}@test.invalid`, "motdepasse-test", "Fixture"), projectId = seedImageFixture(u.id, "hightech");
  grantProjectPlan(projectId, "dominer");
  setSetting("provider.kling.apiKey", "fixture-kling-not-secret");
  setJsonSetting("ai.media.models", { "kling:kling-4.0": { confirmedAt: Date.now(), enabled: true } });
  vi.stubGlobal("fetch", vi.fn(async (input: any, init: any) => String(input).includes("fixture.invalid") ? new Response(Buffer.from("CLIP")) : init?.method === "POST" ? Response.json({ code: 0, data: { id: "k-9" } }) : Response.json({ code: 0, data: [{ status: "succeeded", outputs: [{ type: "video", url: "https://fixture.invalid/clip.mp4" }] }] })));
  const image = await sharp({ create: { width: 64, height: 96, channels: 3, background: "#41392a" } }).jpeg().toBuffer();
  await runForUser(u.id, () => directClip({ userId: u.id, projectId, usageKey: "plan-refuse" }, { provider: "kling", image, prompt: "x", aspect: "9:16", seconds: 5, model: "kling-4.0" }), "normal", projectId);
  const key = accountKeyFor(u.id, projectId);
  const used = () => one<any>("SELECT monthly_used FROM wallets WHERE user_id=?", key)!.monthly_used as number;
  const before = used();
  expect(before).toBeGreaterThan(0);
  const rendu = rendreAuClient(u.id, { task: "video_generation", projectId, usageKey: "plan-refuse" }, "plan refusé");
  expect(rendu).toBe(before);
  expect(used()).toBe(0);
  expect(one<any>("SELECT studio FROM ai_reservations WHERE project_id=?", projectId)!.studio).toBe(1);
  // Une seconde fois : rien de plus (jamais rendu deux fois).
  expect(rendreAuClient(u.id, { task: "video_generation", projectId, usageKey: "plan-refuse" }, "plan refusé")).toBe(0);
  expect(all<any>("SELECT type FROM ledger WHERE user_id=? AND type IN ('refund','studio')", key).map((r) => r.type).sort()).toEqual(["refund", "studio"]);
});

it("rapport 09, point 6 : brouillon Seedance 2.5 en 480p, puis version finale tirée du brouillon validé", async () => {
  const { directDraftTask } = await import("@/lib/ai/media-providers");
  const u = await createUser(`direct-draft-${crypto.randomUUID()}@test.invalid`, "motdepasse-test", "Fixture"), projectId = seedImageFixture(u.id, "hightech");
  grantProjectPlan(projectId, "dominer");
  const model = "dreamina-seedance-2-5-260628";
  setSetting("provider.byteplus.apiKey", "fixture-byteplus-not-secret");
  setJsonSetting("ai.media.models", { [`byteplus:${model}`]: { confirmedAt: Date.now(), enabled: true } });
  const posted: any[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: any, init: any) => {
    if (String(input).includes("fixture.invalid")) return new Response(Buffer.from("CLIP"));
    if (init?.method === "POST") { posted.push(JSON.parse(init.body)); return Response.json({ id: `t-${posted.length}` }); }
    return Response.json({ status: "succeeded", content: { video_url: "https://fixture.invalid/clip.mp4" } });
  }));
  const image = await sharp({ create: { width: 64, height: 96, channels: 3, background: "#41392a" } }).jpeg().toBuffer();
  const go = (usageKey: string, extra: Record<string, unknown>) => runForUser(u.id, () => directClip({ userId: u.id, projectId, usageKey }, { provider: "byteplus", image, prompt: "x", aspect: "9:16", seconds: 5, model, ...extra }), "normal", projectId);
  await go("brouillon", { draft: true });
  expect(posted[0]).toMatchObject({ draft: true, resolution: "480p" });
  const draftId = directDraftTask(u.id, projectId, "brouillon");
  expect(draftId).toBe("t-1");
  await go("finale", { fromDraftTaskId: draftId });
  expect(posted[1].content).toEqual([{ type: "draft_task", draft_task: { id: "t-1" } }]);
  expect(posted[1].draft).toBeUndefined();
});
