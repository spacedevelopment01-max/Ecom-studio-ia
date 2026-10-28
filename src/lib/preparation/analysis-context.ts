/** Données de la fiche réellement envoyées à la compréhension ; aucune proposition ne devient un fait client. */
import type { Fact, Question } from "../project-types";
import type { Brief } from "./types";
import { factTopic, questionTopic } from "./fiche";

export const normalized = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const supplied = (f: Fact) => !f.later && f.source === "user" && f.status === "confirmed" && !!f.value.trim();

/** Une sortie IA ne s'auto-attribue pas la qualité de déclaration client. */
export function reviewGeneratedFact(b: Brief, f: Fact): Fact {
  if (f.status === "unknown") return { ...f, value: "" };
  if (f.status !== "confirmed") return f;
  const value = normalized(f.value);
  const strings = (x: unknown): string[] => typeof x === "string" ? [x] : Array.isArray(x) ? x.flatMap(strings) : x && typeof x === "object" ? Object.values(x).flatMap(strings) : [];
  const input = strings(b.input).map(normalized);
  const known = b.profile.facts.some(x => supplied(x) && normalized(x.value) === value);
  // Une sous-chaîne ne prouve rien : « gratuit » figure aussi dans « devis non gratuit ».
  if (["ai", "photo"].includes(f.source) || (["user", "description"].includes(f.source) && !known && (!value || !input.includes(value))))
    return { ...f, source: ["user", "description"].includes(f.source) ? "ai" : f.source, status: "inferred" };
  return f;
}

export function clientAnalysisContext(b: Brief) {
  return {
    originalInput: b.input,
    contact: { primary: b.services.contactMode, choices: b.services.contactModes ?? [] },
    currentServices: b.services,
    correctedSummary: b.profile.summaryStatus === "provided" ? b.profile.summary : null,
    confirmedByClient: b.profile.facts.filter(supplied),
    clientServices: b.services.services.filter(s => s.source === "client"),
    answeredQuestions: b.profile.questions.filter(q => q.answer?.trim()),
    deferredFacts: b.profile.facts.filter(f => f.later).map(f => ({ ...f, value: "", status: "unknown" as const })),
    deferredQuestions: b.profile.questions.filter(q => q.later && !q.answer?.trim()),
    // Conserver la provenance : ceci est de la matière à vérifier, jamais une nouvelle déclaration du client.
    proposalsAndUnknowns: b.profile.facts.filter(f => !supplied(f) && !f.later),
    previousUnansweredQuestions: b.profile.questions.filter(q => !q.answer?.trim() && !q.later),
  };
}

/** Base des essais : seuls les changements du client la modifient, jamais une nouvelle formulation de l'IA. */
export function clientAttemptContext(b: Brief) {
  const unique = (xs: unknown[]) => [...new Set(xs.map(x => JSON.stringify(x)))].sort();
  const c = clientAnalysisContext(b);
  return {
    summary: c.correctedSummary,
    facts: unique(c.confirmedByClient.map(f => [f.key, f.value, f.topic ?? null])),
    services: unique(c.clientServices.map(s => [s.name, s.description, s.price ?? "", s.duration ?? ""])),
    // La fusion peut rattacher la même réponse à une nouvelle question IA. Ce n'est pas une saisie nouvelle.
    answers: unique(c.answeredQuestions.filter(q => !c.confirmedByClient.some(f => f.value.trim() === q.answer!.trim())).map(q => [questionTopic(q), q.answer!.trim()])),
    deferred: unique([
      ...c.deferredFacts.map(f => [f.key, f.topic ?? null]),
      ...c.deferredQuestions.filter(q => !c.deferredFacts.some(f => samePoint(questionPoint(q), factPoint(f)))).map(q => [q.factKey, questionTopic(q)]),
    ]),
  };
}

type Point = { key: string; label: string; text?: string; topic?: string };
const questionPoint = (q: Question): Point => ({ key: q.factKey, label: q.label ?? "", text: q.question, topic: questionTopic(q) });
const factPoint = (f: Fact): Point => ({ key: f.key, label: f.label, topic: factTopic(f) ?? undefined });

