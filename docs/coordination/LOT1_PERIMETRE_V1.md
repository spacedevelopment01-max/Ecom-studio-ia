# Lot 1 — Périmètre V1 : liste de référence (issue #163, action 01)

Rédigé le 23 octobre 2026 par la conversation Claude 2, à partir du code de `main` **`0a6aa1dd6dfa5932a5e42e027cef2a3335e74679`**
(fusion de #162) et des têtes de PR lues ce jour : #166 `27777896`, #168 `dbfc05ad`, #170 `46738852`,
#167 `f8b7025a` (brouillon), #127 `7b65492d`, #165 `4bce4d15`. #171 (Codex, sécurité) n'a pas encore de branche
publiée à l'heure de ce relevé.

## Comment lire les états

Une fonction passe par des étapes distinctes ; aucune ne vaut la suivante.

| Étape | Signification |
|---|---|
| **Branche** | code livré sur une branche/PR, non fusionné |
| **Main** | fusionné dans `main` (`0a6aa1dd`) |
| **Tests** | tests automatiques locaux / CI, fournisseurs **simulés** |
| **Navigateur** | parcours réel dans un vrai serveur compilé, données fictives |
| **Fournisseur réel** | appel réel au prestataire (IA, Stripe, réseau social, e-mail) réussi |
| **Servi** | présent dans le studio réellement utilisé par Thomas (version vérifiée) |
| **Validé Thomas** | accepté explicitement par Thomas |

**Version servie :** aucune n'est vérifiée par cette conversation (aucun accès au Codespace ni à un serveur de
Thomas). Dernière version connue, déclarée par #165 : un Codespace à `d97e0b95` (20 octobre), où Thomas a exécuté un
diagnostic de lecture seule. Personne ne doit annoncer « le studio est à jour » sans relever le SHA servi.

## 1. Décisions de Thomas et règles historiques

### Décisions explicites de Thomas (source citée)

| Décision | Source |
|---|---|
| Grille 49 / 89 / 129 € (1 projet par abonnement, thèmes 1/3/tous, sections 8/12/20, posts 1/3/5, horizon 7/30/90, blog 0/5/10, vidéo IA aux deux supérieurs, publicité et sections IA au troisième, pages aux deux supérieurs, appel initial unique 60/30/inclus, coûts internes 40 % / 50 % du HT) | #150 (accepté le 20 octobre), rappelée par #169 et #163 |
| Plusieurs abonnements possibles par compte (un projet chacun) | `plans.ts`, #163 |
| Hébergement/publication native des sites clients et gestion de leurs domaines : **V2 uniquement** | #163 (« décision ferme ») |
| Catalogue cible : 15 thèmes (5 par famille) ; pas de réactivation automatique des 30 anciennes directions | #163, CLAUDE.md (#137) |
| Refonte de l'accueil commercial en V1, **presque à la fin**, après finalisation du studio et accord de Thomas | #163 |
| Images finales 100 % IA avec Qwen-Image 3.0 Pro ; logos : OpenAI en relais | CLAUDE.md |
| Familles : MUSEAU CLUB en Boutique spécialisée (21/10, 12 h 58), HEUREN/ALCÔVE/ONDE/SOUPLE en E-commerce | CLAUDE.md, #155, #158 |
| NOCTIL : l'enfant utilise, le parent achète ; FRAISE : gummies vitaminés | #163, consigne du 21/10 21 h 45 |
| Aucun appel IA payant, publication réelle, achat sans accord écrit ; plafond d'essais 10 $ | CLAUDE.md |

Les personas proposés par les assistants pour chaque thème **ne sont pas** des décisions de Thomas, sauf les deux
ci-dessus.

### Règles historiques présentes dans le code, non redécidées

Elles sont conservées telles quelles ; ce lot ne les transforme pas en décisions.

