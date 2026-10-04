import { z } from "zod";
import { json, notFound, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { AppointmentSchema } from "@/lib/ai/schema";
import type { IdCtx } from "@/lib/params";

export const GET = route<IdCtx>(async (_req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const [row] = await sql()`select * from appointment_sheets where id = ${id} and user_id = ${user.id}`;
  if (!row) throw notFound();
  return json({ sheet: row });
});

const Patch = z.object({ content: AppointmentSchema });

export const PATCH = route<IdCtx>(async (req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const { content } = await readJson(req, Patch);
  const rows = await sql()`
    update appointment_sheets set content = ${sql().json(content as never)}, title = ${content.titre.slice(0, 160)}, updated_at = now()
     where id = ${id} and user_id = ${user.id} returning id`;
  if (!rows.length) throw notFound();
  return json({ ok: true });
});

export const DELETE = route<IdCtx>(async (_req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  await sql()`delete from appointment_sheets where id = ${id} and user_id = ${user.id}`;
  return json({ ok: true });
});
