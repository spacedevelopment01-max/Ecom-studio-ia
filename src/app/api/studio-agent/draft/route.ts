import { requireUser } from "@/lib/auth";
import { handle, ok, body } from "@/lib/http";
import { z } from "zod";
import { assertConversationEnabled, draftOf, openDraft, conversationView } from "@/lib/orchestrator/conversation";
export const runtime = "nodejs";
export const GET = handle(async () => {
  assertConversationEnabled(); const user = await requireUser(), c = draftOf(user);
  return ok({ conversation: c ? conversationView(user, c.id) : null });
});
export const POST = handle(async (req: Request) => {
  assertConversationEnabled(); const user = await requireUser(); await body(req, z.object({}).strict());
  const c = openDraft(user);
  return ok(conversationView(user, c.id));
});
