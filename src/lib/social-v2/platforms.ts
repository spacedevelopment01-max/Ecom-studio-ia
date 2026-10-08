/**
 * Adaptateurs de plateformes (Social Engine V2). Un seul moteur, une fiche par réseau : formats, dimensions, durée
 * vidéo, légende, hashtags, liens, carrousels, miniatures, autorisations, limites d'API, et NIVEAU RÉEL de prise en
 * charge. Les règles de légende reprennent celles déjà utilisées par le calendrier (`NETWORK_RULES`).
 *
 * Niveaux (jamais confondus) :
 *  - `ready_to_connect` : publication par l'API officielle CODÉE (src/lib/social/publish.ts) mais jamais essayée sur
 *    un vrai compte — à vérifier en phase 9B ; devient « CONNECTÉ » pour un compte relié avec les bonnes autorisations ;
 *  - `export` : pas de publication directe depuis le studio ; texte et médias prêts à publier à la main ;
 *  - `unavailable` : aucun adaptateur.
 */
import { NETWORK_RULES } from "../engine/social-quality";
import { fold } from "../seo-v2/lang";

export const PLATFORMS = ["instagram", "facebook", "tiktok", "youtube", "pinterest", "linkedin"] as const;
export type Platform = (typeof PLATFORMS)[number];
export type SupportLevel = "ready_to_connect" | "export" | "unavailable";
export type PostFormat = "image" | "carousel" | "video" | "reel" | "story" | "short" | "pin" | "text";

export type PlatformSpec = {
  id: Platform;
  label: string;
  provider: string | null;
  level: SupportLevel;
  formats: PostFormat[];
  /** Format vidéo natif. */
  video: PostFormat | null;
  dims: Partial<Record<PostFormat, { w: number; h: number; aspect: string }>>;
  videoSeconds: { min: number; max: number } | null;
  captionMax: number;
  firstLine: number;
  hashtags: [number, number];
  /** Lien cliquable dans la légende. */
  linkInCaption: boolean;
  carouselMax: number;
  needsMedia: boolean;
  thumbnail: boolean;
  /** Autorisations OAuth nécessaires à la publication. */
  scopes: string[];
  /** Limites documentées par les plateformes (à confirmer en 9B, jamais présentées comme vérifiées). */
  limits: string[];
  /** Publications par jour au-delà desquelles le studio prévient (limite d'API ou bonne pratique), null si aucune connue. */
  perDayWarn: number | null;
};

const R = NETWORK_RULES;
export const PLATFORM_SPECS: Record<Platform, PlatformSpec> = {
  instagram: {
    id: "instagram",
    label: "Instagram",
    provider: "meta",
    level: "ready_to_connect",
    formats: ["image", "carousel", "reel", "story"],
    video: "reel",
    dims: { image: { w: 1080, h: 1350, aspect: "4:5" }, carousel: { w: 1080, h: 1350, aspect: "4:5" }, reel: { w: 1080, h: 1920, aspect: "9:16" }, story: { w: 1080, h: 1920, aspect: "9:16" } },
    videoSeconds: { min: 3, max: 90 },
    captionMax: R.instagram.max,
    firstLine: R.instagram.firstLine,
    hashtags: R.instagram.tags,
    linkInCaption: false,
    carouselMax: 10,
    needsMedia: true,
    thumbnail: true,
    scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
    limits: ["compte professionnel relié à une Page Facebook", "médias accessibles en HTTPS public (adresse publique du studio)", "limite de publications par 24 h et par compte fixée par Meta (50 annoncée)", "application Meta validée (App Review) pour la publication"],
    perDayWarn: 50,
  },
  facebook: {
    id: "facebook",
    label: "Facebook",
    provider: "meta",
    level: "ready_to_connect",
    formats: ["text", "image", "carousel", "video"],
    video: "video",
    dims: { image: { w: 1080, h: 1350, aspect: "4:5" }, carousel: { w: 1080, h: 1080, aspect: "1:1" }, video: { w: 1080, h: 1350, aspect: "4:5" } },
    videoSeconds: { min: 1, max: 240 },
    captionMax: R.facebook.max,
    firstLine: R.facebook.firstLine,
    hashtags: R.facebook.tags,
    linkInCaption: true,
    carouselMax: 10,
    needsMedia: false,
    thumbnail: false,
    scopes: ["pages_manage_posts", "pages_read_engagement", "pages_show_list"],
    limits: ["publication sur une Page (pas sur un profil personnel)", "application Meta validée pour pages_manage_posts", "limites de débit de l'API Graph"],
    perDayWarn: null,
  },
  tiktok: {
    id: "tiktok",
    label: "TikTok",
    provider: "tiktok",
    level: "ready_to_connect",
    formats: ["video"],
    video: "video",
    dims: { video: { w: 1080, h: 1920, aspect: "9:16" } },
    videoSeconds: { min: 3, max: 600 },
    captionMax: R.tiktok.max,
    firstLine: R.tiktok.firstLine,
    hashtags: R.tiktok.tags,
    linkInCaption: false,
    carouselMax: 1,
    needsMedia: true,
    thumbnail: false,
    scopes: ["video.publish", "video.upload"],
    limits: ["vidéos uniquement depuis le studio (photos : domaine vérifié requis)", "tant que l'application n'est pas auditée par TikTok : visibilité « moi uniquement »", "nombre de publications par jour plafonné par TikTok selon le créateur"],
    perDayWarn: 5,
  },
  youtube: {
    id: "youtube",
    label: "YouTube",
    provider: "youtube",
    level: "ready_to_connect",
    formats: ["short"],
    video: "short",
    dims: { short: { w: 1080, h: 1920, aspect: "9:16" } },
    videoSeconds: { min: 3, max: 180 },
    captionMax: R.youtube.max,
    firstLine: R.youtube.firstLine,
    hashtags: R.youtube.tags,
    linkInCaption: true,
    carouselMax: 1,
    needsMedia: true,
    thumbnail: true,
    scopes: ["https://www.googleapis.com/auth/youtube.upload"],
    limits: ["application non vérifiée par Google : mise en ligne en privé seulement", "quota quotidien de l'API (environ 6 mises en ligne par jour avec le quota par défaut)"],
    perDayWarn: 6,
  },
  pinterest: {
    id: "pinterest",
    label: "Pinterest",
    provider: "pinterest",
    level: "ready_to_connect",
    formats: ["pin"],
    video: "pin",
    dims: { pin: { w: 1000, h: 1500, aspect: "2:3" } },
    videoSeconds: { min: 4, max: 300 },
    captionMax: R.pinterest.max,
    firstLine: R.pinterest.firstLine,
    hashtags: R.pinterest.tags,
    linkInCaption: true,
    carouselMax: 1,
    needsMedia: true,
    thumbnail: true,
    scopes: ["pins:write", "boards:read"],
    limits: ["un tableau doit être choisi dans les connexions", "accès « Trial » : visibilité des épingles limitée tant que l'accès standard n'est pas accordé"],
    perDayWarn: null,
  },
  linkedin: {
    id: "linkedin",
    label: "LinkedIn",
    provider: null,
    level: "export",
    formats: ["text", "image", "carousel", "video"],
    video: "video",
    dims: { image: { w: 1200, h: 1200, aspect: "1:1" }, video: { w: 1080, h: 1350, aspect: "4:5" } },
    videoSeconds: { min: 3, max: 600 },
    captionMax: 3000,
    firstLine: 210,
    hashtags: [0, 3],
    linkInCaption: true,
    carouselMax: 9,
    needsMedia: false,
    thumbnail: false,
    scopes: [],
    limits: ["aucune connexion LinkedIn dans le studio : texte et médias prêts à publier à la main (export)"],
    perDayWarn: 2,
  },
};

