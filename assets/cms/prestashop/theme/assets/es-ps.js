/* E-COM STUDIO IA — compteur du panier de l'en-tête mis à jour après un ajout (événement natif de PrestaShop). */
(function () {
  function sync(count) {
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = String(count);
      if (Number(count) > 0) el.removeAttribute('hidden'); else el.setAttribute('hidden', '');
    });
  }
  document.addEventListener('DOMContentLoaded', function () {
    if (window.prestashop && typeof window.prestashop.on === 'function') {
      window.prestashop.on('updateCart', function (e) {
        var c = e && e.resp && e.resp.cart;
        if (c && c.products_count != null) sync(c.products_count);
      });
    }
  });
})();
