/**
 * Démonstration SILLON (issue #148) : machine à espresso nomade, troisième thème « boutique spécialisée ».
 *
 * Le projet est créé comme un projet client (marque, produit, médias avec rôles), puis composé par le VRAI moteur dans le
 * thème du catalogue « sillon » (composeShop). La rédaction de démonstration remplit ensuite les mêmes sections, dans le
 * même ordre, avec des textes écrits pour SILLON — un test vérifie que l'accueil et la fiche gardent exactement l'ordre des
 * types de la composition du catalogue.
 *
 * Rien n'est inventé : seuls les faits visibles sur les 16 visuels fournis par Thomas (commit 8bbbc3bd, sans personne)
 * sont affirmés. Pression, chauffe, alimentation, autonomie, compatibilité, contenance, dimensions, poids, matériaux,
 * certifications, prix, livraison, retours et garantie restent des champs « [À compléter : …] » visibles et modifiables.
 * Aucun avis, note, compteur ni urgence. Les visuels 07 (bouton cuivré) et 16 (lumière ivoire) sont vides à la source :
 * ils ne sont pas importés.
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
import { sectionSchema, withDefaults, type ThemeSpec, type SectionInstance, type TemplateJson, type StoreProduct } from "../src/lib/theme/spec";

export const SILLON_PROVENANCE = "Issue #148 (20 octobre 2026) — démonstration du studio, images IA déjà générées fournies par Thomas (commit 8bbbc3bd), sans personne, aucun paiement";
export const SILLON_DIR = path.join(process.cwd(), "public", "theme-assets", "sillon");
export const SILLON_HANDLE = "machine-espresso-nomade-sillon";

/** Rôle de chaque visuel (le dernier importé d'un rôle prend le premier emplacement du thème) et texte alternatif. */
export const SILLON_MEDIA: { file: string; role: string; alt: string }[] = [
  { file: "sillon-09.webp", role: "logo", alt: "SILLON" },
  { file: "sillon-03.webp", role: "packshot", alt: "Machine à espresso SILLON de profil, côté droit, sur fond ivoire." },
  { file: "sillon-15.webp", role: "packshot", alt: "Machine SILLON vue de côté, verre d'espresso dessous." },
  { file: "sillon-11.webp", role: "packshot", alt: "Machine SILLON de face : bouton cuivré, marquage SILLON et verre d'espresso." },
  { file: "sillon-02.webp", role: "packshot", alt: "Machine à espresso nomade SILLON, corps brun mat et bague cuivrée, sur fond clair." },
  { file: "sillon-01.webp", role: "detail", alt: "Machine SILLON vue de dessus : couvercle rond, bague cuivrée et verre d'espresso." },
  { file: "sillon-19.webp", role: "detail", alt: "Gros plan : l'espresso coule de la machine SILLON dans le verre." },
  { file: "sillon-06.webp", role: "detail", alt: "Machine SILLON de trois quarts : bague, bouton et marquage cuivrés." },
  { file: "sillon-13.webp", role: "scene", alt: "Machine SILLON sur une table de balcon face aux montagnes." },
  { file: "sillon-14.webp", role: "scene", alt: "Machine SILLON sur la tablette d'un salon ferroviaire, à côté d'un livre." },
  { file: "sillon-08.webp", role: "scene", alt: "Machine SILLON sur le plan d'un buffet de chambre d'hôtel." },
  { file: "sillon-12.webp", role: "scene", alt: "Machine SILLON sur un comptoir en calcaire, croissants à côté." },
  { file: "sillon-05.webp", role: "scene", alt: "Machine SILLON sur un bureau en chêne clair, près d'un ordinateur portable." },
  { file: "sillon-10.webp", role: "banner", alt: "Machine SILLON sur une table de pique-nique en automne, au bord d'un lac." },
  { file: "sillon-18.webp", role: "lifestyle", alt: "Machine SILLON sur une table de terrasse face à la mer." },
  { file: "sillon-17.webp", role: "lifestyle", alt: "Machine SILLON sur une commode avant un départ, sac de voyage et carte à côté." },
  { file: "sillon-04.webp", role: "lifestyle", alt: "Machine à espresso nomade SILLON sur un socle sombre, dans une lumière cuivrée." },
];
/** Visuels de l'inventaire vides à la source (0 octet dans le commit 8bbbc3bd) : signalés, jamais remplacés. */
export const SILLON_EMPTY = ["sillon-07.webp", "sillon-16.webp"];

const p = (s: string) => `<p>${s}</p>`;
const TODO = (what: string) => `[À compléter : ${what}]`;

