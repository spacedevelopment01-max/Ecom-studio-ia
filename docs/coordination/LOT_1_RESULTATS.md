# Lot 1 — Résultats : consignes, textes et thèmes jusqu’à l’export

Date : 17 octobre 2026. Livraison pour revue indépendante ; aucune fusion ni mise en production.

## Version, mandat et travaux préservés

- Dépôt : `spacedevelopment01-max/Ecom-studio-ia`.
- Branche : `codex/lot-1-consignes-textes-themes` ; PR [#133](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/133).
- Base distante récupérée : `5e886b41d83103625cfb20ffb2e63214494aacf2` (mission).
- Audit conservé : `ce18c419a320e3f434ba79891dabda87e6c595df` ; code audité : `ad41c596e859781f33874730891b4bd8b85e259e`.
- **Code testé : `bb51140ded044c30118e1cc7f422be8c584925a0`.** Les commits suivants de cette livraison ajoutent le rapport et les preuves, sans modifier ce code.
- Checkout initial local : branche `work`, commit `ad41c59`, sans modification locale. Passage à la branche demandée sur sa tête documentaire distante, sans réinitialiser ni remplacer de travail existant.
- Lecture intégrale sur cette branche de [la mission](LOT_1_MISSION.md), [l’audit](AUDIT_STUDIO.md), [CLAUDE.md](../../CLAUDE.md) et du [skill de vérification des thèmes](../../.claude/skills/verifier-theme/SKILL.md). Commentaires de la PR consultés au démarrage puis relus avant publication : mission, échec du lancement automatique et demande de reprendre cette session ; aucun autre exécutant confirmé.
- À la vérification distante précédant l’envoi, cette branche pointait toujours sur `5e886b4` et `main` sur `ad41c59`. La PR #127 concerne les publications sociales ; aucune intégration de cette PR, et conservation de ses zones de code dans le worker. Les travaux non publiés dans d’autres environnements ne sont pas visibles ici.
- Un seul exécutant pour les modifications du lot. Mission et audit existants laissés intacts. Aucun lot suivant entamé.

## Résultat et limites de portée

Le parcours de texte du lot conserve désormais la demande exacte et une empreinte du contexte, sélectionne les documents par cible, réutilise seulement les résultats correspondant à ce contexte et livre le corps complet au thème. Les reprises sont ciblées et bornées. Les essais rejetés sont conservés sans remplacer la version utilisable. Les statuts du livrable sont distincts de la fin technique d’un job.

Ce résultat est vérifié sur des données synthétiques, avec le vrai assemblage du studio et un fournisseur simulé à sa frontière SDK. Il **ne prouve pas** la qualité commerciale ou artistique d’un modèle réel, sa disponibilité, ni une installation CMS réussie.

Aucun appel IA payant, nouveau fournisseur, déploiement, publication client ou merge n’a été réalisé. Les écritures de crédits et d’abonnements des tests sont des écritures locales synthétiques. Les coûts et jetons du fournisseur simulé ne sont pas des dépenses réelles.

## Problème → correction → preuve

### 1. Demande exacte et contexte utilisé — F2

**CONFIRMÉ DANS LE CODE / REPRODUIT, fournisseur simulé.** Avant : l’intention et les faits ne suffisaient pas à distinguer deux consignes différentes. Le brief porte maintenant la demande brute, la cible stable, la langue, le snapshot SEO du Project Brain, son empreinte et sa version. Le même snapshot est transmis par `realSeoDeps` aux véritables appels de rédaction, relecture et correction ; une modification du contexte pendant le traitement ne remplace pas silencieusement celui du brief.

- Fichiers : [brief.ts](../../src/lib/seo-v2/brief.ts), [types.ts](../../src/lib/seo-v2/types.ts), [deps.ts](../../src/lib/seo-v2/deps.ts), [write.ts](../../src/lib/seo-v2/write.ts), [quality.ts](../../src/lib/seo-v2/quality.ts), [local-edit.ts](../../src/lib/seo-v2/local-edit.ts).
- Interface et transport : [content-panel.tsx](../../src/components/studio/content-panel.tsx), [route de création](../../src/app/api/projects/[id]/content/v2/route.ts), handler `content.v2` de [worker/handlers.ts](../../worker/handlers.ts).
- Le test de parcours appelle la route authentifiée, prend le vrai job, exécute le vrai handler, `realSeoDeps`, `llmJson` et inspecte la consigne réellement reçue par le SDK simulé. Deux demandes de deux/trois phrases et de fins différentes atteignent ce SDK sans être confondues. Les tests ne remplacent pas le moteur par une fonction qui imite le résultat souhaité.
- Limites explicites : saisie API bornée à 600 caractères (rejet explicite au-delà), pas de suppression silencieuse. Les consignes sont qualifiées de données métier, subordonnées aux faits, protections et autorisations. La vérification du ton, du sens et de la pertinence reste à relire.

### 2. Réutilisation et cibles — F2/F5

**CONFIRMÉ DANS LE CODE / REPRODUIT.** La clé `lot1.1` inclut le brief complet, les faits, le contexte, la langue et les capacités de rédaction/relecture. Les anciennes clés insuffisantes cessent de correspondre, sans supprimer leurs documents. Une demande identique réutilise sa version exacte sans nouvel appel ; une version modifiée par le client ne sert pas de cache réinscriptible.

- Fichiers : [engine.ts](../../src/lib/seo-v2/engine.ts) (`runContentEngineV2`, `engine`, `targetPage`), [store.ts](../../src/lib/seo-v2/store.ts), [pages.ts](../../src/lib/seo-v2/pages.ts), [theme-copy.ts](../../src/lib/seo-v2/theme-copy.ts) (`referenceContent`, `referenceDoc`).
- Cibles : `product:main`, `product:catalog:<clé>` et `service:<clé>`. Les anciens services sans clé reçoivent une identité déterministe en lecture, persistée à leur prochaine sauvegarde ; aucune écriture au simple chargement. Les anciens noms deviennent des alias lors des sauvegardes, acceptés seulement s’ils désignent une cible unique.
- Persistance : [projects.ts](../../src/lib/projects.ts), [project-types.ts](../../src/lib/project-types.ts), [services-editor.tsx](../../src/components/studio/services-editor.tsx), [route projet](../../src/app/api/projects/[id]/route.ts), [catalog.ts](../../src/lib/engine/catalog.ts), [spec.ts](../../src/lib/theme/spec.ts).
- Les pages livrées conservent leur cible dans `StorePage.contentTarget`, et les liens existants sont rapprochés de cette cible ; les pages personnalisées conservent leur URL comme identité de lecture. Une cible absente ou incompatible provoque un refus compréhensible, au lieu d’un retour implicite au produit principal.
- La sélection trie les versions utilisables de façon déterministe : corrections client prioritaires, puis date, puis identifiant. Une tentative bloquée ne fait pas disparaître une ancienne version utilisable de la même lignée. Les métadonnées autonomes et celles du document principal suivent cette même sélection.
- Preuves : répétition identique sans appel ; modifications de marque, vocabulaire mémorisé, faits et langue ; principal/accessoire dans les deux ordres ; prestations renommées et réordonnées ; correction client pendant une génération ; FAQ et métadonnées de la bonne cible.
- Limite de migration : une identité ancienne fondée uniquement sur un titre devenu ambigu ne peut pas être reconstruite avec certitude. Elle reste dans l’historique et n’est pas attribuée arbitrairement. Le renommage de collections héritées n’a pas reçu de test spécifique de migration.

### 3. Corps complet, aperçu et exports — F4/F5

**CONFIRMÉ DANS LE CODE / REPRODUIT / OBSERVÉ DANS UN NAVIGATEUR LOCAL.** Le corps du document remplace la reconstruction issue du seul résumé, dans V1 puis après la composition V2. Paragraphes, listes, questions et fin de texte sont conservés. Les titres sont rendus sans astérisques Markdown parasites ; les marques de texte deviennent du HTML échappé.

- [theme-delivery.ts](../../src/lib/seo-v2/theme-delivery.ts) est effectivement appelé par [composeShop](../../src/lib/engine/shop.ts) et [composeThemeV2](../../src/lib/theme-v2/engine.ts). Ce n’est pas un adaptateur laissé inutilisé.
- Produit principal et accessoires : corps et SEO par cible, avec bloc `description` ajouté lorsque la mise en page n’en avait pas. Ce dernier défaut a été découvert sur les semences, dans le jeu inédit ouvert dans Chromium, puis corrigé de manière générale.
- Accueil : introduction intégrale et autres paragraphes livrés dans une section de corps, même si le héros utilise une introduction courte ; H1 du document conservé. Un peu de répétition entre héros et corps est possible : aucun paragraphe n’est éliminé pour la masquer.
- Services, marque et zone locale : pages et gabarits par cible, H1 du document, texte complet et lien réel dans le pied de page. Les descriptions de collections sont alimentées quand un document correspond à la collection courante. FAQ et métadonnées autonomes sont reprises sur leur cible, sans les affecter à l’accueil par défaut.
- HTML dangereux : `toHtml`/`inlineHtml` restent les transformations utilisées ; balises script échappées et liens `javascript:` neutralisés dans le test de livraison.
- Export réel : route `/theme/export` exercée avec une session synthétique, pour ZIP Shopify contrôlé/enregistré et CSV produits. Ce test traverse `exportAndRecord`, les contrôles CMS, le rangement dans la bibliothèque et la réponse HTTP. Les quatre validations indépendantes exercent aussi `cmsExport` et le rendu Liquid réel.
- **Particularité Shopify conservée : le corps des produits appartient au CSV produits ; le ZIP de thème ne remplace pas l’import du catalogue.** Les pages de services créées ici portent également le contenu dans leur gabarit JSON exporté. Installation, création de pages, affectation des gabarits et import CSV dans une vraie boutique non exécutés.

### 4. Contrôles et corrections bornées — F1 limité à ce parcours

**CONFIRMÉ DANS LE CODE / REPRODUIT, fournisseur simulé.** [requirements.ts](../../src/lib/seo-v2/requirements.ts) contrôle les formulations explicitement citées comme imposées/interdites, la fin demandée et les nombres explicites de mots ou phrases. Les guillemets typographiques avec espaces ne créent pas de faux écart. Les longueurs et fins portent sur les paragraphes, comme indiqué dans la consigne envoyée ; titres, listes et boutons sont exclus de ce comptage.

- Le contrôle conserve séparément `checked`, `issues` et `unchecked` dans le contrat du document. Les consignes libres ne deviennent pas « vérifiées » par absence d’erreur. Ces informations sont consultables dans l’éditeur.
- Les diagnostics locaux/relecteur identifient les blocs. `mergeRewrite` fusionne uniquement ces blocs ou les métadonnées autorisées : pas de suppression, de déplacement ni de régénération du document entier. Une fin incorrecte ne cible que le dernier paragraphe, une interdiction le bloc concerné ; une longueur globale peut exiger les paragraphes du corps.
- Un défaut non localisé n’autorise pas une réécriture globale. Aucune reprise pour augmenter simplement un score. Plafonds existants conservés : au plus deux reprises pour une page, un plafond propre aux métadonnées, vérification de la dépense avant chaque outil et réservations réelles inchangées dans l’adaptateur.
- Les bornes ci-dessus comptent les reprises éditoriales. L’adaptateur partagé `llmJson` conserve ses propres réparations de format/troncature, déjà bornées (boucle de quatre envois au maximum) et soumises au plafond de trace/réservation existant. Ce nouveau parcours simule des réponses JSON lisibles ; les réparations de JSON n’y ont pas fait l’objet d’un essai supplémentaire. Les compteurs d’outils ne doivent pas être interprétés comme un décompte universel des envois fournisseur.
- Les essais insuffisants sont versionnés avant correction. Le dernier essai factuellement dangereux est aussi conservé avant un éventuel repli local. Le repli reste signalé et contrôlé à nouveau contre la demande : il n’obtient pas une qualité finale par simple absence d’exception.
- Une erreur de rédaction/relecture interrompt les appels suivants. Le test d’incertitude fournisseur vérifie un seul appel SDK, aucun essai financier automatique supplémentaire. Budget nul : aucun appel. Annulation avant l’appel : aucun appel ; après la rédaction : essai `RETRY` récupérable, sans nouvelle relecture.
- Une relecture très insuffisante n’est pas livrée comme utilisable au motif que l’ancienne politique autorisait une version provisoire manuelle à n’importe quelle note. Les contrôles d’essai sont conservés, puis le verdict effectif de la version est tracé séparément.
- Limites : le comptage de phrases est déterministe mais heuristique (abréviations, ponctuation complexe). Ce n’est pas un analyseur complet de toutes les consignes possibles. La pause pendant un appel fournisseur n’a pas été exercée dans le nouveau parcours complet ; `JobPaused` continue d’être propagé, sans retenter la génération dans le moteur.

### 5. Version utilisable, concurrence et messages — F1 limité à ce parcours

**CONFIRMÉ DANS LE CODE / REPRODUIT.**

- [saveThemeVersion](../../src/lib/projects.ts) conserve les versions refusées comme brouillons. Un contrôle `REJECTED` ou `RETRY` constatant un défaut n’active pas la tentative ; la composition du lot refuse aussi explicitement toute activation `RETRY`. Les appels historiques hors lot sans contrôle réalisé gardent leur comportement d’activation non vérifiée : ce lot ne refond pas tous les moteurs.
- `buildShopV2` et `buildShop` vérifient leur parent. Un changement client pendant la composition laisse sa version courante intacte et sauvegarde la proposition séparément. Premier projet refusé : aucune version courante et état `awaiting_validation`, pas de faux projet prêt. La route de lecture renvoie aussi ces premières tentatives ; l’interface donne accès à leur aperçu. Une restauration ne contourne pas le refus interne.
- La sauvegarde des textes est transactionnelle et vérifie la version attendue. Le moteur crée une nouvelle lignée en cas de modification concurrente ; l’éditeur envoie sa version attendue et reçoit HTTP 409 si elle est périmée. Le client ne peut pas changer la cible d’un document en modifiant sa charge utile.
- Deux demandes strictement identiques en parallèle partagent leur exécution dans le processus. Un bail SQLite par projet/type/cible/langue protège l’exécution entre propriétaires de bail ; il ne supprime pas un bail lié à une tâche active/pausée ou à une réservation détenue.
- [jobs.ts](../../src/lib/jobs.ts) garde le statut technique `done`, mais utilise le message du livrable lorsqu’il est fourni. Les résultats portent `ready`, `partial`, `to_verify` ou `blocked`. L’interface de texte et celle de thème affichent le contrôle/les réserves. [pipeline.ts](../../src/lib/engine/pipeline.ts) n’annonce pas la fin réussie d’un projet dont le thème n’a pas été activé.
- Une retouche locale ou IA qui n’a rien changé renvoie `applied:false`. Un réglage déjà identique n’est plus compté comme opération appliquée.
- Limites : test du bail avec deux propriétaires dans une vraie base SQLite, mais pas de test de charge sur deux serveurs séparés, de coupure système ni de reprise après crash. Les statuts des autres moteurs restent hors périmètre.

### 6. Traçabilité

Le contrat du document conserve demande, cible, empreinte/version de contexte et contrôles. Le thème enregistre `contentDelivery` : **clé et numéro de version du document**, cible, identifiant d’exécution et empreinte du contexte. Les versions de thème et les contrôles qualité existants restent utilisés. Les traces de thème n’embarquent pas la demande brute ni le snapshot complet.

Les [preuves JSON](../../reports/lot1/preuves.json) relient, pour quatre projets exclusivement synthétiques, le commit source, ces documents, la version du thème, le chemin réellement rendu, les captures et les vérifications de débordement.

## Matrice de mission

« Validé » signifie vérifié dans l’environnement isolé décrit ici, sans fournisseur réel.

| Critère | État | Preuve principale |
|---|---|---|
| 1. Deux consignes distinctes, même intention | Validé, SDK simulé | Route → job → handler → adaptateur → SDK ; deux/trois phrases et fins différentes |
| 2. Réutilisation sans nouvel appel | Validé, SDK simulé | Répétition exacte, appels comptés et version conservée |
| 3. Vocabulaire, marque, faits, langue nouveaux | Validé, SDK simulé | Empreinte et consigne inspectées après chaque changement |
| 4. Principal/accessoire dans les deux ordres | Validé | Corps et métadonnées séparés dans le vrai ThemeSpec |
| 5. Prestations/pages et titre modifié | Validé pour les cibles testées | Deux prestations dans artisan et restaurant, ordre et titres modifiés ; identités persistantes |
| 6. Long texte client jusqu’au rendu/export | Validé pour Shopify local | Document, copie, ThemeSpec, Liquid, navigateur, CSV et route ZIP réelle ; HTML dangereux inerte |
| 7. Tentative refusée et premier projet | Validé | Ancienne version courante, brouillon récupérable ; premier projet non prêt |
| 8. Reprise/limites/échec/budget/annulation | Validé avec limites | Reprise ciblée réussie, plafond deux, erreur incertaine sans relance, annulations avant/après rédaction ; pause fournisseur spécifique non vérifiée |
| 9. Concurrence et édition client | Validé localement, charge distribuée non vérifiée | Exécution partagée, bail SQLite, nouvelle lignée, parent thème et HTTP 409 |
| 10. Action sans effet | Validé | Réglage identique et remplacement identique : pas de modification annoncée |
| Qualité professionnelle et CMS installé | Non vérifié | Aucun fournisseur réel, jugement éditorial indépendant ni installation réelle |
| Formulaire React de bout en bout | Partiel | Connexion du champ examinée dans le code, routes authentifiées et jobs exécutés ; captures du thème, pas une session navigateur complète du studio |

Tests principaux : [lot1-consignes-livraison.test.ts](../../tests/lot1-consignes-livraison.test.ts), [lot1-holdout.test.ts](../../tests/lot1-holdout.test.ts). Les tests historiques SEO sont adaptés à la vraie reprise ciblée, plutôt qu’à trois rédactions entières. Le test d’audit de l’onglet utilise désormais un projet et un document réels à la place de son ancien mock incomplet. Le test du H1 compare le titre intégral réellement rédigé.

## Cas inédits et preuves consultables

Jeu ajouté après les premières corrections, indépendant des démonstrations publiques :

| Cas synthétique | Parcours | Captures du contenu | Export |
|---|---|---|---|
| Cartouche de laboratoire | Vente | [ordinateur](../../reports/lot1/laboratoire/contenu-ordinateur.png), [mobile](../../reports/lot1/laboratoire/contenu-mobile.png) | [ZIP thème](../../reports/lot1/laboratoire/theme.zip), [CSV produits](../../reports/lot1/laboratoire/produits.csv) |
| Semences potagères | Vente | [ordinateur](../../reports/lot1/jardinage/contenu-ordinateur.png), [mobile](../../reports/lot1/jardinage/contenu-mobile.png) | [ZIP thème](../../reports/lot1/jardinage/theme.zip), [CSV produits](../../reports/lot1/jardinage/produits.csv) |
| Accord de piano | Devis | [ordinateur](../../reports/lot1/piano/contenu-ordinateur.png), [mobile](../../reports/lot1/piano/contenu-mobile.png) | [ZIP thème](../../reports/lot1/piano/theme.zip) |
| Formation à la voix à distance | Rendez-vous | [ordinateur](../../reports/lot1/voix/contenu-ordinateur.png), [mobile](../../reports/lot1/voix/contenu-mobile.png) | [ZIP thème](../../reports/lot1/voix/theme.zip) |

Chaque dossier contient aussi `apercu.html` et les captures d’accueil aux deux largeurs. Les images de produit sont des emplacements synthétiques et les longs paragraphes répètent volontairement des données pour éprouver la conservation : ces captures ne constituent pas une proposition commerciale destinée à un client. La phrase de fin est vérifiée dans le DOM, pas seulement dans une chaîne du ThemeSpec. Les noms des projets sont modifiés pendant la validation ; aucune condition de production ne dépend de ces noms.

Les captures de contenu ont été ouvertes et inspectées : paragraphe final présent, disposition sur ordinateur/mobile, lien de la prestation dans le pied de page. Les formulaires, prix manquants et visuels de ces données synthétiques ne sont pas présentés comme prêts à publier.

## Commandes et résultats réellement exécutés

Exécution dans `/workspace/Ecom-studio-ia`, Node 24.19.0, Vitest 5.0.3, dépendances du dépôt déjà installées. Pas de nouvelle installation de fournisseur. `DATA_DIR` temporaire créé par Vitest ; `STOCK_OFFLINE=1`. Le script de preuves crée sa propre base jetable, bloque `fetch` sortant et ne laisse le navigateur charger que son serveur local.

1. `./node_modules/.bin/tsc --noEmit` — réussi, code de sortie 0, aucune erreur de type, sur le code final. [Relevé](../../reports/lot1/verifications/types.txt).
2. `./node_modules/.bin/vitest run` — réussi sur le commit `bb51140` : **257 fichiers réussis, 1 896 tests réussis, 3 ignorés, aucun échec** (1 899 tests, 647,83 s). Les trois tests ignorés ne sont pas comptés comme des vérifications réussies. [Sortie complète](../../reports/lot1/verifications/tests-complets.txt).
3. Tests ciblés de préparation : `./node_modules/.bin/vitest run tests/lot1-consignes-livraison.test.ts tests/seo-v2-engine.test.ts tests/lot1-holdout.test.ts tests/theme-v2.test.ts tests/site-texte-seo.test.ts tests/seo-utilise.test.ts tests/audit-onglet-boutique.test.ts tests/theme-custom.test.ts` — 8 fichiers, 67 tests réussis avant les dernières précisions de traçabilité/messages ; [sortie conservée](../../reports/lot1/verifications/tests-cibles-preparation.txt). Le passage général final couvre ces mêmes tests sur le commit final.
4. `DATA_DIR=/workspace/work/lot1-theme-check-data JOBS=2 STOCK_OFFLINE=1 scripts/verify-theme.sh --rapide` — réussi : 24 cas FR/EN (produits, multi, niche et services) plus le contrôle du ZIP client, aucune erreur ni avertissement dans les cas compilés. [Sortie complète](../../reports/lot1/verifications/theme-check.txt). Aucune modification de `theme-base/` ; mode rapide prévu par le skill. Un premier passage de ce script était déjà réussi ; la répétition finale rend aussi son répertoire de données explicitement isolé.
5. `CHROMIUM=/usr/bin/chromium STOCK_OFFLINE=1 ./node_modules/.bin/tsx scripts/theme-screens.ts /workspace/work/lot1-theme-screens atelier multi fr` — réussi : dix captures (accueil, produit, menus et pieds de page) ; aucun débordement horizontal. [Sortie](../../reports/lot1/verifications/captures-atelier.txt), [captures](../../reports/lot1/verification-atelier).
6. `STOCK_OFFLINE=1 CHROMIUM=/usr/bin/chromium ./node_modules/.bin/tsx scripts/lot1-proof.ts reports/lot1` — réussi sur `bb51140` : quatre cas, seize captures, un H1 par page de contenu, phrase finale visible, zéro débordement > 1 px, zéro erreur/avertissement Theme Check sur les quatre ZIP, zéro ligne d’appel IA. [Sortie](../../reports/lot1/verifications/preuves-execution.txt), [empreintes des fichiers](../../reports/lot1/SHA256SUMS). Le script exécute réellement le moteur local, la sauvegarde d’une correction synthétique, la composition, `cmsExport`, Theme Check sur chaque ZIP décompressé et Chromium aux largeurs 1440/390. [Script reproductible](../../scripts/lot1-proof.ts).
7. `git diff --check` — réussi avant les commits de code. État distant et contenu publié vérifiés séparément lors de la remise.

Historique des échecs utiles : les premiers tests ont relevé un problème d’espaces dans les formulations citées, des versions supplémentaires mal attendues par les anciens tests, un bloc de description absent, une activation indésirable de l’ancienne branche sans contrôle du moteur sur mesure, un mock d’audit incomplet et la suppression du suffixe du H1. Ces points ont été corrigés, pas masqués. Le premier passage général durant le développement s’est terminé avec 3 échecs / 1 884 réussites / 3 ignorés ; il mélangeait des modules transformés avant/après les modifications et n’est pas une validation du commit final. Un passage de consolidation sur `3b432e3` a été interrompu pour figer également l’alignement du verdict effectif et de sa cause au commit `bb51140`.

## À conserver et à vérifier ensuite

Conservés : Project Brain et vocabulaire mémorisé, contrôles factuels/HTML, politiques et plafonds de dépense existants, réservations et écritures de crédits, tâches/annulations, documents et versions historiques, compositions V1/V2, adaptateurs CMS, exports séparés du catalogue et mécanismes d’accès client. Aucune donnée de démonstration publique modifiée.

Restent non vérifiés ici : comportement rédactionnel et disponibilité des vrais fournisseurs ; qualité artistique/commerciale ; navigation complète de l’interface du studio par un humain débutant ; installation/import dans Shopify, WooCommerce ou autre CMS ; toutes les combinaisons de collections/pages héritées et de langues ; charge distribuée et reprise après crash. Les comparaisons FR/EN et les contrôles de structure existants restent dans la suite générale et Theme Check, mais les quatre nouveaux rendus ouverts sont en français.

Le contrôle du transport ne requiert pas d’appel payant supplémentaire. Un éventuel essai éditorial réel doit faire l’objet d’un devis séparé issu des tarifs/configurations alors disponibles et d’une autorisation explicite ; aucun montant réel n’est inventé dans ce rapport.

Prochaine action proposée : revue indépendante de cette PR et des preuves sur ce commit, puis décision du propriétaire. Aucun autre lot lancé et aucune fusion demandée ni exécutée dans cette livraison.
