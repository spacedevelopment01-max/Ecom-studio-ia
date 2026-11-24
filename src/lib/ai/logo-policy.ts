/**
 * LA RÈGLE DES MODÈLES DES LOGOS. Politique du propriétaire du 18 octobre 2026 (un modèle imposé, sans secours), devenue
 * une LISTE avec la méthode des graphistes (24 novembre 2026, plan accepté par le chef d'orchestre, oui du propriétaire à
 * la construction) :
 *  - la recherche (deux planches de six esquisses) : GPT Image 2.5 Sunburst et GPT Image 2.6 Flare, en même temps ;
 *  - la finalisation d'une esquisse choisie : GPT Image 2.6 Sunburst ;
 *  - le symbole tiré d'un logo (et l'ancienne série, tant qu'elle n'est pas retirée) : GPT Image 2.5 Sunburst.
 * Tous chez OpenAI, sans secours ni autre route. Le verrou « réservé aux logos » ne reste QUE sur 2.5 Sunburst : 2.6 Flare
 * sert aussi aux publications et à l'atelier (route des images de SINA), qui ne doivent pas casser.
 * Indépendante du routage des images produit. Aucun réglage en ligne n'est changé par cette liste.
 */
export const REQUIRED_LOGO_PROVIDER = "openai";
/** Le modèle de l'usage « logo » du routage : le symbole tiré du logo (et l'ancienne série). */
export const REQUIRED_LOGO_MODEL = "gpt-image-2.5-sunburst";
export const LOGO_POLICY_SOURCE = "https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst";

/** Les modèles de chaque temps du logo (méthode des graphistes). */
export const LOGO_MODELS = {
  recherche: ["gpt-image-2.5-sunburst", "gpt-image-2.6-flare"],
  finalisation: "gpt-image-2.6-sunburst",
  symbole: REQUIRED_LOGO_MODEL,
} as const;
export type TempsDuLogo = keyof typeof LOGO_MODELS;

/** Tous les modèles permis pour un logo (sans doublon, dans l'ordre de la liste). */
export const LOGO_MODEL_LIST: readonly string[] = [...new Set<string>([...LOGO_MODELS.recherche, LOGO_MODELS.finalisation, LOGO_MODELS.symbole])];

/** Le seul modèle verrouillé « réservé aux logos » : jamais pour une autre image. */
export const LOGO_ONLY_MODEL = REQUIRED_LOGO_MODEL;

/** Ce modèle est-il permis pour un logo (n'importe quel temps) ? */
export const estUnModeleDeLogo = (provider: string, model: string): boolean => provider === REQUIRED_LOGO_PROVIDER && LOGO_MODEL_LIST.includes(model);
/** Ce modèle est-il réservé aux logos (aucune autre image ne le prend) ? */
export const estReserveAuxLogos = (provider: string, model: string): boolean => provider === REQUIRED_LOGO_PROVIDER && model === LOGO_ONLY_MODEL;
/** Ce modèle est-il permis pour CE temps du logo ? */
export function modelePermisPour(temps: TempsDuLogo, provider: string, model: string): boolean {
  if (provider !== REQUIRED_LOGO_PROVIDER) return false;
  const m = LOGO_MODELS[temps];
  return typeof m === "string" ? m === model : (m as readonly string[]).includes(model);
}
