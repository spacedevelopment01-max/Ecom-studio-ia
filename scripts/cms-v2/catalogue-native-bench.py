#!/usr/bin/env python3
"""Banc natif : uniquement les conteneurs jetables explicitement labellisés exports-20261018.
Usage: python scripts/cms-v2/catalogue-native-bench.py /dossier/prive products|services
Préparer les CMS en suivant docs/coordination/EXPORTS_CATALOGUE_MODE_EMPLOI.md.
Aucune réinitialisation automatique, aucun e-mail ni paiement. Ne jamais utiliser un site marchand.
"""
import subprocess, pathlib, json, zipfile, re, sys
D=['env','-u','DOCKER_HOST','-u','DOCKER_CONTEXT','-u','DOCKER_TLS','-u','DOCKER_TLS_VERIFY','-u','DOCKER_CERT_PATH','docker','--host=unix:///var/run/docker.sock']
if len(sys.argv)!=3: raise SystemExit('Dossier privé et mode products|services requis')
root=pathlib.Path(sys.argv[1]).resolve();repo=pathlib.Path.cwd();mode=sys.argv[2]
if not root.is_dir() or repo==root or repo in root.parents or mode not in ['products','services']: raise SystemExit('Dossier privé hors dépôt requis')
def cmd(*args):
 r=subprocess.run(D+list(args),text=True,capture_output=True)
 if r.returncode: print(r.stdout,r.stderr,flush=True);r.check_returncode()
 return r.stdout.strip()
for container in ['esexp-20261018-wp','esexp-20261018-ps']:
 info=json.loads(cmd('inspect',container))[0]
 if info['Config']['Labels'].get('ecom.audit')!='exports-20261018':raise SystemExit('Conteneur non isolé : '+container)

