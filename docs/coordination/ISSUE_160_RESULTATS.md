# Issue 160 — stratégie client et rectification services

## Réception et version

Mission [160](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/160), prolongement de [154](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/154). **La rectification services du commentaire 6325952324 prime sur la spécification initiale.** Commentaires Claude 6325089065 et rectification 6325954605 de #159 également consultés.

- Livraison : [PR 161](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/161), branche `codex/160-strategie-client`.
- Base : `8d011155c95be6c951c3e94d6d1fb7d48485c99b`, PR #156, branche `codex/154-integration-adaptation-client`. Cette dépendance n’est pas fusionnée dans main.
- Code applicatif testé et compilé : **6b7fe5e2671e5567f8482fe2ef2c0f7f26527832**. Les commits de preuves ultérieurs ne changent pas ce code.
- Main constatée : `d97e0b9577128eeb39b403dae281da6bd835fc65`. Aucun merge, déploiement, appel fournisseur, publication client, paiement ou connexion externe.
- Les compositions et branches de Claude sont préservées. Cette base porte les sept thèmes de #156 ; les quatre nouveaux thèmes et finitions de #159 restent une dépendance à réconcilier puis à contrôler. MUSEAU CLUB : produit spécifique ; ONDE/SOUPLE : e-commerce. Aucun choix artistique de démo n’est codé comme règle marketing universelle.
- Dernière coordination #159 relue : commentaire **6327242856**, qui demande à Claude de reprendre les onze rédactions et retire toute assimilation de sa livraison précédente à une validation. Ses décisions de démonstration NOCTIL/FRAISE ne sont pas injectées dans les projets clients. Le registre proposé `content-roles.ts` et `docs/coordination/ROLES-CONTENU-THEMES.md` ont été consultés : leur intégration reste à réconcilier avec les raccords par rôle de cette PR et l’exception générale des sites de services. Aucun fichier de sa branche n’a été remplacé.

## Résultat pour le client

**Produits :** consulter cinq propositions, choisir explicitement, préparer les contenus dépendants, puis activer l’ensemble. Les retouches et les versions précédentes restent conservées. Une transition ne doit pas annoncer la cohérence de contenus simplement marqués d’un nouvel identifiant.

**Services :** construire le site général sans angle ni consommation du quota. Toutes les prestations, la méthode et le contact restent dans ce socle. Les publications/publicités utilisent des angles de communication explicitement autorisés ; A et B peuvent coexister. Le choix de B ne réécrit ni le site, ni son SEO, ni ses médias, ni les publications A déjà approuvées ou programmées. La distinction repose sur `business_type`, jamais sur un nom de projet ou de thème.

**Droits persistants :** 49 € = un angle non remplaçable ; 89 € = deux identités, réutilisables sans remise à zéro mensuelle ; 129 € = les cinq. Le généraliste de communication compte ; le site général de services ne compte pas. Tous voient les cinq avant de choisir. Les modules publicitaires restent réservés au forfait qui les inclut.

## Constats corrigés et preuves

Les mentions **CONFIRMÉ DANS LE CODE** et **REPRODUIT** sont distinctes. Les journaux et médias ci-dessous viennent de comptes fictifs isolés ; aucun journal client n’est publié.

