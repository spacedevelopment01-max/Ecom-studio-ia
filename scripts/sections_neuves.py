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


# ----- Famille Questions (points 33 et 41 de la revue) -----
I_CHAT = ico('<path d="M20 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.6A7.5 7.5 0 1 1 20 12z"/>')
I_MAIL = ico('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M4 7l8 6 8-6"/>')
I_BOX = ico('<path d="M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5z"/><path d="M3.5 7.5L12 12l8.5-4.5M12 12v9"/>')
I_SEARCH = ico('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>', 1.8)
I_ARROW = ico('<path d="M5 12h14M13 6l6 6-6 6"/>', 1.8)

# Réponses d'exemple : seuls des repères ; chaque fait (délai, prix, label, paiement) vient du client ou reste entre crochets.
FAQ = {
    'livraison': [
        ('En combien de temps ma commande arrive-t-elle ?', 'Elle part sous [délai de préparation] et arrive en [délai de livraison]. Tu reçois un numéro de suivi par e-mail dès son départ.'),
        ('La livraison est-elle offerte ?', 'Elle est offerte dès [montant] d\'achat. En dessous, elle coûte [prix de la livraison], affiché avant le paiement.'),
        ('Puis-je modifier ma commande ?', 'Tant qu\'elle n\'est pas préparée, oui : écris-nous vite avec ton numéro de commande et on s\'en occupe.'),
    ],
    'retours': [
        ('Puis-je retourner un sachet ?', 'Un sachet fermé se retourne sous [délai de retour]. Écris-nous, on t\'explique la marche à suivre.'),
        ('Mon colis est arrivé abîmé, que faire ?', 'Envoie-nous une photo du colis et de son contenu : on te propose une solution rapidement.'),
    ],
    'thes': [
        ('D\'où viennent les ingrédients ?', 'Chaque fiche indique l\'origine des ingrédients et leurs labels : [à compléter avec les informations réelles de la marque].'),
        ('Combien de tasses dans un sachet ?', 'Un sachet de [poids] donne environ [nombre] tasses, à raison d\'une cuillère par tasse.'),
        ('Comment conserver mon thé ?', 'Dans son sachet bien refermé, à l\'abri de la lumière, de la chaleur et des odeurs fortes.'),
    ],
    'preparation': [
        ('Quelle température pour l\'infusion ?', 'Chaque mélange a ses repères sur sa fiche : température de l\'eau, quantité et temps d\'infusion.'),
        ('Puis-je l\'infuser deux fois ?', '[À compléter : la réponse de la marque, mélange par mélange.]'),
    ],
}
ALL_QA = FAQ['livraison'] + FAQ['thes'] + FAQ['retours'] + FAQ['preparation']


def qa(q, a, k=None):
    data = f' data-k="{k}"' if k else ''
    return (f'<details class="rv-q"{data}><summary><span class="rv-pl" aria-hidden="true"></span><span>{q}</span></summary>'
            f'<div class="rv-a"><p>{a}</p></div></details>')


def contact_card(dark=False):
    return (f'<div class="rv-ct{" dk" if dark else ""}"><span class="rv-ic">{I_CHAT}</span><div><b>Une autre question ?</b>'
            '<p>On te répond sous [délai de réponse], par e-mail ou par message.</p></div>'
            f'<a class="rv-btn" href="#" onclick="return false">Nous écrire</a></div>')


# ----- Inscription et pieds de page (points 21 et 22 de la revue) -----
I_SPARK = ico('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>')
I_BOOK = ico('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5"/>')
SOC = ('<div class="soc">'
       '<a href="#" onclick="return false" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/></svg></a>'
       '<a href="#" onclick="return false" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/></svg></a>'
       '<a href="#" onclick="return false" aria-label="Pinterest"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8"/><path d="M11 9l-2 11M10 14c3 1 6-1 6-4"/></svg></a></div>')

# Colonnes complètes du pied de page (revue, point 22). Chaque lien mène à sa page dans le thème ; sur un vrai site,
# un lien dont la page n'existe pas est retiré (render.ts), une colonne vide aussi. Moyens de paiement : jamais affichés
# ici tant que le client ne les a pas confirmés.
FOOT_COLS = [
    ('La boutique', ['Nos mélanges', 'Mon compte', 'Panier']),
    ('Aide', ['Livraison et retours', 'Suivre ma commande', 'Questions fréquentes', 'Contact']),
    ('La maison', ['Notre histoire', 'Le journal', 'Nous écrire']),
    ('Informations', ['Mentions légales', 'Conditions générales de vente', 'Confidentialité', 'Cookies']),
]
NL = ('<form class="nl" onsubmit="return false"><input type="email" aria-label="Ton adresse e-mail" placeholder="Ton adresse e-mail">'
      '<button class="btn" type="submit">Je m\'inscris</button></form>')
COPY = '© Brindi · Tous droits réservés'


def lk(t):
    return f'<a href="#" onclick="return false">{t}</a>'


def fcols(cls='fcol'):
    return ''.join(f'<div class="{cls}"><h5>{h}</h5><ul>' + ''.join(f'<li>{lk(x)}</li>' for x in links) + '</ul></div>' for h, links in FOOT_COLS)


def facc():
    return '<div class="facc">' + ''.join(f'<details><summary>{h}</summary><ul>' + ''.join(f'<li>{lk(x)}</li>' for x in links) + '</ul></details>' for h, links in FOOT_COLS) + '</div>'


def nl_form(btn='Je m\'inscris', cls=''):
    return (f'<form class="rv-nl{cls}" onsubmit="return false"><input type="email" aria-label="Ton adresse e-mail" placeholder="Ton adresse e-mail" autocomplete="email">'
            f'<button type="submit">{btn}</button></form>')


NL_NOTE = '<small class="rv-nl-n">Une lettre de temps en temps, jamais de publicité envahissante. Désinscription en un clic.</small>'


# ----- Panier (points 23 et 36 de la revue) -----
I_GIFT = ico('<rect x="3.5" y="8" width="17" height="12.5" rx="1.5"/><path d="M2.5 8h19v4h-19zM12 8v12.5M12 8C10 4 6.5 4.5 7 7c.3 1.2 2.5 1 5 1zM12 8c2-4 5.5-3.5 5-1-.3 1.2-2.5 1-5 1z"/>')
I_TRASH = ico('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>')


def cart_item(img, name, info, price, qty):
    return (f'<article class="rv-ci" data-rv-ci data-price="{price}"><img src="photos/{img}.jpg" alt="">'
            f'<div class="rv-ci-t"><b>{name}</b><small>{info}</small>'
            f'<div class="rv-qty"><button type="button" data-rv-q="-1" aria-label="Retirer un">−</button><span data-rv-qn>{qty}</span><button type="button" data-rv-q="1" aria-label="Ajouter un">+</button></div></div>'
            f'<div class="rv-ci-r"><b data-rv-lt></b><button type="button" class="rv-ci-x" data-rv-rm aria-label="Retirer l\'article">{I_TRASH}</button></div></article>')


# ----- Fiche produit (points 26 et 28 de la revue) -----
I_SCALE = ico('<path d="M12 3v3M5 21h14M7 21l5-15 5 15"/><path d="M3 10l4-3 4 3M13 10l4-3 4 3"/><path d="M3 10a4 2 0 0 0 8 0M13 10a4 2 0 0 0 8 0"/>')
I_TEMP = ico('<path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M12 10v7"/>')
I_TIME = ico('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>')

TAB_CONTENT = [
    ('Description',
     '<div class="rv-pn-g"><div><p>Un thé vert aux feuilles fines et des fleurs de jasmin, réunis pour une tasse douce et florale. '
     'Le parfum vient des fleurs elles-mêmes, sans arôme ajouté : il s\'ouvre dès que l\'eau chaude touche les feuilles.</p>'
     '<p>Le compagnon des fins d\'après-midi, quand on veut ralentir sans s\'endormir.</p></div>'
     '<ul class="rv-pts"><li>Note florale douce, sans amertume</li><li>Se prépare en quelques minutes</li><li>Se réinfuse selon les repères de la marque</li></ul></div>'),
    ('Composition',
     '<div class="rv-pn-g"><table class="rv-tb"><tr><td>Thé vert</td><td>[part en %]</td></tr><tr><td>Fleurs de jasmin</td><td>[part en %]</td></tr>'
     '<tr><td>Arôme ajouté</td><td>[oui / non]</td></tr><tr><td>Origine</td><td>[pays ou région]</td></tr></table>'
     '<p>Les ingrédients, leurs proportions, leur origine et leurs labels viennent de la fiche réelle du produit, jamais d\'un exemple.</p></div>'),
    ('Préparation',
     '<div class="rv-rep">'
     f'<div><span class="rv-ic">{I_SCALE}</span><small>Quantité</small><b>[2 g par tasse]</b></div>'
     f'<div><span class="rv-ic">{I_TEMP}</span><small>Eau</small><b>[75 à 80 °C]</b></div>'
     f'<div><span class="rv-ic">{I_TIME}</span><small>Temps</small><b>[2 à 3 min]</b></div></div>'
     '<p>Verse l\'eau un peu avant l\'ébullition sur les feuilles, puis laisse infuser le temps indiqué. Plus longtemps, la tasse devient plus forte.</p>'),
    ('Livraison et retours',
     '<div class="rv-pn-g"><div><p>Expédition sous [délai de préparation], livraison en [délai de livraison], avec un numéro de suivi par e-mail. '
     'Livraison offerte dès [montant] d\'achat.</p><p>Un sachet fermé se retourne sous [délai de retour]. Écris-nous, on t\'explique la marche à suivre.</p></div>'
     '<a class="rv-lk" href="#" onclick="return false">Livraison et retours</a></div>'),
]


def tabs_section(variant):
    if variant == 'accordeon':
        body = '<div class="rv-acc">' + ''.join(
            f'<details class="rv-q"{" open" if i == 0 else ""}><summary><span class="rv-pl" aria-hidden="true"></span><span>{t}</span></summary><div class="rv-a">{c}</div></details>'
            for i, (t, c) in enumerate(TAB_CONTENT)) + '</div>'
    else:
        body = (f'<div class="rv-tl" role="tablist">' + ''.join(
            f'<button type="button" role="tab" aria-selected="{"true" if i == 0 else "false"}" data-rv-t="{i}">{t}</button>' for i, (t, _) in enumerate(TAB_CONTENT))
            + '<i class="rv-ind" aria-hidden="true"></i></div><div class="rv-pns">' + ''.join(
            f'<div class="rv-pn" role="tabpanel" data-rv-p="{i}"{"" if i == 0 else " hidden"}>{c}</div>' for i, (_, c) in enumerate(TAB_CONTENT)) + '</div>')
    head = '<div class="rv-tabs-hd"><span class="rv-eb">Tout savoir</span><h3 class="rv-h">Le thé vert jasmin, <em>en détail</em></h3></div>'
    return f'<section class="rv-s rv-tabs v-{variant}" data-rv-in data-rv-tabs><div class="rv-in">{head}<div class="rv-tabs-b">{body}</div></div></section>'


GUIDE = [
    ('vert', 'Thé vert', '[2 g par tasse]', '[75 à 80 °C]', '[2 à 3 min]', 'Une eau trop chaude rend le thé vert amer : laisse-la reposer une minute après l\'ébullition.'),
    ('noir', 'Thé noir', '[2 g par tasse]', '[90 à 95 °C]', '[3 à 4 min]', 'Le thé noir aime une eau presque bouillante ; au-delà du temps indiqué, il devient plus corsé.'),
    ('rooibos', 'Rooibos', '[2 g par tasse]', '[95 à 100 °C]', '[5 à 7 min]', 'Sans théine, le rooibos supporte une longue infusion sans amertume.'),
    ('inf', 'Infusions', '[2 g par tasse]', '[100 °C]', '[5 à 8 min]', 'Fleurs, feuilles et fruits livrent tout leur parfum dans une eau bouillante, à couvert.'),
]


def guide_rep(g):
    k, n, q, e, t, tip = g
    return (f'<div class="rv-gd-p" data-rv-g="{k}"{"" if k == "vert" else " hidden"}><div class="rv-rep">'
            f'<div><span class="rv-ic">{I_SCALE}</span><small>Quantité</small><b>{q}</b></div>'
            f'<div><span class="rv-ic">{I_TEMP}</span><small>Eau</small><b>{e}</b></div>'
            f'<div><span class="rv-ic">{I_TIME}</span><small>Temps</small><b>{t}</b></div></div><p>{tip}</p></div>')


# ----- Journal (points 39 et 40 de la revue) -----
ARTS = [
    ('bol', 'Conseils', '4 min', 'Préparer son thé en vrac au bureau',
     'Une cuillère, un filtre et quelques minutes : tout ce qu\'il faut pour faire d\'une pause de bureau un vrai moment à soi.'),
    ('trio-tasses', 'Rituels', '3 min', 'Quel mélange pour quelle heure ?',
     'Un thé vert pour bien commencer, un rooibos pour finir la journée : nos repères pour accorder la tasse au moment.'),
    ('infusion', 'Rituels', '2 min', 'Regarder les feuilles s\'ouvrir',
     'Pourquoi le temps d\'infusion change tout, et ce que la couleur de l\'eau raconte de ta tasse.'),
    ('seches', 'Conseils', '3 min', 'Bien conserver son thé',
     'Lumière, chaleur, odeurs : les trois ennemis du thé en vrac, et comment le garder parfumé jusqu\'à la dernière cuillère.'),
]
JR_TAGS = ['Tout', 'Conseils', 'Rituels']


def art_card(a, cls='rv-ac'):
    img, tag, mn, title, ex = a
    return (f'<a class="{cls}" href="#" onclick="return false" data-tag="{tag}"><div class="rv-ac-im"><img src="photos/{img}.jpg" alt=""></div>'
            f'<div class="rv-ac-t"><span class="rv-ac-m">{tag} · <span class="rv-nb">{mn} de lecture</span></span><h4>{title}</h4><p>{ex}</p>'
            f'<span class="rv-ac-go">Lire l\'article {I_ARROW}</span></div></a>')


def jr_head(title, em):
    chips = ''.join(f'<button type="button" aria-pressed="{"true" if i == 0 else "false"}" data-k="{t if i else "all"}">{t}</button>' for i, t in enumerate(JR_TAGS))
    return (f'<div class="rv-jr-hd"><div><span class="rv-eb">Le journal</span><h2 class="rv-h">{title} <em>{em}</em></h2></div>'
            f'<div class="rv-chips" role="group" aria-label="Thèmes">{chips}</div></div>')


def mini_prod(img, name, price):
    return (f'<a class="rv-mp" href="#" onclick="return false"><img src="photos/{img}.jpg" alt=""><span><b>{name}</b><small>{price}</small></span>'
            f'<span class="rv-mp-add" aria-hidden="true">+</span></a>')


# ----- Effets (points 9, 10, 15, 17, 19 et 20 de la revue) -----
GLOW = ('Une tasse, quelques minutes, et la journée ralentit. Nos thés et nos infusions sont faits pour *ce moment-là* : '
        'celui où l\'on *pose son téléphone*, où l\'eau chaude ouvre les feuilles, et où chaque gorgée devient une *vraie pause*.')


def glow_words(t):
    out = []
    for w in t.split(' '):
        hot = w.startswith('*') or w.endswith('*') or (w.endswith('*.') or w.endswith('*,'))
        out.append(w)
    # Les mots entre astérisques sont des mots clés (couleur de marque, italique).
    html, on = [], False
    for w in t.split(' '):
        start = w.startswith('*')
        if start:
            on = True
        clean = w.replace('*', '')
        html.append(f'<span{" class=\"k\"" if on else ""}>{clean}</span>')
        if '*' in w[1:] or (start and w.count('*') == 2):
            on = False
    return ' '.join(html)


FRISE = [
    ('seches', '[année]', 'L\'idée', 'Ce qui a donné envie de créer la marque : le moment, le manque, la rencontre. Deux ou trois phrases vraies, racontées simplement.'),
    ('fleurs', '[année]', 'Les premiers mélanges', 'Comment les premières recettes ont été cherchées, goûtées, refaites, jusqu\'à celles qui méritaient d\'être partagées.'),
    ('trois-bols', '[année]', 'La gamme', 'Ce que la marque propose aujourd\'hui, et pourquoi ces produits-là : seulement ce que la marque peut affirmer.'),
    ('film-affiche', 'Aujourd\'hui', 'La suite', 'Ce qui se prépare : la prochaine étape que la marque veut partager avec ses clients.'),
]
STORIES = [('hero', 'La théière'), ('fleurs', 'Jasmin'), ('trois-bols', 'L\'atelier'), ('tasse', 'La pause'), ('bi-carnet', 'Le soir')]
STACK = [
    ('fleurs', '01', 'Le choix des feuilles', 'Chaque ingrédient est choisi pour son goût et sa qualité, puis goûté avant d\'entrer dans un mélange. Rien n\'est retenu par habitude.', 'Ce que la marque contrôle : [à compléter]'),
    ('trois-bols', '02', 'L\'assemblage', 'Les proportions sont cherchées tasse après tasse, jusqu\'à l\'équilibre : une note qui domine, les autres qui l\'accompagnent.', 'Nombre d\'essais avant un mélange : [à compléter]'),
    ('film-affiche', '03', 'La dégustation', 'Avant l\'envoi, le mélange est préparé comme chez toi, avec les repères indiqués sur sa fiche, pour vérifier qu\'il tient sa promesse.', 'Repères de préparation sur chaque fiche'),
    ('tasse', '04', 'Jusqu\'à ta tasse', 'Le sachet est fermé, protégé et expédié avec soin. Il ne reste plus qu\'à faire chauffer l\'eau et à prendre le temps.', 'Délai d\'envoi : [à compléter]'),
]
BLENDS = [('jasmin', 'Thé vert jasmin', '7.5'), ('agrumes', 'Thé noir aux agrumes', '7.5'), ('rooibos', 'Rooibos vanille', '8.5'),
          ('verveine', 'Verveine-menthe', '7.5'), ('camomille', 'Camomille-tilleul', '7.5'), ('hibiscus', 'Hibiscus-fruits rouges', '8.5')]


