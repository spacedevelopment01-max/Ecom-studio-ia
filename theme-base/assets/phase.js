/*
 * PHASE — Électricité : comportements des sections ph-* (menu du téléphone, filtres, « Voir plus », questions,
 * formulaires et leurs états, pièces jointes, préférences de cookies, rubrique active du menu).
 * Démonstration : aucun envoi (« démonstration — demande non envoyée »), la confirmation relit la saisie du visiteur
 * dans sessionStorage. Production : envoi par le formulaire de contact de la boutique ; un échec ne devient jamais un
 * succès.
 */
(() => {
  if (window.__phase) return;
  window.__phase = true;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let cfg = {};
  try { cfg = JSON.parse($("#ph-config")?.textContent || "{}"); } catch (e) { cfg = {}; }
  const T = cfg.texts || {};
  const live = (msg) => { const n = $("[data-ph-live]"); if (n) { n.textContent = ""; setTimeout(() => { n.textContent = msg; }, 40); } };
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } },
  };

  /* ------------------------------------------------------------------ Pied de page : disposition propre à la page */
  const mark = $(".ph-page-mark");
  if (mark) {
    document.body.dataset.phFootM = mark.dataset.phFootM || "cols";
    const nav = mark.dataset.phNav;
    if (nav) $$(".ph-header__nav a").forEach((a) => { if (new URL(a.href, location.href).pathname.endsWith(nav)) a.setAttribute("data-ph-active", ""); });
  }
  // Rubrique active : la page parente d'une sous-page (ex. Installation → Prestations).
  $$(".ph-header__nav a").forEach((a) => {
    const here = location.pathname.replace(/\.html$/, "");
    const p = new URL(a.href, location.href).pathname.replace(/\.html$/, "");
    if (p === here) a.setAttribute("aria-current", "page");
  });

  /* ------------------------------------------------------------------ Menu du téléphone */
  const menu = $("[data-ph-menu]");
  const opener = $("[data-ph-menu-open]");
  let lastFocus = null;
  const focusables = (root) => $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', root).filter((n) => n.offsetParent !== null);
  const openMenu = () => {
    if (!menu) return;
    lastFocus = document.activeElement;
    menu.hidden = false;
    document.body.classList.add("ph-menu-open");
    opener?.setAttribute("aria-expanded", "true");
    (focusables(menu)[1] || focusables(menu)[0])?.focus();
  };
  const closeMenu = () => {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    document.body.classList.remove("ph-menu-open");
    opener?.setAttribute("aria-expanded", "false");
    (lastFocus || opener)?.focus();
  };
  opener?.addEventListener("click", openMenu);
  $("[data-ph-menu-close]")?.addEventListener("click", closeMenu);
  menu?.addEventListener("click", (e) => { if (e.target === menu) closeMenu(); });
  $$("[data-ph-sub]").forEach((b) => b.addEventListener("click", () => {
    const sub = document.getElementById(b.getAttribute("aria-controls"));
    const open = b.getAttribute("aria-expanded") !== "true";
    b.setAttribute("aria-expanded", String(open));
    if (sub) sub.hidden = !open;
  }));
  document.addEventListener("keydown", (e) => {
    if (!menu || menu.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); closeMenu(); return; }
    if (e.key !== "Tab") return;
    const f = focusables(menu);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
  window.matchMedia("(min-width: 1080px)").addEventListener?.("change", (m) => { if (m.matches) closeMenu(); });

  /* ------------------------------------------------------------------ Filtres (réalisations, questions, conseils) */
  const lists = {};
  $$("[data-ph-list]").forEach((l) => { (lists[l.dataset.phList] ||= []).push(l); });
  // Cartes réservées à l'ordinateur ou au téléphone : seules celles de l'affichage en cours comptent.
  const mobile = () => window.matchMedia("(max-width: 1079px)").matches;
  const itemsOf = (l) => $$(":scope > [data-ph-cat]", l).filter((it) => !it.classList.contains(mobile() ? "ph-only-d" : "ph-only-m"));
  const pageOf = {};
  const apply = (kind, value, page = 1) => {
    (lists[kind] || []).forEach((l) => {
      const per = Number(mobile() && l.dataset.phPerM ? l.dataset.phPerM : l.dataset.phPer) || 0;
      const root = l.closest(".ph") || l.parentElement;
      // Ordre propre au téléphone (réglage « Ordre au téléphone ») pour la pagination comme pour l'affichage.
      const all = itemsOf(l).slice().sort((a, b) => (mobile() ? (Number(a.dataset.phOM) || 0) - (Number(b.dataset.phOM) || 0) : 0));
      const shown = all.filter((it) => !value || value === "all" || (it.dataset.phCat || "").split(/\s+/).includes(value));
      const paged = l.dataset.phPager === "pages";
      const pages = paged && per ? Math.max(1, Math.ceil(shown.length / per)) : 1;
      const cur = Math.min(Math.max(1, page), pages);
      const limit = per && l.dataset.phAll !== "1" ? per : Infinity;
      itemsOf(l).forEach((it) => { it.hidden = true; });
      shown.forEach((it, i) => { it.hidden = paged ? !(i >= (cur - 1) * per && i < cur * per) : i >= limit; });
      pageOf[kind] = { value, page: cur };
      const empty = $("[data-ph-empty]", root);
      if (empty) empty.hidden = shown.length > 0;
      const more = $("[data-ph-more-wrap]", root);
      if (more) more.hidden = paged || !(shown.length > limit);
      const nav = $("[data-ph-pager-nav]", root);
      if (nav) {
        nav.hidden = pages < 2;
        nav.innerHTML = "";
        const btn = (label, p, cls, current) => {
          const b = document.createElement("button");
          b.type = "button"; b.className = `ph-pager__btn ${cls}`; b.innerHTML = label;
          if (current) b.setAttribute("aria-current", "page");
          if (p < 1 || p > pages) b.disabled = true;
          b.addEventListener("click", () => { apply(kind, value, p); l.scrollIntoView({ behavior: "smooth", block: "start" }); $("a", l.querySelector(":scope > [data-ph-cat]:not([hidden])"))?.focus({ preventScroll: true }); });
          nav.appendChild(b);
          return b;
        };
        const arrow = (d) => `<svg viewBox="0 0 32 32" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
        btn(`${arrow("m20 7-9 9 9 9")}<span class="visually-hidden">${nav.dataset.phPrev || ""}</span>`, cur - 1, "is-prev");
        for (let i = 1; i <= pages; i++) btn(`<span class="visually-hidden">${(nav.dataset.phPage || "[n]").replace("[n]", "")}</span>${i}`, i, "is-num", i === cur);
        btn(`${arrow("m12 7 9 9-9 9")}<span class="visually-hidden">${nav.dataset.phNext || ""}</span>`, cur + 1, "is-next");
      }
      const count = $("[data-ph-count]", root);
      if (count) count.textContent = (count.dataset.phCountText || "[n]").replace("[n]", String(shown.length));
    });
  };
  $$("[data-ph-chips]").forEach((g) => {
    const kind = g.dataset.phChips;
    const chips = $$("[data-ph-chip]", g);
    const visible = () => chips.filter((c) => !c.classList.contains(mobile() ? "ph-only-d" : "ph-only-m"));
    chips.forEach((c) => c.addEventListener("click", () => {
      chips.forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
      (lists[kind] || []).forEach((l) => { l.dataset.phAll = "0"; });
      apply(kind, c.dataset.phChip);
      try { history.replaceState(null, "", c.dataset.phChip === "all" ? location.pathname : `${location.pathname}?filtre=${encodeURIComponent(c.dataset.phChip)}`); } catch (e) { /* aperçu */ }
    }));
    const wanted = new URLSearchParams(location.search).get("filtre");
    const start = visible().find((c) => c.dataset.phChip === wanted) || visible().find((c) => c.getAttribute("aria-pressed") === "true") || visible()[0];
    if (start) { chips.forEach((x) => x.setAttribute("aria-pressed", String(x === start))); apply(kind, start.dataset.phChip); }
  });
  Object.keys(lists).forEach((k) => { if (!$(`[data-ph-chips="${k}"]`)) apply(k, "all"); });
  // Passage ordinateur ↔ téléphone : cartes et nombre par page changent, le filtre en cours est conservé.
  window.matchMedia("(max-width: 1079px)").addEventListener?.("change", () => Object.keys(lists).forEach((k) => apply(k, pageOf[k]?.value || "all", 1)));
  $$("[data-ph-more]").forEach((b) => b.addEventListener("click", () => {
    const root = b.closest(".ph");
    const l = $("[data-ph-list]", root);
    if (!l) return;
    l.dataset.phAll = "1";
    const active = $(`[data-ph-chips="${l.dataset.phList}"] [aria-pressed="true"]`);
    apply(l.dataset.phList, active ? active.dataset.phChip : "all");
    const first = itemsOf(l).find((it, i) => i >= (Number(l.dataset.phPer) || 0) && !it.hidden);
    $("a", first || l)?.focus();
  }));

  /* ------------------------------------------------------------------ Préférences de cookies */
  const KEY = "ph-consent";
  const banner = $("[data-ph-cookies]");
  const saved = store.get(KEY);
  const applyConsent = (c) => {
    document.documentElement.dataset.phAudience = c && c.audience ? "on" : "off";
    document.documentElement.dataset.phExternal = c && c.external ? "on" : "off";
    $$("[data-ph-pref]").forEach((i) => { if (i.dataset.phPref !== "necessary") i.checked = !!(c && c[i.dataset.phPref]); });
  };
  const saveConsent = (c) => { const v = { necessary: true, audience: !!c.audience, external: !!c.external, at: new Date().toISOString() }; store.set(KEY, v); applyConsent(v); if (banner) banner.hidden = true; live(T.cookiesSaved || ""); };
  if (banner && !saved && !$("[data-ph-prefs]")) banner.hidden = false;
  applyConsent(saved);
  $$("[data-ph-consent]").forEach((b) => b.addEventListener("click", () => saveConsent({ audience: b.dataset.phConsent === "accept", external: b.dataset.phConsent === "accept" })));
  $$("[data-ph-prefs]").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = {};
    $$("[data-ph-pref]", f).forEach((i) => { v[i.dataset.phPref] = i.checked; });
    saveConsent(v);
    const st = $("[data-ph-prefs-status]", f);
    if (st) { st.hidden = false; st.textContent = T.cookiesSaved || ""; }
  }));
  $$("[data-ph-cookies-open]").forEach((b) => b.addEventListener("click", (e) => {
    const prefs = $("[data-ph-prefs]");
    if (prefs) { e.preventDefault(); prefs.scrollIntoView({ behavior: "smooth", block: "start" }); $("input:not([disabled])", prefs)?.focus({ preventScroll: true }); }
    else if (banner) { e.preventDefault(); banner.hidden = false; $("button", banner)?.focus(); }
  }));
  $$("[data-ph-prefs-refuse]").forEach((b) => b.addEventListener("click", () => { saveConsent({}); }));

  /* ------------------------------------------------------------------ Formulaires : contact et demande de devis */
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE = /^[+\d][\d\s.\-()]{8,18}\d$/;
  const POST = /^\d{5}$/;
  const OK_TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", pdf: "application/pdf" };
  const RECAP = "ph-last-request";
  const sizeTxt = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(b / 1024))} Ko`);
  $$("form[data-ph-form]").forEach((form) => {
    const kind = form.dataset.phForm;
    const summary = $("[data-ph-summary]", form);
    const status = $("[data-ph-status]", form);
    const send = $("[data-ph-send]", form);
    const sendLabel = $("[data-ph-send-label]", form);
    const idle = sendLabel ? sendLabel.textContent : "";
    let busy = false;
    let files = [];
    const field = (key) => $(`[data-ph-field="${key}"]`, form);
    // Réponses du questionnaire de dépannage (commune, symptômes) reprises dans la demande, jamais envoyées seules.
    if (kind === "quote") {
      const q = new URLSearchParams(location.search);
      const town = (q.get("commune") || "").trim().slice(0, 80);
      const sym = q.getAll("symptome").map((v) => v.trim().slice(0, 120)).filter(Boolean);
      const city = form.elements["contact[commune]"];
      const body = form.elements["contact[body]"];
      if (town && city && !city.value) city.value = town;
      if (sym.length && body && !body.value) body.value = `${(q.get("motif") || "").trim().slice(0, 60) || "Symptômes"} : ${sym.join(", ")}.`;
    }
    const setErr = (key, msg) => {
      const f = field(key);
      if (!f) return;
      const err = $(".ph-field__err", f);
      f.classList.toggle("is-error", !!msg);
      $$("input, select, textarea", f).forEach((i) => { if (msg) i.setAttribute("aria-invalid", "true"); else i.removeAttribute("aria-invalid"); });
      if (err) { err.hidden = !msg; const sp = $("span", err); if (sp) sp.textContent = msg || ""; }
    };
    const val = (name) => { const el = form.elements[name]; if (!el) return ""; if (el instanceof RadioNodeList) return el.value || ""; if (el.type === "checkbox") return el.checked ? "oui" : ""; return String(el.value || "").trim(); };
    const rules = {
      name: () => (val("contact[name]") ? "" : T.required),
      email: () => (!val("contact[email]") ? T.required : EMAIL.test(val("contact[email]")) ? "" : T.email),
      phone: () => (!val("contact[phone]") || PHONE.test(val("contact[phone]")) ? "" : T.phone),
      subject: () => (form.elements["contact[subject]"] && !val("contact[subject]") ? T.choice : ""),
      body: () => (val("contact[body]") ? "" : T.required),
      consent: () => (val("contact[consent]") ? "" : T.consent),
      type: () => (form.elements["contact[type]"] && !val("contact[type]") ? T.choice : ""),
      place: () => (form.elements["contact[lieu]"] && !val("contact[lieu]") ? T.choice : ""),
      city: () => (form.elements["contact[commune]"] && !val("contact[commune]") ? T.required : ""),
      zip: () => (!form.elements["contact[code_postal]"] ? "" : !val("contact[code_postal]") ? T.required : POST.test(val("contact[code_postal]")) ? "" : T.postcode),
    };
    const keys = Object.keys(rules).filter((k) => field(k));
    const check = (k) => { const m = rules[k](); setErr(k, m); return m; };
    // Validation près du champ en quittant un champ déjà signalé ; aucune alerte pendant la première saisie.
    keys.forEach((k) => $$("input, select, textarea", field(k)).forEach((i) => {
      i.addEventListener(i.type === "radio" || i.type === "checkbox" || i.tagName === "SELECT" ? "change" : "blur", () => { if (field(k).classList.contains("is-error") || i.value) check(k); });
    }));
    /* Pièces jointes : formats et poids annoncés, nom, taille, retrait, erreur explicite (jamais acceptées en silence). */
    const input = $("[data-ph-files]", form);
    const list = $("[data-ph-file-list]", form);
    const maxN = Number(input?.dataset.phMax) || 5;
    const maxB = (Number(input?.dataset.phMaxMb) || 10) * 1048576;
    const drawFiles = () => {
      if (!list) return;
      list.innerHTML = "";
      files.forEach((f, i) => {
        const li = document.createElement("li");
        li.className = "ph-file";
        li.innerHTML = `<svg viewBox="0 0 32 32" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3h11l6 6v20H8z"/><path d="M19 3v6h6"/></svg><span class="ph-file__name"></span><span class="ph-file__size"></span><button type="button" class="ph-file__remove"><svg viewBox="0 0 32 32" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 8l16 16M24 8 8 24"/></svg><span class="visually-hidden"></span></button>`;
        $(".ph-file__name", li).textContent = f.name;
        $(".ph-file__size", li).textContent = sizeTxt(f.size);
        $(".ph-file__remove .visually-hidden", li).textContent = `${T.fileRemove || "Retirer"} ${f.name}`;
        $(".ph-file__remove", li).addEventListener("click", () => { files.splice(i, 1); drawFiles(); setErr("files", ""); live(`${f.name} — ${T.fileRemove || ""}`); input?.focus(); });
        list.appendChild(li);
      });
    };
    input?.addEventListener("change", () => {
      const refused = [];
      [...input.files].forEach((f) => {
        const ext = (f.name.split(".").pop() || "").toLowerCase();
        if (!OK_TYPES[ext] || (f.type && f.type !== OK_TYPES[ext] && !(ext === "jpg" && f.type === "image/jpeg"))) refused.push(`${f.name} : ${T.fileFormat}`);
        else if (f.size > maxB) refused.push(`${f.name} : ${T.fileSize}`);
        else if (files.length >= maxN) refused.push(`${f.name} : ${T.fileCount}`);
        else if (!files.some((x) => x.name === f.name && x.size === f.size)) files.push(f);
      });
      input.value = "";
      drawFiles();
      setErr("files", refused.join(" "));
      if (refused.length) live(refused.join(" "));
    });
    const drop = $(".ph-drop", form);
    if (drop && input) {
      ["dragenter", "dragover"].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.add("is-over"); }));
      ["dragleave", "drop"].forEach((e) => drop.addEventListener(e, (ev) => { ev.preventDefault(); drop.classList.remove("is-over"); }));
      drop.addEventListener("drop", (ev) => { if (ev.dataTransfer?.files?.length) { try { input.files = ev.dataTransfer.files; } catch (e) { /* navigateur ancien */ } input.dispatchEvent(new Event("change")); } });
    }
    const showStatus = (msg, cls) => { if (!status) return; status.hidden = false; status.className = `ph-form__status ${cls}`; status.textContent = msg; status.focus?.(); };
    const setBusy = (on) => { busy = on; if (send) { send.disabled = on; send.setAttribute("aria-busy", String(on)); } if (sendLabel) sendLabel.textContent = on ? T.sending || idle : idle; };
    const recap = () => ({
      kind, at: new Date().toISOString(), mode: cfg.mode,
      type: val("contact[type]") || val("contact[subject]"), body: val("contact[body]"),
      place: [val("contact[lieu]"), val("contact[commune]"), val("contact[code_postal]")].filter(Boolean).join(" · "),
      delay: val("contact[delai]"), files: files.map((f) => ({ name: f.name, size: f.size })),
    });
    form.addEventListener("submit", (e) => {
      if (busy) { e.preventDefault(); return; }
      const bad = keys.map((k) => [k, check(k)]).filter(([, m]) => m);
      if (bad.length) {
        e.preventDefault();
        if (summary) {
          summary.hidden = false;
          summary.innerHTML = `<p class="ph-form__summary-title"></p><ul></ul>`;
          $(".ph-form__summary-title", summary).textContent = T.errorTitle || "";
          bad.forEach(([k, m]) => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            const lab = $("label, .ph-field__label", field(k));
            const target = $("input:not([type=hidden]), select, textarea", field(k));
            a.href = `#${target?.id || ""}`;
            a.textContent = `${(lab?.textContent || k).replace(/\*|\(facultatif\)|\(optional\)/g, "").trim()} : ${m}`;
            a.addEventListener("click", (ev) => { ev.preventDefault(); target?.focus(); });
            li.appendChild(a);
            $("ul", summary).appendChild(li);
          });
          summary.focus();
        } else $("[aria-invalid=true]", form)?.focus();
        return;
      }
      if (summary) summary.hidden = true;
      const mode = cfg.mode || "platform";
      if (mode === "demo") {
        e.preventDefault();
        setBusy(true);
        showStatus(T.sending || "", "is-busy");
        // Démonstration : rien ne part ; la confirmation relit la saisie du visiteur.
        setTimeout(() => {
          try { sessionStorage.setItem(RECAP, JSON.stringify({ ...recap(), sent: false })); } catch (err) { /* stockage indisponible */ }
          showStatus(T.demo || "", "is-ok");
          setBusy(false);
          if (cfg.confirmPage && kind === "quote") setTimeout(() => { location.href = cfg.confirmPage; }, 900);
        }, 700);
        return;
      }
      if (mode === "off") { e.preventDefault(); showStatus(T.blocked || "", "is-error"); return; }
      // Boutique : le formulaire de contact de la plateforme ne transmet pas de fichier : blocage annoncé, saisie gardée.
      if (files.length) { e.preventDefault(); setErr("files", T.blocked || ""); showStatus(T.blocked || "", "is-error"); return; }
      try { sessionStorage.setItem(RECAP, JSON.stringify({ ...recap(), sent: "pending" })); } catch (err) { /* stockage indisponible */ }
      setBusy(true);
    });
    // Retour de la plateforme après un envoi accepté : la confirmation peut annoncer « Demande transmise ».
    if ($(".ph-form__status.is-ok:not([data-ph-status])", form)) {
      try { const r = JSON.parse(sessionStorage.getItem(RECAP) || "null"); if (r && r.sent === "pending") { r.sent = true; sessionStorage.setItem(RECAP, JSON.stringify(r)); if (cfg.confirmPage && r.kind === "quote") location.href = cfg.confirmPage; } } catch (err) { /* rien */ }
    }
    if ($(".ph-form__status.is-error:not([data-ph-status])", form)) { try { const r = JSON.parse(sessionStorage.getItem(RECAP) || "null"); if (r && r.sent === "pending") { r.sent = false; r.failed = true; sessionStorage.setItem(RECAP, JSON.stringify(r)); } } catch (err) { /* rien */ } }
  });

  /* ------------------------------------------------------------------ Confirmation : récapitulatif de la vraie saisie */
  const conf = $("[data-ph-confirm]");
  if (conf) {
    let r = null;
    try { r = JSON.parse(sessionStorage.getItem(RECAP) || "null"); } catch (e) { r = null; }
    const st = $("[data-ph-confirm-status]", conf);
    const set = (k, v) => { const n = $(`[data-ph-recap="${k}"]`, conf); if (n) n.textContent = v; };
    if (r) {
      if (st) { $("span", st).textContent = r.sent === true ? st.dataset.sent : st.dataset.demo; st.classList.toggle("is-sent", r.sent === true); }
      const t = $('[data-ph-recap="type"]', conf);
      set("type", r.type || t?.dataset.empty || "");
      const max = Number($('[data-ph-recap="body"]', conf)?.dataset.max) || 110;
      set("body", r.body ? (r.body.length > max ? `${r.body.slice(0, max - 1)}…` : r.body) : "");
      const pl = $('[data-ph-recap="place"]', conf);
      set("place", r.place || pl?.dataset.empty || "");
      const fc = $('[data-ph-recap="files-count"]', conf);
      const n = (r.files || []).length;
      if (fc) fc.textContent = n === 0 ? fc.dataset.zero : n === 1 ? fc.dataset.one : (fc.dataset.many || "[n]").replace("[n]", String(n));
      set("files", (r.files || []).map((f) => f.name).join(", "));
    }
  }
})();
