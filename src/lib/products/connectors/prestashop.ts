/**
 * PrestaShop — webservice (`/api`), clé créée par le marchand (Paramètres avancés › Webservice) avec les droits sur
 * products, combinations, stock_availables, categories, images, product_options et product_option_values.
 * Produit sans option : produit standard ; avec options : déclinaisons (groupes d'attributs et valeurs créés s'ils
 * manquent). Prix envoyé tel quel, sans règle de taxe (le prix saisi au studio est le prix affiché).
 * Écriture en XML (PATCH : seuls les champs du studio changent, le reste de la fiche PrestaShop est gardé) ; lecture
 * en JSON. Photos envoyées directement (aucune adresse publique nécessaire).
 */
import { L } from "../../i18n-server";
import { euros, StoreApiError, toCents, type PushProduct, type PushResult, type RemoteProduct, type StoreConnector } from "./types";

export type PrestaCredentials = { url: string; key: string };

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
/** Texte multilingue de PrestaShop : chaîne (une seule langue) ou [{id, value}]. */
const text = (v: unknown): string => (Array.isArray(v) ? String((v[0] as { value?: unknown })?.value ?? "") : String(v ?? ""));

export function prestaConnector(c: PrestaCredentials, fetcher: typeof fetch = fetch): StoreConnector {
  const base = c.url.replace(/\/+$/, "");
  const auth = "Basic " + Buffer.from(`${c.key}:`).toString("base64");
  async function call(method: string, path: string, body?: string | FormData, json = true): Promise<any> {
    const sep = path.includes("?") ? "&" : "?";
    const r = await fetcher(`${base}/api/${path}${json ? `${sep}output_format=JSON` : ""}`, { method, headers: { Authorization: auth, ...(typeof body === "string" ? { "Content-Type": "application/xml" } : {}) }, body });
    const t = await r.text();
    if (r.status === 401 || r.status === 403) throw new StoreApiError("prestashop", r.status, L("PrestaShop refuse la clé du webservice (droits manquants).", "PrestaShop rejected the webservice key (missing permissions)."));
    if (!r.ok) {
      const msg = t.match(/<message><!\[CDATA\[([\s\S]*?)\]\]><\/message>/)?.[1] ?? (() => { try { return JSON.parse(t).errors?.[0]?.message; } catch { return t.slice(0, 200); } })();
      throw new StoreApiError("prestashop", r.status, L(`PrestaShop : ${msg}`, `PrestaShop: ${msg}`));
    }
    if (!json) return t;
    try { return t ? JSON.parse(t) : {}; } catch { return {}; }
  }
  const xml = (resource: string, fields: string) => `<?xml version="1.0" encoding="UTF-8"?><prestashop xmlns:xlink="http://www.w3.org/1999/xlink"><${resource}>${fields}</${resource}></prestashop>`;

  let langs: number[] | null = null;
  const languages = async (): Promise<number[]> => (langs ??= ((await call("GET", "languages?display=[id]")).languages ?? []).map((l: { id: number }) => Number(l.id)));
  const ml = async (tag: string, value: string, raw = false) => `<${tag}>${(await languages()).map((id: number) => `<language id="${id}">${raw ? cdata(value) : esc(value)}</language>`).join("")}</${tag}>`;

  async function categoryIds(names: string[]): Promise<number[]> {
    const ids: number[] = [];
    for (const name of names) {
      const found = (await call("GET", `categories?display=[id,name]&filter[name]=[${encodeURIComponent(name)}]`)).categories?.find((x: any) => text(x.name).toLowerCase() === name.toLowerCase());
      if (found) { ids.push(Number(found.id)); continue; }
      const created = await call("POST", "categories", xml("category", `<id_parent>2</id_parent><active>1</active>${await ml("name", name)}${await ml("link_rewrite", name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "categorie")}`));
      ids.push(Number(created.category.id));
    }
    return ids;
  }
  async function optionValueIds(options: PushProduct["options"]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    for (const o of options) {
      const groups = (await call("GET", "product_options?display=[id,name]")).product_options ?? [];
      let gid = Number(groups.find((g: any) => text(g.name).toLowerCase() === o.name.toLowerCase())?.id ?? 0);
      if (!gid) gid = Number((await call("POST", "product_options", xml("product_option", `<is_color_group>0</is_color_group><group_type>select</group_type>${await ml("name", o.name)}${await ml("public_name", o.name)}`))).product_option.id);
      const values = (await call("GET", `product_option_values?display=[id,name,id_attribute_group]&filter[id_attribute_group]=[${gid}]`)).product_option_values ?? [];
      for (const v of o.values) {
        let vid = Number(values.find((x: any) => text(x.name).toLowerCase() === v.toLowerCase())?.id ?? 0);
        if (!vid) vid = Number((await call("POST", "product_option_values", xml("product_option_value", `<id_attribute_group>${gid}</id_attribute_group>${await ml("name", v)}`))).product_option_value.id);
        map.set(`${o.name.toLowerCase()}\u0000${v.toLowerCase()}`, vid);
      }
    }
    return map;
  }
  async function stockRow(productId: string, attr: string) {
    return ((await call("GET", `stock_availables?display=full&filter[id_product]=[${productId}]&filter[id_product_attribute]=[${attr}]`)).stock_availables ?? [])[0];
  }
  async function setStock(productId: string, attr: string, v: { stock: number | null | undefined; stockPolicy: string }) {
    if (v.stock === undefined) return;
    const row = await stockRow(productId, attr);
    if (!row) return;
    // Stock non suivi au studio : vente toujours permise (out_of_stock = 1) ; sinon quantité et règle d'épuisement.
    await call("PATCH", `stock_availables/${row.id}`, xml("stock_available", `<id>${row.id}</id>${v.stock === null ? "" : `<quantity>${v.stock}</quantity>`}<out_of_stock>${v.stock === null || v.stockPolicy === "continue" ? 1 : 0}</out_of_stock>`));
  }

  async function productFields(p: PushProduct, cats: number[]) {
    const v0 = p.variants[0];
    const price = p.options.length ? Math.min(...p.variants.map((v) => v.price ?? p.price ?? 0)) : (v0?.price ?? p.price ?? 0);
    const seoTitle = p.seo.title || p.title;
    return [
      `<id_category_default>${cats[0] ?? 2}</id_category_default>`, `<id_tax_rules_group>0</id_tax_rules_group>`,
      `<reference>${esc(p.options.length ? "" : v0?.sku ?? "")}</reference>`, `<ean13>${esc(/^\d{8,13}$/.test(p.barcode) ? p.barcode : "")}</ean13>`,
      `<price>${euros(price)}</price>`, `<active>${p.status === "active" ? 1 : 0}</active>`, `<state>1</state>`, `<available_for_order>1</available_for_order>`, `<show_price>1</show_price>`,
      `<visibility>both</visibility>`, `<minimal_quantity>1</minimal_quantity>`, `<weight>${(v0?.weightGrams ?? p.weightGrams ?? 0) / 1000}</weight>`,
      `<product_type>${p.options.length ? "combinations" : "standard"}</product_type>`,
      await ml("name", p.title), await ml("link_rewrite", p.handle), await ml("description", p.description_html, true),
      await ml("meta_title", seoTitle.slice(0, 255)), await ml("meta_description", p.seo.description.slice(0, 512)),
      `<associations><categories>${[...new Set([2, ...cats])].map((id) => `<category><id>${id}</id></category>`).join("")}</categories></associations>`,
    ].join("");
  }

  async function syncImages(productId: string, p: PushProduct) {
    if (!p.images) return;
    const listing = await call("GET", `images/products/${productId}`, undefined, false).catch(() => "");
    for (const id of [...String(listing).matchAll(/<declination id="(\d+)"/g)].map((m) => m[1])) await call("DELETE", `images/products/${productId}/${id}`, undefined, false);
    for (const img of p.images) {
      const form = new FormData();
      form.append("image", new Blob([new Uint8Array(img.data())], { type: img.mime }), img.name);
      await call("POST", `images/products/${productId}`, form, false);
    }
  }

  async function syncCombinations(productId: string, p: PushProduct): Promise<{ localId: string; id: string }[]> {
    if (!p.options.length) {
      // Produit standard : une seule ligne de stock (déclinaison 0). Anciennes déclinaisons retirées.
      for (const cid of await combinationIds(productId)) await call("DELETE", `combinations/${cid}`);
      await setStock(productId, "0", p.variants[0] ?? { stock: undefined, stockPolicy: "deny" });
      return p.variants.map((v) => ({ localId: v.localId, id: productId }));
    }
    const ids = await optionValueIds(p.options);
    const basePrice = Math.min(...p.variants.map((v) => v.price ?? p.price ?? 0));
    const existing = new Set((await combinationIds(productId)).map(String));
    const out: { localId: string; id: string }[] = [];
    for (const [i, v] of p.variants.entries()) {
      const values = p.options.map((o, k) => ids.get(`${o.name.toLowerCase()}\u0000${(v.options[k] ?? "").toLowerCase()}`)).filter(Boolean);
      const fields = `<id_product>${productId}</id_product><reference>${esc(v.sku)}</reference><price>${euros((v.price ?? p.price ?? 0) - basePrice)}</price><minimal_quantity>1</minimal_quantity><weight>${v.weightGrams ? v.weightGrams / 1000 : 0}</weight><default_on>${i === 0 ? 1 : 0}</default_on><associations><product_option_values>${values.map((id) => `<product_option_value><id>${id}</id></product_option_value>`).join("")}</product_option_values></associations>`;
      let cid = v.remoteId && existing.has(v.remoteId) ? v.remoteId : "";
      if (cid) await call("PUT", `combinations/${cid}`, xml("combination", `<id>${cid}</id>${fields}`));
      else cid = String((await call("POST", "combinations", xml("combination", fields))).combination.id);
      existing.delete(cid);
      out.push({ localId: v.localId, id: cid });
      await setStock(productId, cid, v);
    }
    for (const cid of existing) await call("DELETE", `combinations/${cid}`);
    return out;
  }
  async function combinationIds(productId: string): Promise<number[]> {
    return ((await call("GET", `combinations?display=[id]&filter[id_product]=[${productId}]`)).combinations ?? []).map((x: any) => Number(x.id));
  }

  async function toRemote(p: any): Promise<RemoteProduct> {
    const combos = ((await call("GET", `combinations?display=full&filter[id_product]=[${p.id}]`)).combinations ?? []) as any[];
    const stocks = ((await call("GET", `stock_availables?display=full&filter[id_product]=[${p.id}]`)).stock_availables ?? []) as any[];
    const stockOf = (attr: string) => { const s = stocks.find((x) => String(x.id_product_attribute) === attr); return s ? Number(s.quantity) : null; };
    const cats = ((p.associations?.categories ?? []) as { id: number }[]).map((x) => Number(x.id)).filter((id) => id > 2);
    const catNames = cats.length ? ((await call("GET", `categories?display=[id,name]&filter[id]=[${cats.join("|")}]`)).categories ?? []).map((x: any) => text(x.name)) : [];
    const valueIds = [...new Set(combos.flatMap((cb) => (cb.associations?.product_option_values ?? []).map((v: any) => Number(v.id))))];
    const values = valueIds.length ? ((await call("GET", `product_option_values?display=[id,name,id_attribute_group]&filter[id]=[${valueIds.join("|")}]`)).product_option_values ?? []) as any[] : [];
    const groupIds = [...new Set(values.map((v) => Number(v.id_attribute_group)))];
    const groups = groupIds.length ? ((await call("GET", `product_options?display=[id,name]&filter[id]=[${groupIds.join("|")}]`)).product_options ?? []) as any[] : [];
    const options = groups.map((g) => ({ name: text(g.name), values: values.filter((v) => Number(v.id_attribute_group) === Number(g.id)).map((v) => text(v.name)) }));
    const basePrice = toCents(p.price);
    const simple = !combos.length;
    return {
      id: String(p.id), handle: text(p.link_rewrite), title: text(p.name), description_html: text(p.description), status: String(p.active) === "1" ? "active" : "draft",
      price: basePrice, compareAt: null, categories: catNames, tags: [], images: ((p.associations?.images ?? []) as any[]).map((i) => `${base}/api/images/products/${p.id}/${i.id}`), options, simple,
      variants: simple
        ? [{ id: String(p.id), sku: String(p.reference ?? ""), options: [], price: basePrice, stock: stockOf("0") }]
        : combos.map((cb) => {
          const own = (cb.associations?.product_option_values ?? []).map((v: any) => values.find((x) => Number(x.id) === Number(v.id)));
          return { id: String(cb.id), sku: String(cb.reference ?? ""), options: groups.map((g) => text(own.find((x: any) => x && Number(x.id_attribute_group) === Number(g.id))?.name)), price: basePrice === null ? null : basePrice + (toCents(cb.price) ?? 0), stock: stockOf(String(cb.id)) };
        }),
    };
  }

  return {
    platform: "prestashop",
    store: new URL(base).host,
    async list() {
      const ids = ((await call("GET", "products?display=[id]")).products ?? []).map((x: any) => Number(x.id));
      const out: RemoteProduct[] = [];
      for (const id of ids) { const p = await this.get(String(id)); if (p) out.push(p); }
      return out;
    },
    async get(id) {
      try { return await toRemote((await call("GET", `products/${id}`)).product); }
      catch (e) { if (e instanceof StoreApiError && e.status === 404) return null; throw e; }
    },
    async probe() {
      await call("GET", "products?display=[id]&limit=1");
    },
    // Le webservice n'accepte qu'une quantité absolue : seule la quantité est écrite, juste après relecture.
    async setStock(productId, variantId, quantity) {
      const row = await stockRow(productId, variantId === productId ? "0" : variantId);
      if (!row) throw new StoreApiError("prestashop", 404, L("PrestaShop : ligne de stock introuvable.", "PrestaShop: stock row not found."));
      await call("PATCH", `stock_availables/${row.id}`, xml("stock_available", `<id>${row.id}</id><quantity>${quantity}</quantity>`));
    },
    async readImage(url) {
      if (!url.startsWith(`${base}/api/images/`)) return null;
      const r = await fetcher(url, { headers: { Authorization: auth } });
      const mime = (r.headers.get("content-type") ?? "").split(";")[0];
      return r.ok && /^image\/(jpeg|png|webp)$/.test(mime) ? { data: Buffer.from(await r.arrayBuffer()), mime } : null;
    },
    async create(p) {
      const cats = await categoryIds(p.categories);
      const created = await call("POST", "products", xml("product", await productFields(p, cats)));
      const id = String(created.product.id);
      const variants = await syncCombinations(id, p);
      await syncImages(id, p);
      return { id, variants, warnings: p.compareAt ? [L("Prix barré non transmis à PrestaShop : créez la réduction dans la boutique (Catalogue › Règles de prix).", "Compare-at price not sent to PrestaShop: create the discount in the store (Catalog › Price rules).")] : [] };
    },
    async update(id, p) {
      const cats = await categoryIds(p.categories);
      await call("PATCH", `products/${id}`, xml("product", `<id>${id}</id>${await productFields(p, cats)}`));
      const variants = await syncCombinations(id, p);
      await syncImages(id, p);
      return { id, variants, warnings: p.compareAt ? [L("Prix barré non transmis à PrestaShop : créez la réduction dans la boutique (Catalogue › Règles de prix).", "Compare-at price not sent to PrestaShop: create the discount in the store (Catalog › Price rules).")] : [] };
    },
  };
}
