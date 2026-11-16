<?php
/** Mise à niveau sans désinstallation : la fiche produit du site et l'achat (aucune suppression de données). */
if (!defined('_PS_VERSION_')) exit;
function upgrade_module_1_2_0($module)
{
    return $module->registerHook('displayEsFiche')
        && $module->registerHook('displayEsPiece')
        && $module->registerHook('actionFrontControllerSetMedia');
}
