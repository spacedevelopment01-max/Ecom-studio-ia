import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { currentTheme, saveThemeVersion } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { applyOps, validateSpec } from "@/lib/theme/ops";
import { addable, SECTION_LIBRARY } from "@/lib/theme/section-library";
import { withProjectMedia } from "@/lib/theme/section-defaults";

/** Ajout d'une section depuis la bibliothèque : préréglage + médias du projet, à la position choisie. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const cur = currentTheme(p.id);
  if (!cur) throw new HttpError(409, "Aucune boutique.");
  const b = await body(req, z.object({ type: z.string().max(80), template: z.string().max(80), index: z.number().int().min(0).optional() }));
  if (!addable(b.type)) throw new HttpError(400, "Cette section ne s'ajoute pas depuis la bibliothèque.");
  const filled = withProjectMedia(cur.spec, b.type);
  const res = applyOps(cur.spec, [{ op: "add_section", template: b.template, type: b.type, settings: filled.settings as any, blocks: filled.blocks as any, position: b.index === undefined ? undefined : { index: b.index } } as any], { targeted: new Set() });
  if (!res.applied.length) throw new HttpError(400, res.rejected.map((r) => r.reason).join(" ; ") || "Ajout impossible.");
  const problems = validateSpec(res.spec);
  if (problems.length) throw new HttpError(400, problems.join(" ; "));
  const name = SECTION_LIBRARY.find((e) => e.type === b.type)?.name ?? b.type;
  const v = saveThemeVersion(p.id, res.spec, `Section « ${name} » ajoutée`, "user");
  return ok({ versionId: v.id, number: v.number, applied: res.applied });
});
