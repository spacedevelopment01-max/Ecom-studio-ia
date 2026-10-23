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
/** Articles du journal (pages réelles, gabarit d'article complet). */
export const MUSEAU_ARTICLES = [
  { handle: "les-petits-rituels-des-grandes-balades", title: "Les petits rituels des grandes balades", tag: "Balades", image: "ambiance-05.webp" },
  { handle: "preparer-son-sac-pour-la-balade", title: "Préparer son sac pour la balade", tag: "Conseils", image: "ambiance-03.webp" },
  { handle: "choisir-la-taille-de-son-harnais", title: "Choisir la taille de son harnais", tag: "Conseils", image: "harnais-05.webp" },
  { handle: "des-idees-pour-changer-de-chemin", title: "Des idées pour changer de chemin", tag: "Balades", image: "ambiance-07.webp" },
  { handle: "le-quotidien-en-bonne-compagnie", title: "Le quotidien, en bonne compagnie", tag: "Le club", image: "ambiance-04.webp" },
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
      description_html: f.description, images: it.views.map(k.name), tags: [it.category.toLowerCase(), "bleu cobalt"], seo: f.seo,
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
    section("cv-banner", { ...img("ambiance-02.webp"), layout: "background", band_height: "hero", veil: "light", mobile_valign: "top", image_loading: "eager", focus_x: 66, focus_y: 40, mobile_focus_x: 74, mobile_focus_y: 12, heading: "LE BONHEUR\nEST AU BOUT\nDE LA LAISSE.", heading_tag: "h1", heading_accent: "", eyebrow: "", text: p("Les essentiels de vos sorties à deux."), price_text: "", price_note: "", button_label: "On sort ?", button_link: "/collections/all", button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0 }),
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
  spec.store.menus.legal = { title: "Informations légales", links: [{ title: "Mentions légales", url: MUSEAU_PAGES.mentions }, { title: "Confidentialité", url: MUSEAU_PAGES.confidentialite }, { title: "CGV", url: MUSEAU_PAGES.cgv }] };
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

  // ─── Pages (contenu détaillé : voir pagesMuseau). ────────────────────────────────────────────────────────────────
  pagesMuseau(k, href);
  k.finish();
  spec.settings = { ...spec.settings, logo_width: 170, fab_contact_link: MUSEAU_PAGES.contact };
}

/** Bandeau d'ouverture des pages intérieures (H1). */
const pageHero = (k: Kit, file: string, heading: string, text: string, extra: Record<string, unknown> = {}) => k.section("cv-banner", { ...k.img(file), layout: "background", band_height: "tall", veil: "light", mobile_valign: "top", focus_x: 60, focus_y: 40, mobile_focus_x: 60, mobile_focus_y: 40, heading, heading_tag: "h1", heading_accent: "", eyebrow: "", text: p(text), price_text: "", price_note: "", button_label: "", button_link: "", button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0, ...extra });

function pagesMuseau(k: Kit, href: (key: string) => string) {
  const { spec } = k;
  const page = (handle: string, title: string, seo: { title: string; description: string }, rows: [string, SectionInstance][]) => {
    k.page(handle, title, seo, rows);
    // Le titre de page est porté par le bandeau (H1).
    spec.templates[`page.${handle}`].sections.title.settings = { ...spec.templates[`page.${handle}`].sections.title.settings, show_title: false, padding_top: 0, padding_bottom: 0 };
  };
  void href;
  page("le-club", "Le club", { title: "Le club | MUSEAU CLUB", description: "Pour ceux qui ne disent jamais non à une balade : l'histoire de MUSEAU CLUB." }, [["hero", pageHero(k, "ambiance-02.webp", "Pour ceux\nqui ne disent\njamais non\nà une balade.", "MUSEAU CLUB, c'est une collection d'accessoires pensés pour tous ceux qui partagent une même évidence : les plus beaux moments sont souvent dehors.")]]);
  page("journal", "Journal", { title: "Journal | MUSEAU CLUB", description: "Des idées, des inspirations et des conseils pour explorer le monde ensemble." }, [["hero", pageHero(k, "ambiance-09.webp", "Le journal\ndes sorties\nà deux.", "Des idées, des inspirations et des conseils pour explorer le monde ensemble, autrement.")]]);
  for (const a of MUSEAU_ARTICLES) page(a.handle, a.title, { title: `${a.title} | Journal MUSEAU CLUB`, description: a.title }, [["hero", pageHero(k, a.image, a.title, "Article du journal MUSEAU CLUB.")]]);
  page("guide-des-tailles", "Guide des tailles", { title: "Guide des tailles | MUSEAU CLUB", description: "Bien choisir, avant de partir : comment mesurer votre chien." }, [["hero", pageHero(k, "ambiance-09.webp", "Bien choisir,\navant de partir.", "Un bon ajustement, c'est plus de plaisir au quotidien et des balades encore plus belles.")]]);
  page("faq", "FAQ", { title: "FAQ | MUSEAU CLUB", description: "Les réponses aux questions les plus fréquentes." }, [["hero", pageHero(k, "ambiance-04.webp", "Une question\navant la balade ?", "Retrouvez ici les réponses aux questions les plus fréquentes sur nos produits, votre commande et la livraison.")]]);
  page("contact", "Contact", { title: "Contact | MUSEAU CLUB", description: "Une question ? On vous répond avec plaisir." }, [["hero", pageHero(k, "ambiance-02.webp", "Une question ?\nOn vous répond\navec plaisir.", "Envoyez-nous un message, nous vous répondrons dès que possible.")]]);
  page("livraison-retours", "Livraison et retours", { title: "Livraison et retours | MUSEAU CLUB", description: "Tout savoir avant de commander." }, [["hero", pageHero(k, "ambiance-03.webp", "Tout savoir\navant de commander.", "Retrouvez ici toutes les informations sur la livraison, le suivi de commande et les retours.")]]);
  page("mentions-legales", "Mentions légales", { title: "Mentions légales | MUSEAU CLUB", description: "Modèle de démonstration à compléter." }, [["hero", pageHero(k, "ambiance-04.webp", "Mentions\nlégales", "Cette page présente les mentions légales à titre de modèle de démonstration.")]]);
  page("confidentialite", "Confidentialité", { title: "Confidentialité | MUSEAU CLUB", description: "Modèle de démonstration à compléter." }, [["hero", pageHero(k, "ambiance-06.webp", "Notre politique\nde confidentialité", "Cette page est un modèle de démonstration, à compléter et valider.")]]);
  page("cgv", "Conditions générales de vente", { title: "CGV | MUSEAU CLUB", description: "Modèle de démonstration à compléter." }, [["hero", pageHero(k, "harnais-02.webp", "Conditions\ngénérales de vente", "Cette page présente les conditions générales de vente à titre de modèle de démonstration.")]]);
  page("connexion", "Connexion", { title: "Connexion | MUSEAU CLUB", description: "Connexion (démonstration)." }, [["hero", pageHero(k, "ambiance-09.webp", "Bon retour\nparmi nous !", "Connectez-vous à votre compte pour retrouver vos commandes et vos adresses.")]]);
}
