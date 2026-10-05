import { z } from "zod";
import { one } from "@/lib/db";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { getAsset, publicAssetSummary, type Asset } from "@/lib/library";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { setAsideCutout } from "@/lib/engine/cutouts";
import { L } from "@/lib/i18n-server";

export const runtime = "nodejs";

const Req = z.object({
  /** run : trier et détourer les photos en attente ; redo : refaire le détourage d'une photo ; setAside : « Ne pas utiliser ». */
  action: z.enum(["run", "redo", "setAside"]),
  assetId: z.string().optional(),
});

/** Détourages de l'onglet Produit : lancement, nouvel essai, mise à l'écart. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, Req);
  if (p.business === "services") throw new HttpError(400, L("Pas de détourage pour un site de services.", "No cutouts for a services website."));
  if (b.action === "setAside") {
    const a = b.assetId ? getAsset(b.assetId) : undefined;
    if (!a || a.project_id !== p.id || a.role !== "cutout") throw new HttpError(404, L("Détourage introuvable.", "Cutout not found."));
    setAsideCutout(a);
    return ok({ asset: publicAssetSummary(getAsset(a.id)!) });
  }
  if (b.action === "redo") {
    // La photo d'origine du détourage (ou la photo elle-même).
    const a = b.assetId ? getAsset(b.assetId) : undefined;
    if (!a || a.project_id !== p.id) throw new HttpError(404, L("Photo introuvable.", "Photo not found."));
    const sourceId = a.role === "cutout" ? a.source_asset_id : a.id;
    if (!sourceId || !one<Asset>("SELECT id FROM assets WHERE id = ? AND project_id = ? AND deleted_at IS NULL", sourceId, p.id)) throw new HttpError(404, L("Photo d'origine introuvable.", "Original photo not found."));
    const job = enqueue({ userId: user.id, projectId: p.id, type: "cutout.run", label: L("Nouveau détourage du produit", "New product cutout"), payload: { projectId: p.id, redo: sourceId } });
    return ok({ jobId: job.id });
  }
  const job = enqueue({ userId: user.id, projectId: p.id, type: "cutout.run", label: L("Tri et détourage des photos", "Sorting and cutting out photos"), payload: { projectId: p.id } });
  return ok({ jobId: job.id });
});
