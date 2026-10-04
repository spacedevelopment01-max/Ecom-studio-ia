import type { TutorialDef } from "./types";

const tutorial: TutorialDef = {
  title: { fr: "Site", en: "Website" },
  summary: {
    fr: "Voir votre site vitrine comme vos clients, le modifier en discutant ou section par section, puis l'installer sur WordPress ou une autre plateforme.",
    en: "See your website the way your customers will, edit it by chatting or section by section, then install it on WordPress or another platform.",
  },
  steps: [
    { fr: "Au centre, l'aperçu de votre site, exactement comme vos clients le verront. Le menu du haut change de page.", en: "In the middle, a preview of your website, exactly as your customers will see it. The menu at the top switches pages." },
    { fr: "Vérifiez le rendu sur téléphone, tablette et ordinateur avec ces trois boutons.", en: "Check how it looks on phone, tablet and desktop with these three buttons." },
    { fr: "À droite, la structure de la page : prestations, déroulé, avis, infos pratiques… Cliquez sur une section, l'aperçu défile jusqu'à elle.", en: "On the right, the page structure: services, how it works, reviews, practical info… Click a section and the preview scrolls to it." },
    { fr: "Glissez une section par sa poignée pour la déplacer. L'œil la masque, le cadenas la protège, la corbeille la retire.", en: "Drag a section by its handle to move it. The eye hides it, the lock protects it, the bin removes it." },
    { fr: "« Ajouter une section » ouvre la bibliothèque : chaque section a son aperçu, et « Générer » en crée une sur mesure.", en: "\"Add a section\" opens the library: every section has a preview, and \"Generate\" creates a custom one." },
    { fr: "À gauche, demandez une retouche avec vos mots, par exemple sur vos boutons de rendez-vous. Seul l'élément visé change.", en: "On the left, ask for an edit in your own words, for example on your booking buttons. Only the targeted element changes." },
    { fr: "Chaque modification crée une version : le bouton « Versions » permet de revenir en arrière à tout moment.", en: "Every change creates a version: the \"Versions\" button lets you go back at any time." },
    { fr: "« Thèmes » change tout le style du site. Les aperçus sont des exemples : vos textes, photos et prestations sont conservés.", en: "\"Themes\" changes the whole style of the website. The previews are examples: your copy, photos and services are kept." },
    { fr: "WordPress est la plateforme conseillée pour un site vitrine, sans panier. Téléchargez ensuite le thème et installez-le.", en: "WordPress is the recommended platform for a showcase website with no cart. Then download the theme and install it." },
  ],
  faq: [
    { q: { fr: "Ma retouche n'a rien changé.", en: "My edit didn't change anything." }, a: { fr: "Désignez l'élément dans l'aperçu (bouton cible), puis décrivez le changement. Sans IA, le moteur local comprend les demandes simples : couleur des boutons, texte entre guillemets, ajouter ou supprimer une section.", en: "Select the element in the preview (target button), then describe the change. Without AI, the built-in engine understands simple requests: button color, text in quotes, adding or removing a section." } },
    { q: { fr: "Mes horaires ou mon téléphone sont faux sur le site.", en: "My hours or phone number are wrong on the website." }, a: { fr: "Corrigez-les dans l'onglet « Activité », enregistrez, puis cliquez sur « Mettre à jour le site ».", en: "Fix them in the \"Business\" tab, save, then click \"Update the website\"." } },
    { q: { fr: "Comment mettre le site en ligne ?", en: "How do I put the website online?" }, a: { fr: "Bouton de téléchargement en haut de l'aperçu : thème ZIP pour WordPress (Apparence › Thèmes › Ajouter › Téléverser), thème installable pour Shopify et PrestaShop, kit de reprise pour Wix et Squarespace. WooCommerce n'est pas nécessaire.", en: "Download button above the preview: a ZIP theme for WordPress (Appearance › Themes › Add New › Upload), an installable theme for Shopify and PrestaShop, a rebuild kit for Wix and Squarespace. WooCommerce isn't needed." } },
  ],
};
export default tutorial;
