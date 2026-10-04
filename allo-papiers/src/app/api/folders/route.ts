import { z } from "zod";
import { json, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";

export const GET = route(async () => {
  const { user } = await requireSession();
  const rows = await sql()`
    select f.*, (select count(*)::int from documents d where d.folder_id = f.id) as documents,
           (select count(*)::int from folder_pieces p where p.folder_id = f.id and p.status = 'manquante') as pieces_manquantes,
           (select to_char(min(due_date), 'YYYY-MM-DD') from deadlines dl where dl.folder_id = f.id and dl.due_date >= current_date) as prochaine_echeance
      from folders f where f.user_id = ${user.id} order by f.resolved_at nulls first, f.updated_at desc`;
  return json({ folders: rows });
});

const Create = z.object({
  name: z.string().trim().min(2).max(120),
  goal: z.string().trim().max(300).optional(),
  organism: z.string().trim().max(120).optional(),
  next_action: z.string().trim().max(300).optional(),
});

export const POST = route(async (req) => {
  const { user } = await requireSession();
  const b = await readJson(req, Create);
  const [row] = await sql()<{ id: string }[]>`
    insert into folders (user_id, name, goal, organism, next_action) values (${user.id}, ${b.name}, ${b.goal ?? null}, ${b.organism ?? null}, ${b.next_action ?? null}) returning id`;
  return json({ id: row.id });
});
