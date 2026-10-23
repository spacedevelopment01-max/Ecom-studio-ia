# Lot 8 — droits, paiements et assistance (#169)

Travail du 23 octobre 2026 sur `codex/169-forfaits-paiements-assistance`, depuis main `0a6aa1dd6dfa5932a5e42e027cef2a3335e74679`. Mission [#169](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/169), grille et commentaires [#150](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/150). **Code applicatif testé et compilé : `33ee10f9609456b773ae56c69993b7264f542af3`**. Les commits suivants ajoutent les preuves et le rapport ; aucun changement applicatif après cette compilation.

Identité du modèle et limite sur le réglage d'effort annoncées dans l'accusé de réception de #169 ; aucun changement de modèle prétendu. Aucune donnée, configuration, base ou média client chargé. Aucun appel IA, paiement, réservation externe, envoi à un client, fusion ou déploiement.

## Matrice de livraison

| Point | Demandé | Réalisé | Vérification | Limite / preuve |
|---|---|---|---|---|
| 29 | Grille unique, droits réels, concurrence, acquis | Grille existante conservée ; alignement banque vidéo, publicité/campagnes et anciennes ventes de packs. Gardes API/file/worker conservés ; montant historique facturé utilisé dans le compte. | Routes et moteurs natifs, trois forfaits, pas d'exemption administrateur. | Tests `mission150-*`, `mission169-assistance` ; captures et résultat navigateur listés plus bas. |
| 30 | Paiement = une attribution ; reprise, ordre, signature | Intentions Checkout et mutations persistantes ; transactions crédit/reçu ; verrou de webhook reprenable ; rapprochement depuis état serveur ; factures du compte. | Stripe **simulé**, signatures réelles locales, fautes SQLite injectées, concurrence et reprise. | **Stripe TEST externe non vérifié** : aucun accès test dans cet exécuteur, domaine Stripe exclu du réseau autorisé. |
| 31 | Historique et acquis ; ne pas inventer les transitions | Migration additive ; prix historiques et médias conservés ; annulation/reprise et retour au même projet ; décisions ouvertes ci-dessous. | Migration fictive depuis main, deux démarrages ; tests cycle abonnement/RDV/quotas. | Ce n'est pas une migration de la base de Thomas. Pas de changement de politique commerciale. |
| 32 | Récupération, messages honnêtes, assistance suivie | Demandes et fils persistants client/équipe ; diagnostic restreint ; retours de paiement et remboursement honnêtes ; réinitialisation non trompeuse. | Authentification native, isolation, lien expiré/usage unique/concurrence. | SMTP simulé en tests ; recette SMTP **locale** distincte de toute réception externe. Responsable support/SLA/compensations non décidés. |

## Défauts prouvés et corrections

**REPRODUIT sur le code main audité**, sans réseau, dans `scripts/lot8/reproduce-baseline.mts` et `reports/lot8/baseline.json` :

- `packCheckout('visuals')` permettait encore d'acheter un pack retiré des offres. Refus 410 avant tout transport ; anciens acquis conservés. `src/lib/payments.ts`, `billing-client.tsx`.
- Une recharge signée de montant nul créditait implicitement 10 € de recharge (4 166 666 micro-unités internes dans la recette). Refus des montants nuls/négatifs/non entiers et devises incompatibles. Aucun relèvement de plafond. `applyTopup`, `payments-v2.ts`.
- Une interruption SQLite après sauvegarde du reçu laissait le crédit absent ; la relivraison voyait le reçu et ne créditait jamais. Reçu et crédit sont maintenant dans la même transaction, y compris anciennes recharges, anciens packs et remboursements. La reprise répare également un reçu V2 déjà orphelin, une seule fois, sur preuve du paiement existant et sans remboursement enregistré ; un ancien reçu remboursé sans écriture de crédit exige un rapprochement, sans recrédit aveugle. Anciennes recharges : montant réellement payé, jamais le montant demandé en métadonnées. Tests de faute SQLite puis reprise et de récupération historique.

**CONFIRMÉ DANS LE CODE et testé après correction** :

- Les clés d'idempotence calculées par minute pouvaient changer après une coupure et être réutilisées pour un autre cycle annulation/reprise. `checkout-intents.ts` et `billing-mutations.ts` stockent identité et paramètres avant l'appel ; une réponse perdue réutilise la même demande. Bail, exclusion d'une action concurrente, refus d'un changement ambigu. Après 23 heures sans résolution, rapprochement obligatoire, sans nouvelle charge aveugle à l'expiration des clés Stripe.
- Deux traitements de webhook pouvaient appliquer des états concurrents. `handleStripeEvent` utilise un bail durable avec propriétaire, journal final seulement après succès ; échec libérable/reprise après expiration ; ancienne notification ignorée et ambiguïté à la seconde résolue par lecture serveur. Annulation terminale protégée.
- Un abonnement fournisseur illisible ne doit pas être remplacé par un accès actif supposé. Nouveau parcours V2 : aucune attribution si l'état Stripe requis est indisponible/inactif ; upgrade avec `error_if_incomplete`, ancien forfait conservé si authentification/refus/paiement incomplet. Rapprochement explicite des mutations interrompues, sans nouveau POST chez le prestataire.
- Un retour `?paiement=ok` affichait un succès sans preuve serveur. Compte, accueil du studio et rendez-vous affichent une information de vérification. `PaymentStatus` rapproche uniquement les sessions du compte et montre les factures rattachées à ses clients Stripe. Aucune attribution depuis le navigateur.
- Une réponse Checkout incertaine annulait la réservation locale et pouvait conduire à un nouvel achat. La réservation en attente reste accessible par « Payer », avec sa même intention. Créneau passé/bloqué non confirmé par un paiement tardif. Montant d'appel exact requis. Remboursement en attente ≠ remboursement effectué ; suivi conservé.
- Banque vidéo : le droit au plan IA est désormais distinct de la disponibilité fournisseur. Le premier forfait garde import/banque libre, mais pas la génération IA. Droit au plan revérifié lors de la mise en file et de l'exécution des recherches de banque. Publicités et ouverture automatique de campagne verrouillées aux deux premiers forfaits ; résultats acquis conservés.
- Support : création et réponses persistantes avec idempotence ; clients isolés, file équipe réservée à l'administrateur. Référence de tâche vérifiée ; statut/progression/résultat/consommation en pourcentage, jamais payload, erreur brute, secret ou marge interne. Référence de budget actuel explicitement distincte d'un solde historique.
- Mot de passe : liens d'une heure à usage unique, fermeture des sessions du seul compte ; message générique de **demande** d'envoi, sans promettre l'arrivée du courriel ni révéler l'existence du compte. Tests expiration, concurrence, SMTP absent/refusé/accepté.

Nouvelles tables uniquement : `stripe_event_claims`, `checkout_intents`, `billing_mutations`, `support_tickets`, `support_messages`. Aucune colonne/table existante supprimée ou remplacée. `scripts/lot8/migration-proof.mts` compare les **63 anciennes tables intégralement**, deux redémarrages, et conserve un média fictif original : `reports/lot8/migration.json`.

## Grille et sources conservées

Source décision : #150 et rappel explicite #169 ; source exécutable : `src/lib/plans.ts`. Convention déjà documentée : **TTC**, `tax_behavior=inclusive` dans les paiements. Aucune nouvelle convention fiscale.

| Fonction | Créer | Développer | Dominer |
|---|---:|---:|---:|
| Mensuel TTC | 49 € | 89 € | 129 € |
| Projets par abonnement | 1 | 1 | 1 |
| Thèmes par famille | 1 | 3 | tous les thèmes actifs autorisés |
| Fonctions de section dans chaque bibliothèque | 8 | 12 | 20 |
| Angles persistants par projet | 1 | 2 | 5 |
| Publications automatiques / jour | 1 | 3 | 5 |
| Horizon de programmation | 7 jours | 30 jours | 90 jours |
| Blog / mois | 0 | 5 | 10 |
| Vidéos IA | non | oui | oui |
| Publicités / aide campagnes / lot initial publicitaire | non | non | oui |
| Ajout/duplication/modèles de pages | non | oui | oui |
| Personnalisation IA | basique | avancée | sur mesure |
| Section entièrement IA | non | non | oui |
| Appel initial unique de 60 minutes | 60 € | 30 € | inclus |

Les sections ne sont pas un quota de blocs/page. Les variantes de disposition ne consomment pas une nouvelle section et les familles restent séparées. Les emplacements futurs du catalogue ne créent pas de thèmes factices. Aucun thème de Claude modifié.

Les limites d'angles sont historiques, pas mensuelles ; ni renouvellement ni réattribution de forfait ne les remettent à zéro. #168 apporte l'analyse sourcée et les interfaces associées ; cette branche ne la remplace pas.

Budget interne inchangé : `billing.ts`, HT obtenu avec la convention existante de TVA ; plafond fournisseur 40 % du HT abonnement, enveloppe séparée de 50 % du HT recharge. Ces calculs figurent dans ce rapport technique, **pas dans les écrans clients**. Les droits d'accès ne promettent pas des générations illimitées. Aucun crédit réel ajouté, aucun plafond contourné.

Sources de contrôle : `plan-entitlements.ts`, `plan-gates.ts`, `job-entitlements.ts`, `quotas.ts`, `theme/plan-access.ts`, `theme/theme-access.ts`, `social-v2/initial.ts`, `social-v2/scheduler.ts`, `project-billing.ts`, `appointments.ts`, routes projets/thème/vidéo/campagnes. Les exports et les thèmes conservent leurs contrôles existants ; aucune livraison dans un CMS n'est prétendue.

## Cycle client : règles existantes et décisions ouvertes

| Cas concret | Comportement existant conservé / amélioré | Décision ou vérification restant nécessaire |
|---|---|---|
| 49 → 89 au jour 10 | Code existant : hausse immédiate, `always_invoice`. Désormais pas de nouveaux droits si paiement incomplet ; reprise durable. | Thomas doit confirmer cette politique, le prorata et la date d'effet avant recette commerciale externe. Aucun montant de prorata inventé. |
| 129 → 49 à mi-mois | Code existant : baisse par `create_prorations`, données/versions et anciens angles conservés. | Date d'effet et traitement du prorata à confirmer. Pas de remboursement ni expiration ajoutés. |
| Résiliation | Code existant : fin de période payée, réversible avant échéance ; mutation désormais reprenable. | Conditions contractuelles et éventuel remboursement à confirmer ; aucun remboursement d'abonnement automatisé ici. |
| Retour après interruption | Réactivation du même projet et de sa clé ; aucune remise à zéro de l'historique. | Faire la recette Stripe TEST réelle après mise à disposition de l'accès adapté. |
| Recharge inutilisée | Solde séparé conservé ; utilisation IA soumise à un abonnement actif. | Sort des crédits à long terme / remboursement : non décidé, aucune expiration ou compensation inventée. |
| Ancien tarif / abonnement annuel | Compte affiche le prix historique réellement enregistré ; total annuel en équivalent mensuel. Mécanisme existant de changement au prochain renouvellement non exécuté. | Facture/prorata/taxe réels et migration tarifaire externe à vérifier séparément ; aucune configuration Stripe changée. |
| Deux abonnements du même compte et appel initial | Code #150 : droit unique par **compte**, jamais mensuel ; prix selon le projet choisi. | Confirmer si le périmètre attendu reste compte ou doit devenir projet. Pas de changement silencieux. |
| RDV annulé/reporté | Règles existantes : délai 24 h, réservation 12 h avant minimum, retenue de paiement 35 min ; droit gratuit rendu après annulation admise. Paiement tardif sans créneau : pas de confirmation fictive, suivi équipe. | Confirmer ces délais et la politique commerciale ; remboursement du seul appel payé traité selon la règle existante. |
| Acquis après baisse / résiliation | Aucune suppression de projets, médias, versions, angles ou publicité acquise. | Étendue contractuelle de l'accès aux exports après résiliation à confirmer ; pas d'ouverture globale ni de fermeture supplémentaire inventée. |
| Paiement ancien incertain > 23 h | Pas de nouvelle clé susceptible de débiter à nouveau ; assistance et rapprochement nécessaires. | Vérification prestataire par l'équipe ; pas d'automatisme aveugle de recherche/compensation. |
| Support, litige ou résultat IA insuffisant | Fil persistant avec références et consommation ; pas de relance IA, remboursement ou crédit en ouvrant une demande. | Responsable, délai de réponse, recours et gestes commerciaux à définir par Thomas. |

Les constantes d'autres avantages existants (annuel 10 mois, langues, niveaux de support, UGC) sont conservées ; elles ne constituent pas de nouvelles décisions prises dans ce lot. La facturation des achats ponctuels n'active pas `invoice_creation` chez Stripe : éventuels frais/configuration à valider séparément. Aucun changement externe de production.

## Dépendances et préservation

- PR #166, tête examinée `27777896e200587be454dac41eb4e1bd5a2dcf31` : reprise **sélective après lecture** des seuls `vitest.config.ts`, `tests/database-global-setup.ts`, `tests/database-file-setup.ts` pour isoler chaque fichier de test et éviter le partage de paramètres/base. Ni fusion aveugle ni reprise de la voix/vidéo.
- PR #168, tête examinée `dbfc05adfe2853b559a83c37544c2b950eb35dc1` : non fusionnée. Ses recherches/angles sourcés restent une livraison indépendante. Chevauchement connu dans `src/components/studio/ad-campaigns.tsx` : conserver son branchement d'angles **et** nos gardes `plan === 'dominer'` à l'ouverture automatique et au bouton de préparation ; ne pas écraser un côté avec l'autre.
- Claude #167 : aucun fichier `src/lib/theme/`, `theme-base/`, `public/theme-assets/`, fixture de démonstration ou accueil public modifié. Cette branche ne publie pas de thème ni de composition.

## Vérifications et limites de preuve

Commandes réellement lancées à ce stade :

```bash
npx tsc --noEmit
npx vitest run tests/mission169-payments.test.ts tests/mission169-assistance.test.ts tests/paiements-projets.test.ts tests/rendez-vous.test.ts tests/audit-backend.test.ts tests/audit-ecrans.test.ts tests/mission150-forfaits.test.ts tests/mission150-api.test.ts
npx tsx scripts/lot8/reproduce-baseline.mts
npx tsx scripts/lot8/migration-proof.mts
```

Dernière série ciblée : **144 tests / 8 fichiers réussis**. Le contrôle des types, la compilation de production et `git diff --check` réussissent. Une première série a trouvé quatre échecs : trois dus à une colonne de support placée dans la mauvaise déclaration de table (corrigée, migration additive finale vérifiée), un dû au simulateur consommant son indicateur de panne sur une lecture (corrigé). La première exécution du script de migration manquait la résolution de dépendances de la copie isolée ; correction du harnais puis deux redémarrages réussis. Ces échecs intermédiaires ne sont pas cachés.

Contrôles complets exécutés en trois partitions **sans filtre ni désactivation supplémentaire**, pour limiter le disque de cet exécuteur :

```bash
npx vitest run --shard=1/3
npx vitest run --shard=2/3
npx vitest run --shard=3/3
npx vitest run tests/logo-identity.test.ts tests/serveur-dev.test.ts
npm run build
npx tsx scripts/lot8/studio-proof.mts
```

Passage global : **358 fichiers, 2 906 tests réussis après reprise, 22 ignorés par les conditions déjà présentes dans le dépôt** ; complété par les **144 contrôles ciblés finaux** (chevauchement, ne pas additionner ces chiffres). Le premier tiers avait deux fichiers en échec : le dossier du logo historique et `.devcontainer` n'étaient pas matérialisés dans la copie allégée. Références récupérées depuis le dépôt, sans modifier leurs sources ; les deux fichiers repassent, **8 tests**. Les deux autres tiers passent : respectivement 941 réussites / 11 ignorés et 924 réussites / 11 ignorés. Les exclusions préexistantes concernent notamment les médias de démonstration privés, des contrôles PHP conditionnels et deux contrôles de films d'accueil explicitement désactivés ; aucun de ces contrôles n'est annoncé vérifié. Détails et logs : [`verifications.json`](../../reports/lot8/verifications.json).

**Parcours navigateur réel, compilation de production** : [`parcours.json`](../../reports/lot8/parcours.json). Connexion/inscription natives, trois comptes clients sans exemption, boutons de souscription/recharge et réservation/annulation, rapprochement, factures disponibles du compte, verrouillages vidéo/publicité, absence de second projet sur le même abonnement ; puis demande support, prise en charge/réponse équipe, isolation, demande de réinitialisation, réception SMTP locale, nouveau mot de passe et refus du lien réutilisé. Un projet de services et deux projets produits fictifs. Aucun worker lancé dans cette recette navigateur ; ses droits/dispatch sont contrôlés séparément par les tests natifs du dépôt.

**68 captures ordinateur/mobile**, consultées visuellement sur les principaux écrans : [galerie et téléchargements](../../reports/lot8/README.md), [tailles et empreintes](../../reports/lot8/captures.json). Pas de débordement horizontal détecté, aucune erreur JavaScript navigateur, zéro tentative réseau externe. Les données de carte et pages Stripe externes ne sont pas montrées comme vérifiées : la page de redirection annonce explicitement une simulation.

Le premier contrôle préliminaire utilisait Next en développement ; il a été arrêté pour libérer **son propre cache généré**, puis toutes les preuves finales ont été refaites en production. Le harnais a demandé des corrections de sélecteurs Playwright (plusieurs textes « 15 % », plusieurs éléments `role=status`) et de lecture d'une réponse après navigation ; aucune correction applicative postérieure au SHA compilé n'en a résulté. Le harnais final exécuté est identifié par SHA-256 dans `parcours.json` et livré avec les preuves.

Séparation des résultats :

| Catégorie | Résultat prouvé |
|---|---|
| Application / SQLite / auth / API / handlers / navigateur | Tests locaux ci-dessus ; vraie application native, données fictives |
| Transport Stripe, SCA/refus/événements/remboursements | **Simulations locales**, zéro requête Stripe réelle ; ne prouve pas le parcours Stripe TEST externe |
| E-mail | Nodemailer et vrai protocole SMTP sur loopback, 1 message accepté et reçu dans la boîte **locale** de recette ; reset utilisé et invalidé |
| Fournisseur SMTP / boîte externe | **Non vérifié**, aucun accès sandbox externe |
| Générations IA / qualité créative / CMS / publication sociale | **Non exécuté**, hors dépenses autorisées de ce lot |
| Studio de Thomas | **Non mis à jour, version non vérifiée** ; aucune fusion/déploiement |

CI du SHA de livraison : état vérifié lors de la publication, consigné dans le message de livraison ; aucun statut vert présumé dans ce rapport. Les logs locaux ne remplacent pas GitHub Actions.

**Accès** : Stripe est le prestataire du code. Cet exécuteur n'a ni secret/identité TEST ni variable correspondante et sa politique réseau n'autorise pas le domaine Stripe. Aucun accès aux réglages du Codespace de Thomas n'est prétendu. Aucun secret demandé dans la conversation. Une simulation locale de SCA/refus, même réussie, ne prouve pas la vraie page d'authentification supplémentaire, la facture fiscale ni la réception des webhooks Stripe. Pas de boîte externe sandbox configurée : aucune réception de courriel chez un fournisseur externe affirmée.

**Disponibilité** : branche de travail seulement ; aucune fusion ni mise à jour du Codespace habituel. L'adresse habituelle de Thomas n'est pas une preuve que ce code y est servi. La version compilée de la recette isolée sera consignée par `/api/version` ; la version du studio de Thomas reste à vérifier après intégration autorisée ultérieurement.

## Lecture simple pour Thomas

Les droits des forfaits sont mieux alignés entre boutons et serveur. Les paiements interrompus gardent leur identité et les crédits ne peuvent plus être perdus entre deux écritures ; un reçu ancien orphelin peut être rapproché sans racheter. Les retours de paiement et remboursements ne promettent plus un succès absent. Le compte permet de suivre une demande et une réponse de l’équipe.

La recette locale est livrée avec ses captures. Il reste à confirmer les décisions commerciales ouvertes et à faire la recette externe Stripe TEST / e-mail sandbox avec un accès adapté. Rien de cette branche n’est encore installé dans votre studio habituel.
