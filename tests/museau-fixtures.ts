/**
 * MUSEAU CLUB refait d'après les maquettes enrichies du 23 octobre (PR #167, docs/design/museau-club-reference-20261023) :
 * boutique spécialisée à quatre produits (harnais, laisse, collier, pochette à sacs), chacun avec sa fiche enrichie.
 *
 * Même chaîne que les autres démonstrations : un projet client (marque, produits, médias avec rôles) composé par le VRAI
 * moteur dans son thème du catalogue (composeShop), puis rédigé section par section.
 *
 * Photos : les 31 originaux du kit (logo, cinq vues par produit, dix ambiances), copies identiques à
 * public/theme-assets/museau-club/. Les scènes de chiens propres aux nouvelles planches (golden aux arches blanches, bord
 * de mer, parc, plage, forêt, coucher de soleil, berger australien…) n'existent pas en fichier séparé : chaque section
 * utilise la photo du kit la plus proche, et la matrice du rapport (docs/coordination/MUSEAU_CLUB_RESULTATS.md) dit, pour
 * chacune, ce qui manque. Aucune image générée, aucune extraction agrandie des planches.
 *
 * Textes : accroches et hiérarchie des maquettes ; les affirmations non vérifiées des images (confort, résistance,
 * « convient à tous les chiens », délais, mesures…) sont reformulées sur ce que montrent les photos. Prix de
 * démonstration (harnais 49 €, laisse 29 €, collier 25 €, pochette 15 €) annoncés comme tels ; tailles de démonstration
 * XS à L sur le harnais et le collier seulement, leurs mesures restent « à renseigner ». Aucun avis, aucune note.
 */
import { buildKitProject, p, type Brand, type Kit } from "./noctil-traverse-fixtures";
import { MUSEAU_MEDIA, MUSEAU_PRODUCTS } from "./museau-souple-fixtures";
import { sectionSchema, withDefaults, type StoreProduct, type SectionInstance } from "../src/lib/theme/spec";

export { MUSEAU_MEDIA, MUSEAU_PRODUCTS };
export const MUSEAU_PROVENANCE = "PR #167 (23 octobre 2026) — maquettes enrichies de Thomas, 31 originaux du kit (commit 0a870161), des chiens et aucune personne, aucun paiement";

/** Prix de démonstration (dossier du 23 octobre) en centimes, tailles de démonstration du harnais et du collier. */
export const MUSEAU_PRICES: Record<string, number> = { harnais: 4900, laisse: 2900, collier: 2500, pochette: 1500 };
export const MUSEAU_SIZES = ["XS", "S", "M", "L"];
const SIZED = new Set(["harnais", "collier"]);
const COLOR = "Bleu cobalt";

/** Mention des informations que la marque n'a pas encore données (formulation du dossier). */
const A_RENSEIGNER = (what: string) => `${what} : à renseigner.`;

const BRAND: Brand = {
  name: "MUSEAU CLUB", product: "Collection de balade MUSEAU CLUB", category: "Accessoires de balade pour chiens",
  summary: "Collection de balade pour chiens en bleu cobalt : un harnais, une laisse, un collier et une pochette à sacs assortis, avec maille crème, boucles noires, anneaux et mousquetons métalliques et étiquette MUSEAU CLUB.",
  facts: [["Collection", "harnais, laisse, collier et pochette à sacs assortis"], ["Couleurs", "bleu cobalt, maille crème, boucles noires, métal argenté"]],
  tagline: "Le bonheur est au bout de la laisse.", story: "MUSEAU CLUB imagine des accessoires de balade assortis, en bleu cobalt et maille crème, pour les sorties de tous les jours.", positioning: "Quatre essentiels assortis pour les sorties à deux : harnais, laisse, collier et pochette à sacs.",
  // Cobalt des boutons et du pied, crème des cartes, jaune doux des boutons d'appel, crème clair des fonds, bleu nuit des
  // titres (mesurés sur les planches 01 et 04).
  palette: { primary: "#0A30CC", secondary: "#F9F2E3", accent: "#FAEA72", light: "#FCFAF0", dark: "#05238F" },
};

export async function museauProject(userId: string) {
  return buildKitProject(userId, { id: "museau-club", media: MUSEAU_MEDIA, handle: MUSEAU_PRODUCTS[0].handle, brand: BRAND, themeName: "Museau Club", provenance: MUSEAU_PROVENANCE, storeKind: "specialty", sector: "animaux", storeType: "multi" }, curateMuseau);
}

/** Pages de la démonstration (liens du menu, du pied et des sections). */
export const MUSEAU_PAGES = {
  club: "/pages/le-club", journal: "/pages/journal", tailles: "/pages/guide-des-tailles", faq: "/pages/faq", contact: "/pages/contact",
  livraison: "/pages/livraison-retours", mentions: "/pages/mentions-legales", confidentialite: "/pages/confidentialite", cgv: "/pages/cgv",
  connexion: "/pages/connexion", compte: "/pages/mon-compte", commande: "/pages/commande-1001", inscription: "/pages/creer-un-compte",
  motDePasse: "/pages/mot-de-passe-oublie", adresses: "/pages/mes-adresses", infos: "/pages/informations-personnelles",
  paiement: "/pages/finaliser-ma-commande", confirmation: "/pages/confirmation-de-commande",
};
/** Articles du journal (pages réelles, gabarit d'article complet) : conseils généraux, aucun chiffre ni fait inventé. */
type Article = { handle: string; title: string; tag: string; image: string; excerpt: string; intro: string; body: [string, string, string?][] };
export const MUSEAU_ARTICLES: Article[] = [
  { handle: "les-petits-rituels-des-grandes-balades", title: "Les petits rituels des grandes balades", tag: "Balades", image: "ambiance-05.webp",
    excerpt: "Quelques idées simples pour transformer une sortie en vrai moment de complicité.",
    intro: "Il n'y a pas de grande aventure sans ces petits rituels qui transforment une simple sortie en moment de complicité. Voici quelques idées pour profiter encore plus de vos balades, au fil des saisons.",
    body: [
      ["Préparer les essentiels", "Avant de partir, un petit tour de vos indispensables : harnais ou collier, laisse, pochette et ses sachets. Des essentiels rangés au même endroit rendent chaque départ plus simple.", "ambiance-03.webp"],
      ["Prendre le temps", "Une balade, c'est aussi l'occasion de ralentir : observer, explorer, laisser le temps de sentir. Ces moments simples font partie du plaisir de sortir à deux."],
      ["Changer de décor", "Varier les lieux de balade permet de découvrir de nouveaux chemins : forêt, campagne, ville ou bord de mer, chaque sortie raconte une histoire différente.", "ambiance-07.webp"],
      ["Rentrer et ranger", "Au retour, un dernier rituel : raccrocher la laisse et la pochette au même endroit, pour qu'elles soient prêtes pour la prochaine sortie."],
    ] },
  { handle: "preparer-son-sac-pour-la-balade", title: "Préparer son sac pour la balade", tag: "Conseils", image: "ambiance-03.webp",
    excerpt: "Les indispensables à prévoir pour partir l'esprit léger, quelle que soit la durée de la sortie.",
    intro: "Partir l'esprit léger, c'est d'abord savoir ce qu'on emporte. Une petite liste suffit pour ne rien oublier, de la balade du matin à la sortie de la journée.",
    body: [
      ["Les accessoires de sortie", "Le harnais ou le collier, la laisse et la pochette à sacs : trois éléments assortis qui se retrouvent d'un coup d'œil avant de partir.", "ambiance-01.webp"],
      ["Les sachets à portée de main", "La pochette s'accroche à la laisse par son mousqueton : les sachets restent à portée de main pendant toute la balade."],
      ["De l'eau pour deux", "Pour une sortie plus longue, prévoyez de l'eau pour vous et pour votre chien, surtout quand il fait chaud.", "ambiance-06.webp"],
      ["Un rangement qui ne bouge pas", "Gardez tout au même endroit près de la porte : la prochaine sortie commence dès que la laisse est en main."],
    ] },
  { handle: "choisir-la-taille-de-son-harnais", title: "Choisir la taille de son harnais", tag: "Conseils", image: "harnais-05.webp",
    excerpt: "Deux mesures à prendre et un tableau à consulter pour choisir la bonne taille.",
    intro: "Le bon harnais commence par deux mesures simples. Voici comment les prendre et les comparer au guide des tailles.",
    body: [
      ["Mesurer le tour de poitrail", "Avec un mètre ruban souple, mesurez autour de la partie la plus large de la poitrine, juste derrière les pattes avant.", "harnais-02.webp"],
      ["Mesurer le tour de cou", "Mesurez la base du cou, là où le collier se place naturellement."],
      ["Comparer au guide", "Reportez vos deux mesures dans le guide des tailles : chaque taille y indique son tour de cou et son tour de poitrail (mesures à renseigner par la marque).", "harnais-04.webp"],
      ["Un doute entre deux tailles ?", "Comparez de nouveau vos mesures au tableau, puis écrivez-nous : nous vous aiderons à choisir."],
    ] },
  { handle: "des-idees-pour-changer-de-chemin", title: "Des idées pour changer de chemin", tag: "Balades", image: "ambiance-07.webp",
    excerpt: "Forêt, bord de mer, campagne ou ville : de quoi varier les plaisirs de la balade.",
    intro: "Le même trajet tous les jours, c'est rassurant ; un nouveau chemin de temps en temps, c'est une petite aventure. Quelques idées pour varier les sorties.",
    body: [
      ["Le parc d'à côté", "Un autre parc, une autre allée : il suffit parfois de tourner à gauche plutôt qu'à droite pour découvrir un nouveau terrain de jeu.", "ambiance-05.webp"],
      ["La campagne le week-end", "Les chemins de campagne offrent de l'espace et de nouvelles odeurs à explorer, à votre rythme."],
      ["Le bord de l'eau", "Lac, rivière ou bord de mer : renseignez-vous sur les règles d'accès aux chiens avant de partir.", "ambiance-10.webp"],
      ["La ville autrement", "Une balade en ville peut aussi devenir une découverte : une rue calme, une place, un nouveau quartier."],
    ] },
  { handle: "le-quotidien-en-bonne-compagnie", title: "Le quotidien, en bonne compagnie", tag: "Le club", image: "ambiance-04.webp",
    excerpt: "Ces petits moments simples qui rendent la vie plus belle, une sortie après l'autre.",
    intro: "Le matin avant le travail, le soir au retour : les balades du quotidien sont souvent les plus précieuses. Petit éloge des sorties de tous les jours.",
    body: [
      ["Le rendez-vous du matin", "Une première sortie pour bien commencer la journée, ensemble, avant que tout s'accélère.", "ambiance-02.webp"],
      ["La pause de midi", "Quand c'est possible, une courte sortie au milieu de la journée fait du bien à tous les deux."],
      ["La balade du soir", "Le soir, on prend le temps : un tour un peu plus long, pour se retrouver.", "ambiance-09.webp"],
      ["Des essentiels toujours prêts", "Des accessoires assortis, rangés au même endroit : la sortie peut commencer à tout moment."],
    ] },
];

