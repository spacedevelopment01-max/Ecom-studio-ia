import { handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { runForUser, withAiDisabled } from "@/lib/ai/access";
import { suggestTopics } from "@/lib/engine/blog";
import { gateBlogPlan } from "../gate";

/** Sujets d'articles proposés (léger, ne consomme aucun article du forfait). */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  gateBlogPlan(user.id, p.id);
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  // Opening this free suggestion list is not financial consent. Reuse acquired ideas or native local suggestions.
  return ok(await runForUser(user.id, () => withAiDisabled("Free blog-topic suggestions without paid confirmation", () => suggestTopics(p, { refresh })), "normal", p.id));
});
