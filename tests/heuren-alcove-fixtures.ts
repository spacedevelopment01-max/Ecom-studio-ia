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

export const HEUREN_FAQ: [string, string][] = [
  ["Comment reconnaître une montre HEUREN ?", "À son cadran bleu nuit soleillé, à ses index et aiguilles argentés, et au nom HEUREN inscrit en lettres argentées sur le cadran."],
  ["Avec quoi la porter ?", "Nos photos la montrent au bureau, avec un veston et en voyage : son bleu nuit accompagne les tenues sobres comme les tissus clairs."],
  ["Où voir tous ses détails ?", "Sur la fiche : trois quarts, face, profil, cadran et bracelet en gros plan."],
  ["Comment être prévenu des nouveautés ?", "Laissez votre adresse dans « Nouvelles d'HEUREN ». Nous écrivons seulement quand il y a du nouveau."],
  ORDER_FAQ("HEUREN"),
];
export const HEUREN_FAQ_PENDING: [string, string][] = [
  ["Quel mouvement anime la montre ?", TODO("type de mouvement et réserve de marche")],
  ["Est-elle étanche ?", TODO("étanchéité, en mètres ou en ATM")],
  ["Quelle est la taille du boîtier ?", TODO("diamètre, épaisseur, largeur entre les cornes")],
  ["De quoi sont faits le boîtier et le verre ?", TODO("matière du boîtier, du verre et du fond")],
  ["Le bracelet se change-t-il ?", TODO("système d'attache et largeur du bracelet")],
  ["Quelle est la garantie ?", TODO("durée et conditions de garantie")],
];
export const ALCOVE_FAQ: [string, string][] = [
  ["Dans quelles pièces l'installer ?", "Au salon, dans un coin lecture, près d'une fenêtre, dans une chambre ou un jardin d'hiver : nos photos le montrent dans chacune de ces pièces."],
  ["Avec quelle décoration l'associer ?", "Sur nos photos, il côtoie des bois chauds, des tapis tressés, du lin et des plantes ; sa teinte terracotta réchauffe les murs clairs."],
  ["À quoi ressemble-t-il de près ?", "Un tissu terracotta à la texture visible, un coussin d'assise épais et des pieds courts en bois brun : tous les gros plans sont sur la fiche."],
  ["Comment être prévenu des nouveautés ?", "Laissez votre adresse dans « Nouvelles d'ALCÔVE ». Nous écrivons seulement quand il y a du nouveau."],
  ORDER_FAQ("ALCÔVE"),
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
    tagline: "L'heure bleue, au poignet.", story: "HEUREN est née d'un bleu : celui du ciel juste après le coucher du soleil.", positioning: "Une montre au cadran bleu nuit pour le bureau, le soir et le voyage.",
    // Bleu nuit du cadran, argent brumeux des fonds produit, beige de la doublure, ivoire.
    palette: { primary: "#15233E", secondary: "#D9DDE3", accent: "#B8946A", light: "#F7F5F0", dark: "#0D1526" },
  },
  alcove: {
    name: "ALCÔVE", product: "Fauteuil ALCÔVE terracotta", category: "Fauteuil",
    summary: "Fauteuil enveloppant au tissu terracotta texturé : dossier et accoudoirs arrondis d'un seul tenant, coussin d'assise épais, quatre pieds courts en bois brun.",
    facts: [["Silhouette", "dossier et accoudoirs arrondis, coussin d'assise épais"], ["Pieds", "quatre pieds courts en bois brun"]],
    tagline: "Une alcôve à soi.", story: "ALCÔVE est né d'une envie simple : un fauteuil sans angle, dans la couleur chaude de la terre cuite.", positioning: "Un fauteuil enveloppant pour le salon, le coin lecture et la chambre.",
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
  spec.store.seo = { title: "HEUREN | Montre au cadran bleu nuit soleillé", description: "HEUREN, montre au cadran bleu nuit soleillé : index et aiguilles argentés, boîtier argenté, bracelet en cuir bleu nuit cousu de bleu. Vues et usages." };
  k.product({
    title: "Montre HEUREN bleu nuit",
    description_html: p("HEUREN réunit un cadran bleu nuit soleillé, des index et des aiguilles argentés et un boîtier argenté, sur un bracelet en cuir bleu nuit cousu de bleu et doublé de beige. Le nom HEUREN est inscrit sur le cadran.") + p("Au bureau, avec un veston, en voyage ou posée sur son support le soir : nos photos la montrent au fil de la journée, toujours avec la même sobriété."),
    images: ["produit-01.webp", "produit-02.webp", "produit-03.webp", "produit-04.webp", "produit-05.webp"],
    tags: ["montre", "bleu nuit", "cuir"],
    seo: { title: "Montre HEUREN bleu nuit : cadran, boîtier et bracelet en détail", description: "Faites le tour de la montre HEUREN : trois quarts, face, profil, cadran bleu nuit soleillé et bracelet en cuir cousu de bleu, en gros plan." },
  });

  // ─── Accueil : l'heure bleue, le cadran, les repères, puis la montre portée. ──────────────────────────────────────
  overlay("index", [
    section("ed-opening", { ...img("ambiance-07.webp"), layout: "journal", heading_tag: "h1", label: "Montre HEUREN", heading: "L'heure bleue,\nau poignet.", text: p("Un cadran bleu nuit soleillé, des index argentés, un bracelet de cuir cousu de bleu : HEUREN garde la lumière du soir à portée de regard."), button_label: "Découvrir la montre", button_link: productHref, focus_x: 46, focus_y: 50, mobile_focus_x: 40, mobile_focus_y: 50, copy_surface: true, caption: "", motion: "reveal", padding_top: 24, padding_bottom: 72 }),
    section("ed-statement", { ...img("produit-04.webp"), label: "Le cadran", heading: "Un bleu qui change avec la lumière", text: p("Au soleil couchant comme sous une lampe de bureau, le cadran soleillé fait rayonner ses reflets du centre vers le bord. Le nom HEUREN y est inscrit en lettres argentées, au-dessus de l'axe des aiguilles."), button_label: "", button_link: "", motion: "reveal", color_scheme: "scheme-2", padding_top: 96, padding_bottom: 96 }, [
      { type: "point", settings: { title: "Cadran soleillé", text: "Bleu nuit, reflets rayonnants du centre vers le bord." } },
      { type: "point", settings: { title: "Index et aiguilles", text: "Argentés et fins, nets sur le bleu." } },
      { type: "point", settings: { title: "Boîtier", text: "Argenté, couronne sur le côté droit." } },
      { type: "point", settings: { title: "Bracelet", text: "Cuir bleu nuit, couture bleue, doublure beige." } },
    ]),
    section("fs-lookbook", { ...img("produit-02.webp"), layout: "markers", eyebrow: "Repères", heading: "La montre,", heading_accent: "point par point", text: p("Touchez un repère : chaque détail de HEUREN a sa place sur la photo."), align: "left", button_label: "Voir la fiche", button_link: productHref, link_label: "Voir la montre", effect: "fade", stagger: true, hover: false, background: "scheme" }, [
      marker(k, 48, 33, "Le nom HEUREN, en argent sur le cadran"),
      marker(k, 37, 55, "Le cadran bleu nuit soleillé"),
      marker(k, 75, 44, "La couronne, sur le côté du boîtier"),
      marker(k, 58, 84, "Le bracelet en cuir, cousu de bleu"),
    ]),
    section("fs-campaign", { ...img("ambiance-09.webp"), layout: "background", eyebrow: "Lignes nettes", heading: "Bleu sur bleu,", heading_accent: "sous des ombres franches", text: p("Posée sur le béton, entre lumière et ombres géométriques : HEUREN aime les décors simples."), align: "left", label: "", offer_title: "", offer_text: "", period_text: "", conditions: "", cta_label: "Voir la montre", cta_link: productHref, cta2_label: "Au fil du jour", cta2_link: "/pages/au-fil-du-jour", focus_x: 55, focus_y: 50, effect: "fade", stagger: false, hover: false, background: "scheme", color_scheme: "scheme-2" }),
    section("ed-scene", { ...img("ambiance-05.webp"), layout: "split", label: "À porter", heading: "Avec un veston, une chemise blanche", text: p("Posée sur la laine pliée d'un veston, à côté d'une chemise blanche : le bleu nuit du cadran accompagne les tenues sobres."), button_label: "Au fil du jour", button_link: "/pages/au-fil-du-jour", caption: "", focus_x: 40, focus_y: 50, mobile_focus_x: 40, mobile_focus_y: 50, motion: "reveal", padding_top: 72, padding_bottom: 72 }),
    section("featured-purchase", { label: "La montre", heading: "Montre HEUREN bleu nuit", text: p("Trois quarts, face, profil, cadran, bracelet : faites le tour de la montre avant de la choisir."), product: SHOP_KIT_HANDLE.heuren, product_target: "product:main", purchase_style: "compact", purchase_enabled: false, image_fit: "contain", gallery_limit: 4, enable_zoom: true, link_label: "Voir la fiche complète", color_scheme: "scheme-4" }),
    v2faq(k, "center", "Questions", "Avant de la porter", "Les réponses courtes aux questions que l'on se pose en découvrant HEUREN.", HEUREN_FAQ.slice(0, 4)),
    section("newsletter-media", { ...img("ambiance-10.webp"), layout: "right", eyebrow: "Nouvelles d'HEUREN", heading: "Être prévenu de l'ouverture", text: p("Nouvelles photos, nouvelles vues, ouverture de la boutique : nous écrivons seulement quand il y a du nouveau."), perk_1: "", perk_2: "", perk_3: "", button_label: "S'inscrire", legal: p("Désinscription possible à tout moment depuis chaque e-mail.") }),
  ]);

  // ─── Fiche produit ──────────────────────────────────────────────────────────────────────────────────────────────
  k.mainProduct({
    eyebrow: "Montre",
    text: "Un cadran bleu nuit soleillé, des index et des aiguilles argentés, un boîtier argenté et un bracelet en cuir bleu nuit cousu de bleu.",
    highlights: "Cadran bleu nuit soleillé\nIndex et aiguilles argentés\nBoîtier argenté, couronne sur le côté\nBracelet cuir bleu nuit, couture bleue, doublure beige",
    description: spec.store.product.description_html,
    specs: "mouvement, réserve de marche, étanchéité, diamètre et épaisseur du boîtier, matières du boîtier et du verre, largeur du bracelet",
    box: "contenu exact de l'écrin",
    shipping: "zones, délais et frais de livraison ; délai et conditions de retour ; durée de garantie",
    settings: { gallery_layout: "grid", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" },
  });
  overlay(k.productKey(), [
    section("ed-diptych", { layout: "pair", label: "Deux décors", heading: "Sur l'ardoise, sur le lin", text: p("Le même bleu, deux lumières : la montre HEUREN face à un mur bleu nuit, puis sur un lin ivoire."), button_label: "", button_link: "", motion: "reveal", padding_top: 72, padding_bottom: 72 }, [
      frame(k, "ambiance-01.webp", "Sur l'ardoise", "Le cadran bleu face à un mur bleu nuit.", "landscape", { focus_x: 62 }),
      frame(k, "ambiance-06.webp", "Sur le lin", "Posée sur un lin ivoire froissé, en lumière douce.", "landscape"),
    ]),
    v2faq(k, "side", "Questions", "Questions fréquentes", "", [...HEUREN_FAQ, ...HEUREN_FAQ_PENDING]),
  ]);

  // ─── Pages ──────────────────────────────────────────────────────────────────────────────────────────────────────
  k.page("au-fil-du-jour", "Au fil du jour", { title: "Au fil du jour : la montre HEUREN du bureau au soir | HEUREN", description: "Au bureau, sur son support le soir, posée sur le travertin : la montre HEUREN au fil de la journée, en photos, pour l'imaginer à votre poignet." }, [
    ["intro", section("rich-text", { style: "plain", align: "left", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 24 }, [{ type: "text", settings: { text: p("Une montre se regarde au poignet, mais aussi posée. Voici HEUREN au fil d'une journée, du bureau du matin au support du soir.") } }])],
    ["moments", section("ed-diptych", { layout: "index", label: "Trois moments", heading: "Au bureau, en voyage, le soir", text: "", button_label: "", button_link: "", motion: "reveal", padding_top: 48, padding_bottom: 72 }, [
      frame(k, "ambiance-02.webp", "Le matin, au bureau", "Sur le noyer, à côté d'un carnet ouvert et d'un stylo.", "landscape"),
      frame(k, "ambiance-04.webp", "En voyage", "Sur sa trousse de cuir bleu, près d'une carte dépliée.", "landscape", { focus_x: 52 }),
      frame(k, "ambiance-08.webp", "Le soir, sur son support", "Sur un support argenté, à la lumière d'une lampe de chevet.", "portrait"),
    ])],
    ["fin", section("ed-scene", { ...img("ambiance-03.webp"), layout: "closing", label: "Posée", heading: "Une montre à regarder, aussi", text: p("Sur un socle de travertin, dans la lumière rasante : HEUREN se regarde même quand on ne la porte pas."), button_label: "Voir la montre", button_link: productHref, caption: "", motion: "reveal", color_scheme: "scheme-4", padding_top: 88, padding_bottom: 88 })],
  ]);
  k.page("aide", "Questions et contact", { title: "Questions et contact | HEUREN, montre bleu nuit", description: "Les réponses sur la montre HEUREN : la reconnaître, la porter, voir ses détails, commander. Et un formulaire pour toute autre question." }, [
    ["faq", faq("Questions fréquentes", [...HEUREN_FAQ, ...HEUREN_FAQ_PENDING], "numbered", "stacked", "", { color_scheme: "scheme-1" })],
    ["form", section("contact-form", { eyebrow: "Contact", heading: "Une autre question sur HEUREN ?", text: p("Écrivez-nous : le formulaire vérifie les champs avant l'envoi. Dans cette démonstration, aucun message n'est réellement transmis."), email: "", hours: "", response: "", preview_note: true, color_scheme: "scheme-4", padding_top: 64, padding_bottom: 96 })],
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
  const announce = k.announce(); announce.settings.color_scheme = "scheme-2";
  spec.groups.header.sections = { announce, header };
  spec.groups.header.order = ["announce", "header"];
  const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
  footer.settings = { ...footer.settings, style: "boxed", show_wordmark: false, show_policies: false, show_payment: false, color_scheme: "scheme-1", logo_asset: "" };
  footer.blocks = {
    about: { type: "text", settings: { heading: "HEUREN", text: p("La montre au cadran bleu nuit, pour le bureau, le soir et le voyage. Marque de démonstration du studio.") } },
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
  spec.store.seo = { title: "ALCÔVE | Fauteuil enveloppant terracotta aux lignes arrondies", description: "ALCÔVE, fauteuil enveloppant terracotta : dossier et accoudoirs arrondis, coussin d'assise épais, quatre pieds courts en bois brun. Vues et pièces." };
  k.product({
    title: "Fauteuil ALCÔVE terracotta",
    description_html: p("ALCÔVE est un fauteuil enveloppant au tissu terracotta texturé : un dossier et des accoudoirs d'un seul arrondi, un coussin d'assise épais et quatre pieds courts en bois brun.") + p("Au salon, dans un coin lecture, près d'une fenêtre ou dans une chambre, il apporte une couleur chaude et une silhouette douce, sans un angle."),
    images: ["produit-01.webp", "produit-02.webp", "produit-03.webp", "produit-04.webp", "produit-05.webp"],
    tags: ["fauteuil", "terracotta", "salon"],
    seo: { title: "Fauteuil ALCÔVE terracotta : vues, courbes et tissu en détail", description: "Faites le tour du fauteuil ALCÔVE : trois quarts, face, profil, dos et tissu terracotta en gros plan, puis le fauteuil vu d'en haut et en situation." },
  });

  // ─── Accueil : une alcôve, des courbes, des pièces, puis le soir. ─────────────────────────────────────────────────
  overlay("index", [
    section("ed-opening", { ...img("ambiance-07.webp"), layout: "arch", heading_tag: "h1", label: "Fauteuil ALCÔVE", heading: "Une alcôve\nà soi.", text: p("Un dossier qui enveloppe, des accoudoirs arrondis, un coussin d'assise épais : ALCÔVE dessine un coin rien qu'à vous, dans la couleur chaude de la terre cuite."), button_label: "Découvrir le fauteuil", button_link: productHref, focus_x: 50, focus_y: 62, mobile_focus_x: 50, mobile_focus_y: 62, copy_surface: true, caption: "", motion: "reveal", padding_top: 48, padding_bottom: 72 }),
    section("fs-lookbook", { ...img("ambiance-01.webp"), layout: "side", eyebrow: "Ses courbes", heading: "Un fauteuil,", heading_accent: "quatre repères", text: p("ALCÔVE dans un salon lumineux : touchez un repère pour le détailler."), align: "left", button_label: "", button_link: "", link_label: "Voir le fauteuil", focus_x: 62, focus_y: 55, effect: "fade", stagger: true, hover: false, background: "scheme", color_scheme: "scheme-2" }, [
      marker(k, 60, 33, "Le dossier enveloppant"),
      marker(k, 80, 50, "Les accoudoirs arrondis"),
      marker(k, 56, 60, "Le coussin d'assise épais"),
      marker(k, 50, 81, "Les pieds courts en bois brun"),
    ]),
    section("rich-text", { style: "statement", align: "center", padding_top: 96, padding_bottom: 96 }, [
      { type: "eyebrow", settings: { text: "L'idée" } },
      { type: "heading", settings: { text: "Des courbes pour s'asseoir, une couleur pour réchauffer la pièce.", size: "h2" } },
      { type: "text", settings: { text: p("Pas un angle : le dossier et les accoudoirs ne forment qu'un seul arrondi autour d'un coussin épais, posé sur quatre pieds de bois brun.") } },
    ]),
    section("ed-diptych", { layout: "pair", label: "Deux pièces", heading: "Au coin lecture, dans la chambre", text: "", button_label: "", button_link: "", motion: "reveal", padding_top: 64, padding_bottom: 64 }, [
      frame(k, "ambiance-02.webp", "Le coin lecture", "Une table d'appoint, un bouquet, la lumière qui entre de biais.", "portrait", { focus_x: 72, mobile_focus_x: 72 }),
      frame(k, "ambiance-05.webp", "La chambre", "Au pied du lit, pour poser ses affaires ou lire un moment.", "portrait", { focus_x: 58, mobile_focus_x: 58 }),
    ]),
    section("fs-campaign", { ...img("ambiance-06.webp"), layout: "card", eyebrow: "Le soir", heading: "Sous une lumière", heading_accent: "ambrée", text: p("Une lampe en papier, un tapis épais : le terracotta se fait plus profond quand la lumière baisse."), align: "left", label: "", offer_title: "", offer_text: "", period_text: "", conditions: "", cta_label: "Voir le fauteuil", cta_link: productHref, cta2_label: "Pièce par pièce", cta2_link: "/pages/piece-par-piece", focus_x: 62, focus_y: 55, effect: "fade", stagger: false, hover: false, background: "scheme", color_scheme: "scheme-3" }),
    section("featured-purchase", { label: "Le fauteuil", heading: "Fauteuil ALCÔVE terracotta", text: p("Trois quarts, face, profil, dos et tissu en gros plan : faites le tour du fauteuil avant de le choisir."), product: SHOP_KIT_HANDLE.alcove, product_target: "product:main", purchase_style: "outlined", purchase_enabled: false, image_fit: "contain", gallery_limit: 5, enable_zoom: true, link_label: "Voir la fiche complète" }),
    faq("Questions avant de l'adopter", ALCOVE_FAQ.slice(0, 4), "cards", "stacked", "Les réponses courtes aux questions que l'on se pose en découvrant ALCÔVE.", { color_scheme: "scheme-2" }),
    section("newsletter", { eyebrow: "Nouvelles d'ALCÔVE", heading: "Un e-mail quand il y a du nouveau", text: p("Nouvelles pièces photographiées, nouvelles vues, ouverture de la boutique : nous écrivons seulement quand quelque chose change."), button_label: "S'inscrire", preview_note: true, legal: p("Désinscription possible à tout moment depuis chaque e-mail.") }),
  ]);

  // ─── Fiche produit ──────────────────────────────────────────────────────────────────────────────────────────────
  k.mainProduct({
    eyebrow: "Fauteuil",
    text: "Un fauteuil enveloppant au tissu terracotta texturé : dossier et accoudoirs arrondis, coussin d'assise épais, quatre pieds courts en bois brun.",
    highlights: "Dossier et accoudoirs arrondis\nCoussin d'assise épais\nQuatre pieds courts en bois brun\nTissu terracotta à la texture visible",
    description: spec.store.product.description_html,
    specs: "dimensions, hauteur d'assise, poids, composition du tissu et du rembourrage, essence du bois des pieds, entretien",
    box: "contenu de la livraison (pieds, notice)",
    shipping: "zones, délais et frais de livraison ; montage ; délai et conditions de retour ; durée de garantie",
    settings: { gallery_layout: "carousel", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" },
  });
  overlay(k.productKey(), [
    section("image-with-text", { image_asset: img("ambiance-09.webp").image_asset, layout: "image-left", ratio: "square", reveal: "up", parallax: false, eyebrow: "Vu d'en haut", heading: "Une assise profonde, un dossier qui l'entoure", text: p("Vu du dessus, ALCÔVE dessine un arc : le dossier et les accoudoirs se rejoignent autour du coussin d'assise."), button_label: "", button_link: "", color_scheme: "scheme-2" }),
    section("ed-diptych", { layout: "side", label: "En situation", heading: "Rétro ou loft", text: "", button_label: "", button_link: "", motion: "reveal", padding_top: 64, padding_bottom: 64 }, [
      frame(k, "ambiance-04.webp", "Intérieur rétro", "Près d'un buffet en bois et d'une table basse ronde.", "portrait", { focus_x: 62 }),
      frame(k, "ambiance-08.webp", "Loft", "Face à une grande verrière, sur un tapis épais.", "portrait", { focus_x: 52 }),
    ]),
    faq("Questions fréquentes", [...ALCOVE_FAQ, ...ALCOVE_FAQ_PENDING], "lines", "stacked"),
  ]);

  // ─── Pages ──────────────────────────────────────────────────────────────────────────────────────────────────────
  k.page("piece-par-piece", "Pièce par pièce", { title: "Pièce par pièce : le fauteuil ALCÔVE chez vous | ALCÔVE", description: "Jardin d'hiver, fenêtre cintrée : le fauteuil ALCÔVE terracotta photographié dans plusieurs pièces, pour imaginer sa place chez vous." }, [
    ["intro", section("rich-text", { style: "plain", align: "center", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 24 }, [{ type: "text", settings: { text: p("Un fauteuil se choisit pour une pièce. Voici ALCÔVE dans deux lumières différentes, du jardin d'hiver à la fenêtre cintrée.") } }])],
    ["jardin", section("ed-scene", { ...img("ambiance-10.webp"), layout: "panorama", label: "Jardin d'hiver", heading: "Entre les plantes, en pleine lumière", text: p("Sol en terre cuite, grandes feuilles, verrière : le terracotta du fauteuil répond à celui du sol."), button_label: "", button_link: "", caption: "", focus_x: 55, focus_y: 58, mobile_focus_x: 60, mobile_focus_y: 58, motion: "reveal", padding_top: 48, padding_bottom: 72 })],
    ["fenetre", section("ed-scene", { ...img("ambiance-03.webp"), layout: "closing", label: "Près d'une fenêtre", heading: "Une arche, un rideau, un fauteuil", text: p("Sous une fenêtre cintrée, le fauteuil prend la lumière du matin."), button_label: "Voir le fauteuil", button_link: productHref, caption: "", motion: "reveal", color_scheme: "scheme-2", padding_top: 88, padding_bottom: 88 })],
  ]);
  k.page("aide", "Questions et contact", { title: "Questions et contact | ALCÔVE, fauteuil terracotta", description: "Les réponses sur le fauteuil ALCÔVE : pièces, décoration, détails, commande. Et un formulaire pour toute autre question." }, [
    ["faq", faq("Questions fréquentes", [...ALCOVE_FAQ, ...ALCOVE_FAQ_PENDING], "numbered", "side", "", { color_scheme: "scheme-1" })],
    ["form", section("contact-form", { eyebrow: "Contact", heading: "Une autre question sur ALCÔVE ?", text: p("Écrivez-nous : le formulaire vérifie les champs avant l'envoi. Dans cette démonstration, aucun message n'est réellement transmis."), email: "", hours: "", response: "", preview_note: true, color_scheme: "scheme-2", padding_top: 64, padding_bottom: 96 })],
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
  const announce = k.announce(); announce.settings.color_scheme = "scheme-4";
  spec.groups.header.sections = { announce, header };
  spec.groups.header.order = ["announce", "header"];
  const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
  footer.settings = { ...footer.settings, style: "stacked", show_wordmark: false, show_policies: false, show_payment: false, color_scheme: "scheme-2", logo_asset: "" };
  footer.blocks = {
    about: { type: "text", settings: { heading: "ALCÔVE", text: p("Le fauteuil enveloppant aux courbes douces, pour le salon, le coin lecture et la chambre. Marque de démonstration du studio.") } },
    links: { type: "links", settings: { heading: "Aide", menu: "footer" } },
  };
  footer.block_order = ["about", "links"];
  for (const s of Object.values(spec.groups.footer.sections)) if (s.type !== "footer") s.disabled = true;
  k.finish();
  spec.settings = { ...spec.settings, logo_width: 170 };
}
