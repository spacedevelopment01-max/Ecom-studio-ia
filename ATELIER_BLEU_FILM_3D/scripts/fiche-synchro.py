"""Fiche de synchronisation (narration/synchronisation.md) : chaque phrase, ses mots-clés et ce que montre l'image."""
import json, os
P = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = json.load(open(os.path.join(P, "montage/timeline.json"))); R = json.load(open(os.path.join(P, "montage/reperes.json")))
IMG = {
 "p01": "Gros plan du rouleau géant qui déroule une surface bleue dans le vide.",
 "p02": "La surface s'est pliée en façade ; recul : le bâtiment ATELIER BLEU est suspendu dans le bleu. Trois morceaux flottent, chacun nommé au moment où la voix le dit : Site, Visuels, Communication.",
 "p03": "Sur « rassemble », les trois morceaux sont aspirés dans la façade ; sur « seul espace », la façade articulée s'ouvre.",
 "p04": "Dans le hall, l'écran du studio. Chaque champ se remplit quand la voix le nomme : Activité, Prestations, Zone d'intervention, Style.",
 "p05": "Traversée de l'œil du B de l'enseigne → atelier graphique. Le logo s'assemble en volume (« logo »), cinq surfaces de couleur se déploient (« couleurs »), « Aa » se construit (« identité »).",
 "p06": "Le bâtiment se déplie verticalement et révèle le site. Gros plans : la prestation « Murs et plafonds » (« services »), la réalisation avant/après (« réalisations »), la zone puis le bouton « Nous contacter » (« contacter »).",
 "p07": "Plongée dans la photo de la réalisation, qui devient la pièce en 3D. Les pans du mur pivotent : publication (« visuels »), story (« publications »), publicité (« publicités »), puis composition d'ensemble.",
 "p08": "Écran « Modifier la publicité » au-dessus de la publicité : « à Lyon » est tapé dans le titre, « Valider », puis la publicité se met à jour.",
 "p09": "Sortie du bâtiment : structure complète, volumes nommés Identité, Site, Communication.",
 "p10": "Les volumes glissent et se transforment pour devenir les bras d'un « E ».",
 "p11": "Le « E » est formé sur la colonne du bâtiment.",
 "p12": "Le carré sombre et le point bleu se posent : le pictogramme E-COM STUDIO IA ; le nom s'affiche.",
 "p13": "La phrase finale s'affiche ; balayage de lumière sur « lumière » ; tenue du plan.",
}
L = ["# Synchronisation voix / image", "", f"Voix : {TL['source_voix']} — durée du film : {TL['duree']} s (30 images/s).", "",
     "| Phrase | Début → fin (s) | Mots-clés (s) | À l'image |", "|---|---|---|---|"]
for k, p in TL["phrases"].items():
    mots = ", ".join(f"{m} {v:.2f}" for m, v in p["mots"].items()) or "—"
    L.append(f"| {p['texte']} | {p['debut']:.2f} → {p['fin']:.2f} | {mots} | {IMG[k]} |")
L += ["", "## Repères de l'image (transitions)", "", "| Repère | Instant (s) |", "|---|---|"] + [f"| {k} | {v:.2f} |" for k, v in R.items()]
open(os.path.join(P, "narration/synchronisation.md"), "w").write("\n".join(L) + "\n")
print("ok")
