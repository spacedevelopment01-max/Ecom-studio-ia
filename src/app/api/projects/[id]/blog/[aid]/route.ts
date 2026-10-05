import { z } from "zod";
import { now, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { getAsset } from "@/lib/library";
import { articleView, fitLength, META_DESCRIPTION_MAX, META_TITLE_MAX, sanitizeBlogHtml, slugify, uniqueSlug } from "@/lib/engine/blog";
import { L } from "@/lib/i18n-server";
import { articleOf } from "../gate";

type ACtx = Ctx<{ id: string; aid: string }>;

export const GET = handle(async (_req: Request, ctx: ACtx) => {
  const { project: p } = await projectFromCtx(ctx);
  const { aid } = await ctx.params;
  return ok({ article: articleView(articleOf(p.id, aid)) });
});

/** Modification à la main (ne consomme rien). Restauration depuis la corbeille : { restore: true }. */
export const PATCH = handle(async (req: Request, ctx: ACtx) => {
  const { project: p } = await projectFromCtx(ctx);
  const { aid } = await ctx.params;
  const a = articleOf(p.id, aid);
  const b = await body(
    req,
    z.object({
      title: z.string().trim().min(1).max(200).optional(),
      slug: z.string().trim().max(120).optional(),
      metaTitle: z.string().max(200).optional(),
      metaDescription: z.string().max(400).optional(),
      excerpt: z.string().max(1000).optional(),
      bodyHtml: z.string().max(200_000).optional(),
      tags: z.array(z.string().trim().max(40)).max(12).optional(),
      coverAssetId: z.string().nullable().optional(),
      status: z.enum(["draft", "ready"]).optional(),
      restore: z.boolean().optional(),
    }),
  );
  if (b.restore) {
    run("UPDATE blog_articles SET deleted_at = NULL, slug = ?, updated_at = ? WHERE id = ?", uniqueSlug(p.id, a.slug, a.id), now(), a.id);
    return ok({ article: articleView(articleOf(p.id, aid)) });
  }
  if (a.deleted_at) throw new HttpError(409, L("Cet article est dans la corbeille : restaurez-le pour le modifier.", "This post is in the trash: restore it to edit it."));
  if (b.coverAssetId) {
    const c = getAsset(b.coverAssetId);
    if (!c || c.project_id !== p.id || c.kind !== "image") throw new HttpError(400, L("Choisissez une image du projet.", "Choose an image from the project."));
  }
  const fields: [string, unknown][] = [];
  if (b.title !== undefined) fields.push(["title", b.title]);
  if (b.slug !== undefined) fields.push(["slug", uniqueSlug(p.id, slugify(b.slug || b.title || a.title), a.id)]);
  if (b.metaTitle !== undefined) fields.push(["meta_title", fitLength(b.metaTitle, META_TITLE_MAX)]);
  if (b.metaDescription !== undefined) fields.push(["meta_description", fitLength(b.metaDescription, META_DESCRIPTION_MAX)]);
  if (b.excerpt !== undefined) fields.push(["excerpt", b.excerpt.trim()]);
  if (b.bodyHtml !== undefined) fields.push(["body_html", sanitizeBlogHtml(b.bodyHtml)]);
  if (b.tags !== undefined) fields.push(["tags", JSON.stringify([...new Set(b.tags.filter(Boolean))])]);
  if (b.coverAssetId !== undefined) fields.push(["cover_asset_id", b.coverAssetId]);
  // Un article publié qui change repasse « prêt » : il sera à republier.
  const status = b.status ?? (a.status === "published" && fields.length ? "ready" : a.status);
  fields.push(["status", status]);
  run(`UPDATE blog_articles SET ${fields.map(([c]) => `${c} = ?`).join(", ")}, updated_at = ? WHERE id = ?`, ...fields.map(([, v]) => v), now(), a.id);
  return ok({ article: articleView(articleOf(p.id, aid)) });
});

/** Mise à la corbeille (restaurable). */
export const DELETE = handle(async (_req: Request, ctx: ACtx) => {
  const { project: p } = await projectFromCtx(ctx);
  const { aid } = await ctx.params;
  const a = articleOf(p.id, aid);
  run("UPDATE blog_articles SET deleted_at = ?, updated_at = ? WHERE id = ?", now(), now(), a.id);
  return ok({ ok: true });
});
