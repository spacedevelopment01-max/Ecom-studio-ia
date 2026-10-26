// Film « Votre entreprise prend une autre dimension » — ATELIER BLEU, peinture intérieure et rénovation.
// Rendu image par image : window.renderAt(t) dessine l'instant t (s) ; tout est fonction du temps (aucun hasard au rendu).
// Tous les instants viennent de montage/timeline.json (durées réelles de la voix off) : changer la voix recale le film.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import * as L from "./lib.js";
import { ramp, mix, eio, eout, eout5, ein, eback, fenetre, clamp01, COUL } from "./lib.js";
import { construireSequences } from "./sequences.js";

const W = 1080, H = 1920;
const params = new URLSearchParams(location.search);
const MODE = params.get("mode") || "film";

const TL = await (await fetch("../montage/timeline.json")).json();
const ZONES = await (await fetch("../ui/png/zones.json")).json();

// ---------- moteur ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.insertBefore(renderer.domElement, document.body.firstChild);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x02081c, 0.0028);
const camera = new THREE.PerspectiveCamera(35, W / H, 0.05, 3000);

// Reflets : environnement de studio (bandeaux lumineux blancs et bleus) pour les métaux, la laque et la peinture.
function environnement() {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ color: 0x050c26, side: THREE.BackSide })));
  const bande = (w, h, c, k, pos, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), side: THREE.DoubleSide })); m.position.set(...pos); m.rotation.set(...rot); s.add(m); };
  bande(40, 4, 0xffffff, 7, [0, 24, -10], [Math.PI / 2.4, 0, 0]);
  bande(40, 2.5, 0xffffff, 5, [0, 18, 16], [-Math.PI / 2.6, 0, 0]);
  bande(4, 30, 0xffffff, 4, [-24, 6, 4], [0, Math.PI / 2, 0]);
  bande(3, 30, 0x5b86ff, 4, [24, 8, -6], [0, -Math.PI / 2, 0]);
  bande(60, 8, 0x1b3fd0, 1.2, [0, -16, 0], [Math.PI / 2, 0, 0]);
  bande(14, 10, 0xffffff, 3, [14, 10, 32], [0, Math.PI, 0]);
  const pm = new THREE.PMREMGenerator(renderer);
  return pm.fromScene(s, 0.02).texture;
}
scene.environment = environnement();
scene.environmentIntensity = 0.8;

// Univers bleu : dégradé profond, halo d'horizon, nébuleuse légère.
const ciel = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { uT: { value: 0 } },
  vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
  fragmentShader: `varying vec3 vD; uniform float uT;
    float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
    float n(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
      return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
    void main(){
      float y = vD.y;
      vec3 haut = vec3(0.003,0.008,0.035), milieu = vec3(0.012,0.04,0.2), bas = vec3(0.002,0.006,0.03);
      vec3 c = mix(milieu, haut, smoothstep(0.0, 0.7, y));
      c = mix(c, bas, smoothstep(0.0, -0.6, y));
      float halo = exp(-abs(y+0.05)*7.0);
      c += vec3(0.04,0.14,0.7) * halo * 0.5;
      float neb = n(vD*3.0 + uT*0.01)*0.6 + n(vD*7.0)*0.4;
      c += vec3(0.03,0.09,0.4) * smoothstep(0.55, 0.95, neb) * 0.5;
      gl_FragColor = vec4(c, 1.0);
    }`,
}));
scene.add(ciel);

// Poussière lumineuse autour de la caméra (profondeur et vitesse).
const N_POUSS = 1400;
const poussiere = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xa9c4ff, size: 0.09, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }));
{
  const r = L.alea(42), pos = new Float32Array(N_POUSS * 3);
  for (let i = 0; i < N_POUSS * 3; i++) pos[i] = r();
  poussiere.userData.base = pos.slice();
  poussiere.geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  poussiere.frustumCulled = false;
}
scene.add(poussiere);
function majPoussiere(densite) {
  const b = poussiere.userData.base, a = poussiere.geometry.attributes.position.array, T = 60, c = camera.position;
  for (let i = 0; i < N_POUSS; i++) for (let k = 0; k < 3; k++) {
    const cc = [c.x, c.y, c.z][k];
    a[i * 3 + k] = cc + ((((b[i * 3 + k] * T - cc) % T) + T) % T) - T / 2;
  }
  poussiere.geometry.attributes.position.needsUpdate = true;
  poussiere.material.opacity = 0.75 * densite;
}

