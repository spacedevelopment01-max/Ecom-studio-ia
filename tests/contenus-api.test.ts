/**
 * Intégration des contenus métier (#239, phase 4) : espaces du studio selon le métier ; API native commune (biens,
 * plats, réalisations, prestations) avec droits, versions et consentement ; adresse unique entre profil et
 * réservation ; export qui dit que les contenus sont copiés sans synchronisation. Aucun réseau.
 */
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const jar = { token: "" };
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (jar.token ? { value: jar.token } : undefined), set: () => {}, delete: () => {} }), headers: async () => new Headers() }));
import { id, now, run } from "@/lib/db";
import { sha256 } from "@/lib/secrets";
import { runWithLang } from "@/lib/i18n-server";
import { withAccessScope } from "@/lib/access-scope";
import { saveAsset } from "@/lib/library";
import { currentTheme, loadProject, saveThemeVersion } from "@/lib/projects";
import { spaceVisible } from "@/lib/studio-nav";
import { readPrestations, savePrestations } from "@/lib/contenus/prestations";
import { createRealisation, setRealisationStatus } from "@/lib/contenus/realisations";
import { withContenus } from "@/lib/contenus";
import { cmsExport } from "@/lib/cms-v2/export";
import { libraryLoader } from "@/lib/theme/loader";
import * as manifest from "@/app/api/projects/[id]/contenus/route";
import * as list from "@/app/api/projects/[id]/contenus/[type]/route";
import * as item from "@/app/api/projects/[id]/contenus/[type]/[itemId]/route";
import * as project from "@/app/api/projects/[id]/route";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { serviceProfile, serviceSpec } from "./fixtures";
import { completeSite, payingUser } from "./sites-fixtures";
import type { ThemeSpec } from "@/lib/theme/spec";

const fr = <T>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
const scoped = <T>(fn: () => Promise<T>) => withAccessScope({ kind: "http" }, fn);
beforeEach(() => { vi.stubEnv("SITES_DOMAIN", "sites.test"); vi.stubEnv("APP_URL", "https://studio.test"); vi.stubGlobal("fetch", async () => { throw new Error("Réseau interdit"); }); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); jar.token = ""; });
const login = (u: string) => { jar.token = id(); run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(jar.token), u, now() + 3600000, now()); };
const call = async (mod: { GET?: unknown; POST?: unknown; PATCH?: unknown }, method: "GET" | "POST" | "PATCH", params: Record<string, string>, body?: unknown) => {
  const handler = (mod as Record<string, (r: Request, c: { params: Promise<Record<string, string>> }) => Promise<Response>>)[method];
  const res = await scoped(() => handler(new Request("http://localhost/api/x", { method, headers: { "content-type": "application/json", origin: "http://localhost" }, body: body ? JSON.stringify(body) : undefined }), { params: Promise.resolve(params) }));
  return { status: res.status, body: (await res.json().catch(() => ({}))) as Record<string, any> };
};
async function site(label: string, direction: string) {
  const u = await payingUser(label);
  const pid = seedHoldout(u.id, 2, `Entreprise ${label}`);
  const spec = JSON.parse(JSON.stringify(serviceSpec(direction as never, "fr", { ...serviceProfile, contactMode: "quote" })).replace(/"es-(hero|scene-\d)\.jpg"/g, '""')) as ThemeSpec;
  saveThemeVersion(pid, completeSite(spec, `Entreprise ${label}`), "test", "user");
  const photo = async () => (await saveAsset({ projectId: pid, userId: u.id, data: await sharp({ create: { width: 300, height: 200, channels: 3, background: "#7a6" } }).jpeg().toBuffer(), name: "chantier.jpg", mime: "image/jpeg", origin: "upload", status: "approved" })).id;
  return { uid: u.id, pid, photo };
}

