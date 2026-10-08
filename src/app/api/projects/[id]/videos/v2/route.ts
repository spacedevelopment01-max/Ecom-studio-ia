import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { all, json, one } from "@/lib/db";
import { L } from "@/lib/i18n-server";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { runVideoEngineV2 } from "@/lib/video-v2/engine";
import { VIDEO_FORMATS, VIDEO_INTENTS, VIDEO_PLATFORMS, type VideoDocument } from "@/lib/video-v2/types";

export const runtime = "nodejs";

const AskSchema = z.object({
  text: z.string().max(600).optional(),
  kind: z.enum(VIDEO_INTENTS).optional(),
  platform: z.enum(VIDEO_PLATFORMS).optional(),
  aspect: z.enum(VIDEO_FORMATS).optional(),
  durationS: z.number().min(6).max(600).optional(),
  audience: z.string().max(300).optional(),
  allowGeneration: z.boolean().optional(),
});

/** Vidéos V2 du projet (dernière version de chaque lignée) : intention, format, durée, rendu, « modifiée ». */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const rows = all<{ doc_key: string; version: number; source: string; rendered_asset_id: string | null; created_at: number; doc_json: string; edited: number }>(
    `SELECT d.doc_key, d.version, d.source, d.rendered_asset_id, d.created_at, d.doc_json,
            (SELECT COUNT(*) FROM video_documents u WHERE u.project_id = d.project_id AND u.doc_key = d.doc_key AND u.source <> 'engine') edited
       FROM video_documents d JOIN (SELECT doc_key, MAX(version) v FROM video_documents WHERE project_id = ? GROUP BY doc_key) m ON m.doc_key = d.doc_key AND m.v = d.version
      WHERE d.project_id = ? ORDER BY d.created_at DESC LIMIT 60`,
    p.id,
    p.id,
  );
  return ok({
    videos: rows.map((r) => {
      const d = json<Partial<VideoDocument>>(r.doc_json, {});
      return { docKey: r.doc_key, version: r.version, edited: r.edited > 0, intent: d.meta?.intent ?? null, aspect: d.aspect ?? null, platform: d.platform ?? null, durationS: Math.round((d.clips ?? []).reduce((t, c) => t + c.durationS, 0) * 10) / 10, clips: d.clips?.length ?? 0, url: r.rendered_asset_id ? `/api/files/${r.rendered_asset_id}` : null, at: r.created_at };
    }),
  });
});

/**
 * « plan » : intention, stratégie, script local, storyboard, procédés et ESTIMATION du coût — rien n'est produit ni
 * payé (à montrer au client avant accord). « generate » : tâche de fond ; les plans payants ne sont produits que si
 * `approveGeneration` est vrai (accord du client après l'estimation), sinon la vidéo est montée localement.
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ action: z.enum(["plan", "generate"]), ask: AskSchema.default({}), offer: z.string().max(200).optional(), approveGeneration: z.boolean().optional(), maxCostEur: z.number().min(0).max(50).optional() }));
  if (!p.brand) throw new HttpError(409, L("La marque n'est pas encore créée.", "The brand has not been created yet."));
  if (b.action === "plan") {
    const r = await runVideoEngineV2(null, p.id, { ask: b.ask, offer: b.offer, planOnly: true, maxCostEur: b.maxCostEur });
    return ok({ intent: r.intent, strategy: r.strategy, script: r.script, shots: r.shots.map((s) => ({ id: s.id, part: s.part, durationS: s.durationS, subject: s.subject, method: s.method, why: s.why, paid: s.source.kind === "generate", estimateMicro: s.source.estimateMicro ?? 0 })), estimateMicro: r.estimateMicro, notes: r.notes });
  }
  if (one("SELECT 1 FROM jobs WHERE project_id = ? AND type LIKE 'video.v2%' AND status IN ('queued','running','paused')", p.id)) throw new HttpError(409, L("Une vidéo est déjà en préparation.", "A video is already being prepared."));
  const job = enqueue({ userId: user.id, projectId: p.id, type: "video.v2", label: L("Vidéo : script, plans, montage", "Video: script, shots, editing"), payload: { projectId: p.id, request: { ask: b.ask, offer: b.offer, approveGeneration: !!b.approveGeneration, maxCostEur: b.maxCostEur } } });
  return ok({ jobId: job.id });
});
