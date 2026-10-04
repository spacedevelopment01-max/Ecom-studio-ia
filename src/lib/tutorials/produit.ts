import type { TutorialDef } from "./types";

const tutorial: TutorialDef = {
  title: { fr: "Produit", en: "Product" },
  summary: {
    fr: "Vérifier et compléter ce que le studio sait de votre produit : toutes les créations s'appuient sur cette fiche.",
    en: "Check and complete what the studio knows about your product: everything it creates relies on this sheet.",
  },
  steps: [
    { fr: "La fiche produit rassemble ce que le studio sait de votre produit. Les textes, images et publicités s'appuient dessus.", en: "The product sheet gathers what the studio knows about your product. Copy, images and ads all rely on it." },
    { fr: "Vérifiez le nom du produit et son prix TTC : ils apparaissent tels quels dans votre boutique.", en: "Check the product name and its price including tax: they appear as is in your store." },
    { fr: "Chaque information a une valeur. Une case « Inconnu » reste « à compléter » dans vos textes : remplissez-la.", en: "Each piece of information has a value. An \"Unknown\" field stays \"to complete\" in your copy: fill it in." },
    { fr: "Le statut indique la fiabilité : « Confirmé » est utilisé tel quel, « Observé » avec prudence, « Inconnu » jamais.", en: "The status shows reliability: \"Confirmed\" is used as is, \"Observed\" cautiously, \"Unknown\" never." },
    { fr: "« Ajouter une information » crée une ligne de plus ; la corbeille la retire. Pensez ensuite à « Enregistrer ».", en: "\"Add information\" creates a new line; the bin removes it. Then remember to click \"Save\"." },
    { fr: "À droite, ce que montre la photo : couleurs dominantes et description de ce qui est visible.", en: "On the right, what the photo shows: dominant colors and a description of what is visible." },
    { fr: "Ajoutez des photos du produit ou des photos en situation avec « Ajouter ». La première photo en situation ouvre la boutique.", en: "Add product photos or lifestyle photos with \"Add\". The first lifestyle photo opens the store." },
    { fr: "Votre produit existe en plusieurs coloris ou tailles ? Indiquez le nom et les valeurs, puis « Enregistrer les variantes ».", en: "Does your product come in several colors or sizes? Enter the name and the values, then click \"Save variants\"." },
    { fr: "En bas, choisissez le type de boutique : mono-produit, multi-produit ou niche, pour ajouter d'autres produits.", en: "At the bottom, choose the store type: single product, multi-product or niche, to add more products." },
  ],
  faq: [
    { q: { fr: "J'ai modifié la fiche mais rien n'a changé dans la boutique.", en: "I edited the sheet but nothing changed in the store." }, a: { fr: "Cliquez sur « Enregistrer » : la fiche sert aux prochaines créations. Pour les contenus déjà faits, relancez l'étape voulue depuis le Pilote.", en: "Click \"Save\": the sheet is used for upcoming creations. For content already made, rerun the step you want from the Pilot." } },
    { q: { fr: "Le bouton « Enregistrer » est grisé.", en: "The \"Save\" button is greyed out." }, a: { fr: "Il s'active dès que vous changez quelque chose dans la fiche (nom, prix, information ou statut).", en: "It becomes active as soon as you change something in the sheet (name, price, information or status)." } },
    { q: { fr: "Le studio s'est trompé sur mon produit.", en: "The studio got my product wrong." }, a: { fr: "Corrigez directement les lignes de la fiche et enregistrez. « Réanalyser tout le projet » relance l'analyse et les étapes suivantes ; les versions précédentes restent disponibles.", en: "Correct the lines of the sheet directly and save. \"Reanalyze the whole project\" reruns the analysis and the following steps; previous versions remain available." } },
  ],
};
export default tutorial;
