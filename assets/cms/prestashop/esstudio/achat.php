<?php
/**
 * E-COM STUDIO IA — l'achat d'un site monté par SINA dans PrestaShop (chantier « plateformes »).
 *
 * 1. La fiche produit : les pièces d'achat du site (bloc d'achat, tailles et couleurs, lots, packs, barre d'achat qui
 *    reste visible) sont rendues par le module avec le VRAI produit PrestaShop : prix, déclinaisons, stock et
 *    identifiants lus à chaque affichage (objet « product » des gabarits, php/es-fiche.php).
 * 2. Le panier : le script commun du Studio appelle « window.tnBoutique », tenu par boutique-prestashop.js, qui parle au
 *    contrôleur du panier de PrestaShop ; le module rend ensuite le panier tel que PrestaShop le tient (contrôleur
 *    « panier »). Sans script, le bouton d'achat reste un vrai formulaire (contrôleur « ajout »).
 * 3. Les remises RÉELLES de l'offre (offre.json, exporté par le Studio), posées en NATIF : un « prix spécifique » par
 *    quantité pour chaque palier, une « règle de panier » avec produit offert pour chaque cadeau. C'est PrestaShop qui
 *    calcule ; le module ne fait que créer ces règles, les vérifier et les retirer.
 * 4. L'état des remises (contrôleur « offre ») : le Studio le lit pour savoir si les prix de lot peuvent s'afficher.
 */
if (!defined('_PS_VERSION_')) {
    exit;
}

class EsAchat
{
    /** Fichier livré par le thème actif (config/…) de préférence, sinon celui du module. */
    public static function fichier($theme, $module)
    {
        if (defined('_PS_THEME_DIR_') && is_file(_PS_THEME_DIR_ . $theme)) return _PS_THEME_DIR_ . $theme;
        return is_file(__DIR__ . '/' . $module) ? __DIR__ . '/' . $module : null;
    }

    public static function json($theme, $module)
    {
        $f = self::fichier($theme, $module);
        $j = $f ? json_decode((string) @file_get_contents($f), true) : null;
        return is_array($j) ? $j : null;
    }

    /** Correspondances du catalogue importé (adresse du Studio → identifiant PrestaShop). */
    public static function carte()
    {
        $site = EsStudio::site();
        $maps = json_decode((string) Configuration::get('ES_CATALOG_MAPS'), true) ?: [];
        return $maps[$site['catalogSource'] ?? ''] ?? ['products' => [], 'variants' => []];
    }

    public static function idProduit($handle)
    {
        $handle = preg_replace('/[^a-z0-9_-]/i', '', (string) $handle);
        if ($handle === '') return 0;
        $map = self::carte();
        if (!empty($map['products'][$handle])) return (int) $map['products'][$handle];
        if (!empty(EsStudio::site()['catalogSource'])) return 0;
        return (int) Db::getInstance()->getValue('SELECT pl.id_product FROM ' . _DB_PREFIX_ . 'product_lang pl INNER JOIN ' . _DB_PREFIX_ . 'product p ON p.id_product = pl.id_product WHERE p.active = 1 AND pl.link_rewrite = \'' . pSQL($handle) . '\' AND pl.id_shop = ' . (int) Context::getContext()->shop->id);
    }

    public static function adresseDe($idProduct)
    {
        foreach (self::carte()['products'] ?? [] as $handle => $id) if ((int) $id === (int) $idProduct) return (string) $handle;
        $p = new Product((int) $idProduct, false, (int) Context::getContext()->language->id);
        return Validate::isLoadedObject($p) ? (string) $p->link_rewrite : '';
    }

    /** Format de la monnaie de la boutique. */
    public static function argent()
    {
        $c = Context::getContext()->currency;
        $signe = method_exists($c, 'getSign') ? $c->getSign() : $c->sign;
        $anglais = Context::getContext()->language->iso_code === 'en';
        return ['decimales' => (int) $c->precision, 'virgule' => $anglais ? '.' : ',', 'milliers' => $anglais ? ',' : "\u{202f}", 'avant' => $anglais ? $signe : '', 'apres' => $anglais ? '' : "\u{00a0}" . $signe];
    }

