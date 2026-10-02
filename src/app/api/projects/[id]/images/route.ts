import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { FORMATS, SCENE_STYLES } from "@/lib/media/compose";

const Req = z.object({
  mode: z.enum(["set", "single"]),
  kind: z.enum(["packshot", "scene", "social", "ad", "banner"]).optional(),
  style: z.enum(SCENE_STYLES.map((s) => s.id) as [string, ...string[]]).optional(),
  format: z.enum(Object.keys(FORMATS) as [string, ...string[]]).optional(),
  layout: z.enum(["editorial", "bold", "minimal", "centered", "split"]).optional(),
  headline: z.string().max(120).optional(),
  subline: z.string().max(200).optional(),
  cta: z.string().max(40).optional(),
  useAi: z.boolean().optional(),
  sourceCutoutId: z.string().optional(),
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, Req);
  const job =
    b.mode === "set"
      ? enqueue({ userId: user.id, projectId: p.id, type: "images.generate", label: "Jeu d'images complet", payload: { projectId: p.id, options: { withAi: b.useAi } } })
      : enqueue({ userId: user.id, projectId: p.id, type: "image.single", label: `Image ${b.kind ?? "scene"}`, payload: { projectId: p.id, request: { kind: b.kind ?? "scene", style: b.style, format: b.format, layout: b.layout, headline: b.headline, subline: b.subline, cta: b.cta, useAi: b.useAi, sourceCutoutId: b.sourceCutoutId } } });
  return ok({ jobId: job.id });
});
