/**
 * Fournisseurs vidéo (Router V2) : capacités DÉCLARÉES et leur niveau de vérification. « code » = capacité déjà
 * utilisée par le studio (appel réel écrit et en service) ; « documented » = annoncée par le fournisseur mais jamais
 * appelée ici — elle n'est donc PAS utilisée par le moteur tant qu'elle n'a pas été vérifiée (benchmark 7B).
 *
 * Le choix suit le Router V2 (modèles déclarés dans `orchestrator/capabilities.ts`, clés actives) ; un fournisseur
 * indisponible est remplacé par un autre réellement compatible avec le besoin du plan. Coût estimé au tarif de
 * l'administration, avant tout envoi.
 */
import { EUR } from "../billing";
import { priceFor, usdToEur } from "../ai/config";
import { capableModels } from "../orchestrator/capabilities";
import { MEDIA_MODELS, mediaModel } from "../ai/media-models";
import { mediaStatus } from "../ai/media-routing";
import type { VideoAspect, VideoCapability } from "./types";

export const VIDEO_CAPABILITIES: VideoCapability[] = [
  {
    provider: "google",
    model: "veo-3.0-generate-001",
    textToVideo: true,
    imageToVideo: true,
    references: false,
    durations: [8],
    aspects: ["16:9", "9:16"],
    maxResolution: "1080p (documentée ; non mesurée ici)",
    cameraControl: "prompt",
    people: true,
    crossShotConsistency: "start_frame",
    nativeAudio: true,
    verification: { imageToVideo: "code", people: "code", nativeAudio: "code", textToVideo: "documented" },
  },
  {
    provider: "google",
    model: "veo-3.0-fast-generate-001",
    textToVideo: true,
    imageToVideo: true,
    references: false,
    durations: [8],
    aspects: ["16:9", "9:16"],
    maxResolution: "1080p (documentée ; non mesurée ici)",
    cameraControl: "prompt",
    people: true,
    crossShotConsistency: "start_frame",
    nativeAudio: true,
    verification: { imageToVideo: "code", people: "code", nativeAudio: "code", textToVideo: "documented" },
  },
  {
    provider: "fal",
    model: "fal-ai/kling-video/v2.1/pro/image-to-video",
    textToVideo: false,
    imageToVideo: true,
    references: false,
    durations: [5, 10],
    // Image vers vidéo : le cadre suit l'image de départ (préparée au bon format par le studio).
    aspects: ["16:9", "9:16", "1:1"],
    maxResolution: "1080p (documentée ; non mesurée ici)",
    cameraControl: "prompt",
    people: true,
    crossShotConsistency: "start_frame",
    nativeAudio: false,
    verification: { imageToVideo: "code", people: "code" },
  },
];

// Modèles vidéo récents du catalogue (Veo 3.1, Kling 3) : même chemin d'appel que ceux ci-dessus (adaptateurs veo /
// fal_video), d'où des capacités « code » ; leur usage reste soumis à la clé, au tarif et à la vérification.
for (const m of MEDIA_MODELS) {
  if (m.kind !== "video" || !m.adapter || VIDEO_CAPABILITIES.some((c) => c.provider === m.provider && c.model === m.model)) continue;
  VIDEO_CAPABILITIES.push({
    provider: m.provider,
    model: m.model,
    textToVideo: !!m.caps.textToVideo,
    imageToVideo: !!m.caps.imageToVideo,
    references: false,
    durations: m.durations ?? [8],
    aspects: m.aspects as VideoCapability["aspects"],
    maxResolution: m.resolution,
    cameraControl: "prompt",
    people: !!m.caps.people,
    crossShotConsistency: "start_frame",
    nativeAudio: !!m.caps.audio,
    verification: { imageToVideo: "code", people: "code", ...(m.caps.audio ? { nativeAudio: "code" as const } : {}), ...(m.caps.textToVideo ? { textToVideo: "documented" as const } : {}) },
  });
}

export type ShotNeed = { imageToVideo: boolean; people: boolean; nativeAudio: boolean; aspect: VideoAspect; durationS: number };

/** Capacité VÉRIFIÉE (jamais seulement documentée) : seule base d'une décision. */
export function verified(c: VideoCapability, cap: keyof VideoCapability["verification"]): boolean {
  return c.verification[cap] === "code" && !!c[cap];
}

