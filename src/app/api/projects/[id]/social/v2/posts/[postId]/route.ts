import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { now, one, run } from "@/lib/db";
import { enqueue } from "@/lib/jobs";
import { L } from "@/lib/i18n-server";
import { requirePlan } from "@/lib/plan-gates";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import type { Project } from "@/lib/projects";
import { approve, deletePostV2, duplicatePostV2, editPostV2 } from "@/lib/social-v2/engine";
import { PLATFORMS, platformSpec } from "@/lib/social-v2/platforms";
import { attemptsOf, confirmUncertain, schedulePosts, unschedule } from "@/lib/social-v2/scheduler";
import { checkPost } from "@/lib/social-v2/quality";
import { postViewV2 } from "@/lib/social-v2/view";

export const runtime = "nodejs";
type PostCtx = Ctx<{ id: string; postId: string }>;

function view(p: Project, postId: string) {
  const r = one<any>("SELECT p.*, c.name AS connection_name FROM posts p LEFT JOIN connections c ON c.id = p.connection_id WHERE p.id = ? AND p.project_id = ?", postId, p.id);
  if (!r) throw new HttpError(404, L("Publication introuvable.", "Post not found."));
  return { post: postViewV2(p, r, { gate: true }), attempts: attemptsOf(postId), platform: platformSpec(r.network) };
}

export const GET = handle(async (_req: Request, ctx: PostCtx) => {
  const { project: p } = await projectFromCtx(ctx as Ctx);
  return ok(view(p, (await ctx.params).postId));
});

/** Modification manuelle (gratuite) : texte, hashtags, lien, médias (ordre), date, réseau, compte. */
export const PATCH = handle(async (req: Request, ctx: PostCtx) => {
  const { project: p } = await projectFromCtx(ctx as Ctx);
  const { postId } = await ctx.params;
  const b = await body(req, z.object({ title: z.string().max(200).optional(), caption: z.string().max(5000).optional(), hashtags: z.string().max(500).optional(), link: z.string().max(500).nullable().optional(), media: z.array(z.string().max(40)).max(10).optional(), scheduledAt: z.number().optional(), network: z.enum(PLATFORMS).optional(), connectionId: z.string().max(40).nullable().optional() }));
  try {
    const r = editPostV2(p, postId, b);
    return ok({ ...view(p, postId), reapproval: r.reapproval });
  } catch (e) {
    throw new HttpError(409, (e as Error).message);
  }
});

export const POST = handle(async (req: Request, ctx: PostCtx) => {
  const { user, project: p } = await projectFromCtx(ctx as Ctx);
  const { postId } = await ctx.params;
  const b = await body(req, z.object({ action: z.enum(["approve", "schedule", "unschedule", "duplicate", "delete", "publish_now", "confirm_uncertain"]), published: z.boolean().optional(), url: z.string().url().max(500).optional() }));
  if (!one("SELECT 1 FROM posts WHERE id = ? AND project_id = ?", postId, p.id)) throw new HttpError(404, L("Publication introuvable.", "Post not found."));
  try {
    switch (b.action) {
      case "approve": {
        const r = approve(p, [postId], user.id);
        if (r.refused.length) throw new Error(r.refused[0].reason);
        break;
      }
      case "schedule": {
        requirePlan(user);
        const r = schedulePosts([postId], (pid) => checkPost(p, pid));
        if (r.refused.length) throw new Error(r.refused[0].reason);
        break;
      }
      case "unschedule":
        unschedule([postId]);
        break;
      case "duplicate":
        return ok({ id: duplicatePostV2(p, postId) });
      case "delete":
        deletePostV2(p, postId);
        return ok({ deleted: true });
      case "publish_now": {
        // Publier maintenant : même chemin que la programmation (version approuvée, compte actif), échéance immédiate.
        requirePlan(user);
        const cur = one<{ scheduled_at: number | null }>("SELECT scheduled_at FROM posts WHERE id = ?", postId)!;
        run("UPDATE posts SET scheduled_at = ? WHERE id = ? AND status IN ('approved','review','paused')", now() + 1000, postId);
        const r = schedulePosts([postId], (pid) => checkPost(p, pid));
        if (r.refused.length) {
          run("UPDATE posts SET scheduled_at = ? WHERE id = ?", cur.scheduled_at, postId);
          throw new Error(r.refused[0].reason);
        }
        const job = enqueue({ userId: user.id, projectId: p.id, type: "post.publish", label: L("Publication immédiate", "Publishing now"), payload: { postId }, idempotencyKey: `publish-now:${postId}:${now()}`, maxAttempts: 1 });
        return ok({ ...view(p, postId), jobId: job.id });
      }
      case "confirm_uncertain":
        confirmUncertain(postId, !!b.published, b.url ?? null);
        break;
    }
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(409, (e as Error).message);
  }
  return ok(view(p, postId));
});
