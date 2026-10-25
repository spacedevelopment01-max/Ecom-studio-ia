/**
 * ONDE refait d'après les sept planches du 24 octobre (PR #183, docs/theme-briefs/onde/) : thème **mono-produit de la
 * famille E-commerce** (casque ONDE Graphite & lime), profil de conversion « onde » (assets/onde.css, onde.js, sections
 * « on-* »), titres Montserrat 700, textes Inter, graphite, gris clair, blanc et lime.
 *
 * Même chaîne que les autres démonstrations : un projet client (marque, produit, médias avec rôles) composé par le VRAI
 * moteur (composeShop), puis rédigé page par page dans l'ordre des planches ; chaque bloc reste une section modifiable.
 *
 * Médias : lus sur place dans le kit privé de Thomas (`public/demo/onde/`, hors dépôt, jamais copiés) : les 20
 * compléments recréés du dossier (c01–c20, deux détourages à transparence réelle) et deux originaux du kit pour les gros
 * plans sombres que seuls ces originaux montrent (« Au plus près du son », « La bonne information »). Le logo des
 * planches est celui de logo-proposition.png (O ouvert et éclair lime, « AUDIO » espacé) : vectorisé, en version claire
 * (cadre graphite, pieds graphite) et foncée (pied lime, menu mobile).
 *
 * Rien n'est inventé : connectivité, autonomie, réduction de bruit, poids, délais, frais, retours et garantie restent
 * « à confirmer » ; aucun avis, aucune promotion, aucune « livraison gratuite ». Prix illustratif centralisé (ONDE_PRICE,
 * 149 €) et annoncé comme tel ; la livraison est « calculée à l'étape suivante », jamais un total final. Commande,
 * paiement, confirmation, contact et suivi : démonstration sans envoi, sans débit, sans donnée bancaire.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { buildKitProject, p, type Brand, type Kit, type Media } from "./noctil-traverse-fixtures";
import { vectorizeLogo } from "./lot2c-logo";
import type { SectionInstance, StoreProduct, TemplateJson } from "../src/lib/theme/spec";

export const ONDE_PROVENANCE = "PR #183 (24 octobre 2026) — sept planches ordinateur et mobile, 20 compléments recréés et 2 originaux du kit privé de Thomas (objets seuls, aucune personne), prix illustratif, aucun paiement";
export const ONDE_HANDLE = "casque-onde";
/** Prix illustratif des planches (centimes) : 1 casque = 149 € de sous-total, 2 = 298 €. Jamais le prix d'un client. */
export const ONDE_PRICE = 14900;
export const ONDE_PRICE_NOTE = "Prix illustratif de démonstration";
/** Kit privé de Thomas : lu sur place, jamais publié. */
export const ONDE_KIT_DIR = path.join(process.cwd(), "public", "demo", "onde");

/** Médias : ordre d'import = rôles du thème ; textes alternatifs fidèles aux pixels. */
export const ONDE_MEDIA: Media[] = [
  { file: "logo-fonce.webp", role: "logo", alt: "ONDE Audio" },
  { file: "logo.webp", role: "logo", alt: "ONDE Audio" },
  { file: "logo-mot.webp", role: "detail", alt: "ONDE" },
  { file: "logo-contour.png", role: "detail", alt: "" },
  { file: "logo-contour-lime.png", role: "detail", alt: "" },
  { file: "c01-casque-detoure-trois-quarts.webp", role: "packshot", alt: "Casque ONDE graphite de trois quarts, détouré : arceau, coussinets noirs et liserés lime." },
  { file: "c02-casque-detoure-profil.webp", role: "packshot", alt: "Casque ONDE graphite de profil, détouré, liseré lime sur l'écouteur." },
  { file: "c03-produit-fond-clair.webp", role: "packshot", alt: "Casque ONDE graphite posé sur un socle blanc, devant des anneaux clairs." },
  { file: "c04-accueil-grande-ouverture.webp", role: "hero", alt: "Casque ONDE graphite et lime sur fond noir, entouré d'anneaux de lumière verte." },
  { file: "c05-detail-coussinet.webp", role: "detail", alt: "Gros plan d'un coussinet noir en tissu et du liseré lime de l'écouteur." },
  { file: "c06-detail-arceau.webp", role: "detail", alt: "Gros plan de l'arceau graphite rembourré et de sa touche lime." },
  { file: "c07-detail-commandes.webp", role: "detail", alt: "Gros plan du coulisseau de l'arceau, de son repère lime et de l'écouteur." },
  { file: "c08-detail-finition.webp", role: "detail", alt: "Gros plan de l'écouteur graphite mat cerclé d'un liseré lime." },
  { file: "c09-scene-maison.webp", role: "scene", alt: "Casque ONDE posé sur une table en marbre noir, dans un salon lumineux." },
  { file: "c10-scene-deplacement-train.webp", role: "scene", alt: "Casque ONDE posé sur la tablette d'un train, campagne derrière la fenêtre." },
  { file: "c11-scene-studio.webp", role: "scene", alt: "Casque ONDE sur un support, devant une table de mixage éclairée." },
  { file: "c12-journal-bureau-parenthese.webp", role: "scene", alt: "Casque ONDE posé sur un bureau en bois, une lampe allumée en arrière-plan." },
  { file: "c13-boutique-sous-tous-les-angles.webp", role: "scene", alt: "Casque ONDE debout sur une table en marbre, paysage de collines derrière la baie vitrée." },
  { file: "c14-experience-entrez-dans-votre-bulle.webp", role: "banner", alt: "Casque ONDE de face sur fond noir, entouré d'anneaux et d'une onde sonore verts." },
  { file: "c15-experience-contact-matiere.webp", role: "detail", alt: "Gros plan des coussinets noirs en tissu et de l'arceau du casque ONDE." },
  { file: "c16-marque-propre-frequence.webp", role: "lifestyle", alt: "Casque ONDE sur fond gris clair, traversé de lignes d'onde vertes." },
  { file: "c17-journal-moment-ecoute.webp", role: "scene", alt: "Casque ONDE sur une table en bois près d'un carnet et d'une tasse, lampe chaude en arrière-plan." },
  { file: "c18-journal-details-ligne.webp", role: "detail", alt: "Gros plan de l'arceau et des écouteurs graphite cerclés de lime." },
  { file: "c19-journal-entretien-coussinets.webp", role: "scene", alt: "Casque ONDE posé sur une table en bois à côté d'un chiffon gris." },
  { file: "c20-journal-casque-quotidien.webp", role: "scene", alt: "Casque ONDE à plat sur une table en marbre noir, dans un salon." },
  { file: "04-detail-coussinet.webp", role: "detail", alt: "Gros plan sombre d'un coussinet noir en tissu et du liseré lime." },
  { file: "05-detail-arceau.webp", role: "detail", alt: "Gros plan sombre de l'arceau graphite et de sa touche lime." },
];
/** Originaux du kit gardés en réserve (non montrés) : scènes et vues de l'ancienne direction, différentes des planches. */
export const ONDE_RESERVE = ["01-hero.webp", "02-fond-clair.webp", "03-autre-angle.webp", "06-banniere.webp", "07-scene-salon.webp", "08-scene-train.webp", "09-scene-studio.webp"];

const BRAND: Brand = {
  name: "ONDE Audio", product: "Le casque ONDE", category: "Casque audio",
  summary: "Casque sans fil graphite mat, coussinets noirs en tissu, liserés et repères lime : un seul coloris, Graphite & lime.",
  facts: [["Coloris", "Graphite & lime"], ["Coussinets", "Noirs, en tissu"], ["Repères", "Liserés et touches lime"]],
  tagline: "Votre monde. Votre fréquence.",
  story: "ONDE AUDIO imagine un seul casque, graphite et lime, pour accompagner chaque moment d'écoute : à la maison, en déplacement, au studio.",
  positioning: "Un casque unique, sobre et graphique, pour tous vos moments d'écoute.",
  // Lime, graphite, panneau, gris clair et blanc relevés sur les planches 01 à 07.
  palette: { primary: "#C2F94A", secondary: "#121413", accent: "#C2F94A", light: "#F1F2F1", dark: "#0B0D0C" },
};

