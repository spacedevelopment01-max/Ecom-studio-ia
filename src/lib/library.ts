/**
 * Bibliothèque de fichiers : dossiers, sous-dossiers, médias, versions et
 * usages. Les originaux ne sont jamais écrasés : une retouche crée une
 * nouvelle version liée (version_of / source_asset_id).
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { all, id, json, now, one, run, tx } from "./db";
import { EXT_BY_MIME, kindFromMime, putFile, readFile, storagePath, tmpDir } from "./storage";
import { L } from "./i18n-server";

const exec = promisify(execFile);

export type Asset = {
  id: string;
  project_id: string;
  user_id: string;
  folder_id: string | null;
  name: string;
  kind: string;
  role: string | null;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  storage_key: string;
  thumb_key: string | null;
  origin: string;
  meta: string;
  source_asset_id: string | null;
  version_of: string | null;
  version: number;
  status: string;
  starred: number;
  deleted_at: number | null;
  created_at: number;
};

export type Folder = { id: string; project_id: string; parent_id: string | null; name: string; system_key: string | null; created_at: number };

/** Arborescence initiale. Les clés système servent au rangement automatique. */
export const DEFAULT_TREE: { key: string; name: string; en: string; children?: { key: string; name: string; en: string }[] }[] = [
  { key: "product", name: "01 · Produit", en: "01 · Product", children: [
    { key: "product.originals", name: "Photos originales", en: "Original photos" },
    { key: "product.cutouts", name: "Détourages", en: "Cutouts" },
    { key: "product.catalog", name: "Catalogue (autres produits)", en: "Catalog (other products)" },
  ] },
  { key: "brand", name: "02 · Marque", en: "02 · Brand", children: [
    { key: "brand.logos", name: "Logos", en: "Logos" },
    { key: "brand.guide", name: "Charte & palette", en: "Guidelines & palette" },
  ] },
  { key: "images", name: "03 · Images", en: "03 · Images", children: [
    { key: "images.packshots", name: "Packshots", en: "Packshots" },
    { key: "images.details", name: "Détails produit", en: "Product details" },
    { key: "images.scenes", name: "Scènes & usages", en: "Scenes & use cases" },
    { key: "images.banners", name: "Bannières boutique", en: "Store banners" },
    { key: "images.social", name: "Réseaux sociaux", en: "Social media" },
    { key: "images.ads", name: "Publicités", en: "Ads" },
  ] },
  { key: "videos", name: "04 · Vidéos", en: "04 · Videos", children: [
    { key: "videos.ads", name: "Publicités", en: "Ads" },
    { key: "videos.social", name: "Réseaux sociaux", en: "Social media" },
    { key: "videos.shop", name: "Boutique", en: "Store" },
  ] },
  { key: "shop", name: "05 · Boutique", en: "05 · Store", children: [{ key: "shop.exports", name: "Exports de thèmes", en: "Theme exports" }] },
  { key: "content", name: "06 · Contenus", en: "06 · Content", children: [
    { key: "content.texts", name: "Textes", en: "Copy" },
    { key: "content.calendar", name: "Calendrier", en: "Calendar" },
  ] },
  { key: "docs", name: "07 · Documents", en: "07 · Documents" },
  { key: "imports", name: "08 · Imports externes", en: "08 · External imports", children: [
    { key: "imports.canva", name: "Canva", en: "Canva" },
    { key: "imports.capcut", name: "CapCut", en: "CapCut" },
  ] },
];

/** Noms par défaut des dossiers système (français et anglais), par clé. */
const DEFAULT_NAMES = new Map<string, { fr: string; en: string }>(DEFAULT_TREE.flatMap((t) => [t, ...(t.children ?? [])]).map((f) => [f.key, { fr: f.name, en: f.en }]));

/**
 * Nom affiché d'un dossier : un dossier système dont le nom n'a pas été modifié par la personne
 * s'affiche dans la langue de l'interface ; un nom personnalisé reste tel quel.
 */
export function folderDisplayName(f: Pick<Folder, "name" | "system_key">): string {
  const d = f.system_key ? DEFAULT_NAMES.get(f.system_key) : undefined;
  if (!d || (f.name !== d.fr && f.name !== d.en)) return f.name;
  return L(d.fr, d.en);
}

