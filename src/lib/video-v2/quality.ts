/**
 * Barrière de qualité vidéo V2.
 *
 *  - Plans générés (`video_shot_v2`) : images de début, milieu et fin contrôlées — produit identique au réel,
 *    personnage cohérent avec le plan de référence, sujet tenu, pas d'artefact majeur. Produit transformé = fatal.
 *  - Vidéo complète (`video_v2`) : contrôles LOCAUX gratuits (durée, plans trop courts, lisibilité et rythme des
 *    sous-titres, zones de sécurité, audio mesuré, synchronisation voix / sous-titres, mention IA, montage répétitif,
 *    affirmations du script) puis relecture IA sur des images clés (13 critères). Sans relecture : au mieux
 *    PROVISOIRE (à valider par le client) — une vidéo exportable mais médiocre n'est jamais FINAL.
 */
import { z } from "zod";
import { decide, type GateDecision } from "../quality/gate";
import { absoluteCues, timeline } from "./doc";
import type { AudioMeasure } from "./audio";
import { VIDEO_CRITERIA, type ShotReview, type VideoCriterion, type VideoDocument, type VideoReview } from "./types";

const score = z.coerce.number().min(0).max(10).catch(0);
export const ShotReviewSchema = z.object({
  score,
  sameProduct: z.boolean().nullable().catch(null),
  productAltered: z.boolean().catch(false),
  characterConsistent: z.boolean().nullable().catch(null),
  offTopic: z.boolean().catch(false),
  artifacts: z.boolean().catch(false),
  issues: z.array(z.string()).catch([]),
});
export const VideoReviewSchema = z.object({
  criteria: z.object(Object.fromEntries(VIDEO_CRITERIA.map((k) => [k, score])) as Record<VideoCriterion, typeof score>),
  issues: z.array(z.string()).catch([]),
  fix: z.object({ target: z.enum(["shot", "audio", "subtitles", "editing", "script", "none"]).catch("none"), shotId: z.string().nullable().catch(null), instruction: z.string().catch("") }).catch({ target: "none", shotId: null, instruction: "" }),
});

export const SHOT_REVIEW_SYSTEM = `Rôle : chef opérateur et contrôleur qualité d'une agence vidéo exigeante. Tu juges UN plan vidéo généré à partir de trois images (début, milieu, fin) et, si fournies, de l'image de référence du produit réel et de l'image de référence du personnage.
score : qualité globale du plan sur 10. sameProduct : le produit montré est-il le même que la référence (forme, couleurs, proportions, logo, packaging, textes) ? productAltered : le produit est-il déformé ou transformé à un moment du plan ? characterConsistent : le personnage (visage, tenue) est-il le même que sur la référence ? offTopic : le plan est-il hors du sujet demandé ? artifacts : artefacts majeurs (mains, visages, objets fondus, texte inventé) ?
Sois strict : un produit transformé n'est jamais acceptable.`;

export const VIDEO_REVIEW_SYSTEM = `Rôle : directeur de création d'une agence vidéo (niveau 2026). Tu juges UNE vidéo commerciale à partir d'images clés, de son script et de ses mesures techniques.
Note de 0 à 10 : relevance, narrative (le récit tient-il de l'accroche au CTA ?), visual, continuity, product_fidelity, brand, realism, motion, editing, audio, sync, subtitles, commercial (exploitable pour vendre ?).
Sois strict : 8 se mérite ; une vidéo propre mais générique ne dépasse pas 6 en commercial. « fix » : LA correction la plus utile (shot avec son identifiant, audio, subtitles, editing, script ou none).`;

export function shotCodes(r: ShotReview, o: { expectsProduct: boolean; expectsCharacter: boolean }): string[] {
  const codes: string[] = [];
  if (o.expectsProduct && (r.productAltered || r.sameProduct === false)) codes.push(r.sameProduct === false ? "wrong_product" : "product_altered");
  if (o.expectsCharacter && r.characterConsistent === false) codes.push("character_inconsistent");
  if (r.offTopic) codes.push("off_topic");
  if (r.artifacts) codes.push("major_artifacts");
  return codes;
}

