/**
 * Outils communs des démonstrations « kit » (NOCTIL, HEUREN, ALCÔVE, MUSEAU CLUB, SOUPLE, TRAVERSE, ONDE) et liste des
 * médias NOCTIL. Chaque démonstration est rédigée dans son propre fichier : NOCTIL refait d'après le dossier du
 * 23 octobre dans tests/noctil-fixtures.ts, TRAVERSE dans tests/traverse-fixtures.ts, etc.
 *
 * Comme SILLON : chaque démonstration est d'abord un projet client (marque, produit, médias avec rôles), composé par le
 * VRAI moteur dans son thème du catalogue (composeShop) ; la rédaction de démonstration remplit ensuite les mêmes
 * sections, dans le même ordre, avec des textes écrits pour chaque marque. Rien n'est inventé.
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
export const KIT_PROVENANCE = "PR #167 (23 octobre 2026) — dossier NOCTIL de Thomas (commit 39508f4d) : 6 originaux du kit et 10 créations complémentaires, sans personne, aucun paiement";
export const kitDir = (id: string) => path.join(process.cwd(), "public", "theme-assets", id);
export type Media = { file: string; role: string; alt: string };

/** NOCTIL refait d'après le dossier du 23 octobre (docs/design/noctil-reference-20261023, MEDIAS.md) : ordre d'import =
 * rôles du thème (le dernier importé d'un rôle prend le premier emplacement). Textes alternatifs descriptifs. Les dix
 * ambiances historiques (pièces d'adultes : loft, bureau, salon cinéma…) ne sont pas importées : la référence montre des
 * chambres d'enfant (voir la matrice du rapport docs/coordination/NOCTIL_RESULTATS.md). */
export const NOCTIL_MEDIA: Media[] = [
  { file: "logo.webp", role: "logo", alt: "NOCTIL" },
  { file: "produit-03.webp", role: "packshot", alt: "Projecteur NOCTIL vu en plongée : sphère bleu nuit, objectif galaxie et socle rond." },
  { file: "produit-02.webp", role: "packshot", alt: "Projecteur NOCTIL de profil : la sphère tenue par son arceau." },
  { file: "produit-01.webp", role: "packshot", alt: "Projecteur de galaxies NOCTIL de face, sphère bleu nuit sur son arceau et son socle." },
  { file: "produit-05.webp", role: "detail", alt: "Détail du socle NOCTIL : nom et bouton éclairé de violet." },
  { file: "produit-04.webp", role: "detail", alt: "Gros plan de l'objectif NOCTIL, une galaxie violette au centre." },
  { file: "projecteur-detoure.png", role: "cutout", alt: "Projecteur de galaxies NOCTIL détouré : sphère bleu nuit, objectif galaxie, arceau et socle au bouton violet." },
  { file: "hero-chambre.webp", role: "banner", alt: "Chambre d'enfant de nuit, galaxie violette projetée au plafond, lampes chaudes et lit à droite." },
  { file: "chambre-fusee.webp", role: "scene", alt: "Chambre d'enfant bleu nuit avec une grande fusée crème et une galaxie au plafond." },
  { file: "chambre-rose.webp", role: "scene", alt: "Chambre d'enfant rose à baldaquin, lapin en peluche et galaxie violette au plafond." },
  { file: "peluches.webp", role: "scene", alt: "Lapin et ours en peluche sur des coussins bleu nuit et lavande, lampe ambrée et galaxie." },
  { file: "tipi.webp", role: "scene", alt: "Tipi crème éclairé de guirlandes, ours en peluche et livre ouvert sous une galaxie." },
  { file: "bibliotheque.webp", role: "lifestyle", alt: "Étagère de livres d'enfant, fusée et astronaute jouets, lune lumineuse sous un ciel étoilé." },
  { file: "projecteur-chambre.webp", role: "lifestyle", alt: "Projecteur NOCTIL sur une table dans une chambre d'enfant, ours en peluche et galaxie au plafond." },
  { file: "journal-livres.webp", role: "ambiance", alt: "Pile de livres, globe galaxie, étoile lumineuse et astronaute jouet sur fond sombre." },
  { file: "aide-planete.webp", role: "ambiance", alt: "Ciel étoilé bleu nuit, planète lavande et orbites dorées." },
];
/** Fichier du kit gardé hors du rendu (consigne de l'issue #152) : variante du café, remplacée par ambiance-05. */
export const KIT_EXCLUDED: Record<KitId, { file: string; reason: string }[]> = {
  noctil: Array.from({ length: 10 }, (_, i) => ({ file: `ambiance-${String(i + 1).padStart(2, "0")}.webp`, reason: "pièce d'adulte (loft, bureau, salon…) : la référence du 23 octobre montre des chambres d'enfant" })),
};
export const KIT_MEDIA: Record<KitId, Media[]> = { noctil: NOCTIL_MEDIA };
export const KIT_HANDLE: Record<KitId, string> = { noctil: "projecteur-galaxies-noctil" };

export const p = (s: string) => `<p>${s}</p>`;
export const TODO = (what: string) => `[À compléter : ${what}]`;
const DEMO_BANNER = "Boutique de démonstration : aucune vente réelle.";
export const ORDER_FAQ = (brand: string): [string, string] => ["Peut-on commander aujourd'hui ?", `Pas encore : la boutique ${brand} présentée ici est une démonstration. Aucune commande n'y est enregistrée et aucun paiement n'est demandé.`];

export type Brand = { name: string; product: string; category: string; summary: string; facts: [string, string][]; tagline: string; story: string; positioning: string; palette: { primary: string; secondary: string; accent: string; light: string; dark: string } };
export type KitConfig = { id: DirectionId; media: Media[]; handle: string; brand: Brand; themeName: string; provenance: string; storeKind: "specialty" | "catalog"; sector: string; storeType?: "mono" | "multi"; /** Dossier des médias s'ils ne sont pas suivis dans public/theme-assets/<id>/ (ex. kit privé préparé hors dépôt). */ mediaDir?: string };
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
    const a = await saveAsset({ projectId: pid, userId, data: bytes, mime: m.file.endsWith(".png") ? "image/png" : "image/webp", name: `${id}-${m.file}`, origin: "upload", role: m.role, status: "approved", meta: { demo: { isDemo: true, provenance: cfg.provenance }, width: meta.width, height: meta.height, alt: m.alt } });
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
