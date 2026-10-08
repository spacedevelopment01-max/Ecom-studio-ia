/**
 * Stratégie éditoriale sociale V2 : objectifs, audience, positionnement, ton, messages, thématiques, piliers,
 * formats, fréquence, canaux, appels à l'action, saisonnalité et événements — à partir du Project Brain et des seuls
 * faits vérifiés. Gratuite et déterministe. Elle diffère par type d'activité (archétype), sans code propre à un
 * client : un artisan, un restaurant, une marque cosmétique, un produit high-tech et un logiciel n'ont ni les mêmes
 * piliers ni les mêmes appels à l'action.
 */
import type { Project } from "../projects";
import { verifiedFacts } from "../seo-v2/facts";
import { fold } from "../seo-v2/lang";
import { mainCity } from "../seo-v2/keywords";
import { keyMoments } from "../engine/social-quality";
import { PLATFORM_SPECS, type Platform, type PostFormat } from "./platforms";
import type { VerifiedFacts } from "../seo-v2/types";

export type Archetype = "trade" | "restaurant" | "service" | "beauty" | "tech" | "saas" | "product";
export type Objective = "educate" | "demonstrate" | "sell" | "brand" | "local" | "convert" | "engage";
export type Pillar = { id: string; title: string; objective: Objective; share: number; formats: PostFormat[]; idea: string };

export type SocialStrategy = {
  archetype: Archetype;
  objectives: string[];
  audience: string;
  positioning: string;
  tone: string[];
  messages: string[];
  themes: string[];
  pillars: Pillar[];
  formats: { format: PostFormat; share: number }[];
  frequency: string;
  channels: { platform: Platform; level: string; why: string }[];
  ctas: string[];
  seasonality: { label: string; date: string }[];
  events: string[];
  gaps: string[];
};

const tr = (lang: string, fr: string, en: string) => (lang === "en" ? en : fr);

/** Archétype d'activité d'après le secteur, la catégorie et le type de projet (règles générales, aucun client cité). */
export function archetypeOf(p: Project): Archetype {
  const text = fold(`${p.product.category} ${p.product.summary} ${p.product.name}`);
  const sector = p.product.sector ?? "";
  if (p.business === "services") {
    if (sector === "restauration" || /restaurant|bistrot|brasserie|traiteur|cafe|pizzeria/.test(text)) return "restaurant";
    if (sector === "batiment" || /platr|peintr|plomb|electric|macon|menuis|carrel|couvreur|renovation|chantier/.test(text)) return "trade";
    return "service";
  }
  if (/logiciel|saas|application|plateforme|software|app\b|tableau de bord|dashboard/.test(text)) return "saas";
  if (sector === "beaute" || /serum|creme|soin|cosmet|maquillage|parfum/.test(text)) return "beauty";
  if (sector === "hightech" || /casque|ecouteur|enceinte|chargeur|montre connectee|drone|camera/.test(text)) return "tech";
  return "product";
}

const P = (id: string, title: string, objective: Objective, share: number, formats: PostFormat[], idea: string): Pillar => ({ id, title, objective, share, formats, idea });

