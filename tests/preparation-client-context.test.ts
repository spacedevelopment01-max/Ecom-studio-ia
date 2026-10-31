/** SIMULATIONS : états et composants réels, aucun fournisseur ni donnée client. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { emptyProduct, emptyServiceProfile, type Question } from "@/lib/project-types";
import type { Brief } from "@/lib/preparation/types";
import { applyFicheChange, applyAnswer } from "@/lib/preparation/fiche";
import { clientAnalysisContext, clientAttemptContext, reconcileAnalysis, reviewGeneratedFact } from "@/lib/preparation/analysis-context";
import { BriefFiche } from "@/components/studio/brief-fiche";
import { AnalysisRetry } from "@/components/studio/analysis-retry";

function brief(): Brief {
  const services = { ...emptyServiceProfile(), contactMode: "quote" as const, contactModes: ["quote" as const, "booking" as const], services: [{ name: "Étude", description: "Définir les usages", source: "client" as const }] };
  return { input: { business: "services", offerName: "", brandName: "", description: "Entreprise fictive de services personnalisés.", target: "Particuliers", constraints: "Aucun engagement inventé.", price: "", photoIds: [], referenceUrls: [], services }, services, profile: emptyProduct(), provenance: "simulation", missing: [] };
}
function question(id: string, text: string, topic: Question["topic"], required = false): Question {
  return { id, factKey: `new_${id}`, question: text, topic, required, why: "Information encore absente" };
}
const render = (b: Brief) => renderToStaticMarkup(createElement(BriefFiche, { brief: b, busy: false, send: async () => null, onEditServices: () => {} }));

describe("Contexte client, fusion et réouverture", () => {
  it("une proposition ne s'auto-confirme pas en annonçant source=user", () => {
    expect(reviewGeneratedFact(brief(), { key: "promise", label: "Garantie", value: "Garantie universelle", source: "user", status: "confirmed" })).toMatchObject({ source: "ai", status: "inferred" });
    expect(reviewGeneratedFact(brief(), { key: "unknown", label: "Prix", value: "Inventé", source: "ai", status: "unknown" }).value).toBe("");
    const b = brief(); b.input.description = "Le devis est non gratuit.";
    expect(reviewGeneratedFact(b, { key: "free", label: "Gratuité", value: "Gratuit", source: "user", status: "confirmed" }).status).toBe("inferred");
    expect(reviewGeneratedFact(b, { key: "target", label: "Public", value: b.input.target, source: "user", status: "confirmed" }).status).toBe("confirmed");
  });
  it("distingue les deux parcours de réponse, corrections, contacts, reports et propositions", () => {
    const b = brief();
    applyFicheChange(b, { kind: "fact", key: "request_process", label: "Déroulement", topic: "process", value: "Échange, étude puis devis à valider." });
    applyFicheChange(b, { kind: "summary", value: "Présentation corrigée par le client." });
    b.profile.questions.push(question("usage", "Quel usage ?", "activity"), question("delay", "Quel délai pour le devis ?", "quote"));
    applyAnswer(b, "usage", { answer: "Préparer un projet personnel." });
    applyAnswer(b, "delay", { later: true });
    b.profile.facts.push({ key: "proposal", label: "Suggestion", value: "Promesse non confirmée", status: "inferred", source: "ai" });
    const c = clientAnalysisContext(JSON.parse(JSON.stringify(b)));
    expect(c.confirmedByClient.map(f => f.value)).toContain("Échange, étude puis devis à valider.");
    expect(c.answeredQuestions[0].answer).toBe("Préparer un projet personnel.");
    expect(c.correctedSummary).toBe("Présentation corrigée par le client.");
    expect(c.contact).toEqual({ primary: "quote", choices: ["quote", "booking"] });
    expect(c.deferredFacts[0]).toMatchObject({ status: "unknown", value: "", later: true });
    expect(c.confirmedByClient.some(f => f.key === "proposal")).toBe(false);
    expect(c.proposalsAndUnknowns.some(f => f.key === "proposal")).toBe(true);
  });

  it.each(["Cuisine sur mesure", "Séances de conversation", "Entretien d'instruments"])("%s : anciennes réponses guidées sous de nouvelles clés, vraie précision conservée", (name) => {
    const b = brief(); b.input.description = name;
    applyFicheChange(b, { kind: "fact", key: "customization", label: "Personnalisation", topic: "customization", value: "Selon les usages, besoins et budget du client." });
    applyFicheChange(b, { kind: "fact", key: "request_process", label: "Déroulement", topic: "process", value: "Échange, informations et photos, proposition puis devis." });
    applyFicheChange(b, { kind: "later", key: "old_free", label: "Gratuité du devis", topic: "quote" });
    applyFicheChange(b, { kind: "later", key: "old_delay", label: "Délai du devis", topic: "quote" });
    const result = brief();
    result.profile.questions = [question("custom", "Qu’adaptez-vous selon chaque client (par exemple les matériaux et finitions) ?", "customization"), question("process", "Comment se passe une demande, du premier contact jusqu’au devis ?", "process"), question("inputs", "De quelles informations avez-vous besoin pour établir un devis ?", "quote"), question("detail", "Quels matériaux proposez-vous ?", "customization")];
    result.profile.facts = [{ key: "new_free", label: "Devis gratuit", status: "confirmed", source: "ai", value: "Oui", topic: "quote" }];
    const reopened = JSON.parse(JSON.stringify(reconcileAnalysis(b, result))) as Brief;
    expect(clientAttemptContext(reopened)).toEqual(clientAttemptContext(b));
    expect(reopened.profile.questions.find(q => q.id === "process")?.answer).toBe("Échange, informations et photos, proposition puis devis.");
    expect(reopened.profile.questions.find(q => q.id === "custom")?.answer).toContain("budget");
    expect(reopened.profile.questions.find(q => q.id === "inputs")).not.toHaveProperty("answer");
    const html = render(reopened);
    expect(html).not.toContain('data-fiche-question="process"');
    expect(html).not.toContain('data-fiche-question="custom"');
    expect(html).toContain('data-fiche-question="inputs"');
    expect(html).toContain('data-fiche-question="detail"');
    expect(reopened.profile.facts.filter(f => /gratuit/i.test(f.label))).toHaveLength(1);
    expect(reopened.profile.facts.find(f => f.key === "old_free")).toMatchObject({ value: "", status: "unknown", later: true });
    expect(html).toContain("À préciser plus tard");
  });

  it("une exigence indispensable n'hérite pas du report et une précision du même thème reste ouverte", () => {
    const b = brief(); applyFicheChange(b, { kind: "later", key: "delay_old", label: "Délai du devis", topic: "quote" });
    const next = brief(); next.profile.questions = [question("delay_new", "Quel délai pour un devis ?", "quote", true), question("documents", "Quels documents pour établir le devis ?", "quote")];
    const r = reconcileAnalysis(b, next);
    expect(r.profile.questions.every(q => !q.answer && !q.later)).toBe(true);
    expect(render(r)).toContain('data-fiche-question="delay_new"');
  });

  it("un ancien report groupé conserve les deux inconnues, pas la nouvelle collecte d'informations", () => {
    const b = brief(); applyFicheChange(b, { kind: "later", key: "legacy_17", label: "Gratuité du devis et délais", topic: "quote" });
    const next = brief(); next.profile.questions = [question("fee", "Le devis est-il gratuit ?", "quote"), question("time", "Quel délai pour le devis ?", "quote"), question("docs", "Quelles informations pour le devis ?", "quote")];
    const r = reconcileAnalysis(b, next);
    expect(r.profile.questions.filter(q => q.later).map(q => q.id)).toEqual(["fee", "time"]);
    expect(r.profile.questions.find(q => q.id === "docs")?.later).not.toBe(true);
    expect(r.profile.facts[0]).toMatchObject({ status: "unknown", value: "", later: true });
  });

  it("ne remplit pas une question précise de processus/personnalisation avec une réponse générale", () => {
    const b = brief();
    applyFicheChange(b, { kind: "fact", key: "request_process", label: "Déroulement", topic: "process", value: "Échange puis étude et devis." });
    applyFicheChange(b, { kind: "fact", key: "customization", label: "Personnalisation", topic: "customization", value: "Selon les usages du client." });
    const next = brief(); next.profile.questions = [question("payment", "Comment organisez-vous les acomptes ?", "process"), question("time", "How long does a request take?", "process"), question("size", "Comment adaptez-vous la taille de chaque article ?", "customization")];
    const r = reconcileAnalysis(b, next);
    expect(r.profile.questions.every(q => !q.answer && !q.later)).toBe(true);
    for (const id of ["payment", "time", "size"]) expect(render(r)).toContain(`data-fiche-question="${id}"`);
  });

  it("une nouvelle formulation IA seule ne modifie pas la base des tentatives ; une vraie réponse oui", () => {
    const b = brief(), before = clientAttemptContext(b);
    b.profile.questions.push(question("new", "Quel usage ?", "activity"));
    b.profile.facts.push({ key: "guess", label: "Suggestion", value: "À vérifier", status: "inferred", source: "ai" });
    expect(clientAttemptContext(b)).toEqual(before);
    applyAnswer(b, "new", { answer: "Usage quotidien à domicile." });
    expect(clientAttemptContext(b)).not.toEqual(before);
  });
});

describe("Précontrôle effectivement rendu près du bouton", () => {
  it("explique la preuve historique manquante sans inviter à contourner le compteur", () => {
    const html = renderToStaticMarkup(createElement(AnalysisRetry, { business: "services", attempts: 2, historyIncomplete: true, correction: "Correction renseignée.", disabled: false, onCorrection: () => {}, onAnalyze: () => {} }));
    expect(html).toContain("une preuve historique manque");
    expect(html).toContain("vos acquis et votre budget restent conservés");
    expect(html).not.toContain("Modifiez réellement votre fiche");
    expect(html).toMatch(/<button[^>]*\sdisabled=""/);
  });
  const renderRetry = (attempts: number, correction: string, disabled = false) => renderToStaticMarkup(createElement(AnalysisRetry, { business: "services", attempts, correction, disabled, onCorrection: () => {}, onAnalyze: () => {} }));
  it("autorise la première demande, exige la correction avant le second devis et bloque le troisième", () => {
    expect(renderRetry(0, "")).not.toMatch(/<button[^>]*\sdisabled=""/);
    expect(renderRetry(1, "")).toMatch(/<button[^>]*\sdisabled=""/);
    expect(renderRetry(1, "")).toContain("avant de voir le devis");
    expect(renderRetry(1, "Préserver les réponses.")).not.toMatch(/<button[^>]*\sdisabled=""/);
    expect(renderRetry(2, "Une autre correction.")).toMatch(/<button[^>]*\sdisabled=""/);
    expect(renderRetry(2, "Une autre correction.")).toContain("ne remet pas le compteur à zéro");
    expect(renderRetry(0, "", true)).toMatch(/<button[^>]*\sdisabled=""/);
  });
});
