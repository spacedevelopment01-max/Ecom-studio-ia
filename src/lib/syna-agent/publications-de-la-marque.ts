/**
 * Les trois publications de la marque finie deviennent les premières du calendrier (référence du propriétaire, partie 13 :
 * « ses publications deviennent les premières du calendrier » ; décision appliquée le 22 novembre 2026).
 *
 * Elles sont offertes : leurs images ont été créées et relues avec la marque (`brand-finish.ts`), rien n'est recréé et
 * aucun appel payant n'est fait ici. Chaque publication de la planche (son image relue et son texte) devient une
 * publication à publier sur chacun des réseaux du client qui prennent une image 4:5 (Instagram, Facebook), avec sa fin
 * de légende contrôlée (aucun ordre au lecteur, `fin-de-legende.ts`). Une image refusée à la relecture n'existe pas sur
 * la planche : elle n'est jamais mise au calendrier. Rien n'est jamais publié par le Studio : le client publie lui-même.
 */
import { one } from "../db";
import { getAsset } from "../library";
import type { Project } from "../projects";
import { createManualPost } from "../social-v2/manual";
import { adaptForPlatform, platformSpec, type Platform } from "../social-v2/platforms";
import type { Journey } from "./journey";
import { chosenRoute } from "./logos";

/** Les réseaux qui reçoivent telle quelle l'image 4:5 d'une publication de la planche. */
const RESEAUX_4_5 = ["instagram", "facebook"] as const;

/**
 * Les autres formats qu'un réseau prend tels quels pour une image du fil (en plus de celui de sa fiche, platforms.ts).
 * - Instagram : 1:1 (vérifié : documentation officielle de Meta pour la publication, référence ig-user/media,
 *   « Image Specifications » : « Aspect ratio: Must be within a 4:5 to 1.91:1 range », lue le 24 novembre 2026).
 * - Facebook : 1:1, NON VÉRIFIÉ par une page officielle pour une publication de page (seul le guide des publicités a été
 *   lu, qui donne le 4:5) ; décision du chef d'orchestre du 24 novembre 2026 : une image carrée s'affiche sans perte.
 * LinkedIn n'est pas au calendrier.
 */
const AUTRES_FORMATS_DU_FIL: Partial<Record<string, readonly string[]>> = { instagram: ["1:1"], facebook: ["1:1"] };

/** Les réseaux du calendrier qui peuvent recevoir une publication (ceux du Studio où le client publie lui-même). */
const RESEAUX_DU_CALENDRIER = ["instagram", "facebook", "tiktok", "youtube", "pinterest"] as const;
/**
 * Méthode des publications (24 novembre 2026) : une publication n'est offerte qu'aux réseaux de son format EXACT (1:1, 4:5
 * ou 9:16), en image ou en story ; jamais une image recadrée pour un autre format. Rend les réseaux et le format de chacun.
 */
export function reseauxDuFormat(aspect: string, networks: readonly string[]): { network: (typeof RESEAUX_DU_CALENDRIER)[number]; format: "image" | "story" }[] {
  const out: { network: (typeof RESEAUX_DU_CALENDRIER)[number]; format: "image" | "story" }[] = [];
  for (const n of RESEAUX_DU_CALENDRIER) {
    if (!networks.includes(n)) continue;
    const dims = platformSpec(n).dims;
    const f = (["image", "story"] as const).find((k) => dims[k]?.aspect === aspect || (k === "image" && (AUTRES_FORMATS_DU_FIL[n] ?? []).includes(aspect)));
    if (f) out.push({ network: n, format: f });
  }
  return out;
}
/** Le format exact d'une publication faite par la méthode (« 1:1 », « 4:5 », « 9:16 »), ou null pour une autre image. */
function formatDeLaMethode(assetId: string): string | null {
  const a = getAsset(assetId);
  if (!a) return null;
  try {
    const f = JSON.parse(String(a.meta ?? "{}"))?.publicationMethode?.formatFinal;
    return f === "1080x1080" ? "1:1" : f === "1080x1350" ? "4:5" : f === "1080x1920" ? "9:16" : null;
  } catch { return null; }
}

