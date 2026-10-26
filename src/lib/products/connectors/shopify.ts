/**
 * Shopify — API Admin GraphQL (`productSet`, synchrone) : toutes les options, toutes les variantes avec leur référence,
 * leur prix, leur prix barré et leur stock (premier emplacement de la boutique), photos par adresse publique.
 * Accès : boutique reliée par l'autorisation Shopify du studio (onglet Connexions) ou jeton d'une application
 * personnalisée du marchand (droits write_products, write_inventory, read_locations).
 * Les identifiants des variantes existantes sont renvoyés à Shopify : elles sont mises à jour, jamais recréées.
 */
import { L } from "../../i18n-server";
import { euros, StoreApiError, toCents, type PushProduct, type PushResult, type RemoteProduct, type StoreConnector } from "./types";

export type ShopifyCredentials = { shop: string; token: string; apiVersion?: string };

const PRODUCT_FIELDS = `id handle title descriptionHtml status tags productType vendor
  options{ name values } media(first: 30){ nodes{ ... on MediaImage { image{ url } } } }
  variants(first: 100){ nodes{ id sku price compareAtPrice inventoryQuantity inventoryItem{ tracked } selectedOptions{ name value } } }
  collections(first: 20){ nodes{ title } }`;

export function shopifyConnector(c: ShopifyCredentials, fetcher: typeof fetch = fetch): StoreConnector {
  const shop = c.shop.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop)) throw new Error(L("Adresse Shopify attendue : nom-de-boutique.myshopify.com.", "Expected Shopify address: store-name.myshopify.com."));
  async function gql(query: string, variables: Record<string, unknown> = {}) {
    const r = await fetcher(`https://${shop}/admin/api/${c.apiVersion || "2025-07"}/graphql.json`, { method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": c.token }, body: JSON.stringify({ query, variables }) });
    if (r.status === 401 || r.status === 403) throw new StoreApiError("shopify", r.status, L("Shopify refuse l'accès (droits produits et stock requis).", "Shopify denied access (product and inventory permissions required)."));
    if (!r.ok) throw new StoreApiError("shopify", r.status, L(`Shopify ne répond pas correctement (erreur ${r.status}).`, `Shopify did not answer correctly (error ${r.status}).`));
    const j: any = await r.json();
    if (j.errors) throw new StoreApiError("shopify", r.status, L(`Shopify : ${JSON.stringify(j.errors).slice(0, 300)}`, `Shopify: ${JSON.stringify(j.errors).slice(0, 300)}`));
    return j.data;
  }
  let location: string | null = null;
  const locationId = async () => (location ??= (await gql(`{ locations(first: 1){ nodes{ id } } }`)).locations.nodes[0]?.id ?? null);

  const toRemote = (p: any): RemoteProduct => {
    const options = (p.options ?? []).filter((o: any) => !(o.name === "Title" && o.values?.[0] === "Default Title"));
    const variants = (p.variants?.nodes ?? []).map((v: any) => ({ id: v.id, sku: v.sku ?? "", options: options.map((o: any) => v.selectedOptions.find((s: any) => s.name === o.name)?.value ?? ""), price: toCents(v.price), stock: v.inventoryItem?.tracked ? Number(v.inventoryQuantity ?? 0) : null }));
    return { id: p.id, handle: p.handle, title: p.title, description_html: p.descriptionHtml ?? "", status: String(p.status).toLowerCase(), price: variants[0]?.price ?? null, compareAt: toCents(p.variants?.nodes?.[0]?.compareAtPrice), categories: (p.collections?.nodes ?? []).map((x: any) => x.title), tags: p.tags ?? [], images: (p.media?.nodes ?? []).map((m: any) => m.image?.url).filter(Boolean), options: options.map((o: any) => ({ name: o.name, values: o.values })), variants, simple: !options.length };
  };

  async function input(p: PushProduct, id?: string) {
    const warnings: string[] = [];
    const loc = p.variants.some((v) => typeof v.stock === "number") ? await locationId() : null;
    if (p.images && p.images.some((i) => !i.url)) warnings.push(L("Photos non envoyées à Shopify : le studio n'a pas d'adresse publique HTTPS d'où les télécharger.", "Photos not sent to Shopify: the studio has no public HTTPS address to download them from."));
    const options = p.options.length ? p.options : [{ name: "Title", values: ["Default Title"] }];
    const body: Record<string, unknown> = {
      ...(id ? { id } : {}), title: p.title, handle: p.handle, descriptionHtml: p.description_html, vendor: p.vendor, productType: p.productType,
      status: p.status === "active" ? "ACTIVE" : "DRAFT", tags: p.tags, templateSuffix: p.templateSuffix || null,
      seo: p.seo.title || p.seo.description ? { title: p.seo.title || null, description: p.seo.description || null } : undefined,
      productOptions: options.map((o, i) => ({ name: o.name, position: i + 1, values: o.values.map((name) => ({ name })) })),
      variants: p.variants.map((v) => ({
        ...(v.remoteId ? { id: v.remoteId } : {}),
        optionValues: p.options.length ? p.options.map((o, i) => ({ optionName: o.name, name: v.options[i] })) : [{ optionName: "Title", name: "Default Title" }],
        price: euros(v.price ?? p.price ?? 0), compareAtPrice: v.compareAt ?? p.compareAt ? euros(v.compareAt ?? p.compareAt) : null,
        inventoryPolicy: v.stockPolicy === "continue" ? "CONTINUE" : "DENY", barcode: v.barcode || null,
        inventoryItem: { sku: v.sku || null, tracked: v.stock !== null && v.stock !== undefined ? true : v.stock === null ? false : undefined },
        ...(typeof v.stock === "number" && loc ? { inventoryQuantities: [{ locationId: loc, name: "available", quantity: v.stock }] } : {}),
      })),
    };
    if (p.images?.length && p.images.every((i) => i.url)) body.files = p.images.map((i) => ({ originalSource: i.url, contentType: "IMAGE", alt: i.alt }));
    return { body, warnings };
  }
  async function set(p: PushProduct, id?: string): Promise<PushResult> {
    const { body, warnings } = await input(p, id);
    const d = await gql(`mutation($input: ProductSetInput!){ productSet(synchronous: true, input: $input){ product{ id variants(first: 100){ nodes{ id selectedOptions{ name value } } } } userErrors{ field message } } }`, { input: body });
    const errs = d?.productSet?.userErrors ?? [];
    if (errs.length) throw new StoreApiError("shopify", 422, L(`Shopify : ${errs.map((e: any) => e.message).join(" ; ")}`, `Shopify: ${errs.map((e: any) => e.message).join("; ")}`));
    const nodes = d.productSet.product.variants.nodes as { id: string; selectedOptions: { name: string; value: string }[] }[];
    const key = (vals: string[]) => vals.map((v) => v.toLowerCase()).join("\u0000");
    const byKey = new Map(nodes.map((n) => [key(p.options.length ? p.options.map((o) => n.selectedOptions.find((s) => s.name === o.name)?.value ?? "") : []), n.id]));
    return { id: d.productSet.product.id, variants: p.variants.map((v) => ({ localId: v.localId, id: byKey.get(key(v.options)) ?? "" })).filter((x) => x.id), warnings };
  }

  return {
    platform: "shopify",
    store: shop.toLowerCase(),
    async list() {
      const out: RemoteProduct[] = [];
      let after: string | null = null;
      for (let i = 0; i < 50; i++) {
        const d: any = await gql(`query($after: String){ products(first: 50, after: $after){ pageInfo{ hasNextPage endCursor } nodes{ ${PRODUCT_FIELDS} } } }`, { after });
        out.push(...d.products.nodes.map(toRemote));
        if (!d.products.pageInfo.hasNextPage) break;
        after = d.products.pageInfo.endCursor;
      }
      return out;
    },
    async get(id) {
      const d = await gql(`query($id: ID!){ product(id: $id){ ${PRODUCT_FIELDS} } }`, { id });
      return d.product ? toRemote(d.product) : null;
    },
    create: (p) => set(p),
    update: (id, p) => set(p, id),
    async probe() {
      await gql(`{ shop{ id } }`);
    },
    // Ajustement relatif (`inventoryAdjustQuantities`) : Shopify l'applique sur sa quantité du moment, une vente
    // simultanée reste déduite. Même emplacement que l'envoi des quantités (le premier de la boutique).
    async adjustStock(_productId, variantId, delta) {
      const loc = await locationId();
      const item = (await gql(`query($id: ID!){ productVariant(id: $id){ inventoryItem{ id } } }`, { id: variantId }))?.productVariant?.inventoryItem?.id;
      if (!loc || !item) throw new StoreApiError("shopify", 422, L("Shopify : emplacement de stock ou article introuvable.", "Shopify: inventory location or item not found."));
      const d = await gql(`mutation($input: InventoryAdjustQuantitiesInput!){ inventoryAdjustQuantities(input: $input){ inventoryAdjustmentGroup{ changes{ name quantityAfterChange } } userErrors{ field message } } }`, { input: { reason: "correction", name: "available", changes: [{ delta, inventoryItemId: item, locationId: loc }] } });
      const errs = d?.inventoryAdjustQuantities?.userErrors ?? [];
      if (errs.length) throw new StoreApiError("shopify", 422, L(`Shopify : ${errs.map((e: any) => e.message).join(" ; ")}`, `Shopify: ${errs.map((e: any) => e.message).join("; ")}`));
      const after = (d?.inventoryAdjustQuantities?.inventoryAdjustmentGroup?.changes ?? []).find((c: any) => c.name === "available")?.quantityAfterChange;
      return typeof after === "number" ? after : null;
    },
  };
}
