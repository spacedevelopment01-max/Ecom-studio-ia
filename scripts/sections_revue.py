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
]

JS_FIX = [
    # 11. Ils parlent de nous sans citation : le script des citations ne tourne que si elles existent.
    ('$$("[data-press]").forEach(function(p){var f=$(".pqf",p),',
     '$$("[data-press]").forEach(function(p){if(!$(".pqf",p))return;var f=$(".pqf",p),'),
]

BEGIN, END = '/* ===== revue du propriétaire (10 novembre 2026) ===== */', '/* ===== fin de la revue ===== */'
REVUE_CSS = BEGIN + '''
/* Contrôle général : de l'air autour des sections qui n'en avaient pas (rien ne touche le bord ni la section voisine). */
.ctw-blk:has(>.bento),.ctw-blk:has(>.ba),.ctw-blk.ba-sec,.ctw-blk:has(>.w){padding:72px max(24px,5vw)}
@container (max-width:760px){.ctw-blk:has(>.bento),.ctw-blk:has(>.ba),.ctw-blk.ba-sec,.ctw-blk:has(>.w){padding:44px 16px}}
.cat{padding:48px max(24px,5vw)!important}
@container (max-width:760px){.cat{padding:32px 16px!important}}
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
    js = js.rstrip('\n') + '\n;' + JS_BEGIN + NEW_JS + JS_END + '\n'
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
