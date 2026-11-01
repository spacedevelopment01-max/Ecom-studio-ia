"""Heure de chaque mot de la voix resserrée (gratuit, sans transcription) : les pauses gardées (~0,19 s) sont
rattachées, dans l'ordre, aux ponctuations du texte ; entre deux repères, les mots sont répartis au prorata des lettres."""
import json, os, re, subprocess
P = os.path.dirname(os.path.abspath(__file__)); f = P + '/vo/voix-serree.wav'
TXT = open(P + '/vo/texte.txt').read()
out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", f, "-af", "silencedetect=noise=-40dB:d=0.12", "-f", "null", "-"], capture_output=True, text=True).stderr
pauses = list(zip([float(x) for x in re.findall(r"silence_start: ([0-9.]+)", out)], [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", out)]))
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], capture_output=True, text=True).stdout)
start = pauses[0][1] if pauses and pauses[0][0] < 0.02 else 0.0
pauses = [p for p in pauses if p[0] > 0.02]
end = pauses[-1][0] if pauses and pauses[-1][1] >= dur - 0.03 else dur
pauses = [p for p in pauses if p[1] < dur - 0.03]
words = []
for tok in TXT.split(' '):
    if words and re.fullmatch(r"[?!:;…]+", tok): words[-1] += " " + tok
    else: words.append(tok)
L = lambda w: len(re.sub(r"[^\wÀ-ÿ']", "", w)) + 1
marks = [i for i, w in enumerate(words) if re.search(r"[,.;:?!…]$", w)]
rate = sum(L(w) for w in words) / (end - start - sum(e - s for s, e in pauses))
matched = {}; used = set(); at, ai = start, 0
for m in marks:
    pred = at + sum(L(w) for w in words[ai:m + 1]) / rate
    c = [(abs(s - pred), k) for k, (s, e) in enumerate(pauses) if k not in used and s > at and abs(s - pred) < 0.6]
    if c:
        _, k = min(c); used.add(k); matched[m] = pauses[k]; at, ai = pauses[k][1], m + 1
times = []; st, si = start, 0
for m, (ps, pe) in sorted(matched.items()) + [(len(words) - 1, (end, end))]:
    seg = words[si:m + 1]; n = sum(L(w) for w in seg) or 1; t = st
    for w in seg:
        d = (ps - st) * L(w) / n; times.append([w, round(t, 3), round(t + d, 3)]); t += d
    st, si = pe, m + 1
json.dump({"duration": dur, "words": times}, open(P + '/vo/mots.json', 'w'), ensure_ascii=False)
print(f"{len(matched)}/{len(marks)} ponctuations rattachées ; {len(pauses) - len(used)} pauses libres")
sent = []; cur = []
for w in times:
    cur.append(w)
    if re.search(r"[.?!…]$", w[0]): sent.append(cur); cur = []
if cur: sent.append(cur)
for s in sent: print(f"{s[0][1]:6.2f}–{s[-1][2]:6.2f}  {' '.join(x[0] for x in s)}")
