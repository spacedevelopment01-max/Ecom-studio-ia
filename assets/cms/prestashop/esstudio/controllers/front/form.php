<?php
/**
 * Formulaires des sections (inscription, contact) : jeton vérifié, champs nettoyés, message enregistré (module ›
 * Configurer) et, pour le contact, envoyé à l'adresse de la boutique quand l'envoi d'e-mails fonctionne.
 */
class EsStudioFormModuleFrontController extends ModuleFrontController
{
    public function postProcess()
    {
        $back = Tools::getValue('back') ?: $this->context->link->getPageLink('index');
        $back = Tools::secureReferrer($back);
        $contact = Tools::getValue('contact');
        $contact = is_array($contact) ? $contact : [];
        $email = trim((string) ($contact['email'] ?? ''));
        $type = Tools::getValue('form_type');
        $sep = strpos($back, '?') === false ? '?' : '&';
        if (!in_array($type, ['customer', 'contact'], true) || !Validate::isEmail($email) || Tools::getValue('token') !== Tools::getToken(false)) {
            Tools::redirect($back . $sep . 'es_form=error');
        }
        $entry = ['type' => $type, 'email' => $email, 'name' => Tools::substr(strip_tags((string) ($contact['name'] ?? '')), 0, 120), 'phone' => Tools::substr(strip_tags((string) ($contact['phone'] ?? '')), 0, 40), 'body' => Tools::substr(strip_tags((string) ($contact['body'] ?? '')), 0, 4000), 'date' => date('Y-m-d H:i:s')];
        $rows = json_decode((string) Configuration::get('ES_FORM_ENTRIES'), true) ?: [];
        $rows[] = $entry;
        Configuration::updateValue('ES_FORM_ENTRIES', json_encode(array_slice($rows, -300)));
        if ($type === 'contact') {
            @Mail::send((int) $this->context->language->id, 'contact', 'Message', ['{email}' => $email, '{message}' => $entry['body']], Configuration::get('PS_SHOP_EMAIL'), null, $email);
        }
        Tools::redirect($back . $sep . 'es_form=ok');
    }
}
