<?php
/**
 * E-COM STUDIO IA — intégration WooCommerce du thème (boutiques seulement ; absente des sites vitrines).
 * Fiche produit, boutique, panier, commande et compte sont ceux de WooCommerce : le thème n'imite aucun panier et
 * ne gère aucun paiement.
 */
defined('ABSPATH') || exit;

add_action('after_setup_theme', function () {
	add_theme_support('woocommerce');
	add_theme_support('wc-product-gallery-zoom');
	add_theme_support('wc-product-gallery-lightbox');
	add_theme_support('wc-product-gallery-slider');
});

/** Produit WooCommerce d'une adresse du studio : même identifiant (SKU du CSV livré) ou même adresse simplifiée. */
function es_woo_product_id($handle) {
	$source = es_site()['catalogSource'] ?? '';
	if ($source) {
		$maps = get_option('es_catalog_maps', []);
		$id = (int) ($maps[$source]['products'][$handle] ?? 0);
		return $id && get_post_meta($id, '_es_catalog_owner', true) === $source ? $id : 0;
	}
	$id = function_exists('wc_get_product_id_by_sku') ? wc_get_product_id_by_sku($handle) : 0;
	if ($id && ($parent = wp_get_post_parent_id($id))) $id = $parent;
	if (!$id && ($post = get_page_by_path($handle, OBJECT, 'product'))) $id = $post->ID;
	return (int) $id;
}

/** Adresses de la boutique d'origine (/products/…, /collections/…, /cart, /account) → pages de WooCommerce. */
add_filter('es_url_route', function ($url, $route, $tail) {
	if (!function_exists('wc_get_page_permalink')) return $url;
	if (preg_match('#^/products/([\w-]+)$#', $route, $m)) {
		$id = es_woo_product_id($m[1]);
		return ($id ? get_permalink($id) . $tail : home_url('/?es_missing_product=' . rawurlencode($m[1])));
	}
	if (preg_match('#^/collections/([\w-]+)$#', $route, $m) && $m[1] !== 'all') {
		$maps = get_option('es_catalog_maps', []); $source = es_site()['catalogSource'] ?? '';
		$id = (int) ($maps[$source]['collections'][$m[1]] ?? 0);
		$link = $id ? get_term_link($id, 'product_cat') : null;
		return $link && !is_wp_error($link) ? $link . $tail : home_url('/?es_missing_collection=' . rawurlencode($m[1]));
	}
	if ($route === '/collections' || $route === '/collections/all') {
		$maps = get_option('es_catalog_maps', []); $source = es_site()['catalogSource'] ?? '';
		$id = (int) ($maps[$source]['collections']['__all'] ?? 0); $link = $id ? get_term_link($id, 'product_cat') : null;
		if ($source) return $link && !is_wp_error($link) ? $link . $tail : home_url('/?es_missing_collection=all');
		return wc_get_page_permalink('shop') . $tail;
	}
	if ($route === '/cart') return wc_get_cart_url();
	if (strpos($route, '/account') === 0) return wc_get_page_permalink('myaccount');
	return $url;
}, 10, 3);

