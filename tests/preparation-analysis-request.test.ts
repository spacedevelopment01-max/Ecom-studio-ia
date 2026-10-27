/** SIMULATION des appels uniquement : vraie route, devis, tâche, adaptateur, SQLite et sauvegarde. */
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const calls = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai/llm", async original => ({ ...await original<object>(), llmJson: calls }));
vi.mock("@/lib/preparation/evidence", async original => ({ ...await original<object>(), apiEvidence: () => ({ provider: "simulation", model: "fake-served", at: 1, usageKey: "fixture" }) }));
import { fixture, initializeSynthetic, simulatedDependencies } from "./preparation-fixtures";
import { initialize, editBriefFiche, answerBriefQuestion, queuePreparation, runPreparation, requestHash, stateOf } from "@/lib/preparation/engine";
import { commitState } from "@/lib/preparation/store";
import { analysisCostPlan, inspectBrief } from "@/lib/preparation/inspect";
import { analysisAttempts } from "@/lib/preparation/analysis-attempts";
import { createQuote, quoteOf } from "@/lib/preparation/quote";
import { loadProject, remember } from "@/lib/projects";
import { clientAnalysisContext } from "@/lib/preparation/analysis-context";
import { productAnalysisRequest, serviceAnalysisRequest } from "@/lib/ai/tasks";
import { emptyServiceProfile } from "@/lib/project-types";
import { all, run } from "@/lib/db";
import { enqueue, JobContext } from "@/lib/jobs";
import { runForUser } from "@/lib/ai/access";
import { runWithLang } from "@/lib/i18n-server";
const fr = <T>(fn: () => T) => runWithLang({ ui: "fr", content: "fr" }, fn);
let key: string | undefined;
beforeEach(() => { key = process.env.ANTHROPIC_API_KEY; process.env.ANTHROPIC_API_KEY = "fake-key-never-sent"; calls.mockReset(); });
afterEach(() => { if (key === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = key; });

it.each(["services", "products"] as const)("%s : contexte complet et correction du devis jusqu'à la requête et au résultat sauvegardé", async business => {
  const f = await fixture(business); f.input.photoIds = [];
  initializeSynthetic(f.pid, f.input);
  const state = () => stateOf(f.pid)!;
  editBriefFiche(f.pid, state().revision, { kind: "summary", value: "Résumé corrigé fidèlement par le client." });
  editBriefFiche(f.pid, state().revision, { kind: "fact", key: "request_process", label: "Déroulement", topic: "process", value: "Premier échange puis étude et devis à valider." });
  editBriefFiche(f.pid, state().revision, { kind: "later", key: "quote_price", label: "Gratuité du devis", topic: "quote" });
  commitState(f.pid, state().revision, n => { n.stages.brief!.data.profile.questions.push({ id: "existing", factKey: "usage", question: "Quel usage ?", why: "Préciser", required: false }); });
  answerBriefQuestion(f.pid, state().revision, "existing", "Utilisation à domicile uniquement.");
  const b = structuredClone(state().stages.brief!.data), correction = "Préserver les réponses et ne demander que les informations encore absentes.";
  const p = loadProject(f.pid);
  const before = fr(() => analysisCostPlan(p, b))!, plan = fr(() => analysisCostPlan(p, b, correction))!;
  expect(plan.maxMicro).toBeGreaterThan(before.maxMicro);
  expect(plan.fingerprint).not.toBe(before.fingerprint);
  const q = fr(() => createQuote(f.pid, "brief", "analyze", undefined, correction));
  const stored = fr(() => quoteOf(f.pid, q.id, correction));
  expect(stored.capMicro).toBe(plan.maxMicro);
  expect(stored.analysisFingerprint).toBe(plan.fingerprint);
  expect(() => fr(() => quoteOf(f.pid, q.id, correction + " Modifiée."))).toThrow(/correction a changé/);
  const common = { description: [b.input.description, "", `Cible indiquée : ${b.input.target}`, `Consignes exactes : ${b.input.constraints}`, `Réponses déjà données par le client (à préserver) : ${JSON.stringify(b.profile.questions.filter(q => q.answer?.trim()))}`].join("\n"), link: null, clientContext: clientAnalysisContext(b), correction, providedName: b.input.offerName, providedBrand: b.input.brandName };
  const req = fr(() => business === "services" ? serviceAnalysisRequest({ ...common, known: b.input.services, photoCount: 0 }) : productAnalysisRequest({ ...common, price: b.input.price, colors: "" }));
  calls.mockResolvedValue({ name: "Suggestion", nameStatus: "proposed", category: "Offre", sector: null, summary: "Résumé suggéré", facts: [], questions: [], claimsToAvoid: [], services: [], area: "", address: "", phone: "", email: "", hours: "", bookingUrl: "", contactMode: "unknown", visual: {}, variants: [] });
  const queued = fr(() => queuePreparation(f.pid, state().revision, "brief", "analyze", { capMicro: stored.capMicro, paid: true, correction: stored.correction, analysisFingerprint: stored.analysisFingerprint }));
  await fr(() => runForUser(f.uid, () => runPreparation(new JobContext(queued.job!)), "normal", f.pid));
  expect(calls).toHaveBeenCalledTimes(1);
  expect(calls.mock.calls[0][0]).toMatchObject(req);
  const reopened = state().stages.brief!.data;
  expect(reopened.profile.summary).toBe(b.profile.summary);
  expect(reopened.profile.facts).toContainEqual(expect.objectContaining({ key: "request_process", value: "Premier échange puis étude et devis à valider.", source: "user" }));
  expect(reopened.profile.facts).toContainEqual(expect.objectContaining({ key: "quote_price", status: "unknown", value: "", later: true }));
  expect(all("SELECT id FROM ai_calls WHERE project_id=?", f.pid)).toHaveLength(0);
  editBriefFiche(f.pid, state().revision, { kind: "summary", value: "Nouvelle correction locale, sans génération." });
  expect(calls).toHaveBeenCalledTimes(1);
});

it("les deux anciens essais restent comptés malgré la migration ; la correction ne réinitialise rien", async () => {
  const f = await fixture("services"); initializeSynthetic(f.pid, f.input);
  const state = () => stateOf(f.pid)!;
  const hash = requestHash(state(), "brief", "analyze");
  for (let i = 0; i < 2; i++) {
    if (i) editBriefFiche(f.pid, state().revision, { kind: "fact", key: "customization", label: "Personnalisation", topic: "customization", value: "Étude selon chaque besoin." });
    const job = enqueue({ userId: f.uid, projectId: f.pid, type: "project.prepare", payload: { action: "analyze", inputHash: hash, revision: state().revision } });
    run("UPDATE jobs SET status='done',result=? WHERE id=?", JSON.stringify({ revision: state().revision }), job.id);
  }
  expect(analysisAttempts(f.pid, state().stages.brief!.data, hash).attempts).toBe(2);
  expect(() => fr(() => createQuote(f.pid, "brief", "analyze", undefined, "Nouvelle correction seulement."))).toThrow(/Deux essais/);
  expect(() => queuePreparation(f.pid, state().revision, "brief", "analyze", { paid: false, capMicro: 0, correction: "Autre correction." })).toThrow(/Deux essais/);
  expect(calls).not.toHaveBeenCalled();
  editBriefFiche(f.pid, state().revision, { kind: "fact", key: "quote_needs", label: "Informations pour le devis", topic: "quote", value: "Photos, dimensions et usages." });
  expect(analysisAttempts(f.pid, state().stages.brief!.data, hash).attempts).toBe(0);
});

it("les anciens faits reformulés par l'IA après chaque analyse ne rendent pas un troisième essai disponible", async () => {
  const f = await fixture("services"); initializeSynthetic(f.pid, f.input);
  const state = () => stateOf(f.pid)!;
  const hash = requestHash(state(), "brief", "analyze");
  for (let i = 0; i < 2; i++) {
    const j = enqueue({ userId: f.uid, projectId: f.pid, type: "project.prepare", payload: { action: "analyze", inputHash: hash, revision: state().revision } });
    const result = commitState(f.pid, state().revision, s => {
      // Ancienne version : le modèle pouvait annoncer source=user. Ce n'est pas une nouvelle saisie client.
      s.stages.brief!.data.profile.facts.push({ key: `legacy_generated_${i}`, label: "Clientèle reformulée", value: "Petites entreprises locales", status: "confirmed", source: "user" });
    });
    run("UPDATE jobs SET status='done',result=? WHERE id=?", JSON.stringify({ revision: result.revision }), j.id);
  }
  expect(analysisAttempts(f.pid, state().stages.brief!.data, hash).attempts).toBe(2);
  expect(() => fr(() => createQuote(f.pid, "brief", "analyze", undefined, "Préserver les réponses."))).toThrow(/Deux essais/);
  expect(calls).not.toHaveBeenCalled();
});

it.each(["result", "checkpoint"])("les nouvelles tâches relient leurs entrées/sorties sur deux analyses (%s), sans remise à zéro", async receipt => {
  const f = await fixture("services"); initializeSynthetic(f.pid, f.input);
  const state = () => stateOf(f.pid)!;
  for (let i = 0; i < 2; i++) {
    const queued = queuePreparation(f.pid, state().revision, "brief", "analyze", { paid: false, capMicro: 0, correction: i ? "Préciser uniquement les informations absentes." : undefined });
    const result = await runForUser(f.uid, () => runPreparation(new JobContext(queued.job!), {
      ...simulatedDependencies,
      async inspect(_p, b) {
        const next = structuredClone(b);
        next.profile.facts.push({ key: `renamed_${i}`, label: "Clientèle reformulée", value: "Public déclaré", source: "user", status: "confirmed" });
        return next;
      },
    }), "normal", f.pid);
    run("UPDATE jobs SET status=?,result=? WHERE id=?", receipt === "result" ? "done" : "failed", receipt === "result" ? JSON.stringify(result) : null, queued.job!.id);
    expect(analysisAttempts(f.pid, state().stages.brief!.data, requestHash(state(), "brief", "analyze")).attempts).toBe(i + 1);
  }
  expect(() => queuePreparation(f.pid, state().revision, "brief", "analyze", { paid: false, capMicro: 0, correction: "Une troisième reformulation." })).toThrow(/Deux essais/);
  editBriefFiche(f.pid, state().revision, { kind: "fact", key: "quote_needs", label: "Informations pour le devis", topic: "quote", value: "Dimensions et documents à fournir." });
  expect(analysisAttempts(f.pid, state().stages.brief!.data, requestHash(state(), "brief", "analyze")).attempts).toBe(0);
  expect(calls).not.toHaveBeenCalled();
});

it("une preuve de résultat historique absente conserve le compteur de l'ancien brief", async () => {
  const f = await fixture("services"); initializeSynthetic(f.pid, f.input);
  const state = () => stateOf(f.pid)!;
  for (let i = 0; i < 2; i++) {
    const j = enqueue({ userId: f.uid, projectId: f.pid, type: "project.prepare", payload: { action: "analyze", inputHash: requestHash(state(), "brief", "analyze"), revision: state().revision } });
    run("UPDATE jobs SET status='done',result=? WHERE id=?", JSON.stringify({ revision: 999999 }), j.id);
  }
  editBriefFiche(f.pid, state().revision, { kind: "fact", key: "process", label: "Déroulement", topic: "process", value: "Étude avant devis." });
  expect(analysisAttempts(f.pid, state().stages.brief!.data, requestHash(state(), "brief", "analyze")).attempts).toBe(2);
  expect(() => fr(() => createQuote(f.pid, "brief", "analyze", undefined, "Revoir les questions."))).toThrow(/preuve historique manque/);
  expect(calls).not.toHaveBeenCalled();
});

it("la correction exigée est refusée avant le devis et l'envoi ; les tarifs changés invalident un devis", async () => {
  const f = await fixture("services"); initializeSynthetic(f.pid, f.input);
  const state = () => stateOf(f.pid)!;
  const j = queuePreparation(f.pid, state().revision, "brief", "analyze", { paid: false, capMicro: 0 }).job!;
  run("UPDATE jobs SET status='failed' WHERE id=?", j.id);
  expect(() => fr(() => createQuote(f.pid, "brief", "analyze"))).toThrow(/Décrivez le défaut/);
  const correction = "Ne pas redemander les réponses.";
  const q = fr(() => createQuote(f.pid, "brief", "analyze", undefined, correction));
  const stored = fr(() => quoteOf(f.pid, q.id, correction));
  remember(f.pid, { kind: "artifact", key: `preparation.quote.${q.id}`, value: JSON.stringify({ ...stored, analysisFingerprint: "stale" }), source: "local" });
  expect(() => fr(() => quoteOf(f.pid, q.id, correction))).toThrow(/route ont changé/);
  expect(calls).not.toHaveBeenCalled();
});

it("un ancien devis sans demande liée ne paie pas le nouveau contexte ; un checkpoint acquis reste récupérable", async () => {
  for (const cached of [false, true]) {
    const f = await fixture("services"); initializeSynthetic(f.pid, f.input);
    const s = stateOf(f.pid)!;
    const q = queuePreparation(f.pid, s.revision, "brief", "analyze", { paid: true, capMicro: 123456 });
    const ctx = new JobContext(q.job!);
    if (cached) await ctx.step(`prepare:analyze:${requestHash(s, "brief", "analyze")}`, async () => structuredClone(s.stages.brief!.data));
    const inspect = vi.fn(inspectBrief), deps = { ...simulatedDependencies, simulation: false, inspect };
    const result = fr(() => runForUser(f.uid, () => runPreparation(ctx, deps), "normal", f.pid));
    if (cached) await expect(result).resolves.toHaveProperty("action", "analyze");
    else await expect(result).rejects.toThrow(/ancien devis/);
    expect(inspect).not.toHaveBeenCalled();
  }
  expect(calls).not.toHaveBeenCalled();
});

it("sources manquantes, étrangères ou trop nombreuses sont refusées avant le devis", async () => {
  for (const kind of ["empty", "foreign", "many"] as const) {
    const f = await fixture("services");
    if (kind === "empty") Object.assign(f.input, { description: "", photoIds: [], services: emptyServiceProfile() });
    if (kind === "foreign") f.input.photoIds = ["photo-not-owned"];
    if (kind === "many") f.input.photoIds = Array.from({ length: 13 }, () => f.input.photoIds[0]);
    initializeSynthetic(f.pid, f.input);
    expect(() => fr(() => createQuote(f.pid, "brief", "analyze"))).toThrow(kind === "empty" ? /Décrivez votre offre/ : kind === "foreign" ? /Photo originale/ : /douze photos/);
    expect(all("SELECT id FROM jobs WHERE project_id=?", f.pid)).toHaveLength(0);
  }
  expect(calls).not.toHaveBeenCalled();
});
