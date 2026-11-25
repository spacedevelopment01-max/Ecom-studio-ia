# controle.py <attendu.txt> <mots.json> : compare le texte attendu à la transcription, signale répétitions et manques
import json,re,difflib,sys
n=lambda w: re.sub(r"[^a-zàâçéèêëîïôûùüÿœ0-9]","",w.lower())
A=[n(w) for w in open(sys.argv[1]).read().split() if n(w)]
B=[n(w['w']) for w in json.load(open(sys.argv[2])) if n(w['w'])]
sm=difflib.SequenceMatcher(None,A,B,autojunk=False)
print('attendu',len(A),'entendu',len(B),'ressemblance',round(sm.ratio(),2))
for op in sm.get_opcodes():
    if op[0]!='equal' and (op[2]-op[1]>2 or op[4]-op[3]>2): print(' ',op[0],'|',' '.join(A[op[1]:op[2]]),'|',' '.join(B[op[3]:op[4]]))
