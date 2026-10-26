/* Sections de bibliothèque par famille (issue #141) : carrousel, comparaison avant/après, repères produits, image qui
   suit le récit, frise qui progresse, vidéo en lecture automatique, défilement des références.
   Aucune dépendance. Respecte « réduire les animations » et le réglage « animations » du thème ; chaque interaction
   reste utilisable au clavier et sans JavaScript (contenu visible, défilement natif). */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var motion = (window.themeSettings || {}).motion !== false && !reduce;
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function carousel(root) {
    var track = root.querySelector('[data-fs-track]'); if (!track) return;
    var prev = root.querySelector('[data-fs-prev]'), next = root.querySelector('[data-fs-next]');
    function step(dir) {
      var slide = track.querySelector('[data-fs-slide]'); var w = slide ? slide.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0) : track.clientWidth;
      track.scrollBy({ left: dir * w, behavior: reduce ? 'auto' : 'smooth' });
    }
    function sync() {
      var max = track.scrollWidth - track.clientWidth - 2;
      if (prev) prev.disabled = track.scrollLeft <= 2;
      if (next) next.disabled = track.scrollLeft >= max;
      var nav = root.querySelector('.fs-carousel__nav'); if (nav) nav.hidden = max <= 0;
    }
    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });
    track.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); step(1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); } });
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  function compare(fig) {
    var range = fig.querySelector('[data-fs-compare-range]'), stage = fig.querySelector('.fs-compare__stage'); if (!range || !stage) return;
    function set(v) { stage.style.setProperty('--fs-pos', v + '%'); }
    range.addEventListener('input', function () { set(range.value); });
    set(range.value);
  }

  function hotspots(scene) {
    var buttons = $$('[data-fs-hotspot]', scene);
    function close(except) { buttons.forEach(function (b) { if (b === except) return; b.setAttribute('aria-expanded', 'false'); var c = document.getElementById(b.getAttribute('aria-controls')); if (c) c.hidden = true; }); }
    buttons.forEach(function (b) {
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') === 'true'; close(b);
        b.setAttribute('aria-expanded', String(!open)); var c = document.getElementById(b.getAttribute('aria-controls')); if (c) c.hidden = open;
      });
    });
    scene.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return; var openBtn = buttons.filter(function (b) { return b.getAttribute('aria-expanded') === 'true'; })[0];
      if (openBtn) { close(); openBtn.focus(); }
    });
    document.addEventListener('click', function (e) { if (!scene.contains(e.target)) close(); });
  }

  function stickySteps(section) {
    var visual = section.querySelector('[data-fs-sticky-visual]'), steps = $$('[data-fs-step]', section);
    if (!visual || !steps.length || !('IntersectionObserver' in window)) return;
    var frames = $$('.fs-making__frame', visual);
    var holder = visual.closest('.fs-making, .fs-case') || section;
    function show(i) {
      var target = visual.querySelector('[data-fs-step-visual="' + i + '"]');
      if (!target) { var prior = steps.slice(0, i + 1).map(function (s) { return visual.querySelector('[data-fs-step-visual="' + s.getAttribute('data-fs-step') + '"]'); }).filter(Boolean); target = prior[prior.length - 1] || frames[0]; }
      frames.forEach(function (f) { f.classList.toggle('is-current', f === target); });
      steps.forEach(function (s) { s.classList.toggle('is-current', s.getAttribute('data-fs-step') === String(i)); });
    }
    if (window.matchMedia('(max-width: 749px)').matches) return;
    visual.classList.add('is-live'); holder.classList.add('is-live');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) show(+e.target.getAttribute('data-fs-step')); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (s) { io.observe(s); });
    show(0);
  }

  function progress(list) {
    if (!motion) { list.style.setProperty('--fs-progress', 1); return; }
    var ticking = false;
    function update() {
      ticking = false; var r = list.getBoundingClientRect(), vh = window.innerHeight;
      var p = Math.min(1, Math.max(0, (vh * .6 - r.top) / Math.max(1, r.height)));
      list.style.setProperty('--fs-progress', p.toFixed(3));
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  function autoplay(v) {
    if (!motion) { v.removeAttribute('autoplay'); v.pause(); v.controls = true; return; }
    if (!('IntersectionObserver' in window)) { v.play().catch(function () {}); return; }
    new IntersectionObserver(function (entries) { entries.forEach(function (e) { if (e.isIntersecting) v.play().catch(function () {}); else v.pause(); }); }, { threshold: .35 }).observe(v);
  }

  function marquee(m) { if (!motion) m.classList.add('is-paused'); }

  function init(root) {
    $$('[data-fs-carousel]', root).forEach(carousel);
    $$('[data-fs-compare]', root).forEach(compare);
    $$('[data-fs-hotspots]', root).forEach(hotspots);
    $$('.fs-making--sticky, .fs-case--sticky', root).forEach(function (s) { stickySteps(s.closest('.fs') || s); });
    $$('[data-fs-progress]', root).forEach(progress);
    $$('[data-fs-autoplay]', root).forEach(autoplay);
    $$('[data-fs-marquee]', root).forEach(marquee);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(document); }); else init(document);
  document.addEventListener('shopify:section:load', function (e) { init(e.target); });
})();

