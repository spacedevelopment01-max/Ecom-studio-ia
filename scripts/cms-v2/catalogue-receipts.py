#!/usr/bin/env python3
"""Contrôles en lecture seule des reçus et paniers natifs du banc isolé, sans afficher de session."""
import json, pathlib, subprocess, sys
root=pathlib.Path(sys.argv[1]).resolve()
D=['env','-u','DOCKER_HOST','-u','DOCKER_CONTEXT','-u','DOCKER_TLS','-u','DOCKER_TLS_VERIFY','-u','DOCKER_CERT_PATH','docker','--host=unix:///var/run/docker.sock']
def run(*a):return subprocess.check_output(D+list(a),text=True).strip()
for c in ['esexp-20261018-wp','esexp-20261018-ps']:
 assert json.loads(run('inspect',c))[0]['Config']['Labels'].get('ecom.audit')=='exports-20261018'
wpProduct=json.loads((root/'woocommerce-native.json').read_text())['products-update-verified']['products'][0]['id']
wp=run('exec','-u','www-data','esexp-20261018-wp','wp','--user=demo','eval',"global $wpdb; $entries=array_filter(get_option('es_form_entries',[]),function($e){return $e['type']==='contact' && strpos($e['email'],'cms-woocommerce-')===0 && strpos($e['body'],'Demande locale')!==false;});$quantities=[];foreach($wpdb->get_col(\"SELECT session_value FROM {$wpdb->prefix}woocommerce_sessions\") as $s){$s=maybe_unserialize($s);foreach(maybe_unserialize($s['cart']??[]) as $row)if(($row['product_id']??0)==="+str(wpProduct)+")$quantities[]=(int)$row['quantity'];}sort($quantities);echo wp_json_encode(['contactReceipts'=>count($entries),'nativeCartQuantities'=>$quantities]);")
wp=json.loads(wp);assert wp['contactReceipts']>=2,wp;assert wp['nativeCartQuantities'].count(2)>=2,wp
native=json.loads((root/'prestashop-native.json').read_text());product=native['products-update-verified']['products'][0]['id'];variant=native['products-update-verified']['products'][0]['variants'][0]['id']
code="require 'config/config.inc.php';if(_DB_NAME_!=='esexp_ps')throw new Exception('Wrong DB');$entries=array_filter(json_decode(Configuration::get('ES_FORM_ENTRIES'),true)?:[],function($e){return $e['type']==='contact' && strpos($e['email'],'cms-prestashop-')===0 && strpos($e['body'],'Demande locale')!==false;});$q=Db::getInstance()->executeS('SELECT quantity FROM '._DB_PREFIX_.'cart_product WHERE id_product="+str(product)+" AND id_product_attribute="+str(variant)+"');echo json_encode(['contactReceipts'=>count($entries),'nativeCartQuantities'=>array_map('intval',array_column($q,'quantity')),'emailMethod'=>(int)Configuration::get('PS_MAIL_METHOD')]);"
ps=json.loads(run('exec','-u','www-data','-w','/var/www/html','esexp-20261018-ps','php','-r',code));assert ps['contactReceipts']>=2,ps;assert ps['nativeCartQuantities'].count(2)>=2,ps;assert ps['emailMethod']==3
result={'woocommerce':wp,'prestashop':ps,'payment':'not-run','externalEmail':'disabled','method':'read-only native database state after browser submission'}
(root/'native-receipts.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
