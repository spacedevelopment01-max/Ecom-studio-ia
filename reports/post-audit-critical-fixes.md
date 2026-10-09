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

- **Coût maximal du texte, tarifs, modèle de repli** : traités après coup, voir la section 10 « Validation finale du
  plafond fournisseur » (comptage officiel des jetons, repli serveur supprimé, tarifs périmés bloqués).
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

## 10. Validation finale du plafond fournisseur

Objectif : que la dépense **réellement facturée par les fournisseurs** reste ≤ 40 % du prix HT de l'abonnement et
≤ 50 % du prix HT des packs — et pas seulement qu'un relevé interne plafonné à 0 le fasse croire. Aucun appel payant
n'a été lancé pour cette validation (fournisseurs simulés dans les tests).

### Principe

Avant chaque envoi, le **coût maximal que le fournisseur peut facturer pour cette requête** est réservé sur le budget
(transaction atomique). Si ce maximum ne peut pas être calculé de façon fiable, la requête **n'est pas envoyée**.
Le relevé interne n'est donc qu'un reflet : c'est la borne de chaque requête envoyée qui protège la marge.

### Ce qui a changé

| Point demandé | Avant | Maintenant |
|---|---|---|
| Texte : entrée | estimée d'après les caractères (1 jeton ≈ 2,5 caractères) | **nombre exact** de jetons donné par Anthropic pour ce modèle (`count_tokens`, gratuit), + octets du schéma de sortie imposé, + marge 2 % + 512 jetons |
| Texte : sortie | `max_tokens` | `max_tokens` (la réflexion est comptée dedans, Anthropic ne peut pas le dépasser), vérifié ≤ sortie maximale du modèle |
| Texte : tarifs d'entrée | tarif d'entrée ×1,25 | inchangé : tout est compté au tarif d'écriture en cache (le plus cher, ×1,25) |
| Entrée très longue | non contrôlée | **bloquée** au-delà de 200 000 jetons (100 000 pour Haiku 5.5) : au-delà, un autre barème peut s'appliquer |
| Modèle aux limites inconnues | accepté s'il avait un tarif | **bloqué** (table `TEXT_MODEL_LIMITS`) |
| Repli serveur (`fallbacks: "default"`) | actif : Anthropic pouvait servir un autre modèle, **plus cher**, non couvert | **supprimé** |
| Relances | SDK Anthropic : 3, SDK OpenAI : 2, invisibles pour la réservation | SDK : **0** ; relances maison (2 au plus) **dans la même réservation**, uniquement sur une réponse d'erreur HTTP (rien de produit ni facturé) ; coupure en cours de réponse → incertain, jamais relancée |
| Modèle servi ≠ modèle demandé | compté au prix du modèle servi s'il était connu | compté **au plus cher des deux** ; débit jamais au-delà de la réservation, excédent signalé |
| Tarifs jamais confirmés ou vérifiés il y a plus de 90 jours | simple alerte | **toute génération payante bloquée** jusqu'à « J'ai vérifié les tarifs » (Administration) |
| Change USD → EUR | taux saisi | taux saisi **+ 5 %** sur chaque réservation |
| Veo | réservé et compté sur la durée demandée (ex. 4 s) alors que Veo 3 produit et facture 8 s | **au moins 8 s** réservées et comptées |
| fal (Kling) | durée envoyée telle quelle (Kling n'accepte que 5 ou 10 s) | durée **arrondie au-dessus à 5 ou 10 s**, la même valeur est envoyée, réservée et comptée ; autre modèle fal : **bloqué** |
| OpenAI images | forfait de 6 300 jetons de sortie, entrée estimée | sortie par taille et qualité (tableau OpenAI), entrée ≤ octets du texte + 1 500 jetons par image envoyée, `n: 1` explicite ; taille inconnue : bloquée |
| Gemini images | prix de l'image seulement | prix de l'image + jetons d'entrée (texte + 1 300 par image de référence) |
| Budgets abonnement / packs | une seule réserve commune | **deux réserves distinctes** : chaque réservation note sa part sur l'abonnement et sa part sur les packs ; règlement, libération et réconciliation rendent chaque part à son budget |
| Bouton « Tester la clé » Anthropic | petite génération payante | comptage de jetons (**gratuit**) |

### Opérations garanties (sous réserve des conditions ci-dessous)

- **Texte (Anthropic)** : le maximum facturable est entièrement déterminé par des grandeurs que le fournisseur garantit
  lui-même : jetons d'entrée comptés par son propre outil, plafond `max_tokens` qu'il applique, aucun outil payant
  côté serveur, aucun repli vers un autre modèle, aucune relance invisible. **Démontré** dans la limite de deux
  hypothèses : (1) les consignes que le fournisseur ajoute pour le format de sortie et la réflexion restent sous la
  marge prévue (octets du schéma + 2 % + 512 jetons) — documentées comme faibles, **non chiffrées** par Anthropic ;
  (2) les tarifs saisis sont justes.
- **Appels simultanés** : réservation atomique ; jamais plus que le disponible réservé (testé).
- **Relances, délais, coupures, processus arrêté** : chaque requête qui a pu être facturée est couverte par une
  réservation ; un résultat incertain retient le maximum ; une réservation orpheline est retenue au maximum après 2 h.
- **Abonnement et packs** : aucune opération ne peut réserver plus que la somme des deux restes ; chaque part revient
  à son budget (testé).

### Opérations bloquées (plutôt que d'estimer)

Tarif inconnu ou non « jetons » pour un modèle de texte ; tarifs non confirmés ou périmés (> 90 jours) ; modèle de
texte aux limites inconnues ; comptage des jetons impossible (erreur autre qu'une saturation passagère) ; entrée
au-delà de 200 000 jetons ; taille d'image OpenAI hors tableau ; modèle vidéo fal autre que Kling ; génération hors
suivi de réservation.

### Bornes documentées mais non démontrables de notre côté (risques résiduels)

- **Images OpenAI** : la borne des jetons d'image d'entrée (1 500 par image) suit la méthode de calcul publiée pour
  la vision (tuiles de 512 px) ; OpenAI ne la garantit pas explicitement pour `gpt-image-1`. Marge de 25 % en plus.
- **Gemini images** : un seul visuel est attendu ; si Gemini renvoyait plusieurs images dans une réponse, chacune
  serait facturée. Marge de 25 %, non suffisante en théorie pour 2 images.
- **Veo** : on suppose qu'un appel produit **une** vidéo de **8 s au plus** (comportement par défaut documenté de
  Veo 3, aucun paramètre de durée ni de nombre n'est envoyé). Un changement de ce comportement par Google ne serait
  pas détecté avant la facture.
- **fal** : prix à la seconde de Kling saisi dans l'administration ; fal ne fournit pas le coût réel dans la réponse.
- **Tarifs et change** : la vérification tous les 90 jours est **imposée**, mais l'exactitude des chiffres saisis
  dépend de vous. Une hausse de prix entre deux vérifications ou une baisse de l'euro de plus de 5 % ne serait pas
  couverte.
- **Réconciliation** : les appels incertains restent comptés au maximum tant que la facture n'a pas été rapprochée
  (fonction prête, pas d'écran).
- **Seuil de 200 000 jetons** : choisi par prudence ; Anthropic n'annonce pas de barème « long contexte » pour les
  modèles utilisés, mais ne le garantit pas non plus. Les requêtes du studio sont très en dessous.

### Fichiers modifiés (cette validation)

`src/lib/ai/llm.ts` (coût maximal par `count_tokens`, plus de repli serveur, SDK sans relance, relances maison,
modèle servi compté au plus cher, test de clé gratuit) · `src/lib/ai/config.ts` (`assertPricesFresh`,
`TEXT_MODEL_LIMITS`, `FX_SAFETY`, entrée Gemini) · `src/lib/ai/media-providers.ts` (bornes OpenAI/Gemini, Veo ≥ 8 s,
fal 5/10 s, SDK OpenAI sans relance, `n: 1`) · `src/lib/billing.ts` et `src/lib/db.ts` (réserves séparées
abonnement / packs) · `src/app/api/admin/test/route.ts`, `src/components/admin.tsx` (textes) ·
`vitest.config.ts` (tarifs « confirmés » pour les tests) · tests : `tests/budget-ia.test.ts` + simulateur de comptage
de jetons ajouté aux 10 fichiers de test qui simulent Anthropic.

### Tests ajoutés (`tests/budget-ia.test.ts`, bloc « plafond fournisseur »)

| Cas | Vérifié |
|---|---|
| Entrée très dense (150 000 jetons pour quelques caractères) | réservation = jetons comptés, même modèle, même système, mêmes messages que l'envoi |
| Entrée de 250 000 jetons | bloquée, aucun envoi, aucune réservation |
| Comptage impossible / saturé | bloqué / erreur relançable, aucun envoi |
| Modèle plus cher (Fable 5.1) | réservation au tarif Fable (> 4× Sonnet) ; modèle tarifé mais aux limites inconnues : bloqué |
| Repli et modèle servi différent | aucun `fallbacks` ni `betas` envoyé ; réponse d'un autre modèle comptée à son tarif, réglée dans la réservation |
| Relances | 429 : 3 essais dans **une** réservation, rendue ; coupure en cours de réponse : 1 essai, incertain |
| Tarifs périmés (91 jours) ou jamais confirmés | texte et image bloqués, aucune requête réseau |
| Veo 4 s demandées | 8 s réservées |
| fal 6 s demandées | 10 s envoyées et réservées ; autre modèle fal bloqué |
| OpenAI images | borne par taille et qualité ; taille inconnue bloquée |
| Budgets séparés | répartition, refus au-delà des restes, règlement et libération par budget |

Résultats : `npx tsc --noEmit` OK · `npx vitest run` **991/991** · `npm run build` OK. Parcours navigateur **non
rejoués** pour cette étape (seuls deux textes de l'administration changent à l'écran).

### Verdict

- **Texte (Anthropic)** — l'essentiel de la dépense : le plafond strict **peut être respecté**, avec une démonstration
  qui ne dépend que du comptage officiel, du plafond de sortie appliqué par Anthropic et de tarifs justes. Seule la
  petite part de consignes ajoutées par le fournisseur est couverte par une marge et non par un chiffre publié.
- **Images et vidéos** : plafond respecté **si les fournisseurs se comportent comme documenté** (une image ou une vidéo
  par appel, 8 s pour Veo, tarifs saisis exacts). Ce n'est **pas une garantie absolue** : aucun de ces fournisseurs ne
  permet de fixer côté requête un montant maximal facturable.
- Je ne peux donc pas annoncer de garantie absolue sur l'ensemble. La garantie est **forte pour le texte**,
  **conditionnelle pour les médias**, et dépend partout de **tarifs vérifiés** — vérification désormais imposée.
- **À faire de votre côté après fusion** : Administration › Modèles et tarifs → comparer les tarifs et le taux
  USD → EUR avec les pages officielles, puis cliquer « J'ai vérifié les tarifs ». Sans cela, **toutes les
  générations payantes restent bloquées** (le moteur local gratuit continue de fonctionner).

