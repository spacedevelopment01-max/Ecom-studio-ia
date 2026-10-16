import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { L, uiLang } from "@/lib/i18n-server";
import { getAsset } from "@/lib/library";
import { currentTheme, saveThemeVersion } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { replaceThemeFile } from "@/lib/theme/stock-notice";

export const runtime = "nodejs";

/** Remplace une photo du site (photo libre de droits signalée) par une image de la bibliothèque, partout où elle apparaît. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const cur = currentTheme(p.id);
  if (!cur) throw new HttpError(409, L("Aucun site.", "No website yet."));
  const b = await body(req, z.object({ file: z.string().min(1).max(200), assetId: z.string().min(1).max(64) }));
  const a = getAsset(b.assetId);
  const r = replaceThemeFile(cur.spec, b.file, a && a.project_id === p.id ? a : null, uiLang());
  if ("error" in r) throw new HttpError(400, r.error);
  const v = saveThemeVersion(p.id, r.spec, L("Photo libre de droits remplacée", "Royalty-free photo replaced"), "user");
  return ok({ versionId: v.id, number: v.number });
});
