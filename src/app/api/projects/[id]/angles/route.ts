/**
 * Les trois angles du projet tels que SINA les a créés (écran « Angles ») : lecture seule, permise pendant la
 * construction avec SINA. Rien n'est créé ni payé ici.
 */
import { ownedProject, requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";
import type { Ctx } from "@/lib/route-helpers";
import { anglesViewOf } from "@/lib/syna-agent/angles";
import { journeyOfProject } from "@/lib/syna-agent/construction";

export const runtime = "nodejs";

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  ownedProject(user, id);
  const j = journeyOfProject(id);
  return Response.json({ angles: j ? anglesViewOf(j) : null }, { headers: { "Cache-Control": "private, no-store" } });
});
