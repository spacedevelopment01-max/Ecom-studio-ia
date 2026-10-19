/** Shared acceptance policy. A high mean never cancels a factual, identity or legibility defect. */
import { z } from "zod";
import sharp from "sharp";
import { FORMATS } from "../image-v2/formats";
import type { AspectId } from "../image-v2/types";
export const PUBLICATION_POLICY = "campaign-2";
export const QUALITY_CRITERIA = [
  "relevance",
  "hierarchy",
  "product",
  "identity",
  "text",
  "mobile",
  "lightMaterials",
  "artifacts",
  "diversity",
] as const;
const criterion = z.object({
  score: z.number().min(0).max(10),
  evidence: z.string().min(8),
});
export const PublicationGridSchema = z.object(
  Object.fromEntries(QUALITY_CRITERIA.map((k) => [k, criterion])) as Record<
    (typeof QUALITY_CRITERIA)[number],
    typeof criterion
  >,
);
export type PublicationGrid = z.infer<typeof PublicationGridSchema>;
export const qualityGridPasses = (g?: PublicationGrid) =>
  !!g &&
  QUALITY_CRITERIA.every(
    (k) => g[k].score >= 8 && g[k].evidence.trim().length >= 8,
  ) &&
  QUALITY_CRITERIA.reduce((n, k) => n + g[k].score, 0) /
    QUALITY_CRITERIA.length >=
    9;

/** Lossless deliverable; never stretch. Any trimming is planned in the prompt and inspected against the native image. */
export async function publicationRendition(native: Buffer, aspect: AspectId) {
  const f = FORMATS[aspect];
  if (!f)
    throw new Error(
      "Format de publication inconnu : aucune approximation silencieuse.",
    );
  const m = await sharp(native).rotate().metadata();
  const w = m.width ?? 0,
    h = m.height ?? 0;
  if (Math.min(w, h) < 768)
    throw new Error(
      `Résolution insuffisante (${w}×${h}) : image conservée, pas de FINAL.`,
    );
  const target = f.width / f.height,
    source = w / h;
  const kept = Math.min(target / source, source / target);
  if (kept < 0.6)
    throw new Error(
      "Le modèle n'a pas fourni un cadre compatible : recomposition nécessaire, pas de recadrage aveugle.",
    );
  const cw = Math.floor(Math.min(w, h * target)),
    ch = Math.floor(Math.min(h, w / target));
  if (Math.max(f.width / cw, f.height / ch) > 1.34)
    throw new Error(
      "Définition native insuffisante pour ce format : aucune netteté artificiellement certifiée.",
    );
  const crop = {
    left: Math.floor((w - cw) / 2),
    top: Math.floor((h - ch) / 2),
    width: cw,
    height: ch,
  };
  const data = await sharp(native)
    .rotate()
    .extract(crop)
    .resize(f.width, f.height, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();
  return {
    data,
    dimensions: { width: f.width, height: f.height },
    native: { width: w, height: h },
    crop,
    kept,
    scale: Math.max(f.width / cw, f.height / ch),
    adapted: Math.abs(target / source - 1) > 0.003,
  };
}
export function formatPlan(aspect: AspectId) {
  const f = FORMATS[aspect];
  if (!f) throw new Error("Format inconnu");
  return `DELIVERY ${f.width}×${f.height}, ratio ${aspect}. Compose for this ratio, never stretch. If the model returns a wider/taller native canvas, keep ALL essential text/logo/product inside the centered ${aspect} rectangle (only expendable outer background may be trimmed). Keep 8% outer safe margins; for 9:16 reserve top 14% and bottom 20% for platform UI. Full native and final crop will be checked side by side, including text at 360px phone width. Avoid excessive compression, oversharpening and fine illegible lettering.`;
}
