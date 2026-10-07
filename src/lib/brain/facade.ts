/**
 * Façade de compatibilité (phase 2.1) : projectContext(p, scope) est servi par le Project Brain.
 *
 * Mapping legacy : brand → brand · shop → theme · images → image · video → video · social → social · all → all.
 * Chaque vue legacy = le scope du Brain + ce que l'ancien contexte transmettait toujours (offre, faits, inconnues,
 * prix, variantes, prestations et leurs règles, marque, messages clés, règles de véracité), pour que les modules
 * actuels gardent les informations nécessaires. Depuis la phase 2C, les moteurs reçoivent leur scope EXPLICITE
 * (brainView / brainContext) ; la vue legacy ne sert plus qu'aux outils d'administration (essai d'un prompt).
 *
 * Le contexte VOLATIL (créations récentes) n'est jamais dans le texte renvoyé : il est mémorisé à côté, avec la
 * portée et l'empreinte, et llm.ts le place APRÈS le point de cache. Ce registre n'est pas un cache de contexte :
 * le contexte est recalculé à chaque appel ; le registre ne fait que relier un texte stable à ses métadonnées.
 */
import type { Project } from "../projects";
import { brainSnapshot } from "./snapshot";
import { BUDGETS, contextFor, type BrainItem, type ContextView, type Scope } from "./views";

export type LegacyScope = "all" | "shop" | "images" | "video" | "social" | "brand";

/** Ce que tous les anciens contextes contenaient, quel que soit le scope (sauf les coordonnées et le détail stratégique). */
const CORE = (it: BrainItem) =>
  it.section === "identity" ||
  it.section === "facts" ||
  it.section === "rules" ||
  it.section === "brand" ||
  ["product.price", "product.variants", "product.visual", "product.label", "product.catalog", "services.offer", "services.area", "strategy.messages", "strategy.angles"].includes(it.id);

export const LEGACY_SCOPES: Record<LegacyScope, { scope: Scope; extra: (it: BrainItem) => boolean }> = {
  all: { scope: "all", extra: () => false },
  brand: { scope: "brand", extra: (it) => CORE(it) && it.id !== "brand.social" },
  shop: { scope: "theme", extra: (it) => CORE(it) && it.id !== "brand.social" },
  images: { scope: "image", extra: (it) => CORE(it) && it.id !== "brand.social" },
  video: { scope: "video", extra: (it) => CORE(it) && it.id !== "brand.social" },
  // Réseaux sociaux et publicités (draftAds utilise ce scope) : voix sociale, coordonnées, preuves et objections.
  social: { scope: "social", extra: (it) => CORE(it) || ["services.contact", "strategy.proofs", "strategy.objections", "strategy.platform"].includes(it.id) },
};

export type BrainMeta = { projectId: string; scope: string; hash: string; version: string; volatile: string };

const REGISTRY_MAX = 500;
const registry = new Map<string, BrainMeta>();
const OPEN = "<contexte_projet";
const CLOSE = "</contexte_projet>";

/** Vue de compatibilité d'un scope legacy (budget du scope « all » : souple 12 000, plafond 30 000 caractères). */
export function legacyView(p: Project, scope: LegacyScope = "all"): ContextView {
  const m = LEGACY_SCOPES[scope] ?? LEGACY_SCOPES.all;
  const label = scope === "all" ? "all" : `legacy:${scope}`;
  const view = contextFor(brainSnapshot(p), m.scope, { extra: m.extra, label, budget: BUDGETS.all });
  remember(view.stable, { projectId: p.id, scope: view.label, hash: view.hash, version: view.brainVersion, volatile: view.volatile });
  return view;
}

/**
 * Vue EXPLICITE d'un scope du Brain (phase 2C) : seulement ce qui sert au moteur, budget du scope, empreinte et
 * portée tracées dans ai_calls. « all » est refusé : un moteur reçoit toujours un scope précis.
 */
export function brainView(p: Project, scope: Exclude<Scope, "all">): ContextView {
  if ((scope as Scope) === "all") throw new Error("brainView : un moteur reçoit un scope précis, jamais « all ».");
  const view = contextFor(brainSnapshot(p), scope);
  remember(view.stable, { projectId: p.id, scope: view.label, hash: view.hash, version: view.brainVersion, volatile: view.volatile });
  return view;
}

/** Contexte stable d'un scope explicite (le volatil passe après le point de cache, via le registre). */
export const brainContext = (p: Project, scope: Exclude<Scope, "all">) => brainView(p, scope).stable;

/** Trace Brain d'une génération média dont la consigne a été écrite à partir d'un contexte du Brain. */
export type BrainTrace = { scope: string; hash: string; version: string };
export const brainTraceOf = (v: Pick<ContextView, "label" | "hash" | "brainVersion">): BrainTrace => ({ scope: v.label, hash: v.hash, version: v.brainVersion });

function remember(stable: string, meta: BrainMeta) {
  registry.delete(stable);
  registry.set(stable, meta);
  while (registry.size > REGISTRY_MAX) registry.delete(registry.keys().next().value as string);
}

/**
 * Métadonnées Brain d'un contexte passé à un appel (même s'il a été complété après coup : seul le bloc
 * <contexte_projet> compte). Le volatil n'est rendu que pour le projet de l'appel (jamais celui d'un autre projet).
 */
export function brainMetaOf(context: string | undefined, projectId: string | null | undefined): (Omit<BrainMeta, "volatile"> & { volatile: string }) | null {
  if (!context) return null;
  const a = context.indexOf(OPEN);
  const b = context.indexOf(CLOSE, a);
  if (a < 0 || b < 0) return null;
  const m = registry.get(context.slice(a, b + CLOSE.length));
  if (!m) return null;
  return { ...m, volatile: projectId && m.projectId === projectId ? m.volatile : "" };
}
