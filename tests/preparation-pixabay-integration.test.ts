vi.mock("@/lib/public-download",()=>import("./public-download-double"));
/** API, téléchargements et verdicts simulés ; décodage/rangement/poster réels dans DATA_DIR isolé. */
import fs from "node:fs";
import path from "node:path";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import sharp from "sharp";
const control = vi.hoisted(() => ({ key: true, downloads: 0, searches: 0, accepted: true, data: null as Buffer | null, hits: [] as unknown[] }));
vi.mock("@/lib/ai/config", async original => ({ ...await original<object>(), activeProviderKey: (id: string) => id === "pixabay" && control.key ? "synthetic-key-no-network" : null }));
vi.mock("@/lib/engine/import-link", async original => ({ ...await original<object>(), safeFetch: async (url: string) => {
  control.downloads++;
  return { url, status: 200, type: url.endsWith(".mp4") ? "video/mp4" : "image/png", body: control.data! };
} }));
vi.mock("@/lib/preparation/media-review", async original => {
  const real = await original<typeof import("@/lib/preparation/media-review")>();
  return { ...real, reviewPlacement: async (p: any, _ctx: unknown, _c: unknown, slot: any, asset: any) => {
    const { saveAsset } = await import("@/lib/library");
    const frames = await real.mediaFrames(asset);
    const posterId = asset.kind === "video" ? (await saveAsset({ projectId: p.id, userId: p.userId, data: frames[1], name: "synthetic-poster.jpg", mime: "image/jpeg", role: "video-poster", origin: "generated", sourceAssetId: asset.id })).id : undefined;
    return { ...slot, assetId: asset.id, posterId, reviewed: false, alignment: { status: control.accepted ? "accepted" : "rejected", reason: "Verdict injecté : aucune pertinence créative réelle démontrée." } };
  } };
});
import { collectPixabaySlot } from "@/lib/preparation/pixabay";
import { searchSource } from "@/lib/stock/photos";
import { fixture } from "./preparation-fixtures";
import { validatedBrand, editorialFixture } from "./preparation-mission-fixtures";
import { loadProject } from "@/lib/projects";
import { JobContext, enqueue } from "@/lib/jobs";
import { getAsset, assetData } from "@/lib/library";
import { all, json, DATA_DIR } from "@/lib/db";
import { execTool } from "@/lib/exec-tool";

