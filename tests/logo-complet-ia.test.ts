/**
 * Logo complet dessiné par l'IA d'images : brief détaillé du directeur artistique, nom vérifié lettre par lettre ;
 * un nom mal écrit est redessiné une fois avec le défaut précis, le raté n'est ni proposé ni décompté ; barrière de
 * qualité : seul un logo FINAL (8/10, nom exact) peut être appliqué automatiquement, les essais refusés ne sont
 * jamais proposés et un logo non validé porte toujours un avertissement explicite.
 */
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const prompts: string[] = [];
const refunds: string[] = [];
let qcCalls = 0;
let nextQc = (n: number): any => (n === 0 ? { text: "Sebastein Blanc", nameExact: false, extraText: false, score: 7, issues: [] } : { text: "Sébastien Blanc", nameExact: true, extraText: false, score: 8, issues: [] });
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
    return nextQc(qcCalls++);
  }),
}));
vi.mock("@/lib/ai/context", () => ({ projectContext: () => "" }));
vi.mock("@/lib/projects", async (orig) => ({ ...(await orig<object>()), loadProject: () => ({ id: "p", userId: "u", name: "Blanc", brand: { name: "Sébastien Blanc", palette: { primary: "#8A3B26" }, direction: "atelier" } }) }));
const saved: any[] = [];
vi.mock("@/lib/library", async (orig) => ({ ...(await orig<object>()), saveAsset: vi.fn(async (a: any) => (saved.push(a), { id: `a${saved.length}`, ...a })) }));

const { generateFullLogos } = await import("@/lib/engine/full-logo");

describe("logo complet par l'IA d'images", () => {
  it("nom mal écrit → une reprise avec le défaut précis ; seule la version correcte (FINAL) est proposée, sans avertissement", async () => {
    const out = await generateFullLogos(null, "p");
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toMatch(/written "Sebastein Blanc" instead of "Sébastien Blanc"/);
    expect(refunds).toHaveLength(1);
    expect(out).toHaveLength(1);
    expect(saved[1]).toMatchObject({ role: "logo-ai-full", mime: "image/png" });
    const meta = JSON.parse(out[0].meta as any);
    expect(meta.gate).toMatchObject({ verdict: "FINAL" });
    expect(meta.qcWarning).toBeUndefined();
    expect(out[0].status).not.toBe("rejected");
    // Fond transparent gardé, recadré avec une marge.
    const m = await sharp(saved[1].data).metadata();
    expect(m.hasAlpha).toBe(true);
    expect(m.width).toBe(180);
  });

  it("logo noté 4,4 puis 5,9 sans défaut cité : refusé, jamais proposé ni appliqué", async () => {
    prompts.length = 0;
    qcCalls = 0;
    nextQc = (n) => ({ text: "Sébastien Blanc", nameExact: true, extraText: false, score: n === 0 ? 4.4 : 5.9, issues: [] });
    const out = await generateFullLogos(null, "p", { autoApply: true });
    expect(out).toHaveLength(0);
    expect(prompts).toHaveLength(1); // pas de reprise « à l'aveugle » sans diagnostic
  });

  it("logo 8,5 avec le nom mal écrit, deux fois : jamais FINAL, refusé (aucune proposition)", async () => {
    prompts.length = 0;
    qcCalls = 0;
    nextQc = () => ({ text: "Sebastien Blan", nameExact: false, extraText: false, score: 8.5, issues: [] });
    const out = await generateFullLogos(null, "p", { autoApply: true });
    expect(prompts).toHaveLength(2);
    expect(out).toHaveLength(0);
  });

  it("logo 7,2 avec défauts cités puis 7,5 : non validé → proposé avec un avertissement explicite, jamais appliqué automatiquement", async () => {
    prompts.length = 0;
    qcCalls = 0;
    nextQc = (n) => ({ text: "Sébastien Blanc", nameExact: true, extraText: false, score: n === 0 ? 7.2 : 7.5, issues: ["symbole générique"] });
    const out = await generateFullLogos(null, "p", { autoApply: true });
    expect(prompts).toHaveLength(2);
    // Après la reprise, la note reste sous 8 et plus aucune reprise : refusé (logo_full n'a pas de statut provisoire).
    expect(out).toHaveLength(0);
  });

  it("contrôle en panne : jamais FINAL ni appliqué ; logo à vérifier avec avertissement, aucune nouvelle génération", async () => {
    prompts.length = 0;
    qcCalls = 0;
    nextQc = () => {
      throw new Error("délai dépassé");
    };
    const out = await generateFullLogos(null, "p", { autoApply: true });
    expect(prompts).toHaveLength(1);
    expect(out).toHaveLength(1);
    const meta = JSON.parse(out[0].meta as any);
    expect(meta.gate.verdict).toBe("RETRY");
    expect(meta.qcWarning).toMatch(/contrôle en panne/);
  });
});
