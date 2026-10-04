import type { TutorialDef } from "./types";

const tutorial: TutorialDef = {
  title: { fr: "Pilote", en: "Pilot" },
  summary: {
    fr: "Suivre la création de votre projet étape par étape, répondre aux questions indispensables et régler le projet.",
    en: "Follow the creation of your project step by step, answer the essential questions and adjust the project settings.",
  },
  steps: [
    { fr: "Le Pilote suit la création de votre projet : chaque étape cochée en vert est terminée.", en: "The Pilot tracks the creation of your project: every step ticked in green is done." },
    { fr: "Une étape vous déplaît ? « Relancer » la refait à partir de là, les étapes précédentes sont conservées.", en: "Not happy with a step? \"Rerun\" redoes it from there; the previous steps are kept." },
    { fr: "À droite, un résumé : cliquez sur Images, Vidéos ou Publications pour ouvrir l'onglet correspondant.", en: "On the right, a summary: click Images, Videos or Posts to open the matching tab." },
    { fr: "« Ouvrir l'éditeur » mène à votre boutique, « Changer de thème » à la galerie des thèmes.", en: "\"Open the editor\" takes you to your store, \"Change theme\" to the theme gallery." },
    { fr: "Certaines informations ne se devinent pas, comme la livraison. Répondez ici, puis « Enregistrer mes réponses ».", en: "Some information can't be guessed, like shipping. Answer here, then click \"Save my answers\"." },
    { fr: "Dans les réglages, choisissez la plateforme de votre boutique : seule la façon de livrer le thème change.", en: "In the settings, choose your store platform: only the way the theme is delivered changes." },
    { fr: "Choisissez aussi la langue des prochains contenus. Les contenus existants ne sont pas modifiés.", en: "Also choose the language of upcoming content. Existing content is not changed." },
    { fr: "La mémoire du projet garde vos préférences. Écrivez un sujet et la règle à retenir, puis « Ajouter ».", en: "The project memory keeps your preferences. Write a topic and the rule to remember, then click \"Add\"." },
    { fr: "L'IA en tient compte dans les créations suivantes. La corbeille permet de l'oublier à tout moment.", en: "The AI follows it in everything it creates next. The bin lets you forget it at any time." },
  ],
  faq: [
    { q: { fr: "La création est bloquée ou une étape est en rouge.", en: "Creation is stuck or a step is red." }, a: { fr: "Cliquez sur « Reprendre où c'était » : le travail déjà fait est conservé et la création repart de l'étape en échec.", en: "Click \"Resume where it stopped\": the work already done is kept and creation restarts from the failed step." } },
    { q: { fr: "Je veux interrompre la création en cours.", en: "I want to interrupt the creation in progress." }, a: { fr: "Pendant la création, « Mettre en pause » arrête proprement l'étape en cours ; « Reprendre » la relance plus tard. « Arrêter » l'annule définitivement.", en: "While creation is running, \"Pause\" stops the current step cleanly; \"Resume\" restarts it later. \"Stop\" cancels it for good." } },
    { q: { fr: "Mes textes affichent « à compléter ».", en: "My copy shows \"to complete\"." }, a: { fr: "Le studio n'invente pas les informations qu'il ne connaît pas. Répondez aux questions indispensables du Pilote ou complétez la fiche dans l'onglet Produit.", en: "The studio doesn't make up information it doesn't know. Answer the essential questions in the Pilot or complete the sheet in the Product tab." } },
    { q: { fr: "Ma marque attend une validation.", en: "My brand is awaiting approval." }, a: { fr: "Vérifiez le nom, la palette et le logo, puis cliquez sur « Valider et continuer » ; « Ajuster la marque » ouvre l'onglet Marque.", en: "Check the name, palette and logo, then click \"Approve and continue\"; \"Adjust the brand\" opens the Brand tab." } },
  ],
};
export default tutorial;
