# CMS V2 — REVUE QUALITÉ VISUELLE ET TECHNIQUE (phase 11A)

Toutes les mesures ci-dessous viennent du banc local `scripts/cms-v2-bench.ts`. WordPress 6.6 + WooCommerce 9.3.3 et
PrestaShop 8.1.7 tournent en Docker sur la machine de travail. **Aucune plateforme réelle n'a été utilisée et aucune
boutique Shopify n'était accessible.** Les captures sont de vraies captures Chromium, sans retouche ; les planches posent
seulement côte à côte deux captures réduites. Dépenses d'IA : 0 €.

Comparaison **A / B / C** :
- **A** = aperçu du studio (vrai moteur d'aperçu).
- **B** = export (Shopify : les fichiers du ZIP rendus par le moteur d'aperçu ; WordPress : parité HTML des sections
  rendues par le moteur PHP livré).
- **C** = thème installé.

Conditions identiques : même projet, même page, mêmes largeurs (1440 px, 820 px pour l'accueil, 390 px), mêmes médias,
mêmes polices.

## Matrice de compatibilité (5 projets × 3 plateformes)

| Projet | Plateforme | Export | Structure | Installation tentée / réussie | Pages OK | Fidélité (écart pixels · sections · textes) | Édition native | Commerce | SEO | Défauts bloquants | Verdict (périmètre) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Sébastien Blanc (services) | Shopify | `sebastien-blanc-shopify.zip` (376 Ko) | Theme Check 0 erreur | non (aucune boutique Shopify) | 3/3 | 0 · 7/7 · 100 % | non mesurée sur Shopify réel (schémas contrôlés) | sans objet (services) | 10/10 | aucun | **PROVISIONAL** (validation statique (fichiers seulement)) — non mesuré : installation, navigation, buttons, forms |
| Sébastien Blanc (services) | WordPress / WooCommerce | `es-sebastien-blanc-wordpress.zip` (383 Ko) | OK | oui / oui | 3/3 | 0.024 · 7/7 · 100 % | vérifiée (éditeur de site) | sans objet (services) | 10/10 | aucun | **FINAL** (validation locale installée) |
| Sébastien Blanc (services) | PrestaShop | `essebastienblanc-prestashop.zip` (301 Ko) | OK | oui / oui | 3/3 | 0.028 · 7/7 · 100 % | partielle (pas d'éditeur visuel) | sans objet (services) | 8.9/10 | aucun | **PROVISIONAL** (validation locale installée) |
| Cosmétique premium (boutique) | Shopify | `serum-eclat-shopify.zip` (492 Ko) | Theme Check 0 erreur | non (aucune boutique Shopify) | 4/4 | 0 · 9/9 · 100 % | non mesurée sur Shopify réel (schémas contrôlés) | non vérifiable (pas de boutique) | 9.6/10 | aucun | **PROVISIONAL** (validation statique (fichiers seulement)) — non mesuré : installation, navigation, buttons, ecommerce |
| Cosmétique premium (boutique) | WordPress / WooCommerce | `es-serum-eclat-woocommerce.zip` (535 Ko) | OK | oui / oui | 4/4 | 0.012 · 7/7 · 100 % | vérifiée (éditeur de site) | panier + commande OK | 9.6/10 | aucun | **FINAL** (validation locale installée) |
| Cosmétique premium (boutique) | PrestaShop | `esserumeclat-prestashop.zip` (434 Ko) | OK | oui / oui | 4/4 | 0.019 · 7/7 · 100 % | partielle (pas d'éditeur visuel) | panier + commande OK | 9.1/10 | aucun | **PROVISIONAL** (validation locale installée) |
| High-tech (boutique) | Shopify | `ostral-shopify.zip` (1118 Ko) | Theme Check 0 erreur | non (aucune boutique Shopify) | 4/4 | 0 · 9/9 · 100 % | non mesurée sur Shopify réel (schémas contrôlés) | non vérifiable (pas de boutique) | 9.6/10 | aucun | **PROVISIONAL** (validation statique (fichiers seulement)) — non mesuré : installation, navigation, buttons, ecommerce |
| High-tech (boutique) | WordPress / WooCommerce | `es-ostral-woocommerce.zip` (1773 Ko) | OK | oui / oui | 4/4 | 0.02 · 7/7 · 100 % | vérifiée (éditeur de site) | non testable : prix non confirmé | 9.6/10 | aucun | **PROVISIONAL** (validation locale installée) — non mesuré : ecommerce |
| High-tech (boutique) | PrestaShop | `esostral-prestashop.zip` (1479 Ko) | OK | oui / oui | 4/4 | 0.04 · 7/7 · 100 % | partielle (pas d'éditeur visuel) | non testable : prix non confirmé | 9.1/10 | aucun | **PROVISIONAL** (validation locale installée) — non mesuré : ecommerce |
| Restaurant (services) | Shopify | `chez-lison-shopify.zip` (374 Ko) | Theme Check 0 erreur | non (aucune boutique Shopify) | 3/3 | 0 · 7/7 · 100 % | non mesurée sur Shopify réel (schémas contrôlés) | sans objet (services) | 10/10 | aucun | **PROVISIONAL** (validation statique (fichiers seulement)) — non mesuré : installation, navigation, buttons, forms |
| Restaurant (services) | WordPress / WooCommerce | `es-chez-lison-wordpress.zip` (329 Ko) | OK | oui / oui | 3/3 | 0.026 · 7/7 · 100 % | vérifiée (éditeur de site) | sans objet (services) | 10/10 | aucun | **FINAL** (validation locale installée) |
| Restaurant (services) | PrestaShop | `eschezlison-prestashop.zip` (247 Ko) | OK | oui / oui | 3/3 | 0.026 · 7/7 · 100 % | partielle (pas d'éditeur visuel) | sans objet (services) | 8.9/10 | aucun | **PROVISIONAL** (validation locale installée) |
| SaaS (boutique) | Shopify | `nuvia-shopify.zip` (564 Ko) | Theme Check 0 erreur | non (aucune boutique Shopify) | 4/4 | 0 · 9/9 · 100 % | non mesurée sur Shopify réel (schémas contrôlés) | non vérifiable (pas de boutique) | 9.6/10 | aucun | **PROVISIONAL** (validation statique (fichiers seulement)) — non mesuré : installation, navigation, buttons, ecommerce |
| SaaS (boutique) | WordPress / WooCommerce | `es-nuvia-woocommerce.zip` (623 Ko) | OK | oui / oui | 4/4 | 0.019 · 7/7 · 100 % | vérifiée (éditeur de site) | non testable : prix non confirmé | 9.6/10 | aucun | **PROVISIONAL** (validation locale installée) — non mesuré : ecommerce |
| SaaS (boutique) | PrestaShop | `esnuvia-prestashop.zip` (463 Ko) | OK | oui / oui | 4/4 | 0.028 · 7/7 · 100 % | partielle (pas d'éditeur visuel) | non testable : prix non confirmé | 9.1/10 | aucun | **PROVISIONAL** (validation locale installée) — non mesuré : ecommerce |

Lecture :
- **FINAL** veut toujours dire « validation locale installée », jamais une installation réelle.
- **PROVISIONAL** veut dire qu'une validation indispensable manque. Selon la plateforme :
  - Shopify : aucune installation possible ;
  - produits sans prix confirmé : commerce non testable ;
  - PrestaShop : pas d'éditeur visuel des sections.

## Verdicts par plateforme

| CMS | Exports contrôlés (dernier passage) | FINAL | PROVISIONAL | REJECTED | Défauts bloquants restants | Reprises ciblées pendant 11A | Problèmes corrigés | Non résolus | Niveau de validation atteint |
|---|---|---|---|---|---|---|---|---|---|
| Shopify | 5 | 0 | 5 | 0 | 0 | 2 (export en production, nom de fichier) | 2 | installation réelle non faite ; avis vides sur la fiche SaaS (10A) | statique + rendu local des fichiers exportés |
| WordPress / WooCommerce | 5 | 3 | 2 | 0 | 0 | 5 (CSV, page masquée, produit par SKU, galerie, consignes) | 5 | commerce non testable sans prix (2 projets) ; loupe de galerie à vérifier | installation locale |
| PrestaShop | 5 | 0 | 5 | 0 | 0 | 4 (erreur 500 bilingue, typographie Classic, contrastes, consignes) | 4 | pas d'éditeur visuel (limite de la plateforme) ; commerce non testable sans prix (2 projets) | installation locale |

Les verdicts sont enregistrés dans `quality_checks` (base du banc, `candidate_id = <plateforme>:bench`) et, dans le
studio, à chaque export (`<plateforme>:v<n>`). Les passages intermédiaires (avant correction) y figurent aussi.

- **Shopify** : 5 × PROVISIONAL, périmètre « validation statique ».
  - Theme Check : 0 erreur, 0 avertissement.
  - B est identique à A (écart de pixels 0,000).
  - Installation réelle : **NON VÉRIFIÉE**.
- **WordPress / WooCommerce** : 5 installations réussies sur 5.
  - FINAL (validation locale installée) pour l'artisan, le restaurant et la cosmétique.
  - PROVISIONAL pour le high-tech et le SaaS : leur produit n'a pas de prix confirmé, donc l'achat n'était pas testable.
- **PrestaShop** : 5 installations réussies sur 5, toutes PROVISIONAL.
  - La personnalisation native est limitée (pas d'éditeur visuel). Ce point ne se corrige pas par une reprise : il
    empêche FINAL.
  - S'y ajoutent le high-tech et le SaaS, sans prix confirmé.

## Fidélité visuelle

- **Pages du site** (accueil, page de contenu, mentions légales), sur les 10 installations :
  - suite des sections identique ;
  - textes du studio présents à 100 % (après normalisation des apostrophes typographiques de WordPress) ;
  - mêmes polices et mêmes couleurs de fond par section ;
  - animations d'apparition présentes et visibles ;
  - aucun débordement à 390 px ni à 820 px ;
  - aucune erreur JavaScript.
- **Fiches produit** : ce sont les pages NATIVES de WooCommerce et de PrestaShop, habillées au design du site (titres,
  boutons, couleurs, galerie).
  - Leur composition diffère de la fiche du studio : pas de barre d'achat collante, onglets natifs.
  - Les sections propres au produit (caractéristiques, questions) sont ajoutées dessous.
  - Ce choix est volontaire : le panier et la commande sont ceux de la plateforme, pas une imitation.
  - Ces pages sont exclues du calcul de la fidélité de structure. Ce n'est pas caché : ce rapport l'indique.
- **Simples pages de texte** : le contenu est rendu par la plateforme (éditable dans WordPress).
- **Tiroir panier de Shopify** : remplacé par la page panier native.

**Verdict fidélité : PARTIELLE.** Elle est validée localement sur les pages du site, mais elle est différente sur les
fiches produit. Il n'y a eu ni validation artistique humaine ni plateforme réelle.

## Planches (sélection)

| Projet | WordPress / WooCommerce | PrestaShop | Shopify (A / B) |
|---|---|---|---|
| Cosmétique | [accueil](screenshots/cms-v2/woocommerce/cosmetic/comparaison-accueil-desktop.jpg) · [produit](screenshots/cms-v2/woocommerce/cosmetic/comparaison-produit-desktop.jpg) · [panier](screenshots/cms-v2/woocommerce/cosmetic/C-panier.jpg) · [commande](screenshots/cms-v2/woocommerce/cosmetic/C-commande.jpg) | [accueil](screenshots/cms-v2/prestashop/cosmetic/comparaison-accueil-desktop.jpg) · [produit](screenshots/cms-v2/prestashop/cosmetic/comparaison-produit-desktop.jpg) · [panier](screenshots/cms-v2/prestashop/cosmetic/C-panier.jpg) | [accueil](screenshots/cms-v2/shopify/cosmetic/comparaison-accueil-desktop.jpg) |
| Sébastien Blanc | [accueil mobile](screenshots/cms-v2/woocommerce/artisan/comparaison-accueil-mobile.jpg) · [éditeur](screenshots/cms-v2/woocommerce/artisan/C-editeur-wordpress.jpg) | [accueil mobile](screenshots/cms-v2/prestashop/artisan/comparaison-accueil-mobile.jpg) | [accueil](screenshots/cms-v2/shopify/artisan/comparaison-accueil-desktop.jpg) |
| High-tech | [accueil](screenshots/cms-v2/woocommerce/hightech/comparaison-accueil-desktop.jpg) | [accueil tablette](screenshots/cms-v2/prestashop/hightech/comparaison-accueil-tablet.jpg) | [produit](screenshots/cms-v2/shopify/hightech/comparaison-produit-desktop.jpg) |
| Restaurant | [page](screenshots/cms-v2/woocommerce/restaurant/comparaison-page-desktop.jpg) | [accueil mobile](screenshots/cms-v2/prestashop/restaurant/comparaison-accueil-mobile.jpg) | [accueil mobile](screenshots/cms-v2/shopify/restaurant/comparaison-accueil-mobile.jpg) |
| SaaS | [accueil tablette](screenshots/cms-v2/woocommerce/saas/comparaison-accueil-tablet.jpg) | [mentions](screenshots/cms-v2/prestashop/saas/comparaison-legal-desktop.jpg) | [accueil](screenshots/cms-v2/shopify/saas/comparaison-accueil-desktop.jpg) |

Toutes les planches : `reports/screenshots/cms-v2/<plateforme>/<projet>/comparaison-<page>-<appareil>.jpg`, avec
`resultat.json` (mesures, verdict, provenance) dans chaque dossier.

Captures retirées du dépôt pour limiter son poids, et reproductibles par le banc :
- captures pleine page séparées ;
- captures A d'écran seul.

Elles figurent déjà dans les planches. Écran d'export du studio : `reports/screenshots/cms-v2/studio/`.

## Défauts constatés et corrections (reprises ciblées, déterministes, 0 €)

| # | Défaut | Où | Cause | Correction (fichiers) | Résultat | Régression |
|---|---|---|---|---|---|---|
| 1 | Déclinaisons importées comme produits séparés | WooCommerce, CSV livré | en-tête entre guillemets après le marqueur UTF-8 | `src/lib/theme/catalog-export.ts` | produit variable + déclinaisons, prix du studio, achetable ; panier OK | tests 941/941 |
| 2 | Lien « Politique de confidentialité » en 404 | WordPress | brouillon « privacy-policy » de WordPress considéré comme existant | `assets/cms/wordpress/es-theme.php` (page créée à côté, adresses mémorisées, rien écrasé) | 0 lien en erreur | idem |
| 3 | Produit introuvable depuis le site si son nom diffère de l'adresse | WooCommerce | recherche par adresse seulement | `assets/cms/wordpress/es-woo.php` (SKU) | liens produit OK | idem |
| 4 | Erreur 500 sur toutes les pages du site (boutique bilingue) | PrestaShop | `$php_self` figé dans le contrôleur du module | `assets/cms/prestashop/esstudio/controllers/front/page.php` | 0 lien en erreur, 5/5 | test dédié |
| 5 | Paragraphes plus petits et gris, titres grisés | PrestaShop | typographie de base de Classic | `assets/cms/prestashop/theme/assets/es-ps.css` | écart de pixels de l'accueil mobile du restaurant : 0,042 → 0,001 | test dédié |
| 6 | Contrastes illisibles (étiquette « New », onglets, quantité, réassurance) | PrestaShop, fiche native | couleurs de Classic sur un site sombre | `es-ps.css` | accessibilité du high-tech : 4 → 9/10 | — |
| 7 | Galerie produit limitée à 512 px, loupe peu lisible | WooCommerce | largeur imposée par le bloc WooCommerce | `assets/cms/wordpress/es-woo.css` | galerie à la largeur de sa colonne | — |
| 8 | Export Shopify en erreur dans l'application compilée | studio (production) | Theme Check empaqueté par Next, configuration introuvable | `next.config.ts`, `src/lib/cms-v2/checks.ts` (jamais « réussi » si indisponible) | export Shopify OK dans le navigateur (11/11) | build OK |
| 9 | Nom de fichier accentué perdu au téléchargement | studio | accents dans le nom | `src/lib/cms-v2/export.ts` (`safeFileName`) | `serum-eclat-shopify-v1.zip` | test dédié |
| 10 | « À compléter dans Shopify » sur WordPress / PrestaShop | contenu | consigne écrite pour Shopify | `src/lib/cms-v2/adapt.ts` | consigne propre à chaque plateforme | test dédié |

Fausses alertes du banc, corrigées dans le banc et non dans le thème :
- apostrophes typographiques de WordPress ;
- tiroir panier et pages simples comptés dans la comparaison ;
- défilement doux de Classic pendant la capture ;
- `themes/core.js` supprimé par une première version du banc ;
- test d'éditeur interrompu par un arrêt manuel.

Défaut d'environnement : les icônes de réassurance enregistrées en « //modules » par l'installation en ligne de
commande.

Coût de toutes les reprises : 0 € (aucun appel d'IA). Le banc complet a été relancé après les corrections. Les
verdicts ci-dessus sont ceux du dernier passage.

## Défauts encore présents

- **Shopify SaaS** : section d'avis vide sur la fiche produit.
  - Elle est signalée par le contrôle visuel, dans A comme dans B.
  - Elle vient de 10A et n'est pas corrigée en 11A : la correction touche le thème Shopify.
- **WooCommerce high-tech** : un contraste insuffisant est signalé sur la loupe de la galerie (« 🔍 »).
  - WooCommerce masque le texte de ce lien : c'est probablement une fausse alerte, **à vérifier**.
  - Ce n'est pas un défaut bloquant ; l'accessibilité reste à 8/10.
- **Fiches produit natives** : composition différente du studio (voir plus haut).

## Performances (mesures locales, pas un hébergement réel)

| Projet | Plateforme | ZIP | CSS | JS | Médias | Fichiers | Génération | Accueil ordinateur (chargement local · poids · requêtes) | Erreurs JS |
|---|---|---|---|---|---|---|---|---|---|
| Sébastien Blanc | Shopify | 376 Ko | 139 Ko | 33 Ko | 0 Ko | 157 | 166 ms | 630 ms · 221 Ko · 7 | 0 |
| Sébastien Blanc | WordPress / WooCommerce | 383 Ko | 148 Ko | 39 Ko | 0 Ko | 94 | 190 ms | 895 ms · 383 Ko · 10 | 0 |
| Sébastien Blanc | PrestaShop | 301 Ko | 151 Ko | 34 Ko | 0 Ko | 33 | 383 ms | 2064 ms · 916 Ko · 36 | 0 |
| Cosmétique premium | Shopify | 492 Ko | 139 Ko | 33 Ko | 145 Ko | 161 | 90 ms | 589 ms · 213 Ko · 10 | 0 |
| Cosmétique premium | WordPress / WooCommerce | 535 Ko | 153 Ko | 39 Ko | 215 Ko | 105 | 125 ms | 921 ms · 624 Ko · 27 | 0 |
| Cosmétique premium | PrestaShop | 434 Ko | 151 Ko | 34 Ko | 187 Ko | 42 | 305 ms | 1833 ms · 1089 Ko · 39 | 0 |
| High-tech | Shopify | 1118 Ko | 139 Ko | 33 Ko | 780 Ko | 167 | 112 ms | 647 ms · 375 Ko · 12 | 0 |
| High-tech | WordPress / WooCommerce | 1773 Ko | 153 Ko | 39 Ko | 1233 Ko | 111 | 305 ms | 808 ms · 1285 Ko · 29 | 0 |
| High-tech | PrestaShop | 1479 Ko | 151 Ko | 34 Ko | 1016 Ko | 48 | 432 ms | 2025 ms · 1639 Ko · 41 | 0 |
| Restaurant | Shopify | 374 Ko | 139 Ko | 33 Ko | 0 Ko | 157 | 76 ms | 588 ms · 178 Ko · 7 | 0 |
| Restaurant | WordPress / WooCommerce | 329 Ko | 148 Ko | 39 Ko | 0 Ko | 94 | 111 ms | 708 ms · 234 Ko · 10 | 0 |
| Restaurant | PrestaShop | 247 Ko | 151 Ko | 34 Ko | 0 Ko | 33 | 320 ms | 1956 ms · 767 Ko · 36 | 0 |
| SaaS | Shopify | 564 Ko | 139 Ko | 33 Ko | 267 Ko | 162 | 121 ms | 616 ms · 104 Ko · 8 | 0 |
| SaaS | WordPress / WooCommerce | 623 Ko | 153 Ko | 39 Ko | 419 Ko | 105 | 130 ms | 891 ms · 317 Ko · 25 | 0 |
| SaaS | PrestaShop | 463 Ko | 150 Ko | 34 Ko | 341 Ko | 40 | 301 ms | 2078 ms · 673 Ko · 37 | 0 |

Ces chiffres sont mesurés en local et non sur un hébergement. Le temps de chargement local de PrestaShop (premier
affichage de l'ordinateur) inclut ses caches Smarty froids. Aucun score Lighthouse n'est donné.

Fiabilité vérifiée par les tests automatisés :
- export reproductible à l'octet près (WordPress, PrestaShop, kits, Shopify) ;
- noms de fichiers sûrs, sans collision ;
- versions conservées (`-v{n}.zip`, jamais écrasées) ;
- projets isolés (médias d'un autre projet = défaut fatal).

## Non vérifié

- **Installations** :
  - Shopify : aucune installation ;
  - aucun hébergement réel ;
  - aucun paiement ni aucune commande passée.
- **Éditeurs et langues** :
  - éditeur de thème Shopify réel ;
  - interface WordPress et paquets de langue PrestaShop en français.
- **Pas de banc pour** :
  - Wix et Squarespace (kits seulement) ;
  - les extensions tierces WordPress (SEO, multilingue).
- **Mesures non faites** :
  - lecteur d'écran ;
  - Safari, Firefox, vraie tablette ;
  - Lighthouse ;
  - référencement réel.
