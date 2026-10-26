/**
 * APLAT — Plâtrerie & Peinture (PR #187, dix planches du 25 octobre) :
 *  - sections « ap- » réservées au thème APLAT d'un site de services, rangées dans la galerie, libellés FR/EN ;
 *  - feuille et script du thème sans texte affiché ni règle qui s'échappe du thème ;
 *  - « Choisir ce thème » pose la structure des planches avec les données du client : prestations, méthode, questions,
 *    coordonnées et façon de contacter ; aucune photo, coordonnée, réalisation ni texte de la démonstration ;
 *    toutes les pages se rendent, sans lien mort ni lien « # » ;
 *  - formulaires honnêtes (pas de prix automatique, photos non envoyées sans service relié, envoi simulé en démonstration)
 *    et cookies : essentiels toujours actifs, mesure d'audience et contenus externes désactivés par défaut ;
 *  - démonstration complète (kit privé, sautée s'il est absent) : 18 pages et la page introuvable rendues.
 */
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/lib/auth";
import { composeShop } from "@/lib/engine/shop";
import { localBrand } from "@/lib/engine/local";
import { run, now } from "@/lib/db";
import { emptyProduct, emptyServiceProfile, type ServiceProfile } from "@/lib/project-types";
import { loadProject, saveBrand, saveProduct, saveServices, saveSettings, saveStrategy } from "@/lib/projects";
import { compileTheme } from "@/lib/theme/compile";
import { renderPage } from "@/lib/theme/render";
import { sectionFitReason } from "@/lib/theme/section-fit";
import { runWithLang } from "@/lib/i18n-server";
import type { ThemeSpec } from "@/lib/theme/spec";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { AP_DIR, AP_MEDIA, aplatProject } from "./aplat-fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const en = <T,>(f: () => T) => runWithLang({ content: "en", ui: "en" }, f);
const ROOT = process.cwd();
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8");
const text = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&#39;/g, "'").replace(/\s+/g, " ");
const SECTIONS = fs.readdirSync(path.join(ROOT, "theme-base/sections")).filter((f) => /^ap-.*\.liquid$/.test(f)).map((f) => f.replace(/\.liquid$/, ""));
const kit = fs.existsSync(path.join(AP_DIR, "01_accueil_chantier_mixte.webp"));

/** Projet de services d'un client fictif, composé dans le thème APLAT par le parcours normal (sans la démonstration). */
async function clientProject(label: string, profile: Partial<ServiceProfile> = {}, lang: "fr" | "en" = "fr") {
  const user = await createUser(`aplat-${label}@example.invalid`, "isolated-test-only", "Artisan");
  const pid = seedHoldout(user.id, 2, `Atelier ${label}`);
  const product = { ...emptyProduct(), name: "Peinture intérieure", nameStatus: "provided" as const, category: "Peinture", sector: "services" as never, summary: "Peinture des murs et plafonds." };
  saveProduct(pid, product);
  const services: ServiceProfile = { ...emptyServiceProfile(), services: [{ key: "murs", name: "Peinture des murs", description: "Murs intérieurs, préparation comprise." }, { key: "plafonds", name: "Plafonds", description: "Peinture et reprise des plafonds." }], contactMode: "quote", contactModes: ["quote", "form"], phone: "01 23 45 67 89", email: "atelier@example.invalid", area: "Lyon et alentours", ...profile };
  const local = localBrand(product, `Atelier ${label}`, { business: "services", services });
  saveBrand(pid, { ...local.brand, name: `Atelier ${label}`, generatedBy: "local" as const });
  saveStrategy(pid, local.strategy);
  saveServices(pid, services);
  run("UPDATE projects SET business_type = ?, updated_at = ? WHERE id = ?", "services", now(), pid);
  saveSettings(pid, { ...loadProject(pid).settings, storeKind: "services" });
  const wrap = lang === "en" ? en : fr;
  const built = await wrap(() => composeShop(pid, "aplat" as never, null, false));
  return { pid, spec: built.spec as ThemeSpec };
}
const render = (spec: ThemeSpec, route: string, lang: "fr" | "en" = "fr") => (lang === "en" ? en : fr)(() => renderPage({ spec, base: "/p", files: compileTheme(spec), cart: [] }, route, new URLSearchParams()));

