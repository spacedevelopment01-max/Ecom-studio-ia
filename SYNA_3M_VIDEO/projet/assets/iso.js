/* Moteur isométrique CSS 3D (caméra rotateX 60° puis rotateZ 45°).
   Repère du sol : origine au centre du plan ; x vers le bas-droite de l'écran, y vers le bas-gauche, z vers le haut.
   Tout est construit une fois au chargement, de façon déterministe ; les animations se font avec GSAP sur des
   « porteurs » (holder) sans transformation CSS propre. */
(function () {
  if (window.ISO) return;
  const C45 = Math.SQRT1_2, C60 = 0.5, S60 = Math.sqrt(3) / 2;
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    const f = (c) => Math.max(0, Math.min(255, Math.round(c * k)));
    return "#" + ((1 << 24) + (f((n >> 16) & 255) << 16) + (f((n >> 8) & 255) << 8) + f(n & 255)).toString(16).slice(1);
  }
  function el(parent, cls, css, html) {
    const e = document.createElement("div");
    if (cls) e.className = cls;
    if (css) Object.assign(e.style, css);
    if (html != null) e.innerHTML = html;
    parent.appendChild(e);
    return e;
  }
  const px = (v) => v + "px";
  /** Porteur animable placé en (x, y) du plan. GSAP anime le porteur (x, y, z, scale, opacity) et sa variable
      « --sz » (étirement vertical : 0,001 = à plat, 1 = hauteur normale), lue par le conteneur intérieur. */
  function holder(parent, o) {
    const h = el(parent, "iso-h " + (o.cls || ""), { position: "absolute", left: px(o.x), top: px(o.y), width: 0, height: 0, transformStyle: "preserve-3d" });
    if (o.id) h.id = o.id;
    const g = el(h, "iso-grow", { position: "absolute", left: 0, top: 0, width: 0, height: 0, transformStyle: "preserve-3d", transformOrigin: "0 0 0", transform: "scale3d(1, 1, var(--sz, 1))" });
    g._holder = h;
    return g;
  }
  /** Bloc w × d × h posé en (x, y, z) dans son porteur ; faces : dessus, +y (gauche à l'écran), +x (droite). */
  function box(parent, o) {
    const c = el(parent, "iso-box " + (o.cls || ""), { position: "absolute", left: px(o.x || 0), top: px(o.y || 0), width: px(o.w), height: px(o.d), transformStyle: "preserve-3d", transform: "translateZ(" + px(o.z || 0) + ")" });
    if (o.id) c.id = o.id;
    const top = el(c, "iso-top", { position: "absolute", left: 0, top: 0, width: px(o.w), height: px(o.d), background: o.top || o.color, transform: "translateZ(" + px(o.h) + ")", borderRadius: px(o.r || 0) });
    const fy = el(c, "iso-fy", { position: "absolute", left: 0, top: px(o.d), width: px(o.w), height: px(o.h), background: o.left || shade(o.color, 0.86), transformOrigin: "0 0", transform: "translateZ(" + px(o.h) + ") matrix3d(1,0,0,0, 0,0,-1,0, 0,1,0,0, 0,0,0,1)" });
    const fx = el(c, "iso-fx", { position: "absolute", left: px(o.w), top: px(o.d), width: px(o.d), height: px(o.h), background: o.right || shade(o.color, 0.72), transformOrigin: "0 0", transform: "translateZ(" + px(o.h) + ") matrix3d(0,-1,0,0, 0,0,-1,0, 1,0,0,0, 0,0,0,1)" });
    let back = null;
    if (o.back) back = el(c, "iso-back", { position: "absolute", left: 0, top: 0, width: px(o.w), height: px(o.h), background: o.back, transformOrigin: "0 0", transform: "translateZ(" + px(o.h) + ") matrix3d(1,0,0,0, 0,0,-1,0, 0,1,0,0, 0,0,0,1)" });
    c._faces = { top, fy, fx, back };
    return c;
  }
  /** Panneau debout le long de l'axe x, tourné vers +y (lu de gauche à droite sur la face gauche des blocs). */
  function panelX(parent, o) {
    const c = el(parent, "iso-panel " + (o.cls || ""), { position: "absolute", left: px(o.x || 0), top: px(o.y || 0), width: px(o.w), height: px(o.h), transformOrigin: "0 0", transform: "translateZ(" + px((o.z || 0) + o.h) + ") matrix3d(1,0,0,0, 0,0,-1,0, 0,1,0,0, 0,0,0,1)" }, o.html);
    if (o.id) c.id = o.id;
    return c;
  }
  /** Panneau debout le long de l'axe y, tourné vers +x (face droite) ; y = extrémité du fond, w = longueur. */
  function panelY(parent, o) {
    const c = el(parent, "iso-panel " + (o.cls || ""), { position: "absolute", left: px(o.x || 0), top: px((o.y || 0) + o.w), width: px(o.w), height: px(o.h), transformOrigin: "0 0", transform: "translateZ(" + px((o.z || 0) + o.h) + ") matrix3d(0,-1,0,0, 0,0,-1,0, 1,0,0,0, 0,0,0,1)" }, o.html);
    if (o.id) c.id = o.id;
    return c;
  }
  /** Décor posé à plat sur le sol (z = o.z). */
  function flat(parent, o) {
    const c = el(parent, "iso-flat " + (o.cls || ""), { position: "absolute", left: px(o.x || 0), top: px(o.y || 0), width: px(o.w), height: px(o.d), transform: "translateZ(" + px(o.z || 0.5) + ")" }, o.html);
    if (o.id) c.id = o.id;
    return c;
  }
  /** Ombre de contact douce posée sur le sol (décalée vers le bas-droite, à l'opposé de la lumière). */
  function shadow(parent, o) {
    return flat(parent, { id: o.id, cls: "iso-shadow " + (o.cls || ""), x: o.x, y: o.y, w: o.w, d: o.d, z: o.z || 0.3, html: '<div style="width:100%;height:100%;border-radius:50%;background:radial-gradient(closest-side, rgba(10,16,36,' + (o.a == null ? 0.22 : o.a) + '), rgba(10,16,36,0))"></div>' });
  }
  /** Projection d'un point du sol (wx, wy relatifs au centre du plan, wz hauteur) vers l'écran, relatif à la caméra. */
  function project(wx, wy, wz) {
    const x1 = wx * C45 - wy * C45, y1 = wx * C45 + wy * C45;
    return { x: x1, y: y1 * C60 - (wz || 0) * S60 };
  }
  /** Réglage de caméra (x, y, scale) qui amène le point (wx, wy, wz) en (960 + ox, 540 + oy) à l'échelle s. */
  function focus(wx, wy, wz, s, ox, oy) {
    const p = project(wx, wy, wz);
    return { x: (ox || 0) - s * p.x, y: (oy || 0) - s * p.y, scale: s };
  }
  window.ISO = { el, holder, box, panelX, panelY, flat, shadow, shade, project, focus };
})();
