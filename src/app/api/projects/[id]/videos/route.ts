import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { HttpError } from "@/lib/auth";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  if (!p.brand) throw new HttpError(409, L("Créez d'abord la marque.", "Create the brand first."));
  const b = await body(req, z.object({ format: z.enum(["9:16", "1:1", "4:5", "16:9"]), goal: z.string().max(400).optional(), useAiClip: z.boolean().optional(), music: z.enum(["calm", "pulse", "none"]).optional(), target: z.enum(["ads", "social", "shop"]).optional(), url: z.string().max(120).optional() }));
  const job = enqueue({ userId: user.id, projectId: p.id, type: "video.render", label: L(`Vidéo ${b.format}`, `Video ${b.format}`), payload: b });
  return ok({ jobId: job.id });
});
