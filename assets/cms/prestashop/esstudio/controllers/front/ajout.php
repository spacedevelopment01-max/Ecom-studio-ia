<?php
/**
 * Bouton d'achat des pièces du site, sans script : le formulaire envoie la version choisie (« id » = produit-déclinaison),
 * le module l'ajoute au panier de PrestaShop (jeton vérifié, stock contrôlé par PrestaShop) puis montre le panier.
 */
class EsStudioAjoutModuleFrontController extends ModuleFrontController
{
    public function postProcess()
    {
        $retour = Tools::secureReferrer((string) ($_SERVER['HTTP_REFERER'] ?? '')) ?: $this->context->link->getPageLink('index');
        if (Tools::getValue('token') !== Tools::getToken(false) || !preg_match('/^(\d+)-(\d+)$/', (string) Tools::getValue('id'), $m)) Tools::redirect($retour);
        $qty = max(1, min(99, (int) Tools::getValue('quantity', 1)));
        if (!$this->context->cart->id) {
            if (Context::getContext()->cookie->id_guest) { $guest = new Guest((int) Context::getContext()->cookie->id_guest); $this->context->cart->mobile_theme = $guest->mobile_theme; }
            $this->context->cart->add();
            if ($this->context->cart->id) $this->context->cookie->id_cart = (int) $this->context->cart->id;
        }
        $product = new Product((int) $m[1], true, (int) $this->context->language->id);
        if (!Validate::isLoadedObject($product) || !$product->active || !$product->available_for_order) Tools::redirect($retour);
        $ok = $this->context->cart->updateQty($qty, (int) $m[1], (int) $m[2], false, 'up');
        if ($ok === true && CartRule::isFeatureActive()) { CartRule::autoRemoveFromCart($this->context); CartRule::autoAddToCart($this->context); }
        Tools::redirect($ok === true ? $this->context->link->getPageLink('cart', null, null, ['action' => 'show']) : $retour);
    }
}
