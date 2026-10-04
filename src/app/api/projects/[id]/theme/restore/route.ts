import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { L } from "@/lib/i18n-server";
import { saveThemeVersion, themeVersion } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";

/** Restaure une version : crée une nouvelle version identique (l'historique est conservé). */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ versionId: z.string() }));
  const v = themeVersion(p.id, b.versionId);
  if (!v) throw new HttpError(404, L("Version introuvable.", "Version not found."));
  const nv = saveThemeVersion(p.id, v.spec, L(`Restauration de la version ${v.version.number}`, `Restored version ${v.version.number}`), "user");
  return ok({ versionId: nv.id, number: nv.number });
});
