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
  /** Aperçu statique : le compteur de l'en-tête est mis à jour avant le thème ; le libellé « Mon panier (n) » le suit. */
  function syncCountText() {
    var b = $('[data-sv-count]'); if (!b) return;
    var n = parseInt(b.textContent, 10) || 0; $$('[data-sv-count-text]').forEach(function (el) { el.textContent = n; });
  }
  function setCount(n) {
    $$('[data-sv-count]').forEach(function (el) { el.textContent = n; el.hidden = !n; });
    $$('[data-sv-count-text]').forEach(function (el) { el.textContent = n; });
    $$('.sv-header__cart').forEach(function (el) { el.classList.toggle('has-items', !!n); });
  }

  /* ---------------------------------------------------------------- Tiroir du panier (après un ajout) */
  var drawerOpener = null;
  function drawerEl() { return $('[data-sv-drawer]'); }
  function renderDrawer(cart) {
    var d = drawerEl(); if (!d || !cart) return;
    var box = $('[data-sv-drawer-lines]', d);
    box.innerHTML = (cart.items || []).map(function (it) {
      var name = it.variant_title && it.variant_title !== 'Default Title' ? it.variant_title : it.product_title, img = CFG.thumb || it.image || '';
      return '<div class="sv-drawer__line" data-key="' + esc(it.key) + '"><span class="sv-drawer__thumb">' + (img ? '<img src="' + esc(img) + '" alt="">' : '') + '</span>' +
        '<p class="sv-drawer__name">' + esc(name) + '</p><p class="sv-display sv-drawer__price">' + esc(money(it.final_line_price)) + '</p>' +
        '<div class="sv-qty sv-drawer__qty"><button type="button" data-q="' + (it.quantity - 1) + '" aria-label="' + esc(T.less || '-') + '"><svg class="sv-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14"/></svg></button><span>' + it.quantity + '</span><button type="button" data-q="' + (it.quantity + 1) + '" aria-label="' + esc(T.more || '+') + '"><svg class="sv-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div>' +
        '<button type="button" class="sv-drawer__remove" data-q="0" aria-label="' + esc(T.remove || 'Supprimer') + '"><svg class="sv-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 7h14M10 4h4M7 7l.8 12.2a1 1 0 0 0 1 .8h6.4a1 1 0 0 0 1-.8L17 7M10.5 10.5v6M13.5 10.5v6"/></svg></button></div>';
    }).join('');
    var sub = $('[data-sv-drawer-subtotal]', d), tot = $('[data-sv-drawer-total]', d);
    if (sub) sub.textContent = money(cart.total_price); if (tot) tot.textContent = money(cart.total_price);
    setCount(cart.item_count || 0);
    if (!cart.item_count) closeDrawer();
  }
  function openDrawer(cart) {
    var d = drawerEl(); if (!d) return;
    renderDrawer(cart); if (!cart || !cart.item_count) return;
    drawerOpener = document.activeElement; d.hidden = false; document.documentElement.style.overflow = 'hidden';
    var c = $('.sv-drawer__close', d); if (c) c.focus();
  }
  function closeDrawer() {
    var d = drawerEl(); if (!d || d.hidden) return;
    d.hidden = true; document.documentElement.style.overflow = '';
    if (drawerOpener && drawerOpener.focus) drawerOpener.focus();
  }
  function initDrawer() {
    var d = drawerEl(); if (!d) return;
    $$('[data-sv-drawer-close]', d).forEach(function (b) { b.addEventListener('click', closeDrawer); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); else if (e.key === 'Tab') trap($('.sv-drawer__panel', d), e); });
    d.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-q]'); if (!b) return;
      var line = b.closest('[data-key]'); b.disabled = true;
      post('/change.js', { id: line.getAttribute('data-key'), quantity: Number(b.getAttribute('data-q')) })
        .then(function (cart) { renderDrawer(cart); if (Number(b.getAttribute('data-q')) === 0) announce(T.removed || ''); })
        .catch(function (err) { announce((err && err.description) || T.error || ''); b.disabled = false; });
    });
  }
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
    /* Téléphone : carrousel (défilement, points, loupe) relié aux miniatures. */
    var track = $('[data-sv-track]', root), slides = $$('[data-sv-slide]', root), dots = $$('.sv-product__dots span', root), cur = 0;
    function setCur(i) {
      cur = i;
      dots.forEach(function (d, k) { d.classList.toggle('is-active', k === i); });
      thumbs.forEach(function (x) { var on = Number(x.getAttribute('data-sv-thumb')) === i; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); });
    }
    if (track && slides.length) {
      var tick = null;
      track.addEventListener('scroll', function () { clearTimeout(tick); tick = setTimeout(function () { setCur(Math.round(track.scrollLeft / Math.max(1, track.clientWidth))); }, 60); }, { passive: true });
      thumbs.forEach(function (t) { t.addEventListener('click', function () { if (track.offsetParent === null) return; var i = Number(t.getAttribute('data-sv-thumb')); track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' }); setCur(i); }); });
      var mz = $('[data-sv-mzoom]', root);
      if (mz && lb) mz.addEventListener('click', function () { var sl = slides[cur]; if (!sl) return; opener = mz; lbImg.src = sl.getAttribute('data-sv-zoom-src'); lbImg.alt = ($('img', sl) || {}).alt || ''; lb.hidden = false; document.documentElement.style.overflow = 'hidden'; $('[data-sv-lightbox-close]', lb).focus(); });
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
      addToCart(idInput.value, qtyInput.value).then(function (cart) { status.textContent = T.added || 'Ajouté au panier.'; announce(status.textContent); openDrawer(cart); })
        .catch(function (err) { status.textContent = (err && err.description) || T.error || 'Erreur'; })
        .then(function () { btn.disabled = false; btn.removeAttribute('aria-busy'); });
    }
    form.addEventListener('submit', submit);
    /* Barre d'achat : visible quand la carte d'achat est hors de l'écran ; même variante, même quantité. */
    var bar = $('[data-sv-buybar]'), card = $('.sv-product__card', root);
    if (bar && card && 'IntersectionObserver' in window) {
      var visible = true, typing = false;
      var upd = function () { bar.hidden = visible || typing; };
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting || en[0].boundingClientRect.top > 0; upd(); }).observe(card); /* barre seulement une fois la carte d'achat dépassée */
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

  /* ---------------------------------------------------------------- Champs : erreurs par champ */
  function checkField(input) {
    var err = input.parentNode.querySelector('.sv-field__err') || (input.closest('label') || input.parentNode).querySelector('.sv-field__err');
    var ok = input.type === 'checkbox' ? input.checked : input.checkValidity() && String(input.value).trim() !== '';
    if (input.type !== 'checkbox' && !input.required && !input.value) ok = true;
    input.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (err) { err.hidden = ok; if (!err.id) err.id = 'sv-err-' + Math.random().toString(36).slice(2, 8); if (!ok) input.setAttribute('aria-describedby', err.id); else input.removeAttribute('aria-describedby'); }
    return ok;
  }
  function checkAll(scope) {
    var bad = null;
    $$('input[required], select[required], textarea[required]', scope).forEach(function (i) { if (!checkField(i) && !bad) bad = i; });
    if (bad) bad.focus();
    return !bad;
  }

  /* ---------------------------------------------------------------- Commande de démonstration (aucun paiement) */
  var CO_KEY = 'sv-checkout';
  function initCheckout(root) {
    var form = $('[data-sv-co-form]', root), nexts = $$('[data-sv-co-next]', root), cardNext = $('.sv-checkout__next', root), back = $('[data-sv-co-back]', root), status = $('[data-sv-co-status]', root);
    if (!form || !nexts.length) return;
    var backLabel = back && back.querySelector('[data-back-1]'), cartHref = back ? back.getAttribute('href') : '', title = $('[data-sv-co-title]', root);
    var saved = readJSON(SS, CO_KEY, {});
    $$('input, select', form).forEach(function (i) {
      if (saved[i.name] != null) i.value = saved[i.name];
      i.addEventListener('change', function () { saved[i.name] = i.value; writeJSON(SS, CO_KEY, saved); if (i.getAttribute('aria-invalid') === 'true') checkField(i); });
    });
    function lines(t) { return esc(t || '').replace(/\n/g, '<br>'); }
    function address() {
      var v = function (n) { var i = form.elements[n]; return i ? String(i.value).trim() : ''; };
      return [(v('first') + ' ' + v('last')).trim(), v('address'), v('address2'), (v('zip') + ' ' + v('city')).trim(), v('country')].filter(function (x) { return x; }).map(esc).join('<br>');
    }
    function go(n, focus) {
      root.setAttribute('data-step', String(n));
      $$('[data-pane]', form).forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== String(n); });
      $$('.sv-checkout__step', root).forEach(function (li) { var k = Number(li.getAttribute('data-n')); li.classList.toggle('is-done', k < n); li.classList.toggle('is-current', k === n); if (k === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
      $$('[data-sv-co-address]', root).forEach(function (a) { a.innerHTML = address(); });
      var hasAddr = !!(form.elements.address && String(form.elements.address.value).trim());
      root.classList.toggle('is-no-address', !hasAddr);
      if (title) {
        if (n === 1) title.innerHTML = '<span class="sv-checkout__t-d">' + lines(root.getAttribute('data-t1')) + '</span><span class="sv-checkout__t-m">' + lines(root.getAttribute('data-t1m')) + '</span>';
        else title.innerHTML = lines(root.getAttribute('data-t' + n));
      }
      var lbl = cardNext && cardNext.getAttribute('data-l' + n);
      nexts.forEach(function (b) {
        b.hidden = n > 3; if (lbl) b.querySelector('span').textContent = lbl;
        /* Étape 2 sans adresse et paiement de maquette : bouton inactif (planches mobiles 08b et 08c). */
        b.disabled = (n === 2 && !hasAddr) || (n === 3 && b.getAttribute('data-final') === 'off') || b.hasAttribute('data-empty-cart');
      });
      if (backLabel) backLabel.textContent = backLabel.getAttribute('data-back-' + Math.min(n, 3)) || '';
      if (back) back.hidden = n > 3;
      if (status) status.textContent = '';
      if (focus && title) title.focus({ preventScroll: false });
      saved._step = n; writeJSON(SS, CO_KEY, saved);
    }
    nexts.forEach(function (b) {
      b.addEventListener('click', function () {
        var n = Number(root.getAttribute('data-step')) || 1, pane = $('[data-pane="' + n + '"]', form);
        if (pane && !checkAll(pane)) { if (status) status.textContent = T.fix || ''; return; }
        go(n + 1, true);
      });
    });
    $$('[data-sv-co-goto]', root).forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); go(Number(a.getAttribute('data-sv-co-goto')), true); }); });
    if (back) back.addEventListener('click', function (e) {
      var n = Number(root.getAttribute('data-step')) || 1;
      if (n > 1 && n <= 3) { e.preventDefault(); go(n - 1, true); } else if (cartHref) back.setAttribute('href', cartHref);
    });
    /* Revue de la maquette : #etape-2, #etape-3 ou #confirmation-exemple ouvrent l'écran correspondant. */
    var hash = (location.hash || '').slice(1), fromHash = { 'etape-1': 1, 'etape-2': 2, 'etape-3': 3, 'confirmation-exemple': 4 }[hash];
    var start = Number(saved._step) || 1;
    /* Une étape n'est rouverte que si les précédentes sont valides (sinon retour aux informations). */
    if (start > 1 && !$$('[data-pane="1"] [required]', form).every(function (i) { return i.checkValidity() && String(i.value).trim(); })) start = 1;
    if (fromHash) { go(fromHash, false); } else go(start > 3 ? 1 : start, false);
    /* Récapitulatifs relus dans le panier (page en cache ou aperçu) : lignes, sous-total, boutons actifs. */
    var box = $('[data-sv-co-items]', root);
    fetch(cartBase() + '.js', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }).then(function (c) {
      if (!c || !box) return;
      nexts.forEach(function (b) { if (!c.item_count) { b.setAttribute('data-empty-cart', ''); b.disabled = true; } });
      if (!c.items || !c.items.length) return;
      var thumb = box.getAttribute('data-thumb');
      var name = function (it) { return it.variant_title && it.variant_title !== 'Default Title' ? it.variant_title : it.product_title; };
      box.innerHTML = c.items.map(function (it) {
        var img = thumb || it.image || '';
        return '<div class="sv-checkout__item"><span class="sv-checkout__thumb">' + (img ? '<img src="' + esc(img) + '" alt="">' : '') + '</span><span class="sv-checkout__iname">' + esc(name(it)) + (it.quantity > 1 ? ' × ' + it.quantity : '') + '</span><span class="sv-checkout__iprice">' + esc(money(it.final_line_price)) + '</span></div>';
      }).join('');
      var first = c.items[0], label = esc(name(first)) + (c.items.length > 1 || first.quantity > 1 ? ' × ' + c.item_count : '');
      $$('[data-sv-co-mini-txt]', root).forEach(function (m) { m.innerHTML = '<b>' + label + '</b><span class="sv-display">' + esc(money(c.total_price)) + '</span>'; });
      if (thumb || first.image) $$('.sv-checkout__mini-thumb', root).forEach(function (t) { t.innerHTML = '<img src="' + esc(thumb || first.image) + '" alt="">'; });
      $$('[data-sv-co-subtotal]', root).forEach(function (st) { st.textContent = money(c.total_price); });
    }).catch(function () { /* récapitulatif du rendu conservé */ });
  }

  /* ---------------------------------------------------------------- Questions : recherche, filtres, accordéons */
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function initFaq(root) {
    var input = $('[data-sv-faq-search]', root), pills = $$('[data-sv-faq-filter]', root), items = $$('.sv-faq__item', root), empty = $('[data-sv-faq-empty]', root), cat = '';
    function apply() {
      var q = norm(input ? input.value : '').trim(), shown = 0;
      items.forEach(function (it) {
        var on = (!cat || it.getAttribute('data-cat') === cat) && (!q || norm(it.textContent).indexOf(q) !== -1);
        it.hidden = !on;
        if (on) { shown++; var n = $('[data-sv-faq-num]', it); if (n) n.textContent = (shown < 10 ? '0' : '') + shown; if (q && shown === 1) it.open = true; }
      });
      if (empty) empty.hidden = shown > 0;
    }
    pills.forEach(function (b) {
      b.addEventListener('click', function () {
        var c = b.getAttribute('data-sv-faq-filter'); cat = cat === c ? '' : c;
        pills.forEach(function (x) { var on = x.getAttribute('data-sv-faq-filter') === cat; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on)); });
        apply();
      });
    });
    if (input) input.addEventListener('input', apply);
    /* Lien vers une catégorie (« …/faq#machine ») : la pastille correspondante est activée. */
    var h = decodeURIComponent((location.hash || '').slice(1));
    pills.forEach(function (b) { if (h && b.getAttribute('data-sv-faq-filter') === h) b.click(); });
  }

  /* ---------------------------------------------------------------- Contact : erreurs par champ ; envoi simulé annoncé */
  function initContact(form) {
    var status = $('[data-sv-contact-status]', form);
    $$('input, select, textarea', form).forEach(function (i) { i.addEventListener('change', function () { if (i.getAttribute('aria-invalid') === 'true') checkField(i); }); });
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (e) {
      if (!checkAll(form)) { e.preventDefault(); return; }
      if (form.getAttribute('data-sv-contact') === 'true') {
        e.preventDefault();
        if (status) { status.hidden = false; status.textContent = status.getAttribute('data-text') || ''; }
      }
    });
  }

  /* ---------------------------------------------------------------- Suivi : espace client ; résultat d'exemple annoncé */
  function initTrack(form) {
    var res = $('[data-sv-track-result]', form);
    form.addEventListener('submit', function (e) {
      if (!checkAll(form)) { e.preventDefault(); if (res) res.hidden = true; return; }
      if (form.getAttribute('data-sv-track') === 'demo') { e.preventDefault(); if (res) { res.hidden = false; res.setAttribute('tabindex', '-1'); res.focus(); } }
    });
  }

  function start() {
    placeHeader();
    window.addEventListener('resize', placeHeader);
    initMenu();
    syncCountText(); initDrawer();
    initCookies();
    initNewsletter();
    $$('[data-sv-product]').forEach(initProduct);
    $$('[data-sv-journal]').forEach(initJournal);
    $$('[data-sv-checkout]').forEach(initCheckout);
    $$('[data-sv-toc-toggle]').forEach(function (b) { b.addEventListener('click', function () { var open = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', String(open)); b.closest('.sv-article__toc').classList.toggle('is-closed', !open); }); });
    $$('[data-sv-faq]').forEach(initFaq);
    $$('form[data-sv-contact]').forEach(initContact);
    $$('form[data-sv-track]').forEach(initTrack);
    document.dispatchEvent(new CustomEvent('sv:ready'));
  }
  window.SV = { openDrawer: openDrawer, closeDrawer: closeDrawer, addToCart: addToCart, post: post, cartBase: cartBase, setCount: setCount, $: $, $$: $$, CFG: CFG, T: T, LS: LS, SS: SS, readJSON: readJSON, writeJSON: writeJSON, esc: esc, money: money, announce: announce, trap: trap };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