/** Crée l'arborescence par défaut ; les dossiers ajoutés dans une version ultérieure sont créés s'ils manquent. */
export function ensureFolders(projectId: string) {
  const existing = new Map(all<{ id: string; system_key: string }>("SELECT id, system_key FROM folders WHERE project_id = ? AND system_key IS NOT NULL", projectId).map((f) => [f.system_key, f.id]));
  const missing = DEFAULT_TREE.some((t) => !existing.has(t.key) || (t.children ?? []).some((c) => !existing.has(c.key)));
  if (!missing) return;
  tx(() => {
    for (const top of DEFAULT_TREE) {
      let tid = existing.get(top.key);
      if (!tid) {
        tid = id();
        run("INSERT INTO folders (id, project_id, parent_id, name, system_key, created_at) VALUES (?,?,?,?,?,?)", tid, projectId, null, top.name, top.key, now());
      }
      for (const c of top.children ?? []) {
        if (existing.has(c.key)) continue;
        run("INSERT INTO folders (id, project_id, parent_id, name, system_key, created_at) VALUES (?,?,?,?,?,?)", id(), projectId, tid, c.name, c.key, now());
      }
    }
  });
}

export function folderByKey(projectId: string, key: string): string | null {
  ensureFolders(projectId);
  return one<{ id: string }>("SELECT id FROM folders WHERE project_id = ? AND system_key = ?", projectId, key)?.id ?? null;
}

