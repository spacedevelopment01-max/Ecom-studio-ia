# Issue #192 — Higgsfield et tarifs à confirmer en bloc

Livraison du 25 octobre 2026. Branche `codex/192-higgsfield-tarifs-groupes`, créée depuis `main` au commit `0a6aa1dd6dfa5932a5e42e027cef2a3335e74679`. Aucun merge ni déploiement. Le commit livré est celui de la PR associée à #192 ; les empreintes des fichiers vérifiés sont dans [le manifeste](../../reports/higgsfield-192/manifest.json).

## Résultat et niveau de preuve

L’administrateur enregistre les deux identifiants officiels, clique sur **Récupérer / actualiser les tarifs**, consulte les configurations préremplies, sélectionne les modèles et clique une fois sur **Confirmer les tarifs et activer les modèles sélectionnés**. Aucune saisie tarifaire modèle par modèle n’est obligatoire.

Ce parcours est implémenté dans l’administration et testé dans le navigateur avec les véritables routes HTTP et SQLite du studio, et des réponses fournisseur **simulées**. La réception des plans utilise les réservations, les droits, les plafonds et le stockage du moteur existant. Ce n’est pas un écran indépendant du moteur.

**Pas vérifié avec un compte Higgsfield réel ; aucune génération payante effectuée.** Aucun résultat créatif fournisseur n’est livré comme s’il avait été produit. Les montants et le taux visibles dans les captures sont fictifs. Coût réel des appels fournisseurs de cette mission : **0 €**.

## Méthode réelle de récupération

1. La documentation officielle décrit `POST https://api.higgsfield.ai/estimate/{identifiant-du-modèle}` avec les paramètres de génération et une réponse `usd`. Cette réponse propre au compte constitue la référence : aucun endpoint de catalogue/tarifs non documenté n’a été inventé.
2. Le catalogue public `/explore` sert uniquement à découvrir les liens de modèles. Les modes découverts sans adaptateur et schéma vérifiés restent désactivés. Une structure non reconnue est signalée ; elle n’est pas assimilée à un catalogue vide réussi.
3. Trois images neutres, sans données client, sont préparées aux formats proposés puis envoyées avec le mécanisme officiel d’upload signé. Les estimations image-vers-vidéo utilisent ces références valides, pas l’URL fictive d’un exemple de documentation. Les identifiants Higgsfield ne sont jamais transmis au stockage signé.
4. L’import interroge chaque configuration prise en charge : modèle/mode, résolution paramétrable ou imposée par le mode, seconde entière compatible, audio et format. Le périmètre actuel comporte **810 configurations**. Deux requêtes d’estimation peuvent être en cours simultanément ; un refus d’authentification ou une limitation interrompt les autres estimations, avec prix manquants explicites.
5. Chaque prix garde sa source et sa date. Le montant est une **estimation officielle pour une requête**, et non un taux universel par seconde. Cela conserve notamment la tarification par tokens vidéo de Seedance sans extrapoler son prix d’appel à la 4K. Aucun mode avec vidéo de référence n’est activé : sa facturation n’est pas extrapolée depuis une image.
6. La conversion utilise le XML quotidien de la Banque centrale européenne, avec source, date, taux et heure de récupération. Taux incohérent, futur ou âgé de sept jours : activation/lancement bloqués. Aucun nouveau taux fixe ni coefficient commercial n’est ajouté.

Les sources publiques distinguent prix normal, promotion maximale et cashback ; ces montants marketing ne sont **pas** appliqués au compte. La remise éventuelle doit se retrouver dans l’estimation authentifiée. Les prix normaux et promotionnels publics ne sont pas importés comme des grilles exactes : leurs valeurs « à partir de » ne permettraient pas ce calcul.

### Périmètre des adaptateurs

