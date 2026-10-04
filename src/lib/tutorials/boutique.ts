import type { TutorialDef } from "./types";

const tutorial: TutorialDef = {
  title: { fr: "Boutique", en: "Store" },
  summary: {
    fr: "Voir votre boutique comme vos clients, la modifier en discutant ou section par section, puis l'installer sur votre plateforme.",
    en: "See your store the way your customers will, edit it by chatting or section by section, then install it on your platform.",
  },
  steps: [
    { fr: "Au centre, l'aperçu de votre boutique, exactement comme vos clients la verront. Le menu du haut change de page.", en: "In the middle, a preview of your store, exactly as your customers will see it. The menu at the top switches pages." },
    { fr: "Vérifiez le rendu sur téléphone, tablette et ordinateur avec ces trois boutons.", en: "Check how it looks on phone, tablet and desktop with these three buttons." },
    { fr: "À droite, la structure de la page : cliquez sur une section, l'aperçu défile jusqu'à elle.", en: "On the right, the page structure: click a section and the preview scrolls to it." },
    { fr: "Glissez une section par sa poignée pour la déplacer. L'œil la masque, le cadenas la protège, la corbeille la retire.", en: "Drag a section by its handle to move it. The eye hides it, the lock protects it, the bin removes it." },
    { fr: "« Ajouter une section » ouvre la bibliothèque : chaque section a son aperçu, et « Générer » en crée une sur mesure.", en: "\"Add a section\" opens the library: every section has a preview, and \"Generate\" creates a custom one." },
    { fr: "À gauche, demandez une retouche avec vos mots. Seul l'élément visé change.", en: "On the left, ask for an edit in your own words. Only the targeted element changes." },
    { fr: "Chaque modification crée une version : le bouton « Versions » permet de revenir en arrière à tout moment.", en: "Every change creates a version: the \"Versions\" button lets you go back at any time." },
    { fr: "« Thèmes » change tout le style de la boutique ; vos textes, images et produits sont conservés.", en: "\"Themes\" changes the whole style of the store; your copy, images and products are kept." },
    { fr: "Quand tout vous plaît, choisissez votre plateforme et téléchargez ou installez le thème.", en: "When you're happy with it, choose your platform and download or install the theme." },
  ],
  faq: [
    { q: { fr: "Ma retouche n'a rien changé.", en: "My edit didn't change anything." }, a: { fr: "Désignez l'élément dans l'aperçu (bouton cible), puis décrivez le changement. Sans IA, le moteur local comprend les demandes simples : couleur des boutons, texte entre guillemets, ajouter ou supprimer une section.", en: "Select the element in the preview (target button), then describe the change. Without AI, the built-in engine understands simple requests: button color, text in quotes, adding or removing a section." } },
    { q: { fr: "J'ai cassé quelque chose.", en: "I broke something." }, a: { fr: "Ouvrez « Versions » et restaurez la version précédente : rien n'est jamais perdu.", en: "Open \"Versions\" and restore the previous version: nothing is ever lost." } },
    { q: { fr: "Comment mettre la boutique en ligne ?", en: "How do I put the store online?" }, a: { fr: "Bouton de téléchargement en haut de l'aperçu : thème ZIP pour Shopify (ou installation directe si votre boutique est connectée dans « Connexions »), thème installable pour WordPress et PrestaShop, kit de reprise pour Wix et Squarespace.", en: "Download button above the preview: a ZIP theme for Shopify (or direct install if your store is connected under \"Connections\"), an installable theme for WordPress and PrestaShop, a rebuild kit for Wix and Squarespace." } },
  ],
};
export default tutorial;