| Constat | Correction | Preuve |
|---|---|---|
| Une construction produit pouvait partir sans décision explicite | Cinq cartes détaillées ; garde API/moteur ; pipeline produit en attente avant rédaction/construction, sans perdre ses acquis | CONFIRMÉ DANS LE CODE + REPRODUIT : `marketing-strategy/index.ts`, routes `theme/build`, `engine/pipeline.ts`, tests `mission160-api`, `mission160-parcours` |
| L’ancienne règle globale aurait bloqué le site de services et réécrit les contenus à chaque campagne | Deux portées dans la stratégie centrale : socle général du site et choix attaché à la communication. Préparation globale et changement de pointeur du thème désactivés pour les services ; ancienne préparation globale refusée explicitement | CONFIRMÉ DANS LE CODE + REPRODUIT : `strategy-consumption.ts`, `marketing-strategy/index.ts`, `theme/strategy-transition.ts`, `mission160-service-scopes` |
| Une tâche A pouvait être rejetée après sélection de B, ou ses résultats réétiquetés B | Choix conservé dans la tâche native ; worker et production par publication reprennent sa version autorisée. Les médias et le scénario d’une communication héritent du même choix | CONFIRMÉ DANS LE CODE + REPRODUIT : `jobs.ts`, `worker/handlers.ts`, moteurs social/publicité/vidéo ; tâches différées et production A/B simulées |
| Le quota pouvait devenir un compteur mensuel ou dépendre d’identités recalculées | Identités canoniques persistantes, historique partagé API/worker, contrôles 1/2/5, réanalyse sans effacement, activation atomique et idempotente | CONFIRMÉ DANS LE CODE + REPRODUIT : `plans.ts`, `marketing-strategy/`, tests renouvellement, concurrence, double-clic et changement de forfait |
| Une carte ou un tampon ne prouvait pas la propagation | Snapshot d’exécution et contexte critique Brain, déclinaisons par rôle, provenance native de chaque version ; faits et identité indépendants | CONFIRMÉ DANS LE CODE + REPRODUIT : `brain/`, `ai/llm.ts`, `strategy-consumption.ts`, tests de différences de cible, promesse, ton, scène et texte |
| Le thème préparé pouvait garder un ancien titre SEO, malgré une stratégie nouvelle | Reconstruction du candidat **après** acquisition des textes locaux et après revue d’une source. Contrôle des documents réellement livrés ; source ancienne non vérifiée signalée comme mixte | CONFIRMÉ DANS LE CODE + REPRODUIT : `module-preparation.ts`, `engine/shop.ts`, `strategySourceCompatible`, `theme-delivery.ts`, régressions/recette avant toute recomposition supplémentaire |
| Les propositions de rédaction pouvaient passer devant un texte exact fourni par le client | Priorité de la rédaction explicitement fournie ; les corrections ciblées et les corps complets restent livrés par cible au thème et aux exports | CONFIRMÉ DANS LE CODE + REPRODUIT : `seo-v2/theme-copy.ts`, `theme/strategic-copy.ts`, `mission160-parcours` |
| Les versions préparées apparaissaient comme courantes avant confirmation | Visibilité séparée dans les stores, listes, bibliothèque et Brain ; lecture explicite par le propriétaire, activation transactionnelle, archives réutilisables | CONFIRMÉ DANS LE CODE + REPRODUIT : `marketing-strategy/visibility.ts`, `mission160-staging` ; acquis non validés toujours hors du courant |
| Une retouche portant le même ID pouvait conserver une validation ancienne | Empreinte de contenu liée à la revue. Modification entre inventaire, revue et activation refusée. Une édition de publication de services conserve son origine, exige une nouvelle approbation et ne consomme aucun angle | CONFIRMÉ DANS LE CODE + REPRODUIT : ledger/revues, `social-v2/engine.ts`, `approval.ts`, tests de contenu mutable |
| Une banque ou un devis pouvait considérer un média A comme librement réutilisable sous B | Même filtre d’angle pour devis et exécution ; média de campagne exclu de la sélection automatique du site de services. Approbation refusée si un média déclaré appartient à un autre angle | CONFIRMÉ DANS LE CODE + REPRODUIT : `social-v2/production.ts`, visibilité en portée site, `reviewServiceCommunication` |
| Une publication unitaire de services perdait son angle lorsqu’elle recevait le titre ou la légende exacte du client | Conservation du choix explicite et du texte protégé, revue de son empreinte au moment de cette création ; approbation d’envoi toujours distincte. Une modification brute ultérieure exige une nouvelle revue | CONFIRMÉ DANS LE CODE + REPRODUIT : `social-v2/single.ts`, `publications-editoriales.test.ts`, recette HTTP `create_one` sous A puis B |
| Les descriptions d’accessibilité des images remplaçaient les titres commerciaux après raccord de la rédaction | Descriptions réservées aux champs d’accessibilité ; séquences construites depuis les textes acquis et l’ensemble des prestations ; titre de séquence distinct du premier élément. Géométrie, ordre et types des sections conservés | CONFIRMÉ DANS LE CODE + REPRODUIT et OBSERVÉ DANS LES CAPTURES : `theme/client-adaptation.ts`, `theme/client-copy.ts`, `mission160-editorial-delivery`, comparaison avant/après dans les preuves |
| L’activation produit pouvait laisser partir une ancienne programmation incohérente | Revue avant envoi, maintien des protections et archives. **Exception services voulue : les programmations A gardent leur angle et leur approbation quand B est choisi** | CONFIRMÉ DANS LE CODE + REPRODUIT : `assertContentAlignment`, `social-v2/scheduler.ts`, recette A/B sans envoi extérieur |
| Le calendrier automatique réutilisait son ID avec des paramètres futurs différents | Autorisation interne d’ajouter des créneaux futurs, sans écraser les anciens ; propriétaire et stratégie d’origine conservés. Le calendrier manuel refuse une reprise ambiguë | CONFIRMÉ DANS LE CODE + REPRODUIT : `planner.ts`, `autopilot.ts`, régression `social-autopilot-pilote` |
| L’export PrestaShop refusait des données de variantes comme un script dangereux | JSON/JSON-LD valide distingué du code exécutable ; scripts, attributs d’exécution et données mal formées toujours bloqués | CONFIRMÉ DANS LE CODE + REPRODUIT : `cms-v2/checks.ts`, `mission160-export-security`, téléchargement réel du ZIP local |

