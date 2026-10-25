/**
 * Intégration #194 — isolation A/B des routes arrivées après le lot 9 (#176 produits, boutiques, synchronisation,
 * rendez-vous, biens ; #176/#193 administration des droits de thèmes et Higgsfield). Comptes et données fictifs,
 * aucun appel réseau. Même matrice que tests/mission171-scope-inputs.test.ts : A autorisé, B, administrateur et
 * visiteur non connecté refusés, sans rien révéler ni modifier.
 */
import { it, expect, vi, beforeEach, afterEach } from "vitest";
const jar = { token: "" };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }) }));
import { createUser } from "@/lib/auth";
import { id, now, run } from "@/lib/db";
import { sha256 } from "@/lib/secrets";
import { createProduct, getProduct } from "@/lib/products/catalog";
import { createBien, getBien } from "@/lib/biens";
import * as products from "@/app/api/projects/[id]/products/route";
import * as stores from "@/app/api/projects/[id]/products/stores/route";
import * as sync from "@/app/api/projects/[id]/products/sync/route";
import * as rdv from "@/app/api/projects/[id]/rendez-vous/route";
import * as biens from "@/app/api/projects/[id]/biens/route";
import * as biensOrdre from "@/app/api/projects/[id]/biens/ordre/route";
import * as bien from "@/app/api/projects/[id]/biens/[bid]/route";
import * as higgsfield from "@/app/api/admin/higgsfield/route";
import * as themeRights from "@/app/api/admin/theme-rights/route";

async function fixture(role = "client") {
  const u = await createUser(`integ194-${id()}@example.test`, "Mot-de-passe-fictif", "Compte fictif");
  run("UPDATE users SET role=? WHERE id=?", role, u.id);
  const pid = id();
  run("INSERT INTO projects(id,user_id,name,created_at,updated_at) VALUES(?,?,?,?,?)", pid, u.id, "Projet de recette", now(), now());
  const product = createProduct(pid, { title: `Produit-secret-${pid}`, price: 1900, variants: [{ options: [], sku: `SKU-${pid}`, stock: 7 }] });
  const b = createBien(u.id, pid, { transaction: "vente", ref: `REF-${pid}`, data: { title: `Bien-secret-${pid}` } });
  return { u, pid, product, bien: b };
}
function login(uid?: string) {
  jar.token = uid ? id() : "";
  if (uid) run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(jar.token), uid, now() + 3600000, now());
}
beforeEach(() => { jar.token = ""; vi.stubGlobal("fetch", async () => { throw new Error("External calls prohibited"); }); });
afterEach(() => { vi.unstubAllGlobals(); });

type Call = { name: string; run: (a: Awaited<ReturnType<typeof fixture>>) => Promise<Response>; read?: boolean };
const req = (path: string, method = "GET", payload?: unknown) => new Request(`http://localhost${path}`, { method, headers: { "content-type": "application/json", origin: "http://localhost" }, body: payload === undefined ? undefined : JSON.stringify(payload) });
const ctx = (pid: string) => ({ params: Promise.resolve({ id: pid }) });
const calls: Call[] = [
  { name: "produits GET", read: true, run: (a) => products.GET(req(`/api/projects/${a.pid}/products`), ctx(a.pid)) },
  { name: "produits POST", run: (a) => products.POST(req(`/api/projects/${a.pid}/products`, "POST", { title: "Intrus" }), ctx(a.pid)) },
  { name: "produits PATCH (stock)", run: (a) => products.PATCH(req(`/api/projects/${a.pid}/products`, "PATCH", { id: a.product.id, stock: { variant: a.product.variants[0].id, value: 999 } }), ctx(a.pid)) },
  { name: "boutiques GET", read: true, run: (a) => stores.GET(req(`/api/projects/${a.pid}/products/stores`), ctx(a.pid)) },
  { name: "boutiques POST", run: (a) => stores.POST(req(`/api/projects/${a.pid}/products/stores`, "POST", { platform: "woocommerce", url: "https://93.184.216.34", key: "k", secret: "s" }), ctx(a.pid)) },
  { name: "boutiques DELETE", run: (a) => stores.DELETE(req(`/api/projects/${a.pid}/products/stores?id=x`, "DELETE"), ctx(a.pid)) },
  { name: "synchronisation POST", run: (a) => sync.POST(req(`/api/projects/${a.pid}/products/sync`, "POST", { storeId: "x", action: "push" }), ctx(a.pid)) },
  { name: "rendez-vous GET", read: true, run: (a) => rdv.GET(req(`/api/projects/${a.pid}/rendez-vous`), ctx(a.pid)) },
  { name: "rendez-vous POST", run: (a) => rdv.POST(req(`/api/projects/${a.pid}/rendez-vous`, "POST", {}), ctx(a.pid)) },
  { name: "biens GET", read: true, run: (a) => biens.GET(req(`/api/projects/${a.pid}/biens`), ctx(a.pid)) },
  { name: "biens POST", run: (a) => biens.POST(req(`/api/projects/${a.pid}/biens`, "POST", { transaction: "vente" }), ctx(a.pid)) },
  { name: "biens ordre POST", run: (a) => biensOrdre.POST(req(`/api/projects/${a.pid}/biens/ordre`, "POST", { ids: [a.bien.id] }), ctx(a.pid)) },
  { name: "bien GET", read: true, run: (a) => bien.GET(req(`/api/projects/${a.pid}/biens/${a.bien.id}`), { params: Promise.resolve({ id: a.pid, bid: a.bien.id }) }) },
  { name: "bien PATCH", run: (a) => bien.PATCH(req(`/api/projects/${a.pid}/biens/${a.bien.id}`, "PATCH", { status: "archived" }), { params: Promise.resolve({ id: a.pid, bid: a.bien.id }) }) },
];

