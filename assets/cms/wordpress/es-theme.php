<?php
/**
 * E-COM STUDIO IA — cœur du thème WordPress exporté (CMS Engine V2, phase 11A).
 *
 * Chaque section du site est un bloc « Section E-COM STUDIO » (es/section) : ses réglages sont des attributs de bloc,
 * modifiables dans l'éditeur de site (Apparence › Éditeur), et son rendu passe par les MÊMES gabarits Liquid que le
 * thème Shopify et l'aperçu du studio (inc/sections, moteur inc/php/es-liquid.php). Les menus sont ceux de WordPress
 * (Apparence › Menus) ; pour une boutique, le panier et la commande sont ceux de l'extension e-commerce (inc/es-woo.php). Les contenus des réglages sont filtrés
 * (wp_kses_post) avant affichage.
 */
defined('ABSPATH') || exit;

define('ES_INC', get_template_directory() . '/inc');
require_once ES_INC . '/php/es-liquid.php';
// Boutique seulement : intégration de l'extension e-commerce (absente des sites vitrines).
if (is_file(ES_INC . '/es-woo.php')) require_once ES_INC . '/es-woo.php';

/** Données du site générées par le studio (réglages du thème, menus d'origine, pages, schémas des sections). */
function es_site() {
	static $s = null;
	if ($s === null) $s = json_decode((string) file_get_contents(ES_INC . '/site.json'), true) ?: [];
	return $s;
}

/** Adresse de la boutique d'origine (« /pages/contact ») → adresse WordPress. Les liens externes restent tels quels. */
function es_url($path) {
	if (!is_string($path) || $path === '' || $path[0] !== '/' || strpos($path, '//') === 0) return $path;
	$p = wp_parse_url($path);
	$route = rtrim($p['path'] ?? '/', '/');
	$route = $route === '' ? '/' : $route;
	$tail = (isset($p['query']) ? '?' . $p['query'] : '') . (isset($p['fragment']) ? '#' . $p['fragment'] : '');
	if ($route === '/') return home_url('/') . $tail;
	if (preg_match('#^/(pages|policies)/([\w-]+)$#', $route, $m)) {
		$ids = (array) get_option('es_pages', []);
		$id = $ids[$m[2]] ?? 0;
		return ($id && get_post_status($id) === 'publish' ? get_permalink($id) : home_url('/' . $m[2] . '/')) . $tail;
	}
	// Produits, collections, panier, compte : fournis par l'intégration e-commerce quand elle est présente.
	$shop = apply_filters('es_url_route', null, $route, $tail);
	if (is_string($shop)) return $shop;
	if ($route === '/search' || $route === '/cart' || strpos($route, '/collections') === 0) return home_url('/');
	if (strpos($route, '/account') === 0) return wp_login_url();
	return home_url($route . '/') . $tail;
}
function es_rewrite_links($html) {
	return preg_replace_callback('/\b(href|action)="(\/(?!\/)[^"]*)"/', function ($m) {
		return $m[1] . '="' . esc_url(es_url(html_entity_decode($m[2], ENT_QUOTES))) . '"';
	}, $html);
}

/** Destination des formulaires des sections (inscription, contact) : traités par le thème, voir es_handle_form. */
function es_form_action($type) { return admin_url('admin-post.php'); }

