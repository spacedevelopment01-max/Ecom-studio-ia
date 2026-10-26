// La réalisation d'ATELIER BLEU : un salon repeint (mur bleu nuit, plafond blanc mat), en vraie 3D, à l'échelle.
// 1) Mode photo : rend « avant » et « après » depuis l'appareil de la réalisation → ui/img/salon-*.jpg (site, publications).
// 2) Séquence « Communication » : on entre dans la photo, la pièce devient un décor ; le mur du fond se découpe en trois
//    pans qui pivotent et révèlent la publication, la story et la publicité ; composition d'ensemble.
// 3) Séquence « Contrôle » : le titre de la publicité est corrigé dans le studio, puis la publicité se met à jour.
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { ramp, mix, eio, eio2, eout, eout5, ein, eback, fenetre, clamp01, COUL, RoundedBoxGeometry, Ecran, textureParquet, textureMurAncien } from "./lib.js";

function tableau() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 324; const x = c.getContext("2d");
  x.fillStyle = "#efe9df"; x.fillRect(0, 0, 512, 324);
  x.fillStyle = "#2350ff"; x.beginPath(); x.arc(330, 150, 92, 0, 7); x.fill();
  x.fillStyle = "#8fb8ff"; x.fillRect(60, 200, 300, 46);
  x.fillStyle = "#0b1736"; x.fillRect(110, 70, 26, 190);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export async function salon(ctx) {
  const { scene, M, T, P, mot, cles, legende, etiquette, ZONES, ombres, contre, MODE, renderer, calque } = ctx;
  const O = new THREE.Vector3(600, 0, 0);
  const g = new THREE.Group(); g.position.copy(O); scene.add(g);
  const monde = (x, y, z) => [O.x + x, O.y + y, O.z + z];
  const LX = 6, LZ = 5, HT = 2.7;

  // ---------- matériaux ----------
  const parquet = textureParquet(); parquet.repeat.set(3.4, 2.8);
  const matSol = new THREE.MeshPhysicalMaterial({ map: parquet, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.2 });
  const blancMur = new THREE.MeshStandardMaterial({ color: 0xf3f3f0, roughness: 0.92 });
  const bleuNuitMur = new THREE.MeshStandardMaterial({ color: 0x14244e, roughness: 0.86 });
  const ancien = textureMurAncien(); ancien.repeat.set(1.5, 0.7);
  const ancienMur = new THREE.MeshStandardMaterial({ map: ancien, roughness: 0.95 });
  const satin = new THREE.MeshPhysicalMaterial({ color: 0xf7f7f5, roughness: 0.3, clearcoat: 0.4 });
  const tissu = new THREE.MeshStandardMaterial({ color: 0xc9ccd3, roughness: 0.95 });
  const chene = new THREE.MeshPhysicalMaterial({ map: parquet, roughness: 0.45, clearcoat: 0.6 });

  // ---------- pièce ----------
  const piece = new THREE.Group(); g.add(piece);
  const box = (w, h, d, x, y, z, mat, parent = piece) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const sol = box(LX, 0.06, LZ, 0, -0.03, 0, matSol);
  const plafond = box(LX, 0.08, LZ, 0, HT + 0.04, 0, blancMur);
  const murG = box(0.12, HT, LZ, -LX / 2 - 0.06, HT / 2, 0, blancMur);
  // mur droit avec fenêtre (ouverture 1,6 × 1,5)
  const murD = new THREE.Group(); piece.add(murD);
  box(0.12, HT, 1.4, LX / 2 + 0.06, HT / 2, -LZ / 2 + 0.7, blancMur, murD); box(0.12, HT, 2.0, LX / 2 + 0.06, HT / 2, LZ / 2 - 1.0, blancMur, murD);
  box(0.12, 0.7, 1.6, LX / 2 + 0.06, 0.35, 0.3, blancMur, murD); box(0.12, 0.5, 1.6, LX / 2 + 0.06, HT - 0.25, 0.3, blancMur, murD);
  const vitre = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xdfeaff).multiplyScalar(2.2) })); vitre.rotation.y = -Math.PI / 2; vitre.position.set(LX / 2 + 0.2, 1.45, 0.3); murD.add(vitre);
  for (const [w, h, y, z] of [[0.06, 1.5, 1.45, -0.5], [0.06, 1.5, 1.45, 1.1], [0.06, 1.5, 1.45, 0.3]]) box(0.1, h, w, LX / 2, y, z, satin, murD);
  box(0.1, 0.06, 1.7, LX / 2, 0.72, 0.3, satin, murD); box(0.1, 0.06, 1.7, LX / 2, 2.2, 0.3, satin, murD);
  // mur du fond en trois pans pivotants (face : peinture ; dos : supports de communication)
  const pans = [];
  const largeurs = [2.0, 2.0, 2.0];
  for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Group(); pivot.position.set(-LX / 2 + 1.0 + i * 2.0, 0, -LZ / 2 - 0.06); piece.add(pivot);
    const face = box(largeurs[i] - 0.004, HT, 0.12, 0, HT / 2, 0, bleuNuitMur, pivot);
    pans.push({ pivot, face });
  }
  // plinthes
  box(LX, 0.09, 0.02, 0, 0.045, -LZ / 2 + 0.01, satin); box(0.02, 0.09, LZ, -LX / 2 + 0.01, 0.045, 0, satin);
  // mobilier « après »
  const meubles = new THREE.Group(); piece.add(meubles);
  const rb = (w, h, d, r, x, y, z, mat) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; meubles.add(m); return m; };
  rb(2.3, 0.42, 0.95, 0.08, -0.6, 0.25, -1.75, tissu); rb(2.3, 0.62, 0.24, 0.1, -0.6, 0.66, -2.15, tissu);
  rb(0.22, 0.6, 0.95, 0.08, -1.82, 0.38, -1.75, tissu); rb(0.22, 0.6, 0.95, 0.08, 0.62, 0.38, -1.75, tissu);
  rb(1.05, 0.14, 0.72, 0.06, -1.15, 0.52, -1.66, tissu); rb(1.05, 0.14, 0.72, 0.06, -0.05, 0.52, -1.66, tissu);
  const tapis = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.7), new THREE.MeshStandardMaterial({ color: 0xd7dbe3, roughness: 1 })); tapis.rotation.x = -Math.PI / 2; tapis.position.set(-0.5, 0.005, -0.5); tapis.receiveShadow = true; meubles.add(tapis);
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.045, 48), chene); table.position.set(-0.5, 0.4, -0.45); table.castShadow = true; meubles.add(table);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4), M.argent); p.position.set(-0.5 + Math.cos(a) * 0.3, 0.2, -0.45 + Math.sin(a) * 0.3); meubles.add(p); }
  const arc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[1.5, 0, -2.0], [1.5, 1.6, -2.0], [1.3, 2.05, -1.6], [0.9, 1.9, -1.2]].map((p) => new THREE.Vector3(...p))), 40, 0.018, 8), M.chrome); arc.castShadow = true; meubles.add(arc);
  const abat = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.2, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.6, side: THREE.DoubleSide, emissive: 0xfff2dd, emissiveIntensity: 0.25 })); abat.position.set(0.9, 1.78, -1.2); meubles.add(abat);
  const lampe = new THREE.PointLight(0xffe7c8, 5, 6, 2); lampe.position.set(0.9, 1.65, -1.2); meubles.add(lampe);
  const cadreArt = rb(0.9, 0.62, 0.03, 0.01, 1.35, 1.65, -2.42, new THREE.MeshStandardMaterial({ color: 0xe9ecf2, roughness: 0.5 }));
  const art = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.48), new THREE.MeshStandardMaterial({ map: tableau(), roughness: 0.8 })); art.position.set(1.35, 1.65, -2.40); meubles.add(art);
  // « avant » : bâche, pots, bac et rouleau, escabeau
  const avant = new THREE.Group(); piece.add(avant);
  const bache = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.0, 30, 20), new THREE.MeshStandardMaterial({ color: 0xe4e2dc, roughness: 0.9, side: THREE.DoubleSide }));
  { const p = bache.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, 0.012 + Math.sin(p.getX(i) * 3.1) * 0.006 + Math.cos(p.getY(i) * 4.3 + p.getX(i)) * 0.005); bache.geometry.computeVertexNormals(); }
  bache.rotation.x = -Math.PI / 2; bache.position.set(-0.5, 0.02, -0.7); bache.receiveShadow = true; avant.add(bache);
  for (const [x, z, c] of [[-1.9, -1.9, 0xf2f2f2], [-1.55, -2.05, 0xf2f2f2]]) { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.32, 32), new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.3 })); pot.position.set(x, 0.17, z); pot.castShadow = true; avant.add(pot); }
  const bac = box(0.38, 0.06, 0.5, -0.9, 0.04, -1.8, new THREE.MeshStandardMaterial({ color: 0x9aa3b4, roughness: 0.5 }), avant);
  for (const [x, y, z, w, h, d] of [[1.3, 0.95, -1.7, 0.05, 1.9, 0.05], [1.8, 0.95, -1.7, 0.05, 1.9, 0.05]]) box(w, h, d, x, y, z, M.argent, avant);
  for (let i = 0; i < 4; i++) box(0.5, 0.04, 0.12, 1.55, 0.4 + i * 0.45, -1.7, M.argent, avant);
  // lumière de la pièce
  const jour = new THREE.DirectionalLight(0xfff4e6, 0); jour.castShadow = true; jour.shadow.mapSize.set(2048, 2048);
  jour.position.copy(new THREE.Vector3(...monde(9, 5.5, 1.5))); jour.target.position.copy(new THREE.Vector3(...monde(-1, 0, -1))); scene.add(jour, jour.target);
  { const c = jour.shadow.camera; c.left = c.bottom = -5; c.right = c.top = 5; c.near = 1; c.far = 25; c.updateProjectionMatrix(); jour.shadow.bias = -0.0005; }
  RectAreaLightUniformsLib.init();
  const fenetreLum = new THREE.RectAreaLight(0xeef4ff, 0, 1.6, 1.5); fenetreLum.position.set(...monde(LX / 2 - 0.05, 1.45, 0.3)); fenetreLum.lookAt(...monde(-2, 1.2, 0.3)); scene.add(fenetreLum);
  const plafonnier = new THREE.PointLight(0xfff6ea, 0, 9, 1.6); plafonnier.position.set(...monde(-0.4, 2.45, 0.2)); scene.add(plafonnier);
  const appoint = new THREE.PointLight(0xdfe8ff, 0, 12, 1.4); appoint.position.set(...monde(1.8, 1.6, 3.2)); scene.add(appoint);

  function etat(e) {
    const ap = e === "apres";
    meubles.visible = ap; avant.visible = !ap;
    murG.material = ap ? blancMur : ancienMur; for (const m of murD.children) if (m.material === blancMur || m.material === ancienMur) m.material = ap ? blancMur : ancienMur;
    for (const p of pans) p.face.material = ap ? bleuNuitMur : ancienMur;
    plafond.material = ap ? blancMur : ancienMur;
  }
  // appareil photo de la réalisation
  const Q = { p: monde(2.4, 1.25, 2.4), l: monde(-0.75, 0.82, -2.5), fov: 48 };

  if (MODE.startsWith("photo")) {
    ctx.scene.fog = null;
    return {
      maj() {},
      photo(e) {
        etat(e); for (const o of scene.children) if (o !== g && o.type === "Group") o.visible = false;
        jour.intensity = 4.5; plafonnier.intensity = e === "apres" ? 3.5 : 2; appoint.intensity = 3; fenetreLum.intensity = 9; ctx.soleil.intensity = 0; ctx.contre.intensity = 0;
        ctx.hemi.intensity = 1.1; ctx.hemi.color.setHex(0xf3f5ff); ctx.hemi.groundColor.setHex(0xc9b598); renderer.toneMappingExposure = 1.12; scene.environmentIntensity = 0.5;
        const cam = new THREE.PerspectiveCamera(Q.fov, 1200 / 900, 0.05, 100); cam.position.set(...Q.p); cam.lookAt(...Q.l);
        renderer.setSize(1200, 900); scene.background = new THREE.Color(0xdfe6f2);
        renderer.render(scene, cam);
        return { image: renderer.domElement.toDataURL("image/jpeg", 0.93) };
      },
    };
  }

  // ---------- supports de communication (au dos des pans) ----------
  const supports = [];
  const defs = [["publication", 1.92, "Publication"], ["story", 1.48, "Story"], ["publicite", 1.92, "Publicité"]];
  defs.forEach(([nom, l, lib], i) => {
    const e = new Ecran(nom, nom === "publicite" ? ["base", "nouveau"] : ["base"], ZONES, { largeur: l, mats: M, profondeur: 0.06, rayon: 0.05 });
    e.composer({ base: "base" }); e.cadre.scale.set(1, 1, 1);
    e.groupe.rotation.y = Math.PI; e.groupe.position.set(0, HT / 2, -0.07);
    pans[i].pivot.add(e.groupe); supports.push({ e, nom, lib, pan: pans[i] });
  });
  etat("apres");

  // éditeur du studio (séquence « Contrôle »)
  const editeur = new Ecran("editeur", ["base", "nouveau", "valide"], ZONES, { largeur: 4.6, mats: M, profondeur: 0.08, rayon: 0.08 });
  editeur.composer({ base: "base" }); g.add(editeur.groupe);
  const pub = supports[2].e;

  // ---------- positions de la composition d'ensemble et de la séquence « Contrôle » ----------
  const ENS = [
    { p: [-1.75, 1.5, 0.9], r: [0, 0.32, 0.0] },
    { p: [0, 1.45, 1.4], r: [0, 0, 0] },
    { p: [1.75, 1.5, 0.9], r: [0, -0.32, 0.0] },
  ];
  const CTRL_PUB = { p: [0, -0.3, 1.6], r: [0, 0, 0], s: 1.22 };
  const CTRL_ED = { p: [0, 4.1, 1.6] };
  const vueFace = (x, y, z, largeur, remplissage = 0.84) => { const d = largeur / remplissage / (2 * Math.tan(THREE.MathUtils.degToRad(17.5)) * (1080 / 1920)); return { p: monde(x, y, z + d), l: monde(x, y, z) }; };
  const vPost = vueFace(-2.0, HT / 2 + 0.05, -LZ / 2 - 0.05, 2.0), vStory = vueFace(0, HT / 2 + 0.05, -LZ / 2 - 0.05, 1.6, 0.6), vPub = vueFace(2.0, HT / 2 + 0.05, -LZ / 2 - 0.05, 2.0);
  const vEns = vueFace(0, 2.1, 1.1, 5.6, 0.9), vCtrl = vueFace(0, 3.75, 1.6, 7.0, 1.0);

  // la photo du site → la pièce : on arrive sur l'appareil de la réalisation, puis on avance dans la pièce
  const t0 = T.plongee + 1.2;
  cles.push(
    { t: t0, p: Q.p, l: Q.l, fov: Q.fov, cut: true },
    { t: t0 + 1.3, p: monde(1.2, 1.5, 2.6), l: monde(-0.3, 1.25, -2.5), fov: 44, e: "out" },
    { t: T.supports + 0.1, p: monde(0.2, 1.6, 4.6), l: monde(0, 1.35, -2.5), fov: 38, e: "io" },
    { t: T.supports + 0.55, p: vPost.p, l: vPost.l, fov: 35, e: "io" },
    { t: mot("p07", "publications") - 0.05, p: [vPost.p[0], vPost.p[1], vPost.p[2] - 0.15], l: vPost.l, fov: 35, e: "lin" },
    { t: mot("p07", "publications") + 0.45, p: vStory.p, l: vStory.l, fov: 35, e: "io" },
    { t: mot("p07", "publicités") - 0.1, p: [vStory.p[0], vStory.p[1], vStory.p[2] - 0.15], l: vStory.l, fov: 35, e: "lin" },
    { t: mot("p07", "publicités") + 0.4, p: vPub.p, l: vPub.l, fov: 35, e: "io" },
    { t: T.ensemble - 0.05, p: [vPub.p[0], vPub.p[1], vPub.p[2] - 0.12], l: vPub.l, fov: 35, e: "lin" },
    { t: T.ensemble + 0.9, p: vEns.p, l: vEns.l, fov: 35, e: "io" },
    { t: T.editeur, p: [vEns.p[0], vEns.p[1], vEns.p[2] - 0.2], l: vEns.l, fov: 35, e: "lin" },
    { t: T.editeur + 0.9, p: vCtrl.p, l: vCtrl.l, fov: 35, e: "io" },
    { t: T.sortie, p: [vCtrl.p[0], vCtrl.p[1], vCtrl.p[2] - 0.25], l: vCtrl.l, fov: 35, e: "lin" },
  );

  legende({ a: P("p07").debut - 0.2, b: T.editeur + 0.2, num: "4", txt: "Préparez<br>votre communication." });
  const legCtrl = legende({ a: T.editeur + 0.3, b: T.sortie + 0.15, txt: '<span class="mot" data-m="0">Ajustez.</span> <span class="mot" data-m="1">Personnalisez.</span><br><span class="mot" data-m="2">Validez.</span>' });
  const motsCtrl = [T.frappe, T.frappe + 0.75, T.valider];
  ctx.legendesMaj = ctx.legendesMaj || [];
  supports.forEach((s, i) => etiquette({ a: T.ensemble + 0.7 + i * 0.12, b: T.editeur + 0.2, txt: s.lib, cible: () => s.e.groupe.localToWorld(new THREE.Vector3(0, -s.e.H / 2 - 0.28, 0)) }));

  // repères pixel de la frappe : du bout de « Peinture intérieure » au bout de « Peinture intérieure à Lyon »
  const zA = ZONES.editeur.zones["titre-a"], zN = ZONES.editeur.zones["titre-n"], zV = ZONES.editeur.zones["titre"];
  const frappeRect = [zA[0] + zA[2] - 2, zV[1], zN[2] - zA[2] + 22, zV[3]];

  const tmp = new THREE.Vector3(), q = new THREE.Quaternion(), e3 = new THREE.Euler();
  return {
    maj(t) {
      const vis = t >= t0 - 0.02 && t < T.sortie + 0.05;
      g.visible = vis; jour.visible = plafonnier.visible = appoint.visible = fenetreLum.visible = vis;
      // fondu blanc au passage photo → pièce
      const f = fenetre(t, t0 - 0.28, t0 + 0.3, 0.2, 0.3); document.getElementById("fondu").style.opacity = Math.max(f * 0.85, document.getElementById("fondu").dataset.fin || 0);
      if (!vis) return;
      jour.intensity = 4.5; plafonnier.intensity = 3.5; appoint.intensity = 3; fenetreLum.intensity = 9; fenetreLum.visible = true;
      ctx.hemi.color.setHex(0xf3f5ff); ctx.hemi.groundColor.setHex(0xc9b598);
      // la pièce devient un décor : plafond et murs latéraux s'écartent, la pièce flotte dans le bleu
      const dec = eio(ramp(t, mot("p07", "identité") - 0.3, mot("p07", "identité") + 0.9));
      plafond.position.y = HT + 0.04 + dec * 9; plafond.rotation.z = dec * 0.5;
      murG.position.x = -LX / 2 - 0.06 - dec * 7; murG.rotation.z = dec * 0.35;
      murD.position.x = dec * 8; murD.rotation.z = -dec * 0.3;
      // le mobilier et le sol s'éloignent : il ne reste que le mur et ses pans, suspendus dans le bleu
      sol.position.y = -0.03 - ein(dec) * 16; sol.rotation.x = -dec * 0.25; meubles.position.y = -ein(dec) * 16; meubles.rotation.x = -dec * 0.3;
      // les pans pivotent, chacun au mot qui le nomme
      const quand = [mot("p07", "visuels") - 0.3, mot("p07", "publications") - 0.1, mot("p07", "publicités") - 0.15];
      const ens = eout5(ramp(t, T.ensemble, T.ensemble + 0.95));
      const ctrl = eio(ramp(t, T.editeur, T.editeur + 0.9));
      pans.forEach((p, i) => {
        const k = eback(ramp(t, quand[i], quand[i] + 0.7));
        p.pivot.rotation.y = Math.PI * Math.min(1, k) + (k > 1 ? (k - 1) * 0.6 : 0);
        p.pivot.position.z = -LZ / 2 - 0.06 + Math.sin(Math.PI * clamp01(k)) * 0.6;
      });
      // composition d'ensemble : les supports quittent le mur et se rangent devant la caméra
      supports.forEach((s, i) => {
        const grp = s.e.groupe;
        if (ens <= 0) { grp.position.set(0, HT / 2, -0.07); grp.rotation.set(0, Math.PI, 0); grp.scale.setScalar(1); if (grp.parent !== s.pan.pivot) s.pan.pivot.add(grp); return; }
        if (grp.parent !== g) g.add(grp);
        const piv = s.pan.pivot; piv.updateMatrixWorld(true);
        const dep = new THREE.Vector3(0, HT / 2, -0.07).applyMatrix4(piv.matrix);
        const cible = ENS[i];
        let px = mix(dep.x, cible.p[0], ens), py = mix(dep.y, cible.p[1], ens), pz = mix(dep.z, cible.p[2], ens);
        let ry = mix(piv.rotation.y + Math.PI, cible.r[1] + 2 * Math.PI, ens), sc = 1;
        if (ctrl > 0) {
          if (i === 2) { px = mix(px, CTRL_PUB.p[0], ctrl); py = mix(py, CTRL_PUB.p[1], ctrl); pz = mix(pz, CTRL_PUB.p[2], ctrl); ry = mix(ry, 2 * Math.PI, ctrl); sc = mix(1, CTRL_PUB.s, ctrl); }
          else { px = px + (i === 0 ? -1 : 1) * ctrl * 6; pz -= ctrl * 3; }
        }
        grp.position.set(px, py, pz); grp.rotation.set(0, ry, 0); grp.scale.setScalar(sc);
        grp.visible = !(i !== 2 && ctrl >= 1);
      });
      // éditeur : descend du haut ; le titre est corrigé, puis validé
      editeur.groupe.visible = ctrl > 0;
      editeur.groupe.position.set(CTRL_ED.p[0], mix(CTRL_ED.p[1] + 5, CTRL_ED.p[1], ctrl), CTRL_ED.p[2]);
      editeur.groupe.rotation.x = (1 - ctrl) * -0.5;
      const kf = clamp01(ramp(t, T.frappe, T.frappe + 1.0));
      const lettres = Math.round(kf * 7) / 7; // sept caractères « à Lyon » tapés un à un
      const valide = t >= T.valider + 0.12;
      editeur.composer({ base: valide ? "valide" : "base", reveles: valide ? [] : [{ etat: "nouveau", rect: frappeRect, p: lettres }] });
      const presse = fenetre(t, T.valider, T.valider + 0.25, 0.06, 0.15);
      editeur.groupe.position.z = CTRL_ED.p[2] - presse * 0.05;
      // la publicité se met à jour
      const km = ramp(t, T.maj, T.maj + 0.65);
      pub.composer({ base: "base", reveles: [{ etat: "nouveau", zone: "titre", p: eio2(km), sens: "y" }], lumiere: km > 0 && km < 1 ? -0.2 + km * 1.4 : null });
      if (km > 0) { const b = 1 + 0.05 * Math.sin(Math.PI * clamp01(km * 1.4)); pub.groupe.scale.multiplyScalar(b); }
      pub.liseret.material = km > 0 && km < 1 ? M.lueur : M.lueurDouce;
      // légende « Ajustez. Personnalisez. Validez. » : chaque mot s'allume avec son action
      legCtrl.querySelectorAll(".mot").forEach((el, j) => { const on = t >= motsCtrl[j]; el.style.color = on ? "#ffffff" : "rgba(255,255,255,0.38)"; el.style.textShadow = on ? "0 0 30px rgba(90,140,255,.9)" : "none"; });
      // éclairage
      ombres(new THREE.Vector3(...monde(0, 1, 0)), 7, [0.4, 1, 0.9], 1.6 * dec);
      contre.position.set(...monde(0, 3, -9)); contre.intensity = 400 * dec;
      ctx.hemi.intensity = 0.55 + 0.25 * (1 - dec);
      jour.intensity = 3.2 * (1 - 0.6 * dec); fenetreLum.intensity = 6 * (1 - dec); plafonnier.intensity = 2.4; appoint.intensity = 1.8;
    },
  };
}