for (const c of calls) {
  it(`${c.name} : A autorisé, B/administrateur/non connecté refusés sans rien révéler ni modifier`, async () => {
    const a = await fixture(), b = await fixture(), admin = await fixture("admin");
    for (const [uid, status] of [[b.u.id, 404], [admin.u.id, 404], [undefined, 401]] as const) {
      login(uid);
      const r = await c.run(a);
      expect(r.status, `${c.name} pour ${uid ?? "visiteur"}`).toBe(status);
      const text = await r.text();
      for (const secret of [a.pid, a.product.id, `Produit-secret-${a.pid}`, `Bien-secret-${a.pid}`, `SKU-${a.pid}`]) expect(text).not.toContain(secret);
    }
    expect(getProduct(a.pid, a.product.id).variants[0].stock).toBe(7);
    expect(getProduct(a.pid, a.product.id).data.title).toBe(`Produit-secret-${a.pid}`);
    expect(getBien(a.pid, a.bien.id).status).toBe(a.bien.status);
    if (c.read) { login(a.u.id); expect((await c.run(a)).status).toBe(200); }
  });
}

it("B ne modifie pas le produit ni le bien de A par son propre projet (identifiants de A)", async () => {
  const a = await fixture(), b = await fixture();
  login(b.u.id);
  const r1 = await products.PATCH(req(`/api/projects/${b.pid}/products`, "PATCH", { id: a.product.id, stock: { variant: a.product.variants[0].id, value: 999 }, product: { title: "Volé" } }), ctx(b.pid));
  expect(r1.status).toBeGreaterThanOrEqual(400);
  const r2 = await bien.PATCH(req(`/api/projects/${b.pid}/biens/${a.bien.id}`, "PATCH", { status: "archived" }), { params: Promise.resolve({ id: b.pid, bid: a.bien.id }) });
  expect(r2.status).toBe(404);
  const r3 = await bien.GET(req(`/api/projects/${b.pid}/biens/${a.bien.id}`), { params: Promise.resolve({ id: b.pid, bid: a.bien.id }) });
  expect(r3.status).toBe(404);
  expect(await r3.text()).not.toContain(`Bien-secret-${a.pid}`);
  expect(getProduct(a.pid, a.product.id).variants[0].stock).toBe(7);
  expect(getProduct(a.pid, a.product.id).data.title).toBe(`Produit-secret-${a.pid}`);
  expect(getBien(a.pid, a.bien.id).status).toBe(a.bien.status);
});

it("administration des droits de thèmes et de Higgsfield : client refusé (403), visiteur refusé (401)", async () => {
  const a = await fixture();
  for (const [uid, status] of [[a.u.id, 403], [undefined, 401]] as const) {
    login(uid);
    expect((await higgsfield.GET()).status).toBe(status);
    expect((await higgsfield.POST(req("/api/admin/higgsfield", "POST", {}))).status).toBe(status);
    expect((await themeRights.GET()).status).toBe(status);
    expect((await themeRights.POST(req("/api/admin/theme-rights", "POST", { plans: {} }))).status).toBe(status);
  }
});
