/*
 * TABLE SAISON — cœur du calcul des réservations (issue #175), sans dépendance.
 * Le même fichier sert au navigateur (window.TableSaisonCore, démonstration et formulaire du site) et au serveur
 * du studio (src/lib/restaurant/booking.ts, service réel) : une seule règle pour les dates possibles, les services,
 * les fermetures, la capacité et le fuseau horaire du restaurant.
 *
 * Réglages (cfg) :
 *   timezone    fuseau du restaurant (ex. « Europe/Paris ») : « aujourd'hui » et « maintenant » sont lus dans ce fuseau
 *   openDays    jours d'ouverture, 0 = dimanche … 6 = samedi
 *   closures    dates fermées « AAAA-MM-JJ » ou périodes « AAAA-MM-JJ..AAAA-MM-JJ »
 *   services    [{ id, label, slots: ["12:00", …], days?: [0..6] }]
 *   capacity    couverts par créneau
 *   minParty / maxParty   personnes par réservation en ligne
 *   horizonDays nombre de jours réservables à l'avance
 *   leadMinutes délai minimal avant un créneau du jour même
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TableSaisonCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DAYS = { fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] };
  var DAYS_SHORT = { fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] };
  var MONTHS = { fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }
  function isTime(s) { return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s); }
  function parts(s) { var p = s.split('-'); return { y: +p[0], m: +p[1], d: +p[2] }; }
  function toUtcDays(s) { var p = parts(s); return Math.floor(Date.UTC(p.y, p.m - 1, p.d) / 86400000); }
  function fromUtcDays(n) { var d = new Date(n * 86400000); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function addDays(s, n) { return fromUtcDays(toUtcDays(s) + n); }
  function weekday(s) { return new Date(toUtcDays(s) * 86400000).getUTCDay(); }
  function minutes(t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; }

  /** Date et minute courantes dans le fuseau du restaurant. */
  function nowIn(timezone, now) {
    var at = now instanceof Date ? now : new Date(now == null ? Date.now() : now);
    var f;
    try { f = new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); }
    catch (e) { f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); }
    var o = {};
    f.formatToParts(at).forEach(function (p) { o[p.type] = p.value; });
    return { date: o.year + '-' + o.month + '-' + o.day, minute: (+o.hour % 24) * 60 + +o.minute };
  }

  /** Réglages complétés et nettoyés (valeurs invalides ignorées, jamais d'exception). */
  function normalize(raw) {
    var c = raw || {};
    var services = (Array.isArray(c.services) ? c.services : []).map(function (s, i) {
      return { id: String(s.id || 'service-' + (i + 1)), label: String(s.label || ''), slots: (Array.isArray(s.slots) ? s.slots : []).filter(isTime).sort(), days: Array.isArray(s.days) ? s.days.filter(function (d) { return d >= 0 && d <= 6; }) : null };
    }).filter(function (s) { return s.slots.length; });
    var int = function (v, d, lo, hi) { v = parseInt(v, 10); if (isNaN(v)) v = d; return Math.max(lo, Math.min(hi, v)); };
    var minParty = int(c.minParty, 1, 1, 50);
    return {
      timezone: String(c.timezone || 'Europe/Paris'),
      openDays: (Array.isArray(c.openDays) ? c.openDays : [0, 1, 2, 3, 4, 5, 6]).filter(function (d) { return d >= 0 && d <= 6; }),
      closures: (Array.isArray(c.closures) ? c.closures : []).map(String).filter(function (x) { var r = x.split('..'); return isDate(r[0]) && (r.length === 1 || isDate(r[1])); }),
      services: services,
      capacity: int(c.capacity, 30, 1, 2000),
      minParty: minParty,
      maxParty: Math.max(minParty, int(c.maxParty, 8, 1, 200)),
      horizonDays: int(c.horizonDays, 60, 1, 730),
      leadMinutes: int(c.leadMinutes, 60, 0, 7 * 24 * 60)
    };
  }

  /** Une liste « 2026-12-24, 2026-12-25..2027-01-02 » (saisie du studio) devient la liste des fermetures. */
  function parseClosures(text) {
    return String(text || '').split(/[\s,;]+/).map(function (x) { return x.trim(); }).filter(function (x) { var r = x.split('..'); return isDate(r[0]) && (r.length === 1 || isDate(r[1])); });
  }

  function closedOn(cfg, date) {
    return cfg.closures.some(function (c) {
      var r = c.split('..');
      return r.length === 1 ? r[0] === date : date >= r[0] && date <= r[1];
    });
  }

  /** État d'une date : « past », « beyond » (au-delà de l'horizon), « closed » ou « open ». */
  function dateStatus(raw, date, now) {
    var cfg = normalize(raw);
    if (!isDate(date)) return 'invalid';
    var today = nowIn(cfg.timezone, now).date;
    if (date < today) return 'past';
    if (toUtcDays(date) - toUtcDays(today) > cfg.horizonDays) return 'beyond';
    if (cfg.openDays.indexOf(weekday(date)) < 0 || closedOn(cfg, date)) return 'closed';
    var any = cfg.services.some(function (s) { return !s.days || s.days.indexOf(weekday(date)) >= 0; });
    return any ? 'open' : 'closed';
  }

  /**
   * Créneaux d'une date pour un groupe : chaque service avec ses heures, et pour chaque heure la disponibilité.
   * `booked` : couverts déjà pris par heure (« 19:30 » → 12). Raison d'indisponibilité : « past », « full ».
   */
  function slotsFor(raw, date, party, booked, now) {
    var cfg = normalize(raw);
    var status = dateStatus(cfg, date, now);
    if (status !== 'open') return [];
    var cur = nowIn(cfg.timezone, now);
    var taken = booked || {};
    return cfg.services.filter(function (s) { return !s.days || s.days.indexOf(weekday(date)) >= 0; }).map(function (s) {
      return {
        id: s.id,
        label: s.label,
        slots: s.slots.map(function (t) {
          var reason = null;
          if (date === cur.date && minutes(t) < cur.minute + cfg.leadMinutes) reason = 'past';
          else if ((taken[t] || 0) + party > cfg.capacity) reason = 'full';
          return { time: t, available: !reason, reason: reason };
        })
      };
    });
  }

  /** Vérifie une demande complète ; renvoie la liste des erreurs (codes) — vide si la demande est recevable. */
  function validate(raw, req, booked, now) {
    var cfg = normalize(raw), errors = [];
    var party = parseInt(req && req.party, 10);
    if (!(party >= cfg.minParty && party <= cfg.maxParty)) errors.push('party');
    var st = dateStatus(cfg, req && req.date, now);
    if (st !== 'open') errors.push('date_' + st);
    if (!isTime(req && req.time)) errors.push('time');
    if (!errors.length) {
      var slot = null;
      slotsFor(cfg, req.date, party, booked, now).forEach(function (s) { s.slots.forEach(function (x) { if (x.time === req.time) slot = x; }); });
      if (!slot) errors.push('time');
      else if (!slot.available) errors.push('slot_' + slot.reason);
    }
    var c = (req && req.contact) || null;
    if (c) {
      if (!String(c.firstName || '').trim()) errors.push('firstName');
      if (!String(c.lastName || '').trim()) errors.push('lastName');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(c.email || '').trim())) errors.push('email');
      if (c.phone && !/^[+()\d .-]{6,24}$/.test(String(c.phone))) errors.push('phone');
      if (!c.terms) errors.push('terms');
    }
    return errors;
  }

  /** Grille d'un mois (lundi en premier) : 6 semaines au plus, cases vides = null. */
  function monthGrid(year, month) {
    var first = year + '-' + pad(month) + '-01';
    var lead = (weekday(first) + 6) % 7;
    var days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    var cells = [];
    for (var i = 0; i < lead; i++) cells.push(null);
    for (var d = 1; d <= days; d++) cells.push(year + '-' + pad(month) + '-' + pad(d));
    while (cells.length % 7) cells.push(null);
    return cells;
  }

  function lang(l) { return l === 'en' ? 'en' : 'fr'; }
  /** « Mardi 10 novembre 2026 » / « Tuesday 10 November 2026 ». */
  function formatDate(date, l) {
    if (!isDate(date)) return '';
    var p = parts(date), k = lang(l);
    return DAYS[k][weekday(date)] + ' ' + p.d + ' ' + MONTHS[k][p.m - 1] + ' ' + p.y;
  }
  function monthLabel(year, month, l) { var k = lang(l), m = MONTHS[k][month - 1]; return (k === 'fr' ? m.charAt(0).toUpperCase() + m.slice(1) : m) + ' ' + year; }
  /** « 19h30 » en français, « 7:30 pm » n'est pas utilisé : la carte garde l'heure du restaurant (« 19:30 »). */
  function formatTime(t, l) { return isTime(t) ? (lang(l) === 'fr' ? t.replace(':', 'h') : t) : ''; }

  /** Adresse masquée : « j*****@exemple.com ». */
  function maskEmail(email) {
    var e = String(email || ''), at = e.indexOf('@');
    if (at < 1) return '';
    return e.charAt(0) + '*****' + e.slice(at);
  }

  function icsEscape(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
  /** Fichier d'agenda (ICS) d'une réservation, heure locale du restaurant (TZID), durée 2 h par défaut. */
  function ics(res, opts) {
    var o = opts || {};
    var start = res.date.replace(/-/g, '') + 'T' + res.time.replace(':', '') + '00';
    var endMin = minutes(res.time) + (o.durationMinutes || 120);
    var endDate = endMin >= 1440 ? addDays(res.date, 1) : res.date;
    var end = endDate.replace(/-/g, '') + 'T' + pad(Math.floor((endMin % 1440) / 60)) + pad(endMin % 60) + '00';
    var stamp = new Date(o.now == null ? Date.now() : o.now).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//E-COM STUDIO IA//Table Saison//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + icsEscape(res.number || 'reservation') + '@table-saison',
      'DTSTAMP:' + stamp,
      'DTSTART;TZID=' + (o.timezone || 'Europe/Paris') + ':' + start,
      'DTEND;TZID=' + (o.timezone || 'Europe/Paris') + ':' + end,
      'SUMMARY:' + icsEscape(o.summary || 'Réservation'),
      'LOCATION:' + icsEscape(o.location || ''),
      'DESCRIPTION:' + icsEscape(o.description || ''),
      'END:VEVENT', 'END:VCALENDAR', ''
    ].join('\r\n');
  }

  return { normalize: normalize, parseClosures: parseClosures, nowIn: nowIn, dateStatus: dateStatus, slotsFor: slotsFor, validate: validate, monthGrid: monthGrid, addDays: addDays, weekday: weekday, formatDate: formatDate, formatTime: formatTime, monthLabel: monthLabel, maskEmail: maskEmail, ics: ics, isDate: isDate, isTime: isTime, DAYS_SHORT: DAYS_SHORT };
});
