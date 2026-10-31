/* Chef d'orchestre 3D : un seul rendu WebGL, quatre mondes (ville, bureau, plateau du studio, final) et la caméra,
   pilotés par le temps t de la composition (aucune animation libre : chaque image se recalcule depuis t). */
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { seg, ease, lerp, lerpLog, clamp, v3, texReady, bez } from "./lib.js";
import { buildCity, FACADE_Z, KNIFE_Y, VAN_PARK } from "./city.js";
import { buildOffice, SCREEN, HOLO_POS, HOLO_DIR } from "./office.js";
import { buildStage, HUB, TOWER } from "./stage.js";
import { buildEnd } from "./end.js";

const W = window.__w;
const canvas = document.getElementById("cv");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1); renderer.setSize(1080, 1920, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;

await document.fonts.load("700 64px Inter");
const glyphs = await (await fetch("assets/glyphs3m.json")).json();
const city = buildCity({ glyphs });
const office = buildOffice();
const stage = buildStage({ glyphs });
const end = buildEnd();
await texReady();
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
[[city.scene, 0.3], [office.scene, 0.22], [stage.scene, 0.5], [end.scene, 0.25]].forEach(([s, k]) => { s.environment = envTex; s.environmentIntensity = k; });

const cam = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.03, 3000);
const composer = new EffectComposer(renderer);
const rp = new RenderPass(city.scene, cam); composer.addPass(rp);
const bloom = new UnrealBloomPass(new THREE.Vector2(540, 960), 0.6, 0.55, 1.0); composer.addPass(bloom);
composer.addPass(new OutputPass());

const tgt = new THREE.Vector3(), pos = new THREE.Vector3(), tmp = new THREE.Vector3();
const sph = (target, dist, az, el, out = pos) => out.set(target.x + dist * Math.sin(az) * Math.cos(el), target.y + dist * Math.sin(el), target.z + dist * Math.cos(az) * Math.cos(el));
/** Bougé de caméra « à l'épaule », très léger et déterministe. */
const hand = (t, a) => tmp.set(Math.sin(t * 1.7) * 0.6 + Math.sin(t * 3.1) * 0.3, Math.sin(t * 1.3 + 1) * 0.5 + Math.sin(t * 2.7) * 0.2, Math.sin(t * 1.1 + 2) * 0.4).multiplyScalar(a);
/** Clés de caméra (position, cible, focale) interpolées en douceur. */
function keys(t, K) {
  if (t <= K[0][0]) return K[0];
  for (let i = 0; i < K.length - 1; i++) {
    const [a, pa, ta, fa] = K[i], [b, pb, tb, fb] = K[i + 1];
    if (t <= b) { const p = ease.inOut(seg(t, a, b)); return [t, pa.clone().lerp(pb, p), ta.clone().lerp(tb, p), lerp(fa, fb, p)]; }
  }
  return K[K.length - 1];
}

