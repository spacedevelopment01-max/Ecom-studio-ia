/**
 * Pièces jointes du fil SINA : photos, vidéos, documents. Contrôle des octets par le validateur natif ; les photos
 * et vidéos d'un projet sont aussi rangées dans la bibliothèque native (Fichiers / Images) pour que les outils du
 * Studio les réutilisent. Analyse locale gratuite à l'import (dimensions, plans et rythme d'une vidéo, texte d'un
 * document) ; la lecture visuelle est faite par le modèle (vision) dans le fil, sur le budget autorisé.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import sharp from "sharp";
import { unzipSync, strFromU8 } from "fflate";
import { HttpError, type User } from "../auth";
import { DATA_DIR, all, id, json, now, one, run } from "../db";
import { checkedUpload } from "../upload-security";
import { saveAsset } from "../library";
import { requirePlan } from "../plan-gates";
import { L } from "../i18n-server";
import type { LlmImage } from "../ai/llm";
import type { SynaMessage } from "./store";

export const MAX_ATTACHMENT_BYTES = { image: 30 * 1048576, video: 300 * 1048576, document: 30 * 1048576 } as const;
export type AttachmentKind = "image" | "video" | "document";
export type Attachment = { id: string; kind: AttachmentKind; name: string; mime: string; path: string; assetId: string | null; analysis: any; createdAt: number };

const dirOf = (cid: string) => path.join(DATA_DIR, "storage", "syna", cid);

export function attachmentsOf(cid: string): Attachment[] {
  return all<any>("SELECT * FROM syna_attachments WHERE conversation_id=? ORDER BY created_at", cid)
    .map((a) => ({ id: a.id, kind: a.kind, name: a.name, mime: a.mime, path: a.path, assetId: a.asset_id, analysis: json(a.analysis_json, null), createdAt: a.created_at }));
}

function kindOf(mime: string, name: string): AttachmentKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf" || /^text\//.test(mime) || /\.(docx|md|txt|csv)$/i.test(name) || mime === "application/json") return "document";
  throw new HttpError(415, L("Type de fichier non pris en charge : photo, vidéo (MP4, MOV, WebM), PDF, Word (.docx) ou texte.", "Unsupported file type: photo, video (MP4, MOV, WebM), PDF, Word (.docx) or text."));
}

export async function saveAttachment(user: User, cid: string, file: { name: string; type: string; data: Buffer }): Promise<Attachment> {
  const c = one<{ user_id: string; project_id: string | null }>("SELECT user_id,project_id FROM agent_conversations WHERE id=?", cid);
  if (!c || c.user_id !== user.id) throw new HttpError(404, L("Conversation introuvable.", "Conversation not found."));
  if (c.project_id) requirePlan(user, c.project_id);
  if (/\.(html?|xhtml|xml|js|mjs|exe|sh|bat|cmd|php|svg)$/i.test(file.name)) throw new HttpError(415, L("Type de fichier actif refusé.", "Active file type refused."));
  const mime = await checkedUpload(file.data, file.name, file.type || "application/octet-stream");
  const kind = kindOf(mime, file.name);
  if (!file.data.length || file.data.length > MAX_ATTACHMENT_BYTES[kind]) throw new HttpError(413, L("Fichier vide ou trop volumineux.", "File empty or too large."));
  const aid = id(), dir = dirOf(cid);
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(file.name).toLowerCase().replace(/[^.a-z0-9]/g, "") || "";
  const p = path.join(dir, `${aid}${ext}`);
  fs.writeFileSync(p, file.data);
  let assetId: string | null = null;
  if (c.project_id && (kind === "image" || kind === "video")) {
    const asset = await saveAsset({ projectId: c.project_id, userId: user.id, name: file.name, mime, data: file.data, role: "original", origin: "upload", meta: { uploadedAt: now(), synaAttachment: { conversationId: cid, attachmentId: aid } } });
    assetId = asset.id;
  }
  const analysis = await analyzeLocally(kind, p, aid, dir);
  run("INSERT INTO syna_attachments(id,conversation_id,user_id,kind,name,mime,path,asset_id,analysis_json,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)", aid, cid, user.id, kind, file.name, mime, p, assetId, JSON.stringify(analysis), now());
  return attachmentsOf(cid).find((a) => a.id === aid)!;
}

/** Analyse locale, gratuite et reproductible. */
export async function analyzeLocally(kind: AttachmentKind, file: string, aid: string, dir: string): Promise<any> {
  if (kind === "image") {
    const m = await sharp(file).metadata();
    return { width: m.width, height: m.height, format: m.format };
  }
  if (kind === "video") return analyzeVideo(file, path.join(dir, `${aid}-frames`));
  return analyzeDocument(file);
}

