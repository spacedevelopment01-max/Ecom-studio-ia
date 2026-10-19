/**
 * Recommandation de thème : contrat « catégorie du projet / thèmes éligibles / justification ».
 *
 * Le moteur de recommandation du parcours amont (Codex, PR #138, `src/lib/preparation/*`) écrit son résultat dans la
 * mémoire du projet (artefact `project.ready_for_theme`, champ `recommendation` : thème recommandé, alternatives,
 * motifs, catalogue avec statut). Ce module LIT ce résultat sans le recalculer ni le dupliquer : il le confronte à la
 * compatibilité déclarée des thèmes (theme-fit.ts) pour la catégorie du projet, et complète avec des règles locales
 * seulement quand aucun contrat n'existe (provenance indiquée). Il ne change jamais un thème installé : il propose.
 */
import { memory, type Project } from "../projects";
import { ACTIVE_DIRECTIONS, isRetiredDirection } from "./directions";
import { json } from "../db";
import { storeKindOf, type StoreKind, type StoreKindVerdict } from "./store-kind";
import { themeFits, themeFitReason, themeKinds, retiredThemeReason } from "./theme-fit";

/** Partie du contrat amont lue ici (sous-ensemble du `ReadyContract` de la PR #138 ; champs facultatifs tolérés). */
type ContractRecommendation = {
  recommendedId?: string;
  alternatives?: { id: string; reasons?: string[] }[];
  reasons?: string[];
  selectedId?: string;
  status?: "proposal" | "selected";
  catalogue?: { id: string; name?: string; status?: "available" | "in_progress" | "incompatible"; reason?: string }[];
};
type Contract = { revision?: number; provenance?: string; builtAt?: number; recommendation?: ContractRecommendation; clientBrief?: { business?: "products" | "services" }; strategy?: { platform?: { objective?: string } } };

export const READY_CONTRACT_KEY = "project.ready_for_theme";

/** Contrat amont enregistré pour le projet (null sans contrat). */
export function readyContractOf(projectId: string): Contract | null {
  const row = memory(projectId).find((m) => m.kind === "artifact" && m.key === READY_CONTRACT_KEY);
  if (!row) return null;
  const c = json<Contract | null>(row.value, null);
  return c && typeof c === "object" ? c : null;
}

/** Catégorie portée par le contrat amont, quand il la nomme (thème recommandé classé par ses compatibilités). */
export function preparedRecommendation(projectId: string): { kind: StoreKind | null; recommendedId: string | null; revision: number | null; provenance: string | null } | null {
  const c = readyContractOf(projectId);
  if (!c?.recommendation) return null;
  const id = c.recommendation.selectedId ?? c.recommendation.recommendedId ?? null;
  const kinds = id ? themeKinds(id) : [];
  return { kind: kinds.length === 1 ? kinds[0] : null, recommendedId: id, revision: c.revision ?? null, provenance: c.provenance ?? null };
}

export type ThemeRecommendationContract = {
  /** Catégorie du projet et sa justification (réglage du client, contrat amont, règles locales). */
  category: StoreKindVerdict;
  /** Thèmes éligibles pour cette catégorie, dans l'ordre de la bibliothèque. */
  eligible: string[];
  /** Thèmes exclus, avec le motif. */
  excluded: { id: string; reason: string }[];
  /** Thème recommandé (null quand rien ne permet de trancher), ses alternatives et les motifs. */
  recommended: string | null;
  alternatives: { id: string; reasons: string[] }[];
  reasons: string[];
  /** D'où vient la recommandation : contrat amont (moteur Codex) ou règles locales du studio. */
  source: "preparation" | "local" | "none";
  /** Révision et provenance du contrat amont lu (null sans contrat). */
  contract: { revision: number | null; provenance: string | null; status: "proposal" | "selected" | null } | null;
  /** Un thème recommandé par le contrat mais incompatible avec la catégorie : signalé, jamais appliqué. */
  warnings: string[];
};

