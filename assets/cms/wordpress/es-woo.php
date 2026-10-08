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
		return ($id ? get_permalink($id) : wc_get_page_permalink('shop')) . $tail;
	}
	if (strpos($route, '/collections') === 0) return wc_get_page_permalink('shop') . $tail;
	if ($route === '/cart') return wc_get_cart_url();
	if (strpos($route, '/account') === 0) return wc_get_page_permalink('myaccount');
	return $url;
}, 10, 3);

add_filter('es_cart_count', function ($n) { return (function_exists('WC') && WC()->cart) ? WC()->cart->get_cart_contents_count() : $n; });
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
});
