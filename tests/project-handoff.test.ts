/** Frontière amont réelle, contenus/fichiers synthétiques : aucune requête IA et aucun thème construit. */
import { describe, expect, it, vi, afterEach } from "vitest";
import { buildProjectHandoff } from "@/lib/project-handoff/contract";
import { recommendProjectCategory, REFERENCE_THEMES } from "@/lib/project-handoff/categories";
import { handoffRouting } from "@/lib/project-handoff/routing";
import { categoryForProject, recordCategoryChoice, CATEGORY_CHOICE_KEY } from "@/lib/project-handoff/category-store";
import { slotIssues } from "@/lib/preparation/media-policy";
import { inspectSiteMediaLineage, MAX_SITE_MEDIA_LINEAGE } from "@/lib/project-handoff/media-pool";
import { loadProject, saveBrand, remember } from "@/lib/projects";
import { all, run } from "@/lib/db";
import { getAsset, type Asset } from "@/lib/library";
import { bindEditorial, recommendationCatalogue } from "@/lib/preparation/editorial";
import type { ReadyContract } from "@/lib/preparation/types";
import { fixture, syntheticAsset } from "./preparation-fixtures";
import { validatedBrand, directionIdentity, editorialFixture } from "./preparation-mission-fixtures";

afterEach(() => vi.unstubAllGlobals());
async function completeContract(business: "products" | "services") {
  const f = await fixture(business);
  f.input.description += business === "products" ? " Boutique centrée sur un produit phare." : "";
  const brand = validatedBrand(f.pid, f.input), identity = directionIdentity();
  const logoId = await syntheticAsset(f.pid, "logo");
  saveBrand(f.pid, { ...brand, tagline: identity.signature, palette: identity.palette, fonts: identity.fonts, tone: identity.tone, logo: { ...brand.logo, assetId: logoId, provisional: false, status: "validated" }, artIdentity: { ...identity, seriesId: "test-series", directionId: "test-direction" } });
  const p = loadProject(f.pid), { content, out } = await editorialFixture(f.pid);
  const c = bindEditorial(content, out, recommendationCatalogue(p));
  const template = getAsset(logoId)!;
  const assets: Asset[] = [template];
  const media = c.slots.map((s, i) => {
    const assetId = `site-${i}`, ratio = s.aspect === "1:1" ? [1024, 1024] : s.aspect === "9:16" ? [1080, 1920] : [1920, 1080];
    const stock = { source: "pixabay", id: String(i + 100), page: `https://pixabay.com/${i + 100}/`, author: "Auteur synthétique", license: "Licence de test explicite" };
    assets.push({ ...template, id: assetId, role: s.kind === "video" ? "clip" : "scene", kind: s.kind!, mime: s.kind === "video" ? "video/mp4" : "image/png", origin: s.source === "ai" ? "generated" : "import", width: ratio[0], height: ratio[1], duration: s.kind === "video" ? 6 : null, meta: JSON.stringify({ simulation: true, gate: { verdict: "FINAL" }, ...(s.source === "pixabay" ? { stock } : {}), preparation: { slot: s.key } }) });
    const posterId = s.kind === "video" ? `poster-${i}` : undefined;
    if (posterId) assets.push({ ...template, id: posterId, role: "video-poster", source_asset_id: assetId });
    return { ...s, assetId, posterId, reviewed: true, alignment: { status: "accepted" as const, reason: "Contrôle synthétique, aucune qualité IA réelle démontrée" } };
  });
  const ready: ReadyContract = { dataReadiness: "review_required", themeConsumerStatus: "awaiting_theme_consumer", schemaVersion: 1, kind: "project_ready_for_theme", projectId: p.id, revision: 20, provenance: "simulation", builtAt: 1, clientBrief: f.input, profile: p.product, services: business === "services" ? p.services : null, strategy: p.strategy!, brand: p.brand!, copy: c.copy, copyReadiness: { status: "mapped", provisionalFields: [], documentKeys: c.documents.map(d => d.docKey) }, research: { sources: [], observations: [], angles: [], recommendedId: "", recommendation: "Simulation", legalAvailability: "not_checked" }, editorial: c.editorial!, recommendation: c.recommendation, mediaPolicy: { images: 10, videos: business === "products" ? 1 : 2, source: "simulation", heroVideoRequired: true }, pages: c.pages, documents: c.documents, media, sources: [], approvals: {} as ReadyContract["approvals"], warnings: [] };
  return { f, p, ready, assets };
}

