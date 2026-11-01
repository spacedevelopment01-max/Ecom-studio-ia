"""Mixage de la Pub 03 : voix cedar resserrée (vo/voix-serree.wav, départ 0,35 s), musique du compositeur du studio
(style « pop », banque GeneralUser GS libre pour un usage commercial), effets HyperFrames (licence Pixabay, usage
commercial autorisé), tous calés sur les actions de l'image."""
import os, subprocess
P = os.path.dirname(os.path.abspath(__file__)); A = P + '/assets/audio'
D = 52.5; VOFF = 0.35
S = [('impact-bass-1', 0.0, 0.42), ('glitch-2', 0.02, 0.25), ('whoosh-short', 0.05, 0.5), ('whoosh', 0.4, 0.35), ('whoosh-short', 1.3, 0.3), ('ping', 2.17, 0.3),
     ('whoosh-cinematic', 2.8, 0.35)]
S += [('pop', 3.1 + 2.4 * (k / 11) ** 1.4, 0.16) for k in range(12)]
S += [('whoosh-short', 6.55, 0.4)] + [('click-soft', 6.6 + k * 0.09, 0.18) for k in range(8)] + [('glitch-1', 7.5, 0.22)]
S += [('pop', 8.25 + k * 0.05, 0.16) for k in range(6)] + [('whoosh', 8.9, 0.35), ('whoosh-cinematic', 9.3, 0.45), ('whoosh-short', 10.2, 0.25)]
S += [('impact-bass-2', 11.0, 0.24), ('sparkle', 11.05, 0.35), ('whoosh', 11.2, 0.35), ('impact-bass-1', 12.38, 0.24), ('whoosh-cinematic', 12.38, 0.25)]
S += [('pop', 13.25 + i * 0.05, 0.22) for i in range(7)] + [('whoosh-short', 13.9 + i * 0.12, 0.2) for i in range(5)]
S += [('click', 14.95, 0.45), ('typing', 15.4, 0.35), ('notification', 16.45, 0.38), ('riser', 15.6, 0.32, 7.6, 1.8), ('whoosh-cinematic', 17.1, 0.4), ('impact-bass-1', 17.32, 0.3)]
S += [('sparkle', 17.66, 0.4), ('chime', 18.2, 0.25)] + [('pop', 18.7 + i * 0.06, 0.18) for i in range(5)] + [('click', 18.95, 0.35)]
S += [('click', 19.35 + i * 0.06, 0.3) for i in range(6)] + [('impact-bass-2', 19.85, 0.22), ('whoosh', 20.15, 0.35), ('sparkle', 20.4, 0.3)]
S += [('pop', 20.85 + i * 0.16, 0.3) for i in range(3)] + [('whoosh-short', 21.3, 0.35), ('pop', 22.15, 0.35), ('whoosh-short', 23.3, 0.35), ('pop', 23.9, 0.35), ('whoosh-cinematic', 24.84, 0.28)]
S += [('whoosh', 26.86, 0.4), ('pop', 27.7, 0.32), ('whoosh-short', 28.0, 0.3)] + [('pop', 28.6 + i * 0.13, 0.28) for i in range(3)]
S += [('pop', 29.6, 0.35)] + [('click-soft', 29.85 + i * 0.5, 0.25) for i in range(3)] + [('key-press', 30.62 + i * 0.1, 0.35) for i in range(3)]
S += [('whoosh-short', 31.2, 0.3), ('impact-bass-2', 32.0, 0.22), ('sparkle', 32.05, 0.3), ('whoosh', 33.3, 0.35), ('pop', 33.45, 0.35)]
S += [('click-soft', 33.95 + i * 0.12, 0.22) for i in range(8)] + [('whoosh-cinematic', 36.45, 0.4), ('whoosh', 37.55, 0.4), ('ping', 37.95, 0.25)]
S += [('pop', 38.15, 0.35), ('typing', 38.3, 0.3), ('click', 39.45, 0.45), ('whoosh-short', 39.55, 0.35), ('whoosh', 39.95, 0.3), ('sparkle', 40.45, 0.4), ('pop', 40.85, 0.35), ('notification', 41.3, 0.38)]
S += [('impact-bass-1', 42.72, 0.22), ('whoosh-cinematic', 42.75, 0.35), ('impact-bass-2', 44.2, 0.22), ('sparkle', 44.25, 0.35), ('whoosh', 44.45, 0.35), ('pop', 45.85, 0.3)]
S += [('whoosh-short', 46.3 + i * 0.1, 0.2) for i in range(5)] + [('riser', 45.4, 0.3, 7.9, 1.6), ('impact-bass-1', 46.95, 0.28), ('sparkle', 47.0, 0.3), ('click-soft', 47.6, 0.3), ('click-soft', 48.15, 0.3), ('pop', 49.3, 0.35)]
ins, fl = [], []
def add(n): ins.extend(['-i', n]); return len(ins) // 2 - 1
mi = add(A + '/bgm-pop.flac')
fl.append(f"[{mi}:a]atrim=0:{D},aresample=48000,afade=t=out:st={D - 2.0}:d=2.0,volume=0.5[mus]")
vi = add(P + '/vo/voix-serree.wav')
fl.append(f"[{vi}:a]aresample=48000,pan=stereo|c0=c0|c1=c0,adelay={int(VOFF * 1000)}|{int(VOFF * 1000)},apad=whole_dur={D},atrim=0:{D},asplit=2[vo][key]")
sf = []
for x in S:
    n, t, v = x[:3]
    tr = f"atrim={x[3]}:{x[3] + x[4]},asetpts=PTS-STARTPTS,afade=t=out:st={x[4] - 0.08}:d=0.08," if len(x) > 3 else ""
    i = add(f"{A}/{n}.mp3"); fl.append(f"[{i}:a]{tr}aresample=48000,aformat=channel_layouts=stereo,volume={v},adelay={int(t * 1000)}|{int(t * 1000)},apad=whole_dur={D}[s{len(sf)}]"); sf.append(f"[s{len(sf)}]")
fl.append(''.join(sf) + f"amix=inputs={len(sf)}:normalize=0,atrim=0:{D}[sfx]")
fl.append("[mus][key]sidechaincompress=threshold=0.035:ratio=6:attack=10:release=250:makeup=1[duck]")
fl.append(f"[vo][sfx][duck]amix=inputs=3:normalize=0,atrim=0:{D},alimiter=limit=0.95[out]")
subprocess.run(['ffmpeg', '-v', 'error', '-y'] + ins + ['-filter_complex', ';'.join(fl), '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s16le', A + '/mix-raw.wav'], check=True)
print('ok')
