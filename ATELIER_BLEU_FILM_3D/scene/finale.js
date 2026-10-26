// Révélation : la caméra sort du bâtiment, les trois volumes (Identité, Site, Communication) s'alignent sur sa
// colonne et composent le « E » du pictogramme E-COM STUDIO IA ; le carré sombre et le point bleu se posent autour ;
// le nom et la phrase finale s'affichent, un balayage de lumière « met en lumière ».
import * as THREE from "three";
import { ramp, mix, eio, eio2, eout, eout5, ein, eback, fenetre, clamp01, RoundedBoxGeometry, textureFaisceau } from "./lib.js";
import { logoStudio } from "./marques.js";

export async function finale(ctx, { B }) {
  const { scene, M, T, P, mot, cles, legende, etiquette, ombres, contre, MODE, bloom } = ctx;
  if (MODE.startsWith("photo")) return { maj() {} };
  const S = 38 / 26; // une unité du tracé du logo = 1,46 m : la colonne du « E » (26 unités) = hauteur du bâtiment
  const X0 = -5.1, Y0 = 30; // coin haut-gauche du « E » (x = 18, y = 20 dans le tracé) … colonne compressée à 7 unités
  const lx = (x) => X0 + (x - 18) * S - 0.0, ly = (y) => Y0 - (y - 20) * S;
  const ZE = -4;
  const BRAS = {
    identite: { x0: 25, x1: 40, y0: 20, y1: 26 },
    site: { x0: 25, x1: 38, y0: 30, y1: 36 },
    communication: { x0: 25, x1: 40, y0: 40, y1: 46 },
  };
  for (const [nom, b] of Object.entries(BRAS)) {
    const v = B.volumes[nom], p = v.m.geometry.parameters;
    b.pos = new THREE.Vector3((lx(b.x0) + lx(b.x1)) / 2 + 0.0, (ly(b.y0) + ly(b.y1)) / 2, ZE);
    b.scale = new THREE.Vector3((lx(b.x1) - lx(b.x0) + 0.02) / p.width, (ly(b.y0) - ly(b.y1)) / p.height, 8 / p.depth);
  }
  // plaque blanche qui referme la façade (la colonne du « E » devient pleine)
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(B.FW + 0.1, B.FH, 0.6), B.murModules); plaque.position.set(0, B.FH / 2, -0.25);
  { const uv = plaque.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4, uv.getY(i) * 6); }
  plaque.castShadow = plaque.receiveShadow = true; B.corps.add(plaque);

  // pictogramme : carré sombre + point bleu (le « E » est fait par l'architecture)
  const TAILLE = 64 * S;
  const logo = logoStudio(M, TAILLE); logo.E.visible = false;
  logo.groupe.position.set(lx(32), ly(32), -8.2); scene.add(logo.groupe);
  const halo = new THREE.Group(); // (liseré retiré : le contre-jour dessine le bord du carré)
  const pointCible = logo.point.position.clone();
  // balayage de lumière (« mise en lumière »)
  const balayage = new THREE.Mesh(new THREE.PlaneGeometry(46, 260), new THREE.MeshBasicMaterial({ map: textureFaisceau(), color: new THREE.Color(0xdfe8ff), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  balayage.rotation.z = -0.5; balayage.position.set(0, 0, 6); logo.groupe.add(balayage);
  const projo = new THREE.SpotLight(0xffffff, 0, 600, 0.35, 0.7, 2); projo.position.set(lx(32) - 60, ly(32) + 90, 140); projo.target.position.set(lx(32), ly(32), 0); scene.add(projo, projo.target);

  // ---------- caméra ----------
  const C = new THREE.Vector3(lx(32), ly(32), 0);
  const dFin = 300, regard = [C.x, C.y - 30, 0];
  cles.push(
    { t: T.sortie, p: [0, 9.5, 6], l: [0, 9.3, -30], fov: 50, cut: true },
    { t: T.sortie + 1.25, p: [-36, 2, 120], l: [4, 11, -10], fov: 36, e: "out5" },
    { t: P("p11").fin - 0.2, p: [-14, 0, 175], l: [9, 11, -10], fov: 35, e: "io2" },
    { t: T.alignement + 1.5, p: [C.x, regard[1] + 6, dFin], l: regard, fov: 35, e: "io" },
    { t: T.fin, p: [C.x, regard[1] + 4, dFin - 22], l: regard, fov: 35, e: "lin" },
  );

  // ---------- textes ----------
  legende({ a: P("p09").debut - 0.1, b: P("p10").debut - 0.05, txt: "Moins d'outils à gérer.", centre: true, top: 1400 });
  legende({ a: P("p10").debut - 0.05, b: P("p11").debut - 0.05, txt: "Une image cohérente.", centre: true, top: 1400 });
  legende({ a: P("p11").debut - 0.05, b: T.alignement + 0.6, txt: "Du temps pour<br>votre métier.", centre: true, top: 1400 });
  const lab = (nom, txt) => etiquette({ a: T.sortie + 0.9, b: P("p11").fin - 0.3, txt, bleu: true, cible: () => B.volumes[nom].m.localToWorld(new THREE.Vector3(0, 0, B.volumes[nom].m.geometry.parameters.depth / 2 + 0.5)) });
  lab("identite", "Identité"); lab("site", "Site"); lab("communication", "Communication");
  const fin = document.getElementById("fin"), marque = fin.querySelector(".marque"), slogan = fin.querySelector(".slogan");

  const dep = {};
  return {
    maj(t) {
      const actif = t >= T.sortie;
      logo.groupe.visible = actif && t > T.alignement - 0.3;
      fin.style.opacity = 0;
      if (!actif) { plaque.visible = false; return; }
      // flash de sortie
      document.getElementById("fondu").style.opacity = 0.9 * fenetre(t, T.sortie - 0.12, T.sortie + 0.35, 0.1, 0.3);
      const kA = eio(ramp(t, P("p09").fin - 0.4, P("p11").fin - 0.3));
      // la colonne : compressée à la largeur du « E », dessous et enseigne retirés
      B.corps.scale.set(mix(1, 7 * S / (B.FW + 4), kA), 1, 1);
      B.dessous.scale.y = Math.max(0.001, 1 - kA); B.dessous.visible = kA < 1;
      const kE = eio(ramp(t, P("p09").fin - 0.6, P("p09").fin + 0.6));
      B.enseigne.scale.setScalar(Math.max(0.001, 1 - kE)); B.enseigne.position.y = B.FH + 1.6 + kE * 6;
      B.rangees.forEach((r, k) => { const kk = clamp01(kE * 1.6 - k * 0.1); r.scale.set(Math.max(0.001, 1 - kk), 1, 1); r.visible = kk < 1; });
      plaque.visible = true; plaque.position.z = mix(1.5, -0.25, kE); plaque.scale.y = Math.max(0.001, eout(kE));
      // les trois volumes s'alignent et deviennent les bras du « E »
      for (const [nom, b] of Object.entries(BRAS)) {
        const v = B.volumes[nom];
        if (!dep[nom]) dep[nom] = { p: v.base.clone(), r: v.baseRot.clone() };
        const k = eio(clamp01(ramp(t, P("p09").fin - 0.4 + (nom === "site" ? 0.35 : nom === "communication" ? 0.7 : 0), P("p11").fin - 0.3)));
        const ar = Math.sin(Math.PI * k);
        v.m.position.set(mix(dep[nom].p.x, b.pos.x, k), mix(dep[nom].p.y, b.pos.y, k) + ar * (nom === "site" ? -4 : 4), mix(dep[nom].p.z, b.pos.z, k) + ar * 8);
        v.m.scale.set(mix(1, b.scale.x, k), mix(1, b.scale.y, k), mix(1, b.scale.z, k));
        v.m.rotation.set(dep[nom].r.x * (1 - k) + ar * 0.15, dep[nom].r.y * (1 - k) + ar * (nom === "site" ? 0.6 : -0.4), dep[nom].r.z * (1 - k));
        v.m.visible = true;
      }
      // carré sombre et point bleu
      const kB = eout5(ramp(t, T.alignement - 0.3, T.alignement + 0.9));
      logo.fond.scale.set(Math.max(0.001, kB), Math.max(0.001, kB), 1);
      halo.scale.set(Math.max(0.001, kB), Math.max(0.001, kB), 1);
      const kP = eback(ramp(t, T.alignement + 0.5, T.alignement + 1.2));
      logo.point.position.set(pointCible.x + (1 - clamp01(kP)) * 60, pointCible.y + (1 - clamp01(kP)) * -40, pointCible.z + (1 - clamp01(kP)) * 80);
      logo.point.scale.setScalar(Math.max(0.001, Math.min(1.15, kP)));
      // nom, phrase, mise en lumière
      const kN = ramp(t, P("p12").debut - 0.15, P("p12").debut + 0.45), kS = ramp(t, P("p13").debut - 0.1, P("p13").debut + 0.5);
      fin.style.opacity = 1;
      marque.style.opacity = eout(kN); marque.style.transform = `translateY(${(1 - eout(kN)) * 30}px)`;
      slogan.style.opacity = eout(kS); slogan.style.transform = `translateY(${(1 - eout(kS)) * 24}px)`;
      const kL = ramp(t, mot("p13", "lumière") - 0.35, mot("p13", "lumière") + 0.9);
      balayage.material.opacity = Math.sin(Math.PI * kL) * 0.16; balayage.position.x = -80 + 170 * eio(kL);
      projo.intensity = 6e4 * eout(ramp(t, mot("p13", "lumière") - 0.4, mot("p13", "lumière") + 0.6));
      bloom.strength = 0.35 + 0.3 * Math.sin(Math.PI * kL);
      scene.fog.density = mix(0.0028, 0.0007, eio(ramp(t, T.sortie, T.sortie + 3)));
      ombres(new THREE.Vector3(10, 10, -5), 60, [0.4, 0.9, 1], 3.6);
      contre.position.set(lx(32), ly(32), -60); contre.intensity = 2500;
    },
  };
}
