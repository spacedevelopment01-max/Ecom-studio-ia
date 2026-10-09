import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { one } from "@/lib/db";
import { json } from "@/lib/db";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { fullLogos, rejectedFullLogos, useFullLogo } from "@/lib/engine/full-logo";
import { L } from "@/lib/i18n-server";

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
  // Ancien générateur de logos complets : plus de nouvelle création (Brand & Logo Engine V2 dans l'onglet Marque) ;
  // les logos déjà créés restent consultables et utilisables (« use »).
  throw new HttpError(410, L("Les nouveaux logos se créent avec le moteur de logo de l'onglet Marque.", "New logos are created with the logo engine in the Brand tab."));
});
