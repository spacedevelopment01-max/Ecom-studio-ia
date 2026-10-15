/**
 * Vidéo en scènes — publication ou publicité. À la création du projet : 3 scènes, 15 s, vertical. Ensuite, le client
 * choisit le format, la durée totale et le nombre de scènes. Création guidée et création du projet :
 *  - PRODUIT (forfaits avec vidéos IA) : 3 images de départ créées par l'IA d'images (Qwen) avec le VRAI produit en
 *    référence, puis 3 plans animés par Wan 2.6 (sans son, la musique est celle du studio) ;
 *  - SERVICE : 3 plans libres de droits (Pixabay) en rapport direct avec le métier, montés par le studio (gratuit).
 * Le montage est un document vidéo à calques (titres, carte de fin avec le vrai logo, bouton, couleurs de la marque) :
 * modifiable ensuite, et remis à jour quand la marque change. Aucun personnage généré ; coût maximal annoncé avant.
 */
import { z } from "zod";
import { all } from "../db";
import { assetData, getAsset, saveAsset } from "../library";
import { loadProject, type Project } from "../projects";
import { C, L } from "../i18n-server";
import { JobCancelled, JobPaused, UserFacingError, type JobContext } from "../jobs";
import { resolveSubject, type CreativeSubject, type SubjectOption } from "../creative-subject";
import { projectForSubject } from "../social-v2/ai-post";
import { localIdeas } from "../prompt-ideas";
import { brandTypo, palette } from "../engine/images";
import { SIZES, VIDEO_DOC_VERSION, defaultSubtitleStyle, endCardDoc, overlayText, safeZone } from "./doc";
import { songStyleFor } from "../media/song";
import { renderVideoFile, saveRendered, saveVideoVersion } from "./store";
import type { Clip, VideoDocument, VideoPlatform } from "./types";
import fs from "node:fs";
import crypto from "node:crypto";

export const SCENES = 3;
export const DEFAULT_TOTAL_S = 15;
export const END_CARD_S = 2.5;
/** Limites proposées au client (Wan 2.6 : plans de 2 à 15 s). */
export const SCENE_LIMITS = { scenes: [1, 6], totalS: [6, 60] } as const;
export type SceneAspect = "9:16" | "16:9" | "1:1" | "4:5";

/**
 * Découpage : durée à l'écran de chaque scène (la carte de fin complète la durée totale) et durée du plan à générer
 * (un peu plus longue, puis coupée ; 2 à 15 s par plan).
 */
export function sceneTiming(scenes = SCENES, totalS = DEFAULT_TOTAL_S): { showS: number; clipS: number; endS: number } {
  const n = Math.max(SCENE_LIMITS.scenes[0], Math.min(SCENE_LIMITS.scenes[1], Math.round(scenes)));
  const total = Math.max(SCENE_LIMITS.totalS[0], Math.min(SCENE_LIMITS.totalS[1], totalS));
  const showS = Math.min(15, Math.round(((total - END_CARD_S) / n) * 100) / 100);
  const clipS = Math.max(2, Math.min(15, Math.ceil(showS + 0.3)));
  const endS = Math.round(Math.max(END_CARD_S, total - showS * n) * 100) / 100;
  return { showS: Math.min(showS, clipS), clipS, endS };
}
/** Modèle des plans IA (choix du propriétaire : Wan 2.6, bien moins cher que 3.0). */
export const SCENE_VIDEO_MODEL = "wan2.6-i2v-flash";

export type ThreeScenesRequest = {
  subject?: CreativeSubject | null;
  request?: string | null;
  /** Publication (réseaux) ou publicité. */
  as: "post" | "ad";
  aspect?: SceneAspect;
  /** Nombre de scènes (1 à 6, défaut 3). */
  scenes?: number;
  /** Durée totale voulue en secondes (6 à 60, défaut 15), carte de fin comprise. */
  totalS?: number;
  /** ai : plans créés par l'IA (produit) ; stock : plans libres de droits (service). Défaut : selon le projet. */
  mode?: "ai" | "stock";
  /** Clé stable (reprise sans repayer). */
  key?: string;
  /** Musique composée par le studio (défaut) ou aucune : choix du client. */
  music?: boolean;
};

/**
 * Options du titre (par défaut : en haut, taille habituelle) : place (en bas pour ne pas couvrir le produit),
 * titleSize « large » (en grand quand il le faut ou que c'est plus beau). Jamais de bande sombre derrière le titre.
 */
