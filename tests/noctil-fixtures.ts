/**
 * NOCTIL refait d'après le dossier du 23 octobre (PR #167, docs/design/noctil-reference-20261023) : boutique spécialisée
 * d'un seul produit, le projecteur de galaxies NOCTIL, pour la chambre d'un enfant (l'acheteur est le parent).
 *
 * Même chaîne que les autres démonstrations : un projet client (marque, produit, médias avec rôles) composé par le VRAI
 * moteur dans son thème du catalogue (composeShop), puis rédigé section par section.
 *
 * Médias (MEDIAS.md du dossier) : 6 originaux du kit (logo, cinq vues produit) et 10 créations complémentaires (produit
 * détouré au vrai fond transparent, chambres d'enfant, bibliothèque, livres, planète) faites d'après les planches — ce ne
 * sont pas des extractions des planches. Les dix ambiances historiques (pièces d'adultes) ne servent pas. Aucune personne.
 *
 * Textes : accroches et hiérarchie des planches ; ce qui n'est pas connu (âge conseillé, alimentation, dimensions,
 * fonctionnement détaillé, bruit, garantie, délais, frais) reste « À confirmer » ; aucun bienfait sur le sommeil, aucun
 * avis, aucune certification. Prix de démonstration : 69 €, annoncé comme tel ; la livraison est calculée à l'étape
 * suivante (le panier montre un sous-total, jamais un total garanti). Commande, compte et facture : exemples étiquetés.
 */
import { buildKitProject, NOCTIL_MEDIA, KIT_HANDLE, p, type Brand, type Kit } from "./noctil-traverse-fixtures";
import { sectionSchema, withDefaults, type SectionInstance } from "../src/lib/theme/spec";

export { NOCTIL_MEDIA };
export const NOCTIL_PROVENANCE = "PR #167 (23 octobre 2026) — dossier NOCTIL de Thomas (commit 39508f4d) : 6 originaux du kit et 10 créations complémentaires, sans personne, aucun paiement";
export const NOCTIL_HANDLE = KIT_HANDLE.noctil;
/** Prix de démonstration (dossier du 23 octobre), en centimes. */
export const NOCTIL_PRICE = 6900;

/** Mention des informations que la marque n'a pas encore données (formulation du dossier). */
const A_CONFIRMER = (what: string) => `À confirmer : ${what} ${what.endsWith("s") ? "seront précisés" : "sera précisé"} par la marque avant la mise en vente.`;

const BRAND: Brand = {
  name: "NOCTIL", product: "Projecteur galaxie NOCTIL", category: "Projecteur de galaxies pour chambre d'enfant",
  summary: "Projecteur de galaxies : sphère bleu nuit mate tenue par un arceau, objectif rond où tourbillonne une galaxie violette, socle rond avec un bouton éclairé de violet ; la galaxie s'affiche au plafond ou sur un mur de la chambre.",
  facts: [["Silhouette", "sphère bleu nuit mate sur un arceau, socle rond"], ["Commande visible", "un bouton éclairé de violet sur le socle"]],
  tagline: "Un petit monde. Un ciel immense.", story: "NOCTIL est né d'une idée simple : offrir aux enfants un espace où leur imagination peut s'envoler, depuis leur chambre.", positioning: "Un projecteur de galaxies à offrir, pour transformer la chambre d'un enfant en ciel étoilé.",
  // Lavande des boutons, lavande pâle des panneaux, violet des liens, crème des fonds, bleu nuit des bandeaux et des
  // titres (mesurés sur les planches 01 et 02).
  palette: { primary: "#B9A6F9", secondary: "#F1ECFB", accent: "#7C5CE0", light: "#F8F5EF", dark: "#12123A" },
};

export async function noctilProject(userId: string) {
  return buildKitProject(userId, { id: "noctil", media: NOCTIL_MEDIA, handle: NOCTIL_HANDLE, brand: BRAND, themeName: "Noctil", provenance: NOCTIL_PROVENANCE, storeKind: "specialty", sector: "maison" }, curateNoctil);
}

/** Pages de la démonstration (liens du menu, du pied et des sections). */
export const NOCTIL_PAGES = {
  univers: "/pages/notre-univers", journal: "/pages/journal", guide: "/pages/bien-demarrer", faq: "/pages/faq", contact: "/pages/contact",
  livraison: "/pages/livraison-retours", mentions: "/pages/mentions-legales", cgv: "/pages/cgv", confidentialite: "/pages/confidentialite", cookies: "/pages/politique-cookies",
  connexion: "/pages/connexion", inscription: "/pages/creer-un-compte", motDePasse: "/pages/mot-de-passe-oublie", compte: "/pages/mon-compte",
  commande: "/pages/commande-noctil-0001", infos: "/pages/mes-informations",
  paiement: "/pages/finaliser-la-commande", confirmation: "/pages/confirmation-de-commande",
};

