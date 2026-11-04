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
md=[f'# Matrice unique de convergence #301 — {len(rows)} opérations','',
    '162 unités initiales conservées et omissions natives détaillées dans le CSV. Les décompositions restent un inventaire, pas une liste de défauts démontrés. Voir POINT-REPRISE-CONTINU.md pour les SHA et CI observées.','',
    '**Aucune ligne complète. PARTIEL décrit seulement le sous-parcours prouvé.** Aucun fournisseur réel, connexion réelle ou publication certifié. Chaque preuve garde son SHA et ses limites ; une CI verte ne certifie pas toute la parité. Les cartes et recettes communes encore manquantes sont indiquées par opération.','',
    '| Statut | Nombre |','|---|---:|']
md += [f'| {status} | {count} |' for status,count in sorted(Counter(r['statut'] for r in rows).items())]
md += ['','| Cap. | Opération | Statut | Preuve actuelle | Manque | Responsable | Dépendance | Critère de fermeture |','|---|---|---|---|---|---|---|---|']
for r in rows:
    md.append('| '+' | '.join(clean(r[k]) for k in ['capability','operation','statut','preuve_actuelle','manque','responsable','dependance','critere_fermeture'])+' |')
p.with_suffix('.md').write_text('\n'.join(md)+'\n')
print(f'{len(rows)} opérations uniques ; champs de suivi présents ; aucune complétude inférée.')
