import { chooseGeneralistForTest } from "./strategy-choice-fixture";
/** Lot 2A : stockage, composition, routes manuelles/chat, worker, rendu et ZIP réels.
 * Seule la session Next est adaptée au harnais ; disponibilité IA forcée à faux. Aucune réponse IA simulée.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
const session = vi.hoisted(() => {
  const root = process.env.DATA_DIR;
  if (!root) throw new Error("Le harnais Vitest isolé est obligatoire");
  const dir = process.getBuiltinModule("fs").mkdtempSync(`${root}/lot2a-`);
  const shared = globalThis as { __ecomDb?: { close(): void } };
  const previousDb = shared.__ecomDb;
  delete shared.__ecomDb;
  vi.stubEnv("DATA_DIR", dir);
  return { token: "", dir, previousDb };
});
afterAll(() => {
  const shared = globalThis as { __ecomDb?: { close(): void } };
  if (shared.__ecomDb !== session.previousDb) shared.__ecomDb?.close();
  if (session.previousDb) shared.__ecomDb = session.previousDb;
  else delete shared.__ecomDb;
  vi.unstubAllEnvs();
});
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => session.token ? { value: session.token } : undefined, set: (_n: string, value: string) => { session.token = value; }, delete: () => {} }) }));
vi.mock("@/lib/ai/llm", async (original) => ({ ...(await original<object>()), llmConfigured: () => false }));
import { createUser, startSession } from "@/lib/auth";
import { all } from "@/lib/db";
import { referenceProject } from "./lot2a-fixtures";
import { seedHoldout } from "./lot1-holdout-fixtures";
import { loadProject, currentTheme, saveThemeVersion, listThemeVersions, saveProduct, saveServices, saveBrand } from "@/lib/projects";
import { localBrand } from "@/lib/engine/local";
import { composeShop } from "@/lib/engine/shop";
import { emptyProduct, emptyServiceProfile } from "@/lib/project-types";
import { runWithLang } from "@/lib/i18n-server";
import { applyOps, validateSpec, OpSchema } from "@/lib/theme/ops";
import { renderPage } from "@/lib/theme/render";
import { sectionSchema, storeProducts, settingsSchema, coerceSetting } from "@/lib/theme/spec";
import { bindReferenceOffers } from "@/lib/theme/reference-delivery";
import { withProjectMedia } from "@/lib/theme/section-defaults";
import { contentContext } from "@/lib/theme/section-content";
import { libraryEntry } from "@/lib/theme/section-library";
import { cmsExport } from "@/lib/cms-v2/export";
import { libraryLoader } from "@/lib/theme/loader";
import { POST as manualRoute } from "@/app/api/projects/[id]/theme/ops/route";
import { POST as chatRoute } from "@/app/api/projects/[id]/theme/chat/route";
import { POST as restoreRoute } from "@/app/api/projects/[id]/theme/restore/route";
import { POST as buildRoute } from "@/app/api/projects/[id]/theme/build/route";
import { claimNext, completeJob, JobContext } from "@/lib/jobs";
import { handlers } from "../worker/handlers";
const fr = <T>(f: () => T) => runWithLang({ content: "fr", ui: "fr" }, f);
beforeEach(() => vi.stubGlobal("fetch", async () => { throw new Error("Réseau interdit dans les tests du lot 2A"); }));
describe("Lot 2A — références intégrées", async () => {
  const user = await createUser(`lot2a-${Date.now()}@example.invalid`, "isolated-test-only", "Test isolé");
  it("compose deux structures distinctes, riches, valides, sans modifier une version existante", async () => fr(async () => {
    expect(all<{ file: string }>("PRAGMA database_list")[0].file.startsWith(session.dir + "/")).toBe(true);
    const product = await referenceProject(user.id, "products"), service = await referenceProject(user.id, "services");
    for (const ref of [product, service]) {
      expect(validateSpec(ref.spec)).toEqual([]);
      for (const def of settingsSchema(ref.spec).flatMap((group) => group.settings ?? []).filter((s) => s.type === "range")) {
        if (!def.id) continue;
        const value = ref.spec.settings[def.id];
        if (value != null) expect(coerceSetting(def, value), `${ref.kind}/${def.id}`).toEqual({ ok: true, value });
      }
      expect(ref.spec.templates.index.order.length).toBeGreaterThanOrEqual(8);
      expect(ref.spec.templates.index.order.length).toBeLessThanOrEqual(12);
      expect(ref.spec.templates.index.sections[ref.spec.templates.index.order[0]].type).toBe("ref-hero");
      expect(currentTheme(ref.pid)).toBeNull();
      const html = (await renderPage({ spec: ref.spec, base: "", cart: [] }, "/", new URLSearchParams())).html;
      expect(html).toContain("theme-reference.css"); expect(html).toContain(ref.copy.hero.heading);
      expect(html).not.toContain("Liquid error"); expect(html).not.toMatch(/99 %|10 000 clients|avis vérifiés/);
    }
    expect(product.spec.templates.index.order.map((id) => product.spec.templates.index.sections[id].type)).not.toEqual(service.spec.templates.index.order.map((id) => service.spec.templates.index.sections[id].type));
    const editorials = Object.values(product.spec.templates.index.sections).filter((s) => s.type === "ref-editorial").map((s) => product.spec.files[String(s.settings.image_asset)]);
    expect(new Set(editorials).size).toBe(editorials.length);
    expect(service.spec.settings.cart_type).toBe("none");
    expect(service.spec.store.pages.some((p) => p.contentTarget === "service:creation")).toBe(true);
  }));
  it("relie les prestations à leur identité, leur image et leur texte complet après changement d'ordre", async () => fr(async () => {
    const { spec, project } = await referenceProject(user.id, "services");
    const refs = spec.meta!.reference!.links;
    const offers = spec.templates.index.sections[refs[0].section];
    offers.block_order!.reverse();
    for (const r of refs) offers.blocks![r.block].settings.title = "Même titre";
    bindReferenceOffers(spec, project);
    for (const r of refs) {
      const block = offers.blocks![r.block], page = spec.store.pages.find((p) => p.contentTarget === r.target)!;
      expect(block.settings.link).toBe(`/pages/${page.handle}`);
      const template = spec.templates[`page.${page.template_suffix}`];
      expect(template.sections.reference_opening.settings.image_asset).toBe(block.settings.image_asset);
      const html = (await renderPage({ spec, base: "", cart: [] }, `/pages/${page.handle}`, new URLSearchParams())).html;
      expect(html).toContain("Aucun engagement commercial réel."); expect(html.match(/<h1\b/g)).toHaveLength(1);
      for (const other of refs.filter((o) => o.target !== r.target)) expect(JSON.stringify(template)).not.toContain(offers.blocks![other.block].settings.image_asset);
    }
  }));
  it("renommer une prestation garde son image ; un ancien nom ambigu n'attribue aucune photo à tort", async () => fr(async () => {
    const { pid, spec } = await referenceProject(user.id, "services");
    const original = Object.fromEntries(spec.meta!.reference!.links.map((r) => [r.target, spec.templates.index.sections[r.section].blocks![r.block].settings.image_asset]));
    const p = loadProject(pid); saveServices(pid, { ...p.services, services: p.services.services.map((s) => ({ ...s, name: `Nouveau ${s.key}` })).reverse() });
    const renamed = (await composeShop(pid, "jardin", null, false)).spec;
    for (const r of renamed.meta!.reference!.links) expect(renamed.templates.index.sections[r.section].blocks![r.block].settings.image_asset).toBe(original[r.target]);
    const next = loadProject(pid); saveServices(pid, { ...next.services, services: next.services.services.map((s) => ({ ...s, contentAliases: [...(s.contentAliases ?? []), "Création de jardin"] })) });
    const ambiguous = (await composeShop(pid, "jardin", null, false)).spec;
    const first = ambiguous.meta!.reference!.links.find((r) => r.target === "service:creation")!;
    expect(ambiguous.templates.index.sections[first.section].blocks![first.block].settings.image_asset).toBe("");
  }));
  it("sélection réelle dans la galerie : route → job de direction → moteur local → nouvelle version", async () => fr(async () => {
    const { pid, spec } = await referenceProject(user.id, "products", { media: false });
    const before = saveThemeVersion(pid, spec, "Version utilisable conservée", "user"); chooseGeneralistForTest(pid); await startSession(user.id);
    const response = await buildRoute(new Request(`http://studio.test/api/projects/${pid}/theme/build`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ direction: "vitrine" }) }), { params: Promise.resolve({ id: pid }) });
    const body = await response.json(); expect(response.status, JSON.stringify(body)).toBe(200);
    const job = claimNext(["shop.direction"])!; expect(job.id).toBe(body.jobId);
    const result = await handlers[job.type](new JobContext(job)); completeJob(job.id, result);
    const current = currentTheme(pid)!; expect(current.version.id).not.toBe(before.id);
    expect(current.spec.meta?.reference?.kind).toBe("products");
    expect(current.spec.templates.index.sections[current.spec.templates.index.order[0]].type).toBe("ref-hero");
    expect(listThemeVersions(pid).some((v) => v.id === before.id)).toBe(true);
    expect(all("SELECT 1 FROM ai_calls WHERE project_id=?", pid)).toEqual([]);
  }));
  it("édition manuelle → chat local → worker → historique → restauration : même version, fiches et logo protégés", async () => fr(async () => {
    const { pid, spec } = await referenceProject(user.id, "products", { media: false, multi: true });
    const initial = saveThemeVersion(pid, spec, "Initiale", "user"); await startSession(user.id);
    const ctx = { params: Promise.resolve({ id: pid }) }, hero = spec.templates.index.order[0];
    const request = (endpoint: string, body: unknown) => new Request(`http://studio.test/api/projects/${pid}/theme/${endpoint}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const manual = await manualRoute(request("ops", { ops: [{ op: "set_setting", template: "index", section: hero, key: "heading", value: "Titre exact du client — à conserver" }] }), ctx);
    expect(manual.status, await manual.text()).toBe(200);
    const saved = currentTheme(pid)!, untouchedTemplates = structuredClone(saved.spec.templates); delete untouchedTemplates.index;
    const logo = structuredClone(saved.spec.groups.header);
    async function chat(message: string, selection: { template: string; section: string } | null) {
      const response = await chatRoute(request("chat", { message, selection }), ctx), body = await response.json();
      expect(response.status, JSON.stringify(body)).toBe(200);
      const job = claimNext(["shop.chat"])!; expect(job.id).toBe(body.jobId);
      const result: any = await handlers["shop.chat"](new JobContext(job)); completeJob(job.id, result);
      expect(result.mode).toBe("local"); expect(result.rejected).toEqual([]); expect(result.applied.length).toBeGreaterThan(0);
    }
    await chat("Change le style du premier écran", { template: "index", section: hero });
    expect(currentTheme(pid)!.spec.templates.index.sections[hero].settings.layout).not.toBe(saved.spec.templates.index.sections[hero].settings.layout);
    expect(currentTheme(pid)!.spec.templates.index.sections[hero].settings.heading).toBe("Titre exact du client — à conserver");
    await chat("Ajoute une FAQ après cette section", { template: "index", section: hero });
    const withFaq = currentTheme(pid)!;
    expect(withFaq.spec.templates.index.sections[withFaq.spec.templates.index.order[1]].type).toBe("v2-faq");
    await chat("Change l’en-tête", null);
    const edited = currentTheme(pid)!.spec, afterTemplates = structuredClone(edited.templates); delete afterTemplates.index;
    expect(afterTemplates).toEqual(untouchedTemplates); expect(edited.store).toEqual(saved.spec.store);
    const hid = logo.order.find((id) => logo.sections[id].type === "header")!;
    expect(edited.groups.header.sections[hid].settings.logo_asset).toEqual(logo.sections[hid].settings.logo_asset);
    const restored = await restoreRoute(request("restore", { versionId: initial.id }), ctx); expect(restored.status).toBe(200);
    expect(currentTheme(pid)!.spec).toEqual(spec); expect(listThemeVersions(pid).length).toBe(6);
    expect(all("SELECT 1 FROM ai_calls WHERE project_id=?", pid)).toEqual([]);
  }));
  it("bibliothèque : noms FR/EN, réglages, contenu manuel prioritaire, insertion et suppression dans le vrai modèle", async () => fr(async () => {
    const { pid, spec } = await referenceProject(user.id, "services", { media: false, writeServices: false });
    const context = contentContext(loadProject(pid), spec, false);
    for (const type of ["ref-hero", "ref-editorial", "ref-offers", "ref-notes"]) {
      expect(libraryEntry(type, "fr")?.name).toBeTruthy(); expect(libraryEntry(type, "en")?.name).toBeTruthy();
      const defaults = withProjectMedia(spec, type, { heading: "Texte manuel protégé" }, undefined, context);
      expect(defaults.settings.heading).toBe("Texte manuel protégé");
      const added = applyOps(spec, [OpSchema.parse({ op: "add_section", template: "index", type, ...defaults, position: { after: spec.templates.index.order[0] } })]);
      expect(added.rejected).toEqual([]); const id = added.spec.templates.index.order[1];
      expect(added.spec.templates.index.sections[id].type).toBe(type);
      expect(applyOps(added.spec, [{ op: "remove_section", template: "index", section: id }]).spec.templates.index).toEqual(spec.templates.index);
    }
    expect(sectionSchema(spec, "header")!.settings.find((s) => s.id === "layout")!.options!.map((o) => o.value)).toContain("reference-studio");
    expect(sectionSchema(spec, "footer")!.settings.find((s) => s.id === "style")!.options!.map((o) => o.value)).toContain("reference-shop");
  }));
  it("ZIP Shopify : composants, CSS, images et modèles propres à chaque produit ; autres formats signalés", async () => fr(async () => {
    const { spec } = await referenceProject(user.id, "products", { multi: true });
    const exp = await cmsExport("shopify", spec, libraryLoader), zip = unzipSync(exp.zip);
    for (const type of ["ref-hero", "ref-editorial", "ref-offers", "ref-notes"]) expect(zip[`sections/${type}.liquid`]).toBeTruthy();
    expect(zip["assets/theme-reference.css"]).toBeTruthy();
    const manifest = JSON.parse(strFromU8(zip["assets/es-product-templates.json"]));
    expect(manifest.csvAssignsTemplates).toBe(false); expect(manifest.installationVerified).toBe(false); expect(manifest.products).toHaveLength(3);
    for (const p of storeProducts(spec)) {
      expect(zip[`templates/product.${p.template_suffix}.json`]).toBeTruthy();
      for (const image of p.images) expect(zip[`assets/${image}`]).toBeTruthy();
      if (p.contentTarget !== "product:main") expect(strFromU8(zip[`templates/product.${p.template_suffix}.json`])).not.toContain("Cuir brun surpiqué");
    }
    for (const platform of ["woocommerce", "prestashop"] as const) {
      const other = await cmsExport(platform, spec, libraryLoader);
      expect(other.files.some((f) => f.endsWith("theme-reference.css"))).toBe(true);
      expect(other.zip.length).toBeGreaterThan(1000);
    }
  }));
  for (const [kind, name, summary] of [
    ["products", "Lampe en céramique", "Une lampe de table."],
    ["products", "Fichier numérique de plans de couture", "Plans numériques fournis par le créateur. ".repeat(80) + "Fin intégrale à conserver."],
    ["services", "Réparation de vélos cargo", "Diagnostic et réparation sur devis."],
    ["services", "Traduction juridique", "Prestations de traduction. ".repeat(90) + "Dernière phrase du client."],
  ] as const) it(`cas nouveaux sans média inventé : ${name}`, async () => fr(async () => {
    const pid = seedHoldout(user.id, kind === "services" ? 2 : 0), services = { ...emptyServiceProfile(), services: [{ key: "a", name: "Diagnostic", description: summary }, { key: "b", name: "Suivi", description: "" }], contactMode: "quote" as const };
    const product = { ...emptyProduct(), name, summary }; saveProduct(pid, product);
    if (kind === "services") saveServices(pid, services);
    saveBrand(pid, localBrand(product, "Identité de test inédite", { business: kind, services }).brand);
    const { spec } = await composeShop(pid, kind === "services" ? "jardin" : "vitrine", null, false);
    expect(validateSpec(spec)).toEqual([]); expect(spec.meta?.reference?.kind).toBe(kind);
    expect(JSON.stringify(spec)).not.toMatch(/ARVEN|Racines|Montre acier|jardins qui donnent/);
    const hero = spec.templates.index.sections[spec.templates.index.order[0]];
    expect(hero.settings.image_asset).toBe(""); expect(spec.files).toEqual({});
    if (kind === "services") expect(spec.settings.cart_type).toBe("none");
    const html = (await renderPage({ spec, base: "", cart: [] }, "/", new URLSearchParams())).html;
    expect(html).not.toContain("Liquid error"); expect(html).not.toContain('src=""');
  }));
});
