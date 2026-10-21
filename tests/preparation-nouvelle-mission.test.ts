/** Mission PR138 du 18/10 : contrôles déterministes, données isolées, aucune API réelle. */
import { describe, expect, it, vi } from "vitest";
import { initialize, approve, stateOf, answerBriefQuestion, chooseRecommendedTheme, readyContract } from "@/lib/preparation/engine";
import { commitState, draft } from "@/lib/preparation/store";
import { analyzed } from "@/lib/preparation/evidence";
import { createQuote } from "@/lib/preparation/quote";
import { bindEditorial, recommendationCatalogue } from "@/lib/preparation/editorial";
import { reserveDirectionSeries, updateDirectionSeries, currentSeries, seriesRights, directionSeries } from "@/lib/logo-v2/direction-series";
import { loadProject, saveBrand } from "@/lib/projects";
import { brandFingerprint, snapshotOf } from "@/lib/brand-versions";
import { brainView } from "@/lib/ai/context";
import { sitePlan } from "@/lib/preparation/plan";
import { researchProject } from "@/lib/preparation/research";
import { analyzeLocally } from "@/lib/preparation/brief";
import { run } from "@/lib/db";
import { fixture, CASES, initializeSynthetic } from "./preparation-fixtures";
import { directionIdentity, validatedBrand, syntheticDirections, editorialFixture } from "./preparation-mission-fixtures";
import { prepareWorkflow } from "@/lib/workflow";

it("un brief local reste enregistré mais ne peut plus être validé comme compréhension IA", async () => {
  const f = await fixture(); initialize(f.pid, f.input);
  expect(() => approve(f.pid, stateOf(f.pid)!.revision, "brief")).toThrow(/analyse IA/);
  expect(stateOf(f.pid)!.stages.brief!.data.input).toEqual(f.input);
  expect(readyContract(f.pid)).toBeNull();
});
it("une simple étiquette fournisseur ne prouve ni l'appel réussi ni la vision", async () => {
  const f = await fixture(), b = { ...analyzeLocally(f.input), provenance: "provider" as const };
  expect(analyzed(b)).toBe(false);
  expect(analyzed({ ...b, execution: { provider: "injected", model: "injected", usageKey: "fake", vision: false, at: 1 } })).toBe(false);
});
it("l'absence de fournisseur ne produit plus de devis de rédaction locale finale", async () => {
  const f = await fixture(); initializeSynthetic(f.pid, f.input); approve(f.pid, stateOf(f.pid)!.revision, "brief");
  expect(() => createQuote(f.pid, "research", "generate")).toThrow(/indisponible/);
  expect(stateOf(f.pid)!.stages.research).toBeUndefined();
});
it("une question indispensable peut être complétée sans repayer ni effacer les observations", async () => {
  const f = await fixture(); initializeSynthetic(f.pid, f.input);
  commitState(f.pid, stateOf(f.pid)!.revision, s => { const b = s.stages.brief!.data; b.profile.questions = [{ id: "usage", question: "Quel usage est confirmé ?", why: "Éviter une promesse", required: true, factKey: "usage" }]; b.missing.push("Quel usage est confirmé ?"); });
  expect(() => approve(f.pid, stateOf(f.pid)!.revision, "brief")).toThrow(/usage/);
  const observations = stateOf(f.pid)!.stages.brief!.data.observations;
  answerBriefQuestion(f.pid, stateOf(f.pid)!.revision, "usage", "Croquis au crayon.");
  expect(stateOf(f.pid)!.stages.brief!.data.observations).toEqual(observations);
  expect(stateOf(f.pid)!.stages.brief!.data.profile.facts.find(f => f.key === "usage")).toMatchObject({ source: "user", status: "confirmed", value: "Croquis au crayon." });
  expect(() => approve(f.pid, stateOf(f.pid)!.revision, "brief")).not.toThrow();
});