describe("catégorie selon l’offre et le modèle de vente", () => {
  it("les quatre références ont les catégories imposées sans nom de produit dans la règle", () => {
    expect(REFERENCE_THEMES.map(t => [t.referenceId, ...t.categories])).toEqual([["fraise", "specialized"], ["onde", "specialized"], ["orbe", "ecommerce"], ["atelier-rive", "services"]]);
  });
  it.each(["lampe", "instrument de mesure", "savon solide", "pièce de vélo"])("%s : l’offre ciblée et le catalogue ont des recommandations distinctes", async name => {
    const f = await fixture(), p = loadProject(f.pid);
    const focused = recommendProjectCategory(p, { description: `${name} : une boutique spécialisée autour d’une offre ciblée.`, constraints: "Achat direct" });
    const catalogue = recommendProjectCategory({ ...p, storeType: "multi" });
    expect(focused).toMatchObject({ category: "specialized", salesModel: "focused_offer", goal: "purchase" });
    expect(focused.eligibleThemes.map(t => t.referenceId)).toEqual(["fraise", "onde"]);
    expect(catalogue).toMatchObject({ category: "ecommerce", salesModel: "catalogue" });
    expect(catalogue.eligibleThemes.map(t => t.referenceId)).toEqual(["orbe"]);
    expect(focused.eligibleThemes.every(t => t.engineThemeId === null && t.status === "awaiting_integration")).toBe(true);
  });
  it("mono historique et description ambiguë : une précision est demandée, aucune catégorie inventée", async () => {
    const f = await fixture(), p = loadProject(f.pid);
    expect(recommendProjectCategory(p, { description: "Vente de lampes", constraints: "" })).toMatchObject({ status: "clarification_required", category: null, eligibleThemes: [] });
    expect(recommendProjectCategory({ ...p, storeType: "multi" }, { description: "Une offre ciblée centrée sur un produit phare", constraints: "" }).status).toBe("clarification_required");
  });
  it.each(["quote", "booking", "call", "form"] as const)("service : parcours %s, aucune boutique/panier forcée", async contactMode => {
    const f = await fixture("services"), p = loadProject(f.pid);
    const r = recommendProjectCategory({ ...p, services: { ...p.services, contactMode } });
    expect(r.category).toBe("services"); expect(r.goal).toBe(contactMode === "form" ? "contact" : contactMode);
    expect(r.eligibleThemes.map(t => t.referenceId)).toEqual(["atelier-rive"]);
  });
  it("choix client explicite versionné, prioritaire, idempotent ; ancien choix conservé mais invalidé si l’offre change", async () => {
    const f = await fixture(), p = loadProject(f.pid), before = categoryForProject(p, f.input);
    expect(before.recommendation.status).toBe("clarification_required");
    const chosen = recordCategoryChoice(p, f.input, "ecommerce", before.contextHash);
    expect(chosen.recommendation).toMatchObject({ category: "ecommerce", status: "recommended", salesModel: "catalogue" });
    expect(chosen.recommendation.evidence.some(e => e.source === "client_choice")).toBe(true);
    const count = all("SELECT id FROM memory WHERE project_id=? AND key LIKE ?", f.pid, `${CATEGORY_CHOICE_KEY}.version.%`).length;
    recordCategoryChoice(p, f.input, "ecommerce", before.contextHash);
    expect(all("SELECT id FROM memory WHERE project_id=? AND key LIKE ?", f.pid, `${CATEGORY_CHOICE_KEY}.version.%`)).toHaveLength(count);
    const stale = categoryForProject({ ...p, storeType: "multi" }, f.input);
    expect(stale.choiceStale).toBe(true); expect(stale.recommendation.status).toBe("clarification_required");
    expect(stale.explicitChoice?.category).toBe("ecommerce");
    expect(() => recordCategoryChoice({ ...p, storeType: "multi" }, f.input, "specialized", before.contextHash)).toThrow(/contexte.*changé/);
    expect(() => recordCategoryChoice(p, f.input, "services", before.contextHash)).toThrow(/produit ou service/);
    expect(all("SELECT id FROM theme_versions WHERE project_id=?", f.pid)).toEqual([]);
  });
  it("une inférence IA en mémoire ne vaut jamais choix explicite du client", async () => {
    const f = await fixture(), p = loadProject(f.pid), state = categoryForProject(p, f.input);
    remember(p.id, { kind: "artifact", key: CATEGORY_CHOICE_KEY, value: JSON.stringify({ category: "ecommerce", contextHash: state.contextHash, chosenAt: 1 }), source: "ai" });
    expect(categoryForProject(p, f.input).explicitChoice).toBeNull();
    expect(categoryForProject(p, f.input).recommendation.status).toBe("clarification_required");
  });
});

