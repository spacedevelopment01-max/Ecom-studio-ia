import { z } from "zod";
import { id, now, one, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { HttpError, ownedProject, requireUser } from "@/lib/auth";
import { enqueue } from "@/lib/jobs";
import { addUsage, getAsset, removeUsages } from "@/lib/library";
import { postView } from "@/lib/posts";
import { L } from "@/lib/i18n-server";

async function postOf(ctx: { params: Promise<{ pid: string }> }) {
  const user = await requireUser();
  const { pid } = await ctx.params;
  const post = one<any>("SELECT * FROM posts WHERE id = ?", pid);
  if (!post) throw new HttpError(404, L("Publication introuvable.", "Post not found."));
  ownedProject(user, post.project_id);
  return { user, post };
}

const locked = (s: string) => s === "publishing" || s === "published";

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ pid: string }> }) => {
  const { post } = await postOf(ctx);
  if (locked(post.status)) throw new HttpError(409, L("Une publication envoyée ne peut plus être modifiée.", "A post that has been sent can no longer be edited."));
  const b = await body(req, z.object({ title: z.string().max(200).optional(), caption: z.string().max(5000).optional(), hashtags: z.string().max(500).optional(), media: z.array(z.string()).max(10).optional(), scheduledAt: z.number().nullable().optional(), connectionId: z.string().nullable().optional(), network: z.enum(["instagram", "facebook", "tiktok", "youtube", "pinterest"]).optional(), format: z.string().optional(), link: z.string().max(500).nullable().optional() }));
  if (b.media) for (const m of b.media) if (getAsset(m)?.project_id !== post.project_id) throw new HttpError(400, L("Média étranger au projet.", "Media does not belong to this project."));
  const fields: [string, unknown][] = [];
  for (const [k, col] of [["title", "title"], ["caption", "caption"], ["hashtags", "hashtags"], ["scheduledAt", "scheduled_at"], ["connectionId", "connection_id"], ["network", "network"], ["format", "format"], ["link", "link"]] as const) if ((b as any)[k] !== undefined) fields.push([col, (b as any)[k]]);
  if (b.media) fields.push(["media", JSON.stringify(b.media)]);
  // Toute modification d'une publication programmée la renvoie en validation.
  const status = post.status === "scheduled" ? "review" : post.status;
  run(`UPDATE posts SET ${fields.map(([c]) => `${c} = ?`).join(", ")}${fields.length ? ", " : ""}status = ?, updated_at = ? WHERE id = ?`, ...fields.map(([, v]) => v), status, now(), post.id);
  if (b.media) {
    removeUsages("post", post.id);
    for (const m of b.media) addUsage(m, "post", post.id, L("Publication", "Post"));
  }
  return ok({ post: postView(one("SELECT * FROM posts WHERE id = ?", post.id)) });
});

export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ pid: string }> }) => {
  const { post } = await postOf(ctx);
  if (post.status === "publishing") throw new HttpError(409, L("Publication en cours d'envoi : patientez quelques secondes.", "Post is being sent: please wait a few seconds."));
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
      if (locked(post.status)) throw new HttpError(409, L("Déjà envoyée.", "Already sent."));
      if (!post.connection_id) throw new HttpError(409, L("Choisissez le compte destinataire avant de programmer.", "Choose the target account before scheduling."));
      if (!post.scheduled_at) throw new HttpError(409, L("Choisissez une date de publication.", "Choose a publishing date."));
      if (post.scheduled_at < Date.now() - 60_000) throw new HttpError(409, L("La date est passée : choisissez une nouvelle date ou « publier maintenant ».", "The date has passed: choose a new date or \"Publish now\"."));
      if (post.media === "[]" && post.network !== "facebook") throw new HttpError(409, L("Ce réseau exige un média.", "This network requires media."));
      run("UPDATE posts SET status = 'scheduled', approved_at = ?, approved_by = ?, error = NULL, updated_at = ? WHERE id = ?", now(), user.id, now(), post.id);
      break;
    }
    case "unschedule":
      if (locked(post.status)) throw new HttpError(409, L("Déjà envoyée.", "Already sent."));
      run("UPDATE posts SET status = 'review', updated_at = ? WHERE id = ?", now(), post.id);
      break;
    case "cancel":
      if (locked(post.status)) throw new HttpError(409, L("Déjà envoyée.", "Already sent."));
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
      const job = enqueue({ userId: user.id, projectId: post.project_id, type: "post.regenerate", label: L("Régénération d'une publication", "Regenerating a post"), payload: { postId: post.id, instruction: b.instruction, part: b.part ?? "both" } });
      return ok({ jobId: job.id });
    }
    case "publish_now": {
      if (locked(post.status)) throw new HttpError(409, L("Déjà envoyée.", "Already sent."));
      if (!post.connection_id) throw new HttpError(409, L("Choisissez le compte destinataire.", "Choose the target account."));
      run("UPDATE posts SET status = 'scheduled', scheduled_at = ?, approved_at = ?, approved_by = ?, updated_at = ? WHERE id = ?", now(), now(), user.id, now(), post.id);
      const job = enqueue({ userId: user.id, projectId: post.project_id, type: "post.publish", label: L("Publication immédiate", "Publishing now"), payload: { postId: post.id }, idempotencyKey: `publish:${post.id}:${now()}`, maxAttempts: 3 });
      return ok({ jobId: job.id });
    }
  }
  return ok({ post: postView(one("SELECT * FROM posts WHERE id = ?", post.id)) });
});
