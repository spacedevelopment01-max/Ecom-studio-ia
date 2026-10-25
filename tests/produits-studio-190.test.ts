/**
 * Mission #190, point 5 — produits gérés dans le Studio : reprise des produits de la boutique (aperçu identique),
 * modification visible dans l'aperçu et les exports, références uniques, photos du projet, conflits de version ;
 * synchronisation (correspondances, aucun doublon, stock à trois points), import ; connecteurs Shopify et WooCommerce
 * (requêtes envoyées, vérifiées sans boutique réelle) ; adresse de boutique contrôlée.
 * L'essai réel contre WooCommerce et PrestaShop est dans produits-boutiques-e2e-190.test.ts.
 */
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createUser } from "@/lib/auth";
import { saveThemeVersion, currentTheme } from "@/lib/projects";
import { saveAsset } from "@/lib/library";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { sampleSpec, serviceSpec } from "./fixtures";
import { renderPage } from "@/lib/theme/render";
import { compileTheme } from "@/lib/theme/compile";
import { storeProducts } from "@/lib/theme/spec";
import { wooProductsCsv } from "@/lib/theme/catalog-export";
import { runWithLang } from "@/lib/i18n-server";
import { MAQUETTE_THEMES, themeKinds } from "@/lib/theme/theme-fit";
import { createProduct, getProduct, listProducts, seedFromTheme, setVariantStock, updateProduct, withStudioProducts, linksOf } from "@/lib/products/catalog";
import { importFromStore, stockDecision, syncProducts } from "@/lib/products/sync";
import { shopifyConnector } from "@/lib/products/connectors/shopify";
import { wooConnector } from "@/lib/products/connectors/woocommerce";
import { assertStoreUrl, type PushProduct, type RemoteProduct, type StoreConnector } from "@/lib/products/connectors/types";

const session = vi.hoisted(() => ({ user: null as any }));
vi.mock("@/lib/auth", async (o) => ({ ...await o<object>(), requireUser: async () => session.user, currentUser: async () => session.user }));
const productsRoute = await import("@/app/api/projects/[id]/products/route");
const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as never;
const json = (method: string, b: unknown) => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(b) });
const fr = <T,>(f: () => T) => runWithLang({ ui: "fr", content: "fr" }, f);
const render = async (spec: ReturnType<typeof sampleSpec>, path: string) => (await renderPage({ spec, base: "", files: compileTheme(spec), cart: [] }, path, new URLSearchParams())).html;

/** Boutique en mémoire : même contrat qu'un connecteur réel ; `sell` simule une vente faite dans la boutique. */
function memoryStore() {
  const products = new Map<string, RemoteProduct>();
  let seq = 100;
  const calls = { create: 0, update: 0 };
  const apply = (id: string, p: PushProduct, old?: RemoteProduct) => {
    const variants = p.variants.map((v) => {
      const prev = old?.variants.find((x) => x.id === v.remoteId);
      return { id: prev?.id ?? String(++seq), sku: v.sku, options: v.options, price: v.price, stock: v.stock === undefined ? (prev?.stock ?? null) : v.stock };
    });
    products.set(id, { id, handle: p.handle, title: p.title, description_html: p.description_html, status: p.status, price: p.price, compareAt: p.compareAt, categories: p.categories, tags: p.tags, images: p.images ? p.images.map((i) => i.name) : old?.images ?? [], options: p.options, variants, simple: !p.options.length });
    return { id, variants: p.variants.map((v, i) => ({ localId: v.localId, id: variants[i].id })), warnings: [] };
  };
  const conn: StoreConnector = {
    platform: "woocommerce", store: "boutique.example",
    async list() { return [...products.values()].map((p) => structuredClone(p)); },
    async get(id) { const p = products.get(id); return p ? structuredClone(p) : null; },
    async create(p) { calls.create++; return apply(String(++seq), p); },
    async update(id, p) { calls.update++; return apply(id, p, products.get(id)); },
  };
  return { conn, products, calls, sell: (sku: string, n: number) => { for (const p of products.values()) for (const v of p.variants) if (v.sku === sku && v.stock !== null) v.stock -= n; } };
}

