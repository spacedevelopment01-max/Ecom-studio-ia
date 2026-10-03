# Canettes « Verger » (démo boissons)

Source : photo fournisseur d'une canette de thé glacé 330 ml (fiche AliExpress transmise par l'utilisateur).
La photo d'origine n'est pas versionnée (elle porte la marque du fabricant).

`relabel.py` conserve le métal et l'ombrage réel du cylindre, recolore le corps et pose une étiquette
entièrement nouvelle (marque fictive « Verger », trois goûts). Aucun élément graphique d'origine n'est conservé.

    python relabel.py <canette-detouree.png> <sortie> ../../../assets/fonts
