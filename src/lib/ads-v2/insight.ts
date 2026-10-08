/**
 * Analyse du produit et de l'audience (Ads V2) : tout vient du Project Brain (projet, plateforme de marque, faits,
 * prestations, famille du produit, métier), sans appel à l'IA. Ce qui manque est signalé, jamais inventé :
 * une objection sans réponse, une preuve « manquante » ou une offre non configurée ne sont pas utilisées.
 */
import type { Project } from "../projects";
import { resolveProductCategory } from "../image-v2/categories";
import { resolveTrade, tradeText } from "../brain/trade";
import type { AdInsight } from "./types";

const PREMIUM_RE = /premium|luxe|luxury|haut de gamme|high[- ]end|prestige|elegan|raffin|exclusi/i;
const ph = (s: string | null | undefined) => !s?.trim() || /\[(À|A) (compléter|définir|préciser)|\[To (complete|define)/i.test(s);
const clean = (s: string | null | undefined) => (ph(s) ? null : s!.trim());

export function adInsight(p: Project, opts: { audience?: string | null; offer?: string | null } = {}): AdInsight {
  const services = p.business === "services";
  const pf = p.strategy?.platform;
  const facts = p.product.facts.filter((f) => f.status === "confirmed" && f.value.trim()).map((f) => ({ label: f.label, value: f.value.trim() }));
  const answered = [...p.product.questions.filter((q) => q.answer?.trim()).map((q) => ({ label: q.question.replace(/\?$/, ""), value: q.answer!.trim() }))];
  const objections = (pf?.objections ?? []).filter((o) => o.objection.trim() && o.answer?.trim()).map((o) => ({ objection: o.objection.trim(), answer: o.answer.trim() }));
  const proofs = (pf?.proofs ?? []).filter((x) => x.status === "available" && x.claim.trim()).map((x) => x.claim.trim());
  const cat = services ? null : resolveProductCategory(p.product);
  const trade = services ? resolveTrade(tradeText(p), p.product.sector ?? null) : null;
  const svc = services ? (p.services?.services ?? []).filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), description: (s.description ?? "").trim() })) : [];
  const declared = clean(opts.audience) ?? clean(p.brand?.audience);
  const gaps: string[] = [];
  if (!facts.length && !answered.length) gaps.push("aucun fait confirmé sur le produit : les annonces restent descriptives, sans preuve");
  if (!objections.length) gaps.push("aucune objection avec sa réponse : l'angle « objection levée » n'est pas utilisé");
  if (!declared) gaps.push("audience non décrite : ciblage large conseillé, à affiner avec les chiffres");
  if (services && !p.services?.area?.trim()) gaps.push("zone d'intervention non renseignée");
  return {
    business: p.business,
    brand: p.brand?.name?.trim() || p.product.name?.trim() || p.name,
    offerName: p.product.name?.trim() || p.brand?.name?.trim() || p.name,
    category: cat ? { id: cat.id, label: cat.labels.fr || p.product.category, source: cat.source } : { id: trade!.id, label: trade!.labels.fr || p.product.category, source: trade!.source },
    audience: { declared, persona: clean(pf?.persona), adultsOnly: p.product.sector === "enfants" },
    problem: clean(pf?.problem),
    alternatives: clean(pf?.alternatives),
    difference: clean(pf?.difference),
    facts: [...facts, ...answered].slice(0, 12),
    objections,
    proofs,
    usage: services ? svc.map((s) => s.name) : (cat?.usage ?? []),
    services: svc,
    area: services ? clean(p.services?.area) ?? clean(p.services?.address) : null,
    contactMode: services ? (p.services?.contactMode ?? null) : null,
    tone: p.brand?.personality ?? [],
    premium: PREMIUM_RE.test(`${(p.brand?.personality ?? []).join(" ")} ${p.brand?.positioning ?? ""}`),
    claimsToAvoid: p.product.claimsToAvoid ?? [],
    offer: clean(opts.offer),
    gaps,
  };
}
