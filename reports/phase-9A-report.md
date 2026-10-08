# Phase 9A — Social Media & Automatisation Engine V2

Date : 8 octobre 2026 · Branche `claude/ecom-studio-ia-platform-8cwl79` · Fusion : **NON** · 9B : **NON COMMENCÉE**

> En bref pour le propriétaire : l'onglet **Calendrier** (et l'onglet **Publications**) est devenu un vrai studio
> social : **Stratégie → Créer → Calendrier → Publications → Comptes → Statistiques**. Vous choisissez une période,
> de **1 à 5 publications par jour**, les jours, les heures, le fuseau horaire, les réseaux, la part d'images, de
> carrousels, de vidéos et de textes, les thèmes prioritaires. Le studio prépare **gratuitement** le calendrier et les
> textes, puis les visuels (votre bibliothèque et des visuels à la marque, gratuits) ; l'IA payante n'est utilisée
> qu'après une **estimation** que vous acceptez, et dans un **plafond** que vous fixez. Vous modifiez tout (texte,
> médias, date, heure, réseau), vous **approuvez une version précise** de chaque publication, puis vous programmez.
> **Rien ne part sans votre accord, et rien ne part deux fois.**
>
> **Non vérifié** : aucune publication réelle n'a été envoyée (ni pendant les tests, ni pendant le test navigateur) ;
> les comptes utilisés étaient **simulés**. Aucune statistique réelle n'est lue (les chiffres de vues, likes, etc.
> s'affichent « non connecté » ou « indisponible »). L'IA n'a pas été appelée (0 €). Tout cela sera vérifié en 9B,
> avec votre autorisation.

Étiquettes utilisées dans ce rapport : **DÉVELOPPÉ** (code écrit et testé automatiquement) · **SIMULÉ** (testé
seulement avec des fournisseurs ou comptes simulés) · **PRÊT À CONNECTER** (branché sur l'API officielle, jamais
exécuté pour de vrai) · **NON DISPONIBLE** · **NON VALIDÉ** (qualité ou fonctionnement réel non prouvés).

## 1. GIT STATE

- Avant 9A : PR #60 (phase 8A) fusionnée après CI verte (`f465773`), branche synchronisée avec `main` (`0b0f7df`),
  registre mis à jour (`4ae2b03`).
- Phase 9A : un commit sur `claude/ecom-studio-ia-platform-8cwl79`, poussé. **Aucune PR, aucune fusion.**
- Migration de base **additive** uniquement (colonnes et tables ajoutées, rien supprimé ni renommé).

## 2. EXISTING SOCIAL ENGINE AUDIT (avant 9A)

| Élément V1 | Code | Constat |
|---|---|---|
| Calendrier V1 | `src/lib/engine/calendar.ts` (`localPlan`, `createContentPlan`, `enqueueDuePosts`) | 1 à 3 publications par jour, textes IA ou locaux, visuels `renderCreative` ; pas de notion de version approuvée |
| Publications | table `posts`, API `/api/projects/[id]/posts`, `/api/posts/[pid]` | statuts draft / review / scheduled / publishing / published / failed / cancelled |
| Connexions | `src/lib/social/oauth.ts`, table `connections` (jetons chiffrés) | OAuth officiel FB, IG, TikTok, YouTube, Pinterest |
| Publication | `src/lib/social/publish.ts` (`publishPost`, `alreadyPublished`) | adaptateurs officiels ; vérification « déjà publiée » seulement pour Facebook / Instagram |
| Envoi | tâche `post.publish` (worker) | **risque de doublon** : après un délai dépassé, la tâche était relancée à l'aveugle (TikTok, YouTube, Pinterest ne permettent pas de vérifier) |
| Contrôles | `src/lib/engine/social-quality.ts` (`NETWORK_RULES`, `keyMoments`, `cleanTag`) | règles par réseau réutilisables |
| Interface | `tab-calendrier.tsx`, `tab-publications.tsx`, `post-editor.tsx` | vue mois / semaine / jour, éditeur simple |

Décision : **aucun système parallèle**. Le V2 réutilise la même table `posts`, les mêmes connexions, les mêmes
adaptateurs officiels, les mêmes règles par réseau. Le V1 reste en service pour les anciens calendriers.

## 3. SOCIAL ENGINE V2 ARCHITECTURE

`src/lib/social-v2/` (2 043 lignes) :

