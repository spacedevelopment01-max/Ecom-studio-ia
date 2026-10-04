import type { TutorialDef } from "./types";

const tutorial: TutorialDef = {
  title: { fr: "Images", en: "Images" },
  summary: {
    fr: "Créer des visuels de votre produit (packshots, scènes, bannières, visuels pour les réseaux et publicités) et les retrouver rangés par catégorie.",
    en: "Create visuals of your product (packshots, scenes, banners, social visuals and ads) and find them sorted by category.",
  },
  steps: [
    { fr: "À gauche, le panneau « Créer ». Votre produit est toujours composé à partir de ses vraies photos ; les textes sont ajoutés par-dessus.", en: "On the left, the \"Create\" panel. Your product is always built from its real photos; text is added on top." },
    { fr: "Choisissez d'abord le type d'image : packshot, scène, bannière de boutique, visuel social ou publicité.", en: "First choose the type of image: packshot, scene, store banner, social visual or ad." },
    { fr: "Pour une scène, « Mise en scène » choisit le décor et « Format » la taille : fiche produit, Instagram, story, bannière…", en: "For a scene, \"Setting\" picks the backdrop and \"Format\" the size: product page, Instagram, story, banner…" },
    { fr: "Pour une publicité, de nouveaux champs apparaissent : composition, titre, sous-titre et texte du bouton.", en: "For an ad, new fields appear: layout, headline, subheadline and button text." },
    { fr: "Choisissez la langue des textes, puis cliquez sur « Créer l'image ». Le bouton « Jeu complet » prépare toute une série d'un coup.", en: "Choose the language of the text, then click \"Create image\". The \"Full set\" button prepares a whole series at once." },
    { fr: "À droite, toutes vos images. Les onglets les trient : packshots, détails, scènes, bannières, réseaux, publicités…", en: "On the right, all your images. The tabs sort them: packshots, details, scenes, banners, social, ads…" },
    { fr: "L'étiquette « À valider » signale une image que vous n'avez pas encore validée. Cliquez sur une image pour l'ouvrir.", en: "The \"To review\" label marks an image you haven't approved yet. Click an image to open it." },
    { fr: "Ici, vous pouvez la « Valider », l'« Écarter » ou la « Télécharger », la placer dans la boutique, ou créer une publication avec elle.", en: "Here you can \"Approve\", \"Reject\" or \"Download\" it, place it in your store, or create a post with it." },
  ],
  faq: [
    { q: { fr: "« Décor généré par IA » est grisé.", en: "\"AI-generated backdrop\" is greyed out." }, a: { fr: "Aucun fournisseur d'images n'est configuré : le studio utilise ses propres décors (studio doux, podium, arche, lumière de fenêtre…). Vos images sont créées normalement.", en: "No image provider is configured: the studio uses its own backdrops (soft studio, podium, arch, window light…). Your images are still created normally." } },
    { q: { fr: "J'ai lancé une création, mais je ne vois pas l'image.", en: "I started a creation but I can't see the image." }, a: { fr: "Une barre de progression s'affiche en haut de l'onglet pendant la création. L'image apparaît ensuite dans la galerie, dans sa catégorie (et dans « Tout »), et dans l'onglet Fichiers.", en: "A progress bar shows at the top of the tab while it is being created. The image then appears in the gallery, in its category (and under \"All\"), and in the Files tab." } },
    { q: { fr: "Où écrire le texte de ma publicité ?", en: "Where do I write the text of my ad?" }, a: { fr: "Choisissez le type « Publicité (avec texte et bouton) » ou « Visuel social » : les champs Titre, Sous-titre (et Bouton pour la publicité) apparaissent sous le format.", en: "Choose the \"Ad (with text and button)\" or \"Social visual\" type: the Headline, Subheadline (and Button for ads) fields appear below the format." } },
    { q: { fr: "Une image ne me plaît pas.", en: "I don't like an image." }, a: { fr: "Ouvrez-la et cliquez sur « Écarter », puis relancez une création avec une autre mise en scène ou un autre format.", en: "Open it and click \"Reject\", then start a new creation with another setting or format." } },
  ],
};
export default tutorial;
