/**
 * Annonces publicitaires d'une campagne (angle, texte principal, titre, bouton) dans la langue des contenus
 * de l'action (`contentLang()`) : une campagne peut être en anglais pour une boutique en français.
 * Avec l'IA si elle est disponible pour le client, sinon modèles locaux honnêtes construits à partir
 * des faits produit confirmés, du nom de marque et des angles de la stratégie (aucun chiffre ni avis inventé).
 * Serveur uniquement.
 */
import { z } from "zod";
import type { Lang } from "../i18n";
import { contentLang, withContentLang } from "../i18n-server";
import { areaMentioned, howToBook, unknownText } from "./services-text";
import { llmConfigured, llmJson } from "../ai/llm";
import { projectContext } from "../ai/context";
import { charter, langName, placeholder } from "../ai/prompts";
import type { Project } from "../projects";

export type AdDraft = { angle: string; primary: string; headline: string; cta: string };

/** Boutons d'appel à l'action proposés par les gestionnaires de publicités (même ordre dans les deux langues). */
export const AD_CTAS: Record<Lang, string[]> = {
  fr: ["Découvrir", "Acheter", "En savoir plus", "Voir le produit", "S'inscrire"],
  en: ["Discover", "Shop now", "Learn more", "View product", "Sign up"],
};

/** Boutons des annonces d'une entreprise de services : prendre rendez-vous, demander un devis, appeler… */
export const SERVICE_AD_CTAS: Record<Lang, string[]> = {
  fr: ["Prendre rendez-vous", "Demander un devis", "Appeler", "En savoir plus", "Nous contacter"],
  en: ["Book now", "Get a quote", "Call now", "Learn more", "Contact us"],
};

/** Boutons proposés pour ce projet (produits ou services), dans la langue demandée. */
export const adCtas = (p: Pick<Project, "business">, lang: Lang) => (p.business === "services" ? SERVICE_AD_CTAS : AD_CTAS)[lang];

/** Bouton principal d'une entreprise de services selon son mode de contact. */
function serviceCta(p: Project, lang: Lang): string {
  const ctas = SERVICE_AD_CTAS[lang];
  const mode = p.services?.contactMode;
  return mode === "booking" ? ctas[0] : mode === "quote" ? ctas[1] : mode === "call" ? ctas[2] : ctas[4];
}

const AdSchema = z.object({ angle: z.string(), primary: z.string(), headline: z.string(), cta: z.string() });

/** Propose `count` annonces dans la langue des contenus de l'exécution en cours. */
export async function draftAds(p: Project, opts: { userId: string; count?: number; objective?: string; audience?: string }): Promise<{ ads: AdDraft[]; by: "ai" | "local" }> {
  const lang = contentLang();
  const count = Math.max(1, Math.min(6, opts.count ?? 3));
  if (llmConfigured()) {
    const services = p.business === "services";
    const ctas = adCtas(p, lang);
    const r = await llmJson(
      {
        task: "social_copy",
        userId: opts.userId,
        projectId: p.id,
        system: `${charter(lang)}

Rôle : rédacteur publicitaire (Meta, TikTok, Pinterest, YouTube). ${services ? `Tu écris des annonces natives, concrètes et honnêtes pour une ENTREPRISE DE SERVICES (pas de produit, pas de panier, pas de livraison) : l'objectif est de faire prendre rendez-vous, demander un devis ou appeler. Appuie-toi sur les prestations, la zone, les horaires et le mode de contact du contexte ; jamais de tarif, de diplôme, de certification, d'assurance, d'expérience, d'avis ni de délai d'intervention qui n'y figure pas. Le bouton le plus adapté au mode de contact est « ${serviceCta(p, lang)} ».` : "Tu écris des annonces natives, concrètes et honnêtes à partir des angles de la stratégie et des faits confirmés du produit."}
Pour chaque annonce : « angle » (2 à 5 mots), « primary » (texte principal, 1 à 3 phrases courtes, accroche dans la première ligne), « headline » (titre de 3 à 8 mots, 40 caractères au plus), « cta » choisi exactement dans cette liste : ${ctas.join(" | ")}.
Aucune promotion, aucun avis, aucune note, aucun chiffre ni délai qui ne figure pas dans le contexte. Angles variés d'une annonce à l'autre.
Langue : tous les champs en ${langName(lang)}, même si le contexte est dans une autre langue (traduis et adapte les faits, sans en ajouter).`,
        context: projectContext(p, "social"),
        prompt: `Rédige ${count} annonces publicitaires.${opts.objective ? `\nObjectif de la campagne : ${opts.objective}.` : ""}${opts.audience ? `\nAudience : ${opts.audience}.` : ""}
Réponds { "ads": [ { "angle": "…", "primary": "…", "headline": "…", "cta": "…" } ] }.`,
        maxTokens: 6000,
      },
      z.object({ ads: z.array(AdSchema).min(1) }),
    );
    const ads = r.ads.slice(0, count).map((a) => ({ ...a, cta: ctas.includes(a.cta) ? a.cta : services ? serviceCta(p, lang) : ctas[0] }));
    return { ads, by: "ai" };
  }
  return { ads: localAds(p, lang, count), by: "local" };
}

