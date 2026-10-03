/**
 * Photo d'une valeur de variante (ex. le coloris « Vert sauge »). Elle est détourée et mise en
 * packshot à la prochaine construction de la boutique, puis montrée quand le client choisit cette valeur.
 */
import { all, run, now } from "@/lib/db";
import { HttpError } from "@/lib/auth";
import { handle, ok } from "@/lib/http";
import { saveAsset, type Asset } from "@/lib/library";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";

export const runtime = "nodejs";
const MAX = 25 * 1024 * 1024;

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const rows = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'variant-original' AND deleted_at IS NULL ORDER BY created_at DESC", p.id);
  return ok({ photos: rows.map((a) => ({ id: a.id, variant: (JSON.parse(a.meta || "{}") as { variant?: string }).variant ?? "", url: `/api/files/${a.id}?thumb=1` })) });
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const form = await req.formData();
  const value = typeof form.get("value") === "string" ? String(form.get("value")).trim() : "";
  const photo = form.get("photo");
  const values = p.product.variants.flatMap((v) => v.values);
  if (!value || !values.some((v) => v.trim().toLowerCase() === value.toLowerCase())) throw new HttpError(400, `« ${value} » n'est pas une valeur de variante du produit.`);
  if (!photo || typeof photo === "string" || !photo.size) throw new HttpError(400, "Ajoutez une photo.");
  if (photo.size > MAX) throw new HttpError(413, "La photo dépasse 25 Mo.");
  if (!/^image\/(jpeg|png|webp|avif)$/.test(photo.type)) throw new HttpError(415, "Format non pris en charge (JPEG, PNG, WebP, AVIF).");
  // Une seule photo par valeur : la précédente part à la corbeille.
  for (const a of all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'variant-original' AND deleted_at IS NULL", p.id)) {
    if (((JSON.parse(a.meta || "{}") as { variant?: string }).variant ?? "").toLowerCase() === value.toLowerCase()) run("UPDATE assets SET deleted_at = ? WHERE id = ?", now(), a.id);
  }
  const a = await saveAsset({ projectId: p.id, userId: user.id, data: Buffer.from(await photo.arrayBuffer()), name: photo.name || `${value}.jpg`, mime: photo.type, role: "variant-original", folderKey: "product.originals", origin: "upload", meta: { variant: value, uploadedAt: now() } });
  return ok({ id: a.id, variant: value }, { status: 201 });
});
