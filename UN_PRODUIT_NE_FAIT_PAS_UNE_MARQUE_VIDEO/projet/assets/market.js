/* Scène « marché » : le carton qui s'ouvre, la lampe, le mur de centaines de lampes identiques et de boutiques
   identiques, les publicités génériques, le tunnel de boutiques, la sortie du lot, l'ordinateur avec E-COM STUDIO ia,
   les outils qui convergent, SYNA (vraie interface, version mobile), puis le retour final et la marque KELVO qui se
   distingue. Toutes les animations sont fonction du temps t du film. */
import * as THREE from "three";
import { std, basic, rbox, rng, canvasTex, card, setCardMap, tex, seg, ease, lerp, clamp, bez, glow, v3 } from "./lib.js";
import { makeLaptop, makeLogoE, STUDIO } from "./actors.js";
import { makeLamp, lampLite, makeBox, makePack, KELVO } from "./lamp.js";

export const WALL = { cols: [-10.4, -9.1, -7.8, -6.5, -5.2, -3.9, -2.6, -1.3, 1.3, 2.6, 3.9, 5.2, 6.5, 7.8, 9.1, 10.4], rows: [1.3, 3.7, 6.1, 8.5, 10.9, 13.3, 15.7], layers: [-3, -7, -11] };
export const STATION = v3(0, 1.0, -106); // dessus du socle de l'ordinateur
export const BRAND_CARD = v3(2.6, 8.5, -3); // la boutique qui deviendra KELVO
export const FINAL = { laptop: v3(0, 6.1, 3.2), logo: v3(0, 8.45, 3.2) };