describe("Espaces du studio selon le métier", () => {
  it("chaque métier voit ses contenus, pas ceux des autres ; un site de services n'a pas de Catalogue", () => {
    const v = (id: string, p: Parameters<typeof spaceVisible>[1]) => spaceVisible(id, p);
    expect(v("biens", { business: "services", direction: "maison-horizon" })).toBe(true);
    expect(v("carte", { business: "services", direction: "maison-horizon" })).toBe(false);
    expect(v("carte", { business: "services", direction: "table-saison" })).toBe(true);
    for (const d of ["aplat", "phase", "rive"]) expect(v("realisations", { business: "services", direction: d })).toBe(true);
    expect(v("realisations", { business: "products", direction: "fraise" })).toBe(false);
    expect(v("catalogue", { business: "services", direction: "aplat" })).toBe(false);
    expect(v("catalogue", { business: "products", direction: "fraise" })).toBe(true);
    // Rendez-vous : thèmes qui réservent, ou mode de contact « réservation » ; un artisan sur devis ne le voit pas.
    expect(v("rendez-vous", { business: "services", direction: "atelier-nuance" })).toBe(true);
    expect(v("rendez-vous", { business: "services", direction: "aplat", contactModes: ["quote"] })).toBe(false);
    expect(v("rendez-vous", { business: "services", direction: "aplat", contactModes: ["quote", "booking"] })).toBe(true);
    expect(v("rendez-vous", { business: "products", direction: "fraise" })).toBe(true);
    expect(v("images", { business: "services", direction: "aplat" })).toBe(true);
  });
});

describe("API native des contenus (réutilisable par SYNA)", () => {
  it("manifeste, création en brouillon, consentement, versions, site jamais publié par l'API", async () => {
    const a = await site("api", "aplat");
    login(a.uid);
    const m = await call(manifest, "GET", { id: a.pid });
    expect(m.status).toBe(200);
    expect(m.body.types.map((t: { type: string }) => t.type)).toEqual(["realisations"]);
    const ph = await a.photo();
    const c = await call(list, "POST", { id: a.pid, type: "realisations" }, { action: "create", data: { title: "Façade", summary: "Enduit à la chaux.", photos: [{ assetId: ph, alt: "Façade" }] } });
    expect(c.status).toBe(201);
    expect(c.body.item).toMatchObject({ type: "realisations", status: "draft", missing: [] });
    const rid = c.body.item.id, v1 = c.body.item.version;
    // Publier sans l'accord explicite : refusé, rien ne change.
    const noConsent = await call(item, "POST", { id: a.pid, type: "realisations", itemId: rid }, { action: "publish" });
    expect(noConsent.status).toBe(428);
    expect((await call(item, "GET", { id: a.pid, type: "realisations", itemId: rid })).body.item.status).toBe("draft");
    // Modification avec une version périmée : refusée.
    await new Promise((r) => setTimeout(r, 5));
    const upd = await call(item, "PATCH", { id: a.pid, type: "realisations", itemId: rid }, { data: { summary: "Enduit à la chaux, deux passes." }, ifVersion: v1 });
    expect(upd.status).toBe(200);
    const stale = await call(item, "PATCH", { id: a.pid, type: "realisations", itemId: rid }, { data: { summary: "Autre" }, ifVersion: v1 });
    expect(stale.status).toBe(409);
    const pub = await call(item, "POST", { id: a.pid, type: "realisations", itemId: rid }, { action: "publish", confirm: true });
    expect(pub.status).toBe(200);
    expect(pub.body.item.status).toBe("published");
    expect(pub.body.site).toMatchObject({ live: false });
    // Saisie invalide : 400 lisible ; type inconnu : 404 ; état inconnu : 400.
    expect((await call(list, "POST", { id: a.pid, type: "realisations" }, { action: "create", data: { title: "" } })).status).toBe(400);
    expect((await call(list, "GET", { id: a.pid, type: "pirates" })).status).toBe(404);
    expect((await call(item, "POST", { id: a.pid, type: "realisations", itemId: rid }, { action: "status", status: "vendu", confirm: true })).status).toBe(400);
    const ls = await call(list, "GET", { id: a.pid, type: "realisations" });
    expect(ls.body.items).toHaveLength(1);
  });

  it("droits : compte étranger 404, visiteur non connecté 401, sur toutes les routes", async () => {
    const a = await site("droits-api", "phase");
    const r = createRealisation(a.pid, { title: "Tableau", summary: "x", photos: [{ assetId: await a.photo(), alt: "" }] });
    const other = await payingUser("etranger-api");
    for (const who of [other.id, null]) {
      if (who) login(who); else jar.token = "";
      const expected = who ? [403, 404] : [401];
      expect(expected).toContain((await call(manifest, "GET", { id: a.pid })).status);
      expect(expected).toContain((await call(list, "GET", { id: a.pid, type: "realisations" })).status);
      expect(expected).toContain((await call(list, "POST", { id: a.pid, type: "realisations" }, { action: "create", data: { title: "Pirate" } })).status);
      expect(expected).toContain((await call(item, "GET", { id: a.pid, type: "realisations", itemId: r.id })).status);
      expect(expected).toContain((await call(item, "PATCH", { id: a.pid, type: "realisations", itemId: r.id }, { data: { title: "Pirate" } })).status);
      expect(expected).toContain((await call(item, "POST", { id: a.pid, type: "realisations", itemId: r.id }, { action: "publish", confirm: true })).status);
    }
    login(a.uid);
    expect((await call(item, "GET", { id: a.pid, type: "realisations", itemId: r.id })).body.item.title).toBe("Tableau");
  });

  it("restaurant : plats et prestations par la même API ; prestations sans état de publication", async () => {
    const a = await site("resto-api", "table-saison");
    login(a.uid);
    const m = await call(manifest, "GET", { id: a.pid });
    expect(m.body.types.map((t: { type: string }) => t.type).sort()).toEqual(["plats", "prestations"]);
    const p = await call(item, "GET", { id: a.pid, type: "prestations", itemId: "prestations" });
    expect(p.status).toBe(200);
    expect((await call(item, "POST", { id: a.pid, type: "prestations", itemId: "prestations" }, { action: "publish", confirm: true })).status).toBe(405);
    const up = await call(item, "PATCH", { id: a.pid, type: "prestations", itemId: "prestations" }, { data: { address: "4 quai Fictif, 69005 Lyon" }, ifVersion: p.body.item.version });
    expect(up.status).toBe(200);
    expect(up.body.item.data.address).toBe("4 quai Fictif, 69005 Lyon");
  });
});

