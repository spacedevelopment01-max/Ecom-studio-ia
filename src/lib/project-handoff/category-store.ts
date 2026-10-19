/** Décision client versionnée, sans modification de thème ni génération. */
import { HttpError } from "../auth";
import { id, json, now, one, tx } from "../db";
import { stableHash } from "../brain/hash";
import { remember, type Project } from "../projects";
import type { Input } from "../preparation/types";
import { recommendProjectCategory, type ProjectCategory } from "./categories";

export const CATEGORY_CHOICE_KEY = "project.theme.category";
export type CategoryChoice = { category: ProjectCategory; contextHash: string; chosenAt: number };
export function categoryContextHash(p: Project, input?: Pick<Input, "description" | "constraints">) {
  return stableHash("project-theme-category", { business: p.business, storeType: p.storeType, catalog: p.catalog, product: p.product, services: p.services, strategy: p.strategy, client: input ?? null });
}
export function categoryForProject(p: Project, input?: Pick<Input, "description" | "constraints">) {
  const row = one<{ value: string; source: string }>("SELECT value,source FROM memory WHERE project_id=? AND kind='artifact' AND key=?", p.id, CATEGORY_CHOICE_KEY);
  const saved = row?.source === "user" ? json<CategoryChoice | null>(row.value, null) : null;
  const contextHash = categoryContextHash(p, input);
  const fresh = saved?.contextHash === contextHash && ((p.business === "services") === (saved.category === "services"));
  const recommendation = recommendProjectCategory(p, input, fresh ? saved!.category : undefined);
  if (saved && !fresh) {
    recommendation.status = "clarification_required"; recommendation.category = null; recommendation.eligibleThemes = [];
    recommendation.clarification = "Votre offre ou votre modèle de vente a changé. Confirmez le type de site à retenir ; le thème et vos contenus restent conservés.";
    recommendation.reasons = ["Votre choix précédent est conservé dans l’historique mais ne s’applique pas automatiquement à ce nouveau contexte.", ...recommendation.reasons];
  }
  return { contextHash, recommendation, explicitChoice: saved, choiceStale: !!saved && !fresh };
}
export function recordCategoryChoice(p: Project, input: Pick<Input, "description" | "constraints"> | undefined, category: ProjectCategory, expectedContextHash: string) {
  return tx(() => {
    const current = categoryForProject(p, input);
    if (current.contextHash !== expectedContextHash) throw new HttpError(409, "Le contexte du projet a changé. Rechargez avant de confirmer le type de site.");
    if ((p.business === "services") !== (category === "services")) throw new HttpError(400, "Ce type de site ne correspond pas à votre offre produit ou service.");
    if (!current.choiceStale && current.explicitChoice?.category === category) return current;
    const choice: CategoryChoice = { category, contextHash: current.contextHash, chosenAt: now() };
    remember(p.id, { kind: "artifact", key: `${CATEGORY_CHOICE_KEY}.version.${id()}`, value: JSON.stringify(choice), source: "user", status: "confirmed" });
    remember(p.id, { kind: "artifact", key: CATEGORY_CHOICE_KEY, value: JSON.stringify(choice), source: "user", status: "confirmed" });
    return categoryForProject(p, input);
  });
}