describe.each([["creer", 1], ["vendre", 2], ["dominer", 4]] as const)("droits de séries du forfait %s", (plan, number) => {
  it("séries versionnées sous le même nom ; rechargement et double demande idempotents", async () => {
    const f = await fixture(); run("UPDATE subscriptions SET plan=? WHERE owner_user_id=?", plan, f.uid); validatedBrand(f.pid, f.input);
    const name = loadProject(f.pid).brand!.name;
    const pack = await syntheticDirections(f.pid);
    for (let i = 0; i < number; i++) {
      const prior = currentSeries(f.pid)?.id ?? null;
      const first = reserveDirectionSeries(f.pid, `request-${i}`, { renew: i > 0, expectedId: prior });
      expect(reserveDirectionSeries(f.pid, `request-${i}`, { renew: i > 0, expectedId: prior }).id).toBe(first.id);
      updateDirectionSeries(f.pid, first.id, s => { s.territories = pack.territories; s.directions = pack.directions; s.selectedId = "t2"; });
      expect(currentSeries(f.pid)?.status).toBe("complete");
      expect(currentSeries(f.pid)?.name).toBe(name);
    }
    expect(JSON.parse(JSON.stringify(directionSeries(f.pid)))).toHaveLength(number);
    expect(directionSeries(f.pid).every(s => s.selectedId === "t2")).toBe(true);
    if (plan !== "dominer") expect(() => reserveDirectionSeries(f.pid, "too-many", { renew: true })).toThrow(/droit/);
    else expect(seriesRights(f.pid).limit).toBeNull();
  });
});
it("une reprise de série partielle conserve les directions et consomme zéro nouvelle série", async () => {
  const f = await fixture(); validatedBrand(f.pid, f.input);
  const pack = await syntheticDirections(f.pid), s = reserveDirectionSeries(f.pid, "initial");
  updateDirectionSeries(f.pid, s.id, x => { x.territories = pack.territories; x.directions = [pack.directions[0]]; });
  expect(currentSeries(f.pid)?.status).toBe("partial");
  const next = reserveDirectionSeries(f.pid, "repair", { correction: "Reprendre uniquement les deux directions manquantes." });
  expect(next.id).toBe(s.id); expect(next.directions).toEqual([pack.directions[0]]); expect(seriesRights(f.pid).used).toBe(1);
  expect(() => reserveDirectionSeries(f.pid, "repair-again", { correction: "Relancer les erreurs de dessin." })).toThrow(/Limite/);
});
it("le même choix formulé après renouvellement vise la nouvelle version, sans réutiliser une tâche ancienne", async () => {
  const f = await fixture(); const brand = validatedBrand(f.pid, f.input), pack = await syntheticDirections(f.pid);
  const first = reserveDirectionSeries(f.pid, "initial");
  updateDirectionSeries(f.pid, first.id, s => { s.territories = pack.territories; s.directions = pack.directions; });
  saveBrand(f.pid, { ...brand, artIdentity: { ...pack.directions[0].identity, seriesId: first.id, directionId: pack.directions[0].id } });
  const a = await prepareWorkflow(f.pid, f.uid, "Choisis la direction 2", { aiActive: false });
  run("UPDATE workflows SET status='done' WHERE id=?", a.id);
  const second = reserveDirectionSeries(f.pid, "renew", { renew: true });
  updateDirectionSeries(f.pid, second.id, s => { s.territories = pack.territories; s.directions = pack.directions; });
  const b = await prepareWorkflow(f.pid, f.uid, "Choisis la direction 2", { aiActive: false });
  expect(b.id).not.toBe(a.id);
  expect(b.params.directionChoice?.seriesId).toBe(second.id);
  expect((await prepareWorkflow(f.pid, f.uid, "Choisis la direction 2", { aiActive: false })).id).toBe(b.id);
  const renew = await prepareWorkflow(f.pid, f.uid, "Renouvelle les directions artistiques", { aiActive: false });
  expect(renew.params.directionExpectedSeriesId).toBe(second.id);
});
it("des appels concurrents basés sur la même série ne créent qu'un droit même à 129 €", async () => {
  const f = await fixture(); validatedBrand(f.pid, f.input);
  const results = await Promise.allSettled(["first", "duplicate"].map(async key => reserveDirectionSeries(f.pid, key, { renew: true, expectedId: null })));
  expect(results.filter(x => x.status === "fulfilled")).toHaveLength(1);
  expect(seriesRights(f.pid).used).toBe(1);
});
it.each(["image", "stock", "shop_copy", "seo", "blog", "video", "advertising", "social", "theme"] as const)("la direction complète atteint Project Brain, scope %s", async scope => {
  const f = await fixture(); const b = validatedBrand(f.pid, f.input);
  saveBrand(f.pid, { ...b, artIdentity: { ...directionIdentity(), seriesId: "s", directionId: "t" } });
  const view = brainView(loadProject(f.pid), scope);
  expect(view.stable).toContain(directionIdentity().graphicLanguage);
  expect(view.stable).toContain(directionIdentity().mood);
  expect(view.criticalDropped).toEqual([]);
});
it("ton ou ambiance modifié : l'empreinte change même si logo et palette sont identiques", async () => {
  const f = await fixture(), b = validatedBrand(f.pid, f.input);
  const a = { ...b, artIdentity: { ...directionIdentity(), seriesId: "s", directionId: "t" } };
  const changed = { ...a, artIdentity: { ...a.artIdentity, mood: "Autre lumière et mise en scène" } };
  expect(brandFingerprint(snapshotOf(a))).not.toBe(brandFingerprint(snapshotOf(changed)));
});

