# Issue #150 — forfaits, droits et rendez-vous

## Périmètre et version

Mission : https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/150, lue intégralement. Branche dédiée `codex/150-forfaits-droits-rdv`, base `d97e0b9577128eeb39b403dae281da6bd835fc65`. Aucune fusion de #146, #147 ou #149, aucune modification des compositions des quatre thèmes ni de SILLON.

**Source finale vérifiée : `8748828bf8b2fb5b657fed5a43709843305989a4` (code applicatif).** Les captures viennent d'un serveur Next de production **local, isolé**, dont `/api/version` est enregistré dans les preuves. Elles ne proviennent pas du Codespace du client. Dernière version du studio commun connue par son diagnostic : `d97e0b9577128eeb39b403dae281da6bd835fc65`. Aucune mise à jour de ce studio, fusion ou publication de port effectuée ici.

Les constats ci-dessous sont **CONFIRMÉS DANS LE CODE** ; ceux couverts par les vérifications sont aussi **REPRODUITS SUR DONNÉES FICTIVES**. Aucune observation dans des journaux de production ni essai fournisseur réel n'est revendiqué pour cette mission.

## Grille centralisée et prix

| Droit | Créer — 49 € TTC/mois | Développer — 89 € TTC/mois | Dominer — 129 € TTC/mois |
|---|---|---|---|
| Projet | 1 par abonnement | 1 par abonnement | 1 par abonnement |
| Thèmes par famille | 1 | Jusqu'à 3 | Tous ceux disponibles, catalogue cible de 5 |
| Fonctions de section de la bibliothèque | 8 | 12 | 20 |
| Conversation IA de thème | Textes, images, couleurs | Personnalisation avancée existante | Sur mesure existant |
| Génération de section IA | Non | Non | Oui, dans les protections existantes |
| Vidéos IA | Non | Oui, capacités existantes | Oui, capacités existantes |
| Publications automatiques/jour, au plus | 1 | 3 | 5 |
| Horizon de programmation IA | 7 jours | 30 jours | 90 jours |
| Nouveaux articles de blog/cycle | 0 | 5 | 10 |
| Ajout/duplication de pages et modèles multiples | Non | Oui | Oui |
| Publicité et aide aux campagnes | Non | Non | Oui |
| Un appel initial d'une heure, par compte | 60 € TTC | 30 € TTC | Inclus |

Sources publiques des droits : `src/lib/plans.ts`, `src/lib/plan-entitlements.ts`. Prix et présentation partagés par `src/components/pricing.tsx`, également utilisé dans le studio. Les prix étaient déjà TTC ; aucune conversion arbitraire ni modification d'objet Stripe. Tarifs annuels existants conservés, sans nouvelle offre.

Les mécanismes financiers de `src/lib/billing.ts` sont conservés : TVA configurée à 20 %, budget mensuel fournisseur calculé sur 40 % du HT, recharges séparées sur 50 % de leur HT, réservations et règlements idempotents, coûts acquis et prudence sur l'incertain. **Ces parts internes ne sont pas des textes clients.** Les devis IA restent présentés en part du budget propre au projet, sans les confondre avec le prix de son abonnement. Un droit ouvert n'enlève aucun contrôle de coût. Aucun quota vidéo n'a été ajouté et aucune génération illimitée n'est promise.

## Catalogue explicite, compatible avec le travail de Claude

`PLAN_THEME_ORDER` déclare cinq emplacements par famille, dont les emplacements non livrés restent `null` :

| Famille | Ordre déclaré | État de cette base |
|---|---|---|
| `specialty` | `fraise`, `onde`, `sillon`, vide, vide | FRAISE et ONDE actifs ; SILLON relève de #149 et n'est pas activé par cette PR |
| `catalog` | `orbe`, vide, vide, vide, vide | ORBE actif |
| `services` | `rive`, vide, vide, vide, vide | Atelier Rive actif |

