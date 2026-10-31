import json, html
import os
P=os.path.dirname(os.path.abspath(__file__))
caps=json.loads(open(P+'/assets/caps.js').read()[len('window.CAPS='):-1])
D=58
capdivs='\n'.join(f'      <div id="cap-{i}" class="cap-g{" cap-top" if 38.8 <= c["s"] <= 42.7 else ""}"><div class="cap-pill">'+' '.join(f'<span class="cap-w">{html.escape(w["w"])}</span>' for w in c['w'])+'</div></div>' for i,c in enumerate(caps))
out=f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1080, height=1920">
<title>L'artisan invisible — E-COM STUDIO ia</title>
<!-- Publicité 01 « L'artisan invisible » (1080 × 1920, {D} s). Monde 3D : Three.js (assets/film.js), piloté par l'horloge
     GSAP de la composition. Interfaces du studio : reproduction des écrans réels (ui/boards.html). 3M Plâtrerie Peinture :
     entreprise fictive créée pour la publicité. Aucun chiffre, aucun résultat promis. -->
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
  .cap-g {{ position: absolute; left: 0; right: 0; bottom: 400px; display: flex; justify-content: center; opacity: 0; }}
  .cap-g.cap-top {{ bottom: auto; top: 150px; }}
  .cap-pill {{ display: inline-flex; align-items: baseline; gap: 0 26px; padding: 12px 30px 16px; border-radius: 26px; background: rgba(255,255,255,.96);
    box-shadow: 0 22px 48px -18px rgba(10,16,36,.5), 0 0 0 2px rgba(220,226,238,.9); font: 800 60px/1.1 "InterV", Inter, sans-serif; letter-spacing: -.02em; white-space: nowrap; }}
  .cap-w {{ display: inline-block; color: #A7B1C6; transform-origin: 50% 80%; }}
  #endtxt {{ position: absolute; left: 0; right: 0; top: 1130px; display: flex; flex-direction: column; align-items: center; gap: 30px; text-align: center; }}
  #wm {{ display: flex; align-items: baseline; gap: 4px; font: 800 96px Brico; letter-spacing: -.03em; color: #EEF2FB; opacity: 0; }}
  #wm .ia {{ font: italic 400 108px Instr; color: #7CA4FF; letter-spacing: 0; margin-left: 10px; }}
  #tag1 {{ font: 600 50px/1.2 Inter; color: #C3CBE0; letter-spacing: -.01em; opacity: 0; }}
  #tag2 {{ display: inline-flex; align-items: center; gap: 16px; padding: 18px 34px; border-radius: 40px; background: #2F5BEA; color: #fff; font: 700 48px Inter; letter-spacing: -.01em; opacity: 0; box-shadow: 0 20px 60px rgba(61,110,240,.45); }}
  #tag2 svg {{ width: 46px; height: 46px; fill: none; stroke: #fff; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{D}" data-width="1080" data-height="1920">
  <canvas id="cv" width="1080" height="1920"></canvas>
  <div id="vign" class="ov"></div>
  <div id="bflash" class="ov"></div>
  <div id="green" class="ov"></div>
  <div id="flash" class="ov"></div>
  <div id="endtxt">
    <div id="wm"><span>E-COM STUDIO</span><span class="ia">ia</span></div>
    <div id="tag1">Faites connaître votre savoir-faire.</div>
    <div id="tag2"><svg viewBox="0 0 24 24"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/></svg>Créez avec Syna.</div>
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
  // éclairs de transition
  tl.fromTo("#flash", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.14, ease: "power2.in", immediateRender: false }}, 8.42);
  tl.to("#flash", {{ opacity: 0, duration: 0.3, ease: "power2.out" }}, 8.6);
  tl.fromTo("#bflash", {{ opacity: 0 }}, {{ opacity: 0.45, duration: 0.12, ease: "power2.out", immediateRender: false }}, 17.0);
  tl.to("#bflash", {{ opacity: 0, duration: 0.7, ease: "power2.out" }}, 17.12);
  tl.fromTo("#bflash", {{ opacity: 0 }}, {{ opacity: 0.35, duration: 0.1, immediateRender: false }}, 18.2);
  tl.to("#bflash", {{ opacity: 0, duration: 0.45 }}, 18.3);
  tl.fromTo("#flash", {{ opacity: 0 }}, {{ opacity: 0.95, duration: 0.16, ease: "power2.in", immediateRender: false }}, 42.88);
  tl.to("#flash", {{ opacity: 0, duration: 0.35, ease: "power2.out" }}, 43.05);
  tl.fromTo("#green", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.3, ease: "power2.in", immediateRender: false }}, 52.05);
  tl.to("#green", {{ opacity: 0, duration: 0.55, ease: "power2.out" }}, 52.38);
  tl.to("#vign", {{ opacity: 0.4, duration: 0.6 }}, 21.9);
  tl.to("#vign", {{ opacity: 1, duration: 0.4 }}, 42.9);
  // textes de fin
  tl.fromTo("#wm", {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.6, ease: "power3.out", immediateRender: false }}, 54.0);
  tl.fromTo("#tag1", {{ opacity: 0, y: 24 }}, {{ opacity: 1, y: 0, duration: 0.55, ease: "power3.out", immediateRender: false }}, 54.75);
  tl.fromTo("#tag2", {{ opacity: 0, y: 24, scale: 0.9 }}, {{ opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(2)", immediateRender: false }}, 55.5);
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
