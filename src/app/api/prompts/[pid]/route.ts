import { z } from "zod";
import { now, one, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { HttpError, requireUser } from "@/lib/auth";

const raw = (pid: string) => decodeURIComponent(pid).replace(/^u:/, "");

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ pid: string }> }) => {
  const user = await requireUser();
  const { pid } = await ctx.params;
  const b = await body(req, z.object({ title: z.string().max(160).optional(), body: z.string().max(12000).optional(), favorite: z.boolean().optional() }));
  if (b.favorite !== undefined) {
    if (b.favorite) run("INSERT OR IGNORE INTO prompt_favorites (user_id, prompt_id, created_at) VALUES (?,?,?)", user.id, decodeURIComponent(pid), now());
    else run("DELETE FROM prompt_favorites WHERE user_id = ? AND prompt_id = ?", user.id, decodeURIComponent(pid));
  }
  if (b.title || b.body) {
    if (!one("SELECT 1 FROM user_prompts WHERE id = ? AND user_id = ?", raw(pid), user.id)) throw new HttpError(404, "Seuls vos prompts personnels sont modifiables (enregistrez une copie).");
    run("UPDATE user_prompts SET title = COALESCE(?, title), body = COALESCE(?, body), updated_at = ? WHERE id = ? AND user_id = ?", b.title ?? null, b.body ?? null, now(), raw(pid), user.id);
  }
  return ok();
});

export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ pid: string }> }) => {
  const user = await requireUser();
  const { pid } = await ctx.params;
  run("DELETE FROM user_prompts WHERE id = ? AND user_id = ?", raw(pid), user.id);
  return ok();
});
