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

// MUSEAU CLUB — fiche de stratégie (consigne du 21 octobre, 19 h 50 ; hypothèse éditoriale, pas une étude) :
//  1. cible : un propriétaire de chien en ville, qui sort son chien plusieurs fois par jour, souvent pressé le matin ;
//  2. tension, avec ses mots : « Je cherche la laisse, il me manque toujours un sac, et rien n'est assorti. » ;
//  3. désir : sortir en un geste, fier de son duo — angle unique : la balade commence à la porte, tout est prêt et tout
//     va ensemble ;
//  4. promesse tenable : quatre pièces qui s'accrochent entre elles (mousquetons, anneaux) et partagent le même bleu ;
//     faits : visuels (anneaux, mousquetons, boucles, maille crème, ouverture de la pochette, rangement près de la porte) ;
//  5. objections : harnais ou collier (rôles, même laisse), comment tout s'accroche, l'assortiment, la taille et le prix
//     (non renseignés : information dédiée), les sacs (non affirmés) ;
//  6. parcours : ouverture (la scène et un repère par pièce) → grille (un rôle par pièce) → harnais porté → collier porté
//     → pochette (l'achat) → la porte (tout part ensemble) → FAQ (le choix) → inscription.
export const MUSEAU_FAQ: [string, string][] = [
  ["Harnais ou collier : lequel choisir ?", "Le harnais se porte sur le poitrail, le collier autour du cou ; les deux reçoivent la même laisse sur leur anneau argenté. Prenez celui que votre chien porte déjà volontiers, ou les deux."],
  ["Comment les pièces s'accrochent-elles entre elles ?", "La laisse s'accroche par son mousqueton à l'anneau du harnais ou du collier ; la pochette s'attache à la laisse par le sien. Au moment de sortir, tout part d'un seul geste."],
  ["Les quatre pièces vont-elles ensemble ?", "Oui : même bleu cobalt, même étiquette MUSEAU CLUB, et la même maille crème au harnais, à la poignée de la laisse et à l'intérieur du collier."],
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
    tagline: "La balade commence à la porte.", story: "MUSEAU CLUB est né d'une idée simple : que tout soit prêt au moment de sortir, et que tout aille ensemble, du harnais à la pochette.", positioning: "Une collection de balade pour chien dont les pièces s'accrochent entre elles : harnais, laisse, collier et pochette à sacs, en bleu cobalt.",
    // Bleu cobalt des sangles, crème de la maille, jaune du socle (ambiance-06), crème clair, marine du logo.
    palette: { primary: "#1636C9", secondary: "#EFE6D2", accent: "#F2C14E", light: "#FBF7EE", dark: "#0B1B5E" },
  },
  souple: {
    name: "SOUPLE", product: "Collection de yoga et de Pilates SOUPLE", category: "Accessoires de yoga et de Pilates",
    summary: "Collection de yoga et de Pilates en rose poudré, prune et liège : un tapis rose poudré au dessous prune, une brique couleur liège, une sangle prune à deux anneaux argentés et un anneau de Pilates prune à poignées rose mauve, tous marqués SOUPLE.",
    facts: [["Collection", "tapis de yoga, brique, sangle et anneau de Pilates assortis"], ["Couleurs", "rose poudré, prune, couleur liège, anneaux argentés"]],
    tagline: "Toute la journée, on compte sur vous. Ce moment est à vous.", story: "SOUPLE est né pour celles qui passent leurs journées à répondre aux autres : quatre pièces assorties pour installer chez soi un moment qui leur appartient.", positioning: "Un coin yoga et Pilates à soi, à la maison : tapis, brique, sangle et anneau, à réunir à son rythme.",
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
    eyebrow: "Harnais · pour la promenade",
    text: "Il s'enfile avant de sortir et se porte sur le poitrail ; la laisse assortie s'accroche à l'anneau du dessus.",
    highlights: "Sangle bleu cobalt, doublure en maille crème\nDeux boucles noires à clip sur les côtés\nAnneau argenté sur le dessus\nÉtiquette MUSEAU CLUB sur le poitrail",
    description: p("Son rôle : la promenade. Il se porte sur le poitrail, s'enfile avant de passer la porte et reçoit la laisse sur l'anneau argenté du dessus.") + p("Ce qu'on voit : une sangle bleu cobalt doublée de maille crème bordée d'un liseré bleu, deux boucles noires sur les côtés, des passants noirs qui tiennent les bretelles.") + p("Avec qui : la laisse, qui s'accroche à son anneau, et la pochette, qui s'accroche à la laisse. Les trois partent ensemble."),
    seo: { title: "Harnais MUSEAU CLUB cobalt et maille crème | MUSEAU CLUB", description: "Harnais bleu cobalt doublé de maille crème : boucles noires, anneau argenté, étiquette MUSEAU CLUB. Cinq vues, de trois quarts, de profil et en gros plan." },
    tags: ["harnais", "bleu cobalt", "maille crème"],
  },
  laisse: {
    eyebrow: "Laisse · le lien de l'ensemble",
    text: "Elle relie tout : son mousqueton s'accroche au harnais ou au collier, la pochette s'attache à elle, la main tient la poignée doublée.",
    highlights: "Sangle bleu cobalt\nPoignée doublée de maille crème\nMousqueton argenté\nÉtiquette MUSEAU CLUB près de la poignée",
    description: p("Son rôle : relier les pièces entre elles. Son mousqueton argenté s'accroche à l'anneau du harnais comme à celui du collier.") + p("Ce qu'on voit : une sangle bleu cobalt, une poignée en boucle doublée de maille crème, l'étiquette MUSEAU CLUB cousue près de la main.") + p("Pourquoi elle : c'est la pièce que l'on prend à chaque sortie. La pochette à sacs s'y accroche et ne la quitte plus."),
    seo: { title: "Laisse MUSEAU CLUB cobalt, poignée en maille crème | MUSEAU CLUB", description: "Laisse en sangle bleu cobalt, poignée doublée de maille crème et mousqueton argenté. Cinq vues : dépliée, enroulée et en gros plan." },
    tags: ["laisse", "bleu cobalt", "maille crème"],
  },
  collier: {
    eyebrow: "Collier · pour tous les jours",
    text: "Fermé par sa boucle noire, doublé de maille crème côté cou : il reçoit la même laisse que le harnais.",
    highlights: "Sangle bleu cobalt, intérieur en maille crème\nBoucle noire à clip et passant noir\nAnneau argenté\nÉtiquette MUSEAU CLUB",
    description: p("Son rôle : le quotidien. Il se porte autour du cou, garde l'étiquette MUSEAU CLUB sur le côté et reçoit la laisse pour le tour du parc.") + p("Ce qu'on voit : une sangle bleu cobalt doublée de maille crème côté cou, une boucle noire, un passant noir, un anneau argenté à côté de l'étiquette.") + p("Avec qui : la laisse, pour les sorties courtes. Le harnais prend le relais pour les longues promenades, avec la même laisse."),
    seo: { title: "Collier MUSEAU CLUB cobalt doublé de maille crème | MUSEAU CLUB", description: "Collier bleu cobalt à l'intérieur en maille crème : boucle noire, anneau argenté, étiquette MUSEAU CLUB. Cinq vues, fermé, ouvert et en gros plan." },
    tags: ["collier", "bleu cobalt", "maille crème"],
  },
  pochette: {
    eyebrow: "Pochette à sacs · toujours accrochée",
    text: "Accrochée à la laisse par son mousqueton, elle garde le rouleau de sacs ; un sac sort par l'ouverture ronde.",
    highlights: "Tissu bleu cobalt, zip bordé de crème\nMousqueton argenté sur le côté\nOuverture ronde en façade pour tirer un sac\nUn rouleau de sacs se range à l'intérieur",
    description: p("Son rôle : que les sacs ne soient plus jamais oubliés. Accrochée à la laisse, elle part à chaque sortie sans y penser.") + p("Ce qu'on voit : un petit étui bleu cobalt fermé par un zip bordé de crème, un mousqueton argenté sur le côté, une ouverture ronde en façade d'où sort un sac.") + p("Avec qui : la laisse, à laquelle elle s'accroche. Le rouleau de sacs se range à l'intérieur."),
    seo: { title: "Pochette à sacs MUSEAU CLUB cobalt | MUSEAU CLUB", description: "Pochette à sacs bleu cobalt : zip bordé de crème, mousqueton argenté, ouverture ronde en façade. Cinq vues, fermée, ouverte et en gros plan." },
    tags: ["pochette", "bleu cobalt"],
  },
};

