/**
 * Routage multimédia PAR USAGE (logos, images produit, retouches produit, publicités visuelles, décors et ambiances,
 * vidéos produit, vidéos UGC) — fournisseurs SIMULÉS, aucun appel payant :
 *  - sans réglage propre, chaque usage suit le réglage général (réglages existants préservés) ;
 *  - chaque usage a son principal, son secours et son mode, indépendamment des autres ;
 *  - chaque chemin arrive au BON appel fournisseur (URL / modèle simulés) avec sa propre réservation ;
 *  - Logo Engine V2 : le concept graphique vient du modèle d'images choisi pour « Logos » ; la tâche « logo_symbol »
 *    le finalise en vectoriel (et ne le remplace jamais en silence) ;
 *  - administration : validation des choix (capacités, tarif, confirmation), retour au réglage général.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const fs = process.getBuiltinModule("node:fs");
  const os = process.getBuiltinModule("node:os");
  const p = process.getBuiltinModule("node:path");
  process.env.DATA_DIR = fs.mkdtempSync(p.join(os.tmpdir(), "ecs-usages-"));
});

const jar = { token: "" };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }) }));

let keys: Record<string, string | null> = {};
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => keys[p] ?? null }));

// Anthropic simulé (territoires, symbole vectoriel, relecture du logo).
const llm = { sent: [] as any[], respond: (_p: any) => "{}" };
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {}
  class Anthropic {
    static AuthenticationError = class extends APIError {};
    static BadRequestError = class extends APIError {};
    static NotFoundError = class extends APIError {};
    constructor(public opts: any) {}
    private stream(params: any) {
      llm.sent.push(params);
      const p = Promise.resolve({ model: params.model, stop_reason: "end_turn", content: [{ type: "text", text: llm.respond(params) }], usage: { input_tokens: 4000, output_tokens: 1500 } });
      return { finalMessage: () => p };
    }
    messages = { stream: (p: any) => this.stream(p), countTokens: async (p: any) => ({ input_tokens: Math.ceil(JSON.stringify(p).length / 3) }) };
    beta = { messages: { stream: (p: any) => this.stream(p) } };
  }
  return { default: Anthropic, Anthropic };
});

// OpenAI Images simulé : génération et retouche ; `mode` force une panne sans facturation.
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const oa = { calls: [] as any[], mode: "ok" as "ok" | "503" | "429" | "400" };
vi.mock("openai", () => {
  class OpenAI {
    constructor(public opts: any) {}
    private run = async (kind: string, p: any) => {
      oa.calls.push({ kind, ...p });
      if (oa.mode === "503") throw Object.assign(new Error("service unavailable"), { status: 503 });
      if (oa.mode === "429") throw Object.assign(new Error("rate limit"), { status: 429 });
      if (oa.mode === "400") throw Object.assign(new Error("Transparent background is not supported for this model."), { status: 400 });
      const usage = { input_tokens: 300, output_tokens: 1000, input_tokens_details: { text_tokens: 300, image_tokens: 0 } };
      // Réponse en flux (modèles qui la permettent) : aperçus puis image finale, comme l'API.
      if (p.stream) return (async function* () {
        for (let i = 0; i < (p.partial_images ?? 0); i++) yield { type: `image_${kind === "edit" ? "edit" : "generation"}.partial_image`, partial_image_index: i, b64_json: PNG };
        yield { type: `image_${kind === "edit" ? "edit" : "generation"}.completed`, b64_json: PNG, usage };
      })();
      return { data: [{ b64_json: PNG }], usage };
    };
    images = { generate: (p: any) => this.run("generate", p), edit: (p: any) => this.run("edit", p) };
  }
  return { default: OpenAI, OpenAI, toFile: async (b: Buffer, name: string) => ({ name, size: b.length }) };
});

// Réseau simulé : Gemini (images), Veo (vidéo), fal (file d'attente).
const net = { calls: [] as { url: string; body: any }[], image: PNG };
const mp4 = Buffer.from("00000018667479706d703432", "hex");
async function fakeFetch(url: string, init?: RequestInit): Promise<Response> {
  const body = init?.body ? JSON.parse(String(init.body)) : null;
  net.calls.push({ url, body });
  const json = (j: unknown, status = 200) => new Response(JSON.stringify(j), { status });
  if (url.includes(":generateContent")) return json({ candidates: [{ content: { parts: [{ inlineData: { data: net.image } }] } }] });
  if (url.includes(":predictLongRunning")) return json({ name: "operations/op1" });
  if (url.includes("/operations/op1")) return json({ done: true, response: { generateVideoResponse: { generatedSamples: [{ video: { uri: "https://video.test/clip.mp4" } }] } } });
  if (url.startsWith("https://queue.fal.run/") && init?.method === "POST") return json({ status_url: "https://queue.fal.run/x/requests/1/status", response_url: "https://queue.fal.run/x/requests/1" });
  if (url.endsWith("/status")) return json({ status: "COMPLETED" });
  if (url === "https://queue.fal.run/x/requests/1") return json({ video: { url: "https://video.test/fal.mp4" }, images: [{ url: "https://img.test/fal.png" }] });
  if (url.startsWith("https://video.test/")) return new Response(mp4);
  if (url.startsWith("https://img.test/")) return new Response(Buffer.from(PNG, "base64"));
  return json({}, 404);
}

describe("routage multimédia par usage", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, now, one, run } = await import("@/lib/db");
  const billing = await import("@/lib/billing");
  const { sha256 } = await import("@/lib/secrets");
  const { setSetting, setJsonSetting, getJsonSetting } = await import("@/lib/settings");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { JobContext } = await import("@/lib/jobs");
  const mp = await import("@/lib/ai/media-providers");
  const routing = await import("@/lib/ai/media-routing");
  const { mediaUsageOverview } = await import("@/lib/ai/media-routing-admin");
  const { mediaModel } = await import("@/lib/ai/media-models");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const png = Buffer.from(PNG, "base64");
  mp.mediaPoll.veoMs = 1;
  mp.mediaPoll.falVideoMs = 1;
  mp.mediaPoll.falImageMs = 1;

  async function client(plan: "creer" | "dominer" = "dominer") {
    const u = await createUser(`us${Date.now()}${Math.random().toString(36).slice(2, 7)}@test.fr`, "motdepasse-test", "U");
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    billing.getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'active', plan = ? WHERE user_id = ?", plan, u.id);
    billing.alignPeriod(u.id, Date.now());
    billing.syncAllowance(u.id);
    const pid = `p-${u.id}`;
    run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", pid, u.id, "Test", Date.now(), Date.now());
    return { userId: u.id, projectId: pid };
  }
  const ctx = (c: { userId: string; projectId: string }, key = `k-${Math.random()}`) => ({ ...c, usageKey: key });
  const reservations = (uid: string) => all<{ status: string; provider: string; model: string }>("SELECT status, provider, model FROM ai_reservations WHERE user_id = ? ORDER BY created_at, rowid", uid);
  /** Tarif saisi et modèle confirmé dans l'administration (ce que fait le propriétaire). */
  const confirmModel = (key: string, price: unknown) => {
    setJsonSetting("ai.prices", { ...getJsonSetting<Record<string, unknown>>("ai.prices", {}), [key]: price });
    setJsonSetting("ai.media.models", { ...getJsonSetting<Record<string, unknown>>("ai.media.models", {}), [key]: { confirmedAt: Date.now(), enabled: true } });
  };
  const setUsage = (u: string, v: Record<string, unknown>) => setJsonSetting("ai.media.usage", { ...getJsonSetting<Record<string, unknown>>("ai.media.usage", {}), [u]: v });

  beforeEach(() => {
    keys = { anthropic: "sk-ant-test-1234567890abcdef", openai: "sk-openai-test-123456", google: "cle-google-test-123456", fal: "fal-id:fal-secret" };
    oa.calls = [];
    oa.mode = "ok";
    net.calls = [];
    net.image = PNG;
    llm.sent = [];
    vi.stubGlobal("fetch", fakeFetch);
    setSetting("ai.prices.checkedAt", String(Date.now()));
    for (const k of ["ai.routes", "ai.media.backup", "ai.media.mode", "ai.media.models", "ai.media.usage", "ai.prices"]) setJsonSetting(k, {});
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sans réglage propre : les 7 usages suivent le réglage général (rien ne change pour les projets existants)", () => {
    const o = fr(() => mediaUsageOverview());
    expect(o.map((u) => u.usage)).toEqual(["logo", "product_image", "product_edit", "ad_visual", "scene", "product_video", "ugc_video"]);
    for (const u of o) {
      expect(u.primaryInherited && u.backupInherited && u.modeInherited).toBe(true);
      expect(u.mode).toBe("manual");
      expect(u.primary).toBe(u.kind === "image" ? "openai:gpt-image-1" : "google:veo-3.0-generate-001");
      expect(u.current?.key).toBe(u.primary);
    }
    // Un réglage général existant (ex. Gemini 2.5 en principal des images) reste suivi par les usages images…
    setJsonSetting("ai.routes", { image_generation: { provider: "google", model: "gemini-2.5-flash-image" } });
    const o2 = fr(() => mediaUsageOverview());
    expect(o2.find((u) => u.usage === "logo")?.primary).toBe("google:gemini-2.5-flash-image");
    // … sauf qu'il ne sait pas retoucher par masque : signalé pour « Retouches produit ».
    expect(o2.find((u) => u.usage === "product_edit")?.primaryProblem).toMatch(/masque/);
  });

  it("indépendance : logo → Gemini, décors → OpenAI, publicités → Gemini 2.5 ; chaque appel part chez le modèle de SON usage", async () => {
    const c = await client();
    setUsage("logo", { primary: "google:gemini-2.5-flash-image" });
    setUsage("ad_visual", { primary: "google:gemini-2.5-flash-image" });
    // Logo : symbole et logo complet par le modèle des logos.
    await fr(() => mp.logoSymbolImage(ctx(c), { concept: "vague en négatif" }));
    expect(net.calls.at(-1)!.url).toContain("models/gemini-2.5-flash-image:generateContent");
    // Décor et ambiance : réglage général (OpenAI GPT Image 1), pas celui des logos.
    await fr(() => mp.ambianceImage(ctx(c), { prompt: "atelier lumineux", aspect: "1:1" }));
    expect(oa.calls.at(-1)).toMatchObject({ kind: "generate", model: "gpt-image-1" });
    // Publicité (visuel d'ambiance) : modèle des publicités.
    const before = net.calls.length;
    await fr(() => mp.ambianceImage(ctx(c), { prompt: "fond publicitaire", aspect: "4:5", usage: "ad_visual" }));
    expect(net.calls.length).toBe(before + 1);
    expect(net.calls.at(-1)!.url).toContain("gemini-2.5-flash-image");
    expect(reservations(c.userId).map((r) => `${r.status}:${r.provider}:${r.model}`)).toEqual(["settled:google:gemini-2.5-flash-image", "settled:openai:gpt-image-1", "settled:google:gemini-2.5-flash-image"]);
    // Trace : l'usage figure dans la raison de routage.
    const reasons = all<{ routing_reason: string }>("SELECT routing_reason FROM ai_calls WHERE user_id = ? ORDER BY created_at, rowid", c.userId).map((r) => r.routing_reason);
    expect(reasons).toEqual(["admin primary [logo]", "admin primary [scene]", "admin primary [ad_visual]"]);
  });

  it("photos produit : « Retouches produit » (masque, OpenAI) d'abord ; coupé → « Images produit » (décor du modèle choisi + composition)", async () => {
    const c = await client();
    expect(fr(() => mp.productImagePath("product_image"))).toEqual({ path: "masked_edit", usage: "product_edit" });
    await fr(() => mp.openaiScene(ctx(c), { composite: png, productMask: png, prompt: "scène", size: "1024x1024", usage: "product_edit" }));
    expect(oa.calls.at(-1)).toMatchObject({ kind: "edit", model: "gpt-image-1" });
    // Retouche coupée par l'administration + Images produit → Gemini 2.5 : décor vide demandé à Gemini.
    setUsage("product_edit", { off: true });
    setUsage("product_image", { primary: "google:gemini-2.5-flash-image" });
    expect(fr(() => mp.productImagePath("product_image"))).toEqual({ path: "composite_plate", usage: "product_image" });
    await fr(() => mp.productPlate(ctx(c), { prompt: "plan en marbre", aspect: "4:5", usage: "product_image" }));
    expect(net.calls.at(-1)!.url).toContain("gemini-2.5-flash-image:generateContent");
    expect(JSON.stringify(net.calls.at(-1)!.body)).toMatch(/empty product-photography set/);
    // Images produit → OpenAI : le décor vide passe par la génération OpenAI (plus seulement Gemini).
    setUsage("product_image", { primary: "openai:gpt-image-1" });
    await fr(() => mp.productPlate(ctx(c), { prompt: "plan en bois", aspect: "1:1", usage: "product_image" }));
    expect(oa.calls.at(-1)).toMatchObject({ kind: "generate", model: "gpt-image-1" });
  });

  it("publicités : un modèle sans retouche par masque → décor + produit composé ; jamais un modèle fal qui exige une référence", async () => {
    setUsage("ad_visual", { primary: "google:gemini-2.5-flash-image" });
    expect(fr(() => mp.productImagePath("ad_visual"))).toEqual({ path: "composite_plate", usage: "ad_visual" });
    setUsage("ad_visual", {});
    expect(fr(() => mp.productImagePath("ad_visual"))).toEqual({ path: "masked_edit", usage: "ad_visual" });
    const fal = mediaModel("fal", "fal-ai/nano-banana-2/edit")!;
    expect(routing.incompatibility(fal, routing.usageNeed("ad_visual"))).toMatch(/référence/);
    expect(routing.incompatibility(mediaModel("google", "gemini-3.1-flash-image")!, routing.usageNeed("product_edit"))).toMatch(/masque/);
  });

  it("vidéos : « Vidéos produit » et « Vidéos UGC » ont chacune leur modèle (Veo 3 Fast / Veo 3 / Kling)", async () => {
    const c = await client();
    setUsage("product_video", { primary: "google:veo-3.0-fast-generate-001" });
    await fr(() => mp.aiClip("google", ctx(c), { image: png, prompt: "rotation lente", aspect: "9:16", usage: "product_video" }));
    expect(net.calls.find((x) => x.url.includes(":predictLongRunning"))!.url).toContain("veo-3.0-fast-generate-001");
    net.calls = [];
    await fr(() => mp.aiClip("google", ctx(c), { image: png, prompt: "personne qui présente", aspect: "9:16", people: true, usage: "ugc_video" }));
    expect(net.calls.find((x) => x.url.includes(":predictLongRunning"))!.url).toContain("veo-3.0-generate-001");
    // Vidéos produit → Kling 2.1 (fal) : la vidéo UGC reste sur Veo 3.
    setUsage("product_video", { primary: "fal:fal-ai/kling-video/v2.1/pro/image-to-video" });
    expect(fr(() => mp.videoProviderAvailable("product_video"))).toBe("fal");
    expect(fr(() => mp.videoProviderAvailable("ugc_video"))).toBe("google");
    net.calls = [];
    await fr(() => mp.aiClip("fal", ctx(c), { image: png, prompt: "rotation", aspect: "9:16", seconds: 5, usage: "product_video" }));
    expect(net.calls[0].url).toBe("https://queue.fal.run/fal-ai/kling-video/v2.1/pro/image-to-video");
  });

  it("secours par usage : le logo relaie vers SON secours ; les décors (sans secours) ne relaient pas", async () => {
    const c = await client();
    setUsage("logo", { backup: "google:gemini-2.5-flash-image" });
    setUsage("scene", { backup: null });
    // Refus net sans facturation (429) : le secours prend le relais. Une erreur 5xx, elle, est incertaine (plus bas).
    oa.mode = "429";
    await fr(() => mp.logoSymbolImage(ctx(c), { concept: "onde" }));
    expect(net.calls.at(-1)!.url).toContain("gemini-2.5-flash-image");
    expect(reservations(c.userId).map((r) => `${r.status}:${r.model}`)).toEqual(["released:gpt-image-1", "settled:gemini-2.5-flash-image"]);
    const n = net.calls.length;
    await expect(fr(() => mp.ambianceImage(ctx(c), { prompt: "atelier", aspect: "1:1" }))).rejects.toThrow();
    expect(net.calls.length).toBe(n);
  });

  it("logo complet sur GPT Image 2 (pas de fond transparent) : aucune demande de transparence ; principal refusé + secours incapable d'écrire → l'erreur réelle est montrée, jamais « aucun fournisseur »", async () => {
    const c = await client();
    confirmModel("openai:gpt-image-2", { unit: "image", perImage: 0.2 });
    setUsage("logo", { primary: "openai:gpt-image-2", backup: "google:gemini-2.5-flash-image" });
    await fr(() => mp.logoArtworkImage(ctx(c), { prompt: "logo complet" }));
    expect(oa.calls.at(-1)).toMatchObject({ kind: "generate", model: "gpt-image-2" });
    expect(oa.calls.at(-1).background).toBeUndefined();
    // Le modèle qui gère la transparence la reçoit toujours.
    setUsage("logo", { primary: "openai:gpt-image-1" });
    await fr(() => mp.logoArtworkImage(ctx(c), { prompt: "logo complet" }));
    expect(oa.calls.at(-1)).toMatchObject({ model: "gpt-image-1", background: "transparent" });
    // Principal refusé par OpenAI (rien de facturé) ; le secours (Gemini) ne sait pas écrire le nom : vraie erreur.
    setUsage("logo", { primary: "openai:gpt-image-2", backup: "google:gemini-2.5-flash-image" });
    oa.mode = "400";
    const err = (await fr(() => mp.logoArtworkImage(ctx(c), { prompt: "logo complet" })).catch((e) => e)) as Error;
    expect(err.message).toMatch(/Requête refusée par OpenAI/);
    expect(err.message).not.toMatch(/Aucun fournisseur/);
    expect(net.calls.filter((x) => x.url.includes(":generateContent"))).toHaveLength(0);
  });

  it("mode automatique par usage : seules les vidéos UGC passent en automatique (son natif), les autres restent manuels", () => {
    setUsage("ugc_video", { mode: "auto" });
    const o = fr(() => mediaUsageOverview());
    expect(o.find((u) => u.usage === "ugc_video")).toMatchObject({ mode: "auto", modeInherited: false });
    expect(o.find((u) => u.usage === "ugc_video")?.current?.role).toBe("auto");
    expect(o.find((u) => u.usage === "product_video")).toMatchObject({ mode: "manual", current: { key: "google:veo-3.0-generate-001", role: "primary" } });
  });

  it("garde-fous inchangés : budget épuisé ou clé absente → rien n'est envoyé, réservation rendue", async () => {
    const c = await client();
    setUsage("logo", { primary: "google:gemini-2.5-flash-image" });
    run("UPDATE wallets SET monthly_used = monthly_allowance - 50, topup_balance = 0 WHERE user_id = ?", c.userId);
    await expect(fr(() => mp.logoSymbolImage(ctx(c), { concept: "onde" }))).rejects.toThrow();
    expect(net.calls.length + oa.calls.length).toBe(0);
    expect(reservations(c.userId)).toHaveLength(0);
    // Clé Google retirée : le logo réglé sur Gemini n'est PAS confié en silence à un autre modèle.
    keys.google = null;
    expect(fr(() => mp.mediaRouteFor("logo"))).toBeNull();
    expect(fr(() => mp.imageUnavailableReason("logo"))).toMatch(/modèle choisi pour « Logos »/);
    // Un usage qui suit le réglage général garde le repli historique (comportement inchangé).
    expect(fr(() => mp.mediaRouteFor("scene"))?.provider).toBe("openai");
  });

  it("Logo Engine V2 : concept du modèle d'images des logos, puis finalisation vectorielle par « logo_symbol » (concept montré)", async () => {
    const { seedLogoFixture } = await import("./logo-v2-fixtures");
    const { draftsFor, review, SVG_OK } = await import("./logo-v2-mock");
    const { brandDiscovery } = await import("@/lib/logo-v2/discovery");
    const { loadProject } = await import("@/lib/projects");
    const { runLogoEngineV2 } = await import("@/lib/logo-v2/engine");
    const { realLogoV2Ai } = await import("@/lib/logo-v2/ai");
    const c = await client("creer");
    const pid = fr(() => seedLogoFixture(c.userId, "artisan"));
    const b = fr(() => brandDiscovery(loadProject(pid)));
    setUsage("logo", { primary: "google:gemini-2.5-flash-image" });
    llm.respond = (params: any) => {
      const sys = JSON.stringify(params.system);
      if (sys.includes("TERRITOIRES CRÉATIFS")) return JSON.stringify({ territories: draftsFor(b).slice(0, 3) });
      if (sys.includes("SYMBOLE d'un territoire")) return JSON.stringify({ idea: "forme", svg: SVG_OK });
      const exp = /Texte attendu \(exact\) : « ([^»]+) »/.exec(JSON.stringify(params.messages))?.[1] ?? "";
      return JSON.stringify(review(8.7, exp));
    };
    const jid = `job-us-${Date.now()}`;
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, c.userId, pid, "brand.logo.v2", "logo", JSON.stringify({ projectId: pid }), "running", now(), now(), now());
    const job = new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
    const r = await fr(() => runLogoEngineV2(job, pid, { ai: realLogoV2Ai(job, { userId: c.userId, projectId: pid }) }));
    // 1. Le concept du territoire à symbole (« Geste abstrait ») est demandé au modèle choisi pour les logos.
    const gen = net.calls.filter((x) => x.url.includes(":generateContent"));
    expect(gen).toHaveLength(1);
    expect(gen[0].url).toContain("models/gemini-2.5-flash-image:generateContent");
    expect(oa.calls).toHaveLength(0);
    // 2. Concept non vectorisable tel quel (image simulée de 1 pixel) → finalisation vectorielle avec le concept joint.
    const fin = llm.sent.filter((p) => JSON.stringify(p.system).includes("SYMBOLE d'un territoire"));
    expect(fin).toHaveLength(1);
    expect(JSON.stringify(fin[0].messages)).toMatch(/"type":"image"/);
    expect(JSON.stringify(fin[0].messages)).toMatch(/concept du symbole/);
    const symbolTerritory = r.shown.find((x) => x.territory.name === "Geste abstrait")!;
    expect(symbolTerritory.candidate.symbolSource).toBe("ai_image_finalized");
    expect(r.notes.join(" | ")).toMatch(/Geste abstrait : concept \(google:gemini-2\.5-flash-image\) non vectorisable/);
    // Coûts tracés et réservations réglées : texte (Anthropic) et image (Google) dans la même tâche.
    const calls = all<{ task: string; provider: string; requested_model: string; routing_reason: string | null }>("SELECT task, provider, requested_model, routing_reason FROM ai_calls WHERE job_id = ? ORDER BY created_at, rowid", jid);
    expect(calls.find((x) => x.task === "image_generation")).toMatchObject({ provider: "google", requested_model: "gemini-2.5-flash-image", routing_reason: "admin primary [logo]" });
    expect(reservations(c.userId).every((x) => x.status === "settled")).toBe(true);
  });

  it("Logo Engine V2 : concept net (formes pleines) → vectorisé directement, sans redessin par l'IA de texte", async () => {
    const sharp = (await import("sharp")).default;
    const { seedLogoFixture } = await import("./logo-v2-fixtures");
    const { draftsFor, review, SVG_OK } = await import("./logo-v2-mock");
    const { brandDiscovery } = await import("@/lib/logo-v2/discovery");
    const { loadProject } = await import("@/lib/projects");
    const { runLogoEngineV2 } = await import("@/lib/logo-v2/engine");
    const { realLogoV2Ai } = await import("@/lib/logo-v2/ai");
    // Concept simulé : un disque noir et un carré noir sur fond blanc (ce que demande la consigne du symbole).
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#fff"/><circle cx="200" cy="256" r="120" fill="#000"/><rect x="300" y="160" width="110" height="190" fill="#000"/></svg>`;
    net.image = (await sharp(Buffer.from(svg)).png().toBuffer()).toString("base64");
    const c = await client("creer");
    const pid = fr(() => seedLogoFixture(c.userId, "artisan"));
    const b = fr(() => brandDiscovery(loadProject(pid)));
    setUsage("logo", { primary: "google:gemini-2.5-flash-image" });
    llm.respond = (params: any) => {
      const sys = JSON.stringify(params.system);
      if (sys.includes("TERRITOIRES CRÉATIFS")) return JSON.stringify({ territories: draftsFor(b).slice(0, 3) });
      if (sys.includes("SYMBOLE d'un territoire")) return JSON.stringify({ idea: "forme", svg: SVG_OK });
      const exp = /Texte attendu \(exact\) : « ([^»]+) »/.exec(JSON.stringify(params.messages))?.[1] ?? "";
      return JSON.stringify(review(8.7, exp));
    };
    const jid = `job-us3-${Date.now()}`;
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, c.userId, pid, "brand.logo.v2", "logo", JSON.stringify({ projectId: pid }), "running", now(), now(), now());
    const job = new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
    const r = await fr(() => runLogoEngineV2(job, pid, { ai: realLogoV2Ai(job, { userId: c.userId, projectId: pid }) }));
    expect(net.calls.filter((x) => x.url.includes("gemini-2.5-flash-image:generateContent"))).toHaveLength(1);
    expect(r.shown.find((x) => x.territory.name === "Geste abstrait")?.candidate.symbolSource).toBe("ai_image_traced");
    expect(llm.sent.filter((p) => JSON.stringify(p.system).includes("SYMBOLE d'un territoire"))).toHaveLength(0);
    expect(r.notes.join(" | ")).toMatch(/concept du modèle d'images \(google:gemini-2\.5-flash-image\), vectorisé/);
  });

  it("Logo Engine V2 sans modèle d'images utilisable : symbole conçu en vectoriel, ÉCRIT dans les notes (jamais en silence)", async () => {
    const { seedLogoFixture } = await import("./logo-v2-fixtures");
    const { draftsFor, review, SVG_OK } = await import("./logo-v2-mock");
    const { brandDiscovery } = await import("@/lib/logo-v2/discovery");
    const { loadProject } = await import("@/lib/projects");
    const { runLogoEngineV2 } = await import("@/lib/logo-v2/engine");
    const { realLogoV2Ai } = await import("@/lib/logo-v2/ai");
    keys = { anthropic: "sk-ant-test-1234567890abcdef" };
    const c = await client("creer");
    const pid = fr(() => seedLogoFixture(c.userId, "artisan"));
    const b = fr(() => brandDiscovery(loadProject(pid)));
    llm.respond = (params: any) => {
      const sys = JSON.stringify(params.system);
      if (sys.includes("TERRITOIRES CRÉATIFS")) return JSON.stringify({ territories: draftsFor(b).slice(0, 3) });
      if (sys.includes("SYMBOLE d'un territoire")) return JSON.stringify({ idea: "forme", svg: SVG_OK });
      const exp = /Texte attendu \(exact\) : « ([^»]+) »/.exec(JSON.stringify(params.messages))?.[1] ?? "";
      return JSON.stringify(review(8.7, exp));
    };
    const jid = `job-us2-${Date.now()}`;
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, c.userId, pid, "brand.logo.v2", "logo", JSON.stringify({ projectId: pid }), "running", now(), now(), now());
    const job = new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
    const r = await fr(() => runLogoEngineV2(job, pid, { ai: realLogoV2Ai(job, { userId: c.userId, projectId: pid }) }));
    expect(net.calls.filter((x) => x.url.includes("generateContent") || x.url.includes("fal.run"))).toHaveLength(0);
    expect(r.shown.find((x) => x.territory.name === "Geste abstrait")?.candidate.symbolSource).toBe("ai_svg");
    expect(r.notes.join(" | ")).toMatch(/Geste abstrait : aucun modèle d'images utilisable pour les logos .* symbole conçu en vectoriel par l'IA de texte/);
  });

  it("administration : choix validés (capacité, tarif, confirmation, secours distinct) et retour au réglage général", async () => {
    const { POST } = await import("@/app/api/admin/settings/route");
    const admin = await createUser(`adm${Date.now()}@test.fr`, "motdepasse-test", "A");
    run("UPDATE users SET role = 'admin' WHERE id = ?", admin.id);
    const token = `tok-${Date.now()}`;
    run("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?,?,?,?)", sha256(token), admin.id, now() + 3600_000, now());
    jar.token = token;
    const send = (mediaUsage: unknown) => fr(() => POST(new Request("http://x/api/admin/settings", { method: "POST", body: JSON.stringify({ mediaUsage }), headers: { "Content-Type": "application/json" } })));
    // Retouches produit : Gemini refusé (pas de retouche par masque branchée).
    let res = await send({ usage: "product_edit", primary: "google:gemini-2.5-flash-image" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/masque/);
    // Nouveau modèle non confirmé : refusé ; une fois tarifé et confirmé : accepté pour les logos.
    res = await send({ usage: "logo", primary: "openai:gpt-image-2" });
    expect(res.status).toBe(400);
    confirmModel("openai:gpt-image-2", { unit: "image", perImage: 0.2 });
    res = await send({ usage: "logo", primary: "openai:gpt-image-2" });
    expect(res.status).toBe(200);
    // Secours identique au principal : refusé ; secours couvert : accepté ; vidéo pour une image : refusé.
    expect((await send({ usage: "logo", backup: "openai:gpt-image-2" })).status).toBe(400);
    expect((await send({ usage: "logo", backup: "google:gemini-2.5-flash-image" })).status).toBe(200);
    expect((await send({ usage: "logo", primary: "google:veo-3.0-generate-001" })).status).toBe(400);
    expect((await send({ usage: "scene", off: true })).status).toBe(400);
    expect(getJsonSetting<Record<string, unknown>>("ai.media.usage", {}).logo).toEqual({ primary: "openai:gpt-image-2", backup: "google:gemini-2.5-flash-image" });
    // Les autres usages ne bougent pas.
    const o = fr(() => mediaUsageOverview());
    expect(o.find((u) => u.usage === "scene")).toMatchObject({ primary: "openai:gpt-image-1", primaryInherited: true });
    expect((await send({ usage: "logo", reset: true })).status).toBe(200);
    expect(getJsonSetting<Record<string, unknown>>("ai.media.usage", {}).logo).toBeUndefined();
  });

  it("toute image payée est conservée telle que reçue, sous l'identifiant de son appel — même rejetée ensuite ; rien pour un échec non facturé", async () => {
    const { storagePath } = await import("@/lib/storage");
    const fs = await import("node:fs");
    const c = await client();
    await fr(() => mp.logoSymbolImage(ctx(c), { concept: "onde" }));
    const call = one<{ id: string }>("SELECT id FROM ai_calls WHERE user_id = ? AND task = 'image_generation' AND status = 'ok'", c.userId)!;
    const file = storagePath(`ai-originals/${c.projectId}/${call.id}.png`);
    expect(fs.existsSync(file)).toBe(true);
    expect(fs.readFileSync(file).equals(Buffer.from(PNG, "base64"))).toBe(true);
    // Échec avant facturation (refus du fournisseur) : aucune image, aucun fichier.
    oa.mode = "429";
    await expect(fr(() => mp.ambianceImage(ctx(c), { prompt: "atelier", aspect: "1:1" }))).rejects.toThrow();
    expect(fs.readdirSync(storagePath(`ai-originals/${c.projectId}`))).toEqual([`${call.id}.png`]);
  });

  it("plafonds de dépense IA intacts : 40 % HT des abonnements, 50 % HT des recharges", () => {
    expect(billing.SUBSCRIPTION_AI_SHARE).toBe(0.4);
    expect(billing.PACK_AI_SHARE).toBe(0.5);
  });
});
