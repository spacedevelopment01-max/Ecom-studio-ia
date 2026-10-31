"""Sous-titres de la version longue : les phrases sont calées sur les grandes pauses de la voix (fiables) ; à
l'intérieur d'une phrase, les mots sont répartis au prorata des lettres sur le temps parlé (pauses retirées)."""
import json, os, re, subprocess
from timemap import VOFF
P = os.path.dirname(os.path.abspath(__file__))
f = P + '/vo/voix-longue.wav'; TXT = open(P + '/vo/texte-long.txt').read()
out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", f, "-af", "silencedetect=noise=-40dB:d=0.18", "-f", "null", "-"], capture_output=True, text=True).stderr
pauses = list(zip([float(x) for x in re.findall(r"silence_start: ([0-9.]+)", out)], [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", out)]))
# blocs (phrases) : début, fin de parole (vérifiés sur les grandes pauses)
BLOCKS = [(0.0, 3.50), (4.21, 6.07), (6.54, 8.74), (9.32, 12.96), (13.22, 15.50), (16.10, 16.84), (17.16, 23.31), (23.88, 26.49),
          (27.15, 29.82), (30.45, 35.14), (35.72, 42.99), (43.60, 45.02), (45.60, 50.81), (51.43, 56.11), (56.67, 58.23), (58.76, 60.31),
          (60.89, 63.65), (64.40, 67.06)]
sents = re.findall(r"[^.?…]+[.?…]+", TXT); sents = [s.strip() for s in sents]
# « Créer un site… réseaux… » et « Il faudrait… métier. » forment un seul bloc (pause incertaine entre les deux)
i = sents.index(next(s for s in sents if s.startswith("Créer"))); sents[i:i + 2] = [sents[i] + " " + sents[i + 1]]
assert len(sents) == len(BLOCKS), (len(sents), len(BLOCKS))
def Lc(w): return len(re.sub(r"[^\wÀ-ÿ']", "", w)) + 1
words = []
for s, (a, b) in zip(sents, BLOCKS):
    inner = [(x, y) for x, y in pauses if x > a + 0.05 and y < b - 0.05]
    spans = []; c = a
    for x, y in inner: spans.append((c, x)); c = y
    spans.append((c, b)); tot = sum(y - x for x, y in spans)
    ws = []
    for tok in s.split(' '):
        if ws and re.fullmatch(r"[?!:;…]+", tok): ws[-1] = ws[-1] + "\u00a0" + tok  # ponctuation française collée au mot
        else: ws.append(tok)
    n = sum(Lc(w) for w in ws); acc = 0.0
    def at(u):  # temps parlé u (0..tot) → temps réel
        for x, y in spans:
            if u <= y - x: return x + u
            u -= y - x
        return b
    for w in ws:
        d = tot * Lc(w) / n; words.append((w, at(acc) + VOFF, at(acc + d) + VOFF)); acc += d
# groupes de 2 à 4 mots, coupés aux ponctuations
SMALL = {"en", "de", "la", "le", "les", "et", "un", "une", "à", "au", "vos", "votre", "ses", "des", "si", "se", "a", "ce"}
groups = []; cur = []
for w in words:
    cur.append(w)
    if re.search(r"[,.;:?!…]$", w[0]) or len(cur) >= 4 or (len(cur) >= 3 and len(''.join(x[0] for x in cur)) > 16):
        carry = []
        while len(cur) > 1 and not re.search(r"[,.;:?!…]$", cur[-1][0]) and cur[-1][0].lower() in SMALL: carry.insert(0, cur.pop())
        groups.append(cur); cur = carry
if cur: groups.append(cur)
caps = []
for g in groups:
    s0 = g[0][1]; top = not (17.3 <= s0 < 30.8) and s0 < 64.3  # final : sous le logo et l'ordinateur, jamais dessus
    caps.append({'s': round(max(0, s0 - 0.06), 3), 'e': round(g[-1][2], 3), 'w': [{'w': w.replace("IA :", "IA :"), 's': round(max(0, a - 0.06), 3), 'e': round(b, 3)} for w, a, b in g], 'top': top})
for i, c in enumerate(caps):
    nxt = caps[i + 1]['s'] if i + 1 < len(caps) else 99
    c['h'] = round(min(nxt - 0.02, c['e'] + 0.5), 3)
open(P + '/assets/caps.js', 'w').write('window.CAPS=' + json.dumps(caps, ensure_ascii=False) + ';')
print(len(caps), "groupes"); [print(c['s'], c['h'], 'H' if c['top'] else 'B', ' '.join(w['w'] for w in c['w'])) for c in caps[:12]]