/** FAQ : réponses connues, sinon champ à compléter (jamais de réponse inventée). */
export const SILLON_FAQ: [string, string][] = [
  ["Où peut-on utiliser SILLON ?", `SILLON est pensée pour vous suivre. Nos photos la montrent sur un bureau, un comptoir de cuisine, le buffet d'une chambre d'hôtel, la tablette d'un train, une table de balcon ou de pique-nique. ${TODO("conditions d'utilisation réelles : alimentation, autonomie, usage en extérieur")}`],
  ["Quel café utiliser : capsules ou café moulu ?", `${TODO("format de café compatible")} Nous ne l'indiquerons qu'une fois confirmé.`],
  ["Comment l'alimenter ou la recharger ?", TODO("mode d'alimentation, recharge et autonomie")],
  ["Quelles sont ses dimensions et son poids ?", TODO("hauteur, diamètre, poids et contenance du réservoir")],
  ["Le verre des photos est-il fourni ?", TODO("contenu exact du coffret")],
  ["Comment l'entretenir ?", TODO("nettoyage, détartrage et pièces amovibles")],
  ["Quelle est la garantie ?", TODO("durée et conditions de garantie")],
];

export async function sillonProject(userId: string, options: { mediaDir?: string } = {}) {
  const dir = options.mediaDir ?? SILLON_DIR;
  const pid = seedHoldout(userId, 0, "Démo SILLON");
  // Produit : uniquement les faits visibles sur les visuels fournis ; aucun prix (inconnu).
  const product = {
    ...emptyProduct(), name: "Machine à espresso nomade SILLON", nameStatus: "provided" as const, category: "Machine à espresso nomade", sector: "maison" as const,
    summary: "Machine à espresso nomade : corps cylindrique brun mat, bague et bouton de teinte cuivrée, l'espresso coule directement dans le verre placé dessous.",
    facts: [
      { key: "finition", label: "Finition", value: "corps brun mat, bague et bouton de teinte cuivrée", status: "confirmed" as const, source: "user" as const },
      { key: "service", label: "Service", value: "l'espresso coule directement dans le verre placé dessous", status: "confirmed" as const, source: "user" as const },
    ],
    variants: [],
  };
  saveProduct(pid, product);
  const local = localBrand(product, "SILLON", { business: "products" });
  // Couleurs relevées sur le logo fourni (brun #3A1A0A, cuivre) et les visuels (ivoire, espresso).
  const palette = { primary: "#3B1C0C", secondary: "#E7D8C6", accent: "#B8743F", light: "#F4EDE3", dark: "#24140C" };
  saveBrand(pid, { ...local.brand, name: "SILLON", generatedBy: "local" as const, tagline: "L'espresso qui vous suit.", story: "SILLON part d'une idée simple : emporter le geste du café comme on emporte un livre.", positioning: "Une machine à espresso nomade pour le bureau, le voyage et les tables du dehors.", palette, direction: "sillon" });
  saveStrategy(pid, local.strategy);
  run("UPDATE projects SET store_type = ?, business_type = ?, updated_at = ? WHERE id = ?", "mono", "products", now(), pid);
  saveSettings(pid, { ...loadProject(pid).settings, storeKind: "specialty" });

  // Médias : importés comme ceux d'un client (rôles explicites), étiquetés démonstration.
  const missing: string[] = [...SILLON_EMPTY];
  const ids: Record<string, string> = {};
  for (const m of SILLON_MEDIA) {
    const source = path.join(dir, m.file);
    if (!fs.existsSync(source) || fs.statSync(source).size === 0) { missing.push(m.file); continue; }
    const bytes = fs.readFileSync(source), meta = await sharp(bytes).metadata();
    const a = await saveAsset({ projectId: pid, userId, data: bytes, mime: "image/webp", name: m.file, origin: "upload", role: m.role, status: "approved", meta: { demo: { isDemo: true, provenance: SILLON_PROVENANCE }, width: meta.width, height: meta.height, alt: m.alt } });
    ids[m.file] = a.id;
    if (m.role === "logo") {
      const png = await sharp(bytes).resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      const fav = await saveAsset({ projectId: pid, userId, data: png, mime: "image/png", name: "sillon-favicon-180.png", origin: "upload", role: "favicon", status: "approved", meta: { demo: { isDemo: true, provenance: SILLON_PROVENANCE }, width: 180, height: 180 } });
      ids["sillon-favicon-180.png"] = fav.id;
    }
  }

  // Composition du catalogue par le vrai moteur (thème « sillon ») : ordre et types des sections de référence.
  const built = await composeShop(pid, "sillon", null, false);
  const spec: ThemeSpec = built.spec;
  if (process.env.SILLON_DEBUG) for (const k of Object.keys(spec.templates).filter((x) => x === "index" || x.startsWith("product"))) console.log(k, spec.templates[k].order.map((id) => `${spec.templates[k].sections[id].type}${spec.templates[k].sections[id].disabled ? "(masquée)" : ""}`).join(" · "));
  const productKey = spec.store.product.template_suffix ? `product.${spec.store.product.template_suffix}` : "product";
  const catalogOrder = { index: spec.templates.index.order.map((k) => spec.templates.index.sections[k].type), product: spec.templates[productKey].order.map((k) => spec.templates[productKey].sections[k].type) };
  curate(spec, ids);
  return { pid, spec, missing, catalogOrder, project: loadProject(pid) };
}

