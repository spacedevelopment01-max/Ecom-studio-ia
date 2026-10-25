/*
 * ATELIER NUANCE — interactions du thème salon de coiffure (issue #177).
 *  - Source unique : prix et durées des prestations relus dans « Réglages du salon » (#an-config) partout.
 *  - Prise de rendez-vous en cinq étapes, créneau pris entre-temps, confirmation (ICS), retrouver un rendez-vous,
 *    espace client (rendez-vous, informations, préférences), déplacement et annulation.
 *  - Deux fonctionnements, jamais confondus : « demo » (simulation dans ce navigateur, annoncée, aucun e-mail) et
 *    « live » (service réel du studio : disponibilités vérifiées par le serveur, accès par lien sécurisé).
 *  - Filtres, visionneuse accessible, accordéons, carrousel, choix de la longueur, formulaires, cookies.
 */
(function () {
  'use strict';
  var EN = /^en/i.test(document.documentElement.lang || '');
  var LANG = EN ? 'en' : 'fr';
  var T = EN ? {
    noPref: 'No preference', noPrefText: 'Our team welcomes you according to availability.', assigned: 'assigned', notForService: 'Does not offer this service',
    with: 'With {name}', withAny: 'No preference (assigned at confirmation)', at: 'at', minutes: 'minutes', from: 'From',
    prevMonth: 'Previous month', nextMonth: 'Next month', closed: 'Closed', full: 'Fully booked', past: 'Past',
    errService: 'Choose a service to continue.', errTime: 'Choose a date and a time to continue.', errRequired: 'This field is required.', errEmail: 'Enter a valid e-mail address.', errPhone: 'Enter a valid phone number.', errTerms: 'Please accept the booking terms.', errForm: 'Some information is missing: see the highlighted fields.',
    sending: 'Confirming…', errServer: 'The booking service could not be reached. Nothing has been booked and your details are kept: please try again.', errInvalid: 'Some information is missing or incorrect.', errDuplicate: 'An appointment already exists for this e-mail address at this time.', errRate: 'Too many attempts. Please wait a few minutes.',
    conflictText: 'The {date} at {time} slot has just been booked by another client.', conflictSub: 'Here are other times available on {date}:', conflictNone: 'No other time is available that day: see other dates.',
    demoState: 'Simulation — no real appointment: nothing was recorded outside this browser and no e-mail was sent.', liveSent: 'A summary e-mail has been sent to {email}.', liveOff: 'No e-mail was sent (e-mail is not set up by the salon): keep your reference.', liveFailed: 'The summary e-mail could not be sent. Your appointment is recorded: keep your reference.',
    refDemo: 'Demonstration reference', ref: 'Reference', icsSummary: 'Hair appointment', step: 'Step {n} of 5: {label}',
    sameLength: 'Same price whatever the length.', lengthNote: 'Price and duration set by the salon for this length.',
    sentDemo: 'Simulation: the message has been checked but sent to no one.', sentLive: 'Message received by the salon. Thank you!', sentFailed: 'The message could not be sent. Please try again later.', sendingMsg: 'Sending…',
    lookupDemoOk: 'Simulation: with the real service, a secure link would be sent to this address. Opening the demonstration appointment…', lookupDemoNo: 'No demonstration appointment matches. Try AN-0001 with julie.martin@example.com (fictitious data).', lookupNeutral: 'If this information matches an appointment, an access link has just been sent to this address.', errRef: 'Enter the reference received when booking.',
    loginDemo: 'Simulation: with the real service, a sign-in link would be sent. Opening the demonstration area…', loginNeutral: 'If an account matches this address, a secure sign-in link has just been sent to it.', registerNeutral: 'Your account has been requested: a secure link has just been sent to this address to open it.',
    registerTitle: 'Create an account', registerText: 'Enter your first name and e-mail address: you will receive a secure link to open your client area. No password to remember.', registerSubmit: 'Create my account', loginSwitch: 'Already have an account? Sign in', registerSwitch: 'No account yet? Create an account',
    move: 'Move', cancel: 'Cancel', canceled: 'Canceled', done: 'Completed', minutesLong: 'minutes', durationLine: 'Appointment duration: {d}', priceLine: 'Price: {p}', availableOn: 'Availability on {date}',
    movedDemo: 'Simulation: appointment moved in this browser only. New time: {when}.', movedLive: 'New time: {when}. The previous time has been released.', canceledDemo: 'Simulation: appointment canceled in this browser only.', canceledLive: 'Your appointment has been canceled.', noChange: 'This appointment can no longer be moved or canceled online: please contact the salon.', chooseNew: 'Choose a new time.',
    errScope: 'To change your details, open the secure link received by e-mail (or sign in from “Find my appointment”).', saved: 'Saved.', savedDemo: 'Simulation: saved in this browser only.', anyStaff: 'No preference', mapTitle: 'Salon map', loggedOut: 'You are signed out.'
  } : {
    noPref: 'Sans préférence', noPrefText: 'Notre équipe vous accueille selon les disponibilités.', assigned: 'attribué(e)', notForService: 'Ne réalise pas cette prestation',
    with: 'Avec {name}', withAny: 'Sans préférence (attribution à la confirmation)', at: 'à', minutes: 'minutes', from: 'À partir de',
    prevMonth: 'Mois précédent', nextMonth: 'Mois suivant', closed: 'Fermé', full: 'Complet', past: 'Passé',
    errService: 'Choisissez une prestation pour continuer.', errTime: 'Choisissez une date et un horaire pour continuer.', errRequired: 'Ce champ est obligatoire.', errEmail: 'Indiquez une adresse e-mail valide.', errPhone: 'Indiquez un numéro de téléphone valide.', errTerms: 'Merci d’accepter les conditions de réservation.', errForm: 'Une information manque : voyez les champs signalés.',
    sending: 'Confirmation en cours…', errServer: 'Le service de rendez-vous n’a pas répondu. Rien n’a été réservé et vos informations sont conservées : réessayez.', errInvalid: 'Une information manque ou est incorrecte.', errDuplicate: 'Un rendez-vous existe déjà pour cette adresse e-mail à cet horaire.', errRate: 'Trop d’essais. Patientez quelques minutes.',
    conflictText: 'Le créneau du {date} à {time} vient d’être réservé par un autre client.', conflictSub: 'Voici d’autres créneaux disponibles le {date} :', conflictNone: 'Aucun autre créneau ce jour-là : voyez d’autres dates.',
    demoState: 'Simulation — aucun rendez-vous réel : rien n’a été enregistré ailleurs que dans ce navigateur et aucun e-mail n’a été envoyé.', liveSent: 'Un e-mail récapitulatif a été envoyé à {email}.', liveOff: 'Aucun e-mail n’a été envoyé (l’envoi n’est pas configuré par le salon) : conservez votre référence.', liveFailed: 'L’e-mail récapitulatif n’a pas pu partir. Votre rendez-vous est enregistré : conservez votre référence.',
    refDemo: 'Référence de démonstration', ref: 'Référence', icsSummary: 'Rendez-vous coiffure', step: 'Étape {n} sur 5 : {label}',
    sameLength: 'Même tarif quelle que soit la longueur.', lengthNote: 'Tarif et durée fixés par le salon pour cette longueur.',
    sentDemo: 'Simulation : le message a été vérifié mais envoyé à personne.', sentLive: 'Message bien reçu par le salon. Merci !', sentFailed: 'Le message n’a pas pu partir. Réessayez plus tard.', sendingMsg: 'Envoi en cours…',
    lookupDemoOk: 'Simulation : en service réel, un lien sécurisé serait envoyé à cette adresse. Ouverture du rendez-vous de démonstration…', lookupDemoNo: 'Aucun rendez-vous de démonstration ne correspond. Essayez AN-0001 avec julie.martin@example.com (données fictives).', lookupNeutral: 'Si ces informations correspondent à un rendez-vous, un lien d’accès vient d’être envoyé à cette adresse.', errRef: 'Indiquez la référence reçue lors de la prise de rendez-vous.',
    loginDemo: 'Simulation : en service réel, un lien de connexion serait envoyé. Ouverture de l’espace de démonstration…', loginNeutral: 'Si un compte correspond à cette adresse, un lien de connexion sécurisé vient d’y être envoyé.', registerNeutral: 'Votre compte est demandé : un lien sécurisé vient d’être envoyé à cette adresse pour l’ouvrir.',
    registerTitle: 'Créer un compte', registerText: 'Indiquez votre prénom et votre adresse e-mail : vous recevez un lien sécurisé pour ouvrir votre espace. Aucun mot de passe à retenir.', registerSubmit: 'Créer mon compte', loginSwitch: 'Déjà un compte ? Se connecter', registerSwitch: 'Pas encore de compte ? Créer un compte',
    move: 'Déplacer', cancel: 'Annuler', canceled: 'Annulé', done: 'Passé', minutesLong: 'minutes', durationLine: 'Durée du rendez-vous : {d}', priceLine: 'Tarif : {p}', availableOn: 'Disponibilités du {date}',
    movedDemo: 'Simulation : rendez-vous déplacé dans ce navigateur seulement. Nouvel horaire : le {when}.', movedLive: 'Nouvel horaire : le {when}. L’ancien créneau a été libéré.', canceledDemo: 'Simulation : rendez-vous annulé dans ce navigateur seulement.', canceledLive: 'Votre rendez-vous est annulé.', noChange: 'Ce rendez-vous ne peut plus être déplacé ni annulé en ligne : contactez le salon.', chooseNew: 'Choisissez un nouveau créneau.',
    errScope: 'Pour modifier vos informations, ouvrez le lien sécurisé reçu par e-mail (ou connectez-vous depuis « Retrouver mon rendez-vous »).', saved: 'Enregistré.', savedDemo: 'Simulation : enregistré dans ce navigateur seulement.', anyStaff: 'Sans préférence', mapTitle: 'Plan du salon', loggedOut: 'Vous êtes déconnecté(e).'
  };
  function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, function (_, k) { return o && o[k] != null ? o[k] : ''; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, html) { var e = document.createElement(tag); for (var k in attrs || {}) { if (k === 'class') e.className = attrs[k]; else if (attrs[k] != null) e.setAttribute(k, attrs[k]); } if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function storage(kind) { try { var s = window[kind]; var k = '__an'; s.setItem(k, '1'); s.removeItem(k); return s; } catch (e) { return null; } }
  var LS = storage('localStorage'), SS = storage('sessionStorage');
  function readJSON(st, key, fb) { try { var v = st && st.getItem(key); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function writeJSON(st, key, v) { try { if (st) st.setItem(key, JSON.stringify(v)); } catch (e) { /* stockage indisponible : l'état reste en mémoire */ } }
  function uid() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  var ICONS = {
    calendar: '<svg class="an-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="1.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/></svg>',
    clock: '<svg class="an-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    tag: '<svg class="an-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 12.6V4.5a1 1 0 0 1 1-1h8.1l7.9 7.9a1 1 0 0 1 0 1.4l-7.1 7.1a1 1 0 0 1-1.4 0l-8.5-7.3Z"/><circle cx="8" cy="8" r="1.4"/></svg>',
    users: '<svg class="an-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c.6-3.3 2.9-5 6-5s5.4 1.7 6 5"/><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.7c2 .5 3.2 2.1 3.5 4.8"/></svg>',
    prev: '<svg class="an-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>',
    next: '<svg class="an-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>'
  };

  var CFG = (function () { var e = document.getElementById('an-config'); try { return e ? JSON.parse(e.textContent) : null; } catch (x) { return null; } })() || { mode: 'demo', services: [], staff: [] };
  var LIVE = CFG.mode === 'live' && /^https:\/\//.test(CFG.api || '');
  var PAGES = {}, PAGE_URLS = {};
  $$('[data-an-pages] a[data-page]').forEach(function (a) { PAGES[a.getAttribute('data-page')] = a.getAttribute('href'); PAGE_URLS[a.getAttribute('data-page')] = a.href; });
  function C() { return window.AtelierNuanceCore; }
  var RULES = null;
  function rules() {
    if (RULES) return RULES;
    RULES = C().normalize({ timezone: CFG.timezone, hours: CFG.hours, closures: CFG.closures, step: CFG.step, horizonDays: CFG.horizonDays, leadMinutes: CFG.leadMinutes, cancelHours: CFG.cancelHours, services: CFG.services, staff: CFG.staff });
    return RULES;
  }
  function svcOf(id) { return C().serviceById(rules(), id); }
  function staffOf(id) { return C().staffById(rules(), id); }
  function dateText(d, lower) { return C().formatDate(d, LANG, lower); }
  function timeText(t) { return C().formatTime(t, LANG); }
  function durText(m, long) { return C().formatDuration(m, LANG, long); }
  function priceText(p, from) { return C().formatPrice(p, from, LANG); }
  function whenText(d, t) { return dateText(d) + ' ' + T.at + ' ' + timeText(t); }
  function hashParams() { var o = {}; (location.hash || '').replace(/^#/, '').split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) o[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1)); }); return o; }
  function bookUrl(service, length) { var base = PAGES.book || '/pages/prendre-rendez-vous'; return base + '#service=' + encodeURIComponent(service) + (length ? '&length=' + encodeURIComponent(length) : ''); }
  function todayDate() { return C().nowIn(rules().timezone).date; }

  /* ---------------------------------------------------------------- Accès aux données : démonstration ou service réel */
  function api(path, opts) {
    var o = opts || {};
    var headers = { 'Content-Type': 'application/json' };
    if (o.token) headers['X-Client-Token'] = o.token;
    return fetch(CFG.api.replace(/\/+$/, '') + path, { method: o.method || 'GET', headers: headers, body: o.body ? JSON.stringify(o.body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, data: j }; }); });
  }
  var TOKEN_KEY = 'an-client-token';
  function clientToken() { return SS && SS.getItem(TOKEN_KEY) || ''; }
  function setClientToken(t) { try { if (!SS) return; if (t) SS.setItem(TOKEN_KEY, t); else SS.removeItem(TOKEN_KEY); } catch (e) { /* rien */ } }

  // Démonstration : données fictives dans ce navigateur seulement (cliente « Julie Martin », données d'exemple).
  var DEMO_KEY = 'an-demo-v1';
  function firstDemoDate() {
    var R = rules(), d = '2026-11-10', st = C().dateStatus(R, d);
    if (st === 'open') return d;
    d = C().addDays(todayDate(), 14);
    for (var i = 0; i < 60; i++, d = C().addDays(d, 1)) if (C().weekday(d) === 2 && C().dateStatus(R, d) === 'open') return d;
    return C().addDays(todayDate(), 14);
  }
  function demoData() {
    var data = readJSON(LS, DEMO_KEY, null);
    if (data && data.v === 2) return data;
    data = { v: 2, seq: 0, session: true, conflictShown: false, client: { firstName: 'Julie', lastName: 'Martin', email: 'julie.martin@example.com', phone: '06 12 34 56 78', prefs: { staff: '', note: '', newsletter: false, reminders: true } }, appts: [] };
    writeJSON(LS, DEMO_KEY, data);
    return data;
  }
  /** Espace client ouvert sans rendez-vous réservé dans ce navigateur : un rendez-vous fictif d'exemple (AN-0001). */
  function demoWithExample() {
    var data = demoData(), svc = rules().services[0], person = svc ? C().staffFor(rules(), svc.id)[0] : null;
    if (data.appts.length || !svc || !person) return data;
    data.seq = 1;
    data.appts.push({ number: 'AN-0001', status: 'confirmed', service: svc.id, length: '', staff: person.id, date: firstDemoDate(), time: '14:00', duration: svc.duration, price: svc.price, priceFrom: svc.priceFrom, firstName: data.client.firstName, lastName: data.client.lastName, email: data.client.email, phone: data.client.phone, note: '', demo: true });
    saveDemo(data);
    return data;
  }
  function saveDemo(d) { writeJSON(LS, DEMO_KEY, d); }
  /** Agenda occupé d'une date : rendez-vous fictifs déterministes + rendez-vous de démonstration de ce navigateur. */
  function demoBusy(date, exceptNumber) {
    var busy = C().demoAgenda(rules(), date);
    var data = demoData();
    // Créneaux « pris par un autre client » dans la simulation (après l'écran de créneau indisponible).
    (data.taken || []).forEach(function (t) { if (t.date === date) (busy[t.staff] = busy[t.staff] || []).push([t.start, t.end]); });
    data.appts.forEach(function (a) {
      if (a.status !== 'confirmed' || a.date !== date || a.number === exceptNumber) return;
      var s = C().toMin(a.time);
      (busy[a.staff] = busy[a.staff] || []).push([s, s + a.duration]);
    });
    return busy;
  }
  var Data = {
    /** Créneaux d'une date. */
    slots: function (q) {
      if (!LIVE) return Promise.resolve(C().slotsFor(rules(), { date: q.date, service: q.service, staff: q.staff, length: q.length, busy: demoBusy(q.date, q.except) }));
      var qs = '?date=' + encodeURIComponent(q.date) + '&service=' + encodeURIComponent(q.service) + '&staff=' + encodeURIComponent(q.staff || 'any') + (q.length ? '&length=' + q.length : '') + (q.except ? '&except=' + encodeURIComponent(q.except) : '');
      return api('/availability' + qs, { token: q.except ? clientToken() : '' }).then(function (r) { if (r.status !== 200) throw r; return r.data.slots || []; });
    },
    /** Statut de chaque date d'un mois (passée, fermée, complète, ouverte). */
    month: function (q, year, month) {
      var grid = C().monthGrid(year, month).filter(Boolean);
      if (!LIVE) {
        var out = {};
        grid.forEach(function (d) { out[d] = C().dayStatus(rules(), { date: d, service: q.service, staff: q.staff, length: q.length, busy: demoBusy(d, q.except) }); });
        return Promise.resolve(out);
      }
      var qs = '?month=' + year + '-' + (month < 10 ? '0' : '') + month + '&service=' + encodeURIComponent(q.service) + '&staff=' + encodeURIComponent(q.staff || 'any') + (q.length ? '&length=' + q.length : '') + (q.except ? '&except=' + encodeURIComponent(q.except) : '');
      return api('/month' + qs, { token: q.except ? clientToken() : '' }).then(function (r) { if (r.status !== 200) throw r; return r.data.days || {}; });
    }
  };

  /* ---------------------------------------------------------------- Source unique : prix et durées affichés */
  function syncPrices() {
    $$('[data-an-svc]').forEach(function (box) {
      var svc = svcOf(box.getAttribute('data-an-svc'));
      if (!svc) return;
      $$('[data-an-f]', box).forEach(function (f) {
        if (f.closest('[data-an-svc]') !== box) return;
        var k = f.getAttribute('data-an-f');
        if (k === 'price') f.textContent = priceText(svc.price, svc.priceFrom);
        else if (k === 'amount') f.textContent = priceText(svc.price, false);
        else if (k === 'from') f.textContent = svc.priceFrom ? T.from : '';
        else if (k === 'duration') f.textContent = durText(svc.duration);
      });
    });
    $$('[data-an-book]').forEach(function (a) { var id = a.getAttribute('data-an-book'); if (id && svcOf(id)) a.setAttribute('href', bookUrl(id)); });
    // Mention « de démonstration » : jamais avec le service réel.
    if (!CFG.demoNote || LIVE) $$('[data-an-demo-note]').forEach(function (n) { n.hidden = true; });
  }

  /* ---------------------------------------------------------------- Accordéons, filtres, carrousel, repli mobile */
  function initAccordions() {
    $$('[data-an-acc]').forEach(function (b) {
      b.addEventListener('click', function () {
        var open = b.getAttribute('aria-expanded') === 'true';
        b.setAttribute('aria-expanded', open ? 'false' : 'true');
        var p = document.getElementById(b.getAttribute('aria-controls')); if (p) p.hidden = open;
      });
    });
    $$('[data-an-faq]').forEach(function (root) {
      var cats = $$('[data-an-faq-cat]', root);
      if (!cats.length) return;
      function show(key) {
        cats.forEach(function (c) { c.setAttribute('aria-selected', c.getAttribute('data-an-faq-cat') === key ? 'true' : 'false'); });
        $$('[data-an-faq-in]', root).forEach(function (q) { q.hidden = q.getAttribute('data-an-faq-in') !== key; });
      }
      cats.forEach(function (c) { c.addEventListener('click', function () { show(c.getAttribute('data-an-faq-cat')); }); });
      show(cats[0].getAttribute('data-an-faq-cat'));
    });
  }
  function initFilters() {
    $$('[data-an-filter-root]').forEach(function (root) {
      var btns = $$('[data-an-filter]', root), items = $$('[data-an-cat]', root), empty = $('[data-an-filter-empty]', root);
      if (!btns.length) return;
      var hasAll = btns.some(function (b) { return b.getAttribute('data-an-filter') === 'all'; });
      function apply(key) {
        btns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-an-filter') === key || (!key && b.getAttribute('data-an-filter') === 'all') ? 'true' : 'false'); });
        var shown = 0;
        items.forEach(function (it) { var on = !key || key === 'all' || it.getAttribute('data-an-cat') === key; it.hidden = !on; if (on) shown++; });
        if (empty) empty.hidden = shown > 0;
        root.dispatchEvent(new CustomEvent('an:filtered'));
      }
      var current = null;
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-an-filter');
          // Un second clic sur le filtre actif rend toute la liste (pas de filtre « Toutes » sur les prestations).
          current = !hasAll && current === k ? null : k;
          apply(current);
        });
      });
      var h = (location.hash || '').replace('#', '');
      if (h && btns.some(function (b) { return b.getAttribute('data-an-filter') === h; })) { current = h; apply(h); }
    });
  }
  function initCarousels() {
    $$('[data-an-carousel]').forEach(function (root) {
      var track = $('[data-an-track]', root);
      if (!track) return;
      function by(dir) { var it = track.firstElementChild; var w = it ? it.getBoundingClientRect().width : track.clientWidth; track.scrollBy({ left: dir * w, behavior: 'smooth' }); }
      var p = $('[data-an-prev]', root), n = $('[data-an-next]', root);
      if (p) p.addEventListener('click', function () { by(-1); });
      if (n) n.addEventListener('click', function () { by(1); });
    });
  }
  function initCollapse() {
    var mq = window.matchMedia('(max-width: 749px)');
    function apply() { $$('[data-an-collapse]').forEach(function (d) { if (mq.matches) d.removeAttribute('open'); else d.setAttribute('open', ''); }); }
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
    $$('[data-an-collapse] > summary').forEach(function (s) { s.addEventListener('click', function (e) { if (!mq.matches) e.preventDefault(); }); });
  }

  /* ---------------------------------------------------------------- Visionneuse des inspirations */
  function initLightbox() {
    $$('[data-an-lightbox-root]').forEach(function (root) {
      var box = $('[data-an-lightbox]', root);
      if (!box) return;
      var img = $('[data-an-lb-img]', box), title = $('[data-an-lb-title]', box), text = $('[data-an-lb-text]', box), count = $('[data-an-lb-count]', box);
      var list = [], index = 0, opener = null;
      function visible() { return $$('[data-an-open]', root).filter(function (b) { return b.offsetParent !== null; }); }
      function show(i) {
        index = (i + list.length) % list.length;
        var b = list[index], src = $('img', b);
        img.src = src ? (src.currentSrc || src.src) : '';
        img.alt = b.getAttribute('data-title') || '';
        title.textContent = b.getAttribute('data-title') || '';
        text.textContent = b.getAttribute('data-text') || '';
        count.textContent = (index + 1) + ' / ' + list.length;
      }
      function close() { box.hidden = true; document.documentElement.classList.remove('an-lock'); if (opener) opener.focus(); }
      root.addEventListener('click', function (e) {
        var b = e.target.closest('[data-an-open]');
        if (!b || !root.contains(b)) return;
        list = visible(); opener = b;
        box.hidden = false; document.documentElement.classList.add('an-lock');
        show(list.indexOf(b));
        $('[data-an-lb-close]', box).focus();
      });
      $('[data-an-lb-close]', box).addEventListener('click', close);
      $('[data-an-lb-prev]', box).addEventListener('click', function () { show(index - 1); });
      $('[data-an-lb-next]', box).addEventListener('click', function () { show(index + 1); });
      box.addEventListener('click', function (e) { if (e.target === box) close(); });
      box.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'ArrowLeft') show(index - 1);
        else if (e.key === 'ArrowRight') show(index + 1);
        else if (e.key === 'Tab') trap(e, box);
      });
    });
  }
  function trap(e, box) {
    var f = $$('button:not([disabled]), a[href], input:not([disabled]), select, textarea', box).filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------------------------------------------------------------- Fiche : choix de la longueur */
  function initLengths() {
    $$('[data-an-lengths]').forEach(function (root) {
      var svc = svcOf(root.getAttribute('data-an-svc'));
      if (!svc) return;
      var same = ['short', 'mid', 'long'].every(function (k) { var o = C().offer(svc, k); return o.price === svc.price && o.duration === svc.duration; });
      var sameEl = $('[data-an-same]', root); if (sameEl) sameEl.hidden = !same;
      function update() {
        var r = $('input[type=radio]:checked', root), len = r ? r.value : 'short';
        var o = C().offer(svc, len);
        var d = $('[data-an-f=duration]', root), p = $('[data-an-f=price]', root);
        if (d) d.textContent = durText(o.duration);
        if (p) p.textContent = priceText(o.price, o.priceFrom);
        var a = $('[data-an-book]', root); if (a) a.setAttribute('href', bookUrl(svc.id, len));
        $$('.an-lengths__opt', root).forEach(function (l) { l.classList.toggle('is-checked', $('input', l).checked); });
      }
      $$('input[type=radio]', root).forEach(function (r) { r.addEventListener('change', update); });
      update();
    });
  }

  /* ---------------------------------------------------------------- Plan réel (chargé à la demande) */
  function initMaps() {
    $$('[data-an-map]').forEach(function (b) {
      b.addEventListener('click', function () {
        var lat = Number(b.getAttribute('data-lat')), lng = Number(b.getAttribute('data-lng'));
        if (!isFinite(lat) || !isFinite(lng)) return;
        var d = 0.006, f = el('iframe', { title: T.mapTitle, loading: 'lazy', class: 'an-map__frame', src: 'https://www.openstreetmap.org/export/embed.html?bbox=' + (lng - d) + '%2C' + (lat - d) + '%2C' + (lng + d) + '%2C' + (lat + d) + '&layer=mapnik&marker=' + lat + '%2C' + lng });
        b.replaceWith(f);
      });
    });
  }

  /* ---------------------------------------------------------------- Formulaire de contact */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function fieldError(field, show) { var box = field.closest('.an-field'); if (!box) return; var e = $('.an-field__error', box); if (e) e.hidden = !show; field.setAttribute('aria-invalid', show ? 'true' : 'false'); box.classList.toggle('is-invalid', !!show); }
  function initRequests() {
    $$('[data-an-request]').forEach(function (wrap) {
      var form = $('form', wrap);
      if (!form) return;
      var status = $('[data-an-status]', form);
      form.addEventListener('submit', function (e) {
        e.preventDefault(); e.stopPropagation();
        var ok = true;
        $$('input[required], select[required], textarea[required]', form).forEach(function (f) {
          var bad = !f.value.trim() || (f.type === 'email' && !EMAIL_RE.test(f.value.trim()));
          fieldError(f, bad); if (bad && ok) { ok = false; f.focus(); }
        });
        if (!ok) { status.textContent = T.errForm; status.className = 'an-form__status is-error'; return; }
        var btn = $('button[type=submit]', form); btn.disabled = true; btn.setAttribute('aria-busy', 'true');
        status.textContent = T.sendingMsg; status.className = 'an-form__status';
        var payload = { kind: wrap.getAttribute('data-an-request') };
        $$('input, select, textarea', form).forEach(function (f) { var m = /contact\[(\w+)\]/.exec(f.name || ''); if (m) payload[m[1] === 'body' ? 'message' : m[1]] = f.value.trim(); });
        var p = LIVE ? api('/requests', { method: 'POST', body: payload }).then(function (r) { if (r.status >= 300) throw r; return T.sentLive; }) : wait(500).then(function () { return T.sentDemo; });
        p.then(function (msg) { status.textContent = msg; status.className = 'an-form__status is-success'; form.reset(); })
          .catch(function () { status.textContent = T.sentFailed; status.className = 'an-form__status is-error'; })
          .then(function () { btn.disabled = false; btn.removeAttribute('aria-busy'); });
      });
      $$('input, select, textarea', form).forEach(function (f) { f.addEventListener('input', function () { if (f.getAttribute('aria-invalid') === 'true') fieldError(f, !f.value.trim()); }); });
    });
  }

  /* ---------------------------------------------------------------- Cookies : rien de facultatif avant l'accord */
  var CONSENT_KEY = 'an-cookies';
  function initCookies() {
    var box = $('[data-an-cookies]');
    window.AtelierNuanceConsent = {
      get: function () { return readJSON(LS, CONSENT_KEY, null); },
      reset: function () { try { LS && LS.removeItem(CONSENT_KEY); } catch (e) { /* rien */ } if (box) { box.hidden = false; var a = $('[data-an-cookies-accept]', box); if (a) a.focus(); } }
    };
    $$('[data-an-cookies-reset]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); window.AtelierNuanceConsent.reset(); }); });
    if (!box) return;
    function decide(stats) { writeJSON(LS, CONSENT_KEY, { necessary: true, stats: !!stats, at: new Date().toISOString() }); box.hidden = true; document.dispatchEvent(new CustomEvent('an:consent', { detail: { stats: !!stats } })); }
    if (!readJSON(LS, CONSENT_KEY, null)) box.hidden = false;
    $('[data-an-cookies-accept]', box).addEventListener('click', function () { decide(true); });
    $('[data-an-cookies-refuse]', box).addEventListener('click', function () { decide(false); });
    var toggle = $('[data-an-cookies-custom]', box), prefs = document.getElementById(toggle.getAttribute('aria-controls'));
    toggle.addEventListener('click', function () { var open = toggle.getAttribute('aria-expanded') === 'true'; toggle.setAttribute('aria-expanded', open ? 'false' : 'true'); prefs.hidden = open; });
    $('[data-an-cookies-save]', box).addEventListener('click', function () { decide($('[data-an-cookies-stats]', box).checked); });
  }

  /* ---------------------------------------------------------------- Calendrier commun (réservation et déplacement) */
  function Calendar(root, opts) {
    var self = this;
    var R = rules(), today = todayDate();
    var view = { y: Number((opts.date || today).slice(0, 4)), m: Number((opts.date || today).slice(5, 7)) };
    var statuses = {}, selected = opts.date || '';
    function label(st) { return st === 'closed' ? T.closed : st === 'full' ? T.full : st === 'past' ? T.past : ''; }
    function render() {
      var grid = C().monthGrid(view.y, view.m);
      var lastAllowed = C().addDays(today, R.horizonDays);
      var canPrev = view.y * 12 + view.m > Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7));
      var canNext = view.y * 12 + view.m < Number(lastAllowed.slice(0, 4)) * 12 + Number(lastAllowed.slice(5, 7));
      var html = '<div class="an-cal__head"><button type="button" class="an-cal__nav" data-cal-prev aria-label="' + esc(T.prevMonth) + '"' + (canPrev ? '' : ' disabled') + '>' + ICONS.prev + '</button><p class="an-cal__month" aria-live="polite">' + esc(C().monthLabel(view.y, view.m, LANG)) + '</p><button type="button" class="an-cal__nav" data-cal-next aria-label="' + esc(T.nextMonth) + '"' + (canNext ? '' : ' disabled') + '>' + ICONS.next + '</button></div>';
      html += '<table class="an-cal__grid" role="grid"><thead><tr>' + C().DAYS_SHORT[LANG].map(function (d) { return '<th scope="col" abbr="' + d + '">' + (opts.compact ? d.charAt(0) : d) + '</th>'; }).join('') + '</tr></thead><tbody>';
      for (var i = 0; i < grid.length; i += 7) {
        html += '<tr>';
        for (var j = i; j < i + 7; j++) {
          var d = grid[j];
          if (!d) { html += '<td></td>'; continue; }
          var st = statuses[d] || 'loading';
          var open = st === 'open';
          html += '<td><button type="button" class="an-cal__day' + (d === selected ? ' is-selected' : '') + (d === today ? ' is-today' : '') + (open ? '' : ' is-off') + '" data-date="' + d + '"' + (open ? '' : ' aria-disabled="true"') + ' aria-pressed="' + (d === selected) + '" aria-label="' + esc(dateText(d) + (open ? '' : ' — ' + label(st))) + '">' + Number(d.slice(8)) + '</button></td>';
        }
        html += '</tr>';
      }
      html += '</tbody></table>';
      root.innerHTML = html;
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
    /** Première date ouverte (ce mois-ci puis les suivants, dans l'horizon). */
    self.firstOpen = function () {
      var tries = 0;
      function look() {
        var keys = Object.keys(statuses).sort();
        for (var i = 0; i < keys.length; i++) if (statuses[keys[i]] === 'open') return Promise.resolve(keys[i]);
        if (++tries > 4) return Promise.resolve('');
        view.m++; if (view.m > 12) { view.m = 1; view.y++; }
        return load().then(look);
      }
      return load().then(look);
    };
  }

  function slotButtons(root, slots, selectedTime) {
    var free = slots.filter(function (s) { return s.available; });
    root.innerHTML = free.map(function (s) { return '<button type="button" role="radio" class="an-slot' + (s.time === selectedTime ? ' is-selected' : '') + '" aria-checked="' + (s.time === selectedTime) + '" data-time="' + s.time + '">' + esc(timeText(s.time)) + '</button>'; }).join('');
    return free;
  }

  function downloadIcs(appt) {
    var svc = svcOf(appt.service) || { name: '' };
    var text = C().ics({ number: appt.number, date: appt.date, time: appt.time, duration: appt.duration }, { timezone: rules().timezone, summary: (svc.name || T.icsSummary) + ' — ' + (CFG.salon || ''), location: CFG.address || CFG.salon || '', description: appt.number });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
    a.download = (appt.number || 'rendez-vous') + '.ics';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /* ---------------------------------------------------------------- Prise de rendez-vous (5 étapes) */
  function initBooking(root) {
    var R = rules();
    var KEY = 'an-booking-state';
    var saved = readJSON(SS, KEY, null) || {};
    var h = hashParams();
    var state = { service: saved.service || '', length: saved.length || '', staff: saved.staff || 'any', date: saved.date || '', time: saved.time || '', assigned: saved.assigned || '', contact: saved.contact || {}, idem: saved.idem || uid() };
    if (h.service && svcOf(h.service)) { if (h.service !== state.service) { state.date = ''; state.time = ''; state.assigned = ''; } state.service = h.service; state.length = /^(short|mid|long)$/.test(h.length || '') ? h.length : ''; }
    var step = 1, busy = false, lastAppt = null;
    var labels = $$('.an-progress__label', root).map(function (x) { return x.textContent; });
    function persist() { writeJSON(SS, KEY, { service: state.service, length: state.length, staff: state.staff, date: state.date, time: state.time, assigned: state.assigned, contact: state.contact, idem: state.idem }); }
    function svc() { return svcOf(state.service); }
    function offer() { var s = svc(); return s ? C().offer(s, state.length) : null; }
    function staffName() {
      if (state.staff && state.staff !== 'any') { var p = staffOf(state.staff); return p ? fmt(T.with, { name: p.name }) : ''; }
      if (state.assigned) { var a = staffOf(state.assigned); return a ? fmt(T.with, { name: a.name }) + ' (' + T.assigned + ')' : T.withAny; }
      return T.withAny;
    }
    function summary() {
      var s = svc(), o = offer();
      var vals = {
        service: s ? s.name : '', duration: o ? durText(o.duration) : '', price: o ? priceText(o.price, o.priceFrom) : '',
        when: state.date && state.time ? whenText(state.date, state.time) : (state.date ? dateText(state.date) : '—'),
        'service-line': s ? s.name + ' — ' + durText(o.duration) + (step >= 3 ? ' — ' + priceText(o.price, o.priceFrom) : '') : '', staff: staffName(), number: lastAppt ? lastAppt.number : ''
      };
      if (step === 5 && lastAppt) vals['service-line'] = s.name + ' — ' + durText(o.duration);
      var c = state.contact || {};
      vals['contact-name'] = ((c.firstName || '') + ' ' + (c.lastName || '')).trim(); vals['contact-email'] = c.email || ''; vals['contact-phone'] = c.phone || '';
      $$('[data-an-sum]', root).forEach(function (n) { var k = n.getAttribute('data-an-sum'); if (k in vals) n.textContent = vals[k]; });
    }
    function showErr(key, on) { var e = $('[data-an-err="' + key + '"]', root); if (e) e.hidden = !on; }

    // Étape 1 : prestations (source unique), une prestation venant de sa fiche est déjà choisie.
    var list = $('[data-an-services]', root);
    function renderServices() {
      list.innerHTML = R.services.filter(function (s) { return s.duration; }).map(function (s) {
        var on = s.id === state.service;
        return '<label class="an-choice' + (on ? ' is-checked' : '') + '"><input type="radio" class="an-radio" name="an-service" value="' + esc(s.id) + '"' + (on ? ' checked' : '') + '><span class="an-choice__text"><span class="an-choice__name">' + esc(s.name) + '</span>' + (s.short ? '<span class="an-choice__desc">' + esc(s.short) + '</span>' : '') + '</span><span class="an-choice__meta"><span class="an-choice__price">' + esc(priceText(s.price, s.priceFrom)) + '</span><span class="an-choice__dur">' + esc(durText(s.duration)) + '</span></span></label>';
      }).join('');
    }
    list.addEventListener('change', function (e) {
      if (e.target.name !== 'an-service') return;
      if (state.service !== e.target.value) { state.service = e.target.value; state.length = ''; state.time = ''; state.assigned = ''; if (state.staff !== 'any' && !C().staffFor(R, state.service).some(function (p) { return p.id === state.staff; })) state.staff = 'any'; }
      $$('.an-choice', list).forEach(function (l) { l.classList.toggle('is-checked', $('input', l).checked); });
      showErr('service', false); persist(); summary();
    });

    // Étape 2 : professionnel (compétences réellement configurées : un choix incompatible est désactivé).
    var staffBox = $('[data-an-staff]', root);
    function renderStaff() {
      var ok = C().staffFor(R, state.service).map(function (p) { return p.id; });
      var cards = ['<label class="an-person' + (state.staff === 'any' ? ' is-checked' : '') + '"><input type="radio" class="an-radio an-person__radio" name="an-staff" value="any"' + (state.staff === 'any' ? ' checked' : '') + '><span class="an-person__icon">' + ICONS.users + '</span><span class="an-person__name">' + esc(T.noPref) + '</span><span class="an-person__role">' + esc(T.noPrefText) + '</span></label>'];
      R.staff.forEach(function (p) {
        var can = ok.indexOf(p.id) >= 0, on = state.staff === p.id;
        cards.push('<label class="an-person' + (on ? ' is-checked' : '') + (can ? '' : ' is-disabled') + '"><input type="radio" class="an-radio an-person__radio" name="an-staff" value="' + esc(p.id) + '"' + (on ? ' checked' : '') + (can ? '' : ' disabled') + '><span class="an-initial an-initial--lg">' + esc(p.initial) + '</span><span class="an-person__name">' + esc(p.name) + '</span><span class="an-person__role">' + esc(can ? p.title : T.notForService) + '</span></label>');
      });
      staffBox.innerHTML = cards.join('');
    }
    staffBox.addEventListener('change', function (e) {
      if (e.target.name !== 'an-staff') return;
      state.staff = e.target.value; state.time = ''; state.assigned = '';
      $$('.an-person', staffBox).forEach(function (l) { l.classList.toggle('is-checked', $('input', l).checked); });
      persist(); summary();
    });

    // Étape 3 : calendrier et créneaux.
    var slotsBox = $('[data-an-slots]', root), dayTitle = $('[data-an-day-title]', root), noSlot = $('[data-an-no-slot]', root);
    var currentSlots = [];
    function query() { return { service: state.service, staff: state.staff, length: state.length }; }
    var cal = new Calendar($('[data-an-cal]', root), { date: state.date, query: query, onSelect: function (d) { state.date = d; state.time = ''; state.assigned = ''; persist(); loadSlots(); summary(); }, onError: networkError });
    function loadSlots() {
      if (!state.date) { slotsBox.innerHTML = ''; dayTitle.textContent = ''; return Promise.resolve(); }
      dayTitle.textContent = dateText(state.date);
      slotsBox.innerHTML = '';
      return Data.slots({ date: state.date, service: state.service, staff: state.staff, length: state.length }).then(function (s) {
        currentSlots = s;
        var free = slotButtons(slotsBox, s, state.time);
        noSlot.hidden = free.length > 0;
        if (state.time && !free.some(function (x) { return x.time === state.time; })) { state.time = ''; state.assigned = ''; persist(); }
      }).catch(networkError);
    }
    slotsBox.addEventListener('click', function (e) {
      var b = e.target.closest('[data-time]');
      if (!b) return;
      state.time = b.getAttribute('data-time');
      var slot = currentSlots.filter(function (x) { return x.time === state.time; })[0];
      state.assigned = state.staff === 'any' && slot ? C().assign(R, slot.staff, LIVE ? {} : demoBusy(state.date)) || '' : '';
      $$('[data-time]', slotsBox).forEach(function (x) { var on = x === b; x.classList.toggle('is-selected', on); x.setAttribute('aria-checked', on); });
      showErr('time', false); persist(); summary();
    });
    function networkError() { var st = $('[data-an-submit-status]', root); if (st) { st.hidden = false; st.textContent = T.errServer; } }

    // Étape 4 : coordonnées (conservées pendant les retours), validation, envoi unique.
    var form = $('[data-an-form]', root);
    $$('input, textarea', form).forEach(function (f) {
      if (f.type === 'checkbox') f.checked = !!state.contact[f.name]; else if (state.contact[f.name]) f.value = state.contact[f.name];
      f.addEventListener('input', function () { state.contact[f.name] = f.type === 'checkbox' ? f.checked : f.value; persist(); if (f.getAttribute('aria-invalid') === 'true') { fieldError(f, false); showErr(f.name, false); } $('[data-an-submit-status]', root).hidden = true; });
      f.addEventListener('change', function () { state.contact[f.name] = f.type === 'checkbox' ? f.checked : f.value; persist(); if (f.name === 'terms' && f.checked) showErr('terms', false); });
    });
    function contact() { return { firstName: (state.contact.firstName || '').trim(), lastName: (state.contact.lastName || '').trim(), email: (state.contact.email || '').trim(), phone: (state.contact.phone || '').trim(), note: (state.contact.note || '').trim(), newsletter: !!state.contact.newsletter, terms: !!state.contact.terms }; }
    function validateContact() {
      var c = contact(), errs = C().validate(R, { service: state.service, contact: c }, {}).filter(function (k) { return ['firstName', 'lastName', 'email', 'phone', 'terms'].indexOf(k) >= 0; });
      ['firstName', 'lastName', 'email', 'phone', 'terms'].forEach(function (k) { var on = errs.indexOf(k) >= 0; showErr(k, on); var f = form.elements[k]; if (f) f.setAttribute('aria-invalid', on ? 'true' : 'false'); });
      if (errs.length) { var f = form.elements[errs[0]]; if (f) f.focus(); }
      return !errs.length;
    }
    var submitBtn = $('[data-an-submit]', root), submitStatus = $('[data-an-submit-status]', root);
    // Téléphone (planche 02) : coordonnées d'abord, puis récapitulatif à confirmer.
    var MOBILE = window.matchMedia('(max-width: 749px)');
    var pane4 = $('[data-an-pane="4"]', root);
    function sub(name) { pane4.setAttribute('data-sub', name); summary(); var t = $('.an-step-title', pane4); if (t && step === 4) t.focus({ preventScroll: true }); if (root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: 'start' }); }
    $('[data-an-mnext]', root).addEventListener('click', function () { submitStatus.hidden = true; if (validateContact()) sub('review'); });
    $('[data-an-sim]', root).hidden = LIVE;
    form.addEventListener('submit', function (e) {
      e.preventDefault(); e.stopPropagation();
      if (busy) return;
      submitStatus.hidden = true;
      if (!validateContact()) { submitStatus.hidden = false; submitStatus.textContent = T.errForm; if (MOBILE.matches) sub('form'); return; }
      busy = true; submitBtn.disabled = true; submitBtn.setAttribute('aria-busy', 'true');
      var label = $('span', submitBtn), was = label.textContent; label.textContent = T.sending;
      (LIVE ? submitLive() : submitDemo()).then(function (r) {
        if (r.conflict) return conflict(r.alternatives || []);
        lastAppt = r.appt; state.idem = uid(); state.time = ''; state.assigned = ''; persist();
        go(5, r);
      }).catch(function (err) {
        submitStatus.hidden = false;
        submitStatus.textContent = err && err.status === 429 ? T.errRate : err && err.data && err.data.error === 'duplicate' ? T.errDuplicate : err && err.data && err.data.error === 'invalid' ? T.errInvalid : T.errServer;
      }).then(function () { busy = false; submitBtn.disabled = false; submitBtn.removeAttribute('aria-busy'); label.textContent = was; });
    });
    function submitDemo() {
      return wait(650).then(function () {
        var data = demoData(), o = offer();
        // Scénario de la planche 06 : au premier essai, le créneau de 15 h 30 « vient d'être réservé par un autre client ».
        if (state.time === '15:30' && !data.conflictShown) {
          var s0 = C().toMin(state.time), who0 = state.staff !== 'any' ? state.staff : state.assigned;
          data.conflictShown = true;
          if (who0) (data.taken = data.taken || []).push({ date: state.date, staff: who0, start: s0, end: s0 + o.duration });
          saveDemo(data);
          return Data.slots({ date: state.date, service: state.service, staff: state.staff, length: state.length }).then(function (s) { return { conflict: true, alternatives: s.filter(function (x) { return x.available && x.time !== '15:30'; }).map(function (x) { return x.time; }) }; });
        }
        var busyMap = demoBusy(state.date);
        var errs = C().validate(R, { service: state.service, length: state.length, staff: state.staff, date: state.date, time: state.time, contact: contact() }, busyMap);
        if (errs.indexOf('slot_taken') >= 0 || errs.indexOf('time') >= 0 || errs.indexOf('date') >= 0) {
          return Data.slots({ date: state.date, service: state.service, staff: state.staff, length: state.length }).then(function (s) { return { conflict: true, alternatives: s.filter(function (x) { return x.available; }).map(function (x) { return x.time; }) }; });
        }
        var slot = C().slotsFor(R, { date: state.date, service: state.service, staff: state.staff, length: state.length, busy: busyMap }).filter(function (x) { return x.time === state.time; })[0];
        var who = state.staff !== 'any' ? state.staff : (slot.staff.indexOf(state.assigned) >= 0 ? state.assigned : C().assign(R, slot.staff, busyMap));
        data = demoData(); data.seq += 1;
        var c = contact();
        var appt = { number: 'AN-' + String(data.seq).padStart(4, '0'), status: 'confirmed', service: state.service, length: state.length, staff: who, date: state.date, time: state.time, duration: o.duration, price: o.price, priceFrom: o.priceFrom, firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone, note: c.note, demo: true };
        data.appts.push(appt);
        data.client = { firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone, prefs: Object.assign({}, data.client.prefs, { newsletter: c.newsletter }) };
        data.session = true;
        saveDemo(data);
        return { appt: appt, email: 'demo' };
      });
    }
    function submitLive() {
      var c = contact();
      return api('/appointments', { method: 'POST', body: { service: state.service, length: state.length, staff: state.staff, date: state.date, time: state.time, firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone, note: c.note, newsletter: c.newsletter, terms: c.terms, idem: state.idem } }).then(function (r) {
        if (r.status === 409 && r.data.error === 'unavailable') return { conflict: true, alternatives: r.data.alternatives || [] };
        if (r.status >= 300) throw r;
        if (r.data.clientToken) setClientToken(r.data.clientToken);
        var a = r.data.appointment;
        return { appt: { number: a.number, status: a.status, service: a.service, length: a.length, staff: a.staff, date: a.date, time: a.time, duration: a.duration, price: a.price, priceFrom: a.priceFrom }, email: r.data.email, emailTo: c.email, token: r.data.clientToken };
      });
    }

    // Créneau pris entre-temps : la saisie est conservée, de vrais créneaux sont proposés.
    var altBox = $('[data-an-alternatives]', root);
    function conflict(times) {
      $('[data-an-conflict-text]', root).textContent = fmt(T.conflictText, { date: dateText(state.date, true), time: timeText(state.time) });
      $('[data-an-conflict-sub]', root).textContent = times.length ? fmt(T.conflictSub, { date: dateText(state.date, true) }) : T.conflictNone;
      altBox.innerHTML = times.slice(0, 8).map(function (t) { return '<button type="button" class="an-chip" data-alt="' + t + '">' + esc(timeText(t)) + '</button>'; }).join('');
      state.time = ''; state.assigned = ''; persist();
      go('conflict');
    }
    altBox.addEventListener('click', function (e) {
      var b = e.target.closest('[data-alt]');
      if (!b) return;
      state.time = b.getAttribute('data-alt');
      Data.slots({ date: state.date, service: state.service, staff: state.staff, length: state.length }).then(function (s) {
        var slot = s.filter(function (x) { return x.time === state.time; })[0];
        state.assigned = state.staff === 'any' && slot ? C().assign(R, slot.staff, LIVE ? {} : demoBusy(state.date)) || '' : '';
        persist(); go(4);
      });
    });

    // Confirmation : reflète l'état réel du service.
    function confirmView(r) {
      var a = r.appt;
      $('[data-an-ref-label]', root).textContent = LIVE ? T.ref : T.refDemo;
      var stEl = $('[data-an-confirm-state]', root);
      stEl.textContent = !LIVE ? T.demoState : r.email === 'sent' ? fmt(T.liveSent, { email: r.emailTo }) : r.email === 'failed' ? T.liveFailed : T.liveOff;
      var addr = $('[data-an-address]', root); if (addr && CFG.address) addr.textContent = CFG.address;
      var manage = $('[data-an-manage]', root);
      if (manage) manage.setAttribute('href', (PAGES.account || manage.getAttribute('href')) + (LIVE && r.token ? '#c=' + encodeURIComponent(r.token) : ''));
      state.service = a.service; state.length = a.length || ''; state.date = a.date; state.time = a.time;
      if (a.staff) { state.assigned = state.staff === 'any' ? a.staff : ''; }
      summary();
      state.time = ''; state.assigned = '';
    }
    $('[data-an-ics]', root).addEventListener('click', function () { if (lastAppt) downloadIcs(lastAppt); });

    // Navigation entre les étapes.
    function go(target, extra) {
      step = target;
      root.setAttribute('data-step', String(target));
      document.body.classList.toggle('an-booking-done', target === 5);
      $$('[data-an-pane]', root).forEach(function (p) { p.hidden = p.getAttribute('data-an-pane') !== String(target); });
      var n = target === 'conflict' ? 4 : target;
      $$('[data-an-progress]', root).forEach(function (li) { var i = Number(li.getAttribute('data-an-progress')); li.classList.toggle('is-current', i === n); li.classList.toggle('is-done', i < n); if (i === n) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
      if (target === 4) pane4.setAttribute('data-sub', 'form');
      if (target === 1) renderServices();
      if (target === 2) renderStaff();
      if (target === 3) { var p0 = state.date ? cal.select(state.date) : cal.firstOpen().then(function (d) { if (d) { state.date = d; persist(); return cal.select(d); } }); Promise.resolve(p0).then(loadSlots).then(summary); }
      if (target === 5 && extra) confirmView(extra);
      summary();
      var live = $('[data-an-live]', root); if (live && typeof n === 'number') live.textContent = fmt(T.step, { n: n, label: labels[n - 1] || '' });
      var pane = $('[data-an-pane="' + target + '"]', root), title = pane && $('[tabindex="-1"]', pane);
      if (title) title.focus({ preventScroll: true });
      if (root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: 'start' });
    }
    root.addEventListener('click', function (e) {
      var nx = e.target.closest('[data-an-next]'), pv = e.target.closest('[data-an-prev]'), gt = e.target.closest('[data-an-goto]');
      if (nx) {
        if (step === 1 && !svc()) { showErr('service', true); return; }
        if (step === 3 && !(state.date && state.time)) { showErr('time', true); return; }
        go(step + 1);
      } else if (pv) {
        if (step === 4 && MOBILE.matches && pane4.getAttribute('data-sub') === 'review') { sub('form'); return; }
        go(Math.max(1, step - 1));
      } else if (gt) {
        go(Number(gt.getAttribute('data-an-goto')));
      }
    });
    if (!R.services.some(function (s) { return s.duration; })) { list.innerHTML = ''; showErr('service', true); }
    go(1);
  }

  /* ---------------------------------------------------------------- Rendez-vous d'un client (démonstration ou service réel) */
  var Client = {
    /** { client, appts } ; null = pas d'accès ; rejet = erreur réseau. */
    load: function () {
      if (!LIVE) { var d = demoWithExample(); return Promise.resolve(d.session ? { client: d.client, appts: d.appts.slice(), demo: true } : null); }
      var t = clientToken();
      if (!t) return Promise.resolve(null);
      return api('/me', { token: t }).then(function (r) {
        if (r.status === 401 || r.status === 404) { setClientToken(''); return { expired: true }; }
        if (r.status !== 200) throw r;
        return { client: r.data.client, scope: r.data.scope, appts: (r.data.upcoming || []).concat(r.data.past || []) };
      });
    },
    move: function (number, date, time) {
      if (!LIVE) {
        return wait(500).then(function () {
          var data = demoData(), a = data.appts.filter(function (x) { return x.number === number; })[0];
          if (!a || a.status !== 'confirmed') throw { data: { error: 'not_found' } };
          // Le nouveau créneau est vérifié (sans compter ce rendez-vous) avant que l'ancien ne soit libéré.
          var errs = C().validate(rules(), { service: a.service, length: a.length, staff: a.staff, date: date, time: time }, demoBusy(date, number));
          if (errs.length) throw { status: 409, data: { error: 'unavailable' } };
          a.date = date; a.time = time; saveDemo(data); return a;
        });
      }
      return api('/appointments/' + encodeURIComponent(number) + '/move', { method: 'POST', token: clientToken(), body: { date: date, time: time } }).then(function (r) { if (r.status !== 200) throw r; return r.data.appointment; });
    },
    cancel: function (number) {
      if (!LIVE) {
        return wait(400).then(function () { var data = demoData(); data.appts.forEach(function (a) { if (a.number === number) a.status = 'canceled'; }); saveDemo(data); return true; });
      }
      return api('/appointments/' + encodeURIComponent(number) + '/cancel', { method: 'POST', token: clientToken() }).then(function (r) { if (r.status !== 200) throw r; return true; });
    },
    save: function (patch) {
      if (!LIVE) { return wait(300).then(function () { var d = demoData(); d.client = Object.assign({}, d.client, patch, { prefs: Object.assign({}, d.client.prefs, patch.prefs || {}) }); saveDemo(d); return d.client; }); }
      return api('/me', { method: 'POST', token: clientToken(), body: patch }).then(function (r) { if (r.status !== 200) throw r; return r.data.client; });
    },
    logout: function () {
      if (!LIVE) { var d = demoData(); d.session = false; saveDemo(d); return Promise.resolve(); }
      var t = clientToken(); setClientToken('');
      return t ? api('/logout', { method: 'POST', token: t }).catch(function () {}) : Promise.resolve();
    },
    request: function (kind, body) {
      if (!LIVE) {
        if (kind === 'lookup') {
          var d = demoWithExample(), ref = String(body.reference || '').trim().toUpperCase(), em = String(body.email || '').trim().toLowerCase();
          var hit = d.appts.some(function (a) { return a.number === ref && String(a.email).toLowerCase() === em; });
          if (hit) { d.session = true; saveDemo(d); }
          return wait(500).then(function () { return { demo: true, found: hit }; });
        }
        var dd = demoData(); dd.session = true; saveDemo(dd);
        return wait(500).then(function () { return { demo: true, found: true }; });
      }
      return api('/' + kind, { method: 'POST', body: body }).then(function (r) { if (r.status === 429) throw r; if (r.status >= 300) throw r; return { ok: true }; });
    }
  };
  function isPast(a) { var now = C().nowIn(rules().timezone); return a.date < now.date || (a.date === now.date && C().toMin(a.time) + (a.duration || 0) <= now.minute); }
  function apptLines(a) {
    var s = svcOf(a.service), p = staffOf(a.staff);
    return { name: s ? s.name : a.service, staff: p ? fmt(T.with, { name: p.name }) : '', when: whenText(a.date, a.time), dur: durText(a.duration, true), price: priceText(a.price, a.priceFrom) };
  }
  function cancelSummary(a) {
    var l = apptLines(a);
    return '<p class="an-cancel__name">' + esc(l.name) + '</p><p class="an-muted">' + esc(l.staff) + '</p><p>' + ICONS.calendar + '<span>' + esc(l.when) + '</span></p><p>' + ICONS.clock + '<span>' + esc(l.dur + ' — ' + l.price) + '</span></p>';
  }
  function termsText() { return CFG.cancelTerms || ''; }

  /* ---------------------------------------------------------------- Retrouver un rendez-vous */
  function initLookup(root) {
    var form = $('[data-an-lookup-form]', root), status = $('[data-an-status]', form);
    $$('[data-an-account-link]', root).forEach(function (a) { var base = PAGES.account || a.getAttribute('href'); a.setAttribute('href', base.split('#')[0] + '#' + a.getAttribute('data-an-account-link')); });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); e.stopPropagation();
      var ref = form.elements.reference, em = form.elements.email;
      var badRef = !/^AN-[A-Z0-9-]{3,20}$/i.test(ref.value.trim()), badEm = !EMAIL_RE.test(em.value.trim());
      fieldError(ref, badRef); fieldError(em, badEm);
      if (badRef || badEm) { (badRef ? ref : em).focus(); return; }
      var btn = $('button[type=submit]', form); btn.disabled = true;
      status.hidden = false; status.className = 'an-form__status'; status.textContent = T.sendingMsg;
      Client.request('lookup', { reference: ref.value.trim().toUpperCase(), email: em.value.trim() }).then(function (r) {
        if (r.demo) {
          status.textContent = r.found ? T.lookupDemoOk : T.lookupDemoNo;
          status.className = 'an-form__status ' + (r.found ? 'is-success' : 'is-error');
          if (r.found) setTimeout(function () { location.href = PAGES.account || '/pages/mon-espace'; }, 900);
        } else { status.textContent = T.lookupNeutral; status.className = 'an-form__status is-success'; form.reset(); }
      }).catch(function (err) { status.textContent = err && err.status === 429 ? T.errRate : T.errServer; status.className = 'an-form__status is-error'; })
        .then(function () { btn.disabled = false; });
    });
  }

  /* ---------------------------------------------------------------- Espace client */
  function initAccount(root) {
    var nav = $('[data-an-account-nav]', root), dialog = $('[data-an-cancel-dialog]', root);
    var data = null, pending = null, opener = null, mode = 'login';
    var h = hashParams();
    if (h.c) { setClientToken(h.c); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* rien */ } }
    function view(name) {
      $$('[data-an-acc-view]', root).forEach(function (v) { v.hidden = v.getAttribute('data-an-acc-view') !== name; });
      nav.hidden = ['appointments', 'info', 'prefs'].indexOf(name) < 0;
      $$('[data-an-tab]', nav).forEach(function (b) { if (b.getAttribute('data-an-tab') === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    }
    function focusTitle(name) { var t = $('[data-an-acc-view="' + name + '"] [tabindex="-1"]', root); if (t) t.focus({ preventScroll: true }); }
    function card(a, upcoming) {
      var l = apptLines(a), allowed = upcoming && C().changeAllowed(rules(), a);
      var photo = $('template[data-an-tpl="photo"]', root);
      var html = '<article class="an-appt' + (a.status === 'canceled' ? ' is-canceled' : '') + '"><div class="an-appt__img">' + (photo ? photo.innerHTML : '') + '</div><div class="an-appt__body">' +
        '<h3 class="an-appt__name">' + esc(l.name) + (a.status === 'canceled' ? ' <span class="an-badge">' + esc(T.canceled) + '</span>' : '') + '</h3><p class="an-muted">' + esc(l.staff) + '</p>' +
        '<p>' + ICONS.calendar + '<span>' + esc(l.when) + '</span></p><p>' + ICONS.clock + '<span>' + esc(l.dur) + '</span></p><p>' + ICONS.tag + '<span>' + esc(l.price) + '</span></p>' +
        '<p class="an-muted an-appt__ref">' + esc(a.number) + '</p>';
      if (upcoming) {
        html += allowed ? '<div class="an-appt__btns"><a class="an-btn an-btn--soft an-btn--sm" href="' + esc((PAGES.move || '/pages/deplacer-mon-rendez-vous') + '#n=' + encodeURIComponent(a.number)) + '">' + esc(T.move) + '</a><button type="button" class="an-btn an-btn--line-terra an-btn--sm" data-cancel="' + esc(a.number) + '">' + esc(T.cancel) + '</button></div>' : '<p class="an-muted">' + esc(T.noChange) + '</p>';
      }
      return html + '</div></article>';
    }
    function renderAppointments() {
      var up = [], past = [];
      data.appts.forEach(function (a) { if (a.status === 'confirmed' && !isPast(a)) up.push(a); else past.push(a); });
      up.sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
      past.sort(function (a, b) { return (a.date + a.time) > (b.date + b.time) ? -1 : 1; });
      $('[data-an-upcoming]', root).innerHTML = up.length ? up.map(function (a) { return card(a, true); }).join('') : $('template[data-an-tpl="empty-upcoming"]', root).innerHTML;
      $('[data-an-past]', root).innerHTML = past.length ? past.map(function (a) { return card(a, false); }).join('') : $('template[data-an-tpl="empty-past"]', root).innerHTML;
      $('[data-an-acc-demo]', root).hidden = !data.demo;
    }
    function fillForms() {
      var c = data.client || {}, info = $('[data-an-info-form]', root), prefs = $('[data-an-prefs-form]', root);
      ['firstName', 'lastName', 'email', 'phone'].forEach(function (k) { if (info.elements[k]) info.elements[k].value = c[k] || ''; });
      var sel = $('[data-an-pref-staff]', prefs);
      sel.innerHTML = '<option value="">' + esc(T.anyStaff) + '</option>' + rules().staff.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>'; }).join('');
      var pr = c.prefs || {};
      sel.value = pr.staff || ''; prefs.elements.note.value = pr.note || ''; prefs.elements.newsletter.checked = !!pr.newsletter; prefs.elements.reminders.checked = !!pr.reminders;
      // Accès « rendez-vous » (lien de la confirmation) : la fiche du client ne s'ouvre qu'avec le lien reçu par e-mail.
      if (data.scope === 'appt') [info, prefs].forEach(function (f) { $$('input, select, textarea, button', f).forEach(function (x) { x.disabled = true; }); var st = $('[data-an-status]', f); st.hidden = false; st.textContent = T.errScope; st.className = 'an-form__status'; });
    }
    function load() {
      return Client.load().then(function (r) {
        if (!r) { showLogin(h.register !== undefined || /register/.test(location.hash) ? 'register' : 'login'); return; }
        if (r.expired) { view('expired'); focusTitle('expired'); return; }
        data = r; renderAppointments(); fillForms();
        var tab = /#(info|prefs)/.exec(location.hash);
        if (/#(login|register)/.test(location.hash) && !LIVE) { showLogin(/register/.test(location.hash) ? 'register' : 'login'); return; }
        view(tab ? tab[1] : 'appointments');
      }).catch(function () { view('error'); focusTitle('error'); });
    }
    function showLogin(m) {
      mode = m; view('login');
      var v = $('[data-an-acc-view="login"]', root);
      if (!v.getAttribute('data-login-title')) { v.setAttribute('data-login-title', $('[data-an-login-title]', v).textContent); v.setAttribute('data-login-text', $('[data-an-login-text]', v).textContent); v.setAttribute('data-login-submit', $('button[type=submit]', v).textContent); }
      $('[data-an-login-title]', v).textContent = m === 'register' ? T.registerTitle : v.getAttribute('data-login-title');
      $('[data-an-login-text]', v).textContent = m === 'register' ? T.registerText : v.getAttribute('data-login-text');
      $('button[type=submit]', v).textContent = m === 'register' ? T.registerSubmit : v.getAttribute('data-login-submit');
      $('[data-an-switch]', v).textContent = m === 'register' ? T.loginSwitch : T.registerSwitch;
      $('[data-an-register-only]', v).hidden = m !== 'register';
    }
    $('[data-an-switch]', root).addEventListener('click', function () { showLogin(mode === 'register' ? 'login' : 'register'); focusTitle('login'); });
    $('[data-an-login-form]', root).addEventListener('submit', function (e) {
      e.preventDefault(); e.stopPropagation();
      var f = e.currentTarget, em = f.elements.email, st = $('[data-an-status]', f), bad = !EMAIL_RE.test(em.value.trim());
      fieldError(em, bad); if (bad) { em.focus(); return; }
      st.hidden = false; st.className = 'an-form__status'; st.textContent = T.sendingMsg;
      Client.request(mode === 'register' ? 'register' : 'login', { email: em.value.trim(), firstName: (f.elements.firstName.value || '').trim() }).then(function (r) {
        if (r.demo) { st.textContent = T.loginDemo; st.className = 'an-form__status is-success'; setTimeout(function () { try { history.replaceState(null, '', location.pathname); } catch (x) { /* rien */ } load(); }, 900); }
        else { st.textContent = mode === 'register' ? T.registerNeutral : T.loginNeutral; st.className = 'an-form__status is-success'; f.reset(); }
      }).catch(function (err) { st.textContent = err && err.status === 429 ? T.errRate : T.errServer; st.className = 'an-form__status is-error'; });
    });
    nav.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-an-logout')) { Client.logout().then(function () { data = null; showLogin('login'); var st = $('[data-an-acc-view="login"] [data-an-status]', root); st.hidden = false; st.className = 'an-form__status'; st.textContent = T.loggedOut; focusTitle('login'); }); return; }
      var t = b.getAttribute('data-an-tab'); view(t); focusTitle(t);
      try { history.replaceState(null, '', location.pathname + (t === 'appointments' ? '' : '#' + t)); } catch (x) { /* rien */ }
    });
    function saver(form, build) {
      form.addEventListener('submit', function (e) {
        e.preventDefault(); e.stopPropagation();
        var st = $('[data-an-status]', form), ok = true;
        $$('input[required]', form).forEach(function (f) { var bad = !f.value.trim(); fieldError(f, bad); if (bad && ok) { ok = false; f.focus(); } });
        if (!ok) return;
        st.hidden = false; st.className = 'an-form__status'; st.textContent = T.sendingMsg;
        Client.save(build(form)).then(function (c) { data.client = c; st.textContent = LIVE ? T.saved : T.savedDemo; st.className = 'an-form__status is-success'; })
          .catch(function (err) { st.textContent = err && err.status === 403 ? T.errScope : T.errServer; st.className = 'an-form__status is-error'; });
      });
    }
    saver($('[data-an-info-form]', root), function (f) { return { firstName: f.elements.firstName.value.trim(), lastName: f.elements.lastName.value.trim(), phone: f.elements.phone.value.trim() }; });
    saver($('[data-an-prefs-form]', root), function (f) { return { prefs: { staff: f.elements.staff.value, note: f.elements.note.value.trim(), newsletter: f.elements.newsletter.checked, reminders: f.elements.reminders.checked } }; });
    // Annulation : panneau de confirmation, « Retour » sans effet, confirmation explicite.
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cancel]');
      if (!b) return;
      pending = data.appts.filter(function (a) { return a.number === b.getAttribute('data-cancel'); })[0];
      if (!pending) return;
      opener = b;
      $('[data-an-cancel-appt]', dialog).innerHTML = cancelSummary(pending);
      var terms = termsText(); if (terms) $('[data-an-terms]', dialog).textContent = terms;
      $('[data-an-cancel-status]', dialog).hidden = true;
      dialog.hidden = false; document.documentElement.classList.add('an-lock');
      $('[data-an-cancel-back]', dialog).focus();
    });
    function closeDialog() { dialog.hidden = true; document.documentElement.classList.remove('an-lock'); if (opener && document.body.contains(opener)) opener.focus(); }
    $('[data-an-cancel-back]', dialog).addEventListener('click', closeDialog);
    dialog.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDialog(); else if (e.key === 'Tab') trap(e, dialog); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) closeDialog(); });
    $('[data-an-cancel-confirm]', dialog).addEventListener('click', function (e) {
      var btn = e.currentTarget, st = $('[data-an-cancel-status]', dialog);
      if (!pending || btn.disabled) return;
      btn.disabled = true;
      Client.cancel(pending.number).then(function () {
        pending.status = 'canceled'; renderAppointments(); closeDialog();
        var live = $('[data-an-acc-demo]', root);
        if (live) { live.hidden = false; live.textContent = LIVE ? T.canceledLive : T.canceledDemo; }
      }).catch(function () { st.hidden = false; st.textContent = T.errServer; }).then(function () { btn.disabled = false; });
    });
    $('[data-an-retry]', root).addEventListener('click', load);
    load();
  }

  /* ---------------------------------------------------------------- Déplacer un rendez-vous */
  function initMove(root) {
    var number = hashParams().n || '';
    var body = $('[data-an-move-body]', root), missing = $('[data-an-move-missing]', root), aside = $('[data-an-move-cancel]', root);
    var appt = null, pick = { date: '', time: '' }, cal = null;
    function fillCurrent() {
      var l = apptLines(appt);
      $('[data-an-cur="service"]', root).textContent = l.name;
      $('[data-an-cur="staff"]', root).textContent = '— ' + l.staff;
      $('[data-an-cur="when"]', root).textContent = l.when;
      $('[data-an-cur="duration-price"]', root).textContent = l.dur + ' — ' + l.price;
      $('[data-an-cancel-appt]', aside).innerHTML = cancelSummary(appt);
      var terms = termsText(); if (terms) $('[data-an-terms]', aside).textContent = terms;
      $('[data-an-move-facts]', root).innerHTML = esc(fmt(T.durationLine, { d: l.dur })) + '<br>' + esc(fmt(T.priceLine, { p: l.price }));
    }
    var slotsBox = $('[data-an-slots]', root), title = $('[data-an-day-title]', root), noSlot = $('[data-an-no-slot]', root);
    function q() { return { service: appt.service, staff: appt.staff, length: appt.length, except: appt.number }; }
    function loadSlots() {
      title.textContent = fmt(T.availableOn, { date: dateText(pick.date, true) });
      return Data.slots({ date: pick.date, service: appt.service, staff: appt.staff, length: appt.length, except: appt.number }).then(function (s) {
        var free = slotButtons(slotsBox, s, pick.time);
        noSlot.hidden = free.length > 0;
      });
    }
    slotsBox.addEventListener('click', function (e) {
      var b = e.target.closest('[data-time]'); if (!b) return;
      pick.time = b.getAttribute('data-time');
      $$('[data-time]', slotsBox).forEach(function (x) { var on = x === b; x.classList.toggle('is-selected', on); x.setAttribute('aria-checked', on); });
    });
    var status = $('[data-an-move-status]', root), done = $('[data-an-move-done]', root);
    $('[data-an-move-confirm]', root).addEventListener('click', function (e) {
      var btn = e.currentTarget;
      if (btn.disabled) return;
      status.hidden = true;
      if (!pick.date || !pick.time) { status.hidden = false; status.textContent = T.chooseNew; return; }
      btn.disabled = true;
      Client.move(appt.number, pick.date, pick.time).then(function (a) {
        appt.date = a.date; appt.time = a.time; fillCurrent();
        done.hidden = false; $('[data-an-move-done-text]', root).textContent = fmt(LIVE ? T.movedLive : T.movedDemo, { when: dateText(appt.date, true) + ' ' + T.at + ' ' + timeText(appt.time) });
        pick.time = ''; return loadSlots();
      }).catch(function (err) {
        status.hidden = false;
        status.textContent = err && err.status === 409 ? fmt(T.conflictText, { date: dateText(pick.date, true), time: timeText(pick.time) }) : T.errServer;
        pick.time = ''; return loadSlots();
      }).then(function () { btn.disabled = false; });
    });
    $('[data-an-cancel-confirm]', aside).addEventListener('click', function (e) {
      var btn = e.currentTarget, st = $('[data-an-cancel-status]', aside);
      if (btn.disabled) return;
      btn.disabled = true;
      Client.cancel(appt.number).then(function () {
        st.hidden = false; st.textContent = LIVE ? T.canceledLive : T.canceledDemo;
        body.hidden = true; aside.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
      }).catch(function () { st.hidden = false; st.textContent = T.errServer; btn.disabled = false; });
    });
    Client.load().then(function (r) {
      appt = r && r.appts ? r.appts.filter(function (a) { return a.number === number && a.status === 'confirmed' && !isPast(a); })[0] : null;
      if (!appt) { missing.hidden = false; return; }
      body.hidden = false; aside.hidden = false;
      fillCurrent();
      if (!C().changeAllowed(rules(), appt)) { status.hidden = false; status.textContent = T.noChange; $('[data-an-move-confirm]', root).disabled = true; $('[data-an-cancel-confirm]', aside).disabled = true; }
      pick.date = appt.date;
      cal = new Calendar($('[data-an-cal]', root), { date: appt.date, compact: true, query: q, onSelect: function (d) { pick.date = d; pick.time = ''; loadSlots(); } });
      cal.select(appt.date).then(loadSlots);
    }).catch(function () { missing.hidden = false; });
  }

  /* ---------------------------------------------------------------- Démarrage */
  function onPage(key) { try { return !!PAGE_URLS[key] && new URL(PAGE_URLS[key]).pathname === location.pathname; } catch (e) { return false; } }
  function start() {
    if (!C()) return;
    syncPrices();
    initAccordions(); initFilters(); initCarousels(); initCollapse(); initLightbox(); initLengths(); initMaps(); initRequests(); initCookies();
    var b = $('[data-an-booking]'); if (b) { document.body.classList.add('an-page-booking'); initBooking(b); }
    var l = $('[data-an-lookup]'); if (l) initLookup(l);
    var a = $('[data-an-account]'); if (a) initAccount(a);
    var m = $('[data-an-move]'); if (m) initMove(m);
    if (onPage('book')) document.body.classList.add('an-page-booking');
    if ($('[data-an-bookbar]')) document.body.classList.add('an-has-bookbar');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
