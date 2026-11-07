import { z } from "zod";
import { requireUser, HttpError } from "@/lib/auth";
import { handle, ok, body } from "@/lib/http";
import { one } from "@/lib/db";
import type { Ctx } from "@/lib/route-helpers";
import { assertSynaAgent } from "@/lib/syna-agent/enabled";
import { authorizeBudgetPct } from "@/lib/syna-agent/budget";
import { threadView } from "@/lib/syna-agent/loop";
export const runtime = "nodejs";
export const POST = handle(async (req: Request, ctx: Ctx<{ cid: string }>) => {
  assertSynaAgent(); const user = await requireUser(), { cid } = await ctx.params;
  const { pct } = await body(req, z.object({ pct: z.number().min(0).max(100) }).strict());
  const c = one<{ user_id: string; project_id: string | null }>("SELECT user_id,project_id FROM agent_conversations WHERE id=?", cid);
  if (!c || c.user_id !== user.id) throw new HttpError(404, "Conversation introuvable.");
  authorizeBudgetPct(user.id, c.project_id, cid, pct);
  return ok(threadView(user, cid));
});