```
intent.ts (demande en clair) → strategy.ts (stratégie éditoriale) → planner.ts (dates, créneaux, réseaux, formats)
  → copy.ts (textes locaux, faits vérifiés du SEO V2) → platforms.ts (adaptation par réseau)
  → production.ts (bibliothèque → rendu local → Image / Ads / Video Engine V2, par lots, plafonnés)
  → quality.ts (Social Quality Gate, politique social_post_v2) → approval.ts (empreinte de version)
  → scheduler.ts (programmation, verrou, envoi, reprise) → automations.ts, analytics.ts
  → local-edit.ts / engine.ts (retouches, conversation) → view.ts (vue de l'interface)
```

- Base : colonnes ajoutées à `posts` (`engine`, `pillar`, `objective`, `content_hash`, `approved_hash`,
  `user_edited`, `lock_token`, `locked_at`, `production`, `gate`, `group_id`) et à `content_plans` (`engine`,
  `paused`, `updated_at`) ; tables `post_attempts` (journal des envois), `social_automations`, `post_metrics`.
- API : `GET/POST /api/projects/[id]/social/v2` (vue d'ensemble ; actions plan, ask, estimate, produce, approve,
  schedule, unschedule, pause, resume, edit, automation, automation_status) et
  `GET/PATCH/POST /api/projects/[id]/social/v2/posts/[postId]` (lire, modifier, approuver, programmer,
  déprogrammer, dupliquer, supprimer, publier maintenant, confirmer un état incertain).
- Worker : `post.publish` passe désormais par `publishOne` (verrou + journal) ; nouvelle tâche
  `social.v2.produce` (production payante acceptée) ; à chaque tour : reprise des verrous orphelins
  (`recoverStale`), envoi des publications dues (`enqueueDueV2`), automatisations dues (`runDueAutomations`).
- Orchestrateur : action `social.v2.produce` → étape « social » ; politique `social_post_v2` (version `2026-10-p9a`).

## 4. EDITORIAL STRATEGY — DÉVELOPPÉ

`socialStrategy(p)` : objectifs, public, positionnement, ton, messages, **piliers** (avec objectif, part et formats),
formats, réseaux, appels à l'action, saisonnalité (dates réelles via `keyMoments`), points à compléter.
Sept familles détectées depuis le projet : artisan, restaurant, service, beauté, high-tech, SaaS, produit.
Testé : un artisan, une marque cosmétique, un high-tech, un restaurant et un SaaS ont des piliers et des appels à
l'action **différents**. Aucun code propre à un client. Rien n'est inventé : les faits viennent des
informations vérifiées du projet (`verifiedFacts`, moteur SEO V2).

## 5. CONTENT PLANNER — DÉVELOPPÉ

`createPlanV2` : période (début / fin ou nombre de jours), jours de la semaine, jours exclus, créneaux horaires,
fuseau horaire (heure locale exacte, heure d'été comprise), réseaux (à tour de rôle ou chaque créneau sur tous les
réseaux, texte adapté à chacun), répartition des formats, thèmes prioritaires (poids × 1,6), piliers sans répétition
consécutive. Chaque publication a une clé stable (`v2:<calendrier>:<jour>:<heure>:<réseau>`) : **relancer ne crée
aucun doublon**. Niveau 1 = textes et calendrier seulement, **0 €, aucun appel d'IA** (testé : 90 publications,
0 appel).

## 6. CALENDAR — DÉVELOPPÉ, testé en navigateur

Vues **mois, semaine, jour, liste** ; glisser-déposer sur ordinateur (même heure conservée), date et heure dans
l'éditeur sur téléphone ; ouvrir, modifier, dupliquer, supprimer, publier maintenant, programmer, déprogrammer,
pause / reprise du calendrier, statut visible par couleur et par badge. Zone « Modifier le calendrier en une
phrase ». L'ancien calendrier V1 reste accessible sous le nouveau (« Ancien calendrier (V1) »).

## 7. POSTS PER DAY — DÉVELOPPÉ

1 à 5 par jour, nombre exact par jour (testé : 14 jours × 2 = 28, chaque jour exactement 2, en navigateur ;
30 jours × 3 = 90 en test automatique), créneaux triés. Avertissements de fréquence par réseau (Instagram > 50,
TikTok > 5, YouTube > 6, LinkedIn > 2 par jour).

