/**
 * Vue d'une publication pour l'interface (ancienne ou V2) : statut, réseau, format, médias, pilier, approbation de la
 * version actuelle, défauts bloquants, niveau de prise en charge du réseau.
 */
import { postView } from "../posts";
import type { Project } from "../projects";
import { approvalValid } from "./approval";
import { checkPost } from "./quality";
import { platformSpec } from "./platforms";

export function postViewV2(p: Project, r: any, o: { gate?: boolean } = {}) {
  const base = postView(r);
  const g = o.gate ? checkPost(p, r.id) : null;
  return {
    ...base,
    engine: r.engine ?? "v1",
    pillar: r.pillar ?? null,
    objective: r.objective ?? null,
    approvedValid: approvalValid(r),
    approvedHash: r.approved_hash ?? null,
    userEdited: !!r.user_edited,
    blocking: g?.blocking ?? [],
    issues: g?.issues ?? [],
    level: platformSpec(r.network).level,
  };
}
