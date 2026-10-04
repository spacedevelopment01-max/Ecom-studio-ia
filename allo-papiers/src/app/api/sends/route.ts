import { z } from "zod";
import { json, readJson, route } from "@/lib/http";
import { requireElevated, requireSession } from "@/lib/auth";
import { prepareSend } from "@/lib/sends";
import { getLetter } from "@/lib/letters/service";
import { filesOfDocuments } from "@/lib/vault";
import { sql } from "@/lib/db";

export const GET = route(async () => {
  const { user } = await requireSession();
  const rows = await sql()`
    select s.id, s.status, s.provider_mode, s.price_cents, s.tracking_number, s.tracking_is_fictive, s.created_at, s.recipient, l.title
      from send_requests s left join letters l on l.id = s.letter_id where s.user_id = ${user.id} order by s.created_at desc`;
  return json({ sends: rows });
});

// Sans liste explicite, les pièces jointes sont celles choisies dans le courrier (documents du coffre).
const Body = z.object({ letter_id: z.string().uuid(), attachments: z.array(z.string().uuid()).max(15).optional() });

export const POST = route(async (req) => {
  const { user } = await requireSession();
  const b = await readJson(req, Body);
  let files = b.attachments;
  if (!files) {
    const letter = await getLetter(user.id, b.letter_id);
    files = (await filesOfDocuments(user.id, letter.attachments ?? [])).map((f) => f.id);
  }
  // Joindre une pièce protégée (identité, banque, santé…) demande d'avoir ouvert le coffre.
  if (files.length) {
    const [s] = await sql()<{ n: number }[]>`
      select count(*)::int as n from document_files f join documents d on d.id = f.document_id
       where f.user_id = ${user.id} and f.id = any(${files}) and d.sensitive`;
    if (s.n > 0) await requireElevated();
  }
  const id = await prepareSend(user, b.letter_id, files);
  return json({ id });
});
