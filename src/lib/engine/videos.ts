/**
 * Production vidéo : découpage (IA ou local) → plans générés facultatifs
 * (contrôlés) → motion design → MP4 + affiche + sous-titres SRT, rangés et
 * réutilisables dans la boutique, les publications et les campagnes.
 * Entreprise de services : présentation de l'activité (photos réelles ou typographie animée),
 * prestations, zone et horaires, appel à prendre rendez-vous — sans produit.
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
import { aiVideoPlan, aiQcImage, aiQcScene, qcScore, qcTier } from "../ai/tasks";
import { llmConfigured } from "../ai/llm";
import { videoProviderAvailable, veoClip, falClip, refundMediaQuota } from "../ai/media-providers";
import { JobCancelled, JobPaused, UserFacingError, type JobContext } from "../jobs";
import { all, json, run } from "../db";
import { downloadStockVideo, searchStockVideos, stockVideoCredit } from "../stock/photos";
import { logoPng } from "../media/logo";
import { C, L } from "../i18n-server";
import { activityPhotos, isServices, localServiceVideoPlan } from "./service-media";
import { aiCraftReview, brandCraftBrief, craftLoop, paceVideoPlan, videoPlanIssues, type CraftQuality } from "./ad-craft";

const exec = promisify(execFile);
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || C("produit", "product");

export type VideoRequest = { format: VideoFormat; goal?: string; useAiClip?: boolean; plan?: VideoSpec; music?: VideoSpec["music"]; url?: string; target?: "ads" | "social" | "shop" };

/** Résultat d'une vidéo dans une étape de création (ancien format : identifiant seul). */
export type VideoStepResult = string | { assetId: string; method?: "ai-clip" | "motion"; clipFallback?: string | null };

/** Note d'étape : combien de vidéos, avec ou sans plan IA, et pourquoi le plan IA n'a pas servi. */
export function videoStepNote(results: VideoStepResult[], aiRequested: boolean): string {
  const n = results.length;
  const done = L(`${n} vidéo(s) rendue(s)`, `${n} video(s) rendered`);
  const known = results.filter((r): r is Exclude<VideoStepResult, string> => typeof r === "object" && !!r?.method);
  if (known.length !== n) return done;
  if (!aiRequested) return L(`${done} (montage à partir des images)`, `${done} (edited from the images)`);
  const ai = known.filter((r) => r.method === "ai-clip").length;
  const why = [...new Set(known.map((r) => r.clipFallback).filter(Boolean))].join(" ; ");
  if (ai === n) return L(`${done} (avec plan IA)`, `${done} (with an AI shot)`);
  if (ai === 0) return L(`${done} à partir des images : plan IA non utilisé${why ? ` (${why})` : ""}`, `${done} from the images: AI shot not used${why ? ` (${why})` : ""}`);
  return L(`${done} (plan IA : ${ai} sur ${n}, montage à partir des images pour ${n - ai === 1 ? "l'autre" : "les autres"}${why ? ` — ${why}` : ""})`, `${done} (AI shot: ${ai} of ${n}, edited from the images for the ${n - ai === 1 ? "other" : "others"}${why ? ` — ${why}` : ""})`);
}

/**
 * Mouvement de caméra du plan IA, choisi comme un chef opérateur selon l'univers du produit (une seule consigne,
 * précise, que les modèles image-vers-vidéo suivent bien). La fidélité du produit reste contrôlée sur 3 images.
 */
export function clipCamera(sector: string | null | undefined, format: VideoFormat): string {
  const vertical = format !== "16:9";
  switch (sector) {
    case "hightech":
    case "sport":
      return `Fast, confident dolly-in toward the product with a light sweep crossing the set, energetic but smooth, ${vertical ? "vertical framing" : "wide framing"}.`;
    case "bijoux":
    case "beaute":
    case "mode":
      return "Slow macro slide along the product with a gentle rack focus from the foreground to the product and a soft specular glint traveling across it.";
    case "enfants":
    case "animaux":
    case "maison":
      return "Gentle handheld-feel push-in in warm natural daylight, soft bokeh drifting in the background, cozy and calm.";
    default:
      return "Slow cinematic push-in on the product set with a soft light shift and subtle depth of field.";
  }
}

