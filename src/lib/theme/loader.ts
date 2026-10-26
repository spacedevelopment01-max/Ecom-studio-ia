import { assetData, getAsset } from "../library";
import type { AssetLoader } from "./compile";
import { one } from "../db";
import { assertAssetScope } from "../project-security";
import type { Asset } from "../library";

/** Chargeur des médias de la bibliothèque pour la compilation du thème. */
export const libraryLoader: AssetLoader = (assetId) => {
  const raw = one<Asset>("SELECT * FROM assets WHERE id=?", assetId);
  if (raw) assertAssetScope(raw);
  const a = getAsset(assetId);
  return a && !a.deleted_at ? { data: assetData(a), mime: a.mime, updated: a.created_at } : null;
};
