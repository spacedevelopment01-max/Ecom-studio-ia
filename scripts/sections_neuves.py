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
})();
'''
