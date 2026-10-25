/**
 * FRAISE GUMMIES (thème `fraise`, famille Produit spécifique / Boutique spécialisée) : reproduction des sept planches
 * corrigées du 24 octobre 2026 (docs/theme-briefs/fraise-gummies/). Garde-fous :
 *  - thème actif du catalogue, polices libres, sections fg-* dans la bibliothèque (FR et EN), noms ≤ 25 caractères ;
 *  - offres : 1 flacon 16,60 €, 2 flacons 24,90 € (−50 % sur le 2ᵉ), 3 flacons 33,20 € (2 achetés + 1 offert), prix
 *    lus dans OFFRES_VALIDEES.json, messages CALCULÉS par le thème, aucun prix barré sur le flacon seul, comparaison
 *    barrée annoncée, prix total du lot en premier ; mêmes offres partout (accueil, fiche, boutique) ;
 *  - panier : quantité de lots × flacons par lot, mélanges (2 × 3 flacons = 6 flacons et 66,40 € ; 2 + 3 flacons = 5
 *    flacons et 58,10 €), 1 lot de 3 flacons ≠ 3 lots d'un flacon, livraison à calculer, aucun faux total ;
 *  - honnêteté : confiserie (aucune vitamine ni promesse de santé), commande simulée sans champ de carte ni faux succès,
 *    contact et suivi annoncés comme simulés, informations d'étiquette « à compléter » ;
 *  - démonstration : toutes les pages des planches, un H1 par page, chaque article du journal a son propre contenu ;
 *  - édition et sauvegarde ; adaptation à un autre client sans rien copier de FRAISE.
 * Les photos viennent du kit privé (public/demo/fraise/v2/, hors dépôt) : sans lui, les tests de démonstration sont
 * ignorés et seuls les contrôles du thème tournent.
 */
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/lib/auth";
import { runWithLang } from "@/lib/i18n-server";
import { renderPage, variantId } from "@/lib/theme/render";
import { compileTheme } from "@/lib/theme/compile";
import { applyOps, validateSpec } from "@/lib/theme/ops";
import { catalogTheme } from "@/lib/theme/theme-catalog";
import { ACTIVE_THEMES, themeKinds } from "@/lib/theme/theme-fit";
import { THEME_FAMILY } from "@/lib/theme/section-families";
import { libraryEntry } from "@/lib/theme/section-library";
import { FG_PAGES } from "@/lib/theme/fraise-v2";
import { composeShop } from "@/lib/engine/shop";
import { currentTheme, saveBrand, saveProduct, loadProject, saveThemeVersion } from "@/lib/projects";
import { FRAISE_DIR, FRAISE_MEDIA, fraiseOffers, fraiseProject } from "./fraise-fixtures";
import { seedHoldout } from "./lot1-holdout-fixtures";

beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau externe interdit"); }));
const fr = <T,>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
const visibleText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&rsquo;/g, "’").replace(/\s+/g, " ");
const SECTIONS = fs.readdirSync(path.join("theme-base", "sections")).filter((f) => f.startsWith("fg-")).map((f) => f.replace(".liquid", ""));
const schemaOf = (type: string) => JSON.parse(fs.readFileSync(path.join("theme-base", "sections", `${type}.liquid`), "utf8").match(/{% schema %}([\s\S]*?){% endschema %}/)![1]);
const KIT = fs.existsSync(path.join(FRAISE_DIR, "01-un-flacon-detoure.webp"));
const euro = (cents: number) => `${(cents / 100).toFixed(2).replace(".", ",")} €`;

