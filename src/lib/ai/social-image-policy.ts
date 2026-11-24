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

/**
 * LA MÉTHODE DES PUBLICATIONS (validée par le propriétaire le 24 novembre 2026 : « Conserve intégralement la méthode, les
 * paramètres API, le modèle utilisé et la structure des prompts ») : un SEUL chemin direct, `aiPublicationMethode`
 * (media-providers.ts), POST /v1/images/edits, prend le modèle réservé aux logos (logo-policy.ts,
 * `PERMISSION_DES_PUBLICATIONS`). Ce chemin ne passe pas par le routage : partout ailleurs, l'usage « Images réseaux
 * sociaux » garde son modèle et le verrou des logos reste. Éteint par défaut (`sina.publications.methode`).
 */
export const PUBLICATIONS_METHODE_ROUTE = { provider: "openai", model: "gpt-image-2.5-sunburst" } as const;

/**
 * TOUTES LES IMAGES DE SINA PAR OPENAI (CLAUDE.md : « Images créées par OpenAI pour tout ce que fait SINA » ; 23 novembre
 * 2026, essai de Nadia : le réglage commun des images désignait Qwen-Image 3.0 Pro). Marque, site, publications,
 * publicités, atelier en mode « SINA s'en occupe » : jamais un autre fournisseur, ni en principal, ni en secours, ni par le
 * repli historique. Seul le client peut prendre un autre outil, lui-même, dans l'atelier (« On le fait ensemble », « Je
 * fais moi-même ») : `avecLOutilDuClient`.
 */
export const IMAGES_DE_SINA_POLICY = "Images créées par OpenAI pour tout ce que fait SINA";
import { AsyncLocalStorage } from "node:async_hooks";
const outilDuClient = new AsyncLocalStorage<boolean>();
/** Une image faite avec l'outil que le client a choisi lui-même dans l'atelier (le seul cas permis hors d'OpenAI). */
export const avecLOutilDuClient = <T>(fn: () => T): T => outilDuClient.run(true, fn);
export const outilChoisiParLeClient = (): boolean => outilDuClient.getStore() === true;
