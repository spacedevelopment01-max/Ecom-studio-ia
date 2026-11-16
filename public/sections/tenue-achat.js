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
