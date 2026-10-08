import { handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { currentTheme } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L, uiLang } from "@/lib/i18n-server";
import { CMS_PLATFORMS } from "@/lib/cms-v2/export";
import { exportStatus } from "@/lib/cms-v2/status";
import type { CmsPlatform } from "@/lib/cms-v2/types";

export const runtime = "nodejs";

/** Capacités réelles, limites, informations manquantes et exports déjà générés pour une plateforme (lecture seule). */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const platform = new URL(req.url).searchParams.get("platform") ?? "shopify";
  if (!CMS_PLATFORMS.includes(platform as CmsPlatform)) throw new HttpError(400, L("Plateforme inconnue.", "Unknown platform."));
  const v = currentTheme(p.id);
  if (!v) throw new HttpError(404, L("Aucune boutique à exporter.", "No store to export."));
  return ok(exportStatus(p.id, v.spec, platform as CmsPlatform, uiLang()));
});
