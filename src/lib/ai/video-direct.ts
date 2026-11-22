/**
 * Vidéos chez les fabricants accordés par le propriétaire (référence, partie 16 : décision du 18 novembre 2026,
 * autorisation de Seedance le 21 novembre) : Google Vertex (Veo 3.1 Fast et Lite), Kling en direct, BytePlus
 * (Seedance) et Runware (seul intermédiaire, en secours). Rapport 09 du 22 novembre 2026, point 4.
 *
 * Ce fichier ne contient que des fonctions PURES : adresses, corps des demandes, lecture des réponses. Les appels réels,
 * la réservation du budget et la facturation passent par `media-providers.ts` (`directClip`), comme pour fal et Alibaba.
 * Aucune clé ici : le propriétaire les saisit dans Administration › Fournisseurs IA ; sans clé, le fournisseur reste
 * inactif et le moteur garde ce qui marche aujourd'hui.
 *
 * Sources lues le 22 novembre 2026 (aucun appel payant) :
 *  - Kling : https://kling.ai/document-api/api/video/4-0/image-to-video.md (chemin `/image-to-video/kling-4.0`,
 *    `contents[]` avec `first_frame` / `last_frame`, `settings.duration` — facturé 10 s s'il manque —, suivi
 *    `GET /tasks?task_ids=`, fichiers gardés 30 jours) ;
 *  - BytePlus : https://docs.byteplus.com/en/docs/modelark/create-video-generation-task-api
 *    (`POST https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks`, `content[]` avec `role`
 *    `first_frame` / `last_frame`, `safety_identifier`, `generate_audio`, `watermark`, `draft`, `return_last_frame`) ;
 *    la page de suivi ne s'affiche pas sans navigateur : forme de la réponse à confirmer au premier essai ;
 *  - Runware : https://runware.ai/docs/models/index.json et les fiches `schema.json` (`taskType: "videoInference"`,
 *    `inputs.frameImages`, `deliveryMethod: "async"`, `getResponse`, `includeCost`) ;
 *  - Vertex : https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-1-generate (`predictLongRunning`,
 *    `fetchPredictOperation`, identifiants `-001`, région us-central1 seulement, `personGeneration`).
 * Rien de tout cela n'a encore été essayé avec une vraie clé : chaque adaptateur est « écrit, non vérifié ».
 */
import crypto from "node:crypto";

export type DirectVideoProvider = "vertex" | "kling" | "byteplus" | "runware";
export const DIRECT_VIDEO_PROVIDERS: DirectVideoProvider[] = ["vertex", "kling", "byteplus", "runware"];

/** Demande commune à tous les adaptateurs. `image` et `lastImage` : JPEG en base64 (sans préfixe). */
export type DirectClipInput = {
  model: string;
  prompt: string;
  image: string | null;
  /** Image de fin (la même photo, ou la vraie photo sous un autre angle) : garde le produit intact à l'arrivée. */
  lastImage?: string | null;
  aspect: "16:9" | "9:16";
  seconds: number;
  /** Une personne autorisée à l'image (photo du client ou accord écrit) ; sinon le fournisseur l'interdit quand il le sait. */
  people: boolean;
  /** Identifiant haché du client (BytePlus `safety_identifier`) : jamais son adresse ni son nom. */
  endUser?: string | null;
  /** Brouillon bon marché (Seedance « draft », 480p) quand le modèle le permet. */
  draft?: boolean;
  /** Version finale tirée d'un brouillon validé (Seedance `draft_task`). */
  fromDraftTaskId?: string | null;
};

export type DirectRequest = { url: string; method: "POST" | "GET"; headers: Record<string, string>; body?: unknown };
export type DirectPoll =
  | { state: "running" }
  | { state: "done"; videoUrl: string | null; videoBase64: string | null; costUsd: number | null; lastFrameUrl?: string | null }
  | { state: "failed"; message: string }
  | { state: "unknown"; message: string };

/** Identifiant de client envoyé aux fournisseurs qui le demandent : haché, jamais lisible. */
export const hashedEndUser = (userId: string) => crypto.createHash("sha256").update(`ecom-studio:${userId}`).digest("hex").slice(0, 32);

