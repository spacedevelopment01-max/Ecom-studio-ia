import { handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { ideasSourceLabel, readPromptIdeas } from "@/lib/prompt-ideas";

export const runtime = "nodejs";

/** Idées de prompts du projet (une liste par produit ou service, par usage : publication/publicité, image/vidéo). */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const ideas = readPromptIdeas(p);
  return ok({ ...ideas, source: ideasSourceLabel(ideas) });
});
