/** Liaison API des documents déjà écrits avec chaque section et chaque média final. */
import { z } from "zod";
import { llmJson } from "../ai/llm";
import { brainContext } from "../brain/facade";
import { DIRECTIONS } from "../theme/directions";
import { ShopCopySchema } from "../theme/copy";
import { PLANS } from "../plans";
import { requirePlan } from "../plan-gates";
import { getJsonSetting } from "../settings";
import { blockText } from "../seo-v2/doc";
import { lintHollow, lintClaims, aiCopyReview, copyReviewPassed } from "../ai/tasks";
import { apiEvidence } from "./evidence";
import { exactInstructions } from "./instructions";
import type { JobContext } from "../jobs";
import type { Project } from "../projects";
import type { Contents, ThemeRecommendation } from "./types";

const text = z.string().trim().min(1).max(2400);
export const EditorialSchema = z.object({
  blocks: z.array(z.object({ pageKey: text, sectionKey: text, objective: text, message: text, docKey: text, blockIds: z.array(text).min(1), mediaSlotKeys: z.array(text), rationale: text })),
  slots: z.array(z.object({ key: text, pageKey: text, sectionKey: text, scene: text, queries: z.array(z.string().min(2).max(100)).min(2).max(3), caption: text, alt: text, rationale: text })),
  // Les documents restent la référence. L'API complète seulement les libellés/liaisons manquants de l'ancien contrat.
  copy: ShopCopySchema,
  recommendation: z.object({ recommendedId: text, reasons: z.array(text).min(1), alternatives: z.array(z.object({ id: text, reasons: z.array(text).min(1) })).min(1).max(3) }),
  missing: z.array(text).max(30),
});

export function recommendationCatalogue(p: Project): ThemeRecommendation["catalogue"] {
  const max = PLANS[requirePlan(null, p.id)].themes;
  const states = getJsonSetting<Record<string, "available" | "in_progress" | "incompatible">>("theme.catalog.status", {});
  return DIRECTIONS.map((d, i) => ({ id: d.id, name: d.name, status: i >= max ? "incompatible" : states[d.id] ?? "available", reason: i >= max ? "Hors droits du forfait du projet" : states[d.id] === "in_progress" ? "En cours : indisponible à la sélection" : "Identifiant existant du catalogue du studio ; aucune nouvelle démonstration ajoutée automatiquement" }));
}

export function bindEditorial(c: Contents, out: z.infer<typeof EditorialSchema>, catalogue: ThemeRecommendation["catalogue"]): Contents {
  if (out.missing.length) throw new Error(`Informations indispensables à demander avant livraison : ${out.missing.join(" ; ")}`);
  const available = new Set(catalogue.filter(x => x.status === "available").map(x => x.id));
  const choices = [out.recommendation.recommendedId, ...out.recommendation.alternatives.map(x => x.id)];
  if (choices.some(id => !available.has(id)) || new Set(choices).size !== choices.length) throw new Error("Recommandation refusée : identifiant absent, incompatible, en cours ou répété.");
  const placements = new Map(out.slots.map(x => [x.key, x]));
  if (placements.size !== c.slots.length || out.slots.length !== c.slots.length || c.slots.some(s => !placements.has(s.key))) throw new Error("Storyboard incomplet : chaque média final doit avoir une affectation distincte.");
  const slots = c.slots.map(slot => {
    const placement = placements.get(slot.key)!;
    if (!c.pages.some(p => p.key === placement.pageKey && p.sections.some(s => s.key === placement.sectionKey))) throw new Error("Affectation média vers une page/section absente.");
    if (slot.key === "final:video:1" && (placement.pageKey !== "home" || placement.sectionKey !== "hero")) throw new Error("Une vidéo pertinente doit être préparée pour le hero.");
    return { ...slot, ...placement };
  });
  if (new Set(slots.filter(s => s.source === "ai").map(s => s.scene?.trim().toLowerCase())).size !== slots.filter(s => s.source === "ai").length) throw new Error("Scènes IA répétées : dix compositions distinctes nécessaires.");
  const editorial = out.blocks.map(b => {
    const doc = c.documents.find(d => d.docKey === b.docKey);
    if (!doc || doc.doc.page.key !== b.pageKey || !c.pages.some(p => p.key === b.pageKey && p.sections.some(s => s.key === b.sectionKey))) throw new Error("Liaison éditoriale vers un document ou une section absent.");
    const selected = b.blockIds.map(id => doc.doc.blocks.find(x => x.id === id));
    if (selected.some(x => !x)) throw new Error("Bloc rédactionnel inexistant.");
    if (b.mediaSlotKeys.some(k => !slots.some(s => s.key === k && s.pageKey === b.pageKey && s.sectionKey === b.sectionKey))) throw new Error("Texte associé à un média d’un autre emplacement.");
    return { ...b, text: selected.map(x => blockText(x!)).join("\n\n") }; // Aucun texte coupé/réécrit lors de la projection.
  });
  for (const page of c.pages) for (const section of page.sections) if (!editorial.some(b => b.pageKey === page.key && b.sectionKey === section.key)) throw new Error(`Section non rédigée : ${page.key}/${section.key}.`);
  for (const doc of c.documents) for (const block of doc.doc.blocks) if (editorial.filter(b => b.docKey === doc.docKey && b.blockIds.includes(block.id)).length !== 1) throw new Error(`Bloc perdu ou répété dans les sections : ${doc.doc.page.key}/${block.id}.`);
  for (const slot of slots) if (!editorial.some(b => b.mediaSlotKeys.includes(slot.key))) throw new Error(`Média non transmis à une section : ${slot.key}.`);
  const prior = c.recommendation;
  return { ...c, slots, editorial, copy: out.copy, notes: [...c.notes, ...(prior?.selectedId && !available.has(prior.selectedId) ? ["Votre choix de thème est conservé mais devient indisponible : confirmez un choix compatible avant de continuer."] : [])], recommendation: { ...out.recommendation, catalogue, status: prior?.selectedId && available.has(prior.selectedId) ? "selected" : "proposal", ...(prior?.selectedId ? { selectedId: prior.selectedId } : {}) } };
}

