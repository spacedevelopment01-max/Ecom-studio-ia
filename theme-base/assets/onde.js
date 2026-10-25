/* ONDE (sept maquettes du 24 octobre, docs/theme-briefs/onde) : interactions des sections « on-* ».
   - fiche : miniatures → vue principale, agrandissement (dialog), quantité −/+, onglet actif selon le défilement ;
   - journal : filtres par thème (aucun rechargement, message si rien ne correspond) ;
   - FAQ : recherche et onglets combinés, message sans résultat ;
   - commande d'exemple : Informations → Livraison → Paiement, champs vérifiés, retour sans perte, récapitulatif lu dans
     le vrai panier, confirmation d'exemple ; rien n'est envoyé ni payé (sessionStorage, le temps de l'onglet) ;
   - suivi : vérifie les champs puis montre un résultat d'EXEMPLE (aucune commande consultée).
   Aucun texte ici : tout ce qui s'affiche vient des réglages des sections (attributs data-*). */
(function () {
  'use strict';
  function $$(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }
  function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
  function money(cents, cur) {
    var v = (Number(cents) || 0) / 100;
    try { return new Intl.NumberFormat(document.documentElement.lang || 'fr-FR', { style: 'currency', currency: cur || 'EUR', minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }).format(v); } catch (e) { return v + ' €'; }
  }
  function store(k, v) { try { if (v === undefined) return JSON.parse(sessionStorage.getItem(k) || 'null'); sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  function norm(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  /* ---------- Fiche ---------- */
  function initProduct(root) {
    $$('[data-on-product]', root).forEach(function (sec) {
      if (sec.__on) return; sec.__on = true;
      var views = $$('[data-on-view]', sec), thumbs = $$('[data-on-thumb]', sec);
      thumbs.forEach(function (t) {
        t.addEventListener('click', function () {
          var i = t.getAttribute('data-on-thumb');
          views.forEach(function (v) { var on = v.getAttribute('data-on-view') === i; v.hidden = !on; v.classList.toggle('is-active', on); });
          thumbs.forEach(function (x) { var on = x === t; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        });
      });
      var box = sec.querySelector('[data-on-lightbox]'), img = box && box.querySelector('[data-on-lightbox-img]');
      $$('[data-on-zoom]', sec).forEach(function (a) {
        a.addEventListener('click', function (e) {
          if (!box || typeof box.showModal !== 'function') return;
          e.preventDefault(); img.src = a.getAttribute('href'); img.alt = (a.querySelector('img') || {}).alt || ''; box.showModal(); box.__opener = a;
        });
      });
      if (box) {
        var close = function () { box.close(); };
        box.querySelector('[data-on-lightbox-close]').addEventListener('click', close);
        box.addEventListener('click', function (e) { if (e.target === box) close(); });
        box.addEventListener('close', function () { if (box.__opener) box.__opener.focus(); });
      }
      var bar = sec.querySelector('[data-on-sticky]'), add = sec.querySelector('.on-buy__add');
      if (bar && add && 'IntersectionObserver' in window) {
        new IntersectionObserver(function (en) { var e = en[0]; bar.classList.toggle('is-visible', !e.isIntersecting && e.boundingClientRect.top < 0); }).observe(add);
      } else if (bar) bar.classList.add('is-visible');
      var links = $$('[data-on-tab-link]', sec);
      if (links.length && 'IntersectionObserver' in window) {
        var targets = links.map(function (l) { return document.getElementById(decodeURIComponent(l.getAttribute('href').slice(1))); });
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (!en.isIntersecting) return;
            var i = targets.indexOf(en.target);
            links.forEach(function (l, j) { l.classList.toggle('is-active', j === i); if (j === i) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
          });
        }, { rootMargin: '-40% 0px -55% 0px' });
        targets.forEach(function (t) { if (t) io.observe(t); });
      }
    });
    $$('[data-on-qty]', root).forEach(function (q) {
      if (q.__on) return; q.__on = true;
      var input = q.querySelector('input');
      $$('[data-on-step]', q).forEach(function (b) {
        b.addEventListener('click', function () {
          var max = Number(input.max) || 99, v = (parseInt(input.value, 10) || 1) + Number(b.getAttribute('data-on-step'));
          input.value = Math.min(max, Math.max(1, v));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    });
  }

  /* ---------- Journal : filtres ---------- */
  function initJournal(root) {
    $$('[data-on-filter]', root).forEach(function (sec) {
      if (sec.__on) return; sec.__on = true;
      var chips = $$('[data-on-chip]', sec), posts = $$('[data-on-tag]', sec), empty = sec.querySelector('[data-on-filter-empty]');
      chips.forEach(function (c) {
        c.addEventListener('click', function () {
          var tag = c.getAttribute('data-on-chip'), shown = 0;
          chips.forEach(function (x) { var on = x === c; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
          posts.forEach(function (p) { var ok = !tag || p.getAttribute('data-on-tag') === tag; p.hidden = !ok; if (ok) shown++; });
          if (empty) empty.hidden = shown > 0;
        });
      });
    });
  }

  /* ---------- FAQ : recherche + onglets ---------- */
  function initFaq(root) {
    $$('[data-on-faq]', root).forEach(function (sec) {
      if (sec.__on) return; sec.__on = true;
      var input = sec.querySelector('[data-on-faq-search]'), tabs = $$('[data-on-faq-tab]', sec), items = $$('[data-on-topic]', sec), empty = sec.querySelector('[data-on-faq-empty]');
      var topic = tabs.length ? tabs[0].getAttribute('data-on-faq-tab') : '';
      function apply() {
        var q = norm(input && input.value).trim(), shown = 0;
        items.forEach(function (it) {
          var okTopic = q ? true : (!topic || it.getAttribute('data-on-topic') === topic);
          var okText = !q || norm(it.textContent).indexOf(q) >= 0;
          it.hidden = !(okTopic && okText); if (!it.hidden) shown++;
        });
        if (empty) empty.hidden = shown > 0;
      }
      tabs.forEach(function (t, i) {
        t.addEventListener('click', function () {
          topic = t.getAttribute('data-on-faq-tab');
          tabs.forEach(function (x) { var on = x === t; x.classList.toggle('is-active', on); x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; });
          apply();
        });
        t.addEventListener('keydown', function (e) {
          var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
          e.preventDefault(); var n = tabs[(i + d + tabs.length) % tabs.length]; n.focus(); n.click();
        });
        t.tabIndex = i === 0 ? 0 : -1;
      });
      if (input) input.addEventListener('input', apply);
      apply();
    });
  }

  /* ---------- Commande d'exemple ---------- */
  function key(sec) { return 'on-demo-order:' + (sec.getAttribute('data-shop') || 'shop'); }
  function linesFromCart(c, sec) {
    var img = sec.getAttribute('data-line-image'), note = sec.getAttribute('data-line-note') || '';
    return (c && c.items || []).map(function (it) {
      var vt = it.variant_title && it.variant_title !== 'Default Title' ? it.variant_title : note;
      return { title: it.product_title || it.title, note: vt, qty: it.quantity, total: it.final_line_price != null ? it.final_line_price : it.line_price, image: img || (it.featured_image && it.featured_image.url) || it.image || '' };
    });
  }
  function renderLines(sec, lines, cur) {
    $$('[data-on-lines]', sec).forEach(function (ul) {
      ul.innerHTML = lines.map(function (l) {
        return '<li class="on-sumline"><span class="on-sumline__media">' + (l.image ? '<img src="' + esc(l.image) + '" alt="" loading="lazy">' : '') + '</span><span class="on-sumline__info"><strong>' + esc(l.title) + '</strong><span>' + esc(l.note) + (l.qty > 1 ? ' · ' + esc(l.qty) + ' ×' : '') + '</span></span><span class="on-sumline__price">' + esc(money(l.total, cur)) + '</span></li>';
      }).join('');
    });
  }
  function initCheckout(root) {
    $$('[data-on-checkout="steps"]', root).forEach(function (sec) {
      if (sec.__on) return; sec.__on = true;
      var form = sec.querySelector('[data-on-form]'), steps = $$('[data-on-step]', sec), next = sec.querySelector('[data-on-next]');
      var title = sec.querySelector('[data-on-step-title]'), titles = (title.getAttribute('data-titles') || '').split('|');
      var labels = (next.getAttribute('data-labels') || '').split('|'), fine = sec.querySelector('[data-on-fine]'), fines = fine ? fine.getAttribute('data-texts').split('|') : [];
      var back = sec.querySelector('[data-on-back]'), backLabel = sec.querySelector('[data-on-back-label]'), backLabels = backLabel ? backLabel.getAttribute('data-labels').split('|') : [];
      var status = sec.querySelector('[data-on-status]'), k = key(sec), cur = 1, cart = null;
      var draft = store(k + ':draft') || {};
      [].forEach.call(form.elements, function (el) { if (!el.name || draft[el.name] == null) return; if (el.type === 'checkbox') el.checked = !!draft[el.name]; else if (el.type === 'radio') el.checked = el.value === draft[el.name]; else el.value = draft[el.name]; });
      function data() { var o = {}; [].forEach.call(form.elements, function (el) { if (!el.name) return; if (el.type === 'checkbox') o[el.name] = el.checked; else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; } else o[el.name] = String(el.value).trim(); }); return o; }
      form.addEventListener('input', function () { store(k + ':draft', data()); });
      form.addEventListener('change', function () { store(k + ':draft', data()); });
      function address(d) { return [[d.first_name, d.last_name].join(' ').trim(), d.address, d.address2, [d.zip, d.city].join(' ').trim(), d.country].filter(Boolean).join(', '); }
      function show(n, focus) {
        cur = n;
        steps.forEach(function (f) { f.hidden = Number(f.getAttribute('data-on-step')) !== n; });
        $$('[data-on-dot]', sec).forEach(function (d) { var i = Number(d.getAttribute('data-on-dot')); d.classList.toggle('is-current', i === n); d.classList.toggle('is-done', i < n); if (i === n) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); });
        title.innerHTML = esc(titles[n - 1] || '').replace(/\n/g, '<br>');
        next.firstChild.nodeValue = labels[n - 1] || '';
        if (fine) fine.innerHTML = fines[n - 1] || '';
        if (backLabel) backLabel.textContent = backLabels[n - 1] || '';
        var a = sec.querySelector('[data-on-address]'); if (a) { var t = address(data()); a.textContent = t || a.getAttribute('data-empty'); }
        sec.setAttribute('data-step', n);
        if (focus) { title.setAttribute('tabindex', '-1'); title.focus(); }
      }
      if (back) back.addEventListener('click', function (e) { if (cur > 1) { e.preventDefault(); show(cur - 1, true); } });
      $$('[data-on-prev]', sec).forEach(function (b) { b.addEventListener('click', function () { if (cur > 1) show(cur - 1, true); }); });
      function check(fs) {
        var bad = null;
        $$('input,select,textarea', fs).forEach(function (el) {
          if (!el.willValidate) return;
          var box = el.closest('label'), err = box && box.querySelector('[data-error]') || (box && box.nextElementSibling && box.nextElementSibling.matches('[data-error]') ? box.nextElementSibling : null) || fs.querySelector(':scope > [data-error]');
          var ok = el.checkValidity() && !(el.required && el.type !== 'checkbox' && el.type !== 'radio' && !String(el.value).trim());
          el.setAttribute('aria-invalid', ok ? 'false' : 'true');
          if (err) { err.hidden = ok; err.textContent = ok ? '' : (el.getAttribute('data-msg') || el.validationMessage); if (!err.id) err.id = 'on-err-' + Math.random().toString(36).slice(2); if (!ok) el.setAttribute('aria-describedby', err.id); else el.removeAttribute('aria-describedby'); }
          if (!ok && !bad) bad = el;
        });
        if (bad) bad.focus();
        return !bad;
      }
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!cart || !cart.items || !cart.items.length) { var em = sec.querySelector('[data-on-empty]'); if (em) em.hidden = false; return; }
        if (!check(steps[cur - 1])) return;
        if (cur < steps.length) { show(cur + 1, true); return; }
        var d = data();
        store(k + ':last', { address: address(d), lines: linesFromCart(cart, sec), subtotal: cart.items_subtotal_price != null ? cart.items_subtotal_price : cart.total_price, currency: cart.currency });
        var to = sec.getAttribute('data-confirm'); if (to) location.href = to; else if (status) status.textContent = fines[2] || '';
      });
      var routes = window.routes || {};
      fetch((routes.cart || routes.cart_url || '/cart') + '.js', { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }).then(function (c) {
        cart = c;
        var lines = linesFromCart(c, sec), sub = c.items_subtotal_price != null ? c.items_subtotal_price : c.total_price;
        if (lines.length) renderLines(sec, lines, c.currency);
        if (lines.length) $$('[data-on-subtotal]', sec).forEach(function (el) { el.textContent = money(sub, c.currency); });
        var words = (sec.getAttribute('data-qty-label') || '').split('|');
        $$('[data-on-count]', sec).forEach(function (el) { el.textContent = c.item_count ? c.item_count + ' ' + (c.item_count > 1 ? words[1] || words[0] : words[0]) : ''; });
        var mm = sec.querySelector('[data-on-mini-media]'), cm = sec.querySelector('[data-on-card-media] img');
        if (mm && lines[0] && lines[0].image) mm.innerHTML = '<img src="' + esc(lines[0].image) + '" alt="" loading="lazy">';
        if (cm && lines[0] && lines[0].image) cm.src = lines[0].image;
        var nm = sec.querySelector('[data-on-card-name]'); if (nm && lines[0]) nm.textContent = lines[0].title;
        var em = sec.querySelector('[data-on-empty]'); if (em) em.hidden = !!lines.length;
        next.disabled = !lines.length;
      }).catch(function () { /* récapitulatif de secours rendu par la section */ });
      show(1, false);
    });
    $$('[data-on-checkout="confirmation"]', root).forEach(function (sec) {
      var last = store(key(sec) + ':last');
      if (!last) return;
      if (last.lines && last.lines.length) renderLines(sec, last.lines, last.currency);
      var a = sec.querySelector('[data-on-confirm-address]'); if (a && last.address) a.textContent = last.address;
    });
  }

  /* ---------- Suivi d'exemple ---------- */
  function initTrack(root) {
    $$('[data-on-track]', root).forEach(function (form) {
      if (form.__on) return; form.__on = true;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var bad = null;
        $$('input', form).forEach(function (el) {
          var err = el.closest('label').querySelector('[data-error]');
          var ok = el.checkValidity() && !!String(el.value).trim();
          el.setAttribute('aria-invalid', ok ? 'false' : 'true');
          err.hidden = ok; err.textContent = ok ? '' : el.getAttribute('data-msg');
          if (!ok && !bad) bad = el;
        });
        var res = form.querySelector('[data-on-track-result]');
        if (bad) { res.hidden = true; bad.focus(); return; }
        form.querySelector('[data-on-track-number]').textContent = form.elements.order.value.trim();
        res.hidden = false; res.focus();
      });
    });
  }


  /* ---------- Carrousel (téléphone) : flèches, points, défilement natif ---------- */
  function initCarousel(root) {
    $$('[data-on-carousel]', root).forEach(function (list) {
      if (list.__on) return; list.__on = true;
      var sec = list.closest('.on-cards'), dots = $$('.on-dots span', sec);
      function index() { return Math.round(list.scrollLeft / Math.max(1, list.clientWidth)); }
      function paint() { var i = index(); dots.forEach(function (d, j) { d.classList.toggle('is-active', j === i); }); }
      list.addEventListener('scroll', function () { window.requestAnimationFrame(paint); }, { passive: true });
      $$('[data-on-slide]', sec).forEach(function (b) {
        b.addEventListener('click', function () {
          var n = list.children.length, i = (index() + Number(b.getAttribute('data-on-slide')) + n) % n;
          list.scrollTo({ left: i * list.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        });
      });
    });
  }

  function init(root) { initCarousel(root); initProduct(root); initJournal(root); initFaq(root); initCheckout(root); initTrack(root); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(document); }); else init(document);
  document.addEventListener('shopify:section:load', function (e) { init(e.target); });
})();