describe("produits du Studio (mission #190)", () => {
  let uid = "", pid = "", photo = "";
  beforeAll(async () => {
    const u = await createUser(`prod190-${Date.now()}@example.invalid`, "isolated-test-only", "Produits");
    uid = u.id;
    session.user = u;
    pid = seedHoldout(uid, 0, "Catalogue");
    saveThemeVersion(pid, fr(() => sampleSpec("souple", "multi", { rich: true })), "test", "user");
    photo = (await saveAsset({ projectId: pid, userId: uid, data: Buffer.from("x"), name: "sac.jpg", mime: "image/jpeg", origin: "upload" })).id;
  });

  it("reprise des produits de la boutique : mêmes produits, aperçu et export identiques tant que rien ne change", async () => {
    const spec = currentTheme(pid)!.spec;
    const seeded = seedFromTheme(pid, spec);
    expect(seeded.map((p) => p.handle)).toEqual(storeProducts(spec).map((p) => p.handle));
    // Reprise faite une seule fois.
    expect(seedFromTheme(pid, spec).length).toBe(seeded.length);
    const injected = withStudioProducts(spec, pid);
    for (const path of ["/", `/products/${spec.store.product.handle}`, "/collections/all"]) expect(await fr(() => render(injected, path)), path).toBe(await fr(() => render(spec, path)));
    expect(wooProductsCsv(injected)).toBe(wooProductsCsv(spec));
  });

  it("modification au Studio : nom, prix, variantes et stock visibles dans l'aperçu et l'export ; thème enregistré intact", async () => {
    const before = JSON.stringify(currentTheme(pid)!.spec);
    const first = listProducts(pid)[0];
    updateProduct(pid, first.id, { title: "Tapis Souple modifié au Studio", price: 4900, options: [{ name: "Coloris", values: ["Sable", "Nuit"] }], variants: [{ options: ["Sable"], sku: "SOU-SAB", stock: 4 }, { options: ["Nuit"], sku: "SOU-NUI", stock: 0 }] });
    const spec = withStudioProducts(currentTheme(pid)!.spec, pid);
    const html = await fr(() => render(spec, `/products/${first.handle}`));
    expect(html).toContain("Tapis Souple modifié au Studio");
    expect(html).toMatch(/49,00/);
    expect(html).toContain("Nuit");
    const csv = wooProductsCsv(spec);
    expect(csv).toContain("SOU-SAB");
    expect(csv).toMatch(/"SOU-SAB"[^\n]*"4"/);
    expect(JSON.stringify(currentTheme(pid)!.spec)).toBe(before);
  });

  it("références uniques, photos du projet seulement, modification concurrente refusée", async () => {
    const other = seedHoldout(uid, 0, "Autre projet");
    const foreign = (await saveAsset({ projectId: other, userId: uid, data: Buffer.from("y"), name: "x.jpg", mime: "image/jpeg", origin: "upload" })).id;
    expect(() => createProduct(pid, { title: "Doublon", variants: [{ options: [], sku: "SOU-SAB" }] })).toThrow(/existe déjà/);
    expect(() => createProduct(pid, { title: "Photo étrangère", images: [{ assetId: foreign, alt: "" }] })).toThrow(/médias de ce projet/);
    const p = createProduct(pid, { title: "Sangle", price: 1500, images: [{ assetId: photo, alt: "Sangle" }] });
    updateProduct(pid, p.id, { title: "Sangle (1)", version: p.version });
    expect(() => updateProduct(pid, p.id, { title: "Sangle (2)", version: p.version })).toThrow(/modifié entre-temps/);
    // Échange de références entre deux variantes du même produit : accepté.
    const q = createProduct(pid, { title: "Brique", options: [{ name: "Taille", values: ["S", "L"] }], variants: [{ options: ["S"], sku: "BR-1" }, { options: ["L"], sku: "BR-2" }] });
    expect(updateProduct(pid, q.id, { variants: [{ options: ["S"], sku: "BR-2" }, { options: ["L"], sku: "BR-1" }] }).variants.map((v) => v.sku)).toEqual(["BR-2", "BR-1"]);
  });

  it("API du catalogue : liste, création (201), erreur claire", async () => {
    const res = await productsRoute.GET(new Request("http://x"), ctx(pid));
    const view = await res.json();
    expect(view.products.length).toBeGreaterThan(2);
    expect(view.templates).toContain("");
    const created = await productsRoute.POST(new Request("http://x", json("POST", { title: "Anneau", price: 2900 })), ctx(pid));
    expect(created.status).toBe(201);
    const bad = await productsRoute.POST(new Request("http://x", json("POST", { title: "" })), ctx(pid));
    expect(bad.status).toBe(400);
  });

  it("règle de stock à trois points", () => {
    expect(stockDecision(10, undefined, undefined, false)).toMatchObject({ push: 10, rule: "new" });
    expect(stockDecision(10, 10, 10, true)).toMatchObject({ push: undefined, result: 10, rule: "same" });
    expect(stockDecision(12, 10, 10, true)).toMatchObject({ push: 12, result: 12, rule: "studio" });
    expect(stockDecision(10, 7, 10, true)).toMatchObject({ push: undefined, result: 7, rule: "store" });
    expect(stockDecision(15, 7, 10, true)).toMatchObject({ push: 12, result: 12, rule: "merged" });
    expect(stockDecision(3, 8, null, false)).toMatchObject({ push: undefined, result: 8, rule: "store-existing" });
  });

  it("synchronisation : créé une fois, mis à jour sans doublon, vente jamais écrasée, produit existant relié, import sans doublon", async () => {
    const p2 = seedHoldout(uid, 0, "Sync");
    const m = memoryStore();
    const p = createProduct(p2, { title: "Sac", price: 12900, options: [{ name: "Coloris", values: ["Sable", "Nuit"] }], variants: [{ options: ["Sable"], sku: "S-1", stock: 10 }, { options: ["Nuit"], sku: "N-1", stock: 5 }] });
    let r = await syncProducts(p2, m.conn);
    expect(r.counts.created).toBe(1);
    const rid = r.lines[0].remoteId!;
    // Rien de changé : aucun envoi.
    r = await syncProducts(p2, m.conn);
    expect([r.counts.unchanged, m.calls.update]).toEqual([1, 0]);
    // Modification au studio : même produit distant, mêmes variantes.
    const variantIds = m.products.get(rid)!.variants.map((v) => v.id);
    updateProduct(p2, p.id, { title: "Sac modifié" });
    r = await syncProducts(p2, m.conn);
    expect([r.lines[0].action, r.lines[0].remoteId, m.products.size]).toEqual(["updated", rid, 1]);
    expect(m.products.get(rid)!.variants.map((v) => v.id)).toEqual(variantIds);
    // Vente de 3 « Sable » dans la boutique + réassort de 5 au studio : 10 − 3 + 5 = 12 ; « Nuit » vendu 2 : repris (3).
    m.sell("S-1", 3); m.sell("N-1", 2);
    setVariantStock(p2, getProduct(p2, p.id).variants[0].id, 15);
    r = await syncProducts(p2, m.conn);
    expect(m.products.get(rid)!.variants.map((v) => v.stock)).toEqual([12, 3]);
    expect(getProduct(p2, p.id).variants.map((v) => v.stock)).toEqual([12, 3]);
    // Produit déjà dans la boutique (même référence) : relié, pas recréé ; son stock réel est repris.
    m.products.set("900", { id: "900", handle: "gourde-boutique", title: "Gourde", description_html: "", status: "active", price: 1900, compareAt: null, categories: [], tags: [], images: ["g.jpg"], options: [], variants: [{ id: "900", sku: "G-1", options: [], price: 1900, stock: 42 }], simple: true });
    const g = createProduct(p2, { title: "Gourde", price: 1900, variants: [{ options: [], sku: "G-1", stock: 0 }] });
    const creates = m.calls.create;
    r = await syncProducts(p2, m.conn, { productIds: [g.id] });
    expect([r.lines[0].action, r.lines[0].remoteId, m.calls.create]).toEqual(["linked", "900", creates]);
    expect(getProduct(p2, g.id).variants[0].stock).toBe(42);
    expect(m.products.get("900")!.images).toEqual(["g.jpg"]);
    // Import : produit inconnu importé une seule fois ; les produits reliés ne sont pas réimportés.
    m.products.set("950", { id: "950", handle: "pochette", title: "Pochette", description_html: "<p>Pochette</p>", status: "active", price: 2500, compareAt: null, categories: ["Accessoires"], tags: [], images: [], options: [{ name: "Taille", values: ["S", "M"] }], variants: [{ id: "951", sku: "P-S", options: ["S"], price: 2500, stock: 3 }, { id: "952", sku: "P-M", options: ["M"], price: 2700, stock: 1 }], simple: false });
    const before = listProducts(p2).length;
    const imp = await importFromStore(p2, uid, m.conn);
    expect(imp.counts.imported).toBe(1);
    expect(listProducts(p2).length).toBe(before + 1);
    expect((await importFromStore(p2, uid, m.conn)).counts.imported).toBe(0);
    const pochette = listProducts(p2).find((x) => x.handle === "pochette")!;
    expect(pochette.variants.map((v) => [v.sku, v.price, v.stock])).toEqual([["P-S", 2500, 3], ["P-M", 2700, 1]]);
    // Envoi après import : rien à renvoyer (correspondances et empreintes posées à l'import).
    const upd = m.calls.update;
    r = await syncProducts(p2, m.conn, { productIds: [pochette.id] });
    expect([r.lines[0].action, m.calls.update]).toEqual(["unchanged", upd]);
    const ids = linksOf(p2).filter((l) => l.kind === "product").map((l) => l.remote_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("chaque thème de produits sur maquette : aperçu identique après reprise du catalogue (maquettes préservées)", async () => {
    for (const id of MAQUETTE_THEMES.filter((t) => !themeKinds(t).includes("services"))) {
      const p = seedHoldout(uid, 0, `Reprise ${id}`);
      const spec = fr(() => sampleSpec(id as never, themeKinds(id).includes("catalog" as never) ? "multi" : "mono", { rich: true }));
      saveThemeVersion(p, spec, "test", "user");
      seedFromTheme(p, spec);
      const injected = withStudioProducts(spec, p);
      for (const path of ["/", `/products/${spec.store.product.handle}`]) expect(await fr(() => render(injected, path)), `${id} ${path}`).toBe(await fr(() => render(spec, path)));
    }
  }, 240_000);

  it("site de services : aucun produit joint", () => {
    const s = seedHoldout(uid, 2, "Services");
    const spec = fr(() => serviceSpec("phase" as never));
    saveThemeVersion(s, spec, "test", "user");
    expect(seedFromTheme(s, spec)).toEqual([]);
    expect(withStudioProducts(spec, s)).toBe(spec);
  });
});

describe("connecteurs (requêtes vérifiées sans boutique réelle)", () => {
  const push = (over: Partial<PushProduct> = {}): PushProduct => ({ localId: "l1", handle: "sac", title: "Sac", description_html: "<p>Sac</p>", vendor: "Traverse", productType: "Sac", status: "active", price: 12900, compareAt: 14900, currency: "EUR", categories: [], tags: ["voyage"], options: [{ name: "Coloris", values: ["Sable", "Nuit"] }, { name: "Taille", values: ["M"] }], variants: [{ localId: "v1", remoteId: "gid://shopify/ProductVariant/1", sku: "S-M", options: ["Sable", "M"], price: 12900, compareAt: null, stock: 8, stockPolicy: "deny", weightGrams: null, barcode: "", image: null }, { localId: "v2", sku: "N-M", options: ["Nuit", "M"], price: 13900, compareAt: null, stock: undefined, stockPolicy: "continue", weightGrams: null, barcode: "", image: null }], images: null, seo: { title: "", description: "" }, templateSuffix: "sac", weightGrams: null, barcode: "", ...over });

  it("Shopify : toutes les options et variantes, identifiants existants renvoyés, stock seulement quand il doit être envoyé", async () => {
    const bodies: any[] = [];
    const fetcher = (async (_u: string, init: RequestInit) => {
      const b = JSON.parse(String(init.body));
      bodies.push(b);
      if (b.query.includes("locations")) return new Response(JSON.stringify({ data: { locations: { nodes: [{ id: "gid://shopify/Location/1" }] } } }));
      return new Response(JSON.stringify({ data: { productSet: { userErrors: [], product: { id: "gid://shopify/Product/9", variants: { nodes: [{ id: "gid://shopify/ProductVariant/1", selectedOptions: [{ name: "Coloris", value: "Sable" }, { name: "Taille", value: "M" }] }, { id: "gid://shopify/ProductVariant/2", selectedOptions: [{ name: "Coloris", value: "Nuit" }, { name: "Taille", value: "M" }] }] } } } } }));
    }) as typeof fetch;
    const c = shopifyConnector({ shop: "essai.myshopify.com", token: "jeton-de-test" }, fetcher);
    const r = await c.update("gid://shopify/Product/9", push());
    const input = bodies.find((b) => b.query.includes("productSet")).variables.input;
    expect(input.id).toBe("gid://shopify/Product/9");
    expect(input.productOptions.map((o: any) => [o.name, o.values.map((v: any) => v.name)])).toEqual([["Coloris", ["Sable", "Nuit"]], ["Taille", ["M"]]]);
    expect(input.variants[0]).toMatchObject({ id: "gid://shopify/ProductVariant/1", price: "129.00", inventoryItem: { sku: "S-M", tracked: true }, inventoryQuantities: [{ locationId: "gid://shopify/Location/1", name: "available", quantity: 8 }] });
    expect(input.variants[1].inventoryQuantities).toBeUndefined();
    expect(input.variants[1].inventoryPolicy).toBe("CONTINUE");
    expect(input.templateSuffix).toBe("sac");
    expect(r.variants).toEqual([{ localId: "v1", id: "gid://shopify/ProductVariant/1" }, { localId: "v2", id: "gid://shopify/ProductVariant/2" }]);
    expect(() => shopifyConnector({ shop: "evil.example.com", token: "x" })).toThrow(/myshopify/);
  });

  it("WooCommerce : produit variable, photos et stock omis quand ils ne doivent pas changer", async () => {
    const calls: { method: string; url: string; body: any }[] = [];
    const fetcher = (async (url: string, init: RequestInit) => {
      const body = init.body ? JSON.parse(String(init.body)) : null;
      calls.push({ method: String(init.method), url, body });
      if (url.includes("/products/tags") || url.includes("/products/categories")) return new Response(init.method === "POST" ? JSON.stringify({ id: 5 }) : "[]");
      if (url.includes("/variations/batch")) return new Response(JSON.stringify({ update: [{ id: 11 }], create: [{ id: 12 }] }));
      if (url.includes("/variations")) return new Response(JSON.stringify([{ id: 11 }]));
      return new Response(JSON.stringify({ id: 77 }));
    }) as typeof fetch;
    const c = wooConnector({ url: "https://boutique.example", key: "ck_test", secret: "cs_test" }, fetcher);
    const r = await c.update("77", push({ variants: push().variants.map((v, i) => ({ ...v, remoteId: i === 0 ? "11" : undefined })) }));
    const put = calls.find((x) => x.method === "PUT")!;
    expect(put.body.type).toBe("variable");
    expect(put.body.images).toBeUndefined();
    const batch = calls.find((x) => x.url.includes("/variations/batch"))!.body;
    expect(batch.update[0]).toMatchObject({ id: 11, sku: "S-M", manage_stock: true, stock_quantity: 8 });
    expect(batch.create[0].stock_quantity).toBeUndefined();
    expect(batch.create[0].attributes).toEqual([{ name: "Coloris", option: "Nuit" }, { name: "Taille", option: "M" }]);
    expect(r.variants).toEqual([{ localId: "v1", id: "11" }, { localId: "v2", id: "12" }]);
  });

  it("adresse de boutique : https et hôte public exigés", async () => {
    await expect(assertStoreUrl("http://boutique.example")).rejects.toThrow(/https/);
    await expect(assertStoreUrl("https://127.0.0.1:8881")).rejects.toThrow(/publique/);
    await expect(assertStoreUrl("https://user:pass@boutique.example")).rejects.toThrow(/identifiants/);
  });
});
