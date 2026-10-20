import {stateOf,blockers} from '@/lib/preparation/engine';
import { z } from "zod";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { DIRECTIONS } from "@/lib/theme/directions";
import { LANGUAGES, type LanguageId } from "@/lib/theme-v2/art-direction";
import { HttpError } from "@/lib/auth";
import { L } from "@/lib/i18n-server";
import { assertThemeAllowed } from "@/lib/plan-gates";
import { currentTheme } from "@/lib/projects";

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  if(stateOf(p.id) && blockers(p.id).length) throw new HttpError(409,L("Terminez la préparation du projet avant de composer le thème.","Complete project preparation before building the theme."));
  if (!p.brand) throw new HttpError(409, L("La marque doit être créée avant la boutique.", "The brand must be created before the store."));
  const b = await body(req, z.object({ direction: z.enum(DIRECTIONS.map((d) => d.id) as [string, ...string[]]).optional(), useAi: z.boolean().optional(), engine: z.enum(["v1", "v2"]).optional(), language: z.enum(LANGUAGES.map((l) => l.id) as [LanguageId, ...LanguageId[]]).optional() }));
  if(stateOf(p.id)&&!currentTheme(p.id)&&!b.direction)throw new HttpError(409,L("Choisissez d’abord un thème compatible dans la galerie.","First choose a compatible theme in the gallery."));
  // Thème de la bibliothèque : seuls ceux du forfait du projet (le thème déjà utilisé reste utilisable).
  if (b.direction) assertThemeAllowed(p.id, b.direction, currentTheme(p.id)?.spec.direction ?? null);
  const job = b.direction
    ? enqueue({ userId: user.id, projectId: p.id, type: "shop.direction", label: (() => { const name = DIRECTIONS.find((d) => d.id === b.direction)?.name ?? b.direction; return L(`Direction ${name}`, `${name} direction`); })(), payload: { projectId: p.id, direction: b.direction } })
    : enqueue({ userId: user.id, projectId: p.id, type: "shop.build", label: b.language ? L(`Site recomposé (${LANGUAGES.find((l) => l.id === b.language)!.label})`, `Website recomposed (${b.language})`) : L("Nouvelle composition de la boutique", "New store layout"), payload: { projectId: p.id, useAi: b.useAi, engine: b.engine, language: b.language } });
  return ok({ jobId: job.id });
});
