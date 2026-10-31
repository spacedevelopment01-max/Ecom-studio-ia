/* Marque « 3M Plâtrerie Peinture » telle que Syna la crée dans le film : une seule source pour le logo, les visuels,
   la publicité et le site, afin que tout suive la même ligne de marque. */
(function () {
  if (window.M3) return;
  const C = { ink: "#1F2A2E", brand: "#1E6B5E", ocre: "#E3A53C", chaux: "#F3EEE6", sable: "#D8CDBB", text: "#4A5458" };
  /** Badge du logo : carré arrondi vert enduit, « 3M » à la chaux, trait d'enduit ocre. */
  function badge(size, idp) {
    const id = idp ? ' id="' + idp + '"' : "";
    return '<svg' + id + ' viewBox="0 0 240 240" style="width:' + size + "px;height:" + size + 'px;display:block">' +
      '<rect x="6" y="6" width="228" height="228" rx="52" fill="' + C.brand + '"/>' +
      '<text x="120" y="142" text-anchor="middle" font-family="Outfit" font-weight="800" font-size="118" letter-spacing="-4" fill="' + C.chaux + '">3M</text>' +
      '<path d="M58 176 Q120 204 184 168" fill="none" stroke="' + C.ocre + '" stroke-width="14" stroke-linecap="round"/></svg>';
  }
  /** Logo animable (tracé, remplissage, lettres, trait) pour le panneau de Syna. */
  function logoPanel(p) {
    return '<div style="width:100%;height:100%;background:#fff;border-radius:26px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;box-shadow:inset 0 0 0 2px #E6EAF2">' +
      '<svg viewBox="0 0 240 240" style="width:230px;height:230px;overflow:visible">' +
      '<rect id="' + p + '-fill" x="6" y="6" width="228" height="228" rx="52" fill="' + C.brand + '"/>' +
      '<rect id="' + p + '-stroke" x="6" y="6" width="228" height="228" rx="52" fill="none" stroke="' + C.brand + '" stroke-width="8" pathLength="1000"/>' +
      '<g id="' + p + '-letters"><text x="120" y="142" text-anchor="middle" font-family="Outfit" font-weight="800" font-size="118" letter-spacing="-4" fill="' + C.chaux + '">3M</text></g>' +
      '<path id="' + p + '-swoosh" d="M58 176 Q120 204 184 168" fill="none" stroke="' + C.ocre + '" stroke-width="14" stroke-linecap="round" pathLength="1000"/>' +
      '<g id="' + p + '-trowel"><path d="M0 0 L46 -14 Q58 -16 56 -4 L50 10 Q46 16 38 14 Z" fill="#B9C2CC"/><rect x="18" y="-34" width="10" height="26" rx="4" fill="#5A5F68"/></g>' +
      "</svg>" +
      '<div id="' + p + '-name" style="font:700 21px Lato;letter-spacing:.2em;color:' + C.ink + '">PLÂTRERIE · PEINTURE</div></div>';
  }
  function typo() {
    return '<div style="width:100%;height:100%;background:#fff;border-radius:22px;box-shadow:inset 0 0 0 2px #E6EAF2;display:grid;grid-template-columns:1fr 1fr;align-items:center;padding:0 22px">' +
      '<div><div style="font:800 86px/1 Outfit;color:' + C.ink + '">Aa</div><div style="font:600 17px Lato;color:' + C.text + ';margin-top:8px">Titres · Outfit</div></div>' +
      '<div><div style="font:400 78px/1 Lato;color:' + C.brand + '">Aa</div><div style="font:600 17px Lato;color:' + C.text + ';margin-top:8px">Textes · Lato</div></div></div>';
  }
  function roomArt(r) {
    return '<div style="position:relative;width:100%;height:100%;border-radius:' + r + 'px;overflow:hidden;background:' + C.chaux + '">' +
      '<div style="position:absolute;left:0;right:0;bottom:0;height:22%;background:' + C.sable + '"></div>' +
      '<div style="position:absolute;left:0;right:0;bottom:22%;height:5%;background:' + C.ocre + '"></div>' +
      '<div style="position:absolute;left:14%;top:14%;width:30%;height:40%;border-radius:6px;background:#BFD7E3;box-shadow:inset 0 0 0 5px #fff"></div>' +
      '<div style="position:absolute;right:16%;bottom:22%;width:7%;height:46%;background:' + C.brand + ';border-radius:4px 4px 0 0"></div>' +
      '<div style="position:absolute;right:11%;bottom:56%;width:17%;height:9%;background:' + C.brand + ';border-radius:8px"></div></div>';
  }
  function post(p) {
    const pid = (s) => (p ? ' id="' + p + '-' + s + '"' : "");
    return '<div style="position:relative;width:100%;height:100%;border-radius:20px;overflow:hidden;background:' + C.brand + ';padding:18px;display:flex;flex-direction:column;gap:12px">' +
      '<div style="display:flex;align-items:center;gap:10px">' + badge(40) + '<div style="font:700 15px Lato;color:' + C.chaux + ';letter-spacing:.06em">3M Plâtrerie Peinture</div></div>' +
      '<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;border-radius:12px;overflow:hidden">' +
      '<div style="position:relative;background:#C9C5BD;background-image:repeating-linear-gradient(90deg,transparent 0 38px,#E2DED6 38px 44px)"><span style="position:absolute;left:8px;bottom:8px;font:700 13px Lato;background:' + C.ink + ';color:#fff;padding:3px 8px;border-radius:6px">Avant</span></div>' +
      '<div style="position:relative;background:' + C.chaux + '"><div style="position:absolute;left:0;right:0;bottom:0;height:16%;background:' + C.ocre + '"></div><span style="position:absolute;right:8px;bottom:22%;font:700 13px Lato;background:' + C.ink + ';color:#fff;padding:3px 8px;border-radius:6px">Après</span></div></div>' +
      '<div' + pid("title") + ' style="font:800 25px/1.05 Outfit;color:' + C.chaux + '">Plâtrerie &amp; peinture intérieure</div><i' + pid("bar") + ' style="display:block;height:6px;width:70px;border-radius:3px;background:' + C.chaux + ';opacity:.6"></i></div>';
  }
  function ad(p) {
    const pid = (s) => (p ? ' id="' + p + '-' + s + '"' : "");
    return '<div style="position:relative;width:100%;height:100%;border-radius:20px;overflow:hidden;background:' + C.chaux + ';padding:16px;display:flex;flex-direction:column;gap:10px">' +
      '<div style="display:flex;align-items:center;gap:8px">' + badge(34) + '<span style="font:700 11px Lato;color:' + C.text + ';letter-spacing:.1em">SPONSORISÉ</span></div>' +
      '<div style="height:120px">' + roomArt(12) + "</div>" +
      '<div style="font:800 26px/1.02 Outfit;color:' + C.ink + '">Votre projet de peinture ?</div>' +
      '<div' + pid("cta") + ' style="margin-top:auto;background:' + C.brand + ';color:' + C.chaux + ';font:700 15px Outfit;text-align:center;padding:11px 0;border-radius:10px">Demander un devis</div></div>';
  }
  function svc(name, icon) {
    return '<div style="flex:1;background:' + C.chaux + ';border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px">' +
      '<svg viewBox="0 0 24 24" style="width:26px;height:26px" fill="none" stroke="' + C.brand + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + icon + "</svg>" +
      '<span style="font:700 15px Outfit;color:' + C.ink + '">' + name + "</span></div>";
  }
  /** Site internet (base 720 x 460) ; p = préfixe des identifiants (bouton de devis : p-btn). */
  function site(p) {
    return '<div style="width:720px;height:460px;background:#fff;border-radius:18px;overflow:hidden;display:flex;flex-direction:column;font-family:Lato">' +
      '<div style="height:30px;background:#EEF1F6;display:flex;align-items:center;gap:6px;padding:0 12px"><i style="width:9px;height:9px;border-radius:50%;background:#D3D8E2;display:block"></i><i style="width:9px;height:9px;border-radius:50%;background:#D3D8E2;display:block"></i><i style="width:9px;height:9px;border-radius:50%;background:#D3D8E2;display:block"></i><span style="margin-left:14px;flex:0 0 260px;height:16px;border-radius:8px;background:#fff"></span></div>' +
      '<div id="' + p + '-nav" style="height:50px;display:flex;align-items:center;gap:10px;padding:0 24px;border-bottom:1px solid #EEE9E1">' + badge(30) +
      '<span style="font:700 16px Outfit;color:' + C.ink + '">3M Plâtrerie Peinture</span><span style="margin-left:auto;display:flex;gap:18px;font:600 13px Lato;color:' + C.text + '"><span>Prestations</span><span>Réalisations</span><span>Contact</span></span></div>' +
      '<div id="' + p + '-hero" style="flex:1;display:grid;grid-template-columns:1.05fr 1fr;gap:22px;padding:22px 24px 14px">' +
      '<div style="display:flex;flex-direction:column;justify-content:center;gap:12px">' +
      '<div id="' + p + '-eye" style="font:700 11px Lato;letter-spacing:.18em;color:' + C.brand + '">PLÂTRERIE · PEINTURE · ENDUITS</div>' +
      '<div id="' + p + '-h1" style="font:800 38px/1.03 Outfit;color:' + C.ink + ';letter-spacing:-.01em">Des murs nets, des finitions soignées.</div>' +
      '<div id="' + p + '-sub" style="font:400 17px/1.4 Lato;color:' + C.text + '">Plaques de plâtre, enduits et peinture intérieure.</div>' +
      '<div id="' + p + '-btnw" style="position:relative;align-self:flex-start;margin-top:4px"><div id="' + p + '-btn" style="position:relative;background:' + C.brand + ';color:' + C.chaux + ';font:700 18px Outfit;padding:13px 22px;border-radius:10px;overflow:hidden"><span style="position:relative;z-index:1">Demander un devis</span><i id="' + p + '-ripple" style="position:absolute;left:50%;top:50%;width:260px;height:260px;margin:-130px 0 0 -130px;border-radius:50%;background:' + C.ocre + ';display:block;opacity:0"></i></div></div></div>' +
      '<div id="' + p + '-art">' + roomArt(14) + "</div></div>" +
      '<div id="' + p + '-svc" style="display:flex;gap:12px;padding:0 24px 20px">' +
      svc("Plâtrerie", '<path d="M4 14l9-4 4 2-9 4z"/><path d="M13 10V5"/><path d="M12 5h2"/>') +
      svc("Peinture", '<rect x="4" y="4" width="14" height="5" rx="2"/><path d="M18 6.5h2v5h-9v3"/><path d="M11 14.5v5"/>') +
      svc("Enduits", '<path d="M5 9h14l-1.5 10h-11z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/>') +
      "</div></div>";
  }
  window.M3 = { C, badge, logoPanel, typo, post, ad, site, roomArt };
})();
