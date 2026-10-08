/**
 * Documents vidéo V2 : versions (comme l'éditeur publicitaire — chaque enregistrement est une version, restaurer
 * recopie une ancienne version, rien n'est perdu), mémoire des plans produits (un plan FINAL payé est réutilisé,
 * jamais repayé), validation des documents reçus, chargement des médias et export (MP4, SRT, VTT, affiche, JSON).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { all, id, json, now, one, run } from "../db";
import { assetData, getAsset, saveAsset } from "../library";
import { loadDocImages } from "../ad-doc/server";
import { AdDocumentSchema, LayerSchema } from "../ad-doc/store";
import { tmpDir } from "../storage";
import { mixAudio, measureAudio, synthTrack, type AudioMeasure } from "./audio";
import { renderStill, renderVideoDoc, type VideoSources } from "./render";
import { toSrt, toVtt } from "./doc";
import type { ShotMethod, VideoDocument } from "./types";

export type VideoVersion = { id: string; docKey: string; version: number; source: VideoDocument["meta"]["source"]; note: string; renderedAssetId: string | null; createdAt: number };

/** Lignée stable d'une vidéo du moteur (projet × intention × format × plateforme). */
export const engineVideoKey = (projectId: string, intent: string, aspect: string, platform: string) => `vid:${crypto.createHash("sha256").update(`${projectId}|${intent}|${aspect}|${platform}`).digest("hex").slice(0, 20)}`;

// ---------------------------------------------------------------- validation (document reçu de l'interface)

const num = z.number().finite();
const transition = z.object({ kind: z.enum(["cut", "fade", "slide", "zoom", "wipe"]), durationS: num.min(0).max(3) });
const camera = z.enum(["static", "push_in", "pull_out", "pan_left", "pan_right", "tilt_up", "orbit", "handheld"]);
const source = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("image"), assetId: z.string().max(40), motion: camera, crop: z.object({ x: num, y: num, w: num, h: num }).nullable() }),
  z.object({ kind: z.literal("video"), assetId: z.string().max(40), inS: num.min(0), outS: num.min(0), muted: z.boolean() }),
  z.object({ kind: z.literal("doc"), doc: AdDocumentSchema, animate: z.enum(["rise", "fade", "none"]) }),
  z.object({ kind: z.literal("color"), color: z.string().max(64) }),
]);
const part = z.enum(["hook", "development", "demonstration", "proof", "conclusion", "cta"]).nullable();
const audioClip = z.object({ id: z.string().max(60), clipId: z.string().max(40), assetId: z.string().max(40).nullable(), text: z.string().max(600), offsetS: num, durationS: num.min(0), gainDb: num });
export const VideoDocumentSchema = z.object({
  version: num,
  width: num.min(100).max(4000),
  height: num.min(100).max(4000),
  fps: num.min(1).max(60),
  aspect: z.enum(["9:16", "16:9", "1:1", "4:5"]),
  platform: z.enum(["tiktok", "reels", "shorts", "meta_feed", "youtube", "linkedin", "shop_page", "website"]),
  safe: z.object({ top: num, bottom: num, side: num }),
  clips: z.array(z.object({ id: z.string().min(1).max(40), shotId: z.string().max(40), label: z.string().max(80), part, durationS: num.min(0.5).max(60), source, overlays: z.array(LayerSchema).max(20), transitionIn: transition, generated: z.boolean().optional(), userEdited: z.boolean().optional() })).min(1).max(120),
  subtitles: z.object({
    style: z.object({ enabled: z.boolean(), family: z.string().max(60), weight: num, size: num.min(8).max(400), color: z.string().max(64), background: z.string().max(64).nullable(), position: z.enum(["bottom", "middle", "top"]), offsetY: num, maxChars: num.min(8).max(80), uppercase: z.boolean() }),
    cues: z.array(z.object({ id: z.string().max(60), clipId: z.string().max(40), fromS: num.min(0), toS: num.min(0), text: z.string().max(200) })).max(600),
  }),
  audio: z.object({
    voice: z.array(audioClip).max(200),
    voiceId: z.string().max(60).nullable(),
    music: z.union([z.object({ source: z.literal("synth"), mood: z.enum(["calm", "pulse", "warm", "none"]), gainDb: num }), z.object({ source: z.literal("library"), assetId: z.string().max(40), licence: z.string().min(1).max(200), gainDb: num }), z.null()]),
    sfx: z.array(audioClip).max(100),
    duckingDb: num,
    loudnessLufs: num.min(-30).max(-8),
  }),
  brand: z.object({ palette: z.record(z.string(), z.string().max(64)), fonts: z.object({ heading: z.string().max(60), body: z.string().max(60) }), name: z.string().max(120) }),
  disclosure: z.string().max(80).nullable(),
  meta: z.object({ intent: z.string().max(40), source: z.enum(["engine", "user", "ai_local", "ai"]), createdFrom: z.string().max(60).nullable(), runId: z.string().max(60).nullable() }),
});

