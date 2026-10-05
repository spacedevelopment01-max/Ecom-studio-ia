/**
 * « J'ai déjà mon site et mon logo » : intégration dans le studio, sur les sites de démonstration
 * (lecture du site, type d'activité et plateforme, logo et images, produits ou prestations, marque reprise du site,
 * site conservé ou reproduit). Aucun accès réseau : fetcher en mémoire.
 */
import { describe, expect, it } from "vitest";
import { fixtureFetcher } from "./site-fixtures";
import type { JobContext as JobContextType } from "@/lib/jobs";

async function setup(site: string, opts: { uploadLogo?: boolean } = {}) {
  const { createUser } = await import("@/lib/auth");
  const { id, now, run } = await import("@/lib/db");
  const { ensureFolders, saveAsset } = await import("@/lib/library");
  const { JobContext } = await import("@/lib/jobs");
  const u = await createUser(`site-${site}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.fr`, "motdepasse-test", "Site");
  const pid = id();
  const url = `https://${site}.test/`;
  run(
    "INSERT INTO projects (id, user_id, name, status, platform, store_type, business_type, business_json, settings_json, sources_json, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    pid, u.id, `${site}.test`, "draft", "shopify", "mono", "products", "{}", JSON.stringify({ mode: "autopilot", timezone: "Europe/Paris", language: "fr", autopublish: { enabled: false, networks: [], requireApprovalFor: [] }, existingSite: { url, status: "pending" } }), "[]", now(), now(),
  );
  ensureFolders(pid);
  if (opts.uploadLogo) {
    const sharp = (await import("sharp")).default;
    const png = await sharp({ create: { width: 200, height: 80, channels: 4, background: "#123456" } }).png().toBuffer();
    await saveAsset({ projectId: pid, userId: u.id, data: png, name: "mon-logo.png", mime: "image/png", kind: "image", role: "logo", folderKey: "brand.logos", origin: "upload", meta: { provided: true } });
  }
  const ctx = new JobContext({ id: `test-${pid}`, checkpoint: "{}", payload: "{}" } as any) as JobContextType;
  return { pid, url, ctx, fetchImpl: fixtureFetcher(site) };
}

