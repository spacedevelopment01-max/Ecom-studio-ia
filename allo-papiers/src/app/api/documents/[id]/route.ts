import { z } from "zod";
import { json, readJson, route } from "@/lib/http";
import { isElevated, requireSession } from "@/lib/auth";
import { deleteDocument, getDocument, latestAnalysis, listFiles } from "@/lib/documents";
import { sql } from "@/lib/db";
import { HttpError } from "@/lib/http";
import type { IdCtx } from "@/lib/params";

export const GET = route<IdCtx>(async (_req, ctx) => {
  const { user, session } = await requireSession();
  const { id } = await ctx.params;
  const doc = await getDocument(user.id, id);
  if (doc.sensitive && !isElevated(session)) {
    return json({ document: { id: doc.id, title: doc.title, sensitive: true }, verrouille: true }, { status: 403 });
  }
  const files = (await listFiles(user.id, id)).map(({ storage_key: _k, ...f }) => f);
  const analysis = await latestAnalysis(user.id, id);
  const checklist = await sql()`select step_index, done from checklist_state where document_id = ${id} and user_id = ${user.id}`;
  return json({ document: doc, files, analysis, checklist });
});

const Patch = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  user_status: z.enum(["a_traiter", "en_attente", "traite", "envoye"]).optional(),
  folder_id: z.string().uuid().nullable().optional(),
  sensitive: z.boolean().optional(),
});

export const PATCH = route<IdCtx>(async (req, ctx) => {
  const { user, session } = await requireSession();
  const { id } = await ctx.params;
  const doc = await getDocument(user.id, id);
  const body = await readJson(req, Patch);
  // Retirer la protection renforcée d'un document exige d'avoir ouvert le coffre.
  if (body.sensitive === false && doc.sensitive && !isElevated(session)) {
    throw new HttpError(403, "verification_requise", "Confirmez votre identité pour retirer cette protection.");
  }
  if (body.folder_id) {
    const [f] = await sql()`select id from folders where id = ${body.folder_id} and user_id = ${user.id}`;
    if (!f) throw new HttpError(404, "introuvable", "Dossier introuvable.");
  }
  await sql()`
    update documents set
      title = ${body.title ?? doc.title},
      user_status = ${body.user_status ?? doc.user_status},
      folder_id = ${body.folder_id === undefined ? doc.folder_id : body.folder_id},
      sensitive = ${body.sensitive ?? doc.sensitive},
      updated_at = now()
     where id = ${id} and user_id = ${user.id}`;
  return json({ ok: true });
});

export const DELETE = route<IdCtx>(async (_req, ctx) => {
  const { user } = await requireSession();
  const { id } = await ctx.params;
  await deleteDocument(user.id, id);
  return json({ ok: true });
});
