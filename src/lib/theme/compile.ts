/**
 * Compilation : ThemeSpec → fichiers d'un thème Shopify OS 2.0.
 * Ces fichiers sont exactement ceux que l'aperçu interprète et que le ZIP
 * contient (source de vérité unique).
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { zipSync, strToU8 } from "fflate";
import { DATA_DIR } from "../db";
import { THEME_BASE, type ThemeSpec } from "./spec";

export type ThemeFiles = Map<string, string>; // chemin → contenu texte (assets binaires exclus)

function walk(dir: string, base = ""): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...walk(path.join(dir, e.name), rel));
    else out.push(rel);
  }
  return out;
}

let baseCache: { stamp: string; files: Map<string, string> } | null = null;
function baseFiles(): Map<string, string> {
  const list = walk(THEME_BASE);
  const stamp = list.map((f) => `${f}:${fs.statSync(path.join(THEME_BASE, f)).mtimeMs}`).join("|");
  if (baseCache?.stamp === stamp) return baseCache.files;
  const files = new Map<string, string>();
  for (const f of list) files.set(f, fs.readFileSync(path.join(THEME_BASE, f), "utf8"));
  baseCache = { stamp, files };
  return files;
}

const HEADER = "/*\n * Fichier généré par E-COM STUDIO IA. Modifiable dans l'éditeur de thème Shopify.\n */\n";

function cleanTemplate(t: { sections: Record<string, any>; order: string[]; layout?: string | false; wrapper?: string }) {
  const out: Record<string, unknown> = {};
  if (t.layout !== undefined) out.layout = t.layout;
  if (t.wrapper) out.wrapper = t.wrapper;
  out.sections = t.sections;
  out.order = t.order.filter((id) => t.sections[id]);
  return out;
}

/** Fichiers texte du thème (sans les médias binaires du dossier assets). */
export function compileTheme(spec: ThemeSpec): ThemeFiles {
  const files = new Map(baseFiles());
  for (const [type, s] of Object.entries(spec.customSections ?? {})) files.set(`sections/${type}.liquid`, s.liquid);
  for (const [key, t] of Object.entries(spec.templates)) {
    files.set(`templates/${key}.json`, HEADER + JSON.stringify(cleanTemplate(t), null, 2));
  }
  for (const [g, json] of Object.entries(spec.groups)) {
    files.set(`sections/${g}-group.json`, HEADER + JSON.stringify({ type: json.type, name: json.name, sections: json.sections, order: json.order.filter((id) => json.sections[id]) }, null, 2));
  }
  files.set("config/settings_data.json", HEADER + JSON.stringify({ current: spec.settings, presets: {} }, null, 2));
  return files;
}

// ---------------------------------------------------------------- médias du thème

const ASSET_CACHE = path.join(DATA_DIR, "cache", "theme-assets");
fs.mkdirSync(ASSET_CACHE, { recursive: true });

export type AssetLoader = (assetId: string) => { data: Buffer; mime: string; updated: number } | null;

/**
 * Prépare un média pour le dossier assets : redimensionnement et format
 * imposés par l'extension du nom de fichier (webp, jpg, png, mp4…).
 */
export async function themeAssetBinary(spec: ThemeSpec, filename: string, load: AssetLoader): Promise<{ data: Buffer; mime: string } | null> {
  const assetId = spec.files[filename];
  if (!assetId) return null;
  const src = load(assetId);
  if (!src) return null;
  const ext = filename.split(".").pop()!.toLowerCase();
  const key = crypto.createHash("sha1").update(`${assetId}:${filename}:${src.updated}:${src.data.length}`).digest("hex");
  const cached = path.join(ASSET_CACHE, `${key}.${ext}`);
  const mimeByExt: Record<string, string> = { webp: "image/webp", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", mp4: "video/mp4", svg: "image/svg+xml", gif: "image/gif" };
  const mime = mimeByExt[ext] ?? src.mime;
  if (fs.existsSync(cached)) return { data: fs.readFileSync(cached), mime };
  let data = src.data;
  if (["webp", "jpg", "jpeg", "png"].includes(ext) && src.mime.startsWith("image/") && src.mime !== "image/svg+xml") {
    const isFavicon = filename.includes("favicon");
    let img = sharp(src.data, { failOn: "none" }).rotate().resize(isFavicon ? 96 : 2400, isFavicon ? 96 : 2400, { fit: "inside", withoutEnlargement: true });
    if (ext === "webp") img = img.webp({ quality: 84, alphaQuality: 90 });
    else if (ext === "png") img = img.png({ compressionLevel: 9, palette: false });
    else img = img.flatten({ background: "#ffffff" }).jpeg({ quality: 84, mozjpeg: true, progressive: true });
    data = await img.toBuffer();
  }
  fs.writeFileSync(cached, data);
  return { data, mime };
}

// ---------------------------------------------------------------- export ZIP

export async function exportThemeZip(spec: ThemeSpec, load: AssetLoader): Promise<{ zip: Buffer; files: string[]; skipped: string[] }> {
  const text = compileTheme(spec);
  const entries: Record<string, Uint8Array> = {};
  for (const [p, content] of text) entries[p] = strToU8(content);
  const skipped: string[] = [];
  for (const filename of Object.keys(spec.files)) {
    const bin = await themeAssetBinary(spec, filename, load);
    if (!bin) {
      skipped.push(filename);
      continue;
    }
    if (bin.data.length > 19 * 1024 * 1024) {
      skipped.push(`${filename} (plus de 20 Mo : à importer dans Shopify › Contenu › Fichiers)`);
      continue;
    }
    entries[`assets/${filename}`] = new Uint8Array(bin.data);
  }
  const zip = Buffer.from(zipSync(entries, { level: 6 }));
  return { zip, files: Object.keys(entries).sort(), skipped };
}

/** Empreinte stable du thème compilé (vérifie la correspondance aperçu ↔ export). */
export function themeFingerprint(spec: ThemeSpec): string {
  const h = crypto.createHash("sha256");
  const text = compileTheme(spec);
  for (const p of [...text.keys()].sort()) h.update(p).update("\0").update(text.get(p)!).update("\0");
  for (const f of Object.keys(spec.files).sort()) h.update(`asset:${f}=${spec.files[f]}`);
  return h.digest("hex").slice(0, 16);
}