/** Vidéo : durée, format, son, découpage en plans (changements de scène) et images clés pour la vision. */
export function analyzeVideo(file: string, framesDir: string) {
  const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", file], { maxBuffer: 8 << 20 }).toString());
  const v = probe.streams.find((s: any) => s.codec_type === "video");
  const duration = Number(probe.format?.duration ?? v?.duration ?? 0);
  const [num, den] = String(v?.avg_frame_rate ?? "0/1").split("/").map(Number);
  // showinfo écrit sur la sortie d'erreur : c'est elle qui porte les instants de changement de plan.
  const scan = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-filter:v", "select='gt(scene,0.3)',showinfo", "-an", "-f", "null", "-"], { maxBuffer: 64 << 20, encoding: "utf8" });
  const cuts = [...String(scan.stderr ?? "").matchAll(/pts_time:([0-9.]+)/g)].map((x) => Number(Number(x[1]).toFixed(2))).filter((t) => t > 0.05 && t < duration - 0.05);
  const bounds = [0, ...cuts, duration];
  const shots = bounds.slice(1).map((end, i) => Number((end - bounds[i]).toFixed(2))).filter((d) => d > 0);
  fs.mkdirSync(framesDir, { recursive: true });
  const times = keyTimes(duration, cuts);
  const frames: { t: number; file: string }[] = [];
  for (const [i, t] of times.entries()) {
    const out = path.join(framesDir, `f${i}.jpg`);
    try { execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(t), "-i", file, "-frames:v", "1", "-vf", "scale='min(768,iw)':-2", out]); if (fs.existsSync(out)) frames.push({ t, file: out }); } catch { /* image ignorée */ }
  }
  const avg = shots.length ? shots.reduce((a, b) => a + b, 0) / shots.length : duration;
  return {
    duration: Number(duration.toFixed(2)), width: v?.width ?? null, height: v?.height ?? null, fps: den ? Number((num / den).toFixed(2)) : null,
    audio: probe.streams.some((s: any) => s.codec_type === "audio"),
    shots, cuts, shotCount: shots.length, averageShot: Number(avg.toFixed(2)),
    rhythm: avg < 1.2 ? "très rapide" : avg < 2.5 ? "rapide" : avg < 5 ? "modéré" : "lent",
    frames,
  };
}

function keyTimes(duration: number, cuts: number[]): number[] {
  if (!(duration > 0)) return [];
  const mids = [0, ...cuts, duration].slice(1).map((end, i, arr) => { const start = i === 0 ? 0 : arr[i - 1]; return Number(((start + end) / 2).toFixed(2)); });
  const picked = mids.length <= 8 ? mids : Array.from({ length: 8 }, (_, i) => mids[Math.floor((i * mids.length) / 8)]);
  return picked.length ? picked : [Number((duration / 2).toFixed(2))];
}

