/* Sections à tenue de récit (13 novembre 2026) : le nom de la marque écrit en très grand (ouverture au nom de la
   marque, pied de page « grand nom ») prend juste la largeur de sa section, quel que soit le nom et quelle que soit la
   police, dans la limite d'un plafond donné par la feuille. Aucune feuille ne sait le faire seule : la largeur d'un
   mot dépend de ses lettres. Écrit à la main, sans
   dépendance ; chargé deux fois, il ne fait rien de plus ; sans lui, le nom garde la taille prudente de la feuille. */
(function () {
  if (window.tnGeant) { window.tnGeant(); return; }
  function ajuste() {
    [].forEach.call(document.querySelectorAll(".tn-geant"), function (el) {
      var mot = el.firstElementChild, sec = el.closest(".tn");
      if (!mot || !sec) return;
      var cs = getComputedStyle(el), large = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (!(large > 40)) return; // section cachée (autre page, autre construction) : rien à mesurer
      // La taille voulue se déduit de la taille et de la largeur du moment (lues ensemble, sans rien changer avant :
      // une taille que l'on vient de poser n'est pas toujours appliquée tout de suite).
      var actuelle = parseFloat(cs.fontSize), mesure = mot.getBoundingClientRect().width;
      if (!(actuelle > 0) || !(mesure > 0)) return;
      var taille = Math.max(28, Math.floor(actuelle * large / mesure * 10) / 10);
      // Plafonds facultatifs, donnés par la feuille : « --tn-g-max » (en pixels) et « --tn-g-vh » (part de la hauteur
      // de l'écran). Un nom étroit dans une police serrée ne devient pas plus haut que l'écran ne le permet.
      var maxi = parseFloat(cs.getPropertyValue("--tn-g-max")), part = parseFloat(cs.getPropertyValue("--tn-g-vh"));
      if (maxi > 0) taille = Math.min(taille, maxi);
      if (part > 0 && window.innerHeight > 0) taille = Math.min(taille, Math.max(120, Math.round(window.innerHeight * part)));
      if (Math.abs(taille - actuelle) < 0.5) return;
      el.style.fontSize = taille + "px";
      sec.style.setProperty("--tn-g", taille + "px");
    });
  }
  window.tnGeant = ajuste;
  ajuste();
  addEventListener("resize", ajuste);
  addEventListener("load", ajuste);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajuste);
})();
