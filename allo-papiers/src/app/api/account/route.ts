import { z } from "zod";
import { HttpError, json, readJson, route } from "@/lib/http";
import { clearSessionCookie, requireElevated, requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { deleteAccount } from "@/lib/account";

const Patch = z.object({
  display_name: z.string().trim().max(80).nullable().optional(),
  retention_days: z.union([z.literal(30), z.literal(90), z.literal(365), z.literal(1095), z.null()]).optional(),
  reminders_enabled: z.boolean().optional(),
});

export const PATCH = route(async (req) => {
  const { user } = await requireSession();
  const body = await readJson(req, Patch);
  await sql()`
    update users set
      display_name = ${body.display_name === undefined ? user.display_name : body.display_name},
      retention_days = ${body.retention_days === undefined ? user.retention_days : body.retention_days},
      reminders_enabled = ${body.reminders_enabled ?? user.reminders_enabled}
     where id = ${user.id}`;
  return json({ ok: true });
});

const Del = z.object({ confirmEmail: z.string().trim() });

/** Suppression du compte : vérification renforcée + saisie de l'adresse email. */
export const DELETE = route(async (req) => {
  const { user } = await requireElevated();
  const { confirmEmail } = await readJson(req, Del);
  if (confirmEmail.toLowerCase() !== user.email) throw new HttpError(400, "confirmation", "Saisissez exactement votre adresse email pour confirmer.");
  await deleteAccount(user);
  await clearSessionCookie();
  return json({ ok: true });
});
