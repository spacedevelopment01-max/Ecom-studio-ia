/**
 * Rédaction V2.
 *
 *  - Rédacteur LOCAL (gratuit, forfait Découverte) : construit le texte à partir des seuls faits vérifiés, dans la
 *    langue demandée (tournures propres à la langue, pas de traduction mot à mot). Toute information manquante
 *    devient « [À compléter : …] ». Il ne remplit jamais pour atteindre une longueur : un article sans IA est un
 *    plan détaillé à compléter, pas un texte de remplissage.
 *  - Rédacteur IA : même brief, mêmes faits, mêmes interdits, réponse structurée en blocs ; le résultat passe
 *    ensuite par les mêmes contrôles (affirmations, formules creuses, liens, métadonnées) que le texte local.
 */
import { z } from "zod";
import { mainCity } from "./keywords";
import { langPack, fold } from "./lang";
import { blockId, CONTENT_DOC_VERSION, META_DESC_TARGET, SEO_TITLE_TARGET, slugify, stripInline, structuredData } from "./doc";
import { INTENT_GOAL } from "./intent";
import { tradeTopics, topicLabel } from "./trade-topics";
import type { Block, ContentBrief, ContentDoc, ContentLang, PageRef, VerifiedFacts } from "./types";

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const tr = (lang: ContentLang, fr: string, en: string, es: string) => (lang === "fr" ? fr : lang === "es" ? es : en);

/** Coupe à la limite visée sur une fin de mot (jamais « … » ajouté, jamais un mot coupé). */
export function fit(s: string, max: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max + 1);
  const at = Math.max(cut.lastIndexOf(" "), cut.lastIndexOf(","));
  return (at > max * 0.5 ? cut.slice(0, at) : t.slice(0, max)).replace(/[\s,;:–—|-]+$/, "");
}

/** Requête (minuscules) → texte affiché : majuscule initiale, ville et marque avec leur casse réelle. */
export function pretty(term: string, f: Pick<VerifiedFacts, "area" | "brand">): string {
  let s = cap(term);
  for (const name of [mainCity(f.area), f.brand].filter((x): x is string => !!x)) {
    const at = fold(s).indexOf(fold(name));
    if (at >= 0 && fold(name).length === name.length) s = s.slice(0, at) + name + s.slice(at + name.length);
  }
  return s;
}

/** Lien en ligne vers une page EXISTANTE ; une page prévue reste du texte (son adresse n'existe pas encore). */
const linkTo = (pg: PageRef, text = pg.title) => (pg.status === "existing" && pg.url ? `[${text}](${pg.url})` : text);

/** Titre SEO naturel et propre à la page : requête visée + marque si la place le permet. */
export function seoTitle(brief: Pick<ContentBrief, "primaryKeyword" | "page" | "type">, f: Pick<VerifiedFacts, "brand" | "offerName" | "area">): string {
  const base = pretty(brief.primaryKeyword?.term ?? brief.page.title, f);
  // Le titre de la page est gardé quand le mot-clé ne le contient pas (titres uniques entre pages).
  const head = brief.type === "blog_article" || fold(base).includes(fold(brief.page.title)) || brief.page.kind === "home" ? base : `${brief.page.title} — ${base}`;
  const withBrand = `${head} | ${f.brand}`;
  return fold(head).includes(fold(f.brand)) ? fit(head, SEO_TITLE_TARGET) : withBrand.length <= SEO_TITLE_TARGET ? withBrand : fit(head, SEO_TITLE_TARGET);
}