    private static function avecTaxes()
    {
        return Product::getTaxCalculationMethod((int) Context::getContext()->cookie->id_customer) != PS_TAX_EXC;
    }

    /** Produit PrestaShop → objet « product » des gabarits (mis en mémoire le temps de la page). */
    public static function fiche($idProduct, $choisie = null)
    {
        static $memo = [];
        $idProduct = (int) $idProduct;
        $cle = $idProduct . ':' . (int) $choisie;
        if (array_key_exists($cle, $memo)) return $memo[$cle];
        $ctx = Context::getContext();
        $lang = (int) $ctx->language->id;
        $p = $idProduct ? new Product($idProduct, false, $lang, (int) $ctx->shop->id) : null;
        if (!$p || !Validate::isLoadedObject($p) || !$p->active) return $memo[$cle] = null;
        $taxes = self::avecTaxes();
        $gere = (bool) Configuration::get('PS_STOCK_MANAGEMENT');
        $reliquat = (bool) Product::isAvailableWhenOutOfStock((int) StockAvailable::outOfStock($idProduct));
        $format = ImageType::getFormattedName('large');
        $images = []; $index = [];
        foreach (Image::getImages($lang, $idProduct) as $im) {
            $index[(int) $im['id_image']] = count($images);
            $images[] = ['src' => $ctx->link->getImageLink($p->link_rewrite, (int) $im['id_image'], $format), 'alt' => (string) $im['legend'], 'cover' => !empty($im['cover'])];
        }
        // La photo de couverture d'abord, comme sur la fiche native.
        usort($images, function ($a, $b) { return (int) $b['cover'] - (int) $a['cover']; });
        $index = [];
        foreach (Image::getImages($lang, $idProduct) as $im) foreach ($images as $i => $x) if ($x['src'] === $ctx->link->getImageLink($p->link_rewrite, (int) $im['id_image'], $format)) $index[(int) $im['id_image']] = $i;
        $version = function ($ipa, array $options) use ($p, $idProduct, $taxes, $gere, $reliquat, $ctx, $lang) {
            $prix = (float) Product::getPriceStatic($idProduct, $taxes, $ipa ?: null, 6);
            $plein = (float) Product::getPriceStatic($idProduct, $taxes, $ipa ?: null, 6, null, false, false);
            $stock = (int) StockAvailable::getQuantityAvailableByProduct($idProduct, $ipa ?: null);
            return [
                'id' => $idProduct . '-' . (int) $ipa, 'options' => $options,
                'centimes' => (int) round($prix * 100), 'barre' => $plein > $prix ? (int) round($plein * 100) : null,
                'dispo' => (bool) $p->available_for_order && (!$gere || $stock > 0 || $reliquat),
                // Stock : seulement si PrestaShop gère les stocks (sinon NULL : aucune quantité ne s'affichera).
                'stock' => $gere ? $stock : null, 'reliquat' => $reliquat,
                'url' => $ctx->link->getProductLink($p, null, null, null, $lang, null, $ipa ?: null),
            ];
        };
        $groupes = []; $combis = [];
        // Dans l'ordre de création des déclinaisons (celui du catalogue du client), pas l'ordre alphabétique.
        $rows = $p->getAttributesGroups($lang) ?: [];
        usort($rows, function ($a, $b) { return ((int) $a['id_product_attribute'] <=> (int) $b['id_product_attribute']) ?: ((int) $a['id_attribute_group'] <=> (int) $b['id_attribute_group']); });
        foreach ($rows as $row) {
            $gid = (int) $row['id_attribute_group']; $ipa = (int) $row['id_product_attribute'];
            if (!isset($groupes[$gid])) $groupes[$gid] = ['nom' => (string) ($row['public_group_name'] ?: $row['group_name']), 'valeurs' => []];
            $groupes[$gid]['valeurs'][(string) $row['attribute_name']] = ['nom' => (string) $row['attribute_name'], 'teinte' => !empty($row['is_color_group']) && !empty($row['attribute_color']) ? (string) $row['attribute_color'] : null];
            $combis[$ipa][$gid] = (string) $row['attribute_name'];
            $combis[$ipa]['_sku'] = (string) ($row['reference'] ?? '');
        }
        $options = []; foreach ($groupes as $g) $options[] = ['nom' => $g['nom'], 'valeurs' => array_values($g['valeurs'])];
        $versions = []; $photos = $combis ? ($p->getCombinationImages($lang) ?: []) : [];
        foreach ($combis as $ipa => $vals) {
            $opts = []; foreach (array_keys($groupes) as $gid) $opts[] = $vals[$gid] ?? '';
            $v = $version((int) $ipa, $opts); $v['sku'] = $vals['_sku'];
            $photo = $photos[$ipa][0]['id_image'] ?? null;
            $v['image'] = $photo !== null && isset($index[(int) $photo]) ? $index[(int) $photo] : null;
            $versions[] = $v;
        }
        if (!$versions) { $v = $version(0, []); $v['sku'] = (string) $p->reference; $v['image'] = null; $versions[] = $v; }
        return $memo[$cle] = es_fiche_objet([
            'id' => $idProduct, 'titre' => (string) $p->name, 'handle' => self::adresseDe($idProduct), 'url' => $ctx->link->getProductLink($p), 'description' => (string) $p->description,
            'images' => $images, 'options' => $options, 'versions' => $versions, 'choisie' => $choisie ? $idProduct . '-' . (int) $choisie : null,
        ]);
    }