Un emplacement déclaré ne rend pas un thème inconnu ou inactif sélectionnable. Les anciens trente thèmes restent retirés pour une nouvelle sélection. Un thème réellement installé reste conservé lors d'une baisse de forfait ; la simple préférence `brand.direction` n'est plus prise pour preuve d'installation. `composeShop` reste un compositeur utilisable pour les aperçus ; la sélection/l'application dans le projet est contrôlée au serveur. Le parcours d'aperçu complet avant choix explicite n'est pas reconstruit ici.

Fonctions retenues, identifiants de `FAMILY_LIBRARY` existants :

| Famille | Les 8 de base | Les 4 ajoutées à Développer |
|---|---|---|
| `specialty` | `hero`, `benefits`, `details`, `specs`, `howto`, `purchase`, `faq`, `contact` | `composition`, `situations`, `story`, `guarantees` |
| `catalog` | `hero`, `collections`, `products`, `featured`, `finishes`, `dimensions`, `faq`, `contact` | `lookbook`, `care`, `uses`, `commitments` |
| `services` | `hero`, `offers`, `detail`, `portfolio`, `method`, `pricing`, `faq`, `contact` | `needs`, `before-after`, `commitments`, `area` |

Dominer ouvre les vingt fonctions existantes de chaque famille. Chaque clé porte son préfixe de famille, par exemple `services.method`. Les dispositions d'une fonction ne sont pas comptées séparément. En-tête, pied de page et bandeau structurels ne consomment pas ces fonctions. **Aucune limite de huit/douze/vingt blocs par page n'est créée.** Les contenus installés restent éditables ; ajouter une fonction verrouillée ou copier cette fonction pour l'étendre exige le droit correspondant. Les thèmes importés gardent leur bibliothèque propre ; ce filtre ne transforme pas leurs sections en fonctions natives.

## Corrections des parcours complets

### Serveur, devis et tâches

`job-entitlements.ts` est appelé avant insertion dans `jobs.enqueue` et au dispatch des handlers. Les producteurs publicitaires et vidéo concernés revérifient également le droit. Une tâche en attente ne conserve donc pas un ancien droit après baisse de forfait. La récupération idempotente ne peut pas retourner la tâche d'un autre compte, projet ou type d'opération.

Les routes campagnes exposent le droit et refusent les créations/devis payants non éligibles avant le fournisseur. Le producteur `draftAds`, Advertising V2, les visuels publicitaires, les scénarios vidéo publicitaires et le contenu `ad_copy` suivent la même grille. L'orchestrateur `workflow.planGate` marque l'étape non autorisée comme ignorée avec sa raison dès l'estimation puis à l'exécution, au lieu de la promettre et de faire échouer le reste plus tard.

La mise à jour de marque conserve les opérations locales autorisées. Si une image publicitaire IA ne peut plus être refaite, cette ligne est signalée et conservée ; elle n'interrompt pas les mises à jour locales des autres éléments déjà choisis.

### Créations initiales et conservation des acquis

Sous 49/89, le lot initial contient **dix publications organiques**, sans stratégie, rédaction ou image publicitaire payante. Sous 129, il contient les dix publications et les dix publicités. Le devis, le consentement initial, les statuts et l'interface utilisent ce nombre réel.

Une montée de forfait complète seulement les dix publicités manquantes, sans refaire les dix publications acquises. Les étapes d'extension, de contrôle et de réparation ont des clés distinctes de celles du lot organique. Les anciennes clés des reçus du lot de vingt sont préservées. Une baisse de forfait conserve les médias et l'historique publicitaires, sans les compter comme créations organiques ni relancer une génération. Un devis devenu incompatible avec le forfait doit être renouvelé ; ses acquis ne sont pas effacés.

L'ancien lancement vidéo comportait aussi un créneau publicitaire 9:16 et un créneau de présentation 16:9. Le premier est désormais réservé à Dominer, **sans empêcher la vidéo de présentation autorisée**. Les clés de reprise et les anciens médias gardent leur identité ; un ancien créneau publicitaire n'est jamais rebaptisé « organique ». Créer conserve son montage local ; Développer conserve la vidéo IA organique lorsque les autres conditions et le budget le permettent. Le résultat annonce le nombre réellement produit.

