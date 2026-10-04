import { z } from "zod";
import { HttpError, json, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { createDocument } from "@/lib/documents";
import { canUseParcours, PARCOURS_IDS, type ParcoursId } from "@/lib/plans";
import { currentPlan } from "@/lib/quota";
import { sql } from "@/lib/db";

const Create = z.object({ parcours: z.enum(PARCOURS_IDS as [ParcoursId, ...ParcoursId[]]), title: z.string().max(120).optional() });

export const POST = route(async (req) => {
  const { user } = await requireSession();
  const { parcours, title } = await readJson(req, Create);
  const plan = await currentPlan(user.id);
  if (!canUseParcours(plan, parcours)) throw new HttpError(402, "offre_plus_requise", "Ce parcours fait partie de l'offre Plus (4,99 € par mois).");
  const [{ n }] = await sql()<{ n: number }[]>`
    select count(*)::int as n from documents where user_id = ${user.id} and status = 'uploaded' and created_at > now() - interval '1 day'`;
  if (n > 20) throw new HttpError(429, "trop_de_brouillons", "Trop de documents en attente. Terminez ou supprimez les documents commencés.");
  const id = await createDocument(user.id, parcours, title);
  return json({ id });
});

export const GET = route(async (req) => {
  const { user } = await requireSession();
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().slice(0, 80) ?? "";
  const status = url.searchParams.get("statut");
  const parcours = url.searchParams.get("parcours");
  const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const rows = await sql()`
    select id, created_at, title, parcours, status, user_status, page_count, organism, urgency,
           to_char(deadline, 'YYYY-MM-DD') as deadline, deadline_kind, folder_id, sensitive,
           case when sensitive then null else summary end as summary
      from documents
     where user_id = ${user.id}
       and (${q} = '' or title ilike ${like} or coalesce(organism, '') ilike ${like} or (not sensitive and coalesce(summary, '') ilike ${like}))
       and (${status}::text is null or user_status = ${status})
       and (${parcours}::text is null or parcours = ${parcours})
     order by created_at desc limit 200`;
  return json({ documents: rows });
});
