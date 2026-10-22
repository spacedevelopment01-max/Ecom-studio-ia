/**
 * Démonstration SILLON (issue #148) : machine à espresso nomade, troisième thème « boutique spécialisée ».
 *
 * Le projet est créé comme un projet client (marque, produit, médias avec rôles), puis composé par le VRAI moteur dans le
 * thème du catalogue « sillon » (composeShop). La rédaction de démonstration remplit ensuite les mêmes sections, dans le
 * même ordre, avec des textes écrits pour SILLON — un test vérifie que l'accueil et la fiche gardent exactement l'ordre des
 * types de la composition du catalogue.
 *
 * Rien n'est inventé : les textes partent du concept (l'espresso nomade) et de ce que montrent les 18 visuels fournis par
 * Thomas (commit 8bbbc3bd, plus 07 et 16 réparés au commit 5a9267c0 ; sans personne). Pression, chauffe, alimentation,
 * autonomie, compatibilité, contenance, dimensions, poids, matériaux, certifications, prix, livraison, retours et garantie
 * ne sont jamais affirmés : leurs blocs et sections restent dans la démonstration, masqués (champs « [À compléter : …] »
 * prêts dans l'éditeur), et la boutique publique n'en montre rien. Aucun avis, note, compteur ni urgence ; aucune vente.
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
  { file: "sillon-07.webp", role: "detail", alt: "Gros plan du bouton et de la bague de teinte cuivrée, au fini brossé, sur le corps brun mat de SILLON." },
  { file: "sillon-06.webp", role: "detail", alt: "Machine SILLON de trois quarts : bague, bouton et marquage cuivrés." },
  { file: "sillon-13.webp", role: "scene", alt: "Machine SILLON sur une table de balcon face aux montagnes." },
  { file: "sillon-14.webp", role: "scene", alt: "Machine SILLON sur la tablette d'un salon ferroviaire, à côté d'un livre." },
  { file: "sillon-08.webp", role: "scene", alt: "Machine SILLON sur le plan d'un buffet de chambre d'hôtel." },
  { file: "sillon-12.webp", role: "scene", alt: "Machine SILLON sur un comptoir en calcaire, croissants à côté." },
  { file: "sillon-05.webp", role: "scene", alt: "Machine SILLON sur un bureau en chêne clair, près d'un ordinateur portable." },
  { file: "sillon-16.webp", role: "banner", alt: "Machine SILLON sur un socle de pierre claire, dans une lumière ivoire, grains de café à côté." },
  { file: "sillon-10.webp", role: "banner", alt: "Machine SILLON sur une table de pique-nique en automne, au bord d'un lac." },
  { file: "sillon-18.webp", role: "lifestyle", alt: "Machine SILLON sur une table de terrasse face à la mer." },
  { file: "sillon-17.webp", role: "lifestyle", alt: "Machine SILLON sur une commode avant un départ, sac de voyage et carte à côté." },
  { file: "sillon-04.webp", role: "lifestyle", alt: "Machine à espresso nomade SILLON sur un socle sombre, dans une lumière cuivrée." },
];
/** Visuels de l'inventaire vides à la source : aucun depuis le correctif 5a9267c0 (07 et 16 réparés). */
export const SILLON_EMPTY: string[] = [];

const p = (s: string) => `<p>${s}</p>`;
const TODO = (what: string) => `[À compléter : ${what}]`;

