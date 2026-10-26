/**
 * Démonstration TABLE SAISON (issue #175) : restaurant fictif de la famille Services, composé par le vrai moteur dans le
 * thème « table-saison » puis rédigé d'après les cinq planches de Thomas (docs/briefs/table-saison sur la branche
 * brief/table-saison-20261023). Les 61 photographies HD du kit (recréées par IA à partir des maquettes) sont converties
 * en WebP dans public/theme-assets/table-saison/ et importées comme les photos d'un client, étiquetées démonstration.
 *
 * Rien d'inventé comme fait réel : prix et créneaux sont des exemples annoncés comme tels (« Exemple de restaurant —
 * tarifs et disponibilités de démonstration »), coordonnées et mentions légales restent « [À renseigner] », la
 * réservation est une simulation tant que le service réel n'est pas activé. Coquilles des planches corrigées (« Noue
 * serons ravis », « Étape 3 sur 3 » à l'étape 1, « À préciser. » répété), sens inchangé.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { run, now } from "../src/lib/db";
import { emptyProduct, emptyServiceProfile } from "../src/lib/project-types";
import { localBrand } from "../src/lib/engine/local";
import { composeShop } from "../src/lib/engine/shop";
import { loadProject, saveBrand, saveProduct, saveServices, saveStrategy, saveSettings } from "../src/lib/projects";
import { saveAsset } from "../src/lib/library";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { sectionSchema, withDefaults, type SectionInstance, type TemplateJson, type ThemeSpec } from "../src/lib/theme/spec";
import { TS_PAGES, restaurantSettings, tsUrl, type TsPageHandle } from "../src/lib/theme/table-saison";

export const TS_KIT_DIR = path.join(process.cwd(), "public", "theme-assets", "table-saison");
export const TS_PROVENANCE = "Kit TABLE SAISON de Thomas (issue #175) : 61 photographies recréées par IA à partir des cinq maquettes, converties en WebP";
export const TS_DEMO_NOTE = "Exemple de restaurant — tarifs et disponibilités de démonstration.";

/** Les 61 photos du kit (noms de MEDIAS.json), avec leur description. */
export const TS_MEDIA: { file: string; alt: string }[] = [
  ["accueil-hero", "Poisson rôti et légumes de saison sur une nappe en lin, verre de vin blanc"], ["accueil-philosophie", "Salle de bistrot en journée, tables nappées et plantes"], ["risotto-champignons", "Risotto aux champignons et herbes"], ["poisson-roti", "Poisson rôti et légumes"], ["tarte-pommes-creme", "Tarte aux pommes surmontée de crème"],
  ["categorie-entrees", "Entrée de saison"], ["categorie-plats", "Plat de saison"], ["categorie-desserts", "Poire pochée sur un crumble"], ["accueil-lieu", "Salle chaleureuse, nappes blanches et chaises en bois"], ["ingredient-artichauts", "Artichauts violets"],
  ["ingredient-carottes", "Carottes de couleurs"], ["ingredient-girolles", "Girolles"], ["ingredient-herbes", "Herbes fraîches"], ["dejeuner", "Assiette de légumes de saison au déjeuner"], ["diner", "Table du soir, bougies et verres"],
  ["accueil-evenements", "Salle dressée pour un événement privé"], ["accueil-reservation", "Table dressée, verres, bougie et serviettes en lin"], ["carte-veloute", "Velouté de saison et sa garniture dorée"], ["salade-betteraves", "Salade de betteraves et chèvre frais"], ["tarte-pommes-glace", "Part de tarte aux pommes et glace vanille"],
  ["espresso", "Espresso dans une tasse en céramique"], ["saisons-hero", "Salle du soir, branches en vase et table dressée"], ["volaille-grenailles", "Volaille rôtie et pommes grenailles"], ["saisons-salle", "Salle de bistrot aux nappes blanches et appliques dorées"], ["groupes-hero", "Longue table de banquet dressée"],
  ["groupes-table", "Perspective sur une longue table dressée"], ["groupes-soiree", "Salle intime à la bougie"], ["groupes-detail", "Fleurs en vase et verres sur une nappe blanche"], ["reservation-etape-1", "Salle aux tables nappées et bougies"], ["reservation-detail-1", "Verres, bougie et fleurs sur une table aux chaises bordeaux"],
  ["reservation-etape-2", "Noix de Saint-Jacques et sauce aux herbes"], ["reservation-etape-3", "Banquettes en velours bordeaux et tables nappées"], ["reservation-detail-3", "Bougie et fleurs sur une petite table"], ["reservation-confirmee", "Salle du soir avec plantes, tables éclairées"], ["reservation-confirmation-detail", "Table dressée, serviette pliée et bougie"],
  ["reservation-indisponible", "Assiette de légumes rôtis sur une purée crémeuse"], ["lieu-hero", "Salle de bistrot aux chaises en bois et bouquet au premier plan"], ["lieu-assiette", "Carottes rôties et légumes de saison"], ["lieu-table", "Petite table aux chandelles et branches fleuries"], ["lieu-cuisine", "Cuisine ouverte et suspensions en laiton"],
  ["lieu-figues", "Figues et garniture de saison"], ["lieu-fleurs", "Fleurs ambrées dans un grand vase"], ["lieu-banquette", "Banquette en velours bordeaux"], ["galerie-assiette-verte", "Légumes de saison sur une sauce crémeuse"], ["galerie-salle", "Table nappée et chaises en bois"],
  ["galerie-facade", "Façade vert sombre et portes vitrées"], ["galerie-tomates", "Burrata, tomates de couleurs et huile aux herbes"], ["galerie-asperges", "Asperges vertes"], ["galerie-poisson", "Filet de poisson croustillant et sauce verte"], ["galerie-detail-table", "Deux verres, une bougie et des fleurs blanches"],
  ["galerie-mur", "Mur aux cadres et appliques au-dessus des tables"], ["galerie-figues", "Figues mûres et sauce sombre"], ["galerie-cuisine", "Cuisine ouverte et piles d'assiettes"], ["galerie-pain-huile", "Pain de campagne et huile d'olive aux herbes"], ["contact-terrasse", "Terrasse d'un bistrot vert sombre au crépuscule"],
  ["faq-assiette", "Assiette de légumes, verre de vin et bougie"], ["retrouver-reservation", "Table dressée, assiette, serviette en lin, verre et bougie"], ["ma-reservation", "Table en lin, verres, bougie et fleurs"], ["modifier-reservation", "Branches d'olivier dans un vase et bougie"], ["demande-groupe-confirmee", "Salle aux nappes blanches et banquette bordeaux"],
  ["404-assiette", "Assiette vide vue du dessus sur une nappe en lin, fourchette et couteau"],
].map(([file, alt]) => ({ file, alt }));

