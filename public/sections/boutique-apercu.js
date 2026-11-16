/* Adaptateur de l'APERÇU du Studio pour le contrat « window.tnBoutique » (voir public/sections/tenue-achat.js) : un
   panier d'essai gardé en mémoire, rien n'est vendu. Les identifiants de version sont ceux du catalogue du Studio ; un
   prix n'est connu que s'il est donné avec la ligne (option « prix », en centimes). Sans dépendance. */
(function () {
  if (window.tnBoutique) return;
  var lignes = [];
  function etat() { return { nombre: lignes.reduce(function (n, l) { return n + l.quantite; }, 0), total: lignes.reduce(function (n, l) { return n + (l.cadeau ? 0 : (l.prix || 0) * l.quantite); }, 0), lignes: lignes.map(function (l) { return { id: l.id, quantite: l.quantite, titre: l.titre || "", prix: (l.prix || 0) * l.quantite, cadeau: !!l.cadeau }; }) }; }
  window.tnBoutique = {
    ajouter: function (nouvelles, options) {
      var bonnes = (nouvelles || []).filter(function (l) { return l && l.id && l.quantite > 0; });
      if (!bonnes.length) return Promise.reject(new Error("Rien à ajouter"));
      bonnes.forEach(function (l) {
        var deja = lignes.filter(function (x) { return x.id === String(l.id) && !!x.cadeau === !!l.cadeau; })[0];
        if (deja) deja.quantite += l.quantite; else lignes.push({ id: String(l.id), quantite: l.quantite, cadeau: !!l.cadeau, prix: (options && options.prix && options.prix[l.id]) || 0, titre: (options && options.titres && options.titres[l.id]) || "" });
      });
      try { document.dispatchEvent(new CustomEvent("tn-panier", { detail: etat() })); } catch (e) {}
      return Promise.resolve(etat());
    },
    panier: function () { return Promise.resolve(etat()); },
    argent: function (centimes) { return (Math.round(centimes) / 100).toFixed(2).replace(/[.,]00$/, "").replace(".", ",") + "\u00a0€"; },
    /* Dans l'aperçu, le panier de côté (s'il est posé sur la page) s'ouvre de lui-même au clic sur le bouton d'achat. */
    allerAuPanier: function () { if (window.ctGo && !document.querySelector(".tn-panier-cote")) window.ctGo("cart"); },
  };
})();
