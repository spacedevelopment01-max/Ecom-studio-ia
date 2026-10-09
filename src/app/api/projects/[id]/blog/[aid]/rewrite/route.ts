import { z } from "zod";
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
  const b = await body(req, z.object({ instruction: z.string().trim().max(1000).optional() }));
  gateBlogWrite(user.id, p.id);
  // Article du moteur V2 : nouvelle rédaction de SON document (même lignée, versions conservées ; un texte modifié par
  // le client n'est jamais écrasé). Ancien article : plus de réécriture par l'ancien moteur (modification à la main,
  // ou nouvel article avec le moteur V2) — jamais deux versions concurrentes du même article.
  const doc = listContents(p.id, ["blog_article"]).map((v) => latestContent(p.id, v.docKey)).find((d) => d && blogIdFor(d.version.docKey) === a.id);
  if (!doc) throw new HttpError(410, L("Cet article vient de l'ancien moteur : modifiez-le directement, ou écrivez un nouvel article (nouveau moteur de rédaction).", "This post comes from the previous engine: edit it directly, or write a new post (new writing engine)."));
  const request = { type: "blog_article" as const, pageKey: doc.doc.page.key, lang: doc.doc.lang, request: b.instruction || null, force: true };
  const job = enqueue({ userId: user.id, projectId: p.id, type: "content.v2", label: L("Réécriture d'un article", "Rewriting a post"), payload: { projectId: p.id, request } });
  return ok({ jobId: job.id, engine: "seo-v2" });
});
