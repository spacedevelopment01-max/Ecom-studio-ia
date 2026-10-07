/**
 * Image d'ambiance ratée : refaite une fois avec les défauts relevés dans la consigne ; le raté n'est pas livré.
 * Consignes sans mains ni personnes (premier défaut des IA d'images).
 */
import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";

const prompts: string[] = [];
vi.mock("@/lib/stock/photos", () => ({ searchStock: async () => [], downloadStock: async () => Buffer.alloc(0), stockCredit: () => "" }));
vi.mock("@/lib/ai/media-providers", () => ({
  imageProviderAvailable: () => "openai",
  ambianceImage: vi.fn(async (_ctx: unknown, req: { prompt: string }) => {
    prompts.push(req.prompt);
    return sharp({ create: { width: 64, height: 64, channels: 3, background: "#888" } }).png().toBuffer();
  }),
  refundMediaQuota: vi.fn(),
}));
vi.mock("@/lib/ai/llm", async (orig) => ({ ...(await orig<object>()), llmConfigured: () => true }));
let reviews = 0;
let nextReview = (n: number): any => (n === 0 ? { ok: false, score: 6, issues: ["lettres illisibles sur un panneau"] } : { ok: true, score: 8, issues: [] });
vi.mock("@/lib/ai/tasks", async (orig) => ({
  ...(await orig<object>()),
  aiQcScene: vi.fn(async () => nextReview(reviews++)),
}));
vi.mock("@/lib/library", async (orig) => ({ ...(await orig<object>()), saveAsset: vi.fn(async (a: any) => ({ id: "asset-1", ...a })) }));

const { postAmbiance, ambianceSlots } = await import("@/lib/engine/service-media");
const { emptyProduct, emptyServiceProfile } = await import("@/lib/project-types");
const project: any = {
  id: "p", userId: "u", name: "Blanc", business: "services",
  product: { ...emptyProduct(), name: "Sébastien Blanc", category: "Plâtrerie peinture", summary: "Plâtrerie et peinture." },
  brand: { name: "Sébastien Blanc", tagline: "", story: "", palette: { primary: "#446274", secondary: "#D0D8DD", accent: "#446274", light: "#F2F5F7", dark: "#14181F" } },
  services: { ...emptyServiceProfile(), services: [{ name: "Peinture", description: "Intérieur." }, { name: "Carrelage", description: "Sols." }], area: "Ain" },
};

describe("image ratée refaite une fois", () => {
  it("défaut corrigeable (6/10, défaut précis) : repris dans la consigne ; c'est la reprise validée (FINAL) qui est livrée", async () => {
    const a = await postAmbiance({ userId: "u", projectId: "p", jobId: "j" }, project, { key: "k", topic: "Rénover un plafond", aspect: "1:1", name: "x.jpg" });
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toMatch(/lettres illisibles sur un panneau/);
    expect(a?.status).toBe("review");
    expect((a as any).meta.gate.verdict).toBe("FINAL");
  });
  it("mauvaise direction (3/10) : abandon sans nouvelle image payée ; rien n'est livré pour la publication", async () => {
    prompts.length = 0;
    reviews = 0;
    nextReview = () => ({ ok: false, score: 3, issues: ["sujet hors métier"] });
    const a = await postAmbiance({ userId: "u", projectId: "p", jobId: "j" }, project, { key: "k2", topic: "Rénover un plafond", aspect: "1:1", name: "y.jpg" });
    expect(prompts).toHaveLength(1);
    expect(a).toBeNull();
  });
  it("contrôle en panne : jamais livrée comme validée, aucune nouvelle image payée", async () => {
    prompts.length = 0;
    reviews = 0;
    nextReview = () => {
      throw new Error("délai dépassé");
    };
    const a = await postAmbiance({ userId: "u", projectId: "p", jobId: "j" }, project, { key: "k3", topic: "Rénover un plafond", aspect: "1:1", name: "z.jpg" });
    expect(prompts).toHaveLength(1);
    expect(a).toBeNull();
  });
  it("consignes d'ambiance : aucune main ni personne demandée", () => {
    for (const s of ambianceSlots(project)) expect(s.prompt).not.toMatch(/skilled hands|professional's hands|professional at work/i);
    expect(ambianceSlots(project).filter((s) => s.slot !== "hero").every((s) => /no people|nobody in frame/i.test(s.prompt))).toBe(true);
  });
});
