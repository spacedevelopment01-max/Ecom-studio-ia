/**
 * PHASE — Électricité : thème du catalogue (famille Services), démonstration d'après les dix planches (ordinateur et
 * téléphone), honnêteté des contenus (aucun avis, chiffre, délai, certification ni coordonnée inventés), formulaires
 * sans envoi réel en démonstration, filtres, cookies désactivés par défaut, édition et sauvegarde, adaptation à un
 * client sans rien emprunter à la démonstration.
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
import { libraryEntry } from "@/lib/theme/section-library";
import { runWithLang } from "@/lib/i18n-server";
import { PH_PAGES } from "@/lib/theme/phase";
import { phaseProject } from "./phase-fixtures";
import { serviceSpec } from "./fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const visibleText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<template[\s\S]*?<\/template>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/\s+/g, " ");
const types = (spec: { templates: Record<string, { order: string[]; sections: Record<string, { type: string; disabled?: boolean }> }> }, key: string) => spec.templates[key].order.map((id) => spec.templates[key].sections[id]).filter((s) => !s.disabled).map((s) => s.type);

describe("PHASE : thème électricien du catalogue", () => {
  it("est actif, de la famille Services, avec toutes ses sections dans la bibliothèque (FR et EN)", () => {
    expect(ACTIVE_DIRECTIONS.map((d) => d.id)).toContain("phase");
    expect(themeKinds("phase")).toEqual(["services"]);
    const sections = fs.readdirSync(path.join("theme-base", "sections")).filter((f) => f.startsWith("ph-")).map((f) => f.replace(".liquid", ""));
    expect(sections.length).toBeGreaterThanOrEqual(22);
    for (const t of sections) {
      expect(libraryEntry(t, "fr")?.name, t).toBeTruthy();
      expect(libraryEntry(t, "en")?.name, t).toBeTruthy();
    }
  });
});

describe("Démonstration PHASE (planches 01 à 10)", async () => {
  const user = await createUser(`phase-${Date.now()}@example.invalid`, "isolated-test-only", "Phase");
  const demo = await fr(() => phaseProject(user.id));
  const { spec } = demo;
  const files = compileTheme(spec);
  const render = (route: string) => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams());

  it("accueil de la planche 01, en-tête et pied PHASE, pages de la planche, une seule h1 par page", async () => {
    expect(validateSpec(spec)).toEqual([]);
    expect(types(spec, "index")).toEqual(["ph-hero", "ph-cards", "ph-cards", "ph-steps", "ph-cards", "ph-cta", "ph-page"]);
    expect(Object.values(spec.groups.header.sections).filter((s) => !s.disabled).map((s) => s.type)).toContain("ph-header");
    expect(Object.values(spec.groups.footer.sections).filter((s) => !s.disabled).map((s) => s.type)).toContain("ph-footer");
    for (const p of PH_PAGES) expect(spec.store.pages.map((x) => x.handle), p.handle).toContain(p.handle);
    for (const route of ["/", ...PH_PAGES.map((p) => `/pages/${p.handle}`)]) {
      const r = await render(route);
      expect(r.status, route).toBe(200);
      expect(r.html, route).not.toMatch(/Liquid error/);
      expect((r.html.match(/<h1\b/g) ?? []).length, `${route} : un seul titre principal`).toBe(1);
    }
    const nf = await render("/page-inconnue");
    expect(nf.status).toBe(404);
    expect(visibleText(nf.html)).toContain("On a perdu le contact.");
  });

  it("chaque page porte sa disposition de pied de page au téléphone (planches 06 à 10)", async () => {
    const look = async (route: string) => (await render(route)).html.match(/data-ph-foot-m="([a-z]+)"/)?.[1];
    expect(await look("/")).toBe("cols");
    expect(await look("/pages/installation-et-renovation")).toBe("grid");
    expect(await look("/pages/realisations")).toBe("pair");
    expect(await look("/pages/contact")).toBe("split");
    expect(await look("/pages/mentions-legales")).toBe("stack");
  });

  it("honnêteté : aucun avis, note, chiffre d'expérience, certification, délai garanti ni coordonnée inventés", async () => {
    const all: string[] = [];
    for (const route of ["/", ...PH_PAGES.map((p) => `/pages/${p.handle}`)]) all.push(visibleText((await render(route)).html));
    const text = all.join(" ");
    expect(text.match(/.{0,40}(★|\d[,.]\d ?\/ ?5|avis clients?|\d+ ?ans d'expérience|certifié|qualifelec|\bRGE\b|24 ?h ?\/ ?24|sous 24 ?h|intervention en \d+).{0,40}/i)?.[0] ?? null).toBeNull();
    expect(text).not.toMatch(/\b0[1-9](?: ?\d\d){4}\b/);
    expect(text).toContain("À renseigner");
    expect(text).toContain("Coordonnées à renseigner");
    expect(text).toMatch(/Projet illustratif|Visuel de démonstration/);
  });

  it("formulaires : démonstration sans envoi, erreurs près des champs, photos JPG/PNG/PDF, confirmation fondée sur la saisie réelle", async () => {
    const head = (await render("/pages/contact")).html;
    const cfg = JSON.parse(head.match(/<script type="application\/json" id="ph-config">([\s\S]*?)<\/script>/)![1]);
    expect(cfg.mode).toBe("demo");
    const quote = (await render("/pages/demande-de-devis")).html;
    expect(quote).toContain('data-ph-form="quote"');
    expect(quote).toMatch(/accept="\.jpg,\.jpeg,\.png,\.pdf/);
    expect(quote).toContain("data-ph-progress");
    for (const k of ["data-ph-summary", "data-ph-status", 'data-ph-field="email"', "ph-field__err"]) expect(quote, k).toContain(k);
    const confirm = (await render("/pages/demande-envoyee")).html;
    expect(confirm).toContain("data-ph-confirm");
    expect(visibleText(confirm)).toContain("Aucune demande n'a été faite depuis ce navigateur.");
    expect(visibleText(confirm)).not.toMatch(/envoyé par e-mail/);
    // Questionnaire de dépannage : reprend commune et symptômes dans la demande, n'envoie rien lui-même.
    const dep = (await render("/pages/depannage")).html;
    expect(dep).toMatch(/<form class="ph-triage__form" action="\/pages\/demande-de-devis" method="get"/);
  });

  it("filtres : réalisations, questions et conseils ; catégories multiples ; pagination des conseils", async () => {
    const rea = (await render("/pages/realisations")).html;
    expect(rea).toContain('data-ph-chips="projects"');
    expect(rea).toMatch(/data-ph-cat="renovation eclairage"/);
    const faq = (await render("/pages/faq")).html;
    expect(faq).toContain('data-ph-chips="faq"');
    expect(faq).toContain("data-ph-open-first");
    const con = (await render("/pages/conseils")).html;
    expect(con).toContain('data-ph-pager="pages"');
    expect(con).toContain("data-ph-per-m=");
  });

  it("cookies : rien de facultatif avant l'accord, préférences rouvrables", async () => {
    const home = (await render("/")).html;
    expect(home).toContain("data-ph-cookies");
    expect(home).not.toMatch(/googletagmanager|google-analytics|facebook\.net/);
    const prefs = (await render("/pages/donnees-et-cookies")).html;
    expect(prefs).toContain("data-ph-prefs");
    expect(prefs).toMatch(/data-ph-pref="necessary"[^>]*checked disabled/);
    expect(prefs).not.toMatch(/data-ph-pref="audience"[^>]*checked/);
  });

  it("édition : titre de l'accueil, section masquée, dupliquée et déplacée ; enregistrée puis relue", async () => {
    const order = spec.templates.index.order;
    const hero = order.find((id) => spec.templates.index.sections[id].type === "ph-hero")!;
    const cta = order.find((id) => spec.templates.index.sections[id].type === "ph-cta")!;
    const steps = order.find((id) => spec.templates.index.sections[id].type === "ph-steps")!;
    const r = applyOps(spec, [
      { op: "set_setting", template: "index", section: hero, key: "heading", value: "Le courant passe.\n[y]Chez vous aussi.[/y]" },
      { op: "toggle_section", template: "index", section: cta, disabled: true },
      { op: "duplicate_section", template: "index", section: steps },
      { op: "move_section", template: "index", section: steps, position: { index: 0 } },
    ] as never);
    expect(r.rejected ?? []).toEqual([]);
    const v = saveThemeVersion(demo.pid, r.spec, "Retouche", "user");
    const back = currentTheme(demo.pid)!;
    expect(back.version.id).toBe(v.id);
    expect(JSON.stringify(back.spec)).toBe(JSON.stringify(r.spec));
    const home = (await renderPage({ spec: back.spec, base: "", files: compileTheme(back.spec), cart: [] }, "/", new URLSearchParams())).html;
    expect(visibleText(home)).toContain("Chez vous aussi.");
    expect(home).not.toContain("On met votre projet");
    expect((home.match(/class="ph ph-steps /g) ?? []).length).toBe(2);
    expect(back.spec.templates.index.order[0]).toBe(steps);
  });
});

describe("Titres PHASE : couleurs reportées d'une ligne à l'autre", () => {
  it("un [y] ouvert sur une ligne et fermé plus loin donne un balisage valide", async () => {
    const spec = serviceSpec("phase" as never, "fr");
    const id = spec.templates.index.order.find((k) => spec.templates.index.sections[k].type === "ph-hero");
    if (!id) return;
    const r = applyOps(spec, [{ op: "set_setting", template: "index", section: id, key: "heading", value: "Une ligne\n[y]deux\ntrois[/y]" }] as never);
    const html = (await renderPage({ spec: r.spec, base: "", files: compileTheme(r.spec), cart: [] }, "/", new URLSearchParams())).html;
    expect(html).toContain('<span class="ph-ln"><span class="ph-y">deux</span></span> <span class="ph-ln"><span class="ph-y">trois</span></span>');
  });
});

describe("Adaptation de PHASE à un autre artisan", () => {
  it("reprend les contenus du client et n'emprunte rien à la démonstration", async () => {
    const spec = serviceSpec("phase" as never, "fr", undefined, { rich: true });
    const json = JSON.stringify([spec.templates, spec.groups, spec.store]);
    for (const demoOnly of ["phase-0", "Le courant passe.", "Rénovation d'un appartement", "Bien préparer son projet d'éclairage", "Faut-il réaliser une visite sur place"]) expect(json, demoOnly).not.toContain(demoOnly);
    expect(validateSpec(spec)).toEqual([]);
    const home = visibleText((await renderPage({ spec, base: "", files: compileTheme(spec), cart: [] }, "/", new URLSearchParams())).html);
    expect(home).not.toMatch(/PHASE ÉLECTRICITÉ/);
  });

  it("en anglais : réglages de l'en-tête en anglais", () => {
    const spec = serviceSpec("phase" as never, "en");
    const h = Object.values(spec.groups.header.sections).find((s) => s.type === "ph-header")!;
    expect(String(h.settings.consent_name)).toBe("Consent");
    expect(validateSpec(spec)).toEqual([]);
  });
});
