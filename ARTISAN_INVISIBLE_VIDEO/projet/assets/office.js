/* Bureau miniature dans le camion : l'artisan devant son ordinateur, les outils éparpillés qui sortent de l'écran
   et tournent autour de lui comme un cyclone, l'arrêt, la vague bleue qui rassemble tout dans un seul écran. */
import * as THREE from "three";
import { std, basic, rbox, rng, canvasTex, card, setCardMap, tex, seg, ease, lerp, clamp, bez, glow, roundRectShape } from "./lib.js";
import { makeArtisan, BRAND, STUDIO } from "./actors.js";

export const SCREEN = { x: 0, y: 1.42, z: -1.18, w: 1.6, h: 1.0 };
/** Fenêtre du studio qui se détache de l'écran et vient face à la caméra (avant-droite de l'artisan). */
export const HOLO_DIR = new THREE.Vector3(0.84, 0, -0.54).normalize();
export const HOLO_POS = new THREE.Vector3(0, 1.95, 0.1).addScaledVector(HOLO_DIR, 2.0);
export const HOLO = { w: 0.86, h: 1.8 };
export const HOLO_YAW = Math.atan2(HOLO_DIR.x, HOLO_DIR.z);

function heartShape(s) { const h = new THREE.Shape(); h.moveTo(0, -0.5 * s); h.bezierCurveTo(-0.9 * s, 0.05 * s, -0.45 * s, 0.75 * s, 0, 0.32 * s); h.bezierCurveTo(0.45 * s, 0.75 * s, 0.9 * s, 0.05 * s, 0, -0.5 * s); return h; }

