/**
 * SILLON V2 (PR #182, thème `sillon`, famille Produit spécifique / Boutique spécialisée, #148) : reproduction des trois
 * planches validées (12 pages) et des quatre planches téléphone. Garde-fous :
 *  - thème actif du catalogue, polices libres, 27 sections sv-* dans la bibliothèque (FR et EN), noms ≤ 25 caractères ;
 *  - démonstration : chaque page des planches, un H1 par page, toutes les photos utilisées, prix illustratif annoncé ;
 *  - honnêteté : commande simulée sans champ de carte ni faux succès, aucun total trompeur, notice « à ajouter »,
 *    aucune caractéristique, garantie, délai ou frais inventés ;
 *  - téléphone : contenus propres aux planches mobiles (menu, tiroir, FAQ à sept questions, panier vide) ;
 *  - édition et sauvegarde ; adaptation à un autre projet sans rien copier de la démonstration.
 */
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/lib/auth";
import { runWithLang } from "@/lib/i18n-server";
import { renderPage } from "@/lib/theme/render";
import { compileTheme } from "@/lib/theme/compile";
import { applyOps, validateSpec } from "@/lib/theme/ops";
import { catalogTheme } from "@/lib/theme/theme-catalog";
import { ACTIVE_THEMES, themeKinds } from "@/lib/theme/theme-fit";
import { THEME_FAMILY } from "@/lib/theme/section-families";
import { libraryEntry } from "@/lib/theme/section-library";
import { SV_PAGES } from "@/lib/theme/sillon-v2";
import { composeShop } from "@/lib/engine/shop";
import { currentTheme, saveBrand, loadProject, saveThemeVersion } from "@/lib/projects";
import { SILLON_MEDIA, SILLON_PRICE, sillonProject } from "./sillon-fixtures";
import { seedHoldout } from "./lot1-holdout-fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const visibleText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
const SECTIONS = fs.readdirSync(path.join("theme-base", "sections")).filter((f) => f.startsWith("sv-")).map((f) => f.replace(".liquid", ""));
const schemaOf = (type: string) => JSON.parse(fs.readFileSync(path.join("theme-base", "sections", `${type}.liquid`), "utf8").match(/{% schema %}([\s\S]*?){% endschema %}/)![1]);

describe("SILLON V2 : thème du catalogue", () => {
  it("actif, Boutique spécialisée, polices libres Anton et DM Sans, en-tête générique", () => {
    expect(ACTIVE_THEMES).toContain("sillon");
    expect(themeKinds("sillon")).toEqual(["specialty"]);
    expect(THEME_FAMILY.sillon).toBe("specialty");
    const t = catalogTheme("sillon")!;
    expect(t.fonts).toEqual({ heading: "anton_n4", body: "dm_sans_n4" });
    expect(t.headerCta).toMatchObject({ fr: "Découvrir", en: "Discover" });
  });

  it("27 sections sv-* : fiche de bibliothèque FR et EN, nom de schéma de 25 caractères au plus", () => {
    expect(SECTIONS).toHaveLength(27);
    for (const t of SECTIONS) {
      expect(libraryEntry(t, "fr")?.name, t).toBeTruthy();
      expect(libraryEntry(t, "en")?.name, t).toBeTruthy();
      expect(schemaOf(t).name.length, t).toBeLessThanOrEqual(25);
    }
  });

  it("courbes de niveau et chemins cuivre en SVG du thème (aucune image de décor)", () => {
    for (const f of ["sillon-topo-corner.svg", "sillon-topo-field.svg", "sillon-topo-rings.svg", "sillon-topo-tall.svg"]) expect(fs.existsSync(path.join("theme-base", "assets", f)), f).toBe(true);
    expect(fs.readFileSync(path.join("theme-base", "snippets", "sv-route.liquid"), "utf8")).toContain("<path d=\"{{ d }}\"");
  });
});

