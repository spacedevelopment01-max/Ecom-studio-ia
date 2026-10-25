/**
 * Synchronisation des produits du Studio avec une boutique connectée (mission #190, point 5).
 *
 * Règles (vérifiées par tests/produits-studio-190.test.ts et l'essai réel sur les boutiques de test) :
 *  - Correspondances conservées (product_links) : un produit déjà envoyé est MIS À JOUR, jamais recréé. Sans
 *    correspondance, un produit de la boutique de même identifiant (handle) ou de même référence (SKU) est relié
 *    au lieu d'être dupliqué.
 *  - Stock à trois points (dernier stock synchronisé S, stock du studio L, stock de la boutique R) : une vente ou une
 *    modification faite dans la boutique (R ≠ S) n'est jamais écrasée. Les deux changements s'additionnent
 *    (nouveau stock = R + (L − S)) ; si seul le studio a changé, son stock est envoyé ; si seule la boutique a changé,
 *    le studio reprend son stock.
 *  - Contenu (nom, description, prix, options, catégories…) : le studio en est la source ; il n'est renvoyé que s'il a
 *    changé depuis le dernier envoi. Photos renvoyées seulement si elles ont changé (pas de doublons dans la
 *    médiathèque de la boutique) ; un produit relié qui existait déjà garde ses photos.
 *  - Import des produits existants de la boutique : créés dans le studio (photos comprises quand elles sont
 *    lisibles), reliés aussitôt ; un produit déjà relié ou de même référence n'est jamais importé deux fois.
 */
import { createHash } from "node:crypto";
import { all, id as newId, json, now, one, run } from "../db";
import { decrypt, encrypt } from "../secrets";
import { HttpError } from "../auth";
import { L } from "../i18n-server";
import { assetData, getAsset, saveAsset } from "../library";
import { isPublicAppUrl, publicMediaUrl } from "../public-url";
import { createProduct, findByRemote, findLink, linksOf, listProducts, productFileName, saveLink, setVariantStock, type StudioProduct } from "./catalog";
import { wooConnector } from "./connectors/woocommerce";
import { prestaConnector } from "./connectors/prestashop";
import { shopifyConnector } from "./connectors/shopify";
import { assertStoreUrl, StoreApiError, type Platform, type PushProduct, type RemoteProduct, type StoreConnector } from "./connectors/types";

export const PLATFORMS: Platform[] = ["shopify", "woocommerce", "prestashop"];

// ─── Boutiques connectées (clés chiffrées) ──────────────────────────────────────────────────────────────────────────

let ready = false;
function ensureStoresTable() {
  if (ready) return;
  run(`CREATE TABLE IF NOT EXISTS platform_stores (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, user_id TEXT NOT NULL,
    platform TEXT NOT NULL, url TEXT NOT NULL, store TEXT NOT NULL, credentials TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active',
    last_sync_at INTEGER, last_report TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`);
  run("CREATE UNIQUE INDEX IF NOT EXISTS platform_stores_one ON platform_stores(project_id, platform, store)");
  ready = true;
}
type StoreRow = { id: string; project_id: string; user_id: string; platform: Platform; url: string; store: string; credentials: string; status: string; last_sync_at: number | null; last_report: string | null; created_at: number; updated_at: number };
export type StoreView = { id: string; platform: Platform; url: string; store: string; status: string; lastSyncAt: number | null; lastReport: SyncReport | null; linked: number };

const view = (r: StoreRow): StoreView => ({ id: r.id, platform: r.platform, url: r.url, store: r.store, status: r.status, lastSyncAt: r.last_sync_at, lastReport: json(r.last_report, null), linked: linksOf(r.project_id, r.platform, r.store).filter((l) => l.kind === "product").length });
export function listStores(projectId: string): StoreView[] {
  ensureStoresTable();
  return all<StoreRow>("SELECT * FROM platform_stores WHERE project_id = ? ORDER BY created_at", projectId).map(view);
}
function storeRow(projectId: string, storeId: string): StoreRow {
  ensureStoresTable();
  const r = one<StoreRow>("SELECT * FROM platform_stores WHERE id = ? AND project_id = ?", storeId, projectId);
  if (!r) throw new HttpError(404, L("Boutique introuvable.", "Store not found."));
  return r;
}

