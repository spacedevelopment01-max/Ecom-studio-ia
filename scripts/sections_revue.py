"""
Corrections de la banque de sections demandées par le propriétaire (revue du 10 novembre 2026, docs/revue-banque-sections.md).

Trois sortes de corrections, toutes rejouables sans effet de bord :
  - HTML_FIX : (section, ancien, nouveau) dans public/sections/library.json ;
  - REVUE_CSS : feuille ajoutée en fin de public/sections/library.css, entre deux repères (remplacée à chaque passage) ;
  - JS_FIX : (ancien, nouveau) dans public/sections/library.js.

Utilisé par scripts/sections-library.py ; lancé seul, applique les corrections aux fichiers déjà préparés.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sections_neuves import NEW_CSS, NEW_JS, SECTIONS as NEW_SECTIONS  # noqa: E402

HTML_FIX = [
    # 8. Histoire du produit au défilement : le bouton sur sa propre ligne, sous le texte ; un vrai paragraphe par étape.
    ('histoire-du-produit-au-defilement',
     '<p>Un thé vert aux feuilles fines, choisi pour sa douceur.</p>',
     '<p>Un thé vert aux feuilles fines, choisi pour sa douceur. Cueilli au printemps, il garde une note fraîche et ronde, sans amertume, même quand l\'infusion dure un peu.</p>'),
    ('histoire-du-produit-au-defilement',
     '<p>Des fleurs de jasmin, sans arôme ajouté : le parfum vient d\'elles.</p>',
     '<p>Des fleurs de jasmin, sans arôme ajouté : le parfum vient d\'elles. Elles s\'ouvrent dans l\'eau chaude et donnent à la tasse sa note florale, douce et longue.</p>'),
    ('histoire-du-produit-au-defilement',
     '<p>Une cuillère dans le filtre, et l\'infusion devient ta pause. <a class="tbtn al" href="#" onclick="return false" style="margin-top:14px">Découvrir le thé vert jasmin</a></p>',
     '<p>Une cuillère dans le filtre, et l\'infusion devient ta pause. Quelques minutes pour toi, entre deux rendez-vous, le temps que les feuilles se déplient.</p><a class="tbtn al p2-cta" href="#" onclick="return false">Découvrir le thé vert jasmin</a>'),
    # 11. Ils parlent de nous : seulement la bande de logos (ni citation, ni nom du média, ni pagination).
    ('ils-parlent-de-nous',
     '<div class="pqw"><figure class="pqf"><blockquote data-pq>[Citation réelle du média n° 1]</blockquote><figcaption data-pqs>[Nom du média 1]</figcaption></figure></div><div class="pqdots" data-pqdots></div>',
     ''),
    # 18. Avant / après : un titre au-dessus, la comparaison dans un cadre centré, les mots « Avant » et « Après ».
    ('avant-apres',
     '<section class="ctw-blk"><div class="ba" data-ba>',
     '<section class="ctw-blk ba-sec"><div class="ba-hd"><span class="eb">Avant · après</span><h3 class="ti">Regarde les feuilles <em>s\'ouvrir</em>.</h3><p>Fais glisser la poignée : à gauche les feuilles sèches, à droite les mêmes après quelques minutes dans l\'eau chaude.</p></div><div class="ba" data-ba>'),
    ('avant-apres',
     '<span class="lb l">Feuilles sèches</span><span class="lb r">Dans l\'eau chaude</span>',
     '<span class="lb l"><b>Avant</b> Feuilles sèches</span><span class="lb r"><b>Après</b> Dans l\'eau chaude</span>'),
    # 22 et contrôle général : page panier complète sans prénom d'exemple ni moyens de paiement non confirmés.
    ('page-panier-complete', 'placeholder="Une précision pour Camille ?"', 'placeholder="Une précision pour la commande ?"'),
    ('page-panier-complete', '<div class="pa2-py"><span>Carte bancaire</span><span>PayPal</span><span>Apple Pay</span></div>', ''),
    # Ouverture en écran partagé (retour du propriétaire du 11 novembre 2026 : « il faut améliorer ce hero ») : l'arche et
    # son encart dans un même cadre, pour poser l'encart au pied de l'arche.
    ('ouverture-en-ecran-partage', '<div class="pic"><div class="arch">', '<div class="pic"><div class="hs-fr"><div class="arch">'),
    ('ouverture-en-ecran-partage', 'des ingrédients bio</div></div></section>', 'des ingrédients bio</div></div></div></section>'),
    # Ouverture produit mis en scène (retour du 11 novembre 2026 : « ça peut pas être Ajouter au panier ici, c'est un CTA
    # émotionnel ») : le bouton donne envie et mène à la fiche du produit.
    ('ouverture-produit-mis-en-scene', '>Ajouter au panier</a>', ">M'offrir cette pause</a>"),
]

# Ce que fait la section (lu par SINA pour la choisir et l'écrire).
DOES_FIX = {
    'barre-de-livraison-offerte': "Seulement dans le panier : « Plus que 4,20 € pour la livraison offerte », le client voit ce qui lui manque.",
    'ouverture-produit-mis-en-scene': "Pour une marque qui a un produit phare : le produit au centre, son nom, son prix et un bouton qui donne envie (jamais « Ajouter au panier » : il mène à la fiche du produit), avec des photos de ses ingrédients qui flottent autour.",
}

JS_FIX = [
    # Produit vedette (11 novembre 2026 : « il y a 1000 images, c'est débile ») : une photo n'apparaît qu'une fois (les
    # emplacements remplis par la même photo de sachet sont retirés) et la section ne se prépare qu'une fois.
    ('qa("[data-xp]").forEach(function(p){\n    var main=q("[data-xmain]",p),imgs=qa("img",main),th=',
     'qa("[data-xp]").forEach(function(p){if(p.__xp)return;p.__xp=1;\n    var main=q("[data-xmain]",p),imgs=(function(){var seen={};return qa("img",main).filter(function(im){var s=im.getAttribute("src");if(seen[s]){im.remove();return false}seen[s]=1;return true})})(),th='),
    # Photo à points cliquables (contrôle de l'atelier du 11 novembre 2026) : plus de deux points ne fait plus planter
    # la section ; la bulle reprend le nom et le prix de la liste de la section (ceux du client), l'exemple sinon.
    ('d.classList.add("on");li[i].classList.add("on");q("img",pop).src="photos/"+D[i][0];q("b",pop).textContent=D[i][1];q("small",pop).textContent=D[i][2];',
     'd.classList.add("on");if(li[i])li[i].classList.add("on");var it=li[i],nb=it&&q("b",it),ns=it&&q("small",it),dd=D[i]||[],im=q("img",pop),src=d.dataset.img||(dd[0]?"photos/"+dd[0]:"");im.hidden=!src;if(src)im.src=src;q("b",pop).textContent=nb?nb.textContent:(dd[1]||"");q("small",pop).textContent=ns?ns.textContent:(dd[2]||"");'),
    # 11. Ils parlent de nous sans citation : le script des citations ne tourne que si elles existent.
    ('$$("[data-press]").forEach(function(p){var f=$(".pqf",p),',
     '$$("[data-press]").forEach(function(p){if(!$(".pqf",p))return;var f=$(".pqf",p),'),
]

BEGIN, END = '/* ===== revue du propriétaire (10 novembre 2026) ===== */', '/* ===== fin de la revue ===== */'
REVUE_CSS = BEGIN + '''
/* Contrôle général : de l'air autour des sections qui n'en avaient pas (rien ne touche le bord ni la section voisine). */
.ctw-blk:has(>.bento),.ctw-blk:has(>.ba),.ctw-blk.ba-sec,.ctw-blk:has(>.w),.ctw-blk:has(>[data-gallery2]){padding:72px max(24px,5vw)}
@container (max-width:760px){.ctw-blk:has(>.bento),.ctw-blk:has(>.ba),.ctw-blk.ba-sec,.ctw-blk:has(>.w),.ctw-blk:has(>[data-gallery2]){padding:44px 16px}}
.cat{padding:48px max(24px,5vw)!important}
@container (max-width:760px){.cat{padding:32px 16px!important}}
/* Couleurs : les sections suivent toujours les couleurs de la marque, jamais le mode sombre du téléphone (champs gris
   foncé au texte invisible vus par le propriétaire le 10 novembre 2026, banque et vrais sites). */
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#f4f6f2;--surface:#ffffff;--ink:#1d2a23;--muted:#5b6b62;--line:#dbe3dc;--chip:#e6eee6;--accent:#2f6b4a;color-scheme:light}}
:root[data-theme="dark"]{--bg:#f4f6f2;--surface:#ffffff;--ink:#1d2a23;--muted:#5b6b62;--line:#dbe3dc;--chip:#e6eee6;--accent:#2f6b4a;color-scheme:light}
section textarea,section input:not([type=checkbox]):not([type=radio]):not([type=range]),section select{color-scheme:light;background-color:#fff;color:#1d2a23}
/* Indication « Fais défiler dans le cadre » : sous le cadre, jamais par-dessus le contenu. */
.nx-hint{position:static;display:block;width:max-content;max-width:calc(100% - 32px);margin:12px auto;animation:none;background:var(--c4,#f2f5f2)}
/* 1. En-tête flottant en pilule : le menu ne passe jamais sur deux lignes ; la pilule rétrécit moins. */
.h5 nav a,.h5 nav .lnk{white-space:nowrap}
.h5w.small .h5{max-width:820px}
@container (max-width:980px){.h5 nav{gap:16px}.h5 nav a,.h5 nav .lnk{font-size:.9rem}}
/* 8. Histoire du produit au défilement : bouton sous le texte, avec de l'air. */
.p2 .p2-cta{display:inline-flex;margin-top:22px}
/* 18. Avant / après : titre, cadre arrondi centré, fond de la section visible autour. */
.ba-sec{display:grid;gap:28px;justify-items:center}
.ba-sec .ba-hd{text-align:center;max-width:620px;display:grid;gap:10px}
.ba-sec .ba-hd .ti{margin:0;font:500 clamp(1.8rem,3.4vw,2.6rem)/1.1 var(--f-title);color:var(--b-dark)}
.ba-sec .ba-hd p{margin:0;color:var(--b-ink);opacity:.8}
.ba-sec .ba{width:min(100%,980px);aspect-ratio:16/9;border-radius:22px;box-shadow:0 22px 50px rgba(23,38,30,.18);border:6px solid #fff}
@container (max-width:760px){.ba-sec .ba{aspect-ratio:4/5;border-radius:16px;border-width:4px}}
.ba .lb b{display:block;font-size:.62rem;letter-spacing:.14em;opacity:.8}
/* Produit vedette (11 novembre 2026 : « il y a 1000 images, c'est débile ») : la colonne des miniatures ne dépasse
   jamais la grande photo ; les miniatures en plus défilent dans la colonne, avec un fondu en bas. */
@container (min-width:561px){
.xp .gal{align-items:start}
.xp .th{height:0;min-height:100%;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none;-webkit-mask-image:linear-gradient(#000 82%,transparent);mask-image:linear-gradient(#000 82%,transparent)}
.xp .th::-webkit-scrollbar{display:none}
.xp .th button{flex:0 0 auto}
.xp .th>.ar{display:none}
}
/* Ouverture en écran partagé (11 novembre 2026, « pas beau ») : un seul fond aux couleurs de la marque, la photo en
   grande arche cadrée d'un fil doré, l'encart au pied de l'arche (jamais sous un en-tête flottant), plus de rond vide. */
.hs{min-height:clamp(560px,78vh,760px);border-radius:0;background:var(--b-dark);position:relative;isolation:isolate}
.hs::before{content:"";position:absolute;inset:0 0 0 50%;z-index:-1;background:radial-gradient(70% 60% at 55% 72%,color-mix(in srgb,var(--b-primary) 70%,transparent),transparent 75%)}
.hs .txt{padding:112px clamp(28px,6cqi,88px) 88px;gap:22px}
.hs .txt::after{display:none}
.hs h3{font-size:clamp(2.6rem,6cqi,4.8rem);line-height:1}
.hs .pic{background:none;padding:112px 40px 0;align-items:flex-end}
.hs-fr{position:relative;width:min(440px,84%)}
.hs-fr .arch{width:100%}
.hs-fr::before{content:"";position:absolute;inset:-16px -16px 0;border:1px solid color-mix(in srgb,var(--b-gold,#C9A04E) 60%,transparent);border-bottom:0;border-radius:999px 999px 0 0;pointer-events:none}
.hs-fr .badge{left:auto;right:calc(100% - 34px);top:auto;bottom:56px;white-space:nowrap}
@container (max-width:560px){.hs{min-height:0}.hs::before{inset:45% 0 0 0}.hs .txt{padding:96px 20px 28px}.hs .pic{padding:24px 20px 0}.hs-fr{width:80%}.hs-fr .badge{right:auto;left:-14px;bottom:28px}}
''' + NEW_CSS + END
JS_BEGIN, JS_END = '/* ===== sections refaites (revue du 10 novembre 2026) ===== */', '/* ===== fin des sections refaites ===== */'


def apply_sections(sections):
    # Sections refaites (même identifiant : le HTML est remplacé) ou ajoutées (scripts/sections_neuves.py).
    by_id = {s['id']: s for s in sections}
    for n in NEW_SECTIONS:
        if n['id'] in by_id:
            by_id[n['id']].update({k: v for k, v in n.items() if k != 'id'})
        else:
            sections.append(dict(n))
    by = {s['id']: s for s in sections}
    for sid, does in DOES_FIX.items():
        if sid in by:
            by[sid]['does'] = does
    for sid, a, b in HTML_FIX:
        s = by.get(sid)
        if not s or (a not in s['html'] and (not b or b in s['html'])):
            continue
        assert s['html'].count(a) == 1, (sid, a[:60])
        s['html'] = s['html'].replace(a, b)
    return sections


def apply_js(js):
    if JS_BEGIN in js:
        js = js[:js.index(JS_BEGIN)] + js[js.index(JS_END) + len(JS_END):]
    js = js.rstrip('\n;') + '\n;' + JS_BEGIN + NEW_JS + JS_END + '\n'  # sans empiler un « ; » à chaque passage
    for a, b in JS_FIX:
        if b in js:
            continue
        assert js.count(a) == 1, a[:60]
        js = js.replace(a, b)
    return js


def apply_css(css):
    if BEGIN in css:
        css = css[:css.index(BEGIN)] + css[css.index(END) + len(END):]
    return css.rstrip('\n') + '\n' + REVUE_CSS + '\n'


if __name__ == '__main__':
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'sections')
    lib = json.load(open(os.path.join(out, 'library.json'), encoding='utf-8'))
    apply_sections(lib['sections'])
    json.dump(lib, open(os.path.join(out, 'library.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    for name, fix in (('library.js', apply_js), ('library.css', apply_css)):
        p = os.path.join(out, name)
        text = fix(open(p, encoding='utf-8').read())  # lu entièrement AVANT de réécrire le fichier
        open(p, 'w', encoding='utf-8').write(text)
    print('banque : corrections de la revue appliquées')
