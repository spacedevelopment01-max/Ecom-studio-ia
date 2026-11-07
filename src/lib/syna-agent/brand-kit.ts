/**
 * Étape 3 du parcours SINA (#492) : IMAGE DE MARQUE COMPLÈTE, après le choix du logo (charte qualité § 2.5).
 *
 * Tout est rendu en local, sans IA (gratuit). Le choix du logo (chooseLogoV2) fabrique déjà les déclinaisons fidèles
 * (fond sombre, noir, blanc, symbole seul, version vectorielle quand le dessin s'y prête), la planche de marque et la
 * charte PDF. Ce module les rassemble, ajoute ce qui manquait (favicons 32 et 512 px, avatar rond des réseaux),
 * refait la planche ou la charte si elles manquent, et dit honnêtement ce qui n'a pas pu être fait.
 */
import sharp from "sharp";
import { createCanvas } from "@napi-rs/canvas";
import { contrast } from "../color";
import { canvasFamily, font } from "../media/fonts";
import { isDetailedSolidMark } from "../media/identity-board";
import { faithfulSvg } from "../logo-v2/artwork";
import { all } from "../db";
import { L } from "../i18n-server";
import { assetData, getAsset, saveAsset, type Asset } from "../library";
import { loadProject } from "../projects";
import { saveBrandBook } from "../engine/brand";
import { saveIdentityBoard } from "../engine/identity-board";

export type KitItem = { key: string; label: string; assetId: string; dark?: boolean; download?: boolean };
export type BrandKit = { items: KitItem[]; boardId: string | null; bookId: string | null; pageIds: string[]; notes: string[]; at: number };

/** Déclinaisons attendues (rôle de la bibliothèque → libellé montré au client). */
export const KIT_ROLES: { role: string; key: string; label: [string, string]; dark?: boolean; download?: boolean }[] = [
  { role: "logo", key: "logo", label: ["Logo principal", "Main logo"] },
  { role: "logo-light", key: "fond-sombre", label: ["Sur fond sombre", "On dark background"], dark: true },
  { role: "logo-mono", key: "noir", label: ["Une couleur (noir)", "One colour (black)"] },
  { role: "logo-white", key: "blanc", label: ["Une couleur (blanc)", "One colour (white)"], dark: true },
  { role: "logo-mark", key: "symbole", label: ["Symbole seul", "Symbol only"] },
  { role: "favicon-32", key: "favicon-32", label: ["Favicon 32 px", "Favicon 32 px"] },
  { role: "favicon-512", key: "favicon-512", label: ["Icône 512 px", "Icon 512 px"] },
  { role: "social-avatar", key: "avatar", label: ["Avatar des réseaux", "Social avatar"] },
  { role: "logo-svg", key: "svg", label: ["Logo vectoriel (SVG)", "Vector logo (SVG)"], download: true },
];

const latestOf = (projectId: string, role: string, source?: string) =>
  all<Asset>(`SELECT * FROM assets WHERE project_id = ? AND role = ? ${source ? "AND source_asset_id = ?" : ""} AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`, ...(source ? [projectId, role, source] : [projectId, role]))[0];

/** Favicon carré transparent, le symbole entier avec un peu d'air (rien de coupé). */
export async function faviconPng(mark: Buffer, size: number): Promise<Buffer> {
  const inner = Math.round(size * (size <= 32 ? 0.94 : 0.86));
  const pic = await sharp(mark).trim({ threshold: 8 }).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer().catch(() => sharp(mark).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer());
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: pic, gravity: "center" }]).png().toBuffer();
}

/**
 * Avatar des réseaux (1080 px, affiché en rond par les réseaux) : le symbole en couleurs d'origine, centré dans le
 * cercle visible, sur le fond clair de la marque — toujours lisible, jamais recoloré.
 */
export async function avatarPng(mark: Buffer, background: string, size = 1080): Promise<Buffer> {
  const inner = Math.round(size * 0.62); // carré inscrit dans le cercle, avec de l'air
  const pic = await sharp(mark).trim({ threshold: 8 }).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer().catch(() => sharp(mark).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer());
  return sharp({ create: { width: size, height: size, channels: 4, background } }).composite([{ input: pic, gravity: "center" }]).png().toBuffer();
}

/**
 * Favicon d'un logo trop détaillé pour 32 px (illustration en de nombreuses couleurs) : l'INITIALE de la marque, dans
 * sa police de titres, sur sa couleur de marque (carré arrondi), le texte dans la plus lisible de ses deux neutres.
 */
export function initialFavicon(name: string, palette: { primary: string; light: string; dark: string }, headingFamily: string, size: number): Buffer {
  const letter = (name.match(/\p{L}/u)?.[0] ?? "•").toLocaleUpperCase("fr-FR");
  const c = createCanvas(size, size);
  const ctx = c.getContext("2d");
  const r = size * 0.22;
  ctx.fillStyle = palette.primary;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, r);
  ctx.fill();
  ctx.fillStyle = contrast(palette.light, palette.primary) >= contrast(palette.dark, palette.primary) ? palette.light : palette.dark;
  ctx.font = font(headingFamily, 700, Math.round(size * 0.74));
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const m = ctx.measureText(letter);
  const dy = (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  ctx.fillText(letter, size / 2, size / 2 + dy);
  return c.toBuffer("image/png");
}

