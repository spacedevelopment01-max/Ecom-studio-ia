/** Compteur d'en-tête alimenté par l'état serveur du panier natif Woo Blocks, jamais par un calcul commercial local. */
(function () {
  if (!window.wp || !window.wp.data) return;
  var last = null;
  function sync() {
    var store = window.wp.data.select('wc/store/cart');
    if (!store || !store.getCartData) return;
    var cart = store.getCartData(), count = cart && (typeof cart.itemsCount === 'number' ? cart.itemsCount : cart.items_count);
    if (typeof count !== 'number' || count === last) return;
    last = count;
    document.querySelectorAll('span.es-cart-count').forEach(function (el) { el.textContent = String(count); el.hidden = count === 0; });
  }
  window.wp.data.subscribe(sync);
  sync();
})();
