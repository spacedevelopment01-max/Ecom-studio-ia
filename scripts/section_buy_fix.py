"""
Bloc d'achat « Produit vedette » de la bibliothèque de sections (public/sections/library.js) : le script lit les VRAIES
valeurs posées par le Studio dans data-cfg (audit du 10 novembre 2026) au lieu des valeurs d'exemple codées en dur
(lots à −10 % / −15 %, promotion à −15 % finissant « dans 2 j 5 h », abonnement à −10 %, lot à −10 %, fidélité
« programme d'exemple », paliers à 20 et 35 €, photos uniquement dans photos/). Sans data-cfg (démonstration de la
bibliothèque), les valeurs d'exemple restent.

Utilisé par scripts/sections-library.py ; lancé seul, applique les corrections à public/sections/library.js (une fois).
"""
import os

BUY_FIX = [
    # Fin réelle de la promotion (sinon la date d'exemple de la démonstration).
    ('var PROMO_END=Date.now()+((2*24+5)*60+14)*60000;',
     'var PROMO_END=Date.now()+((2*24+5)*60+14)*60000;document.querySelectorAll("[data-pvb]").forEach(function(e){try{var x=JSON.parse(e.dataset.cfg||"null");if(x&&x.promoEnd)PROMO_END=x.promoEnd}catch(err){}});'),
    # Photos du client (/api/files/…) : jamais préfixées par « photos/ ».
    ('function gsrc(g){return "photos/"+g[0]+(/\\./.test(g[0])?"":".jpg")}',
     'function src(f){return /^(\\/|data:|https?:)/.test(f)?f:"photos/"+f}function gsrc(g){return /^(\\/|data:|https?:)/.test(g[0])?g[0]:"photos/"+g[0]+(/\\./.test(g[0])?"":".jpg")}'),
    ('<img src="photos/\'+r[0]+\'" alt="">', '<img src="\'+src(r[0])+\'" alt="">'),
    # Produit de la gamme sans photo : pas d'image cassée.
    ('aria-pressed="\'+(i===gi)+\'"><img src="\'+gsrc(g)+\'" alt="">\'+g[1]+\'</button>', 'aria-pressed="\'+(i===gi)+\'">\'+(g[0]?\'<img src="\'+gsrc(g)+\'" alt="">\':"")+g[1]+\'</button>'),
    ('if(cc[2])overlay("photos/"+cc[2],cc[0],st.color!==0)', 'if(cc[2])overlay(src(cc[2]),cc[0],st.color!==0)'),
    # Remises par lot et « N achetés, M offerts » : celles du client.
    ('function priceFor(n,unit){var of=D.poOffre;if(of==="lots"){return unit*n*(n===2?.9:n===3?.85:1)}if(of==="bogo"){return unit*(n===3?2:n)}return unit*n}',
     'function lotPct(n){if(cfg&&cfg.lots){var t=cfg.lots.filter(function(x){return x[0]<=n}).pop();return t?t[1]/100:0}return n===2?.1:n===3?.15:0}function bogo(){return cfg&&cfg.bogo?cfg.bogo:[2,1]}'
     'function priceFor(n,unit){var of=D.poOffre;if(of==="lots"){return unit*n*(1-lotPct(n))}if(of==="bogo"){var b=bogo();return unit*(n-Math.floor(n/(b[0]+b[1]))*b[1])}return unit*n}'),
    # Promotion, abonnement et lot à compléter : les vrais pourcentages.
    ('var unit=st.base*(D.poPromo==="1"?.85:1)*(D.poAbo==="1"&&st.sub?.9:1)',
     'var unit=st.base*(D.poPromo==="1"?1-(cfg&&cfg.promoPct!=null?cfg.promoPct:15)/100:1)*(D.poAbo==="1"&&st.sub?1-(cfg&&cfg.subPct!=null?cfg.subPct:10)/100:1)'),
    ('ritO=rit;if(on===2)rit*=.9}', 'ritO=rit;if(on&&on===it.length)rit*=1-(cfg&&cfg.bundlePct!=null?cfg.bundlePct:10)/100}'),
    ('var lab=of==="lots"?(n===2?"−10 %":n===3?"−15 %":eur(st.base)):of==="bogo"?(n===3?"1 offert":eur(st.base*n)):eur(st.base*n),tag=of==="bogo"&&n===3?"<i>2 + 1 offert</i>":of==="lots"&&n===3?"<i>Meilleur prix</i>":"";',
     'var lp=Math.round(lotPct(n)*100),bg=bogo(),fr=Math.floor(n/(bg[0]+bg[1]))*bg[1],lab=of==="lots"?(lp?"−"+lp+" %":eur(st.base)):of==="bogo"?(fr?fr+" offert"+(fr>1?"s":""):eur(st.base*n)):eur(st.base*n),tag=of==="bogo"&&fr?"<i>"+bg[0]+" + "+bg[1]+" offert"+(bg[1]>1?"s":"")+"</i>":of==="lots"&&n===3&&lp?"<i>Meilleur prix</i>":"";'),
    # Fidélité : le vrai programme du client.
    ('var fi=q("[data-pofi]",el),pts=Math.floor(c.tot);if(fi){fi.innerHTML="Tu gagnes <b>"+pts+" point"+(pts>1?"s":"")+"</b> de fidélité avec cet achat<br><small>1 point par euro · 100 points = 5 € offerts (programme d\'exemple)</small>";',
     'var LY=cfg&&cfg.loyalty,fi=q("[data-pofi]",el),pts=Math.floor(c.tot*(LY?LY.per:1));if(fi){fi.innerHTML="Tu gagnes <b>"+pts+" point"+(pts>1?"s":"")+"</b> de fidélité avec cet achat<br><small>"+(LY?LY.per+" point"+(LY.per>1?"s":"")+" par euro · "+LY.reward+" points = "+LY.label:"1 point par euro · 100 points = 5 € offerts (programme d\'exemple)")+"</small>";'),
    # Paliers de cadeaux : de un à trois paliers réels.
    ('var T2=TI?TI[1][0]:35;', 'var T2=TI?TI[TI.length-1][0]:35;'),
    ('q("[data-pogm]",el).innerHTML=TI?(c.tot<TI[0][0]?"Plus que <b>"+eur(TI[0][0]-c.tot)+"</b> pour "+TI[0][1]+".":c.tot<TI[1][0]?TI[0][2]+" ✓ · plus que <b>"+eur(TI[1][0]-c.tot)+"</b> pour "+TI[1][1]+".":TI[0][2]+" et "+TI[1][2].toLowerCase()+" ✓"):',
     'q("[data-pogm]",el).innerHTML=TI?(function(){var nx=TI.filter(function(x){return c.tot<x[0]})[0],ok=TI.filter(function(x){return c.tot>=x[0]}).map(function(x){return x[2]});return nx?(ok.length?ok.join(" · ")+" ✓ · plus que ":"Plus que ")+"<b>"+eur(nx[0]-c.tot)+"</b> pour "+nx[1]+".":ok.join(" et ")+" ✓"})():'),
]


def apply(js: str) -> str:
    for a, b in BUY_FIX:
        assert js.count(a) == 1, a[:80]
        js = js.replace(a, b)
    return js


if __name__ == '__main__':
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'sections', 'library.js')
    js = open(path, encoding='utf-8').read()
    if 'function lotPct(n)' in js:
        print('library.js : bloc d\'achat déjà corrigé')
    else:
        open(path, 'w', encoding='utf-8').write(apply(js))
        print(f'library.js : {len(BUY_FIX)} corrections du bloc d\'achat appliquées')