describe("SILLON V2 : démonstration (planches 01 à 03 et planches téléphone)", async () => {
  const user = await createUser(`sillon-v2-${Date.now()}@example.invalid`, "isolated-test-only", "Sillon");
  const demo = await fr(() => sillonProject(user.id));
  const { spec } = demo;
  const files = compileTheme(spec);
  const product = `/products/${spec.store.product.handle}`;
  const render = async (route: string, cart: { variantId: number; quantity: number }[] = []) => (await fr(() => renderPage({ spec, base: "", files, cart }, route, new URLSearchParams()))).html;
  const routes = ["/", product, "/cart", ...spec.store.pages.map((p) => `/pages/${p.handle}`)];
  const pages = new Map<string, string>();
  for (const r of routes) pages.set(r, await render(r));
  const variantId = Number((pages.get(product)!.match(/name="id" value="(\d+)"/) ?? [])[1]);

  it("toutes les pages des planches, valides, un H1 chacune ; toutes les photos utilisées", () => {
    expect(validateSpec(spec)).toEqual([]);
    expect(demo.missing).toEqual([]);
    expect(spec.store.pages.map((p) => p.handle)).toEqual(SV_PAGES.map((p) => p.handle));
    for (const [route, html] of pages) expect(html.match(/<h1[\s>]/g)?.length, `${route} : H1`).toBe(1);
    const all = [...pages.values()].join("\n");
    for (const m of SILLON_MEDIA) expect(all, m.file).toContain(m.file);
  });

  it("textes des planches : accueil, fiche, rituel, marque, carnet, FAQ, contact, livraison, suivi", () => {
    const t = (r: string) => visibleText(pages.get(r)!);
    expect(t("/")).toMatch(/Prenez\s+la tangente\./i);
    expect(t("/")).toMatch(/Petit format\./i);
    expect(t(product)).toMatch(/L'espresso\s+qui prend l'air\./i);
    expect(t(product)).toContain(`${SILLON_PRICE} €`);
    expect(t("/pages/le-rituel")).toMatch(/Votre pause\.\s+Votre cadence\./i);
    expect(t("/pages/sillon")).toMatch(/On aime\s+les détours\./i);
    expect(t("/pages/carnet")).toMatch(/Carnet\s+d'échappées\./i);
    expect(t("/pages/faq")).toMatch(/On vous\s+répond\./i);
    expect(t("/pages/contact")).toMatch(/On garde\s+le contact\./i);
    expect(t("/pages/livraison-et-retours")).toMatch(/Les infos\s+du voyage\./i);
    expect(t("/pages/suivi-de-commande")).toMatch(/Où en est\s+votre SILLON/i);
  });

  it("rien d'inventé : caractéristiques, garantie, délais et frais jamais affirmés ; prix annoncé comme illustratif", () => {
    for (const [route, html] of pages) {
      expect(visibleText(html), route).not.toMatch(/\d+\s?bars?\b|\d+\s?mAh|\d+\s?W\b|garantie (de )?\d|livraison (offerte|gratuite|en \d)|sous \d+ jours|\d+([,.]\d)?\s?\/\s?5|★|avis clients?|stock limité/i);
    }
    expect(visibleText(pages.get("/")!)).toMatch(/prix illustratif/i);
  });

  it("panier : sous-total réel, livraison « calculée à l'étape suivante », aucun total trompeur ; deux machines = 258 €", async () => {
    expect(variantId).toBeGreaterThan(0);
    const one = visibleText(await render("/cart", [{ variantId, quantity: 1 }]));
    expect(one).toContain("Calculée à l'étape suivante");
    expect(one).toContain("Total produits");
    const two = visibleText(await render("/cart", [{ variantId, quantity: 2 }]));
    expect(two).toContain(`${SILLON_PRICE * 2} €`);
    const empty = await render("/cart");
    expect(visibleText(empty)).toMatch(/La route\s+vous attend\./);
    expect(empty).toContain("v2-15-marque-route-lacets.webp");
  });

  it("commande simulée : annoncée, aucun champ de carte, paiement non validable, confirmation présentée comme un exemple", () => {
    const html = pages.get("/pages/commande")!;
    expect(visibleText(html)).toMatch(/aucun paiement/i);
    expect(html).not.toMatch(/<input[^>]*(autocomplete="cc-|name="[^"]*card|placeholder="[0-9 ]{12,})/i);
    expect(html).toMatch(/class="sv-checkout__mock"/);
    expect(html).toMatch(/data-final="off"/);
    expect(visibleText(html)).not.toMatch(/commande a bien été enregistrée/i);
    expect(visibleText(html)).toContain("Exemple de confirmation : aucune commande n'a été enregistrée.");
    expect(visibleText(html)).toContain("Écran illustratif de confirmation");
  });

  it("notice d'entretien « à ajouter » (aucun faux PDF) ; contact et suivi simulés et annoncés", () => {
    const rituel = pages.get("/pages/le-rituel")!;
    expect(visibleText(rituel)).toContain("(notice à ajouter)");
    expect(rituel).not.toMatch(/href="[^"]*\.pdf"/);
    expect(pages.get("/pages/contact")).toMatch(/data-sv-contact="true"/);
    expect(pages.get("/pages/suivi-de-commande")).toMatch(/data-sv-track/);
  });

  it("téléphone : menu (liens, contact, panier, mentions dans l'ordre de la planche), tiroir du panier, cookies", () => {
    const home = pages.get("/")!;
    const menu = home.slice(home.indexOf('class="sv-menu"'), home.indexOf('class="sv-drawer"'));
    expect(visibleText(menu)).toMatch(/La machine Le rituel Carnet SILLON Assistance/);
    expect(visibleText(menu)).toMatch(/Nous contacter.*Mon panier \(\s*0\s*\)/);
    expect(visibleText(menu)).toMatch(/Conditions de vente Confidentialité Mentions légales/);
    expect(home).toContain("sv-menu__route");
    expect(home).toMatch(/data-sv-drawer[\s\S]*Calculée à l'étape suivante/);
    expect(home).toMatch(/Tout accepter[\s\S]*Tout refuser[\s\S]*Personnaliser/);
  });

  it("FAQ : cinq questions et trois filtres sur ordinateur, sept et quatre au téléphone (planches respectives)", () => {
    const html = pages.get("/pages/faq")!;
    const items = [...html.matchAll(/<details class="sv-faq__item sv-vis--(\w+)"/g)].map((m) => m[1]);
    expect(items.filter((v) => v !== "mobile")).toHaveLength(5);
    expect(items.filter((v) => v !== "desktop")).toHaveLength(7);
    const pills = (cls: string) => (html.match(new RegExp(`<div class="sv-faq__filters ${cls}"[\\s\\S]*?</div>`))?.[0].match(/data-sv-faq-filter=/g) ?? []).length;
    expect(pills("sv-only-d")).toBe(3);
    expect(pills("sv-only-m")).toBe(4);
    expect(html).toContain('data-ph-mobile="Rechercher une réponse…"');
  });

  it("édition et sauvegarde : une retouche de l'éditeur est enregistrée et relue à l'identique", async () => {
    const tpl = spec.templates.index;
    const heroId = tpl.order.find((id) => tpl.sections[id].type === "sv-hero")!;
    const r = applyOps(spec, [{ op: "set_setting", template: "index", section: heroId, key: "heading", value: "Cap sur\nle lac." }] as never);
    expect(r.rejected ?? []).toEqual([]);
    const v = saveThemeVersion(demo.pid, r.spec, "Retouche", "user");
    const back = currentTheme(demo.pid)!;
    expect(back.version.id).toBe(v.id);
    expect(JSON.stringify(back.spec)).toBe(JSON.stringify(r.spec));
    const home = visibleText((await fr(() => renderPage({ spec: back.spec, base: "", files: compileTheme(back.spec), cart: [] }, "/", new URLSearchParams()))).html);
    expect(home).toMatch(/Cap sur\s+le lac\./);
  });
});

describe("SILLON V2 appliqué à un autre projet : son identité, jamais celle de la démonstration", async () => {
  const user = await createUser(`sillon-autre-${Date.now()}@example.invalid`, "isolated-test-only", "Autre");
  it("aucun nom, texte, photo ni prix de SILLON chez un autre client", async () => {
    const pid = seedHoldout(user.id, 0, "Atelier Verre");
    const p = loadProject(pid);
    saveBrand(pid, { ...p.brand!, name: "Atelier Verre", tagline: "Des verres soufflés pour tous les jours.", palette: { primary: "#1F4E5F", secondary: "#CFE3E8", accent: "#2A7F62", light: "#F6F8F7", dark: "#10242B" }, direction: "sillon" });
    const { spec } = await fr(() => composeShop(pid, "sillon", null, false));
    expect(spec.direction).toBe("sillon");
    expect(validateSpec(spec)).toEqual([]);
    const files = compileTheme(spec);
    const header = Object.values(spec.groups.header.sections).find((s) => s.type === "sv-header")!;
    expect(header.settings.checkout_mode).toBe("shopify");
    for (const route of ["/", `/products/${spec.store.product.handle}`, "/cart"]) {
      const html = (await fr(() => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams()))).html;
      const text = visibleText(html);
      expect(text, route).not.toMatch(/SILLON|espresso|\bcafé\b|\bvan\b|129 €|Prenez la tangente/i);
      expect(html, route).not.toMatch(/v2-\d\d-[a-z-]+\.webp/);
      expect(text, route).toContain("Atelier Verre");
    }
  });
});
