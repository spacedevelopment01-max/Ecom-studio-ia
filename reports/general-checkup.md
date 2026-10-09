# E-COM STUDIO IA — Check-up général (Phases 1 → 12A)

Date : 9 octobre 2026. Branche `claude/ecom-studio-ia-platform-8cwl79`, commit `5ffb652` (12A non fusionnée).
**Diagnostic seulement : aucune correction, aucune refonte, aucun moteur supprimé, aucune fusion.** Aucun appel d'IA
payant, aucune publication réelle, aucune donnée client réelle touchée (toutes les reproductions ont tourné sur des
bases de démonstration jetables dans `/tmp`).

## 0. Méthode

| Contrôle | Résultat |
|---|---|
| Lecture du code réel, module par module (routes `src/app/api`, worker `worker/handlers.ts`, moteurs `src/lib`, écrans `src/components/studio`), comparée aux rapports de phase | fait (5 passes parallèles + vérification manuelle des points graves) |
| `npx tsc --noEmit` | **OK** |
| `npx vitest run` (111 fichiers, 952 tests) | **951/952** : 1 dépassement de temps (`workflow-v2.test.ts` « parcours complet », 240 s) sous forte charge machine ; le même fichier passe seul (11/11) et la suite entière passait à 952/952 juste avant. → test trop lent, pas un défaut fonctionnel (P2) |
| `npm run build` | **OK** |
| Parcours navigateur rejoués (Chromium, `next start` + worker, bases de démo, 0 € d'IA) | voir tableau ci-dessous |
| Reproductions ciblées (scripts jetables, bases temporaires) | budget/abonnements, relance de création, scénarios 12A |

Parcours navigateur rejoués dans cet audit :

| Script | Résultat | Commentaire |
|---|---|---|
| `e2e-browser` (inscription → photo → création complète → visite de chaque espace, ordinateur + téléphone) | **OK** | création en 55 s, 0 px de débordement mobile, aucune erreur JavaScript |
| `e2e-ad-editor` (éditeur visuel des publicités) | **28/28** | un premier passage à 26/28 venait de mon montage (worker non lancé) ; rejoué correctement : 28/28 |
| `e2e-content-v2` (SEO & textes, blog) | **12/12** | |
| `e2e-social-v2` (studio Réseaux sociaux V2) | **27/28** | échec « Filtre Programmées » **reproduit 2 fois** ; cause trouvée : le test dépend de la date (aujourd'hui, la publication programmée du test tombe un dimanche et la conversation « Supprime les publications du dimanche » l'annule, ce qui est le comportement prévu). Défaut du test, pas de l'application (P3) |
| `e2e-theme-v2` (éditeur de site V2) | **24/24** | |
| `e2e-cms-export` (export Shopify / WordPress) | **11/11** | 0 appel d'IA |
| `e2e-workflow-v2` (Phase 12A, 5 parcours) | **36/36** | joué à la fin de 12A sur le même code |

Non rejoués : `e2e-interactions` (retouche par discussion, sélection dans l'aperçu), `e2e-pipeline`, benchmarks.

Légende des statuts : **V** fonctionnel et vérifié · **P** partiellement fonctionnel · **NC** développé mais non
connecté · **NT** non testé avec les vraies API · **B** bug détecté · **M** fonctionnalité manquante.
« Reproduit » = constaté en exécutant ; « code » = visible sans ambiguïté dans le code ; « risque » = possible, non démontré.

---

## 1. Contrôle financier (prioritaire)

Règles demandées : dépense fournisseurs IA ≤ **40 % du prix mensuel HT** de l'abonnement ; recharges IA : plafond
fournisseur distinct ≤ **50 % de leur prix HT**.

Comment le studio fait aujourd'hui (`src/lib/billing.ts`, `src/lib/plans.ts`, `src/lib/ai/access.ts`) :
budget caché fixe par forfait (`aiBudgetEur`), plus un budget unique « création de la boutique » de 12 € à la
première activation ; avant chaque appel : `assertAiAllowed` + `assertCanSpend(estimation)` ; après l'appel :
`recordUsage` → `charge` (coût réel × coefficient ≥ 1). Les prix des forfaits sont **TTC** (commentaire de `plans.ts`).

### 1.1 Calcul (reproduit sur base de test, TVA 20 %)

| Forfait | Prix mensuel TTC | HT | 40 % HT | Budget IA mensuel | % du HT | Disponible le 1er mois (+12 € création) | % du HT |
|---|---|---|---|---|---|---|---|
| Créer, mensuel | 49,90 | 41,58 | 16,63 | 16 € | 38 % ✅ | 28 € | **67 % ❌** |
| Créer, annuel | 41,58 | 34,65 | 13,86 | 16 € | **46 % ❌** | 28 € | **81 % ❌** |
| Vendre, mensuel | 79,90 | 66,58 | 26,63 | 34 € | **51 % ❌** | 46 € | **69 % ❌** |
| Vendre, annuel | 66,58 | 55,48 | 22,19 | 34 € | **61 % ❌** | 46 € | **83 % ❌** |
| Dominer, mensuel | 99,90 | 83,25 | 33,30 | 45 € | **54 % ❌** | 57 € | **68 % ❌** |
| Dominer, annuel | 83,25 | 69,38 | 27,75 | 45 € | **65 % ❌** | 57 € | **82 % ❌** |

→ **La règle des 40 % n'est respectée que pour « Créer mensuel » hors premier mois.** Le budget ne dépend pas du
mode de facturation (annuel moins cher par mois → pourcentage plus élevé).

### 1.2 Protections

| Protection | Statut | Preuve |
|---|---|---|
| Blocage sans forfait (Découverte = 0 €) | **V** | `aiActiveFor`/`assertAiAllowed` ; tests ; parcours 12A et CMS à 0 appel |
| Blocage quand le budget est épuisé (bascule moteur local) | **V** | `hasAiCredits` (seuil 0,50 €) ; tests `billing`/`quotas` |
| Coefficient ≥ 1 (le budget ne peut pas être débité moins que le coût réel) | **V** | `admin/settings/route.ts:32` |
| Renouvellement mensuel concurrent (web + worker) | **V** | mise à jour conditionnelle `WHERE period_end = ?` (`billing.ts:143-156`) |
| Webhook Stripe idempotent, signé, ordre des événements | **V** (code + tests) / **NT** avec Stripe réel | `payments.ts`, `audit-backend.test.ts` |
| **Réservation avant appel** | **M / B — reproduit** | aucun mécanisme de réservation. Reproduit : disponible 28 €, deux appels estimés 25,20 € chacun **tous deux acceptés** → 50,40 € dépensés, solde **−22,40 €**. Le worker exécute jusqu'à 3 tâches en parallèle (`worker/index.ts:34`), plus les appels faits par le serveur web |
| **Débit au-delà du solde** | **B — reproduit** | `charge` débite sans plancher : coût réel > estimation → solde négatif (reproduit : −72,40 €) |
| **Plafond 50 % des recharges / packs** | **M** | les packs (`creditPack`, `quotas.ts:130`) n'ajoutent **que des quotas**, aucun budget fournisseur dédié ni plafond (reproduit : budget IA identique avant/après un Pack Visuels) ; les visuels du pack consomment le budget mensuel. Les anciennes recharges créditent **50 % du prix TTC** (`LEGACY_TOPUP_AI_SHARE`, soit 60 % du HT) |
| Appel échoué après envoi (délai dépassé) | **risque** | tracé à coût 0 (`media-providers.ts`) alors que le fournisseur peut avoir facturé |
| Alerte à 80 % | **NC** | colonne `alert80_sent_at` remise à zéro mais jamais renseignée ni envoyée |
| Plafond de la demande unique (12A) | **B** | voir § 3 : vérifié seulement si l'étape a un devis > 0, jamais pendant l'étape |

**Conclusion financière : la protection « jamais plus de 40 % du HT » n'est PAS opérationnelle.** Les montants
sont trop élevés pour 5 formules sur 6 et le mécanisme (contrôle puis débit, sans réservation) ne garantit pas une
limite stricte, même avec de bons montants.

---

## 2. État par module

| Module | Statut | Constat principal |
|---|---|---|
| Comptes et authentification | **P** | Sessions, mot de passe, réinitialisation, limites : V. **Manquant** : vérification de l'e-mail, suppression de compte. Risque : prise du rôle admin par le premier inscrit avec ADMIN_EMAIL (pas d'e-mail vérifié) |
| Sécurité et permissions | **P** | 63 routes projet + routes hors projet : contrôle du propriétaire vérifié ligne par ligne ; webhook Stripe, anti-SSRF, chiffrement des clés, masquage des clés : V. **Bug** : rattachement OAuth réseaux sociaux non lié à la session (code, vérifié) ; décompression ZIP sans limite ; IP falsifiable pour les limites de fréquence |
| Projets, dossiers, sous-dossiers | **P** | Arborescence, renommage, déplacement de fichiers, corbeille restaurable : V. Déplacement d'un dossier : NC. Suppression réelle d'un projet, vidage de corbeille, quota de stockage : M. **Bug** : un projet « supprimé » (archivé) reste utilisable → limite « 1 boutique par abonnement » contournable |
| Project Brain | **V** | scopes utilisés par les moteurs, mémoire visible dans le Pilote, refus, faits du client, verrous de marque. Route admin `/api/admin/brain` sans écran (NC) |
| Intent / Planner / Router V2 | **P** | Router utilisé par tous les appels d'IA ; planner utilisé par la demande unique. Intention par l'IA : NC (`aiActive: false` codé). Tâche `plan.run` : jamais lancée (NC, pas de second orchestrateur actif) |
| Brand & Logo Engine | **P / NT** | Logo V2 accessible (onglet Marque) mais création complète et demande unique utilisent le **logo V1** ; l'onglet Marque montre 3 générateurs de logo côte à côte. Qualité avec vraie IA non prouvée (4B) |
| Image Engine V2 | **NC (écran) / NT** | Moteur testé, utilisé par Pubs V2 et Social V2 ; **aucun écran** ; l'onglet Images et la création complète restent en V1 |
| Advertising Engine V2 + éditeur | **V (local) / NT (payant)** | parcours navigateur 28/28. Fenêtre « Campagne » et « transformer en publications » encore V1. Visuels « publicité » de la création complète (V1) non modifiables dans l'éditeur |
| Video & UGC Engine V2 | **NC (écran) / NT** | Moteur testé ; **aucun écran** n'appelle `/videos/v2` ; onglet Vidéos et UGC en V1 ; une vidéo V2 produite par la demande unique ou Social V2 **n'est pas modifiable** par le client. Voix off et musique sous licence : M |
| SEO, textes, blog | **P** | Panneau « SEO & textes » V2 : 12/12 navigateur. **La boutique utilise les textes V1**, jamais les documents V2 (deux versions possibles d'une même page). Blog V1 et V2 sur la même table : une sauvegarde V2 peut écraser une modification V1 (code). Métachamps SEO Shopify : NT |
| Réseaux sociaux, automatisations | **V (simulé) / NT** | Studio V2 27/28 (échec = test daté). Publication réelle jamais exécutée ; statistiques des réseaux : M ; LinkedIn : export seulement. **Bug** : « Dupliquer » depuis l'ancien écran crée une copie V1 qui, une fois programmée par le client, échappe à la barrière et à l'approbation par version V2 |
| Calendrier | **P / B** | Tout nouveau projet reçoit encore un **calendrier V1** de 7 jours (pas seulement « les anciens »). **Bug reproduit** : « Suite de la création » recrée un calendrier → **7 → 14 publications** |
| Theme Engine V2 | **V (local) / NT** | éditeur 24/24 ; V2 par défaut. Galerie des directions et « change de direction » en V1 (volontaire). Reproduction d'un site existant en V1 (non listé) |
| CMS Engine V2 | **V (local) / NT** | export 11/11. Aucune installation réelle (Shopify jamais installé). **Envoi direct vers Shopify** sans les contrôles CMS V2 (code) |
| Studio Workflow V2 (12A) | **P / B** | voir § 3 |
| Fichiers et médias | **P** | téléchargements, versions, corbeille : V. Pas de quota ; envois jusqu'à 30 × 200 Mo en mémoire ; types de fichiers peu filtrés (P3) |
| Prévisualisations et exports | **V** | aperçu cloisonné et signé, ZIP, CSV, charte PDF, téléchargements. Chaque téléchargement d'export crée une copie (P3) |
| Abonnements et paiements | **P / B** | voir § 1. Stripe réel : NT |
| Suivi de consommation des API | **P** | `ai_calls` et `usage_events` tracés et testés ; écran Comptabilité ; route `/api/admin/ai-calls` sans écran ; alerte 80 % jamais envoyée |
| Interfaces ordinateur / téléphone | **V** | aucun débordement ni erreur JavaScript sur les parcours rejoués |

---

## 3. Contrôle prioritaire : Phase 12A (demande unique)

**Ce qui marche (vérifié)** : une demande → plan de l'orchestrateur → devis par module → lancement → moteurs V2
pour publicités, publications, SEO, vidéo, export → résultats enregistrés (`workflows`, `task_plans`, `posts`,
`ad_documents`, exports) → suivi + liens vers les éditeurs → éléments à valider ; reprise après coupure du worker ;
même demande non refaite (parcours 36/36).

| # | Problème | Priorité | Nature |
|---|---|---|---|
| 1 | Le plafond n'est vérifié avant une étape **que si son devis est > 0** (`workflow/index.ts:384`). Une étape notée « 0 € / faite par la création » mais que la création a sautée (ex. vidéos « aucune ») s'exécute **sans accord ni plafond** ; l'étape vidéo est lancée avec `approveGeneration: true` codé en dur (`execute.ts:372`) | **P0** | code + scénario reproduit par l'audit (devis `video: 0`) |
| 2 | Le plafond n'est jamais appliqué **pendant** une étape (pas de plafond transmis aux moteurs) ; Social reçoit le plafond total au lieu du reste | **P0** | code |
| 3 | Si l'IA devient active entre le devis (0 €) et l'exécution, seules les publications respectent « pas d'accord = pas de payant » | P1 | code (risque) |
| 4 | Le **blog** n'est pas filtré par forfait : en Découverte (ou quota épuisé) le devis dit 0 €, puis **toute la demande échoue** | P1 | reproduit par l'audit |
| 5 | Une erreur dans une étape (ex. visuels V1 sans photo détourée) arrête **toute** la demande | P1 | code (risque) |
| 6 | Une demande écrite au démarrage peut être bloquée par le coût de la création elle-même (compté dans la dépense mais à 0 dans le devis) | P1 | code |
| 7 | Bouton « Réessayer » sans effet (la tâche se termine « done » même avec une étape refusée) | P2 | code |
| 8 | Étiquettes « V2 » affichées pour des étapes exécutées en **V1** : logo, visuels, textes, blog | P2 | code |
| 9 | Étapes sans moteur (relecture qualité, publication, organisation, retouche du site) marquées « faites » ; une étape refusée par le plafond peut s'afficher « faite » | P2 | code + reproduit |
| 10 | Propagation de marque : les publications approuvées/programmées **ne repassent pas** en approbation comme annoncé (rattrapé à l'envoi : rien ne part à tort) ; une publication programmée peut rester sans visuel ; export refait toujours en français | P2 | code |
| 11 | Devis gonflé par des étapes sans moteur ; demande restée « en file » si la création échoue | P3 | code |

Affirmations du rapport 12A **à corriger** : « aucune action payante sans devis accepté ; plafond vérifié avant
chaque étape payante » (faux dans les cas 1–3) ; « les publications approuvées repassent en approbation » (faux au
niveau du statut) ; « Réessayer ne refait pas les étapes réussies » (il ne refait rien) ; « exécute par les moteurs V2
Brand/Logo, Image » (V1 en réalité).

---

## 4. Moteurs V1 encore utilisés

| Chemin | Moteur | Classement |
|---|---|---|
| Création complète : visuels, vidéo, textes, logo (+ logo complet), calendrier 7 j | V1 | migration à terminer (textes, logos et calendrier **non listés** dans le registre) |
| Demande unique : étapes `image_generate`, `copy`, `logo`, `brand_strategy`, `blog` | V1 (affichées V2) | migration à terminer + étiquette fausse |
| Onglet Images, onglet Vidéos, UGC | V1 | migration à terminer (listé) |
| Fenêtre « Campagne » (pubs) | V1 `draftAds` | compatibilité volontaire (listé) |
| « Transformer en publications » (pubs), visionneuse de fichiers → publication | publications V1 | **non listé** |
| Ancien calendrier / anciennes publications (sous le studio V2) | V1 sur la même table | compatibilité volontaire, mais permet encore de créer des publications V1 → **conflit** (duplication, programmation automatique sans barrière V2) |
| Retouche d'un visuel de publication (`post.regenerate`) | V1 | listé |
| Vidéo demandée par le calendrier V1 | V1 | **non listé** |
| Blog « Écrire / Réécrire » | V1 | compatibilité volontaire ; **conflit** d'écriture avec le blog V2 |
| Galerie des directions, « change de direction » | Thème V1 | compatibilité volontaire (listé) |
| Reproduction d'un site existant | Thème V1 | **non listé** |
| Envoi direct vers Shopify | ZIP sans contrôles CMS V2 | **non listé** (risque) |
| Kit réseaux sociaux, maquettes de marque | V1 | listé |
| Code mort | `plan.run` jamais lancé, `enqueueDuePosts` jamais appelé, mémoire `ad_drafts` écrite jamais lue | à nettoyer plus tard |

Deux phrases de `reports/remaining-work.md` sont inexactes : « ancien calendrier V1 … pour les anciens calendriers »
(tout nouveau projet en reçoit un) et « l'étape vidéo des plans passe déjà par le Video Engine V2 » (pas quand la
création complète l'a déjà faite en V1).

---

## 5. Liste des problèmes par priorité

### P0 — argent / sécurité (à corriger avant toute ouverture à des clients payants)
1. **Budgets IA au-dessus de 40 % du HT** (5 formules sur 6 ; 67–83 % le premier mois). *Reproduit.*
2. **Pas de réservation : appels simultanés et coût réel > estimation font dépasser le budget** (solde négatif). *Reproduit.*
3. **Demande unique : étapes payantes possibles sans accord ni plafond** (devis 0 €, vidéo auto-approuvée, plafond non transmis). *Code + scénario.*

### P1
4. Rattachement OAuth des réseaux sociaux non lié à la personne connectée (un fraudeur peut récupérer les pages d'une victime qui clique). *Code.*
5. Pas de plafond fournisseur distinct pour les packs/recharges (50 % HT). *Manquant, reproduit.*
6. « Suite de la création » recrée un calendrier (7 → 14 publications). *Reproduit.*
7. Blog non filtré par forfait dans la demande unique → toute la demande échoue. *Reproduit (audit).*
8. Une étape en erreur arrête toute la demande ; demande de démarrage bloquée par le coût de la création. *Code.*
9. Vidéos V2 produites mais non modifiables (aucun écran). *Code.*
10. Prise du rôle administrateur possible tant que le propriétaire n'a pas créé son compte (pas de vérification d'e-mail). *Risque.*

### P2
11. Duplication d'une publication V2 depuis l'ancien écran → copie V1 hors barrière V2. *Code.*
12. Blog V1/V2 : écrasement possible ; boutique sur textes V1 alors que les documents SEO V2 existent. *Code.*
13. Propagation de marque : réapprobation non appliquée au statut ; export en français. *Code.*
14. « Réessayer » sans effet ; étiquettes V2 trompeuses ; faux « fait ». *Code.*
15. Projet archivé encore utilisable → limite de boutiques contournable. *Code.*
16. Import ZIP sans limite de décompression ; envois de fichiers entièrement en mémoire ; IP falsifiable pour les limites de fréquence. *Code / risque.*
17. Envoi direct Shopify sans contrôles CMS V2. *Code.*
18. Passe-droits administrateur restants (création complète : visuels/vidéo/calendrier sans forfait ; thème sur mesure ; limite de boutiques) — contraire à la règle « admin = client ». *Code.*
19. Test `workflow-v2` trop lent sous charge (CI fragile). *Reproduit.*

### P3
20. Alerte 80 % jamais envoyée ; route admin `ai-calls` sans écran.
21. Test social dépendant de la date ; énumération de comptes par temps de réponse ; copie d'export à chaque téléchargement ; types de fichiers peu filtrés ; code mort.

---

## 6. Intégrations non vérifiées (jamais exécutées avec les vrais services)

Anthropic (textes), OpenAI / Gemini (images), fal / Kling / Veo (vidéo), Pexels / Pixabay / Openverse (photos
libres — tests hors ligne), Stripe réel (paiement, renouvellement), publication Facebook / Instagram / TikTok /
YouTube / Pinterest, Shopify (installation du thème, envoi direct, métachamps SEO), WordPress / PrestaShop
hébergés (seulement en local Docker en 11A), envoi d'e-mails SMTP réels. **Aucune qualité « avec vraie IA » n'est
prouvée** (benchmarks 4B, 5B, 6B, 7B, 8B, 9B, 10B, 11B en attente).

---

## 7. Pourcentage de fonctionnalités effectivement vérifiées

**Méthode** : inventaire de 88 fonctionnalités annoncées dans les rapports des phases 1 à 12A, regroupées par
module (liste ci-dessous). Une fonctionnalité compte comme **vérifiée** seulement si (a) elle est accessible au
client (écran → API → tâche → moteur → stockage) **et** (b) elle est couverte par un test automatisé qui passe ou
par un parcours navigateur rejoué dans cet audit. « Vérifiée » veut dire **en local / simulé** : aucune ne l'est
avec les vrais fournisseurs.

| Statut | Nombre |
|---|---|
| Fonctionnel et vérifié (V) | **43** |
| Partiellement fonctionnel (P) | 12 |
| Développé mais non connecté (NC) | 7 |
| Non testé avec les vraies API (fonctionne en simulé, NT) | 6 |
| Bug détecté (B) | 13 |
| Manquant (M) | 7 |
| **Total** | **88** |

→ **49 % des fonctionnalités annoncées sont vérifiées** (43/88) ; 0 % avec les vrais fournisseurs.

<details><summary>Inventaire détaillé (88)</summary>

Comptes : inscription/connexion V · sessions V · réinitialisation du mot de passe V · limites de fréquence P · rôle admin P · vérification e-mail M · suppression de compte M.
Sécurité : propriété des routes projet V · routes hors projet V · routes admin V · webhook Stripe V · anti-SSRF V · clés chiffrées et masquées V · OAuth réseaux B · import ZIP B · envois de fichiers P.
Projets/fichiers : dossiers et sous-dossiers V · corbeille P · déplacer un dossier NC · supprimer un projet M · quota de stockage M · limite de boutiques B · aperçus et exports V.
Brain : scopes V · mémoire V · refus V · faits client V · verrous V · écran admin NC.
Orchestration : router V · planner V · intention par règles V · intention IA NC · `plan.run` NC.
Marque : logo V2 V · logo de la création complète P · charte PDF V.
Images : moteur V2 V · écran V2 NC · onglet Images (V1) P.
Pubs : Ads V2 V · éditeur visuel V · génération payante NT · campagne/publications V1 P.
Vidéo : moteur V2 V · écran V2 NC · fournisseurs vidéo NT · voix off/musique M.
SEO/blog : panneau V2 V · blog V1/V2 B · boutique sur textes V1 P · métachamps Shopify NT.
Social : studio V2 V · approbation par version V · automatisations V · publication réelle NT · statistiques M · duplication V1 B · conversation V.
Calendrier : calendrier de création (V1) P · relance en double B.
Thème/CMS : éditeur V2 V · export CMS V · installation réelle NT · envoi Shopify sans contrôle B · directions V1 P.
Demande unique 12A : demande unique V · devis V · accord et plafond B · réessayer B · blog non filtré B · étiquettes V2 B · propagation P · éléments à valider V · reprise après coupure V.
Abonnements : activation Stripe (tests) V · paiement Stripe réel NT · crédits de packs V · règle 40 % B · plafond 50 % recharges M · réservations/concurrence B · renouvellement V.
Consommation : traces des appels V · alerte 80 % NC · écrans de suivi P.
Interfaces : ordinateur V · téléphone V. Découverte 0 € : V.
</details>

---

## 8. Corrections nécessaires avant la Phase 13 (proposition, rien n'est fait)

1. **Finances (P0)** : budgets IA calculés depuis le prix HT réel du forfait et du mode de facturation (≤ 40 %),
   budget de création inclus dans cette limite ; **réservation** atomique avant chaque appel (réserver l'estimation,
   ajuster au coût réel, libérer en cas d'échec) ; refus de tout débit au-delà du plafond ; plafond séparé ≤ 50 % HT
   pour les packs ; tests de concurrence.
2. **Demande unique (P0/P1)** : contrôle du plafond avant **toute** étape qui peut appeler l'IA (pas seulement si le
   devis > 0), plafond restant transmis aux moteurs, suppression de `approveGeneration: true`, blog filtré par forfait,
   une étape en erreur ne bloque plus les autres, « Réessayer » réellement fonctionnel.
3. **Sécurité (P1)** : lier le retour OAuth à la personne connectée ; protéger ADMIN_EMAIL (e-mail vérifié).
4. **Doublons (P1)** : relance de création sans nouveau calendrier ; ancien écran ne crée plus de publications V1
   (ou les crée en V2 avec la barrière).
5. **Honnêteté de l'interface (P2)** : étiquettes V1/V2 exactes ; mettre à jour `reports/remaining-work.md` et
   `reports/phase-12A-report.md` avec les écarts listés ici.

## 9. Verdict

**Le studio est stable techniquement en local** : TypeScript et build propres, 951–952 tests sur 952, aucun
parcours navigateur rejoué n'a révélé de régression de l'application (les deux échecs observés venaient du montage
du test et d'un test dépendant de la date), aucune erreur JavaScript, interfaces mobiles sans débordement.

**Il n'est pas prêt pour des clients payants** : la règle financière des 40 % n'est ni respectée par les montants
ni garantie par le mécanisme (dépassement reproduit), la demande unique peut déclencher des dépenses sans accord
explicite dans certains cas, une faille OAuth est présente, et la moitié seulement des fonctionnalités annoncées
est vérifiée — aucune avec les vrais fournisseurs d'IA, de paiement ou de publication. Plusieurs moteurs V2
(images, vidéo, textes de la boutique, logo de la création complète) existent mais ne sont pas encore ceux que le
client utilise réellement.
