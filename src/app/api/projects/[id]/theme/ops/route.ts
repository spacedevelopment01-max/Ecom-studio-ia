import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { L } from "@/lib/i18n-server";
import { currentTheme, saveThemeVersion } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { OpSchema, applyOps, validateSpec } from "@/lib/theme/ops";
import { getAsset } from "@/lib/library";
import { themeFileName } from "@/lib/engine/shop";
import { assertSectionGeneration } from "@/lib/theme/custom-access";

/** Modifications directes depuis l'interface (déplacer, masquer, verrouiller, remplacer une image). */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const cur = currentTheme(p.id);
  if (!cur) throw new HttpError(409, L("Aucune boutique.", "No store yet."));
  const b = await body(req, z.object({ ops: z.array(OpSchema).min(1).max(50), summary: z.string().max(200).optional() }));
  // Section sur mesure (Liquid libre) : réservée aux forfaits qui l'incluent, comme « Générer » à l'écran.
  if (b.ops.some((o) => o.op === "custom_section")) assertSectionGeneration(user);
  const targeted = new Set(b.ops.filter((o: any) => o.template && o.section).map((o: any) => `${o.template}:${o.section}`));
  const res = applyOps(cur.spec, b.ops, {
    targeted,
    mediaFile: (assetId) => {
      const a = getAsset(assetId);
      return a && a.project_id === p.id ? { filename: themeFileName(a, a.role ?? "media") } : null;
    },
  });
  if (!res.applied.length) throw new HttpError(400, res.rejected.map((r) => r.reason).join(" ; ") || L("Aucune modification applicable.", "No applicable changes."));
  const problems = validateSpec(res.spec);
  if (problems.length) throw new HttpError(400, problems.join(" ; "));
  const v = saveThemeVersion(p.id, res.spec, b.summary ?? res.applied.join(" ; ").slice(0, 200), "user");
  return ok({ versionId: v.id, number: v.number, applied: res.applied, rejected: res.rejected.map((r) => r.reason) });
});
