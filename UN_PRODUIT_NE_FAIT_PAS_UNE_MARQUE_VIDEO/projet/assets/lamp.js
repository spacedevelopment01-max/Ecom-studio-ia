/* Objets de la Pub 03 : la lampe LED portable (produit fictif), le carton d'expédition qui s'ouvre, l'écrin KELVO
   (packaging fictif) et une version allégée de la lampe pour les murs de produits identiques. */
import * as THREE from "three";
import { std, basic, rbox, canvasTex, tex, rng } from "./lib.js";

export const KELVO = { nuit: "#0D0F14", ambre: "#FFB23F", corail: "#FF6A3D", brume: "#E9ECF2", graphite: "#2A2E37" };

/** Lampe LED portable : galet noir mat, anneau LED ambre, cerclage métal, bouton, port USB-C, anneau de dragonne.
    Hauteur ≈ 1,1 ; origine au centre. `lit` : intensité de l'anneau (0 à 2). */
export function makeLamp() {
  const g = new THREE.Group();
  const shell = std("#16181D", { roughness: 0.38, metalness: 0.25 });
  const metal = std("#B8BEC6", { roughness: 0.22, metalness: 0.95 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.44, 12, 40), shell); body.scale.set(1, 1, 0.62); body.castShadow = true; g.add(body);
  // cerclage métal (profil) et face avant légèrement bombée
  const st = new THREE.Shape(); const rr = 0.335, hl = 0.22;
  st.moveTo(rr, -hl); st.lineTo(rr, hl); st.absarc(0, hl, rr, 0, Math.PI, false); st.lineTo(-rr, -hl); st.absarc(0, -hl, rr, Math.PI, Math.PI * 2, false);
  const bandPts = st.getSpacedPoints(160).map((p) => new THREE.Vector3(p.x, p.y, 0));
  const band = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bandPts, true), 200, 0.016, 10, true), metal); g.add(band);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.25, 64), std("#0E1014", { roughness: 0.25, metalness: 0.4 })); face.position.z = 0.205; g.add(face);
  const ringM = new THREE.MeshStandardMaterial({ color: "#3A2A12", emissive: KELVO.ambre, emissiveIntensity: 1.6, roughness: 0.3 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.028, 16, 80), ringM); ring.position.z = 0.205; g.add(ring);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.155, 64), new THREE.MeshStandardMaterial({ color: "#1A1C22", roughness: 0.15, metalness: 0.3, emissive: "#FFD9A0", emissiveIntensity: 0.08 })); lens.position.z = 0.207; g.add(lens);
  // micro-LED (points) sur la lentille
  const dots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.009, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFE2B0").multiplyScalar(1.4) }), 37);
  const M = new THREE.Matrix4(); let k = 0;
  for (let r = 0; r < 4; r++) { const n = r === 0 ? 1 : r * 6; for (let i = 0; i < n && k < 37; i++) { const a = (i / n) * Math.PI * 2; M.makeTranslation(Math.cos(a) * r * 0.04, Math.sin(a) * r * 0.04, 0.209); dots.setMatrixAt(k++, M); } }
  dots.count = k; g.add(dots);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.012, 10, 64), metal); lip.position.z = 0.204; g.add(lip);
  // bouton (côté), port USB-C (bas), dragonne (haut)
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 24), metal); btn.rotation.z = Math.PI / 2; btn.position.set(0.335, 0.12, 0); g.add(btn);
  const btnDot = new THREE.Mesh(new THREE.CircleGeometry(0.012, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(KELVO.ambre).multiplyScalar(1.5) })); btnDot.rotation.y = Math.PI / 2; btnDot.position.set(0.352, 0.12, 0); g.add(btnDot);
  const port = new THREE.Mesh(rbox(0.11, 0.035, 0.05, 0.016), basic("#050608")); port.position.set(0, -0.545, 0.02); port.rotation.x = Math.PI / 2; g.add(port);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.014, 10, 32), metal); loop.position.set(0, 0.59, 0); loop.rotation.y = Math.PI / 2; g.add(loop);
  // gravure discrète (deux lignes) au dos
  [0.1, -0.06].forEach((y) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.006), basic("#2E3138")); l.position.set(0, y, -0.206); l.rotation.y = Math.PI; g.add(l); });
  const glowLight = new THREE.PointLight(KELVO.ambre, 0, 3, 2); glowLight.position.set(0, 0, 0.5); g.add(glowLight);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData = { ringM, glowLight, setLit(v) { ringM.emissiveIntensity = 1.6 * v; glowLight.intensity = 3 * v; } };
  return g;
}

