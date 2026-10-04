import { handle } from "@/lib/http";
import { HttpError, ownedProject, requireUser } from "@/lib/auth";
import { getAsset } from "@/lib/library";
import { capcutPack } from "@/lib/integrations/capcut";
import { L } from "@/lib/i18n-server";

export const runtime = "nodejs";

export const GET = handle(async (_req: Request, ctx: { params: Promise<{ fid: string }> }) => {
  const user = await requireUser();
  const { fid } = await ctx.params;
  const a = getAsset(fid);
  if (!a) throw new HttpError(404, L("Fichier introuvable.", "File not found."));
  ownedProject(user, a.project_id);
  const { zip, name } = await capcutPack(a.project_id, a.id);
  return new Response(new Uint8Array(zip), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}` } });
});
