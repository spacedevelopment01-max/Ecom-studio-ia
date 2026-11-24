import json,re,sys
def phrases(al):
    ch=al['characters']; st=al['character_start_times_seconds']; en=al['character_end_times_seconds']
    words=[];cur='';s=None
    for c,a,b in zip(ch,st,en):
        if c.isspace():
            if cur: words.append([cur,s,e]); cur=''
            continue
        if not cur: s=a
        cur+=c; e=b
    if cur: words.append([cur,s,e])
    out=[];buf=[]
    for w in words:
        buf.append(w)
        if re.search(r'[.!?…»]$',w[0]) and not w[0] in ('«',):
            out.append(buf);buf=[]
    if buf: out.append(buf)
    return out
for f in sys.argv[1:]:
    for i,p in enumerate(phrases(json.load(open(f)))):
        print(f, i, f"{p[0][1]:.2f}-{p[-1][2]:.2f}", ' '.join(w[0] for w in p))
