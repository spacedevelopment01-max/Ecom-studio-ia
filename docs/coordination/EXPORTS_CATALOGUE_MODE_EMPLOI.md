# Exports et catalogues — installation et reproduction

Cette passe complète la PR #134 sans changer ses thèmes. L’archive générée est installée par le marchand ; aucun envoi automatique vers un CMS n’est ajouté.

## WordPress / WooCommerce

1. Installer WooCommerce, puis téléverser et activer le ZIP du thème dans Apparence › Thèmes. Les pages et menus déjà modifiés dans WordPress sont conservés. Les associations nouvelles sont séparées par projet ; une page préexistante homonyme n’est pas réutilisée comme contenu du projet.
2. Ouvrir **Outils › Catalogue E-COM STUDIO** et déclencher l’import. Le catalogue livré et les fichiers locaux `assets/es/` sont contrôlés, puis traités par les objets natifs WooCommerce. Aucune adresse publique du studio n’est nécessaire.
3. Vérifier les produits en brouillon, leurs prix, taxes, stocks et variantes. Les publier est une action distincte du marchand. Les grilles utilisent les identifiants natifs des produits de la collection choisie, dans l’ordre du studio. Les liens sont recalculés après l’import, même si WordPress a changé une adresse pour éviter une collision.
4. Pour mettre à jour : téléverser le nouveau ZIP, accepter le remplacement du thème puis relancer explicitement l’import. Les produits et combinaisons identifiés gardent leur ID. Un produit retiré passe en brouillon ; une ancienne combinaison devient privée. Les données ne sont pas supprimées. Les prix/photos inconnus du studio gardent les valeurs CMS existantes.

Le CSV `import/produits-woocommerce.csv`, lorsqu’il est présent, est une voie alternative. Il conserve les axes, combinaisons, SKU et stocks connus. Cocher « Mettre à jour les produits existants » lors d’une réimportation CSV. Ne pas cumuler les deux premiers imports du même catalogue : l’import local refuse d’adopter automatiquement un SKU déjà présent sans association de propriété. Les libellés que le CSV natif confond sous une collation insensible aux accents sont refusés dans le CSV ; l’import local utilise des termes natifs à slugs distincts et garde leurs libellés visibles. Une migration de catalogue ancien nécessite une vérification des associations ; elle n’est pas automatique.

Le panier et le paiement restent ceux de WooCommerce. Les remises et cadeaux avancés du studio restent désactivés sans adaptateur commercial serveur vérifié. Le fichier de règles est conservé.

## PrestaShop

1. Téléverser le ZIP dans Apparence › Thème et logo et activer le thème enfant de Classic. Son module compagnon `esstudio` est fourni dans `dependencies/modules/`. Activer les URL simplifiées.
2. Modules › E-COM STUDIO IA › Configurer : déclencher **Importer / mettre à jour le catalogue**. Les objets natifs créent catégories, produits désactivés, axes, déclinaisons, références et associations d’images depuis les fichiers du thème. À la réimportation, les anciennes images gérées par cet import sont détachées de la boutique courante quand elles quittent la galerie ; objets et fichiers restent disponibles pour un retour de version. Les images ajoutées directement dans le CMS sont conservées.
3. Vérifier fiscalité, prix, stocks et produits, puis activer les produits. Une quantité absente n’est jamais remplacée par un stock fictif : un nouvel élément conserve le zéro natif ; un élément existant garde sa quantité. Cela peut empêcher l’achat tant que le stock n’est pas configuré.
4. Une exportation modifiée reçoit un nouveau nom de thème, pour être installée sans supprimer la version précédente. Activer ce nouveau thème, vider le cache, puis relancer explicitement l’import. Les données du thème actif sont utilisées, même si plusieurs thèmes partagent le module. Les produits retirés sont désactivés et les anciennes combinaisons mises hors stock, sans suppression.

Les liens produits/collections passent par la correspondance stable du module. Une cible invalide ne vend jamais le produit principal par repli. Les pages du studio utilisent les gabarits du thème actif. La fiche, les catégories, le panier et la commande restent natifs : leur composition diffère de l’aperçu. Les remises/cadeaux avancés n’ont pas d’adaptateur commercial validé dans cette passe.

## Shopify

Le thème ZIP et le catalogue sont deux imports distincts. Le thème conserve ses sections, réglages, fichiers et le manifeste `assets/es-catalogue.json`. Le CSV de produits conserve jusqu’à trois axes, les combinaisons, SKU, prix, stocks connus, SEO et images de variante. Les anciens intitulés de colonnes restent compatibles selon la documentation officielle actuelle.

Sans adresse publique du studio : extraire les images du ZIP, les téléverser dans Contenu › Fichiers, puis renseigner leurs URL dans un JSON de correspondance `{ "nom-du-fichier.jpg": "https://…" }`. Préparer le CSV sans aucun appel réseau :

```bash
npx tsx scripts/cms-v2/prepare-shopify-csv.ts catalogue.json correspondance-urls.json produits.csv
```

Ce programme refuse un fichier manquant ou une URL non HTTPS et ne se connecte à aucune boutique. Importer ensuite le CSV en brouillon et contrôler chaque produit avant publication. Un prix inconnu reste vide dans les données : Shopify peut attribuer zéro à une cellule vide ; il faut fixer le prix avant toute publication. L’import de stock CSV produit concerne une boutique à emplacement unique ; utiliser l’import natif de stock par emplacement si nécessaire. Changer une combinaison d’options peut recréer son ID natif Shopify : ne pas confondre SKU conservé et garantie de conservation d’un ID Shopify.

