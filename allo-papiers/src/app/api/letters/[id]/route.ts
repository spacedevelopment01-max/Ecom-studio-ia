import { z } from "zod";
import { json, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { AddressSchema, getLetter, RecipientSchema } from "@/lib/letters/service";
import { getTemplate } from "@/lib/letters/catalog";
import type { IdCtx } from "@/lib/params";

export const GET = route<IdCtx>(async (_req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const letter = await getLetter(user.id, id);
  const tpl = letter.template_id ? getTemplate(letter.template_id) : null;
  const sends = await sql()`select id, status, provider_mode, tracking_number, tracking_is_fictive, created_at from send_requests where letter_id = ${id} and user_id = ${user.id} order by created_at desc`;
  return json({
    letter,
    template: tpl ? { id: tpl.id, title: tpl.title, warning: tpl.warning ?? null, professionalNotice: Boolean(tpl.professionalNotice), sending: tpl.sending, checks: tpl.build(letter.answers).checks } : null,
    sends,
  });
});

const Patch = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  body: z.string().max(20000).optional(),
  sender: AddressSchema.extend({ place: z.string().max(80).optional(), signature: z.string().max(120).optional() }).optional(),
  recipient: RecipientSchema.optional(),
  folder_id: z.string().uuid().nullable().optional(),
});

/** Les modifications de l'utilisateur sont conservées telles quelles ; elles annulent la relecture. */
export const PATCH = route<IdCtx>(async (req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const l = await getLetter(user.id, id);
  const b = await readJson(req, Patch);
  await sql()`
    update letters set
      title = ${b.title ?? l.title},
      body = ${b.body ?? l.body},
      sender = ${sql().json((b.sender ?? l.sender) as never)},
      recipient = ${sql().json((b.recipient ?? l.recipient) as never)},
      folder_id = ${b.folder_id === undefined ? l.folder_id : b.folder_id},
      edited_by_user = ${l.edited_by_user || b.body !== undefined},
      reviewed_at = null,
      updated_at = now()
     where id = ${id} and user_id = ${user.id}`;
  return json({ ok: true });
});

export const DELETE = route<IdCtx>(async (_req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  await sql()`delete from letters where id = ${id} and user_id = ${user.id}`;
  return json({ ok: true });
});
