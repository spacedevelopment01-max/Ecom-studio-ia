// Logos en volume, reconstruits depuis leurs tracés SVG exacts (ui/img/logo-atelier-bleu.svg, ui/img/logo-studio.svg).
import * as THREE from "three";

function rectArrondi(x, y, w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
/** Coordonnées SVG (0..64, y vers le bas) → unités, centrées. */
const conv = (taille) => (x, y) => [((x - 32) / 64) * taille, ((32 - y) / 64) * taille];
function rectSvg(taille, x, y, w, h, r) {
  const c = conv(taille), [X, Y] = c(x, y + h), k = taille / 64;
  return rectArrondi(X, Y, w * k, h * k, r * k);
}
const extru = (shape, prof, biseau) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth: prof, bevelEnabled: true, bevelThickness: biseau, bevelSize: biseau, bevelSegments: 3, curveSegments: 10 });
  return g;
};

/** Logo ATELIER BLEU : pastille bleue, manchon blanc, monture chromée, manche blanc. Renvoie { groupe, pieces }. */
export function logoAtelierBleu(M, taille = 3) {
  const k = taille / 64, groupe = new THREE.Group(), pieces = {};
  const pastille = new THREE.Mesh(extru(rectSvg(taille, 0, 0, 64, 64, 14), 10 * k, 1.2 * k), M.bleuLaque);
  pastille.position.z = -10 * k;
  const blancLogo = new THREE.MeshPhysicalMaterial({ color: 0xf5f7fb, roughness: 0.3, clearcoat: 0.8 });
  const manchon = new THREE.Mesh(extru(rectSvg(taille, 12, 14, 31, 13, 6.5), 3.2 * k, 0.9 * k), blancLogo);
  const manche = new THREE.Mesh(extru(rectSvg(taille, 29.4, 37.5, 5.2, 14, 2.6), 3.2 * k, 0.9 * k), blancLogo);
  const c = conv(taille);
  const pts = [[43, 20.5], [48.5, 20.5], [50.3, 21.2], [51, 23], [51, 30.5], [50.3, 32.3], [48.5, 33], [34, 33], [32.6, 33.6], [32, 35], [32, 38]].map(([x, y]) => new THREE.Vector3(...c(x, y), 1.6 * k));
  const monture = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.2), 80, 1.6 * k, 12), M.chrome);
  for (const m of [pastille, manchon, manche, monture]) { m.castShadow = true; m.receiveShadow = true; groupe.add(m); }
  Object.assign(pieces, { pastille, manchon, manche, monture });
  return { groupe, pieces, blanc: blancLogo };
}

/** Pictogramme E-COM STUDIO IA : carré sombre, « E » blanc, point bleu (tracé : M18 20h22v6H25v4h13v6H25v4h15v6H18z). */
export function logoStudio(M, taille = 10) {
  const k = taille / 64, groupe = new THREE.Group(), c = conv(taille);
  const fond = new THREE.Mesh(extru(rectSvg(taille, 0, 0, 64, 64, 16), 6 * k, 1.5 * k), new THREE.MeshPhysicalMaterial({ color: 0x0a1024, roughness: 0.18, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }));
  fond.position.z = -6 * k;
  const e = new THREE.Shape();
  [[18, 20], [40, 20], [40, 26], [25, 26], [25, 30], [38, 30], [38, 36], [25, 36], [25, 40], [40, 40], [40, 46], [18, 46]].forEach(([x, y], i) => { const [X, Y] = c(x, y); i ? e.lineTo(X, Y) : e.moveTo(X, Y); });
  const E = new THREE.Mesh(extru(e, 3 * k, 0.5 * k), new THREE.MeshPhysicalMaterial({ color: 0xf5f7fc, roughness: 0.35, clearcoat: 0.6, emissive: 0xffffff, emissiveIntensity: 0.15 }));
  const point = new THREE.Mesh(new THREE.CylinderGeometry(5 * k, 5 * k, 3 * k, 48), new THREE.MeshPhysicalMaterial({ color: 0x2f5bea, emissive: 0x2f5bea, emissiveIntensity: 0.45, roughness: 0.2, clearcoat: 1 }));
  point.rotation.x = Math.PI / 2; const [px, py] = c(46, 44); point.position.set(px, py, 1.5 * k);
  for (const m of [fond, E, point]) { m.castShadow = true; groupe.add(m); }
  return { groupe, fond, E, point };
}
