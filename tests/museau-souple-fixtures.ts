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

export const MUSEAU_FAQ: [string, string][] = [
  ["Les quatre pièces vont-elles ensemble ?", "Oui : harnais, laisse, collier et pochette partagent le même bleu cobalt et la même étiquette MUSEAU CLUB ; le harnais, la poignée de la laisse et l'intérieur du collier sont doublés de la même maille crème."],
  ["Comment accrocher la pochette ?", "Par le mousqueton argenté fixé sur son côté. Sur nos photos, elle est posée près de la laisse ou du harnais, prête à partir."],
  ["Où voir chaque pièce de près ?", "Chaque fiche montre cinq vues : la pièce entière, de profil ou à plat, puis ses détails en gros plan (boucles, anneaux, mousquetons, maille, étiquette)."],
  ["Comment être prévenu des nouveautés ?", "Laissez votre adresse dans « Nouvelles du club ». Nous écrivons seulement quand il y a du nouveau."],
  ORDER_FAQ("MUSEAU CLUB"),
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
    tagline: "Tout le matériel de balade, en bleu cobalt.", story: "MUSEAU CLUB est né d'une idée simple : une seule couleur pour toute la balade, du harnais à la pochette.", positioning: "Une collection coordonnée pour promener son chien : harnais, laisse, collier et pochette à sacs.",
    // Bleu cobalt des sangles, crème de la maille, jaune du socle (ambiance-06), crème clair, marine du logo.
    palette: { primary: "#1636C9", secondary: "#EFE6D2", accent: "#F2C14E", light: "#FBF7EE", dark: "#0B1B5E" },
  },
  souple: {
    name: "SOUPLE", product: "Collection de yoga et de Pilates SOUPLE", category: "Accessoires de yoga et de Pilates",
    summary: "Collection de yoga et de Pilates en rose poudré, prune et liège : un tapis rose poudré au dessous prune, une brique couleur liège, une sangle prune à deux anneaux argentés et un anneau de Pilates prune à poignées rose mauve, tous marqués SOUPLE.",
    facts: [["Collection", "tapis de yoga, brique, sangle et anneau de Pilates assortis"], ["Couleurs", "rose poudré, prune, couleur liège, anneaux argentés"]],
    tagline: "Quatre pièces pour pratiquer, en rose poudré, prune et liège.", story: "SOUPLE réunit les quatre pièces que l'on sort à chaque séance, dans les mêmes couleurs, pour qu'elles se rangent ensemble.", positioning: "Une collection assortie pour le yoga et le Pilates à la maison : tapis, brique, sangle et anneau.",
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
    eyebrow: "Harnais",
    text: "Pour la promenade : il s'enfile avant de sortir et reçoit sur son anneau argenté la laisse du même bleu cobalt.",
    highlights: "Sangle bleu cobalt, doublure en maille crème\nDeux boucles noires à clip sur les côtés\nAnneau argenté sur le dessus\nÉtiquette MUSEAU CLUB sur le poitrail",
    description: p("Le harnais MUSEAU CLUB marie une sangle bleu cobalt à une doublure en maille crème, bordée d'un liseré bleu. Deux boucles noires le ferment sur les côtés, des passants noirs tiennent les bretelles et un anneau argenté se trouve sur le dessus.") + p("Il se porte avec la laisse assortie, qui s'accroche à son anneau ; le collier et la pochette à sacs complètent la collection, dans le même bleu."),
    seo: { title: "Harnais MUSEAU CLUB cobalt et maille crème | MUSEAU CLUB", description: "Harnais bleu cobalt doublé de maille crème : boucles noires, anneau argenté, étiquette MUSEAU CLUB. Cinq vues, de trois quarts, de profil et en gros plan." },
    tags: ["harnais", "bleu cobalt", "maille crème"],
  },
  laisse: {
    eyebrow: "Laisse",
    text: "Elle s'accroche à l'anneau du harnais ou du collier assortis et se tient par sa poignée doublée de maille crème.",
    highlights: "Sangle bleu cobalt\nPoignée doublée de maille crème\nMousqueton argenté\nÉtiquette MUSEAU CLUB près de la poignée",
    description: p("La laisse MUSEAU CLUB est une sangle bleu cobalt terminée par une poignée en boucle doublée de maille crème. L'étiquette MUSEAU CLUB est cousue près de la main, le mousqueton argenté à l'autre bout.") + p("Elle s'accroche au harnais comme au collier MUSEAU CLUB, et la pochette à sacs assortie s'y attache par son mousqueton."),
    seo: { title: "Laisse MUSEAU CLUB cobalt, poignée en maille crème | MUSEAU CLUB", description: "Laisse en sangle bleu cobalt, poignée doublée de maille crème et mousqueton argenté. Cinq vues : dépliée, enroulée et en gros plan." },
    tags: ["laisse", "bleu cobalt", "maille crème"],
  },
  collier: {
    eyebrow: "Collier",
    text: "Pour tous les jours : il se ferme par sa boucle noire et reçoit la laisse assortie sur son anneau argenté.",
    highlights: "Sangle bleu cobalt, intérieur en maille crème\nBoucle noire à clip et passant noir\nAnneau argenté\nÉtiquette MUSEAU CLUB",
    description: p("Le collier MUSEAU CLUB est une sangle bleu cobalt doublée de maille crème côté cou. Une boucle noire le ferme, un passant noir tient la sangle, et l'anneau argenté voisine avec l'étiquette MUSEAU CLUB.") + p("Il reçoit la laisse assortie sur son anneau argenté ; le harnais et la pochette à sacs complètent la collection, dans le même bleu."),
    seo: { title: "Collier MUSEAU CLUB cobalt doublé de maille crème | MUSEAU CLUB", description: "Collier bleu cobalt à l'intérieur en maille crème : boucle noire, anneau argenté, étiquette MUSEAU CLUB. Cinq vues, fermé, ouvert et en gros plan." },
    tags: ["collier", "bleu cobalt", "maille crème"],
  },
  pochette: {
    eyebrow: "Pochette à sacs",
    text: "Elle s'accroche à la laisse par son mousqueton : le rouleau reste à l'intérieur, un sac se tire par l'ouverture ronde.",
    highlights: "Tissu bleu cobalt, zip bordé de crème\nMousqueton argenté sur le côté\nOuverture ronde en façade pour tirer un sac\nUn rouleau de sacs se range à l'intérieur",
    description: p("La pochette à sacs MUSEAU CLUB est un petit étui bleu cobalt fermé par un zip bordé de crème. Un mousqueton argenté est fixé sur son côté ; en façade, une ouverture ronde laisse sortir un sac.") + p("Son mousqueton l'attache à la laisse assortie : les sacs restent à portée de main pendant toute la balade."),
    seo: { title: "Pochette à sacs MUSEAU CLUB cobalt | MUSEAU CLUB", description: "Pochette à sacs bleu cobalt : zip bordé de crème, mousqueton argenté, ouverture ronde en façade. Cinq vues, fermée, ouverte et en gros plan." },
    tags: ["pochette", "bleu cobalt"],
  },
};

