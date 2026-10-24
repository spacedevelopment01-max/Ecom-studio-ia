/**
 * SOUPLE refait d'après les six maquettes du 23 octobre (PR #180, docs/theme-briefs/souple/) : boutique de yoga et de
 * Pilates de la famille E-commerce, à quatre produits (tapis rose poudré au dessous prune, brique en liège, sangle prune
 * à anneaux argentés, anneau Pilates prune à poignées mauves), chacun avec sa fiche.
 *
 * Même chaîne que les autres démonstrations : un projet client (marque, produits, médias avec rôles) composé par le VRAI
 * moteur dans son thème du catalogue (composeShop), puis rédigé section par section, dans l'ordre des planches.
 *
 * Photos : les 31 médias du kit (logo, cinq vues par produit, dix ambiances) et les 26 compléments reçus du dossier
 * (public/theme-assets/souple/, convertis en WebP à leurs dimensions d'origine). Deux compléments n'ont pas été reçus
 * (21-compte-collection-verticale et 22-compte-bandeau, ZIP n°04 tronqué) : la page Compte utilise la variante prévue par
 * l'inventaire (ambiance-08) ; la matrice du rapport le dit. Aucune image générée, aucun extrait de planche.
 *
 * Textes : accroches et hiérarchie des maquettes ; les promesses non vérifiées (confort, résistance, durabilité,
 * bienfaits, délais, garanties) sont reformulées sur ce que montrent les photos ; les informations inconnues restent
 * « À confirmer ». Prix de démonstration centralisés (SOUPLE_PRICES) et annoncés comme tels ; aucune remise, aucune
 * livraison gratuite, aucun avis, aucune personne. Commande, compte et formulaires : démonstration sans envoi ni paiement.
 */
import { buildKitProject, p, type Brand, type Kit, type Media } from "./noctil-traverse-fixtures";
import { sectionSchema, withDefaults, type StoreProduct, type SectionInstance } from "../src/lib/theme/spec";

export const SOUPLE_PROVENANCE = "PR #180 (24 octobre 2026) — six maquettes du 23 octobre, 31 médias du kit et 26 compléments du dossier de Thomas, objets seuls et aucune personne, aucun paiement";

/** Prix de démonstration (dossier du 23 octobre), en centimes : 1 tapis + 1 brique = 78 € de sous-total. */
export const SOUPLE_PRICES: Record<SoupleKey, number> = { tapis: 5900, brique: 1900, sangle: 1500, anneau: 2900 };
export type SoupleKey = "tapis" | "brique" | "sangle" | "anneau";
const NOTE = "Prix de démonstration";
const CONFIRM = "À confirmer";

/** Médias : ordre d'import = rôles du thème ; textes alternatifs fidèles aux pixels (le nom historique ne prime pas). */
export const SOUPLE_MEDIA: Media[] = [
  { file: "logo.webp", role: "logo", alt: "SOUPLE" },
  { file: "tapis-01.webp", role: "packshot", alt: "Tapis de yoga SOUPLE rose poudré déroulé, de trois quarts, logo SOUPLE en prune au bout." },
  { file: "tapis-02.webp", role: "packshot", alt: "Tapis de yoga SOUPLE roulé : dessus rose poudré, dessous prune, logo SOUPLE." },
  { file: "tapis-03.webp", role: "detail", alt: "Gros plan du logo SOUPLE imprimé en prune sur le tapis rose poudré, au coin arrondi." },
  { file: "tapis-04.webp", role: "detail", alt: "Coin relevé du tapis SOUPLE : dessus rose poudré, dessous prune, logo SOUPLE." },
  { file: "tapis-05.webp", role: "packshot", alt: "Tapis de yoga SOUPLE rose poudré entier, posé à plat, vu de face." },
  { file: "brique-01.webp", role: "packshot", alt: "Brique de yoga SOUPLE en liège, de trois quarts, logo SOUPLE en prune sur la grande face." },
  { file: "brique-02.webp", role: "packshot", alt: "Brique SOUPLE en liège vue de profil, posée sur la tranche, arêtes arrondies." },
  { file: "brique-03.webp", role: "packshot", alt: "Brique SOUPLE en liège vue du dessus, logo SOUPLE en prune au centre." },
  { file: "brique-04.webp", role: "detail", alt: "Gros plan du logo SOUPLE en prune sur la face de la brique, grain du liège visible." },
  { file: "brique-05.webp", role: "packshot", alt: "Brique SOUPLE en liège vue de l'arrière, posée sur un socle mauve." },
  { file: "sangle-01.webp", role: "packshot", alt: "Sangle de yoga SOUPLE prune entière, en boucles : deux anneaux argentés et étiquette SOUPLE cousue." },
  { file: "sangle-02.webp", role: "packshot", alt: "Sangle de yoga SOUPLE prune roulée sur elle-même, anneaux argentés et étiquette SOUPLE devant." },
  { file: "sangle-03.webp", role: "detail", alt: "Gros plan des deux anneaux argentés de la sangle SOUPLE et de son étiquette crème cousue." },
  { file: "sangle-04.webp", role: "detail", alt: "Gros plan de l'extrémité cousue de la sangle SOUPLE, tissage prune." },
  { file: "sangle-05.webp", role: "packshot", alt: "Sangle de yoga SOUPLE prune étendue en S sur un fond rose, anneaux argentés à une extrémité." },
  { file: "anneau-01.webp", role: "packshot", alt: "Anneau Pilates SOUPLE entier, de trois quarts : cercle prune strié et deux poignées rose mauve marquées SOUPLE." },
  { file: "anneau-02.webp", role: "packshot", alt: "Anneau Pilates SOUPLE prune vu de face, deux poignées rose mauve de part et d'autre." },
  { file: "anneau-03.webp", role: "detail", alt: "Gros plan d'une poignée rose mauve de l'anneau Pilates SOUPLE, logo SOUPLE en prune." },
  { file: "anneau-04.webp", role: "packshot", alt: "Anneau Pilates SOUPLE prune posé à plat, vu de profil, ses deux poignées rose mauve visibles." },
  { file: "anneau-05.webp", role: "packshot", alt: "Anneau Pilates SOUPLE prune debout contre un cube mauve." },
  { file: "ambiance-01.webp", role: "lifestyle", alt: "Studio baigné de soleil : tapis SOUPLE rose, brique en liège, sangle et anneau prune sur le parquet." },
  { file: "ambiance-02.webp", role: "banner", alt: "Tapis SOUPLE rose poudré déroulé sur un parquet clair, près d'une fenêtre, vu de haut." },
  { file: "ambiance-03.webp", role: "scene", alt: "Brique SOUPLE en liège et sangle prune posées sur un banc en pierre claire, au soleil." },
  { file: "ambiance-04.webp", role: "scene", alt: "Anneau Pilates SOUPLE prune debout sur un socle crème, devant un mur rose." },
  { file: "ambiance-05.webp", role: "lifestyle", alt: "La collection SOUPLE vue du dessus : tapis rose poudré, brique en liège, anneau et sangle prune." },
  { file: "ambiance-06.webp", role: "scene", alt: "Tapis SOUPLE rose roulé et sangle prune enroulée sur une étagère en bois, près d'un vase et d'une plante." },
  { file: "ambiance-07.webp", role: "lifestyle", alt: "Tapis SOUPLE rose poudré déroulé sur un parquet au soleil, une brique en liège posée au bout." },
  { file: "ambiance-08.webp", role: "scene", alt: "Tapis SOUPLE rose roulé debout dans une niche en arche, brique en liège et sangle prune à ses pieds." },
  { file: "ambiance-09.webp", role: "scene", alt: "Anneau Pilates SOUPLE prune appuyé contre une brique en liège, devant un mur prune." },
  { file: "ambiance-10.webp", role: "lifestyle", alt: "Collection SOUPLE dans un séjour lumineux : tapis rose déroulé, brique en liège, sangle et anneau prune." },
  // Compléments du dossier du 23 octobre (reconstitutions guidées par les planches, jamais présentées comme photos
  // d'origine des planches).
  { file: "01-accueil-collection.webp", role: "hero", alt: "Les quatre pièces SOUPLE au soleil sur un parquet : tapis rose déroulé, brique en liège, sangle et anneau prune, rideaux clairs." },
  { file: "02-accueil-espace.webp", role: "scene", alt: "Pièce lumineuse aux rideaux clairs : tapis SOUPLE rose déroulé, brique en liège, vase et branches d'olivier." },
  { file: "03-collection-tapis-roule.webp", role: "scene", alt: "Tapis SOUPLE roulé, brique en liège, sangle et anneau prune côte à côte sur un parquet clair." },
  { file: "04-sangle-principale.webp", role: "scene", alt: "Sangle SOUPLE prune déroulée sur un sol clair, anneaux argentés et étiquette SOUPLE au premier plan." },
  { file: "05-sangle-sur-tapis.webp", role: "scene", alt: "Sangle SOUPLE prune enroulée posée sur le tapis rose, au soleil." },
  { file: "06-sangle-texture.webp", role: "detail", alt: "Très gros plan du tissage prune de la sangle SOUPLE." },
  { file: "07-anneau-principal.webp", role: "scene", alt: "Anneau Pilates SOUPLE prune debout sur le tapis rose, brique en liège derrière, lumière douce." },
  { file: "08-anneau-mouvement.webp", role: "scene", alt: "Anneau Pilates SOUPLE debout sur le tapis rose, brique en liège et plante à côté, dans une pièce claire." },
  { file: "09-anneau-rainures.webp", role: "detail", alt: "Gros plan de l'anneau Pilates SOUPLE : poignée rose mauve et cercle prune strié." },
  { file: "10-tapis-piece.webp", role: "scene", alt: "Tapis SOUPLE rose poudré déroulé dans une pièce lumineuse, une plante au premier plan." },
  { file: "11-tapis-pouf.webp", role: "scene", alt: "Tapis SOUPLE rose déroulé près d'un pouf en laine et d'un vase de branches, rideaux clairs." },
  { file: "12-tapis-roule-plaid.webp", role: "scene", alt: "Tapis SOUPLE rose roulé posé sur un plaid crème en grosse maille." },
  { file: "13-brique-principale.webp", role: "scene", alt: "Brique SOUPLE en liège posée sur un parquet clair, rideaux et plante en arrière-plan." },
  { file: "14-brique-tapis-tisse.webp", role: "scene", alt: "Brique SOUPLE en liège posée sur un tapis tissé crème, plante et vase en arrière-plan." },
  { file: "15-brique-texture.webp", role: "detail", alt: "Très gros plan du grain de liège de la brique SOUPLE." },
  { file: "16-briques-empilees.webp", role: "scene", alt: "Deux briques SOUPLE en liège empilées sur un tapis tissé : une mise en scène, pas un lot." },
  { file: "17-journal-coin-pouf.webp", role: "scene", alt: "Coin de pratique au soleil : tapis SOUPLE rose, brique, anneau et sangle, banc et coussins clairs." },
  { file: "18-journal-ombres.webp", role: "scene", alt: "Ombres de feuillage sur un mur clair au-dessus du tapis SOUPLE rose, de la brique, de la sangle et de l'anneau." },
  { file: "19-journal-tasse.webp", role: "scene", alt: "Tasse posée près de la brique, de l'anneau et de la sangle SOUPLE sur le tapis rose, au soleil." },
  { file: "20-article-coin-pratique.webp", role: "scene", alt: "Coin de pratique chez soi : tapis SOUPLE rose, brique, anneau et sangle, bibliothèque et fauteuil." },
  { file: "23-colis-ouvert.webp", role: "scene", alt: "Carton ouvert garni de papier de soie : tapis SOUPLE roulé, brique en liège, sangle et anneau." },
  { file: "24-livraison-sac-kraft.webp", role: "scene", alt: "Sac kraft marqué du S de SOUPLE, tapis rose roulé debout, brique et sangle sur un socle clair." },
  { file: "25-404-piece.webp", role: "scene", alt: "Pièce lumineuse ouverte sur un jardin : tapis SOUPLE rose, brique, sangle et anneau au soleil." },
  { file: "26-contact-collection.webp", role: "scene", alt: "Tapis SOUPLE roulé, brique en liège, sangle et anneau prune alignés au soleil sur un parquet." },
  { file: "27-panier-vide.webp", role: "scene", alt: "Tapis SOUPLE rose roulé à moitié sur un parquet au soleil, brique en liège posée au bout." },
  { file: "28-journal-feuillage.webp", role: "scene", alt: "Anneau Pilates SOUPLE, brique, sangle et tapis rose entre deux branches d'olivier, au soleil." },
];
/** Médias du dossier non reçus (ZIP n°04 tronqué à 23 220 027 octets) : remplacés par la variante prévue par l'inventaire. */
export const SOUPLE_MISSING = [
  { file: "21-compte-collection-verticale.png", usage: "Compte : ouverture verticale", fallback: "ambiance-08.webp" },
  { file: "22-compte-bandeau.png", usage: "Compte : bandeau du tableau de bord", fallback: "ambiance-07.webp" },
];