/** Articles du journal (pages réelles, gabarit d'article complet) : idées générales, aucun chiffre ni fait inventé. */
type Article = { handle: string; title: string; tag: string; image: string; excerpt: string; intro: string; body: [string, string, string?][]; quote?: string };
export const NOCTIL_ARTICLES: Article[] = [
  { handle: "une-chambre-mille-histoires", title: "Une chambre, mille histoires à inventer", tag: "La chambre", image: "hero-chambre.webp",
    excerpt: "Bien plus qu'un lieu de repos, la chambre est un terrain d'aventures infinies.",
    intro: "Bien plus qu'un simple lieu de repos, la chambre est un terrain d'aventures infinies. Avec un ciel étoilé, elle devient un espace où l'imagination prend vie, soir après soir.",
    quote: "Une chambre bien pensée est une toile blanche sur laquelle les enfants peignent leurs plus belles histoires.",
    body: [
      ["Un espace qui invite à imaginer", "Les enfants ont un pouvoir étonnant : celui de transformer le quotidien en histoires extraordinaires. Une fusée dans un coin, un doudou astronaute, quelques livres sur l'espace… et la chambre devient un univers à explorer."],
      ["Un ciel au-dessus du lit", "Une galaxie projetée au plafond invite à la rêverie : un voyage vers la Lune, la découverte d'une planète inconnue, une rencontre avec des étoiles filantes."],
      ["Des détails qui font la différence", "Quelques éléments simples suffisent pour créer une atmosphère : des livres, des objets décoratifs qui rappellent les étoiles, des matières douces. Chaque détail compte pour faire de la chambre un cocon d'exploration.", "journal-livres.webp"],
      ["Et demain ?", "La chambre évolue avec eux, au gré de leurs passions et de leurs découvertes. Le ciel étoilé reste une source inépuisable d'histoires à inventer."],
    ] },
  { handle: "creer-un-rituel-du-soir", title: "Créer un rituel du soir magique", tag: "Inspiration", image: "chambre-rose.webp",
    excerpt: "Des idées simples pour faire de chaque soir un moment spécial.",
    intro: "Le soir, quelques gestes répétés suffisent à créer un moment à part. Voici des idées simples pour en faire un rendez-vous attendu.",
    body: [
      ["Choisir un moment", "Un même moment chaque soir, après le bain ou avant l'histoire : le rituel commence quand chacun sait ce qui vient ensuite."],
      ["Éteindre la grande lumière", "La galaxie s'allume au plafond, la pièce change d'ambiance : c'est le signal que le moment des histoires commence.", "peluches.webp"],
      ["Raconter à deux", "Une planète au plafond devient le décor d'une histoire inventée ensemble : qui l'habite, comment y aller, ce qu'on y trouve."],
      ["Garder le même fil", "Reprendre l'histoire le lendemain, là où on l'a laissée : le rituel devient un feuilleton."],
    ] },
  { handle: "histoires-d-etoiles", title: "Histoires d'étoiles : 3 contes à inventer", tag: "Histoires", image: "journal-livres.webp",
    excerpt: "Des inspirations pour des histoires qui font voyager.",
    intro: "Pas besoin de livre pour raconter : trois points de départ pour inventer des histoires sous les étoiles.",
    body: [
      ["La planète lavande", "Une planète inconnue apparaît au plafond. Qui l'habite ? Votre enfant décide de ses couleurs, de ses habitants et de son nom."],
      ["Le voyage de la petite fusée", "Une fusée part chercher l'étoile la plus brillante de la galaxie. Chaque soir, elle visite un nouveau monde.", "bibliotheque.webp"],
      ["L'astronaute et le doudou", "Un doudou devient astronaute et explore la chambre transformée en ciel. Ses découvertes se racontent au retour."],
    ] },
  { handle: "decorer-une-chambre-qui-fait-rever", title: "Décorer une chambre qui fait rêver", tag: "La chambre", image: "tipi.webp",
    excerpt: "Conseils et idées pour un univers plein de magie.",
    intro: "Un tipi, des guirlandes, quelques coussins : une chambre qui fait rêver tient souvent à des idées simples.",
    body: [
      ["Un coin à soi", "Un tipi ou un coin lecture délimite un espace rien qu'à lui, pour lire ou jouer.", "chambre-fusee.webp"],
      ["Des lumières douces", "Guirlandes et petites lampes créent des points de lumière chaleureux, le ciel étoilé fait le reste."],
      ["Des objets qui racontent", "Fusée, planètes, livres sur l'espace : des objets qui donnent envie d'imaginer."],
    ] },
  { handle: "couleurs-et-ambiance", title: "Couleurs et ambiance : créer une atmosphère unique", tag: "La chambre", image: "chambre-fusee.webp",
    excerpt: "Harmoniser la décoration et la lumière pour une chambre comme un cocon céleste.",
    intro: "Bleu nuit, lavande, touches dorées : quelques couleurs bien choisies donnent à la chambre l'allure d'un ciel du soir.",
    body: [
      ["Une couleur de fond", "Un mur bleu nuit ou lavande sert de toile de fond aux étoiles."],
      ["Des touches dorées", "Quelques objets dorés rappellent les étoiles, même le jour.", "chambre-rose.webp"],
      ["Des matières douces", "Coussins, tapis épais et plaids rendent le coin du soir accueillant."],
    ] },
  { handle: "les-doudous-aussi-revent", title: "Les animaux aussi rêvent d'étoiles", tag: "Inspiration", image: "peluches.webp",
    excerpt: "Doudous, peluches et compagnons imaginaires : quand la nuit devient le terrain de toutes les aventures.",
    intro: "Les doudous sont souvent les premiers compagnons d'aventure. Sous un ciel étoilé, ils deviennent les héros des histoires du soir.",
    body: [
      ["Le doudou explorateur", "Chaque soir, le doudou part visiter une étoile différente et raconte son voyage le lendemain."],
      ["Une équipe d'astronautes", "Ours, lapin et compagnie forment l'équipage d'une fusée imaginaire.", "tipi.webp"],
    ] },
  { handle: "a-la-decouverte-des-planetes", title: "À la découverte des planètes avec les enfants", tag: "Histoires", image: "aide-planete.webp",
    excerpt: "Des idées simples et ludiques pour explorer le système solaire et nourrir leur curiosité.",
    intro: "Les planètes fascinent les enfants. Quelques idées pour parler d'espace en s'amusant.",
    body: [
      ["Nommer les planètes", "Une comptine, un dessin, une planète par soir : de quoi les retenir en jouant."],
      ["Observer le vrai ciel", "Par une nuit claire, chercher la Lune et les étoiles les plus brillantes depuis la fenêtre."],
    ] },
  { handle: "un-univers-qui-grandit-avec-eux", title: "Un univers qui grandit avec eux", tag: "La chambre", image: "bibliotheque.webp",
    excerpt: "Des conseils pour faire évoluer la chambre au fil de leurs rêves et de leurs passions.",
    intro: "Les passions changent, la chambre aussi. Quelques idées pour la faire évoluer sans tout refaire.",
    body: [
      ["Des étagères qui changent", "Les livres et les objets exposés suivent les passions du moment."],
      ["Un coin pour créer", "Un petit bureau pour dessiner les planètes inventées le soir.", "projecteur-chambre.webp"],
    ] },
  { handle: "observer-la-lune", title: "Observer la Lune depuis sa fenêtre", tag: "Inspiration", image: "projecteur-chambre.webp",
    excerpt: "Une activité simple pour les soirs de ciel dégagé.",
    intro: "La Lune change de forme au fil des soirs : un rendez-vous facile à suivre depuis la fenêtre de la chambre.",
    body: [
      ["Un carnet de Lune", "Dessiner la forme de la Lune chaque soir pendant quelques semaines."],
      ["Raconter ce qu'on voit", "Des taches, un visage, un lapin : chacun y voit sa propre histoire."],
    ] },
];

/** Questions de la page FAQ, par thème : rien d'universel, de délai, de mesure ni de garantie inventés. */
export const NOCTIL_FAQ: [string, string, string][] = [
  ["Qu'est-ce que NOCTIL ?", "NOCTIL est un projecteur qui crée une ambiance céleste dans la chambre : une galaxie violette au plafond ou sur un mur. Le fonctionnement détaillé est à confirmer par la marque.", "Le projecteur NOCTIL"],
  ["Comment fonctionne le projecteur ?", A_CONFIRMER("le fonctionnement détaillé"), "Le projecteur NOCTIL"],
  ["À partir de quel âge est-il adapté ?", A_CONFIRMER("l'âge conseillé"), "Le projecteur NOCTIL"],
  ["Le projecteur est-il bruyant ?", A_CONFIRMER("le niveau sonore"), "Le projecteur NOCTIL"],
  ["Comment suivre ma commande ?", "Sur une vraie boutique, le suivi est envoyé par e-mail et visible depuis votre compte. Modalités de suivi : à confirmer.", "Ma commande"],
  ["Puis-je modifier ma commande ?", A_CONFIRMER("les conditions de modification d'une commande"), "Ma commande"],
  ["Comment utiliser un code de réduction ?", "Le champ « Code de réduction » se trouve dans le panier. Aucun code n'est proposé dans cette démonstration.", "Ma commande"],
  ["Quels sont les modes de livraison ?", "Les modes de livraison disponibles sont indiqués lors de la validation de la commande. Délais et frais : à confirmer.", "Livraison"],
  ["Dans quels pays livrez-vous ?", A_CONFIRMER("les zones de livraison"), "Livraison"],
  ["Combien coûte la livraison ?", "Les frais sont calculés à l'étape suivante de la commande. Tarifs : à confirmer.", "Livraison"],
  ["Comment effectuer un retour ?", "Les conditions de retour seront réunies sur la page Livraison et retours. Modalités exactes : à confirmer.", "Retours"],
  ["Sous quelles conditions puis-je retourner mon produit ?", A_CONFIRMER("les conditions de retour"), "Retours"],
  ["Comment suis-je remboursé ?", A_CONFIRMER("les modalités de remboursement"), "Retours"],
];

/** Questions de l'accueil (planche 01) : l'âge reste à confirmer, rien d'universel. */
const HOME_FAQ: [string, string][] = [
  ["À partir de quel âge est adapté NOCTIL ?", A_CONFIRMER("l'âge conseillé")],
  ["Comment installer NOCTIL ?", "Posez-le sur un meuble stable de la chambre, orientez l'objectif vers le plafond ou un mur, puis appuyez sur le bouton du socle. Les étapes sont reprises sur la page Bien démarrer."],
  ["Est-ce facile à utiliser ?", "Il s'allume par le bouton éclairé du socle, facile à repérer dans la pénombre. Les autres réglages éventuels sont à confirmer."],
  ["Dans quelles pièces peut-on l'utiliser ?", "Partout où il peut être posé face à un plafond ou à un mur : chambre, salle de jeux, coin lecture…"],
];
/** « Avant de choisir » (planche 02) : chaque information technique reste « À confirmer ». */
const BEFORE: [string, string][] = [
  ["Comment fonctionne le projecteur ?", A_CONFIRMER("le fonctionnement détaillé")],
  ["Quelles sont les dimensions ?", A_CONFIRMER("les dimensions et le poids")],
  ["Quelle est la source d'alimentation ?", A_CONFIRMER("l'alimentation (câble, batterie, autonomie)")],
  ["Est-il adapté à tous les âges ?", A_CONFIRMER("l'âge conseillé")],
];
const PRODUCT_FAQ: [string, string][] = [
  ["Comment l'installer dans une chambre ?", "Posez-le sur un meuble stable, orientez l'objectif vers le plafond ou un mur, puis appuyez sur le bouton du socle."],
  ["Peut-on l'utiliser tous les soirs ?", "Durée d'utilisation conseillée et consignes : à confirmer par la marque avant la mise en vente."],
  ["Comment l'entretenir ?", A_CONFIRMER("l'entretien")],
  ["Et si nous avons une autre question ?", "Écrivez-nous depuis la page Contact : nous vous répondrons."],
];

