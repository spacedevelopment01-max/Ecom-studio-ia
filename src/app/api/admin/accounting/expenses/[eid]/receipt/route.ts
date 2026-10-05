import { handle, ok } from "@/lib/http";
import { HttpError, requireAdmin } from "@/lib/auth";
import { nanoid } from "nanoid";
import { now, one, run } from "@/lib/db";
import { putFile } from "@/lib/storage";
import { clearReceipt, receiptOf, RECEIPT_MAX, sniffReceipt } from "@/lib/accounting-store";
import { safeFileName } from "@/lib/accounting";
import { L } from "@/lib/i18n-server";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ eid: string }> };
const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Ouvre le justificatif (dans le navigateur ; `?download=1` pour l'enregistrer). */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { eid } = await ctx.params;
  const r = receiptOf(eid);
  if (!r) throw new HttpError(404, L("Aucun justificatif.", "No receipt."));
  const dl = new URL(req.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(r.data), {
    headers: {
      "Content-Type": r.mime,
      "Content-Disposition": `${dl ? "attachment" : "inline"}; filename="${safeFileName(r.name)}"; filename*=UTF-8''${encodeURIComponent(r.name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

/** Joint (ou remplace) le justificatif : PDF, JPG, PNG ou WebP, 10 Mo au plus. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { eid } = await ctx.params;
  if (!one("SELECT 1 FROM expenses WHERE id = ?", eid)) throw new HttpError(404, L("Dépense introuvable.", "Expense not found."));
  const form = await req.formData();
  const f = form.get("file");
  if (!f || typeof f === "string" || !f.size) throw new HttpError(400, L("Choisissez un fichier.", "Choose a file."));
  if (f.size > RECEIPT_MAX) throw new HttpError(413, L("Le justificatif dépasse 10 Mo.", "The receipt exceeds 10 MB."));
  const data = new Uint8Array(await f.arrayBuffer());
  const mime = sniffReceipt(data);
  if (!mime) throw new HttpError(415, L("Format non pris en charge : PDF, JPG, PNG ou WebP.", "Unsupported format: PDF, JPG, PNG or WebP."));
  clearReceipt(eid);
  const key = `accounting/receipts/${eid}-${nanoid(10)}.${EXT[mime]}`;
  putFile(key, data);
  const name = (f.name || `justificatif.${EXT[mime]}`).slice(0, 160);
  run("UPDATE expenses SET receipt_key = ?, receipt_name = ?, receipt_mime = ?, updated_at = ? WHERE id = ?", key, name, mime, now(), eid);
  return ok({ name, mime });
});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  await requireAdmin();
  const { eid } = await ctx.params;
  clearReceipt(eid);
  return ok();
});