/** Grilles natives Woo : mêmes identifiants et ordre que la collection sélectionnée, jamais le premier catalogue. */
add_action('init', function () {
	add_shortcode('es_product', function ($attrs) { $id = es_woo_product_id((string) ($attrs['handle'] ?? '')); return $id && get_post_status($id) === 'publish' ? do_shortcode('[product_page id="' . $id . '"]') : ''; });
	register_block_type('es/catalog', ['api_version' => 3, 'editor_script' => 'es-editor', 'attributes' => ['sectionId' => ['type' => 'string'], 'originalType' => ['type' => 'string'], 'settings' => ['type' => 'object'], 'onlyFor' => ['type' => 'string']], 'render_callback' => function ($attrs) {
		if (!function_exists('wc_get_product') || (!empty($attrs['onlyFor']) && !apply_filters('es_is_product', false, $attrs['onlyFor']))) return '';
		$s = $attrs['settings'] ?? []; $handle = (string) ($s['collection'] ?? 'all');
		$handles = es_site()['catalogHandles'] ?? []; $title = ''; $found = !$handle || $handle === 'all';
		foreach (es_site()['catalogCollections'] ?? [] as $c) if ($c['handle'] === $handle) { $handles = $c['products']; $title = $c['title']; $found = true; break; }
		if (!$found) $handles = [];
		// Sélection manuelle (section « Sélection de produits ») : ces produits, dans cet ordre.
		$manual = isset($s['handles']) && is_array($s['handles']);
		if ($manual) { $handles = array_map('strval', $s['handles']); $found = true; }
		$ids = array_values(array_filter(array_map('es_woo_product_id', $handles), function ($id) { return get_post_status($id) === 'publish'; }));
		$limit = max(1, min(12, (int) ($s['limit'] ?? 12))); $columns = max(1, min(4, (int) ($s['columns'] ?? 3))); $ids = array_slice($ids, 0, $limit);
		$html = '<div id="shopify-section-' . esc_attr($attrs['sectionId'] ?? 'catalog') . '" data-es-type="' . esc_attr($attrs['originalType'] ?? 'featured-collection') . '" class="es-wc es-section color-' . esc_attr($s['color_scheme'] ?? 'scheme-1') . '" style="--pt:' . max(0, min(200, (int) ($s['padding_top'] ?? 96))) . 'px;--pb:' . max(0, min(200, (int) ($s['padding_bottom'] ?? 96))) . 'px"><div class="es-container">' . (!empty($s['eyebrow']) ? '<p>' . esc_html($s['eyebrow']) . '</p>' : '') . '<h2>' . esc_html($s['heading'] ?? $title) . '</h2>' . wp_kses_post($s['text'] ?? '');
		$html .= $ids ? do_shortcode('[products ids="' . implode(',', $ids) . '" columns="' . $columns . '" orderby="post__in"]') : '<p>' . esc_html__('Aucun produit publié dans cette sélection.', 'es-theme') . '</p>';
		if (!empty($s['button_label']) && !empty($s['button_link'])) $html .= '<a href="' . esc_url(es_url($s['button_link'])) . '">' . esc_html($s['button_label']) . '</a>';
		elseif ($found && !$manual) $html .= '<a href="' . esc_url(es_url('/collections/' . ($handle ?: 'all'))) . '">' . esc_html__('Voir la collection', 'es-theme') . '</a>';
		return $html . '</div></div>';
	}]);
});

add_action('template_redirect', function () {
	if (isset($_GET['es_missing_product']) || isset($_GET['es_missing_collection'])) { status_header(404); nocache_headers(); wp_die(esc_html__('Référence de catalogue introuvable.', 'es-theme'), '', ['response' => 404]); }
});

add_filter('es_cart_count', function ($n) { return (function_exists('WC') && WC()->cart) ? WC()->cart->get_cart_contents_count() : $n; });
/** SEO du produit identifié ; ne jamais emprunter celui d'un autre produit ou d'une autre source. */
function es_woo_product_seo($fallback, $key) {
	if (!function_exists('is_product') || !is_product()) return $fallback;
	$id = get_queried_object_id(); $source = es_site()['catalogSource'] ?? '';
	if (!$source || get_post_meta($id, '_es_catalog_owner', true) !== $source) return $fallback;
	$seo = get_post_meta($id, '_es_catalog_seo', true);
	return is_array($seo) && !empty($seo[$key]) ? wp_strip_all_tags($seo[$key]) : $fallback;
}
add_filter('pre_get_document_title', function ($title) { return es_woo_product_seo($title, 'title'); });
foreach (['wpseo_title', 'rank_math/frontend/title'] as $hook) add_filter($hook, function ($title) { return es_woo_product_seo($title, 'title'); });
foreach (['wpseo_metadesc', 'rank_math/frontend/description'] as $hook) add_filter($hook, function ($description) { return es_woo_product_seo($description, 'description'); });
add_action('wp_head', function () {
	if (defined('WPSEO_VERSION') || defined('RANK_MATH_VERSION')) return;
	$description = es_woo_product_seo('', 'description');
	if ($description !== '') echo '<meta name="description" content="' . esc_attr($description) . '">';
}, 1);
add_filter('es_page_type', function ($t) { return function_exists('is_product') && is_product() ? 'product' : $t; });
add_filter('es_is_product', function ($ok, $handle) { return function_exists('is_product') && is_product() && (int) get_queried_object_id() === es_woo_product_id($handle); }, 10, 2);

/** Compteur du panier de l'en-tête à jour après un ajout en AJAX (fragments WooCommerce). */
add_filter('woocommerce_add_to_cart_fragments', function ($fragments) {
	$n = WC()->cart ? WC()->cart->get_cart_contents_count() : 0;
	$fragments['span.es-cart-count'] = '<span class="es-cart-count" data-cart-count' . ($n ? '' : ' hidden') . '>' . (int) $n . '</span>';
	return $fragments;
});

add_action('wp_enqueue_scripts', function () {
	$ver = es_site()['version'] ?? '1.0.0';
	wp_enqueue_style('es-woo', get_theme_file_uri('assets/css/es-woo.css'), ['es-wp'], $ver);
	$deps = ['wp-data']; if (wp_script_is('wc-blocks-data-store', 'registered')) $deps[] = 'wc-blocks-data-store';
	wp_enqueue_script('es-woo', get_theme_file_uri('assets/js/es-woo.js'), $deps, $ver, true);
});
