/*
 * ATELIER NUANCE (issue #177) : calcul des rendez-vous d'un salon, commun au site (navigateur) et au service réel du
 * studio (src/lib/salon/booking.ts). Une seule règle : horaires d'ouverture par jour, fermetures, durée de chaque
 * prestation, jours de travail et compétences de chaque professionnel, rendez-vous déjà pris sur TOUTE leur durée,
 * délai minimal et horizon de réservation, dans le fuseau horaire du salon.
 *
 * Les minutes sont comptées depuis minuit (540 = 9 h 00). Un « agenda occupé » est { idProfessionnel: [[début, fin], …] }.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.AtelierNuanceCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DAY_MS = 86400000;
  var MONTHS = {
    fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  };
  var DAYS = {
    fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  };
  var DAYS_SHORT = { fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] };
  var CATEGORIES = ['coupe', 'couleur', 'coiffage', 'soin'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z')); }
  function isTime(s) { return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s); }
  function toMin(s) { return isTime(s) ? Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5)) : NaN; }
  function toTime(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function int(v, d, min, max) { var n = v === '' || v == null ? d : Math.round(Number(v)); if (!isFinite(n)) n = d; return Math.min(max, Math.max(min, n)); }
  function str(v) { return typeof v === 'string' ? v.trim() : ''; }
  function slug(v) { return str(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48); }
  function list(v) { return (Array.isArray(v) ? v : String(v == null ? '' : v).split(/[\s,;]+/)).map(function (x) { return slug(String(x)); }).filter(Boolean); }

  /** Jour de la semaine (0 = dimanche) d'une date AAAA-MM-JJ. */
  function weekday(date) { return new Date(date + 'T00:00:00Z').getUTCDay(); }
  function addDays(date, n) { return new Date(Date.parse(date + 'T00:00:00Z') + n * DAY_MS).toISOString().slice(0, 10); }
  function daysBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY_MS); }

  /** Date et minute courantes dans le fuseau du salon (jamais celui du visiteur ni du serveur). */
  function nowIn(timezone, at) {
    var d = new Date(at == null ? Date.now() : at);
    try {
      var parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d);
      var get = function (t) { for (var i = 0; i < parts.length; i++) if (parts[i].type === t) return parts[i].value; return '00'; };
      return { date: get('year') + '-' + get('month') + '-' + get('day'), minute: Number(get('hour')) % 24 * 60 + Number(get('minute')) };
    } catch (e) {
      return { date: d.toISOString().slice(0, 10), minute: d.getUTCHours() * 60 + d.getUTCMinutes() };
    }
  }

  /** « 09:00-12:30, 13:30-19:00 » → [[540, 750], [810, 1140]] ; vide ou « fermé » → [] (jour fermé). */
  function parseHours(text) {
    var out = [];
    String(text == null ? '' : text).split(/[,;]+/).forEach(function (part) {
      var m = /([01]?\d|2[0-3])[:h.]?([0-5]\d)?\s*[-–à]+\s*([01]?\d|2[0-4])[:h.]?([0-5]\d)?/.exec(part.trim());
      if (!m) return;
      var a = Number(m[1]) * 60 + Number(m[2] || 0), b = Number(m[3]) * 60 + Number(m[4] || 0);
      if (b > a) out.push([a, Math.min(b, 1440)]);
    });
    return out.sort(function (x, y) { return x[0] - y[0]; });
  }

  /** « 2026-12-24..2026-12-26, 2027-01-01 » → liste de dates fermées. */
  function parseClosures(text) {
    var out = [];
    String(text == null ? '' : text).split(/[\s,;]+/).forEach(function (part) {
      var r = /^(\d{4}-\d{2}-\d{2})(?:\.\.(\d{4}-\d{2}-\d{2}))?$/.exec(part.trim());
      if (!r || !isDate(r[1])) return;
      var end = r[2] && isDate(r[2]) ? r[2] : r[1];
      for (var d = r[1], i = 0; d <= end && i < 400; d = addDays(d, 1), i++) out.push(d);
    });
    return out;
  }

  /** Configuration du salon, nettoyée et bornée (le serveur la relit dans le thème enregistré, jamais dans le navigateur). */
  function normalize(raw) {
    raw = raw || {};
    var hours = {};
    for (var d = 0; d < 7; d++) {
      var h = raw.hours && raw.hours[d] != null ? raw.hours[d] : [];
      hours[d] = typeof h === 'string' ? parseHours(h) : (Array.isArray(h) ? h.filter(function (x) { return Array.isArray(x) && x[1] > x[0]; }).map(function (x) { return [int(x[0], 0, 0, 1440), int(x[1], 0, 0, 1440)]; }) : []);
    }
    var services = (Array.isArray(raw.services) ? raw.services : []).map(function (s) {
      var lengths = {};
      ['short', 'mid', 'long'].forEach(function (k) {
        var l = s && s.lengths && s.lengths[k];
        if (l && (l.price != null || l.duration != null)) lengths[k] = { price: l.price === '' || l.price == null ? null : Number(l.price), duration: l.duration === '' || l.duration == null ? null : int(l.duration, 0, 5, 600) };
      });
      return {
        id: slug(s && (s.id || s.name)), name: str(s && s.name), category: CATEGORIES.indexOf(slug(s && s.category)) >= 0 ? slug(s.category) : 'coupe',
        short: str(s && s.short), duration: s && s.duration !== '' && s.duration != null && Number(s.duration) > 0 ? int(s.duration, 60, 5, 600) : null, price: s && s.price !== '' && s.price != null && isFinite(Number(s.price)) ? Number(s.price) : null,
        priceFrom: !!(s && s.priceFrom), lengths: lengths, url: str(s && s.url), image: str(s && s.image)
      };
    }).filter(function (s) { return s.id && s.name; });
    var staff = (Array.isArray(raw.staff) ? raw.staff : []).map(function (p) {
      var days = list(p && p.days).map(Number).filter(function (n) { return n >= 0 && n <= 6; });
      return { id: slug(p && (p.id || p.name)), name: str(p && p.name), initial: str(p && p.initial) || str(p && p.name).charAt(0).toUpperCase(), title: str(p && p.title), skills: list(p && p.skills), days: days.length ? days : null, hours: p && p.hours ? parseHours(p.hours) : null };
    }).filter(function (p) { return p.id && p.name; });
    return {
      timezone: str(raw.timezone) || 'Europe/Paris',
      hours: hours,
      closures: Array.isArray(raw.closures) ? raw.closures.filter(isDate) : parseClosures(raw.closures),
      step: int(raw.step, 30, 5, 120),
      horizonDays: int(raw.horizonDays, 90, 1, 365),
      leadMinutes: int(raw.leadMinutes, 120, 0, 10080),
      cancelHours: int(raw.cancelHours, 0, 0, 720),
      services: services,
      staff: staff
    };
  }

  function serviceById(cfg, id) { for (var i = 0; i < cfg.services.length; i++) if (cfg.services[i].id === id) return cfg.services[i]; return null; }
  function staffById(cfg, id) { for (var i = 0; i < cfg.staff.length; i++) if (cfg.staff[i].id === id) return cfg.staff[i]; return null; }

  /** Durée et prix d'une prestation selon la longueur choisie (valeurs définies par le salon, jamais calculées au hasard). */
  function offer(svc, length) {
    var l = svc && length && svc.lengths[length];
    return { duration: l && l.duration ? l.duration : svc.duration, price: l && l.price != null && isFinite(l.price) ? l.price : svc.price, priceFrom: svc.priceFrom };
  }

  /** Professionnels qui savent réaliser la prestation (compétence = identifiant de la prestation ou sa catégorie). */
  function staffFor(cfg, serviceId) {
    var svc = serviceById(cfg, serviceId);
    if (!svc) return [];
    return cfg.staff.filter(function (p) { return !p.skills.length || p.skills.indexOf(svc.id) >= 0 || p.skills.indexOf(svc.category) >= 0; });
  }

  /** Statut d'une date pour le salon : past, closed, beyond (au-delà de l'horizon) ou open. */
  function dateStatus(cfg, date, at) {
    if (!isDate(date)) return 'invalid';
    var today = nowIn(cfg.timezone, at).date;
    if (date < today) return 'past';
    if (daysBetween(today, date) > cfg.horizonDays) return 'beyond';
    if (cfg.closures.indexOf(date) >= 0 || !cfg.hours[weekday(date)].length) return 'closed';
    return 'open';
  }

  function overlaps(list, a, b) {
    for (var i = 0; list && i < list.length; i++) if (list[i][0] < b && a < list[i][1]) return true;
    return false;
  }

  function worksAt(cfg, person, date, a, b) {
    if (person.days && person.days.indexOf(weekday(date)) < 0) return false;
    var windows = person.hours && person.hours.length ? person.hours : cfg.hours[weekday(date)];
    for (var i = 0; i < windows.length; i++) if (windows[i][0] <= a && b <= windows[i][1]) return true;
    return false;
  }

  /**
   * Créneaux d'une date pour une prestation : chaque heure de départ (pas du salon) dont TOUTE la durée tient dans les
   * horaires, le jour de travail du professionnel et ses rendez-vous déjà pris. staffId = 'any' : « Sans préférence ».
   * Rend [{ time, available, staff: [professionnels libres], reason: null | 'past' | 'busy' }].
   */
  function slotsFor(cfg, opts, at) {
    var svc = serviceById(cfg, opts.service);
    if (!svc || dateStatus(cfg, opts.date, at) !== 'open') return [];
    var duration = offer(svc, opts.length).duration;
    // Durée inconnue (non réglée par le salon) : aucun créneau proposé, jamais une durée supposée.
    if (!duration) return [];
    var people = staffFor(cfg, svc.id).filter(function (p) { return !opts.staff || opts.staff === 'any' || p.id === opts.staff; });
    if (!people.length) return [];
    var busy = opts.busy || {};
    var now = nowIn(cfg.timezone, at);
    var windows = cfg.hours[weekday(opts.date)];
    var out = [], seen = {};
    for (var w = 0; w < windows.length; w++) {
      for (var t = windows[w][0]; t + duration <= windows[w][1]; t += cfg.step) {
        if (seen[t]) continue;
        seen[t] = true;
        var tooSoon = opts.date === now.date && t < now.minute + cfg.leadMinutes;
        var free = people.filter(function (p) { return worksAt(cfg, p, opts.date, t, t + duration) && !overlaps(busy[p.id], t, t + duration); }).map(function (p) { return p.id; });
        var works = people.some(function (p) { return worksAt(cfg, p, opts.date, t, t + duration); });
        if (!works) continue;
        out.push({ time: toTime(t), available: !tooSoon && free.length > 0, staff: tooSoon ? [] : free, reason: tooSoon ? 'past' : free.length ? null : 'busy' });
      }
    }
    return out.sort(function (a, b) { return a.time < b.time ? -1 : 1; });
  }

  /** Statut d'une date pour le calendrier : comme dateStatus, plus « full » quand aucun créneau ne reste. */
  function dayStatus(cfg, opts, at) {
    var st = dateStatus(cfg, opts.date, at);
    if (st !== 'open') return st;
    return slotsFor(cfg, opts, at).some(function (s) { return s.available; }) ? 'open' : 'full';
  }

  /** Attribution réelle pour « Sans préférence » : le professionnel libre le moins occupé ce jour-là, puis l'ordre de l'équipe. */
  function assign(cfg, freeIds, busy) {
    var best = null, bestLoad = Infinity;
    cfg.staff.forEach(function (p) {
      if (freeIds.indexOf(p.id) < 0) return;
      var load = (busy && busy[p.id] || []).reduce(function (s, x) { return s + (x[1] - x[0]); }, 0);
      if (load < bestLoad) { best = p.id; bestLoad = load; }
    });
    return best;
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_RE = /^[+()\d][\d\s().-]{5,22}$/;

  /**
   * Vérifie une demande complète. Rend la liste des erreurs : service, staff, length, date, time, slot_taken,
   * firstName, lastName, email, phone, terms. `contact` absent : seul le créneau est vérifié (déplacement).
   */
  function validate(cfg, req, busy, at) {
    var errors = [];
    req = req || {};
    var svc = serviceById(cfg, req.service);
    if (!svc || !svc.duration) errors.push('service');
    if (req.length && ['short', 'mid', 'long'].indexOf(req.length) < 0) errors.push('length');
    var staffOk = !req.staff || req.staff === 'any' || (svc && staffFor(cfg, svc.id).some(function (p) { return p.id === req.staff; }));
    if (!staffOk) errors.push('staff');
    var st = dateStatus(cfg, req.date, at);
    if (st !== 'open') errors.push('date');
    if (!isTime(req.time)) errors.push('time');
    if (svc && staffOk && st === 'open' && isTime(req.time)) {
      var slot = slotsFor(cfg, { date: req.date, service: svc.id, staff: req.staff || 'any', length: req.length, busy: busy }, at).filter(function (s) { return s.time === req.time; })[0];
      if (!slot) errors.push('time');
      else if (!slot.available) errors.push('slot_taken');
    }
    var c = req.contact;
    if (c) {
      if (!str(c.firstName)) errors.push('firstName');
      if (!str(c.lastName)) errors.push('lastName');
      if (!EMAIL_RE.test(str(c.email))) errors.push('email');
      if (!PHONE_RE.test(str(c.phone))) errors.push('phone');
      if (c.terms !== true) errors.push('terms');
    }
    return errors;
  }

  /** Une annulation ou un déplacement est-il encore permis (délai réglé par le salon, 0 = jusqu'à l'heure du rendez-vous) ? */
  function changeAllowed(cfg, appt, at) {
    var now = nowIn(cfg.timezone, at);
    var minutesLeft = daysBetween(now.date, appt.date) * 1440 + toMin(appt.time) - now.minute;
    return minutesLeft > cfg.cancelHours * 60;
  }

  /** Grille d'un mois, lundi en premier : dates AAAA-MM-JJ ou null pour les cases vides. */
  function monthGrid(year, month) {
    var first = year + '-' + pad(month) + '-01';
    var lead = (weekday(first) + 6) % 7;
    var days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    var out = [];
    for (var i = 0; i < lead; i++) out.push(null);
    for (var d = 1; d <= days; d++) out.push(year + '-' + pad(month) + '-' + pad(d));
    while (out.length % 7) out.push(null);
    return out;
  }

  function lc(lang) { return lang === 'en' ? 'en' : 'fr'; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  /** « Mardi 10 novembre 2026 » / « Tuesday 10 November 2026 ». */
  function formatDate(date, lang, lower) {
    if (!isDate(date)) return '';
    var L = lc(lang), d = new Date(date + 'T00:00:00Z');
    var s = DAYS[L][d.getUTCDay()] + ' ' + d.getUTCDate() + ' ' + MONTHS[L][d.getUTCMonth()] + ' ' + d.getUTCFullYear();
    return lower && L === 'fr' ? s : cap(s);
  }
  function monthLabel(year, month, lang) { return cap(MONTHS[lc(lang)][month - 1]) + ' ' + year; }
  /** « 14h00 » en français, « 14:00 » en anglais. */
  function formatTime(time, lang) { return isTime(time) ? (lc(lang) === 'en' ? time : time.replace(':', 'h')) : ''; }
  /** 45 → « 45 min », 60 → « 1 h », 105 → « 1 h 45 », 150 → « 2 h 30 » (et « 45 minutes » en version longue). */
  function formatDuration(min, lang, long) {
    min = Math.round(Number(min) || 0);
    var h = Math.floor(min / 60), m = min % 60;
    if (long && !h) return min + (lc(lang) === 'en' ? ' minutes' : ' minutes');
    if (!h) return min + ' min';
    return h + ' h' + (m ? ' ' + pad(m) : '');
  }
  /** « 45 € », « À partir de 120 € » ; prix absent : chaîne vide (jamais un prix inventé). */
  function formatPrice(price, from, lang) {
    if (price == null || !isFinite(price)) return '';
    var n = Math.round(price * 100) / 100;
    var s = (n % 1 ? n.toFixed(2).replace('.', lc(lang) === 'en' ? '.' : ',') : String(n));
    var v = lc(lang) === 'en' ? '€' + s : s + ' €';
    return from ? (lc(lang) === 'en' ? 'From ' : 'À partir de ') + v : v;
  }
  function maskEmail(email) {
    var m = /^([^@]+)@(.+)$/.exec(str(email));
    if (!m) return '';
    return m[1].charAt(0) + new Array(Math.max(2, m[1].length)).join('*') + '@' + m[2];
  }

  /** Fichier d'agenda (.ics) à l'heure du salon. */
  function ics(appt, opts) {
    opts = opts || {};
    var tz = opts.timezone || 'Europe/Paris';
    var stamp = new Date(opts.now == null ? Date.now() : opts.now).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var start = toMin(appt.time), end = start + (Number(appt.duration) || 60);
    var day = appt.date.replace(/-/g, '');
    var endDay = end >= 1440 ? addDays(appt.date, 1).replace(/-/g, '') : day;
    var esc = function (s) { return String(s || '').replace(/\\/g, '\\\\').replace(/[,;]/g, function (c) { return '\\' + c; }).replace(/\n/g, '\\n'); };
    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Atelier Nuance//Rendez-vous//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + appt.number + '@atelier-nuance',
      'DTSTAMP:' + stamp,
      'DTSTART;TZID=' + tz + ':' + day + 'T' + appt.time.replace(':', '') + '00',
      'DTEND;TZID=' + tz + ':' + endDay + 'T' + toTime(end % 1440).replace(':', '') + '00',
      'SUMMARY:' + esc(opts.summary || appt.serviceName || 'Rendez-vous'),
      opts.location ? 'LOCATION:' + esc(opts.location) : '',
      opts.description ? 'DESCRIPTION:' + esc(opts.description) : '',
      'END:VEVENT', 'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');
  }

  /**
   * Agenda de DÉMONSTRATION (jamais utilisé par le service réel) : des rendez-vous fictifs déterministes pour que le
   * calendrier montre des créneaux pris et des jours complets. Le mardi 10 novembre 2026, Camille reproduit les créneaux
   * de la planche 02 (9 h 00, 10 h 30, 14 h 00, 15 h 30 pour une prestation de 45 minutes).
   */
  function demoAgenda(cfg, date) {
    var busy = {};
    var seed = 0;
    for (var i = 0; i < date.length; i++) seed = (seed * 31 + date.charCodeAt(i)) % 9973;
    var day = Number(date.slice(8, 10));
    cfg.staff.forEach(function (p, idx) {
      if (date === '2026-11-10' && idx === 0) { busy[p.id] = [[585, 630], [675, 840], [885, 930], [975, 1140]]; return; }
      // Un jour sur onze environ : agenda complet pour toute l'équipe (« jour complet »).
      if (day % 11 === 7) { busy[p.id] = [[0, 1440]]; return; }
      var s = (seed + idx * 37) % 97;
      var list = [];
      var base = 540 + (s % 4) * 30;
      list.push([base, base + 60 + (s % 3) * 30]);
      list.push([720 + (s % 2) * 30, 810 + (s % 2) * 30]);
      list.push([900 + (s % 5) * 30, 990 + (s % 5) * 30]);
      if (s % 3 === 0) list.push([1050, 1140]);
      busy[p.id] = list;
    });
    return busy;
  }

  return {
    CATEGORIES: CATEGORIES, DAYS_SHORT: DAYS_SHORT,
    normalize: normalize, parseHours: parseHours, parseClosures: parseClosures, nowIn: nowIn, dateStatus: dateStatus, dayStatus: dayStatus,
    serviceById: serviceById, staffById: staffById, staffFor: staffFor, offer: offer, slotsFor: slotsFor, assign: assign, validate: validate,
    changeAllowed: changeAllowed, monthGrid: monthGrid, weekday: weekday, addDays: addDays, toMin: toMin, toTime: toTime,
    formatDate: formatDate, monthLabel: monthLabel, formatTime: formatTime, formatDuration: formatDuration, formatPrice: formatPrice,
    maskEmail: maskEmail, ics: ics, isDate: isDate, isTime: isTime, demoAgenda: demoAgenda
  };
});
