import { zipSync, strToU8 } from "fflate";
import { handle } from "@/lib/http";
import { HttpError, requireAdmin } from "@/lib/auth";
import { all } from "@/lib/db";
import { journalCsv, safeFileName, type Entry } from "@/lib/accounting";
import { categoryLabel, entriesFor, expenseToEntry, syncRecurring, type ExpenseRow } from "@/lib/accounting-store";
import { rangeFromUrl } from "@/lib/accounting-api";
import { fileExists, readFile } from "@/lib/storage";
import { L, uiLang } from "@/lib/i18n-server";

export const runtime = "nodejs";

const zipName = (e: Entry, name: string) => `${e.date}_${e.ref}_${safeFileName(name)}`;

/** Export pour le comptable : `?format=csv` (journal de la période) ou `?format=zip` (justificatifs + journal). */
export const GET = handle(async (req: Request) => {
  await requireAdmin();
  syncRecurring();
  const range = rangeFromUrl(req.url);
  const format = new URL(req.url).searchParams.get("format") ?? "csv";
  const lang = uiLang();
  const entries = entriesFor(range);
  const csv = journalCsv(entries, lang, categoryLabel, (e) => (e.receipt ? zipName(e, e.receipt.name) : ""));
  const base = `${L("journal", "ledger")}-${range.from}_${range.to}`;
  if (format === "csv") {
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${base}.csv"`, "Cache-Control": "no-store" } });
  }
  if (format !== "zip") throw new HttpError(400, L("Format inconnu.", "Unknown format."));
  const rows = all<ExpenseRow>("SELECT * FROM expenses WHERE deleted_at IS NULL AND receipt_key IS NOT NULL AND date >= ? AND date <= ?", range.from, range.to);
  const files: Record<string, Uint8Array> = { [`${base}.csv`]: strToU8(csv) };
  for (const r of rows) {
    if (!r.receipt_key || !fileExists(r.receipt_key)) continue;
    const path = `${L("justificatifs", "receipts")}/${zipName(expenseToEntry(r), r.receipt_name ?? "justificatif")}`;
    files[files[path] ? path.replace(/(\.[^./]+)?$/, `-${r.id}$1`) : path] = new Uint8Array(readFile(r.receipt_key));
  }
  const zip = zipSync(files, { level: 0 });
  return new Response(zip, { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="${L("justificatifs", "receipts")}-${range.from}_${range.to}.zip"`, "Cache-Control": "no-store" } });
});
