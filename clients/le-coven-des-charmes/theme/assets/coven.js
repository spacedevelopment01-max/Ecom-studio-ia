/*
 * Le Coven des Charmes — interactions du site (projet client dédié).
 * Menu du téléphone, icônes, liens actifs, accordéons, onglets, galerie, quantité et taille, panier, formulaires
 * (erreurs à côté des champs, chargement, aucun double envoi), préférences de cookies (aucun traceur avant accord).
 * Dans l'aperçu du studio, la commande, le compte et les messages sont des simulations marquées : rien n'est envoyé.
 */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  var $ = function (sel, el) { return (el || doc).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(sel)); };
  // Stockage du navigateur ; quand un aperçu isolé l'interdit, mémoire de l'onglet (window.name), conservée d'une
  // page à l'autre pour que panier, commande simulée et choix de cookies suivent la visite.
  var area = function (n) { try { var s = window[n], t = "__cvn"; s.setItem(t, "1"); s.removeItem(t); return s; } catch (e) { return null; } };
  var LS = area("localStorage"), SS = area("sessionStorage");
  var memo = function () { try { return window.name.indexOf("cvn:") === 0 ? JSON.parse(window.name.slice(4)) : {}; } catch (e) { return {}; } };
  var memoSet = function (k, v) { var m = memo(); m[k] = v; try { window.name = "cvn:" + JSON.stringify(m); } catch (e) { /* mémoire indisponible */ } };
  var read = function (s, k) { if (!s) { var v = memo()[k]; return v === undefined ? null : v; } try { return JSON.parse(s.getItem(k)); } catch (e) { return null; } };
  var write = function (s, k, v) { if (!s) { memoSet(k, v); return; } try { s.setItem(k, JSON.stringify(v)); } catch (e) { memoSet(k, v); } };
  var store = {
    get: function (k) { return read(LS, k); },
    set: function (k, v) { write(LS, k, v); },
    sget: function (k) { return read(SS, SS ? k : "s:" + k); },
    sset: function (k, v) { write(SS, SS ? k : "s:" + k, v); }
  };
  doc.body.classList.add("cvn-body");

  /* ------------------------------------------------ ouverture d'une page : en haut (sauf lien vers une ancre) */
  // Certains aperçus intégrés gardent la position de la page précédente : on remonte la page et son cadre.
  if (!location.hash) {
    try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) { /* sans effet */ }
    window.scrollTo(0, 0);
    if (window.top !== window && !(window.Shopify && window.Shopify.designMode)) { try { root.scrollIntoView({ block: "start" }); } catch (e) { /* cadre fermé */ } }
  }

  /* ------------------------------------------------ icônes (sprite du projet, inséré une fois) */
  var flag = $("[data-cvn-icons]");
  if (flag && !doc.getElementById("cvn-sprite")) {
    var url = flag.getAttribute("data-cvn-icons");
    var inline = window.__covenSprite;
    var put = function (svg) { var d = doc.createElement("div"); d.id = "cvn-sprite"; d.setAttribute("aria-hidden", "true"); d.style.cssText = "position:absolute;width:0;height:0;overflow:hidden"; d.innerHTML = svg; doc.body.insertBefore(d, doc.body.firstChild); };
    if (inline) put(inline);
    else if (url && window.fetch) fetch(url).then(function (r) { return r.ok ? r.text() : ""; }).then(function (t) { if (t.indexOf("<svg") > -1) put(t); }).catch(function () {});
  }

  /* ------------------------------------------------ échelle ordinateur (1024 à 1439 px) */
  var scale = function () { var w = root.clientWidth; root.style.setProperty("--cvn-dz", w >= 1024 && w < 1440 ? String(w / 1440) : "1"); };
  scale(); window.addEventListener("resize", scale);

  /* ------------------------------------------------ liens actifs (aussi dans l'aperçu exporté en fichiers) */
  var here = location.pathname.replace(/\/+$/, "") || "/";
  var hereFile = here.split("/").pop();
  $$(".cvn-header__link, .cvn-menu__link, .cvn-footer a").forEach(function (a) {
    var href = a.getAttribute("href") || ""; if (!href || href.charAt(0) === "#") return;
    var p; try { p = new URL(href, location.href).pathname.replace(/\/+$/, "") || "/"; } catch (e) { return; }
    var same = p === here || (/\.html$/.test(hereFile) && p.split("/").pop() === hereFile);
    var parent = a.getAttribute("data-cvn-parent");
    if (same || (parent && here.indexOf(parent) > -1)) { a.classList.add("is-active"); a.setAttribute("aria-current", "page"); }
  });

  /* ------------------------------------------------ menu du téléphone */
  var menu = $("[data-cvn-menu]"), opener = $("[data-cvn-menu-open]");
  var closeMenu = function () { if (!menu || menu.hidden) return; menu.hidden = true; menu.classList.remove("is-open"); root.classList.remove("cvn-menu-open"); if (opener) { opener.setAttribute("aria-expanded", "false"); opener.focus(); } };
  if (menu && opener) {
    opener.addEventListener("click", function () { menu.hidden = false; menu.classList.add("is-open"); root.classList.add("cvn-menu-open"); opener.setAttribute("aria-expanded", "true"); var c = $("[data-cvn-menu-close]", menu); if (c) c.focus(); });
    $$("[data-cvn-menu-close]", menu).forEach(function (b) { b.addEventListener("click", closeMenu); });
    menu.addEventListener("click", function (e) { if (e.target === menu) closeMenu(); });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
      if (e.key === "Tab" && !menu.hidden) {
        var f = $$("a, button", menu).filter(function (x) { return x.offsetParent !== null; }); if (!f.length) return;
        if (e.shiftKey && doc.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && doc.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    window.matchMedia("(min-width: 1024px)").addEventListener("change", function (m) { if (m.matches) closeMenu(); });
  }

  /* ------------------------------------------------ accordéons (un ouvert à la fois si demandé) */
  $$("[data-cvn-acc]").forEach(function (group) {
    var single = group.hasAttribute("data-cvn-acc-single");
    $$("[data-cvn-acc-btn]", group).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        if (single) $$("[data-cvn-acc-btn]", group).forEach(function (b) { if (b !== btn) setAcc(b, false); });
        setAcc(btn, !open);
      });
    });
  });
  function setAcc(btn, open) { btn.setAttribute("aria-expanded", open ? "true" : "false"); var p = doc.getElementById(btn.getAttribute("aria-controls")); if (p) p.hidden = !open; var item = btn.closest("[data-cvn-acc-item]"); if (item) item.classList.toggle("is-open", open); }

  /* ------------------------------------------------ onglets (flèches du clavier, filtre des accordéons) */
  $$("[data-cvn-tabs]").forEach(function (list) {
    var tabs = $$("[role=tab]", list);
    var select = function (t, focus) {
      tabs.forEach(function (x) { var on = x === t; x.setAttribute("aria-selected", on ? "true" : "false"); x.tabIndex = on ? 0 : -1; var p = doc.getElementById(x.getAttribute("aria-controls")); if (p) p.hidden = !on; });
      var scope = list.getAttribute("data-cvn-tabs-filter");
      if (scope) $$("[data-cvn-cat]", doc.getElementById(scope)).forEach(function (it) { it.hidden = t.getAttribute("data-cvn-tab") !== "all" && it.getAttribute("data-cvn-cat") !== t.getAttribute("data-cvn-tab"); });
      if (focus) t.focus();
      if (list.hasAttribute("data-cvn-tabs-hash") && t.getAttribute("data-cvn-tab")) history.replaceState(null, "", "#" + t.getAttribute("data-cvn-tab"));
    };
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        var n = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
        if (e.key === "Home") { e.preventDefault(); select(tabs[0], true); } else if (e.key === "End") { e.preventDefault(); select(tabs[tabs.length - 1], true); }
        else if (n) { e.preventDefault(); select(tabs[(i + n + tabs.length) % tabs.length], true); }
      });
    });
    var wanted = location.hash.slice(1); var start = wanted && tabs.filter(function (t) { return t.getAttribute("data-cvn-tab") === wanted; })[0];
    if (start) select(start);
  });

  /* ------------------------------------------------ galerie produit (vignettes, flèches, toucher) */
  $$("[data-cvn-gallery]").forEach(function (g) {
    var slides = $$("[data-cvn-slide]", g), thumbs = $$("[data-cvn-thumb]", g), cur = 0;
    var show = function (i) {
      cur = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.hidden = k !== cur; });
      thumbs.forEach(function (t, k) { t.setAttribute("aria-current", k === cur ? "true" : "false"); });
      var live = $("[data-cvn-gallery-status]", g); if (live) live.textContent = (cur + 1) + " / " + slides.length;
    };
    thumbs.forEach(function (t, k) { t.addEventListener("click", function () { show(k); }); });
    $$("[data-cvn-prev]", g).forEach(function (b) { b.addEventListener("click", function () { show(cur - 1); }); });
    $$("[data-cvn-next]", g).forEach(function (b) { b.addEventListener("click", function () { show(cur + 1); }); });
    var x0 = null; g.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    g.addEventListener("touchend", function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) show(cur + (dx < 0 ? 1 : -1)); x0 = null; });
    if (slides.length) show(0);
  });

  /* ------------------------------------------------ agrandissement des exemples */
  var box = null;
  $$("[data-cvn-zoom]").forEach(function (b) {
    b.addEventListener("click", function (e) {
      e.preventDefault();
      if (!box) {
        box = doc.createElement("div"); box.className = "cvn-lightbox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
        box.innerHTML = '<button type="button" class="cvn-lightbox__close" data-cvn-lb-close><svg class="cvn-icon" aria-hidden="true"><use href="#coven-fermer"></use></svg><span class="cvn-sr">Fermer</span></button><figure class="cvn-lightbox__fig"><img alt=""><figcaption></figcaption></figure>';
        doc.body.appendChild(box);
        box.addEventListener("click", function (e) { if (e.target === box || e.target.closest("[data-cvn-lb-close]")) closeBox(); });
        doc.addEventListener("keydown", function (e) { if (e.key === "Escape") closeBox(); });
      }
      var img = $("img", box); img.src = b.getAttribute("data-cvn-zoom"); img.alt = b.getAttribute("data-cvn-zoom-alt") || "";
      $("figcaption", box).textContent = b.getAttribute("data-cvn-zoom-caption") || "";
      box.setAttribute("aria-label", b.getAttribute("data-cvn-zoom-caption") || "Agrandissement");
      box.hidden = false; box.classList.add("is-open"); box._from = b; $("[data-cvn-lb-close]", box).focus();
    });
  });
  function closeBox() { if (!box || box.hidden) return; box.hidden = true; box.classList.remove("is-open"); if (box._from) box._from.focus(); }

  /* ------------------------------------------------ quantité */
  $$("[data-cvn-qty]").forEach(function (q) {
    var input = $("input", q);
    var clamp = function (v) { var min = Number(input.min || 1), max = Number(input.max || 99); v = Math.round(Number(v)); if (!isFinite(v)) v = min; return Math.min(max, Math.max(min, v)); };
    $$("[data-cvn-qty-step]", q).forEach(function (b) { b.addEventListener("click", function () { input.value = clamp(Number(input.value) + Number(b.getAttribute("data-cvn-qty-step"))); input.dispatchEvent(new Event("change", { bubbles: true })); }); });
    input.addEventListener("change", function () { input.value = clamp(input.value); });
  });

  window.Coven = { $: $, $$: $$, store: store, setAcc: setAcc };
})();
(function () {
  "use strict";
  if (!window.Coven) return;
  var C = window.Coven, $ = C.$, $$ = C.$$, store = C.store, doc = document;
  var flag = $("[data-cvn-icons]");
  /* Mode du commerce : « simulation » (aperçu du studio, aucun tarif confirmé) ou « shopify » (panier réel). */
  var SIM = !flag || flag.getAttribute("data-cvn-mode") !== "shopify";
  var R = window.routes || {};
  var root = (R.root || "/").replace(/\/?$/, "/");
  var CART_KEY = "cvn-cart", ORDER_KEY = "cvn-order", MAXQ = 10;
  var fmt = function (cents) { return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }); };
  var toggleSim = function () { $$("[data-cvn-sim-only]").forEach(function (el) { el.hidden = !SIM; }); };
  toggleSim();

  /* ------------------------------------------------ panier (Shopify, ou simulation dans le navigateur) */
  var cart = {
    get: function () {
      if (SIM) { var c = store.get(CART_KEY); return Promise.resolve(c && Array.isArray(c.items) ? c : { items: [] }); }
      return fetch(root + "cart.js", { headers: { accept: "application/json" } }).then(function (r) { if (!r.ok) throw new Error("cart"); return r.json(); }).then(function (j) {
        return { items: j.items.map(function (it) { var props = it.properties || {}; var size = ""; for (var k in props) if (props.hasOwnProperty(k) && k.charAt(0) !== "_") size = props[k]; return { key: it.key, id: it.id, qty: it.quantity, size: size, price: it.price > 0 ? it.price : null, title: it.product_title, image: it.image }; }) };
      });
    },
    save: function (c) { store.set(CART_KEY, c); return Promise.resolve(c); },
    add: function (line) {
      if (SIM) return cart.get().then(function (c) {
        var hit = c.items.filter(function (it) { return it.size === line.size; })[0];
        if (hit) hit.qty = Math.min(MAXQ, hit.qty + line.qty); else c.items.push({ key: "l" + Date.now(), qty: Math.min(MAXQ, line.qty), size: line.size, price: line.price, title: line.title, image: line.image });
        return cart.save(c);
      });
      var props = {}; props[line.prop || "Taille"] = line.size;
      return fetch((R.cart_add || root + "cart/add") + ".js", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ id: line.id, quantity: line.qty, properties: props }) })
        .then(function (r) { if (!r.ok) return r.json().then(function (j) { throw new Error(j.description || "add"); }); return cart.get(); });
    },
    change: function (key, upd) {
      if (SIM) return cart.get().then(function (c) {
        c.items = c.items.map(function (it) { if (it.key !== key) return it; if (upd.qty !== undefined) it.qty = upd.qty; if (upd.size !== undefined) it.size = upd.size; return it; }).filter(function (it) { return it.qty > 0; });
        var merged = []; c.items.forEach(function (it) { var m = merged.filter(function (x) { return x.size === it.size; })[0]; if (m) m.qty = Math.min(MAXQ, m.qty + it.qty); else merged.push(it); }); c.items = merged;
        return cart.save(c);
      });
      var body = { id: key }; if (upd.qty !== undefined) body.quantity = upd.qty;
      if (upd.size !== undefined) { body.properties = {}; body.properties[upd.prop || "Taille"] = upd.size; }
      return fetch((R.cart_change || root + "cart/change") + ".js", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(body) })
        .then(function (r) { if (!r.ok) throw new Error("change"); return cart.get(); });
    }
  };
  var count = function (c) { var n = c.items.reduce(function (s, it) { return s + it.qty; }, 0); $$("[data-cvn-cart-count]").forEach(function (b) { b.textContent = n; b.hidden = n === 0; }); return n; };
  cart.get().then(count).catch(function () {});

  /* ------------------------------------------------ fiche : ajout au panier */
  $$("[data-cvn-product-form]").forEach(function (form) {
    var size = $("[data-cvn-size]", form), qty = $("input[name=quantity]", form), btn = $("[data-cvn-add]", form), status = $("[data-cvn-add-status]", form);
    var label = $("[data-cvn-add-label]", form), base = label ? label.textContent : "";
    var sec = form.closest("[data-cvn-product]");
    var sizeField = size && size.closest(".cvn-field"), sizeErr = sizeField && $(".cvn-field__error", sizeField);
    if (size) size.addEventListener("change", function () { if (sizeField) sizeField.classList.remove("is-invalid"); if (sizeErr) sizeErr.hidden = true; size.removeAttribute("aria-invalid"); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.classList.contains("is-loading")) return;
      if (size && size.required && !size.value) { sizeField.classList.add("is-invalid"); sizeErr.hidden = false; size.setAttribute("aria-invalid", "true"); size.focus(); return; }
      form.classList.add("is-loading"); btn.disabled = true; if (label) label.textContent = sec.getAttribute("data-adding");
      var priceOk = sec.getAttribute("data-price-confirmed") === "true";
      cart.add({ id: Number($("input[name=id]", form).value), qty: Math.max(1, Math.min(MAXQ, Number(qty.value) || 1)), size: size ? size.value : "", prop: sec.getAttribute("data-size-prop"), price: priceOk ? Number(sec.getAttribute("data-price")) : null, title: sec.getAttribute("data-title"), image: sec.getAttribute("data-image") })
        .then(function (c) { count(c); status.className = "cvn-pform__status"; status.innerHTML = ""; status.appendChild(doc.createTextNode(sec.getAttribute("data-added") + " ")); var a = doc.createElement("a"); a.href = sec.getAttribute("data-cart-url"); a.textContent = sec.getAttribute("data-see-cart"); status.appendChild(a); })
        .catch(function () { status.className = "cvn-pform__status is-error"; status.textContent = sec.getAttribute("data-error"); })
        .then(function () { form.classList.remove("is-loading"); btn.disabled = false; if (label) label.textContent = base; });
    });
  });

  /* ------------------------------------------------ page panier */
  var cartEl = $("[data-cvn-cart]");
  if (cartEl) {
    var sizes = (cartEl.getAttribute("data-sizes") || "").split("|").map(function (x) { return x.trim(); }).filter(Boolean);
    var ph = cartEl.getAttribute("data-size-placeholder") || "À préciser", note = cartEl.getAttribute("data-price-note") || "";
    var goLink = $("[data-cvn-checkout]", cartEl), goHref = goLink ? goLink.href : cartEl.getAttribute("data-checkout");
    var tpl = $("template[data-cvn-line-tpl]", cartEl), linesEl = $("[data-cvn-cart-lines]", cartEl), errEl = $("[data-cvn-cart-error]", cartEl);
    var busy = false;
    var paint = function (c) {
      $("[data-cvn-cart-loading]", cartEl).hidden = true;
      var empty = !c.items.length;
      $("[data-cvn-cart-empty]", cartEl).hidden = !empty; linesEl.hidden = empty; $("[data-cvn-cart-bottom]", cartEl).hidden = empty;
      linesEl.innerHTML = "";
      var known = true, total = 0;
      c.items.forEach(function (it, i) {
        var node = tpl.content.firstElementChild.cloneNode(true);
        var img = $("[data-cvn-line-img]", node); img.src = cartEl.getAttribute("data-photo") || it.image || ""; img.alt = cartEl.getAttribute("data-photo-alt") || "";
        $("[data-cvn-line-title]", node).textContent = it.title || "";
        var sel = $("[data-cvn-line-size]", node), opts = sizes.length ? [""].concat(sizes) : [ph];
        if (it.size && opts.indexOf(it.size) < 0) opts.push(it.size);
        opts.forEach(function (o) { var op = doc.createElement("option"); op.value = o; op.textContent = o || ph; if ((it.size || "") === o || (!it.size && o === ph)) op.selected = true; sel.appendChild(op); });
        var q = $("[data-cvn-line-qty]", node); q.value = it.qty; q.max = MAXQ;
        var ids = ["CvnLineSize" + i, "CvnLineQty" + i]; sel.id = ids[0]; q.id = ids[1];
        $("[data-cvn-for=size]", node).setAttribute("for", ids[0]); $("[data-cvn-for=qty]", node).setAttribute("for", ids[1]);
        if (it.price === null || it.price === undefined) { known = false; $("[data-cvn-line-price]", node).textContent = "— €"; }
        else { total += it.price * it.qty; $("[data-cvn-line-price]", node).textContent = fmt(it.price * it.qty); $("[data-cvn-line-pricenote]", node).hidden = true; }
        var upd = function (u) { if (busy) return; busy = true; errEl.hidden = true; u.prop = cartEl.getAttribute("data-size-prop"); cart.change(it.key, u).then(function (c2) { count(c2); paint(c2); }).catch(function () { errEl.hidden = false; errEl.textContent = cartEl.getAttribute("data-error"); }).then(function () { busy = false; }); };
        sel.addEventListener("change", function () { upd({ size: sel.value }); });
        $$("[data-cvn-line-step]", node).forEach(function (b) { b.addEventListener("click", function () { upd({ qty: Math.max(0, Math.min(MAXQ, it.qty + Number(b.getAttribute("data-cvn-line-step")))) }); }); });
        q.addEventListener("change", function () { var v = Math.round(Number(q.value)); if (!isFinite(v) || v < 0) v = it.qty; upd({ qty: Math.min(MAXQ, v) }); });
        $("[data-cvn-line-remove]", node).addEventListener("click", function () { upd({ qty: 0 }); });
        linesEl.appendChild(node);
      });
      $$("[data-cvn-subtotal], [data-cvn-total]", cartEl).forEach(function (el) { el.textContent = known ? fmt(total) : "— €"; });
      $("[data-cvn-total-note]", cartEl).hidden = known;
      var go = $("[data-cvn-checkout]", cartEl), closed = $("[data-cvn-checkout-note]", cartEl);
      if (SIM) { go.href = goHref; closed.hidden = true; go.removeAttribute("aria-disabled"); }
      else if (!known) { go.removeAttribute("href"); go.setAttribute("aria-disabled", "true"); go.setAttribute("role", "link"); closed.hidden = false; }
      else { go.href = root + "checkout"; closed.hidden = true; }
    };
    cart.get().then(paint).catch(function () { $("[data-cvn-cart-loading]", cartEl).hidden = true; errEl.hidden = false; errEl.textContent = cartEl.getAttribute("data-error"); });
  }

  /* ------------------------------------------------ validation des formulaires */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var validate = function (form) {
    var bad = [];
    $$("[required]", form).forEach(function (f) {
      if (f.offsetParent === null && f.type !== "checkbox") return;
      var v = (f.value || "").trim(), ok = true;
      if (f.type === "checkbox") ok = f.checked;
      else if (!v) ok = false;
      else if (f.type === "email") ok = EMAIL.test(v);
      else if (f.pattern) ok = new RegExp("^(?:" + f.pattern + ")$").test(v);
      if (ok && f.minLength > 0 && v.length < f.minLength) ok = false;
      var field = f.closest(".cvn-field"), err = field && $(".cvn-field__error", field);
      if (field) field.classList.toggle("is-invalid", !ok);
      if (err) { err.hidden = ok; err.textContent = ok ? "" : f.getAttribute("data-cvn-msg") || ""; if (!err.id) err.id = (f.id || "f" + Math.random().toString(36).slice(2)) + "-err"; }
      if (ok) { f.removeAttribute("aria-invalid"); } else { f.setAttribute("aria-invalid", "true"); if (err) f.setAttribute("aria-describedby", err.id); bad.push(f); }
    });
    var sum = $("[data-cvn-errors]", form);
    if (sum) {
      var ul = $("ul", sum); ul.innerHTML = "";
      bad.forEach(function (f) { var li = doc.createElement("li"), a = doc.createElement("a"); var lab = f.id && $("label[for='" + f.id + "']", form); a.href = "#" + f.id; a.textContent = (lab ? lab.textContent.replace("*", "").trim() + " : " : "") + (f.getAttribute("data-cvn-msg") || ""); a.addEventListener("click", function (e) { e.preventDefault(); f.focus(); }); li.appendChild(a); ul.appendChild(li); });
      sum.hidden = !bad.length; if (bad.length) sum.focus();
    } else if (bad.length) bad[0].focus();
    return !bad.length;
  };
  $$("[data-cvn-form]").forEach(function (form) {
    form.addEventListener("input", function (e) { var f = e.target, field = f.closest && f.closest(".cvn-field.is-invalid"); if (field) { field.classList.remove("is-invalid"); var er = $(".cvn-field__error", field); if (er) er.hidden = true; f.removeAttribute("aria-invalid"); } });
    form.addEventListener("change", function (e) { var f = e.target, field = f.closest && f.closest(".cvn-field.is-invalid"); if (field && (f.type === "checkbox" ? f.checked : f.value)) { field.classList.remove("is-invalid"); var er = $(".cvn-field__error", field); if (er) er.hidden = true; } });
  });
  var setBusy = function (form, on) { var b = $("[data-cvn-submit]", form) || $("button[type=submit]", form); if (!b) return; b.disabled = on; var l = $("[data-cvn-submit-label]", b), w = $("[data-cvn-submit-busy]", b); if (l && w) { l.hidden = on; w.hidden = !on; } form.classList.toggle("is-loading", on); };
  var say = function (form, text, kind) { var st = $("[data-cvn-status]", form); if (st) { st.className = "cvn-form-status" + (kind ? " is-" + kind : ""); st.textContent = text; } };

  /* Contact, compte, nouvelles : vérifiés ; dans l'aperçu, rien n'est envoyé. */
  $$("[data-cvn-form=contact], [data-cvn-form=login], [data-cvn-form=register], [data-cvn-form=recover], [data-cvn-form=newsletter]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      if (form.classList.contains("is-loading")) { e.preventDefault(); return; }
      if (!validate(form)) { e.preventDefault(); return; }
      var kind = form.getAttribute("data-cvn-form");
      var simulated = SIM || (kind === "newsletter" && form.getAttribute("data-cvn-simulated") === "true");
      if (!simulated) { setBusy(form, true); return; }
      e.preventDefault(); setBusy(form, true);
      var host = form.closest("[data-sim]");
      setTimeout(function () {
        setBusy(form, false);
        var msg = kind === "contact" ? (host && host.getAttribute("data-sim")) : kind === "newsletter" ? "Aperçu : aucune inscription n'est enregistrée tant qu'un service d'envoi n'est pas relié." : "Aperçu : rien n'a été envoyé et aucun compte n'est connecté.";
        say(form, msg, "info");
      }, 600);
    });
  });

  /* ------------------------------------------------ commande (simulation) */
  var co = $("[data-cvn-checkout-page]");
  if (co) {
    var form = $("[data-cvn-form=checkout]", co), sumEl = $("[data-cvn-sum-lines]", co);
    var refusal = $("[data-cvn-simulate-refusal]", co); if (refusal) refusal.closest("label").hidden = !SIM;
    var current = { items: [] };
    var drawLines = function (target, items) {
      target.innerHTML = "";
      var photo = co.getAttribute("data-photo") || (items[0] && items[0].image) || "";
      items.forEach(function (it) {
        var d = doc.createElement("div"); d.className = "cvn-sum__line";
        d.innerHTML = '<img alt="" width="160" height="140"><div><p class="cvn-sum__name"></p><p class="cvn-sum__meta"></p></div><p class="cvn-sum__price"><strong></strong><small></small></p>';
        $("img", d).src = photo; $(".cvn-sum__name", d).textContent = it.title || "";
        $(".cvn-sum__meta", d).innerHTML = ""; [co.getAttribute("data-example"), co.getAttribute("data-size") + " : " + (it.size || co.getAttribute("data-size-placeholder")), co.getAttribute("data-qty") + " : " + it.qty].forEach(function (t) { var s = doc.createElement("span"); s.textContent = t; $(".cvn-sum__meta", d).appendChild(s); });
        $(".cvn-sum__price strong", d).textContent = it.price == null ? "— €" : fmt(it.price * it.qty); $(".cvn-sum__price small", d).textContent = it.price == null ? co.getAttribute("data-price-note") : "";
        target.appendChild(d);
      });
    };
    cart.get().then(function (c) {
      current = c; drawLines(sumEl, c.items);
      var known = c.items.every(function (it) { return it.price != null; }), total = c.items.reduce(function (s, it) { return s + (it.price || 0) * it.qty; }, 0);
      $("[data-cvn-total]", co).textContent = known && c.items.length ? fmt(total) : "— €"; $("[data-cvn-total-note]", co).hidden = known && c.items.length > 0;
      if (!c.items.length) { say(form, co.getAttribute("data-empty"), "error"); }
      if (!SIM) { say(form, co.getAttribute("data-shopify"), "info"); $("[data-cvn-submit]", form).disabled = true; }
    });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.classList.contains("is-loading") || !SIM) return;
      if (!current.items.length) { say(form, co.getAttribute("data-empty"), "error"); return; }
      if (!validate(form)) return;
      setBusy(form, true); say(form, "", "");
      setTimeout(function () {
        if (refusal && refusal.checked) { setBusy(form, false); say(form, co.getAttribute("data-refused"), "error"); return; }
        var data = {}; $$("input, select", form).forEach(function (f) { if (f.name && f.type !== "checkbox") data[f.name] = f.value.trim(); });
        var ref = "APERCU-" + Math.random().toString(36).slice(2, 7).toUpperCase();
        store.sset(ORDER_KEY, { ref: ref, at: Date.now(), items: current.items, contact: { first_name: data.first_name, city: data.city, country: data.country } });
        cart.save({ items: [] }).then(function () { var l = $("[data-cvn-confirm-link]", co); location.href = l ? l.href : co.getAttribute("data-confirm"); });
      }, 900);
    });
  }

  /* ------------------------------------------------ confirmation */
  var cf = $("[data-cvn-confirm]");
  if (cf) {
    var order = store.sget(ORDER_KEY), lines = $("[data-cvn-sum-lines]", cf);
    if (order && order.items && order.items.length) {
      var photo = cf.getAttribute("data-photo") || "";
      order.items.forEach(function (it) {
        var d = doc.createElement("div"); d.className = "cvn-sum__line";
        d.innerHTML = '<img alt="" width="160" height="140"><div><p class="cvn-sum__name"></p><p class="cvn-sum__meta"></p></div><p class="cvn-sum__price"><strong></strong><small></small></p>';
        $("img", d).src = photo; $(".cvn-sum__name", d).textContent = it.title || "";
        [cf.getAttribute("data-example"), cf.getAttribute("data-size") + " : " + (it.size || cf.getAttribute("data-size-placeholder")), cf.getAttribute("data-qty") + " : " + it.qty].forEach(function (t) { var s = doc.createElement("span"); s.textContent = t; $(".cvn-sum__meta", d).appendChild(s); });
        $(".cvn-sum__price strong", d).textContent = it.price == null ? "— €" : fmt(it.price * it.qty); $(".cvn-sum__price small", d).textContent = it.price == null ? cf.getAttribute("data-price-note") : "";
        lines.appendChild(d);
      });
      var who = $("[data-cvn-confirm-who]", cf); who.hidden = false;
      who.textContent = order.ref + (order.contact && order.contact.first_name ? " — " + order.contact.first_name : "") + (order.contact && order.contact.city ? ", " + order.contact.city : "") + (order.contact && order.contact.country ? " (" + order.contact.country + ")" : "");
      $$("[data-cvn-state]", cf).forEach(function (li) { li.classList.toggle("is-current", li.getAttribute("data-cvn-state") === "1"); });
    } else {
      $("[data-cvn-confirm-empty]", cf).hidden = false;
      $$("[data-cvn-state-status]", cf).forEach(function (st) { st.textContent = cf.getAttribute("data-later"); });
    }
  }

  /* ------------------------------------------------ compte */
  var acc = $("[data-cvn-account]");
  if (acc) {
    $$("[data-cvn-pass]", acc).forEach(function (b) { b.addEventListener("click", function () { var i = $("input", b.parentNode), show = i.type === "password"; i.type = show ? "text" : "password"; b.setAttribute("aria-pressed", show ? "true" : "false"); }); });
    $$("[data-cvn-tab-go]", acc).forEach(function (b) { b.addEventListener("click", function () { var t = $("[role=tab][data-cvn-tab='" + b.getAttribute("data-cvn-tab-go") + "']", acc); if (t) { t.click(); t.focus(); } }); });
    $$("[data-cvn-needs-login]", acc).forEach(function (a) { a.addEventListener("click", function (e) { if (!SIM) return; e.preventDefault(); var st = $("[data-cvn-needs-status]", acc); st.className = "cvn-form-status is-info"; st.textContent = acc.getAttribute("data-needs"); }); });
  }

  /* ------------------------------------------------ ouvertures / fermetures */
  $$("[data-cvn-toggle]").forEach(function (b) { b.addEventListener("click", function () { var t = doc.getElementById(b.getAttribute("aria-controls")); if (!t) return; var open = t.hidden; t.hidden = !open; b.setAttribute("aria-expanded", open ? "true" : "false"); if (open) { var f = $("input, a, button", t); if (f && t.id === "CvnRecover") f.focus(); } }); });

  /* ------------------------------------------------ questions : rubriques */
  $$("[data-cvn-faq-cats] a").forEach(function (a) {
    a.addEventListener("click", function (e) {
      var target = doc.getElementById(a.getAttribute("href").slice(1)); if (!target) return; e.preventDefault();
      $$("[data-cvn-faq-cats] a").forEach(function (x) { x.removeAttribute("aria-current"); }); a.setAttribute("aria-current", "true");
      var btn = $("[data-cvn-acc-btn]", target); if (btn && btn.getAttribute("aria-expanded") !== "true") btn.click();
      target.scrollIntoView({ behavior: "smooth", block: "center" }); if (btn) btn.focus({ preventScroll: true });
    });
  });

  /* ------------------------------------------------ cookies : aucun traceur facultatif avant accord */
  var CONSENT = "cvn-consent";
  var consent = store.get(CONSENT);
  var apply = function (c) { consent = c; store.set(CONSENT, c); $$("[data-cvn-consent=audience]").forEach(function (i) { i.checked = !!c.audience; }); doc.dispatchEvent(new CustomEvent("cvn:consent", { detail: c })); };
  $$("[data-cvn-consent=audience]").forEach(function (i) { i.checked = !!(consent && consent.audience); });
  var banner = $("[data-cvn-cookies]");
  if (banner) {
    if (!consent) banner.hidden = false;
    var prefs = $("[data-cvn-cookies-prefs]", banner), custom = $("[data-cvn-consent-custom]", banner), saveLabel = banner.getAttribute("data-save");
    $$("[data-cvn-consent-all]", banner).forEach(function (b) { b.addEventListener("click", function () { apply({ audience: b.getAttribute("data-cvn-consent-all") === "true", at: Date.now() }); banner.hidden = true; }); });
    custom.addEventListener("click", function () {
      if (prefs.hidden) { prefs.hidden = false; custom.textContent = saveLabel; $("input[data-cvn-consent]", prefs).focus(); return; }
      apply({ audience: $("input[data-cvn-consent]", prefs).checked, at: Date.now() }); banner.hidden = true;
    });
  }
  $$("[data-cvn-prefs]").forEach(function (box) {
    var st = $("[data-cvn-prefs-status]", box), done = function () { st.className = "cvn-form-status is-info"; st.textContent = box.getAttribute("data-saved"); if (banner) banner.hidden = true; };
    $$("[data-cvn-consent-all]", box).forEach(function (b) { b.addEventListener("click", function () { apply({ audience: b.getAttribute("data-cvn-consent-all") === "true", at: Date.now() }); done(); }); });
    var sv = $("[data-cvn-consent-save]", box); if (sv) sv.addEventListener("click", function () { apply({ audience: $("input[data-cvn-consent]", box).checked, at: Date.now() }); done(); });
  });
  $$("[data-cvn-cookies-link]").forEach(function (a) { a.addEventListener("click", function (e) { if ($("[data-cvn-prefs]")) return; if (banner) { e.preventDefault(); banner.hidden = false; var p = $("[data-cvn-cookies-prefs]", banner); if (p) p.hidden = false; $("button", banner).focus(); } }); });
})();