export type Scene = { still: string; motion: string; title: string; place?: "top" | "lower"; titleSize?: "standard" | "large" };
/** endCard « large » : phrase et bouton de l'écran de fin en grand (au choix). */
export type ScenePlan = { scenes: Scene[]; line: string; cta: string; endCard?: "standard" | "large" };

export const ScenePlanSchema = z.object({
  scenes: z.array(z.object({ still: z.string().min(10).max(500), motion: z.string().min(10).max(400), title: z.string().max(40).default(""), place: z.enum(["top", "lower"]).optional(), titleSize: z.enum(["standard", "large"]).optional() })).min(1).max(6),
  line: z.string().max(70).default(""),
  cta: z.string().min(2).max(28),
  endCard: z.enum(["standard", "large"]).optional(),
});

export type ThreeScenesDeps = {
  /** Plan des 3 scènes écrit par l'IA de texte (null : plan du studio). */
  writePlan?: (p: Project, s: SubjectOption | null, req: ThreeScenesRequest, key: string) => Promise<ScenePlan | null>;
  keyframe: (prompt: string, aspect: SceneAspect, reference: Buffer | null, key: string) => Promise<Buffer>;
  clip: (image: Buffer, prompt: string, aspect: SceneAspect, seconds: number, key: string) => Promise<Buffer>;
  stock: (p: Project, index: number, topic: string, aspect: SceneAspect, seconds: number, exclude: Set<string>, key: string) => Promise<{ assetId: string; durationS: number } | null>;
  spentMicro: (keyPrefix: string) => number;
  render: (p: Project, docKey: string, doc: VideoDocument, meta: Record<string, unknown>) => Promise<string>;
};

/** Mode par défaut : plans IA pour un produit, plans libres de droits pour un service. */
export const sceneMode = (p: Project, s: SubjectOption | null, req: ThreeScenesRequest): "ai" | "stock" => req.mode ?? (s?.kind === "service" || p.business === "services" ? "stock" : "ai");

const ctaOf = (p: Project, as: "post" | "ad") => (p.business === "services" ? C("Demander un devis", "Request a quote") : as === "ad" ? C("Commander", "Shop now") : C("Découvrir", "Discover"));

/**
 * Plan du studio (gratuit) : 3 scènes tirées des idées propres au produit ou service, la demande du client en tête.
 * Titres courts sans rien d'inventé (nom du produit, slogan de la marque).
 */
export function localScenePlan(p: Project, s: SubjectOption | null, req: ThreeScenesRequest): ScenePlan {
  const subject = s ?? resolveSubject(p, null);
  const ideas = subject ? localIdeas(p, subject)[req.as === "ad" ? "ad_video" : "post_video"] : [];
  const name = subject?.name ?? p.product.name ?? "";
  const moves = [C("la caméra avance lentement, un rai de lumière révèle le sujet", "the camera slowly moves in, a beam of light reveals the subject"), C("glissé lent le long des matières, reflets qui courent", "slow glide along the materials, travelling highlights"), C("poussée majestueuse, la lumière s'intensifie", "majestic push-in, the light intensifies")];
  const n = Math.max(1, Math.min(6, req.scenes ?? SCENES));
  const scenes: Scene[] = Array.from({ length: n }, (_, k) => {
    const idea = ideas[k % Math.max(1, ideas.length)]?.prompt ?? name;
    const still = k === 0 && req.request?.trim() ? `${req.request.trim()} — ${idea}` : idea;
    return { still, motion: moves[k % moves.length], title: k === 0 ? name.slice(0, 40) : k === 1 ? (p.brand?.tagline ?? "").slice(0, 40) : "" };
  });
  return { scenes, line: (p.brand?.tagline ?? "").slice(0, 70), cta: ctaOf(p, req.as) };
}

