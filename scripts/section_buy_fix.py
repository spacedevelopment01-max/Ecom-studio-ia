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


# Ouverture « mot géant » (Moderne) : les trois tenues d'exemple sont écrites par le script ; sur le site d'un client, seule
# SA photo (celle de la section) est montrée, jamais les mannequins d'une autre marque (audit du 10 novembre 2026).
EL1_FIX = [
    ('var S1=[["sl-h1.webp"', 'var S1d=[["sl-h1.webp"'),
    ('qa("[data-el1]").forEach(function(s){var md=q("[data-el1p]",s),th=q("[data-el1t]",s),cur=0;',
     'qa("[data-el1]").forEach(function(s){var md=q("[data-el1p]",s),th=q("[data-el1t]",s),cur=0,m0=q("img",md),S1=(m0&&!/(^|\\/)photos\\/sl-h\\d\\.webp$/.test(m0.getAttribute("src")||""))?[[m0.getAttribute("src"),m0.alt,1,"transparent"]]:S1d;function ps(f){return /^(\\/|data:|https?:)/.test(f)?f:"photos/"+f}'),
    ('aria-current="\'+(i===0)+\'"><img src="photos/\'+x[0]+\'" alt=""><i></i></button>\'', 'aria-current="\'+(i===0)+\'"><img src="\'+ps(x[0])+\'" alt=""><i></i></button>\''),
    ('im=document.createElement("img");im.src="photos/"+x[0];', 'im=document.createElement("img");im.src=ps(x[0]);'),
]


# Produit vedette à sélecteur de mélanges : le prix de départ est celui du client (data-base posé par le Studio avec
# data-cfg), jamais les 8,50 € de la démonstration, qui écrasaient le vrai prix du bloc d'achat.
XP_FIX = [
    ('var main=q("[data-xmain]",p),imgs=qa("img",main),th=q("[data-xth]",p),cur=0,price=8.5,mult=1,qty=1;',
     'var main=q("[data-xmain]",p),imgs=qa("img",main),th=q("[data-xth]",p),cur=0,price=8.5,mult=1,qty=1,xb=q("[data-pvb]",p);if(xb&&xb.dataset.cfg&&+xb.dataset.base)price=+xb.dataset.base;'),
    # Produit de la gamme sans photo : la galerie garde sa photo au lieu d'une image cassée.
    ('imgs[1].src=b.dataset.img;imgs[1].alt=b.dataset.n;var tb=qa("button[aria-label^=\'Photo \']",th)[1];if(tb)q("img",tb).src=b.dataset.img;show(1);upd()',
     'if(b.dataset.img&&imgs[1]){imgs[1].src=b.dataset.img;imgs[1].alt=b.dataset.n;var tb=qa("button[aria-label^=\'Photo \']",th)[1];if(tb)q("img",tb).src=b.dataset.img;show(1)}upd()'),
]


# Scène achetable : la photo d'ambiance remplacée par la grille des vraies photos des produits cochés (décision du
# propriétaire du 10 novembre 2026 : 4 cochés = 2 + 2, 3 = 2 + 1, 2 = l'un au-dessus de l'autre, 1 = seul, en carré).
P8_FIX = [
    ('its.forEach(function(it,i){it.addEventListener("mouseenter",function(){mk[i].classList.add("on");it.classList.add("on")});it.addEventListener("mouseleave",function(){mk[i].classList.remove("on");it.classList.remove("on")})});qa("input",s).forEach(function(i){i.addEventListener("change",tot)});tot()});',
     'var gr=q("[data-p8g]",s);function grid(){if(!gr)return;var n=0,ins=qa("input",s);ins.forEach(function(x,k){var g=q(\'[data-gi="\'+k+\'"]\',gr);if(g){g.hidden=!x.checked;if(x.checked)n++}});if(!n)qa("[data-gi]",gr).forEach(function(g){g.hidden=false;n++});gr.dataset.n=n}'
     'var sp=qa("p",s).filter(function(x){return /livraison/i.test(x.textContent)&&/\\d\\s?€/.test(x.textContent)})[0],sum=function(){var t=0;qa("input",s).forEach(function(i){if(i.checked)t+=+i.dataset.p});return t},thr=0,pre="";if(sp){var m0=sp.textContent.match(/(\\d+(?:[.,]\\d+)?)\\s?€/);thr=sum()+parseFloat(m0[1].replace(",","."));pre=sp.textContent.split(/\\s:\\s/)[0]}function ship(){if(!sp||!thr)return;var r=Math.round((thr-sum())*100)/100;sp.textContent=r>0?pre.replace(/\\d+(?:[.,]\\d+)?\\s?€/,eur(r))+".":"La livraison t\u2019est offerte."}'
     'its.forEach(function(it,i){it.addEventListener("mouseenter",function(){if(mk[i])mk[i].classList.add("on");it.classList.add("on")});it.addEventListener("mouseleave",function(){if(mk[i])mk[i].classList.remove("on");it.classList.remove("on")})});qa("input",s).forEach(function(i){i.addEventListener("change",function(){tot();grid();ship()})});tot();grid()});'),
]


def apply(js: str) -> str:
    for a, b in BUY_FIX + EL1_FIX + XP_FIX + P8_FIX:
        assert js.count(a) == 1, a[:80]
        js = js.replace(a, b)
    return js


if __name__ == '__main__':
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'sections', 'library.js')
    js = open(path, encoding='utf-8').read()
    todo = [(a, b) for a, b in BUY_FIX + EL1_FIX + XP_FIX + P8_FIX if b not in js]
    for a, b in todo:
        assert js.count(a) == 1, a[:80]
        js = js.replace(a, b)
    open(path, 'w', encoding='utf-8').write(js)
    print(f'library.js : {len(todo)} correction(s) appliquée(s)')
