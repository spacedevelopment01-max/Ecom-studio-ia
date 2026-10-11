import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { HttpError, requireUser } from "@/lib/auth";
import { attachHiddenProject, NoFreeSubscription } from "@/lib/project-billing";
import { L } from "@/lib/i18n-server";

/**
 * Reprise d'un ancien projet de découverte (masqué) avec un abonnement payé encore libre : le projet redevient visible
 * et l'abonnement lui est rattaché définitivement — exactement comme une création de projet (1 abonnement = 1 projet).
 */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  const b = await body(req, z.object({ subscription: z.string().min(1).optional() }));
  try {
    if (!attachHiddenProject(user.id, id, b.subscription ?? null)) throw new HttpError(404, L("Projet introuvable.", "Project not found."));
  } catch (e) {
    if (e instanceof NoFreeSubscription) throw new HttpError(402, L("Chaque abonnement E-COM STUDIO IA est associé à un seul projet. Pour reprendre ce projet, choisissez un nouvel abonnement.", "Each E-COM STUDIO IA subscription is tied to a single project. To resume this project, choose a new subscription."), "subscription_required");
    throw e;
  }
  return ok({ id });
});
