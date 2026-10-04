import { z } from "zod";
import { HttpError, json, readJson, route } from "@/lib/http";
import { requireSession } from "@/lib/auth";
import { getLetter } from "@/lib/letters/service";
import { suggestAttachments, type Need } from "@/lib/vault";
import { sql } from "@/lib/db";
import type { IdCtx } from "@/lib/params";

/** « Apporter mes documents enregistrés » : retrouve dans le coffre les pièces utiles à ce courrier. */
export const POST = route<IdCtx>(async (_req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  const letter = await getLetter(user.id, id);
  const needs = (letter.needs ?? []) as Need[];
  const suggestions = await suggestAttachments(user.id, needs, letter.document_id ? [letter.document_id] : []);
  const found = suggestions.flatMap((s) => (s.match ? [s.match.id] : []));
  // On AJOUTE les pièces trouvées à celles déjà choisies, sans rien retirer.
  const current = (letter.attachments ?? []) as string[];
  const merged = [...new Set([...current, ...found])].slice(0, 8);
  await sql()`update letters set attachments = ${sql().json(merged)} where id = ${id} and user_id = ${user.id}`;
  return json({ suggestions, attachments: merged });
});

const Put = z.object({ document_ids: z.array(z.string().uuid()).max(8) });

/** Choix manuel des pièces jointes (cocher / décocher). */
export const PUT = route<IdCtx>(async (req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  await getLetter(user.id, id);
  const { document_ids } = await readJson(req, Put);
  if (document_ids.length) {
    const owned = await sql()<{ id: string }[]>`select id from documents where user_id = ${user.id} and id = any(${document_ids})`;
    if (owned.length !== new Set(document_ids).size) throw new HttpError(404, "introuvable", "Document introuvable.");
  }
  await sql()`update letters set attachments = ${sql().json(document_ids)} where id = ${id} and user_id = ${user.id}`;
  return json({ attachments: document_ids });
});
