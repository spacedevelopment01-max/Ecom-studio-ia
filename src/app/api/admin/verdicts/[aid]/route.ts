import { handle } from "@/lib/http";
import { HttpError, requireAdmin } from "@/lib/auth";
import { one } from "@/lib/db";
import { assetData, getAsset } from "@/lib/library";
import { L } from "@/lib/i18n-server";

export const runtime = "nodejs";

/** L'image d'une ligne du carnet, pour l'administration seulement (images relues par SINA). */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ aid: string }> }) => {
  await requireAdmin();
  const { aid } = await ctx.params;
  if (!one("SELECT 1 FROM verdicts_images WHERE asset_id=?", aid)) throw new HttpError(404, L("Image introuvable.", "Image not found."));
  const a = getAsset(aid);
  if (!a || a.deleted_at) throw new HttpError(404, L("Image introuvable.", "Image not found."));
  return new Response(new Uint8Array(assetData(a)), { headers: { "content-type": a.mime || "image/png", "cache-control": "private, max-age=3600" } });
});
