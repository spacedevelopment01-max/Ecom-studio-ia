<?php
/** Liens du site d'origine vers un produit (/products/<adresse>) ou une collection → pages natives de PrestaShop. */
class EsStudioGoModuleFrontController extends ModuleFrontController
{
    public function initContent()
    {
        $handle = preg_replace('/[^a-z0-9_-]/i', '', (string) Tools::getValue('handle'));
        $link = $this->context->link;
        if (Tools::getValue('kind') === 'product' && $handle !== '') {
            $id = (int) Db::getInstance()->getValue('SELECT pl.id_product FROM ' . _DB_PREFIX_ . 'product_lang pl INNER JOIN ' . _DB_PREFIX_ . 'product p ON p.id_product = pl.id_product WHERE p.active = 1 AND pl.link_rewrite = \'' . pSQL($handle) . '\' AND pl.id_shop = ' . (int) $this->context->shop->id);
            if ($id) {
                Tools::redirect($link->getProductLink($id));
            }
            Tools::redirect($link->getPageLink('search', null, null, ['s' => str_replace('-', ' ', $handle)]));
        }
        Tools::redirect($link->getCategoryLink((int) Configuration::get('PS_HOME_CATEGORY')));
    }
}
