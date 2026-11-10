"""
Sections refaites ou ajoutées à la banque d'après la revue du propriétaire (10 novembre 2026,
docs/revue-banque-sections.md). Méthode décidée avec lui : la fonction et le principe de mise en page viennent des
catalogues de sections du marché (Section Store), le dessin, le code et les textes sont les nôtres.

Chaque entrée remplace une section existante (même identifiant) ou en ajoute une. Feuille (NEW_CSS) et script (NEW_JS)
communs, préfixés « rv- », ajoutés une seule fois par scripts/sections_revue.py.
"""

STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 17l-5.8 3.3 1.4-6.4L2.7 9.5l6.5-.7z"/></svg>'
STARS = '<span class="rv-st" aria-label="5 étoiles sur 5">' + STAR * 5 + '</span>'


def ico(path, w=1.6):
    return f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{path}</svg>'


I_TRUCK = ico('<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>')
I_RETURN = ico('<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4h4"/>')
I_LEAF = ico('<path d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14z"/><path d="M5 19l8-8"/>')
I_LOCK = ico('<rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>')
I_HAND = ico('<path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V11m0-1V5a1.5 1.5 0 0 1 3 0v6m0-1V6.5a1.5 1.5 0 0 1 3 0V13c0 4-2.5 7-6.5 7S5 17 5 14v-2a1.5 1.5 0 0 1 2-1"/>')
I_CUP = ico('<path d="M4 9h12v4a6 6 0 0 1-12 0z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3c0 1.5 1 1.5 1 3M12 3c0 1.5 1 1.5 1 3"/>')
PREV = ico('<path d="M15 6l-6 6 6 6"/>', 2)
NEXT = ico('<path d="M9 6l6 6-6 6"/>', 2)


def review(n, name):
    return (f'<article class="rv-rc">{STARS}<p>[Texte d\'un vrai avis client n° {n}, repris tel quel]</p>'
            f'<footer><span class="rv-av">{name[0]}</span><span><b>{name}</b><small>[Date] · avis vérifié</small></span></footer></article>')


SECTIONS = [
    # 12. Badges de confiance : proposition A « Cartes douces » choisie par le propriétaire.
    {'id': 'badges-de-confiance', 'html': (
        '<section class="rv-s rv-bdg" data-rv-in><div class="rv-in">'
        '<div class="rv-hd"><span class="rv-eb">Commander l\'esprit tranquille</span><h3 class="rv-h">Ta commande arrive <em>sans détour</em></h3></div>'
        '<div class="rv-bdg-g">'
        f'<div class="rv-bdg-c"><span class="rv-ic">{I_TRUCK}</span><b>Livrée en <span class="rv-nb">48 à 72 h</span></b><p>Envoi suivi, offert dès <span class="rv-nb">35 €</span> d\'achat.</p></div>'
        f'<div class="rv-bdg-c"><span class="rv-ic">{I_RETURN}</span><b>Retours sous <span class="rv-nb">14 jours</span></b><p>Les conditions de retour exactes de la marque.</p></div>'
        f'<div class="rv-bdg-c"><span class="rv-ic">{I_LEAF}</span><b>Ingrédients choisis</b><p>Une promesse vraie de la marque, en une phrase.</p></div>'
        f'<div class="rv-bdg-c"><span class="rv-ic">{I_LOCK}</span><b>Paiement sécurisé</b><p>Le paiement se fait sur la page protégée de la boutique.</p></div>'
        '</div></div></section>')},
    # 13. Avis clients : sur le modèle « Note et avis en bandeau » (note en grand, puis rangée qui défile un par un).
    {'id': 'avis-clients', 'html': (
        '<section class="rv-s rv-rev" data-rv-in><div class="rv-in">'
        '<div class="rv-rev-top"><div class="rv-rev-note"><strong>[Note]</strong>'
        f'<span>{STARS}<small>[Nombre] avis vérifiés · [Source des avis]</small></span></div>'
        '<a class="rv-btn" href="#" onclick="return false">Lire tous les avis</a></div>'
        '<div class="rv-car" data-rv-car style="--rv-n:5;--rv-nm:1.15">'
        f'<button class="rv-arr l" type="button" data-rv-prev aria-label="Avis précédent">{PREV}</button>'
        '<div class="rv-vp"><div class="rv-tr">'
        + ''.join(review(i + 1, n) for i, n in enumerate(['Camille', 'Hugo', 'Léa', 'Sami', 'Nina', 'Paul', 'Inès', 'Marc']))
        + f'</div></div><button class="rv-arr r" type="button" data-rv-next aria-label="Avis suivant">{NEXT}</button></div>'
        '</div></section>')},
    # 14. Nos engagements : une promesse par colonne, avec sa photo, son titre et sa phrase (différente des badges).
    {'id': 'nos-engagements', 'html': (
        '<section class="rv-s rv-eng" data-rv-in><div class="rv-in">'
        '<div class="rv-eng-hd"><div><span class="rv-eb">Nos engagements</span><h3 class="rv-h">Ce que l\'on te <em>promet</em>, et que l\'on tient</h3></div>'
        '<p>Trois promesses concrètes de la marque, chacune expliquée en une ou deux phrases, sans jamais rien inventer.</p></div>'
        '<div class="rv-eng-g">'
        f'<article><div class="rv-eng-ph"><img src="photos/seches.jpg" alt=""><span class="rv-ic">{I_LEAF}</span></div><small>01</small><b>Des ingrédients choisis</b><p>D\'où viennent les matières, comment elles sont choisies : seulement ce que la marque peut prouver.</p></article>'
        f'<article><div class="rv-eng-ph"><img src="photos/fleurs.jpg" alt=""><span class="rv-ic">{I_HAND}</span></div><small>02</small><b>Fait avec soin</b><p>Comment le produit est préparé, par qui et en quelle quantité, avec les vrais gestes de l\'atelier.</p></article>'
        f'<article><div class="rv-eng-ph"><img src="photos/tasse.jpg" alt=""><span class="rv-ic">{I_CUP}</span></div><small>03</small><b>Goûté avant l\'envoi</b><p>Le contrôle fait avant chaque envoi, et ce qu\'il garantit au client.</p></article>'
        '</div></div></section>')},
]

