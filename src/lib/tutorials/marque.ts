import type { TutorialDef } from "./types";

const tutorial: TutorialDef = {
  title: { fr: "Marque", en: "Brand" },
  summary: {
    fr: "Ajuster l'identité de votre marque (nom, signature, ton, couleurs, logo) et retrouver sa charte et sa stratégie.",
    en: "Adjust your brand identity (name, tagline, tone, colors, logo) and find its guidelines and strategy.",
  },
  steps: [
    { fr: "L'onglet Marque réunit l'identité proposée pour votre produit. Le nom de marque se modifie directement ici.", en: "The Brand tab brings together the identity proposed for your product. Edit the brand name directly here." },
    { fr: "Cliquez sur une autre signature proposée pour l'essayer, puis sur « Enregistrer » pour la garder.", en: "Click another suggested tagline to try it, then \"Save\" to keep it." },
    { fr: "« Valider » verrouille un élément : il est conservé quand vous demandez une nouvelle proposition.", en: "\"Approve\" locks an element: it is kept when you ask for a new proposal." },
    { fr: "Plus bas : positionnement, cible, ton de voix, histoire et palette. Cliquez sur une couleur pour la changer.", en: "Further down: positioning, audience, voice, story and palette. Click a color to change it." },
    { fr: "À droite, trois propositions de logo : « Choisir » applique celle qui vous plaît, avec toutes ses déclinaisons.", en: "On the right, three logo proposals: \"Select\" applies the one you like, with all its variations." },
    { fr: "Choisissez la direction de la boutique, enregistrez, puis appliquez-la depuis l'onglet Boutique.", en: "Choose the store direction, save, then apply it from the Store tab." },
    { fr: "La charte de marque se feuillette avec les flèches et se télécharge en PDF ; « Mettre à jour » la refait.", en: "Flip through the brand guidelines with the arrows and download them as a PDF; \"Update\" rebuilds them." },
    { fr: "En bas, la stratégie : messages clés, angles et piliers réutilisés pour vos publications et campagnes.", en: "At the bottom, the strategy: key messages, angles and pillars reused for your posts and campaigns." },
    { fr: "« Nouvelle proposition » refait la marque selon vos indications ; les éléments validés sont gardés.", en: "\"New proposal\" redoes the brand based on your directions; approved elements are kept." },
  ],
  faq: [
    { q: { fr: "Le bouton « Enregistrer » est grisé.", en: "The \"Save\" button is greyed out." }, a: { fr: "Il s'active dès que vous modifiez un champ, une couleur ou la direction.", en: "It becomes active as soon as you change a field, a color or the direction." } },
    { q: { fr: "Je ne peux pas changer de logo.", en: "I can't change the logo." }, a: { fr: "Le logo est validé : cliquez sur « Validé » à côté de « Logo » pour le déverrouiller, puis sur « Choisir ».", en: "The logo is approved: click \"Approved\" next to \"Logo\" to unlock it, then \"Select\"." } },
    { q: { fr: "J'ai choisi une direction mais la boutique n'a pas changé.", en: "I picked a direction but the store didn't change." }, a: { fr: "Enregistrez, puis appliquez la direction dans l'onglet Boutique (bouton « Thèmes ») : une nouvelle version est créée, l'ancienne reste restaurable.", en: "Save, then apply the direction in the Store tab (\"Themes\" button): a new version is created and the previous one can still be restored." } },
  ],
};
export default tutorial;