    /** Objets des gabarits hors de la page produit (adresses, boutique, accès au catalogue par adresse). */
    public static function globaux($product)
    {
        $ctx = Context::getContext();
        $base = $ctx->link->getBaseLink();
        \EsFilters::$argent = self::argent();
        \EsFilters::$assetBase = $base . 'themes/' . (EsStudio::site()['theme'] ?? _THEME_NAME_) . '/assets/es/';
        return [
            'product' => $product,
            'all_products' => new EsPsProduits(),
            'collections' => new EsPsCollections(),
            'settings' => [],
            'shop' => ['name' => (string) Configuration::get('PS_SHOP_NAME'), 'url' => $base, 'enabled_payment_types' => [], 'money_format' => ''],
            'routes' => ['root_url' => $base, 'cart_url' => $ctx->link->getPageLink('cart', null, null, ['action' => 'show']), 'search_url' => $ctx->link->getPageLink('search'), 'account_url' => $ctx->link->getPageLink('my-account'), 'collections_url' => $base . 'collections', 'all_products_collection_url' => $base . 'collections/all'],
            'cart' => ['item_count' => $ctx->cart ? (int) $ctx->cart->nbProducts() : 0, 'items' => [], 'total_price' => 0],
            'request' => ['page_type' => 'product', 'locale' => ['iso_code' => $ctx->language->iso_code], 'design_mode' => false],
            'customer' => null, 'linklists' => [],
        ];
    }

    /** Dossier des gabarits des pièces (thème actif de préférence, sinon module). */
    private static function gabarits()
    {
        return defined('_PS_THEME_DIR_') && is_dir(_PS_THEME_DIR_ . 'config/es-liquid/sections') ? _PS_THEME_DIR_ . 'config/es-liquid' : __DIR__ . '/liquid';
    }