## 8. PLATFORM ADAPTERS

| Réseau | Niveau dans le studio | Formats | Lien dans la légende | Publication réelle | Vérification anti-doublon après délai dépassé |
|---|---|---|---|---|---|
| Instagram | PRÊT À CONNECTER (CONNECTÉ si un compte est relié) | image, carrousel (≤ 10), réel, story | non → « Lien en bio. » | adaptateur officiel existant, **NON VALIDÉ** (jamais exécuté) | oui (`alreadyPublished`) |
| Facebook | PRÊT À CONNECTER | texte, image, carrousel, vidéo | oui | **NON VALIDÉ** | oui |
| TikTok | PRÊT À CONNECTER | vidéo seulement | non | **NON VALIDÉ** (l'application doit être auditée par TikTok) | **non** → état « À vérifier » |
| YouTube | PRÊT À CONNECTER | Short | oui | **NON VALIDÉ** | **non** → « À vérifier » |
| Pinterest | PRÊT À CONNECTER | épingle | oui | **NON VALIDÉ** | **non** → « À vérifier » |
| LinkedIn | **EXPORT** (pas de connexion) | texte, image, carrousel, vidéo | oui | **NON DISPONIBLE** : texte et médias à publier à la main | — |

`adaptForPlatform` : format natif (TikTok → vidéo, YouTube → Short), lien non cliquable remplacé par « Lien en
bio. », nombre de hashtags limité, légende raccourcie à la limite du réseau. Limites et dimensions : valeurs
publiques au moment du développement, **à revérifier** en 9B.

## 9. OAUTH AND CONNECTIONS — réutilisés (V1)

Connexion par l'autorisation officielle de chaque réseau (aucun mot de passe), jetons **chiffrés** en base, jamais
renvoyés à l'interface. Un jeton expiré marque le compte « à reconnecter » ; un compte révoqué n'envoie plus rien
(testé en simulé). Onglet « Comptes » : niveau par réseau (CONNECTÉ / PRÊT À CONNECTER / EXPORT) et limites.
**SIMULÉ** : aucun vrai compte n'a été relié pendant la phase.

## 10. SCHEDULING — DÉVELOPPÉ

Programmer exige : un forfait payant (même règle pour l'administrateur), un compte actif du bon réseau, une
**version approuvée identique** à celle qui sera envoyée, aucun défaut bloquant. Le worker envoie les publications
échues ; un calendrier en pause n'envoie rien ; la reprise renvoie ce qui reste à venir.

## 11. AUTOMATIC PUBLISHING — DÉVELOPPÉ, SIMULÉ

`publishOne` : prise atomique (`UPDATE … SET status='publishing', lock_token … WHERE status='scheduled'`), revérifie
la version approuvée, le forfait et le compte, appelle l'adaptateur, journalise chaque essai (`post_attempts`).
`realPublisher` **refuse** de publier dans les tests (`VITEST`) et quand `SOCIAL_PUBLISH_DISABLED=1` (utilisé pour
le test navigateur). **Aucune publication réelle n'a eu lieu.**

## 12. IDEMPOTENCE — DÉVELOPPÉ, testé (scénarios de la section 32)

| Scénario | Comportement | Test |
|---|---|---|
| Deux workers sur la même publication | un seul envoi (prise atomique) | ✓ |
| Délai dépassé, plateforme vérifiable (FB / IG) | vérifie : retrouvée → publiée ; absente → nouvel essai | ✓ |
| Délai dépassé, plateforme non vérifiable | **« À vérifier »**, aucun renvoi à l'aveugle ; le client confirme « publiée / pas publiée » | ✓ (+ bouton dans l'éditeur) |
| Worker arrêté pendant l'envoi (verrou orphelin) | reprise sans renvoi à l'aveugle | ✓ |
| Serveur redémarré avant l'échéance | rien de perdu, envoi à l'heure | ✓ |
| Limite de débit | nouvel essai plus tard | ✓ |
| Refus de la plateforme | échec avec message | ✓ |
| Jeton expiré | compte « à reconnecter », pas d'envoi | ✓ |
| Compte déconnecté / révoqué | aucun envoi | ✓ |
| Modifiée après approbation | jamais publiée tant que non réapprouvée | ✓ (+ navigateur) |
| Calendrier en pause | rien ne part | ✓ (+ navigateur) |
| Rejouer une publication déjà publiée | rien n'est renvoyé | ✓ |

## 13. APPROVAL WORKFLOW — DÉVELOPPÉ

Approbation **par version** : empreinte (`content_hash`) du réseau, format, titre, légende, hashtags, lien et ordre
des médias — la date n'en fait pas partie (déplacer ne demande pas de réapprouver). Toute modification change
l'empreinte : la publication repasse « à valider » et ne part pas. Approbation à l'unité, par sélection, « les
7 prochains jours » ou par calendrier ; refusée si un défaut bloquant existe. Les anciennes publications V1 gardent
leur approbation d'origine (compatibilité, testé).

## 14. CONTENT GENERATION

Niveau 1 (gratuit) : textes locaux (`copy.ts`) à partir des seules informations vérifiées, accroches **jamais
répétées** dans un calendrier, « [À compléter : …] » quand l'information manque. Niveau 2 (par lots) : visuels.
Niveau 3 : la publication ne déclenche **jamais** de génération.
**Limite importante (mesurée)** : sans informations détaillées du client, une grande partie des textes locaux
contient un « [À compléter] » (scénarios simulés : 45/60 artisan, 74/90 cosmétique, 24/30 high-tech, 26/28
restaurant, 28/30 SaaS). C'est voulu (rien n'est inventé) et ces publications ne peuvent pas être approuvées avant
d'être complétées, mais cela demande du travail au client. La rédaction IA (payante, plafonnée) est branchée pour
la réécriture ; sa qualité est **NON VALIDÉE** (9B).

