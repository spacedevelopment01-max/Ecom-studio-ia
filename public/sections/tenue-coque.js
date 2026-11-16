/* En-têtes du thème unique (tenue-coque.css) : du confort seulement. Le menu s'ouvre et se ferme sans ce script (cases
   à cocher lues par la feuille) ; ici : la touche Échap et un clic à côté referment, un lien choisi referme le panneau
   (l'aperçu change de page sans recharger), un seul sous-menu ouvert à la fois, l'état « ouvert » dit aux lecteurs
   d'écran, et la bande d'annonce qui s'en va quand on défile. Écrit à la main, sans dépendance ; chargé deux fois, il
   ne fait rien de plus. */
(function () {
  if (window.tnCoque) return;
  window.tnCoque = true;
  var SEL = ".tn-ent .tn-e-burger input, .tn-ent .tn-e-t input, .tn-ent .tn-e-h input";
  function boxes(root) { return [].slice.call((root || document).querySelectorAll(SEL)); }
  function tell(i) { i.setAttribute("aria-expanded", i.checked ? "true" : "false"); }
  function shut(root, keep) { boxes(root).forEach(function (i) { if (i !== keep && i.checked) { i.checked = false; tell(i); } }); }
  boxes().forEach(tell);
  document.addEventListener("change", function (e) {
    var i = e.target;
    if (!i.matches || !i.matches(SEL)) return;
    tell(i);
    // un seul sous-menu ouvert à la fois, au même niveau
    var item = i.closest(".tn-e-sous, .tn-e-col");
    if (i.checked && item && item.parentNode) [].forEach.call(item.parentNode.children, function (other) {
      if (other === item) return;
      var o = other.querySelector(":scope > label > input");
      if (o && o.checked) { o.checked = false; tell(o); }
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    [].forEach.call(document.querySelectorAll(".tn-ent"), function (h) {
      var open = boxes(h).filter(function (i) { return i.checked; });
      if (!open.length) return;
      shut(h);
      var back = open[open.length - 1];
      if (back.offsetParent !== null) back.focus();
    });
  });
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t.closest) return;
    var h = t.closest(".tn-ent");
    // un clic hors de l'en-tête referme tout ; un lien choisi dans le menu aussi
    if (!h) { [].forEach.call(document.querySelectorAll(".tn-ent"), function (x) { shut(x); }); return; }
    if (t.closest(".tn-e-nav a")) { shut(h); return; }
    if (!t.closest(".tn-e-sous") && !t.closest(".tn-e-burger")) [].forEach.call(h.querySelectorAll(".tn-e-t input"), function (i) { if (i.checked) { i.checked = false; tell(i); } });
  });
  // la bande d'annonce défile avec la page : seule la barre du menu reste en haut de l'écran
  function bande() {
    [].forEach.call(document.querySelectorAll(".tn-entete-annonce"), function (h) {
      var m = h.querySelector(".tn-e-msg"), px = m ? m.offsetHeight : 0;
      h.style.setProperty("--tn-e-colle", px + "px");
    });
  }
  bande();
  addEventListener("resize", bande);
  addEventListener("load", bande);
})();