describe.each(["products", "services"] as const)("contrat structuré %s", business => {
  it("transmet intégralement pages/sections/SEO/identité/médias ; séparation sociale et absence de remplissage honnêtes", async () => {
    vi.stubGlobal("fetch", () => { throw new Error("Réseau interdit"); });
    const { f, p, ready, assets } = await completeContract(business), before = JSON.stringify(ready);
    const handoff = buildProjectHandoff(p, ready, assets);
    expect(handoff.status).toBe("ready"); expect(handoff.issues).toEqual([]);
    expect(JSON.stringify(ready)).toBe(before);
    expect(handoff.provenance).toBe("simulation"); expect(handoff.identity).toEqual(ready.brand);
    expect(handoff.colorRoles).toEqual(ready.brand.artIdentity!.colorRoles);
    expect(handoff.pages.find(pg => pg.kind === "contact")?.sections[0].text).toContain("FIN-contact");
    for (const doc of ready.documents) {
      const pg = handoff.pages.find(pg => pg.key === doc.doc.page.key)!;
      expect(pg.document).toEqual(doc.doc); expect(pg.seo).toEqual(doc.doc.meta);
      expect(pg.sections.flatMap(s => s.blocks)).toEqual(doc.doc.blocks);
      expect(pg.sections.some(s => s.text.length > 1000)).toBe(true);
    }
    expect(handoff.media.filter(s => s.kind === "image")).toHaveLength(10);
    expect(handoff.media.filter(s => s.kind === "video")).toHaveLength(business === "products" ? 1 : 2);
    expect(handoff.media.every(s => s.pool === "website" && s.file && handoff.pages.some(pg => pg.key === s.pageKey && pg.sections.some(section => section.key === s.sectionKey && section.mediaSlotKeys.includes(s.key))))).toBe(true);
    expect(handoff.integration.status).toBe("awaiting_theme_consumer");
    expect(handoff.socialAssetsIncluded).toBe(false);
    expect(all("SELECT id FROM ai_calls WHERE project_id=?", f.pid)).toEqual([]);
    expect(all("SELECT id FROM theme_versions WHERE project_id=?", f.pid)).toEqual([]);
    expect(buildProjectHandoff(p, ready, assets).sourceHash).toBe(handoff.sourceHash);
  });
  it("rejette les médias sociaux ou étrangers, les anciens logos et les textes non affectés sans les effacer", async () => {
    const { p, ready, assets } = await completeContract(business);
    const first = assets.find(a => a.id === ready.media[0].assetId)!;
    first.role = "social"; first.meta = JSON.stringify({ gate: { verdict: "FINAL" }, initialCreative: { group: "organic" } });
    const other = assets.find(a => a.id === ready.media[1].assetId)!; other.project_id = "foreign";
    assets.push({ ...assets[0], id: "ancien-logo-clair", role: "logo-light", source_asset_id: "ancien-logo" });
    ready.documents[0].doc.blocks.push({ id: "never-mapped", kind: "p", text: "Texte client non affecté, à conserver intégralement." });
    const h = buildProjectHandoff(p, ready, assets);
    expect(h.status).toBe("review_required"); expect(h.media[0].file).toBeNull(); expect(h.media[1].file).toBeNull();
    expect(h.issues.some(x => x.includes("Bloc non transmis"))).toBe(true);
    expect(h.identityAssets.some(a => a.assetId === "ancien-logo-clair")).toBe(false);
    expect(h.pages[0].document?.blocks.at(-1)).toMatchObject({ id: "never-mapped" });
    expect(() => buildProjectHandoff({ ...p, id: "foreign" }, ready, assets)).toThrow(/autre projet/);
  });
  it("nouvelle identité ou média simulé en production : revalidation exigée, historique source inchangé", async () => {
    const { p, ready, assets } = await completeContract(business), old = JSON.stringify(ready);
    const h = buildProjectHandoff({ ...p, brand: { ...p.brand!, tagline: "Identité modifiée" } }, { ...ready, provenance: "production" }, assets);
    expect(h.status).toBe("review_required"); expect(h.issues.some(x => x.includes("identité active a changé"))).toBe(true);
    expect(h.issues.some(x => x.includes("Média simulé interdit"))).toBe(true);
    expect(JSON.stringify(ready)).toBe(old);
  });
});