export function listFolders(projectId: string): Folder[] {
  ensureFolders(projectId);
  return all<Folder>("SELECT * FROM folders WHERE project_id = ?", projectId)
    .map((f) => ({ ...f, name: folderDisplayName(f) }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

export function createFolder(projectId: string, name: string, parentId: string | null): Folder {
  if (parentId && !one("SELECT 1 FROM folders WHERE id = ? AND project_id = ?", parentId, projectId)) throw new Error(L("Dossier parent introuvable.", "Parent folder not found."));
  const fid = id();
  run("INSERT INTO folders (id, project_id, parent_id, name, system_key, created_at) VALUES (?,?,?,?,?,?)", fid, projectId, parentId, name.slice(0, 120), null, now());
  return one<Folder>("SELECT * FROM folders WHERE id = ?", fid)!;
}

/** Empêche de déplacer un dossier dans l'un de ses descendants. */
export function isDescendant(projectId: string, folderId: string, maybeChild: string | null): boolean {
  let cur = maybeChild;
  let guard = 0;
  while (cur && guard++ < 64) {
    if (cur === folderId) return true;
    cur = one<{ parent_id: string | null }>("SELECT parent_id FROM folders WHERE id = ? AND project_id = ?", cur, projectId)?.parent_id ?? null;
  }
  return false;
}

export type SaveAssetInput = {
  projectId: string;
  userId: string;
  data: Buffer;
  name: string;
  mime: string;
  role?: string;
  kind?: string;
  folderKey?: string;
  folderId?: string | null;
  origin: "upload" | "generated" | "import" | "export" | "link";
  meta?: Record<string, unknown>;
  sourceAssetId?: string | null;
  versionOf?: string | null;
  status?: string;
};

async function probeVideo(file: string): Promise<{ width?: number; height?: number; duration?: number }> {
  try {
    const { stdout } = await exec("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", file]);
    const j = JSON.parse(stdout);
    const v = (j.streams || []).find((s: any) => s.codec_type === "video");
    return { width: v?.width, height: v?.height, duration: Number(j.format?.duration) || undefined };
  } catch {
    return {};
  }
}

export async function saveAsset(input: SaveAssetInput): Promise<Asset> {
  const aid = id();
  const ext = EXT_BY_MIME[input.mime] || input.name.split(".").pop() || "bin";
  const key = `${input.userId}/${input.projectId}/${aid}.${ext}`;
  putFile(key, input.data);
  const kind = input.kind || kindFromMime(input.mime);
  let width: number | null = null;
  let height: number | null = null;
  let duration: number | null = null;
  let thumbKey: string | null = null;

  if (kind === "image" || kind === "logo") {
    try {
      const img = sharp(input.data, { failOn: "none" });
      const m = await img.metadata();
      width = m.width ?? null;
      height = m.height ?? null;
      thumbKey = `${input.userId}/${input.projectId}/${aid}.thumb.webp`;
      putFile(thumbKey, await sharp(input.data, { failOn: "none" }).rotate().resize(640, 640, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer());
    } catch {
      thumbKey = null;
    }
  } else if (kind === "video") {
    const file = storagePath(key);
    const p = await probeVideo(file);
    width = p.width ?? null;
    height = p.height ?? null;
    duration = p.duration ?? null;
    try {
      const dir = tmpDir("poster");
      const poster = path.join(dir, "poster.jpg");
      await exec("ffmpeg", ["-y", "-ss", String(Math.min(1.2, (duration ?? 2) / 2)), "-i", file, "-frames:v", "1", "-q:v", "3", poster]);
      thumbKey = `${input.userId}/${input.projectId}/${aid}.thumb.webp`;
      putFile(thumbKey, await sharp(poster).resize(640, 640, { fit: "inside" }).webp({ quality: 80 }).toBuffer());
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      thumbKey = null;
    }
  }

  const folderId = input.folderId !== undefined ? input.folderId : input.folderKey ? folderByKey(input.projectId, input.folderKey) : null;
  let version = 1;
  if (input.versionOf) {
    version = (one<{ v: number }>("SELECT MAX(version) v FROM assets WHERE version_of = ? OR id = ?", input.versionOf, input.versionOf)?.v ?? 1) + 1;
  }
  run(
    `INSERT INTO assets (id, project_id, user_id, folder_id, name, kind, role, mime, size, width, height, duration, storage_key, thumb_key, origin, meta, source_asset_id, version_of, version, status, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    aid,
    input.projectId,
    input.userId,
    folderId,
    input.name.slice(0, 200),
    kind,
    input.role ?? null,
    input.mime,
    input.data.length,
    width,
    height,
    duration,
    key,
    thumbKey,
    input.origin,
    JSON.stringify(input.meta ?? {}),
    input.sourceAssetId ?? null,
    input.versionOf ?? null,
    version,
    input.status ?? "ready",
    now(),
  );
  return getAsset(aid)!;
}

export function getAsset(assetId: string): Asset | undefined {
  return one<Asset>("SELECT * FROM assets WHERE id = ?", assetId);
}

export function projectAsset(projectId: string, assetId: string): Asset {
  const a = one<Asset>("SELECT * FROM assets WHERE id = ? AND project_id = ?", assetId, projectId);
  if (!a) throw new Error(L("Média introuvable dans ce projet.", "Media not found in this project."));
  return a;
}

export function assetData(a: Asset): Buffer {
  return readFile(a.storage_key);
}

export function assetMeta<T = Record<string, unknown>>(a: Asset): T {
  return json<T>(a.meta, {} as T);
}

export function addUsage(assetId: string, targetType: string, targetId: string, label = "") {
  run(
    "INSERT INTO asset_usages (asset_id, target_type, target_id, label, created_at) VALUES (?,?,?,?,?) ON CONFLICT DO UPDATE SET label = excluded.label",
    assetId,
    targetType,
    targetId,
    label,
    now(),
  );
}

export function removeUsages(targetType: string, targetId: string) {
  run("DELETE FROM asset_usages WHERE target_type = ? AND target_id = ?", targetType, targetId);
}

export function usagesOf(assetId: string) {
  return all<{ target_type: string; target_id: string; label: string }>("SELECT target_type, target_id, label FROM asset_usages WHERE asset_id = ?", assetId);
}

/** URL authentifiée servie par l'application. */
export const assetUrl = (a: { id: string }, opts: { thumb?: boolean; download?: boolean } = {}) =>
  `/api/files/${a.id}${opts.thumb ? "?thumb=1" : opts.download ? "?download=1" : ""}`;

export function publicAssetSummary(a: Asset) {
  const meta = assetMeta(a);
  return {
    id: a.id,
    name: a.name,
    kind: a.kind,
    role: a.role,
    mime: a.mime,
    size: a.size,
    width: a.width,
    height: a.height,
    duration: a.duration,
    folderId: a.folder_id,
    origin: a.origin,
    status: a.status,
    starred: !!a.starred,
    version: a.version,
    versionOf: a.version_of,
    sourceAssetId: a.source_asset_id,
    createdAt: a.created_at,
    url: assetUrl(a),
    thumbUrl: a.thumb_key ? assetUrl(a, { thumb: true }) : a.kind === "image" ? assetUrl(a) : null,
    downloadUrl: assetUrl(a, { download: true }),
    meta,
  };
}
