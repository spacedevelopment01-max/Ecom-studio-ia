/**
 * Fiche d'activité de l'étape 1 (#204) : le brief structuré qu'un client novice complète en répondant à des questions
 * courtes. Chaque réponse est rangée dans sa rubrique (présentation, prestations, personnalisation, déroulement, devis),
 * sans nouvel appel IA ; les coordonnées pratiques peuvent attendre les étapes de livraison. Module sans dépendance
 * serveur : l'interface s'en sert pour afficher les mêmes rubriques et les mêmes états.
 */
import type { BriefTopic, Fact, Question, ServiceItem } from "../project-types";
import type { Brief } from "./types";

/** Prestations introuvables dans la description : question précise, rien n'est inventé. */
export const SERVICES_UNKNOWN = "Quelles prestations proposez-vous ? L’analyse n’a pas pu les identifier dans votre description : ajoutez-les dans « Vos prestations et votre contact ».";
export const TARGET_UNKNOWN = "À qui cette offre s’adresse-t-elle ?";

/** Coordonnées, horaires, adresse ou lien de réservation : utiles au futur site, pas à la compréhension de l'offre. */
const PRACTICAL = /t[ée]l[ée]phone|num[ée]ro|e-?mail|courriel|horaire|adresse|coordonn[ée]e|lien de (r[ée]servation|rendez-vous)|calendly|phone|email|opening hours|\bhours\b|address|booking|contact details/i;
const BY_TOPIC: [Exclude<BriefTopic, "practical" | "activity">, RegExp][] = [
  ["process", /d[ée]roul|[ée]tapes?\b|premier (contact|[ée]change)|du contact au|process|steps?\b|how .* (go|work)/i],
  ["quote", /devis|chiffr|estimation|quote|estimate/i],
  ["customization", /sur[- ]mesure|personnalis|adapt|custom|tailor/i],
  ["services", /prestation|travaux|r[ée]alisez|proposez|comprend|services?\b|work you do|include/i],
];
const KEY_TOPIC: [BriefTopic, RegExp][] = [
  ["practical", /phone|email|mail|hours|horaire|address|adresse|booking|contact_?(details|info)/i],
  ["process", /process|deroul|steps|workflow/i],
  ["quote", /quote|devis|estimate/i],
  ["customization", /custom|personnal|sur_?mesure|tailor/i],
  ["services", /service|prestation|scope|works?$|travaux/i],
];

/** Rubrique d'une question : celle annoncée par l'analyse, sinon déduite du texte (analyses antérieures à #204). */
export function questionTopic(q: Pick<Question, "topic" | "question" | "factKey">): BriefTopic {
  const text = `${q.question} ${q.factKey}`;
  // Une question qui demande des coordonnées reste pratique, même si l'analyse l'a rangée ailleurs.
  if (PRACTICAL.test(q.question)) return "practical";
  if (q.topic) return q.topic;
  return BY_TOPIC.find(([, re]) => re.test(text))?.[0] ?? "activity";
}
/** Rubrique d'un fait : annoncée, sinon déduite de sa clé ; null pour les autres points à confirmer. */
export function factTopic(f: Pick<Fact, "topic" | "key">): BriefTopic | null {
  return f.topic ?? KEY_TOPIC.find(([, re]) => re.test(f.key))?.[0] ?? null;
}

/** État affiché au client, sans statut technique : fourni par lui, proposition à vérifier, ou à compléter. */
export type FicheState = "provided" | "check" | "unknown" | "later";
export function factState(f: Pick<Fact, "status" | "source" | "later" | "value">): FicheState {
  if (f.later && f.status !== "confirmed") return "later";
  if (f.status === "unknown" || !f.value.trim()) return "unknown";
  if (f.status === "confirmed" && ["user", "description", "link"].includes(f.source)) return "provided";
  return "check";
}
export const STATE_LABEL: Record<FicheState, [string, string]> = {
  provided: ["Fourni par vous", "Provided by you"],
  check: ["À vérifier", "To check"],
  unknown: ["À compléter", "To complete"],
  later: ["À préciser plus tard", "To specify later"],
};

