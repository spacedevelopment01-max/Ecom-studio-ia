/**
 * Boutique sans photos du client (décision du propriétaire, 17 novembre 2026). À la question « pour une boutique, SINA
 * ne crée pas le site tant qu'elle n'a pas une vraie photo de chaque produit ? », il a répondu, mot pour mot : « Ou
 * alors elle lui dit qu'elle peux monter le site mais qu'elle devra importer ses photos par la suite. »
 *
 * Donc SINA ne bloque pas : elle monte le site sans les photos des produits, elle le DIT AVANT la carte de dépense, et le
 * client importe ses photos ensuite. Elle n'invente jamais le produit : ses emplacements affichent « Ta photo ici ».
 *
 * Ici, sans IA : la trace que le client a été prévenu et a répondu (une note de mémoire, comme pour les preuves), le
 * refus de lancer tant qu'elle manque, et les phrases dites à SINA, à la carte de dépense et au compte rendu.
 */

export type NoteLine = { title?: string | null; value: string };
/** Le titre d'une note qui parle des photos des produits (« photos des produits », « photos de mes articles »…). */
const TITRE_PHOTOS = /(?<!\p{L})photos?(?!\p{L})[^\n]{0,30}(?<!\p{L})(?:produits?|articles?|catalogue|cr[ée]ations?|pi[èe]ces)(?!\p{L})|(?<!\p{L})(?:produits?|articles?)(?!\p{L})[^\n]{0,20}(?<!\p{L})photos?(?!\p{L})/iu;
/** Titre sous lequel SINA note la réponse du client. */
export const NOTE_PHOTOS_PRODUITS = "photos des produits";

/** Le client a-t-il été prévenu et a-t-il répondu ? (une note de mémoire dont le titre parle des photos de ses produits) */
export const photosProduitsRepondu = (lines: NoteLine[]): boolean => lines.some((l) => TITRE_PHOTOS.test((l.title ?? "").trim()) && !!(l.value ?? "").trim());

const noms = (list: string[]) => list.slice(0, 8).map((x) => `« ${x} »`).join(", ") + (list.length > 8 ? ` et ${list.length - 8} autre(s)` : "");

/** Ce que SINA dit au client avant de lancer (règle générale, sans exemple de métier). */
export const A_DIRE_AVANT = "je peux monter ton site maintenant ; tes photos, tu les importeras ensuite et elles prendront leur place toutes seules ; en attendant je ne montre pas tes produits en image, parce que je ne les invente pas : « Ta photo ici » tient leur place ; et ton site ne partira en boutique qu'une fois tes photos importées";

/**
 * Refus de créer le site d'une boutique tant que le client n'a pas été prévenu (message pour SINA seule, jamais montré au
 * client). `null` : le site peut se créer (tous les produits ont leur photo, ou le client a répondu).
 */
export function refusSansPhotosProduits(o: { sans: string[]; repondu: boolean }): string | null {
  if (!o.sans.length || o.repondu) return null;
  return `Le site n'est pas lancé et rien n'est payé : ${o.sans.length} produit(s) du catalogue n'ont aucune photo du client (${noms(o.sans)}). Tu ne bloques pas le client, mais tu le préviens AVANT la carte de dépense, avec tes mots : ${A_DIRE_AVANT}. Demande-lui, en une question, s'il a ses photos sous la main maintenant ou s'il préfère les importer plus tard. S'il les envoie maintenant : pose chacune sur son produit avec catalogue.photos (gratuit), puis relance site.create. S'il préfère plus tard : note sa réponse avec memory.note (kind « decision », key « ${NOTE_PHOTOS_PRODUITS} », value : ses mots exacts), puis relance site.create. Ne crée jamais une image de son produit à sa place.`;
}

/** La ligne rappelée sur la carte de dépense. */
export const rappelCarte = (sans: string[]) => (sans.length ? `Sans les photos de ${sans.length === 1 ? "ton produit" : `tes ${sans.length} produits`} pour l'instant : « Ta photo ici » tient leur place, tu les importeras ensuite.` : "");

/** La ligne du compte rendu, et de « à compléter » : le site ne part pas en boutique sans la photo de chaque produit. */
export const lignePhotosAImporter = (sans: string[]) => (sans.length ? `photos de tes produits à importer : ${sans.join(", ")}` : "");

/** La consigne de l'étape du site (journey.ts) : avant, puis après la création. */
export const QUESTION_DES_PHOTOS = `LES PHOTOS DE SES PRODUITS (boutique) : tu ne bloques jamais le client pour ses photos, et tu n'inventes jamais son produit. Si un produit du catalogue n'a pas de photo, dis-le-lui AVANT de lancer, avec tes mots : ${A_DIRE_AVANT}. Demande-lui, en une question, s'il les a sous la main maintenant. S'il les envoie (trombone 📎), pose chacune sur son produit avec catalogue.photos avant de lancer ; sinon note sa réponse (memory.note, key « ${NOTE_PHOTOS_PRODUITS} », ses mots). Tant qu'il n'a ni envoyé ses photos ni répondu, site.create refuse de se lancer. APRÈS la création, dès qu'il envoie une photo de produit (dans le fil ou dans l'onglet Produits) : pose-la avec catalogue.photos ; la galerie de sa fiche et ses cartes la montrent tout de suite dans l'aperçu, sans refaire le site, et tu le lui dis. Quand ses produits ont leur photo, propose-lui, avec le prix de la carte d'accord, de créer les scènes avec son vrai produit (custom.photo pour une photo du site, gallery.plan puis gallery.create pour la galerie de sa fiche) : jamais avant, jamais sans son accord.`;