| Mode officiel | Entrée | Paramètres raccordés |
| --- | --- | --- |
| `kling-video/v3.0/pro/image-to-video` | Image | 3–15 s, son, format porté par l’image ; résolution imposée par le mode, non inventée |
| `kling-video/v3.0/4k/image-to-video` | Image | 3–15 s, son, mode 4K |
| `kling-video/v3.0/4k/text-to-video` | Texte | 3–15 s, son, format, mode 4K |
| `bytedance/seedance-2.0/image-to-video` | Image | 4–15 s, 480p/720p/1080p/4K, audio |
| `bytedance/seedance-2.0/text-to-video` | Texte | 4–15 s, 480p/720p/1080p/4K, audio, format |

Les paramètres multi-shot, vidéo de référence, édition vidéo et éléments supplémentaires ne sont pas envoyés implicitement. Le catalogue n’est pas prétendu entièrement raccordé : les autres versions et outils présents sur le site restent explicitement hors de ces cinq adaptateurs.

## Validation, coûts et reprise

- Un import crée une **proposition** et conserve les tarifs approuvés. La validation groupée exige une proposition récente, le même compte, un taux fiable et toutes les configurations des modèles sélectionnés. Les vingt versions précédentes sont conservées, en plus des données de coût gardées dans les reçus individuels ; une correction manuelle facultative garde son motif et survit au nouvel import.
- Le calcul exact alimente le routage multimédia, les devis généraux, les devis guidés et les réservations réelles. L’exécution réinterroge l’estimation avec la véritable référence produit et le corps exact de la demande. Un montant supérieur à celui approuvé bloque avant la soumission payante, même si une marge de réservation pourrait le couvrir.
- Les règles existantes restent celles du code : **40 % du montant mensuel HT** et **50 % du montant HT des recharges**. Aucun droit de forfait ni crédit n’est augmenté. La réserve native garde ses coefficients existants ; le relevé tarifaire n’invente aucune marge. Le budget inutilisé est rendu selon le règlement natif.
- Chaque intention conserve une clé d’idempotence et son reçu. Une soumission n’a qu’un essai automatique. Une réponse perdue/5xx sans reçu reste incertaine : aucune seconde génération automatique, même si Higgsfield documente la réémission idempotente.
- Les lectures d’état utilisent les états documentés (`queued`, `in_progress`, états terminaux), avec attente progressive. Elles ne fabriquent pas un pourcentage fournisseur. Un reçu acquis permet de reprendre le suivi ou le téléchargement sans nouveau dépôt payant.
- Les reçus extérieurs du moteur vidéo disposent d’une reprise en **lecture seule** : la barrière native `recoveryOnly` interdit toute nouvelle réservation. Un reçu illisible ou une demande modifiée ne devient pas une autorisation de relancer.
- Un échec/modération/annulation confirmé est non facturé selon la documentation. Une réservation encore détenue est libérée ; un débit provisoire incertain est réconcilié à zéro. Un succès acquis est compté une seule fois. Une nouvelle intention explicitement distincte conserve sa propre tentative et son coût.
- Le coût du statut fournisseur n’étant pas une facture, les usages restent marqués **estimés**. Le reçu conserve montant USD, taux, configuration et version approuvée. Un coût réellement facturé ne sera annoncé qu’avec une preuve fournisseur exploitable.
- Les vidéos terminées (jusqu’à 256 Mio par transfert) sont téléchargées, contrôlées puis enregistrées durablement dans le stockage natif. Les liens expirant chez Higgsfield ne constituent pas la livraison définitive. La propriété du projet reste vérifiée, y compris lors de la récupération d’un résultat déjà payé.

## Parcours produit et coexistence

Higgsfield est ajouté au catalogue, à la sélection des plans, aux dépendances du moteur V2 et au parcours guidé. Le studio transmet la référence du véritable produit et les consignes de fidélité ; il conserve les contrôles visuels existants avant acceptation. Les adaptateurs ne déclarent pas une capacité « personnes » : aucun personnage sans référence n’est promis ou ajouté par ce raccordement.

La confirmation actualise aussi les autres écrans : un tarif par configuration n’est pas affiché comme manquant, et le modèle devient sélectionnable comme principal sans saisie d’un faux prix à la seconde. Le mode guidé explicitement « staged » suit la route annoncée dans son devis ; les anciennes demandes sans ce choix conservent leur parcours.

