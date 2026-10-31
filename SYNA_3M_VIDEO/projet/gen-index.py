# Génère index.html (paysage) à partir des repères de la voix (assets/cues.js) : scènes, voix, musique, effets, sous-titres.
import json, subprocess, os
P=os.path.dirname(os.path.abspath(__file__))+"/"
t=open(P+"assets/cues.js").read(); C=json.loads(t[t.index("{"):t.rindex("}")+1])
BGM="assets/audio/bgm.wav" if os.path.exists(P+"assets/audio/bgm.wav") else "assets/audio/bgm.m4a"
def dur(f): return float(subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","csv=p=0",P+f]).decode())
aud=[]
for k in "abcdefg":
    f=f"assets/audio/vo-{k}.wav"; aud.append(f'      <audio id="vo-{k}" class="clip" src="{f}" data-start="{C[k+".start"]}" data-duration="{dur(f)-0.01:.2f}" data-track-index="2" data-volume="1"></audio>')
aud.append(f'      <audio id="bgm" class="clip" src="{BGM}" data-start="0" data-duration="{C["total"]-0.01:.2f}" data-track-index="3" data-volume="0.2" data-fade-out="1.0"></audio>')
S,D,FN,R=C["scene.studio"],C["scene.demande"],C["scene.fin"],C["b.rien"]
sfx=[("whoosh-short",0.95,0.3),("whoosh",C["a.probleme"]-0.15,0.45),("pop",C["a.probleme"]+0.1,0.25),("pop",C["a.probleme"]+0.6,0.2),("click-soft",C["a.trop"],0.35),("click-soft",C["a.trop"]+0.3,0.3),
 ("whoosh-short",C["b.start"]-0.05,0.3),("pop",C["b.logo"]-0.08,0.55),("click",C["b.visuels"]-0.08,0.5),("pop",C["b.site"]-0.08,0.5),("click",C["b.pub"]-0.08,0.5),
 ("whoosh-short",C["b.heures"]-0.15,0.3),("notification",C["b.heures"]+0.1,0.28),("whoosh-short",R-0.14,0.45),("click",R+0.25,0.4),("glitch-1",R+0.6,0.3),("whoosh",R+0.85,0.5),
 ("whoosh-short",S-0.02,0.45),("pop",S+0.72,0.45),("whoosh-short",C["c.decouvre"]-0.15,0.3),("click-soft",C["c.decouvre"]+0.4,0.4),("sparkle",C["c.syna"]-0.1,0.4),
 ("whoosh-short",C["d.logo"]+0.05,0.4),("pop",C["d.logo"]+0.62,0.35),("whoosh",C["d.identite"]+0.05,0.3),("pop",C["d.identite"]+0.62,0.3),
 ("whoosh-short",C["d.visuels"]+0.05,0.4),("pop",C["d.visuels"]+0.62,0.3),("whoosh",C["d.pub"]-0.05,0.3),("pop",C["d.pub"]+0.52,0.3),
 ("whoosh-short",C["d.site"]+0.05,0.4),("click-soft",C["d.site"]+0.65,0.4),("click-soft",C["d.site"]+0.92,0.35),("click",C["d.site"]+1.12,0.35),
 ("whoosh",C["e.start"]-0.2,0.3),("whoosh",C["e.endroit"]-0.05,0.5),("pop",C["e.endroit"]+0.6,0.35),("whoosh",C["e.endroit"]+1.75,0.5),
 ("typing",D+0.28,0.35),("click",D+0.64,0.55),("pop",C["f.couleur"]+0.08,0.45),("whoosh-short",C["f.couleur"]+0.03,0.25),
 ("click-soft",C["f.titre"]-0.15,0.45),("pop",C["f.titre"]+0.3,0.4),("whoosh-short",C["f.titre"]+0.1,0.25),
 ("click-soft",C["f.section"]-0.15,0.45),("whoosh",C["f.photos"]+0.15,0.35),("pop",C["f.photos"]+0.3,0.4),
 ("click-soft",C["f.accent"]-0.2,0.45),("notification",C["f.marque"]-0.1,0.3),("click",C["f.fois"]+0.35,0.6),("whoosh-short",C["f.fois"]+0.5,0.3),("whoosh-short",C["f.fois"]+0.58,0.25),("sparkle",C["f.fois"]+0.8,0.35),
 ("pop",C["f.chaque"]-0.1,0.35),("whoosh",FN-0.45,0.45),
 ("notification",FN+1.05,0.35),("whoosh-short",C["g.ecom"]+0.25-0.9,0.4),("impact-bass-1",C["g.ecom"]+0.27,0.55)]
for i,(n,t0,v) in enumerate(sfx):
    f=f"assets/audio/{n}.mp3"
    aud.append(f'      <audio id="sfx-{i+1:02d}" class="clip" src="{f}" data-start="{t0:.2f}" data-duration="{dur(f)-0.01:.2f}" data-track-index="{4+i%3}" data-volume="{v}"></audio>')
pk=C["g.ecom"]+0.27
aud.append(f'      <audio id="sfx-riser" class="clip" src="assets/audio/riser.mp3" data-start="{pk-3.47+1.2:.2f}" data-media-start="1.2" data-duration="2.6" data-track-index="7" data-volume="0.3" data-fade-out="0.3"></audio>')
H=lambda i,src,s,d,kind: f'      <div id="{i}" data-composition-id="{i}" data-composition-src="compositions/{src}" data-start="{s}" data-duration="{d}" data-track-index="{8 if kind=="captions" else 1}" data-track-kind="{kind}" data-width="1920" data-height="1080"{" style=\"z-index:10\"" if kind=="captions" else ""}></div>'
hosts=[H("chantier","chantier.html",0,S,"graphics"),H("studio","studio.html",S,round(D-S,2),"graphics"),H("demande","demande.html",D,round(FN-D,2),"graphics"),H("fin","fin.html",FN,round(C["total"]-FN,2),"graphics"),H("sous-titres","sous-titres.html",0,C["total"],"captions")]
doc=f'''<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="assets/vendor/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: 1920px; height: 1080px; overflow: hidden; background: #FFFFFF; }}
      #main-bg {{ position: absolute; inset: 0; background: #FFFFFF; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{C["total"]}" data-width="1920" data-height="1080">
      <div id="main-bg"></div>
{chr(10).join(hosts)}
      <!-- Voix off (OpenAI, voix « onyx »), musique composée par le studio (pop), effets sonores libres -->
{chr(10).join(aud)}
    </div>
    <script>window.__timelines["main"] = gsap.timeline({{ paused: true }});</script>
  </body>
</html>
'''
open(P+"index.html","w").write(doc); print("index ok", C["total"])