export type SoupleProduct = { key: SoupleKey; handle: string; title: string; heading: string; type: string; views: string[]; first: number };
/** Quatre produits : images de la fiche (la 1re sert aux cartes, `first` = vue montrée en premier sur la fiche). */
export const SOUPLE_PRODUCTS: SoupleProduct[] = [
  { key: "tapis", handle: "tapis-yoga-souple-rose-poudre", title: "Tapis de yoga", heading: "Le tapis SOUPLE", type: "Tapis", views: ["tapis-01.webp", "10-tapis-piece.webp", "tapis-02.webp", "tapis-04.webp", "tapis-03.webp", "tapis-05.webp"], first: 2 },
  { key: "brique", handle: "brique-yoga-souple-liege", title: "Brique de yoga", heading: "La brique en liège", type: "Accessoires", views: ["brique-01.webp", "13-brique-principale.webp", "brique-02.webp", "brique-03.webp", "brique-05.webp", "brique-04.webp"], first: 2 },
  { key: "sangle", handle: "sangle-yoga-souple-prune", title: "Sangle de yoga", heading: "Sangle de yoga", type: "Accessoires", views: ["sangle-01.webp", "04-sangle-principale.webp", "sangle-02.webp", "sangle-05.webp", "sangle-03.webp", "sangle-04.webp"], first: 2 },
  { key: "anneau", handle: "anneau-pilates-souple-prune", title: "Anneau Pilates", heading: "Anneau Pilates", type: "Accessoires", views: ["anneau-01.webp", "07-anneau-principal.webp", "anneau-02.webp", "anneau-05.webp", "anneau-04.webp", "anneau-03.webp"], first: 2 },
];

const BRAND: Brand = {
  name: "SOUPLE", product: "Collection de yoga et de Pilates SOUPLE", category: "Accessoires de yoga et de Pilates",
  summary: "Collection de yoga et de Pilates en rose poudré, prune et liège : un tapis rose poudré au dessous prune, une brique en liège, une sangle prune à deux anneaux argentés et un anneau Pilates prune à poignées rose mauve, tous marqués SOUPLE.",
  facts: [["Collection", "tapis de yoga, brique en liège, sangle et anneau Pilates assortis"], ["Couleurs", "rose poudré, prune, liège, anneaux argentés"]],
  tagline: "Du mouvement. À votre rythme.", story: "SOUPLE imagine des accessoires de yoga et de Pilates assortis, en rose poudré, prune et liège, pour pratiquer chez soi, à son rythme.", positioning: "Quatre essentiels assortis pour le yoga et le Pilates à la maison : tapis, brique, sangle et anneau.",
  // Prune du pied et des boutons, rose poudré des panneaux, liège, ivoire chaud des fonds, prune profond des titres
  // (mesurés sur les planches 01 et 04).
  palette: { primary: "#4A1530", secondary: "#EFE1DD", accent: "#C98A55", light: "#FDF8F1", dark: "#35041B" },
};

export async function soupleProject(userId: string) {
  return buildKitProject(userId, { id: "souple", media: SOUPLE_MEDIA, handle: SOUPLE_PRODUCTS[0].handle, brand: BRAND, themeName: "Souple", provenance: SOUPLE_PROVENANCE, storeKind: "catalog", sector: "sport", storeType: "multi" }, curateSouple);
}

/** Pages de la démonstration (liens du menu, du pied et des sections). */
export const SOUPLE_PAGES = {
  approche: "/pages/notre-approche", journal: "/pages/journal", guide: "/pages/guide", faq: "/pages/faq", contact: "/pages/contact",
  livraison: "/pages/livraison-retours", mentions: "/pages/mentions-legales", cgv: "/pages/cgv", confidentialite: "/pages/confidentialite", cookies: "/pages/cookies",
  connexion: "/pages/connexion", compte: "/pages/mon-compte", commande: "/pages/commande-souple-0001", motDePasse: "/pages/mot-de-passe-oublie",
  adresses: "/pages/mes-adresses", infos: "/pages/informations-personnelles", paiement: "/pages/passer-commande", confirmation: "/pages/confirmation-de-commande",
};
const href = (key: SoupleKey) => `/products/${SOUPLE_PRODUCTS.find((x) => x.key === key)!.handle}`;

/** Articles du journal (planche 05) : un modèle complet (« Créer un coin pour bouger chez soi ») et cinq déclinaisons
 * éditoriales ; conseils d'organisation et de rituel, aucun bienfait ni chiffre inventé. */
type Article = { handle: string; title: string; tag: string; image: string; excerpt: string; intro: string; why?: [string, string]; tips?: [string, string][]; body: [string, string, string?][] };
export const SOUPLE_ARTICLES: Article[] = [
  { handle: "creer-un-coin-pour-bouger-chez-soi", title: "Créer un coin pour bouger chez soi", tag: "Inspiration", image: "20-article-coin-pratique.webp",
    excerpt: "Des idées simples et inspirantes pour aménager un espace qui vous ressemble, même dans un petit espace.",
    intro: "Un espace dédié au mouvement n'a pas besoin d'être grand : il suffit d'intention, de quelques accessoires bien choisis et d'un endroit qui vous ressemble.",
    why: ["Pourquoi un espace dédié change tout ?", "Avoir un coin pour votre pratique, même minimal, aide à créer un rendez-vous avec vous-même. C'est un repère visuel qui invite au mouvement et rend la pratique plus facile à retrouver au quotidien."],
    tips: [["Choisissez un endroit calme et lumineux", "Près d'une fenêtre, dans un coin du salon ou de la chambre : là où vous avez envie de revenir."], ["Gardez vos essentiels à portée de main", "Le tapis roulé, la brique, la sangle et l'anneau rangés au même endroit : la séance commence dès que vous le décidez."], ["Personnalisez avec des éléments qui vous inspirent", "Une plante, une lumière douce, un coussin : quelques objets suffisent à rendre l'endroit accueillant."], ["Faites simple et évolutif", "Commencez avec un tapis, puis ajoutez un accessoire quand vous en ressentez le besoin."]],
    body: [["Un coin qui donne envie", "Un endroit dégagé, une lumière que vous aimez et vos accessoires visibles : c'est souvent ce qui donne envie de dérouler le tapis.", "17-journal-coin-pouf.webp"]] },
  { handle: "rituel-du-matin-5-minutes-pour-soi", title: "Rituel du matin : 5 minutes pour soi", tag: "Quotidien", image: "17-journal-coin-pouf.webp",
    excerpt: "Un petit rendez-vous à garder avant que la journée ne commence.",
    intro: "Cinq minutes, c'est peu, et pourtant c'est assez pour poser un moment à vous avant que la journée ne s'accélère. Voici une façon simple de l'installer.",
    body: [["Préparer la veille", "Laissez le tapis roulé près de l'endroit où vous pratiquerez : au réveil, il n'y a plus qu'à le dérouler.", "19-journal-tasse.webp"], ["Commencer doucement", "Quelques respirations, quelques mouvements simples : allez à votre rythme, sans objectif à atteindre."], ["Garder un repère", "Le même endroit et le même moment chaque jour aident à faire de ces cinq minutes une habitude."], ["Ranger pour demain", "Le tapis roulé et les accessoires réunis : le rituel de demain est déjà prêt."]] },
  { handle: "comment-choisir-son-tapis-de-yoga", title: "Comment choisir son tapis de yoga ?", tag: "Matériel", image: "tapis-03.webp",
    excerpt: "Les questions à se poser avant de choisir un tapis.",
    intro: "Épaisseur, dimensions, matière, rangement : avant de choisir un tapis, quelques questions simples aident à savoir ce qui compte pour vous.",
    body: [["Votre pratique", "Yoga, Pilates, étirements : pensez aux mouvements que vous ferez le plus souvent sur votre tapis.", "tapis-01.webp"], ["L'épaisseur et les dimensions", "Elles se lisent dans la fiche de chaque tapis. Celles du tapis SOUPLE sont à confirmer par la marque dans cette démonstration."], ["Le rangement", "Un tapis qui se roule facilement trouve sa place sur une étagère ou dans un coin, prêt pour la prochaine séance.", "tapis-02.webp"], ["Les couleurs de votre espace", "Un tapis reste souvent visible : choisissez une couleur que vous aimez retrouver chez vous."]] },
  { handle: "le-mouvement-au-fil-des-saisons", title: "Le mouvement au fil des saisons", tag: "Inspiration", image: "28-journal-feuillage.webp",
    excerpt: "Adapter son coin de pratique à la lumière de chaque saison.",
    intro: "La lumière change au fil de l'année, et avec elle l'envie de bouger. Quelques idées pour faire évoluer votre coin de pratique.",
    body: [["Au printemps", "Rapprochez le tapis de la fenêtre et profitez des journées qui rallongent.", "02-accueil-espace.webp"], ["En été", "Pratiquez aux heures fraîches, le matin ou en fin de journée."], ["En automne", "Une lumière douce, un plaid à portée de main : le coin devient un refuge.", "12-tapis-roule-plaid.webp"], ["En hiver", "Gardez vos accessoires visibles : ils rappellent le rendez-vous, même les jours gris."]] },
  { handle: "trouver-l-equilibre-dans-un-quotidien-actif", title: "Trouver l'équilibre dans un quotidien actif", tag: "Quotidien", image: "18-journal-ombres.webp",
    excerpt: "Des repères simples pour garder une place au mouvement quand les journées sont pleines.",
    intro: "Quand les journées sont pleines, la pratique passe souvent après le reste. Quelques repères simples aident à lui garder une place.",
    body: [["De petits moments", "Une séance n'a pas besoin d'être longue : quelques minutes comptent aussi.", "19-journal-tasse.webp"], ["Un endroit prêt", "Un coin où le tapis attend évite d'avoir à tout installer à chaque fois."], ["Un rendez-vous noté", "Inscrire la séance dans son agenda, comme un rendez-vous, aide à s'y tenir."], ["De la douceur", "Une journée sans pratique n'efface rien : reprenez le lendemain, à votre rythme."]] },
  { handle: "les-essentiels-pour-votre-pratique", title: "Les essentiels pour votre pratique", tag: "Matériel", image: "ambiance-10.webp",
    excerpt: "Le rôle de chaque accessoire de la collection.",
    intro: "Tapis, brique, sangle, anneau : quatre accessoires courants du yoga et du Pilates. Voici à quoi chacun sert, simplement.",
    body: [["Le tapis", "La surface de votre pratique au sol, du yoga au Pilates.", "tapis-01.webp"], ["La brique", "Un appui que l'on place sous la main, sous l'assise ou entre les mains, selon la posture.", "brique-01.webp"], ["La sangle", "Elle fait le lien quand les mains n'atteignent pas encore les pieds, tenue à deux mains ou bouclée par ses anneaux.", "sangle-01.webp"], ["L'anneau Pilates", "On le tient par ses deux poignées, entre les paumes ou entre les genoux.", "anneau-01.webp"]] },
];

