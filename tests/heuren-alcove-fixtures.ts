/**
 * Démonstrations HEUREN (montre bleu nuit) et ALCÔVE (fauteuil terracotta), issue #155 : deux thèmes **mono-produit de
 * la famille E-commerce** (celle d'ORBE), jamais « boutique spécialisée ». Un seul produit par démo, plusieurs vues du
 * même produit, aucun catalogue inventé.
 *
 * Même chaîne que NOCTIL et TRAVERSE : un projet client (marque, produit, médias avec rôles) composé par le VRAI moteur
 * dans son thème du catalogue (composeShop), puis rédigé section par section, dans le même ordre (un test le vérifie).
 *
 * Rien n'est inventé : les textes décrivent ce que montrent les visuels du lot (commit 370c28f6, sans personne) et les
 * caractéristiques données par Thomas (HEUREN : cadran bleu nuit soleillé, index et aiguilles argentés, boîtier argenté,
 * bracelet cuir bleu nuit cousu bleu, doublure beige ; ALCÔVE : fauteuil enveloppant terracotta, dossier et accoudoirs
 * arrondis, coussin d'assise épais, quatre pieds courts en bois brun). Prix, mouvement, étanchéité, dimensions,
 * matériaux, composition du tissu, confort, garantie et livraison ne sont jamais affirmés : leurs blocs restent dans la
 * démonstration, masqués (« [À compléter : …] » prêts dans l'éditeur). Aucun avis, note, compteur ni urgence ; aucune
 * vente. L'ancienne ambiance HEUREN rejetée (bracelet dépassant) n'est pas dans le lot : seule ambiance-07, corrigée, sert.
 */
import { buildKitProject, p, TODO, ORDER_FAQ, type Brand, type Kit, type Media } from "./noctil-traverse-fixtures";
import { sectionSchema, withDefaults } from "../src/lib/theme/spec";

export type ShopKitId = "heuren" | "alcove";
export const SHOP_KIT_PROVENANCE = "Issue #155 (21 octobre 2026) — démonstration du studio, images IA déjà générées fournies par Thomas (commit 370c28f6), sans personne, aucun paiement";

/** Ordre d'import = rôles du thème (le dernier importé d'un rôle prend le premier emplacement). Textes alternatifs descriptifs. */
export const HEUREN_MEDIA: Media[] = [
  { file: "logo.webp", role: "logo", alt: "HEUREN" },
  { file: "produit-03.webp", role: "packshot", alt: "Montre HEUREN de profil : boîtier argenté, couronne et bracelet en cuir bleu nuit." },
  { file: "produit-02.webp", role: "packshot", alt: "Montre HEUREN de face : cadran bleu nuit soleillé, index argentés et nom HEUREN." },
  { file: "produit-01.webp", role: "packshot", alt: "Montre HEUREN entière de trois quarts, cadran bleu nuit et bracelet en cuir bleu nuit doublé de beige." },
  { file: "produit-05.webp", role: "detail", alt: "Gros plan du bracelet en cuir bleu nuit et de sa couture bleue, au pied du boîtier argenté." },
  { file: "produit-04.webp", role: "detail", alt: "Gros plan du cadran bleu nuit soleillé, des aiguilles argentées et du nom HEUREN." },
  { file: "ambiance-08.webp", role: "scene", alt: "Montre HEUREN sur un support argenté, sur une table de chevet éclairée par une lampe." },
  { file: "ambiance-02.webp", role: "scene", alt: "Montre HEUREN sur un bureau en noyer, à côté d'un carnet et d'un stylo." },
  { file: "ambiance-03.webp", role: "scene", alt: "Montre HEUREN posée sur un socle de travertin, dans une lumière rasante." },
  { file: "ambiance-01.webp", role: "scene", alt: "Montre HEUREN sur une ardoise, devant un mur bleu nuit." },
  { file: "ambiance-06.webp", role: "scene", alt: "Montre HEUREN posée sur un lin ivoire froissé." },
  { file: "ambiance-04.webp", role: "scene", alt: "Montre HEUREN sur une trousse de voyage en cuir bleu, à côté d'une carte dépliée." },
  { file: "ambiance-05.webp", role: "scene", alt: "Montre HEUREN posée sur un veston plié, près d'une chemise blanche." },
  { file: "ambiance-10.webp", role: "lifestyle", alt: "Montre HEUREN dans un écrin bleu nuit, ruban crème à côté." },
  { file: "ambiance-09.webp", role: "banner", alt: "Montre HEUREN sur un bloc de béton, devant un mur bleu, sous des ombres géométriques." },
  { file: "ambiance-07.webp", role: "lifestyle", alt: "Montre HEUREN entière sur une pierre noire brillante, au coucher du soleil, bracelet fermé." },
];
export const ALCOVE_MEDIA: Media[] = [
  { file: "logo.webp", role: "logo", alt: "ALCÔVE" },
  { file: "produit-04.webp", role: "packshot", alt: "Fauteuil ALCÔVE vu de dos, de trois quarts : dossier arrondi et pieds en bois." },
  { file: "produit-03.webp", role: "packshot", alt: "Fauteuil ALCÔVE de profil : dossier enveloppant, coussin épais, pieds courts en bois brun." },
  { file: "produit-02.webp", role: "packshot", alt: "Fauteuil ALCÔVE de face, tissu terracotta et quatre pieds en bois brun." },
  { file: "produit-01.webp", role: "packshot", alt: "Fauteuil ALCÔVE terracotta entier, de trois quarts : dossier et accoudoirs arrondis, coussin d'assise épais." },
  { file: "produit-05.webp", role: "detail", alt: "Gros plan du tissu terracotta texturé, entre l'accoudoir et le coussin d'assise." },
  { file: "ambiance-09.webp", role: "detail", alt: "Fauteuil ALCÔVE vu du dessus, sur un tapis tressé, table d'appoint et livre à côté." },
  { file: "ambiance-08.webp", role: "scene", alt: "Fauteuil ALCÔVE dans un loft, devant une grande verrière." },
  { file: "ambiance-04.webp", role: "scene", alt: "Fauteuil ALCÔVE dans un intérieur rétro, près d'un buffet en bois et d'une table basse ronde." },
  { file: "ambiance-03.webp", role: "scene", alt: "Fauteuil ALCÔVE près d'une fenêtre cintrée, rideau léger et olivier en pot." },
  { file: "ambiance-10.webp", role: "scene", alt: "Fauteuil ALCÔVE dans un jardin d'hiver, entre les plantes, sur un sol en terre cuite." },
  { file: "ambiance-05.webp", role: "scene", alt: "Fauteuil ALCÔVE dans une chambre lumineuse, au pied du lit." },
  { file: "ambiance-02.webp", role: "scene", alt: "Fauteuil ALCÔVE dans un coin lecture, à côté d'une table d'appoint en bois." },
  { file: "ambiance-06.webp", role: "banner", alt: "Fauteuil ALCÔVE sous la lumière ambrée d'une lampe en papier, le soir." },
  { file: "ambiance-01.webp", role: "lifestyle", alt: "Fauteuil ALCÔVE dans un salon lumineux, sur un tapis épais, olivier à côté." },
  { file: "ambiance-07.webp", role: "lifestyle", alt: "Fauteuil ALCÔVE terracotta entier, dans une niche en arche aux murs crème." },
];
export const SHOP_KIT_MEDIA: Record<ShopKitId, Media[]> = { heuren: HEUREN_MEDIA, alcove: ALCOVE_MEDIA };
export const SHOP_KIT_HANDLE: Record<ShopKitId, string> = { heuren: "montre-heuren-bleu-nuit", alcove: "fauteuil-alcove-terracotta" };

