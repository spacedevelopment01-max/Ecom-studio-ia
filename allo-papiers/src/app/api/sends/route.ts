import { z } from "zod";
import { json, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { prepareSend } from "@/lib/sends";
import { sql } from "@/lib/db";

export const GET = route(async () => {
  const { user } = await requireSession();
  const rows = await sql()`
    select s.id, s.status, s.provider_mode, s.price_cents, s.tracking_number, s.tracking_is_fictive, s.created_at, s.recipient, l.title
      from send_requests s left join letters l on l.id = s.letter_id where s.user_id = ${user.id} order by s.created_at desc`;
  return json({ sends: rows });
});

const Body = z.object({ letter_id: z.string().uuid(), attachments: z.array(z.string().uuid()).max(5).default([]) });

export const POST = route(async (req) => {
  const { user } = await requireSession();
  const b = await readJson(req, Body);
  const id = await prepareSend(user, b.letter_id, b.attachments);
  return json({ id });
});