/**
 * Contrat de recommandation pour un projet : catégorie, éligibilité, justification. Le moteur amont fournit le thème
 * recommandé et ses alternatives ; le studio filtre par compatibilité déclarée et explique chaque exclusion.
 */
export function themeRecommendation(p: Pick<Project, "id" | "business" | "storeType" | "catalog" | "settings">, lang: "fr" | "en" = "fr"): ThemeRecommendationContract {
  const prepared = preparedRecommendation(p.id);
  const category = storeKindOf({
    business: p.business, storeType: p.storeType, catalogSize: p.catalog.length, override: p.settings.storeKind ?? null,
    objective: p.settings.activity === "products" ? "purchase" : p.settings.activity === "quote" ? "quote" : p.settings.activity === "booking" ? "appointment" : p.settings.activity === "local" ? "contact" : null,
    prepared: prepared?.kind ?? null,
  });
  const kind = category.kind;
  // Catalogue actif seulement (consigne 6264783184) : aucun repli vers l'ancien catalogue, même si aucun thème actif ne convient.
  const eligible = ACTIVE_DIRECTIONS.map((d) => d.id).filter((id) => themeFits(id, kind));
  const excluded = ACTIVE_DIRECTIONS.map((d) => d.id).filter((id) => !themeFits(id, kind)).map((id) => ({ id, reason: themeFitReason(id, kind, lang) }));
  const c = readyContractOf(p.id);
  const warnings: string[] = [];
  if (c?.recommendation) {
    const r = c.recommendation;
    const id = r.selectedId ?? r.recommendedId ?? null;
    const known = (x: string | null | undefined): x is string => !!x && ACTIVE_DIRECTIONS.some((d) => d.id === x);
    for (const x of [r.recommendedId, ...(r.alternatives ?? []).map((a) => a.id)]) if (x && isRetiredDirection(x)) warnings.push(lang === "en" ? `The preparation contract cites ${x}, withdrawn from the catalogue: ignored.` : `Le contrat amont cite ${x}, retiré du catalogue : ignoré.`);
    let recommended: string | null = null;
    if (id && !known(id) && !isRetiredDirection(id)) warnings.push(lang === "en" ? `The preparation contract recommends an unknown theme (${id}).` : `Le contrat amont recommande un thème inconnu du studio (${id}).`);
    else if (id && !themeFits(id, kind)) warnings.push(lang === "en" ? `The preparation contract recommends ${id}, which is not designed for a ${kind} project; it is not applied.` : `Le contrat amont recommande ${id}, qui n'est pas conçu pour un projet « ${kind} » ; il n'est pas appliqué.`);
    else recommended = id;
    const alternatives = (r.alternatives ?? []).filter((a) => known(a.id) && themeFits(a.id, kind)).map((a) => ({ id: a.id, reasons: a.reasons ?? [] }));
    return { category, eligible, excluded, recommended, alternatives, reasons: r.reasons ?? [], source: "preparation", contract: { revision: c.revision ?? null, provenance: c.provenance ?? null, status: r.status ?? null }, warnings };
  }
  // Sans contrat amont : aucun thème n'est inventé comme « recommandé » ; les thèmes de référence de la catégorie
  // sont proposés en premier, avec le motif, et la décision reste au client.
  const reference = eligible.filter((id) => themeKinds(id).length === 1);
  return {
    category, eligible, excluded,
    recommended: reference[0] ?? null,
    alternatives: reference.slice(1).map((id) => ({ id, reasons: [lang === "en" ? "Reference theme designed for this category." : "Thème de référence conçu pour cette catégorie."] })),
    reasons: reference.length ? [lang === "en" ? "No preparation contract yet: the reference theme of the category is proposed first; the choice remains yours." : "Aucun contrat amont pour l'instant : le thème de référence de la catégorie est proposé en premier ; le choix vous revient."] : [lang === "en" ? "No preparation contract and no reference theme for this category: all eligible themes are offered without preference." : "Aucun contrat amont ni thème de référence pour cette catégorie : tous les thèmes éligibles sont proposés sans préférence."],
    source: reference.length ? "local" : "none", contract: null, warnings,
  };
}