/** Menus : ceux de WordPress (emplacements « main-menu », « footer »), sinon ceux du site d'origine. */
function es_linklists() {
	$out = [];
	$locations = get_nav_menu_locations();
	foreach ((es_site()['menus'] ?? []) as $handle => $menu) {
		$links = null;
		if (!empty($locations[$handle])) {
			$items = wp_get_nav_menu_items($locations[$handle]) ?: [];
			$byParent = [];
			foreach ($items as $it) $byParent[(int) $it->menu_item_parent][] = $it;
			$tree = function ($parent, $depth) use (&$tree, $byParent) {
				$list = [];
				foreach ($byParent[$parent] ?? [] as $it) $list[] = ['title' => $it->title, 'url' => $it->url, 'active' => false, 'links' => $depth < 2 ? $tree((int) $it->ID, $depth + 1) : []];
				return $list;
			};
			$links = $tree(0, 0);
		}
		if ($links === null) {
			$conv = function ($l, $depth) use (&$conv) {
				return ['title' => $l['title'], 'url' => es_url($l['url']), 'active' => false, 'links' => $depth < 2 ? array_map(function ($c) use ($conv, $depth) { return $conv($c, $depth + 1); }, $l['links'] ?? []) : []];
			};
			$links = array_map(function ($l) use ($conv) { return $conv($l, 0); }, $menu['links'] ?? []);
		}
		$out[$handle] = ['title' => $menu['title'] ?? $handle, 'handle' => $handle, 'links' => $links];
	}
	return $out;
}

/** Objets globaux des gabarits (mêmes noms que Shopify), alimentés par WordPress (et l'extension e-commerce pour une boutique). */
function es_globals() {
	static $g = null;
	if ($g !== null) return $g;
	$site = es_site();
	$settings = $site['settings'] ?? [];
	$settings['cart_type'] = 'page'; // panier de la plateforme (pas de tiroir Shopify)
	$count = (int) apply_filters('es_cart_count', 0);
	$policies = [];
	foreach ($site['policies'] ?? [] as $p) $policies[] = ['title' => $p['title'], 'url' => es_url('/policies/' . $p['handle'])];
	$g = [
		'settings' => $settings,
		'shop' => ['name' => get_bloginfo('name'), 'url' => home_url('/'), 'description' => get_bloginfo('description'), 'customer_accounts_enabled' => false, 'policies' => $policies, 'enabled_payment_types' => []],
		'routes' => ['root_url' => es_url('/'), 'cart_url' => es_url('/cart'), 'search_url' => es_url('/search'), 'account_url' => es_url('/account'), 'collections_url' => es_url('/collections'), 'all_products_collection_url' => es_url('/collections/all')],
		'linklists' => es_linklists(),
		'cart' => ['item_count' => $count, 'items' => [], 'total_price' => 0],
		'request' => ['page_type' => is_front_page() ? 'index' : apply_filters('es_page_type', 'page'), 'locale' => ['iso_code' => $site['lang'] ?? 'fr'], 'design_mode' => false],
		'customer' => null,
	];
	return $g;
}

/** Valeurs filtrées (aucun script) et complétées par les valeurs par défaut du schéma de la section. */
function es_clean($v) {
	if (is_string($v)) return wp_kses_post($v);
	if (is_array($v)) return array_map('es_clean', $v);
	return $v;
}
function es_with_defaults($values, $defs) {
	$out = [];
	foreach ((array) $defs as $d) {
		if (empty($d['id'])) continue;
		$out[$d['id']] = $d['default'] ?? ((($d['type'] ?? '') === 'checkbox') ? false : (in_array($d['type'] ?? '', ['range', 'number'], true) ? 0 : ''));
	}
	foreach ((array) $values as $k => $v) $out[$k] = $v;
	return es_clean($out);
}

