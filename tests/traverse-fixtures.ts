/**
 * Démonstration TRAVERSE refaite d'après le dossier approuvé par Thomas le 23 octobre
 * (docs/design/traverse-reference-20261023, consigne CONSIGNE_VALIDEE.md) : boutique spécialisée pour un seul sac de
 * voyage, grandes photos de paysages, titres condensés, boutons orange, pied vert sapin.
 *
 * Même chaîne que NOCTIL, HEUREN et ALCÔVE : un projet client (marque, produit, médias avec rôles) composé par le VRAI
 * moteur dans son thème du catalogue (composeShop), puis rédigé section par section, dans le même ordre.
 *
 * Un seul sac partout : les neuf photos séparées du dossier (copiées dans public/theme-assets/traverse/), avec
 * produit-reference comme référence. Les anciennes photos et l'ancien logo du kit #152 ne sont plus utilisés.
 *
 * Rien n'est inventé : 129 € est un prix de démonstration ; dimensions, capacité, matières, compatibilité cabine,
 * ordinateur, imperméabilité, résistance, garantie, livraison et retours ne sont jamais affirmés (« Informations à
 * compléter »). Aucun avis, aucune note, aucune personne, aucune marque externe. Les gabarits légaux restent à compléter.
 */
import { buildKitProject, p, TODO, type Brand, type Kit, type Media } from "./noctil-traverse-fixtures";
import { sectionSchema, withDefaults, type SectionInstance } from "../src/lib/theme/spec";

export const TRAVERSE_PROVENANCE = "Dossier TRAVERSE approuvé par Thomas le 23 octobre 2026 (PR #167, commit 3acabd53) — photos reconstruites fournies, sans personne, aucun paiement";
export const TRAVERSE_HANDLE = "sac-de-voyage-traverse";

/** Ordre d'import = rôles du thème (le dernier importé d'un rôle prend le premier emplacement). Textes alternatifs descriptifs. */
export const TRAVERSE_MEDIA: Media[] = [
  { file: "detail-poignee.webp", role: "detail", alt: "Gros plan de la poignée du sac TRAVERSE et des deux curseurs noirs de la fermeture." },
  { file: "detail-boucle.webp", role: "detail", alt: "Gros plan d'une boucle latérale noire et de sa sangle sur le tissu vert olive." },
  { file: "detail-poche.webp", role: "detail", alt: "Gros plan de la poche frontale zippée et de l'étiquette TRAVERSE sur le tissu vert olive." },
  { file: "train.webp", role: "scene", alt: "Sac TRAVERSE posé sur un siège de train bleu, un lac et des montagnes derrière la fenêtre." },
  { file: "lac.webp", role: "scene", alt: "Sac TRAVERSE posé sur un ponton en bois mouillé, au bord d'un lac de montagne dans la brume." },
  { file: "montagne.webp", role: "scene", alt: "Sac TRAVERSE posé sur un rocher face aux montagnes et à un lac, au coucher du soleil." },
  { file: "paysage.webp", role: "banner", alt: "Lac de montagne entouré de forêts de sapins, un train longe la rive." },
  { file: "hero-gare.webp", role: "lifestyle", alt: "Sac TRAVERSE posé sur un banc de quai de gare, face à un lac et aux montagnes au lever du soleil." },
  { file: "produit-reference.webp", role: "packshot", alt: "Sac à dos TRAVERSE vert olive de trois quarts : poche frontale zippée, étiquette TRAVERSE, boucles latérales noires et bretelles noires." },
];

const BRAND: Brand = {
  name: "TRAVERSE", product: "Sac de voyage", category: "Sac de voyage",
  summary: "Sac à dos de voyage vert olive : poche frontale zippée, boucles latérales noires, poignée sur le dessus, bretelles noires et étiquette TRAVERSE.",
  facts: [["Couleur", "vert olive, fermetures, boucles et bretelles noires"], ["Détails visibles", "poche frontale zippée, boucles latérales, poignée"]],
  tagline: "Fermez l'ordi. Ouvrez le week-end.", story: "TRAVERSE propose un sac pour celles et ceux qui choisissent le dehors le temps d'un week-end.", positioning: "Un sac de voyage pour les escapades du week-end : l'essentiel, rien de superflu.",
  // Vert sapin du pied de page, gris très clair des fonds produit, orange des boutons, blanc, encre.
  palette: { primary: "#0F2E1D", secondary: "#F4F3EF", accent: "#F2591A", light: "#FFFFFF", dark: "#0F2E1D" },
};

