# Intégration Claude + Codex / SYNA (#276) : rapport avant/après

**Branche** : `integration/claude-codex-syna-20261031`. **PR brouillon** : #278 vers `main`. **Ne pas fusionner** sans validation explicite du propriétaire.

Aucun déploiement, aucune activation, aucune migration de données client, aucun appel fournisseur payant. Les nouveaux drapeaux SYNA restent fermés ; l'hébergement reste désactivé sans `SITES_DOMAIN`.

Paramètres de l'agent Claude : modèle `claude-opus-5-5`, effort `high` (relevé de session).

## 1. Sources exactes (revérifiées le 31 octobre 2026)

| Source | Branche | SHA | État |
|---|---|---|---|
| Base | `main` | `70204a7f` | Inchangée |
| Claude #234 → #245 | `claude/239-p4-integration` | `a69fcf7e` | CI verte ; contient toute la chaîne (vérifié par ascendance) |
| Codex #208/#210 → #275 | `codex/211-cloture-syna` | `42ef034c` | CI 41169039547 verte. Contient #246 et 8eb15a6a. Reprises par contenu et commits seulement documentaires : voir #248 |
| Plan #248 | `claude/247-preparation-fusion` | `aff3c6a9` | Documentation seule |

PR non incluses, à décider séparément : #127, #165, #167, #179–#191 (très en retard sur `main`, en conflit ou documentaires).

## 2. Historique de la branche

| Commit | Contenu |
|---|---|
| `1987fb76` | Fusion `--no-ff` de la chaîne Claude `a69fcf7e` |
| `f04958e1` | Fusion `--no-ff` de la chaîne Codex `42ef034c`. **0 conflit textuel** |
| `fe2ee362` | Fusion du plan #248 (documentation) |
| `731277d5` | Correctifs d'intégration et `tests/integration276.test.ts` |
| (suivant) | Ce rapport et ses preuves |

**Fichiers modifiés des deux côtés**, fusionnés automatiquement et relus :
- `src/app/api/projects/[id]/route.ts` : adresse unique (Claude) et drapeaux de contexte (Codex), sans recouvrement ;
- `src/app/preview/[id]/v/[vid]/[[...path]]/route.ts` : `withContenus` (Claude) et aperçu de catalogue privé (Codex) ;
- `src/components/studio/shell.tsx` : menus par métier (Claude) et panneau SYNA (Codex) ;
- `src/components/studio/tab-boutique.tsx` : bouton « Publier votre site » (Claude) et focus SYNA, aperçu par défaut (Codex) ;
- `worker/index.ts` : file d'e-mails, nettoyage et domaines (Claude) ; rattachement des demandes SYNA (Codex).

Aucune stratégie globale « ours » ou « theirs » n'a été utilisée.

## 3. Correctifs d'intégration (`731277d5`)

| # | Constat | Correction | Preuve |
|---|---|---|---|
| **C1** | L'export et les captures SYNA (`currentSiteSource`) utilisaient `withBiens` : ni carte ni réalisations, contrairement à l'aperçu et au site hébergé | `withContenus` | Test : source SYNA identique à l'aperçu, carte et réalisations présentes |
| **P1** | Les sections remplies au rendu par un onglet métier pouvaient être retouchées ou retirées par SYNA, sans effet visible ou avec perte | `managedSections()`. Retouche exacte refusée avec un message clair. Composition : section conservée comme fonctionnelle, aucun texte relié | Tests. Gain réel : `portfolio` (Atelier Rive et anciens thèmes). Les sections propres aux thèmes, dont la carte, étaient déjà protégées par Codex |
| **P2** | SYNA ignorait les modules métier Claude | 6 opérations ajoutées au catalogue SYNA comme **non raccordées** (`absent_from_syna`, `not_connected`, écran natif) : carte, réalisations, réservation, demandes reçues, publication du site hébergé, domaine. Relevé SYNA : contenus par état et site hébergé (en ligne, à jour), **lecture seule** | Test |
| **P5** | Recomposition et prestations | Pas de correctif : les réglages de réservation sont dans l'en-tête, que la composition SYNA refuse de modifier ; la retouche exacte exige une page prévisualisable | Lecture du code (`assemble.ts`, `theme-tool-execution.ts`) |
| **R4** | L'effacement d'un compte laissait les fichiers des sites publiés | Effacement du banc d'essai : dossiers supprimés. `planAccountErasure` les compte. L'effacement automatique en production reste désactivé, comme avant | Test : site du compte A supprimé, site du compte B intact |
| **Nouveau** | Défaut révélé par l'intégration : les tables créées à la demande (carte, réalisations, sites) disparaissaient après une transaction annulée (aperçu de composition SYNA), puis « no such table » | Existence revérifiée ; les lectures ne créent plus de table | Les 8 tests de `composition211-syna` échouaient avec le premier correctif, puis passent |

## 4. Contrôles

### Avant correctifs (`fe2ee362`)

- Typage : OK.
- Suite complète : **4 461 réussis / 31 ignorés / 1 échec**. L'échec vient de l'environnement : le test impose `/usr/bin/chromium`. Relancé avec le Chromium local : 5/5.
- Kits de démonstration privés retirés le temps du test, comme en CI.

### Après correctifs (`731277d5`)

