import { handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { importThemeForProject } from "@/lib/engine/theme-import";

export const runtime = "nodejs";

/** Import du thème Shopify du client (fichier ZIP téléchargé depuis Shopify › Thèmes). */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const form = await req.formData();
  const file = form.get("theme");
  if (!(file instanceof File)) throw new HttpError(400, "Joignez le fichier ZIP du thème.");
  if (file.size > 60 * 1024 * 1024) throw new HttpError(413, "Le fichier dépasse 60 Mo.");
  try {
    const r = await importThemeForProject(p.id, user.id, Buffer.from(await file.arrayBuffer()), file.name || "theme.zip");
    return ok(r);
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(422, (e as Error).message);
  }
});