/** Médias de la démonstration : les WebP du kit tels quels, le logo vectorisé en version claire et foncée. */
async function prepareMedia(): Promise<string> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "onde-kit-"));
  for (const m of ONDE_MEDIA) {
    if (m.role === "logo") continue;
    const source = path.join(ONDE_KIT_DIR, m.file);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(dir, m.file));
  }
  const png = path.join(ONDE_KIT_DIR, "logo-proposition.png");
  if (fs.existsSync(png)) {
    const logo = await vectorizeLogo(fs.readFileSync(png), [{ name: "graphite", hex: "#1C1C1C" }, { name: "lime", hex: "#5EC417" }], [0, 0, 0.235, 1]);
    // Couleurs des planches : lettres blanches et éclair lime sur graphite ; lettres et éclair graphite sur lime.
    const recolor = (svg: string, fills: string[]) => { let n = 0; return svg.replace(/fill="#[0-9a-fA-F]{6}"/g, () => `fill="${fills[Math.min(n++, fills.length - 1)]}"`); };
    await sharp(Buffer.from(recolor(logo.color, ["#FDFDFD", "#C2F94A"])), { density: 300 }).resize({ width: 1200 }).webp({ quality: 92 }).toFile(path.join(dir, "logo.webp"));
    await sharp(Buffer.from(recolor(logo.color, ["#0B0D0C", "#0B0D0C"])), { density: 300 }).resize({ width: 1200 }).webp({ quality: 92 }).toFile(path.join(dir, "logo-fonce.webp"));
    // Grand logo du pied graphite (planche 01) : le mot ONDE seul, sans la ligne « AUDIO » (même tracé, rogné au-dessus).
    const word = await vectorizeLogo(await sharp(fs.readFileSync(png)).extract({ left: 0, top: 0, width: 2073, height: 549 }).png().toBuffer(), [{ name: "graphite", hex: "#1C1C1C" }, { name: "lime", hex: "#5EC417" }], [0, 0, 0.235, 1]);
    await sharp(Buffer.from(recolor(word.color, ["#FDFDFD", "#C2F94A"])), { density: 300 }).resize({ width: 1200 }).webp({ quality: 92 }).toFile(path.join(dir, "logo-mot.webp"));
    // Grand mot en contour des planches (accueil, marque) : le tracé du logo, sans remplissage ; éclair gris ou lime.
    const outline = (spark: string) => { let n = 0; return word.color.replace(/fill="#[0-9a-fA-F]{6}"/g, () => (n++ === 0 ? 'fill="none" stroke="#0B0D0C" stroke-opacity="0.2" stroke-width="3"' : `fill="${spark}"`)); };
    await sharp(Buffer.from(outline("#D5D8D6")), { density: 300 }).resize({ width: 1600 }).png().toFile(path.join(dir, "logo-contour.png"));
    await sharp(Buffer.from(outline("#7CD93A")), { density: 300 }).resize({ width: 1600 }).png().toFile(path.join(dir, "logo-contour-lime.png"));
  }
  return dir;
}

export async function ondeProject(userId: string) {
  const mediaDir = await prepareMedia();
  try {
    return await buildKitProject(userId, { id: "onde", media: ONDE_MEDIA, handle: ONDE_HANDLE, brand: BRAND, themeName: "Onde", provenance: ONDE_PROVENANCE, storeKind: "catalog", sector: "maison", storeType: "mono", mediaDir }, curateOnde);
  } finally {
    fs.rmSync(mediaDir, { recursive: true, force: true });
  }
}

/** Pages de la démonstration (liens du menu, du pied et des sections). */
export const ONDE_PAGES = {
  casque: `/products/${ONDE_HANDLE}`, boutique: "/collections/all", experience: "/pages/l-experience", marque: "/pages/la-marque", journal: "/pages/journal",
  faq: "/pages/faq", contact: "/pages/contact", livraison: "/pages/livraison-retours", suivi: "/pages/suivi-de-commande", commande: "/pages/commande",
  confirmation: "/pages/confirmation", mentions: "/pages/mentions-legales", cgv: "/pages/conditions-de-vente", confidentialite: "/pages/confidentialite", cookies: "/pages/cookies",
};

/** Journal (planche 02, « Journal ») : cinq articles, chacun sa page et son sujet ; conseils d'usage et de rangement,
 * aucune donnée technique ni promesse de durée. */
type Article = { handle: string; title: string; tag: string; image: string; excerpt: string; intro: string; parts: [string, string][] };
export const ONDE_ARTICLES: Article[] = [
  { handle: "creer-son-moment-d-ecoute", title: "Créer son moment d'écoute", tag: "Écoute", image: "c17-journal-moment-ecoute.webp",
    excerpt: "Des espaces, des rituels et des idées pour faire plus de place à la musique dans votre quotidien.",
    intro: "Un moment d'écoute ne demande ni grande pièce ni matériel en plus : un endroit, un horaire, et l'envie d'y revenir.",
    parts: [
      ["Choisir un endroit", "Un fauteuil près d'une fenêtre, un coin de bureau, une table de cuisine après le dîner : l'important est de pouvoir s'y poser sans être dérangé. Gardez le casque à portée de main, au même endroit, pour qu'il devienne un repère."],
      ["Choisir un moment", "Le début de la matinée, la pause de midi, le retour du soir : un créneau régulier, même court, aide à faire de l'écoute un rendez-vous plutôt qu'un fond sonore."],
      ["Préparer ce qu'on va écouter", "Un album entier plutôt qu'une lecture aléatoire, une liste préparée la veille, un podcast que l'on gardait pour plus tard : décider avant de s'installer laisse toute la place à l'écoute."],
    ] },
  { handle: "le-casque-au-quotidien", title: "Le casque au quotidien", tag: "Écoute", image: "c20-journal-casque-quotidien.webp",
    excerpt: "Comment le ONDE s'intègre naturellement dans vos journées.",
    intro: "Du salon au train, puis au bureau : quelques habitudes simples pour garder le casque avec vous sans y penser.",
    parts: [
      ["Le matin", "Posé près de vos clés ou de votre sac, il part avec vous sans être oublié. Un emplacement fixe dans l'entrée suffit."],
      ["En déplacement", "Dans le train ou le bus, le graphite mat reste discret ; les repères lime vous aident à le retrouver d'un coup d'œil dans un sac."],
      ["Le soir", "Rangé au même endroit, il est prêt pour le lendemain. Les informations de charge et d'autonomie seront précisées avec la notice du fabricant (à ajouter)."],
    ] },
  { handle: "les-details-qui-changent-la-ligne", title: "Les détails qui changent la ligne", tag: "Design", image: "c18-journal-details-ligne.webp",
    excerpt: "Un design pensé pour durer, dans chaque détail.",
    intro: "Graphite mat, coussinets noirs, un fil lime : le dessin du ONDE tient en peu d'éléments, et chacun a sa place.",
    parts: [
      ["Le graphite mat", "Une seule teinte pour l'arceau et les écouteurs : la silhouette reste sobre, quel que soit l'endroit où le casque est posé."],
      ["Le liseré lime", "Un fil de couleur cerne chaque écouteur et marque les repères de l'arceau. Il signe le casque sans le surcharger."],
      ["Les coussinets en tissu", "Leur tissu noir répond au graphite de la coque ; leur texture se voit de près, comme sur les gros plans de la fiche."],
    ] },
  { handle: "prendre-soin-des-coussinets", title: "Prendre soin des coussinets", tag: "Entretien", image: "c19-journal-entretien-coussinets.webp",
    excerpt: "Nos conseils pour les garder comme au premier jour.",
    intro: "Quelques gestes simples aident à garder les coussinets propres. Les consignes du fabricant, à suivre en priorité, seront ajoutées avec la notice.",
    parts: [
      ["Après l'écoute", "Laissez le casque à l'air libre quelques minutes avant de le ranger, plutôt que de l'enfermer aussitôt dans un sac."],
      ["Le nettoyage", "Un chiffon doux et sec suffit pour retirer la poussière. Évitez de mouiller le tissu tant que la notice ne précise pas les produits adaptés."],
      ["Le rangement", "Posé à plat ou sur un support, à l'abri de la chaleur directe : les coussinets gardent leur forme."],
    ] },
  { handle: "un-bureau-une-parenthese", title: "Un bureau, une parenthèse", tag: "Écoute", image: "c12-journal-bureau-parenthese.webp",
    excerpt: "Des idées pour créer un espace d'écoute qui vous ressemble.",
    intro: "Au bureau ou à la maison, quelques minutes de musique entre deux tâches suffisent à marquer une pause.",
    parts: [
      ["Un coin rien qu'à vous", "Une lampe, une tasse, le casque posé au bord du bureau : un petit décor qui signale que la pause commence."],
      ["Une durée choisie", "Le temps d'un morceau, d'une face d'album ou d'un épisode : une pause qui a un début et une fin se prend plus facilement."],
      ["Revenir au travail", "Reposez le casque au même endroit en reprenant : il sera là pour la prochaine parenthèse."],
    ] },
];

