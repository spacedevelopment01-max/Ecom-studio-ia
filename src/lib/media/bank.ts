/**
 * Banque d'images et de vidéos du projet : médias NEUTRES, sans texte ni mise en page (photos du client, détourages,
 * photos libres de droits, scènes et images créées par l'IA, plans vidéo). Les publications, publicités et bannières
 * avec texte n'y figurent pas : elles vivent dans Publications et Publicités.
 */
export const BANK_IMAGE_ROLES = ["original", "cutout", "packshot", "packshot-v2", "detail", "scene", "lifestyle", "ambiance"] as const;
/** Plans vidéo (libres de droits, créés par l'IA, importés) : jamais les montages avec titres. */
export const BANK_VIDEO_ROLES = ["clip", "original"] as const;

export const isBankImage = (a: { kind: string; role: string | null }) => a.kind === "image" && (BANK_IMAGE_ROLES as readonly string[]).includes(a.role ?? "");
export const isBankVideo = (a: { kind: string; role: string | null }) => a.kind === "video" && (BANK_VIDEO_ROLES as readonly string[]).includes(a.role ?? "");

/**
 * Visuel PUBLICITAIRE (onglet Publicités) : création publicitaire (rôle « ad ») ou vidéo publicitaire (Video V2 de
 * type publicité, UGC). Jamais repris pour une publication organique, et inversement.
 */
export function isAdVisual(a: { kind: string; role: string | null; meta?: Record<string, any> | null }): boolean {
  if (a.role === "ad") return true;
  if (a.kind !== "video" || a.role !== "video") return false;
  const intent = a.meta?.videoV2?.intent;
  return intent === "video_ad" || intent === "ugc" || a.meta?.kind === "ugc";
}
/** Types de vidéo publicitaires (Video V2) ; les autres sont des vidéos organiques. */
export const AD_VIDEO_INTENTS = ["video_ad", "ugc"] as const;