## 15. IMAGE ENGINE V2 INTEGRATION — PRÊT À CONNECTER (simulé)

1. Point d'entrée : `realSocialDeps(...).image` (`src/lib/social-v2/deps.ts`) → `runImageEngineV2`.
2. Chemin : `produceBatch` → `pick` (bibliothèque d'abord) → `deps.image` → Image Engine V2 (recherche multisource,
   génération seulement si `allowGenerate`).
3. Données : projet, type (`social_image` ou `trade_photo`), support `social`, format (1:1, 4:5, 9:16, 2:3, 16:9 selon
   réseau et format), sujet (pilier + titre), plafond restant.
4. Retour : l'image validée (FINAL ou PROVISIONAL, utilisable automatiquement) et son coût ; sinon rendu local.
5. Limites : jamais exécuté avec un vrai fournisseur dans cette phase ; en gratuit, l'Image V2 n'est pas appelé
   (bibliothèque puis rendu local).
6. Tests : production payante simulée, plafond, acceptation de l'estimation (`social-v2-engine.test.ts`).

## 16. ADVERTISING ENGINE V2 INTEGRATION — PRÊT À CONNECTER (simulé)

1. Point d'entrée : `deps.ad` → `runAdEngineV2`.
2. Chemin : publications à objectif promotionnel, **seulement si la production payante est acceptée** ; sinon rendu
   local à la marque.
3. Données : projet, 1 création, régie équivalente au réseau (meta_feed, tiktok, pinterest, linkedin), objectif.
4. Retour : la création composée (document à calques modifiable dans l'éditeur publicitaire) et son coût.
5. Limites : jamais exécuté pour de vrai ; **le lien « ouvrir dans l'éditeur publicitaire » depuis l'éditeur de
   publication n'est pas fait** (la création est dans la bibliothèque et l'onglet Publicités).
6. Tests : simulé (`mockSocialDeps`).

## 17. VIDEO ENGINE V2 INTEGRATION — DÉVELOPPÉ (montage local), génération PRÊTE À CONNECTER

1. Point d'entrée : `deps.video` → `runVideoEngineV2`.
2. Chemin : publications vidéo / réel / Short / TikTok → Video Engine V2 ; en gratuit : montage local (aucun plan
   généré) ; plans générés seulement si la production payante est acceptée.
3. Données : sujet (pilier + titre), plateforme (reels, tiktok, shorts, meta_feed), format 9:16 ou 4:5, 15 s.
4. Retour : la vidéo et son coût, ou la raison de l'absence (la publication reste « planifiée », jamais remplacée
   par une image).
5. Limites : le montage local est **lent** (plusieurs secondes par vidéo) : la production gratuite se fait donc par
   petits lots de 3 avec une progression visible ; le lien vers le document vidéo éditable depuis l'éditeur de
   publication n'est pas fait ; voix off non disponible (reportée).
