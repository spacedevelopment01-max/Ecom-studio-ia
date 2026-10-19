# PR #140 — parcours vidéo, corrections ciblées et devis ONDE

État du 19 octobre 2026. Missions lues intégralement : [6265941030, vidéo existante](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/140#issuecomment-6265941030) et [6266012060, devis ONDE sans génération](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/140#issuecomment-6266012060). Accusé de réception [6266084576](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/140#issuecomment-6266084576).

**Livraison partielle du parcours vidéo, avec défauts techniques corrigés et trous fonctionnels identifiés. Le rendu premium ONDE complet et une conception organique vidéo réellement distincte ne sont pas déclarés livrés. Aucun appel IA payant, achat, débit de crédits, publication sociale, merge ou déploiement. Coût fournisseur réellement engagé : 0 €.**

## Version, périmètre et coordination

- Dépôt `spacedevelopment01-max/Ecom-studio-ia`, branche `codex/publications-ia-qualite`, PR #140, base `codex/parcours-amont-projet`.
- Commit de départ distant : **`1565275c8edf57044159971dba8c28c5ee3f71da`** ; récupération Git effectuée, puis vérification par le connecteur GitHub. Arbre initial propre ; `CLAUDE.md` lu intégralement. Aucune instruction AGENTS trouvée dans les emplacements examinés.
- Code testé : **c5f74c437b3c3644024329b3d86bb45e2a500f18**. Le commit de rapport/preuves le suit sans autre changement applicatif ; empreintes dans [le dossier de réception](../../reports/pr140-video/README.md).
- PR #139 de Claude contrôlée à `4869be69f02e59c929d00437e7f15ad0223e2ee6`, ouverte et non fusionnée. Aucun changement dans ses thèmes, galerie, éditeur de thème, exports ou vitrine. Les tests d'exports finaux attendent son raccordement. L'audit général des exports n'est pas relancé.
- Les essais utilisent exclusivement des comptes, projets, sessions, images et clips synthétiques dans des dossiers `ecs-test-*`. Aucun contenu client ni secret n'est publié. Les anciens rapports ne servent pas de preuve de la version actuelle.

## Ce qui est raccordé

| Parcours | Écran et entrée réels | Raccordement | Vérification de cette passe | Limite |
|---|---|---|---|---|
| Publicité produit guidée | Publicités → Publicité vidéo → `GuidedVideo as="ad"` | `/creative/video` → `video.scenes` → `runThreeScenes` | Fournisseurs injectés, interruption/reprise native, vrai MP4 vertical 20 s, lecture UI ordinateur/mobile | Ni génération fournisseur ni fidélité réelle du produit testées ; vision des clips absente de ce parcours |
| Publicité service guidée | Même onglet ; prestation sélectionnable | Même job ; `findStockClip` / Pixabay par étape en production | Trois clips synthétiques distincts, montage portrait 10 s, provenance de test, lecture UI | Aucun appel Pixabay réel ; sélection sémantique et droits d'un vrai média non validés par les mires |
| Vidéo depuis Publications | Publications → Vidéo → `GuidedVideo as="post"` ; création unitaire/lot également présents | Guidée : `video.scenes` ; unitaire/calendrier : `realSocialDeps.video` → moteur V2 | Montage guidé carré 10 s, rangement social, lecture dans le véritable onglet | **Partiel** : la conception réutilise encore une direction commerciale ; transport éditorial insuffisant dans le raccord V2 |
| Documents vidéo modifiables | Publicités et banque/vidéos selon le type | `/videos/v2`, `/videos/v2/[docKey]` ; `video.v2`, `.clip`, `.render` | Tests existants exercés dans la suite ; versions et rendu local conservés | Voix réelle `null` dans `realVideoDeps` ; qualité réelle des voix et fournisseurs non testée |

Les boutons ne sont pas considérés comme une preuve de raccordement : les routes, gestionnaires, appels et fichiers ci-dessous ont été lus. Les six inspections UI de cette passe vérifient navigation, avertissements, lecture et refus de durée ; **elles ne lancent pas une production IA depuis le navigateur**. L'orchestration de production est exercée séparément, avec `JobContext` et outils injectés.

## Parcours guidé reconstitué

1. `GuidedVideo` garde `as`, sujet sélectionné, demande, ratio, durée, nombre de scènes et musique. L'API `quote` calcule le coût et les droits ; `create` revérifie propriétaire, forfait, devis accepté et tâche active. Un devis consultable n'accorde pas un droit de création.
2. L'API enregistre `video.scenes`, demande et plafond de tâche. `worker/handlers.ts` recharge le projet et branche `realThreeScenesDeps`. Les plafonds globaux, réservations et journaux restent ceux du studio.
3. `runThreeScenes` résout le sujet, construit le contexte de ce produit/service, charge mémoire créative et charte, prépare `CreativeBrief` et storyboard. `writePlan` reçoit une partie du Project Brain et la demande ; sinon un plan local explicitement signalé est utilisé. **Une erreur de rédaction ne devient plus un succès local silencieux.**
4. Produit : référence stable du projet → image intermédiaire → clip fournisseur. Service : recherche Pixabay par étape, filtrage et provenance via les fonctions existantes. Des points de reprise séparés conservent désormais scénario, image et scène ; une image obtenue n'est pas régénérée parce que son clip a échoué.
5. Le document contient clips, titres, carte graphique finale avec le logo disponible, charte et musique. La durée propre de cette carte est désormais incluse dans la durée demandée. Voix locale seulement si installée et activée ; sous-titres alors répartis sur les durées de phrases mesurées. Son absence est conservée jusqu'à la carte UI.
6. `renderVideoFile` / `renderVideoDoc` : décodage, recadrage sans étirement, calques, sous-titres, mixage local, H.264/AAC. `finalCheck` inspecte le fichier rendu ; une correction locale ciblée de contraste est possible. Ce contrôle technique n'établit pas la fidélité produit ou l'orthographe.
7. `saveRendered` sauvegarde MP4, affiche, SRT/VTT ; `saveVideoVersion` garde les versions. Banque `videos.ads` pour une publicité, `videos.social` pour une publication, `videos.shop` selon la destination du moteur V2. Les images/clips/voix intermédiaires guidés respectent désormais aussi la séparation publicité/publication.
8. La carte UI donne accès à la lecture, au téléchargement et à l'éditeur existant. Elle affiche maintenant **« Vidéo rendue — à vérifier »**, les réserves, les défauts du contrôle et les points non vérifiés ; un statut de job terminé ne vaut pas approbation créative.

Autre parcours : le moteur V2 estime les plans via son catalogue et `chooseProvider`, construit un script/storyboard, résout ou génère des médias, contrôle les clips et le document, puis rend et stocke les versions. Les capacités déclarées, une clé active, un tarif et une confirmation administrative sont distingués dans son choix. Cela ne prouve pas un accès fournisseur de production. Son inventaire, ses relectures et ses reprises ne sont pas automatiquement ceux de la création guidée.

## Défauts corrigés et preuves

| Constat | Qualification | Conséquence avant correction → comportement livré | Fichiers / fonctions |
|---|---|---|---|
| Durée/scènes impossible acceptée | **CONFIRMÉ DANS LE CODE, REPRODUIT** par test en échec avant correction | 1 scène / 60 s devenait environ 19 s ; refus avant devis accepté et avant fournisseur | `three-scenes.ts::sceneTimingIssue`, `quoteScenes`, `runThreeScenes` |
| Durée réelle trop longue | **REPRODUIT, OBSERVÉ DANS LES FICHIERS LOCAUX** | Une demande 20 s donnait **20,24 s**, 607 images vidéo ; la carte de fin de la direction s'ajoutait au découpage. Réception corrigée : **20,00 s**, 1080 × 1920, 30 i/s | `sceneTiming`, calcul après `buildCreativeBrief` ; régression dédiée et `ffprobe` |
| Exception de scénario avalée | **CONFIRMÉ DANS LE CODE, REPRODUIT** | Une erreur fournisseur, potentiellement incertaine, passait à un scénario local ; l'erreur remonte désormais, aucun clip lancé | `runThreeScenes`, point de reprise du scénario |
| Image/scénario refaits après échec du clip | **CONFIRMÉ DANS LE CODE, REPRODUIT** | Une seule étape englobait image + mouvement. Points séparés, résultat final mémorisé et document déjà acquis conservé | `runThreeScenes` et `JobContext.step` existant |
| Service livré avec scène manquante | **CONFIRMÉ DANS LE CODE, REPRODUIT** | Deux plans sur trois pouvaient suffire, avec durée réduite ; une scène absente/trop courte bloque la livraison et laisse les acquis en base | `runThreeScenes`, branche stock ; ancien test modifié pour vérifier le refus, pas assoupli |
| Organique rangé en publicité et progression trop rapide | **CONFIRMÉ DANS LE CODE, REPRODUIT** | Images/clips/voix guidés allaient toujours dans `videos.ads` ; progression pouvait dépasser 100 % avant montage à six scènes. Destination explicite et progression proportionnelle | `runThreeScenes`, `addVoice` |
| Reprise d'une version retouchée | **CONFIRMÉ DANS LE CODE, REPRODUIT** | Une reprise pouvait redevenir la dernière version après une retouche. Refus avant nouveaux appels et avant sauvegarde du document lorsqu'une version client est détectée | `videoUserOwned`, `runThreeScenes` |
| Montage gratuit sans forfait à cette frontière | **CONFIRMÉ DANS LE CODE ; refus et droit payé vérifiés par le test après correction** | La branche stock gratuite pouvait être mise en file sans `requirePlan` ; contrôle natif ajouté. Devis consultable, création sans forfait 402, avec forfait accepté et devis approuvé 200, propriétaire étranger 404 | `/creative/video::POST`, test de route |
| Réserves gardées dans les métadonnées mais perdues à l'affichage | **CONFIRMÉ DANS LE CODE, REPRODUIT** via GET et navigateur | Absence de voix et fidélité non vérifiée invisibles sur la carte ; transport des notes/contrôles et état « à vérifier » explicite. Cartes désormais sur toute la largeur mobile | `/creative/video::list`, `guided-video.tsx` |

Les points de reprise réduisent les répétitions évitables ; **ils ne prouvent pas une garantie transactionnelle entre le dernier octet fournisseur, le fichier et SQLite**. Une interruption dans cette fenêtre et les expirations fournisseur demandent encore une réception spécifique. La conservation des versions est vérifiée avant les points de contrôle ajoutés, pas pour toutes les courses possibles pendant l'encodage.

## Vérifications réellement réalisées

Résultats finaux et empreintes : [index de réception](../../reports/pr140-video/README.md), [MP4 et reprise](../../reports/pr140-video/validation.json), [UI](../../reports/pr140-video/validation-ui.json). Les projets secondaires de la preuve UI ne prouvent pas un droit de lancement : seule la lecture y est exercée ; le droit de création est vérifié séparément par le test API avec abonnement natif. Les comptes et clés de session restent dans le dossier privé de test, jamais dans Git.

```bash
npx tsc --noEmit
npx vitest run
npx vitest run tests/video-mission-reliability.test.ts tests/video-creation-rights.test.ts tests/video-scenes.test.ts tests/video-creative-guide.test.ts
DATA_DIR=/tmp/ecs-test-video-mission-20261019-reception STOCK_OFFLINE=1 npx tsx scripts/verify-video-mission.ts
# Serveur local seul, sans worker ni accès de production :
DATA_DIR=/tmp/ecs-test-video-mission-20261019-reception STOCK_OFFLINE=1 npx next dev -p 3134
DATA_DIR=/tmp/ecs-test-video-mission-20261019-reception npx tsx scripts/verify-video-mission-browser.ts
DATA_DIR=/tmp/ecs-test-video-quote-20261019-final STOCK_OFFLINE=1 npx tsx scripts/verify-video-quote.ts
git diff --check # code
git -c core.whitespace=-blank-at-eof diff --cached --check # exports VTT
```

**Bilan final de la suite : 286 fichiers réussis, 2 182 tests réussis, 3 ignorés (2 185 au total), 792,59 s, code de sortie 0.** Typage : réussi, code de sortie 0. Les tests ciblés incluent les quatre régressions initialement rouges, la durée de carte finale, la conservation de retouches, les droits et les réserves dans la réponse API.

Réception locale : trois fichiers H.264/AAC à 30 i/s ; produit 20 s en 1080 × 1920, service publicité 10 s en 1080 × 1350, service publication 10 s en 1080 × 1080. Chaque fichier est décodé intégralement par FFmpeg. Pistes et loudness mesurées, musique locale ; **aucune voix parlée réelle**, aucun modèle de voix disponible dans cet environnement. SRT vides / VTT sans cues dans ces cas sans voix : ce sont des exports présents, pas une preuve de sous-titrage français synchronisé. Les tests de mixage/sous-titres du moteur V2 utilisent une voix synthétique de test, pas une voix ONDE validée.

Produit : interruption simulée avant le deuxième clip, après sa deuxième image ; reprise native avec **1 scénario, 4 images, 5 appels de clip dont l'échec simulé, 1 rendu**. Rejouer la tâche terminée ne rappelle aucun outil et n'ajoute aucune version ; la retouche client est ensuite conservée et une reprise directe refusée. Services : trois sources locales par vidéo, aucune génération. Zéro ligne `ai_calls`, zéro coût réel. Les mires ne valident ni réalisme, ni pertinence métier, ni voix naturelle.

UI : six inspections produit/service/publication × ordinateur/mobile, lecture réelle des MP4, avertissements ouverts, refus visible de 1 scène / 60 s et bouton désactivé. Les requêtes non locales sont bloquées ; seules les lectures et POST `action=quote` sont autorisés par le harnais. Pas de clic de génération ni mutation de contenu par le navigateur. Les écrans sont des projets de test préparés pour cette réception, **pas une preuve de création complète depuis un projet vierge**.

Préflights conservés comme diagnostics, pas preuves finales : quatre tests rouges avant correction ; ancien test qui attendait l'abandon d'une scène devenu incompatible avec l'exigence de complétude ; fixture API complétée avec origine et accord du devis natifs ; échec 20,24 s corrigé sans élargir l'assertion à 0,24 s. Plusieurs suites interrompues lors des corrections : seuls les résultats finaux ci-dessus comptent. Premier essai Node/FFmpeg sous profil restreint : `spawnSync ffmpeg EPERM` malgré un exécutable fonctionnel. Profil d'exécution pris en charge ensuite utilisé ; aucune protection applicative affaiblie ni appel fournisseur ajouté. Les VTT sans cues conservent leur en-tête valide `WEBVTT` suivi de la ligne vide : le contrôle des pièces utilise uniquement une exception `blank-at-eof`, sans modifier ces exports. Le contrôle standard du code est réussi. Pas de nouveau build de production ni de déploiement prétendu ; UI testée avec le serveur de développement de cette copie.

## Limites importantes qui restent à traiter

1. **CONFIRMÉ DANS LE CODE — organique incomplet.** `realSocialDeps.video` transporte surtout pilier/titre, sans contrat éditorial complet ni finalité organique explicite. `scriptSystem`, `videoStrategy`, `dressPromo` et le prompt guidé restent orientés publicité ; pour un service, le CTA local demande encore contact/devis. Le moteur organique n'est donc pas validé comme conseil/FAQ/checklist fidèle au brief. Raccordement minimal recommandé : transmettre le contrat organique existant jusqu'au script/storyboard, CTA éditorial facultatif et destination explicite, puis tester les deux onglets. Aucun nouvel écran ou second moteur créé dans cette passe.
2. **CONFIRMÉ DANS LE CODE — contrôle visuel absent du parcours guidé produit.** Images puis clips y sont sauvegardés sans relecture vision systématique. `finalCheck` marque correctement fidélité/orthographe non vérifiées ; ses empreintes et mesures ne peuvent ni juger le mouvement continu, ni découvrir une autre marque sur un objet. Les intermédiaires sans `meta.gate` peuvent aussi rester réutilisables selon la compatibilité historique de `isAutoUsable` : conserver les fichiers ne doit pas devenir une approbation automatique. À raccorder avec la barrière existante, sans effacer les acquis.
3. **CONFIRMÉ DANS LE CODE — devis natif non spécifique.** `aiPostProbableMicro` comprend conception/contrôles sociaux, alors que le parcours guidé ne réalise pas ces mêmes postes à chaque scène ; `estimateMicro("blog")/10` sert à la rédaction vidéo. Tarifs connus ne veulent pas dire estimation exacte du travail réellement exécuté. Le devis ONDE ci-dessous sépare cette estimation générique du rendu cible.
4. **CONFIRMÉ DANS LE CODE, disponibilité locale vérifiée — voix limitée.** Guidée : voix locale conditionnelle, phrases longues retirées si elles ne tiennent pas, synchronisation répartie à la phrase, voix choisie par famille plutôt qu'une voix ONDE persistée constatée. V2 : `voice: null`. Absence maintenant visible, mais la promesse de voix française naturelle du projet n'est pas reçue ici.
5. **CONFIRMÉ DANS LE CODE — résultat simplifié possible ailleurs.** `creationSceneVideos` peut remplacer un échec par un montage local ; V2 peut utiliser photo animée/typographie si un plan manque, est refusé ou dépasse le budget. Ces chemins sont conservés et signalés dans les notes, mais ne satisfont pas par eux-mêmes la demande de quatre vrais clips premium. Ils ne doivent pas servir de preuve du devis ONDE.
6. **À VÉRIFIER — production, jobs longs et édition.** Adaptateurs, gardes budgétaires et suivi d'identifiants asynchrones existent. Pas de vérification fournisseur réelle de résultat incertain, tâche expirée, facturation/download après interruption, annulation pendant appel, ni de concurrence réelle entre édition et encodage. Les tests existants en simulation ne remplacent pas ces observations. Pas de qualification de toutes les retouches, de tous les quatre ratios ou du format paysage dans cette réception ciblée.
7. **À VÉRIFIER — droits média et audio final.** Provenance/licence des vrais plans Pixabay et de la piste finale, recadrage du geste, qualité naturelle/prononciation et voix projet. Aucune connexion nouvelle ni contrôle de compte fournisseur déployé. Aucun journal de production accessible ; tous les journaux examinés sont locaux à cette réception.

## Devis ONDE ajouté à la mission

**[Devis détaillé, postes, sources officielles datées, calculs, forfaits et écarts de chaîne](../../reports/pr140-video/DEVIS_ONDE.md).** Il reprend le brief exact : 20 s, quatre clips d'environ 5 s, 9:16, casque fidèle, dernier clip avec logo/CTA, voix française du projet, sous-titres et musique autorisée.

| Montant conditionnel | USD fournisseur | Conversion illustrative au repli du dépôt : 0,86 EUR/USD |
|---|---:|---:|
| Premier passage cible | **1,3170 $** | **1,13262 €** |
| Avec une scène vidéo refaite et ses contrôles | **1,5645 $** | **1,34547 €** |
| Maximum du rendu cible | **Non attestable tant que les maillons et reprises ne sont pas raccordés** | `min(plafond de tâche validé, budget disponible)` |

Le plafond natif guidé serait **1,389332 € sous les hypothèses de route/tarif détaillées**, mais il concerne la chaîne actuelle incomplète, pas un prix maximal garanti du rendu premium. Le brief cible demande un habillage dans le quatrième clip ; le montage actuel ajoute un cinquième segment graphique. Logo ONDE séparé, vues supplémentaires et voix projet non retrouvés ici. Aucune configuration déployée inventée, aucun nouveau produit client créé pour le devis. Une ancienne fixture technique héritée nommée « Onde Pro » a été utilisée au préflight sans référence ONDE ; elle a été renommée explicitement « mire technique » dans la réception finale pour éliminer l'ambiguïté.

Le devis conserve les formules de plafonds **40 % de l'abonnement HT / 50 % de la recharge HT**, distingue Créer (sans droit vidéo IA), Développer et Dominer, et ne garantit aucun quota mensuel de vidéos. Coût API réel de cette passe : **0 €**. Aucun tarif commercial par vidéo fixé : le futur rendu consommera le crédit inclus après accord distinct.

## Suite recommandée avant un essai réel

Raccorder **dans le moteur existant** un contrat vidéo explicite publicité/organique, la relecture visuelle des images/clips et leur statut de réutilisation, l'habillage du dernier clip et le devis de toutes les étapes. Réutiliser les voix/logo/références réellement validés ; si absents, bloquer la promesse correspondante. Conserver les étapes réussies et appliquer un plafond/reprise explicites à cette chaîne exacte, plutôt que recopier les limites d'un autre moteur.

Petit protocole réel futur, **non lancé et non autorisé par ces commentaires** : confirmer les réglages déployés et ressources ONDE ; montrer scénario/quantités/résolutions/devis actualisés et obtenir l'accord ; quatre clips de 5 s maximum au premier passage, 20 s générées, une seule finale ; une scène reprise uniquement après nouveau devis explicite si nécessaire (25 s générées au total dans ce scénario). Compter chaque image intermédiaire, scénario, voix et contrôle réellement effectué ; conserver identifiants fournisseur, réservations, durées d'usage et facture. Écoute et inspection du début/milieu/fin de chaque clip, produit/référence, marques, continuité, texte/voix/cues, fichier 1080 × 1920, sauvegarde et reprise sans repayer les trois autres clips. Aucun lancement si un coût ou une issue fournisseur reste inconnu. Aucun essai automatique supplémentaire, ni matrice payante.