function curateNoctil(k: Kit) {
  const { spec, img, section, overlay } = k;
  const href = `/products/${NOCTIL_HANDLE}`;
  const faqRows = (rows: [string, string][], badge = "") => rows.map(([question, answer]) => ({ type: "question", settings: { question, answer: p(answer), badge } }));
  k.demoMeta();
  spec.store.seo = { title: "NOCTIL | Un petit monde. Un ciel immense.", description: "Le projecteur de galaxies NOCTIL transforme la chambre de votre enfant en un univers d'exploration, d'histoires et d'émerveillement. Boutique et prix de démonstration." };

  // ─── Un produit, sa fiche (planche 02) : prix de démonstration, une seule variante, aucune donnée technique. ─────────
  k.product({
    title: BRAND.product, tags: ["projecteur", "galaxie", "chambre d'enfant"],
    description_html: p("Transformez la chambre en un ciel étoilé fascinant. NOCTIL projette une galaxie aux nuances violettes au plafond ou sur un mur, pour des moments d'émerveillement, soir après soir.") + p("Une sphère bleu nuit mate tenue par son arceau, un objectif rond où tourbillonne une galaxie, un socle rond avec un bouton éclairé de violet.") + p("Dimensions, alimentation, âge conseillé et fonctionnement détaillé : à confirmer."),
    images: ["produit-01.webp", "produit-02.webp", "produit-04.webp", "projecteur-chambre.webp", "produit-03.webp", "produit-05.webp"],
    seo: { title: "Le projecteur NOCTIL — une galaxie pour les petites imaginations", description: "Projecteur de galaxies pour la chambre d'enfant : sphère bleu nuit, objectif galaxie, bouton éclairé sur le socle. Prix de démonstration, boutique de démonstration." },
  });
  const pr = spec.store.product;
  pr.price = NOCTIL_PRICE;
  pr.variants = [{ title: "Default Title", options: [], price: NOCTIL_PRICE, available: true }];
  const key = k.productKey();
  const t = spec.templates[key];
  const mp = t.sections[t.order.find((sid) => t.sections[sid].type === "main-product")!];
  const mpSchema = sectionSchema(spec, "main-product")!;
  const block = (type: string, settings: Record<string, unknown>) => ({ type, settings: withDefaults(mpSchema.blocks.find((b) => b.type === type)?.settings, settings) });
  const blocks: [string, { type: string; settings: Record<string, unknown> }][] = [
    ["title", block("title", {})],
    ["text", block("text", { text: p("Transformez la chambre en un ciel étoilé fascinant. NOCTIL projette une galaxie immersive aux nuances violettes et aux étoiles scintillantes, pour des moments d'émerveillement, soir après soir.") })],
    ["price", block("price", { label: "Prix de démonstration", show_taxes: false })],
    ["buy", block("buy_buttons", { picker: "buttons", show_quantity: true, show_dynamic_checkout: false, price_in_button: false, quantity_label: "Quantité" })],
    ["links", block("links", { label_1: "Guide d'utilisation", link_1: NOCTIL_PAGES.guide, icon_1: "book", label_2: "Livraison et retours", link_2: NOCTIL_PAGES.livraison, icon_2: "truck" })],
  ];
  mp.settings = { ...mp.settings, product_target: pr.contentTarget, purchase_enabled: false, gallery_layout: "carousel", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, show_breadcrumb: true, display_heading: "Le projecteur NOCTIL", display_intro: "Une galaxie pour les petites imaginations", color_scheme: "scheme-1", padding_top: 8, padding_bottom: 32 };
  mp.blocks = Object.fromEntries(blocks);
  mp.block_order = blocks.map(([b]) => b);
  // Cartes et prix : « Prix de démonstration », prix ronds sans « ,00 ».
  spec.settings = { ...spec.settings, card_price_note: "Prix de démonstration", card_arrow: true, price_trim_zeros: true };

  const journalBlocks = (list: Article[], withText = true) => list.map((a) => ({ type: "article", settings: { ...img(a.image), title: a.title, text: withText ? a.excerpt : "", tag: a.tag, date_text: "", link: `/pages/${a.handle}` } }));
  const article = (h: string) => NOCTIL_ARTICLES.find((a) => a.handle === h)!;

  // ─── Accueil (planche 01), dans l'ordre de la maquette. ────────────────────────────────────────────────────────────
  const home: SectionInstance[] = [
    section("cv-banner", { ...img("hero-chambre.webp"), layout: "night", band_height: "hero", veil: "left", mobile_valign: "top", image_loading: "eager", focus_x: 62, focus_y: 50, mobile_focus_x: 64, mobile_focus_y: 40, heading: "Un petit monde.\nUn ciel immense.", heading_tag: "h1", heading_accent: "", eyebrow: "", text: p("Transformez la chambre de votre enfant en un univers d'exploration, d'histoires et d'émerveillement."), price_text: "", price_note: "", button_label: "Découvrir NOCTIL", button_link: href, button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0 }),
    section("cv-rise", { ...img("projecteur-detoure.png"), image_loading: "eager", layout: "media-left", overlap: "auto", media_width: 44, rise: 20, mobile_width: 74, mobile_rise: 38, decor: true, curve: true, eyebrow: "", heading: "L'imagination\ncommence ici.", heading_tag: "h2", text: p("NOCTIL projette un univers fascinant qui transforme chaque soir en une nouvelle aventure. Une invitation à rêver, explorer et inventer, depuis la chambre de votre enfant."), buy_product: NOCTIL_HANDLE, price_text: "", price_note: "Prix de démonstration", button_label: "Ajouter au panier", button_link: "", button_arrow: true, animation: "fade", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 24 }),
    section("cv-cards", { layout: "columns", heading: "", heading_accent: "", text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 16, padding_bottom: 24 }, [
      { type: "card", settings: { ...img("chambre-fusee.webp"), focus_x: 50, focus_y: 30, title: "Une chambre à explorer", text: p("Un univers captivant pour éveiller la curiosité et l'envie de découvrir."), link: NOCTIL_PAGES.univers, link_label: "Notre univers" } },
      { type: "card", settings: { ...img("tipi.webp"), focus_x: 60, focus_y: 40, title: "Des histoires à inventer", text: p("Un décor magique qui donne vie aux plus belles histoires."), link: `/pages/${article("histoires-d-etoiles").handle}`, link_label: "Lire l'article" } },
      { type: "card", settings: { ...img("peluches.webp"), focus_x: 60, focus_y: 50, title: "Un moment à partager", text: p("Des instants précieux pour rêver ensemble, soir après soir."), link: `/pages/${article("creer-un-rituel-du-soir").handle}`, link_label: "Lire l'article" } },
    ]),
    section("cv-banner", { ...img("projecteur-chambre.webp"), layout: "background", band_height: "medium", veil: "left", focus_x: 60, focus_y: 50, mobile_focus_x: 80, mobile_focus_y: 50, heading: "Plus qu'un projecteur.\nUne porte vers l'infini.", heading_tag: "h2", heading_accent: "", eyebrow: "", text: p("NOCTIL invite votre enfant à s'évader dans un monde de lumière et de poésie, où chaque nuit devient une nouvelle aventure."), price_text: "", price_note: "", button_label: "Découvrir NOCTIL", button_link: href, button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0 }),
    section("cv-steps", { layout: "cards", eyebrow: "", heading: "3 étapes pour un voyage extraordinaire", text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 32 }, [
      { type: "step", settings: { ...img("produit-02.webp"), focus_x: 50, focus_y: 50, title: "Installez", text: "Placez NOCTIL sur un meuble dans la chambre." } },
      { type: "step", settings: { ...img("produit-05.webp"), focus_x: 50, focus_y: 70, title: "Allumez", text: "Appuyez sur le bouton et laissez la magie opérer." } },
      { type: "step", settings: { ...img("chambre-rose.webp"), focus_x: 50, focus_y: 30, title: "Explorez", text: "Une chambre transformée en un univers fascinant." } },
    ]),
    section("cv-banner", { ...img("bibliotheque.webp"), layout: "background", band_height: "medium", veil: "left", focus_x: 62, focus_y: 50, mobile_focus_x: 74, mobile_focus_y: 50, heading: "Les grandes aventures\ncommencent dans\nles petites chambres.", heading_tag: "h2", heading_accent: "", eyebrow: "", text: p("NOCTIL est né d'une idée simple : offrir aux enfants un espace où leur imagination peut s'envoler. Parce que chaque nuit est une nouvelle occasion de rêver plus grand."), price_text: "", price_note: "", button_label: "Notre univers", button_link: NOCTIL_PAGES.univers, button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0 }),
    section("fs-journal", { layout: "row", eyebrow: "", heading: "Le journal", heading_accent: "", text: p("Des idées, des histoires et des inspirations pour faire briller leur imagination."), align: "left", button_label: "Voir tous les articles", button_link: NOCTIL_PAGES.journal, limit: 3, show_date: false, show_excerpt: true, link_label: "Lire l'article", effect: "fade", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 32 }, journalBlocks([article("creer-un-rituel-du-soir"), article("histoires-d-etoiles"), article("decorer-une-chambre-qui-fait-rever")])),
    section("faq", { eyebrow: "", heading: "Offrez-lui un univers d'exploration.", text: p("Parce que les plus beaux rêves commencent à la maison."), style: "lines", layout: "side", columns: "1", open_first: true, search: false, contact_text: "", button_label: "Découvrir NOCTIL", button_link: href, structured_data: false, color_scheme: "scheme-2", padding_top: 40, padding_bottom: 40 }, faqRows(HOME_FAQ)),
  ];
  for (const r of home) r.settings.__noctil = true;
  overlay("index", home);
  keepOnly(spec, "index");

  // ─── Fiche (planche 02). ────────────────────────────────────────────────────────────────────────────────────────
  const product: SectionInstance[] = [
    section("cv-banner", { ...img("bibliotheque.webp"), layout: "background", band_height: "medium", veil: "left", focus_x: 66, focus_y: 50, mobile_focus_x: 78, mobile_focus_y: 50, heading: "Toute une aventure,\nsans quitter sa chambre", heading_tag: "h2", heading_accent: "", eyebrow: "", text: p("Des galaxies lointaines, des nébuleuses scintillantes et un ciel étoilé pour transformer chaque instant en un voyage extraordinaire."), price_text: "", price_note: "", button_label: "Découvrir notre univers", button_link: NOCTIL_PAGES.univers, button_style: "solid", button_arrow: false, note: "", animation: "fade", color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0 }),
    section("features-grid", { layout: "row", columns: 3, columns_mobile: "1", style: "plain", heading_align: "left", heading: "", text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 28, padding_bottom: 28 }, [
      { type: "feature", settings: { icon: "moon", title: "Une atmosphère magique", text: p("Un ciel étoilé fascinant pour des moments précieux."), link_label: "", link: "" } },
      { type: "feature", settings: { icon: "star", title: "Pour nourrir l'imagination", text: p("Des univers à perte de vue pour rêver, explorer, inventer."), link_label: "", link: "" } },
      { type: "feature", settings: { icon: "planet", title: "Un objet décoratif", text: p("Un design élégant qui trouve sa place dans toutes les chambres."), link_label: "", link: "" } },
    ]),
    section("cv-cards", { layout: "overlay", heading: "", heading_accent: "", text: "", animation: "fade", color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0 }, [
      { type: "card", settings: { ...img("produit-04.webp"), focus_x: 50, focus_y: 50, eyebrow: "Un voyage sans fin", title: "Des détails fascinants", text: p("Un objectif rond où tourbillonne une galaxie violette : un détail qu'on a envie de regarder de près."), link: "", link_label: "" } },
      { type: "card", settings: { ...img("produit-05.webp"), focus_x: 50, focus_y: 72, eyebrow: "Un design élégant", title: "Pensé pour toutes les chambres", text: p("Une forme épurée qui s'intègre naturellement dans l'univers des enfants."), link: "", link_label: "" } },
    ]),
    section("cv-cards", { layout: "columns", mobile_carousel: true, heading: "Trois instants, une infinité d'histoires", heading_accent: "", text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 32 }, [
      { type: "card", settings: { ...img("peluches.webp"), focus_x: 60, focus_y: 50, title: "Le moment du coucher", text: p("Accompagne les rituels du soir avec une atmosphère douce et féerique."), link: "", link_label: "" } },
      { type: "card", settings: { ...img("tipi.webp"), focus_x: 60, focus_y: 40, title: "Les moments de calme", text: p("Un univers inspirant pour lire, rêver et s'évader."), link: "", link_label: "" } },
      { type: "card", settings: { ...img("chambre-fusee.webp"), focus_x: 60, focus_y: 40, title: "Les jeux d'imagination", text: p("Transforme la chambre en terrain d'exploration pour des aventures sans limite."), link: "", link_label: "" } },
    ]),
    section("cv-gallery", { layout: "grid", mobile_carousel: true, ratio: "landscape", heading: "Des univers uniques, pour chaque chambre", text: p("Découvrez comment NOCTIL s'intègre dans différents univers, pour faire briller toutes les imaginations."), ai_label: "", animation: "fade", color_scheme: "scheme-2", padding_top: 32, padding_bottom: 32 }, [
      { type: "image", settings: { ...img("chambre-rose.webp"), caption: "" } },
      { type: "image", settings: { ...img("hero-chambre.webp"), caption: "" } },
      { type: "image", settings: { ...img("chambre-fusee.webp"), caption: "" } },
    ]),
    section("faq", { eyebrow: "", heading: "Avant de choisir", text: p("Voici les informations essentielles pour en savoir plus sur NOCTIL."), style: "lines", layout: "stacked", columns: "1", open_first: false, search: false, contact_text: "", button_label: "", button_link: "", pair: true, structured_data: false, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 16 }, faqRows(BEFORE, "À confirmer")),
    section("faq", { eyebrow: "", heading: "Vos questions, nos réponses", text: p("Retrouvez ici les réponses aux questions les plus courantes."), style: "lines", layout: "stacked", columns: "1", open_first: false, search: false, contact_text: "", button_label: "", button_link: "", pair: true, structured_data: false, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 16 }, faqRows(PRODUCT_FAQ)),
    section("fs-journal", { layout: "list", eyebrow: "", heading: "À lire dans le journal", heading_accent: "", text: p("Des idées, des histoires et des inspirations autour de l'univers et de l'imagination."), align: "left", button_label: "Voir tous les articles", button_link: NOCTIL_PAGES.journal, limit: 2, show_date: false, show_excerpt: true, link_label: "Lire l'article", effect: "fade", color_scheme: "scheme-2", padding_top: 32, padding_bottom: 40 }, journalBlocks([article("une-chambre-mille-histoires"), article("decorer-une-chambre-qui-fait-rever")])),
  ];
  for (const r of product) r.settings.__noctil = true;
  overlay(key, product);
  keepOnly(spec, key);

  // ─── Menus, en-tête (logo, menu, compte, panier en pastille), pied bleu nuit. ──────────────────────────────────
  spec.store.menus["main-menu"] = { title: "Navigation", links: [
    { title: "Le projecteur", url: href },
    { title: "Notre univers", url: NOCTIL_PAGES.univers },
    { title: "Le journal", url: NOCTIL_PAGES.journal },
    { title: "Aide", url: NOCTIL_PAGES.faq },
  ] };
  spec.store.menus.footer = { title: "Boutique", links: [{ title: "Le projecteur", url: href }, { title: "Notre univers", url: NOCTIL_PAGES.univers }, { title: "Le journal", url: NOCTIL_PAGES.journal }] };
  spec.store.menus["footer-aide"] = { title: "Aide", links: [{ title: "Bien démarrer", url: NOCTIL_PAGES.guide }, { title: "Questions fréquentes", url: NOCTIL_PAGES.faq }, { title: "Livraison et retours", url: NOCTIL_PAGES.livraison }, { title: "Nous contacter", url: NOCTIL_PAGES.contact }] };
  spec.store.menus["footer-compte"] = { title: "Mon compte", links: [{ title: "Se connecter", url: NOCTIL_PAGES.connexion }, { title: "Créer un compte", url: NOCTIL_PAGES.inscription }, { title: "Mes commandes", url: NOCTIL_PAGES.commande }] };
  spec.store.menus.legal = { title: "Légal", links: [{ title: "Mentions légales", url: NOCTIL_PAGES.mentions }, { title: "Conditions générales de vente", url: NOCTIL_PAGES.cgv }, { title: "Politique de confidentialité", url: NOCTIL_PAGES.confidentialite }, { title: "Politique des cookies", url: NOCTIL_PAGES.cookies }, { title: "Gérer les cookies", url: "#cookies" }] };
  const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
  header.settings = { ...header.settings, menu: "main-menu", layout: "logo-left", shape: "bar", icons: "plain", mega_menu: "none", mobile_menu: "drawer-right", mobile_submenu: "accordion", sticky: true, transparent_on_home: true, show_search: false, show_cart: true, cart_label: "Panier", account_link: NOCTIL_PAGES.connexion, cta_label: "", phone: "", color_scheme: "scheme-1", mobile_menu_scheme: "scheme-2" };
  header.blocks = {};
  header.block_order = [];
  spec.groups.header.sections = { header };
  spec.groups.header.order = ["header"];
  const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
  const fschema = sectionSchema(spec, "footer")!;
  const fblock = (type: string, settings: Record<string, unknown>) => ({ type, settings: withDefaults(fschema.blocks.find((b) => b.type === type)?.settings, settings) });
  footer.settings = { ...footer.settings, style: "columns", tagline: "Des étoiles plein l'imagination.", show_wordmark: false, show_policies: false, show_payment: false, color_scheme: "scheme-2", logo_asset: k.name("logo.webp"), bottom_text: "Boutique et prix de démonstration : 69 €.", bottom_menu: "" };
  footer.blocks = {
    shop: fblock("links", { heading: "Boutique", menu: "footer" }),
    help: fblock("links", { heading: "Aide", menu: "footer-aide" }),
    account: fblock("links", { heading: "Mon compte", menu: "footer-compte" }),
    legal: fblock("links", { heading: "Légal", menu: "legal" }),
  };
  footer.block_order = ["shop", "help", "account", "legal"];
  for (const s of Object.values(spec.groups.footer.sections)) if (s.type !== "footer") s.disabled = true;

  // ─── Boutique (planche 03, écran 1) : un seul produit, ouverture avec achat, trois atouts. ──────────────────────
  spec.templates.collection = { order: ["hero", "atouts"], sections: {
    hero: section("cv-banner", { ...img("projecteur-chambre.webp"), layout: "image-right", focus_x: 72, focus_y: 50, mobile_focus_x: 76, mobile_focus_y: 50, image_loading: "eager", eyebrow: "Projecteur galaxie", heading: "Invitez l'univers\ndans leur chambre", heading_tag: "h1", heading_accent: "", text: p("Des nébuleuses, des étoiles et des mondes lointains pour transformer chaque soirée en une aventure extraordinaire."), price_text: "", price_note: "Prix de démonstration", buy_product: NOCTIL_HANDLE, button_label: "Ajouter au panier", button_link: "", button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0 }),
    atouts: section("features-grid", { layout: "row", columns: 3, columns_mobile: "1", style: "plain", heading_align: "left", heading: "", text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 40 }, [
      { type: "feature", settings: { icon: "sparkle", title: "Une atmosphère extraordinaire chaque soir", text: "", link_label: "", link: "" } },
      { type: "feature", settings: { icon: "planet", title: "Un design élégant qui s'intègre dans toutes les chambres", text: "", link_label: "", link: "" } },
      { type: "feature", settings: { icon: "moon", title: "Pour éveiller l'imagination et de grands rêves", text: "", link_label: "", link: "" } },
    ]),
  } };

  // ─── Panier (planche 03, écrans 2, 3 et 6) : lignes, sous-total et livraison à l'étape suivante (jamais un « Total »
  // garanti) ; panier vide : planète dessinée, « L'univers vous attend ! ». « Passer commande » mène, dans l'aperçu
  // seulement, à l'exemple de commande sans paiement. ─────────────────────────────────────────────────────────────
  for (const sec of Object.values(spec.templates.cart?.sections ?? {})) if (sec.type === "main-cart") sec.settings = { ...sec.settings, intro: "Voici les articles que vous avez sélectionnés.", hero_image_asset: "", hero_empty_image_asset: "", table_head: false, show_update: false, show_taxes_note: false, variant_options: false, total_label: "Sous-total", shipping_label: "Livraison", shipping_text: "Calculée à l'étape suivante", summary_note: "Prix de démonstration", empty_icon: "planet", empty_image_asset: img("peluches.webp").image_asset, empty_heading: "Votre panier est vide", empty_text: "L'univers vous attend ! Découvrez notre projecteur galaxie pour faire briller leurs nuits.", empty_button_label: "Découvrir le projecteur", empty_button_link: href, qty_buttons: true, remove_label: "Supprimer", continue_label: "Continuer mes achats", demo_checkout_link: NOCTIL_PAGES.paiement, color_scheme: "scheme-1" };
  spec.templates.cart.sections.aussi = section("cv-cards", { layout: "columns", heading: "Vous aimerez aussi", heading_accent: "", text: "", hide_when_cart_empty: true, animation: "fade", color_scheme: "scheme-1", padding_top: 8, padding_bottom: 40 }, [
    { type: "card", settings: { ...img("peluches.webp"), focus_x: 60, focus_y: 50, title: "Créer un rituel du soir magique", text: p("Des idées simples pour faire de chaque soir un moment spécial."), link: `/pages/${article("creer-un-rituel-du-soir").handle}`, link_label: "Lire l'article" } },
  ]);
  spec.templates.cart.order.push("aussi");
  spec.settings = { ...spec.settings, cart_heading: "Votre panier", cart_empty_title: "Votre panier est vide", cart_discount_code: true, cart_checkout_label: "Passer commande", cart_reassurance: "" };

  // ─── Pages (planches 03 à 07) : voir pagesNoctil. ──────────────────────────────────────────────────────────────
  pagesNoctil(k, href);
  k.finish();
  spec.settings = { ...spec.settings, logo_width: 150, logo_light_on_dark: true, fab_contact_link: NOCTIL_PAGES.contact, cookie_banner: true, cookie_policy_link: NOCTIL_PAGES.cookies, cookie_policy_label: "Politique des cookies", cookie_title: "Vos préférences de confidentialité", cookie_text: "Nous utilisons des cookies pour le fonctionnement du site et, seulement avec votre accord, pour mesurer l'audience et personnaliser le contenu. Choisissez les catégories que vous acceptez.", cookie_analytics: "Cookies de mesure d'audience : nous aident à comprendre l'utilisation du site.", cookie_marketing: "Cookies de personnalisation : permettent de vous proposer un contenu adapté.", cookie_needed: "Cookies strictement nécessaires : essentiels au fonctionnement du site, toujours actifs." };
}

