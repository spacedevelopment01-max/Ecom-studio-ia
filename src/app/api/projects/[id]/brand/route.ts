import { z } from "zod";
import { runForUser } from "@/lib/ai/access";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { loadProject, remember, saveBrand } from "@/lib/projects";
import { saveBrandGuide } from "@/lib/engine/brand";
import { generateLogos, hasClientLogo, recolorChosenRoute } from "@/lib/engine/identity";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { HttpError } from "@/lib/auth";
import { DIRECTIONS } from "@/lib/theme/directions";
import { L } from "@/lib/i18n-server";
import { brandIssues } from "@/lib/engine/brand-check";

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/);

/** Modifications manuelles de la marque et validation d'éléments. */
export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const owner = user.id;
  if (!p.brand) throw new HttpError(409, L("La marque n'est pas encore créée.", "The brand has not been created yet."));
  const b = await body(
    req,
    z.object({
      name: z.string().min(1).max(80).optional(),
      tagline: z.string().max(140).optional(),
      positioning: z.string().max(1000).optional(),
      audience: z.string().max(600).optional(),
      story: z.string().max(3000).optional(),
      tone: z.object({ voice: z.string(), do: z.array(z.string()), dont: z.array(z.string()) }).optional(),
      palette: z.object({ primary: hex, secondary: hex, accent: hex, light: hex, dark: hex }).optional(),
      /** La palette envoyée est celle affichée (cinq couleurs indépendantes), pas les couleurs d'origine. */
      paletteExact: z.boolean().optional(),
      direction: z.enum(DIRECTIONS.map((d) => d.id) as [string, ...string[]]).optional(),
      validate: z.array(z.string()).optional(),
      unvalidate: z.array(z.string()).optional(),
    }),
  );
  const brand = { ...p.brand } as any;
  for (const k of ["name", "tagline", "positioning", "audience", "story", "tone", "palette", "direction"] as const) {
    if (b[k] !== undefined) {
      brand[k] = b[k];
      if (k === "name") brand.nameStatus = "validated";
      remember(p.id, { kind: "decision", key: `marque.${k}`, value: typeof b[k] === "string" ? (b[k] as string) : JSON.stringify(b[k]), source: "user", scope: "brand" });
    }
  }
  brand.validated = [...new Set([...(brand.validated ?? []), ...(b.validate ?? [])])].filter((x: string) => !(b.unvalidate ?? []).includes(x));
  if (b.validate?.includes("logo")) brand.logo = { ...brand.logo, status: "validated" };
  // Points à vérifier recalculés sur la version du client (ses choix sont gardés, seulement signalés).
  brand.checks = brandIssues(brand, p, p.strategy).filter((i) => i.blocking).map((i) => i.message);
  saveBrand(p.id, brand);
  // Le logo suit le nom, la signature et la palette (sauf logo fourni par le client).
  const touchesLogo = (b.name !== undefined && b.name !== p.brand.name) || (b.tagline !== undefined && b.tagline !== p.brand.tagline) || (b.palette !== undefined && JSON.stringify(b.palette) !== JSON.stringify(p.brand.palette));
  // Un logo validé par le client n'est jamais remplacé en silence : il faut d'abord retirer sa validation.
  const logoLocked = brand.validated.includes("logo") || brand.logo?.status === "validated";
  // Seule la palette change et une piste est retenue : la même piste est recolorée et réappliquée partout
  // (logo, site, bannières, kit réseaux sociaux, charte), même si le logo est validé — c'est le client qui le demande.
  const paletteOnly = b.palette !== undefined && JSON.stringify(b.palette) !== JSON.stringify(p.brand.palette) && (b.name === undefined || b.name === p.brand.name) && (b.tagline === undefined || b.tagline === p.brand.tagline);
  // Exécuté « pour » le client : une IA éventuelle (nouvelles pistes, ligne éditoriale) respecte son forfait et son budget.
  const recolored = paletteOnly && !!brand.logo?.route ? await runForUser(owner, () => recolorChosenRoute(p.id, p.brand!.palette, { exact: !!b.paletteExact })) : false;
  const regenerate = !recolored && touchesLogo && !hasClientLogo(p.id) && !logoLocked;
  if (regenerate) await runForUser(owner, () => generateLogos(null, p.id));
  if (!recolored) await saveBrandGuide(p.id);
  return ok({ brand: loadProject(p.id).brand ?? brand, logoUpdated: regenerate || recolored, recolored, logoKept: touchesLogo && logoLocked && !recolored });
});

/** Nouvelle proposition de marque (les éléments validés sont conservés). */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ guidance: z.string().max(1000).optional() }));
  const job = enqueue({ userId: user.id, projectId: p.id, type: "brand.build", label: L("Nouvelle direction de marque", "New brand direction"), payload: { projectId: p.id, guidance: b.guidance } });
  return ok({ jobId: job.id });
});
