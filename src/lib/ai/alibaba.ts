/**
 * Alibaba Cloud Model Studio (DashScope) — IMAGES (Qwen-Image) et VIDÉOS (Wan) uniquement. Aucun modèle de texte.
 *
 * Fonctions pures (adresses, requêtes, réponses, erreurs) : les appels réels, la réservation du budget et la facturation
 * passent par media-providers.ts, comme pour OpenAI, Gemini et fal.ai.
 *
 * Sources (relevé du 15/10/2026) :
 *  - SDK officiel `dashscope` 1.27.7 (PyPI, code lu) : domaines par région, chemins
 *    `services/aigc/multimodal-generation/generation` (image, synchrone), `services/aigc/video-generation/video-synthesis`
 *    (vidéo, asynchrone, en-tête `X-DashScope-Async: enable`), suivi `GET tasks/{id}`, en-tête facultatif
 *    `X-DashScope-WorkSpace`, statuts PENDING / RUNNING / SUSPENDED / SUCCEEDED / FAILED / CANCELED / UNKNOWN,
 *    champs vidéo (`prompt`, `negative_prompt`, `img_url`, `media`, `resolution`, `duration`, `watermark`…).
 *  - Pages de documentation Model Studio (consultées par extraits, pages complètes inaccessibles depuis le studio) :
 *    identifiants de modèles, tailles, forme des réponses image, codes d'erreur. → à confirmer au premier essai réel.
 */
import { getSetting } from "../settings";
import { isGatewayKey } from "./gateway";
import { L } from "../i18n-server";

export type AlibabaRegion = "intl" | "us" | "cn";
export const ALIBABA_REGIONS: Record<AlibabaRegion, { label: { fr: string; en: string }; base: string }> = {
  intl: { label: { fr: "International (Singapour)", en: "International (Singapore)" }, base: "https://dashscope-intl.aliyuncs.com/api/v1" },
  us: { label: { fr: "États-Unis (Virginie)", en: "United States (Virginia)" }, base: "https://dashscope-us.aliyuncs.com/api/v1" },
  cn: { label: { fr: "Chine (Pékin)", en: "China (Beijing)" }, base: "https://dashscope.aliyuncs.com/api/v1" },
};

/** Adresse personnalisée acceptée : HTTPS sur un domaine Alibaba Cloud (aucune autre destination possible). */
export const ALIBABA_ENDPOINT_RE = /^https:\/\/([a-z0-9-]+\.)*aliyuncs\.com(\/api\/v1)?\/?$/i;

export function alibabaRegion(): AlibabaRegion {
  const r = getSetting("provider.alibaba.region");
  return r === "us" || r === "cn" ? r : "intl";
}

/** Adresse de base de l'API : adresse personnalisée valide de l'administration, sinon celle de la région. */
export function alibabaBase(): { base: string; problem: string | null } {
  const custom = getSetting("provider.alibaba.endpoint")?.trim();
  if (custom) {
    if (!ALIBABA_ENDPOINT_RE.test(custom)) return { base: ALIBABA_REGIONS[alibabaRegion()].base, problem: L("Adresse d'API invalide : seule une adresse https://…aliyuncs.com est acceptée (adresse de la région utilisée à la place).", "Invalid API address: only an https://…aliyuncs.com address is accepted (the region's address is used instead).") };
    const b = custom.replace(/\/+$/, "");
    return { base: /\/api\/v1$/.test(b) ? b : `${b}/api/v1`, problem: null };
  }
  return { base: ALIBABA_REGIONS[alibabaRegion()].base, problem: null };
}

export function alibabaHeaders(key: string, o: { async?: boolean } = {}): Record<string, string> {
  const ws = getSetting("provider.alibaba.workspace")?.trim();
  return {
    // Clé injectée par la passerelle de l'hébergement : aucune autorisation envoyée par le studio.
    ...(isGatewayKey(key) ? {} : { Authorization: `Bearer ${key}` }),
    "Content-Type": "application/json",
    ...(o.async ? { "X-DashScope-Async": "enable" } : {}),
    ...(ws ? { "X-DashScope-WorkSpace": ws } : {}),
  };
}

