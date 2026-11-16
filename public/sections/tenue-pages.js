/* Sections à tenue du module « pages » (thème unique, lot 4) : les gestes de l'APERÇU qu'aucune feuille ne sait faire.
   1) Le tiroir de panier : il s'ouvre au clic sur le panier ou à l'ajout au panier, se ferme par la croix, par un clic à
      côté ou par la touche Échap ; le clavier reste dans le panneau tant qu'il est ouvert, puis revient d'où il venait.
   2) Le panier (page et tiroir) : « − », « + » et « Retirer » recalculent les lignes, le total et la barre de livraison
      offerte (le panier de l'aperçu est un panier d'essai).
   3) La recherche : les produits se trient pendant la frappe ; le sommaire des textes légaux mène à son texte.
   Écrit à la main, sans dépendance ; chargé deux fois, il ne fait rien de plus. Aucun script ne part dans Shopify : là,
   le tiroir s'ouvre par un lien (« #tn-panier-cote »), les quantités sont des liens de la boutique, la recherche un vrai
   formulaire. Sans ce script, chaque pièce reste lisible. */
(function () {
  if (window.tnPages) return;
  window.tnPages = true;
  var doc = document;
  function all(root, sel) { return [].slice.call(root.querySelectorAll(sel)); }
  function money(cents) { return (Math.round(cents) / 100).toFixed(2).replace(/[.,]00$/, "").replace(".", ",") + " €"; }

  /* ── Le panier : lignes, quantités, total, livraison offerte ── */
  function refresh(box) {
    var lines = all(box, ".tn-lignes .tn-ligne"), total = 0, known = lines.length > 0;
    lines.forEach(function (l) {
      var q = parseInt((l.querySelector(".tn-qte span") || {}).textContent, 10) || 1, c = l.getAttribute("data-tn-cents");
      if (c == null) { known = false; return; }
      total += q * c;
      var p = l.querySelector(".tn-prix-l");
      if (p) p.textContent = money(q * c);
    });
    var t = box.querySelector(".tn-prix-t");
    if (t && known) t.textContent = money(total);
    var s = box.querySelector(".tn-seuil[data-tn-seuil]"), goal = s ? +s.getAttribute("data-tn-seuil") : 0;
    if (s && goal > 0 && (known || !lines.length)) {
      var left = goal - total, p = s.querySelector("p"), bar = s.querySelector("i");
      if (p) p.innerHTML = left > 0 ? "Plus que <b>" + money(left) + "</b> pour la livraison offerte" : "La livraison est offerte";
      if (bar) bar.style.setProperty("--part", Math.max(4, Math.min(100, Math.round(total / goal * 100))) + "%");
    }
    if (lines.length) box.removeAttribute("data-tn-vide"); else box.setAttribute("data-tn-vide", "");
    // La page panier, une fois vidée : un mot simple à la place des lignes.
    var list = box.querySelector(".tn-lignes");
    if (list && box.classList.contains("tn-panier")) {
      var note = list.querySelector(".tn-vide");
      if (!lines.length && !note) { note = doc.createElement("p"); note.className = "tn-vide"; note.textContent = "Le panier est vide."; list.appendChild(note); }
      if (lines.length && note) note.remove();
    }
  }
  doc.addEventListener("click", function (e) {
    var t = e.target;
    if (!t.closest || window.ctPicking) return;
    var bt = t.closest("button[data-tn-plus],button[data-tn-moins],button[data-tn-oter]");
    if (!bt) return;
    var line = bt.closest(".tn-ligne"), box = bt.closest(".tn-panier,.tn-panier-cote");
    if (!line || !box) return;
    e.preventDefault();
    var n = line.querySelector(".tn-qte span"), q = parseInt(n && n.textContent, 10) || 1;
    if (bt.hasAttribute("data-tn-oter") || (bt.hasAttribute("data-tn-moins") && q <= 1)) {
      // Le clavier ne se perd pas : il passe à la ligne voisine, sinon au bouton de fermeture.
      var next = line.nextElementSibling || line.previousElementSibling;
      line.remove();
      var to = (next && next.querySelector(".tn-qte button")) || box.querySelector("[data-tn-fermer].tn-x") || box.querySelector("a,button");
      if (to) to.focus();
    } else if (n) n.textContent = String(bt.hasAttribute("data-tn-plus") ? q + 1 : q - 1);
    refresh(box);
  });

  /* ── Le tiroir de panier ── */
  var before = null;
  function drawer() {
    // Le tiroir du site (posé hors des pages), sinon celui de la page montrée.
    return all(doc, ".tn-panier-cote").filter(function (d) { var pg = d.closest(".tb-pg"); return !pg || !pg.hidden; })[0] || null;
  }
  function isOpen(d) { return !!d && d.hasAttribute("data-tn-ouvert"); }
  function focusables(d) { return all(d, ".tn-panneau a[href],.tn-panneau button:not([disabled]),.tn-panneau input,.tn-panneau select").filter(function (x) { return x.offsetParent !== null; }); }
  function open(d) {
    if (!d || isOpen(d)) return;
    before = doc.activeElement;
    d.setAttribute("data-tn-ouvert", "");
    doc.documentElement.style.overflow = "hidden";
    var x = d.querySelector(".tn-x");
    if (x) setTimeout(function () { x.focus(); }, 60);
  }
  function close(d, back) {
    if (!isOpen(d)) return;
    d.removeAttribute("data-tn-ouvert");
    doc.documentElement.style.overflow = "";
    if (back !== false && before && before.focus && doc.contains(before)) before.focus();
    before = null;
  }
  // Sur la fenêtre, avant les gestionnaires du document : le clic sur « Panier » ouvre le tiroir au lieu de changer de page.
  window.addEventListener("click", function (e) {
    var t = e.target;
    if (!t.closest || window.ctPicking) return;
    var d = drawer();
    if (!d) return;
    if (t.closest(".tn-panier-cote [data-tn-fermer]")) { e.preventDefault(); close(d); return; }
    if (t.closest(".tn-panier-cote")) return; // « Voir le panier », un produit à ajouter : le lien fait son chemin
    if (d.closest(".tb-pg")) return; // tiroir posé dans une page (planche de contrôle) : il ne prend pas les clics du site
    var cart = t.closest('[data-go="cart"],.tn-pan,button[aria-label="Panier"],a[href="#tn-panier-cote"]');
    if (cart) { e.preventDefault(); e.stopImmediatePropagation(); open(d); return; }
    // À l'ajout au panier : le tiroir s'ouvre, le petit message d'ajout n'a plus lieu d'être.
    // (Un bouton du bloc d'achat branché sur la boutique attend la réponse du panier : voir « tn:panier » plus bas.)
    if (t.closest("[data-pogo]") && !t.closest(".tn-off") && !(window.tnBoutique && window.tnAchat && window.tnAchat.pret && t.closest("[data-tn-achat]"))) setTimeout(function () { open(d); var toast = doc.querySelector(".tb-toast"); if (toast) toast.classList.remove("on"); }, 0);
  }, true);
  window.addEventListener("tn-go", function () { var d = drawer(); if (d) close(d, false); all(doc, ".tn-recherche.ct-open").forEach(function (s) { s.classList.remove("ct-open"); }); });
  doc.addEventListener("keydown", function (e) {
    var d = drawer(), s = doc.querySelector(".tn-recherche.ct-open");
    if (e.key === "Escape") { if (isOpen(d)) close(d); else if (s) s.classList.remove("ct-open"); return; }
    if (e.key !== "Tab" || !isOpen(d)) return;
    var f = focusables(d);
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (!d.contains(doc.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  /* Après un vrai ajout (tenue-achat.js envoie « tn:panier » sur le document, detail = Panier du contrat tnBoutique :
     { nombre, total, lignes: [{ id, quantite, titre, prix }] }) : le tiroir se remplit avec ce panier et s'ouvre ; il le
     dit (preventDefault) pour que le script d'achat ne change pas de page. Sans tiroir sur le site, rien n'est retenu. */
  function photoDe(id) {
    // La photo n'est pas dans le contrat : celle du cadeau du pack, sinon celle de la fiche si la version est la sienne.
    var k = all(doc, "[data-tn-cadeau]").filter(function (x) { return x.getAttribute("data-tn-cadeau") === id; })[0], ph = k && k.querySelector(".tn-pack-cadeau .tn-ph");
    if (ph && ph.style.backgroundImage) return ph.style.backgroundImage;
    var table = all(doc, "script[data-tn-versions]").filter(function (x) { var pg = x.closest(".tb-pg"); return (!pg || !pg.hidden) && x.textContent.indexOf('"id":"' + id + '"') >= 0; })[0];
    var grande = table && (table.closest("main") || doc).querySelector(".tn-achat .tn-grande");
    return grande ? grande.style.backgroundImage : "";
  }
  function remplir(d, panier) {
    var list = d.querySelector(".tn-lignes");
    if (!list || !panier || !panier.lignes) return;
    var qte = function () { var q = doc.createElement("div"); q.className = "tn-qte"; q.innerHTML = '<button type="button" data-tn-moins aria-label="Retirer un exemplaire">−</button><span>1</span><button type="button" data-tn-plus aria-label="Ajouter un exemplaire">+</button>'; return q; };
    list.innerHTML = "";
    panier.lignes.forEach(function (l) {
      var n = Math.max(1, parseInt(l.quantite, 10) || 1), prix = Math.max(0, +l.prix || 0);
      var line = doc.createElement("div"), ph = doc.createElement("div"), quoi = doc.createElement("div"), b = doc.createElement("b"), q = qte(), oter = doc.createElement("button"), p = doc.createElement("span");
      line.className = "tn-ligne"; line.setAttribute("data-tn-id", String(l.id)); line.setAttribute("data-tn-cents", String(Math.round(prix / n)));
      ph.className = "tn-ph"; var img = photoDe(String(l.id)); if (img) ph.style.backgroundImage = img;
      quoi.className = "tn-quoi"; b.textContent = l.titre || "Article";
      q.querySelector("span").textContent = String(n);
      oter.type = "button"; oter.className = "tn-oter"; oter.setAttribute("data-tn-oter", ""); oter.textContent = "Retirer";
      p.className = "tn-prix-l"; p.textContent = money(prix);
      quoi.appendChild(b); quoi.appendChild(q); quoi.appendChild(oter);
      line.appendChild(ph); line.appendChild(quoi); line.appendChild(p);
      list.appendChild(line);
    });
    refresh(d);
    // Le total est celui que la boutique rend (remises comprises) ; une ligne offerte le dit.
    var t = d.querySelector(".tn-prix-t");
    if (t && typeof panier.total === "number") t.textContent = money(panier.total);
    all(list, '.tn-ligne[data-tn-cents="0"] .tn-prix-l').forEach(function (x) { x.textContent = "Offert"; });
  }
  doc.addEventListener("tn:panier", function (e) {
    var d = drawer();
    if (!d || d.closest(".tb-pg")) return;
    e.preventDefault();
    remplir(d, e.detail);
    var toast = doc.querySelector(".tb-toast"); if (toast) toast.classList.remove("on");
    open(d);
  });
  window.tnTiroir = { ouvrir: function () { open(drawer()); }, fermer: function () { close(drawer()); } };

  /* ── La recherche : fermer le panneau, trier les produits pendant la frappe, valider vers les résultats ── */
  function plain(s) { return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  doc.addEventListener("click", function (e) {
    var x = e.target.closest && e.target.closest(".tn-recherche [data-tn-fermer]");
    if (x) { e.preventDefault(); x.closest(".tn-recherche").classList.remove("ct-open"); return; }
    // Le sommaire des textes légaux : son lien ouvre le texte et y mène.
    var a = e.target.closest && e.target.closest(".tn-sommaire a[href^='#']");
    if (a) {
      var to = doc.getElementById(a.getAttribute("href").slice(1));
      if (!to) return;
      e.preventDefault();
      if (to.tagName === "DETAILS") to.open = true;
      to.scrollIntoView({ behavior: window.matchMedia && matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth", block: "start" });
    }
  });
  doc.addEventListener("input", function (e) {
    var sec = e.target.closest && e.target.closest(".tn-recherche");
    if (!sec || e.target.type !== "search") return;
    var q = plain(e.target.value.trim()), found = 0;
    all(sec, ".tn-r").forEach(function (r) { var ok = !q || plain(r.textContent).indexOf(q) >= 0; r.hidden = !ok; if (ok) found++; });
    if (q && !found) sec.setAttribute("data-tn-rien", ""); else sec.removeAttribute("data-tn-rien");
  });
  doc.addEventListener("submit", function (e) {
    var sec = e.target.closest && e.target.closest(".tn-recherche");
    if (!sec) return;
    var page = doc.querySelector(".tb-pg .tn-resultats"), key = page && page.closest(".tb-pg").getAttribute("data-pg");
    if (key && window.TB_GO) { sec.classList.remove("ct-open"); window.TB_GO(key); }
  });
})();
