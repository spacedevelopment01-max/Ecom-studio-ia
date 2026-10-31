/* Espace de création (bleu nuit, lumière volumétrique) : la boutique miniature, l'identité (logo, palette), les
   vêtements qui rejoignent leurs fiches produits, le site (accueil, collection, fiche, panier, version ordinateur),
   puis la communication (publications, publicité animée, calendrier), la demande à SYNA et la modification, et le
   final (tout converge dans le vrai studio, logo E-COM STUDIO ia). Composé pour le 9:16 : tout est cadré en entier. */
import * as THREE from "three";
import { std, basic, rbox, rng, canvasTex, card, setCardMap, tex, seg, ease, lerp, clamp, bez, glow, v3, skyDome } from "./lib.js";
import { makePhone, makeLaptop, makeLogoE, STUDIO } from "./actors.js";
import { makeGarment, AUBE, PRODUCTS } from "./garments.js";

export const L = {
  dio: v3(0, 0, 0), logo: v3(0, 6.3, -0.4), home: v3(0, 3.6, 1.1),
  cards: [v3(-1.55, 4.75, 0.6), v3(-1.55, 2.95, 0.6), v3(1.55, 4.75, 0.6), v3(1.55, 2.95, 0.6)],
  pages: { collection: v3(-1.25, 3.9, -1.2), product: v3(1.25, 3.9, -1.2), cart: v3(0, 5.9, -2.4) }, laptopSite: v3(0, 0.95, 2.3),
  // scène 5 (zone décalée vers la droite pour un vrai déplacement de caméra)
  S: v3(14, 3.2, 0), posts: [v3(12.65, 4.55, 0.5), v3(15.35, 4.2, 0.4), v3(12.75, 1.95, 0.6)], AD: v3(17.8, 3.1, 0.2), CAL: v3(10.0, 3.3, -0.6), SY: v3(21.4, 3.2, 0.3),
  // final
  END: v3(0, 0, -40),
};

function makeMini() {
  // boutique miniature : même façade que la rue (devanture encre, enseigne, store rayé, vitrine allumée, étages, toit)
  const g = new THREE.Group(); const k = 0.24;
  const stoneT = canvasTex(256, 256, (c, w, h) => { c.fillStyle = "#E6DACA"; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 22) { c.fillStyle = "rgba(120,100,80,.18)"; c.fillRect(0, y, w, 2); } });
  const stone = std("#ffffff", { map: stoneT, roughness: 0.9 });
  const W = 9 * k, Gd = 4.2 * k, Hup = 3 * 3.1 * k, D = 5 * k;
  const up = new THREE.Mesh(new THREE.BoxGeometry(W, Hup, D), stone); up.position.set(0, Gd + Hup / 2, -D / 2); up.castShadow = true; g.add(up);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1, 1, 4, 1), std("#6E7782", { metalness: 0.5, roughness: 0.45 })); roof.rotation.y = Math.PI / 4; roof.scale.set(W * 0.72, 3 * k, D * 0.72); roof.position.set(0, Gd + Hup + 1.5 * k, -D / 2); g.add(roof);
  for (let f = 0; f < 3; f++) for (let i = 0; i < 3; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.0 * k, 1.9 * k), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFC98A").multiplyScalar(f === 1 && i === 2 ? 0.25 : 1.1) })); w.position.set(-W / 2 + (i + 0.5) * (W / 3), Gd + f * 3.1 * k + 1.55 * k, 0.005); g.add(w); }
  const ink = std("#24212A", { roughness: 0.45 });
  const sf = new THREE.Mesh(new THREE.BoxGeometry(W, Gd, D), ink); sf.position.set(0, Gd / 2, -D / 2 - 0.02); g.add(sf);
  const glassIn = new THREE.Mesh(new THREE.PlaneGeometry(5.5 * k, 2.9 * k), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFD8A8").multiplyScalar(1.15) })); glassIn.position.set(-1.25 * k, 1.95 * k, 0.012); g.add(glassIn);
  const doorIn = new THREE.Mesh(new THREE.PlaneGeometry(1.6 * k, 3.0 * k), glassIn.material); doorIn.position.set(2.65 * k, 1.6 * k, 0.012); g.add(doorIn);
  const fas = new THREE.Mesh(new THREE.PlaneGeometry(7.6 * k, 0.9 * k), new THREE.MeshBasicMaterial({ map: tex("ui-enseigne.png") })); fas.position.set(0, 3.85 * k, 0.03); g.add(fas);
  const stripes = canvasTex(256, 32, (c, w, h) => { for (let x = 0; x < w; x += 32) { c.fillStyle = "#24212A"; c.fillRect(x, 0, 16, h); c.fillStyle = "#EFE6DA"; c.fillRect(x + 16, 0, 16, h); } }, [2, 1]);
  const awn = new THREE.Mesh(new THREE.PlaneGeometry(5.8 * k, 1.25 * k), std("#ffffff", { map: stripes, side: THREE.DoubleSide })); awn.position.set(-1.25 * k, 3.0 * k, 0.62 * k); awn.rotation.x = -1.0; g.add(awn);
  const items = PRODUCTS.map((p, i) => { const gm = makeGarment(p.id); gm.scale.setScalar(0.32); gm.position.set((-3.2 + i * 1.25) * k, 2.0 * k, 0.12); g.add(gm); return gm; });
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.85, 0.25, 64), std("#141B33", { roughness: 0.35, metalness: 0.4 })); plinth.position.set(0, -0.13, -0.5); plinth.receiveShadow = true; g.add(plinth);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.82, 0.02, 8, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color("#5B8CFF").multiplyScalar(1.6) })); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0, -0.5); g.add(ring);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData.items = items; g.userData.height = Gd + Hup + 3 * k;
  return g;
}

