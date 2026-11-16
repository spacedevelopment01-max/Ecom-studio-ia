/* Adaptateur PrestaShop du contrat « window.tnBoutique » (voir l'en-tête de tenue-achat.js).
   Chaque ligne part au contrôleur du panier de PrestaShop, en requête (id_product, id_product_attribute, qty, jeton),
   l'une après l'autre. Le panier est ensuite relu auprès du module « esstudio » (contrôleur « panier »), qui rend le
   panier de PrestaShop tel qu'il est : prix par quantité natifs, règles de panier (cadeau), total. Aucune remise n'est
   calculée ici. Les lignes « cadeau » ne sont PAS envoyées : la règle de panier de PrestaShop pose le cadeau et le retire.
   Identifiant de version : « <id_product>-<id_product_attribute> » (« 12-0 » pour un produit sans déclinaison).
   Réglages posés par le module, côté serveur : window.tnBoutiqueConfig = { ajout, lecture, jeton, panier, argent }. */
(function (racine) {
  function creer(config, deps) {
    config = config || {};
    deps = deps || {};
    var requete = deps.fetch || (racine.fetch ? racine.fetch.bind(racine) : null);

    function texte(html) {
      return String(html == null ? "" : html).replace(/<[^>]*>/g, "")
        .replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(Number(n)); }).replace(/&#x([0-9a-f]+);/gi, function (m, n) { return String.fromCharCode(parseInt(n, 16)); })
        .replace(/&nbsp;/g, " ").replace(/&rsquo;/g, "\u2019").replace(/&quot;/g, '"').replace(/&eacute;/g, "é").replace(/&egrave;/g, "è").replace(/&agrave;/g, "à").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
    }
    /** « 12-34 » → { produit: 12, version: 34 } ; null si l'identifiant n'en est pas un. */
    function partes(id) {
      var m = /^(\d+)(?:-(\d+))?$/.exec(String(id));
      return m ? { produit: Number(m[1]), version: Number(m[2] || 0) } : null;
    }
    function json(r) {
      return r.json().then(null, function () { throw new Error("La boutique n'a pas répondu comme prévu."); });
    }
    function ajouterUne(l) {
      var v = partes(l.id);
      if (!v) return Promise.reject(new Error("Version inconnue."));
      var corps = ["ajax=1", "action=update", "add=1", "op=up", "id_product=" + v.produit, "id_product_attribute=" + v.version, "id_customization=0", "qty=" + Number(l.quantite), "token=" + encodeURIComponent(config.jeton || "")].join("&");
      return requete(String(config.ajout || ""), { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "application/json", "X-Requested-With": "XMLHttpRequest" }, body: corps })
        .then(function (r) { if (!r.ok) throw new Error("L'article n'a pas pu être ajouté au panier."); return json(r); })
        .then(function (j) {
          if (j && (j.hasError || (j.errors && j.errors.length))) throw new Error(texte([].concat(j.errors || []).join(" ")) || "L'article n'a pas pu être ajouté au panier.");
          return j;
        });
    }
    function lire() {
      return requete(String(config.lecture || ""), { method: "GET", credentials: "same-origin", headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" } })
        .then(function (r) { if (!r.ok) throw new Error("Le panier n'a pas pu être lu."); return json(r); })
        .then(function (j) {
          return {
            nombre: Number(j.nombre) || 0,
            total: Math.round(Number(j.total) || 0),
            lignes: (j.lignes || []).map(function (l) {
              var o = { id: String(l.id), quantite: Number(l.quantite) || 0, titre: texte(l.titre), prix: Math.round(Number(l.prix) || 0) };
              if (l.cadeau) o.cadeau = true;
              return o;
            }),
          };
        });
    }
    function annoncer(p) {
      if (deps.surPanier) deps.surPanier(p);
      return p;
    }

    return {
      ajouter: function (lignes) {
        if (!requete) return Promise.reject(new Error("Le panier n'est pas disponible."));
        var payantes = (lignes || []).filter(function (l) { return l && !l.cadeau && l.id != null && Number(l.quantite) >= 1; });
        if (!payantes.length) return Promise.reject(new Error("Aucun article à ajouter."));
        var suite = Promise.resolve(null);
        payantes.forEach(function (l) { suite = suite.then(function () { return ajouterUne(l); }); });
        return suite.then(lire).then(annoncer);
      },
      panier: function () { return requete ? lire() : Promise.reject(new Error("Le panier n'est pas disponible.")); },
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

  /** Après un ajout (l'événement « tn:panier » est lancé par le script commun, pas ici) : le compteur de l'en-tête du site, et l'événement que les modules de PrestaShop écoutent. */
  function surPanier(p) {
    var d = racine.document;
    if (!d) return;
    [].forEach.call(d.querySelectorAll("[data-cart-count], .tn-ent .tn-pan span"), function (el) {
      el.textContent = String(p.nombre);
      if (el.hasAttribute("data-cart-count")) { if (p.nombre > 0) el.removeAttribute("hidden"); else el.setAttribute("hidden", ""); }
    });
    if (racine.prestashop && typeof racine.prestashop.emit === "function") racine.prestashop.emit("updateCart", { reason: {}, resp: { cart: { products_count: p.nombre } } });
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { creer: creer };
  if (racine.document && !racine.tnBoutique) racine.tnBoutique = creer(racine.tnBoutiqueConfig, { surPanier: surPanier });
})(typeof window !== "undefined" ? window : globalThis);