NEW_CSS = '''
/* Sections refaites (revue du 10 novembre 2026) : socle commun rv- */
.rv-s{padding:84px max(24px,5vw);background:#fff;color:var(--b-ink);font-family:var(--f-ui);position:relative}
.rv-in{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr);gap:40px}
.rv-in>*{min-width:0}
.rv-hd{text-align:center;display:grid;gap:12px;justify-items:center}
.rv-eb{font:700 .74rem/1 var(--f-ui);letter-spacing:.16em;text-transform:uppercase;color:var(--b-gold,var(--c5,#C9A04E))}
.rv-h{margin:0;font:500 clamp(2rem,3.6vw,3rem)/1.08 var(--f-title);color:var(--b-dark);text-wrap:balance}
.rv-h em{color:var(--b-primary);font-style:italic}
.rv-nb{white-space:nowrap}
.rv-ic{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;background:var(--b-dark);color:var(--b-gold,var(--c5,#C9A04E));flex:none}
.rv-ic svg{width:24px;height:24px}
.rv-btn{display:inline-flex;align-items:center;justify-content:center;padding:14px 26px;border-radius:999px;background:var(--b-gold,var(--c5,#C9A04E));color:var(--b-dark);font:700 .9rem var(--f-ui);text-decoration:none;white-space:nowrap;transition:transform .3s,box-shadow .3s}
.rv-btn:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(0,0,0,.15)}
.rv-st{display:inline-flex;gap:3px;color:var(--b-gold,var(--c5,#C9A04E))}
.rv-st svg{width:16px;height:16px;fill:currentColor}
[data-rv-in] .rv-in>*{opacity:0;transform:translateY(22px);transition:opacity .8s cubic-bezier(.2,.8,.2,1),transform .8s cubic-bezier(.2,.8,.2,1)}
[data-rv-in].rv-on .rv-in>*{opacity:1;transform:none}
[data-rv-in].rv-on .rv-in>*:nth-child(2){transition-delay:.12s}
@media (prefers-reduced-motion:reduce){[data-rv-in] .rv-in>*{opacity:1;transform:none;transition:none}}
/* 12. Badges : cartes douces */
.rv-bdg-g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}
.rv-bdg-c{background:var(--c4,#f2f5f2);border-radius:22px;padding:28px 24px;display:grid;gap:14px;align-content:start;transition:transform .35s,box-shadow .35s}
.rv-bdg-c:hover{transform:translateY(-4px);box-shadow:0 16px 34px rgba(35,58,46,.12)}
.rv-bdg-c b{font:600 1.4rem/1.15 var(--f-title);color:var(--b-dark)}
.rv-bdg-c p{margin:0;font-size:.92rem;line-height:1.55;opacity:.78}
@container (max-width:900px){.rv-bdg-g{grid-template-columns:repeat(2,minmax(0,1fr))}}
@container (max-width:480px){.rv-bdg-g{grid-template-columns:1fr}.rv-s{padding:52px 16px}}
/* 13. Avis : note en grand, puis rangée de cartes qui défile une par une */
.rv-rev{background:var(--b-dark);color:#fff}
.rv-rev-top{display:flex;flex-wrap:wrap;gap:24px;align-items:center;justify-content:space-between}
.rv-rev-note{display:flex;gap:22px;align-items:center}
.rv-rev-note strong{font:500 clamp(3.4rem,6vw,5rem)/1 var(--f-title);color:var(--b-gold,var(--c5,#C9A04E))}
.rv-rev-note>span{display:grid;gap:8px;min-width:0}
.rv-rev-note .rv-st svg{width:22px;height:22px}
.rv-rev-note small{opacity:.8;font-size:.9rem}
.rv-car{position:relative;--rv-gap:18px}
.rv-vp{overflow:hidden}
.rv-tr{display:flex;gap:var(--rv-gap);transition:transform .7s cubic-bezier(.2,.8,.2,1)}
.rv-tr>*{flex:0 0 calc((100% - var(--rv-gap) * (var(--rv-n) - 1)) / var(--rv-n));min-width:0}
.rv-rc{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:20px;padding:24px;display:grid;gap:14px;align-content:space-between}
.rv-rc p{margin:0;font-size:.95rem;line-height:1.55}
.rv-rc footer{display:flex;gap:12px;align-items:center}
.rv-rc footer span:last-child{display:grid}
.rv-rc small{opacity:.7;font-size:.78rem}
.rv-av{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:var(--b-gold,var(--c5,#C9A04E));color:var(--b-dark);font-weight:700}
.rv-arr{position:absolute;top:50%;transform:translateY(-50%);z-index:2;width:44px;height:44px;border-radius:50%;border:0;background:#fff;color:var(--b-dark);display:grid;place-items:center;cursor:pointer;box-shadow:0 8px 20px rgba(0,0,0,.2)}
.rv-arr svg{width:20px;height:20px}
.rv-arr.l{left:-22px}.rv-arr.r{right:-22px}
@container (max-width:1100px){.rv-car{--rv-n:3!important}}
@container (max-width:760px){.rv-car{--rv-n:2!important;--rv-gap:12px}.rv-arr.l{left:-6px}.rv-arr.r{right:-6px}.rv-rc{padding:18px}}
@container (max-width:480px){.rv-car{--rv-n:1.15!important}}
/* 14. Engagements : une promesse par colonne, avec sa photo */
.rv-eng{background:var(--c4,#f2f5f2)}
.rv-eng-hd{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:40px;align-items:end}
.rv-eng-hd p{margin:0;font-size:1rem;line-height:1.6;opacity:.8}
.rv-eng-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px}
.rv-eng-g article{display:grid;gap:10px;align-content:start}
.rv-eng-ph{position:relative;aspect-ratio:4/5;border-radius:22px;overflow:hidden;margin-bottom:10px}
.rv-eng-ph img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s cubic-bezier(.2,.8,.2,1)}
.rv-eng-g article:hover img{transform:scale(1.05)}
.rv-eng-ph .rv-ic{position:absolute;left:18px;bottom:18px}
.rv-eng-g small{font:700 .78rem var(--f-ui);letter-spacing:.14em;color:var(--b-primary)}
.rv-eng-g b{font:600 1.55rem/1.15 var(--f-title);color:var(--b-dark)}
.rv-eng-g p{margin:0;font-size:.95rem;line-height:1.6;opacity:.8}
@container (max-width:900px){.rv-eng-hd{grid-template-columns:1fr;gap:14px}.rv-eng-g{grid-template-columns:1fr;gap:34px}.rv-eng-ph{aspect-ratio:16/10}}
'''