export type StoreCredentialsInput = { platform: Platform; url: string; key?: string; secret?: string; token?: string };

/** Connecteur prêt à l'emploi (adresse contrôlée). `fetcher` : remplacé dans les tests. */
export async function makeConnector(c: StoreCredentialsInput, fetcher: typeof fetch = fetch): Promise<StoreConnector> {
  if (c.platform === "shopify") return shopifyConnector({ shop: c.url, token: c.token ?? "" }, fetcher);
  const u = await assertStoreUrl(c.url);
  const url = `${u.origin}${u.pathname.replace(/\/+$/, "")}`;
  if (c.platform === "woocommerce") return wooConnector({ url, key: c.key ?? "", secret: c.secret ?? "" }, fetcher);
  return prestaConnector({ url, key: c.key ?? "" }, fetcher);
}

/** Connexion d'une boutique : les accès sont essayés (lecture du catalogue) avant d'être enregistrés, chiffrés. */
export async function connectStore(projectId: string, userId: string, c: StoreCredentialsInput, fetcher: typeof fetch = fetch): Promise<StoreView> {
  ensureStoresTable();
  if (!PLATFORMS.includes(c.platform)) throw new HttpError(400, L("Plateforme inconnue.", "Unknown platform."));
  let conn: StoreConnector;
  try {
    conn = await makeConnector(c, fetcher);
    await conn.get("0").catch((e) => { if (e instanceof StoreApiError && (e.status === 401 || e.status === 403)) throw e; });
  } catch (e) { throw new HttpError(400, (e as Error).message); }
  const creds = encrypt(JSON.stringify({ key: c.key ?? "", secret: c.secret ?? "", token: c.token ?? "" }))!;
  const existing = one<{ id: string }>("SELECT id FROM platform_stores WHERE project_id = ? AND platform = ? AND store = ?", projectId, c.platform, conn.store);
  if (existing) run("UPDATE platform_stores SET url = ?, credentials = ?, status = 'active', user_id = ?, updated_at = ? WHERE id = ?", c.url.trim(), creds, userId, now(), existing.id);
  else run("INSERT INTO platform_stores (id, project_id, user_id, platform, url, store, credentials, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)", newId(), projectId, userId, c.platform, c.url.trim(), conn.store, creds, now(), now());
  return listStores(projectId).find((s) => s.platform === c.platform && s.store === conn.store)!;
}
export function disconnectStore(projectId: string, storeId: string) {
  storeRow(projectId, storeId);
  // Les correspondances restent : reconnecter la même boutique ne recrée aucun produit.
  run("DELETE FROM platform_stores WHERE id = ?", storeId);
}
export async function connectorOf(projectId: string, storeId: string, fetcher: typeof fetch = fetch): Promise<StoreConnector> {
  const r = storeRow(projectId, storeId);
  const creds = json<{ key: string; secret: string; token: string }>(decrypt(r.credentials), { key: "", secret: "", token: "" });
  return makeConnector({ platform: r.platform, url: r.url, ...creds }, fetcher);
}

// ─── Envoi ──────────────────────────────────────────────────────────────────────────────────────────────────────────

export type SyncLine = { product: string; title: string; action: "created" | "updated" | "linked" | "unchanged" | "error" | "imported"; remoteId?: string; stock: { variant: string; studio: number | null; store: number | null; result: number | null; rule: string }[]; warnings: string[]; error?: string };
export type SyncReport = { at: number; platform: Platform; store: string; lines: SyncLine[]; counts: Record<SyncLine["action"], number> };

const hash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0, 32);
const key = (vals: string[]) => vals.map((v) => v.trim().toLowerCase()).join("\u0000");

/** Adresse publique d'une photo (plateformes qui la téléchargent) : signée, valable 7 jours ; null sans studio public. */
export type ImageUrl = (assetId: string, file: string) => string | null;
export const defaultImageUrl: ImageUrl = (assetId, file) => (isPublicAppUrl() ? publicMediaUrl(assetId, file.split(".").pop() ?? "jpg", 7 * 24 * 3600) : null);

