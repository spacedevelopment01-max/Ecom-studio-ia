/**
 * Versions des documents publicitaires : chaque enregistrement crée une version (historique), restaurer recopie une
 * version ancienne en nouvelle version (rien n'est perdu), dupliquer crée une nouvelle lignée. Les choix du client
 * (source « user ») ne sont jamais écrasés en silence par une régénération : le moteur vérifie `userOwned`.
 */
import crypto from "node:crypto";
import { z } from "zod";
import { all, id, json, now, one, run } from "../db";
import { assetData, getAsset, saveAsset } from "../library";
import { loadDocImages, renderDocToBuffer } from "./server";
import type { AdDocument } from "./types";

export type DocVersion = { id: string; docKey: string; version: number; source: AdDocument["meta"]["source"]; note: string; renderedAssetId: string | null; createdAt: number };

/** Lignée stable d'une création du moteur (concept × plateforme × format). */
export const engineDocKey = (projectId: string, conceptId: string, platform: string, aspect: string) => `ad:${crypto.createHash("sha256").update(`${projectId}|${conceptId}|${platform}|${aspect}`).digest("hex").slice(0, 20)}`;

// ---------------------------------------------------------------- validation (document reçu du navigateur)

const num = z.number().finite();
const fill = z.union([z.string().max(64), z.object({ type: z.literal("linear"), angle: num, stops: z.array(z.object({ offset: num, color: z.string().max(64) })).max(8) })]);
const shadow = z.object({ color: z.string().max(64), blur: num, x: num, y: num }).nullable();
const fontS = z.object({ family: z.string().max(60), weight: num, size: num.min(4).max(800), italic: z.boolean() });
const baseS = { id: z.string().min(1).max(40), name: z.string().max(80), role: z.enum(["background", "image", "product", "title", "subtitle", "body", "cta", "logo", "shape", "decor", "scrim"]), x: num, y: num, w: num.min(0), h: num.min(0), rotation: num, opacity: num.min(0).max(1), visible: z.boolean(), locked: z.boolean(), anchor: z.object({ h: z.enum(["left", "center", "right", "stretch"]), v: z.enum(["top", "middle", "bottom", "stretch"]) }), userEdited: z.boolean().optional() };
export const LayerSchema = z.discriminatedUnion("kind", [
  z.object({ ...baseS, kind: z.literal("image"), assetId: z.string().max(40).nullable(), fit: z.enum(["cover", "contain"]), crop: z.object({ x: num, y: num, w: num, h: num }).nullable(), radius: num, shadow, contactShadow: z.boolean().optional() }),
  z.object({ ...baseS, kind: z.literal("text"), text: z.string().max(600), font: fontS, color: z.string().max(64), align: z.enum(["left", "center", "right"]), lineHeight: num, letterSpacing: num, uppercase: z.boolean(), autoFit: z.object({ minSize: num }).nullable(), shadow }),
  z.object({ ...baseS, kind: z.literal("shape"), shape: z.enum(["rect", "ellipse", "line"]), fill: fill.nullable(), stroke: z.object({ color: z.string().max(64), width: num }).nullable(), radius: num, shadow }),
  z.object({ ...baseS, kind: z.literal("button"), text: z.string().max(80), font: fontS, fill, color: z.string().max(64), radius: num, stroke: z.object({ color: z.string().max(64), width: num }).nullable(), shadow }),
]);
export const AdDocumentSchema = z.object({
  version: num,
  width: num.min(100).max(4000),
  height: num.min(100).max(4000),
  background: z.string().max(64),
  safe: z.object({ top: num, bottom: num, side: num }),
  format: z.object({ platform: z.string().max(40).nullable(), aspect: z.string().max(10) }),
  layers: z.array(LayerSchema).max(60),
  brand: z.object({ palette: z.record(z.string(), z.string().max(64)), fonts: z.object({ heading: z.string().max(60), body: z.string().max(60) }), name: z.string().max(120) }),
  meta: z.object({ conceptId: z.string().max(40).nullable(), source: z.enum(["engine", "user", "ai_local", "ai"]), createdFrom: z.string().max(60).nullable() }),
});

/** Les images d'un document ne peuvent venir que de la bibliothèque de CE projet (aucune adresse externe). */
export function foreignAssets(projectId: string, doc: AdDocument): string[] {
  const ids = doc.layers.flatMap((l) => (l.kind === "image" && l.assetId ? [l.assetId] : []));
  return ids.filter((x) => {
    const a = getAsset(x);
    return !a || a.project_id !== projectId || !!a.deleted_at;
  });
}

// ---------------------------------------------------------------- versions

