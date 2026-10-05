import type { TutorialDef } from "./types";

const tutorial: TutorialDef = {
  title: { fr: "Publicités", en: "Ads" },
  summary: {
    fr: "Préparer vos campagnes publicitaires (angles, textes, créations) puis les exporter vers le gestionnaire de publicités de chaque réseau.",
    en: "Prepare your ad campaigns (angles, copy, creatives), then export them to each network's ads manager.",
  },
  steps: [
    { fr: "Le studio prépare vos campagnes mais ne dépense rien : le budget et le lancement se règlent dans le gestionnaire de publicités de chaque réseau.", en: "The studio prepares your campaigns but spends nothing: budget and launch are set in each network's ads manager." },
    { fr: "« Nouvelle campagne » ouvre la fiche. Les angles de votre stratégie de marque y sont proposés comme point de départ.", en: "\"New campaign\" opens the campaign form. The angles from your brand strategy are suggested as a starting point." },
    { fr: "Donnez un nom à la campagne, choisissez l'objectif et cochez les réseaux visés.", en: "Name the campaign, choose the objective and tick the networks you want." },
    { fr: "Décrivez l'audience et les indicateurs que vous suivrez. L'audience sert aussi à rédiger les annonces.", en: "Describe the audience and the metrics you will track. The audience is also used to write the ads." },
    { fr: "Choisissez la langue, puis « Proposer les annonces dans cette langue ». Relisez toujours les textes proposés.", en: "Choose the language, then \"Draft ads in this language\". Always review the suggested copy." },
    { fr: "Chaque annonce a un angle, un texte principal, un titre et un bouton. Le « + » ajoute vos images ou vidéos.", en: "Each ad has an angle, a primary text, a headline and a button. The \"+\" adds your images or videos." },
    { fr: "« Enregistrer » garde la campagne. « Créer les publications organiques » en fait aussi des brouillons dans Publications.", en: "\"Save\" keeps the campaign. \"Create organic posts\" also turns it into drafts in Posts." },
    { fr: "La campagne apparaît dans la liste. « Export pour le gestionnaire de publicités » télécharge toutes les annonces en fichier CSV.", en: "The campaign shows up in the list. \"Export for the ads manager\" downloads all the ads as a CSV file." },
  ],
  faq: [
    { q: { fr: "Ma publicité n'est pas diffusée.", en: "My ad isn't running." }, a: { fr: "C'est normal : le studio ne lance aucune publicité payante. Importez l'export CSV (ou recopiez les textes) dans le gestionnaire de publicités du réseau, puis réglez le budget là-bas.", en: "That's expected: the studio never launches paid ads. Import the CSV export (or copy the text) into the network's ads manager, then set the budget there." } },
    { q: { fr: "Les textes proposés contiennent des passages entre crochets.", en: "The suggested copy has parts in square brackets." }, a: { fr: "En version simplifiée, le studio n'écrit que ce qui est confirmé dans votre fiche produit. Remplacez les passages entre crochets par vos informations, puis enregistrez.", en: "In the simplified version, the studio only writes what is confirmed in your product details. Replace the bracketed parts with your own information, then save." } },
    { q: { fr: "Je ne trouve pas mes images pour l'annonce.", en: "I can't find my images for the ad." }, a: { fr: "Le « + » de l'annonce ouvre la bibliothèque du projet, avec toutes ses images et vidéos. Un visuel venu d'ailleurs doit d'abord être importé dans « Fichiers ».", en: "The ad's \"+\" opens the project library, with all its images and videos. A visual from elsewhere must first be uploaded in \"Files\"." } },
  ],
};
export default tutorial;
