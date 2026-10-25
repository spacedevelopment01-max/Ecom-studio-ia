/*
 * PARENTHÈSE (cabinet de sophrologie) : comportements du site.
 *  - source unique : tarifs, durées, dates, lieux et places affichés partout lus dans « Réglages du cabinet » ;
 *  - accordéons, catégories de la FAQ, filtres du journal et des ateliers, « Lire la suite », visionneuse ;
 *  - prise de rendez-vous en quatre étapes, retrouver et gérer un rendez-vous (modifier, annuler, note, agenda) ;
 *  - formulaires (contact, entreprises, articles) et consentement aux cookies.
 * Deux modes : DÉMONSTRATION (annoncée, données fictives dans ce navigateur, aucun e-mail) ou SERVICE RÉEL du studio
 * (src/lib/cabinet/booking.ts). Jamais de réservation, d'envoi ou de lien annoncé sans réponse du service.
 */
(function () {
  'use strict';

  var LANG = (document.documentElement.lang || 'fr').slice(0, 2) === 'en' ? 'en' : 'fr';
  var TEXTS = {
    fr: {
      at: 'à', places: '{n} places restantes sur {c}', place: '{n} place restante sur {c}', full: 'Complet', past: 'Atelier passé', fullLong: 'Cet atelier est complet.', pastLong: 'Cet atelier a déjà eu lieu.',
      demoSeats: 'Disponibilités de démonstration', prevMonth: 'Mois précédent', nextMonth: 'Mois suivant', closed: 'Fermé', fullDay: 'Complet', pastDay: 'Passé',
      slotsOf: 'Horaires du {date}', atelierAt: '{when}', seatsLeft: '{n} places', seatLeft: '{n} place', minutes: 'minutes', cabinet: 'Au cabinet', visio: 'En visioconférence',
      conflict: 'Ce créneau vient d’être réservé par une autre personne. Choisissez un autre horaire :', conflictNone: 'Ce créneau vient d’être réservé et aucun autre horaire ne reste ce jour-là : choisissez une autre date.', fullNow: 'Cet atelier vient d’être complet : choisissez une autre date.',
      sending: 'Envoi en cours…', sentDemo: 'Démonstration : votre message a été vérifié mais n’a été envoyé à personne.', sentLive: 'Message bien reçu par le cabinet. Merci !', sentFailed: 'Le message n’a pas pu partir. Réessayez plus tard.',
      nlDemo: 'Démonstration : aucune inscription n’est transmise.', nlLive: 'Votre demande d’inscription est enregistrée pour le cabinet.',
      errServer: 'Le service de rendez-vous n’a pas répondu. Rien n’a été réservé et vos informations sont conservées : réessayez.',
      wsCount: '{n} atelier(s) affiché(s)', saving: 'Enregistrement…', movedDemo: 'Simulation : nouvel horaire enregistré dans ce navigateur seulement : {when}.', movedLive: 'Nouvel horaire : {when}. L’ancien créneau a été libéré.',
      canceledDemo: 'Simulation : rendez-vous annulé dans ce navigateur seulement.', canceledLive: 'Votre rendez-vous est annulé.', tooLate: 'Ce rendez-vous ne peut plus être modifié ni annulé en ligne : contactez le cabinet.',
      notMovable: 'Un atelier ne se déplace pas : annulez votre place puis choisissez une autre date.', noOther: 'Aucun autre horaire libre ce jour-là.', savedDemo: 'Simulation : note enregistrée dans ce navigateur seulement.',
      lookupNoDemo: 'Démonstration : aucun rendez-vous de ce navigateur ne correspond. Essayez la référence affichée après une réservation de démonstration.'
    },
    en: {
      at: 'at', places: '{n} places left out of {c}', place: '{n} place left out of {c}', full: 'Full', past: 'Past workshop', fullLong: 'This workshop is full.', pastLong: 'This workshop has already taken place.',
      demoSeats: 'Demo availability', prevMonth: 'Previous month', nextMonth: 'Next month', closed: 'Closed', fullDay: 'Full', pastDay: 'Past',
      slotsOf: 'Times on {date}', atelierAt: '{when}', seatsLeft: '{n} places', seatLeft: '{n} place', minutes: 'minutes', cabinet: 'At the practice', visio: 'By video call',
      conflict: 'This time slot has just been booked by someone else. Choose another time:', conflictNone: 'This slot has just been booked and no other time remains that day: choose another date.', fullNow: 'This workshop has just filled up: choose another date.',
      sending: 'Sending…', sentDemo: 'Demo: your message was checked but sent to no one.', sentLive: 'Message received by the practice. Thank you!', sentFailed: 'The message could not be sent. Please try again later.',
      nlDemo: 'Demo: no sign-up is transmitted.', nlLive: 'Your sign-up request has been recorded for the practice.',
      errServer: 'The booking service did not respond. Nothing was booked and your details are kept: try again.',
      wsCount: '{n} workshop(s) shown', saving: 'Saving…', movedDemo: 'Simulation: new time saved in this browser only: {when}.', movedLive: 'New time: {when}. The previous slot has been released.',
      canceledDemo: 'Simulation: appointment cancelled in this browser only.', canceledLive: 'Your appointment is cancelled.', tooLate: 'This appointment can no longer be changed or cancelled online: contact the practice.',
      notMovable: 'A workshop cannot be moved: cancel your place, then choose another date.', noOther: 'No other free time that day.', savedDemo: 'Simulation: note saved in this browser only.',
      lookupNoDemo: 'Demo: no appointment from this browser matches. Try the reference shown after a demo booking.'
    }
  };
  var T = TEXTS[LANG];
  function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return o && o[k] != null ? o[k] : ''; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function storage(kind) { try { var s = window[kind]; var k = '__pa'; s.setItem(k, '1'); s.removeItem(k); return s; } catch (e) { return null; } }
  var LS = storage('localStorage'), SS = storage('sessionStorage');
  function readJSON(st, key, fb) { try { var v = st && st.getItem(key); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function writeJSON(st, key, v) { try { if (st) st.setItem(key, JSON.stringify(v)); } catch (e) { /* stockage indisponible : l'état reste en mémoire */ } }
  function uid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function tpl(root, name) { var t = $('template[data-pa-tpl="' + name + '"]', root); return t ? t.innerHTML : ''; }

  var CFG = (function () { var e = document.getElementById('pa-config'); try { return e ? JSON.parse(e.textContent) : null; } catch (x) { return null; } })() || { mode: 'demo', seances: [], ateliers: [] };
  var LIVE = CFG.mode === 'live' && /^https:\/\//.test(CFG.api || '');
  var PAGES = {};
  $$('[data-pa-pages] a[data-page]').forEach(function (a) { PAGES[a.getAttribute('data-page')] = a.getAttribute('href'); });
  function C() { return window.ParentheseCore; }
  var RULES = null;
  function rules() {
    if (RULES) return RULES;
    RULES = C().normalize({ timezone: CFG.timezone, hours: CFG.hours, closures: CFG.closures, step: CFG.step, horizonDays: CFG.horizonDays, leadMinutes: CFG.leadMinutes, cancelHours: CFG.cancelHours, seances: CFG.seances, ateliers: CFG.ateliers });
    // Démonstration seulement : des dates d'exemple passées avancent de semaines entières (jamais pour le service réel).
    if (!LIVE) C().demoShift(RULES);
    return RULES;
  }
  function svcOf(id) { return C().seanceById(rules(), id); }
  function atOf(id) { return C().atelierById(rules(), id); }
  function dateText(d, style) { return C().formatDate(d, LANG, style); }
  function timeText(t) { return C().formatTime(t, LANG); }
  function priceText(p) { return C().formatPrice(p, LANG); }
  function whenText(d, t) { return dateText(d) + ' ' + T.at + ' ' + timeText(t); }
  function todayDate() { return C().nowIn(rules().timezone).date; }
  function hashParams() { var o = {}; (location.hash || '').replace(/^#/, '').split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) o[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1)); }); return o; }
  function addressText() { return (CFG.address || '').trim(); }

  /* ---------------------------------------------------------------- Service réel */
  function api(path, opts) {
    var o = opts || {};
    var headers = { 'Content-Type': 'application/json' };
    if (o.token) headers['X-Access-Token'] = o.token;
    return fetch(CFG.api.replace(/\/+$/, '') + path, { method: o.method || 'GET', headers: headers, body: o.body ? JSON.stringify(o.body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, data: j }; }); });
  }
  var ACCESS_KEY = 'pa-access';
  function accessToken() { return SS && SS.getItem(ACCESS_KEY) || ''; }
  function setAccess(t) { try { if (!SS) return; if (t) SS.setItem(ACCESS_KEY, t); else SS.removeItem(ACCESS_KEY); } catch (e) { /* rien */ } }

  /* ---------------------------------------------------------------- Démonstration (ce navigateur seulement) */
  var DEMO_KEY = 'pa-demo-v1';
  function demoData() {
    var d = readJSON(LS, DEMO_KEY, null);
    if (d && d.v === 1) return d;
    d = { v: 1, seq: 0, conflictShown: false, taken: [], appts: [] };
    writeJSON(LS, DEMO_KEY, d);
    return d;
  }
  function saveDemo(d) { writeJSON(LS, DEMO_KEY, d); }
  function demoBusy(date, exceptNumber) {
    var busy = C().demoAgenda(rules(), date).slice();
    var d = demoData();
    (d.taken || []).forEach(function (t) { if (t.date === date) busy.push([t.start, t.end]); });
    d.appts.forEach(function (a) { if (a.kind === 'seance' && a.status === 'confirmed' && a.date === date && a.number !== exceptNumber) busy.push([C().toMin(a.time), C().toMin(a.time) + a.duration]); });
    return busy;
  }
  function demoTaken(atelierId) {
    var a = atOf(atelierId), d = demoData();
    var mine = d.appts.filter(function (x) { return x.kind === 'atelier' && x.service === atelierId && x.status === 'confirmed'; }).length;
    return (a ? a.booked : 0) + mine;
  }
  function demoByToken(t) { var d = demoData(); for (var i = 0; i < d.appts.length; i++) if (d.appts[i].token === t) return d.appts[i]; return null; }

  /* ---------------------------------------------------------------- Données (démonstration ou service réel) */
  var WS = null;
  var Data = {
    slots: function (q) {
      if (!LIVE) return Promise.resolve(C().slotsFor(rules(), { date: q.date, service: q.service, modality: q.modality, busy: demoBusy(q.date, q.except) }));
      var qs = '?date=' + encodeURIComponent(q.date) + '&service=' + encodeURIComponent(q.service) + '&modality=' + encodeURIComponent(q.modality || '') + (q.except ? '&mine=1' : '');
      return api('/availability' + qs, { token: q.except ? accessToken() : '' }).then(function (r) { if (r.status !== 200) throw r; return r.data.slots || []; });
    },
    month: function (q, y, m) {
      var grid = C().monthGrid(y, m).filter(Boolean);
      if (!LIVE) { var out = {}; grid.forEach(function (d) { out[d] = C().dayStatus(rules(), { date: d, service: q.service, modality: q.modality, busy: demoBusy(d, q.except) }); }); return Promise.resolve(out); }
      var qs = '?month=' + y + '-' + (m < 10 ? '0' : '') + m + '&service=' + encodeURIComponent(q.service) + '&modality=' + encodeURIComponent(q.modality || '') + (q.except ? '&mine=1' : '');
      return api('/month' + qs, { token: q.except ? accessToken() : '' }).then(function (r) { if (r.status !== 200) throw r; return r.data.days || {}; });
    },
    /** Ateliers : { id: { remaining, capacity, status } } (démonstration : capacité − places d'exemple − réservations de ce navigateur). */
    workshops: function (force) {
      if (WS && !force) return WS;
      if (!LIVE) {
        var out = {};
        rules().ateliers.forEach(function (a) { var taken = demoTaken(a.id); out[a.id] = { remaining: C().remaining(a, taken), capacity: a.capacity, status: C().atelierStatus(rules(), a, taken) }; });
        WS = Promise.resolve(out);
      } else {
        WS = api('/workshops').then(function (r) { if (r.status !== 200) throw r; var out = {}; (r.data.ateliers || []).forEach(function (a) { out[a.id] = a; }); return out; });
      }
      return WS;
    }
  };

  /* ---------------------------------------------------------------- Source unique : séances et ateliers affichés */
  function setF(box, field, value) { $$('[data-pa-f="' + field + '"]', box).forEach(function (n) { if (value) n.textContent = value; }); }
  function setFhtml(box, field, html) { $$('[data-pa-f="' + field + '"]', box).forEach(function (n) { if (html) n.innerHTML = html; }); }
  function syncSeances() {
    $$('[data-pa-svc]').forEach(function (box) {
      var svc = svcOf(box.getAttribute('data-pa-svc'));
      if (!svc) return;
      setF(box, 'price', priceText(svc.price));
      setF(box, 'duration-long', svc.duration ? svc.duration + ' ' + T.minutes : '');
      setF(box, 'duration-short', C().formatDuration(svc.duration, LANG));
    });
  }
  function atelierWhen(a, style) { return a.date && a.time ? dateText(a.date, style) + (style === 'full' ? ' ' : '\n') + T.at + ' ' + timeText(a.time) : ''; }
  function syncAteliers() {
    var boxes = $$('[data-pa-atelier]');
    if (!boxes.length) return;
    // Le libellé « Atelier en groupe » de l'accueil reprend le premier atelier (même durée, même tarif).
    boxes.forEach(function (box) {
      var a = atOf(box.getAttribute('data-pa-atelier')) || (box.getAttribute('data-pa-atelier') === '' ? rules().ateliers[0] : null);
      if (!a) return;
      $$('[data-pa-f="when"], [data-pa-f="when-abbr"]', box).forEach(function (n) { var t = atelierWhen(a, n.getAttribute('data-pa-f') === 'when-abbr' ? 'abbr' : ''); if (t) n.innerHTML = esc(t).replace('\n', '<br>'); });
      setF(box, 'when-full', a.date && a.time ? dateText(a.date) + ' ' + T.at + ' ' + timeText(a.time) : '');
      setF(box, 'duration', C().formatDuration(a.duration, LANG, 'both'));
      setF(box, 'duration-short', C().formatDuration(a.duration, LANG));
      setF(box, 'duration-long', a.duration ? a.duration + ' ' + T.minutes : '');
      setF(box, 'duration-compact', C().formatDuration(a.duration, LANG, 'both').replace(/\s*\(.*\)$/, ''));
      setF(box, 'price', priceText(a.price));
      setF(box, 'place', a.place);
    });
    Data.workshops().then(function (ws) {
      boxes.forEach(function (box) {
        var id = box.getAttribute('data-pa-atelier'), w = ws[id];
        if (!w) return;
        var seats = $$('[data-pa-f="seats"]', box), gauge = $$('[data-pa-f="gauge"]', box), state = $$('[data-pa-f="state"]', box);
        if (w.remaining != null && w.capacity) {
          seats.forEach(function (n) { n.textContent = fmt(w.remaining === 1 ? T.place : T.places, { n: w.remaining, c: w.capacity }); });
          gauge.forEach(function (n) { n.style.width = Math.round((w.capacity - w.remaining) / w.capacity * 100) + '%'; });
        }
        var off = w.status === 'full' || w.status === 'past';
        state.forEach(function (n) { n.hidden = !off; n.textContent = w.status === 'full' ? T.fullLong : w.status === 'past' ? T.pastLong : ''; });
        box.classList.toggle('is-full', w.status === 'full');
        box.classList.toggle('is-past', w.status === 'past');
        $$('[data-pa-f="book"]', box).forEach(function (b) { if (off) { b.setAttribute('aria-disabled', 'true'); b.classList.add('is-disabled'); b.textContent = w.status === 'full' ? T.full : T.past; } });
      });
    }).catch(function () { /* places inconnues : les textes sans script restent affichés */ });
  }
  /** Liens « Prendre rendez-vous » préparés : séance (et modalité) ou atelier transmis à la réservation. */
  function prepareBookLinks() {
    var base = PAGES.book || '/pages/prendre-rendez-vous';
    $$('[data-pa-book]').forEach(function (a) {
      var parts = String(a.getAttribute('data-pa-book') || '').split(':');
      if (parts[0] === 'seance' && parts[1]) a.setAttribute('href', base + '#service=' + encodeURIComponent(parts[1]) + (parts[2] ? '&mode=' + encodeURIComponent(parts[2]) : ''));
      else if (parts[0] === 'atelier') a.setAttribute('href', base + '#atelier=' + encodeURIComponent(parts[1] || ''));
      a.addEventListener('click', function (e) { if (a.getAttribute('aria-disabled') === 'true') e.preventDefault(); });
    });
  }

  /* ---------------------------------------------------------------- En-tête : signature du logo, page active */
  function initHeader() {
    var mark = $('.es-header__wordmark');
    if (mark && CFG.tagline && !$('.pa-tagline', mark)) { var t = document.createElement('span'); t.className = 'pa-tagline'; t.textContent = CFG.tagline; mark.appendChild(t); }
    if ($('[data-pa-booking]')) document.body.classList.add('pa-page-booking');
    if ($('[data-pa-mbar]')) document.body.classList.add('pa-has-mbar');
  }

  /* ---------------------------------------------------------------- Accordéons, FAQ, « Lire la suite » */
  function initAccordions() {
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pa-acc]');
      if (!b) return;
      var open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open));
      var panel = document.getElementById(b.getAttribute('aria-controls'));
      if (panel) panel.hidden = !open;
    });
    $$('[data-pa-faq-all]').forEach(function (b) {
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') !== 'true';
        b.setAttribute('aria-expanded', String(open));
        $$('[data-pa-acc]', b.closest('[data-pa-faq]')).forEach(function (x) { x.setAttribute('aria-expanded', String(open)); var p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !open; });
      });
    });
    $$('[data-pa-faq]').forEach(function (root) {
      var tabs = $$('[data-pa-faq-tab]', root);
      function select(tab, focus) {
        tabs.forEach(function (t) { var on = t === tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
        $$('[data-pa-faq-panel]', root).forEach(function (p) { p.hidden = p.getAttribute('data-pa-faq-panel') !== tab.getAttribute('data-pa-faq-tab'); });
        if (focus) tab.focus();
      }
      tabs.forEach(function (t, i) {
        t.tabIndex = t.getAttribute('aria-selected') === 'true' ? 0 : -1;
        t.addEventListener('click', function () { select(t); });
        t.addEventListener('keydown', function (e) {
          var k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
          if (!k) return;
          e.preventDefault();
          select(tabs[(i + k + tabs.length) % tabs.length], true);
        });
      });
      var fold = $('[data-pa-fold]', root), target = $('[data-pa-fold-target]', root);
      if (fold && target) {
        var mq = window.matchMedia('(max-width: 749px)');
        var apply = function () { if (!mq.matches) { target.hidden = false; return; } target.hidden = fold.getAttribute('aria-expanded') !== 'true'; };
        fold.setAttribute('aria-expanded', 'false');
        fold.addEventListener('click', function () { fold.setAttribute('aria-expanded', String(fold.getAttribute('aria-expanded') !== 'true')); apply(); });
        if (mq.addEventListener) mq.addEventListener('change', apply);
        apply();
      }
    });
    $$('[data-pa-more]').forEach(function (b) {
      var body = b.previousElementSibling && b.previousElementSibling.hasAttribute('data-pa-collapse') ? b.previousElementSibling : null;
      if (!body) return;
      b.addEventListener('click', function () { var open = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', String(open)); body.classList.toggle('is-open', open); b.hidden = open; });
    });
  }

  /* ---------------------------------------------------------------- Filtres du journal */
  function initFilters() {
    $$('[data-pa-filter-root]').forEach(function (root) {
      var buttons = $$('[data-pa-filter]', root), items = $$('[data-pa-cat]', root), empty = $('[data-pa-empty]', root);
      function apply(key) {
        buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-pa-filter') === key)); });
        var shown = 0;
        items.forEach(function (it) { var on = key === 'all' || it.getAttribute('data-pa-cat') === key; it.hidden = !on; if (on) shown++; });
        if (empty) empty.hidden = shown > 0;
        root.classList.toggle('is-filtered', key !== 'all');
      }
      buttons.forEach(function (b) { b.addEventListener('click', function () { apply(b.getAttribute('data-pa-filter')); }); });
    });
  }

  /* ---------------------------------------------------------------- Ateliers : filtres date et thème */
  function initWorkshops() {
    $$('[data-pa-workshops]').forEach(function (root) {
      var items = $$('.pa-ws', root), dateSel = $('[data-pa-ws-date]', root), themeSel = $('[data-pa-ws-theme]', root), empty = $('[data-pa-ws-empty]', root), count = $('[data-pa-ws-count]', root);
      var resets = $$('[data-pa-ws-reset]', root);
      var dates = [];
      items.forEach(function (it) { var a = atOf(it.getAttribute('data-pa-atelier')); if (a && a.date) { it.setAttribute('data-date', a.date); if (dates.indexOf(a.date) < 0) dates.push(a.date); } });
      dates.sort().forEach(function (d) { var o = document.createElement('option'); o.value = d; o.textContent = dateText(d); dateSel.appendChild(o); });
      // Ordre chronologique des cartes (les données font foi, jamais l'ordre de saisie).
      var list = $('.pa-workshops__list', root);
      items.slice().sort(function (a, b) { return (a.getAttribute('data-date') || '9') < (b.getAttribute('data-date') || '9') ? -1 : 1; }).forEach(function (it) { list.appendChild(it); });
      function apply() {
        var d = dateSel.value, th = themeSel.value, shown = 0;
        items.forEach(function (it) { var on = (!d || it.getAttribute('data-date') === d) && (!th || it.getAttribute('data-theme') === th); it.hidden = !on; if (on) shown++; });
        empty.hidden = shown > 0;
        resets.forEach(function (r) { r.hidden = !(d || th) && !r.closest('[data-pa-ws-empty]'); });
        if (count) count.textContent = fmt(T.wsCount, { n: shown });
      }
      dateSel.addEventListener('change', apply);
      themeSel.addEventListener('change', apply);
      resets.forEach(function (r) { r.addEventListener('click', function () { dateSel.value = ''; themeSel.value = ''; apply(); dateSel.focus(); }); });
      var form = $('[data-pa-ws-filters]', root);
      if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });
      apply();
    });
  }

  /* ---------------------------------------------------------------- Visionneuse de la galerie */
  function initLightbox() {
    $$('[data-pa-lightbox-root]').forEach(function (root) {
      var box = $('[data-pa-lightbox]', root), img = $('[data-pa-lb-img]', root), title = $('[data-pa-lb-title]', root);
      var shots = $$('[data-pa-open]', root), idx = 0, opener = null;
      if (!box) return;
      function show(i) { idx = (i + shots.length) % shots.length; var src = $('img', shots[idx]); img.src = src ? (src.currentSrc || src.src) : ''; title.textContent = shots[idx].getAttribute('data-title') || ''; }
      function open(i, from) { opener = from; show(i); box.hidden = false; document.body.style.overflow = 'hidden'; $('[data-pa-lb-close]', box).focus(); }
      function close() { box.hidden = true; document.body.style.overflow = ''; if (opener) opener.focus(); }
      shots.forEach(function (b, i) { b.addEventListener('click', function () { open(i, b); }); });
      $('[data-pa-lb-close]', box).addEventListener('click', close);
      $('[data-pa-lb-prev]', box).addEventListener('click', function () { show(idx - 1); });
      $('[data-pa-lb-next]', box).addEventListener('click', function () { show(idx + 1); });
      box.addEventListener('click', function (e) { if (e.target === box) close(); });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') show(idx - 1);
        else if (e.key === 'ArrowRight') show(idx + 1);
        else if (e.key === 'Tab') trap(box, e);
      });
    });
  }
  function trap(box, e) {
    var f = $$('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', box).filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }

  /* ---------------------------------------------------------------- Formulaires (contact, entreprises, articles) */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function showErr(form, name, on) { var p = $('[data-pa-err="' + name + '"]', form); if (p) p.hidden = !on; var f = form.elements[name]; if (f && f.setAttribute) { if (on) f.setAttribute('aria-invalid', 'true'); else f.removeAttribute('aria-invalid'); } }
  function initRequests() {
    $$('[data-pa-request]').forEach(function (form) {
      var kind = form.getAttribute('data-pa-request'), status = $('[data-pa-status]', form), btn = $('[data-pa-submit]', form), busy = false;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (busy) return;
        var v = function (n) { return form.elements[n] ? String(form.elements[n].value || '').trim() : ''; };
        var errs = [];
        if (!EMAIL_RE.test(v('email'))) errs.push('email');
        if (kind === 'contact') { if (!v('name')) errs.push('name'); if (!v('subject')) errs.push('subject'); if (!v('message')) errs.push('message'); }
        if (kind === 'entreprise') {
          if (!v('organisation')) errs.push('organisation'); if (!v('message')) errs.push('message');
          var n = v('participants'); if (n && !(Number(n) >= 1 && Number(n) <= 500)) errs.push('participants');
        }
        ['email', 'name', 'subject', 'message', 'organisation', 'participants'].forEach(function (k) { showErr(form, k, errs.indexOf(k) >= 0); });
        if (errs.length) { var first = form.elements[errs[0]]; if (first && first.focus) first.focus(); return; }
        busy = true; if (btn) btn.disabled = true;
        status.hidden = false; status.textContent = T.sending; status.className = 'pa-form__status';
        var payload = { kind: kind };
        $$('input, select, textarea', form).forEach(function (f) { if (f.name) payload[f.name] = f.value; });
        var p = LIVE ? api('/requests', { method: 'POST', body: payload }).then(function (r) { if (r.status >= 300) throw r; return kind === 'newsletter' ? T.nlLive : T.sentLive; }) : wait(400).then(function () { return kind === 'newsletter' ? T.nlDemo : T.sentDemo; });
        p.then(function (msg) { status.textContent = msg; status.className = 'pa-form__status is-ok'; form.reset(); })
          .catch(function () { status.textContent = T.sentFailed; status.className = 'pa-form__status is-error'; })
          .then(function () { busy = false; if (btn) btn.disabled = false; });
      });
    });
  }

  /* ---------------------------------------------------------------- Cookies : rien de facultatif avant l'accord */
  var COOKIE_KEY = 'pa-cookies';
  function initCookies() {
    var box = $('[data-pa-cookies]');
    if (!box) return;
    var saved = readJSON(LS, COOKIE_KEY, null);
    if (saved && saved.at) return;
    box.hidden = false;
    function save(stats) { writeJSON(LS, COOKIE_KEY, { necessary: true, stats: !!stats, at: new Date().toISOString() }); box.hidden = true; document.dispatchEvent(new CustomEvent('pa:consent', { detail: { stats: !!stats } })); }
    $('[data-pa-cookies-accept]', box).addEventListener('click', function () { save(true); });
    $('[data-pa-cookies-refuse]', box).addEventListener('click', function () { save(false); });
    var close = $('[data-pa-cookies-close]', box);
    // Fermer sans choisir : aucun traceur facultatif, la question reviendra à la prochaine visite.
    if (close) close.addEventListener('click', function () { box.hidden = true; });
    var custom = $('[data-pa-cookies-custom]', box), prefs = $('.pa-cookies__prefs', box);
    custom.addEventListener('click', function () { var open = custom.getAttribute('aria-expanded') !== 'true'; custom.setAttribute('aria-expanded', String(open)); prefs.hidden = !open; });
    $('[data-pa-cookies-save]', box).addEventListener('click', function () { save($('[data-pa-cookies-stats]', box).checked); });
  }

  /* ---------------------------------------------------------------- Calendrier */
  function Calendar(root, opts) {
    var self = this, R = rules(), today = todayDate();
    var view = { y: Number((opts.date || today).slice(0, 4)), m: Number((opts.date || today).slice(5, 7)) };
    var statuses = {}, selected = opts.date || '';
    function label(st) { return st === 'closed' ? T.closed : st === 'full' ? T.fullDay : st === 'past' ? T.pastDay : ''; }
    function render() {
      var grid = C().monthGrid(view.y, view.m), lastAllowed = C().addDays(today, R.horizonDays);
      var canPrev = view.y * 12 + view.m > Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7));
      var canNext = view.y * 12 + view.m < Number(lastAllowed.slice(0, 4)) * 12 + Number(lastAllowed.slice(5, 7));
      var html = '<div class="pa-cal__head"><button type="button" class="pa-cal__nav" data-cal-prev aria-label="' + esc(T.prevMonth) + '"' + (canPrev ? '' : ' disabled') + '>' + ICONS.prev + '</button><p class="pa-cal__month" aria-live="polite">' + esc(C().monthLabel(view.y, view.m, LANG)) + '</p><button type="button" class="pa-cal__nav" data-cal-next aria-label="' + esc(T.nextMonth) + '"' + (canNext ? '' : ' disabled') + '>' + ICONS.next + '</button></div>';
      html += '<table class="pa-cal__grid" role="grid"><thead><tr>' + C().DAYS_SHORT[LANG].map(function (d) { return '<th scope="col" abbr="' + d + '">' + d + '</th>'; }).join('') + '</tr></thead><tbody>';
      for (var i = 0; i < grid.length; i += 7) {
        html += '<tr>';
        for (var j = i; j < i + 7; j++) {
          var d = grid[j];
          if (!d) { html += '<td></td>'; continue; }
          var st = statuses[d] || 'loading', open = st === 'open';
          html += '<td><button type="button" class="pa-cal__day' + (d === selected ? ' is-selected' : '') + (d === today ? ' is-today' : '') + (open ? '' : ' is-off') + '" data-date="' + d + '"' + (open ? '' : ' aria-disabled="true"') + ' aria-pressed="' + (d === selected) + '" aria-label="' + esc(dateText(d) + (open ? '' : ' — ' + label(st))) + '">' + Number(d.slice(8)) + '</button></td>';
        }
        html += '</tr>';
      }
      root.innerHTML = html + '</tbody></table>';
    }
    function load() {
      statuses = {}; render();
      return Data.month(opts.query(), view.y, view.m).then(function (s) { statuses = s; render(); return s; }).catch(function () { opts.onError && opts.onError(); });
    }
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || b.disabled) return;
      if (b.hasAttribute('data-cal-prev')) { view.m--; if (view.m < 1) { view.m = 12; view.y--; } load(); return; }
      if (b.hasAttribute('data-cal-next')) { view.m++; if (view.m > 12) { view.m = 1; view.y++; } load(); return; }
      var d = b.getAttribute('data-date');
      if (!d || b.getAttribute('aria-disabled') === 'true') return;
      selected = d; render();
      var again = root.querySelector('[data-date="' + d + '"]'); if (again) again.focus();
      opts.onSelect(d);
    });
    root.addEventListener('keydown', function (e) {
      var b = e.target.closest('[data-date]');
      if (!b) return;
      var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (!step) return;
      e.preventDefault();
      var t = root.querySelector('[data-date="' + C().addDays(b.getAttribute('data-date'), step) + '"]');
      if (t) t.focus();
    });
    self.reload = load;
    self.select = function (d) { selected = d; if (d) { view.y = Number(d.slice(0, 4)); view.m = Number(d.slice(5, 7)); } return load(); };
  }
  var ICONS = {
    prev: '<svg class="pa-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    next: '<svg class="pa-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>'
  };

  /** Fichier d'agenda réel (.ics, fuseau du cabinet) ; lieu : adresse pour le cabinet, jamais pour la visioconférence. */
  function downloadIcs(a) {
    var place = a.modality === 'visio' ? T.visio : (a.place || addressText() || T.cabinet);
    var text = C().ics({ number: a.number, date: a.date, time: a.time, duration: a.duration, serviceName: a.serviceName }, { timezone: rules().timezone, summary: (CFG.name ? CFG.name + ' — ' : '') + a.serviceName, location: place });
    var blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = a.number + '.ics';
    document.body.appendChild(link);
    link.click();
    setTimeout(function () { URL.revokeObjectURL(link.href); link.remove(); }, 1000);
  }

  /* ---------------------------------------------------------------- Prise de rendez-vous */
  var STATE_KEY = 'pa-booking-state';
  function initBooking(root) {
    var texts = $('[data-pa-texts]', root);
    var stepNames = String(texts.getAttribute('data-steps') || '').split(',').map(function (s) { return s.trim(); });
    var state = readJSON(SS, STATE_KEY, null) || {};
    state = { kind: state.kind || '', service: state.service || '', modality: state.modality || '', date: state.date || '', time: state.time || '', atelier: state.atelier || '', idem: state.idem || uid(), contact: state.contact || {} };
    var step = 1, submitting = false, cal = null, lastAppt = null;
    function persist() { writeJSON(SS, STATE_KEY, state); }
    function pane(n) { return $('[data-pa-pane="' + n + '"]', root); }
    function svc() { return state.kind === 'seance' ? svcOf(state.service) : null; }
    function at() { return state.kind === 'atelier' ? atOf(state.atelier) : null; }

    function stepper() {
      $$('[data-pa-stepper]', root).forEach(function (ol) {
        ol.innerHTML = stepNames.map(function (name, i) { var n = i + 1; return '<li class="pa-stepper__item' + (n < step ? ' is-done' : '') + (n === step ? ' is-active' : '') + '"' + (n === step ? ' aria-current="step"' : '') + '><span class="pa-stepper__num">' + n + '</span><span class="pa-stepper__name">' + esc(name) + '</span></li>'; }).join('');
      });
    }
    function go(n, focus) {
      step = n;
      root.setAttribute('data-step', String(n));
      [1, 2, 3, 4].forEach(function (k) { pane(k).hidden = k !== n; });
      stepper();
      if (n === 2) enterStep2();
      if (n === 3) { pane(3).setAttribute('data-sub', 'form'); renderRecap(); }
      if (focus !== false) { var h = $('.pa-pane__title', pane(n)); if (h) h.focus({ preventScroll: true }); try { root.scrollIntoView({ block: 'start' }); } catch (e) { /* rien */ } }
    }

    /* Étape 1 */
    var serviceInputs = $$('[data-pa-service]', root), modeInputs = $$('[data-pa-mode]', root);
    function choiceValue() { return state.kind === 'atelier' ? 'atelier' : state.service; }
    function paint1() {
      serviceInputs.forEach(function (i) { i.checked = i.value === choiceValue(); i.closest('.pa-choice').classList.toggle('is-selected', i.checked); });
      var s = svc(), atelier = state.kind === 'atelier';
      $('[data-pa-modes]', root).hidden = atelier;
      $('[data-pa-atelier-mode]', root).hidden = !atelier;
      modeInputs.forEach(function (i) {
        var allowed = !s || s.modes.indexOf(i.value) >= 0;
        var lab = i.closest('.pa-mode');
        i.disabled = !allowed; lab.classList.toggle('is-disabled', !allowed);
        i.checked = i.value === state.modality && allowed; lab.classList.toggle('is-selected', i.checked);
      });
    }
    serviceInputs.forEach(function (i) {
      i.addEventListener('change', function () {
        if (i.value === 'atelier') { state.kind = 'atelier'; state.service = ''; }
        else { state.kind = 'seance'; state.service = i.value; state.atelier = ''; var s = svc(); if (s && state.modality && s.modes.indexOf(state.modality) < 0) state.modality = ''; }
        state.date = ''; state.time = '';
        persist(); paint1(); $('[data-pa-err="service"]', root).hidden = true;
      });
    });
    modeInputs.forEach(function (i) { i.addEventListener('change', function () { state.modality = i.value; persist(); paint1(); $('[data-pa-err="modality"]', root).hidden = true; }); });

    /* Étape 2 */
    var slotsBox = $('[data-pa-slots]', root), noSlot = $('[data-pa-no-slot]', root), pickDay = $('[data-pa-pick-day]', root), dayTitle = $('[data-pa-day-title]', root), netErr = $('[data-pa-net-error]', root);
    var sessionsBox = $('[data-pa-sessions]', root), noSession = $('[data-pa-no-session]', root);
    function networkError() { netErr.hidden = false; }
    function enterStep2() {
      var atelier = state.kind === 'atelier';
      var t = $('[data-pa-step2-title]', root), sub = $('[data-pa-step2-sub]', root);
      t.textContent = t.getAttribute(atelier ? 'data-atelier' : 'data-seance');
      sub.textContent = sub.getAttribute(atelier ? 'data-atelier' : 'data-seance');
      $('[data-pa-cal-box]', root).hidden = atelier;
      $('[data-pa-slots-box]', root).hidden = atelier;
      $('[data-pa-sessions-box]', root).hidden = !atelier;
      netErr.hidden = true;
      miniSummary();
      if (atelier) return renderSessions();
      if (!cal) cal = new Calendar($('[data-pa-cal]', root), { date: state.date, query: function () { return { service: state.service, modality: state.modality }; }, onSelect: function (d) { state.date = d; state.time = ''; persist(); loadSlots(); miniSummary(); }, onError: networkError });
      var start = state.date || (svc() && C().dateStatus(rules(), '2026-11-10') === 'open' ? '2026-11-10' : '');
      cal.select(start).then(function () { if (start) { state.date = start; loadSlots(); } else renderSlots([]); });
    }
    function loadSlots() {
      if (!state.date) { renderSlots(null); return; }
      dayTitle.textContent = fmt(T.slotsOf, { date: dateText(state.date, 'lower') });
      netErr.hidden = true;
      Data.slots({ date: state.date, service: state.service, modality: state.modality }).then(renderSlots).catch(function () { renderSlots([]); networkError(); });
    }
    function renderSlots(slots) {
      if (slots === null) { slotsBox.innerHTML = ''; noSlot.hidden = true; pickDay.hidden = false; return; }
      pickDay.hidden = true;
      var free = slots.filter(function (s) { return s.available; });
      if (state.time && !free.some(function (s) { return s.time === state.time; })) state.time = '';
      slotsBox.innerHTML = free.map(function (s) { return '<button type="button" role="radio" class="pa-slot' + (s.time === state.time ? ' is-selected' : '') + '" aria-checked="' + (s.time === state.time) + '" data-time="' + s.time + '">' + esc(timeText(s.time)) + '</button>'; }).join('');
      noSlot.hidden = free.length > 0;
    }
    slotsBox.addEventListener('click', function (e) {
      var b = e.target.closest('[data-time]');
      if (!b) return;
      state.time = b.getAttribute('data-time'); persist();
      $$('.pa-slot', slotsBox).forEach(function (x) { var on = x === b; x.classList.toggle('is-selected', on); x.setAttribute('aria-checked', String(on)); });
      $('[data-pa-err="time"]', root).hidden = true;
      $('[data-pa-conflict]', root).hidden = true;
      miniSummary();
    });
    function renderSessions() {
      return Data.workshops(true).then(function (ws) {
        var list = rules().ateliers.filter(function (a) { return a.date && a.time; }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
        var open = list.filter(function (a) { var w = ws[a.id]; return w && w.status === 'open'; });
        if (state.atelier && !open.some(function (a) { return a.id === state.atelier; })) state.atelier = '';
        sessionsBox.innerHTML = list.map(function (a) {
          var w = ws[a.id] || {}, ok = w.status === 'open', sel = a.id === state.atelier;
          var seats = w.status === 'full' ? T.full : w.status === 'past' ? T.past : fmt(w.remaining === 1 ? T.seatLeft : T.seatsLeft, { n: w.remaining });
          return '<button type="button" role="radio" class="pa-session' + (sel ? ' is-selected' : '') + (ok ? '' : ' is-off') + '" aria-checked="' + sel + '"' + (ok ? '' : ' aria-disabled="true"') + ' data-atelier="' + esc(a.id) + '"><strong>' + esc(a.title) + '</strong><span>' + esc(dateText(a.date) + ' ' + T.at + ' ' + timeText(a.time)) + '</span><span class="pa-session__meta">' + esc(C().formatDuration(a.duration, LANG, 'both') + ' · ' + priceText(a.price)) + '</span><span class="pa-session__seats">' + tpl(root, 'ico-people') + esc(seats) + '</span></button>';
        }).join('');
        noSession.hidden = open.length > 0;
        miniSummary();
      }).catch(function () { sessionsBox.innerHTML = ''; networkError(); });
    }
    sessionsBox.addEventListener('click', function (e) {
      var b = e.target.closest('[data-atelier]');
      if (!b || b.getAttribute('aria-disabled') === 'true') return;
      state.atelier = b.getAttribute('data-atelier'); persist();
      $$('.pa-session', sessionsBox).forEach(function (x) { var on = x === b; x.classList.toggle('is-selected', on); x.setAttribute('aria-checked', String(on)); });
      $('[data-pa-err="time"]', root).hidden = true;
      $('[data-pa-conflict]', root).hidden = true;
      miniSummary();
    });

    /* Résumés */
    function current() {
      if (state.kind === 'atelier') { var a = at(); return a ? { name: a.title, duration: a.duration, price: a.price, date: a.date, time: a.time, modality: 'cabinet', place: a.place, image: a.image } : null; }
      var s = svc(); return s ? { name: s.name, duration: s.duration, price: s.price, date: state.date, time: state.time, modality: state.modality, place: '', image: s.image } : null;
    }
    function placeLines(c) {
      if (c.modality === 'visio') return { icon: tpl(root, 'ico-monitor'), title: T.visio, text: texts.getAttribute('data-visio') };
      return { icon: tpl(root, 'ico-home'), title: T.cabinet, text: c.place || addressText() || texts.getAttribute('data-address-todo') };
    }
    function miniSummary() {
      var box = $('[data-pa-mini-summary]', root), c = current();
      if (!c) { box.innerHTML = ''; return; }
      var p = placeLines(c);
      box.innerHTML = (c.image ? '<img class="pa-summary__img" src="' + esc(c.image) + '" alt="" loading="lazy">' : '') +
        '<p class="pa-summary__name">' + esc(c.name) + '</p>' +
        '<p class="pa-summary__meta">' + tpl(root, 'ico-clock') + esc(c.duration ? c.duration + ' ' + T.minutes : '') + '</p>' +
        '<p class="pa-summary__meta">' + tpl(root, 'ico-euro') + esc(priceText(c.price)) + '</p>' +
        (c.date && c.time ? '<p class="pa-summary__meta">' + tpl(root, 'ico-calendar') + esc(whenText(c.date, c.time)) + '</p>' : '') +
        '<p class="pa-summary__place">' + p.icon + '<span><strong>' + esc(p.title) + '</strong>' + esc(c.modality === 'visio' ? '' : (c.place || addressText() ? (c.place || addressText()) : '')) + '</span></p>';
    }
    function renderRecap() {
      var box = $('[data-pa-recap]', root), c = current();
      if (!c) { box.innerHTML = ''; return; }
      var p = placeLines(c);
      box.innerHTML = '<ul class="pa-recap__lines" role="list">' +
        '<li>' + tpl(root, 'ico-calendar') + '<span>' + esc(dateText(c.date)) + '<br>' + esc(timeText(c.time)) + '</span></li>' +
        '<li>' + tpl(root, 'ico-clock') + '<span>' + esc(c.name) + '<br>' + esc(c.duration + ' ' + T.minutes) + '<br>' + esc(priceText(c.price)) + '</span></li>' +
        '<li>' + p.icon + '<span>' + esc(p.title) + '<br><small>' + esc(p.text) + '</small></span></li></ul>';
    }

    /* Étape 3 : coordonnées */
    var form = $('[data-pa-contact]', root);
    ['firstName', 'lastName', 'email', 'phone', 'note'].forEach(function (k) { if (form.elements[k] && state.contact[k]) form.elements[k].value = state.contact[k]; });
    if (form.elements.terms) form.elements.terms.checked = false;
    form.addEventListener('input', function () { ['firstName', 'lastName', 'email', 'phone', 'note'].forEach(function (k) { state.contact[k] = form.elements[k].value; }); persist(); });
    form.addEventListener('submit', function (e) { e.preventDefault(); e.stopPropagation(); submit(); });
    function contactErrors() {
      var v = function (k) { return String(form.elements[k].value || '').trim(); };
      var errs = [];
      if (!v('firstName')) errs.push('firstName');
      if (!v('lastName')) errs.push('lastName');
      if (!EMAIL_RE.test(v('email'))) errs.push('email');
      if (v('phone') && !/^[+()\d][\d\s().-]{5,22}$/.test(v('phone'))) errs.push('phone');
      if (!form.elements.terms.checked) errs.push('terms');
      ['firstName', 'lastName', 'email', 'phone', 'terms'].forEach(function (k) { showErr(form, k, errs.indexOf(k) >= 0); var p = $('[data-pa-err="' + k + '"]', root); if (p) p.hidden = errs.indexOf(k) < 0; });
      if (errs.length) { var f = form.elements[errs[0]]; if (f && f.focus) f.focus(); }
      return errs;
    }

    /* Navigation */
    $$('[data-pa-next]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        if (step === 1) {
          var okS = state.kind === 'atelier' || !!svc(), okM = state.kind === 'atelier' || !!state.modality;
          $('[data-pa-err="service"]', root).hidden = okS;
          $('[data-pa-err="modality"]', root).hidden = !okS || okM;
          if (!okS) { var f = serviceInputs[0]; if (f) f.closest('.pa-choice').focus && serviceInputs[0].focus(); return; }
          if (!okM) { modeInputs[0].focus(); return; }
          go(2);
        } else if (step === 2) {
          var ok = state.kind === 'atelier' ? !!state.atelier : !!(state.date && state.time);
          $('[data-pa-err="time"]', root).hidden = ok;
          if (ok) go(3);
        }
      });
    });
    $$('[data-pa-prev]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        if (step === 3 && pane(3).getAttribute('data-sub') === 'review' && window.matchMedia('(max-width: 749px)').matches) { pane(3).setAttribute('data-sub', 'form'); return; }
        go(step - 1);
      });
    });
    var mnext = $('[data-pa-mnext]', root);
    if (mnext) mnext.addEventListener('click', function () { if (contactErrors().length) return; renderRecap(); pane(3).setAttribute('data-sub', 'review'); var r = $('.pa-recap', root); if (r) r.scrollIntoView({ block: 'start' }); });
    var submitBtn = $('[data-pa-submit]', root), submitStatus = $('[data-pa-submit-status]', root), conflictBox = $('[data-pa-conflict]', root);

    function conflict(alternatives, full) {
      state.time = ''; if (full) state.atelier = '';
      persist();
      go(2, false);
      conflictBox.hidden = false;
      conflictBox.textContent = full ? T.fullNow : alternatives && alternatives.length ? T.conflict + ' ' + alternatives.map(timeText).join(', ') : T.conflictNone;
      conflictBox.focus && conflictBox.setAttribute('tabindex', '-1');
      conflictBox.focus();
    }
    function submit() {
      if (submitting) return;
      if (contactErrors().length) { pane(3).setAttribute('data-sub', 'form'); return; }
      submitting = true; submitBtn.disabled = true; submitStatus.hidden = true;
      var c = current();
      var body = { kind: state.kind, service: state.kind === 'atelier' ? state.atelier : state.service, modality: state.kind === 'atelier' ? 'cabinet' : state.modality, date: c.date, time: c.time, firstName: form.elements.firstName.value.trim(), lastName: form.elements.lastName.value.trim(), email: form.elements.email.value.trim(), phone: form.elements.phone.value.trim(), note: form.elements.note.value.trim(), newsletter: form.elements.newsletter.checked, terms: form.elements.terms.checked, idem: state.idem };
      var p;
      if (LIVE) {
        p = api('/appointments', { method: 'POST', body: body }).then(function (r) {
          if (r.status === 409 && r.data.error === 'unavailable') { conflict(r.data.alternatives || []); return null; }
          if (r.status === 409 && r.data.error === 'full') { conflict([], true); return null; }
          if (r.status >= 300) throw r;
          if (r.data.token) setAccess(r.data.token);
          return { appt: r.data.appointment, token: r.data.token, email: r.data.email };
        });
      } else {
        p = wait(500).then(function () {
          var d = demoData();
          var dup = d.appts.filter(function (a) { return a.idem === state.idem; })[0];
          if (dup) return { appt: dup, token: dup.token, email: 'demo' };
          // Démonstration du « créneau pris au dernier moment » : le 10 novembre 2026 à 16h00, le premier essai est refusé.
          if (state.kind === 'seance' && c.date === '2026-11-10' && c.time === '16:00' && !d.conflictShown) {
            d.conflictShown = true; d.taken.push({ date: c.date, start: 960, end: 960 + c.duration }); saveDemo(d);
            var alt = C().slotsFor(rules(), { date: c.date, service: state.service, busy: demoBusy(c.date) }).filter(function (s) { return s.available; }).map(function (s) { return s.time; });
            conflict(alt); return null;
          }
          var errs = C().validate(rules(), { kind: state.kind, service: state.service, atelier: state.atelier, modality: body.modality, date: c.date, time: c.time }, { busy: demoBusy(c.date), taken: state.kind === 'atelier' ? demoTaken(state.atelier) : 0 });
          if (errs.indexOf('full') >= 0) { conflict([], true); return null; }
          if (errs.indexOf('slot_taken') >= 0) { conflict(C().slotsFor(rules(), { date: c.date, service: state.service, busy: demoBusy(c.date) }).filter(function (s) { return s.available; }).map(function (s) { return s.time; })); return null; }
          if (errs.length) throw new Error(errs.join(','));
          d.seq += 1;
          var appt = { number: 'P-' + ('000' + d.seq).slice(-4), status: 'confirmed', kind: state.kind, service: body.service, serviceName: c.name, modality: body.modality, date: c.date, time: c.time, duration: c.duration, price: c.price, place: state.kind === 'atelier' ? c.place : '', firstName: body.firstName, email: C().maskEmail(body.email), personalNote: '', idem: state.idem, token: 'demo-' + uid() };
          d.appts.push(appt); saveDemo(d);
          WS = null;
          return { appt: appt, token: appt.token, email: 'demo' };
        });
      }
      p.then(function (res) {
        if (!res) return;
        lastAppt = res.appt;
        if (res.token) setAccess(res.token);
        showDone(res.appt, res.token, res.email);
        // Nouvelle réservation possible ensuite : nouvelle clé d'envoi, les coordonnées restent pré-remplies.
        state.idem = uid(); state.time = ''; persist();
      }).catch(function () { submitStatus.hidden = false; submitStatus.textContent = T.errServer; })
        .then(function () { submitting = false; submitBtn.disabled = false; });
    }
    submitBtn.addEventListener('click', submit);

    /* Étape 4 : confirmation */
    function showDone(a, token, emailState) {
      go(4);
      var visio = a.modality === 'visio';
      $('[data-pa-ref]', root).textContent = a.number;
      var txt = $('[data-pa-done-text]', root);
      txt.innerHTML = esc(txt.getAttribute(LIVE ? 'data-live' : 'data-demo')).replace(/\n/g, '<br>');
      $$('[data-pa-done-photo] [data-mode]', root).forEach(function (n) { n.hidden = n.getAttribute('data-mode') !== (visio ? 'visio' : 'cabinet'); });
      var p = placeLines({ modality: a.modality, place: a.place });
      $('[data-pa-done-lines]', root).innerHTML =
        '<li>' + tpl(root, 'ico-calendar') + '<span>' + esc(dateText(a.date)) + '</span></li>' +
        '<li>' + tpl(root, 'ico-clock') + '<span>' + esc(timeText(a.time) + ' (' + a.duration + ' ' + T.minutes + ')') + '</span></li>' +
        '<li>' + (a.kind === 'atelier' ? tpl(root, 'ico-people') : tpl(root, 'ico-home')) + '<span>' + esc(a.serviceName + ' – ' + priceText(a.price)) + '</span></li>' +
        '<li>' + p.icon + '<span><strong>' + esc(p.title) + '</strong><br>' + esc(p.text) + '</span></li>';
      $('[data-pa-prepare]', root).hidden = !visio;
      $('[data-pa-done-art]', root).hidden = visio;
      root.classList.toggle('is-visio', visio);
      var mail = $('[data-pa-mail]', root);
      var key = !LIVE ? 'data-demo' : emailState === 'sent' ? 'data-sent' : emailState === 'failed' ? 'data-failed' : 'data-off';
      mail.innerHTML = esc(mail.getAttribute(key)).replace(/\n/g, '<br>');
      var manage = $('[data-pa-manage-link]', root);
      if (manage && token) manage.setAttribute('href', (PAGES.manage || manage.getAttribute('href').split('#')[0]) + '#t=' + encodeURIComponent(token));
    }
    $('[data-pa-ics]', root).addEventListener('click', function () { if (lastAppt) downloadIcs(lastAppt); });

    /* Démarrage : choix transmis par le lien (séance, modalité, atelier) */
    var h = hashParams();
    if (h.service && svcOf(h.service)) { state.kind = 'seance'; state.service = h.service; state.atelier = ''; if (h.mode && svcOf(h.service).modes.indexOf(h.mode) >= 0) state.modality = h.mode; state.date = ''; state.time = ''; }
    if (h.atelier !== undefined) { state.kind = 'atelier'; state.service = ''; state.atelier = atOf(h.atelier) ? h.atelier : ''; }
    persist();
    paint1();
    go(1, false);
    // Arrivée depuis une fiche d'atelier : l'atelier est déjà choisi, on ouvre l'étape des dates.
    if (h.atelier && atOf(h.atelier)) go(2, false);
  }

  /* ---------------------------------------------------------------- Retrouver un rendez-vous */
  function initLookup(form) {
    var status = $('[data-pa-status]', form), btn = $('[data-pa-submit]', form), busy = false;
    form.addEventListener('submit', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (busy) return;
      var ref = String(form.elements.reference.value || '').trim().toUpperCase(), email = String(form.elements.email.value || '').trim();
      var errs = [];
      if (!/^[A-Z0-9-]{3,40}$/.test(ref)) errs.push('reference');
      if (!EMAIL_RE.test(email)) errs.push('email');
      showErr(form, 'reference', errs.indexOf('reference') >= 0); showErr(form, 'email', errs.indexOf('email') >= 0);
      if (errs.length) { form.elements[errs[0]].focus(); return; }
      busy = true; btn.disabled = true;
      var neutral = form.getAttribute('data-done');
      var p = LIVE ? api('/lookup', { method: 'POST', body: { reference: ref, email: email } }).then(function (r) { if (r.status === 429 || r.status >= 500) throw r; return '<p>' + esc(neutral) + '</p>'; })
        : wait(400).then(function () {
          var d = demoData(), m = d.appts.filter(function (a) { return a.number.toUpperCase() === ref && a.email === C().maskEmail(email); })[0];
          var html = '<p>' + esc(neutral) + '</p><p class="pa-note">' + esc(form.getAttribute('data-demo')) + '</p>';
          if (m) html += '<a class="pa-link" href="' + esc((PAGES.manage || '/pages/mon-rendez-vous') + '#t=' + encodeURIComponent(m.token)) + '">' + esc(form.getAttribute('data-demo-link')) + '</a>';
          else html += '<p class="pa-note">' + esc(T.lookupNoDemo) + '</p>';
          return html;
        });
      p.then(function (html) { status.hidden = false; status.innerHTML = html; status.className = 'pa-lookup__done is-ok'; })
        .catch(function () { status.hidden = false; status.innerHTML = '<p>' + esc(T.errServer) + '</p>'; status.className = 'pa-lookup__done is-error'; })
        .then(function () { busy = false; btn.disabled = false; });
    });
  }

  /* ---------------------------------------------------------------- Gérer un rendez-vous */
  function initManage(root) {
    var h = hashParams();
    if (h.t) { setAccess(h.t); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* rien */ } }
    var appt = null, canChange = true, terms = '', opener = null;
    var status = $('[data-pa-m-status]', root);
    function view(name) { $$('[data-pa-view]', root).forEach(function (v) { v.hidden = v.getAttribute('data-pa-view') !== name; }); }
    function m(key) { return $('[data-pa-m="' + key + '"]', root); }
    function render() {
      view('details');
      var d = appt.date, wk = dateText(d).split(' ');
      m('date').innerHTML = '<span>' + esc(wk[0]) + '</span><strong>' + esc(wk.slice(1).join(' ')) + '</strong><span>' + esc(timeText(appt.time)) + '</span>';
      m('service').textContent = appt.serviceName;
      m('number').textContent = appt.number;
      m('canceled').hidden = appt.status !== 'canceled';
      m('duration').textContent = appt.duration + ' ' + T.minutes;
      m('price').textContent = priceText(appt.price);
      m('place').textContent = appt.modality === 'visio' ? T.visio : T.cabinet + ' – ' + (appt.place || addressText() || '[À renseigner]');
      var off = appt.status !== 'confirmed' || !canChange;
      $('[data-pa-open-move]', root).disabled = off || appt.kind !== 'seance';
      $('[data-pa-open-cancel]', root).disabled = off;
      root.classList.toggle('is-canceled', appt.status === 'canceled');
      var note = $('[data-pa-note] textarea', root); if (note) note.value = appt.personalNote || '';
      if (!canChange && appt.status === 'confirmed') { status.hidden = false; status.textContent = T.tooLate; }
      if (appt.kind !== 'seance' && appt.status === 'confirmed') { $('[data-pa-open-move]', root).title = T.notMovable; }
      $('[data-pa-cancel-terms]', root).textContent = terms || $('[data-pa-cancel-terms]', root).textContent;
    }
    function load() {
      var t = accessToken();
      if (!LIVE) {
        var a = t ? demoByToken(t) : null;
        if (!a) { view('none'); return; }
        appt = a; canChange = C().changeAllowed(rules(), a); terms = CFG.cancelTerms || '';
        render(); return;
      }
      if (!t) { view('none'); return; }
      api('/appointment', { token: t }).then(function (r) {
        if (r.status === 401) { setAccess(''); view(r.data.error === 'expired' ? 'expired' : 'none'); return; }
        if (r.status !== 200) throw r;
        appt = r.data.appointment; canChange = !!r.data.changeAllowed; terms = r.data.cancelTerms || '';
        render();
      }).catch(function () { view('error'); });
    }
    var retry = $('[data-pa-retry]', root); if (retry) retry.addEventListener('click', load);
    var example = $('[data-pa-demo-example]', root);
    if (example) example.addEventListener('click', function () {
      // Exemple de démonstration : un rendez-vous fictif créé dans ce navigateur seulement.
      var d = demoData(), s = rules().seances[0];
      if (!s) return;
      var date = C().dateStatus(rules(), '2026-11-10') === 'open' ? '2026-11-10' : C().addDays(todayDate(), 14);
      d.seq += 1;
      var a = { number: 'P-' + ('000' + d.seq).slice(-4), status: 'confirmed', kind: 'seance', service: s.id, serviceName: s.name, modality: 'cabinet', date: date, time: '14:00', duration: s.duration, price: s.price, place: '', firstName: 'Julie', email: C().maskEmail('julie.martin@example.com'), personalNote: '', idem: uid(), token: 'demo-' + uid() };
      d.appts.push(a); saveDemo(d); setAccess(a.token); load();
    });

    function openDialog(box, from) { opener = from; box.hidden = false; document.body.style.overflow = 'hidden'; var f = $('select, button.pa-btn--forest, button.pa-btn--danger', box); if (f) f.focus(); }
    function closeDialog(box) { box.hidden = true; document.body.style.overflow = ''; if (opener) opener.focus(); }
    $$('.pa-dialog', root).forEach(function (box) {
      $$('[data-pa-close]', box).forEach(function (b) { b.addEventListener('click', function () { closeDialog(box); }); });
      box.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDialog(box); else if (e.key === 'Tab') trap(box, e); });
      box.addEventListener('click', function (e) { if (e.target === box) closeDialog(box); });
    });

    /* Modifier : date puis nouvel horaire (créneaux libres sans compter ce rendez-vous) */
    var moveBox = $('[data-pa-move-dialog]', root), dateSel = $('[data-pa-move-date]', root), timeSel = $('[data-pa-move-time]', root), moveErr = $('[data-pa-move-error]', root), moveStatus = $('[data-pa-move-status]', root);
    function fillTimes() {
      timeSel.innerHTML = '';
      Data.slots({ date: dateSel.value, service: appt.service, modality: appt.modality, except: appt.number }).then(function (slots) {
        var free = slots.filter(function (s) { return s.available && !(dateSel.value === appt.date && s.time === appt.time); });
        timeSel.innerHTML = free.map(function (s) { return '<option value="' + s.time + '">' + esc(timeText(s.time)) + '</option>'; }).join('');
        moveStatus.hidden = free.length > 0; moveStatus.textContent = free.length ? '' : T.noOther;
      }).catch(function () { moveStatus.hidden = false; moveStatus.textContent = T.errServer; });
    }
    $('[data-pa-open-move]', root).addEventListener('click', function (e) {
      if (!appt) return;
      dateSel.innerHTML = '';
      var d = appt.date < todayDate() ? todayDate() : appt.date, added = 0;
      for (var i = 0; i < 60 && added < 21; i++, d = C().addDays(d, 1)) {
        if (C().dateStatus(rules(), d) !== 'open') continue;
        var o = document.createElement('option'); o.value = d; o.textContent = dateText(d); if (d === appt.date) o.selected = true; dateSel.appendChild(o); added++;
      }
      moveErr.hidden = true; moveStatus.hidden = true;
      fillTimes();
      openDialog(moveBox, e.currentTarget);
    });
    dateSel.addEventListener('change', fillTimes);
    $('[data-pa-move-save]', root).addEventListener('click', function () {
      if (!timeSel.value) { moveErr.hidden = false; timeSel.focus(); return; }
      var change = { date: dateSel.value, time: timeSel.value };
      var p = LIVE ? api('/appointment/move', { method: 'POST', token: accessToken(), body: change }).then(function (r) {
        if (r.status === 409) { throw { msg: r.data.error === 'too_late' ? T.tooLate : r.data.error === 'not_movable' ? T.notMovable : T.noOther }; }
        if (r.status !== 200) throw r;
        return r.data.appointment;
      }) : wait(300).then(function () {
        var errs = C().validate(rules(), { kind: 'seance', service: appt.service, modality: appt.modality, date: change.date, time: change.time }, { busy: demoBusy(change.date, appt.number) });
        if (errs.length) throw { msg: T.noOther };
        var d = demoData(); d.appts.forEach(function (a) { if (a.number === appt.number) { a.date = change.date; a.time = change.time; } }); saveDemo(d);
        return Object.assign({}, appt, change);
      });
      p.then(function (a) {
        appt = Object.assign(appt, a); render(); closeDialog(moveBox);
        status.hidden = false; status.textContent = fmt(LIVE ? T.movedLive : T.movedDemo, { when: whenText(appt.date, appt.time) });
      }).catch(function (err) { moveStatus.hidden = false; moveStatus.textContent = err && err.msg ? err.msg : T.errServer; });
    });

    /* Annuler (confirmation obligatoire) */
    var cancelBox = $('[data-pa-cancel-dialog]', root), cancelStatus = $('[data-pa-cancel-status]', root);
    $('[data-pa-open-cancel]', root).addEventListener('click', function (e) { cancelStatus.hidden = true; openDialog(cancelBox, e.currentTarget); });
    $('[data-pa-cancel-confirm]', root).addEventListener('click', function () {
      var p = LIVE ? api('/appointment/cancel', { method: 'POST', token: accessToken() }).then(function (r) { if (r.status === 409) throw { msg: T.tooLate }; if (r.status !== 200) throw r; return r.data.appointment; })
        : wait(300).then(function () { var d = demoData(); d.appts.forEach(function (a) { if (a.number === appt.number) a.status = 'canceled'; }); saveDemo(d); WS = null; return Object.assign({}, appt, { status: 'canceled' }); });
      p.then(function (a) {
        appt = Object.assign(appt, a); opener = $('[data-pa-ics]', root); closeDialog(cancelBox); render();
        status.hidden = false; status.textContent = LIVE ? T.canceledLive : T.canceledDemo;
      }).catch(function (err) { cancelStatus.hidden = false; cancelStatus.textContent = err && err.msg ? err.msg : T.errServer; });
    });

    /* Agenda et note personnelle */
    $('[data-pa-ics]', root).addEventListener('click', function () { if (appt) downloadIcs(appt); });
    var noteForm = $('[data-pa-note]', root);
    noteForm.addEventListener('submit', function (e) {
      e.preventDefault(); e.stopPropagation();
      var st = $('[data-pa-status]', noteForm), note = noteForm.elements.note.value.trim();
      st.hidden = false; st.textContent = T.saving;
      var p = LIVE ? api('/appointment/note', { method: 'POST', token: accessToken(), body: { note: note } }).then(function (r) { if (r.status !== 200) throw r; return root.getAttribute('data-note-saved'); })
        : wait(200).then(function () { var d = demoData(); d.appts.forEach(function (a) { if (a.number === appt.number) a.personalNote = note; }); saveDemo(d); return T.savedDemo; });
      p.then(function (msg) { appt.personalNote = note; st.textContent = msg; st.className = 'pa-form__status is-ok'; }).catch(function () { st.textContent = T.errServer; st.className = 'pa-form__status is-error'; });
    });
    load();
  }

  function start() {
    if (!C()) return;
    document.body.classList.toggle('pa-live', LIVE);
    // Mentions de démonstration : jamais avec le service réel.
    if (!CFG.demoNote || LIVE) $$('[data-pa-demo-note]').forEach(function (n) { n.hidden = true; });
    $$('[data-pa-demo-only]').forEach(function (n) { n.hidden = LIVE; });
    initHeader();
    syncSeances();
    syncAteliers();
    prepareBookLinks();
    initAccordions();
    initFilters();
    initWorkshops();
    initLightbox();
    initRequests();
    initCookies();
    $$('[data-pa-booking]').forEach(initBooking);
    $$('[data-pa-lookup]').forEach(initLookup);
    $$('[data-pa-manage]').forEach(initManage);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