/** Rubriques guidées de la fiche : question courte proposée quand l'analyse n'a rien demandé ni trouvé à ce sujet. */
export const GUIDED: { topic: "customization" | "process" | "quote"; key: string; label: [string, string]; prompt: [string, string] }[] = [
  {
    topic: "customization",
    key: "customization",
    label: ["Personnalisation", "Customization"],
    prompt: ["Adaptez-vous vos prestations à chaque client ? Si oui, comment ?", "Do you adapt your services to each customer? If so, how?"],
  },
  {
    topic: "process",
    key: "request_process",
    label: ["Déroulement d’une demande", "How a request works"],
    prompt: ["Comment se passe une demande, du premier contact jusqu’au devis ?", "How does a request go, from first contact to the quote?"],
  },
  {
    topic: "quote",
    key: "quote_needs",
    label: ["Informations utiles pour le devis", "Information needed for a quote"],
    prompt: ["De quelles informations avez-vous besoin pour établir un devis ?", "What information do you need to prepare a quote?"],
  },
];
export const TOPIC_LABEL: Record<BriefTopic, [string, string]> = {
  activity: ["Présentation de l’activité", "About the business"],
  services: ["Prestations", "Services"],
  customization: ["Personnalisation", "Customization"],
  process: ["Déroulement d’une demande", "How a request works"],
  quote: ["Informations utiles pour le devis", "Information needed for a quote"],
  practical: ["Coordonnées pour le futur site", "Contact details for the future site"],
};

const analyzedOnce = (b: Brief) => b.provenance === "provider" || b.provenance === "simulation";
/** Une question bloque la validation seulement si elle est indispensable à la compréhension de l'offre. */
export const blocking = (q: Question) => q.required && questionTopic(q) !== "practical" && !q.answer?.trim();

/**
 * Points qui empêchent encore de valider la compréhension, recalculés depuis les données (jamais un ancien message
 * figé) : nom d'un produit, cible, prestations d'un service, questions indispensables. Coordonnées, horaires, adresse,
 * nom commercial et logo ne bloquent pas cette étape.
 */
export function briefMissing(b: Brief): string[] {
  const input = b.input;
  const services = input.business === "services";
  const out: string[] = [];
  if (analyzedOnce(b)) out.push(...b.profile.questions.filter(blocking).map((q) => q.question));
  if (!services && (!b.profile.name.trim() || b.profile.nameStatus === "unknown"))
    out.push(analyzedOnce(b) ? "Précisez le nom de cette offre." : "Précisez le nom du produit ou de l’activité.");
  if (!analyzedOnce(b) && !input.description.trim()) out.push("Décrivez ce qui est proposé ; une photo seule ne confirme pas les caractéristiques.");
  if (!input.target.trim()) out.push(TARGET_UNKNOWN);
  if (services && analyzedOnce(b) && !b.services.services.length) out.push(SERVICES_UNKNOWN);
  return [...new Set(out)];
}

/**
 * Remet un brief non validé à jour des règles actuelles à sa lecture : les points bloquants sont recalculés (ancien
 * « Indiquez au moins une prestation », coordonnées exigées trop tôt). Analyse, réponses, versions et décisions sont
 * conservées telles quelles ; un brief validé n'est jamais modifié.
 */
export function refreshBrief(b: Brief, approved: boolean): Brief {
  if (approved) return b;
  const missing = briefMissing(b);
  return JSON.stringify(missing) === JSON.stringify(b.missing) ? b : { ...b, missing };
}

function upsertFact(b: Brief, f: Fact) {
  const existing = b.profile.facts.find((x) => x.key === f.key);
  if (existing) Object.assign(existing, f);
  else b.profile.facts.push(f);
}

