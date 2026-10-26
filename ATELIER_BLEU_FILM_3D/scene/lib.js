// Outils communs de la scène : courbes d'animation, matériaux, textures procédurales, écrans texturés, texte en volume.
import * as THREE from "three";
import { TTFLoader } from "three/addons/loaders/TTFLoader.js";
import { Font } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

// ---------- temps et courbes ----------
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const ramp = (t, a, b) => clamp01((t - a) / (b - a));
export const mix = (a, b, k) => a + (b - a) * k;
export const eio = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const eio2 = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
export const eout = (x) => 1 - Math.pow(1 - x, 3);
export const eout5 = (x) => 1 - Math.pow(1 - x, 5);
export const ein = (x) => x * x * x;
export const eback = (x) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const EASE = { io: eio, io2: eio2, out: eout, out5: eout5, in: ein, lin: (x) => x, back: eback };
/** Fenêtre d'apparition : 0 → 1 entre a et a+fin, puis 1 → 0 entre b-fout et b. */
export const fenetre = (t, a, b, fin = 0.3, fout = 0.3) => Math.min(ramp(t, a, a + fin), 1 - ramp(t, b - fout, b));
/** Pseudo-aléatoire déterministe. */
export function alea(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
export const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

// ---------- couleurs ----------
export const COUL = {
  nuit: 0x0b1736, bleu: 0x2350ff, ciel: 0x8fb8ff, blanc: 0xf5f7fb, argent: 0xc9cfd9,
  fond: 0x030a22, studio: 0x0a1024, signal: 0x2f5bea,
};

// ---------- textures procédurales ----------
function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; }

