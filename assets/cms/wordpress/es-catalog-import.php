<?php
/** Import explicite par les API natives WooCommerce. Aucun produit n'est publié par l'import. */
defined('ABSPATH') || exit;
require_once __DIR__ . '/php/es-catalog.php';

function es_woo_catalog_import()
{
    if (!current_user_can('manage_woocommerce') || !function_exists('wc_get_product')) throw new RuntimeException('catalog_permission_denied');
    $c = es_catalog_read(__DIR__ . '/catalogue.json', dirname(__DIR__) . '/assets/es');
    if ($c['business'] === 'services') throw new RuntimeException('catalog_service_not_commerce');
    $source = $c['source']; $maps = get_option('es_catalog_maps', []); $map = $maps[$source] ?? ['products' => [], 'variants' => [], 'media' => [], 'collections' => []];
    // Tout conflit connu est contrôlé avant la première écriture ; pas d'adoption d'un produit étranger par son SKU.
    foreach ($c['products'] as $p) {
        if (strtoupper(get_woocommerce_currency()) !== $p['currency']) throw new RuntimeException('catalog_currency_mismatch: ' . $p['handle']);
        $candidates = [['key' => $p['handle'], 'sku' => $p['sku'], 'kind' => 'products', 'parent' => 0]];
        if ($p['options']) foreach ($p['variants'] as $v) $candidates[] = ['key' => $p['handle'] . ':' . json_encode($v['options']), 'sku' => $v['sku'], 'kind' => 'variants', 'parent' => (int) ($map['products'][$p['handle']] ?? 0)];
        foreach ($candidates as $item) {
            $id = (int) ($map[$item['kind']][$item['key']] ?? 0);
            if ($id && (!wc_get_product($id) || get_post_meta($id, '_es_catalog_owner', true) !== $source || ($item['kind'] === 'variants' && wp_get_post_parent_id($id) !== $item['parent']))) throw new RuntimeException('catalog_mapping_mismatch: ' . $item['key']);
            $existing = wc_get_product_id_by_sku($item['sku']);
            if ($existing && $existing !== $id) throw new RuntimeException('catalog_sku_owned_elsewhere: ' . $item['sku']);
        }
    }
    require_once ABSPATH . 'wp-admin/includes/image.php';
    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';
    $saveMap = function () use (&$maps, &$map, $source) { $maps[$source] = $map; update_option('es_catalog_maps', $maps, false); };
    $media = function ($name) use (&$map, $c, $saveMap) {
        if (!$name) return 0;
        $key = $name . ':' . $c['media'][$name]['sha256']; $id = (int) ($map['media'][$key] ?? 0);
        if ($id && get_post_type($id) === 'attachment') return $id;
        $tmp = wp_tempnam($name); copy(dirname(__DIR__) . '/assets/es/' . $name, $tmp);
        $id = media_handle_sideload(['name' => $name, 'tmp_name' => $tmp], 0);
        if (is_wp_error($id)) { @unlink($tmp); throw new RuntimeException('catalog_media_import: ' . $id->get_error_message()); }
        $map['media'][$key] = (int) $id; $saveMap(); return (int) $id;
    };
    $collections = array_merge([['handle' => '__all', 'title' => es_site()['shopName'], 'description' => '']], $c['collections']);
    foreach ($collections as $collection) {
        $key = $collection['handle']; $id = (int) ($map['collections'][$key] ?? 0);
        if (!$id) {
            $term = wp_insert_term($collection['title'], 'product_cat', ['slug' => 'es-' . substr($source, 0, 8) . '-' . $key, 'description' => wp_kses_post($collection['description'])]);
            if (is_wp_error($term)) throw new RuntimeException('catalog_collection_conflict: ' . $key);
            $id = $map['collections'][$key] = (int) $term['term_id']; $saveMap();
        } else wp_update_term($id, 'product_cat', ['name' => $collection['title'], 'description' => wp_kses_post($collection['description'])]);
    }
    $out = [];
    foreach ($c['products'] as $p) {
        $id = (int) ($map['products'][$p['handle']] ?? 0);
        $product = $id ? wc_get_product($id) : ($p['options'] ? new WC_Product_Variable() : new WC_Product_Simple());
        if (($p['options'] && !$product->is_type('variable')) || (!$p['options'] && !$product->is_type('simple'))) throw new RuntimeException('catalog_type_change_requires_review: ' . $p['handle']);
        if (!$id) $product->set_status('draft');
        $product->set_name($p['title']); $product->set_slug($p['handle']); $product->set_sku($p['sku']);
        $product->set_description(wp_kses_post($p['description_html'])); $product->set_short_description(wp_trim_words(wp_strip_all_tags($p['description_html']), 35));
        $attrs = [];
        $axisKeys = []; $termValues = [];
        foreach ($p['options'] as $i => $label) {
            // Slugs techniques distincts : « Été » et « Ete » restent deux termes, même sous une collation SQL insensible aux accents.
            $axisSlug = 'es_' . substr(hash('sha256', $source . ':' . $i . ':' . $label), 0, 20);
            $aid = (int) ($map['axes'][$axisSlug] ?? 0);
            if (!$aid) {
                if (wc_attribute_taxonomy_id_by_name($axisSlug)) throw new RuntimeException('catalog_axis_owned_elsewhere');
                $aid = wc_create_attribute(['name' => $label, 'slug' => $axisSlug, 'type' => 'select', 'order_by' => 'menu_order', 'has_archives' => false]);
                if (is_wp_error($aid)) throw new RuntimeException('catalog_axis_create: ' . $aid->get_error_message());
                $map['axes'][$axisSlug] = $aid; $saveMap();
            }
            $taxonomy = wc_attribute_taxonomy_name($axisSlug); $axisKeys[$i] = $taxonomy;
            if (!taxonomy_exists($taxonomy)) register_taxonomy($taxonomy, ['product'], ['hierarchical' => false, 'public' => false, 'show_ui' => false]);
            $terms = [];
            foreach (array_values(array_unique(array_column(array_column($p['variants'], 'options'), $i))) as $value) {
                $slug = 'v-' . substr(hash('sha256', $value), 0, 20); $term = get_term_by('slug', $slug, $taxonomy);
                if (!$term) { $r = wp_insert_term($value, $taxonomy, ['slug' => $slug]); if (is_wp_error($r)) throw new RuntimeException('catalog_term_create: ' . $r->get_error_message()); $tid = (int) $r['term_id']; }
                else $tid = (int) $term->term_id;
                $terms[] = $tid; $termValues[$i][$value] = $slug;
            }
            $a = new WC_Product_Attribute(); $a->set_id($aid); $a->set_name($taxonomy); $a->set_options($terms); $a->set_visible(true); $a->set_variation(true); $attrs[] = $a;
        }
        $product->set_attributes($attrs);
        $categories = [$map['collections']['__all']];
        foreach ($c['collections'] as $col) if (in_array($p['handle'], $col['products'], true)) $categories[] = $map['collections'][$col['handle']];
        $product->set_category_ids($categories);
        if ($p['images']) { $images = array_map($media, $p['images']); $product->set_image_id($images[0] ?? 0); $product->set_gallery_image_ids(array_slice($images, 1)); }
        if (!$p['options']) {
            $v = $p['variants'][0] ?? ['price' => null, 'available' => true];
            es_woo_catalog_price_stock($product, $v, $p['price'], $p['compare_at_price']);
        }
        $id = $product->save(); update_post_meta($id, '_es_catalog_owner', $source); update_post_meta($id, '_es_catalog_handle', $p['handle']);
        update_post_meta($id, '_es_catalog_seo', $p['seo']);
        update_post_meta($id, '_es_catalog_vendor', $p['vendor']); wp_set_object_terms($id, $p['tags'], 'product_tag');
        $map['products'][$p['handle']] = $id; $saveMap();
        $keep = [];
        if ($p['options']) foreach ($p['variants'] as $v) {
            $key = $p['handle'] . ':' . json_encode($v['options']); $vid = (int) ($map['variants'][$key] ?? 0);
            $variation = $vid ? wc_get_product($vid) : new WC_Product_Variation();
            $variation->set_parent_id($id); $variation->set_status('publish'); $variation->set_sku($v['sku']);
            $values = []; foreach ($v['options'] as $i => $value) $values[$axisKeys[$i]] = $termValues[$i][$value];
            $variation->set_attributes($values);
            es_woo_catalog_price_stock($variation, $v, $p['price'], $p['compare_at_price']); if (!empty($v['image'])) $variation->set_image_id($media($v['image']));
            $vid = $variation->save(); update_post_meta($vid, '_es_catalog_owner', $source);
            $map['variants'][$key] = $vid; $keep[] = $vid; $saveMap();
        }
        // Anciennes combinaisons conservées, désactivées : jamais vendues avec d'anciens choix, jamais supprimées.
        foreach ($product->get_children() as $old) if (!in_array($old, $keep, true) && get_post_meta($old, '_es_catalog_owner', true) === $source) { $v = wc_get_product($old); $v->set_status('private'); $v->save(); }
        if ($p['options']) WC_Product_Variable::sync($id);
        wc_delete_product_transients($id); $out[] = ['handle' => $p['handle'], 'id' => $id, 'variants' => $keep, 'status' => get_post_status($id)];
    }
    $current = array_column($c['products'], 'handle');
    foreach ($map['products'] as $handle => $id) if (!in_array($handle, $current, true) && get_post_meta($id, '_es_catalog_owner', true) === $source && ($old = wc_get_product($id))) { $old->set_status('draft'); $old->save(); }
    update_option('es_catalog_active_source', $source, false);
    return $out;
}

