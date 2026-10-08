/**
 * Outils du Social Engine V2 — branchés sur les moteurs V2 EXISTANTS (aucun moteur reconstruit) :
 *  - images : Image Engine V2 (`runImageEngineV2`, recherche multisource puis génération seulement si permise) ;
 *  - créations promotionnelles : Advertising Engine V2 (`runAdEngineV2`, création composée à calques) ;
 *  - vidéos : Video & UGC Engine V2 (`runVideoEngineV2`, montage local ; plans générés seulement si permis) ;
 *  - rendu local gratuit : compositeur du studio (`renderCreative` / `renderServiceCard`) ;
 *  - publication : adaptateurs officiels existants (`publishPost`), JAMAIS appelés pendant les tests.
 * Injectables : les tests utilisent des outils simulés (aucun appel, aucune dépense, aucune publication).
 */
import { loadImage } from "@napi-rs/canvas";
import type { JobContext } from "../jobs";
import { assetData, getAsset, saveAsset } from "../library";
import { one } from "../db";
import type { Project } from "../projects";
import { FORMATS, renderCreative, renderServiceCard, type FormatId } from "../media/compose";
import { brandTypo, latestAsset, palette } from "../engine/images";
import { validCutouts } from "../engine/cutouts";
import { isAutoUsable } from "../quality/usable";
import { publishPost, alreadyPublished, type Connection, type PostRow, type PublishResult } from "../social/publish";
import { platformSpec } from "./platforms";
import { estimateMicro } from "../ai/estimate";

export type MediaBy = "library" | "local" | "image_v2" | "ads_v2" | "video_v2";
export type MediaResult = { assetId: string | null; costMicro: number; by: MediaBy; note?: string };
export type PostBrief = { id: string; network: string; format: string; title: string; caption: string; pillar: string | null; objective: string | null; headline: string; scheduled_at: number | null };
export type MediaOpts = { allowPaid: boolean; maxCostEur: number };

export type SocialDeps = {
  /** IA active pour ce compte (forfait, budget, IA activée) : condition des générations payantes. */
  aiActive: boolean;
  image: (p: Project, post: PostBrief, o: MediaOpts) => Promise<MediaResult>;
  video: (p: Project, post: PostBrief, o: MediaOpts) => Promise<MediaResult>;
  ad: (p: Project, post: PostBrief, o: MediaOpts) => Promise<MediaResult>;
  /** Rendu local gratuit (visuel à la marque). */
  local: (p: Project, post: PostBrief) => Promise<MediaResult>;
  /** Réécriture IA d'une publication (réutilise la rédaction sociale existante, Router V2, budget du compte). */
  rewrite: (p: Project, post: PostBrief & { network: string; format: string }, instruction: string, key: string) => Promise<{ title: string; caption: string; hashtags: string[]; costMicro: number }>;
  /** Estimation prudente (micro-euros) d'une production payante, vérifiée avant l'envoi. */
  estimate: (kind: "image" | "video" | "ad" | "rewrite") => number;
};

/** Publication réelle : interface séparée (les tests en injectent une simulée). */
export type Publisher = {
  publish: (post: PostRow, c: Connection) => Promise<PublishResult>;
  /** Vérifie côté plateforme qu'une publication existe déjà (null : inconnu ou non vérifiable). */
  findExisting: (post: PostRow, c: Connection) => Promise<string | null>;
  /** La plateforme permet-elle de vérifier l'absence de doublon après un délai dépassé ? */
  canVerify: (provider: string) => boolean;
};

/**
 * Publication RÉELLE via les API officielles. Refusée dans l'environnement de test (aucun vrai compte ne doit
 * jamais recevoir une publication de test).
 */
export const realPublisher: Publisher = {
  async publish(post, c) {
    if (process.env.VITEST || process.env.SOCIAL_PUBLISH_DISABLED === "1") throw new Error("publication réelle désactivée dans cet environnement");
    return publishPost(post, c);
  },
  async findExisting(post, c) {
    if (process.env.VITEST || process.env.SOCIAL_PUBLISH_DISABLED === "1") return null;
    return alreadyPublished(post, c);
  },
  canVerify: (provider) => provider === "facebook" || provider === "instagram",
};

const aspectOf = (network: string, format: string): "1:1" | "4:5" | "9:16" | "2:3" | "16:9" => {
  const d = platformSpec(network).dims[format as keyof ReturnType<typeof platformSpec>["dims"]];
  return (d?.aspect as "1:1" | "4:5" | "9:16" | "2:3") ?? "4:5";
};
const formatId = (aspect: string): FormatId => (aspect === "9:16" ? "story" : aspect === "1:1" ? "square" : aspect === "2:3" ? "pin" : aspect === "16:9" ? "landscape" : "portrait");

