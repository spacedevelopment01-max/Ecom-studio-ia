"""Bibliothèque de sections des thèmes sur mesure (SINA, étape 6) : transforme le catalogue des sections (la page
« Sections du Studio » montrée au propriétaire) en données que le Studio assemble.

Usage : python3 -I scripts/sections-library.py <catalogue/index.html> <catalogue/photos>

Écrit dans public/sections/ :
  - library.json : une entrée par section (titre, famille, style, rôle, ce qu'elle fait, son HTML) ;
  - library.css, library.js, templates.html : feuille, scripts et gabarits communs à toutes les sections ;
  - photos/ : photos de démonstration utilisées par les sections (créées par IA, jamais montrées comme celles d'un client).
Les cartes d'e-mails ne sont pas des sections de site : elles sont écartées.
"""
import json
import os
import re
import shutil
import sys
import unicodedata

SRC, PHOTOS = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'sections')

# Rôles de la famille Moderne (même découpage que la page du catalogue et que section-families.ts).
MODERNE = {
    'en-tête': ['En-tête à annonces et grand menu', 'En-tête pilule'],
    'ouverture': ['Ouverture « mot géant »', 'Ouverture « drop »', 'Ouverture éditoriale', 'Ouverture en diaporama', 'Ouverture à volets', 'Ouverture mot-fenêtre'],
    'rayons': ['Choisis ton terrain', 'Rayons en liste géante'],
    'looks': ['Tenue à points', 'Compose ta tenue'],
    'produits': ['Les pièces du moment', 'Fraîchement sorti', 'Grille à filtres animés', 'Vestiaire en double défilement'],
    'produit vedette': ['Produit vedette · grand nom', 'Produit vedette · galerie défilante', 'Produit vedette · drop limité'],
    'mise en avant': ["L'édition de saison", 'Carnet de looks', 'Offre en deux tuiles', 'Bandeaux croisés fluo', 'Grille éditoriale', 'Capsule numérotée', 'Manifeste en images', 'Matière à la loupe', 'Tournée des boutiques éphémères', 'Vidéos verticales'],
    'confiance': ['Vus dans la rue', 'Bande fluo des engagements', 'Avis et ajustement', 'Garanties à retourner'],
    'panier': ['Panier tiroir néon', 'Page panier éditoriale', 'Mini-panier qui surgit'],
    'aide': ['Entre deux tailles ?', 'Questions numérotées', 'Aide et suivi de commande'],
    'marque': ['À propos éditorial', 'Journal façon magazine', 'Article du journal'],
    'contact': ['Boutique et contact'],
    'commande': ['Commande en une page', 'Commande confirmée'],
    'compte': ['Connexion au compte'],
    'légal': ['Informations légales'],
    'recherche': ['Recherche plein écran'],
    'inscription': ['Sois là avant les autres', 'Bande code de bienvenue', 'Fenêtre de bienvenue'],
    'pied de page': ['Pied de page en bande', 'Pied de page streetwear', 'Pied de page mot géant'],
    '404': ['Page 404'],
}
ROLE_OF = {t: r for r, ts in MODERNE.items() for t in ts}


def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:60]


def text(h):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', h)).strip()


def frame_inner(a):
    """Contenu du cadre d'une carte (div class="frame"), balises <div> équilibrées."""
    m = re.search(r'<div class="frame[^"]*"[^>]*>', a)
    if not m:
        return None
    depth, i = 1, m.end()
    for t in re.finditer(r'<(/?)div\b[^>]*>', a[m.end():]):
        depth += -1 if t.group(1) else 1
        if depth == 0:
            return a[m.end():m.end() + t.start()].strip()
    return None


# Sections réservées à un genre de produit : SINA ne les pose jamais ailleurs (ex. tailles et tenues pour de la confiture).
ONLY_FOR = {**{t: 'pour-mode' for t in ['Tenue à points', 'Compose ta tenue', 'Carnet de looks', 'Entre deux tailles ?', 'Vus dans la rue']},
            **{t: 'pour-the' for t in ["Guide d'infusion en tiroir", 'Profil du mélange', 'Produit vedette · calculateur de tasses']}}
