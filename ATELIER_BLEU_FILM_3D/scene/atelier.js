// Séquence « Identité » : la caméra traverse l'œil du B de l'enseigne et entre dans un atelier graphique monumental.
// Le logo se forme en volume, les couleurs se déploient en grandes surfaces, la typographie se construit ;
// composition stable « Logo / Couleurs / Typographie », puis résultat concret : enseigne, carte et papier à en-tête.
import * as THREE from "three";
import { ramp, mix, eio, eio2, eout, eout5, ein, eback, fenetre, clamp01, COUL, RoundedBoxGeometry, lettres3D, Ecran } from "./lib.js";
import { logoAtelierBleu } from "./marques.js";

export async function atelier(ctx) {
  const { scene, M, T, P, mot, cles, legende, etiquette, ZONES, ombres, contre, MODE, oeilB } = ctx;
  const B0 = oeilB;
  const O = new THREE.Vector3(B0.x, B0.y, B0.z - 70); // centre de la composition
  const g = new THREE.Group(); g.position.copy(O); scene.add(g);
  const monde = (x, y, z) => [O.x + x, O.y + y, O.z + z];

  // ---------- lieu : sol miroir, portiques monumentaux, lignes de lumière ----------
  const SOL = -16;
  const sol = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M.sol); sol.rotation.x = -Math.PI / 2; sol.position.y = SOL; sol.receiveShadow = true; g.add(sol);
  for (let i = -6; i <= 6; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 300), M.lueur); l.position.set(i * 8, SOL + 0.02, 0); g.add(l); }
  const portiques = [];
  for (let i = 0; i < 5; i++) {
    const p = new THREE.Group(), z = 58 - i * 22, w = 34 + i * 4, h = 46 + i * 6;
    for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, h, 1.6), M.argent); m.position.set(sx * w / 2, SOL + h / 2, 0); m.castShadow = true; p.add(m); const lu = new THREE.Mesh(new THREE.BoxGeometry(0.12, h - 2, 0.12), M.lueur); lu.position.set(sx * (w / 2 - 0.9), SOL + h / 2, 0.85); p.add(lu); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(w + 1.6, 1.6, 1.6), M.argent); top.position.set(0, SOL + h, 0); p.add(top);
    p.position.z = z; g.add(p); portiques.push(p);
  }

  // ---------- logo (haut de la composition) ----------
  const LOGO_Y = 5.2, TAILLE = 6.6;
  const logo = logoAtelierBleu(M, TAILLE); logo.groupe.position.set(0, LOGO_Y, 0); g.add(logo.groupe);
  const depart = { pastille: [-30, 22, -30, 1.2, 2.2, 0.3], manchon: [34, 18, 10, -1.6, 0.6, 1.2], manche: [10, -30, 14, 0.8, -1.4, 2.0], monture: [-22, -20, 24, 2.0, 1.0, -1.4] };
  for (const [n, m] of Object.entries(logo.pieces)) { m.userData.base = m.position.clone(); m.userData.dep = depart[n]; }
  const onde = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x8fb8ff).multiplyScalar(3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  onde.position.set(0, LOGO_Y, -0.2); g.add(onde);

  // ---------- couleurs (milieu) : cinq grandes surfaces de matière ----------
  const COUL_Y = -4.2, CW = 2.35, CH = 6.2, GAP = 0.32;
  const nuancier = [
    new THREE.MeshPhysicalMaterial({ color: COUL.nuit, roughness: 0.3, clearcoat: 1 }),
    new THREE.MeshPhysicalMaterial({ color: COUL.bleu, roughness: 0.3, clearcoat: 1 }),
    new THREE.MeshPhysicalMaterial({ color: COUL.ciel, roughness: 0.35, clearcoat: 1 }),
    new THREE.MeshPhysicalMaterial({ color: 0xf7f8fb, roughness: 0.4, clearcoat: 0.8 }),
    new THREE.MeshStandardMaterial({ color: COUL.argent, metalness: 1, roughness: 0.25 }),
  ];
  const plaques = nuancier.map((mat, i) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(CW, CH, 0.5, 3, 0.12), mat); m.castShadow = m.receiveShadow = true;
    m.userData.x = (i - 2) * (CW + GAP); g.add(m); return m;
  });

  // ---------- typographie (bas) : « Aa » construit comme une architecture ----------
  const TYPO_Y = -14.2;
  const { lettres } = lettres3D("Aa", { taille: 5.2, profondeur: 1.4, biseau: 0.08, espacement: 0.06 });
  const blancTypo = new THREE.MeshPhysicalMaterial({ color: 0xf5f7fb, roughness: 0.3, clearcoat: 1 });
  const lettresM = lettres.map((l) => { const m = new THREE.Mesh(l.geo, [blancTypo, M.argent]); m.position.set(l.x, TYPO_Y, 0); m.castShadow = true; g.add(m); return m; });
  const reperes = [0, 3.8, 5.25].map((dy) => { const m = new THREE.Mesh(new THREE.BoxGeometry(13, 0.05, 0.05), M.lueur); m.position.set(0, TYPO_Y + dy, 0.9); g.add(m); return m; });

  // ---------- résultat : enseigne drapeau, papier à en-tête, carte de visite ----------
  const V = new THREE.Vector3(0, -40, 6); // vitrine, sous la composition
  const vitrine = new THREE.Group(); vitrine.position.copy(V); g.add(vitrine);
  const socle = new THREE.Mesh(new RoundedBoxGeometry(16, 1.2, 9, 4, 0.3), new THREE.MeshPhysicalMaterial({ color: 0xf2f4f8, roughness: 0.4, clearcoat: 0.6 })); socle.position.y = -6.6; socle.receiveShadow = true; vitrine.add(socle);
  let entete = null, carte = null;
  if (MODE === "film") {
    entete = new Ecran("entete", ["base"], ZONES, { largeur: 6.6, cadre: false }); entete.composer({ base: "base" });
    const dos1 = new THREE.Mesh(new THREE.BoxGeometry(6.6, entete.H, 0.06), M.blancMat); entete.groupe.add(dos1); entete.plan.position.z = 0.04;
    entete.groupe.position.set(-1.6, -1.4, 0); entete.groupe.rotation.set(-0.12, 0.22, 0.02); vitrine.add(entete.groupe);
    carte = new Ecran("carte", ["base"], ZONES, { largeur: 4.6, cadre: false }); carte.composer({ base: "base" });
    const dos2 = new THREE.Mesh(new THREE.BoxGeometry(4.6, carte.H, 0.05), M.nuit); carte.groupe.add(dos2); carte.plan.position.z = 0.035;
    carte.groupe.position.set(3.4, -4.6, 2.2); carte.groupe.rotation.set(-0.35, -0.28, -0.08); vitrine.add(carte.groupe);
    for (const e of [entete, carte]) e.groupe.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  }
  // enseigne drapeau : potence argent, disque blanc, logo en volume, nom en relief
  const drapeau = new THREE.Group(); drapeau.position.set(2.2, 6.2, -1); vitrine.add(drapeau);
  const potence = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.22, 0.22), M.argent); potence.position.set(-0.4, 2.7, 0); drapeau.add(potence);
  const mur = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.2, 0.6), M.argent); mur.position.set(-3.6, 2.7, 0); drapeau.add(mur);
  for (const sx of [-1.4, 1.4]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7), M.chrome); c.position.set(sx, 2.25, 0); drapeau.add(c); }
  const plaque = new THREE.Mesh(new RoundedBoxGeometry(5.0, 3.9, 0.35, 4, 0.5), new THREE.MeshPhysicalMaterial({ color: COUL.nuit, roughness: 0.25, clearcoat: 1 })); plaque.position.y = 0; plaque.castShadow = true; drapeau.add(plaque);
  const logoD = logoAtelierBleu(M, 2.1); logoD.groupe.position.set(0, 0.55, 0.3); drapeau.add(logoD.groupe);
  const { lettres: nomL } = lettres3D("ATELIER BLEU", { taille: 0.42, profondeur: 0.08, biseau: 0.01, espacement: 0.12 });
  const faceNom = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.05 });
  for (const l of nomL) { const m = new THREE.Mesh(l.geo, [faceNom, M.argent]); m.position.set(l.x, -1.35, 0.22); drapeau.add(m); }
  const lumV = new THREE.SpotLight(0xffffff, 0, 60, 0.6, 0.6, 1); lumV.position.set(4, 16, 18); lumV.target = socle; vitrine.add(lumV);

  // ---------- caméra ----------
  const C_COMPO = { p: monde(0, -1.3, 52), l: monde(0, -1.3, 0) };
  cles.push(
    { t: T.traverseeB + 0.9, p: monde(1.5, 9, 30), l: monde(0, LOGO_Y, 0), fov: 40, e: "out", roll: 0.12 },
    { t: mot("p05", "logo") + 0.3, p: monde(-9, 7, 19), l: monde(0, LOGO_Y - 1, 0), fov: 38, e: "io2", roll: -0.05 },
    { t: mot("p05", "couleurs") + 0.9, p: monde(12, -1, 26), l: monde(0, -2, 0), fov: 38, e: "io2" },
    { t: T.compo - 0.3, p: C_COMPO.p, l: C_COMPO.l, fov: 35, e: "io" },
    { t: T.resultat, p: monde(0, -1.3, 50.5), l: C_COMPO.l, fov: 35, e: "lin" },
    { t: T.resultat + 1.0, p: monde(4, V.y + 4.5, V.z + 36), l: monde(0.4, V.y + 2.6, V.z), fov: 35, e: "io" },
    { t: T.depli, p: monde(3.4, V.y + 4.3, V.z + 34), l: monde(0.4, V.y + 2.6, V.z), fov: 35, e: "lin" },
  );

  // ---------- légendes et étiquettes ----------
  legende({ a: T.traverseeB + 0.5, b: T.depli + 0.1, num: "2", txt: "Créez<br>votre identité." });
  const pt = (x, y, z) => () => g.localToWorld(new THREE.Vector3(x, y, z));
  etiquette({ a: mot("p05", "logo") + 0.2, b: T.resultat + 0.4, txt: "Logo", cible: pt(5.4, LOGO_Y + 2.2, 0) });
  etiquette({ a: mot("p05", "couleurs") + 0.5, b: T.resultat + 0.4, txt: "Couleurs", cible: pt(0, COUL_Y + CH / 2 + 0.75, 0) });
  etiquette({ a: mot("p05", "identité") + 0.3, b: T.resultat + 0.4, txt: "Typographie", cible: pt(0, TYPO_Y - 1.4, 0) });

  return {
    maj(t) {
      const vis = t >= T.traverseeB - 0.05 && t < T.depli;
      g.visible = vis; if (!vis) return;
      // logo : les pièces arrivent du vide et s'emboîtent
      const t0 = T.logo, t1 = mot("p05", "logo") + 0.25;
      let i = 0;
      for (const m of Object.values(logo.pieces)) {
        const k = eout5(ramp(t, t0 + i * 0.12, t1 + i * 0.05)), d = m.userData.dep, b = m.userData.base;
        m.position.set(b.x + d[0] * (1 - k), b.y + d[1] * (1 - k), b.z + d[2] * (1 - k));
        m.rotation.set(d[3] * (1 - k), d[4] * (1 - k), d[5] * (1 - k)); i++;
      }
      logo.groupe.rotation.y = Math.sin(t * 0.8) * 0.12 * (1 - ramp(t, T.compo - 0.6, T.compo));
      const ko = ramp(t, t1, t1 + 0.9); onde.scale.setScalar(1 + eout(ko) * 9); onde.material.opacity = (1 - ko) * (ko > 0 ? 1 : 0);
      // couleurs : surfaces géantes qui se replient en nuancier
      const kc = ramp(t, mot("p05", "couleurs") - 0.15, mot("p05", "couleurs") + 1.0);
      plaques.forEach((m, j) => {
        const k = eout5(clamp01(kc * 1.25 - j * 0.06));
        m.position.set(m.userData.x * k, COUL_Y + (1 - k) * -8, (1 - k) * -6 + Math.sin(j) * 0.01);
        m.scale.set(mix(4.5, 1, k), Math.max(0.001, mix(0.1, 1, eout(clamp01(kc * 2 - j * 0.1)))), 1);
        m.rotation.y = (1 - k) * (j - 2) * 0.5;
        m.visible = kc > 0;
      });
      // typographie : les lettres s'élèvent, les lignes de construction s'allument
      const kt = ramp(t, T.typo, T.typo + 0.9);
      lettresM.forEach((m, j) => { const k = eout5(clamp01(kt * 1.3 - j * 0.2)); m.position.y = TYPO_Y - (1 - k) * 7; m.scale.z = Math.max(0.001, k); m.visible = kt > 0; });
      reperes.forEach((m, j) => { const k = eout(clamp01(kt * 1.6 - j * 0.15)); m.scale.x = Math.max(0.001, k); m.visible = kt > 0; });
      // vitrine
      lumV.intensity = 500 * eout(ramp(t, T.resultat, T.resultat + 0.6));
      drapeau.rotation.y = Math.sin(t * 1.1) * 0.05 - 0.25;
      // éclairage
      ombres(t < T.resultat + 0.3 ? new THREE.Vector3(...monde(0, -4, 0)) : new THREE.Vector3(...monde(0, V.y, V.z)), 24, [0.45, 1, 0.8], 3.6);
      contre.position.set(...monde(0, 6, -20)); contre.intensity = 2600;
    },
  };
}
