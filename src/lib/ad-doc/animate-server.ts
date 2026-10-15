/**
 * Export vidéo (MP4) d'une publication animée : chaque image est dessinée par le moteur commun (render.ts) avec les
 * calques animés (animate.ts), puis encodée par ffmpeg. Gratuit (aucune IA) ; 7 s, 30 images/s, en boucle propre.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import { ensureFonts } from "../media/fonts";
import { TOOL_TIMEOUT_MS } from "../exec-tool";
import { renderDoc, type RenderEnv } from "./render";
import { serverFont } from "./server";
import { ANIM_DURATION_S, animatedLayers, backdropZoom, isAnimatedLayer, type AnimStyle } from "./animate";
import type { AdDocument } from "./types";
import type { SongStyle } from "../media/song";

export type AnimOptions = { style?: AnimStyle; durationS?: number; fps?: number; scale?: number };

/** Une image de l'animation (aperçu, contrôle, tests). */
export function drawAnimatedFrame(ctx: any, doc: AdDocument, images: RenderEnv["images"], style: AnimStyle, t: number, backdrop: Backdrop, durationS = ANIM_DURATION_S) {
  const W = doc.width;
  const H = doc.height;
  const z = backdropZoom(style, t, durationS);
  ctx.fillStyle = doc.background;
  ctx.fillRect(0, 0, W, H);
  // Seule la photo de fond avance (effet caméra) ; voiles, cartes et cadres restent en place sous le texte.
  ctx.drawImage(backdrop.photo, (W - W * z) / 2, (H - H * z) / 2, W * z, H * z);
  ctx.drawImage(backdrop.rest, 0, 0, W, H);
  renderDoc(ctx, { ...doc, layers: animatedLayers(doc, style, t) }, { font: serverFont, images }, () => true);
}

type Backdrop = { photo: any; rest: any };
/** Décor rendu une seule fois : la photo de fond (traitée) d'un côté, voiles, cartes et cadres de l'autre. */
export function renderBackdrop(doc: AdDocument, images: RenderEnv["images"]): Backdrop {
  const photo = createCanvas(doc.width, doc.height);
  renderDoc(photo.getContext("2d"), { ...doc, layers: doc.layers.filter((l) => l.role === "background") }, { font: serverFont, images });
  const rest = createCanvas(doc.width, doc.height);
  renderDoc(rest.getContext("2d"), doc, { font: serverFont, images }, (l) => l.role !== "background" && !isAnimatedLayer(l));
  return { photo, rest };
}

export async function renderAnimatedDoc(doc: AdDocument, images: RenderEnv["images"], outFile: string, o: AnimOptions = {}): Promise<{ file: string; durationS: number; width: number; height: number }> {
  ensureFonts();
  const style = o.style ?? "pop";
  const durationS = o.durationS ?? ANIM_DURATION_S;
  const fps = o.fps ?? 30;
  const scale = o.scale ?? 1;
  const OW = Math.round((doc.width * scale) / 2) * 2;
  const OH = Math.round((doc.height * scale) / 2) * 2;
  const frames = Math.round(durationS * fps);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", `${OW}x${OH}`, "-r", String(fps), "-i", "pipe:0", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-profile:v", "high", "-movflags", "+faststart", outFile], { stdio: ["pipe", "ignore", "pipe"] });
  let stderr = "";
  ff.stderr.on("data", (d) => (stderr = (stderr + d.toString()).slice(-2000)));
  const timer = setTimeout(() => ff.kill("SIGKILL"), TOOL_TIMEOUT_MS);
  const done = new Promise<void>((res, rej) => {
    ff.on("error", rej);
    ff.on("close", (code) => (clearTimeout(timer), code === 0 ? res() : rej(new Error(`encodage vidéo impossible (ffmpeg ${code}) : ${stderr.slice(-300)}`))));
  });
  let ffError: unknown = null;
  done.catch((e) => (ffError = e));
  ff.stdin.on("error", () => {});
  const backdrop = renderBackdrop(doc, images);
  const canvas = createCanvas(OW, OH);
  const ctx = canvas.getContext("2d");
  try {
    for (let i = 0; i < frames; i++) {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      drawAnimatedFrame(ctx, doc, images, style, i / fps, backdrop, durationS);
      if (ffError) throw ffError;
      if (!ff.stdin.write(canvas.data())) await Promise.race([new Promise((r) => ff.stdin.once("drain", r)), done.catch(() => {})]);
    }
  } finally {
    ff.stdin.end();
  }
  await done;
  return { file: outFile, durationS, width: OW, height: OH };
}

/**
 * Version animée d'une création du projet (dernière version de sa lignée) : vidéo MP4 enregistrée dans la
 * bibliothèque (Vidéos › Réseaux sociaux), liée à l'image d'origine. Gratuit : aucun appel à l'IA.
 */
/**
 * Ajoute la musique composée par le studio (droits du studio, style du produit ou du métier) à une vidéo muette ;
 * à défaut de banque d'instruments, la musique de secours synthétisée. Fondu en fin pour une boucle propre.
 */
export async function addStudioMusic(video: string, out: string, durationS: number, music: { style: SongStyle; seed: string }): Promise<string> {
  const { renderSong } = await import("../media/song");
  const { synthMusic } = await import("../media/video");
  const { execTool } = await import("../exec-tool");
  const wav = `${out}.wav`;
  fs.writeFileSync(wav, (await renderSong(music.style, durationS, music.seed).catch(() => null)) ?? synthMusic(durationS, "calm", []));
  await execTool("ffmpeg", ["-y", "-v", "error", "-i", video, "-i", wav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-af", `volume=-6dB,afade=t=out:st=${Math.max(0, durationS - 0.8)}:d=0.8`, "-t", String(durationS), "-movflags", "+faststart", out]);
  fs.rmSync(wav, { force: true });
  return out;
}

export async function animateDocToAsset(projectId: string, userId: string, docKey: string, style: AnimStyle, o: { music?: boolean } = {}) {
  const { latestDoc, docImages } = await import("./store");
  const { saveAsset } = await import("../library");
  const { tmpDir } = await import("../storage");
  const { L } = await import("../i18n-server");
  const cur = latestDoc(projectId, docKey);
  if (!cur) return null;
  const dir = tmpDir("anim");
  try {
    const out = await renderAnimatedDoc(cur.doc, await docImages(projectId, cur.doc), path.join(dir, "post.mp4"), { style });
    // Avec musique (choix du client, par défaut) : morceau composé par le studio dans le style du projet.
    const music = o.music !== false;
    if (music) {
      const { loadProject } = await import("../projects");
      const { songStyleFor } = await import("../media/song");
      const p = loadProject(projectId);
      out.file = await addStudioMusic(out.file, path.join(dir, "post-music.mp4"), out.durationS, { style: songStyleFor(p), seed: `${p.id}:${docKey}` });
    }
    const title = (cur.doc.layers.find((l) => l.role === "title" && l.kind === "text") as { text?: string } | undefined)?.text ?? "";
    const slug = title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "publication";
    return await saveAsset({ projectId, userId, data: fs.readFileSync(out.file), name: `${slug}-${L("animee", "animated")}.mp4`, mime: "video/mp4", role: "social", folderKey: "videos.social", origin: "generated", sourceAssetId: cur.version.renderedAssetId ?? null, meta: { animatedPost: { docKey, style, version: cur.version.version, music }, recipe: L("Publication animée par le studio (sans IA) : arrivée du texte, bouton qui bat, photo qui avance", "Post animated by the studio (no AI): text entrance, pulsing button, slow photo push-in") } });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
