/**
 * Verrous de marque (Project Brain 2B) : ce que le client a validé ne change jamais par un traitement AUTOMATIQUE.
 * Une action EXPLICITE du client peut le remplacer : l'ancien état reste en mémoire comme décision remplacée.
 * brand.logo.assetId reste la source de vérité du logo actuel.
 */
import { run } from "../db";
import { addUsage } from "../library";
import { remember, type Project } from "../projects";

type BrandLike = NonNullable<Project["brand"]>;

export const isLocked = (b: BrandLike | null | undefined, key: "palette" | "fonts" | "logo" | "tagline" | "name") =>
  !!b && ((b.validated ?? []).includes(key) || (key === "logo" && b.logo?.status === "validated"));

/** Décision de marque prise par le client (historique : une nouvelle valeur remplace l'ancienne, qui reste en base). */
export function recordBrandDecision(projectId: string, key: string, value: string) {
  return remember(projectId, { kind: "decision", key: `marque.${key}`, value, source: "user", origin: "user", scope: "brand" });
}

/** Logo actuel de la marque : un seul usage « marque · logo » à jour (le précédent logo n'est plus marqué utilisé). */
export function markBrandLogo(projectId: string, assetId: string) {
  run("DELETE FROM asset_usages WHERE target_type = 'brand' AND target_id = ? AND label = 'logo'", projectId);
  addUsage(assetId, "brand", projectId, "logo");
}
