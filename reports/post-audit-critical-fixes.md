# Correctifs prioritaires après l'audit général

Branche dédiée : `claude/post-audit-critical-fixes`, créée à partir de `claude/ecom-studio-ia-platform-8cwl79` (12A et
check-up inclus, rien d'écrasé). **Non fusionnée.** Aucun appel d'IA payant, aucun prix commercial modifié, aucun moteur
V1 supprimé, pas de refonte de l'accueil, Phase 13 non commencée.

Source des problèmes : `reports/general-checkup.md` (P0 financiers, P0/P1 de la Phase 12A, P1 de sécurité).

---

## 1. Budget IA (P0 financiers)

### Problèmes corrigés

| Problème (audit) | Correction | Vérification |
|---|---|---|
| Budgets au-dessus de 40 % du HT (5 formules sur 6 ; 67–83 % le 1er mois) | Budget mensuel = **40 % du prix mensuel HT applicable** (TVA 20 %, équivalent mensuel remisé en annuel), arrondi à l'inférieur ; plus de budget fixe par forfait | test + mesure ci-dessous |
| Budget de création de 12 € en plus | **Supprimé** : la première création est prise sur le budget mensuel | test « première création » |
| Changement de forfait | Budget **au prorata** de la période restante (ancien forfait pour la partie écoulée) ; résiliation : plus d'IA | test « changement de forfait » |
| Packs / recharges sans plafond distinct | **Budget distinct = 50 % du prix HT payé** (remise du forfait comprise), une seule fois par paiement ; anciennes recharges : 50 % du HT (au lieu de 50 % du TTC) | test « recharge / pack » |
| Pas de réservation : appels simultanés au-delà du budget | **Réservation atomique du coût MAXIMAL** avant tout appel (une seule instruction SQL conditionnelle, sûre entre le site et le worker) ; le reste disponible déduit les réservations en cours | tests « appels simultanés » et « réservations concurrentes » |
| Débit au-delà du solde (solde négatif) | Débit plafonné au disponible ; un coût réel supérieur à la réservation est **inscrit à part (dépassement) et signalé**, jamais débité en négatif ; plus aucun appel ne part ensuite | test « estimation trop basse » |
| Appel incertain (délai dépassé, coupure) compté 0 € | **Coût maximal retenu** par prudence, réconciliable avec la facture du fournisseur (`reconcileReservation`) | test « délai dépassé » |
| Appel facturé après une erreur (réponse reçue mais inexploitable) | Considéré comme parti : coût maximal retenu | test « image facturée mais inexploitable » |
| Refus du fournisseur (clé, quota, 429, 5xx) | Réservation **rendue** (rien n'a été produit) | test « refus du fournisseur » |
| Réservation orpheline (processus arrêté pendant l'appel) | Traitée comme incertaine après 2 h ; la tâche relancée réserve à nouveau ; un usage déjà compté n'est jamais redébité | test « reprise de worker » |
| Passe-droits administrateur | Supprimés : thème sur mesure (pré-contrôle et limite mensuelle), création complète (visuels, vidéo, calendrier sans forfait), limite de boutiques ; **budget IA non augmentable à la main** (seulement réduit) | tests « administrateur » et « limite de boutiques » |
| Anciens portefeuilles | **Mise en conformité unique** : budget de la période ramené au plafond ; budget hors forfait (ancienne enveloppe de création) plafonné à ce que les packs/recharges payés justifient ; chaque ajustement inscrit au relevé interne, aucune donnée supprimée | test « anciens portefeuilles » |

### Mesure après correction (base de test, aucun appel réel)

| Formule | Prix TTC/mois | HT | Plafond 40 % | Budget disponible 1er mois | % du HT |
|---|---|---|---|---|---|
| Créer mensuel | 49,90 | 41,58 | 16,63 | 16,63 | ≤ 40 % |
| Créer annuel | 41,58 | 34,65 | 13,86 | 13,86 | ≤ 40 % |
| Vendre mensuel | 79,90 | 66,58 | 26,63 | 26,63 | ≤ 40 % |
| Vendre annuel | 66,58 | 55,48 | 22,19 | 22,19 | ≤ 40 % |
| Dominer mensuel | 99,90 | 83,25 | 33,30 | 33,30 | ≤ 40 % |
| Dominer annuel | 83,25 | 69,38 | 27,75 | 27,75 | ≤ 40 % |

Avant : 67 à 83 % du HT le premier mois. Concurrence (même scénario que l'audit) : disponible 16,63 €, deux appels de
14,97 € → **1 accepté, 1 refusé** (avant : les deux acceptés, solde −22,40 €). Coût réel supérieur à la réservation :
disponible **0,00 €** (avant : −72,40 €).

### Où la protection s'applique (côté serveur)

Tous les appels payants passent par deux points : `src/lib/ai/llm.ts` (texte, Anthropic) et
`src/lib/ai/media-providers.ts` (images OpenAI/Gemini, vidéo Veo/fal). Aucun autre module n'appelle un fournisseur
payant (vérifié par recherche dans le code). Ces deux points font, à chaque appel : droits du compte → plafond de la
tâche → **réservation** → envoi → règlement / rendu / incertain. Cela vaut pour le site, le worker, l'administrateur,
les moteurs V1 et V2.

---

## 2. Phase 12A — demande unique

| Problème (audit) | Correction |
|---|---|
| Exécution payante sans accord explicite | Sans devis payant accepté, **toute la demande tourne IA coupée** (`withAiDisabled`) : moteurs locaux, et tout appel payant qui partirait quand même est refusé avant l'envoi. La création complète lancée par la demande hérite de la même règle |
| Étape annoncée gratuite devenant payante | Même mécanisme : devis à 0 € ⇒ 0 appel payant possible (test avec IA « active » : 0 réservation, 0 appel) |
| Dépassement du plafond pendant une étape | Avec accord : plafond appliqué à **chaque appel** de la tâche (coût maximal vérifié avant l'envoi, tous moteurs V1/V2) ; la création lancée par la demande reçoit le même plafond ; une création lancée avant (formulaire) n'est plus comptée dans le plafond de la demande |
| Vidéo approuvée d'office | `approveGeneration` suit l'accord payant (plus de `true` codé en dur) |
| Devis incomplet | Les étapes que la création complète peut sauter (visuels, vidéo, calendrier, photos) sont **comptées** ; les étapes sans moteur sont marquées « non incluses » (0 €, plus facturées au devis) |
| Blog inaccessible faisant échouer la demande | Blog filtré par **forfait et quota** au devis et à l'exécution : étape « non faite » avec sa raison, la demande continue |
| Une étape en erreur arrêtait tout | L'erreur est inscrite sur l'étape (« en échec »), les autres étapes continuent |
| Étapes refusées/non exécutées affichées « faites » | Nouveau statut « non faite » (forfait, plafond, aucun moteur) ; l'écran affiche « X / N étapes faites · Y non faites » |
| « Réessayer » sans effet | Nouvelle action serveur `retry` : remet en attente les étapes en échec ou arrêtées par le plafond (et celles qu'elles bloquaient), puis relance **la même tâche** avec ses points de reprise : rien de ce qui a déjà été produit et facturé n'est refait (test : l'export déjà fait n'est pas refait) |

---

## 3. Sécurité

| Problème (audit) | Correction |
|---|---|
| OAuth réseaux sociaux non lié à la session | Le retour d'autorisation n'est accepté que si le compte **connecté dans ce navigateur** est celui qui a lancé la connexion ; sinon refus et rien n'est rattaché |
| Rôle administrateur attribué avant vérification | Avec `ADMIN_EMAIL` : le compte est créé « client » ; un **lien signé, usage unique, 24 h** est envoyé à cette adresse (ou écrit dans le journal du serveur si l'e-mail n'est pas configuré) ; le rôle n'est donné qu'au compte connecté de cette adresse qui l'ouvre. Sans `ADMIN_EMAIL` : plus de « premier compte administrateur » en production (seulement en développement). Les administrateurs existants sont conservés |
| Limite d'une boutique contournable (projet archivé encore utilisable) | Un projet supprimé (archivé) n'est plus accessible (API et studio) ; ses données restent en base |
| Passe-droit administrateur sur la limite de boutiques | Supprimé (l'administrateur suit son forfait, comme le demande la règle du produit) |
| Duplication d'une publication V2 par l'ancien écran | La copie reste V2 : approbation de sa version exigée avant tout envoi |

---

## 4. Fichiers modifiés

- Budget : `src/lib/billing.ts` (réécrit : règle 40/50 %, réservations, règlement, conformité), `src/lib/plans.ts`
  (budget fixe retiré, prix inchangés), `src/lib/db.ts` (table `ai_reservations`, colonnes `wallets.reserved` /
  `rule_version`, table `admin_claims`), `src/lib/ai/llm.ts`, `src/lib/ai/media-providers.ts`, `src/lib/payments.ts`,
  `src/app/api/admin/users/[uid]/route.ts`, `src/components/admin.tsx`.
- Passe-droits : `src/app/api/projects/route.ts`, `src/app/api/projects/[id]/theme/custom/route.ts`,
  `src/lib/engine/pipeline.ts`, `src/lib/theme/custom-access.ts`.
- Phase 12A : `src/lib/workflow/index.ts`, `src/lib/orchestrator/planner.ts`, `src/lib/orchestrator/execute.ts`,
  `src/lib/ai/access.ts`, `worker/index.ts`, `src/app/api/projects/[id]/workflow/[wid]/route.ts`,
  `src/components/studio/workflow-panel.tsx`.
- Sécurité : `src/app/api/oauth/[provider]/callback/route.ts`, `src/lib/auth.ts`, `src/lib/admin-claim.ts` (nouveau),
  `src/app/api/auth/admin-claim/route.ts` (nouveau), `src/app/api/auth/register/route.ts`,
  `src/app/api/auth/login/route.ts`, `src/app/studio/[projectId]/layout.tsx`, `src/app/api/posts/[pid]/route.ts`.
- Tests : `tests/budget-ia.test.ts` (17), `tests/workflow-garde-fous.test.ts` (7), `tests/securite-post-audit.test.ts`
  (4) — nouveaux ; mis à jour : `billing`, `admin-stats`, `trace-appels`, `workflow-v2`.

## 5. Preuves des tests

- `npx tsc --noEmit` : OK.
- `npx vitest run` : **114 fichiers, 980 tests, tous réussis** (avant : 952).
- `npm run build` : OK.
- Tests demandés, tous couverts par des tests automatisés : appels simultanés, estimation incorrecte, délai
  dépassé, appel facturé après erreur, budget épuisé, abonnement annuel, première création, recharge/pack,
  changement de forfait, refus de consentement, reprise de worker, séparation des comptes (+ mise en conformité,
  administrateur, OAuth, rôle administrateur, projet archivé, duplication V2).
- Parcours navigateur : voir § 8.

## 6. Protections vérifiées (et comment)

| Protection | Preuve |
|---|---|
| Budget ≤ 40 % HT (6 formules) | test + mesure § 1 |
| Packs ≤ 50 % HT, une fois par paiement | test (webhook Stripe simulé rejoué) |
| Réservation atomique / concurrence | tests (5 appels simultanés : 2 partent ; 5 réservations directes : 2 acceptées) |
| Jamais de solde négatif | tests (estimation trop basse, conformité) |
| Incertain = coût maximal retenu ; réconciliation | test |
| Refus fournisseur = rien débité | tests texte et image |
| Reprise de worker / réservation orpheline | test |
| Aucune dépense sans accord dans une demande | tests (refus de consentement, devis 0 € avec IA active, vidéo) |
| Plafond pendant les étapes | test (dépense ≤ plafond, aucune réservation restée ouverte) |
| OAuth lié à la session | test (lien ouvert par une victime : rien rattaché) |
| Rôle administrateur après confirmation | test |
| Séparation des comptes | tests (budget, projets) |

## 7. Risques résiduels (honnêtement)

- **Coût maximal du texte** : estimé à partir du nombre de caractères (1 jeton ≈ 2,5 caractères, majoré de 25 %) et du
  plafond de sortie. Une entrée exceptionnellement « dense » en jetons pourrait dépasser l'estimation : le dépassement
  n'est alors jamais débité au client (solde 0) mais il est réellement payé au fournisseur — il est **inscrit et
  signalé** (`overrun`), pas empêché. Sur de vrais appels, à mesurer.
- **Prix des fournisseurs** : la protection repose sur les tarifs saisis dans l'administration et le taux USD→EUR ;
  un tarif faux fausse les plafonds.
- **Modèle de repli du fournisseur** (« server-side fallback ») plus cher que le modèle demandé : couvert par le même
  mécanisme de dépassement signalé.
- **Appels incertains** : le coût maximal est retenu jusqu'à réconciliation **manuelle** (fonction prête, pas encore
  d'écran d'administration).
- **TVA** : hypothèse 20 % (France) ; les prix sont saisis TTC dans `plans.ts`.
- **Seuil minimal** (0,50 €) conservé : en dessous, l'IA est coupée même si un appel très court tiendrait.
- **Rôle administrateur** : sans service d'e-mail configuré, le lien n'est visible que dans le journal du serveur ;
  installation existante : l'administrateur actuel est conservé.
- Les autres points P2/P3 de l'audit (V1 encore utilisés, blog V1/V2, envoi Shopify sans contrôle CMS, import ZIP sans
  limite, envois de fichiers en mémoire, IP falsifiable, calendrier en double à la relance de création…) **ne sont pas
  traités** dans cette étape (voir `reports/remaining-work.md`).

## 8. Éléments qui nécessitent encore de vraies API

Mesure réelle des coûts (Anthropic, OpenAI, Gemini, Veo, fal) face aux maximums réservés ; comportement réel des
délais dépassés et des factures d'appels incertains ; paiement Stripe réel (pack, changement de forfait, prorata
réel de Stripe comparé au prorata du budget) ; envoi réel de l'e-mail de confirmation administrateur ; connexion
OAuth réelle (Meta, TikTok, Google, Pinterest, LinkedIn, Shopify).

## 9. Parcours navigateur rejoués après correction

Chromium, `next start` + vrai worker, bases de démonstration, aucune clé d'IA (0 €).

| Parcours | Résultat |
|---|---|
| Demande unique, 5 parcours + téléphone, worker coupé à 54 % puis relancé (`scripts/e2e-workflow-v2.ts`) | **36/36**, 0 appel d'IA, aucune erreur JavaScript — captures `reports/screenshots/post-audit/` |
| Inscription → photo → création complète → visite de chaque espace (`e2e-browser`) | **OK**, 0 px de débordement mobile, aucune erreur JavaScript |
| Éditeur visuel des publicités (`e2e-ad-editor`) | **28/28** |
| Export Shopify / WordPress (`e2e-cms-export`) | **11/11**, 0 appel d'IA |

Changements de comportement visibles, voulus :
- le parcours de la demande unique utilise désormais **un compte par boutique** : la limite d'une boutique par
  abonnement s'applique aussi à l'administrateur (le script de test a été adapté) ;
- dans `e2e-browser`, le compte de test (premier compte, administrateur, sans forfait) passe par la **découverte
  gratuite** : visuels, vidéo et calendrier ne sont plus faits d'office pour lui (création en 6 s au lieu de 55 s).
  Pour tester en payant, attribuer un forfait dans Administration › Clients.
