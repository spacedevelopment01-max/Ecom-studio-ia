import json, html
import os
P=os.path.dirname(os.path.abspath(__file__))
caps=json.loads(open(P+'/assets/caps.js').read()[len('window.CAPS='):-1])
import sys
sys.path.insert(0, P)
from timemap import to_new, D as DNEW
D=DNEW
capdivs='\n'.join(f'      <div id="cap-{i}" class="cap-g{" cap-top" if c.get("top") else ""}"><div class="cap-pill">'+' '.join(f'<span class="cap-w">{html.escape(w["w"])}</span>' for w in c['w'])+'</div></div>' for i,c in enumerate(caps))
out=f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1080, height=1920">
<title>La boutique sans frontières — E-COM STUDIO ia</title>
<!-- Publicité 02 « La boutique sans frontières » (1080 × 1920 natif, {D} s). Monde 3D : Three.js (assets/film.js), piloté
     par l'horloge GSAP de la composition. Interfaces du studio : reproduction des écrans réels (ui/boards-02.js). Maison Aube :
     boutique fictive créée pour la publicité. Aucun chiffre de vente, aucun résultat promis. -->
<script src="assets/vendor/gsap.min.js"></script>
<script src="assets/caps.js"></script>
<script type="importmap">{{"imports":{{"three":"./assets/vendor/three/three.module.js","three/addons/":"./assets/vendor/three/addons/"}}}}</script>
<style>
  @font-face {{ font-family: "InterV"; src: url("assets/fonts/inter.woff2") format("woff2"); font-weight: 100 900; }}
  @font-face {{ font-family: Inter; src: url("assets/fonts/inter.woff2") format("woff2"); font-weight: 100 900; }}
  @font-face {{ font-family: Brico; src: url("assets/fonts/bricolage.woff2") format("woff2"); font-weight: 200 800; }}
  @font-face {{ font-family: Instr; src: url("assets/fonts/instrument-italic.woff2") format("woff2"); font-style: italic; }}
  html, body {{ margin: 0; background: #000; }}
  #root {{ position: relative; width: 1080px; height: 1920px; overflow: hidden; background: #0A1024; }}
  #cv {{ position: absolute; inset: 0; width: 1080px; height: 1920px; }}
  .ov {{ position: absolute; inset: 0; pointer-events: none; }}
  #vign {{ background: radial-gradient(120% 80% at 50% 45%, rgba(0,0,0,0) 55%, rgba(5,8,20,.38) 100%); }}
  #flash {{ background: #fff; opacity: 0; }}
  #bflash {{ background: radial-gradient(circle at 50% 42%, rgba(124,196,255,.9), rgba(47,91,234,.55) 45%, rgba(47,91,234,0) 75%); opacity: 0; mix-blend-mode: screen; }}
  #green {{ background: #1E6B5E; opacity: 0; }}
  #dark {{ background: #0B0B10; opacity: 0; }}
  .cap-g {{ position: absolute; left: 0; right: 0; bottom: 400px; display: flex; justify-content: center; opacity: 0; }}
  .cap-g.cap-top {{ bottom: auto; top: 230px; }}
  .cap-pill {{ display: inline-flex; align-items: baseline; gap: 0 26px; padding: 12px 30px 16px; border-radius: 26px; background: rgba(255,255,255,.96);
    box-shadow: 0 22px 48px -18px rgba(10,16,36,.5), 0 0 0 2px rgba(220,226,238,.9); font: 800 60px/1.1 "InterV", Inter, sans-serif; letter-spacing: -.02em; white-space: nowrap; }}
  .cap-w {{ display: inline-block; color: #A7B1C6; transform-origin: 50% 80%; }}
  #endtxt {{ position: absolute; left: 0; right: 0; top: 0; height: 1920px; pointer-events: none; }}
  #wm {{ position: absolute; left: 0; right: 0; top: 520px; display: flex; justify-content: center; align-items: baseline; gap: 4px; font: 800 84px Brico; letter-spacing: -.03em; color: #EEF2FB; opacity: 0; }}
  #wm .ia {{ font: italic 400 96px Instr; color: #7CA4FF; letter-spacing: 0; margin-left: 10px; }}
  #tag1 {{ position: absolute; left: 60px; right: 60px; top: 650px; text-align: center; font: 600 44px/1.2 Inter; color: #E3E8F7; letter-spacing: -.01em; opacity: 0; }}
  #tag2 {{ position: absolute; left: 60px; right: 60px; top: 715px; text-align: center; font: 500 38px/1.2 Inter; color: #A9B4D6; opacity: 0; }}
  #cta {{ position: absolute; left: 0; right: 0; top: 1250px; display: flex; justify-content: center; opacity: 0; }}
  #cta span {{ display: inline-flex; align-items: center; gap: 14px; padding: 24px 46px; border-radius: 48px; background: #2F5BEA; color: #fff; font: 700 46px Inter; letter-spacing: -.01em; box-shadow: 0 20px 60px rgba(61,110,240,.5); }}
  #cta svg {{ width: 40px; height: 40px; fill: none; stroke: #fff; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{D}" data-width="1080" data-height="1920">
  <canvas id="cv" width="1080" height="1920"></canvas>
  <div id="vign" class="ov"></div>
  <div id="bflash" class="ov"></div>
  <div id="green" class="ov"></div>
  <div id="flash" class="ov"></div>
  <div id="dark" class="ov"></div>
  <div id="endtxt">
    <div id="wm"><span>E-COM STUDIO</span><span class="ia">ia</span></div>
    <div id="tag1">Votre commerce mérite une autre dimension.</div>
    <div id="tag2">Tout votre e-commerce. Au même endroit.</div>
    <div id="cta"><span>Découvrez le Studio<svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span></div>
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
  // éclairs de transition (rideau traversé, vague bleue, écran traversé, retour dans la rue, retour au studio)
  const fl = (sel, at, peak, up, down) => {{ tl.fromTo(sel, {{ opacity: 0 }}, {{ opacity: peak, duration: up, ease: "power2.in", immediateRender: false }}, at); tl.to(sel, {{ opacity: 0, duration: down, ease: "power2.out" }}, at + up); }};
  fl("#dark", {to_new(10.95):.2f}, 1, 0.12, 0.3);
  fl("#bflash", {to_new(18.15):.2f}, 0.5, 0.12, 0.6);
  fl("#flash", {to_new(23.12):.2f}, 0.95, 0.16, 0.35);
  fl("#flash", {to_new(46.05):.2f}, 0.9, 0.14, 0.35);
  fl("#flash", {to_new(53.05):.2f}, 0.9, 0.14, 0.35);
  tl.fromTo("#vign", {{ opacity: 1 }}, {{ opacity: 0.6, duration: 0.3, immediateRender: false }}, {to_new(23.3):.2f});
  // textes de fin
  tl.fromTo("#wm", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.6, ease: "power3.out", immediateRender: false }}, {to_new(56.0):.2f});
  tl.fromTo("#tag1", {{ opacity: 0, y: 24 }}, {{ opacity: 1, y: 0, duration: 0.55, ease: "power3.out", immediateRender: false }}, {to_new(56.6):.2f});
  tl.fromTo("#tag2", {{ opacity: 0, y: 24 }}, {{ opacity: 1, y: 0, duration: 0.55, ease: "power3.out", immediateRender: false }}, {to_new(57.1):.2f});
  tl.fromTo("#cta", {{ opacity: 0, y: 24, scale: 0.9 }}, {{ opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(2)", immediateRender: false }}, {to_new(57.7):.2f});
  // sous-titres : le groupe arrive, chaque mot passe au bleu quand il est dit, puis à l'encre
  window.CAPS.forEach((g, i) => {{
    const id = "#cap-" + i, words = document.querySelectorAll(id + " .cap-w");
    tl.fromTo(id, {{ opacity: 0, y: 18, scale: 0.92 }}, {{ opacity: 1, y: 0, scale: 1, duration: 0.14, ease: "back.out(2)", immediateRender: false }}, g.s);
    g.w.forEach((w, k) => {{
      tl.fromTo(words[k], {{ color: "#A7B1C6", scale: 1 }}, {{ color: "#2F5BEA", scale: 1.04, duration: 0.08, ease: "power2.out", immediateRender: false }}, w.s);
      const next = k + 1 < g.w.length ? g.w[k + 1].s : Math.min(w.e + 0.2, g.h - 0.12);
      tl.to(words[k], {{ color: "#0A1024", scale: 1, duration: 0.1, ease: "power2.out" }}, Math.max(w.s + 0.08, next));
    }});
    tl.to(id, {{ opacity: 0, duration: 0.1, ease: "power2.in" }}, g.h - 0.1);
    tl.set(id, {{ opacity: 0, visibility: "hidden" }}, g.h);
  }});
  window.__timelines = window.__timelines || {{}}; window.__timelines["main"] = tl;
</script>
<script type="module" src="assets/film.js"></script>
</body>
</html>
'''
open(P+'/index.html','w').write(out)
print('ok', len(caps))