// HEUREN — fiche de stratégie (consigne de Thomas du 21 octobre, 21 h 45 ; brief, hypothèse éditoriale) :
//  acheteur : une personne qui offre une montre à son compagnon ; utilisateur : lui, qui la portera ;
//  situation d'achat : une étape de sa vie à marquer (nouveau poste, anniversaire, projet qui aboutit) ;
//  tension (ses mots) : « Je veux un cadeau à la hauteur du moment, pas un objet qui finira dans un tiroir. » ;
//  désir : que le cadeau garde la trace de ce moment, et qu'il le porte ensuite ;
//  angle unique : un cadeau qui matérialise ce moment et se porte ensuite au quotidien ;
//  promesse tenable : une montre à aiguilles au cadran bleu nuit soleillé, présentée en écrin sur les photos, assez
//  sobre pour le bureau comme pour le soir ; faits = visuels (cadran, index, aiguilles, boîtier, bracelet, écrin, décors) ;
//  objections : pour quelle occasion, comment elle est présentée (écrin, contenu non renseigné), le bleu au quotidien,
//  connectée ou non (une montre à aiguilles), gravure, prix, taille et mouvement (non renseignés) ;
//  exclusions : aucune guerre contre les notifications, aucun mouvement, taille, matière, étanchéité ni gravure inventés.
export const HEUREN_FAQ: [string, string][] = [
  ["Pour quelles occasions l'offrir ?", "Un nouveau poste, un anniversaire, des fiançailles, un diplôme, un projet qui aboutit : une étape que vous voulez marquer avec un objet qu'il portera ensuite tous les jours."],
  ["Comment est-elle présentée ?", "Nos photos la montrent dans un écrin bleu nuit, un ruban crème à côté. Le contenu exact de l'écrin n'est pas encore renseigné."],
  ["Le bleu nuit se porte-t-il tous les jours ?", "Sur nos photos, il accompagne un veston, une chemise blanche, un bureau en noyer et une trousse de voyage : un bleu sombre, sobre, que les index argentés éclairent."],
  ["Est-ce une montre connectée ?", "Non : un cadran, des index et des aiguilles. Elle donne l'heure, avec un beau bleu autour."],
  ["Que puis-je faire dans cette boutique de démonstration ?", "Faire le tour de la montre en cinq vues et la voir au fil du jour. Le prix, la taille du boîtier, le mouvement et la gravure ne sont pas encore renseignés, et la commande est désactivée."],
];
export const HEUREN_FAQ_PENDING: [string, string][] = [
  ["Peut-on la faire graver ?", TODO("gravure possible ou non, emplacement et nombre de caractères")],
  ["Quel mouvement anime la montre ?", TODO("type de mouvement et réserve de marche")],
  ["Est-elle étanche ?", TODO("étanchéité, en mètres ou en ATM")],
  ["Quelle est la taille du boîtier ?", TODO("diamètre, épaisseur, largeur entre les cornes")],
  ["De quoi sont faits le boîtier et le verre ?", TODO("matière du boîtier, du verre et du fond")],
  ["Le bracelet se change-t-il ?", TODO("système d'attache et largeur du bracelet")],
  ["Quelle est la garantie ?", TODO("durée et conditions de garantie")],
];
// ALCÔVE — fiche de stratégie (consigne de Thomas du 21 octobre, 21 h 45 ; brief, hypothèse éditoriale) :
//  utilisateur et acheteur : un lecteur qui vit dans un logement partagé (colocation, famille) ;
//  situation d'achat : il lit sur un coin de canapé que tout le monde utilise, ou sur son lit, faute de mieux ;
//  tension (ses mots) : « Chez nous, le canapé est à tout le monde : je n'ai pas d'endroit pour lire tranquille. » ;
//  désir : un espace à soi, que l'on a envie de retrouver ;
//  angle unique : créer son coin lecture à soi ;
//  promesse tenable : un fauteuil dont le dossier et les accoudoirs forment un seul arrondi autour d'un coussin épais,
//  qui trouve sa place dans une chambre ou un coin de salon ; faits = visuels (silhouette, tissu terracotta texturé,
//  pieds en bois brun, coin lecture, livre, lampe, pièces photographiées) ;
//  objections : où l'installer, la place qu'il prend (dimensions non renseignées : le dire), le terracotta, l'aspect de
//  près, prix et commande (information dédiée) ;
//  exclusions : aucun confort, maintien, dimension, tissu, rembourrage ni montage inventés.
export const ALCOVE_FAQ: [string, string][] = [
  ["Où l'installer dans un logement partagé ?", "Dans votre chambre, au pied du lit, ou dans un coin du salon près d'une fenêtre : là où la lumière vous permet de lire. Nos photos le montrent dans un coin lecture, une chambre et sous une fenêtre."],
  ["Quelle place prend-il ?", "Ses dimensions ne sont pas encore renseignées dans cette démonstration : mesurez votre coin avant de le choisir."],
  ["Le terracotta ira-t-il avec le reste de la pièce ?", "Sur nos photos, il côtoie des bois chauds, du lin, des tapis tressés et des plantes ; contre un mur clair, il réchauffe la pièce sans la charger."],
  ["À quoi ressemble-t-il de près ?", "Un tissu terracotta à la texture visible, un coussin d'assise épais et des pieds courts en bois brun : tous les gros plans sont sur la fiche."],
  ["Que puis-je faire dans cette boutique de démonstration ?", "Faire le tour du fauteuil en cinq vues et le voir dans plusieurs pièces. Le prix, les dimensions et la composition du tissu ne sont pas encore renseignés, et la commande est désactivée."],
];
export const ALCOVE_FAQ_PENDING: [string, string][] = [
  ["Quelles sont ses dimensions ?", TODO("hauteur, largeur, profondeur, hauteur d'assise")],
  ["En quel tissu est-il recouvert ?", TODO("composition du tissu et du rembourrage")],
  ["Se déhousse-t-il ? Comment l'entretenir ?", TODO("housse amovible, conseils d'entretien")],
  ["Comment est-il livré ?", TODO("livraison, montage des pieds, délais")],
  ["Quelle est la garantie ?", TODO("durée et conditions de garantie")],
];