describe("FRAISE : thème du catalogue", () => {
  it("actif, Boutique spécialisée, polices libres Poppins et DM Sans", () => {
    expect(ACTIVE_THEMES).toContain("fraise");
    expect(themeKinds("fraise")).toEqual(["specialty"]);
    expect(THEME_FAMILY.fraise).toBe("specialty");
    const t = catalogTheme("fraise")!;
    expect(t.fonts).toEqual({ heading: "poppins_n7", body: "dm_sans_n4" });
    expect(t.description).not.toMatch(/vitamine|complément/i);
    for (const f of ["Poppins-700.ttf", "Poppins-800.ttf", "PlayfairDisplay-800italic.ttf"]) expect(fs.existsSync(path.join("assets", "fonts", f)), f).toBe(true);
    for (const l of ["Poppins-OFL.txt", "PlayfairDisplay-OFL.txt", "Caveat-OFL.txt", "Fraunces-OFL.txt"]) expect(fs.existsSync(path.join("assets", "fonts", "licenses", l)), l).toBe(true);
  });

  it("30 sections fg-* : fiche de bibliothèque FR et EN, nom de schéma de 25 caractères au plus", () => {
    expect(SECTIONS).toHaveLength(30);
    for (const t of SECTIONS) {
      expect(libraryEntry(t, "fr")?.name, t).toBeTruthy();
      expect(libraryEntry(t, "en")?.name, t).toBeTruthy();
      expect(schemaOf(t).name.length, t).toBeLessThanOrEqual(25);
    }
  });

  it("aucun texte par défaut propre à FRAISE dans les sections (un autre client ne reçoit rien de la démonstration)", () => {
    for (const t of SECTIONS) {
      const defaults = JSON.stringify(schemaOf(t)).match(/"default":\s*"[^"]*"/g) ?? [];
      for (const d of defaults) expect(d, `${t} ${d}`).not.toMatch(/fraise|flacon|gummies|douceur|16,60|24,90|33,20/i);
    }
  });

  it("offres calculées par le thème : aucun message ni prix d'offre écrit en dur dans le snippet", () => {
    const snippet = fs.readFileSync(path.join("theme-base", "snippets", "fg-offer.liquid"), "utf8");
    expect(snippet).toContain("assign ref = unit_price | times: n");
    expect(snippet).toContain("assign eco = ref | minus: variant.price");
    expect(snippet).not.toMatch(/1660|2490|3320|16,60|24,90|33,20/);
  });
});