// SILLON — fiche de stratégie (consigne de Thomas du 21 octobre, 21 h 45 ; brief, hypothèse éditoriale) :
//  utilisateur et acheteur : un amateur d'espresso qui voyage en van ou en camping-car ;
//  situation d'achat : il prépare un départ et ne veut pas renoncer à son espresso du matin sur la route ;
//  tension (ses mots) : « En voyage, le café du matin, c'est une cafetière de fortune ou un gobelet d'aire d'autoroute. » ;
//  désir : changer de paysage chaque jour sans changer de rituel ;
//  angle unique : changer de paysage en gardant son rituel espresso ;
//  promesse tenable : une machine que l'on pose sur la table, l'espresso coulant directement dans le verre placé
//  dessous ; faits = visuels (lac, montagne, mer, train, hôtel). Le kit ne contient AUCUN van ni camping-car :
//  les tables du voyage montrées sont des haltes en plein air, un balcon, une terrasse, un train et un hôtel ;
//  objections : peut-on l'utiliser en van (alimentation et autonomie non renseignées : à vérifier), comment le café est
//  servi, la place qu'elle prend, quel café (non renseigné), prix et commande (information dédiée) ;
//  exclusions : aucune autonomie, chauffe intégrée, alimentation, pression ni compatibilité café supposées.
export const SILLON_FAQ: [string, string][] = [
  ["Peut-on l'utiliser en van ou en camping-car ?", "Sur nos photos, elle se pose sur une table de pique-nique au bord d'un lac, un balcon face aux montagnes ou une terrasse face à la mer. Son alimentation et son autonomie ne sont pas encore renseignées : vérifiez-les avant de la prévoir pour la route."],
  ["Comment l'espresso est-il servi ?", "Directement dans le verre. On le place sous la machine et l'espresso y coule : pas de tasse à déplacer, pas de bec à viser."],
  ["Prend-elle de la place ?", "C'est un cylindre droit, posé debout : sur nos photos, elle occupe un coin de table à côté du verre. Ses dimensions ne sont pas encore renseignées."],
  ["Que puis-je faire dans cette boutique de démonstration ?", "Faire le tour de la machine et la voir aux haltes du voyage. Le prix, le café compatible, l'alimentation et les dimensions ne sont pas encore renseignés, et la commande est désactivée."],
];
/** Questions dont la réponse dépend de faits inconnus : prêtes dans l'éditeur, masquées tant qu'elles ne sont pas remplies. */
export const SILLON_FAQ_PENDING: [string, string][] = [
  ["Quel café utiliser : capsules ou café moulu ?", TODO("format de café compatible")],
  ["Comment l'alimenter ou la recharger ?", TODO("mode d'alimentation, recharge et autonomie")],
  ["Quelles sont ses dimensions et son poids ?", TODO("hauteur, diamètre, poids et contenance du réservoir")],
  ["Que contient le coffret ?", TODO("contenu exact du coffret")],
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
  saveBrand(pid, { ...local.brand, name: "SILLON", generatedBy: "local" as const, tagline: "Le paysage change, votre espresso reste.", story: "SILLON est né pour ceux qui partent en van ou en camping-car et ne veulent pas laisser leur rituel du matin à la maison.", positioning: "Une machine à espresso nomade pour les tables du voyage : haltes au bord de l'eau, balcons, terrasses.", palette, direction: "sillon" });
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
  // Un bloc ou une section « hidden » attend un fait inconnu : présent et modifiable dans l'éditeur, jamais affiché.
  const section = (type: string, settings: Record<string, unknown>, blocks: { type: string; settings: Record<string, unknown>; hidden?: boolean }[] = []): SectionInstance => {
    const schema = sectionSchema(spec, type); if (!schema) throw new Error(`Section absente ${type}`);
    const out: SectionInstance = { type, settings: withDefaults(schema.settings, settings), blocks: Object.fromEntries(blocks.map((b, i) => [`b${i}`, { type: b.type, settings: withDefaults(schema.blocks.find((x) => x.type === b.type)?.settings, b.settings), ...(b.hidden ? { disabled: true } : {}) }])), block_order: blocks.map((_, i) => `b${i}`) };
    if (settings.color_scheme) ownScheme.add(out);
    return out;
  };
  const hide = (s: SectionInstance) => { s.disabled = true; return s; };
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
  spec.store.seo = { title: "SILLON | Machine à espresso nomade : changez de paysage, pas de café", description: "En van ou en camping-car, gardez votre rituel : posez SILLON sur la table, glissez un verre dessous, l'espresso y coule. Le paysage change, le café reste." };

  // Galerie de la fiche : les cinq vues produit (grille : une grande, puis deux par deux). Vue de dessus (01) : repères ; macro (19) : accueil.
  const gallery = ["sillon-02.webp", "sillon-11.webp", "sillon-15.webp", "sillon-03.webp", "sillon-06.webp"].filter((f) => ids[f]);
  const main: StoreProduct = {
    ...spec.store.product,
    contentTarget: "product:main", handle: SILLON_HANDLE, title: "Machine à espresso nomade SILLON", vendor: "SILLON",
    description_html: p("Son rôle : garder votre rituel espresso quand le paysage change. On la pose sur la table, on glisse un verre dessous, l'espresso y coule.") + p("Ce qu'on voit : un cylindre brun mat, une bague et un bouton de teinte cuivrée en façade, le nom SILLON discrètement inscrit sur le corps.") + p("Où la poser : sur la table d'une halte au bord d'un lac, d'un balcon en montagne, d'une terrasse, d'un train ou d'une chambre d'hôtel ; sa silhouette droite tient dans un coin de table. Alimentation et autonomie ne sont pas encore renseignées."),
    price: null, compare_at_price: null, currency: "EUR", options: [],
    variants: [{ title: "Default Title", options: [], price: null, available: true }],
    images: gallery, tags: ["machine à espresso", "nomade"],
    seo: { title: "Machine à espresso portable SILLON : vues, détails, rituel", description: "Découvrez SILLON, machine à espresso portable : toutes ses vues, ses finitions cuivrées de près et le rituel du café, de la table au verre." },
  };
  spec.store.product = main;
  spec.store.products = [];
  spec.store.collections = [{ handle: "all", title: "La machine", description: "SILLON, machine à espresso nomade.", products: [main.handle] }];

  const faq = (heading: string, accent: string, items: [string, string][], style: string, layout: string, text = "") => section("faq", { heading: accent ? `${heading} ${accent}` : heading, text: text ? p(text) : "", style, layout, structured_data: false, open_first: false }, items.map(([question, answer]) => ({ type: "question", settings: { question, answer: p(answer) }, hidden: answer.includes("[À compléter") })));
  const fixFaq = (s: SectionInstance) => { const schema = sectionSchema(spec, "faq")!; const blockType = schema.blocks[0]?.type ?? "question"; if (blockType !== "question") for (const b of Object.values(s.blocks ?? {})) b.type = blockType; return s; };

  const SEEN = "Forme : cylindre droit\nFinition : corps brun mat\nDétails : bague et bouton de teinte cuivrée, fini brossé\nService : l'espresso coule dans le verre placé dessous\nMarquage : SILLON sur le corps";
  const PENDING_ROWS = ["Pression", "Chauffe", "Alimentation et autonomie", "Compatibilité (capsules, café moulu)", "Contenance", "Dimensions et poids", "Matériaux", "Certifications"].map((l) => `${l} : [À compléter]`).join("\n");
  // Le rituel tel que les photos le montrent : aucun geste technique supposé (remplissage, rôle du bouton, entretien).
  const RITUAL = [
    { type: "step", settings: { title: "Choisir sa table", text: p("Une table de pique-nique, un balcon, la tablette d'un train : posez SILLON à plat, là où vous vous arrêtez.") } },
    { type: "step", settings: { title: "Placer le verre", text: p("Glissez le verre sous la machine. C'est lui qui recevra le café, et c'est dans lui que vous le boirez.") } },
    { type: "step", settings: { title: "Laisser couler", text: p("L'espresso coule directement dans le verre. Regardez la crème se former, sans rien avoir à transvaser.") } },
    { type: "step", settings: { title: "Savourer", text: p("Prenez le temps du paysage. Puis emportez SILLON vers la prochaine halte.") } },
  ];

  // ─── Accueil ────────────────────────────────────────────────────────────────────────────────────────────────────
  overlay("index", [
    section("cv-hero", { ...img("sillon-04.webp"), image_ratio: "wide", focus_x: 30, focus_y: 50, layout: "image-left", heading: "Le paysage change,", heading_accent: "votre espresso reste", heading_tag: "h1", text: p("En van ou en camping-car, d'un lac à la montagne : posez SILLON sur la table, glissez un verre dessous, l'espresso y coule. Le rituel du matin vous suit."), button_label: "Voir la machine", button_link: productHref, rating_text: "", rating_note: "", guarantee_text: "", animation: "fade" }, [
      { type: "check", settings: { text: "Pour les tables du voyage" } },
      { type: "check", settings: { text: "Silhouette sobre, détails cuivrés" } },
      { type: "check", settings: { text: "Servi directement dans le verre" } },
    ]),
    section("rich-text", { style: "statement", align: "center", padding_top: 88, padding_bottom: 72 }, [
      { type: "eyebrow", settings: { text: "Le geste du café, emporté" } },
      { type: "heading", settings: { text: "Un bon espresso ne devrait pas dépendre <em>de l'endroit où vous vous arrêtez.</em>", size: "h2" } },
      { type: "text", settings: { text: p("SILLON part d'une idée simple : emporter le geste du café comme on emporte un livre pour la route. Une silhouette sobre, des détails cuivrés, et l'espresso qui arrive dans votre verre, face au paysage du jour.") } },
    ]),
    section("cv-feature", { ...img("sillon-19.webp"), layout: "image-left", heading: "Le moment", heading_accent: "où tout coule", text: p("De près, tout est simple : l'espresso tombe directement dans le verre, sans bec à viser ni tasse à déplacer. Vous voyez la crème se former, le paysage derrière."), button_label: "Voir la machine", button_link: productHref, guarantee_text: "" }, [
      { type: "point", settings: { icon: "check", title: "Directement dans le verre", text: p("Le verre se place sous la machine ; l'espresso y coule, comme sur nos photos.") } },
      { type: "point", settings: { icon: "check", title: "Un bouton, en façade", text: p("La seule commande visible : un bouton de teinte cuivrée, à hauteur de main.") } },
      { type: "point", settings: { icon: "check", title: "Une silhouette droite", text: p("Un cylindre qui trouve sa place sur une table de pique-nique, un balcon ou une tablette.") } },
    ]),
    section("cv-hotspots", { ...img("sillon-06.webp"), layout: "side", ratio: "square", eyebrow: "En détail", heading: "Ce que l'on voit", heading_accent: "de près", text: p("Touchez un repère pour regarder SILLON de plus près : chaque détail a sa place, rien n'est là pour décorer."), demo_note: "", show_list: true }, [
      { type: "hotspot", settings: { x: 50, y: 16, title: "La bague cuivrée", text: p("Un anneau de teinte cuivrée souligne le haut du cylindre.") } },
      { type: "hotspot", settings: { x: 40, y: 30, title: "Le bouton", text: p("Rond, de la même teinte, placé en façade : la seule commande visible, à portée de main.") } },
      { type: "hotspot", settings: { x: 47, y: 56, title: "Le marquage", text: p("Le nom SILLON, discrètement inscrit sur le corps brun mat.") } },
      { type: "hotspot", settings: { x: 50, y: 80, title: "Le verre", text: p("Il se glisse sous la machine et reçoit l'espresso : on boit dans le verre où le café a coulé.") } },
    ]),
    section("cv-gallery", { layout: "mosaic", ratio: "square", eyebrow: "Sur la route", heading: "Là où", heading_accent: "vous vous arrêtez", text: p("Un lac en automne, une terrasse face à la mer, une chambre d'hôtel, un train : SILLON s'installe sur les tables du voyage."), ai_label: "" }, [
      { type: "image", settings: { ...img("sillon-10.webp"), caption: "Une halte au bord du lac" } },
      { type: "image", settings: { ...img("sillon-18.webp"), caption: "Terrasse face à la mer" } },
      { type: "image", settings: { ...img("sillon-08.webp"), caption: "Une étape à l'hôtel" } },
      { type: "image", settings: { ...img("sillon-12.webp"), caption: "Le premier café, avant de partir" } },
      { type: "image", settings: { ...img("sillon-17.webp"), caption: "Avant le départ" } },
      { type: "image", settings: { ...img("sillon-14.webp"), caption: "Salon ferroviaire" } },
    ]),
    section("featured-purchase", { label: "La machine", heading: "SILLON, machine à espresso nomade", text: p("De profil, de face, de dessus, de près : faites le tour de la machine avant de l'emmener."), product: SILLON_HANDLE, product_target: "product:main", purchase_style: "compact", purchase_enabled: false, image_fit: "contain", gallery_limit: 4, link_label: "Voir la fiche complète" }),
    fixFaq(faq("Avant de", "l'emporter", SILLON_FAQ.slice(0, 4), "lines", "side", "Où l'utiliser, comment le café est servi, la place qu'elle prend, ce que permet la démonstration.")),
    section("newsletter-media", { layout: "right", ...img("sillon-16.webp"), eyebrow: "Nouvelles de SILLON", heading: "Être prévenu quand SILLON ouvre", text: p("Un e-mail à l'ouverture de la boutique. Rien d'autre."), perk_1: "", perk_2: "", perk_3: "", button_label: "Me prévenir", legal: p("Désinscription possible à tout moment depuis chaque e-mail.") }),
  ]);

  // ─── Fiche produit ──────────────────────────────────────────────────────────────────────────────────────────────
  // La fiche du produit principal a son propre modèle (« product.<suffixe> », liaison du contenu produit).
  const productKey = main.template_suffix && spec.templates[`product.${main.template_suffix}`] ? `product.${main.template_suffix}` : "product";
  const mainId = spec.templates[productKey].order.find((k) => spec.templates[productKey].sections[k].type === "main-product")!;
  const mp = spec.templates[productKey].sections[mainId];
  const mpSchema = sectionSchema(spec, "main-product")!;
  const block = (type: string, settings: Record<string, unknown>) => ({ type, settings: withDefaults(mpSchema.blocks.find((b) => b.type === type)?.settings, settings) });
  const mpBlocks: [string, { type: string; settings: Record<string, unknown>; disabled?: boolean }][] = [
    ["eyebrow", block("eyebrow", { text: "Machine à espresso nomade" })],
    ["title", block("title", {})],
    ["price", block("price", {})],
    ["text", block("text", { text: p("Pour garder votre rituel quand le paysage change : posez-la sur la table, glissez un verre dessous, l'espresso y coule. Cylindre brun mat, bague et bouton cuivrés.") })],
    ["highlights", block("highlights", { items: "Pensée pour le bureau, le voyage et le dehors\nServi directement dans le verre\nCorps brun mat, bague et bouton cuivrés\nUn seul bouton en façade", icon: "check", columns: 1 })],
    ["buy", block("buy_buttons", { picker: "buttons", show_quantity: true, show_dynamic_checkout: false, price_in_button: false })],
    ["details", block("collapsible", { heading: "Description", content: main.description_html, open: false })],
    ["specs", { ...block("collapsible", { heading: "Caractéristiques techniques", content: p(TODO("pression, chauffe, alimentation et autonomie, compatibilité (capsules ou café moulu), contenance, dimensions, poids, matériaux, certifications")), open: false }), disabled: true }],
    ["box", { ...block("collapsible", { heading: "Dans la boîte", content: p(TODO("contenu exact du coffret")), open: false }), disabled: true }],
    ["shipping", { ...block("collapsible", { heading: "Livraison, retours et garantie", content: p(TODO("zones, délais et frais de livraison ; délai et conditions de retour ; durée de garantie")), open: false }), disabled: true }],
  ];
  mp.settings = { ...mp.settings, product_target: "product:main", purchase_enabled: false, gallery_layout: "grid", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" };
  mp.blocks = Object.fromEntries(mpBlocks);
  mp.block_order = mpBlocks.map(([k]) => k);

  overlay(productKey, [
    section("cv-hotspots", { ...img("sillon-01.webp"), layout: "stacked", ratio: "square", eyebrow: "Vue de dessus", heading: "La machine,", heading_accent: "vue d'en haut", text: p("Le dessus rond, la bague, le bouton et le verre : quatre repères pour lire la silhouette."), demo_note: "", show_list: true }, [
      { type: "hotspot", settings: { x: 48, y: 17, title: "Le dessus", text: p("Une surface ronde et mate ferme le haut du cylindre.") } },
      { type: "hotspot", settings: { x: 52, y: 30, title: "La bague", text: p("L'anneau de teinte cuivrée qui marque le haut du corps.") } },
      { type: "hotspot", settings: { x: 44, y: 42, title: "Le bouton", text: p("Rond, de teinte cuivrée, placé en façade.") } },
      { type: "hotspot", settings: { x: 52, y: 80, title: "Le verre", text: p("Placé sous la machine, il reçoit l'espresso.") } },
    ]),
    section("cv-specs", { layout: "side", eyebrow: "En un coup d'œil", heading: "La machine,", heading_accent: "détail par détail", text: p("Sa forme, ses finitions et sa façon de servir le café, telles que nos photos les montrent."), note: "" }, [
      { type: "group", settings: { title: "Silhouette et finitions", rows: SEEN, open: true } },
      { type: "group", settings: { title: "Fonctionnement et format", rows: PENDING_ROWS, open: false }, hidden: true },
      { type: "box", settings: { title: "Dans la boîte", items: TODO("contenu exact du coffret") }, hidden: true },
    ]),
    section("cv-steps", { layout: "timeline", eyebrow: "Le rituel", heading: "Un espresso,", heading_accent: "en quatre temps", text: p("De la table choisie au dernier café, le déroulé que montrent nos photos."), button_label: "", button_link: "" }, RITUAL),
    section("cv-alternating", { layout: "image-left", ratio: "square", eyebrow: "En chemin", heading: "Une machine", heading_accent: "pour vos haltes", text: "" }, [
      { type: "row", settings: { ...img("sillon-10.webp"), eyebrow: "Au bord de l'eau", heading: "Une halte", heading_accent: "au bord du lac", text: p("Sur une table en bois parmi les feuilles d'automne : l'espresso du matin, avec le lac pour décor."), button_label: "", button_link: "" } },
      { type: "row", settings: { ...img("sillon-13.webp"), eyebrow: "En altitude", heading: "Face", heading_accent: "aux montagnes", text: p("Sur la table d'un balcon alpin, le matin : l'espresso se boit avec la vue."), button_label: "Voir tous les usages", button_link: "/pages/usages" } },
    ]),
    hide(section("fs-commitments", { layout: "list", eyebrow: "Avant la mise en vente", heading: "Livraison, retours", heading_accent: "et garantie", text: p("Ces engagements seront précisés avant l'ouverture de la boutique : rien n'est promis tant que ce n'est pas confirmé."), align: "left", button_label: "", button_link: "", note: "" }, [
      { type: "item", settings: { icon: "truck", title: "Livraison", text: p(TODO("zones, délais et frais")), proof_label: "", proof_link: "" } },
      { type: "item", settings: { icon: "return", title: "Retours", text: p(TODO("délai et conditions")), proof_label: "", proof_link: "" } },
      { type: "item", settings: { icon: "shield", title: "Garantie", text: p(TODO("durée et couverture")), proof_label: "", proof_link: "" } },
      { type: "item", settings: { icon: "chat", title: "Assistance", text: p(TODO("canal de contact et horaires")), proof_label: "", proof_link: "" } },
    ])),
    fixFaq(faq("Questions", "sur SILLON", [...SILLON_FAQ, ...SILLON_FAQ_PENDING], "lines", "stacked")),
  ]);

  // ─── Pages ──────────────────────────────────────────────────────────────────────────────────────────────────────
  spec.store.pages = [];
  const pageTitle = () => section("main-page", { width: "wide", color_scheme: "scheme-1", padding_top: 48, padding_bottom: 0 });
  const page = (handle: string, title: string, seo: { title: string; description: string }, rows: [string, SectionInstance][]) => {
    spec.store.pages.push({ handle, title, template_suffix: handle, body_html: "", seo });
    spec.templates[`page.${handle}`] = template([["title", pageTitle()], ...rows]);
  };
  const situations: [string, string, string, string, string][] = [
    ["sillon-10.webp", "Au bord de l'eau", "Une halte", "au bord du lac", "Sur une table en bois parmi les feuilles d'automne : le rituel du matin, avec le lac pour décor."],
    ["sillon-13.webp", "En altitude", "Face", "aux montagnes", "Sur la table d'un balcon alpin, le matin : l'espresso se boit avec la vue."],
    ["sillon-14.webp", "En train", "Un espresso", "entre deux gares", "Sur la tablette d'un salon ferroviaire, à côté d'un livre ouvert : le trajet devient une pause."],
    ["sillon-08.webp", "À l'hôtel", "Une étape", "pour la nuit", "Sur le buffet d'une chambre d'hôtel, entre le plateau et le linge plié : le même rituel, ailleurs."],
    ["sillon-12.webp", "Avant de partir", "Le premier café", "sur le comptoir", "Posée sur le calcaire de la cuisine, près des croissants du matin, le jour du départ."],
    ["sillon-05.webp", "La veille", "Le dernier café", "au bureau", "Sur un plateau en chêne clair, à côté de l'ordinateur : la machine part ensuite avec vous."],
  ];
  page("usages", "Une machine à café portable pour les haltes du voyage", { title: "Machine à café portable pour les haltes du voyage | SILLON", description: "Lac, montagne, train, hôtel : les haltes où poser SILLON, machine à café portable, en photos, pour garder son espresso quand le paysage change." }, [
    ["intro", section("rich-text", { style: "plain", align: "center", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 32 }, [{ type: "text", settings: { text: p("SILLON est une machine à espresso nomade : elle part avec vous, du dernier café à la maison aux haltes en plein air. Voici, en photos, six endroits où nous l'avons posée.") } }])],
    ["situations", section("cv-alternating", { layout: "alternate", ratio: "square", eyebrow: "Six haltes", heading: "Là où", heading_accent: "SILLON s'arrête", text: "", color_scheme: "scheme-1" }, situations.map(([file, eyebrow, heading, accent, text]) => ({ type: "row", settings: { ...img(file), eyebrow, heading, heading_accent: accent, text: p(text), button_label: "", button_link: "" } })))],
    ["depart", section("cv-gallery", { layout: "grid", columns: 2, ratio: "portrait", eyebrow: "Et aussi", heading: "Au départ,", heading_accent: "à l'arrivée", text: "", ai_label: "", color_scheme: "scheme-4" }, [
      { type: "image", settings: { ...img("sillon-17.webp"), caption: "Avant le départ, à côté du sac" } },
      { type: "image", settings: { ...img("sillon-18.webp"), caption: "À l'arrivée, en terrasse face à la mer" } },
    ])],
    ["cta", section("cta-banner", { heading: "Prête pour la prochaine halte", text: p("Toutes les vues de la machine et ses finitions cuivrées de près, sur sa fiche."), button_label: "Découvrir SILLON", button_link: productHref, image_asset: "", style: "center", parallax: false, color_scheme: "scheme-2", padding_top: 88, padding_bottom: 88 })],
  ]);
  page("utilisation-caracteristiques", "Utilisation et caractéristiques de la machine à espresso nomade", { title: "Utiliser SILLON : le rituel espresso et la machine en détail", description: "Le rituel du café avec SILLON, machine à espresso nomade, en quatre temps, ses finitions cuivrées de près et les réponses aux questions fréquentes." }, [
    ["steps", section("cv-steps", { layout: "cards", eyebrow: "Le rituel", heading: "Un espresso,", heading_accent: "en quatre temps", text: p("Le déroulé que montrent nos photos, de la table choisie au dernier café."), button_label: "", button_link: "", color_scheme: "scheme-1" }, RITUAL.map((s, i) => i === 2 ? { ...s, settings: { ...img("sillon-11.webp"), ...s.settings } } : s))],
    ["finitions", section("image-with-text", { ...img("sillon-07.webp"), layout: "image-right", ratio: "square", eyebrow: "De près", heading: "Le cuivre, sous la main", text: p("La bague et le bouton ont une teinte cuivrée au fini brossé ; autour, le corps brun mat montre un grain fin. Des détails discrets, que l'on remarque en servant le café."), button_label: "Voir la machine", button_link: productHref, color_scheme: "scheme-1", padding_top: 72, padding_bottom: 72 })],
    ["specs", section("cv-specs", { layout: "stacked", eyebrow: "En un coup d'œil", heading: "La machine,", heading_accent: "détail par détail", text: p("Sa forme, ses finitions et sa façon de servir le café."), note: "", color_scheme: "scheme-4" }, [
      { type: "group", settings: { title: "Silhouette et finitions", rows: SEEN, open: true } },
      { type: "group", settings: { title: "Fonctionnement", rows: ["Pression", "Chauffe", "Alimentation", "Autonomie", "Recharge", "Compatibilité (capsules, café moulu)"].map((l) => `${l} : [À compléter]`).join("\n"), open: false }, hidden: true },
      { type: "group", settings: { title: "Format et matériaux", rows: ["Contenance", "Hauteur et diamètre", "Poids", "Matériaux", "Certifications"].map((l) => `${l} : [À compléter]`).join("\n"), open: false }, hidden: true },
    ])],
    ["faq", fixFaq(faq("Questions", "fréquentes", [...SILLON_FAQ, ...SILLON_FAQ_PENDING], "numbered", "stacked"))],
  ]);
  page("contact", "Contact", { title: "Contact | SILLON, machine à espresso nomade", description: "Une question sur SILLON, la machine à espresso nomade ? Écrivez-nous par le formulaire de contact." }, [
    ["form", section("contact-form", { eyebrow: "Contact", heading: "Une question avant de l'emporter ?", text: p("Écrivez-nous : le formulaire vérifie les champs avant l'envoi. Dans cette démonstration, aucun message n'est réellement transmis."), email: "", hours: "", response: "", preview_note: true, color_scheme: "scheme-1", padding_top: 32, padding_bottom: 96 })],
  ]);

  // Modèles de page laissés par la composition sans page qui les utilise (FAQ, livraison…) : retirés de la démonstration,
  // ils ne contenaient que des manques. Le client les retrouve à l'application du thème sur son propre projet.
  for (const key of Object.keys(spec.templates)) if (key.startsWith("page.") && !spec.store.pages.some((pg) => `page.${pg.template_suffix}` === key)) delete spec.templates[key];

  // FAQ : aucune donnée structurée tant que des réponses restent à compléter (pas de résultat enrichi promis sur des manques),
  // y compris dans les modèles de page laissés par la composition (« page.faq »…).
  for (const t of Object.values(spec.templates)) for (const sec of Object.values(t.sections)) if (sec.type === "faq") sec.settings.structured_data = false;

  // ─── Menus, en-tête, pied de page ───────────────────────────────────────────────────────────────────────────────
  spec.store.menus["main-menu"] = { title: "Navigation", links: [{ title: "La machine", url: productHref }, { title: "Usages", url: "/pages/usages" }, { title: "Utilisation", url: "/pages/utilisation-caracteristiques" }, { title: "Contact", url: "/pages/contact" }] };
  spec.store.menus.footer = { title: "Aide", links: [{ title: "Utilisation et caractéristiques", url: "/pages/utilisation-caracteristiques" }, { title: "Contact", url: "/pages/contact" }, { title: "Recherche", url: "/search" }] };
  const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
  header.settings = { ...header.settings, menu: "main-menu", layout: "menu-right", shape: "bar", mobile_menu: "sheet", sticky: true, transparent_on_home: false, show_search: false, show_cart: true, cta_label: "Voir la machine", cta_link: productHref, cta_icon: "arrow", phone: "", color_scheme: "scheme-1" };
  const announce = section("announcement-bar", { style: "static", color_scheme: "scheme-2" }, [{ type: "announcement", settings: { text: "Boutique de démonstration : aucune vente réelle.", link: "" } }]);
  spec.groups.header.sections = { announce, header };
  spec.groups.header.order = ["announce", "header"];
  const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
  footer.settings = { ...footer.settings, style: "wordmark", show_wordmark: true, show_policies: false, show_payment: false, color_scheme: "scheme-2", logo_asset: "" };
  footer.blocks = {
    about: { type: "text", settings: { heading: "SILLON", text: p("La machine à espresso nomade des voyages : le paysage change, votre espresso reste. Marque de démonstration du studio.") } },
    shop: { type: "links", settings: { heading: "SILLON", menu: "main-menu" } },
    help: { type: "links", settings: { heading: "Aide", menu: "footer" } },
    news: { type: "newsletter", settings: { heading: "Nouvelles de SILLON", text: "Aperçu : inscription non enregistrée dans la démonstration." } },
  };
  // Une seule inscription : celle de l'accueil (revue du 21 octobre), pas de second formulaire dans le pied.
  footer.block_order = ["about", "shop", "help"];
  for (const s of Object.values(spec.groups.footer.sections)) if (s.type !== "footer") s.disabled = true;
  spec.settings = { ...spec.settings, logo_asset: ids["sillon-09.webp"] ? "sillon-09.webp" : "", logo_width: 132, favicon_asset: ids["sillon-favicon-180.png"] ? "sillon-favicon-180.png" : "" };
}
