/**
 * Banque de musiques libres de droits (Openverse) : licences commerciales seulement (jamais NC ni ND), pas d'effets
 * sonores ni d'ambiances angoissantes, pistes assez longues, licence et mention enregistrées avec la piste, piste
 * réutilisée ensuite sans nouvelle recherche. Réseau simulé.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("musique libre de droits pour les vidéos", async () => {
  const { usableLicense, searchStockMusic, projectMusic, musicCredit } = await import("@/lib/stock/music");
  const { createUser } = await import("@/lib/auth");
  const { loadProject } = await import("@/lib/projects");
  const { getAsset } = await import("@/lib/library");
  const { seedImageFixture } = await import("./image-v2-fixtures");

  const track = (id: string, o: Record<string, unknown> = {}) => ({ id, title: `Piste ${id}`, creator: "Auteur", license: "by", license_version: "4.0", license_url: "https://creativecommons.org/licenses/by/4.0/", foreign_landing_url: `https://www.jamendo.com/track/${id}`, url: `https://cdn.test/${id}.mp3`, provider: "jamendo", duration: 120_000, filetype: "mp3", filesize: 3_000_000, tags: [{ name: "upbeat" }], genres: ["pop"], ...o });
  const api = (results: unknown[]) =>
    vi.fn(async (url: string) =>
      url.includes("api.openverse.org") ? new Response(JSON.stringify({ results }), { status: 200, headers: { "content-type": "application/json" } }) : new Response(new Uint8Array(60_000), { status: 200, headers: { "content-type": "audio/mpeg" } }),
    );

  it("licences : usage commercial et modification autorisés seulement", () => {
    expect(usableLicense("cc0")).toBe("CC0");
    expect(usableLicense("by", "4.0")).toBe("CC BY 4.0");
    expect(usableLicense("by-sa", "3.0")).toBe("CC BY-SA 3.0");
    expect(usableLicense("by-nc", "4.0")).toBeNull();
    expect(usableLicense("by-nd", "4.0")).toBeNull();
    expect(usableLicense("by-nc-sa", "3.0")).toBeNull();
  });

  it("recherche : écarte NC, effets sonores, ambiances sombres et pistes trop courtes", async () => {
    vi.stubEnv("STOCK_OFFLINE", "0");
    vi.stubGlobal("fetch", api([track("nc", { license: "by-nc" }), track("sfx", { title: "Whoosh sound effect" }), track("dark", { tags: [{ name: "dark" }, { name: "horror" }] }), track("court", { duration: 9_000 }), track("ok")]));
    const r = await searchStockMusic("pulse", 15);
    expect(r.map((t) => t.id)).toEqual(["ok"]);
    expect(r[0].license).toBe("CC BY 4.0");
    expect(musicCredit(r[0])).toMatch(/Piste ok.*Auteur.*CC BY 4\.0/);
  });

  it("projet : la piste est gardée avec sa licence et sa mention, puis réutilisée sans nouvelle recherche", async () => {
    vi.stubEnv("STOCK_OFFLINE", "0");
    const u = await createUser(`music-${Date.now()}@test.fr`, "motdepasse-test", "M");
    const p = loadProject(seedImageFixture(u.id, "artisan"));
    const f = api([track("t1")]);
    vi.stubGlobal("fetch", f);
    const a = await projectMusic(p, "pulse", 15);
    expect(a?.licence).toBe("CC BY 4.0");
    expect(a?.credit).toMatch(/jamendo\.com\/track\/t1/);
    const meta = JSON.parse(String(getAsset(a!.assetId)!.meta));
    expect(meta.stockMusic.license).toBe("CC BY 4.0");
    const calls = f.mock.calls.length;
    const b = await projectMusic(p, "pulse", 15);
    expect(b?.assetId).toBe(a!.assetId);
    expect(f.mock.calls.length).toBe(calls);
  });

  it("hors ligne : aucune piste (la musique composée du studio prend le relais)", async () => {
    vi.stubEnv("STOCK_OFFLINE", "1");
    expect(await searchStockMusic("calm", 15)).toEqual([]);
  });
});
