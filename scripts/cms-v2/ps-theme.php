<?php
/** Environnement de test local : importe un ZIP de thème avec le gestionnaire de thèmes de PrestaShop, puis l'active. */
define('_PS_ADMIN_DIR_', '/var/www/html/admin-es');
require '/var/www/html/config/config.inc.php';
$ctx = Context::getContext();
$ctx->employee = new Employee(1);
$tm = (new \PrestaShop\PrestaShop\Core\Addon\Theme\ThemeManagerBuilder($ctx, Db::getInstance()))->build();
[$cmd, $arg] = [$argv[1], $argv[2]];
try {
	if ($cmd === 'install') { $tm->install($arg); echo "installed\n"; }
	if ($cmd === 'enable') { $ok = $tm->enable($arg); echo $ok ? "enabled\n" : "enable refused\n"; }
	if ($cmd === 'uninstall') { $tm->uninstall($arg); echo "uninstalled\n"; }
} catch (\Throwable $e) { echo get_class($e) . ': ' . $e->getMessage() . "\n"; exit(1); }