/**
 * Règle du studio : aucune personne inventée sans photo fournie par le client ou autorisation explicite. Pour
 * Qwen-Image et Wan, la consigne le dit ET le « negative prompt » l'exclut.
 */
export const NO_PEOPLE_NEGATIVE = "people, person, human, man, woman, child, face, faces, portrait, hands, fingers, body, model, mannequin, crowd";
const BASE_NEGATIVE = "watermark, blurry, low quality, distorted, deformed, extra text, misspelled text";
export function negativePrompt(people: boolean): string {
  return people ? BASE_NEGATIVE : `${BASE_NEGATIVE}, ${NO_PEOPLE_NEGATIVE}`;
}
export function noPeopleLine(people: boolean): string {
  return people ? "" : " No people, no person, no face, no hands, no body, no mannequin.";
}

/** Tailles Qwen-Image (largeur*hauteur) par format du studio : préréglages documentés (1328², 16:9, 9:16, 3:4). */
export const QWEN_SIZES: Record<string, string> = { "1:1": "1328*1328", "16:9": "1664*928", "9:16": "928*1664", "4:5": "1104*1472", "3:4": "1104*1472", "2:3": "1104*1472" };
export const qwenSize = (aspect: string) => QWEN_SIZES[aspect] ?? QWEN_SIZES["1:1"];

/** Corps d'une génération / retouche Qwen-Image (point d'accès synchrone « multimodal-generation »). */
export function qwenImageBody(o: { model: string; prompt: string; aspect: string; references: string[]; people: boolean }) {
  const content: Record<string, string>[] = [...o.references.map((image) => ({ image })), { text: `${o.prompt}${noPeopleLine(o.people)}` }];
  return {
    model: o.model,
    input: { messages: [{ role: "user", content }] },
    // Une seule image, sans filigrane ; la consigne n'est pas réécrite par le fournisseur (texte exact du studio).
    parameters: { n: 1, size: qwenSize(o.aspect), watermark: false, prompt_extend: false, negative_prompt: negativePrompt(o.people) },
  };
}

/** Adresse de l'image produite (réponse synchrone), null si aucune. */
export function qwenImageUrl(j: any): string | null {
  const content = j?.output?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) for (const c of content) if (typeof c?.image === "string") return c.image;
  // Ancienne forme des tâches d'images (résultats).
  return j?.output?.results?.[0]?.url ?? null;
}

/** Wan 3.0 : modèle « tout-en-un » (entrées décrites par `media`) ; Wan 2.x : `img_url`. */
export const wanUsesMedia = (model: string) => /^wan3\./.test(model);

/**
 * Wan 2.6 Flash : vidéo SANS son (`audio: false`, tarif « no audio » de l'API, vérifié par les essais réels du
 * 15/10/2026 : la réponse confirme `audio: false`), en 1080P, un seul plan continu ; la musique est celle du studio.
 */
export const wanSilentFlash = (model: string) => /^wan2\.6-(i2v|r2v)-flash$/.test(model);
/** Résolution demandée : 1080P pour Wan 2.6 Flash sans son (0,0375 $/s), 720P pour les autres modèles. */
export const wanResolution = (model: string) => (wanSilentFlash(model) ? "1080P" : WAN_RESOLUTION);

