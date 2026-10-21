/**
 * Démonstration ONDE (casque audio), refonte E-commerce de l'issue #158 (décision de Thomas du 21 octobre, 12 h 58) :
 * thème **mono-produit de la famille E-commerce**, nouvelle composition et nouvelle direction visuelle (graphite profond,
 * vert signal), avec les visuels, le logo et le produit existants. Un seul produit, aucun autre produit ONDE inventé.
 *
 * Même chaîne que HEUREN et ALCÔVE : un projet client (marque, produit, médias avec rôles) composé par le VRAI moteur dans
 * son thème du catalogue (composeShop), puis rédigé section par section, dans le même ordre (un test le vérifie).
 *
 * Les visuels viennent du kit privé de Thomas (`public/demo/onde/`, hors dépôt) : ils sont lus sur place et jamais copiés
 * dans le dépôt. Le logo proposé (PNG, texte graphite) est vectorisé ; sa version claire sert sur le fond graphite.
 *
 * Rien n'est inventé : les textes décrivent ce que montrent les visuels (arceau graphite réglable, coussinets noirs,
 * liserés et touche verts, un seul coloris) et les usages photographiés (salon, train, studio). Prix, autonomie,
 * connectivité, réduction de bruit, poids, contenu de la boîte, garantie et livraison ne sont jamais affirmés : leurs
 * blocs restent dans la démonstration, masqués (« [À compléter : …] » prêts dans l'éditeur). Aucun avis, note, compteur
 * ni urgence ; aucune vente. Les avis fictifs, le comparatif d'exemple et la garantie d'exemple de l'ancienne
 * composition (référence Pawish) ne sont pas repris.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { buildKitProject, p, TODO, ORDER_FAQ, type Brand, type Kit, type Media } from "./noctil-traverse-fixtures";
import { vectorizeLogo } from "./lot2c-logo";
import { sectionSchema, withDefaults } from "../src/lib/theme/spec";

export const ONDE_PROVENANCE = "Issue #158 (21 octobre 2026) — refonte E-commerce de la démonstration ONDE, visuels IA du kit privé de Thomas (sans personne), logo proposé non validé, aucun paiement";
export const ONDE_HANDLE = "casque-onde";
/** Kit privé de Thomas : lu sur place, jamais publié. */
export const ONDE_KIT_DIR = path.join(process.cwd(), "public", "demo", "onde");

/** Ordre d'import = rôles du thème (le dernier importé d'un rôle prend le premier emplacement). Textes alternatifs fidèles. */
export const ONDE_MEDIA: Media[] = [
  { file: "logo.webp", role: "logo", alt: "ONDE Audio" },
  { file: "03-autre-angle.webp", role: "packshot", alt: "Casque ONDE graphite de trois quarts, posé sur un socle noir." },
  { file: "02-fond-clair.webp", role: "packshot", alt: "Casque ONDE graphite entier sur fond clair : arceau, coussinets noirs et liserés verts." },
  { file: "05-detail-arceau.webp", role: "detail", alt: "Gros plan de l'arceau graphite, de son coulisseau et de sa touche verte." },
  { file: "04-detail-coussinet.webp", role: "detail", alt: "Gros plan d'un coussinet noir en tissu et du liseré vert de l'écouteur." },
  { file: "09-scene-studio.webp", role: "scene", alt: "Casque ONDE sur un support, devant une table de mixage éclairée." },
  { file: "08-scene-train.webp", role: "scene", alt: "Casque ONDE sur la tablette d'un train, montagnes et lac derrière la fenêtre." },
  { file: "07-scene-salon.webp", role: "scene", alt: "Casque ONDE posé sur un canapé en cuir, dans un salon au coucher du soleil." },
  { file: "06-banniere.webp", role: "banner", alt: "Casque ONDE posé sur une pierre sombre, sous un halo vert, sur fond anthracite." },
  { file: "01-hero.webp", role: "lifestyle", alt: "Casque ONDE graphite et vert, de trois quarts, sous un halo vert sur fond anthracite." },
];

const BRAND: Brand = {
  name: "ONDE Audio", product: "Casque ONDE Audio", category: "Casque audio",
  summary: "Casque graphite et noir mat, coussinets noirs, liserés et touche verts : un seul coloris.",
  facts: [["Coloris", "Graphite et vert"], ["Coussinets", "Noirs, en tissu"], ["Commandes", "Touche verte, repérable d'un coup d'œil"]],
  tagline: "Écoutez. Posez. Repartez.",
  story: "Une marque de démonstration autour d'un casque graphite et vert, photographié au salon, dans le train et au studio.",
  positioning: "Un casque pour écouter chez soi, en voyage ou au studio, avec des commandes repérables d'un coup d'œil.",
  palette: { primary: "#4ECD01", secondary: "#1F1F1F", accent: "#4ECD01", light: "#F2F3EF", dark: "#111311" },
};

