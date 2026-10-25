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
  const apply = (kind, value) => {
    (lists[kind] || []).forEach((l) => {
      const per = Number(l.dataset.phPer) || 0;
      const root = l.closest(".ph") || l.parentElement;
      const shown = itemsOf(l).filter((it) => !value || value === "all" || (it.dataset.phCat || "").split(/\s+/).includes(value) || (it.dataset.phCat || "") === value);
      const limit = per && l.dataset.phAll !== "1" ? per : Infinity;
      itemsOf(l).forEach((it) => { it.hidden = true; });
      shown.forEach((it, i) => { it.hidden = i >= limit; });
      const empty = $("[data-ph-empty]", root);
      if (empty) empty.hidden = shown.length > 0;
      const more = $("[data-ph-more-wrap]", root);
      if (more) more.hidden = !(shown.length > limit);
      const count = $("[data-ph-count]", root);
      if (count) count.textContent = (count.dataset.phCountText || "[n]").replace("[n]", String(Math.min(shown.length, limit)));
    });
  };
  $$("[data-ph-chips]").forEach((g) => {
    const kind = g.dataset.phChips;
    const chips = $$("[data-ph-chip]", g);
    chips.forEach((c) => c.addEventListener("click", () => {
      chips.forEach((x) => x.setAttribute("aria-pressed", String(x === c)));
      (lists[kind] || []).forEach((l) => { l.dataset.phAll = "0"; });
      apply(kind, c.dataset.phChip);
      try { history.replaceState(null, "", c.dataset.phChip === "all" ? location.pathname : `${location.pathname}?filtre=${encodeURIComponent(c.dataset.phChip)}`); } catch (e) { /* aperçu */ }
    }));
    const wanted = new URLSearchParams(location.search).get("filtre");
    const start = chips.find((c) => c.dataset.phChip === wanted) || chips.find((c) => c.getAttribute("aria-pressed") === "true") || chips[0];
    if (start) { chips.forEach((x) => x.setAttribute("aria-pressed", String(x === start))); apply(kind, start.dataset.phChip); }
  });
  Object.keys(lists).forEach((k) => { if (!$(`[data-ph-chips="${k}"]`)) apply(k, "all"); });
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

  /* ------------------------------------------------------------------ Formulaires (voir plus bas) */
  window.__phaseForms && window.__phaseForms({ $, $$, cfg, T, live, store });
})();
