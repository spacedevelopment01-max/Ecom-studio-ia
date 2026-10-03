import { z } from "zod";
import { id, now, one, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { HttpError, ownedProject, requireUser } from "@/lib/auth";
import { enqueue } from "@/lib/jobs";
import { addUsage, getAsset, removeUsages } from "@/lib/library";
import { postView } from "@/lib/posts";

async function postOf(ctx: { params: Promise<{ pid: string }> }) {
  const user = await requireUser();
  const { pid } = await ctx.params;
  const post = one<any>("SELECT * FROM posts WHERE id = ?", pid);
  if (!post) throw new HttpError(404, "Publication introuvable.");
  ownedProject(user, post.project_id);
  return { user, post };
}

const locked = (s: string) => s === "publishing" || s === "published";

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ pid: string }> }) => {
  const { post } = await postOf(ctx);
  if (locked(post.status)) throw new HttpError(409, "Une publication envoyée ne peut plus être modifiée.");
  const b = await body(req, z.object({ title: z.string().max(200).optional(), caption: z.string().max(5000).optional(), hashtags: z.string().max(500).optional(), media: z.array(z.string()).max(10).optional(), scheduledAt: z.number().nullable().optional(), connectionId: z.string().nullable().optional(), network: z.enum(["instagram", "facebook", "tiktok", "youtube", "pinterest"]).optional(), format: z.string().optional(), link: z.string().max(500).nullable().optional() }));
  if (b.media) for (const m of b.media) if (getAsset(m)?.project_id !== post.project_id) throw new HttpError(400, "Média étranger au projet.");
  const fields: [string, unknown][] = [];
  for (const [k, col] of [["title", "title"], ["caption", "caption"], ["hashtags", "hashtags"], ["scheduledAt", "scheduled_at"], ["connectionId", "connection_id"], ["network", "network"], ["format", "format"], ["link", "link"]] as const) if ((b as any)[k] !== undefined) fields.push([col, (b as any)[k]]);
  if (b.media) fields.push(["media", JSON.stringify(b.media)]);
  // Toute modification d'une publication programmée la renvoie en validation.
  const status = post.status === "scheduled" ? "review" : post.status;
  run(`UPDATE posts SET ${fields.map(([c]) => `${c} = ?`).join(", ")}${fields.length ? ", " : ""}status = ?, updated_at = ? WHERE id = ?`, ...fields.map(([, v]) => v), status, now(), post.id);
  if (b.media) {
    removeUsages("post", post.id);
    for (const m of b.media) addUsage(m, "post", post.id, "Publication");
  }
  return ok({ post: postView(one("SELECT * FROM posts WHERE id = ?", post.id)) });
});

export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ pid: string }> }) => {
  const { post } = await postOf(ctx);
  if (post.status === "publishing") throw new HttpError(409, "Publication en cours d'envoi : patientez quelques secondes.");
  removeUsages("post", post.id);
  run("DELETE FROM posts WHERE id = ?", post.id);
  return ok();
});

/** Actions : valider, programmer, annuler, dupliquer, régénérer, publier maintenant. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ pid: string }> }) => {
  const { user, post } = await postOf(ctx);
  const b = await body(req, z.object({ action: z.enum(["approve", "schedule", "unschedule", "cancel", "duplicate", "regenerate", "publish_now"]), instruction: z.string().max(500).optional(), part: z.enum(["text", "media", "both"]).optional() }));
  switch (b.action) {
    case "approve":
    case "schedule": {
      if (locked(post.status)) throw new HttpError(409, "Déjà envoyée.");
      if (!post.connection_id) throw new HttpError(409, "Choisissez le compte destinataire avant de programmer.");
      if (!post.scheduled_at) throw new HttpError(409, "Choisissez une date de publication.");
      if (post.scheduled_at < Date.now() - 60_000) throw new HttpError(409, "La date est passée : choisissez une nouvelle date ou « publier maintenant ».");
      if (post.media === "[]" && post.network !== "facebook") throw new HttpError(409, "Ce réseau exige un média.");
      run("UPDATE posts SET status = 'scheduled', approved_at = ?, approved_by = ?, error = NULL, updated_at = ? WHERE id = ?", now(), user.id, now(), post.id);
      break;
    }
    case "unschedule":
      if (locked(post.status)) throw new HttpError(409, "Déjà envoyée.");
      run("UPDATE posts SET status = 'review', updated_at = ? WHERE id = ?", now(), post.id);
      break;
    case "cancel":
      if (locked(post.status)) throw new HttpError(409, "Déjà envoyée.");
      run("UPDATE posts SET status = 'cancelled', updated_at = ? WHERE id = ?", now(), post.id);
      break;
    case "duplicate": {
      const nid = id();
      run(
        "INSERT INTO posts (id, project_id, plan_id, campaign_id, connection_id, network, format, status, scheduled_at, timezone, title, caption, hashtags, link, angle, media, brief, publish_key, created_at, updated_at) SELECT ?, project_id, plan_id, campaign_id, connection_id, network, format, 'draft', scheduled_at + 86400000, timezone, title, caption, hashtags, link, angle, media, brief, ?, ?, ? FROM posts WHERE id = ?",
        nid, `dup:${nid}`, now(), now(), post.id,
      );
      return ok({ id: nid });
    }
    case "regenerate": {
      const job = enqueue({ userId: user.id, projectId: post.project_id, type: "post.regenerate", label: "Régénération d'une publication", payload: { postId: post.id, instruction: b.instruction, part: b.part ?? "both" } });
      return ok({ jobId: job.id });
    }
    case "publish_now": {
      if (locked(post.status)) throw new HttpError(409, "Déjà envoyée.");
      if (!post.connection_id) throw new HttpError(409, "Choisissez le compte destinataire.");
      run("UPDATE posts SET status = 'scheduled', scheduled_at = ?, approved_at = ?, approved_by = ?, updated_at = ? WHERE id = ?", now(), now(), user.id, now(), post.id);
      const job = enqueue({ userId: user.id, projectId: post.project_id, type: "post.publish", label: "Publication immédiate", payload: { postId: post.id }, idempotencyKey: `publish:${post.id}:${now()}`, maxAttempts: 3 });
      return ok({ jobId: job.id });
    }
  }
  return ok({ post: postView(one("SELECT * FROM posts WHERE id = ?", post.id)) });
});
