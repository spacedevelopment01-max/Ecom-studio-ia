<?php
/**
 * Environnement de test LOCAL : crée (ou remplace) un produit comme le ferait le marchand dans Catalogue › Produits,
 * à partir d'un JSON {handle, name, description, price|null, image|null, options:{name, values[]}|null}.
 * Prix : celui du studio, sans règle de taxe (aucun prix inventé ; sans prix confirmé, le produit n'est pas vendable).
 *   php /tmp/ps-product.php /tmp/product.json
 */
define('_PS_ADMIN_DIR_', '/var/www/html/admin-es');
require '/var/www/html/config/config.inc.php';
$ctx = Context::getContext();
$ctx->employee = new Employee(1);
$d = json_decode(file_get_contents($argv[1]), true);
$lang = (int) Configuration::get('PS_LANG_DEFAULT');
$home = (int) Configuration::get('PS_HOME_CATEGORY');
foreach (Db::getInstance()->executeS('SELECT id_product FROM ' . _DB_PREFIX_ . "product_lang WHERE link_rewrite = '" . pSQL($d['handle']) . "'") as $r) {
    (new Product((int) $r['id_product']))->delete();
}
$p = new Product();
$p->name = [$lang => $d['name']];
$p->link_rewrite = [$lang => $d['handle']];
$p->description = [$lang => $d['description'] ?? ''];
$p->description_short = [$lang => mb_substr(strip_tags($d['description'] ?? ''), 0, 160)];
$p->price = $d['price'] === null ? 0 : (float) $d['price'];
$p->id_tax_rules_group = 0;
$p->available_for_order = $d['price'] !== null;
$p->show_price = $d['price'] !== null;
$p->active = 1;
$p->id_category_default = $home;
$p->add();
$p->addToCategories([$home]);
StockAvailable::setProductOutOfStock($p->id, 1);
StockAvailable::setQuantity($p->id, 0, 50);
if (!empty($d['options']) && !empty($d['options']['values'])) {
    $g = new AttributeGroup();
    $g->name = [$lang => $d['options']['name']];
    $g->public_name = [$lang => $d['options']['name']];
    $g->group_type = 'radio';
    $g->add();
    $first = true;
    foreach ($d['options']['values'] as $v) {
        $a = new ProductAttribute();
        $a->id_attribute_group = $g->id;
        $a->name = [$lang => $v];
        $a->add();
        $idc = $p->addCombinationEntity(0, 0, 0, 0, 0, 50, [], '', 0, '', $first);
        (new Combination($idc))->setAttributes([$a->id]);
        StockAvailable::setQuantity($p->id, $idc, 50);
        $first = false;
    }
}
if (!empty($d['image']) && is_file($d['image'])) {
    $img = new Image();
    $img->id_product = $p->id;
    $img->position = 1;
    $img->cover = 1;
    $img->add();
    $path = $img->getPathForCreation();
    copy($d['image'], $path . '.jpg');
    foreach (ImageType::getImagesTypes('products') as $t) {
        ImageManager::resize($d['image'], $path . '-' . $t['name'] . '.jpg', (int) $t['width'], (int) $t['height']);
    }
}
echo json_encode(['id' => $p->id, 'url' => $ctx->link->getProductLink($p->id)]) . "\n";