/** Questions de la page FAQ, par thème (pastilles) : rien d'universel, de délai, de mesure ni de garantie inventés. */
export const MUSEAU_FAQ: [string, string, string][] = [
  ["Comment bien choisir la taille de mon harnais ?", "Mesurez le tour de cou et le tour de poitrail de votre chien, puis comparez-les au guide des tailles. En cas de doute entre deux tailles, écrivez-nous.", "Produits"],
  ["Le harnais est-il réglable ?", A_RENSEIGNER("Les possibilités de réglage du harnais"), "Produits"],
  ["Le collier convient-il à tous les chiens ?", "Cela dépend de son tour de cou : comparez-le au guide des tailles. Les mesures de chaque taille sont à renseigner dans cette démonstration.", "Produits"],
  ["La laisse est-elle adaptée aux promenades en ville ?", "Elle s'accroche au collier comme au harnais par son mousqueton métallique. Longueur et largeur : à renseigner.", "Produits"],
  ["La pochette peut-elle contenir plusieurs rouleaux de sacs ?", A_RENSEIGNER("La contenance de la pochette"), "Produits"],
  ["Comment entretenir les accessoires ?", A_RENSEIGNER("Les conseils d'entretien de chaque accessoire"), "Produits"],
  ["Comment suivre ma commande ?", "Les informations de suivi vous sont envoyées par e-mail. Modalités de suivi : à renseigner.", "Commande"],
  ["Puis-je modifier ma commande ?", A_RENSEIGNER("Les conditions de modification d'une commande"), "Commande"],
  ["Quels moyens de paiement acceptez-vous ?", A_RENSEIGNER("Les moyens de paiement acceptés"), "Commande"],
  ["Quels sont les délais de livraison ?", "Les délais sont indiqués lors de la validation du panier. Délais de la boutique : à renseigner.", "Livraison"],
  ["Combien coûte la livraison ?", "Les frais de livraison sont calculés à l'étape suivante de la commande. Tarifs : à renseigner.", "Livraison"],
  ["Comment retourner un article ?", "Les conditions de retour sont réunies sur la page Livraison et retours (à renseigner).", "Livraison"],
];

/** Questions de l'accueil : la taille renvoie au guide ; rien d'universel, de délai ni de mesure inventés. */
export const MUSEAU_HOME_FAQ: [string, string][] = [
  ["Comment choisir la bonne taille ?", "Chaque chien est unique. Mesurez son tour de cou et son tour de poitrail, puis comparez-les au guide des tailles de la fiche produit."],
  ["Les accessoires conviennent-ils à tous les chiens ?", "Cela dépend de ses mesures : comparez-les au guide des tailles. Les mesures de chaque taille sont à renseigner dans cette démonstration."],
  ["Comment entretenir les accessoires ?", A_RENSEIGNER("Les conseils d'entretien de chaque accessoire")],
  ["Quels sont les délais de livraison ?", "Les délais et les frais de livraison sont indiqués à l'étape suivante de la commande. Zones et délais : à renseigner sur la page Livraison et retours."],
];

