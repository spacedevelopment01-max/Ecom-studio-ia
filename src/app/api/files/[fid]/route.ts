import fs from "node:fs";
import { z } from "zod";
import { all, json, now, one, run } from "@/lib/db";
import { body, handle, ok } from "@/lib/http";
import { HttpError, ownedProject, requireUser } from "@/lib/auth";
import { getAsset, publicAssetSummary, usagesOf, type Asset } from "@/lib/library";
import { storagePath } from "@/lib/storage";
import { L } from "@/lib/i18n-server";

export const runtime = "nodejs";

async function assetOf(ctx: { params: Promise<{ fid: string }> }) {
  const user = await requireUser();
  const { fid } = await ctx.params;
  const a = getAsset(fid);
  if (!a) throw new HttpError(404, L("Fichier introuvable.", "File not found."));
  ownedProject(user, a.project_id);
  return a;
}

/** Envoi du fichier avec prise en charge des requêtes partielles (lecture vidéo). */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ fid: string }> }) => {
  const a = await assetOf(ctx);
  const u = new URL(req.url).searchParams;
  if (u.get("info") === "1") {
    const versions = all<Asset>("SELECT * FROM assets WHERE project_id = ? AND (id = ? OR version_of = ? OR id = ?) ORDER BY version", a.project_id, a.version_of ?? a.id, a.version_of ?? a.id, a.version_of ?? "");
    const derived = all<Asset>("SELECT * FROM assets WHERE source_asset_id = ? AND deleted_at IS NULL", a.id);
    const source = a.source_asset_id ? getAsset(a.source_asset_id) : null;
    return ok({ asset: publicAssetSummary(a), usages: usagesOf(a.id), versions: versions.map(publicAssetSummary), derived: derived.map(publicAssetSummary), source: source ? publicAssetSummary(source) : null });
  }
  const key = u.get("thumb") === "1" && a.thumb_key ? a.thumb_key : a.storage_key;
  const file = storagePath(key);
  const stat = fs.statSync(file);
  const mime = key === a.thumb_key ? "image/webp" : a.mime;
  const headers: Record<string, string> = {
    "Content-Type": mime,
    "Cache-Control": "private, max-age=3600",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  };
  if (mime === "image/svg+xml") headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'";
  if (u.get("download") === "1") headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(a.name)}`;
  const range = req.headers.get("range");
  if (range && key === a.storage_key) {
    const m = range.match(/bytes=(\d*)-(\d*)/);
    const start = m?.[1] ? Number(m[1]) : 0;
    const end = m?.[2] ? Math.min(Number(m[2]), stat.size - 1) : stat.size - 1;
    if (start >= stat.size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${stat.size}` } });
    const stream = fs.createReadStream(file, { start, end });
    return new Response(stream as any, { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${stat.size}`, "Content-Length": String(end - start + 1) } });
  }
  return new Response(fs.createReadStream(file) as any, { headers: { ...headers, "Content-Length": String(stat.size) } });
});

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ fid: string }> }) => {
  const a = await assetOf(ctx);
  const b = await body(req, z.object({ name: z.string().trim().min(1).max(200).optional(), folderId: z.string().nullable().optional(), status: z.enum(["ready", "review", "approved", "rejected"]).optional(), starred: z.boolean().optional(), restore: z.boolean().optional() }));
  if (b.name) run("UPDATE assets SET name = ? WHERE id = ?", b.name, a.id);
  if (b.folderId !== undefined) {
    if (b.folderId && !one("SELECT 1 FROM folders WHERE id = ? AND project_id = ?", b.folderId, a.project_id)) throw new HttpError(404, L("Dossier introuvable.", "Folder not found."));
    run("UPDATE assets SET folder_id = ? WHERE id = ?", b.folderId, a.id);
  }
  if (b.status) run("UPDATE assets SET status = ? WHERE id = ?", b.status, a.id);
  if (b.starred !== undefined) run("UPDATE assets SET starred = ? WHERE id = ?", b.starred ? 1 : 0, a.id);
  if (b.restore) run("UPDATE assets SET deleted_at = NULL WHERE id = ?", a.id);
  return ok({ asset: publicAssetSummary(getAsset(a.id)!) });
});

/** Mise à la corbeille (restaurable). Un média utilisé par une publication programmée ou publiée reste protégé. */
export const DELETE = handle(async (_req: Request, ctx: { params: Promise<{ fid: string }> }) => {
  const a = await assetOf(ctx);
  const used = all<{ target_type: string; target_id: string }>("SELECT target_type, target_id FROM asset_usages WHERE asset_id = ?", a.id);
  const blocking = used.filter((u) => u.target_type === "post" && one("SELECT 1 FROM posts WHERE id = ? AND status IN ('scheduled','publishing','published')", u.target_id));
  if (blocking.length) throw new HttpError(409, L("Ce média est utilisé par une publication programmée ou publiée : retirez-le d'abord de la publication.", "This media is used by a scheduled or published post: remove it from the post first."));
  if (a.role === "original" && json<any>(a.meta, {}).protected) throw new HttpError(409, L("Original protégé.", "Protected original."));
  run("UPDATE assets SET deleted_at = ? WHERE id = ?", now(), a.id);
  return ok({ usages: used.length });
});
