/* Acteurs 3D : l'artisan (personnage stylisé inventé pour la pub, autorisé par le propriétaire), le camion,
   le couteau à enduire, le logo fictif de 3M Plâtrerie Peinture et le vrai logo d'E-COM STUDIO ia. */
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { std, basic, rbox, roundRectShape, tex, lerp } from "./lib.js";

export const BRAND = { g: "#1E6B5E", ocre: "#E3A53C", chaux: "#F3EEE6", sable: "#D8CDBB", anth: "#1F2A2E" };
export const STUDIO = { ink: "#0A1024", signal: "#2F5BEA", signal2: "#3D6EF0", sky: "#7CC4FF", paper: "#F5F7FC" };

function cap(r, len, mat) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 14), mat); m.castShadow = true; m.receiveShadow = true; return m; }
function sph(r, mat, ws = 24, hs = 18) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), mat); m.castShadow = true; return m; }

/* ------------------------------------------------------------------ Artisan */
export function makeArtisan() {
  const skin = std("#E9AE86", { roughness: 0.55 });
  const skinDark = std("#DB9877", { roughness: 0.55 });
  const cloth = std("#F1EFE9", { roughness: 0.92 }); // combinaison de peintre (devient vert 3M)
  const tee = std("#7F8E9B", { roughness: 0.9 });
  const shoe = std("#3A3330", { roughness: 0.7 });
  const hair = std("#5A3B2A", { roughness: 0.9 });
  const capMat = std("#F1EFE9", { roughness: 0.85 });
  const white = basic("#ffffff"), black = std("#1A1414", { roughness: 0.3 });
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 0.8; root.add(hips);
  const torso = new THREE.Mesh(rbox(0.62, 0.66, 0.4, 0.16), cloth); torso.position.y = 0.36; torso.castShadow = true; hips.add(torso);
  const belly = new THREE.Mesh(rbox(0.6, 0.22, 0.4, 0.1), cloth); belly.position.y = 0.05; hips.add(belly);
  const pocket = new THREE.Mesh(rbox(0.26, 0.18, 0.04, 0.03), cloth); pocket.position.set(0, 0.42, 0.2); hips.add(pocket);
  // taches de peinture (personnage de peintre)
  [[0.18, 0.2, "#E3A53C"], [-0.2, 0.5, "#7DA7C9"], [0.1, -0.02, "#E3A53C"]].forEach(([x, y, c]) => { const d = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), std(c)); d.position.set(x, y, 0.203); hips.add(d); });
  const teeTop = new THREE.Mesh(rbox(0.66, 0.16, 0.42, 0.08), tee); teeTop.position.y = 0.66; hips.add(teeTop);
  // logo sur la poitrine (apparaît avec l'identité)
  const chestLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.17), new THREE.MeshStandardMaterial({ map: tex("ui-badge.png"), transparent: true, roughness: 0.6 }));
  chestLogo.position.set(-0.15, 0.47, 0.205); chestLogo.scale.setScalar(0.001); hips.add(chestLogo);
  // tête
  const head = new THREE.Group(); head.position.y = 0.98; hips.add(head);
  const neck = cap(0.08, 0.06, skin); neck.position.y = -0.18; head.add(neck);
  const skull = sph(0.37, skin, 40, 30); skull.scale.set(1, 1.03, 0.96); head.add(skull);
  [-1, 1].forEach((s) => { const e = sph(0.085, skinDark, 16, 12); e.position.set(s * 0.36, -0.02, 0); e.scale.set(0.6, 1, 1); head.add(e); });
  const nose = sph(0.07, skinDark, 20, 14); nose.position.set(0, -0.04, 0.35); nose.scale.set(1, 0.9, 0.9); head.add(nose);
  const eyes = [], pupils = [], brows = [];
  [-1, 1].forEach((s) => {
    const eye = sph(0.085, white, 20, 16); eye.position.set(s * 0.13, 0.07, 0.3); eye.scale.set(1, 1.15, 0.6); head.add(eye); eyes.push(eye);
    const p = sph(0.048, black, 16, 12); p.position.set(s * 0.13, 0.07, 0.35); head.add(p); pupils.push(p);
    const hl = sph(0.014, white, 8, 6); hl.position.set(s * 0.13 + 0.018, 0.095, 0.392); head.add(hl); p.userData.hl = hl;
    const b = new THREE.Mesh(rbox(0.13, 0.035, 0.04, 0.015), hair); b.position.set(s * 0.13, 0.205, 0.31); b.rotation.z = -s * 0.12; head.add(b); brows.push(b);
  });
  // bouche : sourire (arc) et inquiétude (arc inversé)
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.017, 8, 20, Math.PI), std("#7A2E2A", { roughness: 0.5 }));
  smile.rotation.z = Math.PI; smile.position.set(0, -0.12, 0.33); head.add(smile);
  const worry = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 20, Math.PI), std("#7A2E2A", { roughness: 0.5 }));
  worry.position.set(0, -0.19, 0.325); worry.visible = false; head.add(worry);
  // cheveux et casquette
  const hairBack = sph(0.372, hair, 32, 20); hairBack.scale.set(1.01, 0.9, 0.97); hairBack.position.set(0, 0.03, -0.03); head.add(hairBack);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.385, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2), capMat); dome.position.y = 0.16; dome.scale.y = 0.82; dome.castShadow = true; head.add(dome);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 32, 1, false, -Math.PI / 2, Math.PI), capMat); brim.position.set(0, 0.17, 0.22); brim.rotation.x = 0.12; brim.scale.set(1, 1, 1.05); brim.castShadow = true; head.add(brim);
  const capLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.17), new THREE.MeshStandardMaterial({ map: tex("ui-badge.png"), transparent: true }));
  capLogo.position.set(0, 0.3, 0.3); capLogo.rotation.x = -0.6; capLogo.scale.setScalar(0.001); head.add(capLogo);
  // bras
  const arms = [-1, 1].map((s) => {
    const sh = new THREE.Group(); sh.position.set(s * 0.38, 0.6, 0); hips.add(sh);
    const up = cap(0.1, 0.18, tee); up.position.y = -0.15; sh.add(up);
    const el = new THREE.Group(); el.position.y = -0.32; sh.add(el);
    const fo = cap(0.085, 0.2, skin); fo.position.y = -0.14; el.add(fo);
    const hand = sph(0.1, skin, 18, 14); hand.position.y = -0.31; hand.scale.set(1, 1.05, 0.8); el.add(hand);
    return { sh, el, hand };
  });
  // jambes
  const legs = [-1, 1].map((s) => {
    const hp = new THREE.Group(); hp.position.set(s * 0.16, -0.02, 0); hips.add(hp);
    const th = cap(0.12, 0.24, cloth); th.position.y = -0.2; hp.add(th);
    const kn = new THREE.Group(); kn.position.y = -0.4; hp.add(kn);
    const sn = cap(0.11, 0.2, cloth); sn.position.y = -0.16; kn.add(sn);
    const sho = new THREE.Mesh(rbox(0.21, 0.13, 0.34, 0.06), shoe); sho.position.set(0, -0.34, 0.06); sho.castShadow = true; kn.add(sho);
    return { hp, kn };
  });
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const api = {
    root, hips, head, arms, legs, eyes, pupils, brows, smile, worry, chestLogo, capLogo, mats: { cloth, capMat, tee },
    /** Posture assise ou debout. */
    pose({ sit = 0, lookY = 0, lookX = 0, armL = [0, 0, 0], armR = [0, 0, 0], browUp = 0, worried = false, blink = 0, bob = 0 } = {}) {
      hips.position.y = lerp(0.8, 0.62, sit) + bob;
      legs.forEach((l) => { l.hp.rotation.x = -1.45 * sit; l.kn.rotation.x = 1.5 * sit; });
      head.rotation.set(lookX, lookY, 0);
      const set = (a, [x, z, e], s) => { a.sh.rotation.set(x, 0, s * 0.12 + z * s); a.el.rotation.x = e; };
      set(arms[0], armL, -1); set(arms[1], armR, 1);
      brows.forEach((b, i) => { b.position.y = 0.205 + browUp * 0.04; b.rotation.z = (i ? 1 : -1) * (worried ? -0.28 : 0.12); });
      smile.visible = !worried; worry.visible = worried;
      eyes.forEach((e) => (e.scale.y = 1.15 * (1 - blink * 0.9)));
      pupils.forEach((p) => { p.visible = blink < 0.5; p.userData.hl.visible = blink < 0.5; });
    },
    /** Tenue aux couleurs de la marque (0 = blanc de peintre, 1 = vert 3M). */
    brand(p) {
      cloth.color.set("#F1EFE9").lerp(new THREE.Color(BRAND.g), p);
      capMat.color.set("#F1EFE9").lerp(new THREE.Color(BRAND.g), p);
      tee.color.set("#7F8E9B").lerp(new THREE.Color(BRAND.chaux), p);
      const s = Math.max(0.001, p < 0.6 ? 0.001 : (p - 0.6) / 0.4);
      chestLogo.scale.setScalar(s); capLogo.scale.setScalar(s);
    },
  };
  api.pose();
  return api;
}