function contentOf(p: StudioProduct) {
  const d = p.data;
  return { handle: p.handle, status: p.status, title: d.title, description: d.description_html, vendor: d.vendor, type: d.productType, price: d.price, compareAt: d.compareAt, categories: d.categories, tags: d.tags, options: d.options, seo: d.seo, template: d.templateSuffix, weight: d.weightGrams, barcode: d.barcode, variants: p.variants.map((v) => [v.options, v.sku, v.price, v.compareAt, v.stockPolicy, v.weightGrams, v.barcode, v.image]) };
}

/** Décision de stock d'une variante (règle à trois points). */
export function stockDecision(studio: number | null, store: number | null | undefined, synced: number | null | undefined, linked: boolean): { push: number | null | undefined; result: number | null; rule: string } {
  if (store === undefined) return { push: studio, result: studio, rule: "new" };
  if (store === null) return { push: studio, result: studio, rule: studio === null ? "untracked" : "studio" };
  if (!linked || synced === null || synced === undefined) return { push: undefined, result: store, rule: "store-existing" };
  if (studio === null) return { push: undefined, result: store, rule: "store" };
  if (store !== synced && studio !== synced) { const merged = store + (studio - synced); return { push: merged, result: merged, rule: "merged" }; }
  if (store !== synced) return { push: undefined, result: store, rule: "store" };
  if (studio !== store) return { push: studio, result: studio, rule: "studio" };
  return { push: undefined, result: store, rule: "same" };
}