/** Consigne de l'image de départ d'une scène : la scène seule, aucun texte, le vrai produit identique. */
export function keyframePrompt(p: Project, s: SubjectOption | null, scene: Scene, aspect: SceneAspect, hasReference: boolean): string {
  const pal = palette(p);
  // Sans le nom de la marque : donné à l'IA d'images, il finissait imprimé sur le produit ou sur une enseigne (le
  // titre, le logo et le bouton sont posés ensuite par le montage du studio).
  return `Cinematic photorealistic still for a premium ${p.business === "services" ? "service" : "product"} film, ${aspect === "16:9" ? "horizontal" : aspect === "1:1" ? "square" : "vertical"} frame (${aspect}), full-bleed (no borders, no black bars).
Scene: ${scene.still}
${hasReference ? "The product in the reference image is the hero: reproduce it EXACTLY (same shape, proportions, materials, colours, details, printed text), seen from the same angle; never redesign it, never add a second copy.\n" : ""}Light and colour mood consistent with the brand colours ${[pal.dark, pal.primary, pal.accent].join(", ")}. Real light, depth of field, rich materials, top advertising campaign quality.
No text, no letters, no brand name, no logo, no watermark anywhere: nothing written on the product (unless printed on the reference), on signs, walls or objects. No people, no hands, no faces, no body parts. Keep calm empty space at the top and bottom.`;
}

/** Consigne du mouvement (Wan) : le décor bouge, le produit reste identique. */
export const motionPrompt = (scene: Scene) => `${scene.motion}. The product stays perfectly still and exactly identical (same shape, colours, details, printed text). Photorealistic, smooth, slow, elegant motion. Single continuous shot, no cuts. No text, no logo, no people, no hands, no smoke.`;

/** Coût maximal (micro-euros) d'une vidéo IA : une image et un plan par scène (`clipMaxMicro` : un plan de la durée découpée). */
export function scenesMaxMicro(scenes: number, imageMaxMicro: number, clipMaxMicro: number, planMicro = 0): number {
  return scenes * (imageMaxMicro + clipMaxMicro) + planMicro;
}

/** Montage : 3 plans (titres courts en calques) + carte de fin (vrai logo, phrase, bouton), musique du studio. */
export function buildSceneDoc(p: Project, clips: { assetId: string; durationS: number; generated: boolean }[], plan: ScenePlan, aspect: SceneAspect, as: "post" | "ad", timing = sceneTiming(clips.length), music = true): VideoDocument {
  const pal = palette(p);
  const typo = brandTypo(p);
  const size = SIZES[aspect];
  const platform: VideoPlatform = aspect === "9:16" ? "reels" : aspect === "16:9" ? (as === "ad" ? "meta_feed" : "youtube") : "meta_feed";
  const safe = safeZone(aspect, platform);
  const out: Clip[] = clips.map((c, k) => ({
    id: `scene-${k + 1}`,
    shotId: `scene-${k + 1}`,
    label: C(`Scène ${k + 1}`, `Scene ${k + 1}`),
    part: null,
    durationS: Math.min(timing.showS, c.durationS),
    source: { kind: "video", assetId: c.assetId, inS: 0, outS: Math.min(timing.showS, c.durationS), muted: true },
    overlays: plan.scenes[k]?.title ? overlayText({ w: size.w, h: size.h, safe, typo, text: plan.scenes[k].title, place: plan.scenes[k].place ?? "top", size: plan.scenes[k].titleSize }) : [],
    transitionIn: { kind: k === 0 ? "cut" : "fade", durationS: k === 0 ? 0 : 0.5 },
    generated: c.generated,
  }));
  const logoId = p.brand?.logo?.assetId ?? null;
  out.push({
    id: "end-card",
    shotId: "end-card",
    label: C("Carte de fin", "End card"),
    part: "cta",
    // La carte de fin complète la durée voulue (plans plus courts que prévu : elle dure un peu plus, 4 s au plus).
    durationS: Math.round(Math.min(4, Math.max(END_CARD_S, timing.endS + timing.showS * clips.length - out.reduce((t, c) => t + c.durationS, 0))) * 100) / 100,
    source: { kind: "doc", doc: endCardDoc({ w: size.w, h: size.h, safe, pal, typo, brand: p.brand?.name ?? "", cta: plan.cta, line: plan.line || undefined, logoId, big: plan.endCard === "large" }), animate: "rise" },
    overlays: [],
    transitionIn: { kind: "fade", durationS: 0.6 },
  });
  const doc: VideoDocument = {
    version: VIDEO_DOC_VERSION,
    width: size.w,
    height: size.h,
    fps: 30,
    aspect,
    platform,
    safe,
    clips: out,
    subtitles: { style: defaultSubtitleStyle({ width: size.w, height: size.h }, typo, pal), cues: [] },
    audio: { voice: [], voiceId: null, music: music ? { source: "synth", mood: "warm", gainDb: -12, style: songStyleFor(p), seed: p.id } : null, sfx: [], duckingDb: -10, loudnessLufs: -14 },
    brand: { palette: { ...pal }, fonts: { heading: typo.heading, body: typo.body }, name: p.brand?.name ?? "" },
    disclosure: null,
    meta: { intent: as === "ad" ? "video_ad" : "social_content", source: "engine", createdFrom: null, runId: null, promo: true },
  };
  return doc;
}

