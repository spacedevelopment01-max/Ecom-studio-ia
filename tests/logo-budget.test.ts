/**
 * Logo V2 — devis et plafond (fournisseurs SIMULÉS, aucun appel payant) : vraie chaîne d'appels (garde-fous, réservations
 * et coûts tracés), OpenAI Images et Anthropic remplacés par des simulateurs.
 *  - le devis d'une série (3 logos complets, relectures, relecture de reprise) est son plafond : la dépense réelle
 *    reste en dessous, même avec une reprise (nom réécrit par le studio) ;
 *  - plafond plus bas : les images suivantes ne partent jamais (aucune réservation), l'image payée est gardée ;
 *  - devis du Pilote = devis du moteur ; « Nouvelle version » : une image, sous son propre devis ;
 *  - Découverte : aucun appel.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  const fs = process.getBuiltinModule("node:fs");
  const os = process.getBuiltinModule("node:os");
  const p = process.getBuiltinModule("node:path");
  process.env.DATA_DIR = fs.mkdtempSync(p.join(os.tmpdir(), "ecs-logo-budget-"));
});

let keys: Record<string, string | null> = {};
vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => keys[p] ?? null }));

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

const oa = { calls: [] as any[], b64: "" };
vi.mock("openai", () => {
  class OpenAI {
    constructor(public opts: any) {}
    private run = async (kind: string, p: any) => {
      oa.calls.push({ kind, ...p });
      // Usage facturé typique d'un logo haute qualité 1024² (coût réel tracé, sous le maximum réservé).
      return { data: [{ b64_json: oa.b64 }], usage: { input_tokens: 900, output_tokens: 4160, input_tokens_details: { text_tokens: 900, image_tokens: 0 } } };
    };
    images = { generate: (p: any) => this.run("generate", p), edit: (p: any) => this.run("edit", p) };
  }
  return { default: OpenAI, OpenAI, toFile: async (b: Buffer, name: string) => ({ name, size: b.length }) };
});

describe("Logo V2 — devis et plafond de la série", async () => {
  const sharp = (await import("sharp")).default;
  const { createUser } = await import("@/lib/auth");
  const { all, now, one, run } = await import("@/lib/db");
  const billing = await import("@/lib/billing");
  const { setSetting, setJsonSetting } = await import("@/lib/settings");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { runForUser } = await import("@/lib/ai/access");
  const { JobContext } = await import("@/lib/jobs");
  const { loadProject } = await import("@/lib/projects");
  const { runLogoEngineV2, redrawArtwork } = await import("@/lib/logo-v2/engine");
  const { realLogoV2Ai } = await import("@/lib/logo-v2/ai");
  const { logoSeriesQuote, logoRedrawQuote } = await import("@/lib/logo-v2/quote");
  const { cleanArtwork } = await import("@/lib/logo-v2/artwork");
  const { ART_CRITERIA } = await import("@/lib/logo-v2/types");
  const { stepEstimateMicro } = await import("@/lib/workflow");
  const { seedLogoFixture } = await import("./logo-v2-fixtures");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  let raw: Buffer;
  let nameBox: { x: number; y: number; w: number; h: number };
  beforeAll(async () => {
    raw = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#FFFFFF"/><circle cx="512" cy="380" r="220" fill="#446274"/><rect x="262" y="700" width="500" height="90" fill="#222222"/></svg>`)).png().toBuffer();
    oa.b64 = raw.toString("base64");
    const c = await cleanArtwork(raw);
    const m = await sharp(c).metadata();
    const pad = Math.round(Math.max(500, 630) * 0.06) + 8;
    nameBox = { x: pad / m.width!, y: (540 + pad) / m.height!, w: 500 / m.width!, h: 90 / m.height! };
  });

  async function client(plan: string | null = "creer") {
    const u = await createUser(`lb${Date.now()}${Math.random().toString(36).slice(2, 7)}@test.fr`, "motdepasse-test", "B");
    run("UPDATE users SET role = 'client' WHERE id = ?", u.id);
    billing.getSubscription(u.id);
    if (plan) {
      run("UPDATE subscriptions SET status = 'active', plan = ? WHERE user_id = ?", plan, u.id);
      billing.alignPeriod(u.id, Date.now());
      billing.syncAllowance(u.id);
    }
    return u.id;
  }
  const DRAFTS = [
    { name: "Direction A", markType: "wordmark", composition: "wordmark_only", construction: "typographic", sobriety: 2, style: "typographic", symbolIdea: null },
    { name: "Direction B", markType: "symbol_wordmark", composition: "stacked", construction: "geometric", sobriety: 3, style: "minimal", symbolIdea: "un signe tiré de l'activité" },
    { name: "Direction C", markType: "emblem", composition: "badge", construction: "organic", sobriety: 4, style: "premium", symbolIdea: "un sceau sobre" },
  ].map((o) => ({ concept: `Concept ${o.name} pour la marque.`, whyItFits: "Traduit la personnalité de la marque pour sa clientèle.", typography: { style: "grotesque", weight: "bold", case: "upper", tracking: "normal", rationale: "" }, colorRole: { ink: "dark", accent: "primary", rationale: "" }, distinctive: "", avoid: [], ...o }));
  const artReview = (o: Record<string, unknown> = {}) => ({ criteria: Object.fromEntries(ART_CRITERIA.map((k) => [k, 8.6])), textRead: "", nameExact: true, extraText: false, nameBox: null, clumsyCliche: false, resemblesKnownBrand: false, amateur: false, artifacts: false, issues: [], needsSimplifiedMark: true, ...o });
  /** Relectures : la première de « Direction A » lit un nom faux (zone connue) → nom réécrit puis relu. */
  function respond(name: string) {
    let firstA = true;
    return (params: any) => {
      const sys = JSON.stringify(params.system);
      if (sys.includes("TERRITOIRES CRÉATIFS")) return JSON.stringify({ territories: DRAFTS });
      if (sys.includes("logo complet dessiné par une IA d'images")) {
        const msg = JSON.stringify(params.messages);
        if (msg.includes("Direction A") && firstA) {
          firstA = false;
          return JSON.stringify(artReview({ textRead: "NOM FAUX", nameExact: false, nameBox }));
        }
        return JSON.stringify(artReview({ textRead: name.toLocaleUpperCase("fr-FR") }));
      }
      return "{}";
    };
  }
  const job = (userId: string, pid: string, type = "brand.logo.v2") => {
    const jid = `job-lb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    run("INSERT INTO jobs (id, user_id, project_id, type, label, payload, status, run_at, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)", jid, userId, pid, type, type, JSON.stringify({ projectId: pid }), "running", now(), now(), now());
    return new JobContext(one<any>("SELECT * FROM jobs WHERE id = ?", jid));
  };
  const spent = (jid: string) => one<{ c: number }>("SELECT COALESCE(SUM(cost), 0) c FROM ai_calls WHERE job_id = ?", jid)!.c;
  const pending = (uid: string) => all("SELECT id FROM ai_reservations WHERE user_id = ? AND status NOT IN ('settled','released')", uid);

  beforeEach(() => {
    keys = { anthropic: "sk-ant-test-1234567890abcdef", openai: "sk-openai-test-123456" };
    oa.calls = [];
    llm.sent = [];
    setSetting("ai.prices.checkedAt", String(Date.now()));
    for (const k of ["ai.routes", "ai.media.backup", "ai.media.mode", "ai.media.models", "ai.media.usage", "ai.prices"]) setJsonSetting(k, {});
  });
  afterEach(() => vi.unstubAllGlobals());

  it("série : 3 logos complets + reprise (nom réécrit) — dépense réelle sous le devis, qui est le plafond", async () => {
    const uid = await client();
    const pid = fr(() => seedLogoFixture(uid, "saas"));
    const name = loadProject(pid).brand!.name;
    llm.respond = respond(name);
    const q = fr(() => logoSeriesQuote());
    expect(q).toMatchObject({ mode: "artwork", creations: 3, images: 3 });
    expect(q.maxMicro).toBeGreaterThan(3 * q.imageMaxMicro!);
    const ctx = job(uid, pid);
    const r = await fr(() => runForUser(uid, () => runLogoEngineV2(ctx, pid, { ai: realLogoV2Ai(ctx, { userId: uid, projectId: pid }) })));
    expect(oa.calls.filter((c) => c.kind === "generate")).toHaveLength(3);
    expect(r.stoppedByCostCap).toBe(false);
    expect(r.shown.find((s) => s.territory.name === "Direction A")?.candidate.artwork?.textCorrected).toBe(true);
    // 1 territoires + 3 relectures + 1 relecture après la reprise.
    expect(llm.sent).toHaveLength(5);
    const s = spent(ctx.job.id);
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(q.maxMicro);
    expect(pending(uid)).toHaveLength(0);
    // Devis du Pilote = devis du moteur (étape « logo »).
    expect(fr(() => stepEstimateMicro("logo", {} as any))).toBe(q.maxMicro);
  });

  it("plafond plus bas que le devis : les images suivantes ne partent pas (aucune réservation), l'image payée est gardée", async () => {
    const uid = await client();
    const pid = fr(() => seedLogoFixture(uid, "cosmetic"));
    llm.respond = respond(loadProject(pid).brand!.name);
    const q = fr(() => logoSeriesQuote());
    const cap = Math.round(q.imageMaxMicro! * 1.6);
    const ctx = job(uid, pid);
    const r = await fr(() => runForUser(uid, () => runLogoEngineV2(ctx, pid, { ai: realLogoV2Ai(ctx, { userId: uid, projectId: pid }), capMicro: cap })));
    const images = oa.calls.filter((c) => c.kind === "generate").length;
    expect(images).toBeGreaterThanOrEqual(1);
    expect(images).toBeLessThan(3);
    expect(r.stoppedByCostCap).toBe(true);
    expect(spent(ctx.job.id)).toBeLessThanOrEqual(cap);
    expect(all("SELECT id FROM ai_reservations WHERE user_id = ? AND task = 'image_generation'", uid)).toHaveLength(images);
    expect(pending(uid)).toHaveLength(0);
    // Chaque image payée est gardée (proposition ou essai), jamais perdue.
    expect(all("SELECT id FROM assets WHERE project_id = ? AND role IN ('logo-v2','logo-v2-trial') AND json_extract(meta, '$.artwork') IS NOT NULL", pid)).toHaveLength(images);
  });

  it("« Nouvelle version » : une seule image, sous son propre devis ; aucune autre image", async () => {
    const uid = await client();
    const pid = fr(() => seedLogoFixture(uid, "restaurant"));
    llm.respond = respond(loadProject(pid).brand!.name);
    const c1 = job(uid, pid);
    const r = await fr(() => runForUser(uid, () => runLogoEngineV2(c1, pid, { ai: realLogoV2Ai(c1, { userId: uid, projectId: pid }) })));
    oa.calls = [];
    const q = fr(() => logoRedrawQuote())!;
    const c2 = job(uid, pid, "brand.logo.v2.redraw");
    await fr(() => runForUser(uid, () => redrawArtwork(c2, pid, r.shown[0].assetId!, { feedback: "plus sobre", ai: realLogoV2Ai(c2, { userId: uid, projectId: pid }) })));
    expect(oa.calls.filter((c) => c.kind === "generate")).toHaveLength(1);
    expect(spent(c2.job.id)).toBeLessThanOrEqual(q.maxMicro);
  });

  it("Découverte (sans forfait) : aucun appel, ni texte ni image ; logos construits par le studio", async () => {
    const uid = await client(null);
    const pid = fr(() => seedLogoFixture(uid, "product"));
    llm.respond = respond(loadProject(pid).brand!.name);
    const ctx = job(uid, pid);
    const r = await fr(() => runForUser(uid, () => runLogoEngineV2(ctx, pid, { ai: realLogoV2Ai(ctx, { userId: uid, projectId: pid }) })));
    expect(oa.calls).toHaveLength(0);
    expect(llm.sent).toHaveLength(0);
    expect(spent(ctx.job.id)).toBe(0);
    expect(r.shown.length + r.studio.length + r.discarded.length).toBeGreaterThan(0);
  });
});
