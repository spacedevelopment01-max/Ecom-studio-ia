/**
 * Appel OpenAI Images du moteur multimédia (générations et retouches), selon la méthode validée par l'essai réel
 * (logo Sébastien Blanc, gpt-image-2, 92 s) :
 *  - réponse EN FLUX avec 2 images partielles quand le modèle le permet (catalogue `caps.stream`) : la connexion
 *    reçoit des données pendant la génération au lieu de rester muette 1 à 2 minutes (un proxy ou un hébergeur
 *    coupe une connexion muette : « 502 upstream request failed ») ;
 *  - proxy HTTPS de l'environnement respecté (HTTPS_PROXY / NO_PROXY), avec ou sans NODE_USE_ENV_PROXY=1 : Claude
 *    Cloud (proxy obligatoire), Codespace et serveur de production (sans proxy) ;
 *  - une connexion neuve par image et 10 minutes de délai (`REGLAGES_DU_CLIENT_DES_IMAGES`) ;
 *  - AUCUNE nouvelle tentative du client (maxRetries 0) : une génération coupée a pu être facturée ;
 *  - progression transmise à la tâche en cours (demande envoyée, aperçus reçus, image reçue).
 * La clé n'est jamais écrite dans les journaux.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import OpenAI from "openai";
import { Agent, EnvHttpProxyAgent, type Dispatcher } from "undici";
import { getJsonSetting } from "../settings";
import { isGatewayKey } from "./gateway";
import { mediaModel } from "./media-models";

/** Images partielles demandées en flux (chacune ≈ 100 jetons d'image en sortie, comptés dans le coût maximal). */
// Aucun aperçu en cours de route (22 novembre 2026) : chacun coûtait 100 jetons de sortie et n'était jamais montré au
// client. Avec 0, le flux rend une seule image en un seul événement (guide officiel d'OpenAI).
export const OPENAI_PARTIAL_IMAGES = 0;
export const OPENAI_PARTIAL_TOKENS = 100;

export type MediaProgress = { phase: "sent" | "partial" | "received" | "billed"; partials?: number; atMs: number; streamed: boolean; costMicro?: number };
/** Suivi de la génération en cours (posé par le moteur qui l'a demandée, ex. Logo V2 → avancement en direct). */
export const mediaProgress = new AsyncLocalStorage<(p: MediaProgress) => void>();
export const emitMediaProgress = (p: MediaProgress) => emit(p);
const emit = (p: MediaProgress) => {
  try {
    mediaProgress.getStore()?.(p);
  } catch {
    /* le suivi ne fait jamais échouer une génération payée */
  }
};

/** Le modèle accepte la réponse en flux (catalogue) et l'administration ne l'a pas coupée. */
export function openaiStreams(model: string): boolean {
  return !!mediaModel("openai", model)?.caps.stream && getJsonSetting<boolean>("ai.media.openaiStream", true) !== false;
}

/**
 * LE DÉLAI D'UN APPEL D'IMAGES : 10 minutes, au SDK comme au client HTTP (en-têtes et corps de la réponse). Une image en
 * qualité haute avec des images jointes, sans flux, reste muette tant qu'elle n'est pas finie : 18 à 38 s mesurées pour la
 * planche en vrai de Mouture (26 novembre 2026), plus pour une grande planche ; 10 minutes laissent de la marge sans jamais
 * attendre sans fin. Un délai dépassé reste un résultat incertain, jamais relancé tout seul.
 */
export const DELAI_DES_IMAGES_MS = 10 * 60_000;

/**
 * UNE CONNEXION NEUVE PAR IMAGE (26 novembre 2026, essai Mouture) : deux images sont tombées sur « Connection error. »
 * 0,5 s et 8,5 s après l'envoi, alors que les autres prenaient 18 à 38 s. Ce n'était pas un délai (le SDK aurait dit
 * « Request timed out. ») : la demande partait sur la connexion gardée ouverte par l'image d'avant, fermée entre-temps par
 * l'autre bout (proxy du conteneur d'essai, ou serveur). Une demande POST n'est jamais rejouée par le client HTTP, et c'est
 * bien ainsi (règle du propriétaire) ; on évite donc de l'envoyer sur une connexion qui a déjà servi : `pipelining: 0`
 * coupe la connexion après chaque réponse (une poignée de main de plus, quelques dixièmes de seconde, sur une image de
 * 20 s et plus). Le proxy de l'environnement (HTTPS_PROXY, NO_PROXY) reste respecté, avec ou sans NODE_USE_ENV_PROXY.
 */