### Éditeur et conversation de thème

`theme/plan-access.ts` contrôle les fonctions de section demandées, leur famille et le niveau de conversation IA. Le mode basique admet les textes, images et couleurs des réglages ; il n'ouvre pas les changements de structure. Les opérations sur mesure restent Dominer. Les contrôles existants de pages et de génération de section sont conservés. La galerie expose uniquement les fonctions accessibles, via la même configuration que le serveur.

Le contrôle de l'éditeur de calques distingue les publicités des publications organiques : les modèles organiques restent utilisables. La distinction repose sur la première version enregistrée et sa filiation dans le même projet, pas sur une métadonnée modifiable envoyée par le navigateur. Un faux parent ajouté à une version ultérieure ou une clé d'un autre projet ne donne aucun droit.

### Articles et programmation sociale

Le compteur blog mesure **un nouveau brouillon sauvegardé par lignée d'article**, même s'il reste à relire ; une réécriture du même article n'est pas un deuxième nouvel article. Réservation atomique avant rédaction, dans le cycle natif de l'abonnement, référence stable par article, réutilisation après reprise. Un échec sans article sauvegardé restitue seulement le compteur ; il ne rembourse pas un coût fournisseur acquis. Les producteurs historique et SEO V2 suivent cette règle. La reprise d'un article déjà enregistré reste possible au quota de nouveaux articles épuisé, sous réserve d'un forfait blog actif et du budget IA.

Le planificateur social vérifie les fréquences et les horizons. L'approbation seule n'occupe plus une place d'envoi automatique. La programmation est transactionnelle. Au moment d'envoyer, le scheduler revérifie le forfait et les envois réels du jour, y compris ceux dont le résultat est incertain. Les adaptations d'un même contenu à plusieurs réseaux restent un groupe ; elles ne créent pas artificiellement plusieurs contenus dans le compteur natif. Les tests utilisent exclusivement un publisher simulé.

### RDV unique

Le tarif vient du projet payant choisi, mais le droit initial est **unique à l'échelle du compte** : disponible, réservé, utilisé. Il ne revient ni au renouvellement ni après montée de forfait. Le serveur revérifie ce droit dans la transaction de réservation. Un paiement tardif ne doit pas recréer un deuxième droit lorsqu'une autre réservation a déjà été prise entre-temps. Les historiques multiples ne sont pas supprimés.

L'interface affiche le tarif, la confirmation en attente et les appels utilisés. Les blocages de paiement expirés sont libérés avant la lecture du droit. Aucun nouveau tarif de deuxième appel n'est proposé ; l'ancien réglage administratif reste stocké comme historique non commercialisé.

Les règles existantes de réservation, annulation et report sont conservées : blocage de paiement de 35 minutes, réservation au moins 12 heures avant, annulation ou report au moins 24 heures avant. Elles ne deviennent pas une nouvelle promesse commerciale. À confirmer par le responsable : traitement commercial des exceptions historiques et éventuels remboursements lors de changement de forfait. Aucun paiement/remboursement réel testé.

## Règle → code/écran → preuve

