/**
 * SEO Quality Gate V2 : contrôles LOCAUX gratuits (affirmations, sources, caractéristiques, informations
 * commerciales, formules creuses, sur-optimisation, doublons, structure, métadonnées, liens) puis relecture
 * éditoriale IA (10 critères). Une politique par type : fiche produit, service, collection, accueil, article,
 * métadonnées, stratégie, audit technique.
 *
 * Jamais FINAL : sans relecture (contrôles locaux seuls → PROVISOIRE, à valider par le client) ; avec une
 * information à compléter ; avec une affirmation inventée, une source inexistante, une caractéristique fausse ou
 * une information commerciale non confirmée (défauts bloquants, reprise ciblée sur les blocs fautifs).
 */
import { z } from "zod";
import type { Project } from "../projects";
import { decide, type GateDecision } from "../quality/gate";
import type { Deliverable } from "../quality/policies";
import { lintClaims, lintHollow } from "../ai/tasks";
import { allowedText } from "./facts";
import { blockText, META_DESC_TARGET, plainText, SEO_TITLE_TARGET, stripInline, wordCount } from "./doc";
import { fold, langPack } from "./lang";
import { EDITORIAL_CRITERIA, type Block, type ContentDoc, type ContentType, type EditorialCriterion, type EditorialReview, type PageRef, type SeoStrategy, type VerifiedFacts } from "./types";

export const DELIVERABLE_OF: Record<ContentType, Deliverable> = {
  product_page: "seo_product_v2",
  category_page: "seo_category_v2",
  service_page: "seo_service_v2",
  local_page: "seo_service_v2",
  home_page: "seo_home_v2",
  brand_page: "seo_home_v2",
  blog_article: "seo_article_v2",
  faq: "seo_product_v2",
  metadata: "seo_metadata_v2",
  ad_copy: "seo_metadata_v2",
};

export type LocalContentCheck = { codes: string[]; issues: string[]; blocks: string[]; placeholders: number; score: number; measures: Record<string, number | string | null> };

const PLACEHOLDER = /\[(À|A) compléter[^\]]*\]|\[To complete[^\]]*\]|\[Por completar[^\]]*\]/gi;
/** Commerce : livraison, retours, prix, promotions, délais, tarifs — non confirmés = bloquant. */
const COMMERCIAL = /livraison|retour|shipping|returns?|prix|price|promotion|tarif|rate|délai|response time|disponibilit|availability|devis gratuit|free quote|rareté|scarcity|essai|trial/i;
/** Sources et chiffres d'autorité inventés : études, statistiques, citations attribuées. */
const SOURCE_RE = [
  /selon (une|des|plusieurs) (étude|enquête|recherche|sondage)s?|d'après (une|des) (étude|enquête)s?|(une|des) études? (montre|prouve|révèle)nt?|les experts (s'accordent|recommandent)|according to (a|one|recent) (study|survey|research)|studies (show|prove|suggest)|research shows|experts (agree|recommend)|según (un|una|varios) (estudio|encuesta)s?|los estudios (muestran|demuestran)/i,
  /\b\d{1,3}(?:[.,]\d+)?\s?%\s?(des|of|de los|de las)\b/i,
  /«[^»]{10,}»\s*,?\s*(explique|déclare|affirme|selon)|"[^"]{10,}"\s*,?\s*(says|said|explains)/i,
];
/** Mesures (caractéristiques) : un nombre + unité non confirmé est inventé ; contradictoire avec un fait = faux. */
const MEASURE = /(\d+(?:[.,]\d+)?)\s?(ml|cl|l|g|kg|mg|cm|mm|m|h|heures?|hours?|min|w|mah|v|go|gb|to|tb|°c)\b/gi;