| Règle | Source exécutable | Remarque |
|---|---|---|
| Annuel = 10 mois payés (« 2 mois offerts ») | `plans.ts` (`price.year`) | |
| Satisfait ou remboursé 14 jours | `REFUND_DAYS` | conditions précises « [À compléter] » dans les CGV |
| 2 thèmes entièrement sur mesure par mois (Dominer) | `CUSTOM_THEMES_PER_MONTH` | |
| Langues 1 / 2 / 5, SEO et automatisations par niveau, campagnes illimitées (Dominer), propositions de direction artistique 1/3/5 | `plans.ts` | non citées dans la grille #150 |
| Vidéos UGC au forfait Dominer | `plans.ts` (`ugc`) | aucune capacité UGC réelle vérifiée (#166) ; jamais de personne générée sans photo/autorisation |
| Rendez-vous : annulation/report jusqu'à 24 h avant, réservation 12 h avant, retenue 35 min | `appointments.ts`, #150 | politique commerciale à confirmer (#170) |
| Changement de forfait au prorata (hausse immédiate, baisse sur factures suivantes) | `payments-v2.ts`, écran « Gérer mon abonnement » | à confirmer par Thomas (#170) |
| Migration V2 : ancien abonnement rattaché au projet actif le plus récent du compte | `migrateBillingV2` | voir `LOT1_MIGRATION_RESTAURATION.md` § 3 |
| Mise en conformité des anciens portefeuilles (règle 40 % / 50 %) | `conformWallet` | ancien crédit non justifié ramené à 0, tracé |

## 2. Matrice des fonctions V1

Responsables : **C1** = Claude 1 (thèmes, #167) ; **C2** = Claude 2 (lot 1, ce document) ; **Cx** = Codex (lots 5, 8,
9 et angles) ; **T** = Thomas.

| Fonction | Règle / source | État | Resp. | Code / écran / SHA | Preuve | Limite / blocage |
|---|---|---|---|---|---|---|
| Création de projet (produit unique, catalogue, services, site existant) | CLAUDE.md ; coordonnées jamais redemandées | Main, Tests, Navigateur (lots précédents) | Cx/C1 | `src/components/studio/home.tsx`, `worker/handlers.ts` | `PARCOURS_AMONT_RESULTATS.md`, `ISSUE_154_RESULTATS.md` | fournisseur IA réel non vérifié pour la création complète |
| Un projet par abonnement, plusieurs abonnements par compte, aucun ancien projet supprimé | #150, `plans.ts` | Main, Tests | Cx | `project-billing.ts`, `db.ts` (`migrateBillingV2`) | `tests/lot1-grille-offres.test.ts`, `reports/lot1/essais/` | transition des anciens comptes « plusieurs boutiques » : décision T |
| Découverte (démo, aucun projet, aucun appel IA) | CLAUDE.md | Main, Tests | Cx | `src/app/studio/decouverte` | `ISSUE_150_RESULTATS.md` | — |
| Compréhension, renseignements, recherche sourcée, angles 1/2/5 | #150, #168 | Angles 1/2/5 : Main ; recherche sourcée : **Branche #168** | Cx | `marketing-strategy/`, #168 `dbfc05ad` | rapport #168 (35 captures, simulé) ; angles historiques relus après migration (`reports/lot1/essais`) | analyse IA et sources réelles non validées |
| Identité : logo, planche, charte, vocabulaire du client | CLAUDE.md | Main, Tests | domaine 4 | `media/identity-board.ts`, `client-wording.ts` | lots précédents | génération réelle récente non revérifiée ici |
| Thèmes : 11 actifs en 3 familles, droits 1/3/tous | #137, #150, #162 | Main, Tests | C1 | `theme/directions.ts`, `plan-entitlements.ts` | `tests/lot1-grille-offres.test.ts`, CI #162 | refonte NOCTIL en cours sur **#167 (brouillon)**, non reçue |
| Cible 15 thèmes (5/famille) | #163 | **À faire** : services n'a qu'Atelier Rive | C1/T | `PLAN_THEME_ORDER.services` (4 places vides) | — | MATIÈRE & CHAUX, COUPE FRANCHE, CLAIR & NET, LES INSTANTS **non construits, non annoncés** |
| Démos intégrales avant choix, choix puis adaptation au client, sauvegarde/rechargement | CLAUDE.md (#149), #154/#156 | Main, Tests, Navigateur | C1/Cx | `theme/theme-demos.ts` | `ISSUE_154_RESULTATS.md`, tests `mission154-*` | — |
| Édition de la boutique (discussion, aperçu, versions, moteur local d'abord) | CLAUDE.md | Main, Tests | C1 | `theme/ops.ts`, `engine/local-first.ts` | tests du thème, Theme Check en CI | — |
| Sections 8/12/20 de la bibliothèque (pas une limite de blocs par page) ; pages, duplication, modèles aux deux supérieurs ; sections entièrement IA au 3e | #150 | Main, Tests | Cx/C1 | `plan-entitlements.ts`, `plan-gates.ts` | `tests/lot1-grille-offres.test.ts`, `ISSUE_150_RESULTATS.md` | — |
| Exports : ZIP Shopify, WooCommerce, PrestaShop, kits Wix/Squarespace ; site de services | README | Main, Tests (Theme Check, ZIP) | C1 | `theme/compile.ts`, `cms-v2/` | `EXPORTS_CATALOGUE_RESULTATS.md` | envoi direct dans Shopify « prêt, pas essayé » (application Shopify non configurée) |
| Images finales IA (Qwen-Image 3.0 Pro) | CLAUDE.md, `guide-images-ia.md` | Main, Tests (simulés) | domaine 2 | `image-v2/`, `ai/media-models.ts` | tests images | **fournisseur réel non vérifié dans ce lot** ; diagnostic d'accès (lecture) fait par Thomas (#165) |
| Vidéos IA (2e et 3e forfaits), voix française | #150, #164 | Vidéo : Main ; voix + correctif Kling : **Branche #166** | Cx | `video-v2/`, #166 `27777896` | rapport #166 (simulé, montage local réel) | aucune génération réelle ; modèle vocal transitoire (retrait annoncé 06/01/2027) |
| Publicités et aide aux campagnes (3e forfait), y compris au lancement | #150 | Main, Tests ; gardes Dominer renforcées sur **Branche #170** | Cx | `ads-v2/`, `ad-campaigns.tsx` | rapports #150, #170 | publication publicitaire réelle non testée |
| Publications, calendrier, une phrase, quotas 1/3/5, horizon 7/30/90 | #150, #127 | Main, Tests | domaine 5 | `social-v2/` | `PR127-SORT.md`, tests `calendrier-*`, `social-autopilot-limites` | **publication réelle sur les réseaux jamais essayée** (aucune application validée) ; interface « une phrase » non vérifiée en navigateur |
| Blog 0/5/10 par mois | #150 | Main, Tests | Cx | `engine/blog.ts`, `quotas.ts` | `ISSUE_150_RESULTATS.md` | publication sur la plateforme du client non testée |
| Paiements (abonnement, recharge 10 €, appel), webhooks | #150, #169 | Main ; fiabilisation sur **Branche #170** | Cx | `payments*.ts`, #170 `46738852` | rapport #170 (Stripe **simulé**) | **aucun essai Stripe TEST** ; mode réel à vérifier séparément |
| Rendez-vous : appel initial unique 60/30/inclus | #150 | Main, Tests | Cx | `appointments.ts`, `calls.tsx` | rapports #150/#170 | portée compte ou projet : décision T ; aucun RDV réel |
| Assistance, récupération de compte, notifications | #169 | **Branche #170** | Cx | `support.ts`, `api/auth/forgot` | rapport #170 (SMTP local) | aucune boîte e-mail réelle ; responsable support : décision T |
| Comptes, sessions, isolation, entrées, données personnelles, droits des contenus | #171 | **En cours** (Codex) | Cx | — | — | aucune livraison à ce jour |
| Budget IA en %, réservations, plafond 40 % / 50 % caché | #146, #150 | Main, Tests | Cx | `billing.ts`, `ai/access.ts` | `tests/lot1-grille-offres.test.ts` | — |
| Administration, fournisseurs IA (clés chiffrées, bouton Désactiver) | CLAUDE.md | Main, Tests | Cx | `src/app/admin`, `api/admin/settings` | lots précédents | — |
| Bilingue FR/EN | CLAUDE.md | Main, Tests | tous | `i18n-server.ts`, `theme-base/locales` | CI | — |
| Sauvegarde, migration et restauration des données | #163 | **Branche lot 1** (cette PR) | C2 | `scripts/lot1/` | `LOT1_MIGRATION_RESTAURATION.md`, `reports/lot1/essais/`, `tests/lot1-sauvegarde-restauration.test.ts` | **données réelles de Thomas non testées** |
| Mise en ligne du studio lui-même (domaine, HTTPS, volume) | README, #163 | Code prêt (Dockerfile, CI Docker) | T/C2 | `Dockerfile`, `docker-compose.yml` | job CI « Image Docker » | aucun déploiement réel vérifié |
| Hébergement des sites clients et de leurs domaines | #163 | **V2** | — | — | — | retiré des blocages V1 et des promesses |
| Refonte de l'accueil commercial | #163 | **À faire en fin de V1**, après accord de T | C1/T | `src/app/page.tsx` (non modifié par ce lot) | écarts recensés : `LOT1_RESULTATS.md` § 4 | ne pas refaire maintenant |
| Tutoriels vidéo de l'aide | CLAUDE.md | Main | domaine 3 | `src/lib/tutorials/` | — | un texte contredit la règle des images 100 % IA (voir `LOT1_RESULTATS.md` § 4) |

## 3. Branches et PR en cours à la date du relevé

| PR | Branche | Tête | État | Dans main ? |
|---|---|---|---|---|
| #162 | `claude/integration-globale` | `8266c171` | fusionnée (`0a6aa1dd`, CI de `main` 39805634053 réussie) | oui |
| #127 | `claude/planifier-avec-visuels` | `7b65492d` | ouverte, en conflit, reprise à la main dans #162 | contenu utile porté ; mode gratuit écarté (voir `LOT1_RESULTATS.md` § 2) |
| #165 | `codex/lot5-diagnostic-acces-routage` | `4bce4d15` | ouverte, outils historiques | non (pas une dépendance) |
| #166 | `codex/lot5-raccord-voix-routage` | `27777896` (CI 39812899470 réussie) | ouverte | non |
| #168 | `codex/angles-recherche-sourcee` | `dbfc05ad` (CI 39851944832 réussie) | ouverte | non |
| #170 | `codex/169-forfaits-paiements-assistance` | `46738852` (CI 39935000223 réussie) | ouverte | non |
| #167 | `claude/themes-differenciation` | `f8b7025a` (CI 39965915734 réussie) ; nouvelle tête `09897111` à 15 h 20 (rapport, CI en cours au relevé) | brouillon, en travail | non |
| #171 | (pas encore publiée) | — | mission en cours | non |

## 4. Consignes remplacées

- Mission historique du lot 1 (22 octobre, archivée dans #163) : remplacée par la reprise du 23 octobre. La fusion
  #162 est faite ; l'autorisation de fusion de #159 ne s'étend pas à #166/#168/#170/#167/#171.
- `docs/coordination/LOT_1_MISSION.md` et `LOT_1_RESULTATS.md` (17 octobre, « consignes et textes jusqu'au thème ») :
  ancien lot 1 de Codex, sans rapport avec ce lot ; conservés comme historiques.
- README antérieur (49,90 €, +40 €/boutique, Flux/Joaillerie/Gourmand) : aligné par ce lot.
