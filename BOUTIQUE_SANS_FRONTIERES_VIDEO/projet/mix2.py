"""Mixage de la Pub 02 : voix cedar, musique du compositeur du studio (banque GeneralUser GS, libre pour un usage
commercial), effets HyperFrames (licence Pixabay, usage commercial autorisé) et rideau métallique synthétisé."""
import os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from timemap import to_new, D as DNEW, VOFF
P = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'audio')
D = DNEW
VO = [('voix-longue', VOFF)]
S = [('whoosh-cinematic', 0.0, 0.28), ('click', 3.72, 0.5), ('rideau', 4.75, 0.55, 0, 3.1), ('rideau-choc', 7.78, 0.5), ('impact-bass-1', 7.8, 0.25),
     ('whoosh', 8.15, 0.4), ('whoosh-short', 10.95, 0.5)]
S += [('ping', 8.9 + k * 0.33, 0.22) for k in range(5)]
S += [('pop', t, 0.3) for t in [11.0, 11.3, 11.9, 12.0, 12.6, 12.8, 13.3, 13.5, 14.2, 14.4, 14.7, 14.9, 15.1, 15.4, 15.6]]
S += [('riser', 15.2, 0.4, 7.3, 2.7), ('click', 17.9, 0.4), ('impact-bass-1', 18.15, 0.24), ('whoosh-cinematic', 18.15, 0.2), ('sparkle', 19.1, 0.45),
      ('whoosh-short', 19.8, 0.35), ('typing', 20.5, 0.4), ('typing', 21.6, 0.35, 0, 0.8), ('click', 22.55, 0.55), ('whoosh-cinematic', 23.05, 0.4)]
S += [('sparkle', 24.1, 0.45)] + [('pop', 25.0 + i * 0.1, 0.22) for i in range(5)] + [('whoosh-short', 26.2, 0.4)]
S += [('whoosh-short', 27.6 + i * 0.2, 0.22) for i in range(4)] + [('pop', 28.35 + i * 0.2, 0.3) for i in range(4)]
S += [('pop', 29.3 + i * 0.3, 0.28) for i in range(3)] + [('whoosh', 30.2, 0.3), ('whoosh-cinematic', 31.2, 0.22), ('whoosh', 35.25, 0.35)]
S += [('pop', 36.3 + i * 0.4, 0.33) for i in range(3)] + [('pop', 37.7, 0.4)] + [('click-soft', 37.9 + i * 0.45, 0.25) for i in range(3)]
S += [('pop', 38.9, 0.35)] + [('click-soft', 39.1 + i * 0.07, 0.22) for i in range(8)]
S += [('pop', 40.0, 0.35), ('click', 40.75, 0.5), ('whoosh-short', 41.6, 0.4), ('sparkle', 42.85, 0.45), ('notification', 44.0, 0.45)]
S += [('whoosh-cinematic', 46.0, 0.4), ('pop', 48.1, 0.45), ('chime', 48.2, 0.3), ('whoosh-cinematic', 53.0, 0.4)]
S += [('whoosh-short', 53.6 + i * 0.12, 0.18) for i in range(6)] + [('impact-bass-1', 55.0, 0.26), ('sparkle', 55.2, 0.3)]
S += [('click-soft', t, 0.28) for t in [56.0, 56.6, 57.1, 57.7]]
S = [tuple([x[0], round(to_new(x[1]), 3)] + list(x[2:])) for x in S]
ins, fl = [], []
def add(n): ins.extend(['-i', f'{P}/{n}']); return len(ins) // 2 - 1
mi = add('bgm-cine-71.flac')
W = round(to_new(18.1), 3); W2 = round(to_new(18.15), 3); N0 = round(to_new(46.1), 3); N1 = round(to_new(53.0), 3)
fl.append(f"[{mi}:a]atrim=0:{D},aresample=48000,asplit=2[ma][mb]")
# tension légère étouffée au début, puis la musique s'ouvre avec la vague bleue et culmine pendant la transformation
fl.append(f"[ma]lowpass=f=700,lowpass=f=700,volume='if(lt(t,{W}),1,max(0,1-(t-{W})/0.25))':eval=frame,volume=0.9[mA]")
fl.append(f"[mb]volume='if(lt(t,{W2}),0,min(1,(t-{W2})/0.1))*(if(between(t,{N0},{N1}),0.7,1))':eval=frame,afade=t=out:st={D - 2.4}:d=2.4[mB]")
fl.append("[mA][mB]amix=inputs=2:normalize=0,volume=0.42[mus]")
vo = []
for n, t in VO:
    i = add('../../vo/' + n + '.wav' if n == 'voix-longue' else n + '.wav'); vo.append(f"[v{i}]"); fl.append(f"[{i}:a]aresample=48000,pan=stereo|c0=c0|c1=c0,adelay={int(t * 1000)}|{int(t * 1000)},apad=whole_dur={D}[v{i}]")
fl.append(''.join(vo) + f"amix=inputs={len(vo)}:normalize=0,atrim=0:{D},asplit=2[vo][key]")
sf = []
for x in S:
    n, t, v = x[:3]; ext = '.wav' if n.startswith('rideau') else '.mp3'
    tr = f"atrim={x[3]}:{x[3] + x[4]},asetpts=PTS-STARTPTS,afade=t=out:st={x[4] - 0.08}:d=0.08," if len(x) > 3 else ""
    i = add(n + ext); sf.append(f"[s{len(sf)}]"); fl.append(f"[{i}:a]{tr}aresample=48000,aformat=channel_layouts=stereo,volume={v},adelay={int(t * 1000)}|{int(t * 1000)},apad=whole_dur={D}[s{len(sf) - 1}]")
fl.append(''.join(sf) + f"amix=inputs={len(sf)}:normalize=0,atrim=0:{D}[sfx]")
fl.append("[mus][key]sidechaincompress=threshold=0.04:ratio=5:attack=15:release=320:makeup=1[duck]")
fl.append(f"[vo][sfx][duck]amix=inputs=3:normalize=0,atrim=0:{D},alimiter=limit=0.95[out]")
subprocess.run(['ffmpeg', '-v', 'error', '-y'] + ins + ['-filter_complex', ';'.join(fl), '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s16le', P + '/mix-raw.wav'], check=True)
print('ok')
