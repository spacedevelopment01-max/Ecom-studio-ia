# Mission 211 — F1 : dialogue SYNA et aperçu Site vérifiés

Le complément de #214 est réalisé sur `codex/211-lot-f-interface`, en instance isolée. Le même assistant, désormais nommé **SYNA**, accompagne le démarrage et les onglets du projet. Les outils D/E ne sont pas étendus dans cette passe. **Aucun merge, déploiement, activation du Studio réel, appel fournisseur réel ni modification client/démo.**

## Version et dépendances

- Code final compilé et réellement capturé : `ad41f4301052a79dfe4e2e735ba8f6a40b5de476`, production, `compiled-build`, arbre propre.
- Dépendance #213 : `f8b1405f037ac73bf5a328a16b71cee76db93e2d` ; puis #212 `d5012ed62a1df08803455e1d9e9af9e3ba8dee9c`, combinaison isolée de #208 `a0246c7753bca30e365d57b4cd8202ce95c3f812` et #210 `2a5e96718a8836d288673f520ef10e89c5a55379`.
- `main` revérifié à `70204a7ff83eb2382835a27a37a8465c0851a70a` ; #208 et #210 restent ouvertes et non fusionnées.
- Les historiques F et C sont conservés dans la branche de recette. Aucune de ces PR ni `main` n’a été fusionnée par cette livraison. La branche de base de #214 est celle de #213 pour présenter les seuls changements F.
- Les preuves ajoutées après compilation ne changent pas le code applicatif. La version du Studio client n’a pas été vérifiée ni mise à jour ; ces captures ne proviennent pas de son instance.

## Comportement livré

L’entrée propose « Quel projet souhaitez-vous créer ? », avec une description libre avant tout formulaire de type. Le formulaire manuel reste accessible. Après enregistrement, le client demande un devis en % puis accepte explicitement le coût avant une réponse. Historique sauvegardé, deux à cinq choix selon le contrat, réponse libre/multiple, inconnu, Pourquoi, retour et correction utilisent le brief natif commun.

SYNA reste disponible dans les onglets. Sur grand écran (à partir de 1280 px), une colonne de 400 px est réservée au dialogue ; elle ne recouvre pas l’aperçu. Au repli, sa largeur mesurée passe de **720 à 1136 px** dans la fenêtre 1440 px. Sur téléphone, un panneau modal se replie pour retrouver le Site. Échap, retour de focus et tabulation dans le panneau sont exercés. Aucun contenu client n’est placé en stockage local du navigateur.

Les contrôles secondaires sont regroupés sous « Outils du site ». Pages, formats ordinateur/téléphone, plein écran, structure, versions et export restent accessibles. L’aide et la stratégie sont repliables dans Site ; une vérification nécessaire reste signalée dans le résumé. Le tutoriel est conservé. La recette le capture puis ferme son conseil avec son bouton normal, sans suppression de DOM ou clic forcé.

SYNA est un nom de présentation : accueil, dialogue, boutons et intitulés accessibles. Aucun second chatbot, renommage des moteurs, migration de données historiques, logo, recherche de marque ou dépense supplémentaire. Les rôles spécialisés restent internes ; leurs contrôles d’interface complémentaires ne sont pas livrés dans F1.

## Défauts reproduits et corrigés

| Constat | Correction et preuve |
|---|---|
| Tutoriel superposé au bouton central | Placement distinct ; clic normal réussi avant fermeture du conseil. |
| Question encore présentée après réponse | Réponse active consultable, retour explicite pour rouvrir ; correction manuelle prioritaire. |
| Choix + texte libre affichés partiellement | Le reçu client complet est affiché ; « Apiculteurs professionnels ; Écoles spécialisées » reste lisible et conservé. |
| Ancienne cible maintenue après inconnu ; propositions périmées à tort ou concurrentes | Correctifs communs dans #213 : inconnu remplace l’actif, Pourquoi ne périme pas un acquis inchangé, version de fiche contrôlée, provenance conservée au rattachement. |
| Trop de hauteur prise par les contrôles sur mobile | Regroupement des outils et repères ; le navigateur vérifie que l’aperçu commence avant la moitié de l’écran. |
| Capture blanche juste après changement d’appareil | Le harnais attend le document, les polices et deux rendus ; recapture du contenu réellement affiché. |
| Captures d’entrée montrant encore l’introduction | Clic sur le bouton normal « Passer » et attente de sa disparition ; introduction du Studio inchangée. |
| Réponse HTTP de création perdue | Projet natif conservé, brouillon retrouvé et rattaché explicitement ; aucun deuxième appel IA. |