export function buildCreate() {
  const scene = new THREE.Scene(); const R = rng(23);
  scene.add(skyDome("#0B1640", "#081028", "#05070F", 600));
  scene.fog = new THREE.FogExp2("#081028", 0.018);
  scene.add(new THREE.HemisphereLight("#7C9BFF", "#0A0F22", 0.75));
  const key = new THREE.SpotLight("#E8EEFF", 140, 40, 0.55, 0.6, 1.2); key.position.set(-4, 14, 10); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key, key.target);
  const warm = new THREE.PointLight("#FFC08A", 25, 14, 1.6); warm.position.set(3, 5, 6); scene.add(warm);
  const rim = new THREE.PointLight("#3D6EF0", 60, 20, 1.5); rim.position.set(-4, 4, -5); scene.add(rim);
  // sol : disque sombre, grille bleue
  const grid = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = "#0A1024"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(90,130,255,.35)"; g.lineWidth = 2; for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); } }, [12, 12]);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(80, 96), std("#ffffff", { map: grid, roughness: 0.3, metalness: 0.5, emissive: "#14204A", emissiveIntensity: 0.25 })); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.26; floor.receiveShadow = true; scene.add(floor);
  // faisceaux volumétriques
  const beamMat = () => new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { col: { value: new THREE.Color("#4F7BFF") }, op: { value: 0.22 } },
    vertexShader: "varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = uv.y; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }",
    fragmentShader: "uniform vec3 col; uniform float op; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(vN,vV)),1.6); gl_FragColor = vec4(col, op*f*pow(vY,1.5)); }" });
  const beams = [[-3, 0.25], [2.5, -0.2], [0, 0.05], [12, 0.2], [16, -0.2], [0, 0.1]].map(([x, rz], i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 3.2, 24, 40, 1, true), beamMat()); m.position.set(x, 9, -4 - i * 0.5 + (i === 5 ? -36 : 0)); m.rotation.z = rz; scene.add(m); return m; });
  // poussière lumineuse
  const n = 700, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = -8 + R() * 30; pos[i * 3 + 1] = R() * 12; pos[i * 3 + 2] = -46 + R() * 52; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: "#9DB8FF", size: 0.05, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(dust);

  // ---------------- scène 4 : la boutique prend vie
  const mini = makeMini(); mini.position.copy(L.dio); scene.add(mini);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), new THREE.MeshBasicMaterial({ map: tex("ui-a-logo-light.png"), transparent: true, depthWrite: false })); scene.add(logo);
  const logoGlow = glow("#FFB79C", 4, 0); scene.add(logoGlow);
  const sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 6, 5), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFD2BF").multiplyScalar(2) }), 80); scene.add(sparks);
  const sparkFrom = Array.from({ length: 80 }, () => v3((R() - 0.5) * 6, R() * 8, (R() - 0.5) * 4));
  const pal = [AUBE.encre, AUBE.aube, AUBE.lin, AUBE.sable, AUBE.brume].map((c, i) => { const m = new THREE.Mesh(rbox(0.36, 0.36, 0.08, 0.08), std(c, { roughness: 0.35, emissive: c, emissiveIntensity: 0.12 })); m.castShadow = true; scene.add(m); return m; });
  const home = makePhone(tex("ui-a-home-v1.png")); home.scale.setScalar(1.3); scene.add(home);
  const cards = PRODUCTS.map((p, i) => { const c = card(tex("ui-a-card-" + p.id + ".png"), 0.9, 1.3, { depth: 0.03, radius: 0.08 }); scene.add(c); return c; });
  const flyG = PRODUCTS.map((p) => { const gm = makeGarment(p.id); scene.add(gm); return gm; });
  const pages = { collection: makePhone(tex("ui-a-collection.png")), product: makePhone(tex("ui-a-product.png")), cart: makePhone(tex("ui-a-cart.png")) };
  Object.values(pages).forEach((p) => { p.scale.setScalar(1.05); scene.add(p); });
  const deskSite = makeLaptop(tex("ui-a-desk-v1.png"), { w: 2.0, h: 1.25 }); scene.add(deskSite);

  // ---------------- scène 5 : toute la communication s'anime
  const site = makePhone(tex("ui-a-home-v1.png")); site.scale.setScalar(1.3); site.position.copy(L.S); scene.add(site);
  // modification : la nouvelle collection (bas de page) remonte en tête ; deux tranches en relief
  const slabTop = card(tex("ui-a-home-v1.png"), 0.86 * 1.3, 0.9 * 1.3, { depth: 0.05, radius: 0.06 }); const slabBot = card(tex("ui-a-home-v1.png"), 0.86 * 1.3, 0.9 * 1.3, { depth: 0.05, radius: 0.06 });
  [slabTop, slabBot].forEach((c, i) => { const m = c.userData.fm.map.clone(); m.needsUpdate = true; m.repeat.set(1, 0.5); m.offset.set(0, i ? 0 : 0.5); c.userData.fm.map = m; c.visible = false; scene.add(c); });
  const postDefs = ["ui-a-post-1.png", "ui-a-post-2.png", "ui-a-post-3.png"];
  const posts = postDefs.map((t, i) => { const g = new THREE.Group(); const layers = [card(tex(t), 0.95, 0.95, { depth: 0.04, radius: 0.06 })]; layers.forEach((l) => g.add(l)); g.position.copy(L.posts[i]); scene.add(g); return g; });
  const postGlow = posts.map((p) => { const gl = glow("#FFB79C", 2.2, 0); scene.add(gl); return gl; });
  const adPhone = makePhone(tex("ui-a-ad-1.png")); adPhone.scale.setScalar(1.25); adPhone.position.copy(L.AD); scene.add(adPhone);
  const adTex = [tex("ui-a-ad-1.png"), tex("ui-a-ad-2.png"), tex("ui-a-ad-3.png")];
  const tagAd = card(tex("ui-tag-ad.png"), 2.4, 0.256, { depth: 0.02, radius: 0.12 }); scene.add(tagAd);
  const tagPost = card(tex("ui-tag-post.png"), 2.4, 0.256, { depth: 0.02, radius: 0.12 }); scene.add(tagPost);
  const cal = card(tex("ui-a-cal-empty.png"), 1.9, 2.87, { depth: 0.04, radius: 0.1 }); cal.position.copy(L.CAL); scene.add(cal);
  const calTex = { empty: tex("ui-a-cal-empty.png"), full: tex("ui-a-cal.png") };
  const days = [3, 6, 10, 13, 17, 20, 24, 27];
  const minis = days.map((d, i) => { const m = card(tex(["ui-a-post-1.png", "ui-a-post-2.png", "ui-a-post-3.png"][i % 3]), 0.2, 0.2, { depth: 0.01, radius: 0.02 }); scene.add(m); return { m, d, i }; });
  const syna = card(tex("ui-m-syna-a.png"), 0.86, 1.8, { depth: 0.025, radius: 0.07, side: "#1B1D21" }); syna.scale.setScalar(1.2); scene.add(syna);
  const synaTex = { a: tex("ui-m-syna-a.png"), b: tex("ui-m-syna-b.png"), c: tex("ui-m-syna-c.png") };
  const sweep = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.25), new THREE.MeshBasicMaterial({ color: "#9CC3FF", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); scene.add(sweep);
  const homeV2 = tex("ui-a-home-v2.png"), homeV1 = tex("ui-a-home-v1.png");

  // ---------------- scène 7 : tout entre dans le vrai studio
  const studio = makeLaptop(tex("ui-d-boutique-v2.png"), { w: 1.6, h: 1.0 }); studio.position.copy(L.END).add(v3(0, 1.2, 0.0)); studio.userData.lid.rotation.x = -0.12; scene.add(studio);
  const studioGlow = glow("#5B8CFF", 7, 0); studioGlow.position.copy(L.END).add(v3(0, 1.8, -0.4)); scene.add(studioGlow);
  const E = makeLogoE(); E.root.scale.setScalar(0.62); scene.add(E.root);
  const endItems = [mini, home, deskSite, ...Object.values(pages)].map((o) => ({ o, from: new THREE.Vector3() }));
  const conv = [makeGarment("sweat"), makeGarment("robe"), makePhone(tex("ui-a-ad-2.png")), card(tex("ui-a-post-1.png"), 0.95, 0.95, { depth: 0.04 }), card(tex("ui-a-post-3.png"), 0.95, 0.95, { depth: 0.04 }), makePhone(tex("ui-a-home-v2.png"))];
  const convFrom = conv.map((o, i) => { scene.add(o); return v3(-1.3 + (i % 3) * 1.3, 1.6 + Math.floor(i / 3) * 2.4, L.END.z + 4.5 + (i % 2)); });

  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Sv = new THREE.Vector3();
  const show = (o, p) => { o.visible = p > 0.002; o.scale.setScalar(Math.max(0.001, p)); };

  function update(t) {
    dust.rotation.y = t * 0.01;
    beams.forEach((b, i) => { b.material.uniforms.op.value = 0.2 + 0.06 * Math.sin(t * 0.8 + i); });
    // --- identité : étincelles qui convergent, logo, palette
    const lg = ease.out(seg(t, 24.4, 25.6)); const lgUp = ease.inOut(seg(t, 27.4, 28.2));
    logo.visible = t > 24.5 && t < 36.4; logo.material.opacity = lg; logo.position.set(L.logo.x, lerp(L.logo.y, 7.25, lgUp), L.logo.z); logo.scale.setScalar(lerp(1, 0.62, lgUp));
    logoGlow.position.copy(logo.position).add(v3(0, 0, -0.2)); logoGlow.material.opacity = 0.7 * lg * (1 - seg(t, 27.4, 28)); logoGlow.scale.setScalar(4 + lg * 2);
    sparks.visible = t > 24.0 && t < 25.8;
    sparkFrom.forEach((f, i) => { const p = ease.inOut(seg(t, 24.0 + (i % 10) * 0.03, 25.4 + (i % 10) * 0.03)); tmp.copy(f).lerp(tmp2.set(L.logo.x + ((i * 37) % 26) / 10 - 1.3, L.logo.y + ((i * 13) % 15) / 10 - 0.75, L.logo.z), p); sparks.setMatrixAt(i, M.compose(tmp, Q, Sv.setScalar(1 - p * 0.8))); });
    sparks.instanceMatrix.needsUpdate = true;
    pal.forEach((m, i) => { const a = 25.0 + i * 0.1; const p = ease.back(seg(t, a, a + 0.5)); const orbit = (1 - ease.inOut(seg(t, 25.6, 26.3))) * 1.6; const th = t * 2 + i * 1.256;
      m.visible = t > a && t < 28.0; m.scale.setScalar(Math.max(0.001, p * (1 - ease.in(seg(t, 27.5, 27.95)))));
      m.position.set((i - 2) * 0.46 + Math.cos(th) * orbit, L.logo.y - 1.15 + Math.sin(th) * orbit * 0.3, L.logo.z + 0.2 + Math.sin(th) * orbit * 0.4); m.rotation.y = orbit * 2; });
    // --- la page d'accueil sort de la vitrine
    const hp = ease.inOut(seg(t, 26.2, 27.6));
    home.visible = t > 26.2 && t < 36.4; bez(v3(-0.3, 0.6, 0.3), v3(0, 2.6, 2.5), L.home, hp, home.position); home.rotation.set(0, (1 - hp) * 2.2, 0); home.scale.setScalar(1.3 * Math.max(0.05, hp));
    // --- les vêtements quittent la vitrine et rejoignent leur fiche produit
    flyG.forEach((g, i) => { const a = 27.6 + i * 0.2; const p = ease.inOut(seg(t, a, a + 0.9)); const into = ease.in(seg(t, a + 0.85, a + 1.15));
      g.visible = t > a && into < 1; tmp.copy(mini.userData.items[i].getWorldPosition(tmp2)); bez(tmp, v3(tmp.x * 2, 4.8, 2.4), L.cards[i], p, g.position); g.rotation.y = p * Math.PI * 2; g.scale.setScalar(lerp(0.32, 0.95, Math.sin(p * Math.PI * 0.5)) * (1 - into)); });
    mini.userData.items.forEach((g, i) => (g.visible = t < 27.6 + i * 0.2 || t > 36.4));
    cards.forEach((c, i) => { const a = 28.35 + i * 0.2; const p = ease.back(seg(t, a, a + 0.4)); const back = ease.inOut(seg(t, 29.3, 30.0)); show(c, p * (1 - ease.in(seg(t, 35.6, 36.0))));
      c.position.copy(L.cards[i]).lerp(tmp.set(L.cards[i].x * 1.35, L.cards[i].y + 0.4, -2.6 - i * 0.2), back); c.rotation.y = -L.cards[i].x * 0.25 * back; });
    // --- les autres pages (collection, fiche, panier) et la version ordinateur
    Object.entries(pages).forEach(([k, p], i) => { const a = 29.3 + i * 0.3; const q = ease.out(seg(t, a, a + 0.7)); p.visible = t > a && t < 36.4; p.position.copy(L.home).lerp(L.pages[k], q); p.scale.setScalar(1.05 * Math.max(0.05, q)); p.rotation.y = -L.pages[k].x * 0.18 * q; });
    const dp = ease.out(seg(t, 30.2, 31.0)); deskSite.visible = t > 30.2 && t < 36.4; deskSite.position.copy(L.laptopSite); deskSite.position.y -= (1 - dp) * 1.5; deskSite.scale.setScalar(Math.max(0.05, dp)); deskSite.rotation.y = 0;
    mini.position.y = L.dio.y - ease.inOut(seg(t, 30.0, 30.8)) * 0.0;
    // --- scène 5 : publications qui se construisent une par une autour du site
    posts.forEach((p, i) => { const a = 36.3 + i * 0.4; const q = ease.back(seg(t, a, a + 0.5)); show(p, q); p.rotation.set(0, (1 - q) * 1.5 + (i - 1) * -0.18, 0); });
    const hl = ease.inOut(seg(t, 42.6, 43.2)) * (1 - seg(t, 45.0, 45.6));
    postGlow.forEach((gl, i) => { gl.position.copy(L.posts[i]).add(v3(0, 0, -0.1)); gl.material.opacity = (i !== 1 ? 0.75 : 0) * hl; });
    // publicité animée sur le téléphone
    const ai = clamp(Math.floor((t - 37.9) / 0.45), 0, 2) + (t > 39.2 ? Math.floor((t - 39.2) / 0.6) : 0); adPhone.userData.sm.map = adTex[((ai % 3) + 3) % 3];
    show(adPhone, 1.25 * ease.back(seg(t, 37.7, 38.2))); adPhone.rotation.y = Math.sin(t * 0.9) * 0.12 - 0.1;
    show(tagAd, 0.8 * ease.back(seg(t, 38.2, 38.5))); tagAd.position.set(L.AD.x, L.AD.y - 1.45, L.AD.z + 0.2);
    show(tagPost, ease.back(seg(t, 37.3, 37.6)) * (1 - seg(t, 37.9, 38.1))); tagPost.position.set(L.S.x, L.S.y - 1.75, L.S.z + 0.8);
    // calendrier éditorial
    show(cal, ease.back(seg(t, 38.9, 39.3))); setCardMap(cal, t > 39.75 ? calTex.full : calTex.empty);
    minis.forEach(({ m, d, i }) => { const cell = d + 5; const col = cell % 7, row = Math.floor(cell / 7); const xc = 26 + (col + 0.5) * 115.4, yc = 236 + (row + 0.5) * 166 - 12;
      tmp.set(L.CAL.x + (xc / 860 - 0.5) * 1.9, L.CAL.y + (0.5 - yc / 1300) * 2.87, L.CAL.z + 0.06); const a = 39.1 + i * 0.07; const p = ease.in(seg(t, a, a + 0.35));
      m.visible = t > a && t < 39.75; m.position.set(tmp.x, tmp.y + (1 - p) * 1.6, tmp.z + (1 - p) * 0.6); });
    // SYNA : la demande, l'attente, la réponse
    const sp = ease.back(seg(t, 40.0, 40.4)); show(syna, 1.2 * sp); syna.position.copy(L.SY); syna.rotation.y = 0;
    setCardMap(syna, t >= 44.0 ? synaTex.c : t >= 40.75 ? synaTex.b : synaTex.a);
    // modification de la page d'accueil (v1 → v2) : la collection remonte en tête, présentation plus épurée
    const m1 = ease.inOut(seg(t, 41.6, 41.95)), m2 = ease.inOut(seg(t, 41.95, 42.6)), m3 = ease.inOut(seg(t, 42.6, 42.95));
    const modOn = t > 41.6 && t < 43.0;
    slabTop.visible = slabBot.visible = modOn; site.userData.sm.map = t >= 42.9 ? homeV2 : homeV1;
    const sw = 0.86 * 1.3, sh2 = 0.9 * 1.3;
    slabTop.position.set(L.S.x, lerp(L.S.y + sh2 / 2, L.S.y - sh2 / 2, m2), L.S.z + 0.08 + 0.35 * m1 * (1 - m3));
    slabBot.position.set(L.S.x, lerp(L.S.y - sh2 / 2, L.S.y + sh2 / 2, m2), L.S.z + 0.08 + 0.75 * m1 * (1 - m3));
    site.userData.screen.visible = !modOn;
    sweep.visible = t > 42.85 && t < 43.4; sweep.position.set(L.S.x, L.S.y + 1.2 - seg(t, 42.85, 43.4) * 2.4, L.S.z + 0.12); sweep.material.opacity = 0.6 * Math.sin(seg(t, 42.85, 43.4) * Math.PI);
    // --- scène 7 : convergence vers le vrai studio
    const cv = ease.inOut(seg(t, 53.6, 55.2));
    conv.forEach((o, i) => { const a = 53.6 + i * 0.12; const p = ease.in(seg(t, a, a + 1.2)); o.visible = t > 53.4 && p < 0.99; bez(convFrom[i], v3(convFrom[i].x * 0.5, 4.5, L.END.z + 3), tmp.copy(L.END).add(v3(0, 1.85, 0.1)), p, o.position); o.scale.setScalar(Math.max(0.001, (1 - p) * (o.isGroup && o.userData.screen ? 0.9 : 1))); o.rotation.y = p * 3; });
    studioGlow.material.opacity = 0.6 * Math.max(0, 1 - Math.abs(t - 55.0) / 0.8) + 0.25 * seg(t, 55, 56);
    const ep = ease.outExpo(seg(t, 55.0, 56.4));
    E.root.visible = t > 54.9; E.root.position.set(L.END.x, L.END.y + lerp(1.8, 3.72, ep), L.END.z + lerp(-2, 0.2, ep)); E.root.rotation.set(0, lerp(-2.4, 0, ep) + Math.sin(t * 0.7) * 0.06, 0);
    E.root.scale.setScalar(0.5 * Math.max(0.05, ep));
    studio.visible = t > 53.0;
  }
  return { scene, update, mini, home, site, syna, adPhone, cal, studio, E };
}
