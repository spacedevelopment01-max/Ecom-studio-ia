/* Ville miniature à l'heure dorée : chantier de 3M (macro du couteau à enduire), quartier, recherches des habitants,
   puis retour au crépuscule avec le camion habillé et l'écosystème de marque (site, publication, publicité). */
import * as THREE from "three";
import { std, basic, rbox, rng, canvasTex, skyDome, glow, card, tex, seg, ease, lerp, clamp, bez } from "./lib.js";
import { makeVan, makeKnife, makeBadge3M, makeArtisan, BRAND } from "./actors.js";

export const HERO = { x: 0, z: -10.5, w: 11, d: 8, h: 6.6 };
export const FACADE_Z = HERO.z + HERO.d / 2; // -5
export const KNIFE_Y = 2.05;
export const VAN_PARK = new THREE.Vector3(4.2, 0, 2.6);

function prismGeo() {
  // toit à deux pans, faîtage selon x, base 1×1 centrée, hauteur 1
  const g = new THREE.BufferGeometry();
  const v = [
    -0.5, 0, 0.5, 0.5, 0, 0.5, 0.5, 1, 0, -0.5, 0, 0.5, 0.5, 1, 0, -0.5, 1, 0, // pan avant
    0.5, 0, -0.5, -0.5, 0, -0.5, -0.5, 1, 0, 0.5, 0, -0.5, -0.5, 1, 0, 0.5, 1, 0, // pan arrière
    -0.5, 0, -0.5, -0.5, 0, 0.5, -0.5, 1, 0, 0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 1, 0, // pignons
  ];
  g.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); g.computeVertexNormals(); return g;
}

