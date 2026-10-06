import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { latestProposals, PROPOSAL_KEYS, proposeTaglines } from "@/lib/engine/identity";
import { enqueue } from "@/lib/jobs";
import { one } from "@/lib/db";
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
  const { user, project: p } = await projectFromCtx(ctx);
  if (!p.brand) throw new HttpError(409, L("La marque n'est pas encore créée.", "The brand has not been created yet."));
  if (p.brand.logo.status === "provided") throw new HttpError(409, L("Votre logo est conservé tel quel. Supprimez-le des fichiers pour recevoir des propositions.", "Your logo is kept as is. Delete it from your files to receive proposals."));
  const b = await body(req, z.object({ choice: z.enum(PROPOSAL_KEYS).optional(), regenerate: z.boolean().optional() }));
  const regenerate = !!b.regenerate || !latestProposals(p.id).length;
  if (!regenerate && !b.choice) throw new HttpError(400, L("Choisissez une proposition.", "Pick a proposal."));
  if (!regenerate && !latestProposals(p.id).some((x) => x.info.key === b.choice)) throw new HttpError(404, L("Proposition introuvable.", "Proposal not found."));
  // En tâche de fond : avec l'IA, de nouvelles pistes prennent plusieurs minutes, plus que ce que tolèrent certains
  // relais (GitHub Codespaces coupe la requête et renvoie une page 404). L'écran suit la tâche et se met à jour à la fin.
  const job = enqueue({
    userId: user.id,
    projectId: p.id,
    type: "brand.logo",
    label: regenerate ? L("Nouvelles pistes de logo", "New logo routes") : L("Application du logo choisi", "Applying the chosen logo"),
    payload: { projectId: p.id, choice: b.choice ?? null, regenerate, redrawSymbol: !!b.regenerate },
  });
  return ok({ jobId: job.id, proposals: list(p.id), current: p.brand.logo.proposal ?? null });
});
