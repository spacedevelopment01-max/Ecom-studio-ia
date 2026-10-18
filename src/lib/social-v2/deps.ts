import { usageExplicit } from "../ai/media-routing";
/**
 * Outils du Social Engine V2 — branchés sur les moteurs V2 EXISTANTS (aucun moteur reconstruit) :
 *  - images : Image Engine V2 (`runImageEngineV2`, recherche multisource puis génération seulement si permise) ;
 *  - créations promotionnelles : Advertising Engine V2 (`runAdEngineV2`, création composée à calques) ;
 *  - vidéos : Video & UGC Engine V2 (`runVideoEngineV2`, montage local ; plans générés seulement si permis) ;
 *  - rendu local gratuit : affiche à calques du moteur publicitaire (`composePoster`), photo validée + mise en page ;
 *  - publication : adaptateurs officiels existants (`publishPost`), JAMAIS appelés pendant les tests.
 * Injectables : les tests utilisent des outils simulés (aucun appel, aucune dépense, aucune publication).
 */
import { C } from "../i18n-server";
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
import { aiPostProbableMicro, estimateTaskMicro, capMicro, estimateMicro } from "../ai/estimate";
import { aiPostMaxMicro, textLayoutMaxMicro } from "../ai/media-providers";
import type { CreativeSubject } from "../creative-subject";

export type MediaBy = "library" | "local" | "image_v2" | "ads_v2" | "video_v2" | "ai_post";
/** `attempts` : essais payés pour obtenir ce visuel (plus d'un : la reprise est annoncée au client). */
export type MediaResult = { assetId: string | null; costMicro: number; by: MediaBy; note?: string; attempts?: number };
export type PostBrief = {
  id: string;
  network: string;
  format: string;
  title: string;
  caption: string;
  pillar: string | null;
  objective: string | null;
  headline: string;
  scheduled_at: number | null;
  /** Produit ou service choisi par le client (création guidée) ; absent : produit principal. */
  subject?: CreativeSubject | null;
  /** Demande libre du client pour ce visuel (création guidée). */
  request?: string | null;
};
export type MediaOpts = { allowPaid: boolean; maxCostEur: number };

export type SocialDeps = {
  /** IA active pour ce compte (forfait, budget, IA activée) : condition des générations payantes. */
  aiActive: boolean;
  image: (p: Project, post: PostBrief, o: MediaOpts) => Promise<MediaResult>;
  video: (p: Project, post: PostBrief, o: MediaOpts) => Promise<MediaResult>;
  ad: (p: Project, post: PostBrief, o: MediaOpts) => Promise<MediaResult>;
  /** Publication entièrement conçue par l'IA (scène, mise en page, textes, produit réel) ; absente : Image V2. */
  aiPost?: (p: Project, post: PostBrief, o: MediaOpts) => Promise<MediaResult>;
  /** Rendu local gratuit (visuel à la marque). */
  local: (p: Project, post: PostBrief, o?: { background?: Asset | null }) => Promise<MediaResult>;
  /** Réécriture IA d'une publication (réutilise la rédaction sociale existante, Router V2, budget du compte). */
  rewrite: (p: Project, post: PostBrief & { network: string; format: string }, instruction: string, key: string) => Promise<{ title: string; caption: string; hashtags: string[]; costMicro: number }>;
  /** PLAFOND (micro-euros) d'une production payante, vérifié avant l'envoi : reprises comprises, jamais montré comme prix. */
  estimate: (kind: SocialCostKind) => number;
  /** Coût PROBABLE (un essai) montré au client en % de son budget ; absent : le plafond. */
  probable?: (kind: SocialCostKind) => number;
};

