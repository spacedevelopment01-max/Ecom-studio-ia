import { z } from "zod";
import { json, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { audit } from "@/lib/audit";

const Body = z.object({ accept: z.boolean() });

/** Consentement explicite au traitement des documents par le fournisseur d'IA (retirable). */
export const POST = route(async (req) => {
  const { user } = await requireSession();
  const { accept } = await readJson(req, Body);
  await sql()`update users set ai_consent_at = ${accept ? new Date() : null} where id = ${user.id}`;
  await audit(user.id, accept ? "consentement_ia_donne" : "consentement_ia_retire");
  return json({ ok: true });
});
