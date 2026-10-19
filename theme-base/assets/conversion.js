/* Profil « conversion » : carrousels (avis, stories), lecteur de stories, panier (compte à rebours de démonstration,
   code de réduction, interrupteur de protection). Aucune donnée n'est inventée ici : les montants viennent du serveur. */
(function () {
  'use strict';
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* Carrousel à défilement : flèches, points, clavier (flèches gauche/droite sur la piste). */
  function carousel(root) {
    if (root.dataset.cvReady) return; root.dataset.cvReady = 'true';
    var track = $('[data-cv-track]', root), slides = $$('[data-cv-slide]', root), dots = $$('[data-cv-dot]', root), prev = $('[data-cv-prev]', root), next = $('[data-cv-next]', root);
    if (!track || !slides.length) return;
    var current = 0;
    function width() { var r = slides[0].getBoundingClientRect(); return r.width + 16; }
    function setDots(i) { current = i; dots.forEach(function (d, k) { d.classList.toggle('is-active', k === i); d.setAttribute('aria-selected', k === i ? 'true' : 'false'); }); if (prev) prev.disabled = i === 0; if (next) next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4; }
    function go(i) { i = Math.max(0, Math.min(slides.length - 1, i)); track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: reduced ? 'auto' : 'smooth' }); setDots(i); }
    var t; track.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(function () { setDots(Math.round(track.scrollLeft / width())); }, 80); }, { passive: true });
    if (prev) prev.addEventListener('click', function () { go(current - 1); });
    if (next) next.addEventListener('click', function () { go(current + 1); });
    dots.forEach(function (d, k) { d.addEventListener('click', function () { go(k); }); });
    track.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); } else if (e.key === 'Home') { e.preventDefault(); go(0); } else if (e.key === 'End') { e.preventDefault(); go(slides.length - 1); } });
    setDots(0);
  }

  /* Lecteur de stories : source chargée à l'ouverture seulement, lecture/pause, son, précédent/suivant, fermeture. */
  function stories(root) {
    var dialog = $('[data-cv-player]', root), video = $('[data-cv-video]', root), buttons = $$('[data-cv-story-open]', root);
    if (!dialog || !video || !buttons.length || typeof dialog.showModal !== 'function') return;
    var index = 0, pause = $('[data-cv-player-pause]', root), sound = $('[data-cv-player-sound]', root), close = $('[data-cv-player-close]', root), prev = $('[data-cv-player-prev]', root), next = $('[data-cv-player-next]', root), title = $('[data-cv-player-title]', root), subtitle = $('[data-cv-player-subtitle]', root), link = $('[data-cv-player-link]', root), opener = null;
    function load(i) {
      index = Math.max(0, Math.min(buttons.length - 1, i)); var b = buttons[index];
      video.pause(); video.removeAttribute('src'); video.load();
      if (b.dataset.poster) video.poster = b.dataset.poster; else video.removeAttribute('poster');
      video.src = b.dataset.src; title.textContent = b.dataset.title || ''; subtitle.textContent = b.dataset.subtitle || '';
      if (b.dataset.link && b.dataset.linkLabel) { link.href = b.dataset.link; link.textContent = b.dataset.linkLabel; link.hidden = false; } else { link.hidden = true; }
      prev.disabled = index === 0; next.disabled = index === buttons.length - 1;
      var p = video.play(); if (p && p.catch) p.catch(function () { setPaused(true); }); else setPaused(false);
    }
    function setPaused(flag) { pause.classList.toggle('is-paused', flag); pause.setAttribute('aria-label', flag ? pause.dataset.labelPlay : pause.dataset.labelPause); }
    video.addEventListener('play', function () { setPaused(false); });
    video.addEventListener('pause', function () { setPaused(true); });
    video.addEventListener('ended', function () { if (index < buttons.length - 1) load(index + 1); else setPaused(true); });
    pause.addEventListener('click', function () { if (video.paused) video.play(); else video.pause(); });
    sound.addEventListener('click', function () { video.muted = !video.muted; sound.setAttribute('aria-pressed', video.muted ? 'false' : 'true'); sound.setAttribute('aria-label', video.muted ? sound.dataset.labelUnmute : sound.dataset.labelMute); });
    prev.addEventListener('click', function () { load(index - 1); });
    next.addEventListener('click', function () { load(index + 1); });
    close.addEventListener('click', function () { dialog.close(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') load(index + 1); else if (e.key === 'ArrowLeft') load(index - 1); else if (e.key === ' ') { e.preventDefault(); if (video.paused) video.play(); else video.pause(); } });
    dialog.addEventListener('close', function () { video.pause(); video.removeAttribute('src'); video.load(); document.body.style.overflow = ''; if (opener) opener.focus(); });
    buttons.forEach(function (b, k) { b.addEventListener('click', function () { opener = b; dialog.showModal(); document.body.style.overflow = 'hidden'; load(k); }); });
  }

  /* Panier : compte à rebours de démonstration (toujours étiqueté fictif), code de réduction, protection visuelle. */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function reserve(el) {
    if (el.dataset.cvReady) return; el.dataset.cvReady = 'true';
    var minutes = parseInt(el.dataset.minutes, 10) || 10, key = 'es-cart-reserve', start = 0;
    try { start = parseInt(sessionStorage.getItem(key) || '0', 10); if (!start || Date.now() - start > minutes * 60000) { start = Date.now(); sessionStorage.setItem(key, String(start)); } } catch (e) { start = Date.now(); }
    var text = $('[data-cart-reserve-text]', el), template = el.dataset.template || '%';
    function tick() { var left = Math.max(0, minutes * 60000 - (Date.now() - start)), m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000); text.textContent = template.replace('%', m + ' min ' + pad(s) + ' s'); if (left > 0) setTimeout(tick, 1000); }
    tick();
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.matches && e.target.matches('[data-cart-discount-input]')) { e.preventDefault(); var b = e.target.closest('[data-cart-discount]').querySelector('[data-cart-discount-apply]'); if (b) b.click(); } });
  document.addEventListener('click', function (e) {
    var apply = e.target.closest && e.target.closest('[data-cart-discount-apply]');
    if (apply) { var box = apply.closest('[data-cart-discount]'), input = $('[data-cart-discount-input]', box), note = $('[data-cart-discount-note]', box), code = (input.value || '').trim(); if (!code) { input.focus(); return; } if (box.dataset.preview === 'true') { note.hidden = false; return; } window.location.href = box.dataset.discountUrl + '/' + encodeURIComponent(code) + '?redirect=' + encodeURIComponent(window.routes && window.routes.cart || '/cart'); return; }
    var toggle = e.target.closest && e.target.closest('[data-cart-protect-toggle]');
    if (toggle) { var on = toggle.getAttribute('aria-checked') !== 'true'; toggle.setAttribute('aria-checked', on ? 'true' : 'false'); var n = $('[data-cart-protect-note]', toggle.closest('[data-cart-protect]')); if (n) n.hidden = !on; }
  });

  /* Points interactifs : un seul ouvert à la fois, fermeture par Échap ou clic hors de la bulle, bulle rabattue près des bords. */
  function hotspots(root) {
    if (root.dataset.cvReady) return; root.dataset.cvReady = 'true';
    var dots = $$('[data-cv-hotspot]', root);
    function closeAll(except) { dots.forEach(function (d) { if (d === except) return; d.setAttribute('aria-expanded', 'false'); var c = document.getElementById(d.getAttribute('aria-controls')); if (c) c.hidden = true; }); }
    dots.forEach(function (d) {
      var card = document.getElementById(d.getAttribute('aria-controls')), spot = d.parentElement;
      d.addEventListener('click', function () { var open = d.getAttribute('aria-expanded') === 'true'; closeAll(d); d.setAttribute('aria-expanded', open ? 'false' : 'true'); if (card) { card.hidden = open; if (!open) { var x = parseFloat(spot.style.getPropertyValue('--x')), y = parseFloat(spot.style.getPropertyValue('--y')); spot.classList.toggle('cv-hotspot--flip', y > 65); spot.classList.toggle('cv-hotspot--left', x < 30); spot.classList.toggle('cv-hotspot--right', x > 70); } } });
      if (card) $$('[data-cv-hotspot-close]', card).forEach(function (b) { b.addEventListener('click', function () { closeAll(); d.focus(); }); });
    });
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeAll(); } });
    document.addEventListener('click', function (e) { if (!root.contains(e.target)) closeAll(); });
  }

  /* Galerie : visionneuse en boîte de dialogue (précédent / suivant, Échap), image chargée à l'ouverture. */
  function gallery(root) {
    var dialog = $('[data-cv-lightbox]', root), img = $('[data-cv-lightbox-img]', root), cap = $('[data-cv-lightbox-caption]', root), opens = $$('[data-cv-gallery-open]', root);
    if (!dialog || !img || !opens.length || typeof dialog.showModal !== 'function') return;
    var index = 0, opener = null;
    function show(i) { index = (i + opens.length) % opens.length; var src = $('img', opens[index]); if (!src) return; img.src = src.currentSrc || src.src; img.alt = src.alt || ''; img.hidden = false; var fig = opens[index].closest('figure'), c = fig && $('figcaption span', fig); cap.textContent = c ? c.textContent : ''; }
    opens.forEach(function (b, k) { b.addEventListener('click', function () { opener = b; show(k); dialog.showModal(); document.body.style.overflow = 'hidden'; }); });
    $$('[data-cv-lightbox-close]', root).forEach(function (b) { b.addEventListener('click', function () { dialog.close(); }); });
    $$('[data-cv-lightbox-prev]', root).forEach(function (b) { b.addEventListener('click', function () { show(index - 1); }); });
    $$('[data-cv-lightbox-next]', root).forEach(function (b) { b.addEventListener('click', function () { show(index + 1); }); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight') show(index + 1); else if (e.key === 'ArrowLeft') show(index - 1); });
    dialog.addEventListener('close', function () { img.removeAttribute('src'); img.hidden = true; document.body.style.overflow = ''; if (opener) opener.focus(); });
  }

  function init(root) {
    $$('[data-cv-reviews], [data-cv-stories], [data-cv-gallery]', root).forEach(carousel);
    $$('[data-cv-hotspots]', root).forEach(hotspots);
    $$('[data-cv-gallery]', root).forEach(gallery);
    $$('[data-cv-stories]', root).forEach(stories);
    $$('[data-cart-reserve]', root).forEach(reserve);
  }
  function ready() { init(document); new MutationObserver(function (records) { records.forEach(function (r) { r.addedNodes.forEach(function (n) { if (n.nodeType === 1) init(n.parentElement || n); }); }); }).observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
  document.addEventListener('shopify:section:load', function (e) { init(e.target); });
})();