/* ------------------------------------------------------------------ Camion */
export function makeVan() {
  const g = new THREE.Group();
  const paint = std("#F5F6F3", { roughness: 0.35, metalness: 0.1 });
  const glass = std("#1C2630", { roughness: 0.15, metalness: 0.4 });
  const dark = std("#2A2D31", { roughness: 0.7 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const box = add(rbox(3.5, 2.0, 1.86, 0.14), paint, -0.55, 1.42, 0);
  add(rbox(1.35, 1.35, 1.84, 0.16), paint, 1.7, 1.08, 0); // cabine
  add(rbox(0.9, 0.62, 1.82, 0.14), paint, 1.95, 0.72, 0); // capot
  const ws = add(new THREE.BoxGeometry(0.04, 0.62, 1.6), glass, 2.33, 1.45, 0); ws.rotation.z = -0.35;
  [-1, 1].forEach((s) => { add(new THREE.BoxGeometry(0.75, 0.52, 0.02), glass, 1.68, 1.42, s * 0.925); });
  add(rbox(0.16, 0.26, 1.9, 0.05), dark, 2.42, 0.48, 0); // pare-chocs
  add(rbox(0.12, 0.2, 1.9, 0.05), dark, -2.32, 0.5, 0);
  const lights = [];
  [-1, 1].forEach((s) => { lights.push(add(rbox(0.06, 0.13, 0.3, 0.03), basic("#FFF3D6"), 2.4, 0.86, s * 0.66)); add(rbox(0.05, 0.3, 0.14, 0.02), basic("#C0392B"), -2.31, 1.0, s * 0.82); });
  // roues
  const wheels = [];
  [[1.55, 1], [1.55, -1], [-1.5, 1], [-1.5, -1]].forEach(([x, s]) => {
    const w = new THREE.Group(); w.position.set(x, 0.4, s * 0.86); g.add(w);
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.28, 28), dark); tire.rotation.x = Math.PI / 2; tire.castShadow = true; w.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.29, 20), std("#C7CCD2", { metalness: 0.7, roughness: 0.3 })); rim.rotation.x = Math.PI / 2; w.add(rim);
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.3), std("#9AA1A8", { metalness: 0.6 })); spoke.position.z = 0; w.add(spoke);
    wheels.push(w);
  });
  // galerie et échelle
  const al = std("#B9BEC4", { metalness: 0.7, roughness: 0.35 });
  [-0.7, 0.7].forEach((z) => add(new THREE.BoxGeometry(3.3, 0.06, 0.06), al, -0.55, 2.5, z));
  [-2, -1, 0, 0.9].forEach((x) => add(new THREE.BoxGeometry(0.06, 0.08, 1.5), al, x, 2.47, 0));
  [-0.28, 0.28].forEach((z) => add(new THREE.BoxGeometry(3.0, 0.05, 0.05), al, -0.6, 2.58, z));
  for (let i = 0; i < 9; i++) add(new THREE.BoxGeometry(0.04, 0.04, 0.56), al, -2 + i * 0.34, 2.58, 0);
  // habillage 3M (révélé de l'arrière vers l'avant)
  const lt = tex("ui-livery.png");
  const liv = [-1, 1].map((s) => {
    const map = lt.clone(); map.needsUpdate = true; map.wrapS = THREE.ClampToEdgeWrapping;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map, roughness: 0.4, metalness: 0.05 }));
    m.rotation.y = s > 0 ? 0 : Math.PI; m.position.set(-0.55, 1.42, s * 0.935); m.userData = { s, map }; g.add(m); return m;
  });
  const api = {
    root: g, wheels, lights,
    livery(p) {
      liv.forEach((m) => {
        const w = 3.3, h = 3.3 * 520 / 1400; const pw = Math.max(0.0001, p);
        m.visible = p > 0.001; m.scale.set(w * pw, h, 1);
        const { s, map } = m.userData;
        // ancrage à l'arrière du camion (x = -2.2) ; la texture se dévoile sans se déformer
        map.repeat.set(pw, 1); map.offset.set(s > 0 ? 0 : 1 - pw, 0);
        m.position.x = -0.55 - w / 2 + (w * pw) / 2;
      });
    },
    roll(dist) { wheels.forEach((w) => (w.rotation.z = -dist / 0.4)); },
  };
  api.livery(0);
  return api;
}

