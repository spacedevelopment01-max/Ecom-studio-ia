<?php
/**
 * Le panier tel que PrestaShop le tient (lignes, quantités, cadeau, total avec les remises natives), en JSON, pour
 * l'adaptateur du contrat « tnBoutique » (boutique-prestashop.js). Lecture seule ; aucune donnée du client.
 */
class EsStudioPanierModuleFrontController extends ModuleFrontController
{
    public function initContent()
    {
        require_once _PS_MODULE_DIR_ . 'esstudio/achat.php';
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        // Les règles de panier sans code (cadeau) sont posées ou retirées par PrestaShop avant la lecture.
        if ($this->context->cart && $this->context->cart->id && CartRule::isFeatureActive()) CartRule::autoRemoveFromCart($this->context);
        if ($this->context->cart && $this->context->cart->id && CartRule::isFeatureActive()) CartRule::autoAddToCart($this->context);
        die(json_encode(EsAchat::panier($this->context->cart)));
    }
}
