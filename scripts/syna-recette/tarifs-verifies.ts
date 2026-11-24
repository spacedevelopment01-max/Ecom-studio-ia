/**
 * Tarifs vérifiés le 6 novembre 2026 pour le Studio PRIVÉ de recette #492, réappliqués à chaque démarrage par
 * `lancer-agent.mts` (le dossier de données d'une session cloud est effacé à la fin de la session).
 * Aucun secret ici : uniquement des prix publics et des choix de routage.
 *
 * Sources officielles relevées le 06/11/2026 :
 *  - Claude : platform.claude.com/docs/en/about-claude/pricing — recherche web 10 $ / 1 000 recherches ;
 *    prix des modèles Claude identiques à ceux du code (aucun changement).
 *  - OpenAI GPT Image 2.5 (Sunburst et Flare) : developers.openai.com — facturation aux jetons (sortie image 30 $ / M,
 *    entrée image 8 $ / M, entrée texte 5 $ / M), les mêmes tarifs que la configuration du Studio (DEFAULT_PRICES,
 *    src/lib/ai/config.ts) ; les jetons de sortie d'une image suivent la formule officielle (jetonsDeSortieGptImage).
 *    Jusqu'au 24 novembre 2026, ce fichier posait un prix de 0,09 $ PAR IMAGE : l'essai réel des planches de recherche a
 *    compté 0,081 € pour une planche qui a produit 343 jetons (environ 0,0098 € aux jetons). Le prix par image est retiré.
 *  - Le taux du dollar : un seul, celui du Studio (usdToEur, src/lib/ai/config.ts) ; ce fichier n'en pose plus d'autre
 *    (il posait 0,90 au lieu de 0,86).
 * Choix de l'utilisateur : toutes les images de SINA chez OpenAI (logos : Sunburst imposé ; maquettes : Flare, sans
 * secours), tout le reste chez Claude.
 */
export const DATE_VERIFICATION_TARIFS = Date.UTC(2026, 10, 6, 12, 0, 0);

/** Les tarifs officiels au jeton des GPT Image 2.5, par million : sortie image, image jointe, texte (comme config.ts). */
const GPT_IMAGE_25 = { unit: "tokens", inputPerM: 5, outputPerM: 30, imageInputPerM: 8, imageOutputPerM: 30 } as const;

export const TARIFS_VERIFIES: Record<string, unknown> = {
  "anthropic:web_search": { unit: "call", perCall: 0.01 },
  "openai:gpt-image-2.5-sunburst": GPT_IMAGE_25,
  "openai:gpt-image-2.5-flare": GPT_IMAGE_25,
};

/** Applique les tarifs vérifiés sans écraser une vérification plus récente faite dans l'administration. */
export async function appliquerTarifsVerifies() {
  const { getJsonSetting, getSetting, setJsonSetting, setSetting } = await import("../../src/lib/settings");
  setJsonSetting("ai.prices", { ...getJsonSetting<Record<string, unknown>>("ai.prices", {}), ...TARIFS_VERIFIES });
  // Un seul taux du dollar, celui du Studio : un taux posé ici par une version d'avant (0,90) est retiré.
  if (getJsonSetting<number | null>("billing.usdToEur", null) === 0.9) setSetting("billing.usdToEur", null);
  const modeles = getJsonSetting<Record<string, { enabled?: boolean; confirmedAt?: number }>>("ai.media.models", {});
  modeles["openai:gpt-image-2.5-flare"] = { ...modeles["openai:gpt-image-2.5-flare"], enabled: true, confirmedAt: DATE_VERIFICATION_TARIFS };
  setJsonSetting("ai.media.models", modeles);
  const usages = getJsonSetting<Record<string, unknown>>("ai.media.usage", {});
  usages.text_layout = { mode: "manual", primary: "openai:gpt-image-2.5-flare", backup: null };
  setJsonSetting("ai.media.usage", usages);
  // Logos en qualité haute (demande du propriétaire du 7 novembre : « le logo est important, prends un niveau élevé »).
  setJsonSetting("ai.media.quality", { ...getJsonSetting<Record<string, string>>("ai.media.quality", {}), logo: "high" });
  const deja = Number(getSetting("ai.prices.checkedAt"));
  if (!(deja > DATE_VERIFICATION_TARIFS)) setSetting("ai.prices.checkedAt", String(DATE_VERIFICATION_TARIFS));
}