6. Tests : simulé en test automatique ; **réellement exécuté en local** dans le test navigateur (montage local,
   0 €).

## 18. SEO AND COPYWRITING INTEGRATION — DÉVELOPPÉ

1. Point d'entrée : `socialStrategy` et `writeLocal` (`strategy.ts`, `copy.ts`).
2. Chemin : faits vérifiés (`verifiedFacts`), ville principale (`mainCity`), sujets du métier (`tradeTopics`),
   questions fréquentes du moteur SEO V2.
3. Données : projet, pilier, faits, questions.
4. Retour : titre, légende, hashtags, appel à l'action ; « [À compléter] » si l'information manque.
5. Limites : les questions reprises du SEO V2 sont en minuscules (« logiciel saas » au lieu de « SaaS ») ; texte
   local assez répétitif dans sa structure, même si aucune accroche n'est répétée.
6. Tests : aucune affirmation inventée sur 60 publications et sur les 5 scénarios A–E (`lintClaims`), aucune
   accroche répétée.

## 19. CONTENT EDITOR — DÉVELOPPÉ, testé en navigateur

Éditeur de publication : titre, réseau, légende avec compteur (limite du réseau), hashtags (fourchette du réseau),
lien, date, heure (dans le fuseau du projet), compte, médias (ajouter depuis la bibliothèque, retirer, réordonner),
défauts à corriger, approuver cette version, programmer / déprogrammer, publier maintenant, dupliquer, supprimer,
historique des envois, confirmation d'un état « À vérifier ». Les modifications manuelles sont gratuites et
**protégées** (marquées « modifiée par vous », jamais écrasées). Une publication envoyée n'est plus modifiable.
Non fait : ouvrir le visuel dans l'éditeur publicitaire à calques, ou la vidéo dans le document vidéo.

## 20. AI CONVERSATIONAL EDITING — locale DÉVELOPPÉE ; IA SIMULÉE

Locales et gratuites (testées, dont en navigateur) : « Supprime les publications du dimanche », « Mets les vidéos le
vendredi », « Programme deux publications par jour au lieu de trois », « Remplace les images des trois prochaines
publications », pause, reprise, annulation. Demande ambiguë (« Change uniquement le texte de la publication de
demain ») : précision demandée. Réécriture IA (« Rends les publications plus premium ») : estimation affichée,
**confirmation obligatoire**, plafond, refusée si l'IA ajoute une affirmation non confirmée, refusée si l'IA n'est
pas active pour le compte. **Testée avec une IA simulée seulement.**

## 21. QUALITY GATE — DÉVELOPPÉ

Politique `social_post_v2` ; défauts bloquants : affirmation inventée ou interdite, information à compléter, média
manquant, refusé, de droits inconnus, obligatoire, de mauvais type (image sur un réel), vidéo hors durée, trop de
médias, légende trop longue ou vide, accroche en double. Le contrôle local seul donne au mieux **PROVISOIRE**.
Rapport de variété par calendrier : piliers, part promotionnelle (alerte > 35 %), accroches répétées, même pilier
consécutif, média utilisé plus de deux fois, publications à compléter.

## 22. AUTOMATIONS — DÉVELOPPÉ, SIMULÉ

Persistantes (table `social_automations`), exécutées par le worker avec prise atomique : préparer la semaine
suivante (brouillons, 0 €), programmer les seules versions approuvées, m'avertir des échecs, me rappeler ce qui est à
valider ; pause / reprise. Aucune ne dépense d'IA ni ne publie sans approbation (testé).

## 23. ANALYTICS — DÉVELOPPÉ ; métriques réelles NON DISPONIBLES

Compteurs réels du studio (programmées, publiées, échecs, à vérifier, à valider, par réseau). Métriques des
plateformes (vues, portée, likes, commentaires, partages, clics) : interface `registerMetricsProvider` prête,
**aucun fournisseur branché** → affichées « non connecté » ou « indisponible », **jamais inventées** (testé, dont en
navigateur).

## 24. COST CONTROL — DÉVELOPPÉ

Trois niveaux : (1) planification gratuite ; (2) production par lots, gratuite d'abord (bibliothèque, rendu local,
montage local), payante seulement après **estimation acceptée** et **dans le plafond** (arrêt au plafond, rendu
local pour la suite) ; (3) la publication ne génère jamais rien. Forfait Découverte : 0 € d'IA. Le compte
administrateur suit son forfait comme un client. Dépenses de la phase : **0 €**.

