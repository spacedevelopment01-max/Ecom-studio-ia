/** Voix OpenAI opt-in. Tarif par caractère : maximum calculable avant l'envoi.
 * Aucun choix Kokoro migré. Aucun retry fournisseur. Voir LOT5_RACCORD_VOIX_ROUTAGE.md. */
import { activeProviderKey, isGatewayKey, usdToEur, assertPricesFresh } from "../ai/config";
import { openaiClient } from "../ai/openai-images";
import { mediaReservationMaxMicro } from "../ai/media-providers";
import { assertAiAllowed } from "../ai/access";
import { currentTrace, recordCall } from "../ai/trace";
import { existingOperation, operationPending, recordUsage, release, requestHash, reserve, saveOperationResult, settleUncertain } from "../billing";
import { getAsset, saveAsset, type Asset } from "../library";
import { fileExists, putFile, readFile } from "../storage";
import { PermanentError } from "../jobs";
import { requireCreationPlan } from "../plan-gates";
import { assertStrategyInputsCurrent } from "../strategy-consumption";

export const OPENAI_VOICE_MODEL = "tts-1-hd";
export const OPENAI_VOICES = ["nova", "shimmer", "onyx"] as const;
export type OpenAIVoice = typeof OPENAI_VOICES[number];
export const isOpenAIVoice = (id: string): id is `openai:${OpenAIVoice}` => OPENAI_VOICES.some(v => id === `openai:${v}`);
export const voiceTariffCurrent = () => Date.now() < Date.parse("2027-01-06T00:00:00Z");
export const openaiVoiceAvailable = () => {const key=activeProviderKey("openai");return !!key&&!isGatewayKey(key)&&voiceTariffCurrent();};
/** $30 / million input characters, official model page checked 2026-10-22.
 * UTF-16 length is conservative for astral Unicode. Not a provider invoice. */
