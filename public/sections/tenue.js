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
