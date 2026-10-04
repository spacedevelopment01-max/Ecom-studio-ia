import { json, notFound, route } from "@/lib/http";
import { requireElevated, requireSession } from "@/lib/auth";
import { getDocument, removeFile } from "@/lib/documents";
import { getDecrypted } from "@/lib/storage";
import { sql } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { IdFileCtx } from "@/lib/params";

/**
 * Ouverture d'un original : coffre ouvert obligatoire (passkey ou code), contrôle du
 * propriétaire, fichier transmis par le serveur (aucune URL publique), journalisé.
 * Exception : la personne qui vient d'ajouter la page peut la prévisualiser tant que le
 * document n'est pas encore analysé (prévisualisation pendant l'import).
 */
export const GET = route<IdFileCtx>(async (req, ctx) => {
  const { id, fileId } = await ctx.params;
  const s = await requireSession();
  const doc = await getDocument(s.user.id, id);
  if (doc.status !== "uploaded") await requireElevated();
  const [f] = await sql()<{ storage_key: string; mime: string; position: number }[]>`
    select storage_key, mime, position from document_files where id = ${fileId} and document_id = ${id} and user_id = ${s.user.id}`;
  if (!f) throw notFound();
  const data = await getDecrypted(f.storage_key);
  const download = new URL(req.url).searchParams.get("telecharger") === "1";
  if (doc.status !== "uploaded") {
    await audit(s.user.id, download ? "original_telecharge" : "original_ouvert", { targetType: "document", targetId: id, userAgent: req.headers.get("user-agent") });
  }
  const ext = f.mime === "application/pdf" ? "pdf" : f.mime.split("/")[1];
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": f.mime,
      "content-disposition": `${download ? "attachment" : "inline"}; filename="page-${f.position + 1}.${ext}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
});

export const DELETE = route<IdFileCtx>(async (_req, ctx) => {
  const { user } = await requireSession();
  const { id, fileId } = await ctx.params;
  await removeFile(user.id, id, fileId);
  return json({ ok: true });
});
