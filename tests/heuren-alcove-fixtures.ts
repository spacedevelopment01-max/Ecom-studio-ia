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
import { sectionSchema, withDefaults, type SectionInstance } from "../src/lib/theme/spec";

export type ShopKitId = "heuren" | "alcove";
export const SHOP_KIT_PROVENANCE = "Issue #155 (21 octobre 2026) — démonstration du studio, images IA déjà générées fournies par Thomas (commit 370c28f6), sans personne, aucun paiement";

/** Ordre d'import = rôles du thème (le dernier importé d'un rôle prend le premier emplacement). Textes alternatifs descriptifs. */
/**
 * Médias HEUREN de la maquette du 22 octobre (docs/design/heuren-reference-20261022/medias, copiés dans
 * public/theme-assets/heuren/) : une seule montre, cadran bleu nuit sans dateur, boîtier argenté, bracelet bleu nuit ;
 * coffret bleu nuit à l'intérieur ivoire. La scène du bureau défectueuse (couronne mal placée) n'est pas dans le lot :
 * seule « bureau-corrige » sert. Les anciennes photos du lot #155 restent dans le dossier, plus utilisées par la démo.
 */
export const HEUREN_MEDIA: Media[] = [
  { file: "logo.webp", role: "logo", alt: "HEUREN" },
  { file: "montre-profil.webp", role: "packshot", alt: "Montre HEUREN de profil : boîtier argenté, couronne et bracelet bleu nuit." },
  { file: "montre-face.webp", role: "packshot", alt: "Montre HEUREN de face : cadran bleu nuit soleillé sans dateur, index argentés, bracelet bleu nuit." },
  { file: "bracelet.webp", role: "detail", alt: "Gros plan du bracelet bleu nuit et de sa boucle argentée." },
  { file: "cadran-macro.webp", role: "detail", alt: "Gros plan du cadran bleu nuit soleillé, des aiguilles et des index argentés." },
  { file: "bureau-corrige.webp", role: "scene", alt: "Montre HEUREN posée sur un sous-main en cuir, à côté d'un carnet et d'un stylo, lumière du soir." },
  { file: "tissu.webp", role: "scene", alt: "Montre HEUREN posée sur un velours bleu nuit." },
  { file: "bureau-dessus.webp", role: "scene", alt: "Montre HEUREN sur un carnet en cuir noir, stylo à côté, vue de dessus." },
  { file: "cadeau-ruban.webp", role: "scene", alt: "Montre HEUREN devant un paquet cadeau noué d'un ruban bleu nuit." },
  { file: "bandeau-final.webp", role: "banner", alt: "Montre HEUREN près d'un paquet cadeau au ruban bleu nuit, lumières de la ville le soir." },
  { file: "coffret-ferme.webp", role: "lifestyle", alt: "Coffret HEUREN bleu nuit fermé, noué d'un ruban bleu nuit, sur un marbre clair." },
  { file: "coffret-ouvert.webp", role: "lifestyle", alt: "Montre HEUREN dans son coffret bleu nuit ouvert, intérieur ivoire, ruban bleu nuit sur un marbre blanc." },
  { file: "hero-mobile.webp", role: "lifestyle", alt: "Montre HEUREN posée sur une roche sombre, dans une lumière bleutée." },
  { file: "hero-desktop.webp", role: "lifestyle", alt: "Montre HEUREN posée sur une roche sombre, dans une lumière bleutée." },
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

// HEUREN — fiche de stratégie (maquette approuvée par Thomas le 22 octobre ; consigne CONSIGNE_VALIDEE.md) :
//  acheteur : une personne qui offre une montre pour marquer un moment (étape, remerciement, envie de faire plaisir) ;
//  tension : « Je veux un cadeau à la hauteur du moment » ; désir : que le cadeau reste, au poignet, après ce jour-là ;
//  promesse tenable : une montre au cadran bleu nuit sans dateur, boîtier argenté, bracelet bleu nuit, présentée dans un
//  coffret bleu nuit à l'intérieur ivoire (photos) ; 190 € = prix fictif de démonstration ;
//  jamais affirmés : dimensions, matières, mouvement, étanchéité, garantie, délais et conditions de livraison et de retour
//  (« à renseigner pour le produit réel »), avis, histoire de marque réelle.
export const HEUREN_FAQ: [string, string][] = [
  ["Comment choisir sa montre ?", "HEUREN existe en une seule version : cadran bleu nuit sans dateur, boîtier argenté, bracelet bleu nuit. Ses dimensions ne sont pas encore renseignées dans cette démonstration."],
  ["Comment entretenir le bracelet ?", "Les conseils d'entretien dépendent de la matière du bracelet, qui n'est pas encore renseignée dans cette démonstration."],
  ["Comment se déroule une commande ?", "Ajoutez la montre au panier, vérifiez votre sélection, puis passez commande. Dans cette démonstration, le panier fonctionne mais aucun paiement n'est demandé."],
];
export const HEUREN_FAQ_PENDING: [string, string][] = [
  ["Peut-on la faire graver ?", TODO("gravure possible ou non, emplacement et nombre de caractères")],
  ["Quel mouvement anime la montre ?", TODO("type de mouvement et réserve de marche")],
  ["Est-elle étanche ?", TODO("étanchéité, en mètres ou en ATM")],
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
    palette: { primary: "#15233E", secondary: "#D9DDE3", accent: "#CDB893", light: "#F7F5F0", dark: "#0D1526" },
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
  return buildKitProject(userId, { id, media: SHOP_KIT_MEDIA[id], handle: SHOP_KIT_HANDLE[id], brand: BRANDS[id], themeName: id === "heuren" ? "Heuren" : "Alcôve", provenance: SHOP_KIT_PROVENANCE, storeKind: "catalog", sector: id === "heuren" ? "bijoux" : "maison" }, id === "heuren" ? curateHeuren : curateAlcove);
}

/** Cadre d'un diptyque (photo, titre, phrase). */
const frame = (k: Kit, file: string, title: string, text: string, ratio: "landscape" | "portrait" | "square", extra: Record<string, unknown> = {}) => ({ type: "frame", settings: { ...k.img(file), title, text: p(text), link: "", link_label: "", ratio, ...extra } });
/** Questions de la section « v2-faq » (les réponses inconnues restent masquées, prêtes dans l'éditeur). */
const v2faq = (k: Kit, layout: "side" | "center", eyebrow: string, heading: string, text: string, items: [string, string][], extra: Record<string, unknown> = {}) =>
  k.section("v2-faq", { layout, eyebrow, heading, text: text ? p(text) : "", ...extra }, items.map(([question, answer]) => ({ type: "question", settings: { question, answer: p(answer) }, hidden: answer.includes("[À compléter") })));
/** Repère d'un lookbook sur le produit unique (titre seul, aucun prix). */
const marker = (_k: Kit, x: number, y: number, title: string) => ({ type: "marker", settings: { product: "", title, price_text: "", link: "", x, y } });

// ─── HEUREN (maquette du 22 octobre : docs/design/heuren-reference-20261022) ───────────────────────────────────────
const NOTE_DEMO = "Conditions de démonstration à compléter avant mise en vente.";
const A_RENSEIGNER = "à renseigner pour le produit réel.";
function curateHeuren(k: Kit) {
  const { spec, img, section, overlay, productHref } = k;
  k.demoMeta();
  spec.store.seo = { title: "HEUREN | Une montre bleu nuit à offrir, pour marquer un moment", description: "Une montre au cadran bleu nuit, présentée dans son coffret : pour célébrer une étape, remercier ou faire plaisir. Boutique de démonstration." };
  const main = k.product({
    title: "HEUREN Bleu nuit",
    description_html: p("Une montre à offrir pour marquer un moment : un cadran bleu nuit soleillé sans dateur, des index et des aiguilles argentés, un boîtier argenté et un bracelet bleu nuit, présentée dans un coffret bleu nuit à l'intérieur ivoire.") + p("Dimensions, matières, mouvement et étanchéité : " + A_RENSEIGNER),
    images: ["montre-face.webp", "montre-profil.webp", "cadran-macro.webp", "bracelet.webp", "coffret-ferme.webp"],
    tags: ["montre", "bleu nuit", "cadeau"],
    seo: { title: "HEUREN Bleu nuit : la montre à offrir, cadran bleu nuit sans dateur", description: "Cadran bleu nuit sans dateur, boîtier argenté, bracelet bleu nuit, coffret bleu nuit : faites le tour de la montre HEUREN avant de l'offrir." },
  });
  // 190 € : prix fictif de démonstration (consigne) ; une seule version, nommée par sa couleur.
  main.price = 19000;
  main.options = ["Couleur"];
  main.variants = [{ title: "Bleu nuit", options: ["Bleu nuit"], price: 19000, available: true, image: main.images[0] }];
  spec.store.collections = [{ handle: "all", title: "La boutique", description: "Une montre, une seule version : HEUREN Bleu nuit, cadran bleu nuit sans dateur, à offrir pour marquer un moment.", products: [main.handle] }];

  // ─── Accueil ─────────────────────────────────────────────────────────────────────────────────────────────────────
  overlay("index", [
    section("ed-opening", { ...img("hero-desktop.webp"), mobile_image_asset: img("hero-mobile.webp").image_asset, layout: "fullscreen", heading_tag: "h1", label: "", heading: "Marquez\nce moment.", text: p("Une montre à offrir. Un moment à garder."), button_label: "Découvrir la montre", button_link: productHref, copy_surface: false, focus_x: 62, focus_y: 50, mobile_focus_x: 12, mobile_focus_y: 60, padding_top: 0, padding_bottom: 0 }),
    section("fs-commitments", { layout: "strip", align: "center", eyebrow: "", heading: "", heading_accent: "", text: "", note: "", padding_top: 20, padding_bottom: 20 }, [
      { type: "item", settings: { icon: "box", title: "Livraison", text: "", proof_label: "", proof_link: "/pages/livraison-retours" } },
      { type: "item", settings: { icon: "return", title: "Retours", text: "", proof_label: "", proof_link: "/pages/livraison-retours" } },
      { type: "item", settings: { icon: "headset", title: "Assistance", text: "", proof_label: "", proof_link: "/pages/contact" } },
    ]),
    section("ed-scene", { ...img("coffret-ouvert.webp"), layout: "band", text_side: "left", band_height: "tall", label: "", heading: "Pour ce qui compte.", text: p("Pour célébrer une étape.<br>Ou simplement lui faire plaisir."), button_label: "Trouver son cadeau", button_link: productHref, focus_x: 70, focus_y: 50, mobile_focus_x: 78, mobile_focus_y: 50, color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0 }),
    section("ed-diptych", { layout: "triptych", label: "", heading: "", text: "", button_label: "", button_link: "", color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0 }, [
      frame(k, "cadeau-ruban.webp", "Une étape à célébrer", "", "portrait"),
      frame(k, "bureau-dessus.webp", "Un cadeau personnel", "", "portrait"),
      frame(k, "tissu.webp", "Une envie à soi", "", "portrait"),
    ]),
    section("ed-scene", { ...img("cadran-macro.webp"), layout: "band", text_side: "left", band_height: "medium", label: "", heading: "Le plaisir est dans les détails.", text: "", button_label: "", button_link: "", focus_x: 70, focus_y: 45, mobile_focus_x: 72, mobile_focus_y: 45, color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0 }, [
      { type: "link", settings: { label: "Le cadran", link: productHref } },
      { type: "link", settings: { label: "Le boîtier", link: productHref } },
      { type: "link", settings: { label: "Le bracelet", link: productHref } },
    ]),
    section("featured-purchase", { layout: "duo", label: "", heading: "HEUREN — Bleu nuit", text: "", note: "Modèle fictif", purchase_unit_label: "— prix démo", product: SHOP_KIT_HANDLE.heuren, product_target: "product:main", purchase_enabled: false, image_fit: "cover", link_label: "Voir la montre", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 24 }),
    section("fs-commitments", { layout: "aside", align: "left", eyebrow: "", heading: "Vous hésitez ?", heading_accent: "Prenons le temps.", text: "", note: "", color_scheme: "scheme-2", padding_top: 64, padding_bottom: 64 }, [
      { type: "item", settings: { icon: "ruler", title: "Découvrir les dimensions", text: "", proof_label: "", proof_link: productHref } },
      { type: "item", settings: { icon: "box", title: "Livraison et retours", text: "", proof_label: "", proof_link: "/pages/livraison-retours" } },
      { type: "item", settings: { icon: "chat", title: "Nous contacter", text: "", proof_label: "", proof_link: "/pages/contact" } },
    ]),
    v2faq(k, "side", "", "Questions fréquentes", "", HEUREN_FAQ, { color_scheme: "scheme-1", padding_top: 72, padding_bottom: 72 }),
    section("ed-scene", { ...img("bandeau-final.webp"), layout: "band", text_side: "right", band_height: "medium", button_style: "link", label: "", heading: "Le prochain moment compte aussi.", text: "", button_label: "Découvrir HEUREN", button_link: productHref, focus_x: 35, focus_y: 55, mobile_focus_x: 30, mobile_focus_y: 55, color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0 }),
  ]);

  // ─── Fiche produit ──────────────────────────────────────────────────────────────────────────────────────────────
  k.mainProduct({
    eyebrow: "",
    text: "Pour célébrer une étape, remercier ou simplement faire plaisir.",
    highlights: "",
    description: spec.store.product.description_html,
    specs: "diamètre, épaisseur, matières du boîtier et du verre, mouvement, étanchéité",
    box: "contenu exact du coffret",
    shipping: "zones, délais et frais de livraison ; délai et conditions de retour ; garantie",
    settings: { gallery_layout: "carousel", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1", display_heading: "Un cadeau qui marque.", display_intro: "HEUREN — Bleu nuit", padding_top: 0, padding_bottom: 56 },
  });
  {
    const key = k.productKey();
    const t = spec.templates[key];
    const mp = t.sections[t.order.find((x) => t.sections[x].type === "main-product")!];
    const schema = sectionSchema(spec, "main-product")!;
    const block = (type: string, settings: Record<string, unknown>) => ({ type, settings: withDefaults(schema.blocks.find((b) => b.type === type)?.settings, settings) });
    // Titre éditorial, nom, prix (mention démo), phrase, couleur et quantité, ajout avec le prix, deux liens d'aide.
    mp.blocks = {
      title: block("title", {}),
      price: block("price", {}),
      demo: block("text", { text: p("Prix et caractéristiques de démonstration.") }),
      text: block("text", { text: p("Pour célébrer une étape, remercier ou simplement faire plaisir.") }),
      buy: block("buy_buttons", { picker: "buttons", show_quantity: true, show_dynamic_checkout: false, price_in_button: true }),
      help: block("text", { text: p('<a href="/pages/livraison-retours">Livraison et retours</a>') + p('<a href="/pages/contact">Une question ? Contactez-nous</a>') }),
      specs: { ...block("collapsible", { heading: "Caractéristiques techniques", content: p(TODO("diamètre, épaisseur, matières, mouvement, étanchéité")), open: false }), disabled: true },
    };
    mp.block_order = ["title", "price", "demo", "text", "buy", "help", "specs"];
  }
  overlay(k.productKey(), [
    section("ed-scene", { ...img("cadran-macro.webp"), layout: "band", text_side: "left", band_height: "medium", label: "", heading: "Chaque détail mérite un regard.", text: "", button_label: "", button_link: "", focus_x: 62, focus_y: 40, mobile_focus_x: 70, mobile_focus_y: 40, color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0 }),
    section("fs-lookbook", { ...img("montre-profil.webp"), layout: "detail", eyebrow: "", heading: "La montre, de près.", heading_accent: "", text: "", align: "left", button_label: "", button_link: "", note: "Données techniques " + A_RENSEIGNER, color_scheme: "scheme-1", padding_top: 72, padding_bottom: 72 }, [
      { type: "marker", settings: { product: "", title: "Dimensions et ajustement", price_text: "", link: "", x: 30, y: 46, text: p("Diamètre et épaisseur du boîtier, tour de poignet : " + A_RENSEIGNER) } },
      { type: "marker", settings: { product: "", title: "Composition et mouvement", price_text: "", link: "", x: 55, y: 55, text: p("Matières du boîtier, du verre et du bracelet, type de mouvement : " + A_RENSEIGNER) } },
      { type: "marker", settings: { product: "", title: "Entretien", price_text: "", link: "", x: 86, y: 62, text: p("Conseils d'entretien du bracelet et du boîtier : " + A_RENSEIGNER) } },
    ]),
    section("ed-scene", { ...img("coffret-ferme.webp"), layout: "band", text_side: "right", text_offset: 72, band_height: "medium", label: "", heading: "Le plaisir commence à l'ouverture.", text: "", button_label: "", button_link: "", caption: "Présentation proposée pour la démonstration.", focus_x: 35, focus_y: 50, mobile_focus_x: 40, mobile_focus_y: 50, color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0 }),
    section("ed-scene", { ...img("bureau-corrige.webp"), layout: "band", text_side: "left", band_height: "medium", label: "", heading: "À porter bien après ce jour-là.", text: "", button_label: "", button_link: "", focus_x: 60, focus_y: 50, mobile_focus_x: 55, mobile_focus_y: 50, color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0 }),
    v2faq(k, "side", "", "Questions fréquentes.", "", [
      ["Comment choisir ?", "HEUREN existe en une seule version : cadran bleu nuit sans dateur, boîtier argenté, bracelet bleu nuit. Ses dimensions sont " + A_RENSEIGNER],
      ["Comment commander ?", "Choisissez la quantité, ajoutez la montre au panier, puis passez commande. Dans cette démonstration, aucun paiement n'est demandé."],
      ["Comment demander un retour ?", "Les conditions de retour sont " + A_RENSEIGNER + " Une page « Livraison et retours » les réunira."],
      ...HEUREN_FAQ_PENDING,
    ], { color_scheme: "scheme-1", padding_top: 72, padding_bottom: 72 }),
  ]);

  // ─── Boutique (une seule montre, pas de fausse collection) ─────────────────────────────────────────────────────
  spec.templates.collection = { order: ["hero", "main"], sections: {
    hero: section("ed-scene", { ...img("hero-desktop.webp"), mobile_image_asset: img("hero-mobile.webp").image_asset, layout: "band", text_side: "left", band_height: "medium", label: "HEUREN", heading: "Une montre.\nVotre moment.", heading_tag: "h2", text: p("Une seule montre, pour les instants qui comptent vraiment."), button_label: "Découvrir", button_link: productHref, focus_x: 62, focus_y: 50, mobile_focus_x: 50, mobile_focus_y: 60, color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0 }),
    main: section("main-collection", { per_page: 12, columns: 2, enable_filters: false, enable_sorting: false, color_scheme: "scheme-1" }),
  } };

  // ─── Panier : phrase d'introduction, panier vide avec la montre ; mention de démonstration sous le paiement. ──────
  for (const sec of Object.values(spec.templates.cart?.sections ?? {})) if (sec.type === "main-cart") sec.settings = { ...sec.settings, intro: "Vérifiez votre sélection avant de passer commande.", empty_image_asset: img("montre-face.webp").image_asset, empty_heading: "Votre panier attend son premier moment.", empty_text: "Certaines histoires commencent par une belle attention.", empty_button_label: "Découvrir la montre", empty_button_link: productHref, qty_buttons: true, remove_label: "Supprimer", continue_label: "← Continuer mes achats" };
  spec.settings = { ...spec.settings, cart_reassurance: "Démonstration — aucun paiement réel." };

  // ─── Pages ──────────────────────────────────────────────────────────────────────────────────────────────────────
  const page = (handle: string, title: string, seo: { title: string; description: string }, rows: [string, SectionInstance][]) => {
    k.page(handle, title, seo, rows);
    // Le titre de page est porté par la première section (H1) : la section de page garde le fil d'Ariane.
    spec.templates[`page.${handle}`].sections.title.settings = { ...spec.templates[`page.${handle}`].sections.title.settings, show_title: false, padding_top: 0, padding_bottom: 0 };
  };
  page("notre-histoire", "Notre histoire", { title: "Notre histoire | HEUREN", description: "HEUREN, marque de démonstration du studio : une montre pensée pour marquer un moment et se porter ensuite, chaque jour." }, [
    ["ouverture", section("ed-scene", { ...img("coffret-ouvert.webp"), layout: "band", text_side: "left", band_height: "tall", label: "", heading: "Les moments passent.\nCe qu'ils représentent reste.", heading_tag: "h1", text: p("HEUREN est une marque de démonstration du studio. Son idée : une montre pensée comme un repère discret, offerte pour un moment qui compte et portée ensuite au quotidien."), button_label: "Découvrir HEUREN", button_link: productHref, focus_x: 72, focus_y: 50, mobile_focus_x: 78, mobile_focus_y: 50, color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0 })],
    ["detail", section("ed-scene", { ...img("cadran-macro.webp"), layout: "split", label: "", heading: "Plus qu'une montre, un compagnon de vos plus beaux moments.", text: "", button_label: "", button_link: "", focus_x: 55, focus_y: 45, mobile_focus_x: 60, mobile_focus_y: 45, color_scheme: "scheme-1", padding_top: 48, padding_bottom: 96 })],
  ]);
  page("conseils", "Conseils et FAQ", { title: "Conseils et FAQ | HEUREN", description: "Choisir, entretenir et commander la montre HEUREN : nos réponses, et ce qui reste à renseigner dans cette démonstration." }, [
    ["faq", k.section("v2-faq", { layout: "columns", eyebrow: "", heading: "Prenons le temps de vous répondre.", heading_tag: "h1", text: p("Nos conseils et réponses aux questions les plus fréquentes, pour vous accompagner à chaque étape."), color_scheme: "scheme-1", padding_top: 72, padding_bottom: 48 }, [
      { type: "topic", settings: { ...img("cadran-macro.webp"), title: "Choisir votre montre", text: "Nos conseils pour trouver la montre qui vous correspond." } },
      { type: "question", settings: { question: "Quelle est la taille de la montre ?", answer: p("Diamètre et épaisseur du boîtier : " + A_RENSEIGNER) } },
      { type: "question", settings: { question: "Le bracelet est-il ajustable ?", answer: p("Le bracelet se ferme par une boucle argentée, visible sur nos photos. Longueur et réglage : " + A_RENSEIGNER) } },
      { type: "question", settings: { question: "La montre convient-elle à un usage quotidien ?", answer: p("Elle est pensée pour être portée après le jour où on l'offre. Étanchéité et résistance : " + A_RENSEIGNER) } },
      { type: "topic", settings: { ...img("bracelet.webp"), title: "Entretenir votre montre", text: "Nos recommandations pour préserver sa beauté dans le temps." } },
      { type: "question", settings: { question: "Comment nettoyer ma montre ?", answer: p("Les conseils de nettoyage dépendent des matières, " + A_RENSEIGNER) } },
      { type: "question", settings: { question: "Comment entretenir le bracelet ?", answer: p("Ils dépendent de la matière du bracelet, " + A_RENSEIGNER) } },
      { type: "question", settings: { question: "La montre est-elle résistante à l'eau ?", answer: p("Étanchéité : " + A_RENSEIGNER) } },
      { type: "topic", settings: { ...img("montre-profil.webp"), title: "Commander en toute sérénité", text: "Toutes les informations pour un achat simple." } },
      { type: "question", settings: { question: "Quels sont les moyens de paiement ?", answer: p("Aucun paiement n'est demandé dans cette démonstration. Les moyens de paiement de la boutique réelle sont " + A_RENSEIGNER) } },
      { type: "question", settings: { question: "Comment se passe la livraison ?", answer: p("Zones, délais et frais de livraison : " + A_RENSEIGNER) } },
      { type: "question", settings: { question: "Puis-je retourner ma montre ?", answer: p("Délai et conditions de retour : " + A_RENSEIGNER) } },
    ])],
    ["contact", section("fs-commitments", { layout: "aside", align: "left", eyebrow: "", heading: "Une autre question ?", heading_accent: "", text: p("Écrivez-nous, nous vous répondrons."), note: "", color_scheme: "scheme-3", padding_top: 40, padding_bottom: 40 }, [
      { type: "item", settings: { icon: "chat", title: "Nous contacter", text: "", proof_label: "", proof_link: "/pages/contact" } },
    ])],
  ]);
  page("contact", "Contact", { title: "Contact | HEUREN", description: "Une question sur la montre HEUREN, une commande ou un retour ? Écrivez-nous. Dans cette démonstration, aucun message n'est envoyé." }, [
    ["form", section("ed-contact", { ...img("bureau-dessus.webp"), label: "", heading: "Parlons de votre montre.", heading_tag: "h1", text: p("Une question, un conseil ou un besoin particulier ? Écrivez-nous. Dans cette démonstration, aucun message n'est réellement envoyé."), button_label: "", button_link: "", room_label: "Sujet", room_placeholder: "Sélectionnez un sujet", rooms: "Choisir sa montre\nUne commande\nUn retour\nAutre question", submit_label: "Envoyer", color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0 })],
  ]);
  page("livraison-retours", "Livraison et retours", { title: "Livraison et retours | HEUREN", description: "Livraison, retours, remboursement et assistance : les informations à compléter avant la mise en vente de la montre HEUREN." }, [
    ["ouverture", section("ed-scene", { ...img("coffret-ouvert.webp"), layout: "band", text_side: "left", band_height: "medium", label: "", heading: "Avant de commander.", heading_tag: "h1", text: p("Retrouvez ici les informations utiles sur la livraison, les retours, le remboursement et l'assistance."), button_label: "", button_link: "", focus_x: 72, focus_y: 50, mobile_focus_x: 78, mobile_focus_y: 50, color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0 })],
    ["infos", section("fs-commitments", { layout: "grid", align: "left", eyebrow: "", heading: "", heading_accent: "", text: "", note: "", color_scheme: "scheme-1", padding_top: 48, padding_bottom: 96 }, [
      { type: "item", settings: { icon: "truck", title: "Livraison", text: p("Les informations sur la préparation et l'expédition de votre commande."), proof_label: NOTE_DEMO, proof_link: "" } },
      { type: "item", settings: { icon: "box", title: "Retours", text: p("Les modalités pour retourner une montre."), proof_label: NOTE_DEMO, proof_link: "" } },
      { type: "item", settings: { icon: "return", title: "Remboursement", text: p("Les informations sur le remboursement de votre commande."), proof_label: NOTE_DEMO, proof_link: "" } },
      { type: "item", settings: { icon: "headset", title: "Assistance", text: p("Besoin d'aide ? Écrivez-nous depuis la page Contact."), proof_label: "", proof_link: "/pages/contact" } },
    ])],
  ]);

  // ─── Menus, en-tête transparent sur l'ouverture, pied bleu nuit ───────────────────────────────────────────────────
  spec.store.menus["main-menu"] = { title: "Navigation", links: [
    { title: "La montre", url: productHref },
    { title: "Notre histoire", url: "/pages/notre-histoire" },
    { title: "Conseils & FAQ", url: "/pages/conseils" },
    { title: "Contact", url: "/pages/contact" },
  ] };
  spec.store.menus.footer = { title: "HEUREN", links: [
    { title: "Boutique", url: "/collections/all" },
    { title: "Notre histoire", url: "/pages/notre-histoire" },
    { title: "Contact", url: "/pages/contact" },
    { title: "Livraison et retours", url: "/pages/livraison-retours" },
    { title: "FAQ", url: "/pages/conseils" },
  ] };
  const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
  header.settings = { ...header.settings, menu: "main-menu", layout: "logo-left", shape: "bar", icons: "plain", mega_menu: "none", mobile_menu: "fullscreen", mobile_submenu: "accordion", sticky: true, transparent_on_home: true, show_search: true, show_cart: true, cta_label: "", phone: "", color_scheme: "scheme-1" };
  header.blocks = {}; header.block_order = [];
  spec.groups.header.sections = { header };
  spec.groups.header.order = ["header"];
  const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
  footer.settings = { ...footer.settings, style: "minimal", show_wordmark: true, show_policies: false, show_payment: false, color_scheme: "scheme-2", logo_asset: "" };
  footer.blocks = { links: { type: "links", settings: { heading: "", menu: "footer" } } };
  footer.block_order = ["links"];
  for (const s of Object.values(spec.groups.footer.sections)) if (s.type !== "footer") s.disabled = true;
  k.finish();
  // Nom en lettres espacées (maquette) : le logo serif livré sur fond blanc reste l'icône du site, pas l'en-tête.
  spec.settings = { ...spec.settings, logo_asset: "", fab_contact_link: "/pages/contact" };
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
