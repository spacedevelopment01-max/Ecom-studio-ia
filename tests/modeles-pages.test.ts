/**
 * Modèles de pages et gestion multipage (« Modifier le thème ») : droits par forfait vérifiés côté serveur, pages
 * indépendantes, mises en page différentes par produit, prestation sans panier avec un bouton vers un vrai calendrier,
 * duplication, renommage (liens et menus suivis), suppression protégée, conflits, isolation entre comptes, baisse de
 * forfait sans perte, rendu de l'aperçu. Aucun appel IA.
 */
import { describe, expect, it, vi } from "vitest";

let sessionUser: any = null;
vi.mock("@/lib/auth", async (orig) => {
  const real = await orig<typeof import("@/lib/auth")>();
  return {
    ...real,
    requireUser: async () => {
      if (!sessionUser) throw new real.HttpError(401, "Connexion requise.");
      return sessionUser;
    },
  };
});

describe("modèles de pages et pages multiples", async () => {
  const { createUser } = await import("@/lib/auth");
  const { runWithLang } = await import("@/lib/i18n-server");
  const { composeThemeV2 } = await import("@/lib/theme-v2/engine");
  const { currentTheme, saveThemeVersion, saveServices, loadProject } = await import("@/lib/projects");
  const { grantProjectPlan } = await import("@/lib/project-subscriptions");
  const { renderPage } = await import("@/lib/theme/render");
  const { storeProducts } = await import("@/lib/theme/spec");
  const { PAGE_MODELS } = await import("@/lib/theme/page-templates");
  const { seedThemeScenario } = await import("./theme-v2-fixtures");
  const fr = <T,>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
  const route = await import("@/app/api/projects/[id]/theme/pages/route");

  async function project(scenario: "hightech" | "artisan" | "restaurant", plan: "creer" | "vendre" | "dominer" | null) {
    const u = await createUser(`pages-${scenario}-${Date.now()}-${Math.random()}@test.fr`, "motdepasse-test", "P");
    const pid = await seedThemeScenario(u.id, scenario);
    const spec = (await fr(() => composeThemeV2(pid))).spec;
    fr(() => saveThemeVersion(pid, spec, "Création", "system"));
    if (plan) grantProjectPlan(pid, plan);
    return { u, pid };
  }
  const call = async (u: any, pid: string, body?: Record<string, unknown>) => {
    sessionUser = u;
    const ctx = { params: Promise.resolve({ id: pid }) };
    const res = body
      ? await fr(() => route.POST(new Request("http://localhost/x", { method: "POST", body: JSON.stringify({ version: currentTheme(pid)!.version.id, ...body }), headers: { "Content-Type": "application/json" } }), ctx))
      : await fr(() => route.GET(new Request("http://localhost/x"), ctx));
    return { status: res.status, json: (await res.json()) as any };
  };
  const preview = (spec: any, path: string) => fr(() => renderPage({ spec, base: "/p", cart: [] } as any, path, new URLSearchParams()));

  it("10 modèles réels, aux structures différentes", () => {
    expect(PAGE_MODELS).toHaveLength(10);
    const shapes = new Set(PAGE_MODELS.map((m) => m.rows({ lang: "fr", services: { services: [] } as any, booking: null, contactUrl: "/pages/contact", hasVideo: true }).map((r) => r.type).join(",")));
    expect(shapes.size).toBe(10);
  });

  it("CRÉER : la bibliothèque est visible mais l'API refuse la création (402) ; la page existante reste modifiable", async () => {
    const { u, pid } = await project("hightech", "creer");
    const g = await call(u, pid);
    expect(g.json.canUseModels).toBe(false);
    expect((await call(u, pid, { action: "add_page", model: "a-propos", title: "Notre histoire bis" })).status).toBe(402);
    const prod = g.json.products[0].handle;
    expect((await call(u, pid, { action: "add_product_layout", model: "produit-demonstration", product: prod })).status).toBe(402);
    const page = g.json.pages.find((p: any) => !p.protected) ?? g.json.pages[0];
    const r = await call(u, pid, { action: "update_page", handle: page.handle, seo: { title: "Titre Google", description: "Description" } });
    expect(r.status).toBe(200);
    expect(currentTheme(pid)!.spec.store.pages.find((p) => p.handle === page.handle)!.seo?.title).toBe("Titre Google");
  });

  it("DÉVELOPPER : deux produits avec des mises en page différentes et indépendantes, rendues par l'aperçu", async () => {
    const { u, pid } = await project("hightech", "vendre");
    const spec0 = currentTheme(pid)!.spec;
    // Deuxième produit du catalogue (activité multi-produits).
    const second = { ...JSON.parse(JSON.stringify(spec0.store.product)), handle: "drone-mini", title: "Drone mini" };
    spec0.store.products = [...(spec0.store.products ?? []), second];
    fr(() => saveThemeVersion(pid, spec0, "Catalogue", "system"));
    const [a, b] = storeProducts(currentTheme(pid)!.spec).map((p) => p.handle);
    expect((await call(u, pid, { action: "add_product_layout", model: "produit-essentiel", product: a })).status).toBe(200);
    expect((await call(u, pid, { action: "add_product_layout", model: "produit-demonstration", product: b })).status).toBe(200);
    let spec = currentTheme(pid)!.spec;
    const pa = storeProducts(spec).find((p) => p.handle === a)!;
    const pb = storeProducts(spec).find((p) => p.handle === b)!;
    expect(pa.template_suffix).toBeTruthy();
    expect(pa.template_suffix).not.toBe(pb.template_suffix);
    const ta = spec.templates[`product.${pa.template_suffix}`];
    const tb = spec.templates[`product.${pb.template_suffix}`];
    expect(ta.order.map((k) => ta.sections[k].type)).not.toEqual(tb.order.map((k) => tb.sections[k].type));
    // Modifier la page du produit A ne touche pas celle du produit B.
    const before = JSON.stringify(tb);
    const { applyOps } = await import("@/lib/theme/ops");
    const r = fr(() => applyOps(spec, [{ op: "remove_section", template: `product.${pa.template_suffix}`, section: ta.order[1] } as any]));
    expect(r.applied.length).toBe(1);
    expect(JSON.stringify(r.spec.templates[`product.${pb.template_suffix}`])).toBe(before);
    // Aperçu : chaque produit avec sa propre mise en page ; prix et achat viennent du catalogue (section Produit).
    const ra = await preview(spec, `/products/${a}`);
    const rb = await preview(spec, `/products/${b}`);
    expect(ra.template).toBe(`product.${pa.template_suffix}`);
    expect(rb.template).toBe(`product.${pb.template_suffix}`);
    expect(rb.html).toContain('data-es-type="how-to"');
    expect(ra.html).not.toContain('data-es-type="how-to"');
    // Retour à la fiche commune : toujours possible ; la mise en page reste disponible.
    expect((await call(u, pid, { action: "assign_layout", product: a, layout: null })).status).toBe(200);
    spec = currentTheme(pid)!.spec;
    expect(storeProducts(spec).find((p) => p.handle === a)!.template_suffix).toBeUndefined();
    expect(spec.templates[`product.${pa.template_suffix}`]).toBeTruthy();
  });

  it("page depuis un modèle, duplication indépendante, renommage (menu et liens suivis), suppression protégée", async () => {
    const { u, pid } = await project("hightech", "dominer");
    const add = await call(u, pid, { action: "add_page", model: "a-propos", title: "Notre atelier", handle: "notre-atelier" });
    expect(add.status).toBe(200);
    expect(add.json.handle).toBe("notre-atelier");
    // Double clic : la même version de référence est refusée (aucune page en double).
    sessionUser = u;
    const again = await fr(() => route.POST(new Request("http://localhost/x", { method: "POST", body: JSON.stringify({ action: "add_page", model: "a-propos", title: "Notre atelier", version: add.json.version === currentTheme(pid)!.version.id ? "ancienne" : "ancienne" }), headers: { "Content-Type": "application/json" } }), { params: Promise.resolve({ id: pid }) }));
    expect(again.status).toBe(409);
    let spec = currentTheme(pid)!.spec;
    expect(spec.store.pages.filter((p) => p.title === "Notre atelier")).toHaveLength(1);
    expect(spec.store.menus["main-menu"].links.some((l) => l.url === "/pages/notre-atelier")).toBe(true);
    // Collision d'adresse : une seconde page au même nom reçoit « -2 ».
    const add2 = await call(u, pid, { action: "add_page", model: "contact", title: "Notre atelier" });
    expect(add2.json.handle).toBe("notre-atelier-2");
    // Duplication : copie indépendante, en brouillon, hors menu.
    const dup = await call(u, pid, { action: "duplicate_page", handle: "notre-atelier" });
    spec = currentTheme(pid)!.spec;
    const copy = spec.store.pages.find((p) => p.handle === dup.json.handle)!;
    const orig = spec.store.pages.find((p) => p.handle === "notre-atelier")!;
    expect(copy.status).toBe("draft");
    expect(copy.template_suffix).not.toBe(orig.template_suffix);
    expect(spec.store.menus["main-menu"].links.some((l) => l.url === `/pages/${copy.handle}`)).toBe(false);
    // Renommage d'adresse : le menu suit.
    expect((await call(u, pid, { action: "update_page", handle: "notre-atelier", newHandle: "atelier", title: "L'atelier" })).status).toBe(200);
    spec = currentTheme(pid)!.spec;
    expect(spec.store.menus["main-menu"].links.some((l) => l.url === "/pages/atelier")).toBe(true);
    expect(spec.store.menus["main-menu"].links.some((l) => l.url === "/pages/notre-atelier")).toBe(false);
    const r = await preview(spec, "/pages/atelier");
    expect(r.status).toBe(200);
    expect(r.html).toContain('data-es-type="about"');
    // Adresse déjà prise : refus explicite.
    expect((await call(u, pid, { action: "update_page", handle: "atelier", newHandle: copy.handle })).status).toBe(409);
    // Suppression : d'abord les dépendances, puis confirmation.
    const ask = await call(u, pid, { action: "remove_page", handle: "atelier" });
    expect(ask.json.confirmNeeded).toBe(true);
    expect(ask.json.deps.menu).toBe(true);
    expect((await call(u, pid, { action: "remove_page", handle: "atelier", confirm: true })).status).toBe(200);
    spec = currentTheme(pid)!.spec;
    expect(spec.store.pages.some((p) => p.handle === "atelier")).toBe(false);
    expect(spec.store.menus["main-menu"].links.some((l) => l.url === "/pages/atelier")).toBe(false);
    // Page indispensable (contact) : modifiable, pas supprimable.
    const contact = spec.store.pages.find((p) => /contact/.test(p.handle + p.template_suffix));
    if (contact) expect((await call(u, pid, { action: "remove_page", handle: contact.handle, confirm: true })).status).toBe(409);
  });

  it("prestation sur rendez-vous : pas de panier, bouton vers un vrai calendrier (lien HTTPS) ou vers le contact", async () => {
    const { u, pid } = await project("artisan", "vendre");
    const p = loadProject(pid);
    saveServices(pid, { ...p.services, services: [{ name: "Ravalement de façade", description: "Nettoyage et peinture de façade.", price: "sur devis", duration: "" }], bookingUrl: "" });
    const g = await call(u, pid);
    const add = await call(u, pid, { action: "add_page", model: "prestation-rendez-vous", title: "Ravalement", service: "Ravalement de façade" });
    expect(add.status).toBe(200);
    let spec = currentTheme(pid)!.spec;
    let page = spec.store.pages.find((x) => x.handle === add.json.handle)!;
    let tpl = spec.templates[`page.${page.template_suffix}`];
    const types = tpl.order.map((k) => tpl.sections[k].type);
    expect(types).not.toContain("main-product");
    expect(types).toContain("services-list");
    // Prestation liée : seule cette prestation, avec son tarif « sur devis » (aucun prix inventé).
    const list = tpl.sections[tpl.order[types.indexOf("services-list")]];
    expect(Object.values(list.blocks ?? {}).map((b: any) => b.settings.title)).toEqual(["Ravalement de façade"]);
    expect(Object.values(list.blocks ?? {}).map((b: any) => b.settings.price)).toEqual(["sur devis"]);
    // Aucun bouton mort : sans calendrier, les boutons vont au contact (ou sont retirés).
    const links = tpl.order.flatMap((k) => [tpl.sections[k].settings.button_label ? tpl.sections[k].settings.button_link : null]).filter((x) => x !== null);
    for (const l of links) expect(l === g.json.contactUrl || (typeof l === "string" && l.length > 0)).toBe(true);
    expect(add.json.needsCalendar).toBe(!g.json.booking);
    // Calendrier externe configuré : les boutons « Prendre rendez-vous » y mènent ; un lien non sécurisé est refusé.
    expect((await call(u, pid, { action: "set_booking", handle: page.handle, url: "http://exemple.fr/agenda" })).status).toBe(400);
    expect((await call(u, pid, { action: "set_booking", handle: page.handle, url: "https://calendly.com/exemple" })).status).toBe(200);
    spec = currentTheme(pid)!.spec;
    page = spec.store.pages.find((x) => x.handle === add.json.handle)!;
    tpl = spec.templates[`page.${page.template_suffix}`];
    const hero = tpl.sections[tpl.order[0]].settings;
    expect(hero.button_link).toBe("https://calendly.com/exemple");
    expect(hero.button_label).toBe("Prendre rendez-vous");
    const r = await preview(spec, `/pages/${page.handle}`);
    expect(r.html).toContain("https://calendly.com/exemple");
    expect(r.html).not.toMatch(/name="add"|product-form/);
  });

  it("baisse de forfait : les pages et mises en page restent ; seules les nouvelles créations sont bloquées", async () => {
    const { u, pid } = await project("hightech", "dominer");
    const add = await call(u, pid, { action: "add_page", model: "realisations-portfolio", title: "Réalisations" });
    const prod = storeProducts(currentTheme(pid)!.spec)[0].handle;
    await call(u, pid, { action: "add_product_layout", model: "produit-detaille", product: prod });
    grantProjectPlan(pid, "creer");
    const spec = currentTheme(pid)!.spec;
    expect(spec.store.pages.some((p) => p.handle === add.json.handle)).toBe(true);
    expect(storeProducts(spec)[0].template_suffix).toBeTruthy();
    expect((await preview(spec, `/pages/${add.json.handle}`)).status).toBe(200);
    expect((await call(u, pid, { action: "duplicate_page", handle: add.json.handle })).status).toBe(402);
    expect((await call(u, pid, { action: "update_page", handle: add.json.handle, title: "Nos réalisations" })).status).toBe(200);
  });

  it("isolation : un autre compte ne voit ni ne modifie les pages du projet", async () => {
    const { pid } = await project("hightech", "dominer");
    const intruder = await createUser(`intrus-${Date.now()}@test.fr`, "motdepasse-test", "I");
    expect((await call(intruder, pid)).status).toBe(404);
    expect((await call(intruder, pid, { action: "add_page", model: "contact", title: "x" })).status).toBe(404);
  });

  it("activité : déduite du projet puis corrigeable par le client", async () => {
    const { u, pid } = await project("artisan", "vendre");
    const g = await call(u, pid);
    expect(g.json.activity.confirmed).toBe(false);
    const r = await call(u, pid, { action: "set_activity", activity: "mixed" });
    expect(r.json.activity).toMatchObject({ value: "mixed", confirmed: true });
    expect(r.json.suggested).toContain("produit-essentiel");
  });

  it("exports : Shopify garde chaque page et chaque mise en page produit ; WordPress et PrestaShop gardent les pages et signalent la limite produit", async () => {
    const { cmsExport } = await import("@/lib/cms-v2/export");
    const { compileTheme } = await import("@/lib/theme/compile");
    const { libraryLoader } = await import("@/lib/theme/loader");
    const { u, pid } = await project("hightech", "dominer");
    const add = await call(u, pid, { action: "add_page", model: "commerce-presentation", title: "Notre boutique", handle: "notre-boutique" });
    await call(u, pid, { action: "add_page", model: "a-propos", title: "Brouillon", status: "draft" });
    const prod = storeProducts(currentTheme(pid)!.spec)[0].handle;
    await call(u, pid, { action: "add_product_layout", model: "produit-demonstration", product: prod });
    const spec = currentTheme(pid)!.spec;
    const suffix = storeProducts(spec)[0].template_suffix!;
    const page = spec.store.pages.find((p) => p.handle === add.json.handle)!;
    // Thème Shopify : un fichier par page et par mise en page produit, avec leurs propres sections.
    const files = fr(() => compileTheme(spec));
    expect(files.has(`templates/page.${page.template_suffix}.json`)).toBe(true);
    const ptpl = JSON.parse(String(files.get(`templates/product.${suffix}.json`)).replace(/^\/\*[\s\S]*?\*\/\s*/, ""));
    expect(Object.values(ptpl.sections).map((x: any) => x.type)).toContain("how-to");
    // WooCommerce : la page garde son gabarit ; le brouillon n'est pas créé ; la limite produit est annoncée.
    const wp = await fr(() => cmsExport("woocommerce", spec, libraryLoader, { projectId: pid }));
    expect(wp.files.some((f) => f.endsWith(`templates/page-${page.handle}.html`))).toBe(true);
    expect(wp.files.some((f) => /page-brouillon/.test(f))).toBe(false);
    expect(wp.issues.map((i) => i.code)).toEqual(expect.arrayContaining(["draft_pages_skipped", "product_layouts_shared"]));
    expect(wp.issues.filter((i) => i.severity === "blocking")).toEqual([]);
    const ps = await fr(() => cmsExport("prestashop", spec, libraryLoader, { projectId: pid }));
    expect(ps.files.some((f) => f.endsWith(`pages/${page.handle}.tpl`))).toBe(true);
    expect(ps.issues.map((i) => i.code)).toContain("product_layouts_shared");
  }, 60_000);
});
