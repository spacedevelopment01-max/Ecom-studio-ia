/**
 * Les regards en image sur le thème monté (carte des spécialistes de SINA, lot 8, 13 novembre 2026 ; retour du
 * propriétaire du même jour devant un écran qui ne lui plaisait pas : « ça donne pas envie du tout »). Jusqu'ici,
 * les textes étaient relus et chaque photo contrôlée une à une, mais personne ne regardait la page finie.
 *
 * Après le montage à la marque, l'accueil et la page qui vend sont capturés sur téléphone par le Studio (gratuit),
 * puis regardés par un modèle qui voit, avec deux regards : une « cliente » qui arrive sans rien connaître (en cinq
 * secondes : je comprends ce qu'on vend, j'en ai envie, je sais où toucher), et un directeur artistique (c'est beau,
 * le rythme tient, rien de vide, de cassé ni en double). Rien n'est corrigé tout seul : ce qui ne va pas est écrit
 * dans le compte rendu du montage, et SINA le dit au client, qui décide. Sans navigateur ou si le regard échoue,
 * c'est dit : « pages non regardées ».
 */
import { z } from "zod";

/**
 * Lecture tolérante (essai réel du 16 novembre 2026 : « directeurArtistique.note » absent, tout le regard sautait et le
 * site partait sans avoir été regardé). Une note absente ou illisible vaut « inconnue » (null), jamais une note inventée ;
 * un avis trop long est coupé ; un problème mal formé est écarté seul ; le reste de l'avis est gardé.
 */
const note = z.preprocess((v) => (typeof v === "string" && v.trim() && Number.isFinite(Number(v.replace(",", "."))) ? Number(v.replace(",", ".")) : v), z.number().min(0).max(10).nullable().catch(null));
const oui = z.boolean().nullable().catch(null);
const avis = z.preprocess((v) => (typeof v === "string" ? v.slice(0, 500) : ""), z.string());
const part = <T extends z.ZodType>(shape: T) => z.preprocess((v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {}), shape);
export const LookSchema = z.object({
  cliente: part(z.object({ comprend: oui, envie: note, saitOuToucher: oui, avis })),
  directeurArtistique: part(z.object({ note, avis })),
  problemes: z.preprocess((v) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, 300)).filter((x) => x.length >= 6).slice(0, 6) : []), z.array(z.string())),
});
export type Look = z.infer<typeof LookSchema>;

/** Pages regardées : l'accueil et la page qui vend. Un appel par page. */
export const LOOK_PAGES_MAX = 2;
export const LOOK_CAP_MICRO = 60_000;
export const LOOK_TYPICAL_MICRO = 15_000;
/** En dessous de cette envie, la page est signalée comme « ne donne pas encore envie ». */
export const LOOK_MIN_DESIRE = 7;

export const LOOK_SYSTEM = `Tu regardes la capture d'une page d'un site sur téléphone, avant qu'elle soit montrée au client d'un studio qui crée des sites de vente. Tu décris seulement ce que tu vois réellement dans l'image. Deux regards, l'un après l'autre.

1. LA CLIENTE. Tu arrives sur cette page sans rien connaître de la marque, depuis ton téléphone. Dans les cinq premières secondes (le haut de l'image) : comprends-tu ce qu'on vend ? En as-tu envie (de 0 à 10) ? Sais-tu où toucher pour continuer ? Dis pourquoi en une ou deux phrases simples.
2. LE DIRECTEUR ARTISTIQUE. Est-ce beau et tenu, de haut en bas (de 0 à 10) ? Le texte se lit-il sur les images ? Le rythme tient-il (pas deux parties de même disposition à la suite) ? Rien n'est-il vide, cassé, coupé, mal aligné ou en double (la même photo deux fois) ? Reste-t-il une photo ou un texte d'exemple qui ne va pas avec la marque ?

problemes : ce qui doit être corrigé, du plus grave au moins grave, six au plus. Chaque ligne dit OÙ dans la page et QUOI, en une phrase précise (par exemple « ouverture : le titre passe sur le produit et se lit mal »). Vide si rien ne doit l'être.

Une page sobre peut donner envie : ne demande jamais d'en rajouter pour remplir. Tu ne juges pas les faits (prix, délais, promesses) : d'autres le font. Tu ne cites aucune autre marque.

Réponse : uniquement ce JSON, avec exactement ces clés (chaque note est un nombre de 0 à 10, jamais un texte) :
{"cliente":{"comprend":true,"envie":0,"saitOuToucher":true,"avis":"…"},"directeurArtistique":{"note":0,"avis":"…"},"problemes":["…"]}`;

export function lookPrompt(o: { brand: string; sells: string; page: string; concept?: string | null }): string {
  return [
    `Marque : « ${o.brand} ». Ce qu'elle vend : ${o.sells || "non précisé"}.`,
    o.concept ? `L'idée du site : ${o.concept}` : "",
    `Page regardée : ${o.page}, capturée sur téléphone, de haut en bas.`,
  ].filter(Boolean).join("\n");
}

/** envie, beau : null quand le regard n'a pas donné cette note (jamais une note inventée). */
export type LooksReport = { pages: { page: string; envie: number | null; beau: number | null; avis: string }[]; problemes: number };
/** Lignes du compte rendu pour une page regardée (au plus quatre problèmes par page). */
export function lookProblems(page: string, l: Look): string[] {
  const out = l.problemes.slice(0, 4).map((x) => `${page}, vue sur téléphone : ${x}`);
  if (l.cliente.comprend === false) out.unshift(`${page}, vue sur téléphone : on ne comprend pas en cinq secondes ce qui est vendu`);
  if (l.cliente.envie != null && l.cliente.envie < LOOK_MIN_DESIRE && !out.length) out.push(`${page}, vue sur téléphone : ne donne pas encore assez envie (${l.cliente.avis.slice(0, 160) || "sans raison donnée"})`);
  return out;
}