describe.skipIf(!KIT)("FRAISE : démonstration (sept planches)", async () => {
  const user = await createUser(`fraise-${Date.now()}@example.invalid`, "isolated-test-only", "Fraise");
  const demo = await fr(() => fraiseProject(user.id));
  const { spec } = demo;
  const files = compileTheme(spec);
  const product = `/products/${spec.store.product.handle}`;
  const render = async (route: string, cart: { variantId: number; quantity: number }[] = []) => (await fr(() => renderPage({ spec, base: "", files, cart }, route, new URLSearchParams()))).html;
  const routes = ["/", product, "/collections/all", "/cart", ...spec.store.pages.map((p) => `/pages/${p.handle}`)];
  const pages = new Map<string, string>();
  for (const r of routes) pages.set(r, await render(r));
  const { offers, examples, unit } = fraiseOffers();
  const V = offers.map((_, i) => variantId(0, i));

  it("toutes les pages des planches, valides, un H1 chacune ; toutes les photos complémentaires utilisées", () => {
    expect(validateSpec(spec)).toEqual([]);
    expect(demo.missing).toEqual([]);
    expect(spec.store.pages.map((p) => p.handle)).toEqual(FG_PAGES.map((p) => p.handle));
    for (const [route, html] of pages) expect(html.match(/<h1[\s>]/g)?.length, `${route} : H1`).toBe(1);
    const all = [...pages.values()].join("\n");
    for (const m of FRAISE_MEDIA.filter((x) => !/^(0[1-9]-(hero|fond-clair|vue-plongee|detail-gummies|detail-packaging|banniere|scene-cuisine|scene-jardin|scene-fete))/.test(x.file))) expect(all, m.file).toContain(m.file);
  });

  it("produit : un seul produit en trois formats, prix de OFFRES_VALIDEES.json (centimes entiers)", () => {
    const p = spec.store.product;
    expect(p.variants.map((v) => v.title)).toEqual(["1 flacon", "2 flacons", "3 flacons"]);
    expect(p.variants.map((v) => v.price)).toEqual([1660, 2490, 3320]);
    expect(offers.map((o) => o.prix_pack_centimes)).toEqual([1660, 2490, 3320]);
    expect(unit).toBe(1660);
    expect(p.compare_at_price).toBeNull();
    expect(spec.store.products ?? []).toEqual([]);
  });

  it("offres identiques partout : prix total du lot, messages calculés, comparaison annoncée, rien de barré sur le flacon seul", () => {
    for (const route of ["/", product, "/collections/all"]) {
      const html = pages.get(route)!;
      const t = visibleText(html);
      for (const o of offers) expect(t, `${route} ${o.id}`).toContain(euro(o.prix_pack_centimes));
      expect(t, route).toMatch(/2 achetés \+ 1 offert/i);
      expect(t, route).toMatch(/−50 % sur le 2ᵉ/);
      expect(t, route).toContain("Économisez 8,30 €");
      expect(t, route).toContain("Économisez 16,60 €");
      expect(t, route).toContain("≈ 11,07 € / flacon");
      // Prix barrés : seulement 33,20 € (2 unités) et 49,80 € (3 unités), annoncés aux lecteurs d'écran.
      const struck = [...html.matchAll(/<s>([^<]+)<\/s>/g)].map((m) => m[1]);
      expect(struck.every((x) => x === "33,20 €" || x === "49,80 €"), `${route} ${struck}`).toBe(true);
      expect(struck).not.toContain("16,60 €");
      // Planche boutique : pas de prix barré ; ailleurs, chaque prix barré est annoncé comme une comparaison.
      if (struck.length) expect(html, route).toMatch(/Même quantité à l’unité :/);
    }
    // « Meilleure offre » : le lot au prix par flacon le plus bas (calcul), pas une popularité.
    const home = pages.get("/")!;
    expect(home.match(/class="fg-offer__best"/g)?.length).toBe(1);
    expect(home).toMatch(/is-best[\s\S]{0,2000}3 flacons/);
  });

  it("panier : 1 flacon = 16,60 € de sous-total, livraison à calculer, aucun total final ; lots × flacons par lot", async () => {
    const one = visibleText(await render("/cart", [{ variantId: V[0], quantity: 1 }]));
    expect(one).toContain("16,60 €");
    expect(one).toContain("Calculée à l’étape suivante");
    expect(one).toMatch(/Total des produits \(hors livraison\)/i);
    // 1 lot de 3 flacons (33,20 €) ≠ 3 lots d'un flacon (49,80 €).
    const pack3 = visibleText(await render("/cart", [{ variantId: V[2], quantity: 1 }]));
    expect(pack3).toContain("33,20 €");
    expect(pack3).toContain("3 flacons au total");
    const units3 = visibleText(await render("/cart", [{ variantId: V[0], quantity: 3 }]));
    expect(units3).toContain("49,80 €");
    expect(units3).toContain("3 flacons au total");
    // Exemples validés : {fraise-3: 2} → 6 flacons, 66,40 € ; {fraise-2: 1, fraise-3: 1} → 5 flacons, 58,10 €.
    for (const ex of examples) {
      const cart = Object.entries(ex.packs).map(([id, q]) => ({ variantId: V[offers.findIndex((o) => o.id === id)], quantity: q }));
      const html = await render("/cart", cart);
      expect(visibleText(html), JSON.stringify(ex.packs)).toContain(euro(ex.sous_total_centimes));
      const units = [...html.matchAll(/data-units="(\d+)"/g)].reduce((s, m) => s + Number(m[1]), 0);
      expect(units, JSON.stringify(ex.packs)).toBe(ex.flacons);
    }
    const empty = await render("/cart");
    expect(visibleText(empty)).toMatch(/Un peu de place\s+pour FRAISE \?/);
  });

  it("ajouts : chaque carte ajoute SON lot (variante), un lot à la fois ; la fiche ajoute le format choisi", () => {
    const home = pages.get("/")!;
    const offerForms = [...home.matchAll(/class="fg-offer fg-offer--card[^"]*" data-fg-offer data-variant="(\d+)"[\s\S]*?name="id" value="(\d+)"[\s\S]*?name="quantity" value="(\d+)"/g)];
    expect(offerForms.map((m) => Number(m[1]))).toEqual(V);
    for (const m of offerForms) { expect(m[2]).toBe(m[1]); expect(m[3]).toBe("1"); }
    const fiche = pages.get(product)!;
    expect(fiche).toMatch(/name="fg-format" value="\d+" checked/);
    expect(fiche).toContain("Ajouter le pack — <span data-fg-sel-total>33,20 €</span>");
    expect(fiche).toMatch(/data-fg-buybar/);
  });

  it("fiche : chaque carte de format montre sa photo (aucun texte technique à la place)", () => {
    const fiche = pages.get(product)!;
    const cards = [...fiche.matchAll(/<label class="fg-offer fg-offer--choice[\s\S]*?<\/label>/g)].map((m) => m[0]);
    expect(cards).toHaveLength(3);
    for (const c of cards) expect(c).toMatch(/<img [^>]*class="fg-img__main"/);
    expect(visibleText(fiche)).not.toMatch(/\b100vw\b/);
  });

  it("confiserie, rien d'inventé : aucune vitamine, promesse de santé, avis, stock ou certification", () => {
    for (const [route, html] of pages) {
      // Les avertissements honnêtes (« aucune recommandation de santé ») ne comptent pas comme promesse.
      const t = visibleText(html).replace(/aucune (recommandation|promesse|allégation) de santé/gi, "");
      expect(t, route).not.toMatch(/vitamin|complément alimentaire|immunit|bienfait|santé|sans sucre|bio\b|certifi|★|avis clients?|stock limité|plus vendu|best-?seller|\d+\s?%\s?(de )?fruits?/i);
    }
    expect(visibleText(pages.get("/pages/la-recette")!)).toMatch(/À compléter/);
  });

  it("commande simulée : annoncée, aucun champ de carte, paiement non validable, confirmation présentée comme un exemple", () => {
    const html = pages.get("/pages/commande")!;
    const t = visibleText(html);
    expect(t).toMatch(/aucun paiement, aucun envoi/i);
    expect(html).not.toMatch(/<input[^>]*(autocomplete="cc-|name="[^"]*card|name="[^"]*cvc)/i);
    expect(html).toMatch(/class="fg-co__mock" aria-hidden="true"/);
    expect(html).toMatch(/class="fg-btn fg-co__pay" disabled/);
    expect(t).not.toMatch(/commande a bien été enregistrée/i);
    expect(t).toContain("Exemple d'écran : aucune commande n'a été enregistrée.");
    expect(html).toMatch(/<input type="checkbox" name="newsletter">/);
  });

  it("contact, suivi et inscription : simulés et annoncés ; consentement décoché", () => {
    expect(pages.get("/pages/contact")).toMatch(/data-fg-contact="demo"/);
    expect(pages.get("/pages/contact")).toMatch(/<input type="checkbox" name="contact\[consent\]" required>/);
    expect(pages.get("/pages/suivi-de-commande")).toMatch(/data-fg-track="demo"/);
    expect(visibleText(pages.get("/pages/suivi-de-commande")!)).toMatch(/Exemple de résultat \(démonstration\)/);
  });

  it("journal : filtres reliés aux catégories, chaque carte ouvre SON article, contenus distincts", () => {
    const j = pages.get("/pages/journal")!;
    expect(j).toMatch(/data-fg-filter="le-gout"/);
    const links = [...j.matchAll(/class="fg-journal__card" href="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(links).size).toBe(links.length);
    const bodies = spec.store.pages.filter((p) => p.handle.startsWith("journal-")).map((p) => visibleText(pages.get(`/pages/${p.handle}`)!).slice(0, 4000));
    expect(bodies.length).toBe(6);
    expect(new Set(bodies).size).toBe(6);
  });

  it("téléphone : menu (liens, recherche, mentions), tiroir, cookies, questions propres à la planche mobile", () => {
    const home = pages.get("/")!;
    const menu = home.slice(home.indexOf('class="fg-menu"'), home.indexOf('class="fg-drawer"'));
    expect(visibleText(menu)).toMatch(/Les gummies La recette Notre histoire Journal Aide Mon panier/);
    expect(menu).toMatch(/fg-menu__search/);
    expect(home).toMatch(/data-fg-drawer[\s\S]*Calculée à l’étape suivante/);
    expect(home).toMatch(/Tout accepter[\s\S]*Tout refuser[\s\S]*Personnaliser/);
    const faq = pages.get("/pages/faq")!;
    expect(faq.match(/fg-vis--mobile/g)?.length).toBe(1);
    expect(faq).toContain("Comment choisir mon lot ?");
  });

  it("édition et sauvegarde : une retouche de l'éditeur est enregistrée et relue à l'identique", async () => {
    const tpl = spec.templates.index;
    const heroId = tpl.order.find((id) => tpl.sections[id].type === "fg-hero")!;
    const r = applyOps(spec, [{ op: "set_setting", template: "index", section: heroId, key: "heading", value: "Un goût\n[i]qui reste.[/i]" }] as never);
    expect(r.rejected ?? []).toEqual([]);
    const v = saveThemeVersion(demo.pid, r.spec, "Retouche", "user");
    const back = currentTheme(demo.pid)!;
    expect(back.version.id).toBe(v.id);
    expect(JSON.stringify(back.spec)).toBe(JSON.stringify(r.spec));
    const home = visibleText((await fr(() => renderPage({ spec: back.spec, base: "", files: compileTheme(back.spec), cart: [] }, "/", new URLSearchParams()))).html);
    expect(home).toMatch(/Un goût\s+qui reste\./);
  });

  it("édition : photo, prix, duplication et déplacement de section enregistrés ; les offres se recalculent depuis les prix", async () => {
    const tpl = spec.templates.index;
    const heroId = tpl.order.find((id) => tpl.sections[id].type === "fg-hero")!;
    const offersId = tpl.order.find((id) => tpl.sections[id].type === "fg-offers")!;
    const photo = Object.keys(spec.files).find((k) => k.includes("13-scene-jardin"))!;
    expect(photo).toBeTruthy();
    const r = applyOps(spec, [
      { op: "set_setting", template: "index", section: heroId, key: "image_asset", value: photo },
      { op: "duplicate_section", template: "index", section: offersId },
      { op: "move_section", template: "index", section: offersId, position: { index: 1 } },
    ] as never);
    expect(r.rejected ?? []).toEqual([]);
    const next = JSON.parse(JSON.stringify(r.spec)) as typeof spec;
    // Prix du lot de deux modifié dans la fiche produit du studio : 23,90 € au lieu de 24,90 €.
    next.store.product.variants[1].price = 2390;
    expect(validateSpec(next)).toEqual([]);
    saveThemeVersion(demo.pid, next, "Photo, prix et sections", "user");
    const back = currentTheme(demo.pid)!.spec;
    expect(back.templates.index.order.filter((id) => back.templates.index.sections[id].type === "fg-offers")).toHaveLength(2);
    expect(back.templates.index.order[1]).toBe(offersId);
    const html = (await fr(() => renderPage({ spec: back, base: "", files: compileTheme(back), cart: [] }, "/", new URLSearchParams()))).html;
    expect(html).toContain(photo);
    const t = visibleText(html);
    expect(t).toContain("23,90 €");
    expect(t).not.toContain("24,90 €");
    // 2 flacons à 23,90 € : économie 9,30 € sur 33,20 €, le 2ᵉ revient à 7,30 € (−56 %), messages recalculés.
    expect(t).toContain("Économisez 9,30 €");
    expect(t).toMatch(/−56 % sur le 2ᵉ/);
    expect(t).toContain("Le 2ᵉ à 7,30 €");
  });
});

describe("FRAISE appliqué à un autre projet : son identité, jamais celle de la démonstration", async () => {
  const user = await createUser(`fraise-autre-${Date.now()}@example.invalid`, "isolated-test-only", "Autre");
  it("aucun nom, texte, photo ni prix de FRAISE chez un autre client ; paiement Shopify", async () => {
    const pid = seedHoldout(user.id, 0, "Maison Miel");
    const p = loadProject(pid);
    saveBrand(pid, { ...p.brand!, name: "Maison Miel", tagline: "Du miel de nos ruches.", palette: { primary: "#C98A1A", secondary: "#F7EBD3", accent: "#7A4E12", light: "#FFF9EE", dark: "#2B1C08" }, direction: "fraise" });
    saveProduct(pid, { ...p.product!, name: "Miel de fleurs", price: { amount: 12, currency: "EUR", status: "confirmed" } });
    const { spec } = await fr(() => composeShop(pid, "fraise", null, false));
    expect(spec.direction).toBe("fraise");
    expect(validateSpec(spec)).toEqual([]);
    const files = compileTheme(spec);
    const header = Object.values(spec.groups.header.sections).find((s) => s.type === "fg-header")!;
    expect(header.settings.checkout_mode).toBe("shopify");
    for (const route of ["/", `/products/${spec.store.product.handle}`, "/cart"]) {
      const html = (await fr(() => renderPage({ spec, base: "", files, cart: [] }, route, new URLSearchParams()))).html;
      const text = visibleText(html);
      expect(text, route).not.toMatch(/FRAISE|fraise|gummies|60 douceurs|flacon|16,60|24,90|33,20/i);
      expect(html, route).not.toMatch(/\d\d-[a-z-]+-(detoure|fraises|flacon)[a-z-]*\.webp/);
      expect(text, route).toContain("Maison Miel");
    }
  });
});
