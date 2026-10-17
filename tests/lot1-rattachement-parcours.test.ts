/** Vrais stockage, composition, rendu et exports ; aucune IA ni simulation de l'association. */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createUser } from "@/lib/auth";
import { run } from "@/lib/db";
import { loadProject, currentTheme, saveServices, saveThemeVersion, saveCatalog, saveProduct } from "@/lib/projects";
import { sitePages, existingPages, resolvePage } from "@/lib/seo-v2/pages";
import { deliverContent } from "@/lib/seo-v2/theme-delivery";
import { composeThemeV2 } from "@/lib/theme-v2/engine";
import { renderPage } from "@/lib/theme/render";
import { cmsExport } from "@/lib/cms-v2/export";
import { exportBundle } from "@/lib/seo-v2/cms";
import { referenceDoc } from "@/lib/seo-v2/theme-copy";
import { shopifyProductsCsv } from "@/lib/theme/catalog-export";
import { storeProducts, escapeHtml } from "@/lib/theme/spec";
import { runWithLang } from "@/lib/i18n-server";
import { unzipSync, strFromU8 } from "fflate";
import { servicePair, productPair, writePair, markers, TARGETS, clone } from "./lot1-rattachement-fixtures";
beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau interdit dans cette régression isolée"); }));
const fr = <T>(fn: () => T) => runWithLang({ content: "fr", ui: "fr" }, fn);
const orders = [false, true].flatMap((reverseServices) => [false, true].map((reversePages) => ({ reverseServices, reversePages })));
describe("Lot 1 — rattachement jusqu'au rendu/export", async () => {
  const user = await createUser("association-parcours-" + Date.now() + "@example.invalid", "isolated-test-only", "Test synthétique");
  for (const activity of [2, 3] as const) it.each(orders)("activité " + activity + ", ordres %j : textes et SEO conservés", async (order) => fr(async () => {
    const { pid } = await servicePair(user.id, { activity, ...order });
    await writePair(pid);
    const before = currentTheme(pid)!;
    const built = await composeThemeV2(pid);
    expect(TARGETS.map((k) => sitePages(loadProject(pid)).find((p) => p.key === k)?.url)).toEqual(["/pages/prestation-1", "/pages/prestation-2"]);
    const exp = await cmsExport("shopify", built.spec, () => null);
    const zip = unzipSync(exp.zip);
    for (const [i, target] of TARGETS.entries()) {
      const m = markers(i + 1), other = markers(2 - i);
      const pg = built.spec.store.pages.find((p) => p.contentTarget === target)!;
      expect(pg.handle).toBe("prestation-" + (i + 1));
      expect(pg.body_html).toContain(m.text); expect(pg.body_html).not.toContain(other.text);
      expect(pg.seo).toEqual({ title: m.title, description: m.description });
      const rendered = await renderPage({ spec: built.spec, base: "", cart: [] }, "/pages/" + pg.handle, new URLSearchParams());
      expect(rendered.status).toBe(200);
      expect(rendered.html).toContain(m.text); expect(rendered.html).not.toContain(other.text);
      expect(rendered.html).toContain(m.title); expect(rendered.html).toContain(escapeHtml(m.description));
      const exported = strFromU8(zip["templates/page." + pg.template_suffix + ".json"]);
      expect(exported).toContain(m.text); expect(exported).not.toContain(other.text);
      const metadata = Object.values(exportBundle(referenceDoc(pid, "service_page", "fr", target)!)).find((v) => v.includes('"seoTitle"'))!;
      expect(metadata).toContain(m.title); expect(metadata).toContain(m.description); expect(metadata).not.toContain(other.title);
    }
    expect(currentTheme(pid)!.version.id).toBe(before.version.id);
    expect(currentTheme(pid)!.spec).toEqual(before.spec);
  }));
  for (const activity of [0, 1] as const) it.each([false, true])("produits " + activity + ", ordre inversé=%s : identités lues et livrées", async (reverseProducts) => fr(async () => {
    const { pid, spec } = await productPair(user.id, { activity, reverseProducts });
    const refs = existingPages(pid);
    expect(refs.find((p) => p.key === "product:main")?.url).toBe("/products/principal");
    expect(refs.find((p) => p.key === "product:catalog:accessory")?.url).toBe("/products/accessoire");
    await writePair(pid, "products");
    const delivered = clone(spec);
    deliverContent(delivered, loadProject(pid), "fr");
    for (const [i, key] of ["product:main", "product:catalog:accessory"].entries()) {
      const product = storeProducts(delivered).find((p) => p.contentTarget === key)!;
      const m = markers(i + 1), other = markers(2 - i);
      expect(product.description_html).toContain(m.text); expect(product.description_html).not.toContain(other.text);
      expect(product.seo).toEqual({ title: m.title, description: m.description });
      const rendered = await renderPage({ spec: delivered, base: "", cart: [] }, "/products/" + product.handle, new URLSearchParams());
      expect(rendered.html).toContain(m.text); expect(rendered.html).not.toContain(other.text);
      expect(rendered.html).toContain(m.title); expect(rendered.html).toContain(escapeHtml(m.description));
      const csvLine = shopifyProductsCsv(delivered).split("\n").find((l) => l.startsWith('"' + product.handle + '",'))!;
      expect(csvLine).toContain(m.text); expect(csvLine).not.toContain(other.text);
      const meta = Object.values(exportBundle(referenceDoc(pid, "product_page", "fr", key)!)).find((v) => v.includes('"seoTitle"'))!;
      expect(meta).toContain(m.title); expect(meta).not.toContain(other.title);
    }
  }));
  it("renommage et anciens alias communs : identité explicite prioritaire", async () => {
    const { pid } = await servicePair(user.id, { reversePages: true });
    const p = loadProject(pid);
    saveServices(pid, { ...p.services, services: p.services.services.map((s, i) => ({ ...s, name: "Nouvelle prestation " + (i + 1) })).reverse() });
    const refs = sitePages(loadProject(pid));
    expect(TARGETS.map((k) => refs.find((p) => p.key === k)?.url)).toEqual(["/pages/prestation-1", "/pages/prestation-2"]);
    expect(resolvePage(refs, "service:diagnostic")).toBeNull();
  });
  it("identité exacte située après un homonyme d'une autre offre", async () => {
    const { pid, spec } = await servicePair(user.id, { names: ["Diagnostic", "Suivi"], reversePages: true });
    spec.store.pages[0].title = "Diagnostic"; spec.store.pages[1].title = "Ancien nom";
    saveThemeVersion(pid, spec, "Ordre défavorable de test", "user");
    const refs = sitePages(loadProject(pid));
    expect(refs.find((p) => p.key === TARGETS[0])?.url).toBe("/pages/prestation-1");
    expect(refs.find((p) => p.key === TARGETS[1])?.url).toBe("/pages/prestation-2");
  });
  it("ancien contenu sans identité non ambigu : URL reprise et identité enregistrée", async () => fr(async () => {
    const { pid } = await servicePair(user.id, { identities: false, names: ["Diagnostic", "Suivi"] });
    expect(TARGETS.map((k) => sitePages(loadProject(pid)).find((p) => p.key === k)?.url)).toEqual(["/pages/prestation-1", "/pages/prestation-2"]);
    await writePair(pid);
    const { spec } = await composeThemeV2(pid);
    expect(spec.store.pages.find((p) => p.handle === "prestation-1")?.contentTarget).toBe(TARGETS[0]);
    expect(spec.store.pages.find((p) => p.handle === "prestation-2")?.body_html).toContain(markers(2).text);
  }));
  it("ancien contenu ambigu : pages, texte, SEO et URL intacts après composition", async () => fr(async () => {
    const { pid, spec } = await servicePair(user.id, { identities: false });
    const original = clone(spec).store.pages;
    expect(TARGETS.map((k) => sitePages(loadProject(pid)).find((p) => p.key === k)?.url)).toEqual([null, null]);
    await writePair(pid);
    const built = await composeThemeV2(pid);
    for (const page of original) expect(built.spec.store.pages.find((p) => p.handle === page.handle)).toEqual(page);
    expect(built.spec.store.pages.find((p) => p.contentTarget === TARGETS[0])?.body_html).toContain(markers(1).text);
    expect(built.spec.store.pages.find((p) => p.contentTarget === TARGETS[1])?.body_html).toContain(markers(2).text);
  }));
  it("offre retirée : sa page n'est ni réattribuée ni réécrite", async () => fr(async () => {
    const { pid, spec } = await servicePair(user.id);
    await writePair(pid);
    const retired = clone(spec).store.pages[1];
    const p = loadProject(pid); saveServices(pid, { ...p.services, services: [p.services.services[0]] });
    const delivered = clone(spec); deliverContent(delivered, loadProject(pid), "fr");
    expect(delivered.store.pages.find((p) => p.handle === retired.handle)).toEqual(retired);
    const built = await composeThemeV2(pid);
    expect(built.spec.store.pages.find((p) => p.handle === retired.handle)).toEqual(retired);
  }));
  it("page commune à une offre identifiée et une autre : association historique refusée", async () => {
    const { pid, spec } = await servicePair(user.id);
    delete spec.store.pages[1].contentTarget;
    saveThemeVersion(pid, spec, "Alias commun", "user");
    const refs = sitePages(loadProject(pid));
    expect(refs.find((p) => p.key === TARGETS[0])?.url).toBe("/pages/prestation-1");
    expect(refs.find((p) => p.key === TARGETS[1])?.url).toBeNull();
  });
  it("URL dupliquée : aucune cible ne reçoit cette adresse ambiguë", async () => {
    const { pid, spec } = await servicePair(user.id);
    spec.store.pages[1].handle = spec.store.pages[0].handle;
    saveThemeVersion(pid, spec, "Données historiques incohérentes de test", "user");
    expect(TARGETS.map((k) => sitePages(loadProject(pid)).find((p) => p.key === k)?.url)).toEqual([null, null]);
  });
  it("identité dupliquée : ne pas choisir à la place une troisième page historique", async () => {
    const { pid, spec } = await servicePair(user.id, { names: ["Diagnostic", "Suivi"] });
    spec.store.pages.push({ ...spec.store.pages[0], handle: "copie" });
    const legacy = { ...spec.store.pages[0], handle: "historique" }; delete legacy.contentTarget;
    spec.store.pages.push(legacy);
    saveThemeVersion(pid, spec, "Identité incohérente synthétique", "user");
    expect(sitePages(loadProject(pid)).find((p) => p.key === TARGETS[0])?.url).toBeNull();
  });
  it("gabarit partagé et adresse occupée : le rendu historique reste inchangé", async () => fr(async () => {
    const { pid, spec } = await servicePair(user.id, { identities: false });
    const suffix = "seo-service-offer-1";
    spec.store.pages[0].handle = "texte-service-offer-1";
    spec.store.pages[0].template_suffix = suffix;
    spec.templates[`page.${suffix}`] = { order: ["old"], sections: { old: { type: "rich-text", settings: {}, blocks: { body: { type: "text", settings: { text: "<p>Gabarit historique à préserver.</p>" } } }, block_order: ["body"] } } };
    saveThemeVersion(pid, spec, "Gabarit historique synthétique", "user");
    await writePair(pid);
    const built = await composeThemeV2(pid);
    const old = built.spec.store.pages.find((p) => p.handle === "texte-service-offer-1")!;
    expect(old).toEqual(spec.store.pages[0]);
    const rendered = await renderPage({ spec: built.spec, base: "", cart: [] }, "/pages/" + old.handle, new URLSearchParams());
    expect(rendered.html).toContain("Gabarit historique à préserver.");
    expect(rendered.html).not.toContain(markers(1).text);
    const fresh = built.spec.store.pages.find((p) => p.contentTarget === TARGETS[0])!;
    expect(fresh.handle).not.toBe(old.handle); expect(fresh.template_suffix).not.toBe(old.template_suffix);
  }));
  it.each([false, true])("produits historiques sans identité, noms identiques=%s : aucun écrasement ambigu", async (ambiguous) => {
    const { pid, spec } = await productPair(user.id, { identities: false, names: ambiguous ? ["Diagnostic", "Diagnostic"] : ["Diagnostic", "Accessoire"] });
    await writePair(pid, "products");
    const old = clone(spec), delivered = clone(spec);
    const refs = sitePages(loadProject(pid));
    expect(refs.find((p) => p.key === "product:main")?.url).toBe(ambiguous ? null : "/products/principal");
    deliverContent(delivered, loadProject(pid), "fr");
    if (ambiguous) {
      expect(delivered.store.product).toEqual(old.store.product);
      expect(delivered.store.products).toEqual(old.store.products);
    } else {
      expect(delivered.store.product.contentTarget).toBe("product:main");
      expect(delivered.store.product.description_html).toContain(markers(1).text);
      expect(delivered.store.products![0].contentTarget).toBe("product:catalog:accessory");
      expect(delivered.store.products![0].description_html).toContain(markers(2).text);
    }
  });
  it("produit retiré et homonyme : identité conservée, aucun transfert vers le principal", async () => {
    const { pid, spec } = await productPair(user.id);
    await writePair(pid, "products");
    const p = loadProject(pid); saveCatalog(pid, [], "mono");
    const retired = clone(spec).store.products![0];
    const delivered = clone(spec); deliverContent(delivered, loadProject(pid), "fr");
    expect(delivered.store.products![0]).toEqual(retired);
    expect(delivered.store.product.description_html).toContain(markers(1).text);
    expect(delivered.store.product.description_html).not.toContain(markers(2).text);
  });
  it("produits avec URL dupliquée : aucune livraison et aucun effacement", async () => {
    const { pid, spec } = await productPair(user.id);
    spec.store.products![0].handle = spec.store.product.handle;
    saveThemeVersion(pid, spec, "URL produit dupliquée synthétique", "user");
    await writePair(pid, "products");
    const delivered = clone(spec); deliverContent(delivered, loadProject(pid), "fr");
    expect(delivered.store.product).toEqual(spec.store.product);
    expect(delivered.store.products).toEqual(spec.store.products);
    expect(sitePages(loadProject(pid)).find((p) => p.key === "product:main")?.url).toBeNull();
  });
  it.each(["services", "products"] as const)("validation inédite %s : composition réelle sans mélange après renommage", async (business) => fr(async () => {
    const { pid } = business === "services" ? await servicePair(user.id, { reversePages: true }) : await productPair(user.id, { reverseProducts: true });
    const p = loadProject(pid);
    saveProduct(pid, { ...p.product, name: business === "services" ? "Numérisation d'archives" : "Capteur de température", category: business === "services" ? "Conservation documentaire" : "Instrumentation industrielle", summary: business === "services" ? "Numérisation de documents sur devis après inventaire." : "Capteur et câble de raccordement vendus séparément." });
    run("UPDATE projects SET name=? WHERE id=?", "Projet indépendant renommé après correction", pid);
    await writePair(pid, business);
    const { spec } = await composeThemeV2(pid);
    const targets = business === "services" ? TARGETS : ["product:main", "product:catalog:accessory"];
    for (const [i, target] of targets.entries()) {
      const entry = business === "services" ? spec.store.pages.find((p) => p.contentTarget === target)! : storeProducts(spec).find((p) => p.contentTarget === target)!;
      const body = "body_html" in entry ? entry.body_html : entry.description_html;
      expect(body).toContain(markers(i + 1).text); expect(body).not.toContain(markers(2 - i).text);
      expect(entry.seo?.title).toBe(markers(i + 1).title);
      const rendered = await renderPage({ spec, base: "", cart: [] }, `/${business === "services" ? "pages" : "products"}/${entry.handle}`, new URLSearchParams());
      expect(rendered.html).toContain(markers(i + 1).text); expect(rendered.html).toContain(markers(i + 1).title);
    }
  }));
});

