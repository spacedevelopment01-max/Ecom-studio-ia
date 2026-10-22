/**
 * Démonstrations de l'issue #158 : MUSEAU CLUB (harnais, laisse, collier et pochette à sacs pour chiens, boutique
 * spécialisée depuis la décision du 21 octobre) et SOUPLE (tapis de yoga, brique, sangle et anneau de Pilates, famille
 * E-commerce) : exactement quatre produits distincts par boutique, cinq vues par produit, dix ambiances ; les vues ne sont
 * pas des produits, les scènes de collection n'en créent pas un cinquième ni une offre.
 *
 * Même chaîne que HEUREN et ALCÔVE : un projet client (marque, produit, médias avec rôles) composé par le VRAI moteur dans
 * son thème du catalogue (composeShop), puis rédigé section par section, dans le même ordre (un test le vérifie). La
 * différence : quatre produits, chacun avec SA fiche (son propre modèle : texte, points et vues propres, aucune
 * caractéristique recopiée d'un autre produit), reliés par la collection « all » et les recommandations.
 *
 * Rien n'est inventé : les textes décrivent ce que montrent les visuels du lot (commit 8260bafd, des chiens et aucune
 * personne) — sangles bleu cobalt, maille crème, boucles noires, anneaux et mousquetons argentés, étiquette MUSEAU CLUB,
 * zip bordé de crème, ouverture ronde de la pochette. Prix, tailles, matières, résistance, sécurité, entretien, contenu
 * de la pochette, garantie et livraison ne sont jamais affirmés : leurs blocs restent dans la démonstration, masqués
 * (« [À compléter : …] » prêts dans l'éditeur). Aucun avis, note, compteur ni urgence ; aucune vente.
 */
import { buildKitProject, p, TODO, ORDER_FAQ, type Brand, type Kit, type Media } from "./noctil-traverse-fixtures";
import { sectionSchema, withDefaults, type StoreProduct } from "../src/lib/theme/spec";

export type MultiKitId = "museau-club" | "souple";
export const MULTI_KIT_PROVENANCE = "Issue #158 (21 octobre 2026) — démonstration du studio, visuels d'origine fournis par Thomas (commit 8260bafd), des chiens et aucune personne, aucun paiement";
export const SOUPLE_PROVENANCE = "Issue #158 (21 octobre 2026) — démonstration du studio, visuels d'origine fournis par Thomas (commit 9cc0b97e), objets seuls et aucune personne, aucun paiement";

/** Ordre d'import = rôles du thème (le dernier importé d'un rôle prend le premier emplacement). Textes alternatifs fidèles aux pixels. */
export const MUSEAU_MEDIA: Media[] = [
  { file: "logo.webp", role: "logo", alt: "MUSEAU CLUB" },
  { file: "pochette-05.webp", role: "detail", alt: "Pochette à sacs MUSEAU CLUB bleu cobalt, un sac sortant de l'ouverture ronde de la façade." },
  { file: "pochette-04.webp", role: "detail", alt: "Gros plan du mousqueton argenté de la pochette, accroché à sa sangle bleue." },
  { file: "pochette-03.webp", role: "detail", alt: "Pochette MUSEAU CLUB ouverte, zip bordé de crème, un rouleau de sacs à l'intérieur." },
  { file: "pochette-02.webp", role: "packshot", alt: "Pochette à sacs MUSEAU CLUB bleu cobalt sur un fond bleu poudré." },
  { file: "pochette-01.webp", role: "packshot", alt: "Pochette à sacs MUSEAU CLUB bleu cobalt entière : zip bordé de crème, mousqueton argenté, ouverture ronde en façade." },
  { file: "collier-05.webp", role: "packshot", alt: "Collier MUSEAU CLUB bleu cobalt sur un fond bleu poudré." },
  { file: "collier-04.webp", role: "detail", alt: "Gros plan de l'intérieur du collier, doublé de maille crème, près de la boucle noire." },
  { file: "collier-03.webp", role: "detail", alt: "Gros plan de l'anneau argenté du collier et de son étiquette MUSEAU CLUB." },
  { file: "collier-02.webp", role: "packshot", alt: "Collier MUSEAU CLUB bleu cobalt ouvert, les deux parties de la boucle noire séparées." },
  { file: "collier-01.webp", role: "packshot", alt: "Collier MUSEAU CLUB bleu cobalt fermé : intérieur en maille crème, boucle noire, anneau argenté." },
  { file: "laisse-05.webp", role: "packshot", alt: "Laisse MUSEAU CLUB bleu cobalt dépliée sur un fond bleu poudré." },
  { file: "laisse-04.webp", role: "detail", alt: "Gros plan de la poignée de la laisse, doublée de maille crème, et de l'étiquette MUSEAU CLUB." },
  { file: "laisse-03.webp", role: "detail", alt: "Gros plan du mousqueton argenté au bout de la sangle bleu cobalt." },
  { file: "laisse-02.webp", role: "packshot", alt: "Laisse MUSEAU CLUB bleu cobalt enroulée, mousqueton argenté au premier plan." },
  { file: "laisse-01.webp", role: "packshot", alt: "Laisse MUSEAU CLUB bleu cobalt entière : poignée doublée de maille crème, étiquette et mousqueton argenté." },
  { file: "harnais-05.webp", role: "packshot", alt: "Harnais MUSEAU CLUB bleu cobalt posé à plat sur un fond bleu poudré." },
  { file: "harnais-04.webp", role: "detail", alt: "Gros plan d'une boucle noire du harnais sur sa sangle bleu cobalt, maille crème autour." },
  { file: "harnais-03.webp", role: "detail", alt: "Gros plan de la maille crème du harnais et de son liseré bleu cobalt." },
  { file: "harnais-02.webp", role: "packshot", alt: "Harnais MUSEAU CLUB bleu cobalt de profil, boucles noires et anneau argenté." },
  { file: "harnais-01.webp", role: "packshot", alt: "Harnais MUSEAU CLUB bleu cobalt entier, de trois quarts : maille crème, boucles noires et anneau argenté sur le dessus." },
  { file: "ambiance-10.webp", role: "scene", alt: "Harnais, pochette, collier et laisse MUSEAU CLUB réunis autour d'une boîte ivoire garnie de papier bleu." },
  { file: "ambiance-08.webp", role: "scene", alt: "Harnais et pochette MUSEAU CLUB posés sur un sol à damier bleu et crème." },
  { file: "ambiance-07.webp", role: "scene", alt: "Collier et laisse MUSEAU CLUB sur un banc en bois, dans un parc ensoleillé." },
  { file: "ambiance-06.webp", role: "scene", alt: "Pochette MUSEAU CLUB sur un socle jaune, devant un mur bleu cobalt." },
  { file: "ambiance-05.webp", role: "scene", alt: "Harnais et laisse MUSEAU CLUB sur un plaid crème, au soleil, dans l'herbe." },
  { file: "ambiance-04.webp", role: "scene", alt: "Beagle assis portant le collier MUSEAU CLUB bleu cobalt, devant un mur bleu clair." },
  { file: "ambiance-03.webp", role: "banner", alt: "Laisse et pochette MUSEAU CLUB posées sur une console claire, près de la porte d'entrée." },
  { file: "ambiance-09.webp", role: "lifestyle", alt: "Golden retriever assis en harnais MUSEAU CLUB cobalt et crème, devant une porte bleue." },
  { file: "ambiance-02.webp", role: "lifestyle", alt: "Golden retriever en harnais MUSEAU CLUB cobalt et crème, debout dans l'herbe au soleil." },
  { file: "ambiance-01.webp", role: "lifestyle", alt: "Collection MUSEAU CLUB sur des socles bleu poudré : harnais, collier, pochette et laisse bleu cobalt." },
];
/** SOUPLE : textes alternatifs fidèles aux pixels et au manifeste du lot (le champ « scène » prime sur le nom du fichier). */
export const SOUPLE_MEDIA: Media[] = [
  { file: "logo.webp", role: "logo", alt: "SOUPLE" },
  { file: "anneau-03.webp", role: "detail", alt: "Gros plan d'une poignée rose mauve de l'anneau de Pilates SOUPLE, logo SOUPLE en prune, fixée sur le cercle prune." },
  { file: "anneau-04.webp", role: "packshot", alt: "Anneau de Pilates SOUPLE prune vu de profil, posé à plat, ses deux poignées rose mauve visibles." },
  { file: "anneau-05.webp", role: "packshot", alt: "Anneau de Pilates SOUPLE prune debout contre un cube mauve." },
  { file: "anneau-02.webp", role: "packshot", alt: "Anneau de Pilates SOUPLE prune vu de face sur un fond poudré, deux poignées rose mauve de part et d'autre." },
  { file: "anneau-01.webp", role: "packshot", alt: "Anneau de Pilates SOUPLE entier, de trois quarts : cercle prune strié et deux poignées rose mauve marquées SOUPLE." },
  { file: "sangle-04.webp", role: "detail", alt: "Gros plan de l'extrémité cousue de la sangle SOUPLE, tissage prune." },
  { file: "sangle-03.webp", role: "detail", alt: "Gros plan des deux anneaux argentés de la sangle SOUPLE et de son étiquette crème cousue." },
  { file: "sangle-02.webp", role: "packshot", alt: "Sangle de yoga SOUPLE prune roulée sur elle-même, anneaux argentés et étiquette SOUPLE devant." },
  { file: "sangle-05.webp", role: "packshot", alt: "Sangle de yoga SOUPLE prune étendue en S sur un fond rose, anneaux argentés à une extrémité." },
  { file: "sangle-01.webp", role: "packshot", alt: "Sangle de yoga SOUPLE prune entière, en boucles souples : deux anneaux argentés et étiquette SOUPLE cousue." },
  { file: "brique-04.webp", role: "detail", alt: "Gros plan du logo SOUPLE en prune sur la face de la brique, grain liège visible." },
  { file: "brique-03.webp", role: "packshot", alt: "Brique SOUPLE couleur liège vue du dessus, logo SOUPLE en prune au centre." },
  { file: "brique-05.webp", role: "packshot", alt: "Brique SOUPLE couleur liège vue de l'arrière, posée sur un socle mauve." },
  { file: "brique-02.webp", role: "packshot", alt: "Brique SOUPLE couleur liège vue de profil, posée sur la tranche, arêtes arrondies." },
  { file: "brique-01.webp", role: "packshot", alt: "Brique de yoga SOUPLE couleur liège, de trois quarts, logo SOUPLE en prune sur la grande face." },
  { file: "tapis-04.webp", role: "detail", alt: "Coin relevé du tapis SOUPLE : dessus rose poudré, dessous prune, logo SOUPLE." },
  { file: "tapis-03.webp", role: "detail", alt: "Gros plan du logo SOUPLE imprimé en prune sur le tapis rose poudré, au coin arrondi." },
  { file: "tapis-02.webp", role: "packshot", alt: "Tapis de yoga SOUPLE roulé : dessus rose poudré, dessous prune, logo SOUPLE." },
  { file: "tapis-05.webp", role: "packshot", alt: "Tapis de yoga SOUPLE rose poudré entier, posé à plat, vu de face." },
  { file: "tapis-01.webp", role: "packshot", alt: "Tapis de yoga SOUPLE rose poudré déroulé, de trois quarts, logo SOUPLE en prune au bout." },
  { file: "ambiance-09.webp", role: "scene", alt: "Anneau de Pilates SOUPLE prune appuyé contre une brique couleur liège, devant un mur prune." },
  { file: "ambiance-08.webp", role: "scene", alt: "Tapis SOUPLE rose roulé debout dans une niche en arche, brique couleur liège et sangle prune à ses pieds." },
  { file: "ambiance-06.webp", role: "scene", alt: "Tapis SOUPLE rose roulé et sangle prune enroulée sur une étagère en bois, près d'un vase et d'une plante." },
  { file: "ambiance-04.webp", role: "scene", alt: "Anneau de Pilates SOUPLE prune debout sur un socle crème, devant un mur rose." },
  { file: "ambiance-03.webp", role: "scene", alt: "Brique SOUPLE couleur liège et sangle prune posées sur un banc en pierre claire, au soleil." },
  { file: "ambiance-02.webp", role: "banner", alt: "Tapis SOUPLE rose poudré déroulé sur un parquet clair, baigné de lumière près d'une fenêtre." },
  { file: "ambiance-10.webp", role: "lifestyle", alt: "Collection SOUPLE dans un studio lumineux : tapis rose déroulé, brique couleur liège, sangle et anneau prune." },
  { file: "ambiance-07.webp", role: "lifestyle", alt: "Tapis SOUPLE rose poudré déroulé sur un parquet au soleil, une brique couleur liège posée au bout." },
  { file: "ambiance-01.webp", role: "lifestyle", alt: "Studio de Pilates baigné de soleil : tapis SOUPLE rose, brique couleur liège, sangle et anneau prune sur le parquet." },
  { file: "ambiance-05.webp", role: "lifestyle", alt: "La collection SOUPLE à plat vue du dessus : tapis rose poudré, brique couleur liège, anneau et sangle prune." },
];
export const MULTI_KIT_MEDIA: Record<MultiKitId, Media[]> = { "museau-club": MUSEAU_MEDIA, souple: SOUPLE_MEDIA };