Les plans alimentent le montage existant : identité du projet, textes, voix, sous-titres et formats restent dans leurs parcours habituels. Un plan brut n’est pas présenté comme une publicité terminée. La qualité réelle du mouvement et la fidélité visuelle restent à mesurer lors d’un essai expressément autorisé ; les tests techniques ne les prouvent pas.

fal.ai, Google, Alibaba et les autres fournisseurs sont conservés. Aucun principal global n’est remplacé automatiquement par Higgsfield. Aucune composition, page de thème, donnée client, offre commerciale ou connexion CMS n’est modifiée.

## Fichiers concernés

| Fonction | Fichiers |
| --- | --- |
| Schémas, authentification, estimations, versions, reprise, transferts | `src/lib/ai/higgsfield/` |
| Administration et validation groupée | `src/components/admin-higgsfield.tsx`, `src/components/admin.tsx`, `src/components/admin-media-routing.tsx`, `src/app/api/admin/{higgsfield,overview}/route.ts` |
| Catalogue, disponibilité, choix et devis natifs | `src/lib/ai/config.ts`, `media-models.ts`, `media-routing.ts`, `estimate.ts` |
| Réservation, reçus et génération réelle | `src/lib/ai/media-providers.ts` |
| Raccordement publicité et récupération du plan acquis | `src/lib/video-v2/{deps,providers,scene-generation,chain-quote,three-scenes,engine,receipts}.ts` |
| Tests et preuves isolées | `tests/higgsfield-*.test.ts`, `scripts/higgsfield-*`, `reports/higgsfield-192/` |
| Isolation des bases entre suites | `tests/database-file-setup.ts`, `vitest.config.ts` — même méthode déjà éprouvée dans les branches antérieures, sans modification des données du studio |

La mission Claude #190 reste séparée. Aucun fichier de composition ou export natif des thèmes n’est changé. Le raccordement partagé est limité à l’administration et aux modules fournisseurs/vidéo ; il faudra préserver ces ajouts si une autre branche modifie simultanément ces fichiers.

## Vérifications exécutées

Résultats finaux :

| Vérification | Résultat observé |
| --- | --- |
| TypeScript | Réussi, code de sortie 0 |
| Cinq suites ciblées | **105 tests réussis**, aucun échec |
| Suite entière | **2 915 réussis, 22 ignorés, 1 échec** sur 358 fichiers ; sortie 1 |
| Échec restant | `tests/social-autopilot-pilote.test.ts:160` : tâche payante attendue, identifiant nul. **Reproduit sur l’application `main` au commit de base**, sans modification de son code. Il n’est pas présenté comme corrigé par #192. |
| Moteur vidéo natif relancé | 12/12 réussis ; le premier incident de rendu était un manque d’espace disque (`ffmpeg: No space left on device`) |
| Capacités vidéo | 12/12 réussis après adaptation de l’ancienne assertion réservant le texte-vers-vidéo à un seul fournisseur ; le verrou des modèles non approuvés reste testé |
| Production | Compilation réussie ; serveur local de vérification arrêté après les captures |
| Navigateur | Import, confirmation groupée, sélection native du principal, absence de fausse alerte tarifaire, actualisation et largeur mobile : réussis ; aucune erreur JavaScript |

La suite générale n’est donc **pas entièrement verte**. La reproduction de l’échec Autopilot sur le commit original figure dans [le journal de référence](../../reports/higgsfield-192/main-autopilot-baseline.log). Les seuils et le code de production Autopilot sont conservés. Ce point doit être examiné séparément avant une intégration exigeant une CI entièrement verte.

Les résultats définitifs et les empreintes sont consignés dans `reports/higgsfield-192/verification.json` et les journaux associés. Commandes effectivement exécutées :

