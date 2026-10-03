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
      scrollEffects();
      narrativeOnScroll();
      ticking = false;
    });
  }

  /* ---------- En-tête ---------- */
  var header = $('[data-header]'); var lastY = 0;
  function headerOnScroll() {
    if (!header) return;
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    // En-tête transparent fixé : il reste sous le bandeau d'annonce tant que celui-ci est visible.
    if (header.classList.contains('es-header--transparent')) {
      var ann = $('.es-announcement-section');
      var annBottom = ann ? ann.getBoundingClientRect().bottom : 0;
      header.style.setProperty('--es-hoff', Math.max(0, annBottom) + 'px');
    }
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
        var withPrice = !!$('[data-button-price]', wrap) || wrap.hasAttribute('data-price-in-button');
        if (withPrice) wrap.setAttribute('data-price-in-button', '');
        addLabel.textContent = v.available ? strings.addToCart + (withPrice && v.price != null ? ' – ' + formatMoney(v.price) : '') : strings.soldOut;
        var section = wrap.closest('[data-main-product], [data-featured-product]');
        var priceWrap = section && $('[data-price]', section);
        if (priceWrap && v.price != null) { var cur = priceWrap.querySelector('.es-price__current'); if (cur) cur.textContent = formatMoney(v.price); }
        if (v.featured_media && section) goToMedia(section, v.featured_media.id);
        if (section) section.dispatchEvent(new CustomEvent('es:variant', { detail: v }));
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

  /* ---------- Lots (compose ton panier) et abonnement ---------- */
  function initOffers(root) {
    $$('[data-bundles]', root).forEach(function (box) {
      var section = box.closest('[data-main-product]') || document;
      var units = parseInt(box.getAttribute('data-units'), 10) || 0;
      function pick(btn) {
        $$('.es-bundle', box).forEach(function (b) { b.setAttribute('aria-checked', b === btn ? 'true' : 'false'); });
        var q = $('input[name="quantity"]', section); if (q) q.value = btn.getAttribute('data-qty');
      }
      $$('.es-bundle', box).forEach(function (b) { b.addEventListener('click', function () { pick(b); }); });
      var initial = $('.es-bundle[aria-checked="true"]', box); if (initial) pick(initial);
      section.addEventListener('es:variant', function (e) {
        var price = e.detail && e.detail.price; if (price == null) return;
        $$('.es-bundle', box).forEach(function (b) {
          var q = +b.getAttribute('data-qty'), d = +b.getAttribute('data-discount') || 0;
          var full = price * q, total = Math.round(full * (100 - d) / 100);
          var p = $('[data-bundle-price]', b); if (p) p.textContent = formatMoney(total);
          var c = $('[data-bundle-compare]', b); if (c) c.textContent = formatMoney(full);
          var u = $('[data-bundle-unit]', b); if (u && units) u.textContent = formatMoney(Math.round(total / (units * q)));
        });
      });
    });
    $$('[data-subscribe]', root).forEach(function (box) {
      var section = box.closest('[data-main-product]') || document;
      var form = $('[data-product-form]', section); if (!form) return;
      function sync() {
        var sel = $('input[type="radio"]:checked', box), val = sel ? sel.value : '';
        var hidden = $('input[name="selling_plan"]', form);
        if (val) { if (!hidden) { hidden = document.createElement('input'); hidden.type = 'hidden'; hidden.name = 'selling_plan'; form.appendChild(hidden); } hidden.value = val; }
        else if (hidden) hidden.remove();
      }
      $$('input[type="radio"]', box).forEach(function (r) { r.addEventListener('change', sync); });
      sync();
    });
  }

  /* ---------- Livraison estimée (délais réels saisis par le marchand) ---------- */
  function initEta(root) {
    $$('[data-eta]', root).forEach(function (box) {
      var min = parseInt(box.getAttribute('data-min'), 10) || 0, max = parseInt(box.getAttribute('data-max'), 10) || 0;
      var business = box.getAttribute('data-business') === 'true';
      function add(days) {
        var d = new Date();
        while (days > 0) { d.setDate(d.getDate() + 1); if (!business || (d.getDay() !== 0 && d.getDay() !== 6)) days--; }
        return d;
      }
      var fmt = function (d) { return d.toLocaleDateString(document.documentElement.lang || 'fr', { weekday: 'short', day: 'numeric', month: 'short' }); };
      var out = $('[data-eta-range]', box); if (!out || !max) return;
      out.textContent = min && min !== max ? fmt(add(min)) + ' – ' + fmt(add(max)) : fmt(add(max));
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
    var section = mainBuy.closest('[data-main-product]') || document;
    section.addEventListener('es:variant', stickySummary);
    section.addEventListener('click', function (e) { if (e.target.closest('.es-bundle, [data-qty-step]')) setTimeout(stickySummary, 0); });
    section.addEventListener('input', function (e) { if (e.target.name === 'quantity') stickySummary(); });
    stickySummary();
    var btn = $('[data-sticky-add]', stickyBuy);
    btn && btn.addEventListener('click', function () {
      var form = $('[data-product-form]', mainBuy);
      if (form) { if (form.requestSubmit) form.requestSubmit(); else form.submit(); }
    });
  }
  /* Résumé de la barre : lot ou quantité, variante, total. */
  function stickySummary() {
    if (!stickyBuy || !mainBuy) return;
    var section = mainBuy.closest('[data-main-product]') || document;
    var variants = []; try { variants = JSON.parse(($('[data-variants]', section) || {}).textContent || '[]'); } catch (e) {}
    var idInput = $('[data-variant-id]', section);
    var v = variants.find(function (x) { return idInput && String(x.id) === String(idInput.value); }) || variants[0];
    if (!v) return;
    var qInput = $('input[name="quantity"]', section);
    var q = Math.max(1, parseInt(qInput && qInput.value, 10) || 1);
    var bundle = $('.es-bundle[aria-checked="true"]', section);
    var discount = bundle && +bundle.getAttribute('data-qty') === q ? +bundle.getAttribute('data-discount') || 0 : 0;
    var parts = [];
    if (bundle && +bundle.getAttribute('data-qty') === q) { var lab = $('.es-bundle__label', bundle); parts.push(lab ? lab.childNodes[0].textContent.trim() : q + ' ×'); }
    else if (q > 1) parts.push(q + ' ×');
    if (v.title && v.title !== 'Default Title') parts.push(v.title);
    var meta = $('[data-sticky-meta]', stickyBuy); if (meta) meta.textContent = parts.join(' · ') + (parts.length ? ' ·' : '');
    var total = $('[data-sticky-total]', stickyBuy); if (total && v.price != null) total.textContent = formatMoney(Math.round(v.price * q * (100 - discount) / 100));
    var btn = $('[data-sticky-add]', stickyBuy); if (btn) btn.disabled = !v.available;
  }
  function stickyBuyOnScroll() {
    if (!stickyBuy || !mainBuy) return;
    var r = mainBuy.getBoundingClientRect();
    var footer = $('.es-footer'); var fr = footer ? footer.getBoundingClientRect().top : Infinity;
    // Visible dès que le bouton d'ajout n'est plus à l'écran (passé sous l'en-tête ou hors champ), masquée au pied de page.
    var headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h'), 10) || 0;
    var inView = r.top < window.innerHeight && r.bottom > headerH;
    stickyBuy.classList.toggle('is-visible', !inView && window.scrollY > 120 && fr > window.innerHeight);
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

  /* ---------- Routine en gestes : un geste par portion de défilement ---------- */
  function initRoutine() {
    $$('[data-routine]').forEach(function (s) {
      if (s.__routine) return; s.__routine = true;
      var steps = $$('[data-routine-step]', s), shots = $$('[data-routine-shot]', s);
      var cur = $('[data-routine-current]', s), bar = $('[data-routine-bar]', s), track = $('.es-routine__track', s);
      var n = steps.length, last = -1;
      function show(i, p) {
        if (i !== last) {
          last = i;
          steps.forEach(function (x, j) { x.classList.toggle('is-active', j === i); });
          shots.forEach(function (x, j) { x.classList.toggle('is-active', j === i); });
          if (cur) cur.textContent = (i + 1 < 10 ? '0' : '') + (i + 1);
        }
        if (bar) bar.style.width = Math.round(p * 100) + '%';
      }
      if (reduce || !n) { show(0, 1); return; }
      function onScroll() {
        var r = track.getBoundingClientRect();
        var total = Math.max(1, r.height - window.innerHeight);
        var p = Math.min(1, Math.max(0, -r.top / total));
        show(Math.min(n - 1, Math.floor(p * n)), p);
      }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll();
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

  /* ---------- Couche premium : mots, zoom, texte allumé, compteurs, comparateur, néon, boutons flottants ---------- */
  function splitWords(el) {
    if (el.getAttribute('data-split') === '1') return;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    var wi = 0;
    nodes.forEach(function (n) {
      if (!n.nodeValue.trim()) return;
      var frag = document.createDocumentFragment();
      n.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var w = document.createElement('span'); w.className = 'es-w'; w.style.setProperty('--wi', wi++); w.textContent = part; frag.appendChild(w);
      });
      n.parentNode.replaceChild(frag, n);
    });
    el.setAttribute('data-split', '1');
  }
  function initWords(root) {
    if (!motion) return;
    $$('[data-reveal="words"], [data-scroll-words]', root).forEach(splitWords);
  }

  var zoomItems = [], wordBlocks = [];
  function initScrollEffects() {
    if (!motion) return;
    zoomItems = $$('[data-scroll-zoom]');
    wordBlocks = $$('[data-scroll-words]').map(function (el) { return { el: el, words: $$('.es-w', el) }; });
  }
  function scrollEffects() {
    var vh = window.innerHeight;
    zoomItems.forEach(function (el) {
      var r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
      var p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      el.style.setProperty('--sz', (1.18 - p * 0.18).toFixed(4));
    });
    wordBlocks.forEach(function (b) {
      var r = b.el.getBoundingClientRect(); if (r.bottom < -vh || r.top > vh * 1.5) return;
      var p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
      var lit = Math.round(p * b.words.length);
      b.words.forEach(function (w, i) { w.classList.toggle('is-lit', i < lit); });
    });
    var top = $('[data-back-to-top]'); if (top) top.classList.toggle('is-visible', window.scrollY > vh * 0.8);
  }

  function initCounters(root) {
    $$('[data-count]', root).forEach(function (el) {
      var raw = el.getAttribute('data-count'); var m = raw.match(/^(\D*)(\d+(?:[.,]\d+)?)(.*)$/);
      if (!m || !motion || !('IntersectionObserver' in window)) return;
      var target = parseFloat(m[2].replace(',', '.')); var dec = (m[2].split(/[.,]/)[1] || '').length; var sep = m[2].indexOf(',') > -1 ? ',' : '.';
      el.textContent = m[1] + (0).toFixed(dec).replace('.', sep) + m[3];
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return; io.disconnect();
        var t0 = performance.now();
        (function step(t) {
          var k = Math.min(1, (t - t0) / 1600); var e = 1 - Math.pow(1 - k, 3);
          el.textContent = m[1] + (target * e).toFixed(dec).replace('.', sep) + m[3];
          if (k < 1) requestAnimationFrame(step);
        })(t0);
      }, { threshold: 0.6 });
      io.observe(el);
    });
  }

  function initCompare(root) {
    $$('[data-compare]', root).forEach(function (c) {
      var range = $('input[type=range]', c); if (!range || range._es) return; range._es = true;
      function set() { c.style.setProperty('--pos', range.value + '%'); }
      range.addEventListener('input', set); set();
    });
  }

  function initGlow(root) {
    var cards = $$('.es-glow', root);
    cards.forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left) + 'px'); card.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    // Sur écran tactile, la carte au centre de l'écran s'illumine.
    if (!('IntersectionObserver' in window) || window.matchMedia('(hover: hover)').matches) return;
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { e.target.classList.toggle('is-lit', e.isIntersecting); }); }, { rootMargin: '-35% 0px -35% 0px' });
    cards.forEach(function (c) { io.observe(c); });
  }

  /* ---------- Frise d'étapes, texte en courbe, vidéos verticales ---------- */
  var timelines = [], curves = [], curveT0 = 0;
  function initNarrative(root) {
    timelines = $$('[data-timeline]').map(function (el) { return { el: el, steps: $$('[data-timeline-step]', el) }; });
    curves = $$('[data-curve-text]').map(function (tp) {
      var path = document.getElementById((tp.getAttribute('href') || '').slice(1));
      var text = tp.parentNode; var rep = 50;
      try { rep = (text.getComputedTextLength() / 8) / path.getTotalLength() * 100; } catch (e) {}
      return { tp: tp, rep: rep > 0 && rep < 100 ? rep : 50 };
    });
    if (curves.length && motion && !curveT0) {
      curveT0 = performance.now();
      (function loop(t) {
        var base = (t - curveT0) / 1000 * 2.2 + lastScrollBoost;
        curves.forEach(function (c) { c.tp.setAttribute('startOffset', (-(base % c.rep)).toFixed(3) + '%'); });
        requestAnimationFrame(loop);
      })(curveT0);
    }
    $$('[data-reels]', root).forEach(initReels);
  }
  var lastScrollBoost = 0;
  function narrativeOnScroll() {
    var vh = window.innerHeight;
    lastScrollBoost = window.scrollY / 40;
    timelines.forEach(function (t) {
      var r = t.el.getBoundingClientRect();
      var p = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / Math.max(1, r.height)));
      t.el.style.setProperty('--tl', p.toFixed(3));
      t.steps.forEach(function (s) { s.classList.toggle('is-lit', !motion || s.getBoundingClientRect().top < vh * 0.62); });
    });
  }
  function initReels(section) {
    if (section._es) return; section._es = true;
    var track = $('[data-reels-track]', section), items = $$('[data-reel]', section), bar = $('[data-reels-progress]', section);
    if (!track || !items.length) return;
    items.forEach(function (it) {
      var v = $('video', it); if (!v) return;
      v.muted = true; v.loop = true; v.playsInline = true;
      var snd = $('[data-reel-sound]', it), play = $('[data-reel-play]', it);
      snd && snd.addEventListener('click', function () { v.muted = !v.muted; snd.setAttribute('aria-pressed', String(!v.muted)); snd.setAttribute('aria-label', v.muted ? 'Activer le son' : 'Couper le son'); });
      play && play.addEventListener('click', function () { if (v.paused) { v.play().catch(function () {}); play.classList.remove('is-paused'); it._userPaused = false; } else { v.pause(); play.classList.add('is-paused'); it._userPaused = true; } });
    });
    function update() {
      var c = track.scrollLeft + track.clientWidth / 2, best = null, bd = 1e9;
      items.forEach(function (it) { var d = Math.abs(it.offsetLeft + it.offsetWidth / 2 - c); if (d < bd) { bd = d; best = it; } });
      items.forEach(function (it) {
        var v = $('video', it); it.classList.toggle('is-active', it === best);
        if (!v) return;
        if (it === best && !it._userPaused && !reduce) v.play().catch(function () {}); else v.pause();
      });
      if (bar) { var max = track.scrollWidth - track.clientWidth; bar.style.setProperty('--p', (max > 0 ? 15 + 85 * track.scrollLeft / max : 100) + '%'); }
    }
    track.addEventListener('scroll', function () { requestAnimationFrame(update); }, { passive: true });
    // Centre la première vidéo et ne lit qu'à l'écran.
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { if (es[0].isIntersecting) update(); else items.forEach(function (it) { var v = $('video', it); v && v.pause(); }); }, { threshold: 0.3 }).observe(track);
    update();
  }

  function init() {
    initWords(document);
    initReveal(document);
    initParallax();
    initScrollEffects();
    initCounters(document);
    initCompare(document);
    initGlow(document);
    initNarrative(document);
    if ($('.es-sticky-buy')) document.body.classList.add('has-sticky-buy');
    initMenu();
    initCart();
    initBuy(document);
    initOffers(document);
    initEta(document);
    initGallery();
    initStickyBuy();
    initStory();
    initRoutine();
    initHGallery();
    initVideos();
    initMisc();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  /* Éditeur de thème Shopify : réinitialise les sections rechargées. */
  document.addEventListener('shopify:section:load', function (e) { initNarrative(e.target); initWords(e.target); initCounters(e.target); initCompare(e.target); initGlow(e.target); initScrollEffects(); initReveal(e.target); initBuy(e.target); initOffers(e.target); initEta(e.target); initStory(); initRoutine(); initHGallery(); initParallax(); initVideos(); initGallery(); });
})();
