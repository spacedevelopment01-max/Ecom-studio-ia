import { handle, ok, body } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { z } from "zod";
import { assertConversationEnabled, conversationView, projectConversation, openProjectConversation } from "@/lib/orchestrator/conversation";
export const runtime = "nodejs";
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  assertConversationEnabled(); const {user, project:p} = await projectFromCtx(ctx), c = projectConversation(user, p.id);
  return ok({conversation: c ? conversationView(user, c.id) : null});
});
export const POST = handle(async (req: Request, ctx: Ctx) => {
  assertConversationEnabled(); const {user,project:p} = await projectFromCtx(ctx);
  const b = await body(req,z.object({ draftId:z.string().min(1).max(80).optional(), draftRevision:z.number().int().min(0).optional() }).strict().refine(v=>!v.draftId || v.draftRevision!=null,"Révision du brouillon requise / Draft revision required"));
  const c = openProjectConversation(user,p.id,b.draftId,b.draftRevision);
  return ok(conversationView(user,c.id));
});
