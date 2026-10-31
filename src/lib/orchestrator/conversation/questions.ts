/** Projection de questions depuis le Brief commun. Aucun fournisseur, planner ou fait commercial inventé. */
import { L } from "../../i18n-server";
import { guessSector } from "../../engine/local";
import { normalizeRequest } from "../request";
import type { Brief } from "../../preparation/types";
import type { BusinessType } from "../../project-types";
import type { ChoiceCard, ConversationState, QuestionKey } from "./contract";

const visible = (s: string) => normalizeRequest(s.replace(/https?:\/\/\S+|```[\s\S]*?```|<source[\s\S]*?<\/source>|«[^»]*»|“[^”]*”|"[^"]*"/gi, " "));
/** Une catégorie probable n'est pas une caractéristique, une certification ou une autorisation. */
export function proposedBusiness(text: string): BusinessType | null {
  const t = visible(text);
  const services = /\b(prestations?|services?|devis|rdv|rendez[- ]vous|appointments?|quotes?|lessons?|tutoring|consulting)\b|\b(j'|je |nous |i |we )(amenage|repar|accompagn|enseigne|conseille|install|renov|repair|teach|coach)/.test(t);
  const products = /\b(vends?|vendre|vendons|vente|produits?|products?|selling|sell|ecommerce)\b/.test(t);
  if (services && products) return null;
  if (services) return "services";
  if (products) return "products";
  const s = guessSector(t, "services"), p = guessSector(t, "products");
  return s && !p ? "services" : p && !s ? "products" : null;
}
/** Seulement une cible explicitement étiquetée ; l'usage d'un produit ne dit pas qui l'achète. */
export function providedTarget(text:string):string|null {
  const m=/(?:^|[\n.!?]\s*)(?:cible|client[èe]le|public vis[ée]|target audience|customers)\s*[:=]\s*([^\n.!?]+)|\b(?:mes clients sont|nos clients sont|my customers are|our customers are)\s+([^\n.!?]+)/i.exec(text);
  const value=(m?.[1]??m?.[2])?.trim();
  return value && value.length<=1200 ? value : null;
}
export const goalChoices = (business: BusinessType | null) => business === "products" ? [
  { id: "sell", label: L("Vendre mes produits en ligne", "Sell my products online") },
  { id: "present", label: L("Présenter mon offre", "Present my offer") },
  { id: "brand", label: L("Développer ma marque", "Develop my brand") },
] : [
  { id: "quote", label: L("Recevoir des demandes de devis", "Receive quote requests") },
  { id: "booking", label: L("Recevoir des rendez-vous", "Receive appointments") },
  { id: "present", label: L("Présenter mon activité", "Present my business") },
];
export function explicitGoals(text: string, business: BusinessType | null) {
  const t = visible(text);
  // Négation, question ou hypothèse : pas une décision acquise à extraire d'un mot isolé.
  if (/\b(pas|sans|jamais|aucun|not|never|without|pourquoi|comment|why|how|si|if)\b/.test(t)) return [];
  const ids: string[] = [];
  if (business === "products" && /\b(vendre|vends|vente|sell|selling)\b/.test(t)) ids.push("sell");
  if (business === "services" && /\b(devis|quotes?)\b/.test(t)) ids.push("quote");
  if (business === "services" && /\b(rdv|rendez[- ]vous|appointments?)\b/.test(t)) ids.push("booking");
  return goalChoices(business).filter(c => ids.includes(c.id));
}
export function questionFor(key: QuestionKey, b: Brief, meta: ConversationState): ChoiceCard {
  const other = { id: "other", label: L("Autre / préciser", "Other / specify") };
  if (key === "business") return { kind: "question", key, title: L("Que proposez-vous à vos clients ?", "What do you offer your customers?"), why: L("Je préfère vérifier plutôt que vous imposer une boutique ou un parcours de prestations.", "I would rather check than force a shop or a service workflow on you."), multiple: false, choices: [{ id: "products", label: L("Des produits", "Products") }, { id: "services", label: L("Des prestations de services", "Services") }, other], allowFreeText: true, allowUnknown: true, currentAnswer: meta.business ?? "" };
  if (key === "goals") return { kind: "question", key, title: L("Que souhaitez-vous obtenir en priorité ?", "What would you like to achieve first?"), why: L("Vos objectifs guident les prochaines étapes ; ils ne lancent aucune création.", "Your goals guide the next steps; they do not start any creation."), multiple: true, choices: [...goalChoices(meta.business), other], allowFreeText: true, allowUnknown: true, currentAnswer: b.profile.facts.find(f => f.key === "conversation.goals")?.value ?? "" };
  return { kind: "question", key, title: L("À qui votre offre s’adresse-t-elle ?", "Who is your offer for?"), why: L("Je vous pose cette question sans supposer qui achètera ni inventer des besoins.", "I ask without assuming who will buy or inventing needs."), multiple: true, choices: [{ id: "individuals", label: L("Des particuliers", "Individuals") }, { id: "businesses", label: L("Des professionnels", "Businesses") }, other], allowFreeText: true, allowUnknown: true, currentAnswer: b.input.target };
}
export function nextQuestion(b: Brief, m: ConversationState): QuestionKey | null {
  if (!b.input.description.trim()) return null;
  if (m.editing) return m.editing;
  const unresolved: QuestionKey[] = [
    ...(!m.business ? ["business" as const] : []),
    ...(!b.profile.facts.some(f => f.key === "conversation.goals" && f.status === "confirmed") ? ["goals" as const] : []),
    ...(!b.input.target.trim() ? ["target" as const] : []),
  ];
  return unresolved.find(k => !m.deferred.includes(k)) ?? null;
}
