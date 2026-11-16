/* ══ CONTRAT « window.tnBoutique » (16 novembre 2026) — ne change plus : les adaptateurs des plateformes s'y tiennent ══
   Ce script du Studio ne parle JAMAIS directement à une plateforme. Il lit le balisage (attributs data-tn-…) et appelle :

     tnBoutique.ajouter(lignes, options) → Promise<Panier>
        lignes  : [{ id: string (identifiant de VERSION de la plateforme), quantite: number (≥ 1), cadeau?: true }]
        options : facultatif, ignoré par une plateforme réelle ({ prix: { [id]: centimes }, titres: { [id]: string } } pour l'aperçu)
        Rejette avec une Error dont le message se montre au client (stock insuffisant, version inconnue).
     tnBoutique.panier() → Promise<Panier>
        Panier : { nombre: number (articles), total: number (centimes, remises de la plateforme comprises),
                   lignes: [{ id: string, quantite: number, titre: string, prix: number (centimes, la ligne) }] }
     tnBoutique.argent(centimes: number) → string (« 29 € », dans la devise de la boutique)
     tnBoutique.allerAuPanier() → void

   Le thème ne calcule aucune remise : un prix de lot affiché vient de l'offre du client, le prix payé est celui que la
   plateforme rend dans Panier.total. Adaptateurs écrits par le Studio : boutique-apercu.js (panier d'essai), boutique-shopify.js.

   Outil commun aux pièces à plusieurs articles (lots, packs) :
     tnAchat.lignes({ articles: [idDeVersion, …], cadeau?: idDeVersion }) → lignes prêtes pour tnBoutique.ajouter
        (une ligne par version, les quantités d'une même version additionnées, le cadeau sur sa propre ligne).

   ATTRIBUTS LUS PAR CE SCRIPT (le balisage est le même dans l'aperçu et dans chaque plateforme) :
     <script type="application/json" data-tn-versions data-tn-titre="…" data-tn-noms="Couleur|Taille"> : la table des
        versions du produit de la page : [{ id, options: [..], disponible, stock? (seulement si le stock est suivi), prix
        (centimes), compare? (centimes, vrai prix de comparaison) }]. Une par page (cherchée dans le <main> de la pièce).
     data-tn-achat (le bloc d'achat) : ses boutons [data-pogo] ou son formulaire (champ « id ») lancent l'achat.
     data-tn-acheter : tout autre bouton d'achat (packs). data-tn-erreur : où s'écrit un refus de la plateforme.
     data-tn-lots › li[data-tn-quantite] : offre par quantité (le bouton radio coché donne la quantité).
     data-tn-packs › [data-tn-pack][data-tn-quantite] (+ data-tn-cadeau = identifiant de version du cadeau,
        data-tn-prix = prix du pack en centimes pour le panier d'essai) › [data-tn-pack-lignes] : le script y écrit une
        ligne par article (une liste par option).
     data-tn-stock + data-tn-seuil : « Plus que N » sous le seuil, seulement si la version a un « stock » numérique.
     data-tn-jauge + data-tn-depart : jauge « x % vendu », seulement avec ce stock et la quantité de départ.
     data-tn-offre-moment + data-tn-fin (millisecondes) › [data-tn-fin-texte], [data-tn-decompte] : l'offre datée.
     data-tn-fenetre-offre (+ data-tn-delai-s) › [data-tn-fermer], [data-tn-fo-form], [data-tn-fo-code] : fenêtre d'offre.
     data-tn-fen : volet qui s'ouvre en fenêtre (guide des tailles sous le bouton).
   APRÈS UN AJOUT : l'événement « tn:panier » part sur document (detail = Panier, annulable). Un panier de côté qui
   s'ouvre lui-même appelle preventDefault() ; sinon ce script appelle tnBoutique.allerAuPanier(). */
(function () {
  if (window.tnAchat) return;
  window.tnAchat = {
    lignes: function (pack) {
      var out = [], vu = {};
      ((pack && pack.articles) || []).forEach(function (id) {
        if (!id) return;
        id = String(id);
        if (vu[id]) vu[id].quantite += 1; else out.push(vu[id] = { id: id, quantite: 1 });
      });
      if (pack && pack.cadeau) out.push({ id: String(pack.cadeau), quantite: 1, cadeau: true });
      return out;
    },
  };
})();