CLASSIC_ROLE = {'Commande pas à pas': 'commande', 'Merci pour ta commande': 'commande', 'Connexion et création de compte': 'compte',
                'Suivi de commande et aide': 'aide', 'Mentions et conditions': 'légal', 'Le journal (liste des articles)': 'journal',
                'Article avec barre de lecture': 'journal', "L'atelier et la personne derrière": 'à propos', 'Histoire en frise': 'à propos',
                'Catalogue avec filtres et tri': 'produits', 'Fiche produit à onglets': 'produit', 'Page introuvable (404)': '404',
                'Menu plein écran': 'navigation', 'Recherche guidée': 'recherche', 'Mini-panier déroulant': 'panier',
                'Photo à points cliquables': 'mise en avant', 'Scène achetable': 'mise en avant', 'Grille bento': 'mise en avant',
                'Comparateur de produits': 'comparatif', 'Choisir selon le moment': "guide d'achat", 'Mosaïque de collections': 'rayons'}


def classic_role(kind, title):
    if title in CLASSIC_ROLE:
        return CLASSIC_ROLE[title]
    k = (kind + ' ' + title).lower()
    for role, words in [('en-tête', ['en-tête', 'menu', 'barre d\'annonce']), ('pied de page', ['pied de page']), ('404', ['404']),
                        ('produit vedette', ['produit vedette']), ('panier', ['panier']), ('ouverture', ['ouverture', 'hero']),
                        ('recherche', ['recherche']), ('inscription', ['newsletter', 'inscription', 'bienvenue']),
                        ('aide', ['questions', 'faq', 'aide']), ('contact', ['contact']), ('confiance', ['avis', 'garantie', 'confiance', 'engagement']),
                        ('produits', ['collection', 'produits', 'grille', 'cartes produit'])]:
        if any(w in k for w in words):
            return role
    return kind.split('·')[0].strip().lower() or 'contenu'


src = open(SRC, encoding='utf-8').read()
# Une carte va de son début au début de la suivante (les sections contiennent elles-mêmes des <article>).
starts = [m.start() for m in re.finditer(r'<article class="card', src)] + [len(src)]
arts = [src[starts[i]:starts[i + 1]] for i in range(len(starts) - 1)]
sections, seen = [], set()
for a in arts:
    tags = re.search(r'data-k="([^"]*)"', a).group(1).split()
    if 'mail' in tags:
        continue
    h2 = re.search(r'<h2>(.*?)</h2>', a, re.S).group(1)
    title = re.sub(r'<span[^>]*>.*?</span>', '', h2).strip()
    kind = text(re.search(r'<span class="kind">(.*?)</span>', a, re.S).group(1))
    kind = re.sub(r'^(Sport chic|Streetwear néon)\s+', '', kind)
    dd = re.findall(r'<dd>(.*?)</dd>', a, re.S)
    m = re.compile(r'<(section|footer) ').search(a)
    if m:
        tag = m.group(1)
        end = a.index('</' + tag + '>', m.start()) + len(tag) + 3
        html = a[m.start():end]
    else:
        # Bloc plus ancien (sans balise de section) : le contenu de son cadre, posé dans une section.
        inner = frame_inner(a)
        if inner is None:
            continue
        html = '<section class="ctw-blk">' + inner + '</section>'
    moderne = 'aud' in tags
    sid = slug(title)
    while sid in seen:
        sid += '-2'
    seen.add(sid)
    sections.append({
        'id': sid, 'title': title, 'kind': kind,
        'does': text(dd[0]) if dd else '', 'anim': text(dd[1]) if len(dd) > 1 else '',
        'family': 'moderne' if moderne else 'classique',
        'style': ('sport-chic' if 'aud1' in tags else 'streetwear-neon') if moderne else None,
        'role': ROLE_OF.get(title) if moderne else classic_role(kind, title),
        'tags': [t for t in tags if t not in ('new', 'aud', 'aud1', 'aud2', 'classique')] + ([ONLY_FOR[title]] if title in ONLY_FOR else []),
        # Démonstration dans une fausse fenêtre qui défile (catalogue seulement) : jamais posée telle quelle dans un thème.
        'demoFrame': 'data-vp' in html[:400],
        'html': html,
    })
BAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>'
SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>'
NAV = ['Boutique', 'Le journal', 'Notre histoire', 'Contact']
sections.append({
    'id': 'en-tete-classique', 'title': 'En-tête classique', 'kind': 'Navigation · toutes les pages',
    'does': "Bandeau d'annonce, logo, menu, recherche et panier ; sur téléphone, le menu s'ouvre en panneau plein écran numéroté.",
    'anim': 'Les liens se soulignent au survol ; les liens du menu téléphone arrivent un à un.',
    'family': 'classique', 'style': None, 'role': 'en-tête', 'tags': ['nav'], 'demoFrame': False,
    'html': ('<section class="bhs"><div class="xb s2" data-xb><span class="m">Livraison offerte dès 35 € · expédition sous 48 h</span>'
             '<button class="x" type="button" aria-label="Fermer le bandeau">×</button></div>'
             '<header class="bh"><button class="bh-bg" type="button" data-bdo aria-label="Ouvrir le menu"><i></i><i></i><i></i></button>'
             '<a class="bh-lg" href="#">Brindi<span hidden>Accueil</span></a><nav class="bh-nv">' + ''.join(f'<a href="#">{x}</a>' for x in NAV) + '</nav>'
             f'<div class="bh-ic"><button type="button" aria-label="Rechercher">{SEARCH}</button><a class="bh-ca" href="#" aria-label="Panier">{BAG}<span hidden>Panier</span></a></div></header>'
             '<div class="bd" data-bd><div class="bd-in"><div class="bd-top"><span class="bd-lg">Brindi</span><button class="bd-x" type="button" data-bdx aria-label="Fermer le menu">×</button></div>'
             '<nav class="bd-nv">' + ''.join(f'<a href="#"><small>0{i + 1}</small>{x}</a>' for i, x in enumerate(['Accueil'] + NAV)) + '</nav>'
             '<div class="bd-ft"><b>Livraison offerte dès 35 €</b><span>Expédition sous 48 h</span></div></div></div></section>'),
})
EXTRA_CSS = '''
/* ===== En-tête classique (thèmes sur mesure, famille Classique) ===== */
.bhs{display:contents}
.xb.s2{border-radius:0}
.bh{position:sticky;top:46px;z-index:50;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:20px;padding:14px 28px;background:rgba(255,255,255,.92);backdrop-filter:blur(12px);border-bottom:1px solid rgba(0,0,0,.06)}
.bh-lg{font:600 1.8rem var(--f-title);color:var(--b-dark);text-decoration:none}
.bh-nv{display:flex;gap:22px;justify-content:center;font:600 .9rem var(--f-ui)}
.bh-nv a{color:var(--b-dark);text-decoration:none;position:relative}
.bh-nv a::after{content:"";position:absolute;left:0;right:0;bottom:-4px;height:2px;background:var(--b-gold);transform:scaleX(0);transition:transform .3s}
.bh-nv a:hover::after{transform:none}
.bh-ic{display:flex;gap:6px}
.bh-ic button,.bh-ic a{position:relative;width:40px;height:40px;border:0;background:none;border-radius:50%;cursor:pointer;color:var(--b-dark);display:grid;place-items:center}
.bh-ic svg{width:22px;height:22px}
.bh-bg{display:none;width:40px;height:40px;border:0;background:none;cursor:pointer;flex-direction:column;justify-content:center;gap:5px;padding:0 9px}
.bh-bg i{display:block;height:2px;border-radius:2px;background:var(--b-dark);transition:width .3s}
.bh-bg i:nth-child(2){width:70%}.bh-bg:hover i:nth-child(2){width:100%}
.bd{position:fixed;inset:0;z-index:300;background:rgba(20,34,27,.45);opacity:0;pointer-events:none;transition:opacity .4s}
.bd.on{opacity:1;pointer-events:auto}
.tb-wrap.phone .bd{left:50%;right:auto;width:390px;transform:translateX(-50%)}
.bd-in{position:absolute;left:0;top:0;bottom:0;width:min(360px,88%);background:var(--b-dark);color:#fff;transform:translateX(-102%);transition:transform .55s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column;padding:20px 24px;gap:26px}
.bd.on .bd-in{transform:none}
.bd-top{display:flex;justify-content:space-between;align-items:center}
.bd-lg{font:600 1.8rem var(--f-title)}
.bd-x{width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:none;color:#fff;font-size:1.3rem;cursor:pointer}
.bd-nv{display:grid;gap:6px}
.bd-nv a{display:flex;align-items:baseline;gap:12px;color:#fff;text-decoration:none;font:500 1.9rem/1.25 var(--f-title);opacity:0;transform:translateX(-24px);transition:opacity .45s,transform .45s,color .3s}
.bd.on .bd-nv a{opacity:1;transform:none}
.bd-nv a small{font:700 .7rem var(--f-ui);color:var(--b-gold)}
.bd-nv a:hover{color:var(--b-gold);font-style:italic}
.bd-ft{margin-top:auto;display:grid;gap:4px;font-size:.84rem;opacity:.85;border-top:1px solid rgba(255,255,255,.15);padding-top:16px}
.bd-ft b{color:var(--b-gold)}
@container (max-width:760px){.bh{padding:12px 16px;grid-template-columns:auto 1fr auto}.bh-nv{display:none}.bh-lg{font-size:1.5rem}.bh-bg{display:flex}}
'''
EXTRA_JS = '''
/* En-tête classique : menu téléphone */
(function(){document.addEventListener("click",function(e){var bd=document.querySelector("[data-bd]");if(!bd)return;
  if(e.target.closest("[data-bdo]"))bd.classList.add("on");else if(e.target.closest("[data-bdx]")||e.target===bd||e.target.closest(".bd-nv a"))bd.classList.remove("on")});
  document.querySelectorAll(".bd-nv a").forEach(function(x,i){x.style.transitionDelay=(.15+i*.06)+"s"});
  document.addEventListener("keydown",function(e){var bd=document.querySelector("[data-bd]");if(bd&&e.key==="Escape")bd.classList.remove("on")})})();
'''

