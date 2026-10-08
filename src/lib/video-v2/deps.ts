/**
 * Outils du Video Engine V2 : rédaction du script (IA), contrôle des plans et de la vidéo (IA de vision), images
 * (Image Engine V2), génération des plans (Router V2 → Veo / fal.ai, avec leurs barrières de coût), voix (aucun
 * fournisseur de synthèse vocale dans le studio aujourd'hui : null, dit clairement), inventaire de la bibliothèque.
 * Injectables : le studio et le benchmark utilisent `realVideoDeps` ; les tests, des outils simulés (aucun appel).
 */
import sharp from "sharp";
import { llmConfigured, llmJson } from "../ai/llm";
import { brainView } from "../ai/context";
import { activeProviderKey, routeFor } from "../ai/config";
import { falClip, veoClip } from "../ai/media-providers";
import { all, json } from "../db";
import type { JobContext } from "../jobs";
import { assetData, getAsset, type Asset } from "../library";
import type { Project } from "../projects";
import { validCutouts } from "../engine/cutouts";
import { activityPhotos, realActivityPhotos } from "../engine/service-media";
import { isAutoUsable, usableByRole } from "../quality/usable";
import { L } from "../i18n-server";
import type { ImageRequestV2 } from "../image-v2/engine";
import { ScriptSchema, type ScriptDraft } from "./script";
import { SHOT_REVIEW_SYSTEM, ShotReviewSchema, VIDEO_REVIEW_SYSTEM, VideoReviewSchema } from "./quality";
import type { Inventory } from "./storyboard";
import type { ShotReview, VideoReview } from "./types";

export type ClipRequest = { provider: string; model: string; image: Buffer; prompt: string; aspect: "16:9" | "9:16"; seconds: number; people: boolean };

export type VideoV2Deps = {
  /** Rédaction IA disponible (sinon : script local). */
  canWrite: boolean;
  /** Contrôle IA de vision disponible : sans lui, AUCUN plan n'est généré (il ne pourrait pas être validé). */
  canReview: boolean;
  /** Génération média permise pour ce compte (forfait, budget, IA active). */
  generationAllowed: boolean;
  writeScript: (system: string, prompt: string, key: string) => Promise<ScriptDraft>;
  reviewShot: (frames: Buffer[], refs: { product: Buffer | null; character: Buffer | null }, text: string, key: string) => Promise<ShotReview>;
  reviewVideo: (frames: Buffer[], text: string, key: string) => Promise<VideoReview>;
  image: (req: ImageRequestV2) => Promise<{ assetId: string; data: Buffer } | null>;
  generateClip: (req: ClipRequest, key: string) => Promise<Buffer>;
  /** Voix off : null quand aucun fournisseur de synthèse vocale n'est configuré (cas actuel du studio). */
  voice: null | ((text: string, voiceId: string | null, key: string) => Promise<{ data: Buffer; mime: string }>);
  available: (provider: string) => boolean;
  preferred: { provider: string; model: string } | null;
  /** Estimation du coût d'un plan (EUR micro) ; par défaut, le tarif de l'administration. */
  estimate?: (provider: string, model: string, seconds: number) => number | null;
  inventory: () => Inventory;
  /** Données d'un asset de la bibliothèque du projet. */
  data: (assetId: string) => Buffer | null;
};

/** Inventaire de la bibliothèque : seulement ce qui est réutilisable automatiquement (jamais un refusé). */
export function projectInventory(p: Project): Inventory {
  const services = p.business === "services";
  const cut = services ? undefined : validCutouts(p.id)[0];
  const logoId = p.brand?.logo?.assetId;
  const logo = logoId ? getAsset(logoId) : undefined;
  const photos: Asset[] = services ? [...realActivityPhotos(p.id), ...activityPhotos(p.id)] : [...usableByRole(p.id, "lifestyle", 6), ...usableByRole(p.id, "scene", 4), ...usableByRole(p.id, "detail", 3)];
  const seen = new Set<string>();
  const videos = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND kind = 'video' AND role IN ('clip','video-source') AND deleted_at IS NULL AND status != 'rejected' ORDER BY created_at DESC LIMIT 12", p.id).filter(isAutoUsable);
  const screens = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role IN ('screenshot','screen') AND deleted_at IS NULL AND status != 'rejected' ORDER BY created_at DESC LIMIT 6", p.id);
  return {
    cutout: cut ? { id: cut.id } : null,
    logo: logo && !logo.deleted_at ? { id: logo.id } : null,
    photos: photos.filter((a) => a.kind === "image" && !seen.has(a.id) && seen.add(a.id)).map((a) => ({ id: a.id, role: a.role ?? "", origin: a.origin ?? "" })),
    videos: videos.map((a) => ({ id: a.id, durationS: Number((a as unknown as { duration?: number }).duration ?? json<any>(a.meta as any, {})?.durationS ?? 0) || 4, role: a.role ?? "" })),
    screens: screens.map((a) => ({ id: a.id })),
  };
}

