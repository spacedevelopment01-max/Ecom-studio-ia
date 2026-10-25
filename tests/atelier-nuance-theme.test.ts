/**
 * ATELIER NUANCE (issue #177) : thème du catalogue (famille Services), démonstration complète d'après les six planches,
 * source unique des prestations, édition et sauvegarde, adaptation à un autre salon sans rien copier de la
 * démonstration, rendu réel de toutes les pages.
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
import { AN_PAGES, clientServices, parseDuration, parsePrice } from "@/lib/theme/atelier-nuance";
import { atelierNuanceProject, AN_MEDIA, AN_KIT_DIR, AN_SERVICES, AN_STANDINS } from "./atelier-nuance-fixtures";
import { serviceSpec, serviceProfile } from "./fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const types = (spec: { templates: Record<string, { order: string[]; sections: Record<string, { type: string; disabled?: boolean }> }> }, key: string) => spec.templates[key].order.map((id) => spec.templates[key].sections[id]).filter((s) => !s.disabled).map((s) => s.type);
const visibleText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<template[\s\S]*?<\/template>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\s+/g, " ");
const config = (html: string) => JSON.parse(html.match(/<script type="application\/json" id="an-config">([\s\S]*?)<\/script>/)![1]);

describe("ATELIER NUANCE : thème salon du catalogue", () => {
  it("est actif, conçu pour les services, ouvert selon les droits par thème, avec ses 27 sections dans la bibliothèque (FR et EN)", () => {
    expect(ACTIVE_DIRECTIONS.map((d) => d.id)).toContain("atelier-nuance");
    expect(themeKinds("atelier-nuance")).toEqual(["services"]);
    // Plus de familles ni de rang (mission #190) : répartition par forfait encore à choisir, le thème est ouvert à tous.
    expect(plansForTheme("atelier-nuance")).toEqual(["creer", "vendre", "dominer"]);
    const sections = fs.readdirSync(path.join("theme-base", "sections")).filter((f) => f.startsWith("an-")).map((f) => f.replace(".liquid", ""));
    expect(sections).toHaveLength(27);
    for (const t of sections) { expect(libraryEntry(t, "fr")?.name, t).toBeTruthy(); expect(libraryEntry(t, "en")?.name, t).toBeTruthy(); }
  });

  it("kit : 59 photos référencées ; présentes en WebP, sauf les deux de la partie 1 tronquée, remplacées par une photo du même kit et signalées", () => {
    expect(AN_MEDIA).toHaveLength(59);
    const absent = AN_MEDIA.filter((m) => !fs.existsSync(path.join(AN_KIT_DIR, `${m.file}.webp`))).map((m) => m.file);
    for (const f of absent) {
      expect(Object.keys(AN_STANDINS), f).toContain(f);
      expect(fs.existsSync(path.join(AN_KIT_DIR, `${AN_STANDINS[f]}.webp`)), f).toBe(true);
    }
    expect(absent.length).toBeLessThanOrEqual(2);
  });
});

describe("Démonstration ATELIER NUANCE (planches 01 à 06)", async () => {
  const user = await createUser(`atelier-nuance-${Date.now()}@example.invalid`, "isolated-test-only", "Atelier Nuance");
  const demo = await fr(() => atelierNuanceProject(user.id));
  const { spec } = demo;
  const files = compileTheme(spec);
  const render = (route: string) => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams());

  it("accueil dans l'ordre de la planche 04, toutes les photos disponibles utilisées", () => {
    expect(validateSpec(spec)).toEqual([]);
    expect(types(spec, "index")).toEqual(["an-hero", "an-categories", "an-split", "an-featured", "an-steps", "an-details", "an-team", "an-faq", "an-cta"]);
    const used = JSON.stringify(spec.templates).match(/atelier-nuance-[a-z0-9-]+\.webp/g) ?? [];
    for (const f of new Set(used)) expect(spec.files[f], f).toBeTruthy();
    for (const m of AN_MEDIA) if (!demo.missing.includes(`${m.file}.webp`)) expect(used, m.file).toContain(`atelier-nuance-${m.file}.webp`);
    expect(Object.values(spec.groups.header.sections).map((s) => s.type)).toEqual(expect.arrayContaining(["header", "an-salon"]));
    expect(spec.store.menus["main-menu"].links.slice(0, 4).map((l) => l.title)).toEqual(["Le salon", "Prestations & tarifs", "Inspirations", "Contact"]);
    expect(spec.store.menus["main-menu"].links.map((l) => l.title)).toEqual(expect.arrayContaining(["Journal", "Questions fréquentes", "Mon espace"]));
  });

  it("toutes les pages existent et se rendent, un seul titre principal ; « [À compléter : …] » réservé aux réponses qui engageraient le salon", async () => {
    expect(spec.store.pages.map((p) => p.handle)).toEqual(AN_PAGES.map((p) => p.handle));
    for (const route of ["/", ...AN_PAGES.map((p) => `/pages/${p.handle}`)]) {
      const r = await render(route);
      expect(r.status, route).toBe(200);
      expect((r.html.match(/<h1\b/g) ?? []).length, `${route} : un seul titre principal`).toBe(1);
      if (["/pages/prestations", "/pages/le-salon", "/pages/inspirations", "/pages/journal"].includes(route)) expect(visibleText(r.html), route).not.toMatch(/\[À compléter/);
    }
    const faq = spec.templates.index.sections[spec.templates.index.order.find((id) => spec.templates.index.sections[id].type === "an-faq")!];
    const todo = Object.values(faq.blocks!).filter((b) => /\[À compléter/.test(String(b.settings.answer))).map((b) => b.settings.question);
    expect(todo).toEqual(["Quels moyens de paiement acceptez-vous ?", "Utilisez-vous des produits adaptés à tous les types de cheveux ?"]);
    const nf = await render("/page-inconnue");
    expect(nf.status).toBe(404);
    expect(visibleText(nf.html)).toContain("Page introuvable");
    expect(visibleText(nf.html)).toContain(`© ${new Date().getFullYear()} ATELIER NUANCE. Tous droits réservés.`);
  });

  it("source unique : prix et durées de la planche 05 partout, jamais 75 € ni 95 € (planche 02)", async () => {
    const cfg = config((await render("/pages/prendre-rendez-vous")).html);
    expect(cfg).toMatchObject({ mode: "demo", api: "", timezone: "Europe/Paris" });
    expect(cfg.services.map((s: { id: string; duration: number; price: number; priceFrom: boolean }) => [s.id, s.duration, s.price, s.priceFrom])).toEqual(AN_SERVICES.map((s) => [s.id, s.duration, s.price, s.from]));
    expect(cfg.staff.map((p: { name: string }) => p.name)).toEqual(["Camille", "Alex", "Sarah"]);
    const home = visibleText((await render("/")).html);
    for (const [name, price, dur] of [["Coupe & brushing", "45 €", "45 min"], ["Coloration & coiffage", "85 €", "1 h 45"], ["Brushing", "30 €", "30 min"]]) expect(home).toMatch(new RegExp(`${name} ${price} ${dur}`));
    const list = visibleText((await render("/pages/prestations")).html);
    expect(list).toMatch(/Balayage & coiffage .{0,140}2 h 30 À partir de 120 €/);
    expect(list).toMatch(/Soin & coiffage .{0,160}1 h 50 €/);
    for (const route of ["/", "/pages/prestations", "/pages/prendre-rendez-vous", "/pages/coloration-coiffage", "/pages/balayage-coiffage"]) {
      const t = visibleText((await render(route)).html);
      expect(t, route).not.toMatch(/\b75 €|\b95 €|\b40 €/);
    }
    expect((await render("/pages/prestations")).html).toContain('data-an-book="balayage-coiffage"');
  });

  it("fiches : même modèle éditable, contenus propres (le texte de Coupe & brushing n'est pas recopié), longueurs en pictogrammes", async () => {
    const coupe = visibleText((await render("/pages/coupe-brushing")).html);
    expect(coupe).toContain("Les étapes de votre prestation");
    expect(coupe).toContain("Une coupe précise et adaptée");
    expect(coupe).toContain("Choisissez votre longueur");
    for (const h of ["brushing", "coloration-coiffage", "balayage-coiffage", "soin-coiffage"]) {
      const html = (await render(`/pages/${h}`)).html;
      expect(visibleText(html), h).not.toContain("Une coupe précise et adaptée");
      expect(html, h).toContain(`data-an-svc="${h}"`);
      expect((html.match(/class="an-hair /g) ?? []).length, h).toBe(3);
    }
    expect(visibleText((await render("/pages/balayage-coiffage")).html)).toContain("Pourquoi le prix est-il « à partir de » ?");
  });

  it("prise de rendez-vous, espace client, déplacement, retrouver : simulation annoncée, cinq étapes, états prévus", async () => {
    const res = (await render("/pages/prendre-rendez-vous")).html;
    expect(visibleText(res)).toContain("Simulation — aucun rendez-vous réel");
    for (const pane of ['data-an-pane="1"', 'data-an-pane="2"', 'data-an-pane="3"', 'data-an-pane="4"', 'data-an-pane="conflict"', 'data-an-pane="5"']) expect(res).toContain(pane);
    expect(visibleText(res)).toContain("1 Prestations 2 Avec qui ? 3 Créneau 4 Coordonnées 5 Confirmation");
    const account = (await render("/pages/mon-espace")).html;
    for (const v of ["appointments", "info", "prefs", "login", "expired", "error"]) expect(account).toContain(`data-an-acc-view="${v}"`);
    expect(visibleText(account)).toContain("Confirmer l'annulation");
    expect(visibleText((await render("/pages/deplacer-mon-rendez-vous")).html)).toContain("Confirmer le changement");
    const look = visibleText((await render("/pages/retrouver-mon-rendez-vous")).html);
    for (const t of ["Référence de rendez-vous", "Accéder à mon rendez-vous", "Se connecter à mon compte", "Créer un compte"]) expect(look).toContain(t);
  });

  it("inspirations filtrables avec visionneuse ; journal relié à de vraies pages d'article ; contact et légal honnêtes", async () => {
    const g = (await render("/pages/inspirations")).html;
    expect((g.match(/data-an-open/g) ?? []).length).toBe(9);
    for (const f of ["all", "coupe", "couleur", "soin"]) expect(g).toContain(`data-an-filter="${f}"`);
    expect(g).toMatch(/role="dialog" aria-modal="true"/);
    const j = (await render("/pages/journal")).html;
    const links = [...new Set((j.match(/href="\/pages\/journal-[a-z-]+"/g) ?? []).map((x) => x.slice(6, -1)))];
    expect(links.sort()).toEqual(AN_PAGES.filter((p) => p.handle.startsWith("journal-")).map((p) => `/pages/${p.handle}`).sort());
    for (const l of links) expect((await render(l)).status, l).toBe(200);
    const c = visibleText((await render("/pages/contact")).html);
    for (const t of ["Nos coordonnées", "[À renseigner]", "[À confirmer]", "Plan illustratif", "Envoyer le message"]) expect(c).toContain(t);
    const legal = (await render("/pages/informations-legales")).html;
    expect(legal).toContain('aria-current="page">Mentions légales');
    expect(visibleText(legal)).toContain("Contenu à compléter avant publication");
    expect((await render("/pages/cookies")).html).toContain("data-an-cookies-reset");
  });

  it("édition : prix d'une prestation (source unique), section masquée, dupliquée et déplacée ; enregistrée puis relue à l'identique", async () => {
    const header = spec.groups.header;
    const salon = header.order.find((id) => header.sections[id].type === "an-salon")!;
    const coupe = Object.entries(header.sections[salon].blocks!).find(([, b]) => b.settings.service_id === "coupe-brushing")![0];
    const featured = spec.templates.index.order.find((id) => spec.templates.index.sections[id].type === "an-featured")!;
    const faqId = spec.templates.index.order.find((id) => spec.templates.index.sections[id].type === "an-faq")!;
    const r = applyOps(spec, [
      { op: "set_setting", template: "group:header", section: salon, block: coupe, key: "price", value: 48 },
      { op: "toggle_section", template: "index", section: faqId, disabled: true },
      { op: "duplicate_section", template: "index", section: featured },
      { op: "move_section", template: "index", section: featured, position: { index: 0 } },
    ] as never);
    expect(r.rejected ?? []).toEqual([]);
    const v = saveThemeVersion(demo.pid, r.spec, "Retouche", "user");
    const back = currentTheme(demo.pid)!;
    expect(back.version.id).toBe(v.id);
    expect(JSON.stringify(back.spec)).toBe(JSON.stringify(r.spec));
    const f = compileTheme(back.spec);
    const home = (await renderPage({ spec: back.spec, base: "", files: f, cart: [] }, "/", new URLSearchParams())).html;
    expect(config(home).services.find((s: { id: string }) => s.id === "coupe-brushing").price).toBe(48);
    expect(home).not.toContain("Foire aux questions");
    expect((home.match(/class="an-section an-featured/g) ?? []).length).toBe(2);
    expect(back.spec.templates.index.order[0]).toBe(featured);
  });
});

describe("Adaptation d'ATELIER NUANCE à un autre salon", () => {
  it("lit les prix et durées du client sans rien deviner", () => {
    expect(parsePrice("à partir de 120 €")).toEqual({ price: 120, from: true });
    expect(parsePrice("35,50 €")).toEqual({ price: 35.5, from: false });
    expect(parsePrice("sur devis")).toBeNull();
    expect(parseDuration("1 h 45")).toBe(105);
    expect(parseDuration("45 min")).toBe(45);
    expect(parseDuration("")).toBeNull();
    const s = clientServices(serviceProfile.services);
    expect(s.map((x) => [x.name, x.price, x.duration])).toEqual([["Séance de kinésithérapie", 50, 45], ["Rééducation sportive", 60, 60], ["Massage bien-être", null, 30]]);
  });

  it("reprend les contenus du client et n'emprunte rien à la démonstration ; pages à compléter en brouillon", () => {
    const spec = serviceSpec("atelier-nuance" as never, "fr", undefined, { rich: true });
    const json = JSON.stringify(spec);
    for (const demoOnly of ["atelier-nuance-", "ATELIER NUANCE", "Camille", "Une nouvelle coupe", "Coupe & brushing", "Tarifs et disponibilités de démonstration\"", "julie"]) expect(json, demoOnly).not.toContain(demoOnly);
    const page = (h: string) => spec.store.pages.find((p) => p.handle === h);
    for (const h of ["prendre-rendez-vous", "mon-espace", "retrouver-mon-rendez-vous", "deplacer-mon-rendez-vous", "le-salon", "inspirations", "journal"]) expect(page(h)?.status, h).toBe("draft");
    // Pages existantes du client (prestations, contact, FAQ) conservées, jamais remplacées par celles du thème.
    for (const h of ["prestations", "contact", "faq"]) expect(page(h)?.template_suffix ?? "", h).not.toMatch(/^an-/);
    const salon = Object.values(spec.groups.header.sections).find((s) => s.type === "an-salon")!;
    expect(salon.settings.booking_mode).toBe("demo");
    const blocks = Object.values(salon.blocks ?? {});
    expect(blocks.filter((b) => b.type === "member")).toEqual([]); // l'équipe se saisit, jamais copiée
    expect(blocks.find((b) => b.settings.name === "Massage bien-être")!.settings).not.toHaveProperty("price");
    expect(types(spec, "index")[0]).toBe("an-hero");
    expect(validateSpec(spec)).toEqual([]);
  });

  it("autre salon : SES prestations, prix et durées dans la source unique de la prise de rendez-vous", async () => {
    const services = { ...serviceProfile, services: [{ name: "Coupe femme", description: "Coupe et coiffage.", price: "38 €", duration: "50 min" }, { name: "Mèches", description: "Éclaircissement.", price: "à partir de 70 €", duration: "2 h" }] };
    const spec = serviceSpec("atelier-nuance" as never, "fr", services, { rich: true });
    expect(spec.store.pages.find((p) => p.handle === "prendre-rendez-vous")?.status).toBe("draft");
    const files = compileTheme(spec);
    const html = (await renderPage({ spec, base: "", files, cart: [] }, "/pages/prendre-rendez-vous", new URLSearchParams())).html;
    expect(config(html).services.map((s: { name: string; price: number; duration: number; priceFrom: boolean; category: string }) => [s.name, s.price, s.duration, s.priceFrom, s.category])).toEqual([["Coupe femme", 38, 50, false, "coupe"], ["Mèches", 70, 120, true, "couleur"]]);
    // Accueil au rythme de la planche 04 : SES catégories et prestations phares ; présentation et étapes à écrire (masquées).
    const home = spec.templates.index;
    const byType = (t: string) => Object.values(home.sections).find((s) => s.type === t)!;
    expect(types(spec, "index").slice(0, 3)).toEqual(["an-hero", "an-categories", "an-featured"]);
    expect(Object.values(byType("an-categories").blocks ?? {}).map((b) => b.settings.heading)).toEqual(["Coupe & coiffage", "Couleur & lumière"]);
    expect(Object.values(byType("an-featured").blocks ?? {}).map((b) => [b.settings.name, b.settings.price, b.settings.duration])).toEqual([["Coupe femme", "38 €", "50 min"], ["Mèches", "À partir de 70 €", "2 h"]]);
    expect(byType("an-featured").settings.note).toBe("");
    expect([byType("an-split").disabled, byType("an-steps").disabled]).toEqual([true, true]);
    const page = visibleText((await renderPage({ spec, base: "", files, cart: [] }, "/", new URLSearchParams())).html);
    expect(page).toContain("Coupe femme");
    expect(page).not.toContain("démonstration");
  });

  it("anglais : adresses et libellés traduits", async () => {
    const spec = serviceSpec("atelier-nuance" as never, "en", undefined, { rich: true });
    expect(spec.store.pages.map((p) => p.handle)).toEqual(expect.arrayContaining(["book-an-appointment", "my-account", "find-my-appointment"]));
    const files = compileTheme(spec);
    const r = await renderPage({ spec, base: "", files, cart: [] }, "/", new URLSearchParams());
    expect(r.status).toBe(200);
    expect(visibleText((await renderPage({ spec, base: "", files, cart: [] }, "/page-inconnue", new URLSearchParams())).html)).toContain("Page not found");
  });
});

describe("ATELIER NUANCE avec le service réel (vérifié dans le navigateur, API simulée)", () => {
  const css = fs.readFileSync(path.join("theme-base", "assets", "atelier-nuance.css"), "utf8");
  const js = fs.readFileSync(path.join("theme-base", "assets", "atelier-nuance.js"), "utf8");
  it("connexion, lien expiré et erreur : la vue prend toute la largeur quand le menu de l'espace est masqué", () => {
    expect(css).toContain(".an-account__nav[hidden] + .an-account__main { grid-column: 1 / -1; }");
  });
  it("la mention « de démonstration » n'apparaît jamais avec le service réel", () => {
    expect(js).toContain("if (!CFG.demoNote || LIVE) $$('[data-an-demo-note]')");
  });
});

describe("En-tête transparent de l'accueil (retour de Thomas : il recouvrait la mention d'aperçu)", () => {
  it("il se place sous le bandeau d'annonce et sous toute barre marquée data-es-top-bar, dont la mention d'aperçu", () => {
    const theme = fs.readFileSync(path.join("theme-base", "assets", "theme.js"), "utf8");
    const shim = fs.readFileSync(path.join("scripts", "lot2c-static-demo.js"), "utf8");
    expect(theme).toContain("document.querySelectorAll('.es-announcement-section, [data-es-top-bar]')");
    expect(theme).toMatch(/header\.style\.setProperty\('--es-hoff'/);
    expect(shim).toContain("n.setAttribute('data-es-top-bar', '')");
    // La position est recalculée quand la mention arrive après le chargement du thème.
    expect(shim).toContain("window.dispatchEvent(new Event('resize'))");
  });
});