/** Document : texte intégral (PDF via pdftotext, Word .docx via son XML, texte brut). */
export function analyzeDocument(file: string) {
  let text = "";
  if (/\.pdf$/i.test(file)) {
    try { text = execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", file, "-"], { maxBuffer: 64 << 20 }).toString(); }
    catch { text = ""; }
    if (!text.trim()) return { text: "", pages: null, note: L("Texte du PDF non lisible (document scanné ?).", "PDF text unreadable (scanned document?).") };
  } else if (/\.docx$/i.test(file)) {
    const files = unzipSync(fs.readFileSync(file));
    const xml = files["word/document.xml"] ? strFromU8(files["word/document.xml"]) : "";
    text = xml.replace(/<\/w:p>/g, "\n").replace(/<w:tab\/>/g, "\t").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  } else text = fs.readFileSync(file, "utf8");
  text = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { text: text.slice(0, 200_000), characters: text.length, truncated: text.length > 200_000 };
}

/** Images à montrer au modèle : photos et images clés des vidéos jointes au dernier message du client. */
export function attachmentImages(cid: string, history: SynaMessage[]): LlmImage[] {
  const lastUser = [...history].reverse().find((m) => m.role === "user");
  const ids: string[] = lastUser?.content?.attachments ?? [];
  const out: LlmImage[] = [];
  for (const a of attachmentsOf(cid).filter((x) => ids.includes(x.id))) {
    if (a.kind === "image" && fs.existsSync(a.path)) out.push({ data: fs.readFileSync(a.path), label: `Pièce jointe ${a.id} — ${a.name}` });
    if (a.kind === "video") for (const f of (a.analysis?.frames ?? []).slice(0, 6)) if (fs.existsSync(f.file)) out.push({ data: fs.readFileSync(f.file), label: `Vidéo ${a.id} — image à ${f.t} s` });
  }
  return out.slice(0, 12);
}

/** Ligne de contexte (le texte intégral d'un document se lit avec l'outil attachment.read). */
export function describeAttachment(a: Attachment): string {
  const x = a.analysis ?? {};
  if (a.kind === "image") return `- ${a.id} : photo « ${a.name} » ${x.width}×${x.height}${a.assetId ? `, rangée dans la bibliothèque (asset ${a.assetId})` : ""}`;
  if (a.kind === "video") return `- ${a.id} : vidéo « ${a.name} » ${x.duration} s, ${x.width}×${x.height}, ${x.shotCount} plans (moyenne ${x.averageShot} s, rythme ${x.rhythm}), durées des plans [${(x.shots ?? []).join(", ")}], son : ${x.audio ? "oui" : "non"}${a.assetId ? `, asset ${a.assetId}` : ""}`;
  return `- ${a.id} : document « ${a.name} », ${x.characters ?? 0} caractères. Début : ${String(x.text ?? "").slice(0, 600).replace(/\s+/g, " ")}`;
}

/**
 * Images du parcours que SINA doit VOIR pour en parler (demande du propriétaire du 7 novembre : « SINA doit lire les
 * images ») : les 3 logos tant que le client n'a pas choisi (étape 2), la planche de marque tant que l'image de marque
 * n'est pas validée (étape 3). Réduites (512 px, planche 1024 px) : quelques millièmes d'euro par réponse.
 */
export async function journeyImages(j: { steps: Record<number, { status: string } | undefined>; logos?: { list: { source: string; name: string; assetId: string | null; verdict: string; score: number | null }[] }; logoChoice?: unknown; brandKit?: { boardId: string | null } }, projectId?: string | null): Promise<LlmImage[]> {
  const { getAsset, assetData } = await import("../library");
  const sharp = (await import("sharp")).default;
  const small = async (id: string, size: number) => { const a = getAsset(id); return a && !a.deleted_at ? sharp(assetData(a)).resize(size, size, { fit: "inside", withoutEnlargement: true }).png().toBuffer() : null; };
  const out: LlmImage[] = [];
  if (j.logos?.list.length && !j.logoChoice && j.steps[2]?.status !== "done") {
    for (const l of j.logos.list) if (l.assetId) { const data = await small(l.assetId, 512).catch(() => null); if (data) out.push({ data, label: `Logo ${l.source} — ${l.name} (${l.verdict === "FINAL" ? `validé ${l.score ?? "?"}/10` : "non validé"})` }); }
  }
  if (j.brandKit?.boardId && j.steps[3]?.status !== "done") { const data = await small(j.brandKit.boardId, 1024).catch(() => null); if (data) out.push({ data, label: "Planche de marque montrée au client" }); }
  // Étape 6 : les images de maquette déjà créées (consigne du propriétaire : « SINA doit lire les images » ; essai réel
  // du 8 novembre : « je n'ai pas de rendu à te décrire, je ne le vois pas ici »). Trois au plus, la plus récente de
  // chaque maquette.
  if (projectId && j.steps[6]?.status !== "done") {
    const { loadMockupSet } = await import("./mockup-code/mockup-set");
    const set = loadMockupSet(projectId);
    // La plus RÉCENTE de chaque maquette (date de création de l'image, pas l'ordre du plan : essai réel du 8 novembre,
    // l'accueil téléphone refait n'était pas celle que SINA regardait), la plus récente de toutes en premier et en
    // pleine définition (1536 px) pour en lire les textes.
    // Toutes les images créées ces 20 dernières minutes (essai réel : deux paniers refaits, SINA n'en voyait qu'un), sinon
    // la plus récente de chaque maquette.
    const all = (set?.directions ?? []).flatMap((d) => d.images.filter((i) => i.status === "ready" && i.assetId).map((img) => ({ d, img, at: getAsset(img.assetId!)?.created_at ?? 0 }))).sort((x, y) => y.at - x.at);
    const recent = all.filter((x) => Date.now() - x.at < 20 * 60_000).slice(0, 4);
    const latest = recent.length ? recent : (set?.directions ?? []).map((d) => all.find((x) => x.d.key === d.key)).filter((x): x is NonNullable<typeof x> => !!x);
    for (const [n, { d, img, at }] of latest.entries()) {
      if (out.length >= 6) break;
      const data = await small(img.assetId!, n === 0 || recent.length ? 1536 : 1024).catch(() => null);
      const fresh = Date.now() - at < 15 * 60_000;
      if (data) out.push({ data, label: `Maquette ${d.key} « ${d.name} », image ${img.id} — ${img.pages.join(", ")} (${img.viewport === "desktop" ? "ordinateur" : "téléphone"})${fresh ? ", créée il y a quelques minutes" : ""}, montrée au client${img.check ? (img.check.ok ? " ; contrôle automatique de la mise en page : rien à signaler" : ` ; RATÉE au contrôle automatique : ${img.check.problems.join(" ; ")}`) : ""}` });
    }
  }
  // Étape 7 : captures du site codé, chacune à côté de l'image de maquette de la même page (essai réel du 8 novembre :
  // SINA ne voyait pas le rendu et ne parlait ni des couleurs ni des sections manquantes).
  if (projectId && j.steps[7]?.status !== "done" && j.steps[6]?.status === "done") {
    const { all } = await import("../db");
    const row = all<{ value: string }>("SELECT value FROM memory WHERE project_id=? AND kind='artifact' AND key='syna.step7.report' AND state='active' ORDER BY updated_at DESC LIMIT 1", projectId)[0];
    let r: { captures?: { page: string; viewport: string; assetId: string }[]; direction?: string } | null = null;
    try { r = row ? JSON.parse(row.value) : null; } catch { r = null; }
    const { loadMockupSet } = await import("./mockup-code/mockup-set");
    const d = loadMockupSet(projectId)?.directions.find((x) => x.key === r?.direction);
    for (const c of (r?.captures ?? []).slice(0, 4)) {
      if (out.length >= 8) break;
      const mock = d?.images.find((i) => i.status === "ready" && i.assetId && i.viewport === c.viewport && i.pages.includes(c.page));
      const m = mock ? await small(mock.assetId!, 1024).catch(() => null) : null;
      if (m) out.push({ data: m, label: `Maquette ${d!.key} — ${c.page} (${c.viewport === "desktop" ? "ordinateur" : "téléphone"}), la référence` });
      const data = await small(c.assetId, 1536).catch(() => null);
      if (data) out.push({ data, label: `Site codé (étape 7) — ${c.page} (${c.viewport === "desktop" ? "ordinateur" : "téléphone"}), capture de l'aperçu : compare-la à la maquette` });
    }
  }
  return out;
}
