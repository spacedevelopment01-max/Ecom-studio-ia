/**
 * Canva Connect (API officielle) : envoi d'un média du studio, création d'un
 * design modifiable, puis récupération de l'export dans le projet comme
 * nouvelle version liée au média d'origine.
 */
import { json, one, run } from "../db";
import { assetData, getAsset, saveAsset, type Asset } from "../library";
import { PermanentError } from "../jobs";
import { freshToken, type Connection } from "../social/publish";
import { L } from "../i18n-server";

const API = "https://api.canva.com/rest/v1";

async function call(token: string, path: string, init: RequestInit = {}) {
  const r = await fetch(`${API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  const j: any = await r.json().catch(() => ({}));
  if (r.status === 401) throw new PermanentError(L("Autorisation Canva expirée : reconnectez Canva.", "Canva authorization expired: reconnect Canva."));
  if (r.status === 403) throw new PermanentError(L(`Canva refuse l'opération (autorisation manquante) : ${j.message ?? ""}`, `Canva refused the operation (missing permission): ${j.message ?? ""}`));
  if (!r.ok) throw new Error(L(`Canva ${r.status} : ${j.message ?? JSON.stringify(j).slice(0, 200)}`, `Canva ${r.status}: ${j.message ?? JSON.stringify(j).slice(0, 200)}`));
  return j;
}

async function poll<T>(fn: () => Promise<T>, done: (v: T) => boolean, failed: (v: T) => string | null, tries = 40, delay = 2500): Promise<T> {
  for (let i = 0; i < tries; i++) {
    const v = await fn();
    const err = failed(v);
    if (err) throw new PermanentError(err);
    if (done(v)) return v;
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error(L("Canva met trop de temps à répondre ; réessayez.", "Canva is taking too long to respond; please try again."));
}

export function canvaConnection(userId: string): Connection | undefined {
  return one<Connection>("SELECT * FROM connections WHERE user_id = ? AND provider = 'canva' AND status = 'active' ORDER BY updated_at DESC LIMIT 1", userId);
}

export async function sendToCanva(userId: string, asset: Asset) {
  const c = canvaConnection(userId);
  if (!c) throw new PermanentError(L("Connectez Canva dans l'onglet Connexions.", "Connect Canva in the Connections tab."));
  const token = await freshToken(c);
  const data = assetData(asset);
  const meta = { name_base64: Buffer.from(asset.name.slice(0, 50)).toString("base64") };
  const up = await call(token, "/asset-uploads", { method: "POST", headers: { "Content-Type": "application/octet-stream", "Asset-Upload-Metadata": JSON.stringify(meta) }, body: new Uint8Array(data) });
  const job = await poll(
    () => call(token, `/asset-uploads/${up.job.id}`),
    (j) => j.job?.status === "success",
    (j) => (j.job?.status === "failed" ? L(`Envoi refusé par Canva : ${j.job?.error?.message ?? ""}`, `Canva refused the upload: ${j.job?.error?.message ?? ""}`) : null),
  );
  const canvaAssetId = job.job.asset.id;
  const w = Math.max(40, Math.min(8000, asset.width ?? 1080));
  const h = Math.max(40, Math.min(8000, asset.height ?? 1080));
  const design = await call(token, "/designs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ design_type: { type: "custom", width: w, height: h }, asset_id: canvaAssetId, title: asset.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 255) }) });
  const info = { designId: design.design.id, editUrl: design.design.urls?.edit_url, viewUrl: design.design.urls?.view_url, canvaAssetId, sentAt: Date.now() };
  const m = json<Record<string, unknown>>(asset.meta, {});
  run("UPDATE assets SET meta = ? WHERE id = ?", JSON.stringify({ ...m, canva: info }), asset.id);
  return info;
}

/** Exporte le design Canva et l'ajoute au projet comme nouvelle version liée. */
export async function importFromCanva(userId: string, asset: Asset, format: "png" | "jpg" | "pdf" | "mp4" = "png") {
  const c = canvaConnection(userId);
  if (!c) throw new PermanentError(L("Connectez Canva dans l'onglet Connexions.", "Connect Canva in the Connections tab."));
  const info = json<any>(asset.meta, {}).canva;
  if (!info?.designId) throw new PermanentError(L("Ce média n'a pas encore été ouvert dans Canva.", "This media has not been opened in Canva yet."));
  const token = await freshToken(c);
  const exp = await call(token, "/exports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ design_id: info.designId, format: { type: format, ...(format === "jpg" ? { quality: 90 } : {}) } }) });
  const done = await poll(
    () => call(token, `/exports/${exp.job.id}`),
    (j) => j.job?.status === "success",
    (j) => (j.job?.status === "failed" ? L(`Export Canva impossible : ${j.job?.error?.message ?? ""}`, `Canva export failed: ${j.job?.error?.message ?? ""}`) : null),
    60,
  );
  const urls: string[] = done.job.urls ?? [];
  const mime = { png: "image/png", jpg: "image/jpeg", pdf: "application/pdf", mp4: "video/mp4" }[format];
  const saved: string[] = [];
  for (const [i, u] of urls.entries()) {
    const r = await fetch(u);
    if (!r.ok) continue;
    const a = await saveAsset({
      projectId: asset.project_id,
      userId,
      data: Buffer.from(await r.arrayBuffer()),
      name: `${asset.name.replace(/\.[a-z0-9]+$/i, "")}-canva${urls.length > 1 ? `-${i + 1}` : ""}.${format}`,
      mime,
      role: asset.role ?? "import",
      folderKey: "imports.canva",
      origin: "import",
      sourceAssetId: asset.id,
      versionOf: asset.version_of ?? asset.id,
      meta: { canva: { designId: info.designId, exportedAt: Date.now() }, recipe: L("Retouché dans Canva", "Edited in Canva") },
    });
    saved.push(a.id);
  }
  return saved;
}

export function canvaInfo(assetId: string) {
  const a = getAsset(assetId);
  return a ? json<any>(a.meta, {}).canva ?? null : null;
}
