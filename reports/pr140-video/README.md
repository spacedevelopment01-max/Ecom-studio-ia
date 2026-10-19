# Réception technique vidéo — PR #140

**Mires locales synthétiques, aucune génération fournisseur.** Ces fichiers exercent l'encodeur et les reprises ; ils ne présentent ni le casque ONDE, ni une prestation réelle, ni une qualité créative validée. Les mentions Pixabay affichées dans les réserves sont les libellés du parcours testé : aucun plan Pixabay n'a été téléchargé dans cette réception.

[Rapport et limites](../../docs/coordination/PR_140_VIDEO.md) · **[Devis ONDE sans génération](DEVIS_ONDE.md)** · [Calculs cible](devis-calcul.json) · [Calcul natif conditionnel exécuté sans créer de projet](devis-natif-conditionnel.json).

Code de référence : `c5f74c437b3c3644024329b3d86bb45e2a500f18`. [Empreintes du code et des harnais](source-fingerprints.json) · [Manifeste des fichiers](manifest.json) · [Commandes et résultats](checks.json).

## Vidéos réelles d'encodage local

| Parcours technique simulé | Fichier final à lire/télécharger | Cadre / durée mesurés | Images du fichier |
|---|---|---|---|
| Publicité produit | [MP4](produit-publicitaire.mp4?raw=1) | 1080 × 1920, 20 s, H.264/AAC, 30 i/s | [Plan 1](produit-publicitaire-1.jpg) · [Plan 2](produit-publicitaire-2.jpg) · [Plan 3](produit-publicitaire-3.jpg) · [Fin](produit-publicitaire-4.jpg) |
| Publicité service | [MP4](service-publicitaire.mp4?raw=1) | 1080 × 1350, 10 s, H.264/AAC, 30 i/s | [Plan 1](service-publicitaire-1.jpg) · [Plan 2](service-publicitaire-2.jpg) · [Plan 3](service-publicitaire-3.jpg) · [Fin](service-publicitaire-4.jpg) |
| Publication service | [MP4](service-organique.mp4?raw=1) | 1080 × 1080, 10 s, H.264/AAC, 30 i/s | [Plan 1](service-organique-1.jpg) · [Plan 2](service-organique-2.jpg) · [Plan 3](service-organique-3.jpg) · [Fin](service-organique-4.jpg) |

Les trois vidéos comportent de la musique locale, **aucune voix parlée réelle**. Les SRT sont vides et les VTT sans cues ; leur présence ne valide pas une voix/synchronisation. Les documents éditables de test et les fichiers sont conservés avec leurs noms dans ce dossier. [Validation MP4, reprise native et version client](validation.json).

## Inspection du vrai studio

Ces captures sont issues du navigateur, avec lecture des fichiers et avertissements ouverts. Aucune route de génération n'était permise : lectures et devis uniquement. Les données ont été préparées pour la réception, sans démonstration de création IA complète depuis l'écran. Les premiers formats sélectionnés dans les formulaires sont leurs valeurs par défaut, pas les dimensions du fichier déjà rendu : celles-ci figurent sur sa carte et dans `validation.json`.

| Parcours | Ordinateur | Mobile | Lecture du MP4 |
|---|---|---|---|
| Produit / Publicités | [Capture](produit-publicitaire-ordinateur.png) | [Capture](produit-publicitaire-mobile.png) | [Ordinateur](produit-publicitaire-ordinateur-lecture.png) · [Mobile](produit-publicitaire-mobile-lecture.png) |
| Service / Publicités | [Capture](service-publicitaire-ordinateur.png) | [Capture](service-publicitaire-mobile.png) | [Ordinateur](service-publicitaire-ordinateur-lecture.png) · [Mobile](service-publicitaire-mobile-lecture.png) |
| Service / Publications | [Capture](service-organique-ordinateur.png) | [Capture](service-organique-mobile.png) | [Ordinateur](service-organique-ordinateur-lecture.png) · [Mobile](service-organique-mobile-lecture.png) |

Refus de 1 scène / 60 s : [ordinateur](service-publicitaire-ordinateur-duree-refusee.png), [mobile](service-publicitaire-mobile-duree-refusee.png). Total : **14 PNG d'interface, 12 JPG du fichier encodé, 3 MP4**. Aucun de ces MP4 n'est un enregistrement vidéo de la navigation ; les preuves UI sont des captures et des mesures de lecture. [Réception navigateur structurée](validation-ui.json) : six inspections, zéro erreur JavaScript, zéro requête externe.

## Reproduction isolée

Depuis le dépôt, exécuter les commandes du rapport avec un **nouveau** `DATA_DIR` préfixé `ecs-test-video-mission-`. `verify-video-mission.ts` interdit les accès `fetch` et remplace les seuls outils fournisseurs ; l'assemblage, les fichiers et les points de reprise `JobContext` sont réels. Il écrit un `private-ui.json` local contenant la session : **ne jamais le publier**. Démarrer le serveur local sur le même `DATA_DIR`, sans worker, puis lancer `verify-video-mission-browser.ts`.

Pour le chiffrage natif seulement : `DATA_DIR=/tmp/ecs-test-video-quote-NOUVEAU STOCK_OFFLINE=1 npx tsx scripts/verify-video-quote.ts`. Ce script utilise une configuration synthétique clairement identifiée, bloque le réseau et crée **zéro projet**. Il ne confirme pas l'accès de production ni n'autorise une génération.
