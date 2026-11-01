"""Sous-titres dynamiques de la Pub 03 : groupes de 2 à 3 mots (débit rapide), heure de chaque mot (vo/mots.json,
décalée de VOFF), placés en haut sauf quand le sujet occupe le haut de l'image (SYNA en gros plan, signature finale)."""
import json, os, re
P = os.path.dirname(os.path.abspath(__file__))
VOFF = 0.35
W0 = json.load(open(P + '/vo/mots.json'))['words']; W = []
for w in W0:  # « E-COM STUDIO IA » reste un seul bloc
    if len(W) >= 2 and W[-1][0] == "STUDIO" and W[-2][0] == "E-COM": a = W.pop(); b = W.pop(); W.append(["E-COM\u00a0STUDIO\u00a0" + w[0], b[1], w[2]])
    else: W.append(list(w))
SMALL = {"en", "de", "la", "le", "les", "et", "un", "une", "à", "au", "ta", "ton", "tes", "des", "si", "se", "a", "ce", "tu", "te", "qu'un", "sur", "dans", "du", "mêmes", "même", "ne", "dans", "puis", "une"}
groups = []; cur = []
for w, s, e in W:
    cur.append((w, s + VOFF, e + VOFF))
    if re.search(r"[,.;:?!…]$", w) or len(cur) >= 3 or len(''.join(x[0] for x in cur)) > 15:
        carry = []
        while len(cur) > 1 and not re.search(r"[,.;:?!…]$", cur[-1][0]) and cur[-1][0].lower() in SMALL: carry.insert(0, cur.pop())
        groups.append(cur); cur = carry
if cur: groups.append(cur)
BOTTOM = [(14.9, 17.45), (45.95, 49.3)]
caps = []
for g in groups:
    s0 = g[0][1]; top = not any(a <= s0 < b for a, b in BOTTOM)
    caps.append({'s': round(max(0, s0 - 0.05), 3), 'e': round(g[-1][2], 3), 'w': [{'w': w, 's': round(max(0, a - 0.05), 3), 'e': round(b, 3)} for w, a, b in g], 'top': top})
for i, c in enumerate(caps):
    nxt = caps[i + 1]['s'] if i + 1 < len(caps) else 99
    c['h'] = round(min(nxt - 0.02, c['e'] + 0.45), 3)
open(P + '/assets/caps.js', 'w').write('window.CAPS=' + json.dumps(caps, ensure_ascii=False) + ';')
txt = ' '.join(w['w'] for c in caps for w in c['w']).replace(' ', ' ')
print(len(caps), 'groupes ; texte identique :', txt == open(P + '/vo/texte.txt').read())
print(' | '.join(' '.join(w['w'] for w in c['w']) for c in caps))
