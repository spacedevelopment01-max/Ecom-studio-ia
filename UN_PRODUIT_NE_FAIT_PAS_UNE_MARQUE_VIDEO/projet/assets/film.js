/* Publicité 03 « Un produit ne fait pas une marque » : un rendu WebGL, deux mondes (le marché / la création) et la
   caméra, pilotés par le temps t du film (calé sur la voix : voir vo/mots.json). */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { seg, ease, lerp, clamp, v3, texReady, bez } from "./lib.js";
import { buildMarket, STATION, BRAND_CARD, FINAL } from "./market.js";
import { buildBrand, B } from "./brand.js";

const W = window.__w;
const canvas = document.getElementById("cv");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1); renderer.setSize(1080, 1920, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
await Promise.all([document.fonts.load("700 64px Inter"), document.fonts.load("700 64px SpaceG")]);
const market = buildMarket();
const brand = buildBrand();
await texReady();
const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
[[market.scene, 0.22], [brand.scene, 0.3]].forEach(([s, k]) => { s.environment = env; s.environmentIntensity = k; });
const cam = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.03, 600);
const composer = new EffectComposer(renderer);
const rp = new RenderPass(market.scene, cam); composer.addPass(rp);
const bloom = new UnrealBloomPass(new THREE.Vector2(540, 960), 0.7, 0.5, 1.0); composer.addPass(bloom);
composer.addPass(new OutputPass());

