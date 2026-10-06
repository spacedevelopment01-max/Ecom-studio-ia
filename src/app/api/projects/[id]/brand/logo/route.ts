import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { loadProject } from "@/lib/projects";
import { applyLogo, generateLogos, latestProposals, PROPOSAL_KEYS, proposeTaglines } from "@/lib/engine/identity";
import { one } from "@/lib/db";
import { saveBrandGuide } from "@/lib/engine/brand";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";

export const runtime = "nodejs";

/** Planche de mises en situation d'une piste (même lot). */
const boardOf = (projectId: string, proposalId: string) => one<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role = 'logo-route-board' AND source_asset_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", projectId, proposalId);

const list = (projectId: string) =>
  latestProposals(projectId).map((a) => {
    const r = a.info.route;
    const board = r ? boardOf(projectId, a.id) : null;
    return {
      id: a.id,
      key: a.info.key,
      label: a.info.label,
      concept: a.info.concept,
      url: `/api/files/${a.id}`,
      board: board ? `/api/files/${board.id}` : null,
      // Piste créative : typographie, couleurs, origine (IA contrôlée ou version du studio) et note du contrôle.
      route: r
        ? {
            name: r.name,
            why: r.why,
            source: r.source,
            markKind: r.markKind,
            heading: r.heading,
            body: r.body,
            colors: r.colors,
            score: r.review ? Math.round((Object.values(r.review.scores as Record<string, number>).reduce((x, y) => x + y, 0) / Object.values(r.review.scores).length) * 10) / 10 : null,
          }
        : null,
      ai: a.info.ai ?? null,
    };
  });

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const taglines = p.brand ? [...new Set([...(p.brand.taglineAlternatives ?? []), ...proposeTaglines(p)])].filter((t) => t !== p.brand!.tagline).slice(0, 6) : [];
  return ok({ proposals: list(p.id), current: p.brand?.logo.proposal ?? null, provided: p.brand?.logo.status === "provided", taglines });
});

/** Choix d'une proposition (déclinaisons + mise à jour de la boutique), ou nouvelles propositions. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  if (!p.brand) throw new HttpError(409, L("La marque n'est pas encore créée.", "The brand has not been created yet."));
  if (p.brand.logo.status === "provided") throw new HttpError(409, L("Votre logo est conservé tel quel. Supprimez-le des fichiers pour recevoir des propositions.", "Your logo is kept as is. Delete it from your files to receive proposals."));
  const b = await body(req, z.object({ choice: z.enum(PROPOSAL_KEYS).optional(), regenerate: z.boolean().optional() }));
  if (b.regenerate || !latestProposals(p.id).length) await generateLogos(null, p.id, { choice: b.choice, redrawSymbol: !!b.regenerate });
  else if (b.choice) {
    const pr = latestProposals(p.id).find((x) => x.info.key === b.choice);
    if (!pr) throw new HttpError(404, L("Proposition introuvable.", "Proposal not found."));
    await applyLogo(null, p.id, { key: pr.info.key, label: pr.info.label, concept: pr.info.concept, spec: pr.info.spec, colors: pr.info.colors, route: pr.info.route });
  }
  await saveBrandGuide(p.id);
  return ok({ proposals: list(p.id), current: loadProject(p.id).brand?.logo.proposal ?? null });
});