export const platformSpec = (p: string): PlatformSpec => PLATFORM_SPECS[(PLATFORMS as readonly string[]).includes(p) ? (p as Platform) : "instagram"];

/** Format accepté par le réseau (le plus proche de celui demandé). */
export function nativeFormatFor(p: Platform, wanted: PostFormat): PostFormat {
  const s = PLATFORM_SPECS[p];
  if (s.formats.includes(wanted)) return wanted;
  const isVideo = ["video", "reel", "short"].includes(wanted);
  if (isVideo && s.video) return s.video;
  if (wanted === "carousel" && s.formats.includes("image")) return "image";
  if (wanted === "text") return s.formats.includes("image") ? "image" : s.formats[0];
  return s.formats[0];
}

export type AdaptInput = { caption: string; title: string; hashtags: string[]; link: string | null; format: PostFormat; mediaCount: number };
export type Adapted = AdaptInput & { notes: string[] };

/**
 * Adapte une publication à un réseau SANS dénaturer le message : format natif, longueur de légende (coupée sur une
 * phrase), nombre de hashtags, lien cliquable ou « lien en bio », nombre de médias d'un carrousel.
 */
export function adaptForPlatform(p: Platform, x: AdaptInput, lang: "fr" | "en" | "es" = "fr"): Adapted {
  const s = PLATFORM_SPECS[p];
  const notes: string[] = [];
  const format = nativeFormatFor(p, x.format);
  if (format !== x.format) notes.push(`format ${x.format} → ${format} (${s.label})`);
  let caption = x.caption.trim();
  // Lien : jamais collé là où il n'est pas cliquable.
  let link = x.link;
  if (link && !s.linkInCaption) {
    caption = caption.replace(link, "").trim();
    const bio = lang === "en" ? "Link in bio." : lang === "es" ? "Enlace en la bio." : "Lien en bio.";
    if (!fold(caption).includes(fold(bio).replace(/\.$/, ""))) caption = `${caption}\n\n${bio}`;
    link = null;
    notes.push("lien non cliquable sur ce réseau : « lien en bio »");
  }
  if (caption.length > s.captionMax) {
    const cut = caption.slice(0, s.captionMax);
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("\n"));
    caption = (end > s.captionMax * 0.5 ? cut.slice(0, end + 1) : cut).trim();
    notes.push(`légende raccourcie à ${s.captionMax} caractères`);
  }
  const tags = [...new Set(x.hashtags.map((h) => h.replace(/^#/, "").trim()).filter(Boolean))];
  const hashtags = tags.slice(0, s.hashtags[1]);
  if (tags.length > hashtags.length) notes.push(`${tags.length - hashtags.length} hashtag(s) retiré(s) (au plus ${s.hashtags[1]} sur ${s.label})`);
  const mediaCount = Math.min(x.mediaCount, format === "carousel" ? s.carouselMax : 1);
  if (mediaCount < x.mediaCount) notes.push(`médias limités à ${mediaCount}`);
  return { caption, title: x.title.slice(0, 100), hashtags, link, format, mediaCount, notes };
}

/** Avertissements de fréquence : au-delà des limites connues d'un réseau. */
export function frequencyWarnings(perDayByPlatform: Partial<Record<Platform, number>>): string[] {
  const out: string[] = [];
  for (const [p, n] of Object.entries(perDayByPlatform) as [Platform, number][]) {
    const w = PLATFORM_SPECS[p].perDayWarn;
    if (w != null && n > w) out.push(`${PLATFORM_SPECS[p].label} : ${n} publications par jour dépassent la limite connue (${w}) — certaines pourraient être refusées`);
  }
  return out;
}
