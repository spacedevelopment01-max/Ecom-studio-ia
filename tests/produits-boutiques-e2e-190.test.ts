/**
 * Mission #190, point 5 — essai RÉEL contre des boutiques de test (WooCommerce 8.9 et PrestaShop 8.1 installées en
 * local). Lancé seulement si les boutiques sont fournies :
 *   STORE_E2E=1 STORE_CONNECT_ALLOW_LOCAL=1 WOO_URL=… WOO_KEY=… WOO_SECRET=… PS_URL=… PS_KEY=… npx vitest run tests/produits-boutiques-e2e-190.test.ts
 * Les accès viennent de l'environnement (jamais écrits dans le dépôt).
 *
 * Parcours : produit créé dans le Studio (2 coloris, références, stock, photo) → envoyé → relu dans la boutique →
 * ajouté au panier de la boutique → modifié dans le Studio et renvoyé (même identifiant, aucun doublon) → vente
 * simulée dans la boutique pendant qu'un réassort est saisi au Studio (stock fusionné, rien d'écrasé) → import des
 * produits existants (aucun doublon au second import).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import http from "node:http";
import sharp from "sharp";
import { createUser } from "@/lib/auth";
import { saveAsset, getAsset, assetData } from "@/lib/library";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { createProduct, getProduct, listProducts, setVariantStock, updateProduct, linksOf } from "@/lib/products/catalog";
import { connectStore, connectorOf, importFromStore, syncProducts } from "@/lib/products/sync";

const E2E = process.env.STORE_E2E === "1";
const env = (k: string) => process.env[k] ?? "";

describe.skipIf(!E2E)("produits du Studio ↔ boutiques de test réelles (mission #190)", () => {
  let pid = "", uid = "", server: http.Server, port = 0, assetId = "";
  const imageUrl = (id: string, file: string) => `http://127.0.0.1:${port}/${id}/${file}`;
  beforeAll(async () => {
    const u = await createUser(`e2e190-${Date.now()}@example.invalid`, "isolated-test-only", "E2E");
    uid = u.id;
    pid = seedHoldout(uid, 0, "Boutique E2E");
    const jpg = await sharp({ create: { width: 800, height: 800, channels: 3, background: { r: 180, g: 140, b: 100 } } }).jpeg().toBuffer();
    assetId = (await saveAsset({ projectId: pid, userId: uid, data: jpg, name: "sac-sable.jpg", mime: "image/jpeg", role: "catalog-original", origin: "upload" })).id;
    // Serveur d'images local : la boutique télécharge la photo comme elle le ferait depuis l'adresse publique du studio.
    server = http.createServer((req, res) => { const a = getAsset(String(req.url).split("/")[1]); if (!a) { res.statusCode = 404; return res.end(); } res.setHeader("Content-Type", a.mime); res.end(assetData(a)); });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    port = (server.address() as { port: number }).port;
  });
  afterAll(() => server?.close());

  const makeProduct = (stamp: string) => createProduct(pid, {
    title: `Sac Traverse essai ${stamp}`, handle: `sac-traverse-essai-${stamp}`, description_html: "<p>Sac de voyage modulable.</p>", price: 12900, compareAt: 14900,
    categories: ["Sacs de voyage"], tags: ["voyage"], images: [{ assetId, alt: "Sac sable" }], options: [{ name: "Coloris", values: ["Sable", "Nuit"] }],
    variants: [{ options: ["Sable"], sku: `TRV-SAB-${stamp}`, stock: 10 }, { options: ["Nuit"], sku: `TRV-NUI-${stamp}`, stock: 5 }],
  });

  for (const platform of ["woocommerce", "prestashop"] as const) {
    it(`${platform} : envoi, panier, modification sans doublon, vente + réassort fusionnés, import sans doublon`, async () => {
      const creds = platform === "woocommerce" ? { platform, url: env("WOO_URL"), key: env("WOO_KEY"), secret: env("WOO_SECRET") } : { platform, url: env("PS_URL"), key: env("PS_KEY") };
      const store = await connectStore(pid, uid, creds);
      const conn = await connectorOf(pid, store.id);
      const stamp = `${platform.slice(0, 2)}${Date.now().toString(36)}`;
      const p = makeProduct(stamp);

      // 1. Envoi : produit créé dans la boutique, 2 variantes, références et stock du studio.
      let r = await syncProducts(pid, conn, { productIds: [p.id], imageUrl });
      expect(r.lines[0].error).toBeUndefined();
      expect(r.lines[0].action).toBe("created");
      const remoteId = r.lines[0].remoteId!;
      let remote = (await conn.get(remoteId))!;
      expect(remote.title).toBe(p.data.title);
      expect(remote.variants.map((v) => [v.sku, v.stock]).sort()).toEqual([[`TRV-NUI-${stamp}`, 5], [`TRV-SAB-${stamp}`, 10]]);
      expect(remote.images.length).toBeGreaterThan(0);
      expect(remote.categories).toContain("Sacs de voyage");

      // 2. Panier de la boutique (page publique) : la variante « Nuit » s'ajoute.
      const nuit = remote.variants.find((v) => v.options[0] === "Nuit")!;
      if (platform === "woocommerce") {
        const cart = await fetch(`${env("WOO_URL")}/wp-json/wc/store/v1/cart/add-item`, { method: "POST", headers: { "Content-Type": "application/json", Nonce: (await fetch(`${env("WOO_URL")}/wp-json/wc/store/v1/cart`)).headers.get("nonce") ?? "" }, body: JSON.stringify({ id: Number(nuit.id), quantity: 1 }) });
        const j = await cart.json() as { items?: { id: number; quantity: number }[] };
        expect(cart.status, JSON.stringify(j).slice(0, 300)).toBe(201);
        expect(j.items?.some((i) => i.id === Number(nuit.id))).toBe(true);
      } else {
        const page = await fetch(`${env("PS_URL")}/index.php?id_product=${remoteId}&controller=product`);
        expect(page.status).toBe(200);
        const html = await page.text();
        expect(html).toContain(p.data.title);
        const token = html.match(/name="token" value="([a-f0-9]+)"/)?.[1] ?? "";
        const add = await fetch(`${env("PS_URL")}/index.php?controller=cart`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: page.headers.get("set-cookie")?.split(";")[0] ?? "" }, body: new URLSearchParams({ token, id_product: remoteId, id_product_attribute: nuit.id, qty: "1", add: "1", action: "update", ajax: "1" }) });
        const j = await add.json() as { success?: boolean; cart?: { products?: { id_product: string; id_product_attribute: string }[] } };
        expect(j.success, JSON.stringify(j).slice(0, 300)).toBe(true);
        expect(j.cart?.products?.some((x) => String(x.id_product) === remoteId && String(x.id_product_attribute) === nuit.id)).toBe(true);
      }

      // 3. Modification dans le Studio : même produit distant mis à jour, aucun doublon, mêmes variantes.
      updateProduct(pid, p.id, { title: `${p.data.title} (modifié)`, price: 11900, variants: [{ options: ["Sable"], price: 11900 }, { options: ["Nuit"], price: 11900 }] });
      r = await syncProducts(pid, conn, { productIds: [p.id], imageUrl });
      expect(r.lines[0].error).toBeUndefined();
      expect([r.lines[0].action, r.lines[0].remoteId]).toEqual(["updated", remoteId]);
      remote = (await conn.get(remoteId))!;
      expect(remote.title).toBe(`${p.data.title} (modifié)`);
      expect(remote.variants.map((v) => v.id).sort()).toEqual(remote.variants.map((v) => v.id).sort());
      expect(remote.variants.find((v) => v.options[0] === "Nuit")!.id).toBe(nuit.id);
      expect((await conn.list()).filter((x) => x.handle === p.handle || x.title.startsWith(p.data.title)).length).toBe(1);

      // 4. Vente dans la boutique (stock Sable 10 → 7) pendant un réassort au Studio (Sable 10 → 15) : 7 + 5 = 12.
      const sable = remote.variants.find((v) => v.options[0] === "Sable")!;
      if (platform === "woocommerce") {
        const auth = "Basic " + Buffer.from(`${env("WOO_KEY")}:${env("WOO_SECRET")}`).toString("base64");
        const res = await fetch(`${env("WOO_URL")}/wp-json/wc/v3/products/${remoteId}/variations/${sable.id}`, { method: "PUT", headers: { Authorization: auth, "Content-Type": "application/json" }, body: JSON.stringify({ stock_quantity: 7 }) });
        expect(res.status).toBe(200);
      } else {
        const auth = "Basic " + Buffer.from(`${env("PS_KEY")}:`).toString("base64");
        const row = (await (await fetch(`${env("PS_URL")}/api/stock_availables?display=full&filter[id_product]=[${remoteId}]&filter[id_product_attribute]=[${sable.id}]&output_format=JSON`, { headers: { Authorization: auth } })).json() as { stock_availables: { id: number }[] }).stock_availables[0];
        const res = await fetch(`${env("PS_URL")}/api/stock_availables/${row.id}`, { method: "PATCH", headers: { Authorization: auth, "Content-Type": "application/xml" }, body: `<prestashop><stock_available><id>${row.id}</id><quantity>7</quantity></stock_available></prestashop>` });
        expect(res.status).toBe(200);
      }
      const local = getProduct(pid, p.id);
      setVariantStock(pid, local.variants.find((v) => v.options[0] === "Sable")!.id, 15);
      r = await syncProducts(pid, conn, { productIds: [p.id], imageUrl });
      expect(r.lines[0].error).toBeUndefined();
      expect(r.lines[0].stock.find((s) => s.variant === "Sable")).toMatchObject({ studio: 15, store: 7, result: 12, rule: "merged" });
      expect((await conn.get(remoteId))!.variants.find((v) => v.options[0] === "Sable")!.stock).toBe(12);
      expect(getProduct(pid, p.id).variants.find((v) => v.options[0] === "Sable")!.stock).toBe(12);
      // Le stock « Nuit » (non touché) reste celui de la boutique.
      expect((await conn.get(remoteId))!.variants.find((v) => v.options[0] === "Nuit")!.stock).toBe(5);

      // 5. Synchronisation sans changement : rien n'est renvoyé.
      r = await syncProducts(pid, conn, { productIds: [p.id], imageUrl });
      expect(r.lines[0].action).toBe("unchanged");

      // 6. Import des produits existants : le produit déjà relié n'est pas réimporté ; un second import n'ajoute rien.
      const before = listProducts(pid).length;
      const first = await importFromStore(pid, uid, conn);
      expect(first.lines.find((l) => l.remoteId === remoteId)?.action).toBe("unchanged");
      const afterFirst = listProducts(pid).length;
      expect(afterFirst).toBe(before + first.counts.imported);
      const second = await importFromStore(pid, uid, conn);
      expect(second.counts.imported).toBe(0);
      expect(listProducts(pid).length).toBe(afterFirst);
      // Correspondances uniques : un identifiant distant ↔ un seul produit du studio.
      const ids = linksOf(pid, platform).filter((l) => l.kind === "product").map((l) => l.remote_id);
      expect(new Set(ids).size).toBe(ids.length);
    }, 600_000);
  }
});
