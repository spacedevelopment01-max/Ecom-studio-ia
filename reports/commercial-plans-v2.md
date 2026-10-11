# E-COM STUDIO IA — Forfaits V2 : abonnements, projets et accès clients

Branche : `claude/ecom-studio-ia-platform-8cwl79` (non fusionnée, non mise en production).
Aucun appel IA payant, aucun paiement réel : Stripe est **simulé** dans tous les tests.

> Ce qui est vérifié : tests automatisés (TypeScript, Vitest), parcours dans un vrai navigateur sur une base de test
> séparée (ordinateur et téléphone), captures dans `reports/screenshots/commercial-plans-v2/`.
> Ce qui ne l'est pas : **aucune connexion Stripe réelle n'a été essayée** (ni en mode test Stripe avec de vraies clés,
> ni en production). Les paiements, webhooks, proratisations et remboursements sont prouvés contre un Stripe simulé
> uniquement : un essai en mode test Stripe reste à faire avant l'ouverture.

## 1. Architecture des abonnements

| Élément | Où | Rôle |
|---|---|---|
| Compte utilisateur | `users` | Personne connectée ; peut avoir plusieurs projets. |
| Abonnement | `subscriptions` | Clé `sub_<id>` (anciens : clé = id du compte). `owner_user_id` = propriétaire, `project_id` = projet (unique, définitif). |
| Projet | `projects` | Données d'une activité ; `hidden = 1` pour les anciens essais gratuits. |
| Budget IA | `wallets` (clé de l'abonnement) | 40 % du prix HT mensuel du forfait, recharges à part (50 % du HT). |
| Recharge IA | `payments.kind = 'topup'`, `account_key` | Rattachée à l'abonnement du projet choisi. |
| Rendez-vous | `call_slots`, `call_bookings` | Créneaux de l'équipe, réservations par projet. |
| Sessions de paiement | `checkout_sessions` | Réutilisation d'une session ouverte (double clic, actualisation). |
| Événements Stripe | `stripe_events` | Un événement déjà traité est ignoré. |

Le projet d'un appel IA est connu (route, tâche du worker) : `accountKeyFor()` retrouve l'abonnement du projet ; un projet
sans abonnement n'a **aucun** budget (clé virtuelle `noplan:`), donc aucun appel payant.

## 2. Règle « 1 abonnement = 1 projet » et anti-contournement

- `subscriptions.project_id` : index **unique** ; déclencheurs SQLite qui interdisent de changer le projet ou le
  propriétaire d'un abonnement rattaché, et de supprimer un abonnement rattaché.
- Création d'un projet : transaction + mise à jour conditionnelle (`project_id IS NULL`) ; deux requêtes simultanées
  ne peuvent pas utiliser le même abonnement (testé).
- Suppression ou archivage : le projet est archivé, l'abonnement reste rattaché (jamais libéré). Duplication : passe
  par la création, donc exige un abonnement libre.
- Le forfait n'est lu que dans `subscriptions` : aucune valeur envoyée par le navigateur ni réglage JSON du projet ne
  donne de droit (testé).
- L'URL de retour du paiement ne débloque rien : seuls les webhooks signés créent l'abonnement.

## 3. Droits des quatre forfaits (centralisés dans `src/lib/plan-gates.ts`)

| | Découverte | Créer 49 € | Développer 89 € | Dominer 129 € |
|---|---|---|---|---|
| Projet réel | 0 | 1 | 1 | 1 |
| Thèmes sélectionnables | aperçu des 30 | 10 | 20 | 30 |
| Boutique, logo, images IA | non | oui | oui | oui |
| Vidéos IA | non | non (montage sans IA) | courtes (≤ 30 s) | avancées + UGC |
| Sections IA | non | non | oui | oui |
| Blog IA | non | non | 4 / mois | 12 / mois |
| Calendrier | démo | 7 jours | 30 jours | 90 jours |
| Publications programmées / jour | aucune | 1 | 3 | 5 |
| Variantes publicitaires | démo | 1 | 3 | 6 |
| Rendez-vous 60 min | — | 60 € | 30 € | 1re heure offerte (une fois par compte), puis tarif fixé par l'équipe |

Contrôlés côté serveur : routes API, worker (changement de thème par le chat), moteur vidéo, blog, publications,
calendrier, publicités. Images, vidéos et UGC n'ont plus de quota en nombre : seul le budget IA du projet limite
(choix du propriétaire). Annuel conservé (10 mois payés).

## 4. Découverte (gratuit)

- Compte gratuit sans carte : page « Mes projets » propose le **studio de démonstration** (`/studio/decouverte`) et les
  trois forfaits. Aucune création de projet possible sans abonnement (réponse 402 `subscription_required`).
- Le studio de démonstration ne réutilise que des exemples existants (`public/demo`) : marques, boutiques (ordinateur
  et téléphone), les 30 thèmes, images et vidéos, éditeur de publicité miniature, documents texte, calendrier,
  retouches de couleur et de texte. Aucun appel IA, aucune écriture, aucune publication, aucun export (testé sur le code
  de la page). Clairement signalé « Démonstration ».
- Anciens essais gratuits : masqués, conservés ; un abonnement payé libre peut en reprendre un comme projet.

## 5. Les 30 thèmes

Ordre de la bibliothèque dans `src/lib/theme/theme-access.ts` (10 Créer, 10 de plus Développer, 10 de plus Dominer).
Galerie : chaque thème indique le forfait qui l'ouvre ; dans un projet, les thèmes au-delà sont verrouillés (et refusés
par le serveur). Après une baisse de forfait, le thème déjà utilisé est conservé.

