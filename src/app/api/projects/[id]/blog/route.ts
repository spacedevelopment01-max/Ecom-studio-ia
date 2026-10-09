import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { aiAvailability } from "@/lib/ai/config";
import { shopifyConnection } from "@/lib/integrations/shopify";
import { articleView, blogAccess, countTrashed, blogPlanReason, INTENTS, listArticles, storeLinks } from "@/lib/engine/blog";
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
    trashCount: countTrashed(p.id),
    access: { allowed: a.allowed, admin: a.admin, plan: a.plan, left: a.left, included: a.included, reason: blogPlanReason(user.id) },
    shopify: !!shopifyConnection(user.id, p.id),
    ai: aiAvailability().llm,
    links: storeLinks(p.id),
  });
});

/** Écrire un article (tâche de fond, SEO Engine V2) : sujet proposé ou libre. Consomme 1 article écrit par l'IA. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  // Sujet proposé : sa requête et son intention de recherche suivent jusqu'à la rédaction (et sont enregistrées).
  const b = await body(req, z.object({ topic: z.string().trim().max(200).optional(), brief: z.string().trim().max(1500).optional(), keyword: z.string().trim().max(80).optional(), intent: z.enum(INTENTS).optional() }));
  gateBlogWrite(user.id, p.id);
  // SEO & Copywriting Engine V2 (article de blog) : faits vérifiés, contrôles, document éditable et versionné, rangé
  // dans le blog (relecture, couverture, publication). Le mot-clé donné reste une hypothèse, jamais un volume vérifié.
  const request = {
    type: "blog_article" as const,
    request: [b.topic, b.brief].filter(Boolean).join(" — ") || null,
    keyword: b.keyword ? { term: b.keyword.toLowerCase(), intent: b.intent === "transactionnelle" ? ("transactional" as const) : b.intent === "commerciale" ? ("commercial" as const) : ("informational" as const), source: "semantic_hypothesis" as const, metrics: null, basis: "choisi par le client" } : null,
  };
  const job = enqueue({ userId: user.id, projectId: p.id, type: "content.v2", label: L("Article de blog", "Blog post"), payload: { projectId: p.id, request } });
  return ok({ jobId: job.id, engine: "seo-v2" });
});
