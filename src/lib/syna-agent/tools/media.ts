/** Fichiers, images (bibliothèque et génération native devisée), vidéos (montage local au rythme voulu, rendu). */
import { z } from "zod";
import { all, id as newId, json } from "../../db";
import { createFolder, listFolders } from "../../library";
import { enqueue } from "../../jobs";
import { NativeImageRequestSchema, quoteNativeImageGeneration, checkedNativeImageApproval, nativeImageJobKey } from "../../image-v2/native-approval";
import { imageBindingHash } from "../../image-v2/request-binding";
import { conversationMotionDocument } from "../../video-v2/conversation-motion";
import { latestVideo, listVideoVersions, saveVideoVersion } from "../../video-v2/store";
import { assertAdvertising } from "../../job-entitlements";
import { L } from "../../i18n-server";
import type { AgentTool } from "../types";
import { project, short } from "./common";

const filesTool: AgentTool<{ kind?: "image" | "video" | "archive" | "document"; limit?: number }> = {
  name: "files.list", module: "fichiers", kind: "read", needsProject: true,
  description: "Liste les médias du projet (photos, vidéos, exports) avec assetId, nom, rôle, origine (upload, generated, export), dimensions et dossier.",
  args: z.object({ kind: z.enum(["image", "video", "archive", "document"]).optional(), limit: z.number().int().min(1).max(200).default(60) }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    const rows = all<any>(`SELECT id,name,kind,role,origin,folder_id,meta,created_at FROM assets WHERE project_id=? AND deleted_at IS NULL ${a.kind ? "AND kind=?" : ""} ORDER BY created_at DESC LIMIT ?`, p.id, ...(a.kind ? [a.kind] : []), a.limit);
    return { ok: true, summary: L(`${rows.length} média(s).`, `${rows.length} media.`), data: rows.map((r) => { const m = json<any>(r.meta, {}); return { assetId: r.id, name: r.name, kind: r.kind, role: r.role, origin: r.origin, folderId: r.folder_id, width: m.width, height: m.height, duration: m.duration, at: r.created_at }; }) };
  },
};

const folderTool: AgentTool<{ name: string; parentId?: string | null }> = {
  name: "files.folder", module: "fichiers", kind: "write", needsProject: true,
  description: "Crée un dossier dans les Fichiers du projet.",
  args: z.object({ name: z.string().min(1).max(80), parentId: z.string().max(40).nullable().optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx), f: any = createFolder(p.id, a.name, a.parentId ?? null), ok = listFolders(p.id).some((x: any) => x.id === f.id);
    return { ok, summary: L(`Dossier « ${a.name} » créé.`, `Folder "${a.name}" created.`), data: { folderId: f.id }, changes: [{ module: "fichiers", object: a.name, summary: L("dossier créé", "folder created"), verified: ok }] };
  },
};

/** Devis natif conservé entre l'estimation et l'exécution d'une même action. */
const imageQuotes = new Map<string, { operationId: string; token: string; maximumMicro: number }>();

const imagesTool: AgentTool<z.infer<typeof NativeImageRequestSchema>> = {
  name: "images.generate", module: "images", kind: "generate", needsProject: true,
  description: "Crée 1 à 4 images avec le moteur d'images natif (photos libres de droits d'abord, sinon génération IA contrôlée), débitées sur le budget autorisé : kind (type de visuel), support (site, product_page, ad, social…), aspect, count, topic, text. Le résultat arrive dans Images / Fichiers ; SYNA reprend quand c'est prêt.",
  args: NativeImageRequestSchema,
  estimate: async (ctx, a) => { const p = project(ctx), operationId = `syna-${newId()}`, q = await quoteNativeImageGeneration(ctx.user, p.id, operationId, a); imageQuotes.set(`${ctx.runId}:${imageBindingHash(a)}`, { operationId, token: q.approvalToken, maximumMicro: q.maximumMicro }); return { maxMicro: q.maximumMicro, label: "images" }; },
  run: async (ctx, a) => {
    const p = project(ctx), key = `${ctx.runId}:${imageBindingHash(a)}`;
    let q = imageQuotes.get(key);
    if (!q) { const operationId = `syna-${newId()}`, r = await quoteNativeImageGeneration(ctx.user, p.id, operationId, a); q = { operationId, token: r.approvalToken, maximumMicro: r.maximumMicro }; }
    const approval = await checkedNativeImageApproval(ctx.user, p.id, q.operationId, a, q.token, true);
    const job = enqueue({ userId: ctx.user.id, projectId: p.id, type: "image.v2", idempotencyKey: nativeImageJobKey(ctx.user.id, p.id, q.operationId, a), maxAttempts: 1, label: L("Images : création demandée à SYNA", "Images: created with SYNA"), payload: { projectId: p.id, request: a, costCapMicro: approval.cost.capMicro, nativeImageQuote: { operationId: q.operationId, requestHash: imageBindingHash(a), token: q.token } } });
    imageQuotes.delete(key);
    return { ok: true, summary: L("Création d'images lancée ; SYNA relira les images obtenues.", "Image creation started."), jobs: [job.id] };
  },
};