/* Thème unique, module « achat » : l'achat pour de vrai (version, lot ou pack choisis), la barre d'achat, le stock, l'offre
   datée, la fenêtre d'offre. Sans dépendance ; sans effet s'il est chargé deux fois. */
(function () {
  var doc = window.document;
  if (window.tnAchat.pret || !doc || !doc.addEventListener || !doc.querySelectorAll) return;
  window.tnAchat.pret = true;
  function all(root, sel) { return [].slice.call((root || doc).querySelectorAll(sel)); }
  function zone(el) { return (el && el.closest && el.closest("main")) || doc; }
  function txt(el) { return (el ? el.textContent : "").replace(/\s+/g, " ").trim(); }
  function meme(a, b) { return String(a).trim().toLowerCase() === String(b).trim().toLowerCase(); }
  function table(z) {
    var s = z.querySelector("script[data-tn-versions]") || doc.querySelector("script[data-tn-versions]");
    if (!s) return null;
    if (!s.tnTable) { try { s.tnTable = { versions: JSON.parse(s.textContent || "[]"), noms: (s.getAttribute("data-tn-noms") || "").split("|").filter(Boolean), titre: s.getAttribute("data-tn-titre") || "" }; } catch (e) { s.tnTable = { versions: [], noms: [], titre: "" }; } }
    return s.tnTable;
  }
  function trouve(t, valeurs) { return t.versions.filter(function (v) { return valeurs.every(function (x, i) { return meme(v.options[i] == null ? "" : v.options[i], x); }); })[0] || null; }
  function argent(c) { return window.tnBoutique && window.tnBoutique.argent ? window.tnBoutique.argent(c) : (c / 100).toFixed(2).replace(".", ",") + " €"; }

  /* La version choisie dans le bloc d'achat : le champ « id » du formulaire (boutique), sinon les pastilles cochées. */
  function version(z) {
    var t = table(z), champ = z.querySelector("[data-tn-achat] form [name=id]");
    if (champ && champ.value) { var id = String(champ.value); return { v: (t && t.versions.filter(function (x) { return String(x.id) === id; })[0]) || { id: id, options: [], disponible: true } }; }
    if (!t || !t.versions.length) return { erreur: "Ce produit ne peut pas être ajouté pour l'instant." };
    var groupes = all(z, "[data-tn-versions] .tn-groupe-v"), valeurs = [], manque = null;
    groupes.forEach(function (g, i) {
      var on = g.querySelector("input:checked");
      if (on) valeurs[i] = txt(on.parentNode); else if (!manque) manque = g;
    });
    if (manque) return { erreur: "Choisis d'abord : " + txt(manque.querySelector("small")).toLowerCase() + ".", ou: manque };
    var v = groupes.length ? trouve(t, valeurs) : t.versions.filter(function (x) { return x.disponible; })[0] || t.versions[0];
    if (!v) return { erreur: "Cette version n'existe pas." };
    if (!v.disponible) return { erreur: "Cette version est épuisée pour l'instant." };
    return { v: v };
  }

  /* Les lignes d'articles d'un pack : une liste par option, la version épuisée ne se choisit pas. */
  function lignesDuPack(pack) {
    var boite = pack.querySelector("[data-tn-pack-lignes]"), t = table(zone(pack)), n = Math.max(1, parseInt(pack.getAttribute("data-tn-quantite"), 10) || 1);
    if (!boite || boite.tnFait || !t || !t.versions.length) return;
    boite.tnFait = true;
    var dispo = t.versions.filter(function (v) { return v.disponible; }), premier = dispo[0] || t.versions[0];
    if (!t.noms.length) return;
    function valeurs(i) { var vu = []; t.versions.forEach(function (v) { if (v.options[i] != null && vu.indexOf(v.options[i]) < 0) vu.push(v.options[i]); }); return vu; }
    for (var a = 1; a <= n; a++) {
      var ligne = doc.createElement("div");
      ligne.className = "tn-pack-ligne";
      ligne.setAttribute("data-tn-article", "");
      var no = doc.createElement("span");
      no.textContent = n > 1 ? "Article " + a : "Ta version";
      ligne.appendChild(no);
      t.noms.forEach(function (nom, i) {
        var sel = doc.createElement("select");
        sel.setAttribute("aria-label", nom + (n > 1 ? ", article " + a : ""));
        valeurs(i).forEach(function (val) { var o = doc.createElement("option"); o.value = val; o.textContent = val; if (meme(val, premier.options[i])) o.selected = true; sel.appendChild(o); });
        ligne.appendChild(sel);
      });
      boite.appendChild(ligne);
      trie(ligne, t);
    }
  }
  /* Dans une ligne, une valeur qui ne mène à aucune version en stock (avec les autres choix de la ligne) est grisée. */
  function trie(ligne, t) {
    var sels = all(ligne, "select"), choix = sels.map(function (s) { return s.value; });
    sels.forEach(function (s, i) {
      [].forEach.call(s.options, function (o) {
        var essai = choix.slice(); essai[i] = o.value;
        var v = trouve(t, essai);
        o.disabled = !(v && v.disponible);
        o.textContent = o.value + (o.disabled ? " (épuisé)" : "");
      });
    });
    var v = trouve(t, choix);
    ligne.tnVersion = v && v.disponible ? v : null;
    ligne.classList.toggle("tn-ko", !ligne.tnVersion);
  }
  function packChoisi(z) {
    var on = z.querySelector("[data-tn-packs] [data-tn-pack] input[type=radio]:checked");
    return on ? on.closest("[data-tn-pack]") : null;
  }
  function ouvrePacks(z) {
    all(z, "[data-tn-packs] [data-tn-pack]").forEach(function (p) {
      var on = !!p.querySelector("input[type=radio]:checked");
      p.classList.toggle("tn-on", on);
      if (on) lignesDuPack(p);
    });
  }

  /* L'achat de la page : le pack choisi, sinon la version du bloc en quantité du lot choisi (1 sans lot). */
  function achat(z) {
    var t = table(z), prix = {}, titres = {};
    function note(v, centimes) { if (v.prix != null || centimes != null) prix[v.id] = centimes != null ? centimes : v.prix; titres[v.id] = [t ? t.titre : "", (v.options || []).join(" · ")].filter(Boolean).join(", "); }
    var pack = packChoisi(z);
    if (pack) {
      lignesDuPack(pack);
      var n = Math.max(1, parseInt(pack.getAttribute("data-tn-quantite"), 10) || 1), lignes = all(pack, "[data-tn-article]"), ids = [], ko = null;
      var total = parseInt(pack.getAttribute("data-tn-prix"), 10);
      if (lignes.length) lignes.forEach(function (l) { if (l.tnVersion) { ids.push(String(l.tnVersion.id)); note(l.tnVersion, total > 0 ? Math.round(total / n) : null); } else if (!ko) ko = l; });
      else { var seule = t && (t.versions.filter(function (x) { return x.disponible; })[0]); if (!seule) return { erreur: "Ce produit est épuisé pour l'instant." }; for (var i = 0; i < n; i++) ids.push(String(seule.id)); note(seule, total > 0 ? Math.round(total / n) : null); }
      if (ko) return { erreur: "Une des versions choisies est épuisée : change-la pour continuer.", ou: ko };
      var cadeau = pack.getAttribute("data-tn-cadeau") || null;
      if (cadeau) titres[cadeau] = pack.getAttribute("data-tn-cadeau-nom") || "Cadeau";
      return { lignes: window.tnAchat.lignes({ articles: ids, cadeau: cadeau }), options: { prix: prix, titres: titres } };
    }
    var c = version(z);
    if (c.erreur) return c;
    var lot = z.querySelector("[data-tn-lots] li[data-tn-quantite] input[type=radio]:checked"), q = lot ? Math.max(1, parseInt(lot.closest("li").getAttribute("data-tn-quantite"), 10) || 1) : 1;
    note(c.v);
    return { lignes: [{ id: String(c.v.id), quantite: q }], options: { prix: prix, titres: titres } };
  }
  function dit(z, bouton, message) {
    var ou = (bouton.closest("form, section") || z).querySelector("[data-tn-erreur]") || z.querySelector("[data-tn-erreur]");
    if (!ou) {
      ou = doc.createElement("p");
      ou.className = "tn-erreur"; ou.setAttribute("data-tn-erreur", ""); ou.setAttribute("role", "alert");
      var apres = bouton.closest(".tn-barre") ? (z.querySelector("[data-tn-achat] form, [data-tn-achat] [data-pogo]") || bouton) : (bouton.closest("form") || bouton);
      apres.parentNode.insertBefore(ou, apres.nextSibling);
    }
    ou.textContent = message || ""; ou.hidden = !message;
  }
  var enCours = false;
  function acheter(bouton, e) {
    if (!window.tnBoutique || (bouton.classList && bouton.classList.contains("tn-off")) || bouton.disabled) return;
    var z = zone(bouton), a = achat(z);
    if (e) e.preventDefault();
    if (a.erreur) { dit(z, bouton, a.erreur); if (a.ou && a.ou.scrollIntoView) a.ou.scrollIntoView({ block: "center", behavior: "smooth" }); return; }
    if (enCours) return;
    enCours = true; bouton.setAttribute("aria-busy", "true"); dit(z, bouton, "");
    window.tnBoutique.ajouter(a.lignes, a.options).then(function (panier) {
      enCours = false; bouton.removeAttribute("aria-busy");
      var ev;
      try { ev = new CustomEvent("tn:panier", { detail: panier, cancelable: true }); } catch (x) { ev = null; }
      if (!ev || doc.dispatchEvent(ev)) window.tnBoutique.allerAuPanier();
    }, function (err) {
      enCours = false; bouton.removeAttribute("aria-busy");
      dit(z, bouton, (err && err.message) || "L'ajout au panier n'a pas marché. Réessaie dans un instant.");
    });
  }
  doc.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-tn-acheter], [data-tn-achat] [data-pogo]");
    if (b && !b.closest("form")) acheter(b, e);
  }, true);
  doc.addEventListener("submit", function (e) {
    var f = e.target;
    if (!f || !f.matches || !f.matches("[data-tn-achat] form, form[data-tn-achat-form]") || !f.querySelector("[name=add], [data-tn-acheter]")) return;
    var rapide = e.submitter && e.submitter.closest && e.submitter.closest(".tn-rapide");
    if (!rapide) acheter(e.submitter || f.querySelector("[name=add], [data-tn-acheter]"), e);
  }, true);

  /* Stock restant et jauge : seulement avec le vrai stock suivi de la version choisie. */
  function stock(z) {
    var t0 = table(z), choix = !!z.querySelector("[data-tn-versions] .tn-groupe-v, [data-tn-achat] form [name=id]"), c = choix ? version(z) : {}, v = c.v, n = v && typeof v.stock === "number" ? v.stock : null;
    // Aucun choix de version sur la page (ou pas encore fait) : le stock du produit entier, si chaque version est suivie.
    if (!v && t0 && t0.versions.length && t0.versions.every(function (x) { return typeof x.stock === "number"; })) n = t0.versions.reduce(function (s, x) { return s + Math.max(0, x.stock); }, 0);
    all(z, "[data-tn-stock]").forEach(function (el) {
      var seuil = parseInt(el.getAttribute("data-tn-seuil"), 10), ok = n !== null && n > 0 && seuil > 0 && n <= seuil;
      el.textContent = ok ? "Plus que " + n + " en stock" : ""; el.hidden = !ok;
    });
    all(z, "[data-tn-jauge]").forEach(function (el) {
      var depart = parseInt(el.getAttribute("data-tn-depart"), 10), reste = n;
      var ok = reste !== null && depart > 0 && reste >= 0 && reste <= depart;
      el.hidden = !ok;
      if (!ok) return;
      var restant = Math.round(reste / depart * 100), barre = el.querySelector("b"), mots = all(el, "span");
      if (barre) barre.style.width = (100 - restant) + "%";
      if (mots[0]) mots[0].textContent = (100 - restant) + " % vendu";
      if (mots[1]) mots[1].textContent = restant + " % restant";
      el.setAttribute("aria-label", (100 - restant) + " % vendu, " + restant + " % restant");
    });
  }
  doc.addEventListener("change", function (e) {
    var t = e.target, z = zone(t);
    if (t.closest("[data-tn-article]")) { var tb = table(z); if (tb) trie(t.closest("[data-tn-article]"), tb); }
    if (t.closest("[data-tn-packs]")) ouvrePacks(z);
    // Un lot choisi et un pack choisi ne s'additionnent pas : choisir une offre par quantité décoche le pack, et l'inverse.
    if (t.closest("[data-tn-lots]")) all(z, "[data-tn-packs] input[type=radio]:checked").forEach(function (i) { i.checked = false; });
    if (t.closest("[data-tn-pack]") && t.type === "radio") all(z, "[data-tn-lots] input[type=radio]:checked").forEach(function (i) { i.checked = false; });
    if (t.closest("[data-tn-packs]")) ouvrePacks(z);
    stock(z);
    all(z, "[data-tn-erreur]").forEach(function (el) { el.hidden = true; });
  });

  /* L'offre datée : « Aujourd'hui seulement » le dernier jour, sinon « Jusqu'au … » ; décompte vers la vraie fin ; passée, plus rien. */
  function offres() {
    var encore = false, now = Date.now();
    all(doc, "[data-tn-offre-moment][data-tn-fin]").forEach(function (el) {
      var fin = parseInt(el.getAttribute("data-tn-fin"), 10);
      if (!(fin > now)) { el.hidden = true; el.setAttribute("data-tn-finie", ""); return; }
      encore = true;
      var f = new Date(fin), d = new Date(now), jour = f.getFullYear() === d.getFullYear() && f.getMonth() === d.getMonth() && f.getDate() === d.getDate();
      var mot = el.querySelector("[data-tn-fin-texte]"), dec = el.querySelector("[data-tn-decompte]");
      if (mot) { try { mot.textContent = jour ? "Aujourd'hui seulement" : "Jusqu'au " + f.toLocaleDateString(doc.documentElement.lang || "fr", { day: "numeric", month: "long" }); } catch (x) {} }
      if (dec) {
        var s = Math.floor((fin - now) / 1000), j = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), deux = function (n) { return (n < 10 ? "0" : "") + n; };
        var cases = [[j, "j"], [h, "h"], [m, "min"], [s % 60, "s"]].filter(function (c, i) { return i > 0 || j > 0; });
        dec.innerHTML = cases.map(function (c) { return "<span><b>" + deux(c[0]) + "</b>" + c[1] + "</span>"; }).join("");
        dec.hidden = false;
      }
    });
    return encore;
  }

  /* La fenêtre d'offre : jamais à l'arrivée (après un délai, ou quand la souris quitte la page par le haut), une fois par visiteur. */
  function fenetre(el) {
    var cle = "tn-offre-vue", avant = null;
    function vue() { try { return !!window.localStorage.getItem(cle); } catch (e) { return false; } }
    function note() { try { window.localStorage.setItem(cle, "1"); } catch (e) {} }
    function ouvre() {
      if (el.hasAttribute("data-tn-ouverte") || vue()) return;
      var pg = el.closest(".tb-pg"); if (pg && pg.hidden) return;
      note(); avant = doc.activeElement; el.setAttribute("data-tn-ouverte", "");
      var champ = el.querySelector("input[type=email]"); if (champ) try { champ.focus(); } catch (e) {}
    }
    function ferme() { el.removeAttribute("data-tn-ouverte"); if (avant && avant.focus) try { avant.focus(); } catch (e) {} }
    el.tnOuvre = ouvre;
    var delai = parseInt(el.getAttribute("data-tn-delai-s"), 10);
    // La boutique vient d'enregistrer l'inscription : la fenêtre se rouvre sur le code.
    if (el.querySelector("[data-tn-recu]")) el.setAttribute("data-tn-ouverte", "");
    if (!el.hasAttribute("data-tn-ouverte")) {
      setTimeout(ouvre, Math.max(5, delai > 0 ? delai : 15) * 1000);
      doc.documentElement.addEventListener("mouseleave", function (e) { if (e.clientY <= 0) ouvre(); });
    } else note();
    el.addEventListener("click", function (e) { if (e.target === el || e.target.closest("[data-tn-fermer]")) { e.preventDefault(); ferme(); } });
    doc.addEventListener("keydown", function (e) {
      if (!el.hasAttribute("data-tn-ouverte")) return;
      if (e.key === "Escape") ferme();
      if (e.key === "Tab") { var f = all(el, "button, input, a[href]").filter(function (x) { return x.offsetParent !== null; }); if (!f.length) return; var i = f.indexOf(doc.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    });
    // Dans l'aperçu (formulaire sans adresse d'envoi), le code se montre après l'inscription ; dans la boutique, c'est elle qui le rend.
    var form = el.querySelector("form[data-tn-fo-form]");
    if (form && !form.getAttribute("action")) form.addEventListener("submit", function (e) {
      e.preventDefault();
      var code = el.querySelector("[data-tn-fo-code]"); if (code) code.hidden = false;
      form.hidden = true;
    });
  }

  /* Un volet qui s'ouvre en fenêtre (guide des tailles sous le bouton) : il reprend le guide de la page s'il y est. */
  function volets() {
    all(doc, "details[data-tn-fen]").forEach(function (d) {
      if (d.tnFait) return; d.tnFait = true;
      d.setAttribute("data-tn-js", "");
      var guide = zone(d).querySelector(".tn-guide-tailles .tn-guide"), corps = d.querySelector(".tn-fen-corps");
      if (guide && corps) corps.innerHTML = guide.innerHTML;
      d.addEventListener("click", function (e) { if (e.target === d.querySelector(".tn-fen") || e.target.closest("[data-tn-fermer]")) { e.preventDefault(); d.open = false; var s = d.querySelector("summary"); if (s) s.focus(); } });
    });
    doc.addEventListener("keydown", function (e) { if (e.key === "Escape") all(doc, "details[data-tn-fen][open]").forEach(function (d) { d.open = false; var s = d.querySelector("summary"); if (s) s.focus(); }); });
  }

  /* La barre d'achat reprend la vignette et le prix du bloc (le balisage ne porte que le nom et le bouton). */
  function barres() {
    var keys = ["vente-directe", "grandes-photos", "technique", "fond-doux", "portrait"];
    all(doc, ".tn-achat > .tn-barre").forEach(function (bar) {
      var sec = bar.parentNode;
      bar.hidden = false; // en boutique, la barre attend ce script pour se montrer : son bouton achète pour de vrai
      if (keys.indexOf(sec.getAttribute("data-tn-c")) < 0 || bar.querySelector(".tn-vig, .tn-prix-b")) return;
      var photo = sec.querySelector(".tn-grande"), price = sec.querySelector(":scope > .tn-prix"), name = bar.querySelector("b");
      if (photo && photo.style.backgroundImage) { var i = doc.createElement("i"); i.className = "tn-ph tn-vig"; i.style.backgroundImage = photo.style.backgroundImage; bar.insertBefore(i, bar.firstChild); }
      if (price && name && !price.querySelector("mark")) { var s = doc.createElement("span"); s.className = "tn-prix-b"; s.innerHTML = price.innerHTML; bar.insertBefore(s, name.nextSibling);
        // Avec un prix barré, le nom et le prix se rangent l'un sous l'autre : le nom reste lisible sur téléphone.
        if (s.querySelector("s")) { var mots = doc.createElement("span"); mots.className = "tn-barre-mots"; bar.insertBefore(mots, name); mots.appendChild(name); mots.appendChild(s); } }
    });
  }

  function demarre() {
    barres(); volets();
    var zones = [];
    all(doc, "script[data-tn-versions], [data-tn-packs], [data-tn-stock], [data-tn-jauge]").forEach(function (el) { var z = zone(el); if (zones.indexOf(z) < 0) zones.push(z); });
    zones.forEach(function (z) { ouvrePacks(z); stock(z); });
    all(doc, "[data-tn-fenetre-offre]").forEach(fenetre);
    if (offres()) var horloge = setInterval(function () { if (!offres()) clearInterval(horloge); }, 1000);
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", demarre); else demarre();
})();
