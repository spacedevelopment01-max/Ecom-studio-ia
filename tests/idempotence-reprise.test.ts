/**
 * Idempotence (phase 1B) : aucune clé d'usage ne dépend de l'heure ; une tâche reprise après une interruption relit
 * ses points de reprise (logos complets, textes de la boutique) au lieu de repayer les appels déjà faits.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const images: string[] = [];
let llmCalls = 0;
vi.mock("@/lib/ai/media-providers", async (orig) => ({
  ...(await orig<object>()),
  imageProviderAvailable: () => "openai",
  imageUnavailableReason: () => null,
  refundMediaQuota: () => 0,
  fullLogoImage: vi.fn(async (_c: unknown, i: { brief: string }) => {
    images.push(i.brief);
    return sharp({ create: { width: 200, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: await sharp({ create: { width: 80, height: 40, channels: 4, background: "#446274" } }).png().toBuffer(), left: 60, top: 80 }]).png().toBuffer();
  }),
}));
vi.mock("@/lib/ai/llm", async (orig) => ({
  ...(await orig<object>()),
  llmConfigured: () => true,
  llmJson: vi.fn(async (call: { task: string }) => {
    llmCalls++;
    if (call.task === "logo_symbol") return { logos: [{ concept: "La lisseuse", brief: "A trowel stroke forming an S." }, { concept: "L'angle juste", brief: "A clean corner." }] };
    if (call.task === "quality_control") return { text: "Sébastien Blanc", nameExact: true, extraText: false, score: 8.4, issues: [] };
    throw new Error(`appel inattendu ${call.task}`);
  }),
}));
vi.mock("@/lib/ai/context", () => ({ projectContext: () => "", brainContext: () => "", brainView: () => ({ stable: "", kept: [], label: "test", hash: "h", brainVersion: "test" }) }));

const { generateFullLogos } = await import("@/lib/engine/full-logo");
const { JobContext } = await import("@/lib/jobs");
const { createUser } = await import("@/lib/auth");
const { id: newId, now, run } = await import("@/lib/db");

// Vrai projet en base (les logos sont enregistrés dans la bibliothèque, liés au projet).
const owner = await createUser(`idem${Date.now()}@test.fr`, "motdepasse-test", "P");
const PID = newId();
run(
  "INSERT INTO projects (id, user_id, name, status, platform, product_json, brand_json, strategy_json, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
  PID, owner.id, "Blanc", "ready", "shopify", JSON.stringify({ name: "Blanc", category: "Plâtrerie", facts: [], questions: [] }), JSON.stringify({ name: "Sébastien Blanc", tagline: "", palette: { primary: "#446274", accent: "#E0A458", secondary: "#DCE8E4", light: "#F4F7F5", dark: "#14201F" }, direction: "atelier", fonts: { heading: "Inter", body: "Inter" }, logo: { status: "validated", concept: "" }, validated: [], story: "", values: [], tone: { voice: "", do: [], dont: [] } }), "{}", JSON.stringify({ language: "fr" }), "[]", now(), now(),
);

const job = (key: string) => {
  const ctx = new JobContext({ id: `job-${key}-${Date.now()}`, project_id: PID, checkpoint: "{}", status: "running" } as any);
  ctx.progress = () => undefined;
  return ctx;
};

describe("idempotence des reprises", () => {
  // L'heure dans l'expression d'une clé (pas une mesure de durée écrite à côté d'une clé).
  const TIME_KEY = /(usageKey|idempotencyKey)\s*[:=]\s*[^,;]*Date\.now|stableKey\([^)]*Date\.now|(const|let)\s+\w*[kK]ey\s*=\s*[^;]*Date\.now|=\s*\([^)]*\)\s*=>\s*`[^`]*Date\.now/;
  it("le détecteur reconnaît les anciennes clés à l'heure (et pas une mesure de durée)", () => {
    expect(TIME_KEY.test("usageKey: `${ictx.jobId ?? \"logo\"}:full-logo-briefs:${Date.now().toString(36)}`,")).toBe(true);
    expect(TIME_KEY.test("const key = `${ictx.jobId}:full-logo:${i}:${Date.now().toString(36)}`;")).toBe(true);
    expect(TIME_KEY.test("const k = (what: string) => `${what}:${p.id}:${Date.now().toString(36)}`;")).toBe(true);
    expect(TIME_KEY.test("latencyMs: t.started ? Date.now() - t.started : null, usageKey: t.ctx!.usageKey ?? null,")).toBe(false);
  });
  it("aucune clé d'usage ne dépend de l'heure (Date.now) dans le code du studio", () => {
    const files: string[] = [];
    const walk = (d: string) => {
      for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, f.name);
        if (f.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(f.name)) files.push(p);
      }
    };
    walk(path.resolve("src"));
    walk(path.resolve("worker"));
    const offenders: string[] = [];
    for (const f of files) {
      const lines = fs.readFileSync(f, "utf8").split("\n");
      lines.forEach((l, i) => {
        if (TIME_KEY.test(l)) offenders.push(`${path.relative(process.cwd(), f)}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("logos complets : une tâche reprise ne repaie ni le brief, ni les images, ni les contrôles", async () => {
    const ctx = job("full");
    const first = await generateFullLogos(ctx, PID);
    const paid = { images: images.length, llm: llmCalls };
    expect(first).toHaveLength(2);
    expect(paid.images).toBe(2);
    // Reprise (même tâche, mêmes points de reprise) : aucun nouvel appel payant.
    await generateFullLogos(ctx, PID);
    expect({ images: images.length, llm: llmCalls }).toEqual(paid);
  });

  it("textes de la boutique : chaque tour (rédaction, relecture) est un point de reprise", async () => {
    vi.resetModules();
    let writes = 0;
    let reviews = 0;
    vi.doMock("@/lib/ai/llm", async (orig) => ({
      ...(await orig<object>()),
      llmConfigured: () => true,
      llmJson: vi.fn(async (call: { task: string }) => {
        if (call.task === "copywriting") {
          writes++;
          const { localCopy } = await import("@/lib/engine/local-copy");
          const { emptyProduct } = await import("@/lib/project-types");
          return localCopy({ ...emptyProduct(), name: "Blanc", category: "Plâtrerie" } as any, { name: "Blanc", tagline: "", story: "", values: [] });
        }
        reviews++;
        return { verdict: "ok", scores: { specificity: 9, benefits: 9, objections: 9, clarity: 9, voice: 9, seo: 9, conversion: 9 }, issues: [] };
      }),
    }));
    vi.doMock("@/lib/ai/context", () => ({ projectContext: () => "", brainContext: () => "", brainView: () => ({ stable: "", kept: [], label: "test", hash: "h", brainVersion: "test" }) }));
    const { aiShopCopyChecked } = await import("@/lib/ai/tasks");
    const { JobContext: JC } = await import("@/lib/jobs");
    const { emptyProduct } = await import("@/lib/project-types");
    const ctx = new JC({ id: `job-copy-${Date.now()}`, project_id: "p-copy", checkpoint: "{}", status: "running" } as any);
    const p: any = { id: "p-copy", userId: "u", name: "Blanc", product: { ...emptyProduct(), name: "Blanc", category: "Plâtrerie" }, brand: { name: "Blanc", tagline: "", story: "", values: [], palette: {} } };
    const run = <T,>(k: string, fn: () => Promise<T>) => ctx.step(k, fn);
    await aiShopCopyChecked({ userId: "u", projectId: "p-copy", jobId: ctx.job.id, usageKey: `${ctx.job.id}:copy` }, p, undefined, run);
    const paid = { writes, reviews };
    expect(paid.writes).toBeGreaterThan(0);
    await aiShopCopyChecked({ userId: "u", projectId: "p-copy", jobId: ctx.job.id, usageKey: `${ctx.job.id}:copy` }, p, undefined, run);
    expect({ writes, reviews }).toEqual(paid);
  });
});