/** Les quatre produits : identifiant court (fiche, modèle), poignée, vues dans l'ordre de la galerie. */
export type KitProduct = { key: string; handle: string; title: string; category: string; views: string[] };
export const MUSEAU_PRODUCTS: KitProduct[] = [
  { key: "harnais", handle: "harnais-museau-club-cobalt", title: "Harnais MUSEAU CLUB cobalt", category: "Harnais", views: ["harnais-01.webp", "harnais-02.webp", "harnais-05.webp", "harnais-03.webp", "harnais-04.webp"] },
  { key: "laisse", handle: "laisse-museau-club-cobalt", title: "Laisse MUSEAU CLUB cobalt", category: "Laisse", views: ["laisse-01.webp", "laisse-02.webp", "laisse-05.webp", "laisse-04.webp", "laisse-03.webp"] },
  { key: "collier", handle: "collier-museau-club-cobalt", title: "Collier MUSEAU CLUB cobalt", category: "Collier", views: ["collier-01.webp", "collier-02.webp", "collier-05.webp", "collier-03.webp", "collier-04.webp"] },
  { key: "pochette", handle: "pochette-sacs-museau-club-cobalt", title: "Pochette à sacs MUSEAU CLUB cobalt", category: "Pochette à sacs", views: ["pochette-01.webp", "pochette-02.webp", "pochette-03.webp", "pochette-05.webp", "pochette-04.webp"] },
];
export const SOUPLE_PRODUCTS: KitProduct[] = [
  { key: "tapis", handle: "tapis-yoga-souple-rose-poudre", title: "Tapis de yoga SOUPLE rose poudré", category: "Tapis de yoga", views: ["tapis-01.webp", "tapis-05.webp", "tapis-02.webp", "tapis-04.webp", "tapis-03.webp"] },
  { key: "brique", handle: "brique-yoga-souple-liege", title: "Brique de yoga SOUPLE liège", category: "Brique de yoga", views: ["brique-01.webp", "brique-02.webp", "brique-05.webp", "brique-03.webp", "brique-04.webp"] },
  { key: "sangle", handle: "sangle-yoga-souple-prune", title: "Sangle de yoga SOUPLE prune", category: "Sangle de yoga", views: ["sangle-01.webp", "sangle-05.webp", "sangle-02.webp", "sangle-03.webp", "sangle-04.webp"] },
  { key: "anneau", handle: "anneau-pilates-souple-prune", title: "Anneau de Pilates SOUPLE prune", category: "Anneau de Pilates", views: ["anneau-01.webp", "anneau-02.webp", "anneau-05.webp", "anneau-04.webp", "anneau-03.webp"] },
];
export const MULTI_KIT_PRODUCTS: Record<MultiKitId, KitProduct[]> = { "museau-club": MUSEAU_PRODUCTS, souple: SOUPLE_PRODUCTS };

// MUSEAU CLUB — fiche de stratégie (consigne de Thomas du 21 octobre, 21 h 45 ; brief, hypothèse éditoriale) :
//  utilisateur et acheteur : une personne qui accueille son premier chien ;
//  situation d'achat : les jours qui précèdent ou suivent l'arrivée du chien, devant un rayon où tout se ressemble ;
//  tension (ses mots) : « Harnais, collier, laisse… je ne sais pas ce qui sert à quoi, ni par quoi commencer. » ;
//  désir : que les premières balades se passent simplement, sans hésiter au moment de sortir ;
//  angle unique : préparer ses premières balades avec un ensemble cohérent, un rôle clair pour chaque pièce ;
//  promesse tenable : quatre pièces au rôle distinct (porter : harnais ou collier ; relier : laisse ; accompagner :
//  pochette) qui s'accrochent entre elles ; faits = visuels (anneaux, mousquetons, boucles, maille crème, ouverture
//  de la pochette, rangement près de la porte) ;
//  objections : par quoi commencer, harnais ou collier, faut-il tout acheter, comment tout s'accroche, tailles et prix
//  (non renseignés : dits comme tels) ;
//  exclusions : aucun conseil de dressage ou de santé, aucune matière, taille, résistance ni sécurité affirmées.
export const MUSEAU_FAQ: [string, string][] = [
  ["Premier chien : par quoi commencer ?", "Par la laisse et une pièce à porter, le harnais ou le collier : c'est tout ce qu'il faut pour la première sortie. La pochette à sacs s'accroche ensuite à la laisse."],
  ["Harnais ou collier ?", "Le harnais se porte sur le poitrail, le collier autour du cou ; les deux reçoivent la même laisse sur leur anneau argenté. Choisissez celui que votre chien accepte le plus volontiers, ou prenez les deux."],
  ["Comment les pièces s'accrochent-elles entre elles ?", "La laisse s'accroche par son mousqueton à l'anneau du harnais ou du collier ; la pochette s'attache à la laisse par le sien. Au moment de sortir, tout part d'un seul geste."],
  ["Faut-il tout acheter d'un coup ?", "Non. Commencez par la laisse et la pièce à porter ; les autres viendront ensuite, dans le même bleu cobalt et avec la même maille crème."],
  ["Que puis-je faire dans cette boutique de démonstration ?", "Parcourir les quatre pièces et leurs cinq vues. Les prix et les tailles ne sont pas encore renseignés et la commande est désactivée : laissez votre adresse dans « Nouvelles du club » pour être prévenu de l'ouverture."],
];
export const MUSEAU_FAQ_PENDING: [string, string][] = [
  ["Quelles tailles sont proposées ?", TODO("tailles du harnais et du collier (tour de cou, tour de poitrail), longueur et largeur de la laisse")],
  ["En quelles matières sont-ils faits ?", TODO("composition des sangles, de la maille, des boucles, des anneaux et des mousquetons")],
  ["Comment les entretenir ?", TODO("lavage et séchage de chaque pièce")],
  ["Des sacs sont-ils fournis avec la pochette ?", TODO("rouleau de sacs inclus ou non, format des rouleaux compatibles")],
  ["Comment sont-ils livrés ?", TODO("zones, délais et frais de livraison, retours")],
  ["Quelle est la garantie ?", TODO("durée et conditions de garantie")],
];

