# #209 — Audit préalable de l’agent central, lot A

Audit du vrai `main` **70204a7ff83eb2382835a27a37a8465c0851a70a**, avant le code du lot A. Branche/copie indépendantes de #208. Aucun projet réel lu ou modifié, aucun fournisseur interrogé. Les constats ci-dessous sont des **constats de code**, pas une certification de fonctionnement des fournisseurs ou CMS réels.

**Compléments du propriétaire intégrés après la première livraison :** [matrice par domaine et audit Site approfondi](209_AGENT_CENTRAL_COMPLEMENTS.md). L’arbitrage prioritaire retient **l’IA pour la cognition**, le code pour les opérations exactes, et les spécialistes seulement si leur gain est démontré. La proposition locale de type/questions du prototype n’a **pas** de preuve d’équivalence et reste désactivée ; aucune recommandation de bascule client. Le complément distingue capacités réelles, lacunes, contrats futurs, simulations de coûts et qualité non mesurée.

## Ce qui existe et doit être réutilisé

- `orchestrator/intent.ts` : `understand`, actions connues et règles FR/EN ; classificateur IA injecté seulement en cas ambigu. `request.ts` distingue demande, citations, restrictions, explication et choix versionnés. Une intention n’autorise pas une dépense.
- `orchestrator/planner.ts` : plans persistants, dépendances, résultats/échecs/sauts, reprises bornées ; `router.ts`, `policy.ts`, `text-routing.ts` : choix de route selon capacité, disponibilité, politique et historique. Disponibilité déclarée et résultat réel restent distincts.
- `orchestrator/execute.ts` : enveloppes `orchestrated`, `orchestrateNow`, checkpoints et exécuteurs des moteurs. `STEP_EXECUTORS` est **partiel** : existence d’un `StepKind` ou d’une intention ne prouve pas qu’un outil de conversation est exécutable. Certains résultats sans verdict qualité ne sont qu’une note technique (`outcome`), pas une preuve de qualité créative.
- `workflow/index.ts` : préparation d’un parcours, estimation, accord, tâche, reprise et dépenses des tâches liées. `WorkflowPanel` est une interface de parcours ; ce n’est pas une conversation persistante commune à tous les onglets. Une moyenne historique ou un volume typique ne remplace pas un devis exact du moteur.
- `brain/{snapshot,views,facade,facts,memory-norm}.ts`, `projects.remember`, `client-wording.ts` : contexte du projet, priorités des faits client, scopes, décisions remplacées sans effacer l’historique, vocabulaire. Les données client restent des données, jamais une politique d’exécution.
- `preparation/{engine,store,fiche,brief}.ts` : fiche commune, corrections sans appel, versions immuables, révision attendue, approbations et invalidation aval. `initialize`, `commitState`, `applyFicheChange` sont les outils de la tranche verticale ; ne pas recréer une fiche concurrente. Les données de préparation sont des brouillons jusqu’aux validations existantes.
- `auth.ownedProject`, `route-helpers.projectFromCtx`, `http.handle/body`, `plan-gates`, `project-billing` : sessions, compte propriétaire strict, origine des mutations, validation et abonnement par projet. Un rôle administrateur n’autorise pas l’accès aux projets d’autrui.
- `jobs`, `ai/access`, `billing`, réservations, `ai_calls`, `usage_events` : tâches, quotas, reprises incertaines et traces. Aucun de ces mécanismes ne doit être remplacé par le chat.

## Cartographie des contrats audités

Les routes sont sous `/api/projects/[id]`. **« Existant » ci-dessous signifie contrat trouvé dans le code ; aucun appel fournisseur/publication réelle n’a été essayé.** Les contrôles plus fins sont ceux de la route/du worker, à conserver lors du raccordement d’un outil.

