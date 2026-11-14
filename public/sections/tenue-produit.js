/* Sections à tenue du produit (13 novembre 2026) : le minuteur d'une étape de préparation (section « tn-preparation »).
   Une étape qui porte une vraie durée (attribut data-tn-minuteur, en secondes, posé par le Studio) reçoit un bouton :
   un toucher lance le décompte, un autre l'arrête et le remet à sa durée. Sans ce script, l'étape se lit telle quelle.
   Écrit à la main, sans dépendance ; il n'agit que sur des éléments « tn- » et peut être chargé deux fois sans dommage. */
(function () {
  function texte(s) { var m = Math.floor(s / 60), r = s % 60; return m + ":" + (r < 10 ? "0" : "") + r; }
  [].forEach.call(document.querySelectorAll(".tn-preparation [data-tn-minuteur]"), function (etape) {
    var duree = parseInt(etape.getAttribute("data-tn-minuteur"), 10);
    if (!(duree > 0) || duree > 86400 || etape.querySelector(".tn-minuteur")) return;
    var bouton = document.createElement("button"), reste = duree, fin = 0, horloge = null;
    bouton.type = "button";
    bouton.className = "tn-minuteur";
    bouton.setAttribute("aria-label", "Minuteur");
    function montre() { bouton.textContent = texte(reste); bouton.classList.toggle("tn-on", !!horloge); bouton.classList.toggle("tn-fini", !horloge && reste === 0); }
    function arrete() { clearInterval(horloge); horloge = null; }
    function bat() {
      reste = Math.max(0, Math.round((fin - Date.now()) / 1000));
      if (reste === 0) arrete();
      montre();
    }
    bouton.addEventListener("click", function () {
      if (horloge) { arrete(); reste = duree; montre(); return; }
      reste = duree; fin = Date.now() + duree * 1000; horloge = setInterval(bat, 250); montre();
    });
    montre();
    etape.appendChild(bouton);
  });
})();