    /** Des pièces du site, dans l'ordre, rendues avec les vraies données de la boutique. */
    public static function rendrePieces(array $pieces, $product, $page = 'product')
    {
        $dir = self::gabarits();
        if (!$pieces || !is_dir($dir . '/sections')) return '';
        require_once __DIR__ . '/php/es-liquid.php';
        $globaux = self::globaux($product);
        $globaux['request']['page_type'] = $page;
        $en_place = self::etat()['actif'];
        $html = '';
        foreach ($pieces as $piece) {
            $type = preg_replace('/[^a-z0-9_-]/', '', (string) ($piece['type'] ?? ''));
            $id = preg_replace('/[^a-z0-9_-]/i', '', (string) ($piece['id'] ?? $type));
            try {
                $out = es_liquid_render_section($dir, $type, ['id' => $id, 'settings' => [], 'blocks' => []], $globaux);
            } catch (\Throwable $e) {
                continue; // une pièce illisible ne casse jamais la page
            }
            // Pièces d'offre (prix de lot, pack, cadeau) : rendues seulement si PrestaShop tient ces remises.
            $out = es_fiche_garde($out, $en_place);
            if (trim($out) !== '') $html .= '<div id="shopify-section-' . $id . '" class="shopify-section" data-es-type="' . $type . '">' . $out . '</div>';
        }
        return $html;
    }

    /** La fiche produit du site : ses pièces, rendues avec le vrai produit. Vide si le site n'en a pas. */
    public static function rendreFiche($idProduct)
    {
        $plan = self::json('config/es-fiche.json', 'fiche.json');
        if (!$plan) return '';
        require_once __DIR__ . '/php/es-liquid.php';
        $product = self::fiche($idProduct, (int) Tools::getValue('id_product_attribute'));
        if (!$product) return '';
        return self::rendrePieces($plan['propres'][$product['handle']] ?? ($plan['commune'] ?? []), $product);
    }

    /** Une pièce d'une autre page (accueil, page du site) qui lit la boutique : prix, stock, produits, bouton d'achat. */
    public static function rendrePiece($type, $id)
    {
        $plan = self::json('config/es-fiche.json', 'fiche.json');
        $type = (string) $type;
        if (!$plan || !in_array($type, $plan['vivantes'] ?? [], true)) return '';
        return self::rendrePieces([['type' => $type, 'id' => $id]], null, 'index');
    }

    // ---------------------------------------------------------------- le panier, tel que PrestaShop le tient

    public static function panier($cart)
    {
        if (!$cart || !$cart->id) return ['nombre' => 0, 'total' => 0, 'lignes' => []];
        $taxes = self::avecTaxes();
        $presenter = new PrestaShop\PrestaShop\Adapter\Presenter\Cart\CartPresenter();
        $vu = $presenter->present($cart, true);
        $lignes = []; $nombre = 0;
        foreach ($vu['products'] as $p) {
            $cadeau = !empty($p['is_gift']);
            $qte = (int) ($p['quantity'] ?? $p['cart_quantity'] ?? 0);
            $prix = $cadeau ? 0 : (float) ($taxes ? ($p['total_wt'] ?? 0) : ($p['total'] ?? 0));
            if (!$cadeau && !is_numeric($taxes ? ($p['total_wt'] ?? null) : null)) $prix = (float) ($p['price_with_reduction'] ?? 0) * $qte;
            $titre = (string) $p['name'] . (!empty($p['attributes_small']) ? ' · ' . $p['attributes_small'] : '');
            $lignes[] = ['id' => (int) $p['id_product'] . '-' . (int) $p['id_product_attribute'], 'quantite' => $qte, 'titre' => $titre, 'prix' => (int) round($prix * 100), 'cadeau' => $cadeau];
            $nombre += $qte;
        }
        // Total des articles, remises et cadeaux de PrestaShop déduits ; la livraison n'y est pas.
        $total = (float) $cart->getOrderTotal($taxes, Cart::BOTH_WITHOUT_SHIPPING);
        return ['nombre' => $nombre, 'total' => (int) round($total * 100), 'lignes' => $lignes];
    }

    // ---------------------------------------------------------------- les remises réelles de l'offre (natives)

    public static function offre()
    {
        $o = self::json('config/es-offre.json', 'offre.json');
        return $o && !empty($o['produits']) && is_array($o['produits']) ? $o : null;
    }