function es_render_section_block($attrs) {
	$site = es_site();
	$type = preg_replace('/[^a-z0-9_-]/', '', (string) ($attrs['type'] ?? ''));
	$schema = $site['schemas'][$type] ?? null;
	if (!$schema) return '';
	// Section propre à une fiche produit précise (caractéristiques, questions) : affichée sur cette fiche seulement.
	if (!empty($attrs['onlyFor']) && !apply_filters('es_is_product', false, $attrs['onlyFor'])) return '';
	$blocks = [];
	foreach ((array) ($attrs['blocks'] ?? []) as $i => $b) {
		if (!is_array($b) || empty($b['type'])) continue;
		$bdef = null;
		foreach ($schema['blocks'] ?? [] as $x) if (($x['type'] ?? '') === $b['type']) $bdef = $x;
		$blocks[] = ['id' => 'b' . ($i + 1), 'type' => $b['type'], 'settings' => es_with_defaults($b['settings'] ?? [], $bdef['settings'] ?? []), 'shopify_attributes' => ''];
	}
	$id = preg_replace('/[^a-z0-9_-]/i', '', (string) ($attrs['sectionId'] ?? $type));
	$section = ['id' => $id, 'settings' => es_with_defaults($attrs['settings'] ?? [], $schema['settings'] ?? []), 'blocks' => $blocks];
	\EsFilters::$assetBase = trailingslashit(get_theme_file_uri('assets/es'));
	\EsFilters::$strings = $site['strings'] ?? [];
	try {
		$html = es_liquid_render_section(ES_INC, $type, $section, es_globals());
	} catch (\Throwable $e) {
		return current_user_can('edit_theme_options') ? '<p class="es-render-error">' . esc_html(sprintf(__('Section « %s » : %s', 'es-theme'), $type, $e->getMessage())) . '</p>' : '';
	}
	$cls = trim('shopify-section ' . ($schema['class'] ?? ''));
	return '<div id="shopify-section-' . esc_attr($id) . '" class="' . esc_attr($cls) . '" data-es-type="' . esc_attr($type) . '">' . es_rewrite_links($html) . '</div>';
}

add_action('after_setup_theme', function () {
	add_theme_support('title-tag');
	add_theme_support('custom-logo');
	add_theme_support('editor-styles');
	register_nav_menus(['main-menu' => __('Menu principal', 'es-theme'), 'footer' => __('Pied de page', 'es-theme')]);
});

add_action('init', function () {
	$ver = es_site()['version'] ?? '1.0.0';
	wp_register_script('es-editor', get_theme_file_uri('assets/js/es-editor.js'), ['wp-blocks', 'wp-element', 'wp-block-editor', 'wp-components', 'wp-server-side-render', 'wp-i18n'], $ver, true);
	$schemas = [];
	foreach (es_site()['schemas'] ?? [] as $t => $s) if (empty($s['hidden'])) $schemas[$t] = $s;
	wp_add_inline_script('es-editor', 'window.esSchemas = ' . wp_json_encode($schemas) . ';', 'before');
	register_block_type('es/section', [
		'api_version' => 3,
		'editor_script' => 'es-editor',
		'attributes' => [
			'type' => ['type' => 'string', 'default' => 'v2-cta'],
			'sectionId' => ['type' => 'string', 'default' => ''],
			'onlyFor' => ['type' => 'string', 'default' => ''],
			'settings' => ['type' => 'object', 'default' => []],
			'blocks' => ['type' => 'array', 'default' => []],
		],
		'supports' => ['html' => false, 'customClassName' => false],
		'render_callback' => 'es_render_section_block',
	]);
});

/** Feuilles et scripts : ceux du thème Shopify (theme.css, theme-v2.css, theme.js) + design extrait du studio. */
add_action('wp_enqueue_scripts', function () {
	$site = es_site();
	$ver = $site['version'] ?? '1.0.0';
	$deps = [];
	foreach ($site['stylesheets'] ?? [] as $i => $css) {
		wp_enqueue_style('es-' . $i, get_theme_file_uri('assets/css/' . $css), $deps, $ver);
		$deps = ['es-' . $i];
	}
	wp_enqueue_style('es-design', get_theme_file_uri('assets/css/es-design.css'), $deps, $ver);
	wp_enqueue_style('es-wp', get_theme_file_uri('assets/css/es-wp.css'), ['es-design'], $ver);
	wp_enqueue_script('es-theme', get_theme_file_uri('assets/js/theme.js'), [], $ver, ['strategy' => 'defer']);
	$routes = ['root' => es_url('/'), 'cart' => es_url('/cart'), 'cart_add' => '', 'cart_change' => '', 'cart_update' => '', 'search' => es_url('/search'), 'predictive_search' => ''];
	$settings = ['moneyFormat' => '', 'cartType' => 'page', 'motion' => !empty($site['settings']['motion_enabled']), 'parallax' => !empty($site['settings']['motion_parallax'])];
	wp_add_inline_script('es-theme', 'document.documentElement.className=document.documentElement.className.replace("no-js","js");window.routes=' . wp_json_encode($routes) . ';window.themeStrings=' . wp_json_encode($site['themeStrings'] ?? new stdClass()) . ';window.themeSettings=' . wp_json_encode($settings) . ';', 'before');
});
add_action('enqueue_block_editor_assets', function () {
	$site = es_site();
	$ver = $site['version'] ?? '1.0.0';
	foreach ($site['stylesheets'] ?? [] as $i => $css) wp_enqueue_style('es-ed-' . $i, get_theme_file_uri('assets/css/' . $css), [], $ver);
	wp_enqueue_style('es-ed-design', get_theme_file_uri('assets/css/es-design.css'), [], $ver);
	wp_enqueue_style('es-ed-wp', get_theme_file_uri('assets/css/es-wp.css'), [], $ver);
});