missing = [t for t in ROLE_OF if t not in {s['title'] for s in sections}]
assert not missing, missing

os.makedirs(os.path.join(OUT, 'photos'), exist_ok=True)
head = src[:src.index('</style>')]
css = '\n'.join(re.findall(r'<style[^>]*>(.*?)(?:</style>|$)', head + '</style>', re.S))
scripts = [x for x in re.findall(r'<script>(.*?)</script>', src, re.S)]
templates = re.findall(r'<template id="tpl-[^"]+">.*?</template>', src, re.S)
# Mouvement réduit (réglage du visiteur) : les animations finissent tout de suite au lieu d'être coupées ; coupées, les textes
# qui apparaissent en fondu (titre de l'ouverture…) restaient invisibles (vu sur les captures du 10 novembre 2026).
css = css.replace('@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}', '@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-delay:0s!important;animation-iteration-count:1!important;transition-duration:.01ms!important;transition-delay:0s!important}')
fonts = re.findall(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com/[^"]+)"', src)
P2_CSS = '\n/* Histoire du produit au défilement, téléphone : la page défile (plus de boîte qui défile seule), étapes lisibles */\n@container (max-width:560px){.ts.p2{overflow:clip}.p2-vp{height:auto;overflow:visible}.p2-st{position:sticky;top:var(--p2-top,0px);height:auto;padding:22px 0 18px;z-index:2;background:var(--c1)}.p2-im{width:min(190px,52vw)}.p2-ring{width:min(226px,62vw)}.p2-sp{min-height:50vh;align-content:start;padding-top:24px}.p2-sp:last-child{min-height:40vh;padding-bottom:40px}.p2-sp:not(.on){opacity:.35}.p2-hint{display:none}}\n'
P2_CSS += '/* En-tête classique, téléphone : logo au centre, menu à gauche, recherche et panier à droite (retour du propriétaire du 9 novembre 2026) */\n@container (max-width:760px){.bh{grid-template-columns:1fr auto 1fr}.bh-bg{justify-self:start}.bh-lg{justify-self:center;text-align:center}.bh-ic{justify-self:end}}\n'
open(os.path.join(OUT, 'library.css'), 'w', encoding='utf-8').write(css + EXTRA_CSS + P2_CSS)
# Délai de livraison du bloc d'achat : le VRAI délai du client (drapeau poShip posé par le Studio, « min-max-heure »),
# jamais « 2 à 3 jours ouvrés » ni une heure limite inventée ; la mention « délai d'exemple » ne reste qu'en démonstration.
SHIP_FIX = [('var SHIP={min:2,max:3,cut:14};', 'var SHIP=(function(d){var m=/^(\\d+)-(\\d+)-(\\d*)$/.exec(d.poShip||"");return m?{min:+m[1],max:+m[2],cut:m[3]===""?null:+m[3],real:1}:{min:2,max:3,cut:14}})(document.documentElement.dataset);'), ('function shipLine(){var n=new Date(),late=n.getHours()>=SHIP.cut||n.getDay()===0||n.getDay()===6,start=new Date(n);if(late){start=addBiz(n,1)}', 'function shipLine(){var n=new Date(),late=(SHIP.cut!=null&&n.getHours()>=SHIP.cut)||n.getDay()===0||n.getDay()===6,start=new Date(n);if(late){start=addBiz(n,1)}'), ('var a=addBiz(start,SHIP.min),b=addBiz(start,SHIP.max),cut=new Date(n);cut.setHours(SHIP.cut,0,0,0);var left=cut-n,lead;\n    if(!late&&left>0){', 'var a=addBiz(start,SHIP.min),b=addBiz(start,SHIP.max),cut=new Date(n);cut.setHours(SHIP.cut==null?0:SHIP.cut,0,0,0);var left=cut-n,lead;\n    if(SHIP.cut!=null&&!late&&left>0){'), ('return lead+"entre le <b>"+fmtD(a)+"</b> et le <b>"+fmtD(b)+"</b><br><small>délai d\'exemple : 2 à 3 jours ouvrés</small>"}', 'return lead+(+a===+b?"le <b>"+fmtD(a)+"</b>":"entre le <b>"+fmtD(a)+"</b> et le <b>"+fmtD(b)+"</b>")+(SHIP.real?"":"<br><small>délai d\'exemple : 2 à 3 jours ouvrés</small>")}')]
# Histoire du produit au défilement : sur téléphone, la page défile (retour du propriétaire du 9 novembre 2026).
SHIP_FIX += [('    function u(){var mid=vp.scrollTop+vp.clientHeight/2,k=0;sp.forEach(function(e,i){if(e.offsetTop<=mid)k=i});sp.forEach(function(e,i){e.classList.toggle("on",i===k)});im.forEach(function(e,i){e.classList.toggle("on",i===k)});\n      var r=vp.scrollTop/(vp.scrollHeight-vp.clientHeight||1);q("[data-p2i]",s).style.transform="rotate("+(r*40)+"deg) scale("+(1+r*.06)+")";ring.style.transform="rotate("+(-r*120)+"deg)"}\n    vp.addEventListener("scroll",u,{passive:true});u()});', '    // Téléphone (retour du propriétaire du 9 novembre 2026 : « l\'animation arrive beaucoup trop vite ») : plus de boîte qui\n    // défile toute seule, c\'est la page qui défile ; le rond photo reste sous l\'en-tête et chaque étape a le temps d\'être lue.\n    function inner(){return vp.scrollHeight>vp.clientHeight+4}\n    function u(){var k=0,r;if(inner()){var mid=vp.scrollTop+vp.clientHeight/2;sp.forEach(function(e,i){if(e.offsetTop<=mid)k=i});r=vp.scrollTop/(vp.scrollHeight-vp.clientHeight||1)}\n      else{var pb=q(".p2-st",s).getBoundingClientRect().bottom,line=pb+(innerHeight-pb)*.4;sp.forEach(function(e,i){if(e.getBoundingClientRect().top<=line)k=i});var b=s.getBoundingClientRect();r=Math.min(1,Math.max(0,-b.top/((b.height-innerHeight)||1)))}\n      sp.forEach(function(e,i){e.classList.toggle("on",i===k)});im.forEach(function(e,i){e.classList.toggle("on",i===k)});\n      q("[data-p2i]",s).style.transform="rotate("+(r*40)+"deg) scale("+(1+r*.06)+")";ring.style.transform="rotate("+(-r*120)+"deg)"}\n    // le rond photo reste juste sous les barres collées en haut (barre du Studio, en-tête du site s\'il reste visible)\n    function top(){var t=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tb-h"))||0,hd=document.querySelector(\'[data-ct-role="header"]\');\n      if(hd){var st=[hd].concat([].slice.call(hd.querySelectorAll("*"))).filter(function(e){var p=getComputedStyle(e).position;return p==="sticky"||p==="fixed"})[0];if(st)t+=st.getBoundingClientRect().height}\n      s.style.setProperty("--p2-top",t+"px")}\n    vp.addEventListener("scroll",u,{passive:true});addEventListener("scroll",u,{passive:true});addEventListener("resize",function(){top();u()});top();u()});')]
js = '\n;\n'.join(scripts)
for a, b in SHIP_FIX:
    assert js.count(a) == 1, a[:70]
    js = js.replace(a, b)
# Bloc d'achat : les vraies valeurs du client posées par le Studio (scripts/section_buy_fix.py).
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from section_buy_fix import apply as buy_fix
js = buy_fix(js)
open(os.path.join(OUT, 'library.js'), 'w', encoding='utf-8').write(js + '\n;' + EXTRA_JS)
open(os.path.join(OUT, 'templates.html'), 'w', encoding='utf-8').write('\n'.join(templates))
json.dump({'version': 1, 'fonts': fonts, 'sections': sections}, open(os.path.join(OUT, 'library.json'), 'w', encoding='utf-8'), ensure_ascii=False)
# Fond inversé des sections (clair ↔ sombre) : règles .ct-inv ajoutées à library.css ; puis, pour mettre à jour les
# sections inversables : node scripts/section-traits.cjs && node scripts/section-invert-check.cjs
import subprocess
subprocess.run(['node', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'section-invert.cjs')], check=True)

# Photos utilisées (citées dans le HTML, les scripts ou la feuille), avec ou sans le dossier.
have = set(os.listdir(PHOTOS))
blob = src
used = sorted({f for f in re.findall(r'([\w-]+\.(?:webp|png|jpg))', blob) if f in have})
for f in os.listdir(os.path.join(OUT, 'photos')):
    if f not in used:
        os.remove(os.path.join(OUT, 'photos', f))
for f in used:
    shutil.copy2(os.path.join(PHOTOS, f), os.path.join(OUT, 'photos', f))
fam = {k: sum(1 for s in sections if s['family'] == k) for k in ('classique', 'moderne')}
print(len(sections), 'sections', fam, len(used), 'photos', len(css) // 1024, 'Ko de feuille', sum(len(s) for s in scripts) // 1024, 'Ko de scripts')