/** Décision sur un plan généré : contrôle obligatoire ; panne du contrôle → jamais FINAL. */
export function gateShot(o: { review: ShotReview | null; error?: string | null; expectsProduct: boolean; expectsCharacter: boolean; attempt: number }): GateDecision {
  if (o.error || !o.review) return decide("video_shot_v2", { checker: "ai", score: null, error: o.error ?? "plan non contrôlé" }, { attempt: o.attempt });
  return decide("video_shot_v2", { checker: "ai", score: o.review.score, codes: shotCodes(o.review, o), issues: o.review.issues }, { attempt: o.attempt });
}

export type LocalVideoCheck = { codes: string[]; issues: string[]; measures: Record<string, number | string | boolean | null> };

/** Contrôles locaux gratuits de la vidéo assemblée (avant toute relecture payante). */
export function localVideoChecks(doc: VideoDocument, o: { targetS: number; scriptIssues: string[]; audio: AudioMeasure | null; fileDurationS?: number | null }): LocalVideoCheck {
  const codes: string[] = [];
  const issues: string[] = [];
  const { total } = timeline(doc);
  // Durée : respectée à 10 % près (au moins 1 s).
  if (Math.abs(total - o.targetS) > Math.max(1, o.targetS * 0.1)) {
    codes.push("duration_mismatch");
    issues.push(`durée ${total.toFixed(1)} s au lieu de ${o.targetS} s`);
  }
  if (o.fileDurationS != null && Math.abs(o.fileDurationS - total) > 0.5) {
    codes.push("out_of_sync");
    issues.push(`fichier de ${o.fileDurationS.toFixed(1)} s pour une timeline de ${total.toFixed(1)} s`);
  }
  for (const c of doc.clips) if (c.durationS < 0.8) issues.push(`plan « ${c.label} » très court (${c.durationS} s)`);
  // Sous-titres : taille lisible sur téléphone, débit de lecture, zone de sécurité, synchronisés avec la voix.
  const st = doc.subtitles.style;
  const minSize = Math.round(Math.min(doc.width, doc.height) * 0.035);
  if (st.enabled && st.size < minSize) {
    codes.push("illegible_text");
    issues.push(`sous-titres de ${st.size} px (au moins ${minSize} px)`);
  }
  const cues = absoluteCues(doc);
  for (const q of cues) {
    const cps = q.text.length / Math.max(0.1, q.end - q.start);
    if (cps > 22) {
      codes.push("illegible_text");
      issues.push(`sous-titre trop rapide (${Math.round(cps)} caractères/s) : « ${q.text.slice(0, 30)} »`);
    }
  }
  if (st.enabled && st.position === "bottom" && st.offsetY > doc.safe.bottom * 0.2) {
    codes.push("safe_zone");
    issues.push("sous-titres dans la zone recouverte par l'interface de la plateforme");
  }
  // Voix ↔ sous-titres : chaque voix enregistrée a des sous-titres pendant qu'elle parle.
  const { starts } = timeline(doc);
  const at = new Map(doc.clips.map((c, k) => [c.id, starts[k]]));
  for (const v of doc.audio.voice) {
    const s = at.get(v.clipId);
    if (s == null || !v.assetId) continue;
    const a = s + v.offsetS;
    const b = a + v.durationS;
    // Phrase affichée en grand par la composition du plan (typographie animée) : déjà lisible, pas de sous-titre.
    const clip = doc.clips.find((c) => c.id === v.clipId);
    const fold = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const shown = clip?.source.kind === "doc" && clip.source.doc.layers.some((l) => (l.kind === "text" || l.kind === "button") && fold(l.text).includes(fold(v.text)));
    if (st.enabled && !shown && !cues.some((q) => q.start < b && q.end > a)) {
      codes.push("out_of_sync");
      issues.push(`voix du plan ${v.clipId} sans sous-titres en même temps`);
    }
  }
  // Audio mesuré : présent, ni muet ni saturé, proche de l'intensité visée.
  if (o.audio) {
    const wantsSound = !!doc.audio.music || doc.audio.voice.some((v) => v.assetId);
    if (wantsSound && o.audio.silent) {
      codes.push("audio_unusable");
      issues.push("piste audio muette alors que musique ou voix sont prévues");
    } else if (wantsSound && o.audio.lufs != null && Math.abs(o.audio.lufs - doc.audio.loudnessLufs) > 3) {
      codes.push("audio_unusable");
      issues.push(`intensité ${o.audio.lufs} LUFS (visée ${doc.audio.loudnessLufs})`);
    }
    if (o.audio.truePeakDb != null && o.audio.truePeakDb > -0.5) {
      codes.push("audio_unusable");
      issues.push(`saturation (crête ${o.audio.truePeakDb} dBFS)`);
    }
  }
  // Mention IA obligatoire dès qu'un plan est généré.
  if (doc.clips.some((c) => c.generated) && !doc.disclosure) {
    codes.push("missing_disclosure");
    issues.push("plans générés par l'IA sans mention « vidéo générée par IA »");
  }
  // Montage : transitions identiques (hors coupe franche) sur presque tous les plans = effet automatique.
  const trans = doc.clips.slice(1).map((c) => c.transitionIn.kind).filter((k) => k !== "cut");
  if (trans.length >= 4) {
    const top = Math.max(...["fade", "slide", "zoom", "wipe"].map((k) => trans.filter((x) => x === k).length));
    if (top / (doc.clips.length - 1) > 0.75) {
      codes.push("repetitive_editing");
      issues.push("la même transition sur presque tous les plans");
    }
  }
  // Script : affirmation non confirmée = inventée (fatale) ; formules creuses signalées.
  for (const s of o.scriptIssues) {
    if (/non confirm|à éviter/.test(s)) {
      codes.push("invented_claim");
      issues.push(`script : ${s}`);
    } else issues.push(`script : ${s}`);
  }
  return { codes: [...new Set(codes)], issues: [...new Set(issues)], measures: { durationS: total, clips: doc.clips.length, cues: cues.length, lufs: o.audio?.lufs ?? null, truePeakDb: o.audio?.truePeakDb ?? null } };
}

