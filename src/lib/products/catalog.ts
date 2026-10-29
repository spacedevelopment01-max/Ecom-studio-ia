/**
 * Produits du Studio (mission #190, point 5) : une fiche par produit, saisie une seule fois dans l'onglet « Catalogue »,
 * qui alimente l'aperçu de la boutique, les exports (Shopify, WooCommerce, PrestaShop, CSV) et l'envoi direct aux
 * boutiques connectées. Le thème enregistré n'est jamais modifié : les produits sont joints au moment de l'aperçu ou de
 * l'export (`withStudioProducts`), comme les biens immobiliers.
 *
 * Contenu d'une fiche : nom, description, photos (médias de CE projet), prix et prix barré, options et variantes
 * (référence SKU unique dans le projet, prix, stock, image), catégories, étiquettes, informations de plateforme
 * (marque, type, code-barres, poids, référencement) et sa mise en page propre (modèle « product.<suffixe> » du thème).
 * Ce contenu reste attaché au produit : changer de thème ne l'efface pas.
 *
 * Première ouverture : le catalogue reprend les produits déjà montrés par la boutique (mêmes noms de fichiers, mêmes
 * identifiants « handle ») ; l'aperçu reste donc identique tant que rien n'est modifié.
 */
import { z } from "zod";
import { HttpError } from "../auth";
import { all, id as newId, json, now, one, run, tx } from "../db";
import { L } from "../i18n-server";
import { slugify } from "../blog-html";
import { currentTheme } from "../projects";
import { storeProducts, type StoreCollection, type StoreProduct, type ThemeSpec } from "../theme/spec";

