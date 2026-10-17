# Lot 1 — Résultats : consignes, textes et thèmes jusqu’à l’export

Date : 17 octobre 2026. Livraison pour revue indépendante ; aucune fusion ni mise en production.

## Reprise P1 — chaque fiche conserve ses propres faits et sections

Mission : [commentaire du propriétaire du 17 octobre](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/133#issuecomment-6242357664). Base distante récupérée : **`21ce77cc419b08ed0d3504bf9be54a53f2597368`**, branche `codex/lot-1-consignes-textes-themes`, PR **#133**. Aucun changement local initial, aucune branche concurrente remplacée. `CLAUDE.md`, `LOT_1_MISSION.md`, l'audit, les commentaires et le skill `.claude/skills/verifier-theme/SKILL.md` ont été consultés. Les travaux précédents et leurs preuves, même insuffisantes sur ce P1, sont conservés ci-dessous.

**Code testé : `fb0e78b96d44a6e0c17d2bcf1f6e3e51d7b11c2a`**. Les commits `14a981b`, `85517f7` et `c247e62` sont ses prédécesseurs de cette reprise. Le commit de remise ajoute uniquement ce rapport, les journaux et les preuves. Son SHA distant, sa CI finale et ses liens sont consignés dans [le commentaire de remise](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/133#issuecomment-6242444152), mis à jour après terminaison des jobs. La CI verte de `21ce77c` ne valide pas cette nouvelle correction.

### Diagnostic et corrections

| Statut et conséquence | Preuve vérifiable | Correction et fichiers |
|---|---|---|
| **REPRODUIT / CONFIRMÉ DANS LE CODE** : l'accessoire affiche catégorie, cellulose et diamètre du principal ; points forts, bénéfices, FAQ et accordéons issus du même contexte peuvent aussi lui être attribués. | Ancien HTML `reports/lot1/rattachement/products/page-2.html`, bloc `v2_specs_1`, et `templates/product.json` de l'ancien ZIP. La nouvelle régression, exécutée sur le code détaché `21ce77c`, échoue : présence de faits étrangers. [Source et sortie avant](../../reports/lot1/produits/avant). | `theme-v2/engine.ts`, `engine/shop.ts`, nouveau `theme/product-content.ts` (`bindProductContent`, `neutralProductTemplate`) : association par `product:main` ou `product:catalog:<clé>`, gabarit et IDs de sections propres à chaque cible. Le principal conserve sa composition ; les articles catalogue reçoivent leurs caractéristiques et points forts, sans copier les blocs commerciaux du principal. Leurs descriptions et FAQ ciblées restent complètes. |
| **REPRODUIT / CONFIRMÉ DANS LE CODE** : une donnée catalogue absente pouvait hériter d'une catégorie, réponse, preuve, objection, problème ou condition de livraison du principal. Une image de section invalide pouvait être remplacée par sa photo. | Tests de `verifiedFacts` avec catalogue vide et du vrai `tidyComposition`, puis rendu des trois fiches. | `seo-v2/facts.ts` : faits de l'article uniquement ; marque, ton, audience et contraintes de boutique restent communs. `theme/tidy.ts` : remplacement d'image de fiche uniquement parmi les images de son propriétaire unique, sinon champ vide. Aucun matériau, diamètre, prix ou bénéfice d'un voisin ne comble un manque. |
| **REPRODUIT / CONFIRMÉ DANS LE CODE** : conserver seulement le nouveau texte ne protège pas les retouches de gabarit, corps, SEO, médias ou couleur lors d'une recomposition. Deux régressions supplémentaires échouaient avec la première correction : style seul perdu et nouveau document SEO masqué par un ancien SEO manuel. | [Échecs intermédiaires](../../reports/lot1/produits/verifications/retouches-avant.txt), puis 17 tests produits réussis. Conservation comparée du thème courant avant/après, collision de fichier/section personnalisée, couleur seule et nouveau SEO/FAQ ciblés. | `product-content.ts`, types de provenance dans `theme/spec.ts` : empreintes par cible et champ, conservation des retouches connues, copie des médias/sections nécessaires avec nom distinct en cas de conflit, styles limités au gabarit propriétaire. Un document ciblé plus récent prévaut pour son champ ; une FAQ ciblée plus récente s'ajoute au corps manuel sans le supprimer ; une ancienne FAQ retirée par le client reste retirée. `theme-delivery.ts` rend cet ajout idempotent. Les versions précédentes ne sont ni écrasées ni activées par la composition de preuve. |
| **REPRODUIT / CONFIRMÉ DANS LE CODE** : un fichier par produit dans le ZIP ne prouve ni sa sélection ni son affectation après import. Le gabarit par défaut contenant les faits du principal restait dangereux pour tout produit non affecté. | `routeFor` sélectionne le suffixe attendu pour les six URL ; contenu du fichier JSON réellement désigné vérifié dans le ZIP ; charge utile du vrai `pushProduct` interceptée à sa frontière HTTP. | `product-content.ts` produit aussi un `product.json` neutre : titre, prix, achat et description dynamiques, recommandations de boutique. `product-templates.ts` + `theme/compile.ts` ajoutent `assets/es-product-templates.json` (identité, handle, suffixe et fichier). `cms-v2/adapters/shopify.ts` et `components/studio/tab-boutique.tsx` avertissent de l'affectation manuelle nécessaire après ZIP + CSV. L'installateur existant transmet `templateSuffix` avec le statut brouillon ; aucune installation réelle n'est revendiquée. |

Les contenus de boutique restent partagés lorsqu'ils sont explicitement tels : navigation, pied de page, marque et recommandations d'autres produits. Les assertions d'absence de faits étrangers portent sur le contenu de la fiche, hors recommandations identifiées ; les galeries et fichiers JSON sélectionnés sont vérifiés séparément. Un pied de page décrivant l'offre de la boutique n'est pas une caractéristique du produit courant. Aucun changement de `theme-base/`, aucune refonte graphique.

La conservation automatique vise les gabarits ayant un propriétaire explicite et unique. Un ancien gabarit partagé ou ambigu n'est pas attribué arbitrairement à une seule fiche. Les anciennes versions restent disponibles ; une fidélité générale à tout thème importé ou à toute composition historique inconnue n'est pas démontrée ici. Les nouvelles caractéristiques du catalogue actualisent les sections générées ; un gabarit retouché par le client reste sa version et n'est pas remplacé silencieusement.

### Matrice, avant/après et reproductibilité

Nouveaux fichiers : `tests/lot1-produits-fixtures.ts`, `tests/lot1-produits-sections.test.ts`, `scripts/lot1-produits-proof.ts`. Aucun branchement applicatif ne dépend du nom d'un projet ou d'un métier.

- Principal + deux articles catalogue : cartouche cellulose 47 mm, accessoire acier 210 g, article sans catégorie/caractéristiques/description. Même nom « Diagnostic » pour les trois, ordre du catalogue inversé et positions des objets produit permutées ; renommage et nouvelle masse vérifiés sans changement de propriétaire.
- Domaine de validation distinct ajouté après l'isolation initiale : cordes en nickel à tension moyenne, étui en polypropylène 850 g, troisième article sans caractéristiques. Données, prix et images distincts ; mêmes contrôles généraux. Les tests de prestations piano, voix, archives et instrumentation de la reprise précédente restent exécutés. Ce second jeu est une validation de généralisation limitée, pas un échantillon indépendant de clients réels.
- Corps très long corrigé par un utilisateur synthétique, fin de texte et FAQ propres conservées jusqu'au rendu et à la ligne CSV réellement parsée (champ multiligne). Contrôle du SEO par produit, des versions courantes inchangées, des modifications manuelles, fichiers en conflit et styles. Les chaînes HTML injectées dans les caractéristiques restent inertes.
- Régression initiale indépendante sur un worktree détaché du commit de base : copier `avant/lot1-produits-fixtures.ts.txt` vers `tests/lot1-produits-fixtures.ts`, puis `avant/reproduction.test.ts.txt` vers `tests/lot1-produits-avant.test.ts` et lancer Vitest sur ce dernier. Dépendances du dépôt, base temporaire de test, réseau bloqué. Échec attendu conservé dans `avant/reproduction-base.txt`. Le test équivalent du nouveau fichier passe après correction.
- Le script de preuve crée une base jetable, bloque `fetch` fournisseur et limite Chromium au serveur local. Il compose les trois fiches de chacun des deux domaines, vérifie le gabarit réellement choisi, ouvre chaque vrai ZIP Shopify, relit le manifeste et le CSV, puis mesure le rendu à 1440 et 390 px. Les aplats géométriques des images sont créés localement pour tester leur identité et leur chargement ; aucune qualité photographique n'est revendiquée.

Preuves après : [`reports/lot1/produits/preuves.json`](../../reports/lot1/produits/preuves.json), dossiers [`lab`](../../reports/lot1/produits/lab) et [`music`](../../reports/lot1/produits/music) : HTML rendus, gabarits sélectionnés, manifeste, CSV, ZIP et captures. Les anciennes preuves de `rattachement` restent intactes pour comparaison. Les captures finales ont été ouvertes et inspectées ; les vérifications automatisées ne sont pas une approbation commerciale.

### Commandes réellement exécutées sur le code final

Journaux : [`reports/lot1/produits/verifications`](../../reports/lot1/produits/verifications). Exécution locale Node 24.19.0 et Vitest 5.0.3. Toutes les bases de cette reprise sont temporaires ; aucun accès client ni donnée client.

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run tests/lot1-produits-sections.test.ts
./node_modules/.bin/vitest run --maxWorkers=1 tests/lot1-produits-sections.test.ts tests/lot1-rattachement-pages.test.ts tests/lot1-rattachement-parcours.test.ts tests/theme-v2.test.ts tests/seo-v2.test.ts tests/seo-v2-engine.test.ts tests/lot1-consignes-livraison.test.ts tests/lot1-holdout.test.ts tests/theme.test.ts tests/theme-custom.test.ts tests/site-texte-seo.test.ts tests/seo-utilise.test.ts
./node_modules/.bin/vitest run
# DATA_DIR créé avec mktemp, supprimé à la sortie :
DATA_DIR="$audit_theme_data" STOCK_OFFLINE=1 JOBS=2 scripts/verify-theme.sh --rapide
DATA_DIR="$audit_screens_data" STOCK_OFFLINE=1 CHROMIUM=/usr/bin/chromium ./node_modules/.bin/tsx scripts/theme-screens.ts reports/lot1/produits/verification-atelier atelier multi fr
# Ce script crée et nettoie lui-même son DATA_DIR :
CHROMIUM=/usr/bin/chromium ./node_modules/.bin/tsx scripts/lot1-produits-proof.ts reports/lot1/produits
git diff --check
```

- Types : **réussi**, aucune erreur. Nouveaux tests produits : **17 réussis**. Ensemble ciblé final : **12 fichiers / 137 tests réussis** (113,55 s), dont les **29 tests de rattachement précédemment acceptés**, les cas de services et les contrôles antérieurs de consignes/reprise.
- Theme Check rapide exécuté sur `c247e62` avant la dernière protection de suppression FAQ (aucun changement de schéma ou de section Liquid) : **25 cas réussis**, aucune erreur ni avertissement. Deux ZIP des preuves également contrôlés : **0 erreur et 0 avertissement**.
- Preuve dédiée sur `fb0e78b` : **2 domaines, 6 produits, 12 captures**, fin des textes dans le rendu et le CSV, bons modèles dans chaque ZIP, aucune propriété étrangère dans les sections propres, photos de galerie chargées et distinctes, aucun débordement horizontal mesuré, thème courant inchangé, **0 appel IA**. Les 12 captures ont été ouvertes et inspectées.
- Captures génériques prescrites : **10 réussies**, exécutées sur `85517f7` avant les deux précisions de conservation ; leur limite de photos vides est expliquée ci-dessous. La preuve dédiée a été réexécutée ensuite sur le code final.
- Suite complète finale sur `fb0e78b` : **260 fichiers réussis, 1 942 tests réussis, 3 ignorés**, aucun échec (633,72 s, sortie 0). Les tests ignorés ne sont pas comptés comme des vérifications réussies. [Journal complet](../../reports/lot1/produits/verifications/tests-complets.txt). Le verrou SQLite ancien ne s’est pas reproduit dans ce lancement ; sa cause demeure non démontrée.
- CI finale de la tête distante : verdict après envoi dans le commentaire de remise lié plus haut ; les anciens résultats restent de l'historique.

Deux lancements complets de cette reprise ont été interrompus volontairement : ajout des régressions style/SEO, puis vérification de la FAQ retirée (sortie 130 du second relevée). Ils ne sont pas présentés comme réussis. La troisième régression de conservation échoue sur `c247e62` : l'ancienne FAQ retirée réapparaît. [Échec conservé](../../reports/lot1/produits/verifications/faq-retiree-avant.txt), puis correction et 17 tests produits réussis. Le verrou SQLite du lancement de la reprise précédente reste décrit plus bas. Sa cause n'est toujours pas démontrée ; une CI réussie ne constituerait pas une explication de cet ancien échec.

Les dix captures prescrites du thème atelier (accueil, produit, menus et pieds de page) sont dans `verification-atelier`, sans débordement horizontal. **OBSERVÉ DANS LES CAPTURES** : les images de démonstration de cette fixture générique ne sont pas résolues par son serveur de capture ; elles ne prouvent pas le chargement des photos. La preuve dédiée aux six produits utilise de vrais fichiers binaires synthétiques et vérifie séparément le chargement de leurs galeries. Les recommandations chargées tardivement et le panier fixe ne font pas l'objet d'une validation complète de toutes les positions de défilement. Cette limite visuelle n'est pas cachée par le contrôle des types ou Theme Check.

### Ce que cette livraison démontre et ses limites

**CONFIRMÉ DANS LE CODE et REPRODUIT** : sélection des faits, sections, documents et SEO par identité stable, neutralité du modèle par défaut, transport complet du corps et des FAQ testés, manifeste d'affectation cohérent, version courante protégée. **Simulation limitée** : seul le transport HTTP de l'installateur Shopify est intercepté dans son test ; le code de préparation et la charge utile effective sont réels, mais aucune boutique n'est connectée. Les anciens tests du lot utilisant un SDK simulé restent identifiés comme tels. `ai_calls` de la preuve : **0**.

**Non vérifié** : import/affectation dans un compte Shopify réel, installation WooCommerce/PrestaShop et parité de leurs sections riches, reprise exhaustive de thèmes importés, qualité commerciale des rédactions IA réelles, disponibilités fournisseurs, navigation complète du formulaire React par un débutant, concurrence distribuée et conservation générale des URL lors d'une recomposition globale. Le CSV natif ne sélectionne pas les modèles ; le ZIP ne crée pas seul les produits ni leurs métadonnées SEO. Les métadonnées sont vérifiées dans le ThemeSpec et l'aperçu, sans prétendre les importer par magie dans le CMS. Les adaptateurs des autres CMS conservent leurs avertissements et ne sont pas déclarés équivalents au thème natif Shopify.

Conservés : travaux précédents, versions, contenu utilisateur, Project Brain, limites de tentatives et budgets, crédits, accès clients, protections d'activation, exports existants. Aucune clé ou donnée client publiée, aucun appel IA payant, nouveau fournisseur, compte Google/CMS connecté, déploiement, publication client ou fusion. Aucun autre lot lancé.

Suite recommandée : revue indépendante de ces régressions, des gabarits réellement sélectionnés et des limites d'affectation CMS. La PR reste ouverte pour vérification ; aucune acceptation de qualité commerciale n'est déduite des tests.

## Reprise après revue — rattachement des pages (17 octobre 2026)

Cette section décrit la correction demandée dans le [dernier commentaire de mission](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/133#issuecomment-6241348050). Le compte rendu initial, plus bas, est conservé comme historique : ses conclusions sur le rattachement étaient insuffisantes pour les homonymes.

### Version et périmètre

- Départ distant vérifié : `9d6e0734814598f930001d9f44a39f11c7303e1a`, branche de cette PR, répertoire propre. `main` : `ad41c596e859781f33874730891b4bd8b85e259e`. Aucun correctif concurrent publié sur cette branche au démarrage.
- **Code applicatif et régressions testés : `92b9295b234f9f526005c66fc8fa78e1eb82da9f`.** Les commits suivants changent seulement le script de captures, les preuves et ce rapport ; aucun changement du code applicatif ou des tests de ce commit.
- Script de preuve exécuté dans sa version `92b9295` (identifiant complet dans `reports/lot1/rattachement/preuves.json`). Il neutralise le défilement animé et vérifie que le panier fixe ne recouvre pas le paragraphe capturé. Types et 99 tests ciblés vérifiés sur ce même code.
- Relecture de `CLAUDE.md`, de la mission et du rapport initial ; skill [verifier-theme](../../.claude/skills/verifier-theme/SKILL.md) appliqué. Un seul exécutant. L'audit, la mission, les preuves antérieures et les versions de projet restent conservés.
- Aucun appel IA payant, fournisseur ajouté, compte CMS ou Google connecté, déploiement, publication client ou fusion. Aucun travail sur les 30 thèmes ou la galerie.

### Causes confirmées et corrections

| Constat | Preuve et conséquence | Correction et fichiers |
| --- | --- | --- |
| **REPRODUIT / CONFIRMÉ DANS LE CODE** : le premier titre ou alias trouvé passait avant une identité exacte ; une URL pouvait servir deux cibles. | Sur la base `9d6e073`, la régression réelle attend deux URL mais reçoit deux fois `/pages/prestation-1` ; [échec avant correction](../../reports/lot1/rattachement/avant-correction.txt). | `pages.ts` : extraction explicite des identités (`themePages`, y compris `StoreProduct.contentTarget`), association commune `associatePages`, identités d'abord, une URL au plus par cible et réciproquement. `sitePages` réutilise cette association ; `resolvePage` refuse plusieurs correspondances exactes. |
| **REPRODUIT / CONFIRMÉ DANS LE CODE** : les titres/alias historiques pouvaient réattribuer une page déjà identifiée, même retirée, ou choisir entre plusieurs propriétaires possibles. | Tests de renommage, alias communs, identité après un homonyme, identité/URL dupliquée et offre retirée. | Seules les pages dépourvues d'identité explicite entrent dans le rapprochement historique ; candidat et propriétaire doivent être uniques, en comptant aussi les offres déjà identifiées. Une identité explicite incohérente reste non résolue. `types.ts` et `doc.ts` conservent cette provenance optionnelle sans migration destructrice. |
| **REPRODUIT** pendant les vérifications de composition : la nouvelle composition omettait les anciennes pages ambiguës ; une page retirée pouvait être retraitée comme cible supplémentaire. | Les tests du parcours réel vérifient l'égalité des anciennes pages, texte et SEO compris, puis la présence séparée des nouveaux documents. | `theme-delivery.ts` : conserver les pages historiques avant livraison, leurs gabarits nécessaires (y compris un gabarit par défaut personnalisé sans suffixe), livrer aux seules cibles actives, ne pas remplacer une adresse occupée ni un gabarit utilisé par une autre page. Les anciens contenus restent accessibles par leur URL. |
| **REPRODUIT / CONFIRMÉ DANS LE CODE** : le rendu produit ignorait `StoreProduct.seo`. | Les contrôles du vrai `renderPage` échouaient sur les titres/descriptions SEO distincts ; ils passent après correction. | `theme/render.ts` sélectionne les métadonnées du produit demandé par son handle. La livraison produit utilise la même association stable et refuse une association ambiguë au lieu d'utiliser la position du produit. |

Les fichiers applicatifs modifiés sont `src/lib/seo-v2/{pages,theme-delivery,types,doc}.ts` et `src/lib/theme/render.ts`. Les tests nouveaux sont `tests/lot1-rattachement-pages.test.ts`, `tests/lot1-rattachement-parcours.test.ts`, avec les données isolées de `tests/lot1-rattachement-fixtures.ts`. Le script reproductible est `scripts/lot1-rattachement-proof.ts`.

### Matrice vérifiée

- Deux offres « Diagnostic », identités différentes : les quatre combinaisons d'ordre des prestations et des pages sont exécutées pour deux activités de services (accord de piano sur devis et cours de voix sur rendez-vous). Les deux corps et les deux SEO restent distincts jusqu'au `ThemeSpec`, au vrai rendu et aux exports concernés.
- Produit principal et accessoire homonymes, dans les deux positions de `StoreProduct`, pour laboratoire et semences : identités lues, aucun mélange des corps/SEO ; rendu des deux produits et lignes CSV contrôlés séparément.
- Renommage avec anciens alias communs ; identité exacte après un titre concurrent ; ancien contenu sans identité, unique ou ambigu ; offre retirée ; identité dupliquée ; URL dupliquée ; gabarit historique partagé, gabarit par défaut personnalisé et adresse de nouveau contenu déjà occupée.
- Produits historiques sans identité : association seulement si elle est unique ; sinon livraison en place sans modification du produit. Produit catalogue retiré : conservé tel quel lors de cette livraison, sans réattribution au principal.
- Validation supplémentaire ajoutée après la correction : numérisation d'archives sur devis et instrumentation industrielle avec accessoire. Composition réelle après changement du contexte et du nom du projet, puis contrôle des deux contenus et SEO dans le rendu. Aucune condition de production ne dépend d'un métier, d'une marque ou d'un nom de projet.
- La composition de preuve ne sauvegarde ni n'active une version : le thème courant est comparé avant/après et reste identique. Les bases sont temporaires, les documents locaux corrigés par un utilisateur synthétique et `fetch` interdit. Les tests de rattachement ne simulent ni la base, ni la sélection, ni la livraison, ni le rendu, ni l'export ; aucune évaluation d'un fournisseur réel n'est revendiquée.

### Commandes et résultats réellement exécutés

Les journaux sont dans [`reports/lot1/rattachement/`](../../reports/lot1/rattachement). Les exécutables locaux correspondent aux commandes `npx` du dépôt ; `DATA_DIR` est isolé par Vitest ou explicitement créé par les scripts.

```bash
# Sur la base avant correction : échec attendu, journal conservé
./node_modules/.bin/vitest run tests/lot1-rattachement-pages.test.ts

# Types : réussite, aucune erreur
./node_modules/.bin/tsc --noEmit

# Vérifications ciblées finales : 7 fichiers, 99 tests réussis
./node_modules/.bin/vitest run tests/lot1-rattachement-pages.test.ts tests/lot1-rattachement-parcours.test.ts tests/lot1-consignes-livraison.test.ts tests/lot1-holdout.test.ts tests/seo-v2.test.ts tests/seo-v2-engine.test.ts tests/theme-v2.test.ts

# Suite complète requise
./node_modules/.bin/vitest run

# Dans une base temporaire dédiée supprimée à la sortie
DATA_DIR="$audit_theme_data" STOCK_OFFLINE=1 JOBS=2 scripts/verify-theme.sh --rapide

# Crée sa propre base temporaire et interdit le réseau fournisseur
CHROMIUM=/usr/bin/chromium ./node_modules/.bin/tsx scripts/lot1-rattachement-proof.ts reports/lot1/rattachement
```

- Types : **réussi**. Régressions de rattachement : **29 réussies**. Ensemble ciblé final : **99 réussies**, 7 fichiers (16,40 s). Les tests antérieurs du lot, du moteur SEO et du moteur de thèmes sont inclus.
- Première suite complète interrompue volontairement (sortie 130) pour ajouter la régression du gabarit par défaut : ce test a échoué avant correction. Après correction et contrôle ciblé, la suite a été relancée sur le commit final. **Suite finale locale non entièrement verte** : 258 fichiers réussis, 1 échec de collecte, 1 921 tests réussis et 3 ignorés (641,11 s). `tests/bibliotheque-modeles.test.ts` échoue avant ses 4 tests sur `SqliteError: database is locked`, lors de `db.pragma("journal_mode = WAL")` dans `src/lib/db.ts:1098`. Le même fichier exécuté séparément réussit ses **4 tests** (181,31 s). Les fonctions de base de données n'ont pas été modifiées ; la concurrence à l'initialisation est une hypothèse, pas une cause démontrée par cette reprise. Aucun échec de rattachement n'est présent dans ce lancement. [Journal complet](../../reports/lot1/rattachement/tests-complets.txt) et [exécution isolée](../../reports/lot1/rattachement/bibliotheque-isolee.txt). Le lancement global échoué ne reçoit pas un statut réussi par addition des tests isolés ; la CI finale doit être consultée séparément.
- Theme Check rapide : **25 cas réussis** (5 directions FR/EN, multi/niche, services FR/EN et ZIP client), aucune erreur ni avertissement. Aucun changement de `theme-base/`.
- Preuve navigateur : **4 pages, 8 captures** à 1440 et 390 px, contrôles des textes propres à chaque cible, absence de l'autre texte, `<title>` et meta description corrects, aucun débordement horizontal, paragraphe non recouvert après défilement. Les captures ont été ouvertes et inspectées ; les deux captures mobiles produit ont été refaites pour rendre le paragraphe lisible malgré le panier fixe.
- Deux vrais ZIP Shopify vérifiés par Theme Check : **0 erreur, 0 avertissement** ; les corps des prestations sont vérifiés dans leurs gabarits JSON, les corps produits dans leur **CSV séparé**. Les métadonnées sont présentes dans `ThemeSpec`, le DOM d'aperçu et les exports documentaires `.seo.json` par cible. Cela ne constitue pas une importation SEO automatique par le ZIP ou le CSV natif.
- `ai_calls` de la base de preuve : **0**. Aucun appel payant exécuté. Les dépendances locales de rédaction sont explicites ; la frontière SDK simulée des tests initiaux est toujours couverte par la suite ciblée.
- CI de la tête livrée : résultat, SHA exact et lien d'exécution consignés dans [le commentaire de remise de cette reprise](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/133#issuecomment-6241603870), mis à jour après terminaison des jobs. Ce contrôle après envoi porte sur le dernier commit distant, y compris rapport et preuves ; le succès de la CI de `9d6e073` n'est pas utilisé pour valider la nouvelle correction. Les deux jobs requis sont « Typecheck, tests, Theme Check, build » et « Image Docker (construction et démarrage) ».

Preuves visibles : [prestation 1 ordinateur](../../reports/lot1/rattachement/services/page-1-ordinateur.png), [prestation 2 mobile](../../reports/lot1/rattachement/services/page-2-mobile.png), [produit principal mobile](../../reports/lot1/rattachement/products/page-1-mobile.png), [accessoire mobile](../../reports/lot1/rattachement/products/page-2-mobile.png). Les autres captures, HTML compilés, exports documentaires, ZIP et CSV sont à côté. [`preuves.json`](../../reports/lot1/rattachement/preuves.json) indique le commit du script exécuté, les cibles, URL et résultats mesurés.

### Limites et décision de revue

- **Validé pour cette correction** : rattachement injectif, priorité des identités, refus de deviner les cas historiques ambigus, conservation des pages historiques et retirées, livraison séparée des documents et SEO au thème/rendu/exports contrôlés. Les versions utilisables, corrections et plafonds du lot initial restent couverts par ses tests ; aucune nouvelle génération payante n'est déclenchée par ce correctif.
- **À vérifier dans la CI** : exécution intégrale sans le verrou SQLite rencontré localement. Le fichier concerné passe isolément ; son échec au lancement global est conservé, sans modification de la base de données hors périmètre.
- **Non validé** : qualité commerciale d'une IA réelle, disponibilité des fournisseurs, installation sur un CMS externe, parcours complet dans l'interface authentifiée du studio. Les captures montrent des données synthétiques et des emplacements d'images vides ; elles ne prouvent pas une qualité professionnelle finale.
- **Limite préexistante observée dans les captures** : le gabarit produit commun comporte encore un bloc statique « Caractéristiques » issu du principal, également visible sur l'accessoire (`theme-v2/compose.ts`, construction de `templates.product`). Les corps documentaires et métadonnées sont bien distincts ; il ne faut donc pas lire ces résultats comme une validation de tous les blocs du catalogue. Ce bloc nécessite une correction/validation complémentaire par produit. Il n'a pas été modifié dans cette reprise consacrée à l'association des documents/pages.
- Les captures complètes d'une page produit placent le panier fixe à la position de défilement courante ; le script contrôle explicitement que le texte cible n'est pas recouvert. Il ne valide pas toutes les positions de défilement ou interactions.
- Les cas de médias personnalisés en conflit de nom de fichier ne sont pas couverts par ces données sans médias. La reconstruction de produits depuis les données du projet reste le comportement existant : la conservation des URL historiques produit après une recomposition globale n'est pas garantie par cette correction ; les anciens thèmes restent conservés et la livraison en place ambiguë ne les écrase pas.
- Les SEO documentaires sont exportés séparément ; aucune installation ou application automatique des métadonnées sur Shopify n'a été essayée. Aucun ancien rapport ou simple compilation n'est utilisé comme preuve de qualité des créations.

La PR reste ouverte pour revue indépendante, sans fusion. Le compte rendu initial suivant documente la première livraison ; la présente section et ses preuves déterminent l'état de la correction demandée après revue.

---

## Livraison initiale — historique conservé

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
