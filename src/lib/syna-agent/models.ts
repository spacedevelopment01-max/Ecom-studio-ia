/**
 * Les modèles de SINA, à un seul endroit. « fort » : partout où elle décide, conseille ou juge, donc toute sa
 * conversation et le cœur de ses créations ; « métier » : le travail de fond plus répétitif (études, vérifications).
 * Le niveau ne dépend jamais du forfait du client. Modifiable sans code par le réglage « sina.brand_chain » (strong,
 * craft), le même que celui de la chaîne de la marque : un seul réglage pour tout SINA.
 */
import { getJsonSetting } from "../settings";

export type SinaModel = { provider: "anthropic"; model: string; effort: "low" | "medium" | "high" };

export const DEFAULT_MODELS: { strong: SinaModel; craft: SinaModel } = {
  strong: { provider: "anthropic", model: "claude-opus-5-5", effort: "medium" },
  craft: { provider: "anthropic", model: "claude-sonnet-5-5", effort: "medium" },
};

export function sinaModels(): { strong: SinaModel; craft: SinaModel } {
  const s = getJsonSetting<Partial<{ strong: Partial<SinaModel>; craft: Partial<SinaModel> }>>("sina.brand_chain", {});
  return { strong: { ...DEFAULT_MODELS.strong, ...(s?.strong ?? {}) }, craft: { ...DEFAULT_MODELS.craft, ...(s?.craft ?? {}) } };
}
