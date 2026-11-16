/**
 * La visite guidée du nouveau client, écrite une fois pour toutes (aucun appel à l'IA) : ce que SINA dit à chaque
 * arrêt, et combien d'étoiles de la constellation « Nouveau projet » s'allument pour le montrer.
 */

/** Les neuf étoiles d'un projet, telles que le client les lira dans son projet. */
export const ETOILES: [fr: string, en: string][] = [
  ["Faire connaissance", "Getting to know you"], ["La marque", "The brand"], ["Les angles", "The angles"], ["L'activité", "The business"], ["Le site", "The site"],
  ["La mise en ligne", "Going live"], ["La communication", "Communication"], ["La publicité", "Advertising"], ["Dans la durée", "Over time"],
];

/** La visite guidée : ce que SINA dit à chaque arrêt, et combien d'étoiles sont allumées pour le montrer. */
export const VISITE: { fr: string; en: string; allumees: number }[] = [
  { fr: "Bienvenue dans ton ciel. Ici, chaque projet est une constellation, et celle-ci attend le tien.", en: "Welcome to your sky. Here, every project is a constellation, and this one is waiting for yours.", allumees: 0 },
  { fr: "Regarde comment elle va naître : on commence par faire connaissance, puis je crée ta marque et je te propose trois angles.", en: "Watch how it will come to life: we start by getting to know each other, then I create your brand and suggest three angles.", allumees: 3 },
  { fr: "Ensuite ton activité, ton site et sa mise en ligne. Chaque étoile allumée est une partie de ton projet : tu y entres d'un clic.", en: "Then your business, your site and its launch. Each lit star is a part of your project: one click takes you in.", allumees: 6 },
  { fr: "Et je reste avec toi : tes publications, tes publicités, et le point de chaque mois.", en: "And I stay with you: your posts, your ads, and a review every month.", allumees: 9 },
  { fr: "Pour l'instant, elle est éteinte. Clique sur « Nouveau projet » pour l'allumer : c'est parti.", en: "For now, it is unlit. Click “New project” to light it up: off we go.", allumees: 0 },
];