def eur(x):
    return (f'{float(x):.2f}'.replace('.', ',').replace(',00', '')) + ' €'



# ----- Sections ajoutées après l'étude de 65 thèmes ThemeForest (11 novembre 2026, docs/etude-themes-themeforest.md) -----
I_PLAY = ico('<path d="M8 5.5v13l11-6.5z"/>', 1.6)
PRODS = [('jasmin', 'Thé vert jasmin', '8,50 €'), ('agrumes', 'Thé noir aux agrumes', '8,50 €'), ('rooibos', 'Rooibos vanille', '8,50 €'),
         ('verveine', 'Verveine-menthe', '7,50 €'), ('camomille', 'Camomille-tilleul', '7,50 €'), ('hibiscus', 'Hibiscus-fruits rouges', '7,50 €')]


def prod_card(img, name, price):
    return (f'<a class="rv-pc" href="#" onclick="return false"><div class="rv-pc-im"><img src="photos/{img}.jpg" alt=""></div>'
            f'<b>{name}</b><small>{price}</small><span class="rv-pc-add">Ajouter</span></a>')


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
    # 33. Questions : quatre présentations au choix, sans blanc sur les côtés.
    # a) Deux colonnes : le titre et le contact à gauche (restent visibles), les questions à droite.
    {'id': 'questions-deux-colonnes', 'title': 'Questions en deux colonnes avec contact', 'kind': 'Questions · accueil, fiche ou aide',
     'does': 'Les questions fréquentes sur toute la largeur : le titre et un encart pour écrire à la marque à gauche, les réponses à droite. Les réponses viennent des faits du client.',
     'anim': "La réponse s'ouvre en douceur, le + devient −.", 'family': 'classique', 'style': None, 'role': 'aide', 'tags': ['content'], 'demoFrame': False,
     'html': ('<section class="rv-s rv-fq2" data-rv-in><div class="rv-in rv-fq2-g">'
              '<div class="rv-fq2-l"><span class="rv-eb">Questions fréquentes</span><h3 class="rv-h">Tout ce que tu te demandes <em>avant ta première tasse</em></h3>'
              '<p>Livraison, retours, préparation : les réponses courtes aux questions qu\'on nous pose le plus souvent.</p>' + contact_card() + '</div>'
              '<div class="rv-acc">' + ''.join(qa(q, a) for q, a in ALL_QA[:6]) + '</div>'
              '</div></section>')},
    # b) Cartes : une grille de questions sur fond foncé, chaque carte s'ouvre sur sa réponse.
    {'id': 'questions-en-cartes', 'title': 'Questions en cartes', 'kind': 'Questions · accueil ou aide',
     'does': 'Les questions en grille de cartes sur le fond foncé de la marque ; on touche une carte, la réponse apparaît dedans. Les réponses viennent des faits du client.',
     'anim': 'Les cartes montent à l\'arrivée ; la réponse se déplie dans la carte.', 'family': 'classique', 'style': None, 'role': 'aide', 'tags': ['content'], 'demoFrame': False,
     'html': ('<section class="rv-s rv-fqc" data-rv-in><div class="rv-in">'
              '<div class="rv-hd"><span class="rv-eb">On te répond</span><h3 class="rv-h">Les questions qu\'on nous pose <em>le plus</em></h3></div>'
              '<div class="rv-fqc-g">' + ''.join(qa(q, a) for q, a in ALL_QA[:6]) + '</div>'
              '<div class="rv-fqc-f"><p>Ta question n\'est pas là ?</p><a class="rv-btn" href="#" onclick="return false">Nous écrire</a></div>'
              '</div></section>')},
    # c) Avec photo : une photo d'ambiance d'un côté, les questions rangées par thème de l'autre.
    {'id': 'questions-avec-photo', 'title': 'Questions avec photo', 'kind': 'Questions · accueil ou fiche',
     'does': "Une photo d'ambiance d'un côté, les questions rangées par thème de l'autre (Livraison, Nos thés, Préparation). Les réponses viennent des faits du client.",
     'anim': 'Les thèmes changent les questions sans recharger ; la photo glisse doucement.', 'family': 'classique', 'style': None, 'role': 'aide', 'tags': ['content'], 'demoFrame': False,
     'html': ('<section class="rv-s rv-fqp" data-rv-in data-rv-filter><div class="rv-in rv-fqp-g">'
              '<div class="rv-fqp-ph"><img src="photos/infusion.jpg" alt=""><div class="rv-fqp-tag"><span class="rv-ic">' + I_CHAT + '</span><span><b>Une question ?</b><small>Réponse sous [délai de réponse]</small></span></div></div>'
              '<div class="rv-fqp-r"><span class="rv-eb">Questions fréquentes</span><h3 class="rv-h">Bien choisir, <em>bien infuser</em></h3>'
              '<div class="rv-chips" role="group" aria-label="Thèmes"><button type="button" aria-pressed="true" data-k="livraison">Livraison</button><button type="button" aria-pressed="false" data-k="thes">Nos thés</button><button type="button" aria-pressed="false" data-k="preparation">Préparation</button></div>'
              '<div class="rv-acc">' + ''.join(qa(q, a, k) for k in ('livraison', 'thes', 'preparation') for q, a in FAQ[k]) + '</div></div>'
              '</div></section>')},
    # d) Bulles de discussion : refaite, les questions ET les réponses sont dans la section (plus dans le script).
    {'id': 'questions-en-bulles-de-discussion', 'html': (
        '<section class="rv-s rv-bub" data-rv-in data-rv-bub><div class="rv-in rv-bub-g">'
        '<div class="rv-bub-l"><span class="rv-eb">Tes questions</span><h3 class="rv-h">Pose-nous <em>ta question</em></h3>'
        '<p>Touche une question : la réponse arrive comme un message.</p><div class="rv-bub-qs">'
        + ''.join(f'<div class="rv-bub-q"><button type="button">{q}</button><p hidden>{a}</p></div>' for q, a in ALL_QA[:5])
        + '</div></div>'
        '<div class="rv-bub-ch"><div class="rv-bub-hd"><span class="rv-ic">' + I_CHAT + '</span><div><b>Brindi</b><small>Répond aux questions fréquentes</small></div></div>'
        '<div class="rv-bub-m" data-rv-bubm aria-live="polite"><div class="rv-bb it">Bonjour ! Touche une question, je te réponds tout de suite.</div>'
        f'<div class="rv-bb me">{ALL_QA[0][0]}</div><div class="rv-bb it">{ALL_QA[0][1]}</div></div></div>'
        '</div></section>')},
    # Questions sur le produit (fiche) : deux colonnes, sur toute la largeur.
    {'id': 'questions-sur-le-produit', 'anim': "La réponse s'ouvre en douceur, le + devient −.", 'html': (
        '<section class="rv-s rv-fqf" data-rv-in><div class="rv-in rv-fq2-g">'
        '<div class="rv-fq2-l"><span class="rv-eb">Avant de commander</span><h3 class="rv-h">Les réponses <em>sur ce thé</em></h3>'
        '<p>Préparation, nombre de tasses, conservation : ce qu\'il faut savoir avant de l\'ajouter au panier.</p>'
        f'<a class="rv-lk" href="#" onclick="return false">Toutes les questions {I_ARROW}</a></div>'
        '<div class="rv-acc">' + ''.join(qa(q, a) for q, a in FAQ['preparation'] + FAQ['thes'][1:]) + '</div>'
        '</div></section>')},
    # 41. Page des questions fréquentes : bande titre + grande recherche, thèmes en cartes, questions groupées, encart contact.
    {'id': 'questions-avec-recherche', 'title': 'Page des questions fréquentes', 'kind': 'Page · questions fréquentes',
     'does': 'La page des questions : grande recherche qui filtre en direct, thèmes en cartes, questions rangées par thème et encart pour écrire à la marque. Les réponses viennent des faits du client.',
     'anim': "Les questions se filtrent à chaque lettre ; une carte de thème mène à ses questions ; les réponses s'ouvrent en douceur.",
     'html': ('<section class="rv-fqa" data-rv-faq>'
              '<div class="rv-fqa-bd"><div class="rv-fqa-bi"><span class="rv-eb">Aide</span><h2 class="rv-h">Comment pouvons-nous <em>t\'aider</em> ?</h2>'
              f'<label class="rv-fqa-s">{I_SEARCH}<input type="search" placeholder="Rechercher : livraison, retour, infusion…" aria-label="Rechercher une question" data-rv-fqs></label></div></div>'
              '<div class="rv-s rv-fqa-m"><div class="rv-in">'
              '<div class="rv-fqa-th">'
              + ''.join(f'<a href="#rv-fq-{k}" data-rv-go="{k}"><span class="rv-ic">{ic}</span><b>{t}</b><small>{len(FAQ[k])} questions</small></a>'
                        for k, t, ic in (('livraison', 'Commande et livraison', I_TRUCK), ('retours', 'Retours', I_RETURN), ('thes', 'Nos thés', I_LEAF), ('preparation', 'Préparation', I_CUP)))
              + '</div>'
              + ''.join(f'<div class="rv-fqa-gr" id="rv-fq-{k}" data-rv-gr><h3>{t}</h3><div class="rv-acc lp">' + ''.join(qa(q, a) for q, a in FAQ[k]) + '</div></div>'
                        for k, t in (('livraison', 'Commande et livraison'), ('retours', 'Retours'), ('thes', 'Nos thés'), ('preparation', 'Préparation')))
              + '<p class="rv-fqa-no" data-rv-fqn hidden>Aucune question ne correspond. Écris-nous, on te répond.</p>'
              + contact_card(True) +
              '</div></div></section>')},
    # 21. Fenêtre d'inscription : refaite. Dans la banque, la fenêtre se voit telle quelle ; sur un vrai site, elle s'ouvre
    # une seule fois, quelques secondes après l'arrivée, et se ferme d'un geste.
    {'id': 'fenetre-d-inscription', 'demoFrame': False,
     'does': "Une fenêtre qui propose la lettre d'information, une seule fois, quelques secondes après l'arrivée. Photo d'un côté, promesse et champ e-mail de l'autre ; facile à fermer, jamais envahissante.",
     'anim': "La fenêtre monte en douceur sur un fond voilé ; elle ne revient pas une fois fermée.",
     'html': ('<section class="rv-s rv-pop" data-rv-pop><img class="rv-pop-im" src="photos/nl-infusion.jpg" alt=""><div class="rv-pop-bg" data-rv-popx></div>'
              '<div class="rv-pop-c" role="dialog" aria-label="Inscription à la lettre"><div class="rv-pop-ph"><img src="photos/fenetre.jpg" alt=""></div>'
              '<div class="rv-pop-t"><span class="rv-eb">La lettre de Brindi</span><h3 class="rv-h">Une pause <em>dans ta boîte mail</em></h3>'
              '<p>Les nouveaux mélanges dès leur sortie, une idée de préparation et les nouvelles de la maison.</p>'
              + nl_form() + NL_NOTE +
              '<button class="rv-pop-no" type="button" data-rv-popx>Non merci</button></div>'
              '<button class="rv-pop-x" type="button" data-rv-popx aria-label="Fermer">×</button></div></section>')},
    # Nouvelles sections d'inscription (famille enrichie, principe du marché, dessin à nous).
    {'id': 'inscription-avec-photo', 'title': 'Inscription avec photo', 'kind': 'Inscription · accueil ou pied de page', 'family': 'classique', 'style': None,
     'role': 'inscription', 'tags': ['conv'], 'demoFrame': False,
     'does': "Une bande sur toute la largeur : une photo d'ambiance d'un côté, la promesse de la lettre et le champ e-mail de l'autre.",
     'anim': 'La photo glisse doucement à l\'arrivée ; le champ s\'éclaire quand on écrit.',
     'html': ('<section class="rv-s rv-nlp" data-rv-in><div class="rv-in rv-nlp-g">'
              '<div class="rv-nlp-ph"><img src="photos/nl-tasse.jpg" alt=""></div>'
              '<div class="rv-nlp-t"><span class="rv-eb">La lettre</span><h3 class="rv-h">Le meilleur moment de ta semaine, <em>par écrit</em></h3>'
              '<p>Une idée de pause, un mélange à découvrir et les nouvelles de la maison, de temps en temps dans ta boîte mail.</p>'
              + nl_form() + NL_NOTE + '</div></div></section>')},
    {'id': 'inscription-centree', 'title': 'Inscription centrée', 'kind': 'Inscription · accueil ou pied de page', 'family': 'classique', 'style': None,
     'role': 'inscription', 'tags': ['conv'], 'demoFrame': False,
     'does': 'Une grande bande à la couleur de la marque : un titre au centre, le champ e-mail et le bouton sur une ligne, une phrase qui rassure.',
     'anim': 'Le titre et le champ montent à l\'arrivée de la section au centre de l\'écran.',
     'html': ('<section class="rv-s rv-nlc" data-rv-in><div class="rv-in"><div class="rv-hd">'
              f'<span class="rv-ic">{I_MAIL}</span><span class="rv-eb">Reste en contact</span><h3 class="rv-h">Reçois nos nouvelles <em>avant tout le monde</em></h3>'
              '<p>Les nouveaux mélanges, les idées de préparation et les coulisses de la maison.</p>'
              + nl_form('Je m\'abonne') + NL_NOTE + '</div></div></section>')},
    {'id': 'inscription-avec-avantages', 'title': 'Inscription avec avantages', 'kind': 'Inscription · accueil', 'family': 'classique', 'style': None,
     'role': 'inscription', 'tags': ['conv'], 'demoFrame': False,
     'does': "Fond foncé : à gauche ce que la lettre apporte (trois points avec icône), à droite une carte claire avec le champ e-mail. Seulement des avantages vrais de la marque.",
     'anim': 'Les trois points arrivent l\'un après l\'autre ; la carte monte en dernier.',
     'html': ('<section class="rv-s rv-nla" data-rv-in><div class="rv-in rv-nla-g">'
              '<div class="rv-nla-l"><span class="rv-eb">La lettre de Brindi</span><h3 class="rv-h">Ce que tu reçois <em>en t\'inscrivant</em></h3><ul>'
              f'<li><span class="rv-ic">{I_SPARK}</span><span><b>Les nouveautés dès leur sortie</b>Chaque nouveau mélange, présenté par ceux qui l\'ont composé.</span></li>'
              f'<li><span class="rv-ic">{I_CUP}</span><span><b>Une idée de préparation</b>Un geste, une recette ou un accord pour profiter de ta tasse.</span></li>'
              f'<li><span class="rv-ic">{I_BOOK}</span><span><b>Les nouvelles de la maison</b>Les coulisses, les récoltes et les rendez-vous à venir.</span></li></ul></div>'
              '<div class="rv-nla-c"><b>Inscris-toi</b><p>Une lettre de temps en temps, rien de plus.</p>'
              + nl_form('Je m\'inscris', ' col') + '<small class="rv-nl-n">Désinscription en un clic, à tout moment.</small></div>'
              '</div></section>')},
    # 22. Pieds de page : toutes les colonnes de liens (seulement les pages qui existent sur un vrai site), aucune
    # identité d'exemple (nom, adresse) ni moyen de paiement non confirmé.
    {'id': 'pied-de-page-complet', 'html': (
        '<footer class="f1 rv-ft"><div class="top"><div class="brand"><span class="lg">Brindi</span><p>Des thés et infusions bio, choisis et assemblés avec soin.</p>'
        + NL + '</div>' + fcols() + facc() + '</div>'
        '<div class="fbot">' + SOC + f'<span>{COPY}</span></div></footer>')},
    {'id': 'pied-de-page-geant', 'html': (
        '<footer class="ts tB nx5 rv-ft" data-nxs data-nx5><div class="nx5-top"><div><span class="lg" style="font:600 1.8rem var(--f-title)">Brindi</span>'
        '<p>Des thés et infusions bio, choisis et assemblés avec soin.</p><form class="nx5-nl" onsubmit="return false"><input type="email" placeholder="Ton e-mail" aria-label="Ton e-mail"><button type="submit">Je m\'inscris</button></form></div>'
        + ''.join(f'<div><h5>{h}</h5><ul>' + ''.join(f'<li>{lk(x)}</li>' for x in links) + '</ul></div>' for h, links in FOOT_COLS)
        + f'</div><div class="nx5-big" data-nx5b>Brindi</div><div class="nx5-bt"><span>{COPY}</span><span>Instagram · Facebook</span></div></footer>')},
    {'id': 'pied-de-page-avec-grand-appel', 'html': (
        '<footer class="f2 rv-ft"><div class="cta"><h4>Une pause dans ta boîte mail</h4><p>Reçois de temps en temps une idée de pause et les nouvelles de Brindi.</p>'
        '<form class="nl" onsubmit="return false"><input type="email" aria-label="Ton adresse e-mail" placeholder="Ton adresse e-mail"><button class="btn live" type="submit">Je m\'inscris</button></form></div>'
        '<svg class="wave" viewBox="0 0 1200 50" preserveAspectRatio="none" aria-hidden="true"><path data-wave fill="#233A2E" d="M0 30 C 200 0, 400 50, 600 25 S 1000 0, 1200 28 V50 H0z"/></svg>'
        '<div class="low"><div class="brand"><span class="lg">Brindi</span>' + SOC + '</div>' + fcols() + f'<small class="cp">{COPY}</small></div></footer>')},
    {'id': 'pied-de-page-minimal-centre', 'html': (
        '<footer class="f3 rv-ft"><span class="lg">Brindi</span><nav>'
        + ''.join(f'<a class="lnk" href="#" onclick="return false">{x}</a>' for x in ['Nos mélanges', 'Notre histoire', 'Le journal', 'Livraison et retours', 'Questions fréquentes', 'Contact'])
        + '</nav>' + SOC + '<nav class="lg2">'
        + ''.join(lk(x) for x in FOOT_COLS[3][1]) + f'</nav><small>{COPY}</small></footer>')},
    {'id': 'pied-de-page-a-bandeau-de-photos', 'html': (
        '<footer class="f4 rv-ft"><div class="strip">'
        + ''.join(f'<a href="#" onclick="return false"><img src="photos/{x}.jpg" alt=""></a>' for x in ['fenetre', 'trois-bols', 'trio-tasses', 'bol-verre', 'tasse-fruits'])
        + '</div><div class="body"><div><h4>Brindi</h4><p class="muted">Des thés et infusions bio, choisis et assemblés avec soin.</p>'
        + SOC.replace('class="soc"', 'class="soc dk"') + '</div>' + fcols() + '</div>'
        f'<div class="fbot"><span>{COPY}</span></div></footer>')},
    # 36. Panier refait sur toute la largeur : articles à gauche, récapitulatif à droite. Pas d'étapes de commande dans le
    # thème : le bouton mène au paiement sécurisé de la plateforme (Shopify). 23. Emballage cadeau : une ligne à cocher,
    # seulement si le client le propose, à son prix (data-rv-opt="emballage" : SINA la retire sinon).
    {'id': 'panier-en-etapes', 'title': 'Panier sur toute la largeur',
     'does': "La page panier sur toute la largeur : les articles à gauche (quantité, retrait), la barre de livraison offerte, l'emballage cadeau à cocher s'il est proposé ; à droite le récapitulatif et le bouton vers le paiement sécurisé de la boutique.",
     'anim': 'Les montants se recalculent à chaque changement ; la barre de livraison offerte avance.',
     'html': ('<section class="rv-s rv-cart" data-rv-cart data-free="35"><div class="rv-in">'
              '<div class="rv-cart-hd"><h2 class="rv-h">Ton panier</h2><ol class="rv-steps"><li class="on"><i>1</i>Panier</li><li><i>2</i>Paiement sécurisé</li><li><i>3</i>Confirmation</li></ol></div>'
              '<div class="rv-cart-g"><div class="rv-cart-l">'
              '<div class="rv-fs"><p data-rv-fsm></p><div class="rv-fs-b"><i data-rv-fsb></i></div></div>'
              '<div class="rv-cil" data-rv-cil>'
              + cart_item('jasmin', 'Thé vert jasmin', 'Sachet de 100 g', '7.5', 2)
              + cart_item('verveine', 'Verveine-menthe', 'Sachet de 100 g', '7.5', 1)
              + cart_item('rooibos', 'Rooibos vanille', 'Sachet de 100 g', '8.5', 1)
              + '</div><p class="rv-cart-e" data-rv-empty hidden>Ton panier est vide. <a href="#" onclick="return false">Continuer mes achats</a></p>'
              f'<label class="rv-gift" data-rv-opt="emballage" data-price="2.5"><input type="checkbox" data-rv-gift><span class="rv-ic">{I_GIFT}</span><span><b>Emballage cadeau</b><small>Papier, ruban et petite carte</small></span><em>+2,50 €</em></label>'
              '<details class="rv-note"><summary>Ajouter un mot pour la commande</summary><textarea rows="3" placeholder="Une précision pour la commande ?"></textarea></details>'
              '</div><aside class="rv-sum"><h3>Récapitulatif</h3>'
              '<div class="rv-sr"><span>Sous-total</span><b data-rv-sub></b></div>'
              '<div class="rv-sr" data-rv-giftrow hidden><span>Emballage cadeau</span><b>2,50 €</b></div>'
              '<div class="rv-sr"><span>Livraison</span><b data-rv-ship></b></div>'
              '<div class="rv-sr tt"><span>Total</span><b data-rv-tot></b></div>'
              '<a class="rv-btn rv-pay" href="#" onclick="return false">Passer au paiement sécurisé</a>'
              f'<p class="rv-sum-n">{I_LOCK}<span>Le paiement se fait sur la page sécurisée de la boutique. Les moyens de paiement acceptés s\'y affichent.</span></p>'
              '<a class="rv-lk" href="#" onclick="return false">Continuer mes achats</a></aside></div>'
              '</div></section>')},
    # 28. Fiche produit à onglets : plus de texte, meilleur dessin, quatre présentations au choix.
    {'id': 'fiche-produit-a-onglets', 'title': 'Fiche produit à onglets',
     'does': "Les informations longues de la fiche rangées en onglets soulignés : description, composition, préparation (les trois repères), livraison et retours. Les valeurs viennent de la fiche réelle du produit.",
     'anim': "Le trait glisse sous l'onglet choisi ; le contenu apparaît en fondu.", 'html': tabs_section('souligne')},
    {'id': 'fiche-produit-onglets-en-pastilles', 'title': 'Fiche produit à onglets en pastilles', 'kind': 'Fiche produit', 'family': 'classique', 'style': None,
     'role': 'produit', 'tags': ['shop'], 'demoFrame': False,
     'does': "Les mêmes informations de la fiche en onglets ronds (pastilles) sur fond doux. Les valeurs viennent de la fiche réelle du produit.",
     'anim': "La pastille choisie se remplit ; le contenu apparaît en fondu.", 'html': tabs_section('pastilles')},
    {'id': 'fiche-produit-en-accordeon', 'title': 'Fiche produit en accordéon', 'kind': 'Fiche produit', 'family': 'classique', 'style': None,
     'role': 'produit', 'tags': ['shop'], 'demoFrame': False,
     'does': "Les informations de la fiche en volets qui s'ouvrent l'un sous l'autre, pratique sur téléphone. Les valeurs viennent de la fiche réelle du produit.",
     'anim': "Le volet s'ouvre en douceur, le + devient −.", 'html': tabs_section('accordeon')},
    {'id': 'fiche-produit-onglets-sur-le-cote', 'title': 'Fiche produit à onglets sur le côté', 'kind': 'Fiche produit', 'family': 'classique', 'style': None,
     'role': 'produit', 'tags': ['shop'], 'demoFrame': False,
     'does': "Les onglets en colonne à gauche, le contenu à droite : une lecture calme sur grand écran. Les valeurs viennent de la fiche réelle du produit.",
     'anim': "L'onglet choisi s'allume ; le contenu apparaît en fondu.", 'html': tabs_section('cote')},
    # 26. Guide d'infusion en tiroir : plus de texte, aperçu des trois repères, valeurs du client entre crochets.
    {'id': 'guide-d-infusion-en-tiroir',
     'does': "Les trois repères (quantité, eau, temps) visibles tout de suite pour chaque famille de thé, et un tiroir sur le côté avec le guide complet. Les valeurs sont celles que donne le client.",
     'anim': "Les repères changent avec la famille choisie ; le tiroir glisse depuis la droite.",
     'html': ('<section class="rv-s rv-gd" data-rv-in data-rv-guide><div class="rv-in rv-gd-g">'
              '<div class="rv-gd-l"><span class="rv-eb">Bien préparer</span><h3 class="rv-h">Une bonne tasse, <em>sans se tromper</em></h3>'
              '<p>Chaque famille de thé a ses repères : la quantité de feuilles, la chaleur de l\'eau et le temps d\'infusion. Choisis la tienne pour les voir.</p>'
              '<div class="rv-chips" role="group" aria-label="Familles">' + ''.join(
                  f'<button type="button" aria-pressed="{"true" if g[0] == "vert" else "false"}" data-k="{g[0]}">{g[1]}</button>' for g in GUIDE) + '</div>'
              + ''.join(guide_rep(g) for g in GUIDE) +
              f'<button class="rv-lk" type="button" data-rv-gdo>Le guide complet {I_ARROW}</button></div>'
              '<div class="rv-gd-ph"><img src="photos/tasse-fruits.jpg" alt=""></div></div>'
              '<div class="rv-dr-bg" data-rv-gdx></div><aside class="rv-dr" aria-label="Guide d\'infusion"><div class="rv-dr-h"><b>Guide d\'infusion</b>'
              '<button type="button" data-rv-gdx aria-label="Fermer">×</button></div><div class="rv-dr-b">' + ''.join(
                  f'<div class="rv-dr-s"><h4>{n}</h4><p><b>{q}</b> · <b>{e}</b> · <b>{t}</b></p><p>{tip}</p></div>' for _, n, q, e, t, tip in GUIDE)
              + '<p class="rv-dr-n">Les valeurs exactes de chaque mélange figurent sur sa fiche.</p></div></aside></section>')},
    # 39. Le journal : chaque article en bloc complet ; trois présentations au choix.
    {'id': 'le-journal-liste-des-articles', 'title': 'Le journal : à la une et grille',
     'does': "La page du journal : l'article à la une en grand, puis les autres en grille. Chaque article est un bloc complet : photo, thème, temps de lecture, titre, extrait et lien. Filtres par thème.",
     'anim': "Les articles se filtrent en douceur ; la photo s'approche au survol.",
     'html': ('<section class="rv-s rv-jr" data-rv-in data-rv-jr><div class="rv-in">' + jr_head('Le journal', 'de la pause')
              + art_card(ARTS[0], 'rv-ac rv-ac-big') + '<div class="rv-jr-g">' + ''.join(art_card(a) for a in ARTS[1:]) + '</div></div></section>')},
    {'id': 'journal-en-magazine', 'title': 'Le journal façon magazine', 'kind': 'Page · journal', 'family': 'classique', 'style': None,
     'role': 'journal', 'tags': ['content'], 'demoFrame': False,
     'does': "Le journal comme un magazine : un grand article avec son titre posé sur la photo, et une colonne de trois articles à côté. Chaque article reste un bloc complet.",
     'anim': "La grande photo s'approche lentement ; les articles de la colonne montent l'un après l'autre.",
     'html': ('<section class="rv-s rv-jm" data-rv-in data-rv-jr><div class="rv-in">' + jr_head('Lire', 'entre deux tasses')
              + '<div class="rv-jm-g">' + art_card(ARTS[1], 'rv-ac rv-ac-ov') + '<div class="rv-jm-c">' + ''.join(art_card(a, 'rv-ac rv-ac-row') for a in (ARTS[0], ARTS[2], ARTS[3])) + '</div></div></div></section>')},
    {'id': 'journal-en-liste', 'title': 'Le journal en liste', 'kind': 'Page · journal', 'family': 'classique', 'style': None,
     'role': 'journal', 'tags': ['content'], 'demoFrame': False,
     'does': "Les articles en liste, l'un sous l'autre : petite photo, thème, titre, extrait et flèche. Sobre et rapide à parcourir.",
     'anim': "La ligne survolée s'éclaire et la flèche avance.",
     'html': ('<section class="rv-s rv-jl" data-rv-in data-rv-jr><div class="rv-in">' + jr_head('Toutes nos', 'histoires de thé')
              + '<div class="rv-jl-l">' + ''.join(art_card(a, 'rv-ac rv-ac-ln') for a in ARTS) + '</div></div></section>')},
    # 40. Article avec barre de lecture : refait sur trois colonnes (sommaire, article, encart produits et « À lire aussi »).
    {'id': 'article-avec-barre-de-lecture',
     'does': "La page d'un article : barre de lecture en haut, sommaire qui suit la lecture à gauche, l'article au centre avec ses photos, et à droite les produits cités et « À lire aussi ». Aucun vide sur les côtés.",
     'anim': "La barre se remplit pendant la lecture ; le sommaire s'allume sur la partie lue.",
     'html': ('<section class="rv-s rv-art" data-rv-in data-rv-art><div class="rv-art-pg"><i data-rv-artp></i></div><div class="rv-in">'
              '<header class="rv-art-hd"><span class="rv-eb">Conseils · <span class="rv-nb">4 min de lecture</span></span><h1 class="rv-h">Préparer son thé en vrac <em>au bureau</em></h1>'
              '<p>Une cuillère, un filtre et quelques minutes : tout ce qu\'il faut pour faire d\'une pause de bureau un vrai moment à soi.</p></header>'
              '<div class="rv-art-g"><nav class="rv-toc" aria-label="Sommaire"><b>Sommaire</b>'
              '<a href="#rv-a1" data-rv-to>Le bon dosage</a><a href="#rv-a2" data-rv-to>Le bon filtre</a><a href="#rv-a3" data-rv-to>Le bon moment</a></nav>'
              '<article class="rv-art-b"><figure><img src="photos/bol.jpg" alt=""></figure>'
              '<p>Le thé en vrac a la réputation d\'être compliqué. Au bureau, il demande pourtant à peine plus de gestes qu\'un sachet : une boîte, une cuillère et un filtre suffisent. Le reste, c\'est une question de repères.</p>'
              '<h3 id="rv-a1">Le bon dosage</h3><p>Compte [quantité conseillée par la marque] par tasse. Mieux vaut un peu moins de feuilles et une infusion juste qu\'une tasse trop chargée : le goût se règle ensuite, d\'une pause à l\'autre.</p>'
              '<p>Garde ta boîte bien fermée, loin de la fenêtre et de la machine à café : le thé capte la lumière et les odeurs.</p>'
              '<h3 id="rv-a2">Le bon filtre</h3><figure><img src="photos/infuseur.jpg" alt=""></figure>'
              '<p>Un filtre assez grand laisse les feuilles s\'ouvrir : c\'est là que le parfum se libère. Les filtres en papier se jettent après usage ; les filtres en métal se rincent en un geste.</p>'
              '<p>Retire le filtre à la fin du temps d\'infusion : la tasse garde sa douceur jusqu\'à la dernière gorgée.</p>'
              '<h3 id="rv-a3">Le bon moment</h3><p>Le matin, un thé vert réveille sans brusquer. L\'après-midi, un mélange fleuri accompagne la concentration. En fin de journée, une infusion sans théine annonce la fin des écrans.</p>'
              '<p>Le meilleur moment reste celui que tu choisis : quelques minutes à toi, entre deux rendez-vous.</p></article>'
              '<aside class="rv-art-a"><div class="rv-art-box"><b>Les thés de l\'article</b>'
              + mini_prod('jasmin', 'Thé vert jasmin', '7,50 €') + mini_prod('verveine', 'Verveine-menthe', '7,50 €') +
              '</div><div class="rv-art-box"><b>À lire aussi</b>'
              + ''.join(f'<a class="rv-rel" href="#" onclick="return false"><img src="photos/{a[0]}.jpg" alt=""><span>{a[3]}</span></a>' for a in ARTS[1:3]) +
              '</div></aside></div></div></section>')},
    # 9. Texte qui s'allume en lisant : une vraie section (plus de cadre de démonstration) ; le texte reste centré et
    # fixe à l'écran pendant que les mots s'allument, sans vide au-dessus.
    {'id': 'texte-qui-s-allume-en-lisant', 'demoFrame': False,
     'does': "Un grand paragraphe sur la marque, fixe au centre de l'écran : il prend sa couleur mot après mot pendant qu'on fait défiler, puis la page reprend. Les mots clés s'allument en couleur de marque.",
     'anim': "Les mots s'allument un à un pendant le défilement, le texte restant centré à l'écran.",
     'html': ('<section class="rv-glow" data-rv-glow><div class="rv-glow-st"><div class="rv-glow-in"><span class="rv-eb">Notre histoire</span>'
              f'<p class="rv-glow-t">{glow_words(GLOW)}</p></div></div></section>')},
    # 10. Histoire en frise : à droite, une photo qui change à chaque étape (plus de vide).
    {'id': 'histoire-en-frise',
     'does': "Les grandes étapes de la marque, de l'idée à aujourd'hui, à gauche ; à droite une photo qui change à chaque étape lue. Uniquement des faits du client : ce qu'on ne sait pas reste à compléter.",
     'anim': "Le trait de la frise se remplit pendant la lecture ; la photo de droite change avec l'étape.",
     'html': ('<section class="rv-s rv-fr" data-rv-in data-rv-frise><div class="rv-in rv-fr-g"><div class="rv-fr-l">'
              '<span class="rv-eb">Notre histoire</span><h3 class="rv-h">D\'une idée <em>à ta tasse</em></h3><ol class="rv-fr-ol">'
              + ''.join(f'<li data-rv-fs="{i}"{" class=\"on\"" if i == 0 else ""}><span class="rv-fr-y">{y}</span><b>{t}</b><p>{tx}</p></li>' for i, (_, y, t, tx) in enumerate(FRISE))
              + '</ol></div><div class="rv-fr-ph">' + ''.join(f'<img src="photos/{im}.jpg" alt=""{" class=\"on\"" if i == 0 else ""} data-rv-fi="{i}">' for i, (im, *_ ) in enumerate(FRISE))
              + '</div></div></section>')},
    # 15. Histoires façon « stories » : toute la largeur, ronds à gauche et aperçu téléphone qui se joue à droite.
    {'id': 'histoires-facon-stories',
     'does': "Les histoires de la marque comme sur Instagram : des ronds à toucher d'un côté, un aperçu de téléphone qui les joue de l'autre, avec la barre de progression et le produit à ajouter.",
     'anim': "Les histoires défilent toutes seules dans le téléphone ; un rond touché saute à son histoire.",
     'html': ('<section class="rv-s rv-sto" data-rv-in data-rv-sto><div class="rv-in rv-sto-g"><div class="rv-sto-l">'
              '<span class="rv-eb">En ce moment</span><h3 class="rv-h">Les histoires <em>de la semaine</em></h3>'
              '<p>Les coulisses, les nouveautés et les petits rituels de la maison, comme sur ton téléphone.</p><div class="rv-sto-r">'
              + ''.join(f'<button type="button" data-rv-si="{i}"{" class=\"on\"" if i == 0 else ""}><span><img src="photos/{im}.jpg" alt=""></span>{t}</button>' for i, (im, t) in enumerate(STORIES))
              + '</div></div><div class="rv-sto-ph"><div class="rv-sto-sc"><div class="rv-sto-bars">' + '<i><b></b></i>' * len(STORIES) + '</div>'
              + ''.join(f'<img src="photos/{im}.jpg" alt=""{" class=\"on\"" if i == 0 else ""} data-rv-sm="{i}">' for i, (im, _) in enumerate(STORIES))
              + f'<div class="rv-sto-hd"><span class="rv-sto-av">{I_CUP}</span><b>Brindi</b></div>'
              '<div class="rv-sto-tag"><img src="photos/jasmin.jpg" alt=""><span><b>Thé vert jasmin</b><small>7,50 €</small></span><a href="#" onclick="return false">Ajouter</a></div>'
              '</div></div></div></section>')},
    # 17. Cartes qui s'empilent : hors du cadre gris, fond de la marque, un vrai paragraphe et un détail par carte.
    {'id': 'cartes-qui-s-empilent', 'demoFrame': False, 'tags': ['tend2', 'all'],
     'does': "Les étapes de la marque en grandes cartes qui viennent se poser l'une sur l'autre pendant le défilement. Chaque carte : une photo, un numéro, un titre, un vrai paragraphe et un détail.",
     'anim': "Chaque carte glisse et se pose sur la précédente, qui recule légèrement.",
     'html': ('<section class="rv-s rv-stk" data-rv-stk><div class="rv-in"><div class="rv-hd"><span class="rv-eb">De la feuille à ta tasse</span>'
              '<h3 class="rv-h">Quatre étapes, <em>aucun raccourci</em></h3></div><div class="rv-stk-l">'
              + ''.join(f'<article class="rv-stk-c" style="--i:{i}"><div class="rv-stk-ph"><img src="photos/{im}.jpg" alt=""></div><div class="rv-stk-t"><small>{n}</small><b>{t}</b><p>{tx}</p><span class="rv-stk-d">{d}</span></div></article>'
                        for i, (im, n, t, tx, d) in enumerate(STACK))
              + '</div></div></section>')},
    # 19. Compose ton coffret : refaite sur toute la largeur. Seulement si le client a une offre coffret (prix du coffret
    # et remise réels, sinon pas de remise affichée).
    {'id': 'compose-ton-coffret',
     'does': "Le client compose son coffret : l'explication à gauche, les mélanges avec leur nom et leur prix au centre, le coffret qui se remplit avec le total et le bouton à droite. Seulement si le client a une vraie offre coffret.",
     'anim': "Le mélange choisi saute dans le coffret ; la barre et le total suivent.",
     'html': ('<section class="rv-s rv-box" data-rv-in data-rv-box data-n="3"><div class="rv-in"><div class="rv-box-hd"><div><span class="rv-eb">Coffret à composer</span>'
              '<h3 class="rv-h">Compose ton coffret <em>de trois pauses</em></h3></div><ol class="rv-box-how"><li><b>1</b>Choisis trois mélanges</li><li><b>2</b>Ils se rangent dans ton coffret</li><li><b>3</b>Ajoute le coffret au panier</li></ol></div>'
              '<div class="rv-box-g"><div class="rv-box-ch">'
              + ''.join(f'<button type="button" data-rv-b="{im}" data-name="{n}" data-price="{pr}"><img src="photos/{im}.jpg" alt=""><b>{n}</b><small>{eur(pr)}</small><i aria-hidden="true">+</i></button>' for im, n, pr in BLENDS)
              + '</div><aside class="rv-box-s"><b>Ton coffret</b><div class="rv-box-sl" data-rv-bs>' + '<span class="rv-box-e">Mélange à choisir</span>' * 3 + '</div>'
              '<div class="rv-fs-b"><i data-rv-bb></i></div><p data-rv-bm></p><div class="rv-sr tt"><span>Total</span><b data-rv-bt>0 €</b></div>'
              '<small class="rv-box-n">Prix et remise du coffret : ceux de l\'offre réelle de la marque.</small>'
              '<button class="rv-btn rv-pay" type="button" data-rv-bgo disabled>Ajouter le coffret au panier</button></aside></div></div></section>')},
    # 20. Compte à rebours en bloc : refait sur toute la largeur (photo de l'offre + compte à rebours). Il lit la vraie date
    # de fin de l'offre (data-end) et disparaît quand elle est passée ; jamais posé sans vraie offre datée.
    {'id': 'compte-a-rebours-en-bloc',
     'does': "Une vraie offre datée du client, sur toute la largeur : la photo de l'offre d'un côté, le titre, le texte, le compte à rebours jusqu'à la vraie date de fin et le bouton de l'autre. Disparaît à la fin de l'offre.",
     'anim': "Les chiffres tournent chaque seconde ; la section se retire à la fin de l'offre.",
     'html': ('<section class="rv-s rv-cd" data-rv-in data-rv-cd data-end="2026-12-31T23:59:59+01:00"><div class="rv-in rv-cd-g">'
              '<div class="rv-cd-ph"><img src="photos/trois-bols.jpg" alt=""><span class="rv-cd-tag">Offre limitée</span></div>'
              '<div class="rv-cd-t"><span class="rv-eb">[Nom de l\'offre]</span><h3 class="rv-h">L\'offre de saison <em>se termine bientôt</em></h3>'
              '<p>Ce que comprend l\'offre réelle de la marque, et jusqu\'à quand : [à compléter avec la vraie offre].</p>'
              '<div class="rv-cd-n">' + ''.join(f'<div><b data-rv-c="{k}">00</b><small>{l}</small></div>' for k, l in (('d', 'jours'), ('h', 'heures'), ('m', 'minutes'), ('s', 'secondes')))
              + '</div><a class="rv-btn" href="#" onclick="return false">Voir l\'offre</a></div></div></section>')},
    # Étude de 65 thèmes : image et texte simple (15 thèmes sur 27 en alimentaire), côté de l'image inversable (Disposition).
    {'id': 'image-et-texte', 'title': 'Image et texte', 'kind': 'Contenu · toutes les pages',
     'does': "Une grande photo d'un côté, un titre, un texte court et un bouton de l'autre : la section de base des thèmes qui se vendent pour raconter un moment, une gamme ou une fabrication. Deux à la suite : inverser le côté de l'image.",
     'anim': "La photo glisse doucement à l'arrivée.", 'family': 'classique', 'style': None, 'role': 'contenu', 'tags': ['content'], 'demoFrame': False,
     'html': ('<section class="rv-s rv-it" data-rv-in><div class="rv-in rv-it-g"><div class="rv-it-ph"><img src="photos/bol-verre.jpg" alt=""></div>'
              '<div class="rv-it-t"><span class="rv-eb">De la feuille à la tasse</span><h3 class="rv-h">Les feuilles <em>s\'ouvrent</em> lentement</h3>'
              '<p>Un texte court qui fait ressentir le moment : ce que le client vit, voit et sent, en deux ou trois phrases vraies.</p>'
              '<a class="rv-btn" href="#" onclick="return false">Découvrir les mélanges</a></div></div></section>')},
    # Bannières de gamme (16 thèmes sur 27 juste après l'ouverture) : 2 ou 3 grandes photos qui mènent à une famille.
    {'id': 'bannieres-de-gamme', 'title': 'Bannières de gamme', 'kind': 'Orientation · accueil',
     'does': "Deux ou trois grandes photos côte à côte, chacune avec le nom d'une gamme et un bouton vers elle : on oriente le visiteur juste après l'ouverture, comme dans la plupart des thèmes vendus.",
     'anim': "La photo s'agrandit un peu au survol.", 'family': 'classique', 'style': None, 'role': 'navigation', 'tags': ['content'], 'demoFrame': False,
     'html': ('<section class="rv-s rv-bg3" data-rv-in><div class="rv-in"><div class="rv-bg3-g">'
              + ''.join(f'<a class="rv-bg3-c" href="#" onclick="return false"><img src="photos/{im}.jpg" alt=""><span class="rv-bg3-t"><small>{eb}</small><b>{t}</b><span class="rv-bg3-go">{b} {I_ARROW}</span></span></a>'
                        for im, eb, t, b in (('jasmin', 'Thés', 'Les thés verts et noirs', 'Voir les thés'), ('verveine', 'Infusions', 'Les infusions du soir', 'Voir les infusions'), ('trio-tasses', 'Coffrets', 'Les coffrets à offrir', 'Voir les coffrets')))
              + '</div></div></section>')},
    # Grande photo de respiration (thèmes récents : une image pleine largeur entre deux blocs de produits).
    {'id': 'grande-photo-de-respiration', 'title': 'Grande photo de respiration', 'kind': 'Image · milieu de page',
     'does': "Une photo pleine largeur au milieu de la page, avec une phrase courte et un bouton posés sur sa partie calme : la respiration que les thèmes vendus placent entre deux moments d'information.",
     'anim': "La photo bouge un peu plus lentement que la page au défilement.", 'family': 'classique', 'style': None, 'role': 'mise en avant', 'tags': ['content'], 'demoFrame': False,
     'html': ('<section class="rv-gp" data-rv-in><img src="photos/fenetre.jpg" alt=""><div class="rv-gp-t"><span class="rv-eb">Le moment</span>'
              '<h3 class="rv-h">Quelques minutes <em>rien qu\'à toi</em></h3><a class="rv-btn" href="#" onclick="return false">Choisir sa pause</a></div></section>')},
    # Produits en onglets (12 accueils sur 22 en mode, 9 sur 18 polyvalents) : une seule section de cartes, plusieurs sélections.
    {'id': 'produits-en-onglets', 'title': 'Produits en onglets', 'kind': 'Produits · accueil',
     'does': "Les produits en une seule rangée de cartes, avec des onglets pour passer d'une sélection à l'autre (meilleures ventes, nouveautés, coffrets) : remplace plusieurs grilles de produits.",
     'anim': "Les cartes changent en fondu quand on touche un onglet.", 'family': 'classique', 'style': None, 'role': 'produits', 'tags': ['content'], 'demoFrame': False,
     'html': ('<section class="rv-s rv-pt" data-rv-in data-rv-pt><div class="rv-in"><div class="rv-hd"><span class="rv-eb">La boutique</span><h3 class="rv-h">Trouve <em>ta pause</em></h3>'
              '<div class="rv-chips" role="tablist">' + ''.join(f'<button type="button" role="tab" aria-pressed="{"true" if i == 0 else "false"}" data-rv-ptb="{i}">{t}</button>' for i, t in enumerate(('Les plus aimés', 'Nouveautés', 'Pour le soir'))) + '</div></div>'
              + ''.join(f'<div class="rv-pt-g" data-rv-ptp="{i}"{" hidden" if i else ""}>' + ''.join(prod_card(*PRODS[k]) for k in ks) + '</div>' for i, ks in enumerate(((0, 1, 2, 3), (2, 4, 5, 0), (3, 4, 5, 2))))
              + '<a class="rv-lk" href="#" onclick="return false">Voir toute la boutique ' + I_ARROW + '</a></div></section>')},
    # Produits liés compacts (fiche : 14 sur 22, panier : suggestions dans un tiers des thèmes).
    {'id': 'vous-aimerez-aussi', 'title': 'Vous aimerez aussi', 'kind': 'Produits · fiche produit ou panier',
     'does': "Une rangée compacte de quatre produits à la fin de la fiche produit ou sous le panier, chacun avec son prix et un bouton pour l'ajouter : la fin de page des thèmes vendus.",
     'anim': "Les cartes montent à l'arrivée.", 'family': 'classique', 'style': None, 'role': 'produits', 'tags': ['content'], 'demoFrame': False,
     'html': ('<section class="rv-s rv-ya" data-rv-in><div class="rv-in"><div class="rv-ya-hd"><h3 class="rv-h">Vous aimerez <em>aussi</em></h3>'
              '<a class="rv-lk" href="#" onclick="return false">Tout voir ' + I_ARROW + '</a></div><div class="rv-ya-g">'
              + ''.join(prod_card(*PRODS[k]) for k in (1, 2, 4, 5)) + '</div></div></section>')},
    # Vidéo en bande (milieu de page, sur fond sombre : Moocha, Mixture, Orgafe, Veloza).
    {'id': 'video-en-bande', 'title': 'Vidéo en bande', 'kind': 'Vidéo · milieu de page',
     'does': "Une bande sombre au milieu de la page avec une grande image de la vidéo et un bouton de lecture ; la vidéo s'ouvre au clic. Seulement si la marque a une vraie vidéo.",
     'anim': "Le bouton de lecture respire doucement.", 'family': 'classique', 'style': None, 'role': 'contenu', 'tags': ['content'], 'demoFrame': False,
     'html': ('<section class="rv-s rv-vb" data-rv-in data-rv-vb><div class="rv-in rv-vb-g"><div class="rv-vb-t"><span class="rv-eb">En images</span><h3 class="rv-h">Le geste, <em>du début à la fin</em></h3>'
              '<p>Ce que montre la vraie vidéo de la marque, en une phrase.</p></div>'
              '<button type="button" class="rv-vb-ph" data-rv-vbp aria-label="Lire la vidéo"><img src="photos/film-affiche.jpg" alt=""><span class="rv-vb-pl">' + I_PLAY + '</span></button></div></section>')},
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
/* Quatre promesses : quatre colonnes. Sans photo, chaque promesse devient une carte avec son icône (pas de vide). */
.rv-eng-g:has(>article:nth-child(4)){grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}
.rv-eng-g article:not(:has(.rv-eng-ph)){background:rgba(255,255,255,.82);border-radius:22px;padding:30px 26px;gap:12px;box-shadow:0 1px 0 rgba(35,58,46,.06);transition:transform .35s,box-shadow .35s}
.rv-eng-g article:not(:has(.rv-eng-ph)):hover{transform:translateY(-4px);box-shadow:0 16px 34px rgba(35,58,46,.12)}
.rv-eng-g article>.rv-ic{margin-bottom:8px}
@container (max-width:900px){.rv-eng-hd{grid-template-columns:1fr;gap:14px}.rv-eng-g{grid-template-columns:1fr;gap:34px}.rv-eng-ph{aspect-ratio:16/10}
  .rv-eng-g:has(>article:nth-child(4)){grid-template-columns:repeat(2,minmax(0,1fr))}}
