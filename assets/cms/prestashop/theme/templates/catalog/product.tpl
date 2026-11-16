{**
 * E-COM STUDIO IA — fiche produit d'un site monté par SINA.
 * Les pièces d'achat du site (bloc d'achat, tailles et couleurs, lots, packs, barre d'achat) sont rendues par le module
 * « esstudio » avec le vrai produit PrestaShop : prix, déclinaisons, stock et identifiants lus à chaque affichage.
 * L'ajout au panier passe par le panier natif de PrestaShop. Ce fichier n'est livré que si le site a sa propre fiche.
 *}
{extends file=$layout}

{block name='head' append}
  <meta property="og:type" content="product">
  {if $product.cover}<meta property="og:image" content="{$product.cover.large.url}">{/if}
  {if $product.show_price}
    <meta property="product:price:amount" content="{$product.price_amount}">
    <meta property="product:price:currency" content="{$currency.iso_code}">
  {/if}
{/block}

{block name='content'}
  <section id="main" class="es-fiche-tenue">
    {hook h='displayEsFiche' product=$product}
    {block name='product_footer'}
      {hook h='displayFooterProduct' product=$product category=$category}
    {/block}
  </section>
{/block}
