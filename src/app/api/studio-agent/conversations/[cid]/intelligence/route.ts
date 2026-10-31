import { requireUser } from '@/lib/auth';
import { handle, ok, body } from '@/lib/http';
import type { Ctx } from '@/lib/route-helpers';
import { assertConversationEnabled } from '@/lib/orchestrator/conversation';
import { IntelligenceCommandSchema } from '@/lib/orchestrator/conversation/intelligence-contract';
import { assertIntelligenceEnabled, createCognitiveQuote, confirmCognitiveQuote } from '@/lib/orchestrator/conversation/intelligence';
export const runtime = 'nodejs';
export const POST = handle(async (req: Request, ctx: Ctx<{ cid: string }>) => {
  assertConversationEnabled(); assertIntelligenceEnabled();
  const user = await requireUser(), { cid } = await ctx.params;
  const cmd = await body(req, IntelligenceCommandSchema);
  return ok(cmd.action === 'quote' ? createCognitiveQuote(user, cid, cmd) : confirmCognitiveQuote(user, cid, cmd.quoteId, cmd.requestId));
});
