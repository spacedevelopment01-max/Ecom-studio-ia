/**
 * Stockage des fichiers (disque local, isolé par client et par projet).
 * Les clés sont opaques ; l'accès passe toujours par /api/files/:id qui
 * vérifie la propriété.
 */
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./db";

export const STORAGE_DIR = process.env.STORAGE_DIR || path.join(DATA_DIR, "storage");
fs.mkdirSync(STORAGE_DIR, { recursive: true });

export function storagePath(key: string): string {
  const p = path.resolve(STORAGE_DIR, key);
  if (!p.startsWith(path.resolve(STORAGE_DIR) + path.sep)) throw new Error("Clé de stockage invalide.");
  return p;
}

export function putFile(key: string, data: Buffer | Uint8Array) {
  const p = storagePath(key);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = `${p}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, p);
}

export function readFile(key: string): Buffer {
  return fs.readFileSync(storagePath(key));
}

export function fileExists(key: string) {
  return fs.existsSync(storagePath(key));
}

export function removeFile(key: string) {
  try {
    fs.unlinkSync(storagePath(key));
  } catch {
    /* déjà supprimé */
  }
}

export function tmpDir(prefix: string) {
  const d = path.join(DATA_DIR, "tmp", `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

export const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/aac": "aac",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "text/plain": "txt",
  "text/markdown": "md",
  "text/csv": "csv",
  "application/json": "json",
  "application/x-subrip": "srt",
  "text/vtt": "vtt",
};

export function mimeFromName(name: string): string {
  const ext = name.toLowerCase().split(".").pop() || "";
  const found = Object.entries(EXT_BY_MIME).find(([, e]) => e === ext);
  if (found) return found[0];
  if (ext === "jpeg") return "image/jpeg";
  if (ext === "heic") return "image/heic";
  return "application/octet-stream";
}

export function kindFromMime(mime: string): string {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/zip") return "archive";
  if (mime.startsWith("text/") || mime === "application/json" || mime === "application/x-subrip") return "text";
  return "document";
}