/** Carte de normales à partir d'une carte de hauteurs (canvas en niveaux de gris). */
export function normalesDepuis(src, force = 2) {
  const w = src.width, h = src.height, g = src.getContext("2d").getImageData(0, 0, w, h).data;
  const c = canvas(w, h), ctx = c.getContext("2d"), out = ctx.createImageData(w, h);
  const H = (x, y) => g[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * force, dy = (H(x, y + 1) - H(x, y - 1)) * force;
    const n = new THREE.Vector3(-dx, -dy, 1).normalize(), i = (y * w + x) * 4;
    out.data[i] = (n.x * 0.5 + 0.5) * 255; out.data[i + 1] = (n.y * 0.5 + 0.5) * 255; out.data[i + 2] = (n.z * 0.5 + 0.5) * 255; out.data[i + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

/** Peinture fraîche passée au rouleau : fin grain « peau d'orange » et traînées dans le sens du passage. */
export function texturePeinture(seed = 3) {
  const r = alea(seed), c = canvas(512, 512), x = c.getContext("2d");
  x.fillStyle = "#808080"; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { const v = 100 + r() * 60; x.fillStyle = `rgba(${v},${v},${v},0.35)`; x.beginPath(); x.arc(r() * 512, r() * 512, 1 + r() * 3.5, 0, 7); x.fill(); }
  for (let i = 0; i < 260; i++) { const v = 110 + r() * 40, y = r() * 512; x.strokeStyle = `rgba(${v},${v},${v},0.25)`; x.lineWidth = 1 + r() * 3; x.beginPath(); x.moveTo(0, y); x.lineTo(512, y + (r() - 0.5) * 6); x.stroke(); }
  x.filter = "blur(1.2px)"; x.drawImage(c, 0, 0); x.filter = "none";
  return normalesDepuis(c, 3);
}

/** Fibres du manchon du rouleau : brins courts, denses, orientés. */
export function textureFibres(seed = 7) {
  const r = alea(seed), c = canvas(512, 512), x = c.getContext("2d");
  x.fillStyle = "#6a6a6a"; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26000; i++) {
    const v = 60 + r() * 170, px = r() * 512, py = r() * 512, a = -1.2 + r() * 0.5, l = 4 + r() * 9;
    x.strokeStyle = `rgba(${v},${v},${v},0.5)`; x.lineWidth = 0.6 + r() * 1.2;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  const t = normalesDepuis(c, 5);
  const tc = new THREE.CanvasTexture(c); tc.wrapS = tc.wrapT = THREE.RepeatWrapping;
  return { normal: t, hauteur: tc };
}

/** Parquet de chêne (planches, veinage) : couleur + rugosité. */
export function textureParquet(seed = 11) {
  const r = alea(seed), c = canvas(1024, 1024), x = c.getContext("2d");
  const lame = 1024 / 8;
  for (let i = 0; i < 8; i++) {
    let y = 0;
    while (y < 1024) {
      const l = 300 + r() * 500, base = 150 + r() * 30;
      const g = x.createLinearGradient(i * lame, 0, (i + 1) * lame, 0);
      g.addColorStop(0, `rgb(${base},${base * 0.74},${base * 0.5})`); g.addColorStop(1, `rgb(${base - 14},${(base - 14) * 0.72},${(base - 14) * 0.48})`);
      x.fillStyle = g; x.fillRect(i * lame, y, lame, l);
      for (let k = 0; k < 26; k++) { x.strokeStyle = `rgba(90,55,30,${0.06 + r() * 0.1})`; x.lineWidth = 1 + r() * 2; const px = i * lame + r() * lame; x.beginPath(); x.moveTo(px, y); x.bezierCurveTo(px + (r() - 0.5) * 20, y + l / 3, px + (r() - 0.5) * 20, y + (2 * l) / 3, px + (r() - 0.5) * 10, y + l); x.stroke(); }
      x.fillStyle = "rgba(60,38,20,0.55)"; x.fillRect(i * lame, y, lame, 2);
      y += l;
    }
    x.fillStyle = "rgba(60,38,20,0.6)"; x.fillRect(i * lame, 0, 2, 1024);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/** Mur « avant travaux » : enduit défraîchi, taches et reprises. */
export function textureMurAncien(seed = 5) {
  const r = alea(seed), c = canvas(1024, 1024), x = c.getContext("2d");
  x.fillStyle = "#d3c7b1"; x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 90; i++) { const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); const v = r(); x.save(); x.translate(r() * 1024, r() * 1024); x.scale(30 + r() * 120, 30 + r() * 120); g.addColorStop(0, v > 0.5 ? "rgba(160,145,120,0.22)" : "rgba(230,222,205,0.3)"); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, 7); x.fill(); x.restore(); }
  for (let i = 0; i < 18; i++) { x.strokeStyle = "rgba(90,80,65,0.35)"; x.lineWidth = 1.5; x.beginPath(); let px = r() * 1024, py = r() * 1024; x.moveTo(px, py); for (let k = 0; k < 8; k++) { px += (r() - 0.5) * 50; py += r() * 30; x.lineTo(px, py); } x.stroke(); }
  for (let i = 0; i < 10; i++) { x.fillStyle = "rgba(235,230,220,0.85)"; x.fillRect(r() * 1000, r() * 1000, 20 + r() * 70, 14 + r() * 40); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

/** Texte simple dans une texture (étiquettes, nuancier). */
export function textureTexte(lignes, { w = 1024, h = 256, fond = null, couleur = "#ffffff", police = "800 120px Montserrat", align = "left", x0 = 40 } = {}) {
  const c = canvas(w, h), x = c.getContext("2d");
  if (fond) { x.fillStyle = fond; x.fillRect(0, 0, w, h); }
  x.textBaseline = "alphabetic"; x.textAlign = align;
  let y = 0;
  for (const l of lignes) { x.font = l.police || police; x.fillStyle = l.couleur || couleur; y += l.dy; x.fillText(l.t, align === "center" ? w / 2 : x0, y); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// ---------- matériaux ----------
export function materiaux(peintureN, fibres) {
  return {
    peinture: new THREE.MeshPhysicalMaterial({ color: COUL.bleu, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.06, normalMap: peintureN, normalScale: new THREE.Vector2(0.25, 0.25) }),
    peintureManchon: new THREE.MeshPhysicalMaterial({ color: 0x1d44e6, roughness: 0.55, clearcoat: 0.7, clearcoatRoughness: 0.25, normalMap: fibres.normal, normalScale: new THREE.Vector2(1.4, 1.4), bumpMap: fibres.hauteur, bumpScale: 2 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe4e9f2, metalness: 1, roughness: 0.1 }),
    argent: new THREE.MeshStandardMaterial({ color: 0xc9cfd9, metalness: 1, roughness: 0.3 }),
    blanc: new THREE.MeshPhysicalMaterial({ color: 0xeef1f7, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
    blancMat: new THREE.MeshStandardMaterial({ color: 0xf1f3f7, roughness: 0.85 }),
    nuit: new THREE.MeshPhysicalMaterial({ color: COUL.nuit, roughness: 0.28, metalness: 0.15, clearcoat: 0.8 }),
    bleuLaque: new THREE.MeshPhysicalMaterial({ color: COUL.bleu, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.04 }),
    lueur: new THREE.MeshBasicMaterial({ color: new THREE.Color(0x7fa4ff).multiplyScalar(3.2) }),
    lueurDouce: new THREE.MeshBasicMaterial({ color: new THREE.Color(0x6f9bff).multiplyScalar(1.25) }),
    lueurBlanche: new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffffff).multiplyScalar(3.5) }),
    sol: new THREE.MeshPhysicalMaterial({ color: 0x07112e, roughness: 0.16, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.05 }),
  };
}

// ---------- texte en volume ----------
const polices = {};
export async function chargerPolice(nom, url) {
  const json = await new Promise((ok, ko) => new TTFLoader().load(url, ok, undefined, ko));
  polices[nom] = new Font(json);
}
export function texte3D(txt, { police = "m800", taille = 1, profondeur = 0.3, biseau = 0.03, espacement = 0 } = {}) {
  const font = polices[police];
  if (!espacement) {
    const g = new TextGeometry(txt, { font, size: taille, depth: profondeur, curveSegments: 6, bevelEnabled: biseau > 0, bevelThickness: biseau, bevelSize: biseau * 0.8, bevelSegments: 2 });
    g.computeBoundingBox(); return g;
  }
  return null;
}
/** Lettres séparées (pour les animer une à une) : renvoie [{lettre, geo, x}] centrées horizontalement. */
export function lettres3D(txt, { police = "m800", taille = 1, profondeur = 0.3, biseau = 0.03, espacement = 0.08 } = {}) {
  const font = polices[police], out = [];
  let x = 0;
  for (const ch of txt) {
    if (ch === " ") { x += taille * 0.32; continue; }
    const g = new TextGeometry(ch, { font, size: taille, depth: profondeur, curveSegments: 6, bevelEnabled: biseau > 0, bevelThickness: biseau, bevelSize: biseau * 0.8, bevelSegments: 2 });
    g.computeBoundingBox();
    const w = g.boundingBox.max.x - g.boundingBox.min.x;
    g.translate(-g.boundingBox.min.x - w / 2, 0, -profondeur / 2);
    out.push({ lettre: ch, geo: g, x: x + w / 2, w });
    x += w + taille * espacement;
  }
  const total = x - taille * espacement;
  for (const l of out) l.x -= total / 2;
  return { lettres: out, largeur: total };
}

// ---------- écrans texturés (maquettes HTML photographiées) ----------
const images = {};
export async function chargerImage(src) {
  if (images[src]) return images[src];
  const im = new Image(); im.src = src; await im.decode(); images[src] = im; return im;
}

/**
 * Un écran : plan texturé par une maquette (ui/png/<nom>-<état>.png), avec cadre argent et liseré lumineux.
 * Le contenu se compose à chaque image : un état de base + des « révélations » (une zone de l'état suivant découverte
 * de gauche à droite ou de haut en bas, comme une saisie), + un curseur clignotant.
 */
export class Ecran {
  constructor(nom, etats, zones, { largeur = 10, cadre = true, mats, profondeur = 0.25, rayon = 0.35, maxTex = 2048 } = {}) {
    this.nom = nom; this.etats = etats; this.info = zones[nom];
    this.k = Math.min(1, maxTex / Math.max(this.info.w, this.info.h));
    this.cw = Math.round(this.info.w * this.k); this.ch = Math.round(this.info.h * this.k);
    this.canvas = canvas(this.cw, this.ch); this.ctx = this.canvas.getContext("2d");
    this.tex = new THREE.CanvasTexture(this.canvas); this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 16;
    this.W = largeur; this.H = largeur * this.info.h / this.info.w;
    this.groupe = new THREE.Group();
    this.mat = new THREE.MeshBasicMaterial({ map: this.tex, toneMapped: false, transparent: true });
    this.plan = new THREE.Mesh(new THREE.PlaneGeometry(this.W, this.H), this.mat);
    this.plan.position.z = profondeur / 2 + 0.01;
    this.groupe.add(this.plan);
    if (cadre && mats) {
      const b = new THREE.Mesh(new RoundedBoxGeometry(this.W + 0.36, this.H + 0.36, profondeur, 3, rayon), mats.argent);
      b.castShadow = true; this.groupe.add(b);
      const l = new THREE.Mesh(new RoundedBoxGeometry(this.W + 0.5, this.H + 0.5, profondeur * 0.5, 3, rayon + 0.05), mats.lueurDouce);
      l.position.z = -profondeur * 0.4; this.groupe.add(l);
      this.cadre = b; this.liseret = l;
    }
    this.cle = "";
  }
  zone(nom) { const z = this.info.zones[nom]; return z; }
  /** Position locale (dans le plan) du centre d'une zone, et sa taille en unités. */
  zoneLocale(nom) {
    const [x, y, w, h] = this.info.zones[nom];
    return { x: ((x + w / 2) / this.info.w - 0.5) * this.W, y: (0.5 - (y + h / 2) / this.info.h) * this.H, w: (w / this.info.w) * this.W, h: (h / this.info.h) * this.H };
  }
  zoneMonde(nom) { const z = this.zoneLocale(nom); const p = new THREE.Vector3(z.x, z.y, 0); this.plan.localToWorld(p); return { p, w: z.w, h: z.h }; }
  /** spec : { base, reveles: [{etat, zone, p, sens}], curseur: {zone, x(0..1), visible}, opacite } */
  composer(spec) {
    const cle = JSON.stringify(spec);
    if (cle === this.cle) return;
    this.cle = cle;
    const x = this.ctx, k = this.k;
    x.clearRect(0, 0, this.cw, this.ch);
    x.drawImage(images[`../ui/png/${this.nom}-${spec.base}.png`], 0, 0, this.cw, this.ch);
    for (const r of spec.reveles || []) {
      if (r.p <= 0) continue;
      const [zx, zy, zw, zh] = (r.rect || this.info.zones[r.zone]).map((v) => v * k);
      const im = images[`../ui/png/${this.nom}-${r.etat}.png`];
      const ww = r.sens === "y" ? zw : zw * r.p, hh = r.sens === "y" ? zh * r.p : zh;
      if (r.fondu) { x.globalAlpha = r.p; x.drawImage(im, zx / k, zy / k, zw / k, zh / k, zx, zy, zw, zh); x.globalAlpha = 1; }
      else x.drawImage(im, zx / k, zy / k, ww / k, hh / k, zx, zy, ww, hh);
    }
    if (spec.curseur && spec.curseur.visible) {
      const [zx, zy, zw, zh] = this.info.zones[spec.curseur.zone].map((v) => v * k);
      x.fillStyle = "#2F5BEA"; x.fillRect(zx + spec.curseur.x * zw, zy + zh * 0.12, 4 * k * 2, zh * 0.76);
    }
    if (spec.lumiere != null) {
      // balayage lumineux (mise à jour d'un support)
      const g = x.createLinearGradient(0, 0, this.cw, this.ch * 0.4);
      const p = spec.lumiere;
      const c01 = (v) => Math.min(1, Math.max(0, v));
      g.addColorStop(c01(p - 0.12), "rgba(255,255,255,0)"); g.addColorStop(c01(p), "rgba(255,255,255,0.55)"); g.addColorStop(c01(p + 0.12), "rgba(255,255,255,0)");
      x.fillStyle = g; x.fillRect(0, 0, this.cw, this.ch);
    }
    this.tex.needsUpdate = true;
  }
}

export { RoundedBoxGeometry };

/** Module de façade (3,1 × 3,1) : panneau blanc, joints, bandeau vitré bleu nuit ; carte lumineuse des vitrages. */
export function texturesModule(seed = 9) {
  // un module de 3,1 × 3,1 : panneau blanc nacré, fines ailettes verticales, un bandeau vitré fin
  const r = alea(seed), c = canvas(512, 512), x = c.getContext("2d"), e = canvas(512, 512), y = e.getContext("2d");
  const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, "#f6f8fc"); g.addColorStop(1, "#e3e8f1"); x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) { x.fillStyle = "rgba(150,162,185,0.22)"; x.fillRect(i * 64, 0, 2, 512); x.fillStyle = "rgba(255,255,255,0.6)"; x.fillRect(i * 64 + 2, 0, 1, 512); }
  x.fillStyle = "#b9c2d3"; x.fillRect(0, 0, 512, 3);
  const v = x.createLinearGradient(0, 300, 0, 372); v.addColorStop(0, "#22386f"); v.addColorStop(0.5, "#0d1b44"); v.addColorStop(1, "#1a2f63");
  x.fillStyle = v; x.fillRect(0, 300, 512, 72);
  x.fillStyle = "rgba(190,210,255,0.35)"; x.fillRect(0, 306, 512, 2);
  for (let i = 0; i < 8; i++) { x.fillStyle = "#cfd6e3"; x.fillRect(i * 64, 300, 3, 72); }
  y.fillStyle = "#000"; y.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8; i++) { const on = r(); y.fillStyle = `rgba(110,150,255,${on > 0.5 ? 0.55 : 0.18})`; y.fillRect(i * 64 + 3, 300, 61, 72); }
  const mk = (cv) => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; return t; };
  return { map: mk(c), emissiveMap: mk(e) };
}

/** Dégradé doux (faisceaux de lumière, brume). */
export function textureFaisceau() {
  const c = canvas(128, 512), x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, 128, 0); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.5, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 512);
  x.globalCompositeOperation = "destination-in";
  const v = x.createLinearGradient(0, 0, 0, 512); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(0.35, "rgba(0,0,0,0.8)"); v.addColorStop(1, "rgba(0,0,0,1)");
  x.fillStyle = v; x.fillRect(0, 0, 128, 512);
  return new THREE.CanvasTexture(c);
}
export function textureBrume(seed = 21) {
  const r = alea(seed), c = canvas(512, 512), x = c.getContext("2d");
  for (let i = 0; i < 70; i++) {
    const px = r() * 512, py = r() * 512, rr = 40 + r() * 120, g = x.createRadialGradient(px, py, 0, px, py, rr);
    g.addColorStop(0, `rgba(255,255,255,${0.08 + r() * 0.12})`); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