it("diagnostic de routes local : aucune preuve de fournisseur réel ni clé/modèle exposé", async () => {
  vi.stubGlobal("fetch", () => { throw new Error("Réseau interdit"); });
  const f = await fixture("services"), p = loadProject(f.pid), routes = handoffRouting(p, true, true);
  expect(routes.every(r => r.environment === "simulation" && !r.executed && !r.realProviderValidated)).toBe(true);
  expect(routes.find(r => r.stage === "site_stock")).toMatchObject({ provider: "pixabay", modelConfigured: false });
  expect(routes.find(r => r.stage === "site_images")).toBeUndefined();
  expect(routes.some(r => r.stage === "initial_twenty_images")).toBe(true);
  expect(JSON.stringify(routes)).not.toMatch(/apiKey|"model":|"api_key":/);
});

it.each(["social", "ad", "initialCreative", "finalPost", "finalAd", "adBrief"])("média final de qualité acceptée exclu du pool site : %s", async evidence => {
  const { p, ready, assets } = await completeContract("products");
  const a = assets.find(a => a.id === ready.media[0].assetId)!;
  const meta = JSON.parse(a.meta);
  if (["social", "ad"].includes(evidence)) a.role = evidence;
  if (evidence === "initialCreative") meta.initialCreative = { group: "organic" };
  if (evidence === "finalPost") meta.finalImage = { purpose: "post", quality: { accepted: true, score: 9.8 } };
  if (evidence === "finalAd") meta.finalImage = { purpose: "ad", quality: { accepted: true, score: 9.8 } };
  if (evidence === "adBrief") meta.imageV2 = { brief: { support: "ad" } };
  a.meta = JSON.stringify(meta);
  expect(slotIssues(p, ready.media[0], a).some(s => s.includes("distincts des publications et publicités"))).toBe(true);
  expect(buildProjectHandoff(p, ready, assets).media[0].file).toBeNull();
});
it("dérivée d’une publicité refusée comme création indépendante du site", async () => {
  const f = await fixture(); validatedBrand(f.pid, f.input);
  const socialId = await syntheticAsset(f.pid, "ad", "generated", { finalImage: { purpose: "ad" } });
  const id = await syntheticAsset(f.pid, "scene"), a = { ...getAsset(id)!, source_asset_id: socialId, width: 1024, height: 1024 };
  const slot = { key: "site", pageKey: "home", sectionKey: "hero", required: true, purpose: "Produit", source: "ai" as const, kind: "image" as const, aspect: "1:1" as const, alignment: { status: "accepted" as const, reason: "Simulation" } };
  expect(slotIssues(loadProject(f.pid), slot, a).some(s => s.includes("distincts des publications et publicités"))).toBe(true);
  const full = await completeContract("products");
  const first = full.assets.find(a => a.id === full.ready.media[0].assetId)!;
  first.source_asset_id = "publicite-parent";
  full.assets.push({ ...full.assets[0], id: "publicite-parent", role: "ad", meta: JSON.stringify({ gate: { verdict: "FINAL" }, finalImage: { purpose: "ad" } }) });
  expect(buildProjectHandoff(full.p, full.ready, full.assets).media[0].file).toBeNull();
});