export const PRODUCT_STATUSES = ["active", "draft", "archived"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

const short = (max: number) => z.string().trim().max(max);
const cents = z.number().int().min(0).max(100_000_000).nullable();
const image = z.object({ assetId: z.string().min(1).max(40), file: z.string().max(160).optional(), alt: short(200).default("") });

export const productDataSchema = z.object({
  title: short(160).default(""),
  description_html: z.string().max(40_000).default(""),
  vendor: short(120).default(""),
  productType: short(120).default(""),
  categories: z.array(short(80)).max(20).default([]),
  tags: z.array(short(60)).max(40).default([]),
  images: z.array(image).max(30).default([]),
  price: cents.default(null),
  compareAt: cents.default(null),
  currency: z.string().regex(/^[A-Z]{3}$/).default("EUR"),
  /** Options et leurs valeurs (ex. Couleur : Sable, Nuit) ; les variantes en sont les combinaisons. */
  options: z.array(z.object({ name: short(40).min(1), values: z.array(short(60).min(1)).min(1).max(50) })).max(3).default([]),
  seo: z.object({ title: short(70).default(""), description: short(320).default("") }).default({ title: "", description: "" }),
  /** Mise en page propre à ce produit (modèle « product.<suffixe> » du thème) ; vide : la fiche produit commune. */
  templateSuffix: z.string().regex(/^[a-z0-9_-]{0,60}$/).default(""),
  weightGrams: z.number().int().min(0).max(1_000_000).nullable().default(null),
  barcode: short(40).default(""),
  /** Repère du produit de la boutique d'origine (contenu par produit du thème : `contentTarget`). */
  contentTarget: z.string().max(120).optional(),
});
export type ProductData = z.infer<typeof productDataSchema>;

export const variantSchema = z.object({
  options: z.array(short(60)).max(3).default([]),
  sku: short(64).default(""),
  price: cents.default(null),
  compareAt: cents.default(null),
  /** Stock suivi (null : non suivi, toujours disponible). */
  stock: z.number().int().min(-100_000).max(10_000_000).nullable().default(null),
  /** Vente quand le stock est épuisé : refusée (« deny ») ou permise (« continue »). */
  stockPolicy: z.enum(["deny", "continue"]).default("deny"),
  image: z.string().max(40).nullable().default(null),
  barcode: short(40).default(""),
  weightGrams: z.number().int().min(0).max(1_000_000).nullable().default(null),
});
export type VariantData = z.infer<typeof variantSchema>;

export type StudioVariant = VariantData & { id: string; productId: string; position: number; version: number; updatedAt: number };
export type StudioProduct = { id: string; projectId: string; handle: string; status: ProductStatus; position: number; version: number; data: ProductData; variants: StudioVariant[]; createdAt: number; updatedAt: number };

let ready = false;
/** Tables créées à la première utilisation (même principe que les rendez-vous). */
export function ensureProductTables() {
  if (ready) return;
  run(`CREATE TABLE IF NOT EXISTS studio_products (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, handle TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', position INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 1,
    data_json TEXT NOT NULL DEFAULT '{}', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`);
  run("CREATE UNIQUE INDEX IF NOT EXISTS studio_products_handle ON studio_products(project_id, handle)");
  run(`CREATE TABLE IF NOT EXISTS studio_variants (
    id TEXT PRIMARY KEY, product_id TEXT NOT NULL REFERENCES studio_products(id) ON DELETE CASCADE, project_id TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0, option_key TEXT NOT NULL, sku TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1,
    data_json TEXT NOT NULL DEFAULT '{}', updated_at INTEGER NOT NULL)`);
  run("CREATE UNIQUE INDEX IF NOT EXISTS studio_variants_key ON studio_variants(product_id, option_key)");
  run("CREATE UNIQUE INDEX IF NOT EXISTS studio_variants_sku ON studio_variants(project_id, sku) WHERE sku != ''");
  // Correspondances avec les boutiques connectées : un produit ou une variante du studio ↔ son identifiant distant.
  // Stock et empreinte du dernier envoi : base des règles de synchronisation (une vente faite dans la boutique est reprise dans le calcul).
  run(`CREATE TABLE IF NOT EXISTS product_links (
    project_id TEXT NOT NULL, platform TEXT NOT NULL, store TEXT NOT NULL, kind TEXT NOT NULL, local_id TEXT NOT NULL,
    remote_id TEXT NOT NULL, remote_parent TEXT, synced_hash TEXT, synced_stock INTEGER, synced_at INTEGER NOT NULL,
    PRIMARY KEY (project_id, platform, store, kind, local_id))`);
  run("CREATE UNIQUE INDEX IF NOT EXISTS product_links_remote ON product_links(project_id, platform, store, kind, remote_id)");
  ready = true;
}

const optionKey = (values: string[]) => JSON.stringify(values.map((v) => v.trim().toLowerCase()));

type ProductRow = { id: string; project_id: string; handle: string; status: ProductStatus; position: number; version: number; data_json: string; created_at: number; updated_at: number };
type VariantRow = { id: string; product_id: string; position: number; version: number; data_json: string; updated_at: number };

const toVariant = (r: VariantRow): StudioVariant => ({ ...variantSchema.parse(json(r.data_json, {})), id: r.id, productId: r.product_id, position: r.position, version: r.version, updatedAt: r.updated_at });
function toProduct(r: ProductRow): StudioProduct {
  const variants = all<VariantRow>("SELECT * FROM studio_variants WHERE product_id = ? ORDER BY position, id", r.id).map(toVariant);
  return { id: r.id, projectId: r.project_id, handle: r.handle, status: r.status, position: r.position, version: r.version, data: productDataSchema.parse(json(r.data_json, {})), variants, createdAt: r.created_at, updatedAt: r.updated_at };
}

export function listProducts(projectId: string, opts: { includeArchived?: boolean } = {}): StudioProduct[] {
  ensureProductTables();
  return all<ProductRow>(`SELECT * FROM studio_products WHERE project_id = ? ${opts.includeArchived ? "" : "AND status != 'archived'"} ORDER BY position, created_at`, projectId).map(toProduct);
}
export function getProduct(projectId: string, productId: string): StudioProduct {
  ensureProductTables();
  const r = one<ProductRow>("SELECT * FROM studio_products WHERE id = ? AND project_id = ?", productId, projectId);
  if (!r) throw new HttpError(404, L("Produit introuvable.", "Product not found."));
  return toProduct(r);
}
export const hasStudioProducts = (projectId: string) => (ensureProductTables(), !!one("SELECT 1 FROM studio_products WHERE project_id = ? LIMIT 1", projectId));

/** Photos et variantes : uniquement des médias de CE projet. */
function assertAssets(projectId: string, ids: string[], known: Set<string> = new Set()) {
  // Photos déjà présentes sur la fiche (reprises de la boutique du projet) : gardées telles quelles.
  for (const a of new Set(ids.filter((x) => x && !known.has(x)))) if (!one("SELECT 1 FROM assets WHERE id = ? AND project_id = ?", a, projectId)) throw new HttpError(400, L("Une photo ne fait pas partie des médias de ce projet.", "A photo is not part of this project's media."));
}
function uniqueHandle(projectId: string, wanted: string, exceptId = "") {
  const base = slugify(wanted).slice(0, 80) || "produit";
  for (let i = 1; ; i++) {
    const h = i === 1 ? base : `${base}-${i}`;
    if (!one("SELECT 1 FROM studio_products WHERE project_id = ? AND handle = ? AND id != ?", projectId, h, exceptId)) return h;
  }
}
function assertSkus(projectId: string, variants: { id?: string; sku: string }[], productId = "") {
  const seen = new Set<string>();
  for (const v of variants) {
    if (!v.sku) continue;
    if (seen.has(v.sku)) throw new HttpError(409, L(`La référence « ${v.sku} » est utilisée deux fois.`, `SKU "${v.sku}" is used twice.`));
    seen.add(v.sku);
    const other = one<{ id: string }>("SELECT id FROM studio_variants WHERE project_id = ? AND sku = ?", projectId, v.sku);
    if (other && other.id !== v.id && !one("SELECT 1 FROM studio_variants WHERE id = ? AND product_id = ?", other.id, productId)) throw new HttpError(409, L(`La référence « ${v.sku} » existe déjà dans un autre produit.`, `SKU "${v.sku}" already exists on another product.`));
  }
}

/** Combinaisons des options (produit sans option : une seule variante). */
export function combinations(options: ProductData["options"]): string[][] {
  return options.reduce<string[][]>((acc, o) => acc.flatMap((c) => o.values.map((v) => [...c, v])), [[]]);
}

/**
 * Variantes alignées sur les options : une combinaison existante garde sa ligne (référence, prix, stock), une nouvelle
 * en crée une (prix du produit, stock non suivi), une combinaison retirée disparaît.
 */
function syncVariantRows(projectId: string, productId: string, data: ProductData, patches: (Partial<VariantData> & { options: string[] })[] = []) {
  const existing = new Map(all<VariantRow & { option_key: string }>("SELECT * FROM studio_variants WHERE product_id = ?", productId).map((r) => [r.option_key, r]));
  const byKey = new Map(patches.map((p) => [optionKey(p.options), p]));
  const combos = combinations(data.options);
  const keep = new Set<string>();
  const rows = combos.map((c, i) => {
    const key = optionKey(c);
    keep.add(key);
    const old = existing.get(key);
    const base = old ? variantSchema.parse(json(old.data_json, {})) : variantSchema.parse({ options: c });
    const merged = variantSchema.parse({ ...base, ...(byKey.get(key) ?? {}), options: c });
    return { id: old?.id, key, position: i, data: merged, changed: !old || JSON.stringify(base) !== JSON.stringify(merged) || old.position !== i };
  });
  assertSkus(projectId, rows.map((r) => ({ id: r.id, sku: r.data.sku })), productId);
  const known = new Set([...data.images.map((i) => i.assetId), ...[...existing.values()].map((r) => variantSchema.parse(json(r.data_json, {})).image ?? "")]);
  assertAssets(projectId, rows.map((r) => r.data.image ?? ""), known);
  for (const [key, r] of existing) if (!keep.has(key)) run("DELETE FROM studio_variants WHERE id = ?", r.id);
  // Références libérées avant d'être réattribuées (échange de SKU entre deux variantes).
  for (const r of rows) if (r.id && r.changed) run("UPDATE studio_variants SET sku = '' WHERE id = ?", r.id);
  for (const r of rows) {
    if (r.id) run("UPDATE studio_variants SET position = ?, sku = ?, data_json = ?, version = version + ?, updated_at = ? WHERE id = ?", r.position, r.data.sku, JSON.stringify(r.data), r.changed ? 1 : 0, now(), r.id);
    else run("INSERT INTO studio_variants (id, product_id, project_id, position, option_key, sku, data_json, updated_at) VALUES (?,?,?,?,?,?,?,?)", newId(), productId, projectId, r.position, r.key, r.data.sku, JSON.stringify(r.data), now());
  }
}

export type ProductInput = Partial<ProductData> & { handle?: string; status?: ProductStatus; variants?: (Partial<VariantData> & { options: string[] })[] };

export function createProduct(projectId: string, input: ProductInput): StudioProduct {
  ensureProductTables();
  const data = productDataSchema.parse(input);
  if (!data.title) throw new HttpError(400, L("Donnez un nom au produit.", "Give the product a name."));
  assertAssets(projectId, data.images.map((i) => i.assetId));
  const id = newId();
  tx(() => {
    const position = (one<{ n: number }>("SELECT COALESCE(MAX(position), -1) + 1 AS n FROM studio_products WHERE project_id = ?", projectId)?.n ?? 0);
    run("INSERT INTO studio_products (id, project_id, handle, status, position, data_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)", id, projectId, uniqueHandle(projectId, input.handle || data.title), input.status ?? "active", position, JSON.stringify(data), now(), now());
    syncVariantRows(projectId, id, data, input.variants);
  });
  return getProduct(projectId, id);
}

/**
 * Modification d'une fiche. `version` (facultatif) protège d'une modification faite entre-temps dans un autre onglet
 * ou par une synchronisation : refus clair au lieu d'écraser.
 */
export function updateProduct(projectId: string, productId: string, input: ProductInput & { version?: number }): StudioProduct {
  ensureProductTables();
  return tx(() => {
    const cur = getProduct(projectId, productId);
    if (input.version !== undefined && input.version !== cur.version) throw new HttpError(409, L("Ce produit a été modifié entre-temps : rechargez la fiche.", "This product was changed in the meantime: reload it."), "stale_product");
    const { handle, status, variants, version: _v, ...patch } = input;
    const data = productDataSchema.parse({ ...cur.data, ...patch });
    if (!data.title) throw new HttpError(400, L("Donnez un nom au produit.", "Give the product a name."));
    assertAssets(projectId, data.images.map((i) => i.assetId), new Set(cur.data.images.map((i) => i.assetId)));
    run("UPDATE studio_products SET handle = ?, status = ?, data_json = ?, version = version + 1, updated_at = ? WHERE id = ?", handle ? uniqueHandle(projectId, handle, productId) : cur.handle, status ?? cur.status, JSON.stringify(data), now(), productId);
    syncVariantRows(projectId, productId, data, variants);
    return getProduct(projectId, productId);
  });
}

/** Stock d'une variante (vente, réception, synchronisation) : seule la quantité change. */
export function setVariantStock(projectId: string, variantId: string, stock: number | null) {
  ensureProductTables();
  const r = one<VariantRow>("SELECT * FROM studio_variants WHERE id = ? AND project_id = ?", variantId, projectId);
  if (!r) throw new HttpError(404, L("Variante introuvable.", "Variant not found."));
  const d = { ...variantSchema.parse(json(r.data_json, {})), stock };
  run("UPDATE studio_variants SET data_json = ?, version = version + 1, updated_at = ? WHERE id = ?", JSON.stringify(d), now(), variantId);
}

export function moveProduct(projectId: string, productId: string, dir: "up" | "down") {
  const list = listProducts(projectId, { includeArchived: true });
  const i = list.findIndex((p) => p.id === productId);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  tx(() => list.forEach((p, k) => run("UPDATE studio_products SET position = ? WHERE id = ?", k, p.id)));
}

/** Archivage (jamais d'effacement : les correspondances avec les boutiques restent connues). */
export const archiveProduct = (projectId: string, productId: string) => updateProduct(projectId, productId, { status: "archived" });

// ─── Reprise des produits de la boutique ────────────────────────────────────────────────────────────────────────────

/**
 * Première ouverture du catalogue : reprend les produits que la boutique montre déjà (titre, description, photos sous
 * leurs noms de fichiers, options, variantes, prix, stock, référence). Rien n'est repris deux fois.
 */
export function seedFromTheme(projectId: string, spec?: ThemeSpec): StudioProduct[] {
  ensureProductTables();
  const s = spec ?? currentTheme(projectId)?.spec;
  if (!s || s.store.business === "services" || hasStudioProducts(projectId)) return listProducts(projectId);
  const cats = new Map<string, string[]>();
  for (const c of s.store.collections ?? []) for (const h of c.products) cats.set(h, [...(cats.get(h) ?? []), c.title]);
  // Photos : celles que le thème du projet montre déjà (même fichier, même média), dans l'ordre de la galerie.
  const owned = (aid: string | undefined) => !!aid;
  tx(() => {
    if (hasStudioProducts(projectId)) return;
    for (const p of storeProducts(s)) {
      const single = !p.options.length || (p.variants.length === 1 && p.variants[0].title === "Default Title");
      const options = single ? [] : p.options.map((name, i) => ({ name, values: [...new Set(p.variants.map((v) => v.options[i]).filter(Boolean))] })).filter((o) => o.values.length);
      const images = p.images.filter((f) => owned(s.files[f])).map((f) => ({ assetId: s.files[f], file: f, alt: p.imageInfo?.[f]?.alt ?? "" }));
      const data = productDataSchema.parse({
        title: p.title || p.handle, description_html: p.description_html, vendor: p.vendor, categories: cats.get(p.handle) ?? [], tags: p.tags, images,
        price: p.price, compareAt: p.compare_at_price, currency: /^[A-Z]{3}$/.test(p.currency) ? p.currency : "EUR", options,
        seo: p.seo ?? { title: "", description: "" }, templateSuffix: p.template_suffix ?? "", contentTarget: p.contentTarget,
      });
      const id = newId();
      const position = one<{ n: number }>("SELECT COALESCE(MAX(position), -1) + 1 AS n FROM studio_products WHERE project_id = ?", projectId)?.n ?? 0;
      run("INSERT INTO studio_products (id, project_id, handle, status, position, data_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)", id, projectId, uniqueHandle(projectId, p.handle || p.title), "active", position, JSON.stringify(data), now(), now());
      const seenSku = new Set<string>();
      syncVariantRows(projectId, id, data, p.variants.map((v) => {
        const sku = v.sku?.trim() && !seenSku.has(v.sku.trim()) && !one("SELECT 1 FROM studio_variants WHERE project_id = ? AND sku = ?", projectId, v.sku.trim()) ? v.sku.trim() : "";
        if (sku) seenSku.add(sku);
        return { options: single ? [] : v.options, sku, price: v.price, stock: typeof v.inventory_quantity === "number" ? v.inventory_quantity : null, image: v.image && images.some((i) => i.file === v.image) ? s.files[v.image] : null };
      }));
    }
  });
  return listProducts(projectId);
}

// ─── Injection dans la boutique (aperçu, export, envoi) ─────────────────────────────────────────────────────────────

const ext = (mime: string) => (mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : mime === "image/svg+xml" ? "svg" : "jpg");
const mimeOf = (assetId: string) => one<{ mime: string }>("SELECT mime FROM assets WHERE id = ?", assetId)?.mime ?? "image/jpeg";
/** Nom du fichier d'une photo dans le thème : celui d'origine (produit repris), sinon un nom stable. */
export const productFileName = (img: { assetId: string; file?: string }) => img.file || `es-prod-${img.assetId}.${ext(mimeOf(img.assetId))}`;

/** Fiche du studio → produit de la boutique (forme lue par le thème et par tous les exports). */
export function toStoreProduct(p: StudioProduct, base?: StoreProduct): { product: StoreProduct; files: Record<string, string> } {
  const files: Record<string, string> = {};
  const d = p.data;
  const images = d.images.map((i) => { const f = productFileName(i); files[f] = i.assetId; return f; });
  const fileOf = (aid: string | null) => { if (!aid) return undefined; const img = d.images.find((i) => i.assetId === aid); const f = img ? productFileName(img) : productFileName({ assetId: aid }); files[f] = aid; return f; };
  const variants = p.variants.length ? p.variants : [{ ...variantSchema.parse({}), id: "", productId: p.id, position: 0, version: 1, updatedAt: 0 }];
  return {
    files,
    product: {
      ...(base ?? {}),
      contentTarget: d.contentTarget ?? base?.contentTarget,
      title: d.title, handle: p.handle, vendor: d.vendor, description_html: d.description_html,
      price: d.price ?? variants[0].price ?? null, compare_at_price: d.compareAt, currency: d.currency,
      options: d.options.map((o) => o.name),
      variants: variants.map((v) => ({
        title: v.options.length ? v.options.join(" / ") : "Default Title", options: v.options, price: v.price ?? d.price,
        available: v.stock === null || v.stock > 0 || v.stockPolicy === "continue", ...(v.stock !== null ? { inventory_quantity: v.stock } : {}),
        ...(v.sku ? { sku: v.sku } : {}), ...(fileOf(v.image) ? { image: fileOf(v.image) } : {}),
      })),
      images,
      // Dimensions connues du thème gardées ; description de la photo saisie au Studio (sinon celle du thème).
      ...(() => {
        const info = Object.fromEntries(d.images.flatMap((i) => { const f = productFileName(i); const b = base?.imageInfo?.[f]; return b ? [[f, { ...b, alt: i.alt || b.alt }]] : i.alt ? [[f, { width: 1600, height: 2000, alt: i.alt }]] : []; }));
        return Object.keys(info).length ? { imageInfo: info } : { imageInfo: undefined };
      })(),
      tags: d.tags,
      ...(d.seo.title || d.seo.description ? { seo: d.seo } : {}),
      ...(d.templateSuffix ? { template_suffix: d.templateSuffix } : { template_suffix: undefined }),
    },
  };
}

/**
 * Copie du thème avec les produits du Studio (aperçu, export, envoi) ; le thème enregistré n'est jamais modifié.
 * Projet sans fiche produit : le thème est rendu tel quel. Site de services : aucun produit n'est joint.
 */
export function withStudioProducts(spec: ThemeSpec, projectId: string, previewDraft?: StudioProduct): ThemeSpec {
  if(previewDraft&&(previewDraft.projectId!==projectId||previewDraft.status!=='draft'))throw new HttpError(400,L('Aperçu de brouillon invalide.','Invalid draft preview.'));
  if (spec.store.business === "services" || !previewDraft&&!hasStudioProducts(projectId)) return spec;
  const list = listProducts(projectId).filter((p) => p.status === "active");
  if (!list.length&&!previewDraft) return spec;
  const bases = new Map(storeProducts(spec).map((p) => [p.handle, p]));
  const files: Record<string, string> = {};
  const products = list.map((p) => { const r = toStoreProduct(p, bases.get(p.handle)); Object.assign(files, r.files); return r.product; });
  // Le brouillon n'entre QUE dans cette copie privée de rendu. Sans produit actif, garder la boutique d'origine.
  if(previewDraft){if(!products.length)products.push(...storeProducts(spec));const draft=toStoreProduct(previewDraft,bases.get(previewDraft.handle));Object.assign(files,draft.files);const index=products.findIndex(p=>p.handle===draft.product.handle);if(index<0)products.push(draft.product);else products[index]=draft.product;list.push(previewDraft);}
  const handles = new Set(products.map((p) => p.handle));
  // Collections du thème gardées (produits disparus retirés) ; une catégorie sans collection en devient une.
  const collections: StoreCollection[] = (spec.store.collections ?? []).map((c) => ({ ...c, products: c.products.filter((h) => handles.has(h)) }));
  for (const p of list) for (const cat of p.data.categories) {
    let c = collections.find((x) => x.title.toLowerCase() === cat.toLowerCase());
    if (!c) collections.push((c = { handle: slugify(cat) || `categorie-${collections.length + 1}`, title: cat, description: "", products: [] }));
    if (!c.products.includes(p.handle)) c.products.push(p.handle);
  }
  return { ...spec, files: { ...spec.files, ...files }, store: { ...spec.store, product: products[0], products: products.slice(1), collections } };
}

// ─── Correspondances avec les boutiques ─────────────────────────────────────────────────────────────────────────────

export type ProductLink = { project_id: string; platform: string; store: string; kind: "product" | "variant"; local_id: string; remote_id: string; remote_parent: string | null; synced_hash: string | null; synced_stock: number | null; synced_at: number };
export function linksOf(projectId: string, platform?: string, store?: string): ProductLink[] {
  ensureProductTables();
  return all<ProductLink>(`SELECT * FROM product_links WHERE project_id = ? ${platform ? "AND platform = ?" : ""} ${store ? "AND store = ?" : ""}`, projectId, ...[platform, store].filter(Boolean));
}
export function findLink(projectId: string, platform: string, store: string, kind: "product" | "variant", localId: string): ProductLink | undefined {
  ensureProductTables();
  return one<ProductLink>("SELECT * FROM product_links WHERE project_id = ? AND platform = ? AND store = ? AND kind = ? AND local_id = ?", projectId, platform, store, kind, localId);
}
export function findByRemote(projectId: string, platform: string, store: string, kind: "product" | "variant", remoteId: string): ProductLink | undefined {
  ensureProductTables();
  return one<ProductLink>("SELECT * FROM product_links WHERE project_id = ? AND platform = ? AND store = ? AND kind = ? AND remote_id = ?", projectId, platform, store, kind, remoteId);
}
export function saveLink(l: Omit<ProductLink, "synced_at">) {
  ensureProductTables();
  run("DELETE FROM product_links WHERE project_id = ? AND platform = ? AND store = ? AND kind = ? AND remote_id = ? AND local_id != ?", l.project_id, l.platform, l.store, l.kind, l.remote_id, l.local_id);
  run(`INSERT INTO product_links (project_id, platform, store, kind, local_id, remote_id, remote_parent, synced_hash, synced_stock, synced_at) VALUES (?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT (project_id, platform, store, kind, local_id) DO UPDATE SET remote_id = excluded.remote_id, remote_parent = excluded.remote_parent, synced_hash = excluded.synced_hash, synced_stock = excluded.synced_stock, synced_at = excluded.synced_at`,
  l.project_id, l.platform, l.store, l.kind, l.local_id, l.remote_id, l.remote_parent, l.synced_hash, l.synced_stock, now());
}
export const dropLink = (projectId: string, platform: string, store: string, kind: string, localId: string) => run("DELETE FROM product_links WHERE project_id = ? AND platform = ? AND store = ? AND kind = ? AND local_id = ?", projectId, platform, store, kind, localId);
