# Fusion globale des travaux Claude et Codex — 25 octobre 2026 (issue #194)

Responsable de l'intégration et seul opérateur de la fusion : Claude (conversation Claude Code, session configurée sur
Opus ; l'effort n'est pas réglable depuis la session). Contre-vérification technique : Codex (#195).
Autorisation : Thomas, #194 (« que tout soit vérifié avant et après fusion »). Aucun déploiement, redémarrage du studio
réel, appel IA payant, paiement, envoi réel ni publication.

## 1. Versions

| Repère | SHA |
|---|---|
| `main` avant (base observée et relue) | `0a6aa1dd6dfa5932a5e42e027cef2a3335e74679` |
| Branche d'intégration | `claude/integration-fusion-globale` — PR #196 |
| Candidat figé (code) | `2dbdc050ef57bd6c74a44699f158e00d19c92208` (contrôles § 6) ; le commit suivant n'ajoute que ce rapport et ses preuves (`docs/`, `reports/`) |
| `main` après fusion | voir § 7 |

## 2. Registre des apports (têtes relues sur GitHub)

Ascendance vérifiée par `git merge-base --is-ancestor`, `git cherry` (équivalence de correctifs) et comparaison des
fichiers (`git rev-parse <branche>:<fichier>`).

| PR | Branche | Tête | Sort | Preuve |
|---|---|---|---|---|
| #170 | `codex/169-forfaits-paiements-assistance` | `46738852` | **retenue** | fusion sans conflit |
| #173 | `codex/171-securite-comptes-donnees` | `30e95aad` | **retenue** (après #170, sa base) | fusion sans conflit |
| #168 | `codex/angles-recherche-sourcee` | `dbfc05ad` | **retenue** | 1 conflit de test (§ 3) ; `ad-campaigns.tsx` fusionné automatiquement, lignes ajoutées par #170 (3/3) et #168 (1/1) présentes |
| #166 | `codex/lot5-raccord-voix-routage` | `27777896` | **retenue** | sans conflit |
| #174 | `ccr-064d1d72-49fbs4` | `c52e212f` | **retenue** | sans conflit ; correctif du test du pilote repris tel quel |
| #176 | `ccr-4c6316f6-6dusrt` | `0af6fe1f` | **retenue** (catalogue des 15 thèmes #190, produits/connecteurs, rendez-vous, exports, thèmes) | 4 conflits (§ 3) |
| #178 → #181 → #184 → #186 | chaîne des thèmes | `5404a2c6` → `d8aaf63b` → `fac0bed0` → `e0637775` | **déjà inclus** | têtes ancêtres de `0af6fe1f` |
| #179 #180 #182 #183 #185 #187 #188 #189 | `brief/*` | — | **déjà inclus (documentaire)** | fichiers identiques dans #176 ; SOUPLE : inventaire des images plus récent dans #176 (`1660ed0b`) |
| #167 | `claude/themes-differenciation` | `e2c43c61` | **déjà inclus / exclu** | 78 commits ancêtres de #176 ; les 8 autres sont les commits du Coven (#191) |
| #193 | `codex/192-higgsfield-tarifs-groupes` | `3fbf4e1b` | **retenue** | 2 conflits d'imports (§ 3) |
| #191 | `claude/le-coven-des-charmes` | `1b6b5555` | **exclue — décision de Thomas** | § 4 |
| #165 | `codex/lot5-diagnostic-acces-routage` | `4bce4d15` | **non fusionnée (historique)** | diagnostic daté, en retard de 5 commits sur `main` ; le raccord applicatif actif est dans #166 ; ses constats ne sont pas présentés comme l'état actuel et restent consultables sur sa branche |
| #127 | `claude/planifier-avec-visuels` | `7b65492d` | **remplacée** | reprise fonction par fonction dans `main` documentée par `LOT1_RESULTATS.md` § 2 (#174) ; « visuels gratuits » écartés |

Ordre des fusions sur la branche d'intégration : #170 → #173 → #168 → #166 → #174 → #176 → #193 (une fusion `--no-ff`
par PR, aucune réécriture des branches sources, aucune stratégie globale « ours/theirs »).

