/* Thème E-COM STUDIO IA — interactions et animations.
   Aucune dépendance. Respecte prefers-reduced-motion et le réglage du thème. */
(function () {
  'use strict';
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var settings = window.themeSettings || {};
  var motion = settings.motion !== false && !reduce && 'IntersectionObserver' in window;
  var routes = window.routes || {};
  var strings = window.themeStrings || {};

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function formatMoney(cents, format) {
    format = format || settings.moneyFormat || '{{amount}} €';
    cents = typeof cents === 'string' ? cents.replace('.', '') : cents;
    function fmt(n, dec, ts, ds) {
      dec = dec == null ? 2 : dec; ts = ts || ','; ds = ds || '.';
      var num = (n / 100).toFixed(dec); var parts = num.split('.');
      return parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + ts) + (parts[1] ? ds + parts[1] : '');
    }
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, function (_, key) {
      switch (key) {
        case 'amount_no_decimals': return fmt(cents, 0);
        case 'amount_with_comma_separator': return fmt(cents, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return fmt(cents, 0, '.', ',');
        case 'amount_with_space_separator': return fmt(cents, 2, ' ', ',');
        default: return fmt(cents, 2);
      }
    });
  }
  function toast(msg) {
    var t = $('.es-toast'); if (!t) return;
    t.textContent = msg; t.hidden = false;
    clearTimeout(t._h); t._h = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* ---------- Apparitions au défilement ---------- */
  function initReveal(root) {
    var items = $$('[data-reveal]', root);
    if (!motion) { items.forEach(function (el) { el.classList.add('is-in'); }); return; }
    doc.classList.add('motion-ready');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { if (!el.classList.contains('is-in')) io.observe(el); });
  }

  /* ---------- Parallaxe (rAF, désactivée si mouvement réduit) ---------- */
  var parallaxItems = [];
  function initParallax() {
    if (!motion || settings.parallax === false) return;
    parallaxItems = $$('[data-parallax]').map(function (el) { return { el: el, speed: parseFloat(el.getAttribute('data-parallax')) || 0.15 }; });
  }
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var vh = window.innerHeight;
      parallaxItems.forEach(function (p) {
        var r = p.el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var center = r.top + r.height / 2 - vh / 2;
        p.el.style.transform = 'translate3d(0,' + (-center * p.speed).toFixed(1) + 'px,0)';
      });
      headerOnScroll();
      stickyBuyOnScroll();
      ticking = false;
    });
  }

  /* ---------- En-tête ---------- */
  var header = $('[data-header]'); var lastY = 0;
  function headerOnScroll() {
    if (!header) return;
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    if (header.classList.contains('es-header--sticky')) header.classList.toggle('is-hidden', y > 300 && y > lastY && !document.body.classList.contains('menu-open'));
    lastY = y;
  }
  function initMenu() {
    var menu = $('[data-mobile-menu]'); if (!menu) return;
    var opener = $('[data-menu-open]');
    function open() { menu.hidden = false; requestAnimationFrame(function () { menu.classList.add('is-open'); }); document.body.classList.add('menu-open'); document.body.style.overflow = 'hidden'; opener && opener.setAttribute('aria-expanded', 'true'); var c = $('[data-menu-close]', menu); c && c.focus(); }
    function close() { menu.classList.remove('is-open'); menu.hidden = true; document.body.classList.remove('menu-open'); document.body.style.overflow = ''; opener && opener.setAttribute('aria-expanded', 'false'); opener && opener.focus(); }
    opener && opener.addEventListener('click', open);
    $$('[data-menu-close]', menu).forEach(function (b) { b.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) close(); });
  }

  /* ---------- Panier latéral (API AJAX de Shopify) ---------- */
  var drawer = null;
  function drawerEl() { return drawer || (drawer = $('[data-cart-drawer]')); }
  function openDrawer() {
    var d = drawerEl(); if (!d) { window.location.href = routes.cart; return; }
    d.hidden = false; requestAnimationFrame(function () { d.classList.add('is-open'); });
    document.body.style.overflow = 'hidden';
    var c = $('[data-cart-close].es-icon-button', d); c && c.focus();
  }
  function closeDrawer() {
    var d = drawerEl(); if (!d) return;
    d.classList.remove('is-open'); document.body.style.overflow = '';
    setTimeout(function () { d.hidden = true; }, 450);
  }
  function renderDrawer(html) {
    var d = drawerEl(); if (!d || !html) return;
    var tmp = document.createElement('div'); tmp.innerHTML = html;
    var fresh = $('[data-cart-drawer]', tmp);
    if (fresh) { var panel = $('.es-drawer__panel', d); var newPanel = $('.es-drawer__panel', fresh); if (panel && newPanel) panel.innerHTML = newPanel.innerHTML; }
    bindDrawer();
  }
  function updateCount(count) {
    $$('[data-cart-count]').forEach(function (el) { el.textContent = count; el.hidden = !count; });
  }
  function bindDrawer() {
    var d = drawerEl(); if (!d) return;
    $$('[data-cart-close]', d).forEach(function (b) { b.onclick = closeDrawer; });
    $$('[data-qty-change]', d).forEach(function (b) {
      b.onclick = function () {
        var li = b.closest('[data-key]'); if (!li) return;
        changeLine(li.getAttribute('data-key'), parseInt(b.getAttribute('data-qty-change'), 10));
      };
    });
  }
  function changeLine(key, qty) {
    var d = drawerEl(); d && d.classList.add('is-loading');
    fetch(routes.cart_change, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: key, quantity: qty, sections: 'cart-drawer', sections_url: window.location.pathname })
    }).then(function (r) { return r.json(); }).then(function (cart) {
      updateCount(cart.item_count);
      if (cart.sections) renderDrawer(cart.sections['cart-drawer']);
    }).catch(function () { toast(strings.error); }).finally(function () { d && d.classList.remove('is-loading'); });
  }
  function initCart() {
    bindDrawer();
    if (settings.cartType === 'drawer') {
      $$('[data-cart-open]').forEach(function (a) { a.addEventListener('click', function (e) { if (drawerEl()) { e.preventDefault(); openDrawer(); } }); });
    }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
  }

  /* ---------- Fiche produit : variantes, quantité, ajout ---------- */
  function initBuy(root) {
    $$('[data-product-buy]', root).forEach(function (wrap) {
      var variants = []; try { variants = JSON.parse(($('[data-variants]', wrap) || {}).textContent || '[]'); } catch (e) {}
      var form = $('[data-product-form]', wrap);
      var idInput = $('[data-variant-id]', wrap);
      var addBtn = $('[data-add-button]', wrap);
      var addLabel = $('[data-add-label]', wrap);
      var errorEl = $('[data-form-error]', wrap);
      function selected() {
        var values = [];
        $$('[data-option-index]', wrap).forEach(function (input) {
          var i = parseInt(input.getAttribute('data-option-index'), 10);
          if (input.tagName === 'SELECT' || input.checked) values[i] = input.value;
        });
        return values;
      }
      function onChange() {
        var values = selected();
        var v = variants.find(function (x) { return x.options.every(function (o, i) { return values[i] === undefined || o === values[i]; }); });
        values.forEach(function (val, i) { var lab = $('[data-option-value="' + i + '"]', wrap); if (lab) lab.textContent = val; });
        if (!v) { addBtn.disabled = true; addLabel.textContent = strings.unavailable; return; }
        idInput.value = v.id;
        addBtn.disabled = !v.available;
        addLabel.textContent = v.available ? strings.addToCart : strings.soldOut;
        var section = wrap.closest('[data-main-product], [data-featured-product]');
        var priceWrap = section && $('[data-price]', section);
        if (priceWrap && v.price != null) { var cur = priceWrap.querySelector('.es-price__current'); if (cur) cur.textContent = formatMoney(v.price); }
        if (v.featured_media && section) goToMedia(section, v.featured_media.id);
        if (wrap.getAttribute('data-product-url') && history.replaceState && section && section.hasAttribute('data-main-product')) {
          history.replaceState({}, '', wrap.getAttribute('data-product-url') + '?variant=' + v.id);
        }
      }
      $$('[data-option-index]', wrap).forEach(function (input) { input.addEventListener('change', onChange); });
      $$('[data-qty-step]', wrap).forEach(function (b) {
        b.addEventListener('click', function () {
          var input = $('input[name="quantity"]', wrap); if (!input) return;
          input.value = Math.max(1, (parseInt(input.value, 10) || 1) + parseInt(b.getAttribute('data-qty-step'), 10));
        });
      });
      if (form) form.addEventListener('submit', function (e) {
        if (settings.cartType !== 'drawer' || !drawerEl()) return;
        e.preventDefault();
        errorEl && (errorEl.hidden = true);
        addBtn.setAttribute('aria-busy', 'true'); addBtn.disabled = true;
        var fd = new FormData(form);
        fd.append('sections', 'cart-drawer'); fd.append('sections_url', window.location.pathname);
        fetch(routes.cart_add, { method: 'POST', headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, body: fd })
          .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
          .then(function (res) {
            if (!res.ok || res.body.status) { errorEl.textContent = res.body.description || res.body.message || strings.error; errorEl.hidden = false; return; }
            if (res.body.sections) renderDrawer(res.body.sections['cart-drawer']);
            return fetch(routes.cart + '.js', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }).then(function (cart) { updateCount(cart.item_count); openDrawer(); });
          })
          .catch(function () { errorEl.textContent = strings.error; errorEl.hidden = false; })
          .finally(function () { addBtn.removeAttribute('aria-busy'); addBtn.disabled = false; });
      });
    });
  }

  /* ---------- Galerie produit ---------- */
  function goToMedia(section, mediaId) {
    var track = $('[data-gallery-track]', section); if (!track) return;
    var slide = $('[data-media-id="' + mediaId + '"]', track); if (!slide) return;
    var idx = Array.prototype.indexOf.call(track.children, slide);
    if (getComputedStyle(track).display === 'flex') track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
    else slide.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
    $$('[data-gallery-go]', section).forEach(function (t, i) { t.classList.toggle('is-active', i === idx); });
  }
  function initGallery() {
    $$('[data-gallery]').forEach(function (g) {
      var track = $('[data-gallery-track]', g);
      $$('[data-gallery-go]', g).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var i = parseInt(btn.getAttribute('data-gallery-go'), 10); var slide = track.children[i]; if (!slide) return;
          goToMedia(g.closest('section') || g, slide.getAttribute('data-media-id'));
        });
      });
      if (track) track.addEventListener('scroll', function () {
        if (getComputedStyle(track).display !== 'flex') return;
        var i = Math.round(track.scrollLeft / (track.children[0] ? track.children[0].offsetWidth + 8 : 1));
        $$('[data-gallery-go]', g).forEach(function (t, j) { t.classList.toggle('is-active', j === i); });
      }, { passive: true });
    });
  }

  /* ---------- Barre d'achat qui suit le défilement ---------- */
  var stickyBuy = null; var mainBuy = null;
  function initStickyBuy() {
    stickyBuy = $('[data-sticky-buy]'); mainBuy = $('#MainBuy');
    if (!stickyBuy || !mainBuy) return;
    stickyBuy.hidden = false;
    var btn = $('[data-sticky-add]', stickyBuy);
    btn && btn.addEventListener('click', function () {
      var form = $('[data-product-form]', mainBuy);
      if (form) { if (form.requestSubmit) form.requestSubmit(); else form.submit(); }
    });
  }
  function stickyBuyOnScroll() {
    if (!stickyBuy || !mainBuy) return;
    var r = mainBuy.getBoundingClientRect();
    var footer = $('.es-footer'); var fr = footer ? footer.getBoundingClientRect().top : Infinity;
    stickyBuy.classList.toggle('is-visible', r.bottom < 0 && fr > window.innerHeight);
  }

  /* ---------- Présentation au défilement ---------- */
  function initStory() {
    $$('[data-scroll-story]').forEach(function (s) {
      var steps = $$('[data-story-step]', s);
      var layers = $$('[data-story-layer]', s);
      var dots = $$('[data-story-dot]', s);
      function activate(i) {
        steps.forEach(function (st, j) { st.classList.toggle('is-active', j === i); });
        layers.forEach(function (l) { l.classList.toggle('is-active', parseInt(l.getAttribute('data-story-layer'), 10) === i); });
        dots.forEach(function (d, j) { d.classList.toggle('is-active', j === i); });
      }
      activate(0);
      if (!('IntersectionObserver' in window)) return;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) activate(parseInt(e.target.getAttribute('data-story-step'), 10)); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      steps.forEach(function (st) { io.observe(st); });
    });
  }

  /* ---------- Carrousel horizontal ---------- */
  function initHGallery() {
    $$('[data-hgallery]').forEach(function (g) {
      var track = $('[data-hg-track]', g); if (!track) return;
      function step(dir) { var item = track.children[0]; var w = item ? item.getBoundingClientRect().width + 20 : 300; track.scrollBy({ left: dir * w, behavior: reduce ? 'auto' : 'smooth' }); }
      var p = $('[data-hg-prev]', g), n = $('[data-hg-next]', g);
      p && p.addEventListener('click', function () { step(-1); });
      n && n.addEventListener('click', function () { step(1); });
    });
  }

  /* ---------- Vidéos ---------- */
  function initVideos() {
    $$('video[data-autoplay]').forEach(function (v) {
      if (reduce) { v.removeAttribute('autoplay'); v.pause(); v.controls = true; return; }
      var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) v.play().catch(function () {}); else v.pause(); }); }, { threshold: 0.2 }) : null;
      io && io.observe(v);
    });
    $$('[data-video-toggle]').forEach(function (b) {
      var v = b.parentElement.querySelector('video'); if (!v) return;
      b.addEventListener('click', function () {
        if (v.paused) { v.play(); b.classList.remove('is-paused'); } else { v.pause(); b.classList.add('is-paused'); }
      });
    });
  }

  /* ---------- Divers ---------- */
  function initMisc() {
    $$('[data-autosubmit]').forEach(function (s) { s.addEventListener('change', function () { s.form.submit(); }); });
    $$('[data-filters] input[type=checkbox]').forEach(function (c) { c.addEventListener('change', function () { c.form.submit(); }); });
    $$('[data-recos]').forEach(function (el) {
      var url = el.getAttribute('data-url'); if (!url || el.children.length) return;
      fetch(url).then(function (r) { return r.text(); }).then(function (html) {
        var tmp = document.createElement('div'); tmp.innerHTML = html;
        var fresh = tmp.querySelector('[data-recos]'); if (fresh && fresh.innerHTML.trim()) { el.innerHTML = fresh.innerHTML; initReveal(el); }
      }).catch(function () {});
    });
  }

  function init() {
    initReveal(document);
    initParallax();
    initMenu();
    initCart();
    initBuy(document);
    initGallery();
    initStickyBuy();
    initStory();
    initHGallery();
    initVideos();
    initMisc();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  /* Éditeur de thème Shopify : réinitialise les sections rechargées. */
  document.addEventListener('shopify:section:load', function (e) { initReveal(e.target); initBuy(e.target); initStory(); initHGallery(); initParallax(); initVideos(); initGallery(); });
})();