/** Méta-description : faits réels de la page + action, 155 caractères visés. */
export function metaDescription(brief: ContentBrief, f: VerifiedFacts): string {
  const lang = brief.lang;
  const parts: string[] = [];
  if (brief.type === "blog_article") parts.push(pretty(brief.primaryKeyword?.term ?? brief.page.title, f).replace(/\s*\?$/, "") + (/:/.test(brief.primaryKeyword?.term ?? brief.page.title) ? "" : lang === "fr" ? " : les points à connaître" : lang === "es" ? ": lo que hay que saber" : ": what to know"));
  else if (f.business === "services") {
    const svc = f.services.find((s) => fold(brief.page.title).includes(fold(s.name).slice(0, 10)));
    parts.push(svc ? `${svc.name}${f.area ? ` — ${f.area}` : ""}` : `${f.brand}${f.area ? ` — ${f.area}` : ""}`);
    // Page d'une prestation : sa description seulement (jamais la liste des autres prestations) ; accueil : la liste.
    parts.push(svc ? svc.description : f.services.map((s) => s.name.toLowerCase()).slice(0, 3).join(", "));
  } else {
    parts.push(brief.page.title);
    const facts = f.facts.slice(0, 2).map((x) => (x.label ? `${x.label.toLowerCase()} ${x.value}` : x.value));
    if (facts.length) parts.push(facts.join(", "));
    if (f.difference) parts.push(f.difference);
  }
  if (brief.cta) parts.push(brief.cta);
  return fit(parts.filter(Boolean).map((x) => cap(x.trim().replace(/[.\s]+$/, ""))).join(". ") + ".", META_DESC_TARGET);
}

// ---------------------------------------------------------------- rédacteur local

type W = { b: Block[]; h1: (t: string) => void; h2: (t: string) => void; h3: (t: string) => void; p: (t: string) => void; ul: (items: string[]) => void; ol: (items: string[]) => void; faq: (q: string, a: string) => void; cta: (t: string, url: string | null) => void };
function writer(): W {
  const b: Block[] = [];
  return {
    b,
    h1: (text) => b.push({ id: blockId(), kind: "h1", text }),
    h2: (text) => b.push({ id: blockId(), kind: "h2", text }),
    h3: (text) => b.push({ id: blockId(), kind: "h3", text }),
    p: (text) => text.trim() && b.push({ id: blockId(), kind: "p", text }),
    ul: (items) => items.length && b.push({ id: blockId(), kind: "ul", items }),
    ol: (items) => items.length && b.push({ id: blockId(), kind: "ol", items }),
    faq: (q, a) => b.push({ id: blockId(), kind: "faq", q, a }),
    cta: (text, url) => b.push({ id: blockId(), kind: "cta", text, url }),
  };
}

/** Titre interrogatif : ponctuation de la langue (« ? » insécable en français, « ¿…? » en espagnol). */
const asQuestion = (s: string, lang: ContentLang) => {
  const t = s.replace(/\s*\?$/, "").replace(/^¿/, "");
  if (!/\b(comment|pourquoi|quel|quelle|quels|quelles|combien|que choisir|est-ce|par ou|how|why|which|what|cómo|por qué|qué|cuánto|cuál)\b/i.test(fold(t)) && !/(cómo|qué|cuánto|cuál)/i.test(t)) return t;
  return lang === "fr" ? `${t} ?` : lang === "es" ? `¿${t}?` : `${t}?`;
};

const sentence = (s: string) => {
  const t = s.trim();
  return t ? cap(t.replace(/[.\s]+$/, "")) + "." : "";
};

