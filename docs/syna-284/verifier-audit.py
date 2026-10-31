"""Vérifications statiques uniquement. Aucun serveur, fournisseur ou réseau.

Usage : python verifier-audit.py CHEMIN_CHECKOUT_MAIN CHEMIN_CHECKOUT_CLAUDE
Les deux checkouts doivent correspondre aux SHA de PREUVES-AUDIT-284.json.
"""
from pathlib import Path
import sys,json,hashlib,re

out=Path(__file__).resolve().parent
proof=json.loads((out/'PREUVES-AUDIT-284.json').read_text())
main,claude=map(Path,sys.argv[1:3])
checks=[]
for f in proof['files']:
 root=main if f['ref']==proof['main'] else claude
 data=(root/f['path']).read_bytes()
 actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
 assert actual==f['gitBlobSha'],f['path']
checks.append(f"{len(proof['files'])} empreintes source conformes au manifeste")
c=main/'src/lib/orchestrator/conversation'
def read(p):return (main/p).read_text()
ops=(c/'studio-operations.ts').read_text()
lines=[l for l in ops.splitlines() if l.startswith(" op('")]
assert len(lines)==65
# Les opérations sans cinquième argument utilisent l'adaptateur 'none' par défaut.
missing=0;sensitive=0
for l in lines:
 args=re.findall(r"'([^']*)'",l)
 if len(args)<5 or args[-1]=='none':missing+=1
 if ',true)' in l:sensitive+=1
assert missing==28 and sensitive==13,(missing,sensitive)
checks.append('65 opérations ; 37 adaptateurs / 28 absentes ; 13 sensibles')
inventory=(claude/'docs/syna-2030/02-INVENTAIRE.md').read_text().splitlines()
group2=[]
for n,l in enumerate(inventory,1):
 matches=list(re.finditer(r'\| ([1-4]) \|',l))
 if l.startswith('|') and matches and matches[-1].group(1)=='2':group2.append(n)
cross=(out/'TRACABILITE-75-CONTROLES.md').read_text()
mapped=list(map(int,re.findall(r'\[Ligne (\d+)\]',cross)))
assert len(mapped)==75 and len(set(mapped))==75 and set(mapped)==set(group2)
checks.append('75 contrôles tracés une seule fois vers 12 chantiers')
matrix=(out/'MATRICE-PARITE-SYNA-284.md').read_text()
assert len(re.findall(r'^\| C\d\d \|',matrix,re.M))==25
for l in lines:
 op=re.match(r" op\('([^']+)'",l).group(1)
 assert matrix.count(op)>=1,op
checks.append('25 capacités ; tous les identifiants du catalogue présents')
assert 'conversation_migration_unavailable' in (c/'store.ts').read_text()
assert 'if(input.relay||' in (c/'logo-tool-execution.ts').read_text()
assert 'body: { action: "generate", count: 1 }' in read('src/components/studio/ad-editor/ad-editor.tsx')
assert 'b.approvedEstimateMicro==null' in read('src/app/api/projects/[id]/campaigns/v2/route.ts')
assert 'const quick = llmConfigured() ? localFirst(' in read('worker/handlers.ts')
assert "z.literal('move_section')" not in (c/'theme-tool-contract.ts').read_text()
assert 'if (ifVersion != null' in read('src/lib/contenus/api.ts')
checks.append('7 constats statiques centraux retrouvés ; aucune exécution HTTP alléguée')
assert proof['realProviderCalls']==0 and proof['runtimeTestsExecuted'] is False
print(json.dumps({'scope':'static_audit_consistency_only','checks':checks,'runtimeTests':False,'realProviderCalls':0},ensure_ascii=False,indent=2))
