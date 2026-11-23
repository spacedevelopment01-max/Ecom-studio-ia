import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handle, ok, body } from "@/lib/http";
import type { Ctx } from "@/lib/route-helpers";
import { assertSynaAgent } from "@/lib/syna-agent/enabled";
import { accepterLaProposition, refuserLaProposition } from "@/lib/syna-agent/devants-actions";
export const runtime = "nodejs";
/** « Oui, finis-les » (la carte d'accord à 0 % s'ouvre) ou « Plus tard », sous le message posé quand des planches sont incomplètes. */
export const POST = handle(async (req: Request, ctx: Ctx<{ cid: string }>) => {
  assertSynaAgent(); const user = await requireUser(), { cid } = await ctx.params;
  const { empreinte, oui } = await body(req, z.object({ empreinte: z.string().max(400), oui: z.boolean() }).strict());
  return ok(oui ? await accepterLaProposition(user, cid, empreinte) : refuserLaProposition(user, cid, empreinte));
});
