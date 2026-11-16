/**
 * La marque du projet telle que SINA l'a créée (écran « Marque ») : nom, signature, logo, couleurs, polices, voix,
 * images et charte. Lecture seule, permise pendant la construction avec SINA.
 */
import { ownedProject, requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";
import type { Ctx } from "@/lib/route-helpers";
import { brandSheetOf } from "@/lib/syna-agent/brand-sheet";

export const runtime = "nodejs";

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  ownedProject(user, id);
  return Response.json(brandSheetOf(id), { headers: { "Cache-Control": "private, no-store" } });
});
