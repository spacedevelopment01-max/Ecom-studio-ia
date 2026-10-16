/**
 * Photos libres de droits (Pixabay, Pexels…) placées sur le site : le client est toujours prévenu dans le studio
 * (onglet Boutique et aperçu du studio, jamais sur le site publié) et peut les remplacer par sa propre photo ou
 * une image IA de sa bibliothèque. Choix du propriétaire : Pixabay reste permis sur les sites de services, mais
 * jamais en silence.
 */
import type { Asset } from "../library";
import { pick, type Lang } from "../i18n";
import type { ThemeSpec } from "./spec";

export type ThemeStockPhoto = {
  /** Nom du fichier dans le thème (le même partout où la photo apparaît). */
  file: string;
  assetId: string;
  /** Banque d'origine (« Pixabay », « Pexels »…). */
  source: string;
  author: string | null;
  page: string | null;
  /** Où la photo sert sur le site (ouverture, bannière, prestation…). */
  where: string;
  thumbUrl: string;
};

const SOURCE_NAME: Record<string, string> = { pixabay: "Pixabay", pexels: "Pexels", openverse: "Openverse" };
export const stockSourceName = (s: string) => SOURCE_NAME[s.toLowerCase()] ?? (s ? s.charAt(0).toUpperCase() + s.slice(1) : "Pixabay");

/** Libellé affiché sur chaque photo libre de droits du site (studio seulement). */
export const stockPhotoLabel = (source: string, lang: Lang) =>
  pick(lang, `Photo libre de droits (${stockSourceName(source)}), pas une image de votre activité`, `Royalty-free photo (${stockSourceName(source)}), not an image of your business`);

function whereLabel(meta: Record<string, any>, lang: Lang): string {
  const t = (fr: string, en: string) => pick(lang, fr, en);
  const slot = String(meta.slot ?? "");
  if (slot === "hero") return t("Ouverture du site", "Website opening");
  if (slot === "banner") return t("Bannière", "Banner");
  if (slot === "ad") return t("Image publicitaire du site", "Website ad image");
  if (slot.startsWith("service:") || meta.service) return meta.service ? t(`Prestation « ${meta.service} »`, `Service "${meta.service}"`) : t("Prestation", "Service");
  return t("Galerie et sections du site", "Website gallery and sections");
}

/** Photos libres de droits du thème (une entrée par fichier), dans l'ordre des fichiers. */
export function stockPhotosInTheme(spec: ThemeSpec, getAsset: (id: string) => Asset | undefined | null, lang: Lang): ThemeStockPhoto[] {
  if (spec.imported) return [];
  const out: ThemeStockPhoto[] = [];
  for (const [file, assetId] of Object.entries(spec.files)) {
    const a = getAsset(assetId);
    if (!a || a.deleted_at || a.kind !== "image") continue;
    let meta: Record<string, any> = {};
    try {
      meta = JSON.parse(a.meta || "{}");
    } catch {
      continue;
    }
    if (!meta.stock) continue;
    out.push({ file, assetId, source: stockSourceName(String(meta.stock.source ?? "")), author: meta.stock.author ?? null, page: meta.stock.page ?? null, where: whereLabel(meta, lang), thumbUrl: `/api/files/${a.id}${a.thumb_key ? "?thumb=1" : ""}` });
  }
  return out;
}

/**
 * Remplace la photo d'un fichier du thème par une autre image de la bibliothèque : le nom du fichier ne change pas,
 * donc la nouvelle image prend sa place partout où l'ancienne apparaissait (le format est converti à l'export).
 * Renvoie le thème modifié, ou une raison de refus.
 */
export function replaceThemeFile(spec: ThemeSpec, file: string, asset: Pick<Asset, "id" | "kind" | "deleted_at" | "status"> | null | undefined, lang: Lang): { spec: ThemeSpec } | { error: string } {
  const t = (fr: string, en: string) => pick(lang, fr, en);
  if (spec.imported) return { error: t("Thème importé : changez cette image dans l'éditeur de thème Shopify.", "Imported theme: change this image in the Shopify theme editor.") };
  if (!(file in spec.files)) return { error: t("Cette image n'est plus sur le site.", "This image is no longer on the website.") };
  if (!/\.(jpe?g|png|webp)$/i.test(file)) return { error: t("Seule une photo peut être remplacée ici.", "Only a photo can be replaced here.") };
  if (!asset || asset.deleted_at || asset.kind !== "image" || asset.status === "rejected") return { error: t("Choisissez une image de la bibliothèque du projet.", "Choose an image from the project library.") };
  const next: ThemeSpec = structuredClone(spec);
  next.files[file] = asset.id;
  return { spec: next };
}
