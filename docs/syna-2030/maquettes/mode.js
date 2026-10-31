/* Maquettes SYNA 2030 : bascule Encre ↔ Plein cadre sans rechargement. Le mode ne change que la présentation du
   Studio ; le fil, la sélection, le brouillon et l'étape en cours restent dans la page (aucun état n'est recréé). */
(function () {
  var root = document.documentElement;
  function read() { try { return localStorage.getItem("syna-mode"); } catch (e) { return null; } }
  function write(m) { try { localStorage.setItem("syna-mode", m); } catch (e) { /* stockage indisponible : sans effet */ } }
  var fromHash = /(^|[#&])plein\b/.test(location.hash) ? "plein" : /(^|[#&])encre\b/.test(location.hash) ? "encre" : null;
  var mode = fromHash || read() || "encre";
  function apply(m) {
    mode = m; root.setAttribute("data-mode", m); write(m);
    document.querySelectorAll("[data-set-mode]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-set-mode") === m)); });
    document.dispatchEvent(new CustomEvent("syna-mode", { detail: m }));
  }
  window.synaSetMode = apply;
  root.setAttribute("data-mode", mode);
  document.addEventListener("DOMContentLoaded", function () {
    var host = document.querySelector("[data-mode-host]") || document.querySelector(".top .meter") || document.querySelector(".top");
    if (host && !document.querySelector(".mode-switch")) {
      var g = document.createElement("div");
      g.className = "mode-switch"; g.setAttribute("role", "group"); g.setAttribute("aria-label", "Mode d'affichage du Studio");
      g.innerHTML = '<button type="button" data-set-mode="encre">Encre</button><button type="button" data-set-mode="plein">Plein cadre</button>';
      host.insertBefore(g, host.firstChild);
    }
    document.addEventListener("click", function (e) { var b = e.target.closest("[data-set-mode]"); if (b) apply(b.getAttribute("data-set-mode")); });
    apply(mode);
  });
})();
