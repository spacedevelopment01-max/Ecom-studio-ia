# #211 — D11c : production sociale native, versions et acquis

Livrable technique pour revue, 30 octobre 2026. **#211 et D11 restent partiels.** Aucun fournisseur réel, coût réel **0 €**, fusion, activation, déploiement ou modification de client/composition Claude.

Code contrôlé : `748b53311e8fc04d002c1c7b5a8b2a7eefa45cc0`. Next compilé : `0aca203b9f07fc48c4778fe9c1f6ee5d3105ca7b`, production/arbre propre attestés par `/api/version`. Le second commit corrige le worker exécuté par tsx, un test et le harnais ; **aucune différence dans `src` ou la CI entre ces deux SHA**. Build conservé, sans répétition. La CI finale doit compiler et contrôler la tête publiée entière ; elle n’est pas présumée verte.

## Corrections et preuves

- **REPRODUIT puis corrigé :** édition du texte, des médias ou suppression pendant l’acquisition : ancien média attaché à une nouvelle version, compteur de succès faux ou ajout d’usage sur destination absente. `social-v2/production.ts` relit les données avant chaque nouvel envoi et avant l’attache transactionnelle ; contrôle réel du nombre de lignes modifiées. Le fichier et son coût acquis restent conservés ; aucune relance automatique.
- **CONFIRMÉ DANS LE CODE / REPRODUIT :** le worker ne connaissait pas la version au moment de l’accord HTTP. La route native `social/v2` fige maintenant `productionInputVersions`, sans accepter une empreinte fournie par le navigateur ; changements du texte, du contexte ou disparition avant exécution arrêtés avant acquisition. Une liste vide/étrangère ne crée plus une tâche vide.
- **REPRODUIT dans la recette compilée puis corrigé :** le gestionnaire refusait bien une version obsolète, mais recevait encore 100 % du callback final. `worker/handlers.ts` réserve 100 % à la réussite de la tâche ; aucune production complète entraîne un échec explicite. Trois tâches réelles du worker isolé sont désormais `failed`, progression **0**, sans appel ni réservation.
- **CONFIRMÉ DANS LE CODE / TESTÉ SUR DOUBLES :** les brouillons liés à une fiche native pouvaient perdre leur produit/variante/service au profit du produit principal. `native-subject.ts`, `production.ts`, `deps.ts` et `ai-post.ts` transmettent l’offre native exacte, ses prix en centimes, sa marque et la référence désignée. Photo ambiguë/absente ou ancienne version refusée avant paiement ; aucune substitution du produit principal. Relecture explicite de l’angle service toujours exigée.
- **REPRODUIT / TESTÉ SUR DOUBLES :** une garde de contexte interrompue avant QC pouvait laisser un reçu d’envoi trompeur. `publication-recipe.ts` et `ai-post.ts` contrôlent avant prise de reçu/envoi, y compris quand une autre prise atomique gagne. Un résultat réellement incertain reste bloqué. Après restauration du contexte exact, copie/image acquises relues sans nouvel achat ; seul le contrôle manquant reprend.
- **VÉRIFIÉ par HTTP compilé :** une image native déjà acquise et compatible reste réutilisable à coût nul même si sa photo source a été retirée. L’offre/marque/fingerprint restent contrôlés ; autre produit refusé. `image-tool-sources.ts` conserve sa provenance. Même ID puis fichier téléchargé, SHA-256 identique `b0e4e9fb…735b8ee`. C’est une mire synthétique, aucune preuve de qualité créative.

## Vérifications réellement exécutées

Dans une copie isolée sans `.env`, avec garde réseau interdisant les fournisseurs externes :