/** Les publications de la planche de la marque finie qui ont leur image relue, dans l'ordre de la planche. */
export function publicationsDeLaMarque(j: Journey): { index: number; text: string; assetId: string }[] {
  // La planche en vrai (25 novembre 2026) : ses trois publications refaites deviennent les premières du calendrier ; une
  // publication que l'inventaire juge incompréhensible pour un inconnu reste sur la planche, jamais au calendrier.
  const ev = j.plancheEnVrai?.publications;
  if (ev?.length) return ev.map((p, index) => ({ index, text: p.texte.trim(), assetId: p.comprehensible ? p.id : "" })).filter((p) => p.text && p.assetId);
  const x = chosenRoute(j);
  if (!x) return [];
  const images = x.board.images?.posts ?? [];
  return x.board.posts.map((post, index) => ({ index, text: post.text.trim(), assetId: images[index]?.id ?? "" })).filter((p) => p.text && p.assetId);
}

/** Identifiant stable d'une publication de la marque (une seule fois par projet, par publication et par réseau). */
export const idPublicationDeLaMarque = (projectId: string, index: number, network: string) => `marque-${projectId}-${index}-${network}`;

/**
 * Met les publications de la marque au rang des publications prêtes (offertes, sans appel payant), pour les réseaux du
 * client. Déjà faites : rien ne change. Renvoie ce qui a été ajouté et ce qui ne l'a pas été, avec la raison.
 */
export function offrirLesPublicationsDeLaMarque(p: Project, userId: string, j: Journey, networks: readonly string[]): { added: string[]; kept: string[]; notes: string[] } {
  const added: string[] = [], kept: string[] = [], notes: string[] = [];
  const posts = publicationsDeLaMarque(j);
  if (!posts.length) return { added, kept, notes };
  // Les publications faites par la méthode : chacune aux seuls réseaux de son format exact.
  if (posts.some((post) => formatDeLaMethode(post.assetId))) {
    for (const post of posts) {
      const aspect = formatDeLaMethode(post.assetId), a = getAsset(post.assetId);
      if (!aspect || !a || a.project_id !== p.id || a.deleted_at) { notes.push(`publication ${post.index + 1} de ta marque : image introuvable, elle n'est pas mise au calendrier`); continue; }
      const cibles = reseauxDuFormat(aspect, networks);
      if (!cibles.length) { notes.push(`la publication ${post.index + 1} de ta marque est en ${aspect} : aucun de tes réseaux ne prend ce format tel quel, elle n'est pas mise au calendrier`); continue; }
      for (const { network, format } of cibles) {
        const postId = idPublicationDeLaMarque(p.id, post.index, network);
        if (one("SELECT 1 FROM posts WHERE id=?", postId)) { kept.push(postId); continue; }
        const adapted = adaptForPlatform(network as Platform, { caption: post.text, title: post.text, hashtags: [], link: null, format, mediaCount: 1 });
        createManualPost(p, userId, { network, format, title: adapted.title.slice(0, 200), caption: adapted.caption, hashtags: "", media: [post.assetId] }, { postId, brief: { unit: `marque:${post.index}`, serie: "La marque", marque: true, offerte: true, ordre: post.index } });
        added.push(postId);
      }
    }
    return { added, kept, notes };
  }
  const nets = RESEAUX_4_5.filter((n) => networks.includes(n) && platformSpec(n).dims.image?.aspect === "4:5");
  if (!nets.length) { notes.push("les publications de ta marque sont en 4:5 : elles vont sur Instagram et Facebook, aucun de ces réseaux n'est choisi"); return { added, kept, notes }; }
  for (const post of posts) {
    const a = getAsset(post.assetId);
    if (!a || a.project_id !== p.id || a.deleted_at) { notes.push(`publication ${post.index + 1} de ta marque : image introuvable, elle n'est pas mise au calendrier`); continue; }
    for (const network of nets) {
      const postId = idPublicationDeLaMarque(p.id, post.index, network);
      if (one("SELECT 1 FROM posts WHERE id=?", postId)) { kept.push(postId); continue; }
      const adapted = adaptForPlatform(network as Platform, { caption: post.text, title: post.text, hashtags: [], link: null, format: "image", mediaCount: 1 });
      createManualPost(p, userId, { network, format: "image", title: adapted.title.slice(0, 200), caption: adapted.caption, hashtags: "", media: [post.assetId] }, { postId, brief: { unit: `marque:${post.index}`, serie: "La marque", marque: true, offerte: true, ordre: post.index } });
      added.push(postId);
    }
  }
  return { added, kept, notes };
}