/** Lampe allégée (deux maillages) pour les murs instanciés : corps + anneau. */
export function lampLite() {
  const body = new THREE.CapsuleGeometry(0.33, 0.44, 4, 16); body.scale(1, 1, 0.62);
  const ring = new THREE.TorusGeometry(0.19, 0.028, 6, 32); ring.translate(0, 0, 0.205);
  return { body, ring, bodyM: std("#16181D", { roughness: 0.4, metalness: 0.25 }), ringM: new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFC27A").multiplyScalar(1.2) }) };
}

/** Carton d'expédition : fond, quatre parois, quatre rabats articulés (ouverture 0 → 1), adhésif. */
export function makeBox() {
  const g = new THREE.Group();
  const R = rng(9);
  const kraft = canvasTex(512, 512, (c, w, h) => { c.fillStyle = "#B98D5A"; c.fillRect(0, 0, w, h); for (let i = 0; i < 14000; i++) { const a = R() < 0.5; c.fillStyle = `rgba(${a ? "90,60,30" : "235,205,160"},${0.08 * R()})`; c.fillRect(R() * w, R() * h, 1 + R() * 3, 1); } c.fillStyle = "rgba(70,45,20,.18)"; for (let y = 0; y < h; y += 9) c.fillRect(0, y, w, 1); }, [1, 1]);
  const card = std("#ffffff", { map: kraft, roughness: 0.92 });
  const inner = std("#A9824F", { roughness: 0.95 });
  const W = 1.6, H = 1.05, D = 1.6, T = 0.03;
  const add = (w, h, d, x, y, z, m = card) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = b.receiveShadow = true; g.add(b); return b; };
  add(W, T, D, 0, T / 2, 0);
  add(W, H, T, 0, H / 2, D / 2); add(W, H, T, 0, H / 2, -D / 2); add(T, H, D, W / 2, H / 2, 0); add(T, H, D, -W / 2, H / 2, 0);
  const tapeM = std("#C9A46A", { roughness: 0.4, metalness: 0.05, transparent: true, opacity: 0.85 });
  const flaps = [];
  [[0, D / 2, 1, 0], [0, -D / 2, -1, 0], [W / 2, 0, 0, 1], [-W / 2, 0, 0, -1]].forEach(([x, z, sz, sx], i) => {
    const hinge = new THREE.Group(); hinge.position.set(x, H, z); g.add(hinge);
    const long = sz !== 0; const fw = long ? W : D, fd = long ? D / 2 : W / 2;
    const flap = new THREE.Mesh(new THREE.BoxGeometry(long ? fw : T, T, long ? fd : fw), card); flap.castShadow = true;
    if (long) { flap.geometry = new THREE.BoxGeometry(fw, T, fd); flap.position.set(0, 0, -sz * fd / 2); }
    else { flap.geometry = new THREE.BoxGeometry(fd, T, fw); flap.position.set(-sx * fd / 2, 0, 0); }
    hinge.add(flap);
    if (long) { const tp = new THREE.Mesh(new THREE.BoxGeometry(0.24, T + 0.004, fd), tapeM); tp.position.copy(flap.position); hinge.add(tp); }
    hinge.userData = { sz, sx, long }; flaps.push(hinge);
  });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), new THREE.MeshStandardMaterial({ color: "#F4F1EA", roughness: 0.8 })); label.position.set(-0.35, 0.55, D / 2 + 0.017); g.add(label);
  [0.08, 0.0, -0.08].forEach((y, i) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.36 - i * 0.08, 0.025), basic("#3B3B3B")); l.position.set(-0.38 + i * 0.04, 0.55 + y, D / 2 + 0.018); g.add(l); });
  const inside = new THREE.Mesh(new THREE.BoxGeometry(W - 0.06, 0.02, D - 0.06), inner); inside.position.y = 0.05; g.add(inside);
  g.userData = {
    flaps, H,
    open(p) { flaps.forEach((h, i) => { const a = (Math.PI * 0.62 + (i % 2) * 0.08) * p; const { sz, sx, long } = h.userData; if (long) h.rotation.x = -sz * a; else h.rotation.z = sx * a; }); },
  };
  g.userData.open(0);
  return g;
}

/** Écrin KELVO : boîte premium (six faces texturées) qui peut se construire face par face autour de la lampe. */
export function makePack(maps) {
  const g = new THREE.Group(); const W = 1.3, H = 1.75, D = 0.95;
  const m = (k) => new THREE.MeshStandardMaterial({ map: maps[k], roughness: 0.55, metalness: 0.05 });
  const faces = [
    { k: "front", w: W, h: H, pos: [0, 0, D / 2], rot: [0, 0, 0] },
    { k: "back", w: W, h: H, pos: [0, 0, -D / 2], rot: [0, Math.PI, 0] },
    { k: "side", w: D, h: H, pos: [W / 2, 0, 0], rot: [0, Math.PI / 2, 0] },
    { k: "side", w: D, h: H, pos: [-W / 2, 0, 0], rot: [0, -Math.PI / 2, 0] },
    { k: "top", w: W, h: D, pos: [0, H / 2, 0], rot: [-Math.PI / 2, 0, 0] },
    { k: "bottom", w: W, h: D, pos: [0, -H / 2, 0], rot: [Math.PI / 2, 0, 0] },
  ].map((f) => { const mesh = new THREE.Mesh(new THREE.PlaneGeometry(f.w, f.h), m(f.k)); mesh.position.set(...f.pos); mesh.rotation.set(...f.rot); mesh.castShadow = true; mesh.userData = { pos: new THREE.Vector3(...f.pos), rot: new THREE.Euler(...f.rot) }; g.add(mesh); return mesh; });
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(W, H, D)), new THREE.LineBasicMaterial({ color: new THREE.Color(KELVO.ambre).multiplyScalar(1.6), transparent: true, opacity: 0 }));
  g.add(edge);
  g.userData = { faces, edge, W, H, D };
  return g;
}