## Raccords effectifs

| Parcours | Produits | Services |
|---|---|---|
| Analyse et cartes | Quatre hypothèses ciblées substantiellement distinctes + généraliste ; recommandation motivée, aucune activation automatique | Même analyse de l’activité, réservée aux choix de communication ; le site reste indépendant |
| Marque, faits, logo, palette | Identité stable, jamais remplacée automatiquement par l’angle | Socle commun du site et des campagnes |
| Galerie, thème, pages, aperçu et export | Choix obligatoire et variantes par rôle ; préparation inactive puis pointeur atomique | Construction sans angle ; plusieurs prestations et contact ; aucune bascule lors d’un choix de campagne |
| SEO et blog du site | Stratégie active, versions natives et cibles complètes | Portée générale même si appelée depuis une préparation de communication |
| Publications, calendrier et campagnes | Stratégie globale, état des éléments conservés et transitions contrôlées | Sélecteur dans création de publication, publicité, vidéo et calendrier. Versions A/B coexistantes ; provenance rendue par l’API et visible sur les cartes de calendrier |
| Images, vidéos, scénario et voix | Contexte partagé, vrais moteurs et réservations natives | Angle de la publication/campagne pour ses médias ; images/vidéos du site en portée générale. Accord de scénario lié au choix explicite |
| Créations acquises et reprises | Réutilisation sémantique angle + contexte, provenance d’origine conservée | Même réutilisation par contenu ; aucun remplacement global de campagnes A par B |

Le moteur de transition produit prépare gratuitement les textes SEO/calendriers éligibles, **sur action explicite**. Le devis groupé des révisions reconstructibles utilise les moteurs natifs, une seule tâche et un plafond agrégé. Créations complètes d’images via leur moteur natif ; aucun ancien compositeur local substitué. Une reprise explicitement confirmée au plus, avec points de reprise séparés ; les réussites acquises ne sont pas repayées. Les articles, campagnes protégées, anciens briefs incomplets et vidéos sans scénario approuvé ne sont pas réécrits aveuglément.

## Budgets et protections

- Plafonds internes abonnement ≤40 % HT et recharges séparées ≤50 % HT inchangés ; aucun objet Stripe, prix ou abonnement client modifié.
- Choisir un angle n’autorise aucune dépense. Devis, consentement, réservations fournisseurs, droits de module et limites de tentative restent applicables côté serveur et worker.
- Versions précédentes, retouches, médias, archives, approbations et données de projet conservés. Aucun reset, nettoyage client ou modification de `.env.local`.
- Baisse de forfait/résiliation/réabonnement : historique conservé ; les règles commerciales non précisées restent une décision ouverte, sans droit nouveau inventé ni effacement.
- Une provenance ne prouve ni la qualité créative ni la satisfaction de la demande. États partiel/protégé/non aligné/à vérifier maintenus.

