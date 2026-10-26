# Exports natifs et connexions aux boutiques — mission #190 (points 5 et 6)

Ce document dit, pour chaque plateforme, **ce que le studio livre**, **ce qui a été installé et vérifié** sur une
boutique de test, et **ce qu'il reste à faire à la main**. Les résultats chiffrés sont dans `docs/VALIDATION-190.md`.

## Quatre choses distinctes

| | Shopify | WordPress / WooCommerce | PrestaShop |
|---|---|---|---|
| **1. Installation du thème** | ZIP de thème Online Store 2.0 (Boutique en ligne › Thèmes › Ajouter) ou envoi direct « non publié » par l'application du studio | ZIP de thème de blocs (Apparence › Thèmes › Téléverser) | ZIP de thème enfant de Classic + module compagnon `esstudio` (Apparence › Thème et logo › Importer) |
| **2. Produits et médias** | envoi par l'API Admin (`productSet`) depuis l'onglet **Catalogue** ; ou CSV `Produits › Importer` | envoi par l'API REST WooCommerce depuis l'onglet **Catalogue** ; ou import local livré dans le thème (Outils › Catalogue E-COM STUDIO) ; ou CSV | envoi par le webservice depuis l'onglet **Catalogue** ; ou import par le module (Modules › E-COM STUDIO IA › Configurer) |
| **3. Association des modèles** | `templateSuffix` envoyé par l'API (mise en page propre à un produit) ; le CSV ne l'associe pas (manifeste `templates-produits.json`) | une seule fiche produit (blocs natifs WooCommerce) : les mises en page propres à un produit ne sont pas reprises (avertissement dans l'export) | une seule fiche produit : idem |
| **4. Modules / extensions** | aucun | WooCommerce requis | module `esstudio` installé avec le thème (pages du site, formulaires, import du catalogue) |

## Versions vérifiées

| Plateforme | Version de la boutique de test | Remarques |
|---|---|---|
| Shopify | **aucune boutique de test disponible** | Theme Check officiel (`@shopify/theme-check-node`) : 0 erreur sur les 15 ZIP. Envoi des produits vérifié seulement par requêtes simulées (`tests/produits-studio-190.test.ts`). |
| WordPress | 6.5.5 (version minimale demandée par le thème : 6.5) | Installation hors ligne : WordPress 6.5.5 tiré du paquet npm `@wp-playground/wordpress-builds` 0.9.19, complété des fichiers statiques de 6.4.3 (1 689 fichiers, 33 absents non essentiels). L'éditeur de site ne s'ouvre pas dans cet assemblage (script 6.4 avec WordPress 6.5) : la modification des sections a été vérifiée par l'API des modèles, celle qu'utilise l'éditeur pour enregistrer. |
| WooCommerce | 8.9.3 | Paiement de test : « paiement à la livraison » (aucun paiement réel). |
| PHP | 8.3.6 | |
| PrestaShop | 8.1.7 (thème Classic, 19 produits de démonstration) | Module `ps_distributionapiclient` (catalogue de modules en ligne) neutralisé : il plante hors ligne au changement de thème. Paiement de test : virement (`ps_wirepayment`), aucun paiement réel. |

## Connexion d'une boutique (onglet Catalogue)

- **WooCommerce** : adresse `https://…` + clé client et secret (WooCommerce › Réglages › Avancé › API REST, droits
  lecture/écriture). Les photos sont téléchargées par WooCommerce depuis l'adresse publique HTTPS du studio : sans
  elle, elles ne sont pas envoyées et le rapport le dit.
- **PrestaShop** : adresse `https://…` + clé du webservice (Paramètres avancés › Webservice) avec les droits sur
  products, combinations, stock_availables, categories, images, product_options, product_option_values. Photos
  envoyées directement. Prix barré non transmis (réduction à créer dans PrestaShop, le rapport le dit). Prix envoyé
  sans règle de taxe (le prix saisi au studio est le prix affiché).
- **Shopify** : boutique reliée dans « Connexions » (autorisation Shopify du studio) ou jeton d'une application
  personnalisée (`write_products`, `write_inventory`, `read_locations`).
- Les accès sont essayés avant d'être enregistrés, chiffrés, et ne sont plus jamais affichés. Adresse publique HTTPS
  exigée (anti-SSRF) ; une boutique locale n'est acceptée qu'avec `STORE_CONNECT_ALLOW_LOCAL=1`, hors production.

## Règles de synchronisation

- Correspondances conservées (table `product_links`) : un produit déjà envoyé est **mis à jour**, jamais recréé. Sans
  correspondance, un produit de la boutique de même identifiant ou de même référence est **relié** au lieu d'être
  dupliqué.
- Stock à trois points, calculé à chaque envoi : une vente ou une modification faite dans la boutique depuis le dernier
  envoi est reprise ; si le studio a aussi changé (réassort), les deux s'additionnent (stock de la boutique + changement
  du studio). Garanties et limites réelles (contre-vérification #195, texte montré dans l'onglet Catalogue) :
  - Shopify reçoit un ajustement relatif : une vente simultanée reste déduite.
  - WooCommerce et PrestaShop n'acceptent qu'une quantité : elle est relue juste avant l'écriture, mais une vente faite
    pendant l'écriture elle-même peut ne pas être déduite ; le rapport le signale.
  - Envoi sans réponse sûre : jamais rejoué ; à l'envoi suivant, le stock de la boutique est repris et le rapport
    demande de vérifier le réassort s'il diffère de la quantité visée.
  - Une seule synchronisation à la fois par projet et par boutique.
- Contenu (nom, description, prix, options, catégories) : le studio est la source ; il n'est renvoyé que s'il a changé.
  Photos renvoyées seulement si elles ont changé.
- Import des produits existants : créés dans le studio et reliés ; jamais importés deux fois.

## Étapes manuelles qui restent au marchand

- **WooCommerce** : régler paiements, livraison et taxes ; publier les produits importés par l'import local (créés en
  brouillon) ; les produits envoyés par l'onglet Catalogue gardent l'état choisi au studio.
