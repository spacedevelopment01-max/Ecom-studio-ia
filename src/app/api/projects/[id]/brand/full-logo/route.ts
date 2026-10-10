import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { one } from "@/lib/db";
import { json } from "@/lib/db";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { fullLogos, rejectedFullLogos, useFullLogo } from "@/lib/engine/full-logo";
import { L } from "@/lib/i18n-server";
import { enqueue } from "@/lib/jobs";
import { aiActiveFor } from "@/lib/ai/access";
import { llmConfigured } from "@/lib/ai/llm";
import { imageProviderAvailable, imageUnavailableReason } from "@/lib/ai/media-providers";

export const runtime = "nodejs";

const list = (projectId: string) =>
  fullLogos(projectId).map((a) => {
    const m = json<Record<string, any>>(a.meta, {});
    return { id: a.id, url: `/api/files/${a.id}`, concept: m.concept ?? "", warning: m.qcWarning ?? null, score: typeof m.qc?.score === "number" ? m.qc.score : null, verdict: (m.gate?.verdict as string | undefined) ?? null };
  });

/** Logos complets dessinés par l'IA d'images : liste, création (tâche de fond), utilisation. */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const running = !!one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'brand.fulllogo' AND status IN ('queued','running','paused')", p.id);
  return ok({ logos: list(p.id), rejected: rejectedFullLogos(p.id), running, current: p.brand?.logo.proposalId ?? null });
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  if (!p.brand) throw new HttpError(409, L("La marque n'est pas encore créée.", "The brand has not been created yet."));
  const b = await body(req, z.object({ action: z.enum(["create", "use"]), assetId: z.string().max(40).optional() }));
  if (b.action === "use") {
    if (!b.assetId) throw new HttpError(400, L("Logo manquant.", "Missing logo."));
    await useFullLogo(p.id, b.assetId);
    return ok({ logos: list(p.id), current: b.assetId });
  }
  // Logo complet dessiné par l'IA d'images (symbole + nom + activités, comme le ferait une agence), puis contrôlé.
  // Une seule création à la fois ; le coût passe par la réservation habituelle dans la tâche de fond.
  // Aucune solution locale pour un logo dessiné : refus clair avant toute tâche (Découverte = 0 € d'IA).
  if (!aiActiveFor(p.userId)) throw new HttpError(403, L("Le logo complet dessiné par l'IA demande un forfait avec IA. En Découverte, le logo est construit par le moteur local.", "The AI-drawn full logo needs a plan with AI. On Discovery, the logo is built by the local engine."));
  if (!llmConfigured() || !imageProviderAvailable({ usage: "logo", text: true, transparent: true }))
    throw new HttpError(409, L(`Logo complet par IA indisponible : ${imageUnavailableReason("logo") ?? "IA de rédaction non active"}.`, `AI full logo unavailable: ${imageUnavailableReason("logo") ?? "writing AI not active"}.`));
  if (one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'brand.fulllogo' AND status IN ('queued','running','paused')", p.id))
    throw new HttpError(409, L("Une création de logos complets est déjà en cours.", "A full logo creation is already running."));
  const job = enqueue({ userId: user.id, projectId: p.id, type: "brand.fulllogo", label: L("Logos complets par IA", "AI full logos"), payload: { projectId: p.id } });
  return ok({ jobId: job.id, running: true });
});
