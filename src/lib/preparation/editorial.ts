/** Liaison API des documents déjà écrits avec chaque section et chaque média final. */
import { z } from "zod";
import { llmJson } from "../ai/llm";
import { brainContext } from "../brain/facade";
import { ShopCopySchema } from "../theme/copy";
import { requirePlan } from "../plan-gates";
import { blockText } from "../seo-v2/doc";
import { lintHollow, lintClaims, aiCopyReview, copyReviewPassed } from "../ai/tasks";
import { apiEvidence } from "./evidence";
import { exactInstructions } from "./instructions";
import type { JobContext } from "../jobs";
import type { Project } from "../projects";
import type { Contents, ThemeRecommendation } from "./types";
import { REFERENCE_THEMES, REFERENCE_THEME_IDS } from "../project-handoff/categories";
import { categoryForProject } from "../project-handoff/category-store";
import { stateOf } from "./store";

const text = z.string().trim().min(1).max(2400);
export const EditorialSchema = z.object({
  blocks: z.array(z.object({ pageKey: text, sectionKey: text, objective: text, message: text, docKey: text, blockIds: z.array(text).min(1), mediaSlotKeys: z.array(text), rationale: text })),
  slots: z.array(z.object({ key: text, pageKey: text, sectionKey: text, scene: text, queries: z.array(z.string().min(2).max(100)).min(2).max(3), caption: text, alt: text, rationale: text })),
  // Les documents restent la référence. L'API complète seulement les libellés/liaisons manquants de l'ancien contrat.
  copy: ShopCopySchema,
  recommendation: z.object({ recommendedReferenceId: z.enum(REFERENCE_THEME_IDS).nullable(), reasons: z.array(text).min(1), alternativesReferenceIds: z.array(z.enum(REFERENCE_THEME_IDS)).max(3) }),
  missing: z.array(text).max(30),
});

export function recommendationCatalogue(p: Project): ThemeRecommendation["catalogue"] {
  requirePlan(null, p.id);
  const category = categoryForProject(p, stateOf(p.id)?.stages.brief?.data.input).recommendation;
  return REFERENCE_THEMES.map(t => {
    const eligible = category.status === "recommended" && t.categories.some(c => c === category.category);
    return { id: t.referenceId, referenceId: t.referenceId, engineThemeId: null, name: t.name, category: t.categories[0], status: eligible ? "in_progress" as const : "incompatible" as const,
      reason: eligible ? "Référence active adaptée à votre catégorie ; raccordement explicite au moteur attendu, aucun thème installable ni repli ancien supposé." : category.status === "clarification_required" ? "Précisez le modèle de votre site avant une recommandation." : "Référence réservée à une autre catégorie d’activité." };
  });
}

/** Le contenu peut être préparé sans fabriquer un thème installable ou effacer un choix historique. */
export function recommendationDataReady(r: ThemeRecommendation | undefined): boolean {
  if (!r || r.status !== "reference_pending" || r.engineThemeId !== null || r.recommendedId !== "") return false;
  const choices = [...(r.recommendedReferenceId ? [r.recommendedReferenceId] : []), ...(r.alternativesReferenceIds ?? [])];
  return choices.length > 0 && new Set(choices).size === choices.length && choices.every(id => REFERENCE_THEME_IDS.includes(id) && r.catalogue.some(c => c.referenceId === id && c.id === id && c.status === "in_progress" && c.engineThemeId === null));
}

/** Un choix de catégorie requalifie localement l'éligibilité, sans réécrire ni repayer les documents. */
export function rebindRecommendationCategory(p: Project, previous?: ThemeRecommendation): ThemeRecommendation {
  const catalogue = recommendationCatalogue(p), projectCategory = categoryForProject(p, stateOf(p.id)?.stages.brief?.data.input).recommendation;
  const eligible = catalogue.filter(c => c.referenceId && c.status === "in_progress").map(c => c.referenceId!);
  const primary = previous?.recommendedReferenceId && eligible.includes(previous.recommendedReferenceId) ? previous.recommendedReferenceId : eligible.length === 1 ? eligible[0] : null;
  return { recommendedId: "", alternatives: [], recommendedReferenceId: primary, alternativesReferenceIds: eligible.filter(id => id !== primary), engineThemeId: null,
    reasons: ["Éligibilité actualisée localement d’après la catégorie du projet. Les textes et médias existants restent conservés ; aucun nouvel appel IA ni choix de thème installé.", ...projectCategory.reasons], projectCategory, catalogue,
    status: eligible.length ? "reference_pending" : "clarification_required", ...(previous?.selectedId ? { selectedId: previous.selectedId } : {}) };
}

