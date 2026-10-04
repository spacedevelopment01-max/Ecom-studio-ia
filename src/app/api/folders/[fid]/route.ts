import { z } from "zod";
import { one, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { HttpError, ownedProject, requireUser } from "@/lib/auth";
import { isDescendant, type Folder } from "@/lib/library";
import { L } from "@/lib/i18n-server";

async function folderOf(ctx: { params: Promise<{ fid: string }> }) {
  const user = await requireUser();
  const { fid } = await ctx.params;
  const f = one<Folder>("SELECT * FROM folders WHERE id = ?", fid);
  if (!f) throw new HttpError(404, L("Dossier introuvable.", "Folder not found."));
  ownedProject(user, f.project_id);
  return f;
}

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ fid: string }> }) => {
  const f = await folderOf(ctx);
  const b = await body(req, z.object({ name: z.string().trim().min(1).max(120).optional(), parentId: z.string().nullable().optional() }));
  if (b.name) run("UPDATE folders SET name = ? WHERE id = ?", b.name, f.id);
  if (b.parentId !== undefined) {
    if (b.parentId && (b.parentId === f.id || isDescendant(f.project_id, f.id, b.parentId))) throw new HttpError(400, L("Impossible de déplacer un dossier dans lui-même.", "A folder cannot be moved into itself."));
    if (b.parentId && !one("SELECT 1 FROM folders WHERE id = ? AND project_id = ?", b.parentId, f.project_id)) throw new HttpError(404, L("Dossier de destination introuvable.", "Destination folder not found."));
    run("UPDATE folders SET parent_id = ? WHERE id = ?", b.parentId, f.id);
  }
  return ok();
});

/** Suppression d'un dossier vide (les fichiers ne sont jamais supprimés implicitement). */
export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ fid: string }> }) => {
  const f = await folderOf(ctx);
  if (f.system_key) throw new HttpError(400, L("Les dossiers de base du projet ne peuvent pas être supprimés (vous pouvez les renommer).", "The project's default folders cannot be deleted (you can rename them)."));
  if (one("SELECT 1 FROM assets WHERE folder_id = ? AND deleted_at IS NULL", f.id) || one("SELECT 1 FROM folders WHERE parent_id = ?", f.id)) throw new HttpError(409, L("Le dossier n'est pas vide : déplacez d'abord son contenu.", "The folder is not empty: move its contents first."));
  run("DELETE FROM folders WHERE id = ?", f.id);
  return ok();
});
