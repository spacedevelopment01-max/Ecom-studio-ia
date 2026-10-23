/**
 * Démonstration NOCTIL (projecteur de galaxies), issue #152, et outils communs des démonstrations « kit » (NOCTIL,
 * HEUREN, ALCÔVE, MUSEAU CLUB, SOUPLE, TRAVERSE). TRAVERSE a été refaite d'après le dossier du 23 octobre :
 * tests/traverse-fixtures.ts.
 *
 * Comme SILLON : chaque démonstration est d'abord un projet client (marque, produit, médias avec rôles), composé par le
 * VRAI moteur dans son thème du catalogue (composeShop) ; la rédaction de démonstration remplit ensuite les mêmes
 * sections, dans le même ordre (un test le vérifie), avec des textes écrits pour chaque marque.
 *
 * Rien n'est inventé : les textes partent du concept de chaque produit et de ce que montrent les visuels du kit (commit
 * d5d27e26, sans personne). Prix, caractéristiques techniques, alimentation, luminosité, compatibilité, capacité,
 * format cabine, étanchéité, matières, dimensions, poids, garantie, livraison et tout effet sur le sommeil ne sont
 * jamais affirmés : leurs blocs restent dans la démonstration, masqués (champs « [À compléter : …] » prêts dans
 * l'éditeur) ; la boutique publique n'en montre rien. Aucun avis, note, compteur ni urgence ; aucune vente.
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
import type { DirectionId } from "../src/lib/theme/directions";
import { sectionSchema, withDefaults, type ThemeSpec, type SectionInstance, type TemplateJson, type StoreProduct } from "../src/lib/theme/spec";

export type KitId = "noctil";
export const KIT_PROVENANCE = "Issue #152 (20 octobre 2026) — démonstration du studio, images IA déjà générées fournies par Thomas (commit d5d27e26), sans personne, aucun paiement";
export const kitDir = (id: string) => path.join(process.cwd(), "public", "theme-assets", id);
export type Media = { file: string; role: string; alt: string };

/** Ordre d'import = rôles du thème (le dernier importé d'un rôle prend le premier emplacement). Textes alternatifs descriptifs. */
export const NOCTIL_MEDIA: Media[] = [
  { file: "logo.webp", role: "logo", alt: "NOCTIL" },
  { file: "produit-03.webp", role: "packshot", alt: "Projecteur NOCTIL vu en plongée : sphère indigo, objectif galaxie et socle rond." },
  { file: "produit-02.webp", role: "packshot", alt: "Projecteur NOCTIL de profil : la sphère tenue par son arceau." },
  { file: "produit-01.webp", role: "packshot", alt: "Projecteur de galaxies NOCTIL de face, sphère indigo sur son arceau et son socle." },
  { file: "produit-05.webp", role: "detail", alt: "Détail du socle NOCTIL : nom et bouton éclairé de violet." },
  { file: "produit-04.webp", role: "detail", alt: "Gros plan de l'objectif NOCTIL, une galaxie violette au centre." },
  { file: "ambiance-08.webp", role: "scene", alt: "NOCTIL projette une galaxie au plafond d'un loft, ville au crépuscule derrière la baie." },
  { file: "ambiance-06.webp", role: "scene", alt: "NOCTIL sur un bureau moderne, galaxie violette projetée au mur." },
  { file: "ambiance-02.webp", role: "scene", alt: "NOCTIL dans un salon cinéma, galaxie projetée au plafond au-dessus de l'écran." },
  { file: "ambiance-09.webp", role: "scene", alt: "NOCTIL sur une table de chevet, galaxie violette projetée au-dessus du lit." },
  { file: "ambiance-07.webp", role: "scene", alt: "NOCTIL dans un coin lecture, à côté d'un fauteuil et d'une lampe, galaxie au mur." },
  { file: "ambiance-04.webp", role: "scene", alt: "NOCTIL dans une alcôve lavande, coussins au sol, galaxie projetée sur la voûte." },
  { file: "ambiance-05.webp", role: "lifestyle", alt: "NOCTIL sur une table basse, ciel violet projeté au plafond d'une chambre." },
  { file: "ambiance-03.webp", role: "banner", alt: "Projecteur NOCTIL sur une surface sombre, halo indigo et violet derrière lui." },
  { file: "ambiance-01.webp", role: "lifestyle", alt: "NOCTIL près d'une fenêtre au crépuscule, voilage blanc et ville qui s'allume." },
  { file: "ambiance-10.webp", role: "lifestyle", alt: "Projecteur de galaxies NOCTIL entier, posé sur un halo indigo et violet." },
];
/** Fichier du kit gardé hors du rendu (consigne de l'issue #152) : variante du café, remplacée par ambiance-05. */
export const KIT_EXCLUDED: Record<KitId, { file: string; reason: string }[]> = {
  noctil: [],
};
export const KIT_MEDIA: Record<KitId, Media[]> = { noctil: NOCTIL_MEDIA };
export const KIT_HANDLE: Record<KitId, string> = { noctil: "projecteur-galaxies-noctil" };

