/**
 * WooCommerce — API REST v3 (`/wp-json/wc/v3`), clé « consumer key / secret » en lecture-écriture créée par le
 * marchand (WooCommerce › Réglages › Avancé › API REST). Produit sans option : produit simple ; avec options : produit
 * variable et ses déclinaisons. Prix barré : `regular_price` (prix barré) + `sale_price` (prix de vente).
 * Photos : WooCommerce les télécharge lui-même depuis une adresse publique (`images[].src`) ; sans adresse publique
 * du studio, elles ne sont pas envoyées et le rapport le dit.
 */
import { L } from "../../i18n-server";
import { euros, StoreApiError, toCents, type PushProduct, type PushResult, type RemoteProduct, type StoreConnector } from "./types";

export type WooCredentials = { url: string; key: string; secret: string };

export function wooConnector(c: WooCredentials, fetcher: typeof fetch = fetch): StoreConnector {
  const base = c.url.replace(/\/+$/, "");
  const auth = "Basic " + Buffer.from(`${c.key}:${c.secret}`).toString("base64");
  async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
    const r = await fetcher(`${base}/wp-json/wc/v3${path}`, { method, headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await r.text();
    let j: any = null;
    try { j = text ? JSON.parse(text) : null; } catch { /* réponse non JSON */ }
    if (r.status === 401 || r.status === 403) throw new StoreApiError("woocommerce", r.status, L("WooCommerce refuse la clé d'API (droits lecture-écriture requis).", "WooCommerce rejected the API key (read/write access required)."));
    if (!r.ok) throw new StoreApiError("woocommerce", r.status, L(`WooCommerce : ${j?.message ?? text.slice(0, 200)}`, `WooCommerce: ${j?.message ?? text.slice(0, 200)}`));
    return j as T;
  }
  async function all<T = any>(path: string): Promise<T[]> {
    const out: T[] = [];
    for (let page = 1; page < 50; page++) {
      const batch = await api<T[]>("GET", `${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
      out.push(...batch);
      if (batch.length < 100) break;
    }
    return out;
  }
  const termCache = new Map<string, number>();
  async function termIds(kind: "categories" | "tags", names: string[]) {
    const ids: { id: number }[] = [];
    for (const name of names) {
      const k = `${kind}:${name.toLowerCase()}`;
      if (!termCache.has(k)) {
        const found = (await api<{ id: number; name: string }[]>("GET", `/products/${kind}?search=${encodeURIComponent(name)}&per_page=100`)).find((t) => t.name.toLowerCase() === name.toLowerCase());
        termCache.set(k, found?.id ?? (await api<{ id: number }>("POST", `/products/${kind}`, { name })).id);
      }
      ids.push({ id: termCache.get(k)! });
    }
    return ids;
  }
  const prices = (price: number | null, compareAt: number | null) => (compareAt !== null && price !== null && compareAt > price ? { regular_price: euros(compareAt), sale_price: euros(price) } : { regular_price: euros(price), sale_price: "" });
  const stock = (v: { stock: number | null | undefined; stockPolicy: string }) => (v.stock === undefined ? {} : v.stock === null ? { manage_stock: false } : { manage_stock: true, stock_quantity: v.stock, backorders: v.stockPolicy === "continue" ? "notify" : "no" });
  const weight = (g: number | null) => (g === null ? {} : { weight: String(g / 1000) });

  function toRemote(p: any, variations: any[]): RemoteProduct {
    const simple = p.type !== "variable";
    const attrs = (p.attributes ?? []).filter((a: any) => a.variation);
    const price = toCents(p.sale_price || p.regular_price || p.price);
    return {
      id: String(p.id), handle: p.slug, title: p.name, description_html: p.description ?? "", status: p.status, price,
      compareAt: p.sale_price ? toCents(p.regular_price) : null, categories: (p.categories ?? []).map((x: any) => x.name), tags: (p.tags ?? []).map((x: any) => x.name),
      images: (p.images ?? []).map((i: any) => i.src), options: simple ? [] : attrs.map((a: any) => ({ name: a.name, values: a.options })), simple,
      variants: simple
        ? [{ id: String(p.id), sku: p.sku ?? "", options: [], price, stock: p.manage_stock ? Number(p.stock_quantity ?? 0) : null }]
        : variations.map((v: any) => ({ id: String(v.id), sku: v.sku ?? "", options: attrs.map((a: any) => v.attributes.find((x: any) => x.name === a.name)?.option ?? ""), price: toCents(v.sale_price || v.regular_price || v.price), stock: v.manage_stock ? Number(v.stock_quantity ?? 0) : null })),
    };
  }

  async function body(p: PushProduct, warnings: string[]) {
    const simple = !p.options.length;
    const v0 = p.variants[0];
    if (p.images && p.images.some((i) => !i.url)) warnings.push(L("Photos non envoyées à WooCommerce : le studio n'a pas d'adresse publique HTTPS d'où les télécharger.", "Photos not sent to WooCommerce: the studio has no public HTTPS address to download them from."));
    const images = p.images?.every((i) => i.url) ? p.images.map((i) => ({ src: i.url!, name: i.name, alt: i.alt })) : undefined;
    return {
      name: p.title, slug: p.handle, type: simple ? "simple" : "variable", status: p.status === "active" ? "publish" : "draft",
      description: p.description_html, short_description: p.seo.description ? `<p>${p.seo.description}</p>` : "",
      categories: await termIds("categories", p.categories), tags: await termIds("tags", p.tags),
      ...(images ? { images } : {}),
      ...(simple ? { ...prices(v0?.price ?? p.price, v0?.compareAt ?? p.compareAt), sku: v0?.sku ?? "", ...(v0 ? stock(v0) : {}), ...weight(v0?.weightGrams ?? p.weightGrams) } : { attributes: p.options.map((o, i) => ({ name: o.name, position: i, visible: true, variation: true, options: o.values })) }),
    };
  }

  async function syncVariations(productId: string, p: PushProduct): Promise<{ localId: string; id: string }[]> {
    if (!p.options.length) return p.variants.map((v) => ({ localId: v.localId, id: productId }));
    const existing = await all<any>(`/products/${productId}/variations`);
    const known = new Set(existing.map((v) => String(v.id)));
    const payload = (v: PushProduct["variants"][number]) => ({ ...prices(v.price ?? p.price, v.compareAt ?? p.compareAt), sku: v.sku, ...stock(v), ...weight(v.weightGrams), attributes: p.options.map((o, i) => ({ name: o.name, option: v.options[i] })) });
    const update = p.variants.filter((v) => v.remoteId && known.has(v.remoteId)).map((v) => ({ id: Number(v.remoteId), ...payload(v) }));
    const create = p.variants.filter((v) => !v.remoteId || !known.has(v.remoteId));
    const keep = new Set(update.map((u) => String(u.id)));
    const del = existing.filter((v) => !keep.has(String(v.id))).map((v) => Number(v.id));
    const r = await api<{ create?: any[]; update?: any[] }>("POST", `/products/${productId}/variations/batch`, { create: create.map(payload), update, delete: del });
    const out = p.variants.filter((v) => v.remoteId && keep.has(v.remoteId)).map((v) => ({ localId: v.localId, id: v.remoteId! }));
    (r.create ?? []).forEach((x, i) => { if (x?.error) throw new StoreApiError("woocommerce", 400, L(`WooCommerce : ${x.error.message}`, `WooCommerce: ${x.error.message}`)); out.push({ localId: create[i].localId, id: String(x.id) }); });
    for (const x of r.update ?? []) if (x?.error) throw new StoreApiError("woocommerce", 400, L(`WooCommerce : ${x.error.message}`, `WooCommerce: ${x.error.message}`));
    return out;
  }

  return {
    platform: "woocommerce",
    store: new URL(base).host,
    async list() {
      const products = await all<any>("/products?status=any");
      return Promise.all(products.map(async (p) => toRemote(p, p.type === "variable" ? await all(`/products/${p.id}/variations`) : [])));
    },
    async get(id) {
      try {
        const p = await api("GET", `/products/${id}`);
        if (!p || p.status === "trash") return null;
        return toRemote(p, p.type === "variable" ? await all(`/products/${id}/variations`) : []);
      } catch (e) { if (e instanceof StoreApiError && e.status === 404) return null; throw e; }
    },
    async create(p) {
      const warnings: string[] = [];
      const created = await api<{ id: number }>("POST", "/products", await body(p, warnings));
      return { id: String(created.id), variants: await syncVariations(String(created.id), p), warnings };
    },
    async update(id, p) {
      const warnings: string[] = [];
      await api("PUT", `/products/${id}`, await body(p, warnings));
      return { id, variants: await syncVariations(id, p), warnings };
    },
  };
}