export const REGLAGES_DU_CLIENT_DES_IMAGES = { headersTimeout: DELAI_DES_IMAGES_MS, bodyTimeout: DELAI_DES_IMAGES_MS, pipelining: 0 } as const;

let dispatcherEnCache: { cle: string; d: Dispatcher } | null = null;
/** Le client HTTP des images, un seul par réglage du proxy (relu à chaque appel : un essai peut le changer). */
export function dispatcherDesImages(): Dispatcher {
  const env = process.env;
  const proxy = env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy || "";
  const cle = [env.HTTPS_PROXY, env.https_proxy, env.HTTP_PROXY, env.http_proxy, env.NO_PROXY, env.no_proxy].map((v) => v ?? "").join("|");
  if (dispatcherEnCache?.cle !== cle) {
    // L'ancien client n'est plus servi ; aucune de ses connexions n'est gardée ouverte (pipelining 0).
    dispatcherEnCache = { cle, d: proxy ? new EnvHttpProxyAgent(REGLAGES_DU_CLIENT_DES_IMAGES) : new Agent(REGLAGES_DU_CLIENT_DES_IMAGES) };
  }
  return dispatcherEnCache.d;
}

/**
 * Le client HTTP des images, passé au fetch natif. Garder fetch et FormData du même environnement : le fetch de l'autre
 * copie d'undici sérialise le FormData global en « [object FormData] » et le SDK refuse alors tout fichier. Le dispatcher
 * passé au fetch natif garde le proxy, NO_PROXY, les délais et la connexion neuve sans changer le codec multipart.
 */
function proxyOptions(): Pick<ConstructorParameters<typeof OpenAI>[0] & object, "fetch" | "fetchOptions"> {
  return { fetchOptions: { dispatcher: dispatcherDesImages() } as any };
}

export { messageAvecCause } from "./erreur-reseau";

export function openaiClient(apiKey: string): OpenAI {
  if (!isGatewayKey(apiKey)) return new OpenAI({ apiKey, maxRetries: 0, timeout: DELAI_DES_IMAGES_MS, ...proxyOptions() });
  // Clé injectée par la passerelle : l'en-tête d'autorisation du client est retiré avant l'envoi.
  const opts = proxyOptions();
  const base = (opts.fetch ?? fetch) as typeof fetch;
  const strip: typeof fetch = (input, init) => {
    const headers = new Headers(init?.headers);
    headers.delete("authorization");
    return base(input, { ...init, headers });
  };
  return new OpenAI({ apiKey, maxRetries: 0, timeout: DELAI_DES_IMAGES_MS, ...opts, fetch: strip });
}

/**
 * Réglage du fond envoyé à OpenAI (guide officiel : `background: "auto" | "opaque" | "transparent"`). Toute photo est
 * demandée en fond PLEIN : sans ce réglage, une image créée avec des images jointes (retouche) revenait en partie
 * transparente (brume blanche ou taches sombres selon le fond ; 16 images touchées depuis le 16 novembre 2026, prises
 * pour des défauts de dessin). Seul un logo demandé en fond transparent garde un fond retirable : transparent si le
 * modèle le permet, sinon réglage laissé au modèle (fond blanc retiré ensuite par le Studio).
 */
export function openaiBackground(o: { transparent?: boolean; transparentCap: boolean; /** Logo seul (usage « Logos ») : fond laissé retirable. */ logo?: boolean }): { background?: "opaque" | "transparent"; output_format?: "png" } {
  if (o.transparent) return o.transparentCap ? { background: "transparent", output_format: "png" } : {};
  return o.logo ? {} : { background: "opaque" };
}

/** Flux terminé sans image finale : la génération a pu être facturée (jamais relancée automatiquement). */
export class StreamInterrupted extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StreamInterrupted";
  }
}

/**
 * Une image OpenAI (génération ou retouche), en flux si possible. `onSent` est appelé juste avant l'envoi (la
 * réservation du coût maximal est alors engagée). Renvoie l'image finale (base64) et la consommation facturée.
 */
/**
 * L'identifiant de la requête chez OpenAI (en-tête « x-request-id »), quand le client le rend : gardé avec l'image (méthode
 * des graphistes, 24 novembre 2026). Sans lui (client simulé d'un essai), null : rien ne change pour l'appel.
 */