const NO_PEOPLE = "No people, no faces, no hands in frame.";
const KEEP_PRODUCT = "Slow camera; the product does not move and stays exactly identical (shape, label, colours, printed text); no new text anywhere in the image.";
/** Consigne envoyée à tous : la même règle du produit intact, et aucune personne sans accord. */
export const directPrompt = (i: Pick<DirectClipInput, "prompt" | "people">) => [i.prompt, KEEP_PRODUCT, i.people ? "" : NO_PEOPLE].filter(Boolean).join(" ");

// --------------------------------------------------------------------------------------------- Vertex (Veo)

/** Vertex : une seule région pour Veo (page officielle) ; les photos partent aux États-Unis (à dire au propriétaire). */
export const VERTEX_LOCATION = "us-central1";
/**
 * Adresse de Veo sur Vertex. Avec un projet Google Cloud réglé : adresse du projet (clé = jeton d'accès, en-tête
 * Bearer). Sans projet : mode « express » de Vertex (clé d'API Google Cloud, en-tête x-goog-api-key).
 */
export function vertexUrl(model: string, project: string | null, op: "predictLongRunning" | "fetchPredictOperation"): string {
  const m = encodeURIComponent(model);
  return project
    ? `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(project)}/locations/${VERTEX_LOCATION}/publishers/google/models/${m}:${op}`
    : `https://aiplatform.googleapis.com/v1/publishers/google/models/${m}:${op}`;
}
export const vertexHeaders = (key: string, project: string | null): Record<string, string> => ({ "Content-Type": "application/json", ...(project ? { Authorization: `Bearer ${key}` } : { "x-goog-api-key": key }) });

export function vertexStart(i: DirectClipInput, key: string, project: string | null): DirectRequest {
  const img = (b: string) => ({ bytesBase64Encoded: b, mimeType: "image/jpeg" });
  return {
    url: vertexUrl(i.model, project, "predictLongRunning"),
    method: "POST",
    headers: vertexHeaders(key, project),
    body: {
      instances: [{ prompt: directPrompt(i), ...(i.image ? { image: img(i.image) } : {}), ...(i.lastImage ? { lastFrame: img(i.lastImage) } : {}) }],
      // Durée TOUJOURS envoyée (c'est elle qui est facturée) ; son du modèle coupé (la musique vient du Studio) ;
      // « disallow » quand le client n'a fourni ni photo ni accord : la règle devient un réglage du fournisseur.
      parameters: { aspectRatio: i.aspect, durationSeconds: i.seconds, personGeneration: i.people ? "allow_adult" : "disallow", sampleCount: 1, generateAudio: false, resolution: "720p" },
    },
  };
}
export const vertexPoll = (model: string, operation: string, key: string, project: string | null): DirectRequest => ({ url: vertexUrl(model, project, "fetchPredictOperation"), method: "POST", headers: vertexHeaders(key, project), body: { operationName: operation } });
export function vertexTask(j: any): string | null {
  return typeof j?.name === "string" && j.name ? j.name : null;
}
export function vertexRead(j: any): DirectPoll {
  if (!j || typeof j !== "object") return { state: "unknown", message: "réponse illisible" };
  if (j.error) return { state: "failed", message: String(j.error.message ?? j.error.code ?? "erreur") };
  if (!j.done) return { state: "running" };
  const v = j.response?.videos?.[0];
  if (!v) return { state: "failed", message: j.response?.raiMediaFilteredCount ? "vidéo filtrée par le fournisseur (non facturée)" : "aucune vidéo renvoyée" };
  return { state: "done", videoUrl: v.gcsUri ?? null, videoBase64: v.bytesBase64Encoded ?? null, costUsd: null };
}

// --------------------------------------------------------------------------------------------- Kling en direct

