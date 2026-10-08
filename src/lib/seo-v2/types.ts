/**
 * SEO, Copywriting & Blog Engine V2 (phase 8A) — types partagés.
 *
 * PROJECT BRAIN → INTENTION DU CONTENU → STRATÉGIE SEO → BRIEF → FAITS VÉRIFIÉS → RÉDACTION (locale, puis IA
 * contrôlée) → RELECTURE ÉDITORIALE → CONTRÔLE SEO → BARRIÈRE → ÉDITION PAR LE CLIENT → EXPORT / PUBLICATION.
 *
 * Règles : aucune donnée de recherche (volume, CPC, difficulté, position) sans source vérifiée — les mots-clés
 * sont des HYPOTHÈSES SÉMANTIQUES tant qu'aucun fournisseur SEO n'est branché ; aucune information produit,
 * commerciale ou de service inventée (une inconnue reste « [À compléter : …] ») ; aucune URL interne inventée.
 */
import type { Verdict } from "../quality/gate";

export const CONTENT_TYPES = [
  "product_page",
  "category_page",
  "service_page",
  "home_page",
  "brand_page",
  "local_page",
  "blog_article",
  "faq",
  "metadata",
  "ad_copy",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

/** Ce que le contenu doit accomplir (une fiche produit vend ; un article répond ; une page de service rassure et fait contacter). */
export const CONTENT_INTENTS = ["inform", "compare", "explain", "sell", "reassure", "convert", "present_service", "answer", "local_traffic", "brand"] as const;
export type ContentIntent = (typeof CONTENT_INTENTS)[number];

/** Intention de recherche d'une requête. */
export const SEARCH_INTENTS = ["informational", "commercial", "transactional", "navigational", "local"] as const;
export type SearchIntent = (typeof SEARCH_INTENTS)[number];

export const LANGS = ["fr", "en", "es"] as const;
export type ContentLang = (typeof LANGS)[number];

/** Donnée de recherche : uniquement si un fournisseur vérifié l'a fournie (sinon null, jamais une estimation). */
export type KeywordMetrics = { volume: number | null; cpc: number | null; difficulty: number | null; source: string; fetchedAt: number } | null;

export type Keyword = {
  term: string;
  intent: SearchIntent;
  /** « semantic_hypothesis » : déduit du projet par le studio, sans donnée de recherche. */
  source: "semantic_hypothesis" | "provider";
  metrics: KeywordMetrics;
  /** Pourquoi cette requête (matière du projet dont elle vient). */
  basis: string;
};

export type KeywordCluster = {
  id: string;
  theme: string;
  primary: Keyword;
  variants: Keyword[];
  questions: string[];
  /** Page qui porte ce groupe (une seule : pas de cannibalisation). */
  page: PageRef | null;
};

export type KeywordResearch = {
  lang: ContentLang;
  country: string;
  clusters: KeywordCluster[];
  /** Conflits détectés : deux pages visent la même requête principale. */
  cannibalization: { term: string; pages: string[] }[];
  opportunities: string[];
  /** Mention obligatoire : nature des données. */
  dataNote: string;
  provider: string | null;
};

/** Page du site : existante (vue dans la boutique créée) ou prévue (proposée par la stratégie) — jamais confondues. */
export type PageRef = { key: string; title: string; url: string | null; kind: "product" | "collection" | "page" | "service" | "home" | "brand" | "local" | "article"; status: "existing" | "planned" };

export type SeoStrategy = {
  lang: ContentLang;
  business: "products" | "services";
  objectives: string[];
  audience: string;
  themes: string[];
  priorityPages: (PageRef & { why: string; primaryKeyword: string | null; intent: ContentIntent })[];
  clusters: KeywordCluster[];
  linking: { from: string; to: string; anchor: string; status: "existing" | "planned" }[];
  local: { area: string | null; opportunities: string[]; schema: string[] } | null;
  improve: { page: string; issues: string[] }[];
  calendar: { week: number; title: string; keyword: string; intent: SearchIntent; type: ContentType }[];
  hreflang: { recommended: boolean; note: string };
  dataNote: string;
  gaps: string[];
};

/** Faits utilisables : confirmés ou saisis par le client. Tout le reste est inconnu. */
export type VerifiedFacts = {
  brand: string;
  offerName: string;
  category: string;
  business: "products" | "services";
  facts: { label: string; value: string }[];
  answers: { q: string; a: string }[];
  objections: { objection: string; answer: string }[];
  proofs: string[];
  services: { name: string; description: string; price?: string; duration?: string }[];
  area: string | null;
  contact: { phone: string | null; email: string | null; address: string | null; hours: string | null; bookingUrl: string | null; mode: string | null };
  /** Livraison / retours : seulement s'ils sont confirmés. */
  shipping: string | null;
  returns: string | null;
  price: string | null;
  claimsToAvoid: string[];
  tone: string[];
  audience: string | null;
  difference: string | null;
  problem: string | null;
  unknowns: string[];
};

export type ContentBrief = {
  type: ContentType;
  intent: ContentIntent;
  lang: ContentLang;
  page: PageRef;
  primaryKeyword: Keyword | null;
  secondaryKeywords: Keyword[];
  questions: string[];
  audience: string;
  angle: string;
  outline: { heading: string; purpose: string; required: boolean }[];
  mustUse: string[];
  forbidden: string[];
  links: PageRef[];
  cta: string | null;
  tone: string[];
};

// ------------------------------------------------------------------------------------------- document éditable

/** Texte en ligne : **gras**, *italique*, [texte](url). Aucune autre balise. */
export type Block =
  | { id: string; kind: "h1" | "h2" | "h3"; text: string }
  | { id: string; kind: "p"; text: string }
  | { id: string; kind: "ul"; items: string[] }
  | { id: string; kind: "ol"; items: string[] }
  | { id: string; kind: "faq"; q: string; a: string }
  | { id: string; kind: "cta"; text: string; url: string | null };

export type ContentDoc = {
  version: number;
  type: ContentType;
  lang: ContentLang;
  page: PageRef;
  primaryKeyword: string | null;
  meta: { seoTitle: string; metaDescription: string; slug: string; canonical: string | null; robots: "index,follow" | "noindex,follow" };
  blocks: Block[];
  /** Données structurées proposées (JSON-LD), à partir des seuls faits confirmés. */
  schema: Record<string, unknown>[];
  /** Liens internes du document (existants / prévus). */
  links: PageRef[];
  meta2: { source: "engine" | "user" | "ai_local" | "ai"; by: "ai" | "local"; runId: string | null; createdFrom: string | null };
};

// ------------------------------------------------------------------------------------------- qualité

export const EDITORIAL_CRITERIA = ["relevance", "accuracy", "usefulness", "naturalness", "originality", "clarity", "structure", "brand", "commercial", "intent_fit"] as const;
export type EditorialCriterion = (typeof EDITORIAL_CRITERIA)[number];

export type EditorialReview = { criteria: Record<EditorialCriterion, number>; issues: string[]; invented: string[]; fix: { blockIds: string[]; instruction: string } };

export type ContentRunResult = {
  runId: string;
  docKey: string | null;
  brief: ContentBrief;
  doc: ContentDoc | null;
  verdict: Verdict;
  codes: string[];
  issues: string[];
  reason: string;
  by: "ai" | "local";
  stats: { writes: number; reviews: number; retries: number; rewrites: number };
  costMicro: number;
  notes: string[];
  skipped: boolean;
};
