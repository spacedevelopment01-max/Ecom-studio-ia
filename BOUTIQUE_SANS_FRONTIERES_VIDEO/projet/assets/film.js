/* Publicité 02 « La boutique sans frontières » : un rendu WebGL, deux mondes (la rue / l'espace de création) et la
   caméra, pilotés par le temps t de la composition (chaque image se recalcule depuis t, rien n'est libre). */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { seg, ease, lerp, clamp, v3, texReady, bez } from "./lib.js";
import { buildStreet, COUNTER } from "./street.js";
import { buildCreate, L } from "./create.js";

const W = window.__w;
const canvas = document.getElementById("cv");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1); renderer.setSize(1080, 1920, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;

await document.fonts.load("700 64px Inter");
const TM = await (await fetch("assets/timemap.json")).json();
/** Temps du film (version longue, calée sur la voix) → temps des scènes 3D. */
const toOld = (tn) => { const A = TM.anchors; for (let i = 0; i < A.length - 1; i++) { const [a0, b0] = A[i], [a1, b1] = A[i + 1]; if (tn <= b1) return a0 + (tn - b0) * (a1 - a0) / (b1 - b0); } return A[A.length - 1][0]; };
const street = buildStreet();
const create = buildCreate();
await texReady();
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
[[street.scene, 0.35], [create.scene, 0.3]].forEach(([s, k]) => { s.environment = envTex; s.environmentIntensity = k; });

const cam = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.03, 3000);
const composer = new EffectComposer(renderer);
const rp = new RenderPass(street.scene, cam); composer.addPass(rp);
const bloom = new UnrealBloomPass(new THREE.Vector2(540, 960), 0.6, 0.55, 1.0); composer.addPass(bloom);
composer.addPass(new OutputPass());