const Scene = z.object({ assetId: z.string().max(40), durationS: z.number().min(0.8).max(60).default(3), camera: z.enum(["static", "push_in", "pull_out", "pan_left", "pan_right", "tilt_up"]).default("push_in"), title: z.string().max(40).default(""), titleColor: z.string().regex(/^#[a-fA-F0-9]{6}$/).default("#FFFFFF"), place: z.enum(["top", "lower"]).default("lower") }).strict();

const montageTool: AgentTool<{ purpose: "ad" | "organic"; aspect: "9:16" | "16:9" | "1:1" | "4:5"; scenes: z.infer<typeof Scene>[]; line: string; cta: string; music: "none" | "calm" | "warm" | "pulse"; rhythmFromAttachmentId?: string }> = {
  name: "video.montage", module: "vidéos", kind: "write", needsProject: true,
  description: "Crée une vidéo (publicité ou publication) par montage LOCAL des images du projet (gratuit) : 1 à 6 scènes {assetId, durationS, camera, title, titleColor, place}, phrase et appel à l'action, musique synthétique. Pour reprendre le RYTHME d'une vidéo de référence jointe, passez rhythmFromAttachmentId : les durées des plans de la référence sont appliquées aux scènes (dans l'ordre, bornées 0,8–60 s). Rendu MP4 en tâche de fond, visible dans Vidéos. Aucun plan filmé n'est généré par cet outil.",
  args: z.object({ purpose: z.enum(["ad", "organic"]), aspect: z.enum(["9:16", "16:9", "1:1", "4:5"]), scenes: z.array(Scene).min(1).max(6), line: z.string().max(70).default(""), cta: z.string().max(80).default(""), music: z.enum(["none", "calm", "warm", "pulse"]).default("pulse"), rhythmFromAttachmentId: z.string().max(40).optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    if (a.purpose === "ad") assertAdvertising(p.id);
    let scenes = a.scenes;
    let rhythm: number[] | null = null;
    if (a.rhythmFromAttachmentId) {
      const at = ctx.attachment(a.rhythmFromAttachmentId) as any;
      if (!at || at.kind !== "video") return { ok: false, summary: L("Vidéo de référence introuvable dans ce fil.", "Reference video not found.") };
      const shots: number[] = (at.analysis?.shots ?? []).filter((x: number) => x > 0);
      if (!shots.length) return { ok: false, summary: L("La vidéo de référence n'a pas de plans mesurables.", "No measurable shots.") };
      rhythm = scenes.map((_, i) => Math.min(60, Math.max(0.8, Number(shots[i % shots.length].toFixed(2)))));
      scenes = scenes.map((s, i) => ({ ...s, durationS: rhythm![i] }));
    }
    const plan: any = { tool: "videos.motion", aspect: a.aspect, purpose: a.purpose, scenes: scenes.map((s) => ({ durationS: s.durationS, camera: s.camera, title: s.title, titleColor: s.titleColor, place: s.place })), line: a.line, cta: a.cta, music: a.music };
    const doc = conversationMotionDocument(p, plan, scenes.map((s) => s.assetId));
    const docKey = `vid:${newId()}`;
    const v = saveVideoVersion(p.id, docKey, doc, { note: rhythm ? `montage SYNA au rythme de la vidéo de référence (${rhythm.join(" / ")} s)` : "montage SYNA" } as any);
    const read = latestVideo(p.id, docKey);
    const job = enqueue({ userId: ctx.user.id, projectId: p.id, type: "video.v2.render", label: L("Vidéo : montage SYNA", "Video: SYNA edit"), payload: { projectId: p.id, docKey, request: { as: a.purpose === "ad" ? "ad" : "post" }, costCapMicro: 0 }, maxAttempts: 1 });
    const total = scenes.reduce((n, s) => n + s.durationS, 0);
    return { ok: !!read, summary: L(`Vidéo ${a.purpose === "ad" ? "publicitaire" : ""} enregistrée (${scenes.length} plans, ${total.toFixed(1)} s${rhythm ? ", rythme de la référence" : ""}) ; rendu MP4 lancé.`, `Video saved; render started.`), jobs: [job.id], data: { docKey, version: (v as any).version ?? (v as any).number, durations: scenes.map((s) => s.durationS) },
      changes: [{ module: "vidéos", object: docKey, summary: `${scenes.length} plans : ${scenes.map((s) => s.durationS).join(" / ")} s`, after: { docKey, durations: scenes.map((s) => s.durationS) }, verified: !!read }] };
  },
};

const videosTool: AgentTool<{ docKey?: string }> = {
  name: "videos.list", module: "vidéos", kind: "read", needsProject: true,
  description: "Liste les vidéos du projet (docKey, versions, durée des plans, fichier MP4 rendu) ou le détail d'une vidéo.",
  args: z.object({ docKey: z.string().max(80).optional() }).strict(),
  run: (ctx, a) => {
    const p = project(ctx);
    const keys = a.docKey ? [a.docKey] : all<{ doc_key: string }>("SELECT DISTINCT doc_key FROM video_documents WHERE project_id=? ORDER BY created_at DESC LIMIT 20", p.id).map((r) => r.doc_key);
    const out = keys.map((k) => { const l = latestVideo(p.id, k); return l ? { docKey: k, version: l.version.version, note: l.version.note, clips: (l.doc as any).clips?.map((c: any) => ({ id: c.id, durationS: c.durationS, source: c.source?.kind })), renderedAssetId: l.version.renderedAssetId, versions: listVideoVersions(p.id, k).length } : null; }).filter(Boolean);
    return { ok: true, summary: L(`${out.length} vidéo(s).`, `${out.length} video(s).`), data: out };
  },
};

export const mediaTools: AgentTool[] = [filesTool, folderTool, imagesTool, montageTool, videosTool];
export const _m = { short };