beforeEach(() => {
  vi.stubEnv("STOCK_OFFLINE", "0");
  control.key = true; control.downloads = 0; control.searches = 0; control.accepted = true;
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    expect(new URL(url).hostname).toBe("pixabay.com");
    control.searches++;
    return new Response(JSON.stringify({ hits: control.hits }), { status: 200 });
  }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const hit = (id: number, video = false) => ({ id, pageURL: `https://pixabay.com/${video ? "videos" : "photos"}/synthetic-${id}/`, user: "Auteur synthétique", tags: "bureau objet lumière", duration: 4, imageWidth: 1600, imageHeight: 1000, largeImageURL: `https://cdn.pixabay.com/test-${id}.png`, videos: { medium: { url: `https://cdn.pixabay.com/test-${id}.mp4`, width: 1280, height: 720 } } });
const ctxFor = (f: Awaited<ReturnType<typeof fixture>>) => new JobContext(enqueue({ userId: f.uid, projectId: f.pid, type: "project.prepare", payload: {}, maxAttempts: 1 }));

it("photo service : fichier réel, provenance/licence, miniature ; reprise sans doublon ni second téléchargement", async () => {
  const f = await fixture("services"); validatedBrand(f.pid, f.input);
  const p = loadProject(f.pid), { content } = await editorialFixture(f.pid);
  const slot = { ...content.slots.find(s => s.kind === "image")!, queries: [`test-photo-${f.pid}`] };
  control.hits = [hit(11)];
  control.data = await sharp({ create: { width: 1600, height: 1000, channels: 3, background: "#d2b897" } }).png().toBuffer();
  const result = await collectPixabaySlot(p, ctxFor(f), content, slot);
  const asset = getAsset(result.assetId!)!;
  expect(asset.kind).toBe("image"); expect(asset.role).toBe("scene"); expect(asset.mime).toBe("image/webp");
  expect(asset.thumb_key).toBeTruthy(); expect((await sharp(assetData(asset)).metadata()).width).toBe(1600);
  expect(json<any>(asset.meta, {}).stock).toMatchObject({ source: "pixabay", id: "11", author: "Auteur synthétique", notClientWork: true, licenseDetails: { standaloneRedistribution: false } });
  expect(result.reviewed).toBe(false);
  await expect(collectPixabaySlot(p, ctxFor(f), content, slot)).rejects.toThrow(/partielle/);
  expect(control.downloads).toBe(1); expect(control.searches).toBe(1);
  expect(all("SELECT id FROM assets WHERE project_id=? AND role='scene'", f.pid)).toHaveLength(1);
  expect(all("SELECT id FROM ai_calls WHERE project_id=?", f.pid)).toEqual([]);
  const cacheFiles = fs.readdirSync(path.join(DATA_DIR, "cache", "stock-search")).filter(x => x.endsWith(".json"));
  expect(cacheFiles.length).toBeGreaterThan(0);
  for (const file of cacheFiles) expect(fs.readFileSync(path.join(DATA_DIR, "cache", "stock-search", file), "utf8")).not.toContain("synthetic-key-no-network");
});

it.each(["products", "services"] as const)("vidéo %s : MP4 décodé, durée, banque vidéo et poster de la vraie séquence", async business => {
  const f = await fixture(business); validatedBrand(f.pid, f.input);
  const { content } = await editorialFixture(f.pid), slot = { ...content.slots.find(s => s.kind === "video")!, queries: [`test-video-${f.pid}`] };
  const file = path.join(DATA_DIR, `synthetic-${f.pid}.mp4`);
  await execTool("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=5", "-t", "4", "-c:v", "libx264", "-pix_fmt", "yuv420p", file]);
  control.data = fs.readFileSync(file); control.hits = [hit(22, true)];
  const result = await collectPixabaySlot(loadProject(f.pid), ctxFor(f), content, slot);
  const a = getAsset(result.assetId!)!, poster = getAsset(result.posterId!)!;
  expect(a.kind).toBe("video"); expect(a.role).toBe("clip"); expect(a.duration).toBeCloseTo(4, 0); expect(a.width).toBe(1280);
  expect(poster.source_asset_id).toBe(a.id); expect((await sharp(assetData(poster)).metadata()).format).toBe("jpeg");
  expect(json<any>(a.meta, {}).stock.page).toContain("pixabay.com/videos/");
  expect(result.playback).toMatchObject({ muted: true, pauseControl: true, reducedMotion: "poster" });
  expect(control.downloads).toBe(1);
});

it("source absente ou résultats insuffisants : aucun fichier de remplissage ni statut final", async () => {
  const f = await fixture("services"); validatedBrand(f.pid, f.input);
  const { content } = await editorialFixture(f.pid), slot = { ...content.slots[0], queries: [`empty-${f.pid}`] };
  control.key = false;
  await expect(collectPixabaySlot(loadProject(f.pid), ctxFor(f), content, slot)).rejects.toThrow(/absent/);
  control.key = true; control.hits = [];
  await expect(collectPixabaySlot(loadProject(f.pid), ctxFor(f), content, slot)).rejects.toThrow(/partielle/);
  expect(control.downloads).toBe(0);
  expect(all("SELECT id FROM assets WHERE project_id=? AND role IN ('clip','scene')", f.pid)).toEqual([]);
});

it("cache de recherche 24 h : une réponse publique persiste, sans requête supplémentaire", async () => {
  control.hits = [hit(33)];
  const query = `cache-${Date.now()}`;
  await searchSource("pixabay", query, "landscape", "fr");
  const reads = control.searches;
  vi.resetModules();
  const restarted = await import("@/lib/stock/photos");
  expect(await restarted.searchSource("pixabay", query, "landscape", "fr")).toHaveLength(1);
  expect(control.searches).toBe(reads);
});
