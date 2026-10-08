import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { all, json, one, run } from "@/lib/db";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";
import { PLATFORMS } from "@/lib/ads-v2/types";

export const runtime = "nodejs";

/** Créations publicitaires V2 du projet : concept, plateforme, format, verdict, note, textes (aucune consigne IA). */
function view(projectId: string) {
  const rows = all<{ id: string; status: string; meta: string; created_at: number }>(
    "SELECT id, status, meta, created_at FROM assets WHERE project_id = ? AND role = 'ad' AND deleted_at IS NULL AND json_extract(meta, '$.adV2') IS NOT NULL ORDER BY created_at DESC LIMIT 80",
    projectId,
  );
  return {
    creatives: rows.map((r) => {
      const m = json<any>(r.meta, {});
      const a = m.adV2 ?? {};
      return {
        id: r.id,
        url: `/api/files/${r.id}`,
        status: r.status,
        verdict: m.gate?.verdict ?? null,
        score: typeof m.gate?.score === "number" ? Math.round(m.gate.score * 10) / 10 : null,
        reason: m.gate?.reason ?? "",
        concept: a.conceptId,
        angle: a.angle,
        copy: a.copy,
        platform: a.platform,
        aspect: a.aspect,
        layout: a.layout,
        imageAssetId: a.imageAssetId ?? null,
        at: r.created_at,
      };
    }),
  };
}

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok(view(p.id));
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(
    req,
    z.object({
      action: z.enum(["generate", "reject"]),
      assetId: z.string().max(40).optional(),
      count: z.number().int().min(1).max(6).optional(),
      platforms: z.array(z.enum(PLATFORMS)).max(6).optional(),
      objective: z.string().max(80).optional(),
      audience: z.string().max(600).optional(),
      /** Offre RÉELLE de la campagne (sinon aucune promotion n'est écrite). */
      offer: z.string().max(200).optional(),
    }),
  );
  if (b.action === "reject") {
    // Création refusée par le client : jamais réutilisée automatiquement.
    if (!one("SELECT 1 FROM assets WHERE id = ? AND project_id = ? AND role = 'ad'", b.assetId ?? "", p.id)) throw new HttpError(404, L("Création introuvable.", "Creative not found."));
    run("UPDATE assets SET status = 'rejected', meta = json_set(meta, '$.userRejected', 1) WHERE id = ?", b.assetId!);
    return ok(view(p.id));
  }
  if (!p.brand) throw new HttpError(409, L("La marque n'est pas encore créée.", "The brand has not been created yet."));
  if (one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'ads.v2' AND status IN ('queued','running','paused')", p.id)) throw new HttpError(409, L("Des publicités sont déjà en préparation.", "Ads are already being prepared."));
  const job = enqueue({ userId: user.id, projectId: p.id, type: "ads.v2", label: L("Publicités : angles, textes et créations", "Ads: angles, copy and creatives"), payload: { projectId: p.id, request: { count: b.count, platforms: b.platforms, objective: b.objective, audience: b.audience, offer: b.offer } } });
  return ok({ jobId: job.id, ...view(p.id) });
});