function curateMuseau(k: Kit) {
  const { spec, img, section, overlay, faq } = k;
  const items = MUSEAU_PRODUCTS;
  const href = (key: string) => `/products/${items.find((x) => x.key === key)!.handle}`;
  k.demoMeta();
  spec.store.seo = { title: "MUSEAU CLUB | Harnais, laisse, collier et pochette en bleu cobalt", description: "MUSEAU CLUB, collection de balade pour chiens : harnais, laisse, collier et pochette à sacs assortis, en bleu cobalt et maille crème." };

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
  spec.store.collections = [{ handle: "all", title: "La collection", description: "Harnais, laisse, collier et pochette à sacs MUSEAU CLUB, assortis en bleu cobalt.", products: products.map((x) => x.handle) }];
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
    section("cv-hotspots", { ...img("ambiance-01.webp"), layout: "side", ratio: "wide", heading_tag: "h1", eyebrow: "Collection de balade", heading: "Tout pour la balade,", heading_accent: "assorti en bleu cobalt", text: p("Harnais, laisse, collier et pochette à sacs : prenez la pièce qu'il vous faut ou composez l'ensemble. Touchez un repère pour ouvrir sa fiche."), button_label: "Voir la collection", button_link: "/collections/all", link_label: "Voir la fiche", show_list: true, demo_note: "", focus_x: 50, focus_y: 50, animation: "fade", animation_speed: "normal", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 64 }, [
      spot(78, 22, "Le harnais", "Il s'enfile avant de sortir ; la laisse assortie s'accroche à son anneau.", href("harnais")),
      spot(60, 76, "La laisse", "Elle s'accroche au harnais comme au collier, et se tient par sa poignée en boucle.", href("laisse")),
      spot(52, 50, "Le collier", "Pour tous les jours, avec son étiquette MUSEAU CLUB sur le côté.", href("collier")),
      spot(81, 64, "La pochette à sacs", "Son mousqueton l'attache à la laisse ; un sac se tire par l'ouverture ronde.", href("pochette")),
    ]),
    section("fs-products", { layout: "grid", source: "collection", collection: "all", eyebrow: "La collection", heading: "Quatre pièces", heading_accent: "qui vont ensemble", text: p("Le même bleu cobalt d'une pièce à l'autre : choisissez-en une ou réunissez les quatre."), align: "left", button_label: "Toute la collection", button_link: "/collections/all", mode_label: "", limit: 4, columns: 4, ratio: "square", show_secondary: true, effect: "rise", stagger: true, hover: true, background: "scheme", color_scheme: "scheme-3", padding_top: 72, padding_bottom: 72 }),
    section("cv-banner", { ...img("ambiance-02.webp"), layout: "background", eyebrow: "En balade", heading: "Le harnais, pour chaque promenade", heading_tag: "h2", heading_accent: "", text: p("Enfilé avant de sortir, il reçoit la laisse du même bleu sur son anneau : il ne reste plus qu'à partir."), price_text: "", price_note: "", button_label: "Voir le harnais", button_link: href("harnais"), note: "", focus_x: 56, focus_y: 46, animation: "fade", animation_speed: "normal", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 24 }),
    section("image-with-text", { ...img("ambiance-04.webp"), layout: "image-left", ratio: "square", reveal: "up", parallax: false, eyebrow: "Au quotidien", heading: "Le collier, pour tous les jours", text: p("Il se ferme par sa boucle noire et garde l'étiquette MUSEAU CLUB sur le côté. Son anneau argenté reçoit la laisse assortie."), button_label: "Voir le collier", button_link: href("collier"), color_scheme: "scheme-1", padding_top: 48, padding_bottom: 72 }),
    section("featured-purchase", { label: "La pochette", heading: "Pochette à sacs MUSEAU CLUB", text: p("Elle s'accroche à la laisse par son mousqueton ; le rouleau reste rangé à l'intérieur et un sac se tire par l'ouverture ronde."), product: items[3].handle, product_target: "product:pochette", purchase_style: "soft", purchase_enabled: false, image_fit: "contain", gallery_limit: 4, enable_zoom: true, link_label: "Voir la fiche complète", color_scheme: "scheme-3" }),
    section("cta-banner", { ...img("ambiance-03.webp"), heading: "Prêts avant même de sortir", text: p("Laisse et pochette rangées près de la porte : on les prend ensemble au moment de sortir."), button_label: "Voir la laisse", button_link: href("laisse"), overlay: 50, style: "left", parallax: false, color_scheme: "scheme-2", padding_top: 96, padding_bottom: 96 }),
    section("faq", { eyebrow: "Questions", heading: "Avant la première balade", text: "", style: "lines", layout: "side", columns: "1", open_first: false, search: false, contact_text: "", button_label: "Toutes les questions", button_link: "/pages/aide", structured_data: false, color_scheme: "scheme-1" }, faqRows(MUSEAU_FAQ)),
    section("newsletter-media", { ...img("ambiance-09.webp"), layout: "left", eyebrow: "Nouvelles du club", heading: "Être prévenu de l'ouverture", text: p("Nouvelles pièces, nouvelles photos de balade, ouverture de la boutique : nous écrivons seulement quand il y a du nouveau."), perk_1: "", perk_2: "", perk_3: "", button_label: "S'inscrire", legal: p("Désinscription possible à tout moment depuis chaque e-mail."), color_scheme: "scheme-4" }),
  ]);

  // ─── Fiches : une scène propre à chaque produit, les questions, puis les trois autres pièces (recommandations). ──────
  const scene = (file: string, label: string, heading: string, text: string, button: string, link: string, fx = 50) =>
    section("cv-alternating", { eyebrow: "", heading: "", heading_accent: "", text: "", layout: "image-left", ratio: "landscape", animation: "fade", animation_speed: "normal", color_scheme: "scheme-3", padding_top: 72, padding_bottom: 72 }, [
      { type: "row", settings: { ...img(file), focus_x: fx, focus_y: 50, eyebrow: label, heading, heading_accent: "", text: p(text), button_label: button, button_link: link } },
    ]);
  const ficheFaq = () => faq("Questions fréquentes", [...MUSEAU_FAQ, ...MUSEAU_FAQ_PENDING], "cards", "side", "", { color_scheme: "scheme-1" });
  const recos = () => section("product-recommendations", { eyebrow: "La collection", heading: "Les autres pièces assorties", intent: "complementary", fallback_collection: "all", limit: 3, card_ratio: "square", show_secondary: true, color_scheme: "scheme-1", padding_top: 64, padding_bottom: 96 });
  const pageRows: Record<string, ReturnType<typeof section>[]> = {
    harnais: [scene("ambiance-05.webp", "L'ensemble", "Avec la laisse assortie", "La laisse s'accroche à l'anneau du harnais : même bleu cobalt, même maille crème, de la porte jusqu'au parc.", "Voir la laisse", href("laisse"), 40)],
    laisse: [scene("ambiance-07.webp", "L'ensemble", "Avec le collier assorti", "Pour les sorties de tous les jours, la laisse s'accroche à l'anneau du collier : les deux pièces gardent le même bleu cobalt.", "Voir le collier", href("collier"), 55)],
    collier: [scene("ambiance-10.webp", "La collection", "Avec les trois autres pièces", "Commencez par le collier, ajoutez le harnais, la laisse et la pochette : les quatre pièces partagent le même bleu cobalt.", "Toute la collection", "/collections/all", 50)],
    pochette: [scene("ambiance-08.webp", "L'ensemble", "Avec le harnais assorti", "Accrochée à la laisse, la pochette accompagne le harnais pendant la balade : même bleu, même étiquette MUSEAU CLUB.", "Voir le harnais", href("harnais"), 50)],
  };
  products.forEach((pr, i) => overlay(keyOf(pr), [...pageRows[items[i].key], ficheFaq(), recos()]));

  // ─── Pages ──────────────────────────────────────────────────────────────────────────────────────────────────────
  k.page("la-balade", "La balade", { title: "La balade avec MUSEAU CLUB : harnais, laisse, collier et pochette | MUSEAU CLUB", description: "Au soleil, au parc, devant la porte : la collection MUSEAU CLUB en balade, pièce par pièce, pour choisir ce qui va ensemble." }, [
    ["intro", section("rich-text", { style: "plain", align: "left", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 16 }, [{ type: "text", settings: { text: p("Une balade commence à la porte et finit au parc. Voici la collection MUSEAU CLUB à chacune de ces étapes, avec les pièces qui vont ensemble.") } }])],
    ["assortis", section("cv-hotspots", { ...img("ambiance-08.webp"), layout: "stacked", ratio: "square", heading_tag: "h2", eyebrow: "Assortis", heading: "Le harnais et sa pochette", heading_accent: "", text: p("Touchez un repère pour ouvrir la fiche de la pièce."), button_label: "", button_link: "", link_label: "Voir la fiche", show_list: true, demo_note: "", focus_x: 50, focus_y: 50, animation: "fade", animation_speed: "normal", color_scheme: "scheme-3", padding_top: 64, padding_bottom: 64 }, [
      spot(35, 40, "Le harnais", "Il s'enfile avant de sortir et reçoit la laisse assortie.", href("harnais")),
      spot(68, 80, "La pochette à sacs", "Elle s'accroche à la laisse : même bleu, même étiquette que le harnais.", href("pochette")),
    ])],
    ["moments", section("cv-alternating", { eyebrow: "Trois moments", heading: "Au soleil, au parc, avant de sortir", heading_accent: "", text: "", layout: "alternate", ratio: "landscape", animation: "fade", animation_speed: "normal", color_scheme: "scheme-1", padding_top: 64, padding_bottom: 72 }, [
      { type: "row", settings: { ...img("ambiance-05.webp"), focus_x: 52, focus_y: 50, eyebrow: "Au soleil", heading: "Le harnais et sa laisse", heading_accent: "", text: p("Pour une longue promenade, le harnais et la laisse partent ensemble."), button_label: "Voir le harnais", button_link: href("harnais") } },
      { type: "row", settings: { ...img("ambiance-07.webp"), focus_x: 58, focus_y: 50, eyebrow: "Au parc", heading: "Le collier et sa laisse", heading_accent: "", text: p("Pour un tour au parc, le collier et la laisse assortie font la paire."), button_label: "Voir le collier", button_link: href("collier") } },
      { type: "row", settings: { ...img("ambiance-09.webp"), focus_x: 45, focus_y: 40, eyebrow: "Avant de sortir", heading: "Le harnais déjà enfilé", heading_accent: "", text: p("Le harnais se met avant de passer la porte ; la laisse s'y accroche au moment de partir."), button_label: "Voir le harnais", button_link: href("harnais") } },
    ])],
    ["pochette", section("image-with-text", { ...img("ambiance-06.webp"), layout: "image-right", ratio: "portrait", reveal: "up", parallax: false, eyebrow: "La pochette", heading: "Toujours à portée de main", text: p("Son mousqueton argenté sur le côté, son zip bordé de crème, un sac prêt à sortir par l'ouverture ronde : la pochette suit la balade."), button_label: "Voir la pochette", button_link: href("pochette"), color_scheme: "scheme-2", padding_top: 72, padding_bottom: 72 })],
    ["collection", section("cv-banner", { ...img("ambiance-01.webp"), layout: "background", eyebrow: "La collection", heading: "Quatre pièces, un seul bleu", heading_tag: "h2", heading_accent: "", text: p("Harnais, laisse, collier et pochette à sacs : choisissez une pièce ou toute la collection."), price_text: "", price_note: "", button_label: "Voir la collection", button_link: "/collections/all", note: "", focus_x: 62, focus_y: 50, animation: "fade", animation_speed: "normal", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 24 })],
  ]);
  k.page("aide", "Questions et contact", { title: "Questions et contact | MUSEAU CLUB, collection de balade", description: "Les réponses sur la collection MUSEAU CLUB : les pièces assorties, la pochette, les vues de chaque fiche, la commande. Et un formulaire pour le reste." }, [
    ["faq", faq("Questions fréquentes", [...MUSEAU_FAQ, ...MUSEAU_FAQ_PENDING], "numbered", "stacked", "", { color_scheme: "scheme-1" })],
    ["form", section("contact-form", { eyebrow: "Contact", heading: "Une autre question sur MUSEAU CLUB ?", text: p("Écrivez-nous : le formulaire vérifie les champs avant l'envoi. Dans cette démonstration, aucun message n'est réellement transmis."), email: "", hours: "", response: "", preview_note: true, color_scheme: "scheme-3", padding_top: 64, padding_bottom: 96 })],
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
    about: { type: "text", settings: { heading: "MUSEAU CLUB", text: p("Harnais, laisse, collier et pochette à sacs assortis, en bleu cobalt. Marque de démonstration du studio.") } },
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
// Rien n'est inventé : les textes décrivent ce que montrent les visuels du lot (commit 9cc0b97e, objets seuls) — tapis
// rose poudré au dessous prune, brique couleur liège aux arêtes arrondies, sangle prune tissée à deux anneaux argentés,
// anneau de Pilates prune strié à poignées rose mauve, logo SOUPLE. Prix, matières, dimensions, épaisseur, adhérence,
// poids, résistance, certifications, bienfaits pour la santé, entretien, garantie et livraison ne sont jamais affirmés :
// leurs blocs restent masqués, prêts dans l'éditeur. Aucun avis, note, compteur ni urgence ; aucune vente.
export const SOUPLE_FAQ: [string, string][] = [
  ["Les quatre pièces vont-elles ensemble ?", "Oui : le tapis rose poudré, la brique couleur liège, la sangle et l'anneau prune portent le même logo SOUPLE. Elles se rangent ensemble et se sortent en même temps."],
  ["Par quelle pièce commencer ?", "Par le tapis, qui accueille toute la séance. La brique et la sangle se posent à côté ; l'anneau de Pilates complète la collection."],
  ["Où voir chaque pièce de près ?", "Chaque fiche montre la pièce sous cinq angles : entière, de profil ou roulée, puis ses détails en gros plan (logo, anneaux, poignées, coins)."],
  ["Comment être prévenu de l'ouverture ?", "Laissez votre adresse dans « Nouvelles de SOUPLE ». Nous écrivons seulement quand il y a du nouveau."],
  ORDER_FAQ("SOUPLE"),
];
export const SOUPLE_FAQ_PENDING: [string, string][] = [
  ["Quelles sont les dimensions de chaque pièce ?", TODO("longueur, largeur et épaisseur du tapis ; dimensions de la brique ; longueur de la sangle ; diamètre de l'anneau")],
  ["En quelles matières sont-elles faites ?", TODO("composition du tapis, de la brique, de la sangle et de l'anneau")],
  ["Le tapis est-il antidérapant ?", TODO("adhérence du tapis, à confirmer par le fabricant")],
  ["Comment les entretenir ?", TODO("nettoyage et rangement de chaque pièce")],
  ["Comment sont-elles livrées ?", TODO("zones, délais et frais de livraison, retours")],
  ["Quelle est la garantie ?", TODO("durée et conditions de garantie")],
];

const SOUPLE_FICHES: Record<string, Fiche> = {
  tapis: {
    eyebrow: "Tapis de yoga",
    text: "Il se déroule pour la séance et se roule ensuite, le dessous prune à l'extérieur, prêt à ranger avec la brique et la sangle.",
    highlights: "Dessus rose poudré, dessous prune\nLogo SOUPLE imprimé en prune\nCoins arrondis\nSe roule pour le rangement",
    description: p("Le tapis de yoga SOUPLE est rose poudré sur le dessus et prune sur le dessous. Son logo est imprimé en prune près d'un bout, ses coins sont arrondis, et il se roule sur lui-même après la séance.") + p("Il accueille la brique, la sangle et l'anneau de Pilates de la même collection, dans les mêmes couleurs."),
    seo: { title: "Tapis de yoga SOUPLE rose poudré, dessous prune | SOUPLE", description: "Tapis de yoga rose poudré au dessous prune, logo SOUPLE, coins arrondis. Cinq vues : déroulé, à plat, roulé, coin relevé et logo en gros plan." },
    tags: ["tapis de yoga", "rose poudré", "prune"],
  },
  brique: {
    eyebrow: "Brique de yoga",
    text: "Elle se pose à plat, sur la tranche ou debout, à côté du tapis ou dessus, selon la posture.",
    highlights: "Teinte liège, grain visible\nLogo SOUPLE en prune sur la grande face\nArêtes arrondies\nSe pose à plat, sur la tranche ou debout",
    description: p("La brique de yoga SOUPLE a la teinte et le grain du liège, des arêtes arrondies et le logo SOUPLE en prune sur sa grande face. Elle se pose à plat, sur la tranche ou debout.") + p("Elle accompagne le tapis rose poudré et la sangle prune de la collection, avec laquelle elle se range."),
    seo: { title: "Brique de yoga SOUPLE couleur liège | SOUPLE", description: "Brique de yoga couleur liège aux arêtes arrondies, logo SOUPLE en prune. Cinq vues : de trois quarts, de profil, de dos, du dessus et logo en gros plan." },
    tags: ["brique de yoga", "liège"],
  },
  sangle: {
    eyebrow: "Sangle de yoga",
    text: "Elle se boucle par ses deux anneaux argentés ou se tient à deux mains, puis se range roulée à côté de la brique.",
    highlights: "Sangle tissée prune\nDeux anneaux argentés à une extrémité\nÉtiquette SOUPLE cousue\nExtrémité cousue de l'autre côté",
    description: p("La sangle de yoga SOUPLE est une bande tissée prune. Deux anneaux argentés la ferment à une extrémité, à côté de l'étiquette SOUPLE cousue ; l'autre extrémité est simplement cousue.") + p("Elle se range roulée avec la brique et le tapis, dans les couleurs de la collection."),
    seo: { title: "Sangle de yoga SOUPLE prune à deux anneaux | SOUPLE", description: "Sangle de yoga tissée prune, deux anneaux argentés et étiquette SOUPLE cousue. Cinq vues : en boucles, étendue, roulée, anneaux et extrémité en gros plan." },
    tags: ["sangle de yoga", "prune"],
  },
  anneau: {
    eyebrow: "Anneau de Pilates",
    text: "Il se tient par ses deux poignées rose mauve pendant la séance et se pose debout quand elle est finie.",
    highlights: "Cercle prune strié\nDeux poignées rose mauve marquées SOUPLE\nSe pose debout ou à plat",
    description: p("L'anneau de Pilates SOUPLE est un cercle prune strié, avec deux poignées rose mauve placées face à face. Chaque poignée porte le logo SOUPLE en prune.") + p("Il complète le tapis, la brique et la sangle de la collection, dans les mêmes couleurs."),
    seo: { title: "Anneau de Pilates SOUPLE prune, poignées rose mauve | SOUPLE", description: "Anneau de Pilates prune strié, deux poignées rose mauve marquées SOUPLE. Cinq vues : de trois quarts, de face, contre un cube, de profil et en gros plan." },
    tags: ["anneau de Pilates", "prune", "rose mauve"],
  },
};

function curateSouple(k: Kit) {
  const { spec, img, section, overlay, faq } = k;
  const items = SOUPLE_PRODUCTS;
  const href = (key: string) => `/products/${items.find((x) => x.key === key)!.handle}`;
  const short = (key: string) => ({ tapis: "Le tapis", brique: "La brique", sangle: "La sangle", anneau: "L'anneau de Pilates" })[key]!;
  k.demoMeta();
  spec.store.seo = { title: "SOUPLE | Tapis, brique, sangle et anneau de Pilates en rose poudré, prune et liège", description: "SOUPLE, collection de yoga et de Pilates : un tapis rose poudré, une brique couleur liège, une sangle et un anneau prune, assortis pour pratiquer chez soi." };

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
  spec.store.collections = [{ handle: "all", title: "La collection SOUPLE", description: "Tapis de yoga rose poudré, brique couleur liège, sangle et anneau de Pilates prune : les quatre pièces SOUPLE, assorties.", products: products.map((x) => x.handle) }];
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
      ["siblings", block("siblings", { collection: "all", heading: "Dans la collection" })],
      ["details", block("collapsible", { heading: "Description", content: f.description, open: false })],
      ["sizes", { ...block("collapsible", { heading: "Dimensions", content: p(TODO(it.key === "tapis" ? "longueur, largeur et épaisseur du tapis" : it.key === "brique" ? "dimensions de la brique" : it.key === "sangle" ? "longueur et largeur de la sangle" : "diamètre de l'anneau")), open: false }), disabled: true }],
      ["materials", { ...block("collapsible", { heading: "Matières et entretien", content: p(TODO("composition et conseils d'entretien")), open: false }), disabled: true }],
      ["shipping", { ...block("collapsible", { heading: "Livraison, retours et garantie", content: p(TODO("zones, délais et frais de livraison ; retours ; garantie")), open: false }), disabled: true }],
    ];
    mp.settings = { ...mp.settings, product_target: pr.contentTarget, purchase_enabled: false, gallery_layout: "carousel", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" };
    mp.blocks = Object.fromEntries(blocks);
    mp.block_order = blocks.map(([b]) => b);
  });

  // ─── Accueil : la collection en mosaïque, une phrase, les quatre pièces en liste, le tapis au soleil, l'anneau sur son
  // socle, la sangle à l'achat, les questions et l'inscription sur la collection au studio.
  // La composition, faite avant que les trois autres produits n'existent, a posé l'ouverture de repli (panorama avec le
  // titre de la page) : la démonstration remet la mosaïque de la collection, l'ouverture prévue pour plusieurs produits.
  const home = spec.templates.index;
  const fallback = home.order.find((sid) => home.sections[sid].type === "ed-scene" && home.sections[sid].settings.heading_tag === "h1");
  if (fallback) { delete home.sections[fallback]; home.order.splice(home.order.indexOf(fallback), 1); }
  const tile = (file: string, title: string, link: string, text = "") => ({ type: "collection", settings: { ...img(file), title, text, link } });
  overlay("index", [
    section("fs-collections", { layout: "asym", heading_tag: "h1", eyebrow: "Yoga et Pilates", heading: "Quatre pièces assorties,", heading_accent: "rose poudré, prune et liège", text: p("Un tapis, une brique, une sangle et un anneau de Pilates qui se rangent ensemble et se sortent en même temps. Ouvrez la pièce qu'il vous faut, ou voyez toute la collection."), align: "left", button_label: "Voir toute la collection", button_link: "/collections/all", show_count: false, effect: "rise", stagger: true, hover: true, background: "scheme", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 72 }, [
      tile("ambiance-05.webp", "Toute la collection", "/collections/all", "Quatre pièces"),
      ...items.map((it) => tile({ tapis: "tapis-05.webp", brique: "brique-01.webp", sangle: "sangle-05.webp", anneau: "anneau-02.webp" }[it.key]!, short(it.key), href(it.key))),
    ]),
    section("rich-text", { style: "reveal", align: "left", color_scheme: "scheme-2", padding_top: 80, padding_bottom: 80 }, [
      { type: "eyebrow", settings: { text: "La collection" } },
      { type: "heading", settings: { text: "Le tapis se déroule, la brique et la sangle se posent à côté, l'anneau attend sur le bord : tout tient dans un coin de la pièce.", size: "h2" } },
    ]),
    section("fs-products", { layout: "list", source: "manual", collection: "all", eyebrow: "Les quatre pièces", heading: "Choisir sa pièce", heading_accent: "", text: p("Chaque fiche montre la pièce sous cinq angles. Prenez-en une, ou réunissez les quatre."), align: "left", button_label: "Toute la collection", button_link: "/collections/all", mode_label: "", limit: 4, columns: 4, ratio: "square", show_secondary: true, effect: "fade", stagger: true, hover: true, background: "scheme", color_scheme: "scheme-1", padding_top: 80, padding_bottom: 80 }, items.map((it) => ({ type: "product", settings: { product: it.handle, note: SOUPLE_FICHES[it.key].highlights.split("\n")[0] } }))),
    section("ed-scene", { ...img("ambiance-07.webp"), layout: "panorama", label: "Au sol", heading: "Le tapis déroulé au soleil", text: p("Rose poudré dessus, prune dessous : il se déroule pour la séance, et la brique trouve sa place au bout du tapis."), button_label: "Voir le tapis", button_link: href("tapis"), focus_x: 50, focus_y: 55, mobile_focus_x: 50, mobile_focus_y: 60, caption: "", motion: "drift", color_scheme: "scheme-3", padding_top: 0, padding_bottom: 64 }),
    section("image-with-text", { ...img("ambiance-04.webp"), layout: "overlap", ratio: "portrait", reveal: "up", parallax: false, eyebrow: "Pilates", heading: "L'anneau, posé sur son socle", text: p("Un cercle prune strié, deux poignées rose mauve marquées SOUPLE : il se tient à deux mains pendant la séance et se pose debout quand elle est finie."), button_label: "Voir l'anneau", button_link: href("anneau"), color_scheme: "scheme-4", padding_top: 80, padding_bottom: 80 }),
    section("featured-purchase", { label: "La sangle", heading: "Sangle de yoga SOUPLE prune", text: p("Elle se boucle par ses deux anneaux argentés ou se tient à deux mains, puis se range roulée à côté de la brique."), product: items[2].handle, product_target: "product:sangle", purchase_style: "compact", purchase_enabled: false, image_fit: "contain", gallery_limit: 5, enable_zoom: true, link_label: "Voir la fiche complète", color_scheme: "scheme-1", motion: "reveal" }),
    section("faq", { eyebrow: "Questions", heading: "Avant la première séance", text: "", style: "lines", layout: "side", columns: "1", open_first: false, search: false, contact_text: "", button_label: "Toutes les questions", button_link: "/pages/aide", structured_data: false, color_scheme: "scheme-1" }, faqRows(SOUPLE_FAQ)),
    section("newsletter-media", { ...img("ambiance-10.webp"), layout: "background", overlay: 45, eyebrow: "Nouvelles de SOUPLE", heading: "Être prévenu de l'ouverture", text: p("Nouvelles pièces, nouvelles photos, ouverture de la boutique : nous écrivons seulement quand il y a du nouveau."), perk_1: "", perk_2: "", perk_3: "", button_label: "S'inscrire", legal: p("Désinscription possible à tout moment depuis chaque e-mail."), color_scheme: "scheme-3" }),
  ]);

  // ─── Fiches : la scène de chaque produit en fermeture, le reste de la collection, les questions. ─────────────────────
  const closing = (file: string, label: string, heading: string, text: string, button: string, link: string, fy = 50) =>
    section("ed-scene", { ...img(file), layout: "closing", label, heading, text: p(text), button_label: button, button_link: link, focus_x: 50, focus_y: fy, mobile_focus_x: 50, mobile_focus_y: fy, caption: "", motion: "reveal", color_scheme: "scheme-2", padding_top: 72, padding_bottom: 72 });
  const recos = () => section("product-recommendations", { eyebrow: "La collection", heading: "Le reste de la collection", intent: "complementary", fallback_collection: "all", limit: 3, card_ratio: "square", show_secondary: true, color_scheme: "scheme-1", padding_top: 64, padding_bottom: 72 });
  const ficheFaq = () => faq("Questions fréquentes", [...SOUPLE_FAQ, ...SOUPLE_FAQ_PENDING], "lines", "side", "", { color_scheme: "scheme-1" });
  const scenes: Record<string, ReturnType<typeof section>> = {
    tapis: closing("ambiance-02.webp", "Près de la fenêtre", "Déroulé dans la lumière", "Le tapis rose poudré se déroule là où il y a de la place, et se roule ensuite pour retrouver son coin.", "Voir la brique", href("brique"), 60),
    brique: closing("ambiance-03.webp", "Avec la sangle", "La brique et sa sangle", "La brique couleur liège et la sangle prune se posent ensemble, prêtes pour la séance suivante.", "Voir la sangle", href("sangle")),
    sangle: closing("ambiance-06.webp", "Rangée", "Avec le tapis roulé", "Roulée sur une étagère, la sangle prune attend à côté du tapis : les deux pièces gardent les couleurs de la collection.", "Voir le tapis", href("tapis")),
    anneau: closing("ambiance-09.webp", "Avec la brique", "L'anneau et la brique", "Appuyé contre la brique couleur liège, l'anneau prune montre ses deux poignées rose mauve.", "Voir la brique", href("brique")),
  };
  products.forEach((pr, i) => {
    const key = keyOf(pr);
    overlay(key, [scenes[items[i].key], recos(), ficheFaq()]);
    // Une seule rangée de recommandations : « Le reste de la collection » (celle du modèle de base, en double, est retirée).
    const t = spec.templates[key];
    for (const sid of t.order.filter((x) => t.sections[x].type === "product-recommendations").slice(1)) { delete t.sections[sid]; t.order.splice(t.order.indexOf(sid), 1); }
  });
  // Catalogue : les quatre pièces sur une rangée (deux par deux sur téléphone).
  for (const sec of Object.values(spec.templates.collection?.sections ?? {})) if (sec.type === "main-collection") sec.settings = { ...sec.settings, columns: 4 };

  // ─── Pages ──────────────────────────────────────────────────────────────────────────────────────────────────────
  k.page("usages", "Les usages", { title: "Les usages de la collection SOUPLE : tapis, brique, sangle et anneau | SOUPLE", description: "Au studio, près de la fenêtre, rangées dans un coin : les quatre pièces SOUPLE en situation, et ce que chacune apporte à la séance." }, [
    ["intro", section("rich-text", { style: "plain", align: "left", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 16 }, [{ type: "text", settings: { text: p("Une séance commence en déroulant le tapis et se termine en rangeant les pièces. Voici la collection SOUPLE à chacun de ces moments, avec le lien vers chaque fiche.") } }])],
    ["studio", section("fs-lookbook", { ...img("ambiance-01.webp"), layout: "side", eyebrow: "Au studio", heading: "Les quatre pièces sur le parquet", heading_tag: "h2", text: p("Le tapis déroulé, la brique et la sangle à côté, l'anneau prêt : ouvrez la fiche de chaque pièce."), align: "left", link_label: "Voir la fiche", color_scheme: "scheme-2", padding_top: 64, padding_bottom: 64 }, [
      { type: "marker", settings: { product: items[0].handle, title: "Le tapis rose poudré", price_text: "", link: href("tapis"), x: 66, y: 84 } },
      { type: "marker", settings: { product: items[1].handle, title: "La brique couleur liège", price_text: "", link: href("brique"), x: 69, y: 50 } },
      { type: "marker", settings: { product: items[2].handle, title: "La sangle prune", price_text: "", link: href("sangle"), x: 49, y: 66 } },
      { type: "marker", settings: { product: items[3].handle, title: "L'anneau de Pilates", price_text: "", link: href("anneau"), x: 83, y: 30 } },
    ])],
    ["coins", section("ed-diptych", { layout: "pair", label: "Ranger", heading: "Un coin pour la collection", text: p("Après la séance, le tapis se roule et les accessoires se posent à côté."), button_label: "", button_link: "", motion: "reveal", color_scheme: "scheme-1", padding_top: 72, padding_bottom: 72 }, [
      { type: "frame", settings: { ...img("ambiance-08.webp"), ratio: "portrait", title: "Dans une niche", text: p("Le tapis roulé debout, la brique et la sangle à ses pieds."), link: href("tapis"), link_label: "Voir le tapis", focus_x: 50, focus_y: 50, mobile_focus_x: 50, mobile_focus_y: 50 } },
      { type: "frame", settings: { ...img("ambiance-03.webp"), ratio: "landscape", title: "Sur un banc", text: p("La brique couleur liège et la sangle prune, prêtes pour demain."), link: href("brique"), link_label: "Voir la brique", focus_x: 50, focus_y: 50, mobile_focus_x: 50, mobile_focus_y: 50 } },
    ])],
    ["collection", section("ed-scene", { ...img("ambiance-05.webp"), layout: "split", label: "La collection", heading: "Les quatre pièces, vues du dessus", text: p("Le tapis, la brique, la sangle et l'anneau de Pilates partagent le même logo et les mêmes couleurs."), button_label: "Voir toute la collection", button_link: "/collections/all", focus_x: 50, focus_y: 50, mobile_focus_x: 50, mobile_focus_y: 50, caption: "", motion: "reveal", color_scheme: "scheme-4", padding_top: 72, padding_bottom: 72 })],
  ]);
  k.page("aide", "Questions et contact", { title: "Questions et contact | SOUPLE, collection de yoga et de Pilates", description: "Les réponses sur la collection SOUPLE : les pièces assorties, par où commencer, les vues de chaque fiche, la commande. Et un formulaire pour le reste." }, [
    ["faq", faq("Questions fréquentes", [...SOUPLE_FAQ, ...SOUPLE_FAQ_PENDING], "numbered", "stacked", "", { color_scheme: "scheme-1" })],
    ["form", section("contact-form", { eyebrow: "Contact", heading: "Une autre question sur SOUPLE ?", text: p("Écrivez-nous : le formulaire vérifie les champs avant l'envoi. Dans cette démonstration, aucun message n'est réellement transmis."), email: "", hours: "", response: "", preview_note: true, color_scheme: "scheme-2", padding_top: 64, padding_bottom: 96 })],
  ]);

  // ─── Menus, en-tête « Collections en cartes » (logo en tête, menu dessous), pied « Boutique éditoriale » ──────────────
  const productLinks = items.map((it) => ({ title: short(it.key), url: href(it.key) }));
  spec.store.menus["main-menu"] = { title: "Navigation", links: [
    { title: "La collection", url: "/collections/all", links: productLinks },
    { title: "Les usages", url: "/pages/usages" },
    { title: "Aide", url: "/pages/aide" },
  ] };
  spec.store.menus.footer = { title: "La collection", links: [...productLinks, { title: "Toute la collection", url: "/collections/all" }] };
  spec.store.menus["footer-aide"] = { title: "Aide", links: [{ title: "Les usages", url: "/pages/usages" }, { title: "Questions et contact", url: "/pages/aide" }, { title: "Recherche", url: "/search" }] };
  const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
  header.settings = { ...header.settings, menu: "main-menu", layout: "two-rows", shape: "bar", icons: "plain", mega_menu: "cards", mobile_menu: "cards", mobile_promo: "top", mobile_submenu: "open", sticky: true, transparent_on_home: false, show_search: true, show_cart: true, cta_label: "", phone: "", color_scheme: "scheme-1" };
  // Sous-menu « La collection » : chaque pièce en carte illustrée (sa vue principale) et l'encart de la collection.
  const hSchema = sectionSchema(spec, "header")!;
  const extraSchema = hSchema.blocks.find((b) => b.type === "link_extra")?.settings;
  const promoSchema = hSchema.blocks.find((b) => b.type === "promo")?.settings;
  const cardImage: Record<string, string> = { tapis: "tapis-01.webp", brique: "brique-01.webp", sangle: "sangle-01.webp", anneau: "anneau-01.webp" };
  header.blocks = {
    ...Object.fromEntries(items.map((it) => [`card_${it.key}`, { type: "link_extra", settings: withDefaults(extraSchema, { link_title: short(it.key), icon: "none", image: "", image_asset: k.name(cardImage[it.key]) }) }])),
    collection: { type: "promo", settings: withDefaults(promoSchema, { image: "", image_asset: k.name("ambiance-10.webp"), eyebrow: "La collection", heading: "Les quatre pièces SOUPLE", button_label: "Tout voir", link: "/collections/all", placement: "both", menu_title: "La collection" }) },
  };
  header.block_order = [...items.map((it) => `card_${it.key}`), "collection"];
  spec.groups.header.sections = { header };
  spec.groups.header.order = ["header"];
  const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
  footer.settings = { ...footer.settings, style: "reference-shop", show_wordmark: true, show_policies: false, show_payment: false, color_scheme: "scheme-3", logo_asset: "" };
  footer.blocks = {
    about: { type: "text", settings: { heading: "SOUPLE", text: p("Tapis, brique, sangle et anneau de Pilates assortis, en rose poudré, prune et liège. Marque de démonstration du studio.") } },
    links: { type: "links", settings: { heading: "La collection", menu: "footer" } },
    help: { type: "links", settings: { heading: "Aide", menu: "footer-aide" } },
  };
  // Pas d'inscription dans le pied : l'accueil se termine déjà par « Nouvelles de SOUPLE ».
  footer.block_order = ["about", "links", "help"];
  for (const s of Object.values(spec.groups.footer.sections)) if (s.type !== "footer") s.disabled = true;
  k.finish();
  spec.settings = { ...spec.settings, logo_width: 150 };
}