/** Questions de la page FAQ, par thème (planche 05) : rien d'universel, de délai ni de garantie inventés. */
export const SOUPLE_FAQ: [string, string, string][] = [
  ["Comment passer commande ?", "Sélectionnez les produits de votre choix, ajoutez-les à votre panier et suivez les étapes de la commande. Dans cette démonstration, la commande est simulée : aucun paiement n'est demandé.", "Commandes"],
  ["Puis-je modifier ou annuler ma commande ?", "Conditions de modification et d'annulation : à confirmer par la boutique avant publication.", "Commandes"],
  ["Comment savoir si ma commande est confirmée ?", "Sur une boutique en ligne, un e-mail de confirmation est envoyé par la plateforme après le paiement. Dans cette démonstration, aucun e-mail n'est envoyé.", "Commandes"],
  ["Proposez-vous des cartes cadeaux ?", "Cartes cadeaux : à confirmer par la boutique.", "Commandes"],
  ["Quels sont les délais de livraison ?", "Les délais sont indiqués à l'étape de livraison de la commande. Délais de la boutique : à confirmer.", "Livraison"],
  ["Où livrez-vous ?", "Zones de livraison : à confirmer par la boutique.", "Livraison"],
  ["Quels sont les frais de livraison ?", "Les frais et délais de livraison seront précisés prochainement : ils sont calculés à l'étape de livraison de la commande.", "Livraison"],
  ["Puis-je retourner un produit ?", "Les conditions de retour seront réunies sur la page Livraison et retours (à confirmer).", "Retours et échanges"],
  ["Comment faire un retour ?", "Procédure de retour : à confirmer par la boutique.", "Retours et échanges"],
  ["Sous quel délai ?", "Délai de retour et de remboursement : à confirmer.", "Retours et échanges"],
  ["Quel accessoire choisir pour commencer ?", "Le tapis est la base de la pratique au sol ; la brique, la sangle et l'anneau s'ajoutent selon les mouvements que vous faites. Le guide présente le rôle de chacun.", "Produits"],
  ["Comment entretenir mes accessoires ?", "Conseils d'entretien de chaque accessoire : à confirmer par la marque.", "Produits"],
  ["Quels moyens de paiement acceptez-vous ?", "Moyens de paiement : à confirmer. Sur une boutique Shopify, le paiement se fait sur la page sécurisée de la plateforme.", "Paiement"],
  ["Comment créer un compte ?", "Sur une boutique en ligne, depuis « Créer un compte ». Dans cette démonstration, aucun compte n'est créé.", "Mon compte"],
  ["Comment vous contacter ?", "Depuis la page Contact : votre message est vérifié avant l'envoi. Dans cette démonstration, rien n'est envoyé.", "Autres questions"],
];
const HOME_FAQ: [string, string][] = [
  ["Quels sont les délais de livraison ?", "Ils sont indiqués à l'étape de livraison de la commande. Délais de la boutique : à confirmer."],
  ["Puis-je retourner un article ?", "Les conditions de retour seront réunies sur la page Livraison et retours (à confirmer)."],
  ["Comment entretenir mon tapis ?", "Conseils d'entretien du tapis : à confirmer par la marque."],
  ["Vos produits sont-ils adaptés aux débutants ?", "Le tapis, la brique, la sangle et l'anneau sont des accessoires courants du yoga et du Pilates. Pour une pratique adaptée à votre situation, demandez conseil à un professionnel."],
];

/** Fiche de chaque produit (planches 02 et 03) : les fiches du tapis et de la brique, puis celles de la sangle et de
 * l'anneau, gardent chacune la composition de leur planche. */
