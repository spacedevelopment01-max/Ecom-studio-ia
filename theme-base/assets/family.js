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
    root.querySelectorAll('[data-chip-filter]').forEach(function (x) { var on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    root.querySelectorAll('[data-chip-item]').forEach(function (it) { it.setAttribute('data-out', tag && (' ' + it.getAttribute('data-chip-item') + ' ').indexOf(' ' + tag + ' ') < 0 ? '1' : ''); });
    var list = root.querySelector('[data-paginate]'); if (list) list.setAttribute('data-page', '1');
    pages(root);
  });
  function init(scope) { [].forEach.call((scope || document).querySelectorAll('[data-paginate]'), function (l) { pages(l.closest('section') || document); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(document); }); else init(document);
  document.addEventListener('shopify:section:load', function (e) { init(e.target); });
})();