export function localDraft(brief: ContentBrief, f: VerifiedFacts, o: { runId?: string | null; pages?: PageRef[] } = {}): ContentDoc {
  const lang = brief.lang;
  const P = langPack(lang);
  const H = P.headings;
  const U = P.unknown;
  const w = writer();
  const city = mainCity(f.area);
  const pages = o.pages ?? brief.links;
  const factLine = (x: { label: string; value: string }) => (x.label ? `**${x.label}** : ${x.value}` : x.value);
  const svcOf = (title: string) => f.services.find((s) => fold(title) === fold(s.name)) ?? f.services.find((s) => fold(title).includes(fold(s.name).slice(0, 10)));

  switch (brief.type) {
    case "product_page": {
      w.h1(f.offerName);
      const intro = `${f.offerName}${fold(f.offerName).includes(fold(f.category)) ? "" : `, ${f.category.toLowerCase()}`}${fold(f.brand) === fold(f.offerName) ? "" : ` ${tr(lang, "de", "by", "de")} ${f.brand}`}`;
      w.p(sentence(f.difference ? `${intro} : ${f.difference.charAt(0).toLowerCase()}${f.difference.slice(1)}` : intro) + (f.problem ? ` ${sentence(`${tr(lang, "Pensé pour", "Made for", "Pensado para")} : ${f.problem.toLowerCase()}`)}` : ""));
      w.h2(H.benefits);
      // Bénéfices : réponses aux objections fournies par le client (les réponses aux questions vont dans la FAQ).
      const benefits = f.objections.map((x) => x.answer).slice(0, 4);
      if (benefits.length) w.ul(benefits.map(sentence));
      else w.p(U(tr(lang, "ce que le produit change concrètement pour l'acheteur", "what the product concretely changes for the buyer", "lo que el producto cambia para el comprador")));
      w.h2(H.specs);
      if (f.facts.length) w.ul(f.facts.map(factLine));
      else w.p(U(tr(lang, "caractéristiques confirmées (dimensions, matières, contenance…)", "confirmed specifications (dimensions, materials, size…)", "características confirmadas")));
      w.h2(H.usage);
      w.p(U(tr(lang, "mode d'emploi ou conseils d'utilisation", "how to use it", "modo de uso")));
      if (f.answers.length || f.objections.length) {
        w.h2(H.faq);
        for (const a of f.answers) w.faq(a.q, sentence(a.a));
        for (const x of f.objections.filter((x) => !f.answers.some((a) => fold(a.q) === fold(x.objection)))) w.faq(x.objection, sentence(x.answer));
      }
      if (f.shipping || f.returns) {
        w.h2(H.delivery);
        if (f.shipping) w.p(sentence(f.shipping));
        if (f.returns) w.p(sentence(f.returns));
      }
      if (f.price) w.p(`**${tr(lang, "Prix", "Price", "Precio")}** : ${f.price}`);
      w.cta(brief.cta ?? P.cta.buy, null);
      break;
    }
    case "category_page": {
      const cat = brief.page.title;
      w.h1(cat);
      w.p(sentence(tr(lang, `La collection ${cat} de ${f.brand}`, `The ${cat} collection from ${f.brand}`, `La colección ${cat} de ${f.brand}`)) + " " + U(tr(lang, "ce que regroupe la collection et pour qui", "what the collection covers and for whom", "qué reúne la colección y para quién")));
      w.h2(H.range);
      const items = pages.filter((x) => x.kind === "product");
      if (items.length) w.ul(items.map((x) => linkTo(x)));
      else w.p(U(tr(lang, "produits de la collection", "products in the collection", "productos de la colección")));
      w.h2(H.criteria);
      w.p(U(tr(lang, "critères concrets pour choisir entre ces produits (taille, usage, matière…)", "concrete criteria to choose between these products", "criterios concretos para elegir")));
      w.cta(brief.cta ?? P.cta.discover, null);
      break;
    }
    case "service_page": {
      const svc = svcOf(brief.page.title);
      const name = svc?.name ?? brief.page.title;
      w.h1(city ? `${name} ${lang === "fr" ? "à" : lang === "es" ? "en" : "in"} ${city}` : name);
      w.p(sentence(svc?.description || tr(lang, `${f.brand} réalise vos travaux de ${name.toLowerCase()}`, `${f.brand} carries out ${name.toLowerCase()} work`, `${f.brand} realiza trabajos de ${name.toLowerCase()}`)) + (f.area ? ` ${sentence(tr(lang, `Intervention : ${f.area}`, `Service area: ${f.area}`, `Zona: ${f.area}`))}` : ""));
      // Spécialités du métier : seulement celles que la prestation déclarée contient (pose de plaques ≠ lissage).
      const { declared } = tradeTopics(["plasterer", "painter", "electrician", "plumber", "tiler", "carpenter", "caterer", "hairdresser"], `${name} ${svc?.description ?? ""}`);
      w.h2(H.services);
      if (declared.length) w.ul(declared.map((t) => cap(topicLabel(t, lang))));
      else w.p(U(tr(lang, "détail de la prestation (travaux réalisés, matériaux)", "details of the service (work done, materials)", "detalle del servicio")));
      if (svc?.price) w.p(`**${tr(lang, "Tarif", "Rate", "Tarifa")}** : ${svc.price}`);
      if (svc?.duration) w.p(`**${tr(lang, "Durée", "Duration", "Duración")}** : ${svc.duration}`);
      w.h2(H.process);
      w.p(U(tr(lang, "déroulé d'une intervention (premier contact, visite, devis, travaux, finitions)", "how a job unfolds (first contact, visit, quote, work, finishing)", "desarrollo de una intervención")));
      if (f.area) {
        w.h2(H.area);
        w.p(sentence(f.area));
      }
      const qs = (brief.questions.length ? brief.questions : []).slice(0, 3);
      if (qs.length || f.answers.length) {
        w.h2(H.faq);
        for (const a of f.answers) w.faq(a.q, sentence(a.a));
        for (const q of qs.filter((q) => !f.answers.some((a) => fold(a.q) === fold(q)))) w.faq(asQuestion(pretty(q, f), lang), U(tr(lang, "votre réponse", "your answer", "su respuesta")));
      }
      w.h2(H.contact);
      contactBlock(w, f, lang);
      w.cta(brief.cta ?? P.cta.quote, f.contact.bookingUrl);
      break;
    }
    case "home_page": {
      if (f.business === "services") {
        w.h1(`${cap(f.category)}${city ? ` ${lang === "fr" ? "à" : lang === "es" ? "en" : "in"} ${city}` : ""} — ${f.brand}`);
        w.p(sentence(f.difference ?? tr(lang, `${f.brand} : ${f.services.map((s) => s.name.toLowerCase()).join(", ")}`, `${f.brand}: ${f.services.map((s) => s.name.toLowerCase()).join(", ")}`, `${f.brand}: ${f.services.map((s) => s.name.toLowerCase()).join(", ")}`)));
        w.h2(H.services);
        const svcPages = pages.filter((x) => x.kind === "service");
        w.ul(f.services.map((s) => {
          const pg = svcPages.find((x) => fold(x.title) === fold(s.name));
          return `${pg ? linkTo(pg, s.name) : s.name}${s.description ? ` — ${s.description}` : ""}`;
        }));
        if (f.area) {
          w.h2(H.area);
          w.p(sentence(f.area));
        }
        w.h2(H.contact);
        contactBlock(w, f, lang);
        w.cta(brief.cta ?? P.cta.quote, f.contact.bookingUrl);
      } else {
        w.h1(`${f.brand} — ${f.offerName}`);
        w.p(sentence(f.difference ?? `${f.offerName}, ${f.category.toLowerCase()}`));
        w.h2(H.benefits);
        if (f.facts.length) w.ul(f.facts.slice(0, 4).map(factLine));
        else w.p(U(tr(lang, "raisons concrètes d'acheter", "concrete reasons to buy", "razones concretas para comprar")));
        const prod = pages.find((x) => x.kind === "product");
        w.cta(brief.cta ?? P.cta.discover, prod?.status === "existing" ? prod.url : null);
      }
      break;
    }
    case "brand_page": {
      w.h1(f.brand);
      w.h2(H.about);
      w.p(U(tr(lang, "qui est derrière la marque, depuis quand, pourquoi (votre histoire réelle)", "who is behind the brand, since when, why (your real story)", "quién está detrás de la marca (su historia real)")));
      if (f.difference) w.p(sentence(f.difference));
      w.h2(H.values);
      w.p(U(tr(lang, "ce qui guide vos choix (matières, fabrication, service)", "what guides your choices", "lo que guía sus decisiones")));
      if (f.business === "services") {
        w.h2(H.contact);
        contactBlock(w, f, lang);
      }
      break;
    }
    case "local_page": {
      w.h1(`${cap(f.category)} — ${f.area ?? U(tr(lang, "zone d'intervention", "service area", "zona"))}`);
      w.h2(H.area);
      w.p(f.area ? sentence(f.area) : U(tr(lang, "communes réellement desservies", "towns actually served", "localidades atendidas")));
      w.h2(H.services);
      w.ul(f.services.map((s) => s.name));
      w.h2(H.practical);
      contactBlock(w, f, lang);
      w.cta(brief.cta ?? P.cta.quote, f.contact.bookingUrl);
      break;
    }
    case "blog_article": {
      // Sans IA : plan détaillé à compléter (aucun texte de remplissage, aucune étude ni statistique inventée).
      const topic = brief.primaryKeyword?.term ?? brief.page.title;
      w.h1(asQuestion(pretty(topic, f), lang));
      w.p(U(tr(lang, `la réponse courte à « ${topic} », en deux phrases`, `the short answer to "${topic}", in two sentences`, `la respuesta corta a «${topic}»`)));
      const qs = brief.questions.filter((q) => fold(q) !== fold(topic)).slice(0, 4);
      for (const q of qs) {
        w.h2(asQuestion(pretty(q, f), lang));
        w.p(U(tr(lang, "votre réponse, avec un exemple concret tiré de votre expérience", "your answer, with a concrete example from your experience", "su respuesta, con un ejemplo concreto")));
      }
      if (!qs.length) {
        w.h2(H.steps);
        w.p(U(tr(lang, "les étapes ou critères à expliquer", "the steps or criteria to explain", "los pasos o criterios")));
      }
      const facts = [...f.facts.map((x) => (x.label ? `${x.label} : ${x.value}` : x.value)), ...f.services.map((s) => s.name)].slice(0, 5);
      if (facts.length) {
        w.h2(H.useful);
        w.ul(facts);
      }
      w.h2(H.conclusion);
      // Page utile : la prestation ou le produit dont parle l'article, sinon l'accueil.
      const words = fold(topic).split(/[^a-z0-9]+/).filter((x) => x.length > 3);
      const money = pages.filter((x) => (f.business === "services" ? x.kind === "service" : x.kind === "product"));
      const target = money.find((x) => words.some((wd) => fold(x.title).includes(wd))) ?? (f.business === "services" ? undefined : money[0]) ?? pages.find((x) => x.kind === "home");
      w.p(U(tr(lang, "l'essentiel à retenir, en une ou deux phrases", "the key takeaway, in one or two sentences", "lo esencial, en una o dos frases")));
      if (target)
        w.p(f.business === "services"
          ? `${tr(lang, `Un projet${city ? ` à ${city} ou dans les environs` : ""} ?`, `A project${city ? ` in or around ${city}` : ""}?`, `¿Un proyecto${city ? ` en ${city} o alrededores` : ""}?`)} ${linkTo(target, target.kind === "home" ? f.brand : target.title)} — ${(brief.cta ?? P.cta.quote).toLowerCase()}.`
          : `${tr(lang, "Voir le produit", "See the product", "Ver el producto")} : ${linkTo(target)}.`);
      break;
    }
    case "faq": {
      w.h2(H.faq);
      for (const a of f.answers) w.faq(a.q, sentence(a.a));
      for (const x of f.objections) w.faq(x.objection, sentence(x.answer));
      for (const q of brief.questions.slice(0, 4).filter((q) => !f.answers.some((a) => fold(a.q) === fold(q)))) w.faq(asQuestion(pretty(q, f), lang), U(tr(lang, "votre réponse", "your answer", "su respuesta")));
      break;
    }
    case "metadata":
      break;
    case "ad_copy": {
      w.h1(f.difference ? cap(fit(f.difference, 60)) : U(tr(lang, "accroche", "hook", "gancho")));
      w.p(f.facts[0] ? sentence(factLine(f.facts[0]).replace(/\*\*/g, "")) : U(tr(lang, "bénéfice principal", "main benefit", "beneficio principal")));
      w.cta(brief.cta ?? P.cta.discover, null);
      break;
    }
  }
  return finishDoc(brief, f, w.b, { source: "engine", by: "local", runId: o.runId ?? null, createdFrom: null });
}