type Fiche = {
  text: string; description: string; seo: { title: string; description: string }; crumb: [string, string];
  /** Planche 02 : bandeau « votre espace », gros plans légendés et encadré, « À votre rythme », infos en trois colonnes. */
  space?: { eyebrow: string; heading: string; text: string; image: string; fx?: number };
  details?: { items: [string, string, string][]; box: string; points: [string, string, string][] };
  rhythm?: { text: string; images: string[] };
  /** Planche 03 : accordéons dans la fiche, bandeau courbe, trois tuiles, « À associer avec ». */
  accordions?: [string, string][];
  curve?: { heading: string; text: string; image: string; fx?: number };
  tiles?: [string, string, string?][];
  faq: [string, string][];
};
const SHIP = "Les frais et délais de livraison sont calculés à l'étape de livraison de la commande. Conditions de retour : à confirmer.";
const FICHES: Record<SoupleKey, Fiche> = {
  tapis: {
    text: "Un tapis au design épuré, pensé pour vous accompagner dans tous vos moments de pratique, du yoga au Pilates.",
    description: p("Un tapis de yoga rose poudré au dessous prune, logo SOUPLE imprimé en prune au bout.") + p(`Dimensions, épaisseur et matière : ${CONFIRM.toLowerCase()}.`),
    seo: { title: "Le tapis de yoga SOUPLE, rose poudré et prune | SOUPLE", description: "Tapis de yoga SOUPLE rose poudré au dessous prune, logo prune : du yoga au Pilates, chez vous. Prix de démonstration, boutique de démonstration." },
    crumb: ["Tapis", "/collections/all"],
    space: { eyebrow: "Votre espace", heading: "Votre espace\ncommence ici", text: "Un tapis pour créer un espace à vous. Une surface agréable, une présence discrète, des couleurs douces.", image: "11-tapis-pouf.webp", fx: 55 },
    details: { items: [["tapis-04.webp", "Une surface texturée", "Le dessus rose poudré et son grain fin, le dessous prune."], ["tapis-03.webp", "Un design signature", "Le logo SOUPLE en prune, pour une esthétique soignée jusque dans les détails."]], box: "Pour une pratique qui vous ressemble",
      points: [["home", "Un espace bien à vous", "Créez votre rituel, où que vous soyez."], ["sparkle", "Un design intemporel", "Des couleurs douces et naturelles."], ["heart", "Un compagnon du quotidien", "Du yoga au Pilates, et au-delà."]] },
    rhythm: { text: "Des instants pour vous, dans un espace apaisant. Le tapis SOUPLE s'intègre naturellement dans tous vos moments de pratique.", images: ["ambiance-02.webp", "12-tapis-roule-plaid.webp", "ambiance-06.webp"] },
    faq: [["Le tapis convient-il au yoga et au Pilates ?", "Il est pensé pour la pratique au sol, du yoga au Pilates. Dimensions et épaisseur : à confirmer."], ["Comment l'entretenir ?", "Conseils d'entretien : à confirmer par la marque."], ["Quelle est la différence avec d'autres tapis ?", "Ses caractéristiques (épaisseur, matière, adhérence) sont à confirmer : nous ne les comparons pas sans données vérifiées."], ["La livraison et les retours ?", SHIP]],
  },
  brique: {
    text: "Un accessoire essentiel pour vous accompagner dans votre pratique. Simple, chaleureuse et élégante, la brique en liège SOUPLE trouve naturellement sa place à vos côtés.",
    description: p("Une brique de yoga en liège aux arêtes arrondies, logo SOUPLE en prune sur la grande face.") + p(`Dimensions et poids : ${CONFIRM.toLowerCase()}.`),
    seo: { title: "La brique de yoga SOUPLE en liège | SOUPLE", description: "Brique de yoga SOUPLE en liège, arêtes arrondies, logo prune : un appui pour votre pratique. Prix de démonstration, boutique de démonstration." },
    crumb: ["Accessoires", "/collections/all"],
    space: { eyebrow: "Un appui, toujours", heading: "Un appui dans\nvotre pratique", text: "Une brique en liège, simple et essentielle, pour explorer, progresser et trouver votre juste place.", image: "14-brique-tapis-tisse.webp", fx: 60 },
    details: { items: [["15-brique-texture.webp", "Une matière naturelle", "Le liège, son grain et sa teinte chaleureuse."], ["brique-04.webp", "Un design intemporel", "Le logo SOUPLE, pour une finition soignée et élégante."]], box: "Un essentiel au quotidien",
      points: [["hand", "Un appui polyvalent", "Pour accompagner toutes vos pratiques."], ["leaf", "Une matière naturelle", "Une esthétique brute et chaleureuse."], ["sparkle", "Un design élégant", "Qui s'intègre à votre espace."]] },
    rhythm: { text: "Un accessoire pour vous accompagner dans chaque mouvement, et vous offrir un peu plus d'espace dans votre pratique.", images: ["13-brique-principale.webp", "16-briques-empilees.webp", "ambiance-03.webp"] },
    faq: [["À quoi sert la brique en liège ?", "C'est un appui que l'on place sous la main, sous l'assise ou entre les mains, selon la posture."], ["Convient-elle au yoga et au Pilates ?", "Elle s'utilise comme les briques de yoga courantes. Dimensions et poids : à confirmer."], ["Comment l'entretenir ?", "Conseils d'entretien : à confirmer par la marque."], ["La livraison et les retours ?", SHIP]],
  },
  sangle: {
    text: "Une sangle essentielle pour vous accompagner dans votre pratique. Son tissage prune et ses deux anneaux argentés en font un accessoire simple, à garder près du tapis.",
    description: p("Une sangle de yoga tissée prune, deux anneaux argentés à une extrémité et l'étiquette SOUPLE cousue.") + p(`Longueur, largeur et matière : ${CONFIRM.toLowerCase()}.`),
    seo: { title: "La sangle de yoga SOUPLE, prune à anneaux argentés | SOUPLE", description: "Sangle de yoga SOUPLE tissée prune, deux anneaux argentés, étiquette cousue. Prix de démonstration, boutique de démonstration." },
    crumb: ["Accessoires", "/collections/all"],
    accordions: [["Détails du produit", "Une sangle tissée prune, deux anneaux argentés à une extrémité et l'étiquette SOUPLE cousue. Elle se tient à deux mains ou se boucle par ses anneaux."], ["Dimensions", `Longueur et largeur : ${CONFIRM.toLowerCase()}.`], ["Entretien", `Conseils d'entretien : ${CONFIRM.toLowerCase()}.`], ["Livraison et retours", SHIP]],
    curve: { heading: "Une nouvelle\nfaçon d'explorer\nle mouvement", text: "La sangle SOUPLE vous accompagne dans votre pratique, pour explorer, affiner et enrichir vos mouvements. Un accessoire simple, pensé pour s'intégrer naturellement à votre quotidien.", image: "05-sangle-sur-tapis.webp", fx: 55 },
    tiles: [["06-sangle-texture.webp", "Une texture tissée, souple au regard."], ["sangle-03.webp", "Des anneaux argentés et une étiquette cousue."], ["ambiance-03.webp", "S'intègre à votre rituel", "À la maison comme en studio, la sangle vous accompagne dans toutes vos explorations."]],
    faq: [],
  },
  anneau: {
    text: "Un accessoire élégant pour enrichir votre pratique. Ses deux poignées rose mauve se tiennent entre les paumes ou entre les genoux, au service de vos mouvements.",
    description: p("Un anneau Pilates prune strié, deux poignées rose mauve marquées SOUPLE placées face à face.") + p(`Diamètre, matière et résistance : ${CONFIRM.toLowerCase()}.`),
    seo: { title: "L'anneau Pilates SOUPLE, prune et rose mauve | SOUPLE", description: "Anneau Pilates SOUPLE prune strié, deux poignées rose mauve marquées SOUPLE. Prix de démonstration, boutique de démonstration." },
    crumb: ["Accessoires", "/collections/all"],
    accordions: [["Détails du produit", "Un cercle prune strié et deux poignées rose mauve marquées SOUPLE, placées face à face."], ["Dimensions", `Diamètre et épaisseur : ${CONFIRM.toLowerCase()}.`], ["Entretien", `Conseils d'entretien : ${CONFIRM.toLowerCase()}.`], ["Livraison et retours", SHIP]],
    curve: { heading: "Le mouvement\nprend forme", text: "L'anneau Pilates SOUPLE vous invite à explorer de nouveaux mouvements, avec fluidité. Un design épuré et des couleurs douces, pour s'intégrer naturellement à votre routine.", image: "08-anneau-mouvement.webp", fx: 58 },
    tiles: [["ambiance-04.webp", "Deux poignées rose mauve, face à face."], ["09-anneau-rainures.webp", "Une forme circulaire, striée."], ["ambiance-09.webp", "Il s'accorde avec la brique en liège."]],
    faq: [],
  },
};