    /** Déclinaison offerte : celle de la référence donnée, sinon la déclinaison par défaut. [produit, déclinaison] ou null. */
    public static function versionCadeau($handle, $sku)
    {
        $id = self::idProduit($handle);
        $p = $id ? new Product($id) : null;
        if (!$p || !Validate::isLoadedObject($p) || !$p->active) return null;
        if ($sku !== null && $sku !== '') {
            $ipa = (int) Db::getInstance()->getValue('SELECT id_product_attribute FROM ' . _DB_PREFIX_ . 'product_attribute WHERE id_product = ' . (int) $id . " AND reference = '" . pSQL($sku) . "'");
            if ($ipa) return [$id, $ipa];
            if ((string) $p->reference === (string) $sku) return [$id, 0];
            return null;
        }
        return [$id, (int) Product::getDefaultAttribute($id)];
    }

    /** Règles posées par le module (identifiants gardés pour les vérifier, les mettre à jour, les retirer). */
    public static function posees()
    {
        $j = json_decode((string) Configuration::get('ES_OFFRE_REGLES'), true);
        return is_array($j) ? $j + ['empreinte' => '', 'prix' => [], 'regles' => []] : ['empreinte' => '', 'prix' => [], 'regles' => []];
    }

    /** Retire toutes les règles posées par le module (et seulement celles-là). */
    public static function retirer()
    {
        $posees = self::posees();
        foreach ($posees['prix'] as $id) { $sp = new SpecificPrice((int) $id); if (Validate::isLoadedObject($sp)) $sp->delete(); }
        foreach ($posees['regles'] as $id) { $r = new CartRule((int) $id); if (Validate::isLoadedObject($r)) $r->delete(); }
        Configuration::updateValue('ES_OFFRE_REGLES', json_encode(['empreinte' => '', 'prix' => [], 'regles' => []]));
    }

