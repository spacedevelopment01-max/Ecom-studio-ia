/**
 * Les ventes et les visites (recherche 08, 22 novembre 2026) : le compteur du Studio dans l'exemption de la CNIL (pages
 * vues seulement, rangées par client, refus possible, effacées à 25 mois), les commandes et visites Shopify, les commandes
 * WooCommerce et son bouton d'autorisation. Aucun appel réel.
 */
import { afterEach, describe, expect, it } from "vitest";

describe("ventes et visites", async () => {
  const V = await import("@/lib/sites/visites");
  const S = await import("@/lib/integrations/ventes");
  const A = await import("@/lib/integrations/shopify-app");
  const { all, one } = await import("@/lib/db");
  afterEach(() => { delete A.shopifyAppDeps.fetch; });

  it("compteur : pages vues par jour et par page, rien d'autre ; robots et refus non comptés ; effacé à 25 mois", () => {
    const pid = `visites-${Math.random()}`;
    const req = (h: Record<string, string> = {}) => new Request("https://site.test/", { headers: h });
    expect(V.aCompter(req({ "user-agent": "Mozilla/5.0" }))).toBe(true);
    expect(V.aCompter(req({ "user-agent": "Googlebot/2.1" }))).toBe(false);
    expect(V.aCompter(req({ cookie: `a=b; ${V.REFUS}=1` }))).toBe(false);
    V.compterVue(pid, "/", Date.UTC(2026, 10, 20)); V.compterVue(pid, "/", Date.UTC(2026, 10, 20)); V.compterVue(pid, "/pages/contact", Date.UTC(2026, 10, 21));
    V.compterVue(pid, "/", Date.UTC(2024, 0, 1));
    expect(V.visitesDe(pid, "2026-11-01", "2026-11-30")).toEqual({ vues: 3, parJour: [{ jour: "2026-11-20", vues: 2 }, { jour: "2026-11-21", vues: 1 }], pages: [{ page: "/", vues: 2 }, { page: "/pages/contact", vues: 1 }] });
    V.purgerVisites(Date.UTC(2026, 10, 22));
    expect(one<{ n: number }>("SELECT COUNT(*) n FROM visites WHERE project_id=? AND jour < '2024-11-01'", pid)!.n).toBe(0);
    // Aucune colonne ne garde une adresse, un navigateur ou un identifiant.
    const cols = all<{ name: string }>("PRAGMA table_info(visites)").map((c) => c.name);
    expect(cols).toEqual(["project_id", "jour", "page", "vues"]);
    const r = V.pageRefus("https://site.test");
    expect(r.headers.get("set-cookie")).toMatch(new RegExp(`^${V.REFUS}=1; Path=/; Max-Age=\\d+; SameSite=Lax; Secure$`));
    expect(V.MENTION_MESURE).toMatch(/sans traceur ni adresse.*25 mois.*\/__ne-pas-compter/);
  });

  it("Shopify : commandes de la période (annulées exclues) et visites humaines, chacune avec sa source", async () => {
    const calls: any[] = [];
    A.shopifyAppDeps.fetch = (async (_u: string, init: any) => {
      const b = JSON.parse(init.body); calls.push(b);
      const data = /orders\(/.test(b.query)
        ? { orders: { nodes: [{ cancelledAt: null, totalPriceSet: { shopMoney: { amount: "45.00", currencyCode: "EUR" } } }, { cancelledAt: "x", totalPriceSet: { shopMoney: { amount: "99.00", currencyCode: "EUR" } } }, { cancelledAt: null, totalPriceSet: { shopMoney: { amount: "30.50", currencyCode: "EUR" } } }], pageInfo: { hasNextPage: false, endCursor: null } } }
        : { shopifyqlQuery: { tableData: { columns: [{ name: "sessions" }], rows: [[120], [80]] }, parseErrors: [] } };
      return new Response(JSON.stringify({ data }), { status: 200 });
    }) as never;
    const c: any = { id: "c", external_id: "b.myshopify.com", access_token: (await import("@/lib/secrets")).encrypt("jeton"), meta: "{}" };
    expect(await S.ventesShopify(c, "2026-11-01", "2026-11-30")).toEqual({ commandes: 2, total: 75.5, devise: "EUR", source: "commandes de ta boutique Shopify, du 2026-11-01 au 2026-11-30" });
    expect(calls[0].variables.q).toBe("created_at:>=2026-11-01 created_at:<=2026-11-30T23:59:59");
    expect(await S.visitesShopify(c, "2026-11-01", "2026-11-30")).toEqual({ visites: 200, source: "visites de ta boutique Shopify, du 2026-11-01 au 2026-11-30" });
    expect(calls[1].variables.q).toMatch(/FROM sessions SHOW sessions WHERE human_or_bot_session = 'human'/);
  });

  it("WooCommerce : commandes de la période ; le bouton d'autorisation porte, signés, le projet et la boutique", async () => {
    const fetcher = (async (url: string) => { expect(url).toMatch(/\/wp-json\/wc\/v3\/orders\?after=2026-11-01T00:00:00&before=2026-11-30T23:59:59&status=completed,processing/); return new Response(JSON.stringify([{ total: "20.00", currency: "EUR" }, { total: "15.00", currency: "EUR" }]), { status: 200 }); }) as never;
    expect(await S.ventesWoo({ url: "https://boutique.test", key: "k", secret: "s" }, "2026-11-01", "2026-11-30", fetcher)).toEqual({ commandes: 2, total: 35, devise: "EUR", source: "commandes de ta boutique WooCommerce, du 2026-11-01 au 2026-11-30" });
    const lien = new URL(S.lienAutorisationWoo("p1", "u1", "https://boutique.test/"));
    expect(lien.origin + lien.pathname).toBe("https://boutique.test/wc-auth/v1/authorize");
    expect(lien.searchParams.get("scope")).toBe("read_write");
    expect(S.etatAutorisationWoo(lien.searchParams.get("user_id")!)).toEqual({ projectId: "p1", userId: "u1", storeUrl: "https://boutique.test" });
    const signe = lien.searchParams.get("user_id")!, faux = signe.slice(0, -1) + (signe.endsWith("0") ? "1" : "0");
    expect(S.etatAutorisationWoo(faux)).toBeNull();
  });
});