/**
 * Modèles locaux FR/EN. Les angles et faits de la stratégie sont rédigés dans la langue du projet :
 * ils ne sont repris tels quels que si la campagne est dans cette langue ; sinon le texte reste
 * générique, avec des espaces réservés à compléter (jamais d'information inventée).
 */
export function localAds(p: Project, lang: Lang, count = 3): AdDraft[] {
  if (p.business === "services") return withContentLang(lang, () => localServiceAds(p, lang, count));
  const sameLang = (p.settings.language ?? "fr") === lang;
  const en = lang === "en";
  const brand = p.brand?.name?.trim() || "";
  const product = p.product.name?.trim() || (en ? "our product" : "notre produit");
  const who = brand ? `${brand} · ${product}` : product;
  const ph = (what: string) => placeholder(lang, what);
  const tagline = sameLang ? p.brand?.tagline?.trim() : "";
  const facts = sameLang ? p.product.facts.filter((f) => f.status === "confirmed" && f.value.trim()).map((f) => (en ? `${f.label}: ${f.value}` : `${f.label} : ${f.value}`)) : [];
  const angles = sameLang ? (p.strategy?.angles ?? []).filter((a) => a.title.trim()) : [];
  const ctas = AD_CTAS[lang];
  const out: AdDraft[] = [];

  angles.slice(0, count).forEach((a, i) => {
    const fact = facts[i % Math.max(1, facts.length)];
    out.push({
      angle: a.title,
      primary: [a.idea.trim() || (en ? `Meet ${product}.` : `Découvrez ${product}.`), fact ? `${fact}.` : ""].filter(Boolean).join("\n\n"),
      headline: tagline || (en ? `Meet ${product}` : `Découvrez ${product}`),
      cta: ctas[i % 3 === 0 ? 0 : i % 3 === 1 ? 2 : 3],
    });
  });

  const generic: AdDraft[] = en
    ? [
        { angle: "The product", primary: `Meet ${who}.\n\n${facts[0] ? `${facts[0]}.` : ph("key benefit, confirmed")}`, headline: tagline || `Meet ${product}`, cta: ctas[0] },
        { angle: "The details", primary: `Take a closer look at ${product}: ${facts[1] ? `${facts[1]}.` : ph("material, finish or notable detail")}`, headline: `${product}, up close`, cta: ctas[3] },
        { angle: "Everyday use", primary: `${product} fits into your day. ${ph("how and when it is used")}`, headline: brand ? `${brand}, every day` : `Made for every day`, cta: ctas[2] },
        { angle: "Why choose it", primary: `${facts[2] ? `${facts[2]}.` : ph("what sets it apart, confirmed")}\n\nAvailable now${brand ? ` from ${brand}` : ""}.`, headline: `Why ${product}?`, cta: ctas[1] },
      ]
    : [
        { angle: "Le produit", primary: `Découvrez ${who}.\n\n${facts[0] ? `${facts[0]}.` : ph("bénéfice principal, confirmé")}`, headline: tagline || `Découvrez ${product}`, cta: ctas[0] },
        { angle: "Les détails", primary: `${product} de près : ${facts[1] ? `${facts[1]}.` : ph("matière, finition ou détail remarquable")}`, headline: `${product}, de près`, cta: ctas[3] },
        { angle: "Au quotidien", primary: `${product} trouve sa place dans votre quotidien. ${ph("comment et quand il s'utilise")}`, headline: brand ? `${brand}, au quotidien` : "Pensé pour tous les jours", cta: ctas[2] },
        { angle: "Pourquoi le choisir", primary: `${facts[2] ? `${facts[2]}.` : ph("ce qui le distingue, confirmé")}\n\nDisponible dès maintenant${brand ? ` chez ${brand}` : ""}.`, headline: `Pourquoi ${product} ?`, cta: ctas[1] },
      ];
  for (const g of generic) if (out.length < count) out.push(g);
  return out.slice(0, count);
}

/**
 * Annonces locales d'une entreprise de services : appel à prendre rendez-vous, demander un devis ou appeler.
 * Prestations, zone et horaires repris tels que saisis (traduits seulement s'ils l'ont été) ; sinon espaces réservés.
 */
