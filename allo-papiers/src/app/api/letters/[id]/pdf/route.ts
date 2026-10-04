import { HttpError, route } from "@/lib/http";
import { requireElevated, requireSession } from "@/lib/auth";
import { assertReviewed, buildLetterPdf, getLetter } from "@/lib/letters/service";
import { filesOfDocuments } from "@/lib/vault";
import { getDecrypted } from "@/lib/storage";
import { imageToPdf, mergePdfs } from "@/lib/pdf";
import { sql } from "@/lib/db";
import { audit } from "@/lib/audit";
import type { IdCtx } from "@/lib/params";

/**
 * PDF du courrier. Avec `?avec_pieces=1`, les pièces jointes du coffre sont ajoutées à la suite
 * (dossier complet prêt à envoyer) : cela exige le coffre ouvert, car les originaux sont inclus.
 */
export const GET = route<IdCtx>(async (req, ctx) => {
  const withPieces = new URL(req.url).searchParams.get("avec_pieces") === "1";
  const { user } = withPieces ? await requireElevated() : await requireSession();
  const { id } = await ctx.params;
  const letter = await getLetter(user.id, id);
  assertReviewed(letter);
  const docIds = withPieces ? letter.attachments ?? [] : [];
  const labels = docIds.length
    ? (await sql()<{ id: string; label: string }[]>`select id, coalesce(piece_label, title) as label from documents where user_id = ${user.id} and id = any(${docIds})`)
    : [];
  const ordered = docIds.map((d) => labels.find((l) => l.id === d)?.label).filter((x): x is string => Boolean(x));
  const parts = [await buildLetterPdf(letter, { attachments: ordered.length ? ordered : undefined })];
  if (withPieces) {
    for (const f of await filesOfDocuments(user.id, docIds)) {
      const [row] = await sql()<{ storage_key: string }[]>`select storage_key from document_files where id = ${f.id} and user_id = ${user.id}`;
      const buf = await getDecrypted(row.storage_key);
      try {
        if (f.mime === "application/pdf") parts.push(buf);
        else if (f.mime === "image/jpeg" || f.mime === "image/png") parts.push(await imageToPdf(buf, f.mime));
        else throw new Error("format");
      } catch {
        // On ne retire jamais une pièce en silence : la personne doit savoir ce qui manque.
        const label = labels.find((l) => l.id === f.document_id)?.label ?? "une pièce";
        throw new HttpError(422, "piece_illisible", `« ${label} » n'a pas pu être ajoutée au PDF (image illisible ou format non pris en charge). Retirez-la ou scannez-la à nouveau.`);
      }
    }
    await audit(user.id, "originaux_joints_pdf", { targetType: "courrier", targetId: id, meta: { pieces: docIds.length } });
  }
  const pdf = parts.length > 1 ? await mergePdfs(parts) : parts[0];
  const name = letter.title.normalize("NFD").replace(/[^\w -]/g, "").replace(/\s+/g, "-").slice(0, 60) || "courrier";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${name}${withPieces ? "-avec-pieces" : ""}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
});
