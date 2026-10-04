import { all } from "@/lib/db";
import { HttpError } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { saveBrandBook } from "@/lib/engine/brand";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";

export const runtime = "nodejs";

const pagesOf = (projectId: string, bookId: string) =>
  all<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role = 'brand-book-page' AND source_asset_id = ? AND deleted_at IS NULL ORDER BY json_extract(meta, '$.page')", projectId, bookId).map((a) => `/api/files/${a.id}`);

/** Dernière charte mise en page (PDF et planches). */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const book = all<{ id: string; name: string; created_at: number }>("SELECT id, name, created_at FROM assets WHERE project_id = ? AND role = 'brand-book' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", p.id)[0];
  return ok({ book: book ? { id: book.id, name: book.name, createdAt: book.created_at, pdf: `/api/files/${book.id}?download=1`, pages: pagesOf(p.id, book.id) } : null });
});

/** Régénère la charte à partir des choix actuels (logo, signature, palette, ton). */
export const POST = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  if (!p.brand) throw new HttpError(409, L("La marque n'est pas encore créée.", "The brand has not been created yet."));
  const book = await saveBrandBook(p.id);
  return ok({ book: book ? { id: book.id, name: book.name, createdAt: book.created_at, pdf: `/api/files/${book.id}?download=1`, pages: pagesOf(p.id, book.id) } : null });
});
