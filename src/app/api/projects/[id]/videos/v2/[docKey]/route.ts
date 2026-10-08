import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { one } from "@/lib/db";
import { L } from "@/lib/i18n-server";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import type { Project } from "@/lib/projects";
import { duplicateVideo, foreignVideoAssets, latestVideo, listVideoVersions, restoreVideoVersion, saveVideoVersion, VideoDocumentSchema, videoVersionDoc } from "@/lib/video-v2/store";
import { applyVideoOps, VideoOpError, type VideoOp } from "@/lib/video-v2/ops";
import { localVideoEdit } from "@/lib/video-v2/local-edit";
import { localVideoChecks } from "@/lib/video-v2/quality";
import { timeline, toSrt, toVtt } from "@/lib/video-v2/doc";
import type { VideoDocument } from "@/lib/video-v2/types";

export const runtime = "nodejs";
type DocCtx = Ctx<{ id: string; docKey: string }>;

/** Signalements gratuits après modification (jamais bloquants pour le client). */
function review(doc: VideoDocument) {
  const c = localVideoChecks(doc, { targetS: timeline(doc).total, scriptIssues: [], audio: null });
  return { problems: c.issues, codes: c.codes, durationS: timeline(doc).total };
}

function view(p: Project, docKey: string) {
  const cur = latestVideo(p.id, docKey);
  if (!cur) throw new HttpError(404, L("Vidéo introuvable.", "Video not found."));
  return { docKey, doc: cur.doc, version: cur.version, versions: listVideoVersions(p.id, docKey), ...review(cur.doc) };
}

function save(p: Project, docKey: string, doc: VideoDocument, note: string) {
  if (foreignVideoAssets(p.id, doc).length) throw new HttpError(400, L("Un média ne vient pas de la bibliothèque de ce projet.", "A media file does not come from this project's library."));
  saveVideoVersion(p.id, docKey, { ...doc, meta: { ...doc.meta, source: doc.meta.source === "engine" ? "user" : doc.meta.source } }, { note });
}

export const GET = handle(async (req: Request, ctx: DocCtx) => {
  const { project: p } = await projectFromCtx(ctx as Ctx);
  const { docKey } = await ctx.params;
  const url = new URL(req.url);
  const format = url.searchParams.get("export");
  if (format) {
    if (!["json", "srt", "vtt"].includes(format)) throw new HttpError(400, L("Format d'export inconnu (la vidéo MP4 se rend avec « render »).", "Unknown export format (render the MP4 with \"render\")."));
    const v = url.searchParams.get("version");
    const doc = v ? videoVersionDoc(p.id, docKey, Number(v)) : latestVideo(p.id, docKey)?.doc;
    if (!doc) throw new HttpError(404, L("Vidéo introuvable.", "Video not found."));
    const data = format === "json" ? JSON.stringify(doc, null, 2) : format === "srt" ? toSrt(doc) : toVtt(doc);
    const mime = format === "json" ? "application/json" : format === "srt" ? "application/x-subrip" : "text/vtt";
    return new Response(data, { headers: { "Content-Type": `${mime}; charset=utf-8`, "Content-Disposition": `attachment; filename="video-${doc.aspect.replace(":", "x")}.${format}"` } });
  }
  return ok(view(p, docKey));
});

/**
 * Modifications GRATUITES : enregistrer un document, appliquer des opérations, retouche en langage naturel simple,
 * restaurer, dupliquer. « render » : nouveau rendu (tâche de fond, local, gratuit). « clip » : nouveau plan généré
 * pour UNE séquence — seulement avec `approve` (accord du client après l'estimation affichée).
 */
export const POST = handle(async (req: Request, ctx: DocCtx) => {
  const { user, project: p } = await projectFromCtx(ctx as Ctx);
  const { docKey } = await ctx.params;
  const b = await body(
    req,
    z.object({
      action: z.enum(["save", "ops", "edit", "restore", "duplicate", "render", "clip"]),
      doc: VideoDocumentSchema.optional(),
      ops: z.array(z.record(z.string(), z.unknown())).max(200).optional(),
      instruction: z.string().max(400).optional(),
      version: z.number().int().min(1).optional(),
      clipId: z.string().max(40).optional(),
      approve: z.boolean().optional(),
      maxCostEur: z.number().min(0).max(20).optional(),
      note: z.string().max(200).optional(),
    }),
  );
  const cur = latestVideo(p.id, docKey);
  if (!cur) throw new HttpError(404, L("Vidéo introuvable.", "Video not found."));
  const busy = () => one("SELECT 1 FROM jobs WHERE project_id = ? AND type LIKE 'video.v2%' AND status IN ('queued','running','paused')", p.id);
  switch (b.action) {
    case "save":
      if (!b.doc) throw new HttpError(400, L("Document manquant.", "Missing document."));
      save(p, docKey, b.doc as VideoDocument, b.note ?? "modification manuelle");
      return ok(view(p, docKey));
    case "ops": {
      try {
        save(p, docKey, applyVideoOps(cur.doc, (b.ops ?? []) as unknown as VideoOp[]), b.note ?? "modification manuelle");
      } catch (e) {
        if (e instanceof VideoOpError || (e as Error).name === "LockedLayerError") throw new HttpError(400, (e as Error).message);
        throw e;
      }
      return ok(view(p, docKey));
    }
    case "edit": {
      if (!b.instruction?.trim()) throw new HttpError(400, L("Demande manquante.", "Missing request."));
      const r = localVideoEdit(cur.doc, b.instruction);
      if (!r.local) return ok({ ...view(p, docKey), edit: { local: false, reason: r.reason, choice: r.choice ?? null, paid: r.paid ?? null } });
      save(p, docKey, applyVideoOps(cur.doc, r.ops), `retouche locale : ${r.summary}`);
      return ok({ ...view(p, docKey), edit: { local: true, summary: r.summary } });
    }
    case "restore":
      if (!b.version) throw new HttpError(400, L("Version manquante.", "Missing version."));
      restoreVideoVersion(p.id, docKey, b.version);
      return ok(view(p, docKey));
    case "duplicate":
      return ok(view(p, duplicateVideo(p.id, docKey).docKey));
    case "render": {
      if (busy()) throw new HttpError(409, L("Une vidéo est déjà en préparation.", "A video is already being prepared."));
      const job = enqueue({ userId: user.id, projectId: p.id, type: "video.v2.render", label: L("Vidéo : rendu", "Video: rendering"), payload: { projectId: p.id, docKey } });
      return ok({ jobId: job.id });
    }
    case "clip": {
      if (!b.clipId || !cur.doc.clips.some((c) => c.id === b.clipId)) throw new HttpError(400, L("Plan introuvable.", "Shot not found."));
      if (busy()) throw new HttpError(409, L("Une vidéo est déjà en préparation.", "A video is already being prepared."));
      const job = enqueue({ userId: user.id, projectId: p.id, type: "video.v2.clip", label: L("Vidéo : nouveau plan", "Video: new shot"), payload: { projectId: p.id, docKey, clipId: b.clipId, approve: !!b.approve, maxCostEur: b.maxCostEur, instruction: b.instruction } });
      return ok({ jobId: job.id });
    }
  }
});
