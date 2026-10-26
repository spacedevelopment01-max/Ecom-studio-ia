# Candidat PR202 —5a372b6c BLOQUÉ dans le build de production

**SHA figé par Claude : `5a372b6c87b899bdbf1473386160bed7ff20c847`.** Nouvelle copie détachée ; source applicative suivie propre. Arbre `c67f3e1d8c532fc1ffeaa1855aa357556456f14c`. Main d2fb intégré par Claude ; les13fichiers propres à202 sont bit-identiques à la correction9a. Les fichiers FRAISE, menu et stock validés sur198/199/200 sont bit-identiques au main d2fb. [Identité et blobs](identite.json).

**Verdict : BLOQUÉ**, malgré la matrice205 et la vraieCI désormais entièrement vertes. Les deux anciens blocages sont levés dans les reproductions natives ; un nouveau défaut est reproduit dans l'export du vrai build de production. Ce dossier ne remplace pas le futur contrôle APRÈS du main réellement fusionné.

## Blocage de production — cause confirmée dans le JavaScript servi

**REPRODUIT deux fois, avec puis SANS double documentaire**, sous garde réseau. Compte client fictif, forfait de test, projet produit isolé, vrai serveur `next start` issu du build5a, Studio réellement ouvert à1440/390. Version réellement servie **5a372b6c/compiled-build**, [JSON témoin](production-temoin/version-compilee.json).

L'exportShopify répond200 et sauvegarde un ZIP **PROVISIONAL** ; sa compatibilité reste **non mesurée**. Le compteur `stats.themeCheckErrors` est absent, raison enregistrée : **« Theme Check indisponible : Cannot read properties of undefined (reading 'resolve') »**. [Observation réelle du second passage sans double](production-temoin/cosmetic-export-observation.json). L'assertion `meta.stats.themeCheckErrors===0` échoue et reste inchangée. Le parcours service n'est pas exécuté après cet arrêt ; aucune réussite complète produit+service revendiquée.

**CONFIRMÉ DANS LE CODE COMPILÉ** : Next/Webpack transforme le résolveur de `installedDocsDir()` en **`(void 0).resolve("@shopify/theme-check-docs-updater/package.json")`**. Le build avait signalé `module.createRequire failed parsing argument`. [Extrait compilé et SHA256 du chunk](production-resolution-compilee.json), [journal de build](build.log), [échec témoin](production-temoin.log), [serveur témoin](production-temoin/serveur.log).

Ce n'est pas un défaut du SDK simulé : le deuxième passage utilise seulement la garde réseau, sans la double de `node-fetch`/cache. La cause est la résolution de dépendance du helper dans le bundlingNext, alors que TSX et le worker source n'ont pas cette transformation. Les assertions de version compilée passent avant l'export. Le statutPROVISIONAL et la liste des critères non mesurés restent honnêtes ; **le contrôle attendu ne fonctionne néanmoins pas dans le build servi**, ce qui bloque l'accord demandé.

Défaut transmis à Claude dans202/6421352414 et6421386245, ainsi que194/195. Résoudre cette cause dans le helper, puis vérifier le vrai build et ses exports ; ne pas supprimer le contrôle ni sa mesure pour verdir le test. Aucun correctif concurrent de ma part.

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

Le wrapper `scripts/verify-theme.sh` est **bit-identique au main d2fb** : cas, règles de sévérité, codes de sortie et annotations inchangés. Le SDK, son verrou et ses règles restent inchangés. **Matrice exhaustive native terminée :204cas+1ZIP=205contrôles réussis,sortie0,205processus,0téléchargement et0accès au cache SDK.** [Synthèse](matrice-synthese.json), [journal complet](matrice-complete.log), [204journaux détaillés](matrice-cas), [journalZIP](matrice-zip.log), [trace](matrice-complete-trace.jsonl). Les avertissements préexistants sont conservés, notamment35par cas ; absence d'erreur bloquante ne signifie ni zéroavertissement ni qualité créative validée.

La [CI40353362722](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40353362722) est **terminée entièrement SUCCESS**, journaux relus : **3409réussis/0échec/31ignorés**,400fichiers réussis/1ignoré,types,205ThemeCheck,build58pages,Dockerworkeractif/accueil200/inscription200/FFmpeg. [Identité finale](ci-identite.json), [journal principal](ci-principal.log), [Docker](ci-docker.log). Son checkout réel de PR est la fusion synthétique GitHub `726d3508efa0efece3c95e4de618c4531bda81ac`, **arbre identique au candidat** ; ce n'est pas un main fusionné. **Ces verts ne couvrent pas l'export sur le build réellement servi**, dont le défaut bloque ce verdict.

Le **build local** est également réussi,58pages ; ses avertissementsWebpack ne sont pas masqués. [Sortie0](build.exit). Quatre captures natives du premier projet (deux passages,1440/390) sont jointes dans les dossiers de production ; il s'agit de fixtures techniques, pas de créations professionnelles ou de données client. Les ZIP, bases et sessions fictives restent locaux.

## Préparations, limites et suite

La passe9a a atteint la limite mémoire en multipliant les contrôles : types tué137 ; Vitest sort1 avec40/59achevés et avertissement de rapport incomplet, malgré son champ `success=true`. [Dossier de préparation9a](../9a292acf/README.md), jamais qualifié vert. Cette tête a ensuite été remplacée par5a intégrant les corrections de main. Son fragment de matrice est interrompu143, conservé ; les contrôles sont repartis sur le SHA figé, types et tests séparés. Des fichiers suivis rigoureusement identiques ont été reliés par liens physiques dans mes seules copies pour récupérer640Mo, sans changer leurs octets ; [relevé](preparation-deduplication.json). Données, médias et sources de l'utilisateur non touchés.

**Deux scripts de preuve historiques hors garantie** : `scripts/mission154/export-proof.ts` et `scripts/cms-v2/catalogue-archives-proof.mts` importent encore directement le SDK. Signalé à Claude ; aucune affirmation que tous les anciens outils sont migrés. Les consommateurs produit, la CI et les scripts explicitement migrés passent bien par le nouveau chargeur.

Pour tenir l'espace isolé, les seuls dossiers compilés de138cas **déjà terminés avec succès** ont été retirés après conservation de chaque fichier dans un [manifesteSHA256](compiled-termines-manifestes.jsonl), de leurs journaux et résultats. [Relevé](liberation-compiles-termines.json). Aucun cas encore actif, aucune source, assertion ou règle modifié. Les204journaux complets et leZIP ont été recueillis avant le nettoyage normal du wrapper, [collecte](collecte-journaux.json).

**Niveau de preuve historique** : les anciens journaux prouvent un schéma illisible(offset0),pas son statutHTTP exact. Réponse vide et429 sont des simulations reproduites ; un429 historique et un nombre exact de requêtes ne sont pas établis. Le SDK téléchargelatest à chaque setup,les autres documents si la révision change ; ~4000requêtes n'est pas un comptage observé. Le correctif mémoire évite bien ces téléchargements dans les contrôles natifs testés.

Les [harnais indépendants et l'orchestrateur des scénarios](run-scenarios.py) sont joints avec leurs sorties. Les fichiers `.txt` gardent les sources des sondes, dont le contrôle de production et ses assertions conservées. Bases fictives non publiées. Aucune clé, donnée client, fusion, publicationclient, paiement, API fournisseur ou déploiement. Main encored2fb au relevé ; **pas de fusion202 ni de verdict APRÈS202**,en attente du correctif et du nouvel accord sur son SHA exact. Le studio utilisateur effectivement servi reste hors accès de cette copie isolée.