## Vérifications exécutées

| Commande / contrôle réel | Résultat | Preuve |
|---|---|---|
| `node node_modules/typescript/bin/tsc --noEmit` | 0 erreur | `reports/issue160/types-verifies.json` ; typecheck CI également réussi |
| `NODE_OPTIONS="--import /tmp/ecs-strategy-160/scripts/verify-video-network-guard.mjs" node node_modules/vitest/vitest.mjs run --maxWorkers=3` | **348 fichiers réussis ; 2 765 tests réussis, 13 ignorés** en local | `logs/tests-complets.log` ; 11 contrôles PHP conditionnels ignorés faute de PHP, plus 2 historiques |
| Même commande avec les 24 fichiers ciblés (liste de réception dans `resume.json`) | **197/197 réussis**, aucun ignoré | `logs/tests-cibles.log` |
| CI #574 du code `6b7fe5e2` : `npm run typecheck`, `npm test`, `JOBS=4 scripts/verify-theme.sh`, `npm run build`, Docker | **Verte : 348 fichiers, 2 776 tests réussis, 2 ignorés ; 165 cas Theme Check ; build et démarrage Docker réussis** | [Run 39683960125](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/39683960125), `ci-verifiee.json` |
| `JOBS=2 bash scripts/verify-theme.sh --rapide` | 25 cas valides, 0 erreur (avertissements conservés) | `logs/theme-check-local.log`, exécuté sur `14a3ef50` ; les sources thème sont identiques à `6b7fe5e2`, qui bénéficie aussi de la CI complète |
| `next build` avec données isolées et transports fournisseurs interdits | Compilation, types et 51 pages générées réussis | `logs/build.log` ; serveur `/api/version` = code testé, source `compiled-build` |
| `tsx scripts/mission160-browser.ts`, après `tsx scripts/mission160-seed.ts` | 4 parcours A/B sauvegardés et rechargés ; site de services construit avant choix avec quota 0, puis version inchangée ; création unitaire exacte A et B ; zoom, panier local, FAQ/contact ; 6 ZIP téléchargés | `navigateur.json`, `communications-unitaires.json`, `logs/navigateur.log`, captures et WebM originaux |
| Inspection Chromium supplémentaire, lecture seule | 8 vues bureau/mobile, mouvement réduit demandé, aucune image visible cassée ni débordement horizontal | `revue-visuelle.json` ; inspection humaine des huit pages complètes et des premiers écrans |
| Inspection `zipfile` et décodage `ffprobe`/`ffmpeg` | 6 archives sans erreur CRC, 34 templates Shopify JSONC inventoriés ; 6 vidéos navigateur transcodées H.264 et décodables | `exports-verifies.json`, `sections-exportees.json`, `videos-verifiees.json` |

Les médias sont une recette simulée des transports, avec véritable HTTP, persistance, handlers natifs et navigateur. Ils ne démontrent pas la qualité d’un fournisseur réel. Le rapport et les preuves portent la version d’artefact **`issue160-2026-10-21-v3`** ; les commits documentaires ultérieurs ne modifient pas le code testé.

La suite du build intermédiaire `14a3ef50` a réellement échoué : 24 échecs, 2 741 réussites et 13 ignorés en local ; 24 échecs, 2 750 réussites et 2 ignorés en CI (le nouveau fichier de deux cas n’y était pas encore envoyé ; PHP absent localement). Ces échecs ont conduit à corriger le raccord réel des publications unitaires, et à compléter les anciens jeux de tests positifs avec un choix explicite et une réconciliation après changement de faits/logo. Les contrôles négatifs de quota et de budget gardent leurs fonctions natives ; aucun choix automatique n’a été ajouté au produit. Le harnais de contrats de livraison emploie désormais le snapshot de l’action native, tout en isolant son type de file.