export async function prepareEditorial(p: Project, ctx: JobContext, c: Contents) {
  const catalogue = recommendationCatalogue(p);
  const usageKey = `${ctx.job.id}:editorial`;
  const out = await ctx.step("editorial-plan", () => llmJson({ task: "copywriting", userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey,
    promptKey: "preparation.editorial", routing: { difficulty: "complex" }, context: brainContext(p, "shop_copy"),
    system: "Directeur éditorial : réutilise INTÉGRALEMENT les blocs déjà rédigés, ne les réécris pas. Associe chaque bloc et chaque média final à une page/section réellement prévue. Inclus Contact. Pour copy, transpose les textes existants vers les champs de liaison et complète uniquement les libellés absents ; jamais de gabarit ni histoire, délai, garantie, contact ou preuve inventés. Si un fait indispensable manque, renseigne missing plutôt que l’inventer. Produis dix scènes distinctes, composées pour chaque format, références produit fidèles, identité validée. Stock : ambiance déclarée, jamais preuve sur le produit exact, les personnes, les lieux ou réalisations du client. Alt/légende sont des propositions à contrôler sur le résultat réel, pas des observations. Une vidéo en hero, chaque média final affecté, aucune déformation. Recommande seulement des thèmes disponibles parmi les identifiants fournis avec raisons liées à l’offre, conversion, médias, identité, sections. Les métriques SEO restent des hypothèses.",
    prompt: JSON.stringify({ instructions: exactInstructions(p.id), documents: c.documents, pages: c.pages, slots: c.slots, catalogue: catalogue.map(x => ({ ...x, description: DIRECTIONS.find(d => d.id === x.id)?.description })), contacts: p.services, correction: ctx.payload.correction || "", previousSelection: c.recommendation?.selectedId }), maxTokens: 16000,
  }, EditorialSchema));
  if (/\[(?:[ÀA] compl[eé]ter|To complete|Por completar)[^\]]*\]/i.test(JSON.stringify(out.copy))) throw new Error("Copie de liaison à compléter : aucun champ provisoire ne peut devenir une livraison finale.");
  if (!out.copy.hero.heading.trim() || !out.copy.hero.text.trim() || !out.copy.hero.cta.trim() || !out.copy.contact.heading.trim() || !out.copy.contact.text.trim() || !out.copy.seo.title.trim() || !out.copy.seo.description.trim()) throw new Error("Titres, CTA, Contact ou métadonnées SEO incomplets.");
  if (lintHollow(out.copy).length) throw new Error("Copie de liaison à corriger : formules commerciales creuses, reprendre les faits du projet.");
  if (lintClaims(out.copy, p).length) throw new Error("Copie de liaison refusée : allégation non confirmée.");
  const candidate = bindEditorial(c, out, catalogue);
  const review = await ctx.step("editorial-copy-review", () => aiCopyReview({ userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey: `${usageKey}:review` }, p, "Liaisons éditoriales : qualité commerciale, cohérence avec les documents et la direction", candidate.copy));
  if (!copyReviewPassed(review)) throw new Error("Copie de liaison à corriger : contrôle éditorial non satisfait. Documents et versions conservés, aucune réécriture globale automatique.");
  return { ...candidate, execution: apiEvidence(p.id, usageKey) };
}