const p = (s: string) => `<p>${s}</p>`;

export async function tableSaisonProject(userId: string) {
  const pid = seedHoldout(userId, 2, "Démo TABLE SAISON");
  const product = { ...emptyProduct(), name: "TABLE SAISON", nameStatus: "provided" as const, category: "Restaurant (exemple fictif)", sector: "services" as never, summary: "Restaurant fictif de démonstration : cuisine de saison et esprit bistrot." };
  saveProduct(pid, product);
  const services = { ...emptyServiceProfile(), services: [{ key: "dejeuner", name: "Déjeuner", description: "Une carte de saison au déjeuner." }, { key: "diner", name: "Dîner", description: "Une atmosphère plus intime le soir." }, { key: "groupes", name: "Grandes tablées", description: "Repas de groupe et événements privés." }], contactMode: "form" as const };
  const local = localBrand(product, "TABLE SAISON", { business: "services", services });
  saveBrand(pid, { ...local.brand, name: "TABLE SAISON", generatedBy: "local" as const, tagline: "Le goût des bonnes choses. Le plaisir d'être ensemble.", story: "Une cuisine de saison et une table qui rassemble, dans un lieu chaleureux à l'esprit bistrot.", positioning: "Restaurant de cuisine de saison (exemple fictif).", palette: { primary: "#6E1F2D", secondary: "#E8DFCF", accent: "#6E1F2D", light: "#F6F0E5", dark: "#2A2421" }, direction: "table-saison" as never });
  saveStrategy(pid, local.strategy);
  saveServices(pid, services);
  run("UPDATE projects SET store_type = ?, business_type = ?, updated_at = ? WHERE id = ?", "mono", "services", now(), pid);
  saveSettings(pid, { ...loadProject(pid).settings, storeKind: "services" });

  const missing: string[] = [];
  const ids: Record<string, string> = {};
  for (const m of TS_MEDIA) {
    const source = path.join(TS_KIT_DIR, `${m.file}.webp`);
    if (!fs.existsSync(source) || fs.statSync(source).size === 0) { missing.push(`${m.file}.webp`); continue; }
    const bytes = fs.readFileSync(source), meta = await sharp(bytes).metadata();
    const a = await saveAsset({ projectId: pid, userId, data: bytes, mime: "image/webp", name: `table-saison-${m.file}.webp`, origin: "upload", role: "lifestyle", status: "approved", meta: { demo: { isDemo: true, provenance: TS_PROVENANCE }, width: meta.width, height: meta.height, alt: m.alt } });
    ids[m.file] = a.id;
  }
  const built = await composeShop(pid, "table-saison" as never, null, false);
  const spec: ThemeSpec = built.spec;
  const catalogOrder = spec.templates.index.order.map((k) => spec.templates.index.sections[k].type);
  curateTableSaison(spec, ids);
  return { pid, spec, missing, catalogOrder, project: loadProject(pid) };
}

