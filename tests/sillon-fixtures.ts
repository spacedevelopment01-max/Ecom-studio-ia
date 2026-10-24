/**
 * Démonstration SILLON V2 (PR #182 ; thème `sillon`, famille Produit spécifique / Boutique spécialisée, #148) :
 * machine à espresso nomade, composée d'après les trois planches validées par Thomas le 24 octobre 2026
 * (docs/theme-briefs/sillon-v2/maquettes).
 *
 * Le projet est créé comme un projet client (marque, produit, médias avec rôles), composé par le VRAI moteur dans le
 * thème « sillon » (composeShop), puis rédigé page par page d'après les planches (sections sv-*, textes lisibles des
 * planches, coquilles corrigées). 129 € est un prix ILLUSTRATIF de démonstration, annoncé comme tel ; aucun paiement,
 * aucun envoi. Pression, batterie, chauffe, température, étanchéité, garantie, délais et frais ne sont jamais affirmés
 * (« [À compléter : …] » ou « à confirmer »). Les 24 photos complémentaires sont des reconstitutions des scènes des
 * planches fournies par Thomas (sans personne) ; les 16 originaux du kit SILLON restent en réserve.
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
import { SV_PAGES, svTemplate, svUrl, headerSettings, footerSettings, type SvPageHandle } from "../src/lib/theme/sillon-v2";
import type { Row } from "../src/lib/theme/theme-catalog";

export const SILLON_PROVENANCE = "SILLON V2 (PR #182, 24 octobre 2026) — photos complémentaires recréées d'après les planches validées, fournies par Thomas (sans personne) ; démonstration du studio, prix illustratif, aucun paiement";
export const SILLON_DIR = path.join(process.cwd(), "public", "theme-assets", "sillon");
export const SILLON_HANDLE = "sillon-v2";
/** Prix illustratif de démonstration (centralisé : fiche, panier, commande, bandeau de l'article). */
export const SILLON_PRICE = 129;

/** Médias de la V2 (fichiers WebP du dossier SILLON_V2_DOSSIER/images-complementaires), rôle et texte alternatif. */
export const SILLON_MEDIA: { file: string; role: string; alt: string }[] = [
  { file: "v2-02-machine-detouree.webp", role: "packshot", alt: "Machine à espresso SILLON détourée : corps brun espresso, bague et bouton cuivre, verre d'espresso dessous." },
  { file: "v2-03-machine-pierre-claire.webp", role: "packshot", alt: "Machine SILLON posée sur une pierre claire, verre d'espresso dessous." },
  { file: "v2-09-rituel-extraction.webp", role: "detail", alt: "L'espresso coule de la machine SILLON dans le verre, sur une pierre." },
  { file: "v2-06-detail-ceinture-cuivre.webp", role: "detail", alt: "Gros plan de la bague cuivre brossée sur le corps brun de SILLON." },
  { file: "v2-07-detail-bouton-cuivre.webp", role: "detail", alt: "Gros plan du bouton cuivre de SILLON." },
  { file: "v2-14-rituel-couvercle-bouton.webp", role: "detail", alt: "Le couvercle et le bouton cuivre de la machine, en plein air." },
  { file: "v2-10-rituel-tasse-crema.webp", role: "detail", alt: "Un espresso à la crème épaisse dans un verre, sur une pierre." },
  { file: "v2-13-rituel-cafe-moulu-dose.webp", role: "detail", alt: "Café moulu dans une dose et une boîte, sur une pierre." },
  { file: "v2-08-rituel-grains-machine.webp", role: "scene", alt: "Grains de café dans un bol de pierre à côté de la machine SILLON." },
  { file: "v2-11-coffret-accessoires.webp", role: "scene", alt: "Contenu illustratif du coffret : machine, pochette, câble, brosse et guide." },
  { file: "v2-01-accueil-van-route-lac.webp", role: "lifestyle", alt: "La machine SILLON et un espresso sur la table d'un van, face à une route de montagne et un lac." },
  { file: "v2-04-van-lac-halte.webp", role: "lifestyle", alt: "Halte près d'un van ouvert : machine SILLON et tasses sur une table, face aux montagnes et au lac." },
  { file: "v2-05-machine-tasse-lac.webp", role: "scene", alt: "Machine SILLON et tasse sur un rocher face à un lac de montagne." },
  { file: "v2-12-panorama-route-alpine.webp", role: "banner", alt: "Route de montagne au coucher du soleil." },
  { file: "v2-15-marque-route-lacets.webp", role: "scene", alt: "Route en lacets dans la montagne." },
  { file: "v2-16-marque-rochers-sentier.webp", role: "scene", alt: "Sentier entre des rochers." },
  { file: "v2-17-journal-lac-foret.webp", role: "scene", alt: "Lac entre les sapins, sentier au bord de l'eau." },
  { file: "v2-18-journal-entretien-rocher.webp", role: "scene", alt: "Machine SILLON sur un rocher, prête à être nettoyée." },
  { file: "v2-19-journal-tasse-rocher.webp", role: "scene", alt: "Tasse émaillée sur un rocher." },
  { file: "v2-20-journal-lac-coucher.webp", role: "scene", alt: "Lac de montagne au coucher du soleil." },
  { file: "v2-21-article-van-table-lac.webp", role: "scene", alt: "Machine SILLON et tasse sur la table d'un van, face à un lac de montagne." },
  { file: "v2-22-article-montagnes-brume.webp", role: "scene", alt: "Montagnes et sapins dans la brume au lever du jour." },
  { file: "v2-23-contact-van-machine.webp", role: "scene", alt: "Intérieur d'un van en bois : machine SILLON et espresso sur la table, fenêtre sur la montagne." },
  { file: "v2-24-mobile-machine-rocher.webp", role: "scene", alt: "Machine SILLON sur un rocher dans la montagne, au-dessus d'un lac." },
];

const p = (s: string) => `<p>${s}</p>`;
const TODO = (what: string) => `[À compléter : ${what}]`;
type B = { type: string; settings: Record<string, unknown> };