function localServiceAds(p: Project, lang: Lang, count: number): AdDraft[] {
  const sameLang = (p.settings.language ?? "fr") === lang;
  const en = lang === "en";
  const ctas = SERVICE_AD_CTAS[lang];
  const main = serviceCta(p, lang);
  const brand = p.brand?.name?.trim() || p.product.name?.trim() || "";
  const activity = (sameLang ? p.product.category?.trim() || p.product.name?.trim() : "") || brand || (en ? "our services" : "nos prestations");
  const tagline = sameLang ? p.brand?.tagline?.trim() : "";
  const offer = sameLang ? (p.services?.services ?? []).filter((x) => x.name.trim()) : [];
  const where = p.services?.area?.trim() || p.services?.address?.trim() || "";
  const book = howToBook(p.services);
  const out: AdDraft[] = [];
  const noDot = (t?: string) => (t ?? "").trim().replace(/[.!]+$/, "");
  // Une annonce par prestation décrite (au plus count - 2), puis les modèles génériques.
  offer.filter((x) => x.description?.trim()).slice(0, Math.max(0, count - 2)).forEach((x, i) => {
    out.push({ angle: x.name, primary: [`${noDot(x.description)}.`, where ? (en ? `Where: ${where}.` : `Où : ${where}.`) : "", book].filter(Boolean).join("\n\n"), headline: x.name.slice(0, 40), cta: i % 2 ? ctas[3] : main });
  });
  const svc = offer[0];
  const lead = (sep: string) => {
    const who = brand && brand !== activity ? `${brand}${sep}${activity}` : activity;
    return `${who}${svc && svc.name !== activity ? `, ${svc.name.toLowerCase()}` : ""}${where && !areaMentioned(who, where) ? `, ${where}` : ""}.`;
  };
  const generic: AdDraft[] = en
    ? [
        { angle: "Book an appointment", primary: `${lead(": ")}\n\n${book}`, headline: (tagline || (where ? `${activity}, ${where}` : activity)).slice(0, 40), cta: main },
        { angle: "Our services", primary: offer.length ? `What we offer:\n${offer.slice(0, 4).map((x) => `• ${x.name}`).join("\n")}` : unknownText("liste des prestations", "list of services"), headline: brand ? `${brand}'s services`.slice(0, 40) : "Our services", cta: ctas[3] },
        { angle: "Close to you", primary: `${where ? `We work in ${where}.` : unknownText("zone d'intervention", "service area")}${p.services?.hours?.trim() ? `\nHours: ${p.services.hours.trim()}.` : ""}\n\n${book}`, headline: where ? `In ${where}`.slice(0, 40) : `Near you`, cta: p.services?.phone?.trim() ? ctas[2] : main },
        { angle: "Why choose us", primary: `${unknownText("ce qui vous distingue, confirmé", "what sets you apart, confirmed")}\n\n${book}`, headline: brand ? `Why ${brand}?`.slice(0, 40) : "Why choose us?", cta: ctas[1] },
      ]
    : [
        { angle: "Prendre rendez-vous", primary: `${lead(" · ")}\n\n${book}`, headline: (tagline || (where ? `${activity}, ${where}` : activity)).slice(0, 40), cta: main },
        { angle: "Nos prestations", primary: offer.length ? `Ce que nous proposons :\n${offer.slice(0, 4).map((x) => `• ${x.name}`).join("\n")}` : unknownText("liste des prestations", "list of services"), headline: brand ? `Les prestations ${brand}`.slice(0, 40) : "Nos prestations", cta: ctas[3] },
        { angle: "Près de chez vous", primary: `${where ? `Nous intervenons : ${where}.` : unknownText("zone d'intervention", "service area")}${p.services?.hours?.trim() ? `\nHoraires : ${p.services.hours.trim()}.` : ""}\n\n${book}`, headline: where ? `${where}`.slice(0, 40) : "Près de chez vous", cta: p.services?.phone?.trim() ? ctas[2] : main },
        { angle: "Pourquoi nous choisir", primary: `${unknownText("ce qui vous distingue, confirmé", "what sets you apart, confirmed")}\n\n${book}`, headline: brand ? `Pourquoi ${brand} ?`.slice(0, 40) : "Pourquoi nous choisir ?", cta: ctas[1] },
      ];
  for (const g of generic) if (out.length < count) out.push(g);
  // Un projet sur devis garde « Demander un devis » ; sinon le bouton de devis cède la place au bouton principal.
  return out.slice(0, count).map((a) => (a.cta === ctas[1] && p.services?.contactMode !== "quote" ? { ...a, cta: main } : a));
}