/** Rédaction de la démonstration sur la structure du thème (mêmes types de sections que pour un client). */
export function curateTableSaison(spec: ThemeSpec, ids: Record<string, string>) {
  const file = (name: string) => (ids[name] ? `table-saison-${name}.webp` : "");
  for (const [name, aid] of Object.entries(ids)) spec.files[`table-saison-${name}.webp`] = aid;
  const S = (type: string, settings: Record<string, unknown>, blocks: { type: string; settings: Record<string, unknown> }[] = []): SectionInstance => {
    const schema = sectionSchema(spec, type);
    if (!schema) throw new Error(`Section absente ${type}`);
    return { type, settings: withDefaults(schema.settings, settings), blocks: Object.fromEntries(blocks.map((b, i) => [`${b.type}-${i + 1}`, { type: b.type, settings: withDefaults(schema.blocks.find((x) => x.type === b.type)?.settings, b.settings) }])), block_order: blocks.map((b, i) => `${b.type}-${i + 1}`) };
  };
  const tpl = (rows: SectionInstance[]): TemplateJson => {
    const out: TemplateJson = { sections: {}, order: [] };
    const n: Record<string, number> = {};
    for (const r of rows) { n[r.type] = (n[r.type] ?? 0) + 1; const id = `${r.type}-${n[r.type]}`; out.sections[id] = r; out.order.push(id); }
    return out;
  };
  const photo = (name: string, alt = "") => ({ type: "photo", settings: { image_asset: file(name), alt } });
  const dish = (img: string, name: string, description: string, price: string, vegetarian = false, pos = "50% 50%") => ({ type: "dish", settings: { image_asset: file(img), image_position: pos, name, description, price, vegetarian } });
  const item = (name: string, description: string, price: string, vegetarian = false) => ({ type: "item", settings: { name, description, price, vegetarian } });
  const q = (question: string, answer: string) => ({ type: "question", settings: { question, answer: p(answer) } });
  const BOOK = tsUrl("reserver"), CARTE = tsUrl("la-carte");

  // ─── En-tête, réglages du restaurant, pied de page
  spec.name = "TABLE SAISON — thème Table Saison (démonstration)";
  spec.meta = { ...spec.meta, demo: { isDemo: true, provenance: TS_PROVENANCE, contactTest: false } };
  spec.store.shopName = "TABLE SAISON";
  spec.store.business = "services";
  spec.store.policies = [];
  const header = spec.groups.header;
  header.order = header.order.filter((id) => header.sections[id]?.type !== "announcement-bar");
  for (const id of Object.keys(header.sections)) if (!header.order.includes(id)) delete header.sections[id];
  const headerId = header.order.find((id) => header.sections[id].type === "header")!;
  Object.assign(header.sections[headerId].settings, { cta_label: "Réserver une table", cta_link: BOOK, phone: "", show_search: false, show_cart: false, layout: "logo-left", mobile_menu: "drawer" });
  header.sections["ts-restaurant"] = S("ts-restaurant", { ...restaurantSettings("fr", { address: "", bookingLabel: "Réserver une table", bookingLink: BOOK, bookbar: true, cookiesLink: tsUrl("cookies") }), closures: "2026-12-24..2026-12-26, 2027-01-01" });
  const footer = spec.groups.footer;
  const footerId = footer.order.find((id) => footer.sections[id].type === "footer")!;
  footer.sections[footerId] = S("footer", { style: "brand-left", tagline: "", logo_asset: "", show_wordmark: false, show_policies: false, show_payment: false, color_scheme: "scheme-3" }, [
    { type: "links", settings: { heading: "Liens utiles", menu: "footer" } },
    { type: "text", settings: { heading: "Horaires", text: "<p>Déjeuner : 12h00 – 14h30<br>Dîner : 19h00 – 22h30<br>Jours de fermeture : [À renseigner]</p>" } },
    { type: "text", settings: { heading: "Nous trouver", text: "<p>Adresse : [À renseigner]<br>Téléphone : [À renseigner]</p>" } },
  ]);
  footer.sections["ts-footnote"] = S("ts-footnote", { note: TS_DEMO_NOTE, link1_label: "Mentions légales", link1: tsUrl("mentions-legales"), link2_label: "Politique de confidentialité", link2: tsUrl("confidentialite"), link3_label: "Cookies", link3: tsUrl("cookies") });
  if (!footer.order.includes("ts-footnote")) footer.order.push("ts-footnote");
  spec.settings = { ...spec.settings, logo_asset: "", favicon_asset: "", fab_contact_link: "", fab_back_to_top: false, social_instagram: "", social_facebook: "", social_pinterest: "", social_tiktok: "", social_youtube: "" };

  // ─── Accueil (planche 01)
  spec.templates.index = tpl([
    S("ts-hero", { layout: "home", eyebrow: "Cuisine de saison — Esprit bistrot", heading: "Le goût des bonnes choses. Le plaisir d'être ensemble.", image_asset: file("accueil-hero"), image_alt: "", image_position: "50% 62%", image_position_mobile: "55% 62%", button_label: "Réserver une table", button_link: BOOK, button2_label: "Découvrir la carte", button2_link: CARTE, height: 520, height_mobile: 300 }),
    S("ts-split", { eyebrow: "Notre philosophie", heading: "Une cuisine de saison,\nune table qui rassemble.", text: p("Des produits soigneusement sélectionnés, des assiettes sincères et généreuses, dans un lieu vivant et chaleureux. Chez TABLE SAISON, nous célébrons les saveurs de chaque saison et le plaisir des belles tablées."), link_label: "Découvrir notre univers", link: tsUrl("le-lieu"), link_style: "link", image_asset: file("accueil-philosophie"), image_position: "50% 55%", image_side: "left", columns: ".94fr 1fr", min_height: 270, ornament: "left", mobile: "text-only" }),
    S("ts-dishes", { eyebrow: "Nos incontournables", heading: "Des plats de saison, tout simplement.", style: "cards", more_label: "Voir toute la carte", more_link: CARTE }, [
      dish("risotto-champignons", "Risotto aux champignons", "Riz crémeux, champignons de saison, parmesan affiné, herbes fraîches.", "22 €", false, "50% 45%"),
      dish("poisson-roti", "Poisson rôti et légumes", "Poisson de saison, légumes rôtis, sauce légère au citron.", "26 €", false, "50% 50%"),
      dish("tarte-pommes-creme", "Tarte aux pommes", "Pommes rôties, pâte sablée maison, crème légère à la vanille.", "9 €", false, "50% 55%"),
    ]),
    S("ts-teaser", { eyebrow: "La carte", heading: "Une carte qui évolue\nau fil des saisons.", text: p("Des entrées gourmandes, des plats de saison et des desserts tout en douceur, à découvrir selon l'inspiration du moment."), button_label: "Découvrir la carte", button_link: CARTE, ornament: true }, [
      { type: "tile", settings: { image_asset: file("categorie-entrees"), label: "Entrées", link: `${CARTE}#entrees` } },
      { type: "tile", settings: { image_asset: file("categorie-plats"), label: "Plats", link: `${CARTE}#plats` } },
      { type: "tile", settings: { image_asset: file("categorie-desserts"), label: "Desserts", link: `${CARTE}#desserts` } },
    ]),
    S("ts-split", { eyebrow: "Le lieu", heading: "Un lieu chaleureux\net authentique.", text: p("Une ambiance élégante et conviviale, entre matières naturelles, lumière douce et esprit bistrot. Un cadre idéal pour partager de bons moments, en toute simplicité."), link_label: "Découvrir le lieu", link: tsUrl("le-lieu"), link_style: "link", image_asset: file("accueil-lieu"), image_position: "50% 60%", image_side: "right", columns: "1.2fr 1fr", min_height: 270, ornament: "corner", mobile: "inset" }),
    S("ts-ingredients", { eyebrow: "Des produits de saison", heading: "L'authenticité commence\npar de beaux ingrédients.", text: p("Des produits frais et de saison, sélectionnés avec soin auprès de producteurs de confiance, pour une cuisine sincère et savoureuse."), link_label: "Notre approche", link: tsUrl("au-fil-des-saisons") }, [photo("ingredient-artichauts", "Artichauts violets"), photo("ingredient-carottes", "Carottes de couleurs"), photo("ingredient-girolles", "Girolles"), photo("ingredient-herbes", "Herbes fraîches")]),
    S("ts-moments", {}, [
      { type: "moment", settings: { style: "light", image_asset: file("dejeuner"), image_position: "50% 50%", eyebrow: "Le déjeuner", heading: "Une parenthèse gourmande\nen pleine journée.", text: p("Une carte de saison, idéale pour un déjeuner entre amis ou collègues, dans une ambiance lumineuse."), button_label: "Voir la carte du déjeuner", button_link: CARTE } },
      { type: "moment", settings: { style: "dark", image_asset: file("diner"), image_position: "50% 50%", eyebrow: "Le dîner", heading: "L'art de prendre le temps.", text: p("Une atmosphère plus intime, des saveurs de saison et la douceur d'une soirée bien partagée."), button_label: "Voir la carte du dîner", button_link: CARTE } },
    ]),
    S("ts-banner", { eyebrow: "Vos événements privés", heading: "Des moments uniques,\nautour d'une belle table.", text: p("Déjeuners en groupe, dîners privés, célébrations…<br>Nous vous accompagnons pour créer un moment sur mesure."), button_label: "Nous contacter", button_link: tsUrl("grandes-tablees"), image_asset: file("accueil-evenements"), image_position: "50% 55%", overlay: 50, height: 210, height_mobile: 300 }),
    S("ts-faq", { layout: "inline", eyebrow: "Questions fréquentes", heading: "Vos questions, nos réponses.", ornament: true }, [
      q("Proposez-vous un menu déjeuner ?", "Une carte de saison est servie au déjeuner. Le détail d'un éventuel menu du midi est à préciser par le restaurant."),
      q("Peut-on réserver pour un groupe ?", "Oui. En ligne jusqu'à 8 personnes ; au-delà, envoyez une demande depuis la page « Vos grandes tablées »."),
      q("Avez-vous des options végétariennes ?", "Oui : les plats végétariens sont signalés par une feuille sur la carte."),
      q("Les animaux sont-ils acceptés ?", "À préciser par le restaurant."),
    ]),
    S("ts-banner", { eyebrow: "Table Saison", heading: "À votre table ?", text: p("Réservez dès maintenant et venez partager<br>un moment gourmand chez nous."), button_label: "Réserver une table", button_link: BOOK, image_asset: file("accueil-reservation"), image_position: "50% 60%", overlay: 45, height: 160, height_mobile: 260 }),
  ]);
  spec.store.seo = { title: "TABLE SAISON — cuisine de saison, esprit bistrot (démonstration)", description: "Restaurant fictif de démonstration : carte de saison, le lieu, grandes tablées et réservation en ligne simulée." };

  // ─── Pages (planches 02 à 05)
  const pages: Record<TsPageHandle, { seo: string; rows: SectionInstance[] }> = {
    "la-carte": { seo: "La carte de saison : entrées, plats, desserts et boissons (tarifs de démonstration).", rows: [
      S("ts-hero", { layout: "page", heading: "La carte", show_rule: true, text: p("Une cuisine de saison,<br>entre tradition et créativité."), image_asset: file("carte-veloute"), image_position: "50% 45%", image_position_mobile: "65% 50%", height: 470, height_mobile: 240 }),
      S("ts-menu", { show_tabs: true, note: TS_DEMO_NOTE, cta_label: "Réserver une table", cta_link: BOOK }, [
        { type: "category", settings: { title: "Entrées", anchor: "entrees", image_asset: file("salade-betteraves"), image_alt: "Salade de betteraves et chèvre frais", image_side: "right" } },
        item("Velouté de saison", "Légumes de saison, huile aux herbes, éclats de graines", "9 €", true),
        item("Salade de betteraves et chèvre", "Betteraves rôties, chèvre frais, noix, jeunes pousses", "11 €", true),
        { type: "category", settings: { title: "Plats", anchor: "plats", image_asset: file("poisson-roti"), image_alt: "Poisson rôti et légumes", image_side: "right" } },
        item("Risotto aux champignons", "Champignons de saison, parmesan, herbes fraîches", "22 €", true),
        item("Poisson rôti et légumes", "Poisson de saison, légumes de saison, sauce légère au citron", "26 €"),
        item("Volaille et pommes grenailles", "Volaille rôtie, pommes grenailles, jus au thym", "24 €"),
        { type: "category", settings: { title: "Desserts", anchor: "desserts", image_asset: file("tarte-pommes-glace"), image_alt: "Part de tarte aux pommes et glace vanille", image_side: "left" } },
        item("Tarte aux pommes", "Pommes de saison, pâte sablée, glace vanille", "9 €", true),
        item("Mousse au chocolat", "Chocolat noir, éclats de grué de cacao", "8 €"),
        { type: "category", settings: { title: "Boissons", anchor: "boissons", image_asset: file("espresso"), image_alt: "Espresso", image_side: "right" } },
        item("Eau pétillante", "Servie fraîche", "4 €"),
        item("Espresso", "Un grand classique", "3 €"),
      ]),
    ] },
    "au-fil-des-saisons": { seo: "Au fil des saisons : notre sélection du moment, trois assiettes de saison.", rows: [
      S("ts-hero", { layout: "page", heading: "Au fil\ndes saisons", show_rule: true, text: p("Des produits de saison,<br>une cuisine vivante et inspirée."), image_asset: file("saisons-hero"), image_position: "50% 60%", height: 520, height_mobile: 300 }),
      S("ts-dishes", { style: "plain", heading: "Notre sélection du moment", text: p("Trois assiettes qui célèbrent la générosité de la saison.") }, [
        dish("carte-veloute", "Velouté de saison", "Légumes de saison, huile aux herbes, éclats de graines.", "", true, "45% 50%"),
        dish("risotto-champignons", "Risotto aux champignons", "Champignons de saison, parmesan, herbes fraîches.", "", true, "50% 50%"),
        dish("volaille-grenailles", "Volaille et pommes grenailles", "Volaille rôtie, pommes grenailles, jus au thym.", "", false, "50% 50%"),
      ]),
      S("ts-quote", { quote: "“Une cuisine de saison\npour des moments qui comptent.”", button_label: "Découvrir la carte", button_link: CARTE, button2_label: "Réserver une table", button2_link: BOOK, ornament: true }),
      S("ts-photos", { columns: "1fr", ratio: "2.3", bleed: true }, [photo("saisons-salle", "Salle de bistrot aux nappes blanches")]),
    ] },
    "grandes-tablees": { seo: "Repas de groupe et événements privés : demande de renseignements.", rows: [
      S("ts-hero", { layout: "page", heading: "Vos grandes\ntablées", show_rule: true, text: p("Des moments à partager,<br>dans un cadre chaleureux."), image_asset: file("groupes-hero"), image_position: "50% 55%", image_position_mobile: "60% 50%", height: 520, height_mobile: 300 }),
      S("ts-cards", {}, [
        { type: "card", settings: { image_asset: file("groupes-table"), heading: "Repas de groupe", text: p("Pour vos déjeuners ou dîners en groupe, profitez d'une expérience conviviale autour d'une cuisine de saison.") } },
        { type: "card", settings: { image_asset: file("groupes-soiree"), heading: "Événement privé", text: p("Anniversaire, repas de famille, événement professionnel… Privatisez un espace et créez un moment sur mesure.") } },
      ]),
      S("ts-request", { heading: "Demande de renseignements", text: p("Nous revenons vers vous rapidement pour étudier votre demande."), min_party: 2, image_asset: file("groupes-detail"), image_position: "50% 40%", conditions_title: "Conditions", conditions_text: p("Les conditions d'accueil et d'organisation des groupes et événements privés sont à préciser selon vos besoins.") }),
    ] },
    reserver: { seo: "Réserver une table en ligne (démonstration : aucune réservation réelle).", rows: [
      S("ts-booking", { image_step1: file("reservation-etape-1"), image_step2: file("reservation-etape-2"), image_step3: file("reservation-etape-3"), image_unavailable: file("reservation-indisponible"), image_confirm: file("reservation-confirmee"), aside_step1: file("reservation-detail-1"), aside_step3: file("reservation-detail-3"), aside_confirm: file("reservation-confirmation-detail"), text_confirm: "Merci pour votre réservation. Nous avons hâte de vous accueillir chez Table Saison.", newsletter_label: "Je souhaite recevoir la newsletter de Table Saison", terms_link: tsUrl("conditions-de-reservation"), terms_after: "liées à la réservation", manage_link: tsUrl("ma-reservation"), map_link: tsUrl("contact") }),
    ] },
    "le-lieu": { seo: "Le lieu : une table où l'on aime rester, cuisine de saison et esprit bistrot.", rows: [
      S("ts-hero", { layout: "page", heading: "Une table\noù l'on aime rester", text: p("Une cuisine de saison, généreuse et sincère,<br>dans un lieu chaleureux pensé pour les beaux moments."), button_label: "Réserver une table", button_link: BOOK, image_asset: file("lieu-hero"), image_position: "50% 50%", height: 640, height_mobile: 420 }),
      S("ts-split", { heading: "Une cuisine\nde saison, tout simplement", text: p("Chez Table Saison, nous célébrons le goût des produits de saison à travers une cuisine française actuelle, élégante et conviviale. Des assiettes qui évoluent au fil des récoltes, des saveurs franches et des associations justes, à partager dans une atmosphère chaleureuse."), link_label: "Découvrir la carte", link: CARTE, link_style: "olive", image_asset: file("lieu-assiette"), image_position: "50% 50%", image_side: "left", boxed: true, min_height: 300, ornament: "none", mobile: "image" }),
      S("ts-photos", { columns: "1fr 1fr", ratio: "1.35", bleed: false }, [photo("lieu-table", "Petite table aux chandelles"), photo("lieu-cuisine", "Cuisine ouverte")]),
      S("ts-panel", { heading: "L'art de recevoir,\nau fil des saisons", text: p("Des produits choisis avec soin, une cuisine de saison et un lieu où chaque détail compte, pour faire de chaque repas un moment qui reste."), ornament: true }),
      S("ts-photos", { columns: "1.25fr .88fr 1.15fr", ratio: "0.95", bleed: true, height: 440 }, [photo("lieu-figues", "Figues et garniture de saison"), photo("lieu-fleurs", "Fleurs ambrées"), photo("lieu-banquette", "Banquette en velours bordeaux")]),
    ] },
    galerie: { seo: "Galerie : le lieu, dans l'assiette et les détails de Table Saison.", rows: [
      S("ts-intro", { heading: "L'esprit Table Saison,\nen images", text: p("Une atmosphère, des saveurs, des détails…<br>Découvrez Table Saison à travers quelques instants choisis."), padding_top: 50, padding_bottom: 18 }),
      S("ts-gallery", {}, [
        ["galerie-assiette-verte", "assiette", 5], ["galerie-salle", "lieu", 7], ["galerie-facade", "lieu", 5], ["galerie-tomates", "assiette", 4], ["galerie-asperges", "details", 3],
        ["galerie-poisson", "assiette", 6], ["galerie-detail-table", "details", 6], ["galerie-mur", "lieu", 7], ["galerie-figues", "assiette", 5], ["galerie-cuisine", "lieu", 8], ["galerie-pain-huile", "details", 4],
      ].map(([name, category, span]) => ({ type: "photo", settings: { image_asset: file(String(name)), alt: TS_MEDIA.find((m) => m.file === name)!.alt, category, span } }))),
    ] },
    contact: { seo: "Nous rendre visite : adresse, horaires, accès et formulaire de contact.", rows: [
      S("ts-intro", { heading: "Nous rendre visite", text: p("Nous serons ravis de vous accueillir pour un déjeuner,<br>un dîner ou tout simplement un bon moment à table."), padding_top: 48, padding_bottom: 26 }),
      S("ts-photos", { columns: "1fr", ratio: "1.85", bleed: true }, [photo("contact-terrasse", "Terrasse du bistrot au crépuscule")]),
      S("ts-contact", { form_text: p("Une question ? Une demande particulière ?<br>N'hésitez pas à nous envoyer un message, nous vous répondrons avec plaisir.") }),
    ] },
    faq: { seo: "Questions fréquentes : réservations, la carte et votre visite.", rows: [
      S("ts-intro", { heading: "Questions fréquentes", text: p("Vous trouverez ici les réponses aux questions les plus courantes.<br>Pour toute autre demande, n'hésitez pas à nous contacter."), padding_top: 54, padding_bottom: 0 }),
      S("ts-faq", { layout: "page" }, [
        { type: "category", settings: { title: "Réservations" } },
        q("Comment réserver une table ?", "En ligne, depuis la page « Réserver une table » : choisissez le nombre de personnes, la date puis l'horaire, et laissez vos coordonnées. Vous pouvez aussi nous écrire depuis la page Contact."),
        q("Puis-je modifier ou annuler ma réservation ?", "Oui, depuis le lien « Gérer ma réservation » ou la page « Retrouver ma réservation ». Les conditions d'annulation sont à préciser par le restaurant."),
        q("Acceptez-vous les réservations pour les groupes ?", "Oui. En ligne jusqu'à 8 personnes ; au-delà, envoyez une demande depuis la page « Vos grandes tablées »."),
        q("Proposez-vous des espaces privatifs ?", "Pour un événement privé, décrivez votre projet depuis la page « Vos grandes tablées ». Les conditions de privatisation sont à préciser par le restaurant."),
        { type: "category", settings: { title: "La carte" } },
        q("La carte change-t-elle régulièrement ?", "Oui, elle évolue au fil des saisons, selon les produits du moment."),
        q("Proposez-vous des options végétariennes ou végétaliennes ?", "Les plats végétariens sont signalés par une feuille sur la carte. Pour une option végétalienne, renseignez-vous auprès de l'équipe."),
        q("Pouvez-vous vous adapter à des régimes alimentaires spécifiques ?", "Indiquez vos besoins dans la remarque de votre réservation. Pour les allergènes, renseignez-vous auprès de l'équipe."),
        q("Les prix de la carte sont-ils disponibles en ligne ?", "Oui, sur la page « La carte ». Sur ce site d'exemple, les tarifs sont des valeurs de démonstration."),
        { type: "category", settings: { title: "Votre visite" } },
        q("Quels sont les horaires d'ouverture ?", "Ils figurent en bas de chaque page et sur la page Contact ; ils peuvent varier selon la saison."),
        q("Le restaurant est-il accessible aux personnes à mobilité réduite ?", "À préciser par le restaurant."),
        q("Y a-t-il un parking à proximité ?", "À préciser par le restaurant (voir aussi les accès sur la page Contact)."),
        q("Les animaux de compagnie sont-ils acceptés ?", "À préciser par le restaurant."),
      ]),
      S("ts-banner", { heading: "Une autre question ?\nNous sommes à votre écoute.", text: "", button_label: "Nous contacter", button_link: tsUrl("contact"), image_asset: file("faq-assiette"), image_position: "50% 60%", align: "right", overlay: 35, height: 520, height_mobile: 420 }),
    ] },
    "retrouver-ma-reservation": { seo: "Retrouver ma réservation : un lien sécurisé envoyé par e-mail.", rows: [
      S("ts-manage", { view: "lookup", eyebrow: "Votre réservation", heading: "Retrouver\nma réservation", text: p("Renseignez l'adresse e-mail utilisée lors de votre réservation pour retrouver les détails de votre table."), help: p("Vous n'avez pas reçu votre e-mail de confirmation ?<br>Vérifiez vos spams ou contactez-nous à [À renseigner]."), image_asset: file("retrouver-reservation"), image_position: "50% 60%" }),
    ] },
    "ma-reservation": { seo: "Ma réservation : détail, modification et annulation.", rows: [
      S("ts-manage", { view: "detail", heading: "Ma réservation", text: p("Voici les détails de votre réservation."), back_label: "Retour", back_link: "/", image_asset: file("ma-reservation"), image_position: "50% 55%", modify_link: tsUrl("modifier-ma-reservation") }),
    ] },
    "modifier-ma-reservation": { seo: "Modifier ma réservation : personnes, date et heure.", rows: [
      S("ts-manage", { view: "modify", heading: "Modifier ma réservation", text: p("Ajustez les détails de votre réservation."), back_label: "Retour à ma réservation", back_link: tsUrl("ma-reservation"), image_asset: file("modifier-reservation"), image_position: "40% 50%" }),
    ] },
    "demande-de-groupe-recue": { seo: "Demande de groupe reçue.", rows: [
      S("ts-hero", { layout: "fade", eyebrow: "Demande de groupe", heading: "Votre demande\na bien été reçue", text: p("Merci pour votre message. Nous avons bien reçu votre demande de réservation pour un groupe."), text_2: p("Notre équipe l'étudie avec attention et reviendra vers vous prochainement pour vous proposer une table adaptée et finaliser les détails."), button_label: "Découvrir la carte", button_link: CARTE, button2_label: "Retour à l'accueil", button2_link: "/", image_asset: file("demande-groupe-confirmee"), image_position: "50% 50%", height: 600, height_mobile: 300 }),
    ] },
    "mentions-legales": { seo: "Mentions légales.", rows: [legal(1, "Mentions légales", [["Éditeur du site", "[À renseigner]", "Contenu à compléter avant publication."], ["Hébergement", "[À renseigner]", "Contenu à compléter avant publication."], ["Propriété intellectuelle", "", "L'ensemble du contenu du site (textes, images, photographies, graphismes, logo, etc.) est protégé par le droit de la propriété intellectuelle.<br>Contenu à compléter avant publication."]])] },
    confidentialite: { seo: "Politique de confidentialité.", rows: [legal(2, "Confidentialité", [["Responsable du traitement", "[À renseigner]", "Contenu à compléter avant publication."], ["Données collectées", "", "Pour une réservation : prénom, nom, e-mail, et facultativement téléphone et remarque. Pour un message ou une demande de groupe : les champs du formulaire. La lettre d'information n'est envoyée qu'avec votre accord, coché à part."], ["Durée de conservation et vos droits", "[À renseigner]", "Contenu à compléter avant publication."]])] },
    "conditions-de-reservation": { seo: "Conditions de réservation.", rows: [legal(3, "Conditions de réservation", [["Réservation en ligne", "", "Jusqu'à 8 personnes en ligne ; au-delà, une demande de groupe est étudiée par l'équipe. La réservation est confirmée à l'écran avec un numéro."], ["Retard et absence", "[À renseigner]", "Contenu à compléter avant publication."], ["Modification et annulation", "[À renseigner]", "Depuis le lien « Gérer ma réservation ». Conditions à préciser par le restaurant."]])] },
    cookies: { seo: "Cookies et traceurs.", rows: [legal(4, "Cookies", [["Cookies nécessaires", "", "Ils mémorisent dans votre navigateur vos choix de cookies et la réservation en cours. Ils sont toujours actifs."], ["Mesure d'audience", "[À renseigner]", "Désactivée tant que vous ne l'avez pas acceptée dans le bandeau des cookies."], ["Vos choix", "", "<a href=\"#cookies\" data-ts-cookies-reset>Modifier mes choix de cookies</a>"]])] },
  };
  function legal(current: number, heading: string, rows: [string, string, string][]): SectionInstance {
    return S("ts-legal", { heading, current, tab1_link: tsUrl("mentions-legales"), tab2_link: tsUrl("confidentialite"), tab3_link: tsUrl("conditions-de-reservation"), tab4_link: tsUrl("cookies") }, rows.map(([title, value, text]) => ({ type: "item", settings: { title, value, text: p(text) } })));
  }
  for (const key of Object.keys(spec.templates)) if (key.startsWith("page.")) delete spec.templates[key];
  spec.templates.page = tpl([S("main-page", { width: "narrow", color_scheme: "scheme-1" })]);
  spec.store.pages = TS_PAGES.map((pg) => {
    spec.templates[`page.${pg.suffix}`] = tpl(pages[pg.handle].rows);
    return { handle: pg.handle, title: pg.fr, template_suffix: pg.suffix, body_html: "", seo: { title: `${pg.fr} — TABLE SAISON`, description: pages[pg.handle].seo } };
  });
  spec.templates["404"] = tpl([S("ts-404", { image_asset: file("404-assiette"), image_position: "50% 50%", button_link: "/", button2_link: CARTE })]);
  const links = [{ title: "La carte", url: CARTE }, { title: "Le lieu", url: tsUrl("le-lieu") }, { title: "Galerie", url: tsUrl("galerie") }, { title: "Contact", url: tsUrl("contact") }];
  spec.store.menus = { "main-menu": { title: "Menu principal", links }, footer: { title: "Liens utiles", links } };
}
