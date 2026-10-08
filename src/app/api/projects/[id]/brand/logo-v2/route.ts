import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { all, json, one } from "@/lib/db";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";
import { recordLogoRouteRejection } from "@/lib/brain/rejections";

export const runtime = "nodejs";

/**
 * Logo V2 : propositions de la dernière série (seulement celles qui ont passé la barrière), territoires, diagnostic.
 * Les essais écartés ne sont pas dans la galerie : seulement leur nombre et leurs raisons (diagnostic).
 */
function view(projectId: string) {
  const run = json<any>(one<{ value: string }>("SELECT value FROM memory WHERE project_id = ? AND kind = 'artifact' AND key = 'logo_v2_run'", projectId)?.value, null);
  if (!run) return { run: null, proposals: [], discarded: [] };
  const rows = all<{ id: string; role: string; meta: string }>("SELECT id, role, meta FROM assets WHERE project_id = ? AND role IN ('logo-v2','logo-v2-trial') AND json_extract(meta, '$.run') = ? AND deleted_at IS NULL ORDER BY created_at", projectId, run.runId);
  const item = (r: { id: string; meta: string }) => {
    const m = json<any>(r.meta, {});
    const t = m.territory ?? {};
    return {
      id: r.id,
      url: `/api/files/${r.id}`,
      territory: { name: t.name, concept: t.concept, why: t.whyItFits, markType: t.markType, composition: t.composition, typography: t.typography?.style, distinctive: t.distinctive, source: t.source },
      font: m.spec?.family,
      score: typeof m.gate?.score === "number" ? Math.round(m.gate.score * 10) / 10 : null,
      verdict: m.gate?.verdict ?? null,
      reason: m.gate?.reason ?? "",
      attempts: m.gate?.attempts ?? 1,
      change: m.change ?? null,
    };
  };
  return {
    run: { id: run.runId, at: run.at, ai: run.ai, stoppedByCostCap: !!run.stoppedByCostCap, territories: run.territories, rejected: run.rejected ?? [] },
    proposals: rows.filter((r) => r.role === "logo-v2").map(item),
    // Diagnostic : essais écartés (jamais présentés comme des propositions).
    discarded: rows.filter((r) => r.role === "logo-v2-trial").map((r) => ({ ...item(r), url: undefined })),
  };
}

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok(view(p.id));
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ action: z.enum(["generate", "choose", "reject"]), assetId: z.string().max(40).optional() }));
  if (!p.brand) throw new HttpError(409, L("La marque n'est pas encore créée.", "The brand has not been created yet."));
  if (one("SELECT 1 FROM jobs WHERE project_id = ? AND type IN ('brand.logo.v2','brand.logo.v2.choose','brand.logo') AND status IN ('queued','running','paused')", p.id)) throw new HttpError(409, L("Une création de logo est déjà en cours : attendez qu'elle se termine.", "A logo task is already running: wait for it to finish."));
  if (b.action === "reject") {
    // Direction écartée par le client : refus mémorisé (le type de logo ne sera plus proposé).
    const meta = json<any>(one<{ meta: string }>("SELECT meta FROM assets WHERE id = ? AND project_id = ? AND role = 'logo-v2'", b.assetId ?? "", p.id)?.meta, null);
    if (!meta) throw new HttpError(404, L("Proposition introuvable.", "Proposal not found."));
    const mt = meta.territory?.markType;
    recordLogoRouteRejection(p.id, { name: meta.territory?.name, composition: mt === "emblem" ? "emblem" : mt === "wordmark" ? "wordmark" : undefined, markKind: mt === "monogram" || mt === "lettermark" ? "monogram" : mt === "symbol_wordmark" || mt === "abstract_mark" ? "ai-symbol" : undefined });
    return ok(view(p.id));
  }
  if (b.action === "choose") {
    if (!b.assetId || !one("SELECT 1 FROM assets WHERE id = ? AND project_id = ? AND role = 'logo-v2'", b.assetId, p.id)) throw new HttpError(404, L("Proposition introuvable.", "Proposal not found."));
    const job = enqueue({ userId: user.id, projectId: p.id, type: "brand.logo.v2.choose", label: L("Logo choisi : déclinaisons et charte", "Chosen logo: variations and guidelines"), payload: { projectId: p.id, assetId: b.assetId } });
    return ok({ jobId: job.id, ...view(p.id) });
  }
  const job = enqueue({ userId: user.id, projectId: p.id, type: "brand.logo.v2", label: L("Logo : directions créatives", "Logo: creative directions"), payload: { projectId: p.id } });
  return ok({ jobId: job.id, ...view(p.id) });
});
