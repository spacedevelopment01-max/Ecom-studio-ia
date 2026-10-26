/**
 * PARENTHÈSE : thème du catalogue (famille Services), démonstration complète d'après les six planches du brief, source
 * unique des séances et ateliers, honnêteté des contenus (aucune personne, aucun diplôme, avis ou coordonnée inventés,
 * avertissement médical), édition et sauvegarde, adaptation à un autre cabinet sans rien copier de la démonstration.
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
import { planForTheme } from "@/lib/theme/theme-access";
import { libraryEntry } from "@/lib/theme/section-library";
import { runWithLang } from "@/lib/i18n-server";
import { PA_PAGES, clientSeances, paDuration, paPrice } from "@/lib/theme/parenthese";
import { parentheseProject, PA_MEDIA, PA_KIT_DIR, PA_STANDINS, PA_SEANCES, PA_ATELIERS } from "./parenthese-fixtures";
import { serviceSpec, serviceProfile } from "./fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const types = (spec: { templates: Record<string, { order: string[]; sections: Record<string, { type: string; disabled?: boolean }> }> }, key: string) => spec.templates[key].order.map((id) => spec.templates[key].sections[id]).filter((s) => !s.disabled).map((s) => s.type);
const visibleText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<template[\s\S]*?<\/template>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\s+/g, " ");
const config = (html: string) => JSON.parse(html.match(/<script type="application\/json" id="pa-config">([\s\S]*?)<\/script>/)![1]);

describe("PARENTHÈSE : thème de cabinet du catalogue", () => {
  it("est actif, de la famille Services, avec ses 29 sections dans la bibliothèque (FR et EN)", () => {
    expect(ACTIVE_DIRECTIONS.map((d) => d.id)).toContain("parenthese");
    expect(themeKinds("parenthese")).toEqual(["services"]);
    expect(planForTheme("parenthese")).toBe(planForTheme("atelier-nuance"));
    const sections = fs.readdirSync(path.join("theme-base", "sections")).filter((f) => f.startsWith("pa-")).map((f) => f.replace(".liquid", ""));
    expect(sections).toHaveLength(29);
    for (const t of sections) { expect(libraryEntry(t, "fr")?.name, t).toBeTruthy(); expect(libraryEntry(t, "en")?.name, t).toBeTruthy(); }
  });

  it("kit : 42 photos référencées ; absentes (partie 1 tronquée) remplacées par une photo du même kit et signalées", () => {
    expect(PA_MEDIA).toHaveLength(42);
    const absent = PA_MEDIA.filter((m) => !fs.existsSync(path.join(PA_KIT_DIR, `${m.file}.webp`))).map((m) => m.file);
    for (const f of absent) {
      expect(Object.keys(PA_STANDINS), f).toContain(f);
      expect(fs.existsSync(path.join(PA_KIT_DIR, `${PA_STANDINS[f]}.webp`)), f).toBe(true);
    }
    expect(absent.length).toBeLessThanOrEqual(7);
  });

  it("deux familles de polices sous licence libre (OFL), déclarées dans le thème", () => {
    const theme = ACTIVE_DIRECTIONS.find((d) => d.id === "parenthese")!;
    expect(JSON.stringify(theme)).toMatch(/playfair_display_n4/);
    expect(JSON.stringify(theme)).toMatch(/dm_sans_n4/);
  });
});

describe("Démonstration PARENTHÈSE (planches 01 à 06)", async () => {
  const user = await createUser(`parenthese-${Date.now()}@example.invalid`, "isolated-test-only", "Parenthèse");
  const demo = await fr(() => parentheseProject(user.id));
  const { spec } = demo;
  const files = compileTheme(spec);
  const render = (route: string) => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams());

  it("accueil dans l'ordre de la planche 02, toutes les photos disponibles utilisées, menu de cinq liens", () => {
    expect(validateSpec(spec)).toEqual([]);
    expect(types(spec, "index")).toEqual(["pa-hero", "pa-needs", "pa-intro", "pa-offers", "pa-band", "pa-steps", "pa-approach", "pa-posts", "pa-faq", "pa-cta"]);
    const used = JSON.stringify(spec.templates).match(/parenthese-[a-z0-9-]+\.webp/g) ?? [];
    for (const f of new Set(used)) expect(spec.files[f], f).toBeTruthy();
    for (const m of PA_MEDIA) if (!demo.missing.includes(`${m.file}.webp`)) expect(used, m.file).toContain(`parenthese-${m.file}.webp`);
    expect(Object.values(spec.groups.header.sections).map((s) => s.type)).toEqual(expect.arrayContaining(["header", "pa-cabinet"]));
    expect(spec.store.menus["main-menu"].links.map((l) => l.title)).toEqual(["Les séances", "Les ateliers", "Mon approche", "Conseils", "Contact"]);
    expect(spec.store.menus.footer.links.map((l) => l.title)).toEqual(expect.arrayContaining(["Le cabinet", "Entreprises", "Questions fréquentes", "Retrouver mon rendez-vous"]));
  });

  it("toutes les pages existent et se rendent, un seul titre principal, page introuvable de la planche 06", async () => {
    expect(spec.store.pages.map((p) => p.handle)).toEqual(PA_PAGES.map((p) => p.handle));
    for (const route of ["/", ...PA_PAGES.map((p) => `/pages/${p.handle}`)]) {
      const r = await render(route);
      expect(r.status, route).toBe(200);
      expect((r.html.match(/<h1\b/g) ?? []).length, `${route} : un seul titre principal`).toBe(1);
      expect(r.html, route).not.toMatch(/Liquid error/);
    }
    const nf = await render("/page-inconnue");
    expect(nf.status).toBe(404);
    expect(visibleText(nf.html)).toContain("Accordons-nous une petite pause");
  });

  it("honnêteté : avertissement médical, aucune promesse de guérison, aucun diplôme, avis, chiffre ni coordonnée inventés", async () => {
    const all: string[] = [];
    for (const route of ["/", ...PA_PAGES.map((p) => `/pages/${p.handle}`)]) all.push(visibleText((await render(route)).html));
    const text = all.join(" ");
    expect(visibleText((await render("/")).html)).toContain("Elle ne se substitue pas à un suivi médical.");
    expect(text).not.toMatch(/guéri[rst]|guérison|soigne[rz]?\b|traite(r|ment) (la|le|les|votre)|diplômée?|certifiée?|\d+ ?ans d'expérience|★|\d[,.]\d ?\/ ?5|avis clients?/i);
    expect(text).not.toMatch(/\b0[1-9](?: ?\d\d){4}\b/); // aucun numéro de téléphone
    expect(text).not.toMatch(/@parenthese|parenthese-sophrologie\.fr/);
    expect(text).toContain("[À renseigner]");
    // Aucune donnée de santé demandée : les formulaires précisent de ne pas en écrire.
    const book = visibleText((await render("/pages/prendre-rendez-vous")).html);
    expect(book).toContain("Évitez les informations médicales dans ce formulaire.");
  });

  it("source unique : séances et ateliers lus dans les « Réglages du cabinet », valeurs d'exemple annoncées", async () => {
    const cfg = config((await render("/pages/prendre-rendez-vous")).html);
    expect(cfg).toMatchObject({ mode: "demo", api: "", timezone: "Europe/Paris", demoNote: "Tarifs et disponibilités de démonstration." });
    expect(cfg.seances.map((s: { id: string; duration: number; price: number; modes: string }) => [s.id, s.duration, s.price, s.modes])).toEqual(PA_SEANCES.map((s) => [s.id, s.duration, s.price, s.modes]));
    expect(cfg.ateliers.map((a: { id: string; date: string; capacity: number; price: number; duration: number }) => [a.id, a.date, a.capacity, a.price, a.duration])).toEqual(PA_ATELIERS.map((a) => [a.id, a.date, a.capacity, a.price, a.duration]));
    // Les textes affichés sans script reprennent les mêmes valeurs (60 € / 60 min ; 20 € / 1h15).
    const home = visibleText((await render("/")).html);
    expect(home).toMatch(/Séance individuelle .{0,80}1 h 60 €/);
    expect(home).toContain("Tarifs et disponibilités de démonstration.");
    expect(home).toMatch(/Atelier en groupe .{0,120}1 h 15 20 €/);
    const html = (await render("/pages/seances")).html;
    expect(html).toContain('data-pa-svc="premiere"');
    expect(visibleText(html)).toContain("Tarifs et disponibilités de démonstration.");
    for (const route of ["/pages/ateliers", "/pages/atelier-une-pause-dans-la-semaine"]) expect((await render(route)).html, route).toContain('data-pa-atelier="pause-semaine"');
  });

  it("réservation en quatre étapes, variantes cabinet et visio, conflit, démonstration annoncée, aucun paiement", async () => {
    const html = (await render("/pages/prendre-rendez-vous")).html;
    for (const pane of ['data-pa-pane="1"', 'data-pa-pane="2"', 'data-pa-pane="3"', 'data-pa-pane="4"']) expect(html).toContain(pane);
    expect(html).toContain('data-mode="cabinet"');
    expect(html).toContain('data-mode="visio"');
    expect(html).toContain("data-pa-ics");
    expect(html).toContain("data-pa-manage-link");
    const t = visibleText(html);
    expect(t).not.toMatch(/carte bancaire|paiement en ligne|payer maintenant/i);
  });

  it("gestion du rendez-vous, retrouver : dialogue d'annulation, modification, note, réponse neutre", async () => {
    const manage = (await render("/pages/mon-rendez-vous")).html;
    expect(manage).toMatch(/role="dialog" aria-modal="true"/);
    for (const k of ["data-pa-open-move", "data-pa-move-dialog", "data-pa-note", "data-pa-ics"]) expect(manage, k).toContain(k);
    const look = (await render("/pages/retrouver-mon-rendez-vous")).html;
    expect(look).toContain("data-pa-lookup");
    expect(look).toMatch(/data-done="[^"]*(si|Si)[^"]*"/);
  });

  it("ateliers filtrables (date et thème) avec réinitialisation et état vide ; journal relié à de vraies pages d'article", async () => {
    const ws = (await render("/pages/ateliers")).html;
    for (const k of ["data-pa-ws-date", "data-pa-ws-theme", "data-pa-ws-reset", "data-pa-ws-empty"]) expect(ws, k).toContain(k);
    expect(visibleText(ws)).toContain("Dates, tarifs et places de démonstration.");
    const j = (await render("/pages/conseils")).html;
    const links = [...new Set((j.match(/href="\/pages\/conseils-[a-z-]+"/g) ?? []).map((x) => x.slice(6, -1)))];
    expect(links.sort()).toEqual(PA_PAGES.filter((p) => p.handle.startsWith("conseils-")).map((p) => `/pages/${p.handle}`).sort());
    expect(j).toContain("data-pa-filter");
  });

  it("FAQ par catégories, légal en quatre onglets « À renseigner », cookies sans rien de facultatif avant l'accord", async () => {
    const faq = (await render("/pages/faq")).html;
    expect((faq.match(/role="tab"/g) ?? []).length).toBeGreaterThanOrEqual(4);
    const legal = (await render("/pages/mentions-legales")).html;
    expect((legal.match(/<nav class="pa-legal__tabs"[\s\S]*?<\/nav>/)![0].match(/<a /g) ?? []).length).toBe(4);
    expect(legal).toMatch(/aria-current="page"/);
    const home = (await render("/")).html;
    expect(home).toContain("data-pa-cookies-accept");
    expect(home).toContain("data-pa-cookies-refuse");
    expect(home).toContain("data-pa-cookies-custom");
    expect(home).not.toMatch(/googletagmanager|google-analytics|facebook\.net/);
  });

  it("édition : prix d'une séance (source unique), section masquée, dupliquée et déplacée ; enregistrée puis relue", async () => {
    const header = spec.groups.header;
    const cab = header.order.find((id) => header.sections[id].type === "pa-cabinet")!;
    const premiere = Object.entries(header.sections[cab].blocks!).find(([, b]) => b.settings.seance_id === "premiere")![0];
    const offers = spec.templates.index.order.find((id) => spec.templates.index.sections[id].type === "pa-offers")!;
    const faqId = spec.templates.index.order.find((id) => spec.templates.index.sections[id].type === "pa-faq")!;
    const heroId = spec.templates.index.order.find((id) => spec.templates.index.sections[id].type === "pa-hero")!;
    const r = applyOps(spec, [
      { op: "set_setting", template: "group:header", section: cab, block: premiere, key: "price", value: 65 },
      { op: "set_setting", template: "group:header", section: cab, block: premiere, key: "duration", value: 75 },
      { op: "set_setting", template: "index", section: heroId, key: "heading", value: "Un temps rien que pour vous." },
      { op: "set_setting", template: "index", section: heroId, key: "image_asset", value: "parenthese-38-cabinet-accueil.webp" },
      { op: "toggle_section", template: "index", section: faqId, disabled: true },
      { op: "duplicate_section", template: "index", section: offers },
      { op: "move_section", template: "index", section: offers, position: { index: 0 } },
    ] as never);
    expect(r.rejected ?? []).toEqual([]);
    const v = saveThemeVersion(demo.pid, r.spec, "Retouche", "user");
    const back = currentTheme(demo.pid)!;
    expect(back.version.id).toBe(v.id);
    expect(JSON.stringify(back.spec)).toBe(JSON.stringify(r.spec));
    const home = (await renderPage({ spec: back.spec, base: "", files: compileTheme(back.spec), cart: [] }, "/", new URLSearchParams())).html;
    expect(config(home).seances.find((s: { id: string }) => s.id === "premiere")).toMatchObject({ price: 65, duration: 75 });
    expect(visibleText(home)).toContain("Un temps rien que pour vous.");
    expect(home).toMatch(/pa-hero[\s\S]{0,4000}parenthese-38-cabinet-accueil\.webp/);
    expect(home).not.toContain("Vos questions, nos réponses");
    expect((home.match(/class="pa-section pa-offers/g) ?? []).length).toBe(2);
    expect(back.spec.templates.index.order[0]).toBe(offers);
  });
});

describe("Adaptation de PARENTHÈSE à un autre cabinet", () => {
  it("lit les tarifs et durées du client sans rien deviner, modalité « cabinet » seulement", () => {
    expect(paPrice("60 €")).toBe(60);
    expect(paPrice("sur devis")).toBeNull();
    expect(paDuration("1 h 15")).toBe(75);
    expect(paDuration("45 min")).toBe(45);
    expect(paDuration("")).toBeNull();
    const s = clientSeances(serviceProfile.services);
    expect(s.map((x) => [x.name, x.price, x.duration, x.modes])).toEqual([["Séance de kinésithérapie", 50, 45, "cabinet"], ["Rééducation sportive", 60, 60, "cabinet"], ["Massage bien-être", null, 30, "cabinet"]]);
  });

  it("reprend les contenus du client et n'emprunte rien à la démonstration ; pages à compléter en brouillon", async () => {
    const spec = serviceSpec("parenthese" as never, "fr", undefined, { rich: true });
    // Le nom du thème lui-même (« … · Parenthèse ») reste ; aucun contenu de la démonstration.
    const json = JSON.stringify([spec.templates, spec.groups, spec.store, spec.files]);
    for (const demoOnly of ["parenthese-", "Parenthèse", "Sophrologie & bien-être", "sophrolog", "pause-semaine", "Tarifs et disponibilités de démonstration\""]) expect(json, demoOnly).not.toContain(demoOnly);
    const page = (h: string) => spec.store.pages.find((p) => p.handle === h);
    for (const h of ["prendre-rendez-vous", "retrouver-mon-rendez-vous", "mon-rendez-vous", "confidentialite", "conditions-de-reservation", "cookies"]) expect(page(h)?.status, h).toBe("draft");
    for (const h of ["contact", "faq", "mentions-legales"]) expect(page(h)?.template_suffix ?? "", h).not.toMatch(/^pa-/);
    const cab = Object.values(spec.groups.header.sections).find((s) => s.type === "pa-cabinet")!;
    expect(cab.settings).toMatchObject({ booking_mode: "demo", logo_tagline: "", hours_mon: "" });
    expect(Object.values(cab.blocks ?? {}).filter((b) => b.type === "atelier")).toEqual([]);
    expect(Object.values(cab.blocks ?? {}).find((b) => b.settings.name === "Massage bien-être")!.settings).not.toHaveProperty("price");
    expect(types(spec, "index")[0]).toBe("pa-hero");
    expect(validateSpec(spec)).toEqual([]);
    const home = visibleText((await renderPage({ spec, base: "", files: compileTheme(spec), cart: [] }, "/", new URLSearchParams())).html);
    expect(home).toContain("Cabinet Ondine");
    expect(home).not.toMatch(/Parenthèse|sophrolog/i);
  });

  it("en anglais : pages et réglages du cabinet en anglais", () => {
    const spec = serviceSpec("parenthese" as never, "en");
    expect(spec.store.pages.map((p) => p.handle)).toEqual(expect.arrayContaining(["book-an-appointment", "my-appointment", "find-my-appointment"]));
    const cab = Object.values(spec.groups.header.sections).find((s) => s.type === "pa-cabinet")!;
    expect(cab.settings.page_book).toBe("/pages/book-an-appointment");
    expect(validateSpec(spec)).toEqual([]);
  });
});
