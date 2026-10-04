import type { TutorialDef } from "./types";

const tutorial: TutorialDef = {
  title: { fr: "Prompts", en: "Prompts" },
  summary: {
    fr: "Trouver une demande toute prête, la compléter avec votre projet et l'envoyer dans le bon onglet du studio.",
    en: "Find a ready-made request, complete it with your project and send it to the right tab of the studio.",
  },
  steps: [
    { fr: "Les prompts sont des demandes toutes prêtes, classées par secteur et par tâche. Ils ne sont jamais obligatoires.", en: "Prompts are ready-made requests, sorted by sector and task. They are never required." },
    { fr: "Tapez un mot dans la recherche pour trouver un prompt, par exemple « accueil ».", en: "Type a word in the search box to find a prompt, for example \"homepage\"." },
    { fr: "Affinez avec les filtres : secteur, type de tâche, ou seulement vos favoris et vos propres prompts.", en: "Narrow it down with the filters: sector, task type, or only your favorites and your own prompts." },
    { fr: "Cliquez sur un prompt pour l'ouvrir à droite. Le texte se modifie librement avant usage.", en: "Click a prompt to open it on the right. You can freely edit the text before using it." },
    { fr: "« Compléter avec le projet » remplit le prompt avec votre produit, votre marque et vos médias.", en: "\"Complete with the project\" fills in the prompt with your product, brand and media." },
    { fr: "Le cœur ajoute le prompt à vos favoris. « Enregistrer » garde votre version dans « Mes prompts ».", en: "The heart adds the prompt to your favorites. \"Save\" keeps your version in \"My prompts\"." },
    { fr: "Le bouton « Insérer dans » indique l'onglet visé. Un clic l'ouvre avec le prompt complété.", en: "The \"Insert into\" button shows the target tab. One click opens it with the completed prompt." },
    { fr: "Ici, la demande est déjà écrite dans la conversation de la boutique : relisez-la, puis envoyez-la.", en: "Here, the request is already written in the store chat: read it over, then send it." },
  ],
  faq: [
    { q: { fr: "Je ne trouve aucun prompt.", en: "I can't find any prompt." }, a: { fr: "Remettez les filtres sur « Tous les secteurs », « Toutes les tâches » et « Tous », puis essayez un mot plus court.", en: "Set the filters back to \"All sectors\", \"All tasks\" and \"All\", then try a shorter word." } },
    { q: { fr: "Le prompt contient des {{…}} ou des passages entre crochets.", en: "The prompt contains {{…}} or text in brackets." }, a: { fr: "Les {{…}} sont remplacés par « Compléter avec le projet » (et automatiquement à l'insertion). Ce que le studio ne connaît pas reste entre crochets : écrivez-le directement dans le texte.", en: "The {{…}} are replaced by \"Complete with the project\" (and automatically when inserting). Anything the studio doesn't know stays in brackets: type it directly into the text." } },
    { q: { fr: "Où retrouver un prompt que j'ai modifié ?", en: "Where do I find a prompt I edited?" }, a: { fr: "Après « Enregistrer », choisissez « Mes prompts » dans le dernier filtre.", en: "After \"Save\", choose \"My prompts\" in the last filter." } },
  ],
};
export default tutorial;