export async function syncProducts(projectId: string, conn: StoreConnector, opts: { productIds?: string[]; imageUrl?: ImageUrl } = {}): Promise<SyncReport> {
  const imageUrl = opts.imageUrl ?? defaultImageUrl;
  const products = listProducts(projectId).filter((p) => !opts.productIds || opts.productIds.includes(p.id));
  let remoteList: RemoteProduct[] | null = null;
  const remotes = async () => (remoteList ??= await conn.list());
  const lines: SyncLine[] = [];
  for (const p of products) {
    const line: SyncLine = { product: p.id, title: p.data.title, action: "unchanged", stock: [], warnings: [] };
    lines.push(line);
    try {
      const link = findLink(projectId, conn.platform, conn.store, "product", p.id);
      let remote = link ? await conn.get(link.remote_id) : null;
      let matched = false;
      if (!remote) {
        // Aucune correspondance (ou produit supprimé dans la boutique) : produit de même handle ou de même référence.
        const skus = new Set(p.variants.map((v) => v.sku).filter(Boolean));
        const taken = new Set(linksOf(projectId, conn.platform, conn.store).filter((l) => l.kind === "product" && l.local_id !== p.id).map((l) => l.remote_id));
        remote = (await remotes()).find((r) => !taken.has(r.id) && (r.handle === p.handle || r.variants.some((v) => v.sku && skus.has(v.sku)))) ?? null;
        matched = !!remote;
      }
      const synced = json<{ c?: string; i?: string }>(link?.synced_hash, {});
      const vlinks = new Map(p.variants.map((v) => [v.id, remote ? findLink(projectId, conn.platform, conn.store, "variant", v.id) : undefined]));
      const remoteVariant = (v: StudioProduct["variants"][number]) => {
        if (!remote) return undefined;
        const l = vlinks.get(v.id);
        return (l && remote.variants.find((x) => x.id === l.remote_id)) || (v.sku && remote.variants.find((x) => x.sku === v.sku)) || remote.variants.find((x) => key(x.options) === key(v.options)) || undefined;
      };
      const decisions = p.variants.map((v) => {
        const rv = remoteVariant(v);
        const vl = vlinks.get(v.id);
        const d = stockDecision(v.stock, rv ? rv.stock : undefined, vl?.synced_stock, !!vl && !!rv && vl.remote_id === rv.id);
        line.stock.push({ variant: v.options.join(" / ") || p.data.title, studio: v.stock, store: rv ? rv.stock : null, result: d.result, rule: d.rule });
        return { v, rv, d };
      });
      const c = hash(contentOf(p));
      const imgs = hash(p.data.images.map((i) => i.assetId));
      const sendImages = !remote || (!matched && synced.i !== imgs) || (matched && !remote.images.length);
      const push: PushProduct = {
        localId: p.id, handle: p.handle, title: p.data.title, description_html: p.data.description_html, vendor: p.data.vendor, productType: p.data.productType,
        status: p.status === "active" ? "active" : "draft", price: p.data.price, compareAt: p.data.compareAt, currency: p.data.currency, categories: p.data.categories, tags: p.data.tags,
        options: p.data.options, seo: p.data.seo, templateSuffix: p.data.templateSuffix, weightGrams: p.data.weightGrams, barcode: p.data.barcode,
        variants: decisions.map(({ v, rv, d }) => ({ localId: v.id, remoteId: rv?.id, sku: v.sku, options: v.options, price: v.price ?? p.data.price, compareAt: v.compareAt ?? p.data.compareAt, stock: d.push, stockPolicy: v.stockPolicy, weightGrams: v.weightGrams, barcode: v.barcode, image: v.image })),
        images: sendImages ? p.data.images.map((i) => { const a = getAsset(i.assetId); const name = productFileName(i); return { assetId: i.assetId, name, mime: a?.mime ?? "image/jpeg", alt: i.alt || p.data.title, data: () => (a ? assetData(a) : Buffer.alloc(0)), url: imageUrl(i.assetId, name) }; }) : null,
      };
      const stockToPush = decisions.some((x) => x.d.push !== undefined && x.d.push !== (x.rv ? x.rv.stock : undefined));
      const structure = remote && (remote.variants.length !== p.variants.length || decisions.some((x) => !x.rv));
      let result: { id: string; variants: { localId: string; id: string }[]; warnings: string[] } | null = null;
      if (!remote) { result = await conn.create(push); line.action = "created"; }
      else if (matched || synced.c !== c || stockToPush || structure || sendImages) { result = await conn.update(remote.id, push); line.action = matched ? "linked" : "updated"; }
      const remoteId = result?.id ?? remote!.id;
      line.remoteId = remoteId;
      line.warnings.push(...(result?.warnings ?? []));
      // Le studio reprend le stock retenu (vente ou modification dans la boutique), puis les correspondances sont gardées.
      for (const { v, d } of decisions) if (d.result !== v.stock && d.result !== null) setVariantStock(projectId, v.id, d.result);
      saveLink({ project_id: projectId, platform: conn.platform, store: conn.store, kind: "product", local_id: p.id, remote_id: remoteId, remote_parent: null, synced_hash: JSON.stringify({ c, i: imgs }), synced_stock: null });
      for (const { v, rv, d } of decisions) {
        const rid = result?.variants.find((x) => x.localId === v.id)?.id ?? rv?.id;
        if (rid) saveLink({ project_id: projectId, platform: conn.platform, store: conn.store, kind: "variant", local_id: v.id, remote_id: rid, remote_parent: remoteId, synced_hash: null, synced_stock: d.result });
      }
    } catch (e) {
      line.action = "error";
      line.error = (e as Error).message;
    }
  }
  return finish(projectId, conn, lines);
}

function finish(projectId: string, conn: StoreConnector, lines: SyncLine[]): SyncReport {
  const counts = { created: 0, updated: 0, linked: 0, unchanged: 0, error: 0, imported: 0 } as SyncReport["counts"];
  for (const l of lines) counts[l.action]++;
  const report: SyncReport = { at: now(), platform: conn.platform, store: conn.store, lines, counts };
  ensureStoresTable();
  run("UPDATE platform_stores SET last_sync_at = ?, last_report = ?, updated_at = ? WHERE project_id = ? AND platform = ? AND store = ?", report.at, JSON.stringify(report), now(), projectId, conn.platform, conn.store);
  return report;
}

// ─── Import des produits existants ──────────────────────────────────────────────────────────────────────────────────

