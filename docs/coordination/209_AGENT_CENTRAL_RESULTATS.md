# #209 — Livraison du lot A : fondation conversationnelle

Mission : [issue #209](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/209). Branche dédiée `codex/209-agent-central-lot-a`, copie indépendante de #208. Main audité : **70204a7ff83eb2382835a27a37a8465c0851a70a**. Code testé et compilé : **[f4999022089d27778c0961c5d86c5ad7b528f721](https://github.com/spacedevelopment01-max/Ecom-studio-ia/commit/f4999022089d27778c0961c5d86c5ad7b528f721)**, arbre Git `015a71ca450762363b0660e135d05f8c8b748d2e`.

**Première fondation API livrée pour revue, désactivée par défaut. Ce n’est pas l’agent complet ni une nouvelle interface client servie. Aucune fusion, mise en service ou dépense réelle autorisée/exécutée.** L’étape 1 réelle de la recette VANS reste non validée ; les deux analyses déjà acquises et #208 restent séparées.

**Compléments de mission du 28 octobre intégrés :** [IA prioritaire, orchestration adaptative et audit Site approfondi](209_AGENT_CENTRAL_COMPLEMENTS.md). Le classement/questionnement local de cette fondation reste un prototype fermé, **sans équivalence cognitive démontrée et sans autorisation de le substituer à la découverte IA du produit final**. Voir la section de livraison complémentaire en fin de rapport ; les résultats initiaux ci-dessous restent attachés à leurs SHA exacts.

## Audit et choix d’architecture

[Audit préalable](209_AGENT_CENTRAL_AUDIT.md) : cartographie demande → outil existant → droits/confirmation → effet/retour, état des moteurs et zones non vérifiées. L’orchestrateur possède déjà intentions, planner, routeur, exécuteurs et reprises ; le Brain et la préparation possèdent déjà les données et versions. Certains contrats sont seulement déclarés ou accessibles par leurs onglets ; leur présence ne signifie pas qu’un chat sait déjà les exécuter. Le résultat technique sans verdict qualité n’est pas une preuve de conformité créative.

[Contrat pour Claude et feuille de route](209_AGENT_CENTRAL_CONTRAT.md) : routes, messages, cartes à choix, réponses libres/inconnues, corrections, erreurs, révisions, permissions et capacités encore absentes. Aucun second orchestrateur, moteur de création, système de budget ou worker ajouté.

## Ce qui est réalisé

| Parcours | Comportement effectivement implémenté |
|---|---|
| Démarrage naturel | Première description exacte, proposition locale produit/service, clarification si incertaine. Aucune sécurité, caractéristique, réalisation, photo ou promesse commerciale inventée. Un site professionnel sans offre précisée demande une clarification. |
| Questions progressives | Objectif/cible/nature manquants, une question à la fois, 2–5 choix dont Autre, réponses multiples quand utiles, texte libre et « Je ne sais pas encore ». Devis + RDV déjà exprimés conservés sans seconde saisie. Pourquoi/retour et correction possibles ; une explication ne répond pas à la question. |
| Persistance | Une conversation unique par projet, brouillon unique lié au compte avant création, historique paginé, reçus idempotents, sauvegarde/reconnexion. Source client conservée dans le Brief natif et les versions de mémoire. |
| Données communes | Après rattachement, lecture de `preparation.current` ; pas de copie indépendante de faits validés dans un nouveau profil/Brain. Les corrections passent par `commitState` et `draft`, avec empreinte native à jour ; restauration manuelle native autoritaire. Approbation inchangée et séparée. |
| Création du projet | Proposition de formulaire validée par `StartInput`, exécutée seulement par l’API de création existante après accord. Abonnement payé lié une seule fois. Rattachement au projet vide correspondant ou à sa préparation locale initiale exacte ; refus si prix, médias, tâches, thème, acquis ou coordonnées différentes. |
| Droits/sécurité | Sessions natives, propriétaire strict y compris administrateur, abonnement par projet, origine des mutations, schémas stricts, révisions recontrôlées sous transaction, photos du seul compte/projet, secrets reconnus refusés avant stockage. Aucun exécuteur, rôle ou accord de dépense fourni par le client. |
| Capacités annoncées | Fiche modifiable selon droits et progression ; devis seul pour compréhension ; tous les autres outils signalés non raccordés. Les actions sensibles/créatives ne sont jamais annoncées effectuées. Aucune commande d’exécution ou de validation d’étape. |
| Devis | Réutilisation du devis natif, en %. Preuve de contexte/correction #208 exigée ; sinon refus et annulation atomique du devis incomplet. Confirmation toujours requise et exécution fermée dans le lot A, y compris avec un devis disponible. |
| Confidentialité | Nouveaux échanges inclus dans l’export du compte, avec filtrage propriétaire/projet et caviardage existant. Politique d’effacement réel inchangée et automatique toujours désactivé. |
| Bascule | `STUDIO_CONVERSATION_LOT_A` absent = routes 404. Aucun lien ni composant activé dans l’accueil/Pilote/formulaire. Anciens projets conservés ; migration non raccordée plutôt que modification silencieuse. |

Fichiers : `src/lib/orchestrator/conversation/{contract,creation,index,questions,store,tools}.ts`, trois nouvelles routes (`studio-agent/draft`, `studio-agent/conversations/[cid]`, `projects/[id]/conversation`), ajout de deux tables dans `db.ts`, adaptation du scope d’export dans `privacy.ts`, quatre fichiers de tests + fixtures, `scripts/verify-agent209-build.ts`.

CI : **un contrôle supplémentaire de la conversation sur le build compilé**, sans retrait de types/tests/Theme Check/export Shopify/Docker, ni modification d’un délai. Aucun thème, forfait, outil métier ou page publique modifié. Pas de nouvelle dépendance.

## Vérifications et preuves

Sur le code ci-dessus, Node **24.19.0** :

- Types : réussi.
- Suite complète finale sur sources figées : **3 505 tests réussis, 45 ignorés, 0 échec**, 408 fichiers réussis / 1 ignoré, **655,98 s**.
- Ciblés : **58 tests propres au lot A + 18 tests de confidentialité existants = 76 réussis**, inclus dans la suite complète. Les conditions des tests ignorés restent celles du dépôt (notamment PHP/kits privés absents et recettes CMS réelles non activées) ; aucun contrôle supprimé ou délai augmenté.
- Build de production propre : réussi. Premier démarrage de compilation bloqué par la configuration Next en répertoire utilisateur non inscriptible ; configuration/cache de recette déplacés dans `/tmp`, télémétrie désactivée, sans changement applicatif ni configuration du studio réel.
- **Vraie API HTTP du serveur compilé** : deux comptes/projets fictifs, lampe pour chambre d’enfant et aménagement des fourgons apportés par les clients. Sept tours enregistrés par cas, API native de création, rattachement, fiche correcte, correction et nouvelle session. Source servie : **f4999022…, production, clean, compiled-build**.
- Refus vérifiés : autre compte/administrateur 404 sans donnée étrangère ; outil d’exécution forgé 400 ; origine étrangère 403 ; révision périmée 409. Drapeau fermé : conversation 404 et ancienne liste des projets 200. Préparation limitée à `brief` en brouillon, pas d’étape 2.
- Généralisation isolée supplémentaire : capteurs pour ruches, maintenance de pompes industrielles, traduction en anglais. Aucune règle fondée sur le nom d’une démonstration. Reprise, changement d’avis, choix + autre, inconnu en bouton et en texte, consignes négatives, sources citées, restauration native et export du compte testés.

[Preuves complètes](preuves-209-agent/README.md) : [échanges HTTP réels isolés](preuves-209-agent/api-proof.json), [validation structurée](preuves-209-agent/validation.json), [reproductions avant/après](preuves-209-agent/reproductions.json).

Commandes réellement exécutées (rien n’a été lancé sur le studio utilisé par Thomas) :

```sh
npx tsc --noEmit
NODE_OPTIONS='--import=/workspace/reviews/ecom-209-lot-a/scripts/lot9/network-guard.mjs' npx vitest run tests/conversation209-core.test.ts tests/conversation209-questions.test.ts tests/conversation209-http.test.ts tests/conversation209-quote.test.ts tests/mission171-registration-privacy.test.ts
XDG_CACHE_HOME=/tmp/ecom209-font-cache NODE_OPTIONS='--import=/workspace/reviews/ecom-209-lot-a/scripts/lot9/network-guard.mjs' npm test
XDG_CONFIG_HOME=/tmp/ecom209-config XDG_CACHE_HOME=/tmp/ecom209-font-cache NEXT_TELEMETRY_DISABLED=1 npm run build
XDG_CONFIG_HOME=/tmp/ecom209-config XDG_CACHE_HOME=/tmp/ecom209-font-cache NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS='--import=/workspace/reviews/ecom-209-lot-a/scripts/lot9/network-guard.mjs' npx tsx scripts/verify-agent209-build.ts /tmp/ecom209-proof-code
```

Les vérifications ciblées/intermédiaires ne sont pas additionnées au nombre de tests finaux. Une suite intermédiaire non figée avait signalé la protection du prix manuel ; cette protection a été ajoutée puis les contrôles ont été repris sur code figé. Une autre contre-vérification avait reproduit la divergence d’une copie de décision après restauration : copie supprimée avant publication. Voir les reproductions. La CI du SHA de livraison est suivie dans la PR ; son verdict final sera publié en commentaire après exécution, plutôt que d’attribuer le verdict d’un ancien SHA à cette livraison.

## Coût et limites

**Aucun appel fournisseur réel, aucune génération payante : 0 dépense nouvelle dans cette mission.** Sur les deux parcours compilés : `ai_calls=0`, `jobs=0`, `usage_events=0`, portefeuille utilisé/réservé à zéro. Les trois lignes de journal créées pour préparer les abonnements fictifs sont identiques avant/après ; aucune nouvelle ligne de journal pendant la recette. Pas de reset de budget, d’effacement de dépenses ou d’analyse parallèle.

Les coûts positifs des tests de devis sont **fictifs**. Les doubles vérifient le contrat et la confirmation sans fournisseur ; le serveur compilé vérifie le refus honnête quand celui-ci manque. Disponibilité réelle, tarifs fournisseur et qualité d’une réponse IA **non testés**. Pas de rapprochement de facture ni de coût exact des deux analyses déjà acquises de la recette VANS.

Limites concrètes avant une bascule client :

1. Interprétation/questionnement locaux, pas encore un agent linguistique général. Paraphrases complexes et intentions mixtes restent à clarifier. Les autres moteurs sont audités au niveau des contrats, pas tous pilotables ni certifiés par cette PR.
2. Pas de nouvelle interface visuelle, donc pas de capture prétendant en montrer une. Claude doit réaliser l’intégration ergonomique seulement après validation ; l’ancien démarrage reste servi.
3. **Dépendance à l’intégration vérifiée de #208** avant tout raccordement réel de l’analyse/devis complet. Le code de #208 n’est ni copié ni modifié. Les anciens projets déjà analysés/validés restent protégés ; leur migration est un lot distinct.
4. Photos avant création non raccordées ; après projet, seules les photos téléversées de ce projet sont admises. Liens non consultés et photos non analysées dans cette tranche, sans prétendre les avoir compris.
5. Création incertaine : pas de relance automatique de l’API native ; l’interface future doit retrouver le projet déjà créé et rattacher le brouillon. Les cartes proposent les champs, le chat n’exécute pas cette création lui-même.
6. Limite du prototype : 1 000 tours, historique toujours lisible ; performance/archivage à examiner avant usage quotidien. Aucun outil payant, publication, achat, suppression ou export exécuté par le chat.

**Acquis préservés** : #206/#207, #208 et sa branche, recette VANS étape 1, Contretemps, médias/versions/forfaits/budgets/protections existants, compositions des thèmes et accueil public. Aucun accès ou changement au contenu des projets réels pendant ce travail. Aucune validation du brief réel ni passage à l’étape 2.

## Suite soumise à validation

Revoir cette PR et le [contrat pour Claude](209_AGENT_CENTRAL_CONTRAT.md). La feuille de route découpe compréhension IA, interface/migration, outils métier, qualité globale et grand aperçu Site, puis recettes réelles. **Arrêt après ce lot : pas de fusion, mise en service, lancement de Claude ou lot suivant sans l’accord du propriétaire.**

## Livraison complémentaire — arbitrages IA/multi-agent/Site

Les trois compléments de l’issue ont été lus intégralement. La passe repart de `477e47f57612878d001223fafd2b666fd81ac31b` sur la même branche isolée ; main est toujours `70204a7f…`. **Aucun fichier applicatif, thème, workflow, dépendance, droit ou budget modifié dans cette passe.** La première livraison reste conservée dans l’historique.

Livrables ajoutés :

1. [Complément d’audit/architecture](209_AGENT_CENTRAL_COMPLEMENTS.md) : matrice de 15 domaines, tâches cognitives vs exactes, valeur attendue de l’IA, qualification, économie et refus de repli inférieur ; spécialistes optionnels et mémoire commune, projections de contexte, budgets/reprises/mesures. Aucun déploiement de six agents.
2. Audit réel du moteur Site : **18 fichiers sourcés avec fonctions, lignes, empreintes et liens figés**, capacités et limites de composition/sections/copywriting/captures/exports. Le sur-mesure actuel exige un thème et ne couvre que deux gabarits ; la relecture peut manquer et les corrections doivent être recapturées ; opérations partielles et replis à ne pas présenter comme réussite complète. Constats de code, pas nouvelle recette visuelle ni correction des maquettes.
3. Contrat des futurs outils Site : inspecter, planifier, créer/éditer, appliquer contenus/médias, prévisualiser, capturer, contrôler, corriger, annuler/activer et exporter. États réels/non raccordés distingués ; candidats versionnés, périmètre et consentement. Trois modes prévus (thème, sur-mesure, hybride), aucune nouvelle usine de génération dans cette PR.
4. Comparaison instrumentée **SIMULÉE** sur trois périmètres (conseil contextualisé, marque + Site, Site + annonces + images) et deux stratégies ; prix par défaut du dépôt lus par AST **sans importer la configuration/base du Studio**. Tokens/latences hypothétiques clairement marqués, pas de tarif réel admin/fournisseur vérifié ni de gain qualité prétendu.
5. Plan progressif produit mono / multi / services devis-RDV, cas nouveaux tenus à l’écart, grille visuelle/marketing/fonctions/exports, seuils de qualification et coût **proposés à valider**. Le travail de Claude et les essais réels restent des étapes autorisées séparément.

Fichiers nouveaux hors production : `scripts/agent209-orchestration-study.ts`, `tests/conversation209-orchestration-study.test.ts`. Documentation complétée : audit, contrat, présent rapport, nouveau complément, README des preuves, `orchestration-study.json` et `site-source-audit.json`. Aucun nouvel endpoint, changement de routeur ou branchement fournisseur.

Vérifications complémentaires : types réussis ; **14 tests ciblés réussis** et **suite complète figée : 3 519 réussis / 45 ignorés / 0 échec, 409 fichiers réussis / 1 ignoré, 660,06 s** (coûts complets, prix invalides, qualification, budget/consentement/appels/durée, contextes critiques et isolation). Le refus du local cognitif et de tout spécialiste sans bénéfice établi est testé dans le **banc d’étude**, pas déclaré implémenté dans le Router servi. La suite complète inclut les 14 tests ciblés ; ils ne sont pas additionnés à son total. SHA final et verdict CI publiés dans le commentaire de livraison après leur exécution ; ne pas réutiliser un ancien verdict CI pour le nouveau SHA.

Commandes de cette passe :

```sh
npx tsc --noEmit
NODE_OPTIONS='--import=./scripts/lot9/network-guard.mjs' npx tsx scripts/agent209-orchestration-study.ts
NODE_OPTIONS='--import=./scripts/lot9/network-guard.mjs' npx vitest run tests/conversation209-orchestration-study.test.ts
XDG_CACHE_HOME=/tmp/ecom209-font-cache NODE_OPTIONS='--import=./scripts/lot9/network-guard.mjs' npm test
git diff --check
```

Le serveur compilé/API de la première passe n’a pas été relancé localement puisque son code n’a pas changé ; ses preuves restent sur `f4999022…`. Le script d’étude n’est pas une interface et ne produit aucune capture de nouveau site. Les contrôles CI existants restent tous applicables au futur SHA publié, sans retrait ni délais changés. Les sources d’étude et leurs empreintes sont disponibles dans les JSON de preuves.

**Coût réel de cette passe : zéro appel fournisseur et zéro dépense nouvelle.** Pas de données client, clés, média privé ni journaux de session ajoutés aux preuves. Les coûts positifs du tableau sont théoriques ; aucune facture vérifiée. Pas de changement de #208, du studio servi, des projets réels, des acquis ou de leurs budgets ; aucun reset, fusion, déploiement ou lancement de lot suivant. Le propriétaire est invité à relire et valider le lot A complété avant toute suite.