export type SceneQuote = { mode: "ai" | "stock"; allowed: boolean; reason: string | null; estimateMicro: number; scenes: number; totalS: number; clipS: number };

/**
 * Prix AVANT lancement : plans IA = une image (Qwen) + un plan Wan 2.6 par scène, et le plan écrit par l'IA de texte ;
 * plans libres de droits = gratuits (seul un léger contrôle IA de chaque plan). Vidéos IA réservées aux forfaits qui
 * les incluent (Développer, Dominer) : sinon montage de plans libres ou refus clair.
 */
export function quoteScenes(p: Project, req: ThreeScenesRequest, o: { imageMaxMicro: number | null; clipMaxMicro: (seconds: number) => number; textMicro: number; videosRight: "none" | "short" | "advanced" | null; aiActive: boolean }): SceneQuote {
  const s = resolveSubject(p, req.subject ?? null);
  const n = Math.max(1, Math.min(6, req.scenes ?? SCENES));
  const totalS = Math.max(SCENE_LIMITS.totalS[0], Math.min(SCENE_LIMITS.totalS[1], req.totalS ?? DEFAULT_TOTAL_S));
  const t = sceneTiming(n, totalS);
  const mode = sceneMode(p, s, req);
  if (mode === "stock") return { mode, allowed: true, reason: null, estimateMicro: o.aiActive ? Math.round(o.textMicro * (1 + n / 4)) : 0, scenes: n, totalS, clipS: t.clipS };
  const reason = !o.aiActive ? L("L'IA n'est pas active pour ce projet (forfait Découverte, budget IA épuisé ou fournisseur désactivé).", "AI isn't active for this project (Discovery plan, AI budget used up or provider disabled).") : !o.videosRight || o.videosRight === "none" ? L("Les vidéos filmées par l'IA sont incluses dans les forfaits Développer et Dominer.", "AI-filmed videos are included in the Grow and Dominate plans.") : o.videosRight === "short" && totalS > 30 ? L("Vidéos de 30 s au plus avec le forfait Développer.", "Videos of 30 s at most with the Grow plan.") : o.imageMaxMicro == null ? L("Aucun modèle d'images disponible pour les images de départ.", "No image model available for the opening images.") : null;
  return { mode, allowed: !reason, reason, estimateMicro: reason ? 0 : scenesMaxMicro(n, o.imageMaxMicro!, o.clipMaxMicro(t.clipS), o.textMicro), scenes: n, totalS, clipS: t.clipS };
}

export type ThreeScenesResult = { docKey: string; videoAssetId: string | null; costMicro: number; mode: "ai" | "stock"; notes: string[] };

