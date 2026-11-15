/**
 * État du thème sur mesure du projet, pour l'onglet Boutique (aperçu en grand et désignation d'un élément) :
 * version, pages, choix du client. Lecture seule, permise pendant la construction avec SINA. null : aucun thème.
 */
import { ownedProject, requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";
import type { Ctx } from "@/lib/route-helpers";
import { loadCustomTheme } from "@/lib/syna-agent/custom-theme/theme";

export const runtime = "nodejs";

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  ownedProject(user, id);
  const t = loadCustomTheme(id);
  return Response.json(t ? { rev: t.rev, family: t.family, style: t.style, chosen: !!t.chosen, pages: t.pages.map((p) => ({ key: p.key, label: p.label })), sampleTexts: t.pages.some((p) => p.sections.some((s) => !s.clientTexts)) } : null, { headers: { "Cache-Control": "private, no-store" } });
});
