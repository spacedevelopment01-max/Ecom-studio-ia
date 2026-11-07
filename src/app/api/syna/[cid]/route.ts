import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { handle, ok, body } from "@/lib/http";
import type { Ctx } from "@/lib/route-helpers";
import { assertSynaAgent } from "@/lib/syna-agent/enabled";
import { submitMessage, threadView } from "@/lib/syna-agent/loop";
export const runtime = "nodejs";
export const GET = handle(async (_req: Request, ctx: Ctx<{ cid: string }>) => {
  assertSynaAgent(); const user = await requireUser(), { cid } = await ctx.params;
  return ok(threadView(user, cid));
});
const Message = z.object({ requestId: z.string().min(1).max(120), text: z.string().trim().min(1).max(8000), attachmentIds: z.array(z.string().max(40)).max(12).optional() }).strict();
export const POST = handle(async (req: Request, ctx: Ctx<{ cid: string }>) => {
  assertSynaAgent(); const user = await requireUser(), { cid } = await ctx.params;
  submitMessage(user, cid, await body(req, Message));
  return ok(threadView(user, cid));
});