Le premier contrôle source du tutoriel supposait une chaîne CSS statique et échouait après son placement conditionnel. Le test a été adapté en gardant les exigences mobiles et les deux placements ordinateur. Son échec initial est déclaré, pas ignoré.

## Parcours réellement exécutés

1. **Produit** : « Je conçois plusieurs capteurs pour les ruches. Aucun chiffre de performance n’est confirmé. » Description → devis → accord → réponse simulée → choix multiple + « Écoles spécialisées » → Pourquoi → inconnu → correction « Apiculteurs professionnels — associations locales » → réouverture → création native et rattachement → même mémoire dans Images puis Site.
2. **Service** : réparation des instruments apportés par les musiciens, devis et rendez-vous, sans vente d’instruments. Même parcours à 390 px ; correction conservée « Musiciens et conservatoires — associations locales ».
3. **Coupure réseau** : création réellement réussie côté serveur, réponse HTTP volontairement interrompue, réouverture par la carte normale du projet, reprise du brouillon dans SYNA. Un seul appel simulé pour cette conversation.

Pour les deux Sites fictifs : aperçu natif ouvert/replié, contrôles manuels conservés, format téléphone, masquage d’une section par la vraie API et restauration depuis la fenêtre des versions. **Trois versions restent enregistrées**, anciennes versions conservées. Le Site utilise des textes de recette et un diagramme technique déclaré ; ce n’est pas une création IA professionnelle ni une modification des compositions de Claude.

## Vérifications et identité des sources

- Suite complète de régression fonctionnelle à `8df2dddabca3f57135d246b41a129d720d8b130b` : **3 594 réussis, 45 ignorés**, 418 fichiers réussis / 1 ignoré, 716,29 s.
- Après cette suite : le harnais attend la fin de l’introduction, puis le complément SYNA change seulement des libellés visibles et les sélecteurs correspondants. Aucun moteur, contrat, test unitaire ou stockage n’a changé. Les deux fichiers applicatifs concernés sont `conversation-panel.tsx` et `home.tsx`.
- Après SYNA : types et **132 tests ciblés réussis**, 11 fichiers, 10,58 s ; build propre final et recette HTTP/Chromium finale réussis à `ad41f4301052a79dfe4e2e735ba8f6a40b5de476`.
- Contrôle Shopify rapide : **24 cas + ZIP client**, aucune erreur ; les 35 avertissements présents par cas restent visibles. Aucun contrôle de thèmes retiré. Pas d’installation/test dans un CMS réel dans cette passe.
- Authentification, CSRF, compte étranger, fournisseur forgé, devis avant appel, reprise, rejet d’une source forgée et conservation de l’acquis sont aussi contrôlés par la recette HTTP du build. Le rejet reste `failed` à 15 %, sans nouvelle tentative automatique.
- **33 PNG originaux et 3 vidéos navigateur** : vues 1440×960, 390×844 et contrôles 360 px. Inspection des planches de toutes les captures et lecture en taille originale des écrans clés ; vidéos vérifiées par ffprobe, nombre d’images identique et trames extraites. MP4 réencodés pour lecture, sans coupe ni changement de vitesse ; WebM sources conservés dans le dossier de recette et reproductibles dans les artefacts CI.

Commandes réellement exécutées :

```bash
npx tsc --noEmit
XDG_CACHE_HOME=/tmp/ecom209-font-cache NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx vitest run
NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx vitest run tests/audit-onglet-boutique.test.ts tests/conversation211-*.test.ts tests/conversation209-*.test.ts
JOBS=2 NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs scripts/verify-theme.sh --rapide
NEXT_TELEMETRY_DISABLED=1 npm run build
CHROMIUM=/usr/bin/chromium PLAYWRIGHT_BROWSERS_PATH=/tmp/ecom211-playwright XDG_CACHE_HOME=/tmp/ecom209-font-cache NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx tsx scripts/verify-agent211-build.ts /tmp/ecom211-F-browser-syna --ui
```

Le réseau fournisseur est interdit ; seul le serveur HTTP local simulé est utilisé. La recette finale compte **6 appels fictifs / 6 usages, 47 472 micro-euros simulés**. **Zéro appel fournisseur réel, coût réel 0 €**. Ces montants ne sont ni une facture ni une preuve de qualité/coût d’un modèle réel.

