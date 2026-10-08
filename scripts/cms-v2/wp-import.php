<?php
/**
 * Environnement de test LOCAL (wp eval-file) : importe le CSV produits livré avec le thème (import/produits-woocommerce.csv)
 * avec l'importateur de WooCommerce — comme Produits › Importer —, puis fait ce que le mode d'emploi demande au
 * marchand : photos depuis le dossier assets/es du thème, vérification, publication.
 *   wp eval-file /tmp/wp-import.php <csv> <dossier-medias> <image1,image2…>
 */
[$csv, $dir, $images] = array_slice($args, 0, 3);
require_once WP_PLUGIN_DIR . '/woocommerce/includes/import/class-wc-product-csv-importer.php';
require_once WP_PLUGIN_DIR . '/woocommerce/includes/admin/importers/class-wc-product-csv-importer-controller.php';
// Correspondance des colonnes : celle que l'écran d'import de WooCommerce propose automatiquement.
$raw = (new WC_Product_CSV_Importer($csv, ['lines' => 1, 'parse' => false]))->get_raw_keys();
$auto = new ReflectionMethod('WC_Product_CSV_Importer_Controller', 'auto_map_columns');
$auto->setAccessible(true);
$mapped = $auto->invoke(new WC_Product_CSV_Importer_Controller(), $raw);
$importer = new WC_Product_CSV_Importer($csv, ['parse' => true, 'update_existing' => false, 'delimiter' => ',', 'mapping' => ['from' => array_values($raw), 'to' => array_values($mapped)]]);
$res = $importer->import();
$ids = array_map(function ($x) { return is_array($x) ? $x['id'] : $x; }, array_merge($res['imported'], $res['updated']));
require_once ABSPATH . 'wp-admin/includes/image.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
$att = [];
foreach (array_filter(explode(',', $images)) as $f) {
	$tmp = wp_tempnam($f);
	copy("$dir/$f", $tmp);
	$id = media_handle_sideload(['name' => $f, 'tmp_name' => $tmp], 0);
	if (!is_wp_error($id)) $att[] = $id;
}
$out = [];
foreach ($ids as $id) {
	$p = wc_get_product($id);
	if (!$p || $p->get_parent_id()) continue;
	if ($att) { $p->set_image_id($att[0]); $p->set_gallery_image_ids(array_slice($att, 1)); }
	$p->set_status('publish');
	$p->save();
	// Déclinaisons importées en brouillon (« Published » = 0) : activées avec le produit.
	foreach ($p->get_children() as $cid) {
		$v = wc_get_product($cid);
		if ($v && $v->is_type('variation')) { $v->set_status('publish'); $v->save(); }
	}
	if ($p->is_type('variable')) { WC_Product_Variable::sync($id); $p = wc_get_product($id); }
	$out[] = ['id' => $id, 'slug' => $p->get_slug(), 'type' => $p->get_type(), 'price' => $p->get_price(), 'purchasable' => $p->is_purchasable(), 'url' => get_permalink($id)];
}
echo wp_json_encode(['errors' => count($res['failed']) + count($res['skipped']), 'products' => $out]) . "\n";