    /**
     * Pose les remises de l'offre dans PrestaShop, en natif. Rien n'est posé à moitié : si un produit ou un cadeau
     * manque, la liste de ce qui manque est rendue et aucune règle n'est créée.
     */
    public static function poser()
    {
        $offre = self::offre();
        if (!$offre) return ['ok' => false, 'manque' => ['aucune offre livrée avec ce thème']];
        $manque = []; $plan = [];
        foreach ($offre['produits'] as $handle => $r) {
            $id = self::idProduit($handle);
            $p = $id ? new Product($id) : null;
            if (!$p || !Validate::isLoadedObject($p)) { $manque[] = 'produit « ' . $handle . ' » introuvable (importez le catalogue)'; continue; }
            $cadeaux = [];
            foreach ($r['cadeaux'] ?? [] as $c) {
                $v = self::versionCadeau($c['handle'], $c['sku'] ?? null);
                if (!$v) { $manque[] = 'cadeau « ' . $c['handle'] . ' » introuvable ou désactivé'; continue; }
                $cadeaux[] = [$c, $v];
            }
            $plan[] = [$id, $r['paliers'] ?? [], $cadeaux];
        }
        if ($manque) return ['ok' => false, 'manque' => $manque];
        self::retirer();
        $shop = (int) Context::getContext()->shop->id;
        $prix = []; $regles = [];
        foreach ($plan as [$id, $paliers, $cadeaux]) {
            foreach ($paliers as $palier) {
                $sp = new SpecificPrice();
                $sp->id_product = $id; $sp->id_product_attribute = 0; $sp->id_shop = $shop; $sp->id_shop_group = 0; $sp->id_currency = 0; $sp->id_country = 0; $sp->id_group = 0; $sp->id_customer = 0; $sp->id_cart = 0; $sp->id_specific_price_rule = 0;
                $sp->price = -1; $sp->from_quantity = (int) $palier['quantite']; $sp->reduction = round(((float) $palier['pourcent']) / 100, 6); $sp->reduction_tax = 1; $sp->reduction_type = 'percentage';
                $sp->from = '0000-00-00 00:00:00'; $sp->to = '0000-00-00 00:00:00';
                if (!$sp->add()) { self::memoriser($offre, $prix, $regles); self::retirer(); return ['ok' => false, 'manque' => ['PrestaShop a refusé un prix par quantité']]; }
                $prix[] = (int) $sp->id;
            }
            foreach ($cadeaux as [$c, $v]) {
                $rule = new CartRule();
                $noms = []; foreach (Language::getLanguages(false) as $l) $noms[(int) $l['id_lang']] = Tools::substr('Cadeau : ' . $c['titre'], 0, 254);
                $rule->name = $noms; $rule->description = 'E-COM STUDIO IA — offre ' . ($offre['empreinte'] ?? '');
                $rule->code = ''; $rule->active = 1; $rule->highlight = 0; $rule->partial_use = 0; $rule->priority = 1;
                $rule->date_from = date('Y-m-d H:i:s', time() - 3600); $rule->date_to = date('Y-m-d H:i:s', strtotime('+10 years'));
                $rule->quantity = 1000000; $rule->quantity_per_user = 1000000;
                $rule->minimum_amount = 0; $rule->minimum_amount_tax = 0; $rule->minimum_amount_currency = (int) Configuration::get('PS_CURRENCY_DEFAULT'); $rule->minimum_amount_shipping = 0;
                $rule->free_shipping = 0; $rule->reduction_percent = 0; $rule->reduction_amount = 0; $rule->reduction_tax = 1; $rule->reduction_currency = (int) Configuration::get('PS_CURRENCY_DEFAULT'); $rule->reduction_product = 0;
                $rule->gift_product = (int) $v[0]; $rule->gift_product_attribute = (int) $v[1];
                $rule->product_restriction = 1;
                if (!$rule->add()) { self::memoriser($offre, $prix, $regles); self::retirer(); return ['ok' => false, 'manque' => ['PrestaShop a refusé une règle de panier']]; }
                $regles[] = (int) $rule->id;
                // Condition : au moins N articles de CE produit dans le panier (toutes déclinaisons confondues).
                $db = Db::getInstance();
                $db->insert('cart_rule_product_rule_group', ['id_cart_rule' => (int) $rule->id, 'quantity' => (int) $c['des']]);
                $groupe = (int) $db->Insert_ID();
                $db->insert('cart_rule_product_rule', ['id_product_rule_group' => $groupe, 'type' => 'products']);
                $regle = (int) $db->Insert_ID();
                $db->insert('cart_rule_product_rule_value', ['id_product_rule' => $regle, 'id_item' => (int) $id]);
            }
        }
        // Les paliers comptent tous les articles du produit, quelle que soit la déclinaison (réglage natif de PrestaShop).
        Configuration::updateValue('PS_QTY_DISCOUNT_ON_COMBINATION', 0);
        Configuration::updateGlobalValue('PS_SPECIFIC_PRICE_FEATURE_ACTIVE', 1);
        Configuration::updateGlobalValue('PS_CART_RULE_FEATURE_ACTIVE', 1);
        self::memoriser($offre, $prix, $regles);
        if (method_exists('SpecificPrice', 'flushCache')) SpecificPrice::flushCache();
        return ['ok' => true, 'manque' => [], 'prix' => count($prix), 'regles' => count($regles)];
    }

    private static function memoriser($offre, array $prix, array $regles)
    {
        Configuration::updateValue('ES_OFFRE_REGLES', json_encode(['empreinte' => (string) ($offre['empreinte'] ?? ''), 'prix' => $prix, 'regles' => $regles]));
    }