const BRANDS: Record<MultiKitId, Brand> = {
  "museau-club": {
    name: "MUSEAU CLUB", product: "Collection de balade MUSEAU CLUB", category: "Accessoires de balade pour chiens",
    summary: "Collection de balade pour chiens en bleu cobalt : un harnais, une laisse, un collier et une pochette à sacs assortis, avec maille crème, boucles noires, anneaux et mousquetons argentés et étiquette MUSEAU CLUB.",
    facts: [["Collection", "harnais, laisse, collier et pochette à sacs assortis"], ["Couleurs", "bleu cobalt, maille crème, boucles noires, métal argenté"]],
    tagline: "Premier chien, premières balades.", story: "MUSEAU CLUB est né pour celles et ceux qui accueillent leur premier chien : quatre pièces au rôle clair, qui s'accrochent entre elles, pour ne plus hésiter au moment de sortir.", positioning: "Une collection de balade pour un premier chien : harnais, laisse, collier et pochette à sacs, chacun avec son rôle, en bleu cobalt.",
    // Bleu cobalt des sangles, crème de la maille, jaune du socle (ambiance-06), crème clair, marine du logo.
    palette: { primary: "#1636C9", secondary: "#EFE6D2", accent: "#F2C14E", light: "#FBF7EE", dark: "#0B1B5E" },
  },
  souple: {
    name: "SOUPLE", product: "Collection de yoga et de Pilates SOUPLE", category: "Accessoires de yoga et de Pilates",
    summary: "Collection de yoga et de Pilates en rose poudré, prune et liège : un tapis rose poudré au dessous prune, une brique couleur liège, une sangle prune à deux anneaux argentés et un anneau de Pilates prune à poignées rose mauve, tous marqués SOUPLE.",
    facts: [["Collection", "tapis de yoga, brique, sangle et anneau de Pilates assortis"], ["Couleurs", "rose poudré, prune, couleur liège, anneaux argentés"]],
    tagline: "Reprendre à son rythme, chez soi.", story: "SOUPLE est né pour celles et ceux qui reprennent le yoga ou le Pilates après une longue pause : quatre pièces assorties pour recommencer chez soi, sans se comparer à avant.", positioning: "Yoga et Pilates à la maison, pour reprendre en douceur : tapis, brique, sangle et anneau, à réunir à son rythme.",
    // Prune de la sangle et de l'anneau, rose poudré du tapis, rose mauve des poignées, ivoire rosé des fonds, prune profond.
    palette: { primary: "#5A1B36", secondary: "#E8CFCB", accent: "#B4637A", light: "#FBF3F0", dark: "#2B0E1C" },
  },
};

export async function multiKitProject(userId: string, id: MultiKitId) {
  const main = MULTI_KIT_PRODUCTS[id][0];
  if (id === "souple") return buildKitProject(userId, { id, media: SOUPLE_MEDIA, handle: main.handle, brand: BRANDS.souple, themeName: "Souple", provenance: SOUPLE_PROVENANCE, storeKind: "catalog", sector: "sport", storeType: "multi" }, curateSouple);
  return buildKitProject(userId, { id, media: MULTI_KIT_MEDIA[id], handle: main.handle, brand: BRANDS[id], themeName: "Museau Club", provenance: MULTI_KIT_PROVENANCE, storeKind: "specialty", sector: "animaux", storeType: "multi" }, curateMuseau);
}

/** Questions de la section « faq » (les réponses inconnues restent masquées, prêtes dans l'éditeur). */
const faqRows = (items: [string, string][]) => items.map(([question, answer]) => ({ type: "question", settings: { question, answer: p(answer) }, hidden: answer.includes("[À compléter") }));
/** Cadre d'un diptyque (photo, titre, phrase, lien). */
/** Repère d'un lookbook sur un vrai produit : le lien d'achat mène à SA fiche, jamais à une autre. */
const spot = (x: number, y: number, title: string, text: string, link: string) => ({ type: "hotspot", settings: { x, y, title, text: p(text), link } });

/** Fiche de chaque produit : description, points et vues propres ; la rangée « La collection assortie » relie les quatre. */
type Fiche = { eyebrow: string; text: string; highlights: string; description: string; seo: { title: string; description: string }; tags: string[] };

// ─── MUSEAU CLUB ──────────────────────────────────────────────────────────────────────────────────────────────────
const MUSEAU_FICHES: Record<string, Fiche> = {
  harnais: {
    eyebrow: "Harnais · à porter pour la promenade",
    text: "La pièce que votre chien porte pour la promenade : il s'enfile à la maison, se ferme sur les côtés, et la laisse s'accroche à l'anneau du dessus.",
    highlights: "Se porte sur le poitrail\nDeux boucles noires à clip sur les côtés\nAnneau argenté pour la laisse, sur le dessus\nSangle bleu cobalt doublée de maille crème",
    description: p("Son rôle : se porter pendant la promenade. Il passe sur le poitrail et reçoit la laisse sur l'anneau argenté du dessus.") + p("Quand l'utiliser : enfilez-le à la maison, avant de passer la porte, puis accrochez la laisse.") + p("Ce qu'on voit : une sangle bleu cobalt doublée de maille crème bordée d'un liseré bleu, deux boucles noires sur les côtés, des passants noirs qui tiennent les bretelles.") + p("Avec quelle pièce : la laisse, qui s'accroche à son anneau ; la pochette s'accroche ensuite à la laisse."),
    seo: { title: "Harnais MUSEAU CLUB cobalt : à porter pour la promenade", description: "Le harnais MUSEAU CLUB se porte sur le poitrail et reçoit la laisse sur son anneau argenté. Cinq vues : de trois quarts, de profil, en gros plan." },
    tags: ["harnais", "bleu cobalt", "premier chien"],
  },
  laisse: {
    eyebrow: "Laisse · la pièce de chaque sortie",
    text: "La seule pièce qui sert à chaque sortie : son mousqueton s'accroche au harnais comme au collier, la pochette s'attache à elle.",
    highlights: "S'accroche au harnais ou au collier\nMousqueton argenté\nPoignée doublée de maille crème\nLa pochette à sacs s'y accroche",
    description: p("Son rôle : relier votre chien à votre main, à chaque sortie. Son mousqueton argenté s'accroche à l'anneau du harnais comme à celui du collier.") + p("Quand l'utiliser : à chaque fois que vous passez la porte, quelle que soit la pièce que porte votre chien.") + p("Ce qu'on voit : une sangle bleu cobalt, une poignée en boucle doublée de maille crème, l'étiquette MUSEAU CLUB cousue près de la main.") + p("Avec quelle pièce : le harnais ou le collier d'un côté, la pochette à sacs accrochée à elle."),
    seo: { title: "Laisse MUSEAU CLUB cobalt : la pièce de chaque sortie", description: "La laisse MUSEAU CLUB s'accroche au harnais comme au collier et reçoit la pochette : sangle cobalt, poignée en maille crème, mousqueton argenté." },
    tags: ["laisse", "bleu cobalt", "premier chien"],
  },
  collier: {
    eyebrow: "Collier · à porter au quotidien",
    text: "La pièce que votre chien garde autour du cou au quotidien ; pour une sortie courte, la même laisse s'accroche à son anneau.",
    highlights: "Se porte autour du cou\nBoucle noire à clip et passant noir\nAnneau argenté pour la laisse\nIntérieur en maille crème côté cou",
    description: p("Son rôle : se porter au quotidien, autour du cou. Il garde l'étiquette MUSEAU CLUB sur le côté et un anneau argenté pour la laisse.") + p("Quand l'utiliser : pour le petit tour du soir, la laisse accrochée à son anneau suffit ; pour la promenade, le harnais prend le relais avec la même laisse.") + p("Ce qu'on voit : une sangle bleu cobalt doublée de maille crème côté cou, une boucle noire, un passant noir, un anneau argenté à côté de l'étiquette.") + p("Avec quelle pièce : la laisse, la même que celle du harnais."),
    seo: { title: "Collier MUSEAU CLUB cobalt : à porter au quotidien", description: "Le collier MUSEAU CLUB se porte au quotidien et reçoit la même laisse que le harnais : bleu cobalt, maille crème, boucle noire, anneau argenté." },
    tags: ["collier", "bleu cobalt", "premier chien"],
  },
  pochette: {
    eyebrow: "Pochette à sacs · pour ne jamais les oublier",
    text: "Elle garde le rouleau de sacs et reste accrochée à la laisse : un sac sort par l'ouverture ronde quand vous en avez besoin.",
    highlights: "S'accroche à la laisse par son mousqueton\nUn rouleau de sacs se range à l'intérieur\nOuverture ronde en façade pour tirer un sac\nTissu bleu cobalt, zip bordé de crème",
    description: p("Son rôle : que les sacs partent à chaque sortie. Accrochée à la laisse, elle suit sans y penser.") + p("Quand l'utiliser : accrochez-la une fois à la laisse ; elle n'en bouge plus.") + p("Ce qu'on voit : un petit étui bleu cobalt fermé par un zip bordé de crème, un mousqueton argenté sur le côté, une ouverture ronde en façade d'où sort un sac.") + p("Avec quelle pièce : la laisse, à laquelle elle s'accroche. Les sacs fournis ou non ne sont pas encore renseignés."),
    seo: { title: "Pochette à sacs MUSEAU CLUB cobalt, accrochée à la laisse", description: "La pochette MUSEAU CLUB s'accroche à la laisse et garde le rouleau de sacs ; un sac sort par l'ouverture ronde. Cinq vues, fermée et ouverte." },
    tags: ["pochette", "bleu cobalt", "premier chien"],
  },
};