export async function sillonProject(userId: string, options: { mediaDir?: string } = {}) {
  const dir = options.mediaDir ?? SILLON_DIR;
  const pid = seedHoldout(userId, 0, "Démo SILLON");
  const product = {
    ...emptyProduct(), name: "SILLON V2", nameStatus: "provided" as const, category: "Machine à espresso nomade", sector: "maison" as const,
    summary: "Machine à espresso nomade : corps brun espresso, bague et bouton cuivre, l'espresso coule dans le verre placé dessous. Prix illustratif de démonstration.",
    facts: [
      { key: "finition", label: "Finition", value: "corps brun espresso, bague et bouton cuivre, verre transparent", status: "confirmed" as const, source: "user" as const },
    ],
    variants: [],
  };
  saveProduct(pid, product);
  const local = localBrand(product, "SILLON", { business: "products" });
  const palette = { primary: "#1E1913", secondary: "#EEE7D9", accent: "#B35D30", light: "#F1E9DC", dark: "#211D15" };
  saveBrand(pid, { ...local.brand, name: "SILLON", generatedBy: "local" as const, tagline: "Prenez la tangente.", story: "SILLON accompagne celles et ceux qui prennent la route : un espresso, où que la halte vous mène.", positioning: "L'espresso nomade : petit format, grande échappée.", palette, direction: "sillon" });
  saveStrategy(pid, local.strategy);
  run("UPDATE projects SET store_type = ?, business_type = ?, updated_at = ? WHERE id = ?", "mono", "products", now(), pid);
  saveSettings(pid, { ...loadProject(pid).settings, storeKind: "specialty" });

  const missing: string[] = [];
  const ids: Record<string, string> = {};
  for (const m of SILLON_MEDIA) {
    const source = path.join(dir, m.file);
    if (!fs.existsSync(source) || fs.statSync(source).size === 0) { missing.push(m.file); continue; }
    const bytes = fs.readFileSync(source), meta = await sharp(bytes).metadata();
    const a = await saveAsset({ projectId: pid, userId, data: bytes, mime: "image/webp", name: m.file, origin: "upload", role: m.role, status: "approved", meta: { demo: { isDemo: true, provenance: SILLON_PROVENANCE }, width: meta.width, height: meta.height, alt: m.alt } });
    ids[m.file] = a.id;
  }
  const built = await composeShop(pid, "sillon", null, false);
  const spec: ThemeSpec = built.spec;
  const catalogOrder = spec.templates.index.order.map((k) => spec.templates.index.sections[k].type);
  curateSillon(spec, ids);
  return { pid, spec, missing, catalogOrder, project: loadProject(pid) };
}

