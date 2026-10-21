/**
 * Démonstrations de l'issue #158 : MUSEAU CLUB (harnais, laisse, collier et pochette à sacs pour chiens) — SOUPLE suivra.
 * Thèmes **de la famille E-commerce** (celle d'ORBE, HEUREN et ALCÔVE), jamais « boutique spécialisée » malgré la niche :
 * exactement quatre produits distincts par boutique, cinq vues par produit, dix ambiances ; les vues ne sont pas des
 * produits, le coffret photographié n'en crée pas un cinquième ni une offre.
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

export type MultiKitId = "museau-club";
export const MULTI_KIT_PROVENANCE = "Issue #158 (21 octobre 2026) — démonstration du studio, visuels d'origine fournis par Thomas (commit 8260bafd), des chiens et aucune personne, aucun paiement";

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
export const MULTI_KIT_MEDIA: Record<MultiKitId, Media[]> = { "museau-club": MUSEAU_MEDIA };

/** Les quatre produits : identifiant court (fiche, modèle), poignée, vues dans l'ordre de la galerie. */
export type KitProduct = { key: string; handle: string; title: string; category: string; views: string[] };
export const MUSEAU_PRODUCTS: KitProduct[] = [
  { key: "harnais", handle: "harnais-museau-club-cobalt", title: "Harnais MUSEAU CLUB cobalt", category: "Harnais", views: ["harnais-01.webp", "harnais-02.webp", "harnais-05.webp", "harnais-03.webp", "harnais-04.webp"] },
  { key: "laisse", handle: "laisse-museau-club-cobalt", title: "Laisse MUSEAU CLUB cobalt", category: "Laisse", views: ["laisse-01.webp", "laisse-02.webp", "laisse-05.webp", "laisse-04.webp", "laisse-03.webp"] },
  { key: "collier", handle: "collier-museau-club-cobalt", title: "Collier MUSEAU CLUB cobalt", category: "Collier", views: ["collier-01.webp", "collier-02.webp", "collier-05.webp", "collier-03.webp", "collier-04.webp"] },
  { key: "pochette", handle: "pochette-sacs-museau-club-cobalt", title: "Pochette à sacs MUSEAU CLUB cobalt", category: "Pochette à sacs", views: ["pochette-01.webp", "pochette-02.webp", "pochette-03.webp", "pochette-05.webp", "pochette-04.webp"] },
];
export const MULTI_KIT_PRODUCTS: Record<MultiKitId, KitProduct[]> = { "museau-club": MUSEAU_PRODUCTS };

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
};

export async function multiKitProject(userId: string, id: MultiKitId) {
  const main = MULTI_KIT_PRODUCTS[id][0];
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
