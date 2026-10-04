import { json, route } from "@/lib/http";
import { requireSession, revokeSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { IdCtx } from "@/lib/params";

export const DELETE = route<IdCtx>(async (_req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  await revokeSession(user.id, id);
  await audit(user.id, "session_revoquee", { targetType: "session", targetId: id });
  return json({ ok: true });
});
