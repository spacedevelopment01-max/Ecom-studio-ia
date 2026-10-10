/**
 * Génération OpenAI EN FLUX dans le moteur multimédia (méthode de l'essai réel du logo Sébastien Blanc) — AUCUN
 * appel payant : le vrai SDK OpenAI parle à un faux serveur local qui renvoie le VRAI logo déjà payé
 * (reports/openai-real-brand-test/direct-*.png) en flux SSE, comme l'API.
 *  - flux : 2 aperçus puis l'image finale ; progression transmise ; coût et modèle tracés ; original conservé ;
 *  - proxy HTTPS de l'environnement respecté même sans NODE_USE_ENV_PROXY ;
 *  - 502, coupure du flux : facturation incertaine → coût maximal retenu, AUCUNE seconde génération (ni secours) ;
 *  - budget insuffisant : rien n'est envoyé ;
 *  - parcours Logo V2 complet : réception, sauvegarde, reprise sans nouvel appel, choix → identité tirée du vrai logo.
 */
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import sharp from "sharp";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const fs = process.getBuiltinModule("node:fs");
  const os = process.getBuiltinModule("node:os");
  const p = process.getBuiltinModule("node:path");
  process.env.DATA_DIR = fs.mkdtempSync(p.join(os.tmpdir(), "ecs-oa-stream-"));
});

let keys: Record<string, string | null> = {};
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => keys[p] ?? null }));

const DIR = "reports/openai-real-brand-test";
const REAL = path.join(DIR, fs.readdirSync(DIR).find((f) => /^direct-.*Z\.png$/.test(f))!);
const realPng = fs.readFileSync(REAL);

// ---- faux OpenAI local (vrai SDK, vrai HTTP, vrai SSE)
type Mode = "ok" | "502" | "cut" | "no-final";
const srv = { mode: "ok" as Mode, requests: [] as any[], gemini: 0 };
let server: http.Server;
let base = "";
function startServer() {
  server = http.createServer(async (req, res) => {
    let raw = "";
    for await (const c of req) raw += c;
    const body = raw ? JSON.parse(raw) : {};
    srv.requests.push({ url: req.url, ...body, prompt: undefined });
    if (srv.mode === "502") return res.writeHead(502, { "content-type": "application/json" }), res.end(JSON.stringify({ error: { message: "upstream request failed" } }));
    const b64 = realPng.toString("base64");
    const usage = { input_tokens: 260, output_tokens: 4360, input_tokens_details: { text_tokens: 260, image_tokens: 0 } };
    if (!body.stream) return res.writeHead(200, { "content-type": "application/json" }), res.end(JSON.stringify({ data: [{ b64_json: b64 }], usage }));
    res.writeHead(200, { "content-type": "text/event-stream" });
    const ev = (o: any) => res.write(`event: ${o.type}\ndata: ${JSON.stringify(o)}\n\n`);
    for (let i = 0; i < (body.partial_images ?? 0); i++) {
      ev({ type: "image_generation.partial_image", partial_image_index: i, b64_json: b64.slice(0, 2000) });
      await new Promise((r) => setTimeout(r, 20));
      if (srv.mode === "cut") return res.socket?.destroy();
    }
    if (srv.mode === "no-final") return res.end();
    ev({ type: "image_generation.completed", b64_json: b64, usage });
    res.end();
  });
  return new Promise<void>((r) => server.listen(0, "127.0.0.1", () => ((base = `http://127.0.0.1:${(server.address() as net.AddressInfo).port}`), r())));
}

