/**
 * Outils du Social Engine V2 — branchés sur les moteurs V2 EXISTANTS (aucun moteur reconstruit) :
 *  - images : Image Engine V2 (`runImageEngineV2`, recherche multisource puis génération seulement si permise) ;
 *  - créations promotionnelles : Advertising Engine V2 (`runAdEngineV2`, création composée à calques) ;
 *  - vidéos : Video & UGC Engine V2 (`runVideoEngineV2`, montage local ; plans générés seulement si permis) ;
 *  - rendu local gratuit : affiche à calques du moteur publicitaire (`composePoster`), photo validée + mise en page ;
 *  - publication : adaptateurs officiels existants (`publishPost`), JAMAIS appelés pendant les tests.
 * Injectables : les tests utilisent des outils simulés (aucun appel, aucune dépense, aucune publication).
 */
import crypto from "node:crypto";
import { JobCancelled, JobPaused, type JobContext } from "../jobs";
import { getAsset, saveAsset, type Asset } from "../library";
import { all, one } from "../db";
import type { Project } from "../projects";
import { composePoster, confirmedFeatures, savePosterDoc, type PosterAspect } from "../ads-v2/poster";
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
  local: (p: Project, post: PostBrief, o?: { background?: Asset | null }) => Promise<MediaResult>;
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

/**
 * Photos de fond possibles d'une publication (scènes, photos du métier, photos du client), déjà validées. Une
 * publication prend celle qui a le moins servi, pour que deux publications voisines ne se ressemblent pas.
 */
function backgroundFor(p: Project, seed: string): Asset | null {
  const pool = all<Asset & { uses: number }>(
    `SELECT a.*, (SELECT COUNT(*) FROM assets b WHERE b.project_id = a.project_id AND b.deleted_at IS NULL AND json_extract(b.meta, '$.poster.backgroundAssetId') = a.id) uses
       FROM assets a WHERE a.project_id = ? AND a.kind = 'image' AND a.deleted_at IS NULL AND a.status != 'rejected'
        AND a.role IN ('lifestyle', 'scene', 'ambiance', 'post-photo', 'original') ORDER BY a.created_at DESC LIMIT 24`,
    p.id,
  ).filter(isAutoUsable);
  if (!pool.length) return null;
  const min = Math.min(...pool.map((a) => a.uses));
  const least = pool.filter((a) => a.uses === min);
  return least[parseInt(crypto.createHash("sha256").update(seed).digest("hex").slice(0, 6), 16) % least.length];
}

const POSTER_ASPECT: Record<string, PosterAspect> = { "1:1": "1:1", "4:5": "4:5", "9:16": "9:16", "2:3": "2:3", "16:9": "16:9" };

/**
 * Affiche d'une publication (qualité agence) : photo pleine page + titre, marque, ligne et bouton, posés sur la zone
 * calme de la photo. Le document est enregistré : modifiable ensuite dans l'éditeur. Rendu local, gratuit.
 */
export async function posterForPost(p: Project, post: PostBrief, background: Asset | null, by: MediaBy, costMicro = 0): Promise<MediaResult> {
  const aspect = POSTER_ASPECT[aspectOf(post.network, post.format)] ?? "4:5";
  const cut = p.business === "services" ? null : (validCutouts(p.id)[0] ?? null);
  // Le produit réel est posé dans la scène quand la photo ne le montre pas déjà (photo d'ambiance, sans produit).
  const product = cut && (!background || background.role !== "scene") ? cut : null;
  const headline = (post.headline || post.title || p.brand?.tagline || p.brand?.name || p.name).slice(0, 70);
  const items = p.business === "services" ? (p.services?.services ?? []).map((x) => x.name.split(/\s+(?:et|and|&)\s+|,/i)[0].trim()).filter(Boolean).slice(0, 3) : [];
  const subline = items.length && items.join(" • ").length <= 48 ? items.join(" • ") : p.product.category || null;
  const r = await composePoster(p, { aspect, headline, subline, eyebrow: p.product.category || null, background, product, features: confirmedFeatures(p), seed: `post:${post.id}` });
  const a = await saveAsset({ projectId: p.id, userId: p.userId, data: r.jpg, name: `publication-${post.network}-${post.id.slice(0, 6)}.jpg`, mime: "image/jpeg", role: "social", folderKey: "content.calendar", origin: "generated", meta: { recipe: background ? "Affiche de publication (photo + mise en page à la marque)" : "Affiche typographique à la marque (rendu local, gratuit)", post: post.id, socialV2: true, poster: { docKey: r.docKey, layout: r.layout, backgroundAssetId: background?.id ?? null } } });
  savePosterDoc(p.id, r.docKey, r.doc, a.id);
  return { assetId: a.id, costMicro, by };
}

