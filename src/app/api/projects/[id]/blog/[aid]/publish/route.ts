import { z } from "zod";
import { now, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { PermanentError } from "@/lib/jobs";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { requirePlan } from "@/lib/plan-gates";
import { pushBlogArticle, shopifyConnection } from "@/lib/integrations/shopify";
import { getAsset } from "@/lib/library";
import { isPublicAppUrl, publicMediaUrl } from "@/lib/public-url";
import { articleView, blogTitleFor, placeholders, sanitizeBlogHtml } from "@/lib/engine/blog";
import { json } from "@/lib/db";
import { L } from "@/lib/i18n-server";
import { articleOf } from "../../gate";

export const runtime = "nodejs";

/** Envoi dans le blog de la boutique Shopify connectée, en brouillon ou publié. */
export const POST = handle(async (req: Request, ctx: Ctx<{ id: string; aid: string }>) => {
  const { user, project: p } = await projectFromCtx(ctx);
  requirePlan(user);
  const { aid } = await ctx.params;
  const a = articleOf(p.id, aid);
  if (a.deleted_at) throw new HttpError(409, L("Cet article est dans la corbeille.", "This post is in the trash."));
  const { publish, unpublish } = await body(req, z.object({ publish: z.boolean(), unpublish: z.boolean().optional() }));
  // Repasser en brouillon un article en ligne le retire du blog public : seulement sur demande explicite.
  if (!publish && a.published_url && !unpublish)
    throw new HttpError(409, L("Cet article est en ligne : l'envoyer en brouillon le retirerait de votre blog. Utilisez « Mettre à jour sur Shopify », ou « Retirer du blog » pour le dépublier.", "This post is live: sending it as a draft would remove it from your blog. Use \"Update on Shopify\", or \"Remove from blog\" to unpublish it."));
  const c = shopifyConnection(user.id, p.id);
  if (!c) throw new HttpError(409, L("Connectez votre boutique Shopify dans l'onglet Connexions, ou exportez l'article.", "Connect your Shopify store in the Connections tab, or export the post."));
  const missing = placeholders(`${a.title}\n${a.excerpt}\n${a.body_html}`);
  if (publish && missing.length) throw new HttpError(409, L(`Complétez d'abord ${missing.length} passage(s) « [À compléter : …] » : un article publié ne doit rien contenir d'incomplet. Vous pouvez l'envoyer en brouillon.`, `First fill in ${missing.length} "[To complete: …]" passage(s): a published post must not contain anything unfinished. You can send it as a draft.`));
  const cover = a.cover_asset_id ? getAsset(a.cover_asset_id) : undefined;
  const live = cover && !cover.deleted_at ? cover : undefined;
  const ext = live?.mime === "image/png" ? "png" : live?.mime === "image/webp" ? "webp" : "jpg";
  const imageUrl = live && isPublicAppUrl() ? publicMediaUrl(live.id, ext, 24 * 3600) : null;
  try {
    const r = await pushBlogArticle(c, {
      ref: a.platform_ref,
      title: a.title,
      handle: a.slug,
      bodyHtml: sanitizeBlogHtml(a.body_html),
      summary: a.excerpt ? `<p>${a.excerpt.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>` : "",
      tags: json<string[]>(a.tags, []),
      author: p.brand?.name ?? p.name,
      metaTitle: a.meta_title,
      metaDescription: a.meta_description,
      imageUrl,
      imageAlt: a.title,
      publish,
      blogTitle: blogTitleFor(a.language),
    });
    run("UPDATE blog_articles SET platform_ref = ?, published_url = ?, status = ?, updated_at = ? WHERE id = ?", r.ref, publish ? r.url : null, publish ? "published" : a.status === "published" ? "ready" : a.status, now(), a.id);
    return ok({ article: articleView(articleOf(p.id, aid)), url: r.url, published: publish, hasCover: !!a.cover_asset_id, coverSent: !!imageUrl });
  } catch (e) {
    if (e instanceof HttpError) throw e;
    const msg = (e as Error).message;
    throw new HttpError(e instanceof PermanentError ? 409 : 502, msg || L("Shopify n'a pas répondu. Réessayez dans un instant.", "Shopify didn't respond. Please try again in a moment."));
  }
});