export const p = (s: string) => `<p>${s}</p>`;
export const TODO = (what: string) => `[À compléter : ${what}]`;
const DEMO_BANNER = "Boutique de démonstration : aucune vente réelle.";
export const ORDER_FAQ = (brand: string): [string, string] => ["Peut-on commander aujourd'hui ?", `Pas encore : la boutique ${brand} présentée ici est une démonstration. Aucune commande n'y est enregistrée et aucun paiement n'est demandé.`];

// NOCTIL — fiche de stratégie (consigne de Thomas du 21 octobre, 21 h 45 ; brief, hypothèse éditoriale). Décision
// explicite : les ENFANTS sont les utilisateurs, le PARENT est l'acheteur.
//  utilisateur : un enfant passionné d'espace (planètes, fusées, étoiles) ; acheteur : son parent, qui cherche une surprise ;
//  situation d'achat : un anniversaire, Noël, ou l'envie de lui faire plaisir ;
//  tension (mots du parent) : « Il connaît toutes les planètes ; je voudrais lui offrir autre chose qu'un livre de plus. » ;
//  désir : voir son enfant émerveillé, et lui laisser imaginer ;
//  angle unique : offrir à son enfant sa propre galaxie dans sa chambre ;
//  promesse tenable : une galaxie violette projetée au plafond ou sur un mur ; un bouton éclairé facile à repérer ; un bel
//  objet le jour ; faits = visuels du kit ;
//  objections : où s'affiche la galaxie, peut-il l'allumer seul, l'aide-t-il le soir (aucune promesse), et le jour, âge
//  conseillé et alimentation (non renseignés : à vérifier avant d'offrir) ;
//  exclusions : aucun effet sur le coucher, le sommeil ou la peur du noir ; aucun âge, réglage, autonomie ou dimension
//  inventés ; aucune personne ajoutée. Visuels : le kit ne contient AUCUNE chambre d'enfant (salon cinéma, bureau, loft,
//  chambre et coin lecture d'adultes) : la chambre est montrée par la vue « au-dessus du lit », l'alcôve à coussins et
//  l'objet seul ; les autres scènes sont présentées comme « ailleurs dans la maison ».
export const NOCTIL_FAQ: [string, string][] = [
  ["Où la galaxie s'affiche-t-elle ?", "Au plafond ou sur un mur, selon l'endroit où vous posez NOCTIL et la direction de son objectif. Sur une table de chevet, objectif vers le haut, elle couvre le plafond au-dessus du lit."],
  ["Mon enfant peut-il l'allumer seul ?", "Le bouton est sur le socle, éclairé de violet : il se repère même dans la pénombre. L'âge conseillé et l'alimentation ne sont pas encore renseignés ; vérifiez-les avant de le lui confier."],
  ["L'aide-t-il le soir, au coucher ou s'il a peur du noir ?", "Nous ne promettons rien de tel. NOCTIL est un décor à regarder et à raconter : une galaxie au plafond, pour rêver d'espace."],
  ["Et le jour, à quoi ressemble-t-il ?", "À une sphère indigo mate sur son arceau, comme une petite planète posée sur un socle rond : sur une étagère, c'est un objet de décor."],
  ["Que puis-je faire dans cette boutique de démonstration ?", "Faire le tour du projecteur et le voir dans plusieurs pièces. Le prix, l'âge conseillé, l'alimentation, les réglages et les dimensions ne sont pas encore renseignés, et la commande est désactivée."],
];
export const NOCTIL_FAQ_PENDING: [string, string][] = [
  ["À partir de quel âge ?", TODO("âge conseillé et consignes de sécurité")],
  ["Comment NOCTIL est-il alimenté ?", TODO("alimentation, câble ou batterie, autonomie")],
  ["Quels réglages propose-t-il ?", TODO("luminosité, couleurs, modes, minuterie, télécommande ou application")],
  ["Quelles sont ses dimensions et son poids ?", TODO("hauteur, diamètre, poids")],
  ["Que contient la boîte ?", TODO("contenu exact du coffret")],
  ["Quelle est la garantie ?", TODO("durée et conditions de garantie")],
];
export type Brand = { name: string; product: string; category: string; summary: string; facts: [string, string][]; tagline: string; story: string; positioning: string; palette: { primary: string; secondary: string; accent: string; light: string; dark: string } };
const BRANDS: Record<KitId, Brand> = {
  noctil: {
    name: "NOCTIL", product: "Projecteur de galaxies NOCTIL", category: "Projecteur de galaxies",
    summary: "Projecteur de galaxies : sphère indigo mate tenue par un arceau, objectif rond à l'avant, socle rond avec un bouton éclairé de violet ; la galaxie s'affiche au plafond ou sur un mur.",
    facts: [["Silhouette", "sphère indigo mate sur un arceau, socle rond"], ["Commande visible", "un bouton éclairé de violet sur le socle"]],
    tagline: "Sa galaxie, au plafond de sa chambre.", story: "NOCTIL est né pour les enfants qui collectionnent les planètes : leur offrir un morceau de ciel à eux, au-dessus de leur lit.", positioning: "Un projecteur de galaxies à offrir aux enfants passionnés d'espace, pour leur chambre.",
    // Indigo et violet relevés sur le logo et les visuels ; lavande des vues produit ; nuit profonde.
    palette: { primary: "#4B3BB8", secondary: "#ECE8FA", accent: "#8E6CF0", light: "#ECE8FA", dark: "#0D0B26" },
  },
};

