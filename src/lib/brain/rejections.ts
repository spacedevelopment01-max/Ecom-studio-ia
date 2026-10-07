/**
 * Refus du CLIENT (Project Brain 2B) : une vraie décision, mémorisée et rendue comme contrainte ferme dans les vues
 * concernées. Les refus du contrôle qualité, eux, ne sont jamais écrits ici : ce sont des constats sur le générateur,
 * calculés à la lecture (indications faibles). Une panne technique n'est jamais une préférence.
 */
import { remember } from "../projects";
import { norm } from "./trade";

/** Concept refusé d'une piste de logo, d'après sa forme (pas sa couleur : la palette se change sans refuser la piste). */
export function logoRouteConcept(route: { composition?: string; markKind?: string } | null | undefined): { concept: string; label: string } {
  if (route?.composition === "emblem") return { concept: "badge", label: "badge / emblème" };
  switch (route?.markKind) {
    case "monogram":
    case "ai-monogram":
      return { concept: "monogramme", label: "monogramme (initiales)" };
    case "library":
      return { concept: "pictogramme du métier", label: "pictogramme du métier" };
    case "silhouette":
      return { concept: "silhouette du produit", label: "silhouette du produit" };
    case "letter":
      return { concept: "lettre seule", label: "lettre seule" };
    case "ai-symbol":
      return { concept: "symbole dessiné", label: "symbole dessiné" };
  }
  return { concept: route?.composition === "wordmark" ? "logotype seul" : "piste de logo", label: route?.composition === "wordmark" ? "logotype seul (nom sans symbole)" : "piste de logo" };
}

/** Rôles de médias dont un refus dit quelque chose d'un choix CRÉATIF (pas « cette photo-là n'est pas la bonne »). */
const CREATIVE_ROLES = new Set(["lifestyle", "ambiance", "banner", "scene", "social", "ad", "post-photo"]);

/**
 * Refus d'un média par le client (statut « rejected » dans la bibliothèque). Seuls les médias créatifs sont mémorisés ;
 * le concept est le sujet du média (ou son emplacement), jamais un mot deviné.
 */
export function recordMediaRejection(projectId: string, a: { role: string | null; name: string; meta: string | null }) {
  if (!a.role || !CREATIVE_ROLES.has(a.role)) return null;
  let meta: { subject?: string; slot?: string; stock?: unknown } = {};
  try {
    meta = JSON.parse(a.meta ?? "{}");
  } catch {
    /* méta illisible : on s'en tient au rôle */
  }
  const subject = (meta.subject ?? meta.slot ?? a.role).toString().slice(0, 80);
  const concept = norm(subject).replace(/\s+/g, " ").trim() || a.role;
  // Portée « images » : visuels générés ET photos libres (vues image et recherche de photos).
  return remember(projectId, { kind: "rejection", key: `images:${concept}`, value: `Visuels « ${subject} » (ex. « ${a.name.slice(0, 60)} »)`, scope: "images", source: "user", origin: "user", normKey: `images:neg:${concept}` });
}

/** Piste de logo supprimée par le client : la forme est mémorisée comme refus (scope logo). */
export function recordLogoRouteRejection(projectId: string, route: { name?: string; composition?: string; markKind?: string } | null | undefined) {
  const { concept, label } = logoRouteConcept(route);
  return remember(projectId, { kind: "rejection", key: `logo:${concept}`, value: `Pistes de logo de type ${label}${route?.name ? ` (ex. « ${route.name.slice(0, 60)} »)` : ""}`, scope: "logo", source: "user", origin: "user", normKey: `logo:neg:${concept}` });
}
