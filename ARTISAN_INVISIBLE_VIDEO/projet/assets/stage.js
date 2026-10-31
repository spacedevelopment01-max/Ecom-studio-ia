/* Plateau blanc d'E-COM STUDIO ia, composé pour le format vertical (9:16) : la fenêtre du studio en version mobile
   réelle au centre ; le logo se construit et habille le camion, l'identité habille l'artisan, le site mobile se monte
   étage par étage comme une maison, les photos deviennent publications et publicité, le calendrier se remplit
   (« À valider »), le SEO s'assemble, puis Syna applique la modification demandée (section désignée placée sous
   l'ouverture, nouvelle version restaurable). Chaque objet est cadré en entier. */
import * as THREE from "three";
import { std, basic, rbox, rng, canvasTex, card, setCardMap, tex, seg, ease, lerp, clamp, bez, glow, v3 } from "./lib.js";
import { makeArtisan, makeVan, makeBadge3M, BRAND, STUDIO } from "./actors.js";

export const HUB = { x: 0, y: 4.3, z: -8, w: 3.44, h: 7.2 };
export const TOWER = { x: 6, z: -7, w: 2.8 };
const U = TOWER.w / 430; // unités par pixel CSS du site mobile
export const SECS = [["foot", 150], ["devis", 660], ["real", 600], ["reno", 640], ["presta", 560], ["hero", 680], ["head", 64]];
export const VAN_POS = v3(-6.5, 0, 0);
export const ART_POS = v3(3.6, 0, 0.8);
export const BOARD = { x: 1.15, y: 3.1, z: -1.2, w: 3.0, h: 5.0 };
export const POSTS = { y: 4.2, z: 2.6 };
export const CAL = { x: 0, y: 2.9, z: 2.4, w: 3.2, h: 4.84, rx: -0.45 };