/** Rédaction de la démonstration d'après les planches 01 à 03 (sections sv-*, textes des planches). */
export function curateSillon(spec: ThemeSpec, ids: Record<string, string>) {
  for (const [name, aid] of Object.entries(ids)) spec.files[name] = aid;
  const f = (name: string) => (ids[name] ? name : "");
  const alt = (name: string) => SILLON_MEDIA.find((m) => m.file === name)?.alt ?? "";
  const U = (h: SvPageHandle) => svUrl(h);
  const PRODUCT = `/products/${SILLON_HANDLE}`;
  const S = (type: string, settings: Record<string, unknown>, blocks: B[] = []): Row => [type, settings, blocks];

  spec.name = "SILLON V2 — thème Sillon (démonstration)";
  spec.meta = { ...spec.meta, demo: { isDemo: true, provenance: SILLON_PROVENANCE, contactTest: false } };
  spec.store.shopName = "SILLON";
  spec.store.business = "products";
  spec.store.paymentTypes = [];
  spec.store.seo = { title: "SILLON V2 | L'espresso nomade", description: "Prenez la tangente : un espresso, où que la route vous mène. Machine à espresso nomade (boutique de démonstration, prix illustratif)." };

  // Produit principal : une seule variante vendable (espresso & cuivre) ; prix illustratif, centralisé ici.
  const gallery = ["v2-03-machine-pierre-claire.webp", "v2-02-machine-detouree.webp", "v2-09-rituel-extraction.webp", "v2-06-detail-ceinture-cuivre.webp"].filter((x) => ids[x]);
  const main: StoreProduct = {
    ...spec.store.product,
    contentTarget: "product:main", handle: SILLON_HANDLE, title: "SILLON V2", vendor: "SILLON",
    description_html: p("La liberté d'un grand café, dans un format pensé pour vos horizons.") + p("Prix illustratif de démonstration : aucune vente réelle."),
    price: SILLON_PRICE * 100, compare_at_price: null, currency: "EUR", options: ["Coloris"],
    variants: [{ title: "Espresso & cuivre", options: ["Espresso & cuivre"], price: SILLON_PRICE * 100, available: true }],
    images: gallery, tags: ["machine à espresso", "nomade"],
    seo: { title: "SILLON V2 — l'espresso qui prend l'air", description: "Machine à espresso nomade SILLON V2 : galerie, détails cuivre, rituel en trois gestes, contenu du coffret (démonstration, prix illustratif)." },
  };
  spec.store.product = main;
  spec.store.products = [];
  spec.store.collections = [{ handle: "all", title: "La machine", description: "SILLON V2, machine à espresso nomade.", products: [main.handle] }];

  // ------------------------------------------------------------------------------------------- Accueil (planche 01)
  spec.templates.index = svTemplate([
    S("sv-hero", { layout: "photo", eyebrow: "01 / Départ", heading: "Prenez\nla tangente.", subtitle: "", image_asset: f("v2-01-accueil-van-route-lac.webp"), image_alt: alt("v2-01-accueil-van-route-lac.webp"), image_position: "8% 30%", image_zoom: 106, card_title: "Le café suit votre route", card_text: "Routes sinueuses, haltes imprévues,\nmêmes exigences.", card_link_label: "Explorer SILLON", card_link: U("sillon"), show_route: true, image_mobile_asset: f("v2-01-accueil-van-route-lac.webp"), image_mobile_position: "60% 0%", image_mobile_zoom: 100, image_mobile_place_w: 1029, image_mobile_place_x: -488, image_mobile_place_y: 218, height: 688, height_mobile: 912 }),
    S("sv-format", { heading: "Petit format.", heading_accent: "Grande échappée.", text: "Un espresso d'exception,\npartout où la route vous mène.", text_mobile: "Un espresso d'exception,\npartout où la route\nvous mène.", link_label: "Découvrir la machine", link: PRODUCT, product: SILLON_HANDLE, image_asset: f("v2-02-machine-detouree.webp"), image_alt: alt("v2-02-machine-detouree.webp"), words: "Compacte\nÉlégante\nToujours partante" }),
    S("sv-collage", { word: "SILLON", text_left: "Le café\ndessine\nd'autres\nhorizons.", label_1_number: "01", label_1: "La route", label_2_number: "02", label_2: "La halte", text_right: "Même café.\nAutre paysage." }, [
      { type: "photo", settings: { image_asset: f("v2-05-machine-tasse-lac.webp"), image_alt: alt("v2-05-machine-tasse-lac.webp"), image_position: "50% 60%", image_zoom: 100 } },
      { type: "photo", settings: { image_asset: f("v2-04-van-lac-halte.webp"), image_alt: alt("v2-04-van-lac-halte.webp"), image_position: "72% 60%", image_zoom: 100 } },
    ]),
    S("sv-band", { style: "copper", heading: "Le détour\nen vaut la tasse.", heading_mobile: "Le détour\nen vaut\nla tasse.", text: "Plus loin\nPlus libre\nToujours un bon café.", link: U("le-rituel"), link_label: "Découvrir le rituel", icon: "arrow-ne" }),
    S("sv-ritual", { layout: "row", heading: "Le rituel", text: "Trois gestes.\nUn grand ailleurs." }, [
      { type: "step", settings: { number: "01", title: "Allumer", text: "Un geste, et l'aventure\ncommence.", title_mobile: "Préparer", text_mobile: "Allumer.\nUne petite\naventure\ncommence.", image_asset: f("v2-14-rituel-couvercle-bouton.webp"), image_alt: alt("v2-14-rituel-couvercle-bouton.webp"), image_position: "50% 32%", image_zoom: 150, image_place_w: 590, image_place_x: -194, image_place_y: -98 } },
      { type: "step", settings: { number: "02", title: "Extraire", text: "Un espresso riche\net généreux.", title_mobile: "Lancer", text_mobile: "Un espresso\nriche et généreux.", image_asset: f("v2-09-rituel-extraction.webp"), image_alt: alt("v2-09-rituel-extraction.webp"), image_position: "50% 62%", image_zoom: 140, image_place_w: 490, image_place_x: -147, image_place_y: -214 } },
      { type: "step", settings: { number: "03", title: "Savourer", text: "Le temps reprend\nle bon rythme.", text_mobile: "Le temps\nreprend\nle bon rythme.", image_asset: f("v2-10-rituel-tasse-crema.webp"), image_alt: alt("v2-10-rituel-tasse-crema.webp"), image_position: "50% 58%", image_zoom: 130, image_place_w: 250, image_place_x: -43, image_place_y: -78 } },
    ]),
    S("sv-posts", { layout: "home", heading: "Dans le carnet", read_label: "Lire l'article" }, [
      { type: "post", settings: { image_asset: f("v2-21-article-van-table-lac.webp"), image_position: "50% 55%", image_zoom: 100, title: "Le café en van", text: "Routes, lacs et premiers rayons.\nLe café comme point de repère.", text_mobile: "Roadtrips, lacs et premiers rayons.\nLe café comme point de repère.", link: U("carnet-le-cafe-en-van") } },
      { type: "post", settings: { image_asset: f("v2-20-journal-lac-coucher.webp"), image_position: "50% 50%", image_zoom: 100, title: "Ralentir face au lac", text: "Moins de kilomètres.\nPlus de moments.", link: U("carnet-ralentir-face-au-lac") } },
    ]),
    // Téléphone seulement (planche mobile « Accueil 2/2 ») : inscription cuivre avant le pied.
    S("sv-band", { visibility: "mobile", style: "newsletter", heading: "Restons\nen chemin.", text: "L'essentiel, pour partir plus loin.", field_label: "Votre e-mail pour recevoir les prochains carnets", placeholder: "Votre e-mail", done: "Démonstration : aucune inscription n'est enregistrée." }),
    S("sv-page", { footer: "dark" }),
  ]);

  // ------------------------------------------------------------------------------------------- Fiche (planche 01)
  for (const key of Object.keys(spec.templates)) if (key.startsWith("product.")) delete spec.templates[key];
  main.template_suffix = undefined;
  spec.templates.product = svTemplate([
    S("sv-product", { eyebrow: "Équipement / 001", heading: "L’espresso\nqui prend l’air.", text: "La liberté d'un grand café,\ndans un format pensé\npour vos horizons.", image_asset: f("v2-03-machine-pierre-claire.webp"), image_width: 922, image_left: 60, image_top: 46, background: "#E8D9C5", image_mobile_asset: f("v2-03-machine-pierre-claire.webp"), image_mobile_position: "50% 50%", image_mobile_width: 1030, image_mobile_left: -448, image_mobile_top: 360, crumb_home: "Accueil", crumb_current: "La machine", card_name: "SILLON", card_subtitle: "L'espresso nomade", finish_label: "Finition", price_note: "", swatch_1: "#4A2E22", card_text: "Un espresso d'exception,\npartout où la route vous mène." }, [
      { type: "swatch", settings: { color: "#7F8573", label: "Sauge — coloris indisponible dans cette démonstration" } },
      { type: "link", settings: { icon: "truck", label: "Livraison", link: U("livraison-et-retours") } },
      { type: "link", settings: { icon: "question", label: "Aide", link: U("faq") } },
      { type: "link", settings: { icon: "return", label: "Retours", link: `${U("livraison-et-retours")}#retours` } },
    ]),
    S("sv-banner", { layout: "left", heading: "Faites de la place\naux bonnes pauses.", image_asset: f("v2-21-article-van-table-lac.webp"), image_alt: alt("v2-21-article-van-table-lac.webp"), image_position: "50% 50%", image_zoom: 100, link: U("carnet-le-cafe-en-van"), link_label: "Lire « Le café en van »", height: 236, image_position_mobile: "55% 50%" }),
    S("sv-details", { number: "02", heading: "Le sens\ndu détail" }, [
      { type: "point", settings: { text: "Un design épuré" } }, { type: "point", settings: { text: "Des matériaux soignés" } }, { type: "point", settings: { text: "Toujours avec vous" } },
      { type: "photo", settings: { image_asset: f("v2-06-detail-ceinture-cuivre.webp"), image_alt: alt("v2-06-detail-ceinture-cuivre.webp"), image_position: "50% 50%", image_zoom: 100 } },
      { type: "photo", settings: { image_asset: f("v2-07-detail-bouton-cuivre.webp"), image_alt: alt("v2-07-detail-bouton-cuivre.webp"), image_position: "50% 50%", image_zoom: 100 } },
      { type: "photo", settings: { image_asset: f("v2-02-machine-detouree.webp"), image_alt: alt("v2-02-machine-detouree.webp"), image_position: "50% 50%", image_zoom: 100 } },
    ]),
    S("sv-ritual", { layout: "dark", heading: "Le rituel", text: "De la nature\nà la tasse." }, [
      { type: "step", settings: { number: "01", title: "Préparer", text: "Des grains de qualité,\noù que vous soyez.", image_asset: f("v2-08-rituel-grains-machine.webp"), image_alt: alt("v2-08-rituel-grains-machine.webp"), image_position: "50% 60%", image_zoom: 100 } },
      { type: "step", settings: { number: "02", title: "Extraire", text: "Un espresso riche\net généreux.", image_asset: f("v2-09-rituel-extraction.webp"), image_alt: alt("v2-09-rituel-extraction.webp"), image_position: "50% 62%", image_zoom: 100 } },
      { type: "step", settings: { number: "03", title: "Savourer", text: "Une pause qui a du goût,\nailleurs.", image_asset: f("v2-10-rituel-tasse-crema.webp"), image_alt: alt("v2-10-rituel-tasse-crema.webp"), image_position: "50% 55%", image_zoom: 100 } },
    ]),
    S("sv-box", { heading: "Dans le coffret", text: "L'essentiel,\npour partir plus loin.", image_asset: f("v2-11-coffret-accessoires.webp"), image_alt: alt("v2-11-coffret-accessoires.webp"), image_position: "50% 50%", image_zoom: 100, note: "Contenu illustratif" }, ["SILLON V2", "Pochette de transport", "Câble de charge", "Brosse de nettoyage", "Guide rapide"].map((text) => ({ type: "item", settings: { text } }))),
    S("sv-faqlinks", { heading: "Questions fréquentes", text: "Tout ce qu'il faut savoir\navant de partir." }, [
      { type: "category", settings: { label: "Utilisation", link: `${U("faq")}#utilisation` } },
      { type: "category", settings: { label: "Entretien", link: `${U("faq")}#machine` } },
      { type: "category", settings: { label: "Livraison", link: `${U("faq")}#livraison` } },
      { type: "question", settings: { question: "Le produit est-il facile à utiliser ?", answer: p(`Consultez la notice pour retrouver les conseils d'utilisation de votre machine. Toutes les réponses : <a href="${U("faq")}">questions fréquentes</a>.`) } },
      { type: "question", settings: { question: "Comment l'entretenir ?", answer: p("Rincez après chaque utilisation, laissez sécher puis rangez la machine au sec. Les gestes précis sont décrits dans la notice.") } },
      { type: "question", settings: { question: "La livraison est-elle disponible partout ?", answer: p(`Les zones, délais et frais sont indiqués à l'étape de livraison de la commande. ${TODO("zones de livraison desservies")}`) } },
    ]),
    S("sv-banner", { layout: "center", heading: "Prêt pour\nvotre prochaine pause ?", image_asset: f("v2-12-panorama-route-alpine.webp"), image_alt: alt("v2-12-panorama-route-alpine.webp"), image_position: "50% 62%", image_zoom: 100, image_position_mobile: "4% 62%", image_zoom_mobile: 190, link: U("le-rituel"), link_label: "Découvrir le rituel", height: 150 }),
    S("sv-buybar", { label: "SILLON", add_label: "Ajouter au panier" }),
    S("sv-page", { footer: "dark" }),
  ]);
  // Corps de fiche standard conservé, masqué : la fiche de la planche le remplace (achat, galerie, barre flottante).
  spec.templates.product.sections["main-product"] = { type: "main-product", settings: { gallery_layout: "grid", sticky_bar: false }, disabled: true };
  spec.templates.product.order.push("main-product");

  // ------------------------------------------------------------------------------------------- Pages de la planche 02
  const pages: Record<string, { seo: string; rows: Row[] }> = {};
  const lightFoot = S("sv-page", { footer: "light" });
  pages["le-rituel"] = { seo: "Le rituel SILLON : préparez, lancez, savourez. Trois gestes pour un espresso sur la route.", rows: [
    S("sv-hero", { layout: "dark", eyebrow: "Guide de route / 001", heading: "Votre pause.\nVotre cadence.", heading_mobile: "Votre\npause.\nVotre\ncadence.", subtitle: "Un bon café\nvous suit\nplus loin.", product_image_asset: f("v2-02-machine-detouree.webp"), image_alt: alt("v2-02-machine-detouree.webp"), card_title: "", show_route: true, title_size: 146, title_line: 150, text_left: 70, text_top: 186, height: 720, height_mobile: 640 }),
    S("sv-steps", {}, [
      { type: "step", settings: { number: "01", title: "Préparez", text: "Votre café.\nVotre manière.", image_asset: f("v2-13-rituel-cafe-moulu-dose.webp"), image_alt: alt("v2-13-rituel-cafe-moulu-dose.webp"), image_position: "50% 45%", image_zoom: 100 } },
      { type: "step", settings: { number: "02", title: "Lancez", text: "Un geste simple.\nPartout avec vous.", image_asset: f("v2-14-rituel-couvercle-bouton.webp"), image_alt: alt("v2-14-rituel-couvercle-bouton.webp"), image_position: "50% 40%", image_zoom: 100, image_position_mobile: "62% 35%", image_zoom_mobile: 150, image_place_w: 740, image_place_x: -232, image_place_y: -112 } },
      { type: "step", settings: { number: "03", title: "Savourez", text: "Le goût\ndu chemin.", image_asset: f("v2-09-rituel-extraction.webp"), image_alt: alt("v2-09-rituel-extraction.webp"), image_position: "50% 70%", image_zoom: 100, image_place_w: 517, image_place_x: -173, image_place_y: -240 } },
    ]),
    S("sv-care", { heading: "Entretien\nsimple.", text: "Pour vous suivre\nlongtemps.", notice_file: "", notice_missing: "(notice à ajouter)", image_asset: f("v2-24-mobile-machine-rocher.webp"), image_position: "50% 40%", image_zoom: 120, image_place_w: 190, image_place_x: -64, image_place_y: -112, link_label: "Découvrir\nla machine", link: PRODUCT }, [
      { type: "gesture", settings: { text: "Consulter la notice", link: "", is_notice: true } },
      { type: "gesture", settings: { text: "Nettoyer après usage", link: U("carnet-prendre-soin-de-sa-machine"), is_notice: false } },
      { type: "gesture", settings: { text: "Ranger au sec", link: "", is_notice: false } },
    ]),
    lightFoot,
  ] };
  pages.sillon = { seo: "SILLON : on aime les détours. Le café comme compagnon d'exploration.", rows: [
    S("sv-hero", { layout: "photo", eyebrow: "", heading: "On aime\nles détours.", heading_mobile: "On aime\nles\ndétours.", subtitle: "Le café comme\ncompagnon\nd'exploration.", image_asset: f("v2-04-van-lac-halte.webp"), image_alt: alt("v2-04-van-lac-halte.webp"), image_position: "55% 60%", image_zoom: 100, image_mobile_asset: f("v2-04-van-lac-halte.webp"), image_mobile_position: "28% 0%", image_mobile_place_w: 500, image_mobile_place_x: -55, image_mobile_place_y: 376, card_title: "", show_route: false, title_size: 166, title_line: 188, text_left: 71, text_top: 176, height: 745, height_mobile: 618 }),
    S("sv-principles", { text: "Le café\ns'invite\npartout." }, [
      { type: "principle", settings: { title: "Plus d’horizons\ndans le quotidien.", text: "SILLON existe pour celles et ceux\nqui prennent la route, même pour\nun simple week-end.", text_mobile: "SILLON existe pour celles\net ceux qui prennent\nla route, même pour\nun simple week-end." } },
      { type: "principle", settings: { title: "Des rituels simples\net essentiels.", text: "Un bon café, partout,\npour faire une pause à sa manière.", text_mobile: "Un bon café, partout,\npour faire une pause\nà sa manière." } },
      { type: "principle", settings: { title: "Un objet pensé\npour durer.", text: "Des matériaux soignés,\nun design intemporel, et le goût\ndes belles échappées.", text_mobile: "Des matériaux soignés,\nun design intemporel\net le goût des belles\néchappées." } },
      { type: "photo", settings: { image_asset: f("v2-07-detail-bouton-cuivre.webp"), image_alt: alt("v2-07-detail-bouton-cuivre.webp"), image_position: "50% 50%", image_zoom: 100, image_position_mobile: "62% 42%", image_zoom_mobile: 150 } },
      { type: "photo", settings: { image_asset: f("v2-15-marque-route-lacets.webp"), image_alt: alt("v2-15-marque-route-lacets.webp"), image_position: "50% 50%", image_zoom: 100, image_position_mobile: "100% 45%", image_zoom_mobile: 200 } },
      { type: "photo", settings: { image_asset: f("v2-16-marque-rochers-sentier.webp"), image_alt: alt("v2-16-marque-rochers-sentier.webp"), image_position: "50% 50%", image_zoom: 100, image_position_mobile: "0% 30%", image_zoom_mobile: 200 } },
    ]),
    S("sv-band", { style: "dark", heading: "Suivre\nson sillon.", text: "Des routes\ndifférentes.\nToujours le même\nplaisir.", text_mobile: "Des routes différentes.\nToujours le même plaisir.", link: U("carnet"), link_label: "Lire le carnet", icon: "arrow" }),
    lightFoot,
  ] };
  const ENTRIES = [
    { h: "carnet-le-cafe-en-van" as SvPageHandle, title: "Le café en van", text: "Routes, paysages\net petits rituels.", cat: "Sur la route", img: "v2-04-van-lac-halte.webp", pos: "30% 60%", posM: "87% 60%" },
    { h: "carnet-le-sac-du-week-end" as SvPageHandle, title: "Le sac du\nweek-end", text: "L'essentiel\npour prendre\nla route léger.", cat: "Sur la route", img: "v2-17-journal-lac-foret.webp", pos: "50% 50%", posM: "100% 50%" },
    { h: "carnet-prendre-soin-de-sa-machine" as SvPageHandle, title: "Prendre soin\nde sa machine", text: "Les bons gestes\npour la faire durer.", cat: "Entretien", img: "v2-18-journal-entretien-rocher.webp", pos: "30% 50%" },
    { h: "carnet-le-gout-des-petits-rituels" as SvPageHandle, title: "Le goût des\npetits rituels", text: "Ces détails qui\nchangent tout.", cat: "Le café", img: "v2-19-journal-tasse-rocher.webp", pos: "50% 50%", posM: "95% 70%", zoomM: 170 },
    { h: "carnet-ralentir-face-au-lac" as SvPageHandle, title: "Ralentir face au lac", titleM: "Ralentir\nface au lac", text: "Prendre le temps,\ntout simplement.", cat: "Sur la route", img: "v2-20-journal-lac-coucher.webp", pos: "50% 50%", posM: "100% 50%" },
  ];
  pages.carnet = { seo: "Carnet d'échappées SILLON : des lieux, des histoires et toujours un bon café.", rows: [
    S("sv-journal", { heading: "Carnet\nd’échappées.", text: "Des lieux,\ndes histoires,\net toujours\nun bon café.", categories: "Sur la route, Le café, Entretien", all_label: "Tout", empty_label: "Aucun article dans cette catégorie pour le moment." }, ENTRIES.map((e) => ({ type: "entry", settings: { image_asset: f(e.img), image_position: e.pos, image_position_mobile: (e as { posM?: string }).posM ?? "", image_zoom_mobile: (e as { zoomM?: number }).zoomM ?? 100, image_zoom: 100, title: e.title, title_mobile: (e as { titleM?: string }).titleM ?? "", text: e.text, category: e.cat, link: U(e.h) } }))),
    S("sv-band", { style: "newsletter", heading: "Restons\nen chemin.", text: "Recevez nos prochains carnets\nd'échappées dans votre boîte mail.", text_mobile: "Recevez nos prochains\ncarnets d'échappées\ndans votre boîte mail.", field_label: "Votre e-mail pour recevoir les prochains carnets", placeholder: "Votre e-mail", done: "Merci, votre inscription est enregistrée." }),
    lightFoot,
  ] };
  // Articles : celui de la planche (« Le café en van ») et cinq déclinaisons cohérentes, chacune avec son propre texte.
  const related = (a: SvPageHandle, b: SvPageHandle) => S("sv-posts", { layout: "related", heading: "Autres articles", read_label: "Lire l'article" }, [a, b].map((h) => {
    const e = ARTICLES.find((x) => x.h === h)!;
    // Téléphone (planche 05) : vignettes de paysage, le produit hors du cadre quand il y figure.
    const crop: Record<string, [string, number]> = { "v2-15-marque-route-lacets.webp": ["100% 45%", 200], "v2-22-article-montagnes-brume.webp": ["100% 35%", 200], "v2-12-panorama-route-alpine.webp": ["0% 50%", 200] };
    return { type: "post", settings: { image_asset: f(e.cardImg), image_position: "50% 50%", image_zoom: 100, image_position_mobile: crop[e.cardImg]?.[0] ?? "", image_zoom_mobile: crop[e.cardImg]?.[1] ?? 100, title: e.cardTitle, text: e.cardText, link: U(h) } };
  }));
  const ARTICLES: { h: SvPageHandle; crumb: string; title: string; lead: string; leadM?: string; img: string; pos: string; body: string; quote: string; side: string; parts: [string, string][]; cardImg: string; cardTitle: string; cardText: string; rel: [SvPageHandle, SvPageHandle] }[] = [
    { h: "carnet-le-cafe-en-van", crumb: "Carnet / Sur la route", title: "Le café\nen van.", lead: "Routes, paysages\net petits rituels.\nQuand le café accompagne\nles plus belles échappées.", leadM: "Routes,\npaysages\net petits rituels.\nQuand le café\naccompagne\nles plus belles\néchappées.", img: "v2-21-article-van-table-lac.webp", pos: "50% 55%",
      body: p("Le van offre une liberté rare : celle de choisir son rythme. Au bord d'un lac, sur une route de montagne ou au détour d'un village, le café devient un marqueur de ces instants simples qui font les plus beaux souvenirs."),
      quote: "“Prendre le temps\nde s’arrêter.”", side: "v2-22-article-montagnes-brume.webp",
      parts: [["Choisir sa halte", "Une vue, un coin tranquille, une lumière particulière. Le bon spot fait déjà partie du plaisir."], ["Préparer sa pause", "Quelques instants suffisent pour préparer votre café et profiter pleinement du moment."], ["Respecter les lieux", "Laisser la nature aussi belle qu'à votre arrivée, pour que d'autres puissent en profiter."]],
      cardImg: "v2-21-article-van-table-lac.webp", cardTitle: "Le café\nen van.", cardText: "Routes, paysages\net petits rituels.", rel: ["carnet-une-route-un-matin", "carnet-le-gout-des-petits-rituels"] },
    { h: "carnet-le-sac-du-week-end", crumb: "Carnet / Sur la route", title: "Le sac du\nweek-end.", lead: "L'essentiel\npour prendre\nla route léger.", img: "v2-17-journal-lac-foret.webp", pos: "50% 50%",
      body: p("Partir deux jours, c'est accepter de laisser beaucoup de choses derrière soi. Ce qui reste dans le sac raconte ce qui compte vraiment : de quoi marcher, de quoi s'abriter, et de quoi s'offrir une vraie pause au bord de l'eau."),
      quote: "“Moins de bagages,\nplus de moments.”", side: "v2-15-marque-route-lacets.webp",
      parts: [["Faire le tri", "Poser tout sur le lit, puis ne garder que ce qui servira vraiment pendant ces deux jours."], ["Garder une place au café", "Un petit coin du sac pour la machine, une tasse et le café : la pause du matin est prête."], ["Penser au retour", "Un sac pour les déchets et un chiffon : on repart en laissant la halte comme on l'a trouvée."]],
      cardImg: "v2-17-journal-lac-foret.webp", cardTitle: "Le sac du\nweek-end.", cardText: "L'essentiel pour prendre\nla route léger.", rel: ["carnet-le-cafe-en-van", "carnet-ralentir-face-au-lac"] },
    { h: "carnet-prendre-soin-de-sa-machine", crumb: "Carnet / Entretien", title: "Prendre soin\nde sa machine.", lead: "Les bons gestes\npour la faire durer.", img: "v2-18-journal-entretien-rocher.webp", pos: "50% 50%",
      body: p("Une machine qui voyage mérite quelques attentions. Les gestes ci-dessous sont des habitudes simples ; pour le nettoyage précis et les pièces à démonter, fiez-vous toujours à la notice de votre machine.") + p("[À compléter : renvoi vers la notice officielle et ses consignes d'entretien]"),
      quote: "“Un geste après chaque\npause, et c’est tout.”", side: "v2-24-mobile-machine-rocher.webp",
      parts: [["Rincer après usage", "Vider et rincer ce qui a été en contact avec le café, avant qu'il ne sèche."], ["Laisser sécher", "Ouvrir et laisser l'air circuler avant de ranger la machine dans sa pochette."], ["Ranger au sec", "Sur la route, la garder à l'abri de l'humidité et des chocs, bien calée dans le sac."]],
      cardImg: "v2-18-journal-entretien-rocher.webp", cardTitle: "Prendre soin\nde sa machine.", cardText: "Les bons gestes\npour la faire durer.", rel: ["carnet-le-gout-des-petits-rituels", "carnet-le-cafe-en-van"] },
    { h: "carnet-le-gout-des-petits-rituels", crumb: "Carnet / Le café", title: "Le goût des\npetits rituels.", lead: "Ces détails\nqui changent tout.", img: "v2-19-journal-tasse-rocher.webp", pos: "50% 50%",
      body: p("Une tasse qu'on aime, une pierre tiède au soleil, le bruit de l'eau pas loin. Le café du voyage tient souvent à ces petits détails que l'on finit par répéter d'une halte à l'autre, jusqu'à en faire un rituel."),
      quote: "“Dans chaque étape,\nune nouvelle saveur.”", side: "v2-10-rituel-tasse-crema.webp",
      parts: [["Sa tasse à soi", "Celle qui voyage avec vous et que l'on retrouve à chaque pause, quel que soit le paysage."], ["Un café qu'on aime", "Choisir son café avant de partir, et le garder bien fermé jusqu'au moment de la pause."], ["Prendre le temps", "Regarder la crème se former, attendre une minute, puis savourer sans se presser."]],
      cardImg: "v2-19-journal-tasse-rocher.webp", cardTitle: "Le goût des\npetits rituels.", cardText: "Dans chaque étape,\nune nouvelle saveur.", rel: ["carnet-le-cafe-en-van", "carnet-une-route-un-matin"] },
    { h: "carnet-ralentir-face-au-lac", crumb: "Carnet / Sur la route", title: "Ralentir\nface au lac.", lead: "Prendre le temps,\ntout simplement.", img: "v2-20-journal-lac-coucher.webp", pos: "50% 55%",
      body: p("Le soir tombe sur le lac et la route peut attendre. Moins de kilomètres, plus de moments : s'arrêter avant la nuit, c'est aussi s'offrir le plus beau des points de vue pour le café du lendemain matin."),
      quote: "“Moins de kilomètres.\nPlus de moments.”", side: "v2-22-article-montagnes-brume.webp",
      parts: [["S'arrêter plus tôt", "Prévoir la halte avant la tombée du jour pour profiter de la lumière."], ["Écouter le lieu", "Couper le moteur, ouvrir les portes et laisser le paysage donner le rythme."], ["Préparer demain", "Repérer la pierre plate et la vue : le café du matin vous y attend déjà."]],
      cardImg: "v2-20-journal-lac-coucher.webp", cardTitle: "Ralentir\nface au lac.", cardText: "Prendre le temps,\ntout simplement.", rel: ["carnet-le-sac-du-week-end", "carnet-le-cafe-en-van"] },
    { h: "carnet-une-route-un-matin", crumb: "Carnet / Sur la route", title: "Une route,\nun matin.", lead: "Ces instants où tout\nsemble plus simple.", img: "v2-15-marque-route-lacets.webp", pos: "50% 60%",
      body: p("Partir tôt, quand la route est encore vide et que la lumière rase les virages. Les premiers kilomètres se font en silence ; la première pause, elle, se fait au premier belvédère, le café à la main."),
      quote: "“Le jour se lève,\nla route aussi.”", side: "v2-12-panorama-route-alpine.webp",
      parts: [["Partir tôt", "La route est plus calme et la lumière plus douce dans les premières heures."], ["Viser un point de vue", "Choisir à l'avance l'endroit de la première pause pour s'y arrêter sans hésiter."], ["Repartir léger", "Ranger la machine, reprendre la route : la journée commence du bon pied."]],
      cardImg: "v2-15-marque-route-lacets.webp", cardTitle: "Une route,\nun matin.", cardText: "Ces instants où tout\nsemble plus simple.", rel: ["carnet-le-cafe-en-van", "carnet-le-sac-du-week-end"] },
  ];
  for (const a of ARTICLES) pages[a.h] = { seo: `${a.title.replace(/\n/g, " ")} — Carnet d'échappées SILLON.`, rows: [
    S("sv-article", { crumb: a.crumb, crumb_link: U("carnet"), heading: a.title, lead: a.lead, lead_mobile: a.leadM ?? "", image_asset: f(a.img), image_alt: alt(a.img), image_position: a.pos, image_zoom: 100, toc_label: "Dans\ncet article", body: a.body, quote: a.quote, image_2_asset: f(a.side), image_2_alt: alt(a.side), image_2_position: "50% 50%", image_2_position_mobile: a.side === "v2-22-article-montagnes-brume.webp" ? "100% 35%" : "", image_2_zoom_mobile: a.side === "v2-22-article-montagnes-brume.webp" ? 200 : 100, show_product: true, product: SILLON_HANDLE, product_image_asset: f("v2-02-machine-detouree.webp"), product_label: "SILLON V2", product_text: "Votre compagnon\npour toutes vos échappées.", product_text_mobile: "Votre compagnon\npour toutes\nvos échappées.", product_button: "Découvrir la machine" },
      a.parts.map(([title, text]) => ({ type: "part", settings: { title, text: p(text) } }))),
    related(...a.rel),
    lightFoot,
  ] };

  // <<pages planche 03>>
  // Achat et aide (planche 03) : pied réduit aux liens légaux. Délais, frais, transporteurs, garantie et conditions ne
  // sont jamais inventés : « [À compléter : …] » tant que la boutique ne les a pas donnés.
  const legalFoot = S("sv-page", { footer: "legal" }), helpFoot = S("sv-page", { footer: "help" });
  const land = "v2-12-panorama-route-alpine.webp", rock = "v2-24-mobile-machine-rocher.webp";
  spec.templates.cart = svTemplate([
    S("sv-cart", { heading: "Prêt pour\nle départ ?", image_asset: f(land), image_position: "0% 55%", image_zoom: 160, image_position_mobile: "0% 66%", image_zoom_mobile: 200, image_top_asset: f(land), image_top_position: "8% 40%", line_image_asset: f("v2-02-machine-detouree.webp"), summary_title: "Récapitulatif", subtotal_label: "Sous-total", shipping_label: "Livraison", shipping_value: "Calculée à\nl'étape suivante", total_label: "Total produits", total_value: "", checkout_label: "Passer commande", checkout_page: U("commande"), note: "Démonstration : prix illustratif, aucun paiement.", continue_label: "Continuer\nla découverte", continue_link: PRODUCT, empty_heading: "La route\nvous attend.", empty_image_asset: f("v2-15-marque-route-lacets.webp"), empty_image_position: "100% 22%", empty_image_zoom: 200, empty_text: "Votre panier est encore vide.", empty_button: "Découvrir la machine", empty_link: PRODUCT, help_title: "Besoin d'aide ?", help_text: "Une question sur notre machine,\nune commande ?\nNous sommes là pour vous aider.", help_link_label: "Nous contacter", help_link: U("contact"), qty_label: "Quantité", less_label: "Retirer un exemplaire", more_label: "Ajouter un exemplaire", remove_label: "Supprimer" }),
    legalFoot,
  ]);
  pages["commande"] = { seo: "Commande de démonstration SILLON : aucun paiement, aucun envoi.", rows: [
    S("sv-checkout", { heading: "Dernière\nétape avant\nl'échappée.", image_asset: f(land), image_position: "30% 20%", image_bottom_asset: f(land), image_bottom_position: "0% 30%", image_bottom_zoom: 200, image_bottom_position_mobile: "28% 50%", image_bottom_zoom_mobile: 200, thumb_asset: f("v2-02-machine-detouree.webp"), countries: "France, Belgique, Suisse, Luxembourg", country_first: true, ship_text: `Les modes de livraison disponibles s'affichent ici dans la boutique réelle. ${TODO("transporteurs, délais et frais de livraison")}`, shipping_value: "À calculer", next1: "Continuer vers la livraison", next2: "Continuer vers le paiement", next3: "Valider le paiement", help_link: U("contact"), show_card_mock: true, final_disabled: true }),
    legalFoot,
  ] };
  const faq: [string, string, string][] = [
    ["Machine", "Comment utiliser SILLON ?", p("Consultez la notice pour retrouver les conseils d'utilisation de votre machine.")],
    ["Machine", "Où consulter la notice ?", p("La notice accompagne la machine. " + TODO("lien vers la notice officielle (PDF) — aucune notice n'est publiée dans cette démonstration"))],
    ["Machine", "Comment entretenir la machine ?", p("Rincez après chaque utilisation, laissez sécher puis rangez la machine au sec. Les gestes précis et les pièces à démonter sont décrits dans la notice.") + p(TODO("consignes d'entretien de la notice officielle"))],
    ["Machine", "Comment ranger SILLON ?", p("Une fois sèche, rangez-la à l'abri de l'humidité et des chocs, par exemple dans sa pochette de transport.")],
    ["Livraison", "Comment suivre ma commande ?", p(`Rendez-vous sur la page <a href="${U("suivi-de-commande")}">Suivi de commande</a> avec votre numéro de commande et votre e-mail.`)],
    ["Commande", "Comment demander un retour ?", p(`Écrivez-nous depuis la page <a href="${U("contact")}">Contact</a> en choisissant « Un retour ». Conditions et délais : ${TODO("politique de retour de la boutique")}.`)],
    ["Commande", "Comment vous contacter ?", p(`Par le formulaire de la page <a href="${U("contact")}">Contact</a> : nous vous répondons avec soin.`)],
  ];
  pages["faq"] = { seo: "Questions fréquentes SILLON : utilisation, notice, entretien, suivi et retours.", rows: [
    S("sv-faq", { heading: "On vous\nrépond.", image_asset: f("v2-16-marque-rochers-sentier.webp"), image_alt: "", image_position: "0% 100%", image_zoom: 200, product_image_asset: f("v2-02-machine-detouree.webp"), image_mobile_asset: f(rock), image_mobile_position: "62% 38%", image_mobile_zoom: 136, image_mobile_place_w: 516, image_mobile_place_x: -25, image_mobile_place_y: -268, search_placeholder: "Rechercher une question…", search_placeholder_mobile: "Rechercher une réponse…", filters: "Machine, Utilisation, Commande", filters_mobile: "Machine, Utilisation, Commande, Livraison", contact_label: "Nous contacter", contact_link: U("contact"), image_bottom_asset: f("v2-16-marque-rochers-sentier.webp"), image_bottom_position: "100% 100%", image_bottom_zoom: 180, image_bottom_mobile_asset: f(land), image_bottom_position_mobile: "0% 66%", image_bottom_zoom_mobile: 200 },
      faq.map(([category, question, answer]) => ({ type: "question", settings: { category, question, answer, question_mobile: ({ "Comment entretenir la machine ?": "Comment entretenir\nla machine ?", "Comment suivre ma commande ?": "Comment suivre ma\ncommande ?", "Comment demander un retour ?": "Comment demander\nun retour ?" } as Record<string, string>)[question] ?? "",
        // La planche ordinateur montre cinq questions, la planche téléphone sept.
        visibility: ["Comment ranger SILLON ?", "Comment vous contacter ?"].includes(question) ? "mobile" : "all" } }))),
    helpFoot,
  ] };
  pages["contact"] = { seo: "Contacter SILLON : une question, une demande ou simplement envie d'échanger.", rows: [
    S("sv-contact", { heading: "On garde\nle contact.", intro: "Une question, une demande\nou simplement envie d'échanger ?\nNotre équipe vous répond avec soin.", intro_mobile: "Une question, une demande\nou simplement envie d'échanger ?\nNotre équipe vous répond\navec soin.", image_asset: f("v2-23-contact-van-machine.webp"), image_alt: alt("v2-23-contact-van-machine.webp"), image_position: "50% 50%", image_bottom_asset: f(land), image_bottom_position: "0% 55%", image_bottom_zoom: 160, image_bottom_position_mobile: "0% 66%", image_bottom_zoom_mobile: 200, subjects: "La machine, Une commande, Un retour, Autre", simulate: true, card_title: "Ou accédez directement à :" },
      [["La machine", PRODUCT], ["Une commande", U("suivi-de-commande")], ["Un retour", `${U("livraison-et-retours")}#retours`]].map(([label, link]) => ({ type: "link", settings: { label, link } }))),
    helpFoot,
  ] };
  pages["livraison-et-retours"] = { seo: "Livraison, suivi et retours SILLON.", rows: [
    S("sv-info", { heading: "Les infos\ndu voyage.", image_asset: f("v2-15-marque-route-lacets.webp"), image_position: "88% 50%", help_text: "Une question sur la livraison ou un retour ?\nNous sommes là pour vous aider.", help_link: U("contact"), note: "Conditions commerciales à compléter.", image_bottom_asset: f("v2-15-marque-route-lacets.webp"), image_bottom_position: "20% 70%", image_bottom_position_mobile: "100% 62%", image_bottom_zoom_mobile: 200 }, [
      { type: "part", settings: { title: "Livraison", icon: "truck", anchor: "livraison", text: p("Nous préparons votre commande avec soin et vous la confions à nos partenaires de livraison. Les détails et frais vous sont indiqués à l'étape suivante."), text_mobile: p("Nous préparons votre commande avec soin.") + p("Vous trouverez les conditions de livraison à l'étape suivante de votre commande.") } },
      { type: "part", settings: { title: "Suivi", icon: "pin", anchor: "suivi", text: p("Une fois expédiée, vous recevrez un e-mail avec les informations pour suivre votre commande en temps réel.") } },
      { type: "part", settings: { title: "Retours", icon: "box", anchor: "retours", text: p("Si un produit ne vous convient pas, vous pouvez demander un retour depuis votre espace ou en nous contactant. Nous vous accompagnons dans cette démarche.") } },
    ]),
    helpFoot,
  ] };
  pages["suivi-de-commande"] = { seo: "Suivre une commande SILLON (démonstration : résultat d'exemple).", rows: [
    S("sv-track", { heading: "Où en est\nvotre SILLON ?", heading_mobile: "Où en est\nvotre\nSILLON ?", intro: "Renseignez les informations ci-dessous pour\nretrouver l'état de votre commande.", intro_mobile: "Renseignez les informations ci-dessous\npour retrouver l'état de votre commande.", hint_text: "Vous ne retrouvez pas votre\nnuméro ?\nConsultez votre e-mail de\nconfirmation.", image_asset: f(rock), image_alt: alt(rock), image_position: "67% 89%", image_zoom: 140, image_position_mobile: "70% 100%", image_zoom_mobile: 100, image_place_w: 750, image_place_x: -300, image_place_y: -376, title_width: 88, number_placeholder: "Ex. SLN123456", email_placeholder: "votre@email.com", simulate: true, help_link: U("contact"), note: "Conditions commerciales à compléter" }),
    helpFoot,
  ] };
  const legal = (heading: string, body: string, cookies = false): { seo: string; rows: Row[] } => ({ seo: `${heading.replace(/\n/g, " ")} — SILLON.`, rows: [S("sv-legal", { heading, body, show_cookies_button: cookies }), legalFoot] });
  pages["mentions-legales"] = legal("Mentions\nlégales.", p("Boutique de démonstration du studio : aucune vente réelle.") + p(TODO("éditeur du site, forme juridique, adresse, immatriculation, directeur de la publication, hébergeur")));
  pages["conditions-de-vente"] = legal("Conditions\nde vente.", p("Le prix affiché (129 €) est illustratif : cette boutique est une démonstration, aucune commande n'est possible.") + p(TODO("conditions générales de vente : prix, paiement, livraison, rétractation, garanties légales, service client")));
  pages["confidentialite"] = legal("Confiden-\ntialité.", p("Les formulaires de cette démonstration n'envoient rien ; les choix de cookies restent dans votre navigateur.") + p(TODO("politique de confidentialité : responsable du traitement, données collectées, finalités, durées, droits")));
  pages["cookies"] = legal("Cookies.", p("Les cookies nécessaires font fonctionner le site. La mesure d'audience est facultative et ne démarre qu'avec votre accord ; vous pouvez changer d'avis à tout moment.") + p(TODO("liste des cookies et outils utilisés par la boutique")), true);
  // Pages du site (ordre de SV_PAGES) ; les anciennes pages de la composition du catalogue sont retirées.
  for (const key of Object.keys(spec.templates)) if (key.startsWith("page.")) delete spec.templates[key];
  spec.store.pages = SV_PAGES.filter((pg) => pages[pg.handle]).map((pg) => {
    spec.templates[`page.${pg.suffix}`] = svTemplate(pages[pg.handle].rows);
    return { handle: pg.handle, title: pg.fr, template_suffix: pg.suffix, body_html: "", seo: { title: `${pg.fr} — SILLON`, description: pages[pg.handle].seo } };
  });

  // ------------------------------------------------------------------------------------------- En-tête, pied, menus
  const header = spec.groups.header;
  const hid = header.order.find((id) => header.sections[id].type === "sv-header")!;
  header.sections[hid].settings = headerSettings("fr", { cta: "Découvrir", ctaLink: PRODUCT, demo: true, checkoutPage: U("commande"), cookiesLink: U("cookies"), menuImage: f("v2-17-journal-lac-foret.webp"), contactLink: U("contact"), extraLabel: "Assistance", extraLink: U("faq"), thumb: f("v2-02-machine-detouree.webp") });
  header.sections[hid].settings.menu_image_position = "100% 50%"; // fond montagne et lac, sans le produit
  // Planche mobile 07 (menu ouvert) : liens légaux dans l'ordre de la maquette.
  spec.store.menus["legal-menu-m"] = { title: "Liens légaux (menu du téléphone)", links: [{ title: "Conditions de vente", url: U("conditions-de-vente") }, { title: "Confidentialité", url: U("confidentialite") }, { title: "Mentions légales", url: U("mentions-legales") }] };
  header.sections[hid].settings.menu_legal = "legal-menu-m";
  const footer = spec.groups.footer;
  const fid = footer.order.find((id) => footer.sections[id].type === "sv-footer")!;
  footer.sections[fid].settings = footerSettings("fr", { tagline: "Une autre façon\nde prendre la route.", lightTagline: "Le café\nvous mène\nplus loin.", lightLink: PRODUCT, note: "Boutique de démonstration — prix illustratif, aucun paiement." });
  spec.store.menus["main-menu"] = { title: "Navigation", links: [{ title: "La machine", url: PRODUCT }, { title: "Le rituel", url: U("le-rituel") }, { title: "Carnet", url: U("carnet") }, { title: "SILLON", url: U("sillon") }] };
  spec.store.menus.footer = { title: "Aide", links: [{ title: "Aide", url: U("faq") }, { title: "Livraison", url: U("livraison-et-retours") }, { title: "Retours", url: `${U("livraison-et-retours")}#retours` }, { title: "Mentions légales", url: U("mentions-legales") }] };
  spec.store.menus["legal-short"] = { title: "Liens légaux (court)", links: [{ title: "Confidentialité", url: U("confidentialite") }, { title: "Conditions", url: U("conditions-de-vente") }] };
  footer.sections[fid].settings.dark_legal_menu = "legal-short";
  // Planche mobile 04 : colonnes du pied sombre propres au téléphone.
  spec.store.menus["footer-explore-m"] = { title: "Explorer (téléphone)", links: [{ title: "La machine", url: PRODUCT }, { title: "Le rituel", url: U("le-rituel") }, { title: "Le carnet", url: U("carnet") }, { title: "SILLON", url: U("sillon") }] };
  spec.store.menus["footer-help-m"] = { title: "Aide (téléphone)", links: [{ title: "Livraison", url: U("livraison-et-retours") }, { title: "Retours", url: `${U("livraison-et-retours")}#retours` }, { title: "Mentions légales", url: U("mentions-legales") }] };
  footer.sections[fid].settings.menu_mobile = "footer-explore-m";
  spec.store.menus["legal-buy-m"] = { title: "Liens légaux (achat, téléphone)", links: [{ title: "Conditions de vente", url: U("conditions-de-vente") }, { title: "Confidentialité", url: U("confidentialite") }, { title: "Mentions légales", url: U("mentions-legales") }, { title: "Aide", url: U("faq") }] };
  footer.sections[fid].settings.legal_menu_mobile = "legal-buy-m";
  footer.sections[fid].settings.help_menu_mobile = "footer-help-m";
  spec.store.menus.legal = { title: "Informations légales", links: [{ title: "Mentions légales", url: U("mentions-legales") }, { title: "Conditions de vente", url: U("conditions-de-vente") }, { title: "Confidentialité", url: U("confidentialite") }] };
}
