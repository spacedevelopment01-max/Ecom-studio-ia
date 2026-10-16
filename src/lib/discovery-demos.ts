/**
 * Studio Découverte : seuls des visuels sans défaut sont montrés. Pour certaines démonstrations, le propriétaire a
 * fixé la liste des fichiers gardés (ex. montre ARVEN : gabarits « Chronographe », montre coupée ou planche fautive
 * retirés). Tout autre fichier de ces démonstrations est masqué ; une rubrique sans visuel valable n'affiche rien
 * pour elle (pas de trou, pas d'image cassée, aucun gabarit à la place). Le manifeste n'est pas modifié (partagé
 * avec la page d'accueil).
 */
import type { Demo } from "@/components/landing-client";

/**
 * Fichiers gardés, par démonstration (nom de fichier sans extension : la copie WebP allégée d'un JPEG compte pour
 * le même fichier). « photo » : photo de départ du produit (entrée du client), entière, boucle visible.
 */
export const DISCOVERY_KEEP: Record<string, readonly string[]> = {
  montre: ["photo", "logo", "cutout-1", "packshot-1", "lifestyle-1", "publicite-ia-1"],
};

const stem = (src: string) => (src.split("/").pop() ?? "").replace(/(\.en)?\.[^.]+$/, "");

/** Le fichier peut-il être montré dans le studio Découverte ? */
export function discoveryAllows(demoId: string, src: string | null | undefined): boolean {
  if (!src) return false;
  const keep = DISCOVERY_KEEP[demoId];
  return !keep || keep.includes(stem(src));
}

/** Démonstration filtrée : chaque visuel non gardé est retiré (chaîne vide ou liste réduite). */
export function discoveryDemo(d: Demo): Demo {
  if (!DISCOVERY_KEEP[d.id]) return d;
  const ok = (src: string | undefined) => (discoveryAllows(d.id, src) ? (src as string) : "");
  return {
    ...d,
    photo: ok(d.photo),
    logo: ok(d.logo),
    shopDesktop: ok(d.shopDesktop),
    shopMobile: ok(d.shopMobile),
    video: ok(d.video),
    videoPoster: ok(d.videoPoster),
    shopVideo: d.shopVideo ? ok(d.shopVideo) || undefined : undefined,
    images: d.images.filter((im) => discoveryAllows(d.id, im.src)),
    posts: d.posts?.filter((p) => discoveryAllows(d.id, p)),
    board: d.board ? ok(d.board) || undefined : undefined,
  };
}

/** Démonstration complète pour l'onglet « Images et vidéos » (photo, boutique, téléphone, vidéo et 3 visuels). */
export const fullDemo = (d: Demo) => !!(d.photo && d.logo && d.shopDesktop && d.shopMobile && d.video && d.images.length >= 3);

/**
 * Étiquette « Photo fournie par le client » sur la photo de départ (décision du propriétaire), sauf quand cette photo
 * a elle-même été créée par l'IA pour la démonstration : l'étiquette serait alors fausse.
 */
export function startingPhotoIsClients(d: Demo): boolean {
  return !/photo d'origine créés par l'IA|photos de jardins ont été créées par l'IA|original photo created by AI|garden photos were created by AI/i.test(d.source?.note ?? "");
}
