/*
 * Maison & Horizon (issue #172) : interactions des biens immobiliers, sans dépendance.
 * - Favoris : gardés dans ce navigateur (clé propre à la boutique), compteurs et boutons cœur synchronisés.
 *   Ce n'est pas un compte : l'espace client réel dépend de la plateforme (voir la page « Mon espace »).
 * - Recherche de l'accueil : onglet Acheter / Louer (page de destination et budgets adaptés).
 * - Listes : filtres (ville, type, budget, surface, chambres, meublé, disponibilité, extérieur, piscine), tri,
 *   pagination, état sans résultat, remise à zéro ; critères lus et gardés dans l'adresse (retour arrière conservé).
 */
(function () {
  "use strict";
  var shopMeta = document.querySelector('meta[name="mh-shop"]');
  var KEY = "mh-favoris:" + ((shopMeta && shopMeta.getAttribute("content")) || "boutique");
  var store = {
    get: function () { try { var v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v.filter(function (x) { return typeof x === "string"; }) : []; } catch (e) { return []; } },
    set: function (list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* stockage refusé : les favoris restent le temps de la page */ } memory = list; },
  };
  var memory = store.get();
  function favorites() { return memory.slice(); }
  function syncFavorites() {
    var list = favorites();
    document.querySelectorAll("[data-re-fav]").forEach(function (b) {
      var on = list.indexOf(b.getAttribute("data-re-fav")) >= 0;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      var label = b.getAttribute("aria-label") || "";
      if (on && label.indexOf("Ajouter") === 0) b.setAttribute("aria-label", label.replace("Ajouter aux favoris", "Retirer des favoris"));
      if (!on && label.indexOf("Retirer") === 0) b.setAttribute("aria-label", label.replace("Retirer des favoris", "Ajouter aux favoris"));
      var text = b.querySelector("[data-re-fav-text]");
      if (text) text.textContent = on ? (text.getAttribute("data-on") || "Dans vos favoris") : (text.getAttribute("data-off") || "Ajouter aux favoris");
    });
    document.querySelectorAll("[data-re-fav-count]").forEach(function (c) { c.textContent = String(list.length); c.hidden = list.length === 0 && c.hasAttribute("data-hide-empty"); });
    document.dispatchEvent(new CustomEvent("mh:favorites", { detail: list }));
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-re-fav]");
    if (!b) return;
    e.preventDefault();
    var ref = b.getAttribute("data-re-fav"), list = favorites(), i = list.indexOf(ref);
    if (i >= 0) list.splice(i, 1); else list.push(ref);
    store.set(list);
    syncFavorites();
    announce(i >= 0 ? "Bien retiré de vos favoris." : "Bien ajouté à vos favoris.");
  });
  window.addEventListener("storage", function (e) { if (e.key === KEY) { memory = store.get(); syncFavorites(); } });

  /* Annonce discrète pour les lecteurs d'écran. */
  var live;
  function announce(text) {
    if (!live) { live = document.createElement("p"); live.className = "visually-hidden"; live.setAttribute("aria-live", "polite"); document.body.appendChild(live); }
    live.textContent = ""; setTimeout(function () { live.textContent = text; }, 30);
  }
  window.MaisonHorizon = { favorites: favorites, setFavorites: function (l) { store.set(l); syncFavorites(); }, announce: announce };

  /* ── Recherche de l'accueil ───────────────────────────────────────────────────────────────────────────────── */
  var BUDGETS = { vente: [150000, 300000, 500000, 750000, 1000000, 1500000, 2000000, 3000000], location: [500, 800, 1000, 1250, 1500, 2000, 2500, 3000] };
  function money(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " €"; }
  function fillBudgets(form, kind) {
    form.querySelectorAll("[data-re-budget]").forEach(function (sel) {
      var first = sel.options[0]; sel.innerHTML = ""; sel.appendChild(first);
      BUDGETS[kind].forEach(function (v) { var o = document.createElement("option"); o.value = String(v); o.textContent = money(v) + (kind === "location" ? " / mois" : ""); sel.appendChild(o); });
    });
  }
  document.querySelectorAll("[data-re-search]").forEach(function (form) {
    var kind = "vente";
    function setKind(k) {
      kind = k;
      form.querySelectorAll("[data-re-tab]").forEach(function (t) { var on = t.getAttribute("data-re-tab") === k; t.classList.toggle("is-active", on); t.setAttribute("aria-selected", on ? "true" : "false"); });
      var url = form.getAttribute(k === "vente" ? "data-buy" : "data-rent");
      if (url) form.setAttribute("action", url);
      fillBudgets(form, k);
    }
    form.querySelectorAll("[data-re-tab]").forEach(function (t) { t.addEventListener("click", function () { setKind(t.getAttribute("data-re-tab")); }); });
    form.addEventListener("submit", function () { form.querySelectorAll("input, select").forEach(function (f) { if (!f.value) f.disabled = true; }); setTimeout(function () { form.querySelectorAll("input, select").forEach(function (f) { f.disabled = false; }); }, 0); });
    setKind(kind);
  });

  /* ── Listes de biens : filtres, tri, pagination ──────────────────────────────────────────────────────────── */
  var FIELDS = ["ville", "type", "max", "min", "surface", "chambres", "meuble", "dispo", "ext", "piscine", "tri", "page"];
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim(); }
  function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
  function matches(card, c) {
    var d = card.dataset, tags = " " + (d.tags || "") + " ";
    if (c.ville && norm(d.city).indexOf(norm(c.ville)) < 0) return false;
    if (c.type && d.type !== c.type) return false;
    var price = num(d.price);
    if (c.max && price !== null && price > +c.max) return false;
    if (c.min && price !== null && price < +c.min) return false;
    if (c.surface && (num(d.surface) || 0) < +c.surface) return false;
    if (c.chambres && (num(d.bedrooms) || 0) < +c.chambres) return false;
    if (c.meuble === "oui" && tags.indexOf(" meuble ") < 0) return false;
    if (c.meuble === "non" && tags.indexOf(" meuble ") >= 0) return false;
    if (c.dispo === "oui" && tags.indexOf(" disponible ") < 0) return false;
    if (c.ext && tags.indexOf(" exterieur ") < 0) return false;
    if (c.piscine && tags.indexOf(" piscine ") < 0) return false;
    return true;
  }
  function sorter(tri) {
    var key = function (c, k) { var n = num(c.dataset[k]); return n === null ? Infinity : n; };
    if (tri === "prix-asc") return function (a, b) { return key(a, "price") - key(b, "price"); };
    if (tri === "prix-desc") return function (a, b) { return key(b, "price") - key(a, "price"); };
    if (tri === "surface-desc") return function (a, b) { return (num(b.dataset.surface) || 0) - (num(a.dataset.surface) || 0); };
    return function (a, b) { return (+a.dataset.order) - (+b.dataset.order); };
  }
  document.querySelectorAll("[data-re-listings]").forEach(function (root) {
    var grid = root.querySelector("[data-re-grid]"); if (!grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll("[data-re-card]"));
    cards.forEach(function (c, i) { c.dataset.order = String(i); });
    var form = root.querySelector("[data-re-filters]"), sortSel = root.querySelector("[data-re-sort]");
    var count = root.querySelector("[data-re-count]"), empty = root.querySelector("[data-re-empty]"), pager = root.querySelector("[data-re-pager]");
    var perPage = +root.getAttribute("data-per-page") || 0, useUrl = root.hasAttribute("data-use-url") && !!form;
    if (!form && !sortSel && !perPage && !count) return;
    var cities = root.querySelector("[data-re-cities]");
    if (cities) { var seen = {}; cards.forEach(function (c) { var name = c.querySelector(".re-card__place"); var city = (name && name.textContent || "").replace(/\s*\(.*$/, "").trim(); if (city && !seen[city]) { seen[city] = 1; var o = document.createElement("option"); o.value = city; cities.appendChild(o); } }); }
    var state = {};
    var defaultCity = root.getAttribute("data-default-city") || "";
    function read() {
      var c = {};
      if (useUrl) { var q = new URLSearchParams(location.search); FIELDS.forEach(function (f) { if (q.get(f)) c[f] = q.get(f); }); }
      if (defaultCity && !Object.keys(c).length && !(history.state && history.state.mh)) c.ville = defaultCity;
      return c;
    }
    /* Carte illustrative : un repère par bien placé ; visible si son bien est dans les résultats d'une ville choisie. */
    var pins = Array.prototype.slice.call(root.querySelectorAll("[data-re-pin]")), hint = root.querySelector("[data-re-map-hint]");
    function syncPins(visible, c) {
      if (!pins.length && !hint) return;
      var refs = {}; visible.forEach(function (card) { refs[card.getAttribute("data-ref")] = 1; });
      var placed = 0;
      pins.forEach(function (pin) { var on = !!c.ville && !!refs[pin.getAttribute("data-re-pin")]; pin.hidden = !on; if (on) placed++; });
      if (hint) { hint.hidden = !!c.ville && placed > 0; if (c.ville && !placed) hint.textContent = "Aucun bien de cette recherche n'est placé sur la carte illustrative."; else hint.textContent = hint.getAttribute("data-default") || hint.textContent; }
    }
    if (hint) hint.setAttribute("data-default", hint.textContent);
    pins.forEach(function (pin) {
      var card = cards.filter(function (c) { return c.getAttribute("data-ref") === pin.getAttribute("data-re-pin"); })[0];
      if (!card) return;
      var on = function () { pin.classList.add("is-active"); card.classList.add("is-active"); }, off = function () { pin.classList.remove("is-active"); card.classList.remove("is-active"); };
      [pin, card].forEach(function (el) { el.addEventListener("mouseenter", on); el.addEventListener("mouseleave", off); el.addEventListener("focusin", on); el.addEventListener("focusout", off); });
    });
    var view = root.querySelector("[data-re-mapview]");
    root.querySelectorAll("[data-re-view]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-re-view");
        if (view) view.setAttribute("data-view", v);
        root.querySelectorAll("[data-re-view]").forEach(function (o) { var on = o === b; o.classList.toggle("is-active", on); o.setAttribute("aria-pressed", on ? "true" : "false"); });
        announce(v === "map" ? "Affichage carte et liste." : "Affichage en liste.");
      });
    });
    var toggle = root.querySelector("[data-re-filters-toggle]");
    if (toggle && form) toggle.addEventListener("click", function () { var open = !form.classList.contains("is-open"); form.classList.toggle("is-open", open); toggle.setAttribute("aria-expanded", open ? "true" : "false"); if (open) { var first = form.querySelector("input, select"); if (first) first.focus(); } });
    function toForm(c) {
      if (form) Array.prototype.forEach.call(form.elements, function (el) { if (!el.name) return; if (el.type === "checkbox") el.checked = !!c[el.name]; else if (c[el.name] !== undefined) el.value = c[el.name]; else el.value = ""; });
      if (sortSel) sortSel.value = c.tri || "";
    }
    function fromForm() {
      var c = {};
      if (form) Array.prototype.forEach.call(form.elements, function (el) { if (!el.name) return; if (el.type === "checkbox") { if (el.checked) c[el.name] = "1"; } else if (el.value) c[el.name] = el.value; });
      if (sortSel && sortSel.value) c.tri = sortSel.value;
      return c;
    }
    function write(c, push) {
      if (!useUrl) return;
      var q = new URLSearchParams(location.search);
      FIELDS.forEach(function (f) { if (c[f]) q.set(f, c[f]); else q.delete(f); });
      var url = location.pathname + (q.toString() ? "?" + q.toString() : "") + location.hash;
      try { history[push ? "pushState" : "replaceState"]({ mh: c }, "", url); } catch (e) { /* adresse non modifiable (aperçu) */ }
    }
    function render(c) {
      state = c;
      var visible = cards.filter(function (card) { return matches(card, c); }).sort(sorter(c.tri));
      visible.forEach(function (card) { grid.appendChild(card); });
      var total = visible.length, page = Math.max(1, +c.page || 1), pages = perPage ? Math.max(1, Math.ceil(total / perPage)) : 1;
      if (page > pages) page = pages;
      cards.forEach(function (card) { card.hidden = true; });
      visible.forEach(function (card, i) { card.hidden = perPage ? (i < (page - 1) * perPage || i >= page * perPage) : false; });
      var shown = visible.filter(function (card) { return !card.hidden; }).length;
      syncPins(visible, c);
      if (count) count.textContent = total === cards.length ? shown + " bien" + (shown > 1 ? "s" : "") + " sur " + total : total + " bien" + (total > 1 ? "s" : "") + " trouvé" + (total > 1 ? "s" : "") + " sur " + cards.length + (perPage && pages > 1 ? " · page " + page + " sur " + pages : "");
      if (empty) empty.hidden = total !== 0;
      if (pager) {
        pager.innerHTML = ""; pager.hidden = !perPage || pages < 2;
        if (!pager.hidden) {
          var mk = function (label, p, current, disabled, aria) { var b = document.createElement("button"); b.type = "button"; b.innerHTML = label; if (aria) b.setAttribute("aria-label", aria); if (current) b.setAttribute("aria-current", "page"); b.disabled = !!disabled; b.addEventListener("click", function () { var n = Object.assign({}, state, { page: String(p) }); if (p === 1) delete n.page; render(n); write(n, true); root.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); }); pager.appendChild(b); };
          mk("&larr;", page - 1, false, page === 1, "Page précédente");
          for (var p = 1; p <= pages; p++) mk(String(p), p, p === page, false, "Page " + p);
          mk("&rarr;", page + 1, false, page === pages, "Page suivante");
        }
      }
    }
    function apply(push) { var c = fromForm(); render(c); write(c, push); }
    if (form) {
      form.addEventListener("submit", function (e) { e.preventDefault(); apply(true); var first = cards.filter(function (c) { return !c.hidden; })[0]; if (first) announce((count && count.textContent) || ""); });
      form.addEventListener("change", function (e) { if (e.target.matches("select, input[type=checkbox]")) apply(false); });
    }
    if (sortSel) sortSel.addEventListener("change", function () { apply(false); });
    root.querySelectorAll("[data-re-reset]").forEach(function (b) { b.addEventListener("click", function () { toForm({}); var c = {}; render(c); write(c, true); }); });
    window.addEventListener("popstate", function () { var c = read(); toForm(c); render(c); });
    var initial = read(); toForm(initial); render(initial);
  });

  syncFavorites();
})();
