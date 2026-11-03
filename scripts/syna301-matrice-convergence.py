#!/usr/bin/env python3
"""#301 v3 — matrice unique de convergence Claude / Codex des 84 opérations (vocabulaire commun).

Une ligne par opération de la matrice de Codex (docs/syna-301/MATRICE-PARITE-301.csv). Colonnes séparées, jamais
fusionnées en un « complet » :
  - natif          : statut natif selon Codex (NATIF_OK / PARTIEL / NON_TESTE / BLOQUE…) ;
  - phrase         : accessibilité par une phrase naturelle, relevée par la sonde tests/syna301-sondes-348.test.ts
                     sur la tête assemblée (carte gratuite / clarification / formulation exacte seulement / devis
                     seulement / non sondée) ;
  - simule_encre / simule_plein : recettes navigateur avec fournisseurs simulés (✓ / ✗ / —) ;
  - fournisseur_reel : toujours « non testé » (aucun appel réel autorisé) ;
  - statut         : ABSENT, BLOQUE (connexion / consentement), NON_TESTE, ECHEC ou PARTIEL. PARTIEL = sous-parcours
                     vérifié en simulation : jamais « opération entièrement couverte ». Aucun statut COMPLET.
  - preuve, tete, perimetre.
Entrées : CSV Codex, docs/syna-parite-301/vague2/{recettes-operations,resultats,absents}.json,
docs/syna-301-integration/v3.json (recettes v3, SHA, phrases). Sortie : CSV + Markdown.
Usage : python3 scripts/syna301-matrice-convergence.py <dossier de sortie>
"""
import csv, json, sys
from collections import Counter, OrderedDict

out = sys.argv[1]
rows = list(csv.DictReader(open("docs/syna-301/MATRICE-PARITE-301.csv", encoding="utf-8")))
v2 = "docs/syna-parite-301/vague2/"
rec = json.load(open(v2 + "recettes-operations.json", encoding="utf-8"))["recettes"]
res = json.load(open(v2 + "resultats.json", encoding="utf-8"))
absents = json.load(open(v2 + "absents.json", encoding="utf-8"))
v3 = json.load(open("docs/syna-301-integration/v3.json", encoding="utf-8"))
# Recettes v3 (tête d'intégration) : ajoutées / remplacent les résultats de vague 2 pour les mêmes opérations.
for name, info in v3["recettes"].items():
    rec[name] = info["operations"]
    for mode in ("encre", "plein"):
        res.setdefault(mode, {})[name] = info[mode]
for op, upd in v3.get("absents", {}).items():
    if upd is None: absents.pop(op, None)
    else: absents[op] = upd
codex_override = v3.get("codex_syna", {})  # promotions annoncées par Codex après le CSV versionné (ex. services.update)
phrases = v3.get("phrases", {})

par_op = {}
for r, ops in rec.items():
    for op in ops: par_op.setdefault(op, []).append(r)

def mode_state(op, mode):
    vus = [res.get(mode, {}).get(r) for r in par_op.get(op, [])]
    vus = [v for v in vus if v]
    if not vus: return "—"
    return "✓" if all(v == "PASSE" for v in vus) else ("◐" if any(v == "PASSE" for v in vus) else "✗")

lignes = []
for r in sorted(rows, key=lambda x: (x["capability"], x["operation"])):
    op = r["operation"]
    e, p = mode_state(op, "encre"), mode_state(op, "plein")
    syna_codex = codex_override.get(op, r["syna_status"])
    if op in absents and absents[op]["statut"] in ("ABSENT", "BLOQUE_CONNEXION_OU_CONSENTEMENT"):
        statut = "BLOQUE" if absents[op]["statut"].startswith("BLOQUE") else "ABSENT"
        note = absents[op]["note"]
    elif r["native_status"].startswith("BLOQUE") or syna_codex.startswith("BLOQUE"):
        statut, note = "BLOQUE", "connexion externe ou consentement réel requis ; non testé"
    elif e == "—" and p == "—":
        statut, note = "NON_TESTE", "aucune recette navigateur n'atteint cette opération"
    elif "✗" in (e, p) and "✓" not in (e, p):
        statut, note = "ECHEC", ""
    else:
        statut, note = "PARTIEL", (absents.get(op, {}).get("note") or "")
    perim = (r.get("remaining") or "").replace("\n", " ")[:220]
    lignes.append(OrderedDict(
        capability=r["capability"], operation=op, label=r["label"], natif=r["native_status"], syna_codex=syna_codex,
        phrase=phrases.get(op, "non sondée"), simule_encre=e, simule_plein=p, fournisseur_reel="non testé",
        statut=statut, recettes=", ".join(par_op.get(op, [])) or "—", tete=v3["tete"], perimetre=perim, note=note))

with open(f"{out}/MATRICE-CONVERGENCE-84.csv", "w", encoding="utf-8", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=list(lignes[0].keys())); w.writeheader(); w.writerows(lignes)
c = Counter(l["statut"] for l in lignes)
md = [f"# Matrice unique de convergence #301 — 84 opérations (tête `{v3['tete']}`)", "",
      "Vocabulaire commun Claude / Codex. **PARTIEL = sous-parcours vérifié avec fournisseurs simulés**, jamais une opération entièrement couverte ; aucune ligne n'est déclarée complète. Aucun fournisseur réel testé.", "",
      "| Statut | Opérations |", "|---|---:|"] + [f"| {k} | {c.get(k, 0)} |" for k in ["PARTIEL", "ABSENT", "BLOQUE", "NON_TESTE", "ECHEC"]] + [f"| **Total** | **{len(lignes)}** |", "",
      "Accessibles par une phrase naturelle (carte gratuite ou clarification honnête) : " + str(sum(1 for l in lignes if l["phrase"].startswith(("carte gratuite", "clarification")))) + " ; formulation exacte seulement : " + str(sum(1 for l in lignes if l["phrase"].startswith("formulation exacte"))) + " ; devis seulement : " + str(sum(1 for l in lignes if l["phrase"].startswith("devis"))) + ".", "",
      "| Cap. | Opération | Natif | SYNA (Codex) | Phrase naturelle | Encre | Plein | Fournisseur réel | **Statut** | Recettes | Note / limite |",
      "|---|---|---|---|---|:-:|:-:|---|---|---|---|"]
for l in lignes:
    md.append(f"| {l['capability']} | `{l['operation']}` | {l['natif']} | {l['syna_codex']} | {l['phrase']} | {l['simule_encre']} | {l['simule_plein']} | non testé | **{l['statut']}** | {l['recettes']} | {(l['note'] or l['perimetre'])[:160]} |")
open(f"{out}/MATRICE-CONVERGENCE-84.md", "w", encoding="utf-8").write("\n".join(md) + "\n")
print(dict(c))