const fold = (x: string) => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Sujet de la photo d'une publication : TOUJOURS le métier ou le produit, plus la prestation dont parle la publication
 * (citée dans son titre ou son texte ; sinon une prestation de l'offre, à tour de rôle) et le sujet du message.
 * Une photo qui ne montre pas ce métier, ce service ou ce produit n'est jamais retenue (voir bestAdPhoto).
 */
export function photoTopic(p: Project, post: Pick<PostBrief, "id" | "title" | "caption" | "pillar">): string {
  const text = fold(`${post.title} ${post.caption} ${post.pillar ?? ""}`);
  if (p.business === "services") {
    const items = (p.services?.services ?? []).filter((x) => x.name?.trim());
    const cited = items.find((x) => text.includes(fold(x.name).split(/\s+/).filter((w) => w.length > 3).slice(0, 2).join(" ")) || text.includes(fold(x.name)));
    const n = parseInt(crypto.createHash("sha256").update(post.id).digest("hex").slice(0, 6), 16);
    const svc = cited ?? (items.length ? items[n % items.length] : null);
    const trade = p.product.category || p.product.name || p.name;
    return [trade, svc ? `${svc.name}${svc.description ? ` (${svc.description.slice(0, 100)})` : ""}` : null, post.title].filter(Boolean).join(" — ");
  }
  return [p.product.name, p.product.category, post.title].filter(Boolean).join(" — ");
}

/**
 * Rendu gratuit : d'abord LA photo libre (Pixabay d'abord) cherchée pour cette publication — en rapport avec le
 * produit ou le service et le sujet, jamais déjà utilisée, choisie pour faire une belle affiche ; sinon une photo
 * déjà validée du projet ; sinon une composition typographique à la marque.
 */
export async function localRender(p: Project, post: PostBrief, ctx: JobContext | null = null, o: { background?: Asset | null } = {}): Promise<MediaResult> {
  // Photo imposée (nombre d'images différentes atteint) : reprise telle quelle, autre texte et autre mise en page.
  if (o.background) return posterForPost(p, post, o.background, "local");
  const aspect = aspectOf(post.network, post.format);
  const { bestAdPhoto } = await import("../engine/service-media");
  const fresh = await bestAdPhoto({ userId: p.userId, projectId: p.id, jobId: ctx?.job.id ?? null }, p, { key: `post-${post.id}`, topic: photoTopic(p, post), aspect: aspect === "2:3" ? "4:5" : aspect, name: `publication-${post.network}-${post.id.slice(0, 6)}-photo.jpg` }).catch((e) => {
    if (e instanceof JobCancelled || e instanceof JobPaused) throw e;
    return null;
  });
  return posterForPost(p, post, fresh ?? backgroundFor(p, post.id), "local");
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
      if (!a || !isAutoUsable(a)) return { assetId: null, costMicro: r.costMicro, by: "image_v2", note: "aucune image validée par Image Engine V2" };
      // La photo (gardée dans la bibliothèque) devient le fond de l'affiche de la publication.
      return posterForPost(pp, post, a, "image_v2", r.costMicro);
    },
    async video(pp, post, o) {
      const { runVideoEngineV2 } = await import("../video-v2/engine");
      const r = await runVideoEngineV2(ctx, pp.id, { ask: { text: `${post.pillar ?? ""} : ${post.title}`, platform: PLATFORM_VIDEO[post.network] ?? "reels", aspect: aspectOf(post.network, post.format) === "4:5" ? "4:5" : "9:16", durationS: 15, allowGeneration: o.allowPaid }, approveGeneration: o.allowPaid, maxCostEur: o.maxCostEur });
      return { assetId: r.videoAssetId, costMicro: r.costMicro, by: "video_v2", note: r.videoAssetId ? undefined : r.reason };
    },
    async ad(pp, post, o) {
      if (!o.allowPaid) return localRender(pp, post, ctx);
      const { runAdEngineV2 } = await import("../ads-v2/engine");
      const r = await runAdEngineV2(ctx, pp.id, { count: 1, platforms: [PLATFORM_AD[post.network] ?? "meta_feed"], objective: post.objective, maxCostEur: o.maxCostEur });
      const out = r.outcomes.find((x) => x.assetId);
      return { assetId: out?.assetId ?? null, costMicro: r.costMicro, by: "ads_v2" };
    },
    local: (pp, post, o) => localRender(pp, post, ctx, o),
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
