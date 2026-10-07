import { z } from "zod";
import { HttpError } from "@/lib/auth";
import { body, handle, ok } from "@/lib/http";
import { loadProject } from "@/lib/projects";
import { ensureSocialVoice, latestSocialKit, saveSocialKit } from "@/lib/engine/social-kit";
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
  const { project: p } = await projectFromCtx(ctx);
  if (!p.brand) throw new HttpError(409, L("La marque n'est pas encore créée.", "The brand has not been created yet."));
  const b = await body(req, z.object({ voice: z.boolean().optional() }));
  if (b.voice) await ensureSocialVoice(p.id, { force: true, requestId: crypto.randomUUID() });
  const r = await saveSocialKit(p.id);
  if (!r) throw new HttpError(409, L("Choisissez d'abord une piste de logo : le kit en reprend les couleurs et les typographies.", "Choose a logo route first: the kit uses its colors and typefaces."));
  return ok(view(p.id));
});