function shingles(s: string, n = 5): Set<string> {
  const w = fold(s).split(/[^a-z0-9]+/).filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(" "));
  return out;
}
export function similarity(a: string, b: string): number {
  const A = shingles(a);
  const B = shingles(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / Math.min(A.size, B.size);
}

/** Prose d'un document (paragraphes et réponses, sans « à compléter ») : base de la détection de doublons. */
export const proseOf = (doc: Pick<ContentDoc, "blocks">) =>
  doc.blocks
    .map((b) => (b.kind === "p" ? b.text : b.kind === "faq" ? b.a : ""))
    .join(" ")
    .replace(PLACEHOLDER, " ")
    .trim();

const textOf = (b: Block) => ("items" in b ? b.items.join(" ") : "q" in b ? `${b.q} ${b.a}` : b.text);

/**
 * Contrôles locaux d'un document (gratuits). `others` : textes des autres pages du projet (doublons).
 * `pages` : pages connues — un lien vers une adresse absente est un lien inventé.
 */
export function localContentChecks(doc: ContentDoc, p: Project, f: VerifiedFacts, o: { others?: { key: string; text: string }[]; pages?: PageRef[] } = {}): LocalContentCheck {
  const codes = new Set<string>();
  const issues: string[] = [];
  const blocks = new Set<string>();
  const allowed = allowedText(f);
  const add = (code: string, issue: string, blockId?: string) => {
    codes.add(code);
    issues.push(issue);
    if (blockId) blocks.add(blockId);
  };
  const pack = langPack(doc.lang);
  const avoid = f.claimsToAvoid.map((x) => fold(x.replace(/\(.*?\)/g, "").trim())).filter((x) => x.length > 2);

  const all: Block[] = [...doc.blocks, { id: "meta", kind: "p", text: `${doc.meta.seoTitle} ${doc.meta.metaDescription}` }];
  for (const b of all) {
    const t = stripInline(textOf(b)).replace(PLACEHOLDER, " ");
    // Affirmations non confirmées (motifs partagés avec la rédaction du studio).
    for (const c of lintClaims(t, p)) {
      if (COMMERCIAL.test(c.label)) add("unconfirmed_commercial", `information commerciale non confirmée : « ${c.term} » (${c.label})`, b.id);
      else add("invented_claim", `affirmation non confirmée : « ${c.term} » (${c.label})`, b.id);
    }
    for (const a of avoid) if (fold(t).includes(a)) add("forbidden_claim", `affirmation à éviter : « ${a} »`, b.id);
    for (const re of SOURCE_RE) {
      const m = t.match(re);
      if (m && !allowed.includes(m[0].toLowerCase())) add("invented_source", `source ou statistique non fournie : « ${m[0]} »`, b.id);
    }
    for (const m of t.matchAll(MEASURE)) {
      const v = m[0].toLowerCase().replace(",", ".");
      const unit = m[2].toLowerCase();
      const flat = allowed.replace(",", ".");
      if (flat.includes(v) || flat.includes(v.replace(/\s/g, ""))) continue;
      const same = [...flat.matchAll(MEASURE)].filter((x) => x[2].toLowerCase() === unit);
      if (same.length) add("wrong_fact", `caractéristique fausse : « ${m[0]} » (confirmé : ${same.map((x) => x[0]).join(", ")})`, b.id);
      else add("invented_claim", `caractéristique non confirmée : « ${m[0]} »`, b.id);
    }
    // Formules creuses (communes + propres à la langue).
    const hollow = [...lintHollow(t).map((x) => x.term), ...pack.hollow.map((re) => t.match(re)?.[0]).filter((x): x is string => !!x)];
    for (const h of new Set(hollow)) add("hollow_copy", `formule creuse : « ${h} »`, b.id);
  }

  // Liens : seulement vers des pages existantes connues (une page prévue n'a pas encore d'adresse).
  const urls = new Set((o.pages ?? doc.links).filter((x) => x.status === "existing" && x.url).map((x) => x.url!));
  if (f.contact.bookingUrl) urls.add(f.contact.bookingUrl);
  for (const b of doc.blocks) {
    for (const m of textOf(b).matchAll(/\[([^\]]+)\]\(([^)]*)\)/g)) if (!urls.has(m[2])) add("invented_link", `lien vers une page inconnue : ${m[2]}`, b.id);
    if (b.kind === "cta" && b.url && !urls.has(b.url)) add("invented_link", `bouton vers une page inconnue : ${b.url}`, b.id);
  }

  // Structure : un seul H1 (pages et articles), pas de niveau sauté.
  const needsH1 = !["faq", "metadata", "ad_copy"].includes(doc.type);
  const h1 = doc.blocks.filter((b) => b.kind === "h1").length;
  if (needsH1 && h1 !== 1) add("bad_structure", h1 ? `${h1} titres H1 (un seul attendu)` : "titre H1 absent");
  let last = 1;
  for (const b of doc.blocks) {
    if (b.kind === "h2") last = 2;
    else if (b.kind === "h3") {
      if (last < 2) add("bad_structure", `intertitre H3 « ${b.text} » sans H2 au-dessus`, b.id);
      last = 3;
    }
  }

  // Métadonnées : présentes ; 60 / 155 caractères visés (signalés, non bloquants : ce sont des cibles).
  if (!doc.meta.seoTitle.trim() || !doc.meta.metaDescription.trim()) add("missing_meta", "titre SEO ou méta-description absent");
  if (doc.meta.seoTitle.length > SEO_TITLE_TARGET) issues.push(`titre SEO de ${doc.meta.seoTitle.length} caractères (${SEO_TITLE_TARGET} visés)`);
  if (doc.meta.metaDescription.length > META_DESC_TARGET) issues.push(`méta-description de ${doc.meta.metaDescription.length} caractères (${META_DESC_TARGET} visés)`);

  // Sur-optimisation : le mot-clé répété pour lui-même.
  const text = plainText(doc).replace(PLACEHOLDER, " ");
  const words = wordCount(text);
  if (doc.primaryKeyword) {
    const k = fold(doc.primaryKeyword);
    const n = k.length > 2 ? fold(text).split(k).length - 1 : 0;
    const density = words ? (n * k.split(/\s+/).length) / words : 0;
    if (n >= 3 && (density > 0.04 || n > 8)) add("keyword_stuffing", `mot-clé « ${doc.primaryKeyword} » répété ${n} fois (${Math.round(density * 100)} % du texte)`);
    if (n === 0 && !["faq", "metadata", "ad_copy"].includes(doc.type) && !fold(doc.meta.seoTitle).includes(k)) issues.push(`mot-clé « ${doc.primaryKeyword} » absent du texte et du titre`);
  }

  // Doublons : avec les autres pages du projet (paragraphes et réponses : coordonnées et listes partagées ne
  // comptent pas), puis phrases répétées dans la page.
  const prose = proseOf(doc);
  for (const x of o.others ?? []) {
    const s = similarity(prose, x.text);
    if (s > 0.5 && wordCount(x.text) > 30 && wordCount(prose) > 30) add("duplicate_content", `texte trop proche de « ${x.key} » (${Math.round(s * 100)} %)`);
  }
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => fold(s).trim()).filter((s) => s.split(" ").length >= 6);
  const dup = sentences.filter((s, i) => sentences.indexOf(s) !== i);
  if (dup.length) add("duplicate_content", `phrase répétée : « ${dup[0].slice(0, 60)} »`);

  const placeholders = (JSON.stringify(doc.blocks).match(PLACEHOLDER) ?? []).length + (`${doc.meta.seoTitle} ${doc.meta.metaDescription}`.match(PLACEHOLDER) ?? []).length;
  const score = Math.max(0, 10 - codes.size * 1.5 - Math.min(3, placeholders * 0.3) - (issues.length - codes.size) * 0.2);
  return { codes: [...codes], issues: [...new Set(issues)], blocks: [...blocks], placeholders, score: Math.round(score * 10) / 10, measures: { words, h1, placeholders, seoTitle: doc.meta.seoTitle.length, metaDescription: doc.meta.metaDescription.length } };
}