export async function traverseProject(userId: string) {
  return buildKitProject(userId, { id: "traverse", media: TRAVERSE_MEDIA, handle: TRAVERSE_HANDLE, brand: BRAND, themeName: "Traverse", provenance: TRAVERSE_PROVENANCE, storeKind: "specialty", sector: "maison" }, curateTraverse);
}

/** Réponse honnête : l'information n'est pas encore donnée par la marque (mention exigée par le dossier). */
const A_COMPLETER = (what: string) => `Informations à compléter : ${what}.`;
const ARTICLE = "/pages/deux-jours-un-autre-decor";

/** FAQ de l'accueil et de la fiche : questions neutres, réponses « à compléter » (le dossier interdit cabine, résistance…). */
export const TRAVERSE_HOME_FAQ: [string, string][] = [
  ["Quelles sont les dimensions du sac ?", A_COMPLETER("les dimensions du sac ne sont pas encore renseignées dans cette démonstration")],
  ["Quelle est sa capacité ?", A_COMPLETER("la capacité du sac n'est pas encore renseignée")],
  ["Comment l'entretenir ?", A_COMPLETER("les conseils d'entretien dépendent des matières, pas encore renseignées")],
  ["Puis-je le retourner ?", "Les conditions de retour sont à compléter. Elles seront réunies sur la page Livraison et retours."],
];
export const TRAVERSE_PRODUCT_FAQ: [string, string][] = [
  ["Pour quels voyages le sac est-il pensé ?", "Pour les escapades du week-end, en train ou ailleurs. Dimensions et formats acceptés par les transporteurs : informations à compléter."],
  ["Quelle est la capacité du sac ?", A_COMPLETER("la capacité du sac n'est pas encore renseignée")],
  ["Peut-on l'utiliser au quotidien ?", "Rien ne l'empêche : poche frontale zippée, poignée et bretelles sont visibles sur les photos. Usages et limites : informations à compléter."],
  ["Comment entretenir le sac ?", A_COMPLETER("les conseils d'entretien dépendent des matières, pas encore renseignées")],
];

