/**
 * Banque de vidéos (onglet Vidéos) : plans NEUTRES, sans texte. Deux façons de la compléter :
 *  - plans libres de droits (Pixabay / Pexels), contrôlés comme dans les montages : gratuit ;
 *  - un plan filmé par l'IA à partir d'une image de la banque (image vers vidéo) : payant, prix annoncé avant,
 *    aucune personne ajoutée sans accord, plan rangé « à vérifier » jusqu'à la validation du client.
 */
import { assetData, getAsset, saveAsset } from "../library";
import { loadProject } from "../projects";
import { aiClip, videoProviderAvailable } from "../ai/media-providers";
import { NO_PEOPLE_EN, peopleAllowedFor } from "../people-policy";
import { UserFacingError, type JobContext } from "../jobs";
import { C, L } from "../i18n-server";
import { findStockClip } from "../stock/stock-clip";

export type BankAspect = "9:16" | "16:9";

/** Plans libres de droits sur un sujet (du métier ou de l'univers du produit) ; renvoie les plans ajoutés. */
export async function findBankClips(ctx: JobContext, projectId: string, r: { topic?: string; aspect: BankAspect; count: number }) {
  const p = loadProject(projectId);
  const topic = r.topic?.trim() || [p.product.category, p.product.name].filter(Boolean).join(" — ") || p.name;
  const ids: string[] = [];
  const exclude = new Set<string>();
  for (let i = 0; i < Math.min(3, Math.max(1, r.count)); i++) {
    ctx.progress(0.1 + (0.8 * i) / r.count, L("Recherche de plans libres de droits", "Searching royalty-free clips"));
    const got = await ctx.step(`stock-${i}`, () => findStockClip({ userId: p.userId, projectId, jobId: ctx.job.id }, p, { topic, part: ["ambiance", "detail", "geste"][i % 3], aspect: r.aspect, durationS: 6, index: i, key: `${ctx.job.id}:bank:${i}` }, exclude));
    if (got) ids.push(got.assetId);
  }
  if (!ids.length) throw new UserFacingError(L("Aucun plan libre de droits ne convient à ce sujet : précisez-le (ex. « atelier, mains sur l'établi ») ou importez vos propres vidéos.", "No royalty-free clip fits this subject: be more specific (e.g. \"workshop, tools on the bench\") or upload your own videos."));
  return { assetIds: ids };
}

/** Plan filmé par l'IA à partir d'une image de la banque. */
export async function createBankClip(ctx: JobContext, projectId: string, r: { imageId: string; prompt?: string; aspect: BankAspect }) {
  const p = loadProject(projectId);
  const img = getAsset(r.imageId);
  if (!img || img.project_id !== projectId || img.kind !== "image" || img.deleted_at) throw new UserFacingError(L("Image introuvable dans votre banque.", "Image not found in your bank."));
  const provider = videoProviderAvailable("product_video");
  if (!provider) throw new UserFacingError(L("La création de plans vidéo par l'IA n'est pas disponible pour le moment.", "AI video shot creation isn't available right now."));
  const people = peopleAllowedFor(p);
  const prompt = `${r.prompt?.trim() ? `${r.prompt.trim()}. ` : ""}Slow cinematic camera move on this exact image, natural light, subtle depth of field. Keep every object and place exactly as they are; no text, no logo, no new objects.${people ? "" : ` ${NO_PEOPLE_EN}`}`;
  const id = await ctx.step("ai-clip", async () => {
    ctx.progress(0.15, L("Le plan est filmé par l'IA", "The AI is filming the shot"));
    const buf = await aiClip(provider, { userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:bank-clip` }, { image: assetData(img), prompt, aspect: r.aspect, usage: "product_video" }, (m) => ctx.progress(0.3, m));
    const a = await saveAsset({ projectId, userId: p.userId, data: buf, name: `${C("plan-ia", "ai-shot")}-${Date.now().toString(36)}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "generated", sourceAssetId: img.id, meta: { provider, recipe: L("Plan filmé par l'IA à partir d'une image de la banque (sans texte)", "Shot filmed by AI from a bank image (no text)"), aiGenerated: true }, status: "review" });
    return a.id;
  });
  return { assetId: id };
}