/** Médias référencés par le document (images, vidéos, voix, musique, calques) — tous de la bibliothèque. */
export function referencedAssets(doc: VideoDocument): string[] {
  const ids = new Set<string>();
  for (const c of doc.clips) {
    if (c.source.kind === "image" || c.source.kind === "video") ids.add(c.source.assetId);
    if (c.source.kind === "doc") for (const l of c.source.doc.layers) if (l.kind === "image" && l.assetId) ids.add(l.assetId);
    for (const l of c.overlays) if (l.kind === "image" && l.assetId) ids.add(l.assetId);
  }
  for (const v of [...doc.audio.voice, ...doc.audio.sfx]) if (v.assetId) ids.add(v.assetId);
  if (doc.audio.music?.source === "library") ids.add(doc.audio.music.assetId);
  return [...ids];
}

/** Aucun média d'un autre projet ni supprimé (jamais d'adresse externe). */
export function foreignVideoAssets(projectId: string, doc: VideoDocument): string[] {
  return referencedAssets(doc).filter((x) => {
    const a = getAsset(x);
    return !a || a.project_id !== projectId || !!a.deleted_at;
  });
}

// ---------------------------------------------------------------- versions

export function saveVideoVersion(projectId: string, docKey: string, doc: VideoDocument, o: { note?: string; renderedAssetId?: string | null } = {}): VideoVersion {
  const version = (one<{ v: number }>("SELECT MAX(version) v FROM video_documents WHERE doc_key = ?", docKey)?.v ?? 0) + 1;
  const vid = id();
  run("INSERT INTO video_documents (id, project_id, doc_key, version, source, note, doc_json, rendered_asset_id, created_at) VALUES (?,?,?,?,?,?,?,?,?)", vid, projectId, docKey, version, doc.meta.source, (o.note ?? "").slice(0, 200), JSON.stringify(doc), o.renderedAssetId ?? null, now());
  return { id: vid, docKey, version, source: doc.meta.source, note: o.note ?? "", renderedAssetId: o.renderedAssetId ?? null, createdAt: now() };
}

const rowVersion = (r: any): VideoVersion => ({ id: r.id, docKey: r.doc_key, version: r.version, source: r.source, note: r.note, renderedAssetId: r.rendered_asset_id, createdAt: r.created_at });

export function latestVideo(projectId: string, docKey: string): { doc: VideoDocument; version: VideoVersion } | null {
  const r = one<any>("SELECT * FROM video_documents WHERE project_id = ? AND doc_key = ? ORDER BY version DESC LIMIT 1", projectId, docKey);
  return r ? { doc: json<VideoDocument>(r.doc_json, null as never), version: rowVersion(r) } : null;
}

export function videoVersionDoc(projectId: string, docKey: string, version: number): VideoDocument | null {
  const r = one<{ doc_json: string }>("SELECT doc_json FROM video_documents WHERE project_id = ? AND doc_key = ? AND version = ?", projectId, docKey, version);
  return r ? json<VideoDocument>(r.doc_json, null as never) : null;
}

export function listVideoVersions(projectId: string, docKey: string): VideoVersion[] {
  return all<any>("SELECT id, doc_key, version, source, note, rendered_asset_id, created_at FROM video_documents WHERE project_id = ? AND doc_key = ? ORDER BY version DESC", projectId, docKey).map(rowVersion);
}

/** Le client a-t-il modifié cette vidéo ? (Une régénération ne doit alors jamais l'écraser.) */
export function videoUserOwned(projectId: string, docKey: string): boolean {
  return !!one("SELECT 1 FROM video_documents WHERE project_id = ? AND doc_key = ? AND source IN ('user','ai_local','ai')", projectId, docKey);
}