Une première suite avait aussi révélé une régression du calendrier automatique, corrigée dans son parcours natif. Une ouverture SQLite concurrente a échoué à l’initialisation des données de tests : le `globalSetup` initialise désormais une seule fois la base temporaire native avant les processus parallèles. Aucun changement de verrouillage ou délai SQL applicatif, ni test désactivé pour masquer un défaut. Un ancien dépassement de délai de migration a été contrôlé isolément : 6/6 réussis, même limite conservée. Les exécutions lancées pendant les modifications ne valent pas validation d’un commit figé.

Les tests de budget utilisent des écritures et transports **synthétiques**, distincts d’une facture fournisseur. Le harnais refuse les transports fournisseurs. Le serveur navigateur est compilé, local à `127.0.0.1:18260`, avec données fictives sous `/tmp/ecs160-*` ; aucun worker général, port public ou studio client utilisé.

## Preuves et généralisation

[Index : captures, vidéos, exemples complets, six exports et empreintes](../../reports/issue160/README.md).

- Recette principale : théière Anse / Maison Basalte, et ateliers de céramique / L’Atelier des Gestes. Produit usage → expression ; service : site général inchangé, communications sous deux angles. Rechargement, éditions, zoom/panier de prévisualisation, contact, textes SEO et export natif.
- Autres domaines des tests : sac vélo et réglage de violoncelle ; préparation du café et conseil paysager. Comparaison des motivations, scènes, messages et faits conservés.
- Un premier cas tenu à part, l’accessibilité numérique, a révélé l’ordre erroné de préparation thème/SEO ; ce constat a donné une correction générale. Il est désormais une régression, et non une preuve indépendante restée inconnue du développement.
- Deux nouveaux cas ajoutés ensuite : pupitre de lecture pliant et classement d’archives papier avec deux prestations. Le cas du tamis de semences est également conservé. Aucun correctif ne dépend de ces noms. Les cas sans images restent partiels ; ils ne démontrent pas une livraison photographique finale.
- Deux cas ajoutés **après le gel des corrections de thème `14a3ef50`**, sans nouvelle règle de contenu : kit de réparation de chambre à air et entretien de vergers (taille + suivi de l’arrosage). Construction native, transition produit, site de services avant choix puis inchangé, calendrier sous un angle de communication, compilation d’export et zéro appel IA. Ils ne constituent pas un essai fournisseur.

**Dépense réelle de cette mission : 0 appel fournisseur IA, 0 € IA.** Aucune publication extérieure, transaction, voix/vidéo achetée ou installation CMS. Les devis affichés restent des estimations des tables existantes.

## Limites et suite de réception

1. Analyse locale déterministe : hypothèses créatives signalées ; aucune recherche concurrentielle externe, validation de persona ou promesse de conversion inventée. Les doubles de test ne prouvent pas la qualité des sorties IA réelles.
2. Images de recette simulées, explicitement marquées ; aucune image client ou kit privé publié. Fournisseurs, modèles effectivement servis, exactitude des textes dessinés, clips/voix et coûts de facture non testés, conformément à la mission.
3. L’intégration des onze thèmes de Claude reste à faire avec sa livraison #159, puis à vérifier sur les nouvelles pages et familles. Cette PR ne prétend pas les avoir réunis ni validés.
4. Les CMS sont contrôlés au niveau des fichiers d’export. Installation, remises/cadeaux côté serveur, panier et paiement réels, e-mails/formulaires/RDV réels non vérifiés. Les avertissements/adaptateurs propres à chaque plateforme restent nécessaires ; toutes les compositions Shopify ne deviennent pas des fiches PrestaShop identiques.
5. Le Codespace de Thomas et la version qu’il sert ne sont pas modifiés. `/api/version` dans la recette atteste uniquement le build local indiqué dans les preuves. Aucun lien de production n’est présenté comme mis à jour.
6. La revue des quatre pages reste une réception technique partielle : galerie produit longue, quelques textes fournis répétitifs, illustrations fictives. Le rapport et les captures ne prétendent pas que le niveau photographique et rédactionnel des onze démonstrations est déjà validé pour des fournisseurs réels.

Pour la coordination : intégrer #161 au-dessus de #156, réconcilier #159 en préservant les compositions et le socle général des services, puis revoir les preuves et les limites avant toute autorisation de fusion ou déploiement.