export async function runThreeScenes(ctx: JobContext | null, projectId: string, req: ThreeScenesRequest, deps: ThreeScenesDeps): Promise<ThreeScenesResult> {
  const p0 = loadProject(projectId);
  if (!p0.brand) throw new UserFacingError(L("La marque n'est pas encore créée.", "The brand has not been created yet."));
  const s = resolveSubject(p0, req.subject ?? null);
  const p = projectForSubject(p0, s);
  const aspect = req.aspect ?? "9:16";
  const mode = sceneMode(p0, s, req);
  const timing = sceneTiming(req.scenes ?? SCENES, req.totalS ?? DEFAULT_TOTAL_S);
  // Clé stable (tâche + demande) : une reprise retrouve les images et plans déjà payés, jamais une nouvelle génération.
  const key = req.key ?? `scenes:${projectId}:${crypto.createHash("sha1").update(JSON.stringify([req, ctx?.job.id ?? null])).digest("hex").slice(0, 12)}`;
  const docKey = `vid:${crypto.createHash("sha256").update(key).digest("hex").slice(0, 20)}`;
  const notes: string[] = [];
  const step = <T,>(k: string, fn: () => Promise<T>) => (ctx ? ctx.step(k, fn) : fn());
  ctx?.progress(0.05, L("Plan des scènes", "Planning the scenes"));
  const written = deps.writePlan ? await deps.writePlan(p, s, req, `${key}:plan`).catch((e) => {
    if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
    return null;
  }) : null;
  const fallback = localScenePlan(p, s, req);
  // Nombre de scènes demandé respecté même si l'IA de texte en écrit plus ou moins.
  const plan: ScenePlan = written ? { ...written, scenes: Array.from({ length: fallback.scenes.length }, (_, k) => written.scenes[k] ?? fallback.scenes[k]) } : fallback;
  const clips: { assetId: string; durationS: number; generated: boolean }[] = [];
  if (mode === "ai") {
    const refId = s?.referenceAssetId ?? null;
    const ref = refId ? getAsset(refId) : null;
    const refBuf = ref && !ref.deleted_at ? assetData(ref) : null;
    if (!refBuf) throw new UserFacingError(L("Ajoutez d'abord une photo de ce produit : la vidéo part de votre vrai produit, l'IA ne l'invente pas.", "Add a photo of this product first: the video starts from your real product, the AI never invents it."));
    for (const [k, scene] of plan.scenes.entries()) {
      ctx?.progress(0.1 + k * 0.28, L(`Scène ${k + 1} : image puis mouvement (Wan 2.6)`, `Scene ${k + 1}: image then motion (Wan 2.6)`));
      const clipId = await step(`${key}:scene-${k}`, async () => {
        const still = await deps.keyframe(keyframePrompt(p, s, scene, aspect, true), aspect, refBuf, `${key}:still:${k}`);
        const stillAsset = await saveAsset({ projectId, userId: p.userId, data: still, name: `scene-${k + 1}-image.png`, mime: "image/png", role: "scene", folderKey: "videos.ads", origin: "generated", status: "ready", meta: { scenes: { key, index: k, prompt: scene.still }, recipe: "Image de départ d'une scène vidéo (IA d'images, produit réel en référence)" } });
        const mp4 = await deps.clip(still, motionPrompt(scene), aspect, timing.clipS, `${key}:clip:${k}`);
        const a = await saveAsset({ projectId, userId: p.userId, data: mp4, name: `scene-${k + 1}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "generated", status: "ready", sourceAssetId: stillAsset.id, meta: { scenes: { key, index: k, motion: scene.motion, model: SCENE_VIDEO_MODEL } } });
        return a.id;
      });
      clips.push({ assetId: clipId, durationS: timing.clipS, generated: true });
    }
  } else {
    const exclude = new Set<string>();
    for (const [k, scene] of plan.scenes.entries()) {
      ctx?.progress(0.1 + k * 0.25, L(`Scène ${k + 1} : plan libre de droits lié au métier`, `Scene ${k + 1}: royalty-free shot linked to the trade`));
      const found = await step(`${key}:stock-${k}`, () => deps.stock(p, k, `${s?.name ?? ""} ${scene.still}`.slice(0, 200), aspect, timing.showS, exclude, `${key}:stock:${k}`));
      if (found) {
        exclude.add(found.assetId);
        clips.push({ ...found, generated: false });
      } else notes.push(C(`scène ${k + 1} : aucun plan libre de droits assez proche du métier`, `scene ${k + 1}: no royalty-free shot close enough to the trade`));
    }
    if (clips.length < Math.min(2, plan.scenes.length)) throw new UserFacingError(L("Pas assez de plans libres de droits en rapport avec ce service pour une vidéo de qualité.", "Not enough royalty-free shots related to this service for a quality video."));
  }
  ctx?.progress(0.9, L("Montage : titres, logo, musique", "Editing: titles, logo, music"));
  const doc = buildSceneDoc(p0, clips, plan, aspect, req.as, timing, req.music !== false);
  saveVideoVersion(projectId, docKey, doc, { note: C(`Vidéo en ${clips.length} scènes`, `${clips.length}-scene video`) });
  const videoAssetId = await deps.render(p0, docKey, doc, { scenes: { key, mode, subject: s ? { kind: s.kind, key: s.key, name: s.name } : null, request: req.request ?? null, as: req.as, music: req.music !== false } });
  return { docKey, videoAssetId, costMicro: deps.spentMicro(key), mode, notes };
}

/** Branchement réel : Qwen (images), Wan 2.6 (plans), Pixabay (plans libres), rendu du studio, coûts du journal. */
export function realThreeScenesDeps(ctx: JobContext | null, base: { userId: string; projectId: string }, o: { aiText: boolean }): ThreeScenesDeps {
  const jobId = ctx?.job.id ?? null;
  return {
    writePlan: o.aiText
      ? async (p, s, req, key) => {
          const { llmJson } = await import("../ai/llm");
          const lang = p.settings?.language === "en" ? "English" : "French";
          return llmJson(
            {
              task: "copywriting",
              ...base,
              jobId,
              usageKey: key,
              promptKey: "three-scenes-plan",
              routing: { difficulty: "standard", deliverable: "video_v2" },
              system: `You are the director of a top advertising agency writing a ${req.totalS ?? DEFAULT_TOTAL_S}-second film in ${req.scenes ?? SCENES} scenes. Answer with JSON only.`,
              prompt: `Brand "${p.brand?.name ?? ""}" (personality: ${(p.brand?.personality ?? []).join(", ")}). ${s?.kind === "service" ? "Service" : "Product"}: ${s?.name ?? p.product.name} — ${(s?.summary || p.product.summary || "").slice(0, 300)}.
${req.request ? `Client's brief (follow it): ${req.request.slice(0, 600)}\n` : ""}Write ${req.scenes ?? SCENES} different scenes for a ${req.as === "ad" ? "paid ad" : "social post"} video: for each, "still" (in English: the setting, light and mood of the opening image, the ${s?.kind === "service" ? "craft shown through tools, materials and results" : "real product as the hero"}), "motion" (in English: the slow camera move and what moves in the scene, the product itself never changes) and "title" (in ${lang}, 2 to 5 words shown on screen, or empty).
Then "line" (in ${lang}, a short brand line, max 8 words, no claim) and "cta" (in ${lang}, 2-3 words button).
Never any person, face, hand or body. Never numbers, prices, percentages, promises, awards or reviews.
Optional per scene: "place": "lower" when the product fills the top of the frame; "titleSize": "large" only when it reads better or looks better (short punchy title, busy image), otherwise leave the usual size. Optional "endCard": "large" for a bold end card.
Reply { "scenes": [{ "still": "", "motion": "", "title": "" }, ...${req.scenes ?? SCENES}], "line": "", "cta": "" }.`,
              maxTokens: 1200,
            },
            ScenePlanSchema,
          );
        }
      : undefined,
    async keyframe(prompt, aspect, reference, key) {
      const { aiPostImage } = await import("../ai/media-providers");
      return aiPostImage({ ...base, jobId, usageKey: key }, { prompt, aspect, reference, logo: null });
    },
    async clip(image, prompt, aspect, seconds, key) {
      const { aiClip } = await import("../ai/media-providers");
      // Wan suit les proportions de l'image de départ (carré et 4:5 compris) ; ce paramètre ne sert qu'aux autres modèles.
      return aiClip("alibaba", { ...base, jobId, usageKey: key }, { image, prompt, aspect: aspect === "16:9" ? "16:9" : "9:16", seconds, model: SCENE_VIDEO_MODEL, usage: "product_video" }, (m) => ctx?.progress(0.5, m));
    },
    async stock(p, index, topic, aspect, seconds, exclude, key) {
      const { findStockClip } = await import("../stock/stock-clip");
      return findStockClip({ ...base, jobId }, p, { topic, part: ["hook", "demonstration", "result"][index % 3] ?? "development", aspect, durationS: seconds, index, key }, exclude);
    },
    spentMicro: (prefix) => all<{ c: number }>("SELECT COALESCE(SUM(cost), 0) c FROM ai_calls WHERE usage_key LIKE ?", `${prefix}%`)[0]?.c ?? 0,
    async render(p, docKey, doc, meta) {
      const ex = await renderVideoFile(p.id, doc);
      try {
        const saved = await saveRendered(p.id, p.userId, docKey, doc, ex, meta);
        saveVideoVersion(p.id, docKey, doc, { note: C("Rendu", "Render"), renderedAssetId: saved.videoId });
        return saved.videoId;
      } finally {
        fs.rmSync(ex.dir, { recursive: true, force: true });
      }
    },
  };
}