| Demande client | Outil/moteur existant | Droits et confirmation | Effet et retour effectif | Lot A |
|---|---|---|---|---|
| Décrire/corriger mon activité | Préparation `initialize`, `commitState`, `applyFicheChange`, `editBrief`, réponses | Compte propriétaire, forfait pour modifier un projet, révision | Brouillon versionné, points inconnus, historique | Branché sans appel |
| Comprendre à nouveau l’offre | `preparation` : `createQuote`, `queuePreparation`, `runPreparation`, `inspectBrief` | Forfait, devis et confirmation, limites de tentatives/coût | Proposition analysée, preuves d’appel/checkpoint ; approbation distincte | Devis seul ; exécution fermée |
| Recherche/positionnement | Préparation recherche + `marketing-strategy` | Approbation amont, devis, choix et validation d’angle | Sources/statut, propositions, stratégie choisie | Non raccordé au chat |
| Marque/logo | `brand`, `brand/logo-v2`, moteur logo V2 et séries | Forfait, droits de série, devis/accord ; sélectionner ≠ régénérer | Directions, choix, fichiers, verdicts | Non raccordé |
| Fiches produit/variantes/stock | `product`, `products`, `products/sync`, `lib/products` | Propriétaire, droits/connexions, modifications explicites | Catalogue et synchronisation avec limites de plateforme | Non raccordé |
| Prestations/contact | Préparation, `business_json`, profils de services | Même propriétaire et révision ; pas de panier imposé | Prestations/contacts déclarés ; pas de tarif inventé | Données communes conservées |
| Site/thème/retouche | `theme/build`, `theme/chat`, `theme/ops`, `lib/theme` | Thème autorisé, droits sections/pages, confirmations natives | Versions et aperçu ; retour technique ≠ conformité visuelle | Aucun rendu modifié, pas de création par chat |
| Images | `images/v2`, `creative/image`, moteur image V2 | Forfait création, origine des médias, budget, consentement personnes | Tâches, assets, verdicts et reçus | Non raccordé |
| Vidéo | `videos/v2`, `creative/video`, moteur vidéo V2 | Devis/jeton d’approbation, forfait, plafond, consentements | Script/plans/rendu selon parcours, états vérifiés | Non raccordé |
| Textes/SEO | `content/v2`, moteurs contenus/SEO | Droits, source de faits et quota selon demande | Versions de documents, contrôles et état | Non raccordé |
| Blog | `blog`, `blog/topics`, réécriture/export/publication | Forfait/quota, accord séparé de publication | Article versionné ; publication distincte | Non raccordé |
| Publicité | `campaigns/v2`, `ads/docs`, moteur publicitaire | Dominer, devis/accord et plafonds | Campagne/documents et tâches ; aucun achat média implicite | Non raccordé |
| Réseaux/calendrier | `social/v2`, `posts`, `plans`, autopilote | Droits, quotas, connexion ; publication explicitement autorisée | Plan, brouillons, production/publication distinctes | Non raccordé |
| RDV | `rendez-vous`, moteurs salon/cabinet/restaurant | Propriétaire, champs validés, action explicite | Réservations/création/déplacement/annulation | Non raccordé, jamais simulé comme réalisé |
| Export/envoi CMS | `theme/export`, CMS Engine V2, connecteurs | Forfait et contrôles de livraison ; envoi externe séparé | ZIP contrôlé ou erreur explicite ; limites par CMS | Non raccordé |
| Publier/acheter/supprimer | Routes spécialisées ; pas un droit donné par l’intention | Confirmation et droit explicites ; pas d’exécution dans ce lot | Ne pas annoncer une action sans reçu | Refus explicite dans le chat |

## Lacunes et priorités vérifiées

