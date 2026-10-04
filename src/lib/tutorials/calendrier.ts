import type { TutorialDef } from "./types";

const tutorial: TutorialDef = {
  title: { fr: "Calendrier", en: "Calendar" },
  summary: {
    fr: "Voir toutes vos publications sur un calendrier, les changer de jour et en préparer plusieurs jours à l'avance.",
    en: "See all your posts on a calendar, move them to another day and prepare several days of posts in advance.",
  },
  steps: [
    { fr: "Le calendrier du mois : chaque publication est placée à son jour, avec son heure. La pastille de couleur indique le réseau.", en: "The month calendar: each post sits on its day, with its time. The colored dot shows the network." },
    { fr: "Les flèches changent de mois ; « Aujourd'hui » vous ramène à la date du jour.", en: "The arrows change the month; \"Today\" brings you back to the current date." },
    { fr: "Passez en vue « Semaine » ou « Jour » pour plus de détail. Cliquer sur le numéro d'un jour ouvre ce jour-là.", en: "Switch to \"Week\" or \"Day\" view for more detail. Clicking a day number opens that day." },
    { fr: "Cliquez sur une publication pour l'ouvrir et la modifier, comme dans l'onglet Publications.", en: "Click a post to open and edit it, just like in the Posts tab." },
    { fr: "Pour la changer de jour, glissez-la sur une autre case : elle garde son heure. Une publication déjà envoyée ne bouge plus.", en: "To change its day, drag it onto another square: it keeps its time. A post that has been sent can't be moved." },
    { fr: "En bas, la liste des statuts possibles : brouillon, à valider, programmé, publié, échec…", en: "At the bottom, the list of possible statuses: draft, to review, scheduled, published, failed…" },
    { fr: "« Préparer des publications » : choisissez le premier jour, le nombre de jours, combien par jour et à quelles heures.", en: "\"Prepare posts\": choose the first day, the number of days, how many per day and at what times." },
    { fr: "À droite, cochez les réseaux et leurs comptes, puis réglez la part de photos, de vidéos et de textes. Les publications arrivent ensuite « à valider ».", en: "On the right, tick the networks and their accounts, then set the share of photos, videos and text. The posts then arrive \"to review\"." },
    { fr: "« Règles d'automatisation » permet d'autoriser la programmation sans validation, réseau par réseau. Sans cela, vous validez tout vous-même.", en: "\"Automation rules\" lets you allow scheduling without approval, network by network. Otherwise, you approve everything yourself." },
  ],
  faq: [
    { q: { fr: "J'ai déplacé une publication programmée et elle n'est plus programmée.", en: "I moved a scheduled post and it's no longer scheduled." }, a: { fr: "C'est voulu : une publication programmée que l'on déplace doit être validée de nouveau. Ouvrez-la et cliquez sur « Valider et programmer ».", en: "That's intended: a scheduled post that is moved must be approved again. Open it and click \"Approve and schedule\"." } },
    { q: { fr: "Mes publications partiront-elles si j'éteins mon ordinateur ?", en: "Will my posts go out if I turn off my computer?" }, a: { fr: "Oui : une fois programmées (avec un compte connecté), elles partent à l'heure prévue, même navigateur fermé.", en: "Yes: once scheduled (with a connected account), they go out at the planned time, even with the browser closed." } },
    { q: { fr: "Les heures ne correspondent pas à mon pays.", en: "The times don't match my country." }, a: { fr: "Le fuseau horaire est indiqué sous le calendrier. Dans « Préparer des publications », le champ « Fuseau horaire » permet d'en choisir un autre.", en: "The time zone is shown below the calendar. In \"Prepare posts\", the \"Time zone\" field lets you choose another one." } },
  ],
};
export default tutorial;