const BRANDS: Record<ShopKitId, Brand> = {
  heuren: {
    name: "HEUREN", product: "Montre HEUREN bleu nuit", category: "Montre",
    summary: "Montre à cadran bleu nuit soleillé, index et aiguilles argentés, boîtier argenté, bracelet en cuir bleu nuit cousu de bleu et doublé de beige ; le nom HEUREN est inscrit sur le cadran.",
    facts: [["Cadran", "bleu nuit soleillé, index et aiguilles argentés"], ["Bracelet", "cuir bleu nuit, couture bleue, doublure beige"]],
    tagline: "Pour marquer une étape, à porter chaque jour.", story: "HEUREN est née d'une idée : qu'un cadeau marquant ne finisse pas dans un tiroir, mais au poignet, chaque jour.", positioning: "Une montre au cadran bleu nuit à offrir pour une étape de vie, et à porter au quotidien.",
    // Bleu nuit du cadran, argent brumeux des fonds produit, beige de la doublure, ivoire.
    palette: { primary: "#15233E", secondary: "#D9DDE3", accent: "#B8946A", light: "#F7F5F0", dark: "#0D1526" },
  },
  alcove: {
    name: "ALCÔVE", product: "Fauteuil ALCÔVE terracotta", category: "Fauteuil",
    summary: "Fauteuil enveloppant au tissu terracotta texturé : dossier et accoudoirs arrondis d'un seul tenant, coussin d'assise épais, quatre pieds courts en bois brun.",
    facts: [["Silhouette", "dossier et accoudoirs arrondis, coussin d'assise épais"], ["Pieds", "quatre pieds courts en bois brun"]],
    tagline: "Une alcôve à soi.", story: "ALCÔVE est né pour les lecteurs qui partagent leur logement : un fauteuil qui devient leur coin à eux.", positioning: "Un fauteuil enveloppant pour créer son coin lecture, même dans un logement partagé.",
    // Terre cuite du logo et du tissu, sable des fonds, bois des pieds.
    palette: { primary: "#A14225", secondary: "#EEE8E1", accent: "#5A3A24", light: "#F6F0E8", dark: "#2B1A12" },
  },
};

export async function shopKitProject(userId: string, id: ShopKitId) {
  return buildKitProject(userId, { id, media: SHOP_KIT_MEDIA[id], handle: SHOP_KIT_HANDLE[id], brand: BRANDS[id], themeName: id === "heuren" ? "Heuren" : "Alcôve", provenance: SHOP_KIT_PROVENANCE, storeKind: "catalog", sector: "maison" }, id === "heuren" ? curateHeuren : curateAlcove);
}

