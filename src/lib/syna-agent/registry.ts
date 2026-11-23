/** Registre commun des outils SINA : une seule source pour le choix des outils, les droits, le coût et la confirmation. */
import { z } from "zod";
import type { AgentTool, ToolContext } from "./types";
import { TOOL_LIST } from "./tools";
import { stepReady } from "./journey";

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
 * court-circuitent (prototypes de thèmes, maquettes images, site construit sur un thème
 * choisi à la place du client, angle choisi hors parcours, préparation du Pilote, projet créé à la main) ne sont ni
 * proposés ni exécutés ; les outils des ANCIENNES maquettes ne servent qu'aux projets déjà commencés avec elles.
 */
export type ToolScope = { inJourney: boolean; legacyMockups: boolean; /** Conversation aiguillée (voir conversation.ts) : la notice d'un autre outil se demande avec tools.open. */ routed?: boolean };
const STEP9_TOOLS = new Set(["posts.plan", "posts.create", "posts.validate"]);
/** Outils des étapes 10 à 13 (tools/steps-late.ts) et l'étape qui les ouvre. */
const LATE_STEP_TOOLS: Record<string, number> = { "ads.create": 10, "ads.validate": 10, "calendar.validate": 11, "blog.topics": 12, "blog.write": 12, "blog.validate": 12, "files.tidy": 13, "files.validate": 13 };
/**
 * Lot 4 (16 novembre 2026) : une seule façon de faire le site (site.create). Les anciennes façons ne sont plus ni
 * proposées ni exécutées pendant le parcours : le choix « thème du Studio ou sur mesure », les 15 thèmes à monter, la
 * question de famille et d'ambiance, les deux concepts, la conception à part, la composition dictée, et les retouches
 * de l'ancien moteur. Elles seront retirées du code quand l'essai réel du lot aura réussi.
 */
const OLD_SITE_WAYS = ["site.mode", "theme.propose", "theme.choose", "theme.images", "theme.brand", "theme.validate", "theme.families", "theme.family", "theme.ambiance",
  "custom.concepts", "custom.concept", "custom.design", "custom.compose", "site.outline", "site.edit", "site.versions", "site.use_version", "site.pages"];
const JOURNEY_HIDDEN = new Set(["site.mockups", "site.mockup_images", "site.build", "project.create", ...OLD_SITE_WAYS]);
const LEGACY_MOCKUP = /^(mockup\.|site\.code_from_mockup$|site\.images$|site\.photo_reject$)/;
export function toolVisible(name: string, scope?: ToolScope): boolean {
  // tools.open n'existe que pour une conversation aiguillée : ailleurs, SINA a déjà toutes les notices.
  if (name === "tools.open") return !!scope?.routed;
  // Outils d'une étape construite mais pas encore ouverte par le propriétaire : ni proposés ni exécutés.
  if (STEP9_TOOLS.has(name) && !stepReady(9)) return false;
  const late = LATE_STEP_TOOLS[name];
  if (late && !stepReady(late)) return false;
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
  return `### ${t.name} — module ${t.module} (${flags})\n${t.description}\nArguments : ${argsCourts(schema)}`;
}

/**
 * Les arguments d'un outil en écriture courte (23 novembre 2026, notices plus courtes) : la même forme et les mêmes
 * règles que le schéma JSON (noms, types, valeurs permises, bornes, motifs, valeurs par défaut, champs facultatifs
 * marqués « ? »), environ deux fois moins de signes. Ce que l'écriture courte ne connaît pas est recopié tel quel.
 */
const CONNUS = new Set(["$schema", "type", "properties", "required", "additionalProperties", "items", "minItems", "maxItems", "minLength", "maxLength", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "enum", "const", "anyOf", "oneOf", "pattern", "format", "default", "description", "propertyNames"]);
const borne = (min: unknown, max: unknown, unite = ""): string => {
  // Les bornes d'un entier quelconque (± 9 007 199 254 740 991) ne disent rien : elles ne sont pas écrites.
  const lu = (v: unknown) => (typeof v === "number" && Math.abs(v) < Number.MAX_SAFE_INTEGER ? v : null);
  const a = lu(min), b = lu(max);
  return a != null && b != null ? (a === b ? `${a}${unite}` : `${a} à ${b}${unite}`) : b != null ? `≤ ${b}${unite}` : a != null ? `≥ ${a}${unite}` : "";
};
export function argsCourts(n: any): string {
  if (n === true || n == null || typeof n !== "object" || !Object.keys(n).some((k) => k !== "$schema")) return "tout";
  const precisions: string[] = [];
  let s: string;
  if (n.const !== undefined) s = JSON.stringify(n.const);
  else if (Array.isArray(n.enum)) s = n.enum.map((v: unknown) => JSON.stringify(v)).join("|");
  else if (Array.isArray(n.anyOf) || Array.isArray(n.oneOf)) s = (n.anyOf ?? n.oneOf).map(argsCourts).join(" | ");
  else if (Array.isArray(n.type)) s = n.type.map((t: string) => argsCourts({ ...n, type: t, default: undefined, description: undefined })).join(" | ");
  else if (n.type === "object") {
    const req = new Set<string>(n.required ?? []);
    const parts = Object.entries((n.properties ?? {}) as Record<string, unknown>).map(([k, v]) => `${k}${req.has(k) ? "" : "?"}: ${argsCourts(v)}`);
    if (n.additionalProperties && typeof n.additionalProperties === "object") parts.push(`[clé${n.propertyNames && Object.keys(n.propertyNames).some((k) => k !== "type" || n.propertyNames.type !== "string") ? ` ${argsCourts(n.propertyNames)}` : ""}]: ${argsCourts(n.additionalProperties)}`);
    else if (n.propertyNames || n.additionalProperties === true) parts.push("[clé]: tout");
    s = `{${parts.join(", ")}}`;
  } else if (n.type === "array") {
    s = `[${argsCourts(n.items ?? {})}]`;
    const b = borne(n.minItems, n.maxItems, " éléments");
    if (b) precisions.push(b);
  } else if (n.type === "string") {
    s = "texte";
    const b = borne(n.minLength, n.maxLength, " signes");
    if (b) precisions.push(b);
    if (n.pattern) precisions.push(`motif /${n.pattern}/`);
    if (n.format) precisions.push(`format ${n.format}`);
  } else if (n.type === "integer" || n.type === "number") {
    s = n.type === "integer" ? "entier" : "nombre";
    const b = borne(n.minimum, n.maximum);
    if (b) precisions.push(b);
    if (typeof n.exclusiveMinimum === "number") precisions.push(`> ${n.exclusiveMinimum}`);
    if (typeof n.exclusiveMaximum === "number") precisions.push(`< ${n.exclusiveMaximum}`);
  } else if (n.type === "boolean") s = "booléen";
  else if (n.type === "null") s = "null";
  else s = "tout";
  if (n.default !== undefined) precisions.push(`défaut ${JSON.stringify(n.default)}`);
  if (typeof n.description === "string") precisions.push(`« ${n.description} »`);
  const autres = Object.keys(n).filter((k) => !CONNUS.has(k));
  if (autres.length) precisions.push(JSON.stringify(Object.fromEntries(autres.map((k) => [k, n[k]]))));
  return precisions.length ? `${s} (${precisions.join(", ")})` : s;
}

/** Catalogue envoyé au modèle : la notice de chaque outil proposé à ce fil. */
export function toolCatalog(hasProject: boolean, scope?: ToolScope): string {
  return allTools()
    .filter((t) => hasProject || !t.needsProject)
    .filter((t) => toolVisible(t.name, scope))
    .map(toolEntry)
    .join("\n\n");
}

