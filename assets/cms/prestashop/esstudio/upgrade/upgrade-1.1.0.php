<?php
/** Mise à niveau sans désinstallation : aucune suppression de produits, associations ou messages. */
if (!defined('_PS_VERSION_')) exit;
function upgrade_module_1_1_0($module)
{
    return $module->registerHook('moduleRoutes')
        && $module->registerHook('displayFooterProduct')
        && $module->registerHook('displayAfterBodyOpeningTag');
}
