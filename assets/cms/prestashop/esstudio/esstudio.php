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
require_once __DIR__ . '/achat.php';

class EsStudio extends Module
{
    public function __construct()
    {
        $this->name = 'esstudio';
        $this->tab = 'front_office_features';
        $this->version = '1.2.0';
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
            && $this->registerHook('displayAfterBodyOpeningTag')
            && $this->registerHook('displayEsFiche')
            && $this->registerHook('displayEsPiece')
            && $this->registerHook('actionFrontControllerSetMedia');
    }

    /** Données du site générées par le studio (pages, produit, adresses). */
    public static function site()
    {
        static $s = null;
        if ($s === null) {
            $file = defined('_PS_THEME_DIR_') && is_file(_PS_THEME_DIR_ . 'config/es-site.json') ? _PS_THEME_DIR_ . 'config/es-site.json' : __DIR__ . '/site.json';
            $s = json_decode((string) @file_get_contents($file), true) ?: [];
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
        $file = defined('_PS_THEME_DIR_') && is_file(_PS_THEME_DIR_ . 'config/es-site.json') ? _PS_THEME_DIR_ . 'templates/es/product-extra.tpl' : __DIR__ . '/views/templates/hook/product.tpl';
        if (empty($site['product']['handle']) || $rewrite !== $site['product']['handle'] || !is_file($file)) {
            return '';
        }
        return $this->context->smarty->fetch($file);
    }

    /** Fiche produit d'un site monté par SINA : ses pièces d'achat, rendues avec le vrai produit (achat.php). */
    public function hookDisplayEsFiche($params)
    {
        $product = $params['product'] ?? null;
        $id = is_array($product) || $product instanceof ArrayAccess ? (int) ($product['id_product'] ?? 0) : (is_object($product) ? (int) ($product->id ?? 0) : 0);
        return $id ? EsAchat::rendreFiche($id) : '';
    }

    /** Pièce d'une page du site qui lit la boutique (prix, stock, bouton d'achat) : rendue ici, jamais figée. */
    public function hookDisplayEsPiece($params)
    {
        return EsAchat::rendrePiece((string) ($params['type'] ?? ''), (string) ($params['id'] ?? ''));
    }

    /** Réglages de l'adaptateur du panier (contrat « tnBoutique ») : adresses, jeton, monnaie, offre si elle est en place. */
    public function hookActionFrontControllerSetMedia()
    {
        $link = $this->context->link;
        $etat = EsAchat::etat();
        Media::addJsDef(['tnBoutiqueConfig' => [
            'ajout' => $link->getPageLink('cart'), 'lecture' => $link->getModuleLink('esstudio', 'panier'), 'jeton' => Tools::getToken(false),
            'panier' => $link->getPageLink('cart', null, null, ['action' => 'show']), 'argent' => EsAchat::argent(),
            'offre' => $etat['actif'] ? EsAchat::offre() : null,
        ]]);
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
        $catalogHtml = '';
        if (is_file(__DIR__ . '/catalogue.json') && (self::site()['business'] ?? '') !== 'services') {
            if (Tools::isSubmit('es_catalog_import')) {
                try {
                    if (!hash_equals(Tools::getAdminTokenLite('AdminModules'), (string) Tools::getValue('token'))) throw new RuntimeException('catalog_csrf_invalid');
                    require_once __DIR__ . '/catalog-import.php';
                    $imported = es_ps_catalog_import();
                    $catalogHtml .= $this->displayConfirmation(count($imported) . ' produits importés ou mis à jour. Vérifiez puis activez les nouveaux produits dans Catalogue.');
                    // Les remises de l'offre suivent le catalogue : posées (ou mises à jour) dès que les produits existent.
                    if (EsAchat::offre()) { $pose = EsAchat::poser(); $catalogHtml .= $pose['ok'] ? $this->displayConfirmation('Remises de l\'offre posées : ' . $pose['prix'] . ' prix par quantité, ' . $pose['regles'] . ' règle(s) de panier (cadeau).') : $this->displayWarning('Remises de l\'offre non posées : ' . implode(' ; ', $pose['manque'])); }
                } catch (Throwable $e) { $catalogHtml .= $this->displayError($e->getMessage()); }
            }
            $catalogHtml .= '<div class="panel"><h3>Catalogue</h3><p>Import local des fichiers livrés. Nouveaux produits désactivés ; éléments reliés mis à jour. Aucun prix ni stock inconnu inventé. Vérifiez les taxes, stocks et produits avant publication.</p><form method="post"><input type="hidden" name="token" value="' . htmlspecialchars(Tools::getAdminTokenLite('AdminModules'), ENT_QUOTES) . '"><button class="btn btn-default" name="es_catalog_import" value="1">Importer / mettre à jour le catalogue</button></form></div>';
        }
        // Remises de l'offre : posées en natif (prix spécifiques par quantité, règles de panier), vérifiables et retirables.
        if (EsAchat::offre()) {
            $jeton = Tools::getAdminTokenLite('AdminModules');
            if ((Tools::isSubmit('es_offre_poser') || Tools::isSubmit('es_offre_retirer')) && hash_equals($jeton, (string) Tools::getValue('token'))) {
                if (Tools::isSubmit('es_offre_retirer')) { EsAchat::retirer(); $catalogHtml .= $this->displayConfirmation('Remises de l\'offre retirées.'); }
                else { $pose = EsAchat::poser(); $catalogHtml .= $pose['ok'] ? $this->displayConfirmation('Remises posées : ' . $pose['prix'] . ' prix par quantité, ' . $pose['regles'] . ' règle(s) de panier (cadeau). Le réglage « remises par quantité » compte désormais tous les articles du produit, quelle que soit la déclinaison.') : $this->displayError('Remises non posées : ' . implode(' ; ', $pose['manque'])); }
            }
            $etat = EsAchat::etat();
            $catalogHtml .= '<div class="panel"><h3>Remises de l\'offre</h3><p>' . ($etat['actif'] ? 'En place : prix par quantité et cadeau sont tenus par PrestaShop (Catalogue › Réductions).' : 'Pas en place : ' . htmlspecialchars(implode(' ; ', $etat['manque'])) . '. Tant que ce n\'est pas fait, le site n\'affiche ni prix de lot ni cadeau.') . '</p><form method="post"><input type="hidden" name="token" value="' . htmlspecialchars($jeton, ENT_QUOTES) . '"><button class="btn btn-default" name="es_offre_poser" value="1">Poser / mettre à jour les remises</button> <button class="btn btn-default" name="es_offre_retirer" value="1">Retirer les remises</button></form></div>';
        }
        $rows = json_decode((string) Configuration::get('ES_FORM_ENTRIES'), true) ?: [];
        $html = '<div class="panel"><h3>' . htmlspecialchars($this->trans('Messages du site', [], 'Modules.Esstudio.Admin')) . '</h3>';
        $html .= '<p>' . htmlspecialchars($this->trans('Les textes des sections viennent du studio : pour les modifier, modifiez-les dans E-COM STUDIO IA puis importez le nouveau thème.', [], 'Modules.Esstudio.Admin')) . '</p>';
        $html .= '<table class="table"><thead><tr><th>Date</th><th>Type</th><th>E-mail</th><th>Nom</th><th>Message</th></tr></thead><tbody>';
        foreach (array_reverse($rows) as $r) {
            $html .= '<tr><td>' . htmlspecialchars($r['date']) . '</td><td>' . htmlspecialchars($r['type']) . '</td><td>' . htmlspecialchars($r['email']) . '</td><td>' . htmlspecialchars($r['name']) . '</td><td>' . nl2br(htmlspecialchars($r['body'])) . '</td></tr>';
        }
        return $catalogHtml . $html . '</tbody></table></div>';
    }
}
