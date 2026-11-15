/* Sections à tenue (13 novembre 2026) : la barre d'achat n'apparaît en bas de l'écran qu'une fois le bouton d'achat
   du bloc sorti de l'écran par le haut (jamais par-dessus lui). Écrit à la main, sans dépendance. */
(function () {
  if (!("IntersectionObserver" in window)) return;
  [].forEach.call(document.querySelectorAll(".tn-barre"), function (bar) {
    var sec = bar.closest(".tn-achat"), bt = sec && sec.querySelector(":scope > .tn-bt");
    if (!bt) return;
    new IntersectionObserver(function (es) {
      var e = es[es.length - 1];
      bar.classList.toggle("tn-on", !e.isIntersecting && e.boundingClientRect.top < 0);
    }).observe(bt);
  });
})();

/* Page boutique (« tn-catalogue ») : les filtres par famille, « en stock seulement » et le tri par prix montrent, cachent
   et rangent les vraies cartes ; un filtre choisi se rappelle en étiquette au-dessus de la liste. Un lien du menu vers une
   famille (« shop:Famille ») arrive avec cette famille cochée. Sans ce script, la page montre simplement tous les produits. */
(function () {
  if (window.tnCatalogue) return;
  window.tnCatalogue = true;
  [].forEach.call(document.querySelectorAll(".tn-catalogue"), function (sec) {
    var box = sec.querySelector(".tn-cartes"), chosen = sec.querySelector(".tn-choisis"), clear = chosen && chosen.querySelector(".tn-effacer"), tri = sec.querySelector(".tn-tri select");
    if (!box) return;
    var all = [].slice.call(box.querySelectorAll(".tn-carte-p"));
    if (!all.some(function (c) { return c.hasAttribute("data-tn-fams"); })) return; // cartes d'exemple : rien à filtrer
    function inputs() { return [].slice.call(sec.querySelectorAll(".tn-filtres input")); }
    function apply() {
      var on = inputs().filter(function (i) { return i.checked; });
      var fams = on.filter(function (i) { return i.hasAttribute("data-tn-fam"); }).map(function (i) { return i.getAttribute("data-tn-fam"); });
      var stock = on.some(function (i) { return i.hasAttribute("data-tn-stock"); });
      var list = all.filter(function (c) {
        var f = (c.getAttribute("data-tn-fams") || "").split("|");
        return (!fams.length || fams.some(function (x) { return f.indexOf(x) > -1; })) && (!stock || !c.classList.contains("tn-epuise"));
      });
      var how = tri ? tri.selectedIndex : 0;
      if (how > 0) list = list.slice().sort(function (a, b) { var x = +a.getAttribute("data-tn-prix") || 0, y = +b.getAttribute("data-tn-prix") || 0; return how === 1 ? x - y : y - x; });
      while (box.firstChild) box.removeChild(box.firstChild);
      list.forEach(function (c) { box.appendChild(c); });
      if (!chosen || !clear) return;
      [].slice.call(chosen.querySelectorAll("label:not(.tn-effacer)")).forEach(function (l) { chosen.removeChild(l); });
      on.forEach(function (i) {
        var l = document.createElement("label"), b = document.createElement("input"), s = document.createElement("span");
        b.type = "checkbox"; s.textContent = (i.parentNode.textContent || "").trim();
        l.appendChild(b); l.appendChild(s);
        b.addEventListener("change", function () { i.checked = false; apply(); });
        chosen.appendChild(l);
      });
      var c = clear.querySelector("input"); if (c) c.checked = false;
    }
    sec.addEventListener("change", function (e) {
      var t = e.target;
      if (clear && clear.contains(t)) { inputs().forEach(function (i) { i.checked = false; }); apply(); return; }
      if (t.closest && (t.closest(".tn-filtres") || t.closest(".tn-tri"))) apply();
    });
    sec._tnFamille = function (name) { inputs().forEach(function (i) { if (i.hasAttribute("data-tn-fam")) i.checked = !!name && i.getAttribute("data-tn-fam") === name; }); apply(); };
  });
  addEventListener("tn-go", function (e) {
    var d = e.detail || {}, pg = document.querySelector('.tb-pg[data-pg="' + d.page + '"]');
    if (pg) [].forEach.call(pg.querySelectorAll(".tn-catalogue"), function (sec) { if (sec._tnFamille) sec._tnFamille(d.arg || ""); });
  });
})();
