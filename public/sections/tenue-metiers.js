/* Thème unique du Studio, module « metiers » : le filtre immédiat de « Chercher un bien » (tn-recherche-biens). Un filtre
   ne peut pas se passer de script : la liste se resserre dès qu'un choix change (acheter ou louer, type, ville, budget),
   le nombre de biens trouvés se met à jour, et un message s'affiche quand rien ne correspond. Écrit à la main, sans
   dépendance ; il n'agit que sur des éléments « tn-… » ; chargé deux fois, il ne fait rien de plus ; sans lui, tous les
   biens restent listés et le formulaire s'envoie à l'agence comme une demande. */
(function () {
  if (window.tnBiens) { window.tnBiens(); return; }
  function filtre(sec) {
    var form = sec.querySelector("form.tn-filtres-b"), cartes = sec.querySelectorAll(".tn-bien");
    if (!form || !cartes.length) return;
    // Des cartes d'exemple (aucun bien publié) ne portent rien à filtrer : on n'y touche pas.
    if (!sec.querySelector(".tn-bien[data-tn-tr]")) return;
    var projet = (form.querySelector('input[name="projet"]:checked') || {}).value || "";
    var type = (form.querySelector('select[name="type"]') || {}).value || "";
    var ville = (form.querySelector('select[name="ville"]') || {}).value || "";
    var budget = parseFloat((form.querySelector('input[name="budget"]') || {}).value);
    var vus = 0;
    [].forEach.call(cartes, function (c) {
      var prix = parseFloat(c.getAttribute("data-tn-prix"));
      var ok = (!projet || c.getAttribute("data-tn-tr") === projet) && (!type || c.getAttribute("data-tn-type") === type) &&
        (!ville || c.getAttribute("data-tn-ville") === ville) && (!(budget > 0) || !(prix > 0) || prix <= budget);
      c.hidden = !ok;
      if (ok) vus++;
    });
    var compte = sec.querySelector(".tn-trouves"), aucun = sec.querySelector(".tn-aucun");
    if (compte) compte.textContent = vus + " bien" + (vus > 1 ? "s" : "") + (projet === "location" ? " à louer" : projet === "vente" ? " à vendre" : "");
    if (aucun) aucun.hidden = vus > 0;
  }
  function tous() { [].forEach.call(document.querySelectorAll(".tn-recherche-biens"), filtre); }
  function ecoute(e) {
    var sec = e.target && e.target.closest ? e.target.closest(".tn-recherche-biens") : null;
    if (sec && e.target.closest("form.tn-filtres-b")) filtre(sec);
  }
  window.tnBiens = tous;
  document.addEventListener("change", ecoute);
  document.addEventListener("input", ecoute);
  document.addEventListener("submit", ecoute);
  tous();
  addEventListener("load", tous);
})();