// ONDE — fiche de stratégie (consigne du 21 octobre, 19 h 50 ; hypothèse éditoriale, pas une étude) :
//  1. cible : une personne qui écoute sa musique d'un lieu à l'autre (salon, train, studio) et la reprend vingt fois par jour ;
//  2. tension : « Le casque sur les oreilles, je cherche toujours le bon bouton. » ;
//  3. désir : être dans sa musique sans y penser — angle unique : d'un geste, vous êtes dans votre musique ;
//  4. promesse tenable : une touche verte qui se repère d'un coup d'œil, un seul coloris, un graphite discret partout ;
//     faits = visuels. Autonomie, connexion, réduction de bruit et poids jamais affirmés ;
//  5. objections : où sont les commandes, les coloris, où le porter, prix et caractéristiques (information dédiée) ;
//  6. parcours : campagne → achat → le détail mat → trois usages → un seul coloris → FAQ « Avant de choisir » → inscription.
export const ONDE_FAQ: [string, string][] = [
  ["Où se trouvent les commandes ?", "Elles se repèrent à leur vert : une touche sur l'arceau et une sur l'écouteur, visibles sur les gros plans de la fiche."],
  ["Existe-t-il d'autres coloris ?", "Non : ONDE existe dans un seul coloris, graphite et vert, celui de toutes les photos. Rien à choisir."],
  ["Où le porter ?", "Sur nos photos : au salon, sur la tablette d'un train et au studio, près d'une table de mixage. Son graphite reste discret partout."],
  ["Que puis-je faire dans cette boutique de démonstration ?", "Faire le tour du casque et le voir là où il sert. Le prix, l'autonomie, la connexion et le poids ne sont pas encore renseignés, et la commande est désactivée."],
];
export const ONDE_FAQ_PENDING: [string, string][] = [
  ["Quelle est son autonomie ?", TODO("autonomie mesurée et temps de charge")],
  ["Comment se connecte-t-il ?", TODO("connexion sans fil, câble, compatibilités")],
  ["Réduit-il les bruits extérieurs ?", TODO("réduction de bruit : présence et type")],
  ["Combien pèse-t-il ?", TODO("poids en grammes")],
  ["Que contient la boîte ?", TODO("contenu exact de la boîte : câble, housse…")],
  ["Quelle est la garantie ?", TODO("durée et conditions de garantie")],
];

/** Médias de la démonstration : les WebP du kit privé tels quels, et le logo vectorisé en version claire (fond graphite). */
async function prepareMedia(): Promise<string> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "onde-kit-"));
  for (const m of ONDE_MEDIA) {
    if (m.role === "logo") continue;
    const source = path.join(ONDE_KIT_DIR, m.file);
    if (fs.existsSync(source)) fs.copyFileSync(source, path.join(dir, m.file));
  }
  const png = path.join(ONDE_KIT_DIR, "logo-proposition.png");
  if (fs.existsSync(png)) {
    const logo = await vectorizeLogo(fs.readFileSync(png), [{ name: "graphite", hex: "#1C1C1C" }, { name: "vert", hex: "#5EC417" }], [0, 0, 0.235, 1]);
    await sharp(Buffer.from(logo.inverse), { density: 300 }).resize({ width: 1200 }).webp({ quality: 92 }).toFile(path.join(dir, "logo.webp"));
  }
  return dir;
}

export async function ondeProject(userId: string) {
  const mediaDir = await prepareMedia();
  try {
    return await buildKitProject(userId, { id: "onde", media: ONDE_MEDIA, handle: ONDE_HANDLE, brand: BRAND, themeName: "Onde", provenance: ONDE_PROVENANCE, storeKind: "catalog", sector: "maison", mediaDir }, curateOnde);
  } finally {
    fs.rmSync(mediaDir, { recursive: true, force: true });
  }
}

const frame = (k: Kit, file: string, title: string, text: string, ratio: "landscape" | "portrait" | "square", extra: Record<string, unknown> = {}) => ({ type: "frame", settings: { ...k.img(file), title, text: p(text), link: "", link_label: "", ratio, ...extra } });