export type SocialCostKind = "image" | "video" | "ad" | "rewrite" | "ai_post";

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
function backgroundFor(p: Project, seed: string, roles: string[] = ["lifestyle", "scene", "ambiance", "post-photo", "original"], productOnly = false, ownOnly = false): Asset | null {
  const pool = all<Asset & { uses: number }>(
    `SELECT a.*, (SELECT COUNT(*) FROM assets b WHERE b.project_id = a.project_id AND b.deleted_at IS NULL AND json_extract(b.meta, '$.poster.backgroundAssetId') = a.id) uses
       FROM assets a WHERE a.project_id = ? AND a.kind = 'image' AND a.deleted_at IS NULL AND a.status != 'rejected'
        AND a.role IN (${roles.map(() => "?").join(",")})${ownOnly ? " AND a.origin = 'upload'" : ""}
        -- Règle du propriétaire : jamais une photo libre de droits (banque du thème) en fond de publication.
        AND json_extract(a.meta, '$.stock') IS NULL ORDER BY a.created_at DESC LIMIT 24`,
    p.id,
    ...roles,
  ).filter((a) => isAutoUsable(a) && (!productOnly || !isPastedOnStock(a)));
  if (!pool.length) return null;
  const min = Math.min(...pool.map((a) => a.uses));
  const least = pool.filter((a) => a.uses === min);
  return least[parseInt(crypto.createHash("sha256").update(seed).digest("hex").slice(0, 6), 16) % least.length];
}

/** Photos qui montrent déjà le vrai produit (aucun collage nécessaire). */
const PRODUCT_PHOTO_ROLES = ["scene", "packshot", "lifestyle", "original", "detail"];

/**
 * Photo du client qui montre son produit en situation : envoyée par le client (jamais générée ni libre de droits),
 * sur un fond non uni (un packshot sur fond blanc n'en est pas une). La moins utilisée en premier.
 */
function ownScenePhoto(p: Project, seed: string): Asset | null {
  const pool = all<Asset & { uses: number }>(
    `SELECT a.*, (SELECT COUNT(*) FROM assets b WHERE b.project_id = a.project_id AND b.deleted_at IS NULL AND json_extract(b.meta, '$.poster.backgroundAssetId') = a.id) uses
       FROM assets a WHERE a.project_id = ? AND a.kind = 'image' AND a.deleted_at IS NULL AND a.status != 'rejected' AND a.origin = 'upload'
        AND a.role IN ('lifestyle', 'original') AND COALESCE(json_extract(a.meta, '$.triage.plain'), 0) = 0 AND COALESCE(json_extract(a.meta, '$.triage.kind'), 'situation') != 'packshot' AND json_extract(a.meta, '$.stock') IS NULL
      ORDER BY a.created_at LIMIT 24`,
    p.id,
  ).filter(isAutoUsable);
  if (!pool.length) return null;
  const min = Math.min(...pool.map((a) => a.uses));
  const least = pool.filter((a) => a.uses === min);
  return least[parseInt(crypto.createHash("sha256").update(seed).digest("hex").slice(0, 6), 16) % least.length];
}

/** Photo libre de droits sur laquelle le produit a été collé (décor d'une banque d'images) : jamais reprise en fond. */
export function isPastedOnStock(a: { meta?: string | null }): boolean {
  try {
    return !!(JSON.parse(a.meta || "{}") as { stock?: unknown }).stock;
  } catch {
    return false;
  }
}

const POSTER_ASPECT: Record<string, PosterAspect> = { "1:1": "1:1", "4:5": "4:5", "9:16": "9:16", "2:3": "2:3", "16:9": "16:9" };

/**
 * Affiche d'une publication (qualité agence) : photo pleine page + titre, marque, ligne et bouton, posés sur la zone
 * calme de la photo. Le document est enregistré : modifiable ensuite dans l'éditeur. Rendu local, gratuit.
 */
