import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { HttpError } from "@/lib/auth";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { requireCreationPlan } from "@/lib/plan-gates";
import { aiAvailability } from "@/lib/ai/config";
import { cleanUgcScript, ugcIssues } from "@/lib/ugc-rules";
import { L, contentLang, uiLang } from "@/lib/i18n-server";
import { UgcOptionsSchema, UgcScriptInput } from "./schema";
import { serviceUgcIssues } from "@/lib/engine/ugc";

/** Lance la génération d'une vidéo UGC à partir du script relu par le marchand. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  requireCreationPlan(user, "ugc");
  if (!p.brand) throw new HttpError(409, L("Créez d'abord la marque.", "Create the brand first."));
  if (!aiAvailability().ugc) throw new HttpError(409, L("La vidéo UGC demande un fournisseur d'images et un fournisseur vidéo : l'administration doit les activer.", "UGC video requires an image provider and a video provider: the administrator must enable them."));
  const b = await body(req, z.object({ options: UgcOptionsSchema, script: UgcScriptInput }));
  const script = cleanUgcScript(b.script);
  if (script.beats.length !== b.options.beats) b.options.beats = script.beats.length;
  // Services : la personne présente l'activité, elle ne se dit ni cliente ni le professionnel.
  const issues = [...ugcIssues(script, contentLang(), uiLang()), ...(p.business === "services" ? serviceUgcIssues(script) : [])];
  if (issues.length) throw new HttpError(422, issues.join(" "));
  const job = enqueue({ userId: user.id, projectId: p.id, type: "video.ugc", label: L(`Vidéo UGC ${b.options.format}`, `UGC video ${b.options.format}`), payload: { options: b.options, script } });
  return ok({ jobId: job.id });
});
