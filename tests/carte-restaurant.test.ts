/**
 * Carte d'un restaurant (#239, phase 2) : saisie une fois (catégories, plats, prix, allergènes déclarés, disponibilité,
 * sélection du moment) → page « La carte » et sélection du moment du thème TABLE SAISON ; sans carte, rendu identique ;
 * brouillon, indisponible et archivé absents ; contrôles (prix, photo du projet, catégorie non vide) ; site hébergé :
 * V1 → modification → V2 → restauration ; droits. Aucun réseau.
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
import { currentTheme, saveThemeVersion } from "@/lib/projects";
import { renderPage } from "@/lib/theme/render";
import { compileTheme } from "@/lib/theme/compile";
import { setRdvLive } from "@/lib/rendez-vous";
import { addCategory, createItem, deleteCategory, setItemStatus, updateItem } from "@/lib/contenus/carte";
import { withContenus } from "@/lib/contenus";
import { publishSite, restorePublication, siteFreshness } from "@/lib/sites/publish";
import { serveSite } from "@/lib/sites/serve";
import { studioAddress } from "@/lib/sites/store";
import * as route from "@/app/api/projects/[id]/carte/route";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { serviceSpec } from "./fixtures";
import { completeSite, payingUser } from "./sites-fixtures";
import type { ThemeSpec } from "@/lib/theme/spec";

const fr = <T>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
const scoped = <T>(fn: () => Promise<T>) => withAccessScope({ kind: "http" }, fn);
beforeEach(() => { vi.stubEnv("SITES_DOMAIN", "sites.test"); vi.stubEnv("APP_URL", "https://studio.test"); vi.stubGlobal("fetch", async () => { throw new Error("Réseau interdit"); }); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

async function restaurant(label: string) {
  const u = await payingUser(label);
  const pid = seedHoldout(u.id, 2, `Restaurant ${label}`);
  // Images de la fixture (es-hero.jpg…) absentes des fichiers : retirées, sinon la publication les refuserait à juste titre.
  const spec = JSON.parse(JSON.stringify(serviceSpec("table-saison" as never)).replace(/"es-(hero|scene-\d)\.jpg"/g, '""')) as ThemeSpec;
  saveThemeVersion(pid, completeSite(spec, `Restaurant ${label}`), "test", "user");
  const photo = async (color: string) => (await saveAsset({ projectId: pid, userId: u.id, data: await sharp({ create: { width: 400, height: 300, channels: 3, background: color } }).jpeg().toBuffer(), name: `plat-${color}.jpg`, mime: "image/jpeg", origin: "upload", status: "approved" })).id;
  return { uid: u.id, pid, photo };
}
const carteHtml = async (spec: ThemeSpec) => {
  const page = spec.store.pages.find((p) => p.template_suffix === "ts-carte")!;
  return (await renderPage({ spec, base: "", files: compileTheme(spec), cart: [] }, `/pages/${page.handle}`, new URLSearchParams())).html;
};

describe("Carte : une saisie, la page du thème", () => {
  it("sans carte : le thème n'est pas touché (même objet, rendu identique)", async () => {
    const r = await restaurant("vide");
    const spec = currentTheme(r.pid)!.spec as ThemeSpec;
    expect(withContenus(spec, r.pid)).toBe(spec);
  });

  it("catégories et plats publiés dans « La carte » et la sélection du moment ; brouillon, indisponible, archivé absents", async () => {
    const r = await restaurant("carte");
    const entrees = addCategory(r.pid, "Entrées");
    const plats = addCategory(r.pid, "Plats");
    const ph = await r.photo("#a85");
    const velouté = createItem(r.pid, { categoryId: entrees.id, name: "Velouté de potimarron", description: "Crème légère, graines torréfiées", price: 9, vegetarian: true, allergens: "lait, graines de courge" });
    const tartare = createItem(r.pid, { categoryId: entrees.id, name: "Tartare de truite", price: 12.5 });
    const daube = createItem(r.pid, { categoryId: plats.id, name: "Daube provençale", priceText: "selon arrivage", featured: true, photo: ph, allergens: "céleri" });
    const brouillon = createItem(r.pid, { categoryId: plats.id, name: "Plat en préparation", price: 20 });
    const archive = createItem(r.pid, { categoryId: plats.id, name: "Ancien plat", price: 18 });
    for (const i of [velouté, tartare, daube, archive]) setItemStatus(r.pid, i.id, "published");
    setItemStatus(r.pid, archive.id, "archived");
    updateItem(r.pid, tartare.id, { available: false });
    const spec = withContenus(currentTheme(r.pid)!.spec as ThemeSpec, r.pid);
    expect(spec.store.pages.find((p) => p.template_suffix === "ts-carte")!.status).toBe("published");
    const html = await carteHtml(spec);
    for (const s of ["Entrées", "Plats", "Velouté de potimarron", "9 €", "Allergènes : lait, graines de courge", "Daube provençale", "selon arrivage"]) expect(html, s).toContain(s);
    for (const s of ["Tartare de truite", "Plat en préparation", "Ancien plat"]) expect(html, s).not.toContain(s);
    // Sélection du moment : le plat mis en avant, avec sa photo du projet.
    const dishes = Object.values(spec.templates).flatMap((t) => Object.values(t.sections)).filter((s) => s.type === "ts-dishes" && !s.disabled);
    expect(dishes.length).toBeGreaterThan(0);
    expect(Object.values(dishes[0].blocks ?? {}).map((b) => b.settings?.name)).toEqual(["Daube provençale"]);
    expect(Object.keys(spec.files).some((f) => f.startsWith("es-carte-"))).toBe(true);
    // Aperçu d'un brouillon : ce plat seul s'ajoute.
    expect(await carteHtml(withContenus(currentTheme(r.pid)!.spec as ThemeSpec, r.pid, { plat: brouillon.id }))).toContain("Plat en préparation");
  });

  it("contrôles : prix ou mention pour publier, photo du projet seulement, catégorie non vide non supprimée", async () => {
    const r = await restaurant("controles");
    const other = await restaurant("autre");
    const c = addCategory(r.pid, "Desserts");
    const sans = createItem(r.pid, { categoryId: c.id, name: "Tarte du jour" });
    expect(() => setItemStatus(r.pid, sans.id, "published")).toThrow(/prix ou une mention/);
    const foreignPhoto = await other.photo("#333");
    expect(() => createItem(r.pid, { categoryId: c.id, name: "Crème brûlée", price: 7, photo: foreignPhoto })).toThrow(/n'appartient pas/);
    expect(() => deleteCategory(r.pid, c.id)).toThrow(/contient encore des plats/);
  });
});

describe("Site hébergé et droits", () => {
  it("V1 → plat modifié (site inchangé, « non publié ») → V2 → restauration V1", async () => {
    const r = await restaurant("heberge");
    fr(() => setRdvLive(r.pid, true));
    const c = addCategory(r.pid, "Plats");
    const plat = createItem(r.pid, { categoryId: c.id, name: "Risotto aux cèpes", price: 19 });
    setItemStatus(r.pid, plat.id, "published");
    const v1 = await fr(() => publishSite(r.pid, r.uid));
    const host = studioAddress(r.pid)!.hostname;
    const page = (currentTheme(r.pid)!.spec as ThemeSpec).store.pages.find((p) => p.template_suffix === "ts-carte")!;
    const get = async () => (await scoped(() => serveSite(new Request(`https://${host}/pages/${page.handle}`, { headers: { host } }), host, `/pages/${page.handle}`))).text();
    expect(await get()).toContain("19 €");
    updateItem(r.pid, plat.id, { price: 21 });
    expect(siteFreshness(r.pid)).toMatchObject({ upToDate: false, changedCarte: 1 });
    expect(await get()).toContain("19 €");
    await fr(() => publishSite(r.pid, r.uid));
    expect(await get()).toContain("21 €");
    await fr(async () => restorePublication(r.pid, v1.id, r.uid));
    expect(await get()).toContain("19 €");
  }, 180_000);

  it("compte étranger : ni lecture ni modification de la carte", async () => {
    const r = await restaurant("droits");
    const other = await payingUser("etranger");
    const ctx = { params: Promise.resolve({ id: r.pid }) };
    const login = (u: string) => { jar.token = id(); run("INSERT INTO sessions(id,user_id,expires_at,created_at) VALUES(?,?,?,?)", sha256(jar.token), u, now() + 3600000, now()); };
    const req = (method: string, body?: unknown) => new Request(`http://localhost/api/projects/${r.pid}/carte`, { method, headers: { "content-type": "application/json", origin: "http://localhost" }, body: body ? JSON.stringify(body) : undefined });
    login(other.id);
    expect([403, 404]).toContain((await scoped(() => route.GET(req("GET"), ctx))).status);
    expect([403, 404]).toContain((await scoped(() => route.POST(req("POST", { action: "category-add", title: "Pirate" }), ctx))).status);
    login(r.uid);
    const ok = await scoped(() => route.POST(req("POST", { action: "category-add", title: "Entrées" }), ctx));
    expect(ok.status).toBe(200);
  });
});