export function compatible(c: VideoCapability, n: ShotNeed): string | null {
  if (n.imageToVideo && !verified(c, "imageToVideo")) return "image vers vidéo non vérifié";
  if (!n.imageToVideo && !verified(c, "textToVideo")) return "texte vers vidéo non vérifié";
  if (n.people && !verified(c, "people")) return "personnages non vérifiés";
  if (n.nativeAudio && !verified(c, "nativeAudio")) return "son natif absent";
  // Format : le plan est recadré au montage ; un 4:5 / 1:1 se tourne en 9:16 (recadrage sans perte de sujet).
  const shootAspect = n.aspect === "16:9" ? "16:9" : "9:16";
  if (!c.aspects.includes(shootAspect) && !c.aspects.includes(n.aspect)) return `format ${n.aspect} non pris en charge`;
  return null;
}

/** Coût estimé d'un plan (EUR micro) au tarif de l'administration ; null : tarif inconnu (génération refusée). */
export function estimateMicro(provider: string, model: string, seconds: number): number | null {
  const p = priceFor(provider, model);
  if (!p || p.unit !== "video_second" || !(p.perSecond > 0)) return null;
  return Math.round(seconds * p.perSecond * usdToEur() * EUR);
}

/** Durée réellement générée pour un plan : la plus courte acceptée qui couvre le besoin (sinon la plus longue). */
export function shootDuration(c: VideoCapability, needS: number): number {
  return c.durations.find((d) => d >= needS) ?? c.durations[c.durations.length - 1];
}

export type ProviderChoice = { provider: string; model: string; shootS: number; estimateMicro: number; reason: string; rejected: { model: string; why: string }[] };

/**
 * Fournisseur pour un plan : modèles déclarés au Router V2 ET listés ici, clé active, capacités vérifiées
 * compatibles, tarif connu. Préférence : le modèle de la route d'administration s'il convient, puis le moins cher.
 */
export function chooseProvider(n: ShotNeed, o: { available: (provider: string) => boolean; preferred?: { provider: string; model: string } | null; estimate?: typeof estimateMicro }): ProviderChoice | null {
  const est = o.estimate ?? estimateMicro;
  const routed = new Set(capableModels(["video_generation"]).map((m) => `${m.provider}:${m.model}`));
  const rejected: ProviderChoice["rejected"] = [];
  const ok: (ProviderChoice & { pref: boolean })[] = [];
  for (const c of VIDEO_CAPABILITIES) {
    const key = `${c.provider}:${c.model}`;
    // Déclaration : Router V2 (modèles historiques) ou catalogue multimédia (vérifié par l'administration ci-dessous).
    if (!routed.has(key) && !mediaModel(c.provider, c.model)) {
      rejected.push({ model: key, why: "non déclaré au Router V2" });
      continue;
    }
    if (!o.available(c.provider)) {
      rejected.push({ model: key, why: "clé inactive" });
      continue;
    }
    // Modèle du catalogue multimédia : utilisable (tarif, vérification) et activé par l'administration.
    const mm = mediaModel(c.provider, c.model);
    const st = mm ? mediaStatus(mm) : null;
    if (st && (!st.confirmed || !st.enabled)) {
      rejected.push({ model: key, why: !st.confirmed ? "à confirmer dans l'administration" : "désactivé" });
      continue;
    }
    const why = compatible(c, n);
    if (why) {
      rejected.push({ model: key, why });
      continue;
    }
    const shootS = shootDuration(c, n.durationS);
    const e = est(c.provider, c.model, shootS);
    if (e == null) {
      rejected.push({ model: key, why: "tarif inconnu" });
      continue;
    }
    const pref = !!o.preferred && o.preferred.provider === c.provider && o.preferred.model === c.model;
    ok.push({ provider: c.provider, model: c.model, shootS, estimateMicro: e, reason: pref ? "route de l'administration" : "moins cher compatible", rejected, pref });
  }
  if (!ok.length) return null;
  ok.sort((a, b) => Number(b.pref) - Number(a.pref) || a.estimateMicro - b.estimateMicro);
  const { pref: _p, ...best } = ok[0];
  return { ...best, rejected };
}
