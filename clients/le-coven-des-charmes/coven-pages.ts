/**
 * Le Coven des Charmes — contenu des pages d'après les six planches finales (textes des maquettes, typographie
 * corrigée). Tout ce que les planches laissent « à renseigner » le reste : aucun prix, délai, matière ni mention légale
 * inventés. Chaque valeur est un réglage de section, modifiable dans le studio.
 */
import type { CovenSectionDef } from "./coven-spec";
import type { StoreProduct } from "../../src/lib/theme/spec";

type Ctx = { img: (file: string) => string; v: (clientFile: string | null, crop: string) => string; mode: "client" | "controle"; preview: boolean; hd: boolean; hdFile: (n: string) => string };

export const PRODUCT_HANDLE = "bracelet-de-charms-surprise";
export const URL = {
  home: "/", product: `/products/${PRODUCT_HANDLE}`, tirage: "/pages/le-tirage", coven: "/pages/le-coven", creations: "/pages/creations",
  faq: "/pages/faq", contact: "/pages/contact", infos: "/pages/informations", commande: "/pages/commande", confirmation: "/pages/confirmation",
  compte: "/pages/compte", cart: "/cart", collection: "/collections/all",
};
export const CENTRAL = "Bracelet de charms surprise — les charms sont tirés au sort au scoop, puis assemblés sur le bracelet après la commande.";

export const COVEN_PRODUCT = (ctx: Ctx): StoreProduct => ({
  title: "Bracelet de charms surprise",
  handle: PRODUCT_HANDLE,
  vendor: "Le Coven des Charmes",
  description_html: `<p>${CENTRAL}</p><p>Les photos montrent des exemples de créations : elles ne garantissent pas la présence de ces charms sur votre bracelet.</p>`,
  price: null,
  compare_at_price: null,
  currency: "EUR",
  options: [],
  variants: [{ title: "Default Title", options: [], price: null, available: true }],
  images: (ctx.hd ? ["02", "05"].map(ctx.hdFile) : ["coven-photo-bracelet.jpg", "coven-photo-poignet.jpg"].map(ctx.img)).filter(Boolean),
  tags: ["bracelet", "charms"],
  seo: { title: "Bracelet de charms surprise — Le Coven des Charmes", description: CENTRAL },
});

const page = (handle: string, title: string, suffix: string): Record<string, unknown> => ({ handle, title, template_suffix: suffix, body_html: "", status: "published" });
export const COVEN_PAGES = [
  page("le-tirage", "Le tirage au scoop", "coven-tirage"),
  page("le-coven", "Le Coven", "coven-coven"),
  page("creations", "Les créations", "coven-creations"),
  page("faq", "Questions fréquentes", "coven-faq"),
  page("contact", "Contact", "coven-contact"),
  page("informations", "Informations", "coven-informations"),
  page("commande", "Commande", "coven-commande"),
  page("confirmation", "Confirmation", "coven-confirmation"),
  page("compte", "Mon compte", "coven-compte"),
];

const links = (...l: [string, string][]) => l.map(([title, url]) => ({ title, url }));
export const COVEN_MENUS = {
  "coven-gauche": { title: "En-tête, gauche", links: links(["Les Bracelets de charms", URL.product], ["Le tirage au scoop", URL.tirage], ["Le Coven des Charmes", URL.coven]) },
  "coven-gauche-court": { title: "En-tête, gauche (version courte)", links: links(["Les bracelets de charms", URL.product], ["Le tirage au scoop", URL.tirage]) },
  "coven-droite": { title: "En-tête, droite", links: links(["Le Coven", URL.coven], ["Les créations", URL.creations], ["Aide", URL.faq]) },
  "coven-mobile": { title: "Menu du téléphone", links: links(["Accueil", URL.home], ["Le Bracelet de charms surprise", URL.product], ["Le tirage au scoop", URL.tirage], ["Le Coven", URL.coven], ["Les créations", URL.creations], ["Questions fréquentes", URL.faq], ["Contact", URL.contact], ["Mon compte", URL.compte], ["Informations", URL.infos]) },
  "coven-pied-1": { title: "Pied, colonne 1", links: links(["Les Bracelets de charms", URL.product], ["Le tirage au scoop", URL.tirage], ["Le Coven", URL.coven]) },
  "coven-pied-2": { title: "Pied, colonne 2", links: links(["Inspirations", URL.creations], ["FAQ", URL.faq], ["Contact", URL.contact]) },
  "coven-pied-3": { title: "Pied, colonne 3", links: links(["Mentions légales", `${URL.infos}#mentions`], ["CGV", `${URL.infos}#cgv`], ["Confidentialité", `${URL.infos}#confidentialite`], ["Cookies", `${URL.infos}#cookies`]) },
  "coven-pied-ligne": { title: "Pied, liens en ligne", links: links(["Les bracelets de charms", URL.product], ["Le tirage au scoop", URL.tirage], ["Le Coven", URL.coven], ["Les créations", URL.creations], ["Aide", URL.faq], ["Contact", URL.contact]) },
  "coven-pied-legal": { title: "Pied, liens légaux", links: links(["Mentions légales", `${URL.infos}#mentions`], ["CGV", `${URL.infos}#cgv`], ["Confidentialité", `${URL.infos}#confidentialite`], ["Cookies", `${URL.infos}#cookies`]) },
};

export const COVEN_HEADER = (ctx: Ctx): CovenSectionDef[] => [
  ["header", "es-custom-coven-header", { logo_asset: ctx.img("coven-logo.jpg"), cta_link: URL.product, account_link: URL.compte }],
];
export const COVEN_FOOTER = (ctx: Ctx): CovenSectionDef[] => [
  ["footer", "es-custom-coven-footer", { logo_asset: ctx.img("coven-logo.jpg") }],
];

const p = (...lines: string[]) => lines.map((l) => `<p>${l}</p>`).join("");

const step = (title: string, text: string, extra: Record<string, unknown> = {}) => ({ type: "step", settings: { title, text, ...extra } });
const fam = (title: string, text: string, extra: Record<string, unknown> = {}) => ({ type: "family", settings: { title, text, ...extra } });
const ex = (image_asset: string, extra: Record<string, unknown> = {}) => ({ type: "example", settings: { image_asset, image_alt: "Exemple de bracelet de charms", ...extra } });
const q = (question: string, answer: string, category: string, extra: Record<string, unknown> = {}) => ({ type: "question", settings: { question, answer, category, ...extra } });
const EX_CAPTION = "Exemple de bracelet —\nles charms dépendent du tirage.";

