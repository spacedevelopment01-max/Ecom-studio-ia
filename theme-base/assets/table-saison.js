/*
 * TABLE SAISON — interactions du thème restaurant (issue #175).
 *  - Réservation en trois étapes, créneau devenu indisponible, confirmation (ICS), gestion, modification, annulation.
 *  - Deux fonctionnements, jamais confondus : « demo » (tout est simulé dans ce navigateur et annoncé comme tel, aucun
 *    e-mail) et « live » (service réel du studio : disponibilité vérifiée côté serveur, jeton de gestion, e-mail réel).
 *  - Galerie filtrable et visionneuse accessible, accordéons, onglets de la carte, formulaires, bandeau des cookies.
 */
(function () {
  'use strict';
  var EN = /^en/i.test(document.documentElement.lang || '');
  var T = EN ? {
    person: 'person', people: 'people', chooseDate: 'Choose a date', chooseTime: 'Choose a time',
    errDate: 'Choose an available date in the calendar.', errTime: 'Choose an available time.',
    errRequired: 'This field is required.', errEmail: 'Enter a valid e-mail address.', errPhone: 'Enter a valid phone number.', errTerms: 'Please accept the booking terms.',
    errServer: 'The booking service could not be reached. Nothing has been booked: please try again in a moment.', errInvalid: 'Some information is missing or incorrect.', errDuplicate: 'A booking already exists for this e-mail address at this time.',
    noSlot: 'No time available on this date for this number of people.', closed: 'Closed', past: 'Past', full: 'Full',
    altTitle: '{service} — available times', continueWith: 'Continue with {time}', unavailableText: 'The {time} slot you selected has just been booked by another guest. Here are other times:',
    demoNote: 'Example restaurant — demonstration prices and availability. Simulation — no real booking.',
    liveNote: 'Your table is booked. Keep your booking number.',
    demoEmail: 'Demonstration: no e-mail sent (it would go to {email}).', emailSent: 'Confirmation e-mail sent to {email}', emailOff: 'No e-mail sent: e-mail is not set up by the restaurant. Keep your booking number.', emailFailed: 'The confirmation e-mail could not be sent. Your booking is recorded: keep your number.',
    at: 'at', confirmed: 'Confirmed', canceled: 'Canceled', noPref: 'No preference given',
    demoReservation: 'Demonstration: fictitious booking, not a real reservation.', noAccess: 'Open the link received by e-mail to view your booking, or find it with your e-mail address.',
    notFound: 'This booking could not be found. Open the link received by e-mail again.', canceledDone: 'Your booking has been canceled. It is no longer active.', canceledAlready: 'This booking is canceled: it can no longer be changed.',
    saved: 'Changes saved.', savedDemo: 'Demonstration: changes saved in this browser only.', insteadOf: '(instead of {time})', unchanged: 'No change yet.',
    lookupNeutral: 'If a booking matches this address, a secure link has just been sent to it.', lookupDemo: 'Demonstration: no e-mail is sent. Open the fictitious booking:', lookupOpen: 'See booking {n}',
    sentDemo: 'Demonstration: the message has been checked but sent to no one.', sentLive: 'Message received by the restaurant. Thank you!', requestFailed: 'The message could not be sent. Please try again or call us.',
    groupDemo: 'Demonstration: this request was sent to no one.', mapTitle: 'Restaurant map', icsSummary: 'Table booking', personsShort: 'pers.'
  } : {
    person: 'personne', people: 'personnes', chooseDate: 'Choisissez une date', chooseTime: 'Choisissez un horaire',
    errDate: 'Choisissez une date disponible dans le calendrier.', errTime: 'Choisissez un horaire disponible.',
    errRequired: 'Ce champ est obligatoire.', errEmail: 'Saisissez une adresse e-mail valide.', errPhone: 'Saisissez un numéro de téléphone valide.', errTerms: 'Merci d’accepter les conditions de réservation.',
    errServer: 'Le service de réservation n’a pas répondu. Rien n’a été réservé : réessayez dans un instant.', errInvalid: 'Une information manque ou est incorrecte.', errDuplicate: 'Une réservation existe déjà pour cette adresse e-mail à cet horaire.',
    noSlot: 'Aucun horaire disponible ce jour-là pour ce nombre de personnes.', closed: 'Fermé', past: 'Passé', full: 'Complet',
    altTitle: '{service} — horaires disponibles', continueWith: 'Continuer avec {time}', unavailableText: 'Le créneau de {time} que vous avez sélectionné vient d’être réservé par un autre convive. Nous vous proposons ces alternatives :',
    demoNote: 'Exemple de restaurant — tarifs et disponibilités de démonstration. Simulation — aucune réservation réelle.',
    liveNote: 'Votre table est réservée. Conservez votre numéro de réservation.',
    demoEmail: 'Démonstration : aucun e-mail envoyé (il partirait à {email}).', emailSent: 'E-mail de confirmation envoyé à {email}', emailOff: 'Aucun e-mail envoyé : l’envoi n’est pas configuré par le restaurant. Conservez votre numéro.', emailFailed: 'L’e-mail de confirmation n’a pas pu partir. Votre réservation est enregistrée : conservez votre numéro.',
    at: 'à', confirmed: 'Confirmée', canceled: 'Annulée', noPref: 'Aucune préférence renseignée',
    demoReservation: 'Démonstration : réservation fictive, aucune réservation réelle.', noAccess: 'Ouvrez le lien reçu par e-mail pour consulter votre réservation, ou retrouvez-la avec votre adresse e-mail.',
    notFound: 'Réservation introuvable. Ouvrez de nouveau le lien reçu par e-mail.', canceledDone: 'Votre réservation est annulée. Elle n’est plus active.', canceledAlready: 'Cette réservation est annulée : elle ne peut plus être modifiée.',
    saved: 'Modifications enregistrées.', savedDemo: 'Démonstration : modifications enregistrées dans ce navigateur seulement.', insteadOf: '(au lieu de {time})', unchanged: 'Aucune modification pour l’instant.',
    lookupNeutral: 'Si une réservation correspond à cette adresse, un lien sécurisé vient d’y être envoyé.', lookupDemo: 'Démonstration : aucun e-mail n’est envoyé. Ouvrez la réservation fictive :', lookupOpen: 'Voir la réservation {n}',
    sentDemo: 'Démonstration : le message a été vérifié mais envoyé à personne.', sentLive: 'Message bien reçu par le restaurant. Merci !', requestFailed: 'Le message n’a pas pu partir. Réessayez ou appelez-nous.',
    groupDemo: 'Démonstration : cette demande n’a été envoyée à personne.', mapTitle: 'Plan du restaurant', icsSummary: 'Réservation de table', personsShort: 'pers.'
  };
  function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return o && o[k] != null ? o[k] : ''; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function store(kind) { try { var s = window[kind]; var k = '__ts'; s.setItem(k, '1'); s.removeItem(k); return s; } catch (e) { return null; } }
  var LS = store('localStorage'), SS = store('sessionStorage');
  function readJSON(st, key, fb) { try { var v = st && st.getItem(key); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function writeJSON(st, key, v) { try { if (st) st.setItem(key, JSON.stringify(v)); } catch (e) { /* stockage indisponible : l'état reste en mémoire */ } }
  function uid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }

  var CFG = (function () { var el = document.getElementById('ts-config'); try { return el ? JSON.parse(el.textContent) : null; } catch (e) { return null; } })() || { mode: 'demo', services: [], pages: {} };
  var LIVE = CFG.mode === 'live' && /^https:\/\//.test(CFG.api || '');
  var PAGES = CFG.pages || {};
  function core() { return window.TableSaisonCore; }
  function rules() {
    var C = core(), list = function (v) { return String(v || '').split(/[\s,;]+/).filter(C.isTime); };
    return C.normalize({
      timezone: CFG.timezone, openDays: String(CFG.openDays || '0,1,2,3,4,5,6').split(/[\s,;]+/).map(Number).filter(function (d) { return d >= 0 && d <= 6; }),
      closures: C.parseClosures(CFG.closures), capacity: CFG.capacity, minParty: CFG.minParty, maxParty: CFG.maxParty, horizonDays: CFG.horizonDays, leadMinutes: CFG.leadMinutes,
      services: (CFG.services || []).map(function (s) { return { id: s.id, label: s.label, slots: list(s.slots) }; })
    });
  }
  function partyText(n) { return n + ' ' + (n > 1 ? T.people : T.person); }
  function timeText(t) { return core().formatTime(t, EN ? 'en' : 'fr'); }
  function dateText(d) { return core().formatDate(d, EN ? 'en' : 'fr'); }
  function api(path, opts) {
    var o = opts || {};
    return fetch(CFG.api.replace(/\/+$/, '') + path, { method: o.method || 'GET', headers: Object.assign({ 'Content-Type': 'application/json' }, o.token ? { 'X-Reservation-Token': o.token } : {}), body: o.body ? JSON.stringify(o.body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, data: j }; }); });
  }

  /* ---------------------------------------------------------------- Démonstration : données déterministes */
  var DEMO_KEY = 'ts-demo-reservations';
  function demoList() { return readJSON(LS, DEMO_KEY, []); }
  function demoSave(list) { writeJSON(LS, DEMO_KEY, list); }
  /** Date de la réservation fictive : le premier mardi ouvert à au moins 14 jours d'aujourd'hui (jamais passée). */
  function demoDate() {
    var C = core(), R = rules(), d = C.addDays(C.nowIn(R.timezone).date, 14);
    for (var i = 0; i < 60; i++) { if (C.weekday(d) === 2 && C.dateStatus(R, d) === 'open') return d; d = C.addDays(d, 1); }
    return C.addDays(C.nowIn(R.timezone).date, 14);
  }
  function demoFictive() { return { number: 'TS-0001', token: 'demo', fictive: true, status: 'confirmed', party: 2, date: demoDate(), time: '19:30', firstName: 'Camille', lastName: 'Dupont', email: 'camille.dupont@example.com', note: '' }; }
  function demoFind(number, token) {
    var list = demoList();
    if (!list.length && number === 'TS-0001' && token === 'demo') { list = [demoFictive()]; demoSave(list); }
    for (var i = 0; i < list.length; i++) if (list[i].number === number && list[i].token === token) return list[i];
    return null;
  }
  function demoUpdate(res) { var list = demoList().map(function (r) { return r.number === res.number ? res : r; }); demoSave(list); }
  /** Couverts déjà pris en démonstration : réservations faites dans ce navigateur, plus le « coup de feu » simulé. */
  function demoBooked(date, exceptNumber) {
    var out = {};
    demoList().forEach(function (r) { if (r.status === 'confirmed' && r.date === date && r.number !== exceptNumber) out[r.time] = (out[r.time] || 0) + r.party; });
    var rush = readJSON(SS, 'ts-demo-rush', {});
    (rush[date] || []).forEach(function (t) { out[t] = 999; });
    return out;
  }

  /* ---------------------------------------------------------------- Éléments communs */
  function initCommon() {
    if ($('[data-ts-bookbar]')) document.body.classList.add('ts-has-bookbar');
    if (!LIVE) $$('[data-ts-sim]').forEach(function (el) { el.hidden = false; });
    $$('[data-ts-acc] .ts-acc__q').forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute('aria-controls'));
      if (panel) panel.hidden = true;
      btn.addEventListener('click', function () { var open = btn.getAttribute('aria-expanded') === 'true'; btn.setAttribute('aria-expanded', String(!open)); if (panel) panel.hidden = open; });
    });
    // Onglets de la carte : la rubrique visible est signalée (aria-current), le clic fait défiler en douceur.
    $$('[data-ts-menu]').forEach(function (menu) {
      var tabs = $$('.ts-tab', menu);
      if (!tabs.length || !('IntersectionObserver' in window)) return;
      var set = function (id) { tabs.forEach(function (t) { t.setAttribute('aria-current', String(t.getAttribute('href') === '#' + id)); }); };
      var io = new IntersectionObserver(function (entries) { entries.forEach(function (e) { if (e.isIntersecting) set(e.target.id); }); }, { rootMargin: '-35% 0px -55% 0px' });
      tabs.forEach(function (t) { var target = document.getElementById(t.getAttribute('href').slice(1)); if (target) io.observe(target); });
    });
    $$('[data-ts-map-load]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var box = btn.closest('[data-ts-map]'), lat = parseFloat(box.getAttribute('data-lat')), lng = parseFloat(box.getAttribute('data-lng'));
        if (!isFinite(lat) || !isFinite(lng)) return;
        var d = 0.006, f = document.createElement('iframe');
        f.title = T.mapTitle; f.loading = 'lazy'; f.referrerPolicy = 'no-referrer';
        f.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' + [lng - d, lat - d * 0.7, lng + d, lat + d * 0.7].join('%2C') + '&layer=mapnik&marker=' + lat + '%2C' + lng;
        box.appendChild(f); btn.remove();
      });
    });
  }

  /* ---------------------------------------------------------------- Galerie et visionneuse */
  function initGallery(root) {
    var items = $$('.ts-gallery__item', root), box = $('[data-ts-lightbox]', root), count = $('[data-ts-count]', root);
    var img = $('img', box), cap = $('figcaption', box), current = -1, opener = null;
    var visible = function () { return items.filter(function (i) { return !i.hidden; }); };
    $$('.ts-chip', root).forEach(function (chip) {
      chip.addEventListener('click', function () {
        var f = chip.getAttribute('data-filter');
        $$('.ts-chip', root).forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        items.forEach(function (i) { i.hidden = !(f === 'all' || i.getAttribute('data-cat') === f); });
        if (count) count.textContent = visible().length + (EN ? ' photos' : ' photos');
      });
    });
    function show(i) { var v = visible(); if (!v.length) return; current = (i + v.length) % v.length; img.src = v[current].getAttribute('data-full'); img.alt = v[current].getAttribute('data-alt') || ''; cap.textContent = img.alt; }
    function open(item) { opener = item; box.hidden = false; document.body.style.overflow = 'hidden'; show(visible().indexOf(item)); $('[data-ts-close]', box).focus(); }
    function close() { box.hidden = true; document.body.style.overflow = ''; if (opener) opener.focus(); }
    items.forEach(function (item) { item.addEventListener('click', function () { open(item); }); });
    $('[data-ts-close]', box).addEventListener('click', close);
    $('[data-ts-prev]', box).addEventListener('click', function () { show(current - 1); });
    $('[data-ts-next]', box).addEventListener('click', function () { show(current + 1); });
    box.addEventListener('click', function (e) { if (e.target === box || e.target.tagName === 'FIGURE') close(); });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowLeft') show(current - 1);
      else if (e.key === 'ArrowRight') show(current + 1);
      else if (e.key === 'Tab') { var f = $$('button', box); var first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    });
    var x0 = null;
    box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) { if (x0 == null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1)); x0 = null; });
  }

  /* ---------------------------------------------------------------- Formulaires (groupe, contact) */
  function fieldError(field, msg) {
    var wrap = field.closest('.ts-field'), err = wrap && $('.ts-error', wrap);
    field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (wrap) wrap.classList.toggle('is-invalid', !!msg);
    if (err) { err.textContent = msg || ''; err.hidden = !msg; }
    else if (msg && wrap) { err = document.createElement('span'); err.className = 'ts-error'; err.textContent = msg; wrap.appendChild(err); }
  }
  function checkField(f) {
    var v = (f.value || '').trim(), msg = '';
    if (f.required && !v) msg = T.errRequired;
    else if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = T.errEmail;
    else if (f.type === 'tel' && v && !/^[+()\d .-]{6,24}$/.test(v)) msg = T.errPhone;
    else if (f.hasAttribute('data-ts-future') && v && v < core().nowIn(CFG.timezone).date) msg = T.errDate;
    else if (f.type === 'number' && v && f.min && +v < +f.min) msg = T.errInvalid;
    fieldError(f, msg); return !msg;
  }
  function initRequest(wrap) {
    var form = $('form', wrap), kind = wrap.getAttribute('data-ts-request'), status = $('[data-ts-status]', form), btn = $('button[type=submit]', form), busy = false;
    form.noValidate = true;
    var future = $('[data-ts-future]', form); if (future && core()) future.min = core().nowIn(CFG.timezone).date;
    form.addEventListener('submit', function (e) {
      e.preventDefault(); e.stopPropagation();
      var ok = $$('input, select, textarea', form).filter(function (f) { return f.type !== 'hidden'; }).map(checkField).every(Boolean);
      if (!ok || busy) { var bad = $('[aria-invalid="true"]', form); if (bad) bad.focus(); return; }
      var data = {}; new FormData(form).forEach(function (v, k) { var m = k.match(/^contact\[(\w+)\]$/); if (m) data[m[1]] = v; });
      var say = function (cls, msg) { status.className = 'ts-status ts-status--' + cls; status.textContent = msg; status.hidden = false; };
      if (!LIVE) {
        if (kind === 'group' && PAGES.groupSent) { location.href = PAGES.groupSent + '#simulation'; return; }
        say('warn', kind === 'group' ? T.groupDemo : T.sentDemo); form.reset(); return;
      }
      busy = true; btn.disabled = true;
      api('/requests', { method: 'POST', body: Object.assign({ kind: kind }, data) }).then(function (r) {
        if (r.status === 201) { if (kind === 'group' && PAGES.groupSent) location.href = PAGES.groupSent; else { say('ok', T.sentLive); form.reset(); } }
        else say('err', T.requestFailed);
      }).catch(function () { say('err', T.requestFailed); }).then(function () { busy = false; btn.disabled = false; });
    });
  }
  /** Page « demande reçue » ouverte depuis la démonstration : la simulation est écrite noir sur blanc. */
  function initGroupSent() {
    if (location.hash !== '#simulation') return;
    var hero = $('.ts-hero--fade .ts-hero__content'); if (!hero) return;
    var p = document.createElement('p'); p.className = 'ts-demo-flag'; p.textContent = T.groupDemo; hero.insertBefore(p, hero.firstChild);
  }

  /* ---------------------------------------------------------------- Cookies */
  var CONSENT_KEY = 'ts-consent';
  function applyConsent(c) {
    // Traceurs facultatifs : <script type="text/plain" data-ts-consent="stats"> n'est exécuté qu'après accord.
    $$('script[type="text/plain"][data-ts-consent]').forEach(function (s) {
      if (!c || !c[s.getAttribute('data-ts-consent')] || s.dataset.tsDone) return;
      var x = document.createElement('script'); if (s.src) x.src = s.src; else x.textContent = s.textContent; s.dataset.tsDone = '1'; s.parentNode.insertBefore(x, s.nextSibling);
    });
    try { document.dispatchEvent(new CustomEvent('ts:consent', { detail: c })); } catch (e) { /* navigateur ancien */ }
  }
  function initCookies(el) {
    var saved = readJSON(LS, CONSENT_KEY, null);
    window.TableSaisonConsent = { get: function () { return readJSON(LS, CONSENT_KEY, null); }, reset: function () { try { LS && LS.removeItem(CONSENT_KEY); } catch (e) { /* rien */ } el.hidden = false; } };
    if (saved) { applyConsent(saved); return; }
    el.hidden = false;
    var decide = function (stats) { var c = { necessary: true, stats: !!stats, at: new Date().toISOString() }; writeJSON(LS, CONSENT_KEY, c); el.hidden = true; applyConsent(c); };
    $('[data-ts-cookies-accept]', el).addEventListener('click', function () { decide(true); });
    $('[data-ts-cookies-refuse]', el).addEventListener('click', function () { decide(false); });
    var toggle = $('[data-ts-cookies-custom]', el), prefs = document.getElementById(toggle.getAttribute('aria-controls'));
    toggle.addEventListener('click', function () { var open = toggle.getAttribute('aria-expanded') === 'true'; toggle.setAttribute('aria-expanded', String(!open)); prefs.hidden = open; });
    $('[data-ts-cookies-save]', el).addEventListener('click', function () { decide($('[data-ts-cookies-stats]', el).checked); });
  }

  /* ---------------------------------------------------------------- Réservation */
  function initBooking(root) {
    var C = core(), R = rules(), section = root;
    var draft = Object.assign({ party: Math.min(Math.max(2, R.minParty), R.maxParty), date: '', time: '', idem: '', contact: {} }, readJSON(SS, 'ts-draft', {}));
    var today = C.nowIn(R.timezone).date;
    if (draft.date && C.dateStatus(R, draft.date) !== 'open') { draft.date = ''; draft.time = ''; }
    var view = { y: 0, m: 0 }, lastConfirmed = readJSON(SS, 'ts-last-confirmation', null);
    (function () { var first = today; for (var i = 0; i < 400 && C.dateStatus(R, first) !== 'open'; i++) first = C.addDays(first, 1); var base = draft.date || first; view.y = +base.slice(0, 4); view.m = +base.slice(5, 7); })();
    function save() { writeJSON(SS, 'ts-draft', draft); }
    function out(name, value) { $$('[data-ts-out="' + name + '"]', section).forEach(function (el) { el.textContent = value; }); }
    function refreshOut() {
      out('party', partyText(draft.party)); out('date', draft.date ? dateText(draft.date) : T.chooseDate); out('time', draft.time ? timeText(draft.time) : T.chooseTime);
      out('address', CFG.address || '');
    }
    var steps = ['1', '2', '3', 'unavailable', 'confirm'], heroes = { '1': 'step1', '2': 'step2', '3': 'step3', unavailable: 'unavailable', confirm: 'confirm' };
    function show(step, focus) {
      if ((step === '2' || step === '3') && !draft.date) step = '1';
      if (step === '3' && !draft.time) step = '2';
      if (step === 'confirm' && !lastConfirmed) step = '1';
      section.setAttribute('data-step', step);
      steps.forEach(function (s) { var p = $('[data-ts-pane="' + s + '"]', section); if (p) p.hidden = s !== step; });
      $$('[data-ts-hero]', section).forEach(function (h) { h.hidden = h.getAttribute('data-ts-hero') !== heroes[step]; });
      if (step === '1') renderStep1();
      if (step === '2') renderStep2();
      if (step === '3') renderStep3();
      if (step === 'confirm') renderConfirm();
      var hash = step === 'unavailable' ? '#indisponible' : step === 'confirm' ? '#confirmation' : '#etape-' + step;
      if (location.hash !== hash) history.replaceState(null, '', hash);
      if (focus) { var pane = $('[data-ts-pane="' + step + '"]', section); if (pane) { pane.focus({ preventScroll: true }); section.scrollIntoView({ block: 'start' }); } }
    }
    function go(step) { if (location.hash !== (step === 'unavailable' ? '#indisponible' : step === 'confirm' ? '#confirmation' : '#etape-' + step)) history.pushState(null, '', step === 'unavailable' ? '#indisponible' : step === 'confirm' ? '#confirmation' : '#etape-' + step); show(step, true); }
    window.addEventListener('popstate', function () { show(fromHash(), true); });
    function fromHash() { var h = location.hash; return h === '#indisponible' ? 'unavailable' : h === '#confirmation' ? 'confirm' : (h.match(/^#etape-([123])$/) || [])[1] || '1'; }

    // Étape 1 : personnes (boutons sur ordinateur, + / − sur téléphone) et calendrier.
    var partyBox = $('[data-ts-party]', section);
    for (var n = R.minParty; n <= Math.min(R.maxParty, R.minParty + 7); n++) (function (k) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = k; b.setAttribute('aria-label', partyText(k));
      b.addEventListener('click', function () { setParty(k); }); partyBox.appendChild(b);
    })(n);
    $('[data-ts-less]', section).addEventListener('click', function () { setParty(draft.party - 1); });
    $('[data-ts-more]', section).addEventListener('click', function () { setParty(draft.party + 1); });
    function setParty(k) { k = Math.max(R.minParty, Math.min(R.maxParty, k)); if (k !== draft.party) { draft.party = k; draft.time = ''; } save(); renderStep1(); }
    var cal = $('[data-ts-cal]', section), headRow = $('thead tr', cal), body = $('tbody', cal);
    C.DAYS_SHORT[EN ? 'en' : 'fr'].forEach(function (d) { var th = document.createElement('th'); th.scope = 'col'; th.textContent = d; headRow.appendChild(th); });
    $('[data-ts-prev-month]', section).addEventListener('click', function () { view.m--; if (view.m < 1) { view.m = 12; view.y--; } renderCal(); });
    $('[data-ts-next-month]', section).addEventListener('click', function () { view.m++; if (view.m > 12) { view.m = 1; view.y++; } renderCal(); });
    function renderCal() {
      $('[data-ts-month]', section).textContent = C.monthLabel(view.y, view.m, EN ? 'en' : 'fr');
      var firstOfMonth = view.y + '-' + String(view.m).padStart(2, '0') + '-01';
      $('[data-ts-prev-month]', section).disabled = firstOfMonth <= today.slice(0, 8) + '01';
      $('[data-ts-next-month]', section).disabled = C.dateStatus(R, firstOfMonth) === 'beyond';
      body.innerHTML = '';
      var cells = C.monthGrid(view.y, view.m), tr;
      cells.forEach(function (d, i) {
        if (i % 7 === 0) { tr = document.createElement('tr'); body.appendChild(tr); }
        var td = document.createElement('td'); tr.appendChild(td);
        if (!d) return;
        var st = C.dateStatus(R, d), b = document.createElement('button');
        b.type = 'button'; b.textContent = +d.slice(8); b.setAttribute('data-date', d);
        b.setAttribute('aria-label', dateText(d) + (st === 'open' ? '' : ' — ' + (st === 'past' ? T.past : T.closed)));
        b.setAttribute('aria-pressed', String(d === draft.date));
        if (d === today) b.classList.add('is-today');
        if (st !== 'open') b.disabled = true;
        b.tabIndex = d === (draft.date || '') ? 0 : -1;
        b.addEventListener('click', function () { draft.date = d; draft.time = ''; save(); renderStep1(); var again = $('[data-date="' + d + '"]', body); if (again) again.focus(); });
        td.appendChild(b);
      });
      var enabled = $$('button:not([disabled])', body);
      if (enabled.length && !$('button[tabindex="0"]', body)) enabled[0].tabIndex = 0;
    }
    // Clavier dans le calendrier : flèches (jour, semaine), Début / Fin.
    body.addEventListener('keydown', function (e) {
      var keys = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
      if (!(e.key in keys) && e.key !== 'Home' && e.key !== 'End') return;
      var all = $$('button', body), i = all.indexOf(document.activeElement); if (i < 0) return;
      e.preventDefault();
      var target = e.key === 'Home' ? all[0] : e.key === 'End' ? all[all.length - 1] : null;
      if (!target) { var cur = all[i].getAttribute('data-date'), want = C.addDays(cur, keys[e.key]); target = $('[data-date="' + want + '"]', body); }
      if (target) { all.forEach(function (b) { b.tabIndex = -1; }); target.tabIndex = 0; target.focus(); }
    });
    function renderStep1() {
      $$('button', partyBox).forEach(function (b) { b.setAttribute('aria-pressed', String(+b.textContent === draft.party)); });
      $('[data-ts-party-out]', section).textContent = partyText(draft.party);
      $('[data-ts-less]', section).disabled = draft.party <= R.minParty; $('[data-ts-more]', section).disabled = draft.party >= R.maxParty;
      renderCal(); refreshOut();
    }
    function err(step, msg) { var e = $('[data-ts-error="' + step + '"]', section); if (e) { e.textContent = msg || ''; e.hidden = !msg; } }
    $$('[data-ts-next="2"]', section).forEach(function (b) { b.addEventListener('click', function () { if (!draft.date) { err('1', T.errDate); return; } err('1', ''); go('2'); }); });
    $$('[data-ts-next="3"]', section).forEach(function (b) { b.addEventListener('click', function () { if (!draft.time) { err('2', T.errTime); return; } err('2', ''); go('3'); }); });
    $$('[data-ts-goto]', section).forEach(function (b) { b.addEventListener('click', function () { go(b.getAttribute('data-ts-goto')); }); });

    // Étape 2 : services et horaires (démonstration : calcul local ; service réel : disponibilité du serveur).
    var services = $('[data-ts-services]', section), reqId = 0;
    function slotsLocal() { return C.slotsFor(R, draft.date, draft.party, demoBooked(draft.date)); }
    function renderServices(list) {
      services.innerHTML = '';
      var any = false;
      list.forEach(function (svc) {
        var wrap = document.createElement('div'); wrap.className = 'ts-service';
        var h = document.createElement('h3'); h.className = 'ts-title'; h.textContent = svc.label; wrap.appendChild(h);
        var row = document.createElement('div'); row.className = 'ts-slots'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', svc.label);
        svc.slots.forEach(function (sl) {
          var b = document.createElement('button'); b.type = 'button'; b.textContent = timeText(sl.time);
          b.setAttribute('aria-pressed', String(sl.time === draft.time));
          if (!sl.available) { b.disabled = true; b.setAttribute('aria-label', timeText(sl.time) + ' — ' + (sl.reason === 'full' ? T.full : T.past)); if (sl.time === draft.time) draft.time = ''; }
          else any = true;
          b.addEventListener('click', function () { draft.time = sl.time; save(); $$('button', services).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); refreshOut(); err('2', ''); });
          row.appendChild(b);
        });
        wrap.appendChild(row); services.appendChild(wrap);
      });
      if (!any) { var p = document.createElement('p'); p.className = 'ts-slots__empty'; p.textContent = T.noSlot; services.appendChild(p); }
      save(); refreshOut();
    }
    function renderStep2() {
      refreshOut();
      if (!LIVE) { renderServices(slotsLocal()); return; }
      var id = ++reqId; services.setAttribute('aria-busy', 'true');
      api('/availability?date=' + encodeURIComponent(draft.date) + '&party=' + draft.party).then(function (r) {
        if (id !== reqId) return; services.removeAttribute('aria-busy');
        if (r.status === 200) renderServices(r.data.services || []); else { services.innerHTML = ''; err('2', T.errServer); }
      }).catch(function () { if (id === reqId) { services.removeAttribute('aria-busy'); err('2', T.errServer); } });
    }

    // Étape 3 : coordonnées, validation, confirmation protégée contre les doubles clics (clé d'envoi unique).
    var form = $('[data-ts-contact-form]', section), confirmBtn = $('[data-ts-confirm]', section), busy = false;
    function renderStep3() {
      refreshOut();
      if (!draft.idem) { draft.idem = uid(); save(); }
      ['firstName', 'lastName', 'email', 'phone', 'note'].forEach(function (k) { var f = form.elements[k]; if (f && draft.contact[k] != null && !f.value) f.value = draft.contact[k]; });
      if (form.elements.newsletter) form.elements.newsletter.checked = !!draft.contact.newsletter;
      var note = $('[data-ts-demo-note]', section); if (note) note.hidden = LIVE;
    }
    form.addEventListener('input', function (e) { var f = e.target; if (!f.name) return; draft.contact[f.name] = f.type === 'checkbox' ? f.checked : f.value; if (f.name !== 'terms') save(); if (f.getAttribute('aria-invalid') === 'true') checkField(f); });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (busy) return;
      var ok = ['firstName', 'lastName', 'email', 'phone'].map(function (k) { return checkField(form.elements[k]); }).every(Boolean);
      var terms = form.elements.terms, te = $('[data-ts-terms-error]', form);
      if (!terms.checked) { ok = false; te.textContent = T.errTerms; te.hidden = false; terms.setAttribute('aria-invalid', 'true'); } else { te.hidden = true; terms.removeAttribute('aria-invalid'); }
      if (!ok) { var bad = $('[aria-invalid="true"]', form); if (bad) bad.focus(); return; }
      var contact = { firstName: form.elements.firstName.value.trim(), lastName: form.elements.lastName.value.trim(), email: form.elements.email.value.trim(), phone: form.elements.phone.value.trim(), note: form.elements.note.value.trim(), newsletter: form.elements.newsletter.checked, terms: true };
      busy = true; confirmBtn.disabled = true; confirmBtn.setAttribute('aria-busy', 'true'); err('3', '');
      var done = function () { busy = false; confirmBtn.disabled = false; confirmBtn.removeAttribute('aria-busy'); };
      if (!LIVE) { setTimeout(function () { demoConfirm(contact); done(); }, 350); return; }
      api('/reservations', { method: 'POST', body: Object.assign({ party: draft.party, date: draft.date, time: draft.time, idem: draft.idem }, contact) }).then(function (r) {
        if (r.status === 201 || (r.status === 200 && r.data.reservation)) { finish({ number: r.data.reservation.number, token: r.data.token, party: r.data.reservation.party, date: r.data.reservation.date, time: r.data.reservation.time, email: contact.email, emailState: r.data.email }); }
        else if (r.status === 409 && r.data.error === 'unavailable') unavailable(r.data.alternatives || []);
        else if (r.status === 409 && r.data.error === 'duplicate') err('3', T.errDuplicate);
        else if (r.status === 400) err('3', T.errInvalid);
        else err('3', T.errServer);
      }).catch(function () { err('3', T.errServer); }).then(done);
    });
    function demoConfirm(contact) {
      // Scénario de démonstration : au premier essai, 19:30 vient d'être pris par un autre convive (ainsi que 20:30).
      var rush = readJSON(SS, 'ts-demo-rush', {}), conflictTried = readJSON(SS, 'ts-demo-conflict', false);
      if (draft.time === '19:30' && !conflictTried) {
        rush[draft.date] = ['19:30', '20:30']; writeJSON(SS, 'ts-demo-rush', rush); writeJSON(SS, 'ts-demo-conflict', true);
      }
      var booked = demoBooked(draft.date), errors = C.validate(R, { party: draft.party, date: draft.date, time: draft.time }, booked);
      if (errors.some(function (x) { return /^slot_/.test(x); })) {
        unavailable(C.slotsFor(R, draft.date, draft.party, booked).map(function (s) { return { id: s.id, label: s.label, times: s.slots.filter(function (x) { return x.available; }).map(function (x) { return x.time; }) }; }).filter(function (s) { return s.times.length; }));
        return;
      }
      var list = demoList(), prev = list.filter(function (r) { return r.idem === draft.idem; })[0];
      if (prev) { finish(Object.assign({}, prev, { emailState: 'demo' })); return; }
      var res = { number: 'TS-' + String(list.length + 1).padStart(4, '0'), token: uid(), idem: draft.idem, status: 'confirmed', party: draft.party, date: draft.date, time: draft.time, firstName: contact.firstName, lastName: contact.lastName, email: contact.email, phone: contact.phone, note: contact.note };
      list.push(res); demoSave(list);
      finish(Object.assign({}, res, { emailState: 'demo' }));
    }
    var chosenAlt = '';
    function unavailable(alts) {
      var wanted = draft.time, box = $('[data-ts-alternatives]', section), none = $('[data-ts-no-alt]', section), cont = $('[data-ts-continue-alt]', section);
      $('[data-ts-unavailable-text]', section).textContent = fmt(T.unavailableText, { time: timeText(wanted) });
      var heroText = $('[data-ts-hero="unavailable"] .ts-hero__text', section);
      if (heroText && !heroText.dataset.base) heroText.dataset.base = heroText.textContent;
      draft.time = ''; save();
      var same = alts.filter(function (a) { return R.services.some(function (s) { return s.id === a.id && s.slots.indexOf(wanted) >= 0; }); })[0] || alts[0];
      $('[data-ts-alt-title]', section).textContent = same ? fmt(T.altTitle, { service: same.label }) : '';
      box.innerHTML = ''; chosenAlt = '';
      (same ? same.times : []).forEach(function (t, i) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = timeText(t); b.setAttribute('aria-pressed', String(i === 0));
        if (i === 0) chosenAlt = t;
        b.addEventListener('click', function () { chosenAlt = t; $$('button', box).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); }); cont.textContent = fmt(T.continueWith, { time: timeText(t) }); });
        box.appendChild(b);
      });
      none.hidden = !!chosenAlt; cont.hidden = !chosenAlt;
      if (chosenAlt) cont.textContent = fmt(T.continueWith, { time: timeText(chosenAlt) });
      go('unavailable');
    }
    $('[data-ts-continue-alt]', section).addEventListener('click', function () { if (!chosenAlt) return; draft.time = chosenAlt; save(); go('3'); });
    function finish(res) {
      lastConfirmed = res; writeJSON(SS, 'ts-last-confirmation', res);
      draft = { party: draft.party, date: '', time: '', idem: '', contact: {} }; save();
      form.reset(); go('confirm');
    }
    function renderConfirm() {
      var r = lastConfirmed;
      out('number', r.number); out('party', partyText(r.party)); out('when', dateText(r.date) + ' ' + T.at + ' ' + timeText(r.time)); out('address', CFG.address || '');
      out('email-state', r.emailState === 'demo' ? fmt(T.demoEmail, { email: r.email }) : r.emailState === 'sent' ? fmt(T.emailSent, { email: r.email }) : r.emailState === 'not_configured' ? T.emailOff : r.emailState === 'failed' ? T.emailFailed : '');
      $('[data-ts-confirm-note]', section).textContent = LIVE ? T.liveNote : T.demoNote;
      var link = $('[data-ts-manage-link]', section); if (link && r.token) link.href = (PAGES.manage || link.getAttribute('href').split('#')[0]) + '#r=' + encodeURIComponent(r.number) + '&t=' + encodeURIComponent(r.token);
    }
    $('[data-ts-ics]', section).addEventListener('click', function () {
      var r = lastConfirmed; if (!r) return;
      var text = C.ics(r, { timezone: R.timezone, summary: T.icsSummary + ' — ' + (CFG.restaurant || ''), location: CFG.address || CFG.restaurant || '', description: r.number + ' — ' + partyText(r.party) });
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' })); a.download = (r.number || 'reservation') + '.ics';
      document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    });
    refreshOut();
    show(fromHash(), false);
  }

  /* ---------------------------------------------------------------- Gestion d'une réservation */
  function parseAccess() { var m = location.hash.match(/r=([^&]+)&t=([^&]+)/); return m ? { number: decodeURIComponent(m[1]), token: decodeURIComponent(m[2]) } : null; }
  function accessHash(a) { return '#r=' + encodeURIComponent(a.number) + '&t=' + encodeURIComponent(a.token); }
  function loadReservation(access) {
    if (!LIVE) {
      var a = access || { number: 'TS-0001', token: 'demo' };
      if (!access) { var list = demoList(); if (list.length) a = { number: list[list.length - 1].number, token: list[list.length - 1].token }; }
      var r = demoFind(a.number, a.token);
      return Promise.resolve(r ? { res: r, access: a } : null);
    }
    if (!access) return Promise.resolve(null);
    return api('/reservations/' + encodeURIComponent(access.number), { token: access.token }).then(function (x) { return x.status === 200 ? { res: x.data.reservation, access: access } : null; });
  }
  function initManage(root) {
    var view = root.getAttribute('data-ts-manage'), status = $('[data-ts-status]', root);
    var say = function (msg, cls) { if (!status) return; status.textContent = msg; status.className = 'ts-status ts-status--' + (cls || 'warn'); status.hidden = !msg; };
    var outs = function (name, v) { $$('[data-ts-out="' + name + '"]', root).forEach(function (el) { el.textContent = v; }); };
    if (view === 'lookup') {
      var form = $('[data-ts-lookup]', root), st = $('[data-ts-status]', form), btn = $('button', form), busy = false;
      form.addEventListener('submit', function (e) {
        e.preventDefault(); e.stopPropagation();
        if (!checkField(form.elements.email) || busy) return;
        if (!LIVE) {
          var list = demoList(), last = list.length ? list[list.length - 1] : demoFictive();
          st.className = 'ts-status ts-status--warn'; st.hidden = false; st.textContent = T.lookupDemo + ' ';
          var a = document.createElement('a'); a.href = (PAGES.manage || '') + accessHash({ number: last.number, token: last.token }); a.textContent = fmt(T.lookupOpen, { n: last.number }); st.appendChild(a);
          return;
        }
        busy = true; btn.disabled = true;
        api('/reservations/lookup', { method: 'POST', body: { email: form.elements.email.value.trim() } }).then(function () { st.className = 'ts-status ts-status--ok'; st.textContent = T.lookupNeutral; st.hidden = false; })
          .catch(function () { st.className = 'ts-status ts-status--err'; st.textContent = T.errServer; st.hidden = false; }).then(function () { busy = false; btn.disabled = false; });
      });
      return;
    }
    var access = parseAccess(), state = null;
    var dialog = $('[data-ts-cancel-dialog]', root), opener = null;
    function openDialog(btn) { opener = btn; dialog.hidden = false; $('[data-ts-cancel-confirm]', dialog).focus(); }
    function closeDialog() { dialog.hidden = true; if (opener) opener.focus(); }
    $$('[data-ts-cancel-close]', dialog).forEach(function (b) { b.addEventListener('click', closeDialog); });
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDialog();
      if (e.key === 'Tab') { var f = $$('button', dialog).filter(function (b) { return b.offsetParent; }); var first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    });
    $$('[data-ts-cancel-open]', root).forEach(function (b) { b.addEventListener('click', function () { if (state && state.res.status === 'confirmed') openDialog(b); }); });
    $('[data-ts-cancel-confirm]', dialog).addEventListener('click', function () {
      var btn = this; if (!state || btn.disabled) return; btn.disabled = true;
      var finish = function (res) { state.res = res; closeDialog(); render(); say(T.canceledDone, 'ok'); };
      if (!LIVE) { var r = Object.assign({}, state.res, { status: 'canceled' }); demoUpdate(r); finish(r); btn.disabled = false; return; }
      api('/reservations/' + encodeURIComponent(state.access.number) + '/cancel', { method: 'POST', token: state.access.token, body: {} }).then(function (x) { if (x.status === 200) finish(x.data.reservation); else say(T.errServer, 'err'); }).catch(function () { say(T.errServer, 'err'); }).then(function () { btn.disabled = false; });
    });
    function render() {
      var r = state.res, canceled = r.status !== 'confirmed';
      var ref = $('[data-ts-ref]', root); if (ref) ref.textContent = (EN ? 'Booking no. ' : 'Réservation n° ') + r.number;
      outs('party', partyText(r.party)); outs('date', dateText(r.date)); outs('time', timeText(r.time));
      outs('status', canceled ? T.canceled : T.confirmed); $$('.ts-badge', root).forEach(function (b) { b.classList.toggle('ts-badge--canceled', canceled); });
      outs('email', r.emailMasked || core().maskEmail(r.email)); outs('note', r.note ? r.note : T.noPref); outs('address', CFG.address || '');
      var actions = $('[data-ts-actions]', root); if (actions) actions.hidden = canceled;
      var noteBtn = $('[data-ts-note-open]', root); if (noteBtn) noteBtn.hidden = canceled;
      var mod = $('[data-ts-modify-link]', root); if (mod) mod.href = (PAGES.modify || mod.getAttribute('href').split('#')[0]) + accessHash(state.access);
      var back = $('[data-ts-back-res]', root); if (back) back.href = (PAGES.manage || back.getAttribute('href').split('#')[0]) + accessHash(state.access);
      if (view === 'modify') renderModify();
    }
    // Préférences (remarque) depuis la page détail.
    var noteOpen = $('[data-ts-note-open]', root), noteForm = $('[data-ts-note-form]', root);
    if (noteOpen && noteForm) {
      noteOpen.addEventListener('click', function () { noteForm.hidden = !noteForm.hidden; if (!noteForm.hidden) { noteForm.elements.note.value = state ? state.res.note || '' : ''; noteForm.elements.note.focus(); } });
      noteForm.addEventListener('submit', function (e) {
        e.preventDefault(); e.stopPropagation(); if (!state) return;
        var note = noteForm.elements.note.value.trim();
        var apply = function (res) { state.res = res; noteForm.hidden = true; render(); say(LIVE ? T.saved : T.savedDemo, 'ok'); };
        if (!LIVE) { var r = Object.assign({}, state.res, { note: note }); demoUpdate(r); apply(r); return; }
        api('/reservations/' + encodeURIComponent(state.access.number) + '/modify', { method: 'POST', token: state.access.token, body: { note: note } }).then(function (x) { if (x.status === 200) apply(x.data.reservation); else say(T.errServer, 'err'); }).catch(function () { say(T.errServer, 'err'); });
      });
    }
    // Modification : personnes, date, heure ; les heures proposées sont recalculées (sans compter cette réservation).
    var mform = $('[data-ts-modify]', root), C = core(), R = rules();
    function renderModify() {
      var r = state.res, party = $('[data-ts-m-party]', root), date = $('[data-ts-m-date]', root);
      if (!party.options.length) for (var n = R.minParty; n <= R.maxParty; n++) { var o = document.createElement('option'); o.value = n; o.textContent = partyText(n); party.appendChild(o); }
      if (!mform.dataset.ready) { party.value = r.party; date.value = r.date; date.min = C.nowIn(R.timezone).date; date.max = C.addDays(date.min, R.horizonDays); mform.dataset.ready = '1'; fillTimes(r.time); }
      var canceled = r.status !== 'confirmed';
      $$('input, select, button[type=submit]', mform).forEach(function (f) { f.disabled = canceled; });
      if (canceled) say(T.canceledAlready);
    }
    function fillTimes(keep) {
      var time = $('[data-ts-m-time]', root), party = +$('[data-ts-m-party]', root).value, date = $('[data-ts-m-date]', root).value;
      var apply = function (list) {
        time.innerHTML = '';
        list.forEach(function (svc) { var g = document.createElement('optgroup'); g.label = svc.label; svc.slots.forEach(function (sl) { var o = document.createElement('option'); o.value = sl.time; o.textContent = timeText(sl.time) + (sl.available ? '' : ' — ' + (sl.reason === 'full' ? T.full : T.past)); o.disabled = !sl.available; g.appendChild(o); }); time.appendChild(g); });
        var opts = $$('option', time).filter(function (o) { return !o.disabled; });
        var pick = opts.filter(function (o) { return o.value === keep; })[0] || opts[0];
        if (pick) time.value = pick.value;
        summary();
      };
      if (!date || C.dateStatus(R, date) !== 'open') { apply([]); return; }
      if (!LIVE) apply(C.slotsFor(R, date, party, demoBooked(date, state.res.number)));
      else api('/availability?date=' + encodeURIComponent(date) + '&party=' + party).then(function (x) { apply(x.status === 200 ? x.data.services || [] : []); }).catch(function () { apply([]); });
    }
    function summary() {
      var r = state.res, f = { party: +$('[data-ts-m-party]', root).value, date: $('[data-ts-m-date]', root).value, time: $('[data-ts-m-time]', root).value };
      var parts = [partyText(f.party), f.date ? dateText(f.date) : '—', f.time ? timeText(f.time) : '—'].join('  |  ');
      var changes = [];
      if (f.time && f.time !== r.time) changes.push(fmt(T.insteadOf, { time: timeText(r.time) }));
      if (f.date && f.date !== r.date && !changes.length) changes.push(fmt(T.insteadOf, { time: dateText(r.date) }));
      if (f.party !== r.party && !changes.length) changes.push(fmt(T.insteadOf, { time: partyText(r.party) }));
      var el = $('[data-ts-m-summary]', root); el.innerHTML = '';
      el.appendChild(document.createTextNode(parts)); el.appendChild(document.createElement('br'));
      el.appendChild(document.createTextNode(changes.length ? changes[0] : T.unchanged));
    }
    if (mform) {
      $('[data-ts-m-party]', root).addEventListener('change', function () { fillTimes($('[data-ts-m-time]', root).value); });
      $('[data-ts-m-date]', root).addEventListener('change', function () { fillTimes($('[data-ts-m-time]', root).value); });
      $('[data-ts-m-time]', root).addEventListener('change', summary);
      mform.addEventListener('submit', function (e) {
        e.preventDefault(); e.stopPropagation(); if (!state || state.res.status !== 'confirmed') return;
        var f = { party: +$('[data-ts-m-party]', root).value, date: $('[data-ts-m-date]', root).value, time: $('[data-ts-m-time]', root).value };
        if (!f.time || C.dateStatus(R, f.date) !== 'open') { say(T.errTime, 'err'); return; }
        var btn = $('button[type=submit]', mform); btn.disabled = true;
        var done = function (res) { state.res = res; mform.dataset.ready = ''; render(); say(LIVE ? T.saved : T.savedDemo, 'ok'); };
        if (!LIVE) {
          var errors = C.validate(R, f, demoBooked(f.date, state.res.number));
          if (errors.length) { say(errors.some(function (x) { return /^slot_/.test(x); }) ? T.noSlot : T.errInvalid, 'err'); btn.disabled = false; fillTimes(''); return; }
          var r = Object.assign({}, state.res, f); demoUpdate(r); done(r); btn.disabled = false; return;
        }
        api('/reservations/' + encodeURIComponent(state.access.number) + '/modify', { method: 'POST', token: state.access.token, body: f }).then(function (x) {
          if (x.status === 200) done(x.data.reservation);
          else if (x.status === 409 && x.data.error === 'unavailable') { say(T.noSlot, 'err'); fillTimes(''); }
          else say(x.status === 409 ? T.canceledAlready : T.errServer, 'err');
        }).catch(function () { say(T.errServer, 'err'); }).then(function () { btn.disabled = false; });
      });
    }
    loadReservation(access).then(function (found) {
      var bodyEl = $('[data-ts-res-body]', root) || mform;
      if (!found) { if (bodyEl) bodyEl.hidden = true; say(access ? T.notFound : T.noAccess); if (!access && PAGES.lookup) { var a = document.createElement('a'); a.href = PAGES.lookup; a.textContent = ' → ' + (EN ? 'Find my booking' : 'Retrouver ma réservation'); status.appendChild(a); } return; }
      state = found;
      if (!LIVE) say(T.demoReservation);
      render();
    }).catch(function () { say(T.errServer, 'err'); });
  }

  function init() {
    if (!window.TableSaisonCore) { setTimeout(init, 30); return; }
    initCommon();
    $$('[data-ts-gallery]').forEach(initGallery);
    $$('[data-ts-request]').forEach(initRequest);
    $$('[data-ts-booking]').forEach(initBooking);
    $$('[data-ts-manage]').forEach(initManage);
    var cookies = $('[data-ts-cookies]'); if (cookies) initCookies(cookies);
    initGroupSent();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
