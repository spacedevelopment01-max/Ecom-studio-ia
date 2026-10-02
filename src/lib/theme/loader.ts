import { assetData, getAsset } from "../library";
import type { AssetLoader } from "./compile";

/** Chargeur des médias de la bibliothèque pour la compilation du thème. */
export const libraryLoader: AssetLoader = (assetId) => {
  const a = getAsset(assetId);
  return a && !a.deleted_at ? { data: assetData(a), mime: a.mime, updated: a.created_at } : null;
};
