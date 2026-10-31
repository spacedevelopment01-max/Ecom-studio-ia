# #204 — Contexte client, réanalyse et devis de compréhension

Mission : [complément 6452744138](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/204#issuecomment-6452744138). Travail sur une copie séparée et la branche `codex/204-contexte-reanalyse-client`, depuis `70204a7ff83eb2382835a27a37a8465c0851a70a` (#207). Corrections #206/#207 conservées. Aucun thème, forfait, accueil public ou moteur de facturation modifié.

**Livraison pour revue uniquement ; aucune fusion ni mise en service autorisée.** Code testé et compilé : [`5d86a5f3997576bce1a4678f5dab20bcd9a67017`](https://github.com/spacedevelopment01-max/Ecom-studio-ia/commit/5d86a5f3997576bce1a4678f5dab20bcd9a67017). Le commit de preuves complète le présent relevé ; le code applicatif reste identique. **Le verdict et les captures de 0529aed4 / ec974a0e sont remplacés par cette version.**

Types et build de production réussis. Suite complète : **3 471 tests réussis, 45 ignorés, 0 échec** (408 fichiers réussis, 1 ignoré), durée 654,98 s. **78 tests ciblés sur 9 fichiers**, dont les 19 du moteur, réussis et inclus dans le total. **Huit parcours navigateur** sur le build exact propre, **24 captures**, aucun débordement horizontal ni erreur JavaScript. Accès administratif refusé aux comptes clients (403). Voir le [dossier de preuves](preuves-204-contexte/README.md) et le [relevé structuré](preuves-204-contexte/validation.json).

Les 45 contrôles ignorés gardent les conditions existantes : PHP absent de cette machine, kits privés absents de la copie, boutiques CMS réelles non activées, anciens films déjà désactivés. Aucun contrôle ni délai n'a été supprimé ou assoupli. Les contrôles CI du SHA livré sont accessibles sur la PR ; leur verdict final sera confirmé en commentaire après exécution. Une simulation ne valide pas une nouvelle réponse créative réelle.

**Contre-vérification du compteur :** un test supplémentaire avait reproduit un zéro après deux anciennes analyses dont l'IA reformulait les faits. Le correctif relie les entrées aux résultats versionnés et aux checkpoints, de façon transitive : deux transformations A→B→C restent deux demandes acquises. Une vraie saisie client distincte crée son contexte sans effacer les demandes ; une preuve historique manquante impose le comptage conservateur et une explication près du bouton. [Reproduction avant/après](preuves-204-contexte/migration-reproduction.json).

## Causes et corrections

| Cause vérifiée dans le code de départ | Correction et portée |
|---|---|
| `inspect.analysisText` ne transmettait que les réponses des questions IA ; les faits guidés étaient réinjectés après l'appel. | `analysis-context.ts` construit le contexte des deux parcours : texte original, présentation corrigée, prestations, réponses/faits client, contacts, reports et propositions distinctes. `inspect.ts` transmet ce contexte entier aux constructeurs produit et services de `ai/tasks.ts`. Les données client ne sont pas insérées dans les instructions système. |
| `engine.runPreparation` ignorait la correction dans la branche analyse ; le devis ne la recevait pas. | Correction reliée de l'interface à la route, au devis enregistré, au payload, à l'adaptateur puis à la requête. Elle figure dans le devis affiché ; la modifier ferme ce devis. Le serveur refuse une correction différente de celle chiffrée. |
| Un devis ne liait que le brief brut et sa révision, sans la demande complète ni sa route. | Empreinte du contexte, correction, instructions/langues, stratégie sélectionnée, photos/documents, route/effort et bornes de coût/reprises. Contrôle à la confirmation puis avant un nouvel appel du worker. Le même constructeur conserve les limites de sortie/reprises. Les liens non encore consultés restent chiffrés à leur taille maximale autorisée. |
| Réponses/reports rapprochés seulement par identifiant ou clé. | Fusion conservatrice des points généraux de personnalisation/déroulement et des prix, délais et informations du devis. Les réponses client et leurs clés historiques sont préservées ; une vraie précision reste ouverte. Un report groupé prix/délai ne vaut pas réponse aux informations nécessaires pour un devis. Une question devenue indispensable n'hérite pas silencieusement d'un report. Doublons de faits rapprochés par point ou par valeur descriptive identique. |
| Une sortie pouvait s'attribuer `source=user` et se présenter comme confirmée. | Une nouvelle affirmation de l'IA non retrouvée dans les données client redevient une proposition à vérifier ; les inconnues restent vides. Aucun report n'est transformé en fait positif. |
| Correction requise et deux tentatives contrôlées seulement après la confirmation du devis. | Précontrôle au devis et contrôle conservé à l'envoi ; champ de correction, compteur et motif près du bouton. Données absentes/photos étrangères ou trop nombreuses refusées avant le devis. |
| La signature brute ignorait les réponses de fiche ; changer naïvement la signature aurait effacé les essais historiques. | `analysis-attempts.ts` distingue les vraies modifications client des formulations IA et de la simple correction. Une nouvelle formulation IA ne crée aucun droit supplémentaire. Les anciens essais d'une même signature restent groupés si la fiche correspond à l'un de leurs instantanés avant ET après analyse, y compris leurs checkpoints. Les transformations successives restent liées entre elles ; preuve manquante : comptage conservateur explicitement expliqué au client. Les tâches, dépenses et versions ne sont ni supprimées ni réécrites. |
| Panneau des créations futures prioritaire et titre « vingt » codé en dur. | Panneau secondaire replié après validation du brief ; pendant l'étape 1 il ne précède plus la fiche. Quantités transmises depuis les droits effectifs ; dix publications sans publicités si elles ne sont pas incluses. Aucun droit modifié. |
| Consommation du dernier résultat ambiguë avec le cumul ; agrégats administratifs insuffisants pour un relevé individuel. | Libellé « Dernière analyse ». Consultation administrateur en lecture seule `GET /api/admin/ai-calls?analysis=1&project=<id>` : chaque tâche, chaque appel/reprise, fournisseur demandé/servi et effort enregistrés, latence individuelle, coûts enregistrés, débits liés à `usage_events` et cumul dédoublonné. Les confirmations refusées sans tâche ne sont pas comptées comme appels. Aucun nouveau montant interne dans les écrans client. |

Fichiers centraux : `src/lib/preparation/{analysis-context,analysis-attempts,attempt-rules,analysis-history,inspect,quote,engine,deps}.ts`, `src/lib/ai/tasks.ts`, routes préparation et administration `ai-calls`, composants `analysis-retry`, `tab-preparation`, `initial-authorization`, `initial-creatives`, vue serveur d'autorisation initiale.

## Acquis et protections conservés

- Fiche éditable sans refaire payer une lecture, noms/photos facultatifs pour les services, coordonnées non bloquantes, contact principal et complémentaire, anciennes versions et sauvegarde/réouverture.
- Correction des doublons guidés de #207 conservée ; aucune suppression de toutes les questions d'une rubrique renseignée. Les questions précises sur les acomptes, la durée ou les dimensions ne sont pas remplies avec une réponse générale.
- Deux demandes maximum par mêmes données ; une correction seule ou les faits reformulés par une analyse ne remettent rien à zéro. Les entrées ET les résultats/checkpoints des tâches sont rapprochés, pour les anciens et nouveaux essais. Une modification réelle de fiche peut former un nouveau contexte, sans effacer le compteur ni les traces des précédents.
- Réservations et plafonds natifs, 40 % abonnement HT / 50 % recharge HT, reprises bornées, erreurs incertaines et plafond commun d'essais inchangés.
- Un ancien devis sans empreinte complète ne lance pas silencieusement une nouvelle analyse plus riche. Un checkpoint déjà acquis reste récupérable sans nouvel appel, même si son ancien devis n'est plus exploitable pour une nouvelle demande.

## Vérifications isolées

Toutes les données, médias, utilisateurs, abonnements et traces des vérifications sont fictifs, en base temporaire. Les doubles sont explicitement marqués **SIMULATIONS**. Aucun accès ni écriture sur le projet réel ou Contretemps ; aucune connexion à un fournisseur, aucune génération payante, aucun passage à l'étape 2, aucune fusion ni mise en service.

Commandes réellement exécutées :

```sh
npx tsc --noEmit
NODE_OPTIONS='--import=/workspace/reviews/ecom-204/scripts/lot9/network-guard.mjs' npm test
NODE_OPTIONS='--import=./scripts/lot9/network-guard.mjs' npx vitest run tests/preparation-analysis.test.ts tests/preparation-analyse-reprise.test.ts tests/preparation-analysis-request.test.ts tests/preparation-client-context.test.ts tests/preparation-analysis-history.test.ts tests/preparation-initial-counts.test.ts tests/recette-vans-fiche-questions.test.ts tests/recette-vans-comprehension.test.ts tests/preparation.test.ts
npm run build
```

Les **78 tests ciblés (9 fichiers, dont les 19 du moteur) passent** sur le correctif stabilisé, y compris les chaînes d’analyses anciennes/nouvelles et leurs checkpoints. Les nouveaux tests exercent la vraie construction de requête avec faux appel, devis/contrôle/payload/worker/sauvegarde/réouverture, produit et services, ancienne cohorte de deux essais, contexte réellement modifié, ancien checkpoint, données manquantes/photos, reports sous nouvelles clés, précision matériaux et collecte du devis conservées, rendu réel des composants et coûts administratifs individuels. Généralisation par données fictives de mobilier, cours et entretien d'instruments, sans branchement sur le nom d'un projet.

Un premier contrôle large a signalé une priorité de diagnostic dégradée (offre modifiée hors parcours masquée par une tâche en cours) : les deux protections sont conservées, avec le contrôle de fraîcheur en premier ; les 19 tests du moteur repassent. Les exécutions intermédiaires interrompues ne sont pas comptées comme suites globales réussies. Le premier verdict publié a ensuite été suspendu après la reproduction du défaut de compteur ; la suite complète et les captures ci-dessus ont été reprises après sa correction.

Harnais navigateur reproductible : `scripts/preparation/client-context-{seed,browser,costs}.ts`, uniquement avec un `DATA_DIR` temporaire commençant par `ecs-preparation-test-204-`. Serveur compilé isolé en boucle locale, **sans worker**, réseau fournisseur interdit. Configuration de recette et jetons de sessions temporaires gardés hors dépôt. Les captures finales et le JSON de contrôle sont joints sous `preuves-204-contexte/`. Les vues natives ont été ouvertes et inspectées ; polices et peintures navigateur stabilisées avant capture, sans modifier le moteur ni ses animations en usage normal.

## Devis et dépenses

[Recalcul local fictif](preuves-204-contexte/cost-proof.json) : demande complète d'un service avec correction, environ **0,2244 % estimé / 4,4126 % maximal**, contre environ 0,2145 % / 4,3430 % pour le contexte réduit de comparaison. Ce dernier n'est pas un devis historique du compte réel. La différence reflète le texte effectivement ajouté. Sortie services conservée à 12 000 puis 24 000 jetons ; pire chemin borné à trois appels. Le produit conserve ses propres limites et son devis distinct.

**Aucune nouvelle dépense fournisseur pendant ce correctif.** La recette réelle compte déjà **deux analyses**, selon le relevé de mission ; elles ne sont ni effacées ni ramenées à zéro. Leurs pourcentages affichés arrondis ne permettent pas de certifier leur cumul exact ou un coût individuel en euros/dollars. Le nouvel accès administratif lit les traces existantes pour ce relevé, sans générer. Les coûts incertains/manquants restent à rapprocher de la facturation, jamais déduits d'une moyenne. La latence d'un appel n'est pas la durée du parcours incluant attente et sauvegarde.

## Limites et suite après vérification du propriétaire

- Aucun comportement créatif d'un fournisseur réel n'a été retesté. La conformité sémantique d'une nouvelle réponse réelle reste à vérifier après autorisations distinctes de fusion, de mise en service, contrôle de la version servie et devis applicable.
- Le rapprochement local est conservateur : les paraphrases ambiguës restent à vérifier, plutôt que de supprimer une vraie précision. Les formulations réglementaires métier et le respect effectif du nouveau contexte par le modèle nécessitent le retest réel ; aucune règle spécifique aux vans n'a été ajoutée.
- La consultation administrative porte sur les enregistrements disponibles, pas sur une facture fournisseur. La route effectivement servie est indiquée comme manquante si le journal ne l'a pas enregistrée ; aucun modèle n'est inventé à partir du seul réglage.
- Aucun accord de validation du brief ni étape 2, thème, export CMS, média réel ou projet client modifié. Les essais navigateur ne changent pas le studio utilisé par Thomas.

Relecture attendue : fiche et précontrôle sur ordinateur/mobile, contexte construit et devis lié, conservation des deux analyses acquises et des inconnues. La prochaine recette réelle doit conserver ces acquis et expliquer toute limite applicable avant confirmation, sans autoriser artificiellement un troisième essai.

### Protocole du prochain contrôle réel (hors de cette intervention)

1. Après les autorisations distinctes, relire `/api/version` : SHA attendu, build de production, arbre propre. Réouvrir le même projet ; conserver les deux analyses acquises et tous leurs reçus.
2. Sans génération, vérifier prestations, réponses guidées, contacts, reports et droits du forfait. Consulter l'historique administratif ciblé : fournisseur/modèle servi réellement enregistrés, coût de chaque appel/reprise et cumul exact, latence individuelle ; noter explicitement les champs manquants.
3. Pour les mêmes données avec deux essais acquis, constater le blocage avant devis. Ne pas modifier artificiellement un champ pour le lever. Répondre à une question réellement utile reste une modification légitime, sans supprimer l'historique.
4. Uniquement si un nouvel essai est nécessaire, autorisé et permis par les limites : relire sa correction et son devis recalculé. Après résultat, vérifier l'absence des deux questions générales déjà résolues, la conservation de la précision utile pour le devis et des reports de gratuité/délai/conformité, puis recharger la page.
5. Contrôler également un service d'un autre métier et un produit non utilisés pendant le développement : données, réponses et propriétés propres à chacun ; aucune donnée d'une démonstration substituée, aucun avis, label, tarif ou délai inventé. Ne pas confirmer l'étape 1 ni passer à l'étape 2 dans cette recette sans instruction distincte.
