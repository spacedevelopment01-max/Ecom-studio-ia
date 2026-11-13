/** Registre commun des outils SINA : une seule source pour le choix des outils, les droits, le coût et la confirmation. */
import { z } from "zod";
import type { AgentTool, ToolContext } from "./types";
import { TOOL_LIST } from "./tools";

let tools: Map<string, AgentTool> | null = null;
function ensureLoaded() {
  if (tools) return;
  tools = new Map();
  for (const t of TOOL_LIST) {
    if (tools.has(t.name)) throw new Error(`Outil SINA en double : ${t.name}`);
    tools.set(t.name, t);
  }
}

export function getTool(name: string): AgentTool | undefined {
  ensureLoaded();
  return tools!.get(name);
}

export function allTools(): AgentTool[] {
  ensureLoaded();
  return [...tools!.values()];
}

export function isSensitive(t: AgentTool, args: unknown, ctx: ToolContext): boolean {
  return typeof t.sensitive === "function" ? t.sensitive(args, ctx) : !!t.sensitive;
}

/**
 * Outils proposés selon le fil (audit du 10 novembre 2026) : pendant le parcours de création, les anciens chemins qui le
 * court-circuitent (marque et logos d'un coup, prototypes de thèmes, maquettes images, site construit sur un thème
 * choisi à la place du client, angle choisi hors parcours, préparation du Pilote, projet créé à la main) ne sont ni
 * proposés ni exécutés ; les outils des ANCIENNES maquettes ne servent qu'aux projets déjà commencés avec elles.
 */
export type ToolScope = { inJourney: boolean; legacyMockups: boolean; /** Conversation aiguillée (voir conversation.ts) : la notice d'un autre outil se demande avec tools.open. */ routed?: boolean };
const JOURNEY_HIDDEN = new Set(["brand.create", "site.mockups", "site.mockup_images", "site.build", "strategy.choose", "pilot.run", "project.create"]);
const LEGACY_MOCKUP = /^(mockup\.|site\.code_from_mockup$|site\.images$|site\.photo_reject$)/;
export function toolVisible(name: string, scope?: ToolScope): boolean {
  // tools.open n'existe que pour une conversation aiguillée : ailleurs, SINA a déjà toutes les notices.
  if (name === "tools.open") return !!scope?.routed;
  if (!scope) return true;
  if (scope.inJourney && JOURNEY_HIDDEN.has(name)) return false;
  if (!scope.legacyMockups && LEGACY_MOCKUP.test(name)) return false;
  return true;
}

/** Notice d'un outil pour le modèle : nom, module, nature, accord requis et schéma JSON exact des arguments. */
export function toolEntry(t: AgentTool): string {
  let schema: unknown;
  try { schema = z.toJSONSchema(t.args, { unrepresentable: "any" }); } catch { schema = { type: "object" }; }
  const flags = [t.kind, typeof t.sensitive === "function" ? "accord selon les arguments" : t.sensitive ? "accord explicite" : null, t.estimate ? "payant (budget)" : null].filter(Boolean).join(", ");
  return `### ${t.name} — module ${t.module} (${flags})\n${t.description}\nArguments : ${JSON.stringify(stripMeta(schema))}`;
}

/** Catalogue envoyé au modèle : la notice de chaque outil proposé à ce fil. */
export function toolCatalog(hasProject: boolean, scope?: ToolScope): string {
  return allTools()
    .filter((t) => hasProject || !t.needsProject)
    .filter((t) => toolVisible(t.name, scope))
    .map(toolEntry)
    .join("\n\n");
}

function stripMeta(s: any): any {
  if (Array.isArray(s)) return s.map(stripMeta);
  if (!s || typeof s !== "object") return s;
  const { $schema, additionalProperties, ...rest } = s;
  return Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, stripMeta(v)]));
}
