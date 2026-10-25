/**
 * Démonstration FRAISE GUMMIES (thème `fraise`, famille Produit spécifique / Boutique spécialisée), composée d'après les
 * sept planches corrigées de Thomas du 24 octobre 2026 (docs/theme-briefs/fraise-gummies/maquettes).
 *
 * Le projet est créé comme un projet client (marque, produit, médias avec rôles), composé par le VRAI moteur dans le
 * thème « fraise » (composeShop), puis rédigé page par page d'après les planches (sections fg-*, textes lisibles des
 * planches, coquilles corrigées). FRAISE est une CONFISERIE (ni complément alimentaire ni vitamine) : aucune promesse de
 * santé, de composition, d'origine ou de certification ; « 60 douceurs » est une donnée illustrative de la maquette ;
 * ingrédients, valeurs nutritionnelles, conservation, livraison et retours restent « [À compléter : …] ».
 *
 * Offres : un seul produit en trois variantes (« 1 flacon », « 2 flacons », « 3 flacons »), prix lus dans
 * OFFRES_VALIDEES.json (centimes entiers, source unique) ; économies et messages sont CALCULÉS par le thème.
 * Prix de démonstration, aucun paiement, aucun envoi. Photos : kit privé de Thomas (public/demo/fraise/v2/, hors dépôt),
 * reconstitutions guidées par les planches ; les originaux du kit restent en réserve.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { run, now } from "../src/lib/db";
import { emptyProduct } from "../src/lib/project-types";
import { localBrand } from "../src/lib/engine/local";
import { composeShop } from "../src/lib/engine/shop";
import { loadProject, saveBrand, saveProduct, saveStrategy, saveSettings } from "../src/lib/projects";
import { saveAsset } from "../src/lib/library";
import { seedHoldout } from "./lot1-holdout-fixtures";
import type { StoreProduct, ThemeSpec } from "../src/lib/theme/spec";
import { FG_PAGES, fgTemplate, fgUrl, headerSettings, footerSettings, cartSettings, pageRow, LOOK_01, LOOK_PRODUCT, LOOK_02, LOOK_03, LOOK_BUY, type FgPageHandle } from "../src/lib/theme/fraise-v2";
import type { Row } from "../src/lib/theme/theme-catalog";

export const FRAISE_PROVENANCE = "FRAISE GUMMIES (24 octobre 2026) — photos complémentaires recréées d'après les planches corrigées, fournies par Thomas (kit privé) ; démonstration du studio, prix de démonstration, aucun paiement";
export const FRAISE_DIR = path.join(process.cwd(), "public", "demo", "fraise", "v2");
export const FRAISE_HANDLE = "gummies-fraise";
export const FRAISE_BRIEF = path.join(process.cwd(), "docs", "theme-briefs", "fraise-gummies");

/** Offres validées par Thomas (centimes entiers) : la seule source des prix de la démonstration. */
export type FraiseOffer = { id: string; flacons_par_pack: number; prix_pack_centimes: number; prix_reference_unites_centimes: number; economie_centimes: number; message: string };
export function fraiseOffers(): { unit: number; offers: FraiseOffer[]; examples: { packs: Record<string, number>; flacons: number; sous_total_centimes: number }[] } {
  const j = JSON.parse(fs.readFileSync(path.join(FRAISE_BRIEF, "OFFRES_VALIDEES.json"), "utf8"));
  return { unit: j.prix_unitaire_centimes, offers: j.offres, examples: j.exemples };
}

/** Médias du kit privé (rôle et texte alternatif) ; les originaux du kit restent en réserve (aucune section ajoutée). */
export const FRAISE_MEDIA: { file: string; role: string; alt: string }[] = [
  { file: "01-un-flacon-detoure.webp", role: "packshot", alt: "Un flacon FRAISE GUMMIES détouré : bouchon rouge, étiquette illustrée d'une fraise, gummies rouges." },
  { file: "02-deux-flacons-detoures.webp", role: "packshot", alt: "Deux flacons FRAISE GUMMIES détourés." },
  { file: "03-trois-flacons-detoures.webp", role: "packshot", alt: "Trois flacons FRAISE GUMMIES détourés." },
  { file: "04-accueil-flacon-fraises.webp", role: "lifestyle", alt: "Le flacon FRAISE sur un plateau rose, entouré de fraises et de gummies." },
  { file: "05-fiche-flacon-principal.webp", role: "packshot", alt: "Le flacon FRAISE GUMMIES entier, des fraises et des gummies au pied." },
  { file: "06-flacon-ouvert-plongee.webp", role: "detail", alt: "Le flacon ouvert, rempli de gummies rouges, son bouchon posé à côté." },
  { file: "07-macro-gummies-texture.webp", role: "detail", alt: "Gros plan de gummies rouges sucrés, devant le flacon et des fraises." },
  { file: "08-macro-etiquette-bouchon.webp", role: "detail", alt: "Gros plan du bouchon rouge et de l'étiquette illustrée du flacon." },
  { file: "09-recette-composition-fraise.webp", role: "scene", alt: "Le flacon, des fraises et des gummies sur une planche en bois." },
  { file: "10-recette-gummies-fraises.webp", role: "scene", alt: "Gummies et fraises coupées sur une planche, le flacon derrière." },
  { file: "11-histoire-composition-flacon.webp", role: "scene", alt: "Le flacon FRAISE parmi des fraises, sur une table au soleil." },
  { file: "12-scene-cuisine.webp", role: "scene", alt: "Le flacon sur une nappe vichy rouge, avec des fraises et un bol de gummies." },
  { file: "13-scene-jardin.webp", role: "scene", alt: "Le flacon sur une table de jardin, des fraises et des gummies autour." },
  { file: "14-scene-bureau.webp", role: "scene", alt: "Le flacon sur un bureau clair, à côté d'un pot à crayons et de fraises." },
  { file: "15-offre-deux-flacons.webp", role: "packshot", alt: "Deux flacons FRAISE GUMMIES sur fond clair." },
  { file: "16-offre-trois-flacons.webp", role: "packshot", alt: "Trois flacons FRAISE GUMMIES sur fond clair." },
  { file: "17-journal-petit-rituel.webp", role: "scene", alt: "Le flacon sur une table dressée avec une nappe vichy, des fraises et un verre." },
  { file: "18-journal-gout-fraise.webp", role: "scene", alt: "Fraises et gummies sur une planche, le flacon au centre." },
  { file: "19-journal-pause-cuisine.webp", role: "scene", alt: "Pause gourmande sur une nappe vichy : le flacon, des fraises et une coupelle de gummies." },
  { file: "20-journal-flacon-angles.webp", role: "scene", alt: "Le flacon vu de près, des fraises et des gummies autour." },
  { file: "21-journal-lire-etiquette.webp", role: "scene", alt: "Le flacon et son étiquette illustrée, entourés de fraises." },
  { file: "22-flacon-format-portrait.webp", role: "scene", alt: "Le flacon sur une nappe vichy au jardin, des fraises tout autour." },
  { file: "23-article-conservation.webp", role: "scene", alt: "Le flacon fermé sur un plan de travail clair." },
  { file: "24-fraises-detail-saveur.webp", role: "scene", alt: "Le flacon sur un plateau rose, des fraises et des gummies au premier plan." },
  { file: "logo-proposition.png", role: "logo", alt: "FRAISE GUMMIES" },
];

const p = (s: string) => `<p>${s}</p>`;
export const TODO = (what: string) => `[À compléter : ${what}]`;
type B = { type: string; settings: Record<string, unknown> };