// ---------------------------------------------------------------- relecture éditoriale (IA)

const sc = z.coerce.number().min(0).max(10).catch(0);
export const EditorialReviewSchema = z.object({
  criteria: z.object(Object.fromEntries(EDITORIAL_CRITERIA.map((k) => [k, sc])) as Record<EditorialCriterion, typeof sc>),
  issues: z.array(z.string()).catch([]),
  invented: z.array(z.string()).catch([]),
  fix: z.object({ blockIds: z.array(z.string()).catch([]), instruction: z.string().catch("") }).catch({ blockIds: [], instruction: "" }),
});

export const REVIEW_SYSTEM = `Rôle : rédacteur en chef et consultant SEO senior. Tu relis UN contenu web avec ses faits vérifiés et son brief.
Note de 0 à 10 : relevance (répond au besoin du lecteur), accuracy (exact au regard des faits fournis), usefulness, naturalness (ni robotique ni bourré de mots-clés), originality (pas un texte générique interchangeable), clarity, structure, brand (ton de la marque), commercial (donne envie d'agir sans exagérer), intent_fit (adapté à l'intention).
« invented » : chaque affirmation absente des faits fournis (caractéristique, chiffre, garantie, avis, délai, qualification, source, étude). Sois strict : 8 se mérite ; un texte propre mais générique ne dépasse pas 6 en originality.
« fix » : les identifiants des blocs à reprendre et LA consigne de correction (vide si rien).`;

export function reviewPrompt(doc: ContentDoc, f: VerifiedFacts, goal: string): string {
  return [
    `Type : ${doc.type}. Langue : ${doc.lang}. Intention : ${goal}. Mot-clé visé : ${doc.primaryKeyword ?? "aucun"}.`,
    `Faits vérifiés : ${JSON.stringify({ faits: f.facts, reponses: f.answers, prestations: f.services, zone: f.area, livraison: f.shipping, retours: f.returns, prix: f.price, preuves: f.proofs })}`,
    `Titre SEO : ${doc.meta.seoTitle}\nMéta-description : ${doc.meta.metaDescription}`,
    `Blocs : ${JSON.stringify(doc.blocks.map((b) => ({ id: b.id, kind: b.kind, text: blockText(b) })))}`,
    `Réponds { "criteria": { ${EDITORIAL_CRITERIA.map((k) => `"${k}": 0`).join(", ")} }, "issues": [], "invented": [], "fix": { "blockIds": [], "instruction": "" } }.`,
  ].join("\n");
}

