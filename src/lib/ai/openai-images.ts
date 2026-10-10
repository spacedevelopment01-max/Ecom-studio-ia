/**
 * Appel OpenAI Images du moteur multimédia (générations et retouches), selon la méthode validée par l'essai réel
 * (logo Sébastien Blanc, gpt-image-2, 92 s) :
 *  - réponse EN FLUX avec 2 images partielles quand le modèle le permet (catalogue `caps.stream`) : la connexion
 *    reçoit des données pendant la génération au lieu de rester muette 1 à 2 minutes (un proxy ou un hébergeur
 *    coupe une connexion muette : « 502 upstream request failed ») ;
 *  - proxy HTTPS de l'environnement respecté (HTTPS_PROXY / NO_PROXY), même quand Node n'a pas été lancé avec
 *    NODE_USE_ENV_PROXY=1 : Claude Cloud (proxy obligatoire), Codespace et serveur de production (sans proxy) ;
 *  - AUCUNE nouvelle tentative du client (maxRetries 0) : une génération coupée a pu être facturée ;
 *  - progression transmise à la tâche en cours (demande envoyée, aperçus reçus, image reçue).
 * La clé n'est jamais écrite dans les journaux.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import OpenAI from "openai";
import { EnvHttpProxyAgent, fetch as undiciFetch } from "undici";
import { getJsonSetting } from "../settings";
import { mediaModel } from "./media-models";

/** Images partielles demandées en flux (chacune ≈ 100 jetons d'image en sortie, comptés dans le coût maximal). */
export const OPENAI_PARTIAL_IMAGES = 2;
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

/** Proxy de l'environnement, si Node ne l'applique pas déjà de lui-même. */
function proxyOptions(): Pick<ConstructorParameters<typeof OpenAI>[0] & object, "fetch" | "fetchOptions"> {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!proxy || process.env.NODE_USE_ENV_PROXY === "1") return {};
  // Délais larges : une image haute qualité prend 1 à 2 minutes (les données arrivent en flux entre-temps).
  const dispatcher = new EnvHttpProxyAgent({ headersTimeout: 300_000, bodyTimeout: 300_000 });
  return { fetch: undiciFetch as unknown as typeof fetch, fetchOptions: { dispatcher } as any };
}

export function openaiClient(apiKey: string): OpenAI {
  return new OpenAI({ apiKey, maxRetries: 0, timeout: 300_000, ...proxyOptions() });
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
export async function openaiImage(client: OpenAI, op: "generate" | "edit", params: Record<string, unknown> & { model: string }, onSent: () => void): Promise<{ b64: string | null; usage: any; streamed: boolean; partials: number; ms: number }> {
  const t0 = Date.now();
  const stream = openaiStreams(params.model);
  onSent();
  emit({ phase: "sent", atMs: 0, streamed: stream });
  if (!stream) {
    const res: any = op === "generate" ? await client.images.generate(params as any) : await client.images.edit(params as any);
    const b64 = res.data?.[0]?.b64_json ?? null;
    if (b64) emit({ phase: "received", atMs: Date.now() - t0, streamed: false });
    return { b64, usage: res.usage ?? null, streamed: false, partials: 0, ms: Date.now() - t0 };
  }
  const body = { ...params, stream: true, partial_images: OPENAI_PARTIAL_IMAGES };
  const events: any = op === "generate" ? await client.images.generate(body as any) : await client.images.edit(body as any);
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
  return { b64: final.b64_json, usage: final.usage ?? null, streamed: true, partials, ms: Date.now() - t0 };
}
