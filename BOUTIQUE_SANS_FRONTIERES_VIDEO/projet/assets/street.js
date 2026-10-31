/* Rue commerçante miniature : la boutique « Maison Aube » (fictive) au centre, vitrine, intérieur, panneau
   OUVERT/FERMÉ, rideau métallique ; immeubles voisins ; téléphones allumés dans les appartements ; intérieur avec le
   comptoir, l'ordinateur et la commerçante ; tour d'outils éparpillés ; vague bleue. Tombée de la nuit puis nuit. */
import * as THREE from "three";
import { std, basic, rbox, rng, canvasTex, card, setCardMap, tex, seg, ease, lerp, clamp, bez, glow, skyDome, v3 } from "./lib.js";
import { makeShopkeeper, makePhone, makeLaptop, STUDIO } from "./actors.js";
import { makeRack, makeGarment, AUBE } from "./garments.js";

export const SHOP = { w: 9, h: 16.6, ground: 4.2 };
export const COUNTER = v3(-1.4, 0, -4.2);
export const LAPTOP_POS = v3(-1.4, 1.02, -3.95);

export function buildStreet() {
  const scene = new THREE.Scene();
  const R = rng(17);
  const sky = skyDome("#24366E", "#F2A27E", "#C77E7A", 900); scene.add(sky);
  scene.fog = new THREE.Fog("#C98C8C", 60, 220);
  const hemi = new THREE.HemisphereLight("#AFC4FF", "#E2A27C", 0.7); scene.add(hemi);
  const sun = new THREE.DirectionalLight("#FFB07A", 1.6); sun.position.set(-30, 24, 30); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -20, near: 1, far: 140 }); sun.shadow.bias = -0.0004; scene.add(sun);

  // sol : trottoirs, chaussée pavée
  const pave = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#5A5C63"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) for (let x = (y / 32) % 2 ? 16 : 0; x < w; x += 32) { g.fillStyle = `hsl(225,6%,${30 + R() * 8}%)`; g.fillRect(x + 1, y + 1, 30, 30); } }, [40, 8]);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(200, 10), std("#ffffff", { map: pave, roughness: 0.9 })); road.rotation.x = -Math.PI / 2; road.position.set(0, 0, 8); road.receiveShadow = true; scene.add(road);
  const walkT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#C9C2B6"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(90,80,70,.35)"; for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }, [80, 2]);
  [[1.5, 3], [14.5, 3]].forEach(([z, d]) => { const s = new THREE.Mesh(new THREE.BoxGeometry(200, 0.16, d), std("#ffffff", { map: walkT, roughness: 0.95 })); s.position.set(0, 0.08, z); s.receiveShadow = true; scene.add(s); });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), std("#3E3B40")); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; scene.add(ground);

  // immeubles (façades en pierre, fenêtres, balcons, toits en zinc)
  const stone = (base) => canvasTex(512, 512, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 42) { g.fillStyle = "rgba(120,100,80,.16)"; g.fillRect(0, y, w, 2); } for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${R() < 0.5 ? "90,75,60" : "255,250,240"},${0.04 * R()})`; g.fillRect(R() * w, R() * h, 2, 2); } });
  const stones = ["#E6DACA", "#EDE3D5", "#E2D3C0", "#EAE0D6", "#DCCDB8"].map((c) => std("#ffffff", { map: stone(c), roughness: 0.92 }));
  const zinc = std("#6E7782", { roughness: 0.45, metalness: 0.5 });
  const winMats = []; const winOn = [];
  const iron = std("#1E1E22", { roughness: 0.5, metalness: 0.6 });
  function building(x, z, w, floors, face, idx, isShop) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = face > 0 ? 0 : Math.PI; scene.add(g);
    const ground = isShop ? SHOP.ground : 4.0; const fh = 3.1; const H = ground + floors * fh;
    const b0 = isShop ? ground : 0; // la boutique : rez-de-chaussée ouvert (vitrine + intérieur)
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, H - b0, 9), stones[idx % stones.length]); body.position.set(0, b0 + (H - b0) / 2, -4.5); body.castShadow = body.receiveShadow = true; g.add(body);
    if (isShop) { const back = new THREE.Mesh(new THREE.BoxGeometry(w, ground, 1.5), stones[idx % stones.length]); back.position.set(0, ground / 2, -8.25); g.add(back); [-1, 1].forEach((s) => { const side = new THREE.Mesh(new THREE.BoxGeometry(0.22, ground, 9), stones[idx % stones.length]); side.position.set(s * (w / 2 - 0.11), ground / 2, -4.5); side.castShadow = true; g.add(side); }); }
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.35, 0.5), stones[(idx + 1) % stones.length]); cornice.position.set(0, H, 0.1); g.add(cornice);
    // toit mansardé
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1, 1, 4, 1), zinc); roof.rotation.y = Math.PI / 4; roof.scale.set(w * 0.72, 3.2, 9 * 0.72); roof.position.set(0, H + 1.6, -4.5); roof.castShadow = true; g.add(roof);
    const nWin = Math.max(2, Math.round(w / 2.6));
    for (let f = 0; f < floors; f++) for (let i = 0; i < nWin; i++) {
      const wx = -w / 2 + (i + 0.5) * (w / nWin), wy = ground + f * fh + 1.55;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.15, 0.12), stones[(idx + 2) % stones.length]); frame.position.set(wx, wy, 0.02); g.add(frame);
      const m = new THREE.MeshBasicMaterial({ color: "#2B3140" }); const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.9), m); pane.position.set(wx, wy, 0.09); g.add(pane);
      winMats.push(m); winOn.push({ lit: R() < (isShop ? 0.0 : 0.55), warm: 0.7 + R() * 0.5, phone: !isShop && R() < 0.5, pos: new THREE.Vector3(wx, wy, 0.12), g, face, delay: R() });
      if (f % 2 === 0 || R() < 0.4) { const bal = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.45), iron); bal.position.set(wx, wy - 1.0, 0.25); g.add(bal); const rail = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 0.02), iron); rail.position.set(wx, wy - 0.72, 0.47); rail.material = iron; g.add(rail); }
    }
    if (!isShop) { const sf = new THREE.Mesh(new THREE.BoxGeometry(w - 0.6, 3.2, 0.1), std(["#3C4A5E", "#5A3E3A", "#3E5446", "#4A4458"][idx % 4], { roughness: 0.6 })); sf.position.set(0, 1.7, 0.05); g.add(sf);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(w - 1.6, 2.3), new THREE.MeshBasicMaterial({ color: "#5B4A3A" })); gl.position.set(0, 1.75, 0.11); g.add(gl); winMats.push(gl.material); winOn.push({ lit: R() < 0.5, warm: 0.6, phone: false, shopfront: true, pos: new THREE.Vector3(), g, face, delay: R() }); }
    return { g, H };
  }
  const left = [[-9.6, 9.6, 4], [-19.6, 10, 3], [-29.4, 9.4, 5], [-39, 9.6, 4]], right = [[9.6, 9.6, 3], [19.4, 9.8, 5], [29.2, 9.6, 4], [38.8, 9.4, 3]];
  let bi = 0;
  const shopB = building(0, 0, SHOP.w, 4, 1, 0, true);
  [...left, ...right].forEach(([x, w, f]) => building(x, 0, w, f, 1, ++bi, false));
  [[-40, 9.6, 4], [-30, 9.6, 4], [-20, 9.8, 5], [20, 9.8, 3], [30, 9.6, 4], [40, 9.6, 5]].forEach(([x, w, f]) => building(x, 16, w, f, -1, ++bi, false));
  // petite place en face de la boutique (recul pour la voir entière) : dallage, arbres sur les côtés, bancs
  const plazaT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#BDB4A6"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(80,70,60,.3)"; for (let i = 0; i < w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }, [12, 8]);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(30, 22), std("#ffffff", { map: plazaT, roughness: 0.95 })); plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, 0.05, 27); plaza.receiveShadow = true; scene.add(plaza);
  [[-11, 19], [11, 19], [-11, 26], [11, 26], [-11, 33], [11, 33]].forEach(([x, z]) => { const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 3, 8), std("#5A4636")); tr.position.set(x, 1.5, z); tr.castShadow = true; scene.add(tr); const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 1), std("#4F6A4A", { flatShading: true, roughness: 0.9 })); cr.position.set(x, 4.1, z); cr.castShadow = true; scene.add(cr); });
  [[-6, 18.5], [6, 18.5]].forEach(([x, z]) => { const b = new THREE.Mesh(rbox(2.2, 0.12, 0.6, 0.04), std("#7A5A40")); b.position.set(x, 0.5, z); scene.add(b); const bk = new THREE.Mesh(rbox(2.2, 0.5, 0.08, 0.03), b.material); bk.position.set(x, 0.85, z + 0.28); scene.add(bk); });

  // ---------------- devanture de Maison Aube
  const front = new THREE.Group(); scene.add(front);
  const ink = std("#24212A", { roughness: 0.45, metalness: 0.1 });
  const addB = (w, h, d, x, y, z, m = ink) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; front.add(b); return b; };
  addB(0.3, 4.2, 0.3, -4.35, 2.1, 0.12); addB(0.3, 4.2, 0.3, 4.35, 2.1, 0.12); addB(0.25, 3.3, 0.25, 1.6, 1.65, 0.12); // piliers
  addB(8.9, 0.5, 0.3, 0, 0.25, 0.12); // soubassement vitrine
  addB(5.6, 0.12, 0.3, -1.25, 3.42, 0.12); addB(1.9, 0.12, 0.3, 2.65, 3.25, 0.12);
  const fascia = new THREE.Mesh(new THREE.PlaneGeometry(7.6, 0.9), new THREE.MeshBasicMaterial({ map: tex("ui-enseigne.png"), color: new THREE.Color(1, 1, 1) })); fascia.position.set(0, 3.85, 0.28); front.add(fascia);
  addB(8.9, 1.0, 0.25, 0, 3.85, 0.13);
  // vitrine (verre) + logo en vitrophanie
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 2.9), new THREE.MeshStandardMaterial({ color: "#B9CBDA", transparent: true, opacity: 0.18, roughness: 0.05, metalness: 0.2, depthWrite: false })); glass.position.set(-1.25, 1.95, 0.1); front.add(glass);
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.81), new THREE.MeshBasicMaterial({ map: tex("ui-vitrine-logo.png"), transparent: true, opacity: 0.85, depthWrite: false })); decal.position.set(-1.25, 2.55, 0.105); front.add(decal);
  // porte vitrée + panneau OUVERT / FERMÉ (deux faces)
  const doorGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.0), glass.material); doorGlass.position.set(2.65, 1.6, 0.1); front.add(doorGlass);
  addB(0.08, 3.1, 0.12, 1.85, 1.55, 0.1); addB(0.08, 3.1, 0.12, 3.45, 1.55, 0.1); addB(1.6, 0.08, 0.12, 2.65, 0.06, 0.1);
  const handle = addB(0.04, 0.5, 0.06, 3.25, 1.4, 0.16, std("#C9A86A", { metalness: 0.9, roughness: 0.25 }));
  const signG = new THREE.Group(); signG.position.set(2.65, 2.25, -0.05); front.add(signG);
  const signOpen = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.29), new THREE.MeshBasicMaterial({ map: tex("ui-panneau-ouvert.png"), transparent: true })); signOpen.position.z = 0.006; signG.add(signOpen);
  const signClosed = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.29), new THREE.MeshBasicMaterial({ map: tex("ui-panneau-ferme.png"), transparent: true })); signClosed.rotation.y = Math.PI; signClosed.position.z = -0.006; signG.add(signClosed);
  const cord = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.006, 6, 24, Math.PI), basic("#C9A86A")); cord.position.set(2.65, 2.37, -0.05); front.add(cord);
  // store banne rayé
  const stripes = canvasTex(512, 64, (g, w, h) => { for (let x = 0; x < w; x += 64) { g.fillStyle = "#24212A"; g.fillRect(x, 0, 32, h); g.fillStyle = "#EFE6DA"; g.fillRect(x + 32, 0, 32, h); } }, [3, 1]);
  const awn = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 1.25), std("#ffffff", { map: stripes, side: THREE.DoubleSide, roughness: 0.85 })); awn.position.set(-1.25, 3.0, 0.62); awn.rotation.x = -1.0; awn.castShadow = true; front.add(awn);
  const val = new THREE.Mesh(new THREE.PlaneGeometry(5.8, 0.22), std("#ffffff", { map: stripes, side: THREE.DoubleSide, roughness: 0.85 })); val.position.set(-1.25, 2.55, 1.13); front.add(val);
  // appliques lumineuses, plantes
  const sconces = [-4.0, 4.0].map((x) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.3, 16), std("#24212A", { metalness: 0.5 })); l.position.set(x, 3.1, 0.45); front.add(l); const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), new THREE.MeshBasicMaterial({ color: "#FFD9A0" })); b.position.set(x, 2.95, 0.45); front.add(b); const gl = glow("#FFC98A", 1.6, 0.8); gl.position.set(x, 2.95, 0.5); front.add(gl); return { b, gl }; });
  [-3.6, 3.95].forEach((x) => { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.6, 20), std("#E58C6E", { roughness: 0.7 })); pot.position.set(x, 0.46, 0.75); pot.castShadow = true; front.add(pot); for (let i = 0; i < 7; i++) { const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), std("#5E7A55", { flatShading: true, roughness: 0.9 })); lf.position.set(x + (R() - 0.5) * 0.4, 0.95 + R() * 0.5, 0.75 + (R() - 0.5) * 0.4); lf.castShadow = true; front.add(lf); } });
  // rideau métallique (coffre + lames)
  const ribs = canvasTex(64, 256, (g, w, h) => { for (let y = 0; y < h; y += 16) { const gr = g.createLinearGradient(0, y, 0, y + 16); gr.addColorStop(0, "#B9C0C8"); gr.addColorStop(0.45, "#8E959E"); gr.addColorStop(0.55, "#6F7680"); gr.addColorStop(1, "#A9B0B8"); g.fillStyle = gr; g.fillRect(0, y, w, 16); } }, [1, 1]);
  const box = addB(8.0, 0.32, 0.4, 0.15, 3.55, 0.36, std("#5D646D", { metalness: 0.6, roughness: 0.4 }));
  const shutterMat = std("#ffffff", { map: ribs, metalness: 0.55, roughness: 0.42 });
  const shutter = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shutterMat); shutter.position.set(0.15, 3.4, 0.33); shutter.castShadow = true; front.add(shutter);
  const shutterBar = addB(7.9, 0.08, 0.08, 0.15, 3.4, 0.34, std("#4E545C", { metalness: 0.7, roughness: 0.35 }));

  // ---------------- intérieur de la boutique (lumière chaude)
  const inside = new THREE.Group(); scene.add(inside);
  const woodT = canvasTex(512, 512, (g, w, h) => { for (let x = 0; x < w; x += 48) { g.fillStyle = `hsl(30,${30 + R() * 8}%,${54 + R() * 8}%)`; g.fillRect(x, 0, 48, h); g.fillStyle = "rgba(70,40,20,.35)"; g.fillRect(x, 0, 2, h); } }, [3, 3]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 7.6), std("#ffffff", { map: woodT, roughness: 0.55 })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.01, -3.7); floor.receiveShadow = true; inside.add(floor);
  const wallM = std("#F1E7DA", { roughness: 0.95 });
  const iw = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallM); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; inside.add(m); return m; };
  iw(8.6, 4.2, 0, 2.1, -7.4, 0); iw(7.6, 4.2, -4.28, 2.1, -3.7, Math.PI / 2); iw(7.6, 4.2, 4.28, 2.1, -3.7, -Math.PI / 2);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 7.6), std("#F6EFE6")); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 4.15, -3.7); inside.add(ceil);
  const accent = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.2), std("#E58C6E", { roughness: 0.9 })); accent.position.set(-1.4, 2.1, -7.38); inside.add(accent);
  const racks = [makeRack(["chemise", "sweat", "robe"], 1.5), makeRack(["veste", "robe", "sweat"], 1.5)];
  racks[0].position.set(-2.6, 0, -1.6); racks[0].rotation.y = 0.5; racks[1].position.set(2.4, 0, -2.4); racks[1].rotation.y = -0.6; racks.forEach((r) => inside.add(r));
  const mannequins = [["robe", -2.9, -0.7], ["veste", 0.6, -0.9]].map(([id, x, z]) => { const g = new THREE.Group(); g.position.set(x, 0, z); const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8), std("#2B2B2E", { metalness: 0.6 })); stand.position.y = 0.6; g.add(stand); const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.04, 24), stand.material); g.add(base); const gm = makeGarment(id, { withHanger: false }); gm.position.y = 1.55; gm.scale.setScalar(1.25); g.add(gm); const neck = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), std("#E8DFD2")); neck.position.y = 2.0; neck.scale.y = 1.5; g.add(neck); inside.add(g); return g; });
  // étagère de pulls pliés
  const shelf = new THREE.Group(); shelf.position.set(2.2, 0, -7.1); inside.add(shelf);
  [0.6, 1.3, 2.0, 2.7].forEach((y) => { const s = new THREE.Mesh(rbox(2.6, 0.06, 0.5, 0.02), std("#B88B62", { roughness: 0.6 })); s.position.y = y; shelf.add(s); for (let i = 0; i < 5; i++) { const c = [AUBE.aube, AUBE.lin, AUBE.brume, AUBE.sable, AUBE.encre][(i + Math.round(y * 3)) % 5]; const f = new THREE.Mesh(rbox(0.4, 0.22, 0.34, 0.06), std(c, { roughness: 0.95 })); f.position.set(-1.05 + i * 0.52, y + 0.15, 0); f.castShadow = true; shelf.add(f); } });
  // comptoir, ordinateur portable, commerçante
  const counter = new THREE.Mesh(rbox(2.4, 1.0, 0.8, 0.05), std("#2E2A33", { roughness: 0.5 })); counter.position.set(COUNTER.x, 0.5, COUNTER.z); counter.castShadow = counter.receiveShadow = true; inside.add(counter);
  const top = new THREE.Mesh(rbox(2.5, 0.05, 0.9, 0.02), std("#C9A27C", { roughness: 0.4 })); top.position.set(COUNTER.x, 1.0, COUNTER.z); inside.add(top);
  const laptop = makeLaptop(tex("ui-d-entree.png"), { w: 0.62, h: 0.39 }); laptop.position.copy(LAPTOP_POS); laptop.position.z = COUNTER.z - 0.05; laptop.rotation.y = Math.PI; inside.add(laptop);
  const shop = makeShopkeeper(); shop.root.position.set(COUNTER.x, 0, COUNTER.z - 0.85); inside.add(shop.root);
  const interiorLights = [new THREE.PointLight("#FFCF96", 18, 9, 1.8), new THREE.PointLight("#FFD6A8", 12, 8, 1.8)];
  interiorLights[0].position.set(-1.5, 3.7, -2.5); interiorLights[1].position.set(2.2, 3.7, -4.5); interiorLights.forEach((l) => inside.add(l));
  const pend = [-1.5, 1.4].map((x) => { const sh = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.3, 24, 1, true), std("#24212A", { side: THREE.DoubleSide })); sh.position.set(x, 3.7, -2.8); inside.add(sh); const gl = glow("#FFD08A", 1.2, 0.9); gl.position.set(x, 3.55, -2.8); inside.add(gl); return gl; });

  // téléphones des habitants (scène 2)
  const phoneTex = tex("ui-phone-generic.png");
  const phones = [];
  winOn.forEach((w, i) => { if (!w.phone) return; const p = makePhone(phoneTex, { w: 0.62, h: 1.28 }); p.position.copy(w.pos).add(v3(0.0, -0.05, 0.45)); p.rotation.set(-0.05, 0, 0.06); w.g.add(p); const gl = glow("#9CC3FF", 1.7, 0); gl.position.copy(p.position).add(v3(0, 0, 0.1)); w.g.add(gl); phones.push({ p, gl, w, i }); });
  // lampadaires
  const lamps = [];
  for (let x = -45; x <= 45; x += 13) [[2.6], [13.4]].forEach(([z]) => { if (z > 8 && Math.abs(x + 6) < 12) return; // aucun lampadaire devant la boutique ni sur la place
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 4.6, 8), std("#26262B", { metalness: 0.5 })); pole.position.set(x + (z > 8 ? 6 : 0), 2.3, z); scene.add(pole); const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), new THREE.MeshBasicMaterial({ color: "#FFE2B0" })); head.position.set(pole.position.x, 4.7, z); scene.add(head); const gl = glow("#FFD08A", 2.8, 0.7); gl.position.copy(head.position); scene.add(gl); lamps.push({ head, gl }); });

  // ---------------- outils éparpillés (scène 2) : objets en volume qui tournent en tour autour de la commerçante
  const toolDefs = [["site", 11.0], ["produits", 11.9], ["design", 12.6], ["ads", 13.3], ["social", 14.7], ["cal", 14.2], ["seo", 15.4]];
  const tools = toolDefs.map(([n, e], i) => { const c = card(tex("ui-tool-" + n + ".png"), 0.66, 0.48, { depth: 0.08, radius: 0.05 }); inside.add(c); return { o: c, e, i, ph: i * 0.9, h: 0.8 + i * 0.4, r: 0.95 + (i % 2) * 0.2 }; });
  const icoM = (c) => std(c, { roughness: 0.35, emissive: c, emissiveIntensity: 0.12 });
  const extras = [];
  const mkMag = () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 10, 28), icoM("#5B6378"))); const h = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.18, 8), icoM("#2B3452")); h.position.set(0.13, -0.13, 0); h.rotation.z = 0.8; g.add(h); return g; };
  const mkMega = () => { const g = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.06, 0.26, 18, 1, true), icoM("#0F9D8A")); c.material.side = THREE.DoubleSide; c.rotation.z = Math.PI / 2; g.add(c); return g; };
  const mkBag = () => { const g = new THREE.Group(); g.add(new THREE.Mesh(rbox(0.26, 0.3, 0.12, 0.04), icoM("#EF6C3E"))); const h = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 8, 16, Math.PI), icoM("#2B3452")); h.position.y = 0.15; g.add(h); return g; };
  const mkCal = () => { const g = new THREE.Group(); g.add(new THREE.Mesh(rbox(0.3, 0.28, 0.06, 0.03), icoM("#F4F6FA"))); const t = new THREE.Mesh(rbox(0.3, 0.07, 0.065, 0.02), icoM("#3A9BE8")); t.position.y = 0.11; g.add(t); return g; };
  const mkPen = () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 6), icoM("#E9A800")); g.add(b); const tp = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 6), icoM("#F3D3A0")); tp.position.y = -0.2; tp.rotation.z = Math.PI; g.add(tp); return g; };
  const mkHeart = () => { const s = new THREE.Shape(); const k = 0.22; s.moveTo(0, -0.5 * k); s.bezierCurveTo(-0.9 * k, 0.05 * k, -0.45 * k, 0.75 * k, 0, 0.32 * k); s.bezierCurveTo(0.45 * k, 0.75 * k, 0.9 * k, 0.05 * k, 0, -0.5 * k); const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015 }), icoM("#E2457B")); m.geometry.center(); return m; };
  [[mkMag, 15.6], [mkMega, 13.5], [mkBag, 12.0], [mkCal, 14.4], [mkPen, 12.8], [mkHeart, 14.9], [mkBag, 11.3], [mkHeart, 15.1]].forEach(([f, e], i) => { const o = f(); o.traverse((m) => { if (m.isMesh) m.castShadow = true; }); inside.add(o); extras.push({ o, e, i: i + 7, ph: 0.4 + i * 0.83, h: 0.6 + ((i * 5) % 8) * 0.42, r: 0.8 + ((i * 3) % 4) * 0.15, spin: 1 + (i % 3) }); });
  const allItems = tools.concat(extras);
  const waveM = new THREE.MeshBasicMaterial({ color: "#5B8CFF", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const wave = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 10, 96), waveM); inside.add(wave);
  const blue = new THREE.PointLight(STUDIO.signal2, 0, 10, 1.6); inside.add(blue);
  // fenêtre SYNA qui sort de l'écran (version mobile réelle)
  const holo = card(tex("ui-m-entree-0.png"), 0.86, 1.8, { depth: 0.025, radius: 0.07, side: "#1B1D21" }); holo.visible = false; inside.add(holo);
  const holoTex = { e: [0, 1, 2, 3, 4, 5].map((i) => tex(`ui-m-entree-${i}.png`)), sent: tex("ui-m-entree-sent.png") };
  const lapTex = { entree: tex("ui-d-entree.png"), logo: tex("ui-screen-logo.png"), boutique: tex("ui-d-boutique-v2.png") };
  // grand téléphone du final dans la rue (boutique en ligne)
  const bigPhone = makePhone(tex("ui-a-product-robe.png")); bigPhone.visible = false; scene.add(bigPhone);
  const bigGlow = glow("#9CC3FF", 4, 0); scene.add(bigGlow);

  const C = v3(COUNTER.x, 1.5, COUNTER.z - 0.85);
  const scr = v3(LAPTOP_POS.x, 1.25, COUNTER.z - 0.1);
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  const Om = (t) => { const x = clamp(t, 11.0, 17.9) - 11.0; return 0.7 * x + 0.09 * x * x; };
  const skyU = sky.userData.mat.uniforms;
  const dusk = { top: new THREE.Color("#24366E"), mid: new THREE.Color("#F2A27E"), bot: new THREE.Color("#C77E7A"), fog: new THREE.Color("#C98C8C") };
  const night = { top: new THREE.Color("#0B1230"), mid: new THREE.Color("#3A3F78"), bot: new THREE.Color("#2A2748"), fog: new THREE.Color("#262A4A") };

  /** État de la rue à l'instant t (0–23 s : soir puis intérieur ; 46–53 s : nuit). */
  function update(t) {
    const isNight = t > 30; const n = isNight ? 1 : ease.inOut(seg(t, 4.0, 10.0)) * 0.55;
    skyU.top.value.copy(dusk.top).lerp(night.top, n); skyU.mid.value.copy(dusk.mid).lerp(night.mid, n); skyU.bottom.value.copy(dusk.bot).lerp(night.bot, n);
    scene.fog.color.copy(dusk.fog).lerp(night.fog, n);
    sun.intensity = lerp(1.6, 0.25, n); hemi.intensity = lerp(0.7, 0.35, n); sun.color.set(isNight ? "#7E8CC9" : "#FFB07A");
    // fenêtres et téléphones
    const phoneP = isNight ? 1 : seg(t, 8.6, 10.6);
    winOn.forEach((w, i) => { const lit = w.lit || (w.phone && phoneP > w.delay * 0.9); const k = lit ? 1 : 0; winMats[i].color.set(w.shopfront ? "#5B4A3A" : "#2B3140").lerp(new THREE.Color(w.shopfront ? "#FFC27A" : "#FFC98A"), k * (w.shopfront ? 0.8 : 1)).multiplyScalar(1 + k * w.warm * (isNight ? 1.6 : 1.1)); });
    phones.forEach(({ p, gl, w }) => { const k = isNight ? 0.6 : ease.back(seg(t, 8.6 + w.delay * 1.6, 9.0 + w.delay * 1.6)) * (1 - seg(t, 11.0, 11.4)); p.visible = k > 0.01; p.scale.setScalar(Math.max(0.001, k)); gl.material.opacity = 0.45 * clamp(k); });
    lamps.forEach(({ head, gl }) => { const k = isNight ? 1 : ease.out(seg(t, 3.0, 5.0)); head.material.color.set("#5A5A5A").lerp(new THREE.Color("#FFE2B0"), k).multiplyScalar(1 + k); gl.material.opacity = 0.75 * k; });
    // panneau, rideau, intérieur
    const flip = ease.inOut(seg(t, 3.7, 4.3)); signG.rotation.y = flip * Math.PI;
    const down = isNight ? 1 : ease.in(seg(t, 4.8, 7.8)); const L = Math.max(0.001, 3.38 * down);
    shutter.scale.set(7.9, L, 1); shutter.position.y = 3.4 - L / 2; shutterMat.map.repeat.set(1, L / 0.6); shutterBar.position.y = 3.4 - L;
    const shopLit = isNight ? 0 : 1 - seg(t, 7.6, 8.2);
    interiorLights.forEach((l, i) => (l.intensity = [18, 12][i] * (t > 11.0 && t < 23.5 ? 0.75 : shopLit)));
    pend.forEach((g) => (g.material.opacity = 0.9 * (t > 11.0 && t < 23.5 ? 0.8 : shopLit)));
    fascia.material.color.setScalar(isNight ? 1.25 : 1);
    sconces.forEach(({ b, gl }) => { gl.material.opacity = isNight ? 0.9 : 0.8; });
    // commerçante : retourne le panneau (près de la porte), puis au comptoir dans le magasin fermé
    const atDoor = t < 8.5;
    if (atDoor) { shop.root.position.set(2.45, 0, -0.75); shop.root.rotation.y = 0.15; const reach = Math.sin(seg(t, 3.4, 4.6) * Math.PI);
      shop.pose({ lookY: 0.15, armR: [-1.6 * reach - 0.1, 0.15, -0.7 * reach], armL: [0.05, 0, -0.1], browUp: 0.3 * reach, blink: Math.max(0, 1 - Math.abs(t - 2.2) / 0.08) }); }
    else {
      shop.root.position.set(COUNTER.x, 0, COUNTER.z - 0.85); shop.root.rotation.y = 0;
      const panic = ease.inOut(seg(t, 15.2, 15.8)) * (1 - ease.inOut(seg(t, 17.9, 18.5)));
      let look = t > 11.2 && t < 17.9 ? Math.sin((t - 11.2) * 2.0) * 0.7 : 0;
      const toHolo = ease.inOut(seg(t, 19.6, 20.3));
      const typing = (t > 20.3 && t < 22.5) ? Math.sin(t * 26) * 0.05 : 0;
      shop.pose({ lookY: look * (1 - seg(t, 17.9, 18.4)) - toHolo * 0.55, lookX: -0.2 + panic * 0.05 - toHolo * 0.2, worried: t > 13.8 && t < 18.2,
        armL: [lerp(-1.15 + typing, -2.75, panic), lerp(0, 0.35, panic), lerp(-0.9, -2.1, panic)], armR: [lerp(-1.15 - typing, -2.75, panic), lerp(0, 0.35, panic), lerp(-0.9, -2.1, panic)],
        browUp: Math.max(seg(t, 11.2, 11.6) * (1 - seg(t, 13.6, 14)), seg(t, 18.2, 18.5) * 1.2), blink: [12.5, 16.2, 19.0, 21.4].reduce((m, b) => Math.max(m, 1 - Math.abs(t - b) / 0.08), 0) });
    }
    // tour d'outils, gel, vague, aspiration dans l'écran
    const O = Om(t);
    allItems.forEach((it, i) => {
      const o = it.o; const ep = ease.out(seg(t, it.e, it.e + 0.7)); const sp = ease.in(seg(t, 18.4 + i * 0.04, 19.1 + i * 0.04));
      if (t < it.e || t > 19.4) { o.visible = false; return; } o.visible = sp < 0.995;
      const th = it.ph + O * (0.9 + (i % 3) * 0.12); const rr = it.r * (1 + 0.08 * Math.sin(O * 0.7 + i));
      tmp.set(C.x + Math.cos(th) * rr, it.h + 0.15 * Math.sin(O + i) + Math.min(0.6, O * 0.03), C.z + Math.sin(th) * rr);
      bez(scr, tmp2.set((scr.x + tmp.x) / 2, Math.max(scr.y, tmp.y) + 0.5, (scr.z + tmp.z) / 2), tmp, ep, o.position);
      if (sp > 0) { const mid = tmp2.copy(o.position).lerp(scr, 0.5); mid.y += 0.3; bez(o.position.clone(), mid, scr, sp, o.position); }
      o.scale.setScalar(Math.max(0.001, (0.3 + 0.7 * ep) * (1 - sp)));
      if (i < tools.length) { o.lookAt(tmp2.set(C.x + Math.cos(th) * 5, o.position.y + 0.3, C.z + Math.sin(th) * 5)); o.rotateZ(Math.sin(O + i) * 0.2); }
      else o.rotation.set(O * 0.6 * it.spin + i, O * it.spin + i * 2, Math.sin(O + i) * 0.4);
    });
    const wp = seg(t, 18.15, 19.1); wave.visible = wp > 0 && wp < 1; wave.position.copy(scr); wave.lookAt(scr.x, scr.y, scr.z + 5); wave.scale.setScalar(0.2 + ease.out(wp) * 6); waveM.opacity = (1 - wp) * 0.75;
    blue.position.copy(scr).add(v3(0, 0.2, 0.4)); blue.intensity = 10 * Math.max(0, 1 - Math.abs(t - 18.3) / 0.6);
    // écran du portable puis fenêtre SYNA
    let lm = lapTex.entree; if (t > 19.1 && t < 19.7) lm = lapTex.logo; laptop.userData.sm.map = lm;
    const hp = ease.inOut(seg(t, 19.8, 20.5));
    holo.visible = t > 19.8 && t < 23.6;
    const HP = v3(COUNTER.x + 0.75, 1.95, COUNTER.z - 0.25);
    bez(tmp.copy(scr), tmp2.set(scr.x + 0.4, 2.2, scr.z - 0.1), HP, hp, holo.position); holo.rotation.set(0, Math.PI, 0); holo.scale.setScalar(lerp(0.25, 0.7, hp));
    let hm = holoTex.e[0]; if (t >= 20.5) hm = holoTex.e[clamp(Math.floor((t - 20.5) / 0.32) + 1, 0, 5)]; if (t >= 22.55) hm = holoTex.sent; setCardMap(holo, hm);
    // téléphone de la nuit (scène 6)
    bigPhone.visible = isNight && t > 48.0;
  }
  return { scene, update, shop, laptop, holo, bigPhone, bigGlow, shopB, C, scr, HOLO: v3(COUNTER.x + 0.75, 1.95, COUNTER.z - 0.25) };
}