## 6. Budgets IA

- 40 % du prix mensuel HT de l'abonnement (arrondi prudent à la baisse), par projet ; anciens abonnés : calculé sur le
  prix qu'ils paient réellement (`price_cents`) jusqu'à leur renouvellement.
- Barre d'utilisation par projet dans « Mes projets », « Mon compte » et la fenêtre « Gérer mon abonnement ».
- Le plafond de 40 % n'a pas été modifié.

## 7. Recharges (10 € TTC)

- Achat depuis « Gérer mon abonnement » d'un projet ; budget fournisseur = 50 % du HT, pour ce seul projet.
- Jamais créditée deux fois (paiement unique par session Stripe) ; une recharge visant le projet d'un autre compte
  n'est pas créditée ; un remboursement retire le budget correspondant (dans la limite de ce qui reste).
- Anciens packs : plus en vente, droits déjà acquis conservés.

## 8. Accompagnement téléphonique

- Page client `/studio/rendez-vous` : projet concerné, prix selon son forfait, créneaux réels (heure de Paris),
  réservation, rendez-vous à venir, report et annulation jusqu'à 24 h avant.
- Heure offerte DOMINER : une seule fois par compte (index unique), même avec un second abonnement DOMINER ; rendue si
  annulée dans les délais. Tarif DOMINER suivant : réglé dans Administration › Rendez-vous ; tant qu'il n'est pas fixé,
  pas de réservation payante DOMINER (rien d'inventé).
- Un créneau = un rendez-vous (index unique) : deux réservations simultanées → une seule réussit (testé).
- Payant : créneau bloqué 35 min « en attente de paiement », confirmé par le webhook ; session expirée → créneau libéré ;
  payé trop tard et créneau repris → remboursement automatique et alerte à l'équipe.
- Administration : ouverture de créneaux par période / jours / heures, blocage, suppression, liste des rendez-vous,
  « fait », heures offertes utilisées.

## 9. Stripe (`src/lib/payments-v2.ts`)

- Plusieurs abonnements indépendants par client : session `subscription` → à la confirmation, abonnement « en attente
  de création de projet » (un seul par abonnement Stripe, index unique, livraisons simultanées gérées).
- Changement de forfait d'un projet : mise à jour de son abonnement Stripe (`price_data`) ; hausse facturée au prorata
  tout de suite, baisse au prorata sur les factures suivantes. Les autres projets ne changent pas.
- Résiliation en fin de période et annulation de la résiliation, par projet. Réabonnement d'un projet résilié : même
  projet, jamais un autre.
- Paiement différé non confirmé, abonnement Stripe terminé : aucun droit. Événements dans le désordre : un état plus
  ancien n'écrase pas un plus récent.
- Anciens abonnés : nouveau prix **au prochain renouvellement**, lancé à la main par l'administration
  (`POST /api/admin/billing/reprice-legacy`, aperçu puis application) : prix Stripe changé sans proratisation, rien
  facturé tout de suite, client prévenu dans son espace.
- Les anciens parcours (forfait unique par compte, packs) restent en place pour les sessions déjà ouvertes.

## 10. Administration

- Onglet **Abonnements** : indicateurs (abonnements actifs / mois TTC, répartition par forfait, offerts, impayés, sans
  projet, conversion comptes → abonnés, encaissements, coût IA réel, marge estimée), puis chaque compte → ses projets
  (forfait, statut Stripe, échéance, budget IA utilisé / disponible, recharges, coût IA réel, rendez-vous, heure
  offerte). Exemple du cahier des charges (49 + 89 + 129) : total 267 € TTC / mois (testé).
- Gestes : offrir un forfait à un projet, le retirer, offrir un abonnement « en attente de projet » à un compte. Un
  abonnement payé par Stripe ne se modifie pas ici.
- Onglet **Rendez-vous** (voir § 8). Routes réservées au compte administrateur (testé).

## 11. Fichiers principaux

- Modèle et migration : `src/lib/db.ts` (`migrateBillingV2`, tables `checkout_sessions`, `call_slots`, `call_bookings`).
- Abonnement ↔ projet : `src/lib/project-billing.ts`, `src/lib/project-subscriptions.ts`, `src/lib/billing-scope.ts`.
- Droits : `src/lib/plan-gates.ts`, `src/lib/theme/theme-access.ts`, `src/lib/plans.ts`, `src/lib/quotas.ts`.
- Paiements : `src/lib/payments-v2.ts`, `src/lib/payments.ts`, `src/app/api/billing/checkout/route.ts`,
  `src/app/api/projects/[id]/subscription/route.ts`, `src/app/api/admin/billing/*`.
- Rendez-vous : `src/lib/appointments.ts`, `src/app/api/calls/*`, `src/app/api/admin/calls/route.ts`,
  `src/components/studio/calls.tsx`, `src/app/studio/rendez-vous/page.tsx`.
- Écrans : `src/components/studio/home.tsx` (Mes projets), `src/components/studio/new-subscription.tsx`,
  `src/components/studio/project-subscription.tsx`, `src/components/account.tsx`, `src/components/pricing.tsx`,
  `src/app/page.tsx` (tarifs, FAQ), `src/app/studio/decouverte/page.tsx`, `src/lib/demo-content.ts`,
  `src/components/studio/theme-gallery.tsx`, `src/components/admin-plans.tsx`, `src/lib/admin-billing.ts`.
- Scripts de test navigateur : `scripts/forfaits-v2/` (base de test séparée).

## 12. Migration (non destructive)

- Sauvegarde automatique avant migration : `data/backups/avant-forfaits-v2-<date>.db` (copie complète `VACUUM INTO`).
- Aucune suppression : tables reconstruites sans la contrainte « un abonnement par compte », colonnes ajoutées.
- Anciens abonnés payants : leur abonnement est rattaché à leur projet le plus récent ; leur prix et leur budget
  restent ceux qu'ils paient jusqu'au renouvellement au nouveau tarif (si l'équipe le lance).
- Comptes n'ayant jamais payé : anciens projets masqués (conservés, récupérables avec un abonnement).
- Retour arrière : restaurer la sauvegarde ci-dessus (l'ancien code lit les mêmes tables ; les colonnes ajoutées sont
  ignorées).
- Situations à régulariser à la main : un ancien abonné qui a **plusieurs** projets actifs n'en garde qu'un rattaché à
  son abonnement ; les autres restent visibles mais sans forfait (l'équipe peut offrir un forfait ou proposer un
  nouvel abonnement).

## 13. Tests

Nouveaux fichiers : `abonnement-projet`, `permissions-forfaits`, `paiements-projets`, `forfaits-interface`,
`rendez-vous`, `admin-forfaits` (+ mises à jour de ~20 fichiers existants). Couvre la liste du § 21 : création
refusée sans abonnement, un abonnement = un projet, archivage / suppression / duplication, concurrence, projets
indépendants (budgets, forfaits, résiliation), webhook répété, paiement échoué, abonnement payé utilisable plus tard,
migration, thèmes 10/20/30, vidéos, blog, calendrier et publications, recharges au bon projet, prix des rendez-vous,
heure offerte unique, créneau unique. Dernière exécution complète : 152 fichiers, 1 297 tests réussis ; TypeScript sans erreur.

Parcours navigateur (base de test, Chromium, ordinateur 1440 px et téléphone 390 px) : accueil (tarifs), compte
Découverte, studio de démonstration, Mes projets (2 projets + abonnement en attente + ancien essai), Gérer mon
abonnement, Mon compte, Rendez-vous, Administration › Abonnements et › Rendez-vous. Aucune erreur JavaScript, aucun
débordement horizontal sur téléphone.

## 14. Fonctions non encore opérationnelles

- **Stripe réel non essayé** (voir en tête). À faire en mode test Stripe : souscription, changement de forfait,
  résiliation, recharge, rendez-vous, remboursement, webhooks.
- Directions artistiques initiales 1 / 3 / 5, nombre de langues et niveaux SEO « essentiel / avancé / complet » :
  affichés selon la configuration mais pas encore limités côté serveur.
- Rappels automatiques de rendez-vous (e-mail / SMS) et lien de visioconférence : non faits ; l'équipe appelle le
  numéro indiqué.
- Le tarif DOMINER après l'heure offerte doit être fixé par l'équipe : [À compléter : prix].
- Le passage des anciens abonnés au nouveau tarif n'est pas lancé automatiquement (décision et message client à
  valider avant de cliquer).

## 15. Risques résiduels

- Fuseau : créneaux à l'heure de Paris ; un client à l'étranger voit l'heure de Paris (indiqué à l'écran).
- Un remboursement automatique Stripe peut échouer : l'équipe est alors alertée pour le faire à la main.
- Les montants de marge sont des estimations (hors frais Stripe et autres charges).
- La reprise d'un ancien essai gratuit est définitive (comme une création de projet).