function curateMuseau(k: Kit) {
  const { spec, img, section, overlay, faq } = k;
  const items = MUSEAU_PRODUCTS;
  const href = (key: string) => `/products/${items.find((x) => x.key === key)!.handle}`;
  k.demoMeta();
  spec.store.seo = { title: "MUSEAU CLUB | Harnais, laisse, collier et pochette à sacs assortis pour chien", description: "La balade commence à la porte : harnais, laisse, collier et pochette à sacs MUSEAU CLUB en bleu cobalt, qui s'accrochent entre eux. Prêts en un geste." };

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
  spec.store.collections = [{ handle: "all", title: "La collection", description: "Le harnais pour la promenade, le collier pour tous les jours, la laisse qui relie tout, la pochette qui ne la quitte plus. Même bleu cobalt.", products: products.map((x) => x.handle) }];
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
    section("cv-hotspots", { ...img("ambiance-01.webp"), layout: "side", ratio: "wide", heading_tag: "h1", eyebrow: "Collection de balade pour chien", heading: "Tout pour la balade,", heading_accent: "prêt à la porte", text: p("Harnais, laisse, collier et pochette à sacs en bleu cobalt : la laisse s'accroche au harnais ou au collier, la pochette à la laisse. Touchez un repère pour ouvrir sa fiche."), button_label: "Voir les quatre pièces", button_link: "/collections/all", link_label: "Voir la fiche", show_list: true, demo_note: "", focus_x: 50, focus_y: 50, animation: "fade", animation_speed: "normal", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 64 }, [
      spot(78, 22, "Le harnais", "Sur le poitrail, pour la promenade : la laisse s'accroche à son anneau.", href("harnais")),
      spot(60, 76, "La laisse", "Le lien de l'ensemble : elle reçoit la pochette et s'accroche au harnais ou au collier.", href("laisse")),
      spot(52, 50, "Le collier", "Pour tous les jours ; il reçoit la même laisse que le harnais.", href("collier")),
      spot(81, 64, "La pochette à sacs", "Accrochée à la laisse : un sac sort par l'ouverture ronde.", href("pochette")),
    ]),
    section("fs-products", { layout: "grid", source: "collection", collection: "all", eyebrow: "Une pièce, un rôle", heading: "Quatre pièces", heading_accent: "qui s'accrochent entre elles", text: p("Chacune a son moment dans la balade et s'attache à la suivante : commencez par celle qui vous manque."), align: "left", button_label: "Comparer les quatre pièces", button_link: "/collections/all", mode_label: "", limit: 4, columns: 4, ratio: "square", show_secondary: true, effect: "rise", stagger: true, hover: true, background: "scheme", color_scheme: "scheme-3", padding_top: 72, padding_bottom: 72 }),
    section("cv-banner", { ...img("ambiance-02.webp"), layout: "background", eyebrow: "Le harnais", heading: "Sur le poitrail, de la porte jusqu'au parc", heading_tag: "h2", heading_accent: "", text: p("Il s'enfile avant de sortir, se ferme par ses deux boucles noires sur les côtés, et la laisse s'accroche à l'anneau du dessus."), price_text: "", price_note: "", button_label: "Voir le harnais", button_link: href("harnais"), note: "", focus_x: 56, focus_y: 46, animation: "fade", animation_speed: "normal", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 24 }),
    section("image-with-text", { ...img("ambiance-04.webp"), layout: "image-left", ratio: "square", reveal: "up", parallax: false, eyebrow: "Le collier", heading: "Pour le petit tour du quotidien", text: p("Fermé par sa boucle noire, doublé de maille crème côté cou, il reçoit la même laisse que le harnais : pour une sortie courte, il suffit."), button_label: "Voir le collier", button_link: href("collier"), color_scheme: "scheme-1", padding_top: 48, padding_bottom: 72 }),
    section("featured-purchase", { label: "La pochette", heading: "Pochette à sacs MUSEAU CLUB", text: p("Fini la poche pleine de sacs : la pochette s'accroche à la laisse par son mousqueton, le rouleau reste à l'intérieur, un sac sort par l'ouverture ronde."), product: items[3].handle, product_target: "product:pochette", purchase_style: "soft", purchase_enabled: false, image_fit: "contain", gallery_limit: 4, enable_zoom: true, link_label: "Voir la fiche complète", color_scheme: "scheme-3" }),
    section("cta-banner", { ...img("ambiance-03.webp"), heading: "Rangés près de la porte, ils partent avec vous", text: p("La laisse et sa pochette déjà accrochées attendent sur la console : au moment de sortir, on les prend d'un seul geste."), button_label: "Voir la laisse", button_link: href("laisse"), overlay: 50, style: "left", parallax: false, color_scheme: "scheme-2", padding_top: 96, padding_bottom: 96 }),
    section("faq", { eyebrow: "Questions", heading: "Avant de choisir", text: "", style: "lines", layout: "side", columns: "1", open_first: false, search: false, contact_text: "", button_label: "Toutes les questions", button_link: "/pages/aide", structured_data: false, color_scheme: "scheme-1" }, faqRows(MUSEAU_FAQ)),
    section("newsletter-media", { ...img("ambiance-09.webp"), layout: "left", eyebrow: "Nouvelles du club", heading: "Être prévenu quand le club ouvre", text: p("Un e-mail à l'ouverture de la boutique, un autre quand une pièce ou une taille arrive. Rien d'autre."), perk_1: "", perk_2: "", perk_3: "", button_label: "Me prévenir", legal: p("Désinscription possible à tout moment depuis chaque e-mail."), color_scheme: "scheme-4" }),
  ]);

  // ─── Fiches : une scène propre à chaque produit, les questions, puis les trois autres pièces (recommandations). ──────
  const scene = (file: string, label: string, heading: string, text: string, button: string, link: string, fx = 50) =>
    section("cv-alternating", { eyebrow: "", heading: "", heading_accent: "", text: "", layout: "image-left", ratio: "landscape", animation: "fade", animation_speed: "normal", color_scheme: "scheme-3", padding_top: 72, padding_bottom: 72 }, [
      { type: "row", settings: { ...img(file), focus_x: fx, focus_y: 50, eyebrow: label, heading, heading_accent: "", text: p(text), button_label: button, button_link: link } },
    ]);
  const ficheFaq = () => faq("Questions sur la collection", [...MUSEAU_FAQ, ...MUSEAU_FAQ_PENDING], "cards", "side", "", { color_scheme: "scheme-1" });
  const recos = () => section("product-recommendations", { eyebrow: "La collection", heading: "Les autres pièces assorties", intent: "complementary", fallback_collection: "all", limit: 3, card_ratio: "square", show_secondary: true, color_scheme: "scheme-1", padding_top: 64, padding_bottom: 96 });
  const pageRows: Record<string, ReturnType<typeof section>[]> = {
    harnais: [scene("ambiance-05.webp", "Avec la laisse", "Le duo des longues promenades", "Sur le plaid au soleil, le harnais et sa laisse : elle s'accroche à l'anneau du dessus, même bleu, même maille crème.", "Voir la laisse", href("laisse"), 40)],
    laisse: [scene("ambiance-07.webp", "Avec le collier", "Pour le tour du parc, deux pièces suffisent", "Sur le banc du parc, la laisse accrochée à l'anneau du collier : la sortie courte, sans harnais.", "Voir le collier", href("collier"), 55)],
    collier: [scene("ambiance-10.webp", "La collection", "À réunir, ou à offrir ensemble", "Les quatre pièces réunies autour d'une boîte : pour accueillir un chien à la maison, ou compléter le collier pièce par pièce.", "Voir les quatre pièces", "/collections/all", 50)],
    pochette: [scene("ambiance-08.webp", "Dans l'entrée", "Prête avant la sortie", "Posée près du harnais sur le carrelage de l'entrée : accrochée à la laisse au moment de partir, elle ne reste plus sur la console.", "Voir le harnais", href("harnais"), 50)],
  };
  products.forEach((pr, i) => overlay(keyOf(pr), [...pageRows[items[i].key], ficheFaq(), recos()]));

  // ─── Pages ──────────────────────────────────────────────────────────────────────────────────────────────────────
  k.page("la-balade", "La balade", { title: "Quelle pièce pour quelle sortie : la balade MUSEAU CLUB | MUSEAU CLUB", description: "Longue promenade, tour du parc, départ de la maison : quelles pièces MUSEAU CLUB prendre, et comment elles s'accrochent entre elles." }, [
    ["intro", section("rich-text", { style: "plain", align: "left", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 16 }, [{ type: "text", settings: { text: p("De la porte au parc, chaque pièce a son moment. Voici lesquelles prendre pour chaque sortie, et comment elles s'accrochent entre elles.") } }])],
    ["assortis", section("cv-hotspots", { ...img("ambiance-08.webp"), layout: "stacked", ratio: "square", heading_tag: "h2", eyebrow: "Dans l'entrée", heading: "Ce qui attend près de la porte", heading_accent: "", text: p("Le harnais et la pochette, prêts pour la prochaine sortie. Touchez un repère pour ouvrir la fiche."), button_label: "", button_link: "", link_label: "Voir la fiche", show_list: true, demo_note: "", focus_x: 50, focus_y: 50, animation: "fade", animation_speed: "normal", color_scheme: "scheme-3", padding_top: 64, padding_bottom: 64 }, [
      spot(35, 40, "Le harnais", "S'enfile avant de sortir ; la laisse s'accroche dessus.", href("harnais")),
      spot(68, 80, "La pochette à sacs", "S'accroche à la laisse au moment de partir.", href("pochette")),
    ])],
    ["moments", section("cv-alternating", { eyebrow: "Trois sorties", heading: "Quelle pièce pour quelle sortie", heading_accent: "", text: "", layout: "alternate", ratio: "landscape", animation: "fade", animation_speed: "normal", color_scheme: "scheme-1", padding_top: 64, padding_bottom: 72 }, [
      { type: "row", settings: { ...img("ambiance-05.webp"), focus_x: 52, focus_y: 50, eyebrow: "La longue promenade", heading: "Le harnais et sa laisse", heading_accent: "", text: p("Pour une après-midi dans l'herbe : le harnais sur le poitrail, la laisse à son anneau, la pochette accrochée."), button_label: "Voir le harnais", button_link: href("harnais") } },
      { type: "row", settings: { ...img("ambiance-07.webp"), focus_x: 58, focus_y: 50, eyebrow: "Le tour du parc", heading: "Le collier et sa laisse", heading_accent: "", text: p("Pour une sortie courte : la laisse s'accroche à l'anneau du collier, et c'est parti."), button_label: "Voir le collier", button_link: href("collier") } },
      { type: "row", settings: { ...img("ambiance-09.webp"), focus_x: 45, focus_y: 40, eyebrow: "Au départ", heading: "Le harnais déjà enfilé", heading_accent: "", text: p("Il se met avant de passer la porte ; la laisse et la pochette s'y ajoutent au moment de partir."), button_label: "Voir le harnais", button_link: href("harnais") } },
    ])],
    ["pochette", section("image-with-text", { ...img("ambiance-06.webp"), layout: "image-right", ratio: "portrait", reveal: "up", parallax: false, eyebrow: "La pochette", heading: "Elle ne quitte plus la laisse", text: p("Accrochée par son mousqueton argenté, le rouleau de sacs à l'intérieur, un sac prêt à sortir par l'ouverture ronde : plus besoin d'y penser."), button_label: "Voir la pochette", button_link: href("pochette"), color_scheme: "scheme-2", padding_top: 72, padding_bottom: 72 })],
    ["collection", section("cv-banner", { ...img("ambiance-01.webp"), layout: "background", eyebrow: "La collection", heading: "Quatre pièces, un seul bleu", heading_tag: "h2", heading_accent: "", text: p("Commencez par la pièce qui vous manque : les autres la rejoindront dans le même bleu cobalt, sans dépareiller."), price_text: "", price_note: "", button_label: "Voir la collection", button_link: "/collections/all", note: "", focus_x: 62, focus_y: 50, animation: "fade", animation_speed: "normal", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 24 })],
  ]);
  k.page("aide", "Questions et contact", { title: "Questions et contact | MUSEAU CLUB, collection de balade", description: "Harnais ou collier, comment les pièces s'accrochent, l'assortiment, ce que permet la démonstration : nos réponses, et un formulaire pour le reste." }, [
    ["faq", faq("Questions fréquentes", [...MUSEAU_FAQ, ...MUSEAU_FAQ_PENDING], "numbered", "stacked", "", { color_scheme: "scheme-1" })],
    ["form", section("contact-form", { eyebrow: "Contact", heading: "Une question avant de choisir ?", text: p("Écrivez-nous : le formulaire vérifie les champs avant l'envoi. Dans cette démonstration, aucun message n'est réellement transmis."), email: "", hours: "", response: "", preview_note: true, color_scheme: "scheme-3", padding_top: 64, padding_bottom: 96 })],
  ]);

  // ─── Menus, en-tête « Deux rangées avec offre », pied « Colonnes d'aide et d'informations » ────────────────────────
  spec.store.menus["main-menu"] = { title: "Navigation", links: [
    { title: "La collection", url: "/collections/all", links: items.map((it) => ({ title: it.title.replace(" MUSEAU CLUB cobalt", ""), url: `/products/${it.handle}` })) },
    { title: "La balade", url: "/pages/la-balade" },
    { title: "Aide", url: "/pages/aide" },
  ] };
  spec.store.menus.footer = { title: "La collection", links: [...items.map((it) => ({ title: it.title.replace(" MUSEAU CLUB cobalt", ""), url: `/products/${it.handle}` })), { title: "Toute la collection", url: "/collections/all" }] };
  spec.store.menus["footer-aide"] = { title: "Aide", links: [{ title: "La balade", url: "/pages/la-balade" }, { title: "Questions et contact", url: "/pages/aide" }, { title: "Recherche", url: "/search" }] };
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
    about: { type: "text", settings: { heading: "MUSEAU CLUB", text: p("Harnais, laisse, collier et pochette à sacs qui s'accrochent entre eux, en bleu cobalt. Marque de démonstration du studio.") } },
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
// Fiche de stratégie (consignes de Thomas du 21 octobre, 18 h 31 et 19 h 50 — hypothèse éditoriale, pas une étude) :
//  1. cible : une femme qui passe ses journées à répondre aux besoins des autres (travail, famille, messages) et voudrait,
//     le soir chez elle, quelques minutes de yoga ou de Pilates qui ne soient une obligation pour personne ;
//  2. tension, avec ses mots : « Toute la journée, on compte sur moi. Le sport à la maison, c'est encore une chose à
//     réussir. » ;
//  3. désir : « Pendant quelques minutes, je ne suis disponible que pour moi. » — angle unique : un rendez-vous avec
//     soi, pas une obligation ;
//  4. promesse tenable : une place à soi, installée et rangée en un geste, qui se complète pièce par pièce ; faits :
//     les visuels du lot (couleurs, formes, logo, rangement roulé ou debout) et les noms des pièces ;
//  5. objections : « encore un achat » (une pièce suffit : le tapis), « je n'ai pas la place » (tout se roule ou se pose
//     debout), « laquelle pour quoi ? » (rôle de chaque pièce), « ça va jurer chez moi » (mêmes couleurs), prix et
//     commande (démonstration : dit une seule fois, dans une information dédiée) ;
//  6. parcours : l'ouverture fait se reconnaître ; la mosaïque dit ce qui est vendu ; la phrase pose l'angle ; la liste
//     donne le rôle de chaque pièce ; le tapis répond à la place ; l'anneau ouvre au Pilates ; la sangle montre l'achat ;
//     la FAQ lève les hésitations de choix ; l'inscription conclut. Les fiches expliquent le choix, la page « Pratiquer
//     chez soi » aide à s'installer, l'aide rassure.
// Rien n'est inventé : prix, matières, dimensions, épaisseur, adhérence, poids, certifications, bienfaits pour la santé,
// entretien, garantie et livraison ne sont jamais affirmés (blocs masqués, prêts dans l'éditeur). Aucun avis, chiffre,
// urgence ni vente.
export const SOUPLE_FAQ: [string, string][] = [
  ["Par quelle pièce commencer ?", "Par le tapis : yoga ou Pilates, chaque séance commence dessus. La brique, la sangle et l'anneau s'ajoutent ensuite, selon ce que vous avez envie de pratiquer."],
  ["Yoga ou Pilates : quelle pièce pour quoi ?", "Le tapis sert aux deux. La brique et la sangle accompagnent le yoga : l'une rapproche le sol, l'autre prolonge vos bras. L'anneau, tenu par ses deux poignées, est l'accessoire du Pilates."],
  ["J'ai peu de place : où tout ranger ?", "Le tapis et la sangle se roulent, la brique et l'anneau se posent debout. Sur nos photos, l'ensemble tient dans une niche ou sur une étagère."],
  ["Les pièces vont-elles ensemble si je les prends une à une ?", "Oui : rose poudré, prune et couleur liège, avec le même logo SOUPLE. Ajoutée des mois plus tard, une pièce ne dépareille pas les autres."],
  ["Que puis-je faire dans cette boutique de démonstration ?", "Parcourir la collection et chaque fiche, avec ses cinq vues. Les prix ne sont pas encore fixés et la commande est désactivée : laissez votre adresse en bas de l'accueil pour être prévenue de l'ouverture."],
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
    eyebrow: "Tapis de yoga · pour commencer",
    text: "Déroulé, il fait d'un bout de sol votre place pour la séance ; roulé, il se range debout dans un coin.",
    highlights: "Dessus rose poudré, dessous prune\nLogo SOUPLE imprimé en prune\nCoins arrondis\nSe roule pour le rangement",
    description: p("Son rôle : vous donner une place, au salon, dans la chambre ou devant une fenêtre. Yoga ou Pilates, chaque séance commence dessus.") + p("Ce qu'on voit : un dessus rose poudré, un dessous prune, des coins arrondis et le logo SOUPLE imprimé près d'un bout.") + p("Pourquoi lui d'abord : c'est la seule pièce dont toutes les séances ont besoin. La brique et la sangle viennent ensuite s'y poser, l'anneau aussi."),
    seo: { title: "Tapis de yoga SOUPLE rose poudré, dessous prune | SOUPLE", description: "Le tapis de yoga SOUPLE, rose poudré dessus, prune dessous, coins arrondis : la pièce pour commencer, qui se déroule où vous voulez et se range roulée." },
    tags: ["tapis de yoga", "rose poudré", "prune"],
  },
  brique: {
    eyebrow: "Brique de yoga · pour un appui",
    text: "Quand le sol paraît trop loin, elle vient à votre rencontre : sous la main, sous l'assise, à plat, sur la tranche ou debout.",
    highlights: "Teinte liège, grain visible\nLogo SOUPLE en prune sur la grande face\nArêtes arrondies\nSe pose à plat, sur la tranche ou debout",
    description: p("Son rôle : rapprocher le sol de vous. Posée à plat, sur la tranche ou debout, elle donne trois hauteurs d'appui, sous une main ou sous l'assise.") + p("Ce qu'on voit : la teinte et le grain du liège, des arêtes arrondies, le logo SOUPLE en prune sur la grande face.") + p("Avec qui : la sangle. L'une rapproche le sol, l'autre prolonge vos bras ; nos photos les montrent ensemble sur un banc."),
    seo: { title: "Brique de yoga SOUPLE couleur liège, arêtes arrondies | SOUPLE", description: "La brique de yoga SOUPLE, couleur liège, logo prune : un appui sous la main ou l'assise, à plat, sur la tranche ou debout. À associer à la sangle." },
    tags: ["brique de yoga", "liège"],
  },
  sangle: {
    eyebrow: "Sangle de yoga · pour prolonger les bras",
    text: "Quand vos mains n'atteignent pas vos pieds, elle fait le lien : tenue à deux mains ou bouclée par ses anneaux argentés.",
    highlights: "Sangle tissée prune\nDeux anneaux argentés à une extrémité\nÉtiquette SOUPLE cousue\nSe range roulée",
    description: p("Son rôle : faire le lien entre vos mains et ce qu'elles n'atteignent pas encore. Elle se tient à deux mains ou se boucle par ses deux anneaux argentés.") + p("Ce qu'on voit : une bande tissée prune, deux anneaux argentés à une extrémité, l'étiquette SOUPLE cousue à côté, l'autre extrémité simplement cousue.") + p("Pourquoi elle : roulée, elle tient dans une main et se range sur une étagère, à côté du tapis. Avec la brique, elle forme la paire des étirements."),
    seo: { title: "Sangle de yoga SOUPLE prune, deux anneaux argentés | SOUPLE", description: "La sangle de yoga SOUPLE, tissée prune, deux anneaux argentés : elle fait le lien quand vos mains n'atteignent pas vos pieds, puis se range roulée." },
    tags: ["sangle de yoga", "prune"],
  },
  anneau: {
    eyebrow: "Anneau de Pilates · pour une autre séance",
    text: "L'accessoire du Pilates : un cercle prune que l'on tient par ses deux poignées rose mauve, entre les paumes ou entre les genoux.",
    highlights: "Cercle prune strié\nDeux poignées rose mauve marquées SOUPLE\nSe pose debout ou à plat",
    description: p("Son rôle : ouvrir la porte au Pilates, sur le même tapis. On le tient par ses deux poignées, entre les paumes ou entre les genoux.") + p("Ce qu'on voit : un cercle prune strié et deux poignées rose mauve placées face à face, chacune marquée du logo SOUPLE.") + p("Pourquoi lui : pour les soirs où vous avez envie d'autre chose que la séance d'hier. Après, il se pose debout contre un mur ou contre la brique."),
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
  spec.store.seo = { title: "SOUPLE | Tapis, brique, sangle et anneau pour le yoga et le Pilates chez soi", description: "Toute la journée, on compte sur vous. Ce moment est à vous : tapis rose poudré, brique couleur liège, sangle et anneau prune, à réunir pièce par pièce." };

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
  spec.store.collections = [{ handle: "all", title: "Yoga et Pilates chez soi : les quatre pièces", description: "Le tapis pour commencer, la brique pour un appui, la sangle pour prolonger les bras, l'anneau pour le Pilates. Une à une, sans dépareiller.", products: products.map((x) => x.handle) }];
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
    section("ed-opening", { ...img("ambiance-01.webp"), mobile_image: "", mobile_image_asset: k.name("ambiance-08.webp"), layout: "fullscreen", heading_tag: "h1", label: "Yoga et Pilates chez soi", heading: "Toute la journée, on compte sur vous. Ce moment est à vous.", text: p("Les messages peuvent attendre. Déroulez le tapis : pour une fois, vous n'avez personne à satisfaire."), button_label: "Créer mon coin à moi", button_link: "/collections/all", focus_x: 62, focus_y: 60, mobile_focus_x: 50, mobile_focus_y: 70, copy_surface: true, caption: "", motion: "reveal", color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0 }),
    section("fs-collections", { layout: "asym", heading_tag: "h2", eyebrow: "La collection", heading: "Pas une nouvelle obligation.", heading_accent: "Un rendez\u2011vous avec vous.", text: p("Quatre accessoires assortis pour le yoga et le Pilates à la maison. Le tapis suffit pour commencer ; les autres s'ajoutent quand vous en avez envie."), align: "left", button_label: "Voir les quatre pièces", button_link: "/collections/all", show_count: false, effect: "rise", stagger: true, hover: true, background: "scheme", color_scheme: "scheme-1", padding_top: 72, padding_bottom: 72 }, [
      tile("ambiance-05.webp", "Toute la collection", "/collections/all", "Quatre pièces"),
      ...items.map((it) => tile({ tapis: "tapis-05.webp", brique: "brique-01.webp", sangle: "sangle-05.webp", anneau: "anneau-02.webp" }[it.key]!, short(it.key), href(it.key))),
    ]),
    section("rich-text", { style: "reveal", align: "left", color_scheme: "scheme-2", padding_top: 80, padding_bottom: 80 }, [
      { type: "eyebrow", settings: { text: "Chez vous" } },
      { type: "heading", settings: { text: "Vous n'avez pas besoin d'une pièce en plus. Juste d'un moment qui vous appartient.", size: "h2" } },
    ]),
    section("fs-products", { layout: "list", source: "manual", collection: "all", eyebrow: "Une pièce, un rôle", heading: "Votre rituel se construit", heading_accent: "à votre rythme", text: p("Chaque pièce a sa raison d'être : choisissez celle dont votre séance a besoin aujourd'hui."), align: "left", button_label: "Comparer les fiches", button_link: "/collections/all", mode_label: "", limit: 4, columns: 4, ratio: "square", show_secondary: true, effect: "fade", stagger: true, hover: true, background: "scheme", color_scheme: "scheme-1", padding_top: 80, padding_bottom: 80 }, [
      { type: "product", settings: { product: items[0].handle, note: "Pour commencer : chaque séance se fait dessus." } },
      { type: "product", settings: { product: items[1].handle, note: "Quand le sol paraît trop loin : un appui sous la main." } },
      { type: "product", settings: { product: items[2].handle, note: "Quand les mains n'atteignent pas les pieds." } },
      { type: "product", settings: { product: items[3].handle, note: "Pour une séance de Pilates, sur le même tapis." } },
    ]),
    section("ed-scene", { ...img("ambiance-07.webp"), layout: "panorama", label: "Le tapis", heading: "Votre journée vous emmène partout. Retrouvez votre place ici.", text: p("Il ne demande que sa propre place au sol : devant la fenêtre ou au pied du canapé, puis roulé et rangé debout jusqu'à demain."), button_label: "Voir le tapis", button_link: href("tapis"), focus_x: 50, focus_y: 55, mobile_focus_x: 50, mobile_focus_y: 60, caption: "", motion: "drift", color_scheme: "scheme-3", padding_top: 0, padding_bottom: 64 }),
    section("image-with-text", { ...img("ambiance-04.webp"), layout: "overlap", ratio: "portrait", reveal: "up", parallax: false, eyebrow: "L'anneau de Pilates", heading: "Ce soir, plutôt Pilates ?", text: p("Même tapis, autre séance : l'anneau se tient par ses deux poignées rose mauve, entre les paumes ou entre les genoux. Après, il se pose debout contre un mur."), button_label: "Voir l'anneau", button_link: href("anneau"), color_scheme: "scheme-4", padding_top: 80, padding_bottom: 80 }),
    section("featured-purchase", { label: "La sangle", heading: "Sangle de yoga SOUPLE prune", text: p("Quand vos mains n'atteignent pas vos pieds, elle fait le lien : tenue à deux mains ou bouclée par ses deux anneaux argentés. Roulée, elle tient dans une main."), product: items[2].handle, product_target: "product:sangle", purchase_style: "compact", purchase_enabled: false, image_fit: "contain", gallery_limit: 5, enable_zoom: true, link_label: "Voir la fiche complète", color_scheme: "scheme-1", motion: "reveal" }),
    section("faq", { eyebrow: "Questions", heading: "Avant de choisir", text: "", style: "lines", layout: "side", columns: "1", open_first: false, search: false, contact_text: "", button_label: "Toutes les questions", button_link: "/pages/aide", structured_data: false, color_scheme: "scheme-1" }, faqRows(SOUPLE_FAQ)),
    section("newsletter-media", { ...img("ambiance-10.webp"), layout: "background", overlay: 60, eyebrow: "Nouvelles de SOUPLE", heading: "Et si, ce soir, vous gardiez un moment pour vous ?", text: p("Laissez votre adresse : un e-mail à l'ouverture de la boutique, un autre quand une pièce rejoint la collection. Rien de plus."), perk_1: "", perk_2: "", perk_3: "", button_label: "Me prévenir", legal: p("Désinscription possible à tout moment depuis chaque e-mail."), color_scheme: "scheme-3" }),
  ]);

  // ─── Fiches : la scène de chaque produit en fermeture (la projection), la suite du rituel, les questions. ─────────────
  const closing = (file: string, label: string, heading: string, text: string, button: string, link: string, fy = 50) =>
    section("ed-scene", { ...img(file), layout: "closing", label, heading, text: p(text), button_label: button, button_link: link, focus_x: 50, focus_y: fy, mobile_focus_x: 50, mobile_focus_y: fy, caption: "", motion: "reveal", color_scheme: "scheme-2", padding_top: 72, padding_bottom: 72 });
  const recos = () => section("product-recommendations", { eyebrow: "Les autres pièces", heading: "Pour compléter la séance", intent: "complementary", fallback_collection: "all", limit: 3, card_ratio: "square", show_secondary: true, color_scheme: "scheme-1", padding_top: 64, padding_bottom: 72 });
  const ficheFaq = () => faq("Questions sur la collection", [...SOUPLE_FAQ, ...SOUPLE_FAQ_PENDING], "lines", "side", "", { color_scheme: "scheme-1" });
  const scenes: Record<string, ReturnType<typeof section>> = {
    tapis: closing("ambiance-02.webp", "Où le dérouler", "Là où tombe la lumière ce soir", "Il n'a pas besoin d'une pièce à lui : devant une fenêtre, au salon ou au pied du lit. Quand le sol paraît loin, la brique s'y pose.", "Ajouter la brique", href("brique"), 60),
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
  k.page("chez-soi", "Pratiquer chez soi", { title: "Pratiquer le yoga et le Pilates chez soi, même sans place | SOUPLE", description: "Où dérouler le tapis, quelle pièce pour quel geste, comment tout ranger après la séance : la collection SOUPLE installée à la maison." }, [
    ["intro", section("rich-text", { style: "plain", align: "left", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 16 }, [{ type: "text", settings: { text: p("Pas besoin d'une pièce en plus ni d'une heure de libre : un bout de sol, le tapis déroulé, les accessoires à portée de main. Voici comment la collection s'installe, puis disparaît après la séance.") } }])],
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
    ["collection", section("ed-scene", { ...img("ambiance-05.webp"), layout: "split", label: "La collection", heading: "Une à une, sans dépareiller", text: p("Rose poudré, prune et couleur liège, le même logo sur chaque pièce : commencez par le tapis, ajoutez la brique, la sangle ou l'anneau quand la séance le demande."), button_label: "Voir les quatre pièces", button_link: "/collections/all", focus_x: 50, focus_y: 50, mobile_focus_x: 50, mobile_focus_y: 50, caption: "", motion: "reveal", color_scheme: "scheme-4", padding_top: 72, padding_bottom: 72 })],
  ]);
  k.page("aide", "Questions et contact", { title: "Questions et contact | SOUPLE, yoga et Pilates chez soi", description: "Par quelle pièce commencer, laquelle pour le yoga ou le Pilates, où tout ranger, ce que permet la démonstration : nos réponses, et un formulaire." }, [
    ["faq", faq("Vos questions", [...SOUPLE_FAQ, ...SOUPLE_FAQ_PENDING], "numbered", "stacked", "", { color_scheme: "scheme-1" })],
    ["form", section("contact-form", { eyebrow: "Contact", heading: "Une question avant de choisir ?", text: p("Écrivez-nous : le formulaire vérifie les champs avant l'envoi. Dans cette démonstration, aucun message n'est réellement transmis."), email: "", hours: "", response: "", preview_note: true, color_scheme: "scheme-2", padding_top: 64, padding_bottom: 96 })],
  ]);

  // ─── Menus, en-tête « Collections en cartes » (logo en tête, menu dessous), pied « Boutique éditoriale » ──────────────
  const productLinks = items.map((it) => ({ title: short(it.key), url: href(it.key) }));
  spec.store.menus["main-menu"] = { title: "Navigation", links: [
    { title: "La collection", url: "/collections/all", links: productLinks },
    { title: "Pratiquer chez soi", url: "/pages/chez-soi" },
    { title: "Aide", url: "/pages/aide" },
  ] };
  spec.store.menus.footer = { title: "La collection", links: [...productLinks, { title: "Toute la collection", url: "/collections/all" }] };
  spec.store.menus["footer-aide"] = { title: "Aide", links: [{ title: "Pratiquer chez soi", url: "/pages/chez-soi" }, { title: "Questions et contact", url: "/pages/aide" }, { title: "Recherche", url: "/search" }] };
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
    about: { type: "text", settings: { heading: "SOUPLE", text: p("Tapis, brique, sangle et anneau pour le yoga et le Pilates chez soi, en rose poudré, prune et liège. Marque de démonstration du studio.") } },
    links: { type: "links", settings: { heading: "La collection", menu: "footer" } },
    help: { type: "links", settings: { heading: "Aide", menu: "footer-aide" } },
  };
  // Pas d'inscription dans le pied : l'accueil se termine déjà par « Nouvelles de SOUPLE ».
  footer.block_order = ["about", "links", "help"];
  for (const s of Object.values(spec.groups.footer.sections)) if (s.type !== "footer") s.disabled = true;
  k.finish();
  spec.settings = { ...spec.settings, logo_width: 150 };
}