/** Lecture d'une photo de la boutique : renvoie null si elle n'est pas lisible (rien n'est inventé à la place). */
export type ImageReader = (url: string) => Promise<{ data: Buffer; mime: string } | null>;

export async function importFromStore(projectId: string, userId: string, conn: StoreConnector, opts: { readImage?: ImageReader } = {}): Promise<SyncReport> {
  const lines: SyncLine[] = [];
  const local = listProducts(projectId, { includeArchived: true });
  for (const r of await conn.list()) {
    const line: SyncLine = { product: "", title: r.title, action: "unchanged", remoteId: r.id, stock: [], warnings: [] };
    try {
      const linked = findByRemote(projectId, conn.platform, conn.store, "product", r.id);
      const skus = new Set(r.variants.map((v) => v.sku).filter(Boolean));
      const same = linked ? local.find((p) => p.id === linked.local_id) : local.find((p) => p.handle === r.handle || p.variants.some((v) => v.sku && skus.has(v.sku)));
      if (same) {
        // Déjà dans le studio : relié, rien n'est importé deux fois (le stock suivra la prochaine synchronisation).
        line.product = same.id;
        if (!linked) { saveLink({ project_id: projectId, platform: conn.platform, store: conn.store, kind: "product", local_id: same.id, remote_id: r.id, remote_parent: null, synced_hash: null, synced_stock: null }); line.action = "linked"; }
        lines.push(line);
        continue;
      }
      const images: { assetId: string; alt: string }[] = [];
      for (const [i, url] of r.images.slice(0, 10).entries()) {
        const img = await (conn.readImage ? conn.readImage(url) : opts.readImage?.(url) ?? Promise.resolve(null)).catch(() => null);
        if (!img) { line.warnings.push(L(`Photo ${i + 1} non lue : à ajouter dans le studio.`, `Photo ${i + 1} not read: add it in the studio.`)); continue; }
        const a = await saveAsset({ projectId, userId, data: img.data, name: `${r.handle || "produit"}-${i + 1}.${img.mime === "image/png" ? "png" : img.mime === "image/webp" ? "webp" : "jpg"}`, mime: img.mime, role: "catalog-original", folderKey: "product.catalog", origin: "import", meta: { source: url, platform: conn.platform, store: conn.store } });
        images.push({ assetId: a.id, alt: r.title });
      }
      const p = createProduct(projectId, {
        title: r.title, handle: r.handle, description_html: r.description_html, status: r.status === "active" || r.status === "publish" ? "active" : "draft",
        price: r.price, compareAt: r.compareAt, categories: r.categories.slice(0, 20), tags: r.tags.slice(0, 40), images, options: r.options.filter((o) => o.values.length),
        variants: r.variants.map((v) => ({ options: r.simple ? [] : v.options, sku: v.sku && !one("SELECT 1 FROM studio_variants WHERE project_id = ? AND sku = ?", projectId, v.sku) ? v.sku : "", price: v.price, stock: v.stock })),
      });
      local.push(p);
      line.product = p.id;
      line.action = "imported";
      saveLink({ project_id: projectId, platform: conn.platform, store: conn.store, kind: "product", local_id: p.id, remote_id: r.id, remote_parent: null, synced_hash: JSON.stringify({ c: hash(contentOf(p)), i: hash(p.data.images.map((i) => i.assetId)) }), synced_stock: null });
      for (const v of p.variants) {
        const rv = r.simple ? r.variants[0] : r.variants.find((x) => key(x.options) === key(v.options));
        if (rv) saveLink({ project_id: projectId, platform: conn.platform, store: conn.store, kind: "variant", local_id: v.id, remote_id: rv.id, remote_parent: r.id, synced_hash: null, synced_stock: rv.stock });
      }
    } catch (e) {
      line.action = "error";
      line.error = (e as Error).message;
    }
    lines.push(line);
  }
  return finish(projectId, conn, lines);
}

export async function syncStore(projectId: string, storeId: string, opts: { productIds?: string[]; imageUrl?: ImageUrl; fetcher?: typeof fetch } = {}) {
  return syncProducts(projectId, await connectorOf(projectId, storeId, opts.fetcher), opts);
}
