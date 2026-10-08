/**
 * Faits vérifiés d'un projet (base de toute rédaction V2) : uniquement ce qui est confirmé ou saisi par le client
 * — faits produit confirmés, réponses aux questions, objections avec réponse, preuves disponibles, prestations,
 * zone, coordonnées saisies. Livraison, retours, prix : seulement s'ils sont confirmés. Tout le reste est listé
 * dans `unknowns` et s'écrit « [À compléter : …] » — jamais deviné.
 */
import type { Project } from "../projects";
import { adInsight } from "../ads-v2/insight";
import type { CatalogItem } from "../project-types";
import type { VerifiedFacts } from "./types";

const ph = (s: string | null | undefined) => !s?.trim() || /\[(À|A) (compléter|définir|préciser)|\[To (complete|define)|\[Por completar/i.test(s);
const clean = (s: string | null | undefined) => (ph(s) ? null : s!.trim());

export function verifiedFacts(p: Project, item?: CatalogItem | null): VerifiedFacts {
  const i = adInsight(p);
  const confirmed = p.product.facts.filter((f) => f.status === "confirmed" && f.value.trim());
  const find = (re: RegExp) => confirmed.find((f) => re.test(`${f.key} ${f.label}`))?.value.trim() ?? null;
  const services = p.business === "services";
  const s = p.services;
  const unknowns: string[] = [];
  // Un produit du catalogue : ses propres données (description et caractéristiques saisies), pas celles du produit phare.
  const itemFacts = item ? item.features.filter((f) => f.trim()).map((f) => ({ label: "", value: f.trim() })) : [];
  const facts = item ? itemFacts : confirmed.map((f) => ({ label: f.label.trim(), value: f.value.trim() }));
  if (!facts.length) unknowns.push(services ? "détails des prestations (matériaux, étapes, délais)" : "caractéristiques confirmées du produit (dimensions, matières, contenance…)");
  const shipping = find(/livraison|shipping|envoi|delivery/i);
  const returns = find(/retour|return|rembourse|refund/i);
  if (!services && !shipping) unknowns.push("conditions de livraison");
  if (!services && !returns) unknowns.push("conditions de retour");
  const price = item ? (item.price != null ? `${(item.price / 100).toFixed(2).replace(".", ",")} €` : null) : p.product.price.status === "confirmed" && p.product.price.amount != null ? `${(p.product.price.amount / 100).toFixed(2).replace(".", ",")} ${p.product.price.currency === "EUR" ? "€" : p.product.price.currency}` : null;
  if (!price && !services) unknowns.push("prix");
  if (services && !clean(s.area)) unknowns.push("zone d'intervention");
  if (services && !clean(s.phone) && !clean(s.email) && !clean(s.bookingUrl)) unknowns.push("coordonnées de contact");
  if (!i.proofs.length) unknowns.push("preuves (garanties, labels, certifications) — aucune ne sera affirmée");
  return {
    brand: i.brand,
    offerName: item?.name?.trim() || i.offerName,
    category: item?.category?.trim() || p.product.category?.trim() || i.category.label,
    business: p.business,
    facts,
    answers: p.product.questions.filter((q) => q.answer?.trim()).map((q) => ({ q: q.question.trim(), a: q.answer!.trim() })),
    objections: i.objections,
    proofs: i.proofs,
    services: services ? s.services.filter((x) => x.name.trim()).map((x) => ({ name: x.name.trim(), description: (x.description ?? "").trim(), ...(x.price ? { price: x.price } : {}), ...(x.duration ? { duration: x.duration } : {}) })) : [],
    area: services ? clean(s.area) : null,
    contact: { phone: clean(s?.phone), email: clean(s?.email), address: clean(s?.address), hours: clean(s?.hours), bookingUrl: clean(s?.bookingUrl), mode: services ? (s.contactMode ?? null) : null },
    shipping,
    returns,
    price,
    claimsToAvoid: p.product.claimsToAvoid ?? [],
    tone: i.tone,
    audience: i.audience.declared ?? i.audience.persona,
    difference: item ? clean(item.description) : i.difference,
    problem: i.problem,
    unknowns,
  };
}

/** Texte « autorisé » (ce qu'une affirmation doit retrouver pour être considérée confirmée). */
export function allowedText(f: VerifiedFacts): string {
  return [
    ...f.facts.map((x) => `${x.label} ${x.value}`),
    ...f.answers.map((x) => x.a),
    ...f.objections.map((x) => x.answer),
    ...f.proofs,
    ...f.services.map((x) => `${x.name} ${x.description} ${x.price ?? ""} ${x.duration ?? ""}`),
    f.area ?? "",
    f.shipping ?? "",
    f.returns ?? "",
    f.price ?? "",
    f.contact.hours ?? "",
  ]
    .join(" ")
    .toLowerCase();
}
