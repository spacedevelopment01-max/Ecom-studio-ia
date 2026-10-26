# Preuves du suivi #194 (corrections après la fusion globale)

Branche de preuves, **non destinée à être fusionnée**. Captures faites sur les démos statiques du studio (données de
démonstration fictives) ; les pages capturées ne contiennent aucune photo du kit privé.

## 1. FRAISE — article du journal et pages légales au téléphone (PR claude/fraise-mobile-articles-legal)

- `fraise/avant/`, `fraise/apres/` : captures pleine page, à 1440, 768, 430, 390 et 360 px, de l'article « Lire une
  étiquette simplement » et des mentions légales ; avant = `main` `333bccc8`, après = la branche de correction.
- `fraise/fr-cote-article.jpg`, `fraise/fr-cote-legal.jpg` : avant (à gauche) / après (à droite) à 390 px.
- `fraise/mesures-avant.json`, `fraise/mesures-apres-10-pages.json` : largeur utile du texte, taille du titre et du
  corps, largeur de défilement, éléments hors cadre (10 pages : 6 articles, 4 pages légales, aux 5 largeurs).
- `fraise/comparaison-pixels-avant-apres-52-captures.txt` : écart moyen par pixel, toutes les pages de la démo FRAISE à
  1440 et 390 px. Seules les 10 pages visées changent, et seulement à 390 px ; écart total 0 à 1440 px.
