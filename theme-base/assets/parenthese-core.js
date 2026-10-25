/*
 * PARENTHÈSE (cabinet de sophrologie) : calcul des rendez-vous, commun au site (navigateur) et au service réel du studio
 * (src/lib/cabinet/booking.ts). Une seule règle :
 *  - séances individuelles (première séance, suivi…) : durée et tarif de la prestation, modalités proposées (cabinet,
 *    visioconférence), horaires du cabinet par jour, fermetures, délai minimal et horizon, dans le fuseau du cabinet ; une
 *    seule praticienne : un créneau est libre si TOUTE la durée tient dans les horaires sans chevaucher un rendez-vous ni
 *    un atelier ;
 *  - ateliers collectifs : une date, une heure, une durée, un tarif et une capacité ; les places restantes viennent des
 *    réservations (jamais d'un chiffre décoratif) et ne deviennent jamais négatives.
 * Les minutes sont comptées depuis minuit (540 = 9 h 00) ; un agenda occupé est une liste [[début, fin], …].
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ParentheseCore = api;
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
  var DAYS_ABBR = { fr: ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };
  var DAYS_SHORT = { fr: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'], en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] };
  var MODES = ['cabinet', 'visio'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function isDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z')); }
  function isTime(s) { return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s); }
  function toMin(s) { return isTime(s) ? Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5)) : NaN; }
  function toTime(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function int(v, d, min, max) { var n = v === '' || v == null ? d : Math.round(Number(v)); if (!isFinite(n)) n = d; return Math.min(max, Math.max(min, n)); }
  function str(v) { return typeof v === 'string' ? v.trim() : ''; }
  function slug(v) { return str(v).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64); }
  function num(v) { return v === '' || v == null || !isFinite(Number(v)) ? null : Number(v); }
  function words(v) { return (Array.isArray(v) ? v : String(v == null ? '' : v).split(/[,;\n]+/)).map(function (x) { return str(String(x)); }).filter(Boolean); }

  function weekday(date) { return new Date(date + 'T00:00:00Z').getUTCDay(); }
  function addDays(date, n) { return new Date(Date.parse(date + 'T00:00:00Z') + n * DAY_MS).toISOString().slice(0, 10); }
  function daysBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY_MS); }

  /** Date et minute courantes dans le fuseau du cabinet (jamais celui du visiteur ni du serveur). */
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

  /** « 09:00-12:00, 14:00-17:00 » → [[540, 720], [840, 1020]] ; vide → [] (jour fermé). */
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

  /** Configuration du cabinet, nettoyée et bornée (le serveur la relit dans le thème enregistré, jamais dans le navigateur). */
  function normalize(raw) {
    raw = raw || {};
    var hours = {};
    for (var d = 0; d < 7; d++) {
      var h = raw.hours && raw.hours[d] != null ? raw.hours[d] : [];
      hours[d] = typeof h === 'string' ? parseHours(h) : (Array.isArray(h) ? h.filter(function (x) { return Array.isArray(x) && x[1] > x[0]; }).map(function (x) { return [int(x[0], 0, 0, 1440), int(x[1], 0, 0, 1440)]; }) : []);
    }
    var seances = (Array.isArray(raw.seances) ? raw.seances : []).map(function (s) {
      var modes = words(s && s.modes).map(slug).filter(function (m) { return MODES.indexOf(m) >= 0; });
      var duration = num(s && s.duration);
      return {
        id: slug(s && (s.id || s.name)), name: str(s && s.name), short: str(s && s.short),
        duration: duration && duration > 0 ? int(duration, 60, 5, 600) : null, price: num(s && s.price),
        modes: modes.length ? modes : MODES.slice(), url: str(s && s.url), image: str(s && s.image)
      };
    }).filter(function (s) { return s.id && s.name; });
    var ateliers = (Array.isArray(raw.ateliers) ? raw.ateliers : []).map(function (a) {
      var duration = num(a && a.duration), capacity = num(a && a.capacity);
      return {
        id: slug(a && (a.id || a.title)), title: str(a && a.title), short: str(a && a.short), tags: words(a && a.tags),
        theme: slug(a && a.theme), date: isDate(str(a && a.date)) ? str(a.date) : '', time: isTime(str(a && a.time)) ? str(a.time) : '',
        duration: duration && duration > 0 ? int(duration, 75, 5, 600) : null, price: num(a && a.price),
        capacity: capacity && capacity > 0 ? int(capacity, 1, 1, 500) : null, booked: int(a && a.booked, 0, 0, 500),
        place: str(a && a.place), url: str(a && a.url), image: str(a && a.image)
      };
    }).filter(function (a) { return a.id && a.title; });
    return {
      timezone: str(raw.timezone) || 'Europe/Paris',
      hours: hours,
      closures: Array.isArray(raw.closures) ? raw.closures.filter(isDate) : parseClosures(raw.closures),
      step: int(raw.step, 60, 5, 180),
      horizonDays: int(raw.horizonDays, 90, 1, 365),
      leadMinutes: int(raw.leadMinutes, 720, 0, 10080),
      cancelHours: int(raw.cancelHours, 0, 0, 720),
      seances: seances,
      ateliers: ateliers
    };
  }

  function seanceById(cfg, id) { for (var i = 0; i < cfg.seances.length; i++) if (cfg.seances[i].id === id) return cfg.seances[i]; return null; }
  function atelierById(cfg, id) { for (var i = 0; i < cfg.ateliers.length; i++) if (cfg.ateliers[i].id === id) return cfg.ateliers[i]; return null; }

  /** Statut d'une date pour le cabinet : past, closed, beyond (au-delà de l'horizon) ou open. */
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

  /** Ateliers d'une date : ils occupent la praticienne comme un rendez-vous. */
  function atelierBusy(cfg, date) {
    var out = [];
    cfg.ateliers.forEach(function (a) { if (a.date === date && a.time && a.duration) out.push([toMin(a.time), toMin(a.time) + a.duration]); });
    return out;
  }

  /**
   * Créneaux d'une date pour une séance : chaque heure de départ (pas du cabinet) dont TOUTE la durée tient dans les
   * horaires sans chevaucher un rendez-vous déjà pris (busy) ni un atelier. Rend [{ time, available, reason }].
   */
  function slotsFor(cfg, opts, at) {
    var svc = seanceById(cfg, opts.service);
    if (!svc || !svc.duration || dateStatus(cfg, opts.date, at) !== 'open') return [];
    if (opts.modality && svc.modes.indexOf(opts.modality) < 0) return [];
    var busy = (opts.busy || []).concat(atelierBusy(cfg, opts.date));
    var now = nowIn(cfg.timezone, at);
    var windows = cfg.hours[weekday(opts.date)];
    var out = [];
    for (var w = 0; w < windows.length; w++) {
      for (var t = windows[w][0]; t + svc.duration <= windows[w][1]; t += cfg.step) {
        var tooSoon = opts.date === now.date && t < now.minute + cfg.leadMinutes;
        var taken = overlaps(busy, t, t + svc.duration);
        out.push({ time: toTime(t), available: !tooSoon && !taken, reason: tooSoon ? 'past' : taken ? 'busy' : null });
      }
    }
    return out;
  }

  /** Statut d'une date pour le calendrier : comme dateStatus, plus « full » quand aucun créneau ne reste. */
  function dayStatus(cfg, opts, at) {
    var st = dateStatus(cfg, opts.date, at);
    if (st !== 'open') return st;
    return slotsFor(cfg, opts, at).some(function (s) { return s.available; }) ? 'open' : 'full';
  }

  /** Places restantes d'un atelier : capacité − réservations, jamais négatif ; capacité inconnue : null. */
  function remaining(atelier, taken) {
    if (!atelier || !atelier.capacity) return null;
    return Math.max(0, atelier.capacity - Math.max(0, Number(taken) || 0));
  }

  /** État d'un atelier : invalid (date/heure/durée non réglées), past, full ou open. */
  function atelierStatus(cfg, atelier, taken, at) {
    if (!atelier || !atelier.date || !atelier.time || !atelier.duration || !atelier.capacity) return 'invalid';
    var now = nowIn(cfg.timezone, at);
    if (atelier.date < now.date || (atelier.date === now.date && toMin(atelier.time) <= now.minute)) return 'past';
    return remaining(atelier, taken) > 0 ? 'open' : 'full';
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_RE = /^[+()\d][\d\s().-]{5,22}$/;

  /**
   * Vérifie une demande. req : { kind: 'seance' | 'atelier', service, modality, date, time, atelier, contact? }.
   * ctx : { busy: [[début, fin]…] (séances), taken: nombre de places prises (atelier) }.
   * Erreurs possibles : service, modality, date, time, slot_taken, full, past, firstName, lastName, email, phone, terms.
   */
  function validate(cfg, req, ctx, at) {
    var errors = [];
    req = req || {};
    ctx = ctx || {};
    if (req.kind === 'atelier') {
      var a = atelierById(cfg, req.atelier);
      var st = atelierStatus(cfg, a, ctx.taken, at);
      if (!a || st === 'invalid') errors.push('service');
      else if (st === 'past') errors.push('past');
      else if (st === 'full') errors.push('full');
    } else {
      var svc = seanceById(cfg, req.service);
      if (!svc || !svc.duration) errors.push('service');
      if (MODES.indexOf(req.modality) < 0 || (svc && svc.modes.indexOf(req.modality) < 0)) errors.push('modality');
      var ds = dateStatus(cfg, req.date, at);
      if (ds !== 'open') errors.push('date');
      if (!isTime(req.time)) errors.push('time');
      if (svc && svc.duration && ds === 'open' && isTime(req.time)) {
        var slot = slotsFor(cfg, { date: req.date, service: svc.id, busy: ctx.busy }, at).filter(function (s) { return s.time === req.time; })[0];
        if (!slot) errors.push('time');
        else if (!slot.available) errors.push('slot_taken');
      }
    }
    var c = req.contact;
    if (c) {
      if (!str(c.firstName)) errors.push('firstName');
      if (!str(c.lastName)) errors.push('lastName');
      if (!EMAIL_RE.test(str(c.email))) errors.push('email');
      if (str(c.phone) && !PHONE_RE.test(str(c.phone))) errors.push('phone');
      if (c.terms !== true) errors.push('terms');
    }
    return errors;
  }

  /** Une annulation ou une modification est-elle encore permise (délai réglé par le cabinet, 0 = jusqu'à l'heure) ? */
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
  /** « Mardi 10 novembre 2026 » ; abbr : « Sam. 14 novembre 2026 ». */
  function formatDate(date, lang, style) {
    if (!isDate(date)) return '';
    var L = lc(lang), d = new Date(date + 'T00:00:00Z');
    var day = style === 'abbr' ? DAYS_ABBR[L][d.getUTCDay()] : DAYS[L][d.getUTCDay()];
    var s = L === 'en' ? day + ' ' + d.getUTCDate() + ' ' + MONTHS[L][d.getUTCMonth()] + ' ' + d.getUTCFullYear() : day + ' ' + d.getUTCDate() + ' ' + MONTHS[L][d.getUTCMonth()] + ' ' + d.getUTCFullYear();
    return style === 'lower' && L === 'fr' ? s : cap(s);
  }
  function monthLabel(year, month, lang) { return cap(MONTHS[lc(lang)][month - 1]) + ' ' + year; }
  /** « 14h00 » en français, « 14:00 » en anglais. */
  function formatTime(time, lang) { return isTime(time) ? (lc(lang) === 'en' ? time : time.replace(':', 'h')) : ''; }
  /** 60 → « 60 minutes » (long) ou « 1 h » ; 75 → « 1h15 (75 min) » (style atelier). */
  function formatDuration(min, lang, style) {
    min = Math.round(Number(min) || 0);
    if (!min) return '';
    var h = Math.floor(min / 60), m = min % 60;
    if (style === 'minutes') return min + ' minutes';
    if (style === 'both') return (h ? h + 'h' + (m ? pad(m) : '') : min + ' min') + (h ? ' (' + min + ' min)' : '');
    if (!h) return min + ' min';
    return h + ' h' + (m ? ' ' + pad(m) : '');
  }
  /** « 60 € » ; prix absent : chaîne vide (jamais un prix inventé). */
  function formatPrice(price, lang) {
    if (price == null || !isFinite(price)) return '';
    var n = Math.round(price * 100) / 100;
    var s = (n % 1 ? n.toFixed(2).replace('.', lc(lang) === 'en' ? '.' : ',') : String(n));
    return lc(lang) === 'en' ? '€' + s : s + ' €';
  }
  function maskEmail(email) {
    var m = /^([^@]+)@(.+)$/.exec(str(email));
    if (!m) return '';
    return m[1].charAt(0) + new Array(Math.max(2, m[1].length)).join('*') + '@' + m[2];
  }

  /** Fichier d'agenda (.ics) à l'heure du cabinet (Europe/Paris par défaut). */
  function ics(appt, opts) {
    opts = opts || {};
    var tz = opts.timezone || 'Europe/Paris';
    var stamp = new Date(opts.now == null ? Date.now() : opts.now).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    var start = toMin(appt.time), end = start + (Number(appt.duration) || 60);
    var day = appt.date.replace(/-/g, '');
    var endDay = end >= 1440 ? addDays(appt.date, 1).replace(/-/g, '') : day;
    var esc = function (s) { return String(s || '').replace(/\\/g, '\\\\').replace(/[,;]/g, function (c) { return '\\' + c; }).replace(/\n/g, '\\n'); };
    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Parenthese//Rendez-vous//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VTIMEZONE', 'TZID:' + tz, 'BEGIN:STANDARD', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'END:STANDARD',
      'BEGIN:DAYLIGHT', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'END:DAYLIGHT', 'END:VTIMEZONE',
      'BEGIN:VEVENT',
      'UID:' + appt.number + '@parenthese',
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
   * DÉMONSTRATION seulement (jamais le service réel) : quand les dates d'exemple des ateliers sont passées, elles sont
   * avancées de semaines entières (même jour de la semaine, mêmes écarts) pour que la démonstration reste à jour.
   */
  function demoShift(cfg, at) {
    var today = nowIn(cfg.timezone, at).date;
    var dated = cfg.ateliers.filter(function (a) { return a.date; }).map(function (a) { return a.date; }).sort();
    if (!dated.length || dated[0] > today) return cfg;
    var weeks = Math.ceil((daysBetween(dated[0], today) + 1) / 7);
    cfg.ateliers.forEach(function (a) { if (a.date) a.date = addDays(a.date, weeks * 7); });
    return cfg;
  }

  /**
   * Agenda de DÉMONSTRATION (jamais utilisé par le service réel) : rendez-vous fictifs déterministes pour que le
   * calendrier montre des créneaux pris et des jours complets. Le mardi 10 novembre 2026 reproduit la planche 04 :
   * 9h00, 11h00, 14h00 et 16h00 restent libres.
   */
  function demoAgenda(cfg, date) {
    if (date === '2026-11-10') return [[600, 660], [900, 960]];
    var day = Number(date.slice(8, 10));
    if (day % 9 === 4) return [[0, 1440]];
    var seed = 0;
    for (var i = 0; i < date.length; i++) seed = (seed * 31 + date.charCodeAt(i)) % 9973;
    var list = [[540 + (seed % 3) * 60, 600 + (seed % 3) * 60]];
    if (seed % 2) list.push([900, 960]);
    return list;
  }

  return {
    MODES: MODES, DAYS_SHORT: DAYS_SHORT,
    normalize: normalize, parseHours: parseHours, parseClosures: parseClosures, nowIn: nowIn, dateStatus: dateStatus, dayStatus: dayStatus,
    seanceById: seanceById, atelierById: atelierById, slotsFor: slotsFor, atelierBusy: atelierBusy, remaining: remaining, atelierStatus: atelierStatus,
    validate: validate, changeAllowed: changeAllowed, monthGrid: monthGrid, weekday: weekday, addDays: addDays, toMin: toMin, toTime: toTime,
    formatDate: formatDate, monthLabel: monthLabel, formatTime: formatTime, formatDuration: formatDuration, formatPrice: formatPrice,
    maskEmail: maskEmail, ics: ics, isDate: isDate, isTime: isTime, demoShift: demoShift, demoAgenda: demoAgenda
  };
});