/** Rendu local gratuit : produit détouré mis en page, sinon carte à la marque (photo réelle de l'activité si possible). */
export async function localRender(p: Project, post: PostBrief): Promise<MediaResult> {
  const fmt = FORMATS[formatId(aspectOf(post.network, post.format))];
  const cut = p.business === "services" ? undefined : validCutouts(p.id)[0];
  const logoAsset = latestAsset(p.id, "logo");
  const headline = (post.headline || post.title || p.brand?.name || p.name).slice(0, 40);
  let jpg: Buffer;
  if (cut) {
    const r = await renderCreative({ product: await loadImage(assetData(cut)), palette: palette(p), typo: brandTypo(p), format: fmt, layout: "editorial", headline, brand: p.brand?.name ?? p.name, logo: logoAsset ? await loadImage(assetData(logoAsset)) : null, seed: post.id.charCodeAt(0) + post.id.length });
    jpg = r.jpg;
  } else {
    jpg = await renderServiceCard({ palette: palette(p), typo: brandTypo(p), format: fmt, brand: p.brand?.name ?? p.name, title: headline });
  }
  const a = await saveAsset({ projectId: p.id, userId: p.userId, data: jpg, name: `publication-${post.network}-${post.id.slice(0, 6)}.jpg`, mime: "image/jpeg", role: "social", folderKey: "content.calendar", origin: "generated", meta: { recipe: "Visuel à la marque (rendu local, gratuit)", post: post.id, socialV2: true } });
  return { assetId: a.id, costMicro: 0, by: "local" };
}

const PLATFORM_VIDEO: Record<string, "reels" | "tiktok" | "shorts" | "meta_feed"> = { instagram: "reels", tiktok: "tiktok", youtube: "shorts", facebook: "meta_feed", pinterest: "reels", linkedin: "meta_feed" };
const PLATFORM_AD: Record<string, "meta_feed" | "meta_story" | "tiktok" | "pinterest" | "linkedin"> = { instagram: "meta_feed", facebook: "meta_feed", tiktok: "tiktok", youtube: "meta_story", pinterest: "pinterest", linkedin: "linkedin" };

export function realSocialDeps(ctx: JobContext | null, p: Project, aiActive: boolean): SocialDeps {
  return {
    aiActive,
    async image(pp, post, o) {
      const { runImageEngineV2 } = await import("../image-v2/engine");
      const r = await runImageEngineV2(ctx, pp.id, { kind: pp.business === "services" ? "trade_photo" : "social_image", support: "social", aspect: aspectOf(post.network, post.format), topic: `${post.pillar ?? ""} — ${post.title}`, allowGenerate: o.allowPaid, maxCostEur: o.maxCostEur, name: `publication-${post.network}` });
      const ok = r.outcomes.find((x) => x.assetId && (x.verdict === "FINAL" || x.verdict === "PROVISIONAL"));
      const a = ok?.assetId ? getAsset(ok.assetId) : undefined;
      return { assetId: a && isAutoUsable(a) ? a.id : null, costMicro: r.costMicro, by: "image_v2", note: a ? undefined : "aucune image validée par Image Engine V2" };
    },
    async video(pp, post, o) {
      const { runVideoEngineV2 } = await import("../video-v2/engine");
      const r = await runVideoEngineV2(ctx, pp.id, { ask: { text: `${post.pillar ?? ""} : ${post.title}`, platform: PLATFORM_VIDEO[post.network] ?? "reels", aspect: aspectOf(post.network, post.format) === "4:5" ? "4:5" : "9:16", durationS: 15, allowGeneration: o.allowPaid }, approveGeneration: o.allowPaid, maxCostEur: o.maxCostEur });
      return { assetId: r.videoAssetId, costMicro: r.costMicro, by: "video_v2", note: r.videoAssetId ? undefined : r.reason };
    },
    async ad(pp, post, o) {
      if (!o.allowPaid) return localRender(pp, post);
      const { runAdEngineV2 } = await import("../ads-v2/engine");
      const r = await runAdEngineV2(ctx, pp.id, { count: 1, platforms: [PLATFORM_AD[post.network] ?? "meta_feed"], objective: post.objective, maxCostEur: o.maxCostEur });
      const out = r.outcomes.find((x) => x.assetId);
      return { assetId: out?.assetId ?? null, costMicro: r.costMicro, by: "ads_v2" };
    },
    local: (pp, post) => localRender(pp, post),
    async rewrite(pp, post, instruction, key) {
      const { aiRewritePost } = await import("../ai/tasks");
      const r = await aiRewritePost({ userId: pp.userId, projectId: pp.id, jobId: ctx?.job.id ?? null, usageKey: key }, pp, { network: post.network, format: post.format, caption: post.caption, title: post.title, angle: post.pillar ?? "" }, instruction);
      const c = one<{ c: number }>("SELECT COALESCE(SUM(cost), 0) c FROM ai_calls WHERE usage_key = ?", key)?.c ?? 0;
      return { ...r, costMicro: c };
    },
    // Estimations du studio (tarifs de l'administration, marge de sécurité comprise).
    estimate: (kind) => (kind === "video" ? estimateMicro("video-clip") : kind === "rewrite" ? Math.round(estimateMicro("blog") / 20) : estimateMicro("image")),
  };
}
