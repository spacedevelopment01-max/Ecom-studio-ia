import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { loadProject } from "@/lib/projects";
import { applyLogo, generateLogos, latestProposals, proposeTaglines } from "@/lib/engine/identity";
import { saveBrandGuide } from "@/lib/engine/brand";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { L } from "@/lib/i18n-server";

export const runtime = "nodejs";

const list = (projectId: string) =>
  latestProposals(projectId).map((a) => ({ id: a.id, key: a.info.key, label: a.info.label, concept: a.info.concept, url: `/api/files/${a.id}` }));

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
  const b = await body(req, z.object({ choice: z.enum(["logotype", "symbole", "embleme"]).optional(), regenerate: z.boolean().optional() }));
  if (b.regenerate || !latestProposals(p.id).length) await generateLogos(null, p.id, { choice: b.choice });
  else if (b.choice) {
    const pr = latestProposals(p.id).find((x) => x.info.key === b.choice);
    if (!pr) throw new HttpError(404, L("Proposition introuvable.", "Proposal not found."));
    await applyLogo(null, p.id, { key: pr.info.key, label: pr.info.label, concept: pr.info.concept, spec: pr.info.spec });
  }
  await saveBrandGuide(p.id);
  return ok({ proposals: list(p.id), current: loadProject(p.id).brand?.logo.proposal ?? null });
});
