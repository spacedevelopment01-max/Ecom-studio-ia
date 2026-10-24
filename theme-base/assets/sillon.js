/*
 * SILLON V2 — comportements des sections sv-* : en-tête flottant (place sous une barre du haut, menu plein écran du
 * téléphone), cookies (rien de facultatif avant l'accord), panier (ajout, quantités, suppression, compteur), fiche
 * (galerie, zoom, variantes, barre d'achat), commande de démonstration, carnet (filtres), article (sommaire),
 * questions (recherche, filtres, accordéons), formulaires et suivi (démonstration annoncée, jamais un faux envoi).
 */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var CFG = (function () { try { return JSON.parse(($('#sv-config') || {}).textContent || '{}'); } catch (e) { return {}; } })();
  var T = CFG.texts || {};
  var LS = (function () { try { localStorage.setItem('sv-t', '1'); localStorage.removeItem('sv-t'); return localStorage; } catch (e) { return null; } })();
  var SS = (function () { try { sessionStorage.setItem('sv-t', '1'); sessionStorage.removeItem('sv-t'); return sessionStorage; } catch (e) { return null; } })();
  function readJSON(store, key, d) { try { var v = store && store.getItem(key); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function writeJSON(store, key, v) { try { if (store) store.setItem(key, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /** Prix en centimes → « 129 € » (format de la boutique). */
  function money(cents) {
    var v = (Number(cents) || 0) / 100, fmt = CFG.money || '{{amount_with_comma_separator}} €';
    var s = v % 1 ? v.toFixed(2) : String(v); /* « 129 € » pour un montant rond, comme le thème */
    return fmt.replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, s.replace('.', ',')).replace(/\{\{\s*amount_no_decimals\s*\}\}/, String(Math.round(v))).replace(/\{\{\s*amount\s*\}\}/, s);
  }
  function announce(msg) {
    var live = $('#sv-live');
    if (!live) { live = document.createElement('p'); live.id = 'sv-live'; live.className = 'visually-hidden'; live.setAttribute('role', 'status'); document.body.appendChild(live); }
    live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30);
  }

  /* ---------------------------------------------------------------- En-tête : sous une barre du haut éventuelle */
  function placeHeader() {
    var top = 0;
    $$('.es-announcement-section:not([hidden]), [data-es-top-bar]').forEach(function (n) { var r = n.getBoundingClientRect(); if (r.height && r.top < 4) top = Math.max(top, r.bottom + window.scrollY); });
    document.body.style.setProperty('--sv-top', top + 'px');
  }

  /* ---------------------------------------------------------------- Menu plein écran (téléphone) */
  function trap(box, e) {
    var f = $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', box).filter(function (n) { return n.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function initMenu() {
    var menu = $('[data-sv-menu]'), open = $('[data-sv-menu-open]');
    if (!menu || !open) return;
    var close = $('[data-sv-menu-close]', menu);
    function show() { menu.hidden = false; open.setAttribute('aria-expanded', 'true'); document.documentElement.style.overflow = 'hidden'; close.focus(); }
    function hide() { menu.hidden = true; open.setAttribute('aria-expanded', 'false'); document.documentElement.style.overflow = ''; open.focus(); }
    open.addEventListener('click', show);
    close.addEventListener('click', hide);
    menu.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); else if (e.key === 'Tab') trap(menu, e); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { menu.hidden = true; document.documentElement.style.overflow = ''; }); });
  }

  /* ---------------------------------------------------------------- Cookies : rien de facultatif avant l'accord */
  var COOKIE_KEY = 'sv-cookies';
  function initCookies() {
    var box = $('[data-sv-cookies]');
    if (!box) return;
    var saved = readJSON(LS, COOKIE_KEY, null);
    function save(stats) { writeJSON(LS, COOKIE_KEY, { necessary: true, stats: !!stats, at: new Date().toISOString() }); box.hidden = true; document.dispatchEvent(new CustomEvent('sv:consent', { detail: { stats: !!stats } })); }
    function show() { box.hidden = false; var st = $('[data-sv-cookies-stats]', box); var cur = readJSON(LS, COOKIE_KEY, null); if (st) st.checked = !!(cur && cur.stats); }
    if (!saved || !saved.at) show();
    $('[data-sv-cookies-accept]', box).addEventListener('click', function () { save(true); });
    $('[data-sv-cookies-refuse]', box).addEventListener('click', function () { save(false); });
    var custom = $('[data-sv-cookies-custom]', box), prefs = $('.sv-cookies__prefs', box), saveBtn = $('[data-sv-cookies-save]', box);
    custom.addEventListener('click', function () { var o = custom.getAttribute('aria-expanded') !== 'true'; custom.setAttribute('aria-expanded', String(o)); prefs.hidden = !o; saveBtn.hidden = !o; });
    saveBtn.addEventListener('click', function () { save($('[data-sv-cookies-stats]', box).checked); });
    $$('[data-sv-cookies-open]').forEach(function (b) { b.addEventListener('click', show); });
  }

  /* ---------------------------------------------------------------- Inscriptions : démonstration annoncée */
  function initNewsletter() {
    $$('form[data-sv-news]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        var input = $('input[type="email"]', form), status = $('[data-sv-status]', form);
        if (!input.checkValidity()) return;
        if (!CFG.demo) return;
        e.preventDefault();
        if (status) { status.hidden = false; status.textContent = form.getAttribute('data-demo-text') || 'Démonstration : aucune inscription n’est transmise.'; }
        input.value = '';
      });
    });
  }


  /* ---------------------------------------------------------------- Panier : ajout, compteur, changements */
  function cartBase() { return String(CFG.cartUrl || '/cart').replace(/\/+$/, ''); }
  function setCount(n) { $$('[data-sv-count]').forEach(function (el) { el.textContent = n; el.hidden = !n; }); }
  function post(path, body) {
    return fetch(cartBase() + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw j; return j; }); });
  }
  /** Ajoute `qty` exemplaires (un appel par exemplaire : fonctionne aussi dans l'aperçu statique précalculé). */
  function addToCart(id, qty) {
    var n = Math.max(1, Math.min(12, Number(qty) || 1)), chain = Promise.resolve();
    for (var i = 0; i < n; i++) chain = chain.then(function () { return post('/add.js', { id: Number(id), quantity: 1 }); });
    return chain.then(function () { return fetch(cartBase() + '.js', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }).catch(function () { return null; }); })
      .then(function (cart) { if (cart && cart.item_count != null) setCount(cart.item_count); return cart; });
  }

  /* ---------------------------------------------------------------- Fiche : galerie, zoom, variante, quantité, ajout */
  function initProduct(root) {
    var thumbs = $$('[data-sv-thumb]', root), views = $$('[data-sv-view]', root);
    thumbs.forEach(function (t) {
      t.addEventListener('click', function () {
        var i = t.getAttribute('data-sv-thumb');
        thumbs.forEach(function (x) { var on = x === t; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); });
        views.forEach(function (v) { var on = v.getAttribute('data-sv-view') === i; v.hidden = !on; v.classList.toggle('is-active', on); });
      });
    });
    var lb = $('[data-sv-lightbox]', root), lbImg = lb && $('[data-sv-lightbox-img]', lb), opener = null;
    function closeLb() { lb.hidden = true; document.documentElement.style.overflow = ''; if (opener) opener.focus(); }
    views.forEach(function (v) {
      v.addEventListener('click', function () { if (!lb) return; opener = v; lbImg.src = v.getAttribute('data-sv-zoom-src'); lbImg.alt = ($('img', v) || {}).alt || ''; lb.hidden = false; document.documentElement.style.overflow = 'hidden'; $('[data-sv-lightbox-close]', lb).focus(); });
    });
    if (lb) {
      $('[data-sv-lightbox-close]', lb).addEventListener('click', closeLb);
      lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
      lb.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLb(); else if (e.key === 'Tab') { e.preventDefault(); $('[data-sv-lightbox-close]', lb).focus(); } });
    }
    var form = $('[data-sv-add]', root);
    if (!form) return;
    var idInput = $('[data-sv-variant]', form), qtyInput = $('[data-sv-qty-input]', form), status = $('[data-sv-status]', form), btn = $('[data-sv-add-btn]', form);
    $$('input[name="sv-variant"]', form).forEach(function (r) {
      r.addEventListener('change', function () {
        idInput.value = r.value;
        var name = $('[data-sv-variant-name]', form); if (name) name.textContent = r.getAttribute('data-title');
        $$('[data-sv-price]').forEach(function (n) { n.textContent = money(r.getAttribute('data-price')); });
        $$('[data-sv-buybar-add]').forEach(function (b) { b.setAttribute('data-variant', r.value); });
      });
    });
    $$('[data-sv-qty]', form).forEach(function (b) {
      b.addEventListener('click', function () { qtyInput.value = Math.max(1, Math.min(12, (Number(qtyInput.value) || 1) + Number(b.getAttribute('data-sv-qty')))); });
    });
    qtyInput.addEventListener('change', function () { qtyInput.value = Math.max(1, Math.min(12, Math.round(Number(qtyInput.value) || 1))); });
    function submit(e) {
      if (e) e.preventDefault();
      if (btn.disabled) return;
      btn.setAttribute('aria-busy', 'true'); btn.disabled = true; status.textContent = '';
      addToCart(idInput.value, qtyInput.value).then(function () { status.textContent = T.added || 'Ajouté au panier.'; announce(status.textContent); })
        .catch(function (err) { status.textContent = (err && err.description) || T.error || 'Erreur'; })
        .then(function () { btn.disabled = false; btn.removeAttribute('aria-busy'); });
    }
    form.addEventListener('submit', submit);
    /* Barre d'achat : visible quand la carte d'achat est hors de l'écran ; même variante, même quantité. */
    var bar = $('[data-sv-buybar]'), card = $('.sv-product__card', root);
    if (bar && card && 'IntersectionObserver' in window) {
      var visible = true, typing = false;
      var upd = function () { bar.hidden = visible || typing; };
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; upd(); }).observe(card);
      document.addEventListener('focusin', function (e) { typing = !!(e.target.closest && e.target.closest('input, textarea, select')) && !e.target.closest('[data-sv-buybar]'); upd(); });
      document.addEventListener('focusout', function () { typing = false; upd(); });
      $('[data-sv-buybar-add]', bar).addEventListener('click', function () { submit(); bar.querySelector('[data-sv-buybar-add]').blur(); });
    } else if (bar) bar.hidden = false;
  }


  /* ---------------------------------------------------------------- Carnet : filtres reliés aux catégories */
  function initJournal(root) {
    var pills = $$('[data-sv-filter]', root), items = $$('[data-cat]', root), empty = $('[data-sv-empty]', root), live = $('[data-sv-count-status]', root);
    pills.forEach(function (b) {
      b.addEventListener('click', function () {
        var cat = b.getAttribute('data-sv-filter'), shown = 0;
        pills.forEach(function (x) { var on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); });
        items.forEach(function (it) { var on = !cat || it.getAttribute('data-cat') === cat; it.hidden = !on; if (on) shown++; });
        root.classList.toggle('is-filtered', !!cat);
        if (empty) empty.hidden = shown > 0;
        if (live) live.textContent = shown + (shown > 1 ? ' articles' : ' article');
      });
    });
  }

  function start() {
    placeHeader();
    window.addEventListener('resize', placeHeader);
    initMenu();
    initCookies();
    initNewsletter();
    $$('[data-sv-product]').forEach(initProduct);
    $$('[data-sv-journal]').forEach(initJournal);
    document.dispatchEvent(new CustomEvent('sv:ready'));
  }
  window.SV = { addToCart: addToCart, post: post, cartBase: cartBase, setCount: setCount, $: $, $$: $$, CFG: CFG, T: T, LS: LS, SS: SS, readJSON: readJSON, writeJSON: writeJSON, esc: esc, money: money, announce: announce, trap: trap };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
