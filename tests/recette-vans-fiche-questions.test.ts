/** Régressions de la fiche guidée (moteur de préparation) : ne pas reposer une question déjà couverte, sans appel IA. */
import { describe, expect, it } from "vitest";
import { applyAnswer, GUIDED, needsGuidedQuestion } from "@/lib/preparation/fiche";
import type { Brief } from "@/lib/preparation/types";
import { emptyProduct, emptyServiceProfile, type Fact, type Question } from "@/lib/project-types";

function fixture(questions: Question[] = [], facts: Fact[] = []): Brief {
  const services = emptyServiceProfile();
  return {
    input: { business: "services", offerName: "", brandName: "", description: "Un atelier de services.", target: "Particuliers", constraints: "", photoIds: [], referenceUrls: [], price: "", services },
    profile: { ...emptyProduct(), summary: "Présentation de l'activité.", questions, facts },
    services,
    missing: [],
    provenance: "simulation",
  };
}

/** Questions de l'analyse encore à poser : ni répondues, ni reportées. */
const open = (b: Brief) => b.profile.questions.filter((q) => !q.answer && !q.later).map((q) => q.id);

const question = (g: (typeof GUIDED)[number]): Question => ({
  id: `question_${g.topic}`,
  question: g.prompt[0],
  why: "Compléter cette rubrique.",
  required: false,
  factKey: `chosen_by_analysis_${g.topic}`,
  topic: g.topic,
  label: g.label[0],
});

describe.each(GUIDED)("Questions de la rubrique $topic", (g) => {
  it("ne repose pas une question répondue sous une autre clé, y compris après réouverture", () => {
    const q = question(g);
    const b = fixture([q]);
    const answer = "Premier échange puis étude personnalisée du besoin.";
    applyAnswer(b, q.id, { answer });
    const reopened = JSON.parse(JSON.stringify(b)) as Brief;
    expect(reopened.profile.facts[0]).toMatchObject({ key: q.factKey, value: answer, status: "confirmed" });
    expect(needsGuidedQuestion(reopened, g)).toBe(false);
    expect(open(reopened)).toEqual([]);
  });

  it("respecte le report d'une question de l'analyse sous une autre clé", () => {
    const q = question(g);
    const b = fixture([q]);
    applyAnswer(b, q.id, { later: true });
    const reopened = JSON.parse(JSON.stringify(b)) as Brief;
    expect(reopened.profile.facts[0]).toMatchObject({ status: "unknown", value: "", later: true });
    expect(needsGuidedQuestion(reopened, g)).toBe(false);
    expect(open(reopened)).toEqual([]);
  });

  it("ne duplique pas une question de l'analyse encore ouverte", () => {
    const q = question(g);
    const b = fixture([q]);
    expect(needsGuidedQuestion(b, g)).toBe(false);
    expect(open(b)).toEqual([q.id]);
  });

  it("conserve une question guidée pour une rubrique réellement inconnue", () => {
    const b = fixture([], [{ key: `missing_${g.topic}`, label: g.label[0], value: "", status: "unknown", source: "ai", topic: g.topic }]);
    expect(needsGuidedQuestion(b, g)).toBe(true);
  });
});

describe("Informations déjà présentes et portée de la rubrique", () => {
  const process = GUIDED.find((g) => g.topic === "process")!;

  it.each(["confirmed", "inferred"] as const)("ne redemande pas une information %s explicitement rattachée au déroulement", (status) => {
    const b = fixture([], [{ key: "project_steps", label: "Déroulement", value: "Échange, étude puis devis.", status, source: status === "confirmed" ? "user" : "ai", topic: "process" }]);
    expect(needsGuidedQuestion(b, process)).toBe(false);
    expect(b.profile.facts[0]).toMatchObject({ value: "Échange, étude puis devis.", status });
  });

  it("reconnaît une ancienne question répondue sans rubrique explicite", () => {
    const b = fixture([{ id: "old_steps", question: "Comment se déroule une demande ?", why: "", required: false, factKey: "project_steps", answer: "Premier échange puis étude." }]);
    expect(needsGuidedQuestion(b, process)).toBe(false);
  });

  it("un point reporté sous une autre clé ne réapparaît pas comme nouvelle question", () => {
    const b = fixture([], [{ key: "project_steps", label: "Déroulement", value: "", status: "unknown", source: "user", topic: "process", later: true }]);
    expect(needsGuidedQuestion(b, process)).toBe(false);
  });

  it("une réponse sur le déroulement ne supprime pas les autres sujets encore inconnus", () => {
    const b = fixture([question(process)]);
    applyAnswer(b, b.profile.questions[0].id, { answer: "Premier échange puis étude." });
    for (const g of GUIDED.filter((g) => g.topic !== "process")) expect(needsGuidedQuestion(b, g)).toBe(true);
  });

  it("un ancien fait sur la gratuité du devis ne remplace pas les informations à recueillir pour un devis", () => {
    const quote = GUIDED.find((g) => g.topic === "quote")!;
    const b = fixture([], [{ key: "free_quote", label: "Devis gratuit", value: "Oui", status: "confirmed", source: "user" }]);
    expect(needsGuidedQuestion(b, quote)).toBe(true);
  });
});
