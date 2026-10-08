#!/bin/sh
# Environnement LOCAL et ISOLÉ de test des exports CMS (phase 11A) — jamais une boutique réelle, aucun paiement.
#   sh scripts/cms-v2/env.sh up     → MariaDB (hôte) + WordPress 6.6 / WooCommerce 9.3.3 (port 8081) + PrestaShop 8.1.7 (port 8082)
#   sh scripts/cms-v2/env.sh down   → supprime les conteneurs et les bases de test
# Puis : DATA_DIR=<base de démonstration> npx tsx scripts/cms-v2-bench.ts
#
# Adaptations propres à l'environnement de test (sans effet sur les thèmes exportés) :
#  - MariaDB installée sur l'hôte (le registre Docker limitait les téléchargements) ;
#  - WooCommerce et WP-CLI téléchargés depuis leurs publications GitHub officielles (wordpress.org inaccessible ici) ;
#  - PrestaShop : icônes du module blockreassurance corrigées en base (« //modules » écrit par l'installation en ligne
#    de commande) ;
#  - PrestaShop : les paquets de langue (i18n.prestashop-project.org inaccessible) sont remplacés par des paquets VIDES
#    servis localement (port 8099), installation en anglais ; le module ps_distributionapiclient (catalogue en ligne
#    d'Addons, inaccessible ici) est retiré car il bloque l'activation d'un thème hors ligne.
# Identifiants : uniquement locaux et jetables (ES_DB_PASS, ES_ADMIN_PASS) ; aucun secret du studio n'est utilisé.
set -e
CMD=${1:-up}
WORK=${WORK:-/tmp/cms-v2-env}
DB_PASS=${ES_DB_PASS:-es-local-test}
ADMIN_PASS=${ES_ADMIN_PASS:-es-admin-local1}
WOO_VERSION=9.3.3
mkdir -p "$WORK"

if [ "$CMD" = "down" ]; then
  docker rm -f wp-es ps-es >/dev/null 2>&1 || true
  mysql -uroot -e "DROP DATABASE IF EXISTS wp_es; DROP DATABASE IF EXISTS ps_es;" || true
  pkill -f "http.server 8099" || true
  exit 0
fi

# 1. Base de données (hôte).
command -v mysqld >/dev/null || (apt-get update -qq && apt-get install -y -qq --no-install-recommends mariadb-server)
sed -i 's/^bind-address\s*=.*/bind-address = 0.0.0.0/' /etc/mysql/mariadb.conf.d/50-server.cnf 2>/dev/null || true
service mariadb restart >/dev/null
mysql -uroot -e "CREATE DATABASE IF NOT EXISTS wp_es; CREATE DATABASE IF NOT EXISTS ps_es; CREATE USER IF NOT EXISTS 'es'@'%' IDENTIFIED BY '$DB_PASS'; GRANT ALL ON wp_es.* TO 'es'@'%'; GRANT ALL ON ps_es.* TO 'es'@'%'; FLUSH PRIVILEGES;"

# 2. WordPress + WP-CLI + WooCommerce (extension copiée, activée seulement pour les boutiques par le banc).
[ -f "$WORK/wp-cli.phar" ] || curl -sSL -o "$WORK/wp-cli.phar" https://github.com/wp-cli/wp-cli/releases/download/v2.11.0/wp-cli-2.11.0.phar
[ -f "$WORK/woocommerce.zip" ] || curl -sSL -o "$WORK/woocommerce.zip" "https://github.com/woocommerce/woocommerce/releases/download/$WOO_VERSION/woocommerce.zip"
docker inspect wp-es >/dev/null 2>&1 || docker run -d --name wp-es -p 8081:80 --add-host=host.docker.internal:host-gateway \
  -e WORDPRESS_DB_HOST=host.docker.internal -e WORDPRESS_DB_USER=es -e WORDPRESS_DB_PASSWORD="$DB_PASS" -e WORDPRESS_DB_NAME=wp_es \
  wordpress:6.6-php8.2-apache >/dev/null
sleep 8
docker cp "$WORK/wp-cli.phar" wp-es:/usr/local/bin/wp && docker exec wp-es chmod +x /usr/local/bin/wp
docker cp "$WORK/woocommerce.zip" wp-es:/tmp/woocommerce.zip
docker exec -u www-data wp-es sh -c "wp core is-installed 2>/dev/null || wp core install --url=http://localhost:8081 --title=ES --admin_user=admin --admin_password='$ADMIN_PASS' --admin_email=demo@exemple.fr --skip-email; wp plugin is-installed woocommerce || wp plugin install /tmp/woocommerce.zip"

# 3. PrestaShop 8.1 (installation en ligne de commande, paquets de langue vides servis localement).
mkdir -p "$WORK/pslang"
python3 - "$WORK/pslang" <<'PY'
import os, sys, zipfile
root = sys.argv[1]
for kind in ("translations", "mails"):
    for lang in ("en-US", "fr-FR"):
        d = os.path.join(root, kind, "8.1.7", lang); os.makedirs(d, exist_ok=True)
        with zipfile.ZipFile(os.path.join(d, lang + ".zip"), "w") as z: z.writestr("README.txt", "pack vide (environnement de test local)")
PY
pgrep -f "http.server 8099" >/dev/null || (cd "$WORK/pslang" && nohup python3 -m http.server 8099 --bind 0.0.0.0 >/dev/null 2>&1 &)
if ! docker inspect ps-es >/dev/null 2>&1; then
  docker run -d --name ps-es -p 8082:80 --add-host=host.docker.internal:host-gateway -e PS_INSTALL_AUTO=0 prestashop/prestashop:8.1-apache >/dev/null
  sleep 15
  docker exec ps-es sh -c "mv install install-es 2>/dev/null; mv admin admin-es 2>/dev/null; sed -i 's#https://i18n.prestashop-project.org/#http://host.docker.internal:8099/#g' classes/Language.php"
  docker exec ps-es sh -c "runuser -g www-data -u www-data -- php -d memory_limit=-1 install-es/index_cli.php --domain=localhost:8082 --db_server=host.docker.internal:3306 --db_name=ps_es --db_user=es --db_password='$DB_PASS' --prefix=ps_ --firstname=Demo --lastname=ES --password='$ADMIN_PASS' --email=demo@exemple.fr --language=en --country=fr --all_languages=0 --newsletter=0 --send_email=0 --ssl=0"
  docker exec ps-es sh -c "rm -rf install-es; mv modules/ps_distributionapiclient /tmp/ 2>/dev/null; chown -R www-data:www-data var"
  # Boutique bilingue (anglais + français), comme une boutique française réelle : teste les adresses par langue.
  docker exec -u www-data ps-es php -r "define('_PS_ADMIN_DIR_', '/var/www/html/admin-es'); require '/var/www/html/config/config.inc.php'; Language::checkAndAddLanguage('fr');"
  # L'installation en ligne de commande enregistre les icônes de blockreassurance en « //modules/… » (adresse cassée).
  mysql -uroot ps_es -e "DELETE FROM ps_module WHERE name='ps_distributionapiclient'; UPDATE ps_configuration SET value=1 WHERE name='PS_REWRITING_SETTINGS'; UPDATE ps_psreassurance SET icon = REPLACE(icon, '//modules/', '/modules/') WHERE icon LIKE '//modules/%';"
fi
docker cp scripts/cms-v2/ps-theme.php ps-es:/tmp/ps-theme.php
docker cp scripts/cms-v2/ps-product.php ps-es:/tmp/ps-product.php
echo "WordPress : http://localhost:8081  ·  PrestaShop : http://localhost:8082"