function es_woo_catalog_price_stock($product, $v, $fallback, $compare = null)
{
    $price = $v['price'] ?? $fallback;
    $sale = $price !== null && $compare !== null && $compare > $price;
    if ($price !== null || !$product->get_id()) { $product->set_regular_price($price === null ? '' : number_format(($sale ? $compare : $price) / 100, 2, '.', '')); $product->set_sale_price($sale ? number_format($price / 100, 2, '.', '') : ''); }
    if (isset($v['inventory_quantity'])) { $product->set_manage_stock(true); $product->set_stock_quantity($v['inventory_quantity']); }
    $quantity = $product->get_manage_stock() ? $product->get_stock_quantity() : null;
    $product->set_stock_status(($v['available'] ?? true) && ($quantity === null || $quantity > 0) ? 'instock' : 'outofstock');
    $product->set_backorders('no');
}

add_action('admin_menu', function () {
    add_management_page('Catalogue E-COM STUDIO', 'Catalogue E-COM STUDIO', 'manage_woocommerce', 'es-catalog', function () {
        echo '<div class="wrap"><h1>Catalogue E-COM STUDIO</h1><p>' . esc_html__('Import explicite des fichiers livrés ; nouveaux produits en brouillon. Les éléments déjà reliés sont mis à jour, sans supprimer les anciennes variantes. Publiez les produits seulement après vérification.', 'es-theme') . '</p>';
        if (isset($_POST['es_catalog_import'])) {
            check_admin_referer('es_catalog_import');
            try { $rows = es_woo_catalog_import(); echo '<p role="status">' . count($rows) . ' ' . esc_html__('produits importés ou mis à jour.', 'es-theme') . '</p>'; }
            catch (Throwable $e) { echo '<p role="alert">' . esc_html($e->getMessage()) . '</p>'; }
        }
        echo '<form method="post">'; wp_nonce_field('es_catalog_import'); submit_button(__('Importer / mettre à jour les brouillons', 'es-theme'), 'primary', 'es_catalog_import'); echo '</form></div>';
    });
});