function curateSouple(k: Kit) {
  const { spec, img, section, overlay } = k;
  const items = SOUPLE_PRODUCTS;
  k.demoMeta();
  spec.store.seo = { title: "SOUPLE | Du mouvement. À votre rythme.", description: "Tapis de yoga, brique en liège, sangle et anneau Pilates SOUPLE, en rose poudré, prune et liège, pour pratiquer chez soi. Boutique et prix de démonstration." };

  // ─── Quatre produits, quatre fiches : prix de démonstration, une variante, galerie propre à chacun. ───────────────
  const baseKey = k.productKey();
  const base = structuredClone(spec.templates[baseKey]);
  const products: StoreProduct[] = items.map((it, i) => {
    const f = FICHES[it.key];
    const suffix = i === 0 ? spec.store.product.template_suffix ?? "" : `souple_${it.key}`;
    if (i > 0) spec.templates[`product.${suffix}`] = structuredClone(base);
    const price = SOUPLE_PRICES[it.key];
    return {
      ...spec.store.product, contentTarget: `product:${it.key}`, handle: it.handle, title: it.title, vendor: "SOUPLE", template_suffix: suffix,
      price, compare_at_price: null, currency: "EUR", options: [], variants: [{ title: "Default Title", options: [], price, available: true }],
      description_html: f.description, images: it.views.map(k.name), tags: [it.type], seo: f.seo,
    };
  });
  spec.store.product = products[0];
  spec.store.products = products.slice(1);
  spec.store.collections = [{ handle: "all", title: "La boutique", description: "Des essentiels bien pensés, pour une pratique plus douce.", products: products.map((x) => x.handle) }];
  const keyOf = (pr: StoreProduct) => (pr.template_suffix ? `product.${pr.template_suffix}` : "product");
  const mpSchema = sectionSchema(spec, "main-product")!;
  const block = (type: string, settings: Record<string, unknown>) => ({ type, settings: withDefaults(mpSchema.blocks.find((b) => b.type === type)?.settings, settings) });
  products.forEach((pr, i) => {
    const it = items[i], f = FICHES[it.key], key = keyOf(pr);
    const t = spec.templates[key];
    const mp = t.sections[t.order.find((sid) => t.sections[sid].type === "main-product")!];
    const blocks: [string, { type: string; settings: Record<string, unknown> }][] = [
      ["title", block("title", {})],
      ["price", block("price", { label: NOTE, show_taxes: false })],
      ["text", block("text", { text: p(f.text) })],
      ["buy", block("buy_buttons", { picker: "buttons", show_quantity: true, show_dynamic_checkout: false, price_in_button: false, quantity_label: "Quantité" })],
      ...(f.accordions
        ? f.accordions.map(([heading, content], n) => [`acc${n}`, block("collapsible", { heading, content: p(content), open: false })] as [string, { type: string; settings: Record<string, unknown> }])
        : [["reassure", block("reassurance", { layout: "row", item1: "Livraison<br>à confirmer", icon1: "truck", item2: "Retours<br>à confirmer", icon2: "return", item3: "Paiement sécurisé<br>à confirmer", icon3: "lock" })] as [string, { type: string; settings: Record<string, unknown> }]]),
    ];
    mp.settings = { ...mp.settings, product_target: pr.contentTarget, purchase_enabled: false, gallery_layout: "thumbs-left", gallery_ratio: "landscape", gallery_first: it.first, enable_zoom: true, sticky_bar: true, show_breadcrumb: true, crumb_label: f.crumb[0], crumb_link: f.crumb[1], display_heading: it.heading, display_intro: "", color_scheme: "scheme-1", padding_top: 8, padding_bottom: 24 };
    mp.blocks = Object.fromEntries(blocks);
    mp.block_order = blocks.map(([b]) => b);
  });
  // Cartes produit : mention « Prix de démonstration », prix ronds sans « ,00 ».
  spec.settings = { ...spec.settings, card_price_note: NOTE, card_arrow: false, price_trim_zeros: true };

  const productBlocks = (keys: SoupleKey[]) => keys.map((key) => ({ type: "product", settings: { product: items.find((x) => x.key === key)!.handle, note: "" } }));
  const journalBlocks = (list: Article[]) => list.map((a) => ({ type: "article", settings: { ...img(a.image), title: a.title, text: a.excerpt, tag: a.tag, date_text: "", link: `/pages/${a.handle}` } }));
  const banner = (settings: Record<string, unknown>) => section("cv-banner", { layout: "panel-left", band_height: "auto", veil: "none", mobile_valign: "bottom", focus_x: 50, focus_y: 50, mobile_focus_x: 50, mobile_focus_y: 50, image_zoom: 100, heading_tag: "h2", heading_accent: "", eyebrow: "", text: "", price_text: "", price_note: "", button_label: "", button_link: "", button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0, ...settings });

  // ─── Accueil (planche 01), dans l'ordre de la maquette. ─────────────────────────────────────────────────────────
  const homeRows: SectionInstance[] = [
    banner({ ...img("01-accueil-collection.webp"), layout: "scene", band_height: "hero", veil: "none", mobile_valign: "top", image_loading: "eager", focus_x: 50, focus_y: 82, mobile_focus_x: 72, mobile_focus_y: 50, heading: "Du mouvement.\nÀ votre rythme.", heading_tag: "h1", text: p("Des accessoires de yoga et Pilates pensés pour vous accompagner, jour après jour."), button_label: "Trouver mes essentiels", button_link: "/collections/all" }),
    section("fs-products", { layout: "grid", source: "manual", eyebrow: "", heading: "Nos essentiels", heading_accent: "", text: "", button_label: "Voir toute la boutique", button_link: "/collections/all", ratio: "square", columns: 4, limit: 4, align: "left", show_secondary: false, quick_add: "icon", effect: "fade", color_scheme: "scheme-1", padding_top: 40, padding_bottom: 24 }, productBlocks(["tapis", "brique", "sangle", "anneau"])),
    banner({ ...img("02-accueil-espace.webp"), layout: "panel-left", focus_x: 50, focus_y: 60, heading: "Un espace\npour revenir à soi.", text: p("Des accessoires essentiels aux couleurs douces, pensés pour faire de chaque pratique un moment à vous."), button_label: "Découvrir notre approche", button_link: SOUPLE_PAGES.approche }),
    section("cv-feature", { ...img("tapis-03.webp"), layout: "product", detail_shape: "square", detail_numbers: false, focus_x: 40, focus_y: 50, image_zoom: 100, eyebrow: "Notre tapis de yoga", heading: "Le soutien\nde chaque mouvement.", heading_accent: "", text: p("Une surface texturée, agréable sous la main, pour vous accompagner du quotidien aux séances les plus engagées."), buy_product: items[0].handle, price_note: NOTE, button_label: "Ajouter au panier", button_link: "", button_arrow: false, guarantee_text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0 }, [
      { type: "detail", settings: { ...img("tapis-04.webp"), caption: "" } },
      { type: "detail", settings: { ...img("tapis-02.webp"), caption: "" } },
      { type: "detail", settings: { ...img("tapis-05.webp"), caption: "" } },
    ]),
    banner({ ...img("03-collection-tapis-roule.webp"), layout: "panel-left", focus_x: 50, focus_y: 55, heading: "Quatre essentiels,\nvotre façon de bouger.", text: p("Des accessoires complémentaires pour créer une pratique qui vous ressemble. Simples et assortis, ils s'adaptent à votre rythme."), button_label: "Voir toute la boutique", button_link: "/collections/all", button_style: "outline" }),
    section("cv-cards", { layout: "columns", numbered: false, heading: "Nos univers", heading_accent: "", text: "", mobile_carousel: false, animation: "fade", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 32 }, [
      { type: "card", settings: { ...img("tapis-01.webp"), focus_x: 50, focus_y: 50, eyebrow: "", title: "Commencer sur le tapis", text: "Tout pour créer votre rituel de base.", link: href("tapis"), link_label: "Découvrir" } },
      { type: "card", settings: { ...img("ambiance-03.webp"), focus_x: 50, focus_y: 45, eyebrow: "", title: "Explorer avec des accessoires", text: "Varier, approfondir, progresser.", link: "/collections/all", link_label: "Découvrir" } },
      { type: "card", settings: { ...img("anneau-04.webp"), focus_x: 50, focus_y: 50, eyebrow: "", title: "Composer son espace", text: "Des essentiels pour un lieu qui vous inspire.", link: `/pages/${SOUPLE_ARTICLES[0].handle}`, link_label: "Découvrir" } },
    ]),
    banner({ ...img("logo.webp"), layout: "brand", focus_x: 0, focus_y: 50, heading: "Plus qu'une pratique.\nUn art de vivre.", text: p("SOUPLE imagine des accessoires de yoga et de Pilates pour accompagner un quotidien plus doux. Des objets simples et assortis, à réunir à votre rythme."), button_label: "Notre approche", button_link: SOUPLE_PAGES.approche, color_scheme: "scheme-2" }),
    section("fs-journal", { layout: "row", filters: false, tag_on_image: false, eyebrow: "", heading: "Le journal", heading_accent: "", text: "", align: "left", button_label: "Voir tous les articles", button_link: SOUPLE_PAGES.journal, limit: 3, show_date: false, show_excerpt: false, link_label: "Lire l'article", effect: "fade", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 16 }, journalBlocks([SOUPLE_ARTICLES[1], SOUPLE_ARTICLES[4], SOUPLE_ARTICLES[5]])),
    section("faq", { eyebrow: "", heading: "Questions fréquentes", text: "", style: "lines", layout: "side", columns: "1", open_first: false, search: false, contact_text: "", button_label: "", button_link: "", structured_data: false, color_scheme: "scheme-1", padding_top: 16, padding_bottom: 16 }, HOME_FAQ.map(([question, answer]) => ({ type: "question", settings: { question, answer: p(answer) } }))),
    section("newsletter", { eyebrow: "", heading: "Rejoignez l'univers Souple", text: p("Des inspirations, des nouveautés et des conseils pour une pratique plus douce, directement dans votre boîte mail."), button_label: "S'inscrire", preview_note: true, legal: "", color_scheme: "scheme-4", padding_top: 32, padding_bottom: 32 }),
  ];
  // L'accueil suit exactement la planche : les sections de la composition de base qu'elle n'utilise pas sont retirées.
  for (const r of homeRows) r.settings.__souple = true;
  overlay("index", homeRows);
  const home = spec.templates.index;
  home.order = home.order.filter((sid) => {
    if (home.sections[sid].settings.__souple) { delete home.sections[sid].settings.__souple; return true; }
    delete home.sections[sid];
    return false;
  });

  // ─── Fiches (planches 02 et 03) : composition propre à chaque paire. ────────────────────────────────────────────
  products.forEach((pr, i) => {
    const it = items[i], f = FICHES[it.key];
    const others = items.filter((o) => o.key !== it.key).map((o) => o.key);
    const rows: SectionInstance[] = f.space
      ? [
        banner({ ...img(f.space.image), layout: "panel-left", focus_x: f.space.fx ?? 50, focus_y: 55, eyebrow: f.space.eyebrow, heading: f.space.heading, text: p(f.space.text), button_label: "Découvrir notre approche", button_link: SOUPLE_PAGES.approche, button_style: "outline" }),
        section("cv-feature", { layout: "details-points", detail_shape: "square", detail_numbers: false, image_asset: "", image_alt: "", eyebrow: "", heading: f.details!.box, heading_accent: "", text: "", button_label: "", button_link: "", guarantee_text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 16, padding_bottom: 16 }, [
          ...f.details!.items.map(([file, caption, text]) => ({ type: "detail", settings: { ...img(file), caption, text } })),
          ...f.details!.points.map(([icon, title, text]) => ({ type: "point", settings: { icon, title, text: p(text) } })),
        ]),
        section("cv-cards", { layout: "pills", numbered: false, heading: "À votre rythme", heading_accent: "", text: p(f.rhythm!.text), mobile_carousel: false, animation: "fade", color_scheme: "scheme-1", padding_top: 16, padding_bottom: 16 }, f.rhythm!.images.map((file) => ({ type: "card", settings: { ...img(file), focus_x: 50, focus_y: 50, eyebrow: "", title: "", text: "", link: "", link_label: "" } }))),
        section("cv-infos", { specs_heading: "", products_heading: "Ils s'accordent parfaitement", quick_add: "icon", faq_heading: "Questions fréquentes", color_scheme: "scheme-1", padding_top: 16, padding_bottom: 16 }, [
          ...[["Dimensions", CONFIRM, `Dimensions : ${CONFIRM.toLowerCase()} par la marque.`], ["Matériaux", CONFIRM, `Composition : ${CONFIRM.toLowerCase()} par la marque.`], ["Entretien", CONFIRM, `Conseils d'entretien : ${CONFIRM.toLowerCase()} par la marque.`], ["Livraison et retours", CONFIRM, SHIP]].map(([title, value, text]) => ({ type: "spec", settings: { title, value, text: p(text) } })),
          ...productBlocks(others),
          ...f.faq.map(([question, answer]) => ({ type: "question", settings: { question, answer: p(answer) } })),
        ]),
        banner({ layout: "buybar", buy_product: it.handle, heading: it.heading, price_note: NOTE, button_label: "Ajouter au panier", button_arrow: false, color_scheme: "scheme-1", padding_top: 8, padding_bottom: 24 }),
      ]
      : [
        banner({ ...img(f.curve!.image), layout: "panel-left", curve: true, focus_x: f.curve!.fx ?? 50, focus_y: 55, heading: f.curve!.heading, text: p(f.curve!.text) }),
        section("cv-cards", { layout: "overlay", numbered: false, heading: "", heading_accent: "", text: "", mobile_carousel: false, animation: "fade", color_scheme: "scheme-1", padding_top: 8, padding_bottom: 16 }, f.tiles!.map(([file, title, text]) => ({ type: "card", settings: { ...img(file), focus_x: 50, focus_y: 50, eyebrow: "", title, text: text ? p(text) : "", link: "", link_label: "" } }))),
        section("fs-products", { layout: "list", source: "manual", eyebrow: "", heading: "À associer avec", heading_accent: "", text: "", button_label: "", button_link: "", ratio: "square", columns: 3, limit: 3, align: "left", show_secondary: false, exclude_current: true, quick_add: "plus", effect: "fade", color_scheme: "scheme-1", padding_top: 16, padding_bottom: 32 }, productBlocks(others)),
      ];
    for (const r of rows) r.settings.__souple = true;
    overlay(keyOf(pr), rows);
    const t = spec.templates[keyOf(pr)];
    const at = t.order.findIndex((sid) => t.sections[sid].type === "main-product");
    t.order = t.order.filter((sid, j) => {
      if (j <= at) return true;
      if (t.sections[sid].settings.__souple) { delete t.sections[sid].settings.__souple; return true; }
      delete t.sections[sid];
      return false;
    });
  });

  // ─── Menus, en-tête (logo, menu centré, recherche, compte, panier), pied prune (clair sur les fiches). ────────────
  spec.store.menus["main-menu"] = { title: "Navigation", links: [
    { title: "La boutique", url: "/collections/all" },
    { title: "Notre approche", url: SOUPLE_PAGES.approche },
    { title: "Le journal", url: SOUPLE_PAGES.journal },
    { title: "Aide", url: SOUPLE_PAGES.faq },
  ] };
  spec.store.menus.footer = { title: "La boutique", links: [{ title: "Tapis", url: href("tapis") }, { title: "Briques", url: href("brique") }, { title: "Sangles", url: href("sangle") }, { title: "Anneaux Pilates", url: href("anneau") }] };
  spec.store.menus["footer-approche"] = { title: "Notre approche", links: [{ title: "Notre histoire", url: SOUPLE_PAGES.approche }, { title: "Le guide", url: SOUPLE_PAGES.guide }, { title: "Le journal", url: SOUPLE_PAGES.journal }] };
  spec.store.menus["footer-aide"] = { title: "Aide", links: [{ title: "FAQ", url: SOUPLE_PAGES.faq }, { title: "Livraison et retours", url: SOUPLE_PAGES.livraison }, { title: "Mon compte", url: SOUPLE_PAGES.connexion }, { title: "Nous contacter", url: SOUPLE_PAGES.contact }] };
  spec.store.menus.legal = { title: "Informations légales", links: [{ title: "Mentions légales", url: SOUPLE_PAGES.mentions }, { title: "CGV", url: SOUPLE_PAGES.cgv }, { title: "Confidentialité", url: SOUPLE_PAGES.confidentialite }, { title: "Cookies", url: SOUPLE_PAGES.cookies }] };
  const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
  header.settings = { ...header.settings, menu: "main-menu", layout: "logo-left", shape: "bar", icons: "plain", mega_menu: "none", mobile_menu: "drawer", mobile_submenu: "accordion", sticky: true, transparent_on_home: false, show_search: true, show_cart: true, account_link: SOUPLE_PAGES.connexion, cta_label: "", phone: "", color_scheme: "scheme-1", mobile_menu_scheme: "scheme-1" };
  header.blocks = {};
  header.block_order = [];
  spec.groups.header.sections = { header };
  spec.groups.header.order = ["header"];
  const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
  const fschema = sectionSchema(spec, "footer")!;
  const fblock = (type: string, settings: Record<string, unknown>) => ({ type, settings: withDefaults(fschema.blocks.find((b) => b.type === type)?.settings, settings) });
  footer.settings = { ...footer.settings, style: "brand-left", tagline: "", show_wordmark: false, show_policies: false, show_payment: false, color_scheme: "scheme-2", product_color_scheme: "scheme-4", logo_asset: k.name("logo.webp"), bottom_text: "Boutique et prix de démonstration.", bottom_menu: "legal" };
  footer.blocks = {
    shop: fblock("links", { heading: "La boutique", menu: "footer" }),
    approche: fblock("links", { heading: "Notre approche", menu: "footer-approche" }),
    help: fblock("links", { heading: "Aide", menu: "footer-aide" }),
    news: fblock("newsletter", { heading: "Rejoignez l'univers Souple", text: p("Des inspirations, des conseils et nos nouveautés.") }),
  };
  footer.block_order = ["shop", "approche", "help", "news"];
  for (const s of Object.values(spec.groups.footer.sections)) if (s.type !== "footer") s.disabled = true;

  // ─── Boutique (planche 04) : ouverture courbe, « La boutique », pastilles avec compteurs, tri, cartes. ──────────
  spec.templates.collection = { order: ["hero", "main"], sections: {
    hero: banner({ ...img("01-accueil-collection.webp"), layout: "panel-left", curve: true, image_loading: "eager", focus_x: 62, focus_y: 60, heading: "Des accessoires\npour votre pratique", text: p("Yoga et Pilates, à la maison et à votre rythme."), button_label: "Découvrir la collection", button_link: "#CollectionGrid" }),
    main: section("main-collection", { per_page: 12, columns: 4, enable_filters: false, enable_sorting: false, type_chips: true, chips_all_label: "Tous", chip_counts: true, client_sort: true, sort_label: "Trier par", show_header: true, show_count: false, card_vendor: false, card_button_label: "Ajouter au panier", quick_add: "button", card_ratio: "square", color_scheme: "scheme-1" }),
  } };

  // ─── Panier (planche 04) : lignes, sous-total, livraison à l'étape suivante, « Complétez votre pratique » ; panier
  // vide : grande photo « Votre prochain mouvement commence ici. » et trois repères. « Passer commande » mène, dans
  // l'aperçu seulement, à la commande d'exemple en étapes. ───────────────────────────────────────────────────────
  for (const sec of Object.values(spec.templates.cart?.sections ?? {})) if (sec.type === "main-cart") sec.settings = { ...sec.settings, intro: "", hero_image_asset: "", hero_heading: "Votre panier", hero_text: "", count_line: true, hero_empty_image_asset: img("27-panier-vide.webp").image_asset, hero_empty_focus_x: 60, hero_empty_focus_y: 60, hero_empty_heading: "Votre prochain\nmouvement\ncommence ici.", hero_empty_text: "Des accessoires pour une pratique plus douce, plus libre, chaque jour.", hero_empty_button_label: "Découvrir la boutique", hero_empty_button_link: "/collections/all", hero_color_scheme: "scheme-1", table_head: false, show_update: false, show_taxes_note: false, variant_options: false, total_label: "Sous-total ([n] articles)", shipping_label: "Livraison", shipping_text: "Calculée à l'étape suivante", summary_note: NOTE, empty_icon: "none", empty_image_asset: "", empty_heading: "Votre panier est vide.", empty_text: "", empty_button_label: "Découvrir la boutique", empty_button_link: "/collections/all", qty_buttons: true, remove_label: "Supprimer", continue_label: "Continuer mes achats", demo_checkout_link: SOUPLE_PAGES.paiement, color_scheme: "scheme-1" };
  spec.templates.cart.sections.more = section("fs-products", { ...img("05-sangle-sur-tapis.webp"), layout: "over-photo", source: "manual", cart_visibility: "filled", exclude_cart_items: true, focus_x: 62, focus_y: 50, eyebrow: "", heading: "Complétez votre pratique", heading_accent: "", text: "", button_label: "", button_link: "", ratio: "square", limit: 1, align: "left", show_secondary: false, quick_add: "button", card_button_label: "Ajouter au panier", effect: "fade", color_scheme: "scheme-4", padding_top: 16, padding_bottom: 40 }, productBlocks(["sangle", "anneau", "brique", "tapis"]));
  spec.templates.cart.sections.reperes = section("cv-feature", { layout: "essentials", cart_visibility: "empty", detail_shape: "square", detail_numbers: false, image_asset: "", image_alt: "", eyebrow: "", heading: "", heading_accent: "", text: "", button_label: "", button_link: "", guarantee_text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 16, padding_bottom: 48 }, [
    { type: "point", settings: { icon: "sparkle", title: "Des essentiels\nbien pensés", text: "" } },
    { type: "point", settings: { icon: "leaf", title: "Une pratique\nau quotidien", text: "" } },
    { type: "point", settings: { icon: "waves", title: "Un moment\nrien qu'à vous", text: "" } },
  ]);
  spec.templates.cart.order.push("more", "reperes");
  spec.settings = { ...spec.settings, cart_discount_code: false, cart_checkout_label: "Passer commande", cart_reassurance: "" };

  pagesSouple(k);
  k.finish();
  spec.settings = { ...spec.settings, logo_width: 150, fab_contact_link: SOUPLE_PAGES.contact, cookie_banner: true, cookie_policy_link: SOUPLE_PAGES.cookies };
  // Page introuvable (planche 06) : photo dans une grande forme en S, retour à l'accueil.
  for (const sec of Object.values(spec.templates["404"]?.sections ?? {})) if (sec.type === "main-404") sec.settings = { ...sec.settings, ...img("25-404-piece.webp"), heading: "Une petite\npause dans\nle parcours", text: "Cette page semble avoir pris un autre chemin. Prenez un instant, respirez… et revenez sur notre page d'accueil pour continuer l'expérience.", illustration: "shape", button_label: "Retour à l'accueil", button_link: "/", color_scheme: "scheme-1" };
}

