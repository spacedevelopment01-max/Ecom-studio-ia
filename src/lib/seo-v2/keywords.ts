/**
 * Recherche de mots-clés V2 : requêtes principales, variantes, questions, intentions, regroupement par thème,
 * cannibalisation et opportunités — adaptées à la langue et au pays.
 *
 * IMPORTANT : sans fournisseur SEO branché, ce sont des HYPOTHÈSES SÉMANTIQUES déduites du projet (catégorie,
 * prestations, zone, faits, questions des clients) : aucun volume, CPC, difficulté ni classement n'est donné.
 * Un fournisseur vérifié pourra compléter `metrics` plus tard (interface `KeywordDataProvider`), sans changer le reste.
 */
import type { Project } from "../projects";
import { resolveProductCategory } from "../image-v2/categories";
import { resolveTrade, tradeText } from "../brain/trade";
import { fold, langPack } from "./lang";
import { tradeTopics, topicLabel } from "./trade-topics";
import type { ContentLang, Keyword, KeywordCluster, KeywordMetrics, KeywordResearch, PageRef, SearchIntent } from "./types";

/** Fournisseur de données de recherche vérifiées (aucun n'est branché en 8A). */
export type KeywordDataProvider = { name: string; metrics: (terms: string[], lang: ContentLang, country: string) => Promise<Map<string, NonNullable<KeywordMetrics>>> };
let provider: KeywordDataProvider | null = null;
export const setKeywordProvider = (p: KeywordDataProvider | null) => (provider = p);
export const keywordProvider = () => provider;

export const HYPOTHESIS_NOTE: Record<ContentLang, string> = {
  fr: "Hypothèses sémantiques déduites de votre projet : aucun volume de recherche, CPC, difficulté ni classement réel (aucun outil SEO connecté).",
  en: "Semantic hypotheses derived from your project: no real search volume, CPC, difficulty or ranking (no SEO tool connected).",
  es: "Hipótesis semánticas deducidas de su proyecto: sin volumen de búsqueda, CPC, dificultad ni posicionamiento reales (ninguna herramienta SEO conectada).",
};

