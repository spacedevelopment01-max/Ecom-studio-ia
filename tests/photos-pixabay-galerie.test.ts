/**
 * Photos libres : Pixabay est interrogé en premier, avec de grandes pages de résultats en haute définition ; une
 * recherche de galerie réunit beaucoup plus de candidates qu'un emplacement. Fournisseurs simulés, aucun réseau.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/config", async (orig) => {
  const real = await orig<typeof import("@/lib/ai/config")>();
  return { ...real, activeProviderKey: (p: string) => (p === "pixabay" || p === "pexels" ? "cle-de-test" : null) };
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Photos libres : Pixabay d'abord, galerie fournie", async () => {
  const { stockSources, searchStock } = await import("@/lib/stock/photos");

  it("ordre des banques : Pixabay, Pexels, Openverse", () => {
    expect(stockSources()).toEqual(["pixabay", "pexels", "openverse"]);
  });

  it("Pixabay : 60 résultats par page, photos de 1600 px au moins ; une galerie réunit jusqu'à 80 candidates", async () => {
    vi.stubEnv("STOCK_OFFLINE", "0");
    const urls: string[] = [];
    let n = 0;
    vi.stubGlobal("fetch", async (u: string) => {
      urls.push(String(u));
      const hits = Array.from({ length: 30 }, () => ({ id: ++n, largeImageURL: `https://cdn.example/${n}.jpg`, pageURL: `https://pixabay.com/p/${n}`, user: "x", imageWidth: 4000, imageHeight: 2600, tags: "escape room, padlock, key" }));
      return new Response(JSON.stringify({ hits, photos: [], results: [] }), { status: 200 });
    });
    const few = await searchStock(["escape room"], "landscape", "en", new Set());
    expect(urls[0]).toMatch(/^https:\/\/pixabay\.com\/api\//);
    expect(urls[0]).toContain("per_page=60");
    expect(urls[0]).toContain("min_width=1600");
    expect(few.length).toBeGreaterThanOrEqual(12);
    urls.length = 0;
    const many = await searchStock(["escape room", "padlock old key", "vintage keys"], "landscape", "en", new Set(), 80);
    expect(many.length).toBeGreaterThanOrEqual(80);
    expect(many.every((p) => p.source === "pixabay")).toBe(true);
  });
});

describe("Site de services : galerie « En images » avec les photos du métier", async () => {
  const sharp = (await import("sharp")).default;
  const { createUser } = await import("@/lib/auth");
  const { saveAsset } = await import("@/lib/library");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { loadProject, currentTheme } = await import("@/lib/projects");
  const { buildShopV2 } = await import("@/lib/theme-v2/engine");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);

  it("12 photos libres : 7 emplacements + une galerie de 4 à 8 photos sur l'accueil", async () => {
    const u = await createUser(`galerie${Date.now()}@test.fr`, "motdepasse-test", "G");
    const pid = await seedThemeScenario(u.id, "artisan");
    const p = loadProject(pid);
    for (let i = 0; i < 12; i++) {
      const data = await sharp({ create: { width: 64, height: 40, channels: 3, background: { r: 20 * i, g: 90, b: 140 } } }).jpeg().toBuffer();
      await saveAsset({ projectId: pid, userId: p.userId, data, name: `photo-${i}.jpg`, mime: "image/jpeg", role: "lifestyle", folderKey: "images.scenes", origin: "import", meta: { stock: { source: "pixabay", id: String(1000 + i) }, business: "services", slot: `gallery:${i + 1}` }, status: "review" });
    }
    await fr(() => buildShopV2(null, pid));
    const spec = currentTheme(pid)!.spec;
    expect(Object.keys(spec.files).filter((f) => /^es-photo-\d/.test(f)).length).toBe(12);
    const home = JSON.stringify(spec.templates.index);
    const media = Object.values((spec.templates.index as any).sections).find((s: any) => s.type === "v2-media") as any;
    expect(media, home.slice(0, 300)).toBeTruthy();
    const n = Object.keys(media.blocks ?? {}).length;
    expect(n).toBeGreaterThanOrEqual(4);
    expect(n).toBeLessThanOrEqual(8);
  });
});