const pos = new THREE.Vector3(), tgt = new THREE.Vector3(), tmp = new THREE.Vector3();
const hand = (t, a) => tmp.set(Math.sin(t * 1.7) * 0.6 + Math.sin(t * 3.1) * 0.3, Math.sin(t * 1.3 + 1) * 0.5 + Math.sin(t * 2.7) * 0.2, Math.sin(t * 1.1 + 2) * 0.4).multiplyScalar(a);
function keys(t, K) {
  if (t <= K[0][0]) return K[0];
  for (let i = 0; i < K.length - 1; i++) { const [a, pa, ta, fa] = K[i], [b, pb, tb, fb] = K[i + 1]; if (t <= b) { const p = ease.inOut(seg(t, a, b)); return [t, pa.clone().lerp(pb, p), ta.clone().lerp(tb, p), lerp(fa, fb, p)]; } }
  return K[K.length - 1];
}
const C = street.C, SCR = street.scr, HOLO = street.HOLO;
// ---------------- rue : soir (0–23,3 s)
const K1 = [
  [0.0, v3(0, 34, 40), v3(0, 9, 0), 40],
  [2.6, v3(0.4, 7.8, 31.5), v3(0, 9.3, 0), 40],
  [3.25, v3(2.1, 2.35, 7.0), v3(2.4, 2.0, 0), 40],
  [4.55, v3(2.25, 2.3, 6.5), v3(2.45, 2.0, 0), 40],
  [5.5, v3(-1.6, 7.6, 31.5), v3(0, 9.3, 0), 40],
  [7.9, v3(5.5, 7.4, 31.2), v3(0, 9.3, 0), 40],
  [8.9, v3(-26, 13, 8.6), v3(4, 7.5, 7.6), 46],
  [10.35, v3(-19, 11.5, 8.4), v3(8, 6.5, 7.4), 46],
  [11.08, v3(0.6, 2.3, 2.0), v3(0.6, 2.1, -2), 46],
  [11.4, v3(0.4, 2.5, -0.5), v3(-1.2, 1.7, -4.5), 50],
  [12.6, v3(0.3, 2.6, -0.65), v3(-1.4, 1.85, -5.05), 50],
  [14.6, v3(-0.7, 2.7, -0.7), v3(-1.4, 1.95, -5.05), 50],
  [16.3, v3(-3.6, 2.8, -2.3), v3(-1.4, 1.9, -5.05), 50],
  [17.25, v3(-3.4, 3.1, -3.6), v3(-1.4, 1.7, -5.05), 50],
  [17.6, v3(-2.9, 3.3, -6.9), v3(-1.2, 1.6, -4.6), 48],
  [17.95, v3(0.4, 2.65, -6.9), v3(SCR.x, SCR.y, SCR.z), 46],
  [19.1, v3(0.35, 2.4, -6.6), v3(SCR.x, SCR.y + 0.1, SCR.z), 44],
  [20.6, v3(HOLO.x, HOLO.y, HOLO.z - 2.25), HOLO.clone(), 40],
  [22.7, v3(HOLO.x, HOLO.y + 0.02, HOLO.z - 2.2), HOLO.clone(), 40],
  [23.3, v3(SCR.x, SCR.y + 0.05, SCR.z - 0.32), v3(SCR.x, SCR.y + 0.05, SCR.z + 0.5), 40],
];
// ---------------- rue : nuit (46,2–53,2 s) — le téléphone au premier plan, la boutique entière derrière
const PH = v3(0.79, 3.73, 35.48); // à droite, devant l'immeuble voisin : le téléphone entier, la boutique entière à gauche // 4,6 m devant la caméra, dans le tiers bas : le téléphone entier, la boutique entière au-dessus
const CAM6 = v3(0, 4.0, 40), TGT6 = v3(2.0, 6.0, 0);
const K6 = [
  [46.2, v3(0, 24, 50), v3(2.0, 9, 0), 40],
  [48.0, CAM6.clone(), TGT6.clone(), 40],
];
// ---------------- espace de création (23,3–46,2 s puis 53,2–60 s)
const K4 = [
  [23.3, v3(0, 2.4, 6.0), v3(0, 1.8, 0), 40],
  [24.3, v3(0, 3.6, 12.2), v3(0, 3.4, 0), 40],
  [26.2, v3(0.3, 3.8, 12.4), v3(0, 3.5, 0), 40],
  [27.6, v3(0, 3.85, 11.8), v3(0, 3.75, 0.6), 40],
  [29.4, v3(-0.4, 4.0, 12.0), v3(0, 3.9, 0), 40],
  [31.2, v3(0, 3.9, 12.6), v3(0, 3.7, 0), 40],
];
const K5 = [
  [35.25, v3(4.9, 4.2, 11.9), v3(1.2, 3.6, 0), 40],
  [36.3, v3(L.S.x, 3.4, 10.4), v3(L.S.x, 3.3, 0.3), 40],
  [37.6, v3(L.S.x + 0.1, 3.45, 10.3), v3(L.S.x, 3.3, 0.3), 40],
  [38.2, v3(L.AD.x, 2.9, 6.7), v3(L.AD.x, 2.7, 0.2), 40],
  [38.85, v3(L.AD.x, 2.95, 6.6), v3(L.AD.x, 2.7, 0.2), 40],
  [39.4, v3(L.CAL.x, 3.3, 6.4), v3(L.CAL.x, 3.3, -0.6), 40],
  [39.95, v3(L.CAL.x, 3.3, 6.3), v3(L.CAL.x, 3.3, -0.6), 40],
  [40.65, v3(L.SY.x, 3.2, 5.0), v3(L.SY.x, 3.2, 0.3), 40],
  [41.25, v3(L.SY.x, 3.22, 4.95), v3(L.SY.x, 3.2, 0.3), 40],
  [41.8, v3(L.S.x, 3.4, 10.4), v3(L.S.x, 3.3, 0.3), 40],
  [43.35, v3(L.S.x + 0.1, 3.4, 10.3), v3(L.S.x, 3.3, 0.3), 40],
  [44.0, v3(L.SY.x, 3.2, 5.0), v3(L.SY.x, 3.2, 0.3), 40],
  [46.2, v3(L.SY.x, 3.25, 4.85), v3(L.SY.x, 3.2, 0.3), 40],
];
const E0 = L.END;
const K7 = [
  [53.2, v3(E0.x, 2.6, E0.z + 9.5), v3(E0.x, 2.3, E0.z), 40],
  [55.0, v3(E0.x, 2.2, E0.z + 13.0), v3(E0.x, 2.0, E0.z), 40],
  [56.2, v3(E0.x, 2.05, E0.z + 8.6), v3(E0.x, 1.9, E0.z), 40],
  [60.0, v3(E0.x, 2.0, E0.z + 8.2), v3(E0.x, 1.9, E0.z), 40],
];