function contactBlock(w: W, f: VerifiedFacts, lang: ContentLang) {
  const items = [
    f.contact.phone ? `${tr(lang, "Téléphone", "Phone", "Teléfono")} : ${f.contact.phone}` : null,
    f.contact.email ? `${tr(lang, "E-mail", "Email", "Correo")} : ${f.contact.email}` : null,
    f.contact.hours ? `${tr(lang, "Horaires", "Hours", "Horario")} : ${f.contact.hours}` : null,
    f.contact.address ? `${tr(lang, "Adresse", "Address", "Dirección")} : ${f.contact.address}` : null,
  ].filter((x): x is string => !!x);
  if (items.length) w.ul(items);
  else w.p(langPack(lang).unknown(tr(lang, "coordonnées de contact", "contact details", "datos de contacto")));
}

export function finishDoc(brief: ContentBrief, f: VerifiedFacts, blocks: Block[], meta2: ContentDoc["meta2"], meta?: Partial<ContentDoc["meta"]>): ContentDoc {
  const doc: ContentDoc = {
    version: CONTENT_DOC_VERSION,
    type: brief.type,
    lang: brief.lang,
    page: brief.page,
    primaryKeyword: brief.primaryKeyword?.term ?? null,
    meta: {
      seoTitle: meta?.seoTitle?.trim() || seoTitle(brief, f),
      metaDescription: meta?.metaDescription?.trim() || metaDescription(brief, f),
      slug: meta?.slug || slugify(brief.type === "blog_article" ? (brief.primaryKeyword?.term ?? brief.page.title) : brief.page.title),
      canonical: brief.page.status === "existing" ? brief.page.url : null,
      robots: "index,follow",
    },
    blocks,
    schema: [],
    links: brief.links,
    meta2,
  };
  doc.schema = structuredData(brief.type, doc, f);
  return doc;
}

