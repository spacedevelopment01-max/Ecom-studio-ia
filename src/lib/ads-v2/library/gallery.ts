/**
 * Galerie « Changer de modèle » du studio : la publication DU CLIENT (ses textes, sa photo, ses couleurs) rendue
 * dans chaque modèle de la bibliothèque et chaque composition du moteur, en miniatures ; puis application du modèle,
 * du schéma de couleurs et du traitement de photo choisis (nouvelle version, l'ancienne reste restaurable).
 * Local et gratuit : aucun appel à l'IA.
 */
import sharp from "sharp";
import { assetData, getAsset } from "../../library";
import { renderDocToBuffer } from "../../ad-doc/server";
import { docImages } from "../../ad-doc/store";
import type { AdDocument } from "../../ad-doc/types";
import { L } from "../../i18n-server";
import { restyleDoc } from "../compose";
import type { AdVariant } from "../art";
import { isTemplateLayout, templatesFor } from "./index";
import { TEMPLATE_FAMILIES, type TemplateFamily } from "./types";

/** Compositions du moteur proposées dans la galerie (famille « studio »). */
const ENGINE: [id: string, fr: string, en: string][] = [
  ["editorial", "Éditorial", "Editorial"],
  ["poster", "Affiche", "Poster"],
  ["panel", "Panneau de marque", "Brand panel"],
  ["frame", "Cadre sombre", "Dark frame"],
  ["lower", "Bas de page", "Lower third"],
  ["corner", "Coin élégant", "Elegant corner"],
  ["capsule", "Capsule", "Capsule"],
  ["tilt", "Carte inclinée", "Tilted card"],
  ["bigtype", "Titre géant", "Giant headline"],
  ["detail", "Loupe sur le détail", "Detail zoom"],
  ["glass", "Verre dépoli", "Frosted glass"],
];
export const GALLERY_FAMILIES = ["studio", ...TEMPLATE_FAMILIES] as const;
export type GalleryFamily = (typeof GALLERY_FAMILIES)[number];

const loader = (projectId: string) => (id: string) => {
  const a = getAsset(id);
  return a && a.project_id === projectId && !a.deleted_at ? assetData(a) : null;
};

/** Modèles d'une famille, chacun avec la miniature de la publication du client dans ce modèle. */
export async function styleGallery(projectId: string, doc: AdDocument, family: GalleryFamily) {
  const hasPhoto = doc.layers.some((l) => l.kind === "image" && l.role !== "logo" && l.role !== "product" && !!l.assetId);
  const items: { layout: string; name: string; family: string; schemes: string[]; treatments: string[] }[] =
    family === "studio"
      ? (hasPhoto ? ENGINE : ENGINE.slice(0, 0)).map(([id, fr, en]) => ({ layout: id, name: L(fr, en), family, schemes: [], treatments: ["natural", "punch", "warm", "cool", "mono", "moody", "duotone"] }))
      : templatesFor(hasPhoto).filter((t) => t.family === (family as TemplateFamily)).map((t) => ({ layout: `tpl:${t.id}`, name: L(t.name[0], t.name[1]), family: t.family, schemes: t.schemes, treatments: t.treatments ?? ["natural"] }));
  const load = loader(projectId);
  const out: (typeof items[number] & { preview: string | null; current: boolean })[] = [];
  for (const it of items) {
    let preview: string | null = null;
    try {
      const d = await restyleDoc(doc, { layout: it.layout, variant: isTemplateLayout(it.layout) ? {} : { treatment: undefined } }, load);
      if (d) {
        const jpg = await renderDocToBuffer(d, await docImages(projectId, d), "jpeg");
        preview = `data:image/jpeg;base64,${(await sharp(jpg).resize({ width: 300 }).jpeg({ quality: 72 }).toBuffer()).toString("base64")}`;
      }
    } catch {
      preview = null;
    }
    out.push({ ...it, preview, current: doc.meta.recipe?.layout === it.layout });
  }
  return out;
}

/** Applique un modèle (et/ou un schéma de couleurs, un traitement de photo) à la création. */
export async function applyStyle(projectId: string, doc: AdDocument, o: { layout?: string; variant?: AdVariant }) {
  const d = await restyleDoc(doc, o, loader(projectId));
  if (!d) return null;
  return { ...d, meta: { ...d.meta, source: "user" as const, createdFrom: doc.meta.createdFrom } };
}
