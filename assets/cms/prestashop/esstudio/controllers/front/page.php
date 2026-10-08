<?php
/** Page du site conçu dans le studio (/pages/<adresse>, /policies/<adresse>). */
class EsStudioPageModuleFrontController extends ModuleFrontController
{
    public $php_self = 'module-esstudio-page';

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