let pos = new THREE.Vector3(), tgt = new THREE.Vector3();
const tmp = new THREE.Vector3();
const hand = (t, a) => tmp.set(Math.sin(t * 1.7) * 0.6 + Math.sin(t * 3.1) * 0.3, Math.sin(t * 1.3 + 1) * 0.5 + Math.sin(t * 2.7) * 0.2, Math.sin(t * 1.1 + 2) * 0.4).multiplyScalar(a);
/** Clés de caméra [t, position, cible] interpolées (courbe d'accélération par segment, « io » par défaut). */
function keys(t, K) {
  if (t <= K[0][0]) return [K[0][1].clone(), K[0][2].clone()];
  for (let i = 0; i < K.length - 1; i++) { const [a, pa, ta] = K[i], [b, pb, tb, e] = K[i + 1]; if (t <= b) { const f = e === "o" ? ease.out : e === "i" ? ease.in : e === "x" ? ease.expo : ease.inOut; const p = f(seg(t, a, b)); return [pa.clone().lerp(pb, p), ta.clone().lerp(tb, p)]; } }
  const k = K[K.length - 1]; return [k[1].clone(), k[2].clone()];
}
const orbit = (c, r, az, el) => v3(c.x + r * Math.sin(az) * Math.cos(el), c.y + r * Math.sin(el), c.z + r * Math.cos(az) * Math.cos(el));
const LC = v3(0, 2.35, 0.6), S = STATION;
// ---------------- marché
const K1 = [
  [0.0, v3(0, 2.0, 3.0), v3(0, 0.9, 0)],
  [0.35, v3(0, 2.3, 3.0), v3(0, 1.9, 0.3)],
];
const K2 = [
  [2.2, orbit(LC, 2.95, 0, 0.05), LC.clone()],
  [2.75, orbit(LC, 2.7, 0, 0.03), LC.clone(), "o"],
  [5.4, v3(0, 6.4, 17), v3(0, 6.6, -5), "x"],
  [6.55, v3(0.6, 6.8, 17.5), v3(0, 7.0, -5)],
  [7.4, v3(-1.0, 8.4, 15), v3(0, 8.0, -5)],
  [8.9, v3(-7.0, 6.0, 9), v3(-1.0, 5.5, -6), "io"],
  [9.45, v3(0, 3.6, 1.5), v3(0, 3.5, -10), "i"],
  [11.0, v3(0, 3.5, -58), v3(0, 3.3, -70), "o"],
  [12.15, v3(0.15, 2.6, S.z + 7.2), v3(0.15, 1.9, S.z), "io"],
  [13.2, v3(0.12, 2.4, S.z + 6.8), v3(0.12, 1.85, S.z)],
  [14.9, v3(0.08, 2.45, S.z + 6.5), v3(0.08, 1.9, S.z)],
  [15.4, v3(0, 2.6, S.z + 4.6), v3(0, 2.55, S.z), "o"],
  [15.9, v3(0, 3.1, S.z + 3.45), v3(0, 3.1, S.z + 0.15), "o"],
  [16.75, v3(0, 3.12, S.z + 3.35), v3(0, 3.1, S.z + 0.15)],
  [17.45, v3(0, 3.1, S.z + 0.6), v3(0, 3.1, S.z), "i"],
];
// ---------------- création
const K4 = [
  [17.45, v3(0, 3.6, 3.0), v3(0, 3.6, 0)],
  [17.75, v3(0, 4.2, 6.2), v3(0, 4.2, 0), "o"],
  [18.7, v3(0.2, 4.0, 6.4), v3(0, 4.0, 0)],
  [19.35, orbit(v3(0, 3.6, 0), 7.6, -0.35, 0.05), v3(0, 3.6, 0)],
  [19.9, orbit(B.lamp, 4.6, 0.45, 0.08), B.lamp.clone(), "o"],
  [20.45, v3(0, 3.6, 5.6), v3(0, 3.4, 0)],
  [21.1, v3(0, 3.3, 4.6), v3(0, 3.3, 0.6), "o"],
  [21.6, v3(-0.5, 3.45, 6.4), v3(-0.5, 3.4, 0)],
  [22.6, v3(-0.25, 2.9, 7.9), v3(-0.25, 2.8, 0.4)],
  [23.6, v3(0, 3.0, 8.5), v3(0, 2.95, 0.3)],
  [24.5, v3(0, 2.6, 10.4), v3(0, 2.55, 0.4)],
];
const C = B.C, M0 = B.M;
const K5 = [
  [27.4, v3(0, 18.4, 8.6), v3(0, 18.2, 0)],
  [27.9, v3(0, 18.25, 7.6), v3(0, 18.25, 0.4), "o"],
  [31.4, v3(0.25, 18.3, 7.4), v3(0, 18.25, 0.4)],
  [32.4, v3(0, 18.3, 7.1), v3(0, 18.25, 0.4), "o"],
  [33.3, v3(-0.35, 18.3, 7.25), v3(0, 18.25, 0.4)],
  [33.8, v3(0, 18.05, 7.35), v3(0, 18.05, 1.9), "o"],
  [35.9, v3(0.1, 18.05, 7.15), v3(0, 18.05, 1.9)],
  [36.45, v3(0, 18.2, 6.2), v3(0, 18.05, 0.4)],
];
const K6 = [
  [38.2, v3(M0.x - 0.75, M0.y + 0.05, 4.05), v3(M0.x - 0.75, M0.y + 0.05, 0.2), "o"],
  [39.45, v3(M0.x - 0.72, M0.y + 0.08, 3.95), v3(M0.x - 0.74, M0.y + 0.05, 0.2)],
  [39.75, v3(M0.x + 0.75, M0.y + 0.05, 4.0), v3(M0.x + 0.75, M0.y + 0.05, 0.1), "o"],
  [41.15, v3(M0.x + 0.8, M0.y + 0.1, 3.8), v3(M0.x + 0.75, M0.y + 0.05, 0.1)],
  [41.6, v3(M0.x, M0.y - 0.3, 6.6), v3(M0.x, M0.y - 0.3, 0.3), "o"],
  [42.85, v3(M0.x, M0.y - 0.28, 6.35), v3(M0.x, M0.y - 0.3, 0.3)],
];
// ---------------- final (marché)
const BC = v3(1.25, 8.05, 1.3);
const K7 = [
  [42.85, v3(BRAND_CARD.x, BRAND_CARD.y, 2.5), v3(BRAND_CARD.x, BRAND_CARD.y, -3)],
  [44.1, v3(0, 9.0, 33), v3(0, 8.6, -6), "o"],
  [44.4, v3(0, 9.0, 32), v3(0, 8.6, -6)],
  [45.55, v3(BC.x, BC.y, 6.5), BC.clone(), "x"],
  [46.4, v3(0.2, 7.2, 9.9), v3(0.1, 7.1, 3.2), "io"],
  [47.6, v3(0, 7.0, 9.65), v3(0, 7.0, 3.2), "o"],
  [52.5, v3(0, 7.0, 9.45), v3(0, 7.0, 3.2)],
];
let heroPos = new THREE.Vector3();
function shot(t) {
  let scene = market.scene, bs = 0.7, thr = 1.1;
  if (t < 17.45 || t >= 42.85) {
    if (t < 0.35) { [pos, tgt] = keys(t, K1); pos.add(hand(t * 9, 0.04 * (1 - t / 0.35))); }
    else if (t < 2.2) { const p = ease.inOut(seg(t, 0.35, 2.2)); const st = keys(0.35, K1); const az = p * Math.PI * 2; const el = lerp(0.12, 0.05, p);
      pos.copy(orbit(LC, lerp(3.2, 2.95, p), az, el)).lerp(st[0], 1 - ease.out(seg(t, 0.35, 0.6))); tgt.copy(LC).lerp(st[1], 1 - ease.out(seg(t, 0.35, 0.6))); }
    else if (t < 42.85) { [pos, tgt] = keys(t, K2); }
    else { [pos, tgt] = keys(t, K7); }
    // la lampe dans le tunnel : devant la caméra, puis elle sort du lot et file vers le poste
    if (t >= 9.2 && t < 12.25) {
      const dir = tgt.clone().sub(pos).normalize(); const ahead = pos.clone().addScaledVector(dir, 4.8).add(v3(0.45, -0.75, 0));
      const go = ease.in(seg(t, 11.15, 12.25)); heroPos.copy(ahead).lerp(v3(S.x + 1.1, S.y + 0.45, S.z + 0.35), go);
      if (t < 9.6) heroPos.lerp(v3(0, 2.35, 0.6), 1 - ease.inOut(seg(t, 9.2, 9.6)));
    }
    if (t > 9.4 && t < 11.0) pos.add(v3(Math.sin(t * 7) * 0.05, Math.sin(t * 5) * 0.04, 0));
    market.update(t, { heroPos });
    bs = t < 9 ? 0.45 : t < 12.3 ? 0.8 : 0.6; thr = t < 9 ? 1.25 : 1.05; cam.near = 0.05;
  } else {
    scene = brand.scene; brand.update(t);
    if (t < 24.84) [pos, tgt] = keys(t, K4);
    else if (t < 26.9) { const p = ease.inOut(seg(t, 24.84, 26.9)); const c = v3(0, 2.55, 0.4); pos.copy(orbit(c, lerp(10.4, 10.0, p), lerp(0, -0.55, p), lerp(0.0, 0.08, p))); tgt.copy(c); }
    else if (t < 27.4) { const p = ease.inOut(seg(t, 26.9, 27.4)); const a = orbit(v3(0, 2.55, 0.4), 10.0, -0.55, 0.08); pos.copy(a).lerp(K5[0][1], p); tgt.copy(v3(0, 2.55, 0.4)).lerp(K5[0][2], p); }
    else if (t < 36.45) [pos, tgt] = keys(t, K5);
    else if (t < 38.2) {
      const p = seg(t, 36.45, 37.55); const q = ease.in(seg(t, 37.55, 38.2)); const cc = v3(C.x, C.y, 0.4);
      const o = orbit(cc, lerp(5.8, 3.4, ease.out(p)), lerp(0, Math.PI * 1.15, ease.inOut(p)), 0.08);
      pos.copy(o).lerp(K6[0][1], q); tgt.copy(cc).lerp(K6[0][2], q);
    } else [pos, tgt] = keys(t, K6);
    pos.add(hand(t, 0.012));
    bs = 0.5; thr = 1.3; cam.near = 0.05;
  }
  return { scene, bs, thr };
}
W.render = (t) => {
  const s = shot(t);
  cam.position.copy(pos); cam.lookAt(tgt); cam.updateProjectionMatrix();
  rp.scene = s.scene; bloom.strength = s.bs; bloom.threshold = s.thr;
  composer.render();
};
W.render(0);
W.ready();
