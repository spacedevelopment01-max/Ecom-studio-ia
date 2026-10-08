{**
 * E-COM STUDIO IA — mise en page du thème enfant (CMS Engine V2).
 * Même structure que le thème Classic (scripts, crochets, notifications), avec l'en-tête et le pied de page du site
 * conçu dans le studio (es/header.tpl, es/footer.tpl). Accueil et pages du site : pleine largeur, comme dans le studio ;
 * autres pages (produit, catégorie, panier, commande, compte) : conteneur de Classic.
 *}
{include file='_partials/helpers.tpl'}
<!doctype html>
<html lang="{$language.locale}" data-ds="{$es_ds|default:'none'}" data-density="{$es_density|default:'balanced'}">
  <head>
    {block name='head'}
      {include file='_partials/head.tpl'}
    {/block}
  </head>
  {assign var=es_full value=($page.page_name == 'index' || $page.page_name == 'module-esstudio-page')}
  <body id="{$page.page_name}" class="{$page.body_classes|classnames} {$es_body_classes|default:''}">
    {block name='hook_after_body_opening_tag'}
      {hook h='displayAfterBodyOpeningTag'}
    {/block}
    {include file='es/header.tpl'}
    <main id="MainContent" class="es-main">
      {block name='notifications'}
        {include file='_partials/notifications.tpl'}
      {/block}
      {if !$es_full}
      <section id="wrapper">
        {hook h="displayWrapperTop"}
        <div class="container">
          {block name='breadcrumb'}
            {include file='_partials/breadcrumb.tpl'}
          {/block}
          <div class="row">
            <div id="content-wrapper" class="js-content-wrapper col-xs-12">
              {hook h="displayContentWrapperTop"}
      {/if}
              {block name='content'}{/block}
      {if !$es_full}
              {hook h="displayContentWrapperBottom"}
            </div>
          </div>
        </div>
        {hook h="displayWrapperBottom"}
      </section>
      {/if}
    </main>
    {include file='es/footer.tpl'}
    {block name='javascript_bottom'}
      {include file="_partials/password-policy-template.tpl"}
      {include file="_partials/javascript.tpl" javascript=$javascript.bottom}
    {/block}
    {block name='hook_before_body_closing_tag'}
      {hook h='displayBeforeBodyClosingTag'}
    {/block}
  </body>
</html>