it.each([12, 13])("une publicité archivée à %i liens reste refusée par la validation réelle et le contrat", async depth => {
  const full = await completeContract("products");
  const first = full.assets.find(a => a.id === full.ready.media[0].assetId)!;
  let previous = await syntheticAsset(full.p.id, "ad");
  run("UPDATE assets SET deleted_at=1 WHERE id=?", previous);
  full.assets.push(getAsset(previous)!);
  for (let i = 0; i < depth - 1; i++) {
    const next = await syntheticAsset(full.p.id, "scene");
    run("UPDATE assets SET source_asset_id=?,width=1024,height=1024 WHERE id=?", previous, next);
    previous = next; full.assets.push(getAsset(next)!);
  }
  first.source_asset_id = previous;
  expect(slotIssues(full.p, full.ready.media[0], first)).toContain("Les médias du site sont distincts des publications et publicités : choisissez une création propre au site.");
  const result = buildProjectHandoff(full.p, full.ready, full.assets);
  expect(result.media[0].file).toBeNull(); expect(result.status).toBe("review_required");
});
it.each(["cycle", "missing", "foreign"])("filiation non vérifiable (%s) refusée par les deux consommateurs sans effacer les fichiers", async defect => {
  const full = await completeContract("products"), first = full.assets.find(a => a.id === full.ready.media[0].assetId)!;
  const parentId = await syntheticAsset(full.p.id, "scene");
  if (defect === "cycle") run("UPDATE assets SET source_asset_id=? WHERE id=?", parentId, parentId);
  if (defect === "foreign") { const other = await fixture(); run("UPDATE assets SET project_id=? WHERE id=?", other.pid, parentId); }
  first.source_asset_id = defect === "missing" ? "source-introuvable" : parentId;
  full.assets.push(getAsset(parentId)!);
  expect(slotIssues(full.p, full.ready.media[0], first).length).toBeGreaterThan(0);
  expect(buildProjectHandoff(full.p, full.ready, full.assets).media[0].file).toBeNull();
  expect(getAsset(parentId)).toBeDefined();
});
it("un parent IA archivé mais vérifiable reste auditable, sans redevenir sélectionnable", async () => {
  const full = await completeContract("products"), first = full.assets.find(a => a.id === full.ready.media[0].assetId)!;
  const parentId = await syntheticAsset(full.p.id, "scene");
  run("UPDATE assets SET deleted_at=1 WHERE id=?", parentId);
  first.source_asset_id = parentId; full.assets.push(getAsset(parentId)!);
  expect(slotIssues(full.p, full.ready.media[0], first)).toEqual([]);
  const handoff = buildProjectHandoff(full.p, full.ready, full.assets);
  expect(handoff.status).toBe("ready"); expect(handoff.media[0].file?.assetId).toBe(first.id);
  expect(handoff.media.some(m => m.file?.assetId === parentId)).toBe(false);
  expect(handoff.identityAssets.some(a => a.assetId === parentId)).toBe(false);
});
it("la borne de filiation ne transforme jamais une origine inconnue en preuve valide", async () => {
  const full = await completeContract("products"), first = full.assets.find(a => a.id === full.ready.media[0].assetId)!;
  const chain = Array.from({ length: MAX_SITE_MEDIA_LINEAGE + 1 }, (_, i) => ({ ...first, id: `deep-${i}`, role: i === MAX_SITE_MEDIA_LINEAGE ? "ad" : "scene", source_asset_id: i < MAX_SITE_MEDIA_LINEAGE ? `deep-${i + 1}` : null }));
  const byId = new Map(chain.map(a => [a.id, a]));
  const inspection = inspectSiteMediaLineage(chain[0], full.p.id, id => byId.get(id));
  expect(inspection).toMatchObject({ verified: false, code: "source_depth" });
  first.source_asset_id = chain[0].id; full.assets.push(...chain);
  expect(buildProjectHandoff(full.p, full.ready, full.assets).media[0].file).toBeNull();
});
