import type { TutorialDef } from "./types";

const tutorial: TutorialDef = {
  title: { fr: "Publications", en: "Posts" },
  summary: {
    fr: "Relire, corriger et valider vos publications pour les réseaux sociaux avant qu'elles partent à l'heure prévue.",
    en: "Review, correct and approve your social media posts before they go out at the planned time.",
  },
  steps: [
    { fr: "Ici arrivent les publications préparées depuis le Calendrier. Les filtres du haut les trient par statut, avec leur nombre.", en: "Posts prepared from the Calendar arrive here. The filters at the top sort them by status, with their count." },
    { fr: "Chaque ligne montre le réseau, le format, la date prévue, le début du texte et le statut.", en: "Each row shows the network, the format, the planned date, the start of the text and the status." },
    { fr: "« compte à choisir » : aucun compte n'est encore associé. Il en faut un pour programmer la publication.", en: "\"account to choose\": no account is linked yet. One is needed to schedule the post." },
    { fr: "Cliquez sur une publication pour l'ouvrir. En haut, choisissez le réseau, le format et le compte.", en: "Click a post to open it. At the top, choose the network, the format and the account." },
    { fr: "Corrigez la légende et les hashtags. Le compteur indique le nombre de caractères permis par le réseau.", en: "Correct the caption and hashtags. The counter shows how many characters the network allows." },
    { fr: "Plus bas : la date et l'heure, le lien, et « Régénérer avec l'IA » pour réécrire le texte ou changer le visuel.", en: "Further down: the date and time, the link, and \"Regenerate with AI\" to rewrite the text or change the visual." },
    { fr: "À droite, l'aperçu de la publication et ses médias. Le bouton + permet d'en ajouter.", en: "On the right, a preview of the post and its media. The + button adds more." },
    { fr: "En bas : « Enregistrer », « Valider et programmer » ou « Publier maintenant ». Rien ne part sans un compte choisi.", en: "At the bottom: \"Save\", \"Approve and schedule\" or \"Publish now\". Nothing goes out without a chosen account." },
    { fr: "Cochez plusieurs publications pour les valider d'un coup avec « Valider la sélection ». « Nouvelle publication » en crée une vide.", en: "Tick several posts to approve them all at once with \"Approve selection\". \"New post\" creates an empty one." },
  ],
  faq: [
    { q: { fr: "« Valider et programmer » affiche une erreur.", en: "\"Approve and schedule\" shows an error." }, a: { fr: "Il faut un compte choisi, une date à venir et, sauf sur Facebook, au moins un média. Connectez d'abord votre compte dans l'onglet Connexions, puis choisissez-le dans « Compte ».", en: "You need a chosen account, a future date and, except on Facebook, at least one media. First connect your account in the Connections tab, then choose it under \"Account\"." } },
    { q: { fr: "Je ne vois aucune publication.", en: "I can't see any posts." }, a: { fr: "Le filtre « À valider » est sélectionné par défaut : cliquez sur « Toutes ». Si la liste reste vide, préparez des publications depuis l'onglet Calendrier.", en: "The \"To review\" filter is selected by default: click \"All\". If the list is still empty, prepare posts from the Calendar tab." } },
    { q: { fr: "J'ai modifié une publication programmée.", en: "I edited a scheduled post." }, a: { fr: "Elle repasse « à valider » : validez-la de nouveau pour qu'elle parte à l'heure prévue.", en: "It goes back to \"to review\": approve it again so it goes out at the planned time." } },
  ],
};
export default tutorial;