/** Démonstration d'un kit suivi dans le dépôt (public/theme-assets/<id>/) : projet client composé par le vrai moteur dans
 * son thème du catalogue, puis rédigé par `curate` sur les mêmes sections (NOCTIL, TRAVERSE ; HEUREN, ALCÔVE : issue #155). */
export type KitConfig = { id: DirectionId; media: Media[]; handle: string; brand: Brand; themeName: string; provenance: string; storeKind: "specialty" | "catalog"; sector: string; storeType?: "mono" | "multi"; /** Dossier des médias s'ils ne sont pas suivis dans public/theme-assets/<id>/ (ex. kit privé préparé hors dépôt). */ mediaDir?: string };
export async function kitProject(userId: string, id: KitId) {
  return buildKitProject(userId, { id, media: KIT_MEDIA[id], handle: KIT_HANDLE[id], brand: BRANDS[id], themeName: "Noctil", provenance: KIT_PROVENANCE, storeKind: "specialty", sector: "maison" }, curateNoctil);
}
export async function buildKitProject(userId: string, cfg: KitConfig, curate: (k: Kit) => void) {
  const { id, brand: b } = cfg;
  const pid = seedHoldout(userId, 0, `Démo ${b.name}`);
  const product = {
    ...emptyProduct(), name: b.product, nameStatus: "provided" as const, category: b.category, sector: cfg.sector as ReturnType<typeof emptyProduct>["sector"], summary: b.summary,
    facts: b.facts.map(([label, value]) => ({ key: label.toLowerCase(), label, value, status: "confirmed" as const, source: "user" as const })),
    variants: [],
  };
  saveProduct(pid, product);
  const local = localBrand(product, b.name, { business: "products" });
  saveBrand(pid, { ...local.brand, name: b.name, generatedBy: "local" as const, tagline: b.tagline, story: b.story, positioning: b.positioning, palette: b.palette, direction: id });
  saveStrategy(pid, local.strategy);
  run("UPDATE projects SET store_type = ?, business_type = ?, updated_at = ? WHERE id = ?", cfg.storeType ?? "mono", "products", now(), pid);
  saveSettings(pid, { ...loadProject(pid).settings, storeKind: cfg.storeKind });

  // Médias : importés comme ceux d'un client (rôles explicites), étiquetés démonstration. Jamais le fichier exclu.
  const missing: string[] = [];
  const ids: Record<string, string> = {};
  for (const m of cfg.media) {
    const source = path.join(cfg.mediaDir ?? kitDir(id), m.file);
    if (!fs.existsSync(source) || fs.statSync(source).size === 0) { missing.push(m.file); continue; }
    const bytes = fs.readFileSync(source), meta = await sharp(bytes).metadata();
    const a = await saveAsset({ projectId: pid, userId, data: bytes, mime: "image/webp", name: `${id}-${m.file}`, origin: "upload", role: m.role, status: "approved", meta: { demo: { isDemo: true, provenance: cfg.provenance }, width: meta.width, height: meta.height, alt: m.alt } });
    ids[m.file] = a.id;
    if (m.role === "logo") {
      const png = await sharp(bytes).resize(180, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      const fav = await saveAsset({ projectId: pid, userId, data: png, mime: "image/png", name: `${id}-favicon-180.png`, origin: "upload", role: "favicon", status: "approved", meta: { demo: { isDemo: true, provenance: cfg.provenance }, width: 180, height: 180 } });
      ids["favicon.png"] = fav.id;
    }
  }

  const built = await composeShop(pid, id, null, false);
  const spec: ThemeSpec = built.spec;
  const productKey = spec.store.product.template_suffix ? `product.${spec.store.product.template_suffix}` : "product";
  const catalogOrder = { index: spec.templates.index.order.map((k) => spec.templates.index.sections[k].type), product: spec.templates[productKey].order.map((k) => spec.templates[productKey].sections[k].type) };
  curate(kit(spec, ids, cfg));
  return { pid, spec, missing, catalogOrder, project: loadProject(pid) };
}

/** Outils de rédaction posés sur la composition du catalogue (mêmes sections, même ordre) — comme pour SILLON. */
function kit(spec: ThemeSpec, ids: Record<string, string>, cfg: KitConfig) {
  const { id, media } = cfg;
  // Fichiers servis sous un nom propre à la marque (le dossier assets du thème est commun à toute la boutique).
  const name = (file: string) => `${id}-${file}`;
  for (const [file, aid] of Object.entries(ids)) spec.files[name(file)] = aid;
  const alt = (file: string) => media.find((m) => m.file === file)?.alt ?? "";
  const img = (file: string, extra: Record<string, unknown> = {}) => ({ image_asset: ids[file] ? name(file) : "", image_alt: alt(file), ...extra });
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
  /** Remplace, dans l'ordre, chaque section du catalogue par sa version rédigée ; une section retirée par la composition est remise à sa place. */
  const overlay = (key: string, rows: SectionInstance[]) => {
    const t = spec.templates[key];
    if (!t) throw new Error(`Modèle absent : ${key}`);
    let at = t.order.findIndex((sid) => t.sections[sid].type === "main-product");
    rows.forEach((r, n) => {
      const i = t.order.findIndex((sid, j) => j > at && t.sections[sid].type === r.type);
      if (i >= 0) {
        const sid = t.order[i];
        t.sections[sid] = { ...r, settings: { ...r.settings, color_scheme: ownScheme.has(r) ? r.settings.color_scheme : t.sections[sid].settings.color_scheme ?? r.settings.color_scheme } };
        at = i;
      } else {
        const sid = `${id}_${r.type.replace(/[^a-z]/g, "_")}_${n}`;
        t.sections[sid] = r;
        t.order.splice(at + 1, 0, sid);
        at += 1;
      }
    });
  };
  const faq = (heading: string, items: [string, string][], style: string, layout: string, text = "", extra: Record<string, unknown> = {}) => {
    const schema = sectionSchema(spec, "faq")!; const blockType = schema.blocks[0]?.type ?? "question";
    return section("faq", { heading, text: text ? p(text) : "", style, layout, structured_data: false, open_first: false, ...extra }, items.map(([question, answer]) => ({ type: blockType, settings: { question, answer: p(answer) }, hidden: answer.includes("[À compléter") })));
  };
  const productHref = `/products/${cfg.handle}`;
  const productKey = () => (spec.store.product.template_suffix && spec.templates[`product.${spec.store.product.template_suffix}`] ? `product.${spec.store.product.template_suffix}` : "product");
  /** Corps de la fiche : mêmes blocs que SILLON ; les accordéons aux faits inconnus sont masqués, prêts dans l'éditeur. */
  const mainProduct = (opts: { eyebrow: string; text: string; highlights: string; description: string; specs: string; box: string; shipping: string; settings: Record<string, unknown> }) => {
    const key = productKey();
    const mainId = spec.templates[key].order.find((k) => spec.templates[key].sections[k].type === "main-product")!;
    const mp = spec.templates[key].sections[mainId];
    const mpSchema = sectionSchema(spec, "main-product")!;
    const block = (type: string, settings: Record<string, unknown>) => ({ type, settings: withDefaults(mpSchema.blocks.find((b) => b.type === type)?.settings, settings) });
    const blocks: [string, { type: string; settings: Record<string, unknown>; disabled?: boolean }][] = [
      ["eyebrow", block("eyebrow", { text: opts.eyebrow })],
      ["title", block("title", {})],
      ["price", block("price", {})],
      ["text", block("text", { text: p(opts.text) })],
      ["highlights", block("highlights", { items: opts.highlights, icon: "check", columns: 1 })],
      ["buy", block("buy_buttons", { picker: "buttons", show_quantity: true, show_dynamic_checkout: false, price_in_button: false })],
      ["details", block("collapsible", { heading: "Description", content: opts.description, open: false })],
      ["specs", { ...block("collapsible", { heading: "Caractéristiques techniques", content: p(TODO(opts.specs)), open: false }), disabled: true }],
      ["box", { ...block("collapsible", { heading: "Dans la boîte", content: p(TODO(opts.box)), open: false }), disabled: true }],
      ["shipping", { ...block("collapsible", { heading: "Livraison, retours et garantie", content: p(TODO(opts.shipping)), open: false }), disabled: true }],
    ];
    mp.settings = { ...mp.settings, product_target: "product:main", purchase_enabled: false, ...opts.settings };
    mp.blocks = Object.fromEntries(blocks);
    mp.block_order = blocks.map(([k]) => k);
  };
  const page = (handle: string, title: string, seo: { title: string; description: string }, rows: [string, SectionInstance][]) => {
    spec.store.pages.push({ handle, title, template_suffix: handle, body_html: "", seo });
    spec.templates[`page.${handle}`] = template([["title", section("main-page", { width: "wide", color_scheme: "scheme-1", padding_top: 48, padding_bottom: 0 })], ...rows]);
  };
  /** Produit principal sans prix (inconnu) : la démonstration ne vend rien. */
  const product = (fields: { title: string; description_html: string; images: string[]; tags: string[]; seo: { title: string; description: string } }) => {
    const main: StoreProduct = {
      ...spec.store.product, contentTarget: "product:main", handle: cfg.handle, vendor: cfg.brand.name,
      price: null, compare_at_price: null, currency: "EUR", options: [], variants: [{ title: "Default Title", options: [], price: null, available: true }],
      ...fields, images: fields.images.filter((f) => ids[f]).map(name),
    };
    spec.store.product = main;
    spec.store.products = [];
    spec.store.collections = [{ handle: "all", title: fields.title, description: cfg.brand.summary, products: [main.handle] }];
    return main;
  };
  /** Fin commune : modèles de page orphelins retirés, FAQ sans données structurées, logo et icône du site. */
  const finish = () => {
    for (const key of Object.keys(spec.templates)) if (key.startsWith("page.") && !spec.store.pages.some((pg) => `page.${pg.template_suffix}` === key)) delete spec.templates[key];
    for (const t of Object.values(spec.templates)) for (const sec of Object.values(t.sections)) if (sec.type === "faq") sec.settings.structured_data = false;
    // Bouton flottant « Nous contacter » : vers la page d'aide et de contact de la démonstration (pas de page /contact).
    spec.settings = { ...spec.settings, logo_asset: ids["logo.webp"] ? name("logo.webp") : "", favicon_asset: ids["favicon.png"] ? name("favicon.png") : "", fab_contact_link: "/pages/aide" };
  };
  const demoMeta = () => {
    spec.name = `${cfg.brand.name} — thème ${cfg.themeName} (démonstration)`;
    spec.meta = { ...spec.meta, demo: { isDemo: true, provenance: cfg.provenance, contactTest: false } };
    spec.store.shopName = cfg.brand.name;
    spec.store.business = "products";
    spec.store.paymentTypes = [];
    spec.store.policies = [];
    spec.store.pages = [];
  };
  return { spec, ids, name, img, section, hide, overlay, faq, productHref, productKey, mainProduct, page, product, finish, demoMeta, announce: () => section("announcement-bar", { style: "static", color_scheme: "scheme-3" }, [{ type: "announcement", settings: { text: DEMO_BANNER, link: "" } }]) };
}
export type Kit = ReturnType<typeof kit>;

// ─── NOCTIL ───────────────────────────────────────────────────────────────────────────────────────────────────────
function curateNoctil(k: Kit) {
  const { spec, img, section, hide, overlay, faq, productHref } = k;
  k.demoMeta();
  spec.store.seo = { title: "NOCTIL | Offrez à votre enfant sa propre galaxie, dans sa chambre", description: "Pour l'enfant passionné d'espace : NOCTIL projette une galaxie violette au plafond de sa chambre. Un cadeau à regarder et à raconter, beau aussi éteint." };
  k.product({
    title: "Projecteur de galaxies NOCTIL",
    description_html: p("Pour qui : l'enfant qui connaît les planètes par cœur, et le parent qui veut lui faire une surprise. Posé sur sa table de chevet, NOCTIL projette une galaxie violette au plafond de sa chambre.") + p("Ce qu'on voit : une sphère indigo mate, comme une petite planète, tenue par un arceau ; un objectif rond ouvert sur une galaxie ; un socle rond au bouton éclairé de violet.") + p("Avant d'offrir : l'âge conseillé, l'alimentation et les réglages ne sont pas encore renseignés dans cette démonstration."),
    images: ["produit-01.webp", "produit-02.webp", "produit-03.webp", "produit-04.webp", "produit-05.webp"],
    tags: ["projecteur", "galaxie", "cadeau", "chambre d'enfant"],
    seo: { title: "NOCTIL : le projecteur de galaxies des enfants passionnés d'espace", description: "Une galaxie violette au plafond de sa chambre : NOCTIL en détail, sphère indigo, objectif, socle et bouton éclairé, et comment le placer." },
  });

  // ─── Accueil : le cadeau, la chambre, l'imagination. ────────────────────────────────────────────────────────────
  overlay("index", [
    section("cv-hero", { ...img("ambiance-10.webp"), image_ratio: "wide", focus_x: 50, focus_y: 50, layout: "stacked", heading: "Offrez-lui sa propre galaxie,", heading_accent: "au plafond de sa chambre", heading_tag: "h1", text: p("Il connaît toutes les planètes et dessine des fusées partout ? Posé sur sa table de chevet, NOCTIL projette une galaxie violette au-dessus de son lit."), button_label: "Découvrir le projecteur", button_link: productHref, rating_text: "", rating_note: "", guarantee_text: "", animation: "fade" }, [
      { type: "check", settings: { text: "Une galaxie au plafond ou sur un mur" } },
      { type: "check", settings: { text: "Un bouton éclairé, facile à trouver" } },
      { type: "check", settings: { text: "Une petite planète, le jour" } },
    ]),
    section("features-grid", { eyebrow: "Ce qu'il découvre", heading: "Sa chambre, <em>son univers</em>", layout: "grid", columns: 4, columns_mobile: "2", style: "glow", heading_align: "center", link_label: "", link: "" }, [
      { type: "feature", settings: { icon: "star", title: "Un ciel rien qu'à lui", text: p("Allongé sur son lit, il lève les yeux : la galaxie couvre le plafond."), link_label: "", link: "" } },
      { type: "feature", settings: { icon: "waves", title: "Des voyages à inventer", text: p("Une spirale violette et des milliers de points lumineux : de quoi imaginer des expéditions entre les étoiles."), link_label: "", link: "" } },
      { type: "feature", settings: { icon: "sparkle", title: "Une petite planète", text: p("Le jour, la sphère indigo reste posée sur son étagère, comme un astre de collection."), link_label: "", link: "" } },
      { type: "feature", settings: { icon: "hand", title: "Un bouton qu'il trouve", text: p("Sur le socle, un bouton éclairé de violet, visible dans la pénombre."), link_label: "", link: "" } },
    ]),
    section("cv-gallery", { layout: "carousel", ratio: "portrait", eyebrow: "Dans la maison", heading: "Sa chambre d'abord,", heading_accent: "et ailleurs ensuite", text: p("Au-dessus du lit, dans un coin à coussins, au salon pour une histoire du soir : la galaxie se déplace avec lui."), ai_label: "" }, [
      { type: "image", settings: { ...img("ambiance-09.webp"), caption: "Au-dessus du lit" } },
      { type: "image", settings: { ...img("ambiance-04.webp"), caption: "Une alcôve à coussins, sous les étoiles" } },
      { type: "image", settings: { ...img("ambiance-07.webp"), caption: "Une histoire au coin lecture" } },
      { type: "image", settings: { ...img("ambiance-05.webp"), caption: "Tout le plafond en violet" } },
    ]),
    section("image-with-text", { ...img("ambiance-01.webp"), layout: "overlap", ratio: "portrait", reveal: "up", parallax: false, eyebrow: "Le moment", heading: "Quand le jour tombe, son univers s'allume", text: p("Les rideaux se ferment, la grande lumière s'éteint, la galaxie apparaît. Un rendez-vous qu'un petit passionné d'espace peut attendre toute la journée."), button_label: "Voir où le poser", button_link: "/pages/univers" }),
    section("cv-cards", { layout: "columns", heading: "Le jour,", heading_accent: "une planète sur l'étagère", text: p("Éteint, NOCTIL reste un objet qu'on a plaisir à regarder.") }, [
      { type: "card", settings: { ...img("produit-04.webp"), title: "L'objectif", text: p("Un objectif rond et cerclé, où l'on voit déjà la galaxie.") } },
      { type: "card", settings: { ...img("produit-05.webp"), title: "Le socle et son bouton", text: p("Le nom NOCTIL et un bouton éclairé de violet, à portée de petite main.") } },
      { type: "card", settings: { ...img("produit-02.webp"), title: "La sphère sur son arceau", text: p("De profil : la sphère tenue entre les deux branches de son arceau.") } },
    ]),
    section("cta-banner", { ...img("ambiance-08.webp"), heading: "Le cadeau qui fait lever les yeux", text: p("Anniversaire, Noël ou simple surprise : toutes les vues de NOCTIL sont sur sa fiche."), button_label: "Découvrir le projecteur", button_link: productHref, style: "center", parallax: false, overlay: 55 }),
    faq("Avant de l'offrir", NOCTIL_FAQ.slice(0, 5), "cards", "stacked", "Où s'affiche la galaxie, l'allumer seul, le soir, l'objet le jour, ce que permet la démonstration."),
    section("newsletter", { eyebrow: "Nouvelles de NOCTIL", heading: "Être prévenu quand NOCTIL ouvre", text: p("Un e-mail à l'ouverture de la boutique, pour préparer la surprise. Rien d'autre."), button_label: "Me prévenir", preview_note: true, legal: p("Désinscription possible à tout moment depuis chaque e-mail.") }),
  ]);

  // ─── Fiche produit ──────────────────────────────────────────────────────────────────────────────────────────────
  k.mainProduct({
    eyebrow: "Projecteur de galaxies · à offrir",
    text: "Pour l'enfant qui collectionne les planètes : posé sur sa table de chevet, NOCTIL projette une galaxie violette au plafond de sa chambre.",
    highlights: "Une galaxie au plafond ou sur un mur\nUn bouton éclairé, facile à trouver\nUne sphère indigo, comme une petite planète\nUn cadeau pour les passionnés d'espace",
    description: spec.store.product.description_html,
    specs: "âge conseillé, alimentation et autonomie, luminosité, couleurs et modes, minuterie, télécommande ou application, dimensions, poids, matériaux, certifications",
    box: "contenu exact du coffret",
    shipping: "zones, délais et frais de livraison ; délai et conditions de retour ; durée de garantie",
    settings: { gallery_layout: "carousel", gallery_ratio: "square", enable_zoom: true, sticky_bar: true, color_scheme: "scheme-1" },
  });
  overlay(k.productKey(), [
    section("cv-ingredients", { layout: "cards", columns: 3, eyebrow: "Ce qu'on voit", heading: "Une petite planète,", heading_accent: "pièce par pièce", text: p("Les éléments que l'on voit sur l'objet, du haut vers le bas."), note: "", image_asset: "" }, [
      { type: "ingredient", settings: { icon: "globe", name: "La sphère", role: "Corps rond, indigo mat, qui porte l'objectif.", note: "", badge: "", image_asset: "" } },
      { type: "ingredient", settings: { icon: "sparkle", name: "L'objectif", role: "Lentille ronde et cerclée, d'où sort la galaxie.", note: "", badge: "", image_asset: "" } },
      { type: "ingredient", settings: { icon: "hand", name: "L'arceau", role: "Deux branches qui tiennent la sphère de chaque côté.", note: "", badge: "", image_asset: "" } },
      { type: "ingredient", settings: { icon: "shield", name: "Le socle", role: "Base ronde où figure le nom NOCTIL.", note: "", badge: "", image_asset: "" } },
      { type: "ingredient", settings: { icon: "bolt", name: "Le bouton", role: "Éclairé de violet, visible dans la pénombre.", note: "", badge: "", image_asset: "" } },
      { type: "ingredient", settings: { icon: "check", name: "Matériaux", role: TODO("matériaux de la sphère, de l'arceau et du socle"), note: "", badge: "", image_asset: "" }, hidden: true },
    ]),
    section("content-tabs", { eyebrow: "Avant de l'offrir", heading: "NOCTIL, en trois regards", tab_style: "pills", image_position: "right" }, [
      { type: "tab", settings: { title: "Silhouette", icon: "sparkle", heading: "Une sphère, un arceau, un socle", content: "<ul><li>Sphère indigo mate, comme une petite planète</li><li>Objectif rond et cerclé, à l'avant</li><li>Arceau à deux branches</li><li>Socle rond avec le nom NOCTIL</li><li>Bouton éclairé de violet</li></ul>", ...img("produit-03.webp"), button_label: "", button_link: "" } },
      { type: "tab", settings: { title: "Où le poser", icon: "heart", heading: "Au plafond de sa chambre, ou sur un mur", content: p("Sur la table de chevet ou une étagère de sa chambre, NOCTIL habille le plafond ou le mur qu'il regarde. Il se déplace aussi : nos photos le montrent au salon, sur un bureau et dans un coin lecture."), ...img("ambiance-06.webp"), button_label: "Voir où le poser", button_link: "/pages/univers" } },
      { type: "tab", settings: { title: "Fiche technique", icon: "clock", heading: "Fiche technique", content: p(TODO("âge conseillé, alimentation, autonomie, luminosité, modes, dimensions, poids")), image_asset: "", button_label: "", button_link: "" }, hidden: true },
    ]),
    section("timeline", { eyebrow: "Le soir venu", heading: "Préparer", heading_accent: "la surprise", image_asset: "" }, [
      { type: "step", settings: { title: "Choisir sa place", text: p("La table de chevet ou une étagère de sa chambre.") } },
      { type: "step", settings: { title: "Tourner l'objectif", text: p("Vers le plafond au-dessus du lit, ou vers le mur qu'il préfère.") } },
      { type: "step", settings: { title: "Éteindre la grande lumière", text: p("Moins il y a de lumière autour, plus la galaxie ressort, comme sur nos photos.") } },
      { type: "step", settings: { title: "Lever les yeux ensemble", text: p("Montrez-lui la spirale, et laissez-le raconter la suite du voyage.") } },
    ]),
    section("cv-feature", { ...img("ambiance-03.webp"), layout: "stacked", heading: "Une lueur indigo,", heading_accent: "même posée seule", text: p("Sur un plan sombre, NOCTIL se suffit : la sphère, son halo, et l'univers qui commence."), button_label: "", button_link: "", guarantee_text: "" }, [
      { type: "point", settings: { icon: "sparkle", title: "Une silhouette ronde", text: p("Une planète que l'on reconnaît au premier regard.") } },
      { type: "point", settings: { icon: "heart", title: "Un objet de chambre", text: p("Indigo mat le jour, galaxie le soir.") } },
      { type: "point", settings: { icon: "hand", title: "Un seul bouton en vue", text: p("Sur le socle, éclairé de violet.") } },
    ]),
    hide(section("fs-commitments", { layout: "grid", eyebrow: "Avant la mise en vente", heading: "Livraison, retours", heading_accent: "et garantie", text: "", align: "center", button_label: "", button_link: "", note: "" }, [
      { type: "item", settings: { icon: "truck", title: "Livraison", text: p(TODO("zones, délais et frais")), proof_label: "", proof_link: "" } },
      { type: "item", settings: { icon: "return", title: "Retours", text: p(TODO("délai et conditions")), proof_label: "", proof_link: "" } },
      { type: "item", settings: { icon: "shield", title: "Garantie", text: p(TODO("durée et couverture")), proof_label: "", proof_link: "" } },
      { type: "item", settings: { icon: "chat", title: "Assistance", text: p(TODO("canal de contact et horaires")), proof_label: "", proof_link: "" } },
    ])),
    faq("Questions sur NOCTIL", [...NOCTIL_FAQ, ...NOCTIL_FAQ_PENDING], "lines", "stacked"),
  ]);

  // ─── Pages ──────────────────────────────────────────────────────────────────────────────────────────────────────
  k.page("univers", "Où poser sa galaxie", { title: "Où poser sa galaxie : sa chambre et ailleurs | NOCTIL", description: "Au-dessus de son lit d'abord ; au salon pour une soirée en famille, dans un coin lecture ou sur un bureau ensuite : où placer NOCTIL, en photos." }, [
    ["intro", section("rich-text", { style: "plain", align: "center", color_scheme: "scheme-1", padding_top: 24, padding_bottom: 32 }, [{ type: "text", settings: { text: p("Sa chambre d'abord. Mais NOCTIL se déplace : voici trois pièces où nous l'avons posé, pour une soirée en famille ou une histoire avant d'éteindre.") } }])],
    ["pieces", section("cv-alternating", { layout: "alternate", ratio: "landscape", eyebrow: "Ailleurs dans la maison", heading: "Là où", heading_accent: "la galaxie le suit", text: "", color_scheme: "scheme-4" }, [
      { type: "row", settings: { ...img("ambiance-02.webp"), eyebrow: "Soirée film", heading: "La galaxie", heading_accent: "au-dessus de l'écran", text: p("Canapé, plaid, lumières éteintes : toute la famille sous le même ciel avant le film."), button_label: "", button_link: "" } },
      { type: "row", settings: { ...img("ambiance-06.webp"), eyebrow: "Sur un bureau", heading: "Un mur", heading_accent: "plein d'étoiles", text: p("Posé sur un bureau, objectif vers le mur : la galaxie prend toute la place derrière l'écran."), button_label: "", button_link: "" } },
      { type: "row", settings: { ...img("ambiance-07.webp"), eyebrow: "Coin lecture", heading: "Un fauteuil,", heading_accent: "une histoire, une galaxie", text: p("La lampe pour lire l'histoire, NOCTIL pour le décor : deux lumières qui se partagent la pièce."), button_label: "", button_link: "" } },
    ])],
    ["cta", section("cta-banner", { heading: "Choisir sa place dans sa chambre", text: p("Toutes les vues de NOCTIL, et comment le placer au-dessus de son lit, sur sa fiche."), button_label: "Découvrir le projecteur", button_link: productHref, image_asset: "", style: "center", parallax: false, color_scheme: "scheme-2", padding_top: 88, padding_bottom: 88 })],
  ]);
  k.page("aide", "Questions et contact", { title: "Questions et contact | NOCTIL, projecteur de galaxies à offrir", description: "Où s'affiche la galaxie, peut-il l'allumer seul, le soir, l'objet le jour : nos réponses sur NOCTIL, et un formulaire." }, [
    ["faq", faq("Questions fréquentes", [...NOCTIL_FAQ, ...NOCTIL_FAQ_PENDING], "numbered", "stacked", "", { color_scheme: "scheme-1" })],
    ["form", section("contact-form", { eyebrow: "Contact", heading: "Une question avant de l'offrir ?", text: p("Écrivez-nous : le formulaire vérifie les champs avant l'envoi. Dans cette démonstration, aucun message n'est réellement transmis."), email: "", hours: "", response: "", preview_note: true, color_scheme: "scheme-4", padding_top: 64, padding_bottom: 96 })],
  ]);

  // ─── Menus, en-tête « barre flottante » sur lavande, pied « centré » ────────────────────────────────────────────
  spec.store.menus["main-menu"] = { title: "Navigation", links: [{ title: "Le projecteur", url: productHref }, { title: "Où le poser", url: "/pages/univers" }, { title: "Questions et contact", url: "/pages/aide" }] };
  spec.store.menus.footer = { title: "Aide", links: [{ title: "Le projecteur", url: productHref }, { title: "Où le poser", url: "/pages/univers" }, { title: "Questions et contact", url: "/pages/aide" }, { title: "Recherche", url: "/search" }] };
  const header = Object.values(spec.groups.header.sections).find((s) => s.type === "header")!;
  header.settings = { ...header.settings, menu: "main-menu", layout: "logo-left", shape: "pill", icons: "circles", mega_menu: "none", mobile_menu: "sheet", sticky: true, transparent_on_home: false, show_search: true, show_cart: true, cta_label: "", phone: "", color_scheme: "scheme-2" };
  header.blocks = {}; header.block_order = [];
  spec.groups.header.sections = { announce: k.announce(), header };
  spec.groups.header.order = ["announce", "header"];
  const footer = Object.values(spec.groups.footer.sections).find((s) => s.type === "footer")!;
  footer.settings = { ...footer.settings, style: "centered", show_wordmark: false, show_policies: false, show_payment: false, color_scheme: "scheme-2", logo_asset: "" };
  footer.blocks = {
    about: { type: "text", settings: { heading: "NOCTIL", text: p("Le projecteur de galaxies à offrir aux enfants passionnés d'espace, pour leur chambre. Marque de démonstration du studio.") } },
    links: { type: "links", settings: { heading: "Aide", menu: "footer" } },
    news: { type: "newsletter", settings: { heading: "Nouvelles de NOCTIL", text: "Aperçu : inscription non enregistrée dans la démonstration." } },
  };
  footer.block_order = ["about", "links", "news"];
  for (const s of Object.values(spec.groups.footer.sections)) if (s.type !== "footer") s.disabled = true;
  k.finish();
  spec.settings = { ...spec.settings, logo_width: 150 };
}
