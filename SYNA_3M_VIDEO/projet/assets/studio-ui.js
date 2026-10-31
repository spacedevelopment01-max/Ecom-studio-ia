/* Interface d'E-COM STUDIO IA dans un onglet de navigateur (illustration fidèle aux libellés réels du studio :
   pour un site de services, les espaces s'appellent Activité, Marque, Site, Images, Publications, Publicités). */
(function () {
  if (window.UI) return;
  const K = { ink: "#0A1024", ink2: "#2B3452", muted: "#5E6886", line: "#DCE2EE", paper: "#F5F7FC", card: "#FFFFFF", signal: "#2F5BEA", soft: "#E3E9FD" };
  const logo = (s) => '<svg viewBox="0 0 64 64" style="width:' + s + "px;height:" + s + 'px;display:block;flex:none"><rect width="64" height="64" rx="16" fill="' + K.ink + '"/><path d="M18 20h22v6H25v4h13v6H25v4h15v6H18z" fill="#fff"/><circle cx="46" cy="44" r="5" fill="' + K.signal + '"/></svg>';
  const orb = (s) => '<span style="display:block;flex:none;width:' + s + "px;height:" + s + 'px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#FFFFFF 0%,#CFE9FF 12%,#7CC4FF 30%,#3D6EF0 60%,#2F5BEA 78%,#1B3FB8 100%);box-shadow:inset -3px -4px 8px rgba(10,16,36,.25)"></span>';
  const ICON = {
    "Activité": '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    "Marque": '<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.5"/><circle cx="12" cy="7.5" r="1.5"/><circle cx="15.5" cy="10" r="1.5"/>',
    "Site": '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>',
    "Images": '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    "Publications": '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
    "Publicités": '<path d="M3 11v2a1 1 0 0 0 1 1h3l6 5V5L7 10H4a1 1 0 0 0-1 1z"/><path d="M17 8a5 5 0 0 1 0 8"/>',
  };
  function nav(active, fs) {
    return Object.keys(ICON).map((n) => {
      const on = n === active;
      return '<div style="display:flex;align-items:center;gap:' + fs * 0.6 + "px;padding:" + fs * 0.45 + "px " + fs * 0.6 + "px;border-radius:" + fs * 0.5 + "px;background:" + (on ? K.soft : "transparent") + ";color:" + (on ? K.signal : K.ink2) + ";font:600 " + fs + 'px InterV,Inter,sans-serif">' +
        '<svg viewBox="0 0 24 24" style="width:' + fs * 1.15 + "px;height:" + fs * 1.15 + 'px;flex:none" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICON[n] + "</svg>" + n + "</div>";
    }).join("");
  }
  /** Fenêtre de navigateur avec l'onglet « E-COM STUDIO ia » ; s = échelle des textes (1 = écran d'ordinateur portable). */
  function browser(o) {
    const s = o.s || 1, fs = 11 * s;
    return '<div style="position:relative;width:100%;height:100%;background:' + K.paper + ';border-radius:' + 10 * s + 'px;overflow:hidden;display:flex;flex-direction:column">' +
      // Barre d'onglets
      '<div style="height:' + 30 * s + "px;background:#E8ECF4;display:flex;align-items:flex-end;gap:" + 6 * s + "px;padding:0 " + 10 * s + 'px">' +
      '<div style="display:flex;gap:' + 5 * s + "px;align-self:center;margin-right:" + 6 * s + 'px"><i style="display:block;width:' + 9 * s + "px;height:" + 9 * s + 'px;border-radius:50%;background:#FF5F57"></i><i style="display:block;width:' + 9 * s + "px;height:" + 9 * s + 'px;border-radius:50%;background:#FEBC2E"></i><i style="display:block;width:' + 9 * s + "px;height:" + 9 * s + 'px;border-radius:50%;background:#28C840"></i></div>' +
      '<div id="' + o.p + '-tab" style="height:' + 24 * s + "px;padding:0 " + 12 * s + "px;background:" + K.paper + ";border-radius:" + 8 * s + "px " + 8 * s + "px 0 0;display:flex;align-items:center;gap:" + 7 * s + "px;font:600 " + fs + 'px InterV,Inter,sans-serif;color:' + K.ink + '">' + logo(14 * s) + '<span id="' + o.p + '-tabt">E-COM STUDIO <i style="font-family:Instrument,serif;font-style:italic;font-weight:400;color:' + K.signal + '">ia</i></span></div>' +
      '<div style="height:' + 24 * s + "px;padding:0 " + 10 * s + "px;display:flex;align-items:center;font:500 " + fs * 1.3 + 'px InterV,Inter,sans-serif;color:#7E89A8">+</div></div>' +
      // Barre d'adresse (sans domaine inventé)
      '<div style="height:' + 30 * s + "px;background:" + K.paper + ";display:flex;align-items:center;gap:" + 8 * s + "px;padding:0 " + 12 * s + "px;border-bottom:" + Math.max(1, s) + "px solid " + K.line + '">' +
      '<span style="font:600 ' + fs * 1.2 + 'px InterV;color:#9AA3BA">‹ ›</span><div style="flex:1;height:' + 20 * s + "px;border-radius:" + 10 * s + "px;background:#fff;box-shadow:inset 0 0 0 " + Math.max(1, s) + "px " + K.line + ";display:flex;align-items:center;gap:" + 6 * s + "px;padding:0 " + 10 * s + 'px">' +
      '<svg viewBox="0 0 24 24" style="width:' + fs + "px;height:" + fs + 'px" fill="none" stroke="#7E89A8" stroke-width="2.4"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg><span style="font:500 ' + fs * 0.95 + 'px InterV;color:' + K.muted + '">Studio · 3M Plâtrerie Peinture</span></div></div>' +
      // Application
      '<div style="flex:1;display:flex;min-height:0">' +
      '<div style="width:' + (o.side || 150) * s + "px;flex:none;background:#fff;border-right:" + Math.max(1, s) + "px solid " + K.line + ";padding:" + 12 * s + "px " + 10 * s + "px;display:flex;flex-direction:column;gap:" + 4 * s + 'px">' +
      '<div style="display:flex;align-items:center;gap:' + 7 * s + "px;margin-bottom:" + 10 * s + "px;font:600 " + fs * 1.1 + "px Bricolage,InterV;letter-spacing:-.02em;color:" + K.ink + ';white-space:nowrap">' + logo(20 * s) + 'E-COM STUDIO <i style="font-family:Instrument,serif;font-style:italic;font-weight:400;color:' + K.signal + '">ia</i></div>' +
      '<div style="font:600 ' + fs * 0.85 + "px InterV;color:" + K.muted + ";text-transform:uppercase;letter-spacing:.08em;margin:" + 4 * s + "px " + 6 * s + 'px">3M Plâtrerie Peinture</div>' + nav(o.active || "Marque", fs) + "</div>" +
      '<div style="flex:1;min-width:0;position:relative">' + (o.main || "") + "</div></div></div>";
  }
  window.UI = { K, logo, orb, browser, nav };
})();