/* Filtres en pastilles (journal, boutique, questions par thème — maquettes MUSEAU CLUB) : un bouton [data-chip-filter]
   montre les éléments [data-chip-item] de sa section dont la catégorie correspond ; « Tous » (valeur vide) montre tout.
   Pagination (journal NOCTIL) : une liste [data-paginate="n"] ne montre que n éléments filtrés à la fois ; les numéros
   de page et « Suivant » sont des boutons construits ici (sans JavaScript, tout reste visible). */
(function () {
  function pages(root) {
    var items = [].slice.call(root.querySelectorAll('[data-chip-item]'));
    var on = items.filter(function (it) { return it.getAttribute('data-out') !== '1'; });
    var list = root.querySelector('[data-paginate]');
    if (!list) { items.forEach(function (it) { it.hidden = it.getAttribute('data-out') === '1'; }); return; }
    var per = parseInt(list.getAttribute('data-paginate'), 10) || on.length || 1;
    var n = Math.max(1, Math.ceil(on.length / per));
    var cur = Math.min(parseInt(list.getAttribute('data-page') || '1', 10) || 1, n);
    list.setAttribute('data-page', cur);
    items.forEach(function (it) { it.hidden = true; });
    on.forEach(function (it, i) { it.hidden = Math.floor(i / per) + 1 !== cur; });
    var nav = root.querySelector('[data-pager]'); if (!nav) return;
    nav.hidden = n < 2; nav.innerHTML = '';
    for (var p = 1; p <= n; p++) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'fs-pager__page' + (p === cur ? ' is-active' : '');
      b.textContent = p; b.setAttribute('data-page-go', p); b.setAttribute('aria-label', (nav.getAttribute('data-page-label') || 'Page') + ' ' + p);
      if (p === cur) b.setAttribute('aria-current', 'page');
      nav.appendChild(b);
    }
    if (cur < n) { var nx = document.createElement('button'); nx.type = 'button'; nx.className = 'fs-pager__next'; nx.setAttribute('data-page-go', cur + 1); nx.setAttribute('aria-label', nav.getAttribute('data-next-label') || 'Suivant'); nx.textContent = '→'; nav.appendChild(nx); }
  }
  document.addEventListener('click', function (e) {
    var g = e.target.closest && e.target.closest('[data-page-go]');
    if (g) {
      var r = g.closest('section') || document, l = r.querySelector('[data-paginate]');
      if (l) { l.setAttribute('data-page', g.getAttribute('data-page-go')); pages(r); var f = r.querySelector('[data-pager] [aria-current]'); if (f) f.focus(); if (r.scrollIntoView) r.scrollIntoView({ block: 'start' }); }
      return;
    }
    var b = e.target.closest && e.target.closest('[data-chip-filter]'); if (!b) return;
    var root = b.closest('section') || document;
    var tag = b.getAttribute('data-chip-filter');
    // Bouton « Voir tous les produits » de l'état vide : la pastille correspondante devient active (SOUPLE).
    var chip = b.closest('[data-chip-empty]') ? root.querySelector('[data-chip-filters] [data-chip-filter="' + tag + '"]') || b : b;
    root.querySelectorAll('[data-chip-filters] [data-chip-filter], [data-chip-filter]:not([data-chip-empty] *)').forEach(function (x) { var on = x === chip; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    root.querySelectorAll('[data-chip-item]').forEach(function (it) { it.setAttribute('data-out', tag && (' ' + it.getAttribute('data-chip-item') + ' ').indexOf(' ' + tag + ' ') < 0 ? '1' : ''); });
    var list = root.querySelector('[data-paginate]'); if (list) list.setAttribute('data-page', '1');
    pages(root);
    var none = root.querySelector('[data-chip-empty]');
    if (none) { var left = [].some.call(root.querySelectorAll('[data-chip-item]'), function (it) { return it.getAttribute('data-out') !== '1'; }); none.hidden = left; if (!left && chip !== b) chip.focus(); }
  });
  // Tri dans la page (boutique SOUPLE) : réordonne les cartes [data-sort-item] selon le prix, le nom ou l'ordre d'origine.
  document.addEventListener('change', function (e) {
    var sel = e.target.closest && e.target.closest('[data-client-sort]'); if (!sel) return;
    var root = sel.closest('section') || document, list = root.querySelector('[data-sort-list]'); if (!list) return;
    var how = sel.value, items = [].slice.call(list.querySelectorAll('[data-sort-item]'));
    var num = function (el, k) { return parseFloat(el.getAttribute(k)) || 0; };
    items.sort(function (a, b) {
      if (how === 'price-asc') return num(a, 'data-sort-price') - num(b, 'data-sort-price') || num(a, 'data-sort-index') - num(b, 'data-sort-index');
      if (how === 'price-desc') return num(b, 'data-sort-price') - num(a, 'data-sort-price') || num(a, 'data-sort-index') - num(b, 'data-sort-index');
      if (how === 'title') return (a.getAttribute('data-sort-title') || '').localeCompare(b.getAttribute('data-sort-title') || '', document.documentElement.lang || 'fr');
      return num(a, 'data-sort-index') - num(b, 'data-sort-index');
    });
    items.forEach(function (it) { list.appendChild(it); });
  });
  function init(scope) { [].forEach.call((scope || document).querySelectorAll('[data-paginate]'), function (l) { pages(l.closest('section') || document); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(document); }); else init(document);
  document.addEventListener('shopify:section:load', function (e) { init(e.target); });
})();

/* Commande d'exemple en étapes (demo-order « steps », maquettes SOUPLE du 23 octobre) : Contact → Adresse → Livraison →
   Paiement. Chaque étape vérifie ses champs (message sous le champ, focus sur le premier en erreur) ; « Retour » revient
   sans rien effacer. Le récapitulatif est lu dans le vrai panier (/cart.js) : lignes, quantités, sous-total. Rien n'est
   envoyé ni payé : la saisie reste dans l'onglet (sessionStorage) et la confirmation d'exemple la reprend. */
(function () {
  var KEY = function (shop) { return 'es-demo-order:' + (shop || 'shop'); };
  function money(cents, cur) {
    var v = (Number(cents) || 0) / 100;
    try { return new Intl.NumberFormat(document.documentElement.lang || 'fr-FR', { style: 'currency', currency: cur || 'EUR', minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(v); } catch (e) { return v + ' ' + (cur || '€'); }
  }
  function read(k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function write(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* navigation privée : la démonstration continue sans mémoire */ } }
  function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
  function renderLines(root, lines, cur) {
    var ul = root.querySelector('[data-order-lines]'); if (!ul) return;
    ul.innerHTML = lines.map(function (l) {
      return '<li class="es-order__line"><span class="es-order__thumb">' + (l.image ? '<img src="' + esc(l.image) + '" alt="" loading="lazy">' : '') + '</span>' +
        '<span class="es-order__line-info"><strong>' + esc(l.title) + '</strong><span>' + esc(l.qtyLabel || ('Qté : ' + l.qty)) + '</span></span>' +
        '<span class="es-order__qty">' + esc(l.qty) + '</span><span class="es-order__price">' + esc(money(l.total, cur)) + '</span></li>';
    }).join('');
  }
  function fromCart(cart) {
    return (cart && cart.items || []).map(function (it) {
      var img = it.featured_image && it.featured_image.url || it.image || '';
      return { title: it.product_title || it.title, qty: it.quantity, total: it.final_line_price != null ? it.final_line_price : it.line_price, image: img };
    });
  }
  function initSteps(wrap) {
    if (wrap.__ready) return; wrap.__ready = true;
    var form = wrap.querySelector('[data-order-form]'), steps = [].slice.call(wrap.querySelectorAll('[data-step]'));
    var back = wrap.querySelector('[data-step-back]'), next = wrap.querySelector('[data-step-next]'), label = next && next.querySelector('[data-next-label]');
    var status = wrap.querySelector('[data-order-status]'), key = KEY(wrap.getAttribute('data-shop')), cur = 1, cart = null;
    var saved = read(key + ':draft') || {};
    [].forEach.call(form.elements, function (el) { if (el.name && saved[el.name] != null) { if (el.type === 'checkbox' || el.type === 'radio') el.checked = el.type === 'radio' ? el.value === saved[el.name] : !!saved[el.name]; else el.value = saved[el.name]; } });
    function data() { var o = {}; [].forEach.call(form.elements, function (el) { if (!el.name) return; if (el.type === 'checkbox') o[el.name] = el.checked; else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; } else o[el.name] = el.value.trim(); }); return o; }
    form.addEventListener('input', function () { write(key + ':draft', data()); });
    form.addEventListener('change', function () { write(key + ':draft', data()); });
    function show(n) {
      cur = n;
      steps.forEach(function (f) { f.hidden = Number(f.getAttribute('data-step')) !== n; });
      wrap.querySelectorAll('[data-step-dot]').forEach(function (d) { var i = Number(d.getAttribute('data-step-dot')); d.classList.toggle('is-current', i === n); d.classList.toggle('is-done', i < n); if (i === n) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
      if (back) back.hidden = n === 1;
      if (label) label.textContent = n === steps.length ? label.getAttribute('data-last-label') : label.getAttribute('data-next-label');
      if (n === steps.length) review();
      var first = steps[n - 1].querySelector('input:not([type=hidden]),select,textarea'); if (first && wrap.__moved) first.focus();
      wrap.__moved = true;
    }
    function review() {
      var d = data(), dl = wrap.querySelector('[data-order-review]'); if (!dl) return;
      var rows = [[steps[0].querySelector('legend').textContent, d.email], [steps[1].querySelector('legend').textContent, [d.first_name + ' ' + d.last_name, d.address, (d.zip + ' ' + d.city).trim(), d.country].filter(Boolean).join(', ')], [steps[2].querySelector('legend').textContent, (wrap.querySelector('[name=shipping]:checked') || {}).parentNode ? wrap.querySelector('[name=shipping]:checked').parentNode.textContent.trim() : '']];
      dl.innerHTML = rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('');
    }
    function check(fs) {
      var bad = null;
      fs.querySelectorAll('input,select,textarea').forEach(function (el) {
        if (!el.willValidate) return;
        var err = el.closest('label') && el.closest('label').querySelector('[data-error]') || fs.querySelector('[data-error]');
        var ok = el.checkValidity() && !(el.required && !String(el.value).trim());
        el.setAttribute('aria-invalid', ok ? 'false' : 'true');
        if (err) { err.hidden = ok; err.textContent = ok ? '' : (el.getAttribute('data-msg') || el.validationMessage); if (!ok && err.id === '') err.id = 'err-' + Math.random().toString(36).slice(2); if (!ok) el.setAttribute('aria-describedby', err.id); }
        if (!ok && !bad) bad = el;
      });
      if (bad) bad.focus();
      return !bad;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!cart || !cart.items || !cart.items.length) { var em = wrap.querySelector('[data-order-empty]'); if (em) { em.hidden = false; em.focus && em.focus(); } return; }
      if (!check(steps[cur - 1])) { if (status) status.textContent = ''; return; }
      if (cur < steps.length) { show(cur + 1); return; }
      var d = data();
      write(key + ':last', { contact: d, lines: fromCart(cart), subtotal: cart.items_subtotal_price != null ? cart.items_subtotal_price : cart.total_price, currency: cart.currency, count: cart.item_count });
      location.href = wrap.getAttribute('data-confirm');
    });
    if (back) back.addEventListener('click', function () { if (cur > 1) show(cur - 1); });
    fetch((window.routes && (window.routes.cart || window.routes.cart_url) || '/cart') + '.js', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }).then(function (c) {
      cart = c;
      var lines = fromCart(c);
      renderLines(wrap, lines, c.currency);
      var n = wrap.querySelector('[data-order-count]'); if (n) n.textContent = c.item_count ? '(' + c.item_count + ' ' + (c.item_count > 1 ? 'articles' : 'article') + ')' : '';
      var sub = c.items_subtotal_price != null ? c.items_subtotal_price : c.total_price;
      wrap.querySelectorAll('[data-order-subtotal],[data-order-total]').forEach(function (el) { el.textContent = money(sub, c.currency); });
      var em = wrap.querySelector('[data-order-empty]'); if (em) em.hidden = !!(c.items && c.items.length);
      if (next) next.disabled = !(c.items && c.items.length);
    }).catch(function () { if (status) status.textContent = wrap.getAttribute('data-empty-text') || ''; });
    show(1); wrap.__moved = true;
  }
  function initConfirm(box) {
    var key = KEY(box.getAttribute('data-shop')), last = read(key + ':last');
    var today = box.querySelector('[data-order-today]');
    if (today) { try { today.textContent = new Intl.DateTimeFormat(document.documentElement.lang || 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); } catch (e) { /* date d'origine */ } }
    if (!last || !last.lines || !last.lines.length) return;
    renderLines(box, last.lines, last.currency);
    box.querySelectorAll('[data-order-subtotal],[data-order-total]').forEach(function (el) { el.textContent = money(last.subtotal, last.currency); });
  }
  function init(scope) {
    [].forEach.call((scope || document).querySelectorAll('[data-order-steps]'), initSteps);
    [].forEach.call((scope || document).querySelectorAll('[data-order-confirm]'), initConfirm);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(document); }); else init(document);
  document.addEventListener('shopify:section:load', function (e) { init(e.target); });
})();

/* Espace client de démonstration (demo-account, maquettes SOUPLE du 23 octobre) : champs vérifiés, compte fictif affiché
   sur la page, bouton « afficher le mot de passe ». Connexion : seul le compte fictif ouvre l'écran « Mon compte » ;
   inscription et mot de passe oublié : rien n'est créé ni envoyé, et le message le dit. Aucune donnée n'est conservée. */
(function () {
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-pw-toggle]'); if (!b) return;
    var input = b.parentNode.querySelector('input'); if (!input) return;
    var show = input.type === 'password'; input.type = show ? 'text' : 'password'; b.setAttribute('aria-pressed', show ? 'true' : 'false');
  });
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('[data-acct-form]'); if (!f) return;
    e.preventDefault();
    var mode = f.getAttribute('data-acct-form'), status = f.querySelector('[data-acct-status]'), bad = null;
    f.querySelectorAll('input[required]').forEach(function (el) {
      var err = el.closest('label') && el.closest('label').querySelector('[data-error]');
      var ok = el.checkValidity() && String(el.value).trim() !== '';
      el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      if (err) { err.hidden = ok; err.textContent = ok ? '' : el.validationMessage; }
      if (!ok && !bad) bad = el;
    });
    if (status) status.textContent = '';
    if (bad) { bad.focus(); return; }
    var email = (f.querySelector('[name=email]') || {}).value || '', pw = (f.querySelector('[name=password]') || {}).value || '';
    if (mode === 'login') {
      var ok = email.trim().toLowerCase() === String(f.getAttribute('data-demo-email') || '').toLowerCase() && pw === f.getAttribute('data-demo-password');
      if (ok && f.getAttribute('data-success')) { location.href = f.getAttribute('data-success'); return; }
      if (status) status.textContent = f.getAttribute('data-msg-unknown') || '';
      return;
    }
    if (status) status.textContent = f.getAttribute('data-msg-sent') || '';
  });
})();