/** Ville principale d'une zone saisie (« Mâcon et 30 km autour » → « Mâcon »). */
export function mainCity(area: string | null | undefined): string | null {
  const a = area?.trim();
  if (!a) return null;
  const c = a.split(/\s+(?:et|and|y)\s+|,|\(|\d+\s?km/i)[0].trim();
  return c.length >= 2 ? c : null;
}

const kw = (term: string, intent: SearchIntent, basis: string): Keyword => ({ term: term.toLowerCase().replace(/\s+/g, " ").trim(), intent, source: "semantic_hypothesis", metrics: null, basis });
const id = (s: string) => fold(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

/** Intention d'une requête d'après ses mots (règles simples, multilingues). */
export function classifyIntent(term: string, local: boolean): SearchIntent {
  const t = fold(term);
  if (/\b(acheter|prix|commander|buy|price|order|comprar|precio|pedir)\b/.test(t)) return "transactional";
  if (/\b(meilleur|comparatif|avis|ou|vs|best|review|reviews|mejor|opiniones|comparativa)\b/.test(t)) return "commercial";
  if (/\b(comment|pourquoi|quel|quelle|combien|how|why|which|what|como|por que|que|cuanto)\b/.test(t)) return "informational";
  return local ? "local" : "commercial";
}

export function researchKeywords(p: Project, lang: ContentLang, pages: PageRef[], o: { existingKeywords?: { page: string; term: string }[] } = {}): KeywordResearch {
  const L = langPack(lang);
  const clusters: KeywordCluster[] = [];
  const opportunities: string[] = [];
  const pageOf = (kind: PageRef["kind"], title?: string) => pages.find((x) => x.kind === kind && (!title || fold(x.title) === fold(title))) ?? pages.find((x) => x.kind === kind) ?? null;

  if (p.business === "services") {
    const trade = resolveTrade(tradeText(p), p.product.sector ?? null);
    const parts = trade.parts.length ? trade.parts : p.product.sector === "restauration" ? ["caterer"] : [];
    const label = (lang === "en" ? trade.labels.en : trade.labels.fr) || p.product.category;
    const city = mainCity(p.services.area);
    const loc = (x: string) => (city ? `${x} ${L.modifiers.near(city)}` : x);
    const declaredText = [p.product.summary, p.product.category, ...p.services.services.map((s) => `${s.name} ${s.description ?? ""}`)].join(" ");
    const { declared, toConfirm } = tradeTopics(parts, declaredText);
    // Groupe principal : le métier dans la ville (page d'accueil).
    clusters.push({
      id: `trade-${id(label)}`,
      theme: label,
      primary: kw(loc(label.toLowerCase()), city ? "local" : "commercial", "métier + ville de la zone saisie"),
      variants: [kw(loc(`${label} ${L.modifiers.price}`), "transactional", "métier + prix"), ...(city ? [kw(`${label} ${L.modifiers.review} ${city}`, "commercial", "avis locaux")] : [])],
      questions: [L.questions.choose(label.toLowerCase()), L.questions.price(label.toLowerCase())],
      page: pageOf("home"),
    });
    // Une page par prestation déclarée ; ses spécialités du métier (déclarées) deviennent des variantes.
    for (const s of p.services.services.filter((x) => x.name.trim())) {
      const sub = declared.filter((t) => t.match.test(fold(`${s.name} ${s.description ?? ""}`)));
      clusters.push({
        id: `svc-${id(s.name)}`,
        theme: s.name.trim(),
        primary: kw(loc(s.name.trim().toLowerCase()), city ? "local" : "commercial", "prestation déclarée + ville"),
        variants: [...sub.map((t) => kw(loc(topicLabel(t, lang)), city ? "local" : "commercial", "spécialité du métier présente dans la prestation")), kw(`${s.name.trim().toLowerCase()} ${L.modifiers.price}`, "transactional", "prestation + prix")],
        questions: [...(lang === "fr" ? sub.flatMap((t) => t.questionsFr) : []), L.questions.time(s.name.trim().toLowerCase())].slice(0, 5),
        page: pageOf("service", s.name),
      });
    }
    // Spécialités déclarées sans prestation dédiée : articles de blog (information), jamais une page de service inventée.
    for (const t of declared.filter((t) => !clusters.some((c) => [c.primary, ...c.variants].some((v) => fold(v.term).includes(fold(topicLabel(t, lang))))))) {
      clusters.push({ id: `topic-${t.key}`, theme: topicLabel(t, lang), primary: kw(topicLabel(t, lang), "informational", "spécialité citée dans votre description"), variants: [], questions: lang === "fr" ? t.questionsFr : [], page: null });
    }
    for (const t of toConfirm) opportunities.push(lang === "fr" ? `À confirmer : proposez-vous « ${t.fr} » ? Si oui, une page ou un article dédié peut viser cette recherche.` : `To confirm: do you offer "${topicLabel(t, lang)}"? If so, a dedicated page or article can target it.`);
    if (city) opportunities.push(lang === "fr" ? `Recherche locale : « ${label.toLowerCase()} ${city} » — une seule page locale utile (pas de pages de villes en série).` : `Local search: "${label.toLowerCase()} ${city}" — one useful local page (no mass city pages).`);
  } else {
    const cat = resolveProductCategory(p.product);
    // Le terme de catégorie du client (sa langue) ; sinon le libellé de la catégorie reconnue.
    const base = (lang === "fr" ? p.product.category : lang === "en" ? cat?.labels.en : null)?.trim() || p.product.category.trim() || cat?.labels.fr || p.product.name;
    const name = p.product.name || p.brand?.name || p.name;
    clusters.push({
      id: `product-${id(name)}`,
      theme: name,
      primary: kw(base, "commercial", "catégorie du produit"),
      variants: [kw(`${base} ${L.modifiers.buy}`, "transactional", "achat"), kw(`${base} ${L.modifiers.price}`, "transactional", "prix"), kw(name, "navigational", "nom du produit (recherche de marque)")],
      questions: [...p.product.questions.filter((q) => q.answer).map((q) => q.question.trim().replace(/\s*\?\s*$/, "").toLowerCase()), L.questions.how(base.toLowerCase())].slice(0, 5),
      page: pageOf("product", name),
    });
    const cats = [...new Set(p.catalog.map((c) => c.category.trim()).filter(Boolean))];
    for (const c of cats) clusters.push({ id: `cat-${id(c)}`, theme: c, primary: kw(c, "commercial", "collection du catalogue"), variants: [kw(`${c} ${L.modifiers.buy}`, "transactional", "achat"), kw(L.questions.choose(c.toLowerCase()), "informational", "critères de choix")], questions: [L.questions.which(c.toLowerCase())], page: pageOf("collection", c) });
    // Information (blog) : choisir, utiliser, entretenir — la page produit garde l'achat (pas de cannibalisation).
    clusters.push({ id: `guide-${id(base)}`, theme: `${L.headings.criteria} — ${base}`, primary: kw(L.questions.choose(base.toLowerCase()), "informational", "guide de choix"), variants: [kw(L.questions.which(base.toLowerCase()), "informational", "choix")], questions: [L.questions.why(base.toLowerCase())], page: null });
    clusters.push({ id: `usage-${id(base)}`, theme: `${L.headings.usage} — ${base}`, primary: kw(L.questions.how(base.toLowerCase()), "informational", "usage"), variants: [kw(L.questions.maintain(base.toLowerCase()), "informational", "entretien")], questions: [], page: null });
    if (!p.product.facts.some((f) => f.status === "confirmed")) opportunities.push(lang === "fr" ? "Ajoutez des caractéristiques confirmées : sans elles, la fiche produit reste générique." : "Add confirmed specifications: without them the product page stays generic.");
  }

  // Une variante identique à la requête principale (ou à une autre variante) n'apporte rien.
  for (const c of clusters) {
    const seenV = new Set([fold(c.primary.term)]);
    c.variants = c.variants.filter((v) => !seenV.has(fold(v.term)) && !!seenV.add(fold(v.term)));
  }

  // Cannibalisation : une même requête principale ne peut viser qu'une page.
  const seen = new Map<string, string[]>();
  for (const c of clusters) {
    const k = fold(c.primary.term);
    seen.set(k, [...(seen.get(k) ?? []), c.page?.key ?? c.id]);
  }
  for (const e of o.existingKeywords ?? []) {
    const k = fold(e.term);
    if (seen.has(k)) seen.set(k, [...seen.get(k)!, e.page]);
  }
  const cannibalization = [...seen.entries()].filter(([, v]) => new Set(v).size > 1).map(([term, pages]) => ({ term, pages: [...new Set(pages)] }));
  return { lang, country: L.country, clusters, cannibalization, opportunities, dataNote: provider ? `Données : ${provider.name}` : HYPOTHESIS_NOTE[lang], provider: provider?.name ?? null };
}

/** Données vérifiées d'un fournisseur (si branché) ; sinon les mots-clés restent des hypothèses. */
export async function enrichWithProvider(r: KeywordResearch): Promise<KeywordResearch> {
  if (!provider) return r;
  const terms = r.clusters.flatMap((c) => [c.primary.term, ...c.variants.map((v) => v.term)]);
  const m = await provider.metrics(terms, r.lang, r.country);
  const set = (k: Keyword): Keyword => (m.has(k.term) ? { ...k, source: "provider", metrics: m.get(k.term)! } : k);
  return { ...r, clusters: r.clusters.map((c) => ({ ...c, primary: set(c.primary), variants: c.variants.map(set) })) };
}