export function voiceQuote(text: string) {
  if (!text.trim() || text.length > 4096) throw new PermanentError("Voix : une phrase non vide de 4096 caractères au plus est nécessaire.");
  if (!voiceTariffCurrent()) throw new PermanentError("Modèle vocal arrivé à sa date de retrait : nouveau raccord à valider, aucun remplacement automatique.");
  const estimateMicro = Math.ceil(text.length * 30 * usdToEur());
  return { model: OPENAI_VOICE_MODEL, characters: text.length, estimateMicro, capMicro: mediaReservationMaxMicro(estimateMicro), estimated: true as const };
}
type Context = { userId: string; projectId: string; jobId?: string | null };
type Options = { voice: string; speed: number; lang: "fr" | "en" };
/** Stable across jobs: a new montage must not buy the same unchanged phrase again. */
export function voiceOperation(text: string, o: Options) {
  return requestHash({ model: OPENAI_VOICE_MODEL, text, voice: o.voice, speed: o.speed, lang: o.lang, format: "wav" });
}
export async function acquiredVoice(ctx: Context, text: string, o: Options): Promise<Asset> {
  if (!isOpenAIVoice(o.voice) || !Number.isFinite(o.speed) || o.speed < .25 || o.speed > 4) throw new PermanentError("Voix OpenAI non sélectionnée ou vitesse invalide ; choix historique conservé.");
  const fingerprint = voiceOperation(text, o);
  const meta = { task: "voice_generation", projectId: ctx.projectId, jobId: ctx.jobId ?? currentTrace().jobId, provider: "openai", model: OPENAI_VOICE_MODEL, usageKey: `voice:${fingerprint}`, requestHash: fingerprint };
  const old = existingOperation(ctx.userId, meta);
  let file: string, reservation: string;
  if (old) {
    const saved = old.result ? JSON.parse(old.result) as { file?: string; assetId?: string } : null;
    const asset = saved?.assetId ? getAsset(saved.assetId) : null;
    if (asset && asset.project_id === ctx.projectId && asset.user_id === ctx.userId && !asset.deleted_at && fileExists(asset.storage_key)) return asset;
    if (!saved?.file || !fileExists(saved.file) || !["settled", "reconciled"].includes(old.status)) operationPending();
    file = saved!.file!; reservation = old.id;
  } else {
    const q = voiceQuote(text);
    const key = activeProviderKey("openai");
    if (!key || isGatewayKey(key)) throw new PermanentError("Clé serveur OpenAI pour la voix indisponible ; aucun appel vocal lancé.");
    requireCreationPlan(null,ctx.projectId,"videos");
    assertAiAllowed(ctx.userId, ctx.projectId);
    assertPricesFresh();
    assertStrategyInputsCurrent(ctx.projectId);
    // Construct client before reservation; fixed official endpoint, native proxy, no SDK retries.
    const client = openaiClient(key).withOptions({ baseURL: "https://api.openai.com/v1", timeout: 60_000, maxRetries: 0 });
    reservation = reserve(ctx.userId, q.capMicro, meta);
    const start = Date.now();
    let received = false;
    try {
      const response = await client.audio.speech.create({ model: OPENAI_VOICE_MODEL, input: text, voice: o.voice.slice(7) as OpenAIVoice, response_format: "wav", speed: o.speed });
      received = true;
      const data = Buffer.from(await response.arrayBuffer());
      // The paid original is persisted BEFORE any duration/quality rejection.
      file = `ai-results/${reservation}.wav`;
      putFile(file, data);
      const usage = recordUsage({ ...ctx, task: meta.task, provider: "openai", model: OPENAI_VOICE_MODEL, unit: "request", inputUnits: text.length, quantity: 1, costMicro: q.estimateMicro, estimated: true, idempotencyKey: meta.usageKey }, { reservationId: reservation });
      saveOperationResult(reservation, { file });
      recordCall({ ...ctx, task: meta.task, provider: "openai", requestedModel: OPENAI_VOICE_MODEL, servedModel: null, unit: "request", quantity: 1, latencyMs: Date.now() - start, httpAttempts: 1, usageKey: meta.usageKey, usageEventId: usage.eventId, costMicro: q.estimateMicro, estimated: true, status: "ok" });
    } catch (e) {
      const status = (e as { status?: number }).status;
      const refused = !received && typeof status === "number" && status >= 400 && status < 500 && status !== 408;
      if (refused) release(reservation, "refus vocal fournisseur");
      else settleUncertain(reservation, "résultat vocal incertain ; aucune relance automatique");
      recordCall({ ...ctx, task: meta.task, provider: "openai", requestedModel: OPENAI_VOICE_MODEL, unit: "request", httpAttempts: 1, latencyMs: Date.now() - start, usageKey: meta.usageKey, estimated: true, status: "error", errorKind: refused ? `VOICE_REFUSED_${status}` : "VOICE_RESULT_UNCERTAIN" });
      throw new PermanentError(refused ? "Voix refusée par OpenAI ; aucune relance automatique, médias conservés." : "Résultat vocal incertain ; enveloppe retenue, aucune relance automatique. Faites vérifier cette tentative.");
    }
  }
  const data = readFile(file!);
  if (data.length < 44 || data.toString("ascii", 0, 4) !== "RIFF" || data.toString("ascii", 8, 12) !== "WAVE") throw new PermanentError("Audio acquis illisible ; original conservé, aucune nouvelle synthèse automatique.");
  const asset = await saveAsset({ ...ctx, data, name: "voix-synthetique.wav", mime: "audio/wav", role: "voice", folderKey: "videos.ads", origin: "generated", meta: { voice: { engine: "openai", model: OPENAI_VOICE_MODEL, id: o.voice, consent: "synthetic", operation: fingerprint, alignment: "measured_phrase_proportional_chunks", estimated: true } } });
  saveOperationResult(reservation!, { file, assetId: asset.id });
  return asset;
}