export function saveVersion(projectId: string, docKey: string, doc: AdDocument, o: { note?: string; renderedAssetId?: string | null } = {}): DocVersion {
  const version = (one<{ v: number }>("SELECT MAX(version) v FROM ad_documents WHERE doc_key = ?", docKey)?.v ?? 0) + 1;
  const vid = id();
  run("INSERT INTO ad_documents (id, project_id, doc_key, version, source, note, doc_json, rendered_asset_id, created_at) VALUES (?,?,?,?,?,?,?,?,?)", vid, projectId, docKey, version, doc.meta.source, (o.note ?? "").slice(0, 200), JSON.stringify(doc), o.renderedAssetId ?? null, now());
  return { id: vid, docKey, version, source: doc.meta.source, note: o.note ?? "", renderedAssetId: o.renderedAssetId ?? null, createdAt: now() };
}

export function latestDoc(projectId: string, docKey: string): { doc: AdDocument; version: DocVersion } | null {
  const r = one<any>("SELECT * FROM ad_documents WHERE project_id = ? AND doc_key = ? ORDER BY version DESC LIMIT 1", projectId, docKey);
  return r ? { doc: json<AdDocument>(r.doc_json, null as never), version: rowVersion(r) } : null;
}

export function versionDoc(projectId: string, docKey: string, version: number): AdDocument | null {
  const r = one<{ doc_json: string }>("SELECT doc_json FROM ad_documents WHERE project_id = ? AND doc_key = ? AND version = ?", projectId, docKey, version);
  return r ? json<AdDocument>(r.doc_json, null as never) : null;
}

export function listVersions(projectId: string, docKey: string): DocVersion[] {
  return all<any>("SELECT id, doc_key, version, source, note, rendered_asset_id, created_at FROM ad_documents WHERE project_id = ? AND doc_key = ? ORDER BY version DESC", projectId, docKey).map(rowVersion);
}

const rowVersion = (r: any): DocVersion => ({ id: r.id, docKey: r.doc_key, version: r.version, source: r.source, note: r.note, renderedAssetId: r.rendered_asset_id, createdAt: r.created_at });

/** Le client a-t-il modifié cette création ? (Une régénération ne doit alors jamais l'écraser.) */
export function userOwned(projectId: string, docKey: string): boolean {
  return !!one("SELECT 1 FROM ad_documents WHERE project_id = ? AND doc_key = ? AND source IN ('user','ai_local','ai')", projectId, docKey);
}

/** Restaure une version : elle devient la nouvelle version courante (l'historique est conservé). */
export function restoreVersion(projectId: string, docKey: string, version: number): DocVersion {
  const doc = versionDoc(projectId, docKey, version);
  if (!doc) throw new Error("version introuvable");
  return saveVersion(projectId, docKey, { ...doc, meta: { ...doc.meta, source: "user" } }, { note: `restauration de la version ${version}` });
}

/** Duplique une création : nouvelle lignée, même contenu. */
export function duplicateDoc(projectId: string, docKey: string): { docKey: string; version: DocVersion } {
  const cur = latestDoc(projectId, docKey);
  if (!cur) throw new Error("création introuvable");
  const key = `ad:${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  return { docKey: key, version: saveVersion(projectId, key, { ...cur.doc, meta: { ...cur.doc.meta, source: "user", createdFrom: docKey } }, { note: `copie de ${docKey}` }) };
}

/** Images du document lues dans la bibliothèque du projet. */
export async function docImages(projectId: string, doc: AdDocument) {
  const map = new Map<string, Buffer>();
  for (const l of doc.layers) {
    if (l.kind !== "image" || !l.assetId || map.has(l.assetId)) continue;
    const a = getAsset(l.assetId);
    if (a && a.project_id === projectId && !a.deleted_at) map.set(l.assetId, assetData(a));
  }
  return loadDocImages(map);
}

/** Export fidèle (même moteur que l'aperçu) : PNG, JPEG, ou le document éditable (JSON). */
export async function exportDoc(projectId: string, doc: AdDocument, format: "png" | "jpeg" | "json"): Promise<{ data: Buffer; mime: string; ext: string }> {
  if (format === "json") return { data: Buffer.from(JSON.stringify(doc, null, 2)), mime: "application/json", ext: "json" };
  const data = await renderDocToBuffer(doc, await docImages(projectId, doc), format);
  return { data, mime: format === "png" ? "image/png" : "image/jpeg", ext: format === "png" ? "png" : "jpg" };
}

/** Enregistre une version ET son rendu dans la bibliothèque (création modifiée par le client). */
export async function saveAndRender(projectId: string, userId: string, docKey: string, doc: AdDocument, note = ""): Promise<DocVersion> {
  const { data } = await exportDoc(projectId, doc, "jpeg");
  const a = await saveAsset({ projectId, userId, data, name: `pub-modifiee-${doc.format.aspect.replace(":", "x")}.jpg`, mime: "image/jpeg", role: "ad", folderKey: "images.ads", origin: "generated", status: "review", meta: { adDoc: { docKey, source: doc.meta.source }, format: doc.format.aspect } });
  return saveVersion(projectId, docKey, doc, { note, renderedAssetId: a.id });
}
