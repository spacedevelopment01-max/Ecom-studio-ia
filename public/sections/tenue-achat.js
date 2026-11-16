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
        (une ligne par version, les quantités d'une même version additionnées, le cadeau sur sa propre ligne). */
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

/* Thème unique, module « achat » (16 novembre 2026) : la barre d'achat qui reste en bas de l'écran reprend la vignette et
   le prix du bloc d'achat de sa page (le balisage du bloc ne porte que le nom et le bouton). Seulement dans les cinq
   façons du bloc dessinées par tenue-achat.css ; sans ce script, la barre garde le nom et le bouton. Sans dépendance,
   et sans effet s'il est chargé deux fois. */
(function () {
  var keys = ["vente-directe", "grandes-photos", "technique", "fond-doux", "portrait"];
  [].forEach.call(document.querySelectorAll(".tn-achat > .tn-barre"), function (bar) {
    var sec = bar.parentNode;
    if (keys.indexOf(sec.getAttribute("data-tn-c")) < 0 || bar.querySelector(".tn-vig, .tn-prix-b")) return;
    var photo = sec.querySelector(".tn-grande"), price = sec.querySelector(":scope > .tn-prix"), name = bar.querySelector("b");
    if (photo && photo.style.backgroundImage) {
      var i = document.createElement("i");
      i.className = "tn-ph tn-vig";
      i.style.backgroundImage = photo.style.backgroundImage;
      bar.insertBefore(i, bar.firstChild);
    }
    if (price && name && !price.querySelector("mark")) {
      var s = document.createElement("span");
      s.className = "tn-prix-b";
      s.textContent = price.textContent;
      bar.insertBefore(s, name.nextSibling);
    }
  });
})();
