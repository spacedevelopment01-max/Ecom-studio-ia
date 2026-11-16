<?php
/**
 * E-COM STUDIO IA — l'achat d'un site monté par SINA dans WooCommerce (chantier « plateformes »).
 *
 * 1. La fiche produit : les pièces d'achat du site (bloc d'achat, tailles et couleurs, lots, packs, barre d'achat qui
 *    reste visible) sont rendues avec le VRAI produit WooCommerce : prix, déclinaisons, stock et identifiants lus à
 *    chaque affichage (objet « product » des gabarits, voir inc/php/es-fiche.php).
 * 2. Le panier : le script commun du Studio (tenue-achat.js) appelle « window.tnBoutique », tenu ici par
 *    boutique-woocommerce.js (API de la boutique, wc/store/v1). Sans script, le bouton d'achat reste un vrai
 *    formulaire, traité ci-dessous.
 * 3. Les remises RÉELLES de l'offre (inc/offre.json, exporté par le Studio) : remise par quantité sur le produit
 *    (toutes déclinaisons confondues), pack, cadeau offert ajouté quand la condition est remplie et retiré sinon.
 *    Elles sont appliquées ICI, dans le panier de WooCommerce, jamais par le thème dans le navigateur.
 * 4. L'état des remises (« /wp-json/es/v1/offre ») : le Studio le lit pour savoir si les prix de lot peuvent
 *    s'afficher. Une pièce qui montre un prix de lot ou un cadeau n'est pas rendue si les remises ne sont pas en place.
 */
defined('ABSPATH') || exit;

// ---------------------------------------------------------------- 1. le produit réel, pour les gabarits

/** Format de la monnaie de la boutique (réglages de WooCommerce). */
function es_woo_argent() {
	$pos = get_option('woocommerce_currency_pos', 'right_space');
	$sym = html_entity_decode(get_woocommerce_currency_symbol(), ENT_QUOTES, 'UTF-8');
	return [
		'decimales' => wc_get_price_decimals(), 'virgule' => wc_get_price_decimal_separator(), 'milliers' => wc_get_price_thousand_separator(),
		'avant' => $pos === 'left' ? $sym : ($pos === 'left_space' ? $sym . "\u{00a0}" : ''),
		'apres' => $pos === 'right' ? $sym : ($pos === 'right_space' ? "\u{00a0}" . $sym : ''),
	];
}

/** Une version (produit simple ou déclinaison) → ligne neutre de es_fiche_objet. */
function es_woo_version($v, array $options, array $imageIndex) {
	$gere = $v->managing_stock();
	$prix = (float) wc_get_price_to_display($v);
	$regulier = $v->get_regular_price() !== '' ? (float) wc_get_price_to_display($v, ['price' => $v->get_regular_price()]) : $prix;
	return [
		'id' => $v->get_id(), 'options' => $options,
		'centimes' => (int) round($prix * 100), 'barre' => $regulier > $prix ? (int) round($regulier * 100) : null,
		'dispo' => $v->is_purchasable() && $v->is_in_stock(), 'sku' => $v->get_sku(),
		// Stock : seulement si WooCommerce le gère pour cette version (sinon NULL : aucune quantité ne s'affichera).
		'stock' => $gere ? (int) $v->get_stock_quantity() : null, 'reliquat' => $v->backorders_allowed(),
		'image' => $imageIndex[$v->get_image_id()] ?? null, 'url' => $v->get_permalink(),
	];
}