describe("site existant : lecture et intégration au projet", () => {
  it("site Shopify (boutique) : conservé, produits → produit principal + catalogue, logo et images repris, marque du site", async () => {
    const { importExistingSite, loadSiteImport, siteKept } = await import("@/lib/engine/existing-site");
    const { loadProject } = await import("@/lib/projects");
    const { all } = await import("@/lib/db");
    const { buildBrand } = await import("@/lib/engine/brand");
    const { pid, url, ctx, fetchImpl } = await setup("shopify");
    const note = await importExistingSite(ctx, pid, url, { fetchImpl });
    expect(note).toMatch(/Site lu \(Shopify\)/);
    const p = loadProject(pid);
    expect(p.business).toBe("products");
    expect(p.platform).toBe("shopify");
    expect(p.name).toBe("Maison Ambre");
    expect(p.settings.existingSite).toMatchObject({ status: "read", platform: "shopify", decision: "keep", business: "products", products: 3 });
    expect(p.settings.existingSite!.evidence!.length).toBeGreaterThan(0);
    expect(p.storeType).toBe("multi");
    expect(p.catalog.map((c) => c.name)).toEqual(["Bougie Figue Noire", "Diffuseur Cèdre"]);
    expect(p.catalog.every((c) => c.originalAssetId)).toBe(true);
    expect(p.catalog[0].price).toBe(2900);
    const assets = all<any>("SELECT role, origin, mime, meta FROM assets WHERE project_id = ? AND deleted_at IS NULL", pid);
    const logos = assets.filter((a) => a.role === "logo");
    expect(logos.length).toBeGreaterThan(0);
    expect(logos.every((a) => a.origin === "site" && JSON.parse(a.meta).source && JSON.parse(a.meta).provided)).toBe(true);
    expect(assets.filter((a) => a.role === "original").length).toBeGreaterThan(0);
    expect(assets.filter((a) => a.origin === "site").every((a) => /^https:\/\/shopify\.test\//.test(JSON.parse(a.meta).source))).toBe(true);
    const site = loadSiteImport(pid)!;
    expect(site.logo?.assetId).toBeTruthy();
    // Le texte du site sert de source à l'analyse.
    const link = JSON.parse(all<any>("SELECT value FROM memory WHERE project_id = ? AND key = 'link_import'", pid)[0].value);
    expect(link.product.name).toBe("Bougie Ambre & Vanille");
    expect(link.product.price).toBe(2900);
    // Marque : nom, logo, palette, polices du site ; aucun logo généré.
    const brand = await buildBrand(ctx, pid);
    expect(brand.name).toBe("Maison Ambre");
    expect(brand.nameStatus).toBe("provided");
    expect(brand.palette.primary).toBe(site.palette!.primary.toUpperCase());
    expect(brand.logo.status).toBe("provided");
    expect(brand.logo.assetId).toBeTruthy();
    expect(brand.fonts.heading).toMatch(/^cormorant/);
    expect(brand.validated).toEqual(expect.arrayContaining(["name", "logo", "palette", "fonts"]));
    expect(all<any>("SELECT 1 FROM assets WHERE project_id = ? AND role = 'logo' AND origin = 'generated'", pid).length).toBe(0);
    expect(siteKept(pid)).toBe(true);
  });

  it("site Wix (services) : conservé, plateforme Wix, coordonnées et prestations repérées sans rien inventer", async () => {
    const { importExistingSite } = await import("@/lib/engine/existing-site");
    const { loadProject } = await import("@/lib/projects");
    const { pid, url, ctx, fetchImpl } = await setup("wix");
    await importExistingSite(ctx, pid, url, { fetchImpl });
    const p = loadProject(pid);
    expect(p.business).toBe("services");
    expect(p.platform).toBe("wix");
    expect(p.settings.existingSite).toMatchObject({ decision: "keep", platform: "wix" });
    expect(p.services.phone).toBe("05 56 00 00 00");
    expect(p.services.email).toBe("bonjour@studio-lumiere.fr");
    expect(p.services.address).toMatch(/Bordeaux/);
    expect(p.services.services.length).toBeGreaterThan(0);
    // Chaque prestation est un intitulé lu sur le site.
    const { siteText, loadSiteImport } = await import("@/lib/engine/existing-site");
    const text = siteText(loadSiteImport(pid)!);
    for (const s of p.services.services) expect(text).toContain(s.name);
    expect(p.settings.socialLinks?.instagram).toMatch(/instagram\.com/);
  });

  it("site Webflow (boutique, plateforme non gérée) : reproduit sur Shopify, version enregistrée avec ses notes", async () => {
    const { importExistingSite, loadSiteImport, saveReproductionNotes, siteKept } = await import("@/lib/engine/existing-site");
    const { buildReproducedShop } = await import("@/lib/engine/site-reproduce");
    const { loadProject, currentTheme } = await import("@/lib/projects");
    const { buildBrand } = await import("@/lib/engine/brand");
    const { pid, url, ctx, fetchImpl } = await setup("webflow");
    await importExistingSite(ctx, pid, url, { fetchImpl });
    let p = loadProject(pid);
    expect(p.business).toBe("products");
    expect(p.platform).toBe("shopify");
    expect(p.settings.existingSite).toMatchObject({ decision: "reproduce", target: "Shopify", platform: "webflow" });
    expect(siteKept(pid)).toBe(false);
    await buildBrand(ctx, pid);
    const site = loadSiteImport(pid)!;
    const r = await buildReproducedShop(ctx, pid, site);
    const notes = saveReproductionNotes(pid, r.versionId);
    expect(notes.length).toBeGreaterThan(0);
    p = loadProject(pid);
    expect(p.settings.existingSite!.notes).toEqual(notes);
    const cur = currentTheme(pid)!;
    expect(cur.version.summary).toBe("Reproduction de votre site (Webflow → Shopify)");
    // Le logo du site est celui du thème.
    expect(cur.spec.files[cur.spec.settings.logo_asset as string]).toBe(site.logo!.assetId);
  });

  it("site sur mesure (services) : reproduit sur WordPress ; le logo SVG en ligne est extrait (original + PNG)", async () => {
    const { importExistingSite } = await import("@/lib/engine/existing-site");
    const { loadProject } = await import("@/lib/projects");
    const { all } = await import("@/lib/db");
    const { pid, url, ctx, fetchImpl } = await setup("custom");
    await importExistingSite(ctx, pid, url, { fetchImpl });
    const p = loadProject(pid);
    expect(p.business).toBe("services");
    expect(p.platform).toBe("woocommerce");
    expect(p.settings.existingSite).toMatchObject({ decision: "reproduce", target: "WordPress", platform: "custom" });
    const logos = all<any>("SELECT mime FROM assets WHERE project_id = ? AND role = 'logo' ORDER BY created_at", pid).map((a) => a.mime);
    expect(logos).toEqual(["image/svg+xml", "image/png"]);
    expect(p.services.phone).toBe("05 61 00 00 00");
  });

  it("logo envoyé par le client : il prime sur celui du site (non téléchargé)", async () => {
    const { importExistingSite, loadSiteImport } = await import("@/lib/engine/existing-site");
    const { loadProject } = await import("@/lib/projects");
    const { all } = await import("@/lib/db");
    const { buildBrand } = await import("@/lib/engine/brand");
    const { pid, url, ctx, fetchImpl } = await setup("woocommerce", { uploadLogo: true });
    await importExistingSite(ctx, pid, url, { fetchImpl });
    const p = loadProject(pid);
    expect(p.platform).toBe("woocommerce");
    expect(p.settings.existingSite).toMatchObject({ decision: "keep", logoProvided: true });
    expect(all<any>("SELECT 1 FROM assets WHERE project_id = ? AND role = 'logo' AND origin = 'site'", pid).length).toBe(0);
    const upload = all<any>("SELECT id FROM assets WHERE project_id = ? AND role = 'logo' AND origin = 'upload'", pid)[0];
    expect(loadSiteImport(pid)!.logo!.assetId).toBe(upload.id);
    const brand = await buildBrand(ctx, pid);
    expect(brand.logo.assetId).toBe(upload.id);
    expect(brand.name).toBe("Lin & Fil");
  });

  it("une reprise ne relit ni ne retélécharge le site", async () => {
    const { importExistingSite } = await import("@/lib/engine/existing-site");
    const { all } = await import("@/lib/db");
    const { pid, url, ctx, fetchImpl } = await setup("webflow");
    await importExistingSite(ctx, pid, url, { fetchImpl });
    const n = all<any>("SELECT 1 FROM assets WHERE project_id = ?", pid).length;
    const calls = fetchImpl.log.length;
    await importExistingSite(ctx, pid, url, { fetchImpl });
    expect(fetchImpl.log.length).toBe(calls);
    expect(all<any>("SELECT 1 FROM assets WHERE project_id = ?", pid).length).toBe(n);
  });

  it("site illisible : erreur claire et résumé « échec »", async () => {
    const { importExistingSite } = await import("@/lib/engine/existing-site");
    const { loadProject } = await import("@/lib/projects");
    const { pid, ctx } = await setup("shopify");
    await expect(importExistingSite(ctx, pid, "https://inconnu.test/", { fetchImpl: fixtureFetcher("shopify") })).rejects.toThrow(/Lecture de votre site impossible/);
    expect(loadProject(pid).settings.existingSite).toMatchObject({ status: "failed" });
  });
});

describe("site existant : entrée du formulaire", () => {
  const base = { mode: "autopilot", storeType: "mono", platform: "shopify", businessType: "products" } as const;
  it("adresse obligatoire, https ajouté, accord du client exigé", async () => {
    const { StartInput, existingSiteFromInput } = await import("@/lib/project-start");
    const parse = (o: Record<string, string>) => StartInput.parse({ ...base, ...o });
    expect(existingSiteFromInput(parse({}))).toBeNull();
    expect(() => existingSiteFromInput(parse({ existingSite: "1", siteUrl: "" }))).toThrow(/adresse/i);
    expect(() => existingSiteFromInput(parse({ existingSite: "1", siteUrl: "mon-site.fr" }))).toThrow(/autorisé/);
    expect(existingSiteFromInput(parse({ existingSite: "1", siteUrl: "mon-site.fr", siteOwnership: "1" }))).toEqual({ url: "https://mon-site.fr/" });
    expect(() => existingSiteFromInput(parse({ existingSite: "1", siteUrl: "javascript:alert(1)", siteOwnership: "1" }))).toThrow();
    expect(() => existingSiteFromInput(parse({ existingSite: "1", siteUrl: "ftp://mon-site.fr", siteOwnership: "1" }))).toThrow();
  });
  it("la lecture d'une adresse privée reste refusée sans le drapeau des sites de démonstration", async () => {
    const { importSite } = await import("@/lib/engine/site-import");
    const prev = process.env.SITE_IMPORT_ALLOW_LOCAL;
    delete process.env.SITE_IMPORT_ALLOW_LOCAL;
    await expect(importSite("http://127.0.0.1:4600/shopify/")).rejects.toThrow();
    if (prev !== undefined) process.env.SITE_IMPORT_ALLOW_LOCAL = prev;
  });
});
