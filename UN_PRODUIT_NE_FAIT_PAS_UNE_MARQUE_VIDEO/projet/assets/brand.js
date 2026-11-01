/* Scène « création » (noir et bleu, faisceaux) : naissance de la marque KELVO autour de la lampe (logo tracé, palette,
   typographies, écrin construit face par face, carte), portail, boutique (accueil construit section par section,
   fiche produit, bénéfices, panier, version ordinateur), contenus (visuel produit, publications, publicités animées,
   SEO, calendrier), puis la demande à SYNA et la modification de la boutique (v1 → v2 restaurable). */
import * as THREE from "three";
import { std, basic, rbox, rng, canvasTex, card, setCardMap, tex, seg, ease, lerp, clamp, bez, glow, v3, skyDome } from "./lib.js";
import { makePhone, makeLaptop, STUDIO } from "./actors.js";
import { makeLamp, makePack, KELVO } from "./lamp.js";

export const B = {
  lamp: v3(0, 3.2, 0), logo: v3(0, 5.35, 0),
  home: v3(0, 3.3, 0.6), product: v3(-1.05, 3.55, -0.35), cart: v3(1.05, 3.55, -0.35), ben: v3(0, 1.75, 1.35), desk: v3(0, 0.55, 1.5),
  C: v3(0, 18, 0), // centre de la zone « contenus » (au-dessus : la caméra monte)
  M: v3(9, 3.2, 0), // zone de la modification (SYNA + boutique)
};