async function avecIdentifiant(p: unknown): Promise<{ data: any; requestId: string | null }> {
  const promise = p as { withResponse?: () => Promise<{ data: any; request_id?: string | null }> };
  if (promise && typeof promise.withResponse === "function") { const r = await promise.withResponse(); return { data: r.data, requestId: r.request_id ?? null }; }
  const data: any = await p;
  return { data, requestId: (data && typeof data === "object" && typeof data._request_id === "string") ? data._request_id : null };
}

/**
 * Ce qu'OpenAI dit avoir rendu pour une image (qualité, taille, fond, format) : gardé avec l'appel pour vérifier son coût
 * après coup (la formule officielle des jetons dépend de la taille et de la qualité réelles). Rien de secret.
 */
export type ImageRenvoyee = { quality: string | null; size: string | null; background: string | null; output_format: string | null };
export const imageRenvoyee = (r: any): ImageRenvoyee => ({ quality: r?.quality ?? null, size: r?.size ?? null, background: r?.background ?? null, output_format: r?.output_format ?? null });

/**
 * Une image OpenAI SANS FLUX, quel que soit le catalogue : la méthode des publications validée le 24 novembre 2026
 * (« Conserve intégralement la méthode, les paramètres API ») a été prouvée sans flux, donc elle part toujours ainsi.
 */
export async function openaiImageSansFlux(client: OpenAI, op: "generate" | "edit", params: Record<string, unknown> & { model: string }, onSent: () => void): Promise<{ b64: string | null; usage: any; ms: number; requestId: string | null; renvoye: ImageRenvoyee }> {
  const t0 = Date.now();
  onSent();
  emit({ phase: "sent", atMs: 0, streamed: false });
  const { data: res, requestId } = await avecIdentifiant(op === "generate" ? client.images.generate(params as any) : client.images.edit(params as any));
  const b64 = res.data?.[0]?.b64_json ?? null;
  if (b64) emit({ phase: "received", atMs: Date.now() - t0, streamed: false });
  return { b64, usage: res.usage ?? null, ms: Date.now() - t0, requestId, renvoye: imageRenvoyee(res) };
}

export async function openaiImage(client: OpenAI, op: "generate" | "edit", params: Record<string, unknown> & { model: string }, onSent: () => void): Promise<{ b64: string | null; usage: any; streamed: boolean; partials: number; ms: number; requestId: string | null; renvoye: ImageRenvoyee }> {
  const t0 = Date.now();
  const stream = openaiStreams(params.model);
  onSent();
  emit({ phase: "sent", atMs: 0, streamed: stream });
  if (!stream) {
    const { data: res, requestId } = await avecIdentifiant(op === "generate" ? client.images.generate(params as any) : client.images.edit(params as any));
    const b64 = res.data?.[0]?.b64_json ?? null;
    if (b64) emit({ phase: "received", atMs: Date.now() - t0, streamed: false });
    return { b64, usage: res.usage ?? null, streamed: false, partials: 0, ms: Date.now() - t0, requestId, renvoye: imageRenvoyee(res) };
  }
  const body = { ...params, stream: true, partial_images: OPENAI_PARTIAL_IMAGES };
  const { data: events, requestId } = await avecIdentifiant(op === "generate" ? client.images.generate(body as any) : client.images.edit(body as any));
  let partials = 0;
  let final: any = null;
  try {
    for await (const ev of events) {
      const type = String(ev?.type ?? "");
      if (type.endsWith(".partial_image")) emit({ phase: "partial", partials: ++partials, atMs: Date.now() - t0, streamed: true });
      else if (type.endsWith(".completed")) final = ev;
    }
  } catch (e) {
    // Coupure en cours de flux : le fournisseur a pu facturer → résultat incertain (aucune relance).
    throw new StreamInterrupted(`Flux OpenAI interrompu après ${Math.round((Date.now() - t0) / 1000)} s (${partials} aperçu(s) reçu(s)) : ${String((e as Error)?.message ?? e).slice(0, 200)}`);
  }
  if (!final?.b64_json) throw new StreamInterrupted(`Flux OpenAI terminé sans image finale après ${Math.round((Date.now() - t0) / 1000)} s (${partials} aperçu(s) reçu(s)).`);
  emit({ phase: "received", partials, atMs: Date.now() - t0, streamed: true });
  return { b64: final.b64_json, usage: final.usage ?? null, streamed: true, partials, ms: Date.now() - t0, requestId, renvoye: imageRenvoyee(final) };
}