/** Corps d'une génération vidéo Wan (point d'accès asynchrone « video-synthesis »). */
export function wanVideoBody(o: { model: string; prompt: string; image: string | null; seconds: number; people: boolean }) {
  const prompt = `${o.prompt}${o.people ? "" : " No people in frame."}`;
  const input: Record<string, unknown> = { prompt, negative_prompt: negativePrompt(o.people) };
  if (o.image) {
    if (wanUsesMedia(o.model)) input.media = [{ type: "first_frame", url: o.image }];
    else input.img_url = o.image;
  }
  return { model: o.model, input, parameters: { resolution: wanResolution(o.model), duration: o.seconds, watermark: false, prompt_extend: false, ...(wanSilentFlash(o.model) ? { audio: false, shot_type: "single" } : {}) } };
}
export const WAN_RESOLUTION = "720P";

export type WanTaskStatus = "PENDING" | "RUNNING" | "SUSPENDED" | "SUCCEEDED" | "FAILED" | "CANCELED" | "UNKNOWN";
export function wanTask(j: any): { id: string | null; status: WanTaskStatus; videoUrl: string | null; message: string | null } {
  const o = j?.output ?? {};
  return { id: o.task_id ?? null, status: (o.task_status ?? "UNKNOWN") as WanTaskStatus, videoUrl: o.video_url ?? o.results?.video_url ?? null, message: o.message ?? j?.message ?? null };
}

/** Message clair pour une erreur Model Studio (code de la réponse), sans jamais citer la clé. */
export function alibabaError(status: number, body: string): { message: string; refused: boolean } {
  let code = "";
  let msg = body;
  try {
    const j = JSON.parse(body);
    code = String(j.code ?? j.output?.code ?? "");
    msg = String(j.message ?? j.output?.message ?? body);
  } catch {
    /* texte brut */
  }
  msg = msg.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-…").replace(/\s+/g, " ").trim().slice(0, 200);
  const r = (fr: string, en: string) => ({ message: L(fr, en), refused: true });
  if (status === 401 || code === "InvalidApiKey") return r(`Clé Alibaba Cloud refusée (${code || status}) : vérifiez la clé et la RÉGION choisie (une clé ne fonctionne que dans sa région).`, `Alibaba Cloud key rejected (${code || status}): check the key and the chosen REGION (a key only works in its own region).`);
  if (code === "DataInspectionFailed") return r("Demande bloquée par le contrôle de contenu d'Alibaba Cloud (rien n'est facturé) : reformulez la demande ou changez l'image.", "Request blocked by Alibaba Cloud content inspection (nothing is billed): rephrase the request or change the image.");
  if (code === "Arrearage") return r("Compte Alibaba Cloud en impayé : rechargez-le dans la console Alibaba Cloud, puis testez à nouveau.", "Alibaba Cloud account has an overdue balance: top it up in the Alibaba Cloud console, then test again.");
  if (status === 403 || /AccessDenied/.test(code)) return r(`Accès refusé par Alibaba Cloud (${code || status}) : modèle non ouvert pour ce compte, cette région ou cet espace de travail.`, `Access denied by Alibaba Cloud (${code || status}): model not enabled for this account, region or workspace.`);
  if (status === 429 || /Throttling/.test(code)) return r(`Limite de débit Alibaba Cloud atteinte (${code || status}) : réessayez plus tard.`, `Alibaba Cloud rate limit reached (${code || status}): try again later.`);
  if (status === 404 || /ModelNotFound|Model\.NotFound/i.test(code)) return r(`Modèle indisponible chez Alibaba Cloud pour cette région (${code || status}).`, `Model unavailable at Alibaba Cloud for this region (${code || status}).`);
  if (status >= 500 || status === 408) return { message: L(`Alibaba Cloud ${status} (résultat incertain) : ${msg}`, `Alibaba Cloud ${status} (uncertain result): ${msg}`), refused: false };
  return r(`Demande refusée par Alibaba Cloud (${code || status}) : ${msg}`, `Request rejected by Alibaba Cloud (${code || status}): ${msg}`);
}

/** Clé de suivi d'une tâche vidéo en cours (reprise après redémarrage ou rechargement, jamais relancée). */
export const wanTaskKey = (usageKey: string) => `alibaba.task.${usageKey}`;
