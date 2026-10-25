import { one } from "../db";
import type { ApiEvidence, Brief } from "./types";
import { routeLlm } from "../ai/llm";
import { activeProviderKey } from "../ai/config";
import { textModel } from "../ai/text-models";
export function assertAnalysisRoute(withPhotos: boolean) {
  const route = routeLlm({ task: "vision_analysis", ...(withPhotos ? { images: [{ data: Buffer.alloc(1), label: "Vérification locale de capacité, aucun appel" }] } : {}) });
  const provider = route.provider;
  if (provider !== "anthropic" && provider !== "openai" && provider !== "google") throw new Error("Aucune route d’analyse texte/vision adaptée : étape en attente.");
  const model = textModel(provider, route.model);
  if (!activeProviderKey(provider) || !model || (withPhotos && !model.vision)) throw new Error("Fournisseur d’analyse texte/vision indisponible ou désactivé : étape en attente, toutes les données conservées.");
}
/** Preuve issue du journal serveur, jamais du simple fournisseur choisi dans l'administration. */
export function apiEvidence(projectId: string, usageKey: string, vision = false): ApiEvidence {
  const row = one<{ provider: string; model: string; usage_key: string; created_at: number }>(
    "SELECT provider,COALESCE(served_model,requested_model) model,usage_key,created_at FROM ai_calls WHERE project_id=? AND usage_key IN (?,?,?,?) AND status='ok' ORDER BY created_at DESC,rowid DESC LIMIT 1", projectId, usageKey, `${usageKey}:fix1`, `${usageKey}:fix2`, `${usageKey}:fix3`,
  );
  if (!row) throw new Error("Résultat API sans trace de succès : étape en attente, données conservées.");
  return { provider: row.provider, model: row.model, usageKey: row.usage_key, vision, at: row.created_at };
}
export {analyzed} from "./understanding";