```bash
npx tsc --noEmit
NODE_OPTIONS=--max-old-space-size=1536 npx vitest run --maxWorkers=4
NODE_OPTIONS=--max-old-space-size=1536 npx vitest run tests/higgsfield-engine.test.ts tests/higgsfield-pricing.test.ts tests/video-receipts-approval.test.ts tests/video-beginners-direct.test.ts tests/routage-multimedia.test.ts --maxWorkers=2
NODE_OPTIONS=--max-old-space-size=2048 npx next build
```

Le navigateur ouvre une compilation native locale sur `127.0.0.1:3192`, avec un administrateur de test et une base dédiée sous `/tmp`. Le préchargement de preuve remplace les sources externes par des réponses simulées et refuse tout autre fetch externe ; il n’est jamais importé par l’application. Les routes de l’application ne sont pas interceptées dans le navigateur.

Cas ciblés : import complet, approbation multiple, configurations 1080p/4K/audio/durées distinctes, promotions non appliquées, prix manquant, hausse, baisse, compte changé, conversion périmée, surcharge préservée, fournisseur désactivé, authentification, limitation, 503 sans second dépôt, suivi existant, remboursement après incertitude, téléchargement interrompu, reprise après redémarrage et bail expiré, stockage durable, autre propriétaire refusé et nouvelle intention correctement comptée.

Deux préparations locales ont été corrigées : le checkout parcimonieux omettait `theme-base`, puis une suite historique exigeait son image de référence déjà suivie dans `reports/openai-real-brand-test`. Ces fichiers ont été récupérés, sans être modifiés. Ces échecs de préparation ne sont pas annoncés comme des régressions corrigées dans les thèmes.

## Captures et vidéo

Toutes ces preuves portent sur des **tarifs simulés**, jamais sur des prix réellement obtenus avec un compte :

- [Administration avant récupération](../../reports/higgsfield-192/01-admin-avant-import-simule.png)
- [Configurations préremplies et filtre](../../reports/higgsfield-192/02-tarifs-configurations-simules.png)
- [Deux modèles confirmés en une action](../../reports/higgsfield-192/03-approbation-groupee-simulee.png)
- [Actualisation conservant la version approuvée](../../reports/higgsfield-192/04-actualisation-conserve-approbation.png)
- [Administration en largeur mobile](../../reports/higgsfield-192/05-admin-mobile-simule.png)
- [Vidéo réelle des interactions de l’administration simulée](../../reports/higgsfield-192/parcours-admin-simule.webm)

## Limites et prochaine vérification

L’environnement ne contient aucun identifiant Higgsfield prêt à l’emploi. Le proxy de l’exécuteur refuse les connexions directes vers `open.higgsfield.ai` et l’ECB avec **CONNECT 403**. La documentation officielle a été consultée par l’outil de lecture web ; cela ne prouve pas que l’import du studio a atteint ces services. Le réseau n’a pas été contourné.

À vérifier après configuration dans l’administration ou via `HF_API_KEY_ID` / `HF_API_KEY_SECRET`, côté serveur uniquement : import authentifié, restrictions propres au compte, hôtes réels des uploads et des sorties, durées/délais, rate limits, coût fournisseur facturé et qualité créative. Le transfert n’autorise que les domaines de stockage prévus et des adresses publiques ; un autre hôte reste bloqué plutôt qu’être accepté silencieusement.

Les exemples du tableau sont des estimations, pas une facture ni un tarif garanti jusqu’à la soumission. L’API documentée ne fournit pas ici de plafond USD contractuel verrouillant le prix entre estimation et dépôt. Le studio vérifie le tarif juste avant l’envoi et conserve la réserve native, mais une vérification de facture reste nécessaire pour mesurer un écart fournisseur.

L’import doit disposer d’un temps d’exécution suffisant pour sa grille et les limites du compte. Les configurations refusées restent signalées et non activables. Les modes à vidéo de référence et les autres outils web Higgsfield restent hors périmètre activé tant que schéma, facture et adaptateur ne sont pas raccordés.

Aucun essai fournisseur payant, merge, publication client ou déploiement n’est autorisé par cette livraison. Le studio habituel n’a pas été mis à jour. La PR et les preuves permettent la vérification avant intégration.
