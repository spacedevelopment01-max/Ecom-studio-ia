/**
 * Sujet d'une création guidée (publication ou publicité, image ou vidéo) : le client choisit le produit (principal ou
 * du catalogue) ou le service du projet avec lequel travailler. Le visuel part ainsi de la bonne photo et des bonnes
 * informations dès le premier essai (aucun jeton dépensé pour un visuel sur le mauvais produit).
 */
import { all, one } from "./db";
import type { Project } from "./projects";
import type { Asset } from "./library";
import { productReferences } from "./image-v2/engine";

export type CreativeSubject = { kind: "product"; key: string } | { kind: "service"; name: string };

export type SubjectOption = {
  kind: "product" | "service";
  /** Clé du produit (« main » pour le produit principal) ou nom du service. */
  key: string;
  name: string;
  summary: string;
  /** Photo de référence (le vrai produit) ; null pour un service ou un produit sans photo. */
  referenceAssetId: string | null;
};

/** Le produit principal porte cette clé ; les produits du catalogue gardent la leur. */
export const MAIN_PRODUCT = "main";

const catalogReference = (projectId: string, originalId: string | null): string | null => {
  if (!originalId) return null;
  const cut = one<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'catalog-cutout' AND source_asset_id = ? AND deleted_at IS NULL AND status != 'rejected' ORDER BY created_at DESC LIMIT 1", projectId, originalId);
  if (cut) return cut.id;
  const orig = one<{ id: string }>("SELECT id FROM assets WHERE id = ? AND project_id = ? AND deleted_at IS NULL", originalId, projectId);
  return orig?.id ?? null;
};

/** Produits ou services proposés au client, selon le type du projet. */
export function subjectOptions(p: Project): SubjectOption[] {
  if (p.business === "services") {
    return (p.services?.services ?? []).filter((s) => s.name?.trim()).map((s) => ({ kind: "service" as const, key: s.name.trim(), name: s.name.trim(), summary: s.description ?? "", referenceAssetId: null }));
  }
  const main: SubjectOption = { kind: "product", key: MAIN_PRODUCT, name: p.product.name || p.product.category || "Produit", summary: p.product.summary ?? "", referenceAssetId: productReferences(p.id)[0] ?? null };
  const items = (p.catalog ?? []).map((i) => ({ kind: "product" as const, key: i.key, name: i.name, summary: i.description ?? "", referenceAssetId: catalogReference(p.id, i.originalAssetId) }));
  return [main, ...items];
}

/** Sujet demandé, vérifié contre le projet (un sujet inconnu retombe sur le produit principal ou le 1er service). */
export function resolveSubject(p: Project, s: CreativeSubject | null | undefined): SubjectOption | null {
  const opts = subjectOptions(p);
  if (!opts.length) return null;
  if (!s) return opts[0];
  const key = s.kind === "service" ? s.name.trim() : s.key;
  return opts.find((o) => o.kind === s.kind && o.key === key) ?? opts[0];
}

/** Sujet enregistré sur une publication (brief JSON). */
export function subjectOfPost(postId: string): CreativeSubject | null {
  const r = one<{ s: string | null }>("SELECT json_extract(brief, '$.subject') s FROM posts WHERE id = ?", postId);
  if (!r?.s) return null;
  try {
    return JSON.parse(r.s) as CreativeSubject;
  } catch {
    return null;
  }
}

/** Nombre de produits/services (pour l'interface : un seul choix possible ⇒ pas de liste). */
export const subjectCount = (p: Project) => subjectOptions(p).length;

/** Les publications qui portent un sujet donné (pour éviter de faire deux fois le même visuel). */
export const postsWithSubject = (projectId: string, key: string) => all<{ id: string }>("SELECT id FROM posts WHERE project_id = ? AND json_extract(brief, '$.subject.key') = ?", projectId, key).map((r) => r.id);
