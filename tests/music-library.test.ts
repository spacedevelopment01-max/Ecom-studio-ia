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

  it("style du métier : une piste n'est gardée que si elle cite un genre du style (folk pour un artisan)", async () => {
    vi.stubEnv("STOCK_OFFLINE", "0");
    vi.stubGlobal("fetch", api([track("metal", { tags: [{ name: "metal" }, { name: "rock" }], genres: ["metal"] }), track("folk", { tags: [{ name: "folk" }, { name: "acoustic" }], genres: ["folk"] })]));
    expect((await searchStockMusic("pulse", 15, new Set(), "acoustic")).map((t) => t.id)).toEqual(["folk"]);
  });

  it("Jamendo : format mp32 accepté, morceaux chantés écartés, instrumental pensé pour la publicité en premier", async () => {
    vi.stubEnv("STOCK_OFFLINE", "0");
    vi.stubGlobal("fetch", api([
      track("chante", { filetype: "mp32", tags: [{ name: "vocal" }, { name: "happy" }], genres: ["pop"] }),
      track("simple", { filetype: "mp32", tags: [{ name: "happy" }], genres: ["pop"] }),
      track("pub", { filetype: "mp32", tags: [{ name: "instrumental" }, { name: "advertising" }, { name: "upbeat" }], genres: ["pop"] }),
      track("hard", { filetype: "mp32", tags: [{ name: "instrumental" }], genres: ["hardcore"] }),
    ]));
    const r = await searchStockMusic("pulse", 15, new Set(), "pop");
    expect(r.map((t) => t.id)).toEqual(["pub", "simple"]);
    expect(r[0].filetype).toBe("mp3");
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

describe("piste de la banque : introduction calme sautée", async () => {
  const { mixAudio } = await import("@/lib/video-v2/audio");
  const { musicStart } = await import("@/lib/stock/music");
  const { execFileSync } = await import("node:child_process");
  const fs = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  it("le passage utilisé commence là où le morceau est lancé", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "intro-"));
    const track = path.join(dir, "piste.wav");
    // 6 s presque silencieuses, puis 24 s de musique pleine.
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "sine=f=220:d=6", "-f", "lavfi", "-i", "sine=f=440:d=24", "-filter_complex", "[0]volume=0.01[a];[1]volume=0.8[b];[a][b]concat=n=2:v=0:a=1", track]);
    const start = await musicStart(track);
    expect(start).toBeGreaterThanOrEqual(4);
    expect(start).toBeLessThanOrEqual(8);
    const doc = { clips: [{ id: "c1", durationS: 4 }], audio: { voice: [], sfx: [], music: { source: "library", assetId: "m", licence: "CC BY 4.0", gainDb: 0, startS: start }, duckingDb: -10, loudnessLufs: -14 } } as any;
    const out = await mixAudio(doc, { voice: new Map(), sfx: new Map(), music: track }, path.join(dir, "mix.wav"));
    const stats = execFileSync("ffmpeg", ["-v", "error", "-t", "1.5", "-i", out, "-af", "astats=metadata=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-", "-f", "null", "-"]).toString();
    const rms = Number(stats.match(/RMS_level=(-?[\d.]+)/g)!.at(-1)!.split("=")[1]);
    expect(rms).toBeGreaterThan(-30); // la musique est déjà pleine au début de la vidéo
    fs.rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});
