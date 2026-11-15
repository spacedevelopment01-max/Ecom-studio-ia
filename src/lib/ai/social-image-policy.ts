/**
 * Images des publications : OpenAI obligatoire. Décision du propriétaire du 14 novembre 2026 (« open ia pour les
 * images sont obligatoires »), après avoir jugé « nulles » des publications sans vraie image.
 *
 * L'usage « Images réseaux sociaux » ne suit donc plus le réglage commun des images (Qwen par défaut) : il prend un
 * modèle d'OpenAI, celui choisi par l'administration s'il est d'OpenAI, sinon le modèle des images de SINA. Aucun
 * secours hors d'OpenAI : si le modèle n'est pas utilisable (clé, tarif, confirmation), rien n'est créé et c'est dit,
 * jamais un autre fournisseur en silence.
 */
export const REQUIRED_SOCIAL_IMAGE_PROVIDER = "openai";
/** Le modèle des images de SINA (planches, thème sur mesure) : `syna.mockup.image_route`, par défaut. */
export const DEFAULT_SOCIAL_IMAGE_MODEL = "gpt-image-2.6-flare";
export const SOCIAL_IMAGE_POLICY = "Décision du propriétaire du 14 novembre 2026 : les images des publications sont créées par OpenAI.";
