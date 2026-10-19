/**
 * Catégorie d'un projet enregistré (serveur) : réglage du client, sinon contrat du parcours amont (Codex, PR #138),
 * sinon règles locales sur les données du projet (store-kind.ts). Jamais déduite du seul nom du produit.
 */
import type { Project } from "../projects";
import { storeKindOf, type StoreKind, type StoreKindVerdict } from "./store-kind";
import { preparedRecommendation } from "./theme-recommendation";

/** Objectif principal connu du projet (réglage « activité » confirmé par le client, sinon inconnu). */
function objectiveOf(p: Pick<Project, "settings">): "purchase" | "quote" | "appointment" | "contact" | null {
  switch (p.settings.activity) {
    case "products": return "purchase";
    case "quote": return "quote";
    case "booking": return "appointment";
    case "local": return "contact";
    default: return null;
  }
}

export function projectStoreKind(p: Pick<Project, "id" | "business" | "storeType" | "catalog" | "settings">): StoreKindVerdict {
  const prepared = preparedRecommendation(p.id);
  return storeKindOf({
    business: p.business,
    storeType: p.storeType,
    catalogSize: p.catalog.length,
    override: p.settings.storeKind ?? null,
    objective: objectiveOf(p),
    prepared: prepared?.kind ?? null,
  });
}

export const projectKind = (p: Pick<Project, "id" | "business" | "storeType" | "catalog" | "settings">): StoreKind => projectStoreKind(p).kind;
