<?php
/** Vérification native CLI dans la base jetable esexp_ps ; aucun environnement marchand accepté. */
if(PHP_SAPI!=='cli')exit(1);
define('_PS_ADMIN_DIR_','/var/www/html/admin-es');require '/var/www/html/config/config.inc.php';
if(_DB_NAME_!=='esexp_ps')throw new RuntimeException('Base isolée esexp_ps requise');
$ctx=Context::getContext();$ctx->shop=new Shop(1);Shop::setContext(Shop::CONTEXT_SHOP,1);$ctx->employee=new Employee(1);$ctx->language=new Language((int)Configuration::get('PS_LANG_DEFAULT'));$ctx->currency=new Currency((int)Configuration::get('PS_CURRENCY_DEFAULT'));
require_once _PS_MODULE_DIR_.'esstudio/esstudio.php'; require_once _PS_MODULE_DIR_.'esstudio/catalog-import.php';
$site=EsStudio::site();$c=es_catalog_read(_PS_THEME_DIR_.'config/es-catalogue.json',_PS_ALL_THEMES_DIR_.$site['theme'].'/assets/es');
$check=function($ok,$m){if(!$ok)throw new RuntimeException($m);};$mode=$argv[1]??'verify';
if($mode==='import'){echo json_encode(['import'=>es_ps_catalog_import()]);return;}
$maps=json_decode(Configuration::get('ES_CATALOG_MAPS'),true);$map=$maps[$c['source']];
if($mode==='publish'){foreach($map['products'] as $id){$p=new Product($id);$p->active=1;$p->save();}echo json_encode(['publication'=>'explicit isolated test action']);return;}
$rows=[];
foreach($c['products'] as $p){
 $id=$map['products'][$p['handle']];$product=new Product($id,false,$ctx->language->id);$check($product->name===$p['title'],'Identité produit');$check($product->reference===$p['sku'],'SKU parent');$vars=[];
 if(!$p['options']&&($simplePrice=$p['variants'][0]['price']??$p['price'])!==null)$check((int)round($product->price*100)===$simplePrice,'Prix produit simple');
 foreach($p['options']?$p['variants']:[] as $v){
  $key=$p['handle'].':'.json_encode($v['options']);$vid=$map['variants'][$key];$variation=new Combination($vid);$check((int)$variation->id_product===$id,'Parent incorrect');$check($variation->reference===$v['sku'],'SKU incorrect');
  $price=(int)round(((float)$product->price+(float)$variation->price)*100);$check($price===($v['price']??$p['price']),'Prix variation incorrect');
  $attrs=Db::getInstance()->executeS('SELECT a.id_attribute_group,al.name FROM '._DB_PREFIX_.'product_attribute_combination pac JOIN '._DB_PREFIX_.'attribute a ON a.id_attribute=pac.id_attribute JOIN '._DB_PREFIX_.'attribute_lang al ON al.id_attribute=a.id_attribute AND al.id_lang='.(int)$ctx->language->id.' WHERE pac.id_product_attribute='.(int)$vid.' ORDER BY a.id_attribute_group');
  $check(array_column($attrs,'name')===$v['options'],'Axes / valeurs perdus');
  $stock=StockAvailable::getQuantityAvailableByProduct($id,$vid);if(isset($v['inventory_quantity']))$check((int)$stock===$v['inventory_quantity'],'Stock variation');
  if(!empty($v['image'])){$images=Db::getInstance()->executeS('SELECT id_image FROM '._DB_PREFIX_.'product_attribute_image WHERE id_product_attribute='.(int)$vid);$check(count($images)===1,'Association image absente');$expected=$p['handle'].':'.$v['image'].':'.$c['media'][$v['image']]['sha256'];$check((int)$images[0]['id_image']===$map['media'][$expected],'Mauvaise image variante');}
  $vars[]=['id'=>$vid,'options'=>$v['options'],'sku'=>$v['sku'],'price'=>$price,'stock'=>(int)$stock,'image'=>!empty($v['image'])?(int)$images[0]['id_image']:0];
 }
 $rows[]=['id'=>$id,'handle'=>$p['handle'],'url'=>$ctx->link->getProductLink($product),'active'=>(bool)$product->active,'variants'=>$vars];
}
echo json_encode(['products'=>$rows,'ownedProducts'=>count($map['products']),'ownedVariants'=>count($map['variants']),'ownedImages'=>count($map['media'])]);
