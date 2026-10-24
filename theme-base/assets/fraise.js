/*
 * FRAISE GUMMIES — comportements des sections fg-* : menu du téléphone, recherche (destinations du site), cookies (rien
 * de facultatif avant l'accord), offres par lots (calculs identiques au snippet fg-offer), panier et tiroir (ajout du
 * BON lot, quantités de lots, unités au total, suppression, compteur), fiche (galerie, zoom, formats, quantité, barre
 * d'achat), commande de démonstration (quatre étapes, aucun paiement), journal (filtres), questions (recherche, filtres,
 * accordéons), formulaires et suivi (démonstration annoncée, jamais un faux envoi).
 */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var CFG = (function () { try { return JSON.parse(($('#fg-config') || {}).textContent || '{}'); } catch (e) { return {}; } })();
  var T = CFG.texts || {}, O = CFG.offers || {};
  var LS = (function () { try { localStorage.setItem('fg-t', '1'); localStorage.removeItem('fg-t'); return localStorage; } catch (e) { return null; } })();
  var SS = (function () { try { sessionStorage.setItem('fg-t', '1'); sessionStorage.removeItem('fg-t'); return sessionStorage; } catch (e) { return null; } })();
  function readJSON(store, key, d) { try { var v = store && store.getItem(key); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function writeJSON(store, key, v) { try { if (store) store.setItem(key, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  /** Prix en centimes → « 16,60 € » (format de la boutique). */
  function money(cents) {
    var v = (Number(cents) || 0) / 100, fmt = CFG.money || '{{amount_with_comma_separator}} €';
    var s = v.toFixed(2);
    return fmt.replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, s.replace('.', ',')).replace(/\{\{\s*amount_no_decimals\s*\}\}/, String(Math.round(v))).replace(/\{\{\s*amount\s*\}\}/, s);
  }
  function announce(msg) {
    var live = $('#fg-live');
    if (!live) { live = document.createElement('p'); live.id = 'fg-live'; live.className = 'visually-hidden'; live.setAttribute('role', 'status'); document.body.appendChild(live); }
    live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30);
  }
  function fill(tpl, map) { return String(tpl || '').replace(/\[(\w+)\]/g, function (m, k) { return map[k] != null ? map[k] : m; }); }
  /** Nombre d'unités d'un lot : le nombre en tête de l'option (« 3 flacons » → 3) ; 0 si l'option n'en a pas. */
  function unitsOf(title) { var m = String(title || '').match(/^\s*(\d+)/); return m ? Number(m[1]) : 0; }
  window.FG_OFFER = { unitsOf: unitsOf, money: money };

  /* ---------------------------------------------------------------- Fenêtres : focus gardé à l'intérieur */
  function trap(box, e) {
    var f = $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', box).filter(function (n) { return n.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function lock(on) { document.documentElement.style.overflow = on ? 'hidden' : ''; }

  /* ---------------------------------------------------------------- Menu du téléphone */
  function initMenu() {
    var menu = $('[data-fg-menu]'), open = $('[data-fg-menu-open]');
    if (!menu || !open) return;
    var close = $('[data-fg-menu-close]', menu);
    function show() { menu.hidden = false; open.setAttribute('aria-expanded', 'true'); lock(true); close.focus(); }
    function hide() { menu.hidden = true; open.setAttribute('aria-expanded', 'false'); lock(false); open.focus(); }
    open.addEventListener('click', show);
    close.addEventListener('click', hide);
    menu.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); else if (e.key === 'Tab') trap(menu, e); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { menu.hidden = true; lock(false); }); });
    var form = $('[data-fg-menu-search]', menu);
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); var q = $('input', form).value; hide(); openSearch(q); });
  }

  /* ---------------------------------------------------------------- Recherche : destinations filtrées en direct */
  var searchOpener = null;
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function openSearch(q) {
    var box = $('[data-fg-search]'); if (!box) return;
    searchOpener = document.activeElement; box.hidden = false; lock(true);
    var input = $('[data-fg-search-input]', box); input.value = q || ''; filterSearch(); input.focus();
    $$('[data-fg-search-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
  }
  function closeSearch() {
    var box = $('[data-fg-search]'); if (!box || box.hidden) return;
    box.hidden = true; lock(false);
    $$('[data-fg-search-open]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (searchOpener && searchOpener.focus) searchOpener.focus();
  }
  function filterSearch() {
    var box = $('[data-fg-search]'); if (!box) return 0;
    var q = norm($('[data-fg-search-input]', box).value).trim(), shown = 0;
    $$('[data-fg-search-list] li', box).forEach(function (li) { var on = !q || q.split(/\s+/).every(function (w) { return norm(li.textContent).indexOf(w) !== -1; }); li.hidden = !on; if (on) shown++; });
    var empty = $('[data-fg-search-empty]', box); if (empty) empty.hidden = shown > 0;
    return shown;
  }
  function initSearch() {
    var box = $('[data-fg-search]'); if (!box) return;
    $$('[data-fg-search-open]').forEach(function (b) { b.addEventListener('click', function () { openSearch(''); }); });
    $('[data-fg-search-close]', box).addEventListener('click', closeSearch);
    box.addEventListener('click', function (e) { if (e.target === box) closeSearch(); });
    box.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSearch(); else if (e.key === 'Tab') trap(box, e); });
    $('[data-fg-search-input]', box).addEventListener('input', filterSearch);
    $('[data-fg-search-form]', box).addEventListener('submit', function (e) {
      var first = $$('[data-fg-search-list] li', box).filter(function (li) { return !li.hidden; })[0];
      /* Une seule destination : on y va. Démonstration : pas de moteur de recherche, on reste sur les destinations. */
      if (first && filterSearch() === 1) { e.preventDefault(); location.href = $('a', first).getAttribute('href'); return; }
      if (CFG.demo) { e.preventDefault(); var empty = $('[data-fg-search-empty]', box); if (empty && !filterSearch()) empty.hidden = false; }
    });
  }

  /* ---------------------------------------------------------------- Cookies : rien de facultatif avant l'accord */
  var COOKIE_KEY = 'fg-cookies';
  function initCookies() {
    var box = $('[data-fg-cookies]');
    if (!box) return;
    var saved = readJSON(LS, COOKIE_KEY, null);
    function save(stats) { writeJSON(LS, COOKIE_KEY, { necessary: true, stats: !!stats, at: new Date().toISOString() }); box.hidden = true; document.dispatchEvent(new CustomEvent('fg:consent', { detail: { stats: !!stats } })); }
    function show() { box.hidden = false; var st = $('[data-fg-cookies-stats]', box); var cur = readJSON(LS, COOKIE_KEY, null); if (st) st.checked = !!(cur && cur.stats); }
    if (!saved || !saved.at) show();
    $('[data-fg-cookies-accept]', box).addEventListener('click', function () { save(true); });
    $('[data-fg-cookies-refuse]', box).addEventListener('click', function () { save(false); });
    var custom = $('[data-fg-cookies-custom]', box), prefs = $('.fg-cookies__prefs', box), saveBtn = $('[data-fg-cookies-save]', box);
    custom.addEventListener('click', function () { var o = custom.getAttribute('aria-expanded') !== 'true'; custom.setAttribute('aria-expanded', String(o)); prefs.hidden = !o; saveBtn.hidden = !o; });
    saveBtn.addEventListener('click', function () { save($('[data-fg-cookies-stats]', box).checked); });
    $$('[data-fg-cookies-open]').forEach(function (b) { b.addEventListener('click', show); });
  }

  /* ---------------------------------------------------------------- Inscriptions : démonstration annoncée */
  function initNewsletter() {
    var demoText = ($('[data-fg-footer]') || { getAttribute: function () { return ''; } }).getAttribute('data-demo-text');
    $$('form[data-fg-news]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        var input = $('input[type="email"]', form), status = $('[data-fg-status]', form);
        if (!input.checkValidity()) return;
        if (!CFG.demo) return;
        e.preventDefault();
        if (status) { status.hidden = false; status.textContent = demoText || 'Démonstration : aucune inscription n’est transmise.'; }
        input.value = '';
      });
    });
  }

  /* ---------------------------------------------------------------- Panier : ajout, compteur, changements */
  function cartBase() { return String(CFG.cartUrl || '/cart').replace(/\/+$/, ''); }
  function syncCountText() {
    var b = $('[data-fg-count]'); if (!b) return;
    var n = parseInt(b.textContent, 10) || 0; $$('[data-fg-count-text]').forEach(function (el) { el.textContent = n; });
  }
  function setCount(n) {
    $$('[data-fg-count]').forEach(function (el) { el.textContent = n; el.hidden = !n; });
    $$('[data-fg-count-text]').forEach(function (el) { el.textContent = n; });
    $$('.fg-header__cart').forEach(function (el) { el.classList.toggle('has-items', !!n); });
  }
  function post(path, body) {
    return fetch(cartBase() + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw j; return j; }); });
  }
  function getCart() { return fetch(cartBase() + '.js', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }); }
  /** Ajoute `qty` LOTS de la variante `id` (un appel par lot : fonctionne aussi dans l'aperçu statique précalculé). */
  function addToCart(id, qty) {
    var n = Math.max(1, Math.min(12, Number(qty) || 1)), chain = Promise.resolve();
    for (var i = 0; i < n; i++) chain = chain.then(function () { return post('/add.js', { id: Number(id), quantity: 1 }); });
    return chain.then(function () { return getCart().catch(function () { return null; }); })
      .then(function (cart) { if (cart && cart.item_count != null) setCount(cart.item_count); return cart; });
  }
  /** Ligne : lots × unités par lot = unités au total ; prix de la ligne = prix du lot × lots (jamais recalculé ailleurs). */
  function lineInfo(it) {
    var per = unitsOf(it.variant_title), units = per * it.quantity;
    return { per: per, units: units, name: it.variant_title && it.variant_title !== 'Default Title' ? it.variant_title : '' };
  }
  function lineHTML(it, cls) {
    var info = lineInfo(it), img = it.image || '';
    var unitsTxt = info.per && (it.quantity > 1 || info.per > 1) ? fill(T.units || '[n] unités', { n: info.units }) : '';
    return '<div class="fg-line ' + (cls || '') + '" data-key="' + esc(it.key) + '" data-units="' + info.units + '">' +
      '<span class="fg-line__thumb">' + (img ? '<img src="' + esc(img) + '" alt="">' : '') + '</span>' +
      '<div class="fg-line__body"><p class="fg-line__name">' + esc(CFG.lineBrand || it.product_title) + '</p>' +
      (CFG.lineBrand ? '<p class="fg-line__sub">' + esc(it.product_title) + '</p>' : '') +
      (info.name ? '<p class="fg-line__sub">' + esc(info.name) + '</p>' : '') +
      (unitsTxt ? '<p class="fg-line__units">' + esc(unitsTxt) + '</p>' : '') +
      '<p class="fg-line__price">' + esc(money(it.final_line_price)) + '</p>' +
      '<div class="fg-line__row"><div class="fg-qty"><button type="button" data-q="' + (it.quantity - 1) + '" aria-label="' + esc(T.less || '-') + '"><svg class="fg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14"/></svg></button><span>' + it.quantity + '</span><button type="button" data-q="' + (it.quantity + 1) + '" aria-label="' + esc(T.more || '+') + '"><svg class="fg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div>' +
      '<button type="button" class="fg-line__remove" data-q="0" aria-label="' + esc(T.remove || 'Supprimer') + '"><svg class="fg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 7h14M10 4h4M7 7l.8 12.2a1 1 0 0 0 1 .8h6.4a1 1 0 0 0 1-.8L17 7M10.5 10.5v6M13.5 10.5v6"/></svg></button></div></div></div>';
  }

  /* ---------------------------------------------------------------- Tiroir du panier (après un ajout) */
  var drawerOpener = null;
  function drawerEl() { return $('[data-fg-drawer]'); }
  function renderDrawer(cart) {
    var d = drawerEl(); if (!d || !cart) return;
    $('[data-fg-drawer-lines]', d).innerHTML = (cart.items || []).map(function (it) { return lineHTML(it); }).join('');
    var sub = $('[data-fg-drawer-subtotal]', d); if (sub) sub.textContent = money(cart.total_price);
    setCount(cart.item_count || 0);
    if (!cart.item_count) closeDrawer();
  }
  function openDrawer(cart) {
    var d = drawerEl(); if (!d) return;
    renderDrawer(cart); if (!cart || !cart.item_count) return;
    drawerOpener = document.activeElement; d.hidden = false; lock(true);
    var c = $('.fg-drawer__close', d); if (c) c.focus();
  }
  function closeDrawer() {
    var d = drawerEl(); if (!d || d.hidden) return;
    d.hidden = true; lock(false);
    if (drawerOpener && drawerOpener.focus) drawerOpener.focus();
  }
  function onQty(scope, after) {
    scope.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-q]'); if (!b || !scope.contains(b)) return;
      var line = b.closest('[data-key]'); b.disabled = true;
      post('/change.js', { id: line.getAttribute('data-key'), quantity: Number(b.getAttribute('data-q')) })
        .then(function (cart) { after(cart); if (Number(b.getAttribute('data-q')) === 0) announce(T.removed || ''); })
        .catch(function (err) { announce((err && err.description) || T.error || ''); b.disabled = false; });
    });
  }
  function initDrawer() {
    var d = drawerEl(); if (!d) return;
    $$('[data-fg-drawer-close]', d).forEach(function (b) { b.addEventListener('click', closeDrawer); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); else if (e.key === 'Tab') trap($('.fg-drawer__panel', d), e); });
    onQty($('[data-fg-drawer-lines]', d), renderDrawer);
  }
  /* Ajouts directs des cartes d'offre et de la carte produit : le BON lot (variante du formulaire), un lot. */
  function initQuickAdd() {
    $$('form[data-fg-quick-add]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var id = form.querySelector('[name="id"]').value, btn = form.querySelector('button[type="submit"]');
        if (btn.disabled) return; btn.disabled = true; btn.setAttribute('aria-busy', 'true');
        addToCart(id, 1).then(function (cart) { announce(T.added || ''); openDrawer(cart); })
          .catch(function (err) { announce((err && err.description) || T.error || ''); })
          .then(function () { btn.disabled = false; btn.removeAttribute('aria-busy'); });
      });
    });
  }

  /* ---------------------------------------------------------------- Page panier : lignes, sous-total, état vide */
  function initCart(root) {
    var box = $('[data-fg-cart-lines]', root);
    if (!box) return;
    function render(cart) {
      if (!cart) return;
      var empty = !cart.item_count;
      root.classList.toggle('is-empty', empty);
      $$('[data-fg-cart-full]', root).forEach(function (n) { n.hidden = empty; });
      $$('[data-fg-cart-empty]', root).forEach(function (n) { n.hidden = !empty; });
      box.innerHTML = (cart.items || []).map(function (it) { return cartRowHTML(it); }).join('');
      $$('[data-fg-cart-subtotal]', root).forEach(function (n) { n.textContent = money(cart.total_price); });
      $$('[data-fg-cart-units]', root).forEach(function (n) { var u = (cart.items || []).reduce(function (s, it) { return s + lineInfo(it).units; }, 0); n.textContent = fill(T.units || '[n]', { n: u }); n.hidden = !u; });
      setCount(cart.item_count || 0);
    }
    function cartRowHTML(it) {
      var info = lineInfo(it), img = it.image || '';
      return '<div class="fg-cart__row" data-key="' + esc(it.key) + '">' +
        '<div class="fg-cart__prod"><span class="fg-cart__thumb">' + (img ? '<img src="' + esc(img) + '" alt="">' : '') + '</span><div><p class="fg-cart__name">' + esc(CFG.lineBrand || it.product_title) + '</p>' + (CFG.lineBrand ? '<p class="fg-cart__sub">' + esc(it.product_title) + '</p>' : '') + (info.name ? '<p class="fg-cart__sub">' + esc(info.name) + '</p>' : '') + (info.per ? '<p class="fg-cart__units">' + esc(fill(T.units || '[n]', { n: info.units })) + '</p>' : '') + '</div></div>' +
        '<p class="fg-cart__price">' + esc(money(it.price)) + '</p>' +
        '<div class="fg-cart__qty"><div class="fg-qty"><button type="button" data-q="' + (it.quantity - 1) + '" aria-label="' + esc(T.less || '-') + '"><svg class="fg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14"/></svg></button><span>' + it.quantity + '</span><button type="button" data-q="' + (it.quantity + 1) + '" aria-label="' + esc(T.more || '+') + '"><svg class="fg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div>' +
        '<button type="button" class="fg-line__remove" data-q="0" aria-label="' + esc(T.remove || 'Supprimer') + '"><svg class="fg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 7h14M10 4h4M7 7l.8 12.2a1 1 0 0 0 1 .8h6.4a1 1 0 0 0 1-.8L17 7M10.5 10.5v6M13.5 10.5v6"/></svg></button></div>' +
        '<p class="fg-cart__total">' + esc(money(it.final_line_price)) + '</p></div>';
    }
    onQty(box, render);
    getCart().then(render).catch(function () { /* rendu du serveur conservé */ });
  }

  /* ---------------------------------------------------------------- Fiche : galerie, zoom, formats, quantité, ajout */
  function initProduct(root) {
    var thumbs = $$('[data-fg-thumb]', root), views = $$('[data-fg-view]', root);
    function show(i) {
      thumbs.forEach(function (x) { var on = x.getAttribute('data-fg-thumb') === String(i); x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); });
      views.forEach(function (v) { var on = v.getAttribute('data-fg-view') === String(i); v.hidden = !on; v.classList.toggle('is-active', on); });
    }
    thumbs.forEach(function (t) { t.addEventListener('click', function () { show(t.getAttribute('data-fg-thumb')); var tr = $('[data-fg-track]', root); if (tr && tr.offsetParent !== null) tr.scrollTo({ left: Number(t.getAttribute('data-fg-thumb')) * tr.clientWidth, behavior: 'smooth' }); }); });
    var lb = $('[data-fg-lightbox]', root), lbImg = lb && $('[data-fg-lightbox-img]', lb), opener = null;
    function openLb(src, alt, from) { if (!lb) return; opener = from; lbImg.src = src; lbImg.alt = alt || ''; lb.hidden = false; lock(true); $('[data-fg-lightbox-close]', lb).focus(); }
    function closeLb() { lb.hidden = true; lock(false); if (opener) opener.focus(); }
    $$('[data-fg-zoom]', root).forEach(function (z) { z.addEventListener('click', function () { var cur = views.filter(function (v) { return !v.hidden; })[0] || views[0]; var tr = $('[data-fg-track]', root); if (tr && tr.offsetParent !== null) { var sl = $$('[data-fg-slide]', root)[Math.round(tr.scrollLeft / Math.max(1, tr.clientWidth))]; if (sl) cur = sl; } if (cur) openLb(cur.getAttribute('data-fg-zoom-src'), ($('img', cur) || {}).alt, z); }); });
    views.forEach(function (v) { v.addEventListener('click', function () { openLb(v.getAttribute('data-fg-zoom-src'), ($('img', v) || {}).alt, v); }); });
    if (lb) {
      $('[data-fg-lightbox-close]', lb).addEventListener('click', closeLb);
      lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
      lb.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLb(); else if (e.key === 'Tab') { e.preventDefault(); $('[data-fg-lightbox-close]', lb).focus(); } });
    }
    var track = $('[data-fg-track]', root), dots = $$('.fg-product__dots span', root);
    if (track) {
      var tick = null;
      track.addEventListener('scroll', function () { clearTimeout(tick); tick = setTimeout(function () { var i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); dots.forEach(function (d, k) { d.classList.toggle('is-active', k === i); }); thumbs.forEach(function (x) { var on = x.getAttribute('data-fg-thumb') === String(i); x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); }); }, 60); }, { passive: true });
    }
    var form = $('[data-fg-add]', root);
    if (!form) return;
    var idInput = $('[data-fg-variant]', form), qtyInput = $('[data-fg-qty-input]', form), status = $('[data-fg-status]', form), btn = $('[data-fg-add-btn]', form);
    var radios = $$('input[name="fg-format"]', root);
    function current() { return radios.filter(function (r) { return r.checked; })[0] || radios[0]; }
    function sync() {
      var r = current(); if (!r) return;
      idInput.value = r.value;
      var q = Math.max(1, Math.min(12, Math.round(Number(qtyInput.value) || 1)));
      var total = Number(r.getAttribute('data-price')) * q, title = r.getAttribute('data-title'), units = Number(r.getAttribute('data-units')) || 0;
      $$('[data-fg-sel-price]').forEach(function (n) { n.textContent = money(r.getAttribute('data-price')); });
      $$('[data-fg-sel-title]').forEach(function (n) { n.textContent = n.getAttribute('data-prefix') ? n.getAttribute('data-prefix').replace('[t]', title) : title; });
      $$('[data-fg-sel-total]').forEach(function (n) { n.textContent = money(total); });
      $$('[data-fg-sel-compare]').forEach(function (n) { var ref = Number(r.getAttribute('data-ref')) || 0; n.hidden = !(ref > Number(r.getAttribute('data-price'))); n.querySelector('s').textContent = money(ref); });
      $$('[data-fg-sel-units]').forEach(function (n) { n.textContent = fill(T.units || '[n]', { n: units * q }); n.hidden = !units; });
      $$('[data-fg-buybar-img]').forEach(function (n) { $$('[data-for]', n).forEach(function (im) { im.hidden = im.getAttribute('data-for') !== r.value; }); });
      $$('[data-fg-offer]', root).forEach(function (o) { var on = $('input', o) === r; o.classList.toggle('is-checked', on); });
      /* Photo principale : celle du format choisi quand elle existe (sinon la galerie reste où elle est). */
      var vi = r.getAttribute('data-view'); if (vi !== null && vi !== '' && views.length) show(vi);
    }
    radios.forEach(function (r) { r.addEventListener('change', sync); });
    $$('[data-fg-qty]', form).forEach(function (b) {
      b.addEventListener('click', function () { qtyInput.value = Math.max(1, Math.min(12, (Number(qtyInput.value) || 1) + Number(b.getAttribute('data-fg-qty')))); sync(); });
    });
    qtyInput.addEventListener('change', function () { qtyInput.value = Math.max(1, Math.min(12, Math.round(Number(qtyInput.value) || 1))); sync(); });
    function submit(e) {
      if (e) e.preventDefault();
      if (btn.disabled) return;
      btn.setAttribute('aria-busy', 'true'); btn.disabled = true; if (status) status.textContent = '';
      addToCart(idInput.value, qtyInput.value).then(function (cart) { if (status) status.textContent = T.added || ''; announce(T.added || ''); openDrawer(cart); })
        .catch(function (err) { if (status) status.textContent = (err && err.description) || T.error || ''; })
        .then(function () { btn.disabled = false; btn.removeAttribute('aria-busy'); });
    }
    form.addEventListener('submit', submit);
    sync();
    /* Barre d'achat du téléphone : visible une fois la zone d'achat dépassée ; même format, même quantité ; masquée pendant
       la saisie et au niveau du pied de page (elle ne cache ni texte, ni pied, ni cookies). */
    var bar = $('[data-fg-buybar]'), card = $('.fg-product__buy', root), foot = $('[data-fg-footer]');
    if (bar && card && 'IntersectionObserver' in window) {
      var past = false, typing = false, atFoot = false;
      var upd = function () { bar.hidden = !past || typing || atFoot || !!($('[data-fg-cookies]') && !$('[data-fg-cookies]').hidden); document.body.classList.toggle('fg-has-buybar', !bar.hidden); };
      new IntersectionObserver(function (en) { past = !en[0].isIntersecting && en[0].boundingClientRect.top < 0; upd(); }).observe(card);
      if (foot) new IntersectionObserver(function (en) { atFoot = en[0].isIntersecting; upd(); }).observe(foot);
      document.addEventListener('focusin', function (e) { typing = !!(e.target.closest && e.target.closest('input, textarea, select')) && !e.target.closest('[data-fg-buybar]'); upd(); });
      document.addEventListener('focusout', function () { typing = false; upd(); });
      document.addEventListener('fg:consent', upd);
      $('[data-fg-buybar-add]', bar).addEventListener('click', function () { submit(); });
    }
  }

  /* ---------------------------------------------------------------- Journal : filtres reliés aux catégories */
  function initJournal(root) {
    var pills = $$('[data-fg-filter]', root), items = $$('[data-cat]', root), empty = $('[data-fg-empty]', root), live = $('[data-fg-count-status]', root);
    function apply(cat) {
      var shown = 0;
      pills.forEach(function (x) { var on = x.getAttribute('data-fg-filter') === cat; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); });
      items.forEach(function (it) { var on = !cat || it.getAttribute('data-cat') === cat; it.hidden = !on; if (on) shown++; });
      root.classList.toggle('is-filtered', !!cat);
      if (empty) empty.hidden = shown > 0;
      if (live) live.textContent = shown + (shown > 1 ? ' articles' : ' article');
    }
    pills.forEach(function (b) { b.addEventListener('click', function () { apply(b.getAttribute('data-fg-filter')); }); });
    var h = decodeURIComponent((location.hash || '').slice(1));
    pills.forEach(function (b) { if (h && b.getAttribute('data-fg-filter') === h) apply(h); });
  }

  /* ---------------------------------------------------------------- Champs : erreurs par champ */
  function checkField(input) {
    var wrap = input.closest('.fg-field') || input.parentNode, err = wrap.querySelector('.fg-field__err');
    var ok = input.type === 'checkbox' ? input.checked : input.checkValidity() && String(input.value).trim() !== '';
    if (input.type !== 'checkbox' && !input.required && !input.value) ok = true;
    input.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (err) { err.hidden = ok; if (!err.id) err.id = 'fg-err-' + Math.random().toString(36).slice(2, 8); if (!ok) input.setAttribute('aria-describedby', err.id); else input.removeAttribute('aria-describedby'); }
    return ok;
  }
  function checkAll(scope) {
    var bad = null;
    $$('input[required], select[required], textarea[required]', scope).forEach(function (i) { if (!checkField(i) && !bad) bad = i; });
    if (bad) bad.focus();
    return !bad;
  }

  /* ---------------------------------------------------------------- Commande de démonstration (aucun paiement) */
  var CO_KEY = 'fg-checkout';
  function initCheckout(root) {
    var form = $('[data-fg-co-form]', root), nexts = $$('[data-fg-co-next]', root), status = $('[data-fg-co-status]', root);
    if (!form) return;
    var saved = readJSON(SS, CO_KEY, {});
    $$('input, select', form).forEach(function (i) {
      if (i.type === 'checkbox') { if (saved[i.name] != null) i.checked = !!saved[i.name]; }
      else if (i.type === 'radio') { if (saved[i.name] != null) i.checked = saved[i.name] === i.value; }
      else if (saved[i.name] != null) i.value = saved[i.name];
      i.addEventListener('change', function () { saved[i.name] = i.type === 'checkbox' ? i.checked : i.value; writeJSON(SS, CO_KEY, saved); if (i.getAttribute('aria-invalid') === 'true') checkField(i); });
    });
    function v(n) { var i = form.elements[n]; return i ? String(i.value).trim() : ''; }
    function address() { return [(v('first') + ' ' + v('last')).trim(), v('address'), (v('zip') + ' ' + v('city')).trim(), v('country')].filter(function (x) { return x; }).map(esc).join('<br>'); }
    function go(n, focus) {
      root.setAttribute('data-step', String(n));
      $$('[data-pane]', root).forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== String(n); });
      $$('.fg-co__step', root).forEach(function (li) { var k = Number(li.getAttribute('data-n')); li.classList.toggle('is-done', k < n); li.classList.toggle('is-current', k === n); if (k === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
      $$('[data-fg-co-address]', root).forEach(function (a) { a.innerHTML = address() || a.getAttribute('data-empty') || ''; });
      $$('[data-fg-co-email]', root).forEach(function (a) { a.textContent = v('email'); });
      var ship = form.querySelector('input[name="shipping"]:checked');
      $$('[data-fg-co-ship]', root).forEach(function (a) { a.textContent = ship ? ship.getAttribute('data-label') : (a.getAttribute('data-empty') || ''); });
      if (status) status.textContent = '';
      var t = $('[data-pane="' + n + '"] [data-fg-co-title]', root) || $('[data-fg-co-title]', root);
      if (focus && t) t.focus({ preventScroll: false });
      saved._step = n; writeJSON(SS, CO_KEY, saved);
    }
    nexts.forEach(function (b) {
      b.addEventListener('click', function () {
        var n = Number(root.getAttribute('data-step')) || 1, pane = $('[data-pane="' + n + '"]', root);
        if (pane && !checkAll(pane)) { if (status) status.textContent = T.fix || status.getAttribute('data-fix') || ''; return; }
        go(n + 1, true);
      });
    });
    $$('[data-fg-co-goto]', root).forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); go(Number(a.getAttribute('data-fg-co-goto')), true); }); });
    $$('[data-fg-co-back]', root).forEach(function (a) { a.addEventListener('click', function (e) { var n = Number(root.getAttribute('data-step')) || 1; if (n > 1 && n <= 4) { e.preventDefault(); go(n - 1, true); } }); });
    $$('[data-fg-co-restart]', root).forEach(function (a) { a.addEventListener('click', function () { saved = {}; writeJSON(SS, CO_KEY, saved); }); });
    var hash = (location.hash || '').slice(1), fromHash = { 'etape-1': 1, 'etape-2': 2, 'etape-3': 3, 'confirmation-exemple': 4 }[hash];
    var start = Number(saved._step) || 1;
    if (start > 1 && !$$('[data-pane="1"] [required]', root).every(function (i) { return i.checkValidity() && String(i.value).trim(); })) start = 1;
    go(fromHash || (start > 4 ? 1 : start), false);
    /* Récapitulatif relu dans le panier : lignes (lots, unités), sous-total, boutons inactifs si le panier est vide. */
    var box = $('[data-fg-co-items]', root);
    getCart().then(function (c) {
      if (!c || !box) return;
      nexts.forEach(function (b) { if (!c.item_count) { b.setAttribute('data-empty-cart', ''); b.disabled = true; } });
      $$('[data-fg-co-emptycart]', root).forEach(function (n) { n.hidden = !!c.item_count; });
      if (!c.items || !c.items.length) { box.innerHTML = ''; $$('[data-fg-co-subtotal]', root).forEach(function (st) { st.textContent = money(0); }); return; }
      box.innerHTML = c.items.map(function (it) {
        var info = lineInfo(it), img = it.image || '';
        return '<div class="fg-co__item"><span class="fg-co__thumb">' + (img ? '<img src="' + esc(img) + '" alt="">' : '') + '</span><div class="fg-co__iname"><b>' + esc(CFG.lineBrand || it.product_title) + '</b>' + (CFG.lineBrand ? '<span>' + esc(it.product_title) + '</span>' : '') + (info.name ? '<span>' + esc(info.name) + '</span>' : '') + '<span class="fg-co__iprice">' + esc(money(it.final_line_price)) + '</span><span class="fg-co__iqty">' + esc(fill(T.qty || 'Quantité : [q]', { q: it.quantity })) + (info.per ? ' · ' + esc(fill(T.units || '[n]', { n: info.units })) : '') + '</span></div></div>';
      }).join('');
      $$('[data-fg-co-subtotal]', root).forEach(function (st) { st.textContent = money(c.total_price); });
    }).catch(function () { /* récapitulatif du rendu conservé */ });
  }

  /* ---------------------------------------------------------------- Questions : recherche, filtres, accordéons */
  function initFaq(root) {
    var input = $('[data-fg-faq-search]', root), pills = $$('[data-fg-faq-filter]', root), items = $$('.fg-faq__item', root), empty = $('[data-fg-faq-empty]', root), cat = '';
    function apply() {
      var q = norm(input ? input.value : '').trim(), shown = 0;
      items.forEach(function (it) {
        var on = (!cat || it.getAttribute('data-cat') === cat) && (!q || norm(it.textContent).indexOf(q) !== -1);
        it.hidden = !on; if (on) { shown++; if (q && shown === 1) it.open = true; }
      });
      if (empty) empty.hidden = shown > 0;
    }
    pills.forEach(function (b) {
      b.addEventListener('click', function () {
        var c = b.getAttribute('data-fg-faq-filter'); cat = cat === c ? '' : c;
        pills.forEach(function (x) { var on = x.getAttribute('data-fg-faq-filter') === cat; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); });
        apply();
      });
    });
    if (input) input.addEventListener('input', apply);
    apply();
    var h = decodeURIComponent((location.hash || '').slice(1));
    pills.forEach(function (b) { if (h && b.getAttribute('data-fg-faq-filter') === h && !b.classList.contains('is-active')) b.click(); });
  }

  /* ---------------------------------------------------------------- Contact : erreurs par champ ; envoi simulé annoncé */
  function initContact(form) {
    var status = $('[data-fg-contact-status]', form);
    $$('input, select, textarea', form).forEach(function (i) { i.addEventListener('change', function () { if (i.getAttribute('aria-invalid') === 'true') checkField(i); }); });
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (e) {
      if (!checkAll(form)) { e.preventDefault(); return; }
      if (form.getAttribute('data-fg-contact') === 'demo') {
        e.preventDefault();
        if (status) { status.hidden = false; status.textContent = status.getAttribute('data-text') || ''; status.focus && status.focus(); }
      }
    });
  }

  /* ---------------------------------------------------------------- Suivi : résultat d'exemple annoncé en démonstration */
  function initTrack(form) {
    var res = $('[data-fg-track-result]', form.parentNode) || $('[data-fg-track-result]', form);
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (e) {
      if (!checkAll(form)) { e.preventDefault(); if (res) res.hidden = true; return; }
      if (form.getAttribute('data-fg-track') === 'demo') { e.preventDefault(); if (res) { res.hidden = false; res.setAttribute('tabindex', '-1'); res.focus(); } }
    });
  }

  /* ---------------------------------------------------------------- Livraison : onglets */
  function initTabs(root) {
    var tabs = $$('[role="tab"]', root), panels = $$('[role="tabpanel"]', root);
    function select(t, focus) {
      tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; });
      panels.forEach(function (p) { p.classList.toggle('is-active', p.id === t.getAttribute('aria-controls')); });
      if (focus) t.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(t); });
      t.addEventListener('keydown', function (e) { var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); } });
    });
    var h = (location.hash || '').slice(1);
    tabs.forEach(function (t) { if (h && t.getAttribute('data-anchor') === h) select(t); });
  }

  function start() {
    initMenu(); initSearch();
    syncCountText(); initDrawer(); initQuickAdd();
    initCookies(); initNewsletter();
    $$('[data-fg-product]').forEach(initProduct);
    $$('[data-fg-cart]').forEach(initCart);
    $$('[data-fg-journal]').forEach(initJournal);
    $$('[data-fg-checkout]').forEach(initCheckout);
    $$('[data-fg-faq]').forEach(initFaq);
    $$('form[data-fg-contact]').forEach(initContact);
    $$('form[data-fg-track]').forEach(initTrack);
    $$('[data-fg-tabs]').forEach(initTabs);
    document.dispatchEvent(new CustomEvent('fg:ready'));
  }
  window.FG = { openDrawer: openDrawer, closeDrawer: closeDrawer, addToCart: addToCart, post: post, cartBase: cartBase, setCount: setCount, money: money, unitsOf: unitsOf, CFG: CFG };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