describe("APLAT : sections, libellés et feuille du thème", () => {
  it("les sections « ap- » sont réservées au thème APLAT d'un site de services", () => {
    expect(SECTIONS.length).toBeGreaterThanOrEqual(13);
    // En-tête, pied et confirmation : structure du thème, jamais proposés dans la galerie (section-library, NOT_ADDABLE).
    for (const type of SECTIONS.filter((x) => !["ap-header", "ap-footer", "ap-confirm"].includes(x))) {
      expect(sectionFitReason(type, { kind: "services", theme: "aplat", settings: { editorial_profile: "aplat" } }), type).toBe("");
      expect(sectionFitReason(type, { kind: "services", theme: "rive", settings: { editorial_profile: "journal" } }), type).not.toBe("");
    }
  });

  it("chaque libellé de réglage des sections « ap- » a sa traduction anglaise", () => {
    const enLabels = JSON.parse(read("theme-base/i18n/schema.en.json")) as Record<string, string>;
    const missing = new Set<string>();
    const walk = (o: unknown): void => {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) if (["label", "info", "name", "content"].includes(k) && typeof v === "string") { if (!enLabels[v]) missing.add(v); } else walk(v);
    };
    for (const type of SECTIONS) walk(JSON.parse(/{% schema %}([\s\S]*?){% endschema %}/.exec(read(`theme-base/sections/${type}.liquid`))![1]));
    expect([...missing]).toEqual([]);
  });

  it("la feuille ne contient aucun texte affiché et chaque règle reste dans le thème", () => {
    const css = read("theme-base/assets/aplat.css").replace(/\/\*[\s\S]*?\*\//g, "");
    // Seuls des contenus décoratifs (vides, séparateurs du fil d'Ariane) : aucun texte de l'interface dans la feuille.
    for (const m of css.matchAll(/content:\s*("[^"]*"|'[^']*')/g)) expect(['""', '">"', '"/"', '"|"', "''"], m[0]).toContain(m[1]);
    const selectors = [...css.replace(/@media[^{]*\{/g, "").matchAll(/([^{}]+)\{[^{}]*\}/g)].map((m) => m[1].trim()).filter((s) => s && !s.startsWith("@") && !/^(from|to|\d+%)$/.test(s));
    // Virgules de premier niveau seulement (« :where(h1, h2) » reste un seul sélecteur).
    const split = (g: string) => { const out: string[] = []; let depth = 0, cur = ""; for (const ch of g) { if (ch === "(") depth++; if (ch === ")") depth--; if (ch === "," && depth === 0) { out.push(cur); cur = ""; } else cur += ch; } return [...out, cur]; };
    for (const group of selectors) for (const sel of split(group)) expect(sel.trim(), sel).toMatch(/\.ap-|data-editorial="aplat"|^:root$/);
  });

  it("cookies : essentiels toujours actifs, mesure d'audience et contenus externes désactivés par défaut", () => {
    const consent = read("theme-base/snippets/ap-consent.liquid");
    expect(consent).toMatch(/<input type="checkbox" checked disabled/);
    expect(consent).toMatch(/name="audience" data-ap-consent="audience"(?![^>]*checked)/);
    expect(consent).toMatch(/name="external" data-ap-consent="external"(?![^>]*checked)/);
    const js = read("theme-base/assets/aplat.js");
    // Les contenus soumis à accord restent dans des <template> tant que la catégorie n'est pas acceptée.
    expect(js).toContain('template[data-ap-consent-category]');
    expect(js).toMatch(/if \(t\._apDone \|\| !c \|\| !c\[t\.getAttribute\("data-ap-consent-category"\)\]\) return;/);
  });

  it("devis : formats et taille des photos contrôlés, aucun prix automatique, envoi simulé en démonstration", () => {
    const js = read("theme-base/assets/aplat.js");
    expect(js).toContain("/^image\\/(jpeg|png)$/.test(file.type)");
    const form = read("theme-base/sections/ap-form.liquid");
    expect(form).toContain("data-max-mb");
    expect(form).toContain("photos_off_text");
    expect(read("theme-base/sections/ap-confirm.liquid")).toContain("Démonstration — demande non envoyée");
  });
});

describe("APLAT : « Choisir ce thème » pose les pages avec les données du client", () => {
  it("accueil, prestations, approche, questions, contact, devis, confirmation, pages légales et 404", async () => {
    const { spec } = await clientProject("pages");
    const types = (key: string) => spec.templates[key].order.map((o) => spec.templates[key].sections[o].type);
    expect(types("index")).toEqual(expect.arrayContaining(["ap-hero", "ap-strip", "ap-cards", "ap-faq", "ap-cta"]));
    const handles = spec.store.pages.map((p) => p.handle);
    for (const h of ["prestations", "a-propos", "faq", "contact", "devis", "confirmation", "mentions-legales", "confidentialite", "cookies"]) expect(handles, h).toContain(h);
    expect(types("page.devis")).toContain("ap-form");
    expect(types("page.cookies")).toContain("ap-legal");
    expect(types("404")).toEqual(["ap-hero"]);
    // Prestations du client, dans l'ordre, et ses coordonnées dans la page Contact.
    const services = Object.values(spec.templates["page.prestations"].sections).find((s) => s.type === "ap-cards")!;
    expect(services.block_order!.map((b) => services.blocks![b].settings.title)).toEqual(["Peinture des murs", "Plafonds"]);
    const contact = Object.values(spec.templates["page.contact"].sections).find((s) => s.type === "ap-form")!;
    expect(contact.settings.info_phone).toBe("01 23 45 67 89");
    expect(String(contact.settings.info_text)).toContain("atelier@example.invalid");
    // Le choix « Type de travaux » du devis reprend les prestations du client.
    const quote = Object.values(spec.templates["page.devis"].sections).find((s) => s.type === "ap-form")!;
    const travaux = Object.values(quote.blocks!).find((b) => b.settings.name === "travaux")!;
    expect(travaux.settings.options).toBe("Peinture des murs\nPlafonds");
  });

  it("aucune photo, coordonnée ni texte de la démonstration ; aucun lien mort ni « # »", async () => {
    const { spec } = await clientProject("fuite");
    const json = JSON.stringify(spec);
    for (const file of Object.keys(AP_MEDIA)) expect(json, file).not.toContain(file);
    for (const demo of ["Des murs justes", "Projet Résidentiel", "Projet illustratif", "Simulation avant/après", "ap-logo-aplat", "Quelles photos joindre"]) expect(json, demo).not.toContain(demo);
    const pages = new Set(["/", ...spec.store.pages.map((p) => `/pages/${p.handle}`)]);
    const links: string[] = [];
    for (const m of Object.values(spec.store.menus)) for (const l of m.links) { links.push(l.url); for (const s of l.links ?? []) links.push(s.url); }
    for (const t of Object.values(spec.templates)) for (const s of Object.values(t.sections)) {
      for (const [k, v] of Object.entries(s.settings)) if (/link$/.test(k) && typeof v === "string" && v) links.push(v);
      for (const b of Object.values(s.blocks ?? {})) for (const [k, v] of Object.entries(b.settings)) if (/link$/.test(k) && typeof v === "string" && v) links.push(v);
    }
    for (const url of links) {
      expect(url, url).not.toMatch(/^#/);
      if (url.startsWith("/pages/") || url === "/") expect(pages.has(url.split("#")[0]), url).toBe(true);
    }
  });

  it("toutes les pages se rendent sans erreur, en français et en anglais", async () => {
    for (const lang of ["fr", "en"] as const) {
      const { spec } = await clientProject(`rendu-${lang}`, {}, lang);
      for (const route of ["/", ...spec.store.pages.map((p) => `/pages/${p.handle}`), "/pages/introuvable-xyz"]) {
        const r = await render(spec, route, lang);
        expect(r.html, `${lang} ${route}`).not.toMatch(/Liquid error|Erreur Liquid|undefined/);
        expect(r.html, `${lang} ${route}`).toContain("ap-header");
      }
      const home = text((await render(spec, "/", lang)).html);
      expect(home).toContain(lang === "en" ? "Request a quote" : "Demander un devis");
    }
  });

  it("sans demande de devis, pas de page Devis : l'appel mène au contact", async () => {
    const { spec } = await clientProject("formulaire", { contactMode: "form", contactModes: ["form"] });
    const handles = spec.store.pages.map((p) => p.handle);
    expect(handles).not.toContain("devis");
    const header = Object.values(spec.groups).flatMap((g) => Object.values(g.sections)).find((s) => s.type === "ap-header")!;
    expect(header.settings.cta_link).toBe("/pages/contact");
  });

  it("l'adaptation se compose aussi dans le navigateur (onglet Marque) : aucun module serveur importé", () => {
    const src = read("src/lib/theme/aplat-site.ts");
    expect([...src.matchAll(/^import\s+(?!type\b).*$/gm)].map((m) => m[0])).toEqual([]);
  });
});

describe.skipIf(!kit)("APLAT : démonstration complète (kit privé)", () => {
  it("les 18 pages et la page introuvable se rendent, avec la mention d'envoi simulé", async () => {
    const user = await createUser("aplat-demo@example.invalid", "isolated-test-only", "Démo");
    const { spec } = await fr(() => aplatProject(user.id));
    expect(spec.store.pages.length).toBe(17);
    const demoSpec = spec;
    expect(spec.meta?.demo?.isDemo).toBe(true);
    for (const route of ["/", ...spec.store.pages.map((p) => `/pages/${p.handle}`), "/pages/introuvable-xyz"]) {
      const r = await render(demoSpec, route);
      expect(r.html, route).not.toMatch(/Liquid error|Erreur Liquid/);
    }
    expect(text((await render(demoSpec, "/pages/confirmation")).html)).toContain("Démonstration — demande non envoyée");
  });
});
