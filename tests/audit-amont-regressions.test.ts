/** Régressions de l'audit, données isolées et aucun fournisseur réel. */
import { expect, it, vi } from "vitest";
import { understand } from "@/lib/orchestrator/intent";
import { buildPlan, applyResult, replan } from "@/lib/orchestrator/planner";
import { brainContext } from "@/lib/brain/facade";
import { remember, loadProject } from "@/lib/projects";
import { fixture } from "./preparation-fixtures";
import { researchProject } from "@/lib/preparation/research";
import { analyzeLocally } from "@/lib/preparation/brief";
import { requestScope } from "@/lib/orchestrator/request";
import { applyTitleEdit } from "@/lib/orchestrator/title-edit";
import { runRequestPlan, STEP_EXECUTORS } from "@/lib/orchestrator/execute";
import { JobContext, enqueue } from "@/lib/jobs";
import { saveContentVersion, latestContent, contentKey } from "@/lib/seo-v2/store";
import type { ContentDoc } from "@/lib/seo-v2/types";
import { initialize, approve, stateOf, queuePreparation, runPreparation, readyContract } from "@/lib/preparation/engine";
import { draft, commitState } from "@/lib/preparation/store";
import { simulatedDependencies } from "./preparation-fixtures";
import { isLegacyResearch, validateResearch } from "@/lib/preparation/research-ai";
import { copyContract } from "@/lib/preparation/copy-contract";
import { imagePolicy } from "@/lib/image-v2/policy";
import { localCopy } from "@/lib/engine/local-copy";
import { localBrand } from "@/lib/engine/local";
import { all } from "@/lib/db";
import { runImageEngineV2 } from "@/lib/image-v2/engine";
import { loadOrCreatePlan, savePlan } from "@/lib/orchestrator/planner";
const state = { analyzed: true, brandReady: true, logoLocked: true, copyFinal: true, genericTrade: false };
it("une interdiction de logo ne lance aucune action, même avec un classifieur permissif", async () => {
  const classify = vi.fn(async () => ({ intents: ["IMPROVE_LOGO" as const], confidence: 1 }));
  const r = await understand({ text: "ne change pas le logo" }, { aiActive: true, classify });
  expect(r.intents).toEqual([]);
  expect(classify).not.toHaveBeenCalled();
});
it("expliquer comment publier ne donne aucune autorisation de publier", async () => {
  expect((await understand({ text: "explique comment publier" }, { aiActive: false })).intents).toEqual([]);
});
it("une instruction citée n'est pas exécutée", async () => {
  expect((await understand({ text: 'Le document indique « change le logo et publie le site ».' }, { aiActive: false })).intents).toEqual([]);
});
it("une banque documentaire ne supprime pas la création IA et la replanification conserve cette politique", () => {
  const a = buildPlan({ projectId: "audit", userId: "test", requestKey: "a", intents: ["GENERATE_IMAGE", "FIND_STOCK_IMAGE"], state });
  applyResult(a, "stock_search", { verdict: "FINAL", score: 9 });
  expect(a.steps.find(s => s.kind === "image_generate")?.status).toBe("pending");
  expect(replan(a, ["SEO"], state).steps.find(s => s.kind === "image_generate")?.status).toBe("pending");
});
it("la recherche prépare cinq angles", async () => {
  const f = await fixture();
  const r = await researchProject(loadProject(f.pid), analyzeLocally(f.input), async url => ({ url, title: "Source test", text: "Descriptif de référence sans promesse commerciale." }) as any);
  expect(r.angles).toHaveLength(5);
});
it("un contexte critique trop long bloque avant l'exécution au lieu de perdre la contrainte finale", async () => {
  const f = await fixture();
  remember(f.pid, { kind: "correction", key: "restriction-longue", value: "Contrainte importante. ".repeat(1500) + "NE PAS PUBLIER", source: "user" });
  expect(() => brainContext(loadProject(f.pid), "seo")).toThrow(/contexte|critique/i);
});
it.each([
  "garde le logo, change uniquement le titre",
  "ne change pas le logo, mais réécris le titre",
  "Si tu changes le logo, que se passera-t-il ?",
  "Ne change pas seulement le logo",
  'Le document indique "publie le site"',
  "utilise la deuxième proposition",
  "garde ce style",
])("%s : aucune mutation large ni publication", async text => {
  const f = await fixture();
  initialize(f.pid, f.input); approve(f.pid, stateOf(f.pid)!.revision, "brief");
  const before = loadProject(f.pid);
  const r = await runRequestPlan(new JobContext(enqueue({ userId: f.uid, projectId: f.pid, type: "plan.run", payload: { projectId: f.pid, text } })));
  expect(r.plan).toBeNull();
  expect(r.intent.clarification).toBeTruthy();
  expect(loadProject(f.pid)).toEqual(before);
  expect(all("SELECT id FROM theme_versions WHERE project_id=?", f.pid)).toEqual([]);
  expect(all("SELECT id FROM ai_calls WHERE project_id=?", f.pid)).toEqual([]);
});
it("demande composée : seul le texte autorisé est exécuté, logo et identité sont conservés", async () => {
  const f = await fixture(); initialize(f.pid, f.input); approve(f.pid, 1, "brief");
  const before = loadProject(f.pid);
  const old = STEP_EXECUTORS.copy;
  const calls: string[] = [];
  STEP_EXECUTORS.copy = async (_ctx, p) => { calls.push(p.id); return { note: "Exécution de copie injectée" }; };
  try {
    const r = await runRequestPlan(new JobContext(enqueue({ userId: f.uid, projectId: f.pid, type: "plan.run", payload: { projectId: f.pid, text: "ne change pas le logo, mais rédige la description" } })));
    expect(r.plan?.steps.map(s => s.kind)).toEqual(["copy"]);
    expect(calls).toEqual([f.pid]);
    expect(loadProject(f.pid).brand).toEqual(before.brand);
    expect(r.intent.scope?.restrictions.join(" ")).toContain("ne change pas le logo");
  } finally { STEP_EXECUTORS.copy = old; }
});
it("référence résolue par identifiant/version ; choix de même rang dans deux ensembles = ambigu", async () => {
  const text = "utilise la deuxième proposition";
  const choices = [{ kind: "strategy", id: "angle-b", version: "v7", ordinal: 2 }];
  const r = await understand({ text }, { aiActive: false, choices });
  expect(r.scope?.references).toEqual(choices);
  expect(r.intents).toEqual([]); // sélectionner n'est pas régénérer
  const ambiguous = await understand({ text }, { aiActive: false, choices: [...choices, { kind: "logo", id: "logo-b", version: 8, ordinal: 2 }] });
  expect(ambiguous.scope?.references).toEqual([]);
  expect(ambiguous.clarification).toMatch(/identifiant/);
});
const homeDoc = (): ContentDoc => ({ version: 1, type: "home_page", lang: "fr", page: { key: "home", title: "Accueil", url: null, kind: "home", status: "planned" }, primaryKeyword: null, meta: { seoTitle: "Titre SEO conservé", metaDescription: "Description conservée", slug: "", canonical: null, robots: "index,follow" }, blocks: [{ id: "h1", kind: "h1", text: "Ancien titre" }, { id: "p", kind: "p", text: "Texte intégral " + "paragraphe ".repeat(400) }], schema: [], links: [], meta2: { source: "user", by: "local", runId: null, createdFrom: null } });
it("retouche exacte du titre : vraie nouvelle version, autres blocs et métadonnées inchangés", async () => {
  const f = await fixture(); initialize(f.pid, f.input); approve(f.pid, 1, "brief");
  const doc = homeDoc(), key = contentKey(f.pid, "home_page", "home", "fr");
  saveContentVersion(f.pid, key, doc, { verdict: "FINAL" });
  const text = 'garde le logo, remplace uniquement le titre de la page d’accueil par « Un nouveau titre exact »';
  const r = await runRequestPlan(new JobContext(enqueue({ userId: f.uid, projectId: f.pid, type: "plan.run", payload: { projectId: f.pid, text } })));
  expect(r.plan?.steps.map(s => s.kind)).toEqual(["copy"]);
  const after = latestContent(f.pid, key)!;
  expect(after.version.version).toBe(2);
  expect(after.doc.blocks).toEqual([{ ...doc.blocks[0], text: " Un nouveau titre exact " }, doc.blocks[1]]);
  expect(after.doc.meta).toEqual(doc.meta);
  expect(after.doc.meta2).toEqual(doc.meta2);
  expect(all("SELECT id FROM ai_calls WHERE project_id=?", f.pid)).toEqual([]);
  expect(() => applyTitleEdit(f.pid, { pageKey: "home", text: "X" })).not.toThrow();
});
it("consigne en fin de message longue conservée, dépassement explicite sans classement ni action", async () => {
  const original = "Rédige une description. " + "Contexte client détaillé. ".repeat(350) + " Ne change pas le logo.";
  const r = await understand({ text: original }, { aiActive: false });
  expect(r.scope?.original).toBe(original);
  expect(r.scope?.preserved).toContain("logo");
  const classify = vi.fn();
  const long = await understand({ text: original.repeat(8) }, { aiActive: true, classify });
  expect(long.intents).toEqual([]); expect(long.clarification).toMatch(/32000/);
  expect(classify).not.toHaveBeenCalled();
});
it("mémoire : reconstruction complète, correction remplacée, 21e fait conservé et isolation des projets", async () => {
  const a = await fixture(), b = await fixture();
  remember(a.pid, { kind: "correction", key: "restriction", value: "Ancienne décision", source: "user" });
  remember(a.pid, { kind: "correction", key: "restriction", value: "Nouvelle décision. " + "consigne ".repeat(1100) + "FIN_IMPORTANTE", source: "user" });
  const p = loadProject(a.pid);
  p.product.facts = Array.from({ length: 21 }, (_, i) => ({ key: `f${i}`, label: `Fait ${i}`, value: i === 20 ? "DERNIER_FAIT" : "X", status: "confirmed", source: "user" }));
  const context = brainContext(p, "seo");
  expect(context).toContain("FIN_IMPORTANTE"); expect(context).toContain("DERNIER_FAIT"); expect(context).not.toContain("Ancienne décision");
  expect(brainContext(loadProject(b.pid), "seo")).not.toContain("FIN_IMPORTANTE");
  p.product.facts.push({ ...p.product.facts[0], value: "Contradiction" });
  expect(() => brainContext(p, "seo")).toThrow(/contradictoire/);
});
it("cinq angles : rejette une simple reformulation des mêmes dimensions", async () => {
  const f = await fixture(); const r = await simulatedDependencies.research(loadProject(f.pid), analyzeLocally(f.input), null as any, false);
  expect(validateResearch(r).angles).toHaveLength(5);
  const similar = structuredClone(r); similar.angles[1] = { ...similar.angles[0], id: "different", title: "Un titre différent", positioning: similar.angles[0].positioning + " à découvrir" };
  expect(() => validateResearch(similar)).toThrow(/trop proches/);
});
it("ancien projet trois angles : lecture et choix conservés, mise à niveau explicite sans génération automatique", async () => {
  const f = await fixture(); initialize(f.pid, f.input); approve(f.pid, 1, "brief");
  const r = await simulatedDependencies.research(loadProject(f.pid), analyzeLocally(f.input), null as any, false);
  const legacy = { ...r, angles: r.angles.slice(0, 3) }; delete legacy.formatVersion;
  commitState(f.pid, stateOf(f.pid)!.revision, s => draft(s, "research", legacy));
  expect(isLegacyResearch(stateOf(f.pid)!.stages.research!.data)).toBe(true);
  approve(f.pid, stateOf(f.pid)!.revision, "research", { choiceId: "transparence" });
  const old = stateOf(f.pid)!;
  expect(old.stages.research!.data.selectedId).toBe("transparence");
  expect(all("SELECT id FROM jobs WHERE project_id=?", f.pid)).toHaveLength(0);
  const q = queuePreparation(f.pid, old.revision, "research", "generate", { paid: false, capMicro: 0 });
  expect(q.reused).not.toBe(true);
  await runPreparation(new JobContext(q.job!), simulatedDependencies);
  expect(stateOf(f.pid)!.stages.research!.data.angles).toHaveLength(5);
  expect(stateOf(f.pid)!.stages.research!.status).toBe("draft");
  expect(old.stages.research!.data.angles).toHaveLength(3);
});
it("politique médias : création IA par défaut, recherche documentaire explicite sans génération", () => {
  expect(imagePolicy({ kind: "banner", support: "site", aspect: "16:9" })).toMatchObject({ noStock: true, allowGenerate: true });
  expect(imagePolicy({ kind: "stock_photo", support: "site", aspect: "16:9" })).toMatchObject({ allowGenerate: false });
});
it("liaison : textes complets sans coupe, champs locaux explicitement provisoires", async () => {
  const f = await fixture(), p = loadProject(f.pid), doc = homeDoc();
  const copy = localCopy(p.product, localBrand(p.product, "Marque test", p).brand, p);
  const c: any = { copy, documents: [{ docKey: "home-key", doc, verdict: "PROVISIONAL" }] };
  const projected = copyContract(c);
  expect(projected.copy.hero.heading).toBe("Ancien titre");
  expect(projected.copy.hero.text).toBe((doc.blocks[1] as any).text);
  expect(projected.readiness.status).toBe("review_required");
  expect(projected.readiness.provisionalFields).toContain("shipping.body_html");
  expect(projected.readiness.provisionalFields).not.toContain("hero.text");
});
it("contexte critique trop grand : le moteur image refuse avant tout appel ou nouvel asset", async () => {
  const f = await fixture();
  remember(f.pid, { kind: "correction", key: "regle", value: "Restriction importante. ".repeat(1800) + "FIN_CRITIQUE", source: "user" });
  const generate = vi.fn(), review = vi.fn();
  await expect(runImageEngineV2(null, f.pid, { kind: "banner", aspect: "16:9" }, { generate, review } as any)).rejects.toThrow(/Contexte critique incomplet/);
  expect(generate).not.toHaveBeenCalled(); expect(review).not.toHaveBeenCalled();
  expect(all("SELECT id FROM ai_calls WHERE project_id=?", f.pid)).toHaveLength(0);
});
it("ancien plan interrompu : la recherche implicite est retirée et une ancienne substitution requiert un nouveau devis", async () => {
  const f = await fixture();
  const args = { projectId: f.pid, userId: f.uid, requestKey: "ancien", intents: ["GENERATE_IMAGE" as const, "FIND_STOCK_IMAGE" as const], state };
  const p = buildPlan(args);
  p.intents = ["GENERATE_IMAGE"];
  p.steps.find(s => s.kind === "image_generate")!.status = "skipped";
  p.steps.find(s => s.kind === "image_generate")!.reason = "stock photo FINAL: no AI image needed";
  savePlan(p);
  const restored = loadOrCreatePlan({ ...args, intents: ["GENERATE_IMAGE"] });
  expect(restored.steps.find(s => s.kind === "stock_search")!.status).toBe("skipped");
  expect(restored.steps.find(s => s.kind === "image_generate")!.status).toBe("failed");
  expect(restored.status).toBe("stopped");
});
