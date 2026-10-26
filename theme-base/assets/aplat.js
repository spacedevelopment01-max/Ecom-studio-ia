/* APLAT (planches du 25 octobre) : menu plein panneau, navigation active, accordéons, recherche et catégories de la
   FAQ, filtres et « charger plus », comparateur avant/après, formulaires (contrôles, résumé d'erreurs, deux étapes sur
   téléphone, photos JPG/PNG de 10 Mo au plus, envoi simulé en démonstration), préférences de cookies.
   Aucun texte de l'interface n'est écrit ici : chaque libellé vient d'un réglage de section (attributs data-*). */
(function () {
  "use strict";
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var store = {
    get: function (k, area) { try { return JSON.parse((area || localStorage).getItem(k) || "null"); } catch (e) { return null; } },
    set: function (k, v, area) { try { (area || localStorage).setItem(k, JSON.stringify(v)); } catch (e) { /* stockage refusé */ } },
    del: function (k, area) { try { (area || localStorage).removeItem(k); } catch (e) { /* stockage refusé */ } }
  };
  var session = (function () { try { return window.sessionStorage; } catch (e) { return null; } })();
  var mobile = function () { return window.matchMedia("(max-width: 1023px)").matches; };
  var FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

  /* ── Chemin courant (aperçu, export statique ou boutique) ─────────────────────────────────────────────────── */
  function norm(p) {
    p = (p || "").split("#")[0].split("?")[0].replace(/\/index\.html$/, "/").replace(/\.html$/, "").replace(/\/+$/, "");
    var m = p.match(/\/pages\/[^/]+$/) || p.match(/\/blogs\/.+$/);
    if (m) return m[0];
    // Démonstration exportée en fichiers plats (page-<identifiant>.html, accueil.html).
    var flat = p.match(/\/page-([^/]+)$/); if (flat) return "/pages/" + flat[1];
    return p === "" || /\/$/.test(p) || /\/(index|accueil)?$/.test(p) ? "/" : p;
  }
  function hrefPath(a) { try { return norm(new URL(a.getAttribute("href"), location.href).pathname); } catch (e) { return ""; } }
  var here = norm(location.pathname);

  /* ── Navigation active ────────────────────────────────────────────────────────────────────────────────────── */
  function activeNav() {
    var header = $("[data-ap-header]");
    if (!header) return;
    var parents = {};
    (header.getAttribute("data-ap-parents") || "").split(";").forEach(function (pair) {
      var kv = pair.split("="); if (kv.length !== 2) return;
      kv[1].split(",").forEach(function (h) { if (h.trim()) parents["/pages/" + h.trim()] = "/pages/" + kv[0].trim(); });
    });
    var target = parents[here] || here;
    $$(".ap-header__nav a, .ap-menu__list a, .ap-footer__row a, .ap-footer__col a", document).forEach(function (a) {
      var p = hrefPath(a);
      if (!p || a.getAttribute("href").indexOf("#") > -1) return;
      if (p === here || (p === target && p !== "/")) a.setAttribute("aria-current", "page");
      else if (a.getAttribute("aria-current") === "page") a.removeAttribute("aria-current");
    });
  }

  /* ── Piège du focus pour les panneaux (menu, cookies) ───────────────────────────────────────────────────── */
  function trap(panel, e) {
    if (e.key !== "Tab") return;
    var f = $$(FOCUSABLE, panel).filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }

  /* ── Menu plein panneau ───────────────────────────────────────────────────────────────────────────────────── */
  function menu() {
    var panel = $("[data-ap-menu]"), openers = $$("[data-ap-menu-open]");
    if (!panel || !openers.length) return;
    var last = null;
    function open() {
      last = document.activeElement;
      panel.hidden = false;
      document.documentElement.classList.add("ap-locked");
      openers.forEach(function (b) { b.setAttribute("aria-expanded", "true"); });
      var c = $("[data-ap-menu-close]", panel); if (c) c.focus();
    }
    function close() {
      if (panel.hidden) return;
      panel.hidden = true;
      document.documentElement.classList.remove("ap-locked");
      openers.forEach(function (b) { b.setAttribute("aria-expanded", "false"); });
      if (last && last.focus) last.focus();
    }
    openers.forEach(function (b) { b.addEventListener("click", open); });
    $$("[data-ap-menu-close]", panel).forEach(function (b) { b.addEventListener("click", close); });
    panel.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); else trap(panel, e); });
    // Clic en dehors des liens, des boutons et de la photo : fermeture.
    panel.addEventListener("click", function (e) { if (!e.target.closest("a, button, .ap-menu__nav li, .ap-menu__visual")) close(); });
    panel.addEventListener("click", function (e) { var a = e.target.closest("a[href*='#']"); if (a) close(); });
    window.addEventListener("resize", function () { if (!mobile() && !panel.hidden) close(); });
  }

  /* ── Barre « Mon projet / Contact » : le dernier contenu reste visible ─────────────────────────────────── */
  function mbar() {
    var bar = $("[data-ap-mbar]");
    if (!bar) return;
    document.body.classList.add("ap-has-mbar");
    var set = function () { document.documentElement.style.setProperty("--ap-mbar-h", bar.offsetHeight + "px"); };
    set(); window.addEventListener("resize", set);
  }

  /* ── Accordéons ───────────────────────────────────────────────────────────────────────────────────────────── */
  function accordions() {
    $$("[data-ap-acc]").forEach(function (btn) {
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      if (!panel) return;
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        var group = btn.closest("[data-ap-acc-group]");
        if (!open && group && group.hasAttribute("data-single")) {
          $$("[data-ap-acc][aria-expanded='true']", group).forEach(function (o) {
            o.setAttribute("aria-expanded", "false");
            var p = document.getElementById(o.getAttribute("aria-controls")); if (p) p.hidden = true;
            var it = o.closest(".ap-acc"); if (it) it.classList.remove("is-open");
          });
        }
        btn.setAttribute("aria-expanded", open ? "false" : "true");
        panel.hidden = open;
        var item = btn.closest(".ap-acc"); if (item) item.classList.toggle("is-open", !open);
      });
    });
  }

  /* ── FAQ : recherche et catégories ───────────────────────────────────────────────────────────────────────── */
  function faqSearch() {
    $$("[data-ap-faq]").forEach(function (root) {
      var input = $("[data-ap-faq-search]", root), tabs = $$("[data-ap-faq-tab]", root), items = $$(".ap-acc", root), empty = $("[data-ap-faq-empty]", root);
      var cat = "all";
      var fold = function (s) { return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); };
      function apply() {
        var q = input ? fold(input.value.trim()) : "", n = 0;
        items.forEach(function (it) {
          var ok = (cat === "all" || (it.getAttribute("data-cat") || "").split(",").indexOf(cat) > -1) && (!q || fold(it.textContent).indexOf(q) > -1);
          it.hidden = !ok; if (ok) n++;
        });
        if (empty) empty.hidden = n > 0;
      }
      tabs.forEach(function (t) {
        t.addEventListener("click", function () {
          cat = t.getAttribute("data-ap-faq-tab");
          tabs.forEach(function (o) { o.setAttribute("aria-pressed", o === t ? "true" : "false"); });
          apply();
        });
      });
      if (input) input.addEventListener("input", apply);
      var form = input && input.closest("form"); if (form) form.addEventListener("submit", function (e) { e.preventDefault(); apply(); });
    });
  }

  /* ── Filtres et chargement supplémentaire (réalisations, conseils) ──────────────────────────────────────── */
  function filters() {
    $$("[data-ap-filterable]").forEach(function (root) {
      var buttons = $$("[data-ap-filter]", root), items = $$("[data-ap-item]", root), more = $("[data-ap-more]", root);
      var step = parseInt(root.getAttribute("data-ap-step") || "0", 10) || items.length, shown = step, cat = "all";
      var status = $("[data-ap-filter-status]", root);
      function apply() {
        var match = items.filter(function (it) { return cat === "all" || (it.getAttribute("data-ap-item") || "").split(",").indexOf(cat) > -1; });
        items.forEach(function (it) { it.hidden = true; });
        match.forEach(function (it, i) { it.hidden = i >= shown; });
        if (more) more.hidden = match.length <= shown;
        if (status) status.textContent = (status.getAttribute("data-template") || "").replace("[n]", Math.min(shown, match.length));
      }
      buttons.forEach(function (b) {
        b.addEventListener("click", function () {
          cat = b.getAttribute("data-ap-filter"); shown = step;
          buttons.forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
          apply();
        });
      });
      if (more) more.addEventListener("click", function () {
        var before = items.filter(function (it) { return !it.hidden; }).length;
        shown += step; apply();
        var next = items.filter(function (it) { return !it.hidden; })[before];
        var link = next && $("a", next); if (link) link.focus();
      });
      apply();
    });
  }

  /* ── Comparateur avant/après : pointeur, toucher et clavier (curseur natif) ──────────────────────────────── */
  function compare() {
    $$("[data-ap-compare]").forEach(function (root) {
      var range = $("input[type=range]", root);
      if (!range) return;
      var set = function () { root.style.setProperty("--ap-pos", range.value + "%"); };
      range.addEventListener("input", set); set();
    });
  }

  /* ── Formulaires : contrôles, erreurs, étapes, photos, envoi ────────────────────────────────────────────── */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function fieldOf(el) { return el.closest(".ap-field") || el.parentNode; }
  function errorText(el) {
    var f = fieldOf(el), msg = f.getAttribute("data-error") || "";
    if (el.type === "email" && el.value.trim() && !EMAIL.test(el.value.trim())) msg = f.getAttribute("data-error-format") || msg;
    if (el.getAttribute("pattern") && el.value.trim() && !new RegExp("^(?:" + el.getAttribute("pattern") + ")$").test(el.value.trim())) msg = f.getAttribute("data-error-format") || msg;
    return msg;
  }
  function shown(el) { var f = fieldOf(el); return !f.closest(mobile() ? ".ap-only-d" : ".ap-only-m"); }
  function invalid(el) {
    if (el.disabled || el.closest("[hidden]") || !shown(el)) return false;
    if (el.type === "checkbox") return el.required && !el.checked;
    if (el.type === "radio") { var g = $$("input[name='" + el.name + "']", el.form); return el.required && !g.some(function (r) { return r.checked; }); }
    var v = el.value.trim();
    if (el.required && !v) return true;
    if (el.type === "email" && v && !EMAIL.test(v)) return true;
    if (el.getAttribute("pattern") && v && !new RegExp("^(?:" + el.getAttribute("pattern") + ")$").test(v)) return true;
    return false;
  }
  function mark(el, bad) {
    var f = fieldOf(el), err = $(".ap-field__error", f);
    var targets = el.type === "radio" ? $$("input[name='" + el.name + "']", el.form) : [el];
    targets.forEach(function (t) { if (bad) t.setAttribute("aria-invalid", "true"); else t.removeAttribute("aria-invalid"); });
    f.classList.toggle("is-invalid", bad);
    f.classList.toggle("is-valid", !bad && el.type !== "radio" && el.type !== "checkbox" && !!el.value.trim() && f.hasAttribute("data-check"));
    if (err) { err.hidden = !bad; var t = $(".ap-field__error-text", err) || err; t.textContent = bad ? errorText(el) : ""; }
  }
  function check(form, scopes) {
    var seen = {}, bad = [], els = [];
    (scopes || [form]).forEach(function (sc) { els = els.concat($$("input, select, textarea", sc)); });
    els.forEach(function (el) {
      if (el.type === "file" || el.type === "hidden" || el.type === "submit") return;
      if (el.type === "radio") { if (seen[el.name]) return; seen[el.name] = 1; }
      var b = invalid(el); mark(el, b); if (b) bad.push(el);
    });
    var summary = $("[data-ap-summary]", form);
    if (summary) {
      var list = $("ul", summary); if (list) list.innerHTML = "";
      bad.forEach(function (el) {
        var label = $("label, legend, .ap-field__label", fieldOf(el)), li = document.createElement("li"), a = document.createElement("a");
        a.href = "#" + (el.id || ""); a.textContent = (label ? label.textContent.replace(/\*|\(.*?\)/g, "").trim() : el.name) + " : " + errorText(el);
        a.addEventListener("click", function (e) { e.preventDefault(); el.focus(); });
        li.appendChild(a); if (list) list.appendChild(li);
      });
      summary.hidden = !bad.length;
      if (bad.length) { summary.focus(); }
    } else if (bad.length) bad[0].focus();
    return !bad.length;
  }
  function kindOf(form) { var box = form.closest("[data-ap-formbox]"); return (box && box.getAttribute("data-kind")) || "form"; }
  function draftKey(form) { return "ap-draft-" + kindOf(form); }
  function saveDraft(form) {
    if (!session) return;
    var data = {};
    $$("input, select, textarea", form).forEach(function (el) {
      if (!el.name || el.type === "file" || el.type === "hidden") return;
      if (el.type === "checkbox") { if (el.name.indexOf("consent") === -1) data[el.name + "|" + el.value] = el.checked; }
      else if (el.type === "radio") { if (el.checked) data[el.name] = el.value; }
      else data[el.name] = el.value;
    });
    store.set(draftKey(form), data, session);
  }
  function loadDraft(form) {
    if (!session) return;
    var data = store.get(draftKey(form), session); if (!data) return;
    $$("input, select, textarea", form).forEach(function (el) {
      if (!el.name || el.type === "file" || el.type === "hidden") return;
      if (el.type === "checkbox") { if ((el.name + "|" + el.value) in data) el.checked = !!data[el.name + "|" + el.value]; }
      else if (el.type === "radio") el.checked = data[el.name] === el.value;
      else if (data[el.name] != null) el.value = data[el.name];
    });
  }
  function summaryOf(form) {
    var out = {};
    $$("[data-ap-sum]", form).forEach(function (el) {
      var key = el.getAttribute("data-ap-sum"), v = "";
      if (el.type === "radio") { if (!el.checked) return; v = el.getAttribute("data-label") || el.value; }
      else if (el.tagName === "SELECT") v = el.selectedIndex > 0 ? el.options[el.selectedIndex].text : "";
      else v = el.value.trim();
      if (v) out[key] = out[key] ? out[key] + ", " + v : v;
    });
    var ph = form.querySelector("[data-ap-photos]"); if (ph) out.photos = String(ph._apFiles ? ph._apFiles.length : 0);
    return out;
  }
  function photos(root) {
    var input = $("input[type=file]", root), list = $("[data-ap-photo-list]", root), errBox = $("[data-ap-photo-error]", root), drop = $("[data-ap-drop]", root);
    var max = parseFloat(root.getAttribute("data-max-mb") || "10") * 1024 * 1024, files = [];
    root._apFiles = files;
    if (!input) return;
    var fmt = function (n) { return (n / 1024 / 1024).toFixed(1).replace(".", ",") + " Mo"; };
    function showError(file, why) {
      if (!errBox) return;
      errBox.hidden = false;
      var name = $("[data-ap-photo-error-name]", errBox), msg = $("[data-ap-photo-error-msg]", errBox);
      if (name) name.textContent = file.name + " · " + fmt(file.size);
      if (msg) msg.textContent = root.getAttribute(why === "type" ? "data-error-type" : "data-error-size") || "";
      var retry = $("[data-ap-photo-retry]", errBox); if (retry) retry.focus();
    }
    function render() {
      if (!list) return;
      list.innerHTML = "";
      files.forEach(function (file, i) {
        var li = document.createElement("li"), img = document.createElement("img"), name = document.createElement("span"), del = document.createElement("button");
        li.className = "ap-photos__item";
        img.alt = ""; img.width = 96; img.height = 72; img.src = URL.createObjectURL(file);
        name.className = "ap-photos__name"; name.textContent = file.name + " · " + fmt(file.size);
        del.type = "button"; del.className = "ap-photos__del"; del.setAttribute("aria-label", (root.getAttribute("data-remove-label") || "") + " " + file.name);
        del.innerHTML = '<svg class="ap-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 6.5h15M9.5 6.5V4h5v2.5M6.5 6.5l1 14h9l1-14M10 10.5v6.5M14 10.5v6.5"/></svg>';
        del.addEventListener("click", function () { files.splice(i, 1); render(); var s = $("[data-ap-photo-status]", root); if (s) s.textContent = root.getAttribute("data-removed-label") || ""; input.focus(); });
        li.appendChild(img); li.appendChild(name); li.appendChild(del); list.appendChild(li);
      });
      root.classList.toggle("has-files", files.length > 0);
      var ex = $("[data-ap-photo-examples]", root); if (ex) ex.hidden = files.length > 0;
    }
    function add(fileList) {
      if (errBox) errBox.hidden = true;
      Array.prototype.forEach.call(fileList, function (file) {
        if (!(file.type ? /^image\/(jpeg|png)$/.test(file.type) : /\.(jpe?g|png)$/i.test(file.name))) return showError(file, "type");
        if (file.size > max) return showError(file, "size");
        files.push(file);
      });
      render(); input.value = "";
    }
    input.addEventListener("change", function () { add(input.files); });
    $$("[data-ap-photo-retry]", root).forEach(function (b) { b.addEventListener("click", function () { input.click(); }); });
    if (drop) {
      ["dragenter", "dragover"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add("is-over"); }); });
      ["dragleave", "drop"].forEach(function (t) { drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove("is-over"); }); });
      drop.addEventListener("drop", function (e) { if (e.dataTransfer) add(e.dataTransfer.files); });
    }
  }
  function forms() {
    // Réglages posés par la section (bloc de données JSON) : démonstration, textes de l'envoi.
    $$("script[type='application/json'][data-ap-form-config]").forEach(function (cfg) {
      var f = document.getElementById(cfg.getAttribute("data-ap-form-config")), c;
      if (!f) return;
      try { c = JSON.parse(cfg.textContent || "{}"); } catch (e) { return; }
      if (c.demo) f.setAttribute("data-demo", "");
      if (c.sending) f.setAttribute("data-sending", c.sending);
      if (c.demo && c.done) f.setAttribute("data-demo-done", c.done);
    });
    $$("[data-ap-formbox] form").forEach(function (form) {
      var steps = $$("[data-ap-step]", form), demo = form.hasAttribute("data-demo"), submit = $("[type=submit]", form);
      // Retour de la plateforme après un envoi réussi : la confirmation peut alors l'annoncer.
      if ($(".ap-form__ok", form) && session) { var prev = store.get("ap-quote", session) || { data: {} }; prev.sent = true; store.set("ap-quote", prev, session); store.del(draftKey(form), session); }
      var status = $("[data-ap-status]", form), fail = $("[data-ap-fail]", form), sending = false;
      loadDraft(form);
      form.addEventListener("input", function (e) { saveDraft(form); var el = e.target; if (fieldOf(el).classList.contains("is-invalid") && !invalid(el)) mark(el, false); });
      form.addEventListener("change", function () { saveDraft(form); });
      $$("[data-ap-photos]", form).forEach(photos);
      // Textes indicatifs du téléphone (plus courts, comme sur les planches mobiles).
      if (mobile()) $$("[data-ph-m]", form).forEach(function (el) { var v = el.getAttribute("data-ph-m"); if (el.tagName === "SELECT") { if (el.options[0]) el.options[0].text = v; } else el.placeholder = v; });
      // Deux étapes sur téléphone (planche 08) ; un seul écran sur ordinateur (planche 03).
      function show(n) {
        form.setAttribute("data-current", String(n));
        steps.forEach(function (s) { s.classList.toggle("is-current", s.getAttribute("data-ap-step") === String(n)); });
        $$("[data-ap-stepper] [data-n]", form).forEach(function (d) { var k = parseInt(d.getAttribute("data-n"), 10); d.classList.toggle("is-done", k < n); d.classList.toggle("is-current", k === n); if (k === n) d.setAttribute("aria-current", "step"); else d.removeAttribute("aria-current"); });
      }
      if (steps.length) show(1);
      $$("[data-ap-next]", form).forEach(function (b) {
        b.addEventListener("click", function () {
          var scope = steps.filter(function (s) { return s.getAttribute("data-ap-step") === "1"; });
          if (!check(form, scope)) return;
          var sum = $("[data-ap-summary]", form); if (sum) sum.hidden = true;
          show(2); var top = form.getBoundingClientRect().top + window.scrollY - 90; window.scrollTo(0, Math.max(0, top));
          var first = $("[data-ap-step='2'] input, [data-ap-step='2'] textarea", form); if (first) first.focus({ preventScroll: true });
        });
      });
      $$("[data-ap-prev]", form).forEach(function (b) { b.addEventListener("click", function () { show(1); var t = $("[data-ap-step='1'] input, [data-ap-step='1'] select", form); if (t) t.focus(); }); });
      form.addEventListener("submit", function (e) {
        if (sending) { e.preventDefault(); return; }
        if (fail) fail.hidden = true;
        if (!check(form)) {
          e.preventDefault();
          if (steps.length && mobile()) { var badStep1 = $("[data-ap-step='1'] [aria-invalid='true']", form); if (badStep1) show(1); }
          return;
        }
        sending = true;
        if (submit) { submit.disabled = true; submit.setAttribute("aria-busy", "true"); submit.classList.add("is-sending"); }
        if (status) { status.hidden = false; status.textContent = form.getAttribute("data-sending") || ""; }
        if (!demo) { if (session) store.set("ap-quote", { demo: false, sent: false, data: summaryOf(form), at: Date.now() }, session); return; } // Boutique : envoi par le formulaire de contact de la plateforme.
        e.preventDefault();
        var failNow = /[?&]etat=echec\b/.test(location.search);
        window.setTimeout(function () {
          sending = false;
          if (submit) { submit.disabled = false; submit.removeAttribute("aria-busy"); submit.classList.remove("is-sending"); }
          if (failNow) {
            if (status) status.hidden = true;
            if (fail) { fail.hidden = false; fail.focus(); }
            return;
          }
          var link = document.getElementById(form.id.replace("ApForm-", "ApConfirm-"));
          var next = link ? link.href : form.getAttribute("data-confirm");
          if (next) {
            if (session) store.set("ap-quote", { demo: true, data: summaryOf(form), at: Date.now() }, session);
            location.href = next;
            return;
          }
          if (status) { status.textContent = form.getAttribute("data-demo-done") || ""; status.focus(); }
          form.classList.add("is-done");
        }, 900);
      });
    });
  }

  /* ── Confirmation : récapitulatif de la demande (démonstration) ─────────────────────────────────────────── */
  function confirmation() {
    var root = $("[data-ap-confirm]"); if (!root || !session) return;
    var q = store.get("ap-quote", session);
    // Site publié : le texte de réception ne s'affiche qu'après un envoi réussi depuis ce navigateur.
    if (!root.hasAttribute("data-demo")) {
      var ok = !!(q && q.sent);
      $$("[data-ap-confirm-ok]", root).forEach(function (el) { el.hidden = !ok; });
      $$("[data-ap-confirm-none]", root).forEach(function (el) { el.hidden = ok; });
      if (!ok) return;
    }
    if (!q || !q.data) return;
    $$("[data-ap-sum-out]", root).forEach(function (el) {
      var k = el.getAttribute("data-ap-sum-out"), v = q.data[k];
      if (k === "photos") v = q.data.photos != null ? (el.getAttribute("data-template") || "[n]").replace("[n]", q.data.photos) : "";
      if (v) el.textContent = v;
    });
  }

  /* ── Préférences de cookies ───────────────────────────────────────────────────────────────────────────── */
  var KEY = "aplat-consent";
  function consent() {
    var panel = $("[data-ap-cookies]"), forms = $$("[data-ap-consent-form]"), last = null;
    var saved = store.get(KEY) || null;
    var templates = $$("template[data-ap-consent-category]");
    function apply(c) {
      templates.forEach(function (t) {
        if (t._apDone || !c || !c[t.getAttribute("data-ap-consent-category")]) return;
        t.parentNode.insertBefore(t.content.cloneNode(true), t); t._apDone = true;
      });
    }
    function sync(c) { forms.forEach(function (f) { $$("[data-ap-consent]", f).forEach(function (i) { i.checked = !!(c && c[i.getAttribute("data-ap-consent")]); }); }); }
    function save(c, form) {
      c.date = new Date().toISOString(); store.set(KEY, c); saved = c; sync(c); apply(c);
      var st = form && $("[data-ap-consent-status]", form); if (st) st.textContent = st.getAttribute("data-saved") || "";
      if (form && panel && panel.contains(form)) window.setTimeout(close, 400);
    }
    function open() {
      if (!panel) return;
      last = document.activeElement; panel.hidden = false;
      var c = $("[data-ap-cookies-close]", panel); if (c) c.focus();
    }
    function close() { if (!panel || panel.hidden) return; panel.hidden = true; if (last && last.focus) last.focus(); }
    sync(saved); apply(saved);
    forms.forEach(function (f) {
      var none = $("[data-ap-consent-none]", f); if (none) none.hidden = templates.length > 0;
      $$("[data-ap-consent-all]", f).forEach(function (b) {
        b.addEventListener("click", function () { var on = b.getAttribute("data-ap-consent-all") === "1"; save({ audience: on, external: on }, f); });
      });
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var c = {}; $$("[data-ap-consent]", f).forEach(function (i) { c[i.getAttribute("data-ap-consent")] = i.checked; });
        save(c, f);
      });
    });
    if (!panel) return;
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a[href$='#cookies'], [data-ap-cookies-open]");
      if (!a) return;
      e.preventDefault(); open();
    });
    $$("[data-ap-cookies-close]", panel).forEach(function (b) { b.addEventListener("click", close); });
    panel.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); else trap(panel, e); });
    panel.addEventListener("click", function (e) { if (e.target === panel) close(); });
    if ((panel.getAttribute("data-ap-banner") === "true" && !saved) || /[?&]cookies=1\b/.test(location.search)) open();
  }

  /* ── Retour en haut ───────────────────────────────────────────────────────────────────────────────────── */
  function top() {
    $$("[data-ap-top]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); var m = $("main, #MainContent"); if (m) { m.setAttribute("tabindex", "-1"); m.focus({ preventScroll: true }); } });
    });
  }

  /* ── Sommaire repliable (téléphone) et défilement des articles liés ─────────────────────────────────────── */
  function articles() {
    if (mobile()) $$("[data-ap-toc]").forEach(function (d) { d.open = false; });
    $$("[data-ap-scroll]").forEach(function (b) {
      var list = document.getElementById(b.getAttribute("aria-controls")); if (!list) return;
      b.addEventListener("click", function () { list.scrollBy({ left: parseInt(b.getAttribute("data-ap-scroll"), 10) * list.clientWidth * 0.9, behavior: "smooth" }); });
    });
  }

  /* ── Ordinateur de 1024 à 1439 px : la composition des planches (1440 px) est réduite à l'échelle ────────── */
  function deskScale() {
    function set() {
      var w = document.documentElement.clientWidth, z = w >= 1024 && w < 1440 ? w / 1440 : 1;
      document.documentElement.style.setProperty("--ap-dz", String(Math.round(z * 10000) / 10000));
    }
    set(); window.addEventListener("resize", set);
  }

  function init() { deskScale(); activeNav(); menu(); mbar(); accordions(); faqSearch(); filters(); compare(); forms(); confirmation(); consent(); top(); articles(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
