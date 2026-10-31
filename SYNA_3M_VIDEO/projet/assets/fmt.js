/* Format du film : paysage 1920 x 1080 (par défaut) ou story 1080 x 1920 (window.FMT = "story" dans story.html).
   KS : facteur d'échelle des caméras isométriques ; KX : facteur des décalages horizontaux. */
(function () {
  const V = window.FMT === "story";
  window.FMTV = { V, W: V ? 1080 : 1920, H: V ? 1920 : 1080, KS: V ? 0.74 : 1, KX: V ? 0.5 : 1 };
})();
