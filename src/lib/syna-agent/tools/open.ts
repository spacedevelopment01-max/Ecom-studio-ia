/**
 * « tools.open » : quand la conversation est aiguillée (réglage « sina.conversation », voir ../conversation.ts), SINA ne
 * reçoit la notice complète que des outils de l'étape. Elle demande ici celle d'un autre outil avant de s'en servir.
 * Gratuit, sans effet sur le projet.
 */
import { z } from "zod";
import { L } from "../../i18n-server";
import type { AgentTool } from "../types";

const openTool: AgentTool<{ names: string[] }> = {
  name: "tools.open",
  module: "outils",
  kind: "read",
  description: "Donne la notice complète (rôle et arguments exacts) d'outils de la liste « Autres outils du Studio », avant de t'en servir. Gratuit. Tu lis les notices dans le résultat, puis tu appelles l'outil voulu à l'étape suivante.",
  args: z.object({ names: z.array(z.string().min(3).max(60)).min(1).max(8) }),
  run: async (_ctx, a) => {
    // Import tardif : le registre charge la liste des outils, dont celui-ci.
    const { getTool, toolEntry } = await import("../registry");
    const known = [...new Set(a.names)].map((n) => getTool(n)).filter((t): t is AgentTool => !!t && t.name !== "tools.open");
    const unknown = a.names.filter((n) => !getTool(n));
    if (!known.length) return { ok: false, internal: true, summary: L(`Aucun outil de ce nom : ${a.names.join(", ")}. Reprends un nom exact de la liste.`, "No tool with that name.") };
    return {
      ok: true,
      summary: L(`Notice de ${known.map((t) => t.name).join(", ")}${unknown.length ? ` (inconnu : ${unknown.join(", ")})` : ""}.`, "Tool notices."),
      hint: "Tu peux maintenant appeler ces outils avec leurs arguments exacts. Ne parle jamais de notice ni d'outil au client.",
      data: { notices: known.map((t) => toolEntry(t)) },
    };
  },
};

export const openTools: AgentTool[] = [openTool];