@container (max-width:560px){.rv-eng-g:has(>article:nth-child(4)){grid-template-columns:1fr}}
/* 33. Questions : accordéon commun (+ qui devient −), quatre présentations */
.rv-acc{display:grid;gap:12px;align-content:start}
.rv-q{background:var(--c4,#f2f5f2);border-radius:18px;transition:background .3s,box-shadow .3s}
.rv-q[open]{background:#fff;box-shadow:0 14px 34px rgba(35,58,46,.1)}
.rv-q summary{list-style:none;cursor:pointer;display:flex;flex-direction:row-reverse;justify-content:space-between;align-items:center;gap:18px;padding:20px 22px;font:600 1.02rem/1.35 var(--f-ui);color:var(--b-dark)}
.rv-q summary::-webkit-details-marker{display:none}
.rv-pl{position:relative;width:34px;height:34px;border-radius:50%;background:var(--b-dark);flex:none;transition:transform .35s,background .3s}
.rv-pl::before,.rv-pl::after{content:"";position:absolute;left:50%;top:50%;width:12px;height:1.8px;margin:-.9px 0 0 -6px;background:var(--b-gold,var(--c5,#C9A04E));border-radius:2px;transition:transform .35s}
.rv-pl::after{transform:rotate(90deg)}
.rv-q[open] .rv-pl{transform:rotate(180deg)}
.rv-q[open] .rv-pl::after{transform:rotate(0)}
.rv-a{padding:0 22px 22px}
.rv-a p{margin:0;font-size:.96rem;line-height:1.65;opacity:.82;max-width:62ch}
.rv-q[open] .rv-a{animation:rvA .45s cubic-bezier(.2,.8,.2,1)}
@keyframes rvA{from{opacity:0;transform:translateY(-6px)}}
.rv-acc.lp .rv-q summary{flex-direction:row;justify-content:flex-start}
.rv-acc.lp .rv-a{padding-left:74px}
.rv-lk{display:inline-flex;gap:8px;align-items:center;color:var(--b-dark);font:700 .92rem var(--f-ui);text-decoration:none;border-bottom:1.5px solid var(--b-gold,var(--c5,#C9A04E));padding-bottom:4px;width:max-content}
.rv-lk svg{width:18px;height:18px;transition:transform .3s}.rv-lk:hover svg{transform:translateX(4px)}
.rv-ct{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px 16px;align-items:center;background:var(--c4,#f2f5f2);border-radius:22px;padding:22px}
.rv-ct b{font:600 1.25rem/1.2 var(--f-title);color:var(--b-dark)}
.rv-ct p{margin:4px 0 0;font-size:.9rem;line-height:1.5;opacity:.8}
.rv-ct .rv-btn{grid-column:1/-1;justify-self:start}
.rv-ct.dk{background:var(--b-dark);color:#fff;grid-template-columns:auto minmax(0,1fr) auto;padding:30px 34px}
.rv-ct.dk b{color:#fff}.rv-ct.dk .rv-ic{background:rgba(255,255,255,.1)}.rv-ct.dk .rv-btn{grid-column:auto}
/* a) deux colonnes avec contact */
.rv-fq2-g{grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:56px;align-items:start}
.rv-fq2-l{display:grid;gap:18px;align-content:start;position:sticky;top:96px}
.rv-fq2-l>p{margin:0;font-size:1rem;line-height:1.65;opacity:.8}
.rv-fqf{background:var(--c4,#f2f5f2)}.rv-fqf .rv-q{background:#fff}
/* b) cartes sur fond foncé */
.rv-fqc{background:var(--b-dark);color:#fff}.rv-fqc .rv-h{color:#fff}
.rv-fqc .rv-h em,.rv-fqa-bi .rv-h em{color:var(--b-gold,var(--c5,#C9A04E))}
.rv-fqc-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-items:start}
.rv-fqc .rv-q{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14)}
.rv-fqc .rv-q[open]{background:rgba(255,255,255,.12);box-shadow:none}
.rv-fqc .rv-q summary{color:#fff;flex-direction:column-reverse;align-items:flex-start;justify-content:space-between;gap:22px;min-height:160px;padding:24px;font:500 1.3rem/1.25 var(--f-title)}
.rv-fqc .rv-a{padding:0 24px 24px}
.rv-fqc .rv-pl{background:var(--b-gold,var(--c5,#C9A04E))}.rv-fqc .rv-pl::before,.rv-fqc .rv-pl::after{background:var(--b-dark)}
.rv-fqc-f{display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:center}
.rv-fqc-f p{margin:0;opacity:.8}
/* c) avec photo et thèmes */
.rv-fqp-g{grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);gap:56px;align-items:center}
.rv-fqp-ph{position:relative;aspect-ratio:1/1.05;max-height:600px;width:100%;border-radius:26px;overflow:hidden}
.rv-fqp-ph img{width:100%;height:100%;object-fit:cover;transform:scale(1.06);transition:transform 1.6s cubic-bezier(.2,.8,.2,1)}
.rv-on .rv-fqp-ph img{transform:none}
.rv-fqp-tag{position:absolute;left:18px;right:18px;bottom:18px;display:flex;gap:14px;align-items:center;background:rgba(255,255,255,.94);border-radius:18px;padding:14px 16px}
.rv-fqp-tag b{display:block;font:600 1.1rem var(--f-title);color:var(--b-dark)}.rv-fqp-tag small{font-size:.84rem;opacity:.75}
.rv-fqp-r{display:grid;gap:20px;align-content:start}
.rv-chips{display:flex;flex-wrap:wrap;gap:8px}
.rv-chips button{border:1.5px solid rgba(35,58,46,.18);background:transparent;border-radius:999px;padding:10px 18px;font:600 .88rem var(--f-ui);color:var(--b-dark);cursor:pointer;transition:all .25s}
.rv-chips button[aria-pressed="true"]{background:var(--b-dark);border-color:var(--b-dark);color:#fff}
.rv-q.rv-hid{display:none}
/* d) bulles de discussion */
.rv-bub{background:var(--c4,#f2f5f2)}
.rv-bub-g{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:48px;align-items:center}
.rv-bub-l{display:grid;gap:16px;align-content:start}.rv-bub-l>p{margin:0;opacity:.8}
.rv-bub-qs{display:grid;gap:10px}
.rv-bub-q button{width:100%;text-align:left;border:0;background:#fff;border-radius:16px;padding:16px 18px;font:600 .95rem var(--f-ui);color:var(--b-dark);cursor:pointer;box-shadow:0 4px 14px rgba(35,58,46,.06);transition:transform .25s,opacity .25s}
.rv-bub-q button:hover{transform:translateX(6px)}.rv-bub-q button.dn{opacity:.5}
.rv-bub-ch{background:#fff;border-radius:28px;box-shadow:0 22px 50px rgba(35,58,46,.14);display:flex;flex-direction:column;height:460px;overflow:hidden}
.rv-bub-hd{display:flex;gap:12px;align-items:center;padding:18px 20px;border-bottom:1px solid rgba(35,58,46,.08)}
.rv-bub-hd .rv-ic{width:42px;height:42px}.rv-bub-hd .rv-ic svg{width:20px;height:20px}
.rv-bub-hd b{display:block;font:700 .95rem var(--f-ui);color:var(--b-dark)}.rv-bub-hd small{font-size:.78rem;opacity:.7}
.rv-bub-m{flex:1;overflow:auto;padding:20px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin}
.rv-bb{max-width:82%;padding:12px 16px;border-radius:20px;font-size:.93rem;line-height:1.5;animation:rvA .35s both}
.rv-bb.me{align-self:flex-end;background:var(--b-dark);color:#fff;border-bottom-right-radius:6px}
.rv-bb.it{align-self:flex-start;background:var(--c4,#f2f5f2);color:var(--b-dark);border-bottom-left-radius:6px}
.rv-bb.ty{display:flex;gap:4px}.rv-bb.ty i{width:7px;height:7px;border-radius:50%;background:var(--b-dark);opacity:.5;animation:rvT 1s infinite}
.rv-bb.ty i:nth-child(2){animation-delay:.15s}.rv-bb.ty i:nth-child(3){animation-delay:.3s}
@keyframes rvT{50%{transform:translateY(-4px);opacity:.2}}
/* 41. page des questions fréquentes */
.rv-fqa{font-family:var(--f-ui);color:var(--b-ink)}
.rv-fqa-bd{background:var(--b-dark);color:#fff;padding:88px max(24px,5vw) 120px}
.rv-fqa-bi{max-width:860px;margin:0 auto;display:grid;gap:18px;justify-items:center;text-align:center}
.rv-fqa-bi .rv-h{color:#fff;font-size:clamp(2.2rem,4.4vw,3.6rem)}
.rv-fqa-s{display:flex;align-items:center;gap:12px;width:100%;background:#fff;border-radius:999px;padding:8px 10px 8px 24px;margin-top:10px;box-shadow:0 20px 44px rgba(0,0,0,.25)}
.rv-fqa-s svg{width:22px;height:22px;color:var(--b-dark);flex:none}
.rv-fqa-s input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:500 1.05rem var(--f-ui);color:var(--b-dark);padding:14px 0}
.rv-fqa-m{padding-top:0}
.rv-fqa-th{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-top:-64px;position:relative}
.rv-fqa-th a{background:#fff;border-radius:22px;padding:24px;display:grid;gap:10px;text-decoration:none;color:var(--b-dark);box-shadow:0 16px 36px rgba(35,58,46,.12);transition:transform .3s}
.rv-fqa-th a:hover{transform:translateY(-4px)}
.rv-fqa-th b{font:600 1.25rem/1.2 var(--f-title)}.rv-fqa-th small{font-size:.84rem;opacity:.7}
.rv-fqa-gr{display:grid;grid-template-columns:minmax(0,.4fr) minmax(0,1fr);gap:40px;padding-top:28px;border-top:1px solid rgba(35,58,46,.1);scroll-margin-top:110px}
.rv-fqa-gr h3{margin:0;font:500 clamp(1.6rem,2.6vw,2.1rem)/1.15 var(--f-title);color:var(--b-dark)}
.rv-fqa-gr[hidden]{display:none}
.rv-fqa-no{margin:0;text-align:center;font-size:1rem;opacity:.8}
@container (max-width:900px){.rv-fq2-g,.rv-fqp-g,.rv-bub-g{grid-template-columns:1fr;gap:32px}.rv-fq2-l{position:static}.rv-fqc-g{grid-template-columns:repeat(2,minmax(0,1fr))}.rv-fqa-th{grid-template-columns:repeat(2,minmax(0,1fr))}.rv-fqa-gr{grid-template-columns:1fr;gap:16px}.rv-fqp-ph{aspect-ratio:16/11}.rv-ct.dk{grid-template-columns:auto minmax(0,1fr)}.rv-ct.dk .rv-btn{grid-column:1/-1}}
@container (max-width:560px){.rv-fqc-g{grid-template-columns:1fr}.rv-fqc .rv-q summary{min-height:0;flex-direction:row-reverse;align-items:center;padding:18px;font-size:1.12rem}.rv-fqc .rv-a{padding:0 18px 18px}.rv-q summary{padding:16px 16px;font-size:.96rem}.rv-a{padding:0 16px 18px}.rv-acc.lp .rv-a{padding-left:16px}.rv-fqa-bd{padding:56px 16px 96px}.rv-fqa-th{gap:10px}.rv-fqa-th a{padding:16px}.rv-fqa-th .rv-ic{width:42px;height:42px}.rv-fqa-th b{font-size:1.05rem}.rv-bub-ch{height:420px}.rv-ct.dk{padding:22px}.rv-fqa-s{padding-left:16px}}
/* 21. Inscription : champ commun, fenêtre et trois bandes */
.rv-nl{display:flex;gap:8px;background:#fff;border:1.5px solid rgba(35,58,46,.16);border-radius:999px;padding:6px;width:100%;max-width:480px;transition:border-color .3s,box-shadow .3s}
.rv-nl:focus-within{border-color:var(--b-dark);box-shadow:0 0 0 4px rgba(35,58,46,.08)}
.rv-nl input{flex:1;min-width:0;border:0;outline:0;background:transparent;padding:10px 14px;font:500 .98rem var(--f-ui);color:var(--b-dark)}
.rv-nl button{border:0;border-radius:999px;background:var(--b-dark);color:#fff;padding:12px 22px;font:700 .9rem var(--f-ui);cursor:pointer;white-space:nowrap;transition:transform .25s}
.rv-nl button:hover{transform:translateY(-1px)}
.rv-nl.col{flex-direction:column;border-radius:18px;padding:8px}.rv-nl.col button{border-radius:12px;padding:14px}
.rv-nl-n{font-size:.8rem;opacity:.7;line-height:1.5}
.rv-pop{background:var(--b-dark);display:grid;place-items:center;min-height:620px;overflow:hidden}
.rv-pop-im{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55}
.rv-pop-bg{display:none}
.rv-pop-c{position:relative;display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);width:min(100%,880px);background:#fff;border-radius:26px;overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,.3);animation:rvPop .6s cubic-bezier(.2,.8,.2,1) both}
@keyframes rvPop{from{opacity:0;transform:translateY(26px) scale(.98)}}
.rv-pop-ph img{width:100%;height:100%;object-fit:cover;display:block;min-height:420px}
.rv-pop-t{padding:46px 40px;display:grid;gap:14px;align-content:center}
.rv-pop-t .rv-h{font-size:clamp(1.7rem,2.8vw,2.3rem)}
.rv-pop-t p{margin:0;line-height:1.6;opacity:.8}
.rv-pop-no{justify-self:start;border:0;background:none;padding:4px 0;font:600 .86rem var(--f-ui);color:var(--b-dark);opacity:.65;text-decoration:underline;text-underline-offset:4px;cursor:pointer}
.rv-pop-x{position:absolute;top:14px;right:14px;width:38px;height:38px;border-radius:50%;border:0;background:rgba(255,255,255,.92);color:var(--b-dark);font-size:1.4rem;line-height:1;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.12)}
/* Sur un vrai site : fenêtre posée par-dessus la page, une seule fois. */
.rv-pop.rv-live{position:fixed;inset:0;z-index:9000;min-height:0;padding:16px;background:none;opacity:0;pointer-events:none;transition:opacity .4s}
.rv-pop.rv-live .rv-pop-im{display:none}
.rv-pop.rv-live .rv-pop-bg{display:block;position:absolute;inset:0;background:rgba(15,25,20,.55);backdrop-filter:blur(3px)}
.rv-pop.rv-live .rv-pop-c{animation:none;transform:translateY(24px);transition:transform .5s cubic-bezier(.2,.8,.2,1)}
.rv-pop.rv-live.open{opacity:1;pointer-events:auto}.rv-pop.rv-live.open .rv-pop-c{transform:none}
.rv-nlp-g{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:56px;align-items:center}
.rv-nlp-ph{aspect-ratio:5/4;border-radius:26px;overflow:hidden}
.rv-nlp-ph img{width:100%;height:100%;object-fit:cover;transform:scale(1.06);transition:transform 1.6s cubic-bezier(.2,.8,.2,1)}
.rv-on .rv-nlp-ph img{transform:none}
.rv-nlp-t{display:grid;gap:18px;align-content:center}.rv-nlp-t p{margin:0;line-height:1.65;opacity:.8;max-width:52ch}
.rv-nlc{background:var(--b-primary);color:#fff}
.rv-nlc .rv-h{color:#fff}.rv-nlc .rv-h em{color:var(--b-gold,var(--c5,#C9A04E))}.rv-nlc .rv-eb{color:#fff;opacity:.85}
.rv-nlc .rv-hd p{margin:0;opacity:.85;max-width:52ch}
.rv-nlc .rv-ic{background:rgba(255,255,255,.14);color:#fff}
.rv-nlc .rv-nl{border-color:transparent;margin-top:8px}
.rv-nla{background:var(--b-dark);color:#fff}.rv-nla .rv-h{color:#fff}.rv-nla .rv-h em{color:var(--b-gold,var(--c5,#C9A04E))}
.rv-nla-g{grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:56px;align-items:center}
.rv-nla-l{display:grid;gap:26px}
.rv-nla-l ul{list-style:none;margin:0;padding:0;display:grid;gap:20px}
.rv-nla-l li{display:flex;gap:16px;align-items:flex-start;font-size:.95rem;line-height:1.55;opacity:.9}
.rv-nla-l li b{display:block;font:600 1.2rem/1.25 var(--f-title);margin-bottom:4px;color:#fff}
.rv-nla-l .rv-ic{background:rgba(255,255,255,.1)}
.rv-nla-c{background:#fff;color:var(--b-ink);border-radius:24px;padding:32px;display:grid;gap:12px}
.rv-nla-c>b{font:600 1.6rem var(--f-title);color:var(--b-dark)}.rv-nla-c p{margin:0;opacity:.8}
.rv-nla-c .rv-nl{max-width:none}
/* 22. Pieds de page : quatre colonnes de liens */
.f1.rv-ft .top{grid-template-columns:minmax(0,1.3fr) repeat(4,minmax(0,.7fr))}
.f4.rv-ft .body{grid-template-columns:minmax(0,1.2fr) repeat(4,minmax(0,.7fr))}
.nx5.rv-ft .nx5-top{grid-template-columns:minmax(0,1.4fr) repeat(4,minmax(0,1fr))}
.f2.rv-ft .low{display:grid;grid-template-columns:minmax(0,1.1fr) repeat(4,minmax(0,.8fr));align-items:start;gap:26px;padding:34px 36px 24px}
.f2.rv-ft .low .brand{display:grid;gap:14px;align-content:start}
.f2.rv-ft .low .cp{grid-column:1/-1;border-top:1px solid rgba(255,255,255,.15);padding-top:16px;opacity:.7}
.f3.rv-ft .lg2{display:flex;gap:16px;flex-wrap:wrap;justify-content:center}
.f3.rv-ft .lg2 a{color:inherit;opacity:.7;font-size:.82rem;text-decoration:none}
.rv-ft li[hidden],.rv-ft a[hidden],.rv-ft [data-rv-empty]{display:none}
.nx5.rv-ft .nx5-big{font-size:clamp(3.4rem,15cqi,14rem)}.nx5.rv-ft .nx5-big span{white-space:pre}
@container (max-width:1000px){.f1.rv-ft .top,.f4.rv-ft .body,.nx5.rv-ft .nx5-top,.f2.rv-ft .low{grid-template-columns:repeat(2,minmax(0,1fr))}.f1.rv-ft .top .brand,.f4.rv-ft .body>div:first-child,.nx5.rv-ft .nx5-top>div:first-child,.f2.rv-ft .low .brand{grid-column:1/-1}}
@container (max-width:760px){.f1.rv-ft .top{grid-template-columns:1fr}.f2.rv-ft .low{padding:26px 20px}}
@container (max-width:900px){.rv-pop-c,.rv-nlp-g,.rv-nla-g{grid-template-columns:1fr}.rv-nlp-g,.rv-nla-g{gap:32px}.rv-pop-ph img{min-height:0;height:200px}.rv-pop-t{padding:28px 22px}.rv-pop{min-height:0}}
@container (max-width:480px){.rv-nl:not(.col){flex-direction:column;border-radius:18px}.rv-nl:not(.col) button{border-radius:12px}.rv-nla-c{padding:22px}}
/* 36. Panier sur toute la largeur ; 23. emballage cadeau en ligne à cocher */
.rv-cart{background:var(--c4,#f2f5f2)}
.rv-cart-hd{display:flex;flex-wrap:wrap;gap:18px;align-items:center;justify-content:space-between}
.rv-steps{list-style:none;margin:0;padding:0;display:flex;gap:10px;flex-wrap:wrap;font:600 .84rem var(--f-ui);color:var(--b-dark)}
.rv-steps li{display:flex;gap:8px;align-items:center;opacity:.5}
.rv-steps li+li::before{content:"";width:28px;height:1.5px;background:currentColor;opacity:.4;margin-right:2px}
.rv-steps li.on{opacity:1}
.rv-steps i{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-style:normal;border:1.5px solid currentColor}
.rv-steps li.on i{background:var(--b-dark);color:#fff;border-color:var(--b-dark)}
.rv-cart-g{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:32px;align-items:start}
.rv-cart-l{display:grid;gap:16px}
.rv-fs{background:#fff;border-radius:18px;padding:16px 20px;display:grid;gap:10px}
.rv-fs p{margin:0;font:600 .92rem var(--f-ui);color:var(--b-dark)}
.rv-fs-b{height:8px;border-radius:99px;background:rgba(35,58,46,.1);overflow:hidden}
.rv-fs-b i{display:block;height:100%;width:0;background:var(--b-gold,var(--c5,#C9A04E));border-radius:99px;transition:width .6s cubic-bezier(.2,.8,.2,1)}
.rv-cil{display:grid;gap:12px}
.rv-ci{background:#fff;border-radius:20px;padding:14px;display:grid;grid-template-columns:96px minmax(0,1fr) auto;gap:18px;align-items:center;transition:opacity .3s,transform .3s}
.rv-ci img{width:96px;height:96px;object-fit:cover;border-radius:14px}
.rv-ci-t{display:grid;gap:4px;justify-items:start}.rv-ci-t b{font:600 1.15rem var(--f-title);color:var(--b-dark)}.rv-ci-t small{opacity:.7}
.rv-qty{display:inline-flex;align-items:center;gap:4px;border:1.5px solid rgba(35,58,46,.18);border-radius:999px;padding:3px;margin-top:6px}
.rv-qty button{width:30px;height:30px;border:0;border-radius:50%;background:transparent;font-size:1.1rem;color:var(--b-dark);cursor:pointer}
.rv-qty button:hover{background:var(--c4,#f2f5f2)}
.rv-qty span{min-width:22px;text-align:center;font-weight:700}
.rv-ci-r{display:grid;gap:10px;justify-items:end}.rv-ci-r b{font:700 1rem var(--f-ui);color:var(--b-dark);white-space:nowrap}
.rv-ci-x{border:0;background:none;color:var(--b-dark);opacity:.55;cursor:pointer;padding:4px}.rv-ci-x svg{width:20px;height:20px}.rv-ci-x:hover{opacity:1}
.rv-ci.out{opacity:0;transform:translateX(20px)}
.rv-cart-e{margin:0;padding:24px;background:#fff;border-radius:18px;text-align:center}
.rv-gift{display:grid;grid-template-columns:auto auto minmax(0,1fr) auto;gap:14px;align-items:center;background:#fff;border-radius:18px;padding:14px 18px;cursor:pointer;border:1.5px solid transparent;transition:border-color .3s}
.rv-gift:has(input:checked){border-color:var(--b-dark)}
.rv-gift input{width:20px;height:20px;accent-color:var(--b-dark)}
.rv-gift .rv-ic{width:44px;height:44px}.rv-gift .rv-ic svg{width:20px;height:20px}
.rv-gift b{display:block;color:var(--b-dark)}.rv-gift small{opacity:.7}.rv-gift em{font-style:normal;font-weight:700;color:var(--b-dark);white-space:nowrap}
.rv-note{background:#fff;border-radius:18px;padding:14px 18px}
.rv-note summary{cursor:pointer;font-weight:600;color:var(--b-dark)}
.rv-note textarea{width:100%;box-sizing:border-box;margin-top:12px;border:1.5px solid rgba(35,58,46,.16);border-radius:12px;padding:12px;font:inherit;resize:vertical}
.rv-sum{background:#fff;border-radius:24px;padding:28px;display:grid;gap:14px;position:sticky;top:96px;box-shadow:0 16px 40px rgba(35,58,46,.08)}
.rv-sum h3{margin:0 0 4px;font:500 1.7rem var(--f-title);color:var(--b-dark)}
.rv-sr{display:flex;justify-content:space-between;gap:12px;font-size:.96rem}.rv-sr[hidden]{display:none}
.rv-sr.tt{border-top:1px solid rgba(35,58,46,.12);padding-top:14px;font:700 1.15rem var(--f-ui);color:var(--b-dark)}
.rv-pay{width:100%;box-sizing:border-box;background:var(--b-dark);color:#fff;padding:17px 20px}
.rv-sum-n{display:flex;gap:10px;align-items:flex-start;margin:0;font-size:.82rem;line-height:1.5;opacity:.75}.rv-sum-n svg{width:18px;height:18px;flex:none;margin-top:1px}
.rv-sum .rv-lk{justify-self:center}
@container (max-width:900px){.rv-cart-g{grid-template-columns:1fr}.rv-sum{position:static}}
@container (max-width:480px){.rv-ci{grid-template-columns:72px minmax(0,1fr);gap:12px}.rv-ci img{width:72px;height:72px}.rv-ci-r{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center}.rv-gift{grid-template-columns:auto minmax(0,1fr) auto}.rv-gift .rv-ic{display:none}.rv-sum{padding:20px}}
/* 28. Fiche produit à onglets (4 présentations) ; 26. guide d'infusion */
.rv-tabs-b{background:#fff;border-radius:24px;padding:10px 30px 30px;box-shadow:0 14px 40px rgba(35,58,46,.07)}
.rv-tabs .rv-tabs-hd{display:grid;gap:10px}
.rv-tl{position:relative;display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid rgba(35,58,46,.12);margin-bottom:26px}
.rv-tl button{border:0;background:none;padding:18px 16px;font:600 .96rem var(--f-ui);color:var(--b-dark);opacity:.55;cursor:pointer;transition:opacity .3s}
.rv-tl button[aria-selected="true"]{opacity:1}
.rv-ind{position:absolute;bottom:-1px;height:2.5px;background:var(--b-gold,var(--c5,#C9A04E));border-radius:2px;transition:left .4s cubic-bezier(.2,.8,.2,1),width .4s cubic-bezier(.2,.8,.2,1)}
.rv-pn{animation:rvA .45s both}.rv-pn p{margin:0 0 12px;line-height:1.7;opacity:.85}
.rv-pn-g{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:36px;align-items:start}
.rv-pts{list-style:none;margin:0;padding:22px;background:var(--c4,#f2f5f2);border-radius:18px;display:grid;gap:12px}
.rv-pts li{display:flex;gap:10px;font-weight:600;color:var(--b-dark)}.rv-pts li::before{content:"";flex:none;width:8px;height:8px;margin-top:8px;border-radius:50%;background:var(--b-gold,var(--c5,#C9A04E))}
.rv-tb{width:100%;border-collapse:collapse}.rv-tb td{padding:12px 0;border-bottom:1px solid rgba(35,58,46,.1)}.rv-tb td+td{text-align:right;font-weight:700;color:var(--b-dark)}
.rv-rep{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:16px}
.rv-rep>div{background:var(--c4,#f2f5f2);border-radius:18px;padding:18px;display:grid;gap:6px;justify-items:start}
.rv-rep .rv-ic{width:44px;height:44px;margin-bottom:4px}.rv-rep .rv-ic svg{width:20px;height:20px}
.rv-rep small{font:700 .72rem var(--f-ui);letter-spacing:.12em;text-transform:uppercase;opacity:.6}.rv-rep b{font:600 1.15rem var(--f-title);color:var(--b-dark)}
.v-pastilles{background:var(--c4,#f2f5f2)}
.v-pastilles .rv-tl{border:0;gap:8px}.v-pastilles .rv-tl button{border-radius:999px;padding:12px 20px;background:var(--c4,#f2f5f2);opacity:1}
.v-pastilles .rv-tl button[aria-selected="true"]{background:var(--b-dark);color:#fff}.v-pastilles .rv-ind{display:none}
.v-accordeon .rv-tabs-b{background:none;box-shadow:none;padding:0}.v-accordeon .rv-a{padding-top:4px}
.v-cote .rv-tabs-b{display:grid;grid-template-columns:240px minmax(0,1fr);gap:36px;padding:30px}
.v-cote .rv-tl{flex-direction:column;border:0;border-right:1px solid rgba(35,58,46,.12);margin:0;gap:2px;align-self:start}
.v-cote .rv-tl button{text-align:left;padding:14px 16px;border-radius:12px 0 0 12px}.v-cote .rv-tl button[aria-selected="true"]{background:var(--c4,#f2f5f2)}
.v-cote .rv-ind{left:auto!important;right:-1px;width:2.5px!important;bottom:auto;transition:top .4s,height .4s}
.rv-gd-g{grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:56px;align-items:center}
.rv-gd-l{display:grid;gap:18px;justify-items:start}.rv-gd-l>p{margin:0;line-height:1.65;opacity:.8}
.rv-gd-p{width:100%;animation:rvA .4s both}.rv-gd-p p{margin:0;line-height:1.6;opacity:.8}
.rv-gd-l .rv-lk{border:0;background:none;padding:0 0 4px;border-bottom:1.5px solid var(--b-gold,var(--c5,#C9A04E));cursor:pointer;font-family:var(--f-ui)}
.rv-gd-ph{aspect-ratio:4/5;border-radius:26px;overflow:hidden}.rv-gd-ph img{width:100%;height:100%;object-fit:cover}
.rv-dr-bg{position:fixed;inset:0;background:rgba(15,25,20,.45);opacity:0;pointer-events:none;transition:opacity .35s;z-index:9001}
.rv-dr{position:fixed;top:0;right:0;bottom:0;width:min(420px,92vw);background:#fff;z-index:9002;transform:translateX(105%);transition:transform .45s cubic-bezier(.2,.8,.2,1);display:flex;flex-direction:column;box-shadow:-20px 0 50px rgba(0,0,0,.15)}
.rv-gd.dro .rv-dr{transform:none}.rv-gd.dro .rv-dr-bg{opacity:1;pointer-events:auto}
.rv-dr-h{display:flex;justify-content:space-between;align-items:center;padding:20px 24px;border-bottom:1px solid rgba(35,58,46,.1)}
.rv-dr-h b{font:600 1.4rem var(--f-title);color:var(--b-dark)}.rv-dr-h button{border:0;background:var(--c4,#f2f5f2);width:36px;height:36px;border-radius:50%;font-size:1.3rem;cursor:pointer}
.rv-dr-b{overflow:auto;padding:8px 24px 24px;display:grid;gap:4px}
.rv-dr-s{padding:16px 0;border-bottom:1px solid rgba(35,58,46,.08)}.rv-dr-s h4{margin:0 0 6px;font:600 1.15rem var(--f-title);color:var(--b-dark)}.rv-dr-s p{margin:4px 0 0;font-size:.92rem;line-height:1.55}
.rv-dr-n{font-size:.82rem;opacity:.65;margin:14px 0 0}
@container (max-width:900px){.rv-pn-g,.rv-gd-g{grid-template-columns:1fr;gap:24px}.v-cote .rv-tabs-b{grid-template-columns:1fr;gap:16px}.v-cote .rv-tl{flex-direction:row;flex-wrap:wrap;border-right:0;border-bottom:1px solid rgba(35,58,46,.12)}.v-cote .rv-ind{display:none}.rv-gd-ph{aspect-ratio:16/10}}
@container (max-width:560px){.rv-tabs-b{padding:6px 16px 20px}.rv-tl{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}.rv-tl button{white-space:nowrap;padding:14px 10px}.rv-rep{grid-template-columns:1fr;gap:8px}.rv-rep>div{grid-template-columns:auto 1fr;align-items:center;column-gap:12px}.rv-rep .rv-ic{grid-row:span 2;margin:0}}
/* 39. Journal : à la une + grille, magazine, liste ; 40. article sur trois colonnes */
.rv-jr-hd{display:flex;flex-wrap:wrap;gap:18px;align-items:end;justify-content:space-between}
.rv-jr-hd>div:first-child{display:grid;gap:10px}
.rv-jr-hd .rv-chips{flex:0 0 auto}
.rv-ac{display:grid;gap:14px;text-decoration:none;color:inherit;align-content:start}
.rv-ac[hidden]{display:none}
.rv-ac-im{aspect-ratio:4/3;border-radius:20px;overflow:hidden}
.rv-ac-im img{width:100%;height:100%;object-fit:cover;transition:transform 1s cubic-bezier(.2,.8,.2,1)}
.rv-ac:hover .rv-ac-im img{transform:scale(1.05)}
.rv-ac-t{display:grid;gap:8px;align-content:start}
.rv-ac-m{font:700 .72rem var(--f-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--b-primary)}
.rv-ac h4{margin:0;font:500 1.45rem/1.2 var(--f-title);color:var(--b-dark);text-wrap:balance}
.rv-ac p{margin:0;font-size:.94rem;line-height:1.6;opacity:.78}
.rv-ac-go{display:inline-flex;gap:8px;align-items:center;font:700 .86rem var(--f-ui);color:var(--b-dark);margin-top:4px}
.rv-ac-go svg{width:17px;height:17px;transition:transform .3s}.rv-ac:hover .rv-ac-go svg{transform:translateX(4px)}
.rv-ac-big{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:40px;align-items:center;background:var(--c4,#f2f5f2);border-radius:28px;padding:18px}
.rv-ac-big .rv-ac-im{aspect-ratio:16/11}.rv-ac-big h4{font-size:clamp(1.8rem,3vw,2.5rem)}.rv-ac-big .rv-ac-t{padding-right:18px}
.rv-jr-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px}
.rv-jm-g{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:28px;align-items:stretch}
.rv-ac-ov{position:relative;border-radius:26px;overflow:hidden;min-height:540px;align-content:end}
.rv-ac-ov .rv-ac-im{position:absolute;inset:0;aspect-ratio:auto;border-radius:0}
.rv-ac-ov .rv-ac-t{position:relative;padding:90px 30px 30px;background:linear-gradient(rgba(15,25,20,0),rgba(15,25,20,.85));color:#fff}
.rv-ac-ov h4{color:#fff;font-size:clamp(1.8rem,3vw,2.4rem)}.rv-ac-ov .rv-ac-m,.rv-ac-ov .rv-ac-go{color:#fff}.rv-ac-ov p{opacity:.9}
.rv-jm-c{display:grid;gap:18px}
.rv-ac-row{grid-template-columns:150px minmax(0,1fr);gap:18px;align-items:center;background:var(--c4,#f2f5f2);border-radius:20px;padding:12px}
.rv-ac-row .rv-ac-im{aspect-ratio:1;border-radius:14px}.rv-ac-row h4{font-size:1.2rem}.rv-ac-row p{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.rv-jl-l{display:grid}
.rv-ac-ln{grid-template-columns:200px minmax(0,1fr);gap:30px;align-items:center;padding:24px 0;border-top:1px solid rgba(35,58,46,.12)}
.rv-ac-ln:last-child{border-bottom:1px solid rgba(35,58,46,.12)}
.rv-ac-ln .rv-ac-im{aspect-ratio:4/3;border-radius:16px}.rv-ac-ln h4{font-size:1.6rem}
.rv-art{padding-top:0}
.rv-art-pg{position:sticky;top:0;z-index:5;height:4px;margin:0 calc(-1 * max(24px,5vw)) 60px;background:rgba(35,58,46,.08)}
.rv-art-pg i{display:block;height:100%;width:0;background:var(--b-gold,var(--c5,#C9A04E));transition:width .15s linear}
.rv-art-hd{display:grid;gap:14px;max-width:820px;margin:0 auto;text-align:center;justify-items:center}
.rv-art-hd .rv-h{font-size:clamp(2.2rem,4.4vw,3.6rem)}.rv-art-hd p{margin:0;font-size:1.1rem;line-height:1.6;opacity:.8}
.rv-art-g{display:grid;grid-template-columns:200px minmax(0,1fr) 280px;gap:48px;align-items:start}
.rv-toc{position:sticky;top:40px;display:grid;gap:4px}
.rv-toc b{font:700 .72rem var(--f-ui);letter-spacing:.14em;text-transform:uppercase;opacity:.6;margin-bottom:8px}
.rv-toc a{color:var(--b-dark);text-decoration:none;padding:8px 12px;border-left:2px solid rgba(35,58,46,.12);font-size:.92rem;opacity:.65;transition:all .3s}
.rv-toc a.on{opacity:1;border-color:var(--b-gold,var(--c5,#C9A04E));font-weight:700}
.rv-art-b{min-width:0}.rv-art-b p{margin:0 0 18px;font-size:1.06rem;line-height:1.8}
.rv-art-b h3{margin:36px 0 14px;font:500 1.9rem/1.2 var(--f-title);color:var(--b-dark);scroll-margin-top:40px}
.rv-art-b figure{margin:0 0 26px;border-radius:22px;overflow:hidden;aspect-ratio:16/10}.rv-art-b figure img{width:100%;height:100%;object-fit:cover}
.rv-art-a{position:sticky;top:40px;display:grid;gap:18px}
.rv-art-box{background:var(--c4,#f2f5f2);border-radius:22px;padding:20px;display:grid;gap:12px}
.rv-art-box>b{font:600 1.2rem var(--f-title);color:var(--b-dark)}
.rv-mp{display:grid;grid-template-columns:56px minmax(0,1fr) auto;gap:12px;align-items:center;background:#fff;border-radius:16px;padding:8px;text-decoration:none;color:var(--b-dark)}
.rv-mp img{width:56px;height:56px;object-fit:cover;border-radius:12px}.rv-mp b{display:block;font-size:.92rem}.rv-mp small{opacity:.7}
.rv-mp-add{width:32px;height:32px;border-radius:50%;background:var(--b-dark);color:#fff;display:grid;place-items:center;font-size:1.1rem}
.rv-rel{display:grid;grid-template-columns:64px minmax(0,1fr);gap:12px;align-items:center;text-decoration:none;color:var(--b-dark);font-weight:600;font-size:.92rem;line-height:1.35}
.rv-rel img{width:64px;height:52px;object-fit:cover;border-radius:10px}
@container (max-width:1100px){.rv-art-g{grid-template-columns:minmax(0,1fr) 260px}.rv-toc{display:none}}
@container (max-width:900px){.rv-ac-big,.rv-jm-g{grid-template-columns:1fr}.rv-jr-g{grid-template-columns:repeat(2,minmax(0,1fr))}.rv-ac-ov{min-height:420px}.rv-art-g{grid-template-columns:1fr}.rv-art-a{position:static}.rv-ac-ln{grid-template-columns:140px minmax(0,1fr);gap:18px}}
@container (max-width:560px){.rv-jr-g{grid-template-columns:1fr}.rv-ac-row{grid-template-columns:96px minmax(0,1fr)}.rv-ac-ln{grid-template-columns:1fr}.rv-ac-ln h4{font-size:1.35rem}.rv-ac-big{padding:12px}.rv-ac-big .rv-ac-t{padding:0 6px 8px}.rv-art-pg{margin-left:-16px;margin-right:-16px}}
/* 9. Texte qui s'allume : fixe au centre pendant l'animation */
.rv-glow{position:relative;height:240vh;background:var(--b-dark);color:#fff;font-family:var(--f-ui)}
.rv-glow-st{position:sticky;top:0;height:100vh;display:grid;place-items:center;padding:0 max(24px,6vw);box-sizing:border-box}
.rv-glow-in{max-width:1100px;display:grid;gap:22px;justify-items:center;text-align:center}
.rv-glow-t{margin:0;font:500 clamp(1.7rem,3.6vw,3.2rem)/1.3 var(--f-title);text-wrap:balance}
.rv-glow-t span{color:rgba(255,255,255,.18);transition:color .35s}
.rv-glow-t span.on{color:#fff}.rv-glow-t span.k.on{color:var(--b-gold,var(--c5,#C9A04E));font-style:italic}
/* 10. Frise avec photo qui change */
.rv-fr{background:var(--b-dark);color:#fff}.rv-fr .rv-h{color:#fff}.rv-fr .rv-h em{color:var(--b-gold,var(--c5,#C9A04E))}
.rv-fr-g{grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:56px;align-items:start}
.rv-fr-l{display:grid;gap:18px}
.rv-fr-ol{list-style:none;margin:18px 0 0;padding:0 0 0 30px;position:relative;display:grid;gap:34px}
.rv-fr-ol::before{content:"";position:absolute;left:7px;top:6px;bottom:6px;width:2px;background:rgba(255,255,255,.15)}
.rv-fr-ol li{position:relative;display:grid;gap:6px;opacity:.45;transition:opacity .5s;min-height:28vh}
.rv-fr-ol li::before{content:"";position:absolute;left:-30px;top:4px;width:16px;height:16px;border-radius:50%;background:var(--b-dark);border:2px solid rgba(255,255,255,.4);transition:all .4s}
.rv-fr-ol li.on{opacity:1}.rv-fr-ol li.on::before{background:var(--b-gold,var(--c5,#C9A04E));border-color:var(--b-gold,var(--c5,#C9A04E))}
.rv-fr-y{font:700 .78rem var(--f-ui);letter-spacing:.14em;color:var(--b-gold,var(--c5,#C9A04E))}
.rv-fr-ol b{font:500 1.7rem/1.2 var(--f-title)}.rv-fr-ol p{margin:0;line-height:1.65;opacity:.85;max-width:46ch}
.rv-fr-ph{position:sticky;top:12vh;aspect-ratio:4/5;border-radius:26px;overflow:hidden}
.rv-fr-ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transform:scale(1.06);transition:opacity .8s,transform 1.4s cubic-bezier(.2,.8,.2,1)}
.rv-fr-ph img.on{opacity:1;transform:none}
/* 15. Stories : ronds + téléphone qui joue */
.rv-sto-g{grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:56px;align-items:center}
.rv-sto-l{display:grid;gap:18px}.rv-sto-l>p{margin:0;line-height:1.65;opacity:.8;max-width:50ch}
.rv-sto-r{display:flex;flex-wrap:wrap;gap:18px;margin-top:8px}
.rv-sto-r button{border:0;background:none;display:grid;gap:8px;justify-items:center;font:600 .86rem var(--f-ui);color:var(--b-dark);cursor:pointer}
.rv-sto-r span{width:96px;height:96px;border-radius:50%;padding:4px;background:conic-gradient(var(--b-gold,var(--c5,#C9A04E)),var(--b-primary),var(--b-gold,var(--c5,#C9A04E)));display:block;transition:transform .3s}
.rv-sto-r img{width:100%;height:100%;object-fit:cover;border-radius:50%;border:3px solid #fff;box-sizing:border-box}
.rv-sto-r button.on span{transform:scale(1.08)}.rv-sto-r button:hover span{transform:scale(1.05)}
.rv-sto-ph{justify-self:center;width:min(100%,330px);aspect-ratio:9/18.5;border-radius:44px;background:#111;padding:12px;box-shadow:0 30px 60px rgba(0,0,0,.25)}
.rv-sto-sc{position:relative;width:100%;height:100%;border-radius:34px;overflow:hidden;background:#222}
.rv-sto-sc>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .6s}
.rv-sto-sc>img.on{opacity:1}
.rv-sto-bars{position:absolute;z-index:2;left:12px;right:12px;top:12px;display:flex;gap:4px}
.rv-sto-bars i{flex:1;height:3px;border-radius:2px;background:rgba(255,255,255,.35);overflow:hidden}.rv-sto-bars b{display:block;height:100%;width:0;background:#fff}
.rv-sto-hd{position:absolute;z-index:2;left:14px;top:26px;display:flex;gap:8px;align-items:center;color:#fff;font-size:.85rem;text-shadow:0 1px 6px rgba(0,0,0,.55)}
.rv-sto-av{width:28px;height:28px;border-radius:50%;background:var(--b-gold,var(--c5,#C9A04E));color:var(--b-dark);display:grid;place-items:center}.rv-sto-av svg{width:16px;height:16px}
.rv-sto-tag{position:absolute;z-index:2;left:12px;right:12px;bottom:14px;display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:10px;align-items:center;background:rgba(255,255,255,.95);border-radius:16px;padding:8px}
.rv-sto-tag img{width:44px;height:44px;border-radius:10px;object-fit:cover}.rv-sto-tag b{display:block;font-size:.84rem;color:var(--b-dark)}.rv-sto-tag small{font-size:.76rem}
.rv-sto-tag a{background:var(--b-dark);color:#fff;border-radius:999px;padding:8px 12px;font:700 .76rem var(--f-ui);text-decoration:none}
/* Une étiquette produit par histoire (data-rv-st) ; une photo de produit (.pk) se montre entière, jamais coupée. */
.rv-sto-tag[data-rv-st]{opacity:0;pointer-events:none;transition:opacity .5s}.rv-sto-tag[data-rv-st].on{opacity:1;pointer-events:auto}
.rv-sto-sc>img.pk{object-fit:contain;background:var(--pk,#efe9df);padding:21% 0 31%;box-sizing:border-box;-webkit-mask-image:linear-gradient(transparent 22%,#000 31%,#000 63%,transparent 73%);mask-image:linear-gradient(transparent 22%,#000 31%,#000 63%,transparent 73%)}
.rv-sto-sc:has(img.pk){background:var(--pk-on,#efe9df);transition:background .6s}
.rv-sto-tag[data-rv-st]{transition:none}.rv-sto-tag[data-rv-st].on{transition:opacity .45s}
.rv-sto-sc:has(img.pk.on) .rv-sto-hd{color:var(--b-dark);text-shadow:none}.rv-sto-sc:has(img.pk.on) .rv-sto-bars i{background:rgba(0,0,0,.14)}.rv-sto-sc:has(img.pk.on) .rv-sto-bars b{background:var(--b-dark)}
/* 17. Cartes qui s'empilent */
.rv-stk{background:var(--b-primary);color:#fff}.rv-stk .rv-h{color:#fff}.rv-stk .rv-h em{color:var(--b-gold,var(--c5,#C9A04E))}.rv-stk .rv-eb{color:#fff;opacity:.85}
.rv-stk-l{display:grid;gap:40px;padding-bottom:20px}
.rv-stk-c{position:sticky;top:calc(90px + var(--i) * 22px);display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);background:#fff;color:var(--b-ink);border-radius:28px;overflow:hidden;height:min(68vh,460px);box-shadow:0 -10px 40px rgba(0,0,0,.18);transform-origin:top center;transition:transform .4s}
.rv-stk-ph img{width:100%;height:100%;object-fit:cover;display:block}
.rv-stk-t{padding:44px;display:grid;gap:14px;align-content:center}
.rv-stk-t small{font:500 3rem/1 var(--f-title);color:var(--b-gold,var(--c5,#C9A04E))}
.rv-stk-t b{font:500 clamp(1.7rem,2.8vw,2.3rem)/1.15 var(--f-title);color:var(--b-dark)}
.rv-stk-t p{margin:0;line-height:1.7;opacity:.85}
.rv-stk-d{justify-self:start;background:var(--c4,#f2f5f2);border-radius:999px;padding:9px 16px;font:600 .84rem var(--f-ui);color:var(--b-dark)}
/* 19. Compose ton coffret */
.rv-box{background:var(--c4,#f2f5f2)}
.rv-box-hd{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:40px;align-items:end}.rv-box-hd>div{display:grid;gap:10px}
.rv-box-how{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.rv-box-how li{display:flex;gap:12px;align-items:center;font-weight:600;color:var(--b-dark)}
.rv-box-how b{width:30px;height:30px;border-radius:50%;background:var(--b-dark);color:#fff;display:grid;place-items:center;font-size:.85rem}
.rv-box-g{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:28px;align-items:start}
.rv-box-ch{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.rv-box-ch button{position:relative;border:2px solid transparent;background:#fff;border-radius:20px;padding:10px 10px 16px;display:grid;gap:6px;text-align:left;cursor:pointer;font-family:var(--f-ui);color:var(--b-dark);transition:border-color .3s,transform .3s}
.rv-box-ch button:hover{transform:translateY(-3px)}.rv-box-ch button.on{border-color:var(--b-dark)}
.rv-box-ch img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:14px}
.rv-box-ch b{font:600 1.05rem/1.2 var(--f-title);padding:0 4px}.rv-box-ch small{padding:0 4px;opacity:.75}
.rv-box-ch i{position:absolute;top:16px;right:16px;width:32px;height:32px;border-radius:50%;background:var(--b-dark);color:#fff;display:grid;place-items:center;font-style:normal}
.rv-box-ch button.on i{background:var(--b-gold,var(--c5,#C9A04E));color:var(--b-dark)}
.rv-box-s{position:sticky;top:96px;background:#fff;border-radius:24px;padding:24px;display:grid;gap:14px;box-shadow:0 16px 40px rgba(35,58,46,.08)}
.rv-box-s>b{font:500 1.6rem var(--f-title);color:var(--b-dark)}
.rv-box-sl{display:grid;gap:10px}
.rv-box-e,.rv-box-it{display:flex;gap:12px;align-items:center;border:1.5px dashed rgba(35,58,46,.25);border-radius:14px;padding:10px 12px;font-size:.9rem;opacity:.7;min-height:44px}
.rv-box-it{border-style:solid;opacity:1;font-weight:600;color:var(--b-dark);animation:rvA .4s both;cursor:pointer}
.rv-box-it img{width:40px;height:40px;border-radius:10px;object-fit:cover}.rv-box-it em{margin-left:auto;font-style:normal;opacity:.6}
.rv-box-s p{margin:0;font-size:.9rem;font-weight:600;color:var(--b-dark)}.rv-box-n{opacity:.65;font-size:.8rem}
.rv-pay:disabled{opacity:.45;cursor:not-allowed;transform:none}
/* 20. Compte à rebours en bloc */
.rv-cd{background:var(--b-dark);color:#fff}.rv-cd .rv-h{color:#fff}.rv-cd .rv-h em{color:var(--b-gold,var(--c5,#C9A04E))}
.rv-cd-g{grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:56px;align-items:center}
.rv-cd-ph{position:relative;aspect-ratio:5/4;border-radius:26px;overflow:hidden}.rv-cd-ph img{width:100%;height:100%;object-fit:cover}
.rv-cd-tag{position:absolute;left:18px;top:18px;background:var(--b-gold,var(--c5,#C9A04E));color:var(--b-dark);border-radius:999px;padding:8px 14px;font:700 .78rem var(--f-ui)}
.rv-cd-t{display:grid;gap:18px;justify-items:start}.rv-cd-t p{margin:0;line-height:1.65;opacity:.85}
.rv-cd-n{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;width:100%;max-width:520px}
.rv-cd-n div{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:16px 8px;display:grid;justify-items:center;gap:4px}
.rv-cd-n b{font:500 clamp(2rem,4vw,3rem)/1 var(--f-title);font-variant-numeric:tabular-nums}.rv-cd-n small{font-size:.78rem;opacity:.75}
@container (max-width:900px){.rv-fr-g,.rv-sto-g,.rv-box-hd,.rv-box-g,.rv-cd-g{grid-template-columns:1fr;gap:32px}.rv-fr-ph{display:none}.rv-fr-ol li{min-height:0}.rv-stk-c{grid-template-columns:1fr;height:auto;min-height:0}.rv-stk-ph{aspect-ratio:16/9}.rv-stk-t{padding:26px}.rv-box-s{position:static}}
@container (max-width:560px){.rv-box-ch{grid-template-columns:repeat(2,minmax(0,1fr))}.rv-sto-r span{width:72px;height:72px}.rv-sto-r{gap:12px}.rv-cd-n{gap:6px}.rv-cd-n div{padding:12px 4px}.rv-stk-t small{font-size:2.2rem}}
/* Sections ajoutées après l'étude de 65 thèmes (11 novembre 2026) */
.rv-it-g{grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:clamp(32px,6vw,80px);align-items:center}
.rv-it-ph{aspect-ratio:4/5;border-radius:24px;overflow:hidden}.rv-it-ph img{width:100%;height:100%;object-fit:cover;transform:scale(1.04);transition:transform 1.4s cubic-bezier(.2,.8,.2,1)}
.rv-it.rv-on .rv-it-ph img{transform:none}
.rv-it-t{display:grid;gap:18px;justify-items:start;max-width:520px}.rv-it-t p{margin:0;line-height:1.7;opacity:.85}
.rv-bg3-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.rv-bg3-c{position:relative;display:block;aspect-ratio:3/4;border-radius:22px;overflow:hidden;color:#fff;text-decoration:none}
.rv-bg3-c img{width:100%;height:100%;object-fit:cover;transition:transform .9s cubic-bezier(.2,.8,.2,1)}.rv-bg3-c:hover img{transform:scale(1.05)}
.rv-bg3-c::after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 45%,rgba(0,0,0,.55))}
.rv-bg3-t{position:absolute;z-index:1;left:22px;right:22px;bottom:22px;display:grid;gap:6px}
.rv-bg3-t small{font:700 .72rem var(--f-ui);letter-spacing:.14em;text-transform:uppercase;opacity:.85}.rv-bg3-t b{font:500 1.6rem/1.1 var(--f-title)}
.rv-bg3-go{display:inline-flex;gap:8px;align-items:center;font:700 .86rem var(--f-ui)}.rv-bg3-go svg{width:16px;height:16px}
.rv-gp{position:relative;min-height:clamp(420px,62vh,640px);display:grid;align-items:center;overflow:hidden;color:#fff;font-family:var(--f-ui)}
.rv-gp>img{position:absolute;inset:0;z-index:0;width:100%;height:115%;object-fit:cover;top:-7%}
/* Voile sur ::before (z 0) : ::after sert au contour de l'atelier, posé au-dessus de tout. */
.rv-gp::before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(90deg,rgba(0,0,0,.66),rgba(0,0,0,.38) 45%,rgba(0,0,0,.06) 75%)}
.rv-gp-t .rv-h,.rv-gp-t .rv-eb{text-shadow:0 2px 18px rgba(0,0,0,.35)}
.rv-gp-t{position:relative;z-index:2;display:grid;gap:16px;justify-items:start;padding:0 max(24px,6vw);max-width:620px}.rv-gp-t .rv-h{color:#fff}
.rv-pt .rv-hd{gap:16px}.rv-pt>.rv-in{justify-items:center}
.rv-pt-g,.rv-ya-g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;width:100%}
.rv-pc{display:grid;gap:8px;text-decoration:none;color:var(--b-dark)}
.rv-pc-im{aspect-ratio:1;border-radius:18px;overflow:hidden;background:var(--c4,#f2f5f2)}.rv-pc-im img{width:100%;height:100%;object-fit:cover;transition:transform .7s}.rv-pc:hover img{transform:scale(1.05)}
.rv-pc b{font:600 1rem var(--f-ui)}.rv-pc small{opacity:.75}
.rv-pc-add{justify-self:start;border:1.5px solid var(--b-dark);border-radius:999px;padding:8px 16px;font:700 .82rem var(--f-ui)}
.rv-pt-g{animation:rvFade .45s both}@keyframes rvFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.rv-ya-hd{display:flex;justify-content:space-between;align-items:end;gap:16px}
.rv-vb{background:var(--b-dark);color:#fff}.rv-vb .rv-h{color:#fff}
.rv-vb .rv-h em,.rv-gp .rv-h em{color:var(--b-gold,var(--c5,#C9A04E))}
.rv-vb-g{grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:clamp(28px,5vw,64px);align-items:center}
.rv-vb-t{display:grid;gap:16px}.rv-vb-t p{margin:0;opacity:.8;line-height:1.65}
.rv-vb-ph{position:relative;border:0;padding:0;border-radius:24px;overflow:hidden;aspect-ratio:16/10;cursor:pointer;background:#000}
.rv-vb-ph img{width:100%;height:100%;object-fit:cover;opacity:.85}
.rv-vb-pl{position:absolute;left:50%;top:50%;width:84px;height:84px;margin:-42px 0 0 -42px;border-radius:50%;background:var(--b-gold,var(--c5,#C9A04E));color:var(--b-dark);display:grid;place-items:center;animation:rvPulse 2.4s ease-in-out infinite}
.rv-vb-pl svg{width:30px;height:30px;margin-left:4px}@keyframes rvPulse{50%{transform:scale(1.08)}}
@container (max-width:900px){.rv-it-g,.rv-vb-g{grid-template-columns:1fr}.rv-pt-g,.rv-ya-g{grid-template-columns:repeat(2,minmax(0,1fr))}.rv-bg3-g{grid-template-columns:1fr 1fr}.rv-bg3-c:nth-child(3){grid-column:1/-1;aspect-ratio:16/9}}
@container (max-width:560px){.rv-bg3-g{grid-template-columns:1fr}.rv-bg3-c,.rv-bg3-c:nth-child(3){aspect-ratio:4/3}.rv-ya-hd{flex-direction:column;align-items:start}}
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
  // Questions : thèmes qui filtrent (questions avec photo).
  qa("[data-rv-filter]").forEach(function(s){var bs=qa(".rv-chips button",s),qs=qa(".rv-q[data-k]",s);
    function show(k){bs.forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.k===k))});qs.forEach(function(q){q.classList.toggle("rv-hid",q.dataset.k!==k)})}
    bs.forEach(function(b){b.addEventListener("click",function(){show(b.dataset.k)})});if(bs[0])show(bs[0].dataset.k)});
  // Questions en bulles : la question part dans la discussion, la réponse s'écrit (textes lus dans la section).
  qa("[data-rv-bub]").forEach(function(s){var m=s.querySelector("[data-rv-bubm]"),busy=false;
    function add(c,t){var d=document.createElement("div");d.className="rv-bb "+c;d.textContent=t;m.appendChild(d);m.scrollTop=m.scrollHeight;return d}
    qa(".rv-bub-q",s).forEach(function(w){var b=w.querySelector("button"),a=(w.querySelector("p")||{}).textContent||"";
      b.addEventListener("click",function(){if(busy)return;busy=true;b.classList.add("dn");add("me",b.textContent);
        var ty=document.createElement("div");ty.className="rv-bb it ty";ty.innerHTML="<i></i><i></i><i></i>";setTimeout(function(){m.appendChild(ty);m.scrollTop=m.scrollHeight},250);
        setTimeout(function(){ty.remove();var d=add("it",""),k=0;(function tp(){d.textContent=a.slice(0,k);m.scrollTop=m.scrollHeight;if(k<a.length){k+=3;setTimeout(tp,16)}else busy=false})()},1100)})})});
  // Page des questions : recherche en direct, cartes de thème qui mènent aux questions.
  qa("[data-rv-faq]").forEach(function(s){var i=s.querySelector("[data-rv-fqs]"),no=s.querySelector("[data-rv-fqn]"),grs=qa("[data-rv-gr]",s);
    function norm(t){return (t||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")}
    if(i)i.addEventListener("input",function(){var v=norm(i.value.trim()),any=false;
      grs.forEach(function(g){var n=0;qa(".rv-q",g).forEach(function(q){var ok=!v||norm(q.textContent).indexOf(v)>=0;q.classList.toggle("rv-hid",!ok);if(ok)n++;if(v&&ok)q.open=true;if(!v)q.open=false});g.hidden=!n;if(n)any=true});
      if(no)no.hidden=any});
    qa("[data-rv-go]",s).forEach(function(a){a.addEventListener("click",function(e){var g=s.querySelector("#rv-fq-"+a.dataset.rvGo);if(!g)return;e.preventDefault();g.hidden=false;g.scrollIntoView({behavior:"smooth",block:"start"});var f=g.querySelector(".rv-q");if(f)f.open=true})})});
  // Fenêtre d'inscription : dans la banque et l'outil de construction, visible telle quelle ; sur un vrai site, une seule
  // fois, quelques secondes après l'arrivée (mémoire du navigateur protégée).
  qa("[data-rv-pop]").forEach(function(s){
    function preview(){return /[?&](catalog|builder)=/.test(location.search)||!!document.querySelector(".cg-lab,.bd-main,.bd-show,.at-side,[data-ct-catalog]")}
    function close(){s.classList.remove("open");try{localStorage.setItem("rv-pop-vu","1")}catch(e){}}
    qa("[data-rv-popx]",s).forEach(function(b){b.addEventListener("click",function(){if(s.classList.contains("rv-live"))close()})});
    if(preview())return;
    var seen=false;try{seen=localStorage.getItem("rv-pop-vu")==="1"}catch(e){}
    s.classList.add("rv-live");
    // La banque ajoute ses repères après ce script : on revérifie, et la fenêtre reste alors dans la page.
    function recheck(){if(preview()){s.classList.remove("rv-live","open");clearTimeout(t)}}
    var t=seen?null:setTimeout(function(){if(!preview())s.classList.add("open")},8000);
    setTimeout(recheck,0);addEventListener("DOMContentLoaded",recheck);addEventListener("load",recheck);
    addEventListener("keydown",function(e){if(e.key==="Escape"&&s.classList.contains("open"))close()});
  });
  // Panier : quantités, retrait, livraison offerte, emballage cadeau, totaux (montants lus dans la section).
  qa("[data-rv-cart]").forEach(function(s){
    var free=parseFloat(s.dataset.free)||0,g=s.querySelector("[data-rv-gift]"),gl=s.querySelector("[data-rv-opt]"),gp=gl?parseFloat(gl.dataset.price)||0:0;
    function eu(n){return n.toFixed(2).replace(".",",").replace(",00","")+" €"}
    function put(sel,t){var e=s.querySelector(sel);if(e)e.textContent=t}
    function draw(){var sub=0,items=qa("[data-rv-ci]",s);
      items.forEach(function(it){var n=+it.querySelector("[data-rv-qn]").textContent,l=n*parseFloat(it.dataset.price);sub+=l;it.querySelector("[data-rv-lt]").textContent=eu(l)});
      var gift=g&&g.checked?gp:0,rest=Math.max(0,free-sub);
      put("[data-rv-sub]",eu(sub));put("[data-rv-tot]",eu(sub+gift));
      put("[data-rv-ship]",free&&sub>=free?"Offerte":"Calculée au paiement");
      put("[data-rv-fsm]",!free?"":rest>0?"Plus que "+eu(rest)+" pour la livraison offerte":"La livraison est offerte !");
      var b=s.querySelector("[data-rv-fsb]");if(b)b.style.width=(free?Math.min(100,sub/free*100):0)+"%";
      var gr=s.querySelector("[data-rv-giftrow]");if(gr)gr.hidden=!gift;
      var e=s.querySelector("[data-rv-empty]");if(e)e.hidden=items.length>0}
    s.addEventListener("click",function(e){var b=e.target.closest("[data-rv-q],[data-rv-rm]");if(!b)return;var it=b.closest("[data-rv-ci]");
      if(b.hasAttribute("data-rv-rm")){it.classList.add("out");setTimeout(function(){it.remove();draw()},300);return}
      var n=it.querySelector("[data-rv-qn]"),v=Math.max(1,Math.min(20,+n.textContent+(+b.dataset.rvQ)));n.textContent=v;draw()});
    if(g)g.addEventListener("change",draw);draw();
  });
  // Onglets de la fiche : trait ou pastille qui suit l'onglet choisi.
  qa("[data-rv-tabs]").forEach(function(s){var bs=qa("[data-rv-t]",s),ps=qa("[data-rv-p]",s),ind=s.querySelector(".rv-ind"),side=s.classList.contains("v-cote");if(!bs.length)return;
    function place(b){if(!ind||!b)return;if(side){ind.style.top=b.offsetTop+"px";ind.style.height=b.offsetHeight+"px"}else{ind.style.left=b.offsetLeft+"px";ind.style.width=b.offsetWidth+"px"}}
    function show(i){bs.forEach(function(b,k){b.setAttribute("aria-selected",String(k===i))});ps.forEach(function(p,k){p.hidden=k!==i});place(bs[i])}
    bs.forEach(function(b,i){b.addEventListener("click",function(){show(i)})});addEventListener("resize",function(){place(bs.filter(function(b){return b.getAttribute("aria-selected")==="true"})[0])});setTimeout(function(){show(0)},50)});
  // Guide d'infusion : repères selon la famille, tiroir du guide complet.
  qa("[data-rv-guide]").forEach(function(s){var bs=qa(".rv-chips button",s),ps=qa("[data-rv-g]",s);
    bs.forEach(function(b){b.addEventListener("click",function(){bs.forEach(function(x){x.setAttribute("aria-pressed",String(x===b))});ps.forEach(function(p){p.hidden=p.dataset.rvG!==b.dataset.k})})});
    var o=s.querySelector("[data-rv-gdo]");if(o)o.addEventListener("click",function(){s.classList.add("dro")});
    qa("[data-rv-gdx]",s).forEach(function(x){x.addEventListener("click",function(){s.classList.remove("dro")})});
    addEventListener("keydown",function(e){if(e.key==="Escape")s.classList.remove("dro")})});
  // Journal : filtres par thème.
  qa("[data-rv-jr]").forEach(function(s){var bs=qa(".rv-chips button",s),as=qa(".rv-ac",s);
    bs.forEach(function(b){b.addEventListener("click",function(){var k=b.dataset.k;bs.forEach(function(x){x.setAttribute("aria-pressed",String(x===b))});as.forEach(function(a){a.hidden=k!=="all"&&a.dataset.tag!==k})})})});
  // Article : barre de lecture et sommaire qui suit la lecture.
  qa("[data-rv-art]").forEach(function(s){var bar=s.querySelector("[data-rv-artp]"),art=s.querySelector(".rv-art-b"),ls=qa("[data-rv-to]",s);
    function upd(){var r=art.getBoundingClientRect(),h=r.height-innerHeight*.5,p=Math.max(0,Math.min(1,(innerHeight*.5-r.top)/Math.max(1,h)));if(bar)bar.style.width=(p*100)+"%";
      var cur=null;ls.forEach(function(a){var t=s.querySelector(a.getAttribute("href"));if(t&&t.getBoundingClientRect().top<innerHeight*.5)cur=a});ls.forEach(function(a){a.classList.toggle("on",a===cur)})}
    ls.forEach(function(a){a.addEventListener("click",function(e){var t=s.querySelector(a.getAttribute("href"));if(!t)return;e.preventDefault();t.scrollIntoView({behavior:"smooth",block:"start"})})});
    addEventListener("scroll",upd,{passive:true});addEventListener("resize",upd);upd()});
  // 9. Texte qui s'allume : les mots s'allument selon l'avancée dans la section (texte fixe au centre).
  qa("[data-rv-glow]").forEach(function(s){var ws=qa(".rv-glow-t span",s);
    function upd(){var r=s.getBoundingClientRect(),run=Math.max(1,r.height-innerHeight),p=Math.max(0,Math.min(1,-r.top/run*1.15));var n=Math.round(p*ws.length);ws.forEach(function(w,i){w.classList.toggle("on",i<n)})}
    addEventListener("scroll",upd,{passive:true});addEventListener("resize",upd);upd()});
  // 10. Frise : l'étape au centre de l'écran s'allume et change la photo.
  qa("[data-rv-frise]").forEach(function(s){var ls=qa("[data-rv-fs]",s),im=qa("[data-rv-fi]",s);
    function upd(){var k=0;ls.forEach(function(l,i){if(l.getBoundingClientRect().top<innerHeight*.55)k=i});ls.forEach(function(l,i){l.classList.toggle("on",i<=k)});im.forEach(function(x,i){x.classList.toggle("on",i===k)})}
    addEventListener("scroll",upd,{passive:true});upd()});
  // 15. Stories : lecture automatique dans le téléphone, ronds qui sautent à une histoire.
  qa("[data-rv-sto]").forEach(function(s){var bs=qa("[data-rv-si]",s),im=qa("[data-rv-sm]",s),bars=qa(".rv-sto-bars b",s),i=0,t0=Date.now(),D=4000;
    // Photo de produit : le fond de l'écran prend la couleur du coin de la photo, le sachet se montre entier sans bande.
    im.forEach(function(x){if(!x.classList.contains("pk"))return;function f(){try{var c=document.createElement("canvas");c.width=c.height=1;var g=c.getContext("2d");g.drawImage(x,0,0,4,4,0,0,1,1);var d=g.getImageData(0,0,1,1).data;x.dataset.pk="rgb("+d[0]+","+d[1]+","+d[2]+")";x.style.setProperty("--pk",x.dataset.pk);if(x.classList.contains("on"))x.parentNode.style.setProperty("--pk-on",x.dataset.pk)}catch(e){}}if(x.complete&&x.naturalWidth)f();else x.addEventListener("load",f)});
    function go(k){i=(k+im.length)%im.length;t0=Date.now();im.forEach(function(x,j){x.classList.toggle("on",j===i);if(j===i&&x.dataset.pk)x.parentNode.style.setProperty("--pk-on",x.dataset.pk)});bs.forEach(function(b,j){b.classList.toggle("on",j===i)});qa("[data-rv-st]",s).forEach(function(g){g.classList.toggle("on",+g.dataset.rvSt===i)})}
    function tick(){var p=Math.min(1,(Date.now()-t0)/D);bars.forEach(function(b,j){b.style.width=(j<i?100:j===i?p*100:0)+"%"});if(p>=1)go(i+1);requestAnimationFrame(tick)}
    bs.forEach(function(b){b.addEventListener("click",function(){go(+b.dataset.rvSi)})});s.querySelector(".rv-sto-sc").addEventListener("click",function(e){if(!e.target.closest("a"))go(i+1)});go(0);requestAnimationFrame(tick)});
  // 17. Cartes qui s'empilent : la carte recouverte recule légèrement.
  qa("[data-rv-stk]").forEach(function(s){var cs=qa(".rv-stk-c",s);
    function upd(){cs.forEach(function(c,i){var n=cs[i+1];if(!n){c.style.transform="";return}var d=c.getBoundingClientRect().top,e=n.getBoundingClientRect().top,ov=Math.max(0,Math.min(1,1-(e-d)/Math.max(1,c.offsetHeight)));c.style.transform="scale("+(1-ov*.06)+")"})}
    addEventListener("scroll",upd,{passive:true});upd()});
  // 19. Coffret : trois mélanges, total, bouton actif quand le coffret est complet.
  qa("[data-rv-box]").forEach(function(s){var N=+s.dataset.n||3,pick=[],sl=s.querySelector("[data-rv-bs]"),bs=qa("[data-rv-b]",s);
    function eu(n){return n.toFixed(2).replace(".",",").replace(",00","")+" €"}
    function draw(){var tot=0;sl.innerHTML="";for(var k=0;k<N;k++){var b=pick[k];if(b){tot+=parseFloat(b.dataset.price);var d=document.createElement("span");d.className="rv-box-it";d.dataset.k=k;d.innerHTML='<img src="'+b.querySelector("img").getAttribute("src")+'" alt=""><span></span><em>×</em>';d.querySelector("span").textContent=b.dataset.name;sl.appendChild(d)}else{var e=document.createElement("span");e.className="rv-box-e";e.textContent="Mélange à choisir";sl.appendChild(e)}}
      bs.forEach(function(b){b.classList.toggle("on",pick.indexOf(b)>=0)});
      s.querySelector("[data-rv-bt]").textContent=eu(tot);s.querySelector("[data-rv-bb]").style.width=(pick.length/N*100)+"%";
      s.querySelector("[data-rv-bm]").textContent=pick.length<N?"Encore "+(N-pick.length)+" mélange"+(N-pick.length>1?"s":"")+" à choisir":"Ton coffret est complet";s.querySelector("[data-rv-bgo]").disabled=pick.length<N}
    bs.forEach(function(b){b.addEventListener("click",function(){var j=pick.indexOf(b);if(j>=0)pick.splice(j,1);else if(pick.length<N)pick.push(b);draw()})});
    sl.addEventListener("click",function(e){var it=e.target.closest(".rv-box-it");if(!it)return;pick.splice(+it.dataset.k,1);draw()});draw()});
  // 20. Compte à rebours : jusqu'à la vraie date de fin (data-end) ; passée ou absente, la section se retire.
  qa("[data-rv-cd]").forEach(function(s){var end=Date.parse(s.dataset.end||"");if(!end){s.hidden=true;return}
    function pad(n){return (n<10?"0":"")+n}
    function tick(){var ms=end-Date.now();if(ms<=0){s.hidden=true;return}var x=Math.floor(ms/1000);
      var v={d:Math.floor(x/86400),h:Math.floor(x%86400/3600),m:Math.floor(x%3600/60),s:x%60};qa("[data-rv-c]",s).forEach(function(b){b.textContent=b.dataset.rvC==="d"?v.d:pad(v[b.dataset.rvC])});setTimeout(tick,1000)}tick()});
  // Produits en onglets : un onglet montre sa sélection.
  qa("[data-rv-pt]").forEach(function(s){var bs=qa("[data-rv-ptb]",s),ps=qa("[data-rv-ptp]",s);bs.forEach(function(b){b.addEventListener("click",function(){bs.forEach(function(x){x.setAttribute("aria-pressed",String(x===b))});ps.forEach(function(p){p.hidden=p.dataset.rvPtp!==b.dataset.rvPtb})})})});
  // Vidéo en bande : la vraie vidéo de la marque (data-src) s'ouvre au clic ; sans vidéo, rien ne s'ouvre.
  qa("[data-rv-vb]").forEach(function(s){var b=s.querySelector("[data-rv-vbp]");if(!b)return;b.addEventListener("click",function(){var src=s.dataset.src;if(!src)return;var v=document.createElement("video");v.src=src;v.controls=true;v.autoplay=true;v.playsInline=true;v.style.cssText="width:100%;height:100%;object-fit:cover";b.replaceWith(v)})});
})();
'''
