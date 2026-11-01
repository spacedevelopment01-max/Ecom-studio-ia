/* Outils communs de la publicité « L'artisan invisible » : temps, courbes, matières, textures, cartes. */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, p) => a + (b - a) * p;
/** Avancement 0→1 de t entre a et b. */
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ease = {
  inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  out: (p) => 1 - Math.pow(1 - p, 3),
  in: (p) => p * p * p,
  expo: (p) => (p === 0 ? 0 : p === 1 ? 1 : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2),
  outExpo: (p) => (p === 1 ? 1 : 1 - Math.pow(2, -10 * p)),
  back: (p) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
  elastic: (p) => (p === 0 ? 0 : p === 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  sine: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
};
/** Interpolation logarithmique (zoom de caméra naturel). */
export const lerpLog = (a, b, p) => Math.exp(lerp(Math.log(a), Math.log(b), p));
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const lerpV = (a, b, p, out = new THREE.Vector3()) => out.set(lerp(a.x, b.x, p), lerp(a.y, b.y, p), lerp(a.z, b.z, p));
/** Point d'une courbe de Bézier quadratique. */
export const bez = (a, c, b, p, out = new THREE.Vector3()) => {
  const q = 1 - p;
  return out.set(q * q * a.x + 2 * q * p * c.x + p * p * b.x, q * q * a.y + 2 * q * p * c.y + p * p * b.y, q * q * a.z + 2 * q * p * c.z + p * p * b.z);
};
/** Bruit déterministe (aucun Math.random : le rendu doit être identique à chaque image). */
export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

export const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o });
export const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
export const rbox = (w, h, d, r = 0.05, seg = 4) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));

const loader = new THREE.TextureLoader();
const cache = {};
/** Charge une texture d'interface (PNG photographié depuis ui/boards.html). */
export function tex(name) {
  if (cache[name]) return cache[name];
  const t = loader.load("assets/tex/" + name);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  cache[name] = t; return t;
}
export function texReady() {
  return Promise.all(Object.values(cache).map((t) => new Promise((res) => { if (t.image && t.image.complete !== false && t.image.width) res(); else { const i = setInterval(() => { if (t.image && t.image.width) { clearInterval(i); res(); } }, 30); } })));
}
/** Texture dessinée (bruit, dégradés). */
export function canvasTex(w, h, draw, rep) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}

/** Forme de carré arrondi (repère au centre). */
export function roundRectShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
/** Plaque d'interface : face avant texturée aux coins arrondis + épaisseur, ombre portée possible. */
export function card(map, w, h, { depth = 0.05, radius = 0.12, side = "#ffffff", emissive = 0.0, back = "#E9EDF5", unlit = true, lum = 0.97 } = {}) {
  const g = new THREE.Group();
  const shape = roundRectShape(w, h, radius);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 }), std(side, { roughness: 0.6 }));
  body.position.z = -depth; body.castShadow = true; g.add(body);
  const fg = new THREE.ShapeGeometry(shape, 10);
  const uv = fg.attributes.uv, pos = fg.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
  const fm = unlit ? new THREE.MeshBasicMaterial({ map, color: new THREE.Color(lum, lum, lum) })
    : new THREE.MeshStandardMaterial({ map, roughness: 0.55, metalness: 0, emissive: "#ffffff", emissiveMap: map, emissiveIntensity: emissive });
  const face = new THREE.Mesh(fg, fm); face.position.z = 0.002; g.add(face);
  const bk = new THREE.Mesh(fg.clone(), std(back, { side: THREE.BackSide })); bk.position.z = -depth - 0.001; g.add(bk);
  g.userData = { face, body, fm, w, h };
  return g;
}
/** Remplace l'image d'une plaque (changement d'état d'un écran). */
export function setCardMap(c, map) { const m = c.userData.fm; if (m.map !== map) { m.map = map; if (m.emissiveMap) m.emissiveMap = map; } }

/** Ciel en dégradé (dôme). */
export function skyDome(top, mid, bottom, radius = 900) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, mid: { value: new THREE.Color(mid) }, bottom: { value: new THREE.Color(bottom) } },
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }",
    fragmentShader: "uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h>0.0 ? mix(mid, top, pow(clamp(h*2.2,0.,1.),0.7)) : mix(mid, bottom, clamp(-h*4.,0.,1.)); gl_FragColor = vec4(c,1.); }",
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), mat); m.userData.mat = mat; m.renderOrder = -10; return m;
}
/** Halo additif (lueur douce) : sprite radial. */
let glowTexCache = null;
export function glowTex() {
  if (glowTexCache) return glowTexCache;
  glowTexCache = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  glowTexCache.colorSpace = THREE.NoColorSpace; return glowTexCache;
}
export function glow(color, size, opacity = 1) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(size, size, 1); return s;
}
