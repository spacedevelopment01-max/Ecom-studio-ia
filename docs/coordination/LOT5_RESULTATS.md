# Lot 5 — état réel, préparatifs et résultats

## Statut au 22 octobre 2026

**Consigne active : [complément Thomas #6340748281 de #165](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/165#issuecomment-6340748281). Accès uniquement, puis retour à Thomas ; aucun démarrage d’étape fonctionnelle.** Le protocole de recette globale préparé ci-dessous est remplacé par **un seul projet, une étape fonctionnelle à la fois, validation explicite de Thomas avant la suivante**. Thème, adaptation et copywriting font partie du futur parcours. Voir [accès Codespace et protocole actif](LOT5_ACCES_CODESPACE_ET_RECETTE_PAS_A_PAS.md). Les cas de généralisation ci-dessous sont des réserves pour après ce premier parcours, pas des projets à lancer ensemble.

**Diagnostic préalable livré ; campagne réelle bloquée et non commencée.** La priorité [#6339502711](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/161#issuecomment-6339502711) impose de livrer l’accès et le routage avant les essais payants. Voir [LOT5_DIAGNOSTIC_ACCES_ROUTAGE.md](LOT5_DIAGNOSTIC_ACCES_ROUTAGE.md) et [preuves](../../reports/lot5/diagnostic/README.md).

Base applicative inspectée : **b7829553631283e671d95811ea36b2fb82fe1fb2**, PR #162 non fusionnée. Branche Codex séparée `codex/lot5-diagnostic-acces-routage`. La configuration du Codex préexistant est distincte du Codespace client ; aucune donnée/configuration n’a été déplacée ou modifiée. **Commit du script et des tests vérifiés : `bcb76b4f267623157a9e32bb2268270eaea86c29`**, contenu figé avant les preuves ; les fichiers applicatifs restent ceux de la base. Les deux diagnostics natifs ont ensuite été exécutés depuis ce commit. Aucun changement dans `src/`, `worker/`, les thèmes, les compositions de Claude ou la configuration fournisseur.

## Actions 17–20

| Action | Réalisé | Statut / preuve manquante |
|---|---|---|
| 17 — fournisseurs réels | Mécanisme de clés/base/chiffrement et deux chargeurs exécutés en lecture seule ; routes natives résolues ; accès réseau contrôlé sans authentification | **BLOQUÉ** pour contrôle de clé/modèle et appels minimaux : aucune clé native ici, proxy 403, prix actuels non revalidés |
| 18 — textes, logos, images | Traçage complet, critères préalables et cas ci-dessous ; outil de diagnostic testé sur fixtures | **PRÉPARÉ, NON EXÉCUTÉ RÉELLEMENT** : aucune image/logo/texte IA nouveau à inspecter, aucun verdict créatif |
| 19 — vidéo et français | Circuits Wan imposé/direct/vidéo V2/stock distingués ; montage local et voix Kokoro identifiés ; blocage des assets voix vérifié | **BLOQUÉ** : aucun clip IA nouveau, aucun MP4 IA visionné/écouté, aucune synthèse FR ici |
| 20 — qualité reproductible | Version de source, cas, grille, limites et protocole préparés ; tests de non-divulgation/lecture seule | **PARTIEL** : seuils non abaissés ; statistiques d’acceptation, coût et délai jusqu’au résultat utilisable non mesurables sans campagne |

## Modifications livrées

- `scripts/diagnostic-acces-routage.ts` : inspection native en processus CLI séparé, SQLite en lecture seule, aucun fournisseur, aucune génération, valeurs privées et erreurs libres non exportées ; distingue clés stockées/chiffrées/lisibles, clés effectives/désactivées, passerelle non vérifiée, préférences/routes réellement disponibles et variantes de difficulté.
- `tests/lot5-diagnostic-acces-routage.test.ts` : dix cas isolés, dont les chargeurs Next et worker, chiffrement, secret incorrect, désactivation, précédence, alias, passerelle, modèles/endpoints arbitraires et fichiers inchangés. Ces cas n’utilisent aucune clé réelle.
- Documentation et preuves JSON anonymes. Aucun correctif applicatif ou changement de routage pour contourner l’absence d’accès.

## Commandes réellement exécutées

Résultats réellement observés, détails dans [validation.json](../../reports/lot5/diagnostic/validation.json) :

| Contrôle | Résultat |
|---|---|
| `npx tsc --noEmit` | **Réussi**, sortie vide, code 0 |
| Diagnostic isolé | **10/10 réussis** ; aucun fournisseur, identifiants fabriqués |
| Suite globale locale | **Non verte** : 351 fichiers réussis, 4 en échec ; 2 841 tests réussis, 9 échoués, 22 sautés ; une suite non collectée faute de fixture ; 882,97 s |
| Rejeu de tous les groupes en échec + diagnostic, après récupération des fichiers versionnés manquants | **5 fichiers / 40 tests réussis**, 30,10 s ; aucune correction applicative |
| SDK OpenAI local / identité (contrôle séparé) | **2 fichiers / 17 tests réussis**, serveur SSE fictif local et fixture existante ; aucun nouvel appel OpenAI |
| Deux diagnostics natifs depuis le commit figé | **Réussis** ; 18 tâches texte et 10 usages média chacun ; sept clés absentes, zéro route média utilisable |
| `git diff --check` | **Réussi** |
| CI de la base applicative b7829553 | [Run 39768964896](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/39768964896) **vert**, métadonnées et jobs relus : types/tests/Theme Check/build/Docker. Ce n’est pas la CI de la nouvelle branche |
| CI de la livraison | Statut final et lien ajoutés au commentaire de livraison après push ; aucune réussite présumée dans ce rapport arrêté avant ce contrôle |

La suite globale locale n’a pas été rejouée intégralement après restauration ; son résultat ne doit pas être rebaptisé « tous les tests passent ». Les quatre groupes concernés sont `openai-streaming`, `skills-bibliotheque`, `serveur-dev` et `erreurs-outils`. Les dix nouveaux tests incluent une vérification de non-export du préfixe/suffixe de la clé **fictive**. Aucun journal brut de configuration n’est publié.

```bash
git fetch origin claude/integration-globale
git worktree add -b codex/lot5-diagnostic-acces-routage /tmp/ecs-lot5-164 b7829553631283e671d95811ea36b2fb82fe1fb2
npx tsc --noEmit
npx vitest run tests/lot5-diagnostic-acces-routage.test.ts
npx vitest run
node --import tsx scripts/diagnostic-acces-routage.ts --config-root /workspace/Ecom-studio-ia --loader worker
node --import tsx scripts/diagnostic-acces-routage.ts --config-root /workspace/Ecom-studio-ia --loader next
git diff --check
```

Deux premiers essais de vérification sont distingués : les tests du nouveau diagnostic ont d’abord révélé la création automatique d’un répertoire au chargement du module de stockage ; le script neutralise maintenant cet effet sans créer de fichier. Un premier lancement global dans le worktree partiel a été interrompu après erreurs d’assets/polices absents ; les fichiers versionnés `assets/` et `public/` ont ensuite été récupérés. Le lancement global suivant a rencontré des références `reports/`, `.claude/skills` et `.devcontainer` absentes du checkout partiel ; elles ont été restaurées, et les groupes concernés rejoués séparément. Aucun code applicatif n’a été modifié pour masquer ces échecs de préparation du checkout. Ces essais ne sont pas présentés comme verts et n’ont lancé aucune génération fournisseur.

## Ancienne matrice préparatoire — réserves après validation du parcours unique, aucune exécution autorisée

Tous les projets seront fictifs et isolés, sans publication. Les médias sources devront être libres d’usage et inspectés. Pas de personne par défaut ; UGC avec personne uniquement après consentement approprié. Les cas de réserve ne doivent pas servir à écrire des règles conditionnées au nom de démonstration.

| Cas | Famille / difficulté | Parcours et preuves à acquérir |
|---|---|---|
| P1 — lampe nomade documentée | Boutique spécialisée, photos propres, variantes distinctes | Vision → angle → identité/logo → pages/SEO → image avec références → sauvegarde/réouverture → adaptation d’un thème. Produit et prix exacts, aucune fuite de démonstration |
| S1 — entretien de vitrines professionnel | Services, plusieurs prestations, peu de photos | Recherche sourcée → activité complète → angles persistants appliqués posts/ads → texte et image IA déclarée illustrative → reprise → thème service ; aucune fausse réalisation client |
| P2 — boutique de plusieurs accessoires | E-commerce, plusieurs produits/collections | Bonne portée produit/collection ; fidélité séparée des références, droits, contenus et images non intervertis |
| Réserve R1 — filtre de fontaine pour animaux | Produit jamais utilisé pour développer les corrections ; forme complexe et transparence | Vision sous mauvais éclairage ; demande de photo complémentaire si nécessaire, pas d’invention des faces/capacités |
| Réserve R2 — réparation d’instruments de musique | Service nouveau ; gestes et environnement spécifiques | Sources pertinentes, prestations différenciées, scénario cohérent sans humains non autorisés et sans banque cachée |
| V1/V2 — vidéo produit puis service | Vertical puis horizontal ; scènes distinctes, voix française explicite | Scénario approuvé → routes réellement compatibles → médias originaux → MP4 décodé, dimensions/durée/pistes → visionnage et écoute ; reprise d’une seule scène ; sauvegarde/réouverture |

FRAISE et NOCTIL servent seulement de contrôles de non-transfert : formule fictive de démo et acheteur parent/utilisateur enfant ne doivent pas contaminer les nouveaux projets. Aucune promesse, avis ou composition fictive ne sera utilisée comme fait client.

## Critères fixés avant campagne

1. Réutiliser les seuils de `quality/policies.ts` : par exemple texte final 8, image V2 7, logo V2 8, artwork 7,5 ; critères bloquants/fatals et maximum de reprises conservés. Toute grille dépend du livrable exact ; ne pas remplacer les seuils du code par ces exemples.
2. Contrôle humain/technique séparé : exactitude du nom/produit, proportions/couleurs/détails, absence de marque tierce et de personne non autorisée, faits étayés, orthographe, texte lisible et complet, diversité réelle des scènes, cohérence angle/texte/image. Le score IA seul ne vaut pas réception de Thomas.
3. Chaque sortie doit être téléchargée, décodée et réellement ouverte ; chaque vidéo doit être visionnée **et écoutée**, avec durée promise, dimensions, audio, sous-titres, zones de sécurité et synchronisation contrôlés. Pas de validation sur HTTP 200 ou existence seule.
4. Même projet/versions après fermeture et réouverture ; aucune écriture client écrasée, média payé perdu ou double achat lors de récupération. Correction ciblée seulement sur l’étape refusée ; conserver les versions utilisables.
5. Distinguer image fournie, transformation IA, génération IA, illustration stock explicite et composition locale. **Aucune banque ni placeholder caché pour valider une nouvelle création demandée IA.** Une référence absente ou un consentement manquant est un arrêt explicite.

## Budget et registre à ouvrir avant tout appel payant

**Dépense fournisseur de ce diagnostic : 0 ; appels de génération : 0.** Les HEAD non authentifiés sont des contrôles réseau, pas des générations. Aucun ancien coût ou appel de projet client n’a été repris dans cette campagne, qui n’a pas commencé.

Enveloppe d’essai chiffrée disponible : **non établie dans cet environnement**. Ne pas supposer que le plafond générique d’un ancien script représente un crédit autorisé aujourd’hui. Estimation et devis actuels : bloqués par l’accès/prix. Aucun coût inconnu n’est remplacé par zéro.

Avant le premier envoi : figer le SHA intégré, le fournisseur/modèle/format exact, les prix officiels datés et le devis natif de **chaque** étape ; obtenir l’enveloppe chiffrée disponible, fixer un plafond global technique agrégeant tentatives/reprises/QC/JSON, et contrôler les réservations avant l’envoi. Plafonds internes natifs 40 % abonnement HT et 50 % recharge HT conservés séparément ; rien de ces règles internes dans l’UI client.

Protocole proposé : une tentative initiale par sous-étape ; au plus une correction ciblée autorisée par la grille, sans dépasser ses limites natives ni le plafond global. Les appels internes de réparation JSON, contrôles et reprises comptent également : le nombre d’actions UI ne suffit pas à borner la dépense. Erreur de coût incertain = récupération/vérification avant tout nouvel envoi, jamais relance aveugle. Ne pas exécuter ce protocole sans devis et barrière globale effective.

Le registre devra conserver pour **toutes** les tentatives : cas, SHA, source et droits, version du brief/prompt, tâche/call/usage, fournisseur et modèles demandé/servi, paramètres/durée/format, latence, coût mesuré/estimé/inconnu, réservation, sortie pérenne, verdict automatique, inspection et retour de Thomas. Aucun prompt client privé ni secret ne sera publié. Taux d’acceptation et coût cumulé seront accompagnés de l’effectif ; pas de prétention statistique sur quelques cas.

## Dépendances et limites de livraison

- Claude #162/#163 reste responsable de l’intégration, migrations, mise à jour du studio et lot 1 ; aucune fusion concurrente ou modification de sa branche.
- Lot 4 : respecter les contrats d’angle existants et rejouer la recette après intégration ; ne pas réécrire son moteur marketing ici.
- Lot 6 : recette globale coûts/fiabilité distincte ; cette livraison ne la déclare pas terminée.
- Pas de preuve créative nouvelle, capture de génération ou MP4 fournisseur : **aucune sortie IA n’a été produite**. Publier une fixture comme résultat réel serait trompeur.
- Aucune fusion, déploiement, modification de port, nouvelle connexion, clé, abonnement, fournisseur ou recharge. Les compositions et données existantes sont préservées.
