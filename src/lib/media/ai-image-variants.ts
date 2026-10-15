/**
 * Publications et publicités dont le visuel est entièrement fait par l'IA (meta.aiPost) : les textes font partie de
 * l'image, donc pas d'éditeur à calques. Deux chemins pour le client :
 *  - autre format GRATUIT : le studio place l'image entière (rien n'est coupé, textes compris) sur un fond tiré de
 *    l'image elle-même (flou et assombri), au format voulu ;
 *  - nouvelle version par l'IA (autre format recomposé et/ou modification demandée) : payante, prix annoncé avant,
 *    même produit ou service, même demande complétée par la modification (tâche image.ai_post).
 */
import sharp from "sharp";
import { assetData, assetMeta, getAsset, saveAsset } from "../library";
import type { CreativeSubject } from "../creative-subject";

export type ImageAspect = "1:1" | "4:5" | "9:16" | "16:9";
export const IMAGE_SIZES: Record<ImageAspect, { w: number; h: number }> = { "1:1": { w: 1080, h: 1080 }, "4:5": { w: 1080, h: 1350 }, "9:16": { w: 1080, h: 1920 }, "16:9": { w: 1920, h: 1080 } };

/** L'image entière au centre, sur un fond flou et assombri tiré d'elle-même (aucun pixel inventé, rien de coupé). */
export async function extendToAspect(src: Buffer, aspect: ImageAspect): Promise<Buffer> {
  const { w, h } = IMAGE_SIZES[aspect];
  const bg = await sharp(src).resize(w, h, { fit: "cover" }).blur(40).modulate({ brightness: 0.62, saturation: 0.9 }).toBuffer();
  const fg = await sharp(src).resize(w, h, { fit: "inside" }).png().toBuffer();
  return sharp(bg).composite([{ input: fg, gravity: "center" }]).png().toBuffer();
}

export const isAiImage = (meta: Record<string, any>) => !!meta?.aiPost && !meta?.aiPost?.issues;

/** Copie au format voulu (gratuit), rangée à côté de l'original, avec la même étiquette (sujet, demande, marque). */
export async function reformatAiImage(projectId: string, assetId: string, aspect: ImageAspect) {
  const a = getAsset(assetId);
  if (!a || a.project_id !== projectId || a.deleted_at || a.kind !== "image") return null;
  const meta = assetMeta<Record<string, any>>(a);
  if (!isAiImage(meta)) return null;
  const data = await extendToAspect(assetData(a), aspect);
  const { post: _post, ...rest } = meta;
  return saveAsset({
    projectId,
    userId: a.user_id,
    data,
    name: `${a.name.replace(/\.[a-z0-9]+$/i, "")}-${aspect.replace(":", "x")}.png`,
    mime: "image/png",
    role: a.role ?? (meta.aiAd ? "ad" : "social"),
    folderKey: meta.aiAd ? "images.ads" : "content.calendar",
    origin: "generated",
    status: "ready",
    sourceAssetId: a.id,
    meta: { ...rest, aspect, reformat: { from: a.id, method: "studio", fromAspect: meta.aspect ?? null } },
  });
}

/** Demande pour une nouvelle version IA : même sujet, demande d'origine complétée par la modification du client. */
export function redoRequest(meta: Record<string, any>, o: { aspect: ImageAspect; instruction?: string | null }) {
  const s = meta.aiPost?.subject as { kind: "product" | "service"; key: string } | null | undefined;
  const subject: CreativeSubject | undefined = s ? (s.kind === "service" ? { kind: "service", name: s.key } : { kind: "product", key: s.key }) : undefined;
  const request = [meta.aiPost?.request, o.instruction?.trim() ? `Modification demandée : ${o.instruction.trim()}` : null].filter(Boolean).join(". ").slice(0, 600) || undefined;
  return { as: meta.aiAd ? ("ad" as const) : ("post" as const), kind: meta.aiAd ? "ad" : undefined, format: o.aspect, subject, request };
}
