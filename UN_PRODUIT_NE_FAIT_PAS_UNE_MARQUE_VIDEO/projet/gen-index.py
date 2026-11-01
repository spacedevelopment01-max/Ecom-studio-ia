"""Page HyperFrames de la Pub 03 : horloge GSAP qui pilote la 3D (assets/film.js), sous-titres dynamiques, éclairs de
transition et signature finale. Durée D."""
import json, html, os
P = os.path.dirname(os.path.abspath(__file__))
caps = json.loads(open(P + '/assets/caps.js').read()[len('window.CAPS='):-1])
D = 52.5
capdivs = '\n'.join(f'      <div id="cap-{i}" class="cap-g{" cap-top" if c.get("top") else ""}"><div class="cap-pill">' + ' '.join(f'<span class="cap-w">{html.escape(w["w"])}</span>' for w in c['w']) + '</div></div>' for i, c in enumerate(caps))
out = f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1080, height=1920">
<title>Un produit ne fait pas une marque — E-COM STUDIO ia</title>
<!-- Publicité 03 (1080 × 1920 natif, {D} s). Monde 3D : Three.js (assets/film.js) piloté par l'horloge GSAP de la
     composition. Interfaces du studio : reproduction des écrans réels (ui/boards-03.js). KELVO : marque fictive créée
     pour la publicité. Aucun chiffre de vente, aucun avis, aucun résultat promis. -->
