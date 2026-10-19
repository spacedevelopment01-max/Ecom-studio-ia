# Réception vidéo — preuves isolées

[Rapport complet](../../docs/coordination/PR_140_VIDEO_LOTS.md) · [Devis actualisé et limites](DEVIS_CHAINE.md).

**Les visuels et clips ci-dessous sont des mires de test, pas des publicités ONDE ou des vidéos Pixabay.** Les fournisseurs d'images, de clips, de scénario et de vision sont simulés. Voix française locale, encodages, interface du studio, tâches, versions et téléchargements sont exécutés. Aucun appel payant, coût API réel 0 € ; coûts de calcul non mesurés. La fidélité du vrai casque noir/vert et la qualité professionnelle restent à réceptionner avec les références privées et les fournisseurs réels autorisés plus tard.

Les fichiers `lot2-*` et `*-fin-corrigee.png` sont les précontrôles historiques du lot 2. Les fichiers contenant `final` et `interaction` appartiennent à la réception UI finale du lot 3. Les captures et enregistrements restent explicitement marqués comme tests isolés.

| Parcours | Ordinateur | Mobile | MP4 téléchargé après modification/rendu | Interaction réelle ordinateur |
|---|---|---|---|---|
| Produit — publicité | [Capture](produit-publicitaire-lecteur-ordinateur.png) | [Capture](produit-publicitaire-lecteur-mobile.png) | [Vidéo](produit-publicitaire-final.mp4?raw=true) | [Enregistrement](produit-publicitaire-interaction-ordinateur.webm?raw=true) |
| Service — publicité | [Capture](service-publicitaire-lecteur-ordinateur.png) | [Capture](service-publicitaire-lecteur-mobile.png) | [Vidéo](service-publicitaire-final.mp4?raw=true) | [Enregistrement](service-publicitaire-interaction-ordinateur.webm?raw=true) |
| Produit — publication organique | [Capture](produit-organique-lecteur-ordinateur.png) | [Capture](produit-organique-lecteur-mobile.png) | [Vidéo](produit-organique-final.mp4?raw=true) | [Enregistrement](produit-organique-interaction-ordinateur.webm?raw=true) |
| Service — publication organique | [Capture](service-organique-lecteur-ordinateur.png) | [Capture](service-organique-lecteur-mobile.png) | [Vidéo](service-organique-final.mp4?raw=true) | [Enregistrement](service-organique-interaction-ordinateur.webm?raw=true) |

Les SRT/VTT correspondants, les enregistrements mobiles, les scénarios, le rejet qualité et la reprise figurent dans ce dossier. [Contrôles UI](ui-final-checks.json), [tâches et réemploi simulés](ui-worker-checks.json), [mesures des fichiers et empreintes](final-media-checks.json), [commandes et tests](tests-final.txt), [calcul natif du devis](chain-quote.json).

Reproduction sans appel fournisseur : créer un **nouveau** `DATA_DIR=/tmp/ecs-test-video-mission-<identifiant-unique>` ; `SEED_ONLY=1 npx tsx scripts/verify-video-lots.ts`, installer les ressources de voix hors Git si souhaité ; lancer le worker `verify-video-ui-runtime.ts` dans ce même dossier, puis Next local avec `--import ./scripts/verify-video-network-guard.mjs`, port 3134 ; exécuter `verify-video-ui-browser.ts` avec Chromium/Playwright configurés. Ne jamais utiliser une base client. Les sessions privées restent dans `private-ui.json` mode 600, **à ne pas partager**. Éviter l'exécution simultanée avec la suite complète sur un environnement contraint en mémoire. L'installation locale de voix est un prérequis, pas un service vocal déployé par cette PR.

Le premier lancement produit, sa pause et sa reprise ont précédé la coupure : [enregistrement interrompu conservé](produit-publicitaire-lancement-interruption.webm?raw=true). Le conteneur WebM a été réindexé sans modifier ses images ; il s'arrête à la coupure et ne constitue pas la séquence finale de téléchargement. L'enregistrement final correspondant repart du résultat déjà obtenu, sans nouvelle génération de ses images/clips.

Les captures `*-lecteur-*` cadrent les lecteurs avec la navigation réelle ; `*-final-*` montrent la section complète (les barres fixes du studio peuvent y apparaître au milieu lors de la capture longue). Ouvrir les PNG en taille originale. [Persistance et concordance des téléchargements](persistence-final-checks.json). Les numéros de versions sont vérifiés après chargement dans `*-edition-ordinateur.png`.

[Télécharger ensemble les huit captures lisibles, quatre MP4, sous-titres et mesures (ZIP)](captures-et-videos-tests.zip?raw=true). Les enregistrements longs des interactions restent disponibles séparément ci-dessus.
