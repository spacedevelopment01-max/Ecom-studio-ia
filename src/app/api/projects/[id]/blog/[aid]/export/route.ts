import { handle } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { requirePlan } from "@/lib/plan-gates";
import { articleHtml, articlesWxr } from "@/lib/engine/blog";
import { L } from "@/lib/i18n-server";
import { articleOf } from "../../gate";

export const runtime = "nodejs";

/** Export : page HTML prête à coller (?format=html) ou fichier d'import WordPress / WooCommerce (?format=wxr). */
export const GET = handle(async (req: Request, ctx: Ctx<{ id: string; aid: string }>) => {
  const { user, project: p } = await projectFromCtx(ctx);
  requirePlan(user);
  const { aid } = await ctx.params;
  const a = articleOf(p.id, aid);
  const format = new URL(req.url).searchParams.get("format") ?? "html";
  const shop = p.brand?.name ?? p.name;
  let data: string;
  let name: string;
  let type: string;
  if (format === "html") {
    data = articleHtml(a, shop);
    name = `${a.slug}.html`;
    type = "text/html; charset=utf-8";
  } else if (format === "wxr") {
    data = articlesWxr([a], { title: shop, url: p.row.store_url, language: a.language === "en" ? "en-US" : "fr-FR", author: shop });
    name = `${a.slug}-wordpress.xml`;
    type = "application/xml; charset=utf-8";
  } else throw new HttpError(400, L("Format inconnu.", "Unknown format."));
  return new Response(data, { headers: { "Content-Type": type, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}` } });
});
