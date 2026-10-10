/**
 * Devis d'une série de logos (Logo V2) — le MÊME montant sert de plafond à la série : aucun appel payant ne part
 * au-delà (contrôle avant chaque appel, trace.costCapMicro).
 *
 * Logo complet par l'IA d'images : 1 appel « territoires » + par création : 1 image (coût maximal réservé, calculé
 * comme la réservation) + 1 relecture + 1 relecture de reprise (nom réécrit par le studio, gratuit) ; aucune nouvelle
 * image automatique. Logo construit (sans modèle d'images capable d'écrire) : symbole et relectures en texte.
 * Les relectures et territoires sont bornés comme le garde-fou de l'IA de texte (entrée généreuse, sortie maximale).
 */
import { FX_SAFETY, priceFor, routeFor, usdToEur, type TaskId } from "../ai/config";
import { getJsonSetting } from "../settings";
import { EUR } from "../billing";
import { logoArtworkMaxMicro } from "../ai/media-providers";
import { routeLlm } from "../ai/llm";

/** Créations par série quand le modèle d'images dessine le logo complet. */
export const ARTWORK_SERIES = 3;
/** Directions construites par série sans modèle d'images capable d'écrire (version construite, moins coûteuse). */
export const BUILT_SERIES = 4;

/** Modèle qui fera vraiment l'appel : celui du routage automatique s'il est actif, sinon la route de la tâche. */
function textRoute(task: TaskId): { provider: string; model: string } {
  try {
    const d = routeLlm({ task });
    if (d.provider !== "none" && d.provider !== "local") return d;
  } catch {}
  return routeFor(task);
}

/** Coût maximal d'un appel de texte (même formule que le garde-fou : entrée majorée de 25 %, sortie maximale). */
function textMaxMicro(task: TaskId, inputTokens: number, maxTokens: number): number {
  const r = textRoute(task);
  // OpenAI / Gemini : sortie plafonnée à 4 000 jetons au moins (garde-fou de l'appel).
  if (r.provider !== "anthropic") maxTokens = Math.max(maxTokens, 4000);
  const p = priceFor(r.provider, r.model);
  if (!p || p.unit !== "tokens") return 0;
  const markup = Math.max(1, getJsonSetting<number>("billing.markup", 1));
  return Math.ceil(((inputTokens * 1.25 * p.inputPerM + maxTokens * p.outputPerM) / 1e6) * usdToEur() * FX_SAFETY * EUR * markup);
}

const TERRITORIES = () => textMaxMicro("logo_symbol", 14_000, 9000);
const REVIEW = () => textMaxMicro("quality_control", 9000, 3000);
const SYMBOL = () => textMaxMicro("logo_symbol", 8000, 6000);

export type LogoQuote = { mode: "artwork" | "built"; creations: number; images: number; maxMicro: number; imageMaxMicro: number | null };

/** Devis (et plafond) d'une série complète. */
export function logoSeriesQuote(): LogoQuote {
  const img = logoArtworkMaxMicro();
  if (img != null) return { mode: "artwork", creations: ARTWORK_SERIES, images: ARTWORK_SERIES, imageMaxMicro: img, maxMicro: TERRITORIES() + ARTWORK_SERIES * (img + 2 * REVIEW()) };
  // Construit : relecture + au plus 2 reprises ciblées par direction, symbole et 2 redessins pour au plus 2 directions ;
  // concepts de symbole par un modèle d'images qui n'écrit pas le texte (au plus 3), s'il y en a un.
  const concept = logoArtworkMaxMicro({ text: false });
  const concepts = concept != null ? 3 : 0;
  return { mode: "built", creations: BUILT_SERIES, images: concepts, imageMaxMicro: concept, maxMicro: TERRITORIES() + BUILT_SERIES * 3 * REVIEW() + 2 * 3 * SYMBOL() + concepts * (concept ?? 0) };
}

/** Devis (et plafond) d'une « Nouvelle version » demandée par le client : une image et ses relectures. */
export function logoRedrawQuote(): LogoQuote | null {
  const img = logoArtworkMaxMicro();
  return img == null ? null : { mode: "artwork", creations: 1, images: 1, imageMaxMicro: img, maxMicro: img + 2 * REVIEW() };
}
