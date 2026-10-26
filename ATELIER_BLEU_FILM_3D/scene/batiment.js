// Le bâtiment ATELIER BLEU : rouleau géant, surface peinte qui se plie en façade, volumes suspendus, enseigne,
// morceaux dispersés (site, visuels, communication), façade articulée, hall du studio (formulaire),
// puis dépliage vertical qui révèle le site internet (séquences 1, 2, 3 et 4 du déroulé : ouverture → site).
import * as THREE from "three";
import { ramp, mix, eio, eio2, eout, eout5, ein, eback, fenetre, clamp01, Ecran, RoundedBoxGeometry, lettres3D, texturesModule, textureFaisceau, textureBrume } from "./lib.js";
import { logoAtelierBleu } from "./marques.js";

export async function batiment(ctx) {
  const { scene, M, T, P, mot, cles, legende, etiquette, ZONES, ombres, contre, MODE, bloom } = ctx;
  const racine = new THREE.Group(); scene.add(racine);
  const PAS = 3.1, LIGNES = 6, COLS = 4, FW = PAS * COLS, FH = PAS * LIGNES;
  const R = 1.35; // rayon du manchon

  // ---------- rouleau ----------
  const rouleau = new THREE.Group(); racine.add(rouleau);
  const tourne = new THREE.Group(); rouleau.add(tourne);
  const geoManchon = new THREE.CylinderGeometry(R, R, FW + 0.2, 96, 1, true);
  const uv = geoManchon.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 10, uv.getY(i) * 3);
  const manchon = new THREE.Mesh(geoManchon, M.peintureManchon); manchon.rotation.z = Math.PI / 2; manchon.castShadow = true; tourne.add(manchon);
  // brins qui dépassent (silhouette duveteuse)
  const brins = M.peintureManchon.clone(); brins.alphaMap = M.peintureManchon.bumpMap; brins.alphaTest = 0.55; brins.transparent = false;
  for (const dr of [0.025, 0.05]) { const s = new THREE.Mesh(geoManchon, brins); s.scale.set(1 + dr / R, 1, 1 + dr / R); s.rotation.z = Math.PI / 2; tourne.add(s); }
  for (const sx of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.01, R * 1.01, 0.1, 64), M.chrome); f.rotation.z = Math.PI / 2; f.position.x = sx * (FW / 2 + 0.12); tourne.add(f);
    const moyeu = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.25, 32), M.argent); moyeu.rotation.z = Math.PI / 2; moyeu.position.x = sx * (FW / 2 + 0.25); tourne.add(moyeu);
  }
  const axe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, FW + 1.4, 24), M.chrome); axe.rotation.z = Math.PI / 2; rouleau.add(axe);
  const monture = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[FW / 2 + 0.6, 0, 0], [FW / 2 + 1.0, 0, 0], [FW / 2 + 1.05, 1.2, -1.1], [FW / 2 - 0.2, 3.0, -3.0], [FW / 2 - 1.6, 4.2, -4.4]].map((p) => new THREE.Vector3(...p))), 64, 0.13, 16), M.chrome);
  monture.castShadow = true; rouleau.add(monture);
  const manche = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 3.6, 8, 24), new THREE.MeshPhysicalMaterial({ color: 0xb9c3d6, roughness: 0.4, clearcoat: 0.8 }));
  manche.position.set(FW / 2 - 2.6, 5.4, -5.6); manche.lookAt(FW / 2 - 4.6, 7.8, -8.0); manche.rotateX(Math.PI / 2); manche.castShadow = true; rouleau.add(manche);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.06, 12, 32), M.bleuLaque); b.position.copy(manche.position).add(new THREE.Vector3(-0.5 - i * 0.45, 0.62 + i * 0.55, -0.65 - i * 0.58).multiplyScalar(0.9)); b.lookAt(manche.position.clone().add(new THREE.Vector3(-2, 2.4, -2.4))); rouleau.add(b); }
  const zRouleau = (t) => 0.4 + 18.6 * Math.min(1, ramp(t, -0.15, 2.35)) + 2.5 * eout(ramp(t, 2.35, 4.5));

  // ---------- surface peinte → façade (6 rangées articulées de 4 panneaux) ----------
  const rangees = [];
  const panneaux = []; // [rangée][colonne] → { pivot, mesh }
  for (let k = 0; k < LIGNES; k++) {
    const g = new THREE.Group(); racine.add(g); rangees.push(g); panneaux.push([]);
    for (let c = 0; c < COLS; c++) {
      const gauche = c < COLS / 2;
      const pivot = new THREE.Group(); pivot.position.x = -FW / 2 + (gauche ? c * PAS : (c + 1) * PAS); g.add(pivot);
      const m = new THREE.Mesh(new THREE.BoxGeometry(PAS, PAS, 0.16), M.peinture); m.position.set(gauche ? PAS / 2 : -PAS / 2, PAS / 2, 0);
      m.castShadow = m.receiveShadow = true; pivot.add(m);
      const tex = M.peinture; m.material = tex;
      panneaux[k].push({ pivot, m, gauche });
    }
  }
  const angleRangee = (t, k) => (Math.PI / 2) * (1 - eio(ramp(t, 2.15 + k * 0.17, 2.15 + k * 0.17 + 0.78)));

  // ---------- corps du bâtiment : coque creuse (le hall est dedans), cadre monumental autour de la façade ----------
  const corps = new THREE.Group(); racine.add(corps);
  const PROF = 30, BW = FW + 4, YB = -8, YH = 30, MI = FH / 2, EP = 1.0;
  const blancFacade = new THREE.MeshPhysicalMaterial({ color: 0xf3f5fa, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  const moitieBas = new THREE.Group(), moitieHaut = new THREE.Group(); corps.add(moitieBas, moitieHaut);
  const MOD = texturesModule();
  const murModules = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: MOD.map, emissive: 0xffffff, emissiveMap: MOD.emissiveMap, emissiveIntensity: 1.6, roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.15 });
  /** Bloc d'architecture : les grandes faces reçoivent la trame de modules (joints + vitrages lumineux). */
  function bloc(parent, w, h, d, x, y, z, mat = blancFacade) {
    const geo = new THREE.BoxGeometry(w, h, d);
    if (mat === blancFacade && Math.max(w, h, d) > 4) {
      // UV en mètres / PAS : chaque face porte des modules de 3,1 × 3,1
      const pos = geo.attributes.position, nor = geo.attributes.normal, uvA = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i));
        const px = pos.getX(i) + x, py = pos.getY(i) + y, pz = pos.getZ(i) + z;
        if (nx > 0.5) uvA.setXY(i, pz / PAS, py / PAS); else if (ny > 0.5) uvA.setXY(i, px / PAS, pz / PAS); else uvA.setXY(i, px / PAS, py / PAS);
      }
      mat = murModules;
    }
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
  }
  const boiteY = (parent, y0, y1, x0, x1, z0, z1, mat) => bloc(parent, x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, mat);
  for (const [g, y0, y1] of [[moitieBas, YB, MI], [moitieHaut, MI, YH]]) {
    for (const sx of [-1, 1]) {
      boiteY(g, Math.max(y0, 0), Math.min(y1, FH), sx < 0 ? -BW / 2 : FW / 2, sx < 0 ? -FW / 2 : BW / 2, -EP, 0); // montants du cadre
      boiteY(g, y0, y1, sx < 0 ? -BW / 2 : BW / 2 - EP, sx < 0 ? -BW / 2 + EP : BW / 2, -PROF, -EP);           // murs latéraux
      boiteY(g, y0, y1, sx * (BW / 2) - 0.25, sx * (BW / 2) + 0.25, -0.9, 0.35, M.argent);                    // arêtes argent
      for (let f = 1; f * PAS + y0 < y1; f++) bloc(g, 0.1, 0.12, PROF - 2, sx * (BW / 2 + 0.02), y0 + f * PAS, -PROF / 2, M.lueur);
    }
    boiteY(g, y0, y1, -BW / 2, BW / 2, -PROF - EP, -PROF); // mur du fond
  }
  boiteY(moitieHaut, FH, YH, -BW / 2, BW / 2, -EP, 0.0);           // bandeau haut (porte l'enseigne)
  boiteY(moitieHaut, YH - EP, YH, -BW / 2, BW / 2, -PROF, -EP);    // toit
  boiteY(moitieHaut, YH, YH + 0.4, -BW / 2 - 0.4, BW / 2 + 0.4, -PROF - 1.4, 0.4, M.argent);
  boiteY(moitieBas, YB, 0, -BW / 2, BW / 2, -PROF, 0.0);           // socle plein
  boiteY(moitieBas, -0.35, 0.0, -FW / 2 - 0.4, FW / 2 + 0.4, -0.2, 0.5, M.argent); // seuil
  // cadre intérieur argent autour de la façade
  boiteY(moitieHaut, FH, FH + 0.3, -FW / 2 - 0.3, FW / 2 + 0.3, -0.6, 0.25, M.argent);
  for (const sx of [-1, 1]) { boiteY(moitieBas, 0, MI, sx * FW / 2 - 0.15, sx * FW / 2 + 0.15, -0.6, 0.25, M.argent); boiteY(moitieHaut, MI, FH, sx * FW / 2 - 0.15, sx * FW / 2 + 0.15, -0.6, 0.25, M.argent); }
  // dessous étagé : le bâtiment est suspendu dans le vide
  const dessous = new THREE.Group(); moitieBas.add(dessous);
  bloc(dessous, BW - 3, 3, PROF - 5, 0, YB - 1.5, -PROF / 2, M.nuit); bloc(dessous, BW - 7, 3, PROF - 12, 0, YB - 4.5, -PROF / 2, M.nuit); bloc(dessous, BW - 10.5, 3, PROF - 19, 0, YB - 7.5, -PROF / 2, M.nuit);
  bloc(dessous, BW - 11, 0.15, PROF - 20, 0, YB - 9.05, -PROF / 2, M.lueurBlanche);
  // faisceaux de lumière derrière le bâtiment, nappes de brume en dessous
  const texF = textureFaisceau(), faisceaux = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(14, 220), new THREE.MeshBasicMaterial({ map: texF, color: new THREE.Color(i % 2 ? 0x4f7dff : 0xbcd0ff), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    m.position.set((i - 2) * 9, -20, -55 - i * 4); m.rotation.z = (i - 2) * 0.16; racine.add(m); faisceaux.push(m);
  }
  const texB = textureBrume(), brumes = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(420, 420), new THREE.MeshBasicMaterial({ map: texB, color: new THREE.Color(0x6f8fff), transparent: true, opacity: 0.32 - i * 0.05, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = -22 - i * 12; texB.repeat.set(3, 3); racine.add(m); brumes.push(m);
  }
  // grille lumineuse très loin dessous (donne la hauteur du vide)
  const grille = new THREE.GridHelper(2400, 120, 0x1d3fbf, 0x0f2470); grille.position.y = -140; grille.material.transparent = true; grille.material.opacity = 0.55; racine.add(grille);
  // volumes « impossibles » (ils formeront le « E » final)
  const volumes = {
    identite: { m: bloc(racine, 11, 8, 11, -16.5, 21, -10), from: [-70, 40, -30], rot: [0.4, 0.8, 0.2] },
    site: { m: bloc(racine, 7, 34, 7, 14.5, -2, -18), from: [80, -40, -20], rot: [0.1, -0.6, 0.5] },
    communication: { m: bloc(racine, 26, 5.5, 7, 4, 33.5, -22), from: [20, 80, -40], rot: [0.6, 0.2, -0.4] },
  };
  for (const v of Object.values(volumes)) { v.base = v.m.position.clone(); v.baseRot = v.m.rotation.clone(); }
  // liserés bleus des volumes
  for (const v of Object.values(volumes)) {
    const p = v.m.geometry.parameters;
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(v.m.geometry), new THREE.LineBasicMaterial({ color: new THREE.Color(0x6f9bff).multiplyScalar(2.2) }));
    v.m.add(e);
  }

  // ---------- enseigne ----------
  const enseigne = new THREE.Group(); enseigne.position.set(0, FH + 1.6, 0.3); moitieHaut.add(enseigne);
  const faceLettre = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, emissive: 0xffffff, emissiveIntensity: 0 });
  const { lettres } = lettres3D("ATELIER BLEU", { taille: 1.25, profondeur: 0.45, biseau: 0.04, espacement: 0.12 });
  const lettresM = lettres.map((l) => { const m = new THREE.Mesh(l.geo, [faceLettre, M.argent]); m.position.x = l.x; m.castShadow = true; enseigne.add(m); return { m, l }; });
  const rail = bloc(enseigne, 14.2, 0.14, 0.4, 0, -0.18, -0.2, M.argent);
  const logo = logoAtelierBleu(M, 4.6); logo.groupe.position.set(0, 5.4, 0.1); enseigne.add(logo.groupe);
  // repère de la lettre B (traversée) : centre de son œil supérieur, mesuré par lancer de rayons
  const lettreB = lettresM.find((x) => x.l.lettre === "B");
  function oeilB() {
    racine.updateMatrixWorld(true);
    const bb = lettreB.l.geo.boundingBox, ray = new THREE.Raycaster(), y = bb.min.y + (bb.max.y - bb.min.y) * 0.72, vides = [];
    for (let i = 0; i <= 120; i++) {
      const x = bb.min.x - 0.4 + ((bb.max.x - bb.min.x + 0.4) * i) / 120;
      const o = lettreB.m.localToWorld(new THREE.Vector3(x, y, 2)), d = new THREE.Vector3(0, 0, -1).transformDirection(lettreB.m.matrixWorld);
      ray.set(o, d); vides.push(ray.intersectObject(lettreB.m).length === 0);
    }
    // plus longue suite de vides encadrée par des pleins
    let best = [0, 0], deb = -1, vuPlein = false;
    for (let i = 0; i < vides.length; i++) {
      if (!vides[i]) { if (deb >= 0 && vuPlein && i - deb > best[1] - best[0]) best = [deb, i]; deb = -1; vuPlein = true; }
      else if (deb < 0) deb = i;
    }
    const xm = bb.min.x - 0.4 + ((bb.max.x - bb.min.x + 0.4) * (best[0] + best[1]) / 2) / 120;
    return lettreB.m.localToWorld(new THREE.Vector3(xm, y, 0));
  }

  // ---------- hall intérieur (studio) ----------
  const hall = new THREE.Group(); racine.add(hall);
  const murHall = new THREE.MeshPhysicalMaterial({ color: 0x0c1838, roughness: 0.35, metalness: 0.2, clearcoat: 0.6, side: THREE.BackSide });
  const boite = new THREE.Mesh(new THREE.BoxGeometry(BW - 2 * EP - 0.1, YH - EP - 0.1, PROF - EP - 0.1), murHall); boite.position.set(0, (YH - EP) / 2, -PROF / 2 - 0.5); boite.receiveShadow = true; hall.add(boite);
  const solHall = new THREE.Mesh(new THREE.PlaneGeometry(BW - 2 * EP - 0.1, PROF - 1.2), M.sol); solHall.rotation.x = -Math.PI / 2; solHall.position.set(0, 0.12, -PROF / 2 - 0.2); solHall.receiveShadow = true; hall.add(solHall);
  for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(BW - 5, 0.12, 0.3), M.lueurBlanche); b.position.set(0, YH - EP - 0.3, -3 - i * 4); hall.add(b); }
  for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.08, YH - 4, 0.08), M.lueur); b.position.set(sx * (BW / 2 - EP - 0.15), (YH - EP) / 2, -4 - i * 4.4); hall.add(b); }
  const lumHall = new THREE.PointLight(0xdfe8ff, 0, 60, 1.2); lumHall.position.set(0, FH - 2, -12); hall.add(lumHall);
  let form = null;
  if (MODE === "film") {
    form = new Ecran("formulaire", ["vide", "plein"], ZONES, { largeur: 9.4, mats: M });
    form.groupe.position.set(0, 8.25, -PROF + 2.2); hall.add(form.groupe);
  }

  // ---------- morceaux dispersés (site, visuels, communication) ----------
  const morceaux = [];
  if (MODE === "film") {
    const crop = (nom, etat, y0, y1, largeur) => {
      const im = new Image(); const src = `../ui/png/${nom}-${etat}.png`;
      const z = ZONES[nom], tx = new THREE.Texture(); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
      im.src = src; im.decode().then(() => { tx.image = im; tx.needsUpdate = true; });
      tx.repeat.set(1, y1 - y0); tx.offset.set(0, 1 - y1);
      const h = (largeur * z.h * (y1 - y0)) / z.w;
      const g = new THREE.Group();
      const plan = new THREE.Mesh(new THREE.PlaneGeometry(largeur, h), new THREE.MeshBasicMaterial({ map: tx, toneMapped: false, side: THREE.DoubleSide })); plan.position.z = 0.09; g.add(plan);
      const cadre = new THREE.Mesh(new RoundedBoxGeometry(largeur + 0.25, h + 0.25, 0.15, 3, 0.15), M.argent); g.add(cadre);
      return { g, h, plan, tx, im };
    };
    const def = [
      ["site", "base", 0, 0.165, 7.5, [-13, 24, 16], [0.1, 0.5, -0.12], "Site", "site"],
      ["publication", "base", 0, 1, 7.2, [13, 14, 18], [-0.15, -0.55, 0.1], "Visuels", "visuels"],
      ["story", "base", 0, 1, 5.6, [-11, 3.0, 22], [0.2, 0.42, 0.16], "Communication", "communication"],
    ];
    for (const [nom, etat, y0, y1, l, pos, rot, txt, m] of def) {
      const o = crop(nom, etat, y0, y1, l); o.g.position.set(...pos); o.g.rotation.set(...rot); racine.add(o.g);
      o.base = new THREE.Vector3(...pos); o.rot = rot; o.a = mot("p02", m) - 0.15; o.txt = txt;
      morceaux.push(o);
      etiquette({ a: o.a + 0.1, b: T.rassemble + 0.1, txt, cible: () => o.g.localToWorld(new THREE.Vector3(0, o.h / 2 + 0.9, 0)), bleu: true });
    }
  }

  // ---------- site internet (dépliage vertical) ----------
  let site = null;
  const SITE_Y = 6; // centre vertical de la page dans le bâtiment déplié
  if (MODE === "film") {
    site = new Ecran("site", ["base"], ZONES, { largeur: 10.6, mats: M, maxTex: 6000 });
    site.groupe.position.set(0, SITE_Y, -3.2); racine.add(site.groupe);
    site.composer({ base: "base" });
  }
  const DEPLI = { haut: 0, bas: 0 };

  // ---------- caméra ----------
  const zr = zRouleau;
  cles.push(
    { t: 0, p: [10.5, 0.5, zr(0) + 6.5], l: [4.2, 1.6, zr(0) - 0.5], fov: 30 },
    { t: 0.75, p: [10.2, 0.7, zr(0.75) + 6.0], l: [3.8, 1.6, zr(0.75) - 0.5], fov: 30, e: "lin" },
    { t: 1.5, p: [10, 2.8, zr(1.5) + 7.5], l: [1.5, 1.2, zr(1.5) - 3], fov: 34, e: "lin" },
    { t: 2.35, p: [11, 9, zr(2.35) + 12], l: [0, 1.0, 8], fov: 36, e: "lin" },
    { t: 3.5, p: [22, 8, 60], l: [0, 10, 0], fov: 36, e: "lin" },
    { t: 4.9, p: [34, -4, 112], l: [0, 15, -10], fov: 34, e: "out" },
    { t: 8.9, p: [-16, -1, 116], l: [0, 15, -10], fov: 34, e: "io2" },
    { t: T.rassemble + 0.3, p: [-3, 9, 78], l: [0, 11, -4], fov: 35, e: "io" },
    { t: T.ouverture + 0.5, p: [0, 9.6, 38], l: [0, 9.0, -10], fov: 35, e: "io" },
    { t: T.formulaire, p: [0, 8.6, 3.6], l: [0, 8.6, -27], fov: 35, e: "io" },
    { t: T.sortieFormulaire, p: [0, 8.6, 2.6], l: [0, 8.6, -27], fov: 35, e: "lin" },
  );
  // sortie du hall puis vol vers la lettre B de l'enseigne (l'atelier graphique est « dans » la lettre)
  const B0 = oeilB();
  ctx.oeilB = B0;
  cles.push(
    { t: T.sortieFormulaire + 0.75, p: [2.5, 12.5, 22], l: [B0.x, B0.y, B0.z], fov: 38, e: "in" },
    { t: T.traverseeB, p: [B0.x, B0.y, B0.z + 0.05], l: [B0.x, B0.y, B0.z - 10], fov: 44, e: "out" },
  );

  // site : cadrage de chaque zone (la page remplit ~92 % de la largeur ; un gros plan, ~88 %)
  const cadre = (zone, remplissage = 0.92, decalY = 0) => {
    const z = site.zoneMonde(zone), d = z.w / remplissage / (2 * Math.tan(THREE.MathUtils.degToRad(17.5)) * (1080 / 1920));
    return { p: [z.p.x, z.p.y + decalY, z.p.z + d], l: [z.p.x, z.p.y + decalY, z.p.z] };
  };
  if (site) {
    racine.updateMatrixWorld(true);
    const decaleSite = (c, dy) => ({ p: [c.p[0], c.p[1] + dy, c.p[2]], l: [c.l[0], c.l[1] + dy, c.l[2]] });
    const pt = site.zoneMonde("hero");
    const cHero = cadre("hero", 0.9, -0.8), cPrest = cadre("prestation", 0.86), cReal = cadre("realisation", 0.86), cZone = cadre("zone", 0.86), cBtn = cadre("bouton", 0.62), cPhoto = cadre("photo", 0.35);
    const vue = (c, t, e = "io", extra = {}) => ({ t, p: c.p, l: c.l, fov: 35, e, ...extra });
    cles.push(
      { t: T.depli, p: [30, 12, 74], l: [0, 6, -4], fov: 35, cut: true },
      { t: T.depli + 1.4, p: [16, SITE_Y + 4, 62], l: [0, SITE_Y + 2, -3], fov: 35, e: "io" },
      vue(cHero, mot("p06", "site") - 0.2),
      vue({ p: [cHero.p[0], cHero.p[1] - 0.3, cHero.p[2] - 0.8], l: [cHero.l[0], cHero.l[1] - 0.3, cHero.l[2]] }, mot("p06", "services") - 0.55, "lin"),
      vue(cPrest, mot("p06", "services") - 0.05),
      vue({ p: [cPrest.p[0], cPrest.p[1], cPrest.p[2] - 0.5], l: cPrest.l }, mot("p06", "réalisations") - 0.5, "lin"),
      vue(cReal, mot("p06", "réalisations")),
      vue({ p: [cReal.p[0], cReal.p[1], cReal.p[2] - 0.4], l: cReal.l }, mot("p06", "contacter") - 1.15, "lin"),
      vue(cZone, mot("p06", "contacter") - 0.45),
      vue(cBtn, mot("p06", "contacter") + 0.35),
      vue({ p: [cBtn.p[0], cBtn.p[1], cBtn.p[2] - 0.5], l: cBtn.l }, T.plongee, "lin"),
      // plongée dans la photo de la réalisation
      vue(cReal, T.plongee + 0.55, "io"),
      vue(cPhoto, T.plongee + 1.15, "in"),
    );
    ctx.sitePhoto = site.zoneMonde("photo");
  }

  // ---------- légendes ----------
  legende({ a: T.enseigne - 0.1, b: P("p02").debut + 0.35, txt: "Votre métier<br>mérite d'être vu." });
  legende({ a: P("p03").debut, b: T.entree, sur: "E-COM STUDIO IA", txt: "Tout se crée<br>au même endroit." });
  const legForm = legende({ a: T.formulaire - 0.2, b: T.sortieFormulaire + 0.2, num: "1", txt: "Décrivez<br>votre activité." });
  legende({ a: P("p06").debut - 0.5, b: T.plongee + 0.4, num: "3", txt: "Présentez vos services<br>en ligne." });

  // ---------- animation ----------
  const v = new THREE.Vector3();
  const champs = [["activite", "activité"], ["prestations", "prestations"], ["zone", "zone"], ["style", "style"]];
  return {
    volumes, corps, racine, enseigne, logo, moitieHaut, moitieBas, rangees, panneaux, PAS, FW, FH, murModules, dessous,
    maj(t) {
      const fin = T.alignement - 1.6; // le bâtiment sert encore de colonne au « E » final (finale.js prend la main)
      const visibleExt = t < T.traverseeB || (t >= T.depli && t < T.plongee + 1.3);
      const visibleFinale = t >= T.sortie;
      ctx.hemi.color.setHex(0xc8d6ff); ctx.hemi.groundColor.setHex(0x050a1e); ctx.hemi.intensity = 0.35;
      racine.visible = visibleExt || visibleFinale;
      if (!racine.visible) return;
      for (const [i, m] of brumes.entries()) { m.position.x = Math.sin(t * 0.05 + i) * 20 + t * (i + 1) * 0.4; m.position.z = Math.cos(t * 0.04 + i * 2) * 20; }
      for (const m of faisceaux) m.material.opacity = 0.16 * (0.8 + 0.2 * Math.sin(t * 1.3 + m.position.x));
      // rouleau
      rouleau.visible = t < T.traverseeB;
      const z = zRouleau(t), chute = ein(ramp(t, 2.6, 4.4));
      rouleau.position.set(0, R + 0.08 - 26 * chute, z + 6 * chute); tourne.rotation.x = (z - 0.4) / R + chute * 4; rouleau.rotation.z = chute * 0.5;
      // dépliage vertical (site)
      const dp = eio(ramp(t, T.depli + 0.15, T.depli + 1.6));
      const ouvert = t < T.plongee + 1.3 ? dp : 0;
      DEPLI.haut = 34 * ouvert; DEPLI.bas = -27 * ouvert;
      // rangées : pose de la peinture, pliage, puis panneaux de façade
      const L = z - 0.55;
      let base = new THREE.Vector3(0, 0, 0);
      for (let k = 0; k < LIGNES; k++) {
        const phi = angleRangee(t, k);
        const g = rangees[k];
        const off = k >= 3 ? DEPLI.haut : DEPLI.bas;
        g.position.set(base.x, base.y + off, base.z);
        g.rotation.x = phi;
        const vis = clamp01((L - PAS * k) / PAS);
        g.scale.set(1, Math.max(0.0001, t < 2.3 ? vis : 1), 1);
        g.visible = vis > 0 || t > 2.3;
        base = base.clone().add(new THREE.Vector3(0, PAS * Math.cos(phi), PAS * Math.sin(phi)));
        // joints : la surface continue devient des panneaux
        const joint = eout(ramp(t, 3.6, 4.4));
        for (const { pivot, m, gauche } of panneaux[k]) {
          m.scale.set(1 - 0.035 * joint, 1 - 0.035 * joint, 1);
          // façade articulée : les panneaux pivotent sur leur arête extérieure
          const c = panneaux[k].findIndex((x) => x.m === m);
          const ret = Math.abs(c - 1.5) * 0.07 + Math.abs(k - 2.5) * 0.05;
          const ouvre = eio(ramp(t, T.ouverture + ret, T.ouverture + ret + 1.0)) * (1 - eio(ramp(t, T.depli - 0.5, T.depli + 0.2)));
          pivot.rotation.y = (gauche ? -1 : 1) * 1.85 * ouvre;
        }
      }
      // corps : s'étire depuis la façade
      const ext = eout5(ramp(t, 3.2, 4.5));
      corps.scale.set(1, 1, Math.max(0.001, ext));
      moitieHaut.position.y = DEPLI.haut; moitieBas.position.y = DEPLI.bas;
      corps.visible = t > 3.2;
      // volumes qui arrivent du vide, puis dérivent lentement (bâtiment suspendu)
      let i = 0;
      for (const [nom, vv] of Object.entries(volumes)) {
        if (t >= T.sortie) break; // finale.js place les volumes
        const k = eout5(ramp(t, 3.35 + i * 0.18, 4.75 + i * 0.18));
        const drift = Math.sin(t * 0.6 + i * 2) * 0.25;
        const dy = nom === "site" ? DEPLI.bas * 0.6 : DEPLI.haut;
        vv.m.position.set(mix(vv.base.x + vv.from[0], vv.base.x, k), mix(vv.base.y + vv.from[1], vv.base.y, k) + drift + dy, mix(vv.base.z + vv.from[2], vv.base.z, k));
        vv.m.rotation.set(vv.baseRot.x + vv.rot[0] * (1 - k), vv.baseRot.y + vv.rot[1] * (1 - k), vv.baseRot.z + vv.rot[2] * (1 - k));
        vv.m.visible = k > 0.001; vv.m.scale.set(1, 1, 1);
        i++;
      }
      if (t < T.sortie) { enseigne.scale.setScalar(1); enseigne.position.y = FH + 1.6; dessous.scale.y = 1; dessous.visible = true; }
      // enseigne : lettres qui surgissent une à une, puis s'allument
      lettresM.forEach(({ m }, j) => {
        const k = eback(ramp(t, T.enseigne + j * 0.035, T.enseigne + j * 0.035 + 0.45));
        m.scale.set(1, Math.max(0.001, k), 1); m.visible = k > 0.001;
      });
      faceLettre.emissiveIntensity = (0.55 * eout(ramp(t, T.enseigne + 0.3, T.enseigne + 0.9)) + 1.2 * fenetre(t, T.enseigne + 0.3, T.enseigne + 1.0, 0.1, 0.6)) * (1 - 0.85 * ramp(t, T.sortieFormulaire, T.sortieFormulaire + 0.5));
      rail.scale.x = Math.max(0.001, eout(ramp(t, T.enseigne - 0.2, T.enseigne + 0.4)));
      const kl = eback(ramp(t, T.enseigne + 0.45, T.enseigne + 1.05));
      logo.groupe.scale.setScalar(Math.max(0.001, kl)); logo.groupe.rotation.y = (1 - eout(ramp(t, T.enseigne + 0.45, T.enseigne + 1.4))) * Math.PI;
      // morceaux dispersés puis rassemblés dans la façade
      for (const [j, o] of morceaux.entries()) {
        const kin = eback(ramp(t, o.a, o.a + 0.5));
        const disp = eio2(ramp(t, T.dispersion, T.dispersion + 1.2));
        const ras = ein(ramp(t, T.rassemble + j * 0.1, T.rassemble + j * 0.1 + 0.75));
        const pos = o.base.clone().add(new THREE.Vector3(Math.sin(t * 0.9 + j) * 0.4, Math.cos(t * 0.7 + j * 2) * 0.35, 0)).add(o.base.clone().setY(0).normalize().multiplyScalar(disp * 3).setY((j - 1) * disp * 1.5));
        pos.lerp(new THREE.Vector3(0, 9.3, 0.4), ras);
        o.g.position.copy(pos);
        o.g.rotation.set(o.rot[0] * (1 + disp) + ras * 1.5, o.rot[1] * (1 + disp * 0.8) + ras * 3, o.rot[2] * (1 + disp * 1.4));
        o.g.scale.setScalar(Math.max(0.001, kin * (1 - ras * 0.92)));
        o.g.visible = t > o.a && ras < 1;
      }
      // façade qui s'illumine quand tout est rassemblé, intérieur qui s'allume
      const flash = fenetre(t, T.rassemble + 0.75, T.rassemble + 1.6, 0.1, 0.7);
      M.peinture.emissive = M.peinture.emissive || new THREE.Color(); M.peinture.emissive.setHex(0x2350ff); M.peinture.emissiveIntensity = 0.9 * flash;
      hall.visible = t > T.ouverture - 0.2 && t < T.traverseeB;
      lumHall.intensity = 320 * eout(ramp(t, T.ouverture, T.ouverture + 1.2));
      // formulaire : chaque champ se remplit quand la voix le nomme
      if (form) {
        form.composer({ base: "vide", reveles: champs.map(([z, m]) => ({ etat: "plein", zone: z, p: eio2(ramp(t, mot("p04", m) - 0.1, mot("p04", m) + 0.55)) })) });
        form.groupe.position.y = 8.25 + (1 - eout(ramp(t, T.ouverture + 0.5, T.formulaire))) * -2;
      }
      // site
      if (site) {
        site.groupe.visible = t > T.depli && t < T.plongee + 1.3;
        site.groupe.scale.setScalar(Math.max(0.001, eout(ramp(t, T.depli + 0.4, T.depli + 1.5))));
        site.liseret.material = M.lueurDouce;
      }
      // éclairage et ombres de la zone
      if (t < T.traverseeB) {
        ombres(new THREE.Vector3(0, 10, t < T.entree ? 0 : -14), t < 2.5 ? 14 : 40, [0.6, 1, 0.75], 4.2);
        contre.position.set(-18, 6, -40); contre.intensity = 900;
      } else if (t < T.plongee + 1.3) {
        ombres(new THREE.Vector3(0, 6, -3), 40, [0.5, 0.8, 1], 2.6);
        contre.position.set(0, 6, -30); contre.intensity = 1400;
      }
      bloom.strength = 0.35 + 0.5 * flash;
    },
  };
}
