import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser } from "@/lib/auth";
import { composeThemeV2 } from "@/lib/theme-v2/engine";
import { renderPage } from "@/lib/theme/render";
import { routeFor } from "@/lib/theme/render";
import { storeProducts, type ThemeSpec } from "@/lib/theme/spec";
import { loadProject, saveThemeVersion, currentTheme, saveCatalog, saveProduct } from "@/lib/projects";
import { bindProductContent } from "@/lib/theme/product-content";
import { composeShop } from "@/lib/engine/shop";
import { tidyComposition } from "@/lib/theme/tidy";
import { verifiedFacts } from "@/lib/seo-v2/facts";
import { cmsExport } from "@/lib/cms-v2/export";
import { productTemplateAssignments } from "@/lib/theme/product-templates";
import { shopifyProductsCsv } from "@/lib/theme/catalog-export";
import { pushProduct } from "@/lib/integrations/shopify";
import { encrypt } from "@/lib/secrets";
import { unzipSync, strFromU8 } from "fflate";
import { runWithLang } from "@/lib/i18n-server";
import { runContentEngineV2, saveUserEdit } from "@/lib/seo-v2/engine";
import { localOnlyDeps } from "@/lib/seo-v2/deps";
import { assetData, getAsset } from "@/lib/library";
import { productTrio, productMainHtml, csvRows } from "./lot1-produits-fixtures";
beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau fournisseur interdit dans ce test isolé"); }));
describe("Lot 1 — sections propres au produit", async () => {
  const user = await createUser(`sections-${Date.now()}@example.invalid`, "isolated-test-only", "Test synthétique");
  it("l'accessoire n'affiche aucun fait ni accordéon ni bénéfice du principal", async () => {
    const { pid, primaryFacts, accessoryFacts } = await productTrio(user.id, { homonyms: true });
    const { spec } = await composeThemeV2(pid);
    const accessory = storeProducts(spec).find((p) => p.contentTarget === "product:catalog:steel")!;
    const html = productMainHtml((await renderPage({ spec, base: "", cart: [] }, `/products/${accessory.handle}`, new URLSearchParams())).html);
    expect(html.length).toBeGreaterThan(100);
    expect(primaryFacts.some((f) => html.includes(f)), "des faits du principal sont présents dans la fiche accessoire").toBe(false);
    for (const fact of accessoryFacts) expect(html).toContain(fact);
    expect(html.includes("EXCLUSIF_PRINCIPAL") || html.includes("EXCLUSIVE_PRINCIPAL")).toBe(false);
  });
  const fr = <T>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
  const loader = (id: string) => { const a = getAsset(id); return a ? { data: assetData(a), mime: a.mime, updated: a.created_at } : null; };
  for (const domain of ["lab", "music"] as const) for (const reverse of [false, true]) it(`${domain}, ordre inversé=${reverse} : trois fiches et ZIP distincts`, async () => fr(async () => {
    const { pid, primaryFacts, accessoryFacts } = await productTrio(user.id, { domain, reverse, homonyms: true });
    const { spec } = await composeThemeV2(pid);
    const output = await cmsExport("shopify", spec, loader), zip = unzipSync(output.zip);
    const manifest = JSON.parse(strFromU8(zip["assets/es-product-templates.json"]));
    expect(manifest.csvAssignsTemplates).toBe(false); expect(manifest.installationVerified).toBe(false);
    expect(manifest.products).toEqual(productTemplateAssignments(spec));
    expect(output.issues.some((i) => i.code === "product_template_assignment_required")).toBe(true);
    expect(new Set(manifest.products.map((p: { templateSuffix: string }) => p.templateSuffix)).size).toBe(3);
    expect(strFromU8(zip["templates/product.json"])).not.toMatch(/cellulose|47 mm|nickel|Tension moyenne|EXCLUSIF_PRINCIPAL/);
    for (const p of storeProducts(spec)) {
      const path = `/products/${p.handle}`, selected = routeFor(spec, path, new URLSearchParams());
      expect(selected.template).toBe(`product.${p.template_suffix}`);
      const rendered = await renderPage({ spec, base: "", cart: [] }, path, new URLSearchParams());
      const main = productMainHtml(rendered.html), exported = strFromU8(zip[`templates/${selected.template}.json`]);
      expect(rendered.status).toBe(200);
      const owner = manifest.products.find((x: { target: string }) => x.target === p.contentTarget)!;
      expect(owner.handle).toBe(p.handle); expect(owner.templateFile).toBe(`templates/${selected.template}.json`);
      if (p.contentTarget === "product:main") {
        for (const f of primaryFacts) { expect(main).toContain(f); expect(exported).toContain(f); }
        expect(main).toContain("ENTRETIEN_EXCLUSIF_PRINCIPAL");
        expect(main).toContain("BENEFICE_EXCLUSIF_PRINCIPAL");
        expect(main).toContain("FAQ_EXCLUSIVE_PRINCIPAL");
        for (const f of accessoryFacts) expect(main.includes(f)).toBe(false);
      } else {
        for (const f of primaryFacts) { expect(main.includes(f)).toBe(false); expect(exported.includes(f)).toBe(false); }
        expect(main.includes("EXCLUSIF_PRINCIPAL") || main.includes("EXCLUSIVE_PRINCIPAL")).toBe(false);
        if (p.contentTarget === "product:catalog:steel") for (const f of accessoryFacts) { expect(main).toContain(f); expect(exported).toContain(f); }
        else {
          for (const f of accessoryFacts) expect(main.includes(f)).toBe(false);
          expect(main).toContain("[À compléter");
          expect(exported).not.toContain('"type": "v2-specs"');
        }
      }
      const gallery = main.match(/<section\b[^>]*data-main-product[^>]*>([\s\S]*?)<\/section>/)?.[1] ?? "";
      for (const file of p.images) expect(gallery).toContain(file);
      for (const other of storeProducts(spec).filter((x) => x.contentTarget !== p.contentTarget)) for (const file of other.images) expect(gallery.includes(file)).toBe(false);
      const csv = csvRows(shopifyProductsCsv(spec)).find((l) => l[0] === p.handle)!;
      expect(csv[1]).toBe(p.title);
    }
  }));
  it("changement de nom, ordre des objets et faits nouveaux : même identité, gabarit indépendant", async () => fr(async () => {
    const { pid } = await productTrio(user.id, { homonyms: true });
    const built = await composeThemeV2(pid);
    saveThemeVersion(pid, built.spec, "Version synthétique initiale", "system");
    const old = currentTheme(pid)!, p = loadProject(pid);
    const suffixes = new Map(storeProducts(old.spec).map((p) => [p.contentTarget, p.template_suffix]));
    saveCatalog(pid, p.catalog.map((x) => ({ ...x, name: "Nom modifié " + x.key, ...(x.key === "steel" ? { features: ["Acier peint", "Masse : 320 g"] } : {}) })).reverse(), "multi");
    const next = await composeThemeV2(pid);
    for (const product of storeProducts(next.spec)) expect(product.template_suffix).toBe(suffixes.get(product.contentTarget));
    const swapped = structuredClone(next.spec), first = swapped.store.product;
    swapped.store.product = swapped.store.products![1]; swapped.store.products![1] = first;
    const principal = next.spec.templates[`product.${next.spec.store.product.template_suffix}`];
    bindProductContent(swapped, loadProject(pid), principal);
    const accessory = storeProducts(swapped).find((x) => x.contentTarget === "product:catalog:steel")!;
    const main = productMainHtml((await renderPage({ spec: swapped, base: "", cart: [] }, `/products/${accessory.handle}`, new URLSearchParams())).html);
    expect(main).toContain("320 g"); expect(main.includes("210 g") || main.includes("47 mm")).toBe(false);
    expect(currentTheme(pid)).toEqual(old);
  }));
  it("données absentes : aucun fait, prix, réponse, livraison ou preuve du principal", async () => {
    const { pid } = await productTrio(user.id, { images: false });
    const p = loadProject(pid);
    saveProduct(pid, { ...p.product, facts: [...p.product.facts, { key: "shipping", label: "Livraison", value: "Livraison du principal seulement", status: "confirmed", source: "user" }], questions: [{ id: "q", question: "Principal ?", answer: "Réponse propre au principal", why: "Test", required: false, factKey: "q" }] });
    const project = loadProject(pid), facts = verifiedFacts(project, project.catalog.find((x) => x.key === "blank")!);
    expect(facts.category).toBe(""); expect(facts.facts).toEqual([]); expect(facts.answers).toEqual([]);
    expect(facts.proofs).toEqual([]); expect(facts.objections).toEqual([]);
    expect(facts.shipping).toBeNull(); expect(facts.returns).toBeNull(); expect(facts.problem).toBeNull();
  });
  it("retouches de la fiche et du corps conservées après recomposition ; anciens thèmes intacts", async () => fr(async () => {
    const { pid } = await productTrio(user.id);
    const built = await composeThemeV2(pid), spec = built.spec;
    const a = storeProducts(spec).find((x) => x.contentTarget === "product:catalog:steel")!;
    const tpl = spec.templates[`product.${a.template_suffix}`];
    tpl.sections.client = { type: "rich-text", settings: { align: "left" }, blocks: { text: { type: "text", settings: { text: "<p>CORRECTION_CLIENT_ACIER</p>" } } }, block_order: ["text"] }; tpl.order.push("client");
    a.description_html = "<p>CORPS_CLIENT_COMPLET_ACIER</p>"; a.seo = { title: "Titre corrigé", description: "Description corrigée" };
    saveThemeVersion(pid, spec, "Retouche utilisateur synthétique", "user");
    const current = currentTheme(pid)!;
    const next = await composeThemeV2(pid);
    const product = storeProducts(next.spec).find((x) => x.contentTarget === a.contentTarget)!;
    expect(product.description_html).toBe(a.description_html); expect(product.seo).toEqual(a.seo);
    const html = productMainHtml((await renderPage({ spec: next.spec, base: "", cart: [] }, `/products/${product.handle}`, new URLSearchParams())).html);
    expect(html).toContain("CORRECTION_CLIENT_ACIER"); expect(html).toContain("CORPS_CLIENT_COMPLET_ACIER");
    const blank = storeProducts(next.spec).find((x) => x.contentTarget === "product:catalog:blank")!;
    const blankHtml = productMainHtml((await renderPage({ spec: next.spec, base: "", cart: [] }, `/products/${blank.handle}`, new URLSearchParams())).html);
    expect(blankHtml.includes("CORRECTION_CLIENT_ACIER") || blankHtml.includes("CORPS_CLIENT_COMPLET_ACIER")).toBe(false);
    expect(currentTheme(pid)).toEqual(current);
  }));
  it("image absente : remplacement par une image propre ou un champ vide", async () => {
    const { pid } = await productTrio(user.id);
    const { spec } = await composeThemeV2(pid);
    const accessory = storeProducts(spec).find((x) => x.contentTarget === "product:catalog:steel")!;
    const blank = storeProducts(spec).find((x) => x.contentTarget === "product:catalog:blank")!;
    blank.images = [];
    for (const p of [accessory, blank]) {
      const t = spec.templates[`product.${p.template_suffix}`];
      t.sections.image = { type: "v2-banner", settings: { heading: "Photo propre", image_asset: "absente.png" } }; t.order.push("image");
    }
    tidyComposition(spec, { strictAssets: true });
    expect(spec.templates[`product.${accessory.template_suffix}`].sections.image.settings.image_asset).toBe(accessory.images[0]);
    expect(spec.templates[`product.${blank.template_suffix}`].sections.image.settings.image_asset).toBe("");
  });
  it("V1 et gabarit commun de repli : aucun statique du principal sur l'accessoire", async () => fr(async () => {
    const { pid } = await productTrio(user.id);
    const { spec } = await composeShop(pid, "atelier", null, false);
    const a = storeProducts(spec).find((x) => x.contentTarget === "product:catalog:steel")!;
    delete a.template_suffix; // Import sans affectation : seul le gabarit neutre doit être choisi.
    const html = productMainHtml((await renderPage({ spec, base: "", cart: [] }, `/products/${a.handle}`, new URLSearchParams())).html);
    expect(html.includes("cellulose") || html.includes("47 mm") || html.includes("EXCLUSIF_PRINCIPAL")).toBe(false);
    expect(html).toContain("acier inoxydable");
  }));
  it("vrai adaptateur Shopify, frontière HTTP simulée : affectation par produit, jamais simple présence ZIP", async () => fr(async () => {
    const { pid } = await productTrio(user.id, { homonyms: true, images: false });
    const { spec } = await composeThemeV2(pid);
    const sent: { handle: string; templateSuffix: string; status: string }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      const b = JSON.parse(String(init.body));
      if (b.query.includes("products(first")) return new Response(JSON.stringify({ data: { products: { nodes: [] } } }));
      if (b.query.includes("productSet")) { sent.push(b.variables.input); return new Response(JSON.stringify({ data: { productSet: { product: { id: `gid://shopify/Product/${sent.length}`, handle: b.variables.input.handle }, userErrors: [] } } })); }
      if (b.query.includes("metafieldsSet")) return new Response(JSON.stringify({ data: { metafieldsSet: { metafields: [{ key: "title_tag" }, { key: "description_tag" }], userErrors: [] } } }));
      throw new Error("Requête imprévue dans le faux serveur isolé");
    }));
    for (const p of storeProducts(spec).reverse()) await pushProduct({ external_id: "synthetic.myshopify.com", access_token: encrypt("synthetic-test-only") } as Parameters<typeof pushProduct>[0], spec, p);
    expect(sent).toHaveLength(3);
    for (const p of storeProducts(spec)) expect(sent.find((x) => x.handle === p.handle)).toMatchObject({ templateSuffix: p.template_suffix, status: "DRAFT" });
  }));
  it("un document client complet et sa FAQ restent liés à l'accessoire jusqu'au rendu et CSV", async () => fr(async () => {
    const { pid } = await productTrio(user.id, { images: false });
    const r = await runContentEngineV2(null, pid, { type: "product_page", pageKey: "product:catalog:steel", lang: "fr" }, localOnlyDeps());
    const ending = "FIN_CLIENT_ACCESSOIRE_CONSERVEE";
    saveUserEdit(pid, r.docKey!, { ...r.doc!, blocks: [{ id: "h1", kind: "h1", text: "Support rédigé" }, { id: "body", kind: "p", text: "Texte complet de l'accessoire. ".repeat(100) }, { id: "end", kind: "p", text: ending }, { id: "faq", kind: "faq", q: "Question propre au support ?", a: "REPONSE_PROPRE_SUPPORT" }] });
    const { spec } = await composeThemeV2(pid);
    const a = storeProducts(spec).find((x) => x.contentTarget === "product:catalog:steel")!;
    const html = productMainHtml((await renderPage({ spec, base: "", cart: [] }, `/products/${a.handle}`, new URLSearchParams())).html);
    expect(html).toContain(ending); expect(html).toContain("REPONSE_PROPRE_SUPPORT"); expect(html.includes("FAQ_EXCLUSIVE_PRINCIPAL")).toBe(false);
    const line = csvRows(shopifyProductsCsv(spec)).find((l) => l[0] === a.handle)!;
    expect(line[2]).toContain(ending); expect(line[2]).toContain("REPONSE_PROPRE_SUPPORT");
  }));
  it("les caractéristiques saisies restent du texte, même si elles contiennent des balises", async () => fr(async () => {
    const { pid } = await productTrio(user.id, { images: false });
    const p = loadProject(pid);
    saveCatalog(pid, p.catalog.map((x) => x.key === "steel" ? { ...x, features: ['<img src=x onerror="alert(1)">', '<script>alert(2)</script>'] } : x), "multi");
    const { spec } = await composeThemeV2(pid);
    const product = storeProducts(spec).find((x) => x.contentTarget === "product:catalog:steel")!;
    const main = productMainHtml((await renderPage({ spec, base: "", cart: [] }, `/products/${product.handle}`, new URLSearchParams())).html);
    expect(main.includes('<img src=x') || main.includes('<script>alert(2)</script>')).toBe(false);
    expect(main).toContain("&lt;script&gt;");
  }));
  it("média d'une section utilisateur en conflit et style ciblé : conservation sans emprunter le principal", async () => fr(async () => {
    const { pid, photos } = await productTrio(user.id);
    const { spec } = await composeThemeV2(pid);
    const product = storeProducts(spec).find((x) => x.contentTarget === "product:catalog:steel")!;
    const key = `product.${product.template_suffix}`, tpl = spec.templates[key];
    spec.files["collision.png"] = photos[1];
    spec.customSections["es-custom-clientmedia"] = { name: "Photo client", liquid: `<figure><img src="{{ 'collision.png' | asset_url }}" alt="Photo client"></figure>{% schema %}{"name":"Photo client","settings":[]}{% endschema %}` };
    tpl.sections.client_photo = { type: "es-custom-clientmedia", settings: {} }; tpl.order.push("client_photo");
    spec.elementStyles = [{ template: key, section: tpl.order[0], path: "div:nth-child(1)", role: "text", color: "#123456" }];
    saveThemeVersion(pid, spec, "Photo et style client synthétiques", "user");
    const before = currentTheme(pid)!;
    const fresh = (await composeThemeV2(pid)).spec;
    fresh.files["collision.png"] = photos[0];
    bindProductContent(fresh, loadProject(pid));
    const updated = storeProducts(fresh).find((x) => x.contentTarget === product.contentTarget)!;
    const own = fresh.templates[`product.${updated.template_suffix}`];
    const photo = own.sections.client_photo;
    expect(photo.type).not.toBe("es-custom-clientmedia");
    const liquid = fresh.customSections[photo.type].liquid;
    const file = liquid.match(/'([^']+\.png)'/)![1];
    expect(file).not.toBe("collision.png"); expect(fresh.files[file]).toBe(photos[1]);
    expect(fresh.elementStyles).toContainEqual(before.spec.elementStyles![0]);
    const rendered = await renderPage({ spec: fresh, base: "", cart: [] }, `/products/${updated.handle}`, new URLSearchParams());
    expect(rendered.html).toContain(`/assets/${file}`);
    expect(currentTheme(pid)).toEqual(before);
  }));
  it("une retouche de style seule est conservée sur sa fiche, sans dépendre d'un changement de texte", async () => fr(async () => {
    const { pid } = await productTrio(user.id, { images: false });
    const { spec } = await composeThemeV2(pid);
    const a = storeProducts(spec).find((x) => x.contentTarget === "product:catalog:steel")!;
    const key = `product.${a.template_suffix}`, tpl = spec.templates[key];
    const style = { template: key, section: tpl.order[0], path: "div:nth-child(1)", role: "text" as const, color: "#134679" };
    spec.elementStyles = [style]; saveThemeVersion(pid, spec, "Couleur client uniquement", "user");
    const next = await composeThemeV2(pid);
    expect(next.spec.elementStyles).toContainEqual(style);
    const other = storeProducts(next.spec).find((x) => x.contentTarget === "product:catalog:blank")!;
    expect(Object.keys(next.spec.templates[`product.${other.template_suffix}`].sections)).not.toContain(style.section);
  }));
  it("SEO client nouveau et FAQ ciblée : les retouches antérieures du corps restent disponibles", async () => fr(async () => {
    const { pid } = await productTrio(user.id, { images: false });
    const { spec } = await composeThemeV2(pid), target = "product:catalog:steel";
    const a = storeProducts(spec).find((x) => x.contentTarget === target)!;
    a.description_html = "<p>CORPS_MANUEL_A_PRESERVER</p>"; a.seo = { title: "Ancien SEO manuel", description: "Ancienne description manuelle" };
    saveThemeVersion(pid, spec, "Corps et SEO corrigés", "user");
    const meta = await runContentEngineV2(null, pid, { type: "metadata", pageKey: target, lang: "fr" }, localOnlyDeps());
    saveUserEdit(pid, meta.docKey!, { ...meta.doc!, meta: { ...meta.doc!.meta, seoTitle: "NOUVEAU_SEO_CLIENT", metaDescription: "Nouvelle description client ciblée." } });
    const faq = await runContentEngineV2(null, pid, { type: "faq", pageKey: target, lang: "fr" }, localOnlyDeps());
    saveUserEdit(pid, faq.docKey!, { ...faq.doc!, blocks: [{ id: "question", kind: "faq", q: "Nouvelle question accessoire ?", a: "NOUVELLE_REPONSE_ACCESSOIRE" }] });
    const next = await composeThemeV2(pid), product = storeProducts(next.spec).find((x) => x.contentTarget === target)!;
    expect(product.seo?.title).toBe("NOUVEAU_SEO_CLIENT");
    expect(product.description_html).toContain("CORPS_MANUEL_A_PRESERVER");
    expect(product.description_html).toContain("NOUVELLE_REPONSE_ACCESSOIRE");
    expect(product.description_html.split("NOUVELLE_REPONSE_ACCESSOIRE")).toHaveLength(2);
  }));
  it("une FAQ déjà retirée par le client ne réapparaît pas sans nouveau document", async () => fr(async () => {
    const { pid } = await productTrio(user.id, { images: false }), target = "product:catalog:steel";
    const faq = await runContentEngineV2(null, pid, { type: "faq", pageKey: target, lang: "fr" }, localOnlyDeps());
    saveUserEdit(pid, faq.docKey!, { ...faq.doc!, blocks: [{ id: "question", kind: "faq", q: "Question retirée ?", a: "REPONSE_SUPPRIMEE_PAR_CLIENT" }] });
    const { spec } = await composeThemeV2(pid);
    const a = storeProducts(spec).find((x) => x.contentTarget === target)!;
    expect(a.description_html).toContain("REPONSE_SUPPRIMEE_PAR_CLIENT");
    a.description_html = "<p>Version client sans FAQ</p>";
    saveThemeVersion(pid, spec, "FAQ retirée par le client", "user");
    const next = await composeThemeV2(pid), product = storeProducts(next.spec).find((x) => x.contentTarget === target)!;
    expect(product.description_html).toBe("<p>Version client sans FAQ</p>");
  }));
});
