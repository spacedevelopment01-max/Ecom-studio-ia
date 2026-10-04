import { json, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getLetter } from "@/lib/letters/service";
import type { IdCtx } from "@/lib/params";

/** « J'ai relu ce courrier » : nécessaire avant tout export ou envoi. */
export const POST = route<IdCtx>(async (_req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  await getLetter(user.id, id);
  await sql()`update letters set reviewed_at = now() + interval '1 millisecond' where id = ${id} and user_id = ${user.id}`;
  return json({ ok: true });
});