describe("OpenAI en flux dans le moteur multimédia", async () => {
  const { createUser } = await import("@/lib/auth");
  const { all, one, run } = await import("@/lib/db");
  const billing = await import("@/lib/billing");
  const { setSetting, setJsonSetting, getJsonSetting } = await import("@/lib/settings");
  const { runWithLang } = await import("@/lib/i18n-server");
  const mp = await import("@/lib/ai/media-providers");
  const oi = await import("@/lib/ai/openai-images");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  beforeAll(async () => {
    await startServer();
    process.env.OPENAI_BASE_URL = `${base}/v1`;
  });
  afterAll(() => server.close());

  async function client(plan: "creer" | "dominer" = "dominer") {
    const u = await createUser(`oa${Date.now()}${Math.random().toString(36).slice(2, 7)}@test.fr`, "motdepasse-test", "U");
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    billing.getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'active', plan = ? WHERE user_id = ?", plan, u.id);
    billing.alignPeriod(u.id, Date.now());
    billing.syncAllowance(u.id);
    const pid = `p-${u.id}`;
    run("INSERT INTO projects (id, user_id, name, created_at, updated_at) VALUES (?,?,?,?,?)", pid, u.id, "Test", Date.now(), Date.now());
    return { userId: u.id, projectId: pid };
  }
  const reservations = (uid: string) => all<{ status: string; model: string }>("SELECT status, model FROM ai_reservations WHERE user_id = ? ORDER BY created_at, rowid", uid);
  const confirmModel = (key: string, price: unknown) => {
    setJsonSetting("ai.prices", { ...getJsonSetting<Record<string, unknown>>("ai.prices", {}), [key]: price });
    setJsonSetting("ai.media.models", { ...getJsonSetting<Record<string, unknown>>("ai.media.models", {}), [key]: { confirmedAt: Date.now(), enabled: true } });
  };
  const setUsage = (u: string, v: Record<string, unknown>) => setJsonSetting("ai.media.usage", { ...getJsonSetting<Record<string, unknown>>("ai.media.usage", {}), [u]: v });

  beforeEach(() => {
    keys = { openai: "sk-openai-test-123456", google: "cle-google-test-123456" };
    srv.mode = "ok";
    srv.requests = [];
    setSetting("ai.prices.checkedAt", String(Date.now()));
    for (const k of ["ai.routes", "ai.media.backup", "ai.media.mode", "ai.media.models", "ai.media.usage", "ai.prices", "ai.media.openaiStream"]) setJsonSetting(k, {});
    // Comme le projet réel : GPT Image 2 pour « Logos », tarif par image saisi, Gemini en secours.
    confirmModel("openai:gpt-image-2", { unit: "image", perImage: 0.25 });
    setUsage("logo", { primary: "openai:gpt-image-2", backup: "google:gemini-2.5-flash-image" });
  });

  it("flux : 2 aperçus puis l'image finale (le vrai logo), progression transmise, coût tracé, original conservé tel quel", async () => {
    const c = await client();
    const events: string[] = [];
    const out = await oi.mediaProgress.run((p) => events.push(`${p.phase}${p.partials ? `:${p.partials}` : ""}`), () => fr(() => mp.logoArtworkImage({ ...c, usageKey: "k-ok" }, { prompt: "logo Sébastien Blanc" })));
    expect(out.equals(realPng)).toBe(true);
    expect(srv.requests).toHaveLength(1);
    expect(srv.requests[0]).toMatchObject({ model: "gpt-image-2", stream: true, partial_images: 2, quality: "high", size: "1024x1024" });
    expect(srv.requests[0].background).toBeUndefined();
    expect(events).toEqual(["sent", "partial:1", "partial:2", "received:2"]);
    const call = one<any>("SELECT * FROM ai_calls WHERE user_id = ? AND task = 'image_generation'", c.userId);
    expect(call).toMatchObject({ status: "ok", provider: "openai" });
    expect(reservations(c.userId).map((r) => r.status)).toEqual(["settled"]);
    const { storagePath } = await import("@/lib/storage");
    expect(fs.readFileSync(storagePath(`ai-originals/${c.projectId}/${call.id}.png`)).equals(realPng)).toBe(true);
  });

  it("502 (« upstream request failed ») : facturation incertaine → coût maximal retenu, AUCUNE seconde génération ni secours", async () => {
    const c = await client();
    srv.mode = "502";
    await expect(fr(() => mp.logoArtworkImage({ ...c, usageKey: "k-502" }, { prompt: "logo" }))).rejects.toThrow();
    expect(srv.requests).toHaveLength(1);
    expect(reservations(c.userId).map((r) => `${r.status}:${r.model}`)).toEqual(["uncertain:gpt-image-2"]);
  });

  it("flux coupé après un aperçu, ou terminé sans image : incertain, aucune relance", async () => {
    for (const mode of ["cut", "no-final"] as const) {
      const c = await client();
      srv.mode = mode;
      srv.requests = [];
      const err = (await fr(() => mp.logoArtworkImage({ ...c, usageKey: `k-${mode}` }, { prompt: "logo" })).catch((e) => e)) as Error;
      expect(err.name).toBe("StreamInterrupted");
      expect(srv.requests).toHaveLength(1);
      expect(reservations(c.userId).map((r) => r.status)).toEqual(["uncertain"]);
    }
  });

  it("flux coupé dans l'administration (ou modèle sans flux) : réponse classique, même image", async () => {
    const c = await client();
    setJsonSetting("ai.media.openaiStream", false as any);
    const out = await fr(() => mp.logoArtworkImage({ ...c, usageKey: "k-nostream" }, { prompt: "logo" }));
    expect(out.equals(realPng)).toBe(true);
    expect(srv.requests[0].stream).toBeUndefined();
  });

  it("budget insuffisant : refus clair AVANT tout envoi (rien ne part, rien n'est réservé)", async () => {
    const c = await client("creer");
    confirmModel("openai:gpt-image-2", { unit: "image", perImage: 5000 });
    await expect(fr(() => mp.logoArtworkImage({ ...c, usageKey: "k-budget" }, { prompt: "logo" }))).rejects.toThrow();
    expect(srv.requests).toHaveLength(0);
    expect(reservations(c.userId).filter((r) => r.status === "held" || r.status === "settled")).toHaveLength(0);
  });

  it("proxy HTTPS de l'environnement : utilisé même sans NODE_USE_ENV_PROXY (Claude Cloud), ignoré sans proxy (serveur, Codespace)", async () => {
    let proxied = 0;
    const proxy = http.createServer((req, res) => {
      proxied++;
      const u = new URL(req.url!);
      const fwd = http.request({ host: u.hostname, port: u.port, path: u.pathname + u.search, method: req.method, headers: req.headers }, (r) => (res.writeHead(r.statusCode!, r.headers), r.pipe(res)));
      req.pipe(fwd);
    });
    // Tunnel (CONNECT), comme le proxy de Claude Cloud.
    proxy.on("connect", (req, sock, head) => {
      proxied++;
      const [h, p] = req.url!.split(":");
      const up = net.connect(Number(p), h, () => (sock.write("HTTP/1.1 200 Connection Established\r\n\r\n"), up.write(head), up.pipe(sock), sock.pipe(up)));
      up.on("error", () => sock.destroy());
    });
    await new Promise<void>((r) => proxy.listen(0, "127.0.0.1", () => r()));
    const purl = `http://127.0.0.1:${(proxy.address() as net.AddressInfo).port}`;
    const saved = { HTTPS_PROXY: process.env.HTTPS_PROXY, HTTP_PROXY: process.env.HTTP_PROXY, NO_PROXY: process.env.NO_PROXY, no_proxy: process.env.no_proxy, https_proxy: process.env.https_proxy, http_proxy: process.env.http_proxy, NODE_USE_ENV_PROXY: process.env.NODE_USE_ENV_PROXY };
    try {
      for (const k of Object.keys(saved)) delete process.env[k];
      process.env.HTTPS_PROXY = purl;
      process.env.HTTP_PROXY = purl;
      process.env.NO_PROXY = "";
      const c = await client();
      const out = await fr(() => mp.logoArtworkImage({ ...c, usageKey: "k-proxy" }, { prompt: "logo" }));
      expect(out.equals(realPng)).toBe(true);
      expect(proxied).toBeGreaterThanOrEqual(1);
      const n = proxied;
      for (const k of ["HTTPS_PROXY", "HTTP_PROXY"]) delete process.env[k];
      await fr(() => mp.logoArtworkImage({ ...c, usageKey: "k-direct" }, { prompt: "logo" }));
      expect(proxied).toBe(n);
    } finally {
      for (const [k, v] of Object.entries(saved)) v === undefined ? delete process.env[k] : (process.env[k] = v);
      proxy.close();
    }
  });

  it("coût maximal réservé : inclut les aperçus du flux (modèle au jeton)", () => {
    confirmModel("openai:gpt-image-1", { unit: "tokens", inputPerM: 5, outputPerM: 40, imageInputPerM: 10, imageOutputPerM: 40 });
    const on = mp.openaiImageMax("gpt-image-1", { prompt: "x", images: 0, size: "1024x1024", quality: "high" });
    setJsonSetting("ai.media.openaiStream", false as any);
    const off = mp.openaiImageMax("gpt-image-1", { prompt: "x", images: 0, size: "1024x1024", quality: "high" });
    expect(on).toBeGreaterThan(off);
  });

  it("parcours Logo V2 avec le vrai logo : flux, sauvegarde, reprise SANS nouvel appel, choix → identité tirée du logo", async () => {
    const { JobContext } = await import("@/lib/jobs");
    const { runLogoEngineV2 } = await import("@/lib/logo-v2/engine");
    const { chooseLogoV2 } = await import("@/lib/logo-v2/choose");
    const { realLogoV2Ai } = await import("@/lib/logo-v2/ai");
    const { readLive } = await import("@/lib/logo-v2/live");
    const { assetData, getAsset } = await import("@/lib/library");
    const { loadProject } = await import("@/lib/projects");
    const { ART_CRITERIA } = await import("@/lib/logo-v2/types");
    const { seedLogoFixture } = await import("./logo-v2-fixtures");
    const { mockAi } = await import("./logo-v2-mock");
    const u = await createUser(`oaflow${Date.now()}@test.fr`, "motdepasse-test", "U");
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    billing.getSubscription(u.id);
    run("UPDATE subscriptions SET status = 'active', plan = 'dominer' WHERE user_id = ?", u.id);
    billing.alignPeriod(u.id, Date.now());
    billing.syncAllowance(u.id);
    const pid = fr(() => seedLogoFixture(u.id, "artisan"));
    const jid = `job-oa-${Date.now()}`;
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, u.id, pid, "brand.logo.v2", "brand.logo.v2", JSON.stringify({ projectId: pid }), "running", Date.now(), Date.now(), Date.now());
    const ctx = () => new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
    const drafts = (b: any) => [{ name: "Monogramme d'artisan", markType: "monogram", composition: "stacked", construction: "illustrative", sobriety: 3, style: "monogram", symbolIdea: "S et B, toit, truelle", descriptor: "PLÂTRERIE • PEINTURE", concept: `Monogramme pour ${b.name}.`, whyItFits: "Les initiales signent le travail.", typography: { style: "grotesque", weight: "bold", case: "upper", tracking: "normal", rationale: "" }, colorRole: { ink: "dark", accent: "primary", rationale: "" }, distinctive: "", avoid: [] }];
    const reviewed: string[] = [];
    const prop0 = (run: any) => run.territories[0];
    const ai = (c: InstanceType<typeof JobContext>) => {
      const real = realLogoV2Ai(c, { userId: u.id, projectId: pid });
      return {
        ...mockAi({ calls: [] } as any, { drafts: drafts as any }),
        artworkRoute: real.artworkRoute,
        drawArtwork: real.drawArtwork, // VRAI chemin du studio jusqu'au fournisseur (flux)
        // Relecture simulée (aucun appel) : le texte du vrai logo a été vérifié à l'œil (« SÉBASTIEN BLANC »).
        reviewArtwork: async (_b: Buffer, t: any, _br: any, e: { name: string }) => (reviewed.push(t.name), { criteria: Object.fromEntries(ART_CRITERIA.map((k) => [k, 8.6])), textRead: e.name, nameExact: true, extraText: false, nameBox: null, clumsyCliche: false, resemblesKnownBrand: false, amateur: false, artifacts: false, issues: [], needsSimplifiedMark: true }),
      } as any;
    };
    const c1 = ctx();
    const r = await fr(() => runLogoEngineV2(c1, pid, { ai: ai(c1) }));
    expect(srv.requests.filter((q) => q.stream)).toHaveLength(1);
    // Aucune personne ajoutée sans autorisation (règle des créations).
    const { artworkPrompt } = await import("@/lib/logo-v2/artwork");
    const { brandDiscovery } = await import("@/lib/logo-v2/discovery");
    expect(fr(() => artworkPrompt(prop0(r), brandDiscovery(loadProject(pid))))).toMatch(/No people: no person, face, hands or human silhouette/);
    const prop = r.shown[0];
    expect(prop?.verdict).toBe("FINAL");
    // Suivi en direct : image reçue PUIS sauvegardée (persistant, relu comme après un rechargement).
    const live = readLive(pid)!;
    expect(live.stage).toBe("done");
    expect(live.art).toBe("openai:gpt-image-2");
    expect(live.directions[0]).toMatchObject({ status: "done", progress: { phase: "saved", partials: 2, streamed: true } });
    // Fichier reçu du fournisseur conservé à l'identique, à côté de la proposition (fond retiré, dessin intact).
    const orig = one<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role = 'logo-v2-original' AND source_asset_id = ?", pid, prop.assetId!)!;
    expect(assetData(getAsset(orig.id)!).equals(realPng)).toBe(true);
    // Reprise de la MÊME tâche (interruption, redémarrage du worker) : l'image sauvegardée est reprise, aucun appel.
    const c2 = ctx();
    await fr(() => runLogoEngineV2(c2, pid, { ai: ai(c2) }));
    expect(srv.requests.filter((q) => q.stream)).toHaveLength(1);
    // Choix du client → identité construite AUTOUR du vrai logo.
    await fr(() => chooseLogoV2(null, pid, prop.assetId!));
    const b = loadProject(pid).brand!;
    const roles = all<{ role: string; mime: string }>("SELECT role, mime FROM assets WHERE project_id = ? AND deleted_at IS NULL", pid).map((a) => a.role);
    for (const role of ["logo", "logo-light", "logo-mono", "logo-white", "logo-mark", "favicon", "brand-board", "logo-webp", "logo-light-webp", "logo-mark-webp"]) expect(roles).toContain(role);
    // Couleurs de la marque = couleurs du logo (anthracite et sable), pas la palette d'avant.
    const { hsl } = await import("@/lib/color");
    expect(hsl(b.palette.primary)[2]).toBeLessThan(0.3);
    expect(hsl(b.palette.accent)[0]).toBeGreaterThan(20);
    expect(hsl(b.palette.accent)[0]).toBeLessThan(45);
    // Symbole seul découpé dans le logo (sans le nom), pas une initiale générique.
    const mark = all<{ id: string; meta: string }>("SELECT id, meta FROM assets WHERE project_id = ? AND role = 'logo-mark'", pid).at(-1)!;
    expect(JSON.parse(mark.meta).symbolFromArtwork).toBe(true);
    const m = await sharp(assetData(getAsset(mark.id)!)).metadata();
    expect([m.width, m.height]).toEqual([1024, 1024]);
    // Aucune version SVG imposée : le vrai logo (textures) n'est pas vectorisé.
    expect(roles).not.toContain("logo-svg");
    expect(b.logo).toMatchObject({ status: "validated", engine: "v2" });
  }, 240_000);
});
