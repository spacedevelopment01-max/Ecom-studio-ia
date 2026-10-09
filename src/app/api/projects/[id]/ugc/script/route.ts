import { handle } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";

/** Ancien script UGC : la vidéo UGC se prépare avec le plan du moteur vidéo V2 (onglet Vidéos, type « UGC »). */
export const POST = handle(async (_req: Request, ctx: Ctx) => {
  await projectFromCtx(ctx);
  throw new HttpError(410, L("Les vidéos UGC se préparent avec le moteur vidéo de l'onglet Vidéos (type « UGC »).", "UGC videos are prepared with the video engine in the Videos tab (\"UGC\" type)."));
});
