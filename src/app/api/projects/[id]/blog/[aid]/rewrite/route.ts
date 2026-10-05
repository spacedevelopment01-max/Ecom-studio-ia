import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { enqueue } from "@/lib/jobs";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";
import { articleOf, gateBlogWrite } from "../../gate";

/** « Réécrire avec l'IA » : consomme 1 article une fois la nouvelle version écrite. */
export const POST = handle(async (req: Request, ctx: Ctx<{ id: string; aid: string }>) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const { aid } = await ctx.params;
  const a = articleOf(p.id, aid);
  if (a.deleted_at) throw new HttpError(409, L("Cet article est dans la corbeille.", "This post is in the trash."));
  const b = await body(req, z.object({ instruction: z.string().trim().max(1000).optional() }));
  gateBlogWrite(user.id, p.id);
  const job = enqueue({ userId: user.id, projectId: p.id, type: "blog.write", label: L("Réécriture d'un article", "Rewriting a post"), payload: { articleId: a.id, instruction: b.instruction || undefined, lang: a.language === "en" ? "en" : "fr" } });
  return ok({ jobId: job.id });
});