export function buildStage({ glyphs }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#E9EEF8"); scene.fog = new THREE.Fog("#E9EEF8", 55, 140);
  scene.add(new THREE.HemisphereLight("#FFFFFF", "#C9D3E8", 0.95));
  const key = new THREE.DirectionalLight("#FFFFFF", 1.8); key.position.set(-8, 22, 12); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -18, right: 18, top: 26, bottom: -12, near: 1, far: 70 }); key.shadow.bias = -0.0003; key.shadow.radius = 6; scene.add(key);
  const rim = new THREE.DirectionalLight("#8FB0FF", 1.2); rim.position.set(10, 6, -12); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(70, 96), std("#F7F9FD", { roughness: 0.6 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  [9, 14, 20].forEach((r, i) => { const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.03, r + 0.03, 160), basic(STUDIO.signal, { transparent: true, opacity: 0.18 - i * 0.04 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; scene.add(ring); });

  // fenêtre du studio (version mobile réelle)
  const T = (n) => tex(n);
  const hub = card(T("ui-m-entree-sent.png"), HUB.w, HUB.h, { depth: 0.1, radius: 0.28, side: "#1B1D21" }); hub.position.set(HUB.x, HUB.y, HUB.z); scene.add(hub);
  const hubGlow = glow("#8FB4FF", 11, 0.12); hubGlow.position.set(HUB.x, HUB.y, HUB.z - 0.5); scene.add(hubGlow);

  // camion et artisan
  const van = makeVan(); van.root.position.copy(VAN_POS); scene.add(van.root);
  const art = makeArtisan(); art.root.position.copy(ART_POS); art.root.rotation.y = -0.45; scene.add(art.root);
  art.pose({});

  // logo 3M qui se construit
  const logo = makeBadge3M(glyphs); scene.add(logo.root);
  const R = rng(5);
  const letterFrom = logo.parts.map(() => v3((R() - 0.5) * 4, 1.5 + R() * 4, 1 + R() * 3));
  const logoPos = v3(0, 3.1, 2.4);
  const vanSide = v3(VAN_POS.x - 1.6, 1.62, VAN_POS.z + 0.95);

  // planche d'identité (portrait) + nuancier qui vole vers la tenue
  const board = card(T("ui-idboard-v.png"), BOARD.w, BOARD.h, { depth: 0.06, radius: 0.12 }); board.position.set(BOARD.x, BOARD.y, BOARD.z); scene.add(board);
  const swatches = ["#1F2A2E", "#1E6B5E", "#E3A53C", "#F3EEE6", "#D8CDBB"].map((c, i) => {
    const m = new THREE.Mesh(rbox(0.3, 0.3, 0.1, 0.06), std(c, { roughness: 0.4 })); m.castShadow = true; scene.add(m);
    const cx = 40 + 82 + i * 172; m.userData.from = v3(BOARD.x + (cx / 900 - 0.5) * BOARD.w, BOARD.y + (0.5 - 575 / 1500) * BOARD.h, BOARD.z + 0.12); return m;
  });

  // le site mobile, étage par étage
  const tower = new THREE.Group(); tower.position.set(TOWER.x, 0, TOWER.z); scene.add(tower);
  const slabs = {}; let y = 0.12;
  SECS.forEach(([k, h], i) => {
    const hh = h * U; const c = card(T("ui-m-sec-" + k + ".png"), TOWER.w, hh, { depth: 0.36, radius: Math.min(0.08, hh / 3), side: "#F4F6FA" });
    c.userData.base = y + hh / 2; c.userData.h = hh; c.position.set(0, y + hh / 2, 0); tower.add(c); slabs[k] = c; y += hh + 0.04;
  });
  const towerH = y;
  const renoTex = { plain: T("ui-m-sec-reno.png"), hl: T("ui-m-sec-reno-hl.png") };
  const scafM = std("#B9C3D3", { metalness: 0.6, roughness: 0.35 });
  const scaf = new THREE.Group(); tower.add(scaf);
  [[-1.55, 0.3], [1.55, 0.3], [-1.55, -0.65], [1.55, -0.65]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 8), scafM); p.position.set(x, 0, z); p.userData.pole = true; scaf.add(p); });
  for (let k = 1; k < 12; k++) [0.3, -0.65].forEach((z) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 3.1, 6), scafM); b.rotation.z = Math.PI / 2; b.position.set(0, k * 1.9, z); scaf.add(b); });

  function slabY(order) { const out = {}; let yy = 0.12; order.forEach((k) => { const h = slabs[k].userData.h; out[k] = yy + h / 2; yy += h + 0.04; }); return out; }
  const order1 = SECS.map(([k]) => k);
  const Y1 = slabY(order1); const Y2 = slabY(["foot", "devis", "real", "presta", "reno", "hero", "head"]);

  // photos → publications et publicité (empilées pour le vertical)
  const outs = { "post-1": { x: -0.78, y: POSTS.y - 1.7, w: 1.4, h: 1.4 }, "ad-story": { x: 0, y: POSTS.y + 0.65, w: 1.7, h: 3.02 }, "post-2": { x: 0.78, y: POSTS.y - 1.7, w: 1.4, h: 1.4 } };
  const realY = Y1.real;
  const photos = [["avant", "post-1"], ["apres", "ad-story"], ["peinture", "post-2"]].map(([ph, out], i) => {
    const o0 = outs[out];
    const c = card(T("photo-" + ph + ".jpg"), 1.2, 0.9, { depth: 0.03, radius: 0.05 }); scene.add(c);
    const o = card(T("ui-" + out + ".png"), o0.w, o0.h, { depth: 0.05, radius: 0.1 }); scene.add(o);
    return { c, o, i, isAd: out === "ad-story", from: v3(TOWER.x + (i - 1) * 0.7, realY, TOWER.z + 0.3), to: v3(o0.x, o0.y, POSTS.z) };
  });
  const tagPost = card(T("ui-tag-post.png"), 2.8, 0.32, { depth: 0.03, radius: 0.15 }); scene.add(tagPost);
  const tagAd = card(T("ui-tag-ad.png"), 2.8, 0.32, { depth: 0.03, radius: 0.15 }); scene.add(tagAd);
  // calendrier (portrait)
  const cal = card(T("ui-cal-v-empty.png"), CAL.w, CAL.h, { depth: 0.06, radius: 0.14 }); cal.position.set(CAL.x, CAL.y, CAL.z); scene.add(cal);
  const calDays = [3, 6, 10, 13, 17, 20, 24, 27];
  const minis = calDays.map((d, i) => { const m = card(T(i % 3 === 1 ? "ui-post-2.png" : "ui-post-1.png"), 0.36, 0.36, { depth: 0.015, radius: 0.04 }); scene.add(m); return { m, d, i }; });
  // SEO : titre, description, questions contre l'ouverture du site
  const seo = ["seo-title", "seo-desc", "seo-faq"].map((n) => { const c = card(T("ui-" + n + ".png"), 2.56, 0.48, { depth: 0.05, radius: 0.12 }); scene.add(c); return c; });
  const lens = new THREE.Group(); { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 14, 48), std(STUDIO.signal, { emissive: STUDIO.signal2, emissiveIntensity: 0.6, roughness: 0.3 })); lens.add(ring); const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.6, 12), std(STUDIO.ink)); hd.position.set(0.46, -0.46, 0); hd.rotation.z = 0.78; lens.add(hd); const gl = new THREE.Mesh(new THREE.CircleGeometry(0.45, 32), new THREE.MeshBasicMaterial({ color: "#CFE0FF", transparent: true, opacity: 0.25 })); lens.add(gl); } scene.add(lens);
  // pastille « v2 » du sélecteur de versions
  const verTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = "#2F5BEA"; g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, 40); g.fill(); g.fillStyle = "#fff"; g.font = "700 64px Inter"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("v2", w / 2, h / 2 + 3); });
  const ver = new THREE.Sprite(new THREE.SpriteMaterial({ map: verTex, transparent: true })); scene.add(ver);
  const sparkG = glow("#7CA4FF", 3, 0); scene.add(sparkG);

  const hubTex = { sent: T("ui-m-entree-sent.png"), a: T("ui-m-syna-a.png"), b: T("ui-m-syna-b.png"), c: T("ui-m-syna-c.png") };
  const calTex = { empty: T("ui-cal-v-empty.png"), full: T("ui-cal-v.png") };
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

  function update(t) {
    // fenêtre du studio
    let hm = hubTex.sent; if (t >= 38.55) hm = hubTex.a; if (t >= 39.3) hm = hubTex.b; if (t >= 41.45) hm = hubTex.c;
    setCardMap(hub, hm);
    hubGlow.material.opacity = 0.1 + 0.2 * Math.max(0, 1 - Math.abs(t - 41.5) / 0.5);
    // logo : plaque, lettres, trait d'enduit, puis vol jusqu'au camion
    const lp = ease.outExpo(seg(t, 22.3, 23.1));
    const fly = ease.inOut(seg(t, 24.35, 25.2));
    logo.root.visible = t > 22.25 && fly < 1;
    logo.plate.scale.set(Math.max(0.001, lp), Math.max(0.001, lp), Math.max(0.001, ease.out(seg(t, 22.5, 23.2))));
    logo.parts.forEach((m, i) => { const p = ease.back(seg(t, 22.7 + i * 0.12, 23.35 + i * 0.12)); m.position.copy(tmp.copy(letterFrom[i]).multiplyScalar(1 - p)); m.scale.setScalar(Math.max(0.001, p)); m.rotation.y = (1 - p) * 3; });
    logo.swoosh(ease.inOut(seg(t, 23.3, 23.9)));
    const spin = Math.sin((t - 22.3) * 1.6) * 0.18 * (1 - fly);
    bez(logoPos, tmp2.set((logoPos.x + vanSide.x) / 2, 5.0, 0.2), vanSide, fly, logo.root.position);
    logo.root.scale.setScalar(lerp(1, 0.4, fly)); logo.root.rotation.set(0, spin, 0);
    van.livery(ease.inOut(seg(t, 25.1, 25.9)));
    // identité : planche, nuancier, tenue
    const bp = ease.back(seg(t, 25.75, 26.35)), bout = ease.in(seg(t, 28.2, 28.6));
    board.visible = bp > 0.001 && bout < 1; board.scale.set(Math.max(0.001, bp * (1 - bout)), Math.max(0.001, bp * (1 - bout)), 1); board.rotation.x = (1 - bp) * -1.2;
    swatches.forEach((m, i) => {
      const a = 26.45 + i * 0.13; const p = ease.inOut(seg(t, a, a + 0.55));
      const target = tmp.set(ART_POS.x, 1.3 + (i - 2) * 0.1, ART_POS.z + 0.3);
      m.visible = t > a && p < 1;
      bez(m.userData.from, tmp2.set((m.userData.from.x + target.x) / 2, 4.8, 0.6), target, p, m.position); m.rotation.set(p * 6, p * 4, 0); m.scale.setScalar(lerp(1, 0.4, p));
    });
    art.brand(ease.inOut(seg(t, 26.8, 27.75)));
    const happy = seg(t, 27.4, 27.6);
    art.pose({ lookY: lerp(-0.6, 0.2, ease.inOut(seg(t, 26.2, 27.0))), lookX: -0.05, armL: [lerp(0, -0.3, happy), lerp(0.1, 0.5, happy), lerp(-0.2, -0.6, happy)], armR: [lerp(0, -2.3, happy * (1 - seg(t, 28.0, 28.4))), 0.3, lerp(-0.2, -1.2, happy)], browUp: happy, blink: Math.max(0, 1 - Math.abs(t - 28.9) / 0.08) });
    // site : étages qui tombent puis s'emboîtent ; modification : la section désignée passe sous l'ouverture
    SECS.forEach(([k], i) => {
      const s = slabs[k]; const a = 28.55 + i * 0.4; const p = ease.out(seg(t, a, a + 0.42)); const bounce = Math.sin(seg(t, a + 0.42, a + 0.7) * Math.PI) * 0.1;
      s.visible = t > a - 0.05;
      let yy = s.userData.base + (1 - p) * 7 - bounce, zz = 0;
      const m1 = ease.inOut(seg(t, 40.0, 40.35)), m2 = ease.inOut(seg(t, 40.35, 40.9)), m3 = ease.inOut(seg(t, 40.9, 41.25));
      if (t > 40.0) { if (k === "reno") { zz = 1.6 * m1 * (1 - m3); yy = lerp(Y1.reno, Y2.reno, m2); } else yy = lerp(Y1[k], Y2[k], m2); }
      s.position.set(0, yy, zz); s.rotation.z = (1 - p) * (i % 2 ? 0.15 : -0.15);
    });
    setCardMap(slabs.reno, t > 38.5 && t < 43.1 ? renoTex.hl : renoTex.plain);
    const scafP = seg(t, 28.4, 31.4) * (1 - seg(t, 31.6, 32.1));
    scaf.visible = scafP > 0.001;
    scaf.children.forEach((c) => { if (c.userData.pole) { c.scale.y = Math.max(0.001, towerH * Math.min(1, scafP * 1.1)); c.position.y = (towerH * Math.min(1, scafP * 1.1)) / 2; } else { c.visible = c.position.y < towerH * scafP; } });
    // photos → publications et publicité
    photos.forEach((ph) => {
      const a = 32.3 + ph.i * 0.22; const p = ease.inOut(seg(t, a, a + 0.75)); const flip = ease.inOut(seg(t, a + 0.8, a + 1.2));
      const out = ease.in(seg(t, 35.2, 35.55));
      const pos = bez(ph.from, tmp2.set((ph.from.x + ph.to.x) / 2, 9, 2), ph.to, p, tmp);
      ph.c.visible = t > a && flip < 0.5; ph.o.visible = flip >= 0.5 && out < 1;
      ph.c.position.copy(pos); ph.o.position.copy(pos);
      const ry = flip * Math.PI; ph.c.rotation.set(0, ry, 0); ph.o.rotation.set(0, ry - Math.PI, 0);
      ph.c.scale.setScalar(lerp(1, ph.isAd ? 1.42 : 1.17, p)); ph.o.scale.setScalar(Math.max(0.001, 1 - out));
      ph.o.position.y += Math.sin(t * 1.4 + ph.i) * 0.04;
    });
    const tg = ease.back(seg(t, 33.75, 34.1)) * (1 - ease.in(seg(t, 35.2, 35.5)));
    tagPost.visible = tg > 0.01; tagPost.scale.setScalar(Math.max(0.001, tg * 0.8)); tagPost.position.set(0, POSTS.y - 2.85, POSTS.z + 0.05);
    const tg2 = ease.back(seg(t, 34.7, 35.0)) * (1 - ease.in(seg(t, 35.2, 35.5)));
    tagAd.visible = tg2 > 0.01; tagAd.scale.setScalar(Math.max(0.001, tg2 * 0.8)); tagAd.position.set(0, POSTS.y + 2.45, POSTS.z + 0.05);
    // calendrier : se pose, les publications tombent dans les jours
    const cp = ease.back(seg(t, 35.35, 35.9)) * (1 - ease.in(seg(t, 37.25, 37.6)));
    cal.visible = cp > 0.01; cal.scale.setScalar(Math.max(0.001, cp)); cal.rotation.x = CAL.rx;
    setCardMap(cal, t > 36.95 ? calTex.full : calTex.empty);
    minis.forEach(({ m, d, i }) => {
      const cell = d + 5; const col = cell % 7, row = Math.floor(cell / 7);
      const xc = 26 + (col + 0.5) * 115.4, yc = 236 + (row + 0.5) * 166 - 12;
      tmp.set((xc / 860 - 0.5) * CAL.w, (0.5 - yc / 1300) * CAL.h, 0.1).applyEuler(cal.rotation).add(cal.position);
      const a = 35.8 + i * 0.12; const p = ease.in(seg(t, a, a + 0.42));
      m.visible = t > a && t < 36.95; m.position.set(tmp.x, tmp.y + (1 - p) * 3, tmp.z); m.rotation.set(CAL.rx * p, (1 - p) * 2, 0);
    });
    // SEO
    const heroY = Y1.hero;
    seo.forEach((c, i) => {
      const a = 37.3 + i * 0.18; const p = ease.out(seg(t, a, a + 0.55)); const out = ease.in(seg(t, 38.4, 38.65));
      c.visible = t > a && out < 1; const to = tmp.set(TOWER.x, heroY + 0.7 - i * 0.66, TOWER.z + 0.9);
      bez(tmp2.set(HUB.x, HUB.y + 2, HUB.z + 1), v3(TOWER.x - 4, heroY + 3, TOWER.z + 4), to, p, c.position); c.scale.setScalar(Math.max(0.001, 1 - out)); c.rotation.y = (1 - p) * 1.5;
    });
    const lpp = seg(t, 37.35, 38.55); lens.visible = lpp > 0 && lpp < 1; lens.position.set(TOWER.x - 1.5 + lpp * 3.0, heroY - 1.3 + Math.sin(lpp * Math.PI) * 0.2, TOWER.z + 1.5); lens.scale.setScalar(Math.sin(lpp * Math.PI) * 0.55 + 0.001);
    // pastille de version
    const vp = ease.back(seg(t, 41.2, 41.55)) * (1 - seg(t, 42.6, 42.9));
    ver.visible = vp > 0.01; ver.scale.set(1.1 * vp, 0.55 * vp, 1); ver.position.set(TOWER.x + 1.05, Y2.reno + Y2.reno * 0 + 2.4, TOWER.z + 0.6);
    sparkG.material.opacity = 0.9 * Math.max(0, 1 - Math.abs(t - 41.15) / 0.35); sparkG.position.set(TOWER.x, Y2.reno, TOWER.z + 0.7); sparkG.scale.setScalar(6);
  }
  return { scene, update, hub, van, art, logo, tower, slabs, towerH, Y1, Y2 };
}
