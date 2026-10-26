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
  var SKEY = "mh-recherches:" + ((shopMeta && shopMeta.getAttribute("content")) || "boutique");
  var searches = {
    get: function () { try { var v = JSON.parse(localStorage.getItem(SKEY) || "[]"); return Array.isArray(v) ? v.filter(function (x) { return x && typeof x.url === "string" && x.url.charAt(0) === "/"; }) : []; } catch (e) { return []; } },
    set: function (list) { try { localStorage.setItem(SKEY, JSON.stringify(list)); } catch (e) { /* stockage refusé */ } },
  };
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
    document.querySelectorAll("[data-re-fav-total]").forEach(function (c) { c.textContent = String(list.length); });
    document.querySelectorAll("[data-re-fav-word]").forEach(function (c) { c.textContent = list.length > 1 ? "biens enregistrés" : "bien enregistré"; });
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
      var target = form.querySelector('[data-re-target="' + k + '"]');
      if (target && target.getAttribute("href")) form.setAttribute("action", target.getAttribute("href"));
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
    function apply(push) { var c = fromForm(); render(c); write(c, push); remember(c); }
    /* Recherches récentes (tableau de bord « Mon espace ») : gardées dans ce navigateur, cinq au plus. */
    function remember(c) {
      var keys = Object.keys(c).filter(function (k) { return k !== "page" && k !== "tri"; }); if (!keys.length) return;
      var labels = []; if (c.ville) labels.push(c.ville); if (c.type) labels.push(c.type.charAt(0).toUpperCase() + c.type.slice(1)); if (c.max) labels.push("jusqu'à " + money(+c.max)); if (c.surface) labels.push(c.surface + " m² et +"); if (c.chambres) labels.push(c.chambres + " ch. et +"); if (c.meuble === "oui") labels.push("meublé"); if (c.ext) labels.push("extérieur"); if (c.piscine) labels.push("piscine");
      var q = new URLSearchParams(); keys.forEach(function (k) { q.set(k, c[k]); });
      var entry = { kind: root.getAttribute("data-mode"), label: labels.join(" · ") || "Recherche", url: location.pathname + "?" + q.toString(), count: cards.filter(function (card) { return matches(card, c); }).length, at: Date.now() };
      var list = searches.get().filter(function (x) { return x.url !== entry.url; }); list.unshift(entry); searches.set(list.slice(0, 5));
    }
    if (form) {
      form.addEventListener("submit", function (e) { e.preventDefault(); apply(true); var first = cards.filter(function (c) { return !c.hidden; })[0]; if (first) announce((count && count.textContent) || ""); });
      form.addEventListener("change", function (e) { if (e.target.matches("select, input[type=checkbox]")) apply(false); });
    }
    if (sortSel) sortSel.addEventListener("change", function () { apply(false); });
    root.querySelectorAll("[data-re-reset]").forEach(function (b) { b.addEventListener("click", function () { toForm({}); var c = {}; render(c); write(c, true); }); });
    window.addEventListener("popstate", function () { var c = read(); toForm(c); render(c); });
    var initial = read(); toForm(initial); render(initial);
  });

  /* ── Fiche d'un bien : galerie, visionneuse, partage, demande, « voir plus », accordéons ───────────────────── */
  var mobile = window.matchMedia("(max-width: 749px)");
  function openDialog(d) { if (!d) return; if (typeof d.showModal === "function") { if (!d.open) d.showModal(); } else d.setAttribute("open", ""); }
  function closeDialog(d) { if (!d) return; if (typeof d.close === "function" && d.open) d.close(); else d.removeAttribute("open"); }
  document.querySelectorAll("[data-re-bien]").forEach(function (root) {
    var ref = root.getAttribute("data-ref") || "";
    /* Visionneuse : les photos de la galerie dans l'ordre (le plan à part), compteur réel. */
    var lb = root.querySelector("[data-re-lightbox]"), img = lb && lb.querySelector("[data-re-lb-img]"), cap = lb && lb.querySelector("[data-re-lb-caption]"), cnt = lb && lb.querySelector("[data-re-lb-count]");
    var items = Array.prototype.slice.call(root.querySelectorAll("[data-re-lb]"));
    var group = function (g) { return items.filter(function (el) { return (el.getAttribute("data-re-lb-group") || "photos") === g; }); };
    var list = [], at = 0, opener = null;
    function show(i) { if (!list.length) return; at = (i + list.length) % list.length; var el = list[at]; img.src = el.getAttribute("data-re-lb"); img.alt = el.getAttribute("data-re-lb-alt") || ""; cap.textContent = el.getAttribute("data-re-lb-alt") || ""; cnt.textContent = list.length > 1 ? (at + 1) + " / " + list.length : ""; lb.classList.toggle("is-single", list.length < 2); }
    function openAt(g, i, from) { if (!lb) return; list = group(g); opener = from || null; show(i); openDialog(lb); }
    items.forEach(function (el) { el.addEventListener("click", function () { var g = el.getAttribute("data-re-lb-group") || "photos"; openAt(g, group(g).indexOf(el), el); }); });
    root.querySelectorAll("[data-re-lb-open]").forEach(function (b) { b.addEventListener("click", function () { openAt("photos", +b.getAttribute("data-re-lb-open") || 0, b); }); });
    if (lb) {
      lb.querySelector("[data-re-prev]").addEventListener("click", function () { show(at - 1); });
      lb.querySelector("[data-re-next]").addEventListener("click", function () { show(at + 1); });
      lb.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") show(at - 1); if (e.key === "ArrowRight") show(at + 1); });
      lb.addEventListener("click", function (e) { if (e.target === lb) closeDialog(lb); });
      lb.addEventListener("close", function () { if (opener) opener.focus(); });
      var x0 = null; lb.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true }); lb.addEventListener("touchend", function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(at + (dx < 0 ? 1 : -1)); x0 = null; });
    }
    root.querySelectorAll("[data-re-close]").forEach(function (b) { b.addEventListener("click", function () { closeDialog(b.closest("dialog")); }); });
    /* Compteur du défilement (téléphone). */
    var track = root.querySelector("[data-re-track]"), current = root.querySelector("[data-re-current]");
    if (track && current) track.addEventListener("scroll", function () { var w = track.clientWidth || 1; current.textContent = String(Math.min(track.children.length, Math.round(track.scrollLeft / w) + 1)); }, { passive: true });
    /* Bandeau de photos (location). */
    var strip = root.querySelector("[data-re-strip-track]");
    if (strip) { var step = function (d) { strip.scrollBy({ left: d * strip.clientWidth * 0.8, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }; var pv = root.querySelector("[data-re-strip-prev]"), nx = root.querySelector("[data-re-strip-next]"); if (pv) pv.addEventListener("click", function () { step(-1); }); if (nx) nx.addEventListener("click", function () { step(1); }); }
    /* Partage : partage natif du téléphone, sinon lien copié (ou affiché si la copie est refusée). */
    root.querySelectorAll("[data-re-share]").forEach(function (b) {
      b.addEventListener("click", function () {
        var url = location.href.split("#")[0], title = b.getAttribute("data-title") || document.title;
        if (navigator.share) { navigator.share({ title: title, url: url }).catch(function () {}); return; }
        var done = function () { announce("Lien du bien copié."); var t = b.querySelector("span"); if (t) { var old = t.textContent; t.textContent = "Lien copié"; setTimeout(function () { t.textContent = old; }, 2200); } };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { window.prompt("Copiez le lien du bien :", url); });
        else window.prompt("Copiez le lien du bien :", url);
      });
    });
    /* « Voir plus » : description repliée sur téléphone seulement si elle dépasse. */
    var clamp = root.querySelector("[data-re-clamp]"), more = root.querySelector("[data-re-more]");
    function syncClamp() { if (!clamp || !more) return; if (more.getAttribute("aria-expanded") === "true") return; clamp.classList.toggle("is-clamped", mobile.matches); more.hidden = !(mobile.matches && clamp.scrollHeight > clamp.clientHeight + 4); }
    if (more) more.addEventListener("click", function () { var open = more.getAttribute("aria-expanded") !== "true"; more.setAttribute("aria-expanded", open ? "true" : "false"); clamp.classList.toggle("is-clamped", !open); more.firstChild.textContent = open ? "Voir moins " : "Voir plus "; });
    /* Accordéons : ouverts sur ordinateur ; sur téléphone, seul le premier reste ouvert. */
    var accs = Array.prototype.slice.call(root.querySelectorAll("[data-re-acc]"));
    function syncAcc() { accs.forEach(function (d, i) { if (mobile.matches) { if (!d.hasAttribute("data-touched")) d.open = i === 0; } else d.open = true; }); }
    accs.forEach(function (d) { d.querySelector("summary").addEventListener("click", function (e) { if (!mobile.matches) { e.preventDefault(); return; } d.setAttribute("data-touched", ""); }); });
    var syncAll = function () { syncClamp(); syncAcc(); };
    if (mobile.addEventListener) mobile.addEventListener("change", syncAll);
    syncAll();
    /* Demande (visite, rappel, dossier) : vérification avant l'envoi ; en démonstration, rien n'est envoyé. */
    var dialog = root.querySelector("[data-re-dialog]"), form = dialog && dialog.querySelector("form");
    if (dialog && form) {
      form.setAttribute("novalidate", "");
      var title = dialog.querySelector("[data-re-dialog-title]"), mode = form.querySelector("[data-re-mode]"), phone = form.querySelector("[data-re-phone]"), star = form.querySelector("[data-re-phone-required]"), status = form.querySelector("[data-re-status]");
      var asker = null;
      root.querySelectorAll("[data-re-ask]").forEach(function (b) {
        b.addEventListener("click", function () {
          var m = b.getAttribute("data-re-ask"); asker = b;
          mode.value = m; title.textContent = title.getAttribute("data-" + m) || title.textContent;
          var needPhone = m === "rappel"; phone.required = needPhone; star.hidden = !needPhone;
          form.querySelectorAll("[data-re-only]").forEach(function (el) { el.hidden = el.getAttribute("data-re-only") !== m; });
          status.textContent = ""; form.classList.remove("is-done");
          openDialog(dialog); var first = form.querySelector("input:not([type=hidden])"); if (first) first.focus();
        });
      });
      dialog.addEventListener("close", function () { if (asker) asker.focus(); });
      validateForm(form, function () {
        if (status.hasAttribute("data-demo")) { status.textContent = "Demande vérifiée. Ce site est une démonstration : rien n'a été envoyé et aucune visite n'est réservée."; form.classList.add("is-done"); return false; }
        return true;
      });
      if (status.textContent.trim()) openDialog(dialog);
    }
    /* Barre fixe du téléphone : visible une fois l'en-tête de la fiche dépassé. */
    var sticky = root.querySelector("[data-re-sticky]"), head = root.querySelector(".re-bien__facts");
    if (sticky && head && "IntersectionObserver" in window) new IntersectionObserver(function (e) { sticky.classList.toggle("is-visible", !e[0].isIntersecting && e[0].boundingClientRect.top < 0); }).observe(head);
    void ref;
  });

  /* Vérification commune des formulaires Maison & Horizon (champs requis, e-mail, téléphone). `ok` décide de l'envoi. */
  function validateForm(form, ok) {
    var msg = { required: "Ce champ est à remplir.", email: "Saisissez une adresse e-mail valide (ex. : nom@domaine.fr).", phone: "Saisissez un numéro de téléphone valide.", consent: "Cochez cette case pour envoyer votre demande.", choice: "Choisissez une option." };
    function clear(el) { el.removeAttribute("aria-invalid"); var box = el.closest("label, .re-field, fieldset"), err = box && box.querySelector(".re-error"); if (err) err.remove(); el.removeAttribute("aria-describedby"); }
    function fail(el, text, i) { el.setAttribute("aria-invalid", "true"); var box = el.closest("label, .re-field, fieldset"); if (!box) return; var err = box.querySelector(".re-error"); if (!err) { err = document.createElement("span"); err.className = "re-error"; err.id = "re-err-" + i + "-" + Math.random().toString(36).slice(2, 7); box.appendChild(err); } err.textContent = text; el.setAttribute("aria-describedby", err.id); }
    function check(scope) {
      var first = null;
      Array.prototype.forEach.call((scope || form).querySelectorAll("input, select, textarea"), function (el, i) {
        if (el.type === "hidden" || el.type === "submit" || el.disabled || el.closest("[hidden]")) return;
        clear(el);
        var v = el.type === "checkbox" || el.type === "radio" ? (el.type === "radio" ? !!form.querySelector('input[name="' + el.name + '"]:checked') : el.checked) : String(el.value || "").trim(), text = "";
        if (el.required && !v) text = el.type === "checkbox" ? msg.consent : el.type === "radio" || el.tagName === "SELECT" ? msg.choice : msg.required;
        else if (el.type === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) text = msg.email;
        else if (el.type === "tel" && v && !/^[+0-9 ().-]{8,20}$/.test(v)) text = msg.phone;
        if (text) { fail(el, text, i); if (!first) first = el; }
      });
      return first;
    }
    form.addEventListener("input", function (e) { if (e.target.getAttribute("aria-invalid")) clear(e.target); });
    form.addEventListener("submit", function (e) { var bad = check(); if (bad) { e.preventDefault(); bad.focus(); return; } if (!ok()) e.preventDefault(); });
    return check;
  }
  window.MaisonHorizon.validateForm = validateForm;

  /* ── Formulaires de pages (estimation en trois étapes, rappel, contact, alerte) ───────────────────────────── */
  var DEMO_DONE = {
    estimate: "Demande vérifiée. Ce site est une démonstration : rien n'a été envoyé et aucune estimation n'est calculée en ligne.",
    callback: "Demande vérifiée. Ce site est une démonstration : rien n'a été envoyé et aucun rappel n'est programmé.",
    contact: "Message vérifié. Ce site est une démonstration : rien n'a été envoyé.",
    alert: "Critères vérifiés. Ce site est une démonstration : aucune alerte n'est créée et aucun e-mail ne sera envoyé.",
  };
  document.querySelectorAll(".re-form-section form").forEach(function (form) {
    form.setAttribute("novalidate", "");
    var status = form.querySelector("[data-re-status]"), kind = status ? status.getAttribute("data-kind") : "contact";
    var check = validateForm(form, function () {
      if (status && status.hasAttribute("data-demo")) { status.textContent = DEMO_DONE[kind] || DEMO_DONE.contact; form.classList.add("is-done"); status.focus && status.setAttribute("tabindex", "-1"); status.focus(); return false; }
      return true;
    });
    var steps = Array.prototype.slice.call(form.querySelectorAll("[data-re-step]")), marks = Array.prototype.slice.call(form.querySelectorAll("[data-re-stepper] li"));
    if (!steps.length) return;
    var at = 0;
    function go(i) {
      at = i;
      steps.forEach(function (st, j) { st.hidden = j !== i; });
      marks.forEach(function (m, j) { m.classList.toggle("is-current", j === i); m.classList.toggle("is-done", j < i); if (j === i) m.setAttribute("aria-current", "step"); else m.removeAttribute("aria-current"); });
      var first = steps[i].querySelector("input:not([type=hidden]), select, textarea"); if (first) first.focus();
      announce("Étape " + (i + 1) + " sur " + steps.length + " : " + (marks[i] ? marks[i].textContent.replace(/^\d+/, "").trim() : ""));
    }
    form.querySelectorAll("[data-re-next-step]").forEach(function (b) { b.addEventListener("click", function () { var bad = check(steps[at]); if (bad) { bad.focus(); return; } go(Math.min(steps.length - 1, at + 1)); }); });
    form.querySelectorAll("[data-re-prev-step]").forEach(function (b) { b.addEventListener("click", function () { go(Math.max(0, at - 1)); }); });
    form.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.tagName === "INPUT" && at < steps.length - 1) { e.preventDefault(); var next = steps[at].querySelector("[data-re-next-step]"); if (next) next.click(); } });
  });

  /* ── Favoris : biens de la liste, retrait, comparaison ──────────────────────────────────────────────────── */
  document.querySelectorAll("[data-re-favorites]").forEach(function (root) {
    var items = Array.prototype.slice.call(root.querySelectorAll("[data-re-fav-item]")), empty = root.querySelector("[data-re-fav-empty]");
    var cmpBtn = root.querySelector("[data-re-compare]"), table = root.querySelector("[data-re-compare-table]");
    function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    function buildTable(refs) {
      var cards = refs.map(function (r) { var it = items.filter(function (i) { return i.getAttribute("data-re-fav-item") === r; })[0]; return it && it.querySelector("[data-re-card]"); }).filter(Boolean);
      var row = function (label, fn) { return "<tr><th scope=\"row\">" + label + "</th>" + cards.map(function (c) { return "<td>" + fn(c) + "</td>"; }).join("") + "</tr>"; };
      var d = function (c, k) { return c.getAttribute("data-" + k) || ""; };
      var place = function (c) { var p = c.querySelector(".re-card__place"); return p ? p.textContent : ""; };
      var img = function (c) { var i = c.querySelector("img"); return i ? "<img src=\"" + esc(i.currentSrc || i.src) + "\" alt=\"\" loading=\"lazy\">" : ""; };
      table.innerHTML = "<div class=\"re-compare__scroll\"><table class=\"re-table re-compare__table\"><caption class=\"visually-hidden\">Comparaison des biens favoris</caption><thead><tr><th scope=\"col\"><span class=\"visually-hidden\">Critère</span></th>" + cards.map(function (c) { return "<th scope=\"col\">" + img(c) + "<a href=\"" + esc(d(c, "url")) + "\">" + esc(d(c, "title")) + "</a></th>"; }).join("") + "</tr></thead><tbody>" +
        row("Transaction", function (c) { return d(c, "transaction") === "location" ? "Location" : "Vente"; }) +
        row("Prix ou loyer", function (c) { return esc(d(c, "amount")); }) +
        row("Lieu", function (c) { return esc(place(c)); }) +
        row("Type", function (c) { var t = d(c, "type"); return esc(t.charAt(0).toUpperCase() + t.slice(1)); }) +
        row("Surface", function (c) { return d(c, "surface") ? esc(d(c, "surface")) + " m²" : "—"; }) +
        row("Pièces", function (c) { return esc(d(c, "rooms") || "—"); }) +
        row("Chambres", function (c) { return esc(d(c, "bedrooms") || "—"); }) +
        row("Extérieur", function (c) { return (" " + d(c, "tags") + " ").indexOf(" exterieur ") >= 0 ? "Oui" : "—"; }) +
        row("Piscine", function (c) { return (" " + d(c, "tags") + " ").indexOf(" piscine ") >= 0 ? "Oui" : "—"; }) +
        "</tbody></table></div><p class=\"re-note\">Données des fiches. Les montants des biens à louer sont hors charges.</p>";
    }
    function sync() {
      var list = favorites(), shown = 0;
      items.forEach(function (it) { var on = list.indexOf(it.getAttribute("data-re-fav-item")) >= 0; it.hidden = !on; if (on) shown++; });
      if (empty) empty.hidden = shown > 0;
      if (cmpBtn) { cmpBtn.disabled = shown < 2; if (shown < 2 && table) { table.hidden = true; cmpBtn.setAttribute("aria-expanded", "false"); } else if (!table.hidden) buildTable(list.filter(function (r) { return items.some(function (i) { return i.getAttribute("data-re-fav-item") === r; }); })); }
    }
    if (cmpBtn && table) cmpBtn.addEventListener("click", function () {
      var open = table.hidden; table.hidden = !open; cmpBtn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) { buildTable(favorites().filter(function (r) { return items.some(function (i) { return i.getAttribute("data-re-fav-item") === r; }); })); table.focus(); }
    });
    document.addEventListener("mh:favorites", sync);
    sync();
  });

  /* ── Mon espace : onglets, mot de passe, formulaires sans compte, tableau de bord ─────────────────────── */
  function tabs(group, onSelect) {
    var list = Array.prototype.slice.call(group.querySelectorAll('[role="tab"]'));
    function select(t, focus) { list.forEach(function (o) { var on = o === t; o.classList.toggle("is-active", on); o.setAttribute("aria-selected", on ? "true" : "false"); o.tabIndex = on ? 0 : -1; var panel = document.getElementById(o.getAttribute("aria-controls")); if (panel) panel.hidden = !on; }); if (focus) t.focus(); if (onSelect) onSelect(t); }
    list.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) { var j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : null; if (j === null) return; e.preventDefault(); select(list[(j + list.length) % list.length], true); });
    });
    return { select: select, list: list };
  }
  document.querySelectorAll("[data-re-account]").forEach(function (root) {
    var tl = root.querySelector('[role="tablist"]'); if (tl) tabs(tl);
    root.querySelectorAll("[data-re-password]").forEach(function (b) { b.addEventListener("click", function () { var input = b.parentElement.querySelector("input"); var show = input.type === "password"; input.type = show ? "text" : "password"; b.setAttribute("aria-pressed", show ? "true" : "false"); b.setAttribute("aria-label", show ? "Masquer le mot de passe" : "Afficher le mot de passe"); }); });
    root.querySelectorAll("[data-re-account-form]").forEach(function (form) {
      form.setAttribute("novalidate", "");
      var status = form.querySelector("[data-re-account-status]");
      validateForm(form, function () { if (status) status.textContent = "Saisie vérifiée, mais la connexion n'est pas disponible sur ce site : aucun compte n'est créé ni ouvert."; return false; });
    });
    var total = root.querySelector("[data-re-searches-total]"), ul = root.querySelector("[data-re-searches]"), none = root.querySelector("[data-re-searches-empty]");
    function drawSearches() {
      if (!ul) return; var list = searches.get(); ul.innerHTML = "";
      list.forEach(function (x) { var li = document.createElement("li"); var a = document.createElement("a"); a.href = x.url; a.textContent = (x.kind === "location" ? "Location · " : "Achat · ") + x.label; var small = document.createElement("small"); small.textContent = x.count + " bien" + (x.count > 1 ? "s" : "") + " au moment de la recherche"; li.appendChild(a); li.appendChild(small); ul.appendChild(li); });
      if (total) total.textContent = String(list.length); if (none) none.hidden = list.length > 0; ul.hidden = !list.length;
    }
    drawSearches();
    var forget = root.querySelector("[data-re-forget]");
    if (forget) forget.addEventListener("click", function () { if (!window.confirm("Effacer les favoris et les recherches récentes gardés dans ce navigateur ?")) return; searches.set([]); window.MaisonHorizon.setFavorites([]); drawSearches(); announce("Données de ce navigateur effacées."); });
  });

  /* ── Informations légales : onglets, ouverture par l'adresse (#honoraires…) ───────────────────────────── */
  document.querySelectorAll("[data-re-legal]").forEach(function (root) {
    var tl = root.querySelector('[role="tablist"]'); if (!tl) return;
    var t = tabs(tl, function (tab) { var id = tab.getAttribute("data-re-legal-tab"); try { history.replaceState(history.state, "", "#" + id); } catch (e) { /* aperçu */ } });
    function fromHash() { var id = (location.hash || "").slice(1) || root.getAttribute("data-initial"); var tab = t.list.filter(function (x) { return x.getAttribute("data-re-legal-tab") === id; })[0]; if (tab) t.select(tab); }
    window.addEventListener("hashchange", fromHash); fromHash();
  });

  /* ── Tuiles filtrables (conseils) ─────────────────────────────────────────────────────────────────────── */
  document.querySelectorAll("[data-re-tile-filters]").forEach(function (bar) {
    var list = bar.parentElement.querySelector("[data-re-tile-list]"); if (!list) return;
    var tiles = Array.prototype.slice.call(list.children);
    bar.querySelectorAll("[data-re-tile-filter]").forEach(function (b) {
      b.addEventListener("click", function () {
        var tag = b.getAttribute("data-re-tile-filter"), n = 0;
        bar.querySelectorAll("[data-re-tile-filter]").forEach(function (o) { var on = o === b; o.classList.toggle("is-active", on); o.setAttribute("aria-pressed", on ? "true" : "false"); });
        tiles.forEach(function (t) { var on = !tag || t.getAttribute("data-tag") === tag; t.hidden = !on; if (on) n++; });
        announce(n + " article" + (n > 1 ? "s" : "") + (tag ? " : " + tag : ""));
      });
    });
  });

  syncFavorites();
})();
