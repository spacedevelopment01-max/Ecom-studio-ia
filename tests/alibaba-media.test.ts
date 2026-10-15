/**
 * Alibaba Cloud Model Studio — Qwen-Image (images) et Wan (vidéos), fournisseur SIMULÉ : aucun appel réel, aucune
 * dépense. Vérifie : modèles verrouillés tant qu'ils ne sont pas confirmés et tarifés, adresse par région, requêtes
 * (taille, sans filigrane, sans personne inventée), réservation puis facturation, refus sans coût et relais vers le
 * secours, tâche vidéo asynchrone suivie puis récupérée, reprise sans nouvelle tâche après redémarrage, vidéo payée
 * récupérée sans repayer, échec non facturé, test de clé sans génération, messages d'erreur sans la clé.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const fs = process.getBuiltinModule("node:fs");
  const os = process.getBuiltinModule("node:os");
  const p = process.getBuiltinModule("node:path");
  process.env.DATA_DIR = fs.mkdtempSync(p.join(os.tmpdir(), "ecs-alibaba-"));
});

let keys: Record<string, string | null> = {};
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => keys[p] ?? null }));

const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const mp4 = Buffer.from("00000018667479706d703432", "hex");
const net = { calls: [] as { url: string; body: any; headers: Record<string, string> }[], image: "ok" as "ok" | "401" | "inspect" | "500", video: "ok" as "ok" | "failed", polls: 0, downloadDown: false };

async function fakeFetch(url: string, init?: RequestInit): Promise<Response> {
  const body = init?.body ? JSON.parse(String(init.body)) : null;
  net.calls.push({ url, body, headers: (init?.headers ?? {}) as Record<string, string> });
  const json = (j: unknown, status = 200) => new Response(JSON.stringify(j), { status });
  if (url.includes("/services/aigc/multimodal-generation/generation")) {
    if (net.image === "401") return json({ code: "InvalidApiKey", message: "Invalid API-key provided: sk-abcdefghijkl" }, 401);
    if (net.image === "inspect") return json({ code: "DataInspectionFailed", message: "Input data may contain inappropriate content." }, 400);
    if (net.image === "500") return json({ code: "InternalError", message: "oops" }, 500);
    return json({ output: { choices: [{ message: { content: [{ image: "https://result.test/qwen.png" }] } }] } });
  }
  if (url.includes("/services/aigc/video-generation/video-synthesis")) return json({ output: { task_id: "task-123", task_status: "PENDING" } });
  if (url.includes("/tasks/task-123")) {
    net.polls++;
    if (net.video === "failed") return json({ output: { task_id: "task-123", task_status: "FAILED", message: "content blocked" } });
    return json({ output: { task_id: "task-123", task_status: net.polls < 2 ? "RUNNING" : "SUCCEEDED", video_url: "https://result.test/wan.mp4" } });
  }
  if (url.includes("/models?page_no=1")) return json({ data: [] });
  if (url === "https://result.test/wan.mp4") return net.downloadDown ? new Response("x", { status: 503 }) : new Response(mp4);
  if (url.startsWith("https://result.test/")) return new Response(Buffer.from(PNG, "base64"));
  if (url.includes(":generateContent")) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: PNG } }] } }] }));
  return json({}, 404);
}

describe("Alibaba Cloud — Qwen-Image et Wan", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, run } = await import("@/lib/db");
  const billing = await import("@/lib/billing");
  const { setSetting, setJsonSetting, getJsonSetting, getSetting } = await import("@/lib/settings");
  const { runWithLang } = await import("@/lib/i18n-server");
  const mp = await import("@/lib/ai/media-providers");
  const routing = await import("@/lib/ai/media-routing");
  const { MEDIA_MODELS, mediaModel } = await import("@/lib/ai/media-models");
  const ali = await import("@/lib/ai/alibaba");
  const { alibabaReadiness } = await import("@/lib/ai/media-routing-admin");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const png = Buffer.from(PNG, "base64");
  mp.mediaPoll.wanMs = 1;

  async function client() {
    const u = await createUser(`ali${Date.now()}${Math.random().toString(36).slice(2, 7)}@test.fr`, "motdepasse-test", "A");
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    billing.getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'active', plan = 'dominer' WHERE user_id = ?", u.id);
    billing.alignPeriod(u.id, Date.now());
    billing.syncAllowance(u.id);
    const pid = `p-${u.id}`;
    run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", pid, u.id, "Test", Date.now(), Date.now());
    return { userId: u.id, projectId: pid };
  }
  const ctx = (c: { userId: string; projectId: string }, key = `k-${Math.random()}`) => ({ ...c, usageKey: key });
  const reservations = (uid: string) => all<{ status: string; provider: string; model: string }>("SELECT status, provider, model FROM ai_reservations WHERE user_id = ? ORDER BY created_at, rowid", uid);
  const billed = (uid: string) => all<{ provider: string; requested_model: string; quantity: number }>("SELECT provider, requested_model, quantity FROM ai_calls WHERE user_id = ? AND status = 'ok' ORDER BY created_at, rowid", uid);
  const confirmModel = (key: string, price: unknown) => {
    setJsonSetting("ai.prices", { ...getJsonSetting<Record<string, unknown>>("ai.prices", {}), [key]: price });
    setJsonSetting("ai.media.models", { ...getJsonSetting<Record<string, unknown>>("ai.media.models", {}), [key]: { confirmedAt: Date.now(), enabled: true } });
  };

  beforeEach(() => {
    keys = { openai: "sk-openai-test-123456", google: "cle-google-test-123456", alibaba: "sk-alibaba-test-1234567890" };
    Object.assign(net, { calls: [], image: "ok", video: "ok", polls: 0, downloadDown: false });
    vi.stubGlobal("fetch", fakeFetch);
    setSetting("ai.prices.checkedAt", String(Date.now()));
    for (const k of ["ai.routes", "ai.media.backup", "ai.media.mode", "ai.media.models", "ai.prices", "ai.media.usage"]) setJsonSetting(k, {});
    for (const k of ["provider.alibaba.region", "provider.alibaba.endpoint", "provider.alibaba.workspace", "provider.alibaba.lastTest"]) setSetting(k, null);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("catalogue : Qwen-Image (images) et Wan (vidéos) ajoutés SANS retirer OpenAI, Gemini, fal.ai ; verrouillés tant que non confirmés et tarifés", () => {
    const ids = MEDIA_MODELS.filter((m) => m.provider === "alibaba");
    expect(ids.filter((m) => m.kind === "image").map((m) => m.model)).toEqual(expect.arrayContaining(["qwen-image-max", "qwen-image-plus", "qwen-image-edit-plus"]));
    expect(ids.filter((m) => m.kind === "video").map((m) => m.model)).toEqual(expect.arrayContaining(["wan2.6-i2v", "wan2.6-i2v-flash", "wan2.7-i2v", "wan3.0-video"]));
    expect(ids.every((m) => !m.verified.price && routing.mediaStatus(m).usable === false)).toBe(true);
    for (const p of ["openai", "google", "fal"]) expect(MEDIA_MODELS.some((m) => m.provider === p)).toBe(true);
    // Aucun modèle de texte Qwen : images et vidéos seulement.
    expect(ids.every((m) => m.kind === "image" || m.kind === "video")).toBe(true);
    // Un tarif saisi sans confirmation ne suffit pas.
    setJsonSetting("ai.prices", { "alibaba:qwen-image-max": { unit: "image", perImage: 0.075 } });
    expect(routing.mediaStatus(mediaModel("alibaba", "qwen-image-max")!).reasons.join(" ")).toMatch(/confirmer|confirm/);
  });

  it("adresses : région (Singapour par défaut, Virginie, Pékin), adresse personnalisée seulement sur un domaine Alibaba Cloud", () => {
    expect(ali.alibabaBase().base).toBe("https://dashscope-intl.aliyuncs.com/api/v1");
    setSetting("provider.alibaba.region", "us");
    expect(ali.alibabaBase().base).toBe("https://dashscope-us.aliyuncs.com/api/v1");
    setSetting("provider.alibaba.endpoint", "https://evil.example.com/api/v1");
    expect(ali.alibabaBase()).toMatchObject({ base: "https://dashscope-us.aliyuncs.com/api/v1", problem: expect.stringMatching(/invalide/) });
    setSetting("provider.alibaba.endpoint", "https://ws-1.ap-southeast-1.maas.aliyuncs.com");
    expect(ali.alibabaBase()).toEqual({ base: "https://ws-1.ap-southeast-1.maas.aliyuncs.com/api/v1", problem: null });
    expect(ali.ALIBABA_ENDPOINT_RE.test("http://dashscope.aliyuncs.com")).toBe(false);
  });

  it("image Qwen : principal choisi par l'administration → requête sans filigrane, à la bonne taille, sans personne ; coût réservé puis facturé", async () => {
    const c = await client();
    confirmModel("alibaba:qwen-image-max", { unit: "image", perImage: 0.075 });
    setSetting("provider.alibaba.workspace", "ws-test");
    setJsonSetting("ai.routes", { image_generation: { provider: "alibaba", model: "qwen-image-max" } });
    const img = await fr(() => mp.ambianceImage(ctx(c), { prompt: "atelier de céramique lumineux", aspect: "16:9" }));
    expect(img.length).toBeGreaterThan(10);
    const call = net.calls.find((x) => x.url.includes("multimodal-generation"))!;
    expect(call.url).toBe("https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation");
    expect(call.headers).toMatchObject({ Authorization: "Bearer sk-alibaba-test-1234567890", "X-DashScope-WorkSpace": "ws-test" });
    expect(call.body).toMatchObject({ model: "qwen-image-max", parameters: { n: 1, size: "1664*928", watermark: false, prompt_extend: false } });
    expect(call.body.parameters.negative_prompt).toMatch(/people.*face/);
    expect(JSON.stringify(call.body.input)).toMatch(/No people/);
    expect(reservations(c.userId)).toEqual([{ status: "settled", provider: "alibaba", model: "qwen-image-max" }]);
    expect(billed(c.userId)).toEqual([{ provider: "alibaba", requested_model: "qwen-image-max", quantity: 1 }]);
  });

  it("sans tarif ou sans confirmation : rien n'est envoyé chez Alibaba (jamais de coût non borné)", async () => {
    const c = await client();
    setJsonSetting("ai.routes", { image_generation: { provider: "alibaba", model: "qwen-image-max" } });
    setJsonSetting("ai.media.usage", { scene: { primary: "alibaba:qwen-image-max" } });
    await expect(fr(() => mp.ambianceImage(ctx(c), { prompt: "atelier", aspect: "1:1" }))).rejects.toThrow();
    expect(net.calls.some((x) => x.url.includes("aliyuncs.com"))).toBe(false);
    expect(reservations(c.userId)).toEqual([]);
  });

  it("refus d'Alibaba (clé, région, contrôle de contenu) : réservation rendue, secours compatible appelé, message sans la clé", async () => {
    const c = await client();
    confirmModel("alibaba:qwen-image-max", { unit: "image", perImage: 0.075 });
    setJsonSetting("ai.routes", { image_generation: { provider: "alibaba", model: "qwen-image-max" } });
    setJsonSetting("ai.media.backup", { image: "google:gemini-2.5-flash-image" });
    net.image = "401";
    await fr(() => mp.ambianceImage(ctx(c), { prompt: "atelier", aspect: "1:1" }));
    expect(reservations(c.userId).map((r) => `${r.provider}:${r.status}`)).toEqual(["alibaba:released", "google:settled"]);
    // Messages clairs, jamais la clé.
    expect(ali.alibabaError(401, JSON.stringify({ code: "InvalidApiKey", message: "Invalid API-key provided: sk-abcdefghijkl" })).message).toMatch(/RÉGION/);
    expect(ali.alibabaError(401, JSON.stringify({ code: "InvalidApiKey", message: "sk-abcdefghijkl" })).message).not.toContain("sk-abcdefghijkl");
    expect(ali.alibabaError(400, JSON.stringify({ code: "DataInspectionFailed" })).message).toMatch(/contrôle de contenu/);
    expect(ali.alibabaError(500, "x").refused).toBe(false);
  });

  it("vidéo Wan (image → vidéo) : tâche asynchrone suivie, 720P, durée acceptée réservée et facturée, vidéo récupérée", async () => {
    const c = await client();
    confirmModel("alibaba:wan2.6-i2v", { unit: "video_second", perSecond: 0.1 });
    setJsonSetting("ai.routes", { video_generation: { provider: "alibaba", model: "wan2.6-i2v" } });
    expect(mp.videoProviderAvailable("product_video")).toBe("alibaba");
    const k = ctx(c);
    const buf = await fr(() => mp.aiClip("alibaba", k, { image: png, prompt: "rotation lente du produit", aspect: "9:16", seconds: 5 }));
    expect(buf.equals(mp4)).toBe(true);
    const create = net.calls.find((x) => x.url.includes("video-synthesis"))!;
    expect(create.headers["X-DashScope-Async"]).toBe("enable");
    expect(create.body).toMatchObject({ model: "wan2.6-i2v", parameters: { resolution: "720P", duration: 5, watermark: false } });
    expect(create.body.input.img_url).toMatch(/^data:image\/jpeg;base64,/);
    expect(create.body.input.negative_prompt).toMatch(/people/);
    expect(billed(c.userId)).toEqual([{ provider: "alibaba", requested_model: "wan2.6-i2v", quantity: 5 }]);
    expect(getSetting(ali.wanTaskKey(k.usageKey))).toBeFalsy();
  });

  it("Wan 3.0 : entrée « media » (premier plan) ; texte vers vidéo sans image", async () => {
    const c = await client();
    confirmModel("alibaba:wan3.0-video", { unit: "video_second", perSecond: 0.1 });
    setJsonSetting("ai.routes", { video_generation: { provider: "alibaba", model: "wan3.0-video" } });
    await fr(() => mp.aiClip("alibaba", ctx(c), { image: png, prompt: "plan produit", aspect: "16:9", seconds: 4 }));
    expect(net.calls.find((x) => x.url.includes("video-synthesis"))!.body.input.media[0]).toMatchObject({ type: "first_frame" });
    net.calls = [];
    net.polls = 0;
    setJsonSetting("ai.media.usage", { text_video: { primary: "alibaba:wan3.0-video" } });
    await fr(() => mp.wanTextClip(ctx(c), { prompt: "motion design aux couleurs de la marque", seconds: 6 }));
    const t2v = net.calls.find((x) => x.url.includes("video-synthesis"))!.body;
    expect(t2v.input.media).toBeUndefined();
    expect(t2v.input.img_url).toBeUndefined();
  });

  it("reprise : tâche déjà lancée (page rechargée, serveur redémarré) → suivi repris, AUCUNE nouvelle tâche ; vidéo payée récupérée sans repayer", async () => {
    const c = await client();
    confirmModel("alibaba:wan2.6-i2v", { unit: "video_second", perSecond: 0.1 });
    setJsonSetting("ai.routes", { video_generation: { provider: "alibaba", model: "wan2.6-i2v" } });
    const k = ctx(c, "job-1:clip-1");
    setSetting(ali.wanTaskKey(k.usageKey), JSON.stringify({ taskId: "task-123", model: "wan2.6-i2v", seconds: 5, at: Date.now() }));
    await fr(() => mp.aiClip("alibaba", k, { image: png, prompt: "plan", aspect: "9:16", seconds: 5 }));
    expect(net.calls.some((x) => x.url.includes("video-synthesis"))).toBe(false);
    expect(net.calls.some((x) => x.url.includes("/tasks/task-123"))).toBe(true);

    // Vidéo terminée et payée, téléchargement coupé : le nouvel essai télécharge seulement (aucune tâche, aucun coût).
    const k2 = ctx(c, "job-2:clip-1");
    net.polls = 0;
    net.downloadDown = true;
    await expect(fr(() => mp.aiClip("alibaba", k2, { image: png, prompt: "plan", aspect: "9:16", seconds: 5 }))).rejects.toThrow(/sans la repayer/);
    const before = billed(c.userId).length;
    net.downloadDown = false;
    net.calls = [];
    const buf = await fr(() => mp.aiClip("alibaba", k2, { image: png, prompt: "plan", aspect: "9:16", seconds: 5 }));
    expect(buf.equals(mp4)).toBe(true);
    expect(net.calls.map((x) => x.url)).toEqual(["https://result.test/wan.mp4"]);
    expect(billed(c.userId).length).toBe(before);
  });

  it("échec de la tâche chez Alibaba : non facturé, réservation rendue, suivi oublié", async () => {
    const c = await client();
    confirmModel("alibaba:wan2.6-i2v", { unit: "video_second", perSecond: 0.1 });
    setJsonSetting("ai.routes", { video_generation: { provider: "alibaba", model: "wan2.6-i2v" } });
    net.video = "failed";
    const k = ctx(c);
    await expect(fr(() => mp.aiClip("alibaba", k, { image: png, prompt: "plan", aspect: "9:16", seconds: 5 }))).rejects.toThrow(/non facturée/);
    expect(reservations(c.userId)).toEqual([{ status: "released", provider: "alibaba", model: "wan2.6-i2v" }]);
    expect(billed(c.userId)).toEqual([]);
    expect(getSetting(ali.wanTaskKey(k.usageKey))).toBeFalsy();
  });

  it("test de clé sans génération + état de validation pas à pas (clé, adresse, test, confirmation, tarif, génération)", async () => {
    setSetting("provider.alibaba.apiKey", "sk-alibaba-test-1234567890", true);
    let r = fr(() => alibabaReadiness());
    expect(r.ready).toBe(false);
    expect(r.status).toMatch(/jamais testée/);
    const msg = await fr(() => mp.pingProvider("alibaba"));
    expect(msg).toMatch(/aucune génération facturée/);
    expect(net.calls.map((x) => x.url)).toEqual(["https://dashscope-intl.aliyuncs.com/api/v1/models?page_no=1&page_size=1"]);
    r = fr(() => alibabaReadiness());
    expect(r.status).toMatch(/confirm/);
    confirmModel("alibaba:qwen-image-plus", { unit: "image", perImage: 0.03 });
    r = fr(() => alibabaReadiness());
    expect(r.ready).toBe(true);
    expect(r.status).toBe("Fournisseur prêt");
    setSetting("provider.alibaba.apiKey", null);
    expect(fr(() => alibabaReadiness())).toMatchObject({ ready: false, status: "Clé absente" });
  });

  it("usages : « Images réseaux sociaux » suit « Publicités visuelles » tant qu'il n'a pas son propre réglage ; « Texte vers vidéo » exclut l'image vers vidéo", () => {
    setJsonSetting("ai.media.usage", { ad_visual: { primary: "alibaba:qwen-image-max" } });
    expect(routing.usagePrimary("social_image")).toMatchObject({ provider: "alibaba", model: "qwen-image-max", inherited: true });
    setJsonSetting("ai.media.usage", { ad_visual: { primary: "alibaba:qwen-image-max" }, social_image: { primary: "openai:gpt-image-1" } });
    expect(routing.usagePrimary("social_image")).toMatchObject({ provider: "openai", inherited: false });
    expect(routing.incompatibility(mediaModel("alibaba", "wan2.6-i2v")!, routing.usageNeed("text_video"))).toBeTruthy();
    expect(routing.incompatibility(mediaModel("alibaba", "wan2.6-t2v")!, routing.usageNeed("text_video"))).toBeNull();
  });
});
