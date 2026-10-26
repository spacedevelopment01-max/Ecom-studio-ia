# Candidat final PR202 —5a372b6c, vérification en cours

**SHA figé par Claude : `5a372b6c87b899bdbf1473386160bed7ff20c847`.** Nouvelle copie détachée ; source applicative suivie propre. Arbre `c67f3e1d8c532fc1ffeaa1855aa357556456f14c`. Main d2fb intégré par Claude ; les13fichiers propres à202 sont bit-identiques à la correction9a. Les fichiers FRAISE, menu et stock validés sur198/199/200 sont bit-identiques au main d2fb. [Identité et blobs](identite.json).

**Pas encore d'accord global à cette publication : matrice complète et CI en cours.** Les deux anciens blocages sont levés dans les reproductions achevées ci-dessous. Ce dossier ne remplace pas le futur contrôle APRÈS du main réellement fusionné.

## Résultats réellement achevés sur ce SHA

- **59 tests natifs ciblés réussis, 0 échec, 0 ignoré**, 4fichiers (docs locaux/runtime, theme-v2, site-reproduce, cms-v2), sortie0. [Synthèse et empreinte](tests-cibles-synthese.json), [rapport brut](tests-cibles.json). Aucun test assoupli.
- **Types sortie0**, après correction d'une annotation `unknown` dans le seul harnais indépendant ; le premier typecheck de préparation est conservé `preparation-harnais-types.*`. Aucune correction applicative nécessaire.
- **Preset embarqué illisible simulé : vraie `ShopifyDocsError` remonte** ; jamais `available=false,errors=[]`. [Observation](runtime-bundle-vide.json). `custom-theme.ts` attend cette fonction avant l'enregistrement : l'exception ne passe pas dans son contrôle conditionnel.
- **Deux processus natifs distincts avec ancienne racine documentaire hostile déjà fournie**, XDG absent : chacun disponible, **0erreur**, environnement inchangé, **0requête et0accès au cache SDK**. [Processus1](runtime-racine-fournie-1.json), [processus2](runtime-racine-fournie-2.json), [scénarios avec assertions](scenarios-synthese.json). Les accès au cache sont interceptés et interdits ; la preuve ne repose pas sur la seule résolution de son ancien chemin.
- **Trois appels simultanés** dans un autre processus : **0/1/0erreur**, vraie `LiquidSyntaxError` conservée, environnement cache restauré/inchangé. [JSON](runtime-concurrence.json).
- **Vrai réglage de schéma de section invalide :1ValidSchema**, toujours bloquant. [JSON](runtime-schema-invalide.json).
- **CLI native**, Liquid invalide injecté dans le fichier compilé temporaire →sortie1 et `ERROR LiquidSyntaxError` ; preset embarqué vide →sortie1 et `ShopifyDocsError`. [Synthèse](cli-negatifs-synthese.json), journaux et traces conservés.
- **20documents vérifiés**,7ressources et13schémas, tous JSON valides et bit-identiques à la dépendance installée3.30.1, révision `40f966fc7793462726d9f8573c8d522f8ab44c54`. [Inventaire/SHA256](docs-validation.json). Les mêmes contenus sont servis en mémoire, aucun schéma simplifié.

Les erreurs de documents, les réponses vides et les données des projets sont **simulées et isolées** ; la compilation, le SDK officiel, les fonctions du Studio et les sorties CLI sont **réellement exécutés**. Garde réseau du lot9 et double documentaire préchargées ; toute requête étrangère aux données fictives est refusée. Aucun appel fournisseur réel ni CMS installé.

## Correction et conservation des contrôles

`src/lib/theme/shopify-docs.ts` charge les documents installés et les valide avant usage. Les lecteurs `ThemeLiquidDocsManager.loadResource/loadSchema` servent ces chaînes depuis la mémoire du processus. Plus de téléchargement, plus de cache documentaire sur disque, ni de mutation de `SHOPIFY_TLD_ROOT`/`XDG_CACHE_HOME`. Le contrôle Studio laisse remonter l'erreur documentaire ; le contrôleCMS expose sa cause et ne transforme pas l'absence de mesure en succès.

Le wrapper `scripts/verify-theme.sh` est **bit-identique au main d2fb** : cas, règles de sévérité, codes de sortie et annotations inchangés. Le SDK, son verrou et ses règles restent inchangés. La matrice exhaustive native **204cas+1ZIP=205contrôles** s'exécute sous interdiction de réseau et d'accès au cache SDK ; son résultat final sera ajouté, pas supposé.

La [CI40353362722](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40353362722) concerne cette tête. Son checkout réel de PR est la fusion synthétique GitHub `726d3508efa0efece3c95e4de618c4531bda81ac`, **arbre identique au candidat** ; ce n'est pas un main fusionné. Docker est terminé vert (build, workeractif, accueil200, inscription200, FFmpeg), [journal relu](ci-docker.log). Suite principale et ThemeCheck encore en cours à cette publication ; aucune CI globalement verte annoncée.

## Préparations, limites et suite

La passe9a a atteint la limite mémoire en multipliant les contrôles : types tué137 ; Vitest sort1 avec40/59achevés et avertissement de rapport incomplet, malgré son champ `success=true`. [Dossier de préparation9a](../9a292acf/README.md), jamais qualifié vert. Cette tête a ensuite été remplacée par5a intégrant les corrections de main. Son fragment de matrice est interrompu143, conservé ; les contrôles sont repartis sur le SHA figé, types et tests séparés. Des fichiers suivis rigoureusement identiques ont été reliés par liens physiques dans mes seules copies pour récupérer640Mo, sans changer leurs octets ; [relevé](preparation-deduplication.json). Données, médias et sources de l'utilisateur non touchés.

**Deux scripts de preuve historiques hors garantie** : `scripts/mission154/export-proof.ts` et `scripts/cms-v2/catalogue-archives-proof.mts` importent encore directement le SDK. Signalé à Claude ; aucune affirmation que tous les anciens outils sont migrés. Les consommateurs produit, la CI et les scripts explicitement migrés passent bien par le nouveau chargeur.

Les [harnais indépendants et l'orchestrateur des scénarios](run-scenarios.py) sont joints avec leurs sorties. Les fichiers `.txt` gardent les sources des sondes. Bases fictives non publiées. Aucune clé, donnée client, fusion, publicationclient, paiement, API fournisseur ou déploiement. Le main futur après202 et le studio utilisateur effectivement servi restent **non vérifiés** à ce stade.