export function buildBrand() {
  const scene = new THREE.Scene(); const R = rng(41);
  scene.add(skyDome("#0B1640", "#070C20", "#04060E", 500));
  scene.fog = new THREE.FogExp2("#070C20", 0.02);
  scene.add(new THREE.HemisphereLight("#7C9BFF", "#05070F", 0.75));
  const key = new THREE.SpotLight("#EEF2FF", 160, 40, 0.6, 0.6, 1.2); key.position.set(-4, 12, 9); key.target.position.copy(B.lamp); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key, key.target);
  const warm = new THREE.PointLight(KELVO.ambre, 30, 10, 1.6); warm.position.set(2.2, 4, 3); scene.add(warm);
  const rim = new THREE.PointLight("#3D6EF0", 70, 20, 1.5); rim.position.set(-3, 5, -4); scene.add(rim);
  const grid = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = "#070B1A"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(90,130,255,.35)"; g.lineWidth = 2; for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }, [14, 14]);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(90, 96), std("#ffffff", { map: grid, roughness: 0.3, metalness: 0.5, emissive: "#101A40", emissiveIntensity: 0.3 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.4; floor.receiveShadow = true; scene.add(floor);
  const beamMat = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { col: { value: new THREE.Color("#4F7BFF") }, op: { value: 0.2 } },
    vertexShader: "varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = uv.y; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }",
    fragmentShader: "uniform vec3 col; uniform float op; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(vN,vV)),1.6); gl_FragColor = vec4(col, op*f*pow(vY,1.5)); }" });
  const beams = [[-3, 0.25, 0], [2.6, -0.2, 0], [0, 0.04, -2], [6.5, 0.2, 0], [11, -0.15, 0]].map(([x, rz, z], i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 3.4, 30, 40, 1, true), beamMat()); m.position.set(x, 12, -5 + z); m.rotation.z = rz; scene.add(m); return m; });
  const n = 900, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = -8 + R() * 26; pos[i * 3 + 1] = R() * 26; pos[i * 3 + 2] = -10 + R() * 16; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: "#9DB8FF", size: 0.045, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(dust);

  // ---------------- la lampe et l'identité
  const lamp = makeLamp(); scene.add(lamp); lamp.userData.setLit(1.0);
  const lampGlow = glow(KELVO.ambre, 1.8, 0.25); scene.add(lampGlow);
  // logo : l'anneau de lumière se trace (tube), le point s'allume, le mot-symbole apparaît
  const arcPts = []; for (let i = 0; i <= 64; i++) { const a = Math.PI / 2 - 0.33 - (i / 64) * (Math.PI * 2 - 0.66); arcPts.push(v3(Math.cos(a) * 0.38, Math.sin(a) * 0.38, 0)); } // anneau ouvert en haut, tracé dans le sens horaire
  const arcCurve = new THREE.CatmullRomCurve3(arcPts);
  const ringMat = new THREE.MeshStandardMaterial({ color: KELVO.ambre, emissive: KELVO.ambre, emissiveIntensity: 0.45, roughness: 0.3 });
  const arc = new THREE.Mesh(new THREE.TubeGeometry(arcCurve, 120, 0.055, 12, false), ringMat); const arcCount = arc.geometry.index.count;
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), ringMat); dot.position.y = -0.02;
  const logoG = new THREE.Group(); logoG.add(arc, dot); scene.add(logoG);
  const word = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42), new THREE.MeshBasicMaterial({ map: canvasTex(1024, 256, (g, w, h) => { g.fillStyle = "#fff"; g.font = "700 190px SpaceG"; g.textBaseline = "middle"; g.textAlign = "center"; g.letterSpacing = "26px"; g.fillText("KELVO", w / 2, h / 2 + 8); }), transparent: true, depthWrite: false })); scene.add(word);
  const sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(0.025, 6, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFD9A0").multiplyScalar(2) }), 70); scene.add(sparks);
  const sparkFrom = Array.from({ length: 70 }, () => v3((R() - 0.5) * 5, R() * 6 + 1, (R() - 0.5) * 3));
  const pal = [KELVO.nuit, KELVO.ambre, KELVO.corail, KELVO.brume, KELVO.graphite].map((c) => { const m = new THREE.Mesh(rbox(0.32, 0.32, 0.08, 0.07), std(c, { roughness: 0.35, emissive: c, emissiveIntensity: 0.15 })); m.castShadow = true; scene.add(m); return m; });
  const typo = card(tex("ui-k-typo.png"), 1.5, 0.875, { depth: 0.03, radius: 0.08 }); scene.add(typo);
  const bcard = card(tex("ui-k-card.png"), 1.0, 0.567, { depth: 0.02, radius: 0.05 }); scene.add(bcard);
  const pack = makePack({ front: tex("ui-pack-front.png"), back: tex("ui-pack-back.png"), side: tex("ui-pack-side.png"), top: tex("ui-pack-top.png"), bottom: tex("ui-pack-bottom.png") }); scene.add(pack);
  const packFrom = pack.userData.faces.map((f, i) => { const a = (i / 6) * Math.PI * 2; return v3(Math.cos(a) * 4, 1.5 + Math.sin(a * 1.7) * 2, Math.sin(a) * 3); });
  const portal = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.06, 16, 120), new THREE.MeshBasicMaterial({ color: new THREE.Color("#7CA4FF").multiplyScalar(2), transparent: true, opacity: 0 })); scene.add(portal);
  const portalDisc = new THREE.Mesh(new THREE.CircleGeometry(1.0, 64), new THREE.MeshBasicMaterial({ color: "#3D6EF0", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(portalDisc);

  // ---------------- la boutique
  const home = makePhone(tex("ui-k-home-v1.png")); scene.add(home);
  const secs = [["ui-k-sec-hero.png", 470, 0], ["ui-k-sec-reass.png", 96, 470], ["ui-k-sec-ben.png", 330, 566]].map(([t, h, top]) => { const c = card(tex(t), 0.86, 0.86 * h / 430, { depth: 0.03, radius: 0.03 }); c.userData.top = top; c.userData.hpx = h; scene.add(c); return c; });
  const product = makePhone(tex("ui-k-product.png")); scene.add(product);
  const cart = makePhone(tex("ui-k-cart.png")); scene.add(cart);
  const ben = card(tex("ui-k-sec-ben.png"), 1.3, 1.0, { depth: 0.04, radius: 0.08 }); scene.add(ben);
  const desk = makeLaptop(tex("ui-k-desk-v1.png"), { w: 1.6, h: 1.0 }); scene.add(desk);

  // ---------------- contenus (zone haute) : visuel, publications, publicité animée, SEO, calendrier
  const cLamp = makeLamp(); scene.add(cLamp);
  const raw = card(tex("photo-generique.jpg"), 0.9, 1.2, { depth: 0.02, radius: 0.04 }); const vis = card(tex("ui-k-visuel.png"), 0.96, 1.2, { depth: 0.02, radius: 0.05 }); scene.add(raw, vis);
  const posts = ["ui-k-post-1.png", "ui-k-post-2.png", "ui-k-post-3.png"].map((t) => { const c = card(tex(t), 0.85, 0.85, { depth: 0.03, radius: 0.05 }); scene.add(c); return c; });
  const adPhone = makePhone(tex("ui-k-ad-1.png")); scene.add(adPhone);
  const adTex = [tex("ui-k-ad-1.png"), tex("ui-k-ad-2.png"), tex("ui-k-ad-3.png")];
  const seoC = ["ui-k-seo-title.png", "ui-k-seo-desc.png", "ui-k-seo-faq.png"].map((t) => { const c = card(tex(t), 1.6, 0.3, { depth: 0.03, radius: 0.08 }); scene.add(c); return c; });
  const tags = { visuel: card(tex("ui-tag-visuel.png"), 1.6, 0.17, { depth: 0.02, radius: 0.08 }), post: card(tex("ui-tag-post.png"), 1.6, 0.17, { depth: 0.02, radius: 0.08 }), ad: card(tex("ui-tag-ad.png"), 1.6, 0.17, { depth: 0.02, radius: 0.08 }) };
  Object.values(tags).forEach((c) => scene.add(c));
  const cal = card(tex("ui-k-cal-empty.png"), 1.9, 2.87, { depth: 0.04, radius: 0.1 }); scene.add(cal);
  const calTex = { empty: tex("ui-k-cal-empty.png"), full: tex("ui-k-cal.png") };
  const days = [3, 6, 10, 13, 17, 20, 24, 27];
  const minis = days.map((d, i) => { const m = card(tex(["ui-k-post-1.png", "ui-k-post-2.png", "ui-k-post-3.png"][i % 3]), 0.2, 0.2, { depth: 0.01, radius: 0.02 }); scene.add(m); return { m, d, i }; });
  const pulse = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 8, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color(KELVO.ambre).multiplyScalar(2), transparent: true, opacity: 0, depthWrite: false })); scene.add(pulse);

  // ---------------- la demande à SYNA et la modification
  const syna = card(tex("ui-m-syna-a.png"), 0.86, 1.8, { depth: 0.025, radius: 0.07, side: "#1B1D21" }); scene.add(syna);
  const synaTex = { a: tex("ui-m-syna-a.png"), b: tex("ui-m-syna-b.png"), c: tex("ui-m-syna-c.png") };
  const shop2 = makePhone(tex("ui-k-home-v1.png")); scene.add(shop2);
  const mod = { hero: card(tex("ui-k-sec-hero.png"), 0.86, 0.86 * 470 / 430, { depth: 0.03, radius: 0.03 }), reass: card(tex("ui-k-sec-reass.png"), 0.86, 0.86 * 96 / 430, { depth: 0.03, radius: 0.03 }), ben: card(tex("ui-k-sec-ben.png"), 0.86, 0.86 * 330 / 430, { depth: 0.03, radius: 0.03 }) };
  Object.values(mod).forEach((c) => scene.add(c));
  const darkTex = { hero: tex("ui-k-sec-hero-d.png"), ben: tex("ui-k-sec-ben-d.png") };
  ["ui-k-home-v1.png", "ui-k-home-v2.png", "ui-k-sec-hero.png", "ui-k-sec-reass.png", "ui-k-sec-ben.png", "ui-k-post-1.png", "ui-k-post-3.png"].forEach((n) => tex(n)); // préchargées (aucune image noire au rendu)
  const post2 = card(tex("ui-k-post-1.png"), 0.7, 0.7, { depth: 0.03, radius: 0.05 }); scene.add(post2);
  const sweep = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.035), new THREE.MeshBasicMaterial({ color: new THREE.Color(KELVO.ambre).multiplyScalar(1.6), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(sweep);
  const verTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = "#2F5BEA"; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 40); g.fill(); g.fillStyle = "#fff"; g.font = "700 64px Inter"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("v2", w / 2, h / 2 + 3); });
  const ver = new THREE.Sprite(new THREE.SpriteMaterial({ map: verTex, transparent: true })); scene.add(ver);

  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sv = new THREE.Vector3();
  const show = (o, p, s = 1) => { o.visible = p > 0.002; o.scale.setScalar(Math.max(0.001, p * s)); };
  const PH = 1.8; // hauteur d'écran des téléphones

  function update(t) {
    dust.rotation.y = t * 0.01; beams.forEach((b, i) => (b.material.uniforms.op.value = 0.18 + 0.06 * Math.sin(t * 0.9 + i)));
    // --- lampe principale (17,4–27,7) : flotte, tourne vite, entre dans l'image de la page d'accueil
    const into = ease.in(seg(t, 20.55, 20.95));
    lamp.visible = t < 20.98; lamp.userData.setLit(1.0);
    lamp.position.copy(B.lamp).add(v3(0, Math.sin(t * 2) * 0.05, 0)); lamp.rotation.set(0.08 * Math.sin(t * 3), t * 2.6, 0.06 * Math.sin(t * 2.2));
    if (into > 0) { bez(B.lamp, v3(0, 3.4, 0.9), tmp.copy(B.home).add(v3(0, 0.45, 0.1)), into, lamp.position); lamp.scale.setScalar(Math.max(0.001, 1 - into * 0.85)); } else lamp.scale.setScalar(1);
    lampGlow.position.copy(lamp.position).add(v3(0, 0, 0.3)); lampGlow.material.opacity = lamp.visible ? 0.28 : 0;
    // --- « Un logo » : l'anneau se trace, le point s'allume, le mot-symbole
    const lgo = ease.inOut(seg(t, 17.65, 18.3)); const lgUp = ease.inOut(seg(t, 19.35, 19.85)); const lgOut = ease.in(seg(t, 20.4, 20.75));
    logoG.visible = t > 17.6 && lgOut < 1; arc.geometry.setDrawRange(0, Math.floor(arcCount * lgo / 6) * 6);
    dot.scale.setScalar(Math.max(0.001, ease.back(seg(t, 18.2, 18.45))));
    logoG.position.copy(B.logo).lerp(v3(-0.75, 6.05, -0.6), lgUp); logoG.scale.setScalar(lerp(1, 0.5, lgUp) * (1 - lgOut)); logoG.rotation.y = Math.sin(t * 1.2) * 0.12;
    word.visible = t > 18.25 && lgOut < 1; word.material.opacity = ease.out(seg(t, 18.25, 18.6)); word.position.copy(B.logo).add(v3(0, -0.62, 0)).lerp(v3(0.35, 6.05, -0.6), lgUp); word.scale.setScalar(lerp(1, 0.6, lgUp) * (1 - lgOut));
    sparks.visible = t > 17.5 && t < 18.5;
    sparkFrom.forEach((f, i) => { const p = ease.inOut(seg(t, 17.5 + (i % 9) * 0.03, 18.2 + (i % 9) * 0.03)); const a = (i / 70) * Math.PI * 2; tmp.copy(f).lerp(tmp2.set(B.logo.x + Math.cos(a) * 0.38, B.logo.y + Math.sin(a) * 0.38, B.logo.z), p); sparks.setMatrixAt(i, M.compose(tmp, Q, Sv.setScalar(1 - p * 0.7))); });
    sparks.instanceMatrix.needsUpdate = true;
    // --- « une identité » : la palette tourne autour de la lampe, la typographie
    pal.forEach((m, i) => { const a = 18.7 + i * 0.06; const p = ease.back(seg(t, a, a + 0.3)); const out = ease.in(seg(t, 20.3, 20.6)); const th = t * 3.2 + i * 1.2566;
      m.visible = t > a && out < 1; m.scale.setScalar(Math.max(0.001, p * (1 - out))); m.position.set(B.lamp.x + Math.cos(th) * 0.92, B.lamp.y + 0.1 + Math.sin(th * 0.5) * 0.25, B.lamp.z + Math.sin(th) * 0.8); m.rotation.set(th, th * 0.7, 0); });
    show(typo, ease.back(seg(t, 18.95, 19.3)) * (1 - ease.in(seg(t, 19.6, 19.9)))); typo.position.set(0, 2.05, 1.25); typo.rotation.y = Math.sin(t * 2) * 0.15;
    // --- « un univers visuel » : l'écrin se construit face par face autour de la lampe, puis s'ouvre vers le haut
    const build = (i) => ease.inOut(seg(t, 19.35 + i * 0.06, 19.75 + i * 0.06)); const pOut = ease.in(seg(t, 20.25, 20.55));
    pack.visible = t > 19.3 && pOut < 1; pack.position.copy(B.lamp).add(v3(0, 0, 0)); pack.rotation.y = t * 1.6; pack.scale.setScalar(1 + pOut * 0.4);
    pack.userData.faces.forEach((f, i) => { const p = build(i); f.position.copy(packFrom[i]).lerp(f.userData.pos, p); f.rotation.set(f.userData.rot.x + (1 - p) * 2, f.userData.rot.y + (1 - p) * 2, f.userData.rot.z); f.material.opacity = 1; });
    pack.userData.edge.material.opacity = Math.max(0, 1 - Math.abs(t - 19.85) / 0.25) * (1 - pOut);
    pack.userData.faces.forEach((f) => { f.material.transparent = pOut > 0; f.material.opacity = 1 - pOut; });
    show(bcard, ease.back(seg(t, 19.75, 20.0)) * (1 - ease.in(seg(t, 20.3, 20.5)))); bcard.position.set(1.0, 2.2, 1.0); bcard.rotation.set(-0.2, -0.4 + Math.sin(t * 3) * 0.2, 0.1);
    // --- portail : la lampe le traverse, la boutique prend forme
    const po = ease.out(seg(t, 20.15, 20.45)) * (1 - ease.in(seg(t, 20.85, 21.1)));
    portal.visible = portalDisc.visible = po > 0.01; portal.position.copy(B.lamp).add(v3(0, 0.15, 0.5)); portalDisc.position.copy(portal.position); portal.scale.setScalar(Math.max(0.01, po * 1.25)); portalDisc.scale.copy(portal.scale);
    portal.material.opacity = po; portalDisc.material.opacity = 0.35 * po; portal.rotation.z = t * 2;
    // accueil : le téléphone, puis les sections volent et s'empilent dans l'écran
    const hp = ease.back(seg(t, 20.7, 21.05)); const hOut = ease.in(seg(t, 26.9, 27.3));
    show(home, hp * (1 - hOut), 1.15); home.position.copy(B.home).add(v3(0, hOut * 3, 0)); home.rotation.y = 0;
    const secsOn = t < 21.75;
    home.userData.screen.visible = !secsOn || t < 20.7;
    secs.forEach((c, i) => { const a = 20.85 + i * 0.16; const p = ease.out(seg(t, a, a + 0.32));
      const sc = 1.15; const w = 0.86 * sc, hh = c.userData.hpx * 0.86 / 430 * sc; const topY = B.home.y + (PH * sc) / 2 - 0.062 * 2 * sc - (c.userData.top * 0.86 / 430) * sc;
      tmp.set(B.home.x, topY - hh / 2, B.home.z + 0.02); c.visible = t > a && secsOn; c.position.copy(tmp).add(v3((i - 1) * 2.4 * (1 - p), (1 - p) * 1.2, (1 - p) * 2.5)); c.rotation.set(0, (1 - p) * 1.4 * (i % 2 ? -1 : 1), 0); c.scale.setScalar(sc); });
    // fiche produit, bénéfices (« arguments »), panier, version ordinateur
    const pIn = ease.back(seg(t, 21.3, 21.65)); show(product, pIn * (1 - hOut)); product.position.copy(B.product).add(v3(-(1 - pIn) * 1.5, hOut * 3, 0)); product.rotation.y = 0.38;
    const bIn = ease.back(seg(t, 22.15, 22.5)); show(ben, bIn * (1 - hOut)); ben.position.copy(B.ben).add(v3(0, hOut * 3, 0)); ben.rotation.x = -0.15 + Math.sin(t * 2) * 0.03;
    const cIn = ease.back(seg(t, 23.3, 23.65)); show(cart, cIn * (1 - hOut)); cart.position.copy(B.cart).add(v3((1 - cIn) * 1.5, hOut * 3, 0)); cart.rotation.y = -0.38;
    const dIn = ease.back(seg(t, 23.9, 24.3)); show(desk, dIn * (1 - hOut)); desk.position.copy(B.desk).add(v3(0, -(1 - dIn) * 0.8 + hOut * 3, 0)); desk.userData.lid.rotation.x = -0.12 - (1 - dIn) * 1.3;
    // --- contenus (zone haute) : chaque création est présentée en grand au premier plan, puis rejoint sa place autour
    //     de la lampe (composition verticale) ; « même identité » : la composition tourne, onde ambre ; puis le calendrier
    const C = B.C; const PS = v3(C.x, C.y, 2.7);
    const cl = ease.in(seg(t, 37.3, 37.7));
    cLamp.visible = t > 26.9 && t < 37.7; cLamp.userData.setLit(1.0); cLamp.position.copy(C).add(v3(0, Math.sin(t * 2) * 0.04, 0.4)); cLamp.rotation.set(0.05, t * 1.4, 0); cLamp.scale.setScalar(0.85 * (1 - cl) + 0.001);
    const turn = Math.sin(seg(t, 31.45, 33.3) * Math.PI) * 0.4; const out = ease.in(seg(t, 33.3, 33.7));
    const SL = { vis: v3(-0.65, 19.4, 0.2), p0: v3(0.68, 19.45, 0.2), p1: v3(0.8, 18.15, 0.3), p2: v3(-0.8, 18.15, 0.3), ad: v3(0.62, 17.05, 0.3), seo: v3(-0.6, 16.95, 0.35) };
    /** présente o au premier plan (pIn), puis l'envoie à sa place (pTo) ; tourne avec la composition ; s'en va au calendrier. */
    const route = (o, slot, front, sFront, sSlot, pIn, pTo) => {
      o.visible = pIn > 0.01 && out < 0.99;
      tmp.copy(front).lerp(slot, pTo);
      if (turn) { const d = tmp.x - C.x, dz = tmp.z - C.z; tmp.x = C.x + d * Math.cos(turn) + dz * Math.sin(turn); tmp.z = C.z - d * Math.sin(turn) + dz * Math.cos(turn); }
      tmp.y += out * 3.5; tmp.x *= 1 + out * 0.6; o.position.copy(tmp);
      o.scale.setScalar(Math.max(0.001, pIn * lerp(sFront, sSlot, pTo) * (1 - out)));
      return tmp;
    };
    // visuel produit : la photo brute (catalogue) se retourne en visuel de marque
    const vIn = ease.back(seg(t, 27.7, 27.95)), flip = ease.inOut(seg(t, 28.0, 28.3)), vTo = ease.inOut(seg(t, 28.4, 28.7));
    [raw, vis].forEach((o) => { route(o, SL.vis, PS, 1.25, 0.8, vIn, vTo); o.rotation.set(0, (o === raw ? 0 : -Math.PI) + flip * Math.PI, 0); });
    raw.visible = raw.visible && flip < 0.5; vis.visible = vis.visible && flip >= 0.5;
    show(tags.visuel, ease.back(seg(t, 28.05, 28.25)) * (1 - ease.in(seg(t, 28.35, 28.5)))); tags.visuel.position.copy(PS).add(v3(0, -0.95, 0.1));
    // publications : trois cartes en éventail, puis à leur place
    const pSlots = [SL.p0, SL.p1, SL.p2];
    posts.forEach((o, i) => { const a = 28.6 + i * 0.13; const pIn = ease.back(seg(t, a, a + 0.25)); const pTo = ease.inOut(seg(t, 29.3 + i * 0.06, 29.6 + i * 0.06));
      route(o, pSlots[i], v3(PS.x + (i - 1) * 0.62, PS.y + 0.05 - Math.abs(i - 1) * 0.08, PS.z - Math.abs(i - 1) * 0.1), 0.62, i === 0 ? 0.85 : 0.8, pIn, pTo); o.rotation.set(0, (i - 1) * -0.25 * (1 - pTo) + Math.sin(t * 1.6 + i) * 0.06, (i - 1) * -0.06 * (1 - pTo)); });
    show(tags.post, ease.back(seg(t, 28.9, 29.1)) * (1 - ease.in(seg(t, 29.25, 29.4)))); tags.post.position.copy(PS).add(v3(0, -0.6, 0.15));
    // publicité animée sur un téléphone
    const aIn = ease.back(seg(t, 29.6, 29.85)), aTo = ease.inOut(seg(t, 30.4, 30.7));
    route(adPhone, SL.ad, PS, 0.95, 0.62, aIn, aTo); adPhone.rotation.y = Math.sin(t * 1.2) * 0.1;
    adPhone.userData.sm.map = adTex[Math.floor(Math.max(0, t - 29.85) / 0.5) % 3];
    show(tags.ad, ease.back(seg(t, 29.9, 30.1)) * (1 - ease.in(seg(t, 30.3, 30.45)))); tags.ad.position.copy(PS).add(v3(0, -1.1, 0.15));
    // SEO : les blocs s'assemblent en page, puis rejoignent leur place
    const sTo = ease.inOut(seg(t, 31.2, 31.5));
    seoC.forEach((o, i) => { const a = 30.62 + i * 0.1; const pIn = ease.out(seg(t, a, a + 0.25));
      const front = v3(PS.x - (1 - pIn) * 2.2, PS.y + 0.36 - i * 0.36, PS.z + (1 - pIn) * 0.5); const slot = v3(SL.seo.x, SL.seo.y + 0.24 - i * 0.24, SL.seo.z);
      route(o, slot, front, 0.9, 0.62, Math.max(pIn, 0.001) > 0.01 ? 1 : 0, sTo); o.visible = o.visible && pIn > 0.01; o.rotation.set(0, (1 - pIn) * 1.0, 0); });
    // « tout suit la même identité » : onde ambre autour de la composition
    const pu = seg(t, 32.0, 32.7); pulse.visible = pu > 0 && pu < 1; pulse.position.copy(C).add(v3(0, 0, 0.4)); pulse.scale.set(0.3 + ease.out(pu) * 1.6, 0.3 + ease.out(pu) * 2.4, 1); pulse.material.opacity = 1 - pu;
    // calendrier éditorial
    const kIn = ease.back(seg(t, 33.45, 33.85)); show(cal, kIn * (1 - ease.in(seg(t, 35.95, 36.3)))); cal.position.set(C.x, C.y, 1.9);
    setCardMap(cal, t > 35.0 ? calTex.full : calTex.empty);
    minis.forEach(({ m, d, i }) => { const cell = d + 5; const col = cell % 7, row = Math.floor(cell / 7); const xc = 26 + (col + 0.5) * 115.4, yc = 236 + (row + 0.5) * 166 - 12;
      tmp.set(cal.position.x + (xc / 860 - 0.5) * 1.9, cal.position.y + (0.5 - yc / 1300) * 2.87, cal.position.z + 0.05); const a = 33.95 + i * 0.12; const p = ease.in(seg(t, a, a + 0.32));
      m.visible = t > a && t < 35.0; m.position.set(tmp.x, tmp.y + (1 - p) * 1.4, tmp.z + (1 - p) * 0.8); });
    // --- SYNA et la modification
    const M0 = B.M;
    const sIn = ease.back(seg(t, 38.15, 38.5)); show(syna, sIn); syna.position.copy(M0).add(v3(-0.75, 0.05, 0.2)); syna.rotation.y = 0.06;
    setCardMap(syna, t >= 41.3 ? synaTex.c : t >= 39.45 ? synaTex.b : synaTex.a);
    const shIn = ease.back(seg(t, 38.3, 38.65)); show(shop2, shIn); shop2.position.copy(M0).add(v3(0.75, 0.05, 0.1)); shop2.rotation.y = -0.06;
    // décomposition en sections (39,6), réorganisation (40,0–40,5), passage en version premium (40,5–40,9), retour (41,0)
    const ex = ease.out(seg(t, 39.55, 39.85)), re = ease.inOut(seg(t, 39.95, 40.45)), dk = seg(t, 40.45, 40.85), back = ease.in(seg(t, 40.85, 41.1));
    const modOn = t > 39.55 && t < 41.1; shop2.userData.screen.visible = !modOn;
    shop2.userData.sm.map = tex(t >= 41.05 ? "ui-k-home-v2.png" : "ui-k-home-v1.png");
    const s0 = shop2.position; const scH = 0.86 / 430; const top = s0.y + PH / 2 - 0.12;
    const y1 = { hero: top - 470 * scH / 2, reass: top - 470 * scH - 96 * scH / 2, ben: top - 566 * scH - 330 * scH / 2 };
    const y2 = { hero: top - 510 * scH / 2, ben: top - 510 * scH - 330 * scH / 2, reass: top - 840 * scH - 96 * scH / 2 };
    ["hero", "reass", "ben"].forEach((k, i) => { const c = mod[k]; c.visible = modOn; const z = s0.z + 0.06 + ex * (0.25 + i * 0.12) * (1 - back);
      c.position.set(s0.x + (k === "ben" ? 0.35 * Math.sin(re * Math.PI) : k === "reass" ? -0.3 * Math.sin(re * Math.PI) : 0), lerp(y1[k], y2[k], re), z); c.rotation.y = -0.1;
      if (k !== "reass" && dk > 0.5) { setCardMap(c, darkTex[k]); c.scale.set(1, k === "hero" ? 510 / 470 : 1, 1); } else { setCardMap(c, tex(`ui-k-sec-${k}.png`)); c.scale.set(1, 1, 1); } if (k === "reass") c.scale.setScalar(Math.max(0.001, 1 - dk)); });
    sweep.visible = dk > 0 && dk < 1; sweep.position.set(s0.x, top - dk * PH, s0.z + 0.6); sweep.material.opacity = 0.7 * Math.sin(dk * Math.PI);
    // « tes contenus évoluent » : la publication liée change aussi
    const pi = ease.back(seg(t, 39.6, 39.9)); show(post2, pi * (1 - ease.in(seg(t, 42.55, 42.8)))); post2.position.copy(M0).add(v3(0.0, -1.2, 0.75)); const pf = ease.inOut(seg(t, 40.55, 40.9)); post2.rotation.y = pf * Math.PI * 2; setCardMap(post2, tex(pf > 0.5 ? "ui-k-post-3.png" : "ui-k-post-1.png"));
    const vp = ease.back(seg(t, 41.3, 41.6)); ver.visible = vp > 0.01; ver.scale.set(0.5 * vp, 0.25 * vp, 1); ver.position.copy(M0).add(v3(0.75, 1.25, 0.5));
  }
  return { scene, update, lamp };
}