export async function fraiseProject(userId: string, options: { mediaDir?: string } = {}) {
  const dir = options.mediaDir ?? FRAISE_DIR;
  const pid = seedHoldout(userId, 0, "Démo FRAISE");
  const { offers } = fraiseOffers();
  const product = {
    ...emptyProduct(), name: "Gummies goût fraise", nameStatus: "provided" as const, category: "Confiserie (gummies)", sector: "maison" as const,
    summary: "Gummies tendres au goût fraise dans un flacon refermable, en trois formats : 1, 2 ou 3 flacons. Prix de démonstration.",
    facts: [{ key: "format", label: "Format", value: "flacon refermable, 1, 2 ou 3 flacons", status: "confirmed" as const, source: "user" as const }],
    variants: [],
  };
  saveProduct(pid, { ...product, price: { amount: offers[0].prix_pack_centimes / 100, currency: "EUR", status: "confirmed" as const } });
  const local = localBrand(product, "FRAISE", { business: "products" });
  const palette = { primary: "#E3363E", secondary: "#FCF6EE", accent: "#970824", light: "#FBE3DB", dark: "#230605" };
  saveBrand(pid, { ...local.brand, name: "FRAISE", generatedBy: "local" as const, tagline: "Votre rituel, côté fraise.", story: "FRAISE GUMMIES, c'est une envie simple : apporter une touche de gourmandise dans les moments du quotidien.", positioning: "Des gummies tendres au goût fraise, dans un flacon à emporter partout.", palette, direction: "fraise" });
  saveStrategy(pid, local.strategy);
  run("UPDATE projects SET store_type = ?, business_type = ?, updated_at = ? WHERE id = ?", "mono", "products", now(), pid);
  saveSettings(pid, { ...loadProject(pid).settings, storeKind: "specialty" });

  const missing: string[] = [];
  const ids: Record<string, string> = {};
  for (const m of FRAISE_MEDIA) {
    const source = path.join(dir, m.file);
    if (!fs.existsSync(source) || fs.statSync(source).size === 0) { missing.push(m.file); continue; }
    const bytes = fs.readFileSync(source), meta = await sharp(bytes).metadata();
    const a = await saveAsset({ projectId: pid, userId, data: bytes, mime: m.file.endsWith(".png") ? "image/png" : "image/webp", name: m.file, origin: "upload", role: m.role, status: "approved", meta: { demo: { isDemo: true, provenance: FRAISE_PROVENANCE }, width: meta.width, height: meta.height, alt: m.alt } });
    ids[m.file] = a.id;
  }
  const built = await composeShop(pid, "fraise", null, false);
  const spec: ThemeSpec = built.spec;
  const catalogOrder = spec.templates.index.order.map((k) => spec.templates.index.sections[k].type);
  curateFraise(spec, ids);
  return { pid, spec, missing, catalogOrder, project: loadProject(pid) };
}

