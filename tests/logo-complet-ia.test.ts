/**
 * Logo complet dessiné par l'IA d'images : brief détaillé du directeur artistique, nom vérifié lettre par lettre ;
 * un nom mal écrit est redessiné une fois avec le défaut précis, le raté n'est ni gardé ni décompté.
 */
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const prompts: string[] = [];
const refunds: string[] = [];
let qcCalls = 0;
vi.mock("@/lib/ai/media-providers", () => ({
  imageProviderAvailable: () => "openai",
  imageUnavailableReason: () => null,
  refundMediaQuota: (_u: string, k: string) => refunds.push(k),
  fullLogoImage: vi.fn(async (_c: unknown, i: { brief: string; name: string }) => {
    prompts.push(i.brief);
    return sharp({ create: { width: 300, height: 200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: await sharp({ create: { width: 100, height: 60, channels: 4, background: "#8A3B26" } }).png().toBuffer(), left: 100, top: 70 }]).png().toBuffer();
  }),
}));
vi.mock("@/lib/ai/llm", async (orig) => ({
  ...(await orig<object>()),
  llmConfigured: () => true,
  llmJson: vi.fn(async (call: { task: string }) => {
    if (call.task === "logo_symbol") return { logos: [{ concept: "Le fil à plomb", brief: "A plumb line forming an S, deep terracotta #8A3B26, serif wordmark." }] };
    return qcCalls++ === 0 ? { text: "Sebastein Blanc", nameExact: false, extraText: false, score: 7, issues: [] } : { text: "Sébastien Blanc", nameExact: true, extraText: false, score: 8, issues: [] };
  }),
}));
vi.mock("@/lib/ai/context", () => ({ projectContext: () => "" }));
vi.mock("@/lib/projects", async (orig) => ({ ...(await orig<object>()), loadProject: () => ({ id: "p", userId: "u", name: "Blanc", brand: { name: "Sébastien Blanc", palette: { primary: "#8A3B26" }, direction: "atelier" } }) }));
const saved: any[] = [];
vi.mock("@/lib/library", async (orig) => ({ ...(await orig<object>()), saveAsset: vi.fn(async (a: any) => (saved.push(a), { id: `a${saved.length}`, ...a })) }));

const { generateFullLogos } = await import("@/lib/engine/full-logo");

describe("logo complet par l'IA d'images", () => {
  it("nom mal écrit → une reprise avec le défaut précis ; seule la version correcte est gardée, sans avertissement", async () => {
    const out = await generateFullLogos(null, "p");
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toMatch(/written "Sebastein Blanc" instead of "Sébastien Blanc"/);
    expect(refunds).toHaveLength(1);
    expect(out).toHaveLength(1);
    expect(saved[0]).toMatchObject({ role: "logo-ai-full", mime: "image/png" });
    expect(saved[0].meta.qcWarning).toBeUndefined();
    // Fond transparent gardé, recadré avec une marge.
    const m = await sharp(saved[0].data).metadata();
    expect(m.hasAlpha).toBe(true);
    expect(m.width).toBe(180);
  });
});
