vi.mock("@/lib/public-download",()=>import("./public-download-double"));
/**
 * Routage multimédia V2 (images, logos, publicités, vidéos, UGC) — fournisseurs SIMULÉS, aucun appel payant :
 *  - manuel par défaut : principal actuel inchangé (OpenAI GPT Image 1, Veo 3) ;
 *  - choix d'un autre principal, secours compatible et couvert (sa propre réservation), relais quand le principal
 *    refuse ou tombe sans rien facturer ; jamais de relais après un résultat incertain ;
 *  - modèles récents (Gemini 3.1, Veo 3.1, Kling 3) : paramètres et durées facturées ;
 *  - fournisseur indisponible, budget épuisé, modèle non confirmé : rien n'est envoyé ;
 *  - mode automatique : qualité et fidélité avant le prix.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const fs = process.getBuiltinModule("node:fs");
  const os = process.getBuiltinModule("node:os");
  const p = process.getBuiltinModule("node:path");
  process.env.DATA_DIR = fs.mkdtempSync(p.join(os.tmpdir(), "ecs-multimedia-"));
});

let keys: Record<string, string | null> = {};
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => keys[p] ?? null }));

// OpenAI Images simulé (SDK) : génération et retouche ; `openaiMode` force une panne.
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const oa = { calls: [] as any[], mode: "ok" as "ok" | "503" | "429" };
vi.mock("openai", () => {
  class OpenAI {
    constructor(public opts: any) {}
    private run = async (kind: string, p: any) => {
      oa.calls.push({ kind, ...p });
      if (oa.mode === "503") throw Object.assign(new Error("service unavailable"), { status: 503 });
      if (oa.mode === "429") throw Object.assign(new Error("rate limit"), { status: 429 });
      const usage = { input_tokens: 300, output_tokens: 1000, input_tokens_details: { text_tokens: 300, image_tokens: 0 } };
      // Réponse en flux (modèles qui la permettent) : aperçus puis image finale, comme l'API.
      if (p.stream) return (async function* () {
        for (let i = 0; i < (p.partial_images ?? 0); i++) yield { type: "image_generation.partial_image", partial_image_index: i, b64_json: PNG };
        yield { type: "image_generation.completed", b64_json: PNG, usage };
      })();
      return { data: [{ b64_json: PNG }], usage };
    };
    images = { generate: (p: any) => this.run("generate", p), edit: (p: any) => this.run("edit", p) };
  }
  return { default: OpenAI, OpenAI, toFile: async (b: Buffer, name: string) => ({ name, size: b.length }) };
});

// Réseau simulé : Gemini (images), Veo (vidéo), fal (file d'attente) — chaque requête est enregistrée.
const net = { calls: [] as { url: string; body: any }[], veo503: false, veoRefused: false, falFileDown: false };
const mp4 = Buffer.from("00000018667479706d703432", "hex");
async function fakeFetch(url: string, init?: RequestInit): Promise<Response> {
  const body = init?.body ? JSON.parse(String(init.body)) : null;
  net.calls.push({ url, body });
  const json = (j: unknown, status = 200) => new Response(JSON.stringify(j), { status });
  if (url.includes("multimodal-generation/generation")) return json({output:{choices:[{message:{content:[{image:"https://img.test/alibaba.png"}]}}]}});
  if (url.includes(":generateContent")) return json({ modelVersion:"reported-version-simulation",candidates: [{ content: { parts: [{ inlineData: { data: PNG } }] } }] });
  if (url.includes(":predictLongRunning")) return net.veoRefused ? json({ error: { message: "request rejected" } }, 400) : net.veo503 ? json({ error: { message: "indisponible" } }, 503) : json({ name: "operations/op1" });
  if (url.includes("/operations/op1")) return json({ done: true, response: { generateVideoResponse: { generatedSamples: [{ video: { uri: "https://generativelanguage.googleapis.com/v1beta/files/fixture-video:download" } }] } } });
  if (url.startsWith("https://queue.fal.run/") && init?.method === "POST") return json({ status_url: "https://queue.fal.run/x/requests/1/status", response_url: "https://queue.fal.run/x/requests/1" });
  if (url.endsWith("/status")) return json({ status: "COMPLETED" });
  if (url === "https://queue.fal.run/x/requests/1") return json({ video: { url: "https://video.test/fal.mp4" }, images: [{ url: "https://img.test/fal.png" }] });
  if (url === "https://video.test/fal.mp4" && net.falFileDown) throw new TypeError("fetch failed");
  if (url.includes("/files/fixture-video:download")) return new Response(mp4);
  if (url.startsWith("https://video.test/")) return new Response(mp4);
  if (url.startsWith("https://img.test/")) return new Response(Buffer.from(PNG, "base64"));
  return json({}, 404);
}

describe("routage multimédia V2", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, run } = await import("@/lib/db");
  const billing = await import("@/lib/billing");
  const { setSetting, setJsonSetting, getJsonSetting } = await import("@/lib/settings");
  const { runWithLang } = await import("@/lib/i18n-server");
  const mp = await import("@/lib/ai/media-providers");
  const routing = await import("@/lib/ai/media-routing");
  const { MEDIA_MODELS, mediaModel } = await import("@/lib/ai/media-models");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const png = Buffer.from(PNG, "base64");
  mp.mediaPoll.veoMs = 1;
  mp.mediaPoll.falVideoMs = 1;
  mp.mediaPoll.falImageMs = 1;

  async function client(plan: "creer" | "dominer" = "dominer") {
    const u = await createUser(`mm${Date.now()}${Math.random().toString(36).slice(2, 7)}@test.fr`, "motdepasse-test", "M");
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
  const calls = (uid: string) => all<{ provider: string; requested_model: string; status: string; routing_fallback: number }>("SELECT provider, requested_model, status, routing_fallback FROM ai_calls WHERE user_id = ? ORDER BY created_at, rowid", uid);

  beforeEach(() => {
    keys = { anthropic: "sk-ant-test-1234567890abcdef", openai: "sk-openai-test-123456", google: "cle-google-test-123456", fal: "fal-id:fal-secret" };
    oa.calls = [];
    oa.mode = "ok";
    net.calls = [];
    net.veo503 = false;
    net.veoRefused = false;
    net.falFileDown = false;
    vi.stubGlobal("fetch", fakeFetch);
    setSetting("ai.prices.checkedAt", String(Date.now()));
    for (const k of ["ai.routes", "ai.media.backup", "ai.media.mode", "ai.media.models", "ai.prices"]) setJsonSetting(k, {});
    confirmModel("openai:gpt-image-2.5-sunburst", { unit: "image", perImage: 0.2 }); // Prix synthétique.
  });
  afterEach(() => vi.unstubAllGlobals());

  /** Tarif saisi et modèle confirmé dans l'administration (ce que fait le propriétaire). */
  const confirmModel = (key: string, price: unknown) => {
    setJsonSetting("ai.prices", { ...getJsonSetting<Record<string, unknown>>("ai.prices", {}), [key]: price });
    setJsonSetting("ai.media.models", { ...getJsonSetting<Record<string, unknown>>("ai.media.models", {}), [key]: { confirmedAt: Date.now(), enabled: true } });
  };

  it("catalogue : adaptateurs réels, durées et statut ; les modèles non vérifiés sont verrouillés par défaut", () => {
    for (const m of MEDIA_MODELS) {
      expect(m.adapter).toBeTruthy();
      if (m.kind === "video") expect(m.durations?.length).toBeGreaterThan(0);
      if (!(m.verified.id && m.verified.price)) expect(routing.mediaStatus(m).usable).toBe(false);
    }
    expect(mediaModel("google", "veo-3.1-generate-preview")?.durations).toEqual([4, 6, 8]);
    expect(mediaModel("google", "veo-3.0-generate-001")?.replacement).toBe("google:veo-3.1-generate-preview");
  });

  it("logo complet : modèle imposé et réservation réglée", async () => {
    const c = await client();
    await fr(() => mp.fullLogoImage(ctx(c), { brief: "monogramme", name: "Somnéa" }));
    expect(oa.calls[0]).toMatchObject({ kind: "generate", model: "gpt-image-2.5-sunburst", quality: "high" });
    expect(reservations(c.userId)).toEqual([{ status: "settled", provider: "openai", model: "gpt-image-2.5-sunburst" }]);
  });

  it("logo complet : nom, activités et slogan validé écrits tels quels dans la demande ; sans slogan, « aucun slogan »", async () => {
    const c = await client();
    await fr(() => mp.fullLogoImage(ctx(c), { brief: "monogramme SB et toit", name: "Sébastien Blanc", descriptor: "PLÂTRERIE • PEINTURE • RÉNOVATION", tagline: "Des espaces qui vous ressemblent" }));
    const withTag = oa.calls.at(-1).prompt as string;
    expect(withTag).toContain("le nom « Sébastien Blanc »");
    expect(withTag).toContain("la ligne d'activités « PLÂTRERIE • PEINTURE • RÉNOVATION »");
    expect(withTag).toContain("le slogan de la marque « Des espaces qui vous ressemblent »");
    expect(withTag).not.toContain("aucun slogan");
    await fr(() => mp.fullLogoImage(ctx(c), { brief: "monogramme SB", name: "Sébastien Blanc" }));
    expect(oa.calls.at(-1).prompt).toContain("aucun slogan");
  });

  it("images produit : principal Gemini 3.1 choisi par l'administration → décor vide demandé à ce modèle", async () => {
    const c = await client();
    confirmModel("google:gemini-3.1-flash-image", { unit: "image", perImage: 0.067 });
    setJsonSetting("ai.routes", { image_generation: { provider: "google", model: "gemini-3.1-flash-image" } });
    await fr(() => mp.geminiPlate(ctx(c), { prompt: "plan de travail en marbre", aspect: "4:5" }));
    expect(net.calls[0].url).toContain("models/gemini-3.1-flash-image:generateContent");
    expect(reservations(c.userId)[0]).toMatchObject({ status: "settled", model: "gemini-3.1-flash-image" });
    // La retouche par masque (fidélité du vrai produit) reste chez OpenAI : seul modèle capable.
    await fr(() => mp.openaiScene(ctx(c), { composite: png, productMask: png, prompt: "scène", size: "1024x1024" }));
    expect(oa.calls.at(-1)).toMatchObject({ kind: "edit", model: "gpt-image-1" });
  });

  it("création publicitaire (visuel sans référence) : un modèle fal « edit » qui exige une référence n'est jamais choisi", async () => {
    const c = await client();
    confirmModel("fal:fal-ai/nano-banana-2/edit", { unit: "image", perImage: 0.08 });
    setJsonSetting("ai.routes", { image_generation: { provider: "fal", model: "fal-ai/nano-banana-2/edit" } });
    setJsonSetting("ai.media.backup", { image: "google:gemini-2.5-flash-image" });
    await fr(() => mp.ambianceImage(ctx(c), { prompt: "atelier lumineux", aspect: "1:1" }));
    expect(net.calls.some((x) => x.url.includes("queue.fal.run"))).toBe(false);
    expect(net.calls[0].url).toContain("gemini-2.5-flash-image");
    expect(calls(c.userId)[0]).toMatchObject({ provider: "google", routing_fallback: 1 });
  });

  it("UGC : la personne est créée par fal avec le produit en référence quand fal est principal", async () => {
    const c = await client();
    confirmModel("fal:fal-ai/nano-banana-2/edit", { unit: "image", perImage: 0.08 });
    setJsonSetting("ai.routes", { image_generation: { provider: "fal", model: "fal-ai/nano-banana-2/edit" } });
    await fr(() => mp.ugcFrame(ctx(c), { prompt: "une femme tient le produit", product: png, aspect: "9:16" }));
    const post = net.calls.find((x) => x.url === "https://queue.fal.run/fal-ai/nano-banana-2/edit")!;
    expect(post.body.image_urls).toHaveLength(1);
    expect(reservations(c.userId)[0]).toMatchObject({ status: "settled", provider: "fal" });
  });

  it("vidéo produit : Veo 3.1 demande et facture la durée réelle (4/6/8 s) ; Veo 3 reste à 8 s", async () => {
    const c = await client();
    expect(mp.veoBilledSeconds(5, "veo-3.1-generate-preview")).toBe(6);
    expect(mp.veoBilledSeconds(5, "veo-3.0-generate-001")).toBe(8);
    confirmModel("google:veo-3.1-generate-preview", { unit: "video_second", perSecond: 0.4 });
    setJsonSetting("ai.routes", { video_generation: { provider: "google", model: "veo-3.1-generate-preview" } });
    await fr(() => mp.aiClip("google", ctx(c), { image: png, prompt: "lent travelling", aspect: "9:16", seconds: 5 }));
    const start = net.calls.find((x) => x.url.includes(":predictLongRunning"))!;
    expect(start.url).toContain("veo-3.1-generate-preview");
    expect(start.body.parameters.durationSeconds).toBe(6);
    expect(all<{ quantity: number }>("SELECT quantity FROM ai_calls WHERE user_id = ? AND task = 'video_generation'", c.userId)[0].quantity).toBe(6);
  });

  it("changement de fournisseur vidéo : Kling 3 (fal) principal → durée en texte, 3 à 15 s", async () => {
    const c = await client();
    confirmModel("fal:fal-ai/kling-video/v3/pro/image-to-video", { unit: "video_second", perSecond: 0.11 });
    setJsonSetting("ai.routes", { video_generation: { provider: "fal", model: "fal-ai/kling-video/v3/pro/image-to-video" } });
    expect(fr(() => mp.videoProviderAvailable())).toBe("fal");
    await fr(() => mp.aiClip("fal", ctx(c), { image: png, prompt: "rotation lente", aspect: "16:9", seconds: 7 }));
    const post = net.calls.find((x) => x.url === "https://queue.fal.run/fal-ai/kling-video/v3/pro/image-to-video")!;
    expect(post.body).toMatchObject({ duration: "7" });
    expect(mp.falBilledSeconds("fal-ai/kling-video/v2.1/pro/image-to-video", 7)).toBe(10);
  });

  it("fal : plan terminé mais fichier injoignable → coût enregistré une fois, la reprise récupère le plan sans repayer", async () => {
    const c = await client();
    setJsonSetting("ai.routes", { video_generation: { provider: "fal", model: "fal-ai/kling-video/v2.1/pro/image-to-video" } });
    const k = ctx(c, "reprise-fal-1");
    net.falFileDown = true;
    await expect(fr(() => mp.aiClip("fal", k, { image: png, prompt: "rotation lente", aspect: "9:16", seconds: 5 }))).rejects.toThrow(/sans le repayer/);
    expect(all("SELECT 1 FROM ai_calls WHERE user_id = ? AND task = 'video_generation' AND status = 'ok'", c.userId)).toHaveLength(1);
    net.falFileDown = false;
    net.calls = [];
    const v = await fr(() => mp.aiClip("fal", k, { image: png, prompt: "rotation lente", aspect: "9:16", seconds: 5 }));
    expect(v.equals(mp4)).toBe(true);
    // Aucune nouvelle génération envoyée, aucun second coût.
    expect(net.calls.some((x) => x.url.startsWith("https://queue.fal.run/fal-ai/") && x.body)).toBe(false);
    expect(all("SELECT 1 FROM ai_calls WHERE user_id = ? AND task = 'video_generation' AND status = 'ok'", c.userId)).toHaveLength(1);
    expect(getJsonSetting("fal.done.reprise-fal-1", null)).toBeNull();
  });

  it("refus explicite du principal sans coût → secours compatible avec SA propre réservation (vidéo produit)", async () => {
    const c = await client();
    setJsonSetting("ai.media.backup", { video: "fal:fal-ai/kling-video/v2.1/pro/image-to-video" });
    net.veoRefused = true;
    await fr(() => mp.aiClip("google", ctx(c), { image: png, prompt: "plan produit", aspect: "16:9" }));
    expect(reservations(c.userId)).toEqual([
      { status: "released", provider: "google", model: "veo-3.0-generate-001" },
      { status: "settled", provider: "fal", model: "fal-ai/kling-video/v2.1/pro/image-to-video" },
    ]);
  });

  it("dépôt vidéo en erreur 5xx : résultat incertain conservé et aucun second fournisseur", async () => {
    const c = await client();
    setJsonSetting("ai.media.backup", { video: "fal:fal-ai/kling-video/v2.1/pro/image-to-video" });
    net.veo503 = true;
    await expect(fr(() => mp.aiClip("google", ctx(c), { image: png, prompt: "plan", aspect: "16:9" }))).rejects.toThrow();
    expect(reservations(c.userId)).toEqual([{ status: "uncertain", provider: "google", model: "veo-3.0-generate-001" }]);
    expect(net.calls.some(x => x.url.includes("queue.fal.run"))).toBe(false);
  });

  it("UGC : pas de relais vers un modèle sans son quand Veo (voix) tombe", async () => {
    const c = await client();
    setJsonSetting("ai.media.backup", { video: "fal:fal-ai/kling-video/v2.1/pro/image-to-video" });
    net.veo503 = true;
    await expect(fr(() => mp.aiClip("google", ctx(c), { image: png, prompt: "témoignage", aspect: "9:16", people: true }))).rejects.toThrow();
    expect(reservations(c.userId).map((r) => r.provider)).toEqual(["google"]);
  });

  it("image : OpenAI refuse (429, rien facturé) → secours Gemini ; 503 (peut-être facturé) → aucun secours ; fournisseur sans clé → secours directement", async () => {
    const c = await client();
    setJsonSetting("ai.media.backup", { image: "google:gemini-2.5-flash-image" });
    oa.mode = "503";
    await expect(fr(() => mp.ambianceImage(ctx(c), { prompt: "une vague", aspect: "1:1" }))).rejects.toThrow();
    expect(reservations(c.userId).map((r) => `${r.status}:${r.provider}`)).toEqual(["uncertain:openai"]);
    run("DELETE FROM ai_reservations WHERE user_id = ?", c.userId);
    oa.mode = "429";
    await fr(() => mp.ambianceImage(ctx(c), { prompt: "une vague", aspect: "1:1" }));
    expect(reservations(c.userId).map((r) => `${r.status}:${r.provider}`)).toEqual(["released:openai", "settled:google"]);
    keys.openai = null;
    expect(fr(() => mp.imageProviderAvailable())).toBe("google");
  });

  it("secours non confirmé ou sans tarif : jamais utilisé (son coût ne serait pas couvert)", async () => {
    const c = await client();
    // Tarif saisi mais modèle NON confirmé : toujours pas utilisable comme secours.
    setJsonSetting("ai.prices", { "google:gemini-3.1-flash-image": { unit: "image", perImage: 0.067 } });
    setJsonSetting("ai.media.backup", { image: "google:gemini-3.1-flash-image" });
    oa.mode = "429";
    await expect(fr(() => mp.ambianceImage(ctx(c), { prompt: "une vague", aspect: "1:1" }))).rejects.toThrow();
    expect(net.calls.length).toBe(0);
    expect(reservations(c.userId).map((r) => r.status)).toEqual(["released"]);
  });

  it("budget épuisé : rien n'est envoyé, ni au principal ni au secours", async () => {
    const c = await client();
    setJsonSetting("ai.media.backup", { image: "google:gemini-2.5-flash-image" });
    run("UPDATE wallets SET monthly_used = monthly_allowance - 50, topup_balance = 0 WHERE user_id = ?", c.userId);
    await expect(fr(() => mp.ambianceImage(ctx(c), { prompt: "une vague", aspect: "1:1" }))).rejects.toThrow();
    expect(oa.calls.length + net.calls.length).toBe(0);
    expect(reservations(c.userId)).toHaveLength(0);
  });

  it("nouveau modèle OpenAI au jeton (jetons de sortie inconnus) : bloqué ; au tarif par image : borné et autorisé", async () => {
    const c = await client();
    confirmModel("openai:gpt-image-2", { unit: "tokens", inputPerM: 5, outputPerM: 40 });
    setJsonSetting("ai.routes", { image_generation: { provider: "openai", model: "gpt-image-2" } });
    await expect(fr(() => mp.ambianceImage(ctx(c), { prompt: "une vague", aspect: "1:1" }))).rejects.toThrow(/tarif par image/);
    expect(oa.calls).toHaveLength(0);
    confirmModel("openai:gpt-image-2", { unit: "image", perImage: 0.2 });
    await fr(() => mp.ambianceImage(ctx(c), { prompt: "une vague", aspect: "1:1" }));
    expect(oa.calls[0].model).toBe("gpt-image-2");
  });

  it("mode automatique : qualité et fidélité avant le prix ; budget restant faible → option moins chère", () => {
    const ok = (m: any) => ({ key: `${m.provider}:${m.model}`, usable: true, confirmed: true, enabled: true, connected: true, reasons: [] });
    // Retouche par masque : seul un modèle capable.
    expect(routing.rankMedia({ kind: "image", mask: true }, { status: ok, stats: {} }).find((r) => !r.excluded)?.model.provider).toBe("openai");
    // Sans contrainte : le plus haut niveau de qualité passe devant le moins cher.
    const best = routing.rankMedia({ kind: "image" }, { status: ok, stats: {} }).find((r) => !r.excluded)!;
    expect(best.model.quality).toBe(3);
    // UGC vidéo : son natif exigé → jamais Kling.
    const ugc = routing.rankMedia({ kind: "video", imageToVideo: true, audio: true, people: true }, { status: ok, stats: {} });
    expect(ugc.filter((r) => !r.excluded).every((r) => r.model.caps.audio)).toBe(true);
    // Échecs observés répétés → écarté.
    const failing = { "openai:gpt-image-1": { calls: 10, failures: 6, avgCostMicro: 1, avgLatencyMs: 1, avgScore: null } };
    expect(routing.rankMedia({ kind: "image", mask: true }, { status: ok, stats: failing }).find((r) => r.model.model === "gpt-image-1")?.excluded).toMatch(/échecs/);
  });

  it("mode manuel par défaut pour les images et les vidéos", () => {
    expect(routing.mediaMode("image")).toBe("manual");
    expect(routing.mediaMode("video")).toBe("manual");
  });
  it.each(["google","fal","openai","alibaba"])("publication : %s reçoit le logo AVEC et SANS photo — transport simulé réellement inspecté",async provider => {
    keys[provider]="cle-synthetique-pour-test";
    const model=MEDIA_MODELS.find(m=>m.provider===provider && m.kind==="image" && !!m.caps.textInImage && (m.caps.references??0)>=2)!;
    expect(model).toBeTruthy();
    confirmModel(`${provider}:${model.model}`,{unit:"image",perImage:.08});
    setJsonSetting("ai.media.usage",{social_image:{primary:`${provider}:${model.model}`}});
    const c=await client();
    for (const product of [true,false]) {
      await mp.aiPostImage(ctx(c),{prompt:"Logo exact, sujet documenté",aspect:"4:5",reference:product?png:null,logo:png});
      const n=product?2:1;
      const ledger=all<{served_model:string|null}>("SELECT served_model FROM ai_calls WHERE user_id=? AND status='ok' ORDER BY created_at,rowid",c.userId);
      expect(ledger.at(-1)?.served_model).toBe(provider==="google"?"reported-version-simulation":null);
      if (provider==="openai") {
        expect(oa.calls.at(-1).kind).toBe("edit");
        expect(oa.calls.at(-1).image).toHaveLength(n);
      } else if (provider==="google") {
        const call=net.calls.filter(c=>c.url.includes(":generateContent")).at(-1)!;
        expect(call.body.contents[0].parts.filter((p:any)=>p.inline_data)).toHaveLength(n);
      } else if (provider==="fal") {
        const call=net.calls.filter(c=>c.url.startsWith("https://queue.fal.run/")&&c.body).at(-1)!;
        expect(call.body.image_urls).toHaveLength(n);
      } else {
        const call=net.calls.filter(c=>c.url.includes("multimodal-generation/generation")).at(-1)!;
        expect(call.body.input.messages[0].content.filter((p:any)=>p.image)).toHaveLength(n);
      }
    }
    setJsonSetting("ai.media.usage",{});
  });

  it("aucune référence essentielle supprimée pour tenir dans la capacité du modèle",async()=>{
    keys={alibaba:"cle-test"};
    const m=MEDIA_MODELS.find(m=>m.provider==="alibaba"&&m.kind==="image"&&m.caps.references===2)!;
    confirmModel(`alibaba:${m.model}`,{unit:"image",perImage:.08});
    setJsonSetting("ai.media.usage",{social_image:{primary:`alibaba:${m.model}`}});
    const c=await client();
    await expect(mp.aiPostImage(ctx(c),{prompt:"retouche avec trois références essentielles",aspect:"4:5",reference:png,logo:png,previous:png})).rejects.toThrow();
    expect(net.calls).toHaveLength(0);expect(oa.calls).toHaveLength(0);
    setJsonSetting("ai.media.usage",{});
  });

  it("brief de publication complet au-delà de la limite logo ; limite dédiée explicite, jamais tronquée",async()=>{
    const m=MEDIA_MODELS.find(m=>m.provider==="openai"&&m.kind==="image"&&m.caps.textInImage)!;
    confirmModel(`openai:${m.model}`,{unit:"image",perImage:.08});
    setJsonSetting("ai.media.usage",{social_image:{primary:`openai:${m.model}`}});
    const c=await client();
    await mp.aiPostImage(ctx(c),{prompt:"Contexte ".repeat(800)+"CONTRAINTE FINALE INTACTE",aspect:"4:5",reference:png,logo:png});
    expect(oa.calls[0].prompt).toContain("CONTRAINTE FINALE INTACTE");
    await expect(mp.aiPostImage(ctx(c),{prompt:"x".repeat(mp.PUBLICATION_PROMPT_MAX_BYTES+1),aspect:"4:5",reference:png})).rejects.toThrow("trop long");
    expect(oa.calls).toHaveLength(1);
    setJsonSetting("ai.media.usage",{});
  });

  it("deux étapes : une scène peut utiliser un modèle sans typographie, jamais pour la composition finale",async()=>{
    const m=MEDIA_MODELS.find(m=>m.provider==="fal"&&m.kind==="image"&&!m.caps.textInImage&&(m.caps.references??0)>=1)!;
    confirmModel(`fal:${m.model}`,{unit:"image",perImage:.08});
    setJsonSetting("ai.media.usage",{social_image:{primary:`fal:${m.model}`}});
    const c=await client();await mp.aiPostImage(ctx(c),{prompt:"photo seule sans texte",aspect:"4:5",reference:png,photoOnly:true});
    const sent=net.calls.filter(c=>c.url.startsWith("https://queue.fal.run/")&&c.body).length;expect(sent).toBe(1);
    await expect(mp.aiPostImage(ctx(c),{prompt:"composition avec texte exact",aspect:"4:5",reference:png})).rejects.toThrow();
    expect(net.calls.filter(c=>c.url.startsWith("https://queue.fal.run/")&&c.body)).toHaveLength(sent);
    setJsonSetting("ai.media.usage",{});
  });

});