function curateMuseau(k: Kit) {
  const { spec, img, section, overlay, faq } = k;
  const items = MUSEAU_PRODUCTS;
  const href = (key: string) => `/products/${items.find((x) => x.key === key)!.handle}`;
  k.demoMeta();
  spec.store.seo = { title: "MUSEAU CLUB | Premier chien : harnais, laisse, collier, pochette", description: "Préparez les premières balades de votre chien : harnais, laisse, collier et pochette MUSEAU CLUB, un rôle clair par pièce, qui s'accrochent entre elles." };

  // ─── Quatre produits, quatre fiches : chaque produit a son propre modèle (texte, points, vues), cloné du modèle composé.
  const baseKey = k.productKey();
  const base = structuredClone(spec.templates[baseKey]);
  const products: StoreProduct[] = items.map((it, i) => {
    const f = MUSEAU_FICHES[it.key];
    const suffix = i === 0 ? spec.store.product.template_suffix ?? "" : `museau_${it.key}`;
    if (i > 0) spec.templates[`product.${suffix}`] = structuredClone(base);
    return {
      ...spec.store.product, contentTarget: `product:${it.key}`, handle: it.handle, title: it.title, vendor: "MUSEAU CLUB", template_suffix: suffix,
      price: null, compare_at_price: null, currency: "EUR", options: [], variants: [{ title: "Default Title", options: [], price: null, available: true }],
      description_html: f.description, images: it.views.map(k.name), tags: f.tags, seo: f.seo,
    };
  });
  spec.store.product = products[0];
  spec.store.products = products.slice(1);
  spec.store.collections = [{ handle: "all", title: "La collection", description: "Pour les premières balades : le harnais pour la promenade, le collier au quotidien, la laisse de chaque sortie, la pochette pour les sacs.", products: products.map((x) => x.handle) }];
  const keyOf = (pr: StoreProduct) => (pr.template_suffix ? `product.${pr.template_suffix}` : "product");
  const mpSchema = sectionSchema(spec, "main-product")!;
  const block = (type: string, settings: Record<string, unknown>) => ({ type, settings: withDefaults(mpSchema.blocks.find((b) => b.type === type)?.settings, settings) });
  products.forEach((pr, i) => {
    const it = items[i], f = MUSEAU_FICHES[it.key], key = keyOf(pr);
    const t = spec.templates[key];
    const mp = t.sections[t.order.find((sid) => t.sections[sid].type === "main-product")!];
    const blocks: [string, { type: string; settings: Record<string, unknown>; disabled?: boolean }][] = [
      ["eyebrow", block("eyebrow", { text: f.eyebrow })],
      ["title", block("title", {})],
      ["price", block("price", {})],
      // L'action juste sous le prix : sur téléphone, produit, titre et bouton tiennent dans le premier écran.
      ["buy", block("buy_buttons", { picker: "buttons", show_quantity: true, show_dynamic_checkout: false, price_in_button: false })],
      ["text", block("text", { text: p(f.text) })],
      ["highlights", block("highlights", { items: f.highlights, icon: "check", columns: 1 })],
      ["siblings", block("siblings", { collection: "all", heading: "La collection assortie" })],
      ["details", block("collapsible", { heading: "Description", content: f.description, open: false })],
      ["sizes", { ...block("collapsible", { heading: "Tailles et mesures", content: p(TODO(it.key === "pochette" ? "dimensions de la pochette, format des rouleaux de sacs" : "tailles proposées et mesures à prendre")), open: false }), disabled: true }],
      ["materials", { ...block("collapsible", { heading: "Matières et entretien", content: p(TODO("composition et conseils d'entretien")), open: false }), disabled: true }],
      ["shipping", { ...block("collapsible", { heading: "Livraison, retours et garantie", content: p(TODO("zones, délais et frais de livraison ; retours ; garantie")), open: false }), disabled: true }],
    ];
    mp.settings = { ...mp.settings, product_target: pr.contentTarget, purchase_enabled: false, gallery_layout: "stack", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" };
    mp.blocks = Object.fromEntries(blocks);
    mp.block_order = blocks.map(([b]) => b);
  });

  // ─── Accueil : la collection en scène, les quatre pièces, la balade, le collier porté, la pochette à la une, la porte
  // d'entrée, les questions et l'inscription.
  // La démonstration situe ses quatre produits sur la scène : l'ouverture redevient les points interactifs (la bannière de
  // repli, composée faute de repères dans le projet, est retirée avant la rédaction).
  const home = spec.templates.index;
  const firstGrid = home.order.findIndex((sid) => home.sections[sid].type === "fs-products");
  for (const sid of home.order.filter((s, i) => i < firstGrid && home.sections[s].type === "cv-banner")) { delete home.sections[sid]; home.order.splice(home.order.indexOf(sid), 1); }
  overlay("index", [
    section("cv-hotspots", { ...img("ambiance-01.webp"), layout: "side", ratio: "wide", heading_tag: "h1", eyebrow: "Collection de balade pour un premier chien", heading: "Premier chien, premières balades :", heading_accent: "chaque pièce a son rôle", text: p("Harnais, collier, laisse, pochette : on ne sait jamais ce qui sert à quoi. Ici, chaque pièce a un rôle, et toutes s'accrochent entre elles. Touchez un repère pour ouvrir sa fiche."), button_label: "Voir les quatre pièces", button_link: "/collections/all", link_label: "Voir la fiche", show_list: true, demo_note: "", focus_x: 50, focus_y: 50, animation: "fade", animation_speed: "normal", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 64 }, [
      spot(78, 22, "Le harnais", "À porter pour la promenade : sur le poitrail, la laisse s'accroche à son anneau.", href("harnais")),
      spot(60, 76, "La laisse", "La pièce de chaque sortie : elle s'accroche au harnais ou au collier.", href("laisse")),
      spot(52, 50, "Le collier", "À porter au quotidien ; il reçoit la même laisse que le harnais.", href("collier")),
      spot(81, 64, "La pochette à sacs", "Accrochée à la laisse, pour ne jamais partir sans sac.", href("pochette")),
    ]),
    section("fs-products", { layout: "grid", source: "collection", collection: "all", eyebrow: "Une pièce, un rôle", heading: "Ce qui sert à quoi,", heading_accent: "en un coup d'œil", text: p("Le harnais et le collier se portent, la laisse relie, la pochette accompagne. Pour la première sortie : la laisse et l'une des deux pièces à porter."), align: "left", button_label: "Voir les quatre rôles", button_link: "/collections/all", mode_label: "", limit: 4, columns: 4, ratio: "square", show_secondary: true, effect: "rise", stagger: true, hover: true, background: "scheme", color_scheme: "scheme-3", padding_top: 72, padding_bottom: 72 }),
    section("cv-banner", { ...img("ambiance-02.webp"), layout: "background", eyebrow: "Le harnais · à porter", heading: "Pour la promenade, de la porte jusqu'au parc", heading_tag: "h2", heading_accent: "", text: p("Enfilez-le à la maison, fermez les deux boucles noires sur les côtés, accrochez la laisse à l'anneau du dessus : vous êtes prêts."), price_text: "", price_note: "", button_label: "Voir le harnais", button_link: href("harnais"), note: "", focus_x: 56, focus_y: 46, animation: "fade", animation_speed: "normal", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 24 }),
    section("image-with-text", { ...img("ambiance-04.webp"), layout: "image-left", ratio: "square", reveal: "up", parallax: false, eyebrow: "Le collier · à porter", heading: "Au quotidien, et pour le petit tour du soir", text: p("Fermé par sa boucle noire, doublé de maille crème côté cou, il porte l'étiquette MUSEAU CLUB. Pour une sortie courte, la même laisse s'accroche à son anneau."), button_label: "Voir le collier", button_link: href("collier"), color_scheme: "scheme-1", padding_top: 48, padding_bottom: 72 }),
    section("featured-purchase", { label: "La pochette", heading: "Pochette à sacs MUSEAU CLUB", text: p("Les premières semaines, on sort souvent. Accrochée à la laisse par son mousqueton, la pochette garde le rouleau de sacs ; un sac sort par l'ouverture ronde."), product: items[3].handle, product_target: "product:pochette", purchase_style: "soft", purchase_enabled: false, image_fit: "contain", gallery_limit: 4, enable_zoom: true, link_label: "Voir la fiche complète", color_scheme: "scheme-3" }),
    section("cta-banner", { ...img("ambiance-03.webp"), heading: "Prêts près de la porte, avant même son arrivée", text: p("La laisse et sa pochette déjà accrochées attendent sur la console : le jour où il arrive, la première balade est prête."), button_label: "Voir la laisse", button_link: href("laisse"), overlay: 50, style: "left", parallax: false, color_scheme: "scheme-2", padding_top: 96, padding_bottom: 96 }),
    section("faq", { eyebrow: "Questions", heading: "Avant les premières sorties", text: "", style: "lines", layout: "side", columns: "1", open_first: false, search: false, contact_text: "", button_label: "Toutes les questions", button_link: "/pages/aide", structured_data: false, color_scheme: "scheme-1" }, faqRows(MUSEAU_FAQ)),
    section("newsletter-media", { ...img("ambiance-09.webp"), layout: "left", eyebrow: "Nouvelles du club", heading: "Être prévenu quand le club ouvre", text: p("Un e-mail à l'ouverture de la boutique. Rien d'autre."), perk_1: "", perk_2: "", perk_3: "", button_label: "Me prévenir", legal: p("Désinscription possible à tout moment depuis chaque e-mail."), color_scheme: "scheme-4" }),
  ]);

  // ─── Fiches : une scène propre à chaque produit, les questions, puis les trois autres pièces (recommandations). ──────
  const scene = (file: string, label: string, heading: string, text: string, button: string, link: string, fx = 50) =>
    section("cv-alternating", { eyebrow: "", heading: "", heading_accent: "", text: "", layout: "image-left", ratio: "landscape", animation: "fade", animation_speed: "normal", color_scheme: "scheme-3", padding_top: 72, padding_bottom: 72 }, [
      { type: "row", settings: { ...img(file), focus_x: fx, focus_y: 50, eyebrow: label, heading, heading_accent: "", text: p(text), button_label: button, button_link: link } },
    ]);
  const ficheFaq = () => faq("Questions sur la collection", [...MUSEAU_FAQ, ...MUSEAU_FAQ_PENDING], "cards", "side", "", { color_scheme: "scheme-1" });
  const recos = () => section("product-recommendations", { eyebrow: "La collection", heading: "Les autres pièces assorties", intent: "complementary", fallback_collection: "all", limit: 3, card_ratio: "square", show_secondary: true, color_scheme: "scheme-1", padding_top: 64, padding_bottom: 96 });
  const pageRows: Record<string, ReturnType<typeof section>[]> = {
    harnais: [scene("ambiance-05.webp", "Avec la laisse", "Le duo des premières promenades", "Sur le plaid au soleil, le harnais et sa laisse : elle s'accroche à l'anneau du dessus, même bleu, même maille crème.", "Voir la laisse", href("laisse"), 40)],
    laisse: [scene("ambiance-07.webp", "Avec le collier", "Pour le petit tour, deux pièces suffisent", "Sur le banc du parc, la laisse accrochée à l'anneau du collier : la sortie courte, sans harnais.", "Voir le collier", href("collier"), 55)],
    collier: [scene("ambiance-10.webp", "Son arrivée", "Tout ce qu'il faut pour l'accueillir", "Les quatre pièces réunies autour d'une boîte : de quoi préparer ses premières balades, ou compléter le collier pièce par pièce.", "Voir les quatre pièces", "/collections/all", 50)],
    pochette: [scene("ambiance-08.webp", "Dans l'entrée", "Prête avant la sortie", "Posée près du harnais sur le carrelage de l'entrée : accrochée à la laisse au moment de partir, elle ne reste plus sur la console.", "Voir le harnais", href("harnais"), 50)],
  };
  products.forEach((pr, i) => overlay(keyOf(pr), [...pageRows[items[i].key], ficheFaq(), recos()]));

  // ─── Pages ──────────────────────────────────────────────────────────────────────────────────────────────────────
  k.page("la-balade", "Les premières balades", { title: "Premières balades : quelle pièce pour quelle sortie | MUSEAU CLUB", description: "Premier chien ? Première promenade, petit tour, départ de la maison : quelles pièces MUSEAU CLUB prendre, et comment elles s'accrochent entre elles." }, [
    ["intro", section("rich-text", { style: "plain", align: "left", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 16 }, [{ type: "text", settings: { text: p("Premier chien ? Voici quelles pièces prendre pour chaque sortie, et comment elles s'accrochent, pour ne plus hésiter au moment de partir.") } }])],
    ["assortis", section("cv-hotspots", { ...img("ambiance-08.webp"), layout: "stacked", ratio: "square", heading_tag: "h2", eyebrow: "Dans l'entrée", heading: "Ce qui attend près de la porte", heading_accent: "", text: p("Le harnais et la pochette, prêts pour la prochaine sortie. Touchez un repère pour ouvrir la fiche."), button_label: "", button_link: "", link_label: "Voir la fiche", show_list: true, demo_note: "", focus_x: 50, focus_y: 50, animation: "fade", animation_speed: "normal", color_scheme: "scheme-3", padding_top: 64, padding_bottom: 64 }, [
      spot(35, 40, "Le harnais", "S'enfile avant de sortir ; la laisse s'accroche dessus.", href("harnais")),
      spot(68, 80, "La pochette à sacs", "S'accroche à la laisse au moment de partir.", href("pochette")),
    ])],
    ["moments", section("cv-alternating", { eyebrow: "Trois sorties", heading: "Quelle pièce pour quelle sortie", heading_accent: "", text: "", layout: "alternate", ratio: "landscape", animation: "fade", animation_speed: "normal", color_scheme: "scheme-1", padding_top: 64, padding_bottom: 72 }, [
      { type: "row", settings: { ...img("ambiance-05.webp"), focus_x: 52, focus_y: 50, eyebrow: "La première promenade", heading: "Le harnais et sa laisse", heading_accent: "", text: p("Pour une après-midi dans l'herbe : le harnais sur le poitrail, la laisse à son anneau, la pochette accrochée."), button_label: "Voir le harnais", button_link: href("harnais") } },
      { type: "row", settings: { ...img("ambiance-07.webp"), focus_x: 58, focus_y: 50, eyebrow: "Le petit tour", heading: "Le collier et sa laisse", heading_accent: "", text: p("Pour une sortie courte : la laisse s'accroche à l'anneau du collier, et c'est parti."), button_label: "Voir le collier", button_link: href("collier") } },
      { type: "row", settings: { ...img("ambiance-09.webp"), focus_x: 45, focus_y: 40, eyebrow: "Au départ", heading: "Le harnais enfilé à la maison", heading_accent: "", text: p("Il se met avant de passer la porte ; la laisse et la pochette s'y ajoutent au moment de partir."), button_label: "Voir le harnais", button_link: href("harnais") } },
    ])],
    ["pochette", section("image-with-text", { ...img("ambiance-06.webp"), layout: "image-right", ratio: "portrait", reveal: "up", parallax: false, eyebrow: "La pochette", heading: "Elle ne quitte plus la laisse", text: p("Accrochée par son mousqueton argenté, le rouleau de sacs à l'intérieur, un sac prêt à sortir par l'ouverture ronde : plus besoin d'y penser."), button_label: "Voir la pochette", button_link: href("pochette"), color_scheme: "scheme-2", padding_top: 72, padding_bottom: 72 })],
    ["collection", section("cv-banner", { ...img("ambiance-01.webp"), layout: "background", eyebrow: "La collection", heading: "Quatre pièces, un seul bleu", heading_tag: "h2", heading_accent: "", text: p("Commencez par la laisse et le harnais ou le collier ; la pochette et la dernière pièce suivront, dans le même bleu cobalt."), price_text: "", price_note: "", button_label: "Voir la collection", button_link: "/collections/all", note: "", focus_x: 62, focus_y: 50, animation: "fade", animation_speed: "normal", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 24 })],
  ]);
  k.page("aide", "Questions et contact", { title: "Questions et contact | MUSEAU CLUB, collection de balade", description: "Par quoi commencer, harnais ou collier, comment les pièces s'accrochent, faut-il tout acheter : nos réponses pour un premier chien, et un formulaire." }, [
    ["faq", faq("Questions fréquentes", [...MUSEAU_FAQ, ...MUSEAU_FAQ_PENDING], "numbered", "stacked", "", { color_scheme: "scheme-1" })],
    ["form", section("contact-form", { eyebrow: "Contact", heading: "Une question avant les premières sorties ?", text: p("Écrivez-nous : le formulaire vérifie les champs avant l'envoi. Dans cette démonstration, aucun message n'est réellement transmis."), email: "", hours: "", response: "", preview_note: true, color_scheme: "scheme-3", padding_top: 64, padding_bottom: 96 })],
  ]);

  // ─── Menus, en-tête « Deux rangées avec offre », pied « Colonnes d'aide et d'informations » ────────────────────────
  spec.store.menus["main-menu"] = { title: "Navigation", links: [
    { title: "La collection", url: "/collections/all", links: items.map((it) => ({ title: it.title.replace(" MUSEAU CLUB cobalt", ""), url: `/products/${it.handle}` })) },
    { title: "Premières balades", url: "/pages/la-balade" },
    { title: "Aide", url: "/pages/aide" },
  ] };
  spec.store.menus.footer = { title: "La collection", links: [...items.map((it) => ({ title: it.title.replace(" MUSEAU CLUB cobalt", ""), url: `/products/${it.handle}` })), { title: "Toute la collection", url: "/collections/all" }] };
  spec.store.menus["footer-aide"] = { title: "Aide", links: [{ title: "Premières balades", url: "/pages/la-balade" }, { title: "Questions et contact", url: "/pages/aide" }, { title: "Recherche", url: "/search" }] };
  const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
  header.settings = { ...header.settings, menu: "main-menu", layout: "two-rows", shape: "bar", icons: "plain", mega_menu: "columns-promo", mobile_menu: "cards", mobile_promo: "top", mobile_submenu: "open", sticky: true, transparent_on_home: false, show_search: true, show_cart: true, cta_label: "", phone: "", color_scheme: "scheme-1" };
  // Sous-menu « La collection » : les quatre pièces en colonnes et l'encart des quatre pièces réunies (aussi en tête du
  // menu du téléphone).
  const promoSchema = sectionSchema(spec, "header")!.blocks.find((b) => b.type === "promo")?.settings;
  header.blocks = { collection: { type: "promo", settings: withDefaults(promoSchema, { image: "", image_asset: k.name("ambiance-10.webp"), eyebrow: "La collection", heading: "Les quatre pièces assorties", button_label: "Tout voir", link: "/collections/all", placement: "both", menu_title: "La collection" }) } };
  header.block_order = ["collection"];
  // Une seule mention de démonstration : celle de l'aperçu (studio et aperçu statique), pas de bandeau d'annonce en plus.
  spec.groups.header.sections = { header };
  spec.groups.header.order = ["header"];
  const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
  footer.settings = { ...footer.settings, style: "columns", show_wordmark: false, show_policies: false, show_payment: false, color_scheme: "scheme-4", logo_asset: "" };
  footer.blocks = {
    about: { type: "text", settings: { heading: "MUSEAU CLUB", text: p("La collection des premières balades : harnais, laisse, collier et pochette à sacs, un rôle par pièce, en bleu cobalt. Marque de démonstration du studio.") } },
    links: { type: "links", settings: { heading: "La collection", menu: "footer" } },
    help: { type: "links", settings: { heading: "Aide", menu: "footer-aide" } },
  };
  // Pas d'inscription dans le pied : l'accueil se termine déjà par « Nouvelles du club » (deux formulaires à la suite sinon).
  footer.block_order = ["about", "links", "help"];
  for (const s of Object.values(spec.groups.footer.sections)) if (s.type !== "footer") s.disabled = true;
  k.finish();
  spec.settings = { ...spec.settings, logo_width: 170 };
}

// ─── SOUPLE ───────────────────────────────────────────────────────────────────────────────────────────────────────
// Fiche de stratégie (consigne de Thomas du 21 octobre, 21 h 45 — brief, hypothèse éditoriale, pas une étude) :
//  utilisateur et acheteur : une personne qui veut reprendre une pratique douce (yoga, Pilates) à la maison après une
//  longue interruption ;
//  situation d'achat : elle a arrêté (travail, enfants, déménagement…) et se dit que c'est le moment de recommencer ;
//  tension (ses mots) : « Ça fait si longtemps que j'ai peur de ne plus y arriver. » ;
//  désir : recommencer sans se comparer à son niveau d'avant ;
//  angle unique : recommencer à son rythme, sans pression de performance ; les quatre accessoires accompagnent la
//  reprise, du premier tapis déroulé au Pilates ;
//  promesse tenable : une pièce suffit pour la première séance (le tapis) ; la brique et la sangle rapprochent ce qui
//  paraît loin ; l'anneau ouvre au Pilates plus tard ; tout se range ; faits = visuels du lot et noms des pièces ;
//  objections : par quoi recommencer, quelle pièce pour quoi, les accessoires remplacent-ils un cours (non), la place,
//  les pièces achetées une à une, prix et commande (information dédiée) ;
//  exclusions : le matériel ne remplace pas un accompagnement ; aucun bienfait, résultat, programme ni niveau promis.
// Rien n'est inventé : prix, matières, dimensions, épaisseur, adhérence, poids, certifications, entretien, garantie et
// livraison ne sont jamais affirmés (blocs masqués, prêts dans l'éditeur). Aucun avis, chiffre, urgence ni vente.
export const SOUPLE_FAQ: [string, string][] = [
  ["J'ai arrêté depuis longtemps : par quoi recommencer ?", "Par le tapis : chaque séance commence dessus. La brique et la sangle s'ajoutent si le sol ou vos pieds paraissent plus loin qu'avant ; l'anneau, le jour où l'envie du Pilates revient."],
  ["Yoga ou Pilates : quelle pièce pour quoi ?", "Le tapis sert aux deux. La brique et la sangle accompagnent le yoga : l'une rapproche le sol, l'autre prolonge vos bras. L'anneau, tenu par ses deux poignées, est l'accessoire du Pilates."],
  ["Ces accessoires remplacent-ils un cours ?", "Non. Ils accompagnent votre pratique à la maison ; pour être guidé dans vos mouvements, un professeur ou un cours reste le bon repère. SOUPLE ne propose pas de programme."],
  ["J'ai peu de place : où tout ranger ?", "Le tapis et la sangle se roulent, la brique et l'anneau se posent debout. Sur nos photos, l'ensemble tient dans une niche ou sur une étagère."],
  ["Que puis-je faire dans cette boutique de démonstration ?", "Parcourir la collection et chaque fiche, avec ses cinq vues. Les prix ne sont pas encore fixés et la commande est désactivée : laissez votre adresse en bas de l'accueil pour recevoir un e-mail à l'ouverture."],
];
export const SOUPLE_FAQ_PENDING: [string, string][] = [
  ["Quelles sont les dimensions de chaque pièce ?", TODO("longueur, largeur et épaisseur du tapis ; dimensions de la brique ; longueur de la sangle ; diamètre de l'anneau")],
  ["En quelles matières sont-elles faites ?", TODO("composition du tapis, de la brique, de la sangle et de l'anneau")],
  ["Le tapis est-il antidérapant ?", TODO("adhérence du tapis, à confirmer par le fabricant")],
  ["Comment les entretenir ?", TODO("nettoyage et rangement de chaque pièce")],
  ["Comment sont-elles livrées ?", TODO("zones, délais et frais de livraison, retours")],
  ["Quelle est la garantie ?", TODO("durée et conditions de garantie")],
];

// Fiches : le rôle de la pièce, une scène concrète, la raison de la choisir, le complément pertinent.
const SOUPLE_FICHES: Record<string, Fiche> = {
  tapis: {
    eyebrow: "Tapis de yoga · pour la première séance",
    text: "La pièce pour recommencer : déroulé, il fait d'un bout de sol votre place pour la séance ; roulé, il se range debout dans un coin.",
    highlights: "Dessus rose poudré, dessous prune\nLogo SOUPLE imprimé en prune\nCoins arrondis\nSe roule pour le rangement",
    description: p("Son rôle : vous donner une place pour reprendre, au salon, dans la chambre ou devant une fenêtre. Yoga ou Pilates, chaque séance commence dessus.") + p("Ce qu'on voit : un dessus rose poudré, un dessous prune, des coins arrondis et le logo SOUPLE imprimé près d'un bout.") + p("Pourquoi lui d'abord : c'est la seule pièce dont toutes les séances ont besoin. La brique et la sangle viennent ensuite s'y poser si vous en ressentez le besoin, l'anneau plus tard."),
    seo: { title: "Tapis de yoga SOUPLE rose poudré, dessous prune | SOUPLE", description: "Le tapis de yoga SOUPLE, rose poudré dessus, prune dessous : la pièce pour reprendre, qui se déroule où vous voulez et se range roulée." },
    tags: ["tapis de yoga", "rose poudré", "prune"],
  },
  brique: {
    eyebrow: "Brique de yoga · quand le sol paraît loin",
    text: "Quand le sol paraît plus loin qu'avant, elle vient à votre rencontre : sous la main, sous l'assise, à plat, sur la tranche ou debout.",
    highlights: "Teinte liège, grain visible\nLogo SOUPLE en prune sur la grande face\nArêtes arrondies\nSe pose à plat, sur la tranche ou debout",
    description: p("Son rôle : rapprocher le sol de vous. Posée à plat, sur la tranche ou debout, elle donne trois hauteurs d'appui, sous une main ou sous l'assise.") + p("Ce qu'on voit : la teinte et le grain du liège, des arêtes arrondies, le logo SOUPLE en prune sur la grande face.") + p("Avec qui : la sangle. L'une rapproche le sol, l'autre prolonge vos bras ; nos photos les montrent ensemble sur un banc."),
    seo: { title: "Brique de yoga SOUPLE couleur liège, arêtes arrondies | SOUPLE", description: "La brique de yoga SOUPLE, couleur liège, logo prune : un appui sous la main ou l'assise, à plat, sur la tranche ou debout. À associer à la sangle." },
    tags: ["brique de yoga", "liège"],
  },
  sangle: {
    eyebrow: "Sangle de yoga · pour prolonger les bras",
    text: "Quand vos mains n'atteignent plus vos pieds comme avant, elle fait le lien : tenue à deux mains ou bouclée par ses anneaux argentés.",
    highlights: "Sangle tissée prune\nDeux anneaux argentés à une extrémité\nÉtiquette SOUPLE cousue\nSe range roulée",
    description: p("Son rôle : faire le lien entre vos mains et ce qu'elles n'atteignent pas encore. Elle se tient à deux mains ou se boucle par ses deux anneaux argentés.") + p("Ce qu'on voit : une bande tissée prune, deux anneaux argentés à une extrémité, l'étiquette SOUPLE cousue à côté, l'autre extrémité simplement cousue.") + p("Pourquoi elle : roulée, elle tient dans une main et se range sur une étagère, à côté du tapis. Avec la brique, elle forme la paire des étirements."),
    seo: { title: "Sangle de yoga SOUPLE prune, deux anneaux argentés | SOUPLE", description: "La sangle de yoga SOUPLE, tissée prune, deux anneaux argentés : elle fait le lien quand vos mains n'atteignent pas vos pieds, puis se range roulée." },
    tags: ["sangle de yoga", "prune"],
  },
  anneau: {
    eyebrow: "Anneau de Pilates · pour varier ensuite",
    text: "L'accessoire du Pilates : un cercle prune que l'on tient par ses deux poignées rose mauve, entre les paumes ou entre les genoux.",
    highlights: "Cercle prune strié\nDeux poignées rose mauve marquées SOUPLE\nSe pose debout ou à plat",
    description: p("Son rôle : ouvrir la porte au Pilates, sur le même tapis. On le tient par ses deux poignées, entre les paumes ou entre les genoux.") + p("Ce qu'on voit : un cercle prune strié et deux poignées rose mauve placées face à face, chacune marquée du logo SOUPLE.") + p("Pourquoi lui : quand la routine est revenue et que vous avez envie d'autre chose que la séance d'hier. Après, il se pose debout contre un mur ou contre la brique."),
    seo: { title: "Anneau de Pilates SOUPLE prune, poignées rose mauve | SOUPLE", description: "L'anneau de Pilates SOUPLE, cercle prune, deux poignées rose mauve : tenu entre les paumes ou les genoux, pour une autre séance sur le même tapis." },
    tags: ["anneau de Pilates", "prune", "rose mauve"],
  },
};

function curateSouple(k: Kit) {
  const { spec, img, section, overlay, faq } = k;
  const items = SOUPLE_PRODUCTS;
  const href = (key: string) => `/products/${items.find((x) => x.key === key)!.handle}`;
  const short = (key: string) => ({ tapis: "Le tapis", brique: "La brique", sangle: "La sangle", anneau: "L'anneau de Pilates" })[key]!;
  k.demoMeta();
  spec.store.seo = { title: "SOUPLE | Reprendre le yoga et le Pilates chez soi, à son rythme", description: "Vous reprenez après une longue pause ? Tapis, brique, sangle et anneau de Pilates SOUPLE pour recommencer chez vous, à votre rythme, pièce par pièce." };

  // ─── Quatre produits, quatre fiches (modèle cloné du modèle composé : texte, points et vues propres).
  const baseKey = k.productKey();
  const base = structuredClone(spec.templates[baseKey]);
  const products: StoreProduct[] = items.map((it, i) => {
    const f = SOUPLE_FICHES[it.key];
    const suffix = i === 0 ? spec.store.product.template_suffix ?? "" : `souple_${it.key}`;
    if (i > 0) spec.templates[`product.${suffix}`] = structuredClone(base);
    return {
      ...spec.store.product, contentTarget: `product:${it.key}`, handle: it.handle, title: it.title, vendor: "SOUPLE", template_suffix: suffix,
      price: null, compare_at_price: null, currency: "EUR", options: [], variants: [{ title: "Default Title", options: [], price: null, available: true }],
      description_html: f.description, images: it.views.map(k.name), tags: f.tags, seo: f.seo,
    };
  });
  spec.store.product = products[0];
  spec.store.products = products.slice(1);
  spec.store.collections = [{ handle: "all", title: "Reprendre chez soi : les quatre pièces", description: "Le tapis pour la première séance, la brique pour un appui, la sangle pour prolonger les bras, l'anneau pour le Pilates. Une à une, sans dépareiller.", products: products.map((x) => x.handle) }];
  const keyOf = (pr: StoreProduct) => (pr.template_suffix ? `product.${pr.template_suffix}` : "product");
  const mpSchema = sectionSchema(spec, "main-product")!;
  const block = (type: string, settings: Record<string, unknown>) => ({ type, settings: withDefaults(mpSchema.blocks.find((b) => b.type === type)?.settings, settings) });
  products.forEach((pr, i) => {
    const it = items[i], f = SOUPLE_FICHES[it.key], key = keyOf(pr);
    const t = spec.templates[key];
    const mp = t.sections[t.order.find((sid) => t.sections[sid].type === "main-product")!];
    const blocks: [string, { type: string; settings: Record<string, unknown>; disabled?: boolean }][] = [
      ["eyebrow", block("eyebrow", { text: f.eyebrow })],
      ["title", block("title", {})],
      ["price", block("price", {})],
      // L'action juste sous le prix : sur téléphone, produit entier, nom et bouton tiennent dans le premier écran.
      ["buy", block("buy_buttons", { picker: "buttons", show_quantity: true, show_dynamic_checkout: false, price_in_button: false })],
      ["text", block("text", { text: p(f.text) })],
      ["highlights", block("highlights", { items: f.highlights, icon: "check", columns: 1 })],
      ["siblings", block("siblings", { collection: "all", heading: "Les quatre pièces" })],
      ["details", block("collapsible", { heading: "Description", content: f.description, open: false })],
      ["sizes", { ...block("collapsible", { heading: "Dimensions", content: p(TODO(it.key === "tapis" ? "longueur, largeur et épaisseur du tapis" : it.key === "brique" ? "dimensions de la brique" : it.key === "sangle" ? "longueur et largeur de la sangle" : "diamètre de l'anneau")), open: false }), disabled: true }],
      ["materials", { ...block("collapsible", { heading: "Matières et entretien", content: p(TODO("composition et conseils d'entretien")), open: false }), disabled: true }],
      ["shipping", { ...block("collapsible", { heading: "Livraison, retours et garantie", content: p(TODO("zones, délais et frais de livraison ; retours ; garantie")), open: false }), disabled: true }],
    ];
    mp.settings = { ...mp.settings, product_target: pr.contentTarget, purchase_enabled: false, gallery_layout: "carousel", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" };
    mp.blocks = Object.fromEntries(blocks);
    mp.block_order = blocks.map(([b]) => b);
  });

  // ─── Accueil : le désir (l'ouverture plein écran), l'exploration (la mosaïque), la projection (la phrase, le tapis
  // au soleil, l'anneau), le choix (la liste, la sangle), la réassurance (les questions), la conclusion (l'inscription).
  // La composition, faite avant que les trois autres produits n'existent, a déjà posé l'ouverture plein écran ; la
  // mosaïque, masquée faute de produits, est réécrite avec les quatre pièces.
  const tile = (file: string, title: string, link: string, text = "") => ({ type: "collection", settings: { ...img(file), title, text, link } });
  overlay("index", [
    section("ed-opening", { ...img("ambiance-01.webp"), mobile_image: "", mobile_image_asset: k.name("ambiance-08.webp"), layout: "fullscreen", heading_tag: "h1", label: "Yoga et Pilates chez soi", heading: "Reprendre en douceur, à votre rythme, chez vous.", text: p("Ça fait longtemps ? Déroulez le tapis et faites la séance que vous pouvez ce soir. Personne ne vous compare à votre niveau d'avant."), button_label: "Choisir ma première pièce", button_link: "/collections/all", focus_x: 62, focus_y: 60, mobile_focus_x: 50, mobile_focus_y: 70, copy_surface: true, caption: "", motion: "reveal", color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0 }),
    section("fs-collections", { layout: "asym", heading_tag: "h2", eyebrow: "La collection", heading: "Pas de niveau à retrouver.", heading_accent: "Un rythme à reprendre.", text: p("Quatre accessoires assortis pour le yoga et le Pilates à la maison. Le tapis suffit pour la première séance ; la brique et la sangle rapprochent ce qui paraît loin, l'anneau ouvre au Pilates."), align: "left", button_label: "Voir les quatre pièces", button_link: "/collections/all", show_count: false, effect: "rise", stagger: true, hover: true, background: "scheme", color_scheme: "scheme-1", padding_top: 72, padding_bottom: 72 }, [
      tile("ambiance-05.webp", "Toute la collection", "/collections/all", "Quatre pièces"),
      ...items.map((it) => tile({ tapis: "tapis-05.webp", brique: "brique-01.webp", sangle: "sangle-05.webp", anneau: "anneau-02.webp" }[it.key]!, short(it.key), href(it.key))),
    ]),
    section("rich-text", { style: "reveal", align: "left", color_scheme: "scheme-2", padding_top: 80, padding_bottom: 80 }, [
      { type: "eyebrow", settings: { text: "Sans pression" } },
      { type: "heading", settings: { text: "Personne ne vous chronomètre. La séance de ce soir peut être courte, et celle de demain aussi.", size: "h2" } },
    ]),
    section("fs-products", { layout: "list", source: "manual", collection: "all", eyebrow: "Une pièce, un rôle", heading: "Recommencez avec une pièce,", heading_accent: "ajoutez les autres plus tard", text: p("Chaque pièce accompagne un moment de la reprise : choisissez celle dont vous avez besoin aujourd'hui."), align: "left", button_label: "Comparer les fiches", button_link: "/collections/all", mode_label: "", limit: 4, columns: 4, ratio: "square", show_secondary: true, effect: "fade", stagger: true, hover: true, background: "scheme", color_scheme: "scheme-1", padding_top: 80, padding_bottom: 80 }, [
      { type: "product", settings: { product: items[0].handle, note: "Pour la première séance : tout se fait dessus." } },
      { type: "product", settings: { product: items[1].handle, note: "Quand le sol paraît plus loin qu'avant : un appui sous la main." } },
      { type: "product", settings: { product: items[2].handle, note: "Quand les mains n'atteignent plus les pieds : elle fait le lien." } },
      { type: "product", settings: { product: items[3].handle, note: "Plus tard, pour une séance de Pilates sur le même tapis." } },
    ]),
    section("ed-scene", { ...img("ambiance-07.webp"), layout: "panorama", label: "Le tapis", heading: "Le tapis déroulé, la reprise commence.", text: p("Il ne demande que sa place au sol : devant la fenêtre ou au pied du canapé. Roulé, il attend debout la prochaine séance."), button_label: "Voir le tapis", button_link: href("tapis"), focus_x: 50, focus_y: 55, mobile_focus_x: 50, mobile_focus_y: 60, caption: "", motion: "drift", color_scheme: "scheme-3", padding_top: 0, padding_bottom: 64 }),
    section("image-with-text", { ...img("ambiance-04.webp"), layout: "overlap", ratio: "portrait", reveal: "up", parallax: false, eyebrow: "L'anneau de Pilates", heading: "Et un soir, l'envie du Pilates", text: p("Quand la routine est revenue : même tapis, autre séance. L'anneau se tient par ses deux poignées rose mauve, entre les paumes ou entre les genoux."), button_label: "Voir l'anneau", button_link: href("anneau"), color_scheme: "scheme-4", padding_top: 80, padding_bottom: 80 }),
    section("featured-purchase", { label: "La sangle", heading: "Sangle de yoga SOUPLE prune", text: p("Quand vos mains n'atteignent plus vos pieds comme avant, elle fait le lien : tenue à deux mains ou bouclée par ses deux anneaux argentés. Roulée, elle tient dans une main."), product: items[2].handle, product_target: "product:sangle", purchase_style: "compact", purchase_enabled: false, image_fit: "contain", gallery_limit: 5, enable_zoom: true, link_label: "Voir la fiche complète", color_scheme: "scheme-1", motion: "reveal" }),
    section("faq", { eyebrow: "Questions", heading: "Avant de reprendre", text: "", style: "lines", layout: "side", columns: "1", open_first: false, search: false, contact_text: "", button_label: "Toutes les questions", button_link: "/pages/aide", structured_data: false, color_scheme: "scheme-1" }, faqRows(SOUPLE_FAQ)),
    section("newsletter-media", { ...img("ambiance-10.webp"), layout: "background", overlay: 60, eyebrow: "Nouvelles de SOUPLE", heading: "Et si vous repreniez ce soir ?", text: p("Laissez votre adresse : un e-mail à l'ouverture de la boutique. Rien de plus."), perk_1: "", perk_2: "", perk_3: "", button_label: "Me prévenir", legal: p("Désinscription possible à tout moment depuis chaque e-mail."), color_scheme: "scheme-3" }),
  ]);

  // ─── Fiches : la scène de chaque produit en fermeture (la projection), la suite du rituel, les questions. ─────────────
  const closing = (file: string, label: string, heading: string, text: string, button: string, link: string, fy = 50) =>
    section("ed-scene", { ...img(file), layout: "closing", label, heading, text: p(text), button_label: button, button_link: link, focus_x: 50, focus_y: fy, mobile_focus_x: 50, mobile_focus_y: fy, caption: "", motion: "reveal", color_scheme: "scheme-2", padding_top: 72, padding_bottom: 72 });
  const recos = () => section("product-recommendations", { eyebrow: "Les autres pièces", heading: "Pour accompagner la reprise", intent: "complementary", fallback_collection: "all", limit: 3, card_ratio: "square", show_secondary: true, color_scheme: "scheme-1", padding_top: 64, padding_bottom: 72 });
  const ficheFaq = () => faq("Questions sur la collection", [...SOUPLE_FAQ, ...SOUPLE_FAQ_PENDING], "lines", "side", "", { color_scheme: "scheme-1" });
  const scenes: Record<string, ReturnType<typeof section>> = {
    tapis: closing("ambiance-02.webp", "Où le dérouler", "Là où tombe la lumière ce soir", "Il n'a pas besoin d'une pièce à lui : devant une fenêtre, au salon ou au pied du lit. Si le sol paraît loin, la brique s'y pose.", "Voir la brique", href("brique"), 60),
    brique: closing("ambiance-03.webp", "Avec la sangle", "La paire des étirements", "Posées ensemble sur un banc : la brique rapproche le sol, la sangle prolonge les bras. Elles se rangent ensemble aussi.", "Voir la sangle", href("sangle")),
    sangle: closing("ambiance-06.webp", "Rangée", "Un creux d'étagère suffit", "Roulée à côté du tapis, elle attend la prochaine séance sans encombrer la pièce.", "Voir le tapis", href("tapis")),
    anneau: closing("ambiance-09.webp", "Rangé", "Debout contre la brique, prêt pour la prochaine fois", "Il ne demande pas d'étagère : posé debout contre un mur ou contre la brique, il reste à portée de main.", "Voir la brique", href("brique")),
  };
  products.forEach((pr, i) => {
    const key = keyOf(pr);
    overlay(key, [scenes[items[i].key], recos(), ficheFaq()]);
    // Une seule rangée de recommandations (celle du modèle de base, en double, est retirée).
    const t = spec.templates[key];
    for (const sid of t.order.filter((x) => t.sections[x].type === "product-recommendations").slice(1)) { delete t.sections[sid]; t.order.splice(t.order.indexOf(sid), 1); }
  });
  // Catalogue : les quatre pièces sur une rangée (deux par deux sur téléphone).
  for (const sec of Object.values(spec.templates.collection?.sections ?? {})) if (sec.type === "main-collection") sec.settings = { ...sec.settings, columns: 4 };

  // ─── Pages ──────────────────────────────────────────────────────────────────────────────────────────────────────
  k.page("chez-soi", "Reprendre chez soi", { title: "Reprendre le yoga et le Pilates chez soi, même sans place | SOUPLE", description: "Où dérouler le tapis, quelle pièce pour quel geste, comment tout ranger après la séance : reprendre chez soi avec la collection SOUPLE." }, [
    ["intro", section("rich-text", { style: "plain", align: "left", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 16 }, [{ type: "text", settings: { text: p("Pour reprendre, pas besoin d'une pièce en plus ni d'une heure de libre : un bout de sol, le tapis déroulé, les accessoires à portée de main. Voici comment la collection s'installe, puis disparaît après la séance.") } }])],
    ["studio", section("fs-lookbook", { ...img("ambiance-01.webp"), layout: "side", eyebrow: "S'installer", heading: "Chaque pièce à sa place", heading_tag: "h2", text: p("Le tapis au sol, la brique et la sangle à portée de main, l'anneau pour la séance de Pilates. Touchez une pièce pour ouvrir sa fiche."), align: "left", link_label: "Voir la fiche", color_scheme: "scheme-2", padding_top: 64, padding_bottom: 64 }, [
      { type: "marker", settings: { product: items[0].handle, title: "Le tapis : la place de la séance", price_text: "", link: href("tapis"), x: 66, y: 84 } },
      { type: "marker", settings: { product: items[1].handle, title: "La brique : un appui", price_text: "", link: href("brique"), x: 69, y: 50 } },
      { type: "marker", settings: { product: items[2].handle, title: "La sangle : prolonger les bras", price_text: "", link: href("sangle"), x: 49, y: 66 } },
      { type: "marker", settings: { product: items[3].handle, title: "L'anneau : le Pilates", price_text: "", link: href("anneau"), x: 83, y: 30 } },
    ])],
    ["coins", section("ed-diptych", { layout: "pair", label: "Après la séance", heading: "Tout se range en un geste", text: p("Le tapis se roule, les accessoires se posent à côté : la pièce redevient la vôtre, et tout reste prêt pour demain."), button_label: "", button_link: "", motion: "reveal", color_scheme: "scheme-1", padding_top: 72, padding_bottom: 72 }, [
      { type: "frame", settings: { ...img("ambiance-08.webp"), ratio: "portrait", title: "Dans une niche", text: p("Le tapis roulé debout, la brique et la sangle à ses pieds."), link: href("tapis"), link_label: "Voir le tapis", focus_x: 50, focus_y: 50, mobile_focus_x: 50, mobile_focus_y: 50 } },
      { type: "frame", settings: { ...img("ambiance-03.webp"), ratio: "landscape", title: "Sur un banc", text: p("La brique et la sangle posées ensemble, au soleil."), link: href("brique"), link_label: "Voir la brique", focus_x: 50, focus_y: 50, mobile_focus_x: 50, mobile_focus_y: 50 } },
    ])],
    ["collection", section("ed-scene", { ...img("ambiance-05.webp"), layout: "split", label: "La collection", heading: "Une à une, sans dépareiller", text: p("Rose poudré, prune et couleur liège, le même logo sur chaque pièce : recommencez avec le tapis, ajoutez la brique, la sangle ou l'anneau quand la séance le demande."), button_label: "Voir les quatre pièces", button_link: "/collections/all", focus_x: 50, focus_y: 50, mobile_focus_x: 50, mobile_focus_y: 50, caption: "", motion: "reveal", color_scheme: "scheme-4", padding_top: 72, padding_bottom: 72 })],
  ]);
  k.page("aide", "Questions et contact", { title: "Questions et contact | SOUPLE, reprendre chez soi", description: "Par quoi recommencer, quelle pièce pour quoi, remplacent-elles un cours, où tout ranger : nos réponses, et un formulaire." }, [
    ["faq", faq("Vos questions", [...SOUPLE_FAQ, ...SOUPLE_FAQ_PENDING], "numbered", "stacked", "", { color_scheme: "scheme-1" })],
    ["form", section("contact-form", { eyebrow: "Contact", heading: "Une question avant de reprendre ?", text: p("Écrivez-nous : le formulaire vérifie les champs avant l'envoi. Dans cette démonstration, aucun message n'est réellement transmis."), email: "", hours: "", response: "", preview_note: true, color_scheme: "scheme-2", padding_top: 64, padding_bottom: 96 })],
  ]);

  // ─── Menus, en-tête « Collections en cartes » (logo en tête, menu dessous), pied « Boutique éditoriale » ──────────────
  const productLinks = items.map((it) => ({ title: short(it.key), url: href(it.key) }));
  spec.store.menus["main-menu"] = { title: "Navigation", links: [
    { title: "La collection", url: "/collections/all", links: productLinks },
    { title: "Reprendre chez soi", url: "/pages/chez-soi" },
    { title: "Aide", url: "/pages/aide" },
  ] };
  spec.store.menus.footer = { title: "La collection", links: [...productLinks, { title: "Toute la collection", url: "/collections/all" }] };
  spec.store.menus["footer-aide"] = { title: "Aide", links: [{ title: "Reprendre chez soi", url: "/pages/chez-soi" }, { title: "Questions et contact", url: "/pages/aide" }, { title: "Recherche", url: "/search" }] };
  const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
  header.settings = { ...header.settings, menu: "main-menu", layout: "two-rows", shape: "bar", icons: "plain", mega_menu: "cards", mobile_menu: "cards", mobile_promo: "top", mobile_submenu: "open", sticky: true, transparent_on_home: false, show_search: true, show_cart: true, cta_label: "", phone: "", color_scheme: "scheme-1" };
  // Sous-menu « La collection » : chaque pièce en carte illustrée (sa vue principale) et l'encart de la collection.
  const hSchema = sectionSchema(spec, "header")!;
  const extraSchema = hSchema.blocks.find((b) => b.type === "link_extra")?.settings;
  const promoSchema = hSchema.blocks.find((b) => b.type === "promo")?.settings;
  const cardImage: Record<string, string> = { tapis: "tapis-01.webp", brique: "brique-01.webp", sangle: "sangle-01.webp", anneau: "anneau-01.webp" };
  header.blocks = {
    ...Object.fromEntries(items.map((it) => [`card_${it.key}`, { type: "link_extra", settings: withDefaults(extraSchema, { link_title: short(it.key), icon: "none", image: "", image_asset: k.name(cardImage[it.key]) }) }])),
    collection: { type: "promo", settings: withDefaults(promoSchema, { image: "", image_asset: k.name("ambiance-10.webp"), eyebrow: "La collection", heading: "Quatre pièces assorties", button_label: "Tout voir", link: "/collections/all", placement: "both", menu_title: "La collection" }) },
  };
  header.block_order = [...items.map((it) => `card_${it.key}`), "collection"];
  spec.groups.header.sections = { header };
  spec.groups.header.order = ["header"];
  const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
  footer.settings = { ...footer.settings, style: "reference-shop", show_wordmark: true, show_policies: false, show_payment: false, color_scheme: "scheme-3", logo_asset: "" };
  footer.blocks = {
    about: { type: "text", settings: { heading: "SOUPLE", text: p("Tapis, brique, sangle et anneau pour reprendre le yoga et le Pilates chez soi, à son rythme. Marque de démonstration du studio.") } },
    links: { type: "links", settings: { heading: "La collection", menu: "footer" } },
    help: { type: "links", settings: { heading: "Aide", menu: "footer-aide" } },
  };
  // Pas d'inscription dans le pied : l'accueil se termine déjà par « Nouvelles de SOUPLE ».
  footer.block_order = ["about", "links", "help"];
  for (const s of Object.values(spec.groups.footer.sections)) if (s.type !== "footer") s.disabled = true;
  k.finish();
  spec.settings = { ...spec.settings, logo_width: 150 };
}
