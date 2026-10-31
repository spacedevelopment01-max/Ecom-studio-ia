import { requireUser } from "@/lib/auth";
import { handle, ok, body } from "@/lib/http";
import type { Ctx } from "@/lib/route-helpers";
import { z } from "zod";
import { assertConversationEnabled, CommandSchema, conversationView, submitConversation } from "@/lib/orchestrator/conversation";
export const runtime = "nodejs";
export const GET = handle(async (req: Request, ctx: Ctx<{cid:string}>) => {
  assertConversationEnabled(); const user = await requireUser(), { cid } = await ctx.params;
  const raw = new URL(req.url).searchParams.get("before");
  const before = raw == null ? undefined : z.coerce.number().int().min(1).max(Number.MAX_SAFE_INTEGER).parse(raw);
  return ok(conversationView(user, cid, before));
});
export const POST = handle(async (req: Request, ctx: Ctx<{cid:string}>) => {
  assertConversationEnabled(); const user = await requireUser(), { cid } = await ctx.params;
  return ok(await submitConversation(user, cid, await body(req, CommandSchema)));
});
