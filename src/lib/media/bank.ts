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