/** Après `overlay`, retire les sections de la composition de référence que la planche n'utilise pas (marquées). */
function keepOnly(spec: Kit["spec"], key: string) {
  const t = spec.templates[key];
  const at = t.order.findIndex((sid) => t.sections[sid].type === "main-product");
  t.order = t.order.filter((sid, j) => {
    if (at >= 0 && j <= at) return true;
    if (t.sections[sid].settings.__noctil) { delete t.sections[sid].settings.__noctil; return true; }
    delete t.sections[sid];
    return false;
  });
}

/** Pages intérieures (planches 03 à 07). */
function pagesNoctil(k: Kit, href: string) {
  const { spec } = k;
  const S = (type: string, settings: Record<string, unknown>, blocks: { type: string; settings: Record<string, unknown> }[] = []) => k.section(type, settings, blocks);
  const page = (handle: string, title: string, seo: { title: string; description: string }, rows: [string, SectionInstance][]) => {
    k.page(handle, title, seo, rows);
    // Le titre de page est porté par le bandeau ou la section (H1).
    spec.templates[`page.${handle}`].sections.title.settings = { ...spec.templates[`page.${handle}`].sections.title.settings, show_title: false, padding_top: 0, padding_bottom: 0 };
  };
  const seo = (title: string, description: string) => ({ title: `${title} | NOCTIL`, description });
  /** Ouverture des pages intérieures : photo de nuit, texte clair à gauche (H1). */
  const hero = (file: string, eyebrow: string, heading: string, text: string, extra: Record<string, unknown> = {}) => S("cv-banner", { ...k.img(file), layout: "background", band_height: "tall", veil: "left", mobile_valign: "bottom", image_loading: "eager", focus_x: 62, focus_y: 50, mobile_focus_x: 70, mobile_focus_y: 50, eyebrow, heading, heading_tag: "h1", heading_accent: "", text: text ? p(text) : "", price_text: "", price_note: "", button_label: "", button_link: "", button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0, ...extra });
  const side = (file: string, layout: "image-left" | "image-right", eyebrow: string, heading: string, text: string, extra: Record<string, unknown> = {}) => S("cv-banner", { ...k.img(file), layout, focus_x: 50, focus_y: 50, mobile_focus_x: 50, mobile_focus_y: 50, eyebrow, heading, heading_tag: "h2", heading_accent: "", text: p(text), price_text: "", price_note: "", button_label: "", button_link: "", button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-1", padding_top: 40, padding_bottom: 40, ...extra });
  const band = (file: string, eyebrow: string, heading: string, text: string, button: [string, string] | null, extra: Record<string, unknown> = {}) => S("cv-banner", { ...k.img(file), layout: "background", band_height: "medium", veil: "left", focus_x: 60, focus_y: 50, mobile_focus_x: 70, mobile_focus_y: 50, eyebrow, heading, heading_tag: "h2", heading_accent: "", text: p(text), price_text: "", price_note: "", button_label: button?.[0] ?? "", button_link: button?.[1] ?? "", button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-2", padding_top: 0, padding_bottom: 0, ...extra });
  /** Appel final avec le projecteur détouré (sans débordement : la section précédente n'est pas une ouverture). */
  const finale = (heading: string, text: string) => S("cv-rise", { ...k.img("projecteur-detoure.png"), image_loading: "lazy", layout: "media-right", overlap: "none", media_width: 26, rise: 0, mobile_width: 56, mobile_rise: 0, decor: true, curve: false, eyebrow: "", heading, heading_tag: "h2", text: p(text), buy_product: "", price_text: "", price_note: "", button_label: "Découvrir le projecteur", button_link: href, button_arrow: true, animation: "fade", color_scheme: "scheme-2", padding_top: 24, padding_bottom: 24 });
  const journalCards = (list: Article[], withText = true) => list.map((a) => ({ type: "article", settings: { ...k.img(a.image), title: a.title, text: withText ? a.excerpt : "", tag: a.tag, date_text: "", link: `/pages/${a.handle}` } }));
  const faqRows = (rows: [string, string, string?][]) => rows.map(([question, answer, topic]) => ({ type: "question", settings: { question, answer: p(answer), topic: topic ?? "", badge: answer.startsWith("À confirmer") ? "À confirmer" : "" } }));

  // ─── Notre univers (planche 04, colonne 1) ───────────────────────────────────────────────────────────────────────
  page("notre-univers", "Notre univers", seo("Notre univers", "Chez NOCTIL, nous croyons au pouvoir d'un ciel étoilé pour éveiller la curiosité des enfants et faire grandir leurs rêves."), [
    ["hero", hero("projecteur-chambre.webp", "Notre univers", "Des étoiles plein\nl'imagination", "Chez NOCTIL, nous croyons au pouvoir d'un ciel étoilé pour éveiller la curiosité des enfants et faire grandir leurs rêves.", { button_label: "Lire le journal", button_link: NOCTIL_PAGES.journal, focus_x: 70 })],
    ["compagnon", side("bibliotheque.webp", "image-right", "Plus qu'un objet", "Un compagnon\nd'imagination", "NOCTIL transforme la chambre en un espace d'évasion, où chaque soir ouvre la porte à de nouvelles histoires.", { focus_x: 70 })],
    ["curiosite", band("aide-planete.webp", "Des mondes à explorer", "Éveiller la curiosité\ndès aujourd'hui", "Observer, s'émerveiller, se poser des questions… Le ciel est une invitation sans fin à la découverte. NOCTIL apporte l'univers dans la chambre pour nourrir cette curiosité.", null, { focus_x: 70 })],
    ["chambre", side("tipi.webp", "image-right", "Des histoires sans limites", "Chaque chambre\ndevient un univers", "Planètes lointaines, galaxies colorées, pluies d'étoiles… Avec NOCTIL, les enfants inventent, explorent et s'évadent, nuit après nuit.", { focus_x: 60 })],
    ["final", finale("Et si l'aventure\ncommençait ce soir ?", "Apportez un ciel étoilé dans leur chambre et laissez place à l'imagination.")],
  ]);

  // ─── Journal : filtres et pagination (planche 04, colonne 2) ────────────────────────────────────────────────────
  page("journal", "Le journal", seo("Le journal", "Conseils, inspirations et histoires autour du ciel, de l'imagination et des chambres d'enfants."), [
    ["hero", hero("journal-livres.webp", "Le journal", "Des idées pour faire\ngrandir leur univers", "Conseils, inspirations et histoires autour du ciel, de l'imagination et des chambres d'enfants. Parce que chaque nuit peut être le début d'une nouvelle aventure.", { focus_x: 70 })],
    ["articles", S("fs-journal", { layout: "grid", filters: true, all_label: "Tous", tag_on_image: false, eyebrow: "", heading: "", heading_accent: "", text: "", align: "left", button_label: "", button_link: "", limit: 12, per_page: 6, show_date: false, show_excerpt: true, link_label: "Lire l'article", effect: "fade", color_scheme: "scheme-1", padding_top: 28, padding_bottom: 48 }, journalCards(NOCTIL_ARTICLES))],
  ]);

  // ─── Articles : gabarit complet (fil d'Ariane, photo, titre centré, intertitres, citation, articles liés) ────────
  for (const a of NOCTIL_ARTICLES) {
    const others = NOCTIL_ARTICLES.filter((x) => x.handle !== a.handle && x.tag === a.tag).concat(NOCTIL_ARTICLES.filter((x) => x.handle !== a.handle && x.tag !== a.tag)).slice(0, 3);
    const blocks = [
      { type: "image", settings: { ...k.img(a.image), caption: "" } },
      ...a.body.flatMap(([h, t, img], i) => [
        { type: "heading", settings: { text: h } },
        { type: "paragraph", settings: { text: p(t) } },
        ...(i === 0 && a.quote ? [{ type: "quote", settings: { text: a.quote, author: "" } }] : []),
        ...(img ? [{ type: "image", settings: { ...k.img(img), caption: "" } }] : []),
      ]),
    ];
    page(a.handle, a.title, { title: `${a.title} | Journal NOCTIL`, description: a.excerpt }, [
      ["article", S("cv-article", { style: "listicle", width: "regular", label_bar: "", crumb_label: a.tag, crumb_link: NOCTIL_PAGES.journal, crumb_link_label: "Le journal", eyebrow: a.tag, heading: a.title, heading_tag: "h1", heading_accent: "", intro: p(a.intro), author: "", date_text: "", rating_text: "", demo_note: "", animation: "fade", color_scheme: "scheme-1", padding_top: 16, padding_bottom: 24 }, blocks)],
      ["lies", S("fs-journal", { layout: "row", filters: false, tag_on_image: false, eyebrow: "", heading: "Articles liés", heading_accent: "", text: "", align: "left", button_label: "", button_link: "", limit: 3, per_page: 0, show_date: false, show_excerpt: false, link_label: "Lire l'article", effect: "fade", color_scheme: "scheme-1", padding_top: 16, padding_bottom: 32 }, journalCards(others, false))],
      ["final", finale("Et si l'aventure\ncommençait ce soir ?", "Apportez un ciel étoilé dans leur chambre et laissez place à l'imagination.")],
    ]);
  }

  // ─── Bien démarrer (planche 05, écran 1) : rien d'affirmé sur une notice, qui n'est pas fournie. ─────────────────
  page("bien-demarrer", "Bien démarrer", seo("Bien démarrer avec NOCTIL", "Quelques étapes simples pour installer NOCTIL, explorer et laisser place à l'imagination."), [
    ["hero", hero("projecteur-chambre.webp", "", "Bien démarrer\navec NOCTIL", "Quelques étapes simples pour installer, explorer et laisser place à l'imagination.", { button_label: "Questions fréquentes", button_link: NOCTIL_PAGES.faq, focus_x: 72 })],
    ["etapes", S("cv-steps", { layout: "cards", eyebrow: "", heading: "Votre aventure céleste commence ici", text: p("NOCTIL transforme la chambre en un univers fascinant. Suivez ces étapes pour en profiter. Les consignes d'utilisation détaillées (alimentation, réglages, sécurité) sont à confirmer par la marque."), button_label: "", button_link: "", animation: "fade", color_scheme: "scheme-1", padding_top: 40, padding_bottom: 32 }, [
      { type: "step", settings: { ...k.img("produit-02.webp"), focus_x: 50, focus_y: 50, title: "Installer", text: p("Placez NOCTIL sur une surface stable dans la chambre, l'objectif tourné vers le plafond ou un mur.") } },
      { type: "step", settings: { ...k.img("produit-04.webp"), focus_x: 50, focus_y: 50, title: "Découvrir", text: p("Appuyez sur le bouton du socle et laissez-vous surprendre par la galaxie projetée.") } },
      { type: "step", settings: { ...k.img("chambre-rose.webp"), focus_x: 50, focus_y: 30, title: "Imaginer", text: p("Inventez des histoires, cherchez des formes dans les étoiles, laissez voyager l'imagination.") } },
    ])],
    ["question", S("cv-banner", { ...k.img("produit-03.webp"), layout: "image-left", focus_x: 50, focus_y: 50, mobile_focus_x: 50, mobile_focus_y: 50, eyebrow: "", heading: "Une question ?", heading_tag: "h2", heading_accent: "", text: p("Les réponses courantes sont réunies dans les questions fréquentes. Pour tout le reste, écrivez-nous."), price_text: "", price_note: "", button_label: "Nous contacter", button_link: NOCTIL_PAGES.contact, button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-3", padding_top: 24, padding_bottom: 48 })],
  ]);

  // ─── FAQ : recherche, thèmes en intertitres (planche 05, écran 2) ───────────────────────────────────────────────
  page("faq", "Questions fréquentes", seo("Questions fréquentes", "Trouvez rapidement les réponses aux questions les plus courantes sur NOCTIL, votre commande, la livraison et les retours."), [
    ["hero", hero("aide-planete.webp", "", "Questions\nfréquentes", "Trouvez rapidement les réponses aux questions les plus courantes sur NOCTIL.", { focus_x: 80 })],
    ["questions", S("faq", { eyebrow: "", heading: "", text: "", style: "lines", layout: "stacked", columns: "1", open_first: true, search: true, search_placeholder: "Rechercher une question…", topics: false, topic_titles: true, contact_text: "Vous ne trouvez pas la réponse ?", button_label: "Nous contacter", button_link: NOCTIL_PAGES.contact, structured_data: false, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 48 }, faqRows(NOCTIL_FAQ))],
  ]);

  // ─── Contact : formulaire vérifié dans l'aperçu, aucun envoi réel (planche 05, écran 3) ──────────────────────────
  page("contact", "Contact", seo("Contactez-nous", "Une question, une demande ou un besoin d'accompagnement ? Écrivez-nous."), [
    ["hero", hero("peluches.webp", "", "Contactez-nous", "Une question, une demande ou un besoin d'accompagnement ? Écrivez-nous.", { focus_x: 66 })],
    ["form", S("contact-form", { eyebrow: "", heading: "Nous sommes là\npour vous répondre", text: p("Que ce soit pour une question sur votre commande, sur l'utilisation de NOCTIL ou pour toute autre demande, n'hésitez pas à nous écrire."), email: "", hours: "", response: "", show_phone: false, require_name: true, require_message: true, name_placeholder: "Votre nom", email_placeholder: "votre@email.com", message_placeholder: "Votre message…", order_field: true, order_placeholder: "Ex. NOCTIL-0001", subjects: "Ma commande\nUtilisation de NOCTIL\nLivraison et retours\nAutre demande", consent_text: "J'accepte que mes informations soient utilisées uniquement pour répondre à ma demande.", submit_label: "Envoyer mon message", inline_states: true, color_scheme: "scheme-1", padding_top: 40, padding_bottom: 32 })],
    ["aide", S("features-grid", { layout: "row", columns: 3, columns_mobile: "1", style: "cards", heading_align: "left", heading: "Besoin d'aide rapide ?", text: "", animation: "fade", color_scheme: "scheme-1", padding_top: 16, padding_bottom: 48 }, [
      { type: "feature", settings: { icon: "truck", title: "Suivre ma commande", text: p("Depuis votre espace client, retrouvez l'état de vos commandes."), link_label: "Voir ma commande", link: NOCTIL_PAGES.connexion } },
      { type: "feature", settings: { icon: "star", title: "Questions fréquentes", text: p("Les réponses aux questions les plus courantes."), link_label: "Voir la FAQ", link: NOCTIL_PAGES.faq } },
      { type: "feature", settings: { icon: "gift", title: "Livraison et retours", text: p("Les informations sur la livraison et les retours."), link_label: "Voir la page", link: NOCTIL_PAGES.livraison } },
    ])],
  ]);

  // ─── Livraison et retours : tout ce qui n'est pas connu reste « à confirmer » (planche 05, écran 4) ─────────────
  page("livraison-retours", "Livraison et retours", seo("Livraison et retours", "Les informations sur la livraison de votre commande et les modalités de retour."), [
    ["hero", hero("aide-planete.webp", "", "Livraison\net retours", "Retrouvez ici les informations sur la livraison de votre commande et les modalités de retour.", { focus_x: 80 })],
    ["infos", S("cv-specs", { layout: "cards", eyebrow: "", heading: "", heading_accent: "", text: p("Les informations de cette page sont des modalités générales à confirmer avant mise en ligne. Délais, frais et transporteurs seront précisés lors de la finalisation de la boutique."), note: "", animation: "fade", color_scheme: "scheme-1", padding_top: 36, padding_bottom: 24 }, [
      { type: "group", settings: { icon: "truck", title: "Livraison", text: p("Les modes de livraison disponibles sont indiqués lors de la validation de la commande."), rows: "Zones de livraison : À confirmer\nDélais : À confirmer\nFrais : À confirmer", open: true } },
      { type: "group", settings: { icon: "return", title: "Retours", text: p("Les conditions exactes de retour seront précisées dans les conditions générales de vente."), rows: "Délai de retour : À confirmer\nFrais de retour : À confirmer", open: true } },
      { type: "group", settings: { icon: "check", title: "Remboursements", text: p("Les modalités de remboursement seront précisées avant la mise en ligne."), rows: "Mode de remboursement : À confirmer\nDélai : À confirmer", open: true } },
    ])],
    ["etapes", S("cv-steps", { layout: "timeline", eyebrow: "", heading: "Comment faire une demande de retour ?", text: "", button_label: "", button_link: "", animation: "fade", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 24 }, [
      { type: "step", settings: { title: "Faites votre demande", text: p("Depuis votre compte ou via le formulaire de contact.") } },
      { type: "step", settings: { title: "Préparez votre colis", text: p("Suivez les instructions qui vous seront communiquées.") } },
      { type: "step", settings: { title: "Expédiez votre retour", text: p("Une fois votre colis expédié, vous serez tenu informé de son suivi.") } },
    ])],
    ["question", S("cv-banner", { layout: "image-left", image_asset: "", eyebrow: "", heading: "Une question sur la livraison\nou un retour ?", heading_tag: "h2", heading_accent: "", text: p("Notre équipe est à votre disposition pour vous accompagner."), price_text: "", price_note: "", button_label: "Nous contacter", button_link: NOCTIL_PAGES.contact, button_style: "solid", button_arrow: true, note: "", animation: "fade", color_scheme: "scheme-3", padding_top: 24, padding_bottom: 48 })],
  ]);

  // ─── Pages légales : modèles « à compléter », menu des quatre pages à gauche (planche 07) ────────────────────────
  const legal = (handle: string, title: string, file: string, parts: [string, string][]) => page(handle, title, seo(title, `${title} : modèle de démonstration à compléter et à valider.`), [
    ["hero", hero(file, "", title.replace(" de ", " de\n").replace("Politique des", "Politique des\n"), "Contenu juridique à compléter et à valider avant publication.", { band_height: "medium", focus_x: 70 })],
    ["texte", S("legal-page", { source: "blocks", show_title: false, eyebrow: "", heading: "", updated: "", intro: "", show_toc: false, pages_menu: "legal-pages", show_print: false, color_scheme: "scheme-1", padding_top: 40, padding_bottom: 56 }, parts.map(([t, x], i) => ({ type: "part", settings: { title: `${i + 1}. ${t}`, text: p(x) } })))],
  ]);
  spec.store.menus["legal-pages"] = { title: "Pages légales", links: [{ title: "Mentions légales", url: NOCTIL_PAGES.mentions }, { title: "Conditions générales de vente", url: NOCTIL_PAGES.cgv }, { title: "Politique de confidentialité", url: NOCTIL_PAGES.confidentialite }, { title: "Politique des cookies", url: NOCTIL_PAGES.cookies }] };
  legal("mentions-legales", "Mentions légales", "bibliotheque.webp", [
    ["Éditeur du site", "Nom de la société : [À renseigner]<br>Forme juridique : [À renseigner]<br>Siège social : [À renseigner]<br>Numéro SIREN : [À renseigner]<br>Capital social : [À renseigner]<br>TVA intracommunautaire : [À renseigner]<br>Contact : [À renseigner]"],
    ["Directeur de la publication", "[À renseigner]"],
    ["Hébergement", "Hébergeur : [À renseigner]<br>Adresse : [À renseigner]"],
    ["Propriété intellectuelle", "[À compléter et valider avant publication]"],
  ]);
  legal("cgv", "Conditions générales de vente", "hero-chambre.webp", [
    ["Objet", "Les présentes conditions générales de vente (CGV) ont pour objet de définir les modalités de vente des produits proposés sur le site NOCTIL. [Contenu à compléter et valider avant publication]"],
    ["Produits", "Les caractéristiques essentielles des produits sont présentées sur leurs fiches. [Contenu à compléter et valider avant publication]"],
    ["Prix", "Le prix de 69 € affiché sur ce site est un prix de démonstration. [Devise, mention TTC et frais éventuels : à compléter et valider avant publication]"],
    ["Commande", "[Étapes de la commande et de sa validation : à compléter et valider avant publication]"],
    ["Paiement", "[Moyens de paiement acceptés : à compléter et valider avant publication]"],
    ["Livraison", "[Zones, délais et frais : à compléter et valider avant publication]"],
    ["Rétractation et retours", "[Délai et modalités : à compléter et valider avant publication]"],
    ["Garanties légales", "[À compléter et valider avant publication]"],
  ]);
  legal("confidentialite", "Politique de confidentialité", "peluches.webp", [
    ["Données collectées", "[Catégories de données collectées : à compléter et valider avant publication]"],
    ["Finalités du traitement", "[Finalités (gestion des commandes, du compte, service client) : à compléter et valider avant publication]"],
    ["Durée de conservation", "[À compléter et valider avant publication]"],
    ["Vos droits", "[Droits d'accès, de rectification, d'effacement et modalités d'exercice : à compléter et valider avant publication]"],
    ["Cookies", "Vos choix se modifient à tout moment depuis le lien « Gérer les cookies » du pied de page. Le détail figure dans la politique des cookies."],
    ["Contact", "[Coordonnées du responsable du traitement : à compléter et valider avant publication]"],
  ]);
  legal("politique-cookies", "Politique des cookies", "projecteur-chambre.webp", [
    ["Qu'est-ce qu'un cookie ?", "Un cookie est un petit fichier enregistré sur votre appareil lors de la visite d'un site. [Contenu à compléter et valider avant publication]"],
    ["Types de cookies utilisés", "Cookies strictement nécessaires : essentiels au bon fonctionnement du site.<br>Cookies de mesure d'audience : nous aident à comprendre l'utilisation du site (désactivés par défaut).<br>Cookies de personnalisation : permettent d'adapter le contenu (désactivés par défaut).<br>[Liste exacte des cookies : à compléter et valider avant publication]"],
    ["Gestion de vos préférences", "Vous pouvez modifier vos choix à tout moment depuis le lien « Gérer les cookies » du pied de page, ou dans les paramètres de votre navigateur."],
  ]);

  // ─── Exemple de commande et de confirmation (planche 03, écrans 4 et 5) : aucun paiement, champs désactivés. ────
  const orderLines = [{ type: "line", settings: { product: NOCTIL_HANDLE, variant_label: "", quantity: 1 } }];
  page("finaliser-la-commande", "Finaliser la commande", seo("Finaliser la commande (exemple)", "Exemple de commande de la boutique de démonstration : rien n'est envoyé ni payé."), [["order", S("demo-order", { layout: "checkout", eyebrow: "Exemple de démonstration", heading: "Finaliser la commande", text: p("Renseignez vos informations pour recevoir votre projecteur."), button_label: "Voir l'exemple de confirmation", button_link: NOCTIL_PAGES.confirmation, button_note: "Simulation de commande : aucun paiement réel ne sera effectué.", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 56 }, orderLines)]]);
  page("confirmation-de-commande", "Confirmation de commande", seo("Confirmation (exemple)", "Exemple de confirmation de la boutique de démonstration : aucune commande réelle."), [["order", S("demo-order", { ...k.img("hero-chambre.webp"), focus_x: 50, focus_y: 40, layout: "confirmation", eyebrow: "Exemple de confirmation", heading: "Merci pour votre commande !", text: p("Dans une vraie boutique, la confirmation et l'e-mail de commande sont envoyés par Shopify après le paiement. Ici, aucune commande n'a été passée."), button_label: "Voir l'exemple de commande", button_link: NOCTIL_PAGES.commande, summary_title: "Récapitulatif", color_scheme: "scheme-1", padding_top: 32, padding_bottom: 56 }, orderLines)]]);

  // ─── Espace client (planche 06) : écrans d'exemple reliés entre eux, aucune donnée envoyée ───────────────────────
  const links = { recover_link: NOCTIL_PAGES.motDePasse, account_link: NOCTIL_PAGES.compte, order_link: NOCTIL_PAGES.commande, addresses_link: NOCTIL_PAGES.infos, infos_link: NOCTIL_PAGES.infos, logout_link: NOCTIL_PAGES.connexion, overview_label: "Aperçu", orders_label: "Commandes", infos_label: "Informations", order_title: "Commande NOCTIL-0001", pill: "Données de démonstration" };
  const lines = [{ type: "line", settings: { product: NOCTIL_HANDLE, quantity: 1 } }];
  const account = (handle: string, title: string, settings: Record<string, unknown>, blocks: { type: string; settings: Record<string, unknown> }[] = []) => page(handle, title, seo(title, `${title} : écran d'exemple de la boutique de démonstration.`), [["compte", S("demo-account", { ...links, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 56, ...settings }, blocks)]]);
  account("connexion", "Connexion", { ...k.img("chambre-fusee.webp"), focus_x: 70, focus_y: 50, layout: "login", heading: "Heureux de vous\nretrouver", text: p("Accédez à votre espace pour suivre vos commandes et gérer vos informations."), button_label: "Se connecter", button_link: NOCTIL_PAGES.compte, secondary_label: "Créer mon compte", secondary_link: NOCTIL_PAGES.inscription });
  account("creer-un-compte", "Créer un compte", { ...k.img("projecteur-chambre.webp"), focus_x: 70, focus_y: 50, layout: "register", heading: "Créer mon compte", text: p("Rejoignez l'univers NOCTIL et gérez facilement vos commandes."), button_label: "Créer mon compte", button_link: NOCTIL_PAGES.compte, secondary_label: "J'ai déjà un compte", secondary_link: NOCTIL_PAGES.connexion });
  account("mot-de-passe-oublie", "Mot de passe oublié", { ...k.img("peluches.webp"), focus_x: 66, focus_y: 50, layout: "recover", heading: "Mot de passe oublié ?", text: p("Saisissez votre adresse e-mail : sur une vraie boutique, vous recevriez un lien pour le réinitialiser."), button_label: "Retour à la connexion", button_link: NOCTIL_PAGES.connexion, secondary_label: "", secondary_link: "" });
  account("mon-compte", "Mon compte", { layout: "account", heading: "Bonjour !", text: p("Bienvenue dans votre espace personnel. Retrouvez ici vos commandes et vos informations."), orders_label: "Commandes", empty_text: "" }, [
    ...lines,
    { type: "card", settings: { style: "promo", icon: "none", title: "Le projecteur qui fait briller leurs rêves", text: "", button_label: "Découvrir notre univers", button_link: NOCTIL_PAGES.univers, ...k.img("projecteur-detoure.png") } },
    { type: "card", settings: { style: "plain", icon: "pin", title: "Mon adresse principale", text: p("Aucune adresse enregistrée dans cette démonstration."), button_label: "Ajouter une adresse", button_link: NOCTIL_PAGES.infos, image_asset: "" } },
  ]);
  account("commande-noctil-0001", "Commande NOCTIL-0001", { layout: "order", heading: "Commande NOCTIL-0001", text: p("Exemple de commande : rien n'a été acheté ni expédié."), back_label: "", demo_note: "Cette page est une maquette de démonstration : aucune commande ni aucun envoi réel." }, [
    ...lines,
    { type: "card", settings: { style: "plain", icon: "file", title: "Facture", text: p("Sur une vraie boutique, la facture de la commande se retrouve ici. Aucune facture n'existe dans cette démonstration."), button_label: "", button_link: "", image_asset: "" } },
    { type: "card", settings: { style: "plain", icon: "help", title: "Besoin d'aide ?", text: p("Contactez notre équipe pour toute question concernant votre commande."), button_label: "Nous contacter", button_link: NOCTIL_PAGES.contact, image_asset: "" } },
  ]);
  account("mes-informations", "Mes informations", { layout: "infos", heading: "Mes informations", text: "" }, [
    { type: "card", settings: { style: "plain", icon: "pin", title: "Mes adresses", text: p("Aucune adresse enregistrée dans cette démonstration."), button_label: "", button_link: "", image_asset: "" } },
  ]);

  // ─── Page introuvable (planche 07) ─────────────────────────────────────────────────────────────────────────────
  const nf = spec.templates["404"];
  if (nf) for (const sec of Object.values(nf.sections)) if (sec.type === "main-404") sec.settings = { ...sec.settings, heading: "Cette étoile semble introuvable", text: "La page que vous cherchez n'existe pas ou a été déplacée dans une autre galaxie.", illustration: "star", ...k.img("peluches.webp"), button_label: "Retour à l'accueil", button_link: "/", color_scheme: "scheme-2" };
}
