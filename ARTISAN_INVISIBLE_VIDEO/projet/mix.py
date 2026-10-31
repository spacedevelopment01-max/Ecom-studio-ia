import subprocess
import os
P=os.path.join(os.path.dirname(os.path.abspath(__file__)),'assets','audio')
D=58.0
VO=[('v1',0.9),('v2',9.1),('v3',17.3),('v4-1',22.5),('v4-2',28.7),('v4-3',32.3),('v4-4',34.7),('v4-5',38.9),('v5',46.8)]
SFX=[('whoosh-cinematic',1.5,0.35),('whoosh',7.1,0.5),('whoosh-cinematic',7.6,0.4),('whoosh-short',8.42,0.6)]
SFX+=[('pop',4.35+k*0.34,0.22) for k in range(7)]
SFX+=[('click-soft',t,0.35) for t in [9.15,9.6,10.0,10.3,10.95,11.0,11.6,11.85,12.0,12.25,12.5,13.1,13.4]]
SFX+=[('riser',13.0,0.45,6.4,3.6),('impact-bass-1',17.0,0.3),('whoosh-cinematic',17.0,0.25),('sparkle',18.25,0.5),('whoosh-short',18.45,0.4)]
SFX+=[('typing',19.55,0.45),('click',21.35,0.6),('whoosh-short',21.9,0.5)]
SFX+=[('sparkle',22.3,0.45),('whoosh-short',23.3,0.4),('whoosh',24.35,0.5),('pop',25.1,0.5)]
SFX+=[('pop',26.45+i*0.13,0.3) for i in range(5)]+[('sparkle',26.9,0.35)]
SFX+=[('click',28.97+i*0.4,0.45) for i in range(7)]+[('whoosh-short',28.5,0.35)]
SFX+=[('whoosh-short',32.0,0.45),('pop',32.85,0.35),('pop',33.1,0.35),('pop',33.35,0.35)]
SFX+=[('pop',35.4,0.35)]+[('click-soft',36.2+i*0.12,0.3) for i in range(8)]
SFX+=[('whoosh-short',37.25,0.4),('click',39.3,0.6),('whoosh',39.8,0.4),('whoosh-short',40.0,0.4),('pop',40.9,0.45),('notification',41.45,0.5)]
SFX+=[('whoosh-cinematic',42.75,0.5),('riser',49.0,0.38,7.0,3.0),('whoosh-cinematic',51.6,0.5),('impact-bass-1',53.55,0.3)]
SFX+=[('click-soft',t,0.35) for t in [54.0,54.75,55.5]]
ins=[];fl=[]
def add(name):
    ins.extend(['-i',f'{P}/{name}']); return len(ins)//2-1
mi=add('bgm-cine.flac')
fl.append(f"[{mi}:a]atrim=0:{D},asplit=2[ma][mb]")
fl.append("[ma]lowpass=f=650,lowpass=f=650,volume='if(lt(t,16.45),1,max(0,1-(t-16.45)/0.2))':eval=frame,volume=0.85[mA]")
fl.append(f"[mb]volume='if(lt(t,17.0),0,min(1,(t-17.0)/0.06))':eval=frame,afade=t=out:st={D-2.2}:d=2.2[mB]")
fl.append("[mA][mB]amix=inputs=2:normalize=0,volume=0.42[mus]")
vo=[]
for n,t in VO:
    i=add(n+'.wav'); vo.append(f"[v{i}]"); fl.append(f"[{i}:a]aresample=48000,pan=stereo|c0=c0|c1=c0,adelay={int(t*1000)}|{int(t*1000)},apad=whole_dur={D}[v{i}]")
fl.append(''.join(vo)+f"amix=inputs={len(vo)}:normalize=0,atrim=0:{D},asplit=2[vo][key]")
sf=[]
for x in SFX:
    n,t,v=x[:3]; tr=f"atrim={x[3]}:{x[3]+x[4]},asetpts=PTS-STARTPTS,afade=t=out:st={x[4]-0.08}:d=0.08," if len(x)>3 else ""
    i=add(n+'.mp3'); sf.append(f"[s{len(sf)}]"); fl.append(f"[{i}:a]{tr}aresample=48000,aformat=channel_layouts=stereo,volume={v},adelay={int(t*1000)}|{int(t*1000)},apad=whole_dur={D}[s{len(sf)-1}]")
fl.append(''.join(sf)+f"amix=inputs={len(sf)}:normalize=0,atrim=0:{D}[sfx]")
fl.append("[mus]aresample=48000[mus48]")
fl.append("[mus48][key]sidechaincompress=threshold=0.04:ratio=5:attack=15:release=320:makeup=1[duck]")
fl.append(f"[vo][sfx][duck]amix=inputs=3:normalize=0,atrim=0:{D},alimiter=limit=0.95[out]")
cmd=['ffmpeg','-v','error','-y']+ins+['-filter_complex',';'.join(fl),'-map','[out]','-ar','48000','-c:a','pcm_s16le',P+'/mix-raw.wav']
subprocess.run(cmd,check=True); print('ok')
