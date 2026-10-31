/* Final : fond bleu nuit, faisceaux de lumière volumétrique, poussière, vrai logo d'E-COM STUDIO ia en relief. */
import * as THREE from "three";
import { rng, seg, ease, lerp, glow } from "./lib.js";
import { makeLogoE, STUDIO } from "./actors.js";

export function buildEnd() {
  const scene = new THREE.Scene(); scene.background = new THREE.Color("#060A18");
  scene.fog = new THREE.FogExp2("#081028", 0.035);
  scene.add(new THREE.HemisphereLight("#5D7CFF", "#05070F", 0.6));
  const key = new THREE.SpotLight("#CFDBFF", 60, 30, 0.5, 0.6, 1.4); key.position.set(-3, 9, 6); key.target.position.set(0, 0, 0); scene.add(key, key.target);
  const rimL = new THREE.PointLight("#3D6EF0", 40, 14, 1.6); rimL.position.set(-3.5, 1, -2); scene.add(rimL);
  const rimR = new THREE.PointLight("#7CC4FF", 30, 14, 1.6); rimR.position.set(3.5, -1, -1.5); scene.add(rimR);
  // faisceaux (cônes additifs en dégradé)
  const beamMat = () => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { col: { value: new THREE.Color("#4F7BFF") }, op: { value: 0.0 } },
    vertexShader: "varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = uv.y; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }",
    fragmentShader: "uniform vec3 col; uniform float op; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(abs(dot(vN,vV)),1.6); gl_FragColor = vec4(col, op*f*pow(vY,1.4)); }",
  });
  const beams = [[-2.6, 0.32, 0.9], [0.4, 0.42, 1.1], [3.0, 0.3, 0.8], [-0.9, 0.25, 0.6]].map(([x, rz, s], i) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 2.6 * s, 22, 40, 1, true), beamMat());
    m.position.set(x, 4, -4 - i * 0.6); m.rotation.z = rz * (i % 2 ? 1 : -1); scene.add(m); return m;
  });
  // poussière
  const R = rng(11); const n = 500; const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (R() - 0.5) * 16; pos[i * 3 + 1] = (R() - 0.5) * 22; pos[i * 3 + 2] = -R() * 14 + 3; }
  const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: "#9DB8FF", size: 0.05, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(dust);
  const logo = makeLogoE(); logo.root.position.set(0, 2.2, 0); scene.add(logo.root);
  const halo = glow("#3D6EF0", 8, 0); halo.position.set(0, 2.75, -1.2); scene.add(halo);

  function update(t) {
    const a = seg(t, 52.4, 53.6);
    beams.forEach((b, i) => { b.material.uniforms.op.value = 0.32 * ease.out(a) * (0.75 + 0.25 * Math.sin(t * 0.9 + i * 1.7)); b.rotation.y = Math.sin(t * 0.25 + i) * 0.15; });
    dust.rotation.y = t * 0.03; dust.position.y = -((t - 52) * 0.25);
    const lp = ease.outExpo(seg(t, 52.7, 54.2));
    logo.root.position.set(0, lerp(1.4, 2.75, lp), lerp(-9, 0, lp)); logo.root.scale.setScalar(0.9);
    logo.root.rotation.set(lerp(0.5, 0, lp) + Math.sin(t * 0.9) * 0.03, lerp(-2.6, 0, lp) + Math.sin(t * 0.6) * 0.08, 0);
    halo.material.opacity = 0.55 * lp;
  }
  return { scene, update, logo };
}