// ------------------------------------------------------------------ plateau du studio : clés
const HUBC = v3(HUB.x, HUB.y, HUB.z);
const SY = stage.Y1;
const HERO_Y = SY.hero;
const MOD_C = ((SY.presta - stage.slabs.presta.userData.h / 2) + (SY.hero + stage.slabs.hero.userData.h / 2)) / 2;
const SK = [
  [21.9, v3(HUBC.x, HUBC.y, HUB.z + 8.44), HUBC.clone(), 40],
  [23.0, v3(0, 3.6, 13.5), v3(0, 3.4, 0), 40],
  [24.2, v3(0, 3.3, 10.2), v3(0, 3.1, 2.4), 38],
  [25.15, v3(-2.6, 3.8, 11.5), v3(-5.6, 1.8, 0), 38],
  [25.9, v3(-0.8, 4.6, 13.8), v3(-6.3, 1.4, 0), 38],
  [26.7, v3(1.9, 3.3, 11.6), v3(1.9, 2.8, -0.6), 40],
  [27.85, v3(4.15, 1.45, 5.3), v3(3.6, 1.0, 0.8), 40],
  [28.5, v3(TOWER.x, 1.8, TOWER.z + 9.2), v3(TOWER.x, 2.2, TOWER.z), 40],
  [31.45, v3(TOWER.x, 20.4, TOWER.z + 9.2), v3(TOWER.x, 20.5, TOWER.z), 40],
  [32.35, v3(TOWER.x - 1.2, 13.5, TOWER.z + 16.5), v3(TOWER.x - 0.3, 11.5, TOWER.z), 40],
  [33.3, v3(0, 3.45, 14.6), v3(0, 3.3, 2.6), 40],
  [35.25, v3(0.15, 3.5, 14.3), v3(0, 3.3, 2.6), 40],
  [35.85, v3(0, 6.1, 9.2), v3(0, 2.75, 2.4), 40],
  [37.1, v3(0.15, 6.0, 9.0), v3(0, 2.75, 2.4), 40],
  [37.65, v3(TOWER.x - 0.4, HERO_Y + 0.3, TOWER.z + 9), v3(TOWER.x, HERO_Y + 0.1, TOWER.z), 40],
  [38.3, v3(TOWER.x - 0.3, HERO_Y + 0.35, TOWER.z + 8.4), v3(TOWER.x, HERO_Y + 0.15, TOWER.z), 40],
  [38.95, v3(HUBC.x, HUBC.y, HUB.z + 11.2), HUBC.clone(), 40],
  [39.75, v3(HUBC.x, HUBC.y + 0.05, HUB.z + 11.0), HUBC.clone(), 40],
  [40.2, v3(TOWER.x, MOD_C, TOWER.z + 18.5), v3(TOWER.x, MOD_C, TOWER.z), 40],
  [41.2, v3(TOWER.x - 0.3, MOD_C + 0.2, TOWER.z + 17.8), v3(TOWER.x, MOD_C, TOWER.z), 40],
  [41.75, v3(HUBC.x, HUBC.y, HUB.z + 11.2), HUBC.clone(), 40],
  [42.6, v3(HUBC.x, HUBC.y + 0.05, HUB.z + 11.0), HUBC.clone(), 40],
  [43.05, v3(1, 9, 24), v3(0, 5, -8), 46],
];
const END_K = [[52.3, v3(0, 1.6, 10.5), v3(0, 1.45, 0), 34], [58, v3(0, 1.7, 8.8), v3(0, 1.55, 0), 34]];

