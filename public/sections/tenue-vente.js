/* Sections à tenue du module « vente » (thème unique, lot 4) : le seul geste de l'APERÇU qu'aucune feuille ne sait
   faire, le tri de la page des avis (les plus récents, les mieux notés, les moins bien notés). Chaque avis porte sa
   date et sa note (attributs data-tn-date et data-tn-note, posés par le Studio depuis la source d'avis).
   Écrit à la main, sans dépendance ; chargé deux fois, il ne fait rien de plus ; il n'agit que sur des éléments « tn- ».
   Sans ce script, la liste reste lisible, du plus récent au plus ancien. Le bandeau qui défile et la barre du produit
   collée en bas n'ont besoin d'aucun script. */
(function () {
  if (window.tnVente) return;
  window.tnVente = true;
  document.addEventListener("change", function (e) {
    var select = e.target;
    if (!select || !select.matches || !select.matches(".tn-avis-page select[data-tn-tri-avis]")) return;
    var list = select.closest(".tn-avis-page").querySelector(".tn-v-avis-l");
    if (!list) return;
    var how = select.value, items = [].slice.call(list.children);
    function date(li) { return li.getAttribute("data-tn-date") || ""; }
    function note(li) { var n = parseFloat(li.getAttribute("data-tn-note")); return isNaN(n) ? null : n; }
    items.sort(function (a, b) {
      if (how === "hauts" || how === "bas") {
        var x = note(a), y = note(b);
        // Un avis sans note reste en fin de liste, quel que soit le sens.
        if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
        if (x !== y) return how === "hauts" ? y - x : x - y;
      }
      return date(b) < date(a) ? -1 : date(b) > date(a) ? 1 : 0;
    });
    items.forEach(function (li) { list.appendChild(li); });
  });
})();
