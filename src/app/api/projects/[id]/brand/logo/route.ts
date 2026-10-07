import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { latestProposals, MAX_ROUTES, proposeTaglines, removeProposal } from "@/lib/engine/identity";
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
      notes: Array.isArray(a.info.notes) ? (a.info.notes as string[]).slice(0, 12) : [],
    };
  });

/** Piste choisie : par son fichier, ou (pistes enregistrées avant) par sa famille. */
function currentId(p: { id: string; brand: { logo: { proposal?: string; proposalId?: string } } | null }) {
  const props = latestProposals(p.id);
  const byId = p.brand?.logo.proposalId && props.find((x) => x.id === p.brand!.logo.proposalId);
  return byId ? byId.id : (props.find((x) => x.info.key === p.brand?.logo.proposal)?.id ?? null);
}

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const taglines = p.brand ? [...new Set([...(p.brand.taglineAlternatives ?? []), ...proposeTaglines(p)])].filter((t) => t !== p.brand!.tagline).slice(0, 6) : [];
  return ok({ proposals: list(p.id), current: currentId(p), max: MAX_ROUTES, provided: p.brand?.logo.status === "provided", taglines });
});

/** Choix d'une piste (déclinaisons + mise à jour de la boutique), ou nouvelles pistes ajoutées (au plus 3 en tout). */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  if (!p.brand) throw new HttpError(409, L("La marque n'est pas encore créée.", "The brand has not been created yet."));
  if (p.brand.logo.status === "provided") throw new HttpError(409, L("Votre logo est conservé tel quel. Supprimez-le des fichiers pour recevoir des propositions.", "Your logo is kept as is. Delete it from your files to receive proposals."));
  const b = await body(req, z.object({ proposalId: z.string().max(40).optional(), regenerate: z.boolean().optional() }));
  const props = latestProposals(p.id);
  const regenerate = !!b.regenerate || !props.length;
  if (regenerate && props.length >= MAX_ROUTES) throw new HttpError(409, L(`Vous avez déjà ${MAX_ROUTES} pistes : supprimez-en une pour en créer une nouvelle.`, `You already have ${MAX_ROUTES} routes: delete one to create a new one.`));
  if (!regenerate && !props.some((x) => x.id === b.proposalId)) throw new HttpError(404, L("Piste introuvable.", "Route not found."));
  if (one("SELECT 1 FROM jobs WHERE project_id = ? AND type = 'brand.logo' AND status IN ('queued','running','paused')", p.id)) throw new HttpError(409, L("Une création de logo est déjà en cours : attendez qu'elle se termine.", "A logo task is already running: wait for it to finish."));
  // En tâche de fond : avec l'IA, de nouvelles pistes prennent plusieurs minutes, plus que ce que tolèrent certains
  // relais (GitHub Codespaces coupe la requête et renvoie une page 404). L'écran suit la tâche et se met à jour à la fin.
  const job = enqueue({
    userId: user.id,
    projectId: p.id,
    type: "brand.logo",
    label: regenerate ? L("Nouvelles pistes de logo", "New logo routes") : L("Application du logo choisi", "Applying the chosen logo"),
    payload: { projectId: p.id, proposalId: b.proposalId ?? null, regenerate },
  });
  return ok({ jobId: job.id, proposals: list(p.id), current: currentId(p) });
});

/** Suppression d'une piste (la piste choisie se garde : choisissez-en d'abord une autre). */
export const DELETE = handle(async (req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  const pid = new URL(req.url).searchParams.get("proposal") ?? "";
  if (!latestProposals(p.id).some((x) => x.id === pid)) throw new HttpError(404, L("Piste introuvable.", "Route not found."));
  if (currentId(p) === pid) throw new HttpError(409, L("C'est la piste de votre logo actuel : choisissez d'abord une autre piste pour pouvoir la supprimer.", "This is your current logo's route: choose another route first to delete it."));
  removeProposal(p.id, pid);
  return ok({ proposals: list(p.id), current: currentId(p) });
});
