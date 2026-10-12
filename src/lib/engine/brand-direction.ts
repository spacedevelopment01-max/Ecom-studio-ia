/**
 * La marque suit la direction appliquée au site (galerie des thèmes, Boutique, discussion) : palette de la direction,
 * logo recoloré, charte mise à jour — sans IA. Les vraies couleurs du client restent gardées (« Vos couleurs ») et un
 * logo fourni par le client n'est jamais recoloré.
 */
import { loadProject, saveBrand } from "../projects";
import { lockedPalette } from "../theme/direction-palettes";
import type { DirectionId } from "../theme/directions";

export async function adoptDirection(projectId: string, direction: DirectionId): Promise<boolean> {
  const p = loadProject(projectId);
  const b = p.brand;
  if (!b || b.direction === direction) return false;
  const locked = lockedPalette(b, { direction, hasClientLogo: b.logo?.status === "provided" || !!p.settings.existingSite });
  const old = b.palette;
  saveBrand(projectId, { ...b, direction, ...(locked ?? {}) });
  if (!locked) return true;
  const { recolorChosenRoute } = await import("./identity");
  const recolored = await recolorChosenRoute(projectId, old, { exact: true });
  if (!recolored && b.logo?.engine === "v2" && !(b.validated ?? []).includes("logo") && b.logo.status !== "validated") {
    const { reapplyLogoV2 } = await import("../logo-v2/choose");
    await reapplyLogoV2(null, projectId).catch((e) => console.warn("[marque] logo aux couleurs de la direction", (e as Error).message));
  }
  if (!recolored) {
    const { saveBrandGuide } = await import("./brand");
    await saveBrandGuide(projectId);
  }
  return true;
}