/** Rédaction de démonstration posée sur la composition du catalogue (mêmes sections, même ordre). */
function curate(spec: ThemeSpec, ids: Record<string, string>) {
  for (const [file, id] of Object.entries(ids)) spec.files[file] = id;
  const alt = (file: string) => SILLON_MEDIA.find((m) => m.file === file)?.alt ?? "";
  const img = (file: string, extra: Record<string, unknown> = {}) => ({ image_asset: ids[file] ? file : "", image_alt: alt(file), ...extra });
  // Sections dont le schéma de couleurs est choisi ici ; les autres gardent celui de la composition du thème.
  const ownScheme = new WeakSet<SectionInstance>();
  const section = (type: string, settings: Record<string, unknown>, blocks: { type: string; settings: Record<string, unknown> }[] = []): SectionInstance => {
    const schema = sectionSchema(spec, type); if (!schema) throw new Error(`Section absente ${type}`);
    const out: SectionInstance = { type, settings: withDefaults(schema.settings, settings), blocks: Object.fromEntries(blocks.map((b, i) => [`b${i}`, { type: b.type, settings: withDefaults(schema.blocks.find((x) => x.type === b.type)?.settings, b.settings) }])), block_order: blocks.map((_, i) => `b${i}`) };
    if (settings.color_scheme) ownScheme.add(out);
    return out;
  };
  const template = (entries: [string, SectionInstance][]): TemplateJson => ({ order: entries.map(([k]) => k), sections: Object.fromEntries(entries) });
  /**
   * Remplace, dans l'ordre, chaque section du catalogue par sa version rédigée (même type, même identifiant). Une section
   * que la composition automatique a retirée faute de contenu (ex. : la déclaration qui répétait l'accroche) est remise à
   * sa place de la composition du thème, juste après la section rédigée qui la précède.
   */
  const overlay = (key: string, rows: SectionInstance[]) => {
    const t = spec.templates[key];
    if (!t) throw new Error(`Modèle absent : ${key}`);
    let at = t.order.findIndex((id) => t.sections[id].type === "main-product");
    rows.forEach((r, n) => {
      const i = t.order.findIndex((id, j) => j > at && t.sections[id].type === r.type);
      if (i >= 0) {
        const id = t.order[i];
        t.sections[id] = { ...r, settings: { ...r.settings, color_scheme: ownScheme.has(r) ? r.settings.color_scheme : t.sections[id].settings.color_scheme ?? r.settings.color_scheme } };
        at = i;
      } else {
        const id = `sillon_${r.type.replace(/[^a-z]/g, "_")}_${n}`;
        t.sections[id] = r;
        t.order.splice(at + 1, 0, id);
        at += 1;
      }
    });
  };
  const productHref = `/products/${SILLON_HANDLE}`;

  spec.name = "SILLON — thème Sillon (démonstration)";
  spec.meta = { ...spec.meta, demo: { isDemo: true, provenance: SILLON_PROVENANCE, contactTest: false } };
  spec.store.shopName = "SILLON";
  spec.store.business = "products";
  spec.store.paymentTypes = [];
  spec.store.policies = [];
  spec.store.seo = { title: "Machine à espresso nomade SILLON | Bureau, voyage, plein air", description: "SILLON, machine à espresso nomade au corps brun mat et aux détails cuivrés : l'espresso coule directement dans le verre, du bureau au voyage." };

  // Galerie de la fiche : les cinq vues produit (grille : une grande, puis deux par deux). Vue de dessus (01) : repères ; macro (19) : accueil.
  const gallery = ["sillon-02.webp", "sillon-11.webp", "sillon-15.webp", "sillon-03.webp", "sillon-06.webp"].filter((f) => ids[f]);
  const main: StoreProduct = {
    ...spec.store.product,
    contentTarget: "product:main", handle: SILLON_HANDLE, title: "Machine à espresso nomade SILLON", vendor: "SILLON",
    description_html: p("SILLON réunit dans un cylindre brun mat ce qu'il faut pour un espresso qui vous suit : une bague et un bouton de teinte cuivrée, et l'espresso qui coule directement dans le verre placé dessous.") + p(`${TODO("caractéristiques techniques confirmées : pression, chauffe, alimentation, autonomie, compatibilité, contenance, dimensions, poids, matériaux")}`),
    price: null, compare_at_price: null, currency: "EUR", options: [],
    variants: [{ title: "Default Title", options: [], price: null, available: true }],
    images: gallery, tags: ["machine à espresso", "nomade"],
    seo: { title: "SILLON, machine à espresso portable brun et cuivre", description: "SILLON, machine à espresso portable : cylindre brun mat, bague et bouton cuivrés, espresso servi directement dans le verre. Vues, détails et caractéristiques." },
  };
  spec.store.product = main;
  spec.store.products = [];
  spec.store.collections = [{ handle: "all", title: "La machine", description: "SILLON, machine à espresso nomade.", products: [main.handle] }];

  const faq = (heading: string, accent: string, items: [string, string][], style: string, layout: string, text = "") => section("faq", { heading: accent ? `${heading} ${accent}` : heading, text: text ? p(text) : "", style, layout, structured_data: false, open_first: false }, items.map(([question, answer]) => ({ type: "question", settings: { question, answer: p(answer) } })));
  const fixFaq = (s: SectionInstance) => { const schema = sectionSchema(spec, "faq")!; const blockType = schema.blocks[0]?.type ?? "question"; if (blockType !== "question") for (const b of Object.values(s.blocks ?? {})) b.type = blockType; return s; };

  // ─── Accueil ────────────────────────────────────────────────────────────────────────────────────────────────────
  overlay("index", [
    section("cv-hero", { ...img("sillon-04.webp"), image_ratio: "wide", focus_x: 30, focus_y: 50, layout: "image-left", heading: "La machine à espresso", heading_accent: "nomade", heading_tag: "h1", text: p("Un cylindre brun mat, une bague et un bouton cuivrés, l'espresso qui coule droit dans le verre. SILLON se pose sur un bureau, un comptoir ou la tablette d'un train, et vous suit d'une journée à l'autre."), button_label: "Découvrir la machine", button_link: productHref, rating_text: "", rating_note: "", guarantee_text: "", animation: "fade" }, [
      { type: "check", settings: { text: "Corps brun mat, bague et bouton cuivrés" } },
      { type: "check", settings: { text: "L'espresso coule directement dans le verre" } },
      { type: "check", settings: { text: "Un seul bouton en façade" } },
    ]),
    section("rich-text", { style: "statement", align: "center", padding_top: 88, padding_bottom: 72 }, [
      { type: "eyebrow", settings: { text: "Le geste du café, emporté" } },
      { type: "heading", settings: { text: "Un bon espresso ne devrait pas dépendre <em>de la pièce où vous êtes.</em>", size: "h2" } },
      { type: "text", settings: { text: p("SILLON part d'une idée simple : emporter le geste du café comme on emporte un livre. Une silhouette sobre, des détails cuivrés, et l'espresso qui arrive dans votre verre sans détour.") } },
    ]),
    section("cv-feature", { ...img("sillon-19.webp"), layout: "image-left", heading: "Le moment", heading_accent: "où tout coule", text: p("De près, tout est simple : l'espresso tombe directement dans le verre, sans bec à viser ni tasse à déplacer. Vous voyez la crème se former et le verre se remplir."), button_label: "Voir la machine", button_link: productHref, guarantee_text: "" }, [
      { type: "point", settings: { icon: "check", title: "Directement dans le verre", text: p("Le verre se place sous la machine ; l'espresso y coule, comme sur nos photos.") } },
      { type: "point", settings: { icon: "check", title: "Un bouton, en façade", text: p("La seule commande visible : un bouton de teinte cuivrée, à hauteur de main.") } },
      { type: "point", settings: { icon: "check", title: "Une silhouette droite", text: p("Un cylindre qui trouve sa place sur un bureau, un comptoir ou une tablette.") } },
    ]),
    section("cv-hotspots", { ...img("sillon-06.webp"), layout: "side", ratio: "square", eyebrow: "En détail", heading: "Ce que l'on voit", heading_accent: "de près", text: p("Touchez un repère pour lire ce qu'il montre. Les caractéristiques techniques s'ajouteront sur la fiche dès qu'elles seront confirmées."), demo_note: "", show_list: true }, [
      { type: "hotspot", settings: { x: 50, y: 16, title: "La bague cuivrée", text: p("Un anneau de teinte cuivrée souligne le haut du cylindre.") } },
      { type: "hotspot", settings: { x: 40, y: 30, title: "Le bouton", text: p(`La seule commande visible, de la même teinte. ${TODO("rôle exact du bouton")}`) } },
      { type: "hotspot", settings: { x: 47, y: 56, title: "Le marquage", text: p("Le nom SILLON, discrètement inscrit sur le corps brun mat.") } },
      { type: "hotspot", settings: { x: 50, y: 80, title: "Le verre", text: p(`L'espresso coule directement dans le verre placé dessous. ${TODO("verre fourni ou non")}`) } },
    ]),
    section("cv-gallery", { layout: "mosaic", ratio: "square", eyebrow: "Lieux d'usage", heading: "Là où", heading_accent: "vous vous posez", text: p("Un pique-nique d'automne, une terrasse, une chambre d'hôtel, un comptoir, un départ, un train : SILLON trouve sa place dans les lieux de vos journées."), ai_label: "" }, [
      { type: "image", settings: { ...img("sillon-10.webp"), caption: "Pique-nique d'automne au bord du lac" } },
      { type: "image", settings: { ...img("sillon-18.webp"), caption: "Terrasse face à la mer" } },
      { type: "image", settings: { ...img("sillon-08.webp"), caption: "Chambre d'hôtel" } },
      { type: "image", settings: { ...img("sillon-12.webp"), caption: "Comptoir de cuisine" } },
      { type: "image", settings: { ...img("sillon-17.webp"), caption: "Avant le départ" } },
      { type: "image", settings: { ...img("sillon-14.webp"), caption: "Salon ferroviaire" } },
    ]),
    section("featured-purchase", { label: "La machine", heading: "SILLON, machine à espresso nomade", text: p("Quatre vues de la machine et l'ajout au panier. Le prix s'affichera dès qu'il sera fixé."), product: SILLON_HANDLE, product_target: "product:main", purchase_style: "compact", purchase_enabled: false, image_fit: "contain", gallery_limit: 4, link_label: "Voir la fiche complète" }),
    fixFaq(faq("Questions", "avant de partir", SILLON_FAQ.slice(0, 4), "lines", "side", "Ce que nous savons, et ce qui reste à confirmer : les réponses entre crochets seront complétées avant la mise en vente.")),
    section("newsletter-media", { layout: "right", ...img("sillon-13.webp"), eyebrow: "Nouvelles de SILLON", heading: "Un e-mail quand il y a vraiment du neuf", text: p("Disponibilité, caractéristiques confirmées, conseils d'utilisation : nous écrivons seulement quand quelque chose change."), perk_1: "", perk_2: "", perk_3: "", button_label: "S'inscrire", legal: p("Désinscription possible à tout moment depuis chaque e-mail.") }),
  ]);

  // ─── Fiche produit ──────────────────────────────────────────────────────────────────────────────────────────────
  // La fiche du produit principal a son propre modèle (« product.<suffixe> », liaison du contenu produit).
  const productKey = main.template_suffix && spec.templates[`product.${main.template_suffix}`] ? `product.${main.template_suffix}` : "product";
  const mainId = spec.templates[productKey].order.find((k) => spec.templates[productKey].sections[k].type === "main-product")!;
  const mp = spec.templates[productKey].sections[mainId];
  const mpSchema = sectionSchema(spec, "main-product")!;
  const block = (type: string, settings: Record<string, unknown>) => ({ type, settings: withDefaults(mpSchema.blocks.find((b) => b.type === type)?.settings, settings) });
  const mpBlocks: [string, { type: string; settings: Record<string, unknown> }][] = [
    ["eyebrow", block("eyebrow", { text: "Machine à espresso nomade" })],
    ["title", block("title", {})],
    ["price", block("price", {})],
    ["text", block("text", { text: p("Un cylindre brun mat, une bague et un bouton de teinte cuivrée : SILLON se pose là où vous êtes, et l'espresso coule directement dans le verre placé dessous.") })],
    ["highlights", block("highlights", { items: "Corps brun mat\nBague et bouton de teinte cuivrée\nL'espresso coule directement dans le verre\nPensée pour le bureau, le voyage et le dehors", icon: "check", columns: 1 })],
    ["buy", block("buy_buttons", { picker: "buttons", show_quantity: true, show_dynamic_checkout: false, price_in_button: false })],
    ["details", block("collapsible", { heading: "Description", content: main.description_html, open: false })],
    ["specs", block("collapsible", { heading: "Caractéristiques techniques", content: p(TODO("pression, chauffe, alimentation et autonomie, compatibilité (capsules ou café moulu), contenance, dimensions, poids, matériaux, certifications")), open: false })],
    ["box", block("collapsible", { heading: "Dans la boîte", content: p(TODO("contenu exact du coffret")), open: false })],
    ["shipping", block("collapsible", { heading: "Livraison, retours et garantie", content: p(TODO("zones, délais et frais de livraison ; délai et conditions de retour ; durée de garantie")), open: false })],
  ];
  mp.settings = { ...mp.settings, product_target: "product:main", purchase_enabled: false, gallery_layout: "grid", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" };
  mp.blocks = Object.fromEntries(mpBlocks);
  mp.block_order = mpBlocks.map(([k]) => k);

  overlay(productKey, [
    section("cv-hotspots", { ...img("sillon-01.webp"), layout: "stacked", ratio: "square", eyebrow: "Vue de dessus", heading: "La machine,", heading_accent: "vue d'en haut", text: p("Le couvercle rond, la bague, le bouton et le verre : quatre repères pour lire la silhouette."), demo_note: "", show_list: true }, [
      { type: "hotspot", settings: { x: 48, y: 17, title: "Le dessus", text: p(`Une surface ronde et mate. ${TODO("rôle exact : couvercle, réservoir, accès au café")}`) } },
      { type: "hotspot", settings: { x: 52, y: 30, title: "La bague", text: p("L'anneau de teinte cuivrée qui marque le haut du corps.") } },
      { type: "hotspot", settings: { x: 44, y: 42, title: "Le bouton", text: p(`Le bouton de teinte cuivrée, en façade. ${TODO("rôle exact du bouton")}`) } },
      { type: "hotspot", settings: { x: 52, y: 80, title: "Le verre", text: p("Placé sous la machine, il reçoit l'espresso.") } },
    ]),
    section("cv-specs", { layout: "side", eyebrow: "Fiche", heading: "Caractéristiques", heading_accent: "", text: p("Ce que l'on peut affirmer aujourd'hui, et ce qui reste à confirmer. Chaque valeur entre crochets est un champ à remplir avant la mise en vente."), note: "" }, [
      { type: "group", settings: { title: "Ce que l'on voit", rows: "Forme : cylindre droit\nFinition : corps brun mat\nDétails : bague et bouton de teinte cuivrée\nService : l'espresso coule dans le verre placé dessous\nMarquage : SILLON sur le corps", open: true } },
      { type: "group", settings: { title: "À confirmer", rows: ["Pression", "Chauffe", "Alimentation et autonomie", "Compatibilité (capsules, café moulu)", "Contenance", "Dimensions et poids", "Matériaux", "Certifications"].map((l) => `${l} : [À compléter]`).join("\n"), open: false } },
      { type: "box", settings: { title: "Dans la boîte", items: TODO("contenu exact du coffret") } },
    ]),
    section("cv-steps", { layout: "timeline", eyebrow: "Mode d'emploi", heading: "Quatre gestes,", heading_accent: "à préciser", text: p("Le déroulé tel qu'on le voit sur les photos. Les étapes techniques seront détaillées dès qu'elles seront confirmées."), button_label: "", button_link: "" }, [
      { type: "step", settings: { title: "Préparer", text: p(TODO("remplissage de l'eau et du café selon le format compatible")) } },
      { type: "step", settings: { title: "Lancer", text: p(TODO("rôle du bouton cuivré et temps de préparation")) } },
      { type: "step", settings: { title: "Servir", text: p("L'espresso coule directement dans le verre placé sous la machine.") } },
      { type: "step", settings: { title: "Ranger", text: p(TODO("nettoyage et entretien")) } },
    ]),
    section("cv-alternating", { layout: "image-left", ratio: "square", eyebrow: "Au quotidien", heading: "Une machine", heading_accent: "pour vos journées", text: "" }, [
      { type: "row", settings: { ...img("sillon-05.webp"), eyebrow: "Au bureau", heading: "Le café", heading_accent: "sans quitter la table", text: p("Posée à côté de l'ordinateur, SILLON occupe un coin du plateau en chêne et se fait oublier entre deux cafés."), button_label: "", button_link: "" } },
      { type: "row", settings: { ...img("sillon-13.webp"), eyebrow: "En altitude", heading: "Face", heading_accent: "aux montagnes", text: p("Sur la table d'un balcon alpin, le matin : l'espresso se boit avec la vue."), button_label: "Voir tous les usages", button_link: "/pages/usages" } },
    ]),
    section("fs-commitments", { layout: "list", eyebrow: "Avant la mise en vente", heading: "Livraison, retours", heading_accent: "et garantie", text: p("Ces engagements seront précisés avant l'ouverture de la boutique : rien n'est promis tant que ce n'est pas confirmé."), align: "left", button_label: "", button_link: "", note: "" }, [
      { type: "item", settings: { icon: "truck", title: "Livraison", text: p(TODO("zones, délais et frais")), proof_label: "", proof_link: "" } },
      { type: "item", settings: { icon: "return", title: "Retours", text: p(TODO("délai et conditions")), proof_label: "", proof_link: "" } },
      { type: "item", settings: { icon: "shield", title: "Garantie", text: p(TODO("durée et couverture")), proof_label: "", proof_link: "" } },
      { type: "item", settings: { icon: "chat", title: "Assistance", text: p(TODO("canal de contact et horaires")), proof_label: "", proof_link: "" } },
    ]),
    fixFaq(faq("Questions", "fréquentes", SILLON_FAQ, "lines", "stacked")),
  ]);

  // ─── Pages ──────────────────────────────────────────────────────────────────────────────────────────────────────
  spec.store.pages = [];
  const pageTitle = () => section("main-page", { width: "wide", color_scheme: "scheme-1", padding_top: 48, padding_bottom: 0 });
  const page = (handle: string, title: string, seo: { title: string; description: string }, rows: [string, SectionInstance][]) => {
    spec.store.pages.push({ handle, title, template_suffix: handle, body_html: "", seo });
    spec.templates[`page.${handle}`] = template([["title", pageTitle()], ...rows]);
  };
  const situations: [string, string, string, string, string][] = [
    ["sillon-05.webp", "Au bureau", "Le café", "sans quitter la table", "Sur un plateau en chêne clair, à côté de l'ordinateur : SILLON occupe un coin de bureau et vous évite l'aller-retour à la machine commune."],
    ["sillon-12.webp", "À la maison", "Le premier café", "sur le comptoir", "Posée sur le calcaire de la cuisine, près des croissants du matin : une machine qui ne réclame pas un coin à elle."],
    ["sillon-08.webp", "À l'hôtel", "Votre espresso", "dans la chambre", "Sur le buffet d'une chambre d'hôtel, entre le plateau et le linge plié : le café comme à la maison, là où vous dormez."],
    ["sillon-14.webp", "En train", "Un espresso", "entre deux gares", "Sur la tablette d'un salon ferroviaire, à côté d'un livre ouvert : le trajet devient une pause."],
    ["sillon-13.webp", "En altitude", "Face", "aux montagnes", "Sur la table d'un balcon alpin, le matin : l'espresso se boit avec la vue."],
    ["sillon-10.webp", "Dehors", "Un pique-nique", "d'automne", "Sur une table en bois au bord d'un lac, parmi les feuilles : SILLON s'invite aussi loin de la cuisine."],
  ];
  page("usages", "Une machine à café portable, du bureau au plein air", { title: "Machine à café portable : bureau, voyage, plein air | SILLON", description: "Bureau, cuisine, hôtel, train, balcon, pique-nique : six lieux où poser SILLON, machine à café portable, en photos." }, [
    ["intro", section("rich-text", { style: "plain", align: "center", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 32 }, [{ type: "text", settings: { text: p("SILLON est une machine à espresso nomade. Voici, en photos, les lieux où nous l'avons posée. Ses conditions d'utilisation (alimentation, autonomie, usage en extérieur) seront précisées sur la fiche dès qu'elles seront confirmées.") } }])],
    ["situations", section("cv-alternating", { layout: "alternate", ratio: "square", eyebrow: "Six lieux", heading: "Là où", heading_accent: "SILLON se pose", text: "", color_scheme: "scheme-1" }, situations.map(([file, eyebrow, heading, accent, text]) => ({ type: "row", settings: { ...img(file), eyebrow, heading, heading_accent: accent, text: p(text), button_label: "", button_link: "" } })))],
    ["depart", section("cv-gallery", { layout: "grid", columns: 2, ratio: "portrait", eyebrow: "Et aussi", heading: "Au départ,", heading_accent: "à l'arrivée", text: "", ai_label: "", color_scheme: "scheme-4" }, [
      { type: "image", settings: { ...img("sillon-17.webp"), caption: "Avant le départ, à côté du sac" } },
      { type: "image", settings: { ...img("sillon-18.webp"), caption: "À l'arrivée, en terrasse face à la mer" } },
    ])],
    ["cta", section("cta-banner", { heading: "Prête à vous suivre", text: p("Toutes les vues de la machine, ses détails et ce qui reste à confirmer."), button_label: "Découvrir SILLON", button_link: productHref, image_asset: "", style: "center", parallax: false, color_scheme: "scheme-2", padding_top: 88, padding_bottom: 88 })],
  ]);
  page("utilisation-caracteristiques", "Utilisation et caractéristiques de la machine à espresso nomade", { title: "Utilisation et caractéristiques de la machine espresso SILLON", description: "Mode d'emploi en quatre gestes et caractéristiques de SILLON, machine à espresso nomade : ce qui est confirmé, ce qui reste à préciser." }, [
    ["steps", section("cv-steps", { layout: "cards", eyebrow: "Mode d'emploi", heading: "Quatre gestes,", heading_accent: "à préciser", text: p("Le déroulé tel qu'on le voit sur les photos ; chaque étape technique sera détaillée une fois confirmée."), button_label: "", button_link: "", color_scheme: "scheme-1" }, [
      { type: "step", settings: { title: "Préparer", text: p(TODO("remplissage de l'eau et du café selon le format compatible")) } },
      { type: "step", settings: { title: "Lancer", text: p(TODO("rôle du bouton cuivré et temps de préparation")) } },
      { type: "step", settings: { ...img("sillon-11.webp"), title: "Servir", text: p("L'espresso coule directement dans le verre placé sous la machine.") } },
      { type: "step", settings: { title: "Ranger", text: p(TODO("nettoyage et entretien")) } },
    ])],
    ["specs", section("cv-specs", { layout: "stacked", eyebrow: "Fiche", heading: "Caractéristiques", heading_accent: "", text: p("Les valeurs entre crochets sont des champs à remplir : aucune n'est supposée."), note: "", color_scheme: "scheme-4" }, [
      { type: "group", settings: { title: "Ce que l'on voit", rows: "Forme : cylindre droit\nFinition : corps brun mat\nDétails : bague et bouton de teinte cuivrée\nService : l'espresso coule dans le verre placé dessous", open: true } },
      { type: "group", settings: { title: "Fonctionnement", rows: ["Pression", "Chauffe", "Alimentation", "Autonomie", "Recharge", "Compatibilité (capsules, café moulu)"].map((l) => `${l} : [À compléter]`).join("\n"), open: false } },
      { type: "group", settings: { title: "Format et matériaux", rows: ["Contenance", "Hauteur et diamètre", "Poids", "Matériaux", "Certifications"].map((l) => `${l} : [À compléter]`).join("\n"), open: false } },
    ])],
    ["faq", fixFaq(faq("Questions", "fréquentes", SILLON_FAQ, "numbered", "stacked"))],
  ]);
  page("contact", "Contact", { title: "Contact | SILLON, machine à espresso nomade", description: "Une question sur SILLON, la machine à espresso nomade ? Écrivez-nous par le formulaire de contact." }, [
    ["form", section("contact-form", { eyebrow: "Contact", heading: "Une question sur SILLON ?", text: p("Écrivez-nous : le formulaire vérifie les champs avant l'envoi. Dans cette démonstration, aucun message n'est réellement transmis."), email: "", hours: "", response: "", preview_note: true, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 96 })],
  ]);

  // FAQ : aucune donnée structurée tant que des réponses restent à compléter (pas de résultat enrichi promis sur des manques),
  // y compris dans les modèles de page laissés par la composition (« page.faq »…).
  for (const t of Object.values(spec.templates)) for (const sec of Object.values(t.sections)) if (sec.type === "faq") sec.settings.structured_data = false;

  // ─── Menus, en-tête, pied de page ───────────────────────────────────────────────────────────────────────────────
  spec.store.menus["main-menu"] = { title: "Navigation", links: [{ title: "La machine", url: productHref }, { title: "Usages", url: "/pages/usages" }, { title: "Utilisation", url: "/pages/utilisation-caracteristiques" }, { title: "Contact", url: "/pages/contact" }] };
  spec.store.menus.footer = { title: "Aide", links: [{ title: "Utilisation et caractéristiques", url: "/pages/utilisation-caracteristiques" }, { title: "Contact", url: "/pages/contact" }, { title: "Recherche", url: "/search" }] };
  const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
  header.settings = { ...header.settings, menu: "main-menu", layout: "menu-right", shape: "bar", mobile_menu: "sheet", sticky: true, transparent_on_home: false, show_search: false, show_cart: true, cta_label: "Commander", cta_link: productHref, cta_icon: "arrow", phone: "", color_scheme: "scheme-1" };
  const announce = section("announcement-bar", { style: "static", color_scheme: "scheme-2" }, [{ type: "announcement", settings: { text: "Démonstration : prix et caractéristiques à confirmer.", link: "" } }]);
  spec.groups.header.sections = { announce, header };
  spec.groups.header.order = ["announce", "header"];
  const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
  footer.settings = { ...footer.settings, style: "wordmark", show_wordmark: true, show_policies: false, show_payment: false, color_scheme: "scheme-2", logo_asset: "" };
  footer.blocks = {
    about: { type: "text", settings: { heading: "SILLON", text: p("Machine à espresso nomade. Marque de démonstration du studio : prix, caractéristiques et conditions de vente à compléter.") } },
    shop: { type: "links", settings: { heading: "SILLON", menu: "main-menu" } },
    help: { type: "links", settings: { heading: "Aide", menu: "footer" } },
    news: { type: "newsletter", settings: { heading: "Nouvelles de SILLON", text: "Aperçu : inscription non enregistrée dans la démonstration." } },
  };
  footer.block_order = ["about", "shop", "help", "news"];
  for (const s of Object.values(spec.groups.footer.sections)) if (s.type !== "footer") s.disabled = true;
  spec.settings = { ...spec.settings, logo_asset: ids["sillon-09.webp"] ? "sillon-09.webp" : "", logo_width: 132, favicon_asset: ids["sillon-favicon-180.png"] ? "sillon-favicon-180.png" : "" };
}
