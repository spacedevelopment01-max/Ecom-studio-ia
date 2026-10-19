/** Texte client intégral : les moteurs le reçoivent hors du résumé et hors des budgets du Project Brain. */
import { stateOf } from "./store";
export function exactInstructions(projectId: string): string {
  const b = stateOf(projectId)?.stages.brief?.data.input;
  if (!b) return "";
  return JSON.stringify({
    description_client: b.description,
    cible_client: b.target,
    contraintes_client: b.constraints,
    offre_client: b.offerName,
    lien_client: b.offerUrl || null,
  });
}