    /**
     * Les remises de l'offre sont-elles en place ici ? Relu dans PrestaShop à chaque demande : chaque prix par
     * quantité et chaque règle de panier posés doivent toujours exister, actifs, pour l'offre livrée.
     */
    public static function etat()
    {
        static $etat = null;
        if ($etat !== null) return $etat;
        $offre = self::offre(); $manque = [];
        if (!$offre) return $etat = ['plateforme' => 'prestashop', 'empreinte' => null, 'actif' => false, 'manque' => ['aucune offre dans ce thème']];
        $posees = self::posees();
        $attenduPrix = 0; $attenduRegles = 0;
        foreach ($offre['produits'] as $r) { $attenduPrix += count($r['paliers'] ?? []); $attenduRegles += count($r['cadeaux'] ?? []); }
        if ($posees['empreinte'] !== (string) ($offre['empreinte'] ?? '')) $manque[] = 'les remises de cette offre ne sont pas encore posées (Modules › E-COM STUDIO IA › Configurer)';
        else {
            $prix = 0; foreach ($posees['prix'] as $id) { $sp = new SpecificPrice((int) $id); if (Validate::isLoadedObject($sp) && $sp->reduction_type === 'percentage' && (float) $sp->reduction > 0) $prix++; }
            $regles = 0; foreach ($posees['regles'] as $id) { $r = new CartRule((int) $id); if (Validate::isLoadedObject($r) && $r->active && (int) $r->gift_product > 0 && strtotime($r->date_to) > time()) $regles++; }
            if ($prix !== $attenduPrix) $manque[] = ($attenduPrix - $prix) . ' prix par quantité manquant(s) ou modifié(s)';
            if ($regles !== $attenduRegles) $manque[] = ($attenduRegles - $regles) . ' règle(s) de panier (cadeau) manquante(s) ou désactivée(s)';
            if ($attenduPrix && (int) Configuration::get('PS_QTY_DISCOUNT_ON_COMBINATION') !== 0) $manque[] = 'les remises par quantité sont réglées « par déclinaison » : trois versions différentes ne feraient pas un lot';
            if ($attenduRegles && !Configuration::get('PS_CART_RULE_FEATURE_ACTIVE')) $manque[] = 'les règles de panier sont désactivées';
        }
        return $etat = ['plateforme' => 'prestashop', 'empreinte' => (string) ($offre['empreinte'] ?? ''), 'actif' => !$manque, 'manque' => $manque];
    }
}

/** Accès par adresse (« all_products.mon-produit ») et « collections.all.products », lus seulement à la demande. */
class EsPsProduits
{
    public function field_exists($handle) { return EsAchat::idProduit((string) $handle) > 0; }
    public function get($handle) { return EsAchat::fiche(EsAchat::idProduit((string) $handle)); }
}
class EsPsCollections
{
    public function field_exists($handle) { return true; }
    public function get($handle)
    {
        $produits = [];
        $carte = EsAchat::carte();
        if ((string) $handle === 'all') foreach (array_slice($carte['products'] ?? [], 0, 48, true) as $id) { if ($f = EsAchat::fiche((int) $id)) $produits[] = $f; }
        elseif (!empty($carte['collections'][(string) $handle])) {
            // Une famille du site = une catégorie de PrestaShop (créée à l'import du catalogue).
            $cat = new Category((int) $carte['collections'][(string) $handle], (int) Context::getContext()->language->id);
            foreach ((Validate::isLoadedObject($cat) ? $cat->getProducts((int) Context::getContext()->language->id, 1, 48) : []) ?: [] as $row) if ($f = EsAchat::fiche((int) $row['id_product'])) $produits[] = $f;
        }
        return ['handle' => (string) $handle, 'title' => '', 'url' => Context::getContext()->link->getBaseLink() . 'collections/' . $handle, 'products' => $produits, 'products_count' => count($produits), 'featured_image' => $produits[0]['featured_image'] ?? null];
    }
}

/** Le bouton d'achat des pièces, sans script : un vrai formulaire, traité par le module (contrôleur « ajout »). */
if (!function_exists('es_form_action')) {
    function es_form_action($type)
    {
        return Context::getContext()->link->getModuleLink('esstudio', $type === 'product' ? 'ajout' : 'form');
    }
}
if (!function_exists('es_form_extra')) {
    function es_form_extra($type)
    {
        return '<input type="hidden" name="token" value="' . htmlspecialchars(Tools::getToken(false), ENT_QUOTES) . '">';
    }
}