function curateTraverse(k: Kit) {
  const { spec, img, section, overlay, productHref } = k;
  const faq = (heading: string, items: [string, string][], style: string, layout: string, extra: Record<string, unknown> = {}) =>
    section("faq", { heading, text: "", style, layout, structured_data: false, open_first: false, ...extra }, items.map(([question, answer]) => ({ type: "question", settings: { question, answer: p(answer) } })));
  k.demoMeta();
  spec.store.seo = { title: "TRAVERSE | Fermez l'ordi. Ouvrez le week-end.", description: "Un sac de voyage pour les escapades du week-end : poche frontale, boucles latérales, poignée. Boutique de démonstration, prix de démonstration." };
  const main = k.product({
    title: "Sac de voyage",
    description_html: p("Un sac de voyage pensé pour les escapades : tout ce qu'il vous faut, rien de superflu. Poche frontale zippée, boucles latérales, poignée sur le dessus et bretelles noires, sur un tissu vert olive.") + p(A_COMPLETER("dimensions, capacité, matières et entretien")),
    images: ["produit-reference.webp", "detail-poche.webp", "detail-poignee.webp", "detail-boucle.webp", "lac.webp"],
    tags: ["sac de voyage", "week-end", "vert olive"],
    seo: { title: "Sac de voyage TRAVERSE : prêt pour vendredi", description: "Le sac de vos prochains départs : poche frontale zippée, boucles latérales, poignée. Prix de démonstration, boutique de démonstration." },
  });
  // 129 € : prix de démonstration (dossier) ; un seul modèle, sans option.
  main.price = 12900;
  main.variants = [{ title: "Default Title", options: [], price: 12900, available: true }];
  spec.store.collections = [{ handle: "all", title: "Boutique", description: "Un sac, vos prochains départs.", products: [main.handle] }];

  // ─── Accueil (planche 01) ────────────────────────────────────────────────────────────────────────────────────────
  overlay("index", [
    section("cv-banner", { ...img("hero-gare.webp"), layout: "background", band_height: "hero", veil: "left", mobile_valign: "top", image_loading: "eager", focus_x: 62, focus_y: 100, mobile_focus_x: 76, mobile_focus_y: 50, eyebrow: "", heading: "FERMEZ L'ORDI.\nOUVREZ LE WEEK-END.", heading_tag: "h1", heading_accent: "", text: p("Moins d'écrans. Plus d'horizons.<br>Le sac qui vous emmène ailleurs."), price_text: "", price_note: "", button_label: "Découvrir le sac", button_link: productHref, button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0 }),
    section("cv-cards", { layout: "overlay", heading: "", heading_accent: "", text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 12, padding_bottom: 12 }, [
      { type: "card", settings: { ...img("montagne.webp"), image_zoom: 190, focus_x: 0, focus_y: 50, title: "On ferme.", text: p("Les mails peuvent attendre."), link: "", link_label: "" } },
      { type: "card", settings: { ...img("train.webp"), image_zoom: 200, focus_x: 0, focus_y: 30, title: "On file.", text: p("Un billet, un sac, l'essentiel."), link: "", link_label: "" } },
      { type: "card", settings: { ...img("lac.webp"), image_zoom: 210, focus_x: 0, focus_y: 35, title: "On respire.", text: p("Le week-end commence ici."), link: "", link_label: "" } },
    ]),
    section("cv-feature", { ...img("produit-reference.webp"), layout: "essentials", focus_x: 50, focus_y: 50, heading: "Vos essentiels.\nÀ portée de départ.", heading_accent: "", text: p("Un sac de voyage pensé pour les escapades : <br>tout ce qu'il vous faut, rien de superflu."), button_label: "Découvrir le sac", button_link: productHref, button_arrow: true, guarantee_text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 40 }, [
      { type: "point", settings: { icon: "zip", title: "Poche frontale", text: "" } },
      { type: "point", settings: { icon: "buckle", title: "Boucles latérales", text: "" } },
      { type: "point", settings: { icon: "handle", title: "Poignée", text: "" } },
      { type: "point", settings: { icon: "backpack", title: "Le sac TRAVERSE", text: "" } },
      { type: "point", settings: { icon: "parcel", title: "Livraison et retours", text: "" } },
      { type: "detail", settings: { ...img("detail-poche.webp"), caption: "Poche frontale" } },
      { type: "detail", settings: { ...img("detail-poignee.webp"), caption: "Poignée" } },
      { type: "detail", settings: { ...img("detail-boucle.webp"), caption: "Boucles latérales" } },
    ]),
    section("cv-banner", { ...img("paysage.webp"), layout: "background", band_height: "medium", veil: "left", mobile_valign: "center", focus_x: 50, focus_y: 40, mobile_focus_x: 60, mobile_focus_y: 40, eyebrow: "", heading: "CHANGEZ DE DÉCOR.", heading_accent: "", text: p("Lacs, forêts, montagnes.<br>Le même sac, d'autres horizons."), price_text: "", price_note: "", button_label: "Notre approche", button_link: "/pages/notre-approche", button_style: "outline", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0 }),
    section("cv-hero", { ...img("produit-reference.webp"), layout: "card", image_ratio: "square", focus_x: 50, focus_y: 50, rating_text: "", heading: "Le sac TRAVERSE", heading_accent: "", heading_tag: "h2", text: p("Conçu pour vos week-ends et plus encore."), price_text: "129 €", price_note: "Prix de démonstration.", button_label: "Découvrir le sac", button_link: productHref, button_arrow: true, guarantee_text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 32 }, [
      { type: "check", settings: { text: "Poche frontale" } },
      { type: "check", settings: { text: "Boucles latérales" } },
      { type: "check", settings: { text: "Poignée" } },
      { type: "check", settings: { text: "Le sac TRAVERSE" } },
      { type: "check", settings: { text: "Livraison et retours" } },
    ]),
    faq("Vos questions, nos réponses.", TRAVERSE_HOME_FAQ, "cards", "stacked", { button_label: "Voir toutes les FAQ", button_link: "/pages/faq", contact_text: "", color_scheme: "scheme-1", padding_top: 40, padding_bottom: 48 }),
    section("cv-banner", { ...img("paysage.webp"), layout: "background", band_height: "short", image_zoom: 160, veil: "left", mobile_valign: "center", focus_x: 0, focus_y: 30, mobile_focus_x: 0, mobile_focus_y: 30, eyebrow: "", heading: "LA SUITE EST DEHORS.", heading_accent: "", text: p("Des week-ends qui changent tout."), price_text: "", price_note: "", button_label: "Découvrir le sac", button_link: productHref, button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0 }),
  ]);

  // ─── Fiche produit (planche 02) ──────────────────────────────────────────────────────────────────────────────────
  {
    const key = k.productKey();
    const t = spec.templates[key];
    const mp = t.sections[t.order.find((x) => t.sections[x].type === "main-product")!];
    const schema = sectionSchema(spec, "main-product")!;
    const block = (type: string, settings: Record<string, unknown>) => ({ type, settings: withDefaults(schema.blocks.find((b) => b.type === type)?.settings, settings) });
    mp.settings = { ...mp.settings, product_target: "product:main", purchase_enabled: false, gallery_layout: "carousel", gallery_ratio: "square", enable_zoom: true, sticky_bar: false, color_scheme: "scheme-1", display_heading: "PRÊT POUR VENDREDI.", display_intro: "", padding_top: 24, padding_bottom: 32 };
    // Titre éditorial (H1), prix et mention de démonstration, quantité et ajout, phrase, trois gros plans légendés ;
    // les informations inconnues restent dans l'éditeur, masquées.
    mp.blocks = {
      title: block("title", {}),
      price: block("price", { show_taxes: false }),
      demo: block("text", { text: p("Prix de démonstration") }),
      buy: block("buy_buttons", { picker: "buttons", show_quantity: true, show_dynamic_checkout: false, price_in_button: false }),
      text: block("text", { text: p("Le sac de vos prochains départs.") }),
      tiles: block("tiles", { ...{ image_1: img("detail-poche.webp").image_asset, caption_1: "Poche frontale", image_2: img("detail-boucle.webp").image_asset, caption_2: "Boucles latérales", image_3: img("detail-poignee.webp").image_asset, caption_3: "Poignée" } }),
      specs: { ...block("collapsible", { heading: "Caractéristiques", content: p(TODO("dimensions, capacité, poids, matières")), open: false }), disabled: true },
      shipping: { ...block("collapsible", { heading: "Livraison et retours", content: p(TODO("zones, délais et frais de livraison ; délai et conditions de retour")), open: false }), disabled: true },
    };
    mp.block_order = ["title", "price", "demo", "buy", "text", "tiles", "specs", "shipping"];
  }
  overlay(k.productKey(), [
    section("cv-banner", { ...img("hero-gare.webp"), layout: "background", band_height: "tall", veil: "left", mobile_valign: "center", title_rule: true, focus_x: 70, focus_y: 50, mobile_focus_x: 74, mobile_focus_y: 50, eyebrow: "", heading: "LES PROCHAINS\nDÉPARTS\nCOMMENCENT ICI.", heading_accent: "", text: "", price_text: "", price_note: "", button_label: "", button_link: "", note: "", animation: "fade", color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0 }),
    section("cv-gallery", { layout: "grid", columns: 3, ratio: "square", eyebrow: "", heading: "", heading_accent: "", text: "", ai_label: "", animation: "fade", color_scheme: "scheme-1", padding_top: 8, padding_bottom: 8 }, [
      { type: "image", settings: { ...img("detail-poche.webp"), caption: "" } },
      { type: "image", settings: { ...img("detail-boucle.webp"), caption: "" } },
      { type: "image", settings: { ...img("detail-poignee.webp"), caption: "" } },
      { type: "image", settings: { ...img("lac.webp"), caption: "" } },
      { type: "image", settings: { ...img("montagne.webp"), caption: "" } },
      { type: "image", settings: { ...img("train.webp"), caption: "" } },
    ]),
    faq("QUESTIONS FRÉQUENTES", TRAVERSE_PRODUCT_FAQ, "lines", "stacked", { button_label: "", button_link: "", color_scheme: "scheme-1", padding_top: 48, padding_bottom: 72 }),
  ]);

  // ─── Boutique : bandeau puis la grille (un seul sac, pas de fausse collection) ────────────────────────────────────
  spec.templates.collection = { order: ["hero", "main"], sections: {
    hero: section("cv-banner", { ...img("paysage.webp"), layout: "background", band_height: "tall", veil: "left", mobile_valign: "center", title_rule: true, focus_x: 50, focus_y: 50, mobile_focus_x: 45, mobile_focus_y: 50, eyebrow: "", heading: "UN SAC.\nVOS PROCHAINS\nDÉPARTS.", heading_tag: "h1", heading_accent: "", text: "", price_text: "", price_note: "", button_label: "", button_link: "", note: "", animation: "fade", color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0 }),
    main: section("main-collection", { per_page: 12, columns: 2, enable_filters: false, enable_sorting: true, show_header: false, show_count: true, card_vendor: true, card_button_label: "VOIR LE PRODUIT", card_ratio: "square", color_scheme: "scheme-1" }),
  } };

  // ─── Panier : bandeau photo (rempli et vide), tableau, bandeau final ; mention de démonstration sous le total ──────
  for (const sec of Object.values(spec.templates.cart?.sections ?? {})) if (sec.type === "main-cart") sec.settings = { ...sec.settings, intro: "", hero_image_asset: img("train.webp").image_asset, hero_zoom: 200, hero_focus_x: 0, hero_focus_y: 40, hero_heading: "VOTRE PANIER.", hero_empty_image_asset: img("paysage.webp").image_asset, hero_empty_heading: "VOTRE PANIER\nEST VIDE.", table_head: true, show_update: false, show_taxes_note: false, summary_note: "Prix de démonstration", empty_icon: "backpack", empty_image_asset: "", empty_heading: "Il est temps de planifier vos prochains départs.", empty_text: "", empty_button_label: "DÉCOUVRIR LA BOUTIQUE", empty_button_link: "/collections/all", qty_buttons: true, remove_label: "Supprimer", continue_label: "Continuer vos achats" };
  spec.templates.cart.sections.horizons = section("cv-banner", { ...img("paysage.webp"), layout: "background", band_height: "tall", veil: "left", mobile_valign: "center", hide_when_cart_empty: true, focus_x: 50, focus_y: 50, mobile_focus_x: 70, mobile_focus_y: 50, eyebrow: "", heading: "MÊMES HORIZONS.\nAUTREMENT.", heading_accent: "", text: "", price_text: "", price_note: "", button_label: "", button_link: "", note: "", animation: "fade", color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0 });
  spec.templates.cart.order.push("horizons");
  spec.settings = { ...spec.settings, price_trim_zeros: true, cart_heading: "VOTRE PANIER.", cart_reassurance: "", cart_checkout_label: "PROCÉDER AU PAIEMENT" };

  // ─── Pages (planches 03 et 04) : bandeau photo (H1), puis contenu ─────────────────────────────────────────────────
  const hero = (heading: string, text: string, extra: Record<string, unknown> = {}) => section("cv-banner", { ...img("paysage.webp"), layout: "background", band_height: "tall", veil: "left", mobile_valign: "center", focus_x: 50, focus_y: 50, mobile_focus_x: 50, mobile_focus_y: 50, eyebrow: "", heading, heading_tag: "h1", heading_accent: "", text, price_text: "", price_note: "", button_label: "", button_link: "", note: "", animation: "fade", color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0, ...extra });
  const page = (handle: string, title: string, seo: { title: string; description: string }, rows: [string, SectionInstance][]) => {
    k.page(handle, title, seo, rows);
    // Le titre de page est porté par le bandeau (H1) : la section de page garde le fil d'Ariane.
    spec.templates[`page.${handle}`].sections.title.settings = { ...spec.templates[`page.${handle}`].sections.title.settings, show_title: false, padding_top: 0, padding_bottom: 0 };
  };
  const notes = (items: { title: string; icon?: string; text?: string; box: string }[], columns: 1 | 2) => section("fs-commitments", { layout: "notes", columns, align: "left", eyebrow: "", heading: "", heading_accent: "", text: "", button_label: "", button_link: "", note: "", color_scheme: "scheme-1", padding_top: 40, padding_bottom: 72 },
    items.map((it) => ({ type: "item", settings: { icon: it.icon ?? "info", title: it.title, text: it.text ? p(it.text) : "", proof_label: "", proof_link: "", box_title: "À compléter", box_text: it.box } })));
  const legal = (titles: string[]) => notes(titles.map((title) => ({ title, icon: "none", box: "Informations à ajouter ici." })), 1);

  page("en-route", "En route", { title: "En route | Le carnet de TRAVERSE", description: "Récits, idées et paysages pour voyager autrement, le temps d'un week-end ou plus loin." }, [
    ["hero", hero("EN ROUTE.", p("Deux jours. Un autre décor.") + p("Récits, idées et paysages pour voyager autrement, le temps d'un week-end ou plus loin."), { focus_x: 70 })],
    ["articles", section("cv-cards", { layout: "columns", heading: "", heading_accent: "", text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 40, padding_bottom: 72 }, [
      { type: "card", settings: { ...img("lac.webp"), title: "Choisir son départ : lacs, forêts, montagnes", text: p("Une destination accessible en train, adaptée à vos envies et au temps dont vous disposez."), link: `${ARTICLE}#choisir`, link_label: "Lire l'article" } },
      { type: "card", settings: { ...img("train.webp"), title: "Voyager en train : le temps retrouvé", text: p("Observer, se détendre, s'inspirer : le trajet fait partie du voyage."), link: `${ARTICLE}#trajet`, link_label: "Lire l'article" } },
      { type: "card", settings: { ...img("montagne.webp"), title: "Checklist week-end : l'essentiel, rien de plus", text: p("Billets, hébergement, itinéraire : les éléments clés pour partir léger."), link: `${ARTICLE}#preparer`, link_label: "Lire l'article" } },
    ])],
  ]);
  page("deux-jours-un-autre-decor", "Deux jours. Un autre décor.", { title: "Deux jours. Un autre décor. | En route avec TRAVERSE", description: "Trois étapes pour organiser votre prochaine escapade : choisir son départ, préparer l'essentiel, profiter du trajet." }, [
    ["hero", hero("Deux jours.\nUn autre décor.", p("Récits, idées et paysages pour voyager autrement, le temps d'un week-end ou plus loin."), { eyebrow: "JOURNAL", focus_x: 70 })],
    ["intro", section("rich-text", { align: "left", style: "plain", color_scheme: "scheme-1", padding_top: 40, padding_bottom: 8 }, [{ type: "text", settings: { text: p("Même le temps d'un week-end, un simple trajet en train peut ouvrir la porte à des paysages inattendus. Voici trois étapes pour organiser votre prochaine escapade.") } }])],
    ["etapes", section("cv-alternating", { layout: "image-right", ratio: "landscape", eyebrow: "", heading: "", heading_accent: "", text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 48 }, [
      { type: "row", settings: { ...img("lac.webp"), anchor: "choisir", eyebrow: "01", heading: "Choisir son départ.", heading_accent: "", text: p("Identifier une destination accessible en train, adaptée à vos envies et au temps dont vous disposez."), button_label: "", button_link: "" } },
      { type: "row", settings: { ...img("montagne.webp"), anchor: "preparer", eyebrow: "02", heading: "Préparer l'essentiel.", heading_accent: "", text: p("Billets, hébergement, itinéraire : les éléments clés pour un voyage serein et sans stress."), button_label: "", button_link: "" } },
      { type: "row", settings: { ...img("train.webp"), anchor: "trajet", eyebrow: "03", heading: "Profiter du trajet.", heading_accent: "", text: p("Observer, se détendre, s'inspirer : le trajet fait partie du voyage."), button_label: "", button_link: "" } },
    ])],
    ["suite", section("cv-banner", { ...img("lac.webp"), layout: "background", band_height: "short", image_zoom: 200, veil: "left", mobile_valign: "center", focus_x: 0, focus_y: 30, mobile_focus_x: 0, mobile_focus_y: 30, eyebrow: "", heading: "Envie de plus d'inspirations ?", heading_accent: "", text: p("Explorez tous nos articles et idées de voyages."), price_text: "", price_note: "", button_label: "Voir le journal", button_link: "/pages/en-route", button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0 })],
  ]);
  page("notre-approche", "Notre approche", { title: "Notre approche | TRAVERSE", description: "Moins attendre. Plus partir. Une vision simple du voyage, le temps d'un week-end." }, [
    ["hero", hero("NOTRE APPROCHE.", p("Moins attendre. Plus partir."), { focus_x: 40 })],
    ["vision", section("cv-alternating", { layout: "image-right", ratio: "landscape", eyebrow: "", heading: "", heading_accent: "", text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 56, padding_bottom: 72 }, [
      { type: "row", settings: { ...img("lac.webp"), anchor: "", eyebrow: "", heading: "Voyager autrement,\ntout simplement.", heading_accent: "", text: p("Nous croyons à un voyage plus libre et plus proche de l'essentiel : des objets simples, pensés pour vous accompagner dans vos échappées, près ou loin."), button_label: "Lire le carnet", button_link: "/pages/en-route", button_arrow: true } },
    ])],
  ]);
  page("faq", "FAQ", { title: "Questions fréquentes | TRAVERSE", description: "Commandes, livraison, retours, produit, entretien : les réponses, et ce qui reste à compléter dans cette démonstration." }, [
    ["hero", hero("Avant de partir.", p("Vos questions. Nos réponses."), { focus_x: 35 })],
    ["questions", faq("", [
      ["Commandes et paiement", "Dans cette démonstration, aucune commande n'est enregistrée et aucun paiement n'est demandé. " + A_COMPLETER("moyens de paiement et étapes de commande de la boutique réelle")],
      ["Livraison", A_COMPLETER("zones, délais et frais de livraison")],
      ["Retours et échanges", A_COMPLETER("délai et conditions de retour et d'échange")],
      ["Produits", "Le sac TRAVERSE est présenté avec sa poche frontale zippée, ses boucles latérales et sa poignée. " + A_COMPLETER("dimensions, capacité et matières")],
      ["Entretien", A_COMPLETER("conseils d'entretien selon les matières")],
      ["Autres questions", 'Écrivez-nous depuis la <a href="/pages/contact">page Contact</a>.'],
    ], "cards", "stacked", { color_scheme: "scheme-1", padding_top: 40, padding_bottom: 72 })],
  ]);
  page("contact", "Contact", { title: "Contact | TRAVERSE", description: "Une question, une suggestion ou simplement envie d'échanger ? Écrivez-nous. Dans cette démonstration, aucun message n'est envoyé." }, [
    ["hero", hero("On prépare le départ\nensemble.", p("Une question, une suggestion ou simplement envie d'échanger ? Écrivez-nous, nous vous répondrons dès que possible."), { focus_x: 60 })],
    ["form", section("contact-form", { ...img("train.webp"), eyebrow: "", heading: "", text: "", email: "", hours: "", response: "", show_phone: false, require_name: true, submit_label: "Envoyer le message", inline_states: true, preview_note: false, color_scheme: "scheme-1", padding_top: 48, padding_bottom: 72 })],
  ]);
  page("livraison-retours", "Livraison et retours", { title: "Livraison et retours | TRAVERSE", description: "Toutes les informations pratiques au même endroit : livraison, retours et échanges (modèle à compléter)." }, [
    ["hero", hero("Livraison et retours.", p("Toutes les informations pratiques<br>au même endroit."), { focus_x: 45 })],
    ["infos", notes([
      { title: "Livraison", icon: "truck", text: "Les informations sur les délais, les zones de livraison et les frais de livraison seront bientôt disponibles.", box: "Détails de livraison à ajouter ici." },
      { title: "Retours et échanges", icon: "box", text: "Les conditions de retour et d'échange seront bientôt disponibles.", box: "Détails de retour à ajouter ici." },
    ], 2)],
  ]);
  page("mentions-legales", "Mentions légales", { title: "Mentions légales | TRAVERSE", description: "Informations légales relatives à TRAVERSE (modèle à compléter)." }, [
    ["hero", hero("Mentions légales.", p("Informations légales relatives à TRAVERSE."), { focus_x: 50 })],
    ["infos", legal(["Éditeur du site", "Hébergement", "Propriété intellectuelle", "Responsabilité", "Liens externes", "Données personnelles", "Loi applicable", "Contact"])],
  ]);
  page("confidentialite", "Confidentialité", { title: "Confidentialité | TRAVERSE", description: "Vos données, votre confiance : politique de confidentialité de TRAVERSE (modèle à compléter)." }, [
    ["hero", hero("Confidentialité.", p("Vos données, votre confiance."), { focus_x: 55 })],
    ["infos", legal(["Collecte des données", "Utilisation des données", "Cookies", "Vos droits", "Sécurité des données", "Partage des données", "Durée de conservation", "Contact"])],
  ]);
  page("cgv", "Conditions générales de vente", { title: "Conditions générales de vente | TRAVERSE", description: "Informations relatives à vos achats sur TRAVERSE (modèle à compléter)." }, [
    ["hero", hero("Conditions générales\nde vente.", p("Informations relatives à vos achats sur TRAVERSE."), { focus_x: 60 })],
    ["infos", legal(["Objet", "Produits", "Commandes", "Prix et paiement", "Livraison", "Rétractation", "Garanties", "Responsabilité", "Données personnelles", "Loi applicable et litiges", "Contact"])],
  ]);

  // ─── Menus, en-tête (nom condensé, menu au centre, panier), pied vert sapin ───────────────────────────────────────
  spec.store.menus["main-menu"] = { title: "Navigation", links: [
    { title: "Le sac", url: productHref },
    { title: "En route", url: "/pages/en-route" },
    { title: "Notre approche", url: "/pages/notre-approche" },
    { title: "Aide", url: "/pages/faq" },
  ] };
  spec.store.menus.footer = { title: "TRAVERSE", links: [
    { title: "Le sac", url: productHref },
    { title: "En route", url: "/pages/en-route" },
    { title: "Notre approche", url: "/pages/notre-approche" },
    { title: "Aide", url: "/pages/faq" },
    { title: "Contact", url: "/pages/contact" },
  ] };
  spec.store.menus["footer-aide"] = { title: "Aide", links: [{ title: "Livraison et retours", url: "/pages/livraison-retours" }] };
  spec.store.menus.legal = { title: "Informations légales", links: [
    { title: "Mentions légales", url: "/pages/mentions-legales" },
    { title: "CGV", url: "/pages/cgv" },
    { title: "Confidentialité", url: "/pages/confidentialite" },
  ] };
  const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
  header.settings = { ...header.settings, menu: "main-menu", layout: "logo-left", shape: "bar", icons: "plain", mega_menu: "none", mobile_menu: "drawer-right", mobile_submenu: "accordion", sticky: true, transparent_on_home: false, show_search: false, show_cart: true, cta_label: "", phone: "", color_scheme: "scheme-1", mobile_menu_scheme: "scheme-2" };
  header.blocks = {}; header.block_order = [];
  spec.groups.header.sections = { header };
  spec.groups.header.order = ["header"];
  const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
  footer.settings = { ...footer.settings, style: "brand-left", tagline: "Des sacs pour celles et ceux qui choisissent le dehors.", show_wordmark: false, show_policies: false, show_payment: false, bottom_text: "Tous droits réservés.", bottom_menu: "legal", color_scheme: "scheme-2", logo_asset: "" };
  footer.blocks = {
    links: { type: "links", settings: { heading: "Navigation", menu: "footer", hide_heading: true, icon: "none" } },
    aide: { type: "links", settings: { heading: "Aide", menu: "footer-aide", hide_heading: true, icon: "parcel" } },
    news: { type: "newsletter", settings: { heading: "Restez en route.", text: "" } },
  };
  footer.block_order = ["links", "aide", "news"];
  for (const s of Object.values(spec.groups.footer.sections)) if (s.type !== "footer") s.disabled = true;
  k.finish();
  // Nom condensé « TRAVERSE » en texte (maquette) : l'ancien logo montagne n'est plus utilisé ; pas de bouton flottant.
  spec.settings = { ...spec.settings, logo_asset: "", favicon_asset: "", fab_contact_link: "", fab_back_to_top: false };
}