export async function produceVideo(ctx: JobContext, projectId: string, req: VideoRequest) {
  let project = loadProject(projectId);
  const services = isServices(project);
  const cutouts = await ensureCutouts(ctx, project);
  // Erreurs définitives (rien à retenter tant que le client n'a pas agi).
  if (!cutouts.length && !services) throw new UserFacingError(L("Importez une photo du produit pour créer une vidéo.", "Upload a product photo to create a video."));
  project = loadProject(projectId);
  const brand = project.brand;
  if (!brand) throw new UserFacingError(L("Définissez la marque avant de produire une vidéo.", "Set up the brand before producing a video."));
  // Photos en situation d'abord (celles du marchand avant les générées) : elles ouvrent les vidéos.
  // Services : photos réelles de l'activité (réalisations, équipe, lieu), puis ambiances générées.
  const life = assetsByRole(projectId, "lifestyle", 6).filter((a) => a.status !== "rejected").sort((x, y) => Number(y.origin === "upload") - Number(x.origin === "upload") || Number(y.origin !== "generated") - Number(x.origin !== "generated")).slice(0, 2);
  const imgs: Asset[] = services ? activityPhotos(projectId).slice(0, 4) : [...life, ...assetsByRole(projectId, "detail", 2), ...assetsByRole(projectId, "scene", 3)].filter((a) => a.status !== "rejected");
  const descriptions = imgs.map((a) => C(`${a.role === "lifestyle" ? "produit en situation" : a.role} : ${a.name}`, `${a.role === "lifestyle" ? "lifestyle shot" : a.role}: ${a.name}`));

  // 1. Plans générés (facultatif, coûteux) : à partir d'une scène réelle.
  const clipDirs: string[][] = [];
  const tmpDirs: string[] = [];
  /** Plan IA demandé, mais pas utilisé (indisponible ou refusé au contrôle) : dit dans la note d'étape. */
  let clipFallback: string | null = null;
  // Un plan IA n'est utilisé qu'après contrôle par l'IA de vision : sans elle, il n'est même pas généré (ni payé).
  const provider = req.useAiClip && llmConfigured() ? videoProviderAvailable() : null;
  if (req.useAiClip && !provider) clipFallback = !llmConfigured() && videoProviderAvailable() ? L("contrôle de fidélité des plans IA indisponible", "AI shot fidelity check unavailable") : L("génération de plans vidéo non disponible", "video shot generation unavailable");
  else if (provider && !imgs.length) clipFallback = L("aucune photo de scène pour le plan IA", "no scene photo for the AI shot");
  const clipKey = `${ctx.job.id}:clip:${req.format}:${req.target ?? ""}`;
  if (provider && imgs.length) {
    // Un plan généré qui échoue (fournisseur indisponible, crédits insuffisants) ne bloque pas la vidéo : elle est montée sans lui.
    const clipFile = await ctx.step("ai-clip", async () => {
      ctx.progress(0.1, L("Génération d'un plan vidéo d'ambiance", "Generating a mood video shot"));
      const scene = imgs.find((a) => a.role === "scene") ?? imgs[0];
      const prompt = services
        ? `Slow cinematic push-in on this real photo of the business, soft light shift, subtle depth of field. Keep every person, object and place exactly as they are; add no people, no text, no logo.`
        : `${clipCamera(project.product.sector, req.format)} Motion starts on the very first frame (no static opening), ${brand.palette.secondary} color accents in the light, natural soft shadows, crisp focus on the product. The product stays perfectly still and exactly identical to the first frame (same shape, proportions, label, text and colors); it is never redrawn, duplicated, cropped or hidden. No text overlay, no new objects, no people.`;
      const buf = provider === "google"
        ? await veoClip({ userId: project.userId, projectId, jobId: ctx.job.id, usageKey: clipKey }, { image: assetData(scene), prompt, aspect: req.format === "16:9" ? "16:9" : "9:16" }, (m) => ctx.progress(0.15, m))
        : await falClip({ userId: project.userId, projectId, jobId: ctx.job.id, usageKey: clipKey }, { image: assetData(scene), prompt }, (m) => ctx.progress(0.15, m));
      const a = await saveAsset({ projectId, userId: project.userId, data: buf, name: `${slug(project.product.name)}-${C("plan-genere", "generated-shot")}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "generated", sourceAssetId: scene.id, meta: { provider, recipe: L("Plan d'ambiance généré (image vers vidéo)", "Generated mood shot (image to video)") }, status: "review" });
      return a.id;
    }).catch((e) => {
      ctx.progress(0.2, L(`Plan généré par IA indisponible (${(e as Error).message}) : vidéo montée à partir des images`, `AI-generated shot unavailable (${(e as Error).message}): video edited from the images`));
      clipFallback = L("plan IA indisponible", "AI shot unavailable");
      return null;
    });
    // Extraction des images du plan + contrôle de fidélité sur 3 images.
    const clipAsset = clipFile ? (await import("../library")).getAsset(clipFile) : null;
    if (clipAsset) {
      const dir = tmpDir("clip");
      // Images du plan (≈ 120 JPEG) : supprimées après le rendu, ou tout de suite si le plan n'est pas retenu.
      tmpDirs.push(dir);
      const src = path.join(dir, "in.mp4");
      fs.writeFileSync(src, assetData(clipAsset));
      const { w, h } = VIDEO_SIZES[req.format];
      await exec("ffmpeg", ["-y", "-i", src, "-t", "4", "-vf", `fps=30,scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`, "-q:v", "3", path.join(dir, "f%04d.jpg")]);
      const frames = fs.readdirSync(dir).filter((f) => f.endsWith(".jpg")).sort().map((f) => path.join(dir, f));
      let ok = frames.length > 20;
      let reason = ok ? "" : L("plan trop court ou illisible", "shot too short or unreadable");
      // Contrôle obligatoire de 3 images du plan (début, milieu, fin) : produit identique, ou pour une activité
      // de services, aucune personne déformée, aucun texte ou logo inventé.
      if (ok && !llmConfigured()) {
        ok = false;
        reason = L("contrôle impossible", "check unavailable");
      }
      if (ok) {
        // Le plan est payé : il n'est écarté que si au moins 2 images sur 3 sont inutilisables. Une image
        // seulement moyenne ou un contrôle en panne ne le fait pas perdre (il reste signalé à vérifier).
        const ref = services ? null : assetData(cutouts[0]);
        const bad: string[] = [];
        const warn: string[] = [];
        for (const idx of [0, Math.floor(frames.length / 2), frames.length - 1]) {
          const usage = { userId: project.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:clipqc:${req.format}:${idx}` };
          const frame = fs.readFileSync(frames[idx]);
          try {
            const r = ref ? await aiQcImage(usage, ref, frame) : await aiQcScene(usage, frame);
            const tier = qcTier(r);
            const why = ref && (r as { sameProduct?: boolean }).sameProduct === false ? L("le produit du plan ne correspond pas au vôtre", "the product in the shot doesn't match yours") : `${r.issues.join(L(" ; ", "; ")) || `${qcScore(r.score)}/10`}`;
            if (tier === "bad") bad.push(why);
            else if (tier === "warn") warn.push(why);
          } catch (e) {
            if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
            warn.push(L("contrôle automatique impossible", "automatic check unavailable"));
          }
          if (bad.length >= 2) break;
        }
        if (bad.length >= 2) {
          ok = false;
          reason = L(`plan refusé (${bad[0]})`, `shot rejected (${bad[0]})`);
        } else if (bad.length || warn.length) {
          run("UPDATE assets SET meta = ? WHERE id = ?", JSON.stringify({ ...json<Record<string, unknown>>(clipAsset.meta, {}), qcWarning: [...bad, ...warn].join(L(" ; ", "; ")) }), clipAsset.id);
        }
      }
      if (ok) clipDirs.push(frames);
      else {
        // Plan refusé au contrôle : écarté de la bibliothèque (statut « refusé », raison gardée).
        run("UPDATE assets SET status = 'rejected', meta = ? WHERE id = ?", JSON.stringify({ ...json<Record<string, unknown>>(clipAsset.meta, {}), rejectedReason: reason, qcWarning: reason }), clipAsset.id);
        clipFallback = L(`plan IA refusé au contrôle : ${reason}`, `AI shot rejected by the check: ${reason}`);
        // Plan jamais montré : il ne compte pas dans les vidéos IA du forfait.
        refundMediaQuota(project.userId, clipKey, "aiVideos");
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  }

  // 1 bis. Plan vidéo libre de droits (Pexels, Pixabay), gratuit : le métier pour une entreprise de services (sans
  // plan IA), l'univers du produit (plan de coupe, jamais le produit lui-même) pour une boutique.
  if (services ? !clipDirs.length : true) {
    const stockId = await ctx.step(`stock-clip:${req.format}`, async () => {
      ctx.progress(0.2, L("Recherche d'un plan vidéo libre de droits", "Searching a royalty-free video shot"));
      const trade = [project.product.category, project.product.name].filter(Boolean)[0] ?? "";
      const items = project.services?.services ?? [];
      const taken = new Set(all<{ k: string }>("SELECT json_extract(meta, '$.stock.source') || ':' || json_extract(meta, '$.stock.id') k FROM assets WHERE project_id = ? AND kind = 'video' AND json_extract(meta, '$.stock') IS NOT NULL", projectId).map((x) => x.k));
      const q = services
        ? await (async () => {
            // Scènes concrètes du métier reconnu (en anglais), sinon son nom : jamais un simple décor.
            const known = (await import("../stock/trade-queries")).tradeStock(`${trade} ${items[0]?.name ?? ""}`);
            return known ? { lang: "en" as const, queries: known.queries.slice(0, 3) } : { lang: "fr" as const, queries: [trade, items[0]?.name ?? "", `${trade} chantier`] };
          })()
        : await (await import("./stock-universe")).universeQueries({ userId: project.userId, projectId, jobId: ctx.job.id }, project);
      const found = await searchStockVideos(q.queries, req.format === "16:9" ? "landscape" : "portrait", q.lang, taken).catch(() => []);
      for (const v of found.slice(0, 2)) {
        try {
          const buf = await downloadStockVideo(v);
          const a = await saveAsset({ projectId, userId: project.userId, data: buf, name: `${slug(project.product.name || project.name)}-${C("plan-libre", "stock-shot")}-${v.source}-${v.id}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "import", meta: { provider: v.source, recipe: stockVideoCredit(v), stock: { source: v.source, id: v.id, page: v.page, author: v.author, license: v.license } }, status: "review" });
          return a.id;
        } catch (e) {
          if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
        }
      }
      return null;
    }).catch((e) => {
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
      return null;
    });
    const stockAsset = stockId ? (await import("../library")).getAsset(stockId) : null;
    if (stockAsset) {
      const dir = tmpDir("clip");
      tmpDirs.push(dir);
      const src = path.join(dir, "in.mp4");
      fs.writeFileSync(src, assetData(stockAsset));
      const { w, h } = VIDEO_SIZES[req.format];
      await exec("ffmpeg", ["-y", "-ss", "0.5", "-i", src, "-t", "4", "-an", "-vf", `fps=30,scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h}`, "-q:v", "3", path.join(dir, "f%04d.jpg")]).catch(() => null);
      const frames = fs.readdirSync(dir).filter((f) => f.endsWith(".jpg")).sort().map((f) => path.join(dir, f));
      if (frames.length > 20) {
        clipDirs.push(frames);
        clipFallback = null;
      }
    }
  }

  // 2. Découpage.
  let craftQuality: CraftQuality | null = null;
  const plan: VideoSpec = req.plan ?? (await ctx.step(`plan:${req.format}`, async () => {
    ctx.progress(0.3, L("Écriture du découpage", "Writing the shot list"));
    // Services : découpage écrit à partir de l'offre réelle (prestations, horaires, zone, contact).
    if (services) {
      const sp = localServiceVideoPlan(project, req.format, imgs.length, req.url, { short: req.target === "ads" });
      if (clipDirs.length) sp.scenes.splice(1, 0, { kind: "clip", duration: 3, clip: 0 });
      return sp;
    }
    if (llmConfigured()) try {
      // Réalisateur (une passe forte) → contrôles de montage + directeur de création (grille notée, seuil 8/10)
      // → au plus une reprise ciblée → la meilleure version est gardée.
      const goal = req.goal ?? C("publicité courte qui donne envie d'acheter", "short ad that makes people want to buy");
      const base = { userId: project.userId, projectId, jobId: ctx.job.id };
      const craft = brandCraftBrief(project);
      const asSpec = (r: Awaited<ReturnType<typeof aiVideoPlan>>) => ({ format: req.format, scenes: r.scenes, transition: r.transition, music: req.music ?? r.music, captions: true, concept: r.concept }) as VideoSpec & { concept: string };
      const { best, quality } = await craftLoop("video", {
        draft: async (feedback) => asSpec(await aiVideoPlan({ ...base, usageKey: `${ctx.job.id}:plan${feedback ? ":r2" : ""}` }, project, { format: req.format, goal, images: descriptions, clips: clipDirs.length, url: req.url, craft, feedback })),
        lint: (spec) => videoPlanIssues(paceVideoPlan(spec)),
        review: (spec, round) => aiCraftReview({ ...base, usageKey: `${ctx.job.id}:plan:cd${round}` }, project, "video", { concept: spec.concept, format: spec.format, music: spec.music, transition: spec.transition, scenes: spec.scenes, images: descriptions }, `Format ${req.format}. Objectif : ${goal}.`),
      });
      craftQuality = quality;
      return best;
    } catch (e) {
      if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
      // Découpage de l'IA inexploitable : celui du studio prend le relais (la vidéo est quand même livrée).
      console.warn("[vidéo] découpage de l'IA indisponible :", (e as Error).message);
    }
    const lp = localVideoPlan(project.product, brand, req.format, imgs.map((a) => a.role ?? ""), req.url, project);
    // Plan de coupe (IA ou libre de droits) après l'ouverture : la vidéo respire entre deux plans du produit.
    if (clipDirs.length) lp.scenes.splice(1, 0, { kind: "clip", duration: 3, clip: clipDirs.length - 1 });
    return lp;
  }));
  plan.format = req.format;
  if (req.music) plan.music = req.music;
  // Rythme de publicité sociale (accroche courte, rupture toutes les 1,5 à 2,5 s, coupes sur le temps avec « pulse »).
  // Un découpage fourni par le client (req.plan) est respecté tel quel.
  if (!req.plan) plan.scenes = paceVideoPlan(plan).scenes;
  // Bornes de sécurité (lecture sur téléphone) et références d'images valides.
  plan.scenes = plan.scenes
    .map((s) => ({ ...s, duration: Math.max(1.6, Math.min(6, s.duration)) }))
    // Un plan IA ne dure pas plus que les images extraites (sinon image figée à la fin).
    .map((s) => (s.kind === "clip" && clipDirs[s.clip] ? { ...s, duration: Math.min(s.duration, Math.max(1.6, clipDirs[s.clip].length / 30)) } : s))
    .filter((s) => (s.kind === "detail" || s.kind === "scene" || s.kind === "hook" || s.kind === "split" ? s.image < imgs.length : s.kind === "clip" ? s.clip < clipDirs.length : true))
    // Sans produit, les plans qui le montrent n'ont rien à révéler.
    .filter((s) => !services || !["reveal", "callouts", "spotlight", "split"].includes(s.kind));
  const issues = checkVideoSpec(plan);

  // 3. Rendu.
  ctx.progress(0.4, L("Rendu du motion design", "Rendering the motion design"));
  const product = cutouts[0] ? await loadImage(assetData(cutouts[0])) : null;
  // Photos du client : orientation EXIF appliquée et taille raisonnable avant le rendu image par image.
  const images = await Promise.all(imgs.map(async (a) => loadImage(services ? await sharp(assetData(a)).rotate().resize(2200, 2200, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer() : assetData(a))));
  const logoAsset = latestAsset(projectId, "logo-light") ?? null;
  const logo = logoAsset
    ? await loadImage(assetData(logoAsset))
    : await loadImage(await logoPng({ name: brand.name, family: brandTypo(project).heading, weight: 500, case: "upper", tracking: 0.14, layout: "wordmark", emblem: "none", color: "#FFFFFF" }, 900));
  const dir = tmpDir("video");
  tmpDirs.push(dir);
  try {
    const out = path.join(dir, "video.mp4");
    const result = await renderVideo(plan, { product, images, clips: clipDirs, logo, palette: palette(project), typo: brandTypo(project), brand: brand.name }, out, (p) => ctx.progress(0.4 + p * 0.5, L(`Rendu vidéo ${Math.round(p * 100)} %`, `Rendering video ${Math.round(p * 100)}%`)));

    // 4. Contrôles techniques sur le fichier livré.
    const { stdout } = await exec("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", out]);
    const probe = JSON.parse(stdout);
    const v = probe.streams.find((s: any) => s.codec_type === "video");
    const audio = probe.streams.find((s: any) => s.codec_type === "audio");
    const technical = { codec: v?.codec_name, pixFmt: v?.pix_fmt, width: v?.width, height: v?.height, duration: Number(probe.format?.duration), audio: audio?.codec_name ?? null, sizeBytes: Number(probe.format?.size) };
    if (technical.codec !== "h264" || technical.pixFmt !== "yuv420p") throw new Error(L("Le fichier vidéo produit n'est pas au format attendu (H.264 yuv420p).", "The rendered video file is not in the expected format (H.264 yuv420p)."));

    ctx.progress(0.93, L("Rangement de la vidéo", "Filing the video"));
    const folder = req.target === "shop" ? "videos.shop" : req.target === "social" ? "videos.social" : "videos.ads";
    const name = `${slug(project.product.name || brand.name)}-${services ? `${C("presentation", "presentation")}-` : ""}${req.format.replace(":", "x")}-${Date.now().toString(36)}`;
    const video = await saveAsset({
      projectId,
      userId: project.userId,
      data: fs.readFileSync(out),
      name: `${name}.mp4`,
      mime: "video/mp4",
      role: "video",
      folderKey: folder,
      origin: "generated",
      sourceAssetId: cutouts[0]?.id ?? imgs[0]?.id ?? null,
      meta: { format: req.format, plan, technical, issues, ...(craftQuality ? { quality: craftQuality } : {}), ...(services ? { business: "services" } : {}), method: clipDirs.length ? L("Motion design + plan généré", "Motion design + generated shot") : services ? (imgs.length ? L("Motion design : présentation de l'activité à partir de vos photos", "Motion design: business presentation from your photos") : L("Motion design : typographie animée à la marque (sans photo)", "Motion design: animated brand typography (no photo)")) : L("Motion design à partir des photos réelles", "Motion design from the real photos"), delivered: `MP4 H.264 ${technical.width}×${technical.height}, ${technical.duration.toFixed(1)} s${technical.audio ? L(", son AAC", ", AAC audio") : L(", sans son", ", no audio")}` },
      status: "review",
    });
    const posterFrame = path.join(dir, "poster.jpg");
    await exec("ffmpeg", ["-y", "-ss", String(Math.min(4, result.duration / 3)), "-i", out, "-frames:v", "1", "-q:v", "2", posterFrame]);
    await saveAsset({ projectId, userId: project.userId, data: await sharp(posterFrame).jpeg({ quality: 88 }).toBuffer(), name: `${name}-${C("affiche", "poster")}.jpg`, mime: "image/jpeg", role: "video-poster", folderKey: folder, origin: "generated", sourceAssetId: video.id, meta: { recipe: L("Image d'affiche extraite de la vidéo", "Poster frame taken from the video") } });
    await saveAsset({ projectId, userId: project.userId, data: Buffer.from(srtFromSpec(plan), "utf8"), name: `${name}.srt`, mime: "application/x-subrip", kind: "text", role: "subtitles", folderKey: folder, origin: "generated", sourceAssetId: video.id, meta: { recipe: L("Sous-titres (textes à l'écran) au format SRT", "Subtitles (on-screen text) in SRT format") } });
    const method = clipDirs.length ? "ai-clip" : "motion";
    return { assetId: video.id, technical, issues, method: method as "ai-clip" | "motion", aiClipRequested: !!req.useAiClip, clipFallback };
  } finally {
    // Fichiers temporaires (rendu, images du plan IA) supprimés, même en cas d'erreur.
    for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
  }
}
