import { z } from "zod";
import { json, now, one, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { HttpError, ownedProject, requireUser } from "@/lib/auth";

async function connOf(ctx: { params: Promise<{ cid: string }> }) {
  const user = await requireUser();
  const { cid } = await ctx.params;
  const c = one<any>("SELECT * FROM connections WHERE id = ? AND user_id = ?", cid, user.id);
  if (!c) throw new HttpError(404, "Connexion introuvable.");
  return { user, c };
}

/** Rattacher un compte à une boutique, choisir le tableau Pinterest, la visibilité YouTube. */
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ cid: string }> }) => {
  const { user, c } = await connOf(ctx);
  const b = await body(req, z.object({ projectId: z.string().optional(), linked: z.boolean().optional(), boardId: z.string().optional(), privacy: z.enum(["public", "unlisted", "private"]).optional() }));
  if (b.projectId && b.linked !== undefined) {
    ownedProject(user, b.projectId);
    if (b.linked) run("INSERT OR IGNORE INTO project_connections (project_id, connection_id) VALUES (?,?)", b.projectId, c.id);
    else run("DELETE FROM project_connections WHERE project_id = ? AND connection_id = ?", b.projectId, c.id);
  }
  const meta = json<any>(c.meta, {});
  if (b.boardId) meta.boardId = b.boardId;
  if (b.privacy) meta.privacy = b.privacy;
  run("UPDATE connections SET meta = ?, updated_at = ? WHERE id = ?", JSON.stringify(meta), now(), c.id);
  return ok();
});

/** Déconnexion : le jeton est effacé ; les publications programmées sur ce compte repassent en validation. */
export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ cid: string }> }) => {
  const { c } = await connOf(ctx);
  run("UPDATE posts SET status = 'review', connection_id = NULL, error = 'Compte déconnecté' WHERE connection_id = ? AND status = 'scheduled'", c.id);
  run("DELETE FROM connections WHERE id = ?", c.id);
  return ok();
});
