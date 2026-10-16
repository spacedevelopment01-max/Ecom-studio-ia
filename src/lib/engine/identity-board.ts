/**
 * Planche d'identité de marque du projet (rôle « brand-board ») : réunit le logo choisi, son symbole, la palette, les
 * typographies, des icônes du métier et les vraies photos du projet dans une seule grille cohérente
 * (voir `renderIdentityBoard`). Rendu local, sans IA : refaite à chaque changement de logo et à la demande.
 */
import { all } from "../db";
import { assetData, getAsset, saveAsset, type Asset } from "../library";
import { loadProject } from "../projects";
import { canvasFamily } from "../media/fonts";
import { searchIcons, tradeKeywords } from "../media/icon-library";
import { renderIdentityBoard } from "../media/identity-board";
import { effectivePalette } from "../route-palette";
import { directionById } from "../theme/directions";
import { C } from "../i18n-server";
import { isLocked } from "../brain/brand-locks";
import type { Brand } from "../project-types";

/** Signature écrite sur la planche : seulement une fois VALIDÉE par le client (même règle que le logo). */
export function boardTagline(brand: Brand | null | undefined): string | null {
  return brand && isLocked(brand, "tagline") && brand.tagline?.trim() ? brand.tagline.trim() : null;
}

const GENERIC = {
  products: ["truck", "shield-check", "gift", "heart", "leaf", "sparkles", "package", "star"],
  services: ["calendar", "map-pin", "phone", "clock", "shield-check", "message-circle", "star", "users"],
};

/** Six icônes au trait : celles du métier d'abord, puis des icônes utiles au client (livraison, rendez-vous…). */
export function boardIcons(text: string, business: "products" | "services"): string[] {
  // Une seule icône par famille (pas trois horloges « clock », « clock-hour-1 », « clock-hour-10 ») ; la montre
  // connectée (« device-watch ») est un objet du métier, les autres « device-… » non.
  const trade = searchIcons(tradeKeywords(text), 12)
    .filter((n) => !/^(file|folder|square|circle|box)-/.test(n) && !/^device-(?!watch$)/.test(n))
    .filter((n, i, all) => !all.slice(0, i).some((m) => n.startsWith(`${m}-`) || m.startsWith(`${n}-`) || n.split("-")[0] === m.split("-")[0]));
  return [...new Set([...trade.slice(0, 3), ...GENERIC[business]])].slice(0, 6);
}

export async function saveIdentityBoard(projectId: string): Promise<Asset | null> {
  const p = loadProject(projectId);
  const b = p.brand;
  if (!b) return null;
  const latest = (role: string, source?: string) =>
    all<Asset>(`SELECT * FROM assets WHERE project_id = ? AND role = ? AND deleted_at IS NULL ${source ? "AND source_asset_id = ?" : ""} ORDER BY created_at DESC LIMIT 1`, projectId, role, ...(source ? [source] : []))[0];
  const main = (b.logo.assetId ? getAsset(b.logo.assetId) : undefined) ?? latest("logo");
  if (!main) return null;
  // Symbole retenu pour la marque (découpé dans le logo du client ou de l'œuvre), sinon celui du logo principal.
  const mark = (b.logo.markAssetId ? getAsset(b.logo.markAssetId) : undefined) ?? latest("logo-mark", main.id) ?? null;
  const business = p.business === "services" ? "services" : "products";
  // Vraies photos du projet seulement (ambiances, mises en situation, photos de publications), jamais refusées.
  const photos = all<Asset>(
    "SELECT * FROM assets WHERE project_id = ? AND kind = 'image' AND role IN ('lifestyle','ambiance','scene','post-photo') AND deleted_at IS NULL AND status != 'rejected' ORDER BY created_at DESC LIMIT 8",
    projectId,
  );
  const cutout = business === "products" ? all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = 'cutout' AND deleted_at IS NULL AND status != 'rejected' ORDER BY created_at DESC LIMIT 1", projectId)[0] : undefined;
  const d = directionById(b.direction);
  const route = b.logo.route;
  const pal = effectivePalette(b) ?? b.palette;
  const text = [p.product.category, p.product.summary, p.product.sector ?? ""].join(" ");
  const png = await renderIdentityBoard({
    name: b.name,
    tagline: boardTagline(b),
    business,
    logo: assetData(main),
    mark: mark ? assetData(mark) : null,
    palette: pal,
    fonts: { heading: route?.heading ?? canvasFamily(b.fonts.heading ?? d.fonts.heading, "Cormorant"), body: route?.body ?? canvasFamily(b.fonts.body ?? d.fonts.body, "Jost"), headingWeight: route?.headingWeight },
    icons: boardIcons(text, business),
    photos: photos.map(assetData),
    product: cutout ? assetData(cutout) : null,
  });
  const prev = latest("brand-board");
  return saveAsset({ projectId, userId: p.userId, data: png, name: C("planche-identite.png", "identity-board.png"), mime: "image/png", role: "brand-board", folderKey: "brand.logos", origin: "generated", sourceAssetId: main.id, versionOf: prev ? prev.version_of ?? prev.id : null, meta: { engine: "identity-board" } });
}