/** Piliers par archétype : chacun a un objectif distinct, des formats natifs et une part du calendrier. */
export function pillarsFor(a: Archetype, lang: string): Pillar[] {
  const t = (fr: string, en: string) => tr(lang, fr, en);
  switch (a) {
    case "trade":
      return [
        P("savoir-faire", t("Le métier expliqué", "The trade explained"), "educate", 0.3, ["carousel", "reel", "image"], t("une étape ou une technique des prestations déclarées, sans chantier inventé", "a step or technique from the declared services, no invented job")),
        P("conseils", t("Conseils avant travaux", "Advice before work"), "engage", 0.25, ["carousel", "image"], t("répondre aux questions que se posent les clients", "answer the questions customers ask")),
        P("prestations", t("Nos prestations", "Our services"), "convert", 0.2, ["image", "reel"], t("une prestation déclarée et comment demander un devis", "one declared service and how to request a quote")),
        P("local", t("Près de chez vous", "Near you"), "local", 0.15, ["image", "text"], t("la zone réelle d'intervention et le contact", "the real service area and contact")),
        P("coulisses", t("L'atelier et l'équipe", "The workshop and the team"), "brand", 0.1, ["image", "reel"], t("seulement avec de vraies photos de l'activité", "only with real photos of the business")),
      ];
    case "restaurant":
      return [
        P("carte", t("À la carte", "On the menu"), "sell", 0.3, ["image", "reel"], t("plats et formules confirmés (jamais de prix inventé)", "confirmed dishes and set menus (no invented price)")),
        P("cuisine", t("En cuisine", "In the kitchen"), "brand", 0.25, ["reel", "image"], t("le geste, le produit, la saison — sans fournisseur inventé", "the gesture, the produce, the season — no invented supplier")),
        P("pratique", t("Infos pratiques", "Practical info"), "local", 0.2, ["image", "text"], t("horaires, réservation, adresse saisis", "entered hours, booking, address")),
        P("evenements", t("Rendez-vous", "Events"), "engage", 0.1, ["image"], t("uniquement des événements confirmés", "confirmed events only")),
        P("quartier", t("Le quartier", "The neighbourhood"), "local", 0.15, ["image", "carousel"], t("la zone réelle, sans partenaire inventé", "the real area, no invented partner")),
      ];
    case "service":
      return [
        P("expertise", t("Notre approche", "Our approach"), "educate", 0.3, ["carousel", "image"], t("comment se déroule la prestation déclarée", "how the declared service works")),
        P("questions", t("Vos questions", "Your questions"), "engage", 0.25, ["carousel", "image"], t("réponses fournies par le professionnel", "answers given by the professional")),
        P("prestations", t("Prestations", "Services"), "convert", 0.25, ["image", "reel"], t("une prestation et la prise de contact", "one service and how to get in touch")),
        P("local", t("Près de chez vous", "Near you"), "local", 0.2, ["image", "text"], t("zone et contact réels", "real area and contact")),
      ];
    case "beauty":
      return [
        P("rituel", t("Le rituel", "The ritual"), "educate", 0.3, ["reel", "carousel"], t("quand et comment l'utiliser (seulement si connu)", "when and how to use it (only if known)")),
        P("produit", t("Le produit en vrai", "The product, for real"), "demonstrate", 0.25, ["image", "reel"], t("texture, contenance, caractéristiques confirmées", "texture, size, confirmed specs")),
        P("questions", t("Vos questions", "Your questions"), "engage", 0.2, ["carousel", "image"], t("réponses confirmées, aucune allégation santé", "confirmed answers, no health claim")),
        P("marque", t("La marque", "The brand"), "brand", 0.1, ["image"], t("ce qui la guide, sans histoire inventée", "what guides it, no invented story")),
        P("achat", t("Pour l'adopter", "Get yours"), "convert", 0.15, ["image", "story"], t("prix confirmé, lien boutique", "confirmed price, shop link")),
      ];
    case "tech":
      return [
        P("demo", t("Démonstration", "Demo"), "demonstrate", 0.3, ["reel", "video", "image"], t("le produit en action", "the product in action")),
        P("specs", t("Caractéristiques confirmées", "Confirmed specs"), "educate", 0.25, ["carousel", "image"], t("une caractéristique confirmée par publication", "one confirmed spec per post")),
        P("usages", t("Cas d'usage", "Use cases"), "engage", 0.2, ["image", "reel"], t("situations d'usage crédibles, sans performance inventée", "credible use cases, no invented performance")),
        P("questions", t("Questions", "Questions"), "engage", 0.1, ["carousel"], t("réponses confirmées", "confirmed answers")),
        P("achat", t("Le choisir", "Choose it"), "convert", 0.15, ["image", "story"], t("prix confirmé, lien boutique", "confirmed price, shop link")),
      ];
    case "saas":
      return [
        P("demo", t("Démonstration", "Product demo"), "demonstrate", 0.3, ["video", "reel", "carousel"], t("une fonction montrée à l'écran", "one feature shown on screen")),
        P("pedagogie", t("Méthode", "How-to"), "educate", 0.3, ["carousel", "text"], t("le problème du client et la méthode", "the customer's problem and the method")),
        P("usages", t("Cas d'usage", "Use cases"), "engage", 0.15, ["carousel", "image"], t("situations réelles du public cible, sans client inventé", "real situations of the target audience, no invented customer")),
        P("conversion", t("Essayer", "Try it"), "convert", 0.15, ["image", "text"], t("essai ou démonstration, seulement si proposés", "trial or demo, only if offered")),
        P("marque", t("Pourquoi nous", "Why us"), "brand", 0.1, ["text", "image"], t("le positionnement déclaré", "the declared positioning")),
      ];
    default:
      return [
        P("produit", t("Le produit en vrai", "The product, for real"), "demonstrate", 0.3, ["image", "reel", "carousel"], t("ce que montre la photo, caractéristiques confirmées", "what the photo shows, confirmed specs")),
        P("usages", t("Usages", "Uses"), "educate", 0.25, ["carousel", "image"], t("comment s'en servir (si connu)", "how to use it (if known)")),
        P("questions", t("Vos questions", "Your questions"), "engage", 0.2, ["carousel", "image"], t("réponses confirmées", "confirmed answers")),
        P("marque", t("La marque", "The brand"), "brand", 0.1, ["image"], t("ce qui la guide", "what guides it")),
        P("achat", t("Le choisir", "Choose it"), "convert", 0.15, ["image", "story"], t("prix confirmé, lien boutique", "confirmed price, shop link")),
      ];
  }
}