export async function posterForPost(p: Project, post: PostBrief, background: Asset | null, by: MediaBy, costMicro = 0): Promise<MediaResult> {
  const aspect = POSTER_ASPECT[aspectOf(post.network, post.format)] ?? "4:5";
  const cut = p.business === "services" ? null : (validCutouts(p.id)[0] ?? null);
  // Le produit réel n'est posé que sur le décor de studio de la marque (sans photo) : sur une photo, il n'est jamais
  // collé (une photo de produit le montre déjà ; une photo d'ambiance ne s'y prête pas : échelle et lumière fausses).
  const product = cut && !background ? cut : null;
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
 * Rendu gratuit : une photo du projet (jamais une photo libre de droits : celles-ci sont réservées au thème), sinon
 * une composition typographique à la marque.
 */
export async function localRender(p: Project, post: PostBrief, ctx: JobContext | null = null, o: { background?: Asset | null } = {}): Promise<MediaResult> {
  // Photo imposée (nombre d'images différentes atteint) : reprise telle quelle, autre texte et autre mise en page.
  if (o.background) return posterForPost(p, post, o.background, "local");
  // Boutique avec détourage validé : jamais le produit collé sur une photo d'intérieur qui ne le montre pas
  // (échelle, perspective et lumière fausses). Fond = une photo qui montre déjà le vrai produit (mise en scène du
  // studio, packshot, photo du client) ; sinon le produit posé sur le décor de studio de la marque, avec son ombre.
  // Produit détouré : trois publications sur cinq en affiche « produit héros » (le produit en grand dans un décor
  // dessiné à la marque), les autres sur une vraie photo du produit (packshot, mise en scène, photo d'origine).
  // Photos du client qui montrent le vrai produit en situation (fond non uni) : trois publications sur cinq les
  // mettent en page telles quelles — une vraie photo, avec sa vraie lumière, sans aucun collage.
  if (p.business !== "services") {
    const own = ownScenePhoto(p, post.id);
    const turnOwn = parseInt(crypto.createHash("sha256").update(`own:${post.id}`).digest("hex").slice(0, 6), 16) % 5;
    if (own && (turnOwn < 3 || !validCutouts(p.id).length)) return posterForPost(p, post, own, "local");
  }
  if (p.business !== "services" && validCutouts(p.id).length) {
    const hero = parseInt(crypto.createHash("sha256").update(`hero:${post.id}`).digest("hex").slice(0, 6), 16) % 5 < 3;
    return posterForPost(p, post, hero ? null : backgroundFor(p, post.id, PRODUCT_PHOTO_ROLES, true), "local");
  }
  // Produit sans détourage utilisable ni photo en situation du client : une publication sur deux montre quand même le
  // vrai produit (packshot, mise en scène, photo d'origine) au lieu d'un paysage libre de droits sans le produit.
  if (p.business !== "services" && parseInt(crypto.createHash("sha256").update(`prod:${post.id}`).digest("hex").slice(0, 6), 16) % 2 === 0) {
    const prod = backgroundFor(p, post.id, PRODUCT_PHOTO_ROLES, true);
    if (prod) return posterForPost(p, post, prod, "local");
  }
  // Entreprise de services avec ses propres photos : deux publications sur trois les montrent (rien ne vaut le vrai
  // salon, le vrai atelier) ; la troisième cherche une photo libre du métier.
  if (p.business === "services" && parseInt(crypto.createHash("sha256").update(`own:${post.id}`).digest("hex").slice(0, 6), 16) % 3 < 2) {
    const own = backgroundFor(p, post.id, ["lifestyle", "original", "scene", "post-photo"], false, true);
    if (own) return posterForPost(p, post, own, "local");
  }
  // Règle du propriétaire : les images libres de droits (Pixabay…) servent au thème, jamais aux publications. Sans
  // photo du projet : composition à la marque (typographie, formes, couleurs), sans photo.
  return posterForPost(p, post, backgroundFor(p, post.id), "local");
}

const PLATFORM_VIDEO: Record<string, "reels" | "tiktok" | "shorts" | "meta_feed"> = { instagram: "reels", tiktok: "tiktok", youtube: "shorts", facebook: "meta_feed", pinterest: "reels", linkedin: "meta_feed" };
const PLATFORM_AD: Record<string, "meta_feed" | "meta_story" | "tiktok" | "pinterest" | "linkedin"> = { instagram: "meta_feed", facebook: "meta_feed", tiktok: "tiktok", youtube: "meta_story", pinterest: "pinterest", linkedin: "linkedin" };

/** Essais au plus d'un visuel conçu par l'IA (règle du propriétaire : 3, puis version du studio). */
export const AI_POST_ATTEMPTS = 3;

/** PLAFOND d'une publication conçue par l'IA : trois essais au plus (image + contrôle) et l'accroche. Jamais montré comme prix (devis : `aiPostProbableMicro`). */
export function aiPostEstimate(): number {
  const one = aiPostMaxMicro(2,usageExplicit("text_layout")) ?? estimateMicro("image");
  return AI_POST_ATTEMPTS * (one + (usageExplicit("text_layout") ? textLayoutMaxMicro() ?? one : 0) + 2 * estimateTaskMicro("quality_control", { input: 24000, output: 2000 })) + estimateTaskMicro("copywriting", { input: 18000, output: 2000 });
}

export function realSocialDeps(ctx: JobContext | null, p: Project, aiActive: boolean): SocialDeps {
  return {
    aiActive,
    async image(pp, post, o) {
      // Images finales 100 % IA : la publication entière est créée par l'IA (plus d'affiche du studio sur une photo).
      if (!o.allowPaid) return { assetId: null, costMicro: 0, by: "image_v2", note: C("visuel non créé : les images finales sont créées par l'IA et la dépense n'est pas acceptée (aucun gabarit à la place)", "visual not created: final images are created by AI and the spend isn't approved (no template instead)") };
      return this.aiPost!(pp, post, o);
    },
    async video(pp, post, o) {
      const { runVideoEngineV2 } = await import("../video-v2/engine");
      const r = await runVideoEngineV2(ctx, pp.id, { ask: { text: `${post.pillar ?? ""} : ${post.title}`, platform: PLATFORM_VIDEO[post.network] ?? "reels", aspect: aspectOf(post.network, post.format) === "4:5" ? "4:5" : "9:16", durationS: 15, allowGeneration: o.allowPaid }, approveGeneration: o.allowPaid, maxCostEur: o.maxCostEur });
      return { assetId: r.videoAssetId, costMicro: r.costMicro, by: "video_v2", note: r.videoAssetId ? undefined : r.reason };
    },
    async ad(pp, post, o) {
      if (!o.allowPaid) return { assetId: null, costMicro: 0, by: "image_v2", note: C("visuel non créé : les images finales sont créées par l'IA et la dépense n'est pas acceptée (aucun gabarit à la place)", "visual not created: final images are created by AI and the spend isn't approved (no template instead)") };
      const { runAdEngineV2 } = await import("../ads-v2/engine");
      const r = await runAdEngineV2(ctx, pp.id, { count: 1, platforms: [PLATFORM_AD[post.network] ?? "meta_feed"], objective: post.objective, maxCostEur: o.maxCostEur });
      const out = r.outcomes.find((x) => x.assetId);
      return { assetId: out?.assetId ?? null, costMicro: r.costMicro, by: "ads_v2" };
    },
    async aiPost(pp, post, o) {
      if (!o.allowPaid) return { assetId: null, costMicro: 0, by: "image_v2", note: C("visuel non créé : les images finales sont créées par l'IA et la dépense n'est pas acceptée (aucun gabarit à la place)", "visual not created: final images are created by AI and the spend isn't approved (no template instead)") };
      const { designPostWithAi, realAiPostDeps } = await import("./ai-post");
      const { resolveSubject } = await import("../creative-subject");
      const a = aspectOf(post.network, post.format);
      const aspect = a;
      // Le produit (ou service) choisi par le client ; sinon le produit principal et sa photo de référence.
      const subject = resolveSubject(pp, post.subject);
      return designPostWithAi(pp, post, { aspect, maxCostEur: o.maxCostEur, reference: subject?.referenceAssetId ?? null, subject }, realAiPostDeps({ userId: pp.userId, projectId: pp.id, jobId: ctx?.job.id ?? null }));
    },
    local: (pp, post, o) => localRender(pp, post, ctx, o),
    async rewrite(pp, post, instruction, key) {
      const { aiRewritePost } = await import("../ai/tasks");
      const r = await aiRewritePost({ userId: pp.userId, projectId: pp.id, jobId: ctx?.job.id ?? null, usageKey: key }, pp, { network: post.network, format: post.format, caption: post.caption, title: post.title, angle: post.pillar ?? "" }, instruction);
      const c = one<{ c: number }>("SELECT COALESCE(SUM(cost), 0) c FROM ai_calls WHERE usage_key = ?", key)?.c ?? 0;
      return { ...r, costMicro: c };
    },
    // Estimations du studio (tarifs de l'administration, marge de sécurité comprise).
    estimate: (kind) => (kind === "video" ? capMicro(estimateMicro("video-clip")) : kind === "rewrite" ? capMicro(Math.round(estimateMicro("blog") / 20)) : kind === "ai_post" ? aiPostEstimate() : capMicro(estimateMicro("image"))),
    probable: (kind) => (kind === "video" ? estimateMicro("video-clip") : kind === "rewrite" ? Math.round(estimateMicro("blog") / 20) : kind === "ai_post" ? aiPostProbableMicro() : estimateMicro("image")),
  };
}
