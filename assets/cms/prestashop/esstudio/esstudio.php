<?php
/**
 * E-COM STUDIO IA — module compagnon du thème PrestaShop exporté (CMS Engine V2, phase 11A).
 * Installé automatiquement avec le thème (dépendance déclarée dans config/theme.yml). Il donne aux pages du site les
 * mêmes adresses que dans le studio (/pages/…, /policies/…), relie les liens produits et collections aux pages natives
 * de PrestaShop, traite les formulaires des sections (contact, inscription) et affiche les sections propres à la fiche
 * produit. Aucune donnée n'est envoyée hors de la boutique.
 */
if (!defined('_PS_VERSION_')) {
    exit;
}

class EsStudio extends Module
{
    public function __construct()
    {
        $this->name = 'esstudio';
        $this->tab = 'front_office_features';
        $this->version = '1.0.0';
        $this->author = 'E-COM STUDIO IA';
        $this->need_instance = 0;
        $this->ps_versions_compliancy = ['min' => '8.0.0', 'max' => _PS_VERSION_];
        $this->bootstrap = true;
        parent::__construct();
        $this->displayName = 'E-COM STUDIO IA';
        $this->description = $this->trans('Pages, formulaires et sections du site conçu dans E-COM STUDIO IA.', [], 'Modules.Esstudio.Admin');
    }

    public function install()
    {
        return parent::install()
            && $this->registerHook('moduleRoutes')
            && $this->registerHook('displayFooterProduct')
            && $this->registerHook('displayAfterBodyOpeningTag');
    }

    /** Données du site générées par le studio (pages, produit, adresses). */
    public static function site()
    {
        static $s = null;
        if ($s === null) {
            $s = json_decode((string) @file_get_contents(__DIR__ . '/site.json'), true) ?: [];
        }
        return $s;
    }

    public function hookModuleRoutes()
    {
        $handle = ['regexp' => '[_a-zA-Z0-9-]+', 'param' => 'handle'];
        $route = function ($rule, $controller, $kind) use ($handle) {
            return ['controller' => $controller, 'rule' => $rule, 'keywords' => ['handle' => $handle], 'params' => ['fc' => 'module', 'module' => 'esstudio', 'kind' => $kind]];
        };
        return [
            'module-esstudio-page' => $route('pages/{handle}', 'page', 'page'),
            'module-esstudio-policy' => $route('policies/{handle}', 'page', 'policy'),
            'module-esstudio-product' => $route('products/{handle}', 'go', 'product'),
            'module-esstudio-collection' => $route('collections/{handle}', 'go', 'collection'),
        ];
    }

    /** Sections propres à une fiche produit (caractéristiques, questions) : seulement sur la fiche concernée. */
    public function hookDisplayFooterProduct($params)
    {
        $site = self::site();
        $product = $params['product'] ?? null;
        $rewrite = is_array($product) ? ($product['link_rewrite'] ?? '') : (is_object($product) ? ($product->link_rewrite ?? '') : '');
        if (is_array($rewrite)) {
            $rewrite = reset($rewrite);
        }
        if (empty($site['product']['handle']) || $rewrite !== $site['product']['handle'] || !is_file(__DIR__ . '/views/templates/hook/product.tpl')) {
            return '';
        }
        return $this->fetch('module:esstudio/views/templates/hook/product.tpl');
    }

    /** Message après l'envoi d'un formulaire de section. */
    public function hookDisplayAfterBodyOpeningTag()
    {
        $state = Tools::getValue('es_form');
        if ($state === 'ok') {
            return '<p class="es-form-notice" role="status">' . htmlspecialchars($this->trans('Merci, votre message a bien été enregistré.', [], 'Modules.Esstudio.Shop')) . '</p>';
        }
        if ($state === 'error') {
            return '<p class="es-form-notice" role="alert">' . htmlspecialchars($this->trans('Adresse e-mail invalide : le message n’a pas été envoyé.', [], 'Modules.Esstudio.Shop')) . '</p>';
        }
        return '';
    }

    /** Configuration : messages reçus par les formulaires du site. */
    public function getContent()
    {
        $rows = json_decode((string) Configuration::get('ES_FORM_ENTRIES'), true) ?: [];
        $html = '<div class="panel"><h3>' . htmlspecialchars($this->trans('Messages du site', [], 'Modules.Esstudio.Admin')) . '</h3>';
        $html .= '<p>' . htmlspecialchars($this->trans('Les textes des sections viennent du studio : pour les modifier, modifiez-les dans E-COM STUDIO IA puis importez le nouveau thème.', [], 'Modules.Esstudio.Admin')) . '</p>';
        $html .= '<table class="table"><thead><tr><th>Date</th><th>Type</th><th>E-mail</th><th>Nom</th><th>Message</th></tr></thead><tbody>';
        foreach (array_reverse($rows) as $r) {
            $html .= '<tr><td>' . htmlspecialchars($r['date']) . '</td><td>' . htmlspecialchars($r['type']) . '</td><td>' . htmlspecialchars($r['email']) . '</td><td>' . htmlspecialchars($r['name']) . '</td><td>' . nl2br(htmlspecialchars($r['body'])) . '</td></tr>';
        }
        return $html . '</tbody></table></div>';
    }
}