- **PrestaShop** : activer les URL simplifiées (Paramètres › Trafic et SEO) ; vérifier taxes et **stocks** (sans
  quantité connue, PrestaShop met 0 : le bouton d'achat reste grisé) ; activer les produits importés par le module.
- **Shopify** : choisir le modèle de fiche des produits importés par CSV (le CSV ne l'associe pas) ; publier le thème.
- **Rendez-vous** (ATELIER NUANCE, PARENTHÈSE, TABLE SAISON) : le studio doit avoir une adresse publique HTTPS ;
  activer « service réel » dans la rubrique Rendez-vous, puis exporter.

## Défauts trouvés à l'installation et corrigés (mission #190)

1. SILLON, TABLE SAISON, ATELIER NUANCE, PARENTHÈSE, PHASE s'affichaient **sans leur feuille de style** dans WordPress
   et PrestaShop (feuille appelée par une section, non livrée). Corrigé (`src/lib/cms-v2/design.ts`).
2. Scripts appelés par une section introuvables dans WordPress (erreurs JavaScript). Corrigé.
3. Polices du thème vides dans le moteur PHP de WordPress (PHASE : pied de page plus large que le téléphone). Corrigé.
4. Grille de produits WooCommerce plus large que le téléphone (8 px). Corrigé (`assets/cms/wordpress/es-woo.css`).
5. Panier HEUREN plus large que le téléphone (« Supprimer » coupé) ; liens d'étapes APLAT sans cible. Corrigés.

Outils pour refaire ces contrôles : `scripts/exports-190.ts`, `scripts/check-installed-190.ts`,
`scripts/theme-check-exports-190.ts`, `scripts/wp-editor-check-190.ts`, `scripts/crawl-demos-190.ts`,
`scripts/rdv-export-190.ts`, et l'essai réel des connecteurs `tests/produits-boutiques-e2e-190.test.ts`.