def run_products():
 c='esexp-20261018-wp'
 def wp(*a): return cmd('exec','-u','www-data',c,'wp','--user=demo',*a)
 cmd('cp',str(repo/'scripts/cms-v2/wp-catalogue-proof.php'),c+':/tmp/wp-catalogue-proof.php');cmd('exec',c,'chmod','644','/tmp/wp-catalogue-proof.php')
 # Pas d'e-mail externe, pas de cron réseau sur le banc local.
 cmd('exec',c,'mkdir','-p','/var/www/html/wp-content/mu-plugins')
 p=root/'isolation.php';p.write_text("<?php add_filter('pre_wp_mail','__return_true');")
 cmd('cp',str(p),c+':/var/www/html/wp-content/mu-plugins/es-isolation.php');cmd('exec',c,'chmod','644','/var/www/html/wp-content/mu-plugins/es-isolation.php')
 wp('config','set','DISABLE_WP_CRON','true','--raw')
 checks={}
 for phase in ['products','products-update']:
  archive=root/phase/'woocommerce/export.zip';cmd('cp',str(archive),c+':/tmp/export-catalogue.zip');cmd('exec',c,'chmod','644','/tmp/export-catalogue.zip')
  print(wp('theme','install','/tmp/export-catalogue.zip','--force','--activate'),flush=True)
  if phase=='products':
   csv=root/'produits-woocommerce-controle.csv';cmd('cp',str(csv),c+':/tmp/control.csv');cmd('exec',c,'chmod','644','/tmp/control.csv')
   checks['csv']=wp('eval-file','/tmp/wp-catalogue-proof.php','csv','/tmp/control.csv');print(checks['csv'],flush=True)
   checks['csv-repeat']=wp('eval-file','/tmp/wp-catalogue-proof.php','csv-update','/tmp/control.csv');assert json.loads(checks['csv-repeat'])==json.loads(checks['csv'])
  checks[phase+'-import']=wp('eval-file','/tmp/wp-catalogue-proof.php','import');print(checks[phase+'-import'],flush=True)
  checks[phase+'-verified']=json.loads(wp('eval-file','/tmp/wp-catalogue-proof.php','verify'));print(json.dumps(checks[phase+'-verified'],ensure_ascii=False),flush=True)
  checks[phase+'-repeat']=wp('eval-file','/tmp/wp-catalogue-proof.php','import')
  after=json.loads(wp('eval-file','/tmp/wp-catalogue-proof.php','verify'));assert after==checks[phase+'-verified'],'Répétition modifie les identités ou crée des images'
  if phase=='products':
   assert all(p['status']=='draft' for p in after['products']);wp('eval-file','/tmp/wp-catalogue-proof.php','publish')
  else:
   assert all(p['status']=='publish' for p in after['products']),'Publication existante perdue'
 a=checks['products-verified'];b=checks['products-update-verified']
 assert [p['id'] for p in a['products']]==[p['id'] for p in b['products']]
 assert a['ownedVariants']==b['ownedVariants'] and a['attachmentCount']==b['attachmentCount']
 assert a['products'][0]['variants'][0]['id']==b['products'][0]['variants'][0]['id']
 assert b['products'][0]['variants'][0]['price']=='33.35'
 (root/'woocommerce-native.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
 print('Woo native checks passed',flush=True)

 c='esexp-20261018-ps'
 def php(file,*a):return cmd('exec','-u','www-data','-w','/var/www/html',c,'php','-d','memory_limit=-1',file,*a)
 for name in ['ps-theme.php','ps-catalogue-proof.php']:
  cmd('cp',str(repo/'scripts/cms-v2'/name),c+':/tmp/'+name);cmd('exec',c,'chmod','644','/tmp/'+name)
 cmd('exec','-u','www-data','-w','/var/www/html',c,'php','-r',"require 'config/config.inc.php'; Db::getInstance()->delete('module', \"name='ps_distributionapiclient'\");")
 checks={}
 for phase in ['products','products-update']:
  archive=root/phase/'prestashop/export.zip'
  with zipfile.ZipFile(archive) as z:name=re.search(r'^name: (.+)$',z.read('config/theme.yml').decode(),re.M)[1]
  # Mise à jour explicite depuis le module réellement livré (équivalent dépôt de fichiers / modules).
  # Aucune désinstallation : les associations et reçus restent en base.
  with zipfile.ZipFile(archive) as z:(root/'module-esstudio.zip').write_bytes(z.read('import/module-esstudio.zip'))
  cmd('cp',str(root/'module-esstudio.zip'),c+':/tmp/module-esstudio.zip')
  cmd('exec',c,'unzip','-o','/tmp/module-esstudio.zip','-d','/var/www/html/modules')
  cmd('exec',c,'chown','-R','www-data:www-data','/var/www/html/modules/esstudio')
  cmd('exec','-u','www-data','-w','/var/www/html',c,'php','-r',"define('_PS_ADMIN_DIR_','/var/www/html/admin-es');require 'config/config.inc.php'; if(Module::isInstalled('esstudio')){$m=Module::getInstanceByName('esstudio');if(Module::initUpgradeModule($m)){$r=$m->runUpgradeModule();if(empty($r['success']))throw new Exception('Module upgrade failed');}}")
  cmd('cp',str(archive),c+':/tmp/export-catalogue.zip');cmd('exec',c,'chmod','644','/tmp/export-catalogue.zip')
  exists=subprocess.run(D+['exec',c,'test','-d','/var/www/html/themes/'+name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
  if not exists: print(php('/tmp/ps-theme.php','install','/tmp/export-catalogue.zip'),flush=True)
  else: print('Archive déjà installée dans ce banc : '+name,flush=True)
  print(php('/tmp/ps-theme.php','enable',name),flush=True)
  checks[phase+'-import']=php('/tmp/ps-catalogue-proof.php','import');print(checks[phase+'-import'],flush=True)
  checks[phase+'-verified']=json.loads(php('/tmp/ps-catalogue-proof.php','verify'));print(json.dumps(checks[phase+'-verified'],ensure_ascii=False),flush=True)
  checks[phase+'-repeat']=php('/tmp/ps-catalogue-proof.php','import')
  after=json.loads(php('/tmp/ps-catalogue-proof.php','verify'));assert after==checks[phase+'-verified']
  if phase=='products':
   assert all(not p['active'] for p in after['products']);php('/tmp/ps-catalogue-proof.php','publish')
  else:assert all(p['active'] for p in after['products'])
 a=checks['products-verified'];b=checks['products-update-verified']
 assert [p['id'] for p in a['products']]==[p['id'] for p in b['products']]
 assert a['ownedVariants']==b['ownedVariants'] and a['ownedImages']==b['ownedImages']
 assert a['products'][0]['variants'][0]['id']==b['products'][0]['variants'][0]['id']
 assert b['products'][0]['variants'][0]['price']==3335
 (root/'prestashop-native.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
 print('Presta native checks passed',flush=True)

if mode=='products':run_products()

def run_services():
 c='esexp-20261018-wp'
 def wp(*a):return cmd('exec','-u','www-data',c,'wp','--user=demo',*a)
 before=int(wp('eval','global $wpdb; echo (int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type=\'product\' AND post_status<>\'trash\'");'))
 archive=root/'services/woocommerce/export.zip';cmd('cp',str(archive),c+':/tmp/export-service.zip');cmd('exec',c,'chmod','644','/tmp/export-service.zip')
 wp('theme','install','/tmp/export-service.zip','--force','--activate');wp('plugin','deactivate','woocommerce')
 # Les hooks différés de changement de thème sont exécutés avant la lecture des routes.
 route=wp('eval',"echo wp_json_encode(['woocommerce'=>es_url('/pages/contact')]);")
 routes=json.loads(route);after=int(wp('eval','global $wpdb; echo (int)$wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type=\'product\' AND post_status<>\'trash\'");'));assert before==after
 c='esexp-20261018-ps'
 def php(code):return cmd('exec','-u','www-data','-w','/var/www/html',c,'php','-r',"define('_PS_ADMIN_DIR_','/var/www/html/admin-es');require 'config/config.inc.php';"+code)
 beforeps=int(php("echo Db::getInstance()->getValue('SELECT COUNT(*) FROM '._DB_PREFIX_.'product');"))
 archive=root/'services/prestashop/export.zip'
 with zipfile.ZipFile(archive) as z:name=re.search(r'^name: (.+)$',z.read('config/theme.yml').decode(),re.M)[1]
 cmd('cp',str(archive),c+':/tmp/export-service.zip');cmd('exec',c,'chmod','644','/tmp/export-service.zip')
 exists=subprocess.run(D+['exec',c,'test','-d','/var/www/html/themes/'+name],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode==0
 if not exists:cmd('exec','-u','www-data','-w','/var/www/html',c,'php','/tmp/ps-theme.php','install','/tmp/export-service.zip')
 cmd('exec','-u','www-data','-w','/var/www/html',c,'php','/tmp/ps-theme.php','enable',name)
 afterps=int(php("echo Db::getInstance()->getValue('SELECT COUNT(*) FROM '._DB_PREFIX_.'product');"));assert beforeps==afterps
 routes['prestashop']='http://localhost:18082/pages/contact';(root/'service-routes.json').write_text(json.dumps(routes,indent=2))
 (root/'services-native.json').write_text(json.dumps({'woocommerce':{'before':before,'after':after},'prestashop':{'before':beforeps,'after':afterps},'catalogImport':'not-run-services','externalEmail':'disabled'},indent=2))
 print('Services installed without creating products',flush=True)

if mode=='services':run_services()