export function restoreVideoVersion(projectId: string, docKey: string, version: number): VideoVersion {
  const doc = videoVersionDoc(projectId, docKey, version);
  if (!doc) throw new Error("version introuvable");
  return saveVideoVersion(projectId, docKey, { ...doc, meta: { ...doc.meta, source: "user" } }, { note: `restauration de la version ${version}` });
}

export function duplicateVideo(projectId: string, docKey: string): { docKey: string; version: VideoVersion } {
  const cur = latestVideo(projectId, docKey);
  if (!cur) throw new Error("vidéo introuvable");
  const key = `vid:${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  return { docKey: key, version: saveVideoVersion(projectId, key, { ...cur.doc, meta: { ...cur.doc.meta, source: "user", createdFrom: docKey } }, { note: `copie de ${docKey}` }) };
}

// ---------------------------------------------------------------- plans produits (réutilisation)

export type ShotMemo = { assetId: string | null; method: ShotMethod; verdict: string; provider: string | null; model: string | null; costMicro: number; attempts: number; reason: string };

export const shotKey = (x: unknown) => crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 24);

export function shotMemo(projectId: string, key: string): ShotMemo | null {
  const r = one<any>("SELECT * FROM video_shots WHERE project_id = ? AND shot_key = ?", projectId, key);
  if (!r) return null;
  const a = r.asset_id ? getAsset(r.asset_id) : null;
  // Un plan supprimé ou refusé par le client n'est jamais réutilisé.
  if (r.asset_id && (!a || a.deleted_at || a.status === "rejected")) return null;
  return { assetId: r.asset_id, method: r.method, verdict: r.verdict, provider: r.provider, model: r.model, costMicro: r.cost_micro, attempts: r.attempts, reason: r.reason };
}

export function rememberShot(projectId: string, key: string, m: ShotMemo) {
  run(
    "INSERT INTO video_shots (project_id, shot_key, asset_id, method, verdict, provider, model, cost_micro, attempts, reason, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(project_id, shot_key) DO UPDATE SET asset_id = excluded.asset_id, method = excluded.method, verdict = excluded.verdict, provider = excluded.provider, model = excluded.model, cost_micro = excluded.cost_micro, attempts = excluded.attempts, reason = excluded.reason",
    projectId, key, m.assetId, m.method, m.verdict, m.provider, m.model, m.costMicro, m.attempts, m.reason.slice(0, 300), now(),
  );
}

// ---------------------------------------------------------------- médias et export

/** Images, vidéos et pistes audio du document, lues dans la bibliothèque du projet (fichiers temporaires). */
export async function loadVideoSources(projectId: string, doc: VideoDocument, dir: string): Promise<VideoSources & { voice: Map<string, string>; sfx: Map<string, string>; music: string | null }> {
  const images = new Map<string, Buffer>();
  const videos = new Map<string, string>();
  const write = (assetId: string, ext: string) => {
    const a = getAsset(assetId);
    if (!a || a.project_id !== projectId || a.deleted_at) return null;
    const f = path.join(dir, `${assetId}.${ext}`);
    if (!fs.existsSync(f)) fs.writeFileSync(f, assetData(a));
    return f;
  };
  const img = (assetId: string | null | undefined) => {
    if (!assetId || images.has(assetId)) return;
    const a = getAsset(assetId);
    if (a && a.project_id === projectId && !a.deleted_at) images.set(assetId, assetData(a));
  };
  for (const c of doc.clips) {
    if (c.source.kind === "image") img(c.source.assetId);
    if (c.source.kind === "video") {
      const f = write(c.source.assetId, "mp4");
      if (f) videos.set(c.source.assetId, f);
    }
    if (c.source.kind === "doc") for (const l of c.source.doc.layers) if (l.kind === "image") img(l.assetId);
    for (const l of c.overlays) if (l.kind === "image") img(l.assetId);
  }
  const voice = new Map<string, string>();
  for (const v of doc.audio.voice) if (v.assetId) {
    const f = write(v.assetId, "audio");
    if (f) voice.set(v.id, f);
  }
  const sfx = new Map<string, string>();
  for (const v of doc.audio.sfx) if (v.assetId) {
    const f = write(v.assetId, "audio");
    if (f) sfx.set(v.id, f);
  }
  const m = doc.audio.music;
  const music = m?.source === "library" ? write(m.assetId, "audio") : m?.source === "synth" ? synthTrack(doc, path.join(dir, "music.wav")) : null;
  return { images: await loadDocImages(images), videos, voice, sfx, music };
}

export type ExportOptions = { scale?: number; fps?: number; burnSubtitles?: boolean; onProgress?: (p: number) => void };
export type VideoExport = { file: string; dir: string; durationS: number; width: number; height: number; audio: AudioMeasure; srt: string; vtt: string };

/** Rendu complet (vidéo + audio mixé) dans un dossier temporaire ; l'appelant range ou supprime. */
export async function renderVideoFile(projectId: string, doc: VideoDocument, o: ExportOptions = {}): Promise<VideoExport> {
  const dir = tmpDir("video-v2");
  const src = await loadVideoSources(projectId, doc, dir);
  const mix = await mixAudio(doc, { voice: src.voice, sfx: src.sfx, music: src.music }, path.join(dir, "mix.wav"));
  const audio = await measureAudio(mix);
  const out = path.join(dir, "video.mp4");
  const r = await renderVideoDoc(doc, src, out, { scale: o.scale, fps: o.fps, burnSubtitles: o.burnSubtitles, audioFile: mix, onProgress: o.onProgress });
  return { file: out, dir, durationS: r.durationS, width: r.width, height: r.height, audio, srt: toSrt(doc), vtt: toVtt(doc) };
}

/** Images clés (début de chaque plan + milieu) pour la relecture et l'affiche. */
export async function keyFrames(projectId: string, doc: VideoDocument, max = 6, scale = 0.4): Promise<Buffer[]> {
  const dir = tmpDir("video-v2-keys");
  try {
    const src = await loadVideoSources(projectId, doc, dir);
    let t = 0;
    const times: number[] = [];
    for (const c of doc.clips) {
      times.push(t + Math.min(c.durationS * 0.5, 1.2));
      t += c.durationS;
    }
    const step = Math.max(1, Math.ceil(times.length / max));
    const out: Buffer[] = [];
    for (let k = 0; k < times.length; k += step) out.push(await renderStill(doc, src, times[k], scale));
    return out;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Range la vidéo rendue dans la bibliothèque : MP4, affiche, sous-titres SRT et VTT (modifiables à part). */
export async function saveRendered(projectId: string, userId: string, docKey: string, doc: VideoDocument, ex: VideoExport, meta: Record<string, unknown>): Promise<{ videoId: string; posterId: string; srtId: string; vttId: string }> {
  const folder = doc.platform === "shop_page" ? "videos.shop" : doc.meta.intent === "video_ad" ? "videos.ads" : "videos.social";
  const name = `video-${doc.meta.intent}-${doc.aspect.replace(":", "x")}-${Date.now().toString(36)}`;
  const video = await saveAsset({ projectId, userId, data: fs.readFileSync(ex.file), name: `${name}.mp4`, mime: "video/mp4", role: "video", folderKey: folder, origin: "generated", status: "review", meta: { videoV2: { docKey, intent: doc.meta.intent, platform: doc.platform, aspect: doc.aspect, durationS: ex.durationS, audio: ex.audio }, format: doc.aspect, ...meta } });
  const posterFile = path.join(ex.dir, "poster.jpg");
  const { execFile } = await import("node:child_process");
  await new Promise<void>((res) => execFile("ffmpeg", ["-y", "-v", "error", "-ss", String(Math.min(2, ex.durationS / 3)), "-i", ex.file, "-frames:v", "1", "-q:v", "2", posterFile], () => res()));
  const poster = fs.existsSync(posterFile) ? await saveAsset({ projectId, userId, data: fs.readFileSync(posterFile), name: `${name}-affiche.jpg`, mime: "image/jpeg", role: "video-poster", folderKey: folder, origin: "generated", sourceAssetId: video.id, meta: { videoV2: { docKey } } }) : null;
  const srt = await saveAsset({ projectId, userId, data: Buffer.from(ex.srt, "utf8"), name: `${name}.srt`, mime: "application/x-subrip", kind: "text", role: "subtitles", folderKey: folder, origin: "generated", sourceAssetId: video.id, meta: { videoV2: { docKey }, subtitles: "srt" } });
  const vtt = await saveAsset({ projectId, userId, data: Buffer.from(ex.vtt, "utf8"), name: `${name}.vtt`, mime: "text/vtt", kind: "text", role: "subtitles", folderKey: folder, origin: "generated", sourceAssetId: video.id, meta: { videoV2: { docKey }, subtitles: "vtt" } });
  return { videoId: video.id, posterId: poster?.id ?? "", srtId: srt.id, vttId: vtt.id };
}

export { id as newId };
