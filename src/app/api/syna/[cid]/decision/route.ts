import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handle, ok, body } from "@/lib/http";
import type { Ctx } from "@/lib/route-helpers";
import { assertSynaAgent } from "@/lib/syna-agent/enabled";
import { decidePending, threadView } from "@/lib/syna-agent/loop";
export const runtime = "nodejs";
export const POST = handle(async (req: Request, ctx: Ctx<{ cid: string }>) => {
  assertSynaAgent(); const user = await requireUser(), { cid } = await ctx.params;
  decidePending(user, cid, await body(req, z.object({ pendingId: z.string().max(40), approve: z.boolean() }).strict()));
  return ok(threadView(user, cid));
});