export function reviewCodes(r: EditorialReview): string[] {
  const c: string[] = [];
  if (r.invented.length) c.push("invented_claim");
  if (r.criteria.accuracy < 5) c.push("wrong_fact");
  if (r.criteria.intent_fit < 5) c.push("intent_mismatch");
  if (r.criteria.naturalness < 5) c.push("hollow_copy");
  return c;
}

export const editorialScore = (r: EditorialReview) => {
  const w: Record<EditorialCriterion, number> = { relevance: 1.5, accuracy: 1.5, usefulness: 1.2, naturalness: 1, originality: 1, clarity: 1, structure: 0.8, brand: 0.8, commercial: 1, intent_fit: 1.2 };
  const tot = EDITORIAL_CRITERIA.reduce((s, k) => s + w[k], 0);
  return Math.round((EDITORIAL_CRITERIA.reduce((s, k) => s + r.criteria[k] * w[k], 0) / tot) * 10) / 10;
};

/**
 * Décision : défauts locaux d'abord ; relecture en panne → jamais validée ; sans relecture → PROVISOIRE au mieux ;
 * information à compléter → jamais FINAL (PROVISOIRE, à compléter par le client).
 */
export function gateContent(o: { type: ContentType; local: LocalContentCheck; review: EditorialReview | null; reviewError?: string | null; attempt: number }): GateDecision {
  const d = DELIVERABLE_OF[o.type];
  let decision: GateDecision;
  if (o.local.codes.length) decision = decide(d, { checker: o.review ? "ai" : "local", score: o.review ? editorialScore(o.review) : o.local.score, codes: [...o.local.codes, ...(o.review ? reviewCodes(o.review) : [])], issues: o.local.issues }, { attempt: o.attempt });
  else if (o.reviewError) decision = decide(d, { checker: "ai", score: null, error: o.reviewError }, { attempt: o.attempt });
  else if (!o.review) decision = decide(d, { checker: "local", score: o.local.score }, { attempt: o.attempt });
  else decision = decide(d, { checker: "ai", score: editorialScore(o.review), criteria: o.review.criteria, codes: reviewCodes(o.review), issues: [...o.review.issues, ...o.review.invented.map((x) => `inventé : ${x}`), ...(o.review.fix.instruction ? [o.review.fix.instruction] : [])] }, { attempt: o.attempt });
  if (decision.verdict === "FINAL" && o.local.placeholders > 0)
    return { ...decision, verdict: "PROVISIONAL", reason: `${o.local.placeholders} information(s) à compléter : jamais final avant complément`, provisional: { use: "manual", label: "needs_improvement" } };
  return decision;
}

// ---------------------------------------------------------------- stratégie et audit (politiques dédiées)

/** Contrôle d'une stratégie : nature des données affichée, aucune donnée chiffrée sans fournisseur, pas de cannibalisation, aucune URL inventée. */
export function checkStrategy(s: SeoStrategy, provider: string | null): { codes: string[]; issues: string[] } {
  const codes: string[] = [];
  const issues: string[] = [];
  if (!provider && s.clusters.some((c) => [c.primary, ...c.variants].some((k) => k.metrics || k.source !== "semantic_hypothesis"))) {
    codes.push("unsourced_metrics");
    issues.push("donnée de recherche sans fournisseur vérifié");
  }
  if (!s.dataNote) {
    codes.push("unsourced_metrics");
    issues.push("nature des données non indiquée");
  }
  if (s.priorityPages.some((x) => x.status === "planned" && x.url)) {
    codes.push("invented_link");
    issues.push("adresse donnée à une page qui n'existe pas encore");
  }
  const primaries = s.priorityPages.map((x) => x.primaryKeyword).filter((x): x is string => !!x).map(fold);
  if (new Set(primaries).size !== primaries.length) {
    codes.push("cannibalization");
    issues.push("deux pages visent la même requête principale");
  }
  return { codes, issues };
}

export function gateStrategy(s: SeoStrategy, provider: string | null): GateDecision {
  const c = checkStrategy(s, provider);
  return decide("seo_strategy_v2", { checker: "local", score: c.codes.length ? 4 : 7, codes: c.codes, issues: c.issues });
}