export function socialStrategy(p: Project, o: { lang?: string; platforms?: Platform[]; startDate?: string; days?: number; perDay?: number; facts?: VerifiedFacts } = {}): SocialStrategy {
  const lang = o.lang ?? "fr";
  const f = o.facts ?? verifiedFacts(p);
  const a = archetypeOf(p);
  const t = (fr: string, en: string) => tr(lang, fr, en);
  const city = mainCity(f.area);
  const services = p.business === "services";
  const voicePillars = p.brand?.social?.pillars ?? [];
  // Les piliers déclarés par la marque renomment les piliers de l'archétype (même objectif, mêmes formats).
  const pillars = pillarsFor(a, lang).map((x, i) => (voicePillars[i]?.title && !/^(inspiration|lifestyle|produit|product|divers)$/i.test(voicePillars[i].title) ? { ...x, title: voicePillars[i].title, idea: voicePillars[i].idea || x.idea } : x));
  const platforms = o.platforms ?? (services ? (["facebook", "instagram"] as Platform[]) : (["instagram", "facebook", "pinterest"] as Platform[]));
  const objectives = {
    trade: [t(`Être reconnu comme l'artisan de référence${city ? ` à ${city}` : ""}`, `Be known as the go-to tradesperson${city ? ` in ${city}` : ""}`), t("Expliquer le métier pour rassurer avant le devis", "Explain the trade to reassure before the quote"), t("Générer des demandes de devis", "Generate quote requests")],
    restaurant: [t("Donner envie de venir (plats, ambiance réelle)", "Make people want to come (real dishes, atmosphere)"), t("Faire connaître les horaires et la réservation", "Share opening hours and booking"), t("Fidéliser le quartier", "Build neighbourhood loyalty")],
    service: [t("Faire comprendre la prestation", "Make the service clear"), t("Rassurer avant le premier contact", "Reassure before first contact"), t("Obtenir des prises de contact", "Get enquiries")],
    beauty: [t("Faire désirer le produit par l'usage", "Make the product desirable through use"), t("Répondre aux questions avant achat", "Answer pre-purchase questions"), t("Amener vers la boutique", "Drive to the shop")],
    tech: [t("Montrer le produit en action", "Show the product in action"), t("Prouver par les caractéristiques confirmées", "Prove with confirmed specs"), t("Amener vers la boutique", "Drive to the shop")],
    saas: [t("Montrer la valeur du logiciel en démonstration", "Show the software's value in demos"), t("Éduquer le public cible", "Educate the target audience"), t("Obtenir des essais ou des démonstrations", "Get trials or demos")],
    product: [t("Faire connaître le produit", "Make the product known"), t("Lever les doutes d'achat", "Remove buying doubts"), t("Amener vers la boutique", "Drive to the shop")],
  }[a];
  const ctas = {
    trade: [t("Demander un devis", "Request a quote"), t("Appeler", "Call"), t("Posez votre question en commentaire", "Ask your question in the comments")],
    restaurant: [t("Réserver une table", "Book a table"), t("Appeler", "Call"), t("Dites-nous votre plat préféré", "Tell us your favourite dish")],
    service: [t("Prendre rendez-vous", "Book an appointment"), t("Nous contacter", "Contact us"), t("Enregistrez ce conseil", "Save this tip")],
    beauty: [t("Découvrir sur la boutique", "Shop now"), t("Enregistrez pour votre routine", "Save for your routine"), t("Votre question en commentaire", "Your question in the comments")],
    tech: [t("Voir le produit", "See the product"), t("Enregistrez la fiche", "Save the specs"), t("Votre usage en commentaire", "Your use case in the comments")],
    saas: [t("Essayer", "Try it"), t("Demander une démo", "Book a demo"), t("Enregistrez la méthode", "Save the method")],
    product: [t("Voir le produit", "See the product"), t("Enregistrez", "Save it"), t("Votre question en commentaire", "Your question in the comments")],
  }[a];
  const moments = o.startDate ? keyMoments(o.startDate, o.days ?? 30, p.product.sector ?? null, lang === "en" ? "en" : "fr").map((m) => ({ label: m.label, date: m.date })) : [];
  const gaps = [...f.unknowns];
  if (a === "restaurant") gaps.push(t("événements confirmés (soirées, menus spéciaux) — aucun ne sera inventé", "confirmed events (evenings, special menus) — none will be invented"));
  if (a === "trade" || a === "service") gaps.push(t("photos réelles de chantiers ou de l'activité (aucune réalisation ne sera inventée)", "real photos of jobs or the business (no work will be invented)"));
  const fmtShare = new Map<PostFormat, number>();
  for (const pl of pillars) for (const [i, fm] of pl.formats.entries()) fmtShare.set(fm, (fmtShare.get(fm) ?? 0) + pl.share * (i === 0 ? 0.6 : 0.4 / Math.max(1, pl.formats.length - 1)));
  return {
    archetype: a,
    objectives,
    audience: f.audience ?? t("[À compléter : public visé]", "[To complete: target audience]"),
    positioning: p.brand?.positioning?.trim() || f.difference || t("[À compléter : positionnement]", "[To complete: positioning]"),
    tone: p.brand?.personality?.length ? p.brand.personality : f.tone,
    messages: [f.difference, ...f.facts.slice(0, 3).map((x) => (x.label ? `${x.label} : ${x.value}` : x.value)), ...f.services.slice(0, 3).map((s) => s.name), f.area ? t(`Zone : ${f.area}`, `Area: ${f.area}`) : null].filter((x): x is string => !!x),
    themes: pillars.map((x) => x.title),
    pillars,
    formats: [...fmtShare.entries()].map(([format, share]) => ({ format, share: Math.round(share * 100) / 100 })).sort((x, y) => y.share - x.share),
    frequency: o.perDay ? t(`${o.perDay} publication(s) par jour`, `${o.perDay} post(s) per day`) : t("1 à 2 publications par jour conseillées", "1 to 2 posts per day recommended"),
    channels: platforms.map((pl) => ({ platform: pl, level: PLATFORM_SPECS[pl].level, why: PLATFORM_SPECS[pl].formats.includes("reel") || PLATFORM_SPECS[pl].formats.includes("short") ? t("formats vidéo courts", "short video formats") : t("publications image et texte", "image and text posts") })),
    ctas,
    seasonality: moments,
    events: [],
    gaps,
  };
}
