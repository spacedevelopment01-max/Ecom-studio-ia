/**
 * Intention d'un contenu : ce qu'il doit accomplir (vendre, rassurer, informer, faire contacter…), déduite du type
 * de contenu, de la demande du client et de l'intention de recherche du mot-clé visé. Gratuit, déterministe.
 */
import { fold } from "./lang";
import type { ContentIntent, ContentType, SearchIntent } from "./types";

/** Intention par défaut de chaque type de contenu. */
export const TYPE_INTENT: Record<ContentType, ContentIntent> = {
  product_page: "sell",
  category_page: "compare",
  service_page: "present_service",
  home_page: "convert",
  brand_page: "brand",
  local_page: "local_traffic",
  blog_article: "inform",
  faq: "answer",
  metadata: "convert",
  ad_copy: "convert",
};

/** Types de contenu reconnus dans une demande en clair (FR / EN / ES). */
const TYPE_WORDS: [RegExp, ContentType][] = [
  [/fiche produit|page produit|product page|ficha de producto|description (du|de mon) produit/, "product_page"],
  [/collection|categorie|category|categoria|rayon/, "category_page"],
  [/page (de )?service|prestation|service page|pagina de servicio/, "service_page"],
  [/accueil|home ?page|pagina de inicio/, "home_page"],
  [/a propos|qui sommes|about|marque|brand|quienes somos/, "brand_page"],
  [/page locale|zone|ville|local page|city|ciudad/, "local_page"],
  [/article|blog|guide|articulo/, "blog_article"],
  [/\bfaq\b|questions? frequentes|preguntas frecuentes/, "faq"],
  [/meta|balise title|titre seo|seo title|meta description/, "metadata"],
  [/publicite|annonce|\bad\b|\bads\b|anuncio/, "ad_copy"],
];

/** Intentions reconnues dans une demande en clair. */
const INTENT_WORDS: [RegExp, ContentIntent][] = [
  [/compar|versus|\bvs\b|ou bien|difference/, "compare"],
  [/expliqu|comment (ca )?marche|how (it|does)|explain|explicar/, "explain"],
  [/rassur|confiance|objection|reassur|trust|tranquiliz/, "reassure"],
  [/vend|achat|convert|sell|buy|vender|comprar/, "sell"],
  [/repond|question|answer|responder/, "answer"],
  [/local|ville|zone|near|cerca|ciudad/, "local_traffic"],
  [/informer|inform|guide|conseil|tips|consejo/, "inform"],
  [/marque|histoire|brand|story|marca/, "brand"],
];

export function detectContentType(text: string): ContentType | null {
  const t = fold(text);
  return TYPE_WORDS.find(([re]) => re.test(t))?.[1] ?? null;
}

/** Intention du contenu : demande explicite > intention du mot-clé (pour un article) > défaut du type. */
export function contentIntent(type: ContentType, o: { request?: string | null; searchIntent?: SearchIntent | null; business?: "products" | "services" } = {}): ContentIntent {
  const t = fold(o.request ?? "");
  const asked = t ? INTENT_WORDS.find(([re]) => re.test(t))?.[1] : undefined;
  if (asked) return asked;
  if (type === "blog_article" && o.searchIntent) return o.searchIntent === "commercial" ? "compare" : o.searchIntent === "local" ? "local_traffic" : o.searchIntent === "transactional" ? "convert" : "inform";
  if (type === "home_page" && o.business === "services") return "present_service";
  return TYPE_INTENT[type];
}

/** Ce que chaque intention exige du texte (consigne de rédaction et de relecture). */
export const INTENT_GOAL: Record<ContentIntent, { fr: string; en: string }> = {
  inform: { fr: "répondre complètement à la question, sans détour commercial", en: "answer the question fully, without a sales detour" },
  compare: { fr: "aider à choisir avec des critères concrets", en: "help choose with concrete criteria" },
  explain: { fr: "expliquer simplement comment ça marche", en: "explain simply how it works" },
  sell: { fr: "donner les raisons concrètes d'acheter et lever les doutes", en: "give concrete reasons to buy and remove doubts" },
  reassure: { fr: "répondre aux craintes avec des faits confirmés", en: "answer concerns with confirmed facts" },
  convert: { fr: "mener à une action claire (acheter, contacter, réserver)", en: "lead to one clear action (buy, contact, book)" },
  present_service: { fr: "dire précisément ce qui est fait, pour qui, où, et comment demander", en: "say precisely what is done, for whom, where, and how to ask" },
  answer: { fr: "donner des réponses courtes et exactes", en: "give short, exact answers" },
  local_traffic: { fr: "montrer la présence réelle dans la zone, sans pages de villes en série", en: "show real presence in the area, without mass city pages" },
  brand: { fr: "dire qui est derrière la marque et ce qui la guide, sans histoire inventée", en: "say who is behind the brand and what guides it, with no invented story" },
};