| Règle/parcours | Code ou écran principal | Vérification |
|---|---|---|
| Grille, TTC, budget conservé | `plans.ts`, `plan-entitlements.ts`, `pricing.tsx`, `billing.ts` inchangé | Tests de grille, facturation, prix en pourcentage ; captures des trois cartes |
| Un projet par abonnement, historiques intacts | `project-billing.ts`, `project-subscriptions.ts` existants | Deux abonnements distincts pour deux projets ; deuxième consommation du même abonnement refusée |
| Droits 1/3/tous et 8/12/20 | `theme-access.ts`, `theme/plan-access.ts`, routes thème | Trois familles, trois forfaits, routes natives et conservation du thème existant |
| IA basique/avancée/sur mesure, pages | Contrôle d'opérations, worker chat, routes pages | Texte permis ; structure basique refusée ; génération IA uniquement Dominer ; droits pages serveur |
| Publicité, requêtes directes et anciennes tâches | `job-entitlements.ts`, `jobs.ts`, handlers, campagnes, producteurs | Refus 402 avant appel ; baisse de forfait après enqueue ; compte étranger 404 ; aucun usage ajouté |
| Orchestrateur et propagation | `workflow/index.ts`, `workflow/propagation.ts` | Devis et étape publicitaire ignorés avec raison ; autres mises à jour locales préservées |
| Lot initial et vidéos du lancement | `social-v2/initial*.ts`, `creation-videos.ts`, pipeline | Produit/service, dix organiques sans publicité ; extension sans réécriture ; présentation vidéo conservée |
| Quota blog mensuel | `quotas.ts`, `engine/blog.ts`, `seo-v2/engine.ts` | Dernière place réservée atomiquement, cinq brouillons, reprise, sixième refus avant écriture, restitution sans article |
| 1/3/5 et 7/30/90 | `plan-gates.ts`, planificateur et scheduler | Comptage des groupes, approbation sans envoi, envoi incertain, refus après baisse, horizon sans insertion |
| RDV 60/30/inclus, unique | `appointments.ts`, `/api/calls`, `studio/calls.tsx` | Trois prix, renouvellement/montée sans second droit, paiement tardif, isolation ; captures native bureau/mobile |
| Reprise organique dans l'éditeur partagé | `ad-doc/store.ts`, route documents | Filiation persistée, duplication organique, refus des métadonnées falsifiées et d'un autre projet |

## Commandes et résultats réellement exécutés

| Commande / environnement | Résultat effectivement obtenu | Preuve |
|---|---|---|
| `npx tsc --noEmit` | Réussi, code de sortie 0 | `reports/issue150/tests/typecheck.txt` (vide : aucune erreur) |
| `NODE_OPTIONS="--require /workspace/work/mission150-build-without-cache.cjs" node node_modules/next/dist/bin/next build` (environnement de réception isolé) | Build de production réussi, source applicative 8748828 | `tests/build.txt`, `tests/build-sans-cache.cjs` |
| `JOBS=2 bash scripts/verify-theme.sh --rapide` | 25 vérifications réussies, exports et ZIP compris | `tests/theme-check.txt` |
| `python scripts/mission150/check-suite.py --out /workspace/work/mission150-suite-finale --workers 2` | 316 fichiers exécutés ; 312 réussis au premier passage, 4 en échec ; 2 421 tests réussis, 2 échoués, 13 ignorés déjà conditionnels et 2 erreurs de collecte | `tests/suite-complete.json`, `tests/groupes.json`, `tests/groupe-1.txt` à `groupe-6.txt` |
| Reprise des quatre fichiers, `npx vitest run --no-file-parallelism` | 3 fichiers réussis ; 29 tests réussis, scénario vidéo E encore au-delà de 240 s | `tests/reprises-finales.json`, `tests/reprises-finales.txt` |
| `npx vitest run tests/video-v2-bench.test.ts -t "scénario E"` isolé | Scénario E réussi ; lancement de 29,48 s ; 5 tests non sélectionnés par ce filtre | `tests/benchmark-e-isole.txt` |
| `npx vitest run --no-file-parallelism tests/video-v2-bench.test.ts` dans un processus séparé | Les 6 tests réussissent en 57,83 s, sans changer le délai de 240 s | `tests/benchmark-complet-isole.txt` |
| `npx vitest run tests/workflow-garde-fous.test.ts` après adaptation du contexte | 7 tests réussis, consentement payant toujours obligatoire | `tests/consentement-final.txt` |
| CI GitHub du code 8748828, run 39451176567 | Types et Docker réussis ; suite : 315 fichiers réussis / 1 échec, 2 450 tests réussis / 1 échec / 2 ignorés. Les 6 tests du benchmark vidéo passent (52,8 s). L'unique échec est l'ancienne demande de publicité sous Créer, corrigée dans la livraison des preuves. Theme Check et build du job principal ignorés après cet échec ; ils ont été vérifiés localement. | [Run GitHub](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/39451176567), `tests/ci-8748828-extrait.txt` |
| Réception Playwright sur serveur Next compilé : `scripts/mission150/browser.ts` | Trois prix, droit unique, rechargement, API publicitaire 402 pour 49/89, bureau/mobile sans débordement ; aucune erreur JS ni requête externe, aucun paiement/RDV réel | `browser.json`, `browser-pricing.json`, `tests/navigateur.txt`, `tests/navigateur-prix.txt` |

