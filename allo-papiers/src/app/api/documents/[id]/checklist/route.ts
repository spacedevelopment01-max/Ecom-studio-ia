import { z } from "zod";
import { json, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { getDocument } from "@/lib/documents";
import { sql } from "@/lib/db";
import type { IdCtx } from "@/lib/params";

const Body = z.object({ index: z.number().int().min(0).max(20), done: z.boolean() });

export const POST = route<IdCtx>(async (req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  await getDocument(user.id, id);
  const { index, done } = await readJson(req, Body);
  await sql()`
    insert into checklist_state (document_id, user_id, step_index, done) values (${id}, ${user.id}, ${index}, ${done})
    on conflict (document_id, step_index) do update set done = excluded.done, updated_at = now()`;
  return json({ ok: true });
});
