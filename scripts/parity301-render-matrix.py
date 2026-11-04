"""Render the one cumulative CSV; never infer completeness from an adapter or CI."""
import csv
from collections import Counter
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'docs/syna-301-integration/MATRICE-CONVERGENCE-84.csv'
rows=list(csv.DictReader(p.open()))
assert len({r['operation'] for r in rows})==len(rows),'Duplicate operation'
for r in rows:
    assert r['statut'] in {'PARTIEL','ABSENT','NON_TESTE','BLOQUE','ECHEC'},r['operation']
    for key in ['manque','responsable','dependance','critere_fermeture','preuve_actuelle']:
        assert r[key],(r['operation'],key)
def clean(value):return value.replace('|','/').replace('\n',' ')
added=sum(r['recettes']=='relevé source Claude #369, pas une recette' for r in rows)
md=[f'# Matrice unique de convergence #301 — {len(rows)} unités de vérification','',
    'Source de travail : branche codex/parity301-continuous-matrix-v2, descendant de la convergence #371 `827795d014c3ebc2f251e7209ad85b88d4332c66`. Même CSV et même historique, aucune deuxième matrice.','',
    f'**Aucune ligne complète.** {len(rows)-added} lignes précédentes + {added} actions décomposées depuis l’inventaire de Claude #369. Les ajouts sont des vérifications à effectuer, pas {added} défauts reproduits ; certains détaillent une ligne parente. Lecture source uniquement : vérifier les acquis #348 et les adaptateurs avant de développer. Aucun fournisseur réel, action client, connexion réelle ou publication certifiés. Un blocage du réel ne dispense pas de raccorder le parcours simulé de consentement.','',
    'Les CI sont suivies sur leurs commits ; aucun verdict global vert ne se déduit des seuls tests ciblés. État du runtime, limites et reprise exacte : POINT-REPRISE-CONTINU.md.','',
    '| Statut | Nombre |','|---|---:|']
md += [f'| {status} | {count} |' for status,count in sorted(Counter(r['statut'] for r in rows).items())]
md += ['','| Cap. | Opération | Statut | Preuve actuelle | Manque | Responsable | Dépendance | Critère de fermeture |','|---|---|---|---|---|---|---|---|']
for r in rows:
    md.append('| '+' | '.join(clean(r[k]) for k in ['capability','operation','statut','preuve_actuelle','manque','responsable','dependance','critere_fermeture'])+' |')
p.with_suffix('.md').write_text('\n'.join(md)+'\n')
print(f'{len(rows)} opérations uniques ; champs de suivi présents ; aucune complétude inférée.')
