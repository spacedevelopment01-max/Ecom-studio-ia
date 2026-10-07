/** Photos libres de droits : lecture des réponses Pexels, Pixabay et Openverse (sans réseau), crédit affiché. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchSource, searchStock, stockCredit } from "@/lib/stock/photos";

vi.mock("@/lib/ai/config", async (orig) => ({ ...(await orig<object>()), activeProviderKey: (p: string) => (p === "pexels" ? "cle-pexels" : null) }));

const reply = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } }));
beforeEach(() => vi.stubEnv("STOCK_OFFLINE", "0"));
afterEach(() => (vi.unstubAllGlobals(), vi.unstubAllEnvs()));

describe("photos libres de droits", () => {
  it("Pexels : photo, auteur, page et lien de téléchargement ; clé envoyée", async () => {
    const f = reply({ photos: [{ id: 1, width: 4000, height: 3000, url: "https://www.pexels.com/photo/1", photographer: "Ana", alt: "peintre au travail", src: { large2x: "https://images.pexels.com/1.jpeg" } }] });
    vi.stubGlobal("fetch", f);
    const r = await searchSource("pexels", "plâtrier", "landscape", "fr");
    expect(r[0]).toMatchObject({ source: "pexels", id: "1", url: "https://images.pexels.com/1.jpeg", author: "Ana" });
    expect((f.mock.calls[0] as any[])[0]).toMatch(/locale=fr-FR/);
    expect((f.mock.calls[0] as any[])[1].headers.Authorization).toBe("cle-pexels");
  });
  it("Openverse : uniquement domaine public / CC0, petites images écartées", async () => {
    const f = reply({ results: [{ id: "a", url: "https://x/a.jpg", width: 2000, height: 1500, license: "cc0", creator: "Bob", foreign_landing_url: "https://x/a" }, { id: "b", url: "https://x/b.jpg", width: 400, height: 300, license: "cc0" }] });
    vi.stubGlobal("fetch", f);
    const r = await searchSource("openverse", "plaster wall", "landscape", "en");
    expect(r.map((x) => x.id)).toEqual(["a"]);
    expect((f.mock.calls[0] as any[])[0]).toMatch(/license=cc0,pdm/);
  });
  it("une banque en panne ne bloque pas les autres ; photos déjà prises écartées", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => (url.includes("pexels") ? new Response("", { status: 500 }) : new Response(JSON.stringify({ results: [{ id: "a", url: "https://x/a.jpg", width: 2000, height: 1500, license: "pdm" }, { id: "c", url: "https://x/c.jpg", width: 2000, height: 1500, license: "cc0" }] }), { status: 200 }))));
    const r = await searchStock(["peinture"], "landscape", "fr", new Set(["openverse:a"]));
    expect(r.map((x) => `${x.source}:${x.id}`)).toEqual(["openverse:c"]);
  });
  it("crédit : source et auteur, et précision que ce n'est pas une photo du client", () => {
    expect(stockCredit({ source: "pexels", author: "Ana", license: "Pexels" })).toMatch(/Pexels.*Ana.*pas une photo de vos réalisations/);
  });
});

describe("publications : photo libre avant l'IA", () => {
  it("une photo libre trouvée → enregistrée pour la publication, aucune image IA payée", async () => {
    vi.resetModules();
    const ai = vi.fn();
    vi.doMock("@/lib/ai/media-providers", () => ({ imageProviderAvailable: () => "openai", ambianceImage: ai, refundMediaQuota: vi.fn() }));
    vi.doMock("@/lib/ai/llm", async (orig) => ({ ...(await orig<object>()), llmConfigured: () => false }));
    const sharp = (await import("sharp")).default;
    const jpg = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#777" } }).jpeg().toBuffer();
    vi.doMock("@/lib/stock/photos", () => ({ searchStock: async () => [{ source: "openverse", id: "z9", url: "https://x/z.jpg", page: "https://x/z", author: "Bob", license: "CC0", width: 2000, height: 2000, alt: "plasterer plastering a ceiling" }], downloadStock: async () => jpg, stockCredit: () => "Photo libre de droits (CC0), Bob" }));
    const saved: any[] = [];
    vi.doMock("@/lib/library", async (orig) => ({ ...(await orig<object>()), saveAsset: vi.fn(async (a: any) => (saved.push(a), { id: "s1", ...a })) }));
    const { postAmbiance } = await import("@/lib/engine/service-media");
    const { emptyProduct, emptyServiceProfile } = await import("@/lib/project-types");
    const p: any = { id: `p-${Date.now()}`, userId: "u", name: "Blanc", business: "services", product: { ...emptyProduct(), category: "Plâtrerie" }, brand: { name: "Blanc", palette: { primary: "#446274", secondary: "#D0D8DD", accent: "#446274", light: "#F2F5F7", dark: "#14181F" } }, services: { ...emptyServiceProfile(), services: [] } };
    const a = await postAmbiance({ userId: "u", projectId: p.id, jobId: "j" }, p, { key: "k", topic: "Rénover un plafond", aspect: "1:1", name: "x.jpg" });
    expect(a?.id).toBe("s1");
    expect(saved[0]).toMatchObject({ role: "post-photo", origin: "import", meta: { stock: { source: "openverse", id: "z9" } } });
    expect(ai).not.toHaveBeenCalled();
  });
});