function pagesSouple(k: Kit) {
  const { spec } = k;
  const S = (type: string, settings: Record<string, unknown>, blocks: { type: string; settings: Record<string, unknown> }[] = []) => k.section(type, settings, blocks);
  const page = (handle: string, title: string, seo: { title: string; description: string }, rows: [string, SectionInstance][], showTitle = false) => {
    k.page(handle, title, seo, rows);
    // Le titre de page est porté par la première section (H1), sauf sur les pages dont la maquette pose le titre seul.
    spec.templates[`page.${handle}`].sections.title.settings = { ...spec.templates[`page.${handle}`].sections.title.settings, show_title: showTitle, padding_top: showTitle ? 40 : 0, padding_bottom: 0 };
  };
  const banner = (settings: Record<string, unknown>) => S("cv-banner", { layout: "panel-left", band_height: "auto", veil: "none", mobile_valign: "bottom", focus_x: 50, focus_y: 50, mobile_focus_x: 50, mobile_focus_y: 50, image_zoom: 100, heading_tag: "h2", heading_accent: "", eyebrow: "", text: "", price_text: "", price_note: "", button_label: "", button_link: "", button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0, ...settings });
  const hero = (file: string, eyebrow: string, heading: string, text: string, extra: Record<string, unknown> = {}) => banner({ ...k.img(file), layout: "panel-left", curve: true, image_loading: "eager", eyebrow, heading, heading_tag: "h1", text: p(text), ...extra });
  const journalCards = (list: Article[]) => list.map((a) => ({ type: "article", settings: { ...k.img(a.image), title: a.title, text: a.excerpt, tag: a.tag, date_text: "", link: `/pages/${a.handle}` } }));
  const productCards = (keys: SoupleKey[]) => keys.map((key) => ({ type: "product", settings: { product: SOUPLE_PRODUCTS.find((x) => x.key === key)!.handle, note: "" } }));
  const seo = (title: string, description: string) => ({ title: `${title} | SOUPLE`, description });

  // ─── Commande d'exemple en étapes et confirmation (planche 04) : rien n'est envoyé ni payé. ────────────────────
  const orderLines = [{ type: "line", settings: { product: SOUPLE_PRODUCTS[0].handle, variant_label: "Qté : 1", quantity: 1 } }, { type: "line", settings: { product: SOUPLE_PRODUCTS[1].handle, variant_label: "Qté : 1", quantity: 1 } }];
  page("passer-commande", "Passer commande", seo("Passer commande (démonstration)", "Commande d'exemple de la boutique de démonstration : testable avec des données fictives, rien n'est envoyé ni payé."), [["order", S("demo-order", { layout: "steps", eyebrow: "", heading: "Passer commande", text: "", demo_notice: "Démonstration : saisissez des données fictives. Aucun paiement n'est demandé, aucune commande n'est enregistrée, aucun e-mail n'est envoyé.", contact_title: "Contact", contact_info_title: "Informations de contact", email_label: "E-mail", email_placeholder: "votre@email.com", newsletter_label: "Recevoir nos actualités (facultatif)", address_title: "Adresse", first_name_label: "Prénom", last_name_label: "Nom", address_label: "Adresse", address_placeholder: "Numéro et rue", zip_label: "Code postal", city_label: "Ville", country_label: "Pays", country_value: "France", shipping_title: "Livraison", shipping_option_label: "Livraison standard", shipping_value: "Calculée à l'étape suivante", payment_title: "Paiement", payment_text: "Sur une boutique en ligne, le paiement se fait sur la page sécurisée de la plateforme (par exemple Shopify Checkout). Ici, aucune carte n'est demandée.", summary_title: "Votre commande", subtotal_label: "Sous-total", shipping_label: "Livraison", total_label: "Total hors livraison", total_note: NOTE, next_label: "Continuer", back_label: "Retour", submit_label: "Valider la commande d'exemple", button_label: "", button_link: SOUPLE_PAGES.confirmation, button_note: "", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 56 }, orderLines)]]);
  page("confirmation-de-commande", "Confirmation de commande", seo("Confirmation (exemple)", "Exemple de confirmation de la boutique de démonstration : aucune commande réelle."), [["order", S("demo-order", { ...k.img("18-journal-ombres.webp"), focus_x: 50, focus_y: 40, layout: "confirmation", use_last_order: true, eyebrow: "Exemple de confirmation", heading: "Merci, votre commande\nd'exemple est enregistrée.", text: p("Dans cette démonstration, aucune commande n'est passée et aucun colis n'est préparé. Sur une boutique en ligne, la confirmation et l'e-mail sont envoyés par la plateforme après le paiement."), order_number_label: "Numéro de commande", order_number: "SOUPLE-0001 (exemple)", order_date_label: "Date de commande", order_date_fallback: "Date de la démonstration", meta_note: "Aucun e-mail n'est envoyé dans cette démonstration.", button_label: "Voir l'exemple de suivi", button_link: SOUPLE_PAGES.commande, secondary_label: "Retour à la boutique", secondary_link: "/collections/all", summary_title: "Récapitulatif de votre commande", subtotal_label: "Sous-total", shipping_label: "Livraison", shipping_value: "Calculée à l'étape suivante", total_note: NOTE, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 56 }, orderLines)]]);

  // ─── Notre approche (planche 05) : aucune histoire de fondateur, aucun lieu de fabrication, aucune certification. ─
  page("notre-approche", "Notre approche", seo("Notre approche", "Moins de pression. Plus de mouvement. Des accessoires de yoga et de Pilates pensés pour une pratique plus libre et plus douce, à la maison."), [
    ["hero", banner({ ...k.img("01-accueil-collection.webp"), layout: "background", band_height: "tall", veil: "light", image_loading: "eager", focus_x: 62, focus_y: 60, mobile_focus_x: 70, mobile_focus_y: 50, eyebrow: "Notre approche", heading: "Moins de\npression.\nPlus de\nmouvement.", heading_tag: "h1", text: p("Des accessoires de yoga et Pilates pensés pour vous accompagner vers une pratique plus libre, plus douce et plus présente dans le quotidien."), button_label: "Découvrir notre univers", button_link: "/collections/all" })],
    ["principes", S("cv-feature", { layout: "essentials", detail_shape: "square", detail_numbers: false, image_asset: "", image_alt: "", eyebrow: "", heading: "", heading_accent: "", text: "", button_label: "", button_link: "", guarantee_text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 40, padding_bottom: 40 }, [
      { type: "point", settings: { icon: "waves", title: "Un mouvement plus libre", text: p("Des accessoires pour explorer, progresser et vous sentir bien, à votre rythme.") } },
      { type: "point", settings: { icon: "home", title: "Des objets du quotidien", text: p("Des essentiels simples et assortis, pour une pratique qui s'intègre dans la vraie vie.") } },
      { type: "point", settings: { icon: "leaf", title: "Une esthétique douce", text: p("Rose poudré, prune et liège : des couleurs choisies pour accompagner votre espace.") } },
    ])],
    ["guide", banner({ ...k.img("ambiance-01.webp"), layout: "panel-right", focus_x: 55, focus_y: 60, heading: "Quatre essentiels,\nun même univers.", text: p("Le tapis, la brique, la sangle et l'anneau se complètent : le guide présente le rôle de chacun."), button_label: "Lire le guide", button_link: SOUPLE_PAGES.guide, button_style: "outline" })],
  ]);

  // ─── Journal (planche 05) : catégories, article vedette, grille ; chaque article a sa page. ─────────────────────
  page("journal", "Le journal", seo("Le journal", "Des inspirations, des conseils et des idées pour une pratique plus présente au quotidien."), [
    ["hero", banner({ ...k.img("18-journal-ombres.webp"), layout: "background", band_height: "short", veil: "light", focus_x: 80, focus_y: 30, mobile_focus_x: 80, mobile_focus_y: 30, heading: "Le journal", heading_tag: "h1", text: p("Des inspirations, des conseils et des idées pour une pratique plus présente au quotidien."), button_label: "" })],
    ["articles", S("fs-journal", { layout: "editorial", filters: true, all_label: "Tous", tag_on_image: false, eyebrow: "", heading: "", heading_accent: "", text: "", align: "left", button_label: "", button_link: "", limit: 6, show_date: false, show_excerpt: true, link_label: "Lire l'article", effect: "fade", color_scheme: "scheme-1", padding_top: 16, padding_bottom: 48 }, journalCards(SOUPLE_ARTICLES))],
  ]);
  for (const a of SOUPLE_ARTICLES) {
    const others = SOUPLE_ARTICLES.filter((x) => x.handle !== a.handle).slice(0, 3);
    const blocksOf = (body: Article["body"]) => body.flatMap(([h, t, image]) => [
      { type: "heading", settings: { text: h } },
      { type: "paragraph", settings: { text: p(t) } },
      ...(image ? [{ type: "image", settings: { ...k.img(image), caption: "" } }] : []),
    ]);
    const article: { type: string; settings: Record<string, unknown> }[] = [
      ...(a.why ? [{ type: "heading", settings: { text: a.why[0] } }, { type: "paragraph", settings: { text: p(a.why[1]) } }] : []),
      ...(a.tips ? [{ type: "heading", settings: { text: "Nos conseils pour créer votre espace" } }, ...a.tips.map(([title, text]) => ({ type: "point", settings: { title, text: p(text) } }))] : []),
      ...blocksOf(a.body),
    ];
    page(a.handle, a.title, seo(a.title, a.excerpt), [
      ["hero", banner({ ...k.img(a.image), layout: "panel-left", curve: true, image_loading: "eager", focus_x: 55, focus_y: 50, eyebrow: a.tag, heading: a.title, heading_tag: "h1", text: p(a.intro) + p("Par l'équipe SOUPLE"), button_label: "" })],
      ["article", S("cv-article", { style: "listicle", width: "regular", label_bar: "", crumb_label: a.tag, crumb_link: SOUPLE_PAGES.journal, crumb_link_label: "Le journal", eyebrow: "", heading: "", heading_tag: "h2", heading_accent: "", intro: "", author: "", date_text: "", rating_text: "", demo_note: "", animation: "fade", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 16 }, article)],
      ["similaires", S("fs-journal", { layout: "row", filters: false, tag_on_image: false, eyebrow: "", heading: "Articles similaires", heading_accent: "", text: "", align: "left", button_label: "Voir tous les articles", button_link: SOUPLE_PAGES.journal, limit: 3, show_date: false, show_excerpt: false, link_label: "Lire l'article", effect: "fade", color_scheme: "scheme-1", padding_top: 16, padding_bottom: 48 }, journalCards(others))],
    ]);
  }

  // ─── Guide (planche 05) : les quatre produits, leur rôle, un comparatif et des boutons vers chaque fiche. ──────
  page("guide", "Guide", seo("Quels essentiels pour votre pratique ?", "Le rôle du tapis, de la brique, de la sangle et de l'anneau Pilates SOUPLE, et un comparatif simple pour choisir."), [
    ["hero", hero("ambiance-05.webp", "Guide", "Quels essentiels\npour votre pratique ?", "Quatre accessoires complémentaires pour vous accompagner dans votre pratique de yoga et de Pilates. Découvrez leur rôle et trouvez ceux qui correspondent à vos besoins.", { focus_x: 64, focus_y: 60 })],
    ["produits", S("fs-products", { layout: "grid", source: "manual", eyebrow: "", heading: "", heading_accent: "", text: "", button_label: "", button_link: "", ratio: "square", columns: 4, limit: 4, align: "left", show_secondary: false, quick_add: "none", card_button_label: "Voir la fiche", effect: "fade", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 16 }, [
      { type: "product", settings: { product: SOUPLE_PRODUCTS[0].handle, note: "La surface de votre pratique au sol, du yoga au Pilates." } },
      { type: "product", settings: { product: SOUPLE_PRODUCTS[1].handle, note: "Un appui sous la main, sous l'assise ou entre les mains." } },
      { type: "product", settings: { product: SOUPLE_PRODUCTS[2].handle, note: "Un lien quand les mains n'atteignent pas encore les pieds." } },
      { type: "product", settings: { product: SOUPLE_PRODUCTS[3].handle, note: "Tenu par ses poignées, entre les paumes ou les genoux." } },
    ])],
    ["comparatif", S("comparison-table", { eyebrow: "", heading: "Comparatif", heading_accent: "", text: "", layout: "table", criteria_label: "Comparatif", badge: "", note: "Rôles décrits d'après l'usage courant de chaque accessoire ; dimensions et poids : à confirmer.", button_label: "", button_link: "", animation: "fade", color_scheme: "scheme-1", padding_top: 16, padding_bottom: 48 }, [
      ...SOUPLE_PRODUCTS.map((x) => ({ type: "column", settings: { label: x.title, subtitle: "", image_asset: "", price: "", link_label: `Voir ${x.key === "tapis" ? "le tapis" : x.key === "brique" ? "la brique" : x.key === "sangle" ? "la sangle" : "l'anneau"}`, link: `/products/${x.handle}`, highlight: false } })),
      { type: "row", settings: { label: "Rôle principal", note: "", v1: "Surface de pratique", v2: "Appui et hauteur", v3: "Prolonger les bras", v4: "Travail en Pilates" } },
      { type: "row", settings: { label: "Idéal pour", note: "", v1: "Toutes les pratiques au sol", v2: "Adapter une posture", v3: "Étirements", v4: "Varier les exercices" } },
      { type: "row", settings: { label: "Se range", note: "", v1: "Roulé", v2: "À plat", v3: "Roulée", v4: "Debout ou à plat" } },
    ])],
  ]);

  // ─── FAQ (planche 05) : thèmes en sommaire, questions par thème, photo. ────────────────────────────────────────
  page("faq", "FAQ", seo("FAQ", "Les réponses aux questions les plus fréquentes sur les commandes, la livraison, les retours et les produits."), [
    ["questions", S("faq", { ...k.img("14-brique-tapis-tisse.webp"), focus_x: 50, focus_y: 55, eyebrow: "", heading: "", text: p("Retrouvez ici les réponses aux questions les plus fréquentes. Une autre question ? Contactez-nous."), style: "lines", layout: "side", columns: "1", topics: false, topic_titles: true, topic_nav: true, topic_nav_label: "Thèmes des questions", open_first: true, search: false, contact_text: "", button_label: "Nous contacter", button_link: SOUPLE_PAGES.contact, structured_data: false, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 48 }, SOUPLE_FAQ.map(([question, answer, topic]) => ({ type: "question", settings: { question, answer: p(answer), topic } })))],
  ], true);

  // ─── Contact (planche 05) : formulaire complet, autres moyens d'assistance, photo en bandeau. ──────────────────
  page("contact", "Nous contacter", seo("Nous contacter", "Une question, un besoin d'information ? Écrivez-nous depuis le formulaire."), [
    ["form", S("contact-form", { ...k.img("28-journal-feuillage.webp"), eyebrow: "", heading: "", text: p("Une question, un besoin d'information ? Notre équipe vous répond avec attention. Coordonnées et délai de réponse : à confirmer."), email: "", hours: "", response: "", show_phone: false, require_name: true, require_message: true, name_placeholder: "", email_placeholder: "votre@email.com", message_placeholder: "", order_field: true, order_placeholder: "Facultatif", subjects: "Une commande\nUn produit\nLa livraison ou un retour\nAutre question", consent_text: "J'accepte que mes informations soient utilisées pour répondre à ma demande.", submit_label: "Envoyer le message", inline_states: true, preview_note: true, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 16 })],
    ["aide", S("cv-cards", { layout: "rows", numbered: false, heading: "Autres moyens d'assistance", heading_accent: "", text: "", mobile_carousel: false, animation: "fade", color_scheme: "scheme-4", padding_top: 24, padding_bottom: 24 }, [
      { type: "card", settings: { image_asset: "", eyebrow: "", title: "Consulter la FAQ", text: "Trouvez rapidement une réponse à vos questions.", link: SOUPLE_PAGES.faq, link_label: "Voir la FAQ" } },
      { type: "card", settings: { image_asset: "", eyebrow: "", title: "Suivre ma commande", text: "Accédez aux informations de livraison.", link: SOUPLE_PAGES.connexion, link_label: "Mon compte" } },
      { type: "card", settings: { image_asset: "", eyebrow: "", title: "Retours et échanges", text: "Toutes les informations sur les retours.", link: SOUPLE_PAGES.livraison, link_label: "Livraison et retours" } },
    ])],
    ["bandeau", banner({ ...k.img("26-contact-collection.webp"), layout: "background", band_height: "short", veil: "none", focus_x: 50, focus_y: 70, heading: "", text: "", button_label: "" })],
  ], true);

  // ─── Livraison et retours (planche 06) : tout reste « à confirmer », aucune prestation prétendue. ──────────────
  page("livraison-retours", "Livraison & retours", seo("Livraison et retours", "Livraison, retours et questions : les informations de la boutique, à confirmer avant publication."), [
    ["infos", S("cv-feature", { ...k.img("24-livraison-sac-kraft.webp"), layout: "image-right", detail_shape: "square", detail_numbers: false, focus_x: 50, focus_y: 50, image_zoom: 100, eyebrow: "", heading: "", heading_accent: "", text: p("Une expérience simple et sereine, de la boutique à chez vous."), button_label: "Nous contacter", button_link: SOUPLE_PAGES.contact, button_arrow: true, guarantee_text: "Modalités à confirmer avant publication : les informations de cette page sont des exemples de démonstration.", animation: "fade", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 48 }, [
      { type: "point", settings: { icon: "truck", title: "Livraison", text: p("Les délais et frais de livraison seront précisés lors du paiement. Zones et délais : à confirmer.") } },
      { type: "point", settings: { icon: "parcel", title: "Retours", text: p("Le délai de rétractation et les conditions de retour seront précisés ici. Procédure : à confirmer.") } },
      { type: "point", settings: { icon: "chat", title: "Une question ?", text: p("Notre équipe est à votre écoute pour vous accompagner.") } },
    ])],
  ], true);

  // ─── Informations légales (planche 06) : quatre onglets, modèles à compléter, aucune identité inventée. ────────
  const legal = (handle: string, title: string, intro: string, parts: [string, string][], extra: Record<string, unknown> = {}) => page(handle, title, seo(title, `${title} : modèle de démonstration à compléter et à valider avant publication.`), [
    ["texte", S("legal-page", { source: "blocks", show_title: true, eyebrow: "", heading: "Informations légales", updated: "", intro: p("<strong>Contenu à compléter et valider avant publication.</strong> Les informations présentes sur cette page sont fournies à titre de démonstration et doivent être complétées, vérifiées et validées avant la mise en ligne du site.") + p(intro), show_toc: false, pages_menu: "legal", show_print: false, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 56, ...extra }, parts.map(([t, x]) => ({ type: "part", settings: { title: t, text: p(`[À renseigner : ${x}]`) } })))],
  ]);
  legal("mentions-legales", "Mentions légales", "Des informations claires et transparentes.", [["Éditeur du site", "nom de l'entreprise, forme juridique, adresse du siège social, numéro SIREN"], ["Directeur de la publication", "nom du directeur de la publication"], ["Hébergement", "nom et coordonnées de l'hébergeur du site"], ["Contact", "coordonnées de contact"]]);
  legal("cgv", "Conditions générales de vente", "Les conditions applicables aux commandes passées sur la boutique.", [["Produits", "description des produits proposés et de leurs caractéristiques"], ["Prix", "devise, mention TTC ou HT et frais éventuels"], ["Commande", "étapes de la commande et de sa validation"], ["Paiement", "moyens de paiement acceptés"], ["Livraison", "zones, délais et frais de livraison"], ["Rétractation et retours", "délai et modalités du droit de rétractation"], ["Garanties", "garanties légales applicables"], ["Droit applicable", "droit applicable et règlement des litiges"]]);
  legal("confidentialite", "Confidentialité", "La façon dont la boutique traite vos données personnelles.", [["Données collectées", "catégories de données collectées"], ["Finalités", "finalités de chaque traitement"], ["Durée de conservation", "durée de conservation de chaque catégorie"], ["Vos droits", "droits d'accès, de rectification, d'effacement et modalités d'exercice"], ["Contact", "coordonnées du responsable du traitement"]]);
  legal("cookies", "Cookies", "Vos choix de cookies se modifient à tout moment depuis le bandeau « Vos préférences de cookies » (lien « Gérer mes cookies » ci-dessous).", [["Cookies essentiels", "liste des cookies nécessaires au fonctionnement du site"], ["Mesure d'audience", "outil utilisé, le cas échéant, déposé seulement après votre accord"], ["Personnalisation et marketing", "outils utilisés, le cas échéant, déposés seulement après votre accord"]]);

  // ─── Espace client (planche 06) : compte fictif contrôlé, aucune vraie inscription, aucun e-mail. ──────────────
  const links = { recover_link: SOUPLE_PAGES.motDePasse, account_link: SOUPLE_PAGES.compte, order_link: SOUPLE_PAGES.commande, addresses_link: SOUPLE_PAGES.adresses, infos_link: SOUPLE_PAGES.infos, logout_link: SOUPLE_PAGES.connexion };
  const lines = [{ type: "line", settings: { product: SOUPLE_PRODUCTS[0].handle, quantity: 1 } }, { type: "line", settings: { product: SOUPLE_PRODUCTS[1].handle, quantity: 1 } }];
  const demo = "Démonstration : compte fictif, aucune donnée réelle.";
  const account = (handle: string, title: string, settings: Record<string, unknown>, blocks: { type: string; settings: Record<string, unknown> }[] = []) => page(handle, title, seo(title, `${title} : écran d'exemple de la boutique de démonstration.`), [["compte", S("demo-account", { ...links, demo_note: demo, interactive: true, demo_email: "demo@souple.example", demo_password: "demo", menu_label: "Mon compte", overview_label: "", orders_label: "Mes commandes", infos_label: "Mes informations personnelles", email_label: "Adresse e-mail", email_placeholder: "votre@email.com", quantity_label: "Qté :", price_note: "", subtotal_label: "Total", shipping_label: "Livraison", unknown_value: "À confirmer", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 56, ...settings }, blocks)]]);
  account("connexion", "Connexion", { ...k.img("ambiance-08.webp"), focus_x: 50, focus_y: 60, layout: "auth", heading: "Heureux\nde vous\nretrouver", text: p("Connectez-vous à votre compte pour retrouver vos commandes, vos adresses et bien plus encore."), login_title: "Se connecter", register_title: "Créer un compte", button_label: "Se connecter", secondary_label: "Créer mon compte", demo_hint: "Compte de démonstration :", unknown_login_text: "Ces identifiants ne correspondent pas au compte de démonstration.", sent_text: "Démonstration : aucun compte n'est créé et aucun e-mail n'est envoyé." });
  account("mot-de-passe-oublie", "Réinitialiser mon mot de passe", { ...k.img("23-colis-ouvert.webp"), focus_x: 40, focus_y: 50, layout: "recover", heading: "Réinitialiser\nmon mot de passe", text: p("Saisissez votre adresse e-mail pour recevoir un lien de réinitialisation."), button_label: "Envoyer le lien", button_link: "", secondary_label: "Retour à la connexion", secondary_link: SOUPLE_PAGES.connexion, sent_text: "Démonstration : aucun e-mail n'est envoyé. Sur une boutique en ligne, la plateforme envoie le lien." });
  account("mon-compte", "Mon compte", { ...k.img("ambiance-07.webp"), layout: "account", heading: "Mon compte", text: p("Bienvenue ! Retrouvez ici vos commandes, vos adresses et vos informations personnelles."), order_title: "Commande SOUPLE-0001 (exemple)", pill: "Statut de démonstration", empty_text: "" }, lines);
  account("commande-souple-0001", "Commande SOUPLE-0001", { layout: "order", subtotal_label: "Sous-total", heading: "Commande SOUPLE-0001", pill: "Statut de démonstration", text: p("Commande d'exemple : aucune commande ni aucun envoi réel."), notice_title: "Exemple.", back_label: "Mon compte", lines_title: "Récapitulatif", payment_title: "Paiement", tracking_title: "Exemple de suivi de livraison" }, [
    ...lines,
    { type: "track", settings: { label: "Commande confirmée", date_text: "Exemple", done: true } },
    { type: "track", settings: { label: "Préparation de votre colis", date_text: "Exemple", done: true } },
    { type: "track", settings: { label: "En transit", date_text: "", done: false } },
    { type: "track", settings: { label: "En cours de livraison", date_text: "", done: false } },
    { type: "track", settings: { label: "Livré", date_text: "", done: false } },
    { type: "card", settings: { style: "plain", icon: "file", title: "Facture", text: p("Sur une boutique en ligne, la facture est fournie par la plateforme. Aucun document fiscal n'est émis dans cette démonstration."), button_label: "Nous contacter", button_link: SOUPLE_PAGES.contact, image_asset: "" } },
  ]);
  account("mes-adresses", "Mes adresses", { layout: "addresses", heading: "Mes adresses", text: "", empty_text: "Aucune adresse enregistrée dans cette démonstration." });
  account("informations-personnelles", "Mes informations personnelles", { layout: "infos", heading: "Mes informations", text: "" });
}
