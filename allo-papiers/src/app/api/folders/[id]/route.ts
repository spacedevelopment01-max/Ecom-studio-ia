import { z } from "zod";
import { json, notFound, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import type { IdCtx } from "@/lib/params";

async function own(userId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound();
  const [f] = await sql()`select * from folders where id = ${id} and user_id = ${userId}`;
  if (!f) throw notFound();
  return f;
}

export const GET = route<IdCtx>(async (_req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const folder = await own(user.id, id);
  const documents = await sql()`
    select id, title, created_at, status, user_status, urgency, to_char(deadline, 'YYYY-MM-DD') as deadline, organism
      from documents where folder_id = ${id} and user_id = ${user.id} order by created_at`;
  const events = await sql()`select id, to_char(event_date, 'YYYY-MM-DD') as event_date, kind, label, document_id from folder_events where folder_id = ${id} and user_id = ${user.id} order by event_date, created_at`;
  const pieces = await sql()`select id, label, status, document_id from folder_pieces where folder_id = ${id} and user_id = ${user.id} order by created_at`;
  const deadlines = await sql()`select id, label, to_char(due_date, 'YYYY-MM-DD') as due_date, confirmed_at, source from deadlines where user_id = ${user.id} and (folder_id = ${id} or document_id in (select id from documents where folder_id = ${id})) order by due_date`;
  const letters = await sql()`select id, title, updated_at, reviewed_at from letters where folder_id = ${id} and user_id = ${user.id} order by updated_at desc`;
  return json({ folder, documents, events, pieces, deadlines, letters });
});

const Patch = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  goal: z.string().trim().max(300).nullable().optional(),
  organism: z.string().trim().max(120).nullable().optional(),
  next_action: z.string().trim().max(300).nullable().optional(),
  status: z.enum(["a_traiter", "en_attente", "traite", "envoye"]).optional(),
  resolved: z.boolean().optional(),
});

export const PATCH = route<IdCtx>(async (req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const f = await own(user.id, id);
  const b = await readJson(req, Patch);
  await sql()`
    update folders set
      name = ${b.name ?? f.name}, goal = ${b.goal === undefined ? f.goal : b.goal},
      organism = ${b.organism === undefined ? f.organism : b.organism},
      next_action = ${b.next_action === undefined ? f.next_action : b.next_action},
      status = ${b.resolved === true ? "traite" : (b.status ?? f.status)},
      resolved_at = ${b.resolved === true ? new Date() : b.resolved === false ? null : f.resolved_at},
      updated_at = now()
     where id = ${id} and user_id = ${user.id}`;
  if (b.resolved === true) {
    // « Mon problème est réglé » : les rappels liés sont désactivés.
    await sql()`update deadlines set enabled = false where user_id = ${user.id} and folder_id = ${id}`;
    await sql()`insert into folder_events (folder_id, user_id, event_date, kind, label) values (${id}, ${user.id}, current_date, 'autre', 'Problème indiqué comme réglé')`;
  }
  return json({ ok: true });
});

export const DELETE = route<IdCtx>(async (_req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  await own(user.id, id);
  // Les documents ne sont pas supprimés : ils sont simplement retirés du dossier.
  await sql()`delete from folders where id = ${id} and user_id = ${user.id}`;
  return json({ ok: true });
});