Les deux erreurs de collecte venaient d'un PNG historique exclu par la copie partielle : remis depuis Git, inchangé, puis les deux fichiers passent. Le quatrième fichier en échec local est le benchmark d'encodage : son scénario E passe seul et l'ensemble passe sur GitHub, et les 6 tests repassent ensemble dans un processus local séparé en 57,83 s ; le délai local en regroupement reste une **limite de reproductibilité** ; aucun délai ni contrôle n'a été augmenté pour le cacher. Les résultats de reprises ne s'ajoutent pas aux totaux de la suite. La nouvelle exécution CI déclenchée par la livraison doit être consultée dans la PR ; aucune conclusion verte anticipée.

Le commit de livraison des preuves ajoute uniquement le rapport, les captures, les journaux, le harnais de capture et cette adaptation de contexte de test. **Le code applicatif reste strictement celui de 8748828** ; les captures et le build ne sont pas attribués à un code applicatif ultérieur non testé.

Les nouveaux tests sont `tests/mission150-forfaits.test.ts` et `tests/mission150-api.test.ts`. Les tests positifs historiques de publicité/vidéo ont reçu des abonnements fictifs explicites pour continuer à vérifier la qualité, les exports, les interruptions et la conservation des versions dans leur forfait éligible. Les assertions métier correspondantes n'ont pas été retirées pour masquer un refus.

La première passe de la suite générale a trouvé des attentes obsolètes (anciens 4/12 articles, publicité ouverte à Développer), les parcours oubliés décrits plus haut, des fichiers de manifeste absents de la copie partielle et un délai dépassé d'encodage vidéo. Les manifests et films publics nécessaires ont été remis depuis leur contenu Git exact pour les contrôles de présence, sans les modifier. Les échecs puis reprises sont distingués dans les journaux ; ce ne sont pas des succès cumulables.

La copie de travail exclut les gros médias/rapports historiques pour tenir dans le volume disponible. Cette exclusion n'est pas une suppression Git. Un cache Webpack jetable d'un précédent build local terminé a été supprimé, après vérification ; aucun média, configuration, base ou dossier client n'a été nettoyé. Le build de réception désactive uniquement le cache Webpack avec un hook local documenté ; la compilation et le contrôle des types restent actifs. Les premiers essais de build ont nécessité d'adapter la commande à Next 15 et de fournir la résolution des dépendances à la sortie temporaire ; ils n'ont entraîné aucun changement de configuration applicative.

## Captures et consultation

Les [14 captures PNG originales](../../reports/issue150/) sont enregistrées avec le rapport. Liens directs sur cette branche :

| Écran | Ordinateur | Mobile |
|---|---|---|
| Trois forfaits | [Capture](../../reports/issue150/forfaits-trois-ordinateur.png) | [Capture](../../reports/issue150/forfaits-trois-mobile.png) |
| RDV Créer | [Capture](../../reports/issue150/rdv-creer-ordinateur.png) | [Capture](../../reports/issue150/rdv-creer-mobile.png) |
| RDV Développer | [Capture](../../reports/issue150/rdv-vendre-ordinateur.png) | [Capture](../../reports/issue150/rdv-vendre-mobile.png) |
| RDV Dominer | [Capture](../../reports/issue150/rdv-dominer-ordinateur.png) | [Capture](../../reports/issue150/rdv-dominer-mobile.png) |
| Appel déjà utilisé | — | [Capture](../../reports/issue150/rdv-dominer-utilise-mobile.png) |
| Publicités verrouillées Créer / Développer | — | [Créer](../../reports/issue150/publicites-verrou-creer-mobile.png) · [Développer](../../reports/issue150/publicites-verrou-vendre-mobile.png) |