/** Produit WooCommerce → objet « product » des gabarits (mis en mémoire le temps de la page). */
function es_woo_fiche($id) {
	static $memo = [];
	$id = (int) $id;
	if (array_key_exists($id, $memo)) return $memo[$id];
	$p = $id ? wc_get_product($id) : null;
	if (!$p || $p->get_status() !== 'publish') return $memo[$id] = null;
	$images = []; $imageIndex = [];
	foreach (array_filter(array_merge([$p->get_image_id()], $p->get_gallery_image_ids())) as $att) {
		$src = wp_get_attachment_image_url($att, 'large');
		if (!$src || isset($imageIndex[$att])) continue;
		$imageIndex[$att] = count($images);
		$images[] = ['src' => $src, 'alt' => (string) get_post_meta($att, '_wp_attachment_image_alt', true)];
	}
	$options = []; $versions = []; $choisie = null;
	if ($p->is_type('variable')) {
		$axes = $p->get_variation_attributes(); // [nom d'attribut => [valeurs]]
		$libelle = function ($axe, $valeur) {
			if (taxonomy_exists($axe)) { $t = get_term_by('slug', $valeur, $axe); return $t && !is_wp_error($t) ? $t->name : $valeur; }
			return $valeur;
		};
		foreach ($axes as $axe => $valeurs) {
			$vals = [];
			foreach ($valeurs as $valeur) $vals[] = ['nom' => $libelle($axe, $valeur), 'teinte' => null];
			$options[] = ['nom' => wc_attribute_label($axe, $p), 'valeurs' => $vals];
		}
		foreach ($p->get_children() as $vid) {
			$v = wc_get_product($vid);
			if (!$v || $v->get_status() !== 'publish') continue;
			$attrs = $v->get_attributes(); $opts = []; $complet = true;
			foreach (array_keys($axes) as $axe) {
				$val = $attrs[sanitize_title($axe)] ?? ($attrs[$axe] ?? '');
				// Déclinaison « n'importe quelle valeur » : elle ne désigne pas une version précise, elle n'est pas proposée.
				if ($val === '' || $val === null) { $complet = false; break; }
				$opts[] = $libelle($axe, $val);
			}
			if (!$complet) continue;
			// Photo propre à la déclinaison, si elle n'est pas dans la galerie du produit.
			$att = $v->get_image_id();
			if ($att && !isset($imageIndex[$att]) && ($src = wp_get_attachment_image_url($att, 'large'))) { $imageIndex[$att] = count($images); $images[] = ['src' => $src, 'alt' => '']; }
			$versions[] = es_woo_version($v, $opts, $imageIndex);
		}
		$demande = isset($_GET['variant']) ? absint($_GET['variant']) : 0;
		foreach ($versions as $x) if ($demande && (int) $x['id'] === $demande) $choisie = $x['id'];
	} else {
		$versions[] = es_woo_version($p, [], $imageIndex);
	}
	foreach ($versions as &$x) if ($options) $x['url'] = add_query_arg('variant', $x['id'], get_permalink($id));
	unset($x);
	return $memo[$id] = es_fiche_objet([
		'id' => $id, 'titre' => $p->get_name(), 'handle' => $p->get_slug(), 'url' => get_permalink($id), 'description' => wpautop($p->get_description()),
		'images' => $images, 'options' => $options, 'versions' => $versions, 'choisie' => $choisie,
	]);
}

/** Accès par adresse (« all_products.mon-produit ») et « collections.all.products », lus seulement quand un gabarit les demande. */
class EsWooProduits {
	public function field_exists($handle) { return es_woo_product_id((string) $handle) > 0; }
	public function get($handle) { return es_woo_fiche(es_woo_product_id((string) $handle)); }
}
class EsWooCollections {
	private $memo = [];
	public function field_exists($handle) { return true; }
	public function get($handle) {
		$handle = (string) $handle;
		if (isset($this->memo[$handle])) return $this->memo[$handle];
		$handles = es_site()['catalogHandles'] ?? []; $titre = '';
		if ($handle !== 'all') { $handles = []; foreach (es_site()['catalogCollections'] ?? [] as $c) if ($c['handle'] === $handle) { $handles = $c['products']; $titre = $c['title']; } }
		$produits = [];
		foreach (array_slice($handles, 0, 48) as $h) if ($f = es_woo_fiche(es_woo_product_id($h))) $produits[] = $f;
		return $this->memo[$handle] = ['handle' => $handle, 'title' => $titre, 'url' => es_url('/collections/' . $handle), 'products' => $produits, 'products_count' => count($produits), 'featured_image' => $produits[0]['featured_image'] ?? null];
	}
}

add_filter('es_liquid_globals', function ($g) {
	if (!function_exists('wc_get_product')) return $g;
	\EsFilters::$argent = es_woo_argent();
	$g['all_products'] = new EsWooProduits();
	$g['collections'] = new EsWooCollections();
	$g['product'] = is_product() ? es_woo_fiche(get_queried_object_id()) : null;
	$g['shop']['money_format'] = '';
	return $g;
});