it.each([0, 1, 2, 3])("contrat médias et plan éditorial du cas distinct %i : tous les médias et textes sont affectés", async index => {
  const f = await fixture(CASES[index].business, index); validatedBrand(f.pid, f.input);
  const { content, out } = await editorialFixture(f.pid), catalogue = recommendationCatalogue(loadProject(f.pid));
  const bound = bindEditorial(content, out, catalogue);
  expect(bound.slots.filter(s => s.kind === "image")).toHaveLength(10);
  expect(bound.slots.filter(s => s.kind === "video")).toHaveLength(f.input.business === "products" ? 1 : 2);
  expect(bound.pages.find(p => p.kind === "contact")?.docKey).toBeTruthy();
  for (const slot of bound.slots) expect(bound.editorial!.some(b => b.mediaSlotKeys.includes(slot.key))).toBe(true);
  expect(bound.editorial!.flatMap(b => b.text).join("\n")).toContain("FIN-contact");
  expect(bound.editorial!.some(b => b.text.length > 1000)).toBe(true);
  if (f.input.business === "products") expect(["1:1", "16:9", "9:16"].map(r => bound.slots.filter(s => s.kind === "image" && s.aspect === r).length)).toEqual([4, 4, 2]);
});
it.each(["missing-slot", "missing-text", "repeated-text", "unknown-block", "unknown-theme", "unrelated-slot", "same-scene", "missing-contact"])("plan incomplet refusé : %s", async defect => {
  const f = await fixture(); validatedBrand(f.pid, f.input); const { content, out } = await editorialFixture(f.pid);
  if (defect === "missing-slot") out.slots.pop();
  if (defect === "missing-text") out.blocks.pop();
  if (defect === "repeated-text") out.blocks.push(structuredClone(out.blocks[0]));
  if (defect === "unknown-block") out.blocks[0].blockIds = ["inexistant"];
  if (defect === "unknown-theme") (out.recommendation as any).recommendedReferenceId = "theme-invente";
  if (defect === "unrelated-slot") out.blocks[0].mediaSlotKeys = [content.slots.find(s => s.pageKey !== "home")!.key];
  if (defect === "same-scene") out.slots[1].scene = out.slots[0].scene;
  if (defect === "missing-contact") out.blocks = out.blocks.filter(b => b.pageKey !== "contact");
  expect(() => bindEditorial(content, out, recommendationCatalogue(loadProject(f.pid)))).toThrow();
});
it("changer une recommandation ne remplace pas le choix validé et ne construit aucun thème", async () => {
  const f = await fixture(); validatedBrand(f.pid, f.input); initializeSynthetic(f.pid, f.input);
  const { content, out } = await editorialFixture(f.pid);
  const bound = bindEditorial(content, out, recommendationCatalogue(loadProject(f.pid)));
  commitState(f.pid, stateOf(f.pid)!.revision, s => { draft(s, "content", bound); });
  commitState(f.pid, stateOf(f.pid)!.revision, s => { s.stages.content!.data.recommendation!.selectedId = "clinique"; }); // Ancien projet : lecture historique uniquement, jamais nouvelle sélection.
  const changed = bindEditorial(stateOf(f.pid)!.stages.content!.data, out, recommendationCatalogue(loadProject(f.pid)));
  expect(changed.recommendation!.selectedId).toBe("clinique");
  expect(readyContract(f.pid)).toBeNull();
});
it("seules les dix références actives sont exposées, sans fausse installation disponible", async () => {
  const f = await fixture(); validatedBrand(f.pid, f.input); run("UPDATE subscriptions SET plan='creer' WHERE owner_user_id=?", f.uid);
  const catalogue = recommendationCatalogue(loadProject(f.pid));
  expect(catalogue.map(x => x.id)).toEqual(["fraise", "onde", "orbe", "atelier-rive", "sillon", "noctil", "traverse", "heuren", "alcove", "museau-club"]);
  expect(catalogue.filter(x => x.status === "available")).toHaveLength(0);
  expect(catalogue.every(x => x.engineThemeId === null)).toBe(true);
  expect(catalogue.some(x => x.status === "incompatible")).toBe(true);
});
it("recherche : dix pages lues, liens et contenus dupliqués éliminés ; limite partielle explicite", async () => {
  const f = await fixture();
  const input = { ...f.input, referenceUrls: [...Array.from({ length: 10 }, (_, i) => `https://source.example/${i}`), "https://source.example/0?utm_source=test", "https://copie.example/reprise"] };
  const read = vi.fn(async (url: string) => {
    const n = url.includes("copie.example") ? "1" : new URL(url).pathname.slice(1);
    return { url, title: `Source ${n}`, text: Array.from({ length: 80 }, (_, i) => `donnée-${n}-${i}`).join(" "), description: "", product: null, images: [], platform: null } as any;
  });
  const research = await researchProject(loadProject(f.pid), analyzeLocally(input), read);
  expect(research.sources.filter(s => s.status === "consulted")).toHaveLength(10);
  expect(read).toHaveBeenCalledTimes(11);
  expect(research.coverage).toMatchObject({ target: 10, consulted: 10, status: "partial" });
  expect(research.coverage!.missingCategories).toContain("customers");
});
it("source inaccessible : aucun extrait ou état d'étude complète fabriqué", async () => {
  const f = await fixture(), research = await researchProject(loadProject(f.pid), analyzeLocally(f.input), async () => { throw new Error("indisponible"); });
  expect(research.sources.every(s => s.status === "unavailable" && !s.excerpt)).toBe(true);
  expect(research.coverage?.status).toBe("partial"); expect(research.observations).toEqual([]);
});