export function bindEditorial(c: Contents, out: z.infer<typeof EditorialSchema>, catalogue: ThemeRecommendation["catalogue"]): Contents {
  if (out.missing.length) throw new Error(`Informations indispensables à demander avant livraison : ${out.missing.join(" ; ")}`);
  const eligible = new Set(catalogue.filter(x => x.referenceId && REFERENCE_THEME_IDS.includes(x.referenceId) && x.engineThemeId === null && x.status === "in_progress").map(x => x.referenceId!));
  const choices = [out.recommendation.recommendedReferenceId, ...out.recommendation.alternativesReferenceIds].filter((id): id is NonNullable<typeof id> => id !== null);
  if (choices.some(id => !eligible.has(id)) || new Set(choices).size !== choices.length || (eligible.size > 0 && !out.recommendation.recommendedReferenceId) || (!eligible.size && choices.length)) throw new Error("Recommandation refusée : référence inactive, incompatible, inconnue ou répétée. Aucun repli vers un ancien thème.");
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
  return { ...c, slots, editorial, copy: out.copy, notes: [...c.notes, ...(prior?.selectedId ? ["Votre thème précédemment choisi reste conservé pour la lecture du projet. Il n’est ni migré ni proposé comme nouvelle sélection active."] : []), "La recommandation porte uniquement sur les quatre références actives ; leur raccordement installable appartient au moteur de thème."], recommendation: { ...out.recommendation, recommendedId: "", alternatives: [], engineThemeId: null, catalogue, status: out.recommendation.recommendedReferenceId ? "reference_pending" : "clarification_required", ...(prior?.selectedId ? { selectedId: prior.selectedId } : {}) } };
}

export async function prepareEditorial(p: Project, ctx: JobContext, c: Contents) {
  const catalogue = recommendationCatalogue(p);
  const projectCategory = categoryForProject(p, stateOf(p.id)?.stages.brief?.data.input).recommendation;
  const usageKey = `${ctx.job.id}:editorial`;
  const out = await ctx.step("editorial-plan", () => llmJson({ task: "copywriting", userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey,
    promptKey: "preparation.editorial", routing: { difficulty: "complex" }, context: brainContext(p, "shop_copy"),
    system: "Directeur éditorial : réutilise INTÉGRALEMENT les blocs déjà rédigés, ne les réécris pas. Associe chaque bloc et chaque média final à une page/section réellement prévue. Inclus Contact. Pour copy, transpose les textes existants vers les champs de liaison et complète uniquement les libellés absents ; jamais de gabarit ni histoire, délai, garantie, contact ou preuve inventés. Si un fait indispensable manque, renseigne missing plutôt que l’inventer. Produis dix scènes distinctes, composées pour chaque format, références produit fidèles, identité validée. Stock : ambiance déclarée, jamais preuve sur le produit exact, les personnes, les lieux ou réalisations du client. Alt/légende sont des propositions à contrôler sur le résultat réel, pas des observations. Une vidéo en hero, chaque média final affecté, aucune déformation. Recommandation : uniquement recommendedReferenceId et alternativesReferenceIds parmi les références actives compatibles fournies. Une seule référence éligible suffit : alternativesReferenceIds peut être vide. Si catégorie à clarifier, recommendedReferenceId=null et aucune alternative ; continuer à livrer les textes et affectations sans inventer de thème installable. Aucun ancien thème ni repli. Les métriques SEO restent des hypothèses.",
    prompt: JSON.stringify({ instructions: exactInstructions(p.id), offer: { business: p.business, profile: p.product, storeType: p.storeType, catalogue: p.catalog, services: p.services }, validatedStrategy: p.strategy, projectCategory, referenceThemes: REFERENCE_THEMES, referenceThemeIntegration: "Les referenceId ne sont pas des identifiants installables du catalogue. Leur raccordement explicite est en cours : ne jamais inventer un identifiant ni attribuer une compatibilité à partir du nom du produit. Une clarification requise doit rester explicite ; ne change pas le thème choisi.", documents: c.documents, pages: c.pages, slots: c.slots, catalogue, contacts: p.services, correction: ctx.payload.correction || "", previousSelection: c.recommendation?.selectedId }), maxTokens: 16000,
  }, EditorialSchema));
  if (/\[(?:[ÀA] compl[eé]ter|To complete|Por completar)[^\]]*\]/i.test(JSON.stringify(out.copy))) throw new Error("Copie de liaison à compléter : aucun champ provisoire ne peut devenir une livraison finale.");
  if (!out.copy.hero.heading.trim() || !out.copy.hero.text.trim() || !out.copy.hero.cta.trim() || !out.copy.contact.heading.trim() || !out.copy.contact.text.trim() || !out.copy.seo.title.trim() || !out.copy.seo.description.trim()) throw new Error("Titres, CTA, Contact ou métadonnées SEO incomplets.");
  if (lintHollow(out.copy).length) throw new Error("Copie de liaison à corriger : formules commerciales creuses, reprendre les faits du projet.");
  if (lintClaims(out.copy, p).length) throw new Error("Copie de liaison refusée : allégation non confirmée.");
  const candidate = bindEditorial(c, out, catalogue);
  const review = await ctx.step("editorial-copy-review", () => aiCopyReview({ userId: p.userId, projectId: p.id, jobId: ctx.job.id, usageKey: `${usageKey}:review` }, p, "Liaisons éditoriales : qualité commerciale, cohérence avec les documents et la direction", candidate.copy));
  if (!copyReviewPassed(review)) throw new Error("Copie de liaison à corriger : contrôle éditorial non satisfait. Documents et versions conservés, aucune réécriture globale automatique.");
  return { ...candidate, recommendation: candidate.recommendation ? { ...candidate.recommendation, projectCategory } : undefined, execution: apiEvidence(p.id, usageKey) };
}
