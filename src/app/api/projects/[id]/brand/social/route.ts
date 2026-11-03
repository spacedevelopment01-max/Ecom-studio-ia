import { z } from "zod";
import { runForUser, withAiDisabled } from "@/lib/ai/access";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { loadProject } from "@/lib/projects";
import { chosenRoute, ensureSocialVoice, latestSocialKit, saveSocialKit } from "@/lib/engine/social-kit";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { json } from "@/lib/db";
import { L } from "@/lib/i18n-server";

export const runtime = "nodejs";

const view = (projectId: string) => {
  const kit = latestSocialKit(projectId);
  const p = loadProject(projectId);
  return {
    kit: kit
      ? {
          sheet: `/api/files/${kit.sheet.id}`,
          zip: kit.zip ? `/api/files/${kit.zip.id}?download=1` : null,
          items: kit.items.map((a) => ({ id: a.id, item: json<any>(a.meta as any, {}).item, label: json<any>(a.meta as any, {}).label, url: `/api/files/${a.id}`, download: `/api/files/${a.id}?download=1`, width: a.width, height: a.height })),
        }
      : null,
    voice: p.brand?.social ?? null,
    route: p.brand?.logo.route ?? null,
  };
};

/** Kit réseaux sociaux de la marque (visuels, ZIP) et ligne éditoriale. */
export const GET = handle(async (_req: Request, ctx: Ctx) => {
  const { project: p } = await projectFromCtx(ctx);
  return ok(view(p.id));
});

/** Recrée le kit (piste retenue) ; `voice: true` refait aussi la ligne éditoriale. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  if (!p.brand) throw new HttpError(409, L("La marque n'est pas encore créée.", "The brand has not been created yet."));
  const b = await body(req, z.object({ voice: z.boolean().optional() }));
  // Same native kit prerequisite, checked before any optional editorial AI or brand mutation.
  if (!chosenRoute(p.id)) throw new HttpError(409, L("Choisissez d'abord une piste de logo : le kit en reprend les couleurs et les typographies.", "Choose a logo route first: the kit uses its colors and typefaces."));
  // Ces commandes natives restent gratuites à tous budgets : moteur local, sans nouvel appel fournisseur.
  // Le moteur initial partagé reste inchangé pour ses propres parcours autorisés.
  const r = await runForUser(user.id, async () => withAiDisabled("Native social kit and editorial redo are free local operations", async () => {
    if (b.voice) await ensureSocialVoice(p.id, { force: true, requestId: crypto.randomUUID() });
    return saveSocialKit(p.id);
  }), "normal", p.id);
  if (!r) throw new HttpError(409, L("Choisissez d'abord une piste de logo : le kit en reprend les couleurs et les typographies.", "Choose a logo route first: the kit uses its colors and typefaces."));
  return ok({ ...view(p.id), localOnly: true, providerCalls: 0, message: b.voice
    ? L("Ligne éditoriale recréée localement, sans IA ni consommation de crédit. Le kit gratuit est enregistré.", "Editorial line recreated locally, without AI or credit use. The free kit is saved.")
    : p.brand.social
      ? L("Kit recréé gratuitement et enregistré, sans IA. Votre ligne éditoriale acquise est conservée.", "Free kit recreated and saved without AI. Your acquired editorial line is preserved.")
      : L("Kit créé gratuitement et enregistré, avec une ligne éditoriale locale et sans IA.", "Free kit created and saved with a local editorial line and without AI.") });
});
