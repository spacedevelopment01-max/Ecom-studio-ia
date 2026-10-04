import { json, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";

export const GET = route(async () => {
  const { user } = await requireSession();
  const rows = await sql()`select at, action, target_type, target_id, user_agent from audit_events where user_id = ${user.id} order by at desc limit 100`;
  return json({ events: rows });
});