## 25. SECURITY

Jetons chiffrés, jamais renvoyés au navigateur ni écrits dans les journaux (vérifié : aucun secret dans les
journaux du serveur de test ni dans les sorties du benchmark `--check`). Toutes les routes vérifient que la
publication, le calendrier, le compte et les médias appartiennent au projet de l'utilisateur (média d'un autre projet
refusé : testé). Publication réelle bloquée en test. Aucune clé demandée ni écrite dans le code.

## 26. DESKTOP AND MOBILE UI — testé en navigateur (Chromium)

Ordinateur 1440 × 900 et téléphone 390 × 844 (tactile) : aucun débordement horizontal, éditeur utilisable au
téléphone (date et heure à la place du glisser-déposer). Non testés : tablette réelle, Safari, Firefox.

## 27. BROWSER TESTS

`scripts/e2e-social-v2.ts` sur une base de démonstration (`scripts/seed-social-demo.ts` : compte au forfait
« Dominer » attribué à la main, projet cosmétique, compte Instagram **simulé sans jeton**), serveur lancé avec
`SOCIAL_PUBLISH_DISABLED=1` et **sans worker**. Résultat : **28/28** vérifications réussies (détail dans
`reports/screenshots/social-v2/resultats.json`).

Parcours vérifié : stratégie ; création de 28 publications (14 jours × 2) ; production gratuite par lots ; vues mois,
semaine, jour, liste ; glisser-déposer (date changée, heure conservée) ; modification manuelle (légende, heure) ;
approbation ; programmation ; modification après approbation → réapprobation exigée ; rechargement (tout conservé) ;
conversation « Supprime les publications du dimanche » ; pause / reprise ; filtres ; comptes ; statistiques sans
chiffre inventé ; aucune publication envoyée ; téléphone ; aucune erreur JavaScript.

Corrections faites grâce au test navigateur :
- la production gratuite en une seule requête (30 publications dont des vidéos montées localement) prenait plusieurs
  minutes ; elle se fait maintenant **par lots de 3** avec une progression affichée ;
- en vue mois, les cartes débordaient de leur case : corrigé (contrôle ajouté : chaque carte reste dans sa case) ;
- sur téléphone, la barre des sections élargissait toute la page à 762 px (calendrier coupé à droite) : corrigé ; le
  contrôle mesure désormais la largeur réelle de l'écran (l'ancien contrôle se comparait à une largeur déjà
  élargie et n'avait rien vu). En vue mois sur téléphone, chaque publication est une pastille (réseau + statut) ;
  le détail s'ouvre d'un toucher ou dans les vues jour et liste.

## 28. SCREENSHOTS

`reports/screenshots/social-v2/` : 01-strategie, 02-creer, 02b-production, 03-calendrier-mois,
04-calendrier-semaine, 05-calendrier-liste, 06-editeur, 07-editeur-programmee, 08-conversation, 09-publications,
10-comptes, 11-statistiques, 12-telephone-mois, 13-telephone-liste, 14-telephone-editeur.
Images de démonstration (images de test, pas de vraies photos).

## 29. BENCHMARK FIXTURES (fournisseurs simulés, 0 €)

| Scénario | Projet | Demandé | Créé | Famille | Piliers | Accroches uniques / répétées | À compléter | Part promo | Affirmations inventées | Estimation IA si tout payant |
|---|---|---|---|---|---|---|---|---|---|---|
| A | plâtrier (artisan) | 30 j × 2 = 60 | 60 | artisan | 5 | 15 / 0 | 45 | 20 % | 0 | 6,00 € |
| B | cosmétique | 30 j × 3 = 90 | 90 | beauté | 5 | 16 / 0 | 74 | 16 % | 0 | 9,00 € |
| C | high-tech | 15 j × 2 = 30 | 30 | high-tech | 5 | 6 / 0 | 24 | 17 % | 0 | 3,00 € |
| D | restaurant | 14 j × 2 = 28 | 28 | restaurant | 5 | 2 / 0 | 26 | 29 % | 0 | 2,80 € |
| E | SaaS | 30 j × 1 = 30 | 30 | SaaS | 5 | 2 / 0 | 28 | 13 % | 0 | 3,00 € |