// Lumières
const hemi = new THREE.HemisphereLight(0xc8d6ff, 0x050a1e, 0.35);
scene.add(hemi);
const soleil = new THREE.DirectionalLight(0xfff6ee, 4.2);
soleil.castShadow = true;
soleil.shadow.mapSize.set(2048, 2048);
soleil.shadow.bias = -0.0004; soleil.shadow.normalBias = 0.02;
scene.add(soleil, soleil.target);
function ombres(centre, taille, dir = [0.55, 1, 0.65], intensite = 3.2) {
  soleil.target.position.copy(centre);
  soleil.position.copy(centre).add(new THREE.Vector3(...dir).normalize().multiplyScalar(taille * 2));
  const c = soleil.shadow.camera; c.left = c.bottom = -taille; c.right = c.top = taille; c.near = 0.5; c.far = taille * 5; c.updateProjectionMatrix();
  soleil.intensity = intensite;
}
const contre = new THREE.PointLight(0x3c6bff, 300, 120, 1.6); // contre-jour bleu électrique
scene.add(contre);

// Post-traitement : halo lumineux, puis grain et vignettage
const composer = new EffectComposer(renderer);
composer.setPixelRatio(1); composer.setSize(W, H);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.35, 0.45, 1.05);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const finition = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uGrain: { value: 0 }, uVig: { value: 0.32 }, uAb: { value: 0.0012 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uGrain, uVig, uAb; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uGrain)*43758.5453); }
    void main(){
      vec2 d = vUv - 0.5;
      vec3 c;
      c.r = texture2D(tDiffuse, vUv + d*uAb).r; c.g = texture2D(tDiffuse, vUv).g; c.b = texture2D(tDiffuse, vUv - d*uAb).b;
      float v = 1.0 - uVig * smoothstep(0.35, 0.95, length(d*vec2(1.0,0.75))*1.6);
      c *= v;
      c += (h(vUv*1000.0) - 0.5) * 0.025;
      gl_FragColor = vec4(c, 1.0);
    }`,
});
composer.addPass(finition);

// ---------- ressources ----------
await Promise.all([
  L.chargerPolice("m800", "../polices/montserrat-latin-800-normal.woff"),
  L.chargerPolice("m700", "../polices/montserrat-latin-700-normal.woff"),
  document.fonts.ready,
]);
const NOMS_ECRANS = { formulaire: ["vide", "plein"], site: ["base"], publication: ["base"], story: ["base"], publicite: ["base", "nouveau"], editeur: ["base", "nouveau", "valide"], carte: ["base"], entete: ["base"] };
if (MODE === "film") await Promise.all(Object.entries(NOMS_ECRANS).flatMap(([n, e]) => e.map((s) => L.chargerImage(`../ui/png/${n}-${s}.png`))));

const peintureN = L.texturePeinture(), fibres = L.textureFibres();
const M = L.materiaux(peintureN, fibres);

// ---------- calque (légendes et étiquettes) ----------
const calque = document.getElementById("calque");
const legendes = [], etiquettes = [];
/** Légende : { a, b, num?, sur?, txt (HTML), centre? } */
function legende(o) {
  const d = document.createElement("div"); d.className = "leg" + (o.centre ? " centre" : "");
  d.innerHTML = (o.sur ? `<div class="sur">${o.sur}</div>` : "") + `<div class="ligne">${o.num ? `<span class="num">${o.num}</span>` : ""}<span class="txt">${o.txt}</span></div>`;
  if (o.top != null) d.style.top = o.top + "px";
  calque.insertBefore(d, calque.firstChild);
  legendes.push({ ...o, el: d });
  return d;
}
/** Étiquette accrochée à un point 3D : { a, b, txt, cible: () => Vector3, bleu?, dy? } */
function etiquette(o) {
  const d = document.createElement("div"); d.className = "eti" + (o.bleu ? " bleu" : ""); d.textContent = o.txt;
  calque.appendChild(d); etiquettes.push({ ...o, el: d }); return d;
}
const tmpV = new THREE.Vector3();
function majCalque(t) {
  for (const l of legendes) {
    const k = fenetre(t, l.a, l.b, 0.35, 0.3);
    l.el.style.opacity = k;
    l.el.style.transform = `${l.centre ? "translateX(-50%) " : ""}translateY(${(1 - eout(ramp(t, l.a, l.a + 0.45))) * 40}px)`;
    if (l.maj) l.maj(t, l.el);
  }
  for (const e of etiquettes) {
    const k = fenetre(t, e.a, e.b, 0.3, 0.25);
    if (k <= 0) { e.el.style.opacity = 0; continue; }
    tmpV.copy(e.cible(t)).project(camera);
    const x = (tmpV.x * 0.5 + 0.5) * W, y = (-tmpV.y * 0.5 + 0.5) * H + (e.dy || 0);
    e.el.style.opacity = tmpV.z < 1 ? k : 0;
    e.el.style.left = x + "px"; e.el.style.top = y + "px";
    e.el.style.transform = `translate(-50%,-50%) scale(${0.85 + 0.15 * eback(ramp(t, e.a, e.a + 0.4))})`;
  }
}

// ---------- caméra ----------
/** Pistes de caméra : clés { t, p, l, fov?, e? (courbe d'arrivée), cut? (saut sec) }. */
const cles = [];
function cameraA(t) {
  let i = 0;
  while (i < cles.length - 1 && cles[i + 1].t <= t) i++;
  const a = cles[i], b = cles[Math.min(i + 1, cles.length - 1)];
  if (b === a || b.cut || t <= a.t) { camera.position.set(...a.p); camera.fov = a.fov || 35; camera.up.set(0, 1, 0); camera.lookAt(...a.l); }
  else {
    const k = (L.EASE[b.e || "io"])(ramp(t, a.t, b.t));
    const p = a.p.map((v, j) => mix(v, b.p[j], k)), l = a.l.map((v, j) => mix(v, b.l[j], k));
    // trajectoire arquée possible (passage au-dessus ou autour)
    if (b.arc) { p[0] += b.arc[0] * Math.sin(Math.PI * k); p[1] += b.arc[1] * Math.sin(Math.PI * k); p[2] += b.arc[2] * Math.sin(Math.PI * k); }
    camera.position.set(...p); camera.fov = mix(a.fov || 35, b.fov || 35, k);
    const roul = mix(a.roll || 0, b.roll || 0, k);
    camera.up.set(Math.sin(roul), Math.cos(roul), 0);
    camera.lookAt(...l);
  }
  camera.updateProjectionMatrix();
}

// ---------- séquences ----------
const ctx = { THREE, L, M, scene, camera, renderer, TL, ZONES, cles, legende, etiquette, ombres, contre, hemi, soleil, bloom, MODE, W, H, calque };
const seq = await construireSequences(ctx);
window.REPERES = ctx.T; // repères de l'image, repris par la bande-son (scripts/bande-son.py)

// Mode « photo » : rend le salon (avant ou après travaux) depuis l'appareil photo de la réalisation, en 1200 × 900.
if (MODE.startsWith("photo")) {
  const { image } = seq.photo(MODE === "photo-avant" ? "avant" : "apres");
  window.photo = image;
  window.ready = true;
} else {
  cles.sort((a, b) => a.t - b.t);
  window.renderAt = (t) => {
    seq.maj(t);
    cameraA(t);
    seq.apresCamera && seq.apresCamera(t);
    majPoussiere(seq.poussiere ? seq.poussiere(t) : 1);
    ciel.material.uniforms.uT.value = t;
    finition.uniforms.uGrain.value = (Math.round(t * 30) % 97) * 1.37;
    composer.render();
    majCalque(t);
    return true;
  };
  window.DUREE = TL.duree;
  window.ready = true;
}