<script src="assets/vendor/gsap.min.js"></script>
<script src="assets/caps.js"></script>
<script type="importmap">{{"imports":{{"three":"./assets/vendor/three/three.module.js","three/addons/":"./assets/vendor/three/addons/"}}}}</script>
<style>
  @font-face {{ font-family: Inter; src: url("assets/fonts/inter.woff2") format("woff2"); font-weight: 100 900; }}
  @font-face {{ font-family: Brico; src: url("assets/fonts/bricolage.woff2") format("woff2"); font-weight: 200 800; }}
  @font-face {{ font-family: Instr; src: url("assets/fonts/instrument-italic.woff2") format("woff2"); font-style: italic; }}
  @font-face {{ font-family: SpaceG; src: url("assets/fonts/space-grotesk-latin-700-normal.woff2") format("woff2"); font-weight: 700; }}
  html, body {{ margin: 0; background: #000; }}
  #root {{ position: relative; width: 1080px; height: 1920px; overflow: hidden; background: #060912; }}
  #cv {{ position: absolute; inset: 0; width: 1080px; height: 1920px; }}
  .ov {{ position: absolute; inset: 0; pointer-events: none; }}
  #vign {{ background: radial-gradient(120% 80% at 50% 45%, rgba(0,0,0,0) 55%, rgba(3,5,12,.45) 100%); }}
  #flash {{ background: #fff; opacity: 0; }}
  #bflash {{ background: radial-gradient(circle at 50% 55%, rgba(124,196,255,.95), rgba(47,91,234,.6) 45%, rgba(47,91,234,0) 78%); opacity: 0; mix-blend-mode: screen; }}
  #aflash {{ background: radial-gradient(circle at 50% 50%, rgba(255,200,120,.9), rgba(255,140,40,.35) 45%, rgba(255,140,40,0) 75%); opacity: 0; mix-blend-mode: screen; }}
  .cap-g {{ position: absolute; left: 0; right: 0; bottom: 400px; display: flex; justify-content: center; opacity: 0; }}
  .cap-g.cap-top {{ bottom: auto; top: 230px; }}
  .cap-pill {{ display: inline-flex; align-items: baseline; gap: 0 24px; padding: 12px 30px 16px; border-radius: 26px; background: rgba(255,255,255,.96);
    box-shadow: 0 22px 48px -18px rgba(10,16,36,.55), 0 0 0 2px rgba(220,226,238,.9); font: 800 62px/1.1 Inter, sans-serif; letter-spacing: -.02em; white-space: nowrap; }}
  .cap-w {{ display: inline-block; color: #A7B1C6; transform-origin: 50% 80%; }}
  #endtxt {{ position: absolute; inset: 0; pointer-events: none; }}
  #endshade {{ background: linear-gradient(180deg, rgba(4,6,14,.55) 0%, rgba(4,6,14,.2) 9%, rgba(4,6,14,.2) 24%, rgba(4,6,14,.78) 30%, rgba(4,6,14,.78) 42%, rgba(4,6,14,.15) 58%, rgba(4,6,14,.55) 82%, rgba(4,6,14,.75) 100%); opacity: 0; }}
  #wm {{ position: absolute; left: 0; right: 0; top: 560px; display: flex; justify-content: center; align-items: baseline; gap: 4px; font: 800 80px Brico; letter-spacing: -.03em; color: #EEF2FB; opacity: 0; }}
  #wm .ia {{ font: italic 400 92px Instr; color: #7CA4FF; letter-spacing: 0; margin-left: 10px; }}
  #tag1 {{ position: absolute; left: 60px; right: 60px; top: 680px; text-align: center; font: 800 46px/1.15 Inter; color: #FFFFFF; letter-spacing: .02em; opacity: 0; }}
  #tag2 {{ position: absolute; left: 60px; right: 60px; top: 742px; text-align: center; font: 700 40px/1.15 Inter; color: #9DB8FF; letter-spacing: .06em; opacity: 0; }}
  #cta {{ position: absolute; left: 0; right: 0; top: 1395px; display: flex; justify-content: center; opacity: 0; }}
  #cta span {{ display: inline-flex; align-items: center; gap: 14px; padding: 24px 46px; border-radius: 48px; background: #2F5BEA; color: #fff; font: 700 46px Inter; letter-spacing: -.01em; box-shadow: 0 20px 60px rgba(61,110,240,.55); }}
  #cta svg {{ width: 40px; height: 40px; fill: none; stroke: #fff; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{D}" data-width="1080" data-height="1920">
  <canvas id="cv" width="1080" height="1920"></canvas>
  <div id="vign" class="ov"></div>
  <div id="bflash" class="ov"></div>
  <div id="aflash" class="ov"></div>
  <div id="flash" class="ov"></div>
  <div id="endshade" class="ov"></div>
  <div id="endtxt">
    <div id="wm"><span>E-COM STUDIO</span><span class="ia">ia</span></div>
    <div id="tag1">VOTRE MARQUE COMMENCE ICI.</div>
    <div id="tag2">AVEC SYNA.</div>
    <div id="cta"><span>Créez votre marque<svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span></div>
  </div>
  <div id="caps" class="ov">
{capdivs}
  </div>
  <audio id="mix" src="assets/audio/mix.wav" data-start="0" data-duration="{D}" data-track-index="1" data-volume="1"></audio>
</div>
<script>
  window.__w = {{ clock: {{ t: 0 }}, render: null }};
  window.__hf = window.__hf || {{}}; window.__hf.buildReady = window.__hf.buildReady || {{}};
  window.__hf.buildReady["monde"] = new Promise((r) => (window.__w.ready = r));
  const tl = gsap.timeline({{ paused: true }});
  tl.to(window.__w.clock, {{ t: {D}, duration: {D}, ease: "none", onUpdate: () => window.__w.render && window.__w.render(window.__w.clock.t) }}, 0);
  const fl = (sel, at, peak, up, down) => {{ tl.fromTo(sel, {{ opacity: 0 }}, {{ opacity: peak, duration: up, ease: "power2.in", immediateRender: false }}, at); tl.to(sel, {{ opacity: 0, duration: down, ease: "power2.out" }}, at + up); }};
  fl("#aflash", 0.02, 0.85, 0.06, 0.4);
  fl("#flash", 9.32, 0.5, 0.08, 0.25);
  fl("#aflash", 11.0, 0.55, 0.08, 0.5);
  fl("#bflash", 12.38, 0.7, 0.08, 0.55);
  fl("#flash", 17.32, 0.95, 0.12, 0.3);
  fl("#aflash", 20.35, 0.5, 0.08, 0.35);
  fl("#flash", 27.35, 0.5, 0.06, 0.22);
  fl("#aflash", 32.05, 0.45, 0.08, 0.4);
  fl("#flash", 37.95, 0.6, 0.1, 0.25);
  fl("#flash", 42.72, 0.95, 0.12, 0.3);
  fl("#aflash", 44.2, 0.55, 0.08, 0.45);
  fl("#bflash", 46.95, 0.6, 0.08, 0.5);
  tl.fromTo("#endshade", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.6, ease: "power2.out", immediateRender: false }}, 46.4);
  tl.fromTo("#wm", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.5, ease: "power3.out", immediateRender: false }}, 47.6);
  tl.fromTo("#tag1", {{ opacity: 0, y: 24 }}, {{ opacity: 1, y: 0, duration: 0.45, ease: "power3.out", immediateRender: false }}, 48.15);
  tl.fromTo("#tag2", {{ opacity: 0, y: 24 }}, {{ opacity: 1, y: 0, duration: 0.45, ease: "power3.out", immediateRender: false }}, 48.6);
  tl.fromTo("#cta", {{ opacity: 0, y: 24, scale: 0.9 }}, {{ opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(2)", immediateRender: false }}, 49.3);
  tl.to("#cta span", {{ scale: 1.05, duration: 0.45, yoyo: true, repeat: 5, ease: "sine.inOut" }}, 49.9);
  window.CAPS.forEach((g, i) => {{
    const id = "#cap-" + i, words = document.querySelectorAll(id + " .cap-w");
    tl.fromTo(id, {{ opacity: 0, y: 14, scale: 0.92 }}, {{ opacity: 1, y: 0, scale: 1, duration: 0.1, ease: "back.out(2)", immediateRender: false }}, g.s);
    g.w.forEach((w, k) => {{
      tl.fromTo(words[k], {{ color: "#A7B1C6", scale: 1 }}, {{ color: "#2F5BEA", scale: 1.04, duration: 0.06, ease: "power2.out", immediateRender: false }}, w.s);
      const next = k + 1 < g.w.length ? g.w[k + 1].s : Math.min(w.e + 0.15, g.h - 0.08);
      tl.to(words[k], {{ color: "#0A1024", scale: 1, duration: 0.08, ease: "power2.out" }}, Math.max(w.s + 0.06, next));
    }});
    tl.to(id, {{ opacity: 0, duration: 0.07, ease: "power2.in" }}, g.h - 0.07);
    tl.set(id, {{ opacity: 0, visibility: "hidden" }}, g.h);
  }});
  window.__timelines = window.__timelines || {{}}; window.__timelines["main"] = tl;
</script>
<script type="module" src="assets/film.js"></script>
</body>
</html>
'''
open(P + '/index.html', 'w').write(out)
print('ok', len(caps))