Planification : 12 à 47 ms par calendrier. Réseaux adaptés (TikTok = vidéo, YouTube = Short, Instagram sans lien
cliquable, ≤ 5 hashtags) ; E signale LinkedIn en export. Les estimations sont celles du studio (tarifs de
l'administration) appliquées à une production entièrement payante ; **aucune dépense réelle**. Script réel (9B) :
`scripts/benchmark-social-v2.ts` (`--check`, `--fixture`, `--project`, `--days`, `--posts-per-day`, `--max-cost`,
`--dry-run`) ; il ne programme ni ne publie jamais rien.

## 30. TEST RESULTS

- Suite complète : **904/904** (108 fichiers) (dont 27 nouveaux tests 9A : `social-v2.test.ts` 9, `social-v2-engine.test.ts` 17,
  `benchmark-social-v2-check.test.ts` 1).
- Navigateur : **28/28**.
- Migration : base créée par la version précédente (commit `0b0f7df`) puis ouverte par la version 9A : colonnes et
  tables ajoutées, publication V1 programmée conservée (statut et texte intacts, marquée `engine = v1`) — **OK**.

## 31. TYPESCRIPT

`npx tsc --noEmit` : **OK**.

## 32. BUILD

`npm run build` : **OK**.

## 33. BEHAVIOR CHANGES

- Onglets Calendrier et Publications : ouvrent le studio social V2 ; l'ancien parcours V1 reste accessible en bas.
- `post.publish` (worker) passe par `publishOne` : verrou, journal, **plus de renvoi à l'aveugle** après un délai
  dépassé (état « À vérifier »). S'applique aussi aux anciennes publications V1 (approbation par date conservée).
- Nouveaux statuts : planifiée, approuvée, en pause, à vérifier.
- Le worker n'utilise plus `enqueueDuePosts` (V1) mais `enqueueDueV2`, qui envoie aussi les publications V1 dues.
- Version de politique de qualité : `2026-10-p9a` (ajout de `social_post_v2`).

## 34. KNOWN LIMITATIONS

- **Aucune publication réelle** n'a été faite : les adaptateurs officiels (FB, IG, TikTok, YouTube, Pinterest) sont
  ceux du V1, jamais exécutés dans cette phase. TikTok exige l'audit de l'application pour publier en public.
- **Aucune statistique réelle** : aucun fournisseur de métriques branché.
- LinkedIn : export seulement (pas de connexion ni de publication directe).
- Textes locaux : beaucoup de « [À compléter] » sans informations détaillées du client (voir section 14) ;
  structure des phrases assez répétitive ; « saas » en minuscules (repris du SEO V2).
- Qualité réelle des rédactions IA, des visuels IA et des vidéos générées : **NON VALIDÉE**.
- Éditeur de publication : pas de lien direct vers l'éditeur publicitaire à calques ni vers le document vidéo.
- Production gratuite des vidéos : montage local lent (lots de 3) ; une vidéo qui ne peut pas être montée laisse la
  publication « planifiée ». Les vidéos montées localement arrivent « à vérifier » dans la bibliothèque : la
  barrière bloque l'approbation (« média refusé ou non validé ») tant que le client ne les a pas validées dans la
  bibliothèque — sûr, mais une étape de plus (validation directe depuis l'éditeur de publication à prévoir).
- Pas de vérification anti-doublon possible pour TikTok, YouTube, Pinterest : le client confirme lui-même l'état
  « À vérifier ».
- Limites des réseaux (longueurs, durées, fréquences) : valeurs publiques au moment du développement, à revérifier.
- Glisser-déposer : ordinateur seulement ; pas de glisser dans la vue liste.
- Tablette, Safari, Firefox : non testés.

## 35. REMAINING WORK

Voir `reports/remaining-work.md` (section « Social Media & Automatisation Engine V2 (phase 9A) »).

## 36. READY FOR PHASE 9B

Prêt pour la 9B (à lancer **uniquement** sur votre demande) : relier un compte de test par réseau, faire une
publication réelle de test avec votre autorisation explicite, vérifier les états (publiée, refus, délai), lancer
`scripts/benchmark-social-v2.ts` avec vos fournisseurs et un plafond, juger la qualité réelle des textes, visuels et
vidéos. **Phase 9B : NON COMMENCÉE. Phase 10 : NON COMMENCÉE.**