/* ------------------------------------------------------------------ Couteau à enduire */
export function makeKnife() {
  const g = new THREE.Group();
  const steel = std("#E9EDF2", { metalness: 0.85, roughness: 0.2 });
  const sh = new THREE.Shape(); sh.moveTo(-0.17, -0.075); sh.lineTo(0.17, -0.075); sh.lineTo(0.06, 0.075); sh.lineTo(-0.06, 0.075); sh.closePath();
  const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.002, bevelSegments: 1 }), steel); blade.castShadow = true; g.add(blade);
  const ferrule = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.035, 0.02), std("#A9B0B8", { metalness: 0.8, roughness: 0.3 })); ferrule.position.set(0, 0.09, 0.01); g.add(ferrule);
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.12, 6, 12), std("#2B2B2E", { roughness: 0.5 })); handle.position.set(0, 0.17, 0.035); handle.rotation.x = 0.45; g.add(handle);
  const grip = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.05, 6, 12), std(BRAND.ocre, { roughness: 0.6 })); grip.position.set(0, 0.215, 0.058); grip.rotation.x = 0.45; g.add(grip);
  const bead = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.3, 6, 12), std("#F4F1EA", { roughness: 0.35 })); bead.rotation.z = Math.PI / 2; bead.position.set(0, -0.078, -0.004); bead.scale.set(1, 1, 0.7); g.add(bead);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