NEW_JS = r'''
/* Sections refaites (revue du 10 novembre 2026) */
(function(){
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  // Apparition quand la section arrive au centre de l'écran (contrôle général du propriétaire).
  var io=("IntersectionObserver" in window)?new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add("rv-on");io.unobserve(e.target)}})},{rootMargin:"-35% 0px -35% 0px"}):null;
  qa("[data-rv-in]").forEach(function(s){if(io)io.observe(s);else s.classList.add("rv-on")});
  // Rangée qui défile d'une carte à la fois (avis, produits…), en pause au survol, flèches.
  qa("[data-rv-car]").forEach(function(c){
    var tr=c.querySelector(".rv-tr"),i=0,t=null;if(!tr)return;
    function n(){return parseFloat(getComputedStyle(c).getPropertyValue("--rv-n"))||1}
    function go(k){var items=tr.children,max=Math.max(0,items.length-Math.floor(n()));i=k<0?max:(k>max?0:k);var it=items[i];tr.style.transform="translateX("+(-(it?it.offsetLeft:0))+"px)"}
    function auto(){clearInterval(t);t=setInterval(function(){go(i+1)},4500)}
    var p=c.querySelector("[data-rv-prev]"),x=c.querySelector("[data-rv-next]");
    if(p)p.addEventListener("click",function(){go(i-1);auto()});if(x)x.addEventListener("click",function(){go(i+1);auto()});
    c.addEventListener("mouseenter",function(){clearInterval(t)});c.addEventListener("mouseleave",auto);
    addEventListener("resize",function(){go(i)});go(0);auto();
  });
})();
'''
