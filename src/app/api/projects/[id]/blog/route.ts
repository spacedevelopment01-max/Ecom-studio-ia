import { z } from "zod";
import {HttpError} from "@/lib/auth";
import {tx} from "@/lib/db";
import {quoteNativeBlog,checkNativeBlog,signedNativeBlog,previousNativeBlog,nativeBlogRequestHash} from "@/lib/seo-v2/native-blog-consent";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { aiReady } from "@/lib/ai/llm";
import { shopifyConnection } from "@/lib/integrations/shopify";
import { articleView, blogAccess, countTrashed, blogPlanReason, INTENTS, listArticles, storeLinks } from "@/lib/engine/blog";
import { L,contentLang } from "@/lib/i18n-server";
import { gateBlogWrite } from "./gate";

/** Articles du projet, droits du compte (forfait, articles restants) et possibilités de publication. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const trash = new URL(req.url).searchParams.get("trash") === "1";
  const a = blogAccess(user.id, p.id);
  return ok({
    articles: listArticles(p.id).map(articleView),
    trash: trash ? listArticles(p.id, true).map(articleView) : undefined,
    trashCount: countTrashed(p.id),
    access: { allowed: a.allowed, admin: a.admin, plan: a.plan, left: a.left, included: a.included, reason: blogPlanReason(user.id, p.id) },
    shopify: !!shopifyConnection(user.id, p.id),
    ai: aiReady().llm,
    links: storeLinks(p.id),
  });
});

/** Écrire un article (tâche de fond, SEO Engine V2) : sujet proposé ou libre. Consomme 1 article écrit par l'IA. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  // Sujet proposé : sa requête et son intention de recherche suivent jusqu'à la rédaction (et sont enregistrées).
  const b = await body(req, z.object({ action:z.enum(["quote","write"]).default("write"),operationId:z.string().min(8).max(100).optional(),confirmation:z.boolean().optional(),approvalToken:z.string().max(200000).optional(),topic: z.string().trim().max(200).optional(), brief: z.string().trim().max(1500).optional(), keyword: z.string().trim().max(80).optional(), intent: z.enum(INTENTS).optional() }));
  // SEO & Copywriting Engine V2 (article de blog) : faits vérifiés, contrôles, document éditable et versionné, rangé
  // dans le blog (relecture, couverture, publication). Le mot-clé donné reste une hypothèse, jamais un volume vérifié.
  const request = {
    type: "blog_article" as const,lang:contentLang(),
    request: [b.topic, b.brief].filter(Boolean).join(" — ") || null,
    keyword: b.keyword ? { term: b.keyword.toLowerCase(), intent: b.intent === "transactionnelle" ? ("transactional" as const) : b.intent === "commerciale" ? ("commercial" as const) : ("informational" as const), source: "semantic_hypothesis" as const, metrics: null, basis: "choisi par le client" } : null,
  };
  return tx(()=>{
    if(!b.operationId)throw new HttpError(409,"Vérifiez puis confirmez l’autorisation de cet article.","blog_consent_required");
    const previous=previousNativeBlog(user.id,p.id,b.operationId,request);
    if(b.action==='quote'&&previous)return ok({jobId:previous.id,engine:'seo-v2'});
    if(b.action==='write'&&b.confirmation!==true)throw new HttpError(409,"Confirmez l’autorisation de cet article.","blog_consent_required");
    if(previous){signedNativeBlog(user.id,p.id,b.operationId,request,b.approvalToken);return ok({jobId:previous.id,engine:'seo-v2'});}
    gateBlogWrite(user.id,p.id);
    if(b.action==='quote')return ok(quoteNativeBlog(user,p.id,b.operationId,request));
    const approval=checkNativeBlog(user.id,p.id,b.operationId,request,b.approvalToken);
    const job=enqueue({userId:user.id,projectId:p.id,type:'content.v2',label:L("Article de blog","Blog post"),idempotencyKey:'native-blog:'+b.operationId,maxAttempts:1,payload:{projectId:p.id,request,costCapMicro:approval.capMicro,nativeBlogQuote:{operationId:b.operationId,requestHash:nativeBlogRequestHash(request),token:b.approvalToken}}});
    return ok({jobId:job.id,engine:'seo-v2'});
  });
});
