import { z } from "zod";
import { json, notFound, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import type { IdCtx } from "@/lib/params";

const Body = z.object({
  label: z.string().trim().min(2).max(200),
  status: z.enum(["recue", "manquante"]).default("manquante"),
  document_id: z.string().uuid().nullable().optional(),
});

export const POST = route<IdCtx>(async (req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const [f] = await sql()`select id from folders where id = ${id} and user_id = ${user.id}`;
  if (!f) throw notFound();
  const b = await readJson(req, Body);
  await sql()`insert into folder_pieces (folder_id, user_id, label, status, document_id) values (${id}, ${user.id}, ${b.label}, ${b.status}, ${b.document_id ?? null})`;
  return json({ ok: true });
});

const Patch = z.object({ piece: z.string().uuid(), status: z.enum(["recue", "manquante"]).optional(), remove: z.boolean().optional() });

export const PATCH = route<IdCtx>(async (req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const b = await readJson(req, Patch);
  if (b.remove) await sql()`delete from folder_pieces where id = ${b.piece} and folder_id = ${id} and user_id = ${user.id}`;
  else if (b.status) await sql()`update folder_pieces set status = ${b.status} where id = ${b.piece} and folder_id = ${id} and user_id = ${user.id}`;
  return json({ ok: true });
});
