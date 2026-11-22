/**
 * LES MENTIONS OBLIGATOIRES POSÉES SEULES (rapport 10, point 12 et partie 5).
 *
 *  - « Images virtuelles » : une image qui montre un visage ou une silhouette produits par l'IA (ordonnance
 *    n° 2024-978 du 6 novembre 2024, au pluriel dans le texte en vigueur). Dans le Studio, cela n'arrive qu'avec la
 *    photo de la personne et son accord écrit ;
 *  - « Images retouchées » : un visage ou une silhouette fournis par le client, puis modifiés (affinés, épaissis,
 *    visage changé) ;
 *  - la mention IA d'une publicité quand une personne créée par l'IA y apparaît (règlement européen sur l'IA,
 *    article 50 : celui qui diffuse un hypertrucage le dit, il ne peut pas compter sur le seul marquage du fabricant).
 *
 * Savoir si un commerçant qui vend ses propres produits est visé par la loi de 2023 reste à faire confirmer par un
 * juriste ; poser la mention quand une personne créée apparaît est sans risque, donc le Studio la pose toujours. Le
 * client la trouve déjà en place. Module pur.
 */

export type Mention = "images_virtuelles" | "images_retouchees" | "ia_publicite";

export const MENTION_TEXTE: Record<Mention, readonly [string, string]> = {
  images_virtuelles: ["Images virtuelles", "Images virtuelles"],
  images_retouchees: ["Images retouchées", "Images retouchées"],
  ia_publicite: ["Personne créée par l'IA", "AI-generated person"],
};

/**
 * Ce que l'image montre : une personne CRÉÉE par l'IA (visage ou silhouette), ou une personne FOURNIE dont le visage
 * ou la silhouette a été modifié ; `publicite` : l'image sert une publicité.
 */
export function mentionsPour(o: { personneCreee?: boolean; personneFournieModifiee?: boolean; publicite?: boolean }): Mention[] {
  const m: Mention[] = [];
  if (o.personneCreee) m.push("images_virtuelles");
  if (o.personneFournieModifiee) m.push("images_retouchees");
  if (o.personneCreee && o.publicite) m.push("ia_publicite");
  return m;
}

/** Les mentions gardées dans les données d'une image (`meta.mentions`), seulement les connues. */
export function mentionsDe(meta: { mentions?: unknown } | null | undefined): Mention[] {
  const v = Array.isArray(meta?.mentions) ? meta!.mentions : [];
  return (v as unknown[]).filter((x): x is Mention => typeof x === "string" && x in MENTION_TEXTE);
}

/**
 * La légende avec ses mentions, posées à la fin sur leur propre ligne (« Images virtuelles. »), jamais en double. Les
 * mentions de la loi française restent en français, quelle que soit la langue de la légende (texte de la loi).
 */
export function legendeAvecMentions(caption: string, mentions: Mention[], lang: "fr" | "en" = "fr"): string {
  const textes = [...new Set(mentions)].map((m) => MENTION_TEXTE[m][lang === "en" ? 1 : 0]);
  const manque = textes.filter((t) => !caption.toLowerCase().includes(t.toLowerCase()));
  if (!manque.length) return caption;
  return `${caption.trimEnd()}\n\n${manque.map((t) => `${t}.`).join(" ")}`;
}