Détails lisibles des cartes : [Créer](../../reports/issue150/forfait-creer-detail.png), [Développer](../../reports/issue150/forfait-vendre-detail.png), [Dominer](../../reports/issue150/forfait-dominer-detail.png). Le mobile de la grille a été recapturé après retour explicite en haut de page ; son journal séparé ne remplace pas la réception des parcours RDV. Toutes les captures ont été ouvertes et inspectées à leur résolution d'origine. Les fichiers sont téléchargeables via le bouton Raw/Download de GitHub.

Voir également le [manifeste des preuves](../../reports/issue150/verification.json) et leurs [empreintes SHA-256](../../reports/issue150/SHA256SUMS.txt).

Les images représentent des comptes fictifs identifiés comme tels. Aucun créneau futur n'a été proposé dans le navigateur. La capture « utilisé » vient d'un historique synthétique passé dans la base isolée. Aucun achat, réservation réelle, appel fournisseur, envoi social, CMS ou connexion externe n'a été effectué. Les cookies, secrets de session, base et fichier d'environnement du harnais restent hors du dépôt.

## Limites et intégration

- Les fournisseurs IA, Stripe, les publications sociales et les réservations réelles sont **non vérifiés**. Les tests prouvent les droits, la conservation et les transitions avec outils simulés ; ils ne prouvent aucune qualité de création IA ni livraison sur un compte externe.
- Les captures prouvent les écrans du serveur de réception local et leur version compilée. Le studio utilisateur n'est pas mis à jour par cette livraison. La CI GitHub et sa conclusion éventuelle doivent être consultées séparément ; une PR publiée n'est pas une version servie.
- Aucun thème supplémentaire n'est créé. L'accès à trois/cinq thèmes est une capacité de catalogue ; seuls les thèmes effectivement livrés et actifs deviennent sélectionnables. Pas d'activation anticipée de SILLON.
- Pas de migration destructive des comptes historiques ni de leurs abonnements externes. Les projets supplémentaires restent en place. L'architecture actuelle lie déjà un abonnement à un projet ; les cas historiques sans lien exploitable demandent une réconciliation administrative ciblée, sans facturation ni suppression automatique.
- Une réservation de compteur blog laissée par un processus interrompu reste conservatrice tant que cette lignée n'est pas reprise ; pas de restitution aveugle de coûts ni de remise à zéro mensuelle d'un appel d'accompagnement utilisé.
- Les refus d'opérations structurelles après réponse de conversation empêchent leur application. Un contrôle de droits ne garantit pas qu'une demande ambiguë sera comprise gratuitement avant tout appel texte autorisé ; les protections de budget et de reprises restent nécessaires.
- #146 reste une livraison indépendante de durcissement des budgets, erreurs et reprises. Cette PR conserve le moteur financier de sa base et ne revendique pas avoir incorporé les correctifs non fusionnés de #146.
- Intégration avec Claude #147/#149 : conserver ses compositions, aperçus avant choix et médias. Consommer `PLANS`, `planAllowsTheme`, `planAllowsSection`, `assertLibrarySelection` et `assertThemeOperations`. Réconcilier explicitement les chevauchements sur `worker/handlers.ts`, `engine/shop.ts`, les routes/galeries de thème et `theme-access.ts`. Lors de l'ajout de SILLON à ses registres actifs, conserver le contrôle de droits par famille ; ne pas rétablir l'ancien « tous les thèmes dans tous les forfaits ».

**Aucune fusion ni mise à jour de studio réalisée.** Livraison proposée à la vérification et à l'intégration par Claude.
