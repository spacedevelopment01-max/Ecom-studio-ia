import { z } from "zod";
import { json, notFound, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isIsoDate } from "@/lib/time";
import type { IdCtx } from "@/lib/params";

const Body = z.object({
  event_date: z.string().refine(isIsoDate, "date"),
  kind: z.enum(["courrier_recu", "reponse_envoyee", "appel", "rendez_vous", "autre"]),
  label: z.string().trim().min(2).max(300),
  document_id: z.string().uuid().nullable().optional(),
});

export const POST = route<IdCtx>(async (req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const [f] = await sql()`select id from folders where id = ${id} and user_id = ${user.id}`;
  if (!f) throw notFound();
  const b = await readJson(req, Body);
  if (b.document_id) {
    const [d] = await sql()`select id from documents where id = ${b.document_id} and user_id = ${user.id}`;
    if (!d) throw notFound();
  }
  await sql()`insert into folder_events (folder_id, user_id, event_date, kind, label, document_id) values (${id}, ${user.id}, ${b.event_date}, ${b.kind}, ${b.label}, ${b.document_id ?? null})`;
  await sql()`update folders set updated_at = now() where id = ${id}`;
  return json({ ok: true });
});

export const DELETE = route<IdCtx>(async (req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const eventId = new URL(req.url).searchParams.get("event");
  if (eventId) await sql()`delete from folder_events where id = ${eventId} and folder_id = ${id} and user_id = ${user.id}`;
  return json({ ok: true });
});
