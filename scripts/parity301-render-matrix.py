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
    '162 unités conservées et une omission native folders.create ajoutée : 163 unités. Base Claude #369 12d75fed, PR #372–#393 et convergence #394 895f2895 ;permission locale a593e6ea, cartes préparées encore ouvertes. Les77 décompositions restent un inventaire,pas77 défauts démontrés ;chemin etidentifiants historiques conservés.','',
    '**Aucune ligne complète. PARTIEL décrit seulement le sous-parcours prouvé.** Aucun fournisseur réel, connexion réelle ou publication certifié. CI finales #372/#373/#381/#382/#383/#384/#385 SUCCESS. #388 suites/Docker/confirmation verts, grandes recettes en cours ;a593e6ea/#394 CI en cours. Les deux attentes CI historiques devenues fausses sont corrigées dans#380,sans suppression de tests ni transformation de leur ancien échec en succès. Le CSV conserve les relevés natifs, phrases et modes hérités ; les ajouts moteur ne certifient pas automatiquement ces modes.','',
    '| Statut | Nombre |','|---|---:|']
md += [f'| {status} | {count} |' for status,count in sorted(Counter(r['statut'] for r in rows).items())]
md += ['','| Cap. | Opération | Statut | Preuve actuelle | Manque | Responsable | Dépendance | Critère de fermeture |','|---|---|---|---|---|---|---|---|']
for r in rows:
    md.append('| '+' | '.join(clean(r[k]) for k in ['capability','operation','statut','preuve_actuelle','manque','responsable','dependance','critere_fermeture'])+' |')
p.with_suffix('.md').write_text('\n'.join(md)+'\n')
print(f'{len(rows)} opérations uniques ; champs de suivi présents ; aucune complétude inférée.')
