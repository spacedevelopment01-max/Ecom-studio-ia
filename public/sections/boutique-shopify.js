/* Adaptateur SHOPIFY du contrat « window.tnBoutique » (voir public/sections/tenue-achat.js). Il est le seul à parler à
   Shopify : panier par /cart/add.js (plusieurs lignes d'un coup) et /cart.js. Le thème ne calcule jamais une remise :
   le prix du panier est celui de la boutique (remises automatiques du marchand). Sans dépendance. */
(function () {
  if (window.tnBoutique) return;
  var racine = (window.Shopify && window.Shopify.routes && window.Shopify.routes.root) || "/";
  function json(r) { return r.json().then(function (d) { if (!r.ok) throw new Error((d && (d.description || d.message)) || "Ajout impossible"); return d; }); }
  function panier() {
    return fetch(racine + "cart.js", { headers: { Accept: "application/json" } }).then(json).then(function (c) {
      return { nombre: c.item_count, total: c.total_price, lignes: (c.items || []).map(function (i) { return { id: String(i.variant_id), quantite: i.quantity, titre: i.title, prix: i.final_line_price }; }) };
    });
  }
  window.tnBoutique = {
    ajouter: function (lignes) {
      var items = (lignes || []).filter(function (l) { return l && l.id && l.quantite > 0; }).map(function (l) {
        var item = { id: Number(l.id) || l.id, quantity: l.quantite };
        if (l.cadeau) item.properties = { _cadeau: "oui" };
        return item;
      });
      if (!items.length) return Promise.reject(new Error("Rien à ajouter"));
      return fetch(racine + "cart/add.js", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ items: items }) }).then(json).then(panier);
    },
    panier: panier,
    argent: function (centimes) {
      var devise = (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || "EUR";
      try { return new Intl.NumberFormat(document.documentElement.lang || "fr", { style: "currency", currency: devise }).format(centimes / 100); } catch (e) { return (centimes / 100).toFixed(2) + " " + devise; }
    },
    allerAuPanier: function () { window.location.href = racine + "cart"; },
  };
})();