function shot(t) {
  let scene = street.scene, fov = 40, bs = 0.5, thr = 1.2;
  if (t < 23.3 || (t >= 46.2 && t < 53.2)) {
    street.update(t);
    const K = t < 23.3 ? K1 : K6; const [, p, g, f] = keys(t, K); pos.copy(p); tgt.copy(g); fov = f;
    if (t >= 48.0 && t < 53.2) {
      // la caméra tourne autour du téléphone (le téléphone reste à sa place dans l'image), puis s'élève doucement
      const az = lerp(-0.09, 0.09, ease.inOut(seg(t, 48.0, 51.6))); const rise = ease.inOut(seg(t, 51.4, 53.2)) * 1.1;
      const rot = (v) => { const d = v.clone().sub(PH); const c = Math.cos(az), sn = Math.sin(az); return v3(PH.x + d.x * c + d.z * sn, PH.y + d.y, PH.z - d.x * sn + d.z * c); };
      pos.copy(rot(CAM6)); tgt.copy(rot(TGT6)); pos.y += rise; tgt.y += rise * 0.6;
      const bp = street.bigPhone; const ap = ease.back(seg(t, 48.1, 48.7));
      bp.visible = true; bp.scale.setScalar(0.5 * Math.max(0.001, ap)); bp.position.copy(PH); bp.position.y += Math.sin(t * 1.2) * 0.015; bp.lookAt(pos.x, pos.y, pos.z);
      street.bigGlow.position.copy(PH).add(v3(0, 0, -0.2)); street.bigGlow.material.opacity = 0.35 * ap; street.bigGlow.scale.setScalar(1.8);
    } else { street.bigPhone.visible = false; street.bigGlow.material.opacity = 0; }
    pos.add(hand(t, t > 11.4 && t < 23 ? 0.008 : 0.04));
    bs = t > 30 ? 0.75 : 0.55; thr = t > 11.2 && t < 23.3 ? 1.6 : 1.15;
    cam.near = t > 11.2 && t < 23.3 ? 0.03 : 0.1;
  } else {
    scene = create.scene; create.update(t);
    if (t < 31.2) { const [, p, g, f] = keys(t, K4); pos.copy(p); tgt.copy(g); fov = f; }
    else if (t < 35.25) { // travelling orbital autour du site déployé
      const q = ease.inOut(seg(t, 31.2, 35.25)); const az = lerp(0, 0.62, q); const el = lerp(0.02, 0.14, q); const r = lerp(12.6, 13.2, q);
      tgt.set(0, 3.7, 0); pos.set(Math.sin(az) * Math.cos(el) * r, 3.7 + Math.sin(el) * r, Math.cos(az) * Math.cos(el) * r);
    } else if (t < 46.2) { const [, p, g, f] = keys(t, K5); pos.copy(p); tgt.copy(g); fov = f; }
    else { const [, p, g, f] = keys(t, K7); pos.copy(p); tgt.copy(g); fov = f; }
    pos.add(hand(t, 0.02));
    bs = 0.7; thr = 1.25; cam.near = 0.05;
  }
  return { scene, fov, bs, thr };
}
W.render = (tn) => {
  const t = toOld(tn);
  const s = shot(t);
  cam.fov = s.fov; cam.position.copy(pos); cam.lookAt(tgt); cam.updateProjectionMatrix();
  rp.scene = s.scene; bloom.strength = s.bs; bloom.threshold = s.thr;
  composer.render();
};
W.render(0);
W.ready();