/* ------------------------------------------------------------------ Logo 3D fictif « 3M » */
export function makeBadge3M(glyphs) {
  const g = new THREE.Group(); const S = 1 / 100; // 240 unités SVG → 2,4 m
  const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(roundRectShape(228 * S, 228 * S, 52 * S), { depth: 0.3, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4, curveSegments: 16 }), std(BRAND.g, { roughness: 0.35, metalness: 0.15 }));
  plate.position.z = -0.3; plate.castShadow = true; g.add(plate);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg">${glyphs.map((d) => `<path d="${d}"/>`).join("")}</svg>`;
  const data = new SVGLoader().parse(svg);
  const letters = new THREE.Group(); g.add(letters);
  const lm = std(BRAND.chaux, { roughness: 0.4 });
  const parts = [];
  data.paths.forEach((p) => {
    SVGLoader.createShapes(p).forEach((sh) => {
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 14, bevelEnabled: true, bevelThickness: 2, bevelSize: 1.2, bevelSegments: 2, curveSegments: 10 });
      geo.scale(S, -S, -S); geo.translate(-120 * S, 120 * S, 0.19); // double inversion : faces avant conservées
      const m = new THREE.Mesh(geo, lm); m.castShadow = true; letters.add(m); parts.push(m);
    });
  });
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3((58 - 120) * S, -(176 - 120) * S, 0.05), new THREE.Vector3(0, -(204 - 120) * S, 0.05), new THREE.Vector3((184 - 120) * S, -(168 - 120) * S, 0.05));
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 7 * S, 12, false), std(BRAND.ocre, { roughness: 0.35, emissive: BRAND.ocre, emissiveIntensity: 0.15 }));
  tube.castShadow = true; g.add(tube);
  const caps = [0, 1].map((u) => { const c = new THREE.Mesh(new THREE.SphereGeometry(7 * S, 16, 12), tube.material); c.position.copy(curve.getPoint(u)); g.add(c); return c; });
  const tubeCount = tube.geometry.index.count;
  return {
    root: g, plate, letters, parts, tube, caps,
    /** Tracé du trait d'enduit (0→1). */
    swoosh(p) { const n = Math.floor(tubeCount * p / 6) * 6; tube.geometry.setDrawRange(0, n); tube.visible = p > 0.01; caps[0].visible = p > 0.01; caps[1].visible = p > 0.99; },
  };
}

/* ------------------------------------------------------------------ Vrai logo E-COM STUDIO ia (SVG du studio) */
export function makeLogoE() {
  const g = new THREE.Group(); const S = 1 / 32; // 64 unités → 2 m
  const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(roundRectShape(64 * S, 64 * S, 16 * S), { depth: 0.32, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 5, curveSegments: 18 }), std(STUDIO.ink, { roughness: 0.32, metalness: 0.2 }));
  plate.position.z = -0.32; g.add(plate);
  const pts = [[18, 20], [40, 20], [40, 26], [25, 26], [25, 30], [38, 30], [38, 36], [25, 36], [25, 40], [40, 40], [40, 46], [18, 46]];
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2((x - 32) * S, -(y - 32) * S)));
  const e = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2 }), std("#F4F6FB", { roughness: 0.35, metalness: 0.1 }));
  g.add(e);
  const dot = new THREE.Mesh(new THREE.CylinderGeometry(5 * S, 5 * S, 0.12, 32), std(STUDIO.signal, { emissive: STUDIO.signal2, emissiveIntensity: 1.6, roughness: 0.3 }));
  dot.rotation.x = Math.PI / 2; dot.position.set((46 - 32) * S, -(44 - 32) * S, 0.06); g.add(dot);
  return { root: g, plate, e, dot };
}
