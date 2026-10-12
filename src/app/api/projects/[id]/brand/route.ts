import { z } from "zod";
import { assertThemeAllowed } from "@/lib/plan-gates";
import { runForUser } from "@/lib/ai/access";
import { recordBrandDecision } from "@/lib/brain/brand-locks";
import { body, handle, ok } from "@/lib/http";
import { enqueue } from "@/lib/jobs";
import { loadProject, remember, saveBrand } from "@/lib/projects";
import { saveBrandGuide } from "@/lib/engine/brand";
import { generateLogos, hasClientLogo, latestProposals, recolorChosenRoute } from "@/lib/engine/identity";
import { reapplyLogoV2 } from "@/lib/logo-v2/choose";
import { projectFromCtx, type Ctx } from "@/lib/route-helpers";
import { HttpError } from "@/lib/auth";
import { DIRECTIONS } from "@/lib/theme/directions";
import { lockedPalette } from "@/lib/theme/direction-palettes";
import { effectivePalette } from "@/lib/route-palette";
import { L } from "@/lib/i18n-server";
import { brandIssues } from "@/lib/engine/brand-check";
import { applyPaletteToSite } from "@/lib/workflow/propagation";

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
      /** « client » : revenir à ses vraies couleurs (site existant) ; « direction » : adopter la palette de la direction. */
      paletteMode: z.enum(["direction", "client"]).optional(),
      validate: z.array(z.string()).optional(),
      unvalidate: z.array(z.string()).optional(),
    }),
  );
  // Thème choisi pour la boutique : uniquement ceux du forfait du projet (l'actuel reste conservé).
  if (b.direction && b.direction !== p.brand.direction) assertThemeAllowed(p.id, b.direction, p.brand.direction ?? null);
  const brand = { ...p.brand } as any;
  // Palette verrouillée par la direction : elle ne se modifie pas à la main ; elle change avec la direction.
  const locked = lockedPalette(p.brand, { direction: b.direction, paletteMode: b.paletteMode, hasClientLogo: p.brand.logo?.status === "provided" || !!p.settings.existingSite });
  const same = (x: object, y: object | null) => !!y && JSON.stringify(Object.entries(x).sort()) === JSON.stringify(Object.entries(y).sort());
  if (!locked && b.palette && !same(b.palette, p.brand.palette) && !same(b.palette, effectivePalette(p.brand))) {
    throw new HttpError(409, L("Les couleurs sont celles de la direction choisie : pour changer de couleurs, choisissez une autre direction.", "The colors are those of the chosen direction: to change colors, choose another direction."), "palette_locked");
  }
  if (b.paletteMode === "client" && !p.brand.clientPalette) throw new HttpError(409, L("Aucune couleur de votre site n'est enregistrée.", "No colors from your website are saved."));
  if (locked) {
    Object.assign(brand, locked);
    b.palette = locked.palette;
    b.paletteExact = true;
  } else b.palette = undefined;
  for (const k of ["name", "tagline", "positioning", "audience", "story", "tone", "palette", "direction"] as const) {
    if (b[k] !== undefined) {
      brand[k] = b[k];
      if (k === "name") brand.nameStatus = "validated";
      remember(p.id, { kind: "decision", key: `marque.${k}`, value: typeof b[k] === "string" ? (b[k] as string) : JSON.stringify(b[k]), source: "user", scope: "brand" });
    }
  }
  // Palette changée par le client : c'est SA décision, elle est validée (un nouveau logo ou une reconstruction du site
  // ne la remplace plus par les couleurs mesurées dans le logo ou celles du style de boutique).
  const paletteChanged = b.palette !== undefined && JSON.stringify(b.palette) !== JSON.stringify(p.brand.palette);
  const autoValidate = paletteChanged && !locked && !(b.unvalidate ?? []).includes("palette") ? ["palette"] : [];
  brand.validated = [...new Set([...(brand.validated ?? []), ...(b.validate ?? []), ...autoValidate])].filter((x: string) => !(b.unvalidate ?? []).includes(x));
  if (b.validate?.includes("logo")) brand.logo = { ...brand.logo, status: "validated" };
  // Verrous posés ou levés par le client : décision mémorisée (l'état précédent reste dans l'historique).
  if (b.validate?.length || b.unvalidate?.length) recordBrandDecision(p.id, "verrous", [...brand.validated].sort().join(", ") || "aucun");
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
  const recolored = paletteOnly && !!brand.logo?.route ? await runForUser(owner, () => recolorChosenRoute(p.id, p.brand!.palette, { exact: !!b.paletteExact }), "normal", p.id) : false;
  const regenerate = !recolored && touchesLogo && !hasClientLogo(p.id) && !logoLocked;
  // Logo V2 appliqué : même direction reconstruite avec le nouveau nom et la palette (sans IA). Ancien projet avec des
  // pistes de l'ancien moteur : ses pistes sont mises à jour comme avant (compatibilité, aucune nouvelle génération).
  const v2 = regenerate && p.brand.logo?.engine === "v2" ? await runForUser(owner, () => reapplyLogoV2(null, p.id), "normal", p.id) : false;
  if (regenerate && !v2 && latestProposals(p.id).length) await runForUser(owner, () => generateLogos(null, p.id), "normal", p.id);
  if (!recolored) await saveBrandGuide(p.id);
  // Le site actuel prend la nouvelle palette tout de suite (sans IA, retouches conservées).
  const siteUpdated = paletteChanged ? await applyPaletteToSite(p.id).catch((e) => (console.warn("[brand] palette du site", (e as Error).message), false)) : false;
  return ok({ brand: loadProject(p.id).brand ?? brand, logoUpdated: v2 || (regenerate && latestProposals(p.id).length > 0) || recolored, recolored, siteUpdated, logoKept: touchesLogo && logoLocked && !recolored });
});

/** Nouvelle proposition de marque (les éléments validés sont conservés). */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { user, project: p } = await projectFromCtx(ctx);
  const b = await body(req, z.object({ guidance: z.string().max(1000).optional() }));
  const job = enqueue({ userId: user.id, projectId: p.id, type: "brand.build", label: L("Nouvelle direction de marque", "New brand direction"), payload: { projectId: p.id, guidance: b.guidance } });
  return ok({ jobId: job.id });
});
