/**
 * Shopify relié par l'application du client (recherche 04, 22 novembre 2026) : échange des deux identifiants contre un
 * jeton de 24 heures, droits comparés, jeton redemandé avant expiration, version 2026-10 et en-tête surveillé, produits
 * publiés sur la boutique en ligne, menus et pages légales, forfait Starter refusé avant tout envoi. Aucun appel réel :
 * Shopify est simulé.
 */
import { afterEach, describe, expect, it } from "vitest";

describe("Shopify par l'application du client", async () => {
  const A = await import("@/lib/integrations/shopify-app");
  const S = await import("@/lib/integrations/shopify");
  const { one } = await import("@/lib/db");
  const { getSetting } = await import("@/lib/settings");
  const { account, project } = await import("./conversation209-fixtures");
  afterEach(() => { delete A.shopifyAppDeps.fetch; });

  const ALL = A.DROITS_SHOPIFY.map((d) => d.droit).join(",");
  /** Faux Shopify : jetons, GraphQL (avec la version servie), et le journal des appels. */
  function faux(o: { scope?: string; versionServie?: string; refuse?: string } = {}) {
    const log: { url: string; body: any }[] = [];
    A.shopifyAppDeps.fetch = (async (url: string, init: any) => {
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : Object.fromEntries(new URLSearchParams(String(init?.body ?? "")));
      log.push({ url, body });
      if (url.endsWith("/admin/oauth/access_token")) {
        if (o.refuse) return new Response(JSON.stringify({ error: o.refuse }), { status: 400 });
        return new Response(JSON.stringify({ access_token: `jeton-${log.length}`, scope: o.scope ?? ALL, expires_in: 86399 }), { status: 200 });
      }
      const q = String(body.query);
      const data = /publications\(/.test(q) ? { publications: { nodes: [{ id: "gid://shopify/Publication/1", name: "Point of Sale" }, { id: "gid://shopify/Publication/2", name: "Online Store" }] } }
        : /publishablePublish/.test(q) ? { publishablePublish: { userErrors: [] } }
        : /menuCreate/.test(q) ? { menuCreate: { menu: { id: "m", handle: body.variables.handle }, userErrors: [] } }
        : /shopPolicyUpdate/.test(q) ? { shopPolicyUpdate: { shopPolicy: { id: "p" }, userErrors: [] } }
        : /plan\{/.test(q) ? { shop: { plan: { displayName: "Basic", partnerDevelopment: false } } } : {};
      return new Response(JSON.stringify({ data }), { status: 200, headers: { "x-shopify-api-version": o.versionServie ?? A.SHOPIFY_API_VERSION } });
    }) as never;
    return log;
  }

  it("relier : échange des identifiants, jeton chiffré, droits comparés ; le droit qui manque est dit en clair", async () => {
    const u = await account(), pid = project(u) as string;
    const log = faux({ scope: ALL.replace(",write_online_store_navigation", "") });
    const r = await A.relierAppShopify(u.id, pid, { shop: "ma-boutique.myshopify.com", clientId: "id-1", clientSecret: "secret-1" });
    expect(log[0].body).toEqual({ grant_type: "client_credentials", client_id: "id-1", client_secret: "secret-1" });
    expect(r.manque).toEqual([{ droit: "write_online_store_navigation", pourquoi: "créer tes menus" }]);
    const c = one<{ access_token: string; meta: string; expires_at: number }>("SELECT access_token, meta, expires_at FROM connections WHERE id=?", r.connectionId)!;
    expect(c.access_token).not.toContain("jeton"); // chiffré
    expect(c.meta).not.toContain("secret-1");
    expect(c.expires_at).toBeGreaterThan(Date.now() + 86_000_000);
    expect(A.droitsManquants(["write_locations", ...A.DROITS_SHOPIFY.filter((d) => d.droit !== "read_locations").map((d) => d.droit)])).toEqual([]);
    await expect(A.relierAppShopify(u.id, pid, { shop: "pas une boutique", clientId: "a", clientSecret: "b" })).rejects.toThrow(/myshopify\.com/);
    faux({ refuse: "shop_not_permitted" });
    await expect(A.relierAppShopify(u.id, pid, { shop: "autre.myshopify.com", clientId: "a", clientSecret: "b" })).rejects.toThrow(/créée dans ta propre boutique/);
  });

  it("un jeton frais avant chaque envoi ; version 2026-10 ; une autre version servie est notée pour l'administration", async () => {
    const u = await account(), pid = project(u) as string;
    faux();
    const r = await A.relierAppShopify(u.id, pid, { shop: "frais.myshopify.com", clientId: "id-2", clientSecret: "secret-2" });
    const row = () => one<any>("SELECT * FROM connections WHERE id=?", r.connectionId);
    // Encore valable : gardé tel quel.
    expect((await A.jetonFrais(row())).access_token).toBe(row().access_token);
    // Bientôt périmé : redemandé.
    const { run } = await import("@/lib/db");
    run("UPDATE connections SET expires_at=? WHERE id=?", Date.now() + 30_000, r.connectionId);
    const log = faux({ versionServie: "2026-01" });
    const before = row().access_token;
    await S.publierSurLaBoutique(row(), ["gid://shopify/Product/1"]);
    expect(log[0].url).toBe("https://frais.myshopify.com/admin/oauth/access_token");
    expect(row().access_token).not.toBe(before);
    expect(log[1].url).toBe(`https://frais.myshopify.com/admin/api/2026-10/graphql.json`);
    expect(getSetting("shopify.apiVersionServed")).toBe("2026-01 (demandée : 2026-10)");
  });

  it("produits publiés sur la boutique en ligne ; menus créés ; pages légales envoyées, jamais avec un trou ; Starter refusé", async () => {
    const u = await account(), pid = project(u) as string;
    faux();
    const r = await A.relierAppShopify(u.id, pid, { shop: "pub.myshopify.com", clientId: "id-3", clientSecret: "secret-3" });
    const c = one<any>("SELECT * FROM connections WHERE id=?", r.connectionId);
    const log = faux();
    expect(await S.publierSurLaBoutique(c, ["gid://shopify/Product/1", "gid://shopify/Collection/2"])).toEqual({ publies: 2, erreurs: [] });
    expect(log.filter((x) => /publishablePublish/.test(x.body.query)).map((x) => x.body.variables.input)).toEqual([[{ publicationId: "gid://shopify/Publication/2" }], [{ publicationId: "gid://shopify/Publication/2" }]]);
    const spec: any = { store: { menus: { "main-menu": { title: "Menu principal", links: [{ title: "Boutique", url: "/collections/all" }] }, vide: { title: "x", links: [] } }, policies: [{ handle: "refund-policy", title: "Remboursement", body_html: "<p>14 jours.</p>" }, { handle: "legal-notice", title: "Mentions légales", body_html: "<p>[À compléter : médiateur]</p>" }] } };
    expect(await S.pushMenus(c, spec)).toEqual(["main-menu"]);
    expect(await S.pushPolicies(c, spec)).toEqual({ faites: ["Remboursement"], aCompleter: ["Mentions légales"] });
    expect(log.find((x) => /shopPolicyUpdate/.test(x.body.query))!.body.variables.shopPolicy).toEqual({ type: "REFUND_POLICY", body: "<p>14 jours.</p>" });
    expect(A.forfaitRefuse({ displayName: "Starter" })).toMatch(/passe au forfait Basic au moins/);
    expect(A.forfaitRefuse({ displayName: "Basic" })).toBeNull();
  });
});