/** Cadre d'un diptyque (photo, titre, phrase). */
const frame = (k: Kit, file: string, title: string, text: string, ratio: "landscape" | "portrait" | "square", extra: Record<string, unknown> = {}) => ({ type: "frame", settings: { ...k.img(file), title, text: p(text), link: "", link_label: "", ratio, ...extra } });
/** Questions de la section « v2-faq » (les réponses inconnues restent masquées, prêtes dans l'éditeur). */
const v2faq = (k: Kit, layout: "side" | "center", eyebrow: string, heading: string, text: string, items: [string, string][], extra: Record<string, unknown> = {}) =>
  k.section("v2-faq", { layout, eyebrow, heading, text: text ? p(text) : "", ...extra }, items.map(([question, answer]) => ({ type: "question", settings: { question, answer: p(answer) }, hidden: answer.includes("[À compléter") })));
/** Repère d'un lookbook sur le produit unique (titre seul, aucun prix). */
const marker = (_k: Kit, x: number, y: number, title: string) => ({ type: "marker", settings: { product: "", title, price_text: "", link: "", x, y } });

// ─── HEUREN ───────────────────────────────────────────────────────────────────────────────────────────────────────
function curateHeuren(k: Kit) {
  const { spec, img, section, overlay, faq, productHref } = k;
  k.demoMeta();
  spec.store.seo = { title: "HEUREN | Une montre à offrir pour marquer une étape de sa vie", description: "Nouveau poste, anniversaire, projet abouti : offrez-lui la montre HEUREN au cadran bleu nuit soleillé, pour garder ce moment au poignet, chaque jour." };
  k.product({
    title: "Montre HEUREN bleu nuit",
    description_html: p("Pourquoi l'offrir : pour marquer une étape de sa vie (un nouveau poste, un anniversaire, un projet qui aboutit) avec un objet qu'il portera ensuite tous les jours.") + p("Ce qu'on voit : un cadran bleu nuit soleillé dont les reflets changent avec la lumière, des index et des aiguilles argentés, un boîtier argenté, un bracelet en cuir bleu nuit cousu de bleu et doublé de beige. Le nom HEUREN est inscrit sur le cadran.") + p("Après le jour J : au bureau, avec un veston, en voyage, et posée sur son support le soir ; nos photos la montrent à chacun de ces moments. Le contenu exact de l'écrin n'est pas encore renseigné."),
    images: ["produit-01.webp", "produit-02.webp", "produit-03.webp", "produit-04.webp", "produit-05.webp"],
    tags: ["montre", "bleu nuit", "cuir"],
    seo: { title: "Montre HEUREN bleu nuit, à offrir : cadran et bracelet en détail", description: "Avant de l'offrir, faites le tour de la montre HEUREN : trois quarts, face, profil, cadran bleu nuit soleillé et bracelet en cuir cousu de bleu." },
  });

  // ─── Accueil : l'heure bleue, le cadran, les repères, puis la montre portée. ──────────────────────────────────────
  overlay("index", [
    section("ed-opening", { ...img("ambiance-10.webp"), layout: "ecrin", heading_tag: "h1", label: "Une montre à offrir", heading: "Il y a des étapes\nqui méritent une montre.", text: p("Un nouveau poste, un anniversaire, un projet qui aboutit : offrez-lui HEUREN. Ce soir-là, il ouvre l'écrin ; ensuite, il la porte chaque jour."), button_label: "Découvrir la montre", button_link: productHref, focus_x: 50, focus_y: 50, mobile_focus_x: 50, mobile_focus_y: 50, copy_surface: true, caption: "", motion: "reveal", padding_top: 24, padding_bottom: 72 }),
    section("ed-statement", { ...img("produit-04.webp"), label: "Le cadran", heading: "Un bleu qu'il regardera longtemps", text: p("Le cadran soleillé renvoie la lumière du centre vers le bord : il change sous la lampe du bureau et au coucher du soleil. Chaque fois qu'il lira l'heure, il retrouvera ce bleu, et le jour où il l'a reçue."), button_label: "", button_link: "", motion: "reveal", color_scheme: "scheme-1", padding_top: 112, padding_bottom: 112 }, [
      { type: "point", settings: { title: "Cadran soleillé", text: "Bleu nuit, reflets rayonnants du centre vers le bord." } },
      { type: "point", settings: { title: "Index et aiguilles", text: "Argentés et fins, nets sur le bleu." } },
      { type: "point", settings: { title: "Boîtier", text: "Argenté, couronne sur le côté droit." } },
      { type: "point", settings: { title: "Bracelet", text: "Cuir bleu nuit, couture bleue, doublure beige." } },
    ]),
    section("fs-lookbook", { ...img("produit-02.webp"), layout: "markers", eyebrow: "Repères", heading: "Ce qu'il découvrira,", heading_accent: "point par point", text: p("Touchez un repère : le nom, le cadran, la couronne et le bracelet, un détail à la fois."), align: "left", button_label: "Voir la fiche", button_link: productHref, link_label: "Voir la montre", effect: "fade", stagger: true, hover: false, background: "scheme" }, [
      marker(k, 48, 33, "Le nom HEUREN, en argent sur le cadran"),
      marker(k, 37, 55, "Le cadran bleu nuit soleillé"),
      marker(k, 75, 44, "La couronne, sur le côté du boîtier"),
      marker(k, 58, 84, "Le bracelet en cuir, cousu de bleu"),
    ]),
    section("fs-campaign", { ...img("ambiance-09.webp"), layout: "background", eyebrow: "Après le jour J", heading: "Un cadeau qui se porte,", heading_accent: "bien après la fête", text: p("Au soleil comme à l'ombre, le cadran reste profond et les index argentés restent nets : une montre faite pour être portée, pas rangée dans un tiroir."), align: "left", label: "", offer_title: "", offer_text: "", period_text: "", conditions: "", cta_label: "Voir la montre", cta_link: productHref, cta2_label: "Au fil du jour", cta2_link: "/pages/au-fil-du-jour", focus_x: 55, focus_y: 50, effect: "fade", stagger: false, hover: false, background: "scheme", color_scheme: "scheme-2" }),
    section("ed-scene", { ...img("ambiance-05.webp"), layout: "split", label: "Au quotidien", heading: "Du bureau au dîner, il la garde", text: p("Posée sur un veston plié, près d'une chemise blanche : le bleu nuit accompagne les tenues sobres. Le cadeau d'un soir devient sa montre de tous les jours."), button_label: "Au fil du jour", button_link: "/pages/au-fil-du-jour", caption: "", focus_x: 40, focus_y: 50, mobile_focus_x: 40, mobile_focus_y: 50, motion: "reveal", padding_top: 72, padding_bottom: 72 }),
    section("featured-purchase", { label: "La montre", heading: "Montre HEUREN bleu nuit", text: p("Avant de l'offrir, faites-en le tour : trois quarts, face, profil, puis le cadran et le bracelet en gros plan."), product: SHOP_KIT_HANDLE.heuren, product_target: "product:main", purchase_style: "compact", purchase_enabled: false, image_fit: "contain", gallery_limit: 4, enable_zoom: true, link_label: "Voir la fiche complète", color_scheme: "scheme-4" }),
    v2faq(k, "center", "Questions", "Avant de l'offrir", "Les occasions, l'écrin, le bleu au quotidien, ce que permet la démonstration.", HEUREN_FAQ.slice(0, 5)),
    section("newsletter-media", { ...img("ambiance-07.webp"), layout: "right", eyebrow: "Nouvelles d'HEUREN", heading: "Être prévenu quand HEUREN ouvre", text: p("Un e-mail à l'ouverture de la boutique, pour préparer votre cadeau. Rien d'autre."), perk_1: "", perk_2: "", perk_3: "", button_label: "Me prévenir", legal: p("Désinscription possible à tout moment depuis chaque e-mail.") }),
  ]);

  // ─── Fiche produit ──────────────────────────────────────────────────────────────────────────────────────────────
  k.mainProduct({
    eyebrow: "Montre à aiguilles · à offrir",
    text: "Pour marquer une étape de sa vie : un cadran bleu nuit soleillé, des aiguilles argentées, un bracelet en cuir cousu de bleu, qu'il portera ensuite chaque jour.",
    highlights: "Cadran bleu nuit soleillé\nIndex et aiguilles argentés\nBracelet cuir bleu nuit, couture bleue, doublure beige\nPrésentée en écrin sur nos photos",
    description: spec.store.product.description_html,
    specs: "gravure, mouvement, réserve de marche, étanchéité, diamètre et épaisseur du boîtier, matières du boîtier et du verre, largeur du bracelet",
    box: "contenu exact de l'écrin",
    shipping: "zones, délais et frais de livraison ; délai et conditions de retour ; durée de garantie",
    settings: { gallery_layout: "grid", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" },
  });
  overlay(k.productKey(), [
    section("ed-diptych", { layout: "pair", label: "Deux lumières", heading: "Le même bleu, deux humeurs", text: p("Face à un mur bleu nuit, le cadran se fond dans le décor ; sur un lin ivoire, il ressort."), button_label: "", button_link: "", motion: "reveal", padding_top: 72, padding_bottom: 72 }, [
      frame(k, "ambiance-01.webp", "Sur l'ardoise", "Le cadran bleu face à un mur bleu nuit.", "landscape", { focus_x: 70, mobile_focus_x: 70 }),
      frame(k, "ambiance-06.webp", "Sur le lin", "Posée sur un lin ivoire froissé, en lumière douce.", "landscape"),
    ]),
    v2faq(k, "side", "Questions", "Questions sur la montre", "", [...HEUREN_FAQ, ...HEUREN_FAQ_PENDING]),
  ]);

  // ─── Pages ──────────────────────────────────────────────────────────────────────────────────────────────────────
  k.page("au-fil-du-jour", "Au fil du jour", { title: "Après le jour J : la montre HEUREN au fil de ses journées | HEUREN", description: "Au bureau, en voyage, sur son support le soir : la montre HEUREN au fil de ses journées, en photos, pour imaginer le cadeau à son poignet." }, [
    ["intro", section("rich-text", { style: "plain", align: "left", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 24 }, [{ type: "text", settings: { text: p("Le soir où on l'offre compte. Les jours suivants aussi : voici HEUREN au fil d'une journée, du bureau du matin au support du soir.") } }])],
    ["moments", section("ed-diptych", { layout: "index", label: "Trois moments", heading: "Au bureau, en voyage, le soir", text: "", button_label: "", button_link: "", motion: "reveal", padding_top: 48, padding_bottom: 72 }, [
      frame(k, "ambiance-02.webp", "Le matin, au bureau", "Sur le noyer, à côté d'un carnet ouvert et d'un stylo.", "landscape"),
      frame(k, "ambiance-04.webp", "En voyage", "Sur sa trousse de cuir bleu, près d'une carte dépliée.", "landscape", { focus_x: 52 }),
      frame(k, "ambiance-08.webp", "Le soir, sur son support", "Sur un support argenté, à la lumière d'une lampe de chevet.", "portrait"),
    ])],
    ["fin", section("ed-scene", { ...img("ambiance-03.webp"), layout: "closing", label: "Posée", heading: "Une montre à regarder, aussi", text: p("Sur un socle de travertin, dans la lumière rasante : HEUREN se regarde même quand on ne la porte pas."), button_label: "Voir la montre", button_link: productHref, caption: "", motion: "reveal", color_scheme: "scheme-4", padding_top: 88, padding_bottom: 88 })],
  ]);
  k.page("aide", "Questions et contact", { title: "Questions et contact | HEUREN, montre à offrir", description: "Les occasions, l'écrin, le bleu au quotidien, montre connectée ou non : nos réponses avant d'offrir HEUREN, et un formulaire pour le reste." }, [
    ["faq", faq("Questions fréquentes", [...HEUREN_FAQ, ...HEUREN_FAQ_PENDING], "numbered", "stacked", "", { color_scheme: "scheme-1" })],
    ["form", section("contact-form", { eyebrow: "Contact", heading: "Une question avant de l'offrir ?", text: p("Écrivez-nous : le formulaire vérifie les champs avant l'envoi. Dans cette démonstration, aucun message n'est réellement transmis."), email: "", hours: "", response: "", preview_note: true, color_scheme: "scheme-4", padding_top: 64, padding_bottom: 96 })],
  ]);

  // ─── Menus, en-tête « logo centré, menu à gauche » sur blanc (fond du logo), pied « encadré » ────────────────────
  spec.store.menus["main-menu"] = { title: "Navigation", links: [
    { title: "La montre", url: productHref, links: [{ title: "Vues et détails", url: productHref }, { title: "Au fil du jour", url: "/pages/au-fil-du-jour" }, { title: "Questions et contact", url: "/pages/aide" }] },
    { title: "Au fil du jour", url: "/pages/au-fil-du-jour" },
    { title: "Aide", url: "/pages/aide" },
  ] };
  spec.store.menus.footer = { title: "Aide", links: [{ title: "La montre", url: productHref }, { title: "Au fil du jour", url: "/pages/au-fil-du-jour" }, { title: "Questions et contact", url: "/pages/aide" }, { title: "Recherche", url: "/search" }] };
  const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
  header.settings = { ...header.settings, menu: "main-menu", layout: "nav-left", shape: "bar", icons: "plain", mega_menu: "columns", mobile_menu: "fullscreen", mobile_submenu: "accordion", sticky: true, transparent_on_home: false, show_search: true, show_cart: true, cta_label: "", phone: "", color_scheme: "scheme-3" };
  header.blocks = {}; header.block_order = [];
  // Pas de bandeau « Boutique de démonstration » : la mention d'aperçu (studio et aperçu statique) le dit déjà (#157).
  spec.groups.header.sections = { header };
  spec.groups.header.order = ["header"];
  const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
  footer.settings = { ...footer.settings, style: "boxed", show_wordmark: false, show_policies: false, show_payment: false, color_scheme: "scheme-1", logo_asset: "" };
  footer.blocks = {
    about: { type: "text", settings: { heading: "HEUREN", text: p("La montre au cadran bleu nuit à offrir pour marquer une étape, et à porter chaque jour ensuite. Marque de démonstration du studio.") } },
    links: { type: "links", settings: { heading: "Aide", menu: "footer" } },
  };
  footer.block_order = ["about", "links"];
  for (const s of Object.values(spec.groups.footer.sections)) if (s.type !== "footer") s.disabled = true;
  k.finish();
  spec.settings = { ...spec.settings, logo_width: 150 };
}

// ─── ALCÔVE ───────────────────────────────────────────────────────────────────────────────────────────────────────
function curateAlcove(k: Kit) {
  const { spec, img, section, overlay, faq, productHref } = k;
  k.demoMeta();
  spec.store.seo = { title: "ALCÔVE | Le fauteuil terracotta pour créer votre coin lecture", description: "Dans un logement partagé, le canapé est à tout le monde : le fauteuil ALCÔVE devient votre coin lecture, un arrondi autour d'un coussin épais." };
  k.product({
    title: "Fauteuil ALCÔVE terracotta",
    description_html: p("Son rôle : devenir votre coin lecture, dans un logement où le canapé est à tout le monde.") + p("Ce qu'on voit : un dossier et des accoudoirs d'un seul arrondi autour d'un coussin d'assise épais, un tissu terracotta à la texture visible, quatre pieds courts en bois brun.") + p("Où le mettre : dans votre chambre, au pied du lit, ou dans un coin de salon près d'une fenêtre ; nos photos le montrent dans chacune de ces places. Ses dimensions ne sont pas encore renseignées."),
    images: ["produit-01.webp", "produit-02.webp", "produit-03.webp", "produit-04.webp", "produit-05.webp"],
    tags: ["fauteuil", "terracotta", "coin lecture"],
    seo: { title: "Fauteuil ALCÔVE terracotta : vues, courbes et tissu en détail", description: "Faites le tour du fauteuil ALCÔVE : trois quarts, face, profil, dos et tissu terracotta en gros plan, puis le fauteuil vu d'en haut et en situation." },
  });

  // ─── Accueil : une alcôve, des courbes, des pièces, puis le soir. ─────────────────────────────────────────────────
  overlay("index", [
    section("ed-opening", { ...img("ambiance-07.webp"), layout: "arch", heading_tag: "h1", label: "Votre coin lecture", heading: "Une alcôve\nà soi.", text: p("Dans un logement partagé, le canapé est à tout le monde. Ce fauteuil devient votre coin lecture : un arrondi qui vous entoure, une lampe, votre livre."), button_label: "Voir le fauteuil", button_link: productHref, focus_x: 50, focus_y: 62, mobile_focus_x: 50, mobile_focus_y: 62, copy_surface: true, caption: "", motion: "reveal", padding_top: 48, padding_bottom: 72 }),
    section("fs-lookbook", { ...img("ambiance-01.webp"), layout: "side", eyebrow: "Ses courbes", heading: "Ce qui vous entoure,", heading_accent: "quand vous lisez", text: p("Touchez un repère : le dossier qui vous tient, les accoudoirs pour poser les bras, le coussin et les pieds."), align: "left", button_label: "", button_link: "", link_label: "Voir le fauteuil", focus_x: 62, focus_y: 55, effect: "fade", stagger: true, hover: false, background: "scheme", color_scheme: "scheme-2" }, [
      marker(k, 60, 33, "Le dossier, d'un seul tenant avec les accoudoirs"),
      marker(k, 80, 50, "Les accoudoirs arrondis, pour poser les bras"),
      marker(k, 56, 60, "Le coussin d'assise épais"),
      marker(k, 50, 81, "Les pieds courts en bois brun"),
    ]),
    section("rich-text", { style: "statement", align: "center", padding_top: 96, padding_bottom: 96 }, [
      { type: "eyebrow", settings: { text: "À vous" } },
      { type: "heading", settings: { text: "Le canapé est à tout le monde. Ce fauteuil est à vous.", size: "h2" } },
      { type: "text", settings: { text: p("Le dossier et les accoudoirs ne forment qu'un seul arrondi autour d'un coussin épais : une place où l'on s'installe avec son livre, et que l'on retrouve chaque soir.") } },
    ]),
    section("ed-diptych", { layout: "pair", label: "Sa place", heading: "Là où vous lisez", text: "", button_label: "", button_link: "", motion: "reveal", padding_top: 64, padding_bottom: 64 }, [
      frame(k, "ambiance-02.webp", "Le coin lecture", "Une table d'appoint pour le livre et la tasse, la lumière qui entre de biais.", "landscape", { focus_x: 60, mobile_focus_x: 60 }),
      frame(k, "ambiance-05.webp", "La chambre", "Au pied du lit, quand la chambre est la seule pièce rien qu'à vous.", "portrait", { focus_x: 58, mobile_focus_x: 58 }),
    ]),
    section("fs-campaign", { ...img("ambiance-06.webp"), layout: "card", eyebrow: "Le soir", heading: "Sous la lampe,", heading_accent: "un chapitre de plus", text: p("Une lampe en papier, un tapis épais : quand la maison se calme, on reprend le livre là où on l'avait laissé."), align: "left", label: "", offer_title: "", offer_text: "", period_text: "", conditions: "", cta_label: "Voir le fauteuil", cta_link: productHref, cta2_label: "Pièce par pièce", cta2_link: "/pages/piece-par-piece", focus_x: 62, focus_y: 55, effect: "fade", stagger: false, hover: false, background: "scheme", color_scheme: "scheme-3" }),
    section("featured-purchase", { label: "Le fauteuil", heading: "Fauteuil ALCÔVE terracotta", text: p("Avant de lui faire une place, faites-en le tour : trois quarts, face, profil, dos, puis le tissu en gros plan."), product: SHOP_KIT_HANDLE.alcove, product_target: "product:main", purchase_style: "outlined", purchase_enabled: false, image_fit: "contain", gallery_limit: 5, enable_zoom: true, link_label: "Voir la fiche complète" }),
    faq("Avant de créer votre coin", ALCOVE_FAQ.slice(0, 5), "cards", "stacked", "Où l'installer, la place qu'il prend, les couleurs, l'aspect de près, la démonstration.", { color_scheme: "scheme-2" }),
    section("newsletter", { eyebrow: "Nouvelles d'ALCÔVE", heading: "Être prévenu quand ALCÔVE ouvre", text: p("Un e-mail à l'ouverture de la boutique. Rien d'autre."), button_label: "Me prévenir", preview_note: true, legal: p("Désinscription possible à tout moment depuis chaque e-mail.") }),
  ]);

  // ─── Fiche produit ──────────────────────────────────────────────────────────────────────────────────────────────
  k.mainProduct({
    eyebrow: "Fauteuil · votre coin lecture",
    text: "Votre coin lecture à vous : un dossier et des accoudoirs d'un seul arrondi autour d'un coussin d'assise épais, en tissu terracotta texturé.",
    highlights: "Dossier et accoudoirs arrondis\nCoussin d'assise épais\nQuatre pieds courts en bois brun\nTissu terracotta à la texture visible",
    description: spec.store.product.description_html,
    specs: "dimensions, hauteur d'assise, poids, composition du tissu et du rembourrage, essence du bois des pieds, entretien",
    box: "contenu de la livraison (pieds, notice)",
    shipping: "zones, délais et frais de livraison ; montage ; délai et conditions de retour ; durée de garantie",
    settings: { gallery_layout: "carousel", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" },
  });
  overlay(k.productKey(), [
    section("image-with-text", { image_asset: img("ambiance-09.webp").image_asset, layout: "image-left", ratio: "square", reveal: "up", parallax: false, eyebrow: "Vu d'en haut", heading: "Un arc autour de l'assise, un livre à côté", text: p("Vu du dessus, le dossier et les accoudoirs se rejoignent autour du coussin ; sur la table d'appoint, le livre attend."), button_label: "", button_link: "", color_scheme: "scheme-2" }),
    section("ed-diptych", { layout: "side", label: "Deux intérieurs", heading: "Avec du bois ancien ou face à une verrière", text: "", button_label: "", button_link: "", motion: "reveal", padding_top: 64, padding_bottom: 64 }, [
      frame(k, "ambiance-04.webp", "Intérieur rétro", "Près d'un buffet en bois et d'une table basse ronde.", "portrait", { focus_x: 62 }),
      frame(k, "ambiance-08.webp", "Loft", "Face à une grande verrière, sur un tapis épais.", "portrait", { focus_x: 52 }),
    ]),
    faq("Questions sur le fauteuil", [...ALCOVE_FAQ, ...ALCOVE_FAQ_PENDING], "lines", "stacked"),
  ]);

  // ─── Pages ──────────────────────────────────────────────────────────────────────────────────────────────────────
  k.page("piece-par-piece", "Pièce par pièce", { title: "Pièce par pièce : où installer son coin lecture | ALCÔVE", description: "Jardin d'hiver, fenêtre cintrée : le fauteuil ALCÔVE là où la lumière permet de lire, pour imaginer votre coin lecture chez vous." }, [
    ["intro", section("rich-text", { style: "plain", align: "center", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 24 }, [{ type: "text", settings: { text: p("Un coin lecture se choisit pour sa lumière. Voici ALCÔVE au jardin d'hiver puis sous une fenêtre cintrée, deux endroits où l'on ouvre un livre.") } }])],
    ["jardin", section("ed-scene", { ...img("ambiance-10.webp"), layout: "panorama", label: "Jardin d'hiver", heading: "Entre les plantes, en pleine lumière", text: p("Sol en terre cuite, grandes feuilles, verrière : de la lumière pour lire en plein jour, et le terracotta du fauteuil qui répond au sol."), button_label: "", button_link: "", caption: "", focus_x: 55, focus_y: 58, mobile_focus_x: 60, mobile_focus_y: 58, motion: "reveal", padding_top: 48, padding_bottom: 72 })],
    ["fenetre", section("ed-scene", { ...img("ambiance-03.webp"), layout: "closing", label: "Près d'une fenêtre", heading: "Une arche, un rideau, un fauteuil", text: p("Sous une fenêtre cintrée, le fauteuil prend la lumière du matin : celle des premières pages."), button_label: "Voir le fauteuil", button_link: productHref, caption: "", motion: "reveal", color_scheme: "scheme-2", padding_top: 88, padding_bottom: 88 })],
  ]);
  k.page("aide", "Questions et contact", { title: "Questions et contact | ALCÔVE, votre coin lecture", description: "Où l'installer dans un logement partagé, la place qu'il prend, le terracotta, l'aspect de près : nos réponses, et un formulaire." }, [
    ["faq", faq("Questions fréquentes", [...ALCOVE_FAQ, ...ALCOVE_FAQ_PENDING], "numbered", "side", "", { color_scheme: "scheme-1" })],
    ["form", section("contact-form", { eyebrow: "Contact", heading: "Une question avant de créer votre coin ?", text: p("Écrivez-nous : le formulaire vérifie les champs avant l'envoi. Dans cette démonstration, aucun message n'est réellement transmis."), email: "", hours: "", response: "", preview_note: true, color_scheme: "scheme-2", padding_top: 64, padding_bottom: 96 })],
  ]);

  // ─── Menus, en-tête « boutique éditoriale » (le fauteuil dans le sous-menu), pied « empilé » ──────────────────────
  spec.store.menus["main-menu"] = { title: "Navigation", links: [
    { title: "Le fauteuil", url: productHref, links: [{ title: "Vues et détails", url: productHref }, { title: "Pièce par pièce", url: "/pages/piece-par-piece" }, { title: "Questions et contact", url: "/pages/aide" }] },
    { title: "Pièce par pièce", url: "/pages/piece-par-piece" },
    { title: "Aide", url: "/pages/aide" },
  ] };
  spec.store.menus.footer = { title: "Aide", links: [{ title: "Le fauteuil", url: productHref }, { title: "Pièce par pièce", url: "/pages/piece-par-piece" }, { title: "Questions et contact", url: "/pages/aide" }, { title: "Recherche", url: "/search" }] };
  const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
  header.settings = { ...header.settings, menu: "main-menu", layout: "reference-shop", shape: "bar", icons: "plain", mega_menu: "featured", mobile_menu: "drawer-right", sticky: true, transparent_on_home: false, show_search: true, show_cart: true, cta_label: "", phone: "", color_scheme: "scheme-1" };
  const promo = withDefaults(sectionSchema(spec, "header")!.blocks.find((b) => b.type === "promo")?.settings, { ...img("produit-01.webp"), eyebrow: "Le fauteuil", heading: "Fauteuil ALCÔVE terracotta", button_label: "Voir le fauteuil", link: productHref, placement: "both", menu_title: "" });
  header.blocks = { promo: { type: "promo", settings: promo } };
  header.block_order = ["promo"];
  // Pas de bandeau « Boutique de démonstration » : la mention d'aperçu (studio et aperçu statique) le dit déjà (#157).
  spec.groups.header.sections = { header };
  spec.groups.header.order = ["header"];
  const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
  footer.settings = { ...footer.settings, style: "stacked", show_wordmark: false, show_policies: false, show_payment: false, color_scheme: "scheme-2", logo_asset: "" };
  footer.blocks = {
    about: { type: "text", settings: { heading: "ALCÔVE", text: p("Le fauteuil qui devient votre coin lecture, même dans un logement partagé. Marque de démonstration du studio.") } },
    links: { type: "links", settings: { heading: "Aide", menu: "footer" } },
  };
  footer.block_order = ["about", "links"];
  for (const s of Object.values(spec.groups.footer.sections)) if (s.type !== "footer") s.disabled = true;
  k.finish();
  spec.settings = { ...spec.settings, logo_width: 170 };
}
