import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { all, json, one, run } from "@/lib/db";
import { remember } from "@/lib/projects";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";
import { requireCreationPlan } from "@/lib/plan-gates";
import { visualIntent } from "@/lib/image-v2/intent";
import { ART_DIRECTIONS, VISUAL_KINDS } from "@/lib/image-v2/types";
import { DIRECTIONS } from "@/lib/image-v2/direction";

export const runtime = "nodejs";

/** Images V2 du projet : verdict, note, origine, licence, brief résumé (aucune consigne de génération). */
function view(projectId: string) {
  const rows = all<{ id: string; role: string; status: string; meta: string; created_at: number }>(
    "SELECT id, role, status, meta, created_at FROM assets WHERE project_id = ? AND deleted_at IS NULL AND json_extract(meta, '$.imageV2') IS NOT NULL ORDER BY created_at DESC LIMIT 60",
    projectId,
  );
  return {
    images: rows.map((r) => {
      const m = json<any>(r.meta, {});
      const v = m.imageV2 ?? {};
      return {
        id: r.id,
        url: `/api/files/${r.id}`,
        role: r.role,
        status: r.status,
        verdict: m.gate?.verdict ?? null,
        score: typeof m.gate?.score === "number" ? Math.round(m.gate.score * 10) / 10 : null,
        reason: m.gate?.reason ?? "",
        origin: v.origin,
        provider: v.provider,
        brief: v.brief,
        license: v.license ? { name: v.license.name, url: v.license.url, verifiedBy: v.license.verifiedBy, restrictions: v.license.restrictions } : null,
        credit: m.recipe ?? null,
        corrections: v.corrections ?? [],
        at: r.created_at,
      };
    }),
  };
}

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok(view(p.id));
});

const ImageRequestSchema = z.object({
  kind: z.enum(VISUAL_KINDS).optional(),
  /** Demande en texte libre : l'intention est comprise localement (sans IA). */
  text: z.string().max(400).optional(),
  support: z.enum(["site", "product_page", "service_page", "social", "ad", "blog", "video", "banner", "gallery", "brand"]).optional(),
  aspect: z.enum(["1:1", "4:5", "2:3", "3:2", "9:16", "16:9", "3:1", "4:1"]).optional(),
  count: z.number().int().min(1).max(4).optional(),
  topic: z.string().max(200).optional(),
  allowGenerate: z.boolean().optional(),
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ action: z.enum(["generate", "reject", "reject_direction"]), assetId: z.string().max(40).optional(), direction: z.enum(ART_DIRECTIONS).optional(), request: ImageRequestSchema.optional() }));
  if (b.action === "reject") {
    // Image refusée par le client : jamais réutilisée automatiquement (statut refusé, choix humain mémorisé).
    const a = one<{ meta: string }>("SELECT meta FROM assets WHERE id = ? AND project_id = ? AND json_extract(meta, '$.imageV2') IS NOT NULL", b.assetId ?? "", p.id);
    if (!a) throw new HttpError(404, L("Image introuvable.", "Image not found."));
    run("UPDATE assets SET status = 'rejected', meta = json_set(meta, '$.userRejected', 1) WHERE id = ?", b.assetId!);
    return ok(view(p.id));
  }
  if (b.action === "reject_direction") {
    if (!b.direction) throw new HttpError(400, L("Direction manquante.", "Missing direction."));
    // Direction artistique écartée : ne sera plus choisie pour ce projet.
    remember(p.id, { kind: "rejection", key: `image:${b.direction}`, value: DIRECTIONS[b.direction].label, source: "user", scope: "image" });
    return ok(view(p.id));
  }
  // Même droit que les autres créations d'images : un forfait de création est requis (aucun passe-droit).
  requireCreationPlan(user, "images");
  const r = b.request ?? {};
  const intent = r.kind ? { kind: r.kind, support: r.support } : visualIntent(r.text ?? "", p.business);
  const job = enqueue({
    userId: user.id,
    projectId: p.id,
    type: "image.v2",
    label: L("Images : direction artistique et sélection", "Images: art direction and selection"),
    payload: { projectId: p.id, request: { kind: intent.kind, support: r.support ?? intent.support, aspect: r.aspect, count: r.count ?? 1, topic: r.topic ?? (r.kind ? null : r.text ?? null), allowGenerate: r.allowGenerate !== false } },
  });
  return ok({ jobId: job.id, ...view(p.id) });
});