/** Tiroirs du cabinet du client (photo 1000034259) : cadrage de chaque tiroir étiqueté. */
const DRAWER: Record<string, { focus_x: number; focus_y: number; zoom: number }> = {
  familiers: { focus_x: 9, focus_y: 47, zoom: 470 }, divinations: { focus_x: 41, focus_y: 47, zoom: 470 }, accessoires: { focus_x: 11, focus_y: 66, zoom: 470 },
  mysteres: { focus_x: 26, focus_y: 66, zoom: 470 }, pierres: { focus_x: 41, focus_y: 66, zoom: 470 }, rituels: { focus_x: 12, focus_y: 85, zoom: 470 }, protections: { focus_x: 41, focus_y: 85, zoom: 470 },
};

/** Tiroirs ouverts des images HD du client (37 à 42). */
const DRAWER_HD: Record<keyof typeof DRAWER, string> = { familiers: "37", divinations: "38", accessoires: "37", mysteres: "39", pierres: "40", rituels: "41", protections: "42" };

export const COVEN_TEMPLATES = (ctx: Ctx): Record<string, CovenSectionDef[]> => {
  // « client » : photos du téléphone du client (repli quand les images HD du client ne sont pas fournies).
  const client = ctx.mode === "client" && !ctx.hd;
  const cab = (k: keyof typeof DRAWER, crop: string) => (ctx.hd ? { image_asset: ctx.hdFile(DRAWER_HD[k]), image_alt: "Tiroir du cabinet du Coven" }
    : client ? { image_asset: ctx.img("coven-photo-cabinet.jpg"), image_alt: "Tiroir du cabinet du Coven", ...DRAWER[k] } : { image_asset: ctx.img(`coven-mq-${crop}.jpg`) });
  return {
  index: [
    ["hero", "es-custom-coven-hero", {
      layout: "home", mobile_layout: "over", mobile_media_top: 35, height: 928, mobile_height: 560,
      image_asset: ctx.v("coven-photo-cabinet.jpg", "accueil-scene"), image_alt: "Le cabinet aux tiroirs du Coven des Charmes",
      ...(client ? { media_left: 36, focus_x: 24, focus_y: 70, zoom: 100, shade: 40, brightness: 62, warmth: 35 } : { media_left: 0, focus_x: 50, focus_y: 50, zoom: 100, shade: 0 }),
      mobile_image_asset: ctx.v("coven-photo-cabinet.jpg", "m-accueil-scene"), mobile_focus_x: client ? 28 : 50, mobile_focus_y: client ? 60 : 50,
      eyebrow: "Bracelets de charms surprise", title: "Des charms\ntirés au sort.\nUn bracelet\nassemblé pour vous.", text_size: 30, mobile_title: "Des charms tirés au sort.\nUn bracelet assemblé pour vous.", show_rule: true,
      text: p("Vous commandez votre bracelet.<br>Nous tirons les charms au sort avec un scoop,<br>puis nous les assemblons sur votre bracelet."),
      mobile_text: p("Vous commandez votre bracelet. Nous tirons les charms au sort avec un scoop, puis nous les assemblons sur votre bracelet."),
      button_label: "Commander mon bracelet", button_link: URL.product, button2_label: "Comprendre le tirage", button2_link: URL.tirage,
      discover_label: "Découvrir notre univers", discover_link: URL.coven, title_size: 76, mobile_title_size: 26, text_width: 640, text_x: 115, text_y: 54,
    }],
    ["steps", "es-custom-coven-steps", {
      layout: "band", mobile_layout: "photos", heading: "Du tirage des charms au bracelet.", mobile_heading: "Tout commence dans une coupelle.",
      aside_asset: ctx.img("coven-mq-accueil-coupelle.jpg"), padding_top: 0, padding_bottom: 0,
    }, [
      step("Vous commandez\nle bracelet", "Vous passez votre\ncommande en ligne.", { mobile_text: "Vous choisissez la taille de votre bracelet et la quantité souhaitée.", image_asset: ctx.img("coven-mq-m-accueil-etape-1.jpg") }),
      step("Les charms sont\ntirés au sort au scoop", "Nous tirons des symboles\nau hasard avec un scoop\ndans une coupelle.", { mobile_text: "Après votre commande, nous tirons les charms au sort avec un scoop dans une coupelle.", image_asset: ctx.img("coven-mq-m-accueil-etape-2.jpg") }),
      step("Les charms désignés\nsont réunis", "Les symboles déterminent\nles charms à assembler\npour votre bracelet.", { mobile_text: "Les symboles tirés indiquent les charms à préparer.", ...(client ? { image_asset: ctx.img("coven-photo-cabinet.jpg"), image_alt: "Tiroir Familiers du cabinet", focus_x: 9, focus_y: 47, zoom: 300 } : { image_asset: ctx.img("coven-mq-m-accueil-etape-3.jpg") }) }),
      step("Votre bracelet\nest assemblé", "", { mobile_title: "Votre bracelet est assemblé", mobile_text: "Les charms sont ensuite assemblés sur votre bracelet, par nos soins.", ...(client ? { image_asset: ctx.img("coven-photo-poignet.jpg"), image_alt: "Exemple de bracelet assemblé", focus_y: 40, zoom: 130 } : { image_asset: ctx.img("coven-mq-m-accueil-etape-4.jpg") }) }),
    ]],
    ["families", "es-custom-coven-families", {
      layout: "drawers", mobile_layout: "list", heading: "Les symboles désignent les charms.", subheading: "Les symboles du scoop déterminent quels charms sont assemblés sur votre bracelet.",
      mobile_heading: "Derrière chaque tiroir, un univers.", mobile_subheading: "Les symboles désignent les charms. Voici quelques thèmes présents dans nos tirages.",
      bg_asset: client || ctx.hd ? "" : ctx.img("coven-mq-accueil-tiroirs.jpg"), label_style: client || ctx.hd ? "plaque" : "photo", padding_top: 0, padding_bottom: 0,
    }, [
      fam("Familiers", "Animaux, esprits et créatures\nqui vous accompagnent.", cab("familiers", "m-accueil-tiroir")),
      fam("Divination", "Astres, cartes et arts\nprédictifs.", cab("divinations", "m-accueil-tiroir")),
      fam("Charmes\n& Mystères", "Symboles, lunes et secrets\ninexpliqués.", { mobile_title: "Charmes & mystères", ...cab("mysteres", "m-accueil-tiroir") }),
      fam("Pierres &\nArbres de vie", "Cristaux, nature et énergies.", { mobile_title: "Pierres & arbres de vie", ...cab("pierres", "m-accueil-tiroir") }),
      fam("Rituels", "Objets et signes pour\nvos pratiques.", cab("rituels", "m-accueil-tiroir")),
      fam("Protection", "Talismans et symboles\nde protection.", cab("protections", "m-accueil-tiroir")),
    ]],
    ["examples", "es-custom-coven-gallery", { layout: "arches", mobile_layout: "three", heading: "Des exemples de bracelets réalisés.", mobile_heading: "Quelques exemples de bracelets", default_caption: EX_CAPTION, padding_top: 0, padding_bottom: 0 }, [
      ex(ctx.v("coven-photo-bracelet.jpg", "accueil-exemple-1"), { mobile_caption: "Exemple — charms déterminés\npar le tirage.", ...(client ? { focus_y: 55 } : {}) }),
      ex(ctx.v("coven-photo-poignet.jpg", "accueil-exemple-2"), { mobile_caption: "Exemple — charms déterminés\npar le tirage.", ...(client ? { focus_y: 45 } : {}) }),
      ex(ctx.img("coven-mq-accueil-exemple-3.jpg"), { mobile_caption: "Exemple — charms déterminés\npar le tirage." }),
    ]],
    ["symbols", "es-custom-coven-band", {
      layout: "split", hide_mobile: true, image_asset: ctx.v("coven-photo-bracelet.jpg", "accueil-livre"), image_alt: "Charm en croissant de lune sur un bracelet", media_width: 55, height: 196,
      ...(client ? { focus_y: 30, zoom: 140 } : {}), heading: "Des symboles, des charms,\nun bracelet unique.", title_size: 40, text_x: 803, text_width: 560,
      text: p("Chaque bracelet est unique. Les charms sont tirés<br>au sort avec un scoop après votre commande,<br>puis assemblés un à un dans notre atelier."),
    }],
    ["care", "es-custom-coven-band", {
      layout: "split", hide_desktop: true, mobile_layout: "side", image_asset: ctx.img("coven-mq-m-accueil-coupelle.jpg"), image_alt: "Coupelle de symboles et scoop",
      heading: "Le soin du geste.\nLa surprise du tirage.", mobile_title_size: 17,
      text: p("Chaque bracelet est unique, assemblé par nos soins après un tirage au scoop. Les photos montrent des exemples de créations."),
      button_label: "Commander mon bracelet", button_link: URL.product, button_arrow: true,
    }],
    ["cta", "es-custom-coven-band", {
      layout: "cta", hide_mobile: true, image_asset: ctx.img("coven-mq-accueil-bougies.jpg"), image_alt: "", height: 172, heading: "Votre prochain bracelet\npourrait être le vôtre.", title_size: 38,
      button_label: "Commander mon bracelet", button_link: URL.product, button_arrow: true,
    }],
    ["news", "es-custom-coven-band", {
      layout: "newsletter", hide_desktop: true, icon: "email", heading: "Recevez les inspirations du Coven ?", text: p("Occasionnellement, des nouvelles et des créations."),
    }],
  ],
  product: [
    ["main", "es-custom-coven-product", {
      mobile_media_top: 35,
      mobile_text: "Après votre commande, le tirage au scoop détermine les charms de votre bracelet. Les photos sont des exemples.",
      mobile_notice: "Les charms sont tirés au sort au scoop après votre commande, puis assemblés sur votre bracelet. Les photos montrent des exemples de créations.",
      collection_link: URL.product,
    }, client ? [
      { type: "photo", settings: { image_asset: ctx.img("coven-photo-bracelet.jpg"), image_alt: "Exemple de bracelet de charms sur une toile astrologique", focus_y: 45, thumb_focus_y: 45 } },
      { type: "photo", settings: { image_asset: ctx.img("coven-photo-poignet.jpg"), image_alt: "Exemple de bracelet de charms porté au poignet", focus_x: 55 } },
      { type: "photo", settings: { image_asset: ctx.img("coven-photo-cabinet.jpg"), image_alt: "Le cabinet aux tiroirs étiquetés", focus_x: 25 } },
      { type: "photo", settings: { image_asset: ctx.img("coven-photo-tableau.jpg"), image_alt: "Le tableau de correspondance des symboles" } },
    ] : [1, 2, 3, 4, 5, 6].map((i) => ({ type: "photo", settings: {
      image_asset: ctx.img(i === 1 ? "coven-mq-produit-photo.jpg" : `coven-mq-produit-vignette-${i}.jpg`), image_alt: "Exemple de bracelet de charms (visuel de maquette)",
      ...(i === 1 ? { mobile_image_asset: ctx.img("coven-mq-m-produit-photo.jpg") } : {}),
      thumb_asset: ctx.img(`coven-mq-produit-vignette-${i}.jpg`), ...(i <= 4 ? { mobile_thumb_asset: ctx.img(`coven-mq-m-produit-vignette-${i}.jpg`) } : { mobile_hidden: true }),
    } }))],
    ["steps", "es-custom-coven-steps", { layout: "photos", mobile_layout: "thumbs", heading: "Le tirage des charms, étape par étape", mobile_heading: "Vous recevez un bracelet assemblé.", padding_top: 0, padding_bottom: 14 }, [
      step("Vous commandez le bracelet", "", { desktop_hidden: true, mobile_title: "Vous\ncommandez\nle bracelet", mobile_text: "Taille de bracelet\net quantité.", icon: "panier", ...(client || ctx.hd ? {} : { image_asset: ctx.img("coven-mq-m-produit-etape-1.jpg") }) }),
      step("Des symboles sont tirés\nau hasard au scoop.", "", { mobile_title: "Les charms\nsont tirés au sort\nau scoop", mobile_text: "Après votre commande, nous tirons les charms au sort.", image_asset: ctx.img("coven-mq-produit-etape-1.jpg"), mobile_image_asset: ctx.img("coven-mq-m-produit-etape-2.jpg") }),
      step("Les charms correspondants\nsont réunis dans les tiroirs.", "", { mobile_title: "Les charms\ndésignés sont réunis", mobile_text: "Les symboles tirés indiquent les charms à préparer.", ...(client ? { image_asset: ctx.img("coven-photo-cabinet.jpg"), image_alt: "Tiroirs du cabinet", focus_x: 26, focus_y: 66, zoom: 260 } : { image_asset: ctx.img("coven-mq-produit-etape-2.jpg"), mobile_image_asset: ctx.img("coven-mq-m-produit-etape-3.jpg") }) }),
      step("Votre bracelet est assemblé\navec soin.", "", { mobile_title: "Votre bracelet\nest assemblé", mobile_text: "Les charms sont assemblés sur votre bracelet, par nos soins.", ...(client ? { image_asset: ctx.img("coven-photo-poignet.jpg"), image_alt: "Exemple de bracelet assemblé", focus_y: 40, zoom: 120 } : { image_asset: ctx.img("coven-mq-produit-etape-3.jpg"), mobile_image_asset: ctx.img("coven-mq-m-produit-etape-4.jpg") }) }),
    ]],
    ["details", "es-custom-coven-details", {}, [
      { type: "detail", settings: { title: "Matériaux", mobile_hidden: true } },
      { type: "detail", settings: { title: "Dimensions", mobile_hidden: true } },
      { type: "detail", settings: { title: "Matériaux et dimensions", icon: "cristal", desktop_hidden: true } },
      { type: "detail", settings: { title: "Entretien", mobile_hidden: true } },
      { type: "detail", settings: { title: "Conseils d'entretien", icon: "protection", desktop_hidden: true } },
      { type: "detail", settings: { title: "Livraison & retours", mobile_hidden: true } },
      { type: "detail", settings: { title: "Livraison", icon: "expedition", desktop_hidden: true } },
    ]],
    ["examples", "es-custom-coven-gallery", { layout: "cards", mobile_layout: "two", heading: "Des exemples de bracelets réalisés", mobile_heading: "Autres exemples de créations", subheading: "<p>Découvrez quelques créations. Chaque bracelet est unique et les charms dépendent du tirage.</p>", default_caption: EX_CAPTION, padding_top: 0, padding_bottom: 0 }, [
      ex(ctx.v("coven-photo-bracelet.jpg", "produit-exemple-1"), { mobile_caption: "Exemple — charms déterminés par le tirage.", ...(client ? {} : { mobile_image_asset: ctx.img("coven-mq-m-produit-exemple-1.jpg") }) }),
      ex(ctx.v("coven-photo-poignet.jpg", "produit-exemple-2"), { mobile_caption: "Exemple — charms déterminés par le tirage.", ...(client ? {} : { mobile_image_asset: ctx.img("coven-mq-m-produit-exemple-2.jpg") }) }),
      ex(ctx.img("coven-mq-produit-exemple-3.jpg"), { mobile_hidden: true }),
      ex(ctx.img("coven-mq-produit-exemple-4.jpg"), { mobile_hidden: true }),
    ]],
    ["cta", "es-custom-coven-band", {
      layout: "cta_left", hide_mobile: true, image_asset: ctx.img("coven-mq-produit-bougies.jpg"), height: 240, heading: "Prête à découvrir votre bracelet ?", title_size: 40,
      text: p("Laissez le tirage au scoop révéler les charms qui composeront votre histoire."), button_label: "Ajouter au panier", button_link: "#CvnProductForm", button_arrow: true,
    }],
  ],
  "page.coven-tirage": [
    ["hero", "es-custom-coven-hero", {
      layout: "left", mobile_layout: "top", mobile_align: "left", height: 558, mobile_media_top: 35, mobile_height: 350, image_asset: ctx.img("coven-mq-tirage-scene.jpg"), mobile_image_asset: ctx.img("coven-mq-m-tirage-scene.jpg"), image_alt: "Coupelle de symboles et scoop", shade: 0, ...(ctx.hd ? { media_left: 36 } : {}),
      title: "Comment les charms\nsont-ils tirés au sort ?", text_size: 31, mobile_title: "Le tirage des\ncharms au scoop.", title_size: 70, mobile_title_size: 33, text_x: 88, text_y: 102, text_width: 760,
      text: p("Vous commandez un bracelet.<br>Après votre achat, nous réalisons<br>un tirage au scoop, puis assemblons<br>les charms désignés sur votre bracelet."),
      mobile_text: p("Des charms tirés au sort,<br>puis assemblés sur votre bracelet."), mobile_text_y: 0,
    }],
    ["intro", "es-custom-coven-band", { layout: "note", hide_desktop: true, mobile_layout: "stack", text: p("Les charms sont tirés au sort au scoop après votre commande, puis assemblés sur votre bracelet. Chaque bracelet est une création unique réalisée avec soin dans notre atelier.") }],
    ["steps", "es-custom-coven-steps", { layout: "cards", mobile_layout: "icons", framed: false, heading: "Les 4 étapes du tirage au scoop", heading_style: "caps", hide_heading_mobile: true, footnote: "Vous recevez le bracelet assemblé\navec les charms désignés par le tirage.", padding_top: 8, padding_bottom: 0 }, [
      step("Commande\ndu bracelet", "Vous commandez un bracelet\nde charms surprise.", { mobile_title: "Commande du bracelet", mobile_text: "Vous commandez votre bracelet de charms surprise sur notre site.", icon: "panier", image_asset: ctx.img("coven-mq-tirage-etape-1.jpg") }),
      step("Tirage des charms\nau scoop", "Après votre commande,\nnous réalisons un tirage\nau scoop dans une coupelle.", { mobile_title: "Tirage des charms\nau scoop", mobile_text: "Après votre commande, nous tirons au sort les symboles dans une coupelle, à l'aide d'un scoop.", icon: "scoop", image_asset: ctx.img("coven-mq-tirage-etape-2.jpg") }),
      step("Sélection des\ncharms désignés", "Chaque symbole tiré\ncorrespond à un charm\nde notre cabinet.", { mobile_title: "Sélection des charms\ndésignés", mobile_text: "Les symboles tirés au sort correspondent aux charms qui seront assemblés sur votre bracelet.", icon: "cabinet-tiroirs", ...(client ? { image_asset: ctx.img("coven-photo-cabinet.jpg"), image_alt: "Tiroir Familiers du cabinet", focus_x: 9, focus_y: 47, zoom: 300 } : { image_asset: ctx.img("coven-mq-tirage-etape-3.jpg") }) }),
      step("Assemblage\ndu bracelet", "Nous assemblons à la main\nvotre bracelet avec les\ncharms désignés par le tirage.", { mobile_title: "Assemblage du bracelet", mobile_text: "Nous assemblons les charms désignés sur votre bracelet avec soin dans notre atelier.", icon: "assemblage", ...(client ? { image_asset: ctx.img("coven-photo-poignet.jpg"), image_alt: "Exemple de bracelet assemblé", focus_y: 40, zoom: 120 } : { image_asset: ctx.img("coven-mq-tirage-etape-4.jpg") }) }),
    ]],
    ["families", "es-custom-coven-families", { layout: "cards", mobile_layout: "chips", heading: "Les catégories de charms (à titre d'explication)", heading_style: "caps", mobile_heading: "Les catégories de symboles", mobile_subheading: "(exemples, à titre indicatif)", note: "Les symboles tirés au sort déterminent\nles charms de votre bracelet.", padding_top: 8, padding_bottom: 8 }, [
      fam("Familiers", "Des charms\nsur le thème\ndes familiers.", { icon: "chat", mobile_order: 1, ...(client ? cab("familiers", "") : { image_asset: ctx.img("coven-mq-tirage-famille-1.jpg") }) }),
      fam("Divinations", "Des charms\nsur le thème\ndes divinations.", { icon: "chapeau", mobile_order: 2, ...(client ? cab("divinations", "") : { image_asset: ctx.img("coven-mq-tirage-famille-2.jpg") }) }),
      fam("Symboles mystiques", "Des charms\nsur le thème\nmystiques.", { mobile_title: "Charms\nMystères", icon: "crane", mobile_order: 4, ...(client ? cab("mysteres", "") : { image_asset: ctx.img("coven-mq-tirage-famille-3.jpg") }) }),
      fam("Accessoires", "Des charms\nsur le thème\ndes accessoires.", { icon: "botte", mobile_order: 3, ...(client ? cab("accessoires", "") : { image_asset: ctx.img("coven-mq-tirage-famille-4.jpg") }) }),
      fam("Éléments\nde la nature", "Des charms\nsur le thème\ndes éléments de la nature.", { mobile_title: "Pierres\nArbres de vie", icon: "rameau", mobile_order: 6, ...(client ? cab("pierres", "") : { image_asset: ctx.img("coven-mq-tirage-famille-5.jpg") }) }),
      fam("Rituels", "Des charms\nsur le thème\ndes rituels.", { icon: "os", mobile_order: 5, ...(client ? cab("rituels", "") : { image_asset: ctx.img("coven-mq-tirage-famille-6.jpg") }) }),
    ]],
    ["table", "es-custom-coven-band", {
      layout: "table", hide_mobile: true, image_asset: ctx.v("coven-photo-tableau.jpg", "tirage-tableau"), image_alt: "Le tableau de correspondance des symboles", media_width: 40, height: 210, ...(client ? { focus_y: 40, zoom: 130 } : {}),
      heading: "Notre tableau de correspondance", heading_style: "caps", text: p("Chaque symbole tiré au scoop correspond à un charm<br>de notre cabinet. Découvrez le tableau en détail."),
      button_label: "Voir le tableau en détail", button_link: "#CvnTableau", button_arrow: false,
    }],
    ["order", "es-custom-coven-band", { layout: "order", mobile_layout: "stack", heading: "", text: p("Les charms sont tirés au sort au scoop après votre commande,<br>puis assemblés sur votre bracelet."), mobile_text: "", button_label: "Commander mon bracelet", button_link: URL.product, button_arrow: false, price_note: "— €  Tarif à renseigner" }],
    ["faq", "es-custom-coven-band", { layout: "question", mobile_layout: "stack", image_asset: ctx.img("coven-mq-tirage-questions.jpg"), height: 150, heading: "Des questions ?", title_size: 34, text: p("Consultez notre FAQ pour en savoir plus sur le fonctionnement."), button_label: "Voir la FAQ", button_link: URL.faq, button_arrow: false }],
  ],
  "page.coven-coven": [
    ["hero", "es-custom-coven-hero", {
      layout: "left", mobile_layout: "center", height: 1188, mobile_media_top: 35, mobile_height: 632, image_asset: ctx.v("coven-photo-cabinet.jpg", "coven-scene"), mobile_image_asset: ctx.v("coven-photo-cabinet.jpg", "m-coven-scene"), image_alt: "Le cabinet de curiosités du Coven",
      ...(client ? { focus_x: 70, focus_y: 60, shade: 30, brightness: 60, warmth: 35, mobile_focus_x: 30, medallion: true } : { shade: 0 }),
      title: "Entrez dans notre\ncabinet de curiosités.", text_size: 25, mobile_title: "Le Coven", title_size: 74, mobile_title_size: 40, text_x: 45, text_y: 150, text_width: 680,
      text: p("Le Coven des Charmes est un univers inspiré de symboles,<br>de pierres, de curiosités et de rituels. Chaque symbole<br>tiré au scoop correspond à un charm de notre cabinet,<br>que nous assemblons ensuite sur votre bracelet."),
      mobile_text: p("Entrez dans notre<br>cabinet de curiosités."), show_rule: true,
    }],
    ["story", "es-custom-coven-band", {
      layout: "photos", mobile_layout: "stack", image_asset: ctx.img("coven-mq-coven-bougie.jpg"), height: 610,
      heading: "Des charms tirés au sort.\nUn bracelet assemblé avec soin.", title_size: 52, mobile_title_size: 19,
      text: p("Les charms sont tirés au sort au scoop après votre commande,<br>puis assemblés sur votre bracelet. Chaque bracelet est<br>unique selon les symboles tirés et les charms correspondants."),
      mobile_text: p("Le Coven des Charmes crée des bracelets de charms surprise dans un univers inspiré des cabinets de curiosités. Les charms sont tirés au sort au scoop après votre commande, puis assemblés avec soin sur votre bracelet."),
      button_label: "Découvrir le bracelet", button_link: URL.product, button_arrow: false, button_style: "gold",
    }, [
      { type: "photo", settings: { ...(client ? { image_asset: ctx.img("coven-photo-cabinet.jpg"), focus_x: 9, focus_y: 47, zoom: 320 } : { image_asset: ctx.img("coven-mq-coven-photo-1.jpg") }), title: "Détails du cabinet", image_alt: "Poignée d'un tiroir du cabinet", desktop_order: 1 } },
      { type: "photo", settings: { ...(client ? { image_asset: ctx.img("coven-photo-poignet.jpg"), focus_x: 70, focus_y: 55, zoom: 180 } : { image_asset: ctx.img("coven-mq-coven-photo-3.jpg") }), title: "Des charms symboliques", image_alt: "Charms d'un bracelet", desktop_order: 3 } },
      { type: "photo", settings: { ...(client ? { image_asset: ctx.img("coven-photo-tableau.jpg"), focus_x: 50, focus_y: 50, zoom: 200 } : { image_asset: ctx.img("coven-mq-m-coven-photo-3.jpg") }), title: "Des matières et textures", image_alt: "Détail des symboles", desktop_hidden: true, desktop_order: 5 } },
      { type: "photo", settings: { ...(client ? { image_asset: ctx.img("coven-photo-cabinet.jpg"), focus_x: 39, focus_y: 15, zoom: 320 } : { image_asset: ctx.img("coven-mq-coven-photo-2.jpg") }), title: "Des inspirations naturelles", image_alt: "Fioles de pierres du cabinet", desktop_order: 2 } },
      { type: "photo", settings: { ...(client ? { image_asset: ctx.img("coven-photo-bracelet.jpg"), focus_y: 55, zoom: 160 } : { image_asset: ctx.img("coven-mq-coven-photo-4.jpg") }), title: "Des finitions soignées", image_alt: "Maillons d'un bracelet", desktop_order: 4 } },
      { type: "photo", settings: { ...(client ? { image_asset: ctx.img("coven-photo-cabinet.jpg"), focus_x: 12, focus_y: 30, zoom: 260 } : { image_asset: ctx.img("coven-mq-m-coven-photo-6.jpg") }), title: "Un univers authentique", image_alt: "Plume posée sur le cabinet", desktop_hidden: true, desktop_order: 6 } },
    ]],
    ["features", "es-custom-coven-band", { layout: "features", hide_mobile: true, height: 348 }, [
      { type: "feature", settings: { icon: "mysteres-lune", title: "Des symboles\ninspirants.", text: "Un univers poétique\net mystérieux." } },
      { type: "feature", settings: { icon: "cabinet-tiroirs", title: "Un cabinet\nde curiosités.", text: "Des symboles, des pierres\net des objets thématiques." } },
      { type: "feature", settings: { icon: "cristal", title: "Des bracelets\nuniques.", text: "Des charms tirés au sort au scoop\net assemblés avec soin." } },
    ]],
    ["note", "es-custom-coven-band", { layout: "note", hide_desktop: true, mobile_layout: "card", text: p("Curiosité, symboles, nature et magie douce s'entrelacent pour donner vie à des bracelets uniques, issus d'un tirage au sort et assemblés par nos soins."), button_label: "Découvrir le bracelet", button_link: URL.product, button_arrow: true, price_note: "— €  Tarif à renseigner" }],
  ],
  "page.coven-creations": [
    ["hero", "es-custom-coven-hero", {
      layout: "center", mobile_layout: "top", height: 760, extend_height: 1515, mobile_media_top: 35, mobile_height: 282, image_asset: ctx.v("coven-photo-bracelet.jpg", "creations-scene"), mobile_image_asset: ctx.img("coven-mq-m-creations-scene.jpg"), image_alt: "Exemple de bracelet de charms",
      ...(client ? { focus_y: 55, shade: 35 } : { shade: 0 }), title: "Des bracelets nés du tirage des charms.", text_size: 27, mobile_title: "Des exemples\nde bracelets réalisés.", title_size: 66, mobile_title_size: 32, text_y: 116, text_width: 1100,
      text: p("Les charms de votre bracelet seront déterminés<br>par le tirage au scoop réalisé après votre commande."),
      mobile_text: p("Chaque bracelet est assemblé à partir de charms tirés au sort au scoop après votre commande. Voici quelques exemples de créations pour vous plonger dans l'univers du Coven."),
      caption: "Exemple de bracelet\n— les charms dépendent du tirage.",
    }],
    ["gallery", "es-custom-coven-gallery", { layout: "mosaic", mobile_layout: "stack", framed: false, default_caption: "Exemple de bracelet — les charms dépendent du tirage.", note: "Les charms de votre bracelet seront déterminés\nau scoop après votre commande.\nCes photos sont des exemples de réalisations.", button_label: "Découvrir le bracelet", button_link: URL.product, price_note: "— €  Tarif à renseigner", padding_top: 0, padding_bottom: 30 }, [
      ex(ctx.v("coven-photo-bracelet.jpg", "creations-1"), { mobile_image_asset: client ? "" : ctx.img("coven-mq-m-creations-1.jpg") }),
      ex(ctx.v("coven-photo-poignet.jpg", "creations-2"), { mobile_image_asset: client ? "" : ctx.img("coven-mq-m-creations-2.jpg") }),
      ex(ctx.img("coven-mq-creations-3.jpg"), { mobile_image_asset: ctx.img("coven-mq-m-creations-3.jpg") }),
      ex(ctx.img("coven-mq-creations-4.jpg"), { mobile_image_asset: ctx.img("coven-mq-m-creations-4.jpg") }),
      ex(ctx.img("coven-mq-creations-5.jpg"), { mobile_hidden: true }),
      ex(ctx.img("coven-mq-creations-6.jpg"), { mobile_hidden: true }),
    ]],
  ],
  "page.coven-faq": [
    ["hero", "es-custom-coven-hero", {
      layout: "center", mobile_layout: "top", height: 415, mobile_media_top: 35, mobile_height: 305, image_asset: ctx.img("coven-mq-faq-scene.jpg"), mobile_image_asset: ctx.img("coven-mq-m-faq-scene.jpg"), image_alt: "", shade: 0,
      title: "Tout savoir sur les bracelets de charms surprise.", text_size: 23, mobile_title: "Vos questions sur\nles bracelets de charms surprise.", title_size: 50, mobile_title_size: 25, text_y: 146, text_width: 1100, show_rule: true,
      text: p("Retrouvez ici les réponses aux questions les plus fréquentes<br>sur le fonctionnement et la commande."), mobile_text: p("Retrouvez ici les réponses aux questions<br>les plus fréquentes."),
    }],
    ["faq", "es-custom-coven-faq", { more_link: URL.contact, more_image_asset: ctx.img("coven-mq-faq-livres.jpg") }, [
      q("Puis-je choisir les charms ?", "<p>Non, il n'est pas possible de choisir les charms. Les charms sont tirés au sort au scoop après votre commande. Nous assemblons ensuite les charms désignés sur votre bracelet. Les photos montrent des exemples.</p>", "1"),
      q("Comment se déroule le tirage au scoop ?", "<p>Après votre commande, nous tirons au hasard des symboles avec un scoop dans une coupelle. Chaque symbole tiré désigne un charm de notre cabinet ; ces charms sont ensuite assemblés sur votre bracelet.</p>", "1", { mobile_hidden: true }),
      q("Comment fonctionne le tirage au scoop ?", "<p>Après votre commande, nous tirons au hasard des symboles avec un scoop dans une coupelle. Chaque symbole tiré désigne un charm de notre cabinet ; ces charms sont ensuite assemblés sur votre bracelet.</p>", "1", { desktop_hidden: true }),
      q("Qu'est-ce que je reçois ?", "<p>Vous recevez un bracelet assemblé avec les charms désignés par le tirage. Le contenu exact dépend du tirage réalisé après votre commande.</p>", "1", { mobile_hidden: true }),
      q("Que vais-je recevoir ?", "<p>Vous recevez un bracelet assemblé avec les charms désignés par le tirage. Le contenu exact dépend du tirage réalisé après votre commande.</p>", "1", { desktop_hidden: true }),
      q("Les photos des bracelets sont-elles des exemples ?", "<p>Oui. Les photos montrent des exemples de créations : elles ne garantissent pas la présence de ces charms sur votre bracelet.</p>", "1", { mobile_hidden: true }),
      q("Tous les bracelets sont-ils différents ?", "<p>Chaque bracelet dépend des symboles tirés au scoop pour votre commande et des charms correspondants.</p>", "1", { desktop_hidden: true }),
      q("Comment choisir la taille de mon bracelet ?", "", "2", { mobile_hidden: true }),
      q("Quelle est la taille du bracelet ?", "", "2", { desktop_hidden: true }),
      q("De quelles matières sont faits les charms ?", "", "2", { desktop_hidden: true }),
      q("Comment entretenir mon bracelet ?", "", "2", { mobile_hidden: true }),
      q("Quels sont les délais de préparation ?", "", "3", { desktop_hidden: true }),
      q("Quels sont les délais de livraison ?", "", "4", { mobile_hidden: true }),
      q("Livrez-vous à l'international ?", "", "4", { desktop_hidden: true }),
      q("Puis-je retourner mon bracelet ?", "", "4"),
    ]],
  ],
  cart: [
    ["hero", "es-custom-coven-hero", {
      layout: "left", mobile_layout: "over", height: 695, mobile_media_top: 35, extend_height: 1285, mobile_height: 470, image_asset: ctx.v("coven-photo-bracelet.jpg", "panier-scene"), mobile_image_asset: ctx.img("coven-mq-m-panier-scene.jpg"), image_alt: "Exemple de bracelet de charms sur velours",
      ...(client ? { focus_y: 50, shade: 45 } : { shade: 0 }), title: "Votre bracelet\nde charms surprise.", text_size: 27, title_size: 76, mobile_title_size: 26, text_x: 52, text_y: 70, text_width: 900,
      text: p("Un bracelet unique, composé de charms tirés au sort."), mobile_text: p("Un bracelet unique, assemblé rien que pour vous, à partir de charms tirés au sort au scoop."),
    }],
    ["cart", "es-custom-coven-cart", { photo_asset: ctx.v("coven-photo-bracelet.jpg", "panier-ligne"), continue_link: URL.creations, checkout_link: URL.commande, empty_link: URL.product }],
    ["path", "es-custom-coven-steps", { layout: "path", mobile_layout: "path", framed: true, heading: "", mobile_heading: "Votre bracelet, étape par étape", padding_top: 0, padding_bottom: 20 }, [
      step("Commande\ndu bracelet", "Vous passez votre commande.", { icon: "colis", mobile_title: "Commande", mobile_text: "Vous passez commande" }),
      step("Tirage des charms\nau scoop", "Les charms sont tirés au hasard.", { icon: "etoile-8", mobile_title: "Le tirage\nau scoop", mobile_text: " " }),
      step("Assemblage\ndu bracelet", "Votre bracelet est ensuite monté.", { icon: "assemblage", mobile_title: "Assemblage\ndu bracelet", mobile_text: " " }),
    ]],
  ],
  "page.coven-commande": [
    ["hero", "es-custom-coven-hero", {
      layout: "center", mobile_layout: "top", mobile_text_y: 48, height: 445, mobile_media_top: 35, extend_height: 1430, mobile_height: 420, image_asset: ctx.img("coven-mq-commande-scene.jpg"), mobile_image_asset: ctx.img("coven-mq-m-commande-scene.jpg"), image_alt: "", shade: 0,
      title: "Finalisons votre commande.", text_size: 25, mobile_title: "Finalisez votre\ncommande.", title_size: 64, mobile_title_size: 28, text_y: 140, text_width: 1100,
      text: p("Les charms sont tirés au sort au scoop après votre commande,<br>puis assemblés sur votre bracelet."), mobile_text: p("Il ne reste que quelques étapes pour recevoir votre bracelet de charms."),
    }],
    ["checkout", "es-custom-coven-checkout", { photo_asset: ctx.v("coven-photo-bracelet.jpg", "panier-ligne"), cgv_link: `${URL.infos}#cgv`, confirm_link: URL.confirmation }],
  ],
  "page.coven-confirmation": [
    ["hero", "es-custom-coven-hero", {
      layout: "center", mobile_layout: "over", height: 545, mobile_media_top: 35, extend_height: 1420, mobile_height: 520, image_asset: ctx.img("coven-mq-confirmation-scene.jpg"), mobile_image_asset: ctx.img("coven-mq-m-confirmation-scene.jpg"), image_alt: "", shade: 0, icon: "moon_check",
      title: "Votre bracelet sera composé après le tirage.", text_size: 25, mobile_title: "Votre bracelet\nsera composé après\nle tirage.", title_size: 58, mobile_title_size: 28, text_y: 100, text_width: 1200,
      text: p("Les charms sont tirés au sort au scoop,<br>puis assemblés sur votre bracelet."),
    }],
    ["confirm", "es-custom-coven-confirmation", { photo_asset: ctx.v("coven-photo-bracelet.jpg", "panier-ligne"), back_link: URL.home, order_link: URL.compte }, [
      { type: "state", settings: { title: "Commande\nenregistrée", text: "Votre commande\nest enregistrée.", icon: "validation" } },
      { type: "state", settings: { title: "Tirage des charms\nà réaliser", text: "Les charms seront tirés\nau hasard après votre\ncommande.", icon: "scoop" } },
      { type: "state", settings: { title: "Assemblage\ndu bracelet", text: "Votre bracelet\nsera ensuite monté.", icon: "assemblage" } },
      { type: "state", settings: { title: "Expédition", text: "Votre bracelet vous sera\nenvoyé après l'assemblage.", icon: "expedition" } },
    ]],
  ],
  "page.coven-compte": [
    ["hero", "es-custom-coven-hero", {
      layout: "left", mobile_layout: "over", height: 302, mobile_media_top: 35, extend_height: 1395, mobile_height: 480, image_asset: ctx.v("coven-photo-cabinet.jpg", "compte-scene"), mobile_image_asset: ctx.img("coven-mq-m-compte-scene.jpg"), image_alt: "Le cabinet aux tiroirs",
      ...(client ? { focus_x: 40, focus_y: 60, shade: 50, brightness: 60, warmth: 35 } : { shade: 0 }), title: "Votre espace au Coven.", text_size: 25, mobile_title: "Votre espace\nau Coven.", title_size: 66, mobile_title_size: 28, text_x: 54, text_y: 120, text_width: 900,
      text: p("Retrouvez vos commandes et vos informations."), mobile_text: p("Retrouvez vos commandes<br>et vos informations personnelles."),
    }],
    ["account", "es-custom-coven-account", { orders_link: "/account", addresses_link: "/account/addresses", info_link: "/account" }],
  ],
  "page.coven-contact": [
    ["hero", "es-custom-coven-hero", {
      layout: "left", mobile_layout: "top", mobile_text_y: 48, height: 312, mobile_media_top: 35, extend_height: 1395, mobile_height: 520, image_asset: ctx.img("coven-mq-contact-scene.jpg"), mobile_image_asset: ctx.img("coven-mq-m-contact-scene.jpg"), image_alt: "", shade: 0,
      title: "Une question sur votre bracelet ?", text_size: 25, mobile_title: "Une question sur\nvotre bracelet ?", title_size: 64, mobile_title_size: 28, text_x: 70, text_y: 120, text_width: 1000,
      text: p("Nous vous répondons avec attention."),
    }],
    ["contact", "es-custom-coven-contact", { faq_link: URL.faq }],
  ],
  "page.coven-informations": [
    ["hero", "es-custom-coven-hero", {
      layout: "center", mobile_layout: "top", mobile_text_y: 48, height: 295, mobile_media_top: 35, extend_height: 1395, mobile_height: 360, image_asset: ctx.img("coven-mq-informations-scene.jpg"), mobile_image_asset: ctx.img("coven-mq-m-informations-scene.jpg"), image_alt: "", shade: 0,
      title: "Les informations de la boutique.", text_size: 23, mobile_title: "Les informations\nde la boutique.", title_size: 62, mobile_title_size: 28, text_y: 120, text_width: 1100,
      text: p("Tout ce qu'il faut savoir sur Le Coven des Charmes."),
    }],
    ["info", "es-custom-coven-info", {}, [
      { type: "tab", settings: { tab: "Mentions légales", anchor: "mentions", title: "Mentions légales", fields: "Éditeur du site |\nStatut juridique |\nSIRET |\nAdresse |\nHébergeur |",
        aside_title: "À propos du bracelet de charms surprise",
        aside_text: "<p>Vous commandez un bracelet de charms surprise. Après votre commande, les charms sont tirés au sort au scoop, puis assemblés sur le bracelet.</p><p>Les charms sont inspirés de notre univers et désignés au hasard par le tirage au scoop. Vous recevez un bracelet unique dont la composition reste une surprise.</p><p>Chaque bracelet est assemblé avec soin dans notre atelier.</p>",
        aside2_title: "Tarifs, livraison et retours", aside2_text: "À compléter." } },
      { type: "tab", settings: { tab: "CGV", anchor: "cgv", title: "Conditions générales de vente", fields: "Vendeur |\nProduit vendu | Bracelet de charms surprise, charms tirés au sort au scoop après la commande\nPrix |\nCommande |\nPaiement |\nLivraison |\nDroit de rétractation |\nRetours et remboursements |\nGaranties légales |\nRéclamations et médiation |", content: "<p>Structure à compléter et à valider avec les informations du vendeur avant toute mise en vente.</p>" } },
      { type: "tab", settings: { tab: "Confidentialité", anchor: "confidentialite", title: "Politique de confidentialité", fields: "Responsable du traitement |\nDonnées collectées | Coordonnées saisies pour la commande, le compte ou le contact\nFinalités |\nDurée de conservation |\nDestinataires |\nVos droits |\nContact pour exercer vos droits |", content: "<p>Texte à compléter et à valider avec le vendeur.</p>" } },
      { type: "tab", settings: { tab: "Cookies", anchor: "cookies", title: "Cookies", fields: "Cookies essentiels | Fonctionnement du site, panier et préférences\nMesure d'audience | Désactivée tant que vous ne l'acceptez pas\nOutil de mesure utilisé |", content: "<p>Vous pouvez modifier vos choix à tout moment ci-dessous.</p>" } },
      { type: "tab", settings: { tab: "Livraison & retours", anchor: "livraison", title: "Livraison et retours", fields: "Zones de livraison |\nModes et tarifs |\nDélais de préparation |\nDélais de livraison |\nRetours |\nRemboursements |", content: "<p>Informations à renseigner par la boutique.</p>" } },
    ]],
  ],
  "404": [
    ["hero", "es-custom-coven-hero", {
      layout: "band", mobile_layout: "center", height: 420, mobile_height: 460, image_asset: ctx.img("coven-mq-404-scene.jpg"), image_alt: "", shade: 0, show_rule: true,
      title: "Vous vous êtes égaré\ndans le Coven.", text_size: 22, title_size: 54, mobile_title_size: 30, text_y: 114, text_width: 900,
      text: p("Cette page n'existe pas, mais la magie continue."), button_label: "Retour à l'accueil", button_link: URL.home,
    }],
  ],
  page: [],
  };
};
