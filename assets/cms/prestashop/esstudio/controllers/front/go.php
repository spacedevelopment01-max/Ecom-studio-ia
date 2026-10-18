<?php
/** Liens du site d'origine vers un produit (/products/<adresse>) ou une collection → pages natives de PrestaShop. */
class EsStudioGoModuleFrontController extends ModuleFrontController
{
    public function initContent()
    {
        $handle = preg_replace('/[^a-z0-9_-]/i', '', (string) Tools::getValue('handle'));
        $link = $this->context->link;
        $site = EsStudio::site();
        if (!empty($site['catalogSource'])) {
            $maps = json_decode((string) Configuration::get('ES_CATALOG_MAPS'), true) ?: [];
            $map = $maps[$site['catalogSource']] ?? [];
            if (Tools::getValue('kind') === 'product' && isset($map['products'][$handle])) {
                $p = new Product((int) $map['products'][$handle]);
                if (Validate::isLoadedObject($p) && $p->active && $p->isAssociatedToShop((int) $this->context->shop->id)) Tools::redirect($link->getProductLink($p));
            }
            if (Tools::getValue('kind') === 'collection') {
                if ($handle === 'all' && isset($map['collections']['__all'])) Tools::redirect($link->getCategoryLink((int) $map['collections']['__all']));
                if (isset($map['collections'][$handle])) Tools::redirect($link->getCategoryLink((int) $map['collections'][$handle]));
            }
            header('HTTP/1.1 404 Not Found'); $this->setTemplate('errors/404'); return;
        }
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
