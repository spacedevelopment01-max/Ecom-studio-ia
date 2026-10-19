/* Aperçu statique de démonstration (FRAISE / ONDE) : rejoue les états du panier rendus par le serveur réel du studio.
   Le thème (theme.js, purchase-offers.js) reste inchangé : ce script répond à ses appels réseau avec les réponses
   enregistrées, intercepte les formulaires (panier, recherche, contact, newsletter) et affiche une mention d'aperçu.
   Aucun paiement, aucun envoi : toute action hors des états pré-calculés affiche un message explicite. */
(function () {
  'use strict';
  var KEY = 'es-static-cart', limitMsg = 'Aperçu statique : cette combinaison n’a pas été pré-calculée (12 articles ou 3 lignes au plus). Retirez une ligne pour continuer.';
  var transitions = null, cache = {};
  function sync(url) { try { var x = new XMLHttpRequest(); x.open('GET', url, false); x.send(null); return x.status === 200 || x.status === 0 ? x.responseText : null; } catch (e) { return null; } }
  function load(url) { if (cache[url]) return cache[url]; var t = sync(url); cache[url] = t ? JSON.parse(t) : null; return cache[url]; }
  function graph() { return transitions || (transitions = load('panier/transitions.json')); }
  function stateKey() { try { return localStorage.getItem(KEY) || 'vide'; } catch (e) { return 'vide'; } }
  function setState(k) { try { localStorage.setItem(KEY, k); } catch (e) { /* mémoire indisponible : état non conservé */ } }
  function state(k) { var g = graph(); if (!g || !g.files[k]) { setState('vide'); k = 'vide'; } return load(g.files[k]); }
  function note(text) { var n = document.getElementById('es-static-note'); if (!n) return; var m = document.createElement('p'); m.className = 'es-static-note__msg'; m.setAttribute('role', 'status'); m.textContent = text; n.appendChild(m); setTimeout(function () { m.remove(); }, 6000); }

  /* Mention d'aperçu : puce discrète, repliable d'un geste, qui se décale au-dessus d'une barre d'achat fixe et ne couvre jamais un bouton. */
  function banner() {
    if (document.getElementById('es-static-note')) return;
    var s = document.createElement('style'); s.textContent = 'body:has(.es-drawer.is-open) #es-static-note,body:has(dialog[open]) #es-static-note{display:none}#es-static-note{position:fixed;right:10px;bottom:calc(10px + var(--es-static-offset,0px));z-index:9999;max-width:min(92vw,420px);font:600 12px/1.35 system-ui,sans-serif;transition:bottom .25s}#es-static-note .es-static-note__tag{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:rgba(17,17,17,.88);color:#fff;border:0;cursor:pointer;font:inherit;box-shadow:0 8px 24px -12px rgba(0,0,0,.6)}#es-static-note .es-static-note__tag:focus-visible{outline:3px solid #fff;outline-offset:2px}#es-static-note.is-compact .es-static-note__text{display:none}#es-static-note .es-static-note__msg{margin:8px 0 0;padding:10px 12px;border-radius:12px;background:#fff;color:#111;border:1px solid #ddd;box-shadow:0 10px 30px -14px rgba(0,0,0,.5)}@media(prefers-reduced-motion:reduce){#es-static-note{transition:none}}';
    document.head.appendChild(s);
    var n = document.createElement('div'); n.id = 'es-static-note'; n.className = 'is-compact';
    n.innerHTML = '<button type="button" class="es-static-note__tag" aria-expanded="false" aria-label="Aperçu de démonstration : détails"><span aria-hidden="true">ⓘ</span><span class="es-static-note__short">Démo</span><span class="es-static-note__text"> · aperçu statique · paiement désactivé · données fictives</span></button>';
    document.body.appendChild(n);
    var tag = n.querySelector('.es-static-note__tag'); tag.addEventListener('click', function () { var open = n.classList.toggle('is-compact'); tag.setAttribute('aria-expanded', open ? 'false' : 'true'); });
    /* Décalage au-dessus d'une barre d'achat fixe visible (fiche produit sur téléphone). */
    function offset() { var bars = document.querySelectorAll('.es-sticky-buy.is-visible, [data-purchase-bar]:not([hidden])'); var h = 0; Array.prototype.forEach.call(bars, function (b) { var r = b.getBoundingClientRect(); if (r.height > 0 && r.bottom > innerHeight - 4 && getComputedStyle(b).visibility !== 'hidden') h = Math.max(h, r.height); }); document.documentElement.style.setProperty('--es-static-offset', h + 'px'); }
    /* Enveloppe (visualiseur qui affiche l'aperçu dans un cadre haut : c'est la page parente qui défile) : une NOUVELLE page
       doit s'ouvrir en haut. Uniquement à l'arrivée sur une page, sans ancre, hors précédent/suivant (le navigateur restaure
       alors la position) ; jamais au re-rendu d'une section ni au panier : rien d'autre n'appelle ce code. */
    (function () {
      if (window.self === window.top || location.hash) return;
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      if (nav && nav.type === 'back_forward') return;
      var top = function () { try { document.documentElement.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' }); } catch (e) { document.documentElement.scrollIntoView(true); } };
      top(); window.addEventListener('load', function () { top(); setTimeout(top, 120); }, { once: true });
    })();
    offset(); setInterval(offset, 600); window.addEventListener('scroll', offset, { passive: true }); window.addEventListener('resize', offset);
  }

  /* Page panier : la page enregistrée pour l'état courant remplace la page vide servie par défaut. */
  var current = stateKey();
  var pageState = document.documentElement.getAttribute('data-static-state');
  /* Pendant l'analyse de la page (scripts du thème différés), on remplace le contenu principal par celui de l'état
     courant, rendu par le serveur : pas de document.write (inopérant tant que l'analyseur est actif). */
  if (pageState !== null && pageState !== current) {
    var st0 = state(current);
    if (st0 && st0.page) {
      var doc0 = new DOMParser().parseFromString(st0.page, 'text/html'), main0 = document.querySelector('main'), fresh0 = doc0.querySelector('main');
      if (main0 && fresh0) { main0.innerHTML = fresh0.innerHTML; document.documentElement.setAttribute('data-static-state', current); document.title = doc0.title || document.title; }
    }
  }
  /* Tiroir et compteur : état courant appliqué avant l'initialisation du thème (scripts différés). */
  function applyDrawer(st) {
    var d = document.querySelector('[data-cart-drawer]'); if (!d || !st) return;
    var tmp = document.createElement('div'); tmp.innerHTML = st.drawer; var fresh = tmp.querySelector('[data-cart-drawer]');
    var panel = d.querySelector('.es-drawer__panel'), newPanel = fresh && fresh.querySelector('.es-drawer__panel'); if (panel && newPanel) panel.innerHTML = newPanel.innerHTML;
    var count = st.cart && st.cart.item_count || 0; Array.prototype.forEach.call(document.querySelectorAll('[data-cart-count]'), function (el) { el.textContent = count; el.hidden = !count; });
  }
  if (current !== 'vide') applyDrawer(state(current));

  /* Réponses enregistrées aux appels du thème. */
  function json(obj, status) { return new Response(JSON.stringify(obj), { status: status || 200, headers: { 'Content-Type': 'application/json' } }); }
  function apply(action) {
    var g = graph(); var from = stateKey(); var to = g && g.edges[from] && g.edges[from][action];
    if (!to) return null;
    if (to === from && action.indexOf('change:') !== 0) { note(limitMsg); }
    setState(to); return state(to);
  }
  async function bodyOf(init) { var b = init && init.body; if (!b) return {}; if (typeof b === 'string') { try { return JSON.parse(b); } catch (e) { return Object.fromEntries(new URLSearchParams(b)); } } if (b instanceof FormData || b instanceof URLSearchParams) { var o = {}; b.forEach(function (v, k) { o[k] = v; }); return o; } return {}; }
  var realFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    var url = typeof input === 'string' ? input : input.url;
    var isAdd = /panier\.html\/add(\.js)?(\?|$)/.test(url);
    var isChange = /panier\.html\/change(\.js)?(\?|$)/.test(url);
    var isCartJs = /panier\.html\.js(\?|$)/.test(url);
    if (isAdd) {
      var data = await bodyOf(init); var action = data.offer ? 'add:offer:' + data.offer : 'add:id:' + (data.id || (data.items && data.items[0] && data.items[0].id)) + ':' + Number(data.quantity || (data.items && data.items[0] && data.items[0].quantity) || 1);
      var st = apply(action); if (!st) { note(limitMsg); return json({ description: limitMsg }, 422); }
      return json(Object.assign({}, st.cart, { sections: { 'cart-drawer': st.drawer } }));
    }
    if (isChange) { var d2 = await bodyOf(init); var st2 = apply('change:' + d2.id + ':' + Number(d2.quantity)); if (!st2) { note(limitMsg); return json({ description: limitMsg }, 422); } return json(Object.assign({}, st2.cart, { sections: { 'cart-drawer': st2.drawer } })); }
    if (isCartJs) { var st3 = state(stateKey()); return json(st3 ? st3.cart : { item_count: 0, items: [] }); }
    return realFetch(input, init);
  };

  /* Liens « Retirer » de la page panier (GET /cart/change?line=N&quantity=0 côté serveur). */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href*="panier.html/change"]'); if (!a) return;
    e.preventDefault(); var p = new URLSearchParams(a.getAttribute('href').split('?')[1] || ''); var st = state(stateKey()), items = st && st.cart ? st.cart.items : [];
    var key = p.get('id') || (p.get('line') && items[Number(p.get('line')) - 1] && items[Number(p.get('line')) - 1].key); if (!key) return;
    var r = apply('change:' + key + ':' + Number(p.get('quantity') || 0)); if (!r) { note(limitMsg); return; } location.href = 'panier.html';
  });
  document.addEventListener('DOMContentLoaded', banner);
  /* Formulaires (délégués au document : le contenu principal peut être remplacé par un état enregistré). */
  document.addEventListener('submit', function (e) {
    var form = e.target; if (!form || form.tagName !== 'FORM') return;
    if (form.hasAttribute('data-product-form') || form.closest('[data-purchase]')) return; /* gérés par le thème */
    if (form.id === 'CartForm') {
      e.preventDefault(); if (e.submitter && e.submitter.name === 'checkout') { note('Paiement désactivé dans cet aperçu de démonstration.'); return; }
      var inputs = form.querySelectorAll('input[name="updates[]"]'), st = state(stateKey()), items = st && st.cart ? st.cart.items : [];
      for (var i = 0; i < inputs.length && i < items.length; i++) { var want = Number(inputs[i].value); if (want !== items[i].quantity) { var r = apply('change:' + items[i].key + ':' + want); if (!r) { note(limitMsg); return; } } }
      location.href = 'panier.html'; return;
    }
    if (form.id === 'CartDrawerForm') { e.preventDefault(); note('Paiement désactivé dans cet aperçu de démonstration.'); return; }
    if (form.getAttribute('role') === 'search' || form.classList.contains('es-search__form')) {
      e.preventDefault(); var q = (form.querySelector('input[name="q"]') || {}).value || '', title = window.__esStaticProduct || '', term = q.trim().toLowerCase();
      var hit = term && (title.toLowerCase().indexOf(term) >= 0 || (term.length >= 3 && title.toLowerCase().split(/\s+/).some(function (w) { return w.indexOf(term) === 0; })));
      var html = sync(hit ? 'recherche-resultat.html' : 'recherche-aucun.html'); if (!html) return;
      var doc = new DOMParser().parseFromString(html.replace(/xqzv/g, q.replace(/[<>&"]/g, '')), 'text/html'), main = document.querySelector('main'), fresh = doc.querySelector('main');
      if (main && fresh) { main.innerHTML = fresh.innerHTML; var input = main.querySelector('input[name="q"]'); if (input) input.value = q; }
      return;
    }
    e.preventDefault(); note('Formulaire vérifié. Dans cet aperçu statique, rien n’est envoyé ni enregistré.');
  });
})();
