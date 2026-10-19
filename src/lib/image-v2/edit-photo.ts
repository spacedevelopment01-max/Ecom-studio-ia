/**
 * Retouche par l'IA d'une photo déjà livrée (publicité, publication) : le client écrit ce qu'il veut changer
 * (« ajoute des pétales sur la table », « lumière plus chaude »), la photo est envoyée telle quelle au modèle d'images
 * de l'usage « Publicités », et seule la demande est appliquée. Payant (forfait IA, accord demandé dans le studio) ;
 * l'image d'origine est gardée (nouvelle image liée à la première) : le client peut toujours revenir en arrière.
 */
import sharp from "sharp";
import { assetData, assetMeta, getAsset, saveAsset } from "../library";
import { editPhoto } from "../ai/media-providers";
import { UserFacingError, type JobContext } from "../jobs";
import { L } from "../i18n-server";

/** Format de génération le plus proche de la photo d'origine (le cadrage de la création reste valable). */
export function editAspect(width: number, height: number): "1:1" | "4:5" | "9:16" | "16:9" {
  const r = width / height;
  if (r > 1.2) return "16:9";
  if (r < 0.72) return "9:16";
  if (r < 0.9) return "4:5";
  return "1:1";
}

export async function editProjectPhoto(ctx: JobContext, projectId: string, assetId: string, instruction: string): Promise<{ assetId: string; sourceAssetId: string }> {
  const src = getAsset(assetId);
  if (!src || src.project_id !== projectId || src.deleted_at || !/^image\//.test(src.mime)) throw new UserFacingError(L("Photo introuvable dans ce projet.", "Photo not found in this project."));
  const ask = instruction.trim();
  if (ask.length < 3) throw new UserFacingError(L("Décrivez la modification souhaitée.", "Describe the change you want."));
  const recipe=assetMeta<Record<string,any>>(src);
  if (recipe.aiPost) {
    const { generateAiPostImage }=await import("../engine/ai-post-image");
    const { redoRequest }=await import("../media/ai-image-variants");
    const { nearestAspect }=await import("./formats");
    const dimensions=await sharp(assetData(src)).metadata();
    const req=redoRequest(recipe,{aspect:nearestAspect(dimensions.width??1080,dimensions.height??1350),instruction:ask});
    const out=await generateAiPostImage(ctx,projectId,{...req,sourceAssetId:src.id});
    return {assetId:out.assetId,sourceAssetId:src.id};
  }
  const data = assetData(src);
  const meta = await sharp(data, { failOn: "none" }).metadata();
  const aspect = editAspect(meta.width ?? 1, meta.height ?? 1);
  ctx.progress(20, L("Retouche de la photo par l'IA…", "AI is editing the photo…"));
  const img = await editPhoto({ userId: ctx.job.user_id, projectId, jobId: ctx.job.id, usageKey: `photo-edit:${ctx.job.id}` }, { image: data, instruction: ask, aspect, usage: "ad_visual" });
  // Même cadre que la photo d'origine (le recadrage enregistré dans la création reste juste).
  const out = await sharp(img).resize(meta.width ?? undefined, meta.height ?? undefined, { fit: "cover" }).jpeg({ quality: 92 }).toBuffer();
  const a = await saveAsset({
    projectId,
    userId: ctx.job.user_id,
    data: out,
    name: `${(src.name || "photo").replace(/\.[a-z0-9]+$/i, "")}-retouche.jpg`,
    mime: "image/jpeg",
    role: src.role ?? "ad",
    folderKey: "images.ads",
    origin: "generated",
    sourceAssetId: src.id,
    meta: { photoEdit: { from: src.id, instruction: ask.slice(0, 400) }, recipe: L(`Retouche demandée à l'IA : « ${ask.slice(0, 200)} »`, `Edit asked to the AI: "${ask.slice(0, 200)}"`) },
  });
  ctx.progress(100, L("Photo retouchée.", "Photo edited."));
  return { assetId: a.id, sourceAssetId: src.id };
}