export function buildMarket() {
  const scene = new THREE.Scene(); const R = rng(31);
  scene.background = new THREE.Color("#060912"); scene.fog = new THREE.Fog("#060912", 18, 60);
  const hemi = new THREE.HemisphereLight("#7C93D6", "#0A0D18", 0.7); scene.add(hemi);
  const key = new THREE.SpotLight("#FFF1DE", 55, 30, 0.55, 0.6, 1.4); key.position.set(-3, 9, 7); key.target.position.set(0, 1.5, 0); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key, key.target);
  const rimB = new THREE.PointLight("#3D6EF0", 40, 18, 1.6); rimB.position.set(3, 3, -3); scene.add(rimB);
  // sol sombre brillant + grille
  const gridT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#0A0E1A"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(90,120,220,.22)"; g.lineWidth = 2; for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }, [60, 60]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), std("#ffffff", { map: gridT, roughness: 0.55, metalness: 0.35 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // ---------------- carton et lampe
  const box = makeBox(); box.position.set(0, 0, 0); scene.add(box);
  const lamp = makeLamp(); scene.add(lamp);
  const lampGlow = glow(KELVO.ambre, 2.4, 0); scene.add(lampGlow);
  const burst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFD9A0").multiplyScalar(2) }), 60); scene.add(burst);
  const burstDir = Array.from({ length: 60 }, () => v3(R() - 0.5, R() * 0.9 + 0.3, R() - 0.5).normalize().multiplyScalar(2 + R() * 3));

  // ---------------- mur de lampes identiques + boutiques identiques (instanciés)
  const L = lampLite(); const slots = [];
  WALL.layers.forEach((z, li) => WALL.rows.forEach((y) => WALL.cols.forEach((x) => slots.push({ x, y, z, li, d: Math.hypot(x, y - 2.3, (z - 0) * 0.6) }))));
  const N = slots.length;
  const wBody = new THREE.InstancedMesh(L.body, L.bodyM, N), wRing = new THREE.InstancedMesh(L.ring, L.ringM, N);
  const shopMat = new THREE.MeshBasicMaterial({ map: tex("ui-g-shop-a.png"), color: "#ffffff" });
  const shops = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.0, 2.09), shopMat, N);
  shops.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3).fill(1), 3);
  scene.add(wBody, wRing, shops);
  const ads = []; for (let i = 0; i < 44; i++) { const s = slots[Math.floor(R() * N)]; if (s.li !== 0) { i--; continue; } ads.push({ x: s.x + (R() - 0.5) * 0.9, y: s.y + 0.8 * (R() - 0.5), z: 0.9 + R() * 1.4, rz: (R() - 0.5) * 0.3, d: R() }); }
  const adMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.8, 1.42), new THREE.MeshBasicMaterial({ map: tex("ui-g-ad.png") }), ads.length); scene.add(adMesh);
  // la boutique qui devient KELVO (final)
  const brandCard = card(tex("ui-k-shop-card.png"), 1.0, 2.09, { depth: 0.04, radius: 0.08, side: "#1B1D21" }); scene.add(brandCard);
  const brandGlow = glow(KELVO.ambre, 5, 0); scene.add(brandGlow);

  // ---------------- tunnel de boutiques
  const tun = []; for (let z = -16; z > -100; z -= 1.1) { [-1, 1].forEach((sd) => [1.15, 3.35, 5.55].forEach((y) => tun.push({ p: v3(sd * 2.6, y, z), r: new THREE.Euler(0, -sd * Math.PI / 2, 0) }))); [-1.15, 0, 1.15].forEach((x) => tun.push({ p: v3(x, 6.75, z), r: new THREE.Euler(Math.PI / 2, 0, 0) })); }
  const tunMat = new THREE.MeshBasicMaterial({ map: tex("ui-g-shop-b.png"), color: "#ffffff" });
  const tunnel = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.0, 2.09), tunMat, tun.length);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3(), C = new THREE.Color();
  tun.forEach((c, i) => tunnel.setMatrixAt(i, M.compose(c.p, Q.setFromEuler(c.r), S.set(1, 1, 1))));
  scene.add(tunnel);
  const tunLights = [-30, -55, -80].map((z) => { const l = new THREE.PointLight("#9DB4FF", 14, 22, 1.5); l.position.set(0, 3.5, z); scene.add(l); return l; });

  // ---------------- poste : socle, ordinateur, outils, SYNA
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 1.0, 64), std("#11151F", { roughness: 0.3, metalness: 0.6 })); plinth.position.set(STATION.x, 0.5, STATION.z); plinth.receiveShadow = true; scene.add(plinth);
  const plRing = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.02, 8, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color("#5B8CFF").multiplyScalar(1.6) })); plRing.rotation.x = Math.PI / 2; plRing.position.set(STATION.x, 1.0, STATION.z); scene.add(plRing);
  const laptop = makeLaptop(tex("ui-screen-logo.png"), { w: 1.6, h: 1.0 }); laptop.position.set(STATION.x, STATION.y, STATION.z - 0.15); scene.add(laptop);
  const stLight = new THREE.PointLight("#9DB4FF", 10, 8, 1.6); stLight.position.set(0, 3, STATION.z + 2.5); scene.add(stLight);
  const wave = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 10, 96), new THREE.MeshBasicMaterial({ color: "#5B8CFF", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); scene.add(wave);
  const blue = new THREE.PointLight(STUDIO.signal2, 0, 12, 1.5); scene.add(blue);
  const toolNames = ["site", "design", "produits", "ads", "social", "cal", "seo"];
  const tools = toolNames.map((n, i) => { const c = card(tex("ui-tool-" + n + ".png"), 0.66, 0.48, { depth: 0.04, radius: 0.05 }); scene.add(c); const a = (i / toolNames.length) * Math.PI * 2; return { c, from: v3(STATION.x + 0.25 + Math.cos(a) * 1.2, 2.45 + Math.sin(a) * 1.15, STATION.z + 0.9 + Math.sin(a * 2) * 0.4), i }; });
  const syna = card(tex("ui-m-entree-0.png"), 0.86, 1.8, { depth: 0.025, radius: 0.07, side: "#1B1D21" }); scene.add(syna);
  const synaTex = { e: [0, 1, 2, 3, 4, 5].map((i) => tex(`ui-m-entree-${i}.png`)), sent: tex("ui-m-entree-sent.png") };
  const lapTex = { logo: tex("ui-screen-logo.png"), entree: tex("ui-d-entree.png"), boutique: tex("ui-d-boutique-v2.png") };

  // ---------------- final : ordinateur avec le vrai studio, éléments KELVO qui convergent, logo E-COM STUDIO ia
  const fLaptop = makeLaptop(tex("ui-d-boutique-v2.png"), { w: 1.6, h: 1.0 }); fLaptop.position.copy(FINAL.laptop); fLaptop.rotation.x = 0.12; scene.add(fLaptop);
  const fGlow = glow("#5B8CFF", 6, 0); fGlow.position.copy(FINAL.laptop).add(v3(0, 0.6, -0.4)); scene.add(fGlow);
  const E = makeLogoE(); E.root.scale.setScalar(0.42); scene.add(E.root);
  // vrai logo : carré encre profond (sans reflet qui le grise), « E » blanc franc, point bleu lumineux
  E.plate.material = new THREE.MeshBasicMaterial({ color: "#0A1024" });
  const plateEdge = new THREE.Mesh(E.plate.geometry, new THREE.MeshBasicMaterial({ color: "#3D6EF0", wireframe: false, transparent: true, opacity: 0.0 })); void plateEdge;
  E.e.material = new THREE.MeshBasicMaterial({ color: "#F4F6FB" });
  const pack = makePack({ front: tex("ui-pack-front.png"), back: tex("ui-pack-back.png"), side: tex("ui-pack-side.png"), top: tex("ui-pack-top.png"), bottom: tex("ui-pack-bottom.png") }); pack.scale.setScalar(0.55); scene.add(pack);
  const conv = [card(tex("ui-k-post-1.png"), 0.8, 0.8, { depth: 0.03 }), card(tex("ui-k-ad-1.png"), 0.6, 1.07, { depth: 0.03 }), card(tex("ui-k-post-2.png"), 0.8, 0.8, { depth: 0.03 }), card(tex("ui-k-desk-v2.png"), 1.2, 0.75, { depth: 0.03 })];
  conv.forEach((c) => scene.add(c));
  const convFrom = [v3(-0.75, 8.85, 3.6), v3(0.75, 8.75, 3.6), v3(-0.8, 7.95, 3.8), v3(0.8, 7.75, 3.8)];

  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const show = (o, p) => { o.visible = p > 0.002; o.scale.setScalar(Math.max(0.001, p)); };

  /** heroPos : position voulue de la lampe (donnée par la caméra pendant le tunnel). */
  function update(t, { heroPos, camPos } = {}) {
    const fin = t >= 42.8;
    // carton
    box.visible = t < 9.0; box.userData.open(ease.outExpo(seg(t, 0.02, 0.32)));
    box.position.y = -Math.sin(seg(t, 0.0, 0.12) * Math.PI) * 0.04;
    // gerbe d'étincelles
    burst.visible = t > 0.05 && t < 1.2;
    burstDir.forEach((d, i) => { const p = seg(t, 0.08, 1.1); P.copy(d).multiplyScalar(ease.out(p)).add(v3(0, 1.0 - 4 * p * p, 0)); burst.setMatrixAt(i, M.compose(P, Q.identity(), S.setScalar(1 - p))); });
    burst.instanceMatrix.needsUpdate = true;
    // lampe : jaillit en tournant, pose, avance dans l'allée et le tunnel, arrive au poste
    const jump = ease.out(seg(t, 0.08, 0.7));
    lamp.userData.setLit(t < 11.0 ? 0.55 + 0.35 * jump : t < 17.5 ? 1.8 : 0.9);
    if (t < 9.2) {
      lamp.position.set(0, lerp(0.55, 2.35, jump) + Math.sin(t * 2.2) * 0.04 * seg(t, 1, 2), lerp(0, 0.6, jump));
      const spin = t < 2.2 ? ease.out(seg(t, 0.08, 2.2)) * Math.PI * 6 : Math.PI * 6 + Math.sin((t - 2.2) * 1.4) * 0.25;
      lamp.rotation.set(Math.sin(t * 3) * 0.08 * (1 - seg(t, 1.6, 2.2)), spin, Math.sin(t * 2.4) * 0.12 * (1 - seg(t, 1.6, 2.2)));
      lamp.scale.setScalar(1);
    } else if (t < 12.25 && heroPos) { lamp.position.copy(heroPos); lamp.rotation.set(0.1, Math.sin(t * 3) * 0.3, 0.1); }
    else if (t < 17.5) { const a = ease.out(seg(t, 12.2, 12.6)); lamp.position.set(STATION.x + 0.98, STATION.y + 0.45 + Math.sin(t * 2) * 0.04, STATION.z + 0.1); lamp.rotation.set(0, -0.5 + Math.sin(t) * 0.1, 0); lamp.scale.setScalar(lerp(1, 0.75, a)); }
    lamp.visible = t < 17.5;
    lampGlow.position.copy(lamp.position).add(v3(0, 0, 0.3)); lampGlow.material.opacity = t > 10.95 && t < 17.5 ? 0.85 * Math.max(0, 1 - Math.abs(t - 11.2) / 1.2) + 0.35 : 0.0;
    // mur : duplication en onde, boutiques, publicités, assombrissement ; final : la boutique KELVO se distingue
    const brandP = ease.inOut(seg(t, 44.2, 44.9));
    slots.forEach((s, i) => {
      const a = 3.05 + s.d * 0.09 + s.li * 0.25; let pl = fin ? 1 : ease.back(seg(t, a, a + 0.35));
      const ca = 6.55 + s.d * 0.035 + s.li * 0.12; const pc = fin ? 1 : ease.out(seg(t, ca, ca + 0.3));
      const lampS = lerp(1.55, 0.5, pc) * pl;
      const isBrand = Math.abs(s.x - BRAND_CARD.x) < 0.01 && Math.abs(s.y - BRAND_CARD.y) < 0.01 && s.z === BRAND_CARD.z;
      const hide = t > 9.0 && t < 42.8;
      P.set(s.x, s.y - 0.35 * pc, s.z + 0.35 + 0.3 * (1 - pc)); wBody.setMatrixAt(i, M.compose(P, Q.identity(), S.setScalar(hide || (isBrand && brandP > 0.01) ? 0.0001 : Math.max(0.0001, lampS))));
      wRing.setMatrixAt(i, M.compose(P, Q.identity(), S.setScalar(hide || (isBrand && brandP > 0.01) ? 0.0001 : Math.max(0.0001, lampS))));
      P.set(s.x, s.y, s.z); shops.setMatrixAt(i, M.compose(P, Q.identity(), S.set(Math.max(0.0001, pc), Math.max(0.0001, pc), 1).multiplyScalar(hide || (isBrand && brandP > 0.01) ? 0.0001 : 1)));
      // « mêmes photos » : un éclair parcourt les boutiques ; final : tout s'assombrit sauf KELVO
      const flash = Math.max(0, 1 - Math.abs(t - (7.55 + s.x * 0.02 + s.y * 0.015)) / 0.18) * 0.6;
      const dim = fin ? lerp(1, 0.3, brandP) * lerp(1, 0.3, ease.inOut(seg(t, 45.8, 46.6))) : 1;
      shops.setColorAt(i, C.setScalar((1 + flash) * dim));
    });
    wBody.instanceMatrix.needsUpdate = wRing.instanceMatrix.needsUpdate = shops.instanceMatrix.needsUpdate = true; shops.instanceColor.needsUpdate = true;
    L.ringM.color.set("#FFC27A").multiplyScalar(fin ? lerp(1.2, 0.3, brandP) * lerp(1, 0.5, ease.inOut(seg(t, 45.8, 46.6))) : 1.2);
    ads.forEach((a, i) => { const p = fin ? 0 : ease.back(seg(t, 8.25 + a.d * 0.45, 8.6 + a.d * 0.45)) * (1 - seg(t, 9.05, 9.3)); P.set(a.x, a.y, a.z); adMesh.setMatrixAt(i, M.compose(P, Q.setFromEuler(new THREE.Euler(0, 0, a.rz)), S.setScalar(Math.max(0.0001, p)))); });
    adMesh.instanceMatrix.needsUpdate = true;
    // tunnel : visible pendant la course ; « il faut sortir du lot » : les boutiques s'éteignent
    tunnel.visible = t > 8.9 && t < 12.6; const tdim = 1 - 0.75 * ease.inOut(seg(t, 10.95, 11.4)); tunMat.color.setScalar(tdim);
    tunLights.forEach((l) => (l.intensity = 14 * tdim));
    // poste
    const st = t > 11.6 && t < 17.6;
    laptop.visible = plinth.visible = plRing.visible = st || (t > 11.4 && t < 17.6);
    let lm = lapTex.logo; if (t > 13.3) lm = lapTex.entree; laptop.userData.sm.map = lm;
    laptop.userData.sm.color.setScalar(t < 12.42 ? 0.15 : 0.97);
    const wp = seg(t, 12.4, 13.2); wave.visible = wp > 0 && wp < 1; wave.position.set(STATION.x, STATION.y + 0.55, STATION.z); wave.scale.setScalar(0.3 + ease.out(wp) * 7); wave.material.opacity = (1 - wp) * 0.8;
    blue.position.set(STATION.x, STATION.y + 0.8, STATION.z + 1); blue.intensity = 14 * Math.max(0, 1 - Math.abs(t - 12.5) / 0.7);
    tools.forEach(({ c, from, i }) => { const a = 13.25 + i * 0.05; const pin = ease.back(seg(t, a, a + 0.3)); const pc = ease.in(seg(t, 13.9 + i * 0.06, 14.55 + i * 0.06));
      c.visible = st && t > a && pc < 0.99; bez(from, tmp2.set(from.x * 0.5, from.y + 0.8, from.z + 0.8), tmp.set(STATION.x, STATION.y + 0.55, STATION.z), pc, c.position); c.scale.setScalar(Math.max(0.001, pin * (1 - pc))); c.rotation.set(0, Math.sin(t * 3 + i) * 0.4 * (1 - pc), Math.sin(t * 2 + i) * 0.15); });
    // SYNA : la fenêtre sort de l'écran, le message s'écrit, il est enregistré
    const sp = ease.out(seg(t, 14.95, 15.35)); syna.visible = st && t > 14.95;
    bez(v3(STATION.x, STATION.y + 0.55, STATION.z), v3(STATION.x, STATION.y + 1.6, STATION.z + 0.3), v3(STATION.x, STATION.y + 2.15, STATION.z + 0.15), sp, syna.position); syna.scale.setScalar(lerp(0.3, 1, sp)); syna.rotation.set(0, 0, 0);
    let sm = synaTex.e[0]; if (t >= 15.4) sm = synaTex.e[clamp(Math.floor((t - 15.4) / 0.2) + 1, 0, 5)]; if (t >= 16.45) sm = synaTex.sent; setCardMap(syna, sm);
    // final
    brandCard.visible = fin && brandP > 0.001;
    const fwd = ease.inOut(seg(t, 44.4, 45.5)); const intoLap = ease.in(seg(t, 46.25, 47.0));
    brandCard.position.copy(BRAND_CARD).lerp(v3(1.25, 8.05, 1.3), fwd); brandCard.rotation.set(0, (1 - brandP) * Math.PI + Math.sin(t * 1.3) * 0.08, 0);
    brandCard.scale.setScalar(lerp(1, 1.12, fwd));
    if (intoLap > 0) { bez(brandCard.position.clone(), v3(0.7, 8.4, 2.6), tmp.copy(FINAL.laptop).add(v3(0, 0.55, 0.05)), intoLap, brandCard.position); brandCard.scale.setScalar(Math.max(0.001, 1.12 * (1 - intoLap))); }
    brandGlow.position.copy(brandCard.position).add(v3(0, 0, -0.2)); brandGlow.material.opacity = fin ? 0.75 * brandP * (1 - intoLap) : 0;
    const pp = ease.back(seg(t, 45.7, 46.0)); const pIn = ease.in(seg(t, 46.4, 47.1));
    pack.visible = fin && pp > 0.01 && pIn < 0.99; bez(v3(-1.2, 7.5, 1.6), v3(-0.6, 8.0, 2.8), tmp.copy(FINAL.laptop).add(v3(0, 0.55, 0.05)), pIn, pack.position); pack.scale.setScalar(Math.max(0.001, 0.55 * pp * (1 - pIn))); pack.rotation.y = 0.5 + t * 0.8;
    conv.forEach((c, i) => { const a = 45.75 + i * 0.08; const p = ease.back(seg(t, a, a + 0.3)) * 0.7; const q = ease.in(seg(t, 46.35 + i * 0.08, 47.0 + i * 0.08));
      c.visible = fin && p > 0.01 && q < 0.99; bez(convFrom[i], v3(convFrom[i].x * 0.5, convFrom[i].y + 0.3, 2.8), tmp.copy(FINAL.laptop).add(v3(0, 0.55, 0.05)), q, c.position); c.scale.setScalar(Math.max(0.001, p * (1 - q))); c.rotation.set(0, Math.sin(t * 1.5 + i) * 0.2, 0); });
    const lp = ease.back(seg(t, 45.85, 46.35)); fLaptop.visible = fin && lp > 0.01; fLaptop.scale.setScalar(Math.max(0.001, lp));
    fGlow.material.opacity = fin ? 0.25 * lp + 0.6 * Math.max(0, 1 - Math.abs(t - 47.0) / 0.5) : 0;
    const ep = ease.outExpo(seg(t, 46.9, 47.8)); E.root.visible = fin && ep > 0.01;
    E.root.position.set(FINAL.logo.x, FINAL.logo.y - (1 - ep) * 0.6, FINAL.logo.z - (1 - ep) * 1.5); E.root.rotation.set(0, (1 - ep) * -2.6 + Math.sin(t * 0.8) * 0.06, 0); E.root.scale.setScalar(0.42 * Math.max(0.01, ep));
  }
  return { scene, update, lamp, laptop, syna };
}
