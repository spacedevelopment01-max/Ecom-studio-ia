"""Resserre la voix : chaque silence de plus de 0,22 s est ramené à 0,18–0,22 s (fondus de 15 ms), puis tempo ×1,05
(sans changer la hauteur). Écrit vo/voix-serree.wav et vo/coupes.json (correspondance temps d'origine → temps resserré)."""
import json, os, re, subprocess
P = os.path.dirname(os.path.abspath(__file__)); src = P + '/vo/voix.wav'
out = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", src, "-af", "silencedetect=noise=-40dB:d=0.18", "-f", "null", "-"], capture_output=True, text=True).stderr
sil = list(zip([float(x) for x in re.findall(r"silence_start: ([0-9.]+)", out)], [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", out)]))
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src], capture_output=True, text=True).stdout)
KEEP = 0.2; TEMPO = 1.05
segs = []; c = 0.0
for s, e in sil:
    if e >= dur - 0.02: segs.append((c, min(dur, s + 0.12))); c = None; break
    if e - s > KEEP + 0.02:
        mid = (s + e) / 2; segs.append((c, s + KEEP / 2)); c = e - KEEP / 2
if c is not None: segs.append((c, dur))
parts = []; fl = []
for i, (a, b) in enumerate(segs):
    fl.append(f"[0:a]atrim={a:.4f}:{b:.4f},asetpts=PTS-STARTPTS,afade=t=in:d=0.015,afade=t=out:st={max(0, b - a - 0.015):.4f}:d=0.015[p{i}]"); parts.append(f"[p{i}]")
fl.append(''.join(parts) + f"concat=n={len(parts)}:v=0:a=1,atempo={TEMPO}[o]")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-filter_complex", ';'.join(fl), "-map", "[o]", "-ar", "48000", P + '/vo/voix-serree.wav'], check=True)
# correspondance : temps d'origine → temps resserré
m = []; acc = 0.0
for a, b in segs: m.append([a, b, acc / TEMPO]); acc += b - a
json.dump({"segs": m, "tempo": TEMPO}, open(P + '/vo/coupes.json', 'w'))
nd = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", P + '/vo/voix-serree.wav'], capture_output=True, text=True).stdout)
print(f"{dur:.2f} s → {nd:.2f} s ; {round(154 / (nd / 60))} mots/min ; {len(segs)} morceaux")
