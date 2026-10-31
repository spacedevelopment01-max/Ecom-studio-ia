/* Vêtements 3D de « Maison Aube » (marque fictive créée pour la publicité) : silhouettes extrudées et arrondies
   (aspect tissu), détails cousus, cintre. Utilisés dans le film et pour les photos produits du site. */
import * as THREE from "three";

export const AUBE = { encre: "#24212A", aube: "#E58C6E", lin: "#EFE6DA", sable: "#CDB89E", brume: "#9AA7B5", creme: "#FAF6F0" };
export const PRODUCTS = [
  { id: "sweat", nom: "Sweat Aube", desc: "Coton bio brossé, coupe ample.", color: "#E58C6E" },
  { id: "chemise", nom: "Chemise Lin", desc: "Lin lavé, col officier.", color: "#EFE6DA" },
  { id: "robe", nom: "Robe Brume", desc: "Viscose fluide, longueur midi.", color: "#9AA7B5" },
  { id: "veste", nom: "Veste Sable", desc: "Toile de coton, poches plaquées.", color: "#CDB89E" },
];

let fabricTex = null;
function fabric() {
  if (fabricTex) return fabricTex;
  const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
  g.fillStyle = "#808080"; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) { g.fillStyle = `rgba(255,255,255,${0.05 + ((y * 37) % 11) / 200})`; g.fillRect(0, y, 256, 1); }
  for (let x = 0; x < 256; x += 2) { g.fillStyle = `rgba(0,0,0,${0.04 + ((x * 53) % 7) / 200})`; g.fillRect(x, 0, 1, 256); }
  fabricTex = new THREE.CanvasTexture(c); fabricTex.wrapS = fabricTex.wrapT = THREE.RepeatWrapping; fabricTex.repeat.set(6, 6);
  return fabricTex;
}
const cloth = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, bumpMap: fabric(), bumpScale: 0.6 });
const mirror = (half) => { const pts = half.map(([x, y]) => new THREE.Vector2(x, y)); const back = half.slice().reverse().map(([x, y]) => new THREE.Vector2(-x, y)); return pts.concat(back); };
function puffy(points, color, depth = 0.04) {
  const shape = new THREE.Shape(points);
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.028, bevelSize: 0.022, bevelSegments: 5, curveSegments: 16 });
  geo.translate(0, 0, -depth / 2); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, cloth(color)); m.castShadow = true; m.receiveShadow = true; return m;
}
function hanger() {
  const g = new THREE.Group(); const wood = new THREE.MeshStandardMaterial({ color: "#B88B62", roughness: 0.5 });
  const metal = new THREE.MeshStandardMaterial({ color: "#B9BEC4", metalness: 0.9, roughness: 0.25 });
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.21, -0.03, 0), new THREE.Vector3(0, 0.11, 0), new THREE.Vector3(0.21, -0.03, 0));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.012, 8, false), wood));
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.06, 6), metal); stem.position.y = 0.07; g.add(stem);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.005, 6, 24, Math.PI * 1.25), metal); hook.position.set(0.0, 0.125, 0); hook.rotation.z = -Math.PI * 0.25; g.add(hook);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/** Un vêtement (groupe d'environ 0,9 m de haut, cintre compris, origine au centre du vêtement). */
export function makeGarment(id, { withHanger = true } = {}) {
  const p = PRODUCTS.find((x) => x.id === id); const g = new THREE.Group(); const col = p.color;
  const detail = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
  if (id === "sweat") {
    g.add(puffy(mirror([[0.07, 0.3], [0.2, 0.27], [0.43, 0.0], [0.36, -0.06], [0.22, 0.12], [0.22, -0.28], [0, -0.3]]).concat([new THREE.Vector2(-0.07, 0.3), new THREE.Vector2(0, 0.25)]), col, 0.05));
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.11), detail(new THREE.Color(col).multiplyScalar(0.88))); band.position.y = -0.29; g.add(band);
    [-1, 1].forEach((s) => { const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.045, 0.1), band.material); cuff.position.set(s * 0.4, -0.04, 0); cuff.rotation.z = s * 0.85; g.add(cuff); });
    const neck = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 8, 24, Math.PI), band.material); neck.rotation.z = Math.PI; neck.position.set(0, 0.29, 0.05); g.add(neck);
  } else if (id === "chemise") {
    g.add(puffy(mirror([[0.05, 0.31], [0.19, 0.28], [0.46, -0.12], [0.39, -0.17], [0.21, 0.08], [0.22, -0.32], [0.1, -0.35], [0, -0.33]]).concat([new THREE.Vector2(-0.05, 0.31), new THREE.Vector2(0, 0.27)]), col, 0.04));
    const btn = detail("#C9BBA6"); for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), btn); b.position.set(0, 0.2 - i * 0.12, 0.05); g.add(b); }
    [-1, 1].forEach((s) => { const c = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.035, 0.02), detail(new THREE.Color(col).multiplyScalar(0.94))); c.position.set(s * 0.045, 0.29, 0.052); c.rotation.z = s * -0.35; g.add(c); });
  } else if (id === "robe") {
    g.add(puffy(mirror([[0.05, 0.36], [0.09, 0.36], [0.13, 0.16], [0.12, 0.04], [0.15, -0.05], [0.31, -0.5], [0, -0.52]]).concat([new THREE.Vector2(-0.05, 0.36), new THREE.Vector2(0, 0.24)]), col, 0.035));
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.01, 6, 16), detail(new THREE.Color(col).multiplyScalar(0.8))); tie.position.set(0.05, 0.03, 0.05); g.add(tie);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.03, 0.09), tie.material); belt.position.y = 0.03; g.add(belt);
    g.position.y = -0.05;
  } else {
    g.add(puffy(mirror([[0.06, 0.32], [0.21, 0.29], [0.47, -0.16], [0.4, -0.21], [0.23, 0.06], [0.24, -0.42], [0, -0.42]]).concat([new THREE.Vector2(-0.06, 0.32), new THREE.Vector2(0, 0.12)]), col, 0.05));
    const dark = detail(new THREE.Color(col).multiplyScalar(0.8));
    [-1, 1].forEach((s) => { const lap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.02), dark); lap.position.set(s * 0.05, 0.19, 0.06); lap.rotation.z = s * 0.38; g.add(lap); const pk = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.02), dark); pk.position.set(s * 0.12, -0.24, 0.058); g.add(pk); });
    for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), detail(AUBE.encre)); b.position.set(0.02, 0.0 - i * 0.12, 0.062); g.add(b); }
  }
  if (withHanger) { const h = hanger(); h.position.y = id === "robe" ? 0.4 : 0.31; if (id === "robe") h.scale.x = 0.62; g.add(h); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData.id = id;
  return g;
}

/** Portant de boutique : barre, pieds, vêtements suspendus. */
export function makeRack(ids, width = 1.6) {
  const g = new THREE.Group(); const metal = new THREE.MeshStandardMaterial({ color: "#2B2B2E", metalness: 0.7, roughness: 0.35 });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, width, 10), metal); bar.rotation.z = Math.PI / 2; bar.position.y = 1.55; g.add(bar);
  [-1, 1].forEach((s) => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.55, 8), metal); leg.position.set(s * width / 2, 0.775, 0); g.add(leg); const foot = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.45), metal); foot.position.set(s * width / 2, 0.015, 0); g.add(foot); });
  const items = ids.map((id, i) => { const gm = makeGarment(id); gm.position.set(-width / 2 + (i + 0.5) * (width / ids.length), 1.12, 0); gm.rotation.y = (i % 2 ? 1 : -1) * 0.12; g.add(gm); return gm; });
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData.items = items;
  return g;
}
