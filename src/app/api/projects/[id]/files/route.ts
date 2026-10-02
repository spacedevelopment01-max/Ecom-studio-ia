import { all, one } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { HttpError } from "@/lib/auth";
import { listFolders, publicAssetSummary, saveAsset, usagesOf, type Asset } from "@/lib/library";
import { kindFromMime, mimeFromName } from "@/lib/storage";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";

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
  const assets = all<Asset>(`SELECT * FROM assets WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT 400`, ...args);
  const counts = Object.fromEntries(all<{ folder_id: string; n: number }>("SELECT folder_id, COUNT(*) n FROM assets WHERE project_id = ? AND deleted_at IS NULL GROUP BY folder_id", p.id).map((r) => [r.folder_id ?? "root", r.n]));
  return ok({
    folders: listFolders(p.id).map((f) => ({ id: f.id, name: f.name, parentId: f.parent_id, system: !!f.system_key, key: f.system_key, count: counts[f.id] ?? 0 })),
    assets: assets.map((a) => ({ ...publicAssetSummary(a), usages: usagesOf(a.id) })),
    rootCount: counts.root ?? 0,
  });
});

const MAX = 200 * 1024 * 1024;

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const form = await req.formData();
  const folderId = (form.get("folderId") as string) || null;
  if (folderId && !one("SELECT 1 FROM folders WHERE id = ? AND project_id = ?", folderId, p.id)) throw new HttpError(404, "Dossier introuvable.");
  const role = (form.get("role") as string) || null;
  const files = form.getAll("files").filter((f): f is File => typeof f !== "string" && f.size > 0);
  if (!files.length) throw new HttpError(400, "Aucun fichier reçu.");
  const out = [];
  for (const f of files.slice(0, 30)) {
    if (f.size > MAX) throw new HttpError(413, `« ${f.name} » dépasse 200 Mo.`);
    const mime = f.type || mimeFromName(f.name);
    if (/html|javascript|x-msdownload|x-sh/.test(mime)) throw new HttpError(415, `Type de fichier refusé pour « ${f.name} ».`);
    const a = await saveAsset({
      projectId: p.id,
      userId: user.id,
      data: Buffer.from(await f.arrayBuffer()),
      name: f.name,
      mime,
      role: role ?? (kindFromMime(mime) === "image" && !folderId ? "original" : null) ?? undefined,
      folderId,
      origin: "upload",
      meta: { uploadedAt: Date.now() },
    });
    out.push(publicAssetSummary(a));
  }
  return ok({ assets: out });
});