/** Fiche enrichie de chaque produit (planches 02 et 03). */
type Fiche = {
  heading: string; intro: string; text?: string; tiles?: [string, string, number, number, number][]; description: string; seo: { title: string; description: string };
  scene: { heading: string; text: string; image: string; fx?: number; fy?: number; zoom?: number; layout?: string; button?: string };
  details: { heading: string; text: string; image?: string; zoom?: number; fx?: number; fy?: number; items?: [string, string, number?][] };
  situation: { heading: string; cards: [string, string][] };
  extra?: "guide" | "trio" | "place";
  extraGuide?: { heading: string; text: string; bubble?: string };
  place?: { heading: string; text: string; image: string };
  accordions: [string, string][];
  /** Rangée « Complétez… » ; vide sur la laisse, où le trio sur photo la remplace (planche 02). */
  more: string; faq: [string, string][];
  final: { heading: string; image: string; layout?: string; fx?: number; fy?: number; zoom?: number; buy: boolean; button: string };
};
const DELIVERY = "Frais et délais calculés à l'étape suivante de la commande. Conditions de retour à renseigner : elles seront réunies sur la page Livraison et retours.";
const FICHES: Record<string, Fiche> = {
  harnais: {
    heading: "Le harnais", intro: "Pour chaque sortie, tout en style.",
    tiles: [["harnais-03.webp", "Doublure crème en maille", 100, 50, 50], ["harnais-04.webp", "Boucle noire à clip", 100, 50, 50], ["harnais-02.webp", "Sangles bleu cobalt", 170, 30, 70], ["harnais-01.webp", "Anneau métallique pour la laisse", 260, 52, 14]],
    description: p("Un harnais bleu cobalt doublé de maille crème, fermé par deux boucles noires à clip, avec un anneau métallique sur le dessus pour la laisse.") + p(A_RENSEIGNER("Matières, poids et mesures de chaque taille")),
    seo: { title: "Le harnais MUSEAU CLUB, bleu cobalt et maille crème", description: "Harnais bleu cobalt doublé de maille crème, boucles noires à clip, anneau métallique pour la laisse. Prix de démonstration, boutique de démonstration." },
    scene: { heading: "Le signal de sa\nprochaine aventure.", text: "Un harnais bleu cobalt et crème pour explorer le monde ensemble, jour après jour.", image: "ambiance-02.webp", fx: 62, fy: 40, button: "Voir la galerie" },
    details: { heading: "Des détails bien pensés,\npour son bien-être.", text: "Une doublure en maille crème, des sangles bleu cobalt et des boucles noires à clip : des détails pensés pour les sorties de tous les jours.", image: "harnais-03.webp", zoom: 120 },
    situation: { heading: "En situation, tout simplement.", cards: [["ambiance-05.webp", "Un design épuré"], ["harnais-04.webp", "Des boucles à clip"], ["ambiance-09.webp", "Prêt pour de nouvelles aventures"]] },
    extra: "guide", extraGuide: { heading: "Guide des tailles.", text: "Mesurez le tour de poitrail de votre chien, puis comparez-le aux mesures du guide." },
    accordions: [["Détails", "Un harnais bleu cobalt doublé de maille crème, avec deux boucles noires à clip et un anneau métallique pour la laisse. Matières, poids et mesures : à renseigner."], ["Entretien", A_RENSEIGNER("Les conseils d'entretien du harnais")], ["Livraison et retours", DELIVERY]],
    more: "Complétez la balade.",
    faq: [["Comment choisir la taille du harnais ?", "Mesurez le tour de poitrail de votre chien et consultez notre guide des tailles pour trouver la taille adaptée."], ["Le harnais convient-il à tous les chiens ?", "Cela dépend de ses mesures : comparez-les au guide des tailles. Les mesures de chaque taille sont à renseigner dans cette démonstration."], ["Comment l'entretenir ?", A_RENSEIGNER("Les conseils d'entretien du harnais")]],
    final: { heading: "Prêt pour\nla prochaine aventure ?", image: "ambiance-09.webp", layout: "panel-left", fx: 50, fy: 34, zoom: 100, buy: true, button: "Choisir ma taille" },
  },
  laisse: {
    heading: "La laisse", intro: "Toujours plus loin, ensemble.",
    tiles: [["laisse-02.webp", "Sangle bleu cobalt", 160, 50, 40], ["laisse-04.webp", "Poignée doublée de maille", 100, 50, 50], ["laisse-03.webp", "Mousqueton métallique", 100, 50, 50], ["laisse-01.webp", "Coutures et étiquette", 230, 66, 34]],
    description: p("Une laisse bleu cobalt avec une poignée doublée de maille crème et un mousqueton métallique, qui s'accroche au collier comme au harnais.") + p(A_RENSEIGNER("Longueur, largeur et matières")),
    seo: { title: "La laisse MUSEAU CLUB, bleu cobalt", description: "Laisse bleu cobalt, poignée doublée de maille crème, mousqueton métallique : elle s'accroche au collier comme au harnais. Prix de démonstration." },
    scene: { heading: "Le lien de vos\nplus belles sorties.", text: "Une laisse bleu cobalt pour partager de beaux moments, du quotidien aux grandes escapades.", image: "ambiance-07.webp", fx: 50, fy: 55, button: "Voir la galerie" },
    details: { heading: "Une laisse pensée\npour le quotidien.", text: "Une sangle bleu cobalt, une poignée doublée de maille crème et un mousqueton métallique : l'essentiel pour chaque sortie.", image: "laisse-04.webp", zoom: 125, fx: 40, fy: 45 },
    situation: { heading: "En situation, naturellement.", cards: [["laisse-02.webp", "Toujours à portée de main"], ["laisse-03.webp", "Un mousqueton pratique"], ["ambiance-05.webp", "Partout avec vous"]] },
    extra: "trio",
    accordions: [["Détails", "Une laisse bleu cobalt avec une poignée doublée de maille crème et un mousqueton métallique, qui s'accroche au collier ou au harnais. Longueur, largeur et matières : à renseigner."], ["Entretien", A_RENSEIGNER("Les conseils d'entretien de la laisse")], ["Livraison et retours", DELIVERY]],
    more: "",
    faq: [["La laisse convient-elle à tous les chiens ?", "Son mousqueton s'accroche à l'anneau d'un collier ou d'un harnais. Longueur et largeur de la laisse : à renseigner dans cette démonstration."], ["Comment l'entretenir ?", A_RENSEIGNER("Les conseils d'entretien de la laisse")], ["Peut-on l'utiliser avec le harnais et le collier ?", "Oui : son mousqueton s'accroche à l'anneau du harnais comme à celui du collier."]],
    final: { heading: "Toujours plus loin,\nensemble.", image: "ambiance-02.webp", fx: 70, fy: 35, zoom: 100, buy: true, button: "Ajouter au panier" },
  },
  collier: {
    heading: "Le collier", intro: "L'essentiel, tout simplement.",
    text: "Un collier bleu cobalt doublé de maille crème, avec une boucle noire et un anneau métallique. Pour le quotidien comme pour les grandes escapades.",
    description: p("Un collier bleu cobalt doublé de maille crème côté cou, fermé par une boucle noire à clip, avec un anneau métallique pour la laisse et l'étiquette MUSEAU CLUB.") + p(A_RENSEIGNER("Matières et mesures de chaque taille")),
    seo: { title: "Le collier MUSEAU CLUB, bleu cobalt et maille crème", description: "Collier bleu cobalt doublé de maille crème, boucle noire à clip, anneau métallique. Prix de démonstration, boutique de démonstration." },
    scene: { heading: "Son petit\nsigne distinctif.", text: "Un collier qui l'accompagne partout, avec style, dans tous les moments qui comptent.", image: "ambiance-04.webp", fx: 50, fy: 34, layout: "panel-left" },
    details: { heading: "Des détails qui\nfont la différence.", text: "Une boucle noire à clip, un anneau métallique et une doublure en maille crème côté cou.", items: [["collier-02.webp", "Boucle noire à clip"], ["collier-03.webp", "Anneau métallique"], ["collier-04.webp", "Doublure en maille crème"]] },
    situation: { heading: "En images.", cards: [["collier-05.webp", "Un design intemporel."], ["collier-01.webp", "Des finitions soignées."], ["ambiance-07.webp", "Toujours à ses côtés."]] },
    extra: "guide", extraGuide: { heading: "Guide des tailles.", text: "Mesurez le tour de cou de votre chien, puis comparez-le aux mesures du guide.", bubble: "Mesurez le tour de cou de votre chien à l'endroit indiqué." },
    accordions: [["Détails", "Un collier bleu cobalt doublé de maille crème, avec une boucle noire à clip et un anneau métallique. Matières et mesures : à renseigner."], ["Entretien", A_RENSEIGNER("Les conseils d'entretien du collier")], ["Livraison et retours", DELIVERY]],
    more: "Complétez le look",
    faq: [["Comment choisir la bonne taille ?", "Mesurez le tour de cou de votre chien à l'endroit indiqué dans notre guide des tailles, puis comparez cette mesure à celles de chaque taille."], ["Le collier convient-il à tous les chiens ?", "Cela dépend de son tour de cou : comparez-le au guide des tailles. Les mesures de chaque taille sont à renseigner dans cette démonstration."], ["Comment entretenir le collier ?", A_RENSEIGNER("Les conseils d'entretien du collier")]],
    final: { heading: "De beaux moments\ntoujours à ses côtés.", image: "ambiance-10.webp", fx: 50, fy: 60, buy: false, button: "Découvrir la collection" },
  },
  pochette: {
    heading: "La pochette", intro: "Petit format, grande praticité.",
    text: "Une pochette bleu cobalt qui s'accroche à la laisse par son mousqueton, pour garder les sacs à portée de main pendant la balade.",
    description: p("Une pochette bleu cobalt fermée par un zip bordé de crème, avec un mousqueton métallique pour l'accrocher à la laisse et une ouverture ronde en façade pour sortir un sac.") + p(A_RENSEIGNER("Dimensions et format des rouleaux compatibles")),
    seo: { title: "La pochette à sacs MUSEAU CLUB, bleu cobalt", description: "Pochette à sacs bleu cobalt : zip bordé de crème, mousqueton pour l'accrocher à la laisse, ouverture ronde pour les sacs. Prix de démonstration." },
    scene: { heading: "Le petit essentiel\nqu'on n'oublie plus.", text: "Toujours à portée de laisse, pour des balades plus simples.", image: "ambiance-03.webp", fx: 50, fy: 55 },
    details: { heading: "Des détails bien pensés.", text: "Une fermeture zippée, un mousqueton métallique pour l'accrocher à la laisse et une sortie ronde pour les sachets.", items: [["pochette-03.webp", "Fermeture zippée"], ["pochette-04.webp", "Mousqueton pour l'attacher à la laisse"], ["pochette-05.webp", "Sortie ronde pour les sachets"]] },
    situation: { heading: "En images.", cards: [["pochette-02.webp", "Toujours avec vous."], ["ambiance-06.webp", "Un accès simple."], ["ambiance-08.webp", "À clipser sur la laisse."]] },
    extra: "place", place: { heading: "À sa place,\navant chaque départ.", text: "Elle s'accroche à la laisse et vous accompagne partout. Elle garde vos sachets à portée de main et rejoint l'ensemble de la collection.", image: "ambiance-10.webp" },
    accordions: [["Détails", "Une pochette bleu cobalt, fermée par un zip bordé de crème, avec un mousqueton métallique et une sortie ronde pour les sachets. Dimensions : à renseigner."], ["Entretien", A_RENSEIGNER("Les conseils d'entretien de la pochette")], ["Livraison et retours", DELIVERY]],
    more: "Complétez le look",
    faq: [["Comment utiliser la pochette ?", "Elle s'accroche à la laisse grâce à son mousqueton métallique. Un sachet sort par l'ouverture ronde de la façade."], ["Quels types de sachets sont compatibles ?", A_RENSEIGNER("Le format des rouleaux de sachets compatibles")], ["Comment entretenir la pochette ?", A_RENSEIGNER("Les conseils d'entretien de la pochette")]],
    final: { heading: "Toujours prête\npour la prochaine aventure.", image: "ambiance-05.webp", fx: 50, fy: 50, buy: false, button: "Découvrir la collection" },
  },
};
const SHORT: Record<string, string> = { harnais: "Harnais", laisse: "Laisse", collier: "Collier", pochette: "Pochette" };
/** Type de chaque produit (pastilles de filtre de la boutique, planche 04). */
const TYPE: Record<string, string> = { harnais: "Harnais", laisse: "Laisses", collier: "Colliers", pochette: "Pochettes" };

