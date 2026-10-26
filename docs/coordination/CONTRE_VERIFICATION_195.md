# Contre-vérification indépendante #195 — intégration #194 / PR #196

État au 26 octobre 2026 : **EN COURS ; aucun feu vert global ni contrôle APRÈS fusion annoncé.**

Responsabilités : Claude conserve seul la branche d’intégration et la fusion. Codex teste des copies séparées et publie ici ses preuves. Famille de modèle indiquée par la session : GPT-6 / Codex ; identifiant exact et réglage d’effort non exposés. Effort élevé demandé et examen approfondi effectué.

## Versions et périmètre

| Version | Rôle et état |
|---|---|
| `0a6aa1dd6dfa5932a5e42e027cef2a3335e74679` | Dernier main relu, pas encore la version intégrée |
| `2dbdc050ef57bd6c74a44699f158e00d19c92208` | Premier candidat figé ; défaut multi-variante reproduit |
| `8d5d236ad67f9ded1ce8547fe446693b12db7b64` | Même application que 2db ; 16 documents/preuves et timeout CI modifiés |
| `aec79070dce88666e2b59be3452f7b6b1304bdb9` | Corrige la reprise multi-variante ; saisie client concurrente encore perdue |
| `7f854218bb7afd08ec8ec2209b55c36ee53011f7` | Candidat actuellement contrôlé ; corrige aussi la saisie concurrente |
| SHA effectivement fusionné | **EN ATTENTE de Claude ; aucun contrôle après fusion possible à ce stade** |

Copies isolées, SQLite et médias fictifs sous `/tmp/ecs-195-*`. Dépôt de travail initial préservé : branche `codex/lot-2a-themes-reference`, commit `9f8b6c437580490acc52fd165986a1c3a79b394a`, propre. Aucun secret/configuration/base client copié. Garde réseau du lot 9 active pendant les tests natifs ; zéro appel fournisseur réel ou payant. Aucune fusion, publication client, modification du studio réel ou suppression globale Docker.

## Défauts traités et contre-épreuves

### P1 : une variante réussie est appliquée deux fois après refus de la suivante

**REPRODUIT** sur 2db, moteur et SQLite natifs, boutique mémoire explicitement simulée. Depuis les stocks 10/5, le client demande 12/7. A réussit ; B refuse 422. La reprise aboutit à **14/7 au lieu de 12/7**, en ajustement relatif comme en écriture absolue. Le point `synced_stock` de A était enregistré trop tard alors que son journal avait déjà été effacé.

