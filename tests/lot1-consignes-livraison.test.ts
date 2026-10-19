/** Lot 1 : assemblages réels, seule la frontière du fournisseur est simulée. Données synthétiques isolées. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { unzipSync, strFromU8 } from "fflate";

const remote = vi.hoisted(() => ({ calls: [] as any[], token: "", respond: null as null | ((p: any) => Promise<unknown>), fail: false }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => remote.token ? { value: remote.token } : undefined, set: (_name: string, value: string) => { remote.token = value; }, delete: () => {} }) }));
vi.mock("@/lib/ai/config", async (original) => ({ ...(await original<object>()), activeProviderKey: (p: string) => p === "anthropic" ? "isolated-test-only" : null }));
vi.mock("@anthropic-ai/sdk", () => {
  class Client {
    static AuthenticationError = class extends Error {};
    static BadRequestError = class extends Error {};
    static NotFoundError = class extends Error {};
    async countTokens() { return { input_tokens: 100 }; }
    stream(p: any) { return { finalMessage: async () => {
      remote.calls.push(p);
      if (remote.fail) throw new Error("SIMULATION : résultat financier incertain");
      const result = await remote.respond!(p);
      return { model: p.model, stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(result) }], usage: { input_tokens: 100, output_tokens: 100 } };
    } }; }
    messages = { countTokens: () => this.countTokens(), stream: (p: any) => this.stream(p) };
    beta = { messages: this.messages };
  }
  return { default: Client, Anthropic: Client };
});

import { createUser, startSession } from "@/lib/auth";
import { all, one, run, DATA_DIR } from "@/lib/db";
import { getSubscription, syncAllowance } from "@/lib/billing";
import { grantProjectPlan } from "@/lib/project-subscriptions";
import { seedImageFixture } from "./image-v2-fixtures";
import { faithfulDraft, review } from "./seo-v2-mock";
import { loadProject, saveProduct, saveBrand, saveServices, saveCatalog, currentTheme, saveThemeVersion, themeVersion, listThemeVersions } from "@/lib/projects";
import { runWithLang } from "@/lib/i18n-server";
import { runContentEngineV2, saveUserEdit, editContentV2 } from "@/lib/seo-v2/engine";
import { contentKey, latestContent, listContentVersions, saveContentVersion, lockContentTarget, releaseContentTarget } from "@/lib/seo-v2/store";
import { localOnlyDeps } from "@/lib/seo-v2/deps";
import { referenceDoc, overlayV2Copy } from "@/lib/seo-v2/theme-copy";
import { sitePages } from "@/lib/seo-v2/pages";
import { addWordingRule } from "@/lib/client-wording";
import { localCopy } from "@/lib/engine/local-copy";
import { buildShop } from "@/lib/engine/shop";
import { composeThemeV2, buildShopV2 } from "@/lib/theme-v2/engine";
import { compileTheme, exportThemeZip } from "@/lib/theme/compile";
import { renderPage } from "@/lib/theme/render";
import { applyOps } from "@/lib/theme/ops";
import { enqueue, claimNext, JobContext, cancelJob, JobCancelled, completeJob, getJob } from "@/lib/jobs";
import { handlers } from "../worker/handlers";
import { POST as writeRoute } from "@/app/api/projects/[id]/content/v2/route";
import { GET as exportRoute } from "@/app/api/projects/[id]/theme/export/route";
import { PUT as editRoute } from "@/app/api/projects/[id]/content/v2/[docKey]/route";
import { GET as themeRoute } from "@/app/api/projects/[id]/theme/route";

const promptOf = (p: any) => p.messages.flatMap((m: any) => typeof m.content === "string" ? [m.content] : m.content.filter((x: any) => x.type === "text").map((x: any) => x.text)).join("\n");
const fr = <T>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
beforeEach(() => {
  remote.calls = []; remote.fail = false;
  vi.stubGlobal("fetch", async () => { throw new Error("TEST : réseau interdit"); });
  remote.respond = async (p) => /Tu relis UN contenu/.test(JSON.stringify(p.system)) ? review(8.8) : faithfulDraft(promptOf(p));
});

describe("Lot 1 — consignes et livraison", async () => {
  const user = await createUser(`lot1-${Date.now()}@example.invalid`, "test-only-password", "Test isolé");
  getSubscription(user.id);
  run("UPDATE subscriptions SET status='active', plan='dominer' WHERE user_id=?", user.id);
  syncAllowance(user.id);
  const seed = (kind: Parameters<typeof seedImageFixture>[1] = "hightech") => { const pid = seedImageFixture(user.id, kind); grantProjectPlan(pid, "dominer"); return pid; };
  const writes = () => remote.calls.filter((p) => !/Tu relis UN contenu/.test(JSON.stringify(p.system)));

  it("route → job → worker → véritable adaptateur : deux demandes et phrases finales distinctes, puis réutilisation sans appel", async () => {
    const pid = seed();
    await startSession(user.id);
    remote.respond = async (params) => {
      if (/Tu relis UN contenu/.test(JSON.stringify(params.system))) return review(8.8);
      const prompt = promptOf(params);
      const a = prompt.includes("Dernière phrase A.");
      return { seoTitle: "Informations du produit", metaDescription: "Présentation de l'offre confirmée.", unknowns: [], blocks: [{ kind: "h1", text: "Produit" }, { kind: "p", text: a ? "Première phrase. Dernière phrase A." : "Une phrase. Deux phrases. Dernière phrase B." }] };
    };
    const execute = async (request: string) => {
      const response = await fr(() => writeRoute(new Request(`http://studio.test/api/projects/${pid}/content/v2`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "product_page", pageKey: "product:main", request, maxCostEur: 5 }) }), { params: Promise.resolve({ id: pid }) }));
      const body = await response.json();
      expect(response.status, JSON.stringify(body)).toBe(200);
      const job = claimNext(["content.v2"])!;
      expect(job.id).toBe(body.jobId);
      const result = await fr(() => handlers[job.type](new JobContext(job)));
      completeJob(job.id, result);
      return result as Awaited<ReturnType<typeof runContentEngineV2>>;
    };
    const requestA = 'Rédige exactement deux phrases. Termine par « Dernière phrase A. »';
    const requestB = 'Rédige exactement trois phrases. Termine par « Dernière phrase B. »';
    const a = await execute(requestA);
    expect(promptOf(writes()[0])).toContain(JSON.stringify(requestA));
    expect(a.verdict).not.toBe("REJECTED");
    const b = await execute(requestB);
    expect(b.skipped).toBe(false);
    expect(writes()).toHaveLength(2);
    expect(promptOf(writes()[1])).toContain(JSON.stringify(requestB));
    const count = remote.calls.length;
    const same = await execute(requestB);
    expect(same.skipped).toBe(true);
    expect(remote.calls).toHaveLength(count);
    expect(latestContent(pid, b.docKey!)!.doc.meta2.contract?.target).toBe("product:main");
  });

  it("changement de marque, vocabulaire, faits ou langue : aucune réutilisation obsolète", async () => {
    const pid = seed();
    const req = { type: "faq" as const, maxCostEur: 5 };
    const a = await fr(() => runContentEngineV2(null, pid, req));
    const p = loadProject(pid);
    saveBrand(pid, { ...p.brand!, name: "Marque synthétique renommée" });
    const b = await fr(() => runContentEngineV2(null, pid, req));
    expect(b.skipped).toBe(false);
    expect(b.brief.context?.hash).not.toBe(a.brief.context?.hash);
    addWordingRule(pid, { avoid: "appareil", use: "instrument" });
    const c = await fr(() => runContentEngineV2(null, pid, req));
    expect(c.skipped).toBe(false);
    expect(promptOf(writes().at(-1))).toContain("instrument");
    const product = loadProject(pid).product;
    saveProduct(pid, { ...product, facts: [...product.facts, { key: "material", label: "Matière", value: "acier", status: "confirmed", source: "user" }] });
    expect((await fr(() => runContentEngineV2(null, pid, req))).skipped).toBe(false);
    expect((await fr(() => runContentEngineV2(null, pid, { ...req, lang: "en" }))).skipped).toBe(false);
  });

  it.each([false, true])("principal et accessoire, ordre inversé=%s : contenu et métadonnées séparés", async (reverse) => {
    const pid = seed();
    saveCatalog(pid, [{ key: "accessory-fixed", name: "Câble de mesure", category: "Connectique", price: 1200, compareAt: null, description: "Câble du catalogue", features: ["Connecteur standard"], originalAssetId: null }], "multi");
    const order = reverse ? ["product:catalog:accessory-fixed", "product:main"] : ["product:main", "product:catalog:accessory-fixed"];
    for (const pageKey of order) await fr(() => runContentEngineV2(null, pid, { type: "product_page", pageKey, maxCostEur: 5 }));
    const p = loadProject(pid);
    const copy = overlayV2Copy(localCopy(p.product, p.brand!, p), pid, "fr", "products").copy;
    expect(copy.product.title).toBe(p.product.name);
    expect(copy.product.description_html).not.toContain("Câble du catalogue");
    const built = await fr(() => composeThemeV2(pid));
    expect(built.spec.store.products![0].description_html).toContain("Câble de mesure");
    expect(built.spec.store.products![0].seo?.title).toContain("Câble de mesure");
    expect(built.spec.store.product.description_html).not.toContain("Câble de mesure");
  });

  it.each(["artisan", "restaurant"] as const)("prestations de %s : cible conservée après changement de titre et d'ordre", async (kind) => {
    const pid = seed(kind);
    let p = loadProject(pid);
    saveServices(pid, { ...p.services, services: [{ key: "estimate", name: "Diagnostic sur devis", description: "Étude et conseil" }, { key: "appointment", name: "Séance sur rendez-vous", description: "Entretien individuel" }] });
    for (const pageKey of ["service:estimate", "service:appointment"]) await fr(() => runContentEngineV2(null, pid, { type: "service_page", pageKey, maxCostEur: 5 }));
    p = loadProject(pid);
    saveServices(pid, { ...p.services, services: [{ ...p.services.services[1], name: "Consultation renommée" }, p.services.services[0]] });
    const pages = sitePages(loadProject(pid));
    expect(pages.find((x) => x.key === "service:appointment")?.title).toBe("Consultation renommée");
    expect(referenceDoc(pid, "service_page", "fr", "service:estimate")?.page.key).toBe("service:estimate");
    const built = await fr(() => composeThemeV2(pid));
    expect(built.spec.store.pages.filter((x) => x.handle.startsWith("texte-service-"))).toHaveLength(2);
    expect(built.spec.store.pages.find((x) => x.handle === "texte-service-appointment")?.body_html).toContain("Séance sur rendez-vous");
    await expect(fr(() => runContentEngineV2(null, pid, { type: "service_page", pageKey: "service:absent" }))).rejects.toThrow(/introuvable/);
  });

  it("long texte client : document → thème → rendu Liquid réel → ZIP et CSV, HTML dangereux inerte", async () => {
    const pid = seed();
    const r = await fr(() => runContentEngineV2(null, pid, { type: "product_page", maxCostEur: 5 }));
    const phrase = "La formulation imposée reste complète, y compris au dernier paragraphe.";
    const edited = { ...r.doc!, blocks: [...r.doc!.blocks, { id: "long1", kind: "p" as const, text: ("Description utile et détaillée du matériel. ").repeat(35) }, { id: "long2", kind: "p" as const, text: phrase }, { id: "unsafe", kind: "p" as const, text: '<script>alert("test")</script> [Lien](javascript:alert)' }] };
    saveUserEdit(pid, r.docKey!, edited);
    const result = await fr(() => composeThemeV2(pid));
    const spec = result.spec;
    expect(spec.store.product.description_html).toContain(phrase);
    expect(spec.store.product.description_html).not.toContain("<script>");
    const files = compileTheme(spec);
    const { html } = await renderPage({ spec, base: "", cart: [] }, `/products/${spec.store.product.handle}`, new URLSearchParams());
    expect(html).toContain(phrase);
    expect(html).not.toContain('<script>alert("test")');
    const exported = await exportThemeZip(spec, () => null);
    const zip = unzipSync(exported.zip);
    expect(Object.keys(zip)).toContain("templates/product.json"); // Le corps des produits Shopify est livré séparément par le CSV. 
    const { shopifyProductsCsv } = await import("@/lib/theme/catalog-export");
    expect(shopifyProductsCsv(spec)).toContain(phrase);
    await startSession(user.id);
    saveThemeVersion(pid, spec, "Export synthétique du lot 1", "user");
    const ctx = { params: Promise.resolve({ id: pid }) };
    const csvResponse = await exportRoute(new Request(`http://studio.test/api/projects/${pid}/theme/export?platform=shopify-csv`), ctx);
    expect(csvResponse.status).toBe(200);
    expect(await csvResponse.text()).toContain(phrase);
    const zipResponse = await exportRoute(new Request(`http://studio.test/api/projects/${pid}/theme/export?platform=shopify`), ctx);
    expect(zipResponse.status).toBe(200);
    expect(zipResponse.headers.get("X-ES-Verdict")).not.toBe("FINAL");
    expect(Object.keys(unzipSync(new Uint8Array(await zipResponse.arrayBuffer())))).toContain("templates/product.json");
    const dir = path.join(DATA_DIR, "lot1-evidence"); fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "product-preview.html"), html);
    fs.writeFileSync(path.join(dir, "theme.zip"), exported.zip);
  });

  it("refus qualité : version utilisable protégée et premier projet sans faux prêt", async () => {
    const pid = seed("artisan");
    const p = loadProject(pid);
    const usable = await fr(() => composeThemeV2(pid));
    const original = saveThemeVersion(pid, usable.spec, "Version utilisable de test", "user");
    saveServices(pid, { ...p.services, area: "", address: "", phone: "", email: "", hours: "", bookingUrl: "" });
    const rejected = await fr(() => buildShopV2(null, pid));
    expect(rejected.quality.decision.verdict).toBe("REJECTED");
    expect(currentTheme(pid)?.version.id).toBe(original.id);
    expect(themeVersion(pid, rejected.versionId)).toBeTruthy();
    const fresh = seed("artisan"); const s = loadProject(fresh).services;
    saveServices(fresh, { ...s, area: "", address: "", phone: "", email: "", hours: "", bookingUrl: "" });
    const attempt = await fr(() => buildShopV2(null, fresh));
    expect(attempt.delivery.state).toBe("blocked");
    expect(currentTheme(fresh)).toBeNull();
    expect(loadProject(fresh).status).not.toBe("ready");
    await startSession(user.id);
    const response = await themeRoute(new Request(`http://studio.test/api/projects/${fresh}/theme`), { params: Promise.resolve({ id: fresh }) });
    expect((await response.json()).versions).toHaveLength(1);
  });

  it("défaut corrigeable : reprise des seuls paragraphes visés et limite de deux reprises", async () => {
    const pid = seed(); let rewrites = 0;
    remote.respond = async (p) => {
      const prompt = promptOf(p);
      if (/Tu relis UN contenu/.test(JSON.stringify(p.system))) return review(8.8);
      if (prompt.includes("Blocs à modifier :")) {
        rewrites++;
        const blocks = JSON.parse(prompt.match(/Blocs à modifier : (\[.*\])/s)![1].split("\n")[0]);
        return { blocks: blocks.map((b: any) => ({ id: b.id, text: "Fin exacte." })), note: "correction synthétique" };
      }
      return { seoTitle: "Matériel", metaDescription: "Informations du matériel.", blocks: [{ kind: "h1", text: "Titre à conserver" }, { kind: "p", text: "Fin incorrecte." }], unknowns: [] };
    };
    const r = await fr(() => runContentEngineV2(null, pid, { type: "product_page", request: 'Termine par « Fin exacte. »', maxCostEur: 5 }));
    expect(rewrites).toBe(1);
    expect(r.doc?.blocks[0]).toMatchObject({ text: "Titre à conserver" });
    expect(r.doc?.meta2.contract?.checks.issues).toEqual([]);
    expect(r.stats.writes).toBe(1);
    expect(r.stats.rewrites).toBe(1);
    expect(listContentVersions(pid, r.docKey!).some((v) => ["REJECTED", "RETRY"].includes(v.verdict ?? ""))).toBe(true);
    rewrites = 0;
    const failing = seed();
    const impossible = await fr(() => runContentEngineV2(null, failing, { type: "product_page", request: 'Termine par « Une autre fin. »', maxCostEur: 5 }));
    expect(rewrites).toBe(2);
    expect(impossible.delivery?.state).toBe("blocked");
  });

  it("incertitude fournisseur, budget et annulation : arrêt borné et brouillon préservé", async () => {
    const pid = seed(); remote.fail = true;
    const uncertain = await fr(() => runContentEngineV2(null, pid, { type: "product_page", maxCostEur: 5 }));
    expect(remote.calls).toHaveLength(1);
    expect(uncertain.by).toBe("local");
    expect(uncertain.delivery?.state).not.toBe("ready");
    remote.fail = false; remote.calls = [];
    const capped = await fr(() => runContentEngineV2(null, seed(), { type: "product_page", maxCostEur: 0 }));
    expect(remote.calls).toHaveLength(0);
    expect(capped.stoppedByCostCap).toBe(true);
    const cancelledPid = seed();
    const job = enqueue({ userId: user.id, projectId: cancelledPid, type: "test.lot1", payload: {} });
    const ctx = new JobContext(claimNext(["test.lot1"])!);
    cancelJob(job.id);
    await expect(fr(() => runContentEngineV2(ctx, cancelledPid, { type: "product_page" }))).rejects.toBeInstanceOf(JobCancelled);
    expect(remote.calls).toHaveLength(0);
  });

  it("concurrence et modification du client : un seul appel identique, version client intacte", async () => {
    const pid = seed();
    const req = { type: "product_page" as const, maxCostEur: 5 };
    const [a, b] = await fr(() => Promise.all([runContentEngineV2(null, pid, req), runContentEngineV2(null, pid, req)]));
    expect(writes()).toHaveLength(1);
    expect(a.docKey).toBe(b.docKey);
    expect(b.skipped).toBe(true);
    expect(lockContentTarget(pid, "external-process", "test-owner", null)).toBe(true);
    expect(lockContentTarget(pid, "external-process", "other-owner", null)).toBe(false);
    releaseContentTarget(pid, "external-process", "test-owner");
    const before = latestContent(pid, a.docKey!)!;
    remote.respond = async (p) => {
      if (/Tu relis UN contenu/.test(JSON.stringify(p.system))) return review(8.8);
      saveUserEdit(pid, a.docKey!, { ...before.doc, blocks: [...before.doc.blocks, { id: "user-during", kind: "p", text: "Correction du client pendant le traitement." }] });
      return faithfulDraft(promptOf(p));
    };
    const next = await fr(() => runContentEngineV2(null, pid, { ...req, force: true }));
    expect(next.docKey).not.toBe(a.docKey);
    expect(latestContent(pid, a.docKey!)?.doc.blocks).toContainEqual(expect.objectContaining({ id: "user-during" }));
    expect(referenceDoc(pid, "product_page", "fr")?.blocks).toContainEqual(expect.objectContaining({ id: "user-during" }));
  });

  it("relecture insuffisante non localisée : brouillon, jamais promu en résultat utilisable", async () => {
    const pid = seed();
    remote.respond = async (params) => /Tu relis UN contenu/.test(JSON.stringify(params.system)) ? review(2, { criteria: { ...review(2).criteria, accuracy: 8, intent_fit: 8, naturalness: 8 } }) : faithfulDraft(promptOf(params));
    const r = await fr(() => runContentEngineV2(null, pid, { type: "faq", maxCostEur: 5 }));
    expect(r.verdict, JSON.stringify({ stats: r.stats, notes: r.notes, codes: r.codes, reason: r.reason, by: r.by })).not.toBe("PROVISIONAL");
    expect(r.verdict).not.toBe("FINAL");
    expect(r.delivery?.state).toBe("blocked");
    expect(r.stats.rewrites).toBe(0);
  });

  it("annulation après rédaction : essai récupérable, aucun nouvel appel de contrôle", async () => {
    const pid = seed();
    const job = enqueue({ userId: user.id, projectId: pid, type: "test.cancel-mid", payload: {} });
    const ctx = new JobContext(claimNext(["test.cancel-mid"])!);
    remote.respond = async (params) => { cancelJob(job.id); return faithfulDraft(promptOf(params)); };
    await expect(fr(() => runContentEngineV2(ctx, pid, { type: "product_page", maxCostEur: 5 }))).rejects.toBeInstanceOf(JobCancelled);
    expect(remote.calls).toHaveLength(1);
    expect(latestContent(pid, contentKey(pid, "product_page", "product:main", "fr"))?.version.verdict).toBe("RETRY");
  });

  it("thème modifié pendant la composition : le client garde la version courante", async () => {
    const pid = seed();
    const initial = await fr(() => composeThemeV2(pid));
    saveThemeVersion(pid, initial.spec, "Avant composition", "user");
    let clientVersion = "";
    const ctx = { job: { id: null }, progress: (n: number) => { if (n === 0.9) clientVersion = saveThemeVersion(pid, initial.spec, "Correction client pendant la composition", "user").id; } } as unknown as JobContext;
    const result = await fr(() => buildShopV2(ctx, pid));
    expect(currentTheme(pid)?.version.id).toBe(clientVersion);
    expect(result.delivery.active).toBe(false);
    expect(themeVersion(pid, result.versionId)).toBeTruthy();
  });

  it("métadonnées et FAQ autonomes : cible précise, aucun mélange, modifications du client prioritaires", async () => {
    const pid = seed();
    const page = await fr(() => runContentEngineV2(null, pid, { type: "product_page" }, localOnlyDeps()));
    const metadata = await fr(() => runContentEngineV2(null, pid, { type: "metadata", pageKey: "product:main" }, localOnlyDeps()));
    saveUserEdit(pid, metadata.docKey!, { ...metadata.doc!, meta: { ...metadata.doc!.meta, seoTitle: "Titre SEO du produit principal" } });
    const questions = await fr(() => runContentEngineV2(null, pid, { type: "faq", pageKey: "product:main" }, localOnlyDeps()));
    saveUserEdit(pid, questions.docKey!, { ...questions.doc!, blocks: [{ id: "q", kind: "faq", q: "Question synthétique ?", a: "Réponse du client à conserver entière." }] });
    const composed = await fr(() => composeThemeV2(pid));
    expect(composed.spec.store.product.seo?.title).toBe("Titre SEO du produit principal");
    expect(composed.spec.store.product.description_html).toContain("Réponse du client à conserver entière.");
    expect(composed.spec.store.seo?.title).not.toBe("Titre SEO du produit principal");
    saveUserEdit(pid, page.docKey!, { ...page.doc!, meta: { ...page.doc!.meta, seoTitle: "Correction SEO client plus récente" } });
    const revised = await fr(() => composeThemeV2(pid));
    expect(revised.spec.store.product.seo?.title).toBe("Correction SEO client plus récente");
  });

  it("éditeur périmé : conflit HTTP 409, consignes et version client conservées", async () => {
    const pid = seed(); await startSession(user.id);
    const r = await fr(() => runContentEngineV2(null, pid, { type: "product_page", request: 'Interdit « garantie universelle ».' }, localOnlyDeps()));
    const before = latestContent(pid, r.docKey!)!;
    saveUserEdit(pid, r.docKey!, { ...before.doc, blocks: [...before.doc.blocks, { id: "client", kind: "p", text: "Texte client actuel." }] });
    const response = await editRoute(new Request("http://studio.test/edit", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ doc: before.doc, expectedVersion: before.version.version }) }), { params: Promise.resolve({ id: pid, docKey: r.docKey! }) });
    expect(response.status).toBe(409);
    expect(latestContent(pid, r.docKey!)!.doc.blocks.at(-1)).toMatchObject({ text: "Texte client actuel." });
    expect(latestContent(pid, r.docKey!)!.doc.meta2.contract?.request).toBe('Interdit « garantie universelle ».');
  });

  it("action sans effet et résultat bloqué : aucun faux succès", async () => {
    const pid = seed();
    const result = await fr(() => composeThemeV2(pid));
    const id = result.spec.templates.index.order[0];
    const before = JSON.stringify(result.spec);
    const op = applyOps(result.spec, [{ op: "set_setting", template: "index", section: id, key: "heading", value: String(result.spec.templates.index.sections[id].settings.heading ?? "") }]);
    expect(JSON.stringify(op.spec)).toBe(before);
    expect(op.applied).toEqual([]);
    const r = await fr(() => runContentEngineV2(null, pid, { type: "product_page" }, localOnlyDeps()));
    saveUserEdit(pid, r.docKey!, { ...r.doc!, blocks: [{ id: "same", kind: "p", text: "Texte inchangé." }] });
    const edit = await editContentV2(null, pid, r.docKey!, 'Remplace "Texte inchangé." par "Texte inchangé."', {}, localOnlyDeps());
    expect(edit.applied).toBe(false);
    const job = enqueue({ userId: user.id, projectId: pid, type: "test.message", payload: {} }); claimNext(["test.message"]);
    completeJob(job.id, { delivery: { state: "blocked", message: "Brouillon conservé, correction nécessaire." } });
    expect(getJob(job.id)?.message).not.toBe("Terminé");
  });
});
