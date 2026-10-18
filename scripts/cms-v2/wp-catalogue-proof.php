<?php
/** Banc natif local : wp eval-file ... import|verify|publish|csv. Ne jamais lancer sur un site client. */
if (!defined('WP_CLI') || !WP_CLI || !in_array(parse_url(home_url(), PHP_URL_HOST), ['localhost', '127.0.0.1'], true)) throw new RuntimeException('Banc local uniquement');
$mode = $args[0] ?? 'verify';
$check = function ($ok, $message) { if (!$ok) throw new RuntimeException($message); };
if ($mode === 'csv' || $mode === 'csv-update') {
 require_once WP_PLUGIN_DIR . '/woocommerce/includes/import/class-wc-product-csv-importer.php';
 require_once WP_PLUGIN_DIR . '/woocommerce/includes/admin/importers/class-wc-product-csv-importer-controller.php';
 $csv=$args[1]; $raw=(new WC_Product_CSV_Importer($csv,['lines'=>1,'parse'=>false]))->get_raw_keys();
 $auto=new ReflectionMethod('WC_Product_CSV_Importer_Controller','auto_map_columns'); $auto->setAccessible(true);
 $mapped=$auto->invoke(new WC_Product_CSV_Importer_Controller(),$raw);
 $importer=new WC_Product_CSV_Importer($csv,['parse'=>true,'update_existing'=>$mode==='csv-update','mapping'=>['from'=>array_values($raw),'to'=>array_values($mapped)]]);
 $r=$importer->import(); $check(!count($r['failed'])&&!count($r['skipped']),'CSV erreurs : '.wp_json_encode($r));
 $p=wc_get_product(wc_get_product_id_by_sku('csv-serum-eclat')); $check($p&&$p->is_type('variable'),'CSV parent variable absent');
 $check(count($p->get_attributes())===3,'CSV axes perdus'); $check(count($p->get_children())===3,'CSV combinaisons perdues');
 $v=wc_get_product(wc_get_product_id_by_sku('CSV-LAMPE-ÉTÉ-S')); $check($v&&$v->get_parent_id()===$p->get_id(),'CSV relation SKU-parent');
 $check($v->get_price()==='32.10'&&$v->get_stock_quantity()===7,'CSV prix/stock');
 echo wp_json_encode(['csv'=>'native importer passed','parent'=>$p->get_id(),'axes'=>3,'children'=>3,'price'=>$v->get_price(),'stock'=>$v->get_stock_quantity()]); return;
}
$c=es_catalog_read(get_template_directory().'/inc/catalogue.json',get_template_directory().'/assets/es');
if($mode==='import') echo wp_json_encode(['import'=>es_woo_catalog_import()]);
elseif($mode==='publish') {
 foreach($c['products'] as $p){$id=es_woo_product_id($p['handle']);$product=wc_get_product($id);$product->set_status('publish');$product->save();}
 echo wp_json_encode(['publication'=>'explicit isolated test action']);
} else {
 $maps=get_option('es_catalog_maps',[]);$map=$maps[$c['source']];$rows=[];
 foreach($c['products'] as $p){
  $id=es_woo_product_id($p['handle']);$product=wc_get_product($id);$check($product&&$product->get_name()===$p['title'],'Identité produit');
  $check($product->get_sku()===$p['sku'],'SKU parent'); $check(count($product->get_attributes())===count($p['options']),'Attributs parent');
  if(!$p['options']&&($simplePrice=$p['variants'][0]['price']??$p['price'])!==null)$check($product->get_price()===number_format($simplePrice/100,2,'.',''),'Prix produit simple');
  $variants=[];
  foreach($p['options']?$p['variants']:[] as $v){
   $key=$p['handle'].':'.json_encode($v['options']);$vid=$map['variants'][$key];$variation=wc_get_product($vid);
   $check($variation->get_parent_id()===$id,'Parent incorrect');$check($variation->get_sku()===$v['sku'],'SKU variation');
   $check($variation->get_price()===number_format(($v['price']??$p['price'])/100,2,'.',''),'Prix variation');
   $labels=[];foreach($variation->get_attributes() as $taxonomy=>$slug){$term=get_term_by('slug',$slug,$taxonomy);$labels[]=$term?$term->name:$slug;}
   $check($labels===$v['options'],'Valeurs variation altérées');
   if(isset($v['inventory_quantity']))$check($variation->get_stock_quantity()===$v['inventory_quantity'],'Stock variation');
   if(!empty($v['image']))$check(hash_file('sha256',get_attached_file($variation->get_image_id()))===$c['media'][$v['image']]['sha256'],'Mauvaise photo de variante');
   $variants[]=['id'=>$vid,'options'=>$v['options'],'sku'=>$variation->get_sku(),'price'=>$variation->get_price(),'stock'=>$variation->get_stock_quantity(),'image'=>$variation->get_image_id()];
  }
  $rows[]=['id'=>$id,'handle'=>$p['handle'],'url'=>get_permalink($id),'status'=>$product->get_status(),'variants'=>$variants];
 }
 echo wp_json_encode(['products'=>$rows,'attachmentCount'=>(int)wp_count_posts('attachment')->inherit,'ownedProducts'=>count($map['products']),'ownedVariants'=>count($map['variants'])]);
}