Les gabarits propres aux produits restent à affecter selon `assets/es-product-templates.json`. Les collections et leur ordre sont conservés dans `assets/es-catalogue.json` ; un CSV de produits ne recrée pas automatiquement toutes les collections et leurs compositions. Installation et import Shopify réel restent non vérifiés sans boutique autorisée.

## Wix et Squarespace

Les ZIP sont des **kits de reprise**. `catalogue.json` conserve produits, axes, combinaisons, SKU, prix, médias, pages et menus. `configuration-studio.json` conserve les réglages et contenus complets des sections. Les fichiers média et polices sont fournis. Le CSV est à mettre en correspondance avec le modèle actuel de la plateforme ; aucun import natif complet ni reproduction des animations n’est certifié. Un service n’obtient aucun CSV ni produit commercial par défaut.

## Reproduire les vérifications

Le script historique `scripts/cms-v2/env.sh` emploie des noms fixes, redémarre MariaDB sur l’hôte et possède une commande de suppression. **Ne pas l’exécuter tel quel sur un environnement partagé.** Les nouveaux harnais ne créent ou ne réinitialisent aucun CMS partagé.

Préparer deux CMS locaux jetables et une base dédiée : WordPress 6.6.2 + WooCommerce 9.3.3 sous PHP 8.2.25 ; PrestaShop 8.1.7 + Classic sous PHP 8.1.30. Les versions ci-dessus sont celles du banc de cette mission, pas une certification de toute version ultérieure. Le module, les thèmes et les produits sont installés depuis les archives effectivement générées.

Le harnais natif accepte uniquement les conteneurs `esexp-20261018-wp` et `esexp-20261018-ps`, portant le label Docker `ecom.audit=exports-20261018`. Les ports HTTP sont publiés seulement sur `127.0.0.1:18081` / `18082` ; la base PrestaShop est `esexp_ps`, son préfixe `ps_`, l’admin `admin-es`. WordPress comporte un utilisateur de test `demo`. WP-CLI et le module WooCommerce doivent déjà être installés. Les mots de passe locaux se choisissent dans l’environnement jetable, jamais dans un fichier livré au client.

Préparation effectivement utilisée : base MariaDB 10.11 séparée dans `esexp-20261018-db`, réseau Docker propre `esexp-20261018`, base WordPress `esexp_wp`. `wp core install --skip-email`, activation du WooCommerce officiel 9.3.3, `wp option update woocommerce_currency EUR`, `wp rewrite structure '/%postname%/'`, puis `wp eval 'WC_Install::create_pages();'`. PrestaShop : archive de publication officielle 8.1.7 et installateur CLI avec `--domain=localhost:18082 --db_name=esexp_ps --prefix=ps_ --language=en --country=fr --all_languages=0 --newsletter=0 --send_email=0 --ssl=0`. Les autres arguments de connexion désignent uniquement la base jetable.

L’image complète PrestaShop et une première image PHP 8.1 ont dépassé l’espace disponible du pilote Docker `vfs`. Le banc effectif utilise le système de fichiers officiel `wordpress:6.6-php8.1-apache` aplati en une couche, avec manifestes et SHA-256 de couches vérifiés, puis l’archive officielle PrestaShop et `pdo_mysql` compilé. Aucune contrainte PHP de PrestaShop n’a été désactivée. Les paquets de traduction non accessibles ont été remplacés par des ZIP vides servis localement ; le module de catalogue distant `ps_distributionapiclient` a été désactivé dans ce seul banc. Ce sont des limites de l’environnement, pas des corrections apportées aux ZIP.

Exécuter depuis le checkout propre, avec un dossier privé hors Git et sans `DATA_DIR` préconfiguré :

```bash
npx tsx scripts/cms-v2/catalogue-fixtures.ts /chemin/prive/preuves
python scripts/cms-v2/catalogue-native-bench.py /chemin/prive/preuves products
npx tsx scripts/cms-v2/catalogue-browser-proof.ts /chemin/prive/preuves products
python scripts/cms-v2/catalogue-native-bench.py /chemin/prive/preuves services
npx tsx scripts/cms-v2/catalogue-browser-proof.ts /chemin/prive/preuves services
```

Le premier script crée une base temporaire, enregistre/recharge deux projets puis génère dix exports et deux réexportations. Les médias sont des mires synthétiques, jamais les photos privées ORBE/Rive. Le banc natif utilise les importateurs/objets du CMS ; la publication des produits est une action de test séparée, explicitement identifiée. Le CSV de contrôle est distinct du catalogue importé localement, pour ne pas prétendre avoir migré automatiquement une ancienne installation.

WordPress : l’envoi d’e-mails est neutralisé par un mu-plugin du banc ; PrestaShop : `PS_MAIL_METHOD=3`. Le réseau navigateur est limité à la boucle locale. Vérifier ensuite les reçus locaux de contact, les données natives du panier et les rapports produits ; une confirmation affichée ne suffit pas. Aucun paiement n’est exécuté. Les ZIP et captures restent dans le dossier privé ; publier uniquement les résultats techniques et leurs empreintes.

## Documentation officielle consultée

- [Shopify — colonnes, images, limites et écrasement CSV](https://help.shopify.com/en/manual/products/import-export/using-csv)
- [WooCommerce — schéma de l’importateur CSV intégré](https://github.com/woocommerce/woocommerce/wiki/Product-CSV-Import-Schema)
- [PrestaShop 8 — produits et combinaisons](https://devdocs.prestashop-project.org/8/webservice/tutorials/create-product-az/)
- Le code officiel PrestaShop 8.1.7 livré dans l’archive a également été lu pour `Product`, `Combination`, `AttributeGroup`, `Image`, les permissions de module et `ThemeManager`.
