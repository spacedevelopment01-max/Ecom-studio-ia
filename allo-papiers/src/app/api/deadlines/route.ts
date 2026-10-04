import { z } from "zod";
import { HttpError, json, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isIsoDate } from "@/lib/time";

export const GET = route(async () => {
  const { user } = await requireSession();
  const rows = await sql()`
    select d.id, d.label, to_char(d.due_date, 'YYYY-MM-DD') as due_date, d.source, d.source_quote, d.confirmed_at,
           d.remind_days, d.enabled, d.document_id, d.folder_id, doc.title as document_title
      from deadlines d left join documents doc on doc.id = d.document_id
     where d.user_id = ${user.id} order by d.due_date`;
  return json({ deadlines: rows, remindersEnabled: user.reminders_enabled });
});

const Create = z.object({
  label: z.string().trim().min(2).max(160),
  due_date: z.string().refine(isIsoDate, "date"),
  folder_id: z.string().uuid().nullable().optional(),
  remind_days: z.array(z.number().int().min(0).max(30)).max(4).default([7, 2, 0]),
});

/** Échéance saisie par l'utilisateur : elle est confirmée par définition. */
export const POST = route(async (req) => {
  const { user } = await requireSession();
  const b = await readJson(req, Create);
  if (b.folder_id) {
    const [f] = await sql()`select id from folders where id = ${b.folder_id} and user_id = ${user.id}`;
    if (!f) throw new HttpError(404, "introuvable", "Dossier introuvable.");
  }
  const [row] = await sql()<{ id: string }[]>`
    insert into deadlines (user_id, folder_id, label, due_date, source, confirmed_at, remind_days)
    values (${user.id}, ${b.folder_id ?? null}, ${b.label}, ${b.due_date}, 'utilisateur', now(), ${b.remind_days}) returning id`;
  return json({ id: row.id });
});
