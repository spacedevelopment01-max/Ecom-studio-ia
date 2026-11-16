<?php
/**
 * État des remises de l'offre dans cette boutique : l'empreinte des règles livrées, si elles sont en place, et ce qui
 * manque. Le Studio lit cette adresse avant de laisser s'afficher un prix de lot ou un cadeau. Aucune donnée sensible.
 */
class EsStudioOffreModuleFrontController extends ModuleFrontController
{
    public function initContent()
    {
        require_once _PS_MODULE_DIR_ . 'esstudio/achat.php';
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        die(json_encode(EsAchat::etat()));
    }
}
