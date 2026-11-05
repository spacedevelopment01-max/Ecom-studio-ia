#!/usr/bin/env python3
"""#301 — matrice de parité côté interface (Claude), une ligne par opération de la matrice #302 de Codex.

Entrées :
  - la matrice de Codex (CSV, colonnes capability, operation, label, …) ;
  - docs/syna-parite-301/recettes-operations.json : opérations visées par chaque recette navigateur ;
  - docs/syna-parite-301/resultats.json : résultat de chaque recette par mode ({"encre": {"ui": "PASSE", …}, "plein": {…}}) ;
  - (facultatif) <dossier>/sondes.json : {"operation": "résultat de la phrase réelle envoyée à SYNA"} (sonde
    tests/syna301-sondes-348.test.ts) — ajoute la colonne « Phrase réelle » ; une phrase qui n'ouvre aucune action ne
    rend jamais l'opération prouvée.
Sortie : Markdown sur la sortie standard. Une opération sans recette n'est jamais déclarée prouvée.
Usage : python3 scripts/syna-parite-matrice.py <matrice.csv> docs/syna-parite-301 > docs/syna-parite-301/MATRICE-INTERFACE.md
"""
import csv, json, sys
from collections import OrderedDict

csv_path, folder = sys.argv[1], sys.argv[2]
rows = list(csv.DictReader(open(csv_path, encoding="utf-8")))
recettes = json.load(open(f"{folder}/recettes-operations.json", encoding="utf-8"))["recettes"]
resultats = json.load(open(f"{folder}/resultats.json", encoding="utf-8"))
absents = json.load(open(f"{folder}/absents.json", encoding="utf-8"))
try:
    sondes = json.load(open(f"{folder}/sondes.json", encoding="utf-8"))
except FileNotFoundError:
    sondes = None

par_op = {}
for rec, ops in recettes.items():
    for op in ops:
        par_op.setdefault(op, []).append(rec)

def statut(op, mode):
    recs = par_op.get(op, [])
    vus = [(r, resultats.get(mode, {}).get(r)) for r in recs]
    vus = [(r, s) for r, s in vus if s]
    if not vus:
        return None, []
    if all(s == "PASSE" for _, s in vus):
        return "SYNA_OK", vus
    if any(s == "PASSE" for _, s in vus):
        return "PARTIEL", vus
    return "ECHEC", vus

caps = OrderedDict()
for r in sorted(rows, key=lambda r: (r["capability"], r["operation"])):
    caps.setdefault(r["capability"], []).append(r)

out = []
compte = {"SYNA_OK": 0, "PARTIEL": 0, "ECHEC": 0, "ABSENT": 0, "BLOQUE": 0, "NON_TESTE": 0}
lignes = []
for cap, ops in caps.items():
    for r in ops:
        op = r["operation"]
        e, ev = statut(op, "encre")
        p, pv = statut(op, "plein")
        if op in absents:
            final, note = absents[op]["statut"], absents[op]["note"]
        elif e is None and p is None:
            final, note = "NON_TESTE", "aucune recette navigateur ne vise cette opération à ce relevé"
        elif e == p == "SYNA_OK":
            final, note = "SYNA_OK", ""
        elif "ECHEC" in (e, p) and "SYNA_OK" not in (e, p) and "PARTIEL" not in (e, p):
            final, note = "ECHEC", ""
        else:
            final, note = "PARTIEL", ""
        compte["BLOQUE" if final.startswith("BLOQUE") else final] = compte.get("BLOQUE" if final.startswith("BLOQUE") else final, 0) + 1
        recs = ", ".join(f"`{x}`" for x in par_op.get(op, [])) or "—"
        fmt = lambda s: {"SYNA_OK": "✓", "PARTIEL": "◐", "ECHEC": "✗", None: "—"}[s]
        cols = f"| {cap} | `{op}` | {r['label']} | {recs} | {fmt(e)} | {fmt(p)} | **{final}** |"
        if sondes is not None:
            cols += f" {sondes.get(op, '—')} |"
        lignes.append(f"{cols} {note} |")

total = len(lignes)
out.append("| Statut (interface, deux modes) | Opérations |")
out.append("|---|---:|")
for k in ["SYNA_OK", "PARTIEL", "ECHEC", "ABSENT", "BLOQUE", "NON_TESTE"]:
    out.append(f"| {k if k != 'BLOQUE' else 'BLOQUE_CONNEXION_OU_CONSENTEMENT'} | {compte.get(k, 0)} |")
out.append(f"| **Total** | **{total}** |")
out.append("")
out.append("Légende : ✓ recette réussie dans ce mode · ◐ partielle · ✗ échec · — non visée. « Encre » et « Plein » couvrent chacun l'ordinateur et le téléphone : les recettes de Codex enchaînent 1440 px (et souvent 1024 px) puis 390 / 360 px, sauf `blog-ui` et `closure-ui` (ordinateur seulement) et `retouches-ui` (téléphone 390 px pour la partie retouche).")
out.append("")
if sondes is not None:
    out.append("| Cap. | Opération | Libellé (matrice #302) | Recette(s) | Encre | Plein | Statut | Phrase réelle (sonde) | Remarque |")
    out.append("|---|---|---|---|:-:|:-:|---|---|---|")
else:
    out.append("| Cap. | Opération | Libellé (matrice #302) | Recette(s) | Encre | Plein | Statut | Remarque |")
    out.append("|---|---|---|---|:-:|:-:|---|---|")
out.extend(lignes)
print("\n".join(out))
