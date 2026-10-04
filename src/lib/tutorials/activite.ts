import type { TutorialDef } from "./types";

const tutorial: TutorialDef = {
  title: { fr: "Activité", en: "Business" },
  summary: {
    fr: "Décrire votre activité, vos prestations, votre zone, vos horaires et vos contacts : tout le site et vos contenus s'appuient sur ces informations.",
    en: "Describe your business, services, area, hours and contact details: the whole website and your content rely on this information.",
  },
  steps: [
    { fr: "Ce que vous écrivez ici est considéré comme confirmé et repris tel quel sur le site, dans les images et les publications.", en: "What you write here is treated as confirmed and used as is on the website, in images and in posts." },
    { fr: "Vérifiez le nom de l'activité, le métier et la présentation en une ou deux phrases.", en: "Check the business name, the trade and the one- or two-sentence introduction." },
    { fr: "« Ajouter une information » enregistre un fait réel : devis gratuit, années d'expérience, qualifications. Le studio n'invente rien.", en: "\"Add information\" records a real fact: free quotes, years of experience, qualifications. The studio makes nothing up." },
    { fr: "Vos prestations : un nom, une courte description, puis le prix et la durée, affichés seulement si vous les indiquez.", en: "Your services: a name, a short description, then the price and duration, shown only if you enter them." },
    { fr: "Zone, téléphone, e-mail et horaires sont repris dans l'en-tête, le pied de page et la page Contact du site.", en: "Area, phone, email and hours are used in the site's header, footer and Contact page." },
    { fr: "Choisissez comment vos clients vous contactent. Pour le rendez-vous en ligne, collez votre lien de réservation.", en: "Choose how customers get in touch. For online booking, paste your booking link." },
    { fr: "À droite, ce qui manque encore, et vos photos : réalisations, équipe, lieu. La première ouvre le site.", en: "On the right, what's still missing, and your photos: your work, team, premises. The first one opens the website." },
    { fr: "« Enregistrer » garde vos modifications. « Enregistrer et mettre à jour le site » recompose aussi le site, dans une nouvelle version.", en: "\"Save\" keeps your changes. \"Save and update the website\" also rebuilds the site, as a new version." },
  ],
  faq: [
    { q: { fr: "Le site affiche « à compléter ».", en: "The website shows \"to complete\"." }, a: { fr: "Une information essentielle manque (prestations, zone, téléphone ou e-mail, horaires, lien de rendez-vous). Remplissez-la ici, « Enregistrer », puis « Mettre à jour le site ».", en: "An essential detail is missing (services, area, phone or email, hours, booking link). Fill it in here, \"Save\", then \"Update the website\"." } },
    { q: { fr: "J'ai modifié mes prestations mais le site n'a pas changé.", en: "I changed my services but the website didn't change." }, a: { fr: "L'enregistrement ne touche pas au site déjà composé. Cliquez sur « Mettre à jour le site » : une nouvelle version est créée, la précédente reste restaurable dans l'onglet Site.", en: "Saving doesn't touch the site already built. Click \"Update the website\": a new version is created, and the previous one can be restored in the Website tab." } },
    { q: { fr: "Je ne veux pas afficher mes prix.", en: "I don't want to show my prices." }, a: { fr: "Laissez le champ « Prix (facultatif) » vide : rien ne s'affiche à la place.", en: "Leave the \"Price (optional)\" field empty: nothing is shown in its place." } },
  ],
};
export default tutorial;
