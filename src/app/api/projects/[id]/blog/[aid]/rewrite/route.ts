import { z } from "zod";
import {tx} from "@/lib/db";
import {quoteNativeBlog,checkNativeBlog,signedNativeBlog,previousNativeBlog,nativeBlogRequestHash} from "@/lib/seo-v2/native-blog-consent";
import { body, handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { enqueue } from "@/lib/jobs";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";
import { articleOf, gateBlogWrite } from "../../gate";
import { latestContent, listContents } from "@/lib/seo-v2/store";
import { blogIdFor } from "@/lib/seo-v2/blog";

/** « Réécrire avec l'IA » : consomme 1 article une fois la nouvelle version écrite. */
export const POST = handle(async (req: Request, ctx: Ctx<{ id: string; aid: string }>) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const { aid } = await ctx.params;
  const a = articleOf(p.id, aid);
  if (a.deleted_at) throw new HttpError(409, L("Cet article est dans la corbeille.", "This post is in the trash."));
  const b = await body(req, z.object({action:z.enum(["quote","write"]).default("write"),operationId:z.string().min(8).max(100).optional(),confirmation:z.boolean().optional(),approvalToken:z.string().max(200000).optional(),instruction: z.string().trim().max(1000).optional() }));
  // Article du moteur V2 : nouvelle rédaction de SON document (même lignée, versions conservées ; un texte modifié par
  // le client n'est jamais écrasé). Ancien article : plus de réécriture par l'ancien moteur (modification à la main,
  // ou nouvel article avec le moteur V2) — jamais deux versions concurrentes du même article.
  const doc = listContents(p.id, ["blog_article"]).map((v) => latestContent(p.id, v.docKey)).find((d) => d && blogIdFor(d.version.docKey) === a.id);
  if (!doc) throw new HttpError(410, L("Cet article vient de l'ancien moteur : modifiez-le directement, ou écrivez un nouvel article (nouveau moteur de rédaction).", "This post comes from the previous engine: edit it directly, or write a new post (new writing engine)."));
  const request = { type: "blog_article" as const, pageKey: doc.doc.page.key, target:{page:doc.doc.page}, lang: doc.doc.lang, request: b.instruction || null, force: true };
  return tx(()=>{
    if(!b.operationId)throw new HttpError(409,"Vérifiez puis confirmez l’autorisation de cet article.","blog_consent_required");
    const previous=previousNativeBlog(user.id,p.id,b.operationId,request);
    if(b.action==='quote'&&previous)return ok({jobId:previous.id,engine:'seo-v2'});
    if(b.action==='write'&&b.confirmation!==true)throw new HttpError(409,"Confirmez l’autorisation de cet article.","blog_consent_required");
    if(previous){signedNativeBlog(user.id,p.id,b.operationId,request,b.approvalToken);return ok({jobId:previous.id,engine:'seo-v2'});}
    gateBlogWrite(user.id,p.id,a.id);
    if(b.action==='quote')return ok(quoteNativeBlog(user,p.id,b.operationId,request,a.id));
    const approval=checkNativeBlog(user.id,p.id,b.operationId,request,b.approvalToken);
    const job=enqueue({userId:user.id,projectId:p.id,type:'content.v2',label:L("Réécriture d’un article","Rewriting a post"),idempotencyKey:'native-blog:'+b.operationId,maxAttempts:1,payload:{projectId:p.id,request,costCapMicro:approval.capMicro,nativeBlogQuote:{operationId:b.operationId,requestHash:nativeBlogRequestHash(request),token:b.approvalToken}}});
    return ok({jobId:job.id,engine:'seo-v2'});
  });
});
