import { requireUser } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import type { Ctx } from "@/lib/route-helpers";
import { assertSynaAgent } from "@/lib/syna-agent/enabled";
import { stopRun, threadView } from "@/lib/syna-agent/loop";
export const runtime = "nodejs";
export const POST = handle(async (_req: Request, ctx: Ctx<{ cid: string }>) => {
  assertSynaAgent(); const user = await requireUser(), { cid } = await ctx.params;
  stopRun(user, cid);
  return ok(threadView(user, cid));
});
