"""Plans A5a (question) et A5a2 : le modèle relève le bras vers le cœur (après 0,5 s et 0,9 s). Correction sans nouvel appel payant :
à partir de l'image de référence R, le corps et le bras (doigt sur la bulle commentaire) restent sur l'image R (où le doigt touche la bulle) ;
seule la tête parle (visage, bouche, sourcils), recalée sur sa position d'origine et détourée du fond bleu."""
import os, subprocess, sys, numpy as np, cv2
SRC, R, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3]   # ex. av/A5a2/sortie-1.mp4 14 av/A5a2fix/sortie-1.mp4
os.makedirs(os.path.dirname(OUT), exist_ok=True)
raw = subprocess.run(["ffmpeg","-v","error","-i",SRC,"-f","rawvideo","-pix_fmt","rgb24","-"],capture_output=True).stdout
F = np.frombuffer(raw,np.uint8).reshape(-1,1920,1072,3)
ref = F[R]
x0,y0,x1,y1 = 230,380,600,760
tpl = cv2.cvtColor(np.ascontiguousarray(ref[y0:y1,x0:x1]), cv2.COLOR_RGB2GRAY)
zone = np.zeros((1920,1072),np.uint8)
cv2.ellipse(zone,(400,610),(190,270),0,0,360,255,-1); cv2.ellipse(zone,(410,880),(110,90),0,0,360,255,-1)
def perso(im):   # tout ce qui n'est pas le fond bleu nuit / les traînées bleues
    hsv = cv2.cvtColor(np.ascontiguousarray(im), cv2.COLOR_RGB2HSV)
    fond = ((hsv[...,0] >= 95) & (hsv[...,0] <= 130) & (hsv[...,1] > 60)) | (hsv[...,2] < 45)
    m = (~fond).astype(np.uint8)*255
    return cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9,9),np.uint8))
pref = perso(ref)
out = []
for i,f in enumerate(F):
    if i < R: out.append(f); continue
    g = cv2.cvtColor(np.ascontiguousarray(f), cv2.COLOR_RGB2GRAY)
    res = cv2.matchTemplate(g[y0-120:y1+120, x0-120:x1+120], tpl, cv2.TM_CCOEFF_NORMED)
    _,_,_,loc = cv2.minMaxLoc(res); dx,dy = loc[0]-120, loc[1]-120
    head = cv2.warpAffine(np.ascontiguousarray(f), np.float32([[1,0,-dx],[0,1,-dy]]), (1072,1920), borderMode=cv2.BORDER_REPLICATE)
    m = cv2.bitwise_and(zone, cv2.dilate(cv2.bitwise_or(perso(head), pref), np.ones((7,7),np.uint8)))
    m = cv2.GaussianBlur(m.astype(np.float32)/255, (0,0), 4)[...,None]
    out.append((head*m + ref*(1-m)).astype(np.uint8))
enc = subprocess.Popen(["ffmpeg","-v","error","-y","-f","rawvideo","-pix_fmt","rgb24","-s","1072x1920","-r","30","-i","-","-c:v","libx264","-crf","12","-pix_fmt","yuv420p",OUT],stdin=subprocess.PIPE)
for o in out: enc.stdin.write(np.ascontiguousarray(o).tobytes())
enc.stdin.close(); enc.wait(); print(OUT, len(out), "images")
