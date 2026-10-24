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
import { FG_PAGES, fgTemplate, fgUrl, headerSettings, footerSettings, cartSettings, pageRow, LOOK_01, LOOK_02, LOOK_03, LOOK_BUY, type FgPageHandle } from "../src/lib/theme/fraise-v2";
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
  spec.settings = { ...spec.settings, logo_asset: f("logo-proposition.png"), favicon_asset: spec.settings.favicon_asset ?? "" };

  // Produit principal : trois formats = trois variantes du même produit ; prix de OFFRES_VALIDEES.json (centimes).
  const main: StoreProduct = {
    ...spec.store.product,
    contentTarget: "product:main", handle: FRAISE_HANDLE, title: "Gummies goût fraise", vendor: "FRAISE GUMMIES",
    description_html: p("Des gummies tendres au goût fraise dans un flacon réutilisable, à emporter partout avec vous.") + p("Prix de démonstration : aucune vente réelle."),
    price: offers[0].prix_pack_centimes, compare_at_price: null, currency: "EUR", options: ["Format"],
    variants: offers.map((o, i) => ({ title: `${o.flacons_par_pack} flacon${o.flacons_par_pack > 1 ? "s" : ""}`, options: [`${o.flacons_par_pack} flacon${o.flacons_par_pack > 1 ? "s" : ""}`], price: o.prix_pack_centimes, available: true, sku: `DEMO-${o.id.toUpperCase()}`, image: f(packImg[i]) || undefined })),
    images: ["05-fiche-flacon-principal.webp", "06-flacon-ouvert-plongee.webp", "07-macro-gummies-texture.webp", "08-macro-etiquette-bouchon.webp", "24-fraises-detail-saveur.webp", "12-scene-cuisine.webp"].filter((x) => ids[x]),
    tags: ["gummies", "confiserie", "goût fraise"],
    seo: { title: "Gummies goût fraise — FRAISE GUMMIES", description: "Le flacon FRAISE en 1, 2 ou 3 flacons : 16,60 €, 24,90 € (−50 % sur le 2ᵉ) ou 33,20 € (2 achetés + 1 offert). Démonstration, prix de démonstration." },
  };
  spec.store.product = main;
  spec.store.products = [];
  spec.store.collections = [{ handle: "all", title: "Les gummies", description: "Le flacon FRAISE en trois formats.", products: [main.handle] }];

  // ------------------------------------------------------------------------------------------- Accueil (planche 01)
  spec.templates.index = fgTemplate([
    S("fg-hero", { layout: "home", heading: "Votre rituel,\n[i]côté fraise.[/i]", text: p("Gummies tendres au goût fraise<br>dans un flacon réutilisable."), text_mobile: p("Gummies tendres au<br>goût fraise dans un flacon<br>réutilisable."), button_label: "Découvrir les gummies", button_link: PRODUCT, stamp: "Le goût\nfraise au\nquotidien", image_asset: f("04-accueil-flacon-fraises.webp"), image_alt: alt("04-accueil-flacon-fraises.webp"), image_place_w: 1141, image_place_x: 273, image_place_y: -36, image_mobile_asset: f("05-fiche-flacon-principal.webp"), image_position_mobile: "50% 50%", band_text: "FRAISE GUMMIES — LE GOÛT FRAISE AU QUOTIDIEN", height: 392, height_mobile: 700 }),
    S("fg-taste", { heading: "Le goût fraise\n[r]qui fait [i]sourire.[/i][/r]", text: p("Des gummies tendres au goût fraise,<br>dans un flacon aussi joli que gourmand."), button_label: "Découvrir les gummies", button_link: PRODUCT, note: "Tendres\net gourmands", image_on: "mobile", image_asset: f("07-macro-gummies-texture.webp"), image_alt: alt("07-macro-gummies-texture.webp"), image_position: "50% 60%", image_zoom: 100, show_card: true, product: FRAISE_HANDLE, card_image_asset: f("01-un-flacon-detoure.webp"), card_title: "Le flacon FRAISE", card_subtitle: "Gummies goût fraise", card_format: "1 flacon", card_button: "Ajouter au panier" }),
    S("fg-details", { heading: "Des détails\n[i]à savourer.[/i]", text: p("Des gummies généreux, une texture tendre<br>et une étiquette illustrée aux couleurs<br>de la fraise."), button_label: "Voir le produit", button_link: PRODUCT }, [
      { type: "photo", settings: { image_asset: f("07-macro-gummies-texture.webp"), alt: alt("07-macro-gummies-texture.webp"), position: "36% 86%", zoom: 280, caption: "" } },
      { type: "photo", settings: { image_asset: f("08-macro-etiquette-bouchon.webp"), alt: alt("08-macro-etiquette-bouchon.webp"), position: "44% 54%", zoom: 200, caption: "Une texture\ntendre" } },
      { type: "photo", settings: { image_asset: f("24-fraises-detail-saveur.webp"), alt: alt("24-fraises-detail-saveur.webp"), position: "92% 74%", zoom: 200, caption: "Un flacon\nréutilisable" } },
    ]),
    S("fg-offers", { layout: "home", heading: "Un flacon,\n[i]votre façon de le choisir.[/i]", heading_mobile: "Votre format\n[r]FRAISE.[/r]", text: p("Toujours plus de gourmandise,<br>à votre rythme."), product: FRAISE_HANDLE, show_compare: true, show_last: true, show_per: "no_last", show_save: true, show_note: true, button_label: "Ajouter au panier", button_icon: false },
      offers.map((_, i) => ({ type: "offer", settings: { variant_index: i + 1, image_asset: f(packImg[i]), alt: alt(packImg[i]) } }))),
    S("fg-everyday", { heading: "Un petit format.\nUne place [r]dans[/r]\n[i]votre quotidien.[/i]", text: p("À la maison, au bureau ou en balade,<br>FRAISE GUMMIES vous accompagne<br>dans vos moments gourmands."), button_label: "Découvrir les gummies", button_link: PRODUCT, note: "Un plaisir\nau quotidien", image_asset: f("17-journal-petit-rituel.webp"), image_alt: alt("17-journal-petit-rituel.webp"), image_position: "50% 34%", image_zoom: 100, image_mobile_asset: f("12-scene-cuisine.webp") }),
    S("fg-duo", { heading: "La recette,\n[i]en toute clarté.[/i]", text: p("Consultez les informations figurant<br>sur le flacon."), text_mobile: p("Retrouvez toutes les informations<br>sur le produit directement sur le flacon."), button_label: "Voir les détails", button_label_mobile: "Consulter le flacon", button_link: U("la-recette"), image_asset: f("10-recette-gummies-fraises.webp"), image_alt: alt("10-recette-gummies-fraises.webp"), image_position: "2% 78%", image_zoom: 165, journal_heading: "[i]Le journal[/i] FRAISE", journal_text: "Inspirations, idées et moments gourmands autour du goût fraise.", journal_link_label: "Voir tout", journal_link: U("journal"), read_label: "Lire l'article" }, [
      { type: "post", settings: { title: "5 idées pour savourer vos gummies au quotidien", title_mobile: "La fraise, une saveur intemporelle", link: U("journal-les-details-d-un-petit-rituel"), image_asset: f("17-journal-petit-rituel.webp"), position: "12% 46%" } },
      { type: "post", settings: { title: "Un goût fraise qui met de bonne humeur", title_mobile: "Nos gummies, au quotidien", link: U("journal-le-gout-fraise-en-images"), image_asset: f("18-journal-gout-fraise.webp"), position: "96% 62%" } },
    ]),
    S("fg-faqteaser", { layout: "home", heading: "Vos questions,\n[i]nos réponses.[/i]", button_label: "Voir toutes les questions", button_link: U("faq") }, [
      { type: "question", settings: { question: "Quel est le goût des gummies FRAISE ?", answer: p("Un goût fraise gourmand, dans des gummies tendres.") } },
      { type: "question", settings: { question: "Comment conserver le flacon ?", answer: p(`Suivez les indications figurant sur l'étiquette du flacon. ${TODO("conditions de conservation du produit réel")}`) } },
      { type: "question", settings: { question: "Y a-t-il plusieurs parfums ?", answer: p("Cette boutique présente un seul goût : la fraise, en trois formats (1, 2 ou 3 flacons).") } },
      { type: "question", settings: { question: "Où trouver les informations sur la composition ?", answer: p(`La composition figure sur l'étiquette du flacon. ${TODO("liste des ingrédients et allergènes du produit réel")}`) } },
    ]),
    S("fg-news", { heading: "Restons en contact.", text: "Recevez nos nouveautés et nos idées gourmandes.", placeholder: "Votre adresse e-mail", button: "S'inscrire" }),
    pageRow(LOOK_01),
  ]);

  // ------------------------------------------------------------------------------------------- En-tête, pied, menus
  const header = spec.groups.header;
  const hid = header.order.find((id) => header.sections[id].type === "fg-header")!;
  header.sections[hid].settings = headerSettings("fr", { demo: true, checkoutPage: U("commande"), cookiesLink: U("cookies"), logo: f("logo-proposition.png"), bandBrand: "FRAISE GUMMIES", bandText: "Le goût fraise au quotidien", copyright: "Fraise Gummies. Tous droits réservés.", lineBrand: "FRAISE GUMMIES" });
  const footer = spec.groups.footer;
  const fid = footer.order.find((id) => footer.sections[id].type === "fg-footer")!;
  footer.sections[fid].settings = footerSettings("fr", { logo: f("logo-proposition.png"), bottom: "FRAISE GUMMIES — Le goût fraise au quotidien — boutique de démonstration, prix de démonstration", copyright: "Fraise Gummies", mobileText: "Des nouvelles, des coulisses et plus encore.", socialPlaceholder: true });
  spec.store.menus["main-menu"] = { title: "Navigation", links: [{ title: "Les gummies", url: SHOP }, { title: "La recette", url: U("la-recette") }, { title: "Notre histoire", url: U("notre-histoire") }, { title: "Journal", url: U("journal") }, { title: "Aide", url: U("faq") }] };
  spec.store.menus["footer-shop"] = { title: "Boutique", links: [{ title: "Les gummies", url: SHOP }, { title: "La recette", url: U("la-recette") }, { title: "Notre histoire", url: U("notre-histoire") }, { title: "Journal", url: U("journal") }] };
  spec.store.menus.footer = { title: "Aide", links: [{ title: "Livraison et retours", url: U("livraison-et-retours") }, { title: "Suivi de commande", url: U("suivi-de-commande") }, { title: "FAQ", url: U("faq") }, { title: "Contact", url: U("contact") }] };
  spec.store.menus["footer-info"] = { title: "Informations", links: [{ title: "Mentions légales", url: U("mentions-legales") }, { title: "Conditions générales de vente", url: U("conditions-de-vente") }, { title: "Politique de confidentialité", url: U("confidentialite") }, { title: "Cookies", url: U("cookies") }] };
  spec.store.menus.legal = { title: "Informations légales", links: [{ title: "Conditions générales de vente", url: U("conditions-de-vente") }, { title: "Politique de confidentialité", url: U("confidentialite") }, { title: "Mentions légales", url: U("mentions-legales") }] };
  spec.store.menus["legal-short"] = { title: "Liens légaux (court)", links: [{ title: "Contact", url: U("contact") }, { title: "CGV", url: U("conditions-de-vente") }, { title: "Confidentialité", url: U("confidentialite") }, { title: "Mentions légales", url: U("mentions-legales") }] };
  spec.store.menus["search-pages"] = { title: "Recherche : pages proposées", links: [{ title: "Les gummies — fiche du flacon", url: PRODUCT }, { title: "Boutique — les trois formats", url: SHOP }, { title: "La recette", url: U("la-recette") }, { title: "Notre histoire", url: U("notre-histoire") }, { title: "Journal", url: U("journal") }, { title: "Questions fréquentes", url: U("faq") }, { title: "Livraison et retours", url: U("livraison-et-retours") }, { title: "Suivi de commande", url: U("suivi-de-commande") }, { title: "Contact", url: U("contact") }] };
  void LOOK_02; void LOOK_03; void LOOK_BUY; void cartSettings; void FG_PAGES;
}
