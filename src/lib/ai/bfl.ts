/**
 * Black Forest Labs (Flux) en direct, fournisseur accordé par le propriétaire (référence, partie 16 ; contrat européen).
 * Rapport 10 du 22 novembre 2026, points 5 et 8 : retouche guidée (Kontext), agrandir le cadre (Expand, la version
 * story ou carrée d'une image), scène avec une référence (FLUX.2 pro). Seulement au choix du client dans l'atelier :
 * les images de SINA restent faites par OpenAI.
 *
 * Fonctions PURES : adresses, corps des demandes, lecture des réponses. L'appel réel, la réservation du budget et la
 * facturation passent par `media-providers.ts` (`bflImage`, `bflExpand`). Aucune clé ici : le propriétaire la saisit
 * dans Administration › Fournisseurs IA ; sans clé, Flux reste éteint, et chaque modèle attend aussi la confirmation de
 * l'administration (`adminConfirm`).
 *
 * D'après la documentation de Black Forest Labs (https://docs.bfl.ai) : demande `POST /v1/<modèle>` avec l'en-tête
 * `x-key`, réponse `{ id, polling_url }`, puis `GET polling_url` jusqu'à `status: "Ready"` et `result.sample` (adresse
 * valable dix minutes : l'image est copiée tout de suite). Point d'accès européen `api.eu.bfl.ai`. Rien de tout cela n'a
 * encore été essayé avec une vraie clé : adaptateur « écrit, non vérifié », comme ceux de la vidéo.
 * Modération : la tolérance de Flux reste à son niveau par défaut (2), jamais relâchée (même règle que le « low »
 * d'OpenAI, jamais employé).
 */

export const BFL_BASE = "https://api.eu.bfl.ai/v1";
/** Tolérance de modération de Flux (0 = la plus stricte, 6 = la plus permissive) : le défaut, jamais plus. */
export const BFL_SAFETY = 2;

export type BflModel = "flux-kontext-pro" | "flux-2-pro" | "flux-pro-1.0-expand" | "flux-pro-1.0-fill";
export const BFL_MODELS: BflModel[] = ["flux-kontext-pro", "flux-2-pro", "flux-pro-1.0-expand", "flux-pro-1.0-fill"];

export type BflRequest = { url: string; method: "POST" | "GET"; headers: Record<string, string>; body?: Record<string, unknown> };
export type BflPoll = { state: "running" } | { state: "done"; imageUrl: string } | { state: "failed"; message: string; moderated: boolean };

const headers = (key: string) => ({ "x-key": key, "Content-Type": "application/json", accept: "application/json" });

/** Dimensions FLUX.2 (multiples de 16, environ un million de pixels) pour un format. */
export function bflSize(aspect: string): { width: number; height: number } {
  const [w, h] = aspect.split(":").map(Number);
  if (!(w > 0 && h > 0)) return { width: 1024, height: 1024 };
  const side = Math.sqrt(1_048_576 / (w * h));
  const r16 = (n: number) => Math.max(256, Math.round(n / 16) * 16);
  return { width: r16(w * side), height: r16(h * side) };
}

/** Création ou retouche guidée : Kontext reçoit une image, FLUX.2 pro jusqu'à huit références. */
export function bflImageRequest(key: string, model: BflModel, o: { prompt: string; references: string[]; aspect: string }): BflRequest {
  if (model === "flux-pro-1.0-expand" || model === "flux-pro-1.0-fill") throw new Error(`${model} : demande propre (cadre ou masque)`);
  const body: Record<string, unknown> = { prompt: o.prompt, output_format: "png", safety_tolerance: BFL_SAFETY };
  if (model === "flux-kontext-pro") {
    if (o.references[0]) body.input_image = o.references[0];
    body.aspect_ratio = o.aspect;
  } else {
    o.references.slice(0, 8).forEach((r, i) => (body[i === 0 ? "input_image" : `input_image_${i + 1}`] = r));
    Object.assign(body, bflSize(o.aspect));
  }
  return { url: `${BFL_BASE}/${model}`, method: "POST", headers: headers(key), body };
}

/** Agrandir le cadre : pixels ajoutés de chaque côté, l'image d'origine reste au centre, intacte. */
export function bflExpandRequest(key: string, o: { image: string; top: number; bottom: number; left: number; right: number; prompt: string }): BflRequest {
  const px = (n: number) => Math.max(0, Math.min(2048, Math.round(n)));
  return { url: `${BFL_BASE}/flux-pro-1.0-expand`, method: "POST", headers: headers(key), body: { image: o.image, top: px(o.top), bottom: px(o.bottom), left: px(o.left), right: px(o.right), prompt: o.prompt, output_format: "png", safety_tolerance: BFL_SAFETY } };
}

/** Réponse de la demande : l'adresse de suivi (seulement une adresse de Black Forest Labs, jamais une autre). */
export function bflSubmitted(j: any): { id: string; pollingUrl: string } {
  const id = typeof j?.id === "string" ? j.id : null;
  const url = typeof j?.polling_url === "string" ? j.polling_url : id ? `${BFL_BASE}/get_result?id=${encodeURIComponent(id)}` : null;
  if (!id || !url || !/^https:\/\/([a-z0-9-]+\.)*bfl\.ai\//.test(url)) throw new Error("Réponse de Black Forest Labs illisible (aucune adresse de suivi).");
  return { id, pollingUrl: url };
}

export const bflPollRequest = (key: string, pollingUrl: string): BflRequest => ({ url: pollingUrl, method: "GET", headers: { "x-key": key, accept: "application/json" } });

/** Lecture du suivi : prête, en cours, refusée par la modération, ou en erreur. */
export function bflPoll(j: any): BflPoll {
  const s = String(j?.status ?? "");
  if (s === "Ready") {
    const url = j?.result?.sample;
    return typeof url === "string" && /^https:\/\//.test(url) ? { state: "done", imageUrl: url } : { state: "failed", message: "Image prête sans adresse.", moderated: false };
  }
  if (s === "Pending" || s === "Queued" || s === "Processing" || s === "") return { state: "running" };
  if (/moderated/i.test(s)) return { state: "failed", message: "Demande refusée par la modération de Black Forest Labs.", moderated: true };
  return { state: "failed", message: `Black Forest Labs : ${s}`.slice(0, 200), moderated: false };
}

/**
 * Marges à ajouter pour passer d'une image (largeur × hauteur) au format visé, l'image restant entière au centre.
 * Story : 9:16 ; carré : 1:1. Aucune marge si l'image a déjà ce format.
 */
export function margesPour(width: number, height: number, cible: "9:16" | "1:1"): { top: number; bottom: number; left: number; right: number; width: number; height: number } {
  const [a, b] = cible === "9:16" ? [9, 16] : [1, 1];
  const ratio = a / b;
  let W = width, H = height;
  if (width / height > ratio) H = Math.round(width / ratio);
  else W = Math.round(height * ratio);
  const dx = W - width, dy = H - height;
  return { left: Math.floor(dx / 2), right: dx - Math.floor(dx / 2), top: Math.floor(dy / 2), bottom: dy - Math.floor(dy / 2), width: W, height: H };
}