export function realVideoDeps(ctx: JobContext | null, p: Project, aiActive: boolean): VideoV2Deps {
  const base = { userId: p.userId, projectId: p.id, jobId: ctx?.job.id ?? null };
  const ai = aiActive && llmConfigured();
  const small = (b: Buffer) => sharp(b).resize(768, 768, { fit: "inside" }).jpeg({ quality: 82 }).toBuffer();
  const route = routeFor("video_generation");
  return {
    canWrite: ai,
    canReview: ai,
    generationAllowed: aiActive,
    writeScript: (system, prompt, key) => llmJson({ task: "video_direction", ...base, usageKey: key, promptKey: "video-v2-script", routing: { difficulty: "complex", deliverable: "video_v2" }, system, context: brainView(p, "video").stable, prompt, maxTokens: 3000 }, ScriptSchema),
    async reviewShot(frames, refs, text, key) {
      const images = [...(await Promise.all(frames.map(small))).map((data, k) => ({ data, label: L(`image ${k + 1} du plan`, `shot frame ${k + 1}`) }))];
      if (refs.product) images.push({ data: await small(refs.product), label: L("référence : produit réel", "reference: real product") });
      if (refs.character) images.push({ data: await small(refs.character), label: L("référence : personnage", "reference: character") });
      return (await llmJson({ task: "quality_control", ...base, usageKey: key, promptKey: "video-v2-shot-review", routing: { difficulty: "complex", deliverable: "video_shot_v2" }, system: SHOT_REVIEW_SYSTEM, context: brainView(p, "qc").stable, images, prompt: `${text}\nRéponds { "score": 0, "sameProduct": null, "productAltered": false, "characterConsistent": null, "offTopic": false, "artifacts": false, "issues": [] }.`, maxTokens: 1500 }, ShotReviewSchema)) as ShotReview;
    },
    async reviewVideo(frames, text, key) {
      const images = (await Promise.all(frames.map(small))).map((data, k) => ({ data, label: L(`image clé ${k + 1}`, `key frame ${k + 1}`) }));
      return (await llmJson({ task: "quality_control", ...base, usageKey: key, promptKey: "video-v2-review", routing: { difficulty: "complex", deliverable: "video_v2" }, system: VIDEO_REVIEW_SYSTEM, context: brainView(p, "video").stable, images, prompt: `${text}\nRéponds { "criteria": { "relevance": 0, "narrative": 0, "visual": 0, "continuity": 0, "product_fidelity": 0, "brand": 0, "realism": 0, "motion": 0, "editing": 0, "audio": 0, "sync": 0, "subtitles": 0, "commercial": 0 }, "issues": [], "fix": { "target": "shot|audio|subtitles|editing|script|none", "shotId": null, "instruction": "…" } }.`, maxTokens: 2500 }, VideoReviewSchema)) as VideoReview;
    },
    async image(req) {
      const { runImageEngineV2 } = await import("../image-v2/engine");
      const r = await runImageEngineV2(ctx, p.id, req);
      const o = r.outcomes.find((x) => x.assetId && (x.verdict === "FINAL" || x.verdict === "PROVISIONAL"));
      const a = o?.assetId ? getAsset(o.assetId) : undefined;
      return a ? { assetId: a.id, data: assetData(a) } : null;
    },
    async generateClip(req, key) {
      // Barrières existantes : forfait, budget IA, plafond de la tâche, tarif connu — vérifiées AVANT l'envoi.
      const usage = { ...base, usageKey: key };
      if (req.provider === "google") return veoClip(usage, { image: req.image, prompt: req.prompt, aspect: req.aspect, seconds: req.seconds, people: req.people }, (m) => ctx?.progress(ctx.job.progress ?? 0.5, m));
      if (req.provider === "fal") return falClip(usage, { image: req.image, prompt: req.prompt, seconds: req.seconds }, (m) => ctx?.progress(ctx.job.progress ?? 0.5, m));
      throw new Error(`fournisseur vidéo non pris en charge : ${req.provider}`);
    },
    // Aucun fournisseur de synthèse vocale branché dans le studio (vérifié) : la voix reste à enregistrer ou à
    // brancher (phase 7B) ; le message passe par les sous-titres et le texte à l'écran.
    voice: null,
    available: (provider) => !!activeProviderKey(provider as never),
    preferred: route ? { provider: route.provider, model: route.model } : null,
    inventory: () => projectInventory(p),
    data: (assetId) => {
      const a = getAsset(assetId);
      return a && a.project_id === p.id && !a.deleted_at ? assetData(a) : null;
    },
  };
}
