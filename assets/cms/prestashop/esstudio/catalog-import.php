<?php
/** Import explicite dans le catalogue natif PrestaShop. Conserve les identités, ne publie aucun nouveau produit. */
require_once __DIR__ . '/catalog-validation.php';
function es_ps_catalog_import()
{
    $ctx = Context::getContext();
    if (!$ctx->employee || !$ctx->employee->id || !Module::getPermissionStatic((int) Module::getModuleIdByName('esstudio'), 'configure')) throw new RuntimeException('catalog_permission_denied');
    $site = EsStudio::site();
    $mediaDir = _PS_ALL_THEMES_DIR_ . $site['theme'] . '/assets/es';
    $catalogFile = defined('_PS_THEME_DIR_') && is_file(_PS_THEME_DIR_ . 'config/es-catalogue.json') ? _PS_THEME_DIR_ . 'config/es-catalogue.json' : __DIR__ . '/catalogue.json';
    $c = es_catalog_read($catalogFile, $mediaDir);
    if ($c['business'] === 'services') throw new RuntimeException('catalog_service_not_commerce');
    $source = $c['source']; $maps = json_decode((string) Configuration::get('ES_CATALOG_MAPS'), true) ?: [];
    $map = $maps[$source] ?? ['products' => [], 'variants' => [], 'media' => [], 'groups' => [], 'attributes' => [], 'collections' => []];
    $lang = (int) Configuration::get('PS_LANG_DEFAULT'); $home = (int) Configuration::get('PS_HOME_CATEGORY');
    $langs = array_map('intval', array_column(Language::getLanguages(false), 'id_lang'));
    $localized = function ($value) use ($langs) { return array_fill_keys($langs, $value); };
    foreach ($c['products'] as $p) {
        if ($p['currency'] !== $ctx->currency->iso_code) throw new RuntimeException('catalog_currency_mismatch: ' . $p['handle']);
        foreach (array_merge([$p['sku']], array_column($p['variants'], 'sku')) as $sku) if (mb_strlen($sku) > 64) throw new RuntimeException('catalog_reference_too_long');
        $id = (int) ($map['products'][$p['handle']] ?? 0);
        if ($id && !Validate::isLoadedObject(new Product($id))) throw new RuntimeException('catalog_product_mapping_missing');
        foreach (Db::getInstance()->executeS('SELECT id_product FROM ' . _DB_PREFIX_ . "product WHERE reference='" . pSQL($p['sku']) . "'") as $r) if ((int) $r['id_product'] !== $id) throw new RuntimeException('catalog_reference_owned_elsewhere: ' . $p['handle']);
        foreach ($p['options'] ? $p['variants'] : [] as $v) {
            $key = $p['handle'] . ':' . json_encode($v['options']); $vid = (int) ($map['variants'][$key] ?? 0);
            if ($vid && (!Validate::isLoadedObject($existing = new Combination($vid)) || (int) $existing->id_product !== $id)) throw new RuntimeException('catalog_variant_mapping_mismatch');
            foreach (Db::getInstance()->executeS('SELECT id_product_attribute FROM ' . _DB_PREFIX_ . "product_attribute WHERE reference='" . pSQL($v['sku']) . "'") as $r) if ((int) $r['id_product_attribute'] !== $vid) throw new RuntimeException('catalog_variant_reference_owned_elsewhere');
        }
    }
    $saveMap = function () use (&$maps, &$map, $source) { $maps[$source] = $map; Configuration::updateValue('ES_CATALOG_MAPS', json_encode($maps)); };
    $collections = array_merge([['handle' => '__all', 'title' => $site['shopName'], 'description' => '']], $c['collections']);
    foreach ($collections as $col) {
        $id = (int) ($map['collections'][$col['handle']] ?? 0); $cat = $id ? new Category($id) : new Category();
        if ($id && !Validate::isLoadedObject($cat)) throw new RuntimeException('catalog_collection_mapping_missing');
        $cat->name = $localized($col['title']); $cat->link_rewrite = $localized(Tools::link_rewrite($col['handle'])); $cat->description = $localized(Tools::purifyHTML($col['description']));
        $cat->id_parent = $home; $cat->active = true;
        if (!$cat->save()) throw new RuntimeException('catalog_collection_save');
        $map['collections'][$col['handle']] = (int) $cat->id; $saveMap();
    }
    $out = [];
    foreach ($c['products'] as $p) {
        $id = (int) ($map['products'][$p['handle']] ?? 0); $product = $id ? new Product($id) : new Product();
        if (!$id) $product->active = false;
        $product->name = $localized($p['title']); $product->link_rewrite = $localized(Tools::link_rewrite($p['handle']));
        $product->reference = $p['sku']; $product->description = $localized(Tools::purifyHTML($p['description_html']));
        $product->description_short = $localized(mb_substr(strip_tags($p['description_html']), 0, 400));
        $product->meta_title = $localized($p['seo']['title'] ?? $p['title']); $product->meta_description = $localized($p['seo']['description'] ?? '');
        $basePrice = $p['options'] ? $p['price'] : ($p['variants'][0]['price'] ?? $p['price']);
        if ($basePrice !== null || !$id) {
            $product->price = $basePrice === null ? 0 : $basePrice / 100;
            $product->available_for_order = $basePrice !== null; $product->show_price = $basePrice !== null;
        }
        $product->id_category_default = $map['collections']['__all'];
        if (!$product->save()) throw new RuntimeException('catalog_product_save');
        $id = (int) $product->id; $map['products'][$p['handle']] = $id; $saveMap();
        $categories = [$map['collections']['__all']]; foreach ($c['collections'] as $col) if (in_array($p['handle'], $col['products'], true)) $categories[] = $map['collections'][$col['handle']];
        $product->updateCategories($categories);
        StockAvailable::setProductOutOfStock($id, 0, (int) $ctx->shop->id); // jamais de vente hors stock inventée
        $imageIds = [];
        foreach ($p['images'] as $pos => $name) {
            $key = $p['handle'] . ':' . $name . ':' . $c['media'][$name]['sha256']; $iid = (int) ($map['media'][$key] ?? 0);
            if (!$iid || !Validate::isLoadedObject($img = new Image($iid))) {
                $img = new Image(); $img->id_product = $id; $img->position = Image::getHighestPosition($id) + 1; $img->cover = false; $img->legend = $localized($p['title']);
                if (!$img->add()) throw new RuntimeException('catalog_image_add');
                $dest = $img->getPathForCreation();
                if (!ImageManager::resize($mediaDir . '/' . $name, $dest . '.jpg')) throw new RuntimeException('catalog_image_resize');
                foreach (ImageType::getImagesTypes('products') as $type) if (!ImageManager::resize($mediaDir . '/' . $name, $dest . '-' . $type['name'] . '.jpg', (int) $type['width'], (int) $type['height'])) throw new RuntimeException('catalog_image_type');
                $iid = $map['media'][$key] = (int) $img->id; $saveMap();
            }
            if ((int) $img->id_product !== $id) throw new RuntimeException('catalog_image_mapping_mismatch');
            // Réassocier une ancienne version sans recréer le fichier ni son identité.
            if (!$img->associateTo([(int) $ctx->shop->id])) throw new RuntimeException('catalog_image_shop_association');
            $imageIds[$name] = $iid;
        }
        // Retirer de cette boutique les anciennes images de cet import seulement.
        // Les objets/fichiers sont conservés pour un retour de version ; les photos ajoutées dans le CMS restent intactes.
        foreach ($map['media'] as $key => $iid) if (strpos($key, $p['handle'] . ':') === 0 && !in_array((int) $iid, $imageIds, true)) {
            $oldImage = new Image((int) $iid);
            if (Validate::isLoadedObject($oldImage) && (int) $oldImage->id_product === $id) {
                if (!Db::getInstance()->delete('image_shop', 'id_image=' . (int) $iid . ' AND id_product=' . $id . ' AND id_shop=' . (int) $ctx->shop->id)) throw new RuntimeException('catalog_image_shop_detach');
            }
        }
        if ($imageIds) { Image::deleteCover($id); $cover = new Image(reset($imageIds)); $cover->cover = true; $cover->save(); }
        $keep = []; $product->deleteDefaultAttributes();
        foreach ($p['options'] ? $p['variants'] : [] as $vi => $v) {
            $attrIds = [];
            foreach ($p['options'] as $axis => $label) {
                $gkey = json_encode([$axis, $label]); $gid = (int) ($map['groups'][$gkey] ?? 0);
                if (!$gid) { $g = new AttributeGroup(); $g->name = $localized($label); $g->public_name = $localized($label); $g->group_type = 'select'; if (!$g->add()) throw new RuntimeException('catalog_axis_add'); $gid = $map['groups'][$gkey] = (int) $g->id; $saveMap(); }
                $akey = json_encode([$gid, $v['options'][$axis]]); $aid = (int) ($map['attributes'][$akey] ?? 0);
                if (!$aid) { $a = new ProductAttribute(); $a->id_attribute_group = $gid; $a->name = $localized($v['options'][$axis]); if (!$a->add()) throw new RuntimeException('catalog_attribute_add'); $aid = $map['attributes'][$akey] = (int) $a->id; $saveMap(); }
                $attrIds[] = $aid;
            }
            $key = $p['handle'] . ':' . json_encode($v['options']); $vid = (int) ($map['variants'][$key] ?? 0);
            $variation = $vid ? new Combination($vid) : new Combination(); $variation->id_product = $id; $variation->reference = $v['sku'];
            if (($v['price'] ?? $p['price']) !== null || !$vid) $variation->price = (($v['price'] ?? $p['price'] ?? 0) - (int)round($product->price * 100)) / 100;
            $variation->default_on = $vi === 0 ? 1 : null; $variation->minimal_quantity = 1;
            if (!$variation->save()) throw new RuntimeException('catalog_variant_save');
            $vid = (int) $variation->id; $variation->setAttributes($attrIds);
            if (!empty($v['image']) && isset($imageIds[$v['image']])) $variation->setImages([$imageIds[$v['image']]]);
            if (!$v['available'] || isset($v['inventory_quantity'])) StockAvailable::setQuantity($id, $vid, $v['available'] ? $v['inventory_quantity'] : 0);
            $map['variants'][$key] = $vid; $keep[] = $vid; $saveMap();
        }
        foreach ($map['variants'] as $key => $vid) if (strpos($key, $p['handle'] . ':') === 0 && !in_array($vid, $keep, true)) StockAvailable::setQuantity($id, $vid, 0);
        if (!$p['options']) {
            $v = $p['variants'][0] ?? ['available' => true];
            if (!$v['available'] || isset($v['inventory_quantity'])) StockAvailable::setQuantity($id, 0, $v['available'] ? $v['inventory_quantity'] : 0);
        } else Product::updateDefaultAttribute($id);
        $out[] = ['handle' => $p['handle'], 'id' => $id, 'variants' => $keep, 'active' => (bool) $product->active];
    }
    $current = array_column($c['products'], 'handle');
    foreach ($map['products'] as $handle => $id) if (!in_array($handle, $current, true)) { $old = new Product((int)$id); if (Validate::isLoadedObject($old)) { $old->active = false; $old->save(); } }
    return $out;
}
