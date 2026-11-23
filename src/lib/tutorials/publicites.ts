import type { TutorialDef } from "./types";

// Au tutoiement (décision du 22 novembre 2026 : SINA tutoie le client, plus aucun « vous »).

const tutorial: TutorialDef = {
  title: { fr: "Publicités", en: "Ads" },
  summary: {
    fr: "Préparer tes campagnes publicitaires (une publicité par type de client, textes, créations) puis les exporter vers le gestionnaire de publicités de chaque réseau.",
    en: "Prepare your ad campaigns (angles, copy, creatives), then export them to each network's ads manager.",
  },
  steps: [
    { fr: "Le Studio prépare tes campagnes mais ne dépense rien : c'est toi qui règles le budget et le lancement, dans le gestionnaire de publicités de chaque réseau. Le budget d'essai affiché est un conseil (un seul ensemble d'annonces, 5 à 20 € par jour au total), jamais une promesse de résultat.", en: "The studio prepares your campaigns but spends nothing: budget and launch are set in each network's ads manager." },
    { fr: "« Nouvelle campagne » ouvre la fiche. Tes angles y sont proposés comme point de départ : une publicité par type de client, celui de ton angle choisi d'abord, puis ceux gardés en réserve.", en: "\"New campaign\" opens the campaign form. The angles from your brand strategy are suggested as a starting point." },
    { fr: "Donne un nom à la campagne, choisis l'objectif et coche les réseaux visés.", en: "Name the campaign, choose the objective and tick the networks you want." },
    { fr: "Décris l'audience et les indicateurs que tu suivras. L'audience sert aussi à rédiger les annonces.", en: "Describe the audience and the metrics you will track. The audience is also used to write the ads." },
    { fr: "Choisis la langue, puis « Proposer les annonces dans cette langue ». Relis toujours les textes proposés.", en: "Choose the language, then \"Draft ads in this language\". Always review the suggested copy." },
    { fr: "Chaque annonce a un angle, un texte principal, un titre (27 caractères au plus pour Meta) et un bouton. Le « + » ajoute tes images ou tes vidéos.", en: "Each ad has an angle, a primary text, a headline and a button. The \"+\" adds your images or videos." },
    { fr: "« Enregistrer » garde la campagne. « Créer les publications organiques » en fait aussi des brouillons dans Publications.", en: "\"Save\" keeps the campaign. \"Create organic posts\" also turns it into drafts in Posts." },
    { fr: "La campagne apparaît dans la liste. « Export pour le gestionnaire de publicités » télécharge toutes les annonces en fichier CSV, avec le lien de ton site déjà marqué pour chaque annonce : tu sauras quelles visites viennent de quelle publicité.", en: "The campaign shows up in the list. \"Export for the ads manager\" downloads all the ads as a CSV file." },
  ],
  faq: [
    { q: { fr: "Ma publicité n'est pas diffusée.", en: "My ad isn't running." }, a: { fr: "C'est normal : le Studio ne lance aucune publicité payante. Importe l'export CSV (ou recopie les textes) dans le gestionnaire de publicités du réseau, puis règle le budget là-bas.", en: "That's expected: the studio never launches paid ads. Import the CSV export (or copy the text) into the network's ads manager, then set the budget there." } },
    { q: { fr: "Les textes proposés contiennent des passages entre crochets.", en: "The suggested copy has parts in square brackets." }, a: { fr: "En version simplifiée, le Studio n'écrit que ce qui est confirmé dans ta fiche produit. Remplace les passages entre crochets par tes informations, puis enregistre.", en: "In the simplified version, the studio only writes what is confirmed in your product details. Replace the bracketed parts with your own information, then save." } },
    { q: { fr: "Je ne trouve pas mes images pour l'annonce.", en: "I can't find my images for the ad." }, a: { fr: "Le « + » de l'annonce ouvre la bibliothèque du projet, avec toutes ses images et vidéos. Un visuel venu d'ailleurs s'importe d'abord dans « Fichiers ».", en: "The ad's \"+\" opens the project library, with all its images and videos. A visual from elsewhere must first be uploaded in \"Files\"." } },
  ],
};
export default tutorial;
