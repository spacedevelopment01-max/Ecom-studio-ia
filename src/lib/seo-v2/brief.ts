/**
 * Brief d'un contenu : type, intention, mot-clé visé (hypothèse), questions, public, angle, plan, faits à utiliser,
 * interdits, liens internes possibles (existants ou prévus) et appel à l'action. Gratuit, déterministe.
 */
import type { Project } from "../projects";
import { verifiedFacts } from "./facts";
import { contentIntent, INTENT_GOAL } from "./intent";
import { fold, langPack } from "./lang";
import type { ContentBrief, ContentLang, ContentType, Keyword, PageRef, SeoStrategy, VerifiedFacts } from "./types";

type Outline = ContentBrief["outline"];

function outlineFor(type: ContentType, f: VerifiedFacts, lang: ContentLang): Outline {
  const H = langPack(lang).headings;
  const o = (heading: string, purpose: string, required = true) => ({ heading, purpose, required });
  switch (type) {
    case "product_page":
      return [
        o("H1", "nom du produit + ce qu'il est"),
        o(H.intro, "accroche concrète : à quoi il sert, pour qui"),
        o(H.benefits, "bénéfices tirés des faits confirmés"),
        o(H.specs, "caractéristiques confirmées uniquement", f.facts.length > 0),
        o(H.usage, "usage, seulement s'il est connu", false),
        o(H.faq, "questions avec réponse confirmée", f.answers.length > 0),
        o(H.delivery, "seulement si confirmé", !!(f.shipping || f.returns)),
      ];
    case "category_page":
      return [o("H1", "nom de la collection"), o(H.intro, "ce que regroupe la collection"), o(H.range, "les produits, sans doublon de leurs fiches"), o(H.criteria, "critères de choix concrets"), o(H.useful, "informations utiles", false), o(H.faq, "questions fréquentes", false)];
    case "service_page":
      return [o("H1", "prestation + zone"), o(H.intro, "ce qui est fait, pour qui"), o(H.services, "détail de la prestation déclarée"), o(H.process, "déroulé d'une intervention, s'il est confirmé", false), o(H.area, "zone réelle", !!f.area), o(H.faq, "questions des clients", false), o(H.contact, "comment demander")];
    case "home_page":
      return f.business === "services"
        ? [o("H1", "métier + zone"), o(H.intro, "promesse concrète"), o(H.services, "prestations déclarées, chacune vers sa page"), o(H.area, "zone", !!f.area), o(H.contact, "contact")]
        : [o("H1", "marque + produit"), o(H.intro, "ce que vend la boutique"), o(H.benefits, "raisons d'acheter"), o(H.faq, "questions", false)];
    case "brand_page":
      return [o("H1", "nom de la marque"), o(H.about, "qui est derrière, sans histoire inventée"), o(H.values, "ce qui guide la marque (déclaré)", false), o(H.contact, "contact", false)];
    case "local_page":
      return [o("H1", "métier + zone"), o(H.area, "zone réellement desservie"), o(H.services, "prestations dans cette zone"), o(H.practical, "horaires, contact confirmés"), o(H.faq, "questions locales", false)];
    case "blog_article":
      return [o("H1", "la question du lecteur"), o(H.intro, "la réponse en deux phrases"), o("H2", "développement : une section par sous-question"), o(H.conclusion, "à retenir + lien vers la page utile")];
    case "faq":
      return [o(H.faq, "questions avec réponses confirmées ou à compléter")];
    case "metadata":
      return [o("title", "60 caractères visés"), o("description", "155 caractères visés")];
    case "ad_copy":
      return [o("hook", "accroche"), o("body", "bénéfice"), o("cta", "action")];
  }
}

/** Appel à l'action adapté au type et au mode de contact réel. */
export function ctaFor(type: ContentType, f: VerifiedFacts, lang: ContentLang): string | null {
  const C = langPack(lang).cta;
  if (type === "blog_article") return f.business === "services" ? C.quote : C.discover;
  if (type === "metadata" || type === "faq") return null;
  if (f.business === "services") return f.contact.bookingUrl ? C.book : f.contact.mode === "call" && f.contact.phone ? C.call : f.contact.mode === "booking" ? C.book : C.quote;
  return type === "product_page" ? C.buy : C.discover;
}

export function buildBrief(p: Project, o: { type: ContentType; page: PageRef; lang: ContentLang; strategy: SeoStrategy; request?: string | null; keyword?: Keyword | null; facts?: VerifiedFacts }): ContentBrief {
  const f = o.facts ?? verifiedFacts(p);
  const cluster = o.strategy.clusters.find((c) => c.page?.key === o.page.key) ?? (o.keyword ? o.strategy.clusters.find((c) => fold(c.primary.term) === fold(o.keyword!.term)) : undefined);
  const primary = o.keyword ?? cluster?.primary ?? null;
  const intent = contentIntent(o.type, { request: o.request, searchIntent: primary?.intent ?? null, business: p.business });
  // Liens possibles : pages commerciales et pages liées par la stratégie (existantes ou prévues, jamais inventées).
  const related = new Set(o.strategy.linking.filter((l) => fold(l.from) === fold(o.page.title) || (primary && fold(l.from) === fold(primary.term))).map((l) => fold(l.to)));
  const links = o.strategy.priorityPages.filter((x) => x.key !== o.page.key && (related.has(fold(x.title)) || x.kind === (p.business === "services" ? "service" : "product")) && x.kind !== "brand").slice(0, 5).map(({ key, title, url, kind, status }) => ({ key, title, url, kind, status }));
  const mustUse = [
    ...f.facts.map((x) => (x.label ? `${x.label} : ${x.value}` : x.value)),
    ...f.answers.map((x) => `${x.q} → ${x.a}`),
    ...(o.type === "service_page" ? f.services.filter((s) => fold(o.page.title).includes(fold(s.name).slice(0, 8))).map((s) => `${s.name} ${s.description}`) : f.services.map((s) => s.name)),
    ...(f.area ? [`zone : ${f.area}`] : []),
    ...(f.price ? [`prix : ${f.price}`] : []),
  ];
  return {
    type: o.type,
    intent,
    lang: o.lang,
    page: o.page,
    primaryKeyword: primary,
    secondaryKeywords: cluster?.variants.slice(0, 4) ?? [],
    questions: cluster?.questions ?? [],
    audience: f.audience ?? o.strategy.audience,
    angle: `${INTENT_GOAL[intent][o.lang === "fr" ? "fr" : "en"]}${f.difference ? ` — ${f.difference}` : ""}`,
    outline: outlineFor(o.type, f, o.lang),
    mustUse,
    forbidden: [...f.claimsToAvoid, ...f.unknowns.map((u) => `inventer : ${u}`), "volumes, CPC, classements ou études non sourcés", "avis, notes, témoignages, certifications non fournis"],
    links,
    cta: ctaFor(o.type, f, o.lang),
    tone: f.tone,
  };
}
