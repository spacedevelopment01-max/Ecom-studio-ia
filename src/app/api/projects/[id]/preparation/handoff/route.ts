import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { all, tx } from "@/lib/db";
import type { Asset } from "@/lib/library";
import { readyContract, blockers, stateOf } from "@/lib/preparation/engine";
import { buildProjectHandoff } from "@/lib/project-handoff/contract";
import { PROJECT_CATEGORIES } from "@/lib/project-handoff/categories";
import { categoryForProject, recordCategoryChoice } from "@/lib/project-handoff/category-store";
import { handoffRouting } from "@/lib/project-handoff/routing";
import { loadProject, remember, type Project } from "@/lib/projects";
import { requirePlan } from "@/lib/plan-gates";
import { HttpError } from "@/lib/auth";
import { commitState, inputHash } from "@/lib/preparation/store";
import { rebindRecommendationCategory } from "@/lib/preparation/editorial";

export const runtime = "nodejs";
/** Lecture propriétaire uniquement ; aucun appel fournisseur et aucune mutation de thème. */
function view(p: Project) {
  const ready = readyContract(p.id), state = stateOf(p.id);
  const assets = ready ? all<Asset>("SELECT * FROM assets WHERE project_id=?", p.id) : [];
  const category = categoryForProject(p, state?.stages.brief?.data.input);
  const contract = ready ? ready.handoff ?? buildProjectHandoff(p, ready, assets, category.recommendation) : null;
  return { ready: contract?.status === "ready", approvalsComplete: !!ready, blockers: [...blockers(p.id), ...(contract?.issues ?? [])], category: category.recommendation, categoryContextHash: category.contextHash, categoryChoice: category.explicitChoice, categoryChoiceStale: category.choiceStale, contract, routing: handoffRouting(p, !!state?.stages.brief?.data.input.photoIds.length, !!state?.simulation), generationStarted: false, themeChanged: false, themeConsumerVerified: false };
}
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok(view(p));
});
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  requirePlan(null, p.id);
  const b = await body(req, z.object({ action: z.literal("category-choice").optional(), category: z.enum(PROJECT_CATEGORIES), contextHash: z.string().min(10).max(200) }));
  tx(() => {
    const fresh = loadProject(p.id), state = stateOf(p.id);
    if (state?.pending) throw new HttpError(409, "Une préparation est en cours. Attendez son résultat avant de confirmer le type de site ; vos contenus restent conservés.");
    recordCategoryChoice(fresh, state?.stages.brief?.data.input, b.category, b.contextHash);
    if (state?.stages.content) commitState(p.id, state.revision, next => {
      const content = next.stages.content!;
      content.data.recommendation = rebindRecommendationCategory(fresh, content.data.recommendation);
      // Seule l'éligibilité change : les blocs, leurs versions et leurs contrôles visuels restent identiques.
      if (next.stages.media) next.stages.media.inputHash = inputHash(next, "media");
    });
    const ready = readyContract(p.id);
    remember(p.id, { kind: "artifact", key: "project.ready_for_theme", value: JSON.stringify(ready ?? { ready: false, revision: state?.revision ?? 0 }), source: "local", status: ready ? "confirmed" : "inferred" });
  });
  return ok(view(loadProject(p.id)));
});