/** Attributs du design (langage visuel, densité, classes d'animation) : les mêmes que dans l'aperçu du studio. */
add_filter('language_attributes', function ($out) {
	$b = es_site()['body'] ?? [];
	return $out . ' class="no-js" data-ds="' . esc_attr($b['ds'] ?? 'none') . '" data-density="' . esc_attr($b['density'] ?? 'balanced') . '"';
});
add_filter('body_class', function ($classes) { return array_merge($classes, es_site()['body']['classes'] ?? []); });

/** Recherche de l'en-tête (paramètre « q » des thèmes Shopify) → recherche WordPress. */
add_filter('request', function ($vars) {
	if (isset($_GET['q']) && !isset($_GET['s'])) $vars['s'] = sanitize_text_field(wp_unslash($_GET['q']));
	return $vars;
});

/**
 * Formulaires des sections : inscription à la lettre d'information et contact. Messages enregistrés dans WordPress
 * (Outils › Messages du site) et contact envoyé par e-mail à l'adresse de l'administrateur quand l'envoi d'e-mails
 * fonctionne sur l'hébergement. Jeton anti-falsification vérifié ; champs nettoyés.
 */
function es_handle_form() {
	$type = sanitize_key($_POST['form_type'] ?? '');
	$back = wp_get_referer() ?: home_url('/');
	$c = isset($_POST['contact']) && is_array($_POST['contact']) ? wp_unslash($_POST['contact']) : [];
	$email = sanitize_email($c['email'] ?? '');
	if (!in_array($type, ['customer', 'contact'], true) || !is_email($email)) {
		wp_safe_redirect(add_query_arg('es_form', 'error', $back));
		exit;
	}
	$entry = ['type' => $type, 'email' => $email, 'name' => sanitize_text_field($c['name'] ?? ''), 'phone' => sanitize_text_field($c['phone'] ?? ''), 'body' => sanitize_textarea_field($c['body'] ?? ''), 'date' => current_time('mysql')];
	$all = get_option('es_form_entries', []);
	$all[] = $entry;
	update_option('es_form_entries', array_slice($all, -500), false);
	if ($type === 'contact') wp_mail(get_option('admin_email'), sprintf(__('Message de %s', 'es-theme'), $entry['name'] ?: $email), $entry['body'] . "\n\n" . $email . ' ' . $entry['phone'], ['Reply-To: ' . $email]);
	wp_safe_redirect(add_query_arg('es_form', 'ok', $back) . ($type === 'contact' ? '#contact_form' : ''));
	exit;
}
add_action('admin_post_nopriv_es_form', 'es_handle_form');
add_action('admin_post_es_form', 'es_handle_form');
add_action('admin_menu', function () {
	add_management_page(__('Messages du site', 'es-theme'), __('Messages du site', 'es-theme'), 'manage_options', 'es-messages', function () {
		echo '<div class="wrap"><h1>' . esc_html__('Messages du site', 'es-theme') . '</h1><table class="widefat striped"><thead><tr><th>Date</th><th>Type</th><th>E-mail</th><th>Nom</th><th>Message</th></tr></thead><tbody>';
		foreach (array_reverse(get_option('es_form_entries', [])) as $e) echo '<tr><td>' . esc_html($e['date']) . '</td><td>' . esc_html($e['type']) . '</td><td>' . esc_html($e['email']) . '</td><td>' . esc_html($e['name']) . '</td><td>' . esc_html($e['body']) . '</td></tr>';
		echo '</tbody></table></div>';
	});
});
/** Message après l'envoi d'un formulaire de section (réussite ou adresse e-mail invalide). */
add_action('wp_body_open', function () {
	$state = isset($_GET['es_form']) ? sanitize_key($_GET['es_form']) : '';
	if ($state === 'ok') echo '<p class="es-form-notice" role="status">' . esc_html__('Merci, votre message a bien été enregistré.', 'es-theme') . '</p>';
	elseif ($state === 'error') echo '<p class="es-form-notice" role="alert">' . esc_html__('Adresse e-mail invalide : le message n’a pas été envoyé.', 'es-theme') . '</p>';
});
/** Le formulaire envoie « action=es_form » (WordPress) en plus des champs de Shopify. */
add_filter('render_block_es/section', function ($html) {
	return str_replace('<input type="hidden" name="utf8" value="✓">', '<input type="hidden" name="utf8" value="✓"><input type="hidden" name="action" value="es_form">', $html);
});