/** Questions de la page FAQ (planches 03 et 07) : thème, question, réponse. Aucune donnée technique inventée. */
export const ONDE_FAQ: [string, string, string][] = [
  ["Casque", "Où trouver la notice ?", "<strong>Notice à ajouter.</strong> La notice d'utilisation du fabricant n'est pas encore fournie : elle sera proposée ici, en téléchargement, dès qu'elle sera disponible."],
  ["Casque", "Comment utiliser les commandes ?", "Les commandes se repèrent à leurs touches et liserés lime. Leur fonctionnement détaillé sera décrit dans la notice (à ajouter)."],
  ["Casque", "Comment entretenir les coussinets ?", "Un chiffon doux et sec retire la poussière ; nos conseils généraux sont dans l'article « Prendre soin des coussinets » du journal. Les consignes du fabricant seront ajoutées avec la notice."],
  ["Casque", "Comment ranger mon casque ?", "À plat ou sur un support, à l'abri de la chaleur directe. Housse ou étui fournis : à confirmer."],
  ["Utilisation", "Comment se connecte-t-il ?", "Connexion sans fil : à confirmer. Les compatibilités et la procédure d'appairage seront précisées avec la notice."],
  ["Utilisation", "Quelle est son autonomie ?", "À confirmer : l'autonomie et le temps de charge ne sont pas encore renseignés."],
  ["Commande", "Comment suivre ma commande ?", "Depuis la page « Suivi de commande », avec le numéro de commande et l'e-mail utilisés lors de l'achat."],
  ["Commande", "Comment vous contacter ?", "Par le formulaire de la page Contact : choisissez un sujet et décrivez votre demande."],
  ["Livraison", "Où consulter les frais de livraison ?", "Les frais et les délais sont calculés à l'étape de livraison de la commande. Conditions à compléter avant la mise en ligne."],
  ["Livraison", "Comment demander un retour ?", "Écrivez-nous depuis la page Contact : nous vous transmettrons la procédure. Conditions de retour à compléter avant la mise en ligne."],
];
const HOME_FAQ: [string, string][] = [
  ["Où trouver la notice ?", ONDE_FAQ[0][2]],
  ["Comment entretenir le casque ?", ONDE_FAQ[2][2]],
  ["Quelle est la politique de retour ?", ONDE_FAQ[9][2]],
  ["Comment suivre ma commande ?", ONDE_FAQ[6][2]],
];