describe("Adresse unique entre le profil d'activité et la réservation", () => {
  it("modifiée dans l'éditeur des prestations → profil ; modifiée dans le profil → réservation (nouvelle version)", async () => {
    const a = await site("adresse", "atelier-nuance");
    fr(() => savePrestations(a.pid, { address: "8 place Fictive, 69002 Lyon" }));
    expect(loadProject(a.pid).services.address).toBe("8 place Fictive, 69002 Lyon");
    login(a.uid);
    const sv = loadProject(a.pid).services;
    const before = currentTheme(a.pid)!.version.number;
    const res = await call(project, "PATCH", { id: a.pid }, { services: { ...sv, address: "12 rue Nouvelle, 69003 Lyon", services: sv.services.map((s) => ({ name: s.name, description: s.description })) } });
    expect(res.status).toBe(200);
    expect(fr(() => readPrestations(a.pid))!.address).toBe("12 rue Nouvelle, 69003 Lyon");
    expect(currentTheme(a.pid)!.version.number).toBe(before + 1);
    // Même adresse renvoyée : aucune nouvelle version.
    await call(project, "PATCH", { id: a.pid }, { services: { ...loadProject(a.pid).services, services: sv.services.map((s) => ({ name: s.name, description: s.description })) } });
    expect(currentTheme(a.pid)!.version.number).toBe(before + 1);
  });
});

describe("Export : contenus copiés, sans compatibilité annoncée", () => {
  it("avec des réalisations publiées, l'export le signale ; sans, rien", async () => {
    const a = await site("export", "aplat");
    const spec0 = currentTheme(a.pid)!.spec as ThemeSpec;
    const issues = async (spec: ThemeSpec) => (await fr(() => cmsExport("shopify", spec, libraryLoader, { projectId: a.pid }))).issues.map((i) => i.code);
    expect(await issues(withContenus(spec0, a.pid))).not.toContain("business_content_static");
    const r = createRealisation(a.pid, { title: "Plafond", summary: "Plafond jointoyé.", photos: [{ assetId: await a.photo(), alt: "" }] });
    setRealisationStatus(a.pid, r.id, "published");
    const exp = await fr(() => cmsExport("shopify", withContenus(spec0, a.pid), libraryLoader, { projectId: a.pid }));
    expect(exp.issues.find((i) => i.code === "business_content_static")?.detail).toMatch(/aucune synchronisation automatique/);
    for (const platform of ["woocommerce", "prestashop"] as const) {
      const e = await fr(() => cmsExport(platform, withContenus(spec0, a.pid), libraryLoader, { projectId: a.pid }));
      expect(e.issues.map((i) => i.code), platform).toContain("business_content_static");
    }
  }, 180_000);
});