## 3. Conflits et résolutions

| Fichier | Côtés | Résolution |
|---|---|---|
| `tests/mission154-livraison.test.ts` | lot 9 (faux upload vidéo refusé, ligne corrompue simulée) / angles (lignes de recherche simulée exclues du décompte) | version lot 9 + filtre `fixture_research_*` |
| `src/lib/cms-v2/export.ts` | lot 9 (`assertSafeThemeContent`, `assertImportedExportAccess`) / #176 (`biensExportFiles`) | les trois imports ; les deux usages présents |
| `tests/mission154-parcours.test.ts` | angles (filtre) / #176 (droits de thèmes remis à zéro) | les deux lignes |
| `tests/mission160-holdout.test.ts`, `tests/mission160-unseen-final.test.ts` | lot 8 (`acquiredChoicesForTest`) / #176 (thème `souple` du catalogue #190 à la place d'`orbe`) | les deux |
| `src/components/admin.tsx`, `src/lib/ai/media-providers.ts` | #176/lot 9 / #193 | imports des deux côtés |
| `.gitignore` | #176 (kits privés MAISON & HORIZON, APLAT) / Coven | les deux (première version) ; inchangé après retrait du Coven |

## 4. Le Coven des Charmes (#191) : hors de cette fusion

Les protections du lot 9 (#173) refusent tout script dans les sections d'un projet (`assertSafeThemeContent`) ; le site
du Coven en a besoin (menu, panier, formulaires, cookies). Une exception pour le code versionné a été envisagée puis
**non appliquée** : c'est une décision de sécurité. Thomas a tranché : « sans intégrer la PR #191 dans cette fusion.
Conserve intégralement son travail sur sa branche… Son raccordement et la vérification de ses scripts feront l'objet
d'une intervention dédiée avec Codex, sans modifier les protections générales du Studio. »

- La PR #191 n'est pas fusionnée ; sa branche est intacte (`1b6b5555`).
- La première version du Coven arrivée par #176 (`clients/le-coven-des-charmes/`, `tests/coven-client.test.ts`,
  rapport) est retirée de la branche d'intégration (commit `1ed7b817`). Le dossier de consigne de #189 (maquettes,
  consigne, inventaires) reste versionné. Le Coven n'est ni au catalogue, ni aux démonstrations, ni dans la galerie.
- Une fusion ultérieure de #191 restera possible sans « revert du revert » : ses commits n'ont jamais été ancêtres de
  la branche d'intégration.

## 5. Corrections faites pendant l'intégration

1. **Grille du lot 1 (#174) alignée sur #190** (`2f10aa62`) : plus de quota par famille ; droits par thème et par
   forfait ; aucune répartition inventée pour 49/89 € (tous les thèmes proposés restent ouverts tant que Thomas n'a pas
   choisi) ; sections 8/12/20 par fonction ; prix, angles, publications, budget IA 40 %/50 % inchangés.
2. **Protections du lot 9 étendues aux fonctions arrivées après lui** (`589e7a90`, test
   `tests/integration194-securite.test.ts`) : connecteurs WooCommerce, PrestaShop et Shopify sans redirection suivie
   avec les accès ; photos importées d'une boutique par le téléchargement public contrôlé (DNS, redirections, taille) ;
   plafonds de débit atomiques (`rateTake`) des trois API publiques de réservation (salon, cabinet, restaurant).
   Vérifié sans changement : routes produits, boutiques, synchronisation, rendez-vous, biens (`projectFromCtx`),
   administration des droits et Higgsfield (`requireAdmin`), téléchargements Higgsfield (hôtes autorisés, IP publiques,
   sans redirection, 256 Mio au plus).
3. **Tests accordés aux règles du lot 9, sans retirer de vérification** (`41867544`) : double de transport explicite
   pour #166, vraies images JPEG pour #176, signature de classeur pour le document illisible de #168, ligne
   `provider=simulated` des angles exclue du décompte d'appels pour #173 (vérifié : seule ligne présente, aucun appel
   réel).