export function buildOffice() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#2A2522");
  const R = rng(7);
  scene.add(new THREE.HemisphereLight("#FFE9D0", "#5B4636", 0.45));
  const key = new THREE.DirectionalLight("#FFB877", 1.9); key.position.set(-3, 5, -6); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 0.5, far: 20 }); key.shadow.bias = -0.0004; scene.add(key);
  const lamp = new THREE.PointLight("#FFD39A", 3.5, 7, 2); lamp.position.set(1.4, 2.6, 1.2); lamp.castShadow = false; scene.add(lamp);
  const screenLight = new THREE.PointLight("#9FC2FF", 1.2, 3, 2); screenLight.position.set(0, 1.45, -0.7); scene.add(screenLight);
  const blueFlash = new THREE.PointLight(STUDIO.signal2, 0, 14, 1.6); blueFlash.position.set(0, 1.5, -0.6); scene.add(blueFlash);

  // pièce : sol bois, murs chaux, étagères
  const wood = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#A9805A"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 64) { g.fillStyle = `hsl(28,${28 + R() * 10}%,${46 + R() * 10}%)`; g.fillRect(x, 0, 64, h); g.fillStyle = "rgba(60,35,15,.45)"; g.fillRect(x, 0, 2, h); } for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(60,35,15,${0.06 * R()})`; g.fillRect(R() * w, R() * h, 1, 6); } }, [4, 4]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), std("#ffffff", { map: wood, roughness: 0.6 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallM = std("#EFE6DA", { roughness: 0.95 });
  const mkWall = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallM); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; scene.add(m); return m; };
  mkWall(14, 3.6, 0, 1.8, 2.8, Math.PI); mkWall(8, 3.6, -3.4, 1.8, 0, Math.PI / 2); mkWall(8, 3.6, 5.6, 1.8, 0, -Math.PI / 2); mkWall(2.2, 3.6, 4.5, 1.8, -2.8, 0);
  // mur du fond (côté écran) avec une fenêtre ouverte sur le coucher de soleil
  const backWall = new THREE.Group(); scene.add(backWall);
  [[-2.55, 1.8, 1.7, 3.6], [2.55, 1.8, 1.7, 3.6], [0, 0.45, 3.4, 0.9], [0, 3.1, 3.4, 1.0]].forEach(([x, y, w, h]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallM); m.position.set(x, y, -2.8); m.receiveShadow = true; backWall.add(m); });
  const sunset = canvasTex(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#7D8FC4"); gr.addColorStop(0.55, "#F7B784"); gr.addColorStop(1, "#F08C5C"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(60,50,70,.55)"; for (let x = 0; x < w; x += 22) { const hh = 20 + R() * 50; g.fillRect(x, h - hh, 18, hh); } });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), basic("#ffffff", { map: sunset })); win.position.set(0, 1.75, -2.85); backWall.add(win);
  const frameM = std("#F7F3EC");
  [[0, 2.62, 3.5, 0.08], [0, 0.88, 3.5, 0.08]].forEach(([x, y, w, h]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.1), frameM); m.position.set(x, y, -2.78); backWall.add(m); });
  [-1.7, 0, 1.7].forEach((x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.1), frameM); m.position.set(x, 1.75, -2.78); backWall.add(m); });
  // étagères derrière l'artisan : pots de peinture, rouleaux, couteaux
  const shelfM = std("#8A6646", { roughness: 0.7 });
  [1.0, 1.75, 2.5].forEach((y) => { const s = new THREE.Mesh(rbox(4.2, 0.07, 0.45, 0.02), shelfM); s.position.set(0, y, 2.55); s.castShadow = s.receiveShadow = true; scene.add(s); });
  const potCols = ["#F3F1EC", "#E3A53C", "#F3F1EC", "#7DA7C9", "#F3F1EC", "#C46A43", "#F3F1EC", "#5E8A4E"];
  for (let i = 0; i < 12; i++) { const y = [1.0, 1.75, 2.5][i % 3]; const x = -1.8 + Math.floor(i / 3) * 1.15 + (i % 3) * 0.2; const r = 0.15 + R() * 0.05;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, 0.32, 20), std(potCols[i % potCols.length], { roughness: 0.5 })); p.position.set(x, y + 0.2, 2.5); p.castShadow = true; scene.add(p);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.03, 20), std(potCols[(i + 3) % potCols.length], { roughness: 0.4 })); lid.position.set(x, y + 0.37, 2.5); scene.add(lid); }
  // bureau, écran, clavier, tasse, lampe
  const desk = new THREE.Mesh(rbox(2.6, 0.08, 1.1, 0.03), std("#B48A62", { roughness: 0.55 })); desk.position.set(0, 0.92, -1.0); desk.castShadow = desk.receiveShadow = true; scene.add(desk);
  [[-1.2, -1.45], [1.2, -1.45], [-1.2, -0.55], [1.2, -0.55]].forEach(([x, z]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.9, 0.07), std("#3A3C40", { metalness: 0.5 })); l.position.set(x, 0.45, z); l.castShadow = true; scene.add(l); });
  const mon = new THREE.Group(); mon.position.set(SCREEN.x, SCREEN.y, SCREEN.z); scene.add(mon);
  const bezel = new THREE.Mesh(rbox(SCREEN.w + 0.08, SCREEN.h + 0.08, 0.06, 0.03), std("#1B1D21", { roughness: 0.35, metalness: 0.4 })); bezel.position.z = -0.035; bezel.castShadow = true; mon.add(bezel);
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.06), std("#2A2C30", { metalness: 0.6 })); stand.position.set(0, -0.62, -0.1); mon.add(stand);
  const foot = new THREE.Mesh(rbox(0.5, 0.03, 0.3, 0.01), std("#2A2C30", { metalness: 0.6 })); foot.position.set(0, -0.8, -0.05); mon.add(foot);
  const screenMat = new THREE.MeshBasicMaterial({ map: tex("ui-desk-messy.png"), toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), screenMat); screen.position.z = 0.001; mon.add(screen);
  const scrFlash = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0, toneMapped: false })); scrFlash.position.z = 0.003; mon.add(scrFlash);
  const kb = new THREE.Mesh(rbox(0.9, 0.03, 0.3, 0.01), std("#E8E8EA", { roughness: 0.5 })); kb.position.set(0, 0.975, -0.65); kb.castShadow = true; scene.add(kb);
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.16, 20), std(BRAND.ocre)); mug.position.set(0.9, 1.04, -0.85); mug.castShadow = true; scene.add(mug);
  const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 8), std("#2B2B2E")); lampArm.position.set(-1.0, 1.3, -1.25); lampArm.rotation.z = 0.3; scene.add(lampArm);
  const lampHead = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.18, 20, 1, true), std("#2B2B2E", { side: THREE.DoubleSide })); lampHead.position.set(-0.85, 1.64, -1.15); lampHead.rotation.z = 2.4; scene.add(lampHead);
  const lampG = glow("#FFD49A", 0.6, 0.7); lampG.position.set(-0.8, 1.58, -1.12); scene.add(lampG);
  // chaise
  const chairM = std("#33363C", { roughness: 0.6 });
  const seat = new THREE.Mesh(rbox(0.7, 0.1, 0.65, 0.04), chairM); seat.position.set(0, 0.55, 0.15); seat.castShadow = true; scene.add(seat);
  const backr = new THREE.Mesh(rbox(0.66, 0.7, 0.08, 0.04), chairM); backr.position.set(0, 1.0, 0.5); backr.castShadow = true; scene.add(backr);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8), std("#888", { metalness: 0.7 })); post.position.set(0, 0.28, 0.15); scene.add(post);
  // l'artisan, assis face à l'écran (dos au mur d'étagères)
  const art = makeArtisan(); art.root.position.set(0, 0, 0.12); art.root.rotation.y = Math.PI; scene.add(art.root);

  // ---------- les outils éparpillés ----------
  const items = [];
  const toolNames = ["site", "social", "ads", "photo", "logo", "seo"];
  const emerge = { site: 9.15, social: 10.95, ads: 12.25, photo: 10.0, logo: 11.6, seo: 13.1 };
  toolNames.forEach((n, i) => { const c = card(tex("ui-tool-" + n + ".png"), 0.88, 0.64, { depth: 0.035, radius: 0.06, emissive: 0.25 }); scene.add(c); items.push({ o: c, e: emerge[n], r: 1.45 + (i % 3) * 0.28, h: 0.75 + (i % 2) * 1.1 + i * 0.06, ph: i * 1.05, card: true, spin: 0 }); });
  const icoM = (c) => std(c, { roughness: 0.35, metalness: 0.1, emissive: c, emissiveIntensity: 0.15 });
  const mag = new THREE.Group(); { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 12, 32), icoM("#5B6378")); mag.add(ring); const gl = new THREE.Mesh(new THREE.CircleGeometry(0.15, 24), std("#BFD8FF", { transparent: true, opacity: 0.5 })); mag.add(gl); const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.22, 10), icoM("#2B3452")); hd.position.set(0.16, -0.16, 0); hd.rotation.z = 0.8; mag.add(hd); }
  const heart = new THREE.Mesh(new THREE.ExtrudeGeometry(heartShape(0.3), { depth: 0.08, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3 }), icoM("#E2457B")); heart.geometry.center();
  const mega = new THREE.Group(); { const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.07, 0.32, 20, 1, true), icoM("#0F9D8A")); cone.material.side = THREE.DoubleSide; cone.rotation.z = Math.PI / 2; mega.add(cone); const hd = new THREE.Mesh(rbox(0.07, 0.16, 0.07, 0.02), icoM("#2B3452")); hd.position.set(0.05, -0.12, 0); mega.add(hd); }
  const camI = new THREE.Group(); { const b = new THREE.Mesh(rbox(0.36, 0.24, 0.16, 0.05), icoM("#EF6C3E")); camI.add(b); const l = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.1, 20), icoM("#2B3452")); l.rotation.x = Math.PI / 2; l.position.z = 0.1; camI.add(l); }
  const pencil = new THREE.Group(); { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 6), icoM("#E9A800")); pencil.add(b); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 6), icoM("#F3D3A0")); tip.position.y = -0.255; tip.rotation.z = Math.PI; pencil.add(tip); pencil.rotation.z = 0.7; }
  const bubble = new THREE.Mesh(new THREE.ExtrudeGeometry(roundRectShape(0.4, 0.28, 0.1), { depth: 0.06, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015 }), icoM("#7A5AF8"));
  const photoI = card(tex("photo-apres.jpg"), 0.5, 0.375, { depth: 0.02, radius: 0.03, emissive: 0.2 });
  const env = new THREE.Mesh(rbox(0.38, 0.26, 0.04, 0.02), icoM("#F3F1EC"));
  const palette = new THREE.Group(); { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 28), icoM("#F3EEE6")); d.rotation.x = Math.PI / 2; palette.add(d); ["#E2457B", "#E9A800", "#0F9D8A", "#7A5AF8"].forEach((c, i) => { const dot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), icoM(c)); dot.position.set(Math.cos(i * 1.4) * 0.11, Math.sin(i * 1.4) * 0.11, 0.03); palette.add(dot); }); }
  [[mag, 9.6], [heart, 11.2], [mega, 12.5], [camI, 10.3], [pencil, 11.85], [bubble, 11.0], [photoI, 10.15], [env, 13.4], [palette, 12.0]].forEach(([o, e], i) => {
    o.traverse((m) => { if (m.isMesh) m.castShadow = true; }); scene.add(o); items.push({ o, e, r: 1.25 + ((i * 7) % 5) * 0.2, h: 0.55 + ((i * 3) % 6) * 0.38, ph: 0.5 + i * 0.71, card: false, spin: 1 + (i % 3) });
  });
  // fenêtre flottante du studio
  const holo = card(tex("ui-m-entree-0.png"), HOLO.w, HOLO.h, { depth: 0.025, radius: 0.07, side: "#1B1D21" }); holo.visible = false; scene.add(holo);
  const holoGlow = glow("#7FA6FF", 3.2, 0); scene.add(holoGlow);
  // vague bleue
  const waveM = new THREE.MeshBasicMaterial({ color: "#5B8CFF", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const wave = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 12, 96), waveM); wave.position.set(SCREEN.x, SCREEN.y, SCREEN.z + 0.05); scene.add(wave);
  const wave2 = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 8, 96), waveM.clone()); wave2.position.copy(wave.position); scene.add(wave2);
  const scrGlow = glow("#6F9BFF", 4, 0); scrGlow.position.set(SCREEN.x, SCREEN.y, SCREEN.z + 0.1); scene.add(scrGlow);

  const C = new THREE.Vector3(0, 1.45, 0.1);
  const sc = new THREE.Vector3(SCREEN.x, SCREEN.y, SCREEN.z + 0.05);
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const textures = { messy: tex("ui-desk-messy.png"), logo: tex("ui-screen-logo.png"), e: [0, 1, 2, 3, 4, 5].map((i) => tex(`ui-m-entree-${i}.png`)), sent: tex("ui-m-entree-sent.png") };
  const Omega = (t) => { const x = clamp(t, 9, 16.6) - 9; return 0.75 * x + 0.085 * x * x; };

  function update(t) {
    // écran, puis fenêtre flottante
    let map = textures.messy;
    if (t >= 18.25) map = textures.logo;
    screenMat.map = map;
    let hm = textures.e[0];
    if (t >= 18.95) { const k = clamp(Math.floor((t - 19.55) / 0.3) + 1, 0, 5); hm = textures.e[t < 19.55 ? 0 : k]; }
    if (t >= 21.35) hm = textures.sent;
    setCardMap(holo, hm);
    const hp = ease.inOut(seg(t, 18.45, 19.25));
    holo.visible = t >= 18.45;
    bez(tmp.set(SCREEN.x, SCREEN.y, SCREEN.z + 0.02), tmp2.set((SCREEN.x + HOLO_POS.x) / 2, 2.35, (SCREEN.z + HOLO_POS.z) / 2 + 0.2), HOLO_POS, hp, holo.position);
    holo.rotation.set(0, HOLO_YAW * hp, 0); holo.scale.setScalar(lerp(0.55, 1, hp));
    holoGlow.position.copy(holo.position).addScaledVector(HOLO_DIR, -0.15); holoGlow.material.opacity = 0.6 * Math.sin(hp * Math.PI);
    scrFlash.material.opacity = Math.max(0, 1 - Math.abs(t - 18.25) / 0.18) * 0.9 + Math.max(0, 1 - Math.abs(t - 17.05) / 0.25) * 0.5;
    // personnage
    const typing = (t < 9.2 || (t > 19.5 && t < 21.3)) ? Math.sin(t * 28) * 0.06 : 0;
    const panic = ease.inOut(seg(t, 13.5, 14.2)) * (1 - ease.inOut(seg(t, 16.7, 17.4)));
    let look = 0;
    const toHolo = ease.inOut(seg(t, 18.5, 19.2));
    if (t > 9.1 && t < 16.6) look = Math.sin((t - 9.1) * 2.1) * 0.75 * seg(t, 9.1, 9.6);
    if (t >= 16.6) look = lerp(Math.sin(7.5 * 2.1) * 0.75, 0, ease.inOut(seg(t, 16.6, 17.4)));
    const blinkT = [10.4, 12.9, 16.9, 20.2]; let blink = 0; blinkT.forEach((b) => { blink = Math.max(blink, 1 - Math.abs(t - b) / 0.08); });
    const worried = t > 12.4 && t < 17.8;
    const leanIn = ease.inOut(seg(t, 18.4, 19.4));
    art.pose({
      sit: 1, lookY: look - toHolo * 0.75, lookX: lerp(-0.18, -0.05, seg(t, 9.1, 9.5)) - leanIn * 0.12 + panic * 0.05 - toHolo * 0.25,
      armL: [lerp(-1.25 + typing, -2.75, panic), lerp(0, 0.35, panic), lerp(-0.9, -2.1, panic)],
      armR: [lerp(-1.25 - typing, -2.75, panic), lerp(0, 0.35, panic), lerp(-0.9, -2.1, panic)],
      browUp: Math.max(seg(t, 9.1, 9.5) * (1 - seg(t, 12.4, 12.8)), seg(t, 17.0, 17.3) * 1.2), worried, blink, bob: Math.sin(t * 3) * 0.004,
    });
    art.hips.position.z = leanIn * -0.08;
    // cyclone puis aspiration par l'écran
    const O = Omega(t);
    items.forEach((it, i) => {
      const o = it.o; const ep = ease.out(seg(t, it.e, it.e + 0.75));
      const sp = ease.in(seg(t, 17.25 + i * 0.045, 17.95 + i * 0.045)); // aspiré dans l'écran
      if (t < it.e) { o.visible = false; return; }
      o.visible = sp < 0.995;
      const th = it.ph + O * (it.card ? 1 : 1.12);
      const rr = it.r * (1 + 0.08 * Math.sin(O * 0.7 + i));
      tmp.set(C.x + Math.cos(th) * rr, it.h + 0.2 * Math.sin(O + i) + 0.1 * Math.min(1, O / 10), C.z + Math.sin(th) * rr);
      bez(sc, tmp2.set((sc.x + tmp.x) / 2, Math.max(sc.y, tmp.y) + 0.6, (sc.z + tmp.z) / 2), tmp, ep, o.position);
      if (sp > 0) { const mid = tmp2.copy(o.position).lerp(sc, 0.5); mid.y += 0.4; bez(o.position.clone(), mid, sc, sp, o.position); }
      const s = (0.25 + 0.75 * ep) * (1 - sp);
      o.scale.setScalar(Math.max(0.001, s));
      if (it.card) { o.lookAt(tmp2.set(C.x + Math.cos(th) * 6, o.position.y + 0.3, C.z + Math.sin(th) * 6)); o.rotateZ(Math.sin(O + i) * 0.15); }
      else { o.rotation.set(O * 0.6 * it.spin + i, O * it.spin + i * 2, Math.sin(O + i) * 0.4); }
    });
    // vague
    const wp = seg(t, 17.0, 18.1);
    wave.visible = wave2.visible = wp > 0 && wp < 1;
    wave.scale.setScalar(0.2 + ease.out(wp) * 9); waveM.opacity = (1 - wp) * 0.7;
    const wp2 = seg(t, 17.15, 18.3); wave2.scale.setScalar(0.2 + ease.out(wp2) * 7); wave2.material.opacity = (1 - wp2) * 0.8; wave2.rotation.x = 0.0;
    blueFlash.intensity = 9 * Math.max(0, 1 - Math.abs(t - 17.1) / 0.6) + 3 * Math.max(0, 1 - Math.abs(t - 18.25) / 0.4);
    scrGlow.material.opacity = 0.45 * Math.max(0, 1 - Math.abs(t - 17.6) / 0.9);
    screenLight.intensity = t > 18.2 ? 1.8 : 1.2;
  }
  return { scene, update, art, screen, mon, holo };
}