// ---------------------------------------------------------------- rédacteur IA

const AiBlock = z.object({
  kind: z.enum(["h1", "h2", "h3", "p", "ul", "ol", "faq", "cta"]).catch("p"),
  text: z.string().optional().catch(undefined),
  items: z.array(z.string()).optional().catch(undefined),
  q: z.string().optional().catch(undefined),
  a: z.string().optional().catch(undefined),
});
export const AiDraftSchema = z.object({
  seoTitle: z.string().catch(""),
  metaDescription: z.string().catch(""),
  blocks: z.array(AiBlock).catch([]),
  unknowns: z.array(z.string()).catch([]),
});
export type AiDraft = z.infer<typeof AiDraftSchema>;

export function writeSystem(lang: ContentLang): string {
  const name = lang === "fr" ? "français" : lang === "es" ? "espagnol" : "anglais";
  return `Rôle : rédacteur SEO et copywriter senior d'une agence (niveau 2026). Tu écris en ${name} natif (adapté, jamais traduit mot à mot).
Règles absolues :
- N'utilise QUE les faits fournis. Toute information absente (dimensions, matières, certifications, garanties, efficacité, avis, résultats, délais, tarifs, années d'expérience, qualifications, livraison, retours) s'écrit « ${langPack(lang).unknown("…")} » — jamais devinée.
- Aucune étude, statistique, citation, source, note ou témoignage inventés. Aucun volume de recherche.
- Écris concret et naturel : un fait précis plutôt qu'un adjectif. Interdit : « expérience unique », « révolutionnez », « qualité exceptionnelle », « solution idéale », « au cœur de », « n'attendez plus » et équivalents.
- Le mot-clé visé apparaît naturellement (H1, début du texte, un intertitre) — jamais répété pour le répéter.
- Pas de remplissage : la longueur suit ce que le lecteur a besoin de savoir.
- Liens : uniquement les pages fournies avec une adresse ; écris-les [texte](adresse). Jamais d'autre adresse.
- Titre SEO autour de ${SEO_TITLE_TARGET} caractères, méta-description autour de ${META_DESC_TARGET} caractères, propres à cette page.
Format : blocs h1 (un seul), h2, h3, p, ul/ol (items), faq (q, a), cta (text). Gras **…**, italique *…*.`;
}

