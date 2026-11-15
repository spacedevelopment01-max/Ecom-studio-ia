import { initializeSynthetic as initialize } from "./preparation-fixtures";
/** Régressions de l'audit, données isolées et aucun fournisseur réel. */
import { expect, it, vi } from "vitest";
import { buildPlan, applyResult, replan } from "@/lib/orchestrator/planner";
import { brainContext } from "@/lib/brain/facade";
import { remember, loadProject } from "@/lib/projects";
import { fixture } from "./preparation-fixtures";
import { researchProject } from "@/lib/preparation/research";
import { analyzeLocally } from "@/lib/preparation/brief";
import { JobContext } from "@/lib/jobs";
import type { ContentDoc } from "@/lib/seo-v2/types";
import { approve, stateOf, queuePreparation, runPreparation, readyContract } from "@/lib/preparation/engine";
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
it("une banque documentaire ne supprime pas la création IA et la replanification conserve cette politique", () => {
  const a = buildPlan({ projectId: "audit", userId: "test", requestKey: "a", intents: ["GENERATE_IMAGE", "FIND_STOCK_IMAGE"], state });
  applyResult(a, "stock_search", { verdict: "FINAL", score: 9 });
  expect(a.steps.find(s => s.kind === "image_generate")?.status).toBe("pending");
  expect(replan(a, ["SEO"], state).steps.find(s => s.kind === "image_generate")?.status).toBe("pending");
});
it("la lecture de pages seule ne fabrique aucun angle", async () => {
  const f = await fixture();
  const r = await researchProject(loadProject(f.pid), analyzeLocally(f.input), async url => ({ url, title: "Source test", text: "Descriptif de référence sans promesse commerciale." }) as any);
  expect(r.angles).toHaveLength(0);
});
it("un contexte critique trop long bloque avant l'exécution au lieu de perdre la contrainte finale", async () => {
  const f = await fixture();
  remember(f.pid, { kind: "correction", key: "restriction-longue", value: "Contrainte importante. ".repeat(1500) + "NE PAS PUBLIER", source: "user" });
  expect(() => brainContext(loadProject(f.pid), "seo")).toThrow(/contexte|critique/i);
});
const homeDoc = (): ContentDoc => ({ version: 1, type: "home_page", lang: "fr", page: { key: "home", title: "Accueil", url: null, kind: "home", status: "planned" }, primaryKeyword: null, meta: { seoTitle: "Titre SEO conservé", metaDescription: "Description conservée", slug: "", canonical: null, robots: "index,follow" }, blocks: [{ id: "h1", kind: "h1", text: "Ancien titre" }, { id: "p", kind: "p", text: "Texte intégral " + "paragraphe ".repeat(400) }], schema: [], links: [], meta2: { source: "user", by: "local", runId: null, createdFrom: null } });
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
  const f = await fixture(); initialize(f.pid, f.input); approve(f.pid, stateOf(f.pid)!.revision, "brief");
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