function curateOnde(k: Kit) {
  const { spec, img, section, overlay, faq, productHref } = k;
  k.demoMeta();
  spec.store.seo = { title: "ONDE Audio | Casque graphite aux commandes vertes repérables", description: "Écoutez. Posez. Repartez. Le casque ONDE : arceau graphite, coussinets noirs, une touche verte qui se trouve d'un coup d'œil, du salon au studio." };
  k.product({
    title: "Casque ONDE Audio",
    description_html: p("Son rôle : vous laisser dans votre musique sans chercher. Ses commandes se repèrent à leur vert, d'un coup d'œil ou du bout des doigts.") + p("Ce qu'on voit : un arceau graphite réglable, des coussinets noirs en tissu, des écouteurs graphite cerclés d'un liseré vert, une touche verte sur l'arceau et sur l'écouteur.") + p("Où le porter : au salon, dans le train, au studio ; un seul coloris, graphite et vert, celui de toutes les photos."),
    images: ["02-fond-clair.webp", "03-autre-angle.webp", "01-hero.webp", "04-detail-coussinet.webp", "05-detail-arceau.webp"],
    tags: ["casque", "graphite", "audio"],
    seo: { title: "Casque ONDE Audio : vues et détails, graphite et vert | ONDE Audio", description: "Faites le tour du casque ONDE : sur fond clair, de trois quarts, de face, puis le coussinet et l'arceau en gros plan." },
  });

  // ─── Accueil : la campagne, l'achat, un détail, trois usages, une scène, les questions et l'inscription. ──────────
  overlay("index", [
    section("fs-campaign", { ...img("06-banniere.webp"), layout: "background", heading_tag: "h1", eyebrow: "ONDE Audio", heading: "Écoutez. Posez.", heading_accent: "Repartez.", text: p("Le casque graphite qui se trouve sans chercher : une touche verte repérable d'un coup d'œil, du salon au train jusqu'au studio."), align: "left", label: "", offer_title: "", offer_text: "", period_text: "", conditions: "", cta_label: "Voir le casque", cta_link: productHref, cta2_label: "Les usages", cta2_link: "/pages/usages", focus_x: 62, focus_y: 50, effect: "fade", stagger: true, hover: false, background: "scheme", color_scheme: "scheme-1", padding_top: 0, padding_bottom: 0 }),
    section("featured-purchase", { label: "Le casque", heading: "Casque ONDE Audio", text: p("Avant de le choisir, faites-en le tour : arceau graphite, coussinets noirs, et la touche verte en gros plan."), product: ONDE_HANDLE, product_target: "product:main", purchase_style: "outlined", purchase_enabled: false, image_fit: "contain", gallery_limit: 4, enable_zoom: true, link_label: "Voir la fiche complète", color_scheme: "scheme-2" }),
    section("ed-finishes", { ...img("04-detail-coussinet.webp"), label: "Le détail", heading: "Noir mat, du coussinet à l'arceau", text: p("Le tissu noir des coussinets et le graphite de l'arceau gardent la même teinte mate ; seul le vert des liserés et des commandes ressort."), button_label: "Voir le casque", button_link: productHref, caption: "", product: ONDE_HANDLE, product_target: "product:main", focus_x: 50, focus_y: 50, motion: "reveal", color_scheme: "scheme-4", padding_top: 96, padding_bottom: 96 }),
    section("ed-diptych", { layout: "index", label: "Trois usages", heading: "Au salon, dans le train, au studio", text: "", button_label: "Tous les usages", button_link: "/pages/usages", motion: "reveal", color_scheme: "scheme-1", padding_top: 96, padding_bottom: 96 }, [
      frame(k, "07-scene-salon.webp", "Au salon", "Posé sur le canapé, prêt pour la prochaine écoute.", "portrait", { focus_x: 55, link: productHref, link_label: "Voir le casque" }),
      frame(k, "08-scene-train.webp", "Dans le train", "Sur la tablette, le temps du trajet.", "portrait", { focus_x: 62, link: productHref, link_label: "Voir le casque" }),
      frame(k, "09-scene-studio.webp", "Au studio", "Sur un support, près de la table de mixage.", "portrait", { focus_x: 50, link: productHref, link_label: "Voir le casque" }),
    ]),
    section("cta-banner", { ...img("01-hero.webp"), heading: "Graphite et vert, rien d'autre", text: p("Pas de variante à choisir : ONDE existe dans une seule finition, celle de toutes les photos."), button_label: "Voir le casque", button_link: productHref, overlay: 45, style: "center", parallax: false, color_scheme: "scheme-1", padding_top: 120, padding_bottom: 120 }),
    faq("Avant de choisir", ONDE_FAQ.slice(0, 4), "cards", "side", "", { eyebrow: "Questions", button_label: "Toutes les questions", button_link: "/pages/aide", color_scheme: "scheme-4" }),
    section("newsletter", { heading: "Être prévenu quand ONDE ouvre", text: p("Un e-mail à l'ouverture de la boutique. Rien d'autre."), button_label: "Me prévenir", color_scheme: "scheme-2" }), // fond clair : champ e-mail lisible (le vert sur vert ne l'était pas)
  ]);

  // ─── Fiche produit ───────────────────────────────────────────────────────────────────────────────────────────────
  k.mainProduct({
    eyebrow: "Casque audio · commandes repérables",
    text: "La touche verte se trouve d'un coup d'œil ; l'arceau graphite et les coussinets noirs restent discrets, du salon au train.",
    highlights: "Arceau graphite réglable\nCoussinets noirs en tissu\nLiserés et touches verts\nUn seul coloris : graphite et vert",
    description: spec.store.product.description_html,
    specs: "autonomie, temps de charge, connexion, réduction de bruit, poids",
    box: "contenu exact de la boîte",
    shipping: "zones, délais et frais de livraison ; délai et conditions de retour ; durée de garantie",
    settings: { gallery_layout: "carousel", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" },
  });
  // L'action juste sous le prix : sur téléphone, le casque, son nom et le bouton tiennent dans le premier écran.
  {
    const mp = Object.values(spec.templates[k.productKey()].sections).find((s) => s.type === "main-product")!;
    const order = (mp.block_order ?? []).filter((b) => b !== "buy");
    order.splice(order.indexOf("price") + 1, 0, "buy");
    mp.block_order = order;
  }
  overlay(k.productKey(), [
    section("ed-finishes", { ...img("05-detail-arceau.webp"), label: "Les commandes", heading: "Une touche qui se trouve sans chercher", text: p("Sur l'arceau, la touche verte se repère d'un coup d'œil, à côté du coulisseau qui règle la hauteur."), button_label: "", button_link: "", caption: "", product: ONDE_HANDLE, product_target: "product:main", focus_x: 55, focus_y: 50, motion: "reveal", color_scheme: "scheme-4", padding_top: 96, padding_bottom: 96 }),
    section("ed-scene", { ...img("09-scene-studio.webp"), layout: "split", label: "Au studio", heading: "Près de la table de mixage", text: p("Sur son support, le casque attend la prochaine séance ; son graphite se fond dans le matériel."), button_label: "Tous les usages", button_link: "/pages/usages", caption: "", focus_x: 45, focus_y: 50, mobile_focus_x: 45, mobile_focus_y: 50, motion: "reveal", color_scheme: "scheme-1", padding_top: 72, padding_bottom: 72 }),
    faq("Questions sur le casque", [...ONDE_FAQ, ...ONDE_FAQ_PENDING], "cards", "side", "", { color_scheme: "scheme-1" }),
  ]);
  // Un seul produit : la rangée de recommandations n'aurait rien à proposer ; elle est retirée de la fiche.
  const fiche = spec.templates[k.productKey()];
  for (const sid of fiche.order.filter((s) => fiche.sections[s].type === "product-recommendations")) { delete fiche.sections[sid]; fiche.order.splice(fiche.order.indexOf(sid), 1); }
  // La campagne de la démonstration remplace l'ouverture de repli composée faute de campagne datée dans le projet.
  const home = spec.templates.index;
  for (const sid of home.order.filter((s, i) => i < home.order.findIndex((x) => home.sections[x].type === "featured-purchase") && home.sections[s].type === "fs-lookbook")) { delete home.sections[sid]; home.order.splice(home.order.indexOf(sid), 1); }

  // ─── Pages ───────────────────────────────────────────────────────────────────────────────────────────────────────
  k.page("usages", "Les usages", { title: "Les usages du casque ONDE : salon, train, studio | ONDE Audio", description: "Au salon, dans le train, au studio : le casque ONDE photographié là où il sert, pour voir comment il s'y fond." }, [
    ["intro", section("rich-text", { style: "plain", align: "left", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 24 }, [{ type: "text", settings: { text: p("Un casque se choisit aussi pour les endroits où on le pose. Voici ONDE là où il sert : chez soi, en voyage et au studio.") } }])],
    ["deux", section("ed-diptych", { layout: "side", label: "Chez soi, en voyage", heading: "Au salon et dans le train", text: "", button_label: "", button_link: "", motion: "reveal", color_scheme: "scheme-1", padding_top: 48, padding_bottom: 72 }, [
      frame(k, "07-scene-salon.webp", "Au salon", "Sur un canapé en cuir, au coucher du soleil : posé là jusqu'à la prochaine écoute.", "portrait", { focus_x: 55 }),
      frame(k, "08-scene-train.webp", "Dans le train", "Sur la tablette, face à la fenêtre : le graphite reste discret en voyage.", "portrait", { focus_x: 62 }),
    ])],
    ["studio", section("ed-scene", { ...img("09-scene-studio.webp"), layout: "closing", label: "Au studio", heading: "Sur son support, entre deux séances", text: p("Près de la table de mixage, le casque ONDE garde ses repères verts à portée de main."), button_label: "Voir le casque", button_link: productHref, caption: "", focus_x: 50, focus_y: 45, mobile_focus_x: 50, mobile_focus_y: 45, motion: "reveal", color_scheme: "scheme-4", padding_top: 88, padding_bottom: 88 })],
  ]);
  k.page("aide", "Questions et contact", { title: "Questions et contact | ONDE Audio, casque graphite et vert", description: "Où sont les commandes, les coloris, où le porter, ce que permet la démonstration : nos réponses sur le casque ONDE, et un formulaire." }, [
    ["faq", faq("Questions fréquentes", [...ONDE_FAQ, ...ONDE_FAQ_PENDING], "numbered", "stacked", "", { color_scheme: "scheme-1" })],
    ["form", section("contact-form", { eyebrow: "Contact", heading: "Une question avant de choisir ?", text: p("Écrivez-nous : le formulaire vérifie les champs avant l'envoi. Dans cette démonstration, aucun message n'est réellement transmis."), email: "", hours: "", response: "", preview_note: true, color_scheme: "scheme-4", padding_top: 64, padding_bottom: 96 })],
  ]);

  // ─── Menus, en-tête « Méga menu en colonnes » (encart du casque), pied « Plan du catalogue en colonnes » ─────────
  spec.store.menus["main-menu"] = { title: "Navigation", links: [
    { title: "Le casque", url: productHref, links: [{ title: "Vues et détails", url: productHref }, { title: "Les usages", url: "/pages/usages" }, { title: "Questions et contact", url: "/pages/aide" }] },
    { title: "Les usages", url: "/pages/usages" },
    { title: "Aide", url: "/pages/aide" },
  ] };
  spec.store.menus.footer = { title: "Le casque", links: [{ title: "Vues et détails", url: productHref }, { title: "Les usages", url: "/pages/usages" }] };
  spec.store.menus["footer-aide"] = { title: "Aide", links: [{ title: "Questions et contact", url: "/pages/aide" }, { title: "Recherche", url: "/search" }] };
  const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
  header.settings = { ...header.settings, menu: "main-menu", layout: "logo-left", shape: "bar", icons: "plain", mega_menu: "columns-promo", desktop_icons: true, mobile_menu: "drawer", mobile_submenu: "accordion", sticky: true, transparent_on_home: false, show_search: true, show_cart: true, cta_label: "", phone: "", color_scheme: "scheme-1" };
  const promoSchema = sectionSchema(spec, "header")!.blocks.find((b) => b.type === "promo")?.settings;
  header.blocks = { casque: { type: "promo", settings: withDefaults(promoSchema, { image: "", image_asset: k.name("03-autre-angle.webp"), eyebrow: "Le casque", heading: "ONDE, graphite et vert", button_label: "Voir la fiche", link: productHref, placement: "mega", menu_title: "Le casque" }) } };
  header.block_order = ["casque"];
  spec.groups.header.sections = { header };
  spec.groups.header.order = ["header"];
  const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
  footer.settings = { ...footer.settings, style: "columns", show_wordmark: false, show_policies: false, show_payment: false, color_scheme: "scheme-4", logo_asset: "" };
  footer.blocks = {
    about: { type: "text", settings: { heading: "ONDE Audio", text: p("Le casque graphite et vert, pour le salon, le train et le studio. Marque de démonstration du studio.") } },
    links: { type: "links", settings: { heading: "Le casque", menu: "footer" } },
    help: { type: "links", settings: { heading: "Aide", menu: "footer-aide" } },
  };
  footer.block_order = ["about", "links", "help"];
  for (const s of Object.values(spec.groups.footer.sections)) if (s.type !== "footer") s.disabled = true;
  k.finish();
  spec.settings = { ...spec.settings, logo_width: 140 };
}