export const KLING_BASE = "https://api-singapore.klingai.com";
export function klingStart(i: DirectClipInput, key: string): DirectRequest {
  const contents: Record<string, string>[] = [{ type: "prompt", text: directPrompt(i) }];
  if (i.image) contents.push({ type: "first_frame", url: i.image });
  // Kling 4.0 Flash : image de départ seulement (carte des capacités).
  if (i.lastImage && !/flash/.test(i.model)) contents.push({ type: "last_frame", url: i.lastImage });
  return {
    url: `${KLING_BASE}/image-to-video/${encodeURIComponent(i.model)}`,
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    // « When this parameter is omitted … the default is 10 seconds » : la durée est TOUJOURS envoyée.
    body: { contents, settings: { duration: Math.round(i.seconds), resolution: "720p" }, options: { watermark_info: { enabled: false } } },
  };
}
export const klingPoll = (taskId: string, key: string): DirectRequest => ({ url: `${KLING_BASE}/tasks?task_ids=${encodeURIComponent(taskId)}`, method: "GET", headers: { Authorization: `Bearer ${key}` } });
export function klingTask(j: any): string | null {
  return j?.code === 0 && typeof j?.data?.id === "string" ? j.data.id : null;
}
export function klingRead(j: any): DirectPoll {
  const t = Array.isArray(j?.data) ? j.data[0] : j?.data;
  if (!t) return { state: "unknown", message: String(j?.message ?? "tâche introuvable") };
  if (t.status === "failed") return { state: "failed", message: String(t.message ?? "échec") };
  if (t.status !== "succeeded") return { state: "running" };
  const v = (t.outputs ?? []).find((o: any) => o?.type === "video");
  return v?.url ? { state: "done", videoUrl: v.url, videoBase64: null, costUsd: null } : { state: "failed", message: "tâche terminée sans vidéo" };
}

// --------------------------------------------------------------------------------------------- BytePlus (Seedance)

export const BYTEPLUS_BASE = "https://ark.ap-southeast.bytepluses.com/api/v3";
/** Seedance 2.5 : seul modèle accordé avec un brouillon (« Draft », 480p au prix du 480p). */
export const seedanceDraft = (model: string) => /seedance-2-5/.test(model) && !/flash/.test(model);
export function byteplusStart(i: DirectClipInput, key: string): DirectRequest {
  const dataUri = (b: string) => `data:image/jpeg;base64,${b}`;
  const content: Record<string, unknown>[] = i.fromDraftTaskId
    ? [{ type: "draft_task", draft_task: { id: i.fromDraftTaskId } }]
    : [
        { type: "text", text: directPrompt(i) },
        ...(i.image ? [{ type: "image_url", image_url: { url: dataUri(i.image) }, role: "first_frame" }] : []),
        ...(i.lastImage ? [{ type: "image_url", image_url: { url: dataUri(i.lastImage) }, role: "last_frame" }] : []),
      ];
  const draft = !!i.draft && seedanceDraft(i.model);
  return {
    url: `${BYTEPLUS_BASE}/contents/generations/tasks`,
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: {
      model: i.model,
      content,
      resolution: draft ? "480p" : "720p",
      ratio: i.aspect,
      duration: Math.round(i.seconds),
      // Son du modèle coupé (musique du Studio) ; aucun filigrane ; dernière image rendue pour la comparer au produit.
      generate_audio: false,
      watermark: false,
      return_last_frame: true,
      ...(draft ? { draft: true } : {}),
      // Obligation de « Platform Customer » : l'identifiant (haché) du client final à chaque appel.
      ...(i.endUser ? { safety_identifier: i.endUser } : {}),
    },
  };
}
export const byteplusPoll = (taskId: string, key: string): DirectRequest => ({ url: `${BYTEPLUS_BASE}/contents/generations/tasks/${encodeURIComponent(taskId)}`, method: "GET", headers: { Authorization: `Bearer ${key}` } });
export function byteplusTask(j: any): string | null {
  return typeof j?.id === "string" && j.id ? j.id : null;
}
export function byteplusRead(j: any): DirectPoll {
  if (!j || typeof j !== "object") return { state: "unknown", message: "réponse illisible" };
  if (j.status === "failed" || j.status === "cancelled" || j.status === "expired") return { state: "failed", message: String(j.error?.message ?? j.status) };
  if (j.status !== "succeeded") return j.status ? { state: "running" } : { state: "unknown", message: String(j.error?.message ?? "état absent") };
  return j.content?.video_url ? { state: "done", videoUrl: j.content.video_url, videoBase64: null, costUsd: null, lastFrameUrl: j.content.last_frame_url ?? null } : { state: "failed", message: "tâche terminée sans vidéo" };
}