/** Pièce propre à une fiche (« handle »), ou commune à toutes les fiches sauf celles-là (« !a,b »). */
add_filter('es_is_product', function ($ok, $rule) {
	if (!is_string($rule) || $rule === '' || $rule[0] !== '!') return $ok;
	if (!function_exists('is_product') || !is_product()) return false;
	$id = (int) get_queried_object_id();
	foreach (array_filter(explode(',', substr($rule, 1))) as $h) if (es_woo_product_id($h) === $id) return false;
	return true;
}, 20, 2);

/** Une pièce d'offre n'est rendue que si les remises sont en place dans cette boutique. */
add_filter('es_section_html', function ($html) { return es_fiche_garde($html, es_offre_etat()['actif']); });

// ---------------------------------------------------------------- 2. le panier

/** Le bouton d'achat des pièces, sans script : un vrai formulaire, traité par WooCommerce. */
add_filter('es_form_action', function ($url, $type) { return $type === 'product' ? add_query_arg('es-ajout', '1', home_url('/')) : $url; }, 10, 2);
add_action('wp_loaded', function () {
	if (empty($_GET['es-ajout']) || ($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || !function_exists('WC') || !WC()->cart) return;
	$id = absint($_POST['id'] ?? 0); $qty = max(1, min(99, absint($_POST['quantity'] ?? 1)));
	$p = $id ? wc_get_product($id) : null;
	$ok = false;
	if ($p && $p->is_type('variation')) $ok = WC()->cart->add_to_cart($p->get_parent_id(), $qty, $id, $p->get_variation_attributes());
	elseif ($p && !$p->is_type('variable')) $ok = WC()->cart->add_to_cart($id, $qty);
	// Ajouté : le panier. Refusé (stock, version à choisir) : retour à la page, avec le message de WooCommerce.
	wp_safe_redirect($ok ? wc_get_cart_url() : (wp_get_referer() ?: home_url('/')));
	exit;
}, 20);

add_action('wp_enqueue_scripts', function () {
	if (!function_exists('WC') || !is_file(get_theme_file_path('assets/js/boutique-woocommerce.js'))) return;
	$ver = es_site()['version'] ?? '1.0.0';
	$etat = es_offre_etat();
	wp_enqueue_script('es-boutique', get_theme_file_uri('assets/js/boutique-woocommerce.js'), [], $ver, true);
	wp_add_inline_script('es-boutique', 'window.tnBoutiqueConfig=' . wp_json_encode([
		'api' => rest_url('wc/store/v1/'), 'jeton' => wp_create_nonce('wc_store_api'), 'panier' => wc_get_cart_url(), 'argent' => es_woo_argent(),
		// L'offre n'est donnée au navigateur que si la boutique la tient vraiment.
		'offre' => $etat['actif'] ? es_offre() : null,
	]) . ';', 'before');
	if (is_file(get_theme_file_path('assets/js/tenue-achat.js'))) wp_enqueue_script('es-tenue-achat', get_theme_file_uri('assets/js/tenue-achat.js'), ['es-boutique'], $ver, true);
}, 20);

// ---------------------------------------------------------------- 3. les remises réelles de l'offre

/** L'offre exportée par le Studio (inc/offre.json), ou null. */
function es_offre() {
	static $o = false;
	if ($o === false) {
		$file = ES_INC . '/offre.json';
		$o = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
		if (!is_array($o) || empty($o['produits']) || !is_array($o['produits'])) $o = null;
	}
	return $o;
}

/** Version d'un produit offert : celle de la référence donnée, sinon la première en stock. [produit, déclinaison, attributs] ou null. */
function es_offre_cadeau_version($handle, $sku) {
	$pid = es_woo_product_id($handle);
	$p = $pid ? wc_get_product($pid) : null;
	if (!$p || $p->get_status() !== 'publish') return null;
	if (!$p->is_type('variable')) return [$pid, 0, []];
	foreach ($p->get_children() as $vid) {
		$v = wc_get_product($vid);
		if (!$v || $v->get_status() !== 'publish' || !$v->is_in_stock()) continue;
		if ($sku !== null && $sku !== '' && $v->get_sku() !== $sku) continue;
		return [$pid, (int) $vid, $v->get_variation_attributes()];
	}
	return null;
}

/**
 * Applique l'offre au panier, à chaque calcul des totaux : la remise du palier atteint sur chaque article du produit
 * (toutes déclinaisons confondues), le cadeau posé quand la condition est remplie et retiré sinon. Les prix partent
 * toujours du prix du catalogue (jamais d'une remise déjà appliquée).
 */
function es_offre_appliquer($cart) {
	static $en_cours = false;
	if ($en_cours || !$cart || (is_admin() && !defined('DOING_AJAX'))) return;
	$offre = es_offre();
	if (!$offre || get_option('es_offre_coupee')) {
		// Offre retirée ou coupée : aucun cadeau ne reste dans le panier.
		foreach ($cart->get_cart() as $key => $item) if (!empty($item['es_cadeau'])) { $en_cours = true; $cart->remove_cart_item($key); $en_cours = false; }
		return;
	}
	$en_cours = true;
	try {
		$quantites = [];
		foreach ($cart->get_cart() as $item) if (empty($item['es_cadeau'])) $quantites[(int) $item['product_id']] = ($quantites[(int) $item['product_id']] ?? 0) + (int) $item['quantity'];
		$remises = []; $voulus = [];
		foreach ($offre['produits'] as $handle => $r) {
			$pid = es_woo_product_id($handle);
			if (!$pid) continue;
			$n = $quantites[$pid] ?? 0; $pct = 0;
			foreach ($r['paliers'] ?? [] as $palier) if ($n >= (int) $palier['quantite']) $pct = max($pct, (float) $palier['pourcent']);
			$remises[$pid] = $pct;
			foreach ($r['cadeaux'] ?? [] as $c) if ($n >= (int) $c['des']) $voulus[$handle . ':' . $c['pack']] = $c;
		}
		// Cadeaux : retirer ceux dont la condition n'est plus remplie, poser ceux qui manquent, tenir leur quantité.
		$presents = [];
		foreach ($cart->get_cart() as $key => $item) {
			if (empty($item['es_cadeau'])) continue;
			$marque = (string) $item['es_cadeau'];
			if (!isset($voulus[$marque]) || isset($presents[$marque])) { $cart->remove_cart_item($key); continue; }
			$presents[$marque] = true;
			if ((int) $item['quantity'] !== (int) $voulus[$marque]['quantite']) $cart->set_quantity($key, (int) $voulus[$marque]['quantite'], false);
		}
		foreach ($voulus as $marque => $c) {
			if (isset($presents[$marque])) continue;
			$v = es_offre_cadeau_version($c['handle'], $c['sku'] ?? null);
			if (!$v) continue; // cadeau introuvable ou épuisé : rien n'est posé (l'état des remises le signale)
			try { $cart->add_to_cart($v[0], (int) $c['quantite'], $v[1], $v[2], ['es_cadeau' => $marque]); } catch (\Throwable $e) { /* refusé par WooCommerce : pas de cadeau */ }
		}
		// Prix : le cadeau à zéro, chaque article d'un produit de l'offre au prix du catalogue moins la remise du palier.
		$dec = wc_get_price_decimals();
		foreach ($cart->get_cart() as $item) {
			if (!empty($item['es_cadeau'])) { $item['data']->set_price(0); continue; }
			$pid = (int) $item['product_id'];
			if (!isset($remises[$pid])) continue;
			$source = wc_get_product(!empty($item['variation_id']) ? (int) $item['variation_id'] : $pid);
			if (!$source) continue;
			$base = (float) $source->get_price();
			$item['data']->set_price($remises[$pid] > 0 ? round($base * (100 - $remises[$pid]) / 100, $dec) : $base);
		}
	} finally { $en_cours = false; }
}
add_action('woocommerce_before_calculate_totals', 'es_offre_appliquer', 20);

/** Remise du palier tenue pour un article du panier (en %), ou 0. */
function es_offre_remise_ligne($item) {
	$offre = es_offre();
	if (!$offre || !empty($item['es_cadeau']) || !function_exists('WC') || !WC()->cart) return 0;
	$n = 0;
	foreach (WC()->cart->get_cart() as $x) if (empty($x['es_cadeau']) && (int) $x['product_id'] === (int) $item['product_id']) $n += (int) $x['quantity'];
	$pct = 0;
	foreach ($offre['produits'] as $handle => $r) if (es_woo_product_id($handle) === (int) $item['product_id']) foreach ($r['paliers'] ?? [] as $palier) if ($n >= (int) $palier['quantite']) $pct = max($pct, (float) $palier['pourcent']);
	return $pct;
}
/** Dans le panier et la commande : la remise et le cadeau sont dits en clair ; un cadeau ne se modifie pas à la main. */
add_filter('woocommerce_get_item_data', function ($data, $item) {
	if (!empty($item['es_cadeau'])) $data[] = ['key' => __('Offre', 'es-theme'), 'value' => __('Cadeau offert', 'es-theme')];
	elseif (($pct = es_offre_remise_ligne($item)) > 0) $data[] = ['key' => __('Offre', 'es-theme'), 'value' => sprintf(__('Remise par quantité : −%s %%', 'es-theme'), rtrim(rtrim(number_format($pct, 2, ',', ''), '0'), ','))];
	return $data;
}, 10, 2);
add_filter('woocommerce_cart_item_quantity', function ($html, $key, $item) { return !empty($item['es_cadeau']) ? (string) (int) $item['quantity'] : $html; }, 10, 3);
add_filter('woocommerce_cart_item_remove_link', function ($html, $key) { $item = WC()->cart ? WC()->cart->get_cart_item($key) : null; return $item && !empty($item['es_cadeau']) ? '' : $html; }, 10, 2);
add_filter('woocommerce_store_api_product_quantity_editable', function ($ok, $product, $item = null) { return is_array($item) && !empty($item['es_cadeau']) ? false : $ok; }, 10, 3);
/** L'API de la boutique dit quelles lignes sont des cadeaux (lu par boutique-woocommerce.js). */
add_action('init', function () {
	// (Un thème se charge après « woocommerce_blocks_loaded » : l'enregistrement se fait à « init ».)
	if (!function_exists('woocommerce_store_api_register_endpoint_data')) return;
	woocommerce_store_api_register_endpoint_data([
		'endpoint' => 'cart-item', 'namespace' => 'es',
		'data_callback' => function ($item) { return ['cadeau' => !empty($item['es_cadeau'])]; },
		'schema_callback' => function () { return ['cadeau' => ['description' => 'Cadeau offert par l\'offre', 'type' => 'boolean', 'context' => ['view', 'edit'], 'readonly' => true]]; },
		'schema_type' => ARRAY_A,
	]);
});

// ---------------------------------------------------------------- 4. l'état des remises

/** Les remises de l'offre sont-elles en place ici ? Empreinte des règles, et ce qui manque. */
function es_offre_etat() {
	static $etat = null;
	if ($etat !== null) return $etat;
	$offre = es_offre(); $manque = [];
	if (!$offre) return $etat = ['empreinte' => null, 'actif' => false, 'manque' => ['aucune offre dans ce thème']];
	if (!function_exists('wc_get_product')) $manque[] = 'WooCommerce n\'est pas activé';
	elseif (get_option('es_offre_coupee')) $manque[] = 'les remises ont été coupées dans cette boutique';
	else foreach ($offre['produits'] as $handle => $r) {
		$pid = es_woo_product_id($handle);
		if (!$pid || get_post_status($pid) !== 'publish') { $manque[] = 'produit « ' . $handle . ' » introuvable ou non publié'; continue; }
		foreach ($r['cadeaux'] ?? [] as $c) if (!es_offre_cadeau_version($c['handle'], $c['sku'] ?? null)) $manque[] = 'cadeau « ' . $c['handle'] . ' » introuvable, non publié ou épuisé';
	}
	return $etat = ['empreinte' => (string) ($offre['empreinte'] ?? ''), 'actif' => !$manque, 'manque' => $manque, 'plateforme' => 'woocommerce'];
}
add_action('rest_api_init', function () {
	register_rest_route('es/v1', '/offre', ['methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => function () { return rest_ensure_response(es_offre_etat()); }]);
});
