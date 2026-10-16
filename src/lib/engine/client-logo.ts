/**
 * Logo fourni par le client : le studio en tire les mêmes déclinaisons que pour un logo qu'il crée lui-même —
 * jamais une simple initiale à la place de son symbole, jamais des couleurs étrangères à son logo.
 *  - fond uni rendu transparent (le fichier d'origine est gardé tel quel) ;
 *  - symbole seul découpé dans le logo (sceau, motif, avatar, favicon) ; emblème indivisible : le logo entier en carré ;
 *  - versions fond sombre, une couleur, blanc ;
 *  - couleurs mesurées dans le logo = couleurs du client (gardées dans clientPalette, jamais effacées).
 * Sans IA, gratuit. Refait une seule fois par fichier (les déclinaisons pointent vers le fichier du client).
 */
import sharp from "sharp";
import { all } from "../db";
import { assetData, saveAsset, type Asset } from "../library";
import type { BrandPalette } from "../theme/directions";
import { C } from "../i18n-server";
import { onDarkVersion, oneColourVersion } from "../logo-v2/artwork";
import { artworkInks, artworkSymbol, knockoutBackground, paletteFromInks, squareMark, symbolFavicon } from "../logo-v2/identity";

export type ClientLogoSet = { mainId: string; lightId: string; markId: string; faviconId: string; palette: BrandPalette | null; symbolFromLogo: boolean };

export async function deriveClientLogo(projectId: string, userId: string, upload: Asset): Promise<ClientLogoSet> {
  const derived = (role: string) => all<Asset>("SELECT * FROM assets WHERE project_id = ? AND role = ? AND source_asset_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", projectId, role, upload.id)[0];
  const done = derived("logo");
  const png = done ? assetData(done) : await knockoutBackground(await sharp(assetData(upload)).png().toBuffer());
  const palette = paletteFromInks(await artworkInks(png)) as BrandPalette | null;
  if (done) {
    const light = derived("logo-light");
    const mark = derived("logo-mark");
    const fav = derived("favicon");
    if (light && mark && fav) return { mainId: done.id, lightId: light.id, markId: mark.id, faviconId: fav.id, palette, symbolFromLogo: !!mark.meta && JSON.parse(String(mark.meta)).symbolFromLogo === true };
  }
  const base = { projectId, userId, folderKey: "brand.logos", origin: "generated" as const, sourceAssetId: upload.id, meta: { fromClientLogo: true } };
  const main = done ?? (await saveAsset({ ...base, data: png, name: C("logo-principal.png", "logo-main.png"), mime: "image/png", role: "logo", status: "approved" }));
  const light = await saveAsset({ ...base, data: await onDarkVersion(png), name: C("logo-fond-sombre.png", "logo-dark-background.png"), mime: "image/png", role: "logo-light" });
  await saveAsset({ ...base, data: await oneColourVersion(png, "#111111"), name: C("logo-noir.png", "logo-black.png"), mime: "image/png", role: "logo-mono" });
  await saveAsset({ ...base, data: await oneColourVersion(png, "#FFFFFF"), name: C("logo-blanc.png", "logo-white.png"), mime: "image/png", role: "logo-white" });
  // Symbole découpé dans le logo du client ; à défaut (emblème indivisible, logotype seul), le logo entier en carré.
  const cut = await artworkSymbol(png);
  const symbol = cut ?? (await squareMark(png));
  const mark = await saveAsset({ ...base, data: symbol, name: C("symbole-seul.png", "symbol-only.png"), mime: "image/png", role: "logo-mark", meta: { fromClientLogo: true, symbolFromLogo: !!cut } });
  const fav = await saveAsset({ ...base, data: await symbolFavicon(symbol), name: "favicon.png", mime: "image/png", role: "favicon" });
  return { mainId: main.id, lightId: light.id, markId: mark.id, faviconId: fav.id, palette, symbolFromLogo: !!cut };
}