/** Rédaction de la démonstration d'après les planches 01 à 07 (sections fg-*, textes des planches). */
export function curateFraise(spec: ThemeSpec, ids: Record<string, string>) {
  for (const [name, aid] of Object.entries(ids)) spec.files[name] = aid;
  const f = (name: string) => (ids[name] ? name : "");
  const alt = (name: string) => FRAISE_MEDIA.find((m) => m.file === name)?.alt ?? "";
  const U = (h: FgPageHandle) => fgUrl(h);
  const PRODUCT = `/products/${FRAISE_HANDLE}`;
  const SHOP = "/collections/all";
  const S = (type: string, settings: Record<string, unknown>, blocks: B[] = []): Row => [type, settings, blocks];
  const { offers } = fraiseOffers();
  const packImg = ["01-un-flacon-detoure.webp", "02-deux-flacons-detoures.webp", "03-trois-flacons-detoures.webp"];

  spec.name = "FRAISE GUMMIES — thème Fraise (démonstration)";
  spec.meta = { ...spec.meta, reference: undefined, demo: { isDemo: true, provenance: FRAISE_PROVENANCE, contactTest: false } };
  spec.store.shopName = "FRAISE GUMMIES";
  spec.store.business = "products";
  spec.store.paymentTypes = [];
  spec.store.seo = { title: "FRAISE GUMMIES | Votre rituel, côté fraise", description: "Gummies tendres au goût fraise dans un flacon réutilisable, en 1, 2 ou 3 flacons (boutique de démonstration, prix de démonstration)." };
  spec.settings = { ...spec.settings, logo_asset: f("logo-proposition.png"), favicon_asset: spec.settings.favicon_asset ?? "", offer_note: "Prix barrés : mêmes flacons achetés à l’unité. « Meilleure offre » : prix par flacon le plus bas." };

  // Produit principal : trois formats = trois variantes du même produit ; prix de OFFRES_VALIDEES.json (centimes).
  const main: StoreProduct = {
    ...spec.store.product,
    contentTarget: "product:main", handle: FRAISE_HANDLE, title: "Gummies goût fraise", vendor: "FRAISE GUMMIES",
    description_html: p("Des gummies tendres au goût fraise dans un flacon réutilisable, à emporter partout avec vous.") + p("Prix de démonstration : aucune vente réelle."),
    price: offers[0].prix_pack_centimes, compare_at_price: null, currency: "EUR", options: ["Format"],
    variants: offers.map((o, i) => ({ title: `${o.flacons_par_pack} flacon${o.flacons_par_pack > 1 ? "s" : ""}`, options: [`${o.flacons_par_pack} flacon${o.flacons_par_pack > 1 ? "s" : ""}`], price: o.prix_pack_centimes, available: true, sku: `DEMO-${o.id.toUpperCase()}`, image: f(packImg[i]) || undefined })),
    // Galerie (six vues) puis les trois photos détourées des formats (photo de chaque variante, hors galerie affichée).
    images: ["05-fiche-flacon-principal.webp", "06-flacon-ouvert-plongee.webp", "07-macro-gummies-texture.webp", "08-macro-etiquette-bouchon.webp", "24-fraises-detail-saveur.webp", "12-scene-cuisine.webp", ...packImg].filter((x) => ids[x]),
    tags: ["gummies", "confiserie", "goût fraise"],
    seo: { title: "Gummies goût fraise — FRAISE GUMMIES", description: "Le flacon FRAISE en 1, 2 ou 3 flacons : 16,60 €, 24,90 € (−50 % sur le 2ᵉ) ou 33,20 € (2 achetés + 1 offert). Démonstration, prix de démonstration." },
  };
  main.template_suffix = undefined;
  for (const key of Object.keys(spec.templates)) if (key.startsWith("product.")) delete spec.templates[key];
  spec.store.product = main;
  spec.store.products = [];
  spec.store.collections = [{ handle: "all", title: "Les gummies", description: "Le flacon FRAISE en trois formats.", products: [main.handle] }];

  // ------------------------------------------------------------------------------------------- Accueil (planche 01)
  spec.templates.index = fgTemplate([
    S("fg-hero", { layout: "home", heading: "Votre rituel,\n[i]côté fraise.[/i]", text: p("Gummies tendres au goût fraise<br>dans un flacon réutilisable."), text_mobile: p("Gummies tendres au<br>goût fraise dans un flacon<br>réutilisable."), button_label: "Découvrir les gummies", button_link: PRODUCT, button_arrow: true, stamp: "Le goût\nfraise au\nquotidien", stamp_mobile: "Le goût\nfraise\nautrement", image_asset: f("04-accueil-flacon-fraises.webp"), image_alt: alt("04-accueil-flacon-fraises.webp"), image_place_w: 1141, image_place_x: 273, image_place_y: -36, image_mobile_asset: f("05-fiche-flacon-principal.webp"), image_position_mobile: "50% 50%", band_text: "FRAISE GUMMIES — LE GOÛT FRAISE AU QUOTIDIEN", height: 392, height_mobile: 626 }),
    S("fg-taste", { heading: "Le goût fraise\n[r]qui fait [i]sourire.[/i][/r]", text: p("Des gummies tendres au goût fraise,<br>dans un flacon aussi joli que gourmand."), button_label: "Découvrir les gummies", button_link: PRODUCT, note: "Tendres\net gourmands", image_on: "mobile", image_asset: f("07-macro-gummies-texture.webp"), image_alt: alt("07-macro-gummies-texture.webp"), image_position: "50% 60%", image_zoom: 100, image_position_mobile: "30% 86%", image_zoom_mobile: 190, show_card: true, product: FRAISE_HANDLE, card_image_asset: f("01-un-flacon-detoure.webp"), card_title: "Le flacon FRAISE", card_title_mobile: "FRAISE GUMMIES", card_subtitle: "Gummies goût fraise", card_format: "1 flacon", card_button: "Ajouter au panier" }),
    S("fg-details", { heading: "Des détails\n[i]à savourer.[/i]", text: p("Des gummies généreux, une texture tendre<br>et une étiquette illustrée aux couleurs<br>de la fraise."), button_label: "Voir le produit", button_link: PRODUCT }, [
      { type: "photo", settings: { image_asset: f("07-macro-gummies-texture.webp"), alt: alt("07-macro-gummies-texture.webp"), position: "36% 86%", zoom: 280, position_mobile: "40% 80%", zoom_mobile: 240, caption: "Une texture\ntendre" } },
      { type: "photo", settings: { image_asset: f("08-macro-etiquette-bouchon.webp"), alt: alt("08-macro-etiquette-bouchon.webp"), position: "44% 54%", zoom: 200, position_mobile: "50% 8%", zoom_mobile: 200, caption: "Un flacon\nréutilisable" } },
      { type: "photo", settings: { image_asset: f("12-scene-cuisine.webp"), alt: alt("12-scene-cuisine.webp"), position: "100% 75%", zoom: 240, position_mobile: "100% 72%", zoom_mobile: 220, caption: "Le goût\nfraise" } },
    ]),
    S("fg-offers", { layout: "home", heading: "Un flacon,\n[i]votre façon de le choisir.[/i]", heading_mobile: "Votre format\n[r]FRAISE.[/r]", text: p("Toujours plus de gourmandise,<br>à votre rythme."), product: FRAISE_HANDLE, show_compare: true, show_last: true, show_per: "no_last", show_save: true, show_note: true, button_label: "Ajouter au panier", button_icon: false },
      offers.map((_, i) => ({ type: "offer", settings: { variant_index: i + 1, image_asset: f(packImg[i]), alt: alt(packImg[i]) } }))),
    S("fg-everyday", { heading: "Un petit format.\nUne place [r]dans[/r]\n[i]votre quotidien.[/i]", text: p("À la maison, au bureau ou en balade,<br>FRAISE GUMMIES vous accompagne<br>dans vos moments gourmands."), button_label: "Découvrir les gummies", button_link: PRODUCT, note: "Un plaisir\nau quotidien", image_asset: f("17-journal-petit-rituel.webp"), image_alt: alt("17-journal-petit-rituel.webp"), image_position: "50% 34%", image_zoom: 100, image_mobile_asset: f("22-flacon-format-portrait.webp"), image_position_mobile: "50% 46%" }),
    S("fg-duo", { heading: "La recette,\n[i]en toute clarté.[/i]", text: p("Consultez les informations figurant<br>sur le flacon."), text_mobile: p("Retrouvez toutes les informations<br>sur le produit directement sur le flacon."), button_label: "Voir les détails", button_label_mobile: "Consulter le flacon", button_link: U("la-recette"), image_asset: f("10-recette-gummies-fraises.webp"), image_alt: alt("10-recette-gummies-fraises.webp"), image_position: "0% 85%", image_zoom: 200, journal_heading: "[i]Le journal[/i] FRAISE", journal_text: "Inspirations, idées et moments gourmands autour du goût fraise.", journal_heading_mobile: "Journal", journal_text_mobile: "Nos articles autour de la fraise\net de nos gummies.", journal_link_label: "Voir tout", journal_link: U("journal"), read_label: "Lire l'article" }, [
      { type: "post", settings: { title: "5 idées pour savourer vos gummies au quotidien", title_mobile: "La fraise, une saveur intemporelle", link: U("journal-les-details-d-un-petit-rituel"), image_asset: f("17-journal-petit-rituel.webp"), position: "12% 46%" } },
      { type: "post", settings: { title: "Un goût fraise qui met de bonne humeur", title_mobile: "Nos gummies, au quotidien", link: U("journal-le-gout-fraise-en-images"), image_asset: f("18-journal-gout-fraise.webp"), position: "96% 62%" } },
    ]),
    S("fg-faqteaser", { layout: "home", heading: "Vos questions,\n[i]nos réponses.[/i]", button_label: "Voir toutes les questions", button_link: U("faq") }, [
      { type: "question", settings: { question: "Quel est le goût des gummies FRAISE ?", question_mobile: "Comment sont les gummies ?", order_mobile: 1, answer: p("Un goût fraise gourmand, dans des gummies tendres.") } },
      { type: "question", settings: { question: "Comment conserver le flacon ?", order_mobile: 2, answer: p(`Suivez les indications figurant sur l'étiquette du flacon. ${TODO("conditions de conservation du produit réel")}`) } },
      { type: "question", settings: { question: "Y a-t-il plusieurs parfums ?", question_mobile: "Proposez-vous d'autres parfums ?", order_mobile: 4, answer: p("Cette boutique présente un seul goût : la fraise, en trois formats (1, 2 ou 3 flacons).") } },
      { type: "question", settings: { question: "Où trouver les informations sur la composition ?", question_mobile: "Où trouver les informations produit ?", order_mobile: 3, answer: p(`La composition figure sur l'étiquette du flacon. ${TODO("liste des ingrédients et allergènes du produit réel")}`) } },
    ]),
    S("fg-news", { heading: "Restons en contact.", text: "Recevez nos nouveautés et nos idées gourmandes.", placeholder: "Votre adresse e-mail", button: "S'inscrire" }),
    pageRow(LOOK_01),
  ]);

  // ------------------------------------------------------------------------------------------- Fiche (planches 01 et 04)
  const fmt = { format_1_asset: f(packImg[0]), format_2_asset: f(packImg[1]), format_3_asset: f(packImg[2]) };
  const label = (what: string) => p(`${TODO(what)} Consultez les informations figurant sur le flacon.`);
  spec.templates.product = fgTemplate([
    S("fg-product", { crumb_home: "Accueil", crumb_middle: "Les gummies", crumb_middle_link: SHOP, subtitle: "Le flacon FRAISE", text: p("Des gummies tendres au goût fraise dans un flacon<br>réutilisable, à emporter partout avec vous."), text_mobile: p("Des gummies tendres au goût fraise<br>dans un flacon réutilisable."), pack_text: "Pack de [t]", single_text: "[t]", tax_note: "TTC", default_format: 3, formats_label: "Choisissez votre format :", ...fmt, qty_label: "Quantité", add_label: "Ajouter le pack", show_note: true, bar_label: "Ajouter au panier" }, [
      { type: "assurance", settings: { icon: "lock", label: "Paiement sécurisé", label_mobile: "Paiement sécurisé", order_mobile: 2, link: U("conditions-de-vente") } },
      { type: "assurance", settings: { icon: "question", label: "Aide & contact", label_mobile: "Une question ?\nContactez-nous", order_mobile: 3, link: U("contact") } },
      { type: "assurance", settings: { icon: "truck", label: "Livraison et retours", label_mobile: "Expédition\nà venir", order_mobile: 1, link: U("livraison-et-retours") } },
    ]),
    S("fg-tabs", { label: "Sommaire de la fiche" }, [
      { type: "tab", settings: { label: "Le produit", link: "#la-texture" } },
      { type: "tab", settings: { label: "La recette", link: U("la-recette") } },
      { type: "tab", settings: { label: "Utilisation", link: "#utilisation" } },
      { type: "tab", settings: { label: "Questions", link: "#questions" } },
    ]),
    S("fg-texture", { layout: "photos", anchor: "la-texture", heading: "Le goût fraise.\n[i]La texture en détail.[/i]", heading_mobile: "[r]La texture en détail.[/r]", text: p("Des gummies tendres et généreux au goût fraise,<br>pour un moment gourmand à tout moment<br>de la journée."), text_mobile: p("Des gummies tendres et généreux,<br>au délicieux goût fraise."), image_left_asset: f("07-macro-gummies-texture.webp"), image_left_position: "20% 88%", image_left_zoom: 210, image_right_asset: f("22-flacon-format-portrait.webp"), image_right_position: "50% 45%", image_right_zoom: 100, mobile_images: ["07-macro-gummies-texture.webp", "07-macro-gummies-texture.webp", "24-fraises-detail-saveur.webp"].filter((x) => ids[x]).join(","), cards_heading: "[r]Qu'est-ce qui rend\nnos gummies si spéciaux ?[/r]" }, [
      { type: "card", settings: { icon: "strawberry", title: "Goût fraise", title_mobile: "Le goût", icon_mobile: "strawberry", order_mobile: 1, text: "Un goût fraise gourmand\net équilibré.", text_mobile: "Une délicieuse\nsaveur fraise.", image_asset: f("07-macro-gummies-texture.webp"), alt: "", position: "30% 85%", zoom: 200 } },
      { type: "card", settings: { icon: "jar", title: "Format flacon", title_mobile: "Le flacon", icon_mobile: "jar", order_mobile: 4, text: "Un flacon transparent\net réutilisable de 60 douceurs.", text_mobile: "Un flacon pratique\net réutilisable.", image_asset: f("05-fiche-flacon-principal.webp"), alt: "", position: "45% 50%", zoom: 150 } },
      { type: "card", settings: { icon: "gummy", title: "Gummies rouges", title_mobile: "Le format", icon_mobile: "gummies", order_mobile: 2, text: "Des gummies tendres\net généreux.", text_mobile: "Des gummies tendres\net faciles à savourer.", image_asset: f("06-flacon-ouvert-plongee.webp"), alt: "", position: "60% 85%", zoom: 200 } },
      { type: "card", settings: { icon: "leaf", title: "Étiquette illustrée", title_mobile: "L'aspect", icon_mobile: "sparkle", order_mobile: 3, text: "Une étiquette aux couleurs\nde la fraise.", text_mobile: "Une belle couleur rouge\net une texture gourmande.", image_asset: f("08-macro-etiquette-bouchon.webp"), alt: "", position: "48% 58%", zoom: 170 } },
    ]),
    S("fg-uses", { label: "Usages", anchor: "utilisation" }, [
      { type: "use", settings: { order_mobile: 2, title: "À la maison.", text: "Un moment gourmand\ndans votre quotidien.", image_asset: f("12-scene-cuisine.webp"), alt: alt("12-scene-cuisine.webp"), position: "50% 40%", zoom: 100, position_mobile: "50% 50%" } },
      { type: "use", settings: { order_mobile: 1, title: "En balade.", text: "Le format idéal à emporter\npartout avec vous.", image_asset: f("13-scene-jardin.webp"), alt: alt("13-scene-jardin.webp"), position: "50% 45%", zoom: 100, position_mobile: "50% 50%" } },
      { type: "use", settings: { mobile_only: true, order_mobile: 3, title: "Au bureau.", text: "Une pause gourmande\nentre deux rendez-vous.", image_asset: f("14-scene-bureau.webp"), alt: alt("14-scene-bureau.webp"), position: "50% 50%", position_mobile: "50% 50%" } },
    ]),
    S("fg-info", { anchor: "informations", heading: "Tout savoir sur le flacon.", show_offers: true, offers_heading: "Choisissez votre format.", offers_link: "#produit", ...fmt }, [
      { type: "row", settings: { label: "Ingrédients", short_mobile: "Informations à compléter.", short: "Informations à compléter. Consultez les informations figurant sur le flacon.", body: label("liste des ingrédients et allergènes du produit réel") } },
      { type: "row", settings: { label: "Valeurs nutritionnelles", short_mobile: "Informations à compléter.", short: "Informations à compléter. Consultez les informations figurant sur le flacon.", body: label("valeurs nutritionnelles du produit réel") } },
      { type: "row", settings: { label: "Utilisation", label_mobile: "Conseils d'utilisation", short: "Consultez les indications figurant sur le flacon.", body: p("Consultez les indications figurant sur le flacon.") } },
      { type: "row", settings: { label: "Conservation", short_mobile: "Informations à compléter.", short: "Informations à compléter. Consultez les informations figurant sur le flacon.", body: label("conditions de conservation du produit réel") } },
    ]),
    S("fg-faqteaser", { layout: "product", heading: "Questions fréquentes.", heading_mobile: "[i]Vos questions, nos réponses.[/i]", button_label: "", button_link: U("faq") }, [
      { type: "question", settings: { question: "Quel est le goût des gummies FRAISE ?", question_mobile: "Comment sont les gummies ?", order_mobile: 1, answer: p("Un goût fraise gourmand, dans des gummies tendres. « Goût fraise » ne signifie pas une teneur en fruits : la composition figure sur l'étiquette.") } },
      { type: "question", settings: { question: "Y a-t-il plusieurs parfums ?", question_mobile: "Proposez-vous d'autres parfums ?", order_mobile: 4, answer: p("Cette boutique présente un seul goût, la fraise, en trois formats (1, 2 ou 3 flacons).") } },
      { type: "question", settings: { question: "Comment conserver le flacon ?", order_mobile: 2, answer: p(`Suivez les indications de l'étiquette. ${TODO("conditions de conservation du produit réel")}`) } },
      { type: "question", settings: { question: "Où trouver les informations sur la composition ?", question_mobile: "Où trouver les informations produit ?", order_mobile: 3, answer: p(`Sur l'étiquette du flacon. ${TODO("liste des ingrédients et allergènes du produit réel")}`) } },
    ]),
    S("fg-cta", { heading: "Votre rituel, côté fraise.", heading_mobile: "Votre rituel,\n[i]côté fraise.[/i]", format: 3, button_label: "Ajouter le pack", button_label_mobile: "Ajouter au panier", image_asset: f("07-macro-gummies-texture.webp") }),
    pageRow(LOOK_PRODUCT),
  ]);
  spec.templates.product.sections["main-product"] = { type: "main-product", settings: { gallery_layout: "grid", sticky_bar: false }, disabled: true };
  spec.templates.product.order.push("main-product");

  // ------------------------------------------------------------------------------------------- Boutique (planches 02 et 05)
  spec.templates.collection = fgTemplate([
    S("fg-hero", { layout: "page", variant: "b", eyebrow: "Les gummies", heading: "À chacun\nson format\n[s]FRAISE.[/s]", text: p("Gummies tendres au goût fraise dans<br>un flacon refermable. Le même plaisir,<br>plus de moments à partager."), text_mobile: p("Les mêmes gummies<br>au délicieux goût fraise,<br>à savourer selon vos envies."), stamp: "LE\nGOÛT FRAISE\nAU QUOTIDIEN", stamp_heart: true, image_asset: f("05-fiche-flacon-principal.webp"), image_alt: alt("05-fiche-flacon-principal.webp"), image_place_w: 625, image_place_x: 690, image_place_y: -30, image_mobile_asset: f("05-fiche-flacon-principal.webp"), height: 470, height_mobile: 320 }),
    S("fg-offers", { layout: "shop", heading: "", heading_mobile: "", text: "", product: FRAISE_HANDLE, show_compare: false, show_last: false, show_per: "all", show_save: true, show_note: true, button_label: "Ajouter au panier", button_icon: false },
      offers.map((_, i) => ({ type: "offer", settings: { variant_index: i + 1, image_asset: f(["01-un-flacon-detoure.webp", "15-offre-deux-flacons.webp", "16-offre-trois-flacons.webp"][i]), alt: alt(["01-un-flacon-detoure.webp", "15-offre-deux-flacons.webp", "16-offre-trois-flacons.webp"][i]) } }))),
    S("fg-strip", { label: "En détail", heading: "", mobile_title: "Une gourmandise\nà emporter partout.", mobile_text: "Le format idéal pour les petites\npauses du quotidien.", mobile_button: "Découvrir les gummies", mobile_link: PRODUCT }, [
      { type: "photo", settings: { image_asset: f("24-fraises-detail-saveur.webp"), alt: "", position: "40% 70%", zoom: 150, caption: "Une gourmandise\nà emporter" } },
      { type: "photo", settings: { image_asset: f("07-macro-gummies-texture.webp"), alt: "", position: "28% 86%", zoom: 220, caption: "À la maison", icon_mobile: "home" } },
      { type: "photo", settings: { image_asset: f("10-recette-gummies-fraises.webp"), alt: "", position: "100% 80%", zoom: 200, caption: "Au bureau", icon_mobile: "person" } },
      { type: "photo", settings: { image_asset: f("06-flacon-ouvert-plongee.webp"), alt: "", position: "50% 30%", zoom: 160, caption: "En déplacement", icon_mobile: "walk" } },
      { type: "photo", settings: { image_asset: f("08-macro-etiquette-bouchon.webp"), alt: "", position: "44% 56%", zoom: 170, caption: "" } },
      { type: "point", settings: { icon: "heart", text: "Le même goût fraise" } },
      { type: "point", settings: { icon: "jar", text: "Format pratique\net refermable" } },
      { type: "point", settings: { icon: "gummy", text: "60 douceurs par flacon" } },
      { type: "point", settings: { icon: "bag", text: "À emporter partout" } },
    ]),
    pageRow(LOOK_02),
  ]);
  for (const key of Object.keys(spec.templates)) if (key.startsWith("collection.")) delete spec.templates[key];

  // ------------------------------------------------------------------------------------------- Recette, histoire, journal
  type PageDef = { seo: string; rows: Row[] };
  const pages: Partial<Record<FgPageHandle, PageDef>> = {};
  const look2 = pageRow(LOOK_02), look3 = pageRow(LOOK_03), lookBuy = pageRow(LOOK_BUY);
  pages["la-recette"] = { seo: "La recette FRAISE GUMMIES : texture, goût et informations du flacon (à compléter depuis l'étiquette).", rows: [
    S("fg-hero", { layout: "page", variant: "c", eyebrow: "La recette", heading: "La fraise,\nsous toutes\nses facettes.", text: p("Une texture tendre, un goût fraise<br>gourmand, une forme généreuse :<br>Fraise Gummies, c'est tout simplement<br>le plaisir d'une parenthèse fruitée."), text_mobile: p("Des gummies tendres au bon goût fraise,<br>dans un format généreux."), stamp_mobile: "Un délicieux\ngoût fraise", note_1: "Une texture\ntendre", note_2: "Un goût\nfraise gourmand", image_asset: f("07-macro-gummies-texture.webp"), image_alt: alt("07-macro-gummies-texture.webp"), image_place_w: 1000, image_place_x: 520, image_place_y: -520, image_mobile_asset: f("07-macro-gummies-texture.webp"), image_position_mobile: "30% 86%", image_zoom_mobile: 180, height: 470, height_mobile: 240 }),
    S("fg-recipe", { label: "La recette en détail", anchor: "informations", heading: "Le plaisir\ndu détail.", text: "Une texture tendre et un goût fraise plein\nde gourmandise, pour faire de chaque pause\nun petit moment de plaisir.", bubble: "Le plaisir\ndu détail !", image_1_asset: f("09-recette-composition-fraise.webp"), image_1_alt: alt("09-recette-composition-fraise.webp"), image_1_position: "40% 60%", image_1_zoom: 110, image_2_asset: f("10-recette-gummies-fraises.webp"), image_2_position: "30% 85%", image_2_zoom: 170, image_3_asset: f("08-macro-etiquette-bouchon.webp"), image_3_position: "8% 72%", image_3_zoom: 260, image_2_position_mobile: "70% 92%", image_2_zoom_mobile: 260, image_3_position_mobile: "6% 70%", image_3_zoom_mobile: 280, show_card: true, product: FRAISE_HANDLE, card_image_asset: f("01-un-flacon-detoure.webp"), card_title: "FRAISE GUMMIES", card_subtitle: "60 douceurs", card_button: "Ajouter au panier" }, [
      { type: "row", settings: { icon: "leaf", label: "Composition", short: "À compléter depuis l'étiquette.", body: p(`${TODO("liste des ingrédients et allergènes, telle qu'elle figure sur l'étiquette du produit réel")} « Goût fraise » ne signifie pas une teneur en fruits.`) } },
      { type: "row", settings: { icon: "doc", label: "Informations nutritionnelles", short: "À compléter depuis l'étiquette.", body: p(TODO("tableau des valeurs nutritionnelles de l'étiquette du produit réel")) } },
      { type: "row", settings: { icon: "bowl", label: "Conseils d'utilisation", short: "Consultez les indications figurant sur le flacon.", body: p("Consultez les indications figurant sur le flacon.") } },
      { type: "row", settings: { icon: "box", label: "Conservation", short: "À compléter depuis l'étiquette.", body: p(TODO("conditions de conservation indiquées sur l'étiquette du produit réel")) } },
    ]),
    look2,
  ] };
  pages["notre-histoire"] = { seo: "Notre histoire : un peu de fraise dans le quotidien (texte de marque illustratif de la démonstration).", rows: [
    S("fg-hero", { layout: "page", variant: "d", eyebrow: "Notre histoire", heading: "Un peu de fraise\ndans le quotidien.", text: p("Fraise Gummies, c'est une envie simple :<br>apporter une touche de gourmandise dans<br>des moments du quotidien. Un flacon, un goût<br>fraise, et l'idée que les petites choses peuvent<br>faire de grands sourires."), text_mobile: p("<strong>FRAISE GUMMIES</strong>, c'est une envie simple :<br>apporter plus de gourmandise dans les<br>moments de la vie, avec un goût fraise<br>qui fait sourire."), note_1: "Un goût\nqui fait sourire\nle quotidien.", image_asset: f("11-histoire-composition-flacon.webp"), image_alt: alt("11-histoire-composition-flacon.webp"), image_place_w: 640, image_place_x: 800, image_place_y: -20, image_mobile_asset: f("05-fiche-flacon-principal.webp"), height: 375, height_mobile: 300 }),
    S("fg-story", { label: "Nos principes" }, [
      { type: "item", settings: { title: "Le goût du détail", text: "Une texture tendre\net un goût fraise généreux,\npour des instants simples\net savoureux.", image_asset: f("10-recette-gummies-fraises.webp"), position: "100% 78%", zoom: 260 } },
      { type: "item", settings: { title: "Un univers qui sourit", text: "Des couleurs, des formes\net un univers fruité qui\nmettent de la bonne humeur\ndans la journée.", image_asset: f("07-macro-gummies-texture.webp"), position: "25% 82%", zoom: 220 } },
      { type: "item", settings: { title: "Le format du quotidien", text: "Un flacon pratique\net refermable, à emporter\npartout pour savourer\nvos moments fraise.", image_asset: f("08-macro-etiquette-bouchon.webp"), position: "60% 6%", zoom: 200 } },
    ]),
    S("fg-band", { heading: "Voir la vie\ncôté fraise.", text_mobile: "Des gummies qui transforment\nles petits instants en moments gourmands.", button_label: "Découvrir les gummies", button_link: PRODUCT, image_asset: f("13-scene-jardin.webp"), image_alt: alt("13-scene-jardin.webp"), image_position: "50% 50%", image_zoom: 100 }),
    look2,
  ] };
  const post = (category: string, title: string, text: string, link: FgPageHandle, image: string, position: string, show_link = true, tag_mobile = "", text_mobile = "") => ({ type: "post", settings: { category, title, text, link: U(link), image_asset: f(image), position, zoom: 100, show_link, tag_mobile, text_mobile } });
  pages["journal"] = { seo: "Le journal FRAISE : idées et instants gourmands autour du goût fraise.", rows: [
    S("fg-journal", { eyebrow: "Journal", heading: "Les petites\nparenthèses [s]FRAISE.[/s]", text: "Des inspirations, des idées et des instants gourmands\nautour de notre univers fraise.", all_label: "Tout", filters: "Le goût, Le quotidien, Les détails", filters_mobile: "Inspiration, Recettes, Coulisses", text_mobile: "Inspirations, idées et coulisses autour\nde nos gummies et de l'univers fraise.", read_label: "Lire l'article", empty_text: "Aucun article dans cette catégorie pour le moment." }, [
      post("Le goût", "Les détails\nd'un petit rituel.", "Un moment simple, un goût fraise,\net l'envie de faire une pause\ndans le quotidien.", "journal-les-details-d-un-petit-rituel", "17-journal-petit-rituel.webp", "50% 40%", true, "Inspiration", "Pourquoi nos gummies goût fraise\nsont parfaits pour les petites pauses\ndu quotidien."),
      post("Le goût", "Le goût fraise en images", "Couleurs, textures, et toute la gourmandise\nen quelques clichés.", "journal-le-gout-fraise-en-images", "18-journal-gout-fraise.webp", "70% 75%", true, "Inspiration", "Une immersion dans notre\nunivers gourmand."),
      post("Le quotidien", "Une pause côté cuisine", "Des idées d'instants gourmands\nautour du goût fraise.", "journal-une-pause-cote-cuisine", "19-journal-pause-cuisine.webp", "45% 50%", true, "Recettes", "Des idées simples pour\nsavourer vos gummies\nautrement."),
      post("Les détails", "Le flacon sous tous les angles", "Zoom sur le design et les détails\nde notre flacon.", "journal-le-flacon-sous-tous-les-angles", "20-journal-flacon-angles.webp", "50% 30%", false, "Coulisses", "Zoom sur les détails de notre\nflacon et de son design."),
      post("Le quotidien", "Lire une étiquette\nsimplement.", "Les informations à connaître\nsur votre produit.", "journal-lire-une-etiquette", "21-journal-lire-etiquette.webp", "85% 55%", false, "Conseils", "Les informations à retrouver\nsur le flacon."),
      post("Les détails", "Conserver son flacon", "Refermer, ranger, suivre l'étiquette :\nles bons réflexes.", "journal-conserver-son-flacon", "23-article-conservation.webp", "50% 50%", false, "Conseils"),
    ]),
    S("fg-news", { visibility: "mobile", heading: "Restez dans l'univers FRAISE", text: "Recevez nos inspirations et nos nouveautés.", placeholder: "Votre adresse e-mail", button: "S'inscrire" }),
    look2,
  ] };
  const more = (a: FgPageHandle, ta: string, ia: string, b: FgPageHandle, tb: string, ib: string): B[] => [{ type: "post", settings: { title: ta, link: U(a), image_asset: f(ia) } }, { type: "post", settings: { title: tb, link: U(b), image_asset: f(ib) } }];
  const article = (category: string, heading: string, lead: string, image: string, position: string, body: string, box: [string, string] | null, m: B[]): PageDef => ({ seo: `${heading.replace(/\n/g, " ")} — le journal FRAISE.`, rows: [
    S("fg-article", { back_label: "Retour au journal", back_link: U("journal"), category, heading, lead, meta: "Article de démonstration — aucune recommandation de santé.", image_asset: f(image), image_alt: alt(image), image_position: position, image_zoom: 100, body, box_title: box?.[0] ?? "", box_text: box?.[1] ?? "", more_label: "À lire aussi" }, m),
    look2,
  ] });
  pages["journal-les-details-d-un-petit-rituel"] = article("Le goût", "Les détails\nd'un petit rituel.", "Un moment simple, un goût fraise, et l'envie de faire une pause dans le quotidien.", "17-journal-petit-rituel.webp", "50% 40%",
    p("Un petit rituel, c'est d'abord un moment que l'on choisit : une pause au milieu de l'après-midi, une table dressée sans raison particulière, un flacon que l'on ouvre en prenant son temps.") + p("Les détails font le reste : une nappe à carreaux, quelques fraises dans un bol, un verre d'eau fraîche, et le bouchon rouge du flacon FRAISE posé à côté.") + p("Rien d'extraordinaire, et c'est justement l'idée : un goût fraise, une couleur gaie, un instant qui fait sourire."),
    ["L'idée à retenir", p("Un rituel n'a pas besoin d'être compliqué : un moment, un goût, une pause.")], more("journal-le-gout-fraise-en-images", "Le goût fraise en images", "18-journal-gout-fraise.webp", "journal-une-pause-cote-cuisine", "Une pause côté cuisine", "19-journal-pause-cuisine.webp"));
  pages["journal-le-gout-fraise-en-images"] = article("Le goût", "Le goût fraise\nen images.", "Couleurs, textures, et toute la gourmandise en quelques clichés.", "18-journal-gout-fraise.webp", "50% 55%",
    p("Le rouge vif des fraises coupées, le sucre qui accroche la lumière sur les gummies, le bois clair d'une planche : quelques images suffisent pour raconter un goût.") + p("Pour photographier vos gummies, choisissez une lumière naturelle douce, un fond simple et quelques fraises fraîches autour du flacon. Le goût fraise se devine dans les couleurs.") + p("« Goût fraise » décrit une saveur : la composition exacte figure sur l'étiquette du flacon."),
    null, more("journal-les-details-d-un-petit-rituel", "Les détails d'un petit rituel", "17-journal-petit-rituel.webp", "journal-le-flacon-sous-tous-les-angles", "Le flacon sous tous les angles", "20-journal-flacon-angles.webp"));
  pages["journal-une-pause-cote-cuisine"] = article("Le quotidien", "Une pause\ncôté cuisine.", "Des idées d'instants gourmands autour du goût fraise.", "19-journal-pause-cuisine.webp", "45% 50%",
    p("La cuisine est souvent l'endroit où l'on s'arrête un instant : un café qui refroidit, une coupelle posée sur la nappe, le flacon FRAISE à portée de main.") + p("Quelques idées simples : dresser une petite coupelle pour partager, garder le flacon bien refermé entre deux pauses, l'emporter sur la table du jardin quand le temps s'y prête.") + p("À chacun son moment : FRAISE GUMMIES est une confiserie, à savourer quand on en a envie."),
    ["Bon réflexe", p("Refermez bien le flacon après chaque ouverture et suivez les indications de l'étiquette.")], more("journal-conserver-son-flacon", "Conserver son flacon", "23-article-conservation.webp", "journal-lire-une-etiquette", "Lire une étiquette simplement", "21-journal-lire-etiquette.webp"));
  pages["journal-le-flacon-sous-tous-les-angles"] = article("Les détails", "Le flacon sous\ntous les angles.", "Zoom sur le design et les détails de notre flacon.", "20-journal-flacon-angles.webp", "50% 40%",
    p("Un bouchon rouge mat, un verre transparent qui laisse voir les gummies, une étiquette crème illustrée d'une fraise et de quelques feuilles : le flacon FRAISE se reconnaît de loin.") + p("Son format se glisse dans un sac et se referme après chaque pause. « Réutilisable » décrit l'usage du flacon de la démonstration ; pour un produit réel, cette information reste à confirmer par la marque.") + p(TODO("dimensions, contenance et matériaux du flacon du produit réel")),
    null, more("journal-lire-une-etiquette", "Lire une étiquette simplement", "21-journal-lire-etiquette.webp", "journal-les-details-d-un-petit-rituel", "Les détails d'un petit rituel", "17-journal-petit-rituel.webp"));
  pages["journal-lire-une-etiquette"] = article("Le quotidien", "Lire une étiquette\nsimplement.", "Les informations à connaître sur votre produit.", "21-journal-lire-etiquette.webp", "70% 50%",
    p("Sur l'étiquette d'une confiserie, on trouve en général la dénomination du produit, la liste des ingrédients, les allergènes mis en évidence, la quantité, la date de durabilité et les conditions de conservation.") + p("Ces informations font foi : en cas de doute, c'est toujours l'étiquette du flacon qu'il faut consulter.") + p(TODO("informations de l'étiquette du produit réel — aucune n'est inventée dans cette démonstration")),
    ["Où regarder ?", p("Sur l'étiquette du flacon, et sur la page « La recette » une fois les informations complétées.")], more("journal-conserver-son-flacon", "Conserver son flacon", "23-article-conservation.webp", "journal-le-gout-fraise-en-images", "Le goût fraise en images", "18-journal-gout-fraise.webp"));
  pages["journal-conserver-son-flacon"] = article("Les détails", "Conserver\nson flacon.", "Refermer, ranger, suivre l'étiquette : les bons réflexes.", "23-article-conservation.webp", "50% 50%",
    p("Pour profiter de vos gummies, quelques gestes simples : refermer le bouchon après chaque ouverture, ranger le flacon à l'abri de la chaleur et de la lumière directe.") + p("Les conditions précises de conservation et la date de durabilité figurent sur l'étiquette du produit.") + p(TODO("conditions de conservation du produit réel")),
    null, more("journal-une-pause-cote-cuisine", "Une pause côté cuisine", "19-journal-pause-cuisine.webp", "journal-lire-une-etiquette", "Lire une étiquette simplement", "21-journal-lire-etiquette.webp"));

  // Achat et aide (planche 03) : délais, frais, transporteurs, retours et conditions ne sont jamais inventés :
  // « [À compléter : …] » tant que la boutique ne les a pas donnés.
  spec.templates.cart = fgTemplate([
    S("fg-hero", { layout: "page", layout_mobile: "text", variant: "e", heading: "Votre panier,\n[i]côté fraise.[/i]", text: p("Vérifiez votre sélection avant de passer commande."), image_asset: f("24-fraises-detail-saveur.webp"), image_alt: "", image_place_w: 646, image_place_x: 767, image_place_y: -40, height: 470, height_mobile: 150 }),
    S("fg-cart", { ...cartSettings("fr", { checkoutPage: U("commande"), shopLink: SHOP, emptyImage: f("05-fiche-flacon-principal.webp"), footImage: f("12-scene-cuisine.webp"), units: "[n] flacons au total", emptyButton: "Découvrir les gummies" }), foot_image_position: "100% 70%", foot_image_zoom: 300, line_brand: "FRAISE GUMMIES", empty_sub: "Partez à la découverte de nos gummies goût fraise.", empty_title: "Un peu de place\npour FRAISE ?" }),
    lookBuy,
  ]);
  pages["commande"] = { seo: "Commande de démonstration FRAISE GUMMIES : aucun paiement, aucun envoi.", rows: [
    S("fg-checkout", { image_asset: f("07-macro-gummies-texture.webp"), image_position: "30% 88%", image_zoom: 200, title_1: "Votre commande\nen quelques étapes.", title_1m: "Presque dans\nvotre panier.", title_2: "Votre livraison.", text_2: "Renseignez votre adresse pour consulter les modes de livraison disponibles.", ship_text: `Les modes de livraison de la boutique s'afficheront ici. ${TODO("transporteurs, délais et frais de livraison")}`, title_3: "La dernière étape.", text_3: "Exemple d'écran de paiement : aucune saisie,\naucun débit dans cette démonstration.", done_image_asset: f("05-fiche-flacon-principal.webp"), done_link: "/", line_brand: "FRAISE GUMMIES", units_label: "[n] flacons", secure_text: "Dans la boutique réelle, le paiement est traité par la plateforme de la boutique. Démonstration : rien n'est transmis." }),
    lookBuy,
  ] };
  // Questions des planches 03 (ordinateur, six) et 06 (téléphone, sept : « Comment choisir mon lot ? » en plus).
  const faq: { c: string; q: string; qm?: string; a: string; v?: "all" | "desktop" | "mobile" }[] = [
    { c: "Produit", q: "Où trouver la composition ?", a: p("La composition de nos gummies est indiquée directement sur l'étiquette du flacon. Pour toute information détaillée, merci de vous référer aux indications figurant sur l'emballage.") + p(TODO("composition du produit réel")) },
    { c: "Utilisation", q: "Où lire les conseils d'utilisation ?", a: p("Les conseils d'utilisation figurent sur l'étiquette du flacon.") },
    { c: "Produit", q: "Comment conserver mon flacon ?", qm: "Comment conserver le flacon ?", a: p(`Refermez bien le flacon et suivez les conditions de conservation de l'étiquette. ${TODO("conditions de conservation du produit réel")}`) },
    { c: "Commande", q: "Comment choisir mon lot ?", a: p("Trois formats du même flacon : 1 flacon (16,60 €), 2 flacons (24,90 €, −50 % sur le deuxième) ou 3 flacons (33,20 €, 2 achetés + 1 offert). Prix de démonstration."), v: "mobile" },
    { c: "Commande", q: "Comment suivre ma commande ?", a: p(`Rendez-vous sur la page <a href="${U("suivi-de-commande")}">Suivi de commande</a> avec votre numéro de commande et votre e-mail.`) },
    { c: "Commande", q: "Comment demander un retour ?", a: p(`Écrivez-nous depuis la page <a href="${U("contact")}">Contact</a>. Conditions et délais : ${TODO("politique de retour de la boutique")}.`) },
    { c: "Commande", q: "Comment vous contacter ?", a: p(`Par le formulaire de la page <a href="${U("contact")}">Contact</a>.`) },
  ];
  pages["faq"] = { seo: "Questions fréquentes FRAISE GUMMIES : composition, utilisation, conservation, commande.", rows: [
    S("fg-hero", { layout: "page", layout_mobile: "side", variant: "g", heading: "On vous répond\n[i]avec plaisir.[/i]", heading_mobile: "On vous\nrépond avec\n[i]plaisir.[/i]", text: p("Retrouvez ici les réponses aux questions<br>les plus fréquentes sur nos gummies goût fraise."), text_mobile: p("Toutes les réponses à vos<br>questions sur nos gummies<br>goût fraise."), image_mobile_asset: f("10-recette-gummies-fraises.webp"), image_position_mobile: "100% 40%", image_zoom_mobile: 150, image_asset: f("24-fraises-detail-saveur.webp"), image_alt: "", image_place_w: 593, image_place_x: 776, image_place_y: -20, height: 340, height_mobile: 200 }),
    S("fg-faq", { image_asset: f("10-recette-gummies-fraises.webp"), image_position: "96% 70%", image_zoom: 180, bubble: "Toujours\nle même bon goût\nfraise !", contact_link: U("contact"), all_label: "Tout", contact_title_mobile: "Une autre question ?" }, faq.map((x) => ({ type: "question", settings: { category: x.c, question: x.q, question_mobile: x.qm ?? "", answer: x.a, visibility: x.v ?? "all" } }))),
    look3,
  ] };
  pages["contact"] = { seo: "Contacter FRAISE GUMMIES : une question, une remarque ou simplement envie de nous écrire.", rows: [
    S("fg-contact", { heading: "Un petit mot ?", heading_mobile: "Un petit\n[i]mot ?[/i]", text: "Une question, une remarque ou simplement envie\nde nous écrire ? Notre équipe vous répond avec plaisir.", text_mobile: "Nous sommes à votre écoute.\nUne question, une demande\nou simplement un message ?\nÉcrivez-nous, nous vous\nrépondons avec plaisir.", cards_title: "Besoin d'une réponse rapide ?", privacy_link: U("confidentialite"), mode: "demo", image_asset: f("05-fiche-flacon-principal.webp"), image_alt: alt("05-fiche-flacon-principal.webp"), image_position: "40% 50%", image_zoom: 100 }, [
      { type: "card", settings: { icon: "doc", title: "FAQ", title_mobile: "Consultez\nnotre FAQ", text: "Trouvez rapidement une réponse\nà vos questions.", text_mobile: "Les réponses aux\nquestions fréquentes.", order_mobile: 1, link_label: "Voir la FAQ", link: U("faq") } },
      { type: "card", settings: { icon: "box", title: "Suivi de commande", title_mobile: "Suivi de\ncommande", text: "Suivez l'état de votre commande\nen quelques clics.", text_mobile: "Où en est\nvotre colis ?", order_mobile: 3, link_label: "Suivre ma commande", link: U("suivi-de-commande") } },
      { type: "card", settings: { icon: "truck", title: "Livraison et retours", title_mobile: "Livraison\n& retours", text: "Toutes les informations pratiques.", text_mobile: "Toutes les\ninformations utiles.", order_mobile: 2, link_label: "Nos conditions", link: U("livraison-et-retours") } },
    ]),
    look3,
  ] };
  pages["livraison-et-retours"] = { seo: "Livraison, suivi et retours FRAISE GUMMIES (conditions à compléter par la boutique).", rows: [
    S("fg-hero", { layout: "page", layout_mobile: "side", variant: "h", heading: "Les infos\n[i]qui vont avec.[/i]", heading_mobile: "Les infos\nqui vont [i]avec.[/i]", text: p("Retrouvez ici toutes les informations pratiques sur la livraison,<br>le suivi de commande et les retours."), text_mobile: p("De la commande à la réception,<br>on vous guide à chaque étape."), image_mobile_asset: f("24-fraises-detail-saveur.webp"), image_position_mobile: "100% 70%", image_zoom_mobile: 160, image_asset: f("07-macro-gummies-texture.webp"), image_alt: "", image_place_w: 1100, image_place_x: 560, image_place_y: -700, height: 330, height_mobile: 172 }),
    S("fg-shipping", { help_link: U("contact"), help_title_mobile: "Une question sur votre commande ?", image_asset: f("24-fraises-detail-saveur.webp"), image_position: "20% 70%", image_zoom: 250 }, [
      { type: "part", settings: { icon: "truck", icon_mobile: "truck", anchor: "livraison", title: "Livraison", title_mobile: "Livraison de votre commande", text_mobile: p("Nous préparons soigneusement votre commande et la confions à un transporteur pour la livraison. Les conditions de livraison sont précisées lors de la finalisation de votre commande."), note_mobile: "Conditions commerciales à compléter\n(informations à valider).", text: p("Nous préparons vos commandes avec soin. Les options et délais de livraison sont indiqués au moment de la commande."), note: `Les frais et délais de livraison seront précisés à l'étape de commande. ${TODO("zones, transporteurs, délais et frais")}` } },
      { type: "part", settings: { icon: "check-circle", icon_mobile: "mail", anchor: "suivi", title: "Suivi de commande", text_mobile: p("Dès l'expédition de votre commande, vous recevez un e-mail avec un lien de suivi pour suivre l'acheminement de votre colis en temps réel."), hide_note_mobile: true, text: p("Dès l'expédition, vous recevez un e-mail avec un lien de suivi pour suivre votre colis."), note: "Les modalités de suivi sont communiquées par e-mail après expédition." } },
      { type: "part", settings: { icon: "return", icon_mobile: "box", anchor: "retours", title: "Retours", title_mobile: "Retours et échanges", text_mobile: p("Si vous souhaitez effectuer un retour, contactez notre service client. Nous vous guiderons dans la démarche."), note_mobile: "Conditions commerciales à compléter\n(informations à valider).", text: p("Si vous n'êtes pas satisfait(e), vous pouvez demander un retour selon nos conditions générales de vente."), note: `Conditions commerciales à compléter. ${TODO("politique de retour et délai de rétractation")}` } },
    ]),
    look3,
  ] };
  pages["suivi-de-commande"] = { seo: "Suivre une commande FRAISE GUMMIES (démonstration : résultat d'exemple).", rows: [
    S("fg-track", { heading: "Où en est\n[i]votre[/i] FRAISE ?", heading_mobile: "Où en est\nvotre [r]FRAISE ?[/r]", text: "Entrez votre numéro de commande et votre e-mail pour\nsuivre l'état de votre colis.", text_mobile: "Renseignez les informations ci-dessous\npour suivre l'acheminement de votre commande.", number_ph_mobile: "Ex. : #12345", email_label_mobile: "E-mail utilisé lors de l'achat", hint_title: "Où trouver mon numéro de commande ?", hint_text: "Vous le trouverez dans l'e-mail de confirmation de votre commande.", hint_link_label: "Vous ne l'avez pas reçu ? Contactez-nous.", mode: "demo", help_text: "Si vous rencontrez un problème avec le suivi de votre commande,\nn'hésitez pas à nous contacter.", help_link: U("contact"), image_asset: f("22-flacon-format-portrait.webp"), image_alt: alt("22-flacon-format-portrait.webp"), image_position: "50% 40%", image_zoom: 100 }),
    look3,
  ] };
  const legal = (heading: string, body: string, cookies = false): PageDef => ({ seo: `${heading.replace(/\n/g, " ")} — FRAISE GUMMIES.`, rows: [S("fg-legal", { heading, body, show_cookies_button: cookies }), look3] });
  const year = new Date().getFullYear();
  pages["mentions-legales"] = legal("Mentions\n[i]légales.[/i]", p(`Boutique de démonstration du studio (${year}) : aucune vente réelle.`) + p(TODO("éditeur du site, forme juridique, adresse, immatriculation, directeur de la publication, hébergeur")));
  pages["conditions-de-vente"] = legal("Conditions\n[i]générales de vente.[/i]", p("Les prix affichés (16,60 €, 24,90 €, 33,20 €) sont des prix de démonstration : aucune commande n'est possible dans cette boutique d'exemple.") + p(TODO("conditions générales de vente : prix, paiement, livraison, rétractation, garanties légales, service client")));
  pages["confidentialite"] = legal("Politique de\n[i]confidentialité.[/i]", p("Les formulaires de cette démonstration n'envoient rien ; les choix de cookies restent dans votre navigateur.") + p(TODO("responsable du traitement, données collectées, finalités, durées, droits")));
  pages["cookies"] = legal("Cookies.", p("Les cookies nécessaires font fonctionner le site. La mesure d'audience est facultative et ne démarre qu'avec votre accord ; vous pouvez changer d'avis à tout moment.") + p(TODO("liste des cookies et outils utilisés par la boutique")), true);

  // Pages du site (ordre de FG_PAGES) ; les anciennes pages de la composition du catalogue sont retirées.
  for (const key of Object.keys(spec.templates)) if (key.startsWith("page.")) delete spec.templates[key];
  spec.store.pages = FG_PAGES.filter((pg) => pages[pg.handle]).map((pg) => {
    spec.templates[`page.${pg.suffix}`] = fgTemplate(pages[pg.handle]!.rows);
    return { handle: pg.handle, title: pg.fr, template_suffix: pg.suffix, body_html: "", seo: { title: `${pg.fr} — FRAISE GUMMIES`, description: pages[pg.handle]!.seo } };
  });

  // ------------------------------------------------------------------------------------------- En-tête, pied, menus
  const header = spec.groups.header;
  const hid = header.order.find((id) => header.sections[id].type === "fg-header")!;
  header.sections[hid].settings = headerSettings("fr", { demo: true, checkoutPage: U("commande"), cookiesLink: U("cookies"), logo: f("logo-proposition.png"), bandBrand: "FRAISE GUMMIES", bandText: "Le goût fraise au quotidien", copyright: "Fraise Gummies. Tous droits réservés.", lineBrand: "FRAISE GUMMIES", units: "[n] flacons au total" });
  const footer = spec.groups.footer;
  const fid = footer.order.find((id) => footer.sections[id].type === "fg-footer")!;
  footer.sections[fid].settings = { ...footerSettings("fr", { logo: f("logo-proposition.png"), bottom: "FRAISE GUMMIES — Le goût fraise au quotidien — boutique de démonstration, prix de démonstration", copyright: "Fraise Gummies", mobileText: "Des nouvelles, des coulisses et plus encore.", socialPlaceholder: true }), journal_mobile_title: "Restez dans l'univers FRAISE", menu_help_journal: "footer-journal", menu_legal_journal: "legal-journal" };
  spec.store.menus["main-menu"] = { title: "Navigation", links: [{ title: "Les gummies", url: SHOP }, { title: "La recette", url: U("la-recette") }, { title: "Notre histoire", url: U("notre-histoire") }, { title: "Journal", url: U("journal") }, { title: "Aide", url: U("faq") }] };
  spec.store.menus["footer-shop"] = { title: "Boutique", links: [{ title: "Les gummies", url: SHOP }, { title: "La recette", url: U("la-recette") }, { title: "Notre histoire", url: U("notre-histoire") }, { title: "Journal", url: U("journal") }] };
  spec.store.menus.footer = { title: "Aide", links: [{ title: "Livraison et retours", url: U("livraison-et-retours") }, { title: "Suivi de commande", url: U("suivi-de-commande") }, { title: "FAQ", url: U("faq") }, { title: "Contact", url: U("contact") }] };
  // Planche 02 (pied « journal ») : trois liens d'aide et liens légaux dans l'ordre de la planche.
  spec.store.menus["footer-journal"] = { title: "Aide (pied « journal »)", links: [{ title: "Contact", url: U("contact") }, { title: "FAQ", url: U("faq") }, { title: "Livraison et retours", url: U("livraison-et-retours") }] };
  spec.store.menus["legal-journal"] = { title: "Liens légaux (pied « journal »)", links: [{ title: "Mentions légales", url: U("mentions-legales") }, { title: "Politique de confidentialité", url: U("confidentialite") }, { title: "Conditions générales de vente", url: U("conditions-de-vente") }] };
  spec.store.menus["footer-info"] = { title: "Informations", links: [{ title: "Mentions légales", url: U("mentions-legales") }, { title: "Conditions générales de vente", url: U("conditions-de-vente") }, { title: "Politique de confidentialité", url: U("confidentialite") }, { title: "Cookies", url: U("cookies") }] };
  spec.store.menus.legal = { title: "Informations légales", links: [{ title: "Conditions générales de vente", url: U("conditions-de-vente") }, { title: "Politique de confidentialité", url: U("confidentialite") }, { title: "Mentions légales", url: U("mentions-legales") }] };
  spec.store.menus["legal-help"] = { title: "Liens légaux (pied « aide » du téléphone)", links: [{ title: "Conditions générales de vente", url: U("conditions-de-vente") }, { title: "Politique de confidentialité", url: U("confidentialite") }, { title: "Cookies", url: U("cookies") }, { title: "Mentions légales", url: U("mentions-legales") }] };
  spec.store.menus["legal-buy"] = { title: "Liens du pied réduit (achat, téléphone)", links: [{ title: "Aide", url: U("faq") }, { title: "Contact", url: U("contact") }, { title: "CGV", url: U("conditions-de-vente") }, { title: "Confidentialité", url: U("confidentialite") }] };
  spec.store.menus["legal-short"] = { title: "Liens légaux (court)", links: [{ title: "Contact", url: U("contact") }, { title: "CGV", url: U("conditions-de-vente") }, { title: "Confidentialité", url: U("confidentialite") }, { title: "Mentions légales", url: U("mentions-legales") }] };
  spec.store.menus["search-pages"] = { title: "Recherche : pages proposées", links: [{ title: "Les gummies — fiche du flacon", url: PRODUCT }, { title: "Boutique — les trois formats", url: SHOP }, { title: "La recette", url: U("la-recette") }, { title: "Notre histoire", url: U("notre-histoire") }, { title: "Journal", url: U("journal") }, { title: "Questions fréquentes", url: U("faq") }, { title: "Livraison et retours", url: U("livraison-et-retours") }, { title: "Suivi de commande", url: U("suivi-de-commande") }, { title: "Contact", url: U("contact") }] };
}