export function writePrompt(brief: ContentBrief, f: VerifiedFacts, o: { fix?: string | null; current?: ContentDoc | null } = {}): string {
  const links = brief.links.filter((l) => l.status === "existing" && l.url).map((l) => ({ title: l.title, url: l.url }));
  const planned = brief.links.filter((l) => l.status !== "existing").map((l) => l.title);
  return [
    `Type : ${brief.type}. Intention : ${brief.intent} (${INTENT_GOAL[brief.intent].fr}).`,
    `Mot-clé visé (hypothèse sémantique, sans donnée de volume) : ${brief.primaryKeyword?.term ?? "aucun"}. Variantes : ${brief.secondaryKeywords.map((k) => k.term).join(", ") || "aucune"}.`,
    `Questions des lecteurs : ${brief.questions.join(" | ") || "aucune"}.`,
    `Public : ${brief.audience}. Angle : ${brief.angle}. Ton : ${brief.tone.join(", ") || "clair, direct"}.`,
    `Plan attendu : ${brief.outline.map((x) => `${x.heading} (${x.purpose}${x.required ? "" : ", facultatif"})`).join(" ; ")}.`,
    `FAITS VÉRIFIÉS (seule matière autorisée) : ${JSON.stringify({ marque: f.brand, offre: f.offerName, categorie: f.category, faits: f.facts, reponses: f.answers, objections: f.objections, preuves: f.proofs, prestations: f.services, zone: f.area, contact: f.contact, livraison: f.shipping, retours: f.returns, prix: f.price, difference: f.difference, probleme: f.problem })}`,
    `INCONNUES (à marquer « à compléter », jamais inventer) : ${f.unknowns.join(" ; ") || "aucune"}.`,
    `INTERDITS : ${brief.forbidden.join(" ; ")}.`,
    `Liens internes possibles (pages existantes) : ${JSON.stringify(links)}. Pages prévues (citer sans lien) : ${planned.join(", ") || "aucune"}.`,
    `Appel à l'action : ${brief.cta ?? "aucun"}.`,
    o.fix && o.current ? `CORRECTION CIBLÉE de la version précédente (ne change que ce qui est demandé) : ${o.fix}\nVersion précédente : ${JSON.stringify(o.current.blocks)}` : "",
    `Réponds { "seoTitle": "…", "metaDescription": "…", "blocks": [{ "kind": "h1", "text": "…" }, { "kind": "ul", "items": ["…"] }, { "kind": "faq", "q": "…", "a": "…" }], "unknowns": ["…"] }.`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Brouillon IA → document (blocs vides écartés, un seul H1, liens hors des pages fournies retirés). */
export function fromAiDraft(brief: ContentBrief, f: VerifiedFacts, d: AiDraft, runId: string | null): ContentDoc {
  const allowed = new Set(brief.links.filter((l) => l.status === "existing" && l.url).map((l) => l.url!));
  const clean = (s: string | undefined) => (s ?? "").replace(/\[([^\]]+)\]\(([^)]*)\)/g, (m, t: string, u: string) => (allowed.has(u) ? m : t)).trim();
  const blocks: Block[] = [];
  let h1 = false;
  for (const x of d.blocks) {
    if (x.kind === "ul" || x.kind === "ol") {
      const items = (x.items ?? []).map(clean).filter(Boolean);
      if (items.length) blocks.push({ id: blockId(), kind: x.kind, items });
    } else if (x.kind === "faq") {
      if (clean(x.q) && clean(x.a)) blocks.push({ id: blockId(), kind: "faq", q: clean(x.q), a: clean(x.a) });
    } else if (x.kind === "cta") {
      if (clean(x.text)) blocks.push({ id: blockId(), kind: "cta", text: stripInline(clean(x.text)), url: null });
    } else if (clean(x.text)) {
      const kind = x.kind === "h1" && h1 ? "h2" : x.kind;
      if (kind === "h1") h1 = true;
      blocks.push({ id: blockId(), kind, text: kind === "p" ? clean(x.text) : stripInline(clean(x.text)) });
    }
  }
  return finishDoc(brief, f, blocks, { source: "engine", by: "ai", runId, createdFrom: null }, { seoTitle: d.seoTitle, metaDescription: d.metaDescription });
}
