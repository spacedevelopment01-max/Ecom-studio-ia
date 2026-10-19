# Lot 2A — complément du 18 octobre 2026 : thèmes et offres configurables

**Mise à jour d’exécution PHP :** [correctif et recette complémentaire](LOT_2A_VERIFICATION_EXPORTS_PHP.md), code `3bc50910ef4c950946813340b79196467e1d68f3` : **1 983 tests réussis, aucun ignoré**, types/build réussis, 103 fichiers PHP analysés et 24 sections éditoriales exécutées. La grille commerciale WooCommerce reste à adapter et est maintenant signalée. Les captures/vidéos et la recette historique ci-dessous sont conservées.

Statut : livraison pour revue, sans fusion. Les deux références sont proposées pour validation visuelle ; les 28 autres ne sont pas engagés. **Les remises et cadeaux sont vérifiés dans le panier serveur d’aperçu, pas au paiement d’une boutique CMS. Ils sont désactivés dans les exports tant qu’aucun adaptateur commercial approprié n’est installé et vérifié.**

Mission : [commentaire complet](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/134#issuecomment-6244332584), copié dans [LOT_2A_COMPLEMENT_2026-10-18.md](LOT_2A_COMPLEMENT_2026-10-18.md). Accusé de réception publié dans [#134](https://github.com/spacedevelopment01-max/Ecom-studio-ia/pull/134#issuecomment-6244410291). Branche `codex/lot-2a-themes-reference`, base distante vérifiée `8bcba3006db2e144b2f6e20e83f47ae44c26650c`. La PR reste empilée sur le lot 1 non fusionné. Aucun changement concurrent constaté au départ ; dernier état distant revérifié avant envoi.

Code applicatif testé : **`f40ef52dca145344d9972cf14727eeba6c992588`**, après le commit principal `b3b88d163e5cd8fd9e35bdd6e765540736d3086c`. Les PNG et les deux séries de vidéos indiquent ce même commit, avec `sourceDirty: false` et contrôle de l’absence de changement jusqu’en fin de capture. Le commit ultérieur de preuves/documentation ne change pas `src/`, `theme-base/`, `tests/` ni les scripts applicatifs. Il synchronise seulement les deux vignettes internes de galerie avec les nouvelles captures, en plus des documents et preuves. La tête effectivement publiée et son contrôle distant sont indiqués dans le reçu des PR. Les preuves précédentes `reports/lot2a/` et le rapport initial sont conservés ; les nouveaux fichiers sont dans `reports/lot2a/passe-2/`.

## Écarts traités et implantation

| Sujet | Résultat | Fichiers principaux |
|---|---|---|
| Achat simple, sans sélection de lots cohérente au panier | Composant `purchase-offers`, réutilisé dans `main-product` et disponible comme section autonome. Quantités configurables de 1 à 20, nombre d’offres non limité aux quatre exemples ; libellés, recommandation éditoriale, trois styles, variantes par article. | `theme-base/sections/main-product.liquid`, `theme-base/sections/purchase-offers.liquid`, `theme-base/snippets/purchase-offers.liquid`, `theme-base/assets/purchase-offers.{js,css}` |
| Prix affiché pris pour une remise commerciale | La configuration propose un pourcentage sur les prix unitaires connus ou un total fixe explicitement renseigné. Total, prix unitaire et économie sont calculés ; le serveur ignore les prix transmis par le navigateur. Répartition des centimes sans ligne négative. Aucun prix barré inventé. | `src/lib/theme/purchase-offers.ts`, route d’aperçu, `render.ts` |
| Cadeaux non liés à une règle persistante | Cadeaux provenant du catalogue par identité stable, SKU facultatif, quantité et seuil ; disponibilité et stock connus pris en compte. Réconciliation après changement, retrait, changement de lot et réordonnancement des variantes. Les cadeaux ne peuvent pas être librement conservés ou modifiés comme une ligne gratuite indépendante. | `purchase-offers.ts`, `spec.ts`, `main-cart.liquid`, `cart-drawer.liquid` |
| Édition susceptible de viser le produit principal | L’insertion et l’aperçu de galerie reçoivent le gabarit cible et utilisent le contexte et les médias de cette fiche. Le sélecteur de cadeau enregistre son identité ; renommer le produit ne change pas son propriétaire. Une fiche ambiguë ne reçoit pas de faits empruntés au produit principal. | `section-content.ts`, `section-defaults.ts`, routes `theme/sections` et `theme/section-preview`, `section-library.tsx`, `tab-boutique.tsx`, `ops.ts` |
| Demandes commerciales manquant de données | Traitement local borné pour les offres explicites : aucune règle de prix ou cadeau deviné. Question limitée à l’information manquante ; commande historique « ajoute des lots » conservée. Le prompt de retouche reçoit les identités réelles du catalogue et la consigne de ne pas inventer les conditions commerciales. | `purchase-command.ts`, `local.ts`, `local-first.ts`, `ai/tasks.ts` |
| Pages trop peu développées et peu interactives | Récit à chapitres avec image associée et détails natifs accessibles, réutilisable dans la galerie. Nouvelle progression de la fiche produit de référence, rédaction plus complète à partir des faits disponibles. Pages de services enrichies de comparaison et d’informations pratiques ; action adaptée au mode de contact existant. | `ref-narrative.liquid`, `reference-interactions.js`, `theme-reference.css`, `reference-composition.ts`, `product-content.ts`, `reference-delivery.ts` |
| Faux moyens de paiement présumés dans l’aperçu | L’aperçu n’affiche que la liste explicitement fournie. La liste native Shopify reste fournie par la boutique réelle. | `spec.ts`, `render.ts` |
| Scripts nouveaux absents des adaptateurs | Les interactions de récit et d’offres sont aussi embarquées dans les scripts WordPress et PrestaShop ; CSS et médias suivent le circuit existant. Les widgets d’achat sans route commerciale adaptée restent désactivés. | adaptateurs `wordpress.ts`, `prestashop.ts`, `cms-v2/export.ts`, `compile.ts` |

Les résultats ci-dessus sont **CONFIRMÉS DANS LE CODE** ; les cas réellement exercés ci-dessous sont **REPRODUITS**. Aucun journal de production client n’a été consulté. Les résultats simulés des fournisseurs dans les autres tests ne sont pas des appels IA réels.

## Données et rendu

Les médias autorisés restent ceux des démonstrations antérieures : montre ARVEN et paysagiste Racines & Pierres. Aucun nouveau média de marque tierce ni fichier de thème payant utilisé. Logo importé conservé. Le plan par page et le relevé de provenance sont livrés avec les captures. Les prises de vue réutilisées sont identifiées comme telles, jamais comme de nouvelles réalisations.

La configuration de démonstration d’achat est **fictive** : prix unitaire de 129 €, variante d’essai à 139 €, remises 8/12/15 %, pochette de test à 19 €, paliers et stocks synthétiques. Les variantes « Démo A/B » ne sont pas de nouvelles caractéristiques techniques revendiquées pour la montre. La pochette ne possède pas de photographie autorisée ; sa présentation dans le catalogue devra être complétée avant une publication client. Elle est donc présentée par son nom, sans lui attribuer l’image de la montre. Ces données sont confinées au harnais de tests ; aucune règle commerciale n’est créée automatiquement pour un client.

La marque, les couleurs et la forme de la montre sont conservées. Les textes ne prétendent pas connaître ses dimensions, son mouvement, son étanchéité ou ses délais de livraison. Les anciens arguments visuels répétant les mêmes faits sont masqués seulement dans la configuration de démonstration du nouveau bloc ; les données et versions clients ne sont pas supprimées.

Les animations sont facultatives, sans verrouillage du défilement, et respectent le mouvement réduit. Les chapitres utilisent `<details>` : le contenu reste consultable sans JavaScript. Une variante de comparaison réutilise les prestations, prix et durées disponibles ; aucun panier ni cadeau physique ajouté aux services. Les forfaits restent représentables par les composants de prestations/tarifs existants, avec devis ou réservation, sans prétendre à un abonnement facturé automatiquement.

## Références consultées et limites d’accès

Lecture le 18 octobre via l’outil web des pages publiques ; aucune récupération de fichiers payants, de textes ou médias pour les intégrer aux thèmes.

| Référence demandée | Accès constaté et usage |
|---|---|
| Shrine Pro / Luna Smoke | Contenu HTML accessible : quatre quantités, recommandation, avantages par seuil et deux actions. Inspiration du choix progressif d’offres ; aucune reprise de ses avis, urgence, textes, photos ou palette. |
| Concept / Flow Harmony | HTML accessible : plusieurs médias, caractéristiques, variantes, compléments proches de l’achat, développement technique, FAQ. Inspiration de la séparation entre choix d’achat et informations utiles. |
| Motion / Trail Pack Bloom | HTML accessible : galerie, présentation d’usage et caractéristiques. Aucune animation ni vidéo de cette démo déclarée comme observée en navigateur. |
| Impact, Be Yours, Impulse, Stiletto, Focal, Prestige | URL précises essayées via l’outil web : erreurs d’accès. Pas de comparaison visuelle ni d’interaction observée revendiquée. |
| Broadcast | Fiche officielle et documentation de l’éditeur accessibles ; ouverture de la démo interactive non obtenue. Les fonctionnalités décrites par l’éditeur restent des déclarations de documentation, pas une recette de la démo. |
| Khufu’s, MERSI, Caeli, Luminaire Authentik | Structures et contenus HTML accessibles : place des médias, projets, explication, présentation de services et contact. Composition propre au studio ; aucune transition de ces sites présentée comme testée. |

Les URL exactes sont dans le complément de mission. Le navigateur local ne peut pas visiter ces destinations : le proxy refuse notamment le CONNECT Shrine avec HTTP 403. L’accès texte par l’outil web ne remplace donc **pas** une revue visuelle interactive exhaustive des références. Les nouvelles interactions sont nos propres composants et sont vérifiées sur les rendus locaux du studio.

## Recette réelle

Environnement local : Node 24.19.0, Vitest 5.0.3, Chromium `/usr/bin/chromium`, ffmpeg/ffprobe installés. Les commandes suivantes ont réellement été exécutées ; les sorties sont conservées dans [les vérifications](../../reports/lot2a/passe-2/verifications/).

| Commande | Résultat réel |
|---|---|
| `npx tsc --noEmit` | **Réussi**, code 0, avant la suite globale du commit figé |
| `npx vitest run` | **262 fichiers réussis, 1 971 tests réussis, 3 ignorés, aucun échec**, 897,01 s ; [journal](../../reports/lot2a/passe-2/verifications/tests-complets.txt) |
| `npx vitest run tests/lot2a-purchase.test.ts tests/lot2a-reference.test.ts tests/editeur-sections.test.ts tests/theme.test.ts tests/i18n-content.test.ts tests/audit-contenus.test.ts` | **6 fichiers / 64 tests réussis**, dont le rattachement du produit après changement d’URL ; [journal](../../reports/lot2a/passe-2/verifications/regressions-rattachement.txt) |
| `DATA_DIR=/workspace/work/lot2a/passe2/theme-check-f40ef52-data STOCK_OFFLINE=1 JOBS=2 scripts/verify-theme.sh` | **137 cas réussis**, aucune erreur ni avertissement ; [journal](../../reports/lot2a/passe-2/verifications/theme-check-complet.txt) |
| `DATA_DIR=/workspace/work/lot2a/passe2/build-f40ef52-data STOCK_OFFLINE=1 NEXT_TELEMETRY_DISABLED=1 npm run build` | **Réussi**, code 0 ; [journal](../../reports/lot2a/passe-2/verifications/build.txt) |
| `CHROMIUM=/usr/bin/chromium npx tsx scripts/theme-screens.ts /workspace/work/lot2a/passe2/standard-final-vitrine vitrine mono fr` et équivalent `standard-final-jardin jardin services fr` | **Réussis**, aucun débordement ; photos vides du harnais standard, pas une preuve esthétique |
| `CHROMIUM=/usr/bin/chromium PLAYWRIGHT_BROWSERS_PATH=/workspace/work/lot2a/browsers npx tsx scripts/lot2a-passe2-proof.ts reports/lot2a/passe-2` | **Réussi**, 16 vues contrôlées, 31 PNG, deux captures vidéo MP4 avec sources WebM, 6 ZIP ; zéro média HTML manquant, zéro erreur JavaScript ; [preuves](../../reports/lot2a/passe-2/preuves.json) |
| `CHROMIUM=/usr/bin/chromium PLAYWRIGHT_BROWSERS_PATH=/workspace/work/lot2a/browsers npx tsx reports/lot2a/passe-2/filmer-interactions.mjs` | **Réussi**, deux vidéos complémentaires du défilement réel, du récit et des interactions, MP4 + WebM ; [recette](../../reports/lot2a/passe-2/videos-interactions.json) |
| `node reports/lot2a/passe-2/verifier-zip.mjs` | **Réussi**, ZIP réels : 183 fichiers produit / 186 services ; **0 erreur / 0 avertissement officiel** ; [empreintes et résultats](../../reports/lot2a/passe-2/export-check.json) |
| `git diff --check` | **Réussi** avant publication |

Les contrôles techniques n’équivalent pas à une validation esthétique, commerciale ou de paiement. Les trois tests ignorés nécessitent PHP pour la parité des sections et du calendrier ; ils ne sont pas comptés comme réussis. Les [échecs et interruptions de consolidation](../../reports/lot2a/passe-2/verifications/echecs-intermediaires.md) et le [passage global intermédiaire à 6 échecs](../../reports/lot2a/passe-2/verifications/tests-consolidation-non-figee.txt) restent accessibles. Le passage final figé ci-dessus les remplace pour la validation du code livré, sans réécrire leur résultat.

Le premier lancement global a rencontré `spawnSync ffmpeg EPERM` dans le bac à sable ; le même type de test a été diagnostiqué isolément, puis les commandes ont été rejouées avec les permissions d’exécution locales adaptées. Le script de capture refuse une base déjà configurée, utilise un répertoire temporaire et vérifie la stabilité des sources au début et à la fin. Les nouveaux tests d’édition utilisent aussi leur propre base SQLite. Aucun compte CMS ni nouvelle connexion Google utilisé.

Le nouveau test utilise son propre espace SQLite, avec session Next adaptée et disponibilité des fournisseurs forcée à faux. Il appelle les vraies routes d’édition, de chat, la vraie file et le worker local, sauvegarde/recharge/restaure les versions et ouvre les archives réellement exportées. La requête de prix falsifié et les variantes étrangères/épuisées sont refusées ; l’état utilisable n’est pas remplacé après un ajout refusé. Les identités des offres et SKU restent corrects après changement d’ordre ; plusieurs paliers d’un même cadeau sont agrégés.

La commande « Crée trois offres… » est reproduite avec la règle de prix explicitement donnée et un cadeau du catalogue identifié. Sans règle de prix, elle demande cette règle ; sans identité non ambiguë du cadeau, elle demande son libellé exact. Elle ne constitue pas une génération libre par fournisseur IA. Aucun appel IA réel effectué pour cette recette.

Nouveaux produits indépendants de la conception : kit d’entretien d’instruments à vent et patrons numériques de reliure, avec leurs propres noms, descriptions et faits, sans photo empruntée à la montre. Les quatre cas antérieurs (lampe en céramique, plans de couture, réparation de vélos cargo, traduction juridique) restent aussi couverts par les régressions. Ces vérifications démontrent une adaptation du moteur, pas une validation commerciale ou esthétique de tous les métiers.

Le navigateur passe par les vraies routes GET/POST signées d’aperçu et leur panier serveur. Vérifications à 1440, 390, 768 et 1024 px sur accueil et fiche, décodage de toutes les images, un H1, liens et absence de débordement. États duo/trio/article seul, cadeau verrouillé/disponible/épuisé, variante indisponible, prix mixte, panier du trio puis réduction au duo et retrait. FAQ, récit, galerie, menu/Échap/focus et mouvement réduit ; formulaire rempli et validé sans soumission externe. Le bandeau « Démonstration » et les mentions d’aperçu restent visibles.

## Mesures et preuves consultables

[Index des PNG originaux et des vidéos](../../reports/lot2a/passe-2/README.md). Les **31 PNG originaux** comprennent les accueils et fiches sur ordinateur/mobile, les vues rapprochées d’en-tête/section/pied et les états d’achat/panier. Les aperçus WebP comparatifs sont dérivés et séparés. Les deux vidéos détaillées durent **25,52 s (produits)** et **16,88 s (services)** ; les captures courtes initiales durent 19,84 s et 17 s. Les quatre MP4 sont accompagnés des quatre fichiers WebM natifs. Métadonnées contrôlées par ffprobe ; captures et extraits de vidéos inspectés. Les vidéos complémentaires utilisent les mêmes données de référence, dans d’autres projets temporaires ; leur script et son empreinte sont livrés.

Mesures locales pendant la recette sous charge de tests :

| Mesure | Produit | Services |
|---|---|---|
| LCP observé | 536 à 944 ms | 496 à 1 300 ms |
| CLS observé | 0 à **0,148742** | 0 à 0,000812 |

Le CLS maximal produit appelle encore une amélioration de la stabilité initiale ; sa cause n’a pas été isolée quantitativement dans ce lot. Il ne faut pas présenter ces nombres comme un score Lighthouse, une mesure réseau mobile de production ou une certification de performance. Le volume transféré Resource Timing indisponible est `null`, pas égal à zéro.

La vérification de publication (tête distante, présence des fichiers et téléchargements par empreintes) et le résultat CI sont consignés dans les commentaires de livraison des PR #134 et #133. Ils ne sont pas anticipés dans les résultats locaux ci-dessus.

## Matrice des exports

La présence de code dans une archive ne prouve pas son exécution dans un CMS. Le panier serveur d’aperçu n’est pas le système de paiement des plateformes. Les règles sont conservées dans `es-purchase-offers.json` (ou `offres-a-configurer.json` pour les kits), avec indicateurs serveur/paiement non vérifiés et avantages désactivés.

| Fonction | Shopify | WordPress/WooCommerce | PrestaShop | Wix / Squarespace |
|---|---|---|---|---|
| Composition, textes et médias | Sources Liquid/JSON conservées ; Theme Check officiel sur les ZIP réels | Format blocs/runtime natif et ressources ; nouvelle installation non vérifiée | Enfant Classic/module et sections rendues ; nouvelle installation non vérifiée | Kits de reconstruction, pas des thèmes natifs installables |
| Récit, comparaison, CSS et interactions | Sources présentes ; comportement du même moteur vérifié en aperçu | CSS et JS embarqués, exécution PHP/CMS non vérifiée ici | CSS et JS embarqués, exécution Smarty/CMS non vérifiée ici | Reconstruction manuelle ; nouvelle interaction non validée sur plateforme |
| Quantité simple sans remise/cadeau | Composant natif prévu avec vrais IDs de variantes à l’exécution ; panier Shopify réel **non vérifié** | Widget nouveau **désactivé** : route commerciale non adaptée. Achat Woo natif conservé | Widget nouveau **désactivé** : route commerciale non adaptée. Achat Classic natif conservé | Nouveau widget **désactivé**, parcours plateforme à reconstruire |
| Remise, prix de lot fixe, cadeau par palier | **Nécessite configuration/extension et adaptateur serveur vérifié ; désactivé dans cette livraison** | **Non pris en charge dans le nouveau bloc exporté ; désactivé** | Même statut, **désactivé** | **Non pris en charge automatiquement**, reconstruction requise |
| Cohérence panier/remises/cadeaux au paiement réel | **Non vérifiée** | **Non vérifiée** | **Non vérifiée** | **Non vérifiée** |
| Modèle distinct par produit | Manifeste conservé ; affectation manuelle après ZIP+CSV toujours requise | Fiche native partagée, **dégradé**, avertissement maintenu | Fiche Classic partagée, **dégradé**, avertissement maintenu | Reconstruction manuelle |
| Acheter maintenant | Non proposé dans l’aperçu : aucun paiement réel ; capacités natives à configurer et vérifier | Pas de nouvelle action accélérée revendiquée | Idem | Idem |
| Livraison gratuite par palier | Pas de nouvelle règle serveur d’expédition implémentée ; ne pas déduire un droit d’une ligne de texte | Idem | Idem | Configuration plateforme |
| Installation de ces nouvelles versions | **Non vérifiée** | **Non vérifiée** | **Non vérifiée** | Aucun import natif livré |

Sources officielles examinées : [Shopify Cart API](https://shopify.dev/docs/api/ajax/reference/cart), [Discount Functions](https://shopify.dev/docs/api/functions/latest/discount), [Buy X get Y](https://help.shopify.com/en/manual/discounts/discount-types/buy-x-get-y), [WooCommerce Coupons](https://woocommerce.com/document/coupon-management/), [PrestaShop règles panier](https://docs.prestashop-project.org/v.8-documentation/user-guide/selling/managing-catalog/managing-discounts/cart-rules), [Squarespace remises](https://support.squarespace.com/hc/en-us/articles/205811178-Create-discounts). L’URL de documentation Wix essayée n’était pas accessible ; aucune règle native Wix nouvelle n’est donc certifiée. Shopify demande notamment que l’article cadeau figure dans le panier ; un thème ne peut pas imposer son prix à zéro à partir d’un attribut JavaScript. Les mécanismes de coupons ou règles panier des autres CMS ne constituent pas à eux seuls un adaptateur de ce composant.

## Ce qui reste partiel ou non vérifié

- Acceptation visuelle des deux propositions par Thomas en attente ; aucune déclinaison des 28 autres.
- **Adaptation commerciale aux CMS partielle** : aucun connecteur serveur de remises/cadeaux au paiement réel, aucune installation ni commande réelle. La garde empêche leur affichage comme offres actives dans un export incapable de les appliquer.
- Aucun paiement accéléré, tarif réel d’expédition, réservation externe ou message commercial envoyé. Aucune nouvelle connexion CMS/Google.
- Stock testé avec des valeurs synthétiques présentes dans le modèle ; aucune synchronisation d’inventaire ni réservation concurrente de stock d’une plateforme réelle vérifiée.
- Vraies routes et worker vérifiés, mais pas un parcours navigateur exhaustif de tous les panneaux React du studio, ni une conversation réelle avec un fournisseur IA.
- Les preuves financières portent sur la démonstration EUR. Autres devises, fiscalité, combinaisons de promotions et paiement réel ne sont pas certifiés par ces essais.
- Photos existantes uniquement, pas de nouveaux points de vue produits générés ; pas de photographie de pochette. Certaines images réapparaissent dans des rôles éditoriaux distincts, sans être qualifiées de prises différentes.
- Lecture des références publiques partielle (HTML, certains accès refusés), aucune prétention de copie fidèle de leurs animations.
- Stabilité initiale de la fiche produit encore perfectible (CLS local maximal 0,149) ; tests clavier et mouvement réduit ciblés, pas d’audit WCAG exhaustif ni de score de production.

Le problème d’accès au dossier local de pièces jointes reste celui du premier rapport : chemin hôte absent et création refusée dans cet environnement. La restitution repose donc sur PNG consultables et téléchargeables par liens publics GitHub, vidéos MP4/WebM et index durable, vérifiés après publication. Ne pas confondre les aperçus internes « images vues » avec cette remise.

Aucun merge, déploiement, appel IA payant, achat d’extension, publication client ou nouvelle connexion. Les correctifs du lot 1, identités stables, versions, retouches, crédits et protections d’accès sont conservés. La prochaine décision demandée est la revue des deux références et du périmètre commercial restant, avant les 28 autres.
