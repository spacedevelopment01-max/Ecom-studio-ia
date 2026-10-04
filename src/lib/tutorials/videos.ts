import type { TutorialDef } from "./types";

const tutorial: TutorialDef = {
  title: { fr: "Vidéos", en: "Videos" },
  summary: {
    fr: "Produire des vidéos courtes de votre produit, avec musique et sous-titres, puis les regarder, les valider et les télécharger.",
    en: "Produce short videos of your product, with music and subtitles, then watch, approve and download them.",
  },
  steps: [
    { fr: "À gauche, « Produire une vidéo ». Deux types : « Motion design », animé à partir des vraies photos du produit, et « UGC par IA ».", en: "On the left, \"Produce a video\". Two types: \"Motion design\", animated from the real product photos, and \"AI UGC\"." },
    { fr: "Avec « UGC par IA », une personne générée par IA présente votre produit face caméra. Vous relisez le script avant de lancer.", en: "With \"AI UGC\", an AI-generated person presents your product on camera. You review the script before starting." },
    { fr: "Choisissez le format selon l'endroit de diffusion : 9:16 pour les stories et reels, 1:1 ou 4:5 pour le fil, 16:9 pour la boutique ou YouTube.", en: "Choose the format for where it will be shown: 9:16 for stories and reels, 1:1 or 4:5 for the feed, 16:9 for the store or YouTube." },
    { fr: "Décrivez l'objectif en quelques mots, puis choisissez l'usage et la musique. L'adresse affichée à la fin est facultative.", en: "Describe the goal in a few words, then choose the use and the music. The address shown at the end is optional." },
    { fr: "« Produire la vidéo » lance le rendu. Il continue même si vous quittez la page, et la vidéo apparaît ensuite à droite.", en: "\"Produce the video\" starts rendering. It keeps going even if you leave the page, and the video then appears on the right." },
    { fr: "À droite, les vidéos déjà produites. Le lecteur permet de les regarder ici même.", en: "On the right, the videos already produced. The player lets you watch them right here." },
    { fr: "Sous chaque vidéo : son format, son statut, et le découpage plan par plan, avec la durée et le texte de chaque plan.", en: "Below each video: its format, its status, and the shot-by-shot breakdown, with the length and text of each shot." },
    { fr: "Téléchargez le fichier « MP4 », les « Sous-titres SRT », ou le « Pack CapCut » pour la retoucher dans CapCut.", en: "Download the \"MP4\" file, the \"SRT subtitles\", or the \"CapCut pack\" to edit it in CapCut." },
    { fr: "« Valider, réutiliser, Canva… » ouvre la fiche de la vidéo : la valider, la placer dans la boutique ou en faire une publication.", en: "\"Approve, reuse, Canva…\" opens the video's details: approve it, place it in your store or turn it into a post." },
  ],
  faq: [
    { q: { fr: "Ma vidéo n'apparaît pas tout de suite.", en: "My video doesn't appear right away." }, a: { fr: "Le rendu prend un peu de temps : une barre de progression s'affiche en haut de l'onglet. Vous pouvez quitter la page, le rendu continue ; la vidéo apparaît à droite une fois terminée.", en: "Rendering takes a little time: a progress bar shows at the top of the tab. You can leave the page, rendering continues; the video appears on the right once it's done." } },
    { q: { fr: "« Ajouter un plan généré par IA » est grisé.", en: "\"Add an AI-generated shot\" is greyed out." }, a: { fr: "Aucun fournisseur vidéo n'est configuré. La vidéo en motion design est produite normalement à partir de vos photos.", en: "No video provider is configured. The motion design video is still produced normally from your photos." } },
    { q: { fr: "Je veux modifier un texte ou un plan de la vidéo.", en: "I want to change a text or a shot in the video." }, a: { fr: "Téléchargez le « Pack CapCut » pour retoucher le montage dans CapCut, ou relancez une vidéo avec un autre objectif.", en: "Download the \"CapCut pack\" to edit the cut in CapCut, or produce a new video with a different goal." } },
  ],
};
export default tutorial;
