import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { aiAvailability } from "@/lib/ai/config";
import { shopifyConnection } from "@/lib/integrations/shopify";
import { articleView, blogAccess, blogPlanReason, listArticles, storeLinks } from "@/lib/engine/blog";
import { L } from "@/lib/i18n-server";
import { gateBlogWrite } from "./gate";

/** Articles du projet, droits du compte (forfait, articles restants) et possibilités de publication. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const trash = new URL(req.url).searchParams.get("trash") === "1";
  const a = blogAccess(user.id);
  return ok({
    articles: listArticles(p.id).map(articleView),
    trash: trash ? listArticles(p.id, true).map(articleView) : undefined,
    trashCount: listArticles(p.id, true).length,
    access: { allowed: a.allowed, admin: a.admin, plan: a.plan, left: a.left, included: a.included, reason: blogPlanReason(user.id) },
    shopify: !!shopifyConnection(user.id, p.id),
    ai: aiAvailability().llm,
    links: storeLinks(p.id),
  });
});

/** Écrire un article (tâche de fond) : sujet proposé ou libre. Consomme 1 article une fois l'article écrit. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ topic: z.string().trim().max(200).optional(), brief: z.string().trim().max(1500).optional() }));
  gateBlogWrite(user.id, p.id);
  const job = enqueue({ userId: user.id, projectId: p.id, type: "blog.write", label: L("Article de blog", "Blog post"), payload: { topic: b.topic || undefined, brief: b.brief || undefined } });
  return ok({ jobId: job.id });
});
