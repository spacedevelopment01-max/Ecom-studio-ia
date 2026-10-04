import { z } from "zod";
import { json, notFound, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isIsoDate } from "@/lib/time";
import type { IdCtx } from "@/lib/params";

const Patch = z.object({
  confirm: z.boolean().optional(),
  due_date: z.string().refine(isIsoDate, "date").optional(),
  label: z.string().trim().min(2).max(160).optional(),
  remind_days: z.array(z.number().int().min(0).max(30)).max(4).optional(),
  enabled: z.boolean().optional(),
});

/**
 * Confirmer / corriger une échéance. Modifier la date d'une échéance repérée dans un
 * document la transforme en échéance « saisie par vous ».
 */
export const PATCH = route<IdCtx>(async (req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const b = await readJson(req, Patch);
  const [d] = await sql()<{ id: string; label: string; due: string; source: string; remind_days: number[]; enabled: boolean; confirmed_at: Date | null }[]>`
    select id, label, to_char(due_date, 'YYYY-MM-DD') as due, source, remind_days, enabled, confirmed_at from deadlines where id = ${id} and user_id = ${user.id}`;
  if (!d) throw notFound();
  const dateChanged = b.due_date !== undefined && b.due_date !== d.due;
  await sql()`
    update deadlines set
      due_date = ${b.due_date ?? d.due},
      label = ${b.label ?? d.label},
      source = ${dateChanged ? "utilisateur" : d.source},
      remind_days = ${b.remind_days ?? d.remind_days},
      enabled = ${b.enabled ?? d.enabled},
      confirmed_at = ${b.confirm === true || dateChanged ? new Date() : b.confirm === false ? null : d.confirmed_at}
     where id = ${id} and user_id = ${user.id}`;
  return json({ ok: true });
});

export const DELETE = route<IdCtx>(async (_req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  await sql()`delete from deadlines where id = ${id} and user_id = ${user.id}`;
  return json({ ok: true });
});