export function reviewVideoCodes(r: VideoReview): string[] {
  const codes: string[] = [];
  if (r.criteria.product_fidelity < 4) codes.push("product_altered");
  if (r.criteria.continuity < 5) codes.push("character_inconsistent");
  if (r.criteria.relevance < 5) codes.push("off_topic");
  if (r.criteria.audio < 4) codes.push("audio_unusable");
  if (r.criteria.sync < 5) codes.push("out_of_sync");
  if (r.criteria.subtitles < 4) codes.push("illegible_text");
  return codes;
}

export const videoScore = (r: VideoReview) => {
  const w: Record<VideoCriterion, number> = { relevance: 1.5, narrative: 1.5, visual: 1.2, continuity: 1, product_fidelity: 1.5, brand: 1, realism: 0.8, motion: 0.8, editing: 1, audio: 1, sync: 0.8, subtitles: 0.8, commercial: 1.5 };
  const tot = VIDEO_CRITERIA.reduce((s, k) => s + w[k], 0);
  return Math.round((VIDEO_CRITERIA.reduce((s, k) => s + r.criteria[k] * w[k], 0) / tot) * 10) / 10;
};

/** Décision vidéo : contrôles locaux d'abord ; sans relecture, jamais FINAL ; relecture en panne, jamais validée. */
export function gateVideo(o: { local: LocalVideoCheck; review: VideoReview | null; reviewError?: string | null; shotCodes?: string[]; attempt: number }): GateDecision {
  const extra = o.shotCodes ?? [];
  if (o.local.codes.length || extra.length) return decide("video_v2", { checker: o.review ? "ai" : "local", score: o.review ? videoScore(o.review) : 0, codes: [...o.local.codes, ...extra, ...(o.review ? reviewVideoCodes(o.review) : [])], issues: o.local.issues }, { attempt: o.attempt });
  if (o.reviewError) return decide("video_v2", { checker: "ai", score: null, error: o.reviewError }, { attempt: o.attempt });
  if (!o.review) return decide("video_v2", { checker: "local", score: 6 }, { attempt: o.attempt });
  const issues = [...o.review.issues, ...(o.review.fix.target !== "none" && o.review.fix.instruction ? [`${o.review.fix.target}${o.review.fix.shotId ? ` ${o.review.fix.shotId}` : ""} : ${o.review.fix.instruction}`] : [])];
  return decide("video_v2", { checker: "ai", score: videoScore(o.review), criteria: o.review.criteria, codes: reviewVideoCodes(o.review), issues }, { attempt: o.attempt });
}