// --------------------------------------------------------------------------------------------- Runware (secours)

export const RUNWARE_URL = "https://api.runware.ai/v1";
export function runwareStart(i: DirectClipInput, key: string, taskUUID: string): DirectRequest {
  const dataUri = (b: string) => `data:image/jpeg;base64,${b}`;
  const frames = [...(i.image ? [{ image: dataUri(i.image), frame: "first" }] : []), ...(i.lastImage ? [{ image: dataUri(i.lastImage), frame: "last" }] : [])];
  return {
    url: RUNWARE_URL,
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: [
      {
        taskType: "videoInference",
        taskUUID,
        model: i.model,
        positivePrompt: directPrompt(i),
        duration: Math.round(i.seconds),
        ...(frames.length ? { inputs: { frameImages: frames } } : {}),
        // Coût exact de chaque demande (compteur du budget) ; réponse à interroger, jamais un rappel.
        deliveryMethod: "async",
        includeCost: true,
        ...(i.model.startsWith("google:") ? { providerSettings: { google: { generateAudio: false, personGeneration: i.people ? "allow_adult" : "disallow" } } } : {}),
      },
    ],
  };
}
export const runwarePoll = (taskUUID: string, key: string): DirectRequest => ({ url: RUNWARE_URL, method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: [{ taskType: "getResponse", taskUUID }] });
export function runwareTask(j: any, taskUUID: string): string | null {
  if (Array.isArray(j?.errors) && j.errors.length) return null;
  return Array.isArray(j?.data) ? taskUUID : null;
}
export function runwareRead(j: any): DirectPoll {
  if (Array.isArray(j?.errors) && j.errors.length) return { state: "failed", message: String(j.errors[0]?.message ?? "erreur") };
  const d = Array.isArray(j?.data) ? j.data.find((x: any) => x?.videoURL || x?.status) : null;
  if (!d) return { state: "running" };
  if (d.status === "error") return { state: "failed", message: String(d.message ?? "échec") };
  if (!d.videoURL) return { state: "running" };
  return { state: "done", videoUrl: d.videoURL, videoBase64: null, costUsd: typeof d.cost === "number" ? d.cost : null };
}

// --------------------------------------------------------------------------------------------- aiguillage

export function directStart(provider: DirectVideoProvider, i: DirectClipInput, key: string, o: { project?: string | null; taskUUID?: string } = {}): DirectRequest {
  if (provider === "vertex") return vertexStart(i, key, o.project ?? null);
  if (provider === "kling") return klingStart(i, key);
  if (provider === "byteplus") return byteplusStart(i, key);
  return runwareStart(i, key, o.taskUUID ?? crypto.randomUUID());
}
export function directTask(provider: DirectVideoProvider, j: unknown, taskUUID?: string): string | null {
  return provider === "vertex" ? vertexTask(j) : provider === "kling" ? klingTask(j) : provider === "byteplus" ? byteplusTask(j) : runwareTask(j, taskUUID ?? "");
}
export function directPoll(provider: DirectVideoProvider, model: string, taskId: string, key: string, project: string | null = null): DirectRequest {
  return provider === "vertex" ? vertexPoll(model, taskId, key, project) : provider === "kling" ? klingPoll(taskId, key) : provider === "byteplus" ? byteplusPoll(taskId, key) : runwarePoll(taskId, key);
}
export function directRead(provider: DirectVideoProvider, j: unknown): DirectPoll {
  return provider === "vertex" ? vertexRead(j) : provider === "kling" ? klingRead(j) : provider === "byteplus" ? byteplusRead(j) : runwareRead(j);
}
/** Origines permises pour chaque fournisseur : une clé ne part jamais ailleurs. */
export const DIRECT_ORIGINS: Record<DirectVideoProvider, RegExp> = {
  vertex: /^https:\/\/([a-z0-9-]+-)?aiplatform\.googleapis\.com$/,
  kling: /^https:\/\/api-singapore\.klingai\.com$/,
  byteplus: /^https:\/\/ark\.ap-southeast\.bytepluses\.com$/,
  runware: /^https:\/\/api\.runware\.ai$/,
};