- **Typage** : OK. **Build de production** : OK.
- **Fichiers touchés** : 23 fichiers, 251/251.
- **Suite complète** : **4 465 réussis / 31 ignorés / 2 échecs** (512 fichiers). Les 2 échecs viennent de `video-bounded-chain` : délai de 60 s dépassé pendant que le Studio de recette tournait sur la même machine. Relancé seul : **11/11**. La CI, sur une machine dédiée, passe la suite complète.
- **CI de la PR #278** sur `731277d5` : **4 contrôles sur 4 réussis**. Exécution [41180260571](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/41180260571) : types et suite complète (réseau fournisseur interdit), Theme Check, build et recettes natives compilées, image Docker (construction et démarrage). Contrôle historique : typage, tests, Theme Check et build. Les avertissements Theme Check restent signalés, pas effacés (section 5).
- **Recette SYNA « clôture » de Codex** sur le build intégré compilé (`verify-agent211-build.ts --closure-ui`, fournisseur HTTP simulé, réseau extérieur bloqué), **2 parcours réussis** :

| Parcours | Résultats |
|---|---|
| Boutique multi-produits | Versions 1 → 2 → 3, annulation exacte. Réouverture sans appel. Largeurs 1440, 1024, 390 et 360. Changement de variante, panier de 2 articles (25 800 centimes). Brouillon non publié. Export de 1,67 Mo, non installé sur un CMS |
| Société de services | Formulaire de contact en aperçu. **Devis non envoyé, rendez-vous non réservé, catalogue indisponible : comportement honnête attendu** |
| Contrôles d'accès (les deux) | Sans connexion 401, autre compte 404, CSRF 403, plafond falsifié 400 |
| Coûts | **0 appel réel, 0 € réel** ; 14 appels HTTP simulés |

Preuve : `preuves-276/syna-closure-api-proof.json`.

- **Recette Claude sur le Studio intégré compilé** : instance isolée, HTTPS local, SMTP local, drapeaux SYNA fermés. Script et JSON : `preuves-276/int276-recette.mjs`, `i276-recette.json`.

| Étape | Résultat |
|---|---|
| Sites publiés : plâtrier APLAT, électricien PHASE, salon, restaurant, agence | 5 publications. Accueil, réalisations, carte et « acheter » à **200**, ordinateur et téléphone |
| Devis depuis la fiche d'une réalisation | Bouton vers `/pages/devis`, envoi 303, **e-mail reçu par le SMTP local** |
| Réservation de test (salon, API publique du site) | **201** (30 novembre 2026, 09:00) |
| Contenu modifié par l'API native (`ifVersion`) | Site en ligne **inchangé** et note « publiez une nouvelle version ». Nouvelle publication : visible. **Restauration de la version précédente** : l'ancien texte revient |
| Isolation des hôtes | `/studio`, `/api/studio-agent/draft`, `/api/projects/…/contenus`, `/admin`, `/preview/…` servis sur un nom de site : **404** |
| Menus par métier | Plâtrier : Réalisations. Salon : Rendez-vous. Restaurant : Carte et Rendez-vous. Agence : Biens. Pas de Catalogue pour les services |
| Compte étranger | Contenus, publication, conversation : **404** |

## 5. Distinction simulé / réel

| Élément | Statut |
|---|---|
| Fournisseur IA | **Simulé** (serveur local). Aucune qualification de la qualité réelle |
| CMS (Shopify, WooCommerce, PrestaShop) | Exports ZIP seulement, **non installés** ; aucune compatibilité annoncée. Les **35 avertissements Theme Check** connus côté Codex restent : 25 `ExcessiveSettingsCount`, 6 `UnusedAssign`, 1 `RemoteAsset`, 2 `UnclosedHTMLElement`, 1 `LiquidComplexity` |
| E-mails | **SMTP local** (boîte de recette) ; aucun envoi réel |
| Rendez-vous | Réservation réelle **dans la base de recette isolée**, données fictives |
| Publication | Sites hébergés **sur l'instance locale**. Aucun domaine public, aucun déploiement |

## 6. Limites et manques (nouveau développement ou autorisation nécessaires)

1. **Outils SYNA pour les contenus métier** : création ou modification de biens, plats, réalisations et prestations depuis la conversation, avec devis, accord, reçu et annulation. **Non développés.** Contrat proposé : s'appuyer sur `/api/projects/[id]/contenus` (#245), qui fournit déjà versions (`ifVersion`, 409), accord (`confirm`, 428) et droits, sans second moteur. C'est un lot du cœur SYNA (Codex) ; SYNA le signale aujourd'hui comme « non raccordé ».
2. **Composition complète des pages par prestation et raccord général des réservations dans le socle SYNA** : partiels (rapport Codex #275).
3. **Qualification réelle** des fournisseurs IA, des CMS installés et des envois réels : à faire avant toute mise en service, avec accord et prix.
4. **Défauts antérieurs** des compositions clients PHASE et APLAT (#245 : nom long, appel final) : non corrigés, thèmes validés.
5. **Effacement automatique des comptes en production** : toujours désactivé (décisions de conservation à prendre).

## 7. Réversibilité et activation

- `main` est intouchée. La branche est autonome : il suffit de la fermer.
- Une future fusion dans `main` se ferait par commit de fusion, annulable.
- Tables ajoutées : `site_*`, `carte_*`, `realisations`, `agent_*`. Toutes additives (`CREATE TABLE IF NOT EXISTS`), sans effet sur l'ancien code ; aucune colonne renommée ou supprimée.
- Sauvegarde de `studio.db`, `storage/` et `sites/` **avant** toute mise en service (plan #248, section 3).
- Activation séparée, fonction par fonction :
  - drapeaux `STUDIO_CONVERSATION_*` (SYNA) ;
  - `SITES_DOMAIN` (hébergement) ;
  - SMTP réel (notifications).

## 8. Suite

1. **Codex** : contre-vérification indépendante sur le SHA figé de cette PR, dans un checkout séparé. Les anomalies et correctifs vont dans des PR distinctes ; aucune écriture sur cette branche.
2. **Claude** : intégration des corrections retenues, contrôles relancés et rapport mis à jour.
3. **Propriétaire** : validation explicite avant toute fusion dans `main`.