[Captures et vidéos lisibles](preuves-211-F/README.md) · [preuve HTTP et navigateur](preuves-211-F/api-proof.json) · [sources et commits](preuves-211-F/sources-testes.json) · [commandes/résultats](preuves-211-F/verifications.json) · [inventaire des médias](preuves-211-F/medias.json).

## Fichiers principaux et limites

UI : `conversation-panel.tsx`, `agent-ui-context.tsx`, `home.tsx`, `shell.tsx`, `tab-boutique.tsx`, `tutorial.tsx`, `strategy-status.tsx`, `conversation-presentation.ts`, `ui-enabled.ts` et layouts Studio. Recette : `verify-agent211-build.ts`, `verify-agent211-ui.ts`, `agent211-ui-fixtures.ts`, CI et tests d’affichage/du tutoriel. Les composants et moteurs de thèmes ne sont pas modifiés.

| Périmètre | État réel |
|---|---|
| F1, dialogue SYNA produit/service, persistance, Site et versions manuelles | Vérifié techniquement sur le vrai serveur compilé et Chromium, fournisseur simulé |
| Ancien parcours et droits commerciaux | Conservés, drapeaux A/B/UI fermés par défaut ; pas de migration implicite |
| Ancien projet client réel, téléphone physique/Safari, charge/performance réelle | Non testés ; aucune donnée réelle utilisée |
| Intelligence/qualité réelle, fournisseur réellement utilisable | Non qualifiées, appels réels interdits |
| Photo avant création / consultation d’un lien dans le dialogue | Non raccordées ; limites annoncées dans l’interface |
| Outils métiers D / composition professionnelle E / spécialistes UI complémentaires | Restent à réaliser ou raccorder séparément ; pas annoncés exécutés par F1 |
| CI finale, fusion et activation | CI finale à consulter séparément ; aucune autorisation de fusion ou de mise en service donnée par ce rapport |

Les thèmes validés, les projets VANS/Contretemps et les autres données clients, médias, budgets et historiques restent hors de cette recette isolée. La suite des lots D/E/F se poursuit dans les incréments autorisés ; cette livraison répond spécifiquement aux compléments F1 et SYNA de #214.

## Complément : échec CI du harnais C et correction ciblée (28 octobre, après livraison F1)

La CI `40683690282` de `9ac907c` a échoué dans le job `122800873879`, étape « Rôles bornés lot C sur le build compilé ». Docker, types/tests, Theme Check, build et recettes B/F précédentes avaient réussi ; l’export Shopify compilé suivant n’a pas été exécuté dans ce run. Le journal constate `done != failed` dans le scénario de citation forgée. Ce run n’est donc pas annoncé vert.

Cause vérifiée : le faux fournisseur ne corrompait que `businessEvidence`, mais la fixture du spécialiste avait `business=null`, donc cette preuve de type d’activité n’était pas utilisée. Le test n’avait pas construit le fait client invalide qu’il prétendait tester. Le harnais propose maintenant un changement de champ citant une source inexistante : ce contrôle est exécuté quel que soit le type d’activité. L’assertion exigeant l’échec reste présente, aucun contrôle n’est retiré. Correctif identique à celui déjà vérifié et publié dans D1 #215 ; aucun code applicatif, budget, maquette, capture ou donnée n’est modifié.

Commande rejouée avec succès :

```bash
STUDIO_CONVERSATION_SPECIALISTS=1 NODE_OPTIONS=--import=$PWD/scripts/lot9/network-guard.mjs npx tsx scripts/verify-agent211-build.ts /tmp/ecom211-F-ci-recheck --specialists
```

[Preuve HTTP/SDK/worker de cette contre-vérification](preuves-211-F/ci-c-specialists-proof.json) : même application compilée propre `ad41f4301052a79dfe4e2e735ba8f6a40b5de476`, sources applicatives identiques à la livraison F1 `9ac907c` ; seul le harnais lu par Node est corrigé. Quatre appels locaux simulés, quatre usages / 31 648 micro simulés ; rejet effectif de la citation, état failed avant 100 %, pas de retry automatique. Coût réel nul. Les 33 captures et trois vidéos précédentes restent les preuves de cette même application. La nouvelle CI après publication de ce correctif doit être suivie séparément ; sa réussite n’est pas présumée. Aucun merge ou déploiement.