Claude a reproduit puis corrigé dans `aec79070`, fichier `src/lib/products/sync.ts` : acquisition transactionnelle par variante ; conservation des opérations réussies/incertaines ; refus 4xx limité à la variante refusée. Deux contre-épreuves Codex inchangées repassent. [Reproduction et test](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/196#issuecomment-6408750773), [exécution indépendante rouge puis verte](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/194#issuecomment-6408849143).

### P1 : saisie du client écrasée pendant l’attente d’une synchronisation

**REPRODUIT** sur aec : synchronisé=10, demande=12 ; pendant l’ajustement, vente distante −1 et nouvelle saisie Studio=15. Le distant finit correctement à 11, mais le Studio reçoit **11 au lieu de 14** (11 acquis +3 encore à envoyer). L’ancien snapshot écrasait la valeur actuelle.

Claude a reproduit puis corrigé dans `7f854218`, même fichier : relire le stock au moment de la décision puis dans la transaction d’acquisition ; garder les variations postérieures et la désactivation du suivi. Notre contre-épreuve inchangée vérifie 11 distant/14 Studio puis 14 partout à l’envoi suivant. [Reproduction exécutée et test complet](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/196#issuecomment-6408857860), [prise en charge et correctif](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/194#issuecomment-6408883932).

### Défauts antérieurs de #176

Écrasement d’une vente par réassort, doublon de création concurrente, répétition après réponse perdue et boutique déclarée connectée après 503 : contre-épreuves et traitement déjà publiés [dans #194](https://github.com/spacedevelopment01-max/Ecom-studio-ia/issues/194#issuecomment-6403952034). Le candidat conserve les journaux durables, verrous et vraies sondes de connexion. L’envoi de stock WooCommerce/PrestaShop reste présent. Leur API d’écriture absolue garde une fenêtre vente/écriture explicitement déclarée ; une double simulée ne prouve pas l’atomicité d’un CMS réel.

## Commandes et résultats exécutés

Préfixe de sécurité utilisé : `NODE_OPTIONS='--max-old-space-size=1536 --import=<copie>/scripts/lot9/network-guard.mjs' APP_SECRET=<secret fictif>` ; aucune clé fournisseur configurée.

| Version | Commande / contrôle | Résultat réellement obtenu |
|---|---|---|
| 2db + deux contre-épreuves Codex | `npx vitest run tests/contre-verification-195-products.test.ts --maxWorkers=1` | **13 réussites, 2 échecs**, sortie 1 ; 2,31 s |
| aec + mêmes contre-épreuves | Fichier précédent + `produits-studio-190`, `integration194-securite`, `integration194-isolation-ab`, workers=2 | **48/48**, sortie 0 ; 12,30 s |
| aec + saisie concurrente | `-t 'réassort saisi au Studio' --maxWorkers=1` | **1 échec sélectionné**, sortie 1 ; 18 cas filtrés par `-t`, aucun test désactivé |
| 7f + trois contre-épreuves inchangées | Les quatre fichiers ciblés, workers=2 | **51/51**, sortie 0 ; 11,69 s |
| 7f | `NODE_OPTIONS=--max-old-space-size=3072 npx tsc --noEmit` | **Réussi**, sortie 0 |
| 7f | `scripts/lot1/recette-jours.sh <copie> tests/social-autopilot-pilote.test.ts` | **63/63**, neuf cas sur sept dates, 26 octobre–1er novembre ; sortie 0 |
| 7f | `scripts/lot1/base-historique.ts` puis `essai-complet.ts` depuis dcfc13b1 | **45 contrôles réussis**, migration/restauration fictive, source inchangée |
| 7f | Idem depuis d97e0b95 | **45 contrôles réussis** |
| 7f | Idem depuis main 0a6aa1dd | **46 contrôles réussis** |
| aec, avant correctif stock seul de 7f | Huit fichiers Higgsfield/prix, angles, reçus, idempotence et budgets | **138/138**, sortie 0 ; 34,30 s ; fournisseurs simulés |
| 7f | Suite complète `npx vitest run --maxWorkers=3` | **En cours** ; erreurs de préparation du checkout partiel observées, à retester après restauration des références et compétences suivies |
| 7f | Build de production / navigateur natif / exports | **En cours** |

Les commandes de migrations, leurs rapports JSON et les journaux sont livrés dans `reports/contre-verification-195/`. Les harnais isolés ajoutés pour les preuves ne modifient pas le moteur applicatif.

## Preuves GitHub et registre des apports

- Registre et conflits du rapport de Claude lus intégralement ; chaîne #170 → #173 → #168 → #166 → #174 → #176 → #193 conservée. Anciennes branches documentaires confrontées aux fichiers actuels, sans réintroduire les travaux remplacés.
- **Coven #191 explicitement exclu par la décision de Thomas consignée dans le rapport actuel et CLAUDE.md**, malgré sa mention dans la liste initiale #195. Branche conservée, pas réintégrée arbitrairement ; protections générales toujours présentes.
- CI 2db [40247116214](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40247116214) et 8d [40266288826](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40266288826) réussies. Dernier journal 8d : **395 fichiers réussis / 1 ignoré ; 3 384 tests réussis / 31 ignorés**. Ce sont les exécutions GitHub, pas des commandes Codex.
- Cette CI testait le merge temporaire `7b46c9f9d0e1848359cf2f27b6bfb9757668a12a` ; arbre `bacfa98f54386348cd27263a0d55ef002df3d211`, identique à la tête 8d. Ce n’est pas une fusion réelle dans main.
- CI 7f [40273960432](https://github.com/spacedevelopment01-max/Ecom-studio-ia/actions/runs/40273960432) : types/tests réussis, construction/démarrage Docker réussis ; autres étapes encore en cours au dernier relevé.
- Diff Git #176 `0af6fe1f` → 7f exécuté : **aucun changement dans `theme-base/`, `public/`, `assets/cms/`**. Changements du moteur de thèmes liés aux protections, import, transport/accès, compilation et médias clients ; ce constat ne suffit pas à lui seul à valider les captures.

## Limites constatées, à ne pas compter comme réussites

1. **CMS locaux bloqués par le stockage Docker VFS plein** : sources officielles WooCommerce 9.3.3, PrestaShop 8.1.7 et WP-CLI téléchargées, mais création WordPress et pivot Docker refusés (`no space left on device`). MariaDB fictive de préparation arrêtée ; anciens conteneurs/volumes intacts ; aucun nettoyage global. **Zéro parcours de CMS réel exécuté ici**. Achats et réservations après export non validés indépendamment.
2. **Kits privés absents** malgré tous les 661 fichiers publics suivis matérialisés : FRAISE 25 médias, ONDE 26, Atelier Nuance 2, Parenthèse 7, Phase 26, Maison & Horizon 87, APLAT 29. Les huit autres fixtures n’annoncent aucun média manquant. Les quinze thèmes se composent dans la base fictive. La complétude visuelle des kits absents reste non vérifiée.
3. Les 884 comparaisons de captures de Claude sont décrites dans son rapport. Elles n’équivalent pas à 884 captures intégralement inspectées par Codex ; publication des images consultables demandée dans #194.
4. Fournisseurs, prix du compte, génération, paiement, e-mail et publication sociale réels non testés. Les tarifs du harnais Higgsfield sont explicitement simulés ; les montants d’estimation ne deviennent pas des prix réels.
5. Studio réellement servi non redémarré ni vérifié ; un SHA fusionné ne prouve pas la version accessible au client.
6. Première suite interrompue pour compléter le manifeste TRAVERSE omis par le checkout partiel ; deuxième lancement a aussi rencontré JSON FRAISE et compétences omises lors d’une réapplication des motifs sparse. Les motifs ont été corrigés durablement (métadonnées suivies + `.claude` + `.devcontainer`) ; ces lancements ne sont pas annoncés verts.

## Verdict par point et suite

Stocks/reprises/saisies concurrentes : **contre-épreuves ciblées validées sur 7f, connecteurs simulés**. Autopilot, types, migration/restauration : **validés sur 7f**. Catalogue/sections/droits/isolation/exports/Higgsfield/angles : contrôles globaux et navigateur en cours ; précisions finales à ajouter. CMS réel, kits privés et version servie : **non vérifiés**, raisons ci-dessus.

**Pas encore de feu vert global AVANT fusion. Aucun verdict APRÈS fusion.** Claude doit publier le SHA final figé et ses résultats ; Codex complétera le contrôle concerné après toute modification. Après fusion par Claude seulement, repartir du SHA main exact dans une autre copie isolée et publier le second verdict dans #194.
