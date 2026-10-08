<?php
/**
 * Page du site conçu dans le studio (/pages/<adresse>, /policies/<adresse>).
 * Pas de $php_self : PrestaShop nomme la page « module-esstudio-page » et construit lui-même les liens des autres
 * langues (sélecteur de langue) avec l'adresse de la page — un $php_self fixe cassait ces liens (erreur 500 constatée
 * à l'installation locale d'une boutique bilingue, phase 11A).
 */
class EsStudioPageModuleFrontController extends ModuleFrontController
{
    public function initContent()
    {
        parent::initContent();
        $handle = preg_replace('/[^a-z0-9_-]/i', '', (string) Tools::getValue('handle'));
        $site = EsStudio::site();
        $title = '';
        foreach (array_merge($site['pages'] ?? [], $site['policies'] ?? []) as $p) {
            if ($p['handle'] === $handle) {
                $title = $p['title'];
            }
        }
        $file = _PS_MODULE_DIR_ . 'esstudio/views/templates/pages/' . $handle . '.tpl';
        if ($title === '' || !is_file($file)) {
            Tools::redirect('index.php?controller=404');
        }
        $this->context->smarty->assign(['es_page_tpl' => 'module:esstudio/views/templates/pages/' . $handle . '.tpl', 'es_page_title' => $title]);
        $this->setTemplate('module:esstudio/views/templates/front/page.tpl');
    }

    public function getTemplateVarPage()
    {
        $page = parent::getTemplateVarPage();
        $site = EsStudio::site();
        foreach (array_merge($site['pages'] ?? [], $site['policies'] ?? []) as $p) {
            if ($p['handle'] === Tools::getValue('handle')) {
                $page['meta']['title'] = $p['title'];
            }
        }
        $page['body_classes']['es-page-' . preg_replace('/[^a-z0-9_-]/i', '', (string) Tools::getValue('handle'))] = true;
        return $page;
    }
}