function shot(t) {
  let scene = city.scene, fov = 40, bloomS = 0.55, thr = 1.0, exp = 1.0, fog = null;
  if (t < 8.6) {
    // ---------------- ville : macro → recul → plongée dans le toit du camion
    const kp = ease.inOut(seg(t, 0, 2.2)); const kx = lerp(-1.15, 0.55, kp);
    const K = v3(kx, KNIFE_Y, FACADE_Z);
    const pb = ease.inOut(seg(t, 1.55, 5.3));
    const cityT = v3(3, 0, -4);
    let d, az, el;
    if (t < 7.1) {
      d = lerpLog(1.0, 250, pb) * lerp(1, 0.9, seg(t, 5.3, 7.1));
      az = lerp(0.38, 0.62, ease.inOut(seg(pb, 0, 0.8))) + seg(t, 5.3, 7.1) * 0.1;
      el = lerp(0.26, 0.74, ease.inOut(seg(pb, 0.05, 1)));
      tgt.copy(K).lerp(cityT, ease.inOut(seg(pb, 0.12, 0.85)));
      tgt.x += lerp(-0.13, 0, ease.inOut(seg(pb, 0, 0.5))); tgt.y += lerp(-0.01, 0, pb);
    } else {
      const q = seg(t, 7.1, 8.6); const qe = ease.in(q);
      d = lerpLog(225, 0.5, ease.inOut(q)); az = lerp(0.72, 0.9, q); el = lerp(0.74, 1.45, ease.inOut(q));
      tgt.copy(cityT).lerp(tmp.copy(VAN_PARK).add(v3(-0.55, 2.45, 0)), ease.inOut(seg(q, 0, 0.8))); void qe;
    }
    sph(tgt, d, az, el); pos.add(hand(t, 0.002 * Math.min(d, 30)));
    fov = lerp(36, 30, pb); bloomS = lerp(0.2, 0.7, seg(t, 2.5, 4.5)); thr = lerp(3.0, 1.15, seg(t, 2.5, 4.5));
    city.update(t, tgt, d);
    cam.near = clamp(d * 0.02, 0.01, 2);
  } else if (t < 21.9) {
    // ---------------- bureau
    scene = office.scene; office.update(t);
    const C = v3(0, 1.45, 0.1);
    if (t < 9.75) {
      const p = ease.inOut(seg(t, 8.6, 9.75));
      const a = v3(0.3, 4.6, 0.7), c = v3(2.8, 4.2, -2.2), b = sph(C, 4.0, 2.45, 0.24, v3());
      bez(a, c, b, p, pos); tgt.copy(v3(0, 1.0, -0.5)).lerp(C, p);
    } else if (t < 18.45) {
      const p = seg(t, 9.75, 16.6), q = seg(t, 16.6, 18.45);
      const az = lerp(2.45, 2.05, ease.inOut(p)) - ease.inOut(q) * 0.1; const r = lerp(4.0, 3.4, ease.inOut(p)) - q * 0.1; const el = lerp(0.24, 0.33, p);
      sph(C, r, az, el); tgt.copy(C);
      const shake = seg(t, 13.5, 16.6) * (1 - seg(t, 16.6, 16.75));
      pos.add(hand(t * 3.2, 0.012 * shake)).add(hand(t, 0.01));
    } else {
      // fenêtre flottante : cadrage de la carte de conversation, puis plein écran (raccord avec le plateau)
      const from = sph(C, 3.3, 1.95, 0.33, v3());
      const ctr = HOLO_POS.clone();
      const dA = 2.95, dB = 2.7, dC = 2.11;
      let d = dA; if (t > 19.4) d = lerp(dA, dB, ease.inOut(seg(t, 19.4, 20.4))); if (t > 21.2) d = lerp(dB, dA, ease.inOut(seg(t, 21.2, 21.5))); if (t > 21.55) d = lerp(dA, dC, ease.inOut(seg(t, 21.55, 21.9)));
      const yOff = 0;
      const to = v3(ctr.x, ctr.y + yOff, ctr.z).addScaledVector(HOLO_DIR, d);
      const p = ease.inOut(seg(t, 18.45, 19.3));
      pos.copy(from).lerp(to, p); tgt.copy(C).lerp(v3(ctr.x, ctr.y + yOff, ctr.z), p);
    }
    fov = 40; bloomS = 0.4; thr = 1.6; cam.near = 0.03;
  } else if (t < 43.05) {
    // ---------------- plateau du studio
    scene = stage.scene; stage.update(t);
    const [, p, tg, f] = keys(t, SK); pos.copy(p); tgt.copy(tg); fov = f;
    pos.add(hand(t, 0.03));
    bloomS = 0.3; thr = 2.2; cam.near = 0.05;
  } else if (t < 52.35) {
    // ---------------- retour en ville, crépuscule
    scene = city.scene;
    const vx = lerp(-78, VAN_PARK.x, ease.out(seg(t, 43, 48.6)));
    const van = v3(vx, 0, VAN_PARK.z);
    const A = { p: sph(v3(-25, 0, -10), 170, 0.5, 0.78, v3()), t: v3(-25, 0, -10) };
    const B = { p: van.clone().add(v3(5, 12.5, 9.0)), t: van.clone().add(v3(0, 1.2, 0)) };
    const Cc = { p: van.clone().add(v3(-4, 11.5, 5.2)), t: van.clone().add(v3(0, 1.4, 0)) };
    const C1 = { p: v3(VAN_PARK.x - 2, 16, VAN_PARK.z + 5.5), t: v3(-3, 12, -12) };
    const D = { p: v3(0.5, 18, 38), t: v3(-0.5, 21, -9) };
    const E = { p: v3(1, 24, 46), t: v3(-0.3, 26.5, -10) };
    const F = { p: v3(1.5, 43, 26), t: v3(0, 45.5, -12) };
    const G = { p: v3(0, 46.2, -12 + 2.4), t: v3(0, 46, -12) };
    const seq = [[43, A], [44.7, B], [46.6, Cc], [47.3, C1], [48.2, D], [49.6, E], [51.0, F], [52.35, G]];
    let i = 0; while (i < seq.length - 2 && t > seq[i + 1][0]) i++;
    const [ta, a] = seq[i], [tb, b] = seq[i + 1];
    let p = ease.inOut(seg(t, ta, tb)); if (i === seq.length - 2) p = ease.in(seg(t, ta, tb));
    pos.copy(a.p).lerp(b.p, p); tgt.copy(a.t).lerp(b.t, p);
    pos.add(hand(t, 0.06));
    city.update(t, tgt, pos.distanceTo(tgt));
    fov = lerp(34, 40, seg(t, 44, 46)); bloomS = 0.8; thr = 1.45; cam.near = 0.1;
  } else {
    // ---------------- final
    scene = end.scene; end.update(t);
    const [, p, tg, f] = keys(t, END_K); pos.copy(p); tgt.copy(tg); fov = f; bloomS = 0.8; thr = 1.3; cam.near = 0.05;
  }
  void fog; void exp;
  return { scene, fov, bloomS, thr };
}

W.render = (t) => {
  const s = shot(t);
  cam.fov = s.fov; cam.position.copy(pos); cam.lookAt(tgt); cam.updateProjectionMatrix();
  rp.scene = s.scene; bloom.strength = s.bloomS; bloom.threshold = s.thr;
  composer.render();
};
W.render(0);
W.ready();