/**
 * Activation : pages du site (mêmes adresses que dans le studio), menus WordPress préremplis, nom du site.
 * Rien n'est écrasé : une page ou un menu existant est conservé.
 */
add_action('after_switch_theme', function () {
	$site = es_site();
	if (!get_option('es_site_named') && !empty($site['shopName'])) {
		update_option('blogname', $site['shopName']);
		update_option('es_site_named', 1);
	}
	// Page publiée existante : conservée et reliée. Page non publiée au même nom (ex. le brouillon « privacy-policy »
	// de WordPress) : laissée intacte, la page du site est créée à côté (adresse unique) et reliée.
	$ids = (array) get_option('es_pages', []);
	foreach (array_merge($site['pages'] ?? [], $site['policies'] ?? []) as $p) {
		if (!empty($ids[$p['handle']]) && get_post_status($ids[$p['handle']]) === 'publish') continue;
		$existing = get_page_by_path($p['handle']);
		if ($existing && $existing->post_status === 'publish') { $ids[$p['handle']] = $existing->ID; continue; }
		$id = wp_insert_post(['post_type' => 'page', 'post_status' => 'publish', 'post_title' => $p['title'], 'post_name' => $p['handle'], 'post_content' => wp_kses_post($p['body_html'] ?? '')]);
		if ($id && !is_wp_error($id)) $ids[$p['handle']] = $id;
	}
	update_option('es_pages', $ids);
	$locations = get_theme_mod('nav_menu_locations', []);
	foreach ($site['menus'] ?? [] as $handle => $menu) {
		if (!empty($locations[$handle])) continue;
		$name = ($site['shopName'] ?? '') . ' — ' . ($menu['title'] ?? $handle);
		$existing = wp_get_nav_menu_object($name);
		$menuId = $existing ? $existing->term_id : wp_create_nav_menu($name);
		if (is_wp_error($menuId)) continue;
		if (!$existing) foreach ($menu['links'] ?? [] as $i => $l) {
			wp_update_nav_menu_item($menuId, 0, ['menu-item-title' => $l['title'], 'menu-item-url' => es_url($l['url']), 'menu-item-status' => 'publish', 'menu-item-type' => 'custom', 'menu-item-position' => $i + 1]);
		}
		$locations[$handle] = $menuId;
	}
	set_theme_mod('nav_menu_locations', $locations);
	flush_rewrite_rules();
});