/** Concepts transversaux, pas métiers : une information pour le devis n'est ni son prix ni son délai. */
function concept(p: Point): string | null {
  const text = normalized((p.text || p.label).replace(/\([^)]*\)/g, ""));
  const key = normalized(p.key);
  const all = `${text} ${key}`;
  if (/\b(devis|quote|estimate)\b/.test(all)) {
    const points = [];
    if (/\b(informations?|documents?|besoin|besoins|need|needed|inputs|recueillir)\b/.test(all)) points.push("quote_inputs");
    if (/\b(gratuit|gratuite|gratuitement|free|offert|payant|cout|prix|cost|price)\b/.test(all)) points.push("quote_price");
    if (/\b(delai|delais|duree|duration|timing|turnaround|deadline)\b/.test(all)) points.push("quote_timing");
    if (points.length) return points.join("|");
  }
  if (["request process", "project steps", "process", "workflow"].includes(key) && !p.text) return "process_overview";
  if (["customization", "personnalisation"].includes(key) && !p.text) return "customization_overview";
  if (key === "quote needs" && !p.text) return "quote_inputs";
  // Une précision (prix, durée, quantité, matériaux...) ne doit pas être absorbée par une réponse générale.
  if (/\b(combien|quels materiaux|quelles finitions|how many|how much|how long|how often|which materials|which finishes|when|quand|duree|duration|acompte|acompte[s]?|deposit|payment|paiement|dimensions?|taille|size|quel delai|quel budget)\b/.test(text)) return null;
  if (p.topic === "process" && ((!p.text && /\b(deroulement|etapes|workflow)\b/.test(text)) || /\b(comment se (passe|deroule) (une|la|votre) (demande|projet)|how does .*request.*(work|go)|how does .*project.*(work|go)|du premier contact.*devis|etapes.*(demande|projet|request|project))\b/.test(text))) return "process_overview";
  if (p.topic === "customization" && (/^(qu adaptez vous|que personnalisez vous|comment (adaptez|personnalisez) vous (vos prestations|votre travail|votre offre)) (selon|pour|a) chaque client$/.test(text) || /^(what do you (adapt|customize|tailor) for each (customer|client)|adaptez vous vos prestations a chaque client si oui comment|do you adapt your services to each customer if so how)$/.test(text) || ["personnalisation", "customization", "sur mesure"].includes(text))) return "customization_overview";
  if (p.topic === "services" && /\b(comprend|comprennent|inclus|inclut|travaux|include|included|scope)\b/.test(text)) return "services_scope";
  if (["clientele", "audience", "target audience", "public cible"].includes(text) || (!p.text && ["audience", "target audience", "target customers"].includes(key))) return "audience";
  if (["zone intervention", "zone d intervention", "service area", "intervention area"].includes(text) || (!p.text && ["service area", "intervention area"].includes(key))) return "service_area";
  return null;
}

/** Identité conservatrice : la rubrique seule n'est jamais une preuve d'équivalence. */
function samePoint(a: Point, b: Point) {
  const ca = concept(a), cb = concept(b);
  if (ca && cb) return ca.split("|").every(point => cb.split("|").includes(point));
  if (a.text && ca !== cb && (ca || cb)) return false;
  if (normalized(a.key) && normalized(a.key) === normalized(b.key)) return true;
  const at = normalized(a.text || a.label), bt = normalized(b.text || b.label);
  if (at && at === bt) return true;
  return !!a.label && !!b.label && normalized(a.label) === normalized(b.label);
}

/** Fusion sans nouvel appel : réponses/reports et clés historiques priment sur leurs doublons générés. */
export function reconcileAnalysis(previous: Brief, result: Brief) {
  const ownedFacts = previous.profile.facts.filter(f => supplied(f) || f.later);
  const keptQuestions = previous.profile.questions.filter(q => q.answer?.trim() || q.later);
  const evidence = [
    ...ownedFacts.map(f => ({ point: factPoint(f), answer: supplied(f) ? f.value : undefined, later: !!f.later })),
    ...keptQuestions.map(q => ({ point: questionPoint(q), answer: q.answer, later: !!q.later })),
  ];
  const clientServices = previous.services.services.filter(s => s.source === "client");
  if (previous.services.services.length && clientServices.length === previous.services.services.length && clientServices.every(s => s.description.trim())) {
    evidence.push({ point: { key: "services_scope", label: "", text: "Que comprennent les prestations ?", topic: "services" }, answer: clientServices.map(s => `${s.name} : ${s.description}`).join("\n"), later: false });
  }
  const questions = result.profile.questions.map(q => {
    const prior = evidence.find(e => samePoint(questionPoint(q), e.point));
    if (!prior) return q;
    if (prior.answer?.trim()) return { ...q, answer: prior.answer, later: undefined };
    // Une exigence désormais indispensable redevient ouverte, même si l'ancien point était reporté.
    return prior.later && !q.required ? { ...q, later: true, answer: undefined } : q;
  });
  for (const old of keptQuestions) if (!questions.some(q => samePoint(questionPoint(q), questionPoint(old)))) questions.push(old);
  result.profile.questions = questions;
  const facts: Fact[] = [...ownedFacts];
  for (const f of result.profile.facts) {
    const old = facts.find(o => samePoint(factPoint(f), factPoint(o)) || (normalized(f.value).length >= 20 && normalized(f.value) === normalized(o.value)));
    if (old) continue;
    const deferred = evidence.find(e => e.later && samePoint(factPoint(f), e.point));
    facts.push(deferred ? { ...f, value: "", status: "unknown", source: "user", later: true } : f);
  }
  result.profile.facts = facts;
  return result;
}
