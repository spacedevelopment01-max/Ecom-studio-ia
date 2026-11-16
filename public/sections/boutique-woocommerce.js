/* Adaptateur WooCommerce du contrat « window.tnBoutique » (voir l'en-tête de tenue-achat.js).
   Le script commun du Studio ne parle jamais à une plateforme : il appelle tnBoutique, et ce fichier parle à l'API de
   la boutique WooCommerce (« Store API », wc/store/v1) : cart/add-item pour chaque ligne, à la suite, avec le jeton
   « Nonce » ; cart pour lire le panier. Aucune remise n'est calculée ici : le total est celui que WooCommerce rend.
   Les lignes « cadeau » ne sont PAS envoyées : c'est la boutique qui pose le cadeau quand la condition est remplie
   (code du thème livré par le Studio, inc/es-achat.php) et qui le retire sinon.
   Réglages posés par le thème, côté serveur : window.tnBoutiqueConfig = { api, jeton, panier, argent }. */
(function (racine) {
  function creer(config, deps) {
    config = config || {};
    deps = deps || {};
    var requete = deps.fetch || (racine.fetch ? racine.fetch.bind(racine) : null);
    var jeton = config.jeton || "";
    var mineur = 2;

    /** Montant de l'API (texte, en plus petite unité de la devise) → centimes. */
    function centimes(v) {
      var n = parseInt(v, 10);
      if (isNaN(n)) return 0;
      return mineur === 2 ? n : Math.round(n * Math.pow(10, 2 - mineur));
    }
    function texte(html) {
      return String(html == null ? "" : html).replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#0?39;|&rsquo;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
    }
    function appel(chemin, corps) {
      if (!requete) return Promise.reject(new Error("Le panier n'est pas disponible."));
      var o = { method: corps ? "POST" : "GET", credentials: "same-origin", headers: { Accept: "application/json" } };
      if (corps) {
        o.headers["Content-Type"] = "application/json";
        o.headers.Nonce = jeton;
        o.body = JSON.stringify(corps);
      }
      return requete(String(config.api || "") + chemin, o).then(function (r) {
        // WooCommerce renouvelle son jeton dans la réponse : le suivant sert à la ligne suivante.
        var neuf = r.headers && r.headers.get ? r.headers.get("Nonce") : null;
        if (neuf) jeton = neuf;
        return r.json().then(function (j) {
          if (!r.ok) throw new Error(texte(j && j.message) || "L'article n'a pas pu être ajouté au panier.");
          return j;
        }, function () {
          throw new Error("La boutique n'a pas répondu comme prévu.");
        });
      });
    }
    /** Panier de WooCommerce → panier du contrat. */
    function panierDe(c) {
      var t = (c && c.totals) || {};
      if (typeof t.currency_minor_unit === "number") mineur = t.currency_minor_unit;
      var lignes = ((c && c.items) || []).map(function (it) {
        var lt = it.totals || {};
        var versions = (it.variation || []).map(function (v) { return texte(v.value); }).filter(Boolean).join(" / ");
        var cadeau = !!(it.extensions && it.extensions.es && it.extensions.es.cadeau);
        var l = { id: String(it.id), quantite: it.quantity, titre: texte(it.name) + (versions ? " · " + versions : ""), prix: centimes(lt.line_total) + centimes(lt.line_total_tax) };
        if (cadeau) l.cadeau = true;
        return l;
      });
      // Le total des articles, remises de la boutique comprises (codes de réduction déduits) ; la livraison n'y est pas.
      var total = centimes(t.total_items) + centimes(t.total_items_tax) - centimes(t.total_discount) - centimes(t.total_discount_tax);
      return { nombre: (c && c.items_count) || 0, total: total, lignes: lignes };
    }
    function annoncer(p) {
      if (deps.surPanier) deps.surPanier(p);
      return p;
    }

    return {
      ajouter: function (lignes) {
        var payantes = (lignes || []).filter(function (l) { return l && !l.cadeau && l.id != null && Number(l.quantite) >= 1; });
        if (!payantes.length) return Promise.reject(new Error("Aucun article à ajouter."));
        var suite = Promise.resolve(null);
        payantes.forEach(function (l) {
          suite = suite.then(function () { return appel("cart/add-item", { id: Number(l.id), quantity: Number(l.quantite) }); });
        });
        // Relu une fois tout ajouté : le cadeau et les prix remisés y sont, tels que la boutique les tient.
        return suite.then(function () { return appel("cart"); }).then(panierDe).then(annoncer);
      },
      panier: function () { return appel("cart").then(panierDe); },
      argent: function (c) {
        var f = config.argent || {};
        var dec = typeof f.decimales === "number" ? f.decimales : 2;
        var n = Math.round(Number(c) || 0) / 100;
        var s = Math.abs(n).toFixed(dec).split(".");
        var ent = s[0].replace(/\B(?=(\d{3})+(?!\d))/g, f.milliers == null ? " " : f.milliers);
        var out = ent + (s[1] && !/^0+$/.test(s[1]) ? (f.virgule || ",") + s[1] : "");
        return (n < 0 ? "−" : "") + (f.avant || "") + out + (f.apres == null ? " €" : f.apres);
      },
      allerAuPanier: function () { if (config.panier && racine.location) racine.location.href = config.panier; },
    };
  }

  /** Après un ajout : le compteur du panier de l'en-tête, et les morceaux de page que WooCommerce tient à jour. */
  function surPanier(p) {
    var d = racine.document;
    if (!d) return;
    [].forEach.call(d.querySelectorAll("[data-cart-count], .tn-ent .tn-pan span"), function (el) {
      el.textContent = String(p.nombre);
      if (el.hasAttribute("data-cart-count")) { if (p.nombre > 0) el.removeAttribute("hidden"); else el.setAttribute("hidden", ""); }
    });
    if (racine.jQuery) racine.jQuery(d.body).trigger("wc_fragment_refresh");
    try { d.dispatchEvent(new CustomEvent("tn:panier", { detail: p })); } catch (e) { /* navigateur ancien : sans effet */ }
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { creer: creer };
  if (racine.document && !racine.tnBoutique) racine.tnBoutique = creer(racine.tnBoutiqueConfig, { surPanier: surPanier });
})(typeof window !== "undefined" ? window : globalThis);
