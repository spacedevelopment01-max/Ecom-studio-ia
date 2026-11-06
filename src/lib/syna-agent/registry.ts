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

/** Catalogue envoyé au modèle : nom, module, nature, accord requis et schéma JSON exact des arguments. */
export function toolCatalog(hasProject: boolean): string {
  return allTools()
    .filter((t) => hasProject || !t.needsProject)
    .map((t) => {
      let schema: unknown;
      try { schema = z.toJSONSchema(t.args, { unrepresentable: "any" }); } catch { schema = { type: "object" }; }
      const flags = [t.kind, typeof t.sensitive === "function" ? "accord selon les arguments" : t.sensitive ? "accord explicite" : null, t.estimate ? "payant (budget)" : null].filter(Boolean).join(", ");
      return `### ${t.name} — module ${t.module} (${flags})\n${t.description}\nArguments : ${JSON.stringify(stripMeta(schema))}`;
    })
    .join("\n\n");
}

function stripMeta(s: any): any {
  if (Array.isArray(s)) return s.map(stripMeta);
  if (!s || typeof s !== "object") return s;
  const { $schema, additionalProperties, ...rest } = s;
  return Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, stripMeta(v)]));
}