export type AnswerItem = { name: string; detail: string };
/**
 * Réponse à une question de la fiche, sans appel IA. Elle complète la rubrique concernée : un fait confirmé à
 * l'intitulé lisible, et pour les prestations, la description de chaque prestation nommée par le client.
 * « À préciser plus tard » garde le point explicitement inconnu ; une question indispensable ne peut pas être reportée.
 */
export function applyAnswer(b: Brief, questionId: string, a: { answer?: string; later?: boolean; items?: AnswerItem[] }) {
  const q = b.profile.questions.find((x) => x.id === questionId);
  if (!q) throw new Error("Question introuvable.");
  const topic = questionTopic(q);
  const label = q.label?.trim() || q.question;
  if (a.later) {
    if (blocking(q)) throw new Error("Cette question est nécessaire pour comprendre votre activité : répondez-y en quelques mots.");
    q.later = true;
    delete q.answer;
    const existing = b.profile.facts.find((f) => f.key === q.factKey);
    if (!existing || existing.status !== "confirmed") upsertFact(b, { key: q.factKey, label, value: "", status: "unknown", source: "user", topic, later: true });
    return;
  }
  const items = (a.items ?? []).map((x) => ({ name: x.name.trim(), detail: x.detail.trim() })).filter((x) => x.name && x.detail);
  const text = items.length ? items.map((x) => `${x.name} : ${x.detail}`).join("\n") : (a.answer ?? "").trim();
  if (!text) throw new Error("Réponse explicite requise.");
  q.answer = text;
  delete q.later;
  upsertFact(b, { key: q.factKey, label, value: text, status: "confirmed", source: "user", topic });
  for (const item of items) {
    const found = b.services.services.find((s) => s.name.trim().toLowerCase() === item.name.toLowerCase());
    if (found) Object.assign(found, { description: item.detail, source: "client" } satisfies Partial<ServiceItem>);
    else b.services.services.push({ name: item.name, description: item.detail, source: "client" });
  }
}

export type FicheChange =
  | { kind: "summary"; value: string }
  | { kind: "fact"; key: string; label: string; topic: BriefTopic | null; value: string }
  | { kind: "later"; key: string; label: string; topic: BriefTopic | null };
/** Correction directe d'une rubrique du récapitulatif : fournie par le client, conservée, jamais refacturée. */
export function applyFicheChange(b: Brief, c: FicheChange) {
  if (c.kind === "summary") {
    if (!c.value.trim()) throw new Error("Présentation vide.");
    b.profile.summary = c.value.trim();
    b.profile.summaryStatus = "provided";
    return;
  }
  const topic = c.topic ?? undefined;
  const existing = b.profile.facts.find((f) => f.key === c.key);
  if (c.kind === "later") {
    if (existing?.status === "confirmed" && existing.source === "user") throw new Error("Ce point est déjà renseigné.");
    if (b.profile.questions.some((q) => q.factKey === c.key && blocking(q))) throw new Error("Cette question est nécessaire pour comprendre votre activité : répondez-y en quelques mots.");
    upsertFact(b, { key: c.key, label: existing?.label || c.label, value: "", status: "unknown", source: "user", ...(topic ? { topic } : {}), later: true });
    for (const q of b.profile.questions.filter((x) => x.factKey === c.key && !x.answer?.trim())) q.later = true;
    return;
  }
  if (!c.value.trim()) throw new Error("Réponse explicite requise.");
  upsertFact(b, { key: c.key, label: existing?.label || c.label, value: c.value.trim(), status: "confirmed", source: "user", ...(topic ? { topic } : {}) });
  delete b.profile.facts.find((f) => f.key === c.key)!.later;
  // La question qui portait sur ce point est alors répondue, avec les mêmes mots.
  for (const q of b.profile.questions.filter((x) => x.factKey === c.key)) {
    q.answer = c.value.trim();
    delete q.later;
  }
}
