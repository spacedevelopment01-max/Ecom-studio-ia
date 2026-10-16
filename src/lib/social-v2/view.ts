/**
 * Vue d'une publication pour l'interface (ancienne ou V2) : statut, réseau, format, médias, pilier, approbation de la
 * version actuelle, défauts bloquants, niveau de prise en charge du réseau.
 */
import { json } from "../db";
import { postView } from "../posts";
import type { Project } from "../projects";
import { approvalValid } from "./approval";
import { checkPost } from "./quality";
import { platformSpec } from "./platforms";
import { visualNoteOf } from "./plan-visuals";

export function postViewV2(p: Project, r: any, o: { gate?: boolean } = {}) {
  const base = postView(r);
  const g = o.gate ? checkPost(p, r.id) : null;
  return {
    ...base,
    engine: r.engine ?? "v1",
    // Semaine éditoriale : le nom du rôle (« Question fréquente »), jamais son code interne (« 5:faq »).
    pillar: (/^\d:/.test(r.pillar ?? "") ? json<{ roleTitle?: string }>(r.brief ?? "{}", {}).roleTitle : null) ?? r.pillar ?? null,
    objective: r.objective ?? null,
    approvedValid: approvalValid(r),
    approvedHash: r.approved_hash ?? null,
    userEdited: !!r.user_edited,
    blocking: g?.blocking ?? [],
    issues: g?.issues ?? [],
    level: platformSpec(r.network).level,
    /** Pourquoi la publication n'a pas (encore) de visuel, dit au client (banque vide, échec signalé…). */
    visualNote: (JSON.parse(r.media || "[]") as string[]).length ? null : visualNoteOf(r.brief),
  };
}
