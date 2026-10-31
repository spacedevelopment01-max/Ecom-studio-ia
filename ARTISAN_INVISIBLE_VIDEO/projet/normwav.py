import json,subprocess,sys
src,dst=sys.argv[1],sys.argv[2]
r=subprocess.run(["ffmpeg","-hide_banner","-nostats","-i",src,"-af","loudnorm=I=-15:TP=-1.5:LRA=11:print_format=json","-f","null","-"],capture_output=True,text=True)
t=r.stderr; j=json.loads(t[t.rindex("{"):t.rindex("}")+1])
f=("loudnorm=I=-15:TP=-1.5:LRA=11:measured_I=%s:measured_TP=%s:measured_LRA=%s:measured_thresh=%s:offset=%s:linear=true" % (j["input_i"],j["input_tp"],j["input_lra"],j["input_thresh"],j["target_offset"]))
subprocess.run(["ffmpeg","-v","error","-y","-i",src,"-af",f+",aresample=48000","-c:a","pcm_s16le",dst],check=True)
print("normalisé", dst, "entrée", j["input_i"], "LUFS")
