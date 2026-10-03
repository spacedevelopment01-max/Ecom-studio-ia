/**
 * Production vidéo : découpage (IA ou local) → plans générés facultatifs
 * (contrôlés) → motion design → MP4 + affiche + sous-titres SRT, rangés et
 * réutilisables dans la boutique, les publications et les campagnes.
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { loadImage } from "@napi-rs/canvas";
import sharp from "sharp";
import { assetData, saveAsset, type Asset } from "../library";
import { loadProject } from "../projects";
import { renderVideo, srtFromSpec, checkVideoSpec, VIDEO_SIZES, type VideoFormat, type VideoSpec } from "../media/video";
import { tmpDir } from "../storage";
import { assetsByRole, brandTypo, ensureCutouts, latestAsset, palette } from "./images";
import { localVideoPlan } from "./local";
import { aiVideoPlan, aiQcImage } from "../ai/tasks";
import { llmConfigured } from "../ai/llm";
import { videoProviderAvailable, veoClip, falClip } from "../ai/media-providers";
import type { JobContext } from "../jobs";
import { logoPng } from "../media/logo";

const exec = promisify(execFile);
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "produit";

export type VideoRequest = { format: VideoFormat; goal?: string; useAiClip?: boolean; plan?: VideoSpec; music?: VideoSpec["music"]; url?: string; target?: "ads" | "social" | "shop" };

export async function produceVideo(ctx: JobContext, projectId: string, req: VideoRequest) {
  let project = loadProject(projectId);
  const cutouts = await ensureCutouts(ctx, project);
  if (!cutouts.length) throw new Error("Importez une photo du produit pour créer une vidéo.");
  project = loadProject(projectId);
  const brand = project.brand;
  if (!brand) throw new Error("Définissez la marque avant de produire une vidéo.");
  // Photos en situation d'abord (celles du marchand avant les générées) : elles ouvrent les vidéos.
  const life = assetsByRole(projectId, "lifestyle", 6).filter((a) => a.status !== "rejected").sort((x, y) => Number(y.origin === "upload") - Number(x.origin === "upload")).slice(0, 2);
  const imgs: Asset[] = [...life, ...assetsByRole(projectId, "detail", 2), ...assetsByRole(projectId, "scene", 3)].filter((a) => a.status !== "rejected");
  const descriptions = imgs.map((a) => `${a.role === "lifestyle" ? "produit en situation" : a.role} : ${a.name}`);

  // 1. Plans générés (facultatif, coûteux) : à partir d'une scène réelle.
  const clipDirs: string[][] = [];
  const provider = req.useAiClip ? videoProviderAvailable() : null;
  if (provider && imgs.length) {
    const clipFile = await ctx.step("ai-clip", async () => {
      ctx.progress(0.1, "Génération d'un plan vidéo d'ambiance");
      const scene = imgs.find((a) => a.role === "scene") ?? imgs[0];
      const prompt = `Slow cinematic push-in on the product set, soft light shift, subtle depth of field, ${brand.palette.secondary} tones`;
      const buf = provider === "google"
        ? await veoClip({ userId: project.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:clip` }, { image: assetData(scene), prompt, aspect: req.format === "16:9" ? "16:9" : "9:16" }, (m) => ctx.progress(0.15, m))
        : await falClip({ userId: project.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:clip` }, { image: assetData(scene), prompt }, (m) => ctx.progress(0.15, m));
      const a = await saveAsset({ projectId, userId: project.userId, data: buf, name: `${slug(project.product.name)}-plan-genere.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "generated", sourceAssetId: scene.id, meta: { provider, recipe: "Plan d'ambiance généré (image vers vidéo)" }, status: "review" });
      return a.id;
    });
    // Extraction des images du plan + contrôle de fidélité sur 3 images.
    const clipAsset = (await import("../library")).getAsset(clipFile);
    if (clipAsset) {
      const dir = tmpDir("clip");
      const src = path.join(dir, "in.mp4");
      fs.writeFileSync(src, assetData(clipAsset));
      const { w, h } = VIDEO_SIZES[req.format];
      await exec("ffmpeg", ["-y", "-i", src, "-t", "4", "-vf", `fps=30,scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`, "-q:v", "3", path.join(dir, "f%04d.jpg")]);
      const frames = fs.readdirSync(dir).filter((f) => f.endsWith(".jpg")).sort().map((f) => path.join(dir, f));
      let ok = frames.length > 20;
      if (ok && llmConfigured()) {
        const ref = assetData(cutouts[0]);
        for (const idx of [0, Math.floor(frames.length / 2), frames.length - 1]) {
          const r = await aiQcImage({ userId: project.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:clipqc:${idx}` }, ref, fs.readFileSync(frames[idx]));
          if (!r.sameProduct || r.score < 6) {
            ok = false;
            break;
          }
        }
      }
      if (ok) clipDirs.push(frames);
    }
  }

  // 2. Découpage.
  const plan: VideoSpec = req.plan ?? (await ctx.step(`plan:${req.format}`, async () => {
    ctx.progress(0.3, "Écriture du découpage");
    if (llmConfigured()) {
      const r = await aiVideoPlan({ userId: project.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:plan` }, project, { format: req.format, goal: req.goal ?? "publicité courte qui donne envie d'acheter", images: descriptions, clips: clipDirs.length, url: req.url });
      return { format: req.format, scenes: r.scenes, transition: r.transition, music: req.music ?? r.music, captions: true } as VideoSpec;
    }
    return localVideoPlan(project.product, brand, req.format, imgs.map((a) => a.role ?? ""), req.url);
  }));
  plan.format = req.format;
  if (req.music) plan.music = req.music;
  // Bornes de sécurité (lecture sur téléphone) et références d'images valides.
  plan.scenes = plan.scenes
    .map((s) => ({ ...s, duration: Math.max(1.6, Math.min(6, s.duration)) }))
    .filter((s) => (s.kind === "detail" || s.kind === "scene" || s.kind === "hook" || s.kind === "split" ? s.image < imgs.length : s.kind === "clip" ? s.clip < clipDirs.length : true));
  const issues = checkVideoSpec(plan);

  // 3. Rendu.
  ctx.progress(0.4, "Rendu du motion design");
  const product = await loadImage(assetData(cutouts[0]));
  const images = await Promise.all(imgs.map((a) => loadImage(assetData(a))));
  const logoAsset = latestAsset(projectId, "logo-light") ?? null;
  const logo = logoAsset
    ? await loadImage(assetData(logoAsset))
    : await loadImage(await logoPng({ name: brand.name, family: brandTypo(project).heading, weight: 500, case: "upper", tracking: 0.14, layout: "wordmark", emblem: "none", color: "#FFFFFF" }, 900));
  const dir = tmpDir("video");
  const out = path.join(dir, "video.mp4");
  const result = await renderVideo(plan, { product, images, clips: clipDirs, logo, palette: palette(project), typo: brandTypo(project), brand: brand.name }, out, (p) => ctx.progress(0.4 + p * 0.5, `Rendu vidéo ${Math.round(p * 100)} %`));

  // 4. Contrôles techniques sur le fichier livré.
  const { stdout } = await exec("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", out]);
  const probe = JSON.parse(stdout);
  const v = probe.streams.find((s: any) => s.codec_type === "video");
  const audio = probe.streams.find((s: any) => s.codec_type === "audio");
  const technical = { codec: v?.codec_name, pixFmt: v?.pix_fmt, width: v?.width, height: v?.height, duration: Number(probe.format?.duration), audio: audio?.codec_name ?? null, sizeBytes: Number(probe.format?.size) };
  if (technical.codec !== "h264" || technical.pixFmt !== "yuv420p") throw new Error("Le fichier vidéo produit n'est pas au format attendu (H.264 yuv420p).");

  ctx.progress(0.93, "Rangement de la vidéo");
  const folder = req.target === "shop" ? "videos.shop" : req.target === "social" ? "videos.social" : "videos.ads";
  const name = `${slug(project.product.name || brand.name)}-${req.format.replace(":", "x")}-${Date.now().toString(36)}`;
  const video = await saveAsset({
    projectId,
    userId: project.userId,
    data: fs.readFileSync(out),
    name: `${name}.mp4`,
    mime: "video/mp4",
    role: "video",
    folderKey: folder,
    origin: "generated",
    sourceAssetId: cutouts[0].id,
    meta: { format: req.format, plan, technical, issues, method: clipDirs.length ? "Motion design + plan généré" : "Motion design à partir des photos réelles", delivered: `MP4 H.264 ${technical.width}×${technical.height}, ${technical.duration.toFixed(1)} s${technical.audio ? ", son AAC" : ", sans son"}` },
    status: "review",
  });
  const posterFrame = path.join(dir, "poster.jpg");
  await exec("ffmpeg", ["-y", "-ss", String(Math.min(4, result.duration / 3)), "-i", out, "-frames:v", "1", "-q:v", "2", posterFrame]);
  await saveAsset({ projectId, userId: project.userId, data: await sharp(posterFrame).jpeg({ quality: 88 }).toBuffer(), name: `${name}-affiche.jpg`, mime: "image/jpeg", role: "video-poster", folderKey: folder, origin: "generated", sourceAssetId: video.id, meta: { recipe: "Image d'affiche extraite de la vidéo" } });
  await saveAsset({ projectId, userId: project.userId, data: Buffer.from(srtFromSpec(plan), "utf8"), name: `${name}.srt`, mime: "application/x-subrip", kind: "text", role: "subtitles", folderKey: folder, origin: "generated", sourceAssetId: video.id, meta: { recipe: "Sous-titres (textes à l'écran) au format SRT" } });
  fs.rmSync(dir, { recursive: true, force: true });
  return { assetId: video.id, technical, issues };
}
