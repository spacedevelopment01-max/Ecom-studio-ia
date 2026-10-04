import { json, notFound, route } from "@/lib/http";
import { requireElevated } from "@/lib/auth";
import { sql } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { IdCtx } from "@/lib/params";

export const DELETE = route<IdCtx>(async (_req, ctx) => {
  const { user } = await requireElevated();
  const { id } = await ctx.params;
  const rows = await sql()`delete from webauthn_credentials where id = ${id} and user_id = ${user.id} returning id`;
  if (!rows.length) throw notFound();
  await audit(user.id, "passkey_revoquee", { targetType: "passkey", targetId: id.slice(0, 16) });
  return json({ ok: true });
});