4. **Test du pilote dépendant du jour** : correctif de #174 conservé ; aucune assertion ni plafond modifiés.
5. **Aperçu : réponses JSON des sections de nouveau lisibles** (`48639173`) : l'intégration des ressources du lot 9
   (`portablePreview`) avalait la barre oblique inverse d'un guillemet échappé dans une réponse JSON (image avec
   largeur) ; le panier tiroir d'ONDE, d'ORBE et de RIVE ne s'ouvrait plus dans la démo. Test ajouté dans
   `tests/mission171-routes-lifecycle.test.ts` (il échoue sans le correctif).
6. **Synchronisation des boutiques sûre — quatre défauts reproduits par Codex** (#195,
   [commentaire 6403952034](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/194#issuecomment-6403952034),
   corrigés dans `0f45af27`, reproducteur versionné dans `tests/contre-verification-195-products.test.ts`) :

   | Défaut (Codex) | Correction |
   |---|---|
   | Vente faite pendant la synchronisation écrasée (12 au lieu de 11) | le stock d'une variante suivie part seul, après la fiche : **Shopify** ajustement relatif (`inventoryAdjustQuantities`) ; **WooCommerce / PrestaShop** (API à quantité absolue seulement) relecture juste avant d'écrire la seule quantité, limite restante écrite dans le rapport (une vente pendant l'écriture elle-même) |
   | Deux synchronisations simultanées : deux produits créés | une seule à la fois par projet et boutique : file d'attente + bail durable entre processus (`platform_sync_locks`), refus 409 explicite |
   | Réponse perdue : même réassort rejoué (14 au lieu de 12) | journal durable écrit avant l'appel (`platform_stock_ops`) : jamais de second envoi ; confirmé si la boutique montre la quantité visée, sinon stock de la boutique repris et vérification demandée dans le rapport |
   | Boutique répondant 503 enregistrée « active » | essai des accès par plateforme (`probe`) : toute erreur refuse l'enregistrement ; Shopify signalait mal ses 5xx (corrigé) |

   Assertions de Codex inchangées ; une seule adaptation : le cas « vente pendant l'écriture » est joué avec une boutique
   à ajustement relatif (aucune implémentation ne peut l'obtenir d'une API à quantité absolue), le cas « quantité
   absolue » est vérifié à part. **Choix laissé à Thomas** : garder cet envoi vers WooCommerce/PrestaShop avec la limite
   annoncée (état actuel) ou le refuser.
7. **Transport des connecteurs aux règles du lot 9** (`0f45af27`, `connectors/transport.ts`) : adresse contrôlée au
   moment de la connexion (anti « DNS rebinding »), aucune redirection suivie, réponse limitée (25 Mo, 60 s).
8. **Isolation A/B des nouvelles routes** (`f8d90a89`, `tests/integration194-isolation-ab.test.ts`) : produits,
   boutiques, synchronisation, rendez-vous, biens — compte B, administrateur et visiteur refusés (404/404/401) sans
   rien révéler ni modifier ; droits de thèmes et Higgsfield réservés à l'administrateur (403/401).
9. **Démos des thèmes de nouveau exportées en fichiers partagés** (`2dbdc050`, `scripts/static-deinline.ts`, test
   `tests/static-deinline.test.ts`) : constaté pendant la comparaison visuelle. Avec le lot 9, l'aperçu embarque ses
   ressources dans la page, et l'export statique des démos les recopiait dans chaque page et chaque état du panier :
   SOUPLE pesait 375 Mo, une page SILLON 4,7 Mo au lieu de 47 Ko, et la démo MUSEAU CLUB n'était **plus produite**
   (manque de mémoire). L'export remet ces ressources en fichiers `assets/inline-<empreinte>` (un fichier par contenu).
   La route d'aperçu et ses protections ne changent pas. Résultat : MUSEAU CLUB 28 Mo (26 Mo pour #176), pages
   identiques à #176 au pixel.

## 6. Contrôles AVANT fusion

Candidat figé : **`2dbdc050ef57bd6c74a44699f158e00d19c92208`**. Premiers contrôles sur `1ed7b817`
(candidat provisoire), puis tout rejoué sur le candidat figé après les corrections 5 à 9.

| Contrôle | SHA | Résultat | Preuve |
|---|---|---|---|
| Types (`tsc --noEmit`) | `2dbdc050` | OK | local + CI |
| Suite complète, garde réseau du lot 9 comme la CI | `2dbdc050` | **395 fichiers, 3 384 réussis, 0 échec**, 31 ignorés (ci-dessous) | journal local ; CI |
| Pilote sur les 7 jours de la semaine (32 fichiers) | `2dbdc050` | 7 × 244/244 | [`recette-7-jours-2dbdc050.txt`](../../reports/fusion-globale/recette-7-jours-2dbdc050.txt) |
| Migrations depuis 3 bases historiques synthétiques (`dcfc13b1`, `d97e0b95`, `0a6aa1dd`), 2ᵉ passage sans changement, sauvegarde, restauration dans une autre copie, copie de recette neutralisée | `2dbdc050` | 3 essais réussis (45, 45, 46 contrôles) | [`essais/`](../../reports/fusion-globale/essais/) |
| Isolation A/B/administrateur/visiteur (routes du lot 9 et routes arrivées après) | `2dbdc050` | réussie (suite : `mission171-*`, `integration194-isolation-ab`, `integration194-securite`) | suite |
| Contre-épreuves Codex #195 (synchronisation des boutiques) | `2dbdc050` | 13/13 | `tests/contre-verification-195-products.test.ts` |
| Build de production | `1ed7b817` local (58 pages, 6 Go de tas : le tas par défaut de ce conteneur, 2 Go, est dépassé par la vérification des types de Next) ; `2dbdc050` en CI | réussi | CI de la PR #196 |
| Image Docker (construction et démarrage) | `2dbdc050` | réussie | CI de la PR #196 |
| CI complète (types, tests, Theme Check des thèmes, build) | `2dbdc050` | **réussie** au 2ᵉ essai (run 40247116214) ; le 1ᵉʳ essai a été coupé par la limite de 45 min du job pendant le Theme Check, sur une machine plus lente (tests 20,9 min au lieu de 14,3), sans aucun échec. Marge à surveiller : environ 35 min sur 45 en temps normal | CI de la PR #196 |
| Démos intégrales des 17 démonstrations (15 thèmes + FRAISE, ONDE) : candidat comparé à #176 seul, captures 1440 et 390 px de chaque page | `2dbdc050` vs `0af6fe1f` | **aucune régression constatée** : les 17 démos sont produites des deux côtés, avec le même nombre de pages et d'états du panier ; 884 captures. Au premier passage, 51 pages dépassent 1 ; au second passage, 47 retombent à 1 ou moins. Les 4 restantes sont instables d'elles-mêmes : la référence capturée deux fois diffère d'autant (RIVE atelier 42,4/42,4 ; SOUPLE accueil 3,2/3,2 ; NOCTIL journal 8,8/10,0 ; ALCÔVE accueil téléphone 3,1, où deux captures de la référence ont aussi donné 3,1 lors d'un nouvel essai, image identique au bit près) | [`demos-visuel-176-vs-candidat.txt`](../../reports/fusion-globale/demos-visuel-176-vs-candidat.txt), [`demos-visuel-second-passage.txt`](../../reports/fusion-globale/demos-visuel-second-passage.txt) |
| Panier tiroir d'une démo exportée (ONDE, servie en HTTP local) | `2dbdc050` vs `0af6fe1f` | identique : article, prix, image chargée, aucune erreur JavaScript ni ressource manquante | — |

**Tests ignorés (31), justifiés un par un** : démonstrations complètes qui exigent un kit privé absent du dépôt
(FRAISE 14, ONDE 11, APLAT 1, MAISON & HORIZON 1) ; parcours produits ↔ boutiques de test réelles (2, variable `E2E`,
aucune boutique de test accessible) ; deux contrôles de provenance des films d'accueil suspendus dans `main` depuis le
19 octobre (décision de Thomas, commentaire dans le test). Rejoués sur `2dbdc050` avec les kits privés liés temporairement (rien d'ajouté au dépôt) : APLAT 11/11, MAISON & HORIZON 7/7, ONDE 16/16 ; FRAISE 5 réussis et 14 toujours ignorés, car le **kit FRAISE V2 (sept planches) est absent** de cet environnement.

**Méthode des comparaisons visuelles** : les deux démos sont produites par le même script (`prepare-theme-demos.ts`)
depuis l'arbre #176 et depuis le candidat, mêmes données de démonstration et mêmes kits privés ; chaque page HTML est
capturée en pleine page après défilement complet et chargement des images. Écart = moyenne de |différence| par
canal (0-255). Toute page au-dessus de 1 est recapturée plus lentement (référence capturée deux fois pour mesurer sa
propre stabilité). Les écarts du premier passage dus à la charge de la machine (images pas encore décodées) retombent au second
passage. Un premier essai, sur une version intermédiaire, a révélé la démo MUSEAU CLUB non
produite (correction 9) ; toute la comparaison a été refaite sur le candidat figé.

## 7. Contre-vérification Codex et fusion

| Étape | Détail |
|---|---|
| Contre-épreuves préparatoires de Codex sur #176 | 4 défauts reproduits ([6403952034](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/194#issuecomment-6403952034)), matrice et inventaire ([6404002831](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/194#issuecomment-6404002831)) ; défauts corrigés (§ 5, point 6) |
| Candidat transmis | `2dbdc050ef57bd6c74a44699f158e00d19c92208` ([#194](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/194#issuecomment-6405720106), [#195](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/195#issuecomment-6405720253)) |
| Verdict Codex avant fusion | VERDICT_AVANT |
| Fusion | FUSION |

## 8. Contrôles APRÈS fusion

À compléter.

## 9. Ce qui n'est pas vérifié ici (accès manquants) — à ne pas confondre avec une réussite

- Données réelles de Thomas (sauvegarde/migration) : procédure prête (`LOT1_MIGRATION_RESTAURATION.md` § 5), non exécutée.
- Boutiques WordPress/WooCommerce, PrestaShop et Shopify de développement : aucune accessible ici ; les ZIP ne sont pas
  installés dans cette passe (les preuves de #190 sont dans `EXPORTS_CATALOGUE_RESULTATS.md`).
- Higgsfield : aucun compte ni réseau (`open.higgsfield.ai` refusé par le proxy) ; parcours vérifié par les tests avec
  doubles explicites, prix fictifs ; aucune génération.
- Angles marketing : aucune API de recherche réelle ; les simulations sont identifiées (`provider=simulated`) ; aucune
  qualité créative réelle annoncée.
- Fournisseurs, SMTP et paiements : simulés.
- Limites connues de #190 non traitées ici : mises en page par produit non reprises dans les exports Woo/Presta, prix
  barré PrestaShop manuel, éditeur WordPress non testé dans l'assemblage incomplet, rendez-vous exportés non testés sur
  tous les thèmes.
- Synchronisation des boutiques (#195) : corrections vérifiées par des boutiques en mémoire et de faux transports.
  L'ajustement relatif Shopify (`inventoryAdjustQuantities`, API 2025-07) et l'écriture de la seule quantité
  (WooCommerce, PrestaShop) n'ont **pas été essayés sur une vraie boutique**. Pour WooCommerce et PrestaShop, une vente
  faite pendant l'écriture elle-même ne peut pas être garantie par leurs API, et le rapport de synchronisation le dit.
  **Décision à prendre par Thomas** : garder cet envoi avec la limite annoncée (état actuel) ou le refuser.
- Kit FRAISE V2 (sept planches) absent de cet environnement : ses 14 contrôles de démonstration restent ignorés.
  ONDE, APLAT et MAISON & HORIZON ont été rejoués avec les kits privés liés temporairement (rien d'ajouté au dépôt).
- Captures #190 restées dans l'espace de travail de la session qui a produit #176 (demande de Codex) : hors de cette
  session, non traitées ici.
- CI : le job principal dure environ 35 min sur une limite de 45 min ; une machine lente l'a déjà coupé une fois
  (aucun échec de test). À surveiller sur `main`.
- Version réellement servie par le studio : non vérifiée (aucun déploiement autorisé).

## 10. Tableau final

À compléter après la fusion.
