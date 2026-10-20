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
import { emptyClipDiag, findStockClip, type StockClipDiag } from "../stock/stock-clip";
import { placementRequest,type ThemePlacement } from "../theme/placement-request";
import { inventoryClientMedia } from "../theme/client-media";

export type BankAspect = "9:16" | "16:9";

/**
 * Pourquoi aucun plan n'a été retenu, dit simplement au client (jamais un échec muet) : clé Pixabay absente ou
 * coupée, banque injoignable, aucun résultat, plans écartés (personnes, hors sujet, refusés au contrôle).
 */
export function noClipMessage(d: StockClipDiag, topic: string, broad: boolean, silhouettes = false): string {
  const r = d.report;
  if (r.noKey) return L("Recherche impossible : aucune clé Pixabay active (Administration › Fournisseurs IA, clé gratuite). Importez vos vidéos en attendant.", "Search unavailable: no active Pixabay key (Administration › AI providers, free key). Upload your videos meanwhile.");
  if (!r.raw && r.errors.length) return L(`Pixabay ne répond pas pour le moment (${r.errors[0]}). Réessayez dans quelques minutes.`, `Pixabay isn't responding right now (${r.errors[0]}). Try again in a few minutes.`);
  if (!r.raw) return L(`Pixabay n'a aucune vidéo pour « ${topic} ». Essayez d'autres mots (en anglais, c'est souvent plus riche : ex. « escape room », « old key »).`, `Pixabay has no video for "${topic}". Try other words (e.g. "escape room", "old key").`);
  const why: string[] = [];
  if (d.people) why.push(L(`${d.people} avec des personnes (votre projet n'autorise pas les personnes${silhouettes ? "" : " ; cochez « Accepter les silhouettes » pour les plans de dos ou dans l'ombre"})`, `${d.people} showing people (your project doesn't allow people${silhouettes ? "" : "; tick \"Allow silhouettes\" for shots seen from behind or in shadow"})`));
  if (r.cartoon) why.push(L(`${r.cartoon} dessins animés, animations ou fonds verts`, `${r.cartoon} cartoons, animations or green screens`));
  if (r.tooShort) why.push(L(`${r.tooShort} trop courtes (moins de 4 s)`, `${r.tooShort} too short (under 4 s)`));
  if (d.offTopic) why.push(L(`${d.offTopic} hors sujet (mots-clés sans rapport avec « ${topic} » ni votre activité)`, `${d.offTopic} off-topic (keywords unrelated to "${topic}" or your business)`));
  if (d.rejected) why.push(L(`${d.rejected} refusées au contrôle de l'image`, `${d.rejected} refused by the image check`));
  return L(
    `Aucun plan retenu pour « ${topic} » : ${r.raw} vidéos trouvées sur Pixabay, écartées${why.length ? ` (${why.join(", ")})` : ""}. ${broad ? "Essayez d'autres mots ou importez vos propres vidéos." : "Cochez « Recherche élargie » ou essayez d'autres mots."}`,
    `No clip kept for "${topic}": ${r.raw} videos found on Pixabay, set aside${why.length ? ` (${why.join(", ")})` : ""}. ${broad ? "Try other words or upload your own videos." : "Tick \"Broader search\" or try other words."}`,
  );
}

/** Plans libres de droits sur un sujet (du métier ou de l'univers du produit) ; renvoie les plans ajoutés. */
export async function findBankClips(ctx: JobContext, projectId: string, r: { topic?: string; aspect: BankAspect; count: number; broad?: boolean; silhouettes?: boolean }) {
  const p = loadProject(projectId);
  // Le texte tapé par le client est cherché tel quel, en premier ; sans texte, le métier ou le produit.
  const typed = r.topic?.trim() || undefined;
  const topic = typed || [p.product.category, p.product.name].filter(Boolean).join(" — ") || p.name;
  const ids: string[] = [];
  const exclude = new Set<string>();
  const diag = emptyClipDiag();
  for (let i = 0; i < Math.min(3, Math.max(1, r.count)); i++) {
    ctx.progress(0.1 + (0.8 * i) / r.count, L("Recherche de plans libres de droits", "Searching royalty-free clips"));
    const got = await ctx.step(`stock-${i}`, () => findStockClip({ userId: p.userId, projectId, jobId: ctx.job.id }, p, { topic, typed, broad: r.broad, silhouettes: r.silhouettes, part: ["ambiance", "detail", "geste"][i % 3], aspect: r.aspect, durationS: 6, index: i, key: `${ctx.job.id}:bank:${i}` }, exclude, diag));
    if (got) ids.push(got.assetId);
    else break;
  }
  if (!ids.length) throw new UserFacingError(noClipMessage(diag, topic, !!r.broad, !!r.silhouettes));
  return { assetIds: ids };
}

/** Plan filmé par l'IA à partir d'une image de la banque. */
export async function createBankClip(ctx: JobContext, projectId: string, r: { imageId: string; prompt?: string; aspect: BankAspect;themePlacement?:ThemePlacement }) {
  const p = loadProject(projectId);
  const placement=r.themePlacement?placementRequest(projectId,r.themePlacement):null;
  if(placement&&(placement.request.kind!=="video"||!placement.request.referenceAssetIds.includes(r.imageId)||!(await inventoryClientMedia(p)).usable.some(a=>a.id===r.imageId)))throw new UserFacingError(L("La référence vidéo n’est plus utilisable. Actualisez sa préparation.","The video reference is no longer usable. Refresh preparation."));
  const img = getAsset(r.imageId);
  if (!img || img.project_id !== projectId || img.kind !== "image" || img.deleted_at) throw new UserFacingError(L("Image introuvable dans votre banque.", "Image not found in your bank."));
  const provider = videoProviderAvailable("product_video");
  if (!provider) throw new UserFacingError(L("La création de plans vidéo par l'IA n'est pas disponible pour le moment.", "AI video shot creation isn't available right now."));
  const people = placement?false:peopleAllowedFor(p);
  const prompt = `${placement?placement.request.request+'. ':''}${r.prompt?.trim() ? `${r.prompt.trim()}. ` : ""}Slow cinematic camera move on this exact image, natural light, subtle depth of field. Keep every object and place exactly as they are; no text, no logo, no new objects.${people ? "" : ` ${NO_PEOPLE_EN}`}`;
  const id = await ctx.step("ai-clip", async () => {
    ctx.progress(0.15, L("Le plan est filmé par l'IA", "The AI is filming the shot"));
    const buf = await aiClip(provider, { userId: p.userId, projectId, jobId: ctx.job.id, usageKey: `${ctx.job.id}:bank-clip` }, { image: assetData(img), prompt, aspect: r.aspect, usage: "product_video" }, (m) => ctx.progress(0.3, m));
    const a = await saveAsset({ projectId, userId: p.userId, data: buf, name: `${C("plan-ia", "ai-shot")}-${Date.now().toString(36)}.mp4`, mime: "video/mp4", role: "clip", folderKey: "videos.ads", origin: "generated", sourceAssetId: img.id, meta: { provider, recipe: L("Plan filmé par l'IA à partir d'une image de la banque (sans texte)", "Shot filmed by AI from a bank image (no text)"), aiGenerated: true,...(placement?{slot:`theme:video:${placement.plan.contextHash}:${placement.request.key}`,themeContent:{role:'video',description:placement.request.request,reviewed:false}}:{}) }, status: "review" });
    return a.id;
  });
  return { assetId: id };
}