1. Pas de contrat central pour un brouillon conversationnel avant création, ni de conversation commune avec progression, choix et reprise. `chat_messages` est rattaché à un projet et des fils spécialisés ; le réutiliser comme démarrage avant projet imposerait un faux projet ou modifierait son contrat.
2. La création actuelle `POST /api/projects` lit un formulaire avec type préalable et lie un abonnement payé une seule fois. **Ne pas la dupliquer** : un brouillon conversationnel n’est pas un projet ; son rattachement se fait à un projet créé par ce mécanisme existant, sans attribuer ni libérer d’abonnement.
3. Pas de registre exposant séparément « moteur présent », « outil raccordé », « droit acquis », « devis disponible » et « exécution confirmée ». Cette séparation évite les annonces fictives et l’ouverture de toute la plateforme par simple texte.
4. L’Intent Engine vise des actions, pas une compréhension générale du métier ou une conversation complète. Une proposition locale de type doit être présentée comme telle, clarifiée si ambiguë, et ne doit créer aucune caractéristique ni preuve commerciale. Un agent linguistique complet n’est pas démontré par ce lot.
5. Les données saisies dans deux endroits doivent rester une seule fiche. Une conversation ne doit pas réécrire une préparation approuvée, une tâche en cours ou une modification manuelle concurrente ; révisions et état réel à relire à chaque commande.

## Interaction avec #208

#208 reste **séparée, non fusionnée**, livraison `a0246c7753bca30e365d57b4cd8202ce95c3f812`. Elle corrige l’envoi des faits guidés/corrections à l’analyse, le devis lié et le compteur historique. Ces corrections **ne sont pas présentes dans ce main** : notamment `inspect.analysisText` n’envoie pas encore tous les faits guidés et la route devis ne prend pas la correction. Le lot A ne les réimplémente, ne les cherry-pick et ne les modifie pas.

Le chat doit appeler les contrats publics de préparation, sans copier leur logique. **#208 doit être intégrée et recontrôlée avant toute activation d’une analyse réelle depuis la future interface** ; ni une fondation locale ni une CI verte ne valide la recette VANS. Les deux analyses déjà acquises restent acquises.

## Contre-vérifications pendant le développement

- Le classement local initial confondait la réparation d’un objet avec sa vente dans une formulation au présent. Reproduit sur « Je répare les montres de mes clients », corrigé pour les verbes de prestation, sans règle sur un nom de démonstration.
- Une première copie de réponses dans des décisions du Brain pouvait rester active après restauration native d’une ancienne fiche. **Défaut reproduit par un test échouant, puis copie supprimée** : le Brief reste dans `preparation.current` et ses versions natives ; la conversation conserve des reçus/pointeurs, pas une seconde décision autoritaire. Le Brain garde sa publication native après approbation, pas une validation implicite du brouillon.
- L’inventaire de confidentialité existant savait filtrer par compte/projet, mais pas par `conversation_id`. Sans adaptation, l’historique aurait été classé à examiner manuellement dans l’export du compte. Ajout du scope de conversation et du filtre du propriétaire/projet, avec test A/B. Aucune politique d’effacement réel activée.

## Portée réelle de l’audit

Lecture des modules et contrats cités, des routes, des droits et des points de raccordement. Pas d’audit exhaustif des algorithmes de chaque moteur, des écrans complets, de chaque connecteur CMS ou des factures fournisseurs ; pas de consultation de la base du studio utilisé par Thomas. Le fonctionnement réel des fournisseurs, qualité des créations et publication CMS restent **non vérifiés**. Les tests du lot A devront prouver son parcours isolé et sa sécurité ; ils ne pourront pas certifier ces fonctions non essayées.

## Architecture retenue avant développement

Une petite couche de conversation **dans l’orchestrateur existant**, pas un nouveau planner, worker ou routeur IA : état des échanges persistant par compte/brouillon puis unique par projet ; outils de fiche strictement bornés, données autoritaires dans la préparation/mémoire ; carte d’action avec disponibilité réelle et devis natif, sans exécution payante. Activation serveur explicite et désactivée par défaut. Aucun écran client remplacé. L’interface visuelle et les autres outils feront l’objet de lots ultérieurs distincts.
