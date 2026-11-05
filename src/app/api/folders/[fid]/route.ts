import { changeFolderMetadata, deleteEmptyFolder } from "@/lib/folder-metadata";
import { z } from "zod";
import { one } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { HttpError, ownedProject, requireUser } from "@/lib/auth";
import { type Folder } from "@/lib/library";
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
  changeFolderMetadata(f.project_id,f.id,b);
  return ok();
});

/** Suppression d'un dossier vide (les fichiers ne sont jamais supprimés implicitement). */
export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ fid: string }> }) => {
  const f = await folderOf(ctx);
  deleteEmptyFolder(f.project_id,f.id);
  return ok();
});
