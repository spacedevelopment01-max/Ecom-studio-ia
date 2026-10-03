import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { remember, saveBrand } from "@/lib/projects";
import { saveBrandGuide } from "@/lib/engine/brand";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { HttpError } from "@/lib/auth";
import { DIRECTIONS } from "@/lib/theme/directions";

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

/** Modifications manuelles de la marque et validation d'éléments. */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  if (!p.brand) throw new HttpError(409, "La marque n'est pas encore créée.");
  const b = await body(
    req,
    z.object({
      name: z.string().min(1).max(80).optional(),
      tagline: z.string().max(140).optional(),
      positioning: z.string().max(1000).optional(),
      audience: z.string().max(600).optional(),
      story: z.string().max(3000).optional(),
      tone: z.object({ voice: z.string(), do: z.array(z.string()), dont: z.array(z.string()) }).optional(),
      palette: z.object({ primary: hex, secondary: hex, accent: hex, light: hex, dark: hex }).optional(),
      direction: z.enum(DIRECTIONS.map((d) => d.id) as [string, ...string[]]).optional(),
      validate: z.array(z.string()).optional(),
      unvalidate: z.array(z.string()).optional(),
    }),
  );
  const brand = { ...p.brand } as any;
  for (const k of ["name", "tagline", "positioning", "audience", "story", "tone", "palette", "direction"] as const) {
    if (b[k] !== undefined) {
      brand[k] = b[k];
      if (k === "name") brand.nameStatus = "validated";
      remember(p.id, { kind: "decision", key: `marque.${k}`, value: typeof b[k] === "string" ? (b[k] as string) : JSON.stringify(b[k]), source: "user", scope: "brand" });
    }
  }
  brand.validated = [...new Set([...(brand.validated ?? []), ...(b.validate ?? [])])].filter((x: string) => !(b.unvalidate ?? []).includes(x));
  if (b.validate?.includes("logo")) brand.logo = { ...brand.logo, status: "validated" };
  saveBrand(p.id, brand);
  await saveBrandGuide(p.id);
  return ok({ brand });
});

/** Nouvelle proposition de marque (les éléments validés sont conservés). */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ guidance: z.string().max(1000).optional() }));
  const job = enqueue({ userId: user.id, projectId: p.id, type: "brand.build", label: "Nouvelle direction de marque", payload: { projectId: p.id, guidance: b.guidance } });
  return ok({ jobId: job.id });
});
