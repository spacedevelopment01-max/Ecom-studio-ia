/*
 * Tour des sections : les détecteurs, côté page. Ce fichier est lu comme un texte et exécuté DANS la page rendue
 * (Playwright) ; il n'est jamais importé par le Studio. Il pose `window.__tour` : `SEUILS` et `mesurer(contexte)`.
 *
 * `mesurer` rend les défauts mesurés (type, gravité, sélecteur, texte, cadre en pixels de la page) et les textes dont
 * le contraste se juge sur les pixels (fait côté Node, sur une capture sans texte : voir detecteurs.ts).
 *
 * Gravités : « bloquant » (la page est cassée, ou un goût du propriétaire est enfreint), « important » (ça se voit),
 * « mineur » (à regarder).
 */
(function () {
  "use strict";

  // ══════════════════════════════════════════════════════════ les seuils (tout se règle ici)
  var SEUILS = {
    /** Tolérance, en pixels, avant de dire qu'une chose dépasse (arrondis du navigateur). */
    TOLERANCE_PX: 1.5,
    /** Un texte est « coupé » quand il dépasse de la zone visible de son cadre de plus que cela. */
    COUPE_PX: 3,
    /** Un texte « sort de sa boîte » (bouton, pastille, carte, étiquette) quand il la dépasse de plus que cela. */
    SORT_DE_BOITE_PX: 2, SORT_DE_BOITE_INTERLIGNE: 0.3,
    /** Largeur minimale d'une colonne qui porte du texte. */
    COLONNE_MIN_PX: 40,
    /** Nombre de lettres à partir duquel un mot coupé en deux est regardé ; un bout de mot d'au plus tant de lettres est « des lettres seules ». */
    MOT_MIN_LETTRES: 6, LETTRES_SEULES: 2,
    /** Deux textes se chevauchent quand leur recouvrement dépasse tant de pixels dans les deux sens. */
    CHEVAUCHEMENT_PX: 4,
    /** Taille minimale d'un texte lisible. */
    TEXTE_MIN_PX: 12,
    /** Sur téléphone : un titre d'au moins tant de pixels ne fait pas plus de tant de lignes. */
    TITRE_GRAND_PX: 40, TITRE_LIGNES_MAX: 5,
    /** Le « pavé gras » : plus de tant de lignes dans la police des titres, à une graisse d'au moins tant. */
    PAVE_LIGNES_MAX: 3, PAVE_GRAISSE: 700,
    /** Un titre de carte tolère plus de lignes ; au-delà de PAVE_BLOQUANT_LIGNES lignes, le pavé est bloquant (sinon important). */
    PAVE_TITRE_LIGNES_MAX: 5, PAVE_BLOQUANT_LIGNES: 5,
    /** Une ombre décalée ne compte qu'à partir de tant de pixels (le bouton « ombre » en fait 4 ou 5). */
    OMBRE_MIN_PX: 3,
    /** Un bouton ne fait pas plus de tant de lignes. */
    BOUTON_LIGNES_MAX: 2,
    /** Une pastille ronde : ses deux côtés ne s'écartent pas de plus de tant (rapport largeur / hauteur). */
    PASTILLE_RAPPORT_MAX: 1.25,
    /** Une pastille d'une série : sa taille ne s'écarte pas de plus de tant de la taille habituelle de ses voisines. */
    SERIE_ECART_MAX: 1.35,
    /** Sur téléphone : hauteur minimale d'une zone à toucher ; écart minimal entre deux boutons. */
    TOUCHER_MIN_PX: 40, BOUTONS_ECART_MIN_PX: 8,
    /** Deux lignes d'une liste (menu, accordéon, cases à cocher) d'au moins tant de haut peuvent se toucher. */
    LIGNE_A_TOUCHER_PX: 44,
    /** Vide : une section de plus de tant de haut sans rien de visible ; un trou de plus de tant entre deux éléments. */
    SECTION_VIDE_PX: 160, TROU_PX: 120,
    /** Un cadre de photo vide ne se signale qu'au-delà de cette taille. */
    CADRE_VIDE_MIN_PX: 60,
    /** Arche : un arrondi du haut d'au moins tant de la largeur, avec un bas presque droit (au plus tant de la largeur). */
    ARCHE_HAUT_PART: 0.38, ARCHE_BAS_PART: 0.12,
    /** Deux sections voisines de même fond : au moins tant de pixels entre le dernier contenu de l'une et le premier de l'autre. */
    SEPARATION_MIN_PX: 28,
    /** Téléphone : jusqu'à cette largeur d'écran. */
    TELEPHONE_MAX_PX: 480,
    /** Au plus tant de défauts du même type par section (au-delà, un seul enregistrement dit combien). */
    PAR_TYPE_MAX: 12,
  };

  var GRAVITE = {
    "debordement-page": "bloquant", "hors-ecran": "bloquant", "plus-large-que-ecran": "bloquant", "hors-section": "important",
    "texte-coupe": "important", "texte-sort-de-sa-boite": "bloquant", "mot-coupe": "mineur", "lettres-seules": "important", "colonne-etroite": "important",
    "chevauchement": "bloquant", "texte-petit": "mineur", "titre-trop-long": "important", "pave-gras": "bloquant",
    "ombre-coupee": "bloquant", "bord-recouvert": "important", "bouton-trop-de-lignes": "important", "pastille-deformee": "bloquant",
    "zone-a-toucher": "important", "boutons-colles": "mineur", "section-vide": "bloquant", "section-nulle": "important", "trou": "important", "cadre-vide": "important",
    "crochets-bruts": "bloquant", "photo-exemple": "important", "texte-exemple": "important", "arche": "bloquant", "sections-collees": "mineur", "collant-sous-entete": "important",
  };

  // ══════════════════════════════════════════════════════════ outils
  var num = function (v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; };
  var couleur = function (c) {
    var m = /^rgba?\(([^)]+)\)/.exec(c);
    if (m) { var v = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v[3] === undefined ? 1 : v[3]]; }
    m = /^color\(srgb ([^)]+)\)/.exec(c);
    if (m) { var w = m[1].split(/[\s/]+/).filter(Boolean).map(Number); return [w[0] * 255, w[1] * 255, w[2] * 255, w[3] === undefined ? 1 : w[3]]; }
    return null;
  };
  var styles = new WeakMap();
  var cs = function (el) { var s = styles.get(el); if (!s) { s = getComputedStyle(el); styles.set(el, s); } return s; };
  var boite = function (el) { var r = el.getBoundingClientRect(); return { l: r.left + scrollX, t: r.top + scrollY, r: r.right + scrollX, b: r.bottom + scrollY, w: r.width, h: r.height }; };
  var deRect = function (r) { return { l: r.left + scrollX, t: r.top + scrollY, r: r.right + scrollX, b: r.bottom + scrollY, w: r.width, h: r.height }; };
  var cadre = function (b) { return [Math.round(b.l), Math.round(b.t), Math.round(b.r - b.l), Math.round(b.b - b.t)]; };
  var union = function (list) { var o = { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity }; list.forEach(function (x) { o.l = Math.min(o.l, x.l); o.t = Math.min(o.t, x.t); o.r = Math.max(o.r, x.r); o.b = Math.max(o.b, x.b); }); o.w = o.r - o.l; o.h = o.b - o.t; return o; };
  var visible = function (el) {
    if (!el || !el.isConnected) return false;
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0.5 && r.height > 0.5;
  };
  /** Un ancêtre est-il fixe ou collant ? (ce qui flotte au-dessus de la page ne se compare pas au reste) */
  var flotte = function (el) { for (var a = el; a && a !== document.body; a = a.parentElement) { var p = cs(a).position; if (p === "fixed" || p === "sticky") return a; } return null; };
  /**
   * La zone où l'élément peut se montrer : l'intersection des cadres de ses ancêtres qui rognent (overflow autre que
   * visible). `defile` : un ancêtre fait défiler dans ce sens (un carrousel : ce qui dépasse s'atteint au doigt).
   */
  var zones = new WeakMap();
  var zone = function (el) {
    var z = zones.get(el);
    if (z) return z;
    var p = el.parentElement;
    if (!p || el === document.documentElement || el === document.body) z = { l: -Infinity, t: -Infinity, r: Infinity, b: Infinity, defileX: false, defileY: false, anime: false };
    else {
      var up = zone(p), s = cs(p), b = boite(p);
      z = { l: up.l, t: up.t, r: up.r, b: up.b, defileX: up.defileX, defileY: up.defileY, anime: up.anime || s.animationName !== "none" };
      // Un élément fixe ne dépend que de l'écran.
      if (cs(el).position === "fixed") z = { l: -Infinity, t: -Infinity, r: Infinity, b: Infinity, defileX: false, defileY: false, anime: false };
      else if (p !== document.body) {
        if (s.overflowX !== "visible") { z.l = Math.max(z.l, b.l + num(s.borderLeftWidth)); z.r = Math.min(z.r, b.r - num(s.borderRightWidth)); if (s.overflowX === "auto" || s.overflowX === "scroll") z.defileX = true; }
        if (s.overflowY !== "visible") { z.t = Math.max(z.t, b.t + num(s.borderTopWidth)); z.b = Math.min(z.b, b.b - num(s.borderBottomWidth)); if (s.overflowY === "auto" || s.overflowY === "scroll") z.defileY = true; }
      }
    }
    zones.set(el, z);
    return z;
  };
  /** Un nom court pour retrouver l'élément : sa place sous la racine de sa section. */
  var chemin = function (el, racine) {
    var parts = [];
    for (var a = el; a && a !== racine && parts.length < 4; a = a.parentElement) {
      var tag = a.tagName.toLowerCase(), c = (typeof a.className === "string" ? a.className : "").split(/\s+/).filter(function (x) { return /^tn-/.test(x); })[0];
      var nom = c ? "." + c : tag;
      var freres = a.parentElement ? Array.prototype.filter.call(a.parentElement.children, function (x) { return x.tagName === a.tagName && (!c || x.classList.contains(c)); }) : [a];
      if (freres.length > 1) nom += ":nth(" + (freres.indexOf(a) + 1) + ")";
      parts.unshift(nom);
    }
    return parts.join(" > ") || "(racine)";
  };
  var sectionDe = function (el) { return el.closest ? el.closest("[data-ct]") : null; };
  var court = function (t) { t = (t || "").replace(/\s+/g, " ").trim(); return t.length > 60 ? t.slice(0, 57) + "…" : t; };
  var lignesDe = function (rects) { var tops = []; rects.forEach(function (r) { if (!tops.some(function (t) { return Math.abs(t - r.t) < Math.max(3, r.h * 0.5); })) tops.push(r.t); }); return tops.length; };

  // ══════════════════════════════════════════════════════════ la mesure
  function mesurer(ctx) {
    ctx = ctx || {};
    styles = new WeakMap(); zones = new WeakMap();
    var vw = document.documentElement.clientWidth, tel = vw <= SEUILS.TELEPHONE_MAX_PX;
    var cadrePage = document.querySelector(".tb-wrap > .frame") || document.body;
    var racines = Array.prototype.slice.call(cadrePage.querySelectorAll("[data-ct]"));
    var defauts = [], compte = {};
    var ajoute = function (type, el, o) {
      o = o || {};
      var sec = sectionDe(el) || el, cle = (sec.getAttribute && sec.getAttribute("data-ct")) + "|" + type;
      compte[cle] = (compte[cle] || 0) + 1;
      if (compte[cle] > SEUILS.PAR_TYPE_MAX) { var d0 = defauts.filter(function (d) { return d._cle === cle; })[0]; if (d0) d0.autres = compte[cle] - SEUILS.PAR_TYPE_MAX; return; }
      var b = o.cadre || boite(el);
      defauts.push({ _cle: cle, type: type, gravite: o.gravite || GRAVITE[type] || "mineur", uid: sec.getAttribute ? sec.getAttribute("data-ct") : null, selecteur: chemin(el, sec), texte: court(o.texte !== undefined ? o.texte : el.textContent), detail: o.detail || "", cadre: cadre(b) });
    };

    // ── la page
    var large = document.documentElement.scrollWidth - vw;
    if (large > SEUILS.TOLERANCE_PX) defauts.push({ type: "debordement-page", gravite: GRAVITE["debordement-page"], uid: racines[0] ? racines[0].getAttribute("data-ct") : null, selecteur: "(page)", texte: "", detail: "la page dépasse de l'écran de " + Math.round(large) + " px", cadre: [vw, 0, Math.round(large), Math.min(400, document.documentElement.scrollHeight)] });

    // ── les textes visibles, ligne par ligne
    var textes = [];
    var marcheur = document.createTreeWalker(cadrePage, NodeFilter.SHOW_TEXT);
    for (var n = marcheur.nextNode(); n; n = marcheur.nextNode()) {
      var brut = n.textContent || "";
      if (!brut.trim()) continue;
      var parent = n.parentElement;
      if (!parent || /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION|SELECT|TEXTAREA|TITLE)$/.test(parent.tagName) || parent.closest("svg,template,script,style")) continue;
      if (!visible(parent)) continue;
      var plage = document.createRange(); plage.selectNodeContents(n);
      var rects = Array.prototype.map.call(plage.getClientRects(), deRect).filter(function (r) { return r.w > 0.5 && r.h > 0.5; });
      if (!rects.length) continue;
      var z = zone(n.parentElement), zp = (function () { var s = cs(parent), b = boite(parent), o = { l: z.l, t: z.t, r: z.r, b: z.b, defileX: z.defileX, defileY: z.defileY, anime: z.anime }; if (s.overflowX !== "visible") { o.l = Math.max(o.l, b.l); o.r = Math.min(o.r, b.r); if (s.overflowX !== "hidden" && s.overflowX !== "clip") o.defileX = true; } if (s.overflowY !== "visible") { o.t = Math.max(o.t, b.t); o.b = Math.min(o.b, b.b); if (s.overflowY !== "hidden" && s.overflowY !== "clip") o.defileY = true; } return o; })();
      // Un texte entièrement hors de sa zone visible (panneau replié, diapositive suivante) n'est pas à l'écran.
      var vus = rects.filter(function (r) { return r.r > zp.l + 1 && r.l < zp.r - 1 && r.b > zp.t + 1 && r.t < zp.b - 1; });
      if (!vus.length) continue;
      textes.push({ noeud: n, el: parent, texte: brut.replace(/\s+/g, " ").trim(), rects: rects, vus: vus, zone: zp, sec: sectionDe(parent), flotte: flotte(parent) });
    }

    // ── 1. ce qui sort de l'écran, de la section ; ce qui est rogné
    textes.forEach(function (t) {
      var s = cs(t.el), u = union(t.rects), zp = t.zone;
      // Coupé : rogné par un ancêtre (overflow caché), sans défilement possible dans ce sens.
      var coupeX = !zp.defileX && (u.r - zp.r > SEUILS.COUPE_PX || zp.l - u.l > SEUILS.COUPE_PX), coupeY = !zp.defileY && (u.b - zp.b > SEUILS.COUPE_PX || zp.t - u.t > SEUILS.COUPE_PX);
      var points = s.textOverflow === "ellipsis" && t.el.scrollWidth > t.el.clientWidth + 1;
      var borne = (s.webkitLineClamp && s.webkitLineClamp !== "none") && t.el.scrollHeight > t.el.clientHeight + 2;
      if (!zp.anime && (coupeX || coupeY || points || borne)) ajoute("texte-coupe", t.el, { texte: t.texte, detail: points ? "le texte finit par des points de suspension : la fin ne se lit pas" : borne ? "le texte est limité en lignes : la fin ne se lit pas" : "le texte est rogné par son cadre (" + (coupeX ? "en largeur" : "en hauteur") + ")", cadre: u });
      // Hors de l'écran : visible (non rogné) et au-delà du bord.
      var droite = Math.min(u.r, zp.r), gauche = Math.max(u.l, zp.l);
      if (!zp.defileX && !zp.anime && (droite > vw + SEUILS.TOLERANCE_PX || gauche < -SEUILS.TOLERANCE_PX)) ajoute("hors-ecran", t.el, { texte: t.texte, detail: "le texte sort de l'écran (de " + Math.round(gauche) + " à " + Math.round(droite) + " px, écran de " + vw + " px)", cadre: u });
      else if (t.sec && !t.flotte && !zp.defileX) { var sb = boite(t.sec); if (sb.w > 0 && (droite > sb.r + SEUILS.TOLERANCE_PX || gauche < sb.l - SEUILS.TOLERANCE_PX)) ajoute("hors-section", t.el, { texte: t.texte, detail: "le texte sort de sa section en largeur", cadre: u }); }
    });
    racines.forEach(function (sec) {
      if (!visible(sec)) return;
      Array.prototype.forEach.call(sec.querySelectorAll("*"), function (el) {
        if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") return;
        if (!visible(el)) return;
        var b = boite(el), z = zone(el);
        if (z.defileX || z.anime) return;
        var droite = Math.min(b.r, z.r), gauche = Math.max(b.l, z.l);
        if (droite - gauche <= 0) return;
        if (b.w > vw + SEUILS.TOLERANCE_PX && droite - gauche > vw + SEUILS.TOLERANCE_PX) { if (el.parentElement === sec || el.parentElement.getBoundingClientRect().width <= vw + SEUILS.TOLERANCE_PX) ajoute("plus-large-que-ecran", el, { texte: "", detail: "l'élément fait " + Math.round(b.w) + " px de large pour un écran de " + vw + " px" }); }
        else if ((droite > vw + SEUILS.TOLERANCE_PX || gauche < -SEUILS.TOLERANCE_PX) && !el.querySelector("*")) ajoute("hors-ecran", el, { detail: "l'élément sort de l'écran (de " + Math.round(gauche) + " à " + Math.round(droite) + " px)" });
      });
    });

    // ── 2. le texte qui sort de sa boîte (bouton, pastille, carte, étiquette) ; la boîte déformée
    var estBoite = function (el) {
      var s = cs(el), bg = couleur(s.backgroundColor);
      var bord = ["Top", "Right", "Bottom", "Left"].some(function (k) { return num(s["border" + k + "Width"]) > 0 && s["border" + k + "Style"] !== "none" && (couleur(s["border" + k + "Color"]) || [0, 0, 0, 0])[3] > 0.05; });
      return bord || (bg && bg[3] > 0.05) || s.backgroundImage !== "none";
    };
    textes.forEach(function (t) {
      for (var a = t.el, i = 0; a && i < 3 && !a.hasAttribute("data-ct"); a = a.parentElement, i++) {
        var s = cs(a);
        // « display:contents » : l'élément n'a pas de boîte (ses enfants sont posés chez son parent), rien ne peut en sortir.
        if (s.display === "inline" || s.display === "contents" || !estBoite(a)) continue;
        var b = boite(a), u = union(t.rects);
        // En hauteur, la ligne d'un texte serré dépasse un peu de ses lettres : la tolérance suit la taille du texte.
        var dx = Math.max(u.r - b.r, b.l - u.l), dy = Math.max(u.b - b.b, b.t - u.t) - num(cs(t.el).fontSize) * SEUILS.SORT_DE_BOITE_INTERLIGNE;
        if (dx > SEUILS.SORT_DE_BOITE_PX || dy > SEUILS.SORT_DE_BOITE_PX) {
          // Rogné par la boîte elle-même : c'est un texte coupé, déjà dit.
          if ((dx > SEUILS.SORT_DE_BOITE_PX && s.overflowX !== "visible") || (dy > SEUILS.SORT_DE_BOITE_PX && s.overflowY !== "visible")) break;
          ajoute("texte-sort-de-sa-boite", a, { texte: t.texte, detail: "le texte dépasse de sa boîte de " + Math.round(Math.max(dx, dy)) + " px (" + (dx >= dy ? "en largeur" : "en hauteur") + ")", cadre: union([b, u]) });
        } else if (s.overflowX === "visible" && s.overflowY === "visible") {
          // Une boîte arrondie (pastille, pilule) : un coin du texte qui passe hors de l'arrondi sort de la boîte.
          var hors = 0;
          [["TopLeft", u.l, u.t, 1, 1], ["TopRight", u.r, u.t, -1, 1], ["BottomLeft", u.l, u.b, 1, -1], ["BottomRight", u.r, u.b, -1, -1]].forEach(function (c) {
            var r = Math.min(num(s["border" + c[0] + "Radius"]) * (/%/.test(s["border" + c[0] + "Radius"]) ? Math.min(b.w, b.h) / 100 : 1), b.w / 2, b.h / 2);
            if (r < 8) return;
            var cx = c[3] > 0 ? b.l + r : b.r - r, cy = c[4] > 0 ? b.t + r : b.b - r;
            if ((c[1] - cx) * c[3] < 0 && (c[2] - cy) * c[4] < 0) hors = Math.max(hors, Math.hypot(c[1] - cx, c[2] - cy) - r);
          });
          if (hors > SEUILS.SORT_DE_BOITE_PX + num(cs(t.el).fontSize) * SEUILS.SORT_DE_BOITE_INTERLIGNE) ajoute("texte-sort-de-sa-boite", a, { texte: t.texte, detail: "le texte dépasse de l'arrondi de sa boîte de " + Math.round(hors) + " px (un coin du texte est hors du rond)", cadre: union([b, u]) });
        }
        break;
      }
    });
    // Le choix affiché d'une liste déroulante, plus long que la liste : sa fin ne se lit pas.
    var toile = document.createElement("canvas").getContext("2d"), SELECT_FLECHE_PX = 24;
    racines.forEach(function (sec) {
      Array.prototype.forEach.call(sec.querySelectorAll("select"), function (el) {
        if (!visible(el) || !el.options.length || el.multiple) return;
        var s = cs(el), o = el.options[el.selectedIndex < 0 ? 0 : el.selectedIndex];
        toile.font = s.fontStyle + " " + s.fontWeight + " " + s.fontSize + " " + s.fontFamily;
        var place = el.clientWidth - num(s.paddingLeft) - num(s.paddingRight), w = toile.measureText(o.text).width;
        // Le navigateur écrit le choix sur plusieurs lignes quand la liste peut grandir : il n'est rogné que si ses
        // lignes ne tiennent pas dans la hauteur de la liste (ou si le texte ne revient pas à la ligne).
        var interligne = num(s.lineHeight) || num(s.fontSize) * 1.2, lignesPossibles = /nowrap|^pre$/.test(s.whiteSpace) ? 1 : Math.max(1, Math.round((el.clientHeight - num(s.paddingTop) - num(s.paddingBottom)) / interligne));
        if (lignesPossibles > 1 && place > 0 && Math.ceil(w / (place - SELECT_FLECHE_PX)) <= lignesPossibles) return;
        if (w - place > SEUILS.COUPE_PX) ajoute("texte-coupe", el, { texte: o.text, detail: "le choix affiché de la liste est rogné (" + Math.round(w) + " px de texte pour " + Math.round(place) + " px)" });
      });
    });
    // Les boutons et les pastilles.
    var cibles = [];
    racines.forEach(function (sec) {
      Array.prototype.forEach.call(sec.querySelectorAll("a,button,summary,select,input,label,[role=button]"), function (el) {
        if (!visible(el)) return;
        var tag = el.tagName, s = cs(el);
        if (tag === "INPUT" && /^(hidden|checkbox|radio|range|file)$/.test(el.type)) return;
        var bouton = el.classList.contains("tn-bt") || tag === "BUTTON" || el.getAttribute("role") === "button" || tag === "SUMMARY" || tag === "SELECT" || tag === "INPUT";
        if (tag === "LABEL" && !el.querySelector("input[type=radio],input[type=checkbox]")) return;
        var serie = el;
        // Un choix (bouton radio, case) : la pastille est l'étiquette, ou l'élément plein qu'elle contient.
        // (Un petit élément plein dans l'étiquette, une pastille de remise par exemple, n'est pas le choix : il doit en couvrir la moitié.)
        if (tag === "LABEL" && !estBoite(el)) { var lb = boite(el), dedans = Array.prototype.filter.call(el.querySelectorAll("*"), function (x) { if (x.tagName === "INPUT" || !visible(x) || cs(x).display === "inline" || !estBoite(x)) return false; var xb = boite(x); return xb.w * xb.h >= lb.w * lb.h * 0.5; })[0]; if (dedans) { el = dedans; s = cs(el); } }
        if (tag === "A" && !bouton && !estBoite(el)) return;
        if (s.display === "inline") return;
        cibles.push({ el: el, b: boite(el), sec: sec, flotte: flotte(el), serie: serie });
      });
    });
    cibles.forEach(function (c) {
      var el = c.el, s = cs(el), b = c.b;
      // Le libellé sur trop de lignes.
      var rects = textes.filter(function (t) { return el.contains(t.el); }).reduce(function (acc, t) { return acc.concat(t.vus); }, []);
      var lignes = lignesDe(rects);
      if ((el.classList.contains("tn-bt") || el.tagName === "BUTTON") && lignes > SEUILS.BOUTON_LIGNES_MAX) ajoute("bouton-trop-de-lignes", el, { detail: "le libellé du bouton tient sur " + lignes + " lignes" });
      // Rond : les quatre arrondis valent au moins la moitié du petit côté.
      var rayon = Math.min(num(s.borderTopLeftRadius), num(s.borderTopRightRadius), num(s.borderBottomLeftRadius), num(s.borderBottomRightRadius)), petit = Math.min(b.w, b.h);
      var pourCent = /%/.test(s.borderTopLeftRadius) && num(s.borderTopLeftRadius) >= 50;
      c.rond = pourCent || rayon >= petit / 2 - 0.5;
      // Sur téléphone : assez haut pour le doigt.
      if (tel && b.h < SEUILS.TOUCHER_MIN_PX && !(el.tagName === "LABEL" && b.w < 24)) {
        // Une zone plus grande que ce qui se voit (un « ::after » qui agrandit la zone à toucher) compte.
        var apres = getComputedStyle(el, "::after"), avant = getComputedStyle(el, "::before");
        var agrandi = [apres, avant].some(function (p) { return p.content !== "none" && p.position === "absolute" && (num(p.top) < 0 || num(p.bottom) < 0 || num(p.height) >= SEUILS.TOUCHER_MIN_PX); });
        if (!agrandi) ajoute("zone-a-toucher", el, { detail: "la zone à toucher fait " + Math.round(b.h) + " px de haut (il en faut " + SEUILS.TOUCHER_MIN_PX + ")" });
      }
    });
    // Une pastille d'une série (mêmes parent, balise et classe) : ronde, et de la taille de ses voisines.
    var series = new Map();
    cibles.forEach(function (c) { var p = c.serie.parentElement; if (!p) return; var k = c.serie.tagName + "." + c.serie.className; if (!series.has(p)) series.set(p, {}); (series.get(p)[k] = series.get(p)[k] || []).push(c); });
    var mediane = function (l) { var x = l.slice().sort(function (a, b) { return a - b; }); return x[Math.floor((x.length - 1) / 2)]; };
    series.forEach(function (groupes) {
      Object.keys(groupes).forEach(function (k) {
        var l = groupes[k];
        if (l.length < 2) return;
        var ronds = l.filter(function (c) { return c.rond; });
        if (ronds.length < l.length / 2) return;
        var h0 = mediane(l.map(function (c) { return c.b.h; })), carrees = l.filter(function (c) { return c.b.w / c.b.h <= SEUILS.PASTILLE_RAPPORT_MAX && c.b.h / c.b.w <= SEUILS.PASTILLE_RAPPORT_MAX; }).length;
        l.forEach(function (c) {
          var rapport = c.b.w / c.b.h;
          // Une série de ronds : celui qui s'allonge ou grandit sous son texte est déformé.
          if (carrees >= l.length / 2 && (rapport > SEUILS.PASTILLE_RAPPORT_MAX || 1 / rapport > SEUILS.PASTILLE_RAPPORT_MAX)) ajoute("pastille-deformee", c.el, { detail: "la pastille n'est plus ronde : " + Math.round(c.b.w) + " × " + Math.round(c.b.h) + " px" });
          else if (c.b.h > h0 * SEUILS.SERIE_ECART_MAX) ajoute("pastille-deformee", c.el, { detail: "la pastille fait " + Math.round(c.b.h) + " px de haut, ses voisines " + Math.round(h0) + " px : son texte la déforme" });
        });
      });
    });
    var vraiBouton = function (el) {
      var s = cs(el);
      if (el.classList.contains("tn-bt")) return true;
      var bords = ["Top", "Right", "Bottom", "Left"].filter(function (k) { return num(s["border" + k + "Width"]) > 0 && s["border" + k + "Style"] !== "none" && (couleur(s["border" + k + "Color"]) || [0, 0, 0, 0])[3] > 0.05; }).length;
      var fond = (couleur(s.backgroundColor) || [0, 0, 0, 0])[3] > 0.05 || s.backgroundImage !== "none";
      return bords === 4 || (fond && (num(s.borderTopLeftRadius) >= 2 || s.boxShadow !== "none"));
    };
    // Deux boutons collés (téléphone).
    if (tel) for (var i1 = 0; i1 < cibles.length; i1++) for (var j1 = i1 + 1; j1 < cibles.length; j1++) {
      var A = cibles[i1], B = cibles[j1];
      if (A.sec !== B.sec || A.el.contains(B.el) || B.el.contains(A.el) || A.flotte !== B.flotte) continue;
      var rx = Math.min(A.b.r, B.b.r) - Math.max(A.b.l, B.b.l), ry = Math.min(A.b.b, B.b.b) - Math.max(A.b.t, B.b.t);
      var ecart = rx > 4 ? -ry : ry > 4 ? -rx : Infinity; // l'un sous l'autre, ou côte à côte
      if (ecart < SEUILS.BOUTONS_ECART_MIN_PX && ecart > -SEUILS.CHEVAUCHEMENT_PX) {
        // Deux éléments d'un même bloc soudé (les deux moitiés d'un sélecteur, un champ et son bouton) ne sont pas « collés ».
        // L'écart compté est celui du sens où ils se suivent, quand il est écrit à zéro : les cellules d'une ligne
        // d'en-tête de tableau (colonnes sans écart) sont soudées ; deux pastilles sans écart écrit ne le sont pas.
        var gapSens = A.el.parentElement ? (ry > 4 ? cs(A.el.parentElement).columnGap : cs(A.el.parentElement).rowGap) : "";
        var soudes = A.el.parentElement === B.el.parentElement && (gapSens === "0px" || estBoite(A.el.parentElement)) && ecart <= 1;
        // Les lignes d'un menu, d'un accordéon, d'une liste à cocher : l'une sous l'autre, chacune assez haute pour le
        // doigt, et qui ne sont pas deux vrais boutons (bouton du Studio, boîte bordée des quatre côtés, pastille arrondie
        // ou à ombre). C'est la forme normale d'une liste : le doigt ne se trompe pas de ligne.
        var lignesDeListe = rx > 4 && A.b.h >= SEUILS.LIGNE_A_TOUCHER_PX && B.b.h >= SEUILS.LIGNE_A_TOUCHER_PX && !(vraiBouton(A.el) && vraiBouton(B.el));
        // Les icônes d'une barre (recherche, panier, menu) : côte à côte, chacune une zone à toucher entière (assez haute
        // et assez large), sans cadre visible. Leurs zones se touchent, leurs dessins non : le doigt ne se trompe pas.
        var icones = ry > 4 && [A, B].every(function (c) { return c.b.h >= SEUILS.LIGNE_A_TOUCHER_PX && c.b.w >= SEUILS.LIGNE_A_TOUCHER_PX && !vraiBouton(c.el); });
        lignesDeListe = lignesDeListe || icones;
        if (!soudes && !lignesDeListe) ajoute("boutons-colles", B.el, { detail: "à " + Math.max(0, Math.round(ecart)) + " px d'un autre bouton (« " + court(A.el.textContent).slice(0, 24) + " »)", cadre: union([A.b, B.b]) });
      }
    }

    // ── 3. mots coupés, colonnes trop étroites
    textes.forEach(function (t) {
      var s = cs(t.el);
      if (t.rects.length < 2) return;
      var b = boite(t.el), contenu = b.w - num(s.paddingLeft) - num(s.paddingRight);
      if (s.display !== "inline" && contenu < SEUILS.COLONNE_MIN_PX && t.texte.length >= 6) { ajoute("colonne-etroite", t.el, { texte: t.texte, detail: "la colonne du texte fait " + Math.round(contenu) + " px de large" }); return; }
      // Avec la césure automatique, un mot peut ENCORE être coupé sans trait (un mot trop court pour être césuré, dans une
      // colonne trop étroite). Le trait d'union posé par le navigateur se voit : la première lettre de la ligne suivante
      // porte deux cadres, dont celui du trait, resté au bout de la ligne d'avant.
      var cadresDe = function (noeud, i) { var r0 = document.createRange(); r0.setStart(noeud, i); r0.setEnd(noeud, i + 1); return r0.getClientRects(); };
      var coupeEn = function (noeud, debut, mot) {
        var c = cadresDe(noeud, debut), c0 = c[c.length - 1]; if (!c0) return { k: 0, trait: false };
        for (var q = 1; q < mot.length; q++) { var c1 = cadresDe(noeud, debut + q), d = c1[c1.length - 1]; if (d && Math.abs(d.top - c0.top) > 3) return { k: q, trait: c1.length > 1 && c1[0].width > 0.5 && Math.abs(c1[0].top - c0.top) <= 3 }; }
        return { k: 0, trait: false };
      };
      var rx = /[A-Za-zÀ-ÖØ-öø-ÿ]{6,}/g, txt = t.noeud.textContent, m, fait = false;
      while (!fait && (m = rx.exec(txt))) {
        if (m[0].length < SEUILS.MOT_MIN_LETTRES) continue;
        var r = document.createRange(); r.setStart(t.noeud, m.index); r.setEnd(t.noeud, m.index + m[0].length);
        var rr = Array.prototype.map.call(r.getClientRects(), deRect).filter(function (x) { return x.w > 0.5; });
        if (lignesDe(rr) < 2) continue;
        // Un identifiant ou une adresse (« @maison.essai », « instagram.com/maison-essai ») n'est pas un mot : il peut
        // passer à la ligne après un de ses signes. Coupé ailleurs (au milieu d'un nom), c'est un mot coupé.
        var d0 = m.index, f0 = m.index + m[0].length;
        while (d0 > 0 && !/\s/.test(txt[d0 - 1])) d0--;
        while (f0 < txt.length && !/\s/.test(txt[f0])) f0++;
        var jeton = txt.slice(d0, f0);
        if (/[@\/_]|[A-Za-z0-9]\.[A-Za-z]/.test(jeton)) {
          rx.lastIndex = f0;
          var mal = "", haut0 = null;
          for (var q0 = 0; q0 < jeton.length; q0++) { var cq = cadresDe(t.noeud, d0 + q0), dq = cq[cq.length - 1]; if (!dq) continue; if (haut0 !== null && Math.abs(dq.top - haut0) > 3 && !/[\/.@_\-–?&=#:]/.test(jeton[q0 - 1]) && !/[\/.@_\-–?&=#:]/.test(jeton[q0])) { mal = jeton.slice(0, q0) + " / " + jeton.slice(q0); break; } haut0 = dq.top; }
          if (mal) { var rj = document.createRange(); rj.setStart(t.noeud, d0); rj.setEnd(t.noeud, f0); ajoute("mot-coupe", t.el, { texte: jeton, detail: "l'adresse « " + jeton + " » est coupée au milieu d'un nom, pas après un de ses signes (" + mal + ")", cadre: union(Array.prototype.map.call(rj.getClientRects(), deRect)) }); fait = true; }
          continue;
        }
        // Où le mot se coupe : la plus petite part.
        var coupe = coupeEn(t.noeud, m.index, m[0]), k = coupe.k || 1;
        if (coupe.trait) continue; // coupé à la française, avec son trait d'union
        // Une lettrine (première lettre flottante, en grand) n'est pas un mot coupé.
        if (k === 1 && !t.noeud.previousSibling && !txt.slice(0, m.index).trim() && getComputedStyle(t.el, "::first-letter").float !== "none") continue;
        var bout = Math.min(k, m[0].length - k);
        ajoute(bout <= SEUILS.LETTRES_SEULES ? "lettres-seules" : "mot-coupe", t.el, { texte: m[0], detail: "le mot « " + m[0] + " » est coupé sans trait d'union (" + m[0].slice(0, k) + " / " + m[0].slice(k) + ")", cadre: union(rr) });
        fait = true;
      }
      // Un nombre (un prix, un poids, une quantité) ne se coupe jamais : « 2 / 50 g » se lit mal ou faux.
      var rxn = /\d{2,}/g, mn;
      while (!fait && (mn = rxn.exec(txt))) {
        var rn = document.createRange(); rn.setStart(t.noeud, mn.index); rn.setEnd(t.noeud, mn.index + mn[0].length);
        var rrn = Array.prototype.map.call(rn.getClientRects(), deRect).filter(function (x) { return x.w > 0.5; });
        if (lignesDe(rrn) < 2) continue;
        var kn = coupeEn(t.noeud, mn.index, mn[0]).k || 1;
        ajoute("lettres-seules", t.el, { texte: mn[0], detail: "le nombre « " + mn[0] + " » est coupé sur deux lignes (" + mn[0].slice(0, kn) + " / " + mn[0].slice(kn) + ")", cadre: union(rrn) });
        fait = true;
      }
    });

    // ── 4. deux textes, ou un texte et un bouton, qui se chevauchent
    var blocs = textes.filter(function (t) { return !t.zone.anime; });
    var parSection = new Map();
    blocs.forEach(function (t) { if (!t.sec) return; if (!parSection.has(t.sec)) parSection.set(t.sec, []); parSection.get(t.sec).push(t); });
    parSection.forEach(function (list) {
      var dits = new Set();
      for (var i = 0; i < list.length; i++) for (var j = i + 1; j < list.length; j++) {
        var a = list[i], b = list[j];
        if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el) || a.flotte !== b.flotte) continue;
        for (var x = 0; x < a.vus.length; x++) for (var y = 0; y < b.vus.length; y++) {
          var ra = a.vus[x], rb = b.vus[y];
          var w = Math.min(ra.r, rb.r) - Math.max(ra.l, rb.l), h = Math.min(ra.b, rb.b) - Math.max(ra.t, rb.t);
          // Le recouvrement compte sur la hauteur des lettres, pas sur l'interligne.
          if (w > SEUILS.CHEVAUCHEMENT_PX && h > Math.max(SEUILS.CHEVAUCHEMENT_PX, Math.min(ra.h, rb.h) * 0.45)) {
            var cle = chemin(a.el, a.sec) + "|" + chemin(b.el, b.sec);
            if (!dits.has(cle)) { dits.add(cle); ajoute("chevauchement", b.el, { texte: b.texte, detail: "ce texte recouvre « " + court(a.texte).slice(0, 30) + " » (" + chemin(a.el, a.sec) + ") sur " + Math.round(w) + " × " + Math.round(h) + " px", cadre: union([ra, rb]) }); }
            x = a.vus.length; break;
          }
        }
      }
    });
    cibles.forEach(function (c) {
      if (!(c.el.classList.contains("tn-bt") || c.el.tagName === "BUTTON")) return;
      blocs.forEach(function (t) {
        if (t.sec !== c.sec || c.el.contains(t.el) || t.el.contains(c.el) || t.flotte !== c.flotte) return;
        t.vus.some(function (r) { var w = Math.min(r.r, c.b.r) - Math.max(r.l, c.b.l), h = Math.min(r.b, c.b.b) - Math.max(r.t, c.b.t); if (w > SEUILS.CHEVAUCHEMENT_PX && h > Math.max(SEUILS.CHEVAUCHEMENT_PX, r.h * 0.45)) { ajoute("chevauchement", c.el, { detail: "le bouton recouvre le texte « " + court(t.texte).slice(0, 30) + " »", cadre: union([r, c.b]) }); return true; } return false; });
      });
    });
    // ── 4 bis. l'en-tête posé sur la photo d'ouverture : aucun de ses textes ne recouvre un texte de la page dessous
    // (il flotte et s'anime, donc la règle précédente ne le compare pas au reste ; la mesure se fait page en haut).
    var ent = document.querySelector(".tn-ent");
    if (ent && window.scrollY < 2) {
      // L'en-tête sur la photo s'anime au défilement (sa couleur seulement, pas sa place) : ses textes comptent quand même.
      var duHaut = textes.filter(function (t) { return ent.contains(t.el); });
      var dessous = blocs.filter(function (t) { return !ent.contains(t.el) && !t.flotte; });
      var ditsEnt = new Set();
      duHaut.forEach(function (a) {
        dessous.some(function (b) {
          return a.vus.some(function (ra) {
            return b.vus.some(function (rb) {
              var w = Math.min(ra.r, rb.r) - Math.max(ra.l, rb.l), h = Math.min(ra.b, rb.b) - Math.max(ra.t, rb.t);
              if (!(w > SEUILS.CHEVAUCHEMENT_PX && h > Math.max(SEUILS.CHEVAUCHEMENT_PX, Math.min(ra.h, rb.h) * 0.45))) return false;
              var cle = court(a.texte) + "|" + court(b.texte);
              if (!ditsEnt.has(cle)) { ditsEnt.add(cle); ajoute("chevauchement", b.el, { texte: b.texte, detail: "ce texte passe sous « " + court(a.texte).slice(0, 30) + " » de l'en-tête, sur " + Math.round(w) + " × " + Math.round(h) + " px", cadre: union([ra, rb]) }); }
              return true;
            });
          });
        });
      });
    }

    // ── 5. textes trop petits, titres trop longs, pavé gras
    var titrePolice = (getComputedStyle(document.documentElement).getPropertyValue("--f-title") || "").split(",")[0].replace(/["']/g, "").trim().toLowerCase();
    var parEl = new Map();
    textes.forEach(function (t) { if (!parEl.has(t.el)) parEl.set(t.el, []); parEl.get(t.el).push(t); });
    parEl.forEach(function (list, el) {
      var s = cs(el), taille = num(s.fontSize), texte = list.map(function (t) { return t.texte; }).join(" ");
      if (taille < SEUILS.TEXTE_MIN_PX && texte.replace(/[^A-Za-zÀ-ÿ0-9]/g, "").length >= 3) ajoute("texte-petit", el, { texte: texte, detail: "texte de " + (Math.round(taille * 10) / 10) + " px" });
    });
    racines.forEach(function (sec) {
      Array.prototype.forEach.call(sec.querySelectorAll("h1,h2,h3,h4,p,li,div,span,a,b,strong,dd,dt,td,th,address,blockquote,figcaption,label,small"), function (el) {
        if (!visible(el)) return;
        var s = cs(el);
        if (s.display === "inline") return;
        // Le bloc de texte : ses propres lignes (ses enfants en ligne compris), pas celles d'un bloc enfant.
        var miens = textes.filter(function (t) { if (!el.contains(t.el)) return false; for (var a = t.el; a !== el; a = a.parentElement) if (cs(a).display !== "inline") return false; return true; });
        if (!miens.length) return;
        var rects = miens.reduce(function (acc, t) { return acc.concat(t.vus); }, []), lignes = lignesDe(rects), taille = num(s.fontSize);
        var estTitre = /^H[12]$/.test(el.tagName);
        if (tel && estTitre && taille >= SEUILS.TITRE_GRAND_PX && lignes > SEUILS.TITRE_LIGNES_MAX) ajoute("titre-trop-long", el, { detail: "un titre de " + Math.round(taille) + " px sur " + lignes + " lignes", cadre: union(rects) });
        // Le pavé se juge sur la police de CHAQUE texte du bloc : une marque « À compléter » posée dans un nom garde sa
        // police de texte courant, elle ne fait pas un pavé dans la police des titres.
        var policeDe = function (x) { return (cs(x).fontFamily || "").split(",")[0].replace(/["']/g, "").trim().toLowerCase(); };
        var police = policeDe(el);
        var lourds = miens.filter(function (t) { var st = cs(t.el), pt = policeDe(t.el); return pt === titrePolice && (num(st.fontWeight) >= SEUILS.PAVE_GRAISSE || ctx.titreLourd); });
        var gras = lourds.length > 0;
        if (gras && lourds.length < miens.length) { rects = lourds.reduce(function (acc, t) { return acc.concat(t.vus); }, []); lignes = lignesDe(rects); police = titrePolice; }
        else if (gras) police = titrePolice;
        // Un titre de carte (h3, h4) est un titre : il ne devient un pavé qu'au-delà de PAVE_TITRE_LIGNES_MAX lignes.
        var seuilPave = /^H[3-6]$/.test(el.tagName) ? SEUILS.PAVE_TITRE_LIGNES_MAX : SEUILS.PAVE_LIGNES_MAX;
        if (!estTitre && police === titrePolice && titrePolice && gras && lignes > seuilPave) ajoute("pave-gras", el, { gravite: lignes > SEUILS.PAVE_BLOQUANT_LIGNES ? "bloquant" : "important", detail: lignes + " lignes dans la police des titres, en gras (" + Math.round(taille) + " px) : un pavé", cadre: union(rects) });
      });
    });

    // ── 6. ombres coupées, bords recouverts
    /**
     * L'élément passe-t-il AU-DESSUS de la section suivante ? Oui s'il (ou un ancêtre dans sa section) est posé avec un
     * rang positif (« z-index »), et que sa section ne l'enferme pas dans son propre empilement : ce qui dépasse du bas
     * de la section reste alors visible, la section suivante ne le recouvre pas.
     */
    var auDessus = function (el, sec) {
      var ss = cs(sec);
      // Une section elle-même posée au-dessus de la page (un en-tête, rang positif) : tout ce qu'elle porte, son menu
      // déroulé compris, passe au-dessus de la section suivante.
      if (ss.position !== "static" && ss.zIndex !== "auto" && num(ss.zIndex) > 0) return true;
      if ((ss.position !== "static" && ss.zIndex !== "auto") || ss.transform !== "none" || num(ss.opacity) < 1 || ss.isolation === "isolate" || ss.filter !== "none") return false;
      for (var a = el; a && a !== sec; a = a.parentElement) { var s = cs(a); if (s.position !== "static" && s.zIndex !== "auto" && num(s.zIndex) > 0) return true; if (s.transform !== "none" || num(s.opacity) < 1 || s.isolation === "isolate" || s.filter !== "none") return false; }
      return false;
    };
    racines.forEach(function (sec) {
      if (!visible(sec)) return;
      var sb = boite(sec), ss = cs(sec);
      Array.prototype.forEach.call(sec.querySelectorAll("*"), function (el) {
        if (el.closest("svg") || !visible(el)) return;
        var s = cs(el), b = boite(el), z = zone(el), f = flotte(el);
        if (s.boxShadow !== "none") {
          // Seules les ombres dures et décalées (le bouton « ombre », les cartes à ombre portée) : une ombre floue se fond.
          var parts = s.boxShadow.replace(/rgba?\([^)]*\)|color\([^)]*\)/g, "").split(",");
          var dx = 0, dy = 0;
          parts.forEach(function (p) { if (/inset/.test(p)) return; var m = /(-?[\d.]+)px (-?[\d.]+)px (-?[\d.]+)px(?: (-?[\d.]+)px)?/.exec(p); if (!m || +m[3] > 1) return; dx = Math.max(dx, +m[1] + (+m[4] || 0)); dy = Math.max(dy, +m[2] + (+m[4] || 0)); });
          if (dx >= SEUILS.OMBRE_MIN_PX || dy >= SEUILS.OMBRE_MIN_PX) {
            var bas = b.b + dy, droite = b.r + dx, pourquoi = "";
            if ((droite - z.r > 0.5 && !z.defileX) || (bas - z.b > 0.5 && !z.defileY)) pourquoi = "rognée par son cadre (" + (droite - z.r > 0.5 ? "à droite de " + Math.round(droite - z.r) : "en bas de " + Math.round(bas - z.b)) + " px)";
            else if (!f && bas - sb.b > 0.5 && !auDessus(el, sec)) pourquoi = "sortie du bas de la section de " + Math.round(bas - sb.b) + " px : la section suivante la recouvre";
            else if (!z.defileX && droite - Math.min(sb.r, vw) > 0.5) pourquoi = "sortie à droite de " + Math.round(droite - Math.min(sb.r, vw)) + " px";
            if (pourquoi) ajoute("ombre-coupee", el, { detail: "l'ombre décalée (" + Math.round(dx) + " × " + Math.round(dy) + " px) est " + pourquoi, cadre: { l: b.l, t: b.t, r: droite, b: bas } });
          }
        }
        // Un élément plein qui dépasse du bas de sa section sera recouvert par la suivante.
        if (!f && ss.overflowY === "visible" && s.position !== "absolute" && b.b - sb.b > SEUILS.TOLERANCE_PX && estBoite(el) && b.b <= z.b + 0.5 && !auDessus(el, sec)) ajoute("bord-recouvert", el, { detail: "l'élément dépasse du bas de sa section de " + Math.round(b.b - sb.b) + " px : la section suivante le recouvre" });
      });
    });

    // ── 7. les vides : section vide ou nulle, trou, cadre de photo vide ; l'arche
    var contenuDe = function (sec) {
      // Tout ce qui se voit dans la section : lignes de texte, images, fonds de photo, champs, boîtes pleines ou bordées.
      var out = [];
      textes.forEach(function (t) { if (t.sec === sec) t.vus.forEach(function (r) { out.push(r); }); });
      Array.prototype.forEach.call(sec.querySelectorAll("*"), function (el) {
        if (!visible(el)) return;
        var tag = el.tagName.toLowerCase(), s = cs(el);
        if (el.closest("svg") && tag !== "svg") return;
        var plein = tag === "img" || tag === "svg" || tag === "video" || tag === "canvas" || tag === "iframe" || tag === "input" || tag === "select" || tag === "textarea" || tag === "button" || tag === "hr" || s.backgroundImage !== "none";
        if (!plein && estBoite(el)) { var bg = couleur(s.backgroundColor), sbg = couleur(cs(sec).backgroundColor); plein = !bg || bg[3] <= 0.05 || !sbg || Math.abs(bg[0] - sbg[0]) + Math.abs(bg[1] - sbg[1]) + Math.abs(bg[2] - sbg[2]) > 12 || sbg[3] < 0.5; }
        if (!plein) { ["::before", "::after"].forEach(function (p) { var ps = getComputedStyle(el, p); if (ps.content !== "none" && ps.display !== "none" && (ps.backgroundImage !== "none" || (couleur(ps.backgroundColor) || [0, 0, 0, 0])[3] > 0.05 || num(ps.borderTopWidth) > 0)) plein = true; }); }
        var b = boite(el), z = zone(el);
        // Un pseudo-élément qui ÉCRIT (un grand numéro, un signe) se voit aussi : sa place est estimée d'après sa taille.
        ["::before", "::after"].forEach(function (p) {
          var ps = getComputedStyle(el, p), ct = ps.content;
          if (!ct || ct === "none" || ct === "normal" || ps.display === "none" || ps.visibility === "hidden" || !/[^"'\s]/.test(ct)) return;
          var col = couleur(ps.color);
          if (!col || col[3] * num(ps.opacity === "" ? 1 : ps.opacity) < 0.1 || num(ps.fontSize) < 1) return;
          var h = num(ps.height) || num(ps.lineHeight) || num(ps.fontSize) * 1.1, w = num(ps.width) || b.w, q;
          if (ps.position === "absolute") { var gauche = ps.left === "auto" ? 0 : num(ps.left), haut = ps.top === "auto" ? 0 : num(ps.top); q = { l: b.l + gauche, t: b.t + haut, r: b.l + gauche + w, b: b.t + haut + h }; }
          else if (p === "::before") q = { l: b.l, t: b.t + num(s.paddingTop), r: b.l + w, b: b.t + num(s.paddingTop) + h };
          else q = { l: b.l, t: b.b - num(s.paddingBottom) - h, r: b.l + w, b: b.b - num(s.paddingBottom) };
          if (q.r - q.l > 0.5 && q.b - q.t > 0.5) out.push(q);
        });
        if (!plein) return;
        var c = { l: Math.max(b.l, z.l), t: Math.max(b.t, z.t), r: Math.min(b.r, z.r), b: Math.min(b.b, z.b) };
        if (c.r - c.l > 0.5 && c.b - c.t > 0.5) out.push(c);
      });
      return out;
    };
    var contenus = new Map();
    racines.forEach(function (sec) {
      var s = cs(sec);
      if (s.display === "none" || s.visibility === "hidden" || s.position === "fixed" || flotte(sec)) return;
      var b = boite(sec);
      if (b.h < 0.5) { if (s.display !== "contents" && sec.children.length && !Array.prototype.some.call(sec.querySelectorAll("*"), function (x) { return cs(x).position === "fixed"; })) ajoute("section-nulle", sec, { texte: "", detail: "la section est dans la page mais ne prend aucune hauteur", cadre: { l: b.l, t: b.t, r: b.r, b: b.t + 8 } }); return; }
      var c = contenuDe(sec).filter(function (r) { return r.b > b.t - 1 && r.t < b.b + 1; });
      contenus.set(sec, c);
      // Une section qui n'a que son propre fond (photo ou couleur) et rien dedans.
      var dedans = c;
      if (!dedans.length) { if (b.h > SEUILS.SECTION_VIDE_PX) ajoute("section-vide", sec, { texte: "", detail: "une section de " + Math.round(b.h) + " px de haut sans rien de visible" }); return; }
      // Les trous : les bandes horizontales de la section où rien ne se voit, entre deux contenus.
      var bandes = dedans.map(function (r) { return [Math.max(r.t, b.t), Math.min(r.b, b.b)]; }).sort(function (x, y) { return x[0] - y[0]; });
      var fin = bandes[0][1];
      for (var i = 1; i < bandes.length; i++) { if (bandes[i][0] - fin > SEUILS.TROU_PX) ajoute("trou", sec, { texte: "", detail: "un vide de " + Math.round(bandes[i][0] - fin) + " px de haut entre deux éléments de la section", cadre: { l: b.l + 6, t: fin + 2, r: b.r - 6, b: bandes[i][0] - 2 } }); fin = Math.max(fin, bandes[i][1]); }
    });
    racines.forEach(function (sec) {
      Array.prototype.forEach.call(sec.querySelectorAll(".tn-ph,.tn-cadre,figure,img,picture,[style*='background-image']"), function (el) {
        if (!visible(el)) return;
        var s = cs(el), b = boite(el), tag = el.tagName.toLowerCase();
        var image = s.backgroundImage !== "none" || tag === "img" || !!el.querySelector("img,svg,video,.tn-ph,[style*='background-image']");
        // Cadre vide : un cadre de photo sans photo, sans libellé, d'une taille qui se voit.
        if (!image && (el.classList.contains("tn-ph") || el.classList.contains("tn-cadre")) && !el.textContent.trim() && b.w >= SEUILS.CADRE_VIDE_MIN_PX && b.h >= SEUILS.CADRE_VIDE_MIN_PX) ajoute("cadre-vide", el, { texte: "", detail: "un cadre de photo vide de " + Math.round(b.w) + " × " + Math.round(b.h) + " px (ni photo, ni libellé)" });
        if (tag === "img" && el.complete && !el.naturalWidth && b.w >= SEUILS.CADRE_VIDE_MIN_PX) ajoute("cadre-vide", el, { texte: "", detail: "une image qui ne s'affiche pas" });
        // Arche ou demi-lune : le haut très arrondi, le bas droit (ou l'inverse).
        if (image && b.w >= SEUILS.CADRE_VIDE_MIN_PX) {
          var haut = Math.min(num(s.borderTopLeftRadius) * (/%/.test(s.borderTopLeftRadius) ? b.w / 100 : 1), num(s.borderTopRightRadius) * (/%/.test(s.borderTopRightRadius) ? b.w / 100 : 1));
          var bas = Math.min(num(s.borderBottomLeftRadius) * (/%/.test(s.borderBottomLeftRadius) ? b.w / 100 : 1), num(s.borderBottomRightRadius) * (/%/.test(s.borderBottomRightRadius) ? b.w / 100 : 1));
          var hautMax = Math.max(num(s.borderTopLeftRadius), num(s.borderTopRightRadius)) * (/%/.test(s.borderTopLeftRadius) ? b.w / 100 : 1), basMax = Math.max(num(s.borderBottomLeftRadius), num(s.borderBottomRightRadius)) * (/%/.test(s.borderBottomLeftRadius) ? b.w / 100 : 1);
          if ((haut >= b.w * SEUILS.ARCHE_HAUT_PART && basMax <= b.w * SEUILS.ARCHE_BAS_PART) || (bas >= b.w * SEUILS.ARCHE_HAUT_PART && hautMax <= b.w * SEUILS.ARCHE_BAS_PART)) ajoute("arche", el, { texte: "", detail: "une photo dans une arche ou une demi-lune (arrondi de " + Math.round(Math.max(haut, bas)) + " px d'un seul côté)" });
        }
      });
    });

    // ── 8. ce qui reste d'exemple dans un site monté
    if (ctx.monte) {
      textes.forEach(function (t) {
        if (/\[À compléter/.test(t.texte)) ajoute("crochets-bruts", t.el, { texte: t.texte, detail: "des crochets « [À compléter » s'affichent tels quels" });
        // La casse ne compte pas : « L'infuseur » en tête de phrase est le même exemple que « l'infuseur ».
        var bas = t.texte.toLocaleLowerCase("fr-FR");
        (ctx.exemples || []).forEach(function (mot) { if (mot && bas.indexOf(mot.toLocaleLowerCase("fr-FR")) >= 0) ajoute("texte-exemple", t.el, { texte: t.texte, detail: "un texte d'exemple de la bibliothèque reste affiché : « " + mot + " »" }); });
      });
      racines.forEach(function (sec) {
        Array.prototype.forEach.call(sec.querySelectorAll("*"), function (el) {
          if (!visible(el)) return;
          var src = el.tagName === "IMG" ? el.currentSrc || el.src : cs(el).backgroundImage;
          if (src && /\/sections\/photos\//.test(src)) ajoute("photo-exemple", el, { texte: "", detail: "une photo d'exemple de la bibliothèque reste affichée (" + (/photos\/([\w.-]+)/.exec(src) || [])[1] + ")" });
        });
      });
    }

    // ── 9. entre deux sections : même fond et rien pour les séparer ; ce qui colle sous l'en-tête
    var flux = racines.filter(function (sec) { return contenus.has(sec) && contenus.get(sec).length; });
    var fondDe = function (sec) { for (var a = sec; a; a = a.parentElement) { var s = cs(a); if (s.backgroundImage !== "none") return "image"; var c = couleur(s.backgroundColor); if (c && c[3] > 0.5) return c.slice(0, 3).map(Math.round).join(","); } return "page"; };
    for (var k = 0; k + 1 < flux.length; k++) {
      var s1 = flux[k], s2 = flux[k + 1];
      if (s1.parentElement !== s2.parentElement) continue;
      var f1 = fondDe(s1), f2 = fondDe(s2);
      if (f1 !== f2 || f1 === "image") continue;
      var b1 = boite(s1), b2 = boite(s2);
      var dernier = Math.max.apply(null, contenus.get(s1).filter(function (r) { return r.b - r.t < b1.h - 4; }).map(function (r) { return r.b; }).concat([-Infinity]));
      var premier = Math.min.apply(null, contenus.get(s2).filter(function (r) { return r.b - r.t < b2.h - 4; }).map(function (r) { return r.t; }).concat([Infinity]));
      var bordure = num(cs(s2).borderTopWidth) > 0 || num(cs(s1).borderBottomWidth) > 0;
      if (isFinite(dernier) && isFinite(premier) && !bordure && premier - dernier < SEUILS.SEPARATION_MIN_PX) ajoute("sections-collees", s2, { texte: "", detail: "même fond que la section du dessus et seulement " + Math.round(premier - dernier) + " px entre leurs contenus : on ne voit pas où l'une finit", cadre: { l: b2.l + 6, t: dernier, r: b2.r - 6, b: Math.max(premier, dernier + 6) } });
    }
    var entete = Array.prototype.filter.call(cadrePage.querySelectorAll("[data-ct-role=header]"), function (el) { return visible(el) && cs(el).position === "sticky"; })[0];
    if (entete) {
      var he = boite(entete).h + num(cs(entete).top);
      racines.forEach(function (sec) {
        if (sec === entete || entete.contains(sec)) return;
        Array.prototype.forEach.call(sec.querySelectorAll("*"), function (el) {
          var s = cs(el);
          if (s.position !== "sticky" || !visible(el) || s.top === "auto") return;
          // Dans une fenêtre ou un tiroir fixe (posé au-dessus de la page, en-tête compris), il se colle à sa fenêtre.
          for (var a = el.parentElement; a && a !== sec.parentElement; a = a.parentElement) if (cs(a).position === "fixed") return;
          if (num(s.top) < he - 2) ajoute("collant-sous-entete", el, { detail: "cet élément se colle à " + Math.round(num(s.top)) + " px du haut, sous l'en-tête collant (" + Math.round(he) + " px) : il passe dessous" });
        });
      });
    }

    // ── les textes, pour le contraste (jugé sur les pixels, côté Node)
    var pourContraste = [];
    textes.forEach(function (t) {
      var s = cs(t.el), c = couleur(s.color);
      if (!c || c[3] < 0.1) return;
      if (s.webkitTextFillColor) { var f = couleur(s.webkitTextFillColor); if (f) { if (f[3] < 0.1) return; c = f; } }
      // L'opacité des ancêtres atténue le texte.
      var op = 1; for (var a = t.el; a && a !== document.body; a = a.parentElement) op *= num(cs(a).opacity === "" ? 1 : cs(a).opacity);
      if (op < 0.05) return;
      var sec = t.sec;
      pourContraste.push({ i: textes.indexOf(t), uid: sec ? sec.getAttribute("data-ct") : null, selecteur: sec ? chemin(t.el, sec) : t.el.tagName.toLowerCase(), texte: court(t.texte), couleur: [c[0], c[1], c[2], c[3] * op], taille: num(s.fontSize), gras: num(s.fontWeight) >= 600, fixe: !!t.flotte && cs(t.flotte).position === "fixed", rects: t.vus.map(function (r) { var zp = t.zone; return [Math.max(r.l, zp.l), Math.max(r.t, zp.t), Math.min(r.r, zp.r) - Math.max(r.l, zp.l), Math.min(r.b, zp.b) - Math.max(r.t, zp.t)]; }).filter(function (r) { return r[2] > 2 && r[3] > 2; }) });
    });

    derniersTextes = textes;
    defauts.forEach(function (d) { delete d._cle; });
    // Ce qui se voit : la hauteur à capturer (la page, et ce qui flotte dans l'écran).
    var bas = 0;
    racines.forEach(function (sec) {
      if (visible(sec)) bas = Math.max(bas, boite(sec).b);
      // Ce qui dépasse de sa section (un menu ouvert sous l'en-tête) et ce qui est fixe dans l'écran se capturent aussi.
      Array.prototype.forEach.call(sec.querySelectorAll("*"), function (el) { if (!visible(el)) return; var b = boite(el), z = zone(el); if (Math.min(b.r, z.r) - Math.max(b.l, z.l) < 1) return; bas = Math.max(bas, cs(el).position === "fixed" ? Math.min(b.b, innerHeight) : Math.min(b.b, z.b, document.documentElement.scrollHeight)); });
    });
    return {
      largeur: vw, hauteur: Math.ceil(Math.max(bas, 40)), hauteurPage: document.documentElement.scrollHeight,
      sections: racines.map(function (sec) { var b = boite(sec); return { uid: sec.getAttribute("data-ct"), classe: (sec.className || "").toString(), construction: sec.getAttribute("data-tn-c") || "", visible: visible(sec), cadre: cadre(b) }; }),
      defauts: defauts, textes: pourContraste,
    };
  }

  /**
   * Pour le contraste : chaque point (en pixels de la page) du texte numéro `i` de la dernière mesure est-il AU PREMIER
   * PLAN ? Non quand autre chose est peint par-dessus : un tiroir, une fenêtre, un menu ouvert, leur voile. La capture
   * est prise en haut de page : ce qui est fixe ou collant ne couvre que le premier écran.
   */
  var derniersTextes = [];
  function premierPlan(liste) {
    styles = new WeakMap();
    var fond = function (e) { var s = cs(e), c = couleur(s.backgroundColor); return s.backgroundImage !== "none" || /^(IMG|VIDEO|CANVAS|IFRAME)$/.test(e.tagName) ? 1 : c ? c[3] : 0; };
    var y0 = scrollY;
    // Une fenêtre ouverte qui prend tout l'écran (fixe, peinte) : tant qu'elle est ouverte, rien derrière elle ne se lit,
    // au-dessus comme au-dessous du pli (la capture pleine page ne la peint que sur le premier écran).
    var modales = Array.prototype.filter.call(document.querySelectorAll(".tb-wrap *"), function (e) {
      if (cs(e).position !== "fixed" || !fond(e)) return false;
      var r = e.getBoundingClientRect();
      return r.width >= innerWidth * 0.9 && r.height >= innerHeight * 0.9;
    });
    var out = liste.map(function (q) {
      var t = derniersTextes[q.i];
      if (t && modales.length && !modales.some(function (m) { return m.contains(t.el); })) return q.points.map(function () { return false; });
      if (!t || cs(t.el).pointerEvents === "none") return q.points.map(function () { return true; });
      // Un texte qu'une fenêtre, un tiroir ou un menu ouvert recouvre EN PARTIE se trouve sous elle : à ce moment il ne
      // se lit pas, et la capture (pleine page) ne peint pas la fenêtre au même endroit que l'écran sous le pli. Aucun de
      // ses points ne se juge.
      var sousFenetre = false;
      var res = q.points.map(function (p) {
        var x = p[0], y = p[1];
        if (y >= innerHeight - 1) { if (t.flotte) return true; scrollTo(0, Math.max(0, Math.round(y - innerHeight / 2))); }
        else if (scrollY) scrollTo(0, 0);
        var pile = document.elementsFromPoint(x, y - scrollY);
        for (var k = 0; k < pile.length; k++) {
          var e = pile[k];
          if (e === t.el || e.contains(t.el) || t.el.contains(e)) return true;
          var f = flotte(e);
          if (scrollY && f) continue;
          // Une autre section, ou une fenêtre fixe : dès qu'elle peint quelque chose (un voile compris). Dans la même
          // section : seulement un panneau opaque (le texte ne se voit plus du tout).
          var ailleurs = sectionDe(e) !== t.sec || (f && f !== t.flotte && cs(f).position === "fixed");
          if (fond(e) > (ailleurs ? 0.05 : 0.9)) { if (f && f !== t.flotte && !scrollY) sousFenetre = true; return false; }
        }
        return true;
      });
      return sousFenetre ? res.map(function () { return false; }) : res;
    });
    scrollTo(0, y0);
    return out;
  }

  /** Ouvre ce qui est replié ou caché (volets, tiroir de panier, recherche, fenêtre d'offre, menu du téléphone). Rend ce qui a été ouvert. */
  function ouvrir() {
    var faits = [];
    var tous = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(".tb-wrap > .frame " + sel)); };
    var d = tous("details:not([open])"); if (d.length) { d.forEach(function (x) { x.open = true; }); faits.push(d.length + " volet(s)"); }
    tous(".tn-panier-cote:not([data-tn-ouvert])").forEach(function (x) { x.setAttribute("data-tn-ouvert", ""); faits.push("tiroir de panier"); });
    tous(".tn-recherche:not(.ct-open)").forEach(function (x) { if (getComputedStyle(x).display === "none" || getComputedStyle(x).visibility === "hidden") { x.classList.add("ct-open"); faits.push("recherche"); } });
    tous(".tn-fenetre-offre:not([data-tn-ouverte])").forEach(function (x) { x.setAttribute("data-tn-ouverte", ""); faits.push("fenêtre d'offre"); });
    tous(".tn-e-burger input[type=checkbox]").forEach(function (x) { var l = x.closest(".tn-e-burger"); if (l && l.getBoundingClientRect().width > 0 && !x.checked) { x.click(); faits.push("menu du téléphone"); } });
    return faits;
  }

  window.__tour = { SEUILS: SEUILS, GRAVITE: GRAVITE, mesurer: mesurer, ouvrir: ouvrir, premierPlan: premierPlan };
})();
