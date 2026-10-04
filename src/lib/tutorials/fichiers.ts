import type { TutorialDef } from "./types";

const tutorial: TutorialDef = {
  title: { fr: "Fichiers", en: "Files" },
  summary: {
    fr: "Retrouver, ouvrir, ranger et importer tous les fichiers du projet : photos, images, vidéos, logos et exports.",
    en: "Find, open, organize and upload every file in the project: photos, images, videos, logos and exports.",
  },
  steps: [
    { fr: "Tous les fichiers du projet sont ici. À gauche, les dossiers : le studio y range lui-même chacune de ses créations.", en: "All the project's files are here. On the left, the folders: the studio files each of its creations there by itself." },
    { fr: "Cliquez sur un dossier pour l'ouvrir. Le chemin, en haut, permet de remonter d'un niveau.", en: "Click a folder to open it. The path at the top lets you go back up a level." },
    { fr: "Cliquez sur un fichier pour l'ouvrir : dimensions, origine, et les actions « Valider », « Télécharger » ou « Placer » dans la boutique.", en: "Click a file to open it: dimensions, source, and the \"Approve\", \"Download\" or \"Place\" in the store actions." },
    { fr: "Cochez des fichiers pour les déplacer ou les mettre à la corbeille. Vous pouvez aussi les glisser sur un dossier à gauche.", en: "Tick files to move them or send them to the trash. You can also drag them onto a folder on the left." },
    { fr: "Passez des vignettes à la liste : elle affiche le type, le statut, le poids et la date de chaque fichier.", en: "Switch from thumbnails to the list: it shows each file's type, status, size and date." },
    { fr: "« Rechercher partout » trouve un fichier dans tous les dossiers, par son nom ou son type.", en: "\"Search everywhere\" finds a file in every folder, by its name or type." },
    { fr: "« Importer » ajoute vos propres fichiers dans le dossier ouvert. Vous pouvez aussi les glisser directement dans la page.", en: "\"Upload\" adds your own files to the open folder. You can also drag them straight onto the page." },
    { fr: "« Nouveau sous-dossier » crée un dossier dans celui qui est ouvert. « Ranger les fichiers non classés » range ceux qui traînent, sans rien supprimer.", en: "\"New subfolder\" creates a folder inside the open one. \"Sort unfiled files\" files away the stray ones, without deleting anything." },
    { fr: "La « Corbeille » garde les fichiers supprimés : vous pouvez toujours les restaurer.", en: "The \"Trash\" keeps deleted files: you can always restore them." },
  ],
  faq: [
    { q: { fr: "Je ne retrouve pas une image créée par le studio.", en: "I can't find an image the studio created." }, a: { fr: "Tapez une partie de son nom ou son type (logo, bannière…) dans « Rechercher partout » : la recherche couvre tous les dossiers. Pensez aussi à regarder dans la « Corbeille ».", en: "Type part of its name or type (logo, banner…) in \"Search everywhere\": the search covers every folder. Also check the \"Trash\"." } },
    { q: { fr: "Je n'arrive pas à supprimer un dossier.", en: "I can't delete a folder." }, a: { fr: "Les dossiers créés par le studio (numérotés 01, 02…) sont protégés. Vos propres dossiers se suppriment avec l'icône de corbeille à côté du chemin, une fois vides.", en: "Folders created by the studio (numbered 01, 02…) are protected. Your own folders can be deleted with the bin icon next to the path, once they are empty." } },
    { q: { fr: "J'ai supprimé un fichier par erreur.", en: "I deleted a file by mistake." }, a: { fr: "Ouvrez la « Corbeille », cochez le fichier puis cliquez sur « Restaurer ».", en: "Open the \"Trash\", tick the file, then click \"Restore\"." } },
  ],
};
export default tutorial;