/** Construit (ou complète) l'image de marque du logo choisi. Gratuit, sans IA. */
export async function buildBrandKit(projectId: string): Promise<BrandKit> {
  const p = loadProject(projectId);
  const b = p.brand;
  const main = b?.logo.assetId ? getAsset(b.logo.assetId) : undefined;
  if (!b || !main || main.deleted_at) throw new Error(L("Aucun logo choisi : l'étape 2 doit être validée avant l'image de marque.", "No logo chosen yet (step 2)."));
  const notes: string[] = [];
  const derived = (role: string) => latestOf(projectId, role, main.id);
  const markAsset = (b.logo.markAssetId ? getAsset(b.logo.markAssetId) : undefined) ?? derived("logo-mark");
  const markData = markAsset ? assetData(markAsset) : assetData(main);
  if (!markAsset) notes.push(L("Pas de symbole séparé : le favicon et l'avatar reprennent le logo entier.", "No separate symbol: favicon and avatar use the whole logo."));
  const save = (role: string, name: string, data: Buffer) => saveAsset({ projectId, userId: p.userId, data, name, mime: "image/png", role, folderKey: "brand.logos", origin: "generated", sourceAssetId: main.id, meta: { engine: "syna-brand-kit" } });
  const detailed = await isDetailedSolidMark(markData).catch(() => false);
  if (detailed) {
    notes.push(L("Favicon 32 px : l'illustration est trop détaillée pour cette taille ; il reprend l'initiale de la marque, dans sa police et ses couleurs.", "32 px favicon: the illustration is too detailed; it uses the brand initial."));
    notes.push(L("Versions une couleur (noir, blanc) : une illustration aussi détaillée y perd ses détails ; à garder pour les usages où une seule couleur est imposée (tampon, gravure).", "One-colour versions lose the illustration's details."));
  }
  if (!derived("favicon-32")) await save("favicon-32", "favicon-32.png", detailed ? initialFavicon(b.name, b.palette, canvasFamily(b.fonts.heading, "Inter"), 32) : await faviconPng(markData, 32));
  if (!derived("favicon-512")) await save("favicon-512", "icone-512.png", await faviconPng(markData, 512));
  if (!derived("social-avatar")) await save("social-avatar", "avatar-reseaux.png", await avatarPng(markData, b.palette.light && b.palette.light !== "#000000" ? b.palette.light : "#FFFFFF"));
  if (!derived("logo-svg")) {
    // La VRAIE raison (essai réel : « dégradés et textures » était dit pour un lettrage en aplats).
    const why = await faithfulSvg(assetData(main)).then((r) => (r.ok ? null : r.reason)).catch(() => null);
    notes.push(why && /dégradés|nuances|texture|grain/.test(why)
      ? L("Pas de logo vectoriel (SVG) : le dessin a des nuances, des dégradés ou une texture, pas seulement des aplats ; un tracé vectoriel ne lui serait pas fidèle. Le logo est livré en PNG haute définition.", "No SVG: the drawing uses gradients and shading; delivered as high-resolution PNG.")
      : L("Pas de logo vectoriel (SVG) : le tracé automatique ne reproduit pas assez fidèlement ce dessin. Le logo est livré en PNG haute définition.", "No SVG: the automatic tracing is not faithful enough; delivered as high-resolution PNG."));
  }
  // Planche et charte : faites au choix du logo ; refaites seulement si elles manquent ou sont plus anciennes que lui.
  let board = latestOf(projectId, "brand-board");
  if (!board || board.created_at < main.created_at) board = (await saveIdentityBoard(projectId).catch((e) => { notes.push(L(`Planche de marque non refaite : ${(e as Error).message}`, "Brand board not rebuilt.")); return null; })) ?? board;
  let book = latestOf(projectId, "brand-book");
  if (!book || book.created_at < main.created_at) book = (await saveBrandBook(projectId).catch((e) => { notes.push(L(`Charte PDF non refaite : ${(e as Error).message}`, "Brand book not rebuilt.")); return null; })) ?? book;
  const pageIds = book ? all<{ id: string }>("SELECT id FROM assets WHERE project_id = ? AND role = 'brand-book-page' AND source_asset_id = ? AND deleted_at IS NULL ORDER BY created_at", projectId, book.id).map((x) => x.id) : [];
  if (!board) notes.push(L("Planche de marque absente.", "No brand board."));
  if (!book) notes.push(L("Charte PDF absente.", "No brand book."));
  const items: KitItem[] = [];
  for (const r of KIT_ROLES) {
    const a = r.role === "logo" ? main : r.role === "logo-mark" ? markAsset : derived(r.role);
    if (a) items.push({ key: r.key, label: L(r.label[0], r.label[1]), assetId: a.id, ...(r.dark ? { dark: true } : {}), ...(r.download ? { download: true } : {}) });
  }
  return { items, boardId: board?.id ?? null, bookId: book?.id ?? null, pageIds, notes, at: Date.now() };
}
