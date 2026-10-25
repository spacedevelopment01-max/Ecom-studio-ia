/**
 * TABLE SAISON (issue #175) : thème du catalogue (famille Services), démonstration complète d'après les cinq planches,
 * adaptation à un autre restaurant sans rien copier de la démonstration, rendu réel de toutes les pages.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createUser } from "@/lib/auth";
import { compileTheme } from "@/lib/theme/compile";
import { renderPage } from "@/lib/theme/render";
import { applyOps, validateSpec } from "@/lib/theme/ops";
import { currentTheme, saveThemeVersion } from "@/lib/projects";
import { ACTIVE_DIRECTIONS } from "@/lib/theme/directions";
import { themeKinds } from "@/lib/theme/theme-fit";
import { plansForTheme } from "@/lib/theme/theme-access";
import { libraryEntry } from "@/lib/theme/section-library";
import { runWithLang } from "@/lib/i18n-server";
import { TS_PAGES } from "@/lib/theme/table-saison";
import { tableSaisonProject, TS_MEDIA, TS_KIT_DIR } from "./table-saison-fixtures";
import { serviceSpec } from "./fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const types = (spec: { templates: Record<string, { order: string[]; sections: Record<string, { type: string; disabled?: boolean }> }> }, key: string) => spec.templates[key].order.map((id) => spec.templates[key].sections[id]).filter((s) => !s.disabled).map((s) => s.type);
const visibleText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("TABLE SAISON : thème restaurant du catalogue", () => {
  it("est actif, conçu pour les services, ouvert selon les droits par thème, avec ses 23 sections dans la bibliothèque (FR et EN)", () => {
    expect(ACTIVE_DIRECTIONS.map((d) => d.id)).toContain("table-saison");
    expect(themeKinds("table-saison")).toEqual(["services"]);
    // Plus de familles ni de rang (mission #190) : répartition par forfait encore à choisir, le thème est ouvert à tous.
    expect(plansForTheme("table-saison")).toEqual(["creer", "vendre", "dominer"]);
    const sections = fs.readdirSync(path.join("theme-base", "sections")).filter((f) => f.startsWith("ts-")).map((f) => f.replace(".liquid", ""));
    expect(sections).toHaveLength(23);
    for (const t of sections) { expect(libraryEntry(t, "fr")?.name, t).toBeTruthy(); expect(libraryEntry(t, "en")?.name, t).toBeTruthy(); }
  });

  it("les 61 photos du kit sont présentes en WebP (noms de MEDIAS.json)", () => {
    expect(TS_MEDIA).toHaveLength(61);
    for (const m of TS_MEDIA) expect(fs.existsSync(path.join(TS_KIT_DIR, `${m.file}.webp`)), m.file).toBe(true);
  });
});

describe("Démonstration TABLE SAISON (planches 01 à 05)", async () => {
  const user = await createUser(`table-saison-${Date.now()}@example.invalid`, "isolated-test-only", "Table Saison");
  const demo = await fr(() => tableSaisonProject(user.id));
  const { spec } = demo;
  const files = compileTheme(spec);
  const render = (route: string) => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams());

  it("composition de l'accueil dans l'ordre de la planche 01, toutes les photos importées", () => {
    expect(demo.missing).toEqual([]);
    expect(validateSpec(spec)).toEqual([]);
    expect(types(spec, "index")).toEqual(["ts-hero", "ts-split", "ts-dishes", "ts-teaser", "ts-split", "ts-ingredients", "ts-moments", "ts-banner", "ts-faq", "ts-banner"]);
    const used = JSON.stringify(spec.templates).match(/table-saison-[a-z0-9-]+\.webp/g) ?? [];
    for (const f of new Set(used)) expect(spec.files[f], f).toBeTruthy();
    // Toutes les scènes du kit servent quelque part (une photo par emplacement).
    for (const m of TS_MEDIA) expect(used, m.file).toContain(`table-saison-${m.file}.webp`);
    expect(Object.values(spec.groups.header.sections).map((s) => s.type)).toEqual(expect.arrayContaining(["header", "ts-restaurant"]));
    expect(spec.store.menus["main-menu"].links.map((l) => l.title)).toEqual(["La carte", "Le lieu", "Galerie", "Contact"]);
  });

  it("toutes les pages des planches existent et se rendent, sans « [À compléter » ni débordement de mention", async () => {
    expect(spec.store.pages.map((p) => p.handle)).toEqual(TS_PAGES.map((p) => p.handle));
    for (const route of ["/", ...TS_PAGES.map((p) => `/pages/${p.handle}`)]) {
      const r = await render(route);
      expect(r.status, route).toBe(200);
      const text = visibleText(r.html);
      expect(text, route).not.toMatch(/\[À compléter/);
      expect(text, route).toContain("Exemple de restaurant — tarifs et disponibilités de démonstration.");
      expect((r.html.match(/<h1\b/g) ?? []).length, `${route} : un seul titre principal`).toBe(1);
    }
    const nf = await render("/page-inconnue");
    expect(nf.status).toBe(404);
    expect(visibleText(nf.html)).toContain("Cette page n'est pas à la carte");
  });

  it("carte : prix d'exemple de la consigne, pastilles végétariennes, rubriques en ancres", async () => {
    const t = visibleText((await render("/pages/la-carte")).html);
    for (const [dish, price] of [["Velouté de saison", "9 €"], ["Salade de betteraves et chèvre", "11 €"], ["Risotto aux champignons", "22 €"], ["Poisson rôti et légumes", "26 €"], ["Volaille et pommes grenailles", "24 €"], ["Tarte aux pommes", "9 €"], ["Mousse au chocolat", "8 €"], ["Eau pétillante", "4 €"], ["Espresso", "3 €"]]) expect(t).toMatch(new RegExp(`${dish}.{0,40}${price}`));
    const html = (await render("/pages/la-carte")).html;
    for (const a of ["entrees", "plats", "desserts", "boissons"]) { expect(html).toContain(`id="${a}"`); expect(html).toContain(`href="#${a}"`); }
    expect((html.match(/class="ts-veg"/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it("réservation : simulation annoncée, règles du restaurant transmises au script, pages de gestion et légales", async () => {
    const res = (await render("/pages/reserver")).html;
    expect(res).toContain("Démonstration : aucune réservation réelle");
    const cfg = JSON.parse(res.match(/<script type="application\/json" id="ts-config">([\s\S]*?)<\/script>/)![1]);
    expect(cfg).toMatchObject({ mode: "demo", api: "", timezone: "Europe/Paris", capacity: 24, maxParty: 8 });
    expect(cfg.services.map((s: { slots: string }) => s.slots)).toEqual(["12:00, 12:30, 13:00", "19:00, 19:30, 20:00, 20:30"]);
    expect(res).toContain('data-page="manage"');
    for (const pane of ['data-ts-pane="1"', 'data-ts-pane="2"', 'data-ts-pane="3"', 'data-ts-pane="unavailable"', 'data-ts-pane="confirm"']) expect(res).toContain(pane);
    expect(visibleText((await render("/pages/ma-reservation")).html)).toContain("Confirmer l'annulation");
    expect((await render("/pages/retrouver-ma-reservation")).html).toContain("data-ts-lookup");
    const legal = visibleText((await render("/pages/mentions-legales")).html);
    expect(legal).toContain("Éditeur du site");
    expect(legal).toContain("[À renseigner]");
    expect((await render("/pages/cookies")).html).toContain("data-ts-cookies-reset");
  });

  it("édition : prix d'un plat, capacité, section masquée, dupliquée et déplacée ; enregistrée puis relue à l'identique", async () => {
    const carte = spec.templates["page.ts-carte"];
    const menuId = carte.order.find((id) => carte.sections[id].type === "ts-menu")!;
    const risotto = Object.entries(carte.sections[menuId].blocks!).find(([, b]) => b.settings.name === "Risotto aux champignons")![0];
    const restaurant = spec.groups.header.order.find((id) => spec.groups.header.sections[id].type === "ts-restaurant")!;
    const dishes = spec.templates.index.order.find((id) => spec.templates.index.sections[id].type === "ts-dishes")!;
    const faqId = spec.templates.index.order.find((id) => spec.templates.index.sections[id].type === "ts-faq")!;
    const r = applyOps(spec, [
      { op: "set_setting", template: "page.ts-carte", section: menuId, block: risotto, key: "price", value: "23 €" },
      { op: "set_setting", template: "group:header", section: restaurant, key: "capacity", value: 30 },
      { op: "toggle_section", template: "index", section: faqId, disabled: true },
      { op: "duplicate_section", template: "index", section: dishes },
      { op: "move_section", template: "index", section: dishes, position: { index: 0 } },
    ] as never);
    expect(r.rejected ?? []).toEqual([]);
    const v = saveThemeVersion(demo.pid, r.spec, "Retouche", "user");
    const back = currentTheme(demo.pid)!;
    expect(back.version.id).toBe(v.id);
    expect(JSON.stringify(back.spec)).toBe(JSON.stringify(r.spec));
    const f = compileTheme(back.spec);
    const carteHtml = visibleText((await renderPage({ spec: back.spec, base: "", files: f, cart: [] }, "/pages/la-carte", new URLSearchParams())).html);
    expect(carteHtml).toMatch(/Risotto aux champignons.{0,40}23 €/);
    const home = (await renderPage({ spec: back.spec, base: "", files: f, cart: [] }, "/", new URLSearchParams())).html;
    expect(home).not.toContain("Vos questions, nos réponses.");
    expect((home.match(/class="ts-section ts-dishes/g) ?? []).length).toBe(2);
    expect(back.spec.templates.index.order[0]).toBe(dishes);
    expect(JSON.parse(home.match(/id="ts-config">([\s\S]*?)<\/script>/)![1]).capacity).toBe(30);
  });

  it("galerie filtrable et visionneuse accessible, contact avec plan illustratif signalé", async () => {
    const g = (await render("/pages/galerie")).html;
    expect((g.match(/class="ts-gallery__item"/g) ?? []).length).toBe(11);
    for (const f of ["all", "lieu", "assiette", "details"]) expect(g).toContain(`data-filter="${f}"`);
    expect(g).toMatch(/role="dialog" aria-modal="true"/);
    const c = visibleText((await render("/pages/contact")).html);
    expect(c).toContain("Plan illustratif");
    expect(c).toContain("Nous serons ravis"); // coquille « Noue serons » de la planche corrigée
  });
});

describe("Adaptation de TABLE SAISON à un autre restaurant", () => {
  it("reprend les contenus du client et n'emprunte rien à la démonstration ; pages à compléter en brouillon", () => {
    const spec = serviceSpec("table-saison" as never, "fr", undefined, { rich: true });
    const json = JSON.stringify(spec);
    for (const demoOnly of ["table-saison-", "TABLE SAISON", "Velouté de saison", "22 €", "Le goût des bonnes choses", "Exemple de restaurant"]) expect(json, demoOnly).not.toContain(demoOnly);
    const page = (h: string) => spec.store.pages.find((p) => p.handle === h);
    for (const h of ["la-carte", "reserver", "ma-reservation", "retrouver-ma-reservation", "modifier-ma-reservation", "demande-de-groupe-recue"]) expect(page(h)?.status, h).toBe("draft");
    // Pages du client conservées (contact, FAQ, mentions légales) : rien n'est écrasé.
    for (const h of ["contact", "faq", "mentions-legales", "prestations"]) expect(page(h)?.template_suffix, h).not.toMatch(/^ts-/);
    const restaurant = Object.values(spec.groups.header.sections).find((s) => s.type === "ts-restaurant")!;
    expect(restaurant.settings.booking_mode).toBe("demo");
    expect(types(spec, "index")[0]).toBe("ts-hero");
    expect(validateSpec(spec)).toEqual([]);
  });

  it("anglais : libellés et textes du thème traduits", async () => {
    const spec = serviceSpec("table-saison" as never, "en", undefined, { rich: true });
    const files = compileTheme(spec);
    const r = await renderPage({ spec, base: "", files, cart: [] }, "/", new URLSearchParams());
    expect(r.status).toBe(200);
    expect(r.html).toContain("Seasonal cooking");
    expect(visibleText((await renderPage({ spec, base: "", files, cart: [] }, "/page-inconnue", new URLSearchParams())).html)).toContain("This page is not on the menu");
  });
});
