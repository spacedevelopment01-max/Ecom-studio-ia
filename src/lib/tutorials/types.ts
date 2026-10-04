/** Tutoriel vidéo d'un onglet du studio : textes affichés (sous-titres de la vidéo et guide écrit). */
export type Bi = { fr: string; en: string };
export type TutorialDef = {
  /** Titre court (« Onglet Boutique »). */
  title: Bi;
  /** Une phrase : à quoi sert l'onglet. */
  summary: Bi;
  /** Étapes dans l'ordre de la vidéo : chaque texte est le sous-titre affiché pendant l'étape (une ou deux phrases). */
  steps: Bi[];
  /** En cas de blocage : questions fréquentes propres à l'onglet. */
  faq?: { q: Bi; a: Bi }[];
};