function curateMuseau(k: Kit) {
  const { spec, img, section, overlay } = k;
  const items = MUSEAU_PRODUCTS;
  const href = (key: string) => `/products/${items.find((x) => x.key === key)!.handle}`;
  const faqRows = (rows: [string, string][]) => rows.map(([question, answer]) => ({ type: "question", settings: { question, answer: p(answer) } }));
  k.demoMeta();
  spec.store.seo = { title: "MUSEAU CLUB | Le bonheur est au bout de la laisse", description: "Harnais, laisse, collier et pochette à sacs assortis, en bleu cobalt et maille crème : les essentiels de vos sorties à deux. Boutique et prix de démonstration." };

  // ─── Quatre produits, quatre fiches : prix de démonstration, couleur unique, tailles sur le harnais et le collier. ─────
  const baseKey = k.productKey();
  const base = structuredClone(spec.templates[baseKey]);
  const products: StoreProduct[] = items.map((it, i) => {
    const f = FICHES[it.key];
    const suffix = i === 0 ? spec.store.product.template_suffix ?? "" : `museau_${it.key}`;
    if (i > 0) spec.templates[`product.${suffix}`] = structuredClone(base);
    const price = MUSEAU_PRICES[it.key];
    const sized = SIZED.has(it.key);
    return {
      ...spec.store.product, contentTarget: `product:${it.key}`, handle: it.handle, title: SHORT[it.key], vendor: "MUSEAU CLUB", template_suffix: suffix,
      price, compare_at_price: null, currency: "EUR", options: sized ? ["Couleur", "Taille"] : ["Couleur"],
      variants: sized ? MUSEAU_SIZES.map((size) => ({ title: `${COLOR} / ${size}`, options: [COLOR, size], price, available: true })) : [{ title: COLOR, options: [COLOR], price, available: true }],
      description_html: f.description, images: it.views.map(k.name), tags: [TYPE[it.key], "bleu cobalt"], seo: f.seo,
    };
  });
  spec.store.product = products[0];
  spec.store.products = products.slice(1);
  spec.store.collections = [{ handle: "all", title: "La collection promenade.", description: "Quatre essentiels pour profiter de chaque sortie, avec style et complicité.", products: products.map((x) => x.handle) }];
  const keyOf = (pr: StoreProduct) => (pr.template_suffix ? `product.${pr.template_suffix}` : "product");
  const mpSchema = sectionSchema(spec, "main-product")!;
  const block = (type: string, settings: Record<string, unknown>) => ({ type, settings: withDefaults(mpSchema.blocks.find((b) => b.type === type)?.settings, settings) });
  products.forEach((pr, i) => {
    const it = items[i], f = FICHES[it.key], key = keyOf(pr);
    const t = spec.templates[key];
    const mp = t.sections[t.order.find((sid) => t.sections[sid].type === "main-product")!];
    const tiles = f.tiles ? Object.fromEntries(f.tiles.flatMap(([file, caption, zoom, fx, fy], n) => [[`image_${n + 1}`, k.name(file)], [`caption_${n + 1}`, caption], [`zoom_${n + 1}`, zoom], [`focus_x_${n + 1}`, fx], [`focus_y_${n + 1}`, fy]])) : {};
    const blocks: [string, { type: string; settings: Record<string, unknown>; disabled?: boolean }][] = [
      ["title", block("title", {})],
      ...(f.text ? [["text", block("text", { text: p(f.text) })] as [string, { type: string; settings: Record<string, unknown> }]] : []),
      ["price", block("price", { label: "Prix de démonstration", show_taxes: false })],
      ["buy", block("buy_buttons", { picker: "buttons", show_quantity: true, show_dynamic_checkout: false, price_in_button: false, swatch_color: "#0A30CC", quantity_label: "Quantité", guide_label: SIZED.has(it.key) ? "Guide des tailles" : "", guide_link: SIZED.has(it.key) ? MUSEAU_PAGES.tailles : "" })],
      ...(f.tiles ? [["tiles", block("tiles", { ...tiles, shape: "circle" })] as [string, { type: string; settings: Record<string, unknown> }]] : []),
    ];
    mp.settings = { ...mp.settings, product_target: pr.contentTarget, purchase_enabled: false, gallery_layout: "thumbs-below", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, show_breadcrumb: true, tiles_under_gallery: true, display_heading: f.heading, display_intro: f.intro, color_scheme: "scheme-1", padding_top: 8, padding_bottom: 32 };
    mp.blocks = Object.fromEntries(blocks);
    mp.block_order = blocks.map(([b]) => b);
  });
  // Cartes produit : mention « Prix de démonstration » et flèche ronde vers la fiche ; prix ronds sans « ,00 ».
  spec.settings = { ...spec.settings, card_price_note: "Prix de démonstration", card_arrow: true, price_trim_zeros: true };

  const productBlocks = (keys: string[]) => keys.map((key) => ({ type: "product", settings: { product: items.find((x) => x.key === key)!.handle, note: "" } }));
  const journalBlocks = (n: number) => MUSEAU_ARTICLES.slice(0, n).map((a) => ({ type: "article", settings: { ...img(a.image), title: a.title, text: "", tag: a.tag, date_text: "", link: `/pages/${a.handle}` } }));

  // ─── Accueil enrichi (planche 01), onze blocs dans l'ordre de la maquette. ─────────────────────────────────────────
  overlay("index", [
    section("cv-banner", { ...img("ambiance-02.webp"), layout: "spotlight", band_height: "hero", veil: "light", mobile_valign: "bottom", image_loading: "eager", focus_x: 66, focus_y: 40, mobile_focus_x: 74, mobile_focus_y: 12, heading: "LE BONHEUR\nEST AU BOUT\nDE LA LAISSE.", heading_tag: "h1", heading_accent: "", eyebrow: "", text: p("Les essentiels de vos sorties à deux."), price_text: "", price_note: "", button_label: "On sort ?", button_link: "/collections/all", button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0 }),
    section("fs-products", { layout: "grid", source: "manual", eyebrow: "", heading: "", heading_accent: "", text: "", button_label: "", button_link: "", ratio: "square", columns: 4, limit: 4, align: "left", show_secondary: false, effect: "fade", color_scheme: "scheme-1", padding_top: 0, padding_bottom: 8 }, productBlocks(["harnais", "laisse", "collier", "pochette"])),
    section("cv-banner", { ...img("ambiance-09.webp"), layout: "panel-left", focus_x: 50, focus_y: 22, mobile_focus_x: 50, mobile_focus_y: 20, heading: "Il attend ce moment\ntoute la journée.", heading_tag: "h2", heading_accent: "", eyebrow: "", text: p("Des accessoires pensés pour toutes vos aventures, du quotidien aux grands horizons."), price_text: "", price_note: "", button_label: "Voir la collection", button_link: "/collections/all", button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-3", padding_top: 0, padding_bottom: 0 }),
    section("cv-feature", { ...img("harnais-01.webp"), layout: "numbered", detail_shape: "circle", detail_numbers: true, image_zoom: 165, focus_x: 40, focus_y: 58, eyebrow: "Le harnais", heading: "De près, tout se joue\ndans les détails.", heading_accent: "", text: p("Une maille crème, des boucles noires et un anneau métallique : des détails à voir de près, pour les sorties de tous les jours."), button_label: "Découvrir le harnais", button_link: href("harnais"), button_arrow: true, guarantee_text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 40, padding_bottom: 40 }, [
      { type: "detail", settings: { ...img("harnais-03.webp"), caption: "Doublure crème en maille" } },
      { type: "detail", settings: { ...img("harnais-04.webp"), caption: "Boucle noire à clip" } },
      { type: "detail", settings: { ...img("harnais-01.webp"), image_zoom: 260, focus_x: 52, focus_y: 14, caption: "Anneau métallique pour la laisse" } },
    ]),
    section("fs-products", { ...img("ambiance-01.webp"), layout: "media", source: "manual", focus_x: 50, focus_y: 50, eyebrow: "", heading: "Quatre essentiels.\nUne même allure.", heading_accent: "", text: p("Des accessoires qui se complètent pour un style harmonieux, à chaque sortie."), button_label: "", button_link: "", ratio: "square", limit: 3, align: "left", show_secondary: false, effect: "fade", color_scheme: "scheme-3", padding_top: 0, padding_bottom: 0 }, productBlocks(["harnais", "collier", "pochette"])),
    section("cv-cards", { layout: "pills", heading: "Le petit tour devient\nune aventure.", heading_accent: "", text: p("Parc, bord de mer ou sentiers en forêt… Peu importe la destination, l'essentiel est d'être ensemble."), animation: "fade", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 32 }, [
      { type: "card", settings: { ...img("ambiance-07.webp"), focus_x: 50, focus_y: 50, title: "Au parc", text: "", link: `/pages/${MUSEAU_ARTICLES[3].handle}`, link_label: "" } },
      { type: "card", settings: { ...img("ambiance-05.webp"), focus_x: 50, focus_y: 50, title: "Dans l'herbe", text: "", link: `/pages/${MUSEAU_ARTICLES[0].handle}`, link_label: "" } },
      { type: "card", settings: { ...img("ambiance-03.webp"), focus_x: 50, focus_y: 55, title: "Avant de partir", text: "", link: `/pages/${MUSEAU_ARTICLES[1].handle}`, link_label: "" } },
    ]),
    section("cv-banner", { layout: "illustration", heading: "La bonne taille,\npour son prochain départ.", heading_tag: "h2", heading_accent: "", eyebrow: "", text: p("Mesurez son tour de cou et son tour de poitrail, puis comparez-les aux mesures du guide."), illus_label_1: "Tour de cou", illus_label_2: "Tour de poitrail", illus_note: "", price_text: "", price_note: "", button_label: "Voir le guide des tailles", button_link: MUSEAU_PAGES.tailles, button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-3", padding_top: 0, padding_bottom: 0 }),
    section("cv-banner", { ...img("ambiance-04.webp"), layout: "panel-right", focus_x: 50, focus_y: 40, mobile_focus_x: 50, mobile_focus_y: 35, heading: "Un club pour les\namoureux des balades.", heading_tag: "h2", heading_accent: "", eyebrow: "", text: p("MUSEAU CLUB imagine des accessoires de balade assortis, pour les sorties de tous les jours. Des essentiels qui célèbrent la complicité et le plaisir d'explorer le monde ensemble."), price_text: "", price_note: "", button_label: "Notre histoire", button_link: MUSEAU_PAGES.club, button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0 }),
    section("fs-journal", { layout: "row", eyebrow: "", heading: "Nos derniers articles", heading_accent: "", text: "", align: "left", button_label: "Voir tous les articles", button_link: MUSEAU_PAGES.journal, limit: 3, show_date: false, show_excerpt: false, link_label: "Lire l'article", effect: "fade", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 24 }, journalBlocks(3)),
    section("faq", { ...img("ambiance-08.webp"), focus_x: 50, focus_y: 50, eyebrow: "", heading: "Vos questions,\nnos réponses.", text: "", style: "lines", layout: "side", columns: "1", open_first: true, search: false, contact_text: "", button_label: "", button_link: "", structured_data: false, color_scheme: "scheme-1", padding_top: 24, padding_bottom: 32 }, faqRows(MUSEAU_HOME_FAQ)),
    section("newsletter-media", { ...img("ambiance-10.webp"), layout: "background", overlay: 30, eyebrow: "", heading: "Sa laisse est prête.\nEt vous ?", text: p("Des idées de balades, des conseils et nos nouveautés, directement dans votre boîte mail."), perk_1: "", perk_2: "", perk_3: "", button_label: "S'inscrire", consent_checkbox: false, legal: "", color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0 }),
  ]);

  // ─── Quatre fiches enrichies (planches 02 et 03). ────────────────────────────────────────────────────────────────
  products.forEach((pr, i) => {
    const it = items[i], f = FICHES[it.key];
    const others = items.filter((o) => o.key !== it.key).map((o) => o.key);
    const sized = SIZED.has(it.key);
    const rows: SectionInstance[] = [
      section("cv-banner", { ...img(f.scene.image), layout: f.scene.layout ?? "panel-right", veil: f.scene.layout === "background" ? "light" : "none", band_height: f.scene.layout === "background" ? "medium" : "auto", focus_x: f.scene.fx ?? 50, focus_y: f.scene.fy ?? 50, mobile_focus_x: f.scene.fx ?? 50, mobile_focus_y: f.scene.fy ?? 50, image_zoom: f.scene.zoom ?? 100, heading: f.scene.heading, heading_tag: "h2", heading_accent: "", eyebrow: "", text: p(f.scene.text), price_text: "", price_note: "", button_label: f.scene.button ?? "", button_link: "#acheter", button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-3", padding_top: 0, padding_bottom: 0 }),
      f.details.items
        ? section("cv-feature", { layout: "numbered", detail_shape: "square", detail_numbers: false, image_asset: "", image_alt: "", heading: f.details.heading, heading_accent: "", eyebrow: "", text: p(f.details.text), button_label: "", button_link: "", guarantee_text: "", animation: "fade", color_scheme: "scheme-3", padding_top: 32, padding_bottom: 32 }, f.details.items.map(([file, caption, zoom]) => ({ type: "detail", settings: { ...img(file), caption, image_zoom: zoom ?? 100 } })))
        : section("cv-banner", { ...img(f.details.image!), layout: "panel-right", focus_x: f.details.fx ?? 50, focus_y: f.details.fy ?? 50, mobile_focus_x: f.details.fx ?? 50, mobile_focus_y: f.details.fy ?? 50, image_zoom: f.details.zoom ?? 100, heading: f.details.heading, heading_tag: "h2", heading_accent: "", eyebrow: "", text: p(f.details.text), price_text: "", price_note: "", button_label: "", button_link: "", note: "", animation: "fade", color_scheme: "scheme-3", padding_top: 0, padding_bottom: 0 }),
      section("cv-cards", { layout: "columns", numbered: f.situation.heading.startsWith("En situation"), heading: f.situation.heading, heading_accent: "", text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 24 }, f.situation.cards.map(([file, title]) => ({ type: "card", settings: { ...img(file), title, text: "", link: "", link_label: "" } }))),
      ...(f.extra === "guide" ? [section("cv-banner", { layout: "illustration", heading: f.extraGuide!.heading, heading_tag: "h2", heading_accent: "", eyebrow: "", text: p(f.extraGuide!.text), illus_label_1: it.key === "collier" ? "Tour de cou" : "", illus_label_2: it.key === "harnais" ? "Tour de poitrail" : "", illus_note: f.extraGuide!.bubble ?? "", price_text: "", price_note: "", button_label: "Voir le guide des tailles", button_link: MUSEAU_PAGES.tailles, button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-3", padding_top: 0, padding_bottom: 0 })] : []),
      ...(f.extra === "trio" ? [section("fs-products", { ...img("ambiance-01.webp"), layout: "over-photo", source: "manual", focus_x: 50, focus_y: 72, eyebrow: "", heading: "Les essentiels, réunis avant de partir.", heading_accent: "", text: p("Le trio assorti pour des sorties tout en style."), button_label: "", button_link: "", ratio: "square", limit: 3, align: "left", show_secondary: false, exclude_current: true, effect: "fade", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 24 }, productBlocks(["harnais", "collier", "pochette"]))] : []),
      ...(f.extra === "place" ? [section("cv-banner", { ...img(f.place!.image), layout: "panel-left", focus_x: 50, focus_y: 55, heading: f.place!.heading, heading_tag: "h2", heading_accent: "", eyebrow: "", text: p(f.place!.text), price_text: "", price_note: "", button_label: "", button_link: "", note: "", animation: "fade", color_scheme: "scheme-3", padding_top: 0, padding_bottom: 0 })] : []),
      section("faq", { eyebrow: "", heading: "", text: "", style: "lines", layout: "stacked", columns: "1", open_first: true, search: false, contact_text: "", button_label: "", button_link: "", structured_data: false, color_scheme: "scheme-1", padding_top: 16, padding_bottom: 16 }, faqRows(f.accordions)),
      ...(f.more ? [section("fs-products", { layout: "grid", source: "manual", eyebrow: "", heading: f.more, heading_accent: "", text: "", button_label: "", button_link: "", ratio: "square", columns: 3, limit: 4, align: "left", show_secondary: false, exclude_current: true, effect: "fade", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 24 }, productBlocks(others))] : []),
      section("faq", { eyebrow: "", heading: f.heading === "Le collier" || f.heading === "La pochette" ? "Questions fréquentes." : "Vos questions, nos réponses.", text: "", style: "cards", layout: "stacked", columns: "1", open_first: true, search: false, contact_text: "", button_label: "", button_link: "", structured_data: false, color_scheme: f.heading === "Le collier" || f.heading === "La pochette" ? "scheme-3" : "scheme-1", padding_top: 24, padding_bottom: 32 }, faqRows(f.faq)),
      section("cv-banner", { ...img(f.final.image), layout: f.final.layout ?? "background", band_height: "medium", veil: f.final.layout ? "none" : f.final.buy ? "light" : "light-right", focus_x: f.final.fx ?? 50, focus_y: f.final.fy ?? 50, mobile_focus_x: f.final.fx ?? 50, mobile_focus_y: f.final.fy ?? 50, image_zoom: f.final.zoom ?? 100, heading: f.final.heading, heading_tag: "h2", heading_accent: "", eyebrow: "", text: f.final.buy ? "" : p("Des essentiels pensés pour toutes ses balades, du quotidien aux grands horizons."), price_text: "", price_note: "", buy_product: f.final.buy ? it.handle : "", size_label: sized ? "Choisir ma taille" : "", button_label: f.final.button, button_link: "/collections/all", button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0 }),
    ];
    // Chaque fiche suit exactement sa planche : les sections de la composition de référence qu'elle n'utilise pas
    // (bandeau du guide sur la laisse, recommandations…) sont retirées au lieu de rester affichées en fin de page.
    for (const r of rows) r.settings.__museau = true;
    overlay(keyOf(pr), rows);
    const t = spec.templates[keyOf(pr)];
    const at = t.order.findIndex((sid) => t.sections[sid].type === "main-product");
    t.order = t.order.filter((sid, j) => {
      if (j <= at) return true;
      if (t.sections[sid].settings.__museau) { delete t.sections[sid].settings.__museau; return true; }
      delete t.sections[sid];
      return false;
    });
  });

  // ─── Menus, en-tête (logo à gauche, menu, recherche, compte, panier), pied bleu cobalt. ──────────────────────────
  const shopLinks = items.map((it) => ({ title: SHORT[it.key] + (it.key === "pochette" ? "s" : it.key === "harnais" ? "" : "s"), url: `/products/${it.handle}` }));
  spec.store.menus["main-menu"] = { title: "Navigation", links: [
    { title: "Boutique", url: "/collections/all" },
    { title: "Le club", url: MUSEAU_PAGES.club },
    { title: "Journal", url: MUSEAU_PAGES.journal },
    { title: "Aide", url: MUSEAU_PAGES.faq },
  ] };
  spec.store.menus.footer = { title: "Boutique", links: shopLinks };
  spec.store.menus["footer-club"] = { title: "Le club", links: [{ title: "Notre histoire", url: MUSEAU_PAGES.club }, { title: "Journal", url: MUSEAU_PAGES.journal }, { title: "Nous contacter", url: MUSEAU_PAGES.contact }] };
  spec.store.menus["footer-aide"] = { title: "Aide", links: [{ title: "Suivi de commande", url: MUSEAU_PAGES.connexion }, { title: "Guide des tailles", url: MUSEAU_PAGES.tailles }, { title: "Livraison et retours", url: MUSEAU_PAGES.livraison }, { title: "FAQ", url: MUSEAU_PAGES.faq }, { title: "Nous contacter", url: MUSEAU_PAGES.contact }] };
  spec.store.menus.legal = { title: "Informations légales", links: [{ title: "Mentions légales", url: MUSEAU_PAGES.mentions }, { title: "Confidentialité", url: MUSEAU_PAGES.confidentialite }, { title: "CGV", url: MUSEAU_PAGES.cgv }, { title: "Cookies", url: "#cookies" }] };
  const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
  header.settings = { ...header.settings, menu: "main-menu", layout: "logo-left", shape: "bar", icons: "plain", mega_menu: "none", mobile_menu: "drawer", mobile_submenu: "accordion", sticky: true, transparent_on_home: false, show_search: true, show_cart: true, account_link: MUSEAU_PAGES.connexion, cta_label: "", phone: "", color_scheme: "scheme-1", mobile_menu_scheme: "scheme-1" };
  header.blocks = {};
  header.block_order = [];
  spec.groups.header.sections = { header };
  spec.groups.header.order = ["header"];
  const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
  const fschema = sectionSchema(spec, "footer")!;
  const fblock = (type: string, settings: Record<string, unknown>) => ({ type, settings: withDefaults(fschema.blocks.find((b) => b.type === type)?.settings, settings) });
  footer.settings = { ...footer.settings, style: "brand-left", tagline: "Pour ceux qui ne disent jamais non à une balade.", show_wordmark: false, show_policies: false, show_payment: false, color_scheme: "scheme-2", logo_asset: k.name("logo.webp"), bottom_text: "Boutique et prix de démonstration.", bottom_menu: "legal" };
  footer.blocks = {
    shop: fblock("links", { heading: "Boutique", menu: "footer" }),
    club: fblock("links", { heading: "Le club", menu: "footer-club" }),
    help: fblock("links", { heading: "Aide", menu: "footer-aide" }),
    news: fblock("newsletter", { heading: "Rejoignez le club", text: p("Nos nouveautés et nos conseils, directement dans votre boîte mail.") }),
  };
  footer.block_order = ["shop", "club", "help", "news"];
  for (const s of Object.values(spec.groups.footer.sections)) if (s.type !== "footer") s.disabled = true;

  // ─── Boutique (planche 04, colonne centrale) : ouverture, pastilles par type, 2 × 2 grandes cartes, guide, ensemble. ─
  const guideBand = (heading: string) => section("cv-banner", { layout: "illustration", heading, heading_tag: "h2", heading_accent: "", eyebrow: "", text: p("Mesurez son tour de cou et son tour de poitrail, puis comparez-les aux mesures du guide."), illus_label_1: "Tour de cou", illus_label_2: "Tour de poitrail", illus_note: "", price_text: "", price_note: "", button_label: "Voir le guide des tailles", button_link: MUSEAU_PAGES.tailles, button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-3", padding_top: 0, padding_bottom: 0 });
  spec.templates.collection = { order: ["hero", "main", "guide", "set"], sections: {
    hero: section("cv-banner", { ...img("ambiance-02.webp"), layout: "background", band_height: "tall", veil: "light", mobile_valign: "bottom", image_loading: "eager", focus_x: 66, focus_y: 22, mobile_focus_x: 74, mobile_focus_y: 12, eyebrow: "La collection", heading: "La collection\npromenade.", heading_tag: "h1", heading_accent: "", text: p("Quatre essentiels pour profiter de chaque sortie, avec style et complicité."), price_text: "", price_note: "", button_label: "", button_link: "", note: "", animation: "fade", color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0 }),
    main: section("main-collection", { per_page: 12, columns: 2, enable_filters: false, enable_sorting: false, type_chips: true, chips_all_label: "Tous", show_header: false, show_count: false, card_vendor: false, card_button_label: "", card_ratio: "square", color_scheme: "scheme-1" }),
    guide: guideBand("Guide des tailles."),
    set: section("fs-products", { layout: "plus", source: "manual", eyebrow: "", heading: "Complétez la promenade.", heading_accent: "", text: p("Un ensemble assorti pour des balades encore plus belles."), button_label: "", button_link: "", ratio: "square", limit: 4, align: "left", show_secondary: false, effect: "fade", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 40 }, productBlocks(["harnais", "laisse", "collier", "pochette"])),
  } };

  // ─── Panier (planche 05) : bandeau photo, lignes avec couleur et taille, sous-total et livraison à l'étape suivante
  // (jamais un « Total » trompeur), puis « Complétez la balade ? » ; panier vide : « La prochaine balade commence ici. »
  // et « Nos essentiels ». « Passer commande » mène, dans l'aperçu seulement, à l'exemple de commande sans paiement. ──
  for (const sec of Object.values(spec.templates.cart?.sections ?? {})) if (sec.type === "main-cart") sec.settings = { ...sec.settings, intro: "", hero_image_asset: img("ambiance-02.webp").image_asset, hero_focus_x: 66, hero_focus_y: 24, hero_zoom: 100, hero_heading: "Votre panier", hero_text: "Les essentiels de vos prochaines balades.", hero_empty_image_asset: img("ambiance-04.webp").image_asset, hero_empty_focus_x: 50, hero_empty_focus_y: 34, hero_empty_heading: "La prochaine\nbalade\ncommence ici.", hero_empty_text: "Des accessoires pensés pour profiter de chaque moment ensemble.", hero_empty_button_label: "Découvrir la collection", hero_empty_button_link: "/collections/all", hero_color_scheme: "scheme-1", table_head: false, show_update: false, show_taxes_note: false, variant_options: true, total_label: "Sous-total", shipping_label: "Livraison", shipping_text: "Calculée à l'étape suivante", summary_note: "Prix de démonstration", empty_icon: "none", empty_image_asset: "", empty_heading: "Votre panier est vide.", empty_text: "", empty_button_label: "Découvrir la collection", empty_button_link: "/collections/all", qty_buttons: true, remove_label: "Supprimer", continue_label: "Continuer mes achats", demo_checkout_link: MUSEAU_PAGES.paiement, color_scheme: "scheme-1" };
  spec.templates.cart.sections.more = section("fs-products", { layout: "grid", source: "manual", cart_visibility: "filled", exclude_cart_items: true, card_button_label: "Voir le produit", eyebrow: "", heading: "Complétez la balade ?", heading_accent: "", text: p("Nos autres essentiels."), button_label: "", button_link: "", ratio: "square", columns: 3, limit: 4, align: "left", show_secondary: false, effect: "fade", color_scheme: "scheme-4", padding_top: 32, padding_bottom: 40 }, productBlocks(["harnais", "laisse", "collier", "pochette"]));
  spec.templates.cart.sections.essentials = section("fs-products", { layout: "grid", source: "manual", cart_visibility: "empty", card_button_label: "Voir le produit", eyebrow: "", heading: "Nos essentiels", heading_accent: "", text: p("Quatre accessoires assortis pour vos sorties de tous les jours."), button_label: "", button_link: "", ratio: "square", columns: 4, limit: 4, align: "center", show_secondary: false, effect: "fade", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 48 }, productBlocks(["harnais", "laisse", "collier", "pochette"]));
  spec.templates.cart.order.push("more", "essentials");
  spec.settings = { ...spec.settings, cart_discount_code: true, cart_checkout_label: "Passer commande", cart_reassurance: "" };

  // ─── Pages (contenu détaillé : voir pagesMuseau). ────────────────────────────────────────────────────────────────
  pagesMuseau(k, href);
  k.finish();
  spec.settings = { ...spec.settings, logo_width: 170, fab_contact_link: MUSEAU_PAGES.contact, cookie_banner: true, cookie_policy_link: MUSEAU_PAGES.confidentialite };
}

/** Bandeau d'ouverture des pages intérieures (H1). */
// Photo en largeur : en fond, texte sur voile clair ; photo carrée ou en hauteur : panneau crème à gauche, photo à droite
// (sinon un bandeau très large n'en montrerait qu'une bande).
const WIDE = /ambiance-(0[1235678]|10)\.webp$/;
const pageHero = (k: Kit, file: string, heading: string, text: string, extra: Record<string, unknown> = {}) => k.section("cv-banner", { ...k.img(file), layout: WIDE.test(file) ? "background" : "panel-left", band_height: "tall", veil: WIDE.test(file) ? "light" : "none", mobile_valign: "bottom", focus_x: 60, focus_y: 40, mobile_focus_x: 60, mobile_focus_y: 30, heading, heading_tag: "h1", heading_accent: "", eyebrow: "", text: p(text), price_text: "", price_note: "", button_label: "", button_link: "", button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0, ...extra });

function pagesMuseau(k: Kit, href: (key: string) => string) {
  const { spec } = k;
  const page = (handle: string, title: string, seo: { title: string; description: string }, rows: [string, SectionInstance][]) => {
    k.page(handle, title, seo, rows);
    // Le titre de page est porté par le bandeau (H1).
    spec.templates[`page.${handle}`].sections.title.settings = { ...spec.templates[`page.${handle}`].sections.title.settings, show_title: false, padding_top: 0, padding_bottom: 0 };
  };
  void href;
  // Exemple de commande et de confirmation (planche 05) : aucune carte demandée, champs désactivés, récapitulatif fixe
  // (harnais taille M + laisse = 78 € de sous-total, livraison à calculer). Pages de démonstration seulement.
  const orderLines = [
    { type: "line", settings: { product: MUSEAU_PRODUCTS[0].handle, variant_label: "Bleu cobalt\nTaille M", quantity: 1 } },
    { type: "line", settings: { product: MUSEAU_PRODUCTS[1].handle, variant_label: "Bleu cobalt", quantity: 1 } },
  ];
  page("finaliser-ma-commande", "Finaliser ma commande", { title: "Finaliser ma commande (exemple) | MUSEAU CLUB", description: "Exemple de commande de la boutique de démonstration : rien n'est envoyé ni payé." }, [["order", k.section("demo-order", { layout: "checkout", eyebrow: "Exemple de démonstration", heading: "Finaliser ma commande", text: p("Encore un peu et c'est parti pour de nouvelles aventures."), button_label: "Voir l'exemple de confirmation", button_link: MUSEAU_PAGES.confirmation, button_note: "Aucun paiement : la démonstration montre seulement le parcours.", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 56 }, orderLines)]]);
  page("confirmation-de-commande", "Confirmation de commande", { title: "Confirmation (exemple) | MUSEAU CLUB", description: "Exemple de confirmation de la boutique de démonstration : aucune commande réelle." }, [["order", k.section("demo-order", { ...k.img("ambiance-09.webp"), focus_x: 50, focus_y: 30, layout: "confirmation", eyebrow: "Exemple de confirmation", heading: "Merci,\nla balade peut\ncommencer.", text: p("Dans une vraie boutique, la confirmation et l'e-mail de commande sont envoyés par Shopify après le paiement. Ici, aucune commande n'a été passée."), button_label: "Voir l'exemple de commande", button_link: MUSEAU_PAGES.commande, summary_title: "Récapitulatif de la commande", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 56 }, orderLines)]]);
  const S = (type: string, settings: Record<string, unknown>, blocks: { type: string; settings: Record<string, unknown> }[] = []) => k.section(type, settings, blocks);
  const band = (file: string, layout: "panel-left" | "panel-right", heading: string, text: string, button: [string, string] | null, extra: Record<string, unknown> = {}) => S("cv-banner", { ...k.img(file), layout, focus_x: 50, focus_y: 50, mobile_focus_x: 50, mobile_focus_y: 50, heading, heading_tag: "h2", heading_accent: "", eyebrow: "", text: p(text), price_text: "", price_note: "", button_label: button?.[0] ?? "", button_link: button?.[1] ?? "", button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-3", padding_top: 0, padding_bottom: 0, ...extra });
  const faqRows = (rows: [string, string, string?][]) => rows.map(([question, answer, topic]) => ({ type: "question", settings: { question, answer: p(answer), topic: topic ?? "" } }));
  const journalCards = (list: typeof MUSEAU_ARTICLES) => list.map((a) => ({ type: "article", settings: { ...k.img(a.image), title: a.title, text: a.excerpt, tag: a.tag, date_text: "", link: `/pages/${a.handle}` } }));
  const hero = (file: string, eyebrow: string, heading: string, text: string, extra: Record<string, unknown> = {}) => pageHero(k, file, heading, text, { eyebrow, ...extra });

  // ─── Le club (planche 06) ───────────────────────────────────────────────────────────────────────────────────────
  page("le-club", "Le club", { title: "Le club | MUSEAU CLUB", description: "Pour ceux qui ne disent jamais non à une balade : l'histoire de MUSEAU CLUB et de ses quatre essentiels assortis." }, [
    ["hero", hero("ambiance-02.webp", "", "Pour ceux\nqui ne disent\njamais non\nà une balade.", "MUSEAU CLUB, c'est une collection d'accessoires pensés pour tous ceux qui partagent une même évidence : les plus beaux moments sont souvent dehors.", { button_label: "Découvrir la collection", button_link: "/collections/all", focus_x: 66, focus_y: 24 })],
    ["essentiels", band("ambiance-01.webp", "panel-left", "Un chien.\nQuatre essentiels.\nMille sorties.", "Un harnais, une laisse, un collier et une pochette à sacs assortis, en bleu cobalt et maille crème, pour vivre ensemble de belles aventures au quotidien.", ["Voir la collection", "/collections/all"])],
    ["quotidien", band("ambiance-09.webp", "panel-right", "Le quotidien,\nen bonne compagnie.", "Des accessoires pour toutes vos balades, des grands horizons aux petits coins de quartier.", ["Découvrir la collection", "/collections/all"], { focus_y: 16, mobile_focus_y: 14 })],
    ["details", S("cv-feature", { layout: "numbered", detail_shape: "square", detail_numbers: false, image_asset: "", image_alt: "", eyebrow: "", heading: "Des détails qui comptent.", heading_accent: "", text: "", button_label: "", button_link: "", guarantee_text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 40 }, [
      { type: "detail", settings: { ...k.img("harnais-03.webp"), caption: "Une doublure en maille crème" } },
      { type: "detail", settings: { ...k.img("collier-05.webp"), caption: "Un design épuré" } },
      { type: "detail", settings: { ...k.img("harnais-04.webp"), caption: "Des boucles noires à clip" } },
      { type: "detail", settings: { ...k.img("laisse-04.webp"), caption: "Pensés pour toutes les sorties" } },
    ])],
  ]);

  // ─── Journal : ouverture, pastilles par catégorie, grille d'articles (planche 06) ───────────────────────────────
  page("journal", "Journal", { title: "Journal | MUSEAU CLUB", description: "Des idées, des inspirations et des conseils pour explorer le monde ensemble, autrement." }, [
    ["hero", hero("ambiance-07.webp", "", "Le journal\ndes sorties\nà deux.", "Des idées, des inspirations et des conseils pour explorer le monde ensemble, autrement.", { focus_y: 50 })],
    ["articles", S("fs-journal", { layout: "grid", filters: true, all_label: "Tous", tag_on_image: true, eyebrow: "", heading: "", heading_accent: "", text: "", align: "left", button_label: "", button_link: "", limit: 6, show_date: false, show_excerpt: true, link_label: "Lire l'article", effect: "fade", color_scheme: "scheme-1", padding_top: 28, padding_bottom: 48 }, journalCards(MUSEAU_ARTICLES))],
  ]);

  // ─── Articles : gabarit complet (fil d'Ariane, titre, chapeau, photo, intertitres, encart, articles similaires) ─
  for (const a of MUSEAU_ARTICLES) {
    const others = MUSEAU_ARTICLES.filter((x) => x.handle !== a.handle).slice(0, 3);
    const blocksOf = (body: Article["body"]) => body.flatMap(([h, t, img]) => [
      ...(img ? [{ type: "image", settings: { ...k.img(img), caption: "" } }] : []),
      { type: "heading", settings: { text: h } },
      { type: "paragraph", settings: { text: p(t) } },
    ]);
    page(a.handle, a.title, { title: `${a.title} | Journal MUSEAU CLUB`, description: a.excerpt }, [
      ["article", S("cv-article", { style: "listicle", width: "regular", label_bar: "", crumb_label: a.tag, crumb_link: MUSEAU_PAGES.journal, crumb_link_label: "Journal", eyebrow: "", heading: a.title, heading_accent: "", intro: p(a.intro), author: "", date_text: "", rating_text: "", demo_note: "", animation: "fade", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 24 }, [{ type: "image", settings: { ...k.img(a.image), caption: "" } }, ...blocksOf(a.body.slice(0, 2))])],
      ["encart", band("ambiance-01.webp", "panel-right", "Toujours prêts pour\nla prochaine aventure.", "Découvrez notre collection d'accessoires assortis, pensés pour vous accompagner partout.", ["Voir la collection", "/collections/all"])],
      ["suite", S("cv-article", { style: "listicle", width: "regular", label_bar: "", crumb_label: "", crumb_link: "", crumb_link_label: "", eyebrow: "", heading: "", heading_tag: "h2", heading_accent: "", intro: "", author: "", date_text: "", rating_text: "", demo_note: "", animation: "fade", color_scheme: "scheme-1", padding_top: 16, padding_bottom: 16 }, blocksOf(a.body.slice(2)))],
      ["similaires", S("fs-journal", { layout: "row", filters: false, tag_on_image: false, eyebrow: "", heading: "Articles similaires", heading_accent: "", text: "", align: "left", button_label: "Voir tous les articles", button_link: MUSEAU_PAGES.journal, limit: 3, show_date: false, show_excerpt: false, link_label: "Lire l'article", effect: "fade", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 48 }, journalCards(others))],
    ]);
  }

  // ─── Guide des tailles (planche 07) : mesures « à renseigner », jamais de conseil de prendre la taille au-dessus ─
  page("guide-des-tailles", "Guide des tailles", { title: "Guide des tailles | MUSEAU CLUB", description: "Bien choisir, avant de partir : comment mesurer le tour de cou et le tour de poitrail de votre chien." }, [
    ["hero", hero("ambiance-09.webp", "Guide des tailles", "Bien choisir,\navant de partir.", "Un bon ajustement rend chaque sortie plus agréable. Prenez deux mesures, puis comparez-les au tableau.", { focus_y: 26, mobile_focus_y: 20 })],
    ["mesurer", S("cv-banner", { layout: "illustration", heading: "Comment mesurer ?", heading_tag: "h2", heading_accent: "", eyebrow: "", text: p("1. Tour de cou : mesurez la base du cou, là où le collier se place naturellement.") + p("2. Tour de poitrail : mesurez autour de la partie la plus large de la poitrine, juste derrière les pattes avant."), illus_label_1: "Tour de cou", illus_label_2: "Tour de poitrail", illus_note: "", price_text: "", price_note: "", button_label: "", button_link: "", button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-3", padding_top: 0, padding_bottom: 0 })],
    ["tableau", S("cv-specs", { layout: "table", table_first_column: "Taille", eyebrow: "", heading: "Guide des tailles", heading_accent: "", text: p("Le harnais et le collier existent en quatre tailles, de XS à L. Les mesures de chaque taille sont à renseigner par la marque."), note: "", animation: "fade", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 24 }, MUSEAU_SIZES.map((size) => ({ type: "group", settings: { title: size, rows: "Tour de cou : À renseigner\nTour de poitrail : À renseigner", open: false } })))],
    ["fiches", S("cv-cards", { layout: "pills", heading: "", heading_accent: "", text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 8, padding_bottom: 24 }, [
      { type: "card", settings: { ...k.img("harnais-01.webp"), focus_x: 50, focus_y: 50, title: "Le harnais en détail", text: "", link: `/products/${MUSEAU_PRODUCTS[0].handle}`, link_label: "" } },
      { type: "card", settings: { ...k.img("collier-01.webp"), focus_x: 50, focus_y: 50, title: "Le collier en détail", text: "", link: `/products/${MUSEAU_PRODUCTS[2].handle}`, link_label: "" } },
    ])],
    ["doute", band("ambiance-02.webp", "panel-right", "Un doute ?", "Entre deux tailles, comparez vos deux mesures au tableau. Si vous hésitez encore, écrivez-nous : nous vous aiderons à choisir.", ["Nous contacter", MUSEAU_PAGES.contact], { focus_x: 66, focus_y: 30 })],
  ]);

  // ─── FAQ : recherche, thèmes en pastilles, appel au contact ─────────────────────────────────────────────────────
  page("faq", "FAQ", { title: "FAQ | MUSEAU CLUB", description: "Les réponses aux questions les plus fréquentes sur nos produits, votre commande et la livraison." }, [
    ["hero", hero("ambiance-04.webp", "FAQ", "Une question\navant la balade ?", "Retrouvez ici les réponses aux questions les plus fréquentes sur nos produits, votre commande et la livraison.", { focus_x: 50, focus_y: 30 })],
    ["questions", S("faq", { eyebrow: "", heading: "", text: "", style: "cards", layout: "stacked", columns: "1", open_first: true, search: true, search_placeholder: "Rechercher une question…", topics: true, contact_text: "", button_label: "", button_link: "", structured_data: false, color_scheme: "scheme-1", padding_top: 28, padding_bottom: 32 }, faqRows(MUSEAU_FAQ))],
    ["contact", band("ambiance-03.webp", "panel-right", "Vous ne trouvez pas\nla réponse ?", "Notre équipe est là pour vous aider.", ["Nous contacter", MUSEAU_PAGES.contact])],
  ]);

  // ─── Contact : formulaire (états vérifiés dans l'aperçu, aucun envoi réel), communauté ───────────────────────────
  page("contact", "Contact", { title: "Contact | MUSEAU CLUB", description: "Une question ? Envoyez-nous un message." }, [
    ["hero", hero("ambiance-09.webp", "Contact", "Une question ?\nOn vous répond\navec plaisir.", "Envoyez-nous un message : nous vous répondrons dès que possible.", { focus_y: 24, mobile_focus_y: 18 })],
    ["form", S("contact-form", { ...k.img("ambiance-02.webp"), eyebrow: "", heading: "Envoyez-nous un message", text: "", email: "", hours: "", response: "", show_phone: false, require_name: true, require_message: true, name_placeholder: "Votre prénom", email_placeholder: "votre@email.com", message_placeholder: "Votre message…", submit_label: "Envoyer mon message", inline_states: true, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 32 })],
    ["journal", band("ambiance-05.webp", "panel-left", "Une belle communauté,\nmême à distance.", "Des conseils, des idées et des histoires de balades à retrouver sur notre journal.", ["Lire le journal", MUSEAU_PAGES.journal])],
  ]);

  // ─── Livraison et retours : cartes ouvertes, toutes les valeurs « à renseigner » ────────────────────────────────
  page("livraison-retours", "Livraison et retours", { title: "Livraison et retours | MUSEAU CLUB", description: "Livraison, suivi de commande et retours : les informations de la boutique." }, [
    ["hero", hero("ambiance-03.webp", "Livraison et retours", "Tout savoir\navant de commander.", "Retrouvez ici les informations sur la livraison, le suivi de commande et les retours.")],
    ["infos", S("cv-specs", { layout: "cards", eyebrow: "", heading: "", heading_accent: "", text: "", note: "", animation: "fade", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 24 }, [
      { type: "group", settings: { icon: "truck", title: "Livraison", text: p("Les délais et les frais de livraison sont indiqués lors de la validation de votre panier."), rows: "Zones de livraison : À renseigner\nDélais de livraison : À renseigner\nFrais de livraison : À renseigner", open: true } },
      { type: "group", settings: { icon: "search", title: "Suivi de commande", text: p("Les informations de suivi de votre commande vous sont communiquées par e-mail."), rows: "Confirmation d'expédition : À renseigner\nSuivi en ligne : À renseigner", open: true } },
      { type: "group", settings: { icon: "return", title: "Retours", text: p("Les conditions de retour de la boutique sont détaillées ci-dessous."), rows: "Procédure de retour : À renseigner\nFrais de retour : À renseigner\nRemboursement : À renseigner", open: true } },
    ])],
    ["question", band("ambiance-10.webp", "panel-left", "Une autre question ?", "Consultez notre FAQ ou contactez notre équipe.", ["Voir la FAQ", MUSEAU_PAGES.faq])],
  ]);

  // ─── Pages légales : modèles « à compléter et valider », sommaire automatique ───────────────────────────────────
  const legal = (handle: string, title: string, file: string, heading: string, intro: string, parts: [string, string][], extra: Record<string, unknown> = {}) => page(handle, title, { title: `${title} | MUSEAU CLUB`, description: `${title} : modèle de démonstration à compléter et à valider.` }, [
    ["hero", hero(file, "", heading, intro, { note: "", ...extra })],
    ["texte", S("legal-page", { source: "blocks", show_title: false, eyebrow: "", heading: "", updated: "", intro: p("Modèle de démonstration : contenu à compléter et à valider avant toute publication."), show_toc: true, show_print: false, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 48 }, parts.map(([t, x]) => ({ type: "part", settings: { title: t, text: p("Modèle de démonstration : contenu à compléter et à valider.") + p(`[À renseigner : ${x}]`) } })))],
  ]);
  legal("mentions-legales", "Mentions légales", "ambiance-04.webp", "Mentions\nlégales", "Cette page présente les mentions légales à titre de modèle de démonstration. Son contenu est à compléter et à valider avant toute publication.", [
    ["Éditeur du site", "raison sociale, adresse, numéro d'immatriculation et coordonnées de l'éditeur"], ["Hébergement", "nom, adresse et coordonnées de l'hébergeur du site"], ["Contact", "e-mail, formulaire et adresse postale"], ["Propriété intellectuelle", "droits sur les textes, photos et marques du site"], ["Données personnelles", "renvoi vers la politique de confidentialité"], ["Cookies", "renvoi vers la gestion des préférences de cookies"], ["Liens externes", "règles applicables aux liens vers d'autres sites"],
  ], { focus_y: 30 });
  legal("confidentialite", "Confidentialité", "ambiance-06.webp", "Notre politique\nde confidentialité", "Cette page est un modèle de démonstration, à compléter et à valider.", [
    ["Données collectées", "catégories de données collectées (compte, commandes, navigation)"], ["Finalités", "finalités du traitement (gestion des commandes, service client, communication)"], ["Base légale", "base légale de chaque traitement"], ["Durée de conservation", "durée de conservation de chaque catégorie de données"], ["Vos droits", "droits d'accès, de rectification, d'effacement et modalités d'exercice"], ["Cookies", "cookies utilisés ; vos choix se modifient depuis le bandeau « Vos préférences de cookies » (lien « Gérer les cookies » ci-dessous)"], ["Sécurité", "mesures de sécurité mises en place"], ["Contact", "coordonnées du responsable du traitement"],
  ], { button_label: "Gérer les cookies", button_link: "#cookies" });
  legal("cgv", "Conditions générales de vente", "harnais-02.webp", "Conditions\ngénérales de vente", "Cette page présente les conditions générales de vente à titre de modèle de démonstration. Son contenu est à compléter et à valider avant toute publication.", [
    ["Produits", "description des produits proposés (harnais, laisses, colliers, pochettes) et de leurs caractéristiques"], ["Prix", "devise, mention TTC ou HT et frais éventuels"], ["Commande", "étapes de la commande et de sa validation"], ["Paiement", "moyens de paiement acceptés"], ["Livraison", "zones, délais et frais de livraison"], ["Retours et rétractation", "délai et modalités du droit de rétractation"], ["Garanties", "garanties légales applicables"], ["Responsabilité", "limites de responsabilité"], ["Droit applicable", "droit applicable et règlement des litiges"], ["Contact", "coordonnées du service client"],
  ], { focus_x: 50, focus_y: 50 });

  // ─── Espace client (planche 08) : écrans d'exemple reliés entre eux, aucune donnée envoyée ──────────────────────
  const links = { recover_link: MUSEAU_PAGES.motDePasse, account_link: MUSEAU_PAGES.compte, order_link: MUSEAU_PAGES.commande, addresses_link: MUSEAU_PAGES.adresses, infos_link: MUSEAU_PAGES.infos, logout_link: MUSEAU_PAGES.connexion };
  const lines = [{ type: "line", settings: { product: MUSEAU_PRODUCTS[0].handle, quantity: 1 } }, { type: "line", settings: { product: MUSEAU_PRODUCTS[1].handle, quantity: 1 } }];
  const account = (handle: string, title: string, settings: Record<string, unknown>, withLines = false) => page(handle, title, { title: `${title} | MUSEAU CLUB`, description: `${title} : écran d'exemple de la boutique de démonstration.` }, [["compte", S("demo-account", { ...links, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 56, ...settings }, withLines ? lines : [])]]);
  account("connexion", "Connexion", { ...k.img("ambiance-09.webp"), focus_y: 30, layout: "login", heading: "Bon retour\nparmi nous !", text: p("Connectez-vous à votre compte pour retrouver vos commandes, gérer vos adresses et vos informations."), button_label: "Se connecter", button_link: MUSEAU_PAGES.compte, secondary_label: "Créer un compte", secondary_link: MUSEAU_PAGES.inscription });
  account("creer-un-compte", "Créer un compte", { ...k.img("ambiance-02.webp"), focus_x: 66, focus_y: 30, layout: "register", heading: "Rejoindre\nle club", text: p("Créez votre compte pour suivre vos commandes et enregistrer vos adresses."), button_label: "Créer mon compte", button_link: MUSEAU_PAGES.compte, secondary_label: "J'ai déjà un compte", secondary_link: MUSEAU_PAGES.connexion });
  account("mot-de-passe-oublie", "Mot de passe oublié", { ...k.img("ambiance-04.webp"), focus_y: 30, layout: "recover", heading: "Mot de passe\noublié ?", text: p("Indiquez votre adresse e-mail : sur une vraie boutique, vous recevriez un lien pour choisir un nouveau mot de passe."), button_label: "Retour à la connexion", button_link: MUSEAU_PAGES.connexion, secondary_label: "", secondary_link: "" });
  account("mon-compte", "Mon compte", { layout: "account", heading: "Bonjour !", text: p("Bienvenue dans votre espace personnel. Retrouvez vos commandes, vos adresses et vos informations."), empty_text: "Aucune autre commande pour le moment." }, true);
  account("commande-1001", "Commande n°1001", { layout: "order", heading: "Commande n°1001", text: p("Voici le détail de la commande d'exemple."), demo_note: "Cette page est une maquette de démonstration : aucune commande ni aucun envoi réel." }, true);
  account("mes-adresses", "Mes adresses", { layout: "addresses", heading: "Mes adresses", text: "", empty_text: "Aucune adresse enregistrée dans cette démonstration." });
  account("informations-personnelles", "Informations personnelles", { layout: "infos", heading: "Mes informations", text: "" });

}
