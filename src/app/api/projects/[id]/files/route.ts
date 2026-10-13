import { all, one } from "@/lib/db";
import { handle, ok, readForm } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { listFolders, publicAssetSummary, saveAsset, usagesOf, type Asset } from "@/lib/library";
import { kindFromMime, mimeFromName } from "@/lib/storage";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";

export const runtime = "nodejs";

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const u = new URL(req.url).searchParams;
  const folder = u.get("folder");
  const q = u.get("q")?.trim();
  const kind = u.get("kind");
  const role = u.get("role");
  const trash = u.get("trash") === "1";
  const where: string[] = ["project_id = ?", trash ? "deleted_at IS NOT NULL" : "deleted_at IS NULL"];
  const args: unknown[] = [p.id];
  if (folder && !q) {
    where.push(folder === "root" ? "folder_id IS NULL" : "folder_id = ?");
    if (folder !== "root") args.push(folder);
  }
  if (q) {
    where.push("(name LIKE ? OR meta LIKE ? OR role LIKE ?)");
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (kind) {
    where.push("kind = ?");
    args.push(kind);
  }
  if (role) {
    where.push(`role IN (${role.split(",").map(() => "?").join(",")})`);
    args.push(...role.split(","));
  }
  const status = u.get("status");
  if (status && ["ready", "review", "approved", "rejected"].includes(status)) {
    where.push("status = ?");
    args.push(status);
  }
  // Dernière version seulement : une image refaite (changement de modèle, éditeur) remplace la précédente dans la
  // liste (même lignée de versions, ou même création modifiable) ; les anciennes restent dans la fiche.
  if (u.get("latest") === "1" && !trash)
    where.push(`NOT EXISTS (SELECT 1 FROM assets b WHERE b.project_id = assets.project_id AND b.deleted_at IS NULL AND b.kind = assets.kind AND b.id != assets.id AND b.created_at >= assets.created_at AND (
      (assets.version_of IS NOT NULL OR EXISTS (SELECT 1 FROM assets c WHERE c.version_of = assets.id)) AND COALESCE(b.version_of, b.id) = COALESCE(assets.version_of, assets.id) AND b.version > assets.version
      OR COALESCE(json_extract(assets.meta, '$.poster.docKey'), json_extract(assets.meta, '$.adDoc.docKey')) IS NOT NULL AND COALESCE(json_extract(b.meta, '$.poster.docKey'), json_extract(b.meta, '$.adDoc.docKey')) = COALESCE(json_extract(assets.meta, '$.poster.docKey'), json_extract(assets.meta, '$.adDoc.docKey')) AND b.created_at > assets.created_at
    ))`);
  const assets = all<Asset>(`SELECT * FROM assets WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT 400`, ...args);
  const folderList = listFolders(p.id);
  const total = (fid: string): number => (counts[fid] ?? 0) + folderList.filter((x) => x.parent_id === fid).reduce((n, x) => n + total(x.id), 0);
  const counts: Record<string, number> = Object.fromEntries(all<{ folder_id: string; n: number }>("SELECT folder_id, COUNT(*) n FROM assets WHERE project_id = ? AND deleted_at IS NULL GROUP BY folder_id", p.id).map((r) => [r.folder_id ?? "root", r.n]));
  return ok({
    folders: folderList.map((f) => ({ id: f.id, name: f.name, parentId: f.parent_id, system: !!f.system_key, key: f.system_key, count: counts[f.id] ?? 0, total: total(f.id) })),
    assets: assets.map((a) => ({ ...publicAssetSummary(a), usages: usagesOf(a.id) })),
    rootCount: counts.root ?? 0,
  });
});

const MAX = 200 * 1024 * 1024;

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const form = await readForm(req, 600 * 1048576);
  const folderId = (form.get("folderId") as string) || null;
  if (folderId && !one("SELECT 1 FROM folders WHERE id = ? AND project_id = ?", folderId, p.id)) throw new HttpError(404, L("Dossier introuvable.", "Folder not found."));
  const role = (form.get("role") as string) || null;
  const files = form.getAll("files").filter((f): f is File => typeof f !== "string" && f.size > 0);
  if (!files.length) throw new HttpError(400, L("Aucun fichier reçu.", "No file received."));
  const out = [];
  for (const f of files.slice(0, 30)) {
    if (f.size > MAX) throw new HttpError(413, L(`« ${f.name} » dépasse 200 Mo.`, `"${f.name}" exceeds 200 MB.`));
    const mime = f.type || mimeFromName(f.name);
    // Types exécutables par un navigateur ou un système : refusés (le SVG reste accepté, servi sans script).
    if (/html|javascript|ecmascript|x-msdownload|x-sh|x-httpd|xml(?!.*svg)/.test(mime) || /\.(html?|xhtml|xml|js|mjs|exe|sh|bat|cmd|php)$/i.test(f.name)) throw new HttpError(415, L(`Type de fichier refusé pour « ${f.name} ».`, `File type not allowed for "${f.name}".`));
    const a = await saveAsset({
      projectId: p.id,
      userId: user.id,
      data: Buffer.from(await f.arrayBuffer()),
      name: f.name,
      mime,
      role: role ?? (kindFromMime(mime) === "image" && !folderId ? "original" : null) ?? undefined,
      // Photos en situation : rangées avec les scènes.
      ...(role === "lifestyle" && !folderId ? { folderKey: "images.scenes" } : { folderId }),
      origin: "upload",
      meta: { uploadedAt: Date.now() },
    });
    out.push(publicAssetSummary(a));
  }
  return ok({ assets: out });
});
