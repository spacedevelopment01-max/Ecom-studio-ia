/**
 * Niveau gratuit de SINA (moteur local, #492, décision du propriétaire du 6 novembre 2026). À l'étape 0, quand la
 * réponse du client est simple et répond exactement à la question posée, le Studio l'enregistre telle quelle, pose la
 * question suivante, fait le résumé et valide l'étape SANS appeler l'IA. Dans le doute (pièce jointe, lien, question
 * du client, plusieurs informations, correction, réponse ambiguë), il ne devine jamais : il passe la main à Claude.
 */
import type { StepOutput } from "./loop";
import { FIELD_LABEL, QUESTIONS, START_FIELDS, missingFields, currentStep, type Journey, type StartField } from "./journey";

/** Choix proposés en boutons pour certaines questions (réponses reconnues sans IA). */
export const LOCAL_CHOICES: Partial<Record<StartField, string[]>> = {
  business: ["Des produits", "Des services"],
  existing: ["Rien, je pars de zéro", "J'ai déjà un nom, un logo ou un site"],
  contact: ["Plus tard"],
  photos: ["Pas encore de photos"],
  language: ["Français seulement", "Français et anglais"],
  platform: ["Shopify", "WooCommerce", "PrestaShop", "Je ne sais pas encore"],
};
export const CONFIRM_CHOICES = ["Oui, tout est juste, on continue", "Je veux corriger quelque chose"];

const LATER = /^(plus tard|je (ne sais|sais) pas( encore)?|pas encore|aucune id[ée]e|later|not sure|je verrai)\b/i;
const NOTHING = /^(non|rien|aucun|aucune|pas encore|je pars de z[ée]ro|rien,? je pars de z[ée]ro|nothing|no)\b/i;
const YES = /^(oui|ok|d'accord|daccord|c'est (bon|juste|parfait|ça)|parfait|valid|on continue|yes|go|ça me va|tout est juste)/i;
const ACKS = ["C'est noté.", "Parfait, c'est enregistré.", "Merci, je note.", "Bien reçu.", "Noté !"];

/** Valeur reconnue sans IA pour le champ demandé, ou null (→ Claude). */
export function parseSimpleAnswer(field: StartField, raw: string): { value: string; status: "answered" | "later" | "none" } | null {
  const text = raw.trim();
  if (!text || text.length > 400 || /\?\s*$/.test(text) || /https?:\/\//i.test(text) && field !== "taste") return null;
  const later = LATER.test(text);
  switch (field) {
    case "business": {
      const p = /\bproduits?\b/i.test(text), s = /\b(services?|prestations?)\b/i.test(text);
      return p !== s ? { value: p ? "products" : "services", status: "answered" } : null;
    }
    case "existing": return NOTHING.test(text) ? { value: "Rien : je pars de zéro.", status: "answered" } : null;
    case "platform": {
      const m = /shopify|woo ?commerce|prestashop/i.exec(text);
      if (m) return { value: /shopify/i.test(m[0]) ? "shopify" : /presta/i.test(m[0]) ? "prestashop" : "woocommerce", status: "answered" };
      return later ? { value: "à décider", status: "answered" } : null;
    }
    case "offer": case "keep": return null; // création du projet, photos, éléments à garder : Claude.
    case "audience": return later ? null : { value: text, status: "answered" }; // indispensable : jamais « plus tard ».
    case "photos": return /^(pas encore|non|aucune?|pas de photos?|rien)\b/i.test(text) || later ? { value: "Pas de photos pour l'instant.", status: "answered" } : null; // photos promises ou jointes : Claude.
    case "language": {
      const en = /anglais|english|bilingue|les deux/i.test(text), fr = /fran[çc]ais|french/i.test(text);
      return en ? { value: "Français et anglais", status: "answered" } : fr ? { value: "Français seulement", status: "answered" } : later ? { value: "", status: "later" } : null;
    }
    default: return later ? { value: "", status: "later" } : { value: text, status: "answered" };
  }
}

/** Résumé « Voici ce que j'ai compris », construit à partir des réponses enregistrées (rien n'est réécrit). */
export function localSummary(j: Journey): string {
  const lines = ["Voici ce que j'ai compris. Relis-le, et dis-moi si quelque chose est à corriger.", ""];
  for (const f of START_FIELDS) {
    const a = j.start[f];
    if (!a) continue;
    const v = a.status === "answered" ? (f === "business" ? (a.value === "services" ? "Des services" : "Des produits") : a.value) : a.status === "later" ? "Plus tard (à compléter avant la mise en ligne)" : "Rien de particulier";
    lines.push(`**${FIELD_LABEL[f].fr}**`, v, "");
  }
  if (j.keep.length) lines.push(`**Refonte**`, `Je garde tel quel : ${j.keep.join(", ")}. Tout le reste sera recréé.`, "");
  return lines.join("\n").trim();
}

export type LocalContext = { journey: Journey; userText: string; hasAttachments: boolean; askField: string | null; hasProject: boolean; seq: number };
export type LocalDecision = { out: StepOutput; answer?: { field: StartField; value: string; status: "answered" | "later" | "none" }; confirm?: boolean };

/** Décision du moteur local pour un message du client, ou null quand il faut Claude. */
export function localDecision(c: LocalContext): LocalDecision | null {
  const j = c.journey;
  if (currentStep(j) !== 0 || c.hasAttachments || !c.askField) return null;
  const missing = missingFields(j);
  const ack = ACKS[c.seq % ACKS.length];
  // Validation du résumé.
  if (c.askField === "confirm") {
    if (missing.length || !YES.test(c.userText.trim()) || c.userText.length > 120) return null; // start.confirm crée le projet s'il manque
    return {
      confirm: true,
      out: { message: "Parfait, l'étape 0 est validée. Je garde toutes tes réponses pour la suite. La prochaine étape : tes 3 identités de marque.", actions: [{ tool: "start.confirm", args: {}, why: "validation du résumé par le client (moteur local)" }], question: null, done: true },
    };
  }
  const field = c.askField as StartField;
  if (!START_FIELDS.includes(field) || missing[0] !== field) return null;
  const answer = parseSimpleAnswer(field, c.userText);
  if (!answer) return null;
  // État après la réponse : question suivante, ou résumé à faire confirmer.
  const next: Journey = { ...j, start: { ...j.start, [field]: { ...answer, source: "client", at: Date.now() } } };
  const rest = missingFields(next);
  const out: StepOutput = rest.length
    ? { message: ack, actions: [{ tool: "start.answer", args: { answers: [{ field, value: answer.value, status: answer.status }] }, why: "réponse simple enregistrée (moteur local)" }], question: { text: QUESTIONS[rest[0]](next).fr, ...(LOCAL_CHOICES[rest[0]] ? { choices: LOCAL_CHOICES[rest[0]] } : {}) }, done: false, askField: rest[0] }
    : { message: localSummary(next), actions: [{ tool: "start.answer", args: { answers: [{ field, value: answer.value, status: answer.status }] }, why: "réponse simple enregistrée (moteur local)" }], question: { text: "Ce résumé te convient-il ?", choices: CONFIRM_CHOICES }, done: false, askField: "confirm" };
  return { out, answer: { field, ...answer } };
}