function curateOnde(k: Kit) {
  const { spec, img, section } = k;
  const P = ONDE_PAGES;
  const a = (file: string) => k.name(file);
  k.demoMeta();
  spec.store.seo = { title: "ONDE AUDIO | Votre monde. Votre fréquence.", description: "Le casque ONDE, graphite et lime : un son qui vous suit partout. Boutique de démonstration, prix illustratif, aucun paiement." };

  // ─── Le produit : un seul casque, une finition (Graphite & lime), prix illustratif centralisé. ───────────────────
  const product: StoreProduct = {
    ...spec.store.product, contentTarget: "product:main", handle: ONDE_HANDLE, title: "Le casque ONDE", vendor: "ONDE AUDIO",
    price: ONDE_PRICE, compare_at_price: null, currency: "EUR", options: ["Couleur"],
    variants: [{ title: "Graphite & lime", options: ["Graphite & lime"], price: ONDE_PRICE, available: true }],
    description_html: p("Un casque sans fil graphite mat, aux coussinets noirs en tissu et aux liserés lime. Un seul coloris : Graphite & lime.") + p("Connectivité, autonomie, réduction de bruit, poids et contenu de la boîte : à confirmer avec la fiche technique du fabricant."),
    images: ["c03-produit-fond-clair.webp", "c02-casque-detoure-profil.webp", "c05-detail-coussinet.webp", "c06-detail-arceau.webp", "c10-scene-deplacement-train.webp", "c08-detail-finition.webp"].map(k.name),
    tags: ["casque", "graphite", "lime"],
    seo: { title: "Le casque ONDE, Graphite & lime | ONDE AUDIO", description: "Le casque ONDE graphite et lime : vues, détails de l'arceau, des coussinets, des commandes et de la finition. Prix illustratif de démonstration." },
  };
  spec.store.product = product;
  spec.store.products = [];
  spec.store.collections = [{ handle: "all", title: "La boutique", description: "Une seule ONDE. Tous vos moments. Le casque ONDE Graphite & lime, ses vues et ses usages ; prix illustratif de démonstration.", products: [ONDE_HANDLE] }];
  spec.settings = { ...spec.settings, price_trim_zeros: true, card_price_note: "", cart_type: "drawer", cart_heading: "Mon panier", cart_checkout_label: "Passer commande", cart_empty_title: "Votre panier attend sa première ONDE." };

  const S = (type: string, settings: Record<string, unknown>, blocks: { type: string; settings: Record<string, unknown>; hidden?: boolean }[] = []) => section(type, settings, blocks);
  const tpl = (rows: SectionInstance[], prefix: string): TemplateJson => ({ order: rows.map((_, i) => `${prefix}_${i}`), sections: Object.fromEntries(rows.map((r, i) => [`${prefix}_${i}`, r])) });
  const page = (handle: string, title: string, description: string, rows: SectionInstance[]) => {
    spec.store.pages.push({ handle, title, template_suffix: handle, body_html: "", seo: { title: `${title} | ONDE AUDIO`, description } });
    spec.templates[`page.${handle}`] = tpl(rows, handle.replace(/[^a-z0-9]/g, "_"));
  };
  const banner = (settings: Record<string, unknown>, blocks: { type: string; settings: Record<string, unknown> }[] = []) => S("on-banner", { product: ONDE_HANDLE, image_loading: "lazy", ...settings }, blocks);
  const card = (file: string, title: string, text = "", extra: Record<string, unknown> = {}) => ({ type: "card", settings: { ...img(file), title, text, ...extra } });
  const newsletter = (extra: Record<string, unknown> = {}) => S("on-newsletter", { layout: "row", tone: "lime", heading: "Restez sur la même fréquence.", text: "Recevez nos inspirations, nos nouveautés et nos histoires autour du son.", placeholder: "Votre adresse e-mail", button_label: "", submit_label: "S'inscrire", title_size: 30, mobile_title_size: 20, padding_top: 22, padding_bottom: 22, ...extra });
  const posts = (list: Article[], extra: (a: Article, i: number) => Record<string, unknown> = () => ({})) => list.map((x, i) => ({ type: "article", settings: { ...img(x.image), tag: x.tag, title: x.title, text: x.excerpt, link: `/pages/${x.handle}`, ...extra(x, i) } }));

  // ─── 01 Accueil (planches 01 et 05). ──────────────────────────────────────────────────────────────────────────
  spec.templates.index = tpl([
    banner({ layout: "split", tone: "dark", ...img("c04-accueil-grande-ouverture.webp"), image_loading: "eager", image_side: "right", image_width: 50, image_zoom: 138, mobile_image_zoom: 122, focus_x: 50, focus_y: 50, mobile_focus_x: 50, mobile_focus_y: 50,
      heading: "Votre monde.\nVotre fréquence.", heading_tag: "h1", text: p("Un son qui vous suit partout,<br>sans rien perdre de l'essentiel."), button_label: "Entrer dans ONDE", mobile_button_label: "Découvrir le casque", button_link: P.casque, button_style: "lime", button_icon: "arrow-up-right",
      meta: "Casque sans fil   /   Graphite", footer_line: "Écouter autrement", wave: "bottom", min_height: 666, mobile_min_height: 690, title_size: 74, mobile_title_size: 40, text_width: 640, mobile_order: "image-first", padding_top: 192, padding_bottom: 0 }),
    banner({ layout: "wordmark", tone: "light", wordmark: "ONDE", wordmark_asset: a("logo-contour.png"), cutout_asset: a("c01-casque-detoure-trois-quarts.webp"), mobile_cutout_asset: a("c03-produit-fond-clair.webp"), cutout_alt: "Casque ONDE graphite et lime de trois quarts.", cutout_x: 84, cutout_y: 148, cutout_width: 67, mobile_cutout_x: 50, mobile_cutout_y: 42, mobile_cutout_width: 100, cutout_overflow: true,
      show_price: true, product_name: "Le casque ONDE", card_link_label: "Découvrir", button_label: "Découvrir le casque", button_link: P.casque, button_style: "lime", min_height: 279, mobile_min_height: 600, title_size: 40, mobile_title_size: 26, padding_top: 0, padding_bottom: 0, heading: "" }),
    banner({ layout: "split", tone: "lime", mobile_image_asset: a("04-detail-coussinet.webp"), mobile_focus_x: 80, mobile_focus_y: 20, mobile_image_zoom: 100, heading: "Écoutez.\nPosez.\nRepartez.", text_beside: true, text: p("Le même son, où que vous soyez.<br>Un casque pensé pour s'intégrer<br>à tous vos moments."), wave: "behind", min_height: 364, mobile_min_height: 0, title_size: 100, mobile_title_size: 50, text_width: 1100, padding_top: 0, padding_bottom: 0 }),
    S("on-cards", { layout: "details", tone: "dark", heading: "Le détail fait\nla différence.", text: p("Des matières soigneusement choisies.<br>Un design précis et intemporel.<br>Chaque élément a son rôle."), button_label: "Découvrir le casque", button_link: P.casque, button_style: "outline-light", columns: 3, card_height: 250, mobile_card_height: 150, side_width: 330, gap: 18, title_size: 44, mobile_title_size: 30, mobile_layout: "rows", card_arrow: false, padding_top: 30, padding_bottom: 26 }, [
      card("04-detail-coussinet.webp", "La matière", "Un tissu doux et résistant,\npour un confort durable.", { focus_x: 30, focus_y: 40 }),
      card("04-detail-coussinet.webp", "La ligne", "Une silhouette épurée,\nsoulignée par une touche de vert.", { focus_x: 92, focus_y: 50, zoom: 190 }),
      card("05-detail-arceau.webp", "Le contact", "Un arceau ajusté,\npensé pour le quotidien.", { focus_x: 55, focus_y: 35 }),
    ]),
    S("on-cards", { layout: "scenes", tone: "dark", title_top: true, heading: "Chez vous.\nAilleurs.\nÀ votre rythme.", text: "", columns: 3, card_height: 291, mobile_card_height: 236, gap: 0, title_size: 30, mobile_title_size: 26, mobile_layout: "carousel", card_arrow: true, padding_top: 0, padding_bottom: 0 }, [
      card("c09-scene-maison.webp", "Chez vous.", "Un son pour vous.", { link: P.experience }),
      card("c10-scene-deplacement-train.webp", "Ailleurs.", "Le même confort.", { link: P.experience }),
      card("c11-scene-studio.webp", "À votre rythme.", "Toujours avec vous.", { link: P.experience }),
    ]),
    banner({ layout: "orbit", tone: "white", heading: "L'expérience ONDE", text: p("Plus qu'un casque, une nouvelle façon d'être à l'écoute.<br>ONDE vous accompagne dans vos espaces, vos idées<br>et vos rythmes. Un design au service de ce qui compte :<br>votre expérience d'écoute."), button_label: "Explorer les détails", button_link: P.experience, button_style: "outline", min_height: 330, mobile_min_height: 520, title_size: 34, mobile_title_size: 26, text_width: 460, padding_top: 0, padding_bottom: 0 }, [
      { type: "image", settings: { image_asset: a("04-detail-coussinet.webp") } },
      { type: "image", settings: { image_asset: a("c01-casque-detoure-trois-quarts.webp") } },
      { type: "image", settings: { image_asset: "" } },
    ]),
    S("on-journal", { layout: "row", tone: "white", heading: "Journal", text: p("Des histoires et des idées<br>autour du son et de l'écoute."), button_label: "Tous les articles", button_link: P.journal, button_style: "outline", card_height: 160, mobile_card_height: 160, title_size: 34, mobile_title_size: 26, padding_top: 10, padding_bottom: 36 },
      posts([ONDE_ARTICLES[0], ONDE_ARTICLES[1], ONDE_ARTICLES[3]], (x) => x === ONDE_ARTICLES[3] ? { image_asset: a("04-detail-coussinet.webp"), focus_x: 35, focus_y: 45 } : {})),
    S("on-faq", { layout: "row", tone: "dark", heading: "Questions fréquentes", title_size: 17, mobile_title_size: 20, open_first: false, search: false, padding_top: 10, padding_bottom: 10 }, HOME_FAQ.map(([question, answer]) => ({ type: "question", settings: { topic: "", question, answer: p(answer) } }))),
    newsletter(),
  ], "onde_home");

  // ─── 02 Le casque (planches 01 et 05). La section Produit commune reste présente (outils du studio), masquée. ────
  const prodKey = k.productKey();
  const baseMain = Object.values(spec.templates[prodKey].sections).find((x) => x.type === "main-product")!;
  const tab = (label: string, anchor: string) => ({ type: "tab", settings: { label, anchor } });
  const productRows: SectionInstance[] = [
    { ...baseMain, settings: { ...baseMain.settings, product_target: "product:main", purchase_enabled: false }, disabled: true },
    S("on-product", { anchor: "vue-d-ensemble", home_label: "Accueil", current_label: "Le casque", heading: "Le casque.\nVotre espace.", brand_line: "ONDE AUDIO / Graphite", price_note: "", first_media: 1, thumbs_count: 5,
      card_brand: "ONDE", card_name: "Casque sans fil", finish_label: "Couleur", mobile_finish_label: "Finition", finish_value: "Graphite & lime", quantity_label: "Quantité", add_label: "Ajouter au panier",
      text: p("Un casque sans fil au design épuré, conçu pour vous accompagner partout avec style et confort."), help1_label: "Livraison & retours", help1_link: P.livraison, help1_icon: "truck", help2_label: "Aide & questions", help2_link: P.faq, help2_icon: "help",
      show_description: false, sticky_bar: true, bar_image_asset: a("c02-casque-detoure-profil.webp"), bar_name: "ONDE", bar_note: "Casque sans fil / Graphite", min_height: 780, title_size: 62, mobile_title_size: 40 }, [tab("Vue d'ensemble", "vue-d-ensemble"), tab("Design", "design"), tab("Au quotidien", "au-quotidien"), tab("Questions", "questions")]),
    banner({ layout: "split", tone: "dark", ...img("04-detail-coussinet.webp"), image_side: "right", image_width: 66, focus_x: 50, focus_y: 40, mobile_focus_x: 40, mobile_focus_y: 50, heading: "Au plus près\ndu son.", text: p("Des matières nobles, un design précis<br>et un confort pensé pour durer.<br>Chaque détail contribue à une expérience<br>d'écoute plus intense."), min_height: 345, mobile_min_height: 820, title_size: 66, mobile_title_size: 36, text_width: 520, mobile_order: "text-first", padding_top: 0, padding_bottom: 0 }),
    S("on-cards", { anchor: "design", layout: "grid", tone: "white", heading: "Un design pensé\npour l'essentiel.", columns: 4, card_height: 235, mobile_card_height: 150, gap: 22, title_size: 44, mobile_title_size: 26, mobile_layout: "two", card_arrow: false, padding_top: 36, padding_bottom: 36 }, [
      card("c06-detail-arceau.webp", "L'arceau", "Un maintien tout en douceur,\npour un confort longue durée.", { focus_x: 20, focus_y: 20, zoom: 160 }),
      card("c05-detail-coussinet.webp", "Les coussinets", "Un tissu respirant et moelleux,\npour vous accompagner\nau quotidien.", { focus_x: 25, focus_y: 55, zoom: 170 }),
      card("c07-detail-commandes.webp", "Les commandes", "Un accès simple et intuitif,\nau bout des doigts.", { focus_x: 62, focus_y: 22, zoom: 150 }),
      card("c08-detail-finition.webp", "La finition", "Une silhouette épurée,\nsoulignée par une touche\nde vert caractéristique."),
    ]),
    banner({ anchor: "au-quotidien", layout: "background", tone: "dark", ...img("c10-scene-deplacement-train.webp"), focus_x: 60, focus_y: 55, mobile_focus_x: 62, mobile_focus_y: 55, heading: "À chacun\nson moment.", text: p("Chez vous, en déplacement ou entre deux idées,<br>ONDE s'intègre naturellement dans votre quotidien."), button_label: "Voir le casque en situation", button_link: P.experience, button_style: "outline-light", min_height: 300, mobile_min_height: 620, title_size: 56, mobile_title_size: 34, text_width: 560, padding_top: 0, padding_bottom: 0 }),
    S("on-cards", { layout: "grid", tone: "white", heading: "Prendre le temps d'écouter.", text: p("Un objet pour votre espace, toujours avec vous. Le même confort, où que vous soyez."), text_mobile_only: true, columns: 3, card_height: 175, mobile_card_height: 110, gap: 26, title_size: 40, mobile_title_size: 24, mobile_layout: "two", card_arrow: false, padding_top: 30, padding_bottom: 12 }, [
      card("c12-journal-bureau-parenthese.webp", "Un objet pour votre espace", "Un design qui trouve sa place\npartout, du bureau au salon."),
      card("c10-scene-deplacement-train.webp", "Toujours avec vous", "Le même confort, où que vous soyez."),
      card("04-detail-coussinet.webp", "Un confort durable", "Des matières pensées pour\nvous accompagner jour après jour.", { desktop_only: true }),
    ]),
    S("on-faq", { anchor: "questions", layout: "columns", tone: "white", heading: "Questions fréquentes", info_heading: "Informations pratiques", title_size: 17, mobile_title_size: 17, open_first: false, search: false, padding_top: 6, padding_bottom: 30 }, [
      ...([["Utilisation", "Le mode d'emploi détaillé sera ajouté avec la notice du fabricant (à ajouter)."], ["Entretien", "Un chiffon doux et sec pour la poussière ; consignes du fabricant à ajouter avec la notice."], ["Informations produit", "Coloris Graphite & lime. Connectivité, autonomie, réduction de bruit, poids et contenu de la boîte : à confirmer."], ["Livraison et retours", "Frais et délais calculés à l'étape de livraison ; conditions de retour à compléter avant la mise en ligne."]] as [string, string][]).map(([question, answer]) => ({ type: "info", settings: { question, answer: p(answer) } })),
      ...[HOME_FAQ[0], HOME_FAQ[1], HOME_FAQ[3]].map(([question, answer]) => ({ type: "question", settings: { topic: "", question, answer: p(answer) } })),
    ]),
    banner({ layout: "cta", tone: "lime", heading: "Trouvez votre fréquence.", text: p("Un casque pensé pour aujourd'hui, et tous vos futurs moments d'écoute."), wave: "burst", button_label: "Ajouter au panier", mobile_icon_only: true, button_icon: "arrow", button_action: "add", button_style: "dark", use_page_product: true, min_height: 130, mobile_min_height: 200, title_size: 48, mobile_title_size: 26, padding_top: 0, padding_bottom: 0 }),
  ];
  spec.templates[prodKey] = tpl(productRows, "onde_product");

  // ─── 03 La boutique (planches 02 et 04) : la collection, une seule carte produit et ses sections éditoriales. ──────
  spec.templates.collection = tpl([
    banner({ layout: "split", tone: "light", cutout_asset: a("c01-casque-detoure-trois-quarts.webp"), cutout_alt: "Casque ONDE graphite et lime de trois quarts.", cutout_x: 77, cutout_y: 52, cutout_width: 34, mobile_cutout_x: 50, mobile_cutout_y: 47, mobile_cutout_width: 74, rings: "right", wave: "behind",
      mobile_cutout_mode: "flow", heading: "Une seule ONDE.\nTous vos moments.", heading_tag: "h1", text: p("Un casque sans fil pensé pour vous accompagner<br>dans tout ce qui compte. Un son immersif,<br>un design intemporel, une liberté au quotidien."), show_price: true, product_name: "Le casque ONDE", product_note: "Graphite & lime", button_label: "Découvrir le casque", button_link: P.casque, button_style: "lime", button_icon: "arrow", min_height: 650, mobile_min_height: 0, title_size: 64, mobile_title_size: 30, text_width: 820, padding_top: 96, padding_bottom: 0 }),
    S("on-cards", { layout: "thumbs", tone: "light", heading: "Un design à découvrir\nsous tous les angles.", mobile_heading: "Sous tous les angles.", text: p("Des lignes pures, des matières soignées<br>et des détails qui font la différence."), head_link: P.casque, columns: 3, card_height: 175, mobile_card_height: 96, side_width: 520, gap: 14, title_size: 30, mobile_title_size: 22, mobile_layout: "three", card_arrow: false, padding_top: 30, padding_bottom: 30 }, [
      card("c03-produit-fond-clair.webp", "", "", { image_alt: "Casque ONDE de face sur son socle." }),
      card("c02-casque-detoure-profil.webp", "", ""),
      card("c01-casque-detoure-trois-quarts.webp", "", ""),
    ]),
    S("on-cards", { layout: "scenes", tone: "dark", show_on: "mobile", heading: "", columns: 2, card_height: 220, mobile_card_height: 150, gap: 10, title_size: 30, mobile_title_size: 17, mobile_layout: "stack", card_arrow: true, padding_top: 0, padding_bottom: 10 }, [
      card("04-detail-coussinet.webp", "Des matières qui comptent.", "Un confort pensé pour durer.", { link: P.casque, focus_x: 40, focus_y: 40 }),
      card("05-detail-arceau.webp", "Des détails qui font la différence.", "Une finition soignée, jusque dans les\nmoindres éléments.", { link: P.casque }),
    ]),
    S("on-cards", { layout: "scenes", tone: "dark", heading: "", columns: 2, card_height: 395, mobile_card_height: 160, gap: 4, title_size: 30, mobile_title_size: 17, mobile_layout: "stack", card_arrow: true, padding_top: 0, padding_bottom: 0 }, [
      card("c09-scene-maison.webp", "À la maison", "Vos moments,\nen meilleure compagnie.", { link: P.experience }),
      card("c10-scene-deplacement-train.webp", "En déplacement", "Le même niveau d'écoute,\noù que vous alliez.", { link: P.experience }),
    ]),
  ], "onde_shop");

  // ─── Pied de page, en-tête et menus. ──────────────────────────────────────────────────────────────────────────
  const link = (title: string, url: string) => ({ title, url });
  spec.store.menus["main-menu"] = { title: "Navigation", links: [link("Le casque", P.casque), link("L'expérience", P.experience), link("Journal", P.journal), link("Aide", P.faq)] };
  spec.store.menus["menu-mobile"] = { title: "Menu mobile", links: [link("Le casque", P.casque), link("L'expérience", P.experience), link("La marque", P.marque), link("Journal", P.journal), link("Aide", P.faq)] };
  spec.store.menus["pied-aide"] = { title: "Aide", links: [link("Nous contacter", P.contact), link("Livraison", P.livraison), link("Retours", `${P.livraison}#retours`), link("Mentions légales", P.mentions)] };
  spec.store.menus["legal"] = { title: "Informations", links: [link("Mentions légales", P.mentions), link("Confidentialité", P.confidentialite), link("CGV", P.cgv), link("Contact", P.contact)] };
  spec.store.menus["legal-court"] = { title: "Légal", links: [link("Mentions légales", P.mentions), link("Conditions de vente", P.cgv), link("Confidentialité", P.confidentialite)] };
  spec.store.menus["explorer"] = { title: "Explorer", links: [link("Le casque", P.casque), link("L'expérience", P.experience), link("La marque", P.marque), link("Journal", P.journal)] };
  spec.store.menus["aide"] = { title: "Aide", links: [link("FAQ", P.faq), link("Contact", P.contact), link("Livraison & retours", P.livraison), link("Suivi de commande", P.suivi)] };
  spec.store.menus["informations"] = { title: "Informations", links: [link("Mentions légales", P.mentions), link("Conditions de vente", P.cgv), link("Confidentialité", P.confidentialite), link("Cookies", P.cookies)] };
  spec.groups.header = { ...spec.groups.header, order: ["header"], sections: { header: S("on-header", { logo_light_asset: a("logo.webp"), logo_dark_asset: a("logo-fonce.webp"), logo_width: 140, mobile_logo_width: 84, menu: "main-menu", mobile_menu: "menu-mobile", legal_menu: "legal-court", search: true, search_label: "Rechercher…", cart_link_label: "Mon panier", bar_on_cart: true, bar_pages: "commande,confirmation,faq,contact,livraison-retours,suivi-de-commande,mentions-legales,conditions-de-vente,confidentialite,cookies", demo_checkout_link: P.commande }) } };
  spec.groups.footer = { ...spec.groups.footer, order: ["footer"], sections: { footer: S("on-footer", { style_default: "wordmark", style_product: "wordmark", style_collection: "lime", style_cart: "slim", lime_pages: "l-experience,la-marque,journal," + ONDE_ARTICLES.map((x) => x.handle).join(","), slim_pages: "commande,confirmation,faq,contact,livraison-retours,suivi-de-commande,mentions-legales,conditions-de-vente,confidentialite,cookies",
    mobile_list_pages: "faq,contact,livraison-retours,suivi-de-commande", logo_light_asset: a("logo.webp"), logo_wordmark_asset: a("logo-mot.webp"), logo_dark_asset: a("logo-fonce.webp"), logo_width: 470, mobile_logo_width: 190, menu: "main-menu", second_menu: "pied-aide", legal_menu: "legal", slim_legal_menu: "legal-court", group1_title: "Explorer", group1_menu: "explorer", group2_title: "Aide", group2_menu: "aide", group3_title: "Informations", group3_menu: "informations", show_social: true, bottom_text: "" }) } };
  spec.settings = { ...spec.settings, fab_contact_link: "", fab_back_to_top: false, social_instagram: "", social_youtube: "", social_tiktok: "", logo_asset: a("logo.webp"), favicon_asset: k.ids["favicon.png"] ? a("favicon.png") : "" };

  // ─── 04 L'expérience, 05 La marque, 06 Journal (planches 02 et 04). ──────────────────────────────────────────────
  page("l-experience", "L'expérience", "Entrez dans votre bulle : le contact des matières, l'écoute au quotidien, à la maison, dans le train ou au studio.", [
    banner({ layout: "split", tone: "dark", ...img("c14-experience-entrez-dans-votre-bulle.webp"), image_loading: "eager", image_side: "right", image_width: 92, focus_x: 50, focus_y: 45, mobile_focus_x: 62, mobile_focus_y: 55, mobile_overlay: true, heading: "Entrez dans\nvotre bulle.", heading_tag: "h1", text: p("Un son enveloppant, un design épuré,<br>et plus d'espace pour ce qui compte vraiment."), button_label: "Découvrir le casque", button_link: P.casque, button_style: "lime", button_icon: "arrow", min_height: 482, mobile_min_height: 410, title_size: 60, mobile_title_size: 30, text_width: 560, mobile_order: "text-first", padding_top: 96, padding_bottom: 0 }),
    S("on-cards", { layout: "macros", tone: "light", heading: "Tout commence\npar le contact.", text: p("Des matières douces et résistantes,<br>une finition soignée, pour une écoute<br>qui se fait oublier."), columns: 3, card_height: 205, mobile_card_height: 90, side_width: 500, gap: 20, title_size: 48, mobile_title_size: 24, mobile_layout: "two", card_arrow: false, padding_top: 26, padding_bottom: 16 }, [
      card("04-detail-coussinet.webp", "", "Coussins en tissu\nnoir et doux", { focus_x: 35, focus_y: 40 }),
      card("04-detail-coussinet.webp", "", "Finition graphite mate\net liseré lime", { focus_x: 92, focus_y: 50, zoom: 190 }),
      card("05-detail-arceau.webp", "", "Détails soignés\nau quotidien", { focus_x: 55, focus_y: 40 }),
      card("c06-detail-arceau.webp", "", "Arceau rembourré\net coulisseau lime", { mobile_only: true, focus_x: 30, focus_y: 25, zoom: 150 }),
    ]),
    banner({ layout: "cta", tone: "lime", heading: "Écouter,\nsimplement.", text_beside: true, text: p("Plus de musique dans vos journées.<br>Moins de distractions autour."), wave: "burst", min_height: 190, mobile_min_height: 280, title_size: 76, mobile_title_size: 40, padding_top: 0, padding_bottom: 0 }),
    S("on-cards", { layout: "scenes", tone: "dark", columns: 3, card_height: 280, mobile_card_height: 225, gap: 4, title_size: 26, mobile_title_size: 20, mobile_layout: "carousel", card_arrow: true, padding_top: 0, padding_bottom: 0 }, [
      card("c09-scene-maison.webp", "À la maison", "Concentrez-vous sur l'essentiel.", { link: P.casque }),
      card("c10-scene-deplacement-train.webp", "Dans le train", "Votre bulle, où que vous alliez.", { link: P.casque }),
      card("c11-scene-studio.webp", "Au studio", "Un espace rien qu'à vous.", { link: P.casque }),
    ]),
    banner({ layout: "split", tone: "white", show_on: "mobile", cutout_asset: a("c01-casque-detoure-trois-quarts.webp"), cutout_alt: "Casque ONDE graphite et lime.", mobile_cutout_mode: "side", mobile_cutout_x: 24, mobile_cutout_y: 50, mobile_cutout_width: 46, heading: "À votre rythme.", text: p("Un casque pensé pour vous,<br>et pour tout ce qui compte."), show_price: true, product_name: "", button_label: "Découvrir le casque", button_link: P.casque, button_style: "lime", button_icon: "arrow", min_height: 260, mobile_min_height: 280, title_size: 40, mobile_title_size: 22, text_width: 420, padding_top: 0, padding_bottom: 0 }),
  ]);
  page("la-marque", "La marque", "Suivre sa propre fréquence : ONDE AUDIO, un design essentiel, des matières choisies et le plaisir du quotidien.", [
    banner({ layout: "split", tone: "light", ...img("c16-marque-propre-frequence.webp"), image_loading: "eager", image_side: "right", image_width: 40, image_zoom: 150, focus_x: 72, focus_y: 22, mobile_image_zoom: 230, mobile_focus_x: 55, mobile_focus_y: 12, wordmark: "ONDE", wordmark_asset: a("logo-contour-lime.png"), heading: "Suivre sa\npropre fréquence.", heading_tag: "h1", text: p("Chez ONDE AUDIO, nous croyons que la musique<br>a sa place partout. Dans les grands moments<br>comme dans les plus simples. Elle nous accompagne,<br>nous recentre et donne du relief au quotidien."), min_height: 380, mobile_min_height: 0, title_size: 64, mobile_title_size: 39, text_width: 620, mobile_order: "text-first", padding_top: 96, padding_bottom: 0 }),
    banner({ layout: "cta", tone: "dark", title_color: "lime", text_beside: true, heading: "Moins de bruit visuel.\nPlus de place à l'écoute.", text: p("Un design essentiel, des matières durables,<br>et une même idée : faire de chaque écoute<br>un moment plus libre, plus personnel."), wave: "line", min_height: 170, mobile_min_height: 280, title_size: 48, mobile_title_size: 24, padding_top: 0, padding_bottom: 0 }),
    S("on-cards", { layout: "numbered", tone: "white", side_image_asset: a("c08-detail-finition.webp"), side_image_alt: "Gros plan de l'écouteur graphite cerclé de lime.", side_focus_x: 40, side_focus_y: 40, columns: 1, card_height: 0, mobile_card_height: 0, side_width: 700, gap: 0, title_size: 24, mobile_title_size: 18, mobile_layout: "stack", card_arrow: false, padding_top: 0, padding_bottom: 0 }, [
      { type: "card", settings: { number: "01", title: "Le sens du détail", text: "Des matières choisies avec soin,\npour une expérience durable." } },
      { type: "card", settings: { number: "02", title: "Le goût des lignes simples", text: "Un design intemporel, pensé pour s'intégrer\ndans tous les moments de vie." } },
      { type: "card", settings: { number: "03", title: "Le plaisir du quotidien", text: "Une écoute plus présente,\nplus libre, plus à vous." } },
    ]),
    banner({ layout: "cta", tone: "white", mobile_image_asset: a("c17-journal-moment-ecoute.webp"), mobile_focus_x: 55, mobile_focus_y: 50, heading: "À votre rythme.", text_beside: true, text: p("Toujours plus d'espace pour ce qui compte :<br>votre musique, votre quotidien, votre rythme."), wave: "none", button_label: "Découvrir le casque", button_link: P.casque, button_style: "lime", button_icon: "arrow", min_height: 110, mobile_min_height: 245, title_size: 44, mobile_title_size: 26, padding_top: 0, padding_bottom: 0 }),
  ]);
  page("journal", "Journal", "Des idées, des inspirations et des conseils pour profiter pleinement de votre écoute, au quotidien.", [
    S("on-journal", { layout: "page", tone: "light", ...img("c18-journal-details-ligne.webp"), focus_x: 50, focus_y: 40, wave: true, heading: "Sur la même\nfréquence.", heading_tag: "h1", text: p("Des idées, des inspirations et des conseils pour<br>profiter pleinement de votre écoute, au quotidien."), filters: true, all_label: "Tout", featured_label: "Article principal", featured_in_grid: false, empty_text: "Aucun article dans ce thème pour l'instant.", head_height: 410, mobile_head_height: 560, card_height: 255, mobile_card_height: 230, title_size: 56, mobile_title_size: 30, padding_top: 96, padding_bottom: 0 },
      posts([ONDE_ARTICLES[0], ONDE_ARTICLES[1], ONDE_ARTICLES[2], ONDE_ARTICLES[3], ONDE_ARTICLES[4]], (_, i) => (i === 0 ? { featured: true } : {}))),
    newsletter({ heading: "Restez sur la même fréquence.", text: "Recevez nos derniers articles, inspirations et conseils.", button_label: "S'abonner", title_size: 28, padding_top: 26, padding_bottom: 26 }),
  ]);
  for (const x of ONDE_ARTICLES) {
    const related = ONDE_ARTICLES.filter((y) => y !== x).slice(0, 3);
    page(x.handle, x.title, `${x.excerpt} Un article du journal ONDE.`, [
      S("on-article", { back_label: "Journal", back_link: P.journal, tag: x.tag, heading: x.title, intro: x.intro, ...img(x.image), related_title: "À lire aussi", title_size: 64, mobile_title_size: 32 }, [
        ...x.parts.map(([heading, text]) => ({ type: "part", settings: { heading, text: p(text) } })),
        ...related.map((y) => ({ type: "related", settings: { image_asset: a(y.image), title: y.title, text: y.excerpt, link: `/pages/${y.handle}` } })),
      ]),
      newsletter({ text: "Recevez nos derniers articles, inspirations et conseils.", button_label: "S'abonner" }),
    ]);
  }

  // ─── 07 Panier, 08 Commande et confirmation (planches 03 et 06). ─────────────────────────────────────────────────
  const help = (title: string, text: string, link: string, icon = "help") => ({ type: "help", settings: { icon, title, text, link } });
  spec.templates.cart = tpl([
    S("on-cart", { heading: "La suite\ns'écoute ici.", line_note: "Graphite & lime", line_image_asset: a("c02-casque-detoure-profil.webp"), subtotal_label: "Sous-total", shipping_label: "Livraison", shipping_value: "Calculée à l'étape suivante", total_label: "Total produits", total_mobile_only: true, checkout_label: "Passer commande", checkout_link: P.commande, note: "", back_label: "Continuer mes découvertes", back_link: P.casque,
      empty_heading: "Votre panier attend\nsa première ONDE.", empty_text: "Le casque qui vous accompagne\nau quotidien vous attend.", empty_image_asset: a("c14-experience-entrez-dans-votre-bulle.webp"), empty_focus_x: 50, empty_focus_y: 50, empty_button_label: "Découvrir le casque", empty_button_link: P.casque, title_size: 123, mobile_title_size: 36, padding_top: 20, padding_bottom: 200 }, [
      help("Besoin d'aide ?", "Consultez notre FAQ.", P.faq, "help"),
      help("Une question ?", "Nous contacter.", P.contact, "truck"),
    ]),
  ], "onde_cart");
  const checkout = (layout: "steps" | "confirmation", extra: Record<string, unknown>, blocks: { type: string; settings: Record<string, unknown> }[] = []) => S("on-checkout", {
    layout, product: ONDE_HANDLE, line_image_asset: a("c02-casque-detoure-profil.webp"), line_note: "Graphite & lime", summary_title: "Votre commande", cart_link: "/cart", confirm_link: P.confirmation,
    demo_notice: "Démonstration : saisissez des données fictives. Aucun paiement, aucune commande enregistrée, aucun e-mail envoyé.",
    info_note: `En poursuivant, vous acceptez nos <a href="${P.cgv}">Conditions de vente</a> et notre <a href="${P.confidentialite}">Politique de confidentialité</a>.`,
    pay_box_text: "Exemple de paiement : aucun champ de carte, aucune donnée bancaire. Sur la boutique en ligne, le paiement se fait sur la page sécurisée de la plateforme.",
    terms_text: `J'accepte les <a href="${P.cgv}">Conditions de vente</a> et la <a href="${P.confidentialite}">Politique de confidentialité</a>.`,
    ...extra }, blocks);
  page("commande", "Commande", "Commande d'exemple de la boutique de démonstration : testable avec des données fictives, sans paiement ni envoi.", [
    checkout("steps", { title_size: 102, mobile_title_size: 36, padding_top: 30, padding_bottom: 40 }, [{ type: "help", settings: { title: "Une question ?", text: "Consultez notre FAQ.", link: P.faq } }]),
  ]);
  page("confirmation", "Confirmation", "Exemple de confirmation de la boutique de démonstration : aucune commande réelle.", [
    checkout("confirmation", { eyebrow: "Exemple de confirmation", heading: "Merci pour\nvotre commande.", text: p("Ceci est un exemple : aucune commande n'est enregistrée et aucun e-mail n'est envoyé. Sur la boutique en ligne, la confirmation est envoyée par la plateforme après le paiement."),
      order_number: "Commande ONDE-EXEMPLE (fictive)", shipping_title: "Livraison", address_empty: "Adresse à renseigner", shipping_text: "Sur la boutique en ligne, les détails de livraison sont communiqués par e-mail.", help_title: "Aide", help_text: "Une question ? Nous sommes à votre écoute.", button_label: "Retour à la boutique", button_link: P.boutique, note: "Écran illustratif de confirmation.",
      image_asset: a("c14-experience-entrez-dans-votre-bulle.webp"), focus_x: 50, focus_y: 50, title_size: 72, mobile_title_size: 30, padding_top: 120, padding_bottom: 40 }),
  ]);

  // ─── 09 FAQ, 10 Contact, 11 Livraison & retours, 12 Suivi (planches 03 et 07). ─────────────────────────────────
  page("faq", "FAQ", "À l'écoute de vos questions : le casque, son utilisation, la commande et la livraison.", [
    S("on-faq", { layout: "page", tone: "light", page_heading: "À l'écoute\nde vos questions.", image_asset: a("c01-casque-detoure-trois-quarts.webp"), image_alt: "Casque ONDE graphite et lime.", search: true, search_label: "Rechercher une question", search_placeholder: "Rechercher une question…", tabs_label: "Thèmes des questions", open_first: true, empty_text: "Aucune question ne correspond à votre recherche. Écrivez-nous : nous vous répondrons.", button_label: "Besoin d'aide supplémentaire ?", button_link: P.contact, title_size: 96, mobile_title_size: 68, padding_top: 40, padding_bottom: 40 },
      ONDE_FAQ.map(([topic, question, answer]) => ({ type: "question", settings: { topic, question, answer: p(answer) } }))),
    newsletter({ tone: "dark", layout: "stack", show_on: "mobile", heading: "Restez informé.", text: "Recevez nos actualités et nos conseils.", placeholder: "Votre e-mail", wave: true, title_size: 24, mobile_title_size: 22, padding_top: 30, padding_bottom: 0 }),
  ]);
  const item = (icon: string, title: string, text: string, extra: Record<string, unknown> = {}) => ({ type: "item", settings: { icon, title, text, ...extra } });
  page("contact", "Contact", "On vous écoute : une question, une suggestion ? Écrivez-nous depuis le formulaire.", [
    S("on-help", { layout: "contact", tone: "light", heading: "On vous\nécoute.", text: "Une question, une suggestion ?\nNotre équipe vous répond\navec attention.", text_mobile_below: true, image_asset: a("c01-casque-detoure-trois-quarts.webp"), mobile_image_asset: a("c04-accueil-grande-ouverture.webp"), image_alt: "Casque ONDE graphite et lime.", mobile_focus_x: 50, mobile_focus_y: 50, mobile_dark_head: true, rings: true, head_height: 0, mobile_head_height: 640,
      subjects: "Le casque\nUne commande\nLivraison et retours\nAutre question", form_note: "", aside_title: "Autres façons d'obtenir de l'aide.", title_size: 118, mobile_title_size: 72, padding_top: 60, padding_bottom: 40 }, [
      item("chat", "Aide en ligne", "Retrouvez nos réponses\naux questions fréquentes.", { link: P.faq }),
      item("file", "Centre d'aide", "Guides et conseils\nd'utilisation.", { link: P.faq }),
      item("box", "Suivi de commande", "Une question sur\nvotre commande ?", { link: P.suivi }),
    ]),
  ]);
  page("livraison-retours", "Livraison & retours", "La bonne information : livraison, suivi et retours. Conditions commerciales à compléter avant la mise en ligne.", [
    S("on-help", { layout: "info", tone: "white", heading: "La bonne\ninformation.", text: "Toutes les réponses pour une expérience sereine, de la commande au retour.", image_asset: a("05-detail-arceau.webp"), image_alt: "", focus_x: 60, focus_y: 40, mobile_focus_x: 55, mobile_focus_y: 40, mobile_dark_head: true, head_height: 360, mobile_head_height: 470, shortcuts: true,
      box_icon: "file", box_title: "Conditions commerciales à compléter.", box_text: "Les informations détaillées sur la livraison, les retours et vos droits figureront dans les conditions de vente, à compléter avant la mise en ligne.", box_link_label: "", button_label: "Nous contacter", button_link: P.contact, title_size: 100, mobile_title_size: 54, padding_top: 0, padding_bottom: 40 }, [
      item("box", "Livraison", "Nous préparons votre commande avec soin. Les informations de livraison, dont les délais et les options disponibles, vous sont précisées lors de l'étape de livraison de la commande.", { anchor: "livraison" }),
      item("truck", "Suivi", "Une fois votre commande expédiée, un lien de suivi vous est communiqué lorsque le transporteur en fournit un. Vous pouvez aussi utiliser la page Suivi de commande.", { anchor: "suivi", link: P.suivi, link_label: "Suivre ma commande" }),
      item("refresh", "Retours", "Si vous souhaitez effectuer un retour, écrivez-nous : nous vous transmettrons la procédure et les étapes à suivre. Délais et conditions de retour à compléter.", { anchor: "retours" }),
    ]),
  ]);
  page("suivi-de-commande", "Suivi de commande", "Retrouvez votre commande avec son numéro et l'e-mail utilisé lors de l'achat. Démonstration : résultat d'exemple.", [
    S("on-help", { layout: "track", tone: "light", heading: "Retrouvez votre commande.", title_wave: true, text: "Renseignez les informations ci-dessous pour accéder\nau suivi de votre commande.", order_label: "Numéro de commande", email_label: "E-mail utilisé lors de l'achat", submit_label: "Retrouver ma commande",
      result_badge: "Exemple de résultat", result_title: "Commande", result_text: "Démonstration : aucune commande n'est consultée et aucun statut n'est affiché. Sur la boutique en ligne, le suivi apparaît ici après vérification du numéro et de l'e-mail.",
      photo_asset: a("c12-journal-bureau-parenthese.webp"), photo_alt: "Casque ONDE posé sur un bureau en bois.", photo_focus_x: 55, photo_focus_y: 60, box_icon: "headphones", box_title: "Besoin d'aide ?", box_text: "Si vous rencontrez un problème, notre équipe est là pour vous aider.", box_link_label: "Nous contacter", box_link: P.contact, title_size: 100, mobile_title_size: 58, padding_top: 50, padding_bottom: 30 }, [
      item("help", "Vous ne retrouvez pas votre numéro ?", "Consultez l'e-mail de confirmation de votre commande."),
    ]),
  ]);

  // ─── Pages légales, cookies et 404 : modèles à compléter. ─────────────────────────────────────────────────────
  const legal = (handle: string, title: string, intro: string, parts: [string, string][]) => page(handle, title, `${title} : modèle à compléter et à valider avant publication.`, [
    S("legal-page", { source: "blocks", show_title: true, eyebrow: "Informations légales", heading: title, updated: "", intro: p("<strong>Contenu à compléter et valider avant publication.</strong> Les informations de cette page sont un modèle de démonstration.") + p(intro), show_toc: false, pages_menu: "informations", show_print: false, color_scheme: "scheme-1", padding_top: 140, padding_bottom: 64 },
      parts.map(([t, x]) => ({ type: "part", settings: { title: t, text: p(`[À compléter : ${x}]`) } }))),
  ]);
  legal("mentions-legales", "Mentions légales", "Éditeur, hébergeur et contact de la boutique.", [["Éditeur", "raison sociale, adresse, immatriculation, directeur de la publication"], ["Hébergeur", "nom, adresse et contact de l'hébergeur"], ["Contact", "adresse e-mail ou formulaire de contact"]]);
  legal("conditions-de-vente", "Conditions de vente", "Conditions applicables aux commandes passées sur la boutique.", [["Prix", "prix, taxes et frais de livraison applicables"], ["Livraison", "zones, délais et frais"], ["Rétractation et retours", "délai, conditions et procédure"], ["Garanties", "garantie légale de conformité et garanties commerciales éventuelles"]]);
  legal("confidentialite", "Confidentialité", "Données collectées, finalités et droits des personnes.", [["Données collectées", "liste des données et finalités"], ["Durée de conservation", "durées par type de donnée"], ["Vos droits", "accès, rectification, effacement et contact"]]);
  legal("cookies", "Cookies", "Cookies utilisés et gestion du consentement.", [["Cookies utilisés", "liste des cookies, finalités et durées"], ["Gérer vos choix", "outil de gestion du consentement de la boutique"]]);
  const nf = spec.templates["404"];
  if (nf) for (const sec of Object.values(nf.sections)) if (sec.type === "main-404") sec.settings = { ...sec.settings, heading: "Cette page a perdu le signal.", text: "Le lien est peut-être ancien. Le casque, lui, est toujours là.", illustration: "image", image_asset: a("c14-experience-entrez-dans-votre-bulle.webp"), image_alt: "", button_label: "Découvrir le casque", button_link: P.casque };

  // Modèles de page de la composition de base sans page correspondante : retirés.
  for (const key of Object.keys(spec.templates)) if (key.startsWith("page.") && !spec.store.pages.some((pg) => `page.${pg.template_suffix}` === key)) delete spec.templates[key];
}
