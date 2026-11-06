/**
 * Tarifs vérifiés le 6 novembre 2026 pour le Studio PRIVÉ de recette #492, réappliqués à chaque démarrage par
 * `lancer-agent.mts` (le dossier de données d'une session cloud est effacé à la fin de la session).
 * Aucun secret ici : uniquement des prix publics et des choix de routage.
 *
 * Sources officielles relevées le 06/11/2026 :
 *  - Claude : platform.claude.com/docs/en/about-claude/pricing — recherche web 10 $ / 1 000 recherches ;
 *    prix des modèles Claude identiques à ceux du code (aucun changement).
 *  - OpenAI GPT Image 2.5 (Sunburst et Flare) : developers.openai.com — facturation aux jetons (sortie image 30 $ / M,
 *    entrée image 8 $ / M, entrée texte 5 $ / M). Jetons de sortie par image d'après la formule du calculateur officiel
 *    du guide « Image generation » : 1024×1024 « high » = 1 756 jetons, 1024×1536 « high » = 1 372 jetons, + 2 aperçus
 *    de 100 jetons, soit au plus 0,059 $. Plafond retenu : 0,09 $ par image (couvre aussi deux images de référence).
 *  - Taux BCE du 06/11/2026 : 1 € = 1,1165 $ (0,8957 € pour 1 $), arrondi prudent à 0,90.
 * Choix de l'utilisateur : toutes les images de SINA chez OpenAI (logos : Sunburst imposé ; maquettes : Flare, sans
 * secours), tout le reste chez Claude.
 */
export const DATE_VERIFICATION_TARIFS = Date.UTC(2026, 10, 6, 12, 0, 0);

export const TARIFS_VERIFIES: Record<string, unknown> = {
  "anthropic:web_search": { unit: "call", perCall: 0.01 },
  "openai:gpt-image-2.5-sunburst": { unit: "image", perImage: 0.09 },
  "openai:gpt-image-2.5-flare": { unit: "image", perImage: 0.09 },
};

export const TAUX_USD_EUR = 0.9;

/** Applique les tarifs vérifiés sans écraser une vérification plus récente faite dans l'administration. */
export async function appliquerTarifsVerifies() {
  const { getJsonSetting, getSetting, setJsonSetting, setSetting } = await import("../../src/lib/settings");
  setJsonSetting("ai.prices", { ...getJsonSetting<Record<string, unknown>>("ai.prices", {}), ...TARIFS_VERIFIES });
  setJsonSetting("billing.usdToEur", TAUX_USD_EUR);
  const modeles = getJsonSetting<Record<string, { enabled?: boolean; confirmedAt?: number }>>("ai.media.models", {});
  modeles["openai:gpt-image-2.5-flare"] = { ...modeles["openai:gpt-image-2.5-flare"], enabled: true, confirmedAt: DATE_VERIFICATION_TARIFS };
  setJsonSetting("ai.media.models", modeles);
  const usages = getJsonSetting<Record<string, unknown>>("ai.media.usage", {});
  usages.text_layout = { mode: "manual", primary: "openai:gpt-image-2.5-flare", backup: null };
  setJsonSetting("ai.media.usage", usages);
  const deja = Number(getSetting("ai.prices.checkedAt"));
  if (!(deja > DATE_VERIFICATION_TARIFS)) setSetting("ai.prices.checkedAt", String(DATE_VERIFICATION_TARIFS));
}