1. `npm test --` avec les dix fichiers ciblés : **111 tests réussis**, dont produit/service/variante, changement pendant acquisition, prix et sécurité partagés. Voir le journal sélectionné. Tests simulés, aucun transport fournisseur réel.
2. Après la correction de concurrence du reçu : `npm test -- tests/publication-input-guard.test.ts tests/ci-native-social-placement.test.ts` : **5 réussis**. Après le défaut de progression : `npm test -- tests/social-production-confirmed-version.test.ts tests/publication-input-guard.test.ts` : **10 réussis**. Ces nombres recouvrent en partie les précédents, ne pas les additionner comme des suites indépendantes.
3. `npm run build` sur `0aca203b` et `npm run typecheck` final sur `748b5331` : réussis, sources stables. Pas de nouvelle suite complète locale redondante ; CI complète finale exigée.
4. `node node_modules/tsx/dist/cli.mjs scripts/verify-social-production211-build.ts <sortie-isolée>` : vrai serveur Next compilé + routes authentifiées + vrai worker. Accord HTTP puis modification de texte/contexte/suppression : trois échecs, progression0, sources conservées, **0 appel au faux endpoint local aussi**. Compte étranger404, CSRF403, cible vide400. Réemploi gratuit :1production,0coût,0job/0appel nouveau, fichier identique servi. [Résultat](preuves-211-D11c/native-production-proof.json).

Deux essais antérieurs sont explicitement non réussis : le harnais tentait plusieurs projets avec un seul abonnement (garde native correcte, corrigé par comptes synthétiques distincts) ; puis la recette a révélé le vrai défaut100% corrigé ci-dessus. Les essais unitaires initiaux ont également identifié des fixtures service sans relecture d’angle ; les tests positifs passent par `reviewServiceCommunication`, le cas non relu reste refusé. Aucune protection affaiblie.

Les fichiers, SHA et commandes exacts figurent dans [211_D11C_PREUVES.json](211_D11C_PREUVES.json). Six petites preuves sélectionnées, dont quatre journaux ciblés et un fichier synthétique ; pas de répétition des films. L’interface n’a pas changé depuis #254 : ses captures/film restent les preuves UI précédentes, **pas une nouvelle recette navigateur D11c**. Cette livraison vérifie des routes HTTP et le worker, pas un nouveau rendu créatif.

## Dépendances et limites

- Branche dédiée basée sur #254 `1190e0ce` ; correction de placement CI de #254 `d62aa36c` conservée **par contenu**. Ne pas l’appliquer deux fois. Dépend aussi de #253/#252/#251 ; aucune fusion/rebase de leurs branches ni de Claude. Les étapes antérieures de CI restent présentes ; recette D11c ajoutée au job ayant installé et compilé le Studio.
- Fonction corrigée : **producteur d’images/carrousels sociaux natif** et réemploi d’acquis. Pas encore un nouvel outil payant de génération sociale/campagne pilotable depuis SYNA. Les brouillons/calendriers/campagnes SYNA de D11a/b restent des préparations locales.
- Les tâches historiques sans empreinte de confirmation ne permettent pas de reconstruire leur contexte historique ; les gardes pendant acquisition restent actives. Lorsque la référence n’était pas explicitement liée, son fichier est figé au début de l’acquisition, **pas son historique à l’accord HTTP**. Le prochain devis SYNA devra épingler explicitement sa référence.
- Texte seul et vidéo avec binding natif ne sont pas détournés vers ce producteur d’images : refus explicite, contenus conservés, outils natifs distincts à raccorder.
- Routes/tarifs/authentification et qualité créative des vrais fournisseurs **non qualifiés**. Aucune preuve CMS connecté, publication sociale, programmation, dépense publicitaire ni mise à jour du Studio client.
- Restent : génération sociale/publicitaire bornée depuis SYNA, compléments D10, comparaisons D12 puis intégration E/F. Les API métier Claude #239/#245 et intégration #247/#248 sont des dépendances préservées, pas réinventées ici.

**Critère de revue :** CI complète verte sur la tête exacte publiée avant de considérer cette PR prête. Tous les drapeaux restent fermés par défaut ; #211 n’est pas déclarée terminée.
