import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { HttpError } from "@/lib/auth";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { aiAvailability } from "@/lib/ai/config";
import { cleanUgcScript, ugcIssues } from "@/lib/engine/ugc";
import { UgcOptionsSchema, UgcScriptInput } from "./schema";

/** Lance la génération d'une vidéo UGC à partir du script relu par le marchand. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  if (!p.brand) throw new HttpError(409, "Créez d'abord la marque.");
  if (!aiAvailability().ugc) throw new HttpError(409, "La vidéo UGC demande un fournisseur d'images et un fournisseur vidéo : l'administration doit les activer.");
  const b = await body(req, z.object({ options: UgcOptionsSchema, script: UgcScriptInput }));
  const script = cleanUgcScript(b.script);
  if (script.beats.length !== b.options.beats) b.options.beats = script.beats.length;
  const issues = ugcIssues(script);
  if (issues.length) throw new HttpError(422, issues.join(" "));
  const job = enqueue({ userId: user.id, projectId: p.id, type: "video.ugc", label: `Vidéo UGC ${b.options.format}`, payload: { options: b.options, script } });
  return ok({ jobId: job.id });
});