export function buildCity({ glyphs }) {
  const scene = new THREE.Scene();
  const R = rng(42);
  const sky = skyDome("#6E9BD6", "#F6C08A", "#E9B488", 1400); scene.add(sky);
  scene.fog = new THREE.Fog("#F2C7A0", 160, 620);
  const hemi = new THREE.HemisphereLight("#BFD6FF", "#E7B27E", 0.85); scene.add(hemi);
  const sun = new THREE.DirectionalLight("#FFB26A", 3.1);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const sunDir = new THREE.Vector3(-0.78, 0.42, 0.46).normalize();

  // sol, rues, trottoirs
  const grass = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#93AE74"; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${R() < 0.5 ? "60,90,40" : "200,220,150"},${0.08 * R()})`; g.fillRect(R() * w, R() * h, 2, 2); } }, [60, 60]);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), std("#ffffff", { map: grass, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const asphalt = std("#3E4247", { roughness: 0.95 }), walk = std("#D9D3C7", { roughness: 0.95 }), mark = basic("#E9E4D6");
  const streetsZ = []; for (let z = -192; z <= 128; z += 32) streetsZ.push(z);
  const crossX = [-175, -105, -35, 35, 105, 175];
  streetsZ.forEach((z) => {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(700, 8), asphalt); r.rotation.x = -Math.PI / 2; r.position.set(0, 0.02, z); r.receiveShadow = true; scene.add(r);
    [-1, 1].forEach((s) => { const w = new THREE.Mesh(new THREE.BoxGeometry(700, 0.18, 2), walk); w.position.set(0, 0.09, z + s * 5); w.receiveShadow = true; scene.add(w); });
  });
  crossX.forEach((x) => { const r = new THREE.Mesh(new THREE.PlaneGeometry(8, 700), asphalt); r.rotation.x = -Math.PI / 2; r.position.set(x, 0.03, 0); r.receiveShadow = true; scene.add(r); });
  const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(3, 0.25), mark, 2000); let nd = 0; const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
  const qFlat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  streetsZ.forEach((z) => { for (let x = -340; x < 340; x += 7) { if (crossX.some((c) => Math.abs(c - x) < 6)) continue; dash.setMatrixAt(nd++, M.compose(P.set(x, 0.04, z), qFlat, S.set(1, 1, 1))); } });
  dash.count = nd; scene.add(dash);

  // maisons du quartier (instanciées)
  const walls = ["#F3EDE3", "#EADFCF", "#F6F2EA", "#E4D3BD", "#DCE3E6", "#F0E2D0", "#E8D6C4"].map((c) => new THREE.Color(c));
  const roofs = ["#B5553A", "#9C4A35", "#5B6066", "#C46A43", "#7D4B3A", "#A85B44"].map((c) => new THREE.Color(c));
  const lots = [];
  streetsZ.forEach((zs) => [-1, 1].forEach((side) => {
    crossX.slice(0, -1).forEach((cx, k) => {
      for (let i = 0; i < 4; i++) {
        const x = cx + 14 + i * 14; const z = zs + side * 10.5;
        if (zs === 0 && side === -1 && k === 2 && (i === 1 || i === 2)) continue; // terrain du chantier de 3M
        if (Math.abs(z) > 230) continue;
        lots.push({ x: x + (R() - 0.5) * 1.2, z, face: -side, w: 7 + R() * 2.2, d: 6.5 + R() * 1.5, h: R() < 0.45 ? 6.2 + R() * 0.8 : 3.6 + R() * 0.6 });
      }
    });
  }));
  const N = lots.length;
  const bodyM = std("#ffffff", { roughness: 0.85 }), roofM = std("#ffffff", { roughness: 0.75 });
  const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), bodyM, N); bodies.castShadow = bodies.receiveShadow = true;
  const roofI = new THREE.InstancedMesh(prismGeo(), roofM, N); roofI.castShadow = true; roofI.receiveShadow = true;
  const winGeo = new THREE.PlaneGeometry(1, 1);
  const winM = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const maxWin = N * 7; const wins = new THREE.InstancedMesh(winGeo, winM, maxWin); const winData = []; let nw = 0;
  const door = new THREE.InstancedMesh(winGeo, std("#6B4A36", { roughness: 0.7 }), N); let ndoor = 0;
  const qY = (a) => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, 0));
  lots.forEach((l, i) => {
    const q = qY(l.face > 0 ? 0 : Math.PI);
    bodies.setMatrixAt(i, M.compose(P.set(l.x, l.h / 2, l.z), q, S.set(l.w, l.h, l.d)));
    bodies.setColorAt(i, walls[Math.floor(R() * walls.length)]);
    roofI.setMatrixAt(i, M.compose(P.set(l.x, l.h, l.z), q, S.set(l.w + 0.6, 2.2 + R() * 0.8, l.d + 0.6)));
    roofI.setColorAt(i, roofs[Math.floor(R() * roofs.length)]);
    const fz = l.z + l.face * (l.d / 2 + 0.02);
    const floors = l.h > 5 ? 2 : 1;
    for (let f = 0; f < floors; f++) for (let k = -1; k <= 1; k += 2) {
      if (f === 0 && k === 1 && R() < 0.6) continue;
      const wx = l.x + k * l.w * 0.26, wy = 1.6 + f * 2.7;
      wins.setMatrixAt(nw, M.compose(P.set(wx, wy, fz), q, S.set(1.3, 1.25, 1)));
      const dist = Math.hypot(l.x, l.z);
      winData.push({ delay: 3.3 + dist * 0.012 + R() * 1.2, warm: 0.75 + R() * 0.5, ret: R() < 0.82 }); nw++;
    }
    door.setMatrixAt(ndoor++, M.compose(P.set(l.x + l.w * 0.05, 1.05, fz), q, S.set(1.0, 2.1, 1)));
  });
  wins.count = nw; door.count = ndoor;
  const winCol = new THREE.Color();
  for (let i = 0; i < nw; i++) wins.setColorAt(i, winCol.set("#38434F"));
  scene.add(bodies, roofI, wins, door);

  // arbres, lampadaires, voitures
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.3, 2.2, 8), std("#6B4F3A"), 500);
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), std("#5E8A4E", { roughness: 0.9, flatShading: true }), 500);
  crowns.castShadow = trunks.castShadow = true; let nt = 0; const greens = ["#5E8A4E", "#6E9A55", "#4F7A48", "#7FA35E", "#A8A04A"].map((c) => new THREE.Color(c));
  lots.forEach((l) => { const n = 1 + Math.floor(R() * 2); for (let k = 0; k < n && nt < 500; k++) {
    const tx = l.x + (R() - 0.5) * l.w * 1.2, tz = l.z - l.face * (l.d / 2 + 2.5 + R() * 2); const s = 1.6 + R() * 1.1;
    trunks.setMatrixAt(nt, M.compose(P.set(tx, 1.1, tz), Q.identity(), S.set(1, 1, 1)));
    crowns.setMatrixAt(nt, M.compose(P.set(tx, 2.2 + s * 0.8, tz), Q.setFromEuler(new THREE.Euler(R(), R(), R())), S.set(s, s * 1.1, s)));
    crowns.setColorAt(nt, greens[Math.floor(R() * greens.length)]); nt++; } });
  trunks.count = crowns.count = nt; scene.add(trunks, crowns);
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.08, 0.1, 4.6, 6), std("#3B3E44", { metalness: 0.5 }), 400);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshBasicMaterial({ color: "#ffffff" }), 400); let nl = 0;
  streetsZ.forEach((z) => { for (let x = -322; x < 330; x += 28) { [-1, 1].forEach((s) => { if (nl >= 400) return; poles.setMatrixAt(nl, M.compose(P.set(x + (s > 0 ? 14 : 0), 2.3, z + s * 5.3), Q.identity(), S.set(1, 1, 1))); bulbs.setMatrixAt(nl, M.compose(P.set(x + (s > 0 ? 14 : 0), 4.7, z + s * 5.3), Q.identity(), S.set(1, 1, 1))); nl++; }); } });
  poles.count = bulbs.count = nl; poles.castShadow = true; scene.add(poles, bulbs);
  for (let i = 0; i < nl; i++) bulbs.setColorAt(i, winCol.set("#C9C2B4"));
  const carBody = new THREE.InstancedMesh(rbox(4, 0.9, 1.8, 0.25), std("#ffffff", { roughness: 0.35, metalness: 0.3 }), 160);
  const carTop = new THREE.InstancedMesh(rbox(2.2, 0.75, 1.6, 0.25), std("#2A3038", { roughness: 0.2, metalness: 0.5 }), 160);
  carBody.castShadow = carTop.castShadow = true; let nc = 0; const carCols = ["#C8D2DC", "#9E2B25", "#2C4A6E", "#E8E6E1", "#3D3F44", "#5C7A6B", "#D9A441"].map((c) => new THREE.Color(c));
  streetsZ.forEach((z) => { for (let x = -330; x < 330; x += 11 + R() * 30) { if (nc >= 160 || R() < 0.45) continue; if (z === 0 && x > -25 && x < 25) continue; const zz = z + (R() < 0.5 ? -2.6 : 2.6);
    carBody.setMatrixAt(nc, M.compose(P.set(x, 0.75, zz), Q.identity(), S.set(1, 1, 1))); carTop.setMatrixAt(nc, M.compose(P.set(x - 0.2, 1.45, zz), Q.identity(), S.set(1, 1, 1)));
    carBody.setColorAt(nc, carCols[Math.floor(R() * carCols.length)]); nc++; } });
  carBody.count = carTop.count = nc; scene.add(carBody, carTop);

  // maison du chantier (façade en enduit, gros plan du couteau)
  const crepi = (base, rough) => canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); const r2 = rng(rough ? 3 : 9);
    for (let i = 0; i < (rough ? 60000 : 12000); i++) { const a = r2(); g.fillStyle = `rgba(${a < 0.5 ? "70,60,50" : "255,252,245"},${(rough ? 0.16 : 0.05) * r2()})`; const s = rough ? 1 + r2() * 4 : 1 + r2() * 2; g.fillRect(r2() * w, r2() * h, s, s); } }, [8, 5]);
  const roughTex = crepi("#BDB3A4", true), roughBump = roughTex;
  const hero = new THREE.Group(); hero.position.set(HERO.x, 0, HERO.z); scene.add(hero);
  const heroWallM = std("#ffffff", { map: roughTex, bumpMap: roughBump, bumpScale: 2.2, roughness: 0.95 });
  const heroBody = new THREE.Mesh(new THREE.BoxGeometry(HERO.w, HERO.h, HERO.d), [heroWallM, heroWallM, heroWallM, heroWallM, heroWallM, heroWallM]);
  heroBody.position.y = HERO.h / 2; heroBody.castShadow = heroBody.receiveShadow = true; hero.add(heroBody);
  const heroRoof = new THREE.Mesh(prismGeo(), std("#5B6066", { roughness: 0.7 })); heroRoof.scale.set(HERO.w + 0.8, 3, HERO.d + 0.8); heroRoof.position.y = HERO.h; heroRoof.castShadow = true; hero.add(heroRoof);
  const heroWins = [];
  [[-3.4, 4.6], [0, 4.6], [3.4, 4.6], [3.4, 1.7]].forEach(([x, y]) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.4), new THREE.MeshBasicMaterial({ color: "#38434F" })); w.position.set(x, y, HERO.d / 2 + 0.02); hero.add(w); heroWins.push(w); });
  const heroDoor = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.3), std("#6B4A36")); heroDoor.position.set(1.2, 1.15, HERO.d / 2 + 0.02); hero.add(heroDoor);
  // enduit frais : bande lisse qui suit le couteau (passage de gauche à droite)
  const freshTex = crepi("#F2EEE6", false);
  const fresh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), std("#ffffff", { map: freshTex, roughness: 0.42, metalness: 0.02 }));
  fresh.position.set(0, KNIFE_Y, FACADE_Z + 0.007); fresh.receiveShadow = true; scene.add(fresh);
  const fresh2 = fresh.clone(); fresh2.material = fresh.material; scene.add(fresh2);
  // gros plan : pièce de façade au grain fin (texture répétée serrée) autour du couteau
  const fine = (base, amt, seedN) => canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); const r2 = rng(seedN);
    for (let i = 0; i < 90000; i++) { const a = r2(); g.fillStyle = `rgba(${a < 0.5 ? "60,50,40" : "255,252,246"},${amt * r2()})`; const s = 1 + r2() * 3; g.fillRect(r2() * w, r2() * h, s, s); } }, [7, 4]);
  const patchTex = fine("#AFA493", 0.22, 3);
  const patch = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8), std("#ffffff", { map: patchTex, bumpMap: patchTex, bumpScale: 3, roughness: 0.95 }));
  patch.position.set(-0.3, KNIFE_Y, FACADE_Z + 0.003); patch.receiveShadow = true; scene.add(patch);
  const freshFine = fine("#DCD6CB", 0.035, 9);
  const ragged = canvasTex(1024, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#000"); gr.addColorStop(0.16, "#fff"); gr.addColorStop(0.84, "#fff"); gr.addColorStop(1, "#000"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const gx = g.createLinearGradient(0, 0, w * 0.06, 0); gx.addColorStop(0, "rgba(0,0,0,1)"); gx.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gx; g.fillRect(0, 0, w * 0.06, h); });
  ragged.colorSpace = THREE.NoColorSpace;
  fresh.material = std("#ffffff", { map: freshFine, roughness: 0.42, metalness: 0.0, alphaMap: ragged, transparent: true }); fresh2.material = fresh.material;
  // façade terminée (retour en ville) : enduit lisse peint
  const doneWallM = std("#F3EEE6", { roughness: 0.75 });
  const knife = makeKnife(); scene.add(knife);
  // artisan qui tient le couteau (vu seulement de loin)
  const art = makeArtisan(); art.root.scale.setScalar(1.12); art.root.rotation.y = Math.PI; scene.add(art.root);
  art.pose({ armL: [-2.05, -0.55, -0.15], armR: [0.15, 0, -0.2], lookY: -0.25, lookX: 0.15 });

  // camion de 3M (blanc au début, habillé au retour)
  const van = makeVan(); van.root.position.copy(VAN_PARK); scene.add(van.root);

  // recherches des habitants : cartes au-dessus des maisons qui s'allument
  const searchTex = tex("ui-search.png");
  const near = lots.map((l, i) => ({ l, i, d: Math.hypot(l.x - 0, l.z + 4) })).filter((o) => o.d > 14 && o.d < 70).sort((a, b) => a.d - b.d);
  const picks = []; const used = new Set();
  for (const o of near) { if (picks.length >= 7) break; const key = Math.round(o.l.x / 30) + ":" + Math.round(o.l.z / 30); if (used.has(key)) continue; used.add(key); picks.push(o); }
  const searches = picks.map((o, k) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: searchTex, transparent: true, depthWrite: false })); sp.center.set(0.5, 0);
    sp.position.set(o.l.x, o.l.h + 9, o.l.z); sp.userData = { base: o.l.h + 9, k, w: 19 }; sp.renderOrder = 5; scene.add(sp);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1, 8), new THREE.MeshBasicMaterial({ color: "#FFE3B0", transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.position.set(o.l.x, o.l.h + 3.2 + 2.9, o.l.z); beam.scale.y = 5.8; scene.add(beam);
    const g2 = glow("#FFD79A", 7, 0.9); g2.position.set(o.l.x, o.l.h + 2.2, o.l.z); scene.add(g2);
    return { sp, beam, g2, l: o.l };
  });

  // écosystème de marque (retour) : site, publication, publicité au-dessus du quartier
  const eco = new THREE.Group(); scene.add(eco);
  const ecoSite = card(tex("ui-m-site.png"), 4.3, 9.0, { depth: 0.25, radius: 0.55, side: "#1B1D21" }); ecoSite.position.set(-0.5, 29, -14);
  const ecoPost = card(tex("ui-post-1.png"), 5.6, 5.6, { depth: 0.25, radius: 0.45 }); ecoPost.position.set(-7, 21.5, -7);
  const ecoAd = card(tex("ui-ad-story.png"), 4.0, 7.1, { depth: 0.25, radius: 0.45 }); ecoAd.position.set(6.2, 22.5, -7);
  const ecoHead = new THREE.Group();
  [ecoSite, ecoPost, ecoAd].forEach((c) => eco.add(c));
  const linkMat = new THREE.MeshBasicMaterial({ color: "#8FD0FF", transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const links = [];
  const mkLink = (a, b, lift) => { const c = new THREE.QuadraticBezierCurve3(a, new THREE.Vector3((a.x + b.x) / 2, Math.max(a.y, b.y) + lift, (a.z + b.z) / 2), b); const m = new THREE.Mesh(new THREE.TubeGeometry(c, 60, 0.12, 8, false), linkMat); eco.add(m); links.push({ m, n: m.geometry.index.count }); return c; };
  mkLink(new THREE.Vector3(-2.7, 29, -14), new THREE.Vector3(-7, 24.3, -7), 2);
  mkLink(new THREE.Vector3(1.7, 29, -14), new THREE.Vector3(6.2, 26, -7), 2);
  mkLink(new THREE.Vector3(-7, 18.7, -7), new THREE.Vector3(6.2, 19, -7), -3.5);
  const vanLink = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 8), linkMat); eco.add(vanLink);
  // trajets lumineux depuis les maisons : du potentiel, jamais un chiffre
  const flows = [];
  const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 10, 8), new THREE.MeshBasicMaterial({ color: "#FFE7B8" }), 60);
  for (let i = 0; i < 60; i++) { const l = lots[Math.floor(R() * lots.length)]; if (Math.hypot(l.x, l.z) > 120) { i--; continue; } const a = new THREE.Vector3(l.x, l.h + 2, l.z); const b = new THREE.Vector3(-0.5 + (R() - 0.5) * 3.5, 25, -13.6); flows.push({ a, c: new THREE.Vector3((a.x + b.x) / 2, 40 + R() * 10, (a.z + b.z) / 2), b, ph: R(), sp: 0.18 + R() * 0.1 }); }
  scene.add(fl);
  // grand logo 3M (finale)
  const big = makeBadge3M(glyphs); big.root.scale.setScalar(6); big.root.position.set(0, 46, -12); scene.add(big.root); big.swoosh(1);
  const bigGlow = glow("#FFE2A8", 70, 0.0); bigGlow.position.set(0, 46, -14); scene.add(bigGlow);

  const tmp = new THREE.Vector3(); const skyU = sky.userData.mat.uniforms;
  const cGold = { top: new THREE.Color("#6E9BD6"), mid: new THREE.Color("#F6C08A"), bot: new THREE.Color("#E9B488"), fog: new THREE.Color("#F2C7A0"), sun: new THREE.Color("#FFB26A") };
  const cDusk = { top: new THREE.Color("#2B3E78"), mid: new THREE.Color("#F08A6B"), bot: new THREE.Color("#B0697A"), fog: new THREE.Color("#C98A8A"), sun: new THREE.Color("#FF8E5A") };

  /** Met la ville à l'instant t. mode : "intro" (0–9 s) ou "retour" (43–53 s). */
  function update(t, camTarget, camDist) {
    const back = t > 30; const dusk = back ? 1 : 0;
    skyU.top.value.copy(cGold.top).lerp(cDusk.top, dusk); skyU.mid.value.copy(cGold.mid).lerp(cDusk.mid, dusk); skyU.bottom.value.copy(cGold.bot).lerp(cDusk.bot, dusk);
    scene.fog.color.copy(cGold.fog).lerp(cDusk.fog, dusk);
    sun.color.copy(cGold.sun).lerp(cDusk.sun, dusk); sun.intensity = lerp(3.1, 1.6, dusk); hemi.intensity = lerp(0.85, 0.55, dusk);
    // ombre : cadrage serré en gros plan, large en vue de ville
    const half = clamp(camDist * 0.62, 0.8, 150);
    const sc = sun.shadow.camera; sc.left = sc.bottom = -half; sc.right = sc.top = half; sc.near = 0.1; sc.far = half * 6 + 200; sc.updateProjectionMatrix();
    sun.target.position.copy(camTarget); sun.position.copy(camTarget).addScaledVector(sunDir, half * 2.5 + 60);
    // fenêtres
    for (let i = 0; i < nw; i++) {
      const d = winData[i]; const on = back ? (d.ret ? 1 : 0) : ease.out(seg(t, d.delay, d.delay + 0.5));
      winCol.set("#38434F").lerp(new THREE.Color(back ? "#FFB765" : "#FFC874"), on).multiplyScalar(1 + on * (back ? 1.6 : 1.1) * d.warm);
      wins.setColorAt(i, winCol);
    }
    wins.instanceColor.needsUpdate = true;
    const lamp = back ? 1 : ease.out(seg(t, 4.2, 6));
    for (let i = 0; i < nl; i++) bulbs.setColorAt(i, winCol.set("#C9C2B4").lerp(new THREE.Color("#FFD9A0"), lamp).multiplyScalar(1 + lamp * 1.8));
    bulbs.instanceColor.needsUpdate = true;
    heroWins.forEach((w, i) => w.material.color.set(back ? (i === 1 ? "#38434F" : "#FFC27A") : "#38434F").multiplyScalar(back && i !== 1 ? 2.2 : 1));
    // macro : le couteau lisse l'enduit de gauche à droite
    const x0 = -1.15, x1 = 0.55; const kp = ease.inOut(seg(t, 0, 2.2)); const kx = lerp(x0, x1, kp);
    knife.position.set(kx, KNIFE_Y + Math.sin(kp * 7) * 0.006, FACADE_Z + 0.042); knife.rotation.set(0, 0.5, Math.PI / 2 + Math.sin(kp * 5) * 0.03, 'YZX'); // tranche verticale, manche en arrière
    knife.visible = !back && t < 6;
    const fw = Math.max(0.001, kx + 0.05 - x0 + 0.15);
    fresh.scale.set(fw, 0.33, 1); fresh.position.x = x0 - 0.15 + fw / 2; fresh.position.y = KNIFE_Y - 0.004; fresh.visible = !back;
    fresh2.scale.set(2.1, 0.17, 1); fresh2.position.set(x0 + 0.75, KNIFE_Y + 0.15, FACADE_Z + 0.005); fresh2.visible = false;
    art.root.visible = !back && camDist > 1.6; art.root.position.set(kx - 0.78, 0, FACADE_Z + 0.62); patch.visible = !back;
    heroBody.material = back ? doneWallM : [heroWallM, heroWallM, heroWallM, heroWallM, heroWallM, heroWallM];
    // recherches
    searches.forEach((s) => {
      const st = 4.35 + s.sp.userData.k * 0.34; const p = back ? 0 : ease.back(seg(t, st, st + 0.45));
      const out = back ? 0 : 1 - seg(t, 7.6, 8.0);
      const k = p * out; s.sp.visible = s.beam.visible = s.g2.visible = k > 0.01;
      s.sp.scale.set(s.sp.userData.w * k, s.sp.userData.w * 0.55 * k, 1); s.sp.position.y = s.sp.userData.base + Math.sin(t * 2 + s.sp.userData.k) * 0.4;
      s.beam.scale.y = 5.8 * clamp(p * 1.4); s.g2.material.opacity = 0.9 * k;
    });
    // camion
    if (back) {
      const dp = ease.out(seg(t, 43, 48.6)); const x = lerp(-78, VAN_PARK.x, dp);
      van.root.position.set(x, 0, VAN_PARK.z); van.roll(x); van.livery(1);
    } else { van.root.position.copy(VAN_PARK); van.roll(0); van.livery(0); }
    // écosystème
    eco.visible = back;
    if (back) {
      const show = (c, a, b) => { const p = ease.back(seg(t, a, b)); c.scale.setScalar(Math.max(0.001, p)); };
      show(ecoSite, 44.6, 45.4); show(ecoPost, 45.2, 46); show(ecoAd, 45.5, 46.3);
      [ecoSite, ecoPost, ecoAd].forEach((c, i) => { c.rotation.y = Math.sin(t * 0.6 + i) * 0.06; });
      links.forEach((l, i) => { const p = seg(t, 46 + i * 0.3, 47 + i * 0.3); l.m.geometry.setDrawRange(0, Math.floor(l.n * p / 3) * 3); l.m.visible = p > 0; });
      const va = tmp.copy(van.root.position).add(new THREE.Vector3(-0.6, 2.7, 0)); const vb = new THREE.Vector3(-0.5, 24.5, -14);
      const vp = seg(t, 47.4, 48.4); const mid = va.clone().lerp(vb, 0.5); const len = va.distanceTo(vb);
      vanLink.visible = vp > 0; vanLink.position.copy(va.clone().lerp(mid, vp)); vanLink.scale.set(1, len * vp, 1);
      vanLink.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
      const fp = seg(t, 46.2, 47.2);
      flows.forEach((f, i) => { const u = ((t - 46) * f.sp + f.ph) % 1; bez(f.a, f.c, f.b, u, P); fl.setMatrixAt(i, M.compose(P, Q.identity(), S.setScalar(fp * Math.sin(u * Math.PI) * 1.2 + 0.001))); });
      fl.instanceMatrix.needsUpdate = true; fl.visible = true;
      const bp = ease.outExpo(seg(t, 49.6, 51.2));
      big.root.visible = bp > 0; big.root.position.y = lerp(20, 46, bp); big.root.scale.setScalar(6 * Math.max(0.001, bp)); big.root.rotation.y = (1 - bp) * 2.4;
      bigGlow.material.opacity = 0.55 * bp; bigGlow.position.y = big.root.position.y;
    } else { fl.visible = false; big.root.visible = false; bigGlow.material.opacity = 0; }
  }
  return { scene, update, van, knife, hero, big, sunDir, lots };
}
